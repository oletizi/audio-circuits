pultec-hi-boost - drafted page record
====================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-hi-boost.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a` |
| Render | `pultec-hi-boost.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `23d8dc4843ef4808c85174cd47a94a85b78f8ae0e144a9775cbb6a5492d9a9f7` |
| Approved page came from | `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch`, copied byte-for-byte |
| Produced by | the accepted hi-boost page with the Lo boost stand-in group redrawn to the `S1` convention. **No copperhead** - the first run of this loop with no drafting step at all |
| Shown | 2026-10-29, as before/after crops of the group, a close crop of `SI7` and its ground, and the whole page |

Verdict, verbatim
-----------------

> *"approved."*

**THIS IS THE FIRST DRAWING IN THE RECORD HE HAS USED THAT WORD FOR**, and it is
recorded as his word rather than normalised into a status - the vocabulary is
still his to name and neither this file nor the register has a status field.

The Hi boost group's arrangement is agent-authored, not copperhead's: nine
capacitors in contact order at 15.24 mm pitch, four tapped-coil sections each
above the x-span of the capacitors on its tap, four tap buses, one 113.03 mm
`coil_top` rail.

Electrically a no-op against the page before it, verified three ways - net
partition as `REF.PIN` sets, net names, and the name-to-pin-set mapping all
identical; ERC 0 errors both sides, 5 pre-existing `lib_symbol_issues` warnings
both sides.

Stated to him as not done, and not objected to
----------------------------------------------

- **`Lo boost` was the only inverted group on the page.** The other five were
  checked and deliberately left alone - `S1` is followed, never enforced, and he
  scoped the repair to one group
- the other three ground symbols' carried Reference offsets, and the four
  different `GND`-text offsets on the page
- the scoped/unscoped net-name mix
- `#PWR01`, J1's ground, still unchanged and still the symbol put up for
  overruling on the low-boost page

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in
`docs/research/2026-10-29-hi-boost-hairpin-fix.md` and
`docs/research/2026-10-29-hi-boost-full-run.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-hi-boost.test.ts`, which re-runs it rather
than trusting this paragraph. Component identity and net membership agree
exactly. Two classes of disagreement remain, both a property of the sheet having
been drawn outside `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`),
  and its `Value` field holds the symbol name rather than the model's
  `6-way selector`
- no part on the sheet carries a `Footprint` field at all. Seven of this board's
  parts - the four tapped coil sections, both pots and the selector - declare no
  footprint in the model either, so for those there is nothing to compare in
  EITHER direction and the comparison says nothing about them
