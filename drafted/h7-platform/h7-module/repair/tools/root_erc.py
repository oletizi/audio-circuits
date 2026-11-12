"""The verdict on the h7-module ROOT's ERC, every sheet together, read from a kicad-cli ERC JSON report
run on the committed project (the root sheet with its `.kicad_pro` beside it).

kicad-cli 10.0.5 HONOURS the `.kicad_pro`'s `erc_exclusions` (measured, Task 7e; `kicad-pro.ts` has
the measurement): a violation an exclusion matches is reported with `"excluded": true`, and an
exclusion that matches nothing is reported as a separate excluded marker while the real violation
stays an error. So excluded entries are read here and held to the declared allowances
(`erc-allowances.ts`, ruling CR-MODULE-VCAP-ERC) by the same exact match `erc_sheets.py` uses -
the sheet path, the type, and exactly the two (designator, pin) pairs parsed from KiCad's items -
rather than trusting the project file.

EXIT STATUS. Non-zero when:
  - any violation that is NOT excluded has severity error (each is printed with its items);
  - an excluded violation matches no declared allowance (an exclusion nothing admits);
  - a declared allowance is matched by no excluded violation, or by more than one;
  - the `.kicad_pro` carries a number of exclusions other than the number of allowances;
  - the report holds no sheet path other than the root, so the hierarchy was not read.
Warnings never fail; they are printed per sheet and in total by type.

Ruling CR-MODULE-CROSS-PAGE-DRIVERS asks that the real root clear every table net with its real
driver: a `pin_not_driven` anywhere is an error and fails here, and the driving pin's net is checked
by `root-drivers.ts` on the export.

usage: python3 root_erc.py <erc.json> <allowances.json> <project.kicad_pro>
"""
import collections
import json
import re
import sys

ITEM = re.compile(r"^Symbol (\S+) Pin (\S+) \[")

if len(sys.argv) != 4:
    sys.exit(f"root_erc.py: expected three arguments, the ERC report, the allowances JSON and the .kicad_pro; got {len(sys.argv) - 1}")
report = json.load(open(sys.argv[1]))
allowances = json.load(open(sys.argv[2]))
project = json.load(open(sys.argv[3]))
exclusions = project.get("erc", {}).get("erc_exclusions")
if not isinstance(allowances, list) or not isinstance(exclusions, list):
    sys.exit("root_erc.py: the allowances must be a JSON array and the .kicad_pro must carry erc.erc_exclusions as an array")


def pairs(violation):
    out = []
    for item in violation.get("items", []):
        m = ITEM.match(item.get("description", ""))
        if m is None:
            return None
        out.append((m.group(1), m.group(2)))
    return sorted(out)


def items_text(violation):
    return "; ".join(i.get("description", "?") for i in violation.get("items", []))


failures = []
matched = collections.Counter()
warnings = collections.Counter()
paths = []
for sheet in report["sheets"]:
    path = sheet["path"]
    paths.append(path)
    by = collections.Counter((v["severity"], v["type"]) for v in sheet["violations"] if not v.get("excluded"))
    excluded = [v for v in sheet["violations"] if v.get("excluded")]
    errors = sum(n for (sev, _), n in by.items() if sev == "error")
    print(f"sheet {path}: errors {errors}, warnings {sum(n for (sev, _), n in by.items() if sev == 'warning')}, excluded {len(excluded)}")
    for (sev, kind), n in sorted(by.items()):
        print(f"   {sev} {kind}: {n}")
        if sev == "warning":
            warnings[kind] += n
    for v in sheet["violations"]:
        if not v.get("excluded") and v["severity"] == "error":
            print(f"   at {v['type']}: {items_text(v)}")
            failures.append(f"{path} has an ERC error, {v['type']}: {items_text(v)}")
    for v in excluded:
        got = pairs(v)
        hits = [i for i, a in enumerate(allowances)
                if a["sheet"] == path and a["type"] == v["type"] and got is not None
                and got == sorted((p["designator"], p["pin"]) for p in a["pins"])]
        if not hits:
            failures.append(f"{path}: an excluded {v['type']} ({items_text(v)}) matches no declared allowance in erc-allowances.ts")
        for i in hits:
            matched[i] += 1
            print(f"excluded: {v['type']} on {path} under {allowances[i]['ruling']}: {items_text(v)}")

for i, a in enumerate(allowances):
    if matched[i] != 1:
        failures.append(f"allowance {a['ruling']} ({a['type']} on {a['sheet']}) is matched by {matched[i]} excluded violation(s); expected exactly one")
if len(exclusions) != len(allowances):
    failures.append(f"the .kicad_pro carries {len(exclusions)} ERC exclusion(s) and erc-allowances.ts declares {len(allowances)}")
if [p for p in paths if p != "/"] == []:
    failures.append("the report holds no sheet but the root, so the hierarchy was not read")
print(f"warnings by type, every sheet: {dict(sorted(warnings.items())) or 'none'}")
for f in failures:
    print(f"root_erc.py: FAIL - {f}", file=sys.stderr)
sys.exit(1 if failures else 0)
