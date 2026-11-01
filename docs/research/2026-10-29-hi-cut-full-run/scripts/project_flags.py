"""Turn OFF `intersheets_ref_show` in a generated .kicad_pro before rendering.

A one-sheet page has no other sheet to point at, so the `[1]` KiCad draws beside
every global label is a device that earns nothing. The generated project turns
it on; copperhead's own board directory has no project at all, which is why a
draft renders without it. Both sides of a before/after pair are rendered with it
OFF so the pair differs by the SHEET and not by the project beside it.

usage: project_flags.py <project.kicad_pro>
"""
import json
import sys

path = sys.argv[1]
d = json.load(open(path))
d.setdefault("schematic", {}).setdefault("drawing", {})["intersheets_ref_show"] = False
json.dump(d, open(path, "w"), indent=2)
print(f"intersheets_ref_show = False in {path}")
