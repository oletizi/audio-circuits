"""Errors and warnings from a kicad-cli ERC JSON report, by type.

EXIT STATUS: ALWAYS 0 when the report can be read. This copy NEVER FAILS on a violation, and that
is the one way it differs from the h7-carrier's `../../../h7-carrier/repair/erc_counts.py`, which
fails on any error since issue 32. Why: verify.sh runs it on the block sheet ALONE, and a block
sheet alone carries `pin_not_connected` errors on its hierarchical labels ("cannot be connected to
non-existent parent sheet"), which no repair of the block can remove. Not one per label in every
case: the final review counted 31 such errors on the sdram page's 41 labels. The ERC verdict
on a block page is `erc_sheets.py`'s, on the sheet under a one-block root
(`erc-one-block-root.sh`), which does fail. This run is a printout for the record.

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
