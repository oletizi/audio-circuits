"""Re-run the measurements behind the pedal root's two `.kicad_pro` exclusion keys
(draughting/pages/kicad-pro.ts; rulings CR-PEDAL-LM66100-ST-ERC-ROOT-KEY and
CR-PEDAL-ROOT-MIDI-PIN4-ERC; h7 pedal pages plan Task 11b, fix round 1, review M4).

It copies the committed project into a fresh temporary directory (nothing under drafted/ is written),
and for each variant of one key - the other key left as committed - runs `kicad-cli sch erc` and asks
whether kicad-cli HONOURS the key: the violation it names is reported once, `"excluded": true`, and
no separate unmatched marker is added. Each result is compared with the result recorded below, and
the run exits non-zero naming every disagreement, so a kicad-cli that keys exclusions differently is
found here rather than by a passing check that no longer means anything.

The variants:
  ST key (pin_to_pin, U12 pin 5 main, GND's root flag aux): as committed; aux sheet path "/"; aux
  sheet path equal to the main's; the flag's uuid replaced by the nil uuid.
  MIDI_PIN4 key (label_dangling, one item): every combination of "", "/" and "/<root uuid>" in the
  three sheet-path fields (27), the committed one among them.

Recorded with kicad-cli 10.0.5 at Task 11b: the ST key is honoured only as committed. The label key
is honoured exactly when the sheet path is "/<root uuid>" and either the main item path is "" or
"/", or the main item path is "/<root uuid>" and the aux path "/" (seven of 27); kicad-pro.ts writes
"/<root uuid>||". Why the last of those is honoured is not known.

usage: python3 exclusion_key_probe.py       (from anywhere; about a minute and a half)
"""
import itertools
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
HERE = pathlib.Path(__file__).resolve().parent
PROJ = HERE.parents[1]
BOARD = "h7-pedal"
NIL = "00000000-0000-0000-0000-000000000000"
ST, MIDI = "CR-PEDAL-LM66100-ST-ERC", "CR-PEDAL-ROOT-MIDI-PIN4-ERC"


def committed_keys():
    pro = json.load(open(PROJ / f"{BOARD}.kicad_pro"))
    keys = {}
    for key, comment in pro["erc"]["erc_exclusions"]:
        ruling = comment.split(":")[0]
        keys[ruling] = key
    if set(keys) != {ST, MIDI}:
        sys.exit(f"exclusion_key_probe.py: the committed .kicad_pro keys {sorted(keys)}, expected {ST} and {MIDI}")
    return keys


def honoured(work, keys, ruling, vtype):
    pro = {"erc": {"erc_exclusions": [[k, f"{r}: probe"] for r, k in keys.items()]}, "meta": {"filename": f"{BOARD}.kicad_pro", "version": 3}}
    (work / f"{BOARD}.kicad_pro").write_text(json.dumps(pro, indent=2) + "\n")
    out = work / "probe-erc.json"
    subprocess.run([KC, "sch", "erc", "--format", "json", "--severity-all", "-o", str(out), str(work / f"{BOARD}.kicad_sch")],
                   capture_output=True, check=True)
    rows = [v for s in json.load(open(out))["sheets"] for v in s["violations"] if v["type"] == vtype]
    return len(rows) == 1 and bool(rows[0].get("excluded"))


def with_field(key, index, value):
    parts = key.split("|")
    parts[index] = value
    return "|".join(parts)


def main():
    keys = committed_keys()
    root = keys[MIDI].split("|")[5]
    main_path = keys[ST].split("|")[6]
    cases = [
        (ST, "pin_to_pin", "as committed", keys[ST], True),
        (ST, "pin_to_pin", "aux sheet path /", with_field(keys[ST], 7, "/"), False),
        (ST, "pin_to_pin", "aux sheet path = main's", with_field(keys[ST], 7, main_path), False),
        (ST, "pin_to_pin", "flag uuid nil", with_field(keys[ST], 4, NIL), False),
    ]
    for a, b, c in itertools.product(["", "/", root], repeat=3):
        key = "|".join(keys[MIDI].split("|")[:5] + [a, b, c])
        expect = a == root and (b in ("", "/") or (b == root and c == "/"))
        cases.append((MIDI, "label_dangling", f"paths [{a or '-'}][{b or '-'}][{c or '-'}]", key, expect))
    disagreements = []
    with tempfile.TemporaryDirectory(prefix="exclusion-key-probe-") as tmp:
        work = pathlib.Path(tmp)
        for f in PROJ.glob("*.kicad_sch"):
            shutil.copy(f, work)
        for ruling, vtype, name, key, expect in cases:
            got = honoured(work, {**keys, ruling: key}, ruling, vtype)
            print(f"{'honoured' if got else 'not     '}  {ruling} {name}")
            if got != expect:
                disagreements.append(f"{ruling} {name}: recorded {'honoured' if expect else 'not honoured'}, measured {'honoured' if got else 'not honoured'}")
    for d in disagreements:
        print(f"exclusion_key_probe.py: DISAGREES - {d}", file=sys.stderr)
    if disagreements:
        sys.exit(1)
    print(f"exclusion_key_probe.py: all {len(cases)} variants came out as recorded")


main()
