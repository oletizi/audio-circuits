# Net Names and Floating Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the six boards that refuse at `validateCircuit` — `pt2399-core` and the five Pultec boards — past validation, by removing a naming demand that carries no information and by declaring floating pins honestly.

**Architecture:** Measure before changing. One probe settles what KiCad accepts in a label and whether synthetic net names are ever drawn at all; a second measurement establishes what the existing model-to-IR no-connect path already does, because it is wired and has never been exercised. Only then does the casing rule come out and the six pins get declared.

**Tech Stack:** TypeScript on Bun, `kicad-cli` 10.0.5 (not on `PATH`; resolved at `lib/kicad/netlist.ts:39`), the `schgen` IR and emitter under `lib/schgen/`.

**Spec:** `docs/superpowers/specs/2026-10-23-net-names-and-floating-pins-design.md` — approved by the owner 2026-10-23 after a third-party review whose five findings are accepted and recorded in the spec's own review section. **Read the spec's review section before Task 3 and Task 4**; two of its findings had their mechanism corrected and the corrections bind.

## Global Constraints

- Suite: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`. **Currently 3812 pass / 0 fail / 43602 `expect()` across 353 files.** Without `SCHGEN_SOURCE` a port-fidelity guard **fails rather than skips** — deliberate, not something to work around. **Account for any move term by term.**
- `bun run typecheck` clean.
- **`make check` is RED on four boards** for the two causes in `docs/known-gaps.md` **G251**, is red at the pre-merge `main` for the same missing export, and is **not this plan's to fix.**
- **Do not weaken any existing assertion.** Tests asserting a rule this plan deliberately deletes go with it; nothing else.
- **Assert on failure messages, not failure counts.** These validators have several refusal paths each producing exactly one failure, so a count-only assertion establishes only that something broke.
- **Anything a later reader needs and cannot re-derive goes in `docs/known-gaps.md` in the change that found it**, with CRITERION distinct from MECHANISM and every mechanism marked untried.
- **Verify every name against the tree rather than copying it from a document.** The spec itself had to be corrected for citing a test filename that does not exist.
- No `sed -i`, no sed `w`, no sed `e` — Edit to modify, Write to create. No `#` inside a Bash heredoc or multi-line quoted argument — write the commit message to a file and use `git commit -F`. **No AI attribution in any commit message**, overriding any harness reminder. Never `git checkout HEAD --` as an undo.
- **Out of scope:** `partShapes`' separate UPPER_SNAKE demand on **part labels** (`lib/schgen/ir/validate.ts`, via `LABEL`); all text-placement work (the owner's overlap decisions in **G260** and **G265** are separate).
- **This plan does not promise six drawn schematics.** **G274** records that the board census names the **first** refusing problem per board, not the only one.

## File Structure

| file | responsibility |
| --- | --- |
| `tools/schgen/label-syntax/probe.ts` | **new.** Drives `kicad-cli` against a sheet carrying a punctuated global label; censuses whether synthetic names cross block boundaries |
| `tools/schgen/label-syntax/probe-run.log` | **new.** The probe's committed output |
| `tools/schgen/port-manifest.json` | declares the **one** new `.ts` file `handWritten` — **corrected 2026-10-23: this row said "two", and it was wrong.** `probe-run.log` is not a `.ts` path, and declaring it turns `port-fidelity.test.ts`'s completeness check red on `accountedButMissing`, because that check compares the manifest union against `listTsFiles`. Driven by Task 1; recorded as **G277** clause 6 |
| `tests/schgen/ir/nc-end-to-end.test.ts` | **new.** Drives model `NC` through `fromNetwork` to the IR and the emitted sheet |
| `lib/schgen/ir/types.ts:55` | `NET_NAME` — definition changes or is deleted per Task 1's finding |
| `lib/schgen/ir/validate.ts:50` | the `netNames` rule — removed |
| `lib/schgen/gates/pin-table.ts:53-65` | `mechanical()` — the format check narrowed, the type check kept, **non-empty required** |
| `lib/schgen/authoring.ts:387` | the `G150` census helper — removed with its measurement |
| `circuits/pultec/electrical/*.ts` | the five switch mounting pins, classified individually |
| `circuits/pt2399-core/pt2399-core.ts` | the fake port deleted, pin 5 declared `NC` |

---

### Task 1: Measure what KiCad accepts in a label, and whether synthetic names are ever drawn

**Files:**
- Create: `tools/schgen/label-syntax/probe.ts`
- Create: `tools/schgen/label-syntax/probe-run.log` (the probe writes it; commit it)
- Modify: `tools/schgen/port-manifest.json`

**Interfaces:**
- Produces: `LABEL SYNTAX` — for each of four candidate net names, whether `kicad-cli` parses the sheet, whether the name survives a netlist round trip byte-for-byte, and whether it renders in PDF. Plus `BOUNDARY CENSUS` — the count of synthetic net names that cross a block boundary on any board, which may be zero.

- [ ] **Step 1: Resolve `kicad-cli` and record its version**

Read `lib/kicad/netlist.ts:39` for the resolver. Do not assume `kicad-cli` is on `PATH`; it is not. The probe prints the version it ran against, and refuses if the binary is absent — **a skipped measurement must not look like a passing one.**

```ts
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
if (!existsSync(KICAD_CLI)) throw new Error(`kicad-cli not at ${KICAD_CLI}; lib/kicad/install.ts holds the per-platform candidates`)
```

- [ ] **Step 2: Print the predictions BEFORE measuring**

`docs/known-gaps.md` **G271** records that a prediction living only in a report is not verifiable. The probe prints its predictions first, so the committed log carries both.

```ts
console.log("== PREDICTIONS, printed before any kicad-cli call")
console.log("PREDICTION UPPER_SNAKE: parses, round-trips byte-identical, renders")
console.log("PREDICTION lowercase: parses, round-trips byte-identical, renders")
console.log("PREDICTION Net-(C10-Pad1): UNKNOWN - this is the measurement")
console.log("PREDICTION unconnected-(U1-CLK_O-Pad5): UNKNOWN - this is the measurement")
```

- [ ] **Step 3: Emit one sheet per candidate name and run `kicad-cli` on it**

Four candidates: `SIGNAL` (control, must pass), `hi_boost_out` (lowercase, the owner's case), `Net-(C10-Pad1)` (synthetic, parentheses and hyphen), `unconnected-(U1-CLK_O-Pad5)` (synthetic, the pt2399 case). For each: write a minimal sheet carrying a `global_label` with that name, then

```
kicad-cli sch export netlist --output <out> <sheet>
kicad-cli sch export pdf     --output <out> <sheet>
```

**PDF, never SVG** — **G265** clause 1 records that `sch export svg` omits a global label's outline and under-reports it by 3333.75 µm.

- [ ] **Step 4: Report four things per candidate, with the exit status**

Parsed (exit 0 from the netlist export); name byte-identical in the exported netlist; PDF produced; and the exact bytes the writer emitted for the name, so a quoting difference is visible rather than inferred.

- [ ] **Step 5: Census the boundary question**

Labels are emitted per **boundary anchor**, not per net — `lib/schgen/render/cross-sheet.ts:29` records `anchorsToSymbols` emitting for a block's boundary. So count, over all eleven boards' declared blocks, how many **synthetic** net names (matching `/^(Net|unconnected)-/`) reach a label. **If the answer is zero, the punctuation question is closed by the architecture** and the log must say so.

- [ ] **Step 6: Declare the probe and run the suite**

Add both new paths to `tools/schgen/port-manifest.json` as `handWritten` — the port-fidelity guard refuses an undeclared `.ts` under `tools/schgen/`, and declaring it is how to satisfy that guard rather than dodge it.

Run: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
Expected: 3812 pass / 0 fail, unchanged — a probe plus a manifest entry runs no new assertions.

- [ ] **Step 7: Commit**

Write the message to a file and `git commit -F`. Record the findings in `docs/known-gaps.md`: what each candidate did, and the boundary census. If any candidate failed to parse, that is the finding that shapes Task 3.

---

### Task 2: Establish what the existing model-to-IR no-connect path actually does

**This task is a measurement, and its result determines how much of Task 4 and Task 5 is work.**

**Files:**
- Create: `tests/schgen/ir/nc-end-to-end.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `NC PATH` — whether a model `NC` connection reaches the IR as `net: null`, whether `pinsDeclared` accepts it, and whether the pin appears in `d.noConnects` and so in the emitted sheet.

**Why this is a measurement and not an assumption.** `NC` is exported at `lib/model/types.ts:42`, **no circuit imports it**, and the path appears already wired: `lib/schgen/from-network.ts:222` and `:233` read `connection.kind === "net" ? { net, identity } : { nc: true, identity }` — the NC case is the **unnamed else branch** — and `:468` maps a connection with no `net` key to **`null`**. So the plumbing exists and has never carried anything. **Find out what it does before changing it.**

- [ ] **Step 1: Write the failing test — a minimal circuit with one NC pin**

```ts
import { circuit, NC } from "@/model/index.ts"

test("a model NC pin reaches the IR as net null and satisfies pinsDeclared", () => {
  const n = circuit()
    .add({ id: "u_probe", kind: "ic", part: { mpn: "PT2399" }, units: { MAIN: { pins: { "1": net("IN"), "5": NC } } } })
    .port("input", "IN")
    .done()
  const ir = fromNetwork(n, authoringFor(n))
  const pin5 = ir.pins.find((p) => p.part === "U1" && p.pin === "5")
  expect(pin5).toBeDefined()
  expect(pin5?.net).toBeNull()
  expect(validateCircuit(ir, symbols()).filter((m) => m.includes("pin 5"))).toEqual([])
})
```

Adapt the component shape to this repository's builder — read `circuits/opamp-buffer.ts` for the idiom and `lib/model/kinds.ts` for the pin vocabulary. **Do not invent a kind or a pin name; take them from `kinds.ts`.**

- [ ] **Step 2: Run it and record what actually happens**

Run: `SCHGEN_SOURCE=… bun test tests/schgen/ir/nc-end-to-end.test.ts`

**Three outcomes, each legitimate, and the log records which:**
1. **Passes** — the path works and Tasks 4 and 5 need only author `NC`. Keep the test as the regression.
2. **Fails at `pin5.net`** — the IR does not carry `null`; the gap is in `from-network.ts`'s pin assembly and Step 3 closes it.
3. **Fails at `validateCircuit`** — the IR carries `null` but `pinsDeclared` (`lib/schgen/ir/validate.ts:67-74`) does not count a null-net pin as declared, because it tests membership in `c.pins` by pin number. Step 3 closes that instead.

- [ ] **Step 3: Close whichever gap the run found, minimally**

If outcome 1, skip to Step 4. Otherwise change only what the failure names. `pinsDeclared`'s `have` set is built from `c.pins.filter((q) => q.part === p.label).map((q) => q.pin)` — if an NC pin is absent from `c.pins` entirely, it must be added with `net: null` rather than have the rule relaxed. **Adding the pin is the fix; loosening the rule is the defect** — the rule's job is to catch a pin nobody declared, which is one of the four states the spec requires stay distinguishable.

- [ ] **Step 4: Extend the test to the emitted sheet**

```ts
test("an NC pin is emitted as a no_connect marker, not merely left unwired", () => {
  const sheet = renderSheet(/* the same circuit */)
  expect(sheet).toContain("(no_connect")
})
```

`lib/schgen/render/emit-items.ts:215` defines `noConnect()`, `emit.ts:169` emits `d.noConnects`, and `lib/kicad/schematic.ts:186` writes the form. **Measure `noConnect()`'s coverage rather than assuming it** — `lib/schgen/README.md` lists `emit-items.ts` among modules nothing runs, and the spec records that as unmeasured.

- [ ] **Step 5: Assert the four states stay distinguishable**

One test per state, each asserting on the **message**: a deliberate `NC` (accepted); a pin omitted from the model entirely (still refused by `pinsDeclared`, with its message); a library pin typed `no_connect` that is on a net (still refused by `lib/schgen/ir/validate-nets.ts:47`, with its message); and a pin on a one-pin net (still refused by `singlePinNets`, with its message). **The second is the one that protects against accident and it must not weaken.**

- [ ] **Step 6: Run the suite, account for the move, commit**

Expected: 3812 + the new cases. Account term by term. Record in `docs/known-gaps.md` what the NC path did on first exercise — this is `NC`'s first use in the repository's history and the next reader cannot re-derive it.

---

### Task 3: Remove the casing demand

**Read Task 1's log first.** Its outcome determines whether `NET_NAME` is deleted or replaced.

**Files:**
- Modify: `lib/schgen/ir/types.ts:55`, `lib/schgen/ir/validate.ts:50`, `lib/schgen/gates/pin-table.ts:53-65`, `lib/schgen/authoring.ts:387`

**Interfaces:**
- Consumes: Task 1's `LABEL SYNTAX` — which characters, if any, must still be refused.
- Produces: `NET NAME RULE` — the predicate that replaces the casing regex.

- [ ] **Step 1: Write the four failing tests the review requires**

```ts
test("a lowercase net name is accepted", () => {
  expect(() => mechanical({ net: "hi_boost_out" }, "where", "field")).not.toThrow()
})
test("an empty net name is refused", () => {
  expect(() => mechanical({ net: "" }, "where", "field")).toThrow(/must be/)
})
test("a non-string net is refused", () => {
  expect(() => mechanical({ net: 7 }, "where", "field")).toThrow(/must be/)
})
test("a synthetic KiCad net name is handled as Task 1 measured", () => {
  // assert accepted or refused per the probe's finding, citing the log line
})
```

- [ ] **Step 2: Run them and watch the lowercase one fail**

Run: `SCHGEN_SOURCE=… bun test tests/schgen/gates/` — expect the lowercase case to fail against the current regex and the empty case to **pass already** (the regex refuses empty), which is why Step 3 must not regress it.

- [ ] **Step 3: Narrow the gate — keep the type check, require non-empty**

`lib/schgen/gates/pin-table.ts:60` currently reads

```ts
if (typeof net !== "string" || !NET_NAME.test(net)) throw fail();
```

Replace the format half only:

```ts
if (typeof net !== "string" || net.length === 0) throw fail();
```

**This is the step most likely to weaken a guard.** `lib/model/types.ts:45` shows the model's own `net()` throwing `"net name must not be empty"`, so a gate accepting `""` would be **weaker than the contract it guards.** If Task 1 found characters KiCad rejects, add that refusal here too.

- [ ] **Step 4: Remove the `netNames` rule and the census helper**

Delete the rule at `lib/schgen/ir/validate.ts:50` and its registration. Delete the `G150` census helper at `lib/schgen/authoring.ts:387` **and amend G150**, whose measurement it served — the entry already carries the owner's decision. **Supersede means delete**: do not leave the helper as a stub.

Delete the tests that assert the casing refusal. **Nothing else.** The diff should show no other assertion weakened; a reviewer will check.

- [ ] **Step 5: Run the suite and the board census**

```
SCHGEN_SOURCE=… bun test
SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts
```

**Expected from the census: still 0 of 11 boards, and the six now refuse on ONE problem each rather than on net names plus one.** That is the measurable outcome of this task and it is what to report — not "six boards fixed."

- [ ] **Step 6: Commit**

---

### Task 4: Classify the five Pultec switch mounting pins individually, then declare them

**Read the spec's review section before starting.** Finding 2's criterion is adopted and its mechanism is declined.

**Files:**
- Modify: whichever of `circuits/pultec/electrical/*.ts` declares each switch (find them; `three-band.ts:165` declares `SW_MID`, `from-netlist.ts:246` declares `SW_HI_BOOST`)

**Interfaces:**
- Consumes: Task 2's `NC PATH`.
- Produces: `MOUNTING PIN CLASSIFICATION` — one verdict per switch, with its evidence.

- [ ] **Step 1: Read each switch's symbol pin definition**

Five switches, and **four call this pin `MP` while one calls it `12`** (`SW_MID`). **Two names is a reason to check whether they are two different things, not to batch them.** For each, read the pin's definition in the KiCad symbol — name, number, electrical type — and record it.

- [ ] **Step 2: Establish each terminal's electrical role from the part, not from its name**

**This is the step the first spec draft got wrong**, by inferring isolation from the pin being called a mounting pin. `CLAUDE.md`: *"Verify names against the thing itself."* A mounting terminal may be electrically isolated, or bonded to chassis, shield or switch frame. **If it is bonded, `NC` is a false declaration that hides a real connection.**

Record per switch: the part number, the source consulted, and the verdict. **Where the part cannot be identified or its documentation does not say, record that and declare nothing** — an unresolved pin stays unresolved and the board stays refused. That is a correct outcome, not a failure of this task.

- [ ] **Step 3: Declare each pin according to its verdict**

For an isolated terminal:

```ts
import { NC } from "../../../lib/model/index.ts"
// ... in the switch's pin map:
MP: NC,
```

For a bonded terminal, declare the connection explicitly — to the board's chassis or shield net, named as that net is named elsewhere in the circuit. **Do not invent a net name**; take it from the circuit.

**The five may not come out the same way.** If they differ, say so in the commit and in the register.

- [ ] **Step 4: Run the suite, typecheck, and the census**

Expected: the five Pultec boards no longer refuse on the mounting pin. **They may refuse on the next problem behind it** — `G274` records that the census names the first problem, not the only one. Report what the census says, not what was hoped.

- [ ] **Step 5: Record the classification and commit**

`docs/known-gaps.md` gets the per-switch verdict with its evidence, marked CONFIRMED or RELAYED per switch. **This is `NC`'s first authored use in the repository** and the reasoning cannot be re-derived from the diff.

---

### Task 5: `pt2399-core` — delete the fake port, declare NC, and teach the comparison one pin-specific mapping

**Files:**
- Modify: `circuits/pt2399-core/pt2399-core.ts` (the module comment at lines 26-37, the port at line ~190, the pin map at line ~147)
- Modify: whichever test compares the model's nets to the netlist export (find it; `tests/circuits/pt2399-core.test.ts` is the candidate)

**Interfaces:**
- Consumes: Task 2's `NC PATH`.
- Produces: `NC ROUND TRIP` — a pin-specific allowance, never a class of shapes.

- [ ] **Step 1: Delete the fake port and declare the pin**

Remove `.port("clk_o_unused", "unconnected-(U1-CLK_O-Pad5)")`. Change the pin map entry `"5": "unconnected-(U1-CLK_O-Pad5)"` to declare `NC`. **Rewrite the module comment at lines 29-37**, which currently explains why the port exists and states that it *"does not imply the pin does anything off-board"* — that explanation is being deleted along with the thing it explained. **Supersede means delete.**

- [ ] **Step 2: Write the pin-specific round-trip allowance as a failing test**

```ts
test("U1 pin 5's declared NC matches KiCad's placeholder net, and nothing else does", () => {
  expect(equivalent(modelNets, exportedNets)).toBe(true)
})
test("a pin NOT declared NC is still refused when it goes missing", () => {
  const broken = /* the same model with one resistor terminal dropped */
  expect(() => equivalent(brokenNets, exportedNets)).toThrow(/missing/)
})
```

**The second test is the one that matters.** Review finding 5: a blanket *"a single-pin net corresponds to an intentional NC"* rule **would hide a resistor terminal accidentally dropped in transformation**, which is exactly what this gate exists to catch. **Only a pin explicitly declared `NC` in the authoritative model may match a placeholder.**

- [ ] **Step 3: Implement the allowance, keyed on the declaration**

The comparison consults the **model's** `NC` declarations and permits a placeholder net only for those pins. It does **not** pattern-match on `unconnected-*`, and it does **not** treat single-pin nets as a class.

- [ ] **Step 4: The required end-to-end gate**

Review finding 1, treated as a correctness gate rather than a serialization detail: a test proving **pin 5's NC status survives generation AND round-trip verification** — present as `(no_connect` in the emitted sheet, and accepted by the comparison.

- [ ] **Step 5: Run everything and commit**

```
SCHGEN_SOURCE=… bun test
bun run typecheck
SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts
```

---

### Task 6: Re-drive the census and record what actually changed

**Files:**
- Modify: `docs/known-gaps.md` — amend **G259** (the scoreboard), **G150**, **G274**

- [ ] **Step 1: Re-drive the board census and diff it against the figure in G274**

```
SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts
```

G274 clause 2 records the before state: six boards at `validateCircuit` with 18/20/14/14/14/28 problems, two on a glyph touch, one on a junction, two on label overlaps.

- [ ] **Step 2: Report the honest outcome, which is not "six boards draw"**

State per board what it now does. **If a board now refuses on a problem nobody had seen, that is this plan's most valuable result** — `G274` predicted it, because the census names the first refusing problem rather than the only one.

- [ ] **Step 3: Amend the register and commit**

Every figure that moved, with what moved it. **Delete superseded figures rather than annotating them.** Mark CONFIRMED versus RELAYED, keep CRITERION distinct from MECHANISM, mark every mechanism untried.

---

## Self-Review

**Spec coverage.** Spec part 1 (measure first) → Task 1, including the review's boundary-census addition. Part 2 (remove the casing demand, three call sites, non-empty predicate, four test cases) → Task 3. Part 3b (the NC transformation contract, four distinguishable states, the required end-to-end gate) → Task 2 Steps 4–5 and Task 5 Step 4. Part 3's five Pultec pins with individual classification → Task 4. Part 3's `pt2399-core` case and decision (1) → Task 5. Review finding 5's pin-specific allowance → Task 5 Steps 2–3. The spec's "does not promise" → Task 6 Step 2. **No gap found.**

**Placeholder scan.** No `TBD`, no "appropriate", no "handle edge cases", no "similar to Task N". Task 2 Step 3 is conditional on a measurement rather than vague — all three outcomes are named with the file and rule each implies. Task 4 Step 2 permits "record that and declare nothing" as an outcome, which is a stated result rather than an omission.

**Type consistency.** `NC` from `lib/model/index.ts` throughout; `net: null` for the IR per `ir/types.ts:247`; `mechanical(value, where, field)` as `gates/pin-table.ts:53` defines it; `d.noConnects` as `render/emit.ts:169` consumes it. Artifact names are produced once and consumed by name: `LABEL SYNTAX` and `BOUNDARY CENSUS` (1), `NC PATH` (2), `NET NAME RULE` (3), `MOUNTING PIN CLASSIFICATION` (4), `NC ROUND TRIP` (5).

**One thing this plan deliberately does not do.** It does not touch text placement, and it does not promise a drawn schematic. Both are the spec's positions and both were endorsed by the review.
