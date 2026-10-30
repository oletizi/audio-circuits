"""Export a drafted sheet's committed `.svg`, by the recipe the committed ones were made with.

THE RECIPE IS `kicad-cli sch export svg --black-and-white`, and the flag is not
cosmetic. `docs/research/2026-10-30-letter-repaper.md` §7.3 established it by
differencing four flag combinations against a committed render: without
`--black-and-white` KiCad writes fifteen theme colours and 1089 lines differ;
with it, zero do. A render made without the flag would be a 1000-line diff that
changed no drawing.

THE DIGEST IN EACH `RECORD.md` DROPS ONE LINE. KiCad stamps `<title>SVG Image
created as <name> date <timestamp></title>` into every export, so the raw file
never hashes the same twice and a digest of it would be worthless as evidence.
The recorded digest is of the file with that one line removed. This script
prints both, and names which is which.

IT VERIFIES BEFORE IT OVERWRITES. Run with `--check-only` against a sheet whose
bytes have not changed, it exports to a temporary directory and compares to the
committed render's digest, refusing when they differ - which is how a wrong
recipe is caught BEFORE a render is replaced rather than after. The first
attempt at this on the re-paper run omitted the flag, refused, and wrote
nothing.

usage:
    render.py --check-only <board-dir>     prove the recipe reproduces what is committed
    render.py --write      <board-dir>     export and replace the committed render
"""
import argparse
import hashlib
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
TITLE = re.compile(r"^.*<title>SVG Image created as .*</title>.*$\n?", re.MULTILINE)


def digests(svg_bytes):
    """(raw digest, digest with the volatile title line dropped)."""
    raw = hashlib.sha256(svg_bytes).hexdigest()
    text = svg_bytes.decode()
    stripped, n = TITLE.subn("", text)
    if n != 1:
        raise SystemExit(
            "REFUSING: expected exactly one volatile `<title>SVG Image created as ...` line "
            "to drop and found %d. The recorded digest is of the file WITHOUT that line, so "
            "dropping none (or two) would compute a digest of something else and compare it "
            "confidently." % n)
    return raw, hashlib.sha256(stripped.encode()).hexdigest()


def export(sheet, outdir):
    subprocess.run(
        [KC, "sch", "export", "svg", "--black-and-white", "-o", str(outdir), str(sheet)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    svgs = sorted(pathlib.Path(outdir).glob("*.svg"))
    if len(svgs) != 1:
        raise SystemExit(
            "REFUSING: the export wrote %d SVG files and one was expected. A multi-sheet "
            "export would silently hash whichever sorted first." % len(svgs))
    return svgs[0]


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--check-only", action="store_true")
    g.add_argument("--write", action="store_true")
    ap.add_argument("board_dir")
    a = ap.parse_args()

    bd = pathlib.Path(a.board_dir)
    sheets = sorted(bd.glob("*.kicad_sch"))
    committed = sorted(bd.glob("*.svg"))
    if len(sheets) != 1 or len(committed) != 1:
        raise SystemExit(
            "REFUSING: %s holds %d .kicad_sch and %d .svg; one of each was expected."
            % (bd, len(sheets), len(committed)))
    sheet, render = sheets[0], committed[0]

    old_raw, old_strip = digests(render.read_bytes())
    work = tempfile.mkdtemp(prefix="render-")
    try:
        new = export(sheet, work)
        new_raw, new_strip = digests(new.read_bytes())
        print("board            %s" % bd.name)
        print("sheet            %s  sha256 %s"
              % (sheet.name, hashlib.sha256(sheet.read_bytes()).hexdigest()))
        print("committed render sha256 %s  (volatile title dropped: %s)" % (old_raw, old_strip))
        print("fresh export     sha256 %s  (volatile title dropped: %s)" % (new_raw, new_strip))
        print("stripped digests agree: %s" % (old_strip == new_strip))

        if a.check_only:
            if old_strip != new_strip:
                raise SystemExit(
                    "REFUSING: `kicad-cli sch export svg --black-and-white` of this UNCHANGED "
                    "sheet does not reproduce the committed render's digest, so the recipe is "
                    "not the one the committed renders were made with. Nothing was written. "
                    "Settle the recipe before replacing any render.")
            print("RECIPE CONFIRMED against an unchanged sheet; nothing written.")
            return

        shutil.copyfile(new, render)
        w_raw, w_strip = digests(render.read_bytes())
        print("written          %s  sha256 %s  (volatile title dropped: %s)"
              % (render.name, w_raw, w_strip))
        if w_strip != new_strip:
            raise SystemExit("REFUSING: the written render does not match what was exported.")
        print("RENDER REPLACED.")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
