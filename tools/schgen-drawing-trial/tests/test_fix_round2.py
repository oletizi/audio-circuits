"""Task 5 fix round 2: bounded regeneration, a PNG never withheld for a missing SVG, an unreadable
request.sent said in the record, and count_only_acknowledged meaning the count-only path was used."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import run_attempt
from trial_fakes import (BOARD, ENV, WITH_FINAL, CountingClient, FakeTools, completion, refusing_factory,
                         save_response, verified, write_request_dir)

REFUSED = json.dumps({"error": "bad request"}).encode()


@pytest.fixture
def exec_dir(tmp_path: Path) -> Path:
    write_request_dir(tmp_path)
    return tmp_path


def directory(exec_dir: Path) -> Path:
    return exec_dir / BOARD / "attempt-1"


def run(exec_dir: Path, client: object, allow: str | None = None, tools: FakeTools | None = None,
        env: dict[str, str] | None = None) -> dict[str, object]:
    return run_attempt.run_attempt(exec_dir, BOARD, 1, tools or FakeTools(), lambda e: client,  # type: ignore[arg-type,return-value]
                                   env or ENV, None, allow)


def reasons(exec_dir: Path) -> list[object]:
    path = directory(exec_dir) / "reruns.jsonl"
    return [json.loads(line)["reason"] for line in path.read_text().splitlines()]


def test_second_relaunch_after_rejection_refused(exec_dir: Path) -> None:
    server_error = CountingClient(status=503, raw=b"busy")
    with pytest.raises(Exception, match="rejected"):
        run(exec_dir, server_error)
    with pytest.raises(Exception, match="rejected"):
        run(exec_dir, server_error)  # the one automatic regeneration, after a 5xx
    assert len(server_error.calls) == 2 and reasons(exec_dir) == ["regeneration-automatic", "generation-lost"]
    untouched = CountingClient(verified(WITH_FINAL))
    with pytest.raises(run_attempt.RegenerationRefused, match="allow-regeneration"):
        run(exec_dir, untouched)
    assert untouched.calls == []
    assert (directory(exec_dir) / "request.sent").is_file(), "a refusal moves nothing"


def test_4xx_rejection_is_never_resent_automatically(exec_dir: Path) -> None:
    with pytest.raises(Exception, match="rejected"):
        run(exec_dir, CountingClient(status=400, raw=REFUSED))
    untouched = CountingClient(verified(WITH_FINAL))
    with pytest.raises(run_attempt.RegenerationRefused, match="HTTP 400"):
        run(exec_dir, untouched)
    assert untouched.calls == []


def test_allow_regeneration_sends_once_and_records(exec_dir: Path) -> None:
    with pytest.raises(Exception, match="rejected"):
        run(exec_dir, CountingClient(status=400, raw=REFUSED))
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, client, allow="body fixed: dropped unknown field")
    assert len(client.calls) == 1
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list)
    assert [r["reason"] for r in reruns] == ["regeneration-allowed", "generation-lost"]
    assert reruns[0]["operator_reason"] == "body fixed: dropped unknown field"


def test_png_without_svg_is_still_a_page(exec_dir: Path) -> None:
    save_response(directory(exec_dir), WITH_FINAL)
    record = run(exec_dir, None, tools=FakeTools(render_svg=False))
    assert not (directory(exec_dir) / "page.svg").exists()
    assert record["page_produced"] is True


def test_unreadable_request_sent_is_said(exec_dir: Path) -> None:
    d = directory(exec_dir)
    d.mkdir(parents=True)
    (d / "request.sent").write_text("{half")
    record = run(exec_dir, CountingClient(verified(WITH_FINAL)))
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list)
    assert [r["reason"] for r in reruns] == ["regeneration-automatic", "generation-lost"]
    assert reruns[1]["request_id"] == "request_id unreadable"


def test_count_only_acknowledged_means_the_path_was_used(exec_dir: Path, tmp_path: Path) -> None:
    flagged = {**ENV, "TRIAL_ACCEPT_COUNT_ONLY": "1"}
    save_response(directory(exec_dir), WITH_FINAL)
    record = run(exec_dir, refusing_factory, env=flagged)
    assert (record["token_identity"], record["count_only_acknowledged"], record["accept_count_only_env"]) == \
        ("verified", False, True)
    other = tmp_path / "count-only"
    write_request_dir(other)
    record = run_attempt.run_attempt(other, BOARD, 1, FakeTools(), lambda e: CountingClient(completion(WITH_FINAL)),  # type: ignore[arg-type,return-value]
                                     flagged)
    assert (record["token_identity"], record["count_only_acknowledged"]) == ("unverified - count only", True)
