"""One attempt of the SchGen drawing trial, end to end, resumable at any point.

    python run_attempt.py --exec-dir DIR BOARD ATTEMPT [--rerun-reason TEXT]

  1. The approval gate: the board's committed page must be approved byte for
     byte (board-info.ts, approvedSheetDigest) before anything else.
  2. The board's shared request directory, made once (board_request.py):
     request, fidelity (must be equal), prompt.
  3. Generation, only when the attempt has no complete response
     (persist.response_complete). An incomplete one is moved to
     interrupted/<timestamp>/ first and recorded as generation-interrupted,
     or generation-lost when only request.sent shows a request went out;
     a complete one is never regenerated. request.sent is written before
     the POST; a non-completion payload is kept under rejected/<stamp>/.
  4. Token identity, checked from the saved response.json on every run
     (token_identity.py); count-only only with TRIAL_ACCEPT_COUNT_ONLY=1.
  5. The downstream stages (stages.py) on the saved response, then the
     classification and manifest.json.

An attempt that already has manifest.json has been through downstream once.
Running it again re-runs downstream only, and needs --rerun-reason: the
earlier outputs are moved to downstream-previous/<timestamp>/ and the reason
is appended to downstream_reruns. raw_response_sha256 cannot change, since
generation does not run.

Generation needs, from the environment, with no defaults:
  TRIAL_ENDPOINT                  the gateway (or, by recorded departure, vLLM's service)
  TRIAL_MERGED_MANIFEST_SHA256    sha256 of the bucket's schgen-merged MANIFEST
  TRIAL_VLLM_VERSION              the served vLLM's version
  TRIAL_VLLM_IMAGE_DIGEST         the served vLLM image digest
Task 7 sets them from the live deployment. A downstream-only run needs none.

A further generation beyond the one automatic regeneration - a second lost
or interrupted generation, or any resend after a 4xx rejection - is refused
unless --allow-regeneration REASON is given; run_all.sh never passes it.

Exit status: 0 with manifest.json written; 3 on a token-identity
disagreement; 4 when a regeneration needs --allow-regeneration; 1 on
anything else. run_all.sh stops on any of them.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import uuid
from collections.abc import Callable, Mapping
from pathlib import Path

import board_request
import generation
import manifest
import stages
import token_identity
from host_tools import HostTools, RealHostTools
from persist import (META, RAW, pending_rejection_status, persist_response, quarantine_incomplete, record_rerun,
                     regenerations_recorded, response_complete, utc_stamp, write_json_atomic, write_rejected,
                     write_sent)

MANIFEST = "manifest.json"
DOWNSTREAM_PREVIOUS = "downstream-previous"
PROVENANCE_ENV = {
    "endpoint": "TRIAL_ENDPOINT",
    "merged_manifest_sha256": "TRIAL_MERGED_MANIFEST_SHA256",
    "vllm_version": "TRIAL_VLLM_VERSION",
    "vllm_image_digest": "TRIAL_VLLM_IMAGE_DIGEST",
}

ClientFactory = Callable[[str], generation.CompletionsClient]


class RegenerationRefused(RuntimeError):
    """A further generation for an attempt needs the operator's --allow-regeneration REASON."""


class RerunReasonRequired(RuntimeError):
    """Downstream would be re-run over a recorded result without a recorded reason."""


def attempt_dir(exec_dir: Path, board: str, attempt: int) -> Path:
    return exec_dir / board / f"attempt-{attempt}"


def seed_for(attempt: int) -> int:
    if attempt not in generation.SEEDS:
        raise ValueError(f"attempt {attempt} is not one of {sorted(generation.SEEDS)}; seeds are fixed per attempt")
    return generation.SEEDS[attempt]


def provenance_from(env: Mapping[str, str]) -> dict[str, object]:
    missing = [name for name in PROVENANCE_ENV.values() if not env.get(name)]
    if missing:
        raise RuntimeError(
            f"{', '.join(missing)} unset. Generation records where and by what each response was made, and "
            "these are not defaulted: a response whose server, vLLM build or merged weights are unrecorded "
            "cannot be attributed. Task 7 sets them from the live deployment"
        )
    return {key: env[name] for key, name in PROVENANCE_ENV.items()}


def check_regeneration_allowed(directory: Path, allow_regeneration: str | None) -> None:
    """Refuse a resend the operator has not asked for; record it when they have.

    The brief allows one automatic regeneration of an attempt whose generation never completed.
    Beyond that - a second lost or interrupted generation on the same attempt, or any resend after a
    4xx rejection, which a resend would only repeat - it is the operator's call, made with
    --allow-regeneration REASON, and the reason is recorded. Checked before anything is moved.
    """
    earlier = regenerations_recorded(directory)
    rejected = pending_rejection_status(directory)
    client_error = rejected is not None and 400 <= rejected < 500
    if earlier == 0 and not client_error:
        return
    if not allow_regeneration:
        why = (f"the last request was rejected with HTTP {rejected}, which a resend of the same body repeats"
               if client_error else
               f"reruns.jsonl already records {earlier} lost or interrupted generation(s) for this attempt")
        raise RegenerationRefused(
            f"{directory}: not sending seed again: {why}. Read rejected/ and interrupted/, fix the cause, then "
            "run this attempt with --allow-regeneration REASON; the reason is recorded in downstream_reruns. "
            "Not automatic: an unbounded resend spends a generation per relaunch with nobody deciding to"
        )
    record_rerun(directory, "regeneration-allowed", utc_stamp(), {"operator_reason": allow_regeneration})


def ensure_response(directory: Path, board: str, attempt: int, prompt_ids: list[int],
                    client_factory: ClientFactory, env: Mapping[str, str],
                    allow_regeneration: str | None = None) -> None:
    """Generate once when no complete response exists; never when one does."""
    if response_complete(directory):
        return
    provenance = provenance_from(env)
    check_regeneration_allowed(directory, allow_regeneration)
    quarantine_incomplete(directory)
    client = client_factory(str(provenance["endpoint"]))
    request_id = f"schgen-trial-{board}-attempt-{attempt}-{uuid.uuid4()}"
    write_sent(directory, request_id, seed_for(attempt))
    try:
        text, meta = generation.generate(client, prompt_ids, seed_for(attempt), request_id, provenance)
    except generation.RejectedPayload as err:
        kept = write_rejected(directory, request_id, err.status, err.payload, err.reason)
        raise generation.GenerationError(
            f"{request_id}: {err}. The payload is kept at {kept}; request.sent stays, so the next run records "
            "this attempt as generation-lost before it sends again"
        ) from err
    persist_response(directory, text, meta)


def set_aside_downstream(directory: Path, rerun_reason: str | None) -> None:
    """Move earlier downstream outputs aside; a completed earlier run needs a stated reason."""
    previous = [directory / n for n in (*stages.DOWNSTREAM_FILES, MANIFEST) if (directory / n).exists()]
    previous += stages.stray_render_outputs(directory)
    completed = (directory / MANIFEST).is_file()
    if completed and not rerun_reason:
        raise RerunReasonRequired(
            f"{directory / MANIFEST} exists, so this attempt's downstream already ran to a recorded result. "
            "Re-running it replaces that result, so pass --rerun-reason naming the fix that makes the re-run "
            "necessary; it is appended to downstream_reruns. Not defaulted: an unexplained re-run is a result "
            "replaced with no record of why"
        )
    if not previous:
        return
    stamp = utc_stamp()
    target = directory / DOWNSTREAM_PREVIOUS / stamp
    target.mkdir(parents=True)
    for path in previous:
        shutil.move(str(path), str(target / path.name))
    reason = rerun_reason if completed and rerun_reason else "downstream-interrupted"
    record_rerun(directory, reason, stamp, {"previous": str(target.relative_to(directory))})


def run_attempt(exec_dir: Path, board: str, attempt: int, tools: HostTools, client_factory: ClientFactory,
                env: Mapping[str, str], rerun_reason: str | None = None,
                allow_regeneration: str | None = None) -> dict[str, object]:
    seed = seed_for(attempt)
    info = tools.board_info(board)
    request = board_request.prepare(exec_dir, board, tools)
    prompt_ids = list(board_request.load_prompt(request, board)["ids"])
    kicad_version = tools.kicad_cli_version()
    image = tools.runtime_image_digest()
    directory = attempt_dir(exec_dir, board, attempt)
    directory.mkdir(parents=True, exist_ok=True)

    ensure_response(directory, board, attempt, prompt_ids, client_factory, env, allow_regeneration)
    meta = generation.load_meta(directory / META)
    if meta["request"].get("seed") != seed:
        raise RuntimeError(f"{directory / META} was generated with seed {meta['request'].get('seed')}, not {seed}")
    acknowledged = token_identity.accept_count_only(env)
    identity = token_identity.check_token_identity(meta, (directory / RAW).read_text(encoding="utf-8"),
                                                   prompt_ids, acknowledged)

    set_aside_downstream(directory, rerun_reason)
    stages.run_downstream(directory, board, tools)
    record = manifest.build(directory, board=board, attempt=attempt, seed=seed, request_dir=request,
                            exec_dir=exec_dir, board_info=info, kicad_cli_version=kicad_version,
                            runtime_image_digest=image, token_identity=identity,
                            accept_count_only_env=acknowledged)
    write_json_atomic(directory / MANIFEST, record)
    return record


def summary_line(record: Mapping[str, object]) -> str:
    """The run log's line per attempt; token identity is on it, so a count-only run is visible there."""
    return (f"{record['board']} attempt {record['attempt']}: {record['outcome']} "
            f"(page_produced={record['page_produced']}, token_identity={record['token_identity']})")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--exec-dir", required=True, type=Path)
    parser.add_argument("--rerun-reason")
    parser.add_argument("--allow-regeneration", metavar="REASON",
                        help="send this attempt's seed again after a lost or rejected generation; recorded")
    parser.add_argument("board")
    parser.add_argument("attempt", type=int)
    args = parser.parse_args(argv)
    try:
        record = run_attempt(args.exec_dir, args.board, args.attempt, RealHostTools(),
                             generation.HttpCompletionsClient, os.environ, args.rerun_reason,
                             args.allow_regeneration)
    except token_identity.TokenIdentityError as err:
        print(f"run_attempt: STOP {args.board} attempt {args.attempt}: {err}", file=sys.stderr)
        return 3
    except RegenerationRefused as err:
        print(f"run_attempt: STOP {args.board} attempt {args.attempt}: {err}", file=sys.stderr)
        return 4
    print(summary_line(record))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
