"""Task 5 fix round 1: sent-and-lost requests, kept rejections, a netlist failure never hiding a page,
prompt.json bound to the fidelity check, and stray render outputs moved aside on a re-run."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import board_request
import generation
import run_attempt
from trial_fakes import (BOARD, ENV, WITH_FINAL, CountingClient, FakeServer, FakeTools, refusing_factory,
                         save_response, verified, write_request_dir)


@pytest.fixture
def exec_dir(tmp_path: Path) -> Path:
    write_request_dir(tmp_path)
    return tmp_path


def attempt_path(exec_dir: Path) -> Path:
    return exec_dir / BOARD / "attempt-1"


def run(exec_dir: Path, tools: FakeTools, client: object, env: dict[str, str] | None = None,
        rerun_reason: str | None = None) -> dict[str, object]:
    return run_attempt.run_attempt(exec_dir, BOARD, 1, tools, lambda e: client,  # type: ignore[arg-type,return-value]
                                   env if env is not None else ENV, rerun_reason)


def reasons(record: dict[str, object]) -> list[object]:
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list)
    return [r["reason"] for r in reruns]


def test_request_sent_written_before_post(exec_dir: Path) -> None:
    directory = attempt_path(exec_dir)
    client = CountingClient(verified(WITH_FINAL), attempt_dir=directory)
    run(exec_dir, FakeTools(), client)
    assert len(client.sent_at_post) == 1
    sent = client.sent_at_post[0]
    assert sent["request_id"] == client.calls[0][1] and sent["seed"] == 42 and sent["at"]


def test_sent_request_without_response_is_lost(exec_dir: Path) -> None:
    directory = attempt_path(exec_dir)
    directory.mkdir(parents=True)
    (directory / "request.sent").write_text(json.dumps({"request_id": "earlier", "seed": 42, "at": "x"}))
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, FakeTools(), client)
    assert len(client.calls) == 1
    assert reasons(record) == ["regeneration-automatic", "generation-lost"]
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list) and reruns[1]["request_id"] == "earlier"
    kept = list((directory / "interrupted").glob("*/request.sent"))
    assert len(kept) == 1, "the marker is kept, not deleted"


def test_http_error_body_is_kept_and_next_run_records_loss(exec_dir: Path) -> None:
    with FakeServer({"error": "engine dead"}, status=500) as server:
        env = {**ENV, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(generation.GenerationError, match="rejected"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)
    directory = attempt_path(exec_dir)
    rejected = list((directory / "rejected").glob("*"))
    assert len(rejected) == 1
    assert json.loads((rejected[0] / "response.body").read_text()) == {"error": "engine dead"}
    assert json.loads((rejected[0] / "rejection.json").read_text())["status"] == 500
    assert (directory / "request.sent").is_file()
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, FakeTools(), client)
    assert len(client.calls) == 1 and reasons(record) == ["regeneration-automatic", "generation-lost"]


@pytest.mark.parametrize("raw", [b"not json", b"[1, 2]", json.dumps({"choices": [{"finish_reason": "stop"}]}).encode()])
def test_non_completion_200_is_kept(exec_dir: Path, raw: bytes) -> None:
    with pytest.raises(generation.GenerationError):
        run(exec_dir, FakeTools(), CountingClient(raw=raw))
    kept = list((attempt_path(exec_dir) / "rejected").glob("*/response.body"))
    assert len(kept) == 1 and kept[0].read_bytes() == raw
    assert not (attempt_path(exec_dir) / "response.raw.txt").exists()


def test_netlist_failure_does_not_hide_page(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    record = run(exec_dir, FakeTools(netlist_code=1), refusing_factory)
    assert (record["outcome"], record["failure_stage"]) == ("tooling-failed", "netlist")
    assert record["page_produced"] is True, "a rendered page is shown whatever the netlist export did"


@pytest.mark.parametrize("field, value", [("ours_ids_sha256", "0" * 64), ("rendered_date", "2026-11-11")])
def test_prompt_not_bound_to_fidelity_refused(exec_dir: Path, field: str, value: str) -> None:
    fidelity = exec_dir / BOARD / "request" / "fidelity.json"
    record = json.loads(fidelity.read_text())
    record[field] = value
    fidelity.write_text(json.dumps(record))
    with pytest.raises(board_request.FidelityError, match="not the prompt"):
        run(exec_dir, FakeTools(), refusing_factory)


def test_rerun_moves_stray_render_outputs(exec_dir: Path) -> None:
    directory = attempt_path(exec_dir)
    save_response(directory, WITH_FINAL)
    run(exec_dir, FakeTools(), refusing_factory)
    (directory / "Schematic.svg").write_text("<svg/>")
    (directory / "crops").mkdir()
    (directory / "crops" / "page-whole-page.png").write_bytes(b"PNG")
    record = run(exec_dir, FakeTools(), refusing_factory, rerun_reason="render fix")
    assert not (directory / "Schematic.svg").exists() and not (directory / "crops").exists()
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list)
    previous = directory / str(reruns[-1]["previous"])
    assert (previous / "Schematic.svg").is_file() and (previous / "crops" / "page-whole-page.png").is_file()
