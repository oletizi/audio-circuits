"""Crop a region of a full-resolution sheet render, with a coordinate grid.

usage: crop.py SRC X0 Y0 X1 Y1 OUT [MAXW] [GRID]
Coordinates are full-resolution pixels. The output is scaled to at most MAXW
pixels wide (default 1600). GRID (default 0 = none) draws labelled grid lines
every GRID full-resolution pixels so locations can be cited.
"""
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None


def main():
    src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
    maxw = int(sys.argv[7]) if len(sys.argv) > 7 else 1600
    grid = int(sys.argv[8]) if len(sys.argv) > 8 else 0
    im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
    scale = maxw / im.width
    if scale != 1.0:
        resample = Image.LANCZOS if scale < 1.0 else Image.NEAREST
        im = im.resize((int(im.width * scale), int(im.height * scale)), resample)
    if grid:
        d = ImageDraw.Draw(im)
        gx = (x0 // grid + 1) * grid
        while gx < x1:
            px = int((gx - x0) * scale)
            d.line([(px, 0), (px, im.height)], fill=(255, 0, 0), width=1)
            d.text((px + 2, 2), str(gx), fill=(255, 0, 0))
            gx += grid
        gy = (y0 // grid + 1) * grid
        while gy < y1:
            py = int((gy - y0) * scale)
            d.line([(0, py), (im.width, py)], fill=(0, 0, 255), width=1)
            d.text((2, py + 2), str(gy), fill=(0, 0, 255))
            gy += grid
    im.save(out)
    print(out, im.size, f"scale={scale:.3f}")


if __name__ == "__main__":
    main()
