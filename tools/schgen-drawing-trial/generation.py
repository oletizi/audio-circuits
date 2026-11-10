"""One generation request to /v1/completions, and the token-identity checks on what came back.

The request body is fixed by the plan (Task 5) and the spec's sampling
section, sent explicitly, with the prompt as token IDs so the server cannot
re-tokenize it:

    {"model": "schgen-merged", "prompt": <ids>, "max_tokens": 13312,
     "temperature": 1.0, "top_k": 50, "top_p": 1.0, "seed": <seed>,
     "skip_special_tokens": false, "return_token_ids": true}

**Token identity, not token count.** With `return_token_ids`, vLLM returns
the prompt IDs it consumed (`choices[0].prompt_token_ids`) and the IDs it
generated (`choices[0].token_ids`). The returned prompt IDs must equal the
IDs sent, element by element; decoding the generated IDs with special tokens
kept must equal the returned `text`, so the harmony markers SchGen's
get_final_python looks for were not stripped. When the server returns
neither field, the run does not claim token-level fidelity: it records
`token_identity: "unverified - count only"` and continues on
`usage.prompt_tokens` equal to the number of IDs sent.

The checks read only the saved response.json, so they run again, from disk,
on every relaunch: a response is persisted before it is checked and is never
discarded, and a mismatch stops the run every time it is looked at.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Protocol

from tokenizers import Tokenizer

from persist import sha256_file

MODEL = "schgen-merged"
SAMPLING: dict[str, object] = {
    "max_tokens": 13312,
    "temperature": 1.0,
    "top_k": 50,
    "top_p": 1.0,
    "skip_special_tokens": False,
    "return_token_ids": True,
}
SEEDS = {1: 42, 2: 43, 3: 44}
VERIFIED = "verified"
COUNT_ONLY = "unverified - count only"
# One attempt is at most 13312 output tokens; the serving phase measured tens of
# tokens per second on this stack, so a response arrives in minutes. An hour is
# a ceiling for a hung connection, not an estimate of the run.
REQUEST_TIMEOUT_SECONDS = 3600

HERE = Path(__file__).resolve().parent
TOKENIZER_DIR = HERE / "runtime" / "tokenizer"


class TokenIdentityError(RuntimeError):
    """What the server consumed or returned is not what the trial sent or recorded."""


class GenerationError(RuntimeError):
    """The server did not return a completion the runner can persist."""


class CompletionsClient(Protocol):
    def post(self, body: dict[str, object], request_id: str) -> dict[str, object]: ...


class HttpCompletionsClient:
    """POSTs to `<endpoint>/v1/completions` with an `X-Request-Id` header."""

    def __init__(self, endpoint: str) -> None:
        if not endpoint:
            raise GenerationError("no endpoint: set TRIAL_ENDPOINT to the gateway (or vLLM service) URL")
        self.url = endpoint.rstrip("/") + "/v1/completions"

    def post(self, body: dict[str, object], request_id: str) -> dict[str, object]:
        request = urllib.request.Request(
            self.url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Request-Id": request_id},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as reply:
                payload = json.loads(reply.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")[:2000]
            raise GenerationError(f"{self.url} returned HTTP {err.code} for {request_id}: {detail}") from err
        if not isinstance(payload, dict):
            raise GenerationError(f"{self.url} returned {type(payload).__name__}, not a JSON object")
        return payload


def request_body(prompt_ids: list[int], seed: int) -> dict[str, object]:
    return {"model": MODEL, "prompt": prompt_ids, "seed": seed, **SAMPLING}


def generate(client: CompletionsClient, prompt_ids: list[int], seed: int, request_id: str,
             provenance: dict[str, object]) -> tuple[str, dict[str, object]]:
    """One request. Returns (raw text, response.json content); persists nothing itself."""
    body = request_body(prompt_ids, seed)
    started = time.monotonic()
    payload = client.post(body, request_id)
    latency = time.monotonic() - started
    choice = _first_choice(payload)
    text = choice.get("text")
    if not isinstance(text, str):
        raise GenerationError(f"response for {request_id} has no choices[0].text string: {json.dumps(payload)[:2000]}")
    meta: dict[str, object] = {
        "request_id": request_id,
        "request": {k: v for k, v in body.items() if k != "prompt"},
        "latency_s": round(latency, 3),
        "finish_reason": choice.get("finish_reason"),
        "usage": payload.get("usage"),
        "provenance": provenance,
        "body": payload,
    }
    return text, meta


def load_meta(path: Path) -> dict[str, Any]:
    meta = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(meta, dict) or not isinstance(meta.get("request"), dict):
        raise GenerationError(f"{path} is not a response.json this runner wrote (no 'request' object)")
    return meta


def _first_choice(payload: dict[str, object]) -> dict[str, object]:
    choices = payload.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        raise GenerationError(f"expected exactly one choice, got {json.dumps(payload)[:2000]}")
    return choices[0]


def _int_list(value: object, name: str) -> list[int]:
    if not isinstance(value, list) or not all(isinstance(v, int) for v in value):
        raise TokenIdentityError(f"{name} is present but is not a list of integers")
    return list(value)


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


def check_token_identity(meta: dict[str, object], raw_text: str, sent_ids: list[int]) -> str:
    """Return VERIFIED or COUNT_ONLY; raise TokenIdentityError on any disagreement."""
    body = meta.get("body")
    if not isinstance(body, dict):
        raise TokenIdentityError("response.json carries no server body to check")
    choice = _first_choice(body)
    prompt_field, output_field = choice.get("prompt_token_ids"), choice.get("token_ids")
    if prompt_field is None and output_field is None:
        return _count_only(meta, sent_ids)
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
    if decoded != raw_text:
        at = next((i for i, (a, b) in enumerate(zip(decoded, raw_text)) if a != b), min(len(decoded), len(raw_text)))
        raise TokenIdentityError(
            f"the generated token IDs decode, special tokens kept, to text that differs from the returned text "
            f"at character {at} (decoded {decoded[at:at + 40]!r}, returned {raw_text[at:at + 40]!r}); special "
            "tokens get_final_python needs may have been stripped"
        )
    return VERIFIED


def _count_only(meta: dict[str, object], sent_ids: list[int]) -> str:
    usage = meta.get("usage")
    consumed = usage.get("prompt_tokens") if isinstance(usage, dict) else None
    if consumed != len(sent_ids):
        raise TokenIdentityError(
            f"the server returned no token IDs and reports prompt_tokens {consumed}, but {len(sent_ids)} IDs "
            "were sent; even the count check fails"
        )
    return COUNT_ONLY
