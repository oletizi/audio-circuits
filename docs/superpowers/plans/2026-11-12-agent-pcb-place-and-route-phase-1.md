# Agent place-and-route, Phase 1: the probe — Implementation Plan

**Status** APPROVED by the owner, 2026-11-13 (*"phase 1 plan approved"*), after four rounds of third-party review recorded in issue 34. The fourth round is the one to know about: its clean control **refuted the hardware-clearance mechanism this plan had adopted in the third**, and Task 8 Step 4 carries the measured replacement. No open owner questions remain - the socket (**G312**), the pour thresholds (declined, **G313**) and the mounting hardware (**G311**) were all settled the same day.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer one question with evidence - can the pinned KiCadRoutingTools engine place and route `pt2399-core` as a two-layer through-hole board with a ground pour, inside the PCBWay floor, with KiCad's DRC and schematic parity clean - and leave behind the checks, the standard and the acquisition that Phase 2 builds on.

**Architecture:** Nothing here computes a copper path. A third-party engine is pinned, acquired and driven; this repository contributes the fabrication standard, the operator-owned placement intent, fail-closed checks, and run provenance. The canonical `Network` in `circuits/pt2399-core/pt2399-core.ts` stays the authority, and the new KiCad board is checked against it rather than trusted.

**Tech Stack:** TypeScript on Bun 1.3.8; `kicad-cli` 10.0.5; KiCadRoutingTools pinned by commit (Rust router built from source, needs `cargo`); Python 3 for the engine's own venv; `make` as the interface.

**Spec:** `docs/superpowers/specs/2026-11-12-agent-pcb-place-and-route-design.md` (approved by the owner 2026-11-12, after two review rounds in issue 34)

## Scope: Phase 1 only, and why

The spec has two phases with a decision gate between them, and says Phase 2 "ports the facility **in the shape this phase proved**". A detailed Phase 2 task list written now would be planned around an unknown - which engine behaviours need wrapping, which checks earn a place, whether the intent vocabulary survives contact with a through-hole board. **Phase 2 gets its own plan after the gate.**

What this plan therefore delivers: an acquired engine, a fabrication standard, a fail-closed parity/DRC check, a pour measurement, a KiCad project and board for `pt2399-core`, approved placement intent, and a recorded probe run with a render in front of the owner. Plus the `ic` parts-list rule, which is independent of all of it and lands first.

## Global Constraints

Every task's requirements implicitly include these. The first four are the spec's; the rest are the repository's.

- **Zero references to the project this discipline is ported from.** No path, URL, branch, commit or repository name from it in code, tests, docs, commit messages or PR text. The engine is cited from its own public upstream, which is the one legitimately shared citation.
- **`boards/pt2399-core/` gets read-only verbs only**, which is the spec's wording and the owner's. The protected artifacts are the **layout** - `perfboard.json`, `pt2399-core.perfboard.vrt`, `pt2399-core.perfboard.png` - and the prohibition is on the verbs that regenerate them: never `update`, never `stripboard`, against this board. `bom.json` is not a layout artifact; it is the board's selection record, already carrying a `lines` entry and an `extras` array, and Task 2 writes one line to it.
- **No change to `circuits/pt2399-core/pt2399-core.ts`.** The circuit is used strictly as it stands. Its schematic `pt2399-core.kicad_sch` is likewise not modified.
- **An agent does not author the acceptance criteria for the artifact it is producing.** Measurements are stated as numbers; thresholds are the owner's. Do not invent a pass mark for the pour.
- **A check that cannot fail is a defect, not a check.** Every check added here gets a test proving it fails on a bad input, not only that it passes on a good one.
- **Imports are explicit relative paths with the file extension** (`../../lib/model/types.ts`), per `CLAUDE.md`. Not `@/`, not extensionless.
- **No fallbacks and no mock data outside test code.** Throw with a message naming what is missing.
- **Files stay within 300-500 lines.** Split at a real seam when a file approaches it.
- **`make typecheck` is a gate.** `bun run check` is typecheck plus tests.
- Commit per task. Never add AI attribution to a commit message or PR. Never use `sed` to write files - use Edit/Write. Never put `#` inside a bash heredoc or multi-line quoted argument; write a file and use `git commit -F`.

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `krt.pin` | the engine's URL, provenance tag and commit - same format and rules as `veroroute.pin` |
| `tools/krt/acquire.ts` | clone, checkout, build the engine; write the build stamp |
| `tools/krt/preflight.ts` | prove placement, grading (both ways), routing and saved zone refill on the pin, on a throwaway fixture |
| `build/krt/invocations.json` | the exact argv the preflight used for each operation - Tasks 8 and 10 read this instead of inventing a command |
| `tools/pcb/drc.ts` | drive `kicad-cli pcb drc`; parse the JSON report; fail closed |
| `tools/pcb/drc-policy.ts` | the three report classes and what each tolerates |
| `tools/pcb/pour.ts` | measure a filled pour: continuity, narrowest bridge, spokes per ground pad |
| `make/krt.mk` | `krt`, `check-intent`, `place`, `route`, `drc`, `parity` targets |
| `docs/standards/pcbway-fab-rules.md` | the project-wide fabrication standard and where each value is enforced |
| `circuits/pt2399-core/pt2399-core.kicad_pro` | Board Setup constraints and net classes |
| `circuits/pt2399-core/pt2399-core.kicad_pcb` | the board |
| `circuits/pt2399-core/floorplan-intent.json` | blocks, zones, keepouts, the header's edge and setback |
| `circuits/pt2399-core/placement-rules.json` | separation, proximity, anchors |
| `circuits/pt2399-core/placement-policy.json` | allowed overrides, per operation, with reasons |
| `circuits/pt2399-core/route-fab-floor.txt` | the router's minimums, set to the standard |
| `parts/ic-pt2399-dip16.json` | the PT2399 catalogue entry, with sourcing evidence |

**Modified:** `tools/bom/types.ts`, `tools/bom/footprints.ts`, `tools/bom/needs-text.ts`, `tools/bom/fit.ts`, `tools/bom/needs.ts`, `boards/pt2399-core/bom.json`, `Makefile`, `README.md`.

**Tests:** `tests/bom/footprints.test.ts`, `tests/bom/needs.test.ts`, `tests/bom/fit.test.ts`, `tests/bom/needs-text.test.ts` (all extended), plus new `tests/krt/acquire.test.ts`, `tests/pcb/drc.test.ts`, `tests/pcb/pour.test.ts`, and fixtures under `tests/fixtures/pcb/`.

---

## Task 0: Confirm the toolchain, and record what is missing

**Files:** none created. This task's product is a recorded finding.

- [ ] **Step 1: Probe each tool and record the version string from the tool itself**

**Do not probe `kicad-cli` with `command -v`.** It is installed on this machine and is **not on `PATH`**, so `command -v` reports it missing and this task would stop the whole plan on a false negative. This repository already owns the right mechanism: `defaultKicadCli()` in `lib/kicad/install.ts` resolves the binary by trying candidate **paths** for the platform and throwing a message that names what to set. Use it.

```bash
bun -e 'import {defaultKicadCli} from "./lib/kicad/install.ts"; console.log(defaultKicadCli())'
cargo --version
python3 --version
```

Then run `<resolved> version` on the path that comes back. Both `version` and `--version` print the bare string on 10.0.5.

**Measured on this machine, 2026-11-13:** `kicad-cli` 10.0.5 present at `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`; `cargo` present at `/opt/homebrew/bin/cargo`; neither is a blocker. This is a note about one machine at one moment, not a substitute for running the probe - which is the whole reason this task reports a measurement rather than a document stating a version.

- [ ] **Step 2: If a tool is genuinely absent, stop and report**

Installing KiCad or a Rust toolchain is an operator action on their machine, not something this task performs silently. Report what is missing, by the resolver's own error message, and wait.

- [ ] **Step 3: Record the confirmed versions in the task report**

Not in prose in a document. A version string comes from `--version` on the installed artifact, and the probe run's record carries it.

---

## Task 1: The `ic` parts-list rule

`make check` and `bom` both refuse this board today, by name: `component "delay_ic" (kind "ic") has no parts-list rule in tools/bom/needs.ts`. The refusal understates the work - `physicalFor` has no DIP branch either, so a DIP footprint hits its "not one of the footprints this recognises" throw. Independent of the PCB work; land it first.

**Files:**
- Modify: `tools/bom/types.ts`, `tools/bom/footprints.ts`, `tools/bom/needs-text.ts`, `tools/bom/fit.ts`, `tools/bom/needs.ts`
- Test: `tests/bom/footprints.test.ts`, `tests/bom/needs.test.ts`, `tests/bom/fit.test.ts`, `tests/bom/needs-text.test.ts`

**Interfaces:**
- Produces: a `dip` arm on both `Physical` and `Specs`: `{ readonly kind: "dip"; readonly pins: number; readonly rowSpacingMm: number; readonly pitchMm: number }`. Task 2's catalogue entry states `pins`, `rowSpacingMm` and `pitchMm` in its `specs`.
- Consumes: `physicalFor(footprint, component, pinNumbers)` and `lineKey(...)`, both already in `tools/bom/`.

- [ ] **Step 1: Write the failing test for the DIP footprint**

In `tests/bom/footprints.test.ts`:

```ts
const DIP16_FOOTPRINT = "Package_DIP:DIP-16_W7.62mm"

test("a DIP footprint yields its pin count, row spacing and pitch", () => {
  const component: Component = {
    id: "delay_ic", kind: "ic", parameters: {}, part: { footprint: DIP16_FOOTPRINT },
    pins: {}, units: [{ name: "MAIN", pins: {} }],
  }
  expect(physicalFor(DIP16_FOOTPRINT, component, {})).toEqual({
    kind: "dip", pins: 16, rowSpacingMm: 7.62, pitchMm: 2.54,
  })
})
```

- [ ] **Step 2: Run it and confirm it fails for the right reason**

Run: `bun test tests/bom/footprints.test.ts`
Expected: FAIL, the message naming `Package_DIP:DIP-16_W7.62mm` as a footprint `tools/bom/footprints.ts` does not recognise. If it fails any other way, stop - the test is wrong, not the code.

- [ ] **Step 3: Add the `dip` arm to `Physical` and `Specs`**

In `tools/bom/types.ts`, in both unions, with a comment saying what is NOT checked and why - the pattern the `disc-capacitor` arm already sets:

```ts
  /**
   * A dual-in-line package. `rowSpacingMm` is the footprint's `W` - the distance
   * between the two pad rows - which a DIP datasheet states and a socket must match.
   * Body length has NO field: it follows from the pin count at this pitch, so a
   * number nothing independently checks is deliberately absent.
   */
  | { readonly kind: "dip"; readonly pins: number; readonly rowSpacingMm: number; readonly pitchMm: number }
```

- [ ] **Step 4: Add the regex branch in `tools/bom/footprints.ts`**

Beside the existing constants, then a branch in `physicalFor` before the final throw, and the family added to `KNOWN_FOOTPRINTS`:

```ts
const DIP = /^Package_DIP:DIP-([0-9]+)_W([0-9]+(?:\.[0-9]+)?)mm$/
const DIP_PITCH_MM = 2.54
```

```ts
  const dip = DIP.exec(footprint)
  if (dip !== null) {
    return {
      kind: "dip",
      pins: Number(dip[1]),
      rowSpacingMm: parseMm(dip[2], footprint, "row spacing"),
      pitchMm: DIP_PITCH_MM,
    }
  }
```

- [ ] **Step 5: Run typecheck and let it find the exhaustive switch**

Run: `bun run typecheck`
Expected: an error in `tools/bom/needs-text.ts`, whose `switch (physical.kind)` has no `default` and so stops compiling until the new arm is handled. **This is a type-level guard working.** Do not add a `default` to silence it.

- [ ] **Step 6: Write the failing test for the text, then handle the case**

In `tests/bom/needs-text.test.ts`, assert the buyer-facing text; then in `tools/bom/needs-text.ts`:

```ts
    case "dip":
      return `DIP-${physical.pins}, ${physical.rowSpacingMm} mm rows, ${physical.pitchMm} mm pitch`
```

- [ ] **Step 7: Write the failing fit test, then add the fit arm**

In `tests/bom/fit.test.ts`, one case where the entry fits and one where `rowSpacingMm` disagrees and is reported as a misfit by name. Then in `tools/bom/fit.ts`, in the existing chain:

```ts
  } else if (physical.kind === "dip") {
    push(checkEqual("pins", physical.pins, specs.pins))
    push(checkEqual("rowSpacingMm", physical.rowSpacingMm, specs.rowSpacingMm))
    push(checkEqual("pitchMm", physical.pitchMm, specs.pitchMm))
```

- [ ] **Step 8: Write the failing test for the derived line**

In `tests/bom/needs.test.ts`, a one-IC circuit whose derived needs carry one `ic` line with the `dip` physical, the designator, and `partType` from the model's `part.mpn` (`"PT2399"`).

- [ ] **Step 9: Collapse the duplicate input builders, then add `ic` to the rule**

`bjtInput` and `connectorInput` in `tools/bom/needs.ts` have **byte-identical bodies**. Adding `icInput` as a third copy is the verbatim-duplication defect the review rubric names, so the three become one at the moment the third would appear. This is scoped to the edit site, not a wider refactor:

```ts
/**
 * A packaged part whose line is identified by kind, value, part type and footprint, with
 * no electrical rating of its own to derive - a transistor, a connector, an IC.
 *
 * ONE function rather than three identical ones. `bjtInput` and `connectorInput` were
 * byte-identical bodies, and the `ic` rule would have been a third copy.
 */
function packagedPartInput(component: Component, pinNumbers: BoardCircuit["pinNumbers"]): LineInput {
  const footprint = footprintOf(component)
  return {
    key: lineKey(component.kind, valueFor(component), undefined, component.part?.mpn, footprintName(footprint)),
    placement: "on-board", kind: component.kind, partType: component.part?.mpn,
    physical: physicalFor(footprint, component, pinNumbers),
  }
}
```

Then remove `"ic"` from `UNSUPPORTED_KINDS` and route all three kinds through it:

```ts
    if (component.kind === "bjt" || component.kind === "connector" || component.kind === "ic") {
      addToGroup(groups, ref, packagedPartInput(component, circuit.pinNumbers))
      continue
    }
```

- [ ] **Step 10: Run the full suite and typecheck**

Run: `bun run check`
Expected: PASS. The board's own `bom` verb now gets past kind resolution and refuses for a different, truthful reason - no catalogue entry chosen for the IC line. That is Task 2.

- [ ] **Step 11: Commit**

```bash
git add tools/bom tests/bom
git commit -F <message file>
```

---

## Task 2: The PT2399 catalogue entry, and the socket decision

**Files:**
- Create: `parts/ic-pt2399-dip16.json` and a DIP-16 socket entry (the socket is decided - Step 2)
- Modify: `boards/pt2399-core/bom.json`

- [ ] **Step 1: Research the part with the `part-researcher` agent**

That agent exists for exactly this and writes catalogue entries with evidence for every spec. Its brief: the `ic` line of `boards/pt2399-core`, a PT2399 in `DIP-16_W7.62mm`, `specs.pins` 16, `specs.rowSpacingMm` 7.62, `specs.pitchMm` 2.54, `specs.type` `"PT2399"` so `fit.ts` compares the circuit's required device type against `specs.type` and not against the entry's `mpn`. **Pass the Global Constraints into the brief**, including the no-AI-attribution rule.

- [ ] **Step 2: Decide the socket, and record it**

**Decided: fit a socket.** The owner, 2026-11-13 - *"yes to the dip-16 socket"* - recorded in `docs/known-gaps.md` **G312**.

A DIP-16 socket shares the IC's land pattern, so this changes the parts list and **not** the layout. Nothing in Tasks 6 through 10 moves because of it: the board still carries one `DIP-16_W7.62mm` footprint, and whether an IC or a socket sits in it is a sourcing fact. What changes is `bom.json`, which gains the socket as an `extras` line beside the PT2399's own `lines` entry.

Add the socket to the Step 1 researcher brief rather than running that agent twice: a through-hole DIP-16 socket on 2.54 mm pitch with 7.62 mm row spacing, catalogue entry in `parts/`, sourcing evidence per spec as for the IC.

**One consequence worth stating, because it is the only thing a socket costs this board:** the PT2399 now sits roughly a socket's height higher, so if anything is ever mounted over it the clearance is measured to the socketed height, not the bare IC's.

- [ ] **Step 3: Record the choice in `boards/pt2399-core/bom.json`**

Add the `ic` line's chosen entry to `lines`, keyed as the derived line's key - read the key from the `bom` verb's own output rather than constructing it by hand.

- [ ] **Step 4: Run the board's parts list**

Run: `bun run perfboard -C boards/pt2399-core bom`
Expected: "The parts list matches the circuit: every line is chosen and every chosen part fits." Then `make -C boards/pt2399-core check` passes, which it has not done for this board before.

- [ ] **Step 5: Commit**

---

## Task 3: The fabrication standard

**Files:** Create `docs/standards/pcbway-fab-rules.md`

- [ ] **Step 1: Write the standard**

Content, not a sketch - the project values with the vendor floor beside each, because a reader needs to know which number is ours and which is theirs:

| Rule | PCBWay, no extra cost | Project value |
| --- | --- | --- |
| Track width | >= 0.15 mm | 0.3 mm signal, 0.5 mm power; 0.25 mm minimum |
| Copper clearance | >= 0.15 mm | 0.25 mm |
| Drill, vias and PTH | >= 0.3 mm | 0.4 mm via drill; 0.3 mm minimum hole |
| Annular ring | >= 0.15 mm | 0.2 mm (0.8 mm via pad on a 0.4 mm drill) |
| Hole to hole | >= 0.4 mm | 0.5 mm |
| Mounting holes (NPTH) | non-plated, no annular ring | 3.2 mm, the standard M3 clearance (Task 7) |
| Copper to board edge | >= 0.25 mm | 0.5 mm |
| Silkscreen text | stroke >= 0.15 mm, height >= 0.8 mm | stroke 0.15 mm, height 0.8 mm minimum |
| Layers, material | 2-layer FR-4, standard thickness and copper | same |

- [ ] **Step 2: Write the "where each value is enforced" section**

A rule written only in prose drifts, so each value names the file a tool reads: the Board Setup constraints and net-class widths in the `.kicad_pro` for KiCad's DRC, and the same minimums in `route-fab-floor.txt` for the router. State why the second exists: without a standing floor instruction the router's own fab tier necks tracks and shrinks vias below this spec.

- [ ] **Step 3: Write the "not enforced" section**

Three items, so none is mistaken for checked: trace impedance and via inductance, which do not matter at this board's frequencies and are not why these rules exist; **silkscreen graphic line width, for which KiCad has no design rule at all**; and assembly, since these are bare-board rules. Mark the silkscreen item as what Task 6 measures.

- [ ] **Step 4: Cite the sources** - PCBWay's own published capabilities page, by URL.

- [ ] **Step 5: Commit**

---

## Task 4: Pin and acquire the engine

**Files:**
- Create: `krt.pin`, `tools/krt/acquire.ts`, `make/krt.mk`
- Test: `tests/krt/acquire.test.ts`
- Modify: `Makefile` (include `make/krt.mk`)

**Interfaces:**
- Produces: `readPin(file): Pin`, `acquire(pin, opts): string`, `builtCommit(repoRoot): string | undefined`, `builtCommitFile(repoRoot): string`.
- Consumes: the same shape `tools/perfboard/acquire.ts` already uses for the VeroRoute fork. **Read that module completely before writing this one** - it carries the stamp lesson below in working form.

- [ ] **Step 1: Write `krt.pin`**

One `<field> <value>` pair per line, `#` comments, exactly as `veroroute.pin` does. Fields: `url`, `tag` (provenance only), `commit` (the authority). **The exact values, verified against the public upstream on 2026-11-13 rather than transcribed:**

| Field | Value |
| --- | --- |
| `url` | `https://github.com/drandyhaas/KiCadRoutingTools.git` |
| `tag` | `v0.21.3` |
| `commit` | `749cfa8333765288a807f825064b68015fd10ea9` |

How that was verified, and how to re-verify if it is ever doubted: `git ls-remote --tags <url>` prints `749cfa83…` for `refs/tags/v0.21.3^{}` - the **dereferenced** tag, which is the commit, not the annotated tag object `ebcea927…`. Pinning the tag object instead of its target is a real and easy mistake, and `commit` must be the dereferenced value. The commit is dated 2026-08-22. The repository is MIT and public, which is why a URL and SHA may appear here at all; it is the one legitimately shared citation the Global Constraints allow.

- [ ] **Step 2: Write the failing test for the stamp**

The lesson the VeroRoute acquisition already paid for: **keying "is it built?" on file existence is wrong**, because a pin bump does not change whether a file exists, so the old binary stays in place while the tool reports the new commit - claiming code it is not running. Three tests, each asserting that acquisition **happened**:

```ts
test("a stamp matching the pin skips acquisition", () => { /* stamp === pin.commit -> no acquire */ })
test("a stamp from a different commit re-acquires", () => { /* stamp "old123", pin "new456" -> acquire ran */ })
test("a missing stamp re-acquires, because unstamped is unknown and not agreed", () => { /* undefined -> acquire ran */ })
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `bun test tests/krt/acquire.test.ts`
Expected: FAIL - no module yet.

- [ ] **Step 4: Implement acquisition**

Clone to a gitignored `.tools/` path; `git fetch origin` and retry once before refusing a checkout, so a pin moved to a commit the clone has not seen yet is not a hard failure; build the Python venv and the Rust router; **write the stamp last**, so an interrupted build is unstamped and therefore unknown rather than falsely agreed.

Two environment facts that are not optional: the router builds from source and needs `cargo`; and every engine call runs with `PYTHONHOME` and `PYTHONPATH` **removed from the environment**, because KiCad's shell points them at its own Python and the engine's venv will otherwise load the wrong interpreter.

- [ ] **Step 5: Run the tests** - Expected: PASS.

- [ ] **Step 6: Add `make krt` and wire it into the root Makefile**

A no-op once built and stamped. Print the resolved path and the commit it was built from - the commit from the **stamp**, never from the pin file, which is the bug Step 2 pins.

- [ ] **Step 7: Acquire for real, and record the engine commit** - Run: `make krt`

- [ ] **Step 8: Preflight the engine, and record the invocations it used**

**This step exists so that a broken toolchain fails as a toolchain failure, rather than arriving later disguised as "the board does not route."** Review issue 34 point 1 asked for it, and it is also what lets Tasks 8 and 10 name real commands instead of placeholders.

Create `tools/krt/preflight.ts` and `make krt-preflight`. On a **throwaway two-part fixture board** - never `pt2399-core`, so nothing here can be mistaken for a result about the real board - drive the four operations the probe depends on, in order, each failing loudly:

| Operation | Proves |
| --- | --- |
| placement | the optimizer runs and writes a board |
| grading (`check-intent`) | the grader loads intent and returns a grade, including a **failing** one on deliberately bad intent |
| routing | the router runs and lays copper |
| zone refill, **saved** | the refilled pour is written back to the board file, which is what Task 9 measures |

The grader step must be exercised **both ways**. A grader that returns "pass" unconditionally would satisfy a one-sided preflight and then silently approve every placement in Task 8.

- [ ] **Step 9: Write `build/krt/invocations.json` and commit it**

The preflight's output artifact: for each of the four operations, the exact argv it invoked, the engine commit from the **stamp**, and the environment it required (`PYTHONHOME`/`PYTHONPATH` unset). **Tasks 8 and 10 read this file rather than inventing a command line.** If an invocation in it stops working, the preflight fails before the probe runs.

- [ ] **Step 10: Commit**

---

## Task 5: The fail-closed parity and DRC check

The spec's Phase 1 acceptance criteria in code. `--severity-error` silently filters out every schematic-parity violation, which is the one thing a parity check exists to catch, so this module's correctness is the gate's correctness.

**Files:**
- Create: `tools/pcb/drc.ts`, `tools/pcb/drc-policy.ts`
- Test: `tests/pcb/drc.test.ts`, fixtures in `tests/fixtures/pcb/`

**Interfaces:**
- Produces: `runDrc(boardPath, opts): DrcReport` and `verdictOf(report, policy): Verdict`, where `DrcReport` carries the three counts separately: `schematicParity`, `violations`, `unconnectedItems`.
- Consumes: `defaultKicadCli()` from `lib/kicad/install.ts` - the path, not a spawner.

- [ ] **Step 1: Build the two fixtures**

Minimal and hand-built, not the real board - a two-part board plus its schematic, in two versions: a **known-good pair**, and the same pair with **one pad deliberately assigned to the wrong net**. Hermetic, fast, and each one's purpose stated in a comment beside it.

- [ ] **Step 2: Write the failing tests - the negative ones first**

```ts
test("a wrong pad-to-net assignment is reported as a schematic_parity violation", () => { /* expect > 0 */ })
test("a missing report file FAILS rather than reading as zero violations", () => { /* throws, naming the path */ })
test("an unreadable report FAILS rather than reading as zero violations", () => { /* malformed JSON -> throws */ })
test("a report with no parity field FAILS, because a missing field is not zero", () => { /* throws */ })
test("a report with no violations array FAILS", () => { /* the policy consumes it; absent is not empty */ })
test("a report with no unconnected_items array FAILS", () => { /* same */ })
test("a violation with no severity FAILS, because the policy is severity-scoped", () => { /* throws */ })
test("a non-zero kicad-cli exit FAILS even when a clean report sits at the output path", () => { /* stale report from an earlier run must not be read */ })
test("included_severities missing 'warning' or 'exclusion' FAILS - the severity-error trap, caught from the report", () => { /* throws */ })
test("a report whose parity could not run FAILS, although schematic_parity is []", () => { /* MEASURED: see Step 4 */ })
test("a result field holding null or a string FAILS - present is not an array", () => { /* throws */ })
test("a violation with an unrecognised severity FAILS before the policy is applied", () => { /* throws */ })
test("ignored_checks containing items_not_allowed FAILS - Task 8's gate would be disabled", () => { /* throws */ })
test("INTEGRATION, real kicad-cli: no schematic beside the board is rejected BY LEG 1", () => { /* assert the guard, not just the refusal */ })
test("INTEGRATION, real kicad-cli: a basename mismatch passes leg 1 and is rejected BY LEG 2", () => { /* the only fixture that exercises the diagnostic */ })
test("INTEGRATION, real kicad-cli: the matching pair RUNS parity and populates schematic_parity", () => { /* positive control */ })
test("the known-good pair reports zero parity violations and passes both legs", () => { /* expect 0 */ })
```

Every test but the last matters more than the last. A check that only passes on good input has not been shown to work.

- [ ] **Step 3: Run them** - Expected: FAIL, no module yet.

- [ ] **Step 4: Implement `runDrc`**

Invoke `kicad-cli pcb drc --schematic-parity --format json --severity-all -o <report> <board>`, on the candidate paired with **its own** schematic and project configuration, writing to a **fresh output path per run** - a stale report from an earlier run at a reused path is readable, self-consistent and wrong.

**The measured behaviour this step must defend against, taken from the pinned 10.0.5 on 2026-11-13.** Run against a board whose schematic cannot be fetched, `kicad-cli`:

- prints `Failed to fetch schematic netlist for parity tests` to stderr,
- **exits 0**,
- and writes a report containing `"schematic_parity": []`.

**An empty array, not a missing key.** So the parity gate reads *zero parity violations* on a parity test that never ran - a skipped check wearing a passing check's clothes, which is the failure mode this whole module exists to prevent. Note what does *not* catch it: requiring a successful process exit does not, because the exit is 0. The refusal must rest on **positive evidence that parity ran**, and the test above is the one that re-runs this measurement rather than leaving it as prose.

The full refusal set, four fields rather than three. **Every one of the three result fields must be an ARRAY, not merely present** - a key holding `null`, a string or an object is a malformed report, not an empty one:

| Read | Refuse when |
| --- | --- |
| process | `kicad-cli` exits non-zero, or its stderr carries the parity-fetch diagnostic |
| parity ran | the positive evidence below is absent - see **Step 4b**, which is the whole of this row |
| `schematic_parity` | key absent, or not an array |
| `violations` | key absent, not an array, or any entry lacking `severity`, or carrying a `severity` outside `error` / `warning` / `exclusion` |
| `unconnected_items` | key absent, or not an array |
| `included_severities` | does not contain all of `error`, `warning`, `exclusion` |
| `ignored_checks` | contains `items_not_allowed`, on which the Task 8 hardware-envelope gate depends |

**Reject an unknown severity before applying the policy, not after.** The policy is severity-scoped - "zero tolerated at error severity" - so a violation carrying a severity the code does not recognise cannot be classified, and silently treating it as not-an-error is how a real violation becomes a pass. The three accepted values are measured, not assumed: a `--severity-all` run reports exactly `["error","warning","exclusion"]` in `included_severities`.

- [ ] **Step 4b: Establish that parity actually RAN, and say plainly what that rests on**

Review issue 34 is right that the previous draft asserted "positive evidence that parity ran" and then supplied only a non-zero-exit check and a stderr string. This is the contract, and **the honest part is that KiCad offers no affirmative "parity ran" signal, so one is constructed from two independent legs**:

**Leg 1, a precondition that does not depend on any message text.** Before DRC, export the candidate schematic's own netlist with `kicad-cli sch export netlist`, and require it to yield **at least one component**. Measured 2026-11-13: that command **exits 0 even on a schematic with nothing in it**, writing a well-formed 956-byte netlist with no components, against 36 KB for the real `pt2399-core` schematic. **So the count is the check and the exit code is not** - the same lesson as `schematic_parity: []`, one tool along. This establishes that the schematic this pair names is locatable, loadable and non-empty, which is the condition whose absence produces the failed fetch.

**Leg 2, the diagnostic, named as what it is.** The runner also treats the stderr line `Failed to fetch schematic netlist for parity tests` as a refusal. **This leg is version-coupled and the plan says so rather than implying robustness it does not have**: the wording is KiCad's, not ours, and a release could change it. It is therefore pinned by a test that runs the real pinned tool against a failed-fetch pair and asserts the refusal still fires - so a version bump that reworded the message **fails loudly instead of silently disabling the guard.** That test is the reason this leg is acceptable at all.

**Both paths go through the actual runner, not a stubbed report**, as the review asks. A unit test over a hand-written JSON fixture cannot establish either, because the behaviour under test is the tool's.

**And every negative test asserts WHICH guard rejected it, by name.** Review issue 34 is right that this is not a detail: a failed-fetch fixture that leg 1 stops leaves leg 2 **completely untested**, and a leg that is never exercised is not a guard. Asserting only "it was refused" would hide that.

That requires a fixture for each leg, and **the second one is not obvious - it had to be found by measurement, 2026-11-13:**

| Fixture | Leg 1 (netlist components) | Leg 2 (diagnostic) | Asserts |
| --- | --- | --- | --- |
| **no schematic** beside the board | FAIL - nothing to export | n/a | leg 1 rejects |
| **basename mismatch** - `theschematic.kicad_sch` beside `theboard.kicad_pcb` | **PASS - 24 components** | **FIRES** | **leg 2 rejects** |
| **clean pair** - matching basenames | PASS - 24 components | silent | parity runs; zero violations |

**The middle row is the one that makes leg 2 testable at all**, and the reason it works is worth stating: leg 1 exports the netlist of a schematic named *explicitly*, while DRC finds the board's schematic by project and basename convention. When those disagree, leg 1 passes and the fetch still fails. That is also a realistic misconfiguration rather than a contrived one - it is precisely how a candidate gets paired with the wrong schematic, or none.

**Two measurements behind this, both recorded because they refute a plausible assumption.** Parity genuinely runs on a matching pair - the real `pt2399-core` schematic against an empty board reports `Found 24 schematic parity issues`, so the positive path populates the field rather than merely not failing. And **de-annotating the schematic does NOT reach leg 2**: rewriting all 24 `Reference` properties to `R?` form still exported 24 components and still ran parity. An implementer reaching for "unannotated" as the leg 2 fixture will produce a test that passes for the wrong reason.

**`included_severities` is the find worth keeping.** It is in the report, and it records what the run actually requested: a `--severity-error` run writes `["error"]`, a `--severity-all` run writes `["error","warning","exclusion"]`. So the `--severity-error` trap is **detectable from the report itself** rather than guarded by passing the right flag and trusting it. Assert the field. This is a check that catches its own misinvocation.

`--exit-code-violations` is deliberately **not** used to decide the verdict: this module reads the report, because the exit code cannot distinguish the classes. That omission is also what makes "exit 0" meaningful as a ran-to-completion signal - **adding the flag later would silently invert the process check**, turning an ordinary violation into a refusal. Record both halves in the module comment so nobody "simplifies" it back.

- [ ] **Step 5: Implement `verdictOf` with the three policies in `drc-policy.ts`**

| Class | Policy |
| --- | --- |
| `schematic_parity` | zero tolerated - a board that disagrees with its schematic is not this board |
| DRC violations | zero tolerated at error severity, against the standard's values |
| `unconnected_items` | zero on a routed candidate; **counted, not ignored, on an unrouted one**, where it measures what the router left undone |

- [ ] **Step 6: The flags and key names are already confirmed - verify the version, do not re-derive the names**

Spec open question 2, **closed on 2026-11-13 by running the pinned tool** rather than reading the 9.0 page. `kicad-cli` 10.0.5 is installed at `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` and is **not on `PATH`** - resolve it through `defaultKicadCli()`, never by bare name.

Confirmed present on 10.0.5: `--schematic-parity`, `--format json`, `--severity-all`, `--severity-error`, `--exit-code-violations`, `--refill-zones`, `--save-board` (the last two coupled - `--save-board` must be used with `--refill-zones`). Report top-level keys: `$schema`, `coordinate_units`, `date`, `ignored_checks`, `included_severities`, `kicad_version`, `schematic_parity`, `source`, `unconnected_items`, `violations`.

What this step still does: assert the version from `kicad-cli version` on the installed artifact, per this repository's standing practice. If a future bump changes a key, the Step 2 tests fail - which is the point of them being tests rather than a table in prose.

- [ ] **Step 7: Run the suite** - Expected: PASS.

- [ ] **Step 8: Add `make parity-pt2399-core` and `make drc-pt2399-core`**

- [ ] **Step 9: Commit**

---

## Task 6: The KiCad project and the initial board

**Files:** Create `circuits/pt2399-core/pt2399-core.kicad_pro` and `circuits/pt2399-core/pt2399-core.kicad_pcb`. The existing `pt2399-core.kicad_sch` is read, never written. This directory is where KiCad sources live here, per commit `0f5d775`.

- [ ] **Step 1: Create the project file with the standard's constraints**

Board Setup: `min_track_width`, `min_clearance` on the Default net class, `min_via_diameter`, `min_via_annular_width`, `min_through_hole_diameter`, `min_hole_to_hole`, `min_copper_edge_clearance`, `min_text_thickness`, `min_text_height` - every value from Task 3. Net classes with `via_diameter` 0.8 / `via_drill` 0.4 and the signal and power track widths.

- [ ] **Step 2: Load the footprints onto a fresh board - and read this first**

> **THIS STEP SAID THE OPPOSITE UNTIL 2026-11-13, AND THE OLD WORDING IS SHOWN STRUCK RATHER THAN EDITED AWAY, because the refuted claim is the part a later reader needs.** It read: *"**KiCad has no headless "Update PCB from Schematic".** This step is therefore a **one-time operator action in the KiCad PCB editor**: open the project, Tools > Update PCB from Schematic, apply, save. It is the one manual step in Phase 1 and it is manual because the tool offers no alternative, not as a convenience."* - followed by a prohibition on working around it by hand-writing footprint s-expressions.
>
> **The first sentence is false, and the owner refused the step before anyone tested it:** *"I can't believe there isnt a way to update from schematic headlessly. I'm not going to be your dumb secretary and click a button for you every time. You need to figure out how to do it yourself"*. He was right, and the controller had repeated this plan's own assertion without measuring it. **The spec already forbade this on page one** - *"I don't want to lay out the tht board by hand if I don't have to"* - so a manual step in the plan contradicted the document the plan argues from.
>
> **The prohibition on hand-writing s-expressions is KEPT, and the headless path honours it** rather than circumventing it: KiCad writes the board file itself.

**There IS a headless equivalent: the `pcbnew` Python API.** Run `make update-pt2399-core`. Four plausible routes are dead ends, and the reason this was got wrong once is that a search stopping at any of them concludes the step is manual:

| Route | Why it does not work |
| --- | --- |
| a `kicad-cli` verb | None exists; `kicad-cli pcb` offers only `{drc,export,import,render,upgrade}` |
| `BOARD_NETLIST_UPDATER`, the class the menu item drives | **The SWIG bindings expose no netlist classes at all** - `[n for n in dir(pcbnew) if 'NETLIST' in n.upper()]` is empty |
| a jobset job | The registry holds export/DRC/ERC jobs plus only `special_copyfiles` and `special_execute` |
| the IPC API | `RunAction` can fire `common.Control.updatePcbFromSchematic`, but that **opens the modal dialog** and needs a running GUI |

What works is doing the updater's own job through the primitives the bindings *do* expose - `FootprintLoad`, `NETINFO_ITEM`, `BOARD.Add`, `SetFPIDAsString`, `SetReference`, `SetValue`, `SetField`, `SetPath`, `PAD.SetNet`, `LoadBoard`, `SaveBoard`. Task 6ab builds this as `tools/pcb/update-from-schematic.ts` (parsing, validation and every refusal) over `tools/pcb/update-from-schematic.py` (the `pcbnew` calls only).

**Two defects a weak check would miss, because neither presents as a missing footprint.** `FootprintLoad` returns a footprint whose FPID carries an **empty library nickname**, which parity reports as *"CP_Radial_D5.0mm_P2.50mm doesn't match footprint given by symbol (Capacitor_THT:CP_Radial_D5.0mm_P2.50mm)"*; and the schematic's fields are not carried across, reported as *"Field 'Description' differs"*. The GUI updater does both; so must this.

**And a KiCad 10 format change, so nobody reads a correct board as a broken one:** a pad's net is written `(net "Net-(U1-LPF2-IN)")` - **name only, no code - with no top-level net table at all.** A grep for the KiCad 7-9 form `(net <n> "<name>")` matches nothing on a correctly netted board.

- [ ] **Step 3: Prove the update landed correctly**

Run: `make parity-pt2399-core`
Expected: **zero** `schematic_parity` violations. This is the point of doing Task 5 first - the update is verified by a check rather than by trusting the tool that performed it. 24 components and 65 pads should be present; a missing or misassigned footprint shows up here as a parity violation naming it.

**The guard that matters most here is not parity.** `LoadBoard` + `SaveBoard` rewrites the entire board file, so it could silently discard Step 1's configuration while parity still passed - the same shape as this plan's other false greens. The tool therefore compares the `(setup ...)` block's key set before and after and refuses on any loss. **Additions are expected and allowed:** KiCad writes out values it had left implicit, measured on this board as 186 -> 1193 bytes gaining `tenting`, `covering`, `plugging` and the `pcbplotparams` defaults, with nothing removed. Compare key sets, never sizes.

- [ ] **Step 4: Read and record the silkscreen outline widths**

The spec marks this NOT VERIFIED. Read the `F.Silkscreen` graphic line widths of the seven footprints this board uses, and record which fall below 0.15 mm. KiCad has no design rule for graphic line width, so this is a recorded disclosure, not a gate. Expected consequence of a thin outline is a faint legend, not a rejected or dearer board.

- [ ] **Step 5: Commit the project and board**

---

## Task 7: The placement intent, drafted for approval

**Files:** Create `circuits/pt2399-core/floorplan-intent.json`, `placement-rules.json`, `placement-policy.json`, `route-fab-floor.txt`, and a `.kicad_dru` only if Step 3 shows it is needed.

**This task ends at a human gate.** The agent drafts; an independent review checks; **the owner approves.** Nothing is placed for adoption under unapproved intent, and changing any of these files later invalidates every run made under them.

- [ ] **Step 1: Draft `floorplan-intent.json`**

Blocks from the circuit's own structure, which the model already names: supply decoupling (`C1`, `C2`), the PT2399's reference and oscillator bypassing (`C3`, `C4`, `C5`), the input path (`C7`, `R3`, `R4`), the LPF1 node (`R1`, `R2`, `C6`, `C8`), the LPF2 and regeneration node (`R6`, `R7`, `R8`, `C11`, `C12`), the op-amp feedback caps (`C13`, `C14`), and the output path (`R5`, `C9`, `C10`). `J1` as the edge connector with a `max_setback_mm` and `must_lock`.

**The four mounting holes go in as a derivation rule, not as coordinates** - review issue 34 point 2, and the ordering defect it is still chasing. Task 8 moves the edge and the corners, so any literal keepout coordinate approved here is stale by the time Step 3 of that task regrades against it, and the regrade would then check the wrong keepouts while reporting a pass. What is approved is therefore the **invariant**: one hole at each corner, inset far enough that the full envelope sits on the board with margin, with the hole and envelope diameters taken from the fastener the owner specified.

**The inset is 4.0 mm, and the two numbers inside it are different in kind** - review issue 34 found it stated two ways: implied as 4.0 mm here, by a clause that added 0.5 mm to the envelope, and written as 3.5 mm in Task 8, which used the envelope radius alone.

| Part | Value | What it is |
| --- | --- | --- |
| geometric floor | 3.5 mm | the washer's radius. Below this the washer **overhangs the board**. Hard. |
| margin | 0.5 mm | **a design margin for board-outline routing tolerance**, which is commonly around ±0.2 mm. Soft, and ours. |
| **inset** | **4.0 mm** | the sum |

**The 0.5 mm is NOT the standard's copper-to-edge clearance**, although it shares its value, and the earlier wording here said it was. That was wrong: copper-to-edge governs copper against the board edge and is enforced globally by DRC, while the envelope is a keepout rather than copper, so the two do not stack. A reader must not cite this 0.5 mm as a PCBWay rule - it is a margin this plan chose, and it is the one number in this table that could reasonably be argued down to the floor. Task 8 computes the coordinates from the final outline and the rule. The owner approves a rule that survives the geometry changing; he is not asked to re-approve four numbers that were always going to move.

**The fastener is an M3 screw in the standard 3.2 mm hole**, the owner's instruction of 2026-11-13, recorded verbatim in `docs/known-gaps.md` **G311**. The two diameters that follow from it:

| Quantity | Value | Source |
| --- | --- | --- |
| hole | **3.2 mm**, non-plated | the standard M3 clearance; `MountingHole:MountingHole_3.2mm_M3` is exactly this |
| envelope, from the washer | **7.0 mm** | M3 flat washer, DIN 125 Type A / ISO 7089 - 3.2 mm ID, 7.0 mm OD |

Beware the two neighbours when sourcing: **DIN 433 / ISO 7092** is the small series at 6.0 mm OD and **DIN 9021** is the large series at 9.0 mm OD. The envelope above is the ordinary DIN 125 washer, and fitting either of the others changes it.

- [ ] **Step 2: Draft `placement-rules.json`**

Input-to-output separation, since `INPUT` and `OUTPUT` both land on `J1` and must not run together. Each filter node compact around the PT2399 pins it serves - the bypass caps close to `U1`, which is what `C4`, `C5` and `C3` are for. The header's anchor on its long edge.

- [ ] **Step 3: Draft `placement-policy.json` and `route-fab-floor.txt`**

The policy's standing route entry for the fab floor is **not optional**: without it the router necks blocked tracks below the standard. Decide here whether the input/output proximity on `J1` needs a `.kicad_dru` isolation rule; the router cannot carry it, because the engine has no per-region design rules.

- [ ] **Step 4: Have the intent independently reviewed**

Not by the agent that drafted it.

- [ ] **Step 5: Present the intent to the owner and get approval**

- [ ] **Step 6: Commit the approved intent, with his words in the message**

---

## Task 8: Settle the outline in two passes

The spec's decision, and the revision review issue 34 point 2 forced: **the geometry is final before a track is laid.**

**BEFORE STEP 1: `make update-pt2399-core` WILL REFUSE, AND THAT IS NOT A FAULT.** Task 6b ran it for real, so `circuits/pt2399-core/pt2399-core.kicad_pcb` now carries 24 footprints, committed. The tool does not do incremental updates and refuses a board holding any footprint (`board-not-empty`). Re-placing from the schematic means putting an empty board back first: `cp tests/fixtures/pcb/pt2399-core-empty/pt2399-core.kicad_pcb circuits/pt2399-core/pt2399-core.kicad_pcb`. That fixture is the board's own bytes before it was populated, and `tests/pcb/empty-board-fixture.test.ts` is the authority on its provenance and on whether it has drifted from the committed board. The same sentence is in `make/pcb.mk` above the target, because that is the other place a reader stands when they hit this.

- [ ] **Step 1: Pass 1 - a generous rectangle, placement only**

Place against the approved intent to discover the extent the parts and their hardware actually need. Nothing is routed. Nothing is adopted.

- [ ] **Step 2: Fix the final geometry**

Bring the edge in to the placed extent plus the standard's 0.5 mm copper-to-edge clearance. Place the four **M3** holes against the **final** corners, by the rule Task 7 approved, modelled by **envelope, not drill** - the washer's footprint, not a 3.2 mm hole. Measure the header's setback from the final edge. Feed the computed coordinates back as the grader's keepouts for Step 3.

The numbers, from Task 7's table: **3.2 mm** non-plated hole, **7.0 mm** envelope, **4.0 mm** centre inset from each of the two edges a corner hole is near (3.5 mm geometric floor plus 0.5 mm routing-tolerance margin - see that table for why those are not the same kind of number).

**Derive a project-local footprint from the stock one.** `MountingHole:MountingHole_3.2mm_M3` is the right starting point - `np_thru_hole`, 3.2 mm drill, non-plated - but its courtyard is **6.9 mm**, measured from the installed library on 2026-11-13, and **the courtyard is the component gate**, so it must be the envelope: **7.0 mm**. That is the only change; the drill and the non-plated attribute come across untouched.

**An earlier draft said to use the stock footprint as-is, on the grounds that its courtyard gated nothing. Step 4 is where that was measured and refuted** - `courtyards_overlap` is what catches a part whose body overlaps the washer while its pads sit clear, and it compares courtyards. A 6.9 mm courtyard would quietly enforce 6.9 mm.

**And the 0.1 mm here is luck, not a property.** Under the 8-32 fastener this task briefly carried, the stock courtyard was 9.5 mm against an 11.51 mm washer - **2 mm short, and silently so**. Every stock mounting-hole courtyard in that library models the **screw head**, and heads are smaller than washers. Deriving the courtyard from the washer is what keeps the gate correct when the fastener changes.

The hardware still gets a `parts/` catalogue entry with sourcing evidence, as in Task 2, recording the M3 screw and the DIN 125 washer. Its job here is to make the 7.0 mm figure checkable rather than remembered.

- [ ] **Step 3: Regrade placement on the final geometry**

Run `check-intent` against the final board. **If the regrade fails, re-place** - do not adjust the geometry to suit a placement that was graded against different geometry. That inversion is the defect this task exists to prevent.

- [ ] **Step 4: Make the hardware envelope independently checkable by DRC**

The grader and DRC are two checks, not one, and review issue 34 point 2 is right that drill clearance alone cannot check a washer: KiCad's drill-clearance rules measure the hole.

**TWO mechanisms at ONE diameter - 7.0 mm. Every line below is measured on the pinned 10.0.5, 2026-11-13, not reasoned.**

| Intruder | Mechanism | DRC check |
| --- | --- | --- |
| **copper** under the washer | a Rule Area of 7.0 mm on `F.Cu` and `B.Cu`, `tracks` / `vias` / `copperpour` **`not_allowed`** - and **`pads` and `footprints` left ALLOWED** | `items_not_allowed`, error |
| a **part** overlapping the washer | `courtyards_overlap` against a **project-local** M3 footprint whose courtyard is **7.0 mm**, with **`missing_courtyard` ENABLED** | `courtyards_overlap`, error |

**The previous draft used one Rule Area with `pads` and `footprints` also `not_allowed`, and that is a defect: it rejects its own mounting hole.** Review issue 34 called for the clean control that found it. Measured, with the stock M3 NPTH footprint at the Rule Area's centre:

| Fixture | Result |
| --- | --- |
| `pads` + `footprints` not_allowed, mounting hole at centre | **FAILS** - `items_not_allowed` error on `NPTH pad of REF**` **and** on `Footprint REF**` |
| copper-only flags, mounting hole at centre | **clean, zero violations** - the rule permits its own footprint and drill |
| copper-only flags, track crossing in | `items_not_allowed`, error, `Track … on F.Cu` |
| part at 25.5 mm, **origin and pads outside** the envelope, courtyard overlapping | `courtyards_overlap`, error, `Footprint REF**; Footprint P1` |
| same part with **no courtyard at all** | **NOT CAUGHT - zero violations** |

**Two conclusions, and the second corrects this plan's own previous answer.**

First, the last row is why the project-local footprint is now **required** rather than optional: `courtyards_overlap` is the only thing that catches a part whose body overlaps the washer while its origin and pads sit outside, and it compares courtyards, so the mounting footprint's courtyard **is** the envelope and must be 7.0 mm rather than the stock 6.9 mm. Both mechanisms then use one number, which is what review issue 34 asked for - the inconsistency it found was two *diameters*, not two checks.

Second, **`missing_courtyard` must be explicitly ENABLED**, and the previous draft's argument for not enabling it was wrong. It claimed a Rule Area needs no courtyard, which is true of the Rule Area and irrelevant here, because the Rule Area no longer carries component clearance. A part with no courtyard is invisible to `courtyards_overlap` - measured, zero violations - so with `missing_courtyard` in KiCad's default ignored set the gate would silently not exist for exactly the parts most likely to slip through.

Task 5's `ignored_checks` refusal therefore covers **all three**: `items_not_allowed`, `courtyards_overlap` and `missing_courtyard`. The engine carries none of them - the spec records it has no per-region design rules - which is why they live in KiCad's DRC and not in the router.

- [ ] **Step 4b: Prove both intrusions are rejected, with fixtures**

Three fixtures. **All three carry the project-local M3 mounting footprint at the Rule Area's centre**, including the clean control - which is the point of the control, since a mechanism that rejects its own mounting hole is the defect this step just caught.

| Fixture | Geometry | Must produce |
| --- | --- | --- |
| **clean control** | mounting footprint at centre, nothing else | **zero** - the rule permits its own footprint and NPTH drill |
| **component intrusion** | a part whose **origin and pads are OUTSIDE** the 7.0 mm circle, body/courtyard overlapping it | `courtyards_overlap`, error |
| **copper intrusion** | a track or pour region entering the circle | `items_not_allowed`, error |

**The component fixture's geometry is specified exactly because the obvious version of it proves nothing.** A part placed wholly inside the circle is caught by several mechanisms and would pass this step while the real requirement went untested; the requirement is a part whose *body* overlaps the washer while its origin and pads do not.

**If the clean control fails, the mechanism is revised before anything relies on it** - not waived, and not worked around by shrinking the envelope. That is how the current mechanism was arrived at.

A fourth assertion, not a board: `missing_courtyard` is **enabled** in the project's DRC severities. The measurement above shows the component gate does not exist without it.

- [ ] **Step 5: Commit the final geometry**

---

## Task 9: Measure the ground pour

Numbers only. **Do not write a threshold.**

**The owner declined to set them**, 2026-11-13: *"I don't care about pour thresholds"* (`docs/known-gaps.md` **G313**). That is a declination, and it is **not** a delegation - this repository's standing rule is that an agent may never author the acceptance criteria for the artifact it is producing, and a declination does not lift it. So the measurements are reported beside the render and **gate nothing, indefinitely**, rather than acquiring a pass mark written by the thing being measured.

**This is safe rather than merely compliant, which is why it needs no escalation.** The gates that decide whether this board is sound are elsewhere and unaffected: schematic parity, DRC at error severity, and unconnected items. A pour bad enough to matter is visible in the render he reviews, and he rules on it then, looking at it - which is how every drawing decision is made here. Nobody raises the thresholds with him again unprompted.

**Files:** Create `tools/pcb/pour.ts`; test `tests/pcb/pour.test.ts`

**Interfaces:** Produces `measurePour(boardPath): PourMetrics` with `continuityAroundU1`, `narrowestBridgeMm`, `spokesByGroundPad: ReadonlyMap<string, number>`, `bypassReturn: "pour" | "track"`.

- [ ] **Step 1: Write the failing tests against hand-built fixtures**

One fixture whose pour is a single region; one split into two regions joined by a deliberately narrow bridge; one with a ground pad carrying a single spoke. Assert the measured numbers, not a verdict.

- [ ] **Step 2: Run them** - Expected: FAIL, no module yet.

- [ ] **Step 3: Implement `measurePour`, reading the SAVED POST-REFILL board**

The spec is explicit and the review insisted: the board measured is the one that would be adopted and plotted, **after** zone refill - not the pre-fill state, where the pour does not yet exist as copper.

The refill is not a separate tool. Confirmed on the pinned 10.0.5: `kicad-cli pcb drc --refill-zones --save-board` refills and writes the board back, and `--save-board` is rejected without `--refill-zones`. `measurePour` therefore reads a board file that has already been through that, and **refuses a board whose zones are unfilled** rather than reporting zeroes for a pour that has not been poured - the same skipped-check-as-passing-check hazard as Task 5, in a different costume.

- [ ] **Step 4: Run the tests** - Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 10: Run the probe and put it in front of the owner

- [ ] **Step 1: Place, then smoke-test ONE routed candidate**

Read its checks before routing more. A failure here is usually systematic - fix the cause, not the candidate. The likely causes are known and worth checking first: the router necking tracks below the fab floor without the standing instruction, a terminal routing escalation that breaks clearance rather than leaving a net open, and starved thermal spokes where a ground pad is crowded by other copper.

- [ ] **Step 2: Route the rest, detached**

The batch invocation is **the routing argv recorded in `build/krt/invocations.json`** by Task 4 Step 9, iterated over the placement candidates - not a command invented at this point in the plan. Wrap it:

```bash
nohup make krt-route-all BOARD=pt2399-core > build/logs/route-all.log 2>&1 &
```

Detached with `nohup` as a quick-returning call, because it can run long and a tracked background task is reaped at the end of a turn. The target reads the recorded invocation, so if the engine's interface has drifted the preflight fails first and this never starts. Stop on repeated identical failures - a batch hides a systematic failure.

- [ ] **Step 3: Run every Phase 1 check on each result**

Connectivity; the engine's DRC; KiCad's DRC and parity via Task 5, under the three policies; no dead copper; the pour measurement from Task 9; and that no part moved.

- [ ] **Step 4: Render, and commit everything the run produced**

Intent, metrics, reports, renders, logs. A probe whose evidence is not committed has to be re-run to be re-read.

- [ ] **Step 5: Present the render to the owner, carrying a question and nothing else**

The pour numbers go beside it, gating nothing. **Do not attach a verdict** to what he has not ruled on, and do not propose a pass mark for this board's pour.

- [ ] **Step 6: Record the gate's outcome**

If it routed clean: the finding, and Phase 2 gets its own plan and spec section. If it failed systematically: the cause, named, and the spec's record of it. The second outcome is a result, not a failure of the plan.

---

## Self-review

**Spec coverage.** Phase 1's acceptance criteria → Tasks 5 and 9. The two-pass outline and regrade → Task 8. The intent files and their approval gate → Task 7. The engine pin and stamp → Task 4. The fabrication standard → Task 3. The `ic` rule → Tasks 1 and 2. The probe and its evidence → Task 10. The silkscreen disclosure → Task 6 Step 4. **Not covered, deliberately:** everything under the spec's Phase 2 - the five verbs, run provenance, `adopt`'s predicate, the approval record and the gated fab target with its compare-before-create ordering. Those are Phase 2's plan, after the gate, and the spec says why.

**Type consistency.** `Physical` and `Specs` both gain the same `dip` arm in Task 1 Step 3, and Task 2's catalogue entry states exactly those three fields. `DrcReport`'s three counts (Task 5) are what Task 10 Step 3 consumes. `PourMetrics` (Task 9) is what Task 10 Step 5 reports.

**Placeholder scan.** The first draft declared a "known soft spot" here - that Tasks 7 through 10 specify procedure rather than commands, because writing invocations before reading the engine's interface would be inventing one. Review issue 34 point 1 was right that this did not hold: `nohup <route-all command>` in Task 10 was a placeholder of precisely the kind this plan's own No Placeholders rule forbids, and declaring it in the self-review did not stop it being one. The fix is not to guess the interface but to **discover it in a task and record it**: Task 4's preflight now runs the four operations and writes their argv to `build/krt/invocations.json`, which Tasks 8 and 10 consume. The remaining procedural latitude in Tasks 7 to 10 is over *which* candidate and *what* the numbers turn out to be - which is the measurement, not a gap.

**Revisions from the Phase 1 plan review (issue 34, 2026-11-13).** All four findings taken; one with a different resolution than either option offered.

| Point | Resolution |
| --- | --- |
| 1 · engine pin and probe commands | Verified upstream URL, tag and dereferenced commit written into Task 4 Step 1; preflight added as Steps 8-9 with a recorded invocation contract; Task 10's placeholder deleted |
| 2 · final geometry into the graded inputs | Mounting keepouts approved as a **derivation rule**, not coordinates, so Task 8's final geometry cannot invalidate the approval; envelope diameter sourced from a `parts/` entry because the stock footprints model the screw head only. **The clearance mechanism is Task 8 Step 4 and was revised twice under review** - see the row below |
| 2b · the clearance mechanism itself (rounds 3 and 4) | Round 3 replaced two mechanisms at two diameters with a single Rule Area; **round 4's clean control proved that wrong** - with `pads`/`footprints` `not_allowed` the Rule Area rejects its own mounting hole. Settled, all measured: Rule Area **copper-only** for copper, `courtyards_overlap` against a **project-local 7.0 mm courtyard** for parts, and **`missing_courtyard` enabled**, without which a courtyard-less part is invisible |
| 3 · failed invocations and incomplete reports | Four-field validation, fresh output path, per-violation `severity`, `included_severities` asserted so the `--severity-error` trap is caught from the report, and the measured `schematic_parity: []`-on-failed-parity case given its own test |
| 4 · perfboard write conflict | **The plan was wrong, not the write.** The approved spec says "read-only **verbs** only"; the plan had broadened that to the whole directory on its own authority. Restored to the spec's wording and narrowed to name the layout artifacts |
| - · Task 0 false negative (found while verifying, not raised by the review) | `command -v kicad-cli` reports missing on a machine where it is installed off `PATH`; replaced with `defaultKicadCli()`, which this repository already owns |

**Open questions carried for the owner: none remain.** All three were settled on 2026-11-13 and each is recorded in `docs/known-gaps.md` with his words.

- **The DIP-16 socket: fit one** (**G312**). Parts list only; no task after 2 changes.
- **The ground pour's thresholds: declined** (**G313**). The measurements are reported and gate nothing, indefinitely. A declination is not a delegation, so no agent writes the pass mark; a pour bad enough to matter shows in the render he reviews.
- **The mounting hardware: standard M3** (**G311**). 3.2 mm hole, 7.0 mm envelope.

**Answered 2026-11-13:** the mounting hardware. The owner settled on the **standard M3 hole** (`docs/known-gaps.md` **G311**) - 3.2 mm non-plated, with a 7.0 mm envelope from the DIN 125 washer. Tasks 3, 7 and 8 carry those two numbers. The assumption the plan had been making silently is now a recorded decision with a source, which is the part that was actually missing.
