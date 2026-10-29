Drawing verdicts
================

**This file is the record `EVALUATING-DRAWINGS.md` §5 requires and §7 depends
on.** Approval is state the reviewer writes; it is never derived from a check, a
clean lint, or an absence of findings. Every verdict below is **his words
verbatim**, bound to the sha256 of the exact sheet he was shown.

**THE STATUS VOCABULARY IS DELIBERATELY ABSENT.** The practice design states that
*"an agent may not author the vocabulary its own output is judged in"*, and the
owner has not named a state set. So this file records **what he said** and
nothing more - no agent-chosen word stands in for it. `cargo-vet`'s user-defined
state set with an *implies* lattice is the one surveyed precedent worth reading
before he fixes ours; the survey is in
`docs/research/2026-10-28-git-native-record-tooling.md`.

**This is an interim substrate, not the designed one.** §3 of
`docs/superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`
specifies a committed `drafted/<circuit>/<board>/` directory, an SVG render that
diffs, and a GNU recutils register with an enforced state enum and a staleness
check comparing recorded to computed digests. **None of that is built.** This
file exists so that verdicts already given are not lost while it is - losing one
is the failure the rule was written to prevent.

**The hash is of the sheet, which is the binding.** The render is evidence and
not a binding, and the one measured render digest that would be a second binding
- `sha256(svg minus the generation-title line)` - is not recorded here because
its cross-machine and cross-version stability is **unmeasured**.

---

## pultec-low-boost, hybrid pass 1

- **Sheet** `docs/research/2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch`
- **sha256** `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7`
- **Produced by** copperhead draft, then akcli-kicad repairs
- **Shown** 2026-10-29
- **Verdict, verbatim:**

  > *"the repairs to the drawing make it MUUUUCH better."*

**Carried, not closed** - four items this page still holds, none of which he
named as a defect:

- `#PWR02`, J1's ground, the weakest defence of the four and flagged for
  overrule rather than defended
- the `RV1`/`47K` text graze
- eight single-instance local labels
- the Hi boost group rectangle larger than its contents

**The defect he named on an earlier version of this page, in his words**, because
§8 says the reviewer names the defect and the agent derives the correction - and
these are the corrections' origin:

> *"this ground symbol is folded back on its wire. Ideally, the ground terminal
> of the pot symbol would point down or horizontally so the ground wire doesn't
> hairpin"*

> *"we dont need five discrete ground symbols here. one will suffice if all the
> wires connect."*

> *"i don't see why SI8 isn't at the same level as SI2. SI8 seems oddly far away
> with an unnecessarily long and crooked wire"*

---

## pultec-low-cut, full run

- **Sheet** `docs/research/2026-10-29-low-cut-full-run/low-cut-hybrid.kicad_sch`
- **sha256** `54900d50aad1a1ccca11ee6e827b1325e6e9aae76d37311eb42c75960804494b`
- **Produced by** copperhead draft, then akcli-kicad repairs - the same loop as
  the page above, applied a second time
- **Shown** 2026-10-29
- **Verdict, verbatim:**

  > *"this looks good. Not perfect, but quite serviceable. I would count this
  > effort as a successful application of the process. Obviously, we will improve
  > the process over time, but this is a great start"*

**And on one specific choice in it, unprompted:**

> *"the long rail is the right choice. It's much more clear than a pair of labels
> would have been. On-page labels in place of wires should be used very
> sparingly. I've almost never seen it used"*

**The defect he named on this page**, which the collapse pass below addresses:

> *"There is a duplicate label that should be collapsed"*

---

## pultec-low-cut, after the collapse pass

- **Sheet** `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`
- **sha256** `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d`
- **Produced by** the page above, with both duplicate on-page label pairs
  collapsed to wires; SI5 and SI6 redrawn as a series column to clear the
  corridor
- **Shown** 2026-10-29, as the full page plus before/after crops of the Hi cut
  group
- **Verdict, verbatim:**

  > *"the low-cut page is fine. It's serviceable."*

**Stated to him as not done, and not objected to:**

- the ~40 mm void in the middle of the Hi cut box is not closed; closing it is an
  arrangement change nobody has reviewed
- the `hi_boost_out` label above SI5 sits 1.27 mm below the group box's top edge,
  the smallest gap on the page, nothing overlapping
- `#FLG01` and the four ground symbols are unchanged, including the `#PWR01` put
  up for overruling on the low-boost page

---

## pultec-hi-boost, hybrid full run

- **Sheet** `docs/research/2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch`
- **sha256** `3c2f302b12a8c4c1eb8d1523bc876740d4b509cc8ee47934208471389d3a682c`
- **Produced by** copperhead draft `v2-blocks-own-last`, then 174 akcli ops and 69
  literal text edits. **The Hi boost group's arrangement is agent-authored**, not
  copperhead's: nine capacitors in contact order at 15.24 mm pitch, four
  tapped-coil sections each above the x-span of the capacitors on its tap, four
  tap buses, one 113.03 mm `coil_top` rail. copperhead's Q chain was left exactly
  where it was.
- **Shown** 2026-10-29, as the full page plus before/after crops of eight regions
- **Verdict, verbatim:**

  > *"The hi boost drawing is pretty good. Certainly usable."*

**AND HE NAMED A DEFECT IN THE SAME BREATH, with a crop of it:**

> *"There's a goofy hairpin:"*

The crop is the **Lo boost stand-in group**, `SI7` and its ground. Measured from
the sheet after he pointed at it: `#PWR07` sits at (207.01, 46.99) rotation 0,
**above** `SI7`, and `copperhead_power:GND` draws its graphic 2.54 mm in the sheet's
+y direction - so **the triangle's apex lands exactly on SI7's top pin at
(207.01, 49.53) and covers the whole 2.54 mm wire that reaches it.** The wire
goes up and the symbol comes back down over it. That is the fold.

**It is the third instance of one class**, which is the part worth carrying: the
low-boost page had it on a pot's ground, `#PWR02` on the same page is still up for
overruling, and here it is again. The owner's statement of the cause, from the
first instance: *"Hairpins in general are an indicator of something amiss with
symbol organization, orientation, and/or placement."* **The structural cause here
is that the `lo_boost_in` rail runs along the BOTTOM of the group and both parts
hang upward off it, so every ground in the group is forced to the top.**

---

## pultec-hi-boost, after the Lo boost redraw

- **Sheet** `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch`
- **sha256** `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a`
- **Produced by** the accepted hi-boost page with the Lo boost stand-in group
  redrawn to the `S1` convention: input entering from the left, `SI6` horizontal
  to `out` on the right pointing right, `SI7` shunting down to a ground below it.
  **No copperhead** - the first run of this loop with no drafting step at all.
- **Shown** 2026-10-29, as before/after crops of the group, a close crop of `SI7`
  and its ground, and the whole page
- **Verdict, verbatim:**

  > *"approved."*

**THIS IS THE FIRST DRAWING IN THIS RECORD HE HAS USED THAT WORD FOR**, and it is
recorded as his word rather than normalised into a status - the vocabulary is
still his to name and this file still has no status field.

**What the correction got right, which is the carried lesson.** He named the
hairpin, then named its cause - *"the input below the output, which is goofy ...
output pointing up which is exactly backwards of convention"*. The repair derived
from P1 alone, which this writer had already specified in coordinates, was to
move the grounded part below the rail so its ground stopped folding. **That was a
true repair that would have left the group reading backwards.** Redrawn to the
convention instead, the hairpin disappeared because two parts moved, not because
a wire was re-routed.

**Electrically a no-op, verified three ways** - net partition as `REF.PIN` sets,
net names, and the name-to-pin-set mapping all identical; ERC 0 errors both
sides, 5 pre-existing `lib_symbol_issues` warnings both sides.

**Confined to the group, verified three ways** - the five other group rectangles'
content margins byte-identical, the render differing in one band inside the Lo
boost rectangle, the netlist identical.

**Stated to him as not done, and not objected to:**

- **`Lo boost` was the only inverted group on the page.** The other five all have
  their input at or above their output, were checked, and were deliberately left
  alone - `S1` is followed, never enforced, and he scoped the repair to one group.
- the other three ground symbols' carried Reference offsets, and the four
  different `GND`-text offsets on the page
- the scoped/unscoped net-name mix
- `#PWR01`, J1's ground, still unchanged and still the symbol put up for
  overruling on the low-boost page

---

## What this record is for, beyond not losing a verdict

§7 extends the reviewer role by **demonstrated agreement with the recorded
verdicts**, judged by him. Without these verdicts there is no evidence from
which the role could ever be extended, and published results on an adjacent
structurally-precise domain report *"near-zero agreement with human raters"* for
model-as-judge - so the naive form is already known not to work.

**However many verdicts are above, it is not a basis for anything yet, and the
count is deliberately not written here** - it would be a transcription with a
date on it, and this repository has already had one figure read seven different
values in nine days. Count the `##` headings. Whatever the number, it is small,
every verdict is from one reviewer, and §7 needs **demonstrated agreement**
rather than a tally.
