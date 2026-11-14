"""Errors and warnings from a kicad-cli ERC JSON report, by sheet path and type, and the verdict
verify.sh fails on.

For the one-block root (verify.sh): the block's own sheet is `/<block>/`; the root `/` carries
the root's stubs, whose parent-net labels have nothing else to meet when the root holds one block,
so `label_dangling` there is a property of the one-block root, not of the block page.

EXIT STATUS, which is what makes this a check and not a printout (issue 32: before it, a page with
ERC errors in its own sheet still verified, because this script only printed counts):
  - non-zero when the target sheet `/<block>/` is absent from the report;
  - non-zero when the target sheet carries any error-severity violation not excused below;
  - non-zero when the root `/` carries an error of any type but `label_dangling`, the one the
    synthetic root is known to produce, so the allowance is scoped to the root and to that type;
  - non-zero when any other sheet appears, since the one-block root holds only the target;
  - non-zero when one declared allowance matches more than one violation.
Warnings are printed and never fail: none of the rules above is about a warning. Known limitation
(H7 module plan, Task 7d review M5): on `/` they are counted by type, not itemised or bounded, so a
new warning type there passes; it shows only as a new line in the per-type counts.
Each error on the target sheet is printed with the items KiCad names (`at <type>: <items>`), so a
failure names the symbol and pin, and a control can require it.

DECLARED ALLOWANCES (the third argument, the JSON `erc-allowances.ts` writes after checking each
entry against the model). An error is excused ONLY on an exact match, `erc_match.py`'s rule, which
`root_erc.py` shares: the same sheet path, the same violation type, and exactly the items whose
(designator, pin number), parsed from KiCad's "Symbol <ref> Pin <number> [...]" item, are the
allowance's two pairs (one, for a type KiCad reports with one item: `erc-allowances.ts`,
ONE_ITEM_TYPES). Never on free text alone, never on the type alone. ONE ALLOWANCE EXCUSES AT MOST
ONE VIOLATION: a second match (the same pair reported twice, say by a sheet instantiated
twice) fails the run (Task 7d review M4). Each excused violation is printed on a line starting
`excused:` with its ruling; verify.sh repeats those lines in its closing output. An allowance whose
sheet is in the report and which matched nothing is printed on a line starting `stale allowance:`,
and does not fail the run. An allowance for a sheet the report does not hold is not applicable to
the run and is not reported.

usage: python3 erc_sheets.py <erc.json> <block> <allowances.json>
"""
import collections
import json
import sys

from erc_match import items_text, matches

ROOT_ALLOWED_ERRORS = {"label_dangling"}

if len(sys.argv) != 4:
    sys.exit("erc_sheets.py: expected three arguments, the ERC report, the block name and the "
             f"allowances JSON (erc-allowances.ts writes it; [] for none); got {len(sys.argv) - 1}")
report = json.load(open(sys.argv[1]))
target = f"/{sys.argv[2]}/"
allowances = json.load(open(sys.argv[3]))
if not isinstance(allowances, list):
    sys.exit(f"erc_sheets.py: {sys.argv[3]} is not a JSON array of allowances")


def matching_allowance(path, violation):
    """The index of the allowance that excuses this violation, or None."""
    if violation["severity"] != "error":
        return None
    for i, a in enumerate(allowances):
        if matches(a, path, violation):
            return i
    return None


failures = []
seen = set()
used = collections.Counter()
for sheet in report["sheets"]:
    path = sheet["path"]
    seen.add(path)
    by = collections.Counter((v["severity"], v["type"]) for v in sheet["violations"])
    errors = sum(n for (sev, _), n in by.items() if sev == "error")
    warnings = sum(n for (sev, _), n in by.items() if sev == "warning")
    excused = []
    unexcused = []
    for v in sheet["violations"]:
        if v["severity"] != "error":
            continue
        i = matching_allowance(path, v)
        if i is None:
            unexcused.append(v)
        else:
            excused.append((v, allowances[i]))
            used[i] += 1
    note = f" ({len(excused)} excused by a declared allowance)" if excused else ""
    print(f"sheet {path}: errors {errors}{note}, warnings {warnings}")
    for (sev, kind), n in sorted(by.items()):
        print(f"   {sev} {kind}: {n}")
    for v, a in excused:
        print(f"excused: error {v['type']} on {path} under {a['ruling']}: {items_text(v)}")
    error_kinds = {v["type"] for v in unexcused}
    if path == target:
        # Each unexcused error on the block's own sheet, with the items KiCad names, so a failure says where.
        for v in unexcused:
            print(f"   at {v['type']}: {items_text(v)}")
        if unexcused:
            failures.append(f"the block's own sheet {path} has {len(unexcused)} ERC error(s): "
                            f"{', '.join(sorted(error_kinds))}")
    elif path == "/":
        unexpected = error_kinds - ROOT_ALLOWED_ERRORS
        if unexpected:
            failures.append(f"the one-block root / has ERC error(s) other than the stubs' "
                            f"label_dangling: {', '.join(sorted(unexpected))}")
    else:
        failures.append(f"unexpected sheet {path} in the one-block root's ERC report "
                        f"(it should hold only {target})")

for i, a in enumerate(allowances):
    pins = " and ".join(f"{p['designator']} pin {p['pin']}" for p in a["pins"])
    if used[i] > 1:
        failures.append(f"allowance {a['ruling']} ({a['type']} on {a['sheet']} between {pins}) matched "
                        f"{used[i]} violations; an allowance excuses exactly the one violation its ruling describes")
    elif a["sheet"] in seen and used[i] == 0:
        print(f"stale allowance: {a['ruling']} ({a['type']} on {a['sheet']} between {pins}) "
              f"matched no violation in this run; it may no longer be needed")

if target not in seen:
    failures.append(f"the block's own sheet {target} is not in the ERC report, so it was not checked")

for f in failures:
    print(f"erc_sheets.py: FAIL - {f}", file=sys.stderr)
sys.exit(1 if failures else 0)
