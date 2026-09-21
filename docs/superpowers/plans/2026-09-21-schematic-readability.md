# Schematic Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the optical compressor's schematic from its recorded baseline toward the readability thresholds, one measured artifact change at a time, and establish empirically whether the thresholds are reachable in tscircuit.

**Architecture:** The ruler is already built and frozen (Tier 1 gate, explicit rail lists, recorded baselines, falsifiability tests, mechanical R2). This plan is almost entirely **artifact work**: moving components and changing connectivity, measured against a ruler nobody is allowed to adjust in the same commit. One small ruler task comes first because the gate currently reports a score with no actionable gradient.

**Tech Stack:** tscircuit 0.0.1253, TypeScript 5.9 strict, Bun 1.3, `rsvg-convert`/`magick` for rendering review artifacts.

**Spec:** `docs/superpowers/specs/2026-09-21-schematic-readability-testing-design.md` (revision 4). Read §7, §9, §10, §11 before starting.

## Global Constraints

**R2 IS MECHANICAL AND APPLIES TO EVERY TASK.** A commit may not change both the ruler and the artifact.

The check inspects **commits**, not the working tree, so it runs *after*
committing: `bun run check-r2 HEAD~1` verifies the commit just made.
(`check-r2 HEAD` checks the empty range `HEAD..HEAD` and always passes —
verified; do not use it.) With no argument it checks everything unpushed,
which is the right call before a push.

If it reports FAIL, split the commit:
```bash
git reset --soft HEAD~1
git add <ruler files>   && git commit -F <ruler message>
git add <artifact files> && git commit -F <artifact message>
```

| RULER — never in the same commit as artifact | ARTIFACT |
|---|---|
| `lib/testing/schematic-*` | `modules/**/*.tsx` (non-test) |
| `scripts/check-r2.ts` | `lib/chips/**`, `lib/opto/**`, `lib/connectors/**` |
| the design doc, `docs/SCHEMATIC-STANDARDS.md` | `lib/layout.ts`, `index.circuit.tsx` |
| `RAIL_NETS`, `THRESHOLDS`, `BASELINES` | |

- **Never raise a `BASELINES` entry.** Baselines record what the artifact achieved. A regression is fixed, not accommodated.
- **A baseline update must EQUAL the measured value**, not merely be lower. Not "headroom", not a pre-commitment (§10.1a).
- **Recording an improvement takes two commits**: artifact commit improves the number, then a ruler-only commit records it exactly.
- **Never change `THRESHOLDS`.** Only a human's judgement of a rendered artifact may revise them (§7.1). Present the render and the numbers; do not declare the result readable.
- Imports use explicit `.ts`/`.tsx` paths. No `any`, no `as` casts, no `@ts-ignore`.
- No AI attribution in commit messages.
- Every artifact task ends by rendering the schematic and sending it for human review (R7).
- No `#` inside bash heredocs (use the Write tool). No `sed` for writes.

### Recorded baseline — the starting line

| Metric | Baseline | Threshold | |
|---|---|---|---|
| M1 `nonRailLabels` | 38 | ≤ 8 | ❌ |
| M2 `labelCollisions` | 8 | 0 | ❌ |
| M3 `wireCrossings` | 2 | ≤ 7.6 | ✅ |
| M4 `longHopFraction` | 0.233 | ≤ 0.10 | ❌ |
| M5a `componentAreaPerComponent` | 24.2 | 4–20 | ❌ |
| M5b `drawingAreaPerComponent` | 25.2 | 6–30 | ✅ |

### Two measured facts that bound this work

Established by experiment before this plan; do not re-derive, and do not
plan around their opposites:

1. **Multi-terminal junctions never render as wires in tscircuit.** A 3+
   terminal node emits a net label regardless of whether the source uses a
   named net or pin-to-pin traces, and regardless of how close the parts
   are placed. Tested with components pulled hard against the node; no
   change. This bounds what M1 can reach.
2. **Two-terminal connections DO render as wires** when written pin-to-pin.
   That is the only case where connectivity style changes the drawing.

Consequence: **a short named net is better than pin-to-pin at a junction**
(N narrow labels beat one wide concatenated ribbon, and width drives M2).
Phase 3 is therefore expected to be worth little. Measure it anyway.

---

## File Structure

**Ruler (Task 1 only):**

| File | Change |
|---|---|
| `lib/testing/schematic-tier1.ts` | Add `worstHops` diagnostic to `Tier1Metrics` and its formatter |
| `lib/testing/schematic-tier1.test.tsx` | Fixtures gain `worstHops: []`; new test that hop endpoints are named |

**Artifact (Tasks 2–5):**

| File | Change |
|---|---|
| `modules/optical-compressor/parts/PowerSection.tsx` | `schX`/`schY` only |
| `modules/optical-compressor/parts/AudioPath.tsx` | `schX`/`schY`; later, test-point removal |
| `modules/optical-compressor/parts/Sidechain.tsx` | `schX`/`schY`; later, test-point removal and two-terminal wiring |
| `modules/optical-compressor/OpticalCompressor.tsx` | band offsets and connector placement |
| `modules/optical-compressor/parts/*.test.tsx` | assertions updated when test points are removed |

**Ruler bookkeeping (Tasks 3, 5, 7):** `lib/testing/schematic-gate.ts` — `BASELINES` only, recording measured values.

---

### Task 1: Expose the placement gradient (RULER ONLY)

The gate reports that the drawing is bad and says nothing about which two
components to move. `computeTier1` already builds the MST hops that produce
M4 but discards their endpoints. This is the one tooling addition the plan
permits: **print the offenders, change no metric, classify nothing, exempt
nothing.**

**Files:**
- Modify: `lib/testing/schematic-tier1.ts`
- Modify: `lib/testing/schematic-tier1.test.tsx`

**Interfaces:**
- Consumes: `Tier1Metrics`, `computeTier1`, `formatTier1` (existing)
- Produces: `Tier1Metrics.worstHops: readonly { distance: number; from: string; to: string }[]` — longest first, capped at 12. Diagnostic only; `assertReadabilityGate` must not read it.

- [ ] **Step 1: Write the failing test**

Add to `lib/testing/schematic-tier1.test.tsx`:

```tsx
test("worstHops names the components at each end, longest first", async () => {
  const el = await render(
    <>
      <resistor name="NEAR_A" resistance="1k" footprint="0805" schX={0} schY={0} />
      <resistor name="NEAR_B" resistance="1k" footprint="0805" schX={1} schY={0} />
      <resistor name="FAR_A" resistance="1k" footprint="0805" schX={-25} schY={0} />
      <resistor name="FAR_B" resistance="1k" footprint="0805" schX={25} schY={0} />
      <trace from=".NEAR_A > .pin2" to=".NEAR_B > .pin1" />
      <trace from=".FAR_A > .pin2" to=".FAR_B > .pin1" />
    </>,
    "160mm",
    "40mm",
  )
  const hops = computeTier1(el).worstHops
  expect(hops.length).toBeGreaterThan(0)
  const worst = hops[0]
  expect(worst).toBeDefined()
  if (!worst) return
  // The 50-unit connection must rank above the 1-unit one.
  expect(worst.distance).toBeGreaterThan(10)
  expect([worst.from, worst.to].sort()).toEqual(["FAR_A", "FAR_B"])
  // Sorted descending.
  for (let i = 1; i < hops.length; i++) {
    const prev = hops[i - 1]
    const cur = hops[i]
    if (!prev || !cur) continue
    expect(prev.distance).toBeGreaterThanOrEqual(cur.distance)
  }
}, 120000)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test lib/testing/schematic-tier1.test.tsx
```

Expected: FAIL — `worstHops` does not exist on `Tier1Metrics`.

- [ ] **Step 3: Add the field to the interface**

In `lib/testing/schematic-tier1.ts`, inside `Tier1Metrics` after `drawingAreaPerComponent`:

```ts
  /**
   * The connections producing M4, longest first, with endpoint component
   * names. DIAGNOSTIC OUTPUT, not a metric: it changes no verdict. It
   * exists because a score without an actionable gradient tells you the
   * drawing is bad and nothing about which two parts to move.
   */
  readonly worstHops: readonly {
    readonly distance: number
    readonly from: string
    readonly to: string
  }[]
```

- [ ] **Step 4: Carry port ownership through the MST**

In `computeTier1`, before the M4 block, build the port→component-name map:

```ts
  const compName = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "source_component" || !isRecord(e)) continue
    const id = str(e.source_component_id)
    const n = str(e.name)
    if (id && n) compName.set(id, n)
  }
  const ownerOfPort = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const id = str(e.source_port_id)
    const c = str(e.source_component_id)
    if (id && c) ownerOfPort.set(id, compName.get(c) ?? c)
  }
```

Change `ptsByNet` to carry the port id so hops can be attributed:

```ts
  const ptsByNet = new Map<string, (Pt & { owner: string })[]>()
  for (const e of elements) {
    if (e.type !== "schematic_port" || !isRecord(e)) continue
    const sp = str(e.source_port_id)
    const c = point(e.center)
    if (!sp || !c) continue
    const net = netOfPort.get(sp)
    if (!net) continue
    const rec = { ...c, owner: sp }
    const arr = ptsByNet.get(net)
    if (arr) arr.push(rec)
    else ptsByNet.set(net, [rec])
  }
```

- [ ] **Step 5: Record each MST edge as it is chosen**

Declare alongside `hops`:

```ts
  const hopDetail: { distance: number; from: string; to: string }[] = []
```

In the Prim inner loop, track which node the winning edge came from by adding `let bestFrom: (Pt & { owner: string }) | undefined` beside `bestIdx`, setting `bestFrom = a` wherever `bestIdx = j` is set, and after `inTree.add(bestIdx)`:

```ts
      const to = pts[bestIdx]
      if (bestFrom && to) {
        hopDetail.push({
          distance: best,
          from: ownerOfPort.get(bestFrom.owner) ?? "?",
          to: ownerOfPort.get(to.owner) ?? "?",
        })
      }
```

After the net loop:

```ts
  hopDetail.sort((a, b) => b.distance - a.distance)
```

And in the returned object, after `drawingAreaPerComponent`:

```ts
    worstHops: hopDetail.slice(0, 12),
```

- [ ] **Step 6: Print it**

In `formatTier1`, after the M5b line:

```ts
    "",
    "LONGEST CONNECTION HOPS (the gradient for placement work):",
    ...m.worstHops.map(
      (h) => `  ${h.distance.toFixed(1).padStart(6)}  ${h.from} <-> ${h.to}`,
    ),
```

- [ ] **Step 7: Fix the three hand-built fixtures**

`Tier1Metrics` is now wider, so the literals in `schematic-tier1.test.tsx` need the field. Add `worstHops: [],` to each of the three object literals in `F8`, `F8b` and `F8c`.

- [ ] **Step 8: Run tests and typecheck**

```bash
bun run typecheck
bun test lib/testing/schematic-tier1.test.tsx
```

Expected: typecheck clean; all tests pass including the new one.

- [ ] **Step 9: Verify R2 and commit (RULER ONLY)**

```bash
git add lib/testing/schematic-tier1.ts lib/testing/schematic-tier1.test.tsx
git commit -F <message file>
bun run check-r2 HEAD~1
```

The commit must touch **no** artifact file, and `check-r2 HEAD~1` must
report PASS. If it does not, split the commit as shown in Global
Constraints.

---

### Task 2: Phase 1 — collapse the worst hops (ARTIFACT ONLY)

**The plan's central experiment.** Move components so electrically
connected parts sit near each other. Change **only** `schX`/`schY`.

**Files:**
- Modify: `modules/optical-compressor/parts/PowerSection.tsx` (coordinates only)
- Modify: `modules/optical-compressor/parts/AudioPath.tsx` (coordinates only)
- Modify: `modules/optical-compressor/parts/Sidechain.tsx` (coordinates only)
- Modify: `modules/optical-compressor/OpticalCompressor.tsx` (band offsets, connector placement)

**Interfaces:**
- Consumes: `worstHops` from Task 1
- Produces: no API change. A measured improvement in M4 and/or M5a with no Tier 1 regression.

**Method — mechanical, not aesthetic:**

```
render → read worstHops → move those two components together → render
  → improved? commit : revert
```

Do **not** nudge things until the drawing "looks balanced". Start at the
top of `worstHops` and collapse them one at a time.

**The band trap.** The module is arranged as three horizontal bands (power,
audio, sidechain) mirroring its code structure. **Electrical connectivity
does not respect those bands.** U2 is declared in PowerSection because
section B is the VBIAS buffer, but section A is the sidechain amplifier a
band away; the vactrol lives in the audio path but is driven from the
sidechain; PEAK REDUCTION crosses from audio to sidechain. A neat band
layout can still produce a terrible electrical graph. Let `worstHops`
decide where things go, not the band diagram.

**A recorded failed attempt, so it is not repeated.** Moving U2 alone into
the sidechain band was tried twice — once at a guessed position, once at
the computed centroid of its section-A neighbours (−8.6, −12.3). Both made
things worse (M2 8→10 then 8→9; M4 0.233→0.256 then →0.232). Moving one
chip while its rail connections stretch does not pay. If U2 moves, the
parts it connects to must move with it.

- [ ] **Step 1: Capture the starting measurement**

```bash
bun run schematic-check 2>&1 | grep -A20 "LONGEST CONNECTION HOPS"
```

Record the list. This is the work queue.

- [ ] **Step 2: Collapse the worst hop**

Take `worstHops[0]`. Find both components in the part files. Move them so
their `schX`/`schY` are within ~4 units. Prefer moving the one with fewer
other connections.

- [ ] **Step 3: Re-measure**

```bash
bun run schematic-check 2>&1 | grep -E "M1|M2|M3|M4|M5"
```

Compare against Step 1. **If any Tier 1 metric regressed, revert that move**
(`git checkout -- <file>`) and take the next hop instead. A move that
trades M4 for M2 is not an improvement.

- [ ] **Step 4: Repeat for the top five hops**

Iterate Steps 2–3. Stop when either the top five are collapsed or three
consecutive attempts fail to improve anything.

- [ ] **Step 5: Verify the whole suite still passes**

```bash
bun run typecheck
bun test
```

Expected: typecheck clean, all tests pass. Connectivity assertions must be
untouched — this task changes coordinates only, so any connectivity failure
means a coordinate edit corrupted a trace and must be fixed, not
accommodated.

- [ ] **Step 6: Render the artifact for human review**

```bash
rm -f modules/optical-compressor/schematic.svg
bunx tsci export modules/optical-compressor/optical-compressor.circuit.tsx \
  -f schematic-svg -o schematic.svg
rsvg-convert -w 7000 -b white modules/optical-compressor/schematic.svg -o /tmp/sch.png
magick /tmp/sch.png -fuzz 8% -trim +repage -bordercolor white -border 40 /tmp/sch-trim.png
```

Send the trimmed render to the human with the before/after metric table.
The machine answers *did the numbers improve?*; only a person answers *is
this a drawing I can use?* (R7).

- [ ] **Step 7: Verify R2 and commit (ARTIFACT ONLY)**

```bash
bun run check-r2 HEAD~1
```

Must report PASS. The commit touches **no** ruler file — in particular, do
not update `BASELINES` here. That is Task 3.

Commit message must state the before/after Tier 1 numbers as computed by
the tooling.

---

### Task 3: Record the Phase 1 improvement (RULER ONLY)

Per §10.1a, recording an improvement is a separate commit because baselines
live in a ruler file. Leaving a stale baseline silently restores regression
headroom.

**Files:**
- Modify: `lib/testing/schematic-gate.ts` (`BASELINES` only)

**Interfaces:**
- Consumes: the measurement from Task 2
- Produces: baselines equal to the measured values

- [ ] **Step 1: Read the current measurement**

```bash
bun run schematic-check 2>&1 | grep -E "M1|M2|M3|M4|M5|BASELINE STALE"
```

The report names the exact values required.

- [ ] **Step 2: Update BASELINES to those values EXACTLY**

In `lib/testing/schematic-gate.ts`, set `BASELINES["optical-compressor"]`
to the measured numbers. **Not rounded down for headroom. Not a
pre-commitment to unfinished work.** If the render says 31, write 31.

- [ ] **Step 3: Confirm the stale warning clears**

```bash
bun run schematic-check 2>&1 | grep -c "BASELINE STALE"
```

Expected: `0`.

- [ ] **Step 4: Run the suite and commit (RULER ONLY)**

```bash
bun run typecheck && bun test && bun run check-r2 HEAD~1
git add lib/testing/schematic-gate.ts
git commit -F <message file>
```

`check-r2` must report PASS.

---

### Task 4: Phase 2 — remove the test-point clutter (ARTIFACT ONLY)

Four test points exist to serve unit tests rather than the bench:
`TP_VBIAS_CHK` and `TP_GND_CHK` in AudioPath, `TP_VBIAS_SC` and `TP_GND_SC`
in Sidechain. Each is a real `pinrow1` part and at least one real label. The
spec asks for **one** VBIAS and **one** GND test point; the board has three
of each.

**Files:**
- Modify: `modules/optical-compressor/parts/AudioPath.tsx`
- Modify: `modules/optical-compressor/parts/Sidechain.tsx`
- Modify: `modules/optical-compressor/parts/AudioPath.test.tsx`
- Modify: `modules/optical-compressor/parts/Sidechain.test.tsx`

**Interfaces:**
- Consumes: `findNet` from `lib/testing/circuit-assertions.ts`
- Produces: four fewer components and their labels

- [ ] **Step 1: Find the assertions that depend on them**

```bash
grep -n "TP_VBIAS_CHK\|TP_GND_CHK\|TP_VBIAS_SC\|TP_GND_SC" \
  modules/optical-compressor/parts/*.test.tsx
```

These assertions use the test point as a proxy for "this pin is on the
VBIAS net". That proxy is why the parts exist.

- [ ] **Step 2: Replace each proxy assertion with a direct net assertion**

For each `expectConnected(el, "X.pin", "CMP_TP_VBIAS_CHK.TP")`, substitute a
component already known to sit on that rail. In AudioPath, `CMP_R_IN_BIAS.pin2`
is on VBIAS and `CMP_R_OUT_PD.pin2` is on GND. In Sidechain,
`CMP_R_PEAK_FAIL.pin2` is on VBIAS and `CMP_R_E.pin2` is on GND.

Example — before:

```tsx
expectConnected(el, "CMP_VACTROL.LDR_2", "CMP_TP_VBIAS_CHK.TP")
```

after:

```tsx
// R_IN_BIAS.pin2 sits on VBIAS, so it stands in for the removed
// TP_VBIAS_CHK proxy without adding a part to the board.
expectConnected(el, "CMP_VACTROL.LDR_2", "CMP_R_IN_BIAS.pin2")
```

- [ ] **Step 3: Run tests to confirm the substitutions hold BEFORE removing parts**

```bash
bun test modules/optical-compressor/
```

Expected: all pass. The assertions now reference real circuit nodes rather
than proxies, with the test points still present.

- [ ] **Step 4: Delete the four components and their traces**

Remove the `<TestPoint name={`${name}_TP_VBIAS_CHK`} ... />` element and its
`<trace ... />` from AudioPath, and likewise for `TP_GND_CHK`,
`TP_VBIAS_SC`, `TP_GND_SC`.

Leave `TP_VBIAS`, `TP_GND`, `TP_9V`, `TP_IN_BUF`, `TP_GR`, `TP_MAKEUP_OUT`,
`TP_SC_INV`, `TP_SC_OUT`, `TP_DET`, `TP_SENSE_HI`, `TP_SENSE_LO` — those are
the spec's bench test points (§10.2) and serve a human with a probe.

- [ ] **Step 5: Run the suite**

```bash
bun run typecheck && bun test
```

Expected: all pass, including `expectNoFloatingPins` — removing a component
removes its pins too, so nothing should be orphaned.

- [ ] **Step 6: Measure and render**

```bash
bun run schematic-check 2>&1 | grep -E "M1|M2|M3|M4|M5"
```

Then render as in Task 2 Step 6 and send for human review.

- [ ] **Step 7: Verify R2 and commit (ARTIFACT ONLY)**

```bash
bun run check-r2 HEAD~1
```

Do not update `BASELINES` here; that is Task 5.

---

### Task 5: Record the Phase 2 improvement (RULER ONLY)

**Files:**
- Modify: `lib/testing/schematic-gate.ts` (`BASELINES` only)

**Interfaces:**
- Consumes: the measurement from Task 4
- Produces: baselines equal to the measured values

- [ ] **Step 1: Read the measurement and the stale-baseline report**

```bash
bun run schematic-check 2>&1 | grep -E "M1|M2|M3|M4|M5|BASELINE STALE"
```

- [ ] **Step 2: Set BASELINES to those exact values**

Same rule as Task 3: equal to measured, never rounded for headroom.

- [ ] **Step 3: Confirm the warning clears, run the suite, commit (RULER ONLY)**

```bash
bun run schematic-check 2>&1 | grep -c "BASELINE STALE"   # expect 0
bun run typecheck && bun test && bun run check-r2 HEAD~1
git add lib/testing/schematic-gate.ts
git commit -F <message file>
```

---

### Task 6: Phase 3 — convert two-terminal connections (ARTIFACT ONLY)

**Expect this to be worth little.** The measured evidence is that a
two-terminal net produces exactly one label either way, and the pin-to-pin
version's auto-name is far wider (`R1_pin2/R2_pin1`, 15 chars, versus
`MID`, 3). Width drives M2. **A conversion that widens a label is a
regression even if it reads as "more wires".**

The genuine win is only where the connection currently renders as a label
and would become a drawn wire. Measure each conversion individually.

**Files:**
- Modify: `modules/optical-compressor/parts/AudioPath.tsx`
- Modify: `modules/optical-compressor/parts/Sidechain.tsx`
- Modify: `modules/optical-compressor/parts/PowerSection.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: no API change

- [ ] **Step 1: Enumerate two-terminal nets**

A net is two-terminal when exactly two ports sit on it. Candidates are
named nets joining exactly two component pins — for example in PowerSection
the `VBIAS_RAW` node is a rail and must NOT be converted, while a
signal-only two-port node may be.

```bash
grep -n "net name=" modules/optical-compressor/parts/*.tsx
```

For each, count the traces referencing it. Two references means two
terminals.

- [ ] **Step 2: Convert ONE and measure**

Replace:

```tsx
<net name={`${name}_FOO`} />
<trace from={`.${name}_A > .pin2`} to={`net.${name}_FOO`} />
<trace from={`.${name}_B > .pin1`} to={`net.${name}_FOO`} />
```

with:

```tsx
<trace from={`.${name}_A > .pin2`} to={`.${name}_B > .pin1`} />
```

Then:

```bash
bun run schematic-check 2>&1 | grep -E "M1|M2|M3|M4|M5"
```

- [ ] **Step 3: Keep or revert on the measurement**

Improved with no regression → keep. Anything regressed → `git checkout --`
that file and move on. **Do not keep a conversion because it "should" be
better.** Two claims of mine about pin-to-pin have already failed to
replicate; the measurement decides.

- [ ] **Step 4: Repeat for each two-terminal candidate**

- [ ] **Step 5: Run the suite, measure, render, review**

```bash
bun run typecheck && bun test
```

Render as in Task 2 Step 6 and send for human review.

- [ ] **Step 6: Verify R2 and commit (ARTIFACT ONLY)**

```bash
bun run check-r2 HEAD~1
```

If **no** conversion survived measurement, commit nothing and record the
negative result in the task report. A phase that produced no improvement is
a finding, not a failure to be papered over.

---

### Task 7: Report the outcome and hand the threshold question to a human

The plan cannot decide whether `M1 ≤ 8` is reachable. §7.1 reserves that to
a human judging a rendered artifact, precisely so the party being measured
cannot move the bar.

**Files:**
- Modify: `lib/testing/schematic-gate.ts` (`BASELINES` only, if Task 6 improved anything)
- Create: `docs/superpowers/plans/2026-09-21-schematic-readability-outcome.md`

**Interfaces:**
- Consumes: measurements from Tasks 2, 4, 6
- Produces: a written outcome and an explicit question for the maintainer

- [ ] **Step 1: Record any Phase 3 improvement (RULER ONLY commit)**

If Task 6 kept any conversion, update `BASELINES` to the measured values
exactly, then commit ruler-only as in Task 3.

- [ ] **Step 2: Write the outcome document**

Create `docs/superpowers/plans/2026-09-21-schematic-readability-outcome.md`
containing:

- a table of Tier 1 metrics at: original baseline, after Phase 1, after
  Phase 2, after Phase 3;
- which threshold each metric now meets or misses;
- every move that was tried and **reverted** because it regressed something
  (the failed U2 relocation belongs here, and any others);
- the two measured renderer facts from the Global Constraints, restated with
  their evidence;
- the explicit question for the maintainer:

> Given the rendered schematic attached, is the remaining label count
> carrying real information? If yes, `M1 = 8` is wrong and should be
> revised to the measured value — that is the falsification §7.1 calls
> for. If no, `M1 = 8` stands and the remaining gap needs either
> multi-sheet output or a different renderer.

**Do not answer that question in the document.** Present the render and the
numbers.

- [ ] **Step 3: Render the final artifact**

As in Task 2 Step 6. Send it with the outcome document.

- [ ] **Step 4: Commit (documentation)**

```bash
bun run check-r2 HEAD~1
git add docs/superpowers/plans/2026-09-21-schematic-readability-outcome.md
git commit -F <message file>
```

---

## Verification Summary

| Design requirement | Task |
|---|---|
| §8 falsifiability — gradient is diagnostic, gates nothing | 1 |
| §11 Phase 1 placement | 2 |
| §10.1a baseline lifecycle, exact values | 3, 5, 7 |
| §11 Phase 2 test-point removal | 4 |
| §11 Phase 3 connectivity | 6 |
| §11 Phase 4 retire baselines | 7 — only if thresholds are met |
| R2 mechanical, per commit | every task |
| R3 improvement computed, not asserted | 2, 4, 6 |
| R7 rendered artifact for human review | 2, 4, 6, 7 |
| §7.1 only a human may revise a threshold | 7 |

**Phase 4 is deliberately conditional.** Retiring a baseline requires every
metric to meet its threshold. On current evidence — junctions never render
as wires, and interface labels alone plausibly account for 12–15 against a
budget of 8 — that is unlikely to happen in this plan. Task 7 exists to
hand that finding to a human rather than to quietly redefine success.
