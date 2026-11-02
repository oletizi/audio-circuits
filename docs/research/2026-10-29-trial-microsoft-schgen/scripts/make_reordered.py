"""Build a variant of the hand-written program whose wire statements are in a
different order but describe the identical circuit: the ground connections are
moved ahead of the selector-to-capacitor connections. Nothing else changes.

Used to test whether SchGen's emitter is order-dependent -- its auto-router
consults a BOUNDING_BOX_DICT that accumulates as statements execute.
"""

from pathlib import Path

src = Path("pultec_low_boost.py").read_text(encoding="utf-8")

marker_sw = "# Net-(Cn-Pad2): rotary selector pins to the capacitor bank"
marker_gnd = "# Ground"
marker_end = "write_out_all_wires()"

i_sw = src.index(marker_sw)
i_gnd = src.index(marker_gnd)
i_end = src.index(marker_end)

block_sw = src[i_sw:i_gnd]
block_gnd = src[i_gnd:i_end]

out = src[:i_sw] + block_gnd + block_sw + src[i_end:]
assert out != src
Path("runs/prog_reordered.py").write_text(out, encoding="utf-8")
print("wrote runs/prog_reordered.py")
