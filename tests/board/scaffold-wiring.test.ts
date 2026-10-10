/**
 * The "Stand-in groups" section of a board's wiring guide: what it tells a builder to
 * populate, what it says is carried elsewhere, which junction pins it says to wire, and
 * the setting it says the stand-ins emulate.
 *
 * ASSERTED AGAINST THE CONFIGURATION NETWORKS, NOT AGAINST THE DERIVATION RESTATED.
 * `suppliers()` already has its own tests (`tests/board/scaffold-supplier.test.ts`);
 * re-deriving the supplier rule here and comparing it with itself would pass against a
 * guide that describes a different board. So the instructions are checked against what
 * `boardNetwork(section, present)` actually carries: the groups a build populates are
 * read back out of the network's own stand-in provenance, and the junction pins are
 * recomputed from the nets two present boards' populated parts share.
 *
 * WHAT REPLACED WHAT. This file previously checked the separate scaffold board's
 * removable links, every network coming from a `pultecScaffold()` that no longer
 * exists. The links are gone - a build is configured by which parts are populated - so
 * there is nothing here carried over from them.
 */
import { test, expect } from "bun:test"
import {
  standInGroupsSection,
  standInOwners,
  standInPartIds,
} from "../../lib/board/scaffold/wiring.ts"
import { asScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import { wiringDocument } from "../../lib/board/wiring.ts"
import { physicalOnly } from "../../lib/board/physicalize.ts"
import { componentNets } from "../../lib/model/topology.ts"
import { LADDER_ORDER } from "../../lib/board/scaffold/supplier.ts"
import { scaffoldDoc } from "../../circuits/pultec/physical/scaffold-doc.ts"
import {
  STAND_IN_SOURCE,
  boardNetwork,
  sectionBoard,
  standInFlat,
} from "../../circuits/pultec/physical/board.ts"
import { JUNCTION_NETS, sharedByFor } from "../../circuits/pultec/physical/parts.ts"
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const JUNCTION_NET_SET: ReadonlySet<string> = new Set(JUNCTION_NETS)

/** Every non-empty subset of the five sections: the 31 buildable configurations. */
function configurations(): readonly (readonly string[])[] {
  const all: string[][] = []
  for (let mask = 1; mask < 1 << LADDER_ORDER.length; mask += 1) {
    all.push(LADDER_ORDER.filter((_, index) => ((mask >> index) & 1) === 1))
  }
  return all
}

/**
 * Which sections' stand-in parts a board really carries in one build, read off the
 * network rather than asked of the supplier rule.
 */
function groupsCarried(section: string, present: ReadonlySet<string>): readonly string[] {
  const sections = new Set<string>()
  for (const component of boardNetwork(section, present).components) {
    if (component.provenance?.source !== STAND_IN_SOURCE) continue
    const location = component.provenance.location
    if (location === undefined) {
      throw new Error(`stand-in component ${component.id} carries no provenance.location`)
    }
    sections.add(location)
  }
  return [...sections].sort()
}

/** Junction nets a board's populated parts sit on, recomputed here independently. */
function junctionNets(section: string, present: ReadonlySet<string>): ReadonlySet<string> {
  const nets = new Set<string>()
  for (const component of boardNetwork(section, present).components) {
    if (physicalOnly(component)) continue
    for (const netName of componentNets(component)) {
      if (JUNCTION_NET_SET.has(netName)) nets.add(netName)
    }
  }
  return nets
}

/** One component of a network, refusing rather than reporting a vacuous pass. */
function componentOn(network: Network, id: string): Component {
  const found = network.components.find((component) => component.id === id)
  if (found === undefined) throw new Error(`${id} is not on this network`)
  return found
}

function buildFor(doc: ScaffoldDoc, present: readonly string[]) {
  const wanted = [...present].sort().join(" ")
  const build = doc.builds.find((candidate) => [...candidate.present].sort().join(" ") === wanted)
  if (build === undefined) {
    throw new Error(
      `${doc.section}'s guide has no row for the build ${wanted}; it has ` +
        `${doc.builds.length} rows. Every build this board can be in needs one.`,
    )
  }
  return build
}

const DOCS = new Map(LADDER_ORDER.map((section) => [section, scaffoldDoc(section)]))

function docFor(section: string): ScaffoldDoc {
  const doc = DOCS.get(section)
  if (doc === undefined) throw new Error(`no scaffold doc for ${section}`)
  return doc
}

test("the groups a build says to populate are the ones that board's network carries", () => {
  for (const present of configurations()) {
    const set = new Set(present)
    for (const section of present) {
      const build = buildFor(docFor(section), present)
      expect([...build.populate].sort(), `${section} in ${present.join("+")}`)
        .toEqual([...groupsCarried(section, set)])
    }
  }
})

test("across every build, each absent section is populated on exactly one board", () => {
  // The defect the supplier rule exists to prevent, asserted on the INSTRUCTIONS rather
  // than on the rule: two guides each telling a builder to populate the same group is
  // the paralleled pair, however the assignment was computed.
  for (const present of configurations()) {
    const counts = new Map<string, string[]>()
    for (const section of present) {
      for (const group of buildFor(docFor(section), present).populate) {
        const boards = counts.get(group) ?? []
        boards.push(section)
        counts.set(group, boards)
      }
    }
    const set = new Set(present)
    for (const absent of LADDER_ORDER) {
      if (set.has(absent)) continue
      expect(counts.get(absent) ?? [], `${absent} absent from ${present.join("+")}`)
        .toHaveLength(1)
    }
    for (const section of present) {
      expect(counts.get(section), `${section} is present in ${present.join("+")}`).toBeUndefined()
    }
  }
})

test("a group left empty here names the board that does populate it, and that board agrees", () => {
  for (const present of configurations()) {
    for (const section of present) {
      for (const carried of buildFor(docFor(section), present).elsewhere) {
        expect(carried.board, `${section}'s guide for ${present.join("+")}`).not.toBe(section)
        expect(present).toContain(carried.board)
        expect(buildFor(docFor(carried.board), present).populate, carried.board)
          .toContain(carried.section)
      }
    }
  }
})

test("every absent section is accounted for: populated here or named elsewhere", () => {
  for (const present of configurations()) {
    const set = new Set(present)
    const absent = LADDER_ORDER.filter((section) => !set.has(section))
    for (const section of present) {
      const build = buildFor(docFor(section), present)
      const named = [...build.populate, ...build.elsewhere.map((carried) => carried.section)]
      expect([...named].sort(), `${section} in ${present.join("+")}`).toEqual([...absent].sort())
    }
  }
})

test("the junction pins a build says to wire are the nets another present board shares", () => {
  for (const present of configurations()) {
    const set = new Set(present)
    for (const section of present) {
      const mine = junctionNets(section, set)
      const expected = new Map<string, string[]>()
      for (const netName of mine) {
        const reaches = present
          .filter((other) => other !== section && junctionNets(other, set).has(netName))
          .sort()
        if (reaches.length > 0) expected.set(netName, reaches)
      }
      const build = buildFor(docFor(section), present)
      const stated = new Map(build.junction.map((wire) => [wire.net, [...wire.reaches].sort()]))
      expect([...stated.keys()].sort(), `${section} in ${present.join("+")}`)
        .toEqual([...expected.keys()].sort())
      for (const [netName, reaches] of expected) {
        expect(stated.get(netName), `${section}.${netName} in ${present.join("+")}`)
          .toEqual(reaches)
      }
    }
  }
})

test("a one-board build states no crossing pins, because nothing else is on the bench", () => {
  for (const section of LADDER_ORDER) {
    expect(buildFor(docFor(section), [section]).junction, section).toEqual([])
    expect(buildFor(docFor(section), [section]).populate.length, section).toBe(4)
  }
})

test("every part listed in a group is a part that board carries, under that group's name", () => {
  for (const section of LADDER_ORDER) {
    const board = sectionBoard(section)
    const doc = docFor(section)
    const marked = board.network.components
      .filter((component) => component.provenance?.source === STAND_IN_SOURCE)
      .map((component) => component.id)
      .sort()
    expect([...standInPartIds(doc)].sort(), section).toEqual(marked)

    for (const [id, owner] of standInOwners(doc)) {
      expect(componentOn(board.network, id).provenance?.location, id).toBe(owner)
    }
  }
})

test("the rendered section lists every part of a group under the group's own heading", () => {
  // A half-populated group has to read as unfinished, which it can only do if the
  // group's heading is followed by all of its parts.
  const section = "low-cut"
  const board = sectionBoard(section)
  const doc = docFor(section)
  const rendered = standInGroupsSection(
    doc,
    board.network,
    board.designators,
    {},
    board.offBoardIds,
  )
  for (const group of doc.groups) {
    const heading = `#### ${group.section} — stands in for the absent ${group.section} section`
    const start = rendered.indexOf(heading)
    expect(start, group.section).toBeGreaterThan(-1)
    const rest = rendered.slice(start + heading.length)
    const end = rest.indexOf("#### ")
    const body = end === -1 ? rest : rest.slice(0, end)
    for (const id of group.partIds) expect(body, `${group.section}/${id}`).toContain(id)
    const rows = body.split("\n").filter((line) => line.startsWith("| SI_"))
    expect(rows, group.section).toHaveLength(group.partIds.length)
  }
})

test("the emulated setting is read from the derivation, not written into the prose", () => {
  const section = "mid"
  const board = sectionBoard(section)
  const doc = docFor(section)
  const flat = standInFlat("low-cut")
  const rendered = standInGroupsSection(doc, board.network, board.designators, {}, new Set())
  expect(rendered).toContain(`low frequency ${flat.loFrequency}`)
  expect(rendered).toContain(`high frequency ${flat.hiFrequency}`)
  expect(rendered).toContain(`mid frequency ${flat.midFrequency}`)
  expect(rendered).toContain(`mid in ${flat.midMode}`)

  // Move the setting and the prose must move with it. Without this the assertions above
  // only show that four strings appear somewhere, which a transcribed copy would also
  // satisfy.
  const moved: ScaffoldDoc = { ...doc, flat: { ...doc.flat, midFrequency: "3kHz" } }
  const other = standInGroupsSection(moved, board.network, board.designators, {}, new Set())
  expect(other).toContain("mid frequency 3kHz")
  expect(other).not.toContain(`mid frequency ${flat.midFrequency}`)
})

test("every board's guide covers all sixteen builds it can be part of", () => {
  for (const section of LADDER_ORDER) {
    const doc = docFor(section)
    expect(doc.builds, section).toHaveLength(16)
    for (const build of doc.builds) expect(build.present, section).toContain(section)
    const keys = doc.builds.map((build) => build.present.join(" "))
    expect(new Set(keys).size, section).toBe(16)
  }
})

test("the source, the load and ground are given junction pads", () => {
  for (const section of LADDER_ORDER) {
    const ports = docFor(section).external
    expect(ports.map((landing) => landing.port).sort())
      .toEqual(["ground", "input", "output"])
    for (const landing of ports) expect(JUNCTION_NETS).toContain(landing.net)
  }
})

test("a part the board does not carry refuses rather than being listed", () => {
  const board = sectionBoard("low-cut")
  const doc = docFor("low-cut")
  const broken: ScaffoldDoc = {
    ...doc,
    groups: [{ section: "mid", partIds: ["SI_MID_NOT_A_PART"] }],
  }
  expect(() => standInGroupsSection(broken, board.network, board.designators, {}, new Set()))
    .toThrow(/SI_MID_NOT_A_PART/)
})

test("a part listed under two groups refuses, because it would be populated twice", () => {
  const doc = docFor("low-cut")
  const [first, second] = doc.groups
  if (first === undefined || second === undefined) {
    throw new Error(`low-cut's guide holds ${doc.groups.length} groups, expected four`)
  }
  const shared = first.partIds[0]
  if (shared === undefined) throw new Error(`${first.section}'s group lists no parts`)
  const broken: ScaffoldDoc = {
    ...doc,
    groups: [first, { section: second.section, partIds: [shared] }],
  }
  expect(() => standInOwners(broken)).toThrow(/populated twice/)
})

test("a malformed SCAFFOLD export refuses, naming the field", () => {
  expect(() => asScaffoldDoc({ section: "low-cut" }, "boards/pultec-low-cut/perfboard.json"))
    .toThrow(/SCAFFOLD.builds/)
  expect(() => asScaffoldDoc(
    { ...docFor("low-cut"), flat: { loFrequency: "100Hz" } },
    "boards/pultec-low-cut/perfboard.json",
  )).toThrow(/SCAFFOLD.flat.hiFrequency/)
  expect(() => asScaffoldDoc(
    { ...docFor("low-cut"), groups: [{ section: "mid", partIds: [] }] },
    "boards/pultec-low-cut/perfboard.json",
  )).toThrow(/SCAFFOLD.groups\[0\].partIds/)
})

test("stand-in parts are out of the always-populated table and into their own section", () => {
  // The defect this task closes: the committed guides listed every stand-in part under
  // "On the board", which reads as an instruction to fit all of them on every board.
  const board = sectionBoard("low-cut")
  const doc = docFor("low-cut")
  const document = wiringDocument({
    boardName: "pultec-low-cut",
    circuitPath: "circuits/pultec/physical/low-cut.ts",
    network: board.network,
    designators: board.designators,
    offBoard: board.offBoardIds,
    padOrder: board.padOrders,
    sharedBy: sharedByFor("low-cut"),
    scaffold: doc,
  })
  const onBoard = document.slice(
    document.indexOf("## On the board"),
    document.indexOf("## Panel parts"),
  )
  for (const id of standInPartIds(doc)) {
    expect(onBoard, id).not.toContain(id)
    expect(document, id).toContain(id)
  }
  // The section's own parts are still there, and still always fitted.
  expect(onBoard).toContain("| C1 | 18nF |")
  expect(document).toContain("## Stand-in groups")
})

test("a stand-in part that is a panel part says which group it belongs to", () => {
  const board = sectionBoard("low-cut")
  const document = wiringDocument({
    boardName: "pultec-low-cut",
    circuitPath: "circuits/pultec/physical/low-cut.ts",
    network: board.network,
    designators: board.designators,
    offBoard: board.offBoardIds,
    padOrder: board.padOrders,
    sharedBy: sharedByFor("low-cut"),
    scaffold: docFor("low-cut"),
  })
  // mid's 1H tap is an off-board landing, so it appears among the panel parts a builder
  // wires on every build unless the guide says otherwise.
  expect(document).toContain("### SI_MID_L_MID_1H")
  expect(document).toContain("**Part of the mid stand-in group.**")
})

test("the section is deterministic", () => {
  const board = sectionBoard("hi-cut")
  const doc = docFor("hi-cut")
  const once = standInGroupsSection(doc, board.network, board.designators, {}, board.offBoardIds)
  const twice = standInGroupsSection(doc, board.network, board.designators, {}, board.offBoardIds)
  expect(once).toBe(twice)
})

test("a group's part that is not on the rendered board refuses, not silently renders", () => {
  // The guide is generated per board; handing one board's doc the WRONG board's network
  // must refuse rather than produce a document naming parts that board has no position
  // for.
  const wrong: Network = { ports: {}, components: [] }
  expect(() => standInGroupsSection(docFor("mid"), wrong, {}, {}, new Set()))
    .toThrow(/not on that board's network/)
})

test("a stand-in part carries the junction net it reaches, so the pins are real", () => {
  // Spot-check with the model rather than with another derivation: every group part on
  // a board sits either on a junction net or on a net prefixed for that group, never on
  // another section's private net.
  const board = sectionBoard("hi-boost")
  const doc = docFor("hi-boost")
  for (const group of doc.groups) {
    const prefix = `si_${group.section.replace(/-/g, "_")}_`
    for (const id of group.partIds) {
      for (const netName of componentNets(componentOn(board.network, id))) {
        const ok = JUNCTION_NET_SET.has(netName) || netName.startsWith(prefix)
        expect(ok, `${id} on net ${netName}`).toBe(true)
      }
    }
  }
})
