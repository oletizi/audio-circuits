# Removing the schgen honey pots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete `lib/schgen/`, `tools/schgen/` and `lib/kicad/schematic.ts`, after rebuilding the four guards that bind the five approved drawings so they never lapse.

**Architecture:** Three phases, strictly ordered. **A** builds a standalone sheet-to-model comparison and relocates the parts knowledge, changing no behaviour and deleting nothing. **B** moves the `kicad-cli` round-trip proof off the stub writer and onto the five approved sheets. **C** deletes, in dependency order, ending with the prose that tells agents to use what is gone.

**Tech Stack:** TypeScript on Bun, `kicad-cli` 10.0.5, `make`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-remove-schgen-design.md`

## Global Constraints

- **Not one byte of any sheet under `drafted/` may change.** Five sha256s, four of them bound in each board's `RECORD.md` (**not** in `verdicts.md` — only `pultec-hi-cut`'s is there). Verify before and after every task that touches anything adjacent.
- **`make check` must fail on exactly four boards throughout**: `pt2399-core`, `transistor-preamp-lab`, `-loop`, `-staged`. Five means a guard lapsed. Diff failure lists by name with timings stripped.
- **`bun test` adds no failures.** Baseline is 8, all `tests/schgen/port-fidelity.test.ts` on unset `SCHGEN_SOURCE`; they disappear in Task 9.
- **Every new check carries a positive control** — a perturbation that makes it fail. Two of this repository's controls were found inert on exactly the things they protected.
- **Never bypass a hook.** Never use `sed` for write or execute operations. Never put `#` inside a Bash heredoc or multi-line quoted argument — use the Write tool and `git commit -F`. Never type a control-character escape into a tool parameter; build bytes with `chr()` and verify by counting.
- **No Claude/AI attribution in commits, PR text or files.**
- **No fallbacks, no mock data outside test code** — throw naming what is missing.
- **Never pass judgement on a layout and never withhold a drawing for one.** The words *better, best, worse, good, bad, clean, readable, legible, clear, tidy, ugly* are forbidden about any drawing. Render it and hand back the path.
- **Do not rewrite the historical record**: `DEVELOPMENT-LOG.md`, `docs/known-gaps.md`, `docs/research/*`, `docs/superpowers/{specs,plans}/*`, `docs/schematic/schgen-development-history.md`, the five `RECORD.md`. A dangling reference there is inert.
- Commit after every task. The branch is `feature/schematics-tooling` with open PR #20.

---

## Phase A — build the replacement, delete nothing

### Task 1: A sheet-to-model comparison that does not import schgen

**Files:**
- Create: `lib/kicad/sheet-agreement.ts`
- Test: `tests/kicad/sheet-agreement.test.ts`

**Interfaces:**
- Consumes: `importNetlist`, `ImportedNetlist`, `ImportedComponent` from `lib/kicad/netlist.ts`; `Network` from `lib/model/index.ts`.
- Produces: `compareSheetToModel(network: Network, designators: ReadonlyMap<string, string>, pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>, exported: ImportedNetlist): SheetAgreement` where `SheetAgreement` is `{ componentIdentity: string[]; netMembership: string[]; pinIdentity: string[]; values: string[]; footprints: string[] }` — **the same five lists `roundTrip` returns, in the same order, with the same message wording**, because Task 4 asserts the two agree verbatim.

`designators` maps a model component id to its KiCad reference. `pinNumbers` maps a component id to a map of canonical pin name to KiCad pin number.

- [ ] **Step 1: Read `lib/schgen/gates/round-trip.ts` end to end**

It is the thing being replaced and its five comparisons are the specification. Note the exact wording of every message it emits — Task 4 compares your output against its output string for string.

- [ ] **Step 2: Write the failing test for component identity**

```ts
// tests/kicad/sheet-agreement.test.ts
import { expect, test } from "bun:test"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { circuit } from "../../lib/model/index.ts"

const TWO_RESISTORS = circuit()
  .resistor("r_in", "10k", { a: "IN", b: "MID" })
  .resistor("r_out", "10k", { a: "MID", b: "OUT" })
  .port("input", "IN")
  .port("output", "OUT")
  .done()

const DESIGNATORS = new Map([["r_in", "R1"], ["r_out", "R2"]])
const PINS = new Map([
  ["r_in", new Map([["a", "1"], ["b", "2"]])],
  ["r_out", new Map([["a", "1"], ["b", "2"]])],
])

test("a reference in the schematic but not in the model is reported", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10k"))
    (comp (ref "R2") (value "10k"))
    (comp (ref "R9") (value "10k")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.componentIdentity).toEqual(["reference R9 is in the schematic but not in the model"])
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test tests/kicad/sheet-agreement.test.ts`
Expected: FAIL, `Cannot find module '../../lib/kicad/sheet-agreement.ts'`.

- [ ] **Step 4: Implement the five comparisons**

Mirror `round-trip.ts`'s structure: build `refOf` from `designators`, diff the two reference sets, build the model's net partition as `designator.pin` member sets from the network's pin references through `pinNumbers`, compare partitions, then pin identity, values and footprints. **Copy its message wording exactly.** Throw naming the component when `designators` or `pinNumbers` has no entry for one — do not default.

- [ ] **Step 5: Run it and watch it pass**

Run: `bun test tests/kicad/sheet-agreement.test.ts`

- [ ] **Step 6: Add the four remaining comparisons' tests and their controls**

One test per list, each with a perturbation proving it fires: a pin moved between nets for `netMembership`; an extra symbol pin for `pinIdentity`; a changed value string for `values`; a declared footprint for `footprints`. Each asserts the **exact message**, never a count.

- [ ] **Step 7: Run the whole file, then commit**

```bash
bun test tests/kicad/sheet-agreement.test.ts
bun run typecheck
git add lib/kicad/sheet-agreement.ts tests/kicad/sheet-agreement.test.ts
git commit -F /tmp/msg-task1.txt
```

---

### Task 2: Move the switch pin geometry to the parts file

**Files:**
- Modify: `circuits/pultec/physical/parts.ts`
- Modify: `circuits/pultec/schematic/section-board.ts:167-205` (remove `POLE_PIN`, `THROW_PINS`; import them)
- Create: `tests/circuits/pultec-switch-geometry.test.ts`
- Modify: `tests/schgen/nc-pins.test.ts` (the library-verification arms move; leave the `pinsDeclared` arms, they go in Task 9)

**Interfaces:**
- Produces: `POLE_PIN: Readonly<Record<string, string>>` and `THROW_PINS: Readonly<Record<string, readonly string[]>>` exported from `circuits/pultec/physical/parts.ts`, same shapes as today.

- [ ] **Step 1: Write the failing test, reading the installed library**

```ts
// tests/circuits/pultec-switch-geometry.test.ts
import { expect, test } from "bun:test"
import { POLE_PIN, THROW_PINS } from "../../circuits/pultec/physical/parts.ts"
import { readSymbol } from "../../lib/kicad/symbol-library.ts"   // confirm the real helper name first

test("every recorded pole pin is a pin of that symbol in the installed library", () => {
  for (const [libId, pole] of Object.entries(POLE_PIN)) {
    const numbers = readSymbol(libId).pins.map((p) => p.number)
    expect(numbers).toContain(pole)
  }
})

test("THROW_PINS plus POLE_PIN plus the mount lug is exactly each symbol's pin set", () => {
  for (const [libId, throws] of Object.entries(THROW_PINS)) {
    const numbers = new Set(readSymbol(libId).pins.map((p) => p.number))
    const claimed = new Set([...throws, POLE_PIN[libId] as string, ...(libId.endsWith("_MP") ? ["MP"] : [])])
    expect([...claimed].sort()).toEqual([...numbers].sort())
  }
})
```

**If `tests/schgen/nc-pins.test.ts` already contains an equivalent arm, move it rather than writing a second.** Find the helper it uses to read the installed library and use the same one; **do not write a new symbol parser.**

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test tests/circuits/pultec-switch-geometry.test.ts`
Expected: FAIL on the import of `POLE_PIN` from `parts.ts`.

- [ ] **Step 3: Move the two constants and their doc comments into `parts.ts`**

Keep every comment verbatim — they record which library version each number was read off. Place them beside `ROTARY_SYMBOLS_BY_POSITIONS`.

- [ ] **Step 4: Import them in `section-board.ts` from their new home**

- [ ] **Step 5: Run the tests and the typecheck**

```bash
bun test tests/circuits/pultec-switch-geometry.test.ts tests/schgen/nc-pins.test.ts
bun run typecheck
```

- [ ] **Step 6: Verify the five drafted digests are untouched, then commit**

```bash
shasum -a 256 drafted/pultec/*/*.generated-do-not-edit.kicad_sch
git add circuits/pultec/physical/parts.ts circuits/pultec/schematic/section-board.ts tests/circuits/pultec-switch-geometry.test.ts tests/schgen/nc-pins.test.ts
git commit -F /tmp/msg-task2.txt
```

---

### Task 3: Move the designator map beside the circuit

**Files:**
- Create: `circuits/pultec/designators.ts`
- Modify: `circuits/pultec/schematic/section-board.ts` (remove `pultecDesignator`, `JUNCTION_DESIGNATORS`, `DESIGNATOR`; import)
- Test: `tests/circuits/pultec-designators.test.ts`

**Interfaces:**
- Produces: `pultecDesignator(id: string): string` and `JUNCTION_DESIGNATORS: Readonly<Record<string, string>>`, exported from `circuits/pultec/designators.ts`. Task 4 consumes `pultecDesignator`.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test"
import { pultecDesignator } from "../../circuits/pultec/designators.ts"

test("an id upper-cases with dots and hyphens becoming underscores", () => {
  expect(pultecDesignator("c_hi_boost")).toBe("C_HI_BOOST")
  expect(pultecDesignator("SI_HI_CUT_RV_HI_CUT.ccw-wiper")).toBe("SI_HI_CUT_RV_HI_CUT_CCW_WIPER")
})

test("the two junction rows keep the names that say what they are", () => {
  expect(pultecDesignator("junction_signals")).toBe("J_SIGNALS")
  expect(pultecDesignator("junction_grounds")).toBe("J_GROUNDS")
})
```

- [ ] **Step 2: Run it and watch it fail** — `Cannot find module`.

- [ ] **Step 3: Move the function, the map and the `DESIGNATOR` regex into the new file, comments verbatim**

- [ ] **Step 4: Import in `section-board.ts`; run `bun test tests/circuits/ && bun run typecheck`**

- [ ] **Step 5: Verify the five digests, commit**

---

### Task 4: Switch the board guards onto the standalone comparison, proving equivalence first

**Files:**
- Modify: `tests/circuits/drafted-sheet.ts`
- Create: `tests/circuits/guard-equivalence.test.ts` (temporary — deleted in Task 9)

**Interfaces:**
- Consumes: `compareSheetToModel` (Task 1), `pultecDesignator` (Task 3).
- Produces: `modelUnderTest` replaced by a schgen-free equivalent returning the arguments `compareSheetToModel` needs.

- [ ] **Step 1: Write the equivalence test — this is the task's whole point**

```ts
// tests/circuits/guard-equivalence.test.ts
import { expect, test } from "bun:test"
import { roundTrip } from "../../lib/schgen/gates/round-trip.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { committedNetlist, modelUnderTest } from "./drafted-sheet.ts"
import { modelForSheet } from "./sheet-model.ts"   // the schgen-free side, built in Step 3

const BOARDS = [
  { board: "pultec-hi-boost", netlist: "tests/fixtures/pultec-hi-boost.net" },
  { board: "pultec-hi-cut", netlist: "tests/fixtures/pultec-hi-cut.net" },
  { board: "pultec-low-boost", netlist: "tests/fixtures/pultec-low-boost.net" },
  { board: "pultec-low-cut", netlist: "tests/fixtures/pultec-low-cut.net" },
  { board: "pultec-mid", netlist: "tests/fixtures/pultec-mid.net" },
]   // confirm each path against the board's perfboard.json before running

for (const { board, netlist } of BOARDS) {
  test(`${board}: the standalone comparison reports exactly what roundTrip reports`, () => {
    const exported = committedNetlist(netlist)
    const old = modelUnderTest(board)
    const viaSchgen = roundTrip(old.circuit, old.refs, exported)
    const fresh = modelForSheet(board)
    const standalone = compareSheetToModel(fresh.network, fresh.designators, fresh.pinNumbers, exported)
    expect([...standalone.componentIdentity].sort()).toEqual([...viaSchgen.componentIdentity].sort())
    expect([...standalone.netMembership].sort()).toEqual([...viaSchgen.netMembership].sort())
    expect([...standalone.pinIdentity].sort()).toEqual([...viaSchgen.pinIdentity].sort())
    expect([...standalone.values].sort()).toEqual([...viaSchgen.values].sort())
    expect([...standalone.footprints].sort()).toEqual([...viaSchgen.footprints].sort())
  })
}
```

- [ ] **Step 2: Run it and watch it fail** — `Cannot find module './sheet-model.ts'`.

- [ ] **Step 3: Write `tests/circuits/sheet-model.ts`**

`modelForSheet(board)` returns `{ network, designators, pinNumbers }`, built from the board's own circuit module and `pultecDesignator`, with **no import from `lib/schgen/` or `tools/schgen/`**. The pin-number map comes from the symbol each part is drawn with — `POLE_PIN`/`THROW_PINS` for the selectors, the kind's canonical order for two-terminal passives. Throw naming the part when a symbol's numbering is unknown.

- [ ] **Step 4: Run the equivalence test until all five boards agree**

Run: `bun test tests/circuits/guard-equivalence.test.ts`
Expected: 5 pass. **A disagreement here is the standalone side being wrong — fix it, never loosen the assertion.**

- [ ] **Step 5: Switch `registerDraftedPageTests` onto `compareSheetToModel`**

Replace the three `roundTrip(...)` call sites. `withOnePinMoved` is unchanged and keeps serving as the control.

- [ ] **Step 6: Run the five board tests and `make check`**

```bash
bun test tests/circuits/
make check 2>&1 | grep -E "^(ok|FAIL)"
```
Expected: the same four FAIL boards and no others.

- [ ] **Step 7: Commit**

---

## Phase B — move the `kicad-cli` proof

### Task 5: Prove round-trip fidelity on the five approved sheets

**Files:**
- Create: `tests/circuits/drafted-kicad-round-trip.test.ts`
- Modify: `tests/circuits/drafted-sheet.ts` (export what the new test needs)

- [ ] **Step 1: Write the failing test**

For each of the five boards: run `kicad-cli sch export netlist --format kicadxml` on the sheet in `drafted/`, import it, and assert `compareSheetToModel` reports the same five lists as the committed `.net` does. **Fail rather than skip when `kicad-cli` is absent** — match `tests/circuits/kicad-round-trip.ts`'s refusal text, which says why.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Implement; run; the five must pass**

- [ ] **Step 4: Record what `transistor-preamp` loses**

The five preamp boards have no drafted page, so this proof does not cover them. **Measure and write down in the findings doc exactly which assertions they had through the stub writer and which they will have after Task 6.** This is the one place the change can quietly reduce coverage; it is reported, not assumed.

- [ ] **Step 5: Commit**

---

### Task 6: Delete `lib/kicad/schematic.ts`

**Files:**
- Delete: `lib/kicad/schematic.ts`, `tests/circuits/kicad-round-trip.ts`, `tests/circuits/stub-writer-tripwire.test.ts`
- Modify: the five `tests/circuits/transistor-preamp-*.test.ts`

- [ ] **Step 1: Confirm nothing else imports it**

Run: `grep -rn "kicad/schematic" lib/ tools/ tests/ circuits/`
Expected: only the files listed above.

- [ ] **Step 2: Rewrite the five preamp tests to the coverage measured in Task 5 Step 4**

Keep every assertion that does not need the stub writer. For those that do, the test is **deleted with a comment in the file saying what it proved and that Task 5's drafted-page round trip is the remaining proof** — not silently dropped.

- [ ] **Step 3: Delete the three files; run `bun test tests/circuits/ && bun run typecheck && make check`**

- [ ] **Step 4: Commit**

---

## Phase C — delete

### Task 7: Relocate `occupancy.ts`, and raise the readability-baselines question

**Files:**
- Create: `tools/guide/occupancy.ts` (moved from `lib/schgen/render/occupancy.ts`, with its tests)
- Modify: `tools/guide/placement.ts`

- [ ] **Step 1: Move the module and its tests; update the one import; run `bun test tests/guide/ && bun run typecheck`**

- [ ] **Step 2: Measure `schematic/readability-baselines.json`**

Run: `grep -rn "readability-baselines\|readability/baseline" --include=* -r . | grep -v node_modules`
`lib/schgen/readability/baseline.ts` is its only loader and **nothing imports that loader**. Write the finding into the findings doc: the registry is a committed owner-judgement artifact about to lose the only code that can read it. **Raise it as an owner question; do not delete it and do not decide.**

- [ ] **Step 3: Commit**

---

### Task 8: Simplify the guide's schematic resolution

**Files:**
- Modify: `tools/guide/schematic-source.ts`, `tools/guide/packet.ts`, `tools/guide/guide.ts`
- Modify: `tests/guide/generated-schematic.test.ts`, `tests/guide/schematic-class-gate.test.ts`

- [ ] **Step 1: Write the failing test — a board declaring no `"sch"` gets the no-schematic notice**

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Remove the generate path**

`resolveSchematic` keeps only two outcomes: a declared sheet is printed, and anything else gets `kind: "none"`. Delete the `boardRefs`/`boardSheets` `deps` defaults in `packet.ts`. **A board declaring an `"sch"` must print it exactly as now.**

- [ ] **Step 4: Regenerate all five guides and confirm page 2 is still the approved sheet**

```bash
for b in pultec-hi-boost pultec-hi-cut pultec-low-boost pultec-low-cut pultec-mid; do make -C boards/$b guide; done
```

- [ ] **Step 5: Run `bun test tests/guide/ && make check`; commit**

---

### Task 9: Delete schgen

**Files:**
- Delete: `lib/schgen/`, `tools/schgen/`, `tests/schgen/`, `tools/cli/schgen.ts`, `tools/cli/schgen-anchors.ts`, `tools/cli/schgen-parity.ts`, `tools/draught/gate.ts`, `tests/circuits/guard-equivalence.test.ts`, `tests/cli/schgen.test.ts`
- Modify: the ten `circuits/*/schematic/*.ts` — the layout-intent half goes; the relocated pieces stay where Tasks 2 and 3 put them
- Modify: `tests/kicad/install.test.ts` (one `stockSymbolDir` import)

- [ ] **Step 1: Re-run the dependency sweep — do not trust this list**

```bash
grep -rln "schgen\|boardSheets\|SchgenRefusal\|FindingKind\|RefusalClass\|SchematicAuthoring\|BlockDeclaration\|stockSymbolDir" lib/ tools/ tests/ circuits/ make/ Makefile package.json
```
**Report anything this task's file list missed.** The previous sweep missed a real import in `packet.ts`.

- [ ] **Step 2: Delete, then let the typechecker find the rest**

Run: `bun run typecheck` repeatedly, resolving each error, until clean. Ten `circuits/*/schematic/*.ts` files will fail first.

- [ ] **Step 3: Run the full suite and `make check`**

```bash
bun test 2>&1 | tail -5
make check 2>&1 | grep -E "^(ok|FAIL)"
```
Expected: **`bun test` reaches 0 failures** — the 8 `port-fidelity` cases go with their code. `make check` fails on exactly the four baseline boards.

- [ ] **Step 4: Verify the five drafted digests one last time; commit**

---

### Task 10: Correct the prose that tells agents what to do

**Files:**
- Modify: `CLAUDE.md` (the generator sentence; the two `tools/schgen/` commands; the `board-sheets.ts` worked example), `README.md`, `TOOLING.md`, `docs/schematic/README.md`, `.gitignore`

- [ ] **Step 1: Replace `CLAUDE.md`'s generator sentence**

It currently reads that `lib/schgen/` is the schematic generator and `lib/kicad/schematic.ts` the stub it replaced. **Both are now false.** Point at `TOOLING.md` and the copperhead-then-akcli loop, and at `drafted/` for the approved pages.

- [ ] **Step 2: Replace the two commands `CLAUDE.md` tells agents to run**

`bun tools/schgen/board-sheets.ts` and `bun run tools/schgen/board-geometry.ts` no longer exist. The paragraph's governance — *"a figure in prose is a transcription with a date on it"*, *"run the tool"* — stays; what changes is which tool.

- [ ] **Step 3: Correct `README.md`, `TOOLING.md`, `docs/schematic/README.md`, `.gitignore`**

- [ ] **Step 4: Confirm the historical record is untouched**

```bash
git diff --name-only HEAD~1 | grep -E "DEVELOPMENT-LOG|known-gaps|docs/research|docs/superpowers|RECORD.md|schgen-development-history"
```
Expected: no output.

- [ ] **Step 5: Write the findings document and commit**

`docs/research/2026-10-30-schgen-removed.md`: the sweep, what moved where, the equivalence evidence, the `transistor-preamp` coverage delta from Task 5, the readability-baselines question, and the final `make check` / `bun test` diffs.

---

## Self-review

**Spec coverage.** §1 three relocations → Tasks 2, 3. §2 four guards rebuilt first → Tasks 1, 4. §3 `lib/kicad/schematic.ts` → Tasks 5, 6. §4 deletions → Tasks 8, 9. §5 other relocations → Task 7. §6 prose → Task 10. The spec's open questions: readability-baselines → Task 7 Step 2 raises it; `transistor-preamp` coverage → Task 5 Step 4 measures it; the three numeric gates are in Global Constraints.

**Type consistency.** `compareSheetToModel` returns `SheetAgreement` with the same five field names `RoundTripProblems` uses, which Task 4's equivalence test requires field by field. `modelForSheet` returns `{ network, designators, pinNumbers }`, matching `compareSheetToModel`'s first three parameters.

**Known soft spots, stated rather than hidden.** Task 1 Step 4 says "mirror `round-trip.ts`" rather than reproducing 200 lines; Task 4's equivalence test is the check that makes that safe, and it must pass on all five boards before Task 5. Task 2's test names `readSymbol` from `lib/kicad/symbol-library.ts` — **confirm the real helper and its module before writing**, and reuse whatever `nc-pins.test.ts` already uses rather than writing a parser.
