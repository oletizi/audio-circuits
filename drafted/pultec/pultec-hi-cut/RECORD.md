pultec-hi-cut - drafted page record
==================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-hi-cut.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1` |
| Render | `pultec-hi-cut.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `5b77acaad5a939c373758f58bbb4b198e33d1a2b25b9af87a0c3a7640b8b1dda` |
| Approved page came from | `docs/research/2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch`, copied byte-for-byte |
| Produced by | copperhead draft `v4-blocks-mid-late`, then akcli repairs and a field-restating pass |
| Shown | 2026-10-29, as the full page plus before/after crops of the Hi cut group and a crop of the capacitor bank |

Verdict, verbatim
-----------------

> *"looks good. approved"*

The Hi cut group is agent-authored: `lo_boost_in`'s fourteen pins drawn once as
a 193.04 mm rail along the top, ten capacitors vertical beneath it in contact
order at 15.24 mm, six straight selector runs, ten risers.

**THE PITCH WAS MEASURED FOR THIS PART SET, NOT COPIED.** 15.24 mm lands on the
same number as the hi-boost page, and the run established that as a coincidence
of both boards carrying six-character values. **And character count is not a
proxy for text width**, measured off the render at 600 dpi: `2200pF` draws
6.858 mm and `.047uF` 6.223 mm at the same six characters, because the leading
`.` is narrow.

Stated to him as not done, and not objected to
----------------------------------------------

- the Hi cut arrangement is agent-authored and unreviewed as an arrangement
- three unoccupied regions inside the Hi cut rectangle not closed
- `#PWR01` unchanged - the same symbol all four accepted pages have put up for
  overruling, still unruled
- `#FLG01` moved rather than deleted
- the `out` label still against J1's pin-4 number
- `2200pF` left 0.63 mm from its own plate
- one net renamed by label scope; the five pre-existing ERC warnings not
  suppressed

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in `docs/research/2026-10-29-hi-cut-full-run.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-hi-cut.test.ts`, which re-runs it rather than
trusting this paragraph. Component identity and net membership agree exactly.
Two classes of disagreement remain, both a property of the sheet having been
drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`),
  and its `Value` field holds the symbol name rather than the model's
  `6-way selector`
- no part on the sheet carries a `Footprint` field at all
