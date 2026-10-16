# Laying Out the Five Pultec Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `pultec-low-boost` through the entire workflow — generated, materialised, verified, rendered, approved, adopted, and passing its own `make check` — then classify what the other four sections need, and deliver them the same way.

**Architecture:** No new layout machinery. The model already produces a sound low-boost board; what is missing is the path from a `Candidate` to a committed layout. Two adapters block looking at a Pultec board, one integration point blocks adopting one, and the move generator blocks searching one. Each is fixed where the defect is, and the renderer is never fixed by changing the model.

**Tech Stack:** TypeScript on Bun. The pinned VeroRoute fork, invoked for materialisation and as an independent witness. KiCad 9 libraries on disk.

**Spec:** `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md` — approved by the owner 2026-10-16 after a third-party review whose five findings are folded into it. Read the spec before Task 1; its milestone structure is the shape of this plan.

## Global Constraints

- **An agent may never author the acceptance criteria for the artifact it is producing.** The objective, `stripboard/rules.json`, the two hard area rules, the exemption registry and the benchmark gate are untouched by this plan.
- **A physical constraint must not be loosened to make a search succeed.** If a section cannot be built from the parts it specifies, that is a finding for the owner about the circuit.
- **The rendering layer consumes the physical model without modifying it.** The renderer is fixed to recognise what the importer emits — never the reverse.
- **No cut count, wire count, board area or extent is a target.**
- No fallbacks, no mock data outside test code. A missing value throws, naming what is missing, where to fix it, and why nothing is substituted.
- No `any`, no `as Type`, no `@ts-ignore`, no non-null assertion. Relative imports carry `.ts`.
- `lib/stripboard/` imports nothing from `tools/`, reads no file, spawns nothing. `tests/stripboard/model/no-fork.test.ts` enforces it transitively.
- Files stay between 300 and 500 lines. At plan time the largest in play are `seed-place.ts` 470, `board.ts` 454, `vero-export.ts` (check before editing), and `tests/stripboard/model/seed-room.test.ts` at 760 — already over, so put new tests elsewhere.
- **A skipped check must never look like a passing one**, and a predicate that can never fire is this repository's recurring defect — found **eleven** times across two plans. Perturb every new guard, watch it go red by name, restore, and report the output.
- Refusals teach. Supersede means delete. No Claude/AI attribution in commit messages. No git hooks. No `#` inside bash heredocs — use the Write tool and `git commit -F file`. No `sed` for writes. Use `bun`, never ts-node.
- Baseline at plan time: `bun test` → **2274 pass / 0 fail across 204 files**. The count may only go up. `make check` is red on 9 boards for reasons predating this plan; **Task 5 is the first task permitted to change that, and only for `pultec-low-boost`.**

---

## Milestone 1 — low-boost, end to end

### Task 1: The renderer recognises what the importer emits

**Files:**
- Modify: `tools/guide/part-shapes.ts:259`
- Test: `tests/guide/` — a new file; check sizes before choosing

**Interfaces:**
- Consumes: `importStringFor` in `lib/kicad/import-string.ts`, which maps `Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm` → `CAP_FILM2` and both wide variants → `CAP_FILM_WIDE2`.
- Produces: nothing new. `drawPart` stops throwing for the Pultec capacitor types.

**The defect.** `part-shapes.ts:259` draws `CAP_FILM` and `CAP_FILM_WIDE`; `import-string.ts:102,107,109` emits `CAP_FILM2` and `CAP_FILM_WIDE2`. A Pultec board therefore hits `no drawing for VeroRoute part type "CAP_FILM2"`. **Fix the renderer. Do NOT change `import-string.ts`** — the spec requires it, because changing what the importer emits to suit the drawing would let a presentation bug become an electrical-model change.

- [ ] **Step 1: Write the failing test.** Render a board carrying each supported capacitor type and assert the exported identity, pin mapping and connectivity are unchanged by rendering.

```ts
test("rendering a board does not change what it exports", () => {
  const before = layoutDocument(candidate, nets)   // the export, pre-render
  renderLayout(dumpOf(candidate), labels, { view: "component", title: "t", edgeLabels: [] })
  const after = layoutDocument(candidate, nets)
  expect(after, "rendering is a read of the model, not a write").toEqual(before)
})

test("every capacitor type the importer emits has a shape", () => {
  const emitted = [...FOOTPRINT_IMPORT_STRINGS.values()].filter((t) => t.startsWith("CAP_"))
  expect(emitted.length, "the premise: the importer emits capacitor types").toBeGreaterThan(0)
  for (const type of emitted) expect(() => shapeFor(type)).not.toThrow()
})
```

- [ ] **Step 2: Run it and read the failure** — expect `no drawing for VeroRoute part type "CAP_FILM2"`.
- [ ] **Step 3: Widen the match at `part-shapes.ts:259`** to the types the importer actually emits. Keep the existing comment's point: a box around the pins is not a claim about the body, because no body dimension for a film cap is recorded anywhere and drawing one from memory is the guess `lead-span.ts` refuses.
- [ ] **Step 4: Run both tests.** Perturb the shape match, watch the second test go red by name, restore, report the output.
- [ ] **Step 5: Commit.**

---

### Task 2: A landing pad has a shape and a stable identity

**Files:**
- Modify: `tools/guide/part-shapes.ts`, `tools/guide/dump-model.ts` (check what a pad needs), `tools/stripboard/vero-import.ts` / `vero-export.ts` as the round trip requires
- Test: a new file beside Task 1's

**Interfaces:**
- Produces: a pad's identity, **derived from component AND terminal — `RV_LO_BOOST.1`** — preserving the original component reference.

**The requirement, and the thing it forbids.** Three pads of one potentiometer belong to one logical component and are three different electrical terminals; the pipeline must hold that relationship through generation, search, materialisation, export and the wiring guide. **Do NOT invent unique component references for what are terminals of one component.** The fork invents `RV_LO_BOOST_1`-style names and `vero-import.ts` already rejects them in favour of the owner ref from the dump's `FROM <ref>.<pin>` line — `OFF_BOARD_TERMINAL` placements carry `ref` = owner ref, `pins` = `Map([[pin, hole]])`. The identity is that pair, spelled once.

- [ ] **Step 1: Write the failing round-trip test**, with several pads sharing a ref — this is the case the spec names.

```ts
test("three pads of one pot round-trip with their terminals distinct", () => {
  const pads = exported.filter((line) => line.startsWith("PAD "))
  expect(pads.length, "the premise: this board has a three-terminal panel pot").toBe(3)
  const identities = new Set(pads.map(identityOf))
  expect(identities.size, "three terminals, three identities").toBe(3)
  expect(new Set(pads.map(refOf)).size, "and one component reference").toBe(1)
})
```

- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Implement**, matching `padPlacementOf` and the `PAD` branch at `vero-export.ts:164` so the constructed and imported representations of one pad stay identical.
- [ ] **Step 4: Run it.** Perturb the identity derivation, watch it go red, restore, report.
- [ ] **Step 5: Commit.**

---

### Task 3: Materialise low-boost and look at it — the first real run

**Files:**
- Create: a scratch harness; **nothing under `boards/` is written by this task**
- Test: none required — this task's deliverable is a measurement and a render

**This task is a RUN, not a design, and it is allowed to fail.** Take the low-boost candidate the model already produces (`rcm s0`: 4 cuts, 4 wires, 5 bridges, 19 × 23), materialise it through the fork's `--materialize`, and verify it independently. **Report everything that breaks, verbatim.** The expectation is that Tasks 1 and 2 are not sufficient; what else is missing is this task's finding.

- [ ] **Step 1: Build the candidate** by the route `tests/stripboard/model/pultec-capability.test.ts` uses — `physicalBoard("low-boost")` → `deriveTargets` → `referenceNetsFor` → footprint map → declared `offBoard` → `seedPartsFrom` → `seedsFrom`.
- [ ] **Step 2: Materialise it** through `tools/stripboard/vero-export.ts` and the fork's `--materialize`.
- [ ] **Step 3: Verify independently** — physical-state equivalence for placements, electrical equivalence for cuts. **A disagreement is reported, never adopted.**
- [ ] **Step 4: Render it and look at it.** Convert with `rsvg-convert -z 3`. Say where the PNG is.
- [ ] **Step 5: Report** every refusal verbatim, the figures, and what the render shows. **Do not fix anything outside Tasks 1 and 2's scope** — name it instead, so it becomes a task rather than an unreviewed change inside a discovery run.

---

### Task 4: A run directory the adoption gate accepts

**Files:**
- Create: the producer; `tools/stripboard/run-dir.ts` and `tools/stripboard/adopt-checks.ts` are the contract
- Test: a new file

**The integration point, which is the real work of Milestone 1.** `adopt` takes `--run <dir>` — a directory the OLD `place` verb produced — and `adopt-checks.ts` validates a `run.json` manifest: the recorded stamp must name the run directory, `netlistSha256` must match the netlist's hash, `builtCommit` must match the stamp beside the binary, and the candidate must be inside the run directory. The new in-process path produces a `Candidate` and none of that.

**Produce a conforming run directory rather than changing the gate.** The spec's point is that this milestone *"completes a workflow whose acceptance machinery already exists"* — a gate relaxed to accept a new producer is not that gate.

- [ ] **Step 1: Read `adopt-checks.ts` in full** and write down every field it validates and what it compares each against. That list is the contract.
- [ ] **Step 2: Write the failing test** — a run directory the new path produced, handed to the same checks `adopt` runs, asserted to pass each by name.
- [ ] **Step 3: Run it and read the failures.** They enumerate the contract.
- [ ] **Step 4: Implement the producer.** Every hash is computed, never copied.
- [ ] **Step 5: Perturb each recorded field in turn** and confirm the corresponding check refuses by name. A manifest that satisfies a gate because the gate cannot see it is the defect this repository punishes hardest.
- [ ] **Step 6: Commit.**

---

### Task 5: Adopt low-boost, and make its own check pass

**Files:**
- Modify: `boards/pultec-low-boost/` — **the first task in two plans permitted to write a committed board file**

**This is the milestone.** Adopt the approved layout through the existing gate, then confirm `make -C boards/pultec-low-boost check` passes.

**Before adopting, the owner has seen the render and said yes.** Task 3 produced it; if he asked for changes, they are incorporated and re-rendered first. **Adoption without his approval is not this task.**

- [ ] **Step 1: Confirm the owner's approval is on record** for the board being adopted. If it is not, STOP and ask — this writes a committed artifact.
- [ ] **Step 2: Adopt** via `bun tools/cli/perfboard.ts adopt -C boards/pultec-low-boost --run <dir>`.
- [ ] **Step 3: Run `make -C boards/pultec-low-boost check`.** Report the result verbatim.
- [ ] **Step 4: If it fails for a reason unrelated to the layout** — as `pt2399-core` did, where adding a BOM file moved its failure to a missing `bomConditions` export — **report it and STOP. Do not weaken the gate.** That is a finding about the board's configuration, not about this plan.
- [ ] **Step 5: Commit**, and say in the message that a layout is now committed and by what provenance.

---

## Milestone 2 — feasibility of the remaining four

### Task 6: Classify what each remaining section needs

**Files:**
- Create: `docs/pultec/section-feasibility.md`
- Test: none — the deliverable is a classification

**Run `low-cut`, `hi-cut`, `hi-boost` and `mid` against the constructor and classify EVERY failure** as exactly one of:

1. unsupported software behaviour,
2. incompatible component geometry,
3. impossible placement under existing constraints,
4. search exhaustion.

**The classification is the deliverable, because it names the wrong move in advance.** `mid`'s `B32529` capacitors may want a six-hole span against a four-hole recorded reach. **That is category 2, and category 2 is not fixed by software.** A physical constraint must not be loosened to make a search succeed; if a section cannot be built from the parts it specifies, write that down and stop.

- [ ] **Step 1: Build each section's netlist** by Task 3's route. Report any that will not build at all, with the refusal verbatim.
- [ ] **Step 2: Run every available ordering** — `derivedOrderings` at strides 1–3 and the `rcm` stated orderings — and record what each does.
- [ ] **Step 3: Classify each failure** into exactly one of the four categories, with the evidence for the classification. A failure you cannot classify is reported as unclassified rather than forced into a bucket.
- [ ] **Step 4: Write `docs/pultec/section-feasibility.md`** — one section per circuit, the orderings tried, the figures where a board built, and the classification of every failure.
- [ ] **Step 5: Commit.** **Propose no fixes in this task.** The next sequence is chosen from this document, not from inside it.

---

## Milestones 3 and 4 — deliberately not planned yet

**Milestone 3** (produce and adopt the remaining four) and **Milestone 4** (all five verified, rendered, approved, with wiring documentation) are **not broken into tasks here, and that is the spec's intent**: *"the task list after the first run is expected to change."*

Planning them now would mean inventing tasks for failures nobody has met, against a pipeline nobody has run end to end. **This plan is re-planned after Task 6**, from the classification that task produces.

**What is fixed and may not drift:** completion is *all five Pultec section boards have materialised layouts, have passed their existing independent verification and adoption gates, and have been rendered for owner review and approved.* The project may not declare completion having produced only low-boost.

---

## Self-Review

**Spec coverage.** Milestone 1 is Tasks 1–5: adapters (1, 2), the real run (3), the adoption integration (4), adoption and the board's own gate (5). Milestone 2 is Task 6. Milestones 3 and 4 are explicitly deferred with the reason. The spec's two added requirements are Task 2 (pad identity derived from component and terminal, never an invented ref) and Task 1 (renderer fixed, never the importer, plus the no-side-effect test). The classification's four categories are Task 6's deliverable verbatim.

**Placeholder scan.** Tasks 3 and 6 have no code blocks because their deliverable is a measurement, which the spec authorises and which is not the same as a TBD. Every other task carries its failing test. Task 2's interfaces are named but its implementation is not written out, because what the dump model needs for a pad is what Task 3 is partly there to establish — stated as a known gap rather than hidden.

**Type consistency.** `OFF_BOARD_TERMINAL` is `lib/stripboard/board.ts`'s and is the one sentinel both paths branch on. A pad's identity is `ref` + `pin`, the pair `padPlacementOf` and `placeOffBoard` already produce. The run manifest's fields are `adopt-checks.ts`'s, read rather than restated.

**Ordering.** 1 and 2 before 3, because a board that cannot be drawn cannot be looked at. 3 before 4, because what the run breaks may change what the producer must carry. 4 before 5, because adoption needs the run directory. 5 before 6, so the four are measured against a pipeline proven once.
