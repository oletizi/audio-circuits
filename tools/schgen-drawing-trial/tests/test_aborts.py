"""An aborted generation is an interruption, not the model's output (2026-11-10 run, low-boost 1).

vLLM answered HTTP 200 with finish_reason "abort" when the Spot node shut down mid-request.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import generation
import persist
import run_attempt
from trial_fakes import (BOARD, ENV, WITH_FINAL, CountingClient, FakeTools, refusing_factory, save_response,
                         verified, write_request_dir)

PARTIAL = "<|channel|>analysis<|message|>plan<|end|><|start|>assistant<|channel|>final<|message|>x = add_sch"


@pytest.fixture
def exec_dir(tmp_path: Path) -> Path:
    write_request_dir(tmp_path)
    return tmp_path


def attempt(exec_dir: Path) -> Path:
    return exec_dir / BOARD / "attempt-1"


def run(exec_dir: Path, client: object, env: dict[str, str] | None = None) -> dict[str, object]:
    return run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), lambda e: client,  # type: ignore[arg-type,return-value]
                                   env if env is not None else ENV)


def entries(exec_dir: Path) -> list[dict[str, object]]:
    return persist.read_reruns(attempt(exec_dir))


def test_abort_payload_is_kept_and_not_complete(exec_dir: Path) -> None:
    with pytest.raises(generation.GenerationError, match="abort"):
        run(exec_dir, CountingClient(verified(PARTIAL, "abort")))
    d = attempt(exec_dir)
    assert not persist.response_complete(d) and not (d / "response.complete").exists()
    assert not (d / "response.raw.txt").exists() and not (d / "request.sent").exists()
    kept = list((d / "interrupted").glob("*/response.raw.txt"))
    assert len(kept) == 1 and kept[0].read_text() == PARTIAL
    assert json.loads((kept[0].parent / "response.json").read_text())["finish_reason"] == "abort"
    assert (kept[0].parent / "request.sent").is_file()
    assert [(e["reason"], e["finish_reason"]) for e in entries(exec_dir)] == [("generation-interrupted", "abort")]


def test_saved_complete_abort_is_quarantined_next_run(exec_dir: Path) -> None:
    d = attempt(exec_dir)
    save_response(d, PARTIAL, "abort")
    (d / "request.sent").write_text(json.dumps({"request_id": "live", "seed": 42, "at": "x"}))
    (d / "manifest.json").write_text("{}")
    (d / "page.png").write_bytes(b"PNG")
    (d / "Schematic.svg").write_text("<svg/>")
    with pytest.raises(RuntimeError, match="TRIAL_ENDPOINT"):
        run(exec_dir, refusing_factory, env={})
    left = sorted(p.name for p in d.iterdir())
    assert left == ["interrupted", "reruns.jsonl"], left
    moved = next((d / "interrupted").iterdir())
    for name in ("response.raw.txt", "response.json", "response.complete", "request.sent", "manifest.json",
                 "page.png", "Schematic.svg"):
        assert (moved / name).exists(), name
    assert [(e["reason"], e["finish_reason"]) for e in entries(exec_dir)] == [("generation-interrupted", "abort")]
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, client)
    assert len(client.calls) == 1 and record["finish_reason"] == "stop"
    assert [e["reason"] for e in entries(exec_dir)] == ["generation-interrupted", "regeneration-automatic"]


def test_length_is_still_complete(exec_dir: Path) -> None:
    record = run(exec_dir, CountingClient(verified(PARTIAL, "length")))
    assert record["finish_reason"] == "length" and persist.response_complete(attempt(exec_dir))
    assert entries(exec_dir) == []


def test_regeneration_bound_holds_after_abort(exec_dir: Path) -> None:
    with pytest.raises(generation.GenerationError, match="abort"):
        run(exec_dir, CountingClient(verified(PARTIAL, "abort")))
    second = CountingClient(verified(PARTIAL, "abort"))
    with pytest.raises(generation.GenerationError, match="abort"):
        run(exec_dir, second)  # the one automatic regeneration
    assert len(second.calls) == 1
    third = CountingClient(verified(WITH_FINAL))
    with pytest.raises(run_attempt.RegenerationRefused):
        run(exec_dir, third)
    assert third.calls == []
