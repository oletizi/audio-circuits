"""Run one SchGen generated-program inside the schgen-runtime container.

    python /trial/fixes/run_emitter.py PROGRAM.py SHEET.kicad_sch

This is SchGen's init_project.py main path, as the 2026-10-29 trial's
docs/research/2026-10-29-trial-microsoft-schgen/scripts/run_like_init_project.py
reproduced it, with four named fixes (see fixes_applied()):

  component_repository
      modules/component_repository.json, which SchGen does not ship and does
      not generate, was built into the image by build_repo.py from KiCad
      10.0.5's symbol libraries. Checked for here, not built here.
  root_uuid
      The blank sheet gets a real root UUID instead of the nil
      "00000000-0000-0000-0000-000000000000" init_project.make_kicad_sch()
      hardcodes; KiCad 10.0.5 resolves no symbol instance against a nil sheet
      path and plots an empty frame with exit code 0.
  skip_get_fp
      init_project's closing get_fp() footprint step is not called: it needs
      export/organized_fp.json, which SchGen does not ship and whose generator
      raises NameError. Footprints do not affect the drawing.
  pin_extraction
      modules.utils.kicad_add_symbol.extract_pins_from_symbol is replaced, in
      memory and before the program runs, by the all-children scan from
      docs/research/2026-10-29-trial-microsoft-schgen/pultec_low_boost.schgen.py.
      Stock SchGen only reads a unit sub-symbol whose first child is a pin, so
      it cannot address the pins of e.g. Connector_Generic:Conn_01x05.

Two departures from init_project.py's mechanics, both so the program file is
never written and the program stays inside this one process tree:

  - set_schematic_filename(...) is injected after SchGen's import line in an
    in-memory copy of the program; init_project writes it back into the file.
  - The program is exec'd in this process rather than in a subprocess, with
    cwd and PROJECT_PATH as init_project's run_py gives it.

The log protocol emit.sh relies on, all on stdout:
  - line 1 is {"fixes_applied": [...]} as JSON, on success and failure alike;
  - a failure prints the original traceback, and for a limit a final line
    `LIMIT: output-bytes` (ENOSPC on a tmpfs) or `LIMIT: pids` (the cgroup's
    pids.max was hit); `wall-time` and `memory` are written by emit.sh, since
    this process does not survive them;
  - a success prints READY_MARKER and then holds the container open until
    emit.sh has copied the sheet out and sends SIGUSR1.
"""

import errno
import json
import os
import signal
import sys
import traceback
import uuid
from pathlib import Path

PROJECT_PATH = os.environ.get("PROJECT_PATH")
READY_MARKER = "SCHGEN-EMIT: sheet written, holding for copy"
RELEASE_TIMEOUT_SECONDS = 120
PIDS_EVENTS = Path("/sys/fs/cgroup/pids.events")
IMPORT_LINE = "from modules.kicad_sch_interface import *"

TEMPLATE = """(kicad_sch
    (version 20231120)
    (generator "eeschema")
    (generator_version "8.0")
    (uuid "{u}")
    (paper "A4")
    (lib_symbols)
    (sheet_instances
        (path "/"
            (page "1")
        )
    )
    (symbol_instances)
)
"""


class EmitterSetupError(RuntimeError):
    """The image or the invocation is not what this runner was built for."""


def project_path() -> Path:
    if not PROJECT_PATH:
        raise EmitterSetupError(
            "PROJECT_PATH is not set: SchGen's config.py and kicad_sch_interface.py "
            "read it at import time, and the image sets it to the SchGen checkout"
        )
    return Path(PROJECT_PATH)


def fixes_applied() -> list[str]:
    repo = project_path() / "modules" / "component_repository.json"
    if not repo.is_file():
        raise EmitterSetupError(
            f"{repo} is missing: the image build runs build_repo.py against the "
            "KiCad 10.0.5 symbol libraries to make it, and SchGen cannot place a "
            "symbol without it - rebuild with build.sh"
        )
    return ["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]


def write_blank_sheet(sheet: Path) -> None:
    sheet.write_text(TEMPLATE.format(u=str(uuid.uuid4())), encoding="utf-8")


def inject_filename(code_text: str, sheet: Path) -> str:
    insert_line = f'set_schematic_filename(r"{sheet}")'
    if insert_line in code_text:
        return code_text
    if IMPORT_LINE not in code_text:
        raise RuntimeError(f"Cannot find import line: {IMPORT_LINE}")
    return code_text.replace(IMPORT_LINE, f"{IMPORT_LINE}\n{insert_line}", 1)


def patch_pin_extraction() -> None:
    import modules.utils.kicad_add_symbol as _kas

    if not hasattr(_kas, "extract_pins_from_symbol") or not hasattr(_kas, "generate_uuid"):
        raise EmitterSetupError(
            "modules.utils.kicad_add_symbol no longer defines extract_pins_from_symbol "
            "and generate_uuid: the pin_extraction fix replaces the first and calls "
            "the second, so this SchGen is not the pinned commit"
        )

    def _extract_pins_all_children(symbol_sexp):
        """SchGen's extract_pins_from_symbol, with its `item[2][0] == 'pin'`
        guard replaced by a scan of every child of every unit sub-symbol."""
        pins = []
        for item in symbol_sexp:
            if isinstance(item, list) and len(item) > 2 and item[0] == 'symbol':
                for pin_info in item[2:]:
                    if (isinstance(pin_info, list) and len(pin_info) > 1
                            and pin_info[0] == 'pin'):
                        for p_item in pin_info:
                            if (isinstance(p_item, list) and len(p_item) > 1
                                    and p_item[0] == 'number'):
                                pins.append(['pin', p_item[1],
                                             ['uuid', _kas.generate_uuid()]])
                                break
        return pins

    _kas.extract_pins_from_symbol = _extract_pins_all_children


def run_program(program: Path, sheet: Path) -> None:
    code_text = inject_filename(program.read_text(encoding="utf-8"), sheet)
    code = compile(code_text, str(program), "exec")
    os.chdir(project_path())
    sys.argv = [str(program)]
    namespace = {"__name__": "__main__", "__file__": str(program), "__builtins__": __builtins__}
    try:
        exec(code, namespace)
    except SystemExit as stop:
        if stop.code not in (None, 0):
            raise


def chain(exc: BaseException):
    seen = set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        yield exc
        exc = exc.__cause__ or exc.__context__


def pids_limit_hit() -> bool:
    if not PIDS_EVENTS.is_file():
        return False
    for line in PIDS_EVENTS.read_text().splitlines():
        key, _, value = line.partition(" ")
        if key == "max" and int(value) > 0:
            return True
    return False


def limit_name(exc: BaseException) -> str | None:
    if any(isinstance(e, OSError) and e.errno == errno.ENOSPC for e in chain(exc)):
        return "output-bytes"
    if pids_limit_hit():
        return "pids"
    return None


def hold_for_copy() -> None:
    print(READY_MARKER, flush=True)
    received = signal.sigtimedwait({signal.SIGUSR1}, RELEASE_TIMEOUT_SECONDS)
    if received is None:
        raise RuntimeError(
            f"emit.sh never sent SIGUSR1 within {RELEASE_TIMEOUT_SECONDS} s of "
            f"'{READY_MARKER}': the sheet may not have been copied out, so this "
            "is reported as a failure rather than a success"
        )


def main(argv: list[str]) -> int:
    sys.stderr = sys.stdout
    print(json.dumps({"fixes_applied": fixes_applied()}), flush=True)
    if len(argv) != 3:
        raise EmitterSetupError("usage: run_emitter.py PROGRAM.py SHEET.kicad_sch")
    program, sheet = Path(argv[1]), Path(argv[2])
    signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGUSR1})
    sys.path.insert(0, str(project_path()))
    write_blank_sheet(sheet)
    try:
        patch_pin_extraction()
        run_program(program, sheet)
    except BaseException as exc:
        traceback.print_exc(file=sys.stdout)
        name = limit_name(exc)
        if name is not None:
            print(f"LIMIT: {name}", flush=True)
        return 1
    print(f"Schematic file: {sheet}", flush=True)
    hold_for_copy()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
