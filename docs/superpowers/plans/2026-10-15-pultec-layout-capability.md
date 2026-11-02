# Pultec Layout Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-process stripboard constructor able to express a Pultec section, so that `pultec-low-boost` produces a sound candidate where today it refuses before a candidate exists.

**Architecture:** Four changes to the constructive placer, two of them sharing one new check. A strip may carry several nets with the cuts derived (D3a); a moulded pin field may be laid in all four facings instead of two (D2); an off-board control becomes a one-hole terminal (D1); strip assignment becomes per-net rather than one uniform stride (D3b). D2 and D3a are the same question — whether the contacts on a strip can be separated — and share one check rather than two that drift.

**Tech Stack:** TypeScript on Bun. No new dependency. `lib/stripboard/` stays free of `tools/` imports and of file reads.

**Spec:** `docs/superpowers/specs/2026-10-15-pultec-layout-capability-design.md` — approved by the owner 2026-10-15. Read it before Task 1; it carries the measurements and the owner rulings this plan argues from.

## Global Constraints

- **An agent may never author the acceptance criteria for the artifact it is producing.** Producers refuse on FEASIBILITY; `objectiveOf` prices and `violationsOf` judges, and both belong to the caller.
- **A directive outranks the as-built boards.** `CLAUDE.md` records the owner's ruling. "This would refuse a board he built" is not an argument against a rule.
- **No fallbacks, no mock data outside test code.** A missing value throws, naming what is missing, where to fix it, and why nothing is substituted.
- **No `any`, no `as Type`, no `@ts-ignore`, no non-null assertion.**
- **Relative imports carry the `.ts` extension.**
- **Files stay between 300 and 500 lines.** At plan time: `moves.ts` 498, `search-stop.ts` 498, `search.ts` 479, `seed-area.ts` 417, `cuts.ts` 393, `seed-place.ts` 341, `seed-fit.ts` 321, `seed.ts` 228, `seed-model.ts` ~360, `seed-parts.ts` ~215. Several have no headroom — split on a real seam and say so.
- **`lib/stripboard/` imports nothing from `tools/` and spawns nothing.** `tests/stripboard/model/no-fork.test.ts` enforces it transitively.
- **A skipped check must never look like a passing one**, and **a predicate that can never fire** is this repository's recurring defect — found at least four times in the previous plan.
- **Supersede means delete.** A rule replaced by a better one is removed in the same change, never left as a stub.
- **Refusals teach:** what is missing, where to fix it, why nothing is substituted.
- **The benchmark gate must keep passing** on `transistor-preamp-feedback` and `transistor-preamp-buffered` at figures counted off their own dumps at run time. **If a benchmark figure moves, REPORT IT and stop.** Do not adjust the gate, the objective, the seed heuristics or `stripboard/rules.json`.
- **No Claude/AI attribution in commit messages.** No git hooks. No `#` inside bash heredocs — use the Write tool and `git commit -F file`. No `sed` for writes. Use `bun`, never ts-node.
- Baseline at plan time: `bun test` → **2241 pass / 0 fail across 197 files**. The count may only go up.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/stripboard/separable.ts` | **new.** Whether the contacts on one strip can be separated by cuts. The single check D2 and D3a share. |
| `lib/stripboard/seed-place.ts` | the workspace and column choice; gains the per-placement separability check and loses home-strip exclusivity |
| `lib/stripboard/seed-fit.ts` | the two placers; gains the four facings and the facing preference |
| `lib/stripboard/seed-model.ts` | types and validation; **loses** `field-shares-a-strip`; `Ordering` gains an explicit map |
| `lib/stripboard/seed-parts.ts` | geometry derivation; gains the off-board kind and a non-vacuous row-axis guard |
| `lib/stripboard/seed.ts` | the API and the whole-board gate; its header's zero-cut claim must follow the change |
| `tests/stripboard/model/separable.test.ts` | **new.** Task 1's unit tests. |
| `tests/stripboard/model/pultec-capability.test.ts` | **new.** Task 8's milestone. |

---

### Task 1: The separability check both D2 and D3a use

**Files:**
- Create: `lib/stripboard/separable.ts`
- Create: `tests/stripboard/model/separable.test.ts`

**Interfaces:**
- Consumes: `Hole` from `./board.ts`; `holeKey` from `./cuts.ts`.
- Produces:
  - `interface StripContact { readonly column: number; readonly net: string; readonly owner: string }`
  - `interface Interleaving { readonly strip: number; readonly net: string; readonly columns: readonly number[]; readonly between: string }`
  - `function interleavingOn(strip: number, contacts: readonly StripContact[]): Interleaving | null`

**Why this is one check and not two.** Two pins of one part sharing a strip (D2's DIP) and two nets sharing a strip (D3a) are the same question: after `derivedCuts` cuts between adjacent runs of different nets, is every net still in one piece on that strip? A net is NOT separable when its contacts are interleaved with another net's — `A B A` along one strip leaves `A` in two runs that no cut list can rejoin.

**What this check does NOT claim.** Interleaving is not electrically illegal — a wire could rejoin the two runs. It is refused by the CONSTRUCTOR because the seed's join step joins a net's STRIPS, not two runs on one strip, so a seed that produced it would hand the search a board its own joiner cannot finish. `violationsOf` remains the authority on soundness and is unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test"
import { interleavingOn } from "../../../lib/stripboard/separable.ts"

const at = (column: number, net: string, owner: string) => ({ column, net, owner })

test("two nets in one run each are separable, because one cut parts them", () => {
  expect(interleavingOn(3, [at(0, "A", "R1.1"), at(1, "A", "R2.1"), at(4, "B", "R3.1")])).toBeNull()
})

test("a net interleaved with another is NOT separable, and the finding names both", () => {
  const found = interleavingOn(7, [at(0, "A", "R1.1"), at(2, "B", "R2.1"), at(5, "A", "R3.1")])
  expect(found).not.toBeNull()
  expect(found?.strip).toBe(7)
  expect(found?.net).toBe("A")
  expect(found?.columns).toEqual([0, 5])
  expect(found?.between).toBe("B")
})

test("one net alone on a strip is separable however many contacts it has", () => {
  expect(interleavingOn(0, [at(0, "A", "R1.1"), at(9, "A", "R2.1"), at(4, "A", "R3.1")])).toBeNull()
})

test("an empty strip is separable, and the predicate is not vacuous on it", () => {
  expect(interleavingOn(0, [])).toBeNull()
  expect(interleavingOn(0, [at(0, "A", "R1.1")])).toBeNull()
})
```

- [ ] **Step 2: Run it and read the failure**

Run: `bun test tests/stripboard/model/separable.test.ts`
Expected: FAIL — `Export named 'interleavingOn' not found`.

- [ ] **Step 3: Implement**

```ts
export function interleavingOn(
  strip: number,
  contacts: readonly StripContact[],
): Interleaving | null {
  const ordered = [...contacts].sort((a, b) => a.column - b.column)
  const seen = new Map<string, number[]>()
  let previous: string | undefined
  for (const contact of ordered) {
    if (contact.net !== previous) {
      const already = seen.get(contact.net)
      if (already !== undefined) {
        const between = previous
        if (between === undefined) {
          throw new Error(
            "stripboard-separable-run-without-predecessor: a net was found starting a second " +
              `run on strip ${strip} with no run before it, which the ordered walk makes ` +
              "impossible.\nThis is a defect in interleavingOn, not in the board. Nothing is " +
              "substituted: returning null here would report an interleaved strip as separable.",
          )
        }
        return { strip, net: contact.net, columns: [...already, contact.column], between }
      }
      seen.set(contact.net, [contact.column])
    }
    previous = contact.net
  }
  return null
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test tests/stripboard/model/separable.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Prove the predicate can fail**

Temporarily change `return { strip, ... }` to `return null`. Run the test; the interleaved case must go red by name. Restore. Record the output in your report — a check nobody has seen fail is a check nobody knows works.

- [ ] **Step 6: Commit**

```bash
git add lib/stripboard/separable.ts tests/stripboard/model/separable.test.ts
git commit -F /path/to/message.txt
```

---

### Task 2: A strip may host more than one net (D3a)

**Files:**
- Modify: `lib/stripboard/seed-place.ts` (`chooseColumn`, the workspace's `hosted`/`claimed` rules)
- Modify: `lib/stripboard/seed.ts` (its header's zero-cut claim)
- Test: `tests/stripboard/model/seed-room.test.ts`, plus a new fixture

**Interfaces:**
- Consumes: Task 1's `interleavingOn`.
- Produces: a workspace whose strips may carry several nets; no signature change to `seedsFrom`.

**The change.** `homeOf`/`scratchFree` enforce that a lead lands on its own net's home strip or on a scratch strip nothing else claims. Relax: a lead may land on any strip, provided the resulting contacts on that strip carry no interleaving by Task 1's check. Every candidate position is tested before it is ranked, beside the existing `routedUnderRigid` and `rigidOverlap` rejections.

**The prose that must follow.** `lib/stripboard/seed.ts`'s header states *"SO NO STRIP EVER CARRIES TWO NETS' LEADS, AND EVERY SEED THIS MODULE PRODUCES HAS ZERO CUTS"* as a structural property. After this task that is false. Rewrite it to say what is now true: a strip may carry several nets, cuts are derived, and the owner's preference for as few as possible is the OBJECTIVE's business — citing his 2026-10-15 correction, *"Zero cuts was never a requirement."* **Do not delete the old sentence silently; it is load-bearing context for why the module was built the way it was.**

- [ ] **Step 1: Write the failing test** — a board that only a shared strip can realise.

```ts
test("a strip carries two nets when nothing else will fit, and the cut is derived", () => {
  // Two nets, one strip of room: a 1 x 10 board with two two-lead parts whose
  // recorded span forbids reaching a second strip. Under one-net-per-strip this
  // refuses; with the strip shared it builds and `derivedCuts` returns one cut.
  const netlist = netlistOf([
    twoLead("R1", AXIAL, ["1", "A"], ["2", "A"]),
    twoLead("R2", AXIAL, ["1", "B"], ["2", "B"]),
  ])
  const seed = seedsFrom(netlist, { strips: 1, columns: 10 }, SPANS, [ordering("one", ["A", "B"], 1)])[0]
  if (seed === undefined) throw new Error("no seed built")
  const cuts = derivedCuts(seed, netlist.nets)
  expect(cuts.length, "one cut parts the two nets on the one strip").toBe(1)
  expect(violationsOf(seed, cuts, netlist.nets), "and the board is sound").toEqual([])
})
```

- [ ] **Step 2: Run it and read the failure**

Run: `bun test tests/stripboard/model/seed-room.test.ts`
Expected: FAIL — a `stripboard-seed-` refusal, because the second net has no strip.

- [ ] **Step 3: Implement** — in `chooseColumn`, after the existing rejections, reject a position whose contacts interleave:

```ts
const after = contactsOnStrip(workspace, hole.strip).concat(
  seated.filter(({ hole: h }) => h.strip === hole.strip)
    .map(({ lead, hole: h }) => ({ column: h.column, net: lead.net, owner: `${part.ref}.${lead.pin}` })),
)
if (interleavingOn(hole.strip, after) !== null) continue
```

- [ ] **Step 4: Run it and watch it pass**, then run the whole model directory.

Run: `bun test tests/stripboard/model/`
Expected: all pass, count up by one.

- [ ] **Step 5: Run the benchmark and REPORT, do not adjust**

Run: `bun test tests/stripboard/model/benchmark.test.ts`
Expected: 6 pass. **If any figure moved, stop and report it.** The gate is the regression net for this whole plan.

- [ ] **Step 6: Commit**

---

### Task 3: Delete `field-shares-a-strip` (D2, first half)

**Files:**
- Modify: `lib/stripboard/seed-model.ts:242-255` — remove the refusal and its `byAlong` bookkeeping
- Test: `tests/stripboard/model/seed.test.ts`

**Why it goes.** It refuses a field whose pins do not all have distinct `alongSteps`. A correctly quarter-turned DIP-16 puts pin 1 and pin 16 on one strip, separated by the cut down the middle — *"dips should span strips with a cut down the middle, like a breadboard"*. Task 1 now owns that question and answers it on the PLACED board rather than on the field. Leaving both would mean two rules for one thing, and the stale one refuses first.

**Seventeen refusal keys are asserted in `seed.test.ts`.** Removing one changes that list. Update it and say so; do not weaken the assertion to tolerate a missing key.

- [ ] **Step 1: Write the failing test**

```ts
test("a field with two pins on one strip is no longer refused outright", () => {
  // Two pins of DIFFERENT nets at the same alongSteps - the exact shape
  // `field-shares-a-strip` refused. It is now a placement question, not a field
  // question, so building the netlist must succeed.
  const part = fixedField("U1", SYNTHETIC_TWO_ROW, [
    { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
    { pin: "2", net: "B", alongSteps: 0, acrossSteps: 3 },
  ])
  expect(() => netlistOf([part])).not.toThrow()
  expect(refusalFrom(() => validateNetlist(netlistOf([part])))).toBe("")
})
```

- [ ] **Step 2: Run it and read the failure**

Expected: FAIL — `stripboard-seed-field-shares-a-strip`.

- [ ] **Step 3: Delete the refusal**, the `byAlong` map that feeds it, and the sentence in `SeedFieldPin`'s doc comment claiming every pin must have a distinct `alongSteps`. Replace that sentence with where the question now lives.

- [ ] **Step 4: Run the model tests**; update `seed.test.ts`'s refusal-key list to the real set.

- [ ] **Step 5: Commit**

---

### Task 4: Four facings for a moulded field (D2, second half)

**Files:**
- Modify: `lib/stripboard/seed-fit.ts:45` (`ACROSS_DIRECTIONS`) and `placeFixedField`
- Test: `tests/stripboard/model/seed-room.test.ts`

**Interfaces:**
- Consumes: `holeInFrame` from `./board.ts` — **the single owner of how a facing maps a frame offset to a hole, and it must stay so.** This task widens which facings are TRIED; it adds no second mapping.

**The facing preference, and why it is not a new criterion.** With four facings a part may land several ways. Prefer the facing that puts the part's pins on the MOST DISTINCT STRIPS — equivalently, the one forcing the fewest cuts of its own. This is structural, not a weighting: each pair of same-strip pins of different nets forces one cut, and a cut is the most expensive term in the owner's committed objective. Existing tie-breaks (joins, then direction order, then lowest strip) follow unchanged.

Measured, so the preference is checkable rather than asserted:

| footprint | pads | strips under S/N | strips under E/W | preferred |
| --- | --- | --- | --- | --- |
| `TO-92_Inline` | 3 | 3 | 1 | **S/N** |
| `PinHeader_1x05` | 5 | 1 | 5 | **E/W** |
| `DIP-16_W7.62mm` | 16 | 2 | 8 | **E/W** |

- [ ] **Step 1: Write the failing test**

```ts
test("a 1x5 header is laid ACROSS the strips, one pin per strip", () => {
  const netlist = committedHeaderNetlist()   // five nets, one PinHeader_1x05
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [ordering("h", NETS, 2)])[0]
  if (seed === undefined) throw new Error("no seed built")
  const header = seed.placements.find((p) => p.ref === "J1")
  if (header === undefined) throw new Error("the header was not placed")
  const strips = new Set([...header.pins.values()].map((h) => h.strip))
  expect(strips.size, "five pins on five strips").toBe(5)
})

test("a TO-92 keeps its three pins on three strips, so the preference did not invert", () => {
  // The regression guard for the facing preference: widening the facings must
  // not start laying a part that was already right along one strip.
  const seed = seedsFrom(TO92_NETLIST, STOCK, RECORDED_SPANS, [ordering("t", TO92_NETS, 2)])[0]
  if (seed === undefined) throw new Error("no seed built")
  const q = seed.placements.find((p) => p.ref === "Q1")
  if (q === undefined) throw new Error("the transistor was not placed")
  expect(new Set([...q.pins.values()].map((h) => h.strip)).size).toBe(3)
})
```

- [ ] **Step 2: Run it and read the failure**

Expected: FAIL — the header refuses, or lands with `strips.size === 1`.

- [ ] **Step 3: Implement** — `ACROSS_DIRECTIONS` becomes all four facings; `placeFixedField` enumerates them, computes each window's distinct-strip count, and ranks on it before the existing keys. **Rewrite the comment at `seed-fit.ts:35-44`**, which currently argues that only S and N may be used because a row along one strip is *"the open no cut list can close"*. That was true under one-net-per-strip and is not after Task 2 — say so, citing Task 2, rather than deleting the paragraph.

- [ ] **Step 4: Run the model tests and the benchmark.** Report any moved figure; do not adjust.

- [ ] **Step 5: Commit**

---

### Task 5: Make `parts-row-axis` able to fire (D2, third half)

**Files:**
- Modify: `lib/stripboard/seed-parts.ts:88-99`
- Test: `tests/stripboard/model/seed-room.test.ts`

**The defect.** The guard refuses a pattern whose `classification.axis !== "x"`, intending to catch a footprint whose pin rows run on an axis this module does not map. It never fires: `classifyPads` reports `axis: "x"` for a 1×N column, because N rows of one pad each decompose along x trivially. So it passes on exactly the footprints it exists to catch.

**The fix** is to read the derived pad holes rather than the claimed axis: if every pad shares one `xSteps`, the pattern has no measured along-pitch and the claim is unfounded. Refuse by name, or have `classifyPads` decline to claim an axis it did not measure. Either is acceptable — state which you chose and why.

- [ ] **Step 1: Write the failing test**

```ts
test("the row-axis guard fires on a footprint with no measured along-pitch", () => {
  // PinHeader_1x05: five pads, one distinct xSteps. classifyPads calls that
  // axis "x" and the old guard believed it.
  const pattern = PIN_PATTERNS.get("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical")
  if (pattern === undefined) throw new Error("the fixture footprint is not recorded")
  const pads = padHolesFor(pattern)
  expect(new Set(pads.map((p) => p.xSteps)).size, "the premise: one distinct xSteps").toBe(1)
  expect(unmeasuredAlongAxis(pattern), "and the guard sees it").toBe(true)
})
```

- [ ] **Step 2: Run it and read the failure.** Expected: FAIL — the helper does not exist.

- [ ] **Step 3: Implement**, and assert the negative too: `TO-92_Inline` (3 distinct `xSteps`) and `DIP-16_W7.62mm` (2) must NOT be flagged, or the guard is simply stricter rather than correct.

- [ ] **Step 4: Run the model tests.**

- [ ] **Step 5: Commit**

---

### Task 6: The off-board pad kind (D1)

**Files:**
- Modify: `lib/stripboard/seed-model.ts` (a third `SeedPart` member), `lib/stripboard/seed-parts.ts` (build it), `lib/stripboard/seed-fit.ts` (place it)
- Test: `tests/stripboard/model/seed-room.test.ts`

**Interfaces:**
- Produces: `interface OffBoardPart extends SeedPartBase { readonly kind: "off-board"; readonly lead: SeedLead }` — a one-hole terminal, no orientation, no body.
- `SeedPart` becomes `TwoLeadPart | FixedFieldPart | OffBoardPart`. **Every `switch` on `kind` must be revisited**; a `default` that silently ignores the new member is the defect this repository punishes hardest.

**The predicate is the declared residency, not a missing footprint.** `onBoard()` in `tools/stripboard/targets.ts` is the authority. `lib/stripboard/` may not import `tools/`, so residency arrives as DATA on the netlist the caller builds — the same way `rigid` and `body` already do. **A ref with no footprint and no off-board declaration keeps refusing by name**: turning missing physicalization data into apparently valid landing pads is the silent success this rule exists to prevent.

- [ ] **Step 1: Write the failing test**

```ts
test("a declared off-board control becomes a one-hole terminal", () => {
  const netlist = netlistOf([offBoard("RV_LO_BOOST", { pin: "2", net: "LO_BOOST_W" })])
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [ordering("p", ["LO_BOOST_W"], 1)])[0]
  if (seed === undefined) throw new Error("no seed built")
  const pad = seed.placements.find((p) => p.ref === "RV_LO_BOOST")
  if (pad === undefined) throw new Error("the pad was not placed")
  expect(pad.pins.size, "one hole").toBe(1)
})

test("a ref with no footprint and no off-board declaration still refuses by name", () => {
  expect(refusalFrom(() => seedPartsFrom(NETS_WITH_UNKNOWN_REF, new Map(), GEOMETRY)))
    .toStartWith("stripboard-seed-parts-no-footprint")
})
```

- [ ] **Step 2: Run it and read the failure.** Expected: FAIL — `stripboard-seed-parts-no-footprint` on the first test too.

- [ ] **Step 3: Implement.** Match `tools/stripboard/vero-import.ts`'s `padPlacementOf` and `OFF_BOARD_TERMINAL` so the imported and constructed representations of one physical object agree.

- [ ] **Step 4: Run the model tests and `bun test tests/stripboard/model/no-fork.test.ts`** — the boundary must hold.

- [ ] **Step 5: Commit**

---

### Task 7: Per-net strip assignment as a preference (D3b)

**Files:**
- Modify: `lib/stripboard/seed-model.ts` (`Ordering`, `homeStripsFor`), `lib/stripboard/seed-place.ts`
- Test: `tests/stripboard/model/seed.test.ts`

**Interfaces:**
- Produces: `Ordering` gains an optional explicit assignment:
  `{ readonly name: string; readonly nets: readonly string[]; readonly stride: number } | { readonly name: string; readonly homes: ReadonlyMap<string, number> }`
  `homeStripsFor` returns the given map unchanged when one is supplied, and derives from nets-plus-stride otherwise. The map form is what `tools/stripboard/seed-arrangement.ts`'s `assignStrips` already returns.

**A home strip is where a net STARTS, not where it is confined** — once Task 2 lets a strip carry several nets, exclusive ownership is incoherent. **The qualification is the repository's own invariant:** a deviation is admissible only when a HARD constraint forces it — reach, a taken hole, the board edge, a rigid area, an interleaving — and never because a position looked better. A placer free to leave its assignment on preference would be choosing its own criteria.

- [ ] **Step 1: Write the failing test**

```ts
test("an explicit net-to-strip map is used as given", () => {
  const homes = new Map([["A", 0], ["B", 7]])
  const seed = seedsFrom(netlistOf([twoLead("R1", AXIAL, ["1", "A"], ["2", "A"])]),
    { strips: 10, columns: 10 }, SPANS, [{ name: "explicit", homes }])[0]
  if (seed === undefined) throw new Error("no seed built")
  const r1 = seed.placements.find((p) => p.ref === "R1")
  if (r1 === undefined) throw new Error("R1 was not placed")
  expect([...r1.pins.values()].every((h) => h.strip === 0), "A's leads start on A's home").toBe(true)
})

test("a net missing from an explicit map refuses rather than defaulting to a strip", () => {
  const homes = new Map([["A", 0]])
  expect(refusalFrom(() => seedsFrom(TWO_NET_NETLIST, STOCK, SPANS, [{ name: "partial", homes }])))
    .toStartWith("stripboard-seed-net-has-no-home")
})
```

- [ ] **Step 2: Run it and read the failure.** Expected: FAIL — the ordering shape is not accepted.

- [ ] **Step 3: Implement.** Keep `stride`'s existing refusals for the stride form; add the missing-net refusal for the map form.

- [ ] **Step 4: Run the model tests and the benchmark.** Report any moved figure.

- [ ] **Step 5: Commit**

---

### Task 8: The milestone — low-boost produces a sound candidate

**Files:**
- Create: `tests/stripboard/model/pultec-capability.test.ts`
- Modify: whatever prose the earlier tasks left stale

**Interfaces:**
- Consumes: everything above, plus `deriveTargets` and `referenceNetsFor` from `tools/stripboard/` (a TEST may import `tools/`; the module under test may not).

**This milestone is model-level only and must be labelled so.** It proves the MODEL can represent a Pultec section. It does **not** prove the pipeline can produce a buildable Pultec layout — materialising low-boost is piece 2's first task. No report from this plan may claim otherwise.

- [ ] **Step 1: Write the failing test**

```ts
test("THE MILESTONE: pultec-low-boost produces a sound candidate", () => {
  const { netlist, nets } = lowBoostNetlist()
  expect(netlist.parts.length, "the premise: parts were built at all").toBeGreaterThan(0)
  const built = seedsFrom(netlist, STOCK, RECORDED_SPANS, lowBoostOrderings())
  const sound = built.filter((c) => violationsOf(c, derivedCuts(c, nets), nets).length === 0)
  expect(sound.length, "at least one ordering yields a sound board").toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run it and read the failure.** Record the refusal verbatim — it is the measurement this plan exists to move.

- [ ] **Step 3: Make it pass** using only what Tasks 1-7 built. **If it still refuses, STOP and report the refusal.** Do not add a fourth change to force it; an honest "the four changes were not sufficient, and here is what still blocks it" is the deliverable in that case, and the previous plan's honest null is what produced this design.

- [ ] **Step 4: Render the board and look at it.** Reuse the renderer at `tools/guide/render.ts`; convert with `rsvg-convert -z 3`. Say where you put it. A board nobody has looked at is not a result in this repository.

- [ ] **Step 5: Report the figures** — cuts, wires, bridges, `F`, extent, every net whole. **Predict nothing and adopt no figure as a target.**

- [ ] **Step 6: Run the full suite and the benchmark.** 2241+ pass / 0 fail; benchmark figures unmoved.

- [ ] **Step 7: Commit**

---

## Self-Review

**Spec coverage.** D1 is Task 6. D2 is Tasks 3, 4 and 5. D3a is Task 2. D3b is Task 7. The shared purely-electrical validation is Task 1, consumed by Tasks 2 and 4. The milestone is Task 8. The prose corrections the spec requires are folded into the task that invalidates each claim — Task 2 for `seed.ts`'s zero-cut header, Task 4 for `seed-fit.ts`'s facing argument, Task 3 for `SeedFieldPin`'s distinct-`alongSteps` sentence — rather than collected into a cleanup task nobody reviews.

**Placeholder scan.** No "TBD", no "handle edge cases". Task 5 leaves a genuine choice open (guard in `seed-parts.ts` versus `classifyPads` declining to claim an axis) and names both options with the requirement to state which was taken and why; that is a decision for the implementer with the code in front of them, not a placeholder.

**Type consistency.** `StripContact`/`Interleaving`/`interleavingOn` are defined in Task 1 and consumed by Tasks 2 and 4 under those names. `OffBoardPart` is defined in Task 6 and widens `SeedPart`, which Tasks 3, 4 and 7 also touch — Task 6 is deliberately ordered after them so the union widens once, late, with every `kind` switch already in its final shape.

**Ordering.** 1 gates 2 and 4; 3 gates 4 (a rotated DIP is refused by the stale field rule until 3 lands); 2 gates 4's facing preference (a row along one strip is only admissible once strips may be shared); 8 gates nothing and needs all of them.
