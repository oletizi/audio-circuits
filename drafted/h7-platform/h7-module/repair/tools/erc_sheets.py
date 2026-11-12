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
  - non-zero when any other sheet appears, since the one-block root holds only the target.
Warnings are printed and never fail: none of the four rules above is about a warning.
Each error on the target sheet is printed with the items KiCad names (`at <type>: <items>`), so a
failure names the symbol and pin, and a control can require it.

DECLARED ALLOWANCES (the third argument, the JSON `erc-allowances.ts` writes after checking each
entry against the model). An error is excused ONLY on an exact match: the same sheet path, the same
violation type, and exactly two items whose (designator, pin number), parsed from KiCad's
"Symbol <ref> Pin <number> [...]" item, are the allowance's two pairs. Never on free text alone,
never on the type alone. Each excused violation is printed on a line starting `excused:` with its
ruling; verify.sh repeats those lines in its closing output. An allowance whose sheet is in the
report and which matched nothing is printed on a line starting `stale allowance:`, and does not fail
the run. An allowance for a sheet the report does not hold is not applicable to the run and is not
reported.

usage: python3 erc_sheets.py <erc.json> <block> <allowances.json>
"""
import collections
import json
import re
import sys

ROOT_ALLOWED_ERRORS = {"label_dangling"}
ITEM = re.compile(r"^Symbol (\S+) Pin (\S+) \[")

if len(sys.argv) != 4:
    sys.exit("erc_sheets.py: expected three arguments, the ERC report, the block name and the "
             f"allowances JSON (erc-allowances.ts writes it; [] for none); got {len(sys.argv) - 1}")
report = json.load(open(sys.argv[1]))
target = f"/{sys.argv[2]}/"
allowances = json.load(open(sys.argv[3]))
if not isinstance(allowances, list):
    sys.exit(f"erc_sheets.py: {sys.argv[3]} is not a JSON array of allowances")


def pin_pairs(violation):
    """The (designator, pin) of each item, or None when any item is not a symbol pin."""
    pairs = []
    for item in violation.get("items", []):
        m = ITEM.match(item.get("description", ""))
        if m is None:
            return None
        pairs.append((m.group(1), m.group(2)))
    return pairs


def matching_allowance(path, violation):
    if violation["severity"] != "error":
        return None
    pairs = pin_pairs(violation)
    if pairs is None or len(pairs) != 2:
        return None
    for a in allowances:
        want = sorted((p["designator"], p["pin"]) for p in a["pins"])
        if a["sheet"] == path and a["type"] == violation["type"] and sorted(pairs) == want:
            return a
    return None


def items_text(violation):
    return "; ".join(i.get("description", "?") for i in violation.get("items", []))


failures = []
seen = set()
used = set()
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
        a = matching_allowance(path, v)
        if a is None:
            unexcused.append(v)
        else:
            excused.append((v, a))
            used.add(id(a))
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

for a in allowances:
    if a["sheet"] in seen and id(a) not in used:
        pins = " and ".join(f"{p['designator']} pin {p['pin']}" for p in a["pins"])
        print(f"stale allowance: {a['ruling']} ({a['type']} on {a['sheet']} between {pins}) "
              f"matched no violation in this run; it may no longer be needed")

if target not in seen:
    failures.append(f"the block's own sheet {target} is not in the ERC report, so it was not checked")

for f in failures:
    print(f"erc_sheets.py: FAIL - {f}", file=sys.stderr)
sys.exit(1 if failures else 0)
