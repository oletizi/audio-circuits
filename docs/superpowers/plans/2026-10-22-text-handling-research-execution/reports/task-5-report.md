# Task 5 report — a global label's coordinates, and the four freedoms it actually has

**Status: DONE_WITH_CONCERNS** (the concerns are scope limits I did not resolve, listed at the end; nothing is broken).

**Commits, all on `feature/schematics-tooling`, all pushed, no AI attribution:**

| SHA | what |
| --- | --- |
| `456d828` | the apparatus: fixtures, the identity/naming reader, the freedom sweep, the fixture-fidelity test, manifest entries |
| `3275bde` | apparatus round 2: the sweep reports WHICH problems remain, not only how many — which is how G269 was found; pair cap raised above the widest joint space |
| `3c36884` | §5 of the document, the committed probe run, the G262 correction, the G259 discharge, G269 and G270, and the pastes checker's third call |

**Suite:** `SCHGEN_SOURCE=... bun test` → **3801 pass / 0 fail / 43614 expect() across 353 files** (HEAD was 3789 / 0 / 43513 across 352).
**Typecheck:** `bun run typecheck` → clean, no output.

## The figures moved, and the move accounted for term by term

| term | delta | what it is |
| --- | --- | --- |
| files | 352 → **353** | `tests/schgen/label-freedom/fixtures.test.ts` |
| tests | 3789 → **3801** (+12) | 5 in `fixtures.test.ts`, 7 in the `document-pastes.test.ts` §5 describe |
| `expect()` | 43513 → **43614** (+101) | **62** from `fixtures.test.ts` (driven alone), **26** from the §5 describe (counted in the source), **13** from the existing *"blocks that are NOT checked are reported by name"* loop, which now names §5's twelve `label-run` blocks and its one ```sh block |

The 13 was driven, not assumed: `verify(doc, log).notOutput.length` is 40 with §5 and 27 with §5's slice removed.

## The verdict on each of the four freedoms

Driven against `kicad-cli` **10.0.5** (re-driven, not taken on trust: `KICAD_CLI` resolves to `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`) on nine fixture schematics I authored and committed, each its base plus **one** edit, with the one-difference property asserted by a test rather than described. **Net IDENTITY** (the partition of connected terminals, names ignored) and **net NAMING** are read out of the same export separately.

| freedom | arm | identity | naming | verdict |
| --- | --- | --- | --- | --- |
| **1 — orientation** | `a1-rotate`, `b2-rotate` | unchanged | unchanged | **EXISTS** |
| **2 — anchor slid along the same connection** | `a2-slide` (wire END → INTERIOR, 6.35 mm) | unchanged | unchanged | **EXISTS** |
| **3 — the wire under it rerouted** | `a4-reroute` (one segment → a three-segment dogleg, anchor stationary) | unchanged | unchanged | **EXISTS** |
| **4 — a different segment of the same net** | `a3-move-segment` (63.5 mm across, 5.08 mm down, onto another stub's interior) | unchanged | unchanged | **EXISTS** |

All nine arms matched a prediction the probe printed **before** exporting a netlist. `arms whose measured result did not match the prediction published above: 0`.

**So G262's *"moving one off an overlap changes the circuit"* is false on all four axes**, and the review's correction is confirmed rather than argued.

## The negative control

**It passes, in the form the brief specifies, and it discriminates.** Fixture B is two wire runs that touch nothing, joined only by two global labels both named `BRIDGE`. Renaming one:

- `b0-base` identity `{R1.1,R2.1} {R1.2} {R2.2}` → `b1-rename-bridge` identity `{R1.1} {R1.2} {R2.1} {R2.2}`.
- The probe reports it in the brief's own terms: `groups GONE from the partition: {R1.1,R2.1}`, `groups ARRIVED: {R1.1} {R2.1}`. **The connection between the two segments disappeared from the partition.**

**And the discrimination the first version of this task could not make is driven as a PAIR of arms that answer differently under the same edit:** `a5-rename-wired` renames the label on a net the wires already hold together — **identity unchanged, naming changed**. So renaming genuinely does change a string without changing the partition, and the control is measuring electrical semantics rather than observing a changed string. The probe prints `DISCRIMINATION ESTABLISHED` only when those two arms disagree, and would print the negation otherwise.

## Step 3, per freedom — and it is not the result the brief expected

Method: perturb the laid-out geometry and re-grade it with **`checkLayout` itself**, the function that refuses the block. Two consequences: every relation the production pass grades is graded (not just box overlap, which is the subset §1.9 re-took), and **an electrically illegal perturbation cannot silently clear an overlap**, because `checkWireSafety`, `danglingWireEnds`, `componentProblems` and `anchorProblems` all run.

**Control:** re-grading every **unperturbed** layout must reproduce the ELK adapter's own verdict — every problem in its refusal text, and clean for every block the adapter accepted. **It passes over all 48 laid-out blocks.** It can fail in both directions.

**Population: 12 of 48 laid-out blocks refuse on a problem naming a global label, not 3.** Thirteen declared cases, covering all eleven boards under `boards/`. Five of the twelve are the same `*-junction` block declared by five Pultec boards.

| freedom, swept | blocks it clears entirely, of 12 |
| --- | --- |
| **1 alone**, exhaustive over 4ⁿ side assignments (largest 4⁶ = 4096) | **5** — every Pultec `*-junction`, at `hi_boost_out:down` |
| **2 alone**, every grid point of the anchor's own segment, side held | **0** |
| **4 alone**, every grid point of the net's other segments, side held | **0** |
| **3 alone**, the anchor's stub lengthened 1–8 steps, all sides | **7** |
| **1+2+4 for one label**, every reachable anchor × every side | **5** (and clears every *label* problem on 5 more) |
| **joint over both labels of each overlapping pair** (widest space 32256, under the 60000 cap, so exhausted) | **5** |
| **any of the above** | **7** |

**So *"no side assignment clears it"* is FALSE for five blocks** — the opposite of what this task was written expecting. *"Nothing clears it"* is true for five, **and three of those five are not a labelling problem at all**: they have every label problem cleared by some freedom and refuse on a defect with no label in it (two on G263's power-glyph class, one on G269's dangling end). **Only two blocks keep a label problem under every freedom tried**: `transistor-preamp/tp-stage` and `transistor-preamp-loop/tp-stage`, the two with the most text in the repository.

**The fixed-anchor framing is therefore not supported by anything measured here.**

**Candidate-set width, which discharges G259's hedge:** over all **95** label anchors of the 48 laid-out blocks, (grid points on the label's own net) × (4 sides) is **min 20, p25 32, median 80, p75 120, max 1000**, and **95 of 95 are larger than four.** Not one anchor has as few as four places to go.

## Step 1 — the literature, with primary sources opened and pinned

The problem is **internal labelling of a LINE feature with a sliding site** — not boundary labelling, not external labelling, not the one-position-per-side model.

- **Bekos, Niedermann & Nöllenburg 2019** (arXiv `1902.01454v2`, SHA-256 `d33b8472…b3877`) gives the vocabulary: a **sliding site** is one *"restricted to be any point of a pre-defined curve in f"*; a **fixed port** model *"restricts the ports to the corners or midpoints of the edges"*. And the sentence that **diagnoses G262's error in the field's own terms**: *"Note that the site of a point feature is always fixed, in fact the site and the feature coincide."* G262 treated the label's feature as a POINT; the feature is a NET, which is a polyline.
- **Wolff, *Automated Label Placement in Theory and Practice*, FU Berlin 1999, Ch. 5 "Line Labeling"** (SHA-256 `a71845d7…a29b4`) is the matching formulation: *"polygonal chains, such as rivers or streets"*, a **candidate strip** along the polyline, hard constraint *"(H3) The label must neither intersect itself nor the polyline"* — which is `pultec-hi-boost-own`'s refusal word for word. And for freedom 4, Imhof relayed: *"label a polyline at regular intervals, especially between junctions with other polylines"*, implemented as *"view each river segment as a separate feature."*
- **Wolff Ch. 3, Definition 3.2** (SHA-256 `01a4ee40…8dcb6`) names what this repository implements: the **four-position model**, whose continuous generalisation is the **four-slider model** — and that is freedom 1 alone.
- **Freedom 3 has no counterpart in either source**, because in both the illustration is an input.
- Imhof's own rules are `[NOT RETRIEVED]` and reach the document only through Wolff Ch. 5, as they do the prior-art pass.

## Register

- **G262 CORRECTED, not extended.** Header rewritten to say the netlist-fact claim has been driven and is false; the wrong paragraph replaced in place by a block that **quotes it verbatim** (it was cited for a day) and says what is actually a netlist fact; its four-candidate mechanism marked **measured** (clears 5 of 12, 0 of the three blocks in its own table) and **still untried**; a Task 5 amendment carrying the four-freedom table, the control, the 12-of-48 population, the per-freedom scoreboard, the mechanism that would clear `tp-leg-emitter-bypass`, and a clause (e) saying what is *not* measured.
- **G259**: the *"may be wider than four"* hedge discharged with the 95-anchor figures.
- **G269 (new)**: this repository refuses an anchor relocation KiCad accepts, through its own `danglingWireEnds` rule; two of the twelve blocks reduce to exactly that one problem. Criterion is a measurement; mechanism marked untried.
- **G270 (new)**: the prior-art pass never reaches line-feature labelling, so *"the formulation that matches this problem exactly"* does not cover global labels. The grep that establishes it was run with a control term that matches.

## Mechanisms found, recorded, and NOT made

The plan is research-only and I made none of these. All are in §5.10 and in the register, marked UNTRIED, and none is a criterion — **G240**'s stands.

1. **`tp-leg-emitter-bypass` — the only thing refusing `transistor-preamp-lab` — reaches ZERO `checkLayout` problems** if `BYPASS_CAP`'s stub is lengthened by **two grid steps** (2.54 mm) and its label put on `down`.
2. Search freedom 1 instead of deriving it: 256 `checkLayout` calls per junction block, five blocks drawn.
3. **The one most likely to matter:** sweep freedom 2 *together with* the wire retraction it implies. Two blocks reduce to the dangling-end problem alone and the sweep I ran cannot reach the fix, because it moves anchors and not wires.
4. The literature's own answer where no discrete candidate works: a candidate strip along the net's polyline, each inter-junction segment its own feature.

## Concerns

1. **Step 3 is under the production ruler only.** §1's three measured quantities need a 2.9 MB font blob fetched outside the repository and KiCad's Python bindings, so a figure taken under them would not be re-drivable from a clean checkout — and the election between them is the owner's (G265 clause 4). §1 found 13/15 and 4/8 collisions surviving all three, so **a per-freedom verdict is expected to move under a different ruler**. §5.11 and G262 clause (e) say so in those words. A candidate that clears by one grid step here may not clear under KiCad's own box. **This is the largest gap in the section and I did not close it.**
2. **The joint space over more than two labels was not exhausted.** Freedom 1 is exhaustive over all of a block's labels; freedoms 2, 3 and 4 are marginal (one label at a time) with a joint sweep only over each overlapping pair. A clearance needing three labels to move at once would not be seen.
3. **Freedom 3 was swept in one bounded form only** — lengthening the stub the anchor sits at the end of. "Adjust the surrounding geometry" is unbounded and an unbounded search would be a placement algorithm, which is not this task's output. The bound is stated in the source and in §5.7.
4. **G262's power-symbol half is untouched.** `ob-buffer`'s two power values were not re-driven, and three of the twelve blocked blocks carry a power-symbol problem.
5. **Nothing here says any candidate the sweep found is LEGIBLE.** `checkLayout` grades clearance. G262 already records that a label drawn on the far side of its anchor reads differently and that this is a legibility judgement; I did not make it.
6. **I loosened one character of a pre-existing assertion** in `document-pastes.test.ts`: *"blocks that are NOT checked are reported by name"* required a non-space immediately after `line N: `, which held only while every block's first line began in column one. §5 pastes indented per-label detail. The pattern now requires the name to carry some non-whitespace rather than to start with it; a blank or all-space first line still fails. The change and its reason are in the test's own comment.
7. **I bounded §4's document slice** in the same file, which ran to the end of the file and would have swallowed §5's twelve blocks and failed §4's pinned count with a message about §4. It now refuses if §5's heading is missing rather than falling back.
8. **`make check` was not run.** Only `bun test` and `bun run typecheck`, as the constraints required. I changed nothing under `lib/` or `circuits/`, and the full suite includes the `kicad-cli` tests that fail rather than skip.
9. **The fixtures live under `tools/schgen/label-freedom/fixtures/`, beside the probe that writes them**, rather than under `tests/`. The context said to commit them with the probe; a reviewer may prefer `tests/`. They are 9 small `.kicad_sch` files, regenerated and content-compared every run.
10. **No pointer was added to `docs/schematic/text-placement-prior-art.md`.** The plan sanctions a pointer where this research *contradicts* that document, and the line-labelling finding is an omission rather than a contradiction. The omission is recorded in G270 and in §5.1 instead. If the controller reads the plan's clause more broadly, a pointer belongs on that document's §4 heading.

---

# Task 5 — fix round 1

**Status: DONE.** All three Importants and all eight Minors addressed. Nothing disputed on the merits; three notes at the end where I went further or differently than the brief's wording.

**Commits** (branch `feature/schematics-tooling`, pushed, clean tree, no AI attribution):

| SHA | what |
| --- | --- |
| `75a9bb8` | apparatus: the fixture RED case drives the real comparison, the residue metric becomes tie-free, the board figure becomes driven, the ruler qualifier moves onto the probe's own summary lines, a sixth arm is added |
| `af19ae5` | §5 and the register: §5.5a at board granularity, ruler qualifiers at every count, the corrected dangling figure, M-3 to M-8 |

**Suite:** **3802 pass / 0 fail / 43551 expect() across 353 files** (round 0 HEAD: 3801 / 0 / 43614 / 353).
**Typecheck:** `bun run typecheck` → clean, no output.

**The figure was predicted term by term before the run** — written to the scratchpad first, then matched exactly:

| term | round 0 | round 1 | delta | why |
| --- | --- | --- | --- | --- |
| `tests/schgen/label-freedom/` | 5 tests, 62 `expect()` | 6, 38 | **+1 test, −24** | Important 1: three tautological assertions gone, three RED cases in whose assertion is one refusal string each, plus a pinned-map completeness check. Fewer and stronger. |
| `tests/schgen/text-metrics/` | 38 tests, 173 | 38, 134 | **0, −39** | Important 2: the NOT-CHECKED case was a 40-iteration per-entry regex loop; it is now one `toEqual` against an independent re-derivation. |
| files | 353 | 353 | 0 | no file added or removed |

Both halves were driven by running each directory alone. **3801 + 1 = 3802; 43614 − 63 = 43551.**

**§1–§4 untouched:** the first 3389 lines of the document hash to `2e9f670d…9101c0` at both `3c36884` and `af19ae5`. The round's diff to that file is 151 insertions / 34 deletions, all of it inside §5.

## Important 1 — the fixture RED case now drives the real comparison

**The finding was right and it was the sharpest one.** The case perturbed a string in memory and asserted the perturbed string differed from the original. Both load-bearing assertions were true by construction, the byte comparison was inline in a different test, and weakening it would have left this "RED" green.

**What it is now.** The comparison is `fixtureProblems(read, list)` — a function of its reader and its lister, with **four named refusal paths** (absent file, content mismatch with the first differing line and both sides, stray file, unrendered arm). Three RED cases hand it a corrupted copy and **assert on the refusal text, not on a count**, because a count would establish only that one of four paths fired. No test writes to disk; the corruption lives in the injected reader.

**The failure text Important 1's case now produces:**

```
a2-slide.kicad_sch DIFFERS from what fixtures.ts builds, first at line 56: on disk "\t(global_label \"SIGNAL\" (shape bidirectional) (at 45.72 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid \"ae8bad41-f7be-422f-86ed-97137ed3ae31\"))", built "\t(global_label \"SIGNAL\" (shape bidirectional) (at 44.45 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid \"ae8bad41-f7be-422f-86ed-97137ed3ae31\"))"
```

**And driving it caught my own error on its first run**: I wrote `line 61` in the expected literal and the real refusal says `line 56`. A count-only assertion would have passed on the wrong number. That is the case earning itself immediately.

The other two refusals: `b0-base.kicad_sch is ABSENT from tools/schgen/label-freedom/fixtures; the probe writes it and the commit must carry it`, and `tools/schgen/label-freedom/fixtures holds a7-left-over.kicad_sch, which no arm of fixtures.ts names`.

## Important 2 — route taken, and the route declined

**ROUTE TAKEN: keep the loosened pattern, and take it out of the assertion entirely.** The NOT-CHECKED case now compares `verify`'s report against `notCheckedByOwnScan(doc)`, an independent re-derivation that walks the raw document's fences rather than reusing `parseBlocks`. **That can fail where the pattern could not** — a wrong line number, a wrong name, or a dropped entry shows up as a list mismatch — and it is a strictly stronger statement of the case's actual intent, which is that nothing leaves the checked population unnamed. **The comment that stated two shapes it supposedly still caught is gone**, since the reviewer drove both and both pass under the old pattern too; a comment stating a fact that driving refutes is worse than the un-failable assertion it was defending.

**ROUTE DECLINED, with the reason in the comment**: changing the probe's own indentation so §5's blocks begin in column one, which would let the original `\S` stand. Declined on two grounds. First, the original pattern would then still be refusing a legitimate shape — a block whose first content line is indented — for no safety gain, which the reviewer's own analysis establishes. Second, the probe's per-label lines are indented under their block header because that is what makes a 516-line log readable. The reviewer's note that the *document-side* dedent was never available is confirmed in the comment: both blocks' first lines are verbatim lines of §5's committed log, so dedenting breaks §5's contiguity check.

## Important 3 — both granularities, with the method for each

§5 gained **§5.5a**, placed after the block figure. It states that the plan's *"three of eleven boards"* is `G262`'s **block** count wearing the word "boards" — three blocks, over four circuits, measured before nine of the eleven boards had an authoring declaration — and that no document had stated the board figure.

**I re-derived the board figure and it agrees with the reviewer's: NINE of eleven.** Every board except `pt2399-core` and `transistor-preamp-feedback`. The per-board rows are a new `label-run STEP 3 BOARDS` paste, driven through `boardRefs` and `declarationFor`, so the mapping is **each board's own `perfboard.json`, matched on the BUILDER** — `G247`'s distinction — and not a directory-name match.

**Neither of the two is thereby fine, and the rows say so**: `transistor-preamp-feedback`'s `tp-stage` is refused **before** `checkLayout` and never reaches a text pass; `pultec-low-boost` is counted through its junction block while its own block is refused earlier too; `pt2399-core` is the one board whose single laid-out block carries no label problem. The board figure is credited to the reviewer in both §5.5a and `G262`'s amendment, with a note that it was re-derived rather than relayed.

## The ruler criterion, now explicit at every point

Every clearing count reads as ruler-dependent **where it is stated**: §5's preamble, the probe's own `RULER:` line inside the pasted summary, §5.7's table header and its freedom-2/4 rows, all four mechanisms in §5.10, `G262`'s scoreboard table and its clause (d), and **`G269`**, which was silent on it. §5.11 now also says what does **not** depend on the ruler — the four freedoms (measured against the netlister), the 12-of-48 and 9-of-11 populations (counted from refusal texts the production grader produced), and §5.6's candidate-set widths (grid points, no text box in them).

## The eight Minors

- **M-1, with its cause, and a second wrong metric found on the way.** `G269` said two; three is right. The count was over each label's lowest-**total** candidate, which on `tp-follower` is the **unperturbed** layout, so the residue reported was the original overlap. Switching to lowest-**label-count** over-counts in the other direction and gives **eight** — candidates tie at zero label problems, the first encountered wins, and `anchorAndSide` iterates points before sides, so a relocation that strands a wire end beats an in-place side change that leaves nothing, sweeping in the five Pultec junction blocks a side change draws cleanly. **The metric is now tie-free**: the fewest-total candidate among those that clear every label problem. **All three figures are printed in the run** so the two that were wrong stay driven rather than described, and `freedoms.ts` documents both failures where the field is defined.
- **M-2.** The summary discloses empty candidate sets per freedom: **freedom 4 had none on 6 of 46 anchors**, freedoms 2 and 3 on none. §5.7's row says the block verdict is not vacuous and why.
- **M-3.** `G262`'s Evidence bullet now says the `[CODE]` claim **was** unmeasured when the bullet was written and **is now measured, and measured false**, pointing at the Task 5 amendment. The original sentence is kept because it is the honest record of what the bullet claimed and did not claim.
- **M-4.** `G259`'s *"nobody has driven a KiCad file with a relocated anchor"* is discharged in place, naming `a2-slide.kicad_sch` and `a3-move-segment.kicad_sch` as exactly such files; *"because Task 5 has not run"* is replaced by what is actually still open, which is `G262`'s unchanged criterion.
- **M-5.** §5.1 and `G270` both now say **four** terms plus the control term that matches five times.
- **M-6.** Covered above: `G269` carries the ruler scope in its figure paragraph, its *"why it is open"* and its criterion — which now requires the comparison to be at the same ruler, since comparing counts taken at two text boxes compares nothing.
- **M-7.** Both places that ended the brief's sentence with a substituted full stop now carry `[...]` and say the sentence continues.
- **M-8.** The §4 block count's upper bound refuses a missing §5 heading instead of falling back, so it reads like its sibling.

## Also in this round

**A sixth A arm, the reviewer's.** `a6-off-wire` moves the label to a point on no wire. `[RAN]`: identity unchanged, **naming becomes `Net-(R1-Pad1)`** — as predicted before the export. It is in §5.3 with the reason it matters: without an arm that answers differently on naming, *"identity unchanged"* four times over could be read as the behaviour of an export that ignores labels. The fixture test pins that exactly three arms predict a changed name and exactly one predicts a changed partition.

## Notes, not disputes

1. **I did not restore the original `\S` pattern**, which the brief left open ("either route settles it"). The reason is in Important 2 and in the test's comment: restoring it would re-impose a rule that refuses a legitimate shape, and the reviewer's own analysis is what establishes that. If the controller wants the original pattern back regardless, the probe-indentation change is mechanical and I will make it.
2. **M-1's fix changed the metric, not just the number.** The number the brief named (3) is what the tie-free metric gives. I also report the two wrong metrics' figures (2 and 8) in the run, because a corrected number with no record of what produced the wrong one is the shape this register exists to prevent. If the controller intended only "say 3 instead of 2", this is more than was asked and the extra is the eight.
3. **`make check` is still RED** on `pt2399-core`'s missing `bomConditions` export and the missing `LEAD_SPANS` entry, as the brief said. I touched neither, did not let it stop me, and did not re-run it.
