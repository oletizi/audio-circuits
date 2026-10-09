/**
 * The scaffold board (`circuits/pultec/scaffold.ts`) and its committed derived
 * artifact (`circuits/pultec/generated/scaffold.json`).
 *
 * THE ARTIFACT-SYNC TEST IS READ-ONLY, DELIBERATELY. `tests/perfboard/wiring-sync.
 * test.ts` carries the lesson this follows: an earlier version of a test like this
 * called the WRITING function, which quietly repaired a stale fixture and then
 * passed about the state it had just rewritten - so a run against a genuinely
 * drifted artifact would still look green. This test calls only
 * `freshScaffoldArtifact()`, which computes content and touches no file, and
 * compares it against what is already on disk.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import { freshScaffoldArtifact, SCAFFOLD_JSON } from "../../tools/pultec/scaffold-sync.ts"
import { pultecScaffold, SCAFFOLD_FLAT, TERMINAL_BLOCK_5 } from "../../circuits/pultec/scaffold.ts"
import { allStandIns, REFERENCE_FLAT } from "../../lib/board/scaffold/index.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import { OFF_BOARD } from "../../circuits/pultec/off-board.ts"
import { physicalOnly, assertElectricallyTransparent } from "../../lib/board/physicalize.ts"
import { componentNets } from "../../lib/model/topology.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

test("the committed scaffold.json equals what the derivation produces right now", () => {
  const committed = fs.readFileSync(SCAFFOLD_JSON, "utf8")
  expect(freshScaffoldArtifact()).toBe(committed)
})

test("the scaffold emulates the same flat state every design figure was measured at", () => {
  // Up to 3.71 dB rides on this per the design doc, so it is asserted directly
  // rather than only indirectly through the artifact comparison above.
  expect(SCAFFOLD_FLAT).toEqual(REFERENCE_FLAT)
})

test("every stand-in's isolation points are realised as exactly that many links", () => {
  // Derived, not hardcoded: the design doc states the per-section counts (1, 1, 1,
  // 2, 2 - seven total) as what the derivation currently yields, not as a target to
  // assert against directly. This checks the board against the SAME derivation
  // instead, so a future change to the electrical model cannot silently desync the
  // board from the rule that builds it.
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)
  const expectedLinks = SECTIONS.reduce((sum, section) => sum + standIns[section]!.isolation.length, 0)
  const board = pultecScaffold()
  const links = board.components.filter((component) => component.kind === "switch")
  expect(links.length).toBe(expectedLinks)
  expect(expectedLinks).toBeGreaterThan(0)
})

test("every link is a two-position fitted/removed switch, matching the jumper pattern", () => {
  const board = pultecScaffold()
  for (const link of board.components.filter((component) => component.kind === "switch")) {
    expect(link.parameters, link.id).toEqual({
      positions: ["fitted", "removed"],
      contacts: { fitted: [["1", "2"]], removed: [] },
    })
    expect(Object.keys(link.units[0]!.pins).sort(), link.id).toEqual(["1", "2"])
    expect(link.part?.footprint, link.id).toBeDefined()
    expect(link.part?.symbol, link.id).toBeDefined()
  }
})

test("only the terminal block is physical-only, and it is electrically transparent", () => {
  const board = pultecScaffold()
  const physicalOnlyComponents = board.components.filter(physicalOnly)
  expect(physicalOnlyComponents.map((c) => c.id)).toEqual(["scaffold_terminals"])
  assertElectricallyTransparent(physicalOnlyComponents[0]!)
  expect(physicalOnlyComponents[0]!.part?.footprint).toBe(TERMINAL_BLOCK_5)
})

test("every stand-in component and every link conducts - none is physical-only", () => {
  // The ruling this task carries: a fitted link conducts, so it is an ordinary
  // component, not physicalOnly. Confusing the two would hide real conduction from
  // every equivalence check built on projectPhysical.
  const board = pultecScaffold()
  for (const component of board.components) {
    if (component.id === "scaffold_terminals") continue
    expect(physicalOnly(component), component.id).toBe(false)
  }
})

test("every on-board passive has a footprint; the off-board inductor has a symbol, no footprint", () => {
  const board = pultecScaffold()
  for (const component of board.components) {
    if (component.kind === "switch" || component.kind === "connector") continue
    if (OFF_BOARD.has(component.id)) {
      expect(component.part?.footprint, component.id).toBeUndefined()
      expect(component.part?.symbol, component.id).toBeDefined()
    } else {
      expect(component.part?.footprint, component.id).toBeDefined()
    }
  }
})

test("the board's ports are exactly the union of every stand-in's boundary nets", () => {
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)
  const expected = new Set<string>()
  for (const section of SECTIONS) for (const net of standIns[section]!.boundary) expected.add(net)
  const board = pultecScaffold()
  expect(Object.keys(board.ports).sort()).toEqual([...expected].sort())
  expect(Object.keys(board.ports)).toEqual(Object.values(board.ports))
})

test("the terminal block lands a pin on every one of the board's ports, ground last", () => {
  const board = pultecScaffold()
  const block = board.components.find((c) => c.id === "scaffold_terminals")
  if (block === undefined) throw new Error("scaffold_terminals is missing")
  const pinNets = componentNets(block)
  expect(pinNets[pinNets.length - 1]).toBe("0")
  expect([...pinNets].sort()).toEqual(Object.keys(board.ports).sort())
})

test("every removable link's stub net is reachable from exactly one stand-in component", () => {
  // Isolation is meant to leave the stand-in's branch hanging by one point when the
  // link is removed - so the stub net the link's far pad lands on must belong to
  // only the one component the isolation point named, never shared with anything
  // else on the board.
  const board = pultecScaffold()
  const links = board.components.filter((component) => component.kind === "switch")
  for (const link of links) {
    const stubPin = link.units[0]!.pins["1"]
    if (stubPin === undefined || stubPin.kind !== "net") throw new Error(`${link.id}: pin "1" is not a net`)
    const stub = stubPin.net
    const holders = board.components.filter(
      (component) => component.id !== link.id && componentNets(component).includes(stub),
    )
    expect(holders.length, `${link.id}: stub net ${stub}`).toBe(1)
  }
})
