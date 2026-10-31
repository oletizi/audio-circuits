import { test, expect } from "bun:test"
import {
  bomConditions,
  pt2399Core,
  BOM_RAIL,
  DESIGNATORS,
  PIN_NUMBERS,
} from "../../circuits/pt2399-core/pt2399-core.ts"
import { highestRailVolts } from "../../tools/bom/conditions.ts"
import { railBoundResistorWatts } from "../../tools/bom/rail-bound.ts"
import { railBoundMinimumOhms, requiredResistorWatts } from "../../tools/bom/ratings.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import { toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { parseValue } from "../../lib/model/units.ts"
import { net } from "../../lib/model/types.ts"
import { declaredNcNodes } from "../support/declared-nc.ts"
import type { Component, Connection, Network } from "../../lib/model/types.ts"

/** Our network expressed the way the KiCad netlist expresses itself. */
function asDesignatorNets(
  n: Network,
  designators: Readonly<Record<string, string>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (netName: string, member: string) => {
    ;(out[netName] ??= []).push(member)
  }
  const addPins = (
    kind: string,
    designator: string,
    pins: Readonly<Record<string, Connection>>,
  ) => {
    for (const [pin, conn] of Object.entries(pins)) {
      if (conn.kind === "nc") continue
      const number = PIN_NUMBERS[kind]?.[pin] ?? pin
      add(conn.net, `${designator}.${number}`)
    }
  }
  for (const component of n.components) {
    const designator = designators[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    addPins(component.kind, designator, component.pins)
    for (const unit of component.units) {
      addPins(component.kind, designator, unit.pins)
    }
  }
  for (const key of Object.keys(out)) out[key] = (out[key] ?? []).sort()
  return out
}

/** The pins this model declares `NC`, as netlist nodes: `tests/support/declared-nc.ts`'s rule. */
const ncNodes = (n: Network): ReadonlySet<string> => declaredNcNodes(n, DESIGNATORS, PIN_NUMBERS)

/** One net the export carries that the model deliberately does not, and the declaration that excused it. */
interface NcAllowance {
  /** The placeholder net name KiCad's exporter invented. */
  readonly net: string
  /** The one node on it, which the model declares `NC`. */
  readonly node: string
}

/**
 * **THE ROUND-TRIP COMPARISON, AND ITS ONE TOLERANCE, WHICH IS A NAMED PIN AND NOT A SHAPE.**
 *
 * The model is derived from the netlist export, so its net set used to be the export's net set
 * exactly. Since 2026-10-24 it differs by one net: U1 pin 5 (CLK_O) is unused and
 * `circuits/pt2399-core/pt2399-core.ts` declares it `NC`, where the export carries KiCad's
 * placeholder `unconnected-(U1-CLK_O-Pad5)` with `U1.5` alone on it.
 *
 * **WHAT IS TOLERATED, STATED AS A PIN:** an exported net absent from the model whose SOLE member
 * is a node this model declares `NC`. Nothing else. In this circuit that is exactly `U1.5`, and
 * the test below asserts the tolerance fired once and names it - an allowance nothing exercises
 * reads like a comparison that passed.
 *
 * **WHAT IS NOT TOLERATED, AND WHY THE DISTINCTION IS THE WHOLE POINT.** *"A one-member net
 * corresponds to an intentional no-connect"* would be the easy rule and it would hide a real
 * defect: a connection dropped while transforming the model leaves a one-member net too, and this
 * comparison exists to catch that. So the allowance is keyed on the DECLARATION, never on the
 * shape - it does not pattern-match `unconnected-*`, it does not treat one-member nets as a class,
 * and it does not excuse a declared-`NC` node that the export shows wired to anything (such a net
 * has two members, so the allowance never reaches it). The spec is
 * `docs/superpowers/specs/2026-10-23-net-names-and-floating-pins-design.md` decision (1); the
 * register entry is `docs/known-gaps.md` **G283**.
 *
 * Throws on any disagreement rather than returning problems: the callers are tests, and a
 * disagreement here is never something to accumulate.
 */
function agreeOnNets(args: {
  readonly ours: Readonly<Record<string, readonly string[]>>
  readonly exported: Readonly<Record<string, readonly string[]>>
  readonly declaredNc: ReadonlySet<string>
}): readonly NcAllowance[] {
  const { ours, exported, declaredNc } = args
  const allowed: NcAllowance[] = []
  const problems: string[] = []
  const WHY =
    "This comparison excuses exactly one thing: an exported net whose SOLE member is a node " +
    "circuits/pt2399-core/pt2399-core.ts declares NC. It is keyed on that declaration and not on " +
    "the net's shape, because a connection dropped by accident also appears as a one-member net."
  for (const [name, members] of Object.entries(exported)) {
    const theirs = [...members].sort()
    const mine = ours[name]
    if (mine === undefined) {
      const only = theirs.length === 1 ? theirs[0] : undefined
      if (only !== undefined && declaredNc.has(only)) {
        allowed.push({ net: name, node: only })
        continue
      }
      problems.push(
        `net ${name} is in the netlist and missing from the model, carrying ` +
          `[${theirs.join(", ")}]. ${WHY}`,
      )
      continue
    }
    const missing = theirs.filter((m) => !mine.includes(m))
    const extra = [...mine].filter((m) => !theirs.includes(m))
    if (missing.length > 0 || extra.length > 0) {
      problems.push(
        `net ${name}: the netlist has [${theirs.join(", ")}] and the model has ` +
          `[${[...mine].join(", ")}]` +
          (missing.length > 0 ? `; missing from the model: ${missing.join(", ")}` : "") +
          (extra.length > 0 ? `; in the model and not in the netlist: ${extra.join(", ")}` : "") +
          `. ${WHY}`,
      )
    }
  }
  for (const name of Object.keys(ours)) {
    if (exported[name] === undefined) {
      problems.push(`net ${name} is in the model and missing from the netlist entirely`)
    }
  }
  if (problems.length > 0) throw new Error(problems.sort().join("\n"))
  return allowed
}

const built = async () =>
  importLegacyNetlist(await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text())

test("the authored network matches the netlist of the built unit", async () => {
  const imported = await built()
  const network = pt2399Core()
  const allowed = agreeOnNets({
    ours: asDesignatorNets(network, DESIGNATORS),
    exported: imported.nets,
    declaredNc: ncNodes(network),
  })
  // The tolerance, pinned as one pin: not a count, not a shape, and asserted to have FIRED.
  expect(allowed).toEqual([{ net: "unconnected-(U1-CLK_O-Pad5)", node: "U1.5" }])
})

/** The model with one resistor terminal dropped: `input_mix_resistor`'s `b`, which is `R3.2`. */
function withTerminalDropped(n: Network): Network {
  const dropped = (c: Component): Component =>
    c.id !== "input_mix_resistor"
      ? c
      : {
          ...c,
          units: c.units.map((u) => ({
            ...u,
            pins: Object.fromEntries(Object.entries(u.pins).filter(([pin]) => pin !== "b")),
          })),
        }
  return { ...n, components: n.components.map(dropped) }
}

/**
 * **THE ARM THAT MATTERS, AND THE ONLY ONE HERE THAT DISCRIMINATES THE ALLOWANCE FROM THE BLANKET
 * RULE IT WAS NOT ALLOWED TO BE.**
 *
 * The shape is the real one, not a contrivance: when a pin has nothing on it, KiCad's exporter
 * gives it a net of its own called `unconnected-(<REF>-Pad<N>)` with that pin as the single
 * member. That is how `U1.5` appears, and it is **also exactly how a terminal somebody forgot to
 * wire would appear.** So this arm drops `input_mix_resistor`'s `b` terminal from the model -
 * `R3.2`, whose `Net-(C7-Pad1)` has only `C7.1` besides it - and gives the export the placeholder
 * net KiCad would have produced for it. **Everything else about the two sides then agrees**:
 * `Net-(C7-Pad1)` is `[C7.1]` on both sides, and the only residue is one more one-member net.
 *
 * **A rule reading one-member nets as intentional no-connects passes this, and that is the defect
 * the third-party review of the spec identified.** Keying on the model's own `NC` declarations
 * refuses it, because `R3.2` is not declared `NC` and `U1.5` is.
 *
 * `[RAN]` the perturbation that proves it: with `declaredNc.has(only)` in `agreeOnNets` replaced
 * by `true` - the blanket rule, written out - this test FAILS and the two tests either side of it
 * still pass. Restore the line and all three pass. That is the check that could have failed.
 */
test("a terminal NOT declared NC, on its own placeholder net, is still refused", async () => {
  const imported = await built()
  const broken = withTerminalDropped(pt2399Core())
  // Not declared NC - which is the whole of why it must not be excused.
  expect(ncNodes(broken)).toEqual(new Set(["U1.5"]))
  const c7 = imported.nets["Net-(C7-Pad1)"]
  if (c7 === undefined) throw new Error("the netlist fixture has no Net-(C7-Pad1)")
  const asKicadWouldExportIt: Record<string, readonly string[]> = {
    ...imported.nets,
    "Net-(C7-Pad1)": c7.filter((m) => m !== "R3.2"),
    "unconnected-(R3-Pad2)": ["R3.2"],
  }
  expect(() =>
    agreeOnNets({
      ours: asDesignatorNets(broken, DESIGNATORS),
      exported: asKicadWouldExportIt,
      declaredNc: ncNodes(broken),
    }),
  ).toThrow(/net unconnected-\(R3-Pad2\) is in the netlist and missing from the model/)
})

/**
 * The simpler arm, kept for what it establishes and honest about what it does not: a terminal
 * dropped from the model with the export left alone is caught by comparing MEMBERS, and the
 * allowance never reaches it. It would still pass under the blanket rule, so it is not evidence
 * about the allowance - it is evidence that the comparison still has its original teeth.
 */
test("a terminal dropped from the model with the netlist untouched is caught on members", async () => {
  const imported = await built()
  const broken = withTerminalDropped(pt2399Core())
  expect(() =>
    agreeOnNets({
      ours: asDesignatorNets(broken, DESIGNATORS),
      exported: imported.nets,
      declaredNc: ncNodes(broken),
    }),
  ).toThrow(/missing from the model: R3\.2/)
})

/**
 * The other half of "keyed on the declaration": the allowance is for a pin the export shows on
 * NOTHING. A pin the model declares `NC` and the schematic wires to a rail is a contradiction
 * between the two authorities, and it must be refused rather than excused by the same declaration.
 */
test("a declared-NC pin the netlist shows WIRED is refused, not excused by its own declaration", async () => {
  const imported = await built()
  const network = pt2399Core()
  const gnd = imported.nets["GND"]
  if (gnd === undefined) throw new Error("the netlist fixture has no GND net")
  const wired: Record<string, readonly string[]> = Object.fromEntries(
    Object.entries(imported.nets).filter(([name]) => name !== "unconnected-(U1-CLK_O-Pad5)"),
  )
  wired["GND"] = [...gnd, "U1.5"].sort()
  expect(() =>
    agreeOnNets({
      ours: asDesignatorNets(network, DESIGNATORS),
      exported: wired,
      declaredNc: ncNodes(network),
    }),
  ).toThrow(/missing from the model: U1\.5/)
})

test("the designator map walks package pins, not only unit pins", () => {
  const withPackagePins: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("GND") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("FB") } }],
    }, {
      id: "load", kind: "resistor", parameters: { ohms: 1000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("VCC"), b: net("GND") } }],
    }],
    ports: { IN: "IN" },
  }
  const nets = asDesignatorNets(withPackagePins, { amp: "U9", load: "R9" })
  expect(nets["VCC"]).toContain("U9.v+")
  expect(nets["GND"]).toContain("U9.v-")
})

test("every component in the built unit is present, with its value", async () => {
  const imported = await built()
  const ours = pt2399Core()
  expect(ours.components).toHaveLength(imported.components.length)

  const byDesignator = new Map(ours.components.map((c) => [DESIGNATORS[c.id], c]))
  for (const c of imported.components) {
    const authored = byDesignator.get(c.designator)
    if (authored === undefined) {
      throw new Error(`no authored component maps to designator "${c.designator}"`)
    }

    const label = `${c.designator} (${authored.kind}, netlist value "${c.value}")`

    // The netlist's "value" field means something different per kind, and
    // that mapping is made explicit here rather than left implicit:
    //   - resistor / capacitor: value is a quantity -> compare to parameters.
    //   - ic: value is the part's genuine manufacturer part number
    //     (e.g. "PT2399") -> compare to part.mpn.
    //   - connector: value is a KiCad generic-connector *symbol* name
    //     (e.g. "Conn_01x05"), not a manufacturer part number -> compare to
    //     the part name half of part.symbol ("Lib:Part").
    // The final `else { throw }` guard means a future kind cannot silently
    // fall out of this check.
    if (authored.kind === "resistor" && "ohms" in authored.parameters) {
      const expected = parseValue(c.value)
      expect(authored.parameters.ohms, label).toBe(expected)
    } else if (authored.kind === "capacitor" && "farads" in authored.parameters) {
      const expected = parseValue(c.value)
      expect(authored.parameters.farads, label).toBe(expected)
    } else if (authored.kind === "ic") {
      expect(authored.part?.mpn, label).toBe(c.value)
    } else if (authored.kind === "connector") {
      const symbol = authored.part?.symbol
      const symbolPart = symbol?.split(":").at(-1)
      expect(symbolPart, label).toBe(c.value)
    } else {
      throw new Error(
        `component "${c.designator}" (kind "${authored.kind}") has no part ` +
          "identity this test knows how to compare",
      )
    }
  }
})

/**
 * The board was built from the VeroRoute netlist; the s-expression export came
 * from the same schematic 22 minutes later. Asserting they agree is what
 * licenses Plan C to use pt2399-core.kicad_sch as a fixture for a circuit known
 * to work. Net NAMES are ignored - the two exporters generate them differently
 * and only the partition carries electrical meaning.
 */
test("the schematic export describes the same circuit as the built board", async () => {
  const legacy = await built()
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())

  const partition = (n: { nets: Readonly<Record<string, readonly string[]>> }) =>
    Object.values(n.nets)
      .map((members) => [...members].sort().join(" "))
      .sort()

  expect(partition(modern)).toEqual(partition(legacy))

  const values = (cs: readonly { designator: string; value: string }[]) =>
    Object.fromEntries(cs.map((c) => [c.designator, c.value]))
  expect(values(modern.components)).toEqual(values(legacy.components))
})

test("every component's footprint matches the netlist of the built unit", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const byDesignator = new Map(modern.components.map((c) => [c.designator, c.footprint]))

  for (const component of pt2399Core().components) {
    const designator = DESIGNATORS[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    const expected = byDesignator.get(designator)
    if (expected === undefined) throw new Error(`${designator} is absent from the netlist`)
    expect(component.part?.footprint).toBe(expected)
  }
})

test("the parts-list conditions declare a RAIL BOUND, on a port this circuit actually has", async () => {
  const conditions = await bomConditions()
  // The arm, asserted rather than assumed: this board is NOT simulated, and the two
  // arms of BomConditions are not interchangeable.
  if (conditions.railBound === undefined) {
    throw new Error("pt2399-core bounds its resistor rating by the rail; it declares no environment")
  }
  expect(conditions.railBound.ratedWatts).toBe(0.25)
  // The owner's words are the basis, carried in the declaration and quoted in every
  // refusal it produces - not paraphrased into a bare number.
  expect(conditions.railBound.basis).toContain("5 volt dsp chip")
  expect(conditions.railBound.basis).toContain("1/4 watt")

  // THE DECLARATION IS TIED TO THE MODEL, which is the only sense in which the 5 V is
  // "read from" it: nothing in the model carries a voltage, but the PORT the rail sits
  // on is the model's, and the net that port names says what rail it is. Change either
  // and this fails.
  expect(conditions.railBound.supplies).toEqual([{ port: BOM_RAIL.port, volts: BOM_RAIL.volts }])
  expect(pt2399Core().ports[BOM_RAIL.port]).toBe("+5V")
  expect(BOM_RAIL.volts).toBe(5)
  expect(highestRailVolts(conditions)).toBe(5)
})

test("the rail bound covers every resistor on this board, with the margin computed not asserted", async () => {
  const conditions = await bomConditions()
  if (conditions.railBound === undefined) throw new Error("pt2399-core declares no railBound")
  const watts = railBoundResistorWatts(pt2399Core(), conditions.railBound, "pt2399-core")

  // All eight resistors, which is the count deriveNeeds requires a figure for.
  expect(watts.size).toBe(8)

  const threshold = railBoundMinimumOhms(BOM_RAIL.volts, conditions.railBound.ratedWatts)
  const resistors = pt2399Core().components.filter((c) => c.kind === "resistor")
  expect(resistors).toHaveLength(8)
  for (const resistor of resistors) {
    const ohms = "ohms" in resistor.parameters ? resistor.parameters.ohms : undefined
    if (ohms === undefined) throw new Error(`resistor "${resistor.id}" carries no ohms`)
    expect(ohms).toBeGreaterThan(threshold)
  }

  // The worst case on the board, and the rating it derives to: 2.7K is the smallest
  // resistor, 25/2700 = 9.26 mW, and requiredResistorWatts lands on the 1/4 W floor.
  const worst = Math.max(...watts.values())
  expect(worst).toBeCloseTo(25 / 2700, 9)
  expect(worst).toBeLessThan(0.01)
  expect(requiredResistorWatts(worst)).toBe(0.25)
})

test("the SIMULATION path is still unavailable for this board, which is why the bound is the route", async () => {
  // The two blockers the refusing export measured on 2026-10-30, re-measured against
  // the live code. They are the evidence that the rail bound is a narrower claim taken
  // because the stronger one cannot be made - not a cheaper route taken because it was
  // easier. THE DAY A PT2399 MODEL LANDS, (2) FAILS HERE: that is the signal to move
  // this board onto an operating point, which is tighter than a bound everywhere.
  const state: ControlState = { potPositions: {}, switchPositions: {} }

  // (1) The resolver wants a port keyed `ground` and this circuit keys it `gnd`. The
  // rail-bound path resolves nothing, so this now costs this board nothing at all.
  expect(() => resolveNetwork(pt2399Core(), state)).toThrow(/Missing ground port: ground/)

  // (2) With that renamed, the emitter refuses the PT2399 itself - the real blocker.
  const network = pt2399Core()
  const renamed: Network = { ...network, ports: { ...network.ports, ground: "GND" } }
  const resolved = resolveNetwork(renamed, state)
  const probeEnvironment = {
    source: { port: "input", amplitude: 0, seriesOhms: 1_000 },
    load: { port: "output", ohms: 100_000 },
    supplies: [{ port: "vcc", volts: 5 }],
    groundPort: "ground",
  }
  expect(() => toSpiceOperatingPointNetlist(resolved, probeEnvironment)).toThrow(
    /kind "ic" has no SPICE emission rule/,
  )
  // (3) The probe environment above is a STAND-IN living in this test and nowhere else:
  // this repository records nothing that drives INPUT or loads OUTPUT, and the rail-
  // bound arm the circuit declares carries no source and no load for that reason.
})

/**
 * **THE DECLARATION CAN FAIL, AND THIS IS THE ARM THAT PROVES IT ON THIS BOARD'S OWN
 * CIRCUIT RATHER THAN ON A FIXTURE.** A claimed rating nothing can contradict is a
 * sentence, not a check. `tests/bom/rail-bound.test.ts` holds the general refusals;
 * these two put the real pt2399-core network under them.
 */
test("a 47 ohm resistor added to THIS circuit is refused by name against the declared bound", async () => {
  const conditions = await bomConditions()
  if (conditions.railBound === undefined) throw new Error("pt2399-core declares no railBound")
  const network = pt2399Core()
  const withSmallResistor: Network = {
    ...network,
    components: [
      ...network.components,
      {
        id: "vco_trim_resistor", kind: "resistor", parameters: { ohms: 47 },
        pins: {}, units: [{ name: "MAIN", pins: { a: net("VCO"), b: net("GND") } }],
      },
    ],
  }
  expect(() => railBoundResistorWatts(withSmallResistor, conditions.railBound, "pt2399-core")).toThrow(
    /resistor "vco_trim_resistor" is 47 ohms, below the 200 ohms a 0\.25 W part covers/,
  )
})

test("raising the declared rail moves the threshold past this board's smallest resistor", async () => {
  const conditions = await bomConditions()
  if (conditions.railBound === undefined) throw new Error("pt2399-core declares no railBound")
  // Not a rail this board has - the point is that the bound TRACKS the rail. At 5 V the
  // threshold is 200 ohms and every resistor clears it; at 20 V it is 3200 ohms, which
  // is between this board's smallest resistor (2.7K) and its next smallest (10K), so
  // the refusal names exactly the one part the moved threshold caught.
  expect(railBoundMinimumOhms(BOM_RAIL.volts, 0.25)).toBeCloseTo(200, 9)
  const raised = { ...conditions.railBound, supplies: [{ port: BOM_RAIL.port, volts: 20 }] }
  expect(railBoundMinimumOhms(20, 0.25)).toBeCloseTo(3200, 9)
  expect(() => railBoundResistorWatts(pt2399Core(), raised, "pt2399-core")).toThrow(
    /resistor "output_mix_resistor" is 2700 ohms, below the 3200 ohms a 0\.25 W part covers/,
  )
})
