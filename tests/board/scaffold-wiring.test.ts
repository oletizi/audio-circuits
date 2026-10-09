/**
 * The scaffold board's "Scaffold links" wiring-guide section
 * (`lib/board/scaffold/wiring.ts`), verified against the real scaffold `Network`.
 *
 * THE VERIFICATION CLAIM IS NARROWER THAN "verify the guide against the layout" -
 * there is no VeroRoute layout for this board yet (that is the owner's work, and the
 * layout-derived comparison is a later gate). What IS checked here: the guide's link
 * instructions agree with the CONNECTIVITY OF THE GENERATED `Network` - every link
 * `scaffoldLinkEntries` reports really is a fitted/removed switch on the board, really
 * joins the stub net its named component's terminal currently carries to the real net
 * its isolation point names, and nothing is recovered by parsing a link's own id.
 */
import { test, expect } from "bun:test"
import { wiringDocument } from "../../lib/board/wiring.ts"
import { scaffoldLinkEntries, scaffoldLinksSection } from "../../lib/board/scaffold/wiring.ts"
import { pultecScaffold, SCAFFOLD_FLAT } from "../../circuits/pultec/scaffold.ts"
import { allStandIns } from "../../lib/board/scaffold/index.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import { OFF_BOARD } from "../../circuits/pultec/off-board.ts"
import type { Component, Connection } from "../../lib/model/types.ts"
import type { WiringInput } from "../../lib/board/wiring.ts"

const modules = partitionReference().modules
const standIns = allStandIns(modules, SCAFFOLD_FLAT)
const network = pultecScaffold()
const byId = new Map(network.components.map((component) => [component.id, component]))

/** Independent of `lib/board/scaffold/wiring.ts`'s own `pinNet` - this test must not
 * validate the production matcher by re-running the production matcher. */
function netOnTerminal(component: Component, terminal: string): string | undefined {
  const fromPackage: Connection | undefined = component.pins[terminal]
  if (fromPackage !== undefined) return fromPackage.kind === "net" ? fromPackage.net : undefined
  for (const unit of component.units) {
    const connection = unit.pins[terminal]
    if (connection !== undefined) return connection.kind === "net" ? connection.net : undefined
  }
  return undefined
}

test("there are exactly seven links, one per isolation point the model derives", () => {
  // The design doc's count (hi-boost 1, hi-cut 1, low-cut 1, low-boost 2, mid 2 = 7)
  // is read off `allStandIns()` here, not hardcoded as the expectation - a change to
  // the electrical model that changed the count would change this test's own input,
  // not just the production code's output.
  const expected = Object.values(standIns).reduce((sum, standIn) => sum + standIn.isolation.length, 0)
  const entries = scaffoldLinkEntries(standIns, network)
  expect(entries.length).toBe(expected)
  expect(entries.length).toBe(7)
})

test("the per-section link counts match the design's derivation", () => {
  const bySection = new Map<string, number>()
  for (const entry of scaffoldLinkEntries(standIns, network)) {
    bySection.set(entry.section, (bySection.get(entry.section) ?? 0) + 1)
  }
  expect(bySection.get("hi-boost")).toBe(1)
  expect(bySection.get("hi-cut")).toBe(1)
  expect(bySection.get("low-cut")).toBe(1)
  expect(bySection.get("low-boost")).toBe(2)
  expect(bySection.get("mid")).toBe(2)
})

test("every entry's link really is a fitted/removed switch, joining the stub this component's terminal carries to the entry's net", () => {
  for (const entry of scaffoldLinkEntries(standIns, network)) {
    const link = byId.get(entry.link)
    if (link === undefined) throw new Error(`entry names link "${entry.link}", not found on the board`)
    expect(link.kind, entry.link).toBe("switch")
    expect(link.parameters, entry.link).toEqual({
      positions: ["fitted", "removed"],
      contacts: { fitted: [["1", "2"]], removed: [] },
    })

    const component = byId.get(entry.component)
    if (component === undefined) throw new Error(`entry names component "${entry.component}", not found`)
    const stub = netOnTerminal(component, entry.terminal)
    if (stub === undefined) throw new Error(`"${entry.component}" has no net on terminal "${entry.terminal}"`)

    // The component's own terminal must NOT already carry the real boundary net -
    // that is what "isolated" means - and the link must be the one bridge between
    // the stub it actually carries and the net the isolation point names.
    expect(stub, entry.component).not.toBe(entry.net)
    expect(netOnTerminal(link, "1"), entry.link).toBe(stub)
    expect(netOnTerminal(link, "2"), entry.link).toBe(entry.net)
  }
})

test("no two isolation points resolve to the same link", () => {
  const entries = scaffoldLinkEntries(standIns, network)
  const links = entries.map((entry) => entry.link)
  expect(new Set(links).size).toBe(links.length)
})

test("an isolation point naming a component absent from the network refuses rather than guessing", () => {
  const brokenStandIns = {
    ...standIns,
    "hi-boost": { ...standIns["hi-boost"]!, isolation: [{ component: "NOT_ON_BOARD", terminal: "a", net: "in" }] },
  }
  expect(() => scaffoldLinkEntries(brokenStandIns, network)).toThrow(/NOT_ON_BOARD/)
})

test("the emulated setting in the rendered section is read from SCAFFOLD_FLAT, not transcribed", () => {
  const designators = Object.fromEntries(network.components.map((c) => [c.id, c.id]))
  const section = scaffoldLinksSection(standIns, SCAFFOLD_FLAT, network, designators)
  expect(section).toContain(SCAFFOLD_FLAT.loFrequency)
  expect(section).toContain(SCAFFOLD_FLAT.hiFrequency)
  expect(section).toContain(SCAFFOLD_FLAT.midFrequency)
  expect(section).toContain(SCAFFOLD_FLAT.midMode)
})

test("a two-link stand-in's rows both carry that section's name, so a half-disabled stand-in reads as incomplete", () => {
  const designators = Object.fromEntries(network.components.map((c) => [c.id, c.id]))
  const section = scaffoldLinksSection(standIns, SCAFFOLD_FLAT, network, designators)
  const rows = section.split("\n").filter((line) => line.startsWith("| link"))
  const lowBoostRows = rows.filter((row) => row.includes("| low-boost |"))
  const midRows = rows.filter((row) => row.includes("| mid |"))
  expect(lowBoostRows.length).toBe(2)
  expect(midRows.length).toBe(2)
})

test("wiringDocument's scaffold section is present only when the WiringInput declares one", () => {
  const offBoard = new Set(network.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id))
  const padOrder = Object.fromEntries([...offBoard].map((id) => [id, ["a", "b"]]))
  const designators = Object.fromEntries(network.components.map((c) => [c.id, c.id]))

  const withoutScaffold: WiringInput = {
    boardName: "pultec-scaffold",
    circuitPath: "circuits/pultec/scaffold.ts",
    network,
    designators,
    offBoard,
    padOrder,
    sharedBy: {},
  }
  expect(wiringDocument(withoutScaffold)).not.toContain("## Scaffold links")

  const withScaffold: WiringInput = { ...withoutScaffold, scaffold: { standIns, flat: SCAFFOLD_FLAT } }
  const doc = wiringDocument(withScaffold)
  expect(doc).toContain("## Scaffold links")
  for (const entry of scaffoldLinkEntries(standIns, network)) {
    expect(doc).toContain(entry.link)
    expect(doc).toContain(entry.section)
  }
})
