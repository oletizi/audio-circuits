/**
 * A board's circuit, indexed the way a layout dump is keyed: by reference
 * designator.
 *
 * A layout dump knows refs, VeroRoute types and values; it does not know what
 * a part IS (a transistor, a trim-pot, a panel pot on a header) or which of a
 * header's pins is the input. Those are facts about the circuit, so they come
 * from the board's declared circuit module - the same module, export,
 * DESIGNATORS and PIN_NUMBERS every other verb reads - and never from a guess
 * made from the ref's letters.
 *
 * This is the generic part any consumer needs (the build guide, the parts-
 * list tool): it knows nothing about power-up checks, which are a build-guide
 * concept layered on top in tools/guide/circuit.ts.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { assertDesignators, assertPinNumbers } from "./circuit-exports.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { circuitFromModule, importCircuitModule } from "./load.ts"

export interface BoardCircuit {
  /** Reference designator -> the circuit component it names. */
  readonly byRef: ReadonlyMap<string, Component>
  /** Port name -> net name, from the circuit. */
  readonly ports: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
}

/** Index a network's components by designator, refusing a component with none. */
export function boardCircuitFrom(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
): BoardCircuit {
  const byRef = new Map<string, Component>()
  for (const component of network.components) {
    const ref = designators[component.id]
    if (ref === undefined) {
      throw new Error(
        `component "${component.id}" has no designator in the circuit's DESIGNATORS, so it ` +
          "cannot be matched to a board built from this circuit. Add it to DESIGNATORS.",
      )
    }
    byRef.set(ref, component)
  }
  return { byRef, ports: network.ports, pinNumbers }
}

/**
 * A panel pot: a potentiometer whose board-side part is a connector (a pin
 * header the off-board pot is wired to), not a pot mounted on the board.
 */
export function isPanelPot(component: Component): boolean {
  return component.kind === "potentiometer" && (component.part?.footprint ?? "").startsWith("Connector_")
}

/** Load the declared circuit module (imported once) and read everything a generic consumer needs from it. */
export async function loadBoardCircuit(declaration: PerfboardDeclaration): Promise<BoardCircuit> {
  const module = await importCircuitModule(declaration)
  return boardCircuitFrom(
    circuitFromModule(module, declaration),
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
  )
}
