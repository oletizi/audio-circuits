"""Errors and warnings from a kicad-cli ERC JSON report, by sheet path and type.

For the one-block root (verify.sh): the block's own sheet is `/<block>/`; the root `/` carries
the root's stubs, whose parent-net labels have nothing else to meet when the root holds one block,
so `label_dangling` there is a property of the one-block root, not of the block page.

usage: python3 erc_sheets.py <erc.json>
"""
import collections
import json
import sys

report = json.load(open(sys.argv[1]))
for sheet in report["sheets"]:
    by = collections.Counter((v["severity"], v["type"]) for v in sheet["violations"])
    errors = sum(n for (sev, _), n in by.items() if sev == "error")
    warnings = sum(n for (sev, _), n in by.items() if sev == "warning")
    print(f"sheet {sheet['path']}: errors {errors}, warnings {warnings}")
    for (sev, kind), n in sorted(by.items()):
        print(f"   {sev} {kind}: {n}")
