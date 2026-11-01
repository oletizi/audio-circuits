"""Find why KiCad 10.0.5 plots SchGen's .kicad_sch as an empty sheet.

Builds a series of candidate repairs of the emitted file, plots each, and
reports the rendered ink coverage so a silently-empty page is distinguishable
from a drawn one.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

KICAD = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
SRC = Path(sys.argv[1])
OUTDIR = Path(sys.argv[2])
OUTDIR.mkdir(parents=True, exist_ok=True)

base = SRC.read_text(encoding="utf-8")


def fix_drop_symbol_instances(t):
    return t.replace("(symbol_instances)", "")


def fix_quote_value(t):
    return t.replace("(property Value ", '(property "Value" ')


def fix_version_10(t):
    t = t.replace("(version 20231120)", "(version 20250114)")
    return t.replace('(generator_version "8.0")', '(generator_version "9.0")')


CANDIDATES = {
    "as_emitted": lambda t: t,
    "quote_value": fix_quote_value,
    "drop_symbol_instances": fix_drop_symbol_instances,
    "quote_value+drop_si": lambda t: fix_drop_symbol_instances(fix_quote_value(t)),
    "all_three": lambda t: fix_version_10(fix_drop_symbol_instances(fix_quote_value(t))),
}

for name, fn in CANDIDATES.items():
    d = OUTDIR / name
    d.mkdir(exist_ok=True)
    sch = d / "test.kicad_sch"
    sch.write_text(fn(base), encoding="utf-8")
    pdf = d / "test.pdf"
    r = subprocess.run([KICAD, "sch", "export", "pdf", "-o", str(pdf), str(sch)],
                       capture_output=True, text=True)
    err = "\n".join(l for l in (r.stdout + r.stderr).splitlines()
                    if "Fontconfig" not in l)
    ink = "n/a"
    if pdf.exists():
        png = d / "test.png"
        subprocess.run(["pdftoppm", "-r", "60", "-png", "-singlefile",
                        str(pdf), str(png.with_suffix(""))],
                       capture_output=True)
        if png.exists():
            m = subprocess.run(
                ["magick", str(png), "-colorspace", "Gray", "-threshold", "80%",
                 "-format", "%[fx:1-mean]", "info:"],
                capture_output=True, text=True)
            ink = m.stdout.strip()
    print(f"--- {name}: exit={r.returncode} ink_fraction={ink}")
    if err.strip():
        print("    " + err.strip().replace("\n", "\n    "))
