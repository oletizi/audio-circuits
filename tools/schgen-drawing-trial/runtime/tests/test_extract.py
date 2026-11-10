"""In-container tests for trial.extract: SchGen's own extraction of an attempt's program.

Run inside schgen-runtime, as test_prompt.py is:

    docker run --rm --network none -v .../runtime:/trial:ro schgen-runtime:0707520c \
        pytest -q -p no:cacheprovider /trial/tests/test_extract.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

from trial import extract, schgen_source

WITH_FINAL = (
    "<|channel|>analysis<|message|>plan<|end|><|start|>assistant<|channel|>final"
    "<|message|>```python\nx = 1\n```<|return|>"
)
NO_FINAL = "<|channel|>analysis<|message|>only thinking, cut off at max_tokens"


def test_final_channel_regex_is_schgens() -> None:
    pattern = schgen_source.final_channel_regex()
    assert isinstance(pattern, re.Pattern)
    assert pattern.flags & re.S and pattern.flags & re.I
    assert pattern.search(WITH_FINAL) is not None
    assert pattern.search(NO_FINAL) is None


def test_extract_with_final_channel() -> None:
    result = extract.extract(WITH_FINAL)
    assert result == {"final_channel": True, "program": "x = 1"}


def test_extract_without_final_channel_keeps_schgens_fallback() -> None:
    result = extract.extract(NO_FINAL)
    assert result["final_channel"] is False
    # SchGen's fallback is the whole response, stripped: the program is still handed on.
    assert result["program"] == schgen_source.get_final_python(NO_FINAL) == NO_FINAL


def test_regex_missing_fails_closed(tmp_path: Path) -> None:
    source = schgen_source.evaluation_py().read_text(encoding="utf-8")
    assert source.count("final_block_re = re.compile(") == 1
    changed = tmp_path / "evaluation.py"
    changed.write_text(source.replace("final_block_re = re.compile(", "other_re = re.compile("), encoding="utf-8")
    with pytest.raises(schgen_source.SchGenSourceError) as err:
        schgen_source.final_channel_regex(changed)
    assert "final_block_re" in str(err.value) and str(changed) in str(err.value)


def test_cli_prints_json(tmp_path: Path) -> None:
    raw = tmp_path / "response.raw.txt"
    raw.write_text(WITH_FINAL, encoding="utf-8")
    run = subprocess.run([sys.executable, "-m", "trial.extract", str(raw)], capture_output=True, text=True, check=True)
    assert json.loads(run.stdout) == {"final_channel": True, "program": "x = 1"}


def test_cli_refuses_missing_file(tmp_path: Path) -> None:
    run = subprocess.run([sys.executable, "-m", "trial.extract", str(tmp_path / "absent")],
                         capture_output=True, text=True)
    assert run.returncode != 0
    assert "absent" in run.stderr
