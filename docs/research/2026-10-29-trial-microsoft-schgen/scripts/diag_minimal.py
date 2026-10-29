"""Bisect: how little SchGen output does KiCad 10.0.5 refuse to render?

Case 1: the blank template init_project.py writes, untouched.
Case 2: the template with one Device:R placed by add_schematic_symbol.
Case 3: case 2 plus one wire.
Reports rendered ink coverage for each (the empty A4 frame alone is ~0.018).
"""

import os
import subprocess
import sys
from pathlib import Path

KICAD = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
PROJECT_PATH = os.environ["PROJECT_PATH"]
sys.path.append(PROJECT_PATH)

BLANK = '''(kicad_sch
    (version 20231120)
    (generator "eeschema")
    (generator_version "8.0")
    (uuid "00000000-0000-0000-0000-000000000000")
    (paper "A4")
    (lib_symbols)
    (sheet_instances
        (path "/"
            (page "1")
        )
    )
    (symbol_instances)
)
'''

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)


def ink(sch: Path, tag: str):
    pdf = sch.with_suffix(".pdf")
    r = subprocess.run([KICAD, "sch", "export", "pdf", "-o", str(pdf), str(sch)],
                       capture_output=True, text=True)
    png = sch.with_name(sch.stem + ".png")
    subprocess.run(["pdftoppm", "-r", "60", "-png", "-singlefile", str(pdf),
                    str(png.with_suffix(""))], capture_output=True)
    m = subprocess.run(["magick", str(png), "-colorspace", "Gray",
                        "-threshold", "80%", "-format", "%[fx:1-mean]", "info:"],
                       capture_output=True, text=True)
    print(f"{tag:28} exit={r.returncode} ink={m.stdout.strip()}")


c1 = OUT / "case1_blank.kicad_sch"
c1.write_text(BLANK, encoding="utf-8")
ink(c1, "1 blank template")

from modules.kicad_sch_interface import *  # noqa: E402

c2 = OUT / "case2_one_r.kicad_sch"
c2.write_text(BLANK, encoding="utf-8")
set_schematic_filename(str(c2))
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=120.0,
                     pos_y=120.0, reference="R1", value="10K", rotation=0,
                     mirror="None")
ink(c2, "2 one Device:R")

c3 = OUT / "case3_r_and_wire.kicad_sch"
c3.write_text(c2.read_text(encoding="utf-8"), encoding="utf-8")
set_schematic_filename(str(c3))
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=140.0,
                     pos_y=120.0, reference="R2", value="10K", rotation=0,
                     mirror="None")
connect_pins("R1", "1", "R2", "1")
write_out_all_wires()
ink(c3, "3 two R plus wire")
