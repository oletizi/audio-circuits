# Agent place-and-route, Phase 1: the probe — Implementation Plan

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
- **No write to `boards/pt2399-core/`.** That directory holds a layout that was built and works. Read-only throughout.
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

```bash
command -v kicad-cli && kicad-cli --version
command -v cargo && cargo --version
python3 --version
```

Expected: `kicad-cli` 10.0.5, the version `draughting/tools.lock.json` pins. `cargo` is needed because the pinned engine's Rust router builds from source.

- [ ] **Step 2: If `kicad-cli` is absent, stop and report**

`kicad-cli` is not installed in this worktree as of this plan's writing. Installing KiCad is an operator action on their machine, not something this task performs silently. Report what is missing and wait.

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
- Create: `parts/ic-pt2399-dip16.json` (and a socket entry if the decision below goes that way)
- Modify: `boards/pt2399-core/bom.json`

- [ ] **Step 1: Research the part with the `part-researcher` agent**

That agent exists for exactly this and writes catalogue entries with evidence for every spec. Its brief: the `ic` line of `boards/pt2399-core`, a PT2399 in `DIP-16_W7.62mm`, `specs.pins` 16, `specs.rowSpacingMm` 7.62, `specs.pitchMm` 2.54, `specs.type` `"PT2399"` so `fit.ts` compares the circuit's required device type against `specs.type` and not against the entry's `mpn`. **Pass the Global Constraints into the brief**, including the no-AI-attribution rule.

- [ ] **Step 2: Decide the socket, and record it**

**Open question for the owner, with a recommendation.** A DIP-16 socket uses the same land pattern as the IC, so this changes the parts list and **not** the layout - it can be decided at any point without a respin. **Recommendation: fit a socket**, added as an `extras` line in `bom.json`. The board exists to prototype configurations, and a socketed PT2399 can be swapped or rescued; the cost is one more line and a little height. If he declines, drop the extra and nothing else changes.

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

One `<field> <value>` pair per line, `#` comments, exactly as `veroroute.pin` does. Fields: `url`, `tag` (provenance only), `commit` (the authority). Pin the commit the spec's decisions table names - the known-good one, not the newest release.

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

- [ ] **Step 8: Commit**

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
test("the known-good pair reports zero parity violations", () => { /* expect 0 */ })
```

The first four matter more than the fifth. A check that only passes on good input has not been shown to work.

- [ ] **Step 3: Run them** - Expected: FAIL, no module yet.

- [ ] **Step 4: Implement `runDrc`**

Invoke `kicad-cli pcb drc --schematic-parity --format json --severity-all -o <report> <board>`, on the candidate paired with **its own** schematic and project configuration. Then: refuse a missing file naming the path; refuse unparseable JSON naming the parse error; refuse a report object with no parity key. Never substitute a default for an absent field.

`--exit-code-violations` is deliberately **not** used to decide the verdict: this module reads the report, because the exit code cannot distinguish the three classes. Record that in the module comment so nobody "simplifies" it back.

- [ ] **Step 5: Implement `verdictOf` with the three policies in `drc-policy.ts`**

| Class | Policy |
| --- | --- |
| `schematic_parity` | zero tolerated - a board that disagrees with its schematic is not this board |
| DRC violations | zero tolerated at error severity, against the standard's values |
| `unconnected_items` | zero on a routed candidate; **counted, not ignored, on an unrouted one**, where it measures what the router left undone |

- [ ] **Step 6: Confirm the flags and key names against the pinned KiCad**

Open question 2 in the spec. The flag spellings and the report's key names are **confirmed by running 10.0.5**, not read off the 9.0 CLI reference. If a name differs, the code follows what the installed tool does and the finding is recorded.

- [ ] **Step 7: Run the suite** - Expected: PASS.

- [ ] **Step 8: Add `make parity-pt2399-core` and `make drc-pt2399-core`**

- [ ] **Step 9: Commit**

---

## Task 6: The KiCad project and the initial board

**Files:** Create `circuits/pt2399-core/pt2399-core.kicad_pro` and `circuits/pt2399-core/pt2399-core.kicad_pcb`. The existing `pt2399-core.kicad_sch` is read, never written. This directory is where KiCad sources live here, per commit `0f5d775`.

- [ ] **Step 1: Create the project file with the standard's constraints**

Board Setup: `min_track_width`, `min_clearance` on the Default net class, `min_via_diameter`, `min_via_annular_width`, `min_through_hole_diameter`, `min_hole_to_hole`, `min_copper_edge_clearance`, `min_text_thickness`, `min_text_height` - every value from Task 3. Net classes with `via_diameter` 0.8 / `via_drill` 0.4 and the signal and power track widths.

- [ ] **Step 2: Load the footprints onto a fresh board - and read this first**

**KiCad has no headless "Update PCB from Schematic".** This step is therefore a **one-time operator action in the KiCad PCB editor**: open the project, Tools > Update PCB from Schematic, apply, save. It is the one manual step in Phase 1 and it is manual because the tool offers no alternative, not as a convenience.

Do not work around it by writing footprint s-expressions by hand. That would be inventing a loader this repository would then own, to replace a GUI action performed once.

- [ ] **Step 3: Prove the manual step landed correctly**

Run: `make parity-pt2399-core`
Expected: **zero** `schematic_parity` violations. This is the point of doing Task 5 first - the manual step is verified by a check rather than by having been careful. 24 components and 65 pads should be present; a missing or misassigned footprint shows up here as a parity violation naming it.

- [ ] **Step 4: Read and record the silkscreen outline widths**

The spec marks this NOT VERIFIED. Read the `F.Silkscreen` graphic line widths of the seven footprints this board uses, and record which fall below 0.15 mm. KiCad has no design rule for graphic line width, so this is a recorded disclosure, not a gate. Expected consequence of a thin outline is a faint legend, not a rejected or dearer board.

- [ ] **Step 5: Commit the project and board, naming the manual step in the message**

---

## Task 7: The placement intent, drafted for approval

**Files:** Create `circuits/pt2399-core/floorplan-intent.json`, `placement-rules.json`, `placement-policy.json`, `route-fab-floor.txt`, and a `.kicad_dru` only if Step 3 shows it is needed.

**This task ends at a human gate.** The agent drafts; an independent review checks; **the owner approves.** Nothing is placed for adoption under unapproved intent, and changing any of these files later invalidates every run made under them.

- [ ] **Step 1: Draft `floorplan-intent.json`**

Blocks from the circuit's own structure, which the model already names: supply decoupling (`C1`, `C2`), the PT2399's reference and oscillator bypassing (`C3`, `C4`, `C5`), the input path (`C7`, `R3`, `R4`), the LPF1 node (`R1`, `R2`, `C6`, `C8`), the LPF2 and regeneration node (`R6`, `R7`, `R8`, `C11`, `C12`), the op-amp feedback caps (`C13`, `C14`), and the output path (`R5`, `C9`, `C10`). `J1` as the edge connector with a `max_setback_mm` and `must_lock`. The four mounting holes and their hardware envelopes as keepouts.

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

- [ ] **Step 1: Pass 1 - a generous rectangle, placement only**

Place against the approved intent to discover the extent the parts and their hardware actually need. Nothing is routed. Nothing is adopted.

- [ ] **Step 2: Fix the final geometry**

Bring the edge in to the placed extent plus the standard's 0.5 mm copper-to-edge clearance. Place the four M3 holes against the **final** corners, modelled by **envelope, not drill** - screw head, washer and standoff footprint, not a 3.2 mm hole. Measure the header's setback from the final edge.

- [ ] **Step 3: Regrade placement on the final geometry**

Run `check-intent` against the final board. **If the regrade fails, re-place** - do not adjust the geometry to suit a placement that was graded against different geometry. That inversion is the defect this task exists to prevent.

- [ ] **Step 4: Confirm DRC verifies clearance to the hardware independently** - the grader and DRC are two checks, not one.

- [ ] **Step 5: Commit the final geometry**

---

## Task 9: Measure the ground pour

Numbers only. **Do not write a threshold** - the owner sets those, and open question 1 in the spec is where they land.

**Files:** Create `tools/pcb/pour.ts`; test `tests/pcb/pour.test.ts`

**Interfaces:** Produces `measurePour(boardPath): PourMetrics` with `continuityAroundU1`, `narrowestBridgeMm`, `spokesByGroundPad: ReadonlyMap<string, number>`, `bypassReturn: "pour" | "track"`.

- [ ] **Step 1: Write the failing tests against hand-built fixtures**

One fixture whose pour is a single region; one split into two regions joined by a deliberately narrow bridge; one with a ground pad carrying a single spoke. Assert the measured numbers, not a verdict.

- [ ] **Step 2: Run them** - Expected: FAIL, no module yet.

- [ ] **Step 3: Implement `measurePour`, reading the SAVED POST-REFILL board**

The spec is explicit and the review insisted: the board measured is the one that would be adopted and plotted, **after** zone refill - not the pre-fill state, where the pour does not yet exist as copper.

- [ ] **Step 4: Run the tests** - Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 10: Run the probe and put it in front of the owner

- [ ] **Step 1: Place, then smoke-test ONE routed candidate**

Read its checks before routing more. A failure here is usually systematic - fix the cause, not the candidate. The likely causes are known and worth checking first: the router necking tracks below the fab floor without the standing instruction, a terminal routing escalation that breaks clearance rather than leaving a net open, and starved thermal spokes where a ground pad is crowded by other copper.

- [ ] **Step 2: Route the rest, detached**

```bash
nohup <route-all command> > build/logs/route-all.log 2>&1 &
```

Detached with `nohup` as a quick-returning call, because it can run long and a tracked background task is reaped at the end of a turn. Stop on repeated identical failures - a batch hides a systematic failure.

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

**Placeholder scan.** One known soft spot, declared rather than hidden: Tasks 7 through 10 specify procedure and checks rather than code, because they drive an engine whose behaviour on this board is the very thing being measured. Writing literal command invocations for them now would be inventing an interface before reading the engine's own. Each of those tasks instead names its inputs, its checks and its stopping condition - and Task 10 Step 6 treats a systematic failure as a recordable result.

**Open questions carried for the owner.** The DIP-16 socket (Task 2 Step 2, recommendation: fit one, since it changes the parts list and not the layout). The ground pour's thresholds (spec open question 1). Both are his; neither blocks starting.
