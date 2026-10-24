/**
 * `NC`'s FIRST EXERCISE IN THIS REPOSITORY'S HISTORY, driven end to end: a model `Connection`
 * tagged `{ kind: "nc" }` through `circuitSpecFrom`, `buildCircuit`, `validateCircuit` and
 * `emitSheet`, to the `(no_connect ...)` item a KiCad sheet carries.
 *
 * Hand-written for Task 2 of the 2026-10-23 net-names-and-floating-pins plan, whose brief calls
 * this file **a measurement rather than an implementation**. `lib/model/types.ts` exports `NC`,
 * no circuit in `circuits/` authors one, and the IR, the validators and the emitter each had
 * never met it. What the path did on first exercise is recorded in `docs/known-gaps.md` **G278**;
 * this file is the check that could have failed.
 *
 * **THE FOUR STATES SPEC §3b REQUIRES STAY DISTINGUISHABLE ARE ONE `describe` EACH**, and every
 * one of them asserts on the refusal MESSAGE rather than on a count: `validateCircuit` runs
 * eleven rules and a count-only assertion would establish only that something broke.
 *
 *   1. a pin DELIBERATELY declared `NC`               - accepted, and drawn as a no-connect
 *   2. a pin ACCIDENTALLY OMITTED from the model      - refused by `pinsDeclared`
 *   3. a library pin typed `no_connect` ON A NET      - refused by `pinSemantics`
 *   4. a pin alone on a one-pin net                   - refused by `singlePinNets`
 *
 * State 4 is the `pt2399-core` shape reproduced on a fixture: a net with one pin, kept legal at
 * the model's own `done()` by a declared port, which `lib/schgen/ir/validate-nets.ts` refuses all
 * the same. The spec records that the real circuit's port *"does not imply the pin does anything
 * off-board"* - the fixture here makes the same false claim on purpose, so that the refusal the
 * real board hits is pinned by a test instead of only by that board.
 *
 * **WHY THE FIXTURE LIBRARY AND NOT A STOCK KICAD ONE.** State 3 needs a symbol pin the LIBRARY
 * types `no_connect`, and `tests/schgen/__fixtures__/symbols/Fix.kicad_sym`'s `BIG8` has one -
 * pin 7, named `NC`. Nothing in the stock symbol set this repository resolves was verified to
 * have one, and `CLAUDE.md` forbids writing a symbol name from memory. `BIG8` is an eight-pin
 * `ic`, so the model's own pin names ARE its symbol pin numbers (`canonicalPinNumbers`'s identity
 * rule), which keeps the fixture free of a hand-written `symbolPins` map.
 *
 * **NOTHING HERE AUTHORS `NC` IN A CIRCUIT.** `circuits/` is Task 4's and Task 5's; this file
 * builds its own network so that the measurement does not depend on a board.
 */

import { describe, expect, test } from "bun:test"
import { circuit, NC } from "../../../lib/model/index.ts"
import { negotiablePort } from "../../../lib/schgen/authoring.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts"
import { emitContext, emitSheet } from "../../../lib/schgen/render/emit.ts"
import { fmtMm } from "../../../lib/schgen/render/geometry.ts"
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts"
import { symbols } from "../__fixtures__/circuits.ts"
import type { PinMap } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/types.ts"
import type { BlockDeclaration, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"
import type { Circuit, PortDirection, RailSpec, SheetSpec } from "../../../lib/schgen/ir/types.ts"

const SHEETS: readonly SheetSpec[] = [
  { id: "s", title: "NC fixture", file: "nc-fixture.kicad_sch", paper: "A3", notes: [] },
]

/** Only the rails this fixture actually uses: `rails` refuses a declared rail with no pins. */
const RAILS: readonly RailSpec[] = [
  { net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null },
  { net: "3V3", symbol: "Pwr:+3V3", kind: "supply", pwrFlag: null },
]

/** Per arm, because `authoringProblems` refuses a direction for a net no pin of the network is on. */
function portDirectionsFor(stranded: boolean): Readonly<Record<string, PortDirection>> {
  const base: Record<string, PortDirection> = { IN: "in", GND: "bidirectional", "3V3": "bidirectional" }
  return stranded ? { ...base, SPARE: "bidirectional" } : base
}

/** What the fixture does with `BIG8`'s pin 7, which the library types `no_connect`. */
type Pin7 = "nc" | "omitted" | "on-net"

interface Arm {
  /** Pin 7's treatment. */
  readonly pin7: Pin7
  /** True to strand pin 6 alone on net SPARE, held legal at `done()` by a declared port. */
  readonly strandPin6?: boolean
}

/**
 * An eight-pin `ic` plus the two passives that keep every net it touches at two pins or more, so
 * that each arm below produces exactly ONE problem and the message identifies which rule found it.
 *
 * Pins 4 and 8 are `power_in` in the library, so they sit on the two declared rails: `pinSemantics`
 * refuses a power input on a net that is not a rail, and that refusal is not what any arm measures.
 */
function probeNetwork(arm: Arm): Network {
  const pin6 = arm.strandPin6 === true ? "SPARE" : "IN"
  const connected: PinMap = { "1": "IN", "2": "IN", "3": "IN", "4": "GND", "5": "IN", "6": pin6, "8": "3V3" }
  const pins: PinMap =
    arm.pin7 === "omitted" ? connected : { ...connected, "7": arm.pin7 === "nc" ? NC : "IN" }
  const builder = circuit()
    // NO FOOTPRINT ON ANY PART, deliberately. `from-network.ts` documents `""` as the faithful
    // transcription of a model that declares none, and a fixture is never fabricated - so there is
    // nothing truer to put there. It also keeps a footprint name this repository would then have
    // to account for in `tests/kicad/footprint-names.test.ts` out of the tree.
    .ic("probe", pins, { mpn: "BIG8", symbol: "Fix:BIG8" })
    .resistor("input_load", "10k", { a: "IN", b: "GND" }, { symbol: "Fix:R" })
    .capacitor("supply_decoupling", "100nF", { a: "3V3", b: "GND" }, { symbol: "Fix:C" })
  // The pt2399-core shape: a one-pin net the model's own validation only tolerates as a port.
  return (arm.strandPin6 === true ? builder.port("spare_unused", "SPARE") : builder).done()
}

function probeAuthoring(arm: Arm): SchematicAuthoring {
  const stranded = arm.strandPin6 === true
  const portDirections = portDirectionsFor(stranded)
  const probeNets = ["IN", "GND", "3V3", ...(stranded ? ["SPARE"] : [])]
  const probeSignals = stranded ? ["IN", "SPARE"] : ["IN"]
  // One block per component: `lib/schgen/render/bus.ts` refuses a bus block holding more than one
  // unit, so a single block over all three is not a layout this renderer can draw.
  const block = (
    id: string,
    members: readonly string[],
    groupNets: readonly string[],
    blockNets: readonly string[],
  ): BlockDeclaration => ({
    id,
    sheet: "s",
    title: id,
    members,
    rendering: { kind: "bus", groups: groupNets.length === 0 ? [] : [{ name: `${id}_SIG`, nets: groupNets }] },
    anchor: null,
    interface: blockNets.map((net) => negotiablePort(net, { portDirections, rails: RAILS })),
    // Empty, because this fixture composes nothing: no member carries an include() prefix.
    prefixes: { prefixes: [], why: null },
  })
  return {
    project: "nc-fixture",
    designators: { probe: "U1", input_load: "R1", supply_decoupling: "C1" },
    blocks: [
      block("PROBE", ["probe"], probeSignals, probeNets),
      block("LOAD", ["input_load"], ["IN"], ["IN", "GND"]),
      block("DEC", ["supply_decoupling"], [], ["3V3", "GND"]),
    ],
    sheets: SHEETS,
    rails: RAILS,
    portDirections,
    overrides: {},
    declared: {
      source: "tests/schgen/ir/nc-end-to-end.test.ts, which is the authority for this fixture",
      bom: { kind: "unsourced", why: "a fixture buys nothing" },
    },
  }
}

function probeCircuit(arm: Arm): Circuit {
  const network = probeNetwork(arm)
  return buildCircuit(circuitSpecFrom(network, probeAuthoring(arm), symbols), { symbols })
}

const problems = (arm: Arm): string[] => validateCircuit(probeCircuit(arm), symbols)

/** The fixture's one sheet, emitted. */
function probeSheet(arm: Arm): string {
  const c = probeCircuit(arm)
  const ctx = emitContext("nc-fixture", c, symbols, annotate(c, EMPTY_LOCK, new Map()).refs, ["generated by a test"])
  return emitSheet(layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG"), ctx)
}

describe("state 1: a pin deliberately declared NC", () => {
  test("reaches the IR as net null, with its model identity kept", () => {
    const pin = probeCircuit({ pin7: "nc" }).pins.find((p) => p.part === "U1" && p.pin === "7")
    expect(pin).toBeDefined()
    expect(pin?.net).toBeNull()
    // "circuit" and not "nc-unlisted": the model DECLARED this pin, which is the distinction
    // `IrPin.origin` exists to keep. An unlisted pin is one the circuit never mentioned.
    expect(pin?.origin).toBe("circuit")
    expect(pin?.identity).toBe("7")
  })

  test("is accepted by validateCircuit, with no problem on any rule", () => {
    expect(problems({ pin7: "nc" })).toEqual([])
  })

  test("is NOT on any net of the IR, so nothing downstream can read it as connected", () => {
    const c = probeCircuit({ pin7: "nc" })
    const onANet = [...c.nets.values()].flat().filter((p) => p.part === "U1" && p.pin === "7")
    expect(onANet).toEqual([])
  })

  test("is emitted as a no_connect marker at the pin, not merely left unwired", () => {
    const sheet = probeSheet({ pin7: "nc" })
    expect(sheet).toContain("(no_connect")
  })

  test("the marker sits at the pin end the layout reports, to three decimals", () => {
    const c = probeCircuit({ pin7: "nc" })
    const drawing = layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG")
    expect(drawing.noConnects).toHaveLength(1)
    const ctx = emitContext("nc-fixture", c, symbols, annotate(c, EMPTY_LOCK, new Map()).refs, ["generated by a test"])
    const sheet = emitSheet(drawing, ctx)
    const at = /\(no_connect\s*\(at ([-0-9.]+) ([-0-9.]+)\)/.exec(sheet)
    expect(at).not.toBeNull()
    const point = drawing.noConnects[0]
    if (point === undefined || at === null) throw new Error("the drawing reported no no-connect point")
    expect([at[1], at[2]]).toEqual([fmtMm(point.x), fmtMm(point.y)])
  })
})

describe("state 2: a pin omitted from the model entirely", () => {
  test("is still refused by pinsDeclared, naming the pin and its library name", () => {
    expect(problems({ pin7: "omitted" })).toEqual([
      "part U1: pin 7 (NC) is neither on a net nor declared not connected",
    ])
  })

  test("is absent from the IR's pins, which is what makes the two states distinguishable", () => {
    const c = probeCircuit({ pin7: "omitted" })
    expect(c.pins.filter((p) => p.part === "U1" && p.pin === "7")).toEqual([])
    expect(probeCircuit({ pin7: "nc" }).pins.filter((p) => p.part === "U1" && p.pin === "7")).toHaveLength(1)
  })
})

describe("state 3: a library pin typed no_connect that is on a net", () => {
  test("is still refused by pinSemantics, naming the pin and the net", () => {
    expect(problems({ pin7: "on-net" })).toEqual([
      "part U1: pin 7 is a no_connect pin but is on net IN",
    ])
  })
})

describe("state 4: a pin alone on a one-pin net - the pt2399-core shape", () => {
  test("passes the model's own done() when a port is declared for it", () => {
    expect(() => probeNetwork({ pin7: "nc", strandPin6: true })).not.toThrow()
  })

  test("is still refused by singlePinNets, naming the net and the pin on it", () => {
    expect(problems({ pin7: "nc", strandPin6: true })).toEqual([
      "net SPARE has only one pin (U1.6); connect it or declare the pin not connected",
    ])
  })
})
