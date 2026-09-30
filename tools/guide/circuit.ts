/**
 * What the build guide needs to know about a board's circuit, keyed the way
 * the layout dump is keyed: by reference designator.
 *
 * The dump knows refs, VeroRoute types and values; it does not know what a
 * part IS (a transistor, a trim-pot, a panel pot on a header) or which of a
 * header's pins is the input. Those are facts about the circuit, so they
 * come from the board's declared circuit module - the same module, export,
 * DESIGNATORS and PIN_NUMBERS every other verb reads - and never from a
 * guess made from the ref's letters.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/check.ts"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { circuitFromModule, importCircuitModule } from "../perfboard/load.ts"
import type { BoardDump } from "./dump.ts"
import { declaredPowerUpChecks, type PowerUpCheck } from "./power-up.ts"

export interface BoardCircuit {
  /** Reference designator -> the circuit component it names. */
  readonly byRef: ReadonlyMap<string, Component>
  /** Port name -> net name, from the circuit. */
  readonly ports: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
  /** The module's power-up checks; `undefined` when it declares none. */
  readonly powerUpChecks: readonly PowerUpCheck[] | undefined
}

/** Index a network's components by designator, refusing a component with none. */
export function boardCircuitFrom(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  powerUpChecks: readonly PowerUpCheck[] | undefined,
): BoardCircuit {
  const byRef = new Map<string, Component>()
  for (const component of network.components) {
    const ref = designators[component.id]
    if (ref === undefined) {
      throw new Error(
        `component "${component.id}" has no designator in the circuit's DESIGNATORS, so the ` +
          "guide cannot find it on the board. Add it to DESIGNATORS.",
      )
    }
    byRef.set(ref, component)
  }
  return { byRef, ports: network.ports, pinNumbers, powerUpChecks }
}

/**
 * A panel pot: a potentiometer whose board-side part is a connector (a pin
 * header the off-board pot is wired to), not a pot mounted on the board.
 */
export function isPanelPot(component: Component): boolean {
  return component.kind === "potentiometer" && (component.part?.footprint ?? "").startsWith("Connector_")
}

/** Load the declared circuit module (imported once) and read everything the guide needs from it. */
export async function loadBoardCircuit(declaration: PerfboardDeclaration): Promise<BoardCircuit> {
  const module = await importCircuitModule(declaration)
  return boardCircuitFrom(
    circuitFromModule(module, declaration),
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
    await declaredPowerUpChecks(module, declaration.circuitPath),
  )
}

/**
 * The one check that the layout and the circuit hold the same parts, in
 * both directions: every circuit component is on the board, and every
 * board part is a circuit component. Either gap means the `.vrt` is out of
 * step with the circuit, and a packet built from it would leave a part out
 * or list one the circuit does not have. Every other guide step looks parts
 * up on the assumption that this has passed.
 */
export function assertLayoutMatchesCircuit(dump: BoardDump, circuit: BoardCircuit): void {
  const onBoard = new Set(dump.parts.map((part) => part.ref))
  const notOnBoard = [...circuit.byRef.keys()].filter((ref) => !onBoard.has(ref)).sort()
  const notInCircuit = [...onBoard].filter((ref) => !circuit.byRef.has(ref)).sort()
  if (notOnBoard.length === 0 && notInCircuit.length === 0) return
  const lines = [
    "the layout and the circuit do not hold the same parts, so a build packet would be wrong:",
    ...(notOnBoard.length > 0 ? [`  in the circuit but not on the board: ${notOnBoard.join(", ")}`] : []),
    ...(notInCircuit.length > 0 ? [`  on the board but not in the circuit: ${notInCircuit.join(", ")}`] : []),
    "Bring the .vrt in step with the circuit's netlist (`make update`), place any new parts in " +
      "VeroRoute (`make edit`), save, then run this again.",
  ]
  throw new Error(lines.join("\n"))
}

/** The circuit component at `ref`; only valid after `assertLayoutMatchesCircuit`. */
export function componentAt(circuit: BoardCircuit, ref: string): Component {
  const component = circuit.byRef.get(ref)
  if (component === undefined) {
    throw new Error(
      `${ref} has no circuit component. assertLayoutMatchesCircuit must run before this lookup ` +
        "(internal error in tools/guide).",
    )
  }
  return component
}
