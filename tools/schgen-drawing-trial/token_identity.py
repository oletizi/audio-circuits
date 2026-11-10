"""Token identity, not token count: what the server consumed and returned against what was sent.

With `return_token_ids`, vLLM returns the prompt IDs it consumed
(`choices[0].prompt_token_ids`) and the IDs it generated
(`choices[0].token_ids`). The returned prompt IDs must equal the IDs sent,
element by element; decoding the generated IDs with special tokens kept must
equal the returned `text`, so the harmony markers SchGen's get_final_python
looks for were not stripped.

**Count-only is never reached silently** (Task 5 fix round 1). The request
asked for the IDs, so their absence is a stop (exit 3) unless the operator
has set TRIAL_ACCEPT_COUNT_ONLY=1 - which Task 7 does only after naming the
limitation in the README, as the brief requires. With it set the result is
`"unverified - count only"`, gated on `usage.prompt_tokens` equal to the IDs
sent, and the acknowledgement is recorded in the manifest. A key containing
`token_ids` anywhere else in the body is refused by name: it means the IDs
came back under another name or path, which is not the same as absence.

The checks read only the saved response.json, so they run again, from disk,
on every relaunch: a response is persisted before it is checked and is never
discarded, and a mismatch stops the run every time it is looked at.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from tokenizers import Tokenizer

from persist import sha256_file

VERIFIED = "verified"
TEXT_EQUAL = "equal"
STOP_OMITTED = "stop-token-omitted-by-server"
COUNT_ONLY = "unverified - count only"
ACCEPT_ENV = "TRIAL_ACCEPT_COUNT_ONLY"
EXPECTED_PATHS = ("choices[0].prompt_token_ids", "choices[0].token_ids")

HERE = Path(__file__).resolve().parent
TOKENIZER_DIR = HERE / "runtime" / "tokenizer"
# The merged model's generation_config.json, copied from
# gs://oletizi-docs-cli-20261028-schgen-merge/schgen-merged/; this sha256 is the one that bucket's
# MANIFEST.sha256 lists for it. vLLM stops on its eos_token_id.
GENERATION_CONFIG = HERE / "model" / "generation_config.json"
GENERATION_CONFIG_SHA256 = "1fdf6869787b3a8f1259846c2f3bd314c91cb928b5f2f60cfc77bb0f3bd18b7f"


class TokenIdentityError(RuntimeError):
    """What the server consumed or returned is not what the trial sent or recorded."""


def accept_count_only(env: Mapping[str, str]) -> bool:
    value = env.get(ACCEPT_ENV, "")
    if value not in ("", "1"):
        raise TokenIdentityError(f"{ACCEPT_ENV} is {value!r}; it is either unset or exactly 1")
    return value == "1"


def tokenizer() -> Tokenizer:
    """The merged model's tokenizer.json, refused unless its sha256 is the one in SHA256SUMS."""
    sums: dict[str, str] = {}
    for line in (TOKENIZER_DIR / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        digest, _, name = line.strip().partition("  ")
        if name:
            sums[name] = digest
    path = TOKENIZER_DIR / "tokenizer.json"
    if sums.get("tokenizer.json") != sha256_file(path):
        raise TokenIdentityError(f"{path} does not match its sha256 in SHA256SUMS; it is a pinned input")
    return Tokenizer.from_file(str(path))


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


def _int_list(value: object, name: str) -> list[int]:
    if not isinstance(value, list) or not all(isinstance(v, int) for v in value):
        raise TokenIdentityError(f"{name} is present but is not a list of integers")
    return list(value)


def _choice(body: Mapping[str, object]) -> Mapping[str, object]:
    choices = body.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        raise TokenIdentityError("response.json's body does not have exactly one choice")
    return choices[0]


@dataclass(frozen=True)
class IdentityResult:
    identity: str
    """VERIFIED or COUNT_ONLY."""
    text_vs_decoded: str | None
    """TEXT_EQUAL or STOP_OMITTED; None in count-only, where there are no IDs to decode."""
    decoded_text: str | None
    """decode(token_ids, skip_special_tokens=False): what extraction reads. None in count-only."""


def stop_strings() -> list[str]:
    """The model's stop tokens as text: the pinned generation_config.json's eos_token_id, decoded."""
    path = GENERATION_CONFIG
    if sha256_file(path) != GENERATION_CONFIG_SHA256:
        raise TokenIdentityError(
            f"{path} does not have sha256 {GENERATION_CONFIG_SHA256}, the value the merged model's "
            "MANIFEST.sha256 records for generation_config.json; it is a pinned input"
        )
    ids = json.loads(path.read_text(encoding="utf-8")).get("eos_token_id")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
        raise TokenIdentityError(f"{path} has no eos_token_id list")
    tok = tokenizer()
    names = [tok.id_to_token(i) for i in ids]
    if any(not isinstance(n, str) for n in names):
        raise TokenIdentityError(f"an eos_token_id in {path} is not in the tokenizer: {ids}")
    return [str(n) for n in names]


def _only_stop_tokens(remainder: str, stops: list[str]) -> bool:
    if not remainder:
        return False
    while remainder:
        match = next((s for s in stops if remainder.startswith(s)), None)
        if match is None:
            return False
        remainder = remainder[len(match):]
    return True


def check_token_identity(meta: Mapping[str, object], raw_text: str, sent_ids: list[int],
                         accept_count_only: bool) -> IdentityResult:
    """VERIFIED (with the decoded text extraction reads) or acknowledged COUNT_ONLY; else raise."""
    body = meta.get("body")
    if not isinstance(body, dict):
        raise TokenIdentityError("response.json carries no server body to check")
    stray = [p for p in token_id_keys(body) if p not in EXPECTED_PATHS]
    if stray:
        raise TokenIdentityError(
            f"the response carries {', '.join(stray)}, where the IDs are read from {' and '.join(EXPECTED_PATHS)}. "
            "The IDs may have come back under another name or path; that is not absence, and is not checked by "
            "guessing which field means what - settle the field names (Task 6 smoke) first"
        )
    choice = _choice(body)
    prompt_field, output_field = choice.get("prompt_token_ids"), choice.get("token_ids")
    if prompt_field is None and output_field is None:
        return IdentityResult(_count_only(meta, sent_ids, accept_count_only), None, None)
    if prompt_field is None or output_field is None:
        raise TokenIdentityError(
            "the server returned only one of prompt_token_ids and token_ids; return_token_ids gives both, "
            "so this is not a response the identity check can be run on, nor one it may skip"
        )
    returned = _int_list(prompt_field, "prompt_token_ids")
    for index, (sent, got) in enumerate(zip(sent_ids, returned)):
        if sent != got:
            raise TokenIdentityError(
                f"prompt token IDs differ at index {index}: sent {sent}, the server consumed {got}. "
                "The prompt is sent as IDs so the server cannot re-tokenize it; it did not consume what was sent"
            )
    if len(returned) != len(sent_ids):
        raise TokenIdentityError(
            f"prompt token IDs differ at index {min(len(returned), len(sent_ids))}: sent {len(sent_ids)} IDs, "
            f"the server consumed {len(returned)}"
        )
    generated = _int_list(output_field, "token_ids")
    decoded = tokenizer().decode(generated, skip_special_tokens=False)
    if decoded == raw_text:
        return IdentityResult(VERIFIED, TEXT_EQUAL, decoded)
    # The one accepted difference (controller ruling, 2026-11-10 preflight): vLLM keeps the stop
    # token in token_ids and leaves it out of text. Only on finish_reason "stop", and only when the
    # whole difference is trailing stop-token strings from the pinned generation config.
    if (meta.get("finish_reason") == "stop" and decoded.startswith(raw_text)
            and _only_stop_tokens(decoded[len(raw_text):], stop_strings())):
        return IdentityResult(VERIFIED, STOP_OMITTED, decoded)
    at = next((i for i, (a, b) in enumerate(zip(decoded, raw_text)) if a != b), min(len(decoded), len(raw_text)))
    raise TokenIdentityError(
        f"the generated token IDs decode, special tokens kept, to text that differs from the returned text "
        f"at character {at} (decoded {decoded[at:at + 40]!r}, returned {raw_text[at:at + 40]!r}, finish_reason "
        f"{meta.get('finish_reason')!r}); the only difference accepted is trailing stop tokens on "
        "finish_reason stop"
    )


def _count_only(meta: Mapping[str, object], sent_ids: list[int], accepted: bool) -> str:
    if not accepted:
        raise TokenIdentityError(
            f"the request asked for return_token_ids and the response carries neither "
            f"{' nor '.join(EXPECTED_PATHS)}, so token identity cannot be checked. The run does not fall back to "
            f"a count on its own: name the limitation in the execution README, then set {ACCEPT_ENV}=1 to "
            "continue on count equality; the acknowledgement is recorded in every manifest"
        )
    usage = meta.get("usage")
    consumed = usage.get("prompt_tokens") if isinstance(usage, dict) else None
    if consumed != len(sent_ids):
        raise TokenIdentityError(
            f"the server returned no token IDs and reports prompt_tokens {consumed}, but {len(sent_ids)} IDs "
            "were sent; even the count check fails"
        )
    return COUNT_ONLY
