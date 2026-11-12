# Two-block test board: the assembled project

**TEST DATA, NOT A DRAWING FOR REVIEW.** This is the fixture design change C3 (multi-page
drawing) is built and checked on before the H7 module uses it. It is never sent to the owner,
carries no verdict, and nothing here is a statement about how it looks. `EVALUATING-DRAWINGS.md`
binds on every page this project draws; these are not such pages.

The circuit: `../two-block-board.ts`, two copies of one divider block included as `a` and `b`,
sharing the `3V3` and `GND` ports, each with a private `FB` net (`a_FB`, `b_FB` in the model,
`FB` on each page).

## Sheets

One hierarchical KiCad project: the root holds one sheet per block, each block's ports are
hierarchical labels on its own sheet, and the root joins them. `kicad-cli`'s export of the root
is the evidence of how the pages connect; `tests/circuits/two-block-project.test.ts` makes it
fresh on every run and compares it with the model.

| sheet | role | sha256 |
| --- | --- | --- |
| `two-block-board.kicad_sch` | root | `4a1087d10bdff9a269a92e471477928c52597151c10b6c74ae50c5345dcea2c9` |
| `a.kicad_sch` | block a | `230f0598397656930d09f5e8563fdb60f1fe84476a03edcb5df1d081c6a8a235` |
| `b.kicad_sch` | block b | `c410234cbe1bf13a22025105caafac1304b2c82d4b2df8aa3b7d14431b24f966` |

The committed export is `../two-block-board.net`, exported from the root by
`tools/perfboard/netlist-sync.ts`'s `syncNetlistExport` (the source line repository-relative).

## Checks run on the assembled root

- `kicad-cli sch erc -o <report> two-block-board.kicad_sch`, run from this directory with no
  `.kicad_pro` beside it (KiCad's defaults): **0 errors, 0 warnings** across the three sheets.
- `kicad-cli sch export netlist --format kicadsexpr` of the root: four nets, `/3V3`
  {R1.1, R3.1}, `/GND` {C1.2, C2.2, R2.2, R4.2}, `/a/FB` {C1.1, R1.2, R2.1}, `/b/FB`
  {C2.1, R3.2, R4.1}. The two `FB` nets stay two nets although both pages label them `FB`,
  because both labels are local. Stated here as what the export said on the day; the test above
  is what re-derives it.
- `akcli draw`'s own net diff on applying the root op-list: `3V3 (2)`, `FB (3)`, `FB (3)`,
  `GND (4)`.

## How it was made

`repair/REPLAY.md`: a fresh `make draw` (one draft per block), each block's
`01-hierarchical-labels.json`, then the root's starting text and `01-assemble.json`.
`repair/replay.sh` reaches every sha256 above from a new, empty directory.

**The root was regenerated in H7 module Task 7e fix round 1**, by `tools/draught/assemble-root.ts`
alone: its arrangement now fits US Letter (`tools/draught/root-arrangement.ts`, ruling
CR-MODULE-ROOT-FITS-LETTER in `docs/h7-platform/decisions.md`), with sheet pins 100 mil apart and
200 mil stubs. The root's sha256 moved from `7fb295e5b088b19991728fba4ae06934ef0856cabfc38faab0a788fa0ba49389`;
`a.kicad_sch` and `b.kicad_sch` did not change. A fresh `kicad-cli` export of the root differs from
`../two-block-board.net` only in its `(date)` and `(source)` lines, so the committed export stands.
`tests/circuits/two-block-project.test.ts`'s controls pass on the new root.

## What these pages show, recorded as observations and not as a judgement

- Block a and block b each carry two hierarchical labels: `GND` where copperhead had placed its
  local `GND` label, and `3V3` on the top resistor's free pin, which copperhead could not draft
  (a one-pin net). The `3V3` label stands on the lower edge of copperhead's group rectangle.
- The root holds the two sheets, placed by the arrangement's packing, each with its two sheet pins on the left edge,
  each pin wired to a local label naming the parent net.
- Neither block page went through any repair beyond the labels: the fixture exercises the C3
  mechanism, not the draughtsmanship loop.
