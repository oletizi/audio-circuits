"""present.py: one image per board, approved page then attempts 1, 2, 3, captioned only approved / attempt N.

Synthetic PNGs in temp dirs only; no real drawing is opened here.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from PIL import Image

import present

BOARDS = ["board-a", "board-b"]


def _png(path: Path, size: tuple[int, int], colour: tuple[int, int, int]) -> None:
    Image.new("RGB", size, colour).save(path)


def _attempt(exec_dir: Path, board: str, n: int, produced: bool, png: str = "good") -> Path:
    d = exec_dir / board / f"attempt-{n}"
    d.mkdir(parents=True)
    (d / "manifest.json").write_text(json.dumps({"page_produced": produced, "outcome": "tooling-failed"}))
    if png == "good":
        _png(d / "page.png", (300, 200), (10, 20, 30))
    elif png == "empty":
        (d / "page.png").write_bytes(b"")
    elif png == "corrupt":
        (d / "page.png").write_bytes(b"not a png at all")
    return d


def _approved(tmp: Path, board: str) -> Path:
    p = tmp / f"{board}-approved.png"
    _png(p, (400, 260), (200, 200, 200))
    return p


def _setup(tmp_path: Path, kinds: dict[str, list[tuple[bool, str]]] | None = None) -> Path:
    exec_dir = tmp_path / "exec"
    for board in BOARDS:
        spec = (kinds or {}).get(board, [(True, "good")] * 3)
        for n, (produced, png) in enumerate(spec, start=1):
            _attempt(exec_dir, board, n, produced, png)
    return exec_dir


def _run(exec_dir: Path, tmp_path: Path) -> dict[str, list[present.Panel]]:
    return present.present(exec_dir, BOARDS, lambda b: _approved(tmp_path, b))


def test_order_and_captions(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    result = _run(exec_dir, tmp_path)
    for board in BOARDS:
        assert [p.caption for p in result[board]] == ["approved", "attempt 1", "attempt 2", "attempt 3"]
        assert (exec_dir / "presentation" / f"{board}.png").is_file()
    assert sorted(f.name for f in (exec_dir / "presentation").iterdir()) == ["board-a.png", "board-b.png"]


def test_failure_card_text_exact(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path, {"board-a": [(True, "good"), (False, "none"), (False, "good")]})
    panels = _run(exec_dir, tmp_path)["board-a"]
    assert panels[1].card_text is None
    assert panels[2].card_text == "Attempt 2: no schematic generated"
    assert panels[3].card_text == "Attempt 3: no schematic generated"
    assert panels[0].card_text is None


def test_every_attempt_has_a_panel(tmp_path: Path) -> None:
    kinds = {"board-a": [(True, "empty"), (True, "corrupt"), (True, "none")]}
    exec_dir = _setup(tmp_path, kinds)
    panels = _run(exec_dir, tmp_path)["board-a"]
    assert len(panels) == 4
    assert [p.card_text for p in panels[1:]] == [f"Attempt {n}: no schematic generated" for n in (1, 2, 3)]
    img = Image.open(exec_dir / "presentation" / "board-a.png")
    assert img.width >= 4 * 100


def test_page_shown_when_produced_and_readable(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    panels = _run(exec_dir, tmp_path)["board-a"]
    assert all(p.card_text is None for p in panels)


def test_no_diagnostics_in_image(tmp_path: Path) -> None:
    kinds = {"board-a": [(False, "none"), (True, "corrupt"), (True, "good")]}
    exec_dir = _setup(tmp_path, kinds)
    result = _run(exec_dir, tmp_path)
    texts = [t for ps in result.values() for p in ps for t in p.texts()]
    forbidden = ["tooling-failed", "program-raised", "Traceback", "LIMIT:", "outcome", "ERC", "finish_reason"]
    for t in texts:
        assert not any(f in t for f in forbidden), t
    allowed = {"approved", "attempt 1", "attempt 2", "attempt 3"} | {
        f"Attempt {n}: no schematic generated" for n in (1, 2, 3)}
    assert set(texts) <= allowed


def test_refuses_attempt_without_manifest(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    (exec_dir / "board-b" / "attempt-1" / "manifest.json").unlink()
    with pytest.raises(present.PresentRefusal, match="manifest.json"):
        _run(exec_dir, tmp_path)
    assert not (exec_dir / "presentation").exists()


def test_refuses_board_with_no_attempts(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    (exec_dir / "empty").mkdir()
    with pytest.raises(present.PresentRefusal, match="no attempt"):
        present.present(exec_dir, ["empty"], lambda b: _approved(tmp_path, b))


def test_refuses_unreadable_approved_page(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    bad = tmp_path / "bad.png"
    bad.write_bytes(b"")
    with pytest.raises(present.PresentRefusal, match="approved"):
        present.present(exec_dir, BOARDS, lambda b: bad)


def test_refuses_non_boolean_page_produced(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    (exec_dir / "board-a" / "attempt-2" / "manifest.json").write_text(json.dumps({"page_produced": "yes"}))
    with pytest.raises(present.PresentRefusal, match="page_produced"):
        _run(exec_dir, tmp_path)


def test_native_pixels_survive_composition(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path, {"board-a": [(True, "none"), (False, "none"), (True, "none")]})
    sizes = {1: (500, 700), 3: (900, 300)}
    for n, size in sizes.items():
        img = Image.new("RGB", size, (255, 255, 255))
        for x in range(0, size[0], 7):
            img.putpixel((x, x % size[1]), (200, 10, 10))
        img.save(exec_dir / "board-a" / f"attempt-{n}" / "page.png")
    approved = _approved(tmp_path, "board-a")
    present.present(exec_dir, ["board-a"], lambda b: approved)
    panels = present.build_panels(exec_dir, "board-a", approved)
    boxes = present.layout(panels)
    composed = Image.open(exec_dir / "presentation" / "board-a.png").convert("RGB")
    sources = [Image.open(approved).convert("RGB"), Image.open(exec_dir / "board-a/attempt-1/page.png").convert("RGB"),
               None, Image.open(exec_dir / "board-a/attempt-3/page.png").convert("RGB")]
    for src, (left, top, w, h) in zip(sources, boxes):
        assert (w, h) == (src.size if src is not None else (400, 260))
        crop = composed.crop((left, top, left + w, top + h))
        if src is not None:
            assert crop.tobytes() == src.tobytes()
    assert boxes[2][2:] == (400, 260)
    assert len({b[1] for b in boxes}) == 1


@pytest.mark.parametrize("numbers", [[1, 2], [1, 3], [1, 2, 3, 4], [2, 3, 4]])
def test_refuses_anything_but_three_attempts(tmp_path: Path, numbers: list[int]) -> None:
    exec_dir = tmp_path / "exec"
    for n in numbers:
        _attempt(exec_dir, "board-a", n, True)
    with pytest.raises(present.PresentRefusal, match="exactly attempt-1"):
        present.present(exec_dir, ["board-a"], lambda b: _approved(tmp_path, b))


def test_refuses_existing_presentation_unless_replace(tmp_path: Path) -> None:
    exec_dir = _setup(tmp_path)
    _run(exec_dir, tmp_path)
    with pytest.raises(present.PresentRefusal, match="--replace"):
        _run(exec_dir, tmp_path)
    present.present(exec_dir, BOARDS, lambda b: _approved(tmp_path, b), replace=True)
