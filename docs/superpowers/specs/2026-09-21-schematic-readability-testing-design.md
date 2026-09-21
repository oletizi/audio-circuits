---
title: Metrics-based testing for schematic readability
date: 2026-09-21
status: Draft for review
supersedes: the ad-hoc standard in docs/SCHEMATIC-STANDARDS.md
---

# Metrics-based testing for schematic readability

## 1. The problem this must solve

A schematic whose connections are mostly net labels is a netlist with
pictures attached. This project requires a human to review every schematic
and to do PCB placement and routing from it, so readability is a functional
requirement.

The goal is a **unit test suite that is genuinely green, where green means
the schematic is readable** — not green because the bar was moved.

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

**P1 — The gate measures geometry, not intent.** Pass/fail depends only on
quantities computed from rendered coordinates: how many labels, how much
they overlap, how far apart connected things are. None of these can be
argued with.

**P2 — Classification is diagnostic, never exculpatory.** Explaining *why*
a label exists helps a human decide what to fix. It must not subtract from
the enforced number. This single rule makes Failures 1, 2 and 3 impossible.

**P3 — Exactly one judgement input, and a human owns it.** Rails genuinely
need labels. That is the only legitimate exemption, and it is expressed as
an explicit per-module list of net names that a human approves. It is not a
pattern match the author can widen.

**P4 — Every threshold must be falsifiable.** For each one, a unit test
constructs the defect and asserts the gate fires. A limit that has never
been seen to fail is not enforcing anything.

**P5 — Standing still fails.** The ceiling descends on a schedule. A
ratchet that only prevents regression permits indefinite non-compliance.

**P6 — Changes to the rules are separated from changes to the score.** A
commit may not both alter the measurement and improve the number.

## 4. Architecture

```
          ┌────────────────────────────────────────┐
          │ RAIL_NETS  (per module, human-approved)│  <-- only judgement input
          └────────────────────┬───────────────────┘
                               │
   rendered circuit JSON ──────┼──────► TIER 1: raw geometry
                               │        - nonRailLabels
                               │        - labelCollisions
                               │        - wireCrossings
                               │        - longHopFraction
                               │        - areaPerComponent
                               │                │
                               │                ▼
                               │        THRESHOLDS ──► PASS / FAIL
                               │
                               └──────► TIER 2: diagnostics (never gates)
                                        - per-label classification
                                        - worst offenders, spans, names
                                        - "where to look" output
```

**Tier 1 is the gate.** Five numbers, all geometric.

**Tier 2 is the report.** It may classify labels however usefully it can —
rail, junction, cross-boundary, whatever aids diagnosis. It has no effect
on pass/fail. Reclassifying something in Tier 2 cannot change the verdict,
which is precisely the loophole that was exploited.

## 5. The gate: five metrics

| # | Metric | Definition | Why it resists gaming |
|---|---|---|---|
| M1 | `nonRailLabels` | Count of `schematic_net_label` elements whose text is not in the module's approved `RAIL_NETS` | Pure count. The only escape is the human-owned rail list. |
| M2 | `labelCollisions` | Overlapping label bounding boxes; character width derived from the render | Geometry. No categories involved. |
| M3 | `wireCrossings` | Proper segment intersections between different traces | Geometry. |
| M4 | `longHopFraction` | Share of net MST hops longer than `SHORT_SPAN_UNITS` | Geometry. Measures placement, the root cause. |
| M5 | `areaPerComponent` | Bounding-box area ÷ component count | Bounds sprawl and cramming together. |

**M1 replaces `gratuitousLabels`.** The old metric asked "is this label
defensible?", which is a judgement, which is where the gaming happened. The
new one asks "how many labels are there?", which is a count. A label that
is genuinely the right call still counts — the budget is what forces the
argument, and the budget is set by what a readable drawing can carry, not
by what the current drawing happens to contain.

## 6. The one judgement input

```ts
export const RAIL_NETS: Readonly<Record<string, RailDeclaration>> = {
  "optical-compressor": {
    nets: ["CMP_GND", "CMP_VBIAS", "CMP_VBIAS_RAW", "CMP_9V_RAW", "CMP_9V_PROT"],
    approvedBy: "",        // empty = unapproved = nets are NOT exempt
    approvedOn: "",
  },
}
```

Rules:

- Adding a net to `nets` exempts **nothing** until `approvedBy` is filled by
  a human. An automated author must never populate it.
- The list is per module and explicit. No suffix matching, no patterns, no
  inference. Widening it is a visible diff a reviewer must sign.
- If `approvedBy` is empty, every listed net counts toward M1. The default
  is strict.

This is the whole of the judgement surface. Everything else is arithmetic.

## 7. Thresholds

Set from what a readable drawing requires, not from current measurements.

| Metric | Threshold | Rationale |
|---|---|---|
| M1 `nonRailLabels` | **≤ 0.15 × components** | On ~50 components, ~7 labels. Enough for genuine interfaces and forced renderer cases; not enough to express the topology in text. |
| M2 `labelCollisions` | **0** | Overlapping text is unreadable by definition. |
| M3 `wireCrossings` | **≤ 0.15 × components** | Some crossing is unavoidable. |
| M4 `longHopFraction` | **≤ 0.10** | Most connections should be short enough to read as a line. |
| M5 `areaPerComponent` | **6 – 30 sq units** | Bounds sprawl and cramming. |

### Current state against these thresholds

Measured at the time of writing (51 components):

| Metric | Now | Threshold | |
|---|---|---|---|
| M1 `nonRailLabels` | **~38** | ≤ 7.6 | ❌ 5× over |
| M2 `labelCollisions` | **8** | 0 | ❌ |
| M3 `wireCrossings` | 2 | ≤ 7.6 | ✅ |
| M4 `longHopFraction` | **0.23** | ≤ 0.10 | ❌ |
| M5 `areaPerComponent` | 23.5 | 6–30 | ✅ |

Three of five fail, one badly. That is the honest starting position.

## 8. Falsifiability requirements

Each threshold ships with a unit test that **constructs the violation and
asserts the gate fires**. Not "the module passes" — "the check catches a
thing that should fail". A threshold without such a test is not enforcing.

| Test | Construct | Assert |
|---|---|---|
| F1 | A 2-terminal named net not on the rail list | counts toward M1 |
| F2 | A net on the rail list, `approvedBy` empty | still counts toward M1 |
| F3 | A net on the rail list, `approvedBy` set | exempt from M1 |
| F4 | Two labels placed overlapping | M2 > 0 |
| F5 | Two traces crossing | M3 > 0 |
| F6 | Two connected components placed far apart | M4 rises |
| F7 | Components in a tiny area | M5 below floor |
| F8 | Metrics inflated past every threshold | the assertion throws |

These already exist in part (`lib/testing/schematic-metrics.test.tsx`) and
must be completed before the gate is trusted.

## 9. Anti-gaming rules

Derived directly from what went wrong.

**R1 — Tier 2 may not gate.** Enforced structurally: the assertion function
takes Tier 1 metrics only. Classification is not in its signature.

**R2 — No rule change in a scoring commit.** A commit that modifies
`schematic-metrics.ts` or the thresholds may not also change a circuit
file. Enforceable as a check over the diff, and visible in review either
way.

**R3 — Ceiling changes must cite a raw improvement.** Lowering a ratchet
entry requires the commit to state the before/after Tier 1 numbers. Raising
one is forbidden; a regression is fixed, not accommodated.

**R4 — Thresholds are global, not per module.** A module cannot be given
its own easier bar. Only the descending ceiling is per module, and only
downward.

**R5 — The rail list is human-signed.** Section 6.

**R6 — A finding needs two measurements in different circuits** before it
is written into documentation or relied on for a convention. Section 2,
Failure 4.

## 10. Enforcement: a descending ceiling with milestones

A plain ratchet satisfies "don't get worse" and permits never getting
better. Each module therefore carries a ceiling **and a milestone
schedule**:

```ts
CEILINGS["optical-compressor"] = {
  current:   { nonRailLabels: 38, labelCollisions: 8, longHopFraction: 0.23 },
  milestone: { nonRailLabels: 20, labelCollisions: 4, longHopFraction: 0.15 },
}
```

- Exceeding `current` fails: regression.
- `current` must be re-measured and lowered whenever the schematic
  improves; it is a record, not a budget.
- When `current` reaches `milestone`, the milestone is advanced toward the
  threshold. The schedule is a commitment recorded in the repo.
- When `current` reaches the threshold for every metric, the module's
  ceiling entry is **deleted** and the global threshold applies directly.

**What "100% green" means under this design.** The suite is green while a
module is under its ceiling. That is honest, because the report prints the
distance to the threshold on every run and the milestone forces the gap to
close. Green means "not regressing and on schedule"; it becomes "compliant"
only when the ceilings are gone. A permanently red suite gets ignored,
which is a worse failure than a green one with a printed gap.

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

**Phase 4 — retire the ceilings.** When all five metrics meet the
threshold, delete the module's entry.

Each phase is its own commit with before/after Tier 1 numbers in the
message, per R3.

## 12. What would falsify this design

Stated so it can be judged rather than admired:

- **If M1 ≤ 0.15 × components proves unreachable** without making the
  drawing worse by some other measure, the threshold is wrong and needs
  re-deriving from evidence — not relaxing to fit.
- **If placement work moves M2 and M4 but the drawing still reads badly to
  a human**, the metric set is missing something and needs a new Tier 1
  measurement, added in its own commit under R2.
- **If the rail list has to grow past a handful of nets** to keep M1
  tractable, then "rail" is doing work it should not, and the exemption
  model needs rethinking.

## 13. Open questions for review

1. Is `0.15 × components` the right M1 budget? It is derived from judgement
   about what a reader can hold, not from measurement, and it is the number
   most likely to be wrong.
2. Should `junction` labels count toward M1? Under this design they do. The
   collision evidence for treating junctions differently was real, but
   Failure 2 is a strong argument against letting that become an exemption.
3. Should R2 be mechanically enforced (a check that rejects a commit
   touching both metrics and circuits) or left to review?
