/**
 * `lib/schgen/from-network.ts` and `lib/schgen/authoring{,-checks}.ts`: what each `PartSpec` field
 * comes from, and every refusal when nothing says.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. `tests/schgen/authoring-complete.test.ts`
 * holds the four real circuits to `docs/known-gaps.md` **G99**'s criterion; this file drives the
 * cases the four do not contain - a `position: "fixed"` interface port, a `declared` BOM source, a
 * `wired` rendering with a template anchor, and each refusal.
 */

import { test, expect, describe } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import { authoringProblems, negotiablePort } from "../../lib/schgen/authoring.ts"
import { blockPrefixDisagreements, crossingNets, interfaceDisagreements, unblockedComponents } from "../../lib/schgen/authoring-checks.ts"
import { circuitSpecFrom, libIdsOf, schematicParts } from "../../lib/schgen/from-network.ts"
import { createResolver } from "../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { RailSpec, SheetSpec } from "../../lib/schgen/ir/types.ts"
import type { Network } from "../../lib/model/types.ts"

const symbols = createResolver(symbolLibraries(["Device", "power", "Amplifier_Operational", "Connector_Generic"]))

const SHEETS: readonly SheetSpec[] = [
  { id: "s", title: "Fixture", file: "fixture.kicad_sch", paper: "A4", notes: [] },
]

const RAILS: readonly RailSpec[] = [{ net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null }]

const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = { IN: "in", GND: "bidirectional" }

const CONTEXT = { portDirections: PORT_DIRECTIONS, rails: RAILS }

/** Two components under two `include()`-style prefixes, with MID crossing between them. */
function twoBlockNetwork(): Network {
  return circuit()
    .resistor("a_series", "1k", { a: "IN", b: "MID" })
    .resistor("b_shunt", "2k", { a: "MID", b: "GND" })
    .port("input", "IN")
    .port("ground", "GND")
    .done()
}

function block(id: string, members: readonly string[], prefix: string, nets: readonly string[]): BlockDeclaration {
  return {
    id,
    sheet: "s",
    title: id,
    members,
    rendering: { kind: "auto" },
    anchor: null,
    interface: nets.map((net) => negotiablePort(net, CONTEXT)),
    prefixes: { prefixes: [prefix], why: null },
  }
}

function twoBlockAuthoring(): SchematicAuthoring {
  return {
    project: "fixture",
    designators: { a_series: "R1", b_shunt: "R2" },
    blocks: [block("blk-a", ["a_series"], "a", ["IN", "MID"]), block("blk-b", ["b_shunt"], "b", ["MID", "GND"])],
    sheets: SHEETS,
    rails: RAILS,
    portDirections: PORT_DIRECTIONS,
    overrides: {},
    declared: { source: "a test fixture", bom: { kind: "unsourced", why: "a fixture buys nothing" } },
  }
}

describe("the two-block fixture itself", () => {
  test("is well formed and agrees with the circuit in all three ways", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    expect(authoringProblems(authoring, network)).toEqual([])
    expect(blockPrefixDisagreements(network, authoring)).toEqual([])
    expect(unblockedComponents(network, authoring)).toEqual([])
    expect(interfaceDisagreements(network, authoring)).toEqual([])
  })

  test("a crossing net names why it crosses: a non-member, or a declared port", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const crossings = crossingNets(network, authoring, "blk-a")
    expect([...crossings.keys()].sort()).toEqual(["IN", "MID"])
    expect(crossings.get("MID")?.outside).toEqual(["b_shunt"])
    expect(crossings.get("MID")?.port).toBeNull()
    expect(crossings.get("IN")?.outside).toEqual([])
    expect(crossings.get("IN")?.port).toBe("input")
  })

  test("every PartSpec field comes from where the module header says it does", () => {
    const spec = circuitSpecFrom(twoBlockNetwork(), twoBlockAuthoring(), symbols)
    const part = spec.parts[0]
    expect(part).toBeDefined()
    if (part === undefined) return
    expect(part.label).toBe("R1")
    expect(part.refPrefix).toBe("R")
    expect(part.libId).toBe("Device:R")
    expect(part.units).toEqual([1])
    expect(part.value).toBe("1K")
    // The fixture declares no footprint, so the field is the model's stated absence.
    expect(part.footprint).toBe("")
    expect(part.source).toBe("a test fixture")
    expect(part.bom).toEqual({ Manufacturer: "", MPN: "", Supplier: "", SupplierPart: "", AbsMaxV: null })
    expect(part.dnp).toBe(false)
    expect(part.pinTable).toBeNull()
    expect(part.mechanicalPads).toEqual([])
    expect(part.ncUnlisted).toBeNull()
    expect(part.pins).toEqual({ "1": { net: "IN", identity: "a" }, "2": { net: "MID", identity: "b" } })
  })

  test("libIdsOf names the parts' symbols and the rails' power symbols, with no resolver", () => {
    expect(libIdsOf(twoBlockNetwork(), twoBlockAuthoring())).toEqual(["Device:R", "power:GND"])
  })
})

describe("the interface check fails in both directions", () => {
  test("a net that leaves the block and is not declared refuses, naming both sides", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const blocks = authoring.blocks.map((b) =>
      b.id === "blk-a" ? { ...b, interface: b.interface.filter((p) => p.net !== "MID") } : b,
    )
    const problems = interfaceDisagreements(network, { ...authoring, blocks })
    expect(problems.length).toBe(1)
    expect(problems[0]).toContain("block blk-a: net MID leaves the block and is not a declared interface port")
    expect(problems[0]).toContain("it reaches b_shunt outside the block")
    expect(problems[0]).toContain("inside: a_series")
  })

  test("a declared port no member touches refuses, naming the block and its members", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const blocks = authoring.blocks.map((b) =>
      b.id === "blk-a" ? { ...b, interface: [...b.interface, negotiablePort("GND", CONTEXT)] } : b,
    )
    const problems = interfaceDisagreements(network, { ...authoring, blocks })
    expect(problems).toEqual([
      "block blk-a: declared interface port GND - no member of the block has a pin on it (members: a_series)",
    ])
  })

  test("a declared port whose net never leaves refuses with the other message", () => {
    // One block holding both components: MID is then internal, and nothing declares a port for it.
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const whole: BlockDeclaration = {
      ...block("blk-all", ["a_series", "b_shunt"], "a", ["IN", "GND", "MID"]),
      prefixes: { prefixes: ["a", "b"], why: "the fixture deliberately mixes two prefixes" },
    }
    const problems = interfaceDisagreements(network, { ...authoring, blocks: [whole] })
    expect(problems.length).toBe(1)
    expect(problems[0]).toContain("block blk-all: declared interface port MID does not leave the block")
    expect(problems[0]).toContain("every pin on it is a member (a_series, b_shunt)")
  })
})

describe("the block-prefix check is decision D1's", () => {
  test("a component carrying a declared prefix and not a member refuses", () => {
    const network = circuit()
      .resistor("a_series", "1k", { a: "IN", b: "MID" })
      .resistor("a_second", "3k", { a: "MID", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .done()
    const authoring: SchematicAuthoring = {
      ...twoBlockAuthoring(),
      designators: { a_series: "R1", a_second: "R2" },
      blocks: [block("blk-a", ["a_series"], "a", ["IN", "MID"]), block("blk-b", ["a_second"], "b", ["MID", "GND"])],
    }
    const problems = blockPrefixDisagreements(network, authoring)
    expect(problems).toContain(
      'block blk-a declares include() prefix "a" but a_second carries it and is not a member; ' +
        "decision D1 forbids cutting an include() unit across blocks",
    )
    expect(problems).toContain('block blk-b declares include() prefix "b" and no component id starts with "b_"')
    expect(problems).toContain('block blk-b declares include() prefix(es) b and member a_second carries none of them')
  })

  test("a block declaring no prefix may not hold a component another block's prefix claims", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const blocks: readonly BlockDeclaration[] = [
      authoring.blocks[0] ?? block("blk-a", ["a_series"], "a", ["IN", "MID"]),
      { ...block("blk-b", ["b_shunt"], "b", ["MID", "GND"]), prefixes: { prefixes: [], why: null } },
    ]
    // blk-b now claims no prefix, and nothing else claims "b", so this passes - the check bites
    // only when another block owns the prefix the member carries.
    expect(blockPrefixDisagreements(network, { ...authoring, blocks })).toEqual([])
    const overlapping: readonly BlockDeclaration[] = [
      block("blk-a", ["a_series"], "b", ["IN", "MID"]),
      { ...block("blk-b", ["b_shunt"], "b", ["MID", "GND"]), prefixes: { prefixes: [], why: null } },
    ]
    const problems = blockPrefixDisagreements(network, { ...authoring, blocks: overlapping })
    expect(problems).toContain(
      'block blk-b declares no include() prefix and member b_shunt carries "b", which block blk-a declares',
    )
  })

  test("a component in no block, and one in two, are both reported", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const blocks = [block("blk-a", ["a_series"], "a", ["IN", "MID"])]
    expect(unblockedComponents(network, { ...authoring, blocks })).toEqual(["b_shunt is in no block"])
    const twice = [...authoring.blocks, block("blk-c", ["a_series"], "a", ["IN", "MID"])]
    expect(unblockedComponents(network, { ...authoring, blocks: twice })).toContain("a_series is in blocks blk-a, blk-c")
  })
})

describe("the declaration's own well-formedness", () => {
  test("an empty sides list is a refusal, not \"any side\"", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const blocks = authoring.blocks.map((b) =>
      b.id === "blk-a" ? { ...b, interface: b.interface.map((p) => ({ ...p, sides: [] })) } : b,
    )
    const problems = authoringProblems({ ...authoring, blocks }, network)
    expect(problems).toContain(
      'block blk-a: interface port IN declares no acceptable side. An empty list is a refusal, not "any side": name the sides seam B may attach it from',
    )
  })

  test("a fixed position with a non-blank why is accepted and a blank one refuses", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const fixed = (why: string): readonly BlockDeclaration[] =>
      authoring.blocks.map((b) =>
        b.id === "blk-a"
          ? { ...b, interface: b.interface.map((p) => (p.net === "IN" ? { ...p, position: "fixed" as const, why } : p)) }
          : b,
      )
    expect(authoringProblems({ ...authoring, blocks: fixed("the template puts IN on the chain's left end") }, network)).toEqual([])
    expect(authoringProblems({ ...authoring, blocks: fixed("   ") }, network)).toContain(
      "block blk-a: interface port IN (fixed) has a blank why; a fixed position is a claim about the block's own geometry and a negotiable one says what seam B is free to do",
    )
  })

  test("a declared port with no portDirections entry refuses, quoting what an invented one cost", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const problems = authoringProblems({ ...authoring, portDirections: { IN: "in" } }, network)
    expect(problems.join("\n")).toContain('net GND is declared port "ground" of this network and has no portDirections entry')
    expect(problems.join("\n")).toContain("half of them pointed the wrong way")
  })

  test("an override with a blank why, or overriding nothing, refuses", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    expect(authoringProblems({ ...authoring, overrides: { a_series: { symbol: "Device:R_Small", why: " " } } }, network))
      .toContain("override for a_series: blank why; an override is a claim and carries its reason")
    expect(authoringProblems({ ...authoring, overrides: { a_series: { why: "nothing to say" } } }, network))
      .toContain("override for a_series: overrides nothing (no symbol, symbolPins or pinSides)")
    expect(authoringProblems({ ...authoring, overrides: { nobody: { symbol: "Device:R", why: "x" } } }, network))
      .toContain("override for nobody: no component of this network has that id")
  })

  test("the template anchor lives on BlockDeclaration.anchor and nowhere else", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const anchor = { part: "R1", unit: 1, roles: { a: "1", b: "2" } }
    const inRendering = authoring.blocks.map((b) =>
      b.id === "blk-a" ? { ...b, rendering: { kind: "wired" as const, template: "passive-chain" as const, anchor } } : b,
    )
    expect(authoringProblems({ ...authoring, blocks: inRendering }, network)).toContain(
      "block blk-a: the template anchor is declared on BlockDeclaration.anchor, not inside rendering. Set rendering.anchor to null.",
    )
    const onAuto = authoring.blocks.map((b) => (b.id === "blk-a" ? { ...b, anchor } : b))
    expect(authoringProblems({ ...authoring, blocks: onAuto }, network).join("\n")).toContain(
      'block blk-a: rendering is "auto" and an anchor is declared.',
    )
  })

  test("a wired rendering takes its anchor from the declaration and carries it into the spec", () => {
    const network = twoBlockNetwork()
    const authoring = twoBlockAuthoring()
    const anchor = { part: "R1", unit: 1, roles: { a: "1", b: "2" } }
    const blocks = authoring.blocks.map((b) =>
      b.id === "blk-a"
        ? { ...b, rendering: { kind: "wired" as const, template: "passive-chain" as const, anchor: null }, anchor }
        : b,
    )
    const spec = circuitSpecFrom(network, { ...authoring, blocks }, symbols)
    expect(spec.blocks[0]?.rendering).toEqual({ kind: "wired", template: "passive-chain", anchor })
  })
})

describe("the refusals that keep a backend from inventing an input", () => {
  test("a component with no designator names itself, and a designator used twice refuses", () => {
    const network = twoBlockNetwork()
    const authoring = { ...twoBlockAuthoring(), designators: { a_series: "R1" } }
    expect(authoringProblems(authoring, network)).toContain(
      "component b_shunt has no designator; a part's KiCad label is declared, never derived from the semantic id",
    )
    expect(() => circuitSpecFrom(network, authoring, symbols)).toThrow(/component b_shunt has no designator/)
    const doubled = { ...twoBlockAuthoring(), designators: { a_series: "R1", b_shunt: "R1" } }
    expect(authoringProblems(doubled, network)).toContain("designator R1 is declared for two components")
  })

  test("a model symbol and an override symbol together refuse rather than one winning", () => {
    const network = circuit()
      .resistor("a_series", "1k", { a: "IN", b: "MID" }, { symbol: "Device:R" })
      .resistor("b_shunt", "2k", { a: "MID", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .done()
    const authoring = { ...twoBlockAuthoring(), overrides: { a_series: { symbol: "Device:R_Small", why: "a test" } } }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/Nothing is preferred: delete one/)
  })

  test("a multi-unit symbol with no symbolPins map refuses, and says why no rule derives it", () => {
    const network = circuit()
      .add({
        id: "a_amp",
        kind: "opamp",
        parameters: {},
        part: { symbol: "Amplifier_Operational:TL072" },
        pins: { "v+": { kind: "net", net: "VCC" }, "v-": { kind: "net", net: "GND" } },
        units: [{ name: "A", pins: { "in+": { kind: "net", net: "IN" }, "in-": { kind: "net", net: "MID" }, out: { kind: "net", net: "MID" } } }],
      })
      .resistor("b_shunt", "2k", { a: "MID", b: "GND" })
      .resistor("b_bias", "3k", { a: "VCC", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .port("vcc", "VCC")
      .done()
    const authoring: SchematicAuthoring = {
      ...twoBlockAuthoring(),
      designators: { a_amp: "U1", b_shunt: "R2", b_bias: "R3" },
      blocks: [
        block("blk-a", ["a_amp"], "a", ["IN", "MID", "VCC", "GND"]),
        block("blk-b", ["b_shunt", "b_bias"], "b", ["MID", "VCC", "GND"]),
      ],
      portDirections: { IN: "in", GND: "bidirectional", VCC: "in" },
    }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/has 3 units and no symbolPins map declares which one this is/)
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/\["B", "A"\] is legal/)
  })

  test("a partial symbolPins map refuses rather than being completed by a rule", () => {
    const network = circuit()
      .add({
        id: "a_amp",
        kind: "opamp",
        parameters: {},
        part: { symbol: "Amplifier_Operational:TL072", symbolPins: { A: { "in+": "3", "in-": "2" } } },
        pins: { "v+": { kind: "net", net: "VCC" }, "v-": { kind: "net", net: "GND" } },
        units: [{ name: "A", pins: { "in+": { kind: "net", net: "IN" }, "in-": { kind: "net", net: "MID" }, out: { kind: "net", net: "MID" } } }],
      })
      .resistor("b_shunt", "2k", { a: "MID", b: "GND" })
      .resistor("b_bias", "3k", { a: "VCC", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .port("vcc", "VCC")
      .done()
    const authoring: SchematicAuthoring = {
      ...twoBlockAuthoring(),
      designators: { a_amp: "U1", b_shunt: "R2", b_bias: "R3" },
      blocks: [
        block("blk-a", ["a_amp"], "a", ["IN", "MID", "VCC", "GND"]),
        block("blk-b", ["b_shunt", "b_bias"], "b", ["MID", "VCC", "GND"]),
      ],
      portDirections: { IN: "in", GND: "bidirectional", VCC: "in" },
    }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/the declared symbolPins map omits \[out\]/)
  })

  test("two canonical pins mapped onto one symbol pin refuse", () => {
    const network = circuit()
      .resistor("a_series", "1k", { a: "IN", b: "MID" })
      .resistor("b_shunt", "2k", { a: "MID", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .done()
    const authoring = {
      ...twoBlockAuthoring(),
      overrides: { a_series: { symbolPins: { MAIN: { a: "1", b: "1" } }, why: "a test" } },
    }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/pin number "1" of Device:R is claimed by both/)
  })

  test("a pinSides override naming a pin the symbol does not have refuses", () => {
    const network = twoBlockNetwork()
    const authoring = {
      ...twoBlockAuthoring(),
      overrides: { a_series: { pinSides: { "7": "left" as const }, why: "a test" } },
    }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/the pinSides override names pin number\(s\) \[7\], which Device:R does not have/)
  })

  test("a declared BOM source carries its fields, and a component missing from it refuses", () => {
    const network = twoBlockNetwork()
    const fields = {
      a_series: { Manufacturer: "Yageo", MPN: "RC0805", Supplier: "Mouser", SupplierPart: "603-RC0805", AbsMaxV: null },
    }
    const authoring: SchematicAuthoring = {
      ...twoBlockAuthoring(),
      declared: { source: "a test fixture", bom: { kind: "declared", fields } },
    }
    expect(() => schematicParts(network, authoring, symbols)).toThrow(/component "b_shunt" has no entry in declared\.bom\.fields/)
    const both = { ...fields, b_shunt: { ...fields.a_series, MPN: "RC0805-2" } }
    const spec = circuitSpecFrom(network, { ...authoring, declared: { source: "a test fixture", bom: { kind: "declared", fields: both } } }, symbols)
    expect(spec.parts[0]?.bom.Manufacturer).toBe("Yageo")
    expect(spec.parts[1]?.bom.MPN).toBe("RC0805-2")
  })

  test("a connector whose symbol comes from an override is still valued by that symbol's part name", () => {
    const network = circuit()
      .connector("a_header", { P1: "IN", P2: "GND" })
      .resistor("b_shunt", "2k", { a: "IN", b: "GND" })
      .port("input", "IN")
      .port("ground", "GND")
      .done()
    const authoring: SchematicAuthoring = {
      ...twoBlockAuthoring(),
      designators: { a_header: "J1", b_shunt: "R2" },
      blocks: [block("blk-a", ["a_header"], "a", ["IN", "GND"]), block("blk-b", ["b_shunt"], "b", ["IN", "GND"])],
      overrides: {
        a_header: {
          symbol: "Connector_Generic:Conn_01x02",
          symbolPins: { MAIN: { P1: "1", P2: "2" } },
          pinSides: { "1": "left", "2": "left" },
          why: "a test: the model declares no symbol for this header",
        },
      },
    }
    const spec = circuitSpecFrom(network, authoring, symbols)
    expect(spec.parts[0]?.value).toBe("Conn_01x02")
  })
})
