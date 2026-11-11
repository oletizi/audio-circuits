# Replaying the h7-carrier repair

**What this is.** The record of how `../h7-carrier.generated-do-not-edit.kicad_sch` was made
from a fresh `make -C boards/h7-carrier draw` (`TOOLING.md` step 5.5). The replay drafts again,
regenerates every op-list from the scripts here, checks each against the committed copy, applies
them, and checks the result against the committed page byte for byte.

| | sha256 |
| --- | --- |
| start: `build/draw/h7-carrier/h7-carrier.kicad_sch`, as `make draw` writes it (re-papered to US Letter) | `106b21a13ceded56135f58f5638ac50d73c32b1e6a83511f9f7c336856a8c5b5` |
| `build/draw/h7-carrier.intent.json`, the intent that draft came from (copied here as `intent.json`) | `e28982a75a5d9502642cd55afc6c45a89da253d21f2ed75e63a57ec13731e57a` |
| end: the committed page | `dc9e93ea4ca6f42249df5faf7004965f83396db9f0c8e366474ca3e3ec5252af` |

## Replay

From the repository root, with a new or empty work directory outside the repository
(`replay.sh` refuses a non-empty one, so nothing an earlier run left there can be read as this
run's result; it stops non-zero, naming the step, when any step cannot run or any file differs):

```
sh drafted/h7-platform/h7-carrier/repair/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. `make -C boards/h7-carrier draw`; checks the generated intent is byte-identical to
   `intent.json` and the draft's sha256 is the start value above. A model change since this
   repair stops the replay here, by name.
2. `python3 net_strokes.py` on the draft: copperhead's stroke for each net. Checked against
   `net_strokes.json`.
3. `python3 01-place.py` on the draft, writing `01-place.json`; checked against the committed copy;
   `akcli plan`, then `akcli draw --apply`, which must report `APPLIED`.
4. `python3 pins.py` on the placed sheet: every pin point akcli reports, cross-checked against the
   sheet's own `lib_symbols`. Checked against `pins.json`.
5. `python3 02-wire.py`, writing `02-wire.json` and its sidecar `02-wire.nets.json`; both checked
   against the committed copies; `akcli plan`, then `akcli draw --apply`.
6. `python3 03-text-edits.py`: wire strokes, fields, the group rectangle and caption.
7. Checks the sha256 is the end value above and the sheet is byte-identical to the committed page.

Toolchain: copperhead 0.12.0 and akcli 0.22.0 under `draughting/` (`make draught-doctor` matched
every pinned tool), kicad-cli 10.0.5, python3, bun. Replayed on 2026-11-11 into a new directory and
reached the end sha256.

Then, to check and look at the result:

```
sh drafted/h7-platform/h7-carrier/repair/verify.sh <sheet.kicad_sch>
sh drafted/h7-platform/h7-carrier/repair/render.sh <sheet.kicad_sch> <out-dir>
```

## The files

| file | what it is |
| --- | --- |
| `intent.json` | the copperhead intent `drawingIntent()` generated from `circuits/h7-platform/carrier-board.ts` at draft time |
| `layout.py` | every part, power symbol and flag position, rotation and mirror, and the band columns, in mils; the one place this page's placement is written |
| `01-place.py` -> `01-place.json` | akcli op-list: delete every copperhead wire, label, junction and no-connect, delete the six power symbols the page does not use, then move and orient every part and the rest of the power symbols to `layout.py` |
| `pins.py` -> `pins.json` | the pin points after 01, from `akcli component --json`, each cross-checked against `lib_symbols` (the `akcli pins` command is not used: `TOOLING.md` step 4 records its mixed units) |
| `02-wire.py` -> `02-wire.json`, `02-wire.nets.json` | akcli op-list: every wire as one straight segment with the net it is drawn for (the sidecar), a junction wherever three or more connections meet, the four no-connects, one local label per breakout-band net, and the title block (date, `comment 1` = `generated - do not edit`) |
| `net_strokes.py` -> `net_strokes.json` | copperhead's per-net wire stroke, read off the draft; refuses a net drawn in two strokes |
| `03-text-edits.py` | what akcli 0.22.0 has no op for: each wire's stroke from its net, every part's Reference and Value and every power symbol's Value as literals, and the group rectangle and caption |
| `netcompare.ts` | `compareSheetToModel` over a `kicad-cli` export, printing all six lists and the count of exported nets that carry a model net name |
| `verify.sh` | the verification set: sha256, parenthesis depth (`depth.py`), the netlist export against the model (`netcompare.ts`), ERC (`erc_counts.py`), the `draughting/measure/` selftest, crossings, junction audit, label survey, paper fit, and `counts.py` |
| `render.sh` | PDF, SVG and a 150 dpi PNG of one sheet |
| `depth.py`, `erc_counts.py`, `counts.py` | copied unchanged from `../../../transistor-preamp/transistor-preamp-staged/repair/` |
