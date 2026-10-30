pultec-mid - drafted page record
================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-mid.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8` |
| Render | `pultec-mid.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `ccf3bbca81f169e2da8351fa4f382684b8f9a2680660ca791006c1bc12f5fa8b` |
| Approved page came from | `docs/research/2026-10-29-mid-full-run/mid-hybrid.kicad_sch`, copied byte-for-byte |
| Produced by | copperhead draft `v1-blocks-own-last`, then akcli repairs and a restyle pass |
| Shown | 2026-10-29, as the page plus the Mid group before and after, the capacitor bank, the coil row, and the `no_connect` marker |

Verdict, verbatim
-----------------

> *"looks good. approved"*

and, scoping what that counts as - the ruling he gave on the low-cut page and
which every record under this directory repeats:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**THE PARENTHESIS BINDS.** Nothing here says a reviewer's approval can be
inferred from warm words in general. `EVALUATING-DRAWINGS.md` §5 still reads:
approval is state the reviewer writes, never derived.

**THIS IS THE FIFTH AND LAST PULTEC SECTION BOARD**, and the one that produced no
drawing at all until the same day it was approved. The Mid group is
agent-authored - 28 of the board's 39 parts: seventeen capacitors in contact
order at 15.24 mm staircased to their own contacts, five tap buses at one y,
five winding sections above them, one 200.66 mm `coil_return` rail, eleven
selector runs each a single straight horizontal with no corner.

Stated to him as not done, and not objected to
----------------------------------------------

- the 90.5 x 28.5 mm unoccupied region in the Mid box's upper-left is not
  closed; closing it means moving the return block west or re-laying the group
- `#PWR01` unchanged - **the symbol all five accepted pages have now put up for
  overruling, still unruled**
- `#FLG01` moved rather than deleted; it earns nothing
- the `out` label still against J1's pin-4 number
- the Lo cut stand-in's output sits below its input; `S1` is followed, never
  enforced
- contacts named `sel1`..`sel11` rather than by frequency; `3300pF` left
  0.900 mm from its own plate; values centred rather than left-justified; seven
  nets gained a leading `/` from label scope; the five pre-existing ERC warnings
  not suppressed

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in `docs/research/2026-10-29-mid-full-run.md`, and
the two fixes that stood between no drawing and this one are in
`docs/research/2026-10-29-mid-pin12-nc.md` and
`docs/research/2026-10-29-mid-missing-junction.md`.

**AND `akcli check --layout` WAS WRONG HERE IN BOTH DIRECTIONS** on this page -
claiming an overlap where the render measures 1.896 mm of clear space, and twice
calling a label-over-wire collision on the label's own net - where the written
process knew only that it reports too few findings. Four committed checks were
wrong besides: a sheet holds library pins in two textual forms, and
`junction_audit.py` and `verify.py` dropped one of them, resolving 0 of 5 power
pins and reporting a false orphan junction at the shared ground symbol.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-mid.test.ts`, which re-runs it rather than
trusting this paragraph. Component identity, net membership **and pin identity**
all agree exactly. Two classes of disagreement remain, both a property of the
sheet having been drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1`'s `Value` field holds `SW_Rotary_1x12` and `SW2`'s holds `SW_SPDT`,
  where the model holds `11-way selector` and `boost/off/cut`
- no part on the sheet carries a `Footprint` field at all

**AND ONE CLASS THE OTHER FOUR PAGES CARRY THAT THIS ONE DOES NOT.** They are
drawn with `Switch:SW_Rotary_1x6_MP`, whose mechanical mount lug `MP` is on no
net in the model (`circuits/pultec/schematic/section-board.ts:162`, and
`docs/known-gaps.md` **G282**), so each reports one `pinIdentity` disagreement.
`Switch:SW_Rotary_1x12` has **no `_MP` variant and so no lug**, and this board's
unused twelfth contact is declared not-connected in the model through
`ComponentOverride.ncPins` rather than left to disagree - it appears in the
export as the one-member net `unconnected-(SW1-Pad12)`. So this page's
`pinIdentity` list is **empty**, and the test asserts that emptiness as a claim
rather than omitting it.
