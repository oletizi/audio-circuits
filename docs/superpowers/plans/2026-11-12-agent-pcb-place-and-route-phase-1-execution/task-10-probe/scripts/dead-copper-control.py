"""Negative control for the dead-copper check.

The probe reads "no dead copper" off KiCad's own `isolated_copper` check
reporting nothing.  A check that produces no violation cannot, by itself, tell
you that it ran: that is the skipped-check-that-looks-like-a-pass this
repository's workflow exists to refuse.  So this plants ONE isolated island of
GND fill on F.Cu, in an area measured to hold no footprint and no track, refills
and re-runs DRC, and reports whether KiCad names it.

If this control reports nothing, the clean result on the real board means
nothing either, and that is the finding.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

REPO = pathlib.Path(sys.argv[1]).resolve()
SRC = pathlib.Path(sys.argv[2]).resolve()
OUT = pathlib.Path(sys.argv[3]).resolve()
KICAD_CLI = sys.argv[4]

# An area with no footprint origin and no track start, measured on the routed
# board: the nearest footprint is MH1 at (14, 14) with a 3.5 mm keepout radius.
ISLAND = (20.0, 12.0, 26.0, 18.0)

OUT.mkdir(parents=True, exist_ok=True)
for suffix in (".kicad_pcb", ".kicad_pro", ".kicad_dru", ".kicad_sch"):
    shutil.copy(SRC.with_suffix(suffix), OUT / ("pt2399-core" + suffix))

board = OUT / "pt2399-core.kicad_pcb"
text = board.read_text()
x1, y1, x2, y2 = ISLAND
zone = f"""	(zone
		(net 0)
		(net_name "GND")
		(layer "F.Cu")
		(uuid "deadc0de-0000-4000-8000-00000000c0de")
		(name "dead-copper-control")
		(hatch edge 0.5)
		(connect_pads
			(clearance 0.5)
		)
		(min_thickness 0.25)
		(filled_areas_thickness no)
		(fill
			(thermal_gap 0.5)
			(thermal_bridge_width 0.5)
		)
		(polygon
			(pts
				(xy {x1} {y1}) (xy {x2} {y1}) (xy {x2} {y2}) (xy {x1} {y2})
			)
		)
	)
"""
# The last closing paren of the file is the board's own; insert before it.
cut = text.rstrip().rfind(")")
if cut < 0:
    raise SystemExit("the board text has no closing paren; it is not a KiCad board")
board.write_text(text[:cut] + zone + text[cut:])

report = OUT / "control-drc.rpt"
argv = [
    KICAD_CLI, "pcb", "drc", "--refill-zones", "--save-board",
    "--format", "json", "--severity-all", "--output", str(report), str(board),
]
run = subprocess.run(argv, capture_output=True, text=True)
(OUT / "control-drc.log").write_text(run.stdout + run.stderr)
parsed = json.loads(report.read_text())
types = sorted({v["type"] for v in parsed.get("violations", [])})
isolated = [v for v in parsed.get("violations", []) if v["type"] == "isolated_copper"]
print("kicad-cli exit:", run.returncode)
print("violation types reported:", types)
print("isolated_copper violations:", len(isolated))
for v in isolated:
    print("   ", v.get("severity"), "|", v.get("description"))
print("CONTROL HELD" if isolated else "CONTROL DID NOT HOLD: planted dead copper was not reported")
