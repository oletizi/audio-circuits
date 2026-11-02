Task 3 review - KiCad's own field autoplacer, read in full
==========================================================

**Reviewer verdicts.** SPEC COMPLIANCE: **PASS**. TASK QUALITY: **HIGH**.
Verdict on the central claim: **CONFIRMED**.

Commit under review: `187b468` (BASE `76d6a2b`), 2 files, 923 insertions, 0
deletions. Suite re-driven **3785 pass / 0 fail / 43488 expect() across 352
files**. `bun run typecheck` clean, exit 0. `git status --porcelain` empty at
start and at finish; HEAD unchanged at `187b468`; nothing under version control
was modified by this review.

Every statement below is marked CONFIRMED (this reviewer re-drove it) or
RELAYED (taken from the implementer's report). Where a check could have failed,
the failing case is named.

---

1. The provenance: the pinned tag, and every blob
-------------------------------------------------

**CONFIRMED, by a check that could have failed in nine places.** `KICAD_CLI` is
unset here; `lib/kicad/netlist.ts:39` falls through to `lib/kicad/install.ts:94`'s
`darwin` candidate `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`,
which reports **`10.0.5`**. I fetched all nine files named in §3.0 from
`https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/` myself and hashed them:

| file | my SHA-256 prefix | §3.0's table |
| --- | --- | --- |
| `eeschema/autoplace_fields.cpp` (799 lines) | `bfdb8fd1…` | match |
| `qa/tests/eeschema/test_autoplace_fields.cpp` (338 lines) | `42667c1f…` | match |
| `eeschema/sch_field.cpp` | `6283b985…` | match |
| `eeschema/sch_field.h` | `d0be861c…` | match |
| `common/eda_text.cpp` | `314e2615…` | match |
| `include/eda_text.h` | `07664938…` | match |
| `include/font/text_attributes.h` | `8ab8fbd9…` | match |
| `common/font/text_attributes.cpp` | `a7b9823b…` | match |
| `eeschema/tools/sch_edit_tool.cpp` | `7d0e2c07…` | match |

**All nine match to the full 64 hex digits.** A fabricated or
wrong-version read would have shown here. Line counts match too (799 and 338).

Every cited line number checks out at the pinned tag: `sch_field.cpp:468`
(`GetBoundingBox`), `:470` (`GetTextBox( nullptr )`), `:1380`
(`attrs.m_Multiline = false`), `eda_text.cpp:742` (`GetTextBox`), `:784`
(`fudgeFactor = KiROUND( extents.y * 0.17 )`), `text_attributes.cpp:37`
(`m_Multiline( true )`), `sch_edit_tool.cpp:2488` (`AUTOPLACE_MANUAL`).
**CONFIRMED, each by reading the region rather than grepping a paraphrase.**

The `master`-versus-`10.0.5` diff: **CONFIRMED and sharper than claimed**. I
fetched `master` today (794 lines) and diffed: the body is **exactly 15 changed
lines** - licence boilerplate reflow (5 out, 1 in), one Doxygen comment,
`IsInNetlist()`→`DoNetList()`, and `GetPins()`→`GetGraphicalPins( ALL_UNITS,
ALL_BODY_STYLES )` twice. Nothing else. That the fetch reproduces a figure
recorded against a moving branch a day earlier is itself worth having.

---

2. THE CENTRAL CLAIM: `chooseSideForFields`. **CONFIRMED.**
-----------------------------------------------------------

I did not rely on the implementer's quotation. I read the whole 799-line file,
re-derived the control flow from scratch, and hand-traced all six published
traces.

### 2.1 The control flow, re-derived independently

```
sides  = getPreferredSides()            // 4 entries, decreasing preference
reverse(sides)                          // increasing preference
side   = { RIGHT, UINT_MAX }            // the SEED

if aAvoidCollisions:                    // == (algo == AUTOPLACE_MANUAL)
    coll = getCollidingSides()
    side = chooseSideFiltered(sides, coll, COLLIDE_OBJECTS, side)
    side = chooseSideFiltered(sides, coll, COLLIDE_H_WIRES, side)

for s in reversed(sides):  if s.pins == 0: return s        // loop (1)
for s in sides:            if s.pins <= side.pins: side = s // loop (2)
return side
```

`chooseSideFiltered` (lines 479-515) mutates `aSides` by `erase`, and **before
each erase** does `if( it->pins <= sel.pins ) { sel = *it; }`. `sel` enters as
`{RIGHT, UINT_MAX}`, so the first colliding side always takes it, and after the
two calls `side` holds **the colliding side with the fewest pins**. Loop (2)
then admits a survivor only when `each_side.pins <= side.pins`. **So a colliding
side holding the strict global pin minimum cannot be displaced, and the function
returns it while clear sides remain in `sides`.** The seed genuinely survives
into the ranking loop.

### 2.2 The four places a refutation could have hidden, each checked

- **An earlier guard?** None. `chooseSideFiltered` has no early return and no
  `aSides.empty()` test; `chooseSideForFields` has no guard between the filter
  calls and loop (2).
- **An early return?** Loop (1) is the only return before the tail, and it
  iterates the **survivor** list only (`sides` after `erase`). It therefore
  cannot fire when every survivor carries at least one pin - exactly the case
  the finding names. It is a mitigation, not a refutation.
- **A caller-side precondition?** `chooseSideForFields` has **exactly one
  caller**, `DoAutoplace` line 141. I grepped the file for every call site of
  every function named in §3 and read `SCH_SYMBOL::AutoplaceFields` (768) and
  `LIB_SYMBOL::AutoplaceFields` (785) in full. Neither constrains the side.
- **A later overwrite?** No. `sideandpins` flows into `fieldBoxPlacement`, the
  `justifyField` branch and the grid-rounding sign, and nothing re-selects.
  `fitFieldsBetweenWires` changes the box's `y` only, never the side (it returns
  `false` immediately unless the side is already TOP or BOTTOM).

The implementer discloses that seven of nine files were read only at named
functions. I checked that disclosure where it would matter: the finding depends
on nothing outside `autoplace_fields.cpp`, which was read end to end by both of
us.

### 2.3 The six traces, hand-traced from the source

The brief asked for at least two. I did all six, from the published algorithm
plus the pinned file, with no script.

| row | trace | result | §3.3 says | verdict |
| --- | --- | --- | --- | --- |
| 1 | reversed `[B0, L1, T0, R1]`; OBJECTS erases T (sel=`{T,0}`); loop (1) over reversed survivors finds B at 0 pins | **BOTTOM**, loop (1) | BOTTOM, loop (1), clear | **HOLDS** |
| 2 | all four erased: B sets sel=`{B,0}`, L `1<=0` no, T `0<=0` sets sel=`{T,0}`, R no; both loops empty | **TOP** (colliding) | TOP, seed | **HOLDS** |
| 3 | OBJECTS erases T → sel=`{T,0}`; H_WIRES erases B, `0<=0` → sel=`{B,0}`; survivors L1,R1, no zero; loop (2) `1<=0` fails twice | **BOTTOM** (wire-colliding) over clear L/R | BOTTOM, loop (2) | **HOLDS** |
| 4 | reversed `[B2, L4, T1, R4]`; OBJECTS erases T → sel=`{T,1}`; no survivor at 0 pins; loop (2): `2<=1`, `4<=1`, `4<=1` all fail | **TOP** (colliding) with clear BOTTOM available | TOP, loop (2) | **HOLDS** |
| 5 | same with B at 1 pin; loop (2) `1<=1` succeeds | **BOTTOM** (clear) | BOTTOM - the tie saves it | **HOLDS** |
| 6 | AUTO: `aAvoidCollisions` false, seed stays `UINT_MAX`; loop (2) walks B2→sel, L4 no, T1→sel, R4 no | **TOP**, collisions never consulted | TOP, loop (2) | **HOLDS** |

**Six of six hold.** Row 2's secondary claim - that `<=` makes the last tied
side in iteration order win, which because `sides` was reversed is the *most
preferred* of the tied sides - also checks out (tied B and T; reversed order puts
T last; original preference order is R,T,L,B, so T outranks B).

### 2.4 The uncommitted script: its absence is CORRECT

The right question is re-derivability, and the answer is yes. I reproduced all
six traces by hand in a few minutes from §3.3's published pseudocode plus the
hashed blob, with no tooling beyond reading. **The evidence for the claimed
upstream defect does not rest on anything nobody else can run**: it rests on a
799-line file pinned by tag and SHA-256, and on traces published step by step.
The script would have added nothing a reader could check. Not a finding.

### 2.5 One strengthening the document left on the table

**This is a gap in the flattering direction, which is the direction the register
says not to skip.** The file's own header comment (lines 38-44) states the
intended algorithm:

> *"2. If in manual mode, sift out the sides that would cause fields to overlap
> other items … 4. If all sides have pins, choose the side with the fewest
> pins."*

"Sift out" means the colliding sides are **excluded**; the seeding is plainly
there as the all-four-collide fallback. **So the code contradicts its own
documented specification, in the same blob, twelve lines from the top.** That is
the single strongest argument that the behaviour is unintended rather than
designed, and it is the argument an upstream report would want first. §3.3 and
G267(1) argue the finding purely from control flow and never cite it. Nothing in
§3 is wrong here; it is weaker than it had the material to be.

---

3. §1 and §2 untouched. **CONFIRMED.**
--------------------------------------

Not relayed from the report's "0 deletions" claim. Three independent checks:

- `git diff --numstat 76d6a2b 187b468` → `728  0  docs/schematic/text-handling-research.md`
  and `195  0  docs/known-gaps.md`. Zero deletions on both.
- `git diff --unified=0` on the research document yields **one hunk header**,
  `@@ -1457,0 +1458,728 @@` - a pure insertion at the end of the file, which was
  1457 lines at BASE and is 2185 at HEAD.
- `diff <(git show 76d6a2b:…) <(git show 187b468:… | head -1457)` → **no output**.
  The first 1457 lines are byte-identical. This is the check that would have
  caught a one-character edit inside §2, and it did not fire.

`docs/known-gaps.md` is likewise a pure insertion, `@@ -2541,0 +2542,195 @@`.
G267 lands at line 2542, between G266 (2234) and G104 (2737) - the report's
description of the insertion point is accurate, in a 23690-line file.

---

4. The `expect()` accounting. **CONFIRMED, exactly.**
-----------------------------------------------------

The diff touches no file under `tests/`, `lib/` or `tools/` - only the two
documents - so the test and file counts cannot move, and the `expect()` delta
must come from a data-driven loop over document content.

I found the only such loop: `tests/schgen/text-metrics/document-pastes.test.ts:69`,
`for (const n of v.notOutput) expect(n).toMatch(/^line \d+: \S/)`. I then called
`verify()` directly against the document and the committed
`tests/schgen/text-metrics/probe-run.log`:

```
blocks= 32 verified= 14 notOutput= 18 failures= 0
```

and the eighteen `notOutput` entries include **exactly six at lines 1546, 1617,
1694, 1707, 1779, 1813** - which are precisely the six fenced blocks §3 adds
(verified independently by `awk` over the appended range: six opening fences,
`text`, `cpp`, `cpp`, `cpp`, `cpp`, `cpp`). Twelve before, eighteen after,
**+6 expect() exactly as reported.** The other document reader,
`pen-call-sites.test.ts`, mentions the document only in a comment and scans
source files with a fixed assertion count.

**§3 pastes no probe output. CONFIRMED.** `OUTPUT_FENCE` is `"run"`
(`tools/schgen/text-metrics/verify-pastes.ts:62`); none of §3's six fences
carries it, and `verified` gains nothing from §3. So §3 adds nothing to §1.11's
checker contract and needs no committed log. That is the correct call, and the
mechanism - six blocks each reported by name with its line number and first
line - is real rather than asserted.

---

5. Step 3's comparison, re-driven against this repository's source
------------------------------------------------------------------

**The candidate count. CONFIRMED by independent derivation, not relayed.**
`allCandidates` is at `lib/schgen/render/field-placement.ts:153` (cited line
exact). It concatenates three lists:

- `p.freeSides.map(…)` - `freeSides = OUTSIDE_SLOTS.filter((s) => !t.tips.has(s))`
  (line 128), so 1 per pin-free side;
- `INSIDE_SLOTS.map(…)` - `INSIDE_SLOTS` is 5 (`text-boxes.ts:122`: `centre`
  plus four quarters);
- `OUTSIDE_SLOTS.flatMap((s) => besidePinFields(…))` - and
  `besidePinFields` (`text-boxes.ts:156`) **returns `[]` when `tips.length === 0`**
  and exactly 2 otherwise.

So with `p` pinned sides of four: `(4 - p) + 5 + 2p = 9 + p`. **9 when all four
are free, 13 when all four are pinned, 11 for a two-terminal passive.** The
figures and the formula are right. Had `besidePinFields` not returned `[]` for a
free side, the flatMap over all four `OUTSIDE_SLOTS` would have given 13 to 17
and the claim would have failed here.

**The obstacle model, all five axes. CONFIRMED by reading
`field-placement.ts:218-280`:**

1. per-field boxes - `grown(c.fields)` maps over `texts(f)`, one box per field;
2. `MARGIN = GRID / 2` (line 131) with `GRID = 1270` (`geometry.ts:31`) = **635 µm**,
   applied as `growBox(t, MARGIN)` before any test;
3. exact segment test - `covered` uses `segmentHitsBox(s.a, s.b, b)`; `lineBox`
   (a box) appears only inside `area`, the cost function. "The box form is used
   only to weigh cost" is exactly right;
4. the symbol's own interior - `p.interiorBoxes` and `p.strokes` enter only for
   inside candidates, and `p.marks` (pin-polarity marks) always;
5. weighted overlap **area** - `area()` sums `bodies.overlap(b) + marks.overlap(b)`
   with `MARK_WEIGHT = 2` (`occupancy.ts:76`).

**"No perturbation of any kind." CONFIRMED.** `cand = clear ?? chooseLeastCovered(cands, area).candidate`
(line 259), and `cand.fields` is emitted unmodified at line 275. Nothing shifts.

**"No page or frame obstacle at all." CONFIRMED.** `obstacles` (line 221) is
`fixedBodies`, `others`, own body, `fixedMarks`, `placed`, `interiorBoxes` -
grepping `field-placement.ts` for `frame`/`border` returns only a comment about
wire thickness. And the architecture explanation holds: `frames.ts:50-52`,
`drawnBoxes` returns `[...scene.texts, ...scene.bodies].map(n => n.box)` and
`blockContent` (line 72) unions them, so a far-out field enlarges its frame. The
quotation from `text-scene.ts` is **byte-exact** - I grepped the literal string
`boxesOverlap(t.box, f.box) && !strictlyWithin(t.box, f.box)` and it matched at
`text-scene.ts:193`. Quoted exactly, not paraphrased.

**The three corrections. All three CONFIRMED against the prior-art document:**

1. §5(d) at `text-placement-prior-art.md:529` does say *"a `SCH_LINE` collider on
   a vertical side (`!side.x`)"*. `!side.x` selects `SIDE_TOP(0,-1)` and
   `SIDE_BOTTOM(0,1)`, the sides above and below. The correction is right about
   the code. (The old wording is defensible as "a side whose *vector* is
   vertical", so I would call it ambiguous rather than inverted - but §3 names the
   mechanism explicitly and ties it to `fitFieldsBetweenWires`'s identical
   restriction, so a reader is left in no doubt.)
2. §5(c) at lines 516-526 describes only *"If every side collides, the list is
   empty, both subsequent loops do nothing"*. It does **not** state the ordinary
   case. The correction is right.
3. §5 at line 474-475 says *"at `master`, fetched 2026-10-21, **794 lines**"* and
   pins nothing. The correction is right, and the 15-line diff I re-drove
   vindicates §5's substance - the flattering-direction correction the brief
   asked to be looked for is present and earned.

And the claim about `occupancy.ts:72` is substantively right: the comment does
claim independent convergence on two tiers, and §3's distinction (filters over
four candidates on two sides in one mode, versus multipliers on an area over
every candidate) is a fair and useful qualification.

---

6. Step 4's issue work. **Nothing fabricated. CONFIRMED issue by issue.**
-------------------------------------------------------------------------

I re-drove the search myself against the GitLab API, paginating to exhaustion:

```
TOTAL distinct iids: 35     open=4 closed=31
open iids: [11392, 15868, 21703, 25124]
oldest created=2018-08-27   newest created=2026-08-01
15534 present in search result? False
```

**Every figure matches**: 35, 4 open, 31 closed, the two dates. The disclosed
near-miss is real: **#15534 is genuinely absent** from the 35, and it is
genuinely open and genuinely about this algorithm - title *"Auto-placement of
symbol value field only works if first re-annotating"*, state `opened`,
created 2023-08-29. The "35 is a lower bound on a substring, not a census"
framing is correct and the proof holds. Every other issue §3 cites **is** within
the 35 (I checked all 21 cited iids, including the five in cluster 5 - #9766,
#7942, #11529, #8886, #6197 - all present).

**Metadata, spot-checked against the API:** #15868 open / 3 upvotes / 0 comments
/ 2023-10-12 / `priority::wishlist` - **exact**. #25124 open / 2026-08-01 /
wishlist / `librarian-requested` - exact. #19081 closed / `status::fix-committed`
/ `starter` - exact. #9345 25 comments / `fix-released` - exact. #16538
`closed_at` = **2026-01-28** - exact. #19779 `status::as-designed` - exact.
#11392 pcbnew / wishlist / open - exact. Nothing was off.

**Quotations.** I extracted the description of every quoted issue and tested
each quoted fragment as a whitespace-normalised substring. **Twenty of
twenty-two matched verbatim.** The two that did not, I read in full, and both
are legitimate:

- #22927 - the source has markdown bold, `Ref/Value are **rotated 90° (vertical)**
  and aligned differently (stacked along the side), producing a tall footprint…`;
  §3 strips the `**` and marks the elision with an explicit `…`. Correct practice.
- #7706 - the source uses straight double quotes, `Autoplacer always uses
  "Center" alignment for "Horizontally laying" components, such as C2.`; §3
  substitutes single quotes (forced, since the fragment sits inside `*"…"*`) and
  truncates the trailing clause. Acceptable.

**The three pcbnew issues. CONFIRMED** - exactly three of the 35 carry `pcbnew`
or `fp-editor` labels: #11392, #5391, #742.

**The qa tree pagination. CONFIRMED** - I called the tree API at `ref=10.0.5`
for `qa/tests/eeschema`: page 1 returns **100**, page 2 returns **22**, total
**122**, and exactly one filename matches `autoplace`. The disclosed trap is
real: a single-page call would have returned a truncated listing.

**The `[THIRD-PARTY]` code search.** My own
`gh search code 'AutoplaceFields repo:KiCad/kicad-source-mirror'` returns **38**
file hits where §3 says 57 - see Minor 8 - but the load-bearing half reproduces
exactly: **exactly one path under `qa/`, and it is
`qa/tests/eeschema/test_autoplace_fields.cpp`.** So the negative stands.

---

7. Upstream's own tests. **CONFIRMED.**
---------------------------------------

This is the surprising, load-bearing claim, so I checked it directly in the
hashed blob. `qa/tests/eeschema/test_autoplace_fields.cpp`, 338 lines:

- **five** `BOOST_AUTO_TEST_CASE`s, at lines 81, 122, 158, 210, 260;
- the token `AutoplaceFields` appears **once** as code, at line 64, as
  `BOOST_FIXTURE_TEST_SUITE( AutoplaceFields, TEST_AUTOPLACE_FIELDS_FIXTURE )` -
  the suite's **name**. Every other occurrence is prose in a comment. **Not one
  case calls the function.** The claim holds.
- all five `LoadSchematic` the same `issue16538` fixture (lines 85-89, 126-130,
  162-166, 214-218, 264-268), reach a Reference field, set its angle by hand, and
  assert on `GetBoundingBox()` or `GetDrawRotation()`;
- the fifth asserts `heightRatio < 2.0` (line 316), as reported;
- the quoted comment *"Simulate what the autoplacer should do for rotated
  symbols"* is verbatim at line 176.

So "the autoplacer's algorithm is untested upstream" is established at the pinned
tag for the one autoplace-named file, and my independent code search closes the
remaining hole (no other `qa/` file references the symbol).

I also confirmed the multiline premise at the pinned tag, which §3 credits only to
a `[THIRD-PARTY]` search: `grep` over `sch_field.cpp` and `sch_field.h` finds
**zero** occurrences of `SetMultilineAllowed` and exactly one of `m_Multiline`
(`attrs.m_Multiline = false` at 1380). The load-bearing half - `SCH_FIELD` never
sets it, and `Plot` forces it false - is therefore verifiable at `10.0.5` and
slightly under-claimed.

---

8. The invariant: §3 authors no acceptance criteria. **CONFIRMED.**
-------------------------------------------------------------------

- **§3.8 elects nothing**, and says so in terms: *"That `autoplace_fields.cpp`
  uses Q3 is a fact about KiCad, not an argument that this repository should; the
  election is **G265** clause 4 and it is the owner's."* I verified G265 clause (4)
  exists and says what is claimed: *"THE ELECTION IS NOT MADE… Clause (4) is an
  owner decision and **no agent may make it**"* and *"CRITERION: the owner says
  which box…"*. The deference is to a real, owner-reserved election.
- **§3.13's four directions.** Its preamble: *"These are not a plan and not
  criteria."* Three are headed **"MECHANISM, untried"**; the fourth is headed
  **"NOT A MECHANISM, A WARNING"**. The report discloses that fourth shape
  explicitly. No acceptance criterion appears anywhere in §3, and §3.12 closes
  with *"It elects nothing, recommends nothing, and authors no acceptance
  criterion."*
- **§3.12 is a real non-establishment list**, seven items, including the two that
  most constrain the work (nothing was run; seven files read only at named
  functions).

---

9. The register: G267's ten clauses
------------------------------------

**The "nothing was executed" disclosure IS in the committed register**, not only
in the gitignored report. G267 clause (1): *"**Verified** CONFIRMED as a reading
of the source by this writer. **NOT verified as behaviour**: KiCad was not built,
no schematic was loaded into eeschema, and the autoplacer was never executed."*
**CONFIRMED by reading `docs/known-gaps.md` at HEAD.**

CRITERION and MECHANISM are kept distinct where both appear, and the mechanism is
marked as a guess:

- (1) *"CRITERION: a symbol with pins on all four sides, placed so that its
  least-pinned side collides and a clear side with more pins exists, has its
  fields autoplaced (MANUAL) onto the colliding side."* then *"MECHANISM,
  UNTRIED: build KiCad's `qa` eeschema suite … the mechanism is a guess at the
  cheapest route, not a requirement."* This is the house standard, correctly
  applied.
- (6) *"CRITERION to settle: … ; no mechanism is offered."* - declining to guess
  is better than guessing.
- (5) *"MECHANISM, UNTRIED"* with the measurement that would make it worth
  anything named (G260's fifteen fallbacks, re-read for wire blockers).

Confirmed-versus-relaying is marked on (1), (3), (4), (5), (6), (7). Clause (7)
is the model: *"the 2043.1 um figure is RELAYED from §1.4, measured by Task 1,
not re-measured here; the arithmetic and the code reading are CONFIRMED."*
`[THIRD-PARTY]` appears in (2) and (9) and is scoped correctly to the mirror at
`master` in both. The register also carries the measurement that found nothing
wrong - clause (6)'s stale-`field_box` finding, *"recorded because that is the
rule"* - which is the clause an agent under time pressure drops.

Evidence is a check that could have failed throughout: blob hashes, line counts,
a paginated tree listing, a two-blob diff.

See Minor 9 for the three clauses that omit the explicit `Verified` line.

---

10. Evidence markers
--------------------

Tally over the appended range: **7 `[READ]`, 4 `[RELAYED …]`, 2
`[THIRD-PARTY]`, 0 `[RAN]`.** The absence of `[RAN]` is consistent with "nothing
was executed". Every `[READ]` sits on a file whose SHA-256 I verified at the
pinned tag. Both `[THIRD-PARTY]` markers sit at the point of use, not only in the
report: §3.7's parenthetical on the setter-call-site enumeration
(*"a GitHub code search over the `KiCad/kicad-source-mirror` mirror at `master`,
not a read of every file at `10.0.5`"*) and §3.10's corroboration of the test
negative. The brief's specific concern - that the `[THIRD-PARTY]` enumeration be
marked where used - **is satisfied**, and it is in G267(9) as well.

---

11. The #14127 / #16538 link
-----------------------------

The brief asked whether §3 overstates this. **It is hedged correctly in three
places but mis-attributes one of the two issues, and §3's own content refutes
the attribution.** This is the one Important finding; see below.

For **#16538** the mapping is sound: the complaint is *"The function 'Autoplace
Fields' in eeschema overlaps the symbol texts"* and *"I would have expected the
designator and value from C1 to be moved to the bottom right"* - a user-invoked
`O`, i.e. `AUTOPLACE_MANUAL`, with a clear side expected. A legitimate candidate.

---

12. False-green hunt
--------------------

I looked for each of the eleven recorded shapes. **None found.**

- *Tautological assertion* - the +6 `expect()` is driven by a real loop over
  real document content, and I enumerated the eighteen entries rather than
  trusting the arithmetic.
- *Loop over an empty range* - the `notOutput` loop runs 18 times; six of the
  entries are §3's, named by line number.
- *List equals its own sorted copy* - no order assertion added.
- *One-sided perturbation / control returning the treatment's answer* - no new
  tests; §3.3 row 5 and row 6 function as controls on rows 3 and 4 (a tie, and
  the AUTO mode) and both differ from the treatment in exactly one thing.
- *Filter excluding by output line rather than by file* - checked the inverse:
  the `notOutput` entries carry document line numbers that I matched to the
  actual fence positions found by `awk`.
- *Grep for a paraphrase* - I quoted exactly or read the region in every case.
  The `text-scene.ts` quotation matched as a literal; the issue quotations were
  tested as normalised substrings against retrieved JSON, and the two that
  "missed" I read in full rather than accepting or rejecting on the grep.
- *Probe resolving a different dependency version* - the whole provenance chain
  is pinned by tag **and** by SHA-256, and I re-hashed all nine blobs.
- *Evidence only in a gitignored directory* - the one candidate (the uncommitted
  trace script) is not load-bearing: I re-derived all six traces by hand.

One new shape I watched for and did not find: the document could have derived
its comparative verdicts from this repository's own prior-art document rather
than from source. It did not - §3.9's five obstacle axes and the 9-13 count are
each traceable to a named line of `field-placement.ts` or `text-boxes.ts` that I
re-read.

---

Findings
========

**Critical: none.** Nothing is fabricated. Every issue exists and says what is
claimed; every blob hashes to what is claimed; the central finding is real.

Important (1)
-------------

**I-1. §3.3 attributes row 4 to issue #14127, and §3.1 refutes that
attribution.** §3.3 says *"Row 4 is a candidate explanation for issue #14127 and
issue #16538, both of which report fields placed over something with a clear side
visibly available."* **Neither half is true of #14127.** I retrieved it in full:
its reproduction path is *"Adding a symbol to the schematic with symbol field
autoplace enabled"*, and its three complaints are *"doesn't add the 50mil space
anymore"*, *"aren't aligned to the 50mil grid"*, and that the problem is *"most
common on IC symbols"* - a spacing-and-grid report, not an overlap-with-clear-side
report. More decisively: symbol placement passes **`AUTOPLACE_AUTO`** -
I confirmed `sch_drawing_tools.cpp:487` and `:499` at `10.0.5` - so
`aAvoidCollisions` is false, `getCollidingSides()` is never called, and **the
clause-(1) defect cannot fire on #14127's own reproduction path at all.** §3's
own §3.1 and its own row 6 establish exactly this, and §3.11's table row for
#14127 carries the grid quotes that give it away, so the document contradicts
itself across two subsections.

*Failure scenario:* Task 7's synthesis carries "#14127 and #16538 are candidate
instances of the side-selection defect" forward, an upstream report cites #14127
as corroboration, and a maintainer points out in one line that #14127 is an AUTO
-mode grid complaint - discrediting a bug report that is otherwise correct and
well evidenced.

*Why not Critical:* the link is hedged as *"a candidate only"* in §3.3, §3.12 and
G267(10), and the sentence is one clause in a 728-line section whose substance is
unaffected. #16538 remains a sound candidate, and the finding itself does not
depend on either issue. Settling it needs one sentence deleted, or the
attribution narrowed to #16538.

Minor (10)
----------

**M-1. §3.1: "`LIB_SYMBOL` refuses `AUTOPLACE_MANUAL` outright (`wxFAIL_MSG`)"
overstates a debug assertion.** Lines 785-791 have no `return` after the
`wxFAIL_MSG`; execution falls straight into `AUTOPLACER autoplacer( this,
aScreen ); autoplacer.DoAutoplace( aAlgo )` with `aAlgo == AUTOPLACE_MANUAL`. In
a release build `wxFAIL_MSG` compiles out and the manual path runs with whatever
`aScreen` was passed - possibly `nullptr`, in which case `m_colliders` is never
populated and `getCollidingSides` grades against an empty list. The same shape
sits in `SCH_SYMBOL::AutoplaceFields` (line 771, `wxASSERT_MSG` on a null screen,
also no return), which §3 does not claim refuses. It is also in tension with
§3.3(i)'s *"There is no refusal path anywhere in this file"*, which is the
correct reading. *Failure scenario:* a later task investigating a symbol-editor
preview placement rules out the manual branch on §3's authority and looks in the
wrong function.

**M-2. §3.9 trims the claim it is testing, in the direction that makes it easier
to confirm.** It quotes prior-art §9 as *"models more obstacle categories than
KiCad does"*; the source (line 773-774) says *"It also models **far** more
obstacle categories than KiCad does"*. Dropping "far" weakens the hypothesis
before verifying it. The five-axis verification does in fact support the stronger
wording, so nothing substantive turns on it. *Failure scenario:* the practice
generalises to a claim where the dropped intensifier is the part that fails.

**M-3. One-letter misquote.** §3.9 quotes `occupancy.ts:72` as *"reach the same
two tiers independently"*; the file says *"reaches"*. Inside quotation marks.

**M-4. §3.9 and G267(4) present 9-13 as newly quantified, but 11 and 13 were
already in the prior art.** `text-placement-prior-art.md:679` already gives
*"2 free sides + 5 inside + 2 pinned sides x 2 = **11**"* and *"**13** (0 + 5 + 8)"*
with the same decomposition. The genuine extension is the all-free **9** and the
general `9 + p` formula. *Failure scenario:* a later reader credits §3 with a
count the prior art had and reopens a settled comparison.

**M-5. "Byte-identical" overstated by one sentence.** §3.0 and G267(3) say
*"Candidate generation, the collision tiers, the side-selection rule and the wire
fitting are byte-identical"*, then disclose in the very next sentence that
`pinsOnSide` - an input to the side-selection rule, and the source of the pin
counts every trace turns on - is one of the two changed lines. The disclosure is
adjacent and complete, so a reader cannot be misled; the sentence alone can be.

**M-6. The one thing actually executed carries no marker.**
`kicad-cli version` was run and its output (`10.0.5`) is pasted in §3.0's prose,
in a section that tallies 0 `[RAN]` and states *"No part of KiCad was built… the
autoplacer was never executed."* The version string is a driven figure in prose
with no `[RAN]` tag and outside the fenced-block checker contract. I re-drove it
and it is correct; G266 clause (5) already records the prose-figure gap generally.

**M-7. `[READ]` carries two meanings in one section.** §3.0 defines it as *"the
file named was opened in full at this tag"*; §3.11 redefines it locally as *"the
issue's own JSON was retrieved and its description read"*. Declared in place, so
honest - but a reader who skips §3.11's sentence will read the issue table as a
claim about files at a pinned tag.

**M-8. The `[THIRD-PARTY]` "57 hits" figure did not reproduce.** My
`gh search code 'AutoplaceFields repo:KiCad/kicad-source-mirror'` returns **38**
file hits. GitHub code-search totals are unstable and the document may be
counting occurrences rather than files. The load-bearing half - exactly one path
under `qa/`, and it is the autoplace test file - reproduced exactly, and the
figure is marked `[THIRD-PARTY]`, so no conclusion rests on it.

**M-9. Three register clauses omit the explicit `Verified` line.** G267 clauses
(2), (8) and (10) carry no *"**Verified** CONFIRMED / RELAYED"* sentence, where
(1), (3), (4), (5), (6) and (7) do. Each is recoverable from its own prose - (2)
says `[READ]` the file and the tree, (8) and (10) attribute their figures to §1
and to the API respectively - but the register's stated form asks for it
explicitly. Clauses (8) and (10) also carry no "what would settle it"; for both,
nothing is open, so this is form rather than substance. Clause (9)'s disposition
is *"Recorded undiagnosed rather than omitted"*, which is sufficient.

**M-10. A missed upstream finding, inside the file that was read in full.** The
source's own per-orientation comment for power symbols at `SYM_ORIENT_0` (line
360) reads `// TOP, BOTTOM, RIGHT, LEFT`, but the two swaps actually produce
**TOP, BOTTOM, LEFT, RIGHT**. I traced all four orientation cases: 90°, 180° and
270° comments are correct; only the 0° case is wrong, at positions three and
four. §3.3 claims only *"TOP first at 0°"*, so nothing in §3 is incorrect - but
§3's job was to write this file down as an algorithm, and a reader who trusts the
comment gets the fallback order backwards for the commonest power-symbol
orientation. Worth a sentence in §3.3 or a clause in G267.

Also noted, not graded: §2.5 above - the file's own header comment contradicts
the clause-(1) code, and §3 does not cite it. That is the strongest available
evidence for the central finding and it is sitting in the same blob.

---

Verdicts
========

**SPEC COMPLIANCE: PASS.** All five steps delivered against the brief and the
context file.

- *Step 1* - source fetched at the tag matching the resolved `kicad-cli`, the
  version reported and re-derivable, and the provenance pinned by nine SHA-256
  hashes that all verify. Exceeds the brief, which asked only that the file be
  opened.
- *Step 2* - the algorithm is written as an algorithm, not as a summary:
  candidate generation (§3.2), the collision tiers and their mechanism (§3.3),
  `fitFieldsBetweenWires` (§3.5), the side-selection rule when every side
  collides (§3.3(i)) **and** the previously unreported rule when only some do
  (§3.3(ii)-(iii)), and multi-line fields (§3.7). All five requested items
  present. The two per-field placement functions and the grid snap (§3.4, §3.6)
  are beyond the ask, and §3.6's "the snap happens after the collision check and
  nothing re-checks it" is a second real finding.
- *Step 3* - both comparative claims verified against source rather than
  relayed, with the arithmetic re-derivable; the flattering direction recorded
  (five axes where this repository is richer, plus a correction that vindicates
  the prior art's substance); and three things KiCad does that this repository
  does not, with the bait named as bait.
- *Step 4* - 35 issues enumerated with a disclosed lower-bound caveat proved by a
  real counter-example, #15868 retrieved in full, upstream's tests read and the
  surprising negative established, and three near-misses reported rather than
  buried.
- *Step 5* - written, committed, pushed; no AI attribution.

**TASK QUALITY: HIGH.** The central finding is correct, re-derivable without the
author's tooling, and argued from a source pinned two ways. Six of six published
traces hold under independent hand-tracing. Nine of nine blob hashes verify.
Every issue exists and twenty of twenty-two quotations are verbatim, with the
other two legitimately adapted and marked. The `expect()` delta resolves to the
exact six blocks claimed. §1 and §2 are byte-identical. The register entry is
substantive, distinguishes CONFIRMED from RELAYED, keeps CRITERION apart from
MECHANISM, marks the mechanism as a guess, carries the measurement that found
nothing wrong, and records three near-misses including one that was right only by
accident. The invariant holds: §3 elects nothing and authors no criterion.

Against that: one Important finding where the document contradicts itself about
#14127, and ten Minor ones, of which M-1 (a debug assertion read as a refusal) is
the only one that could mislead a later reader about control flow. Both the
Important finding and M-10 are the same shape - a claim about an issue or a
comment accepted a little faster than the source claims in the same section were
- and both are cheap to settle.

**Verdict on the `chooseSideForFields` claim: CONFIRMED.** The seed set by
`chooseSideFiltered`'s `if( it->pins <= sel.pins )` on the sides it **erases**
survives into the fewest-pins loop, which admits a survivor only on
`each_side.pins <= side.pins`. There is no earlier guard, no early return before
the tail other than the zero-pin loop (which iterates survivors only and cannot
fire when every survivor has a pin), no caller-side precondition (one caller,
`DoAutoplace:141`), and no later overwrite (`fitFieldsBetweenWires` moves the
box's `y`, never the side). A colliding side holding the strict pin minimum is
therefore returned while clear sides remain in the list. The file's own header
comment says the colliding sides are *"sift[ed] out"*, so the behaviour
contradicts the documented algorithm - which the document did not notice and
which makes the case stronger, not weaker. Fit for Task 7 and, with I-1's #14127
attribution dropped, fit to put upstream.

Checks run
----------

| check | result |
| --- | --- |
| `SCHGEN_SOURCE=… bun test` | **3785 pass / 0 fail / 43488 expect() across 352 files** (152.75s) |
| `bun run typecheck` | **clean**, `tsc --noEmit`, exit 0, no output |
| `git status --porcelain` | **empty** before and after this review |
| HEAD | `187b468`, unchanged; present on `origin/feature/schematics-tooling` |
| commit attribution | **0 hits** for `co-authored-by|claude|generated with|session`; author and committer are `oletizi <oletizi@mac.com>` |
