"""An aborted generation is an interruption, not the model's output (controller ruling, 2026-11-10 run).

vLLM answers HTTP 200 with finish_reason "abort" when the engine stops a request part-way - in
the live run, a Spot node shutting down mid-request at 3375 tokens. That text ends wherever the
node went away, so it is neither shown nor extracted. Only "stop" and "length" are complete.

  keep_aborted          at generation time: the payload goes to interrupted/<stamp>/ with
                        request.sent, response.complete is never written, generation-interrupted
                        is recorded with the finish_reason, and the caller exits non-zero.
  quarantine_saved_abort  on every run: a response saved complete before this rule existed, whose
                        response.json shows any other finish_reason, is moved to
                        interrupted/<stamp>/ with everything derived from it - the decoded text,
                        the downstream outputs and manifest.json - and recorded the same way.

Either leaves the attempt with no response, ready for its one automatic regeneration with the
same seed (run_attempt.check_regeneration_allowed). Nothing is deleted.
"""

from __future__ import annotations

import json
from pathlib import Path

import stages
from persist import (COMPLETE_FINISH_REASONS, DECODED, INTERRUPTED, MANIFEST_FILE, META, RAW, SENT,
                     quarantine_paths, response_complete, sent_request_id, utc_stamp, write_atomic)


def is_complete_finish(finish_reason: object) -> bool:
    return finish_reason in COMPLETE_FINISH_REASONS


def keep_aborted(directory: Path, text: str, meta: dict[str, object]) -> Path:
    """Keep an incomplete generation's payload under interrupted/<stamp>/ and record it."""
    staging = directory / INTERRUPTED / f".{utc_stamp()}.staging"
    staging.mkdir(parents=True)
    write_atomic(staging / RAW, text.encode("utf-8"))
    write_atomic(staging / META, (json.dumps(meta, indent=2, sort_keys=True) + "\n").encode("utf-8"))
    paths = [staging / RAW, staging / META]
    sent = directory / SENT
    extra: dict[str, object] = {"finish_reason": meta.get("finish_reason")}
    if sent.is_file():
        extra["request_id"] = sent_request_id(sent)
        paths.append(sent)
    target = quarantine_paths(directory, paths, "generation-interrupted", extra)
    staging.rmdir()
    return target


def quarantine_saved_abort(directory: Path) -> Path | None:
    """Move a saved 'complete' response that did not finish, and all derived from it, aside."""
    if not response_complete(directory):
        return None
    finish_reason = json.loads((directory / META).read_text(encoding="utf-8")).get("finish_reason")
    if is_complete_finish(finish_reason):
        return None
    names = ("response.raw.txt", "response.json", "response.complete", DECODED, SENT, MANIFEST_FILE,
             *stages.DOWNSTREAM_FILES)
    paths = [directory / n for n in names if (directory / n).exists()]
    paths += stages.stray_render_outputs(directory)
    extra: dict[str, object] = {"finish_reason": finish_reason, "found": "saved response, re-checked"}
    return quarantine_paths(directory, paths, "generation-interrupted", extra)
