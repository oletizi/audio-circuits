/**
 * A KiCad schematic STUB, written once from a canonical Network.
 *
 * Every part is placed on a plain grid with its symbol, reference, value and
 * footprint, and every pin is carried by a short wire to a net label, so
 * connectivity is carried entirely by labels. That is a starting point, not a
 * drawing: the operator arranges it in KiCad and owns it from then on. After
 * that, only electrical equivalence to the Network is ever enforced (through
 * the exported netlist); positions, wires, labels and text are the operator's.
 *
 * Symbols come from lib/kicad/symbols/ (vendored), never from an installed
 * KiCad, so the output does not depend on the machine.
 */
import type { Component, Connection, Network } from "../model/types.ts"
import { pinNumberFor } from "./from-network.ts"
import type { PinNumbers } from "./from-network.ts"
import { embeddedSymbol, symbolPins, vendoredSymbolText } from "./symbol-library.ts"
import type { SymbolPin } from "./symbol-library.ts"
import { valueFor } from "./value-notation.ts"

export interface SchematicStubInput {
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
  /** Lines of the text block placed below the parts. */
  readonly notes: readonly string[]
  /** The schematic file's stem; symbol instances are recorded under it. */
  readonly projectName: string
  readonly newUuid: () => string
}

/** The file format KiCad 10.0 wrote circuits/pt2399-core/pt2399-core.kicad_sch in. */
const FORMAT_VERSION = "20260306"
const GRID = 30.48
const COLUMNS = 10
const ORIGIN = 30.48
const STUB = 2.54
const FONT = "(effects (font (size 1.27 1.27)))"

function quote(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`
}

/** Millimetres as KiCad writes them, with float noise (cos 90 = 6e-17) rounded away. */
function mm(value: number): string {
  return String(Number(value.toFixed(4)))
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

/** Symbol pin number -> this component's connection on it. */
function connectionsByNumber(component: Component, pinNumbers: PinNumbers): Map<string, Connection> {
  const byNumber = new Map<string, Connection>()
  const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
  for (const group of groups) {
    for (const [pin, connection] of Object.entries(group)) {
      const number = pinNumberFor(component, pin, pinNumbers)
      if (byNumber.has(number)) {
        throw new Error(`component "${component.id}" maps two pins to symbol pin ${number}`)
      }
      byNumber.set(number, connection)
    }
  }
  return byNumber
}

function assertPinsAgree(
  component: Component,
  libId: string,
  pins: readonly SymbolPin[],
  connections: ReadonlyMap<string, Connection>,
): void {
  const onSymbol = new Set(pins.map((p) => p.number))
  for (const number of connections.keys()) {
    if (!onSymbol.has(number)) {
      throw new Error(
        `component "${component.id}" uses pin ${number}, which symbol ${libId} does not have ` +
          `(it has ${[...onSymbol].join(", ")}). Check PIN_NUMBERS or the part's symbol.`,
      )
    }
  }
  for (const number of onSymbol) {
    if (!connections.has(number)) {
      throw new Error(
        `symbol ${libId} pin ${number} on component "${component.id}" is not connected in the ` +
          "circuit. Declare it NC if it is deliberately unconnected; an omission is not a no-connect.",
      )
    }
  }
}

export function writeSchematicStub(input: SchematicStubInput): string {
  const root = input.newUuid()
  // Placed in the circuit's declaration order (input.network.components is
  // already that order - Builder.add() only ever pushes), NOT sorted by
  // designator: a designator sort groups by part type instead of by leg,
  // scattering a leg's jumper/floor/trim across the grid. Declaration order
  // keeps each leg's parts together (spec §4.3).
  const placed = input.network.components
    .map((component) => ({
      component,
      designator: required(
        input.designators[component.id],
        `component "${component.id}" has no designator in DESIGNATORS; a schematic symbol needs one`,
      ),
    }))

  const libIds = new Set<string>()
  const body: string[] = []

  placed.forEach(({ component, designator }, index) => {
    const libId = required(
      component.part?.symbol,
      `component "${component.id}" has no part.symbol, so the stub has no symbol to place for it`,
    )
    const footprint = required(
      component.part?.footprint,
      `component "${component.id}" has no part.footprint; the stub carries it to KiCad`,
    )
    libIds.add(libId)
    const pins = symbolPins(vendoredSymbolText(libId))
    const connections = connectionsByNumber(component, input.pinNumbers)
    assertPinsAgree(component, libId, pins, connections)

    const x = ORIGIN + (index % COLUMNS) * GRID
    const y = ORIGIN + Math.floor(index / COLUMNS) * GRID
    const at = `${mm(x)} ${mm(y)}`
    body.push([
      "\t(symbol",
      `\t\t(lib_id ${quote(libId)})`,
      `\t\t(at ${at} 0)`,
      "\t\t(unit 1)",
      "\t\t(exclude_from_sim no)",
      "\t\t(in_bom yes)",
      "\t\t(on_board yes)",
      "\t\t(dnp no)",
      `\t\t(uuid ${quote(input.newUuid())})`,
      `\t\t(property "Reference" ${quote(designator)} (at ${mm(x + 5.08)} ${mm(y - 1.27)} 0) ` +
        "(effects (font (size 1.27 1.27)) (justify left)))",
      `\t\t(property "Value" ${quote(valueFor(component))} (at ${mm(x + 5.08)} ${mm(y + 1.27)} 0) ` +
        "(effects (font (size 1.27 1.27)) (justify left)))",
      `\t\t(property "Footprint" ${quote(footprint)} (at ${at} 0) (hide yes) ${FONT})`,
      `\t\t(property "Datasheet" "" (at ${at} 0) (hide yes) ${FONT})`,
      ...pins.map((pin) => `\t\t(pin ${quote(pin.number)} (uuid ${quote(input.newUuid())}))`),
      `\t\t(instances (project ${quote(input.projectName)} (path ${quote(`/${root}`)} ` +
        `(reference ${quote(designator)}) (unit 1))))`,
      "\t)",
    ].join("\n"))

    for (const pin of pins) {
      const connection = required(connections.get(pin.number), `pin ${pin.number} vanished`)
      // Symbol coordinates are y-up; the schematic is y-down.
      const px = x + pin.x
      const py = y - pin.y
      if (connection.kind === "nc") {
        body.push(`\t(no_connect (at ${mm(px)} ${mm(py)}) (uuid ${quote(input.newUuid())}))`)
        continue
      }
      // The pin's angle points into the body; the stub goes the other way.
      const radians = (pin.angle * Math.PI) / 180
      const ex = px - STUB * Math.cos(radians)
      const ey = py + STUB * Math.sin(radians)
      body.push(
        `\t(wire (pts (xy ${mm(px)} ${mm(py)}) (xy ${mm(ex)} ${mm(ey)})) ` +
          `(stroke (width 0) (type default)) (uuid ${quote(input.newUuid())}))`,
      )
      body.push(
        `\t(label ${quote(connection.net)} (at ${mm(ex)} ${mm(ey)} 0) ` +
          `(effects (font (size 1.27 1.27)) (justify left bottom)) (uuid ${quote(input.newUuid())}))`,
      )
    }
  })

  const rows = Math.ceil(placed.length / COLUMNS)
  if (input.notes.length > 0) {
    body.push(
      `\t(text ${quote(input.notes.join("\n"))} (exclude_from_sim no) ` +
        `(at ${mm(ORIGIN)} ${mm(ORIGIN + rows * GRID)} 0) ` +
        `(effects (font (size 1.27 1.27)) (justify left top)) (uuid ${quote(input.newUuid())}))`,
    )
  }

  const embedded = [...libIds].sort().map((libId) => embeddedSymbol(libId, vendoredSymbolText(libId).trimEnd()))
  return [
    "(kicad_sch",
    `\t(version ${FORMAT_VERSION})`,
    '\t(generator "audio-circuits")',
    '\t(generator_version "10.0")',
    `\t(uuid ${quote(root)})`,
    '\t(paper "A3")',
    "\t(lib_symbols",
    ...embedded,
    "\t)",
    ...body,
    '\t(sheet_instances (path "/" (page "1")))',
    "\t(embedded_fonts no)",
    ")",
    "",
  ].join("\n")
}
