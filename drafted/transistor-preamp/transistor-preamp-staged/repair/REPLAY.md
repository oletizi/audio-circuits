# Replaying the fixed-stage-one repair

**What this is.** The record of how `circuits/transistor-preamp/staged-board.kicad_sch`
went from the page promoted in `288bd0a` to the page with stage 1 fixed, per
`docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md`.
It is a repair of an existing page (`TOOLING.md` step 5.5's last paragraph), so
there was no draft and there is no `intent.json`: the replay starts from the
previous committed sheet, not from `make draw`.

| | sha256 |
| --- | --- |
| start: `circuits/transistor-preamp/staged-board.kicad_sch` at `288bd0a` | `402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493` |
| end: the repaired sheet | `31a5e0c47ebf3a2ee1d94e6d3c0d62d534137e86690863abfbe9411fba04422e` |

The copperhead page beside this directory
(`../transistor-preamp-staged.generated-do-not-edit.kicad_sch`) is NOT the
start of this replay and is not changed by it; see `../RECORD.md`.

## Replay

From the repository root, with a new or empty work directory outside the
repository (`replay.sh` refuses a non-empty one, so nothing an earlier run
left there can be read as this run's result; it and `verify.sh`, `render.sh`
and `crop.sh` stop non-zero, naming the step, when any step cannot run):

```
sh drafted/transistor-preamp/transistor-preamp-staged/repair/replay.sh <work-dir>
```

`replay.sh` does, in order, and refuses on any sha256 mismatch:

1. `git show 288bd0a:circuits/transistor-preamp/staged-board.kicad_sch` (and its
   `.kicad_pro`) into `<work-dir>`; check the sha256 is the start value above.
2. `akcli plan` then `akcli draw --apply` with `01-fixed-stage-one.json`.
3. `akcli plan` then `akcli draw --apply` with `02-feedback-row.json`.
4. `python3 03-text-edits.py <work-dir>/staged-board.kicad_sch`.
5. Check the sha256 is the end value above.

Toolchain: akcli 0.22.0 at `draughting/venv-akcli/bin/akcli`, python3, git.
Replayed on 2026-11-02 and reached the end sha256.

Then, to check and look at the result:

```
sh drafted/transistor-preamp/transistor-preamp-staged/repair/verify.sh <work-dir>
sh drafted/transistor-preamp/transistor-preamp-staged/repair/render.sh <work-dir>
sh drafted/transistor-preamp/transistor-preamp-staged/repair/crop.sh <work-dir>
```

## The files

| file | what it is |
| --- | --- |
| `01-fixed-stage-one.json` | akcli op-list, 38 ops: delete RV1-RV4 and the wires and junctions that served only them; draw R1's row to RV1's old pin-3 end, R2 and C1 straight down to the GND rail, R3 straight down to the collector junction; merge the base wire, the GND rail and the C3 wire where a removed wiper had split them; set R1 820K, R2 270K, R3 2.7K |
| `02-feedback-row.json` | akcli op-list, 4 ops: move R1 to RV1's old position (77.47, 83.82) so its pin 2 meets the base-wire vertical's top end, and redraw the row from its pin 1 to the collector column |
| `03-text-edits.py` | the direct text edits akcli has no op for: each new wire gets the stroke (0.254 mm, and the net's colour where it has one) of the pre-existing wires it meets, refusing if they disagree; the `Device:R_Potentiometer_Trim` library entry, used by no instance after RV1-RV4 go, is removed |
| `geometry.py` | the query used to write 01 and 02: pin points from `akcli component --json`, each cross-checked against the sheet's own `lib_symbols` reading, and every wire and junction around stage 1 with its uuid |
| `verify.sh` | the verification set: sha256, parenthesis depth (`depth.py`), the netlist export against the model (`netcompare.ts`), ERC (`erc_counts.py`), `draughting/measure/` selftest, crossings, junction audit, label survey, paper fit, and `counts.py` |
| `render.sh`, `crop.sh` | the whole-page render (PDF, SVG, 150 dpi PNG) and the stage-1 crop at 300 dpi |
