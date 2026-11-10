"""Atomic writes, and the marker that says an attempt's response is complete.

Every artifact is written to `<name>.part`, fsync'd, then renamed into place,
and the directory is fsync'd after the rename. `response.raw.txt` and
`response.json` are written first; `response.complete` is written last and
holds both files' sha256.

`request.sent` is written atomically BEFORE the request goes out, holding
its X-Request-Id, seed and time. A `request.sent` with no complete response
and no response file is a request that was sent and lost (a Spot reclaim, a
reset connection, a rejected payload): it is moved to interrupted/<stamp>/
like any other leftover and recorded as `generation-lost`, so a relaunch that
sends the same seed again says that it did. A payload that came back but is
not a persistable completion is kept under rejected/<stamp>/.

An attempt counts as generated only when `response.complete` exists and its
digests match the files on disk. A `.part`, or a response without a valid
marker, means the outcome of generation is unknown: those files are moved to
`interrupted/<timestamp>/` - kept, never deleted - and the attempt is
generated once more, with the same seed. No response for it was ever
completed, so none was seen or discarded, and the regeneration is not a
resample.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

RAW = "response.raw.txt"
META = "response.json"
MARKER = "response.complete"
SENT = "request.sent"
RESPONSE_FILES = (RAW, META, MARKER)
INTERRUPTED = "interrupted"
REJECTED = "rejected"
RERUNS = "reruns.jsonl"


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def _fsync_dir(directory: Path) -> None:
    fd = os.open(directory, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def write_atomic(path: Path, data: bytes) -> None:
    """Write `data` to `path` by way of `path.part`, fsync, rename, fsync the directory."""
    part = path.with_name(path.name + ".part")
    with open(part, "wb") as fh:
        fh.write(data)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(part, path)
    _fsync_dir(path.parent)


def write_json_atomic(path: Path, value: object) -> None:
    write_atomic(path, (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8"))


def persist_response(attempt_dir: Path, raw_text: str, meta: dict[str, object]) -> None:
    """Write the raw response and its metadata, then the marker naming both digests."""
    raw_bytes = raw_text.encode("utf-8")
    meta_bytes = (json.dumps(meta, indent=2, sort_keys=True) + "\n").encode("utf-8")
    write_atomic(attempt_dir / RAW, raw_bytes)
    write_atomic(attempt_dir / META, meta_bytes)
    write_json_atomic(attempt_dir / MARKER, {RAW: sha256_bytes(raw_bytes), META: sha256_bytes(meta_bytes)})


def response_complete(attempt_dir: Path) -> bool:
    """True only when the marker exists, parses, and both digests match the files."""
    marker = attempt_dir / MARKER
    if not marker.is_file():
        return False
    try:
        digests = json.loads(marker.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return False
    if not isinstance(digests, dict):
        return False
    for name in (RAW, META):
        path = attempt_dir / name
        if not path.is_file() or digests.get(name) != sha256_file(path):
            return False
    return True


def response_leftovers(attempt_dir: Path) -> list[Path]:
    """Response files, or their .part files, present in an attempt that is not complete."""
    names = [*RESPONSE_FILES, *(n + ".part" for n in (*RESPONSE_FILES, SENT))]
    return [attempt_dir / n for n in names if (attempt_dir / n).exists()]


def write_sent(attempt_dir: Path, request_id: str, seed: int) -> None:
    write_json_atomic(attempt_dir / SENT, {"request_id": request_id, "seed": seed, "at": utc_stamp()})


UNREADABLE = "request_id unreadable"


def sent_request_id(path: Path) -> str:
    """The request id request.sent records, or UNREADABLE - said in the record, never dropped."""
    try:
        value = json.loads(path.read_text(encoding="utf-8")).get("request_id")
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
        return UNREADABLE
    return value if isinstance(value, str) and value else UNREADABLE


def pending_rejection_status(attempt_dir: Path) -> int | None:
    """The HTTP status of the rejection kept for the request request.sent names, if there is one."""
    sent = attempt_dir / SENT
    if not sent.is_file():
        return None
    request_id = sent_request_id(sent)
    for rejection in sorted((attempt_dir / REJECTED).glob("*/rejection.json")):
        try:
            record = json.loads(rejection.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ValueError(
                f"{rejection} is not readable JSON ({error}); the 4xx guard cannot tell whether a resend is "
                "safe. Inspect the file, then rerun with --allow-regeneration REASON if a resend is intended."
            ) from error
        if not isinstance(record, dict):
            raise ValueError(
                f"{rejection} holds a JSON {type(record).__name__}, not an object; the 4xx guard cannot "
                "tell whether a resend is safe. Inspect the file, then rerun with "
                "--allow-regeneration REASON if a resend is intended."
            )
        if record.get("request_id") == request_id:
            status = record.get("status")
            if not isinstance(status, int) or isinstance(status, bool):
                raise ValueError(
                    f"{rejection} records status {status!r}, which is not an integer HTTP status; the 4xx "
                    "guard will not read that as 'no 4xx'. Inspect the file, then rerun with "
                    "--allow-regeneration REASON if a resend is intended."
                )
            return status
    return None


REGENERATION_REASONS = ("generation-lost", "generation-interrupted")


def regenerations_recorded(attempt_dir: Path) -> int:
    return sum(1 for entry in read_reruns(attempt_dir) if entry.get("reason") in REGENERATION_REASONS)


def quarantine_incomplete(attempt_dir: Path) -> Path | None:
    """Move an incomplete generation's files to interrupted/<timestamp>/ and log why.

    `generation-interrupted` when any response file was written; `generation-lost`
    when only request.sent is there - the request went out and nothing came back
    that could be kept. Returns the directory, or None when there was nothing.
    """
    leftovers = response_leftovers(attempt_dir)
    sent = attempt_dir / SENT
    moving = leftovers + ([sent] if sent.is_file() else [])
    if not moving:
        return None
    reason = "generation-interrupted" if leftovers else "generation-lost"
    request_id = sent_request_id(sent) if sent.is_file() else None
    stamp = utc_stamp()
    target = attempt_dir / INTERRUPTED / stamp
    target.mkdir(parents=True, exist_ok=False)
    for path in moving:
        shutil.move(str(path), str(target / path.name))
    _fsync_dir(target)
    _fsync_dir(attempt_dir)
    extra: dict[str, object] = {"moved_to": str(target.relative_to(attempt_dir))}
    if request_id is not None:
        extra["request_id"] = request_id
    record_rerun(attempt_dir, reason, stamp, extra)
    return target


def write_rejected(attempt_dir: Path, request_id: str, status: int, payload: bytes, reason: str) -> Path:
    """Keep a payload that is not a persistable completion, with why it was not taken."""
    target = attempt_dir / REJECTED / utc_stamp()
    target.mkdir(parents=True, exist_ok=False)
    write_atomic(target / "response.body", payload)
    write_json_atomic(target / "rejection.json", {"request_id": request_id, "status": status, "reason": reason})
    return target


def record_rerun(attempt_dir: Path, reason: str, at: str, extra: dict[str, object] | None = None) -> None:
    """Append one {reason, at} line to the attempt's rerun log; never rewrites earlier lines."""
    entry: dict[str, object] = {"reason": reason, "at": at, **(extra or {})}
    with open(attempt_dir / RERUNS, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, sort_keys=True) + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def read_reruns(attempt_dir: Path) -> list[dict[str, object]]:
    path = attempt_dir / RERUNS
    if not path.is_file():
        return []
    entries: list[dict[str, object]] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError as err:
            raise RuntimeError(
                f"{path} line {number} is not JSON ({err}); a run killed mid-append can leave a partial last "
                "line. It is the record of interruptions and re-runs, so it is not repaired silently: complete "
                "or remove that line by hand, knowing what it recorded"
            ) from err
    return entries
