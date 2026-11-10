"""The tools an attempt's stages call, behind one interface so tests can stand in for them.

RealHostTools is the only implementation outside test code. Each method runs
one committed CLI and returns what it produced, or raises naming what was
missing. Nothing is defaulted: an absent `bun`, `docker`, `kicad-cli` or
`magick` stops the stage loudly (`kicad.ts` and `render.ts` refuse their own
tools), and an image whose ID is not runtime/IMAGE_DIGEST is refused.

Untrusted code stays in the container: SchGen's get_final_python and the
model-written program run only inside schgen-runtime with --network none
(trial.extract and emit.sh). The sheet is data, so render, netlist export
and ERC run on the host's kicad-cli 10.0.5.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
RUNTIME = HERE / "runtime"
IMAGE = "schgen-runtime:0707520c"
EXTRACT_TIMEOUT_SECONDS = 300
# prompt and fidelity each tokenize one board's prompt on CPU; Task 4 measured
# the whole in-container prompt test file at under 20 s.
PROMPT_TIMEOUT_SECONDS = 600


class ToolMissingError(RuntimeError):
    """A tool the trial requires is absent or is not the pinned one."""


@dataclass(frozen=True)
class ToolRun:
    exit_code: int
    detail: str


class HostTools(Protocol):
    def board_info(self, board: str) -> dict[str, str]: ...
    def runtime_image_digest(self) -> str: ...
    def kicad_cli_version(self) -> str: ...
    def build_request(self, board: str, out_dir: Path) -> None: ...
    def render_prompt(self, request_dir: Path) -> None: ...
    def check_fidelity(self, request_dir: Path) -> None: ...
    def extract(self, raw: Path) -> dict[str, object]: ...
    def emit(self, program: Path, out_dir: Path) -> int: ...
    def render(self, sheet: Path, out_dir: Path) -> ToolRun: ...
    def netlist(self, sheet: Path, out: Path) -> ToolRun: ...
    def erc(self, sheet: Path, out: Path) -> ToolRun: ...
    def compare(self, board: str, netlist: Path, out: Path) -> ToolRun: ...


def require(tool: str) -> str:
    found = shutil.which(tool)
    if found is None:
        raise ToolMissingError(f"{tool} is not on PATH; the trial runner calls it and has no substitute for it")
    return found


def _run(argv: list[str], timeout: int) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, capture_output=True, text=True, timeout=timeout, cwd=REPO)


def _tail(run: subprocess.CompletedProcess[str]) -> str:
    return (run.stderr.strip() or run.stdout.strip())[-4000:]


class RealHostTools:
    def _bun(self, script: str, *args: str, timeout: int = 600) -> subprocess.CompletedProcess[str]:
        return _run([require("bun"), str(HERE / script), *args], timeout)

    def board_info(self, board: str) -> dict[str, str]:
        run = self._bun("board-info.ts", board)
        if run.returncode != 0:
            raise RuntimeError(f"board-info.ts refused {board}: {_tail(run)}")
        info = json.loads(run.stdout)
        return {"approved_sheet_sha256": str(info["approved_sheet_sha256"]), "model_module": str(info["model_module"])}

    def runtime_image_digest(self) -> str:
        pinned = (RUNTIME / "IMAGE_DIGEST").read_text(encoding="utf-8").strip()
        run = _run([require("docker"), "image", "inspect", IMAGE, "--format", "{{.Id}}"], 60)
        if run.returncode != 0:
            raise ToolMissingError(f"{IMAGE} is not built ({_tail(run)}); build it with runtime/build.sh")
        actual = run.stdout.strip()
        if actual != pinned:
            raise ToolMissingError(
                f"{IMAGE} has ID {actual}, but runtime/IMAGE_DIGEST records {pinned}. The record names the image "
                "the attempts ran in; rebuild with build.sh and commit its IMAGE_DIGEST, or restore the image"
            )
        return actual

    def kicad_cli_version(self) -> str:
        run = self._bun("kicad.ts", "version")
        if run.returncode != 0:
            raise ToolMissingError(f"kicad.ts refused the host kicad-cli: {_tail(run)}")
        return run.stdout.strip()

    def build_request(self, board: str, out_dir: Path) -> None:
        run = self._bun("request.ts", board, str(out_dir))
        if run.returncode != 0:
            raise RuntimeError(f"request.ts failed for {board}: {_tail(run)}")

    def _in_container_on_dir(self, module: str, request_dir: Path) -> None:
        self.runtime_image_digest()
        run = _run([
            require("docker"), "run", "--rm", "--network", "none", "--read-only", "--tmpfs", "/tmp:size=256m",
            "--mount", f"type=bind,source={request_dir.resolve()},target=/work",
            IMAGE, "python", "-m", module, "/work/request.json", "/work",
        ], PROMPT_TIMEOUT_SECONDS)
        if run.returncode != 0:
            raise RuntimeError(f"python -m {module} failed in {IMAGE}: {_tail(run)}")

    def render_prompt(self, request_dir: Path) -> None:
        self._in_container_on_dir("trial.prompt", request_dir)

    def check_fidelity(self, request_dir: Path) -> None:
        self._in_container_on_dir("trial.fidelity", request_dir)

    def extract(self, raw: Path) -> dict[str, object]:
        self.runtime_image_digest()
        run = _run([
            require("docker"), "run", "--rm", "--network", "none", "--read-only",
            "--cpus", "1", "--memory", "1g", "--memory-swap", "1g", "--pids-limit", "64",
            "--tmpfs", "/tmp:size=16m",
            "--mount", f"type=bind,source={raw.resolve()},target=/in/response.raw.txt,readonly",
            IMAGE, "python", "-m", "trial.extract", "/in/response.raw.txt",
        ], EXTRACT_TIMEOUT_SECONDS)
        if run.returncode != 0:
            raise RuntimeError(f"trial.extract failed in {IMAGE}: {_tail(run)}")
        result = json.loads(run.stdout)
        if not isinstance(result, dict) or not isinstance(result.get("final_channel"), bool) \
                or not isinstance(result.get("program"), str):
            raise RuntimeError(f"trial.extract printed {run.stdout[:500]!r}, not {{final_channel, program}}")
        return result

    def emit(self, program: Path, out_dir: Path) -> int:
        self.runtime_image_digest()
        # emit.sh enforces its own wall clock (300 s unless set); this is a ceiling over that.
        run = _run(["bash", str(RUNTIME / "emit.sh"), str(program), str(out_dir)], 900)
        return run.returncode

    def render(self, sheet: Path, out_dir: Path) -> ToolRun:
        run = self._bun("render.ts", str(sheet), str(out_dir))
        return ToolRun(run.returncode, _tail(run))

    def netlist(self, sheet: Path, out: Path) -> ToolRun:
        run = self._bun("kicad.ts", "netlist", str(sheet), str(out))
        return ToolRun(run.returncode, _tail(run))

    def erc(self, sheet: Path, out: Path) -> ToolRun:
        run = self._bun("kicad.ts", "erc", str(sheet), str(out))
        return ToolRun(run.returncode, _tail(run))

    def compare(self, board: str, netlist: Path, out: Path) -> ToolRun:
        run = self._bun("compare.ts", board, str(netlist), str(out))
        return ToolRun(run.returncode, _tail(run))
