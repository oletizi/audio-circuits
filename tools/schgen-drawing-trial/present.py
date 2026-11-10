"""Compose, per trial board, one image: the approved page then attempts 1, 2, 3 left to right.

Captions are only `approved` and `attempt N`. An attempt whose manifest says `page_produced`
and whose page.png opens is shown; every other attempt is the neutral card
`Attempt N: no schematic generated`. Nothing else - no outcome, stage, traceback, count - is
drawn, so what the reviewer sees is the pages and nothing that argues for or against them.

A run that is not finished must not be presented: an attempt directory without manifest.json
refuses the whole presentation before any image is written.

The approved page's PNG is not committed under drafted/ (only its .kicad_sch and .svg are), so
the CLI renders it with render.ts, the path the approved pages were rasterised with.

CLI: `.venv/bin/python tools/schgen-drawing-trial/present.py EXEC_DIR` writes
EXEC_DIR/presentation/<board>.png for every board in `board-info.ts --list`. Refuses if
presentation/ exists unless `--replace`. Pages are pasted at native pixel size, never resized.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

CAPTION_HEIGHT = 70
GUTTER = 24
BACKGROUND = (255, 255, 255)
INK = (0, 0, 0)
CARD_FILL = (235, 235, 235)
REPO = Path(__file__).resolve().parents[2]
TRIAL_CIRCUIT = "pultec"
SUFFIX = ".generated-do-not-edit"


class PresentRefusal(Exception):
    """The presentation cannot be made faithfully; the message names what is missing and why."""


@dataclass(frozen=True)
class Panel:
    caption: str
    card_text: str | None
    image: Image.Image | None

    def texts(self) -> list[str]:
        """Every string handed to the compositor for this panel."""
        return [self.caption] + ([self.card_text] if self.card_text is not None else [])


def _open_png(path: Path) -> Image.Image | None:
    try:
        if path.stat().st_size == 0:
            return None
        with Image.open(path) as im:
            im.load()
            return im.convert("RGB")
    except (OSError, Image.DecompressionBombError):
        return None


def _attempt_dirs(exec_dir: Path, board: str) -> list[tuple[int, Path]]:
    board_dir = exec_dir / board
    if not board_dir.is_dir():
        raise PresentRefusal(f"{board_dir} does not exist; the run has no record for board {board}")
    found = []
    for d in board_dir.iterdir():
        m = re.fullmatch(r"attempt-(\d+)", d.name)
        if m and d.is_dir():
            found.append((int(m.group(1)), d))
    if not found:
        raise PresentRefusal(f"{board_dir} holds no attempt-<n> directory; there is nothing to present for {board}")
    numbers = sorted(n for n, _ in found)
    if numbers != [1, 2, 3]:
        raise PresentRefusal(f"{board_dir} holds attempts {numbers}; the trial is exactly attempt-1, attempt-2, "
                             "attempt-3, and a different set is not presented")
    return sorted(found)


def _page_produced(attempt_dir: Path) -> bool:
    manifest = attempt_dir / "manifest.json"
    if not manifest.is_file():
        raise PresentRefusal(
            f"{attempt_dir} has no manifest.json. An attempt without one is not finished (or is being "
            "regenerated), and a run that is not finished is not presented.")
    try:
        record = json.loads(manifest.read_text())
    except ValueError as err:
        raise PresentRefusal(f"{manifest} is not valid JSON: {err}") from err
    value = record.get("page_produced") if isinstance(record, dict) else None
    if not isinstance(value, bool):
        raise PresentRefusal(f"{manifest} has no boolean page_produced; it is the field that decides what is shown")
    return value


def build_panels(exec_dir: Path, board: str, approved_png: Path) -> list[Panel]:
    approved = _open_png(approved_png)
    if approved is None:
        raise PresentRefusal(f"the approved page's PNG {approved_png} is missing, empty or unreadable for {board}")
    panels = [Panel("approved", None, approved)]
    attempts = _attempt_dirs(exec_dir, board)
    produced = [(n, d, _page_produced(d)) for n, d in attempts]  # every manifest is checked before any image exists
    for n, d, ok in produced:
        image = _open_png(d / "page.png") if ok else None
        card = None if image is not None else f"Attempt {n}: no schematic generated"
        panels.append(Panel(f"attempt {n}", card, image))
    return panels


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    return ImageFont.load_default(size)


def _tile(panel: Panel, card_size: tuple[int, int]) -> Image.Image:
    """The panel's body at native pixel size (no resize), a card at the approved page's size."""
    if panel.image is not None:
        return panel.image
    if panel.card_text is None:
        raise PresentRefusal(f"panel {panel.caption} has neither a page nor card text; nothing to draw")
    body = Image.new("RGB", card_size, CARD_FILL)
    draw = ImageDraw.Draw(body)
    font = _font(44)
    box = draw.textbbox((0, 0), panel.card_text, font=font)
    draw.text(((card_size[0] - box[2]) / 2, (card_size[1] - box[3]) / 2), panel.card_text, fill=INK, font=font)
    return body


def layout(panels: list[Panel]) -> list[tuple[int, int, int, int]]:
    """Each panel's (left, top, width, height) in the composed image; panels are top-aligned."""
    approved = panels[0].image
    if approved is None:
        raise PresentRefusal("the first panel must be the approved page")
    boxes, x = [], GUTTER
    for p in panels:
        w, h = (p.image.size if p.image is not None else approved.size)
        boxes.append((x, GUTTER, w, h))
        x += w + GUTTER
    return boxes


def compose(panels: list[Panel]) -> Image.Image:
    boxes = layout(panels)
    approved = panels[0].image
    if approved is None:
        raise PresentRefusal("the first panel must be the approved page")
    card_size = approved.size
    height = max(b[3] for b in boxes)
    width = boxes[-1][0] + boxes[-1][2] + GUTTER
    sheet = Image.new("RGB", (width, GUTTER + height + CAPTION_HEIGHT + GUTTER), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    font = _font(40)
    for p, (left, top, w, h) in zip(panels, boxes):
        sheet.paste(_tile(p, card_size), (left, top))
        box = draw.textbbox((0, 0), p.caption, font=font)
        draw.text((left + (w - box[2]) / 2, GUTTER + height + (CAPTION_HEIGHT - box[3]) / 2), p.caption,
                  fill=INK, font=font)
    return sheet


def present(exec_dir: Path, boards: list[str], approved_png_for: Callable[[str], Path],
            replace: bool = False) -> dict[str, list[Panel]]:
    """Build every board's panels first (refusing on any unfinished attempt), then write the images."""
    out_dir = exec_dir / "presentation"
    if out_dir.exists() and not replace:
        raise PresentRefusal(f"{out_dir} already exists; pass --replace to overwrite what was shown before")
    built = {b: build_panels(exec_dir, b, approved_png_for(b)) for b in boards}
    out_dir.mkdir(exist_ok=True)
    for board, panels in built.items():
        compose(panels).save(out_dir / f"{board}.png")
    return built


def _bun(*args: str) -> str:
    done = subprocess.run(["bun", *args], cwd=REPO, capture_output=True, text=True)
    if done.returncode != 0:
        raise PresentRefusal(f"bun {' '.join(args)} exited {done.returncode}: {done.stderr.strip()}")
    return done.stdout


def _render_approved(board: str, out_root: Path) -> Path:
    sheet = REPO / "drafted" / TRIAL_CIRCUIT / board / f"{board}{SUFFIX}.kicad_sch"
    rendered = json.loads(_bun("tools/schgen-drawing-trial/render.ts", str(sheet), str(out_root / board)))
    return Path(rendered["png"])


def main(argv: list[str]) -> int:
    replace = "--replace" in argv
    args = [a for a in argv if a != "--replace"]
    if len(args) != 1:
        raise SystemExit("usage: present.py EXEC_DIR [--replace]")
    exec_dir = Path(args[0]).resolve()
    boards = _bun("tools/schgen-drawing-trial/board-info.ts", "--list").split()
    with tempfile.TemporaryDirectory(prefix="present-approved-") as tmp:
        present(exec_dir, boards, lambda b: _render_approved(b, Path(tmp)), replace)
    for b in boards:
        print(exec_dir / "presentation" / f"{b}.png")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
