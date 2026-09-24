import { test, expect } from "bun:test"
import {
  transistorPreampLab, DESIGNATORS, PIN_NUMBERS, LEGS,
} from "../../circuits/transistor-preamp/index.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component } from "../../lib/model/types.ts"
import {
  SETTINGS, REMOVED, controlStateFor, legPosition, schematicNotes,
} from "../../circuits/transistor-preamp/index.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import { acSweepOf } from "../sim/helpers.ts"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"

function byId(id: string): Component {
  const found = transistorPreampLab().components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`the lab board declares no "${id}"`)
  return found
}

function netOf(component: Component, pin: string): string {
  const connection = component.units[0]?.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

test("the lab board validates, and every part has exactly one designator", () => {
  const network = transistorPreampLab()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  expect(network.components.length).toBe(32)
})

test("every part names a symbol and a footprint", () => {
  for (const component of transistorPreampLab().components) {
    expect(component.part?.symbol).toBeDefined()
    expect(component.part?.footprint).toBeDefined()
  }
})

test("every trim-pot is a rheostat: its wiper is strapped to its cw end", () => {
  for (const leg of Object.values(LEGS)) {
    const trim = byId(leg.trimId)
    expect(netOf(trim, "wiper")).toBe(netOf(trim, "cw"))
    expect(netOf(trim, "ccw")).not.toBe(netOf(trim, "cw"))
  }
})

test("each electrolytic's + terminal (pin a) faces the higher DC node", () => {
  expect(netOf(byId("input_coupling_cap"), "a")).toBe("BASE")
  expect(netOf(byId("output_coupling_cap"), "a")).toBe("COLLECTOR")
  expect(netOf(byId("emitter_bypass_cap"), "a")).toBe("BYPASS_JUMPED")
  expect(netOf(byId("supply_decoupling_cap"), "a")).toBe("VCC")
})

test("the board lowers to a VeroRoute netlist with the new fixed-shape types", () => {
  const lowered = toImportedNetlist(transistorPreampLab(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q1")).toBe("TO92")
  expect(typeOf("RV2")).toBe("TRIM_FLAT")
  expect(typeOf("TP1")).toBe("SIP1")
  expect(typeOf("JP1")).toBe("SIP2")
})

test("a leg's ohms convert to a wiper position and back; out-of-range ohms throw", () => {
  expect(legPosition(LEGS.upper, 47_000)).toBe(0)
  expect(legPosition(LEGS.upper, 97_000)).toBe(1)
  expect(legPosition(LEGS.upper, 80_000)).toBeCloseTo(0.66, 10)
  expect(legPosition(LEGS.emitterBypass, 0)).toBe(0)
  expect(() => legPosition(LEGS.upper, 46_000)).toThrow(/upper_bias_trim/)
  expect(() => legPosition(LEGS.upper, 98_000)).toThrow(/upper_bias_trim/)
})

test("every setting resolves, and taking out a leg with no jumper throws", () => {
  for (const setting of SETTINGS) {
    expect(() => resolveNetwork(transistorPreampLab(), controlStateFor(setting))).not.toThrow()
  }
  const [first] = SETTINGS
  if (first === undefined) throw new Error("no settings declared")
  expect(() => controlStateFor({ ...first, legs: { ...first.legs, collector: REMOVED } }))
    .toThrow(/collector/)
})

test("the schematic notes list every setting with its jumpers", () => {
  const text = schematicNotes().join("\n")
  for (const setting of SETTINGS) expect(text).toContain(setting.name)
  for (const jumper of ["JP1", "JP2", "JP3", "JP4", "JP5"]) expect(text).toContain(jumper)
})

test("the schematic notes show a trim's leg total AND the pot-only value, not the leg total under the pot's designator", () => {
  // RV1 (upper_bias_trim) is a 50k trim in series with a 47k fixed floor. The
  // nominal setting asks for 80k of leg resistance, so RV1 itself must be set
  // to 33k (80k minus the 47k floor) - printing "RV1 80k" would send someone
  // to the bench to dial in the wrong number on the pot itself.
  const text = schematicNotes().join("\n")
  expect(text).toContain("RV1 leg 80k (trim 33k)")
})

/**
 * Sanity bounds, not predictions. The board is a bench instrument; these catch
 * wiring and generation errors. Source: 1 V AC ideal (so the load node reads
 * the gain directly). Load: the brief's 100k measurement load. Supply: the
 * brief's 9 V.
 */
const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 100_000 },
  supplies: [{ port: "vcc", volts: 9 }],
  sweep: { pointsPerDecade: 10, startHz: 100, stopHz: 10_000 },
  groundPort: "ground",
}

const EMITTER_DC_OHMS = 1500

for (const setting of SETTINGS) {
  test(`${setting.name}: the transistor is biased into its active region`, async () => {
    const deck = toSpiceOperatingPointNetlist(
      resolveNetwork(transistorPreampLab(), controlStateFor(setting)), ENVIRONMENT)
    const [emitter, collector] = [spiceNodeName("EMITTER"), spiceNodeName("COLLECTOR")]
    const v = await runOperatingPoint({ netlist: deck, nodes: [emitter, collector] })
    const ve = v[emitter]
    const vc = v[collector]
    if (ve === undefined || vc === undefined) throw new Error("operating point is missing a node")
    expect(ve / EMITTER_DC_OHMS).toBeGreaterThan(1e-4)
    expect(vc - ve).toBeGreaterThan(1)
  })

  test(`${setting.name}: the stage inverts with gain greater than one at 1 kHz`, async () => {
    const sweep = await acSweepOf(transistorPreampLab(), controlStateFor(setting), ENVIRONMENT)
    const nearest = [...sweep.points].sort(
      (a, b) => Math.abs(a.frequency - 1000) - Math.abs(b.frequency - 1000))[0]
    if (nearest === undefined) throw new Error("the sweep returned no points")
    const gain = Math.hypot(nearest.real, nearest.imaginary)
    const phase = (Math.atan2(nearest.imaginary, nearest.real) * 180) / Math.PI
    expect(Number.isFinite(gain)).toBe(true)
    expect(gain).toBeGreaterThan(1)
    expect(Math.abs(phase)).toBeGreaterThan(135)
  })
}

/**
 * Duplicates the default `KICAD_CLI ?= ...` line in make/board.mk (the value
 * that recipe's `netlist-agrees` target falls back to) because a shared
 * constant across make and TypeScript is not possible; keep the two in sync
 * by hand if either changes. The `KICAD_CLI` env var overrides both.
 */
const KICAD_CLI = process.env["KICAD_CLI"] ?? "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

/** Nets as a partition of "designator.pin" members, ignoring net names. */
function partition(netlist: Pick<ImportedNetlist, "nets">): string[] {
  return Object.values(netlist.nets).map((members) => [...members].sort().join(" ")).sort()
}

function valuesOf(netlist: Pick<ImportedNetlist, "components">): Record<string, string> {
  return Object.fromEntries(netlist.components.map((c) => [c.designator, c.value]))
}

/** Asserts a KiCad netlist export describes exactly the lab board. */
function expectSameCircuit(exported: ImportedNetlist): void {
  const network = transistorPreampLab()
  const ours = toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS)
  expect(partition(exported)).toEqual(partition(ours))
  expect(valuesOf(exported)).toEqual(valuesOf(ours))
  const footprints = new Map(exported.components.map((c) => [c.designator, c.footprint]))
  for (const component of network.components) {
    expect(footprints.get(DESIGNATORS[component.id] ?? "")).toBe(component.part?.footprint)
  }
}

test("KiCad reads the generated stub as the same circuit", () => {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This test ` +
        "does not skip: it is the only proof KiCad reads the stub the way the circuit means it.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lab-board-stub-"))
  try {
    const sch = path.join(dir, "lab-board.kicad_sch")
    fs.writeFileSync(sch, writeSchematicStub({
      network: transistorPreampLab(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
      notes: schematicNotes(), projectName: "lab-board", newUuid: randomUUID,
    }))
    const net = path.join(dir, "lab-board.net")
    defaultRunExport(KICAD_CLI, sch, net, dir)
    expectSameCircuit(importNetlist(fs.readFileSync(net, "utf8")))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 30_000)

test("the schematic's netlist export describes the same circuit as the model", async () => {
  expectSameCircuit(importNetlist(await Bun.file("tests/fixtures/transistor-preamp-lab.net").text()))
})
