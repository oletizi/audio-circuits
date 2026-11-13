"""The verdict on the h7-module ROOT's ERC, every sheet together, read from a kicad-cli ERC JSON report
run on the committed project (the root sheet with its `.kicad_pro` beside it).

kicad-cli 10.0.5 HONOURS the `.kicad_pro`'s `erc_exclusions` (measured, Task 7e; `kicad-pro.ts` has
the measurement): a violation an exclusion matches is reported with `"excluded": true`, and an
exclusion that matches nothing is reported as a separate excluded marker while the real violation
stays an error. So excluded entries are read here and held to the declared allowances
(`erc-allowances.ts`, ruling CR-MODULE-VCAP-ERC) by the exact match `erc_match.py` defines and
`erc_sheets.py` shares - the sheet path, the type, and exactly the two (designator, pin) pairs
parsed from KiCad's items - rather than trusting the project file.

EXIT STATUS. Non-zero when:
  - any violation that is NOT excluded has severity error (each is printed with its items);
  - an excluded violation matches no declared allowance (an exclusion nothing admits);
  - a declared allowance is matched by no excluded violation, or by more than one;
  - the `.kicad_pro` carries a number of exclusions other than the number of allowances;
  - the report holds no sheet path other than the root, so the hierarchy was not read.
Warnings never fail; they are printed per sheet and in total by type. Known limitation (H7 module
plan, Task 7d review): they are counted, not bounded, so a new warning type passes here; RECORD.md's
root measurement table itemises today's by type, and a change shows as a disagreement with it.

Ruling CR-MODULE-CROSS-PAGE-DRIVERS asks that the real root clear every table net with its real
driver: a `pin_not_driven` anywhere is an error and fails here, and the driving pin's net is checked
by `root-drivers.ts` on the export.

usage: python3 root_erc.py <erc.json> <allowances.json> <project.kicad_pro>
"""
import collections
import json
import sys

from erc_match import items_text, matches

if len(sys.argv) != 4:
    sys.exit(f"root_erc.py: expected three arguments, the ERC report, the allowances JSON and the .kicad_pro; got {len(sys.argv) - 1}")
report = json.load(open(sys.argv[1]))
allowances = json.load(open(sys.argv[2]))
project = json.load(open(sys.argv[3]))
exclusions = project.get("erc", {}).get("erc_exclusions")
if not isinstance(allowances, list) or not isinstance(exclusions, list):
    sys.exit("root_erc.py: the allowances must be a JSON array and the .kicad_pro must carry erc.erc_exclusions as an array")

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
        hits = [i for i, a in enumerate(allowances) if matches(a, path, v)]
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
