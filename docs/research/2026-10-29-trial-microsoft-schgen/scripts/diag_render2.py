"""Second bisect: which single edit makes KiCad 10.0.5 actually draw
SchGen's emitted schematic?

Hypothesis under test: SchGen hardcodes a KiCad 8 header
(version 20231120 / generator_version "8.0") but splices symbol definitions
copied verbatim from whatever KiCad symbol library is installed. Against a
KiCad 10 library those definitions carry tokens the KiCad 8 grammar does not
know, so the whole file is rejected and kicad-cli plots a blank sheet with
exit 0.
"""

import subprocess
import sys
from pathlib import Path

KICAD = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
SRC = Path(sys.argv[1])
OUTDIR = Path(sys.argv[2])
OUTDIR.mkdir(parents=True, exist_ok=True)
base = SRC.read_text(encoding="utf-8")

V10 = '(version 20251024)'
G10 = '(generator_version "10.0")'


def ver10(t):
    return t.replace("(version 20231120)", V10).replace(
        '(generator_version "8.0")', G10)


def qval(t):
    return t.replace("(property Value ", '(property "Value" ')


def nosi(t):
    return t.replace("(symbol_instances)", "")


CANDIDATES = {
    "version10_only": ver10,
    "version10+quote_value": lambda t: qval(ver10(t)),
    "version10+quote_value+nosi": lambda t: nosi(qval(ver10(t))),
    "quote_value_only": qval,
}

for name, fn in CANDIDATES.items():
    d = OUTDIR / name
    d.mkdir(exist_ok=True)
    sch = d / "test.kicad_sch"
    sch.write_text(fn(base), encoding="utf-8")
    pdf = d / "test.pdf"
    r = subprocess.run([KICAD, "sch", "export", "pdf", "-o", str(pdf), str(sch)],
                       capture_output=True, text=True)
    png = d / "test.png"
    subprocess.run(["pdftoppm", "-r", "60", "-png", "-singlefile", str(pdf),
                    str(png.with_suffix(""))], capture_output=True)
    m = subprocess.run(["magick", str(png), "-colorspace", "Gray",
                        "-threshold", "80%", "-format", "%[fx:1-mean]", "info:"],
                       capture_output=True, text=True)
    nl = d / "nl.xml"
    subprocess.run([KICAD, "sch", "export", "netlist", "--format", "kicadxml",
                    "-o", str(nl), str(sch)], capture_output=True, text=True)
    ncomp = nl.read_text(encoding="utf-8").count("<comp ") if nl.exists() else -1
    print(f"{name:32} exit={r.returncode} ink={m.stdout.strip():12} comps={ncomp}")
