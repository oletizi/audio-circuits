"""manifest.json for one attempt, assembled from files on disk (spec, "Provenance and resumability").

Generation-time provenance - endpoint, vLLM version and image digest, the
merged-model manifest sha256, the request sent - is saved inside
response.json when the response is persisted, so a downstream re-run months
later reads it from the record rather than from whatever the environment
says then. Everything else comes from the request directory, the attempt's
own artifacts, and the repository.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import board_request
import stages
from token_identity import COUNT_ONLY
from persist import META, RAW, read_reruns, sha256_file

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DOCKERFILE = HERE / "runtime" / "Dockerfile"


def schgen_commit() -> str:
    """The SchGen commit the runtime image is built from: the Dockerfile's ARG, which the build checks."""
    found = re.findall(r"^ARG SCHGEN_COMMIT=([0-9a-f]{40})$", DOCKERFILE.read_text(encoding="utf-8"), re.M)
    if len(found) != 1:
        raise RuntimeError(f"{DOCKERFILE} has {len(found)} 'ARG SCHGEN_COMMIT=<40 hex>' lines, expected 1")
    return found[0]


def git_revision() -> tuple[str, bool]:
    """HEAD, and whether the working tree differs from it (so the revision alone does not describe the code)."""
    head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=REPO, check=True)
    status = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"],
                            capture_output=True, text=True, cwd=REPO, check=True)
    return head.stdout.strip(), bool(status.stdout.strip())


def _usage(meta: dict[str, object], key: str) -> object:
    usage = meta.get("usage")
    return usage.get(key) if isinstance(usage, dict) else None


def build(attempt_dir: Path, *, board: str, attempt: int, seed: int, request_dir: Path, exec_dir: Path,
          board_info: dict[str, str], kicad_cli_version: str, runtime_image_digest: str,
          token_identity: str, accept_count_only_env: bool) -> dict[str, object]:
    meta = json.loads((attempt_dir / META).read_text(encoding="utf-8"))
    provenance = meta["provenance"]
    prompt = json.loads((request_dir / "prompt.json").read_text(encoding="utf-8"))
    outcome = stages.classify(attempt_dir)
    revision, dirty = git_revision()
    return {
        "board": board,
        "attempt": attempt,
        "seed": seed,
        "request_id": meta["request_id"],
        "model_module": board_info["model_module"],
        "git_revision": revision,
        "git_dirty": dirty,
        "approved_sheet_sha256": board_info["approved_sheet_sha256"],
        "schgen_commit": schgen_commit(),
        "runtime_image_digest": runtime_image_digest,
        "merged_manifest_sha256": provenance["merged_manifest_sha256"],
        "tokenizer_files_sha256": prompt["tokenizer_files_sha256"],
        "template_sha256": prompt["template_sha256"],
        "user_message_template_sha256": prompt["user_message_template_sha256"],
        "rendered_date": prompt["rendered_date"],
        "request_dir": str(request_dir.relative_to(exec_dir)),
        "prompt_sha256": board_request.prompt_sha256(request_dir),
        "endpoint": provenance["endpoint"],
        "vllm_version": provenance["vllm_version"],
        "vllm_image_digest": provenance["vllm_image_digest"],
        "raw_response_sha256": sha256_file(attempt_dir / RAW),
        "sampling": meta["request"],
        "prompt_tokens": _usage(meta, "prompt_tokens"),
        "output_tokens": _usage(meta, "completion_tokens"),
        "finish_reason": meta["finish_reason"],
        "latency_s": meta["latency_s"],
        "token_identity": token_identity,
        # True only when the count-only path was taken (which needs the flag); the flag itself beside it.
        "count_only_acknowledged": token_identity == COUNT_ONLY,
        "accept_count_only_env": accept_count_only_env,
        "emitter_fixes": stages.emitter_fixes(attempt_dir),
        "kicad_cli_version": kicad_cli_version,
        "outcome": outcome.name,
        "outcome_detail": outcome.detail,
        "limit": outcome.limit,
        "failure_stage": outcome.failure_stage,
        "page_produced": stages.page_produced(attempt_dir),
        "stage_status": {name: s["status"] for name, s in stages.read_stages(attempt_dir).items()},
        "downstream_reruns": read_reruns(attempt_dir),
    }
