pultec-low-boost - drafted page record
=====================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-low-boost.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7` |
| Render | `pultec-low-boost.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `0cf07216db2731a002c40f96346b99c2f06dbab284976f2d6496a271bc43edd5` |
| Approved page came from | `docs/research/2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch`, copied byte-for-byte |
| Produced by | copperhead draft, then akcli-kicad repairs |
| Shown | 2026-10-29 |

Verdict, verbatim
-----------------

> *"the repairs to the drawing make it MUUUUCH better."*

and, scoping what that counts as:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**THE PARENTHESIS BINDS.** Nothing here says a reviewer's approval can be
inferred from warm words in general. `EVALUATING-DRAWINGS.md` §5 still reads:
approval is state the reviewer writes, never derived.

Carried, not closed
-------------------

Four items this page still holds, none of which he named as a defect. The
register has them in full; they are named here so a reader of the drawing knows
they were seen:

- `#PWR02`, J1's ground
- the `RV1`/`47K` text graze
- eight single-instance local labels
- the Hi boost group rectangle larger than its contents

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in
`docs/research/2026-10-29-hybrid-pass-1.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-low-boost.test.ts`, which re-runs it rather
than trusting this paragraph. Component identity and net membership agree
exactly. Three classes of disagreement remain, every one a property of the sheet
having been drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`)
- `SW1`'s `Value` field holds the symbol name rather than the model's
  `6-way selector`
- six capacitor values and `SI3`'s are written with a leading zero
  (`0.33uF`) where the model writes none (`.33uF`)
- no part on the sheet carries a `Footprint` field at all
