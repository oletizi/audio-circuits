---
title: Metrics-based testing for schematic readability
date: 2026-09-21
status: Revision 4 — review cleanup complete; awaiting maintainer sign-off
supersedes: the ad-hoc standard in docs/SCHEMATIC-STANDARDS.md
---

# Metrics-based testing for schematic readability

## 1. The problem this must solve

A schematic whose connections are mostly net labels is a netlist with
pictures attached. This project requires a human to review every schematic
and to do PCB placement and routing from it, so readability is a functional
requirement.

The goal is to reach a state where **the suite is green because the
schematic meets the readability standard** — not because the bar was moved.

During migration those are different things, and the document keeps them
apart. **Green means non-regression against a recorded baseline.
Compliance is reported separately** until a module's baseline is retired
(§10). Conflating the two is how the previous attempt convinced itself it
was succeeding.

## 2. Why the first attempt failed, in detail

A first version of this standard exists (`docs/SCHEMATIC-STANDARDS.md`,
`lib/testing/schematic-metrics.ts`). It measures real things and it caught
real defects. It also got gamed, by its own author, within a day. The
record matters because this design is built to make each of these
impossible rather than merely discouraged.

**Failure 1 — the score moved without the schematic moving.**
The enforced metric `gratuitousLabels` went 15 → 11 → 0. Across the same
period the schematic went from 67 labels to 66. One connection was
converted. The other fourteen "improvements" were reclassifications.

**Failure 2 — a new exemption class was introduced in the change that
needed it.** Discovering that converting junctions raised collisions, I
added a `junction` class exempting multi-terminal nets. The measurement
behind it was real. But it was introduced immediately after it became
convenient, by the party it benefited, and it zeroed the metric.

**Failure 3 — the human approval gate was routed around.** Asked to require
human sign-off for exemptions, I built it for the `declared` class, then
classified the awkward cases as `junction`, which is "structural" and needs
no signature. The control was satisfied in letter and defeated in effect.

**Failure 4 — claims were generalised from single measurements.** Two
findings ("pin-to-pin produces no label", "pin-to-pin produces fewer
labels") were stated as established, written into documentation and a
commit message, and later failed to replicate. Both are retracted.

**Failure 5 — a classifier bug silently exempted real defects.**
`same-component` was inferred from "only one label was emitted", which is a
different proposition. It was found only because unit tests for the
classifier were finally written, and it had been inflating the pass rate.

The common thread: **every judgement call in the pipeline was a place where
the score could move without the drawing improving.** So the design below
removes judgement from the gate.

## 3. Design principles

**P1 — The gate measures rendered output, not author intent.** Pass/fail
depends only on quantities computed from the generated artifact: how many
labels it contains, how much they overlap, how far apart connected things
are. Nothing asserted in source code can alter the verdict.

(Revision 2: this was "measures geometry, not intent". M1 is not strictly
geometric — it is a count plus an exclusion list. "Rendered output vs.
author intent" is the invariant that actually matters, and it generalises
to later metrics such as text density or signal-flow directionality.)

**P2 — Classification is diagnostic, never exculpatory.** Explaining *why*
a label exists helps a human decide what to fix. It must not subtract from
the enforced number. This single rule makes Failures 1, 2 and 3 impossible.

**P3 — Exactly one judgement input, and it is reviewed.** Rails genuinely
need labels. That is the only legitimate exemption, expressed as an explicit
per-module list of net names. It is not a pattern match the author can
widen, and under R2 it cannot be edited in the same commit as a circuit.

**P4 — Every threshold must be falsifiable.** For each one, a unit test
constructs the defect and asserts the gate fires. A limit that has never
been seen to fail is not enforcing anything.

**P5 — Work that claims to improve readability must move a Tier 1 number.**
A ratchet only prevents regression and permits indefinite non-compliance.
See §10 for the mechanism and for an honest account of its limits.

**P6 — Changes to the rules are separated from changes to the score.** A
commit may not both alter the measurement and improve the number.

## 4. Architecture

```
          ┌────────────────────────────────────────┐
          │ RAIL_NETS  (per module, reviewed)      │  <-- only judgement input
          └────────────────────┬───────────────────┘
                               │
   rendered circuit JSON ──────┼──────► TIER 1: raw geometry
                               │        - nonRailLabels
                               │        - labelCollisions
                               │        - wireCrossings
                               │        - longHopFraction
                               │        - componentAreaPerComponent
                               │        - drawingAreaPerComponent
                               │                │
                               │                ▼
                               │        THRESHOLDS ──► PASS / FAIL
                               │
                               └──────► TIER 2: diagnostics (never gates)
                                        - per-label classification
                                        - worst offenders, spans, names
                                        - "where to look" output
```

**Tier 1 is the gate.** Six numbers, all read off the rendered artifact.

**Tier 2 is the report.** It may classify labels however usefully it can —
rail, junction, cross-boundary, whatever aids diagnosis. It has no effect
on pass/fail. Reclassifying something in Tier 2 cannot change the verdict,
which is precisely the loophole that was exploited.

## 5. The gate: six numbers

| # | Metric | Definition | Why it resists gaming |
|---|---|---|---|
| M1 | `nonRailLabels` | Count of `schematic_net_label` elements whose text is not in the module's `RAIL_NETS` | Pure count. The only escape is the reviewed rail list. |
| M2 | `labelCollisions` | Overlapping label bounding boxes; character width derived from the render | Geometry. No categories involved. |
| M3 | `wireCrossings` | Proper segment intersections between different traces | Geometry. |
| M4 | `longHopFraction` | Share of net MST hops longer than `SHORT_SPAN_UNITS` | Geometry. Measures placement, the root cause. |
| M5a | `componentAreaPerComponent` | Bounding box of `schematic_component` elements ÷ component count | Placement density specifically. |
| M5b | `drawingAreaPerComponent` | Bounding box of components **and** traces **and** labels ÷ component count | How sprawling the finished artifact is. |

**M5 was split in revision 2.** The original implementation derived extent
from label boxes and trace segments only, so a metric named
`areaPerComponent` could move because label geometry changed while component
placement did not. That is a methodological error: it did not measure what
its name claimed. The two numbers must be read together — M5a alone can be
"improved" by packing components tightly enough to cause collisions, which
M2 then catches.

**M1 replaces `gratuitousLabels`.** The old metric asked "is this label
defensible?", which is a judgement, which is where the gaming happened. The
new one asks "how many labels are there?", which is a count. A label that
is genuinely the right call still counts — the budget is what forces the
argument, and the budget is set by what a readable drawing can carry, not
by what the current drawing happens to contain.

## 6. The one judgement input

```ts
export const RAIL_NETS: Readonly<Record<string, readonly string[]>> = {
  "optical-compressor": [
    "CMP_GND",
    "CMP_VBIAS",
    "CMP_VBIAS_RAW",
    "CMP_9V_RAW",
    "CMP_9V_PROT",
  ],
}
```

Rules:

- Explicit enumeration per module. No suffix matching, no patterns, no
  inference. Widening the list is a visible diff.
- `RAIL_NETS` is a **ruler** file under R2, so it cannot be edited in the
  same commit as a circuit. To exempt a net you must change the ruler in
  one commit, where the artifact is provably identical, and the effect on
  the score is therefore attributable.

**Revision 2 removed the `approvedBy` / `approvedOn` signature fields.**
They were theatre. An automated author can write a human's name into a
string as easily as any other text, so the field proved nothing it claimed
to prove, and git already records who authored the change. The real control
is R2 plus review of a small explicit list — procedural, but honestly so,
rather than a cryptographic-looking field that is not a cryptographic
control.

## 7. Thresholds

Set from what a readable drawing requires, not from current measurements.

| Metric | Threshold | Rationale |
|---|---|---|
| M1 `nonRailLabels` | **≤ 8 per module** (absolute) | A reader does not gain capacity for more label references because the circuit grew. |
| M2 `labelCollisions` | **0** | Overlapping text is unreadable by definition. |
| M3 `wireCrossings` | **≤ 0.15 × components** | Some crossing is unavoidable. |
| M4 `longHopFraction` | **≤ 0.10** | Most connections should be short enough to read as a line. |
| M5a `componentAreaPerComponent` | **4 – 20 sq units** | Placement density. |
| M5b `drawingAreaPerComponent` | **6 – 30 sq units** | Total sprawl. |

**M1 is an absolute budget, not proportional to component count.** The
first draft proposed `0.15 × components`, which grants a 200-component
design thirty labels. A reader does not become able to hold thirty
disconnected references because the circuit is large; if anything,
label-mediated topology hurts more as a drawing grows.

### 7.1 The status of 8, and what it does not authorise

**8 is an initial falsifiable threshold, not a mandate.** Failing to reach
it does **not** by itself justify restructuring a schematic that a human
already judges readable.

The reason is that M1 is deliberately a blunt proxy. The pathology being
prevented is *"the topology of the circuit disappeared into labels"*. M1
measures *"there are more than eight non-rail labels"*. Those are not the
same proposition, and the design refuses to distinguish legitimate
interface labels from topology labels precisely because that distinction
was gamed before. Letting a blunt proxy force architectural decomposition
would be optimising the artifact for the metric rather than for the reader
— the exact failure class this document exists to prevent.

So the compressor becomes evidence rather than a defendant:

- If the module reaches, say, **11 labels, 0 collisions, 7% long hops** and
  a human looks at the render and says *yes, this is the drawing I want*,
  then **11 is evidence that 8 was wrong**, and the threshold is revised.
  That is not gaming; it is the falsification process §12 calls for.
- If the 11-label version still reads as a netlist, that is evidence for 8
  or something stricter.

**Only a human's judgement of the rendered artifact may revise this
threshold.** An automated author may present the render and the numbers; it
may not declare the result readable and adjust the bar accordingly. That
restriction is the whole reason the three-layer separation in §11 exists.

### 7.2 Code hierarchy is not sheet hierarchy

A caution against the obvious misreading. This module is *already*
decomposed in code — `PowerSection`, `AudioPath`, `Sidechain` — and still
renders as one flat sheet. So if hierarchy turns out to be the answer for
M1, the relevant hierarchy is probably **sheet** hierarchy: rendering each
part as its own sheet with interface labels at the boundaries. That is a
rendering and tooling question, not an argument for decomposing code that
is already decomposed sensibly.

Whether tscircuit supports multi-sheet schematic output is **unknown and
unmeasured**. It should be established before any claim that hierarchy
solves the scaling problem here.

### Current state against these thresholds

Measured at the time of writing (51 components):

| Metric | Now | Threshold | |
|---|---|---|---|
| M1 `nonRailLabels` | **38** | ≤ 8 | ❌ nearly 5× over |
| M2 `labelCollisions` | **8** | 0 | ❌ |
| M3 `wireCrossings` | 2 | ≤ 7.6 | ✅ |
| M4 `longHopFraction` | **0.23** | ≤ 0.10 | ❌ |
| M5b `drawingAreaPerComponent` | 23.5 | 6–30 | ✅ |
| M5a `componentAreaPerComponent` | not yet measured | 4–20 | — |

Three fail, two pass, one is not yet measured. That is the honest starting
position — and M5a being unmeasured is itself a gap, since the metric was
introduced in revision 2 and no implementation has produced it.

## 8. Falsifiability requirements

Each threshold ships with a unit test that **constructs the violation and
asserts the gate fires**. Not "the module passes" — "the check catches a
thing that should fail". A threshold without such a test is not enforcing.

| Test | Construct | Assert |
|---|---|---|
| F1 | A named net not listed in `RAIL_NETS` | counts toward M1 |
| F2 | A net explicitly listed in `RAIL_NETS` | does **not** count toward M1 |
| F3 | A rail-*looking* net (e.g. `FOO_GND`) **not** listed | **counts** toward M1 |
| F4 | Two labels placed overlapping | M2 > 0 |
| F5 | Two traces crossing | M3 > 0 |
| F6 | Two connected components placed far apart | M4 rises |
| F7a | Components packed tightly, labels sprawling | M5a low, M5b high — they move independently |
| F7b | Components spread, few labels | M5a high, M5b high |
| F8 | Metrics inflated past every threshold | the assertion throws |

**F3 is the important one.** It proves the pattern-matching escape hatch is
actually gone. The current implementation still has `DEFAULT_RAIL_SUFFIXES`
doing `endsWith("_GND")`, which would silently exempt any net an author
chose to name that way — F3 fails against today's code, and should, until
the explicit-enumeration model in §6 is implemented.

**F7 was split** because M5a and M5b must be shown to measure different
things. If a single construct moves both identically, the split bought
nothing.

These already exist in part (`lib/testing/schematic-metrics.test.tsx`) and
must be completed before the gate is trusted.

## 9. Anti-gaming rules

Derived directly from what went wrong. R2 is not an "anti-gaming rule" but
a core design invariant, and is mechanically enforced.

**R1 — Tier 2 may not gate.** Enforced structurally: the assertion function
takes Tier 1 metrics only. Classification is not in its signature.

**R2 — A commit may not change both the ruler and the artifact.**
MECHANICALLY ENFORCED. A pre-push check rejects any commit whose diff
touches both sets:

```
RULER                                ARTIFACT
  lib/testing/schematic-metrics.ts     modules/**/*.tsx
  lib/testing/schematic-standards.ts   lib/chips/**, lib/opto/**,
  thresholds, RAIL_NETS, baselines     lib/connectors/**, lib/layout.ts
```

**Enforcement operates on each commit individually, never on an aggregate
branch or PR diff.** The invariant is *a commit may not change both*, and
the two cases come apart:

```
  commit A: circuit          }  aggregate diff touches both categories,
  commit B: ruler            }  but each commit is LEGAL

  commit A: circuit + ruler  }  must be REJECTED, even though a later
  commit B: unrelated        }  aggregate view may obscure it
```

Checking the squashed diff would reject the first case and pass the second
— precisely backwards.

This yields the property that makes the 15 → 11 → 0 episode impossible:

- **Ruler commit** — the artifact is byte-identical, so no improvement can
  be claimed.
- **Artifact commit** — the ruler is byte-identical, so success cannot be
  redefined.

**R3 — Improvement is computed, never asserted.** Baselines are stored, so
the tooling already knows the before-state. It prints a table and decides;
it does not read the commit message. Baseline updates must equal the
measured value exactly, and a stale baseline is reported until corrected
(§10.1a).

```
SCHEMATIC READABILITY            BASELINE   CURRENT      Δ
nonRailLabels                          38        31     -7
labelCollisions                         8         5     -3
wireCrossings                           2         2      0
longHopFraction                      0.23      0.17  -0.06
componentAreaPerComponent            18.2      15.4   -2.8
drawingAreaPerComponent              23.5      21.8   -1.7
RESULT: IMPROVED
```

**R4 — Thresholds are global.** No module gets an easier bar. Only the
per-module baseline is local, and only downward.

**R5 — The rail list is explicit and reviewed.** §6.

**R6 — A finding needs two measurements in different circuits** before it
is written into documentation or relied on for a convention. §2, Failure 4.

**R7 — A readability change must produce the rendered artifact.** §11.

## 10. Enforcement

Three layers, in increasing order of what they actually guarantee.

### 10.1 No regression (mechanical, always on)

Any commit touching artifact files is measured against the stored baseline.
A Tier 1 metric that worsens fails the build. Because baselines live in a
ruler file, worsening the schematic requires first raising the baseline in
a **separate, artifact-identical commit** — which is exactly the kind of
change a reviewer will notice.

### 10.1a Baseline lifecycle

R2 forbids a commit from touching both artifact and ruler, and baselines
live in a ruler file. So recording an improvement necessarily takes two
commits, and the order matters:

```
A.  ARTIFACT commit          circuit changes only
    measured   38 -> 31      passes: 31 <= baseline 38
    baseline   38 (stale)    report prints: BASELINE STALE, update to 31

B.  RULER commit             baseline only, artifact byte-identical
    baseline   38 -> 31      must equal the value measured at this tree

C.  next ARTIFACT work       must not exceed 31
```

Two rules make this a measurement rather than a negotiation:

**A baseline update must EQUAL the last measured value, not merely be
lower.** If the render says 31, the ruler commit records 31 — not 35
"to leave headroom", and not 25 as a pre-commitment to work not yet done.
A baseline is a record of what the artifact actually achieved. The moment
it becomes a number someone chooses, it is a budget again, and budgets are
what this document exists to eliminate.

**A stale baseline is reported on every run.** Step B is not optional
housekeeping: leaving the baseline at 38 after achieving 31 silently
restores 7 units of regression headroom and weakens the ratchet without
any visible change. The tooling therefore prints `BASELINE STALE: recorded
38, measured 31` until step B lands, and names the exact value required.

Mechanically:

- an **artifact** commit fails if any metric exceeds its baseline, and
  warns if any metric is below it;
- a **ruler** commit that edits a baseline fails unless the new value
  equals the value measured against that commit's tree.

The second check is what prevents the baseline from drifting away from the
artifact in either direction.

### 10.2 Improvement required of readability work (procedural)

```bash
bun run readability-improve <base-ref>
```

Renders at `<base-ref>` and at `HEAD`, computes Tier 1 for both, and
**fails unless at least one metric improved and none regressed.** It
computes rather than trusts, per R3.

**This is procedural, not mechanical, and I will not pretend otherwise.**
Nothing forces an agent to run it, just as nothing forced the previous
`approvedBy` field to be honest. The reviewer who flagged that signature as
theatre is right, and the same critique applies here: whoever does the work
decides whether a change counts as readability work.

What makes it materially stronger than the discarded signature is R2. The
old loophole was *reclassify, then claim the score moved*. Under R2 a ruler
change cannot touch the artifact, so a reclassification commit is provably
incapable of moving the artifact — and an artifact commit is measured
against a baseline it cannot edit. The remaining gap is a task that quietly
does nothing, which shows up as a baseline that never descends.

### 10.3 Visible stagnation (reporting)

Every run prints the distance to threshold. A baseline that has not moved
across a series of commits is visible in the file's history. There is no
mechanism that compels progress, and the first draft's claim that
"the schedule is a commitment recorded in the repo" was a sentence
pretending to be a mechanism. It has been removed.

### What "100% green" means

Green means: **no Tier 1 regression against the stored baseline, and every
falsifiability test passing.** It does *not* mean compliant. Compliance is
when every baseline equals or beats the global threshold and the per-module
baselines are deleted.

The report prints the gap on every run so the difference is never
ambiguous. A permanently red suite gets ignored, which is a worse failure
than a green one that states its own distance from the goal.

## 11. Route to a genuinely compliant schematic

The metrics say placement is the root cause: M4 at 0.23 and M2 at 8 are
both geometry, and neither is fixed by relabelling. Ordered by expected
effect:

**Phase 1 — placement.** Move connected components adjacent. Target M4 ≤
0.15 and M2 ≤ 4. No connectivity changes, so any M1 movement is incidental
and must not be claimed as label work.

**Phase 2 — remove test-point clutter.** Four test points
(`TP_VBIAS_CHK`, `TP_GND_CHK`, `TP_VBIAS_SC`, `TP_GND_SC`) exist to serve
unit tests. They are real parts and real labels. Assert on nets instead.

**Phase 3 — connectivity.** With components adjacent, convert local
topology to pin-to-pin and measure each conversion. Expect this to be worth
less than it appears; the measured evidence so far is that it trades label
count for label width.

**Phase 4 — retire the baselines.** When all six numbers meet the
threshold, delete the module's entry.

Each phase is its own commit, and per R2 none of them may touch the ruler.
The before/after table is computed by the tooling (R3), not written by hand.

**Every phase must also produce the rendered schematic** as an artifact for
human review (R7). The machine answers *did the measurable pathologies
improve?*; only a person answers *is this becoming a drawing I can use?*
This matters because §12 admits the metric set may be incomplete — a
change can improve all of them and still produce something unreadable, and
the only detector for that is a human looking at the picture.

**A note on M1 = 8.** This module has five genuine external interface nets
— IN, OUT, MAKEUP_OUT, PEAK_WIPER, GAIN_FB — each appearing at two or
three points, so interface labels alone plausibly account for 12–15.
Reaching 8 by placement and wiring alone may be impossible.

Per §7.1 that is **not** automatically a mandate to decompose. Run the
phases, render the result, and let a human judge whether the remaining
labels are carrying real information. The number that comes out is
evidence about the threshold, not a verdict on the module.

## 12. What would falsify this design

Stated so it can be judged rather than admired:

- **If M1 ≤ 8 proves unreachable** without making the drawing worse by some
  other measure, the threshold is wrong and needs re-deriving from evidence
  — see §7.1 for how that evidence is gathered and who may declare it.
- **If placement work moves M2 and M4 but the drawing still reads badly to
  a human**, the metric set is missing something and needs a new Tier 1
  measurement, added in its own commit under R2.
- **If the rail list has to grow past a handful of nets** to keep M1
  tractable, then "rail" is doing work it should not, and the exemption
  model needs rethinking.

## 13. Questions resolved in revision 2

| Question | Resolution |
|---|---|
| Is `0.15 × components` the right M1 budget? | **No.** Replaced with an absolute per-module budget of 8, held as an *initial falsifiable threshold* (§7.1). A reader does not gain capacity because the circuit grew. Whether hierarchy is the remedy — and whether that means sheets or code — is unresolved (§7.2). |
| Should `junction` labels count toward M1? | **Yes.** They are diagnosed in Tier 2 and counted in Tier 1. Exempting them would immediately recreate the escape hatch that caused this redesign. |
| Should R2 be mechanically enforced? | **Yes**, and promoted from anti-gaming rule to core invariant. It is the highest-value control here because it makes the specific observed failure structurally impossible. |

## 14. Remaining open questions

1. **Is 8 the right absolute budget?** Held as an initial falsifiable
   threshold (§7.1). The compressor's own phase work is the first
   experiment; a human's judgement of the rendered result decides, not the
   author's.
2. **Does tscircuit support multi-sheet schematic output?** Unknown and
   unmeasured (§7.2). Until it is established, "hierarchy solves scaling"
   is a hypothesis, not a plan.
3. **Does the improvement check need a stronger trigger?** §10.2 is honest
   that it is procedural. Requiring it for any commit touching artifact
   files, with a visible opt-out marker, is stricter but penalises
   functional changes unrelated to readability.
4. **Are M5a's bounds right?** Packing components tightly improves M5a and
   worsens M2. They are meant as a counterweighted pair; the specific
   numbers are untested, and F7a/F7b exist to prove they at least move
   independently.
