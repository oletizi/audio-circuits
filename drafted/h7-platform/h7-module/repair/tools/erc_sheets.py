"""Errors and warnings from a kicad-cli ERC JSON report, by sheet path and type, and the verdict
verify.sh fails on.

For the one-block root (verify.sh): the block's own sheet is `/<block>/`; the root `/` carries
the root's stubs, whose parent-net labels have nothing else to meet when the root holds one block,
so `label_dangling` there is a property of the one-block root, not of the block page.

EXIT STATUS, which is what makes this a check and not a printout (issue 32: before it, a page with
ERC errors in its own sheet still verified, because this script only printed counts):
  - non-zero when the target sheet `/<block>/` is absent from the report;
  - non-zero when the target sheet carries any error-severity violation;
  - non-zero when the root `/` carries an error of any type but `label_dangling`, the one the
    synthetic root is known to produce, so the allowance is scoped to the root and to that type;
  - non-zero when any other sheet appears, since the one-block root holds only the target.
Warnings are printed and never fail: none of the four rules above is about a warning.
Each error on the target sheet is printed with the items KiCad names (`at <type>: <items>`), so a
failure names the symbol and pin, and a control can require it.

usage: python3 erc_sheets.py <erc.json> <block>
"""
import collections
import json
import sys

ROOT_ALLOWED_ERRORS = {"label_dangling"}

if len(sys.argv) != 3:
    sys.exit("erc_sheets.py: expected two arguments, the ERC report and the block name; "
             f"got {len(sys.argv) - 1}")
report = json.load(open(sys.argv[1]))
target = f"/{sys.argv[2]}/"

failures = []
seen = set()
for sheet in report["sheets"]:
    path = sheet["path"]
    seen.add(path)
    by = collections.Counter((v["severity"], v["type"]) for v in sheet["violations"])
    errors = sum(n for (sev, _), n in by.items() if sev == "error")
    warnings = sum(n for (sev, _), n in by.items() if sev == "warning")
    print(f"sheet {path}: errors {errors}, warnings {warnings}")
    for (sev, kind), n in sorted(by.items()):
        print(f"   {sev} {kind}: {n}")
    error_kinds = {kind for (sev, kind) in by if sev == "error"}
    if path == target:
        # Each error on the block's own sheet, with the items KiCad names, so a failure says where.
        for v in sheet["violations"]:
            if v["severity"] == "error":
                items = "; ".join(i.get("description", "?") for i in v.get("items", []))
                print(f"   at {v['type']}: {items}")
        if errors:
            failures.append(f"the block's own sheet {path} has {errors} ERC error(s): "
                            f"{', '.join(sorted(error_kinds))}")
    elif path == "/":
        unexpected = error_kinds - ROOT_ALLOWED_ERRORS
        if unexpected:
            failures.append(f"the one-block root / has ERC error(s) other than the stubs' "
                            f"label_dangling: {', '.join(sorted(unexpected))}")
    else:
        failures.append(f"unexpected sheet {path} in the one-block root's ERC report "
                        f"(it should hold only {target})")

if target not in seen:
    failures.append(f"the block's own sheet {target} is not in the ERC report, so it was not checked")

for f in failures:
    print(f"erc_sheets.py: FAIL - {f}", file=sys.stderr)
sys.exit(1 if failures else 0)
