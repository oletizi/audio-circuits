
# Text clearance: minimise and disclose instead of refusing

**Status:** written 2026-10-24. **Architectural** — it changes how every block
in every circuit is graded, not one board. Awaiting the owner's review.

**It implements decisions he has already made**, recorded in
`docs/known-gaps.md` **G260** and **G265** and summarised in
`docs/schematic/text-handling-report.md` §5. **Nothing in those decisions is
re-opened here** and no new acceptance criterion is authored — which matters,
because `CLAUDE.md` forbids an agent authoring the criteria for the artifact it
produces, and **G71** holds that a readability threshold here would be this
project's invention wearing a citation.

One decision is **reserved to him** (§7) and the spec is written so nothing
waits on it.

## 1. The policy, in his words

Three questions were reserved to the owner during the text-handling research and
he answered all three on 2026-10-23:

> **G260:** *"I would rather give guidance to minimize overlap rather than give
> a hard threshold."* … *"re: the measure—take the least dumb choice."*

> **G265 clause 4:** *"default to kicad as prior art"*

> **G260:** *"Complete failure is worse than sub-optimal schematic layout. One
> option is to add a note to the drawing to explain the collision if there
> really is no way to solve the problem."*

The report composes them into one policy: **draw the sheet, measure the overlap,
drive it down under KiCad's own geometry, and where it cannot be driven to zero,
say so on the drawing. Production beats legibility and the cost is disclosed.**

**The prohibition is not on the geometry, it is on the SILENCE.** Nothing is
never-drawn; some things are never drawn *undisclosed*.

**None of it is built.** The report's own words: *"The refusal he overruled is
still in `checkLayout`; nothing minimises; nothing annotates."*

## 2. The key structural fact: the pattern already exists in this tree

**`lib/schgen/render/field-placement.ts` already does exactly what he asked
for, for one class of text.** When no candidate position is clear it does not
refuse — it takes the least-covered one, records a `FieldFallback` carrying the
unit, the `cost` and what it `covers`, and lets the drawing out.
`blockFieldFallbacks` (`:292`) surfaces them, and `pt2399-core` reports **8
fallback field placements** on every run.

**`pt2399-core` is the one board in this repository that draws, and it draws
because of that mechanism.** Had fields been gated the way labels and glyphs
are, the count would be 0 of 11, not 1 of 11.

So this spec is not inventing a mechanism. **It extends a proven in-tree pattern
from fields to the other clearance classes** — which is also why it generalises:
the pattern lives in the placer, and every circuit goes through the placer.

## 3. The two kinds of problem `checkLayout` returns, and the seam that already separates them

`checkLayout` (`lib/schgen/render/layout-check.ts:191`) composes twelve problem
producers into **one flat `string[]`**, and `realiseBlock`
(`lib/schgen/render/blocks.ts:263-266`) throws if that array is non-empty. That
flattening is the defect: **the array mixes two kinds of claim.**

| kind | means | examples | must it refuse? |
| --- | --- | --- | --- |
| **the drawing is WRONG ABOUT THE CIRCUIT** | a reader would take a connection the netlist does not make, or vice versa | missing junction at a branch point, split net, unplaced unit, dangling wire end | **YES.** A note cannot rescue it — the report's words: *"a drawing documenting its own incorrectness"* |
| **the drawing is CROWDED** | every connection is right; something is hard to read | label over label, label over wire, field over pin | **NO.** This is the class he overruled |

**The seam is already in the code.** `lib/schgen/elk/adapt.ts:336-352` splits
exactly this way today: it computes `clearancePairs(problems)` and, when **no
problem names a pair**, returns `invalidGeometry` instead of a clearance
mismatch — with the reasoning that *"a pair nobody can check is worse than a
refusal that says so"*. A problem that yields a checkable pair is gradeable; one
that does not is a correctness refusal.

**So the discriminator is not a new judgement. It is the existing
`clearancePairs` seam, promoted from a message-formatting detail to the thing
that decides refuse-versus-disclose.**

## 3a. THE ORDER OF THIS SPEC IS WRONG AND IS CORRECTED HERE, by the owner looking at a drawing

**Everything below was written on the assumption that the geometry is fixed and
the question is where to put the text.** Shown the first `transistor-preamp-lab`
sheet, 2026-10-24, he said:

> *"what's immediately striking is that the drawing layout is generally good, but
> where there is text overlap, the circuit diagram is crammed really tightly
> together. There's no good reason to cram everything so tightly and then
> complain there's no room for the text."*

**He is right, and `docs/known-gaps.md` G291 has the cause and the
measurement.** `boundaryNodeOf` (`lib/schgen/elk/graph.ts`) hands **every global
label and power symbol to ELK as a node of `width: 0, height: 0`.** The layout
engine packs the circuit believing the text is dimensionless; the text is then
drawn at up to 2043.1 µm tall and lands on things. **The refusal blames the text
for not fitting a space allocated on the assumption that it was not there.**

`[RAN]` one line changed, **no gate touched**: `transistor-preamp-lab` **drew for
the first time**, and `transistor-preamp-loop`'s clearance problems **disappeared
entirely**. 1 of 11 became 2 of 11 with every clearance check in full force.

**SO THE PROGRAMME INVERTS:**

| | was | is |
| --- | --- | --- |
| **first** | stop refusing, measure, disclose | **size the boundary nodes correctly** |
| **then** | widen the label search | reconsider the minimum spacings (**G180**/**G188**) |
| **last** | — | minimise-and-disclose, as the safety net for what genuinely cannot be solved |

**His G260 policy is not weakened — it is re-ordered.** A disclosure mechanism
built first would have disclosed collisions that a correct node size removes
outright, and this repository would have shipped notes about a problem it had
chosen not to fix. The report's own §3 had the sentence and under-weighted it:
*"this generator has no perturbation of any kind."*

**§4 and §5 below are retained as written** because the minimise-and-disclose
half is still needed and still his decision; **§5's yield table is superseded**
by G291's and by the `G284` finding in §5a.

## 4. The design

### 4.1 `checkLayout` returns two lists, not one

Change its return from `string[]` to:

```ts
export interface LayoutProblems {
  /** The drawing would be wrong about the circuit. Refuses, as today. */
  readonly invalid: readonly string[];
  /** The drawing is crowded. Graded and disclosed, never refused. */
  readonly clearance: readonly string[];
}
```

Producers split by kind, with **no producer's predicate changed**:

- **`invalid`**: `placementProblems`, `gridProblems`, `overlapProblems`,
  `shapeProblems`, `checkWireSafety`, `danglingWireEnds`, `componentProblems`,
  `internalSplitProblems`, `anchorProblems` — and the junction disagreement
  raised earlier in `adapt.ts`.
- **`clearance`**: `clearanceProblems` (`body-clearance.ts:92`),
  `textClearanceProblems` (`layout-check.ts:178`), `bodyGlyphProblems`
  (`glyph-clearance.ts:92`).
- **`glyphGlyphProblems` (`glyph-clearance.ts:118`) is §7's reserved
  decision** and is wired to whichever list he names. **Until he answers it
  stays in `invalid`** — the conservative side, because it is the side that
  cannot produce a misleading drawing.

`realiseBlock` throws on `invalid` only.

### 4.2 The overlap measure, exactly as G260 specifies it

**No part of this is chosen here.** G260 records the measure he delegated and
the choice made under that delegation:

> the sum, over every text item, of its **obscured area divided by its own
> area** — scale-free, zero when clean, one fully-buried item contributing 1.0.

And why the alternatives were rejected, which the implementation must not
quietly revisit: **not a pair count**, which has no gradient; **not raw area**,
which prefers burying one label to nicking three.

The rectangle is **`EDA_TEXT::GetTextBox`** per G265 clause 4 — the strictest of
the three measured quantities and the only one that agrees with the tool that
renders and edits the file. Two measured traps travel with it and the
implementation must respect both: the box is sized with **a pen KiCad does not
plot with**, and **any measurement of it taken through SVG export is wrong**,
because SVG omits a global label's outline.

**No weights are invented** — G71 says none are published — so the
per-obstacle-class breakdown is reported **beside** the scalar, never folded
into it.

### 4.3 Disclosure, in two places, because one of them is a drawing

- **On the sheet**, per his third answer: a text note naming each remaining
  collision. This is the half that makes "not refusing" legitimate rather than
  merely permissive.
- **In `RENDER-REPORT.md`**, extending what `blockFieldFallbacks` already
  reports: the scalar, the per-class breakdown, and one line per collision.

**`board-sheets.ts`' existing WARNING line generalises to carry the scalar**, so
a crowded board is loud on every run rather than discoverable only by opening
the sheet.

### 4.4 Phasing, because the unblocking and the improving are separable

**Milestone A — stop refusing, measure, disclose.** §4.1–4.3. This is what moves
the board count; it does not improve a single placement.

**Milestone B — drive the number down.** Two measured levers, neither of which
Milestone A needs:

- **Widen the candidate set.** The placer considers **4** positions per label;
  the research measured the real freedom at **20–1,000, median 80**, via four
  axes proven against `kicad-cli` to leave connectivity unchanged: **rotate**,
  **slide the anchor along the same connection**, **reroute the wire beneath**,
  and **move to another segment of the same net**. All 95 anchors examined are
  wider than the 4 the current mechanism assumes.
- **Rank by cost instead of first-fit.** `field-placement.ts` takes the **first**
  candidate with no overlap and **never consults the cost** unless nothing is
  clear: over 255 unit placements, **202 are settled by the first clear candidate
  and only 53 reach the cost.** So even clean drawings take an arbitrary clear
  slot rather than the best one.

**Milestone A is specified here. Milestone B is named, not specified** — it needs
A's measurement in hand to be graded against, and specifying a search before
there is a number to drive down would be choosing the answer first.

## 5. What this is expected to achieve, measured rather than promised

Re-driven from `bun tools/schgen/board-sheets.ts` at `e796ff6`, the ten boards
that do not draw:

| binding refusal | boards | Milestone A unblocks? |
| --- | --- | --- |
| label over label / over wire / field over pin | **5** | **yes** |
| power glyph touching **another net's** glyph | **2** | **§7's decision decides** |
| missing junction at a branch point | **2** | **no** — correctness |
| `pultec-mid`: `pin 12` at `validateCircuit` | 1 | **no** — never reaches geometry |

**So the honest claim is 5 boards, or 7 if he rules glyph-glyph gradeable.** Not
nine, and not ten.

## 5a. THAT TABLE IS SUPERSEDED, and the correction is the third instance of G274's lesson on this branch

**`[RAN]` a throwaway probe suppressing the clearance refusals only.** The yield
is **not** five boards. It is **one** — `transistor-preamp-lab`. **Six more
immediately hit a different blocker:**

> `generate: two generated files are named pultec-hi-boost.kicad_sch`

That is **G284**'s sheet-name collision, already recorded, and `CLAUDE.md`
already warned it *"will bite whoever unblocks the next board."* It bit six at
once. The true state behind the clearance gate:

| blocker | boards |
| --- | --- |
| drawn | **2** (`pt2399-core`, `transistor-preamp-lab`) |
| **G284** sheet-name collision | **6** |
| missing junction — correctness, stays refused | 2 |
| `pultec-mid` `pin 12` | 1 |

**So the sequence is three small changes, not one:** size the boundary nodes
(§3a), fix **G284**, and keep minimise-and-disclose as the net. Together those
plausibly take the count from 1 to 8. **This is the third time on this branch
that fixing the named problem revealed the next one** — `G274`'s standing
lesson, and the reason no figure here is offered as a promise.

**IT PROMISES NO READABLE DRAWING.** The research is explicit: *"Nothing here
claims any candidate placement is legible. The measurements are of overlap, not
of readability."* A board moving from "refused" to "drawn with a disclosed
collision" is the deliverable. `G285` is the standing warning about what a
generated sheet can look like while passing every check.

## 6. Tests

| | asserts | why it can fail |
| --- | --- | --- |
| 1 | a block with a label-over-label collision **produces a layout** and reports a non-zero scalar | the central behaviour change |
| 2 | **NEGATIVE CONTROL:** a block with a **missing junction** still **refuses**, by message | without this, "stop refusing" could have been implemented as "stop checking" |
| 3 | **NEGATIVE CONTROL:** a split net, an unplaced unit and a dangling wire end each still refuse, by message | the `invalid` list is not a stub |
| 4 | a clean block reports scalar **0.0** and no note | the measure is zero when clean, per G260 |
| 5 | the scalar is **scale-free**: one fully-buried item contributes 1.0 regardless of its size | G260's stated property, not an inference |
| 6 | the scalar **strictly decreases** when a collision is removed from a fixture | a cost with no gradient is the thing G260 rejected |
| 7 | the per-class breakdown is reported **beside** the scalar and no class carries a weight | G71 — no invented weights |
| 8 | the sheet note names **every** remaining collision, and a block with none gets no note | the silence prohibition is the point |
| 9 | the five clearance boards draw; the two junction boards still refuse | §5's claim, end to end |
| 10 | every `boards/*/*.perfboard.vrt` is byte-identical and `make check` stays exit 0 on the five `pultec-*` boards | **CONTROL** — a schematic change must not reach the board path |

**Arms 2 and 3 are load-bearing.** The easy wrong implementation of this spec is
to delete the gate, and arms 2 and 3 are what distinguish it from the right one.
Assertions are on **messages**, never counts.

## 7. RESERVED TO THE OWNER — one question, and nothing waits on it

**Is a power-symbol glyph touching ANOTHER NET'S glyph a crowding problem or a
correctness problem?**

`glyphGlyphProblems` (`glyph-clearance.ts:118`) enforces *"power and PWR_FLAG
glyphs of different nets never meet, and glyphs of one net never overlap."* Two
boards — `transistor-preamp-buffered` and `transistor-preamp-staged` — name
exactly this as their binding clause:

> `the glyph of power symbol GND 0 at (31.75, 27.94) touches the glyph of power symbol VCC 1 at (31.75, 30.48), which is on another net`

**The case for correctness:** two rails whose symbols touch can read as joined,
which is the *"wrong about the circuit"* class his junction reasoning excludes
from disclosure.

**The case for crowding:** they are only *touching*, not overlapping, and a note
plus a non-zero scalar discloses it the way he asked.

**This writer leans correctness and is not deciding it** — it is a judgement
about what his drawings may say, and `CLAUDE.md` reserves that. Until he
answers, `glyphGlyphProblems` stays in `invalid`, those two boards keep
refusing, and **the other five are unaffected.**

## 8. Decisions

| what | who | why |
| --- | --- | --- |
| Minimise overlap; no threshold, ever | owner, 2026-10-23, **G260** | *"I would rather give guidance to minimize overlap rather than give a hard threshold."* |
| The measure: obscured area ÷ own area, summed over text items | owner delegated (*"take the least dumb choice"*), recorded in **G260** | scale-free, has a gradient; a pair count has none and raw area prefers burying one label to nicking three |
| `EDA_TEXT::GetTextBox` is the rectangle | owner, 2026-10-23, **G265** | *"default to kicad as prior art"* — the only ruler that agrees with the renderer |
| Draw it and say so, rather than refuse | owner, 2026-10-23, **G260** | *"Complete failure is worse than sub-optimal schematic layout."* The prohibition is on the silence |
| Correctness problems still refuse | this writer, from his own junction reasoning | a note on a drawing that is wrong about the circuit documents its own incorrectness |
| The refuse/disclose discriminator is the existing `clearancePairs` seam | this writer | it is already the line `adapt.ts` draws; promoting it invents no new judgement |
| `glyphGlyphProblems` stays in `invalid` pending §7 | this writer | the conservative side is the one that cannot produce a misleading drawing |
| Milestone B named, not specified | this writer | a search specified before there is a number to drive down chooses its own answer |
