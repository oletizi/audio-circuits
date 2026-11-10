"""Task 4: the prompt's token IDs, and their fidelity to SchGen's own prompt path.

Run inside schgen-runtime (SchGen's code runs only there):

    docker run --rm -v "$PWD/tools/schgen-drawing-trial/runtime:/trial:ro" \
      schgen-runtime:0707520c pytest -q -p no:cacheprovider /trial/tests/test_prompt.py

The fixtures under fixtures/<board>/ are written by
tools/schgen-drawing-trial/make-prompt-fixtures.ts: request.json from the
request generator, page_data.json from the approved page (read here only).
"""

from __future__ import annotations

import ast
import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path

import pytest

from trial import fidelity, prompt, schgen_source

FIXTURES = Path(__file__).parent / "fixtures"
BOARDS = ["pultec-hi-boost", "pultec-hi-cut", "pultec-low-boost", "pultec-low-cut", "pultec-mid"]
UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)

# sha256 of user_message_template() at SchGen 0707520c. A change upstream to the
# f-string in run_raw_test must fail here rather than pass silently. Cross-checked
# when pinned by a separate host-side static ast rebuild of the same f-string.
USER_MESSAGE_TEMPLATE_SHA256 = "856e3758e40be41bbc598c0f8008a2a9d86e98bd0bed05e719485a8a4d53234a"


def request(board: str) -> dict:
    return json.loads((FIXTURES / board / "request.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=None)
def rendered(board: str) -> dict:
    r = request(board)
    return prompt.render(r["text"], r["symbols"])


@pytest.mark.parametrize("board", BOARDS)
def test_fidelity_equal(board: str) -> None:
    r = request(board)
    result = fidelity.check(r["text"], r["symbols"])
    assert result == {"equal": True, "ours": result["theirs"], "theirs": result["theirs"],
                      "first_diff": None}
    assert result["ours"] == rendered(board)["token_count"]


def test_fidelity_control(monkeypatch: pytest.MonkeyPatch) -> None:
    r = request("pultec-mid")
    real_render = prompt.render
    position = r["text"].index("PARTS:") + 1
    changed = r["text"][:position] + "X" + r["text"][position + 1:]
    assert changed != r["text"]
    monkeypatch.setattr(fidelity, "render", lambda text, symbols: real_render(changed, symbols))
    result = fidelity.check(r["text"], r["symbols"])
    assert result["equal"] is False
    assert result["first_diff"] is not None
    assert 0 < result["first_diff"] < min(result["ours"], result["theirs"])


@pytest.mark.parametrize("board", BOARDS)
def test_ends_with_generation_prefix(board: str) -> None:
    assert rendered(board)["text"].endswith("<|start|>assistant")


# Expected values below were written from reading evaluation.py:46-75 at the
# pinned commit (the final-channel regex stops at <|channel|>, <|end|> or $;
# trailing <|return|> runs are stripped; a leading ```python/``` line and a
# trailing ``` line are removed), not from running the function.
FINAL_PYTHON_CASES = {
    "full_harmony": (
        "<|channel|>analysis<|message|>Place R1 first.<|end|><|start|>assistant"
        "<|channel|>final<|message|>```python\nadd(1)\nx = 2\n```<|return|>",
        "add(1)\nx = 2",
    ),
    "final_no_fence": ("<|channel|>final<|message|>x = 1\ny = 2<|return|>", "x = 1\ny = 2"),
    "python_fence": ("<|channel|>final<|message|>```python\nz = 3\n```", "z = 3"),
    "Python_fence": ("<|channel|>final<|message|>```Python\nz = 3\n```", "z = 3"),
    "bare_fence": ("<|channel|>final<|message|>```\nz = 3\n```<|return|>", "z = 3"),
    "two_finals_first_wins": (
        "<|channel|>final<|message|>a = 1<|end|><|start|>assistant"
        "<|channel|>final<|message|>b = 2<|return|>",
        "a = 1",
    ),
    "no_final_whole_response": (
        "<|channel|>analysis<|message|>only thinking<|end|>",
        "<|channel|>analysis<|message|>only thinking<|end|>",
    ),
    # `$` without re.M also matches before a final newline, so the segment ends
    # there; the return-run strip then removes all three markers and the space.
    "repeated_return": ("<|channel|>final<|message|>c = 3<|return|><|return|> <|return|>\n", "c = 3"),
    "truncated_mid_program": (
        "<|channel|>analysis<|message|>plan<|end|><|start|>assistant<|channel|>final"
        "<|message|>```python\ndef f():\n    return 1\nx = f(",
        "def f():\n    return 1\nx = f(",
    ),
}


@pytest.mark.parametrize("case", sorted(FINAL_PYTHON_CASES))
def test_get_final_python_cases(case: str) -> None:
    decoded, expected = FINAL_PYTHON_CASES[case]
    assert schgen_source.get_final_python(decoded) == expected


def test_ast_fails_closed(tmp_path: Path) -> None:
    generate = schgen_source.generate_py()
    renamed = tmp_path / "generate.py"
    text = generate.read_text(encoding="utf-8")
    assert text.count("def run_raw_test(") == 1
    renamed.write_text(text.replace("def run_raw_test(", "def run_raw_test_gone("), encoding="utf-8")
    with pytest.raises(schgen_source.SchGenSourceError) as err:
        schgen_source.user_message_template(renamed)
    assert "run_raw_test" in str(err.value) and str(renamed) in str(err.value)
    with pytest.raises(schgen_source.SchGenSourceError):
        schgen_source.evaluate_user_message("p", {}, renamed)

    evaluation = schgen_source.evaluation_py()
    source = evaluation.read_text(encoding="utf-8")
    func = next(n for n in ast.parse(source).body
                if isinstance(n, ast.FunctionDef) and n.name == "get_final_python")
    lines = source.splitlines(keepends=True)
    removed = tmp_path / "evaluation.py"
    removed.write_text("".join(lines[:func.lineno - 1] + lines[func.end_lineno:]), encoding="utf-8")
    assert "def get_final_python" not in removed.read_text(encoding="utf-8")
    with pytest.raises(schgen_source.SchGenSourceError) as err:
        schgen_source.get_final_python("<|channel|>final<|message|>x = 1", removed)
    assert "get_final_python" in str(err.value) and str(removed) in str(err.value)

    missing = tmp_path / "absent.py"
    with pytest.raises(schgen_source.SchGenSourceError):
        schgen_source.user_message_template(missing)


def test_template_bytes_pinned() -> None:
    template = schgen_source.user_message_template()
    assert "{prompt}" in template and "{symbol_context}" in template
    assert hashlib.sha256(template.encode("utf-8")).hexdigest() == USER_MESSAGE_TEMPLATE_SHA256


@pytest.mark.parametrize("board", BOARDS)
def test_symbol_context_has_no_page_data(board: str) -> None:
    page = json.loads((FIXTURES / board / "page_data.json").read_text(encoding="utf-8"))
    assert page["uuids"] and page["at_pairs"], "an empty fixture would make this test vacuous"
    text = rendered(board)["text"]
    assert UUID_RE.search(text) is None
    assert [u for u in page["uuids"] if u in text] == []
    assert [a for a in page["at_pairs"] if a in text] == []


def test_symbol_context_covers_every_symbol() -> None:
    r = request("pultec-mid")
    context = prompt.symbol_context(r["symbols"])
    assert sorted(f"{c['lib_name']}:{c['symbol_name']}" for c in context.values()) == sorted(r["symbols"])
    with pytest.raises(prompt.PromptError):
        prompt.symbol_context(r["symbols"] + ["Device:No_Such_Symbol_In_Any_Library"])


def test_longest_prompt_recorded() -> None:
    recorded = json.loads((FIXTURES / "token_counts.json").read_text(encoding="utf-8"))
    assert sorted(recorded["token_count"]) == BOARDS
    for board in BOARDS:
        assert rendered(board)["token_count"] == recorded["token_count"][board], board
        assert rendered(board)["token_count"] == len(rendered(board)["ids"])
    assert recorded["longest"] == max(recorded["token_count"].values())


def test_record_carries_provenance() -> None:
    record = rendered("pultec-hi-boost")
    sums = (Path(prompt.TOKENIZER_DIR) / "SHA256SUMS").read_text(encoding="utf-8").split()
    assert record["tokenizer_files_sha256"] == dict(zip(sums[1::2], sums[0::2]))
    template = (Path(prompt.TOKENIZER_DIR) / "chat_template.jinja").read_bytes()
    assert record["template_sha256"] == hashlib.sha256(template).hexdigest()
