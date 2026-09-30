/**
 * What the build guide needs to know about a board's circuit, keyed the way
 * the layout dump is keyed: by reference designator.
 *
 * The generic indexing (`byRef`, `ports`, `pinNumbers`) lives in
 * `tools/perfboard/board-circuit.ts`, which knows nothing about power-up
 * checks. The guide is the one consumer that cares about them, so it augments
 * the generic `BoardCircuit` with its own `powerUpChecks`, obtained here by
 * reading the module's `declaredPowerUpChecks()` itself.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import {
  boardCircuitFrom as perfboardBoardCircuitFrom,
  isPanelPot,
  type BoardCircuit as PerfboardBoardCircuit,
} from "../perfboard/board-circuit.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/circuit-exports.ts"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { circuitFromModule, importCircuitModule } from "../perfboard/load.ts"
import type { BoardDump } from "./dump.ts"
import { declaredPowerUpChecks, type PowerUpChecks } from "./power-up.ts"

export { isPanelPot }

export interface BoardCircuit extends PerfboardBoardCircuit {
  /** The module's power-up table; `undefined` when it declares none. */
  readonly powerUpChecks: PowerUpChecks | undefined
}

/** Index a network's components by designator, pairing it with its power-up checks. */
export function boardCircuitFrom(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  powerUpChecks: PowerUpChecks | undefined,
): BoardCircuit {
  return { ...perfboardBoardCircuitFrom(network, designators, pinNumbers), powerUpChecks }
}

/** Load the declared circuit module (imported once) and read everything the guide needs from it. */
export async function loadBoardCircuit(declaration: PerfboardDeclaration): Promise<BoardCircuit> {
  const module = await importCircuitModule(declaration)
  const circuit = perfboardBoardCircuitFrom(
    circuitFromModule(module, declaration),
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
  )
  return { ...circuit, powerUpChecks: await declaredPowerUpChecks(module, declaration.circuitPath) }
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
