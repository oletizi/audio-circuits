"""The per-board request directory: request, fidelity record and prompt, made once per board.

    <exec>/<board>/request/  request.txt  request.json  fidelity.json  prompt.json

Made once and reused by all three attempts (controller ruling 1): the chat
template embeds "Current date", so prompt.json is rendered once per board
and its IDs are what every attempt sends; re-rendering per attempt would
send three different prompts across a date change. Attempt directories do
not copy these files; each manifest records prompt_sha256 and this
directory's path.

Order (rulings 2 and 6): the approval gate first, then the request, then the
fidelity check, which must be equal before any prompt is rendered or any
generation is requested. Each step works in a scratch directory beside the
request directory and moves its files into place, so an interrupted step
leaves no half-written file where a later run would read it.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from host_tools import HostTools, RealHostTools
from persist import sha256_bytes, sha256_file, write_atomic

REQUEST_DIR = "request"
REQUEST_FILES = ("request.json", "request.txt")


class FidelityError(RuntimeError):
    """The trial's prompt IDs are not SchGen's for this board, so nothing may be generated."""


def request_dir(exec_dir: Path, board: str) -> Path:
    return exec_dir / board / REQUEST_DIR


def _scratch(target: Path, step: str) -> Path:
    scratch = target.parent / f".{target.name}.{step}.scratch"
    if scratch.exists():
        shutil.rmtree(scratch)  # a previous interrupted step's scratch, never read as a result
    scratch.mkdir(parents=True)
    return scratch


def _install(scratch: Path, target: Path, names: tuple[str, ...]) -> None:
    for name in names:
        source = scratch / name
        if not source.is_file():
            raise RuntimeError(f"{source} was not written; the step that makes it reported success without it")
        write_atomic(target / name, source.read_bytes())
    shutil.rmtree(scratch)


def _with_request(scratch: Path, target: Path) -> None:
    for name in REQUEST_FILES:
        shutil.copyfile(target / name, scratch / name)


def fidelity_equal(directory: Path) -> bool:
    record = json.loads((directory / "fidelity.json").read_text(encoding="utf-8"))
    return record.get("equal") is True


def prepare(exec_dir: Path, board: str, tools: HostTools) -> Path:
    """Make whatever of the board's request directory is missing; refuse unless fidelity is equal."""
    tools.board_info(board)
    target = request_dir(exec_dir, board)
    target.mkdir(parents=True, exist_ok=True)
    if not all((target / n).is_file() for n in REQUEST_FILES):
        scratch = _scratch(target, "request")
        tools.build_request(board, scratch)
        _install(scratch, target, REQUEST_FILES)
    if not (target / "fidelity.json").is_file():
        scratch = _scratch(target, "fidelity")
        _with_request(scratch, target)
        try:
            tools.check_fidelity(scratch)
        finally:
            if (scratch / "fidelity.json").is_file():
                write_atomic(target / "fidelity.json", (scratch / "fidelity.json").read_bytes())
            shutil.rmtree(scratch)
    if not fidelity_equal(target):
        raise FidelityError(
            f"{target / 'fidelity.json'} is not equal: the trial's prompt IDs for {board} differ from SchGen's own "
            "prompt path, so a generation would not be SchGen's prompt. Nothing is generated for this board until "
            "the difference is found and fidelity.json is remade"
        )
    if not (target / "prompt.json").is_file():
        scratch = _scratch(target, "prompt")
        _with_request(scratch, target)
        tools.render_prompt(scratch)
        _install(scratch, target, ("prompt.json",))
    check_prompt_bound(target)
    return target


def ids_sha256(ids: list[int]) -> str:
    """trial.prompt.ids_sha256, computed on the host: sha256 of the IDs as compact JSON ("[1,2,3]")."""
    return sha256_bytes(json.dumps(ids, separators=(",", ":")).encode("utf-8"))


def check_prompt_bound(directory: Path) -> None:
    """Refuse a prompt.json whose IDs or render date are not the ones the fidelity check compared.

    prompt.json is written by a separate container call from fidelity.json, and the chat template
    embeds the current date, so the two can differ across midnight UTC (or by any later edit). The
    IDs sent must be the IDs proven equal to SchGen's.
    """
    fidelity = json.loads((directory / "fidelity.json").read_text(encoding="utf-8"))
    prompt = json.loads((directory / "prompt.json").read_text(encoding="utf-8"))
    ids = prompt.get("ids")
    if not isinstance(ids, list):
        raise FidelityError(f"{directory / 'prompt.json'} has no ids list")
    expected = (fidelity.get("ours_ids_sha256"), fidelity.get("rendered_date"))
    actual = (ids_sha256(ids), prompt.get("rendered_date"))
    if expected != actual:
        raise FidelityError(
            f"{directory / 'prompt.json'} (ids sha256 {actual[0]}, rendered {actual[1]}) is not the prompt "
            f"{directory / 'fidelity.json'} checked (ids sha256 {expected[0]}, rendered {expected[1]}). Nothing "
            "is generated from IDs that were not proven equal to SchGen's. Before any attempt has generated, "
            "move both files aside and run again so they are made together; after one has, the attempts' "
            "prompt_sha256 says which prompt they were sent"
        )


def load_prompt(directory: Path, board: str) -> dict[str, object]:
    path = directory / "prompt.json"
    prompt = json.loads(path.read_text(encoding="utf-8"))
    if prompt.get("board") != board:
        raise RuntimeError(f"{path} is for {prompt.get('board')!r}, not {board}")
    ids = prompt.get("ids")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
        raise RuntimeError(f"{path} has no list of prompt token IDs")
    if prompt.get("token_count") != len(ids):
        raise RuntimeError(f"{path} token_count {prompt.get('token_count')} is not its {len(ids)} IDs")
    return prompt


def prompt_sha256(directory: Path) -> str:
    return sha256_file(directory / "prompt.json")


def main(argv: list[str]) -> int:
    """python board_request.py --exec-dir DIR BOARD: make the board's request directory, or refuse."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--exec-dir", required=True, type=Path)
    parser.add_argument("board")
    args = parser.parse_args(argv)
    directory = prepare(args.exec_dir, args.board, RealHostTools())
    prompt = load_prompt(directory, args.board)
    print(f"{args.board}: fidelity equal, {prompt['token_count']} prompt tokens, rendered {prompt['rendered_date']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
