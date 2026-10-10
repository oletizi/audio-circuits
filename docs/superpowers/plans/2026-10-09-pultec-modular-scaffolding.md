# Pultec Modular Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the scaffolding onto each Pultec section board so one board, configured at build time by which parts are populated, either stands alone or joins a stack of others over a shared bus.

**Architecture:** The stand-in derivation is unchanged and stays the foundation. What changes is physical: every section board's physicalization gains the other four sections' stand-in positions and a 2x05 stacking junction carrying all five ladder nets; the removable-link mechanism and the separate scaffold board are deleted; a supplier rule assigns each absent section's group to exactly one present board.

**Tech Stack:** TypeScript on Bun, `lib/model`'s resolution layer, ngspice through `lib/sim`, VeroRoute through the perfboard workflow.

**Spec:** `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`

## Global Constraints

- **No fallbacks, no mock data outside tests.** A missing part, an unresolvable boundary, an absent control setting or an unknown section throws, naming what is missing and why it is not defaulted.
- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`. `Reflect.get` returns `any` — prefer a narrowing predicate.
- **Files 300-500 lines maximum.**
- **Imports are explicit relative paths with the file extension.**
- **Component ids are semantic**, never reference designators.
- **Derived artifacts are regenerated every run and compared by content**, never by timestamp. Any sync test is READ-ONLY and must not call the writing function.
- **A skipped check must never look like a passing one.**
- **Supersede means delete.** A replaced mechanism is removed in the same change, not left as a stub. Where prose must record what was superseded, say so in a comment; do not keep dead code.
- **`pruneFloatingBranches` is forbidden in scaffold derivation.**
- **Ideal shorts are components in the output, never node merges.** Liveness is decided on electrical nodes; containment is not.
- Commit after each task. **Never add AI attribution to commit messages.** Do not use `sed` for writes. No `#` inside bash heredocs or multi-line quoted bash arguments. Do not use `git stash` — the stack is shared across worktrees; use a WIP commit.

## THE CRUX: one layout, many networks

This is the thing an implementer will get wrong, so it is settled here.

"One layout per board, configured by populating parts" means **two different artifacts, and they are checked against different things**:

- **The layout file** (`boards/pultec-<section>/*.perfboard.vrt`) holds EVERY position: the section's own parts, all four stand-in groups, and the junction. It never varies by configuration. `make check` verifies it against the **maximal network** — the standalone configuration, where all four groups are populated — because that is the only configuration in which every placed part is in circuit.
- **The per-configuration network** is what a given build realises. It is the maximal network minus the groups that build does not populate. These are verified in the MODEL by Gate B's 31 combinations; no layout is involved.

So: `physicalBoard(section)` returns the maximal network for layout checking. `boardNetwork(section, present)` returns the network for one configuration. A build's omitted parts are an action at the bench, not an edit to the layout.

Do not try to make the layout vary. Do not check a layout against a partial configuration.

## Facts established against the code

- `lib/board/scaffold/index.ts` exports `standIn(section, modules, flat)` and `allStandIns(modules, flat)`. `StandIn` currently carries `{ section, flat, boundary, components, isolation }` — the `isolation` field is being removed by Task 2.
- `StandIn.components` are `ResolvedComponent`s: `units[].pins` are **net-name strings**. Putting one into a `Network` means wrapping each as `{ kind: "net", net }`. A working conversion with the correct package-pins guard exists in `tests/pultec/scaffold-composition.test.ts`'s `asComponent`.
- **`connectedGroups` lives in `lib/board/scaffold/isolate.ts` and `admittance.ts` imports it.** `isolate.ts` cannot simply be deleted; the function must move first (Task 2).
- `lib/board/scaffold/shorts.ts` exports `nodesOf` and `electricalNodes` (union-find over ideal shorts, lexicographic-min representative).
- `circuits/pultec/physical/parts.ts` builds `board_terminals` at line ~191 with `Connector_Generic:Conn_01x03` and `TERMINAL_BLOCK_3` (line ~93), `electricallyInert: true`. `physicalizedBoard(owner, crossingNets)` is at ~157.
- Verified on disk: `Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical`, and `Connector_Generic:Conn_02x05_Odd_Even`.
- The five sections' canonical ladder order is hi-boost, hi-cut, low-cut, low-boost, mid.
- Current suite: 734 pass. `make check` fails on four unrouted Pultec boards plus transistor-preamp-lab, both pre-existing.

## File Structure

```
lib/board/scaffold/shorts.ts      gains connectedGroups (moved from isolate.ts)
lib/board/scaffold/isolate.ts     DELETED
lib/board/scaffold/supplier.ts    canonical order and supplier assignment
lib/board/scaffold/wiring.ts      rewritten: population and junction instructions
circuits/pultec/physical/parts.ts junction becomes the 2x05 bus; stand-in positions
circuits/pultec/physical/*.ts     each section gains the other four groups
circuits/pultec/scaffold.ts       DELETED
tests/board/scaffold-isolate.test.ts   DELETED
tests/pultec/scaffold-board.test.ts    DELETED
tests/board/scaffold-oracle.test.ts    NEW: independent liveness oracle
tests/board/scaffold-partition.test.ts NEW: short-circuit partition property
```

---

### Task 1: The junction becomes a 2x05 stacking bus

**Files:** Modify `circuits/pultec/physical/parts.ts`; Test `tests/pultec/partition.test.ts` or the nearest existing physicalization test; the five `boards/pultec-*/wiring.md` are regenerated.

**Interfaces:** Produces `HEADER_1X05`, and `junctionComponents(): readonly [Component, Component]` replacing the `board_terminals` construction.

**AS EXECUTED, NOT AS WRITTEN BELOW.** This task was planned around one `HEADER_2X05` and a single `junctionComponent()`, and neither exists: the pinned VeroRoute fork's `Src/CompTypes.h` has no two-row shape at 2.54 mm row pitch, so the one 2x05 pin field is modelled as two `PinHeader_1x05_P2.54mm_Vertical` rows declared to be rows of one part (`part.pinField`). The hardware is unchanged - one 2x05 long-tail stacking header - and the generated guide says so. The illustrative test code in the steps below still names the single component; the ruling is in the progress ledger's Task 1 entry and the reasoning is now in the spec's junction section, which is the authority.

- [ ] **Step 1: Write the failing test**

```ts
test("every board's junction carries all five ladder nets with interleaved grounds", () => {
  const junction = junctionComponent()
  expect(junction.part?.footprint).toBe("Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical")
  expect(junction.part?.symbol).toBe("Connector_Generic:Conn_02x05_Odd_Even")
  const pins = junction.units[0]!.pins
  const netAt = (pin: string): string => {
    const connection = pins[pin]
    if (connection === undefined || connection.kind !== "net") {
      throw new Error(`junction pin ${pin} is not on a net`)
    }
    return connection.net
  }
  expect([netAt("1"), netAt("3"), netAt("5"), netAt("7"), netAt("9")])
    .toEqual(["in", "hi_boost_out", "lo_boost_in", "out", "0"])
  for (const even of ["2", "4", "6", "8", "10"]) expect(netAt(even), even).toBe("0")
})

test("the junction is electrically inert, so projectPhysical keeps its guarantee", () => {
  expect(junctionComponent().part?.electricallyInert).toBe(true)
})

test("no board models its junction as a terminal block any more", () => {
  // TERMINAL_BLOCK_3 was 5.08mm and asserted a connector type. The 2x05 asserts
  // holes and nets, so ribbon, leads, direct solder or a stacking header are all
  // build-time choices on one pattern.
  const source = readFileSync("circuits/pultec/physical/parts.ts", "utf8")
  expect(source).not.toContain("TERMINAL_BLOCK_3")
  expect(source).not.toContain("TerminalBlock_Phoenix")
})
```

- [ ] **Step 2: Run it, confirm it fails.** `bun test tests/pultec/`
- [ ] **Step 3: Implement.** Replace `TERMINAL_BLOCK_3` and the `board_terminals` construction. The pinout is fixed and identical on every board — that uniformity is what makes the bus work. Delete the old constant rather than leaving it unused.
- [ ] **Step 4: Regenerate the five guides.** `make check` rewrites `boards/pultec-*/wiring.md` on drift; the junction section changes on all five. Commit the regenerated guides.
- [ ] **Step 5: Run** `bun test && bun run typecheck`, confirm `make check`'s red set is unchanged, **commit.**

---

### Task 2: Retire isolation

**Files:** Modify `lib/board/scaffold/shorts.ts`, `admittance.ts`, `index.ts`; Delete `lib/board/scaffold/isolate.ts` and `tests/board/scaffold-isolate.test.ts`; regenerate `circuits/pultec/generated/scaffold.json`.

**Interfaces:** `connectedGroups` moves to `shorts.ts` unchanged. `StandIn` loses `isolation`; `IsolationPoint` disappears.

- [ ] **Step 1: Move `connectedGroups` into `shorts.ts`** beside `nodesOf` — both are graph utilities over resolved components — and repoint `admittance.ts`'s import. Keep its tests, moved to whichever file now covers `shorts.ts`.
- [ ] **Step 2: Delete** `isolate.ts`, `tests/board/scaffold-isolate.test.ts`, the `isolation` field on `StandIn`, and `isolationPoints`' call in `index.ts`. In `index.ts` record in one sentence why no isolation points are returned: placement replaced the links, so a group that is not fitted needs no leg broken.
- [ ] **Step 3: Regenerate** `circuits/pultec/generated/scaffold.json` through the existing sync tool and commit the smaller artifact.
- [ ] **Step 4:** The read-only freshness test must still pass. Confirm it does not call the writing function.
- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 3: Supplier assignment

**Files:** Create `lib/board/scaffold/supplier.ts`; Test `tests/board/scaffold-supplier.test.ts`.

**Interfaces:**
- `LADDER_ORDER: readonly string[]` — `["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"]`
- `suppliers(present: ReadonlySet<string>): ReadonlyMap<string, string>` — absent section to the board that fits its group.

- [ ] **Step 1: Write the failing test**

```ts
test("standalone, the one present board supplies every absent group", () => {
  const assigned = suppliers(new Set(["low-boost"]))
  expect([...assigned.keys()].sort()).toEqual(["hi-boost", "hi-cut", "low-cut", "mid"])
  for (const board of assigned.values()) expect(board).toBe("low-boost")
})

test("the first present board in ladder order supplies each absent group", () => {
  const assigned = suppliers(new Set(["hi-cut", "low-boost"]))
  for (const board of assigned.values()) expect(board).toBe("hi-cut")
})

test("a present section is never assigned a stand-in for itself", () => {
  const assigned = suppliers(new Set(["hi-cut", "low-boost"]))
  expect(assigned.has("hi-cut")).toBe(false)
  expect(assigned.has("low-boost")).toBe(false)
})

test("all five present means no groups at all", () => {
  expect(suppliers(new Set(LADDER_ORDER)).size).toBe(0)
})

test("the assignment does not depend on iteration order of the input", () => {
  const forwards = suppliers(new Set(["mid", "hi-cut"]))
  const backwards = suppliers(new Set(["hi-cut", "mid"]))
  expect([...forwards.entries()].sort()).toEqual([...backwards.entries()].sort())
})

test("adding a board EARLIER in the order moves the assignment, and that is documented", () => {
  // The consequence the spec states: no derivable rule avoids it, because
  // "whichever board you built first" is not a property of the circuit.
  expect(suppliers(new Set(["low-boost"])).get("hi-cut")).toBe("low-boost")
  expect(suppliers(new Set(["hi-boost", "low-boost"])).get("hi-cut")).toBe("hi-boost")
})

test("an empty build refuses rather than returning an empty assignment", () => {
  expect(() => suppliers(new Set())).toThrow(/at least one/)
})

test("an unknown section name refuses, naming the known ones", () => {
  expect(() => suppliers(new Set(["nope"]))).toThrow(/nope/)
})
```

- [ ] **Step 2: Run it, confirm it fails.**
- [ ] **Step 3: Implement.** The module comment must state why the ordering is fixed and legible rather than clever: the bus makes the choice electrically free, so the ordering only has to be stable. Record the add-earlier consequence.
- [ ] **Step 4: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 4: Delete the separate scaffold board

**Files:** Delete `circuits/pultec/scaffold.ts` and `tests/pultec/scaffold-board.test.ts`; modify `tools/pultec/scaffold-sync.ts`, `make/pultec.mk`, root `Makefile` as needed; `lib/board/scaffold/wiring.ts` loses its import.

- [ ] **Step 1:** Decide and record whether `scaffold.json` and its `pultec-scaffold-agrees` guard survive. They should: the artifact records the DERIVATION, which is still the thing that must not drift, and the sync tool's comment already says it does not cover board wiring. Keep both; only the board goes.
- [ ] **Step 2: Delete** the board module and its test. Repoint anything that imported it.
- [ ] **Step 3: Run** `bun test && bun run typecheck`, confirm `make check` still runs `pultec-scaffold-agrees` clean, **commit.**

---

### Task 5: Stand-in positions on each section board

**Files:** Modify `circuits/pultec/physical/parts.ts` and the five `circuits/pultec/physical/<section>.ts`; Test `tests/pultec/scaffold-boards.test.ts`.

**Interfaces:**
- `physicalBoard(section: string): Network` — the MAXIMAL network: own parts, all four other groups, the junction. This is what a layout is checked against.
- `boardNetwork(section: string, present: ReadonlySet<string>): Network` — one configuration: own parts, plus only the groups this board supplies per Task 3, plus the junction.

Re-read **THE CRUX** above before writing either.

- [ ] **Step 1: Write the failing test**

```ts
test("the maximal network holds every stand-in group, for the layout to be checked against", () => {
  const maximal = physicalBoard("low-boost")
  const standIns = allStandIns(partitionReference().modules, REFERENCE_FLAT)
  for (const section of ["hi-boost", "hi-cut", "low-cut", "mid"]) {
    for (const component of standIns[section]!.components) {
      expect(maximal.components.some((c) => c.id.includes(component.id)), `${section}/${component.id}`)
        .toBe(true)
    }
  }
})

test("a configuration holds only the groups this board supplies", () => {
  // low-boost with hi-boost also built: hi-boost supplies the absent groups, so
  // low-boost's own network carries none of them.
  const network = boardNetwork("low-boost", new Set(["hi-boost", "low-boost"]))
  const standIns = allStandIns(partitionReference().modules, REFERENCE_FLAT)
  for (const component of standIns["mid"]!.components) {
    expect(network.components.some((c) => c.id.includes(component.id)), component.id).toBe(false)
  }
})

test("standalone, the board carries all four groups", () => {
  const network = boardNetwork("low-boost", new Set(["low-boost"]))
  const kinds = network.components.filter((c) => c.kind === "inductor")
  // mid's 1H tap is the only inductor in the whole scaffolding, and standalone
  // low-boost needs mid's group, so it must be here.
  expect(kinds).toHaveLength(1)
})

test("every stand-in part on a board is an ordinary conducting component", () => {
  // NOT physicalOnly. Only the junction is inert. The section boards keep
  // assertElectricallyTransparent's guarantee untouched because nothing claims it.
  const maximal = physicalBoard("low-boost")
  for (const component of maximal.components) {
    if (component.id === "board_junction") continue
    expect(component.part?.electricallyInert ?? false, component.id).toBe(false)
  }
})

test("the maximal network of every section validates", () => {
  for (const section of LADDER_ORDER) expect(() => physicalBoard(section), section).not.toThrow()
})
```

- [ ] **Step 2: Run it, confirm it fails.**
- [ ] **Step 3: Implement.** Stand-in component ids must be prefixed by the section they stand in for, so a board carrying hi-cut's `C26` and its own parts has no collision and the guide can label the group. Values come from `allStandIns`, never transcribed.
- [ ] **Step 4: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 6: Population and junction instructions in the guide

**Files:** Rewrite `lib/board/scaffold/wiring.ts`; modify `lib/board/wiring.ts`'s optional field; rewrite `tests/board/scaffold-wiring.test.ts`.

- [ ] **Step 1: Write the failing test.** For a given configuration the guide must state, per board: which groups to populate, which to leave empty, which board supplies each absent section, which junction pins to wire, and the emulated frequency setting. A group spanning more than one part must list every part under the group's name, so a half-populated group reads as obviously incomplete. Assert the instructions against the generated network's connectivity, not against the derivation restated.
- [ ] **Step 2: Implement.** Delete the link-entry derivation; it has no mechanism left. Keep the register of the existing guide sections — somebody holding a bag of parts reads this.
- [ ] **Step 3: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 7: The independent liveness oracle, as a standing test

**Files:** Create `tests/board/scaffold-oracle.test.ts`.

The acceptance row this closes: subset membership is too weak, because a reduction that wrongly DROPS a live component is still a subset. Asserting the liveness predicate against itself is circular, so the oracle must be written **without reference to the production implementation** — a brute-force search for a simple path between two distinct boundary electrical nodes through each component.

- [ ] **Step 1: Write the oracle from the definition**, not from `reduce.ts`. Do not import anything from `reduce.ts` beyond the function under test. Depth-first enumeration of simple paths is adequate at these sizes.
- [ ] **Step 2: Agree with `reduceToBoundary`** on every component of all five sections, and on randomised networks containing ideal shorts, parallel edges and self-loops — at least a few thousand, seeded so a failure is reproducible, and the seed printed on failure.
- [ ] **Step 3: Prove the oracle can disagree.** Feed it a deliberately wrong reduction (one live component dropped, one inert component kept) and assert it catches each. An oracle that cannot disagree is decoration.
- [ ] **Step 4: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 8: The short-circuit partition property

**Files:** Create `tests/board/scaffold-partition.test.ts`.

Generalises low-cut's exemption from numerical comparison into a property of the verifier.

- [ ] **Step 1: Write the test.** For every section, the stand-in and the original flat section must induce the **same partition of boundary nets into short-circuit equivalence classes**, using `electricalNodes` from `shorts.ts`. Assert the partitions equal as sets of sets, not merely the same class count.
- [ ] **Step 2: Derive low-cut's exemption from it rather than asserting it separately.** Its two boundary nets fall in one class, so no finite admittance exists between them; assert that the guard refuses for exactly the sections whose boundary collapses to one class, and compares for the others — computed from the partition, not from a hardcoded list naming low-cut.
- [ ] **Step 3: Run** `bun test && bun run typecheck`, **commit.**

---

### Task 9: Reframe the integration gate

**Files:** Modify `tests/pultec/scaffold-integration.test.ts`.

- [ ] **Step 1:** Replace the "every link removed" premise with "no stand-in group populated on any board". With all five sections built, each board's configuration network is its own parts plus the junction, so the composed network must be strictly equivalent to `THREE_BAND_REFERENCE` — exact, both properties as before: every stand-in-originated component absent, and the live subgraph matching by id, kind, parameters and nets.
- [ ] **Step 2:** Keep the derived boundary from the previous revision — every net not carrying the test's scaffold prefix — and keep the can-fail test that reconstructs a leak and requires the gate to catch it.
- [ ] **Step 3:** State in the header comment that this is the S0-model half, and that the S0-physical half waits on five redrawn layouts.
- [ ] **Step 4: Run** `bun test && bun run typecheck`, confirm `make check`'s red set is unchanged, **commit.**

---

## What this plan does NOT deliver

**S0-physical.** Every VeroRoute layout must be redrawn: low-boost's is stale twice over — nine parts where the board now needs roughly twenty-two, and a 5.08 mm terminal block where the junction is a 2x05 — and the other four were never drawn. Placing and routing is the human designer's work. Until those exist, the layout-derived Integration check cannot run, and this plan's completion is **S0-model only**.
