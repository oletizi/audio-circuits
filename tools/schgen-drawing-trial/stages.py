"""The downstream stages of one attempt, and the classification of what they observed.

Every stage here is a function of files on disk in the attempt directory:
the saved response in, the stage's artifacts out. They re-run freely on the
same saved response (the spec's "Provenance and resumability"); generation,
the one stage that is not, lives in generation.py and run_attempt.py.

  extract   SchGen's get_final_python, in the container      extraction.json, program.py
  emit      emit.sh, in the container                         emitter.log, page.kicad_sch
  render    render.ts on the host                             page.pdf, page.svg, page.png
  netlist   kicad-cli sch export netlist on the host          page.net
  erc       kicad-cli sch erc on the host                     page.erc.rpt
  compare   compare.ts on the host                            compare.json

stages.json records each stage's status. classify() reads only these files.

**An outcome names the stage observed, not the cause.** It is the FIRST
abnormal stage in pipeline order; later stages still run where they can, so
a `no-final-channel` attempt's fallback program is still emitted and a page
may exist (`page_produced`). `program-raised` says the program raised while
it ran, not whose defect that was: the traceback and the active fixes are
kept, and cause is left to the diagnostics after the owner's verdict.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

from host_tools import HostTools, ToolRun
from persist import RAW, sha256_bytes, write_atomic, write_json_atomic

STAGES_FILE = "stages.json"
EXTRACTION = "extraction.json"
PROGRAM = "program.py"
EMITTER_LOG = "emitter.log"
SHEET = "page.kicad_sch"
PDF, SVG, PNG = "page.pdf", "page.svg", "page.png"
NETLIST = "page.net"
ERC = "page.erc.rpt"
COMPARE = "compare.json"
DOWNSTREAM_FILES = (STAGES_FILE, EXTRACTION, PROGRAM, EMITTER_LOG, SHEET, PDF, SVG, PNG, NETLIST, ERC, COMPARE)

OUTCOMES = (
    "page", "no-final-channel", "no-program", "program-raised", "limit-exceeded",
    "tooling-failed", "symbol-free-sheet", "blank-render",
)
PROGRAM_FRAME = 'File "/in/program.py"'
# run_emitter.py's inject_filename raises this, as SchGen's init_project.py does,
# when the program lacks SchGen's import line: the program cannot be run the way
# SchGen runs one, which is the program's stage, not the tooling's.
NO_IMPORT_LINE = "Cannot find import line"


@dataclass(frozen=True)
class Outcome:
    name: str
    failure_stage: str | None
    detail: str
    limit: str | None = None

    def to_json(self) -> dict[str, object]:
        return asdict(self)


def _record(attempt_dir: Path, stage: str, status: str, detail: str = "", **extra: object) -> None:
    path = attempt_dir / STAGES_FILE
    stages = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    stages[stage] = {"status": status, "detail": detail, **extra}
    write_json_atomic(path, stages)


def read_stages(attempt_dir: Path) -> dict[str, dict[str, object]]:
    path = attempt_dir / STAGES_FILE
    if not path.is_file():
        raise FileNotFoundError(f"{path} is missing: the downstream stages have not run on this attempt")
    stages: dict[str, dict[str, object]] = json.loads(path.read_text(encoding="utf-8"))
    return stages


def extract(attempt_dir: Path, tools: HostTools) -> None:
    try:
        result = tools.extract(attempt_dir / RAW)
    except Exception as err:  # the container itself failing is a tooling observation, kept as text
        _record(attempt_dir, "extraction", "failed", f"{type(err).__name__}: {err}")
        return
    program = str(result["program"])
    write_atomic(attempt_dir / PROGRAM, program.encode("utf-8"))
    write_json_atomic(attempt_dir / EXTRACTION, {
        "final_channel": result["final_channel"],
        "program_chars": len(program),
        "program_sha256": sha256_bytes(program.encode("utf-8")),
    })
    _record(attempt_dir, "extraction", "ok")


def emit(attempt_dir: Path, tools: HostTools) -> None:
    program = attempt_dir / PROGRAM
    if not program.is_file() or not program.read_text(encoding="utf-8").strip():
        _record(attempt_dir, "emitter", "not-run", "no program was extracted")
        return
    code = tools.emit(program, attempt_dir)
    _record(attempt_dir, "emitter", "ok" if code == 0 else "failed", f"emit.sh exited {code}", exit_code=code)


def _tool_stage(attempt_dir: Path, stage: str, run: ToolRun) -> None:
    _record(attempt_dir, stage, "ok" if run.exit_code == 0 else "failed", run.detail, exit_code=run.exit_code)


def render_and_check(attempt_dir: Path, board: str, tools: HostTools) -> None:
    sheet = attempt_dir / SHEET
    if not sheet.is_file():
        for stage in ("render", "netlist", "erc", "compare"):
            _record(attempt_dir, stage, "not-run", "no sheet was emitted")
        return
    _tool_stage(attempt_dir, "render", tools.render(sheet, attempt_dir))
    _tool_stage(attempt_dir, "netlist", tools.netlist(sheet, attempt_dir / NETLIST))
    _tool_stage(attempt_dir, "erc", tools.erc(sheet, attempt_dir / ERC))
    if (attempt_dir / NETLIST).is_file() and read_stages(attempt_dir)["netlist"]["status"] == "ok":
        _tool_stage(attempt_dir, "compare", tools.compare(board, attempt_dir / NETLIST, attempt_dir / COMPARE))
    else:
        _record(attempt_dir, "compare", "not-run", "no netlist was exported")


def stray_render_outputs(attempt_dir: Path) -> list[Path]:
    """Files kicad-cli or renderSheet left under other names: an SVG not named page.svg (on the
    nil-UUID class kicad-cli writes Schematic.svg), and renderSheet's crops/ when the render stopped."""
    stray = [p for p in attempt_dir.glob("*.svg") if p.name != SVG]
    if (attempt_dir / "crops").exists():
        stray.append(attempt_dir / "crops")
    return sorted(stray)


def run_downstream(attempt_dir: Path, board: str, tools: HostTools) -> None:
    extract(attempt_dir, tools)
    emit(attempt_dir, tools)
    render_and_check(attempt_dir, board, tools)


# --- reading what the stages left ---

def symbol_instances(sheet_text: str) -> int:
    """Placed symbols: each carries a (lib_id ...); library definitions under (lib_symbols) do not."""
    return len(re.findall(r"\(lib_id\s", sheet_text))


def netlist_components(netlist_text: str) -> int:
    return len(re.findall(r"\(comp\s", netlist_text))


def svg_strings(svg_text: str) -> set[str]:
    """Every string KiCad wrote into the SVG as text: the hidden <text> overlay and the stroked <desc>."""
    return set(re.findall(r"<(?:text|desc)\b[^>]*>([^<]*)</(?:text|desc)>", svg_text))


def sheet_references(sheet_text: str) -> list[str]:
    """The Reference property of each placed symbol, power symbols (#...) excluded."""
    refs = re.findall(r'\(property\s+"?Reference"?\s+"([^"]*)"', sheet_text)
    return [r for r in refs if r and not r.startswith("#")]


def emitter_fixes(attempt_dir: Path) -> list[str] | None:
    log = attempt_dir / EMITTER_LOG
    if not log.is_file():
        return None
    first = log.read_text(encoding="utf-8", errors="replace").split("\n", 1)[0]
    try:
        fixes = json.loads(first).get("fixes_applied")
    except (json.JSONDecodeError, AttributeError):
        return None
    return list(fixes) if isinstance(fixes, list) else None


def _emitter_outcome(attempt_dir: Path, stage: dict[str, object]) -> Outcome:
    log_path = attempt_dir / EMITTER_LOG
    log = log_path.read_text(encoding="utf-8", errors="replace") if log_path.is_file() else ""
    lines = [line for line in log.splitlines() if line.strip()]
    if lines and lines[-1].startswith("LIMIT: "):
        limit = lines[-1][len("LIMIT: "):].strip()
        return Outcome("limit-exceeded", "emitter", f"emit.sh stopped the program at its {limit} limit", limit)
    code = stage.get("exit_code")
    # Details state what emitter.log shows and nothing about whose defect it was: the brief
    # leaves cause to the diagnostics after the owner's verdict.
    if emitter_fixes(attempt_dir) is None:
        return Outcome("tooling-failed", "emitter", f"emit.sh exited {code}; emitter.log has no fixes line 1")
    reported = [line for line in lines if line.startswith("emit.sh:") or "EmitterSetupError" in line]
    if reported:
        return Outcome("tooling-failed", "emitter", f"emit.sh exited {code}; emitter.log reports: {reported[0]}")
    if PROGRAM_FRAME in log or NO_IMPORT_LINE in log:
        return Outcome("program-raised", "emitter", f"emit.sh exited {code}; the traceback is in {EMITTER_LOG}")
    return Outcome("tooling-failed", "emitter",
                   f"emit.sh exited {code}; no frame of /in/program.py appears in {EMITTER_LOG}")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""


def blank_reason(attempt_dir: Path) -> str | None:
    """Why a sheet with symbols rendered or exported empty, or None when it did not."""
    sheet = _read(attempt_dir / SHEET)
    # An empty netlist counts only when the export succeeded: a failed export is a tooling
    # observation, and must never turn a rendered page into a card.
    netlist_ok = read_stages(attempt_dir).get("netlist", {}).get("status") == "ok"
    if netlist_ok and netlist_components(_read(attempt_dir / NETLIST)) == 0:
        return f"the sheet places {symbol_instances(sheet)} symbols and its exported netlist lists no component"
    refs = sheet_references(sheet)
    # Only an SVG kicad-cli actually wrote counts: a missing page.svg or a failed render is not a
    # page with nothing on it, and must never withhold a PNG.
    render_ok = read_stages(attempt_dir).get("render", {}).get("status") == "ok"
    if render_ok and (attempt_dir / SVG).is_file() and refs and not set(refs) & svg_strings(_read(attempt_dir / SVG)):
        return f"the sheet places {symbol_instances(sheet)} symbols and the SVG shows none of their references"
    return None


def classify(attempt_dir: Path) -> Outcome:
    """The first abnormal stage observed, from the files the stages left; `page` when none was."""
    stages = read_stages(attempt_dir)
    if stages["extraction"]["status"] != "ok":
        return Outcome("tooling-failed", "extraction", str(stages["extraction"]["detail"]))
    extraction = json.loads((attempt_dir / EXTRACTION).read_text(encoding="utf-8"))
    if not extraction["final_channel"]:
        return Outcome("no-final-channel", "extraction",
                       "no final channel; get_final_python fell back to the whole response, which was still emitted")
    if not _read(attempt_dir / PROGRAM).strip():
        return Outcome("no-program", "extraction", "get_final_python returned an empty program")
    emitter = stages["emitter"]
    if emitter["status"] != "ok":
        return _emitter_outcome(attempt_dir, emitter)
    if not (attempt_dir / SHEET).is_file():
        return Outcome("tooling-failed", "emitter", "emit.sh exited 0 and left no page.kicad_sch")
    if symbol_instances(_read(attempt_dir / SHEET)) == 0:
        return Outcome("symbol-free-sheet", "emitter", "the sheet is valid but places no symbol")
    # Checked before the render's own status: on the nil-UUID class kicad-cli exports an empty
    # netlist with exit 0, and its SVG export names the file after a sheet it could not resolve
    # ("Schematic.svg"), which render.ts reports as a failure. The empty export is the observation.
    if stages["netlist"]["status"] == "ok" and netlist_components(_read(attempt_dir / NETLIST)) == 0:
        return Outcome("blank-render", "netlist", blank_reason(attempt_dir) or "the exported netlist is empty")
    for stage in ("render", "netlist"):
        if stages[stage]["status"] != "ok":
            return Outcome("tooling-failed", stage, str(stages[stage]["detail"]))
    reason = blank_reason(attempt_dir)
    if reason is not None:
        return Outcome("blank-render", "render", reason)
    for stage in ("erc", "compare"):
        if stages[stage]["status"] != "ok":
            return Outcome("tooling-failed", stage, str(stages[stage]["detail"]))
    return Outcome("page", None, "")


def page_produced(attempt_dir: Path) -> bool:
    """A rendered PNG of a sheet that places symbols and does not render or export empty."""
    png = attempt_dir / PNG
    sheet = _read(attempt_dir / SHEET)
    if not png.is_file() or png.stat().st_size == 0 or symbol_instances(sheet) == 0:
        return False
    return blank_reason(attempt_dir) is None
