"""Test doubles for the attempt runner. Test code only: synthetic responses, fake servers, stand-in tools.

FakeTools stands in for RealHostTools. Where a test is about what the real
tool observes - SchGen's fallback extraction, kicad-cli's export of a
nil-UUID or symbol-free sheet - it delegates that one method to
RealHostTools, so the observation is the real tool's.
"""

from __future__ import annotations

import json
import shutil
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from board_request import ids_sha256
from host_tools import RealHostTools, ToolRun
from persist import persist_response
from token_identity import tokenizer

REPO = Path(__file__).resolve().parents[3]
TRIAL_2026_10_29 = REPO / "docs" / "research" / "2026-10-29-trial-microsoft-schgen"
SCHGEN_SHEET = TRIAL_2026_10_29 / "pultec-low-boost-schgen.kicad_sch"
SCHGEN_SHEET_ROOT_UUID = "bbe1962d-3ce7-4d22-b445-c43cc9d46a74"
NIL_UUID = "00000000-0000-0000-0000-000000000000"
BOARD = "pultec-low-boost"
FIXES_LINE = json.dumps({"fixes_applied": ["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]})
# "<|start|>system<|message|>You are SchGen.<|end|><|start|>user<|message|>Draw R1.<|end|><|start|>assistant"
PROMPT_IDS = [200006, 17360, 200008, 3575, 553, 2672, 11757, 13, 200007, 200006, 1428, 200008, 10501, 460, 16, 13,
              200007, 200006, 173781]
ENV = {
    "TRIAL_ENDPOINT": "http://fake.invalid",
    "TRIAL_MERGED_MANIFEST_SHA256": "a" * 64,
    "TRIAL_VLLM_VERSION": "0.32.0",
    "TRIAL_VLLM_IMAGE_DIGEST": "sha256:" + "b" * 64,
}
WITH_FINAL = ("<|channel|>analysis<|message|>plan<|end|><|start|>assistant<|channel|>final<|message|>"
              "```python\nfrom modules.kicad_sch_interface import *\nx = 1\n```<|return|>")
NO_FINAL = "<|channel|>analysis<|message|>still thinking when max_tokens ran out"


def nil_uuid_sheet(dest: Path) -> Path:
    """The 2026-10-29 trial's emitted sheet with its root UUID put back to SchGen's nil UUID."""
    text = SCHGEN_SHEET.read_text(encoding="utf-8")
    assert text.count(SCHGEN_SHEET_ROOT_UUID) > 1, "the fixture must carry the root UUID in its instance paths"
    dest.write_text(text.replace(SCHGEN_SHEET_ROOT_UUID, NIL_UUID), encoding="utf-8")
    return dest


def symbol_free_sheet(dest: Path) -> Path:
    """run_emitter.py's blank sheet, with a real root UUID: well-formed, and placing nothing."""
    dest.write_text(
        f'(kicad_sch\n    (version 20231120)\n    (generator "eeschema")\n    (generator_version "8.0")\n'
        f'    (uuid "{uuid.uuid4()}")\n    (paper "A4")\n    (lib_symbols)\n'
        '    (sheet_instances\n        (path "/"\n            (page "1")\n        )\n    )\n'
        '    (symbol_instances)\n)\n', encoding="utf-8")
    return dest


def write_request_dir(exec_dir: Path, board: str = BOARD, equal: bool = True) -> Path:
    directory = exec_dir / board / "request"
    directory.mkdir(parents=True)
    (directory / "request.json").write_text(json.dumps({"board": board, "text": "PARTS:\n", "symbols": []}))
    (directory / "request.txt").write_text("PARTS:\n")
    (directory / "fidelity.json").write_text(json.dumps({
        "board": board, "equal": equal, "ours": 19, "theirs": 19, "first_diff": None if equal else 3,
        "ours_ids_sha256": ids_sha256(PROMPT_IDS), "rendered_date": "2026-11-10"}))
    (directory / "prompt.json").write_text(json.dumps({
        "board": board, "ids": PROMPT_IDS, "text": "synthetic", "token_count": len(PROMPT_IDS),
        "template_sha256": "c" * 64, "tokenizer_files_sha256": {"tokenizer.json": "d" * 64},
        "user_message_template_sha256": "e" * 64, "rendered_date": "2026-11-10",
    }))
    return directory


def completion(text: str, finish_reason: str = "stop", token_ids: list[int] | None = None,
               prompt_ids: list[int] | None = None, prompt_tokens: int | None = None) -> dict[str, object]:
    choice: dict[str, object] = {"index": 0, "text": text, "finish_reason": finish_reason}
    if token_ids is not None:
        choice["token_ids"] = token_ids
    if prompt_ids is not None:
        choice["prompt_token_ids"] = prompt_ids
    usage = {"prompt_tokens": len(PROMPT_IDS) if prompt_tokens is None else prompt_tokens, "completion_tokens": 40}
    return {"id": "cmpl-fake", "object": "text_completion", "model": "schgen-merged", "choices": [choice],
            "usage": usage}


def output_ids(text: str) -> list[int]:
    return tokenizer().encode(text, add_special_tokens=False).ids


def save_response(attempt_dir: Path, text: str, finish_reason: str = "stop", seed: int = 42) -> None:
    """A response as run_attempt would have persisted it, from a server returning matching token IDs."""
    attempt_dir.mkdir(parents=True, exist_ok=True)
    payload = completion(text, finish_reason, token_ids=output_ids(text), prompt_ids=PROMPT_IDS)
    persist_response(attempt_dir, text, {
        "request_id": "saved", "request": {"model": "schgen-merged", "seed": seed}, "latency_s": 1.0,
        "finish_reason": finish_reason, "usage": payload["usage"],
        "provenance": {"endpoint": ENV["TRIAL_ENDPOINT"], "merged_manifest_sha256": "a" * 64,
                       "vllm_version": "0.32.0", "vllm_image_digest": "sha256:" + "b" * 64},
        "body": payload,
    })


class CountingClient:
    """Answers every post with `payload` (as JSON) or with `raw` bytes, and counts the posts."""

    def __init__(self, payload: dict[str, object] | None = None, status: int = 200, raw: bytes | None = None,
                 attempt_dir: Path | None = None) -> None:
        self.raw = raw if raw is not None else json.dumps(payload).encode("utf-8")
        self.status = status
        self.attempt_dir = attempt_dir
        self.calls: list[tuple[dict[str, object], str]] = []
        self.sent_at_post: list[dict[str, object]] = []

    def post(self, body: dict[str, object], request_id: str) -> tuple[int, bytes]:
        self.calls.append((body, request_id))
        if self.attempt_dir is not None:
            self.sent_at_post.append(json.loads((self.attempt_dir / "request.sent").read_text()))
        return self.status, self.raw


def verified(text: str, finish_reason: str = "stop") -> dict[str, object]:
    return completion(text, finish_reason, token_ids=output_ids(text), prompt_ids=PROMPT_IDS)


class RefusingClient:
    def post(self, body: dict[str, object], request_id: str) -> tuple[int, bytes]:
        raise AssertionError("a generation request was made for an attempt that must not be regenerated")


def refusing_factory(endpoint: str) -> RefusingClient:
    raise AssertionError(f"a client for {endpoint} was made for an attempt that must not be regenerated")


class FakeTools:
    """RealHostTools' interface, with the request and container steps stood in for unless asked for."""

    def __init__(self, sheet: Path | None = None, real_extract: bool = False, real_kicad: bool = False,
                 emit_log: str | None = None, emit_code: int = 0, netlist_code: int = 0,
                 render_svg: bool = True) -> None:
        self.sheet = sheet if sheet is not None else SCHGEN_SHEET
        self.real_extract = real_extract
        self.real_kicad = real_kicad
        self.emit_log = emit_log
        self.emit_code = emit_code
        self.netlist_code = netlist_code
        self.render_svg = render_svg
        self.extract_calls: list[Path] = []
        self.emitted: list[str] = []
        self.real = RealHostTools()

    def board_info(self, board: str) -> dict[str, str]:
        return {"approved_sheet_sha256": "f" * 64, "model_module": "circuits/pultec/physical/low-boost.ts"}

    def runtime_image_digest(self) -> str:
        return "sha256:" + "9" * 64

    def kicad_cli_version(self) -> str:
        return "10.0.5"

    def build_request(self, board: str, out_dir: Path) -> None:
        raise AssertionError("the request directory is prepared by the test")

    def render_prompt(self, request_dir: Path) -> None:
        raise AssertionError("the request directory is prepared by the test")

    def check_fidelity(self, request_dir: Path) -> None:
        raise AssertionError("the request directory is prepared by the test")

    def extract(self, raw: Path) -> dict[str, object]:
        self.extract_calls.append(raw)
        if self.real_extract:
            return self.real.extract(raw)
        text = raw.read_text(encoding="utf-8")
        marker = "<|channel|>final<|message|>"
        body = text.split(marker, 1)[1] if marker in text else text
        body = body.replace("<|return|>", "").replace("```python\n", "").replace("\n```", "").strip()
        return {"final_channel": marker in text, "program": body}

    def emit(self, program: Path, out_dir: Path) -> int:
        self.emitted.append(program.read_text(encoding="utf-8"))
        (out_dir / "emitter.log").write_text(self.emit_log if self.emit_log is not None else FIXES_LINE + "\n")
        if self.emit_code == 0:
            shutil.copyfile(self.sheet, out_dir / "page.kicad_sch")
        return self.emit_code

    def render(self, sheet: Path, out_dir: Path) -> ToolRun:
        if self.real_kicad:
            return self.real.render(sheet, out_dir)
        refs = "".join(f"<desc>{r}</desc>" for r in ("R1", "C1", "J1"))
        for name, data in (("page.pdf", b"%PDF"), ("page.svg", f"<svg>{refs}</svg>".encode()), ("page.png", b"PNG")):
            if name != "page.svg" or self.render_svg:
                (out_dir / name).write_bytes(data)
        return ToolRun(0, "")

    def netlist(self, sheet: Path, out: Path) -> ToolRun:
        if self.real_kicad:
            return self.real.netlist(sheet, out)
        if self.netlist_code != 0:
            return ToolRun(self.netlist_code, "kicad-cli exited non-zero (stand-in)")
        out.write_text('(export (components (comp (ref "R1") (value "1k"))) (nets))\n')
        return ToolRun(0, "")

    def erc(self, sheet: Path, out: Path) -> ToolRun:
        if self.real_kicad:
            return self.real.erc(sheet, out)
        out.write_text("ERC report (synthetic)\n")
        return ToolRun(0, "")

    def compare(self, board: str, netlist: Path, out: Path) -> ToolRun:
        if self.real_kicad:
            return self.real.compare(board, netlist, out)
        out.write_text("{}\n")
        return ToolRun(0, "")


class FakeServer:
    """A /v1/completions server on localhost that answers every POST with one fixed payload."""

    def __init__(self, payload: dict[str, object], status: int = 200) -> None:
        self.payload = payload
        self.status = status
        self.requests: list[tuple[dict[str, object], str | None]] = []
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:  # noqa: N802 - http.server's name
                length = int(self.headers.get("Content-Length", "0"))
                outer.requests.append((json.loads(self.rfile.read(length)), self.headers.get("X-Request-Id")))
                data = json.dumps(outer.payload).encode("utf-8")
                self.send_response(outer.status if self.path == "/v1/completions" else 404)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args: object) -> None:
                return

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self) -> "FakeServer":
        self.thread.start()
        return self

    def __exit__(self, *exc: object) -> None:
        self.server.shutdown()
        self.server.server_close()

    @property
    def endpoint(self) -> str:
        return f"http://127.0.0.1:{self.server.server_address[1]}"
