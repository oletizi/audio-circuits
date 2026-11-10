"""Emitter outcomes, read from emitter.log the way emit.sh and run_emitter.py write it.

The logs are synthetic (test code), in the shape test_emitter.py observes from
the real container: line 1 is the fixes JSON, a failure prints the original
traceback, and a limit ends with `LIMIT: <name>`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

import run_attempt
from trial_fakes import BOARD, ENV, FIXES_LINE, WITH_FINAL, FakeTools, refusing_factory, save_response, \
    write_request_dir

PROGRAM_TRACEBACK = (
    "Traceback (most recent call last):\n"
    '  File "/trial/fixes/run_emitter.py", line 240, in main\n'
    '  File "/in/program.py", line 9, in <module>\n'
    "ZeroDivisionError: division by zero\n"
)

CASES = {
    "limit": (FIXES_LINE + "\nTraceback ...\nLIMIT: memory\n", 137, "limit-exceeded", "memory", "memory"),
    "program-frame": (FIXES_LINE + "\n" + PROGRAM_TRACEBACK, 1, "program-raised", None, "traceback"),
    "no-import-line": (FIXES_LINE + "\nRuntimeError: Cannot find import line: from modules...\n", 1,
                       "program-raised", None, "traceback"),
    "no-fixes-line": ("docker: Error response from daemon\n", 125, "tooling-failed", None, "no fixes line"),
    "setup-error": (FIXES_LINE + "\nEmitterSetupError: PROJECT_PATH is not set\n", 1, "tooling-failed", None,
                    "reports: EmitterSetupError: PROJECT_PATH is not set"),
    "emit-sh-line": (FIXES_LINE + "\nemit.sh: the log stream ended without the container's exit status\n", 1,
                     "tooling-failed", None, "reports: emit.sh: the log stream ended"),
    "no-program-frame": (FIXES_LINE + "\nTraceback (most recent call last):\nKeyError: 'x'\n", 1,
                         "tooling-failed", None, "no frame of /in/program.py appears"),
}
CAUSE_WORDS = ("harness", "not the program", "defect", "fault", "because")


@pytest.mark.parametrize("case", sorted(CASES))
def test_emitter_outcome(case: str, tmp_path: Path) -> None:
    log, code, outcome, limit, detail = CASES[case]
    write_request_dir(tmp_path)
    save_response(tmp_path / BOARD / "attempt-1", WITH_FINAL)
    tools = FakeTools(emit_log=log, emit_code=code)
    record = run_attempt.run_attempt(tmp_path, BOARD, 1, tools, refusing_factory, ENV)  # type: ignore[arg-type]
    assert (record["outcome"], record["limit"], record["failure_stage"]) == (outcome, limit, "emitter")
    text = str(record["outcome_detail"])
    assert detail in text, text
    assert not [w for w in CAUSE_WORDS if w in text], "a detail names what was observed, never a cause"
    assert record["page_produced"] is False
    stage_status = record["stage_status"]
    assert isinstance(stage_status, dict) and stage_status["render"] == "not-run"
