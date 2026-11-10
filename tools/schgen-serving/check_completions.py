"""Check a /v1/completions response from smoke.sh against what was sent.

usage: check_completions.py RESPONSE.json PROMPT_IDS.json

The runner (tools/schgen-drawing-trial/token_identity.py) reads the IDs from
choices[0].prompt_token_ids and choices[0].token_ids; this proves, live, that
the pinned vLLM returns them under those names, and that a harmony marker is
in `text` literally, so no decoding is needed to find it.

Exit codes:
  0  both fields present, returned prompt IDs equal those sent, marker in text
  2  neither field present: `return_token_ids unsupported` (Task 5's
     qualified, count-only mode is the consequence; it is not chosen here)
  1  anything else, with the reason named on stderr
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROMPT_PATH = "choices[0].prompt_token_ids"
OUTPUT_PATH = "choices[0].token_ids"
MARKERS = ("<|channel|>", "<|message|>")
EXIT_OK, EXIT_FAIL, EXIT_UNSUPPORTED = 0, 1, 2


def token_id_keys(value: object, path: str = "") -> list[str]:
    """Every path in `value` whose key contains `token_ids`."""
    found: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            here = f"{path}.{key}" if path else str(key)
            if "token_ids" in str(key):
                found.append(here)
            found.extend(token_id_keys(item, here))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found.extend(token_id_keys(item, f"{path}[{index}]"))
    return found


def check(body: object, sent_ids: list[int]) -> tuple[int, str]:
    """Return (exit code, message)."""
    if not isinstance(body, dict):
        return EXIT_FAIL, "response body is not a JSON object"
    stray = [p for p in token_id_keys(body) if p not in (PROMPT_PATH, OUTPUT_PATH)]
    if stray:
        return EXIT_FAIL, (
            f"a token_ids key appears at {', '.join(stray)}, not at {PROMPT_PATH} / {OUTPUT_PATH}, "
            "where the runner reads them; settle the field names before the run"
        )
    choices = body.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        return EXIT_FAIL, "response does not have exactly one choice"
    choice = choices[0]
    prompt_field, output_field = choice.get("prompt_token_ids"), choice.get("token_ids")
    if prompt_field is None and output_field is None:
        return EXIT_UNSUPPORTED, "return_token_ids unsupported: neither " + f"{PROMPT_PATH} nor {OUTPUT_PATH} is in the response"
    if prompt_field is None or output_field is None:
        missing = PROMPT_PATH if prompt_field is None else OUTPUT_PATH
        return EXIT_FAIL, f"only one of the two ID fields is present; {missing} is missing"
    for name, field in ((PROMPT_PATH, prompt_field), (OUTPUT_PATH, output_field)):
        if not isinstance(field, list) or not all(isinstance(v, int) for v in field):
            return EXIT_FAIL, f"{name} is not a list of integers"
    for index, (sent, got) in enumerate(zip(sent_ids, prompt_field)):
        if sent != got:
            return EXIT_FAIL, f"prompt token IDs differ at index {index}: sent {sent}, server consumed {got}"
    if len(prompt_field) != len(sent_ids):
        return EXIT_FAIL, (
            f"prompt token IDs differ in length: sent {len(sent_ids)}, server consumed {len(prompt_field)}"
        )
    text = choice.get("text")
    if not isinstance(text, str):
        return EXIT_FAIL, f"choices[0].text is not a string"
    if not any(marker in text for marker in MARKERS):
        return EXIT_FAIL, (
            f"none of {', '.join(MARKERS)} appears literally in choices[0].text; "
            "special tokens were stripped (skip_special_tokens not honoured)"
        )
    return EXIT_OK, f"{len(sent_ids)} prompt IDs equal; {len(output_field)} generated IDs; harmony marker present in text"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return EXIT_FAIL
    body = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    sent = json.loads(Path(argv[2]).read_text(encoding="utf-8"))["prompt_token_ids"]
    code, message = check(body, sent)
    print(message, file=sys.stdout if code == EXIT_OK else sys.stderr)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
