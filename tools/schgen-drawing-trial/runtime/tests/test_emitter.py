"""Host-side tests for emit.sh and the schgen-runtime image.

These drive `emit.sh` and `docker` from the host venv
(tools/schgen-drawing-trial/.venv), so they need the image built first:

    bash tools/schgen-drawing-trial/runtime/build.sh
    tools/schgen-drawing-trial/.venv/bin/python -m pytest -q \
        tools/schgen-drawing-trial/runtime/tests/test_emitter.py

Each hostile program carries SchGen's import line, so it gets past the same
set_schematic_filename injection a model-written program does and is executed
by run_emitter.py exactly as one would be.
"""

import hashlib
import json
import os
import subprocess
from pathlib import Path

import pytest

RUNTIME = Path(__file__).resolve().parents[1]
EMIT = RUNTIME / "emit.sh"
IMAGE = "schgen-runtime:0707520c"
IMU_EXAMPLE = "/schgen/schematic_generation/sch_examples/imu_L1.py"
EXPECTED_FIXES = ["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]

HEADER = (
    "import os\n"
    "import sys\n"
    "PROJECT_PATH = os.environ['PROJECT_PATH']\n"
    "sys.path.append(PROJECT_PATH)\n"
    "from modules.kicad_sch_interface import *\n"
)

HOSTILE = {
    "runaway": HEADER + "while True:\n    pass\n",
    "flood": HEADER
    + "chunk = b'x' * (1024 * 1024)\n"
    + "n = 0\n"
    + "while True:\n"
    + "    with open(f'/out/flood-{n}.bin', 'wb') as fh:\n"
    + "        fh.write(chunk)\n"
    + "    n += 1\n",
    "chatter": HEADER
    + "line = 'x' * 4096\n"
    + "while True:\n"
    + "    print(line)\n",
    "memory": HEADER
    + "hog = []\n"
    + "while True:\n"
    + "    hog.append(b'x' * (100 * 1000 * 1000))\n",
    "network": HEADER
    + "import socket\n"
    + "socket.create_connection(('1.1.1.1', 53), timeout=5)\n",
    "pids": HEADER
    + "import time\n"
    + "while True:\n"
    + "    if os.fork() == 0:\n"
    + "        time.sleep(600)\n"
    + "        os._exit(0)\n",
}


def emit(program: Path, out_dir: Path, wall_seconds: int | None = None) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    if wall_seconds is not None:
        env["SCHGEN_EMIT_WALL_SECONDS"] = str(wall_seconds)
    return subprocess.run(
        ["bash", str(EMIT), str(program), str(out_dir)],
        env=env,
        capture_output=True,
        text=True,
        timeout=420,
    )


def log_lines(out_dir: Path) -> list[str]:
    return (out_dir / "emitter.log").read_text(encoding="utf-8").splitlines()


def leftover_containers() -> str:
    res = subprocess.run(
        ["docker", "ps", "-a", "--filter", "name=schgen-emit-", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
        check=True,
    )
    return res.stdout.strip()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.fixture(scope="module")
def hostile_runs(tmp_path_factory) -> dict:
    """Run each hostile program once; several tests read the same run."""
    runs = {}
    for name, source in HOSTILE.items():
        work = tmp_path_factory.mktemp(name)
        program = work / "program.py"
        program.write_text(source, encoding="utf-8")
        out_dir = work / "out"
        wall = 10 if name == "runaway" else None
        res = emit(program, out_dir, wall_seconds=wall)
        runs[name] = {
            "res": res,
            "out_dir": out_dir,
            "lines": log_lines(out_dir),
            "leftover": leftover_containers(),
        }
    return runs


@pytest.fixture(scope="module")
def imu_program(tmp_path_factory) -> Path:
    """SchGen's own example program, read out of the image as bytes.

    It is third-party code, so it is copied out with `cat` and never run on
    the host.
    """
    res = subprocess.run(
        ["docker", "run", "--rm", "--network", "none", IMAGE, "cat", IMU_EXAMPLE],
        capture_output=True,
        check=True,
    )
    program = tmp_path_factory.mktemp("imu") / "imu_L1.py"
    program.write_bytes(res.stdout)
    return program


def test_imu_example_draws(imu_program, tmp_path):
    out_dir = tmp_path / "out"
    res = emit(imu_program, out_dir)
    assert res.returncode == 0, (res.stdout, res.stderr, (out_dir / "emitter.log").read_text())
    sheet = (out_dir / "page.kicad_sch").read_text(encoding="utf-8")
    assert "(symbol (lib_id" in " ".join(sheet.split())
    assert json.loads(log_lines(out_dir)[0]) == {"fixes_applied": EXPECTED_FIXES}
    assert leftover_containers() == ""


def test_pin_fix_is_injected_not_written(imu_program, tmp_path):
    before = sha256(imu_program)
    res = emit(imu_program, tmp_path / "out")
    assert res.returncode == 0, res.stderr
    assert sha256(imu_program) == before


def test_runaway_program_is_stopped(hostile_runs):
    run = hostile_runs["runaway"]
    assert run["res"].returncode != 0
    assert run["lines"][-1] == "LIMIT: wall-time"
    assert run["leftover"] == ""


def test_output_flood_is_stopped(hostile_runs):
    run = hostile_runs["flood"]
    assert run["res"].returncode != 0
    assert run["lines"][-1] == "LIMIT: output-bytes"
    assert run["leftover"] == ""
    assert sorted(p.name for p in run["out_dir"].iterdir()) == ["emitter.log"]


def test_stdout_flood_is_capped(hostile_runs):
    """The log is the one host file a program's output reaches, so it is
    capped too: a program that prints forever is stopped as output-bytes and
    the log stays near the cap rather than growing until the wall limit."""
    run = hostile_runs["chatter"]
    assert run["res"].returncode != 0
    assert run["lines"][-1] == "LIMIT: output-bytes"
    assert run["leftover"] == ""
    assert (run["out_dir"] / "emitter.log").stat().st_size < 9 * 1024 * 1024
    assert sorted(p.name for p in run["out_dir"].iterdir()) == ["emitter.log"]


def test_memory_hog_is_stopped(hostile_runs):
    run = hostile_runs["memory"]
    assert run["res"].returncode != 0
    assert run["lines"][-1] == "LIMIT: memory"
    assert run["leftover"] == ""


def test_fork_bomb_is_stopped(hostile_runs):
    run = hostile_runs["pids"]
    assert run["res"].returncode != 0
    assert run["lines"][-1] == "LIMIT: pids"
    assert run["leftover"] == ""


def test_no_network(hostile_runs):
    run = hostile_runs["network"]
    assert run["res"].returncode != 0
    text = "\n".join(run["lines"])
    assert "Traceback (most recent call last)" in text
    assert "OSError" in text
    assert run["leftover"] == ""


@pytest.mark.parametrize("name", sorted(HOSTILE))
def test_failure_keeps_fixes_line(hostile_runs, name):
    assert json.loads(hostile_runs[name]["lines"][0]) == {"fixes_applied": EXPECTED_FIXES}
