"""One generation request to /v1/completions.

The request body is fixed by the plan (Task 5) and the spec's sampling
section, sent explicitly, with the prompt as token IDs so the server cannot
re-tokenize it:

    {"model": "schgen-merged", "prompt": <ids>, "max_tokens": 13312,
     "temperature": 1.0, "top_k": 50, "top_p": 1.0, "seed": <seed>,
     "skip_special_tokens": false, "spaces_between_special_tokens": false,
     "return_token_ids": true}

**One departure from the brief's body, by controller ruling (Task 5 fix
round 1): `"spaces_between_special_tokens": false`.** SchGen's generate.py
decodes with transformers, which puts no space between adjacent special
tokens; vLLM's detokenizer inserts one by default. Without this the returned
text would not be the text SchGen's get_final_python sees, and the
token-identity decode check (token_identity.py) would disagree with it.

A payload that is not a completion the runner can persist - an HTTP error
body, a 200 that is not JSON, not an object, or has no choices[0].text - is
raised as RejectedPayload carrying its bytes, so the caller keeps it
(run_attempt.py writes it to rejected/<stamp>/) rather than discarding it.
A connection that drops with no payload raises the transport's own error.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Protocol

MODEL = "schgen-merged"
SAMPLING: dict[str, object] = {
    "max_tokens": 13312,
    "temperature": 1.0,
    "top_k": 50,
    "top_p": 1.0,
    "skip_special_tokens": False,
    "spaces_between_special_tokens": False,
    "return_token_ids": True,
}
SEEDS = {1: 42, 2: 43, 3: 44}
# One attempt is at most 13312 output tokens; the serving phase measured tens of
# tokens per second on this stack, so a response arrives in minutes. An hour is
# a ceiling for a hung connection, not an estimate of the run.
REQUEST_TIMEOUT_SECONDS = 3600


class GenerationError(RuntimeError):
    """The server did not return a completion the runner can persist."""


class RejectedPayload(GenerationError):
    """The server answered, but not with a persistable completion; the bytes are kept by the caller."""

    def __init__(self, status: int, payload: bytes, reason: str) -> None:
        super().__init__(f"HTTP {status}: {reason}")
        self.status = status
        self.payload = payload
        self.reason = reason


class CompletionsClient(Protocol):
    def post(self, body: dict[str, object], request_id: str) -> tuple[int, bytes]: ...


class HttpCompletionsClient:
    """POSTs to `<endpoint>/v1/completions` with an `X-Request-Id` header; returns (status, body bytes)."""

    def __init__(self, endpoint: str) -> None:
        if not endpoint:
            raise GenerationError("no endpoint: set TRIAL_ENDPOINT to the gateway (or vLLM service) URL")
        self.url = endpoint.rstrip("/") + "/v1/completions"

    def post(self, body: dict[str, object], request_id: str) -> tuple[int, bytes]:
        request = urllib.request.Request(
            self.url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Request-Id": request_id},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as reply:
                return reply.status, reply.read()
        except urllib.error.HTTPError as err:
            return err.code, err.read()


def request_body(prompt_ids: list[int], seed: int) -> dict[str, object]:
    return {"model": MODEL, "prompt": prompt_ids, "seed": seed, **SAMPLING}


def parse_completion(status: int, raw: bytes) -> tuple[dict[str, Any], dict[str, Any], str]:
    """(payload, choices[0], text), or RejectedPayload naming what is wrong with it."""
    if status != 200:
        raise RejectedPayload(status, raw, "the server returned an error status")
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        raise RejectedPayload(status, raw, f"the body is not JSON ({err})") from err
    if not isinstance(payload, dict):
        raise RejectedPayload(status, raw, f"the body is a JSON {type(payload).__name__}, not an object")
    choices = payload.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        raise RejectedPayload(status, raw, "the body does not have exactly one choice")
    text = choices[0].get("text")
    if not isinstance(text, str):
        raise RejectedPayload(status, raw, "choices[0] has no text string")
    return payload, choices[0], text


def generate(client: CompletionsClient, prompt_ids: list[int], seed: int, request_id: str,
             provenance: dict[str, object]) -> tuple[str, dict[str, object]]:
    """One request. Returns (raw text, response.json content); persists nothing itself."""
    body = request_body(prompt_ids, seed)
    started = time.monotonic()
    status, raw = client.post(body, request_id)
    latency = time.monotonic() - started
    payload, choice, text = parse_completion(status, raw)
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
