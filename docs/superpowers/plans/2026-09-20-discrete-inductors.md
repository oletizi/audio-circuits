# Discrete Inductors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the high boost and mid inductors onto their section boards as discrete parts, and prove the substitution changed nothing electrically.

**Architecture:** The reference network is untouched — moving a part from a breakout board onto the main board alters no net and no value. What changes is `boardNetwork()`'s idea of which components are board-resident, and the two tscircuit modules that must then carry them. The existing comparison machinery turns "this changed nothing" from an assertion into a test result.

**Tech Stack:** TypeScript 5.9 (strict, `noEmit`), Bun 1.3 test runner, `@tscircuit/core` for headless rendering, `eecircuit-engine` for AC comparison.

**Spec:** [2026-09-20-discrete-inductors-design.md](../specs/2026-09-20-discrete-inductors-design.md) — executors read both.

## Global Constraints

- Local imports use explicit relative paths INCLUDING the `.ts`/`.tsx` extension. No directory imports, no path aliases.
- No `any`, no `as Type` assertions, no `@ts-ignore`. `as const` is permitted.
- No fallbacks and no mock data outside test code. Missing functionality or data throws an error naming what is absent.
- Source files stay under 300–500 lines.
- Never add AI attribution to commit messages.
- Never use `sed` for write or execute operations. Use Edit to modify files and Write to create them.
- Never put `#` inside bash heredocs or multi-line quoted arguments; write a file and reference it (`git commit -F path`).
- A test-count figure is a GUARD against silently deleting or merging tests. It is never a ceiling. Add tests when warranted and report the real count.
- The EQ stays passive. No gyrators, no active parts, no power rails on EQ boards.

## Inductor values

Fixed by the spec; every task below uses these exact values.

| Module | Component ref | Reference ref | Value |
| --- | --- | --- | --- |
| High boost | `HB_L_600mH` | `L_HI_BOOST_600MH` | `600mH` |
| High boost | `HB_L_300mH` | `L_HI_BOOST_300MH` | `300mH` |
| High boost | `HB_L_200mH` | `L_HI_BOOST_200MH` | `200mH` |
| High boost | `HB_L_100mH` | `L_HI_BOOST_100MH` | `100mH` |
| Mid | `MID_L_2H` | `L_MID_2H` | `2H` |
| Mid | `MID_L_1H` | `L_MID_1H` | `1H` |
| Mid | `MID_L_0R45H` | `L_MID_0R45H` | `450mH` |
| Mid | `MID_L_0R22H` | `L_MID_0R22H` | `220mH` |
| Mid | `MID_L_0R1H` | `L_MID_0R1H` | `100mH` |

Each inductor spans its tap net to the section's common return: high boost taps to `COIL_TOP`, mid taps to a new `COIL_RETURN` net.

## Starting state

118 tests pass at the time of writing (`bun test`), typecheck clean. Every count below is relative to that.

---

### Task 1: High boost inductors become board-resident

**Files:**
- Modify: `circuits/pultec/partition.ts` (`boardNetwork`)
- Modify: `modules/pultec-hi-boost/PultecHiBoost.tsx`
- Modify: `tests/modules/hi-boost.test.tsx`

**Interfaces:**
- Consumes: `boardNetwork("hi-boost")` from `partition.ts`, which after this task includes `L_HI_BOOST_*`.
- Produces: a `PultecHiBoost` that emits four inductors. Later tasks rely on its net names being unchanged.

- [ ] **Step 1: Make inductors board-resident**

In `circuits/pultec/partition.ts`, replace the filter in `boardNetwork` and its comment:

```ts
  // Potentiometers and rotary selectors are front-panel parts wired back to the
  // board. Inductors are not: with the tapped coils replaced by discrete parts,
  // they sit on the section boards beside the capacitors they pair with.
  const elements = owned.filter(
    element => element.kind !== "potentiometer" && element.kind !== "switch",
  )
```

- [ ] **Step 2: Run the high boost test and watch it fail for the right reason**

Run: `bun test tests/modules/hi-boost.test.tsx`
Expected: FAIL with `Passive topology differs from reference: L_HI_BOOST_100MH is missing`.

That message is the point of this step. If it fails any other way — a mapping error, a count mismatch — stop and report, because the board/off-board split is not what this plan assumes.

- [ ] **Step 3: Add the four inductors to the module**

In `modules/pultec-hi-boost/PultecHiBoost.tsx`, add after the existing `POSITIONS` constant:

```tsx
/** Tap label to the discrete inductor fitted there. Six positions share four
 * parts: 4k and 5k both want 0.3H, 10k and 16k both want 0.1H. */
const TAPS: readonly (readonly [string, string])[] = [
  ["600mH", "600mH"],
  ["300mH", "300mH"],
  ["200mH", "200mH"],
  ["100mH", "100mH"],
]
```

Then, inside the returned `<group>` and after the capacitor block, add:

```tsx
      {TAPS.map(([tap, inductance], index) => (
        <Fragment key={`L-${tap}`}>
          <inductor
            name={`${name}_L_${tap}`}
            inductance={inductance}
            footprint="0805"
            {...g.below(index - 2, 1)}
          />
          <trace from={`.${name}_L_${tap} > .pin1`} to={`net.${name}_TAP_${tap}`} />
          <trace from={`.${name}_L_${tap} > .pin2`} to={`net.${coilTopNet}`} />
        </Fragment>
      ))}
```

The `taps` local already declared for the net elements stays as it is; this block reuses the same labels.

- [ ] **Step 4: Extend the test mapping**

In `tests/modules/hi-boost.test.tsx`, add to `componentNames`:

```ts
    HB_L_600mH: "L_HI_BOOST_600MH",
    HB_L_300mH: "L_HI_BOOST_300MH",
    HB_L_200mH: "L_HI_BOOST_200MH",
    HB_L_100mH: "L_HI_BOOST_100MH",
```

`netNames` and `ports` need no change: the tap nets and `COIL_TOP` were already mapped, because the capacitors and Qmax already touched them.

- [ ] **Step 5: Verify**

Run: `bun test tests/modules/hi-boost.test.tsx`
Expected: PASS.

Run: `bun test && bun run typecheck && git diff --check`
Expected: the mid module test now fails — that is Task 2's starting point and is expected here. Every other test passes, typecheck exits 0, `git diff --check` exits 0. If anything else fails, stop and report.

- [ ] **Step 6: Add a test pinning the shared-tap economy**

Append to `tests/modules/hi-boost.test.tsx`:

```tsx
test("four inductors serve six positions", () => {
  // 4k/5k share 0.3H and 10k/16k share 0.1H. If a future edit gives every
  // position its own part, this catches it before the BOM does.
  const exported = toLabelledNetwork(render(), MAPPING)
  const inductors = exported.elements.filter(e => e.kind === "inductor")
  expect(inductors).toHaveLength(4)
  // Each one returns to the coil-top node; none goes to ground.
  for (const inductor of inductors) {
    expect(Object.values(inductor.pins)).toContain("j19_p1")
    expect(Object.values(inductor.pins)).not.toContain("0")
  }
})
```

- [ ] **Step 7: Commit**

```bash
git add circuits/pultec/partition.ts modules/pultec-hi-boost tests/modules/hi-boost.test.tsx
git commit -F commit-msg.txt
git push
```

Write `commit-msg.txt` with the Write tool first, describing the board-resident change and the four inductors, then delete it.

---

### Task 2: Mid inductors, and the mid's first board comparison

The mid module has never been compared against the reference partition — its test checks values directly. This task adds that comparison, which is spec success criterion 2.

**Files:**
- Modify: `modules/pultec-mid/PultecMid.tsx`
- Modify: `tests/modules/mid.test.tsx`

**Interfaces:**
- Consumes: `boardNetwork("mid")`, `MID_NETS` from `circuits/pultec/model/three-band.ts`, `MID_POSITIONS`/`MID_TAPS`/`tapLabel` from `circuits/pultec/model/mid.ts`.
- Produces: a `PultecMid` emitting five inductors on a new `COIL_RETURN` net.

- [ ] **Step 1: Write the failing board comparison**

Add to `tests/modules/mid.test.tsx`:

```tsx
const MID_MAPPING: ExportMapping = {
  componentNames: {
    MID_R_BOOST: "R_MID_BOOST",
    MID_R_CUT: "R_MID_CUT",
    MID_R_SHUNT: "R_MID_SHUNT",
    MID_L_2H: "L_MID_2H",
    MID_L_1H: "L_MID_1H",
    MID_L_0R45H: "L_MID_0R45H",
    MID_L_0R22H: "L_MID_0R22H",
    MID_L_0R1H: "L_MID_0R1H",
    ...Object.fromEntries(
      MID_POSITIONS.flatMap(position =>
        position.capacitors.map((_, index) => {
          const slot = index === 0 ? "A" : "B"
          return [`MID_C_${position.label}_${slot}`, `C_MID_${position.label}_${slot}`]
        })),
    ),
  },
  netNames: {
    MID_IN: "in",
    MID_GND: "0",
    MID_BOOST_RETURN: "mid_boost_return",
    MID_CUT_RETURN: "mid_cut_return",
    MID_COIL_RETURN: "mid_coil_return",
    ...Object.fromEntries(
      MID_TAPS.map(henries => [
        `MID_TAP_${tapLabel(henries)}`,
        `mid_tap_${tapLabel(henries).toLowerCase()}`,
      ]),
    ),
    ...Object.fromEntries(
      MID_POSITIONS.map(position => [
        `MID_SEL_${position.label}`,
        `mid_sel_${position.label.toLowerCase()}`,
      ]),
    ),
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: { input: "in", ground: "0" },
}

test("the rendered module equals the reference mid board", () => {
  assertSameTopology(boardNetwork("mid"), toLabelledNetwork(render(), MID_MAPPING))
})
```

Add the imports it needs:

```tsx
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../circuits/pultec/partition.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
```

- [ ] **Step 2: Run it and confirm it fails on the missing inductors**

Run: `bun test tests/modules/mid.test.tsx`
Expected: FAIL naming a missing `L_MID_*`.

- [ ] **Step 3: Add the five inductors to the module**

In `modules/pultec-mid/PultecMid.tsx`, add a net alongside the existing ones:

```tsx
  const coilReturnNet = `${name}_COIL_RETURN`
```

declare it with the others (`<net name={coilReturnNet} />`), and add after the capacitor block:

```tsx
      {MID_TAPS.map((henries, index) => (
        <Fragment key={`L-${henries}`}>
          <inductor
            name={`${name}_L_${tapLabel(henries)}`}
            inductance={MID_INDUCTANCES[tapLabel(henries)]!}
            footprint="0805"
            {...g.below(index - 2, 2)}
          />
          <trace
            from={`.${name}_L_${tapLabel(henries)} > .pin1`}
            to={`net.${name}_TAP_${tapLabel(henries)}`}
          />
          <trace from={`.${name}_L_${tapLabel(henries)} > .pin2`} to={`net.${coilReturnNet}`} />
        </Fragment>
      ))}
```

with this constant near the top of the file:

```tsx
/** Written the way tscircuit wants them; 450mH rather than 0.45H so the value
 * parses without a decimal point in the middle of a unit. */
const MID_INDUCTANCES: Readonly<Record<string, string>> = {
  "2H": "2H",
  "1H": "1H",
  "0R45H": "450mH",
  "0R22H": "220mH",
  "0R1H": "100mH",
}
```

Import `MID_TAPS` and `tapLabel` alongside the existing `MID_POSITIONS` and `MID_RESISTORS`.

- [ ] **Step 4: Verify**

Run: `bun test tests/modules/mid.test.tsx`
Expected: PASS, including the new board comparison.

Run: `bun test && bun run typecheck && git diff --check`
Expected: the composition tests fail — Task 3's starting point. Everything else passes.

- [ ] **Step 5: Commit**

Stage `modules/pultec-mid` and `tests/modules/mid.test.tsx`, commit with a message written to a file, push.

---

### Task 3: Compose the mid, and catch the gap that hid it

The composition currently omits the mid entirely. The unsplit-versus-composed test passes anyway, because every state in its matrix leaves the mid switched off and the pruning pass removes the whole branch. That is a test passing for a reason that will stop holding.

**This task goes beyond the spec.** The spec's success criteria only require existing behaviour to hold. Raise it before implementing if that scope matters; the reason to do it is that the gap is invisible until someone engages the mid and gets a silently wrong answer.

**Files:**
- Modify: `modules/pultec-passive-eq/PultecPassiveEq.tsx`
- Modify: `tests/modules/composed-mapping.ts`
- Modify: `tests/modules/unsplit-vs-composed.test.tsx`

- [ ] **Step 1: Add a matrix state that engages the mid, and watch it fail**

In `tests/modules/unsplit-vs-composed.test.tsx`, append to `MATRIX`:

```ts
  {
    label: "mid boost engaged",
    state: controlState(
      0, 0, 0,
      { loFrequency: "60Hz", hiFrequency: "5kHz", mid: "1kHz" },
      1, 0,
      { level: 0, mode: "boost" },
    ),
  },
```

Run: `bun test tests/modules/unsplit-vs-composed.test.tsx`
Expected: FAIL on `mid boost engaged`, with a large deviation. The reference boosts; the composition has no mid to boost with. That failure is the gap becoming visible.

- [ ] **Step 2: Put the mid in the composition**

In `modules/pultec-passive-eq/PultecPassiveEq.tsx`, import `PultecMid`, take `columnLayout(5)`, add `const mid = \`${name}_MID\``, and render `<PultecMid name={mid} {...layout[4]} />`.

The mid joins the signal path through its level pot, which is off-board, so it needs one conductor stated here — the same pattern as the existing low-boost/hi-cut join:

```tsx
      {/* The mid's input shunt and boost return reference the same input node
          the rest of the EQ sees. */}
      <trace from={`net.${mid}_IN`} to={`net.${lowCut}_IN`} />
```

Read the emitted nets before assuming that is the right join — if `LC_IN` maps to `hi_boost_out` rather than `in`, the correct target is whichever module net carries the canonical `in`. Check the mapping and use the one that does.

- [ ] **Step 3: Extend the composed mapping**

Add the mid's components and nets to `tests/modules/composed-mapping.ts`, prefixed `${P}_MID_`, mapping onto the same canonical names Task 2 used.

- [ ] **Step 4: Verify**

Run: `bun test && bun run typecheck && git diff --check`
Expected: all pass, including `mid boost engaged`. Report the real test count.

- [ ] **Step 5: Commit**

---

### Task 4: Record the measurements where part selection will find them

**Files:**
- Modify: `docs/pultec/values.md`
- Modify: `docs/pultec/unresolved.md`

- [ ] **Step 1: Add the inductor specification to `values.md`**

A section giving the nine values, ±20% tolerance, DCR ≤1kΩ (≤500Ω preferred), line-level current, and both measurement tables from the spec — the DCR sweep at both Qmax values and the tolerance sweep. State that the numbers come from the model, not from a datasheet.

- [ ] **Step 2: Retire the winding-coupling caveat**

In `unresolved.md`, record that the caveat against representing one tapped coil as separate inductors no longer applies: with discrete parts there is no shared winding, so the one-at-a-time argument is no longer load-bearing. Keep the history rather than deleting it.

Also note the open BOM item: 2H is unverified as purchasable at an acceptable price, with the clustering fallback and the fact that positions can be left unpopulated.

- [ ] **Step 3: Verify and commit**

Run: `bun test && bun run typecheck && git diff --check`
Expected: all pass; documentation changes alter no behaviour.

---

## Self-review

**Spec coverage.** Success criterion 1 (nine inductors at the specified values) is Tasks 1 and 2. Criterion 2 (each module equals its partition portion) is Task 1 Step 5 and Task 2 Step 1 — and note the mid had no such comparison before, so the criterion was not previously met. Criterion 3 (composed equals recomposed) holds through Task 3. Criterion 4 (AC agreement unchanged) is Task 3 Step 4, strengthened by a state that engages the mid. Criterion 5 (measurements recorded) is Task 4. The spec's `boardNetwork` instruction — remove the exclusion outright rather than conditionally — is Task 1 Step 1.

**Placeholder scan.** Every code block is literal. Task 3 Step 2 deliberately does not pin the join target, because the right answer depends on what `LC_IN` maps to, and the step says to check rather than guess — that is an instruction, not a gap.

**Type consistency.** Component names are fixed in the values table at the top and used identically in the modules and both mappings. `tapLabel` produces the same strings in `mid.ts`, the module and the test mapping, so the three cannot drift. `MID_NETS` is exported from `three-band.ts` but the mapping uses literals matching it; if that seems fragile, the mapping may import `MID_NETS` instead.

**Scope note.** Task 3 exceeds the spec, flagged in its own preamble. Tasks 1, 2 and 4 are within it.
