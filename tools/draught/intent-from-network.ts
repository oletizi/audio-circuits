/**
 * Lower a canonical `Network` to a copperhead intent - for a MODEL-AUTHORITATIVE
 * board, where the drawing is derived from the circuit (`TOOLING.md` step 0).
 *
 * Every fact the intent carries except the grouping is already in the model:
 * refs from the circuit's `DESIGNATORS`, symbols from each part's `symbol`,
 * pin numbers through `pinNumberFor` (the same mapping `toImportedNetlist`
 * uses), and values through `valueFor` (the netlist's own spelling). The
 * grouping and the net kinds are drawing inputs, supplied by the circuit's
 * drawing file. A hand-typed intent would be a second copy of the circuit, and
 * a second place for it to be wrong.
 *
 * Pultec intents are NOT made here: that circuit is schematic-authoritative,
 * and its intents were transcribed from a netlist.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import { pinNumberFor, type PinNumbers } from "../../lib/kicad/from-network.ts"
import { pinKey } from "../../lib/kicad/unit-pins.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"

export type NetKind = "ground" | "power"

/** What a circuit's drawing file supplies: the one thing the model cannot. */
export interface DrawingInputs {
  /** The group every part is placed in. copperhead draws it as one captioned box. */
  readonly group: string
  /** Nets copperhead should draw as ground or power symbols, by net name. */
  readonly netKinds: Readonly<Record<string, NetKind>>
}

export interface CopperheadIntentPart {
  readonly ref: string
  readonly libId: string
  readonly value: string
  readonly group: string
}

/**
 * A net's kind in the intent. `signal` is copperhead's own override of its name-based inference
 * (`draughting/copperhead/src/kicad/draft/ir.ts`, `IntentNet.kind`): without it a net named `GND`
 * or `3V3` is drawn as a power symbol whatever the circuit means. A one-page board never writes
 * it; a block page (`./drawing-pages.ts`) writes it on every net, because a power symbol joins
 * every sheet of a hierarchy by name.
 */
export type IntentNetKind = NetKind | "signal"

export interface CopperheadIntentNet {
  readonly name: string
  readonly kind?: IntentNetKind
  readonly pins: readonly string[]
}

/** copperhead's `schematic.intent.json`, version 1, as far as this repository writes it. */
export interface CopperheadIntent {
  readonly version: 1
  readonly parts: readonly CopperheadIntentPart[]
  readonly nets: readonly CopperheadIntentNet[]
  readonly noConnect: readonly string[]
  readonly hints: { readonly groupOrder: readonly string[] }
}

function refFor(component: Component, designators: Readonly<Record<string, string>>): string {
  const ref = designators[component.id]
  if (ref === undefined) {
    throw new Error(
      `no designator mapped for component "${component.id}". Add it to the circuit's DESIGNATORS ` +
        "map: an intent part is named by its reference designator, and inventing one would put a " +
        "part on the drawing that no board or netlist knows by that name.",
    )
  }
  return ref
}

function libIdFor(component: Component): string {
  const symbol = component.part?.symbol
  if (symbol === undefined) {
    throw new Error(
      `component "${component.id}" has no part.symbol. copperhead draws each part from the KiCad ` +
        "symbol its intent names, so the symbol is set on the part (e.g. RESISTOR in " +
        "circuits/transistor-preamp/parts.ts) rather than guessed from the component's kind.",
    )
  }
  return symbol
}

export function intentFromNetwork(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  inputs: DrawingInputs,
): CopperheadIntent {
  const parts: CopperheadIntentPart[] = []
  const nets = new Map<string, string[]>()
  const noConnect: string[] = []
  const owner = new Map<string, string>()

  for (const component of network.components) {
    const ref = refFor(component, designators)
    const previous = owner.get(ref)
    if (previous !== undefined) {
      throw new Error(
        `components "${previous}" and "${component.id}" both map to designator "${ref}" in ` +
          "DESIGNATORS. Two parts drawn under one reference would merge on the page and in the " +
          "netlist copperhead writes back.",
      )
    }
    owner.set(ref, component.id)
    parts.push({ ref, libId: libIdFor(component), value: valueFor(component), group: inputs.group })

    // A multi-unit package's unit pins are keyed by unit (`pinKey`), so each section reaches its
    // own pins through `part.symbolPins` (spec C6); every other pin keeps its own name.
    for (const group of [{ unit: undefined, pins: component.pins }, ...component.units.map((unit) => ({ unit, pins: unit.pins }))]) {
      for (const [pin, connection] of Object.entries(group.pins)) {
        const member = `${ref}.${pinNumberFor(component, pinKey(component, group.unit, pin), pinNumbers)}`
        if (connection.kind === "nc") {
          noConnect.push(member)
          continue
        }
        const members = nets.get(connection.net) ?? []
        members.push(member)
        nets.set(connection.net, members)
      }
    }
  }

  for (const name of Object.keys(inputs.netKinds)) {
    if (!nets.has(name)) {
      throw new Error(
        `the drawing inputs declare a kind for net "${name}", which this circuit does not have. ` +
          `Its nets are: ${[...nets.keys()].sort().join(", ")}. A kind on a net that does not ` +
          "exist is a drawing file that has drifted from its circuit.",
      )
    }
  }

  const intentNets = [...nets.keys()].sort().map((name): CopperheadIntentNet => {
    const pins = (nets.get(name) ?? []).sort()
    const kind = inputs.netKinds[name]
    return kind === undefined ? { name, pins } : { name, kind, pins }
  })

  return { version: 1, parts, nets: intentNets, noConnect: noConnect.sort(), hints: { groupOrder: [inputs.group] } }
}
