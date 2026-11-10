"""The 2026-11-10 preflight: vLLM keeps the stop token in token_ids and omits it from text.

Extraction reads decode(token_ids, skip_special_tokens=False), as SchGen's generate.py:150 does.
The identity check accepts exactly one difference: trailing stop-token strings (from the pinned
generation_config.json's eos_token_id) missing from text, on finish_reason "stop" only.
"""

from __future__ import annotations

from pathlib import Path

import pytest

import persist
import run_attempt
import token_identity
from trial_fakes import BOARD, ENV, WITH_FINAL, FakeTools, refusing_factory, save_response, write_request_dir

SERVER_TEXT = WITH_FINAL[: -len("<|return|>")]
assert SERVER_TEXT + "<|return|>" == WITH_FINAL


@pytest.fixture
def exec_dir(tmp_path: Path) -> Path:
    write_request_dir(tmp_path)
    return tmp_path


def attempt(exec_dir: Path) -> Path:
    return exec_dir / BOARD / "attempt-1"


def run(exec_dir: Path, tools: FakeTools) -> dict[str, object]:
    return run_attempt.run_attempt(exec_dir, BOARD, 1, tools, refusing_factory, ENV)  # type: ignore[arg-type]


def test_stop_strings_come_from_the_pinned_generation_config() -> None:
    assert token_identity.stop_strings() == ["<|return|>", "<|endoftext|>", "<|call|>"]


def test_trailing_return_omitted_on_stop_is_accepted(exec_dir: Path) -> None:
    save_response(attempt(exec_dir), SERVER_TEXT, "stop", generated_text=WITH_FINAL)
    tools = FakeTools()
    record = run(exec_dir, tools)
    assert record["token_identity"] == "verified"
    assert record["text_vs_decoded"] == "stop-token-omitted-by-server"
    assert (attempt(exec_dir) / "response.raw.txt").read_text() == SERVER_TEXT, "the saved text is never rewritten"
    assert persist.response_complete(attempt(exec_dir))


def test_extraction_receives_the_decoded_text(exec_dir: Path) -> None:
    save_response(attempt(exec_dir), SERVER_TEXT, "stop", generated_text=WITH_FINAL)
    tools = FakeTools()
    record = run(exec_dir, tools)
    assert [p.name for p in tools.extract_calls] == ["response.decoded.txt"]
    assert tools.extract_calls[0].read_text() == WITH_FINAL
    assert record["extraction_input"] == "response.decoded.txt"
    assert record["extraction_input_sha256"] == persist.sha256_bytes(WITH_FINAL.encode())
    assert record["extraction_input_sha256"] != record["raw_response_sha256"]


def test_trailing_return_omitted_on_length_is_refused(exec_dir: Path) -> None:
    save_response(attempt(exec_dir), SERVER_TEXT, "length", generated_text=WITH_FINAL)
    with pytest.raises(token_identity.TokenIdentityError, match="differs from the returned text"):
        run(exec_dir, FakeTools())


def test_mid_text_difference_is_refused(exec_dir: Path) -> None:
    changed = SERVER_TEXT.replace("x = 1", "x = 2")
    save_response(attempt(exec_dir), changed, "stop", generated_text=WITH_FINAL)
    with pytest.raises(token_identity.TokenIdentityError, match="differs from the returned text"):
        run(exec_dir, FakeTools())


def test_trailing_non_stop_special_token_is_refused(exec_dir: Path) -> None:
    save_response(attempt(exec_dir), SERVER_TEXT, "stop", generated_text=SERVER_TEXT + "<|end|>")
    with pytest.raises(token_identity.TokenIdentityError):
        run(exec_dir, FakeTools())


def test_equal_text_is_recorded_equal(exec_dir: Path) -> None:
    save_response(attempt(exec_dir), WITH_FINAL)
    record = run(exec_dir, FakeTools())
    assert record["text_vs_decoded"] == "equal"
