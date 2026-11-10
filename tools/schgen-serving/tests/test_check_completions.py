"""check_completions.py against synthetic /v1/completions responses."""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import check_completions as cc  # noqa: E402

SENT = [200006, 1428, 200008, 7]


def body(**choice: object) -> dict:
    base = {"index": 0, "text": "<|channel|>analysis<|message|>hi", "finish_reason": "length"}
    base.update(choice)
    return {"id": "cmpl-1", "choices": [base], "usage": {"prompt_tokens": 4}}


def test_both_present_and_equal():
    code, _ = cc.check(body(prompt_token_ids=list(SENT), token_ids=[200005, 35]), SENT)
    assert code == 0


def test_mismatch_at_index_names_index():
    got = list(SENT)
    got[2] = 9
    code, msg = cc.check(body(prompt_token_ids=got, token_ids=[1]), SENT)
    assert code == 1 and "index 2" in msg


def test_length_mismatch():
    code, msg = cc.check(body(prompt_token_ids=SENT + [1], token_ids=[1]), SENT)
    assert code == 1 and "length" in msg


def test_neither_field_is_unsupported_exit_2():
    code, msg = cc.check(body(), SENT)
    assert code == 2 and "return_token_ids unsupported" in msg


def test_one_field_only_is_not_exit_2():
    for choice in ({"prompt_token_ids": list(SENT)}, {"token_ids": [1]}):
        code, msg = cc.check(body(**choice), SENT)
        assert code == 1 and "only one" in msg


def test_stray_token_ids_key_named():
    response = body(prompt_token_ids=list(SENT), token_ids=[1])
    response["token_ids"] = [1]
    code, msg = cc.check(response, SENT)
    assert code == 1 and "appears at token_ids," in msg
    stray_only = body()
    stray_only["choices"][0]["output_token_ids"] = [1]
    code, msg = cc.check(stray_only, SENT)
    assert code == 1 and "choices[0].output_token_ids" in msg


def test_marker_missing_from_text():
    code, msg = cc.check(body(prompt_token_ids=list(SENT), token_ids=[1], text="analysis hi"), SENT)
    assert code == 1 and "literally" in msg
