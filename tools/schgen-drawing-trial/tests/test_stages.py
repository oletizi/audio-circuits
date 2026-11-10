"""The attempt runner: resumability, persistence, token identity, classification, the manifest.

Host pytest in tools/schgen-drawing-trial/.venv. Responses are synthetic (test
code); SchGen's extraction and kicad-cli run for real where the test is about
what they observe, so docker with schgen-runtime:0707520c and the host
kicad-cli 10.0.5 are required.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

import generation
import persist
import run_attempt
import token_identity
from trial_fakes import (BOARD, ENV, NO_FINAL, PROMPT_IDS, WITH_FINAL, CountingClient, FakeServer, FakeTools,
                         completion, nil_uuid_sheet, refusing_factory, save_response, symbol_free_sheet,
                         verified, write_request_dir)

ACCEPT = {**ENV, "TRIAL_ACCEPT_COUNT_ONLY": "1"}


def attempt_path(exec_dir: Path, attempt: int = 1) -> Path:
    return exec_dir / BOARD / f"attempt-{attempt}"


def run(exec_dir: Path, tools: FakeTools, factory: object, attempt: int = 1,
        rerun_reason: str | None = None) -> dict[str, object]:
    return run_attempt.run_attempt(exec_dir, BOARD, attempt, tools, factory, ENV, rerun_reason)  # type: ignore[arg-type]


@pytest.fixture
def exec_dir(tmp_path: Path) -> Path:
    write_request_dir(tmp_path)
    return tmp_path


def test_saved_response_is_not_regenerated(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    tools = FakeTools()
    record = run(exec_dir, tools, refusing_factory)
    assert tools.extract_calls, "downstream must run on the saved response"
    assert record["outcome"] == "page" and record["page_produced"] is True
    assert (attempt_path(exec_dir) / "manifest.json").is_file()


def test_missing_response_is_generated_once(exec_dir: Path) -> None:
    client = CountingClient(verified(WITH_FINAL))
    tools = FakeTools()
    seen_complete: list[bool] = []
    original = tools.extract

    def extract_after_persist(raw: Path) -> dict[str, object]:
        seen_complete.append(persist.response_complete(raw.parent))
        return original(raw)

    tools.extract = extract_after_persist  # type: ignore[method-assign]
    record = run(exec_dir, tools, lambda endpoint: client)
    assert len(client.calls) == 1 and seen_complete == [True]
    body, request_id = client.calls[0]
    assert body == {"model": "schgen-merged", "prompt": PROMPT_IDS, "max_tokens": 13312, "temperature": 1.0,
                    "top_k": 50, "top_p": 1.0, "seed": 42, "skip_special_tokens": False,
                    "spaces_between_special_tokens": False, "return_token_ids": True}
    assert request_id.startswith(f"schgen-trial-{BOARD}-attempt-1-")
    run(exec_dir, tools, lambda endpoint: client, rerun_reason="second look")
    assert len(client.calls) == 1
    assert record["seed"] == 42 and record["merged_manifest_sha256"] == ENV["TRIAL_MERGED_MANIFEST_SHA256"]


def test_no_final_channel_classified(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), NO_FINAL)
    tools = FakeTools(real_extract=True)
    record = run(exec_dir, tools, refusing_factory)
    assert record["outcome"] == "no-final-channel" and record["failure_stage"] == "extraction"
    program = (attempt_path(exec_dir) / "program.py").read_text(encoding="utf-8")
    assert program == NO_FINAL, "SchGen's fallback is the whole response"
    assert tools.emitted == [NO_FINAL], "the fallback program is still handed to the emitter"
    assert record["page_produced"] is True, "a page from the fallback is still a page"


def test_length_cutoff_recorded(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL, finish_reason="length")
    record = run(exec_dir, FakeTools(), refusing_factory)
    assert record["finish_reason"] == "length"
    assert record["outcome"] == "page"


def test_symbol_free_sheet(exec_dir: Path, tmp_path: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    tools = FakeTools(sheet=symbol_free_sheet(tmp_path / "blank.kicad_sch"), real_kicad=True)
    record = run(exec_dir, tools, refusing_factory)
    assert record["outcome"] == "symbol-free-sheet"
    assert record["page_produced"] is False
    assert (attempt_path(exec_dir) / "page.kicad_sch").is_file(), "the sheet is kept"


def test_blank_render(exec_dir: Path, tmp_path: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    tools = FakeTools(sheet=nil_uuid_sheet(tmp_path / "nil.kicad_sch"), real_kicad=True)
    record = run(exec_dir, tools, refusing_factory)
    assert record["outcome"] == "blank-render", record["outcome_detail"]
    assert "no component" in str(record["outcome_detail"])
    assert record["page_produced"] is False
    assert (attempt_path(exec_dir) / "page.kicad_sch").is_file(), "the sheet is kept"
    assert (attempt_path(exec_dir) / "page.pdf").is_file(), "kicad-cli's PDF of the empty frame is kept"
    stage_status = record["stage_status"]
    assert isinstance(stage_status, dict) and stage_status["render"] == "failed", \
        "on this class kicad-cli names the SVG Schematic.svg, which render.ts reports"


def test_real_sheet_is_a_page(exec_dir: Path) -> None:
    """The control for the two above: the same fixture with its real UUID renders as a page."""
    save_response(attempt_path(exec_dir), WITH_FINAL)
    record = run(exec_dir, FakeTools(real_kicad=True), refusing_factory)
    assert record["outcome"] == "page", record["outcome_detail"]
    assert record["page_produced"] is True
    assert record["stage_status"] == {s: "ok" for s in ("extraction", "emitter", "render", "netlist", "erc", "compare")}


def test_partial_response_is_not_complete(exec_dir: Path) -> None:
    directory = attempt_path(exec_dir)
    directory.mkdir(parents=True)
    (directory / "response.raw.txt.part").write_text("<|channel|>analysis<|message|>half")
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, FakeTools(), lambda endpoint: client)
    assert len(client.calls) == 1
    moved = list((directory / "interrupted").glob("*/response.raw.txt.part"))
    assert len(moved) == 1 and moved[0].read_text() == "<|channel|>analysis<|message|>half"
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list) and [r["reason"] for r in reruns] == ["generation-interrupted"]
    assert client.calls[0][0]["seed"] == 42, "regenerated with the same seed"


def test_marker_digest_mismatch(exec_dir: Path) -> None:
    directory = attempt_path(exec_dir)
    save_response(directory, WITH_FINAL)
    with open(directory / "response.raw.txt", "a", encoding="utf-8") as fh:
        fh.write("tail written after the marker")
    assert not persist.response_complete(directory)
    client = CountingClient(verified(WITH_FINAL))
    record = run(exec_dir, FakeTools(), lambda endpoint: client)
    assert len(client.calls) == 1
    assert len(list((directory / "interrupted").glob("*/response.complete"))) == 1
    reruns = record["downstream_reruns"]
    assert isinstance(reruns, list) and reruns[0]["reason"] == "generation-interrupted"


def test_prompt_ids_mismatch_stops(exec_dir: Path) -> None:
    consumed = list(PROMPT_IDS)
    consumed[7] += 1
    tokens = token_identity.tokenizer().encode(WITH_FINAL, add_special_tokens=False).ids
    with FakeServer(completion(WITH_FINAL, token_ids=tokens, prompt_ids=consumed)) as server:
        env = {**ENV, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(token_identity.TokenIdentityError, match="index 7"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)
        assert server.requests[0][1] and server.requests[0][0]["prompt"] == PROMPT_IDS
    assert persist.response_complete(attempt_path(exec_dir)), "the response is kept, never discarded"
    assert not (attempt_path(exec_dir) / "manifest.json").exists()


def test_special_tokens_stripped_stops(exec_dir: Path) -> None:
    tokens = token_identity.tokenizer().encode(WITH_FINAL, add_special_tokens=False).ids
    stripped = token_identity.tokenizer().decode(tokens, skip_special_tokens=True)
    assert "<|channel|>" not in stripped
    with FakeServer(completion(stripped, token_ids=tokens, prompt_ids=PROMPT_IDS)) as server:
        env = {**ENV, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(token_identity.TokenIdentityError, match="stripped"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)


def test_token_ids_verified(exec_dir: Path) -> None:
    tokens = token_identity.tokenizer().encode(WITH_FINAL, add_special_tokens=False).ids
    with FakeServer(completion(WITH_FINAL, token_ids=tokens, prompt_ids=PROMPT_IDS)) as server:
        env = {**ENV, "TRIAL_ENDPOINT": server.endpoint}
        record = run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)
    assert record["token_identity"] == "verified"


def test_no_token_ids_field_is_qualified(exec_dir: Path) -> None:
    """Only with the operator's acknowledgement, which the manifest and the run-log line carry."""
    with FakeServer(completion(WITH_FINAL)) as server:
        env = {**ACCEPT, "TRIAL_ENDPOINT": server.endpoint}
        record = run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)
    assert record["token_identity"] == "unverified - count only"
    assert record["count_only_acknowledged"] is True
    assert "token_identity=unverified - count only" in run_attempt.summary_line(record)


def test_no_token_ids_without_acknowledgement_stops(exec_dir: Path) -> None:
    with FakeServer(completion(WITH_FINAL)) as server:
        env = {**ENV, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(token_identity.TokenIdentityError, match="TRIAL_ACCEPT_COUNT_ONLY=1"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)
    assert persist.response_complete(attempt_path(exec_dir)), "the response is kept"
    assert not (attempt_path(exec_dir) / "manifest.json").exists()


def test_token_ids_at_another_path_refused(exec_dir: Path) -> None:
    payload = completion(WITH_FINAL)
    payload["prompt_token_ids"] = PROMPT_IDS
    with FakeServer(payload) as server:
        env = {**ACCEPT, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(token_identity.TokenIdentityError, match=r"carries prompt_token_ids,"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)


def test_verified_attempt_records_no_acknowledgement(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    record = run(exec_dir, FakeTools(), refusing_factory)
    assert record["token_identity"] == "verified" and record["count_only_acknowledged"] is False


def test_no_token_ids_and_wrong_count_stops(exec_dir: Path) -> None:
    with FakeServer(completion(WITH_FINAL, prompt_tokens=len(PROMPT_IDS) - 1)) as server:
        env = {**ACCEPT, "TRIAL_ENDPOINT": server.endpoint}
        with pytest.raises(token_identity.TokenIdentityError, match="count"):
            run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), generation.HttpCompletionsClient, env)


def test_downstream_rerun_recorded(exec_dir: Path) -> None:
    save_response(attempt_path(exec_dir), WITH_FINAL)
    first = run(exec_dir, FakeTools(), refusing_factory)
    with pytest.raises(run_attempt.RerunReasonRequired):
        run(exec_dir, FakeTools(), refusing_factory)
    second = run(exec_dir, FakeTools(), refusing_factory, rerun_reason="emitter fix: example")
    assert second["raw_response_sha256"] == first["raw_response_sha256"]
    reruns = second["downstream_reruns"]
    assert isinstance(reruns, list) and [r["reason"] for r in reruns] == ["emitter fix: example"]
    previous = attempt_path(exec_dir) / str(reruns[0]["previous"])
    assert json.loads((previous / "manifest.json").read_text())["outcome"] == "page", "the earlier result is kept"


def test_generation_refuses_without_provenance(exec_dir: Path) -> None:
    client = CountingClient(verified(WITH_FINAL))
    env = {k: v for k, v in ENV.items() if k != "TRIAL_VLLM_IMAGE_DIGEST"}
    with pytest.raises(RuntimeError, match="TRIAL_VLLM_IMAGE_DIGEST"):
        run_attempt.run_attempt(exec_dir, BOARD, 1, FakeTools(), lambda e: client, env)
    assert client.calls == []


def test_unapproved_board_refused_before_generation(exec_dir: Path) -> None:
    tools = FakeTools()

    def refuse(board: str) -> dict[str, str]:
        raise RuntimeError("not approved")

    tools.board_info = refuse  # type: ignore[method-assign]
    with pytest.raises(RuntimeError, match="not approved"):
        run(exec_dir, tools, refusing_factory)


def test_fidelity_not_equal_refuses(tmp_path: Path) -> None:
    write_request_dir(tmp_path, equal=False)
    import board_request
    with pytest.raises(board_request.FidelityError):
        run(tmp_path, FakeTools(), refusing_factory)


def test_attempt_out_of_range_refused(exec_dir: Path) -> None:
    with pytest.raises(ValueError, match="attempt 4"):
        run(exec_dir, FakeTools(), refusing_factory, attempt=4)


def test_real_board_info_gate() -> None:
    from host_tools import RealHostTools
    info = RealHostTools().board_info("pultec-mid")
    assert len(info["approved_sheet_sha256"]) == 64 and info["model_module"] == "circuits/pultec/physical/mid.ts"
    with pytest.raises(RuntimeError, match="not a trial board"):
        RealHostTools().board_info("transistor-preamp-staged")


def kept_rejection(attempt_dir: Path, text: str) -> Path:
    persist.write_sent(attempt_dir, "req-1", 7)
    target = attempt_dir / persist.REJECTED / "stamp"
    target.mkdir(parents=True)
    path = target / "rejection.json"
    path.write_text(text, encoding="utf-8")
    return path


def test_non_int_rejection_status_is_refused_not_read_as_no_4xx(tmp_path: Path) -> None:
    path = kept_rejection(tmp_path, json.dumps({"request_id": "req-1", "status": "429"}))
    with pytest.raises(ValueError, match="rejection.json") as caught:
        persist.pending_rejection_status(tmp_path)
    assert str(path) in str(caught.value) and "'429'" in str(caught.value)


def test_unparseable_rejection_json_names_file_and_the_way_out(tmp_path: Path) -> None:
    path = kept_rejection(tmp_path, "{not json")
    with pytest.raises(ValueError, match="allow-regeneration") as caught:
        persist.pending_rejection_status(tmp_path)
    assert str(path) in str(caught.value) and "Inspect the file" in str(caught.value)


def test_non_object_rejection_json_is_refused_with_its_type(tmp_path: Path) -> None:
    path = kept_rejection(tmp_path, "[1, 2]")
    with pytest.raises(ValueError, match="list") as caught:
        persist.pending_rejection_status(tmp_path)
    assert str(path) in str(caught.value)
