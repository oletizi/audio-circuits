# Dual op-amp test board: the drafted sheet

**TEST DATA, NOT A DRAWING FOR REVIEW.** This is the fixture spec C6 (packages with more than one
unit) is built and checked on before the pedal's dual op-amps use it. It is never sent to the
owner, carries no verdict, and nothing here is a statement about how it looks.
`EVALUATING-DRAWINGS.md` binds on every page this project draws; this is not such a page.

The circuit: `../dual-opamp-board.ts`, one dual op-amp (`Amplifier_Operational:TL072`, three
units: section A, section B, the supply) with both sections wired as buffers, and a six-way header
`J1` carrying every net.

| sheet | role | sha256 |
| --- | --- | --- |
| `dual-opamp-board.kicad_sch` | the one sheet | `b345f056f147bd2552dbd2f5acecd2177ae0d9f997e72ba36e48b0b049bdfdb4` |

## What binds it

`tests/kicad/multi-unit.test.ts` exports this sheet with `kicad-cli` on every run and compares it
with the model (`compareSheetToModel`): no component, net, pin or value disagreement. Its two
negative controls each fail that comparison: section A's and B's `symbolPins` swapped (the nets
land on the other section's pins), and A's mapping duplicated onto B (refused, pin 3 given to
both sections).

## How it was made

`repair/replay.sh` runs `tools/cli/draw.ts` - the program `make draw` runs - from a scratch board
directory (no `perfboard.json` is committed beside a fixture; see the script), checks the derived
intent against `repair/intent.json`, and requires the drafted sheet to reach the sha256 above and
to be byte-identical to the committed one. **No repair op-list is applied**: copperhead's draft
already agrees with the model, so the committed sheet is the draft.

## Checks run, as they read on the day (the test above is what re-derives the comparison)

- The draft places all three units of the TL072 under one reference, `U1` (units 1, 2 and 3).
- `kicad-cli sch erc` on the sheet, from its own directory with no project file: **0 errors,
  9 warnings** - six `lib_symbol_issues` (the drafted power and flag symbols name copperhead's own
  `copperhead_power` library, which no library table here configures) and three
  `lib_symbol_mismatch` on `TL072` (the sheet embeds the symbol flattened from its `LM2904` parent,
  which differs from the library's `extends` form).
