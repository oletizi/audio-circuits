"""Errors and warnings from a kicad-cli ERC JSON report, by type.

usage: python3 erc_counts.py <erc.json>
"""
import collections
import json
import sys

report = json.load(open(sys.argv[1]))
by = collections.Counter()
for sheet in report["sheets"]:
    for v in sheet["violations"]:
        by[(v["severity"], v["type"])] += 1
errors = sum(n for (sev, _), n in by.items() if sev == "error")
warnings = sum(n for (sev, _), n in by.items() if sev == "warning")
print(f"errors {errors}, warnings {warnings}")
for (sev, kind), n in sorted(by.items()):
    print(f"   {sev} {kind}: {n}")
