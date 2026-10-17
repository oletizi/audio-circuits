# A pad's wire says what it is — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A printed build guide says what each off-board wire is for, not only where it lands.

**Architecture:** A pad's terminal name comes from `padOrderFor`, which the physical model already states per kind; a rotary throw's value comes from `controls.ts`, which already records it with provenance. The label is assembled by the caller and handed to the renderer the way a part's label already is, and the checklist gains a junction row per pad carrying the same text.

**Tech Stack:** TypeScript on Bun.

**Spec:** `docs/superpowers/specs/2026-10-16-panel-control-in-the-guide-design.md`

## What the owner saw, and said

The printed guide draws ten solder rings on the layout image and carries **zero pad identities in any table cell**; the "Wire-to-board junctions" table has **2 rows for a board with 10 off-board terminals**. Both measured on `boards/pultec-low-boost/guide/guide.html`. Asked which label a pad's wire should carry:

> *"I like the more descriptive names"*

and on being shown the guide's state:

> *"ok. Do it"*

## A correction to the spec, before anyone follows it

**The spec proposes three label sources — a `_pot` suffix convention, the control model, and a refusal. The first is unnecessary and the second is only half of it.** The terminal name is already stated in committed code:

`padOrderFor` (`circuits/pultec/physical/parts.ts:462`) returns a pad order per kind — `POT_PAD_ORDER` is `["ccw", "wiper", "cw"]` (`:234`), `TWO_PIN_PAD_ORDER` is `["a", "b"]` (`:237`), and a switch takes `rotaryPadOrder` (`:246`), which is `["common", ...the throws in the component's own pin order]` and whose comment says that order is derived from the reference's frequency tables rather than restated. **A pad's pin number indexes into that list.** `controls.ts` then supplies what a throw IS.

So: terminal name from the model, throw value from `controls.ts`, and `potFunction`'s `_pot` suffix is not involved. Where this plan and the spec disagree, **this plan is right and the spec's section is the stale one** — it was written before `padOrderFor` was read.

## Global Constraints

- **An agent may never author the acceptance criteria for the artifact it is producing.** What a label should say is the owner's, and he has said it.
- **No label is ever inferred from pin order alone, and none falls back to the ref.** A control the model cannot name REFUSES, naming the control, every place consulted, and what to add where. A label degrading to `RV_LO_BOOST.1` would silently reinstate exactly the spelling he rejected.
- **The five adopted boards' `.vrt` files are byte-unchanged.** `low-boost`, `hi-boost`, `mid`, `low-cut`, `hi-cut` are committed, approved and passing `make check`. This plan touches the guide, never a layout. Verify with `shasum` and report.
- No fallbacks, no mock data outside test code. Every throw names what is missing, where to fix it, and why nothing is substituted.
- **Perturb every new guard, watch it go red BY NAME, restore, report the real output.** The standard this program has set: a hang proven by `timeout` at status 124; a guard proven load-bearing by capping a file-size rlimit so the fork died mid-write; a fork mutation harness proving the mutated bytes reached the binary.
- No `any`, no `as Type`, no `@ts-ignore`, no non-null assertions. Relative imports carry `.ts`.
- `lib/stripboard/` imports nothing from `tools/`, reads no file, spawns nothing.
- Files stay under the 300-500 line ceiling. That ceiling does NOT apply to `docs/known-gaps.md`.
- Baseline: `bun test` → **2407 pass / 0 fail**; typecheck clean. The count may only go up.
- Use `bun`, never ts-node. Never `sed` for writes. Never put a `#` inside a bash heredoc or multi-line quoted bash argument — use the Write tool and `git commit -F <file>`.
- No Claude/AI attribution in commit messages. No git hooks. Supersede means delete.
- **A finding you are not fixing goes in `docs/known-gaps.md`, committed in the same change.** The register runs through G36.

## Out of scope, with reasons

- **G19** — ground prints as `0` on the junction rows. An owner decision he has not made, and it predates this work: his own hand layout prints the same.
- **G36** — the cuts table's `Separates` column prints ladder net names. Same shape, same reason.
- **G2, G17** — label crowding and part labels leaving the outline. Judged on a render; this plan changes what labels SAY, not how they are placed, and the owner should see the new text before anyone moves it.

---

### Task 1: A pad's terminal name, from the model that already states it

**Files:**
- Create: `tools/guide/pad-terminal.ts`
- Test: `tests/guide/pad-terminal.test.ts`

**Interfaces:**
- Consumes: `padOrderFor(component)` from `circuits/pultec/physical/parts.ts:462`; `PadTerminal` (`identity`, `ref`, `pin`, `row`, `col`) from `tools/guide/pads.ts:60`.
- Produces: `terminalNameOf(component: Component, pin: string): string` — `"ccw"`, `"wiper"`, `"cw"`, `"common"`, or a throw's own pin name.

**The rule.** A pad's `pin` is a 1-based index into `padOrderFor(component)`. Nothing else decides it.

**The guard that matters.** A pin outside that list must refuse, naming the component, the pin, the list, and that the pad order is a per-kind fact stated in `parts.ts`. **An off-by-one here is silent and produces a confidently wrong build sheet** — the worst available outcome, because a builder follows it.

- [ ] **Step 1: Write the failing test.**

```ts
test("a pot's three pads are its lugs, in the order a panel part numbers them", () => {
  const pot = potComponent("RV_LO_BOOST")
  expect(terminalNameOf(pot, "1")).toBe("ccw")
  expect(terminalNameOf(pot, "2")).toBe("wiper")
  expect(terminalNameOf(pot, "3")).toBe("cw")
})

test("a rotary's first pad is the common and the rest are its throws in detent order", () => {
  const rotary = rotaryComponent("SW_LO_BOOST")
  const order = padOrderFor(rotary)
  expect(order.length, "the premise: a common and six throws").toBe(7)
  expect(terminalNameOf(rotary, "1")).toBe("common")
  expect(terminalNameOf(rotary, "4")).toBe(order[3])
})

test("a pin outside the pad order refuses rather than naming the wrong terminal", () => {
  expect(() => terminalNameOf(potComponent("RV_LO_BOOST"), "4")).toThrow(/pad order/)
})
```

- [ ] **Step 2: Run it and read the failures** — expect "terminalNameOf is not defined".
- [ ] **Step 3: Implement**, indexing `padOrderFor` and refusing outside it.
- [ ] **Step 4: Run them.**
- [ ] **Step 5: Perturb** — make the index 0-based, watch the rotary test go red naming the terminal it returned, restore, report the output verbatim.
- [ ] **Step 6: Commit.**

---

### Task 2: What a throw IS, and the whole label

**Files:**
- Create: `tools/guide/pad-label.ts`
- Test: `tests/guide/pad-label.test.ts`

**Interfaces:**
- Consumes: `terminalNameOf` from Task 1; `SELECTORS` and `POTS` from `circuits/pultec/electrical/controls.ts:118,65`.
- Produces: `padLabelOf(component: Component, pin: string, controls: ControlModel): string` — e.g. `"LO BOOST wiper"`, `"LO BOOST 60Hz"`, `"LO BOOST common"`.

**Where a throw's value comes from.** `SELECTORS` records `positions: ["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"]` for `SW_LO_BOOST`, each entry sourced — `"P3bandDoc.pdf p4 Cboost column; LOSWB, the other pole of the low frequency selector"`. **That is transcribed evidence with provenance, which is what this repository means by not guessing.**

**The alignment that must be CHECKED and never assumed.** The throw at index *i* of `rotaryPadOrder` corresponds to `positions[i - 1]` only if the two agree in count. **If they do not, refuse** — naming both counts, both sources, and that a frequency printed against the wrong detent is a build sheet that sends a wire to the wrong lug.

**The function name** is the ref with its `RV_`/`SW_` prefix dropped, underscores as spaces, upper case: `RV_LO_BOOST` → `LO BOOST`. A ref matching no known prefix refuses rather than printing the raw ref.

- [ ] **Step 1: Write the failing test.**

```ts
test("a rotary throw is labelled with the frequency it selects", () => {
  expect(padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", controls)).toBe("LO BOOST 60Hz")
})

test("a pot lug is labelled with the control and the lug", () => {
  expect(padLabelOf(potComponent("RV_LO_BOOST"), "2", controls)).toBe("LO BOOST wiper")
})

test("a selector whose positions and throws disagree in count refuses", () => {
  const short = withPositions(controls, "SW_LO_BOOST", ["20Hz", "30Hz"])
  expect(() => padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", short)).toThrow(/six throws .* two positions/)
})

test("a control the model does not name refuses rather than printing its ref", () => {
  expect(() => padLabelOf(rotaryComponent("SW_UNKNOWN"), "1", controls)).toThrow(/SW_UNKNOWN/)
})
```

- [ ] **Step 2: Run it and read the failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them.**
- [ ] **Step 5: Perturb the count check** — make it always pass, watch the disagreement test go red by name, restore, report.
- [ ] **Step 6: Commit.**

---

### Task 3: A pad's label comes from the caller, like a part's

**Files:**
- Modify: `tools/guide/render-parts.ts` (`drawPadLabels`), `tools/guide/render.ts` (`RenderOptions`), `tools/guide/packet.ts:128-150`
- Test: a new file beside Task 2's

**The asymmetry being closed.** `renderLayout` takes `labels: ReadonlyMap<string, string>` for parts and that module's comment says labels come from the caller — but a pad's text is derived INSIDE the renderer from `pad.identity`. With a descriptive label the renderer would need circuit knowledge it has no business holding, and all three packet images would be forced to print identical pad text.

**Produces:** `RenderOptions` carries a pad-label map keyed by `PadTerminal.identity`. A pad with no entry REFUSES — it must not fall back to the identity, which is the spelling the owner rejected.

- [ ] **Step 1: Write the failing test** — rendering with a pad-label map prints the label, and rendering with a pad missing from the map refuses by name.
- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Implement**, deleting the in-renderer derivation rather than leaving it beside the new path. Supersede means delete.
- [ ] **Step 4: Run it, then render `pultec-low-boost` and READ THE PNG.** Say what the ten labels now say.
- [ ] **Step 5: Perturb** — restore the identity fallback, watch the missing-entry test go red by name, restore, report.
- [ ] **Step 6: Commit.**

---

### Task 4: The junction table gains a row per pad

**Files:**
- Modify: `tools/guide/checklist.ts:200-215`
- Test: a new file

**The defect, measured.** `buildChecklist` builds every row from `dump.parts`, and a pad has no `PART` line. `boards/pultec-low-boost/guide/guide.html` has **2 junction rows for 10 off-board terminals**, while the layout image draws all ten rings with a legend calling them solder points. **One packet, two artifacts disagreeing about whether ten terminals exist.**

**This is the task that makes the guide usable.** A row says the hole and what the wire is, so the line a builder ticks reads `LO BOOST 60Hz` against `I19`.

- [ ] **Step 1: Write the failing test.**

```ts
test("every off-board terminal has a junction row", () => {
  const rows = junctionRowsOf(buildChecklist(dump, circuit, edges, padLabels))
  expect(pads.length, "the premise: low-boost has ten off-board terminals").toBe(10)
  expect(rows.length, "one row per terminal, plus the two headers").toBe(12)
  expect(rows.some((row) => row.includes("LO BOOST 60Hz"))).toBe(true)
})
```

- [ ] **Step 2: Run it and read the failure** — expect 2 rows against 12.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it, then `make -C boards/pultec-low-boost guide` and READ THE PRINTED PAGE.** Report what the junction table says.
- [ ] **Step 5: Perturb** — drop the pad rows, watch the count test go red naming the shortfall, restore, report.
- [ ] **Step 6: Commit.**

---

### Task 5: A control cannot reach the board twice

**Files:**
- Modify: `tools/guide/circuit.ts`
- Test: a new file

**Now that a control may legitimately reach a board as a header PART or as pads, a board carrying BOTH for one control is a contradiction** — the same control wired twice, or counted twice — and nothing refuses it. This is G4, and it is only statable now that both representations are intended.

**The failure mode to avoid:** widening the check until it stops firing. It must still refuse a genuine contradiction, and the perturbation must prove both halves.

- [ ] **Step 1: Write the failing test** — a board with both a `PART` line and `PAD` lines for one ref refuses, naming the control and both representations.
- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it.**
- [ ] **Step 5: Perturb twice** — make the refusal unreachable, and separately make it fire on a board carrying only one representation. Both go red by name. Restore, report both.
- [ ] **Step 6: Commit.**

---

### Task 6: Regenerate both guides and look at them

**Files:**
- Writes only the git-ignored `boards/<board>/guide/`

**Not a code task — the deliverable is a reading.** `CLAUDE.md`: *"Look at the output, not only the tests. A board can pass every test and be unbuildable, a schematic can be correct and unreadable, a document can be generated and useless."*

- [ ] **Step 1:** `make -C boards/pultec-low-boost guide` and `make -C boards/pultec-low-cut guide`.
- [ ] **Step 2: Read the printed pages** with the Read tool. Report what a builder gets: what the ten labels say, what the junction table says, and whether a person could wire the panel from these pages without opening a board file.
- [ ] **Step 3: Verify all five adopted `.vrt` files are byte-unchanged** with `shasum`, and report it.
- [ ] **Step 4: Record what is still wrong** in `docs/known-gaps.md` — G19 and G36 remain, G2 and G17 should be re-judged against the new text, and G1/G10 are deleted if closed.
- [ ] **Step 5: Commit.**

---

## Self-review

**Spec coverage.** G1 is Tasks 1–3; the plumbing asymmetry is Task 3; G10 is Task 4; G4 is Task 5. The spec's acceptance item 4 — the transistor-preamp's labels unchanged — is covered by the suite staying green, and Task 3's render reading is the owner-facing half.

**Where the plan departs from the spec, deliberately:** the spec's three-source scheme is replaced by `padOrderFor` plus `controls.ts`, because `padOrderFor` already states the terminal order per kind and the spec was written before it was read. Called out at the top so a reader meets it before the task text.

**Placeholder scan.** None. Task 6 carries no failing test because its deliverable is a reading the spec authorises; that is stated rather than left to be inferred.

**Type consistency.** `terminalNameOf(component, pin)` from Task 1 is used by `padLabelOf(component, pin, controls)` in Task 2; `PadTerminal.identity` keys the map in Tasks 3 and 4.

**One risk worth stating.** Task 2's count check is the only thing standing between a provenance-backed frequency table and a build sheet that prints the wrong frequency against a detent. If the two sources ever disagree, the refusal is the correct outcome and must not be relaxed into a best-effort match.
