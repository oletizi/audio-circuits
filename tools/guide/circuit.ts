/**
 * What the build guide needs to know about a board's circuit, keyed the way
 * the layout dump is keyed: by reference designator.
 *
 * The generic indexing (`byRef`, `ports`, `pinNumbers`) lives in
 * `tools/perfboard/board-circuit.ts`, which knows nothing about power-up
 * checks or stand-in groups. The guide is the one consumer that cares about
 * them, so it augments the generic `BoardCircuit` with its own
 * `powerUpChecks` and `scaffold`, each obtained here by reading the module's
 * own export directly - `declaredPowerUpChecks()` for the former,
 * `declaredScaffold()` (below) for the latter, following the same shape.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { asScaffoldDoc, type ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import {
  boardCircuitFrom as perfboardBoardCircuitFrom,
  isPanelPot,
  type BoardCircuit as PerfboardBoardCircuit,
} from "../perfboard/board-circuit.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/circuit-exports.ts"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { circuitFromModule, importCircuitModule } from "../perfboard/load.ts"
import type { BoardDump } from "./dump.ts"
import type { PadTerminal } from "./pads.ts"
import { declaredPowerUpChecks, type PowerUpChecks } from "./power-up.ts"

export { isPanelPot }

export interface BoardCircuit extends PerfboardBoardCircuit {
  /** The module's power-up table; `undefined` when it declares none. */
  readonly powerUpChecks: PowerUpChecks | undefined
  /**
   * The module's stand-in groups; `undefined` when it declares none.
   *
   * NOT defaulted to an empty `ScaffoldDoc`. An empty doc (`groups: []`)
   * asserts "this board has no groups to populate"; `undefined` says "this
   * board declares no SCAFFOLD at all" - true of `pt2399-core` and the
   * transistor-preamp boards, which are not Pultec sections and have no
   * absent neighbours to stand in for. Those are different claims, so the
   * second is never collapsed into the first.
   */
  readonly scaffold: ScaffoldDoc | undefined
}

/** Index a network's components by designator, pairing it with its power-up checks and scaffold doc. */
export function boardCircuitFrom(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  powerUpChecks: PowerUpChecks | undefined,
  scaffold: ScaffoldDoc | undefined,
): BoardCircuit {
  return { ...perfboardBoardCircuitFrom(network, designators, pinNumbers), powerUpChecks, scaffold }
}

/**
 * The board's stand-in groups, read directly off the module's `SCAFFOLD`
 * export. `undefined` when it exports none; see the field comment on
 * `BoardCircuit.scaffold` for why that is not defaulted to an empty doc.
 * A malformed export is refused here, at load, naming `where` (the
 * module's circuit path) - never silently reaching render.
 */
function declaredScaffold(module: Readonly<Record<string, unknown>>, where: string): ScaffoldDoc | undefined {
  const exported = module["SCAFFOLD"]
  if (exported === undefined) return undefined
  return asScaffoldDoc(exported, where)
}

/** Load the declared circuit module (imported once) and read everything the guide needs from it. */
export async function loadBoardCircuit(declaration: PerfboardDeclaration): Promise<BoardCircuit> {
  const module = await importCircuitModule(declaration)
  const circuit = perfboardBoardCircuitFrom(
    circuitFromModule(module, declaration),
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
  )
  return {
    ...circuit,
    powerUpChecks: await declaredPowerUpChecks(module, declaration.circuitPath),
    scaffold: declaredScaffold(module, declaration.circuitPath),
  }
}

/**
 * **A CONTROL MAY NOT REACH THE BOARD BOTH WAYS.** A panel control
 * legitimately reaches a board as a header `PART` with `PIN` lines
 * (`./off-board.ts`) or as landing `PAD` lines (`./pads.ts`) - the module
 * comment on `assertLayoutMatchesCircuit` below states both are counted as
 * present for exactly that reason. A ref carrying BOTH is not a legitimate
 * third representation; it is the same control wired, or counted, twice,
 * and nothing downstream expects it - `offBoardLabels` would emit edge
 * labels for the header's pins while the pad renderer drew the same ref's
 * terminals again. This check runs ahead of the membership comparison below
 * because a doubled ref is "on the board" by both counts and would otherwise
 * pass that comparison silently.
 */
function assertNoControlReachesTwice(dump: BoardDump, pads: readonly PadTerminal[]): void {
  const partRefs = new Set(dump.parts.map((part) => part.ref))
  const padRefs = new Set(pads.map((pad) => pad.ref))
  const doubled = [...partRefs].filter((ref) => padRefs.has(ref)).sort()
  if (doubled.length === 0) return
  const plural = doubled.length > 1
  throw new Error(
    [
      `${doubled.join(", ")} ${plural ? "reach" : "reaches"} the board twice: ` +
        `${plural ? "each has" : "it has"} both a PART line (a header, read by tools/guide/off-board.ts) ` +
        "and PAD lines (landing pads, read by tools/guide/pads.ts) naming it, so one control is wired - " +
        "or counted - twice.",
      "A panel control reaches the board as a header PART or as landing PADs, never both. Remove " +
        "whichever representation is wrong from the .vrt in VeroRoute (`make edit`), save, then run " +
        "this again.",
    ].join("\n"),
  )
}

/**
 * The one check that the layout and the circuit hold the same parts, in
 * both directions: every circuit component is on the board, and every
 * board part is a circuit component. Either gap means the `.vrt` is out of
 * step with the circuit, and a packet built from it would leave a part out
 * or list one the circuit does not have. Every other guide step looks parts
 * up on the assumption that this has passed.
 *
 * **A PAD COUNTS AS ON THE BOARD, EVEN THOUGH IT HAS NO `PART` LINE.** `dump`
 * carries no `PAD` lines at all (`./dump.ts`'s own module comment), so a
 * pads-only control - an off-board panel pot or switch, expanded into one
 * one-hole `PAD` per terminal - was invisible to this check and refused by
 * name as missing, although every one of its terminals was on the board.
 * `pads` is read from the dump TEXT by `./pads.ts` for exactly that reason,
 * and its `PadTerminal.ref` is the circuit's own ref (read off each pad's
 * `FROM <ref>.<pin>` field), not the fork's invented per-pad board name - so
 * one pad-expanded control with N terminals still counts as present once,
 * the same as a part with N pin lines would.
 *
 * **A REF ON BOTH LISTS IS A SEPARATE FAILURE, CHECKED FIRST.**
 * `assertNoControlReachesTwice` above refuses it before this comparison runs,
 * because it would otherwise be "on the board" by both counts and pass here
 * silently.
 */
export function assertLayoutMatchesCircuit(
  dump: BoardDump,
  circuit: BoardCircuit,
  pads: readonly PadTerminal[],
): void {
  assertNoControlReachesTwice(dump, pads)
  const onBoard = new Set([...dump.parts.map((part) => part.ref), ...pads.map((pad) => pad.ref)])
  const notOnBoard = [...circuit.byRef.keys()].filter((ref) => !onBoard.has(ref)).sort()
  const notInCircuit = [...onBoard].filter((ref) => !circuit.byRef.has(ref)).sort()
  if (notOnBoard.length === 0 && notInCircuit.length === 0) return
  const lines = [
    "the layout and the circuit do not hold the same parts, so a build packet would be wrong:",
    ...(notOnBoard.length > 0 ? [`  in the circuit but not on the board: ${notOnBoard.join(", ")}`] : []),
    ...(notInCircuit.length > 0 ? [`  on the board but not in the circuit: ${notInCircuit.join(", ")}`] : []),
    // THE TWO EXPLANATORY CLAUSES ARE SEPARATE AND EACH TRUE ONLY OF ITS OWN
    // LIST. A ref named "not on the board" has neither a PART nor a PAD line;
    // a ref named "on the board but not in the circuit" has one or the
    // other - that is the only reason it is on the "on the board" side of the
    // comparison - so a single shared sentence claiming "neither" would be
    // false of every ref in the second list. One trailer sent readers to a
    // remedy that could not work; a shared clause here would send them to an
    // explanation that is false of their own board, which teaches worse than
    // the vague one it replaced.
    ...(notOnBoard.length > 0
      ? [
          "Each ref listed as not on the board is genuinely absent there - it has neither a PART " +
            "line nor a PAD line naming it (both are checked).",
        ]
      : []),
    ...(notInCircuit.length > 0
      ? [
          "Each ref listed as on the board but not in the circuit has a PART or PAD line - that is " +
            "the only reason it is on the board - and the circuit declares no component at that ref.",
        ]
      : []),
    "Bring the .vrt in step with the circuit's netlist (`make update`), place any missing part or " +
      "off-board control's pads in VeroRoute (`make edit`), save, then run this again.",
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
