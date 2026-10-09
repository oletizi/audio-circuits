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
  // THE SPEC'S "Frequency contract" ACCEPTANCE ROW, and this is the only test standing
  // for it. An earlier version asserted `SCAFFOLD_FLAT` equals `REFERENCE_FLAT`, which
  // CANNOT FAIL: `circuits/pultec/scaffold.ts` defines the one AS the other, so it
  // compared an object to itself. Up to 3.71 dB rides on the claim, so it is asserted
  // three ways that can each actually break.

  // 1. The settings are the ones the design doc's measurements were taken at, written
  // out rather than referenced. Change either constant and this fails.
  expect(SCAFFOLD_FLAT).toEqual({
    loFrequency: "100Hz",
    hiFrequency: "5kHz",
    midFrequency: "1kHz",
    midMode: "boost",
  })
  expect(REFERENCE_FLAT).toEqual(SCAFFOLD_FLAT)

  // 2. Each stand-in the BOARD is built from carries that same state as its own
  // declared `flat`, so the setting travelling with the data agrees with the board's.
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)
  for (const section of SECTIONS) {
    expect(standIns[section]!.flat, section).toEqual(SCAFFOLD_FLAT)
  }

  // 3. The board's parts really are the ones derived AT that state, and not at
  // another: derive the stand-ins at a different mid frequency and the board must stop
  // matching. Without this the first two assertions only check a label. Mid is the
  // selector to move, not the low one - after the reduction every low-selector
  // capacitor is inert (each sits across `RV_LO_BOOST`'s 0R arm or on an open throw),
  // so moving `loFrequency` changes no surviving value and would make a vacuous test.
  const elsewhere = allStandIns(modules, { ...SCAFFOLD_FLAT, midFrequency: "500Hz" })
  const valuesAt = (all: ReturnType<typeof allStandIns>): string =>
    JSON.stringify(SECTIONS.map((s) => all[s]!.components.map((c) => [c.id, c.parameters])))
  expect(valuesAt(elsewhere)).not.toBe(valuesAt(standIns))
  const boardValues = new Map(
    pultecScaffold().components.map((component) => [component.id, component.parameters]),
  )
  for (const section of SECTIONS) {
    for (const component of standIns[section]!.components) {
      expect(boardValues.get(component.id), `${section}: ${component.id}`)
        .toEqual(component.parameters)
    }
  }
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

test("every removable link's stub net belongs ONLY to this stand-in's own components", () => {
  // A stub net is private to the ONE isolation point that introduced it - nothing on
  // the rest of the board, and no OTHER section's stand-in, ever touches it. It may,
  // however, be held by more than one of THIS stand-in's own components: a net can be
  // touched by more than one component before isolation (mid's `R_MID_BOOST.a` and
  // `R_MID_SHUNT.a` both land on `in`), and isolating that net means rewiring EVERY
  // such touch to the SAME stub, not just the one the isolation point happens to name -
  // see the next test, and `circuits/pultec/scaffold.ts`'s `isolate()` for why a
  // version that rewired only the named touch was a real defect rather than a style
  // choice.
  //
  // THE "ONLY" IS WHAT THIS ASSERTS. An earlier version checked `holders.length >= 1`,
  // which is a tautology: `isolate()` throws on an isolation point that matched no pin,
  // so a stub with no holder cannot reach this test. Two stubs sharing a holder, or a
  // stub reaching another section's stand-in or the terminal block, is the failure that
  // matters - it would let one link cut, or fail to cut, a leg it does not own.
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)
  const ownerOf = new Map<string, string>()
  for (const section of SECTIONS) {
    for (const component of standIns[section]!.components) ownerOf.set(component.id, section)
  }
  const board = pultecScaffold()
  const links = board.components.filter((component) => component.kind === "switch")
  for (const link of links) {
    const stubPin = link.units[0]!.pins["1"]
    if (stubPin === undefined || stubPin.kind !== "net") throw new Error(`${link.id}: pin "1" is not a net`)
    const stub = stubPin.net
    const holders = board.components.filter(
      (component) => component.id !== link.id && componentNets(component).includes(stub),
    )
    // The link belongs to exactly one stand-in; recovered from `StandIn.section`
    // rather than by parsing the link's id.
    const sections = new Set(holders.map((holder) => ownerOf.get(holder.id)))
    expect(
      [...sections].sort(),
      `${link.id}: stub net ${stub} is held by ${holders.map((h) => h.id).join(", ")}`,
    ).toHaveLength(1)
    expect([...sections][0], `${link.id}: stub net ${stub} reaches a non-stand-in component`)
      .toBeDefined()
    // And no OTHER link shares it: one stub, one link.
    const otherLinks = links.filter(
      (other) => other.id !== link.id && componentNets(other).includes(stub),
    )
    expect(otherLinks.map((other) => other.id), `${link.id}: stub net ${stub}`).toEqual([])
  }
  // Non-vacuous: every link was actually examined.
  expect(links.length).toBeGreaterThan(0)
})

test("isolating a net cuts EVERY touch of it within the stand-in, not just one", () => {
  // The defect this guards against: mid's `R_MID_SHUNT.a` and low-cut's and
  // low-boost's multiply-touched nets each sit on the SAME real net as a sibling
  // component within the same stand-in. Rewiring only the isolation point's own named
  // (component, terminal) - as an earlier version of `isolate()` did - leaves the
  // sibling permanently wired to the real net regardless of the link's position, which
  // is a stray load on the real circuit that the link can never remove. After
  // isolation, NONE of a stand-in's own components may still carry the isolated net.
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)
  const board = pultecScaffold()
  const byId = new Map(board.components.map((component) => [component.id, component]))
  for (const section of SECTIONS) {
    const standIn = standIns[section]!
    for (const point of standIn.isolation) {
      for (const original of standIn.components) {
        const onBoard = byId.get(original.id)
        if (onBoard === undefined) {
          throw new Error(`${section}: stand-in component "${original.id}" is missing from the scaffold board`)
        }
        expect(componentNets(onBoard), `${section}: ${original.id} after isolating "${point.net}"`)
          .not.toContain(point.net)
      }
    }
  }
})
