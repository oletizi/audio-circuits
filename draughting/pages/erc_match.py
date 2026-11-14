"""The one rule by which a declared ERC allowance (`erc-allowances.ts`, written as JSON) matches a
violation in a kicad-cli ERC JSON report. `erc_sheets.py` (a block page under its one-block root)
and `root_erc.py` (the module root, every sheet) both import it, so the per-page and the root
verdicts cannot disagree on what an allowance excuses (H7 module plan, final review M6).

A violation matches an allowance ONLY when all of these hold: it is on the allowance's sheet path, it
is of the allowance's violation type, and its items are exactly the allowance's (designator, pin
number) pairs, each parsed from KiCad's "Symbol <ref> Pin <number> [...]" item: two, or one for a
type KiCad reports with one item (`erc-allowances.ts`, ONE_ITEM_TYPES, which refuses any other count;
h7 pedal Task 9c). An item that is not a symbol pin, an extra item, or a missing one, never
matches. Never a match on free text alone, and never on the type alone.

How many violations one allowance may excuse is each caller's to enforce, and both enforce one:
`erc_sheets.py` fails an allowance matched more than once (zero is reported as stale and passes,
since a block run need not reproduce it); `root_erc.py` fails an allowance matched other than
exactly once, since the root's `.kicad_pro` exclusions must equal the allowances.
"""
import re

ITEM = re.compile(r"^Symbol (\S+) Pin (\S+) \[")
# A PWR_FLAG, as KiCad names it in an item, read as the allowance's PWR_FLAG partner, (`PWR_FLAG`,
# "1"), never by its number (`erc-allowances.ts`, the PWR_FLAG partner; h7 pedal Task 9b). Matched:
# exactly the references the tools give a flag, pin 1, typed Power output - `#PWR<n>`, which akcli
# writes (a one-block root's stub flags), and `#FLG<n>`, to which `root_flag_refs.py` renames a board
# root's flags. Not matched: any other reference, any other pin, any other type (a stock power
# symbol's pin is Power input). Controlled by tests/draught/erc-match-flag.test.ts.
FLAG_ITEM = re.compile(r"^Symbol #(?:PWR|FLG)\d+ Pin 1 \[Power output[,\]]")
FLAG_PARTNER = "PWR_FLAG"


def pin_pairs(violation):
    """The sorted (designator, pin) of each item, or None when any item is not a symbol pin."""
    pairs = []
    for item in violation.get("items", []):
        if FLAG_ITEM.match(item.get("description", "")):
            pairs.append((FLAG_PARTNER, "1"))
            continue
        m = ITEM.match(item.get("description", ""))
        if m is None:
            return None
        pairs.append((m.group(1), m.group(2)))
    return sorted(pairs)


def allowance_pairs(allowance):
    """The allowance's (designator, pin) pairs, sorted: two, or one for a one-item type."""
    return sorted((p["designator"], p["pin"]) for p in allowance["pins"])


def matches(allowance, path, violation):
    """True when `violation`, reported on sheet `path`, is exactly the one `allowance` names."""
    if allowance["sheet"] != path or allowance["type"] != violation["type"]:
        return False
    got = pin_pairs(violation)
    want = allowance_pairs(allowance)
    return got is not None and len(want) in (1, 2) and len(got) == len(want) and got == want


def items_text(violation):
    """The items KiCad names, for a message that says where."""
    return "; ".join(i.get("description", "?") for i in violation.get("items", []))
