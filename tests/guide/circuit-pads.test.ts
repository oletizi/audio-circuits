/**
 * `assertLayoutMatchesCircuit` counting a `PAD`-only control as present.
 *
 * `./circuit.test.ts` covers the two directions over `PART`-represented
 * parts; this file is the witness for the other half - the half that
 * needs a control which has NO `PART` line at all, only the `PAD` lines
 * VeroRoute expands an off-board `PADSn` component into. `parseBoardDump`
 * never reads `PAD` lines (`tools/guide/dump.ts`'s own module comment), so
 * they cannot be threaded through `BoardDump`; they are built directly as the
 * `PadTerminal[]` `tools/guide/pads.ts` would have read from the dump text,
 * which is exactly the shape `writeGuidePacket` passes as the check's third
 * argument.
 */
import { test, expect } from "bun:test"
import { net, type Component } from "../../lib/model/types.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { assertLayoutMatchesCircuit, boardCircuitFrom } from "../../tools/guide/circuit.ts"
import type { PadTerminal } from "../../tools/guide/pads.ts"

/** A board with nothing placed: no `PART` line, and (in these tests) no `PAD` line either. */
const EMPTY_DUMP_TEXT = ["GRID 5 5", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED", ""].join("\n")

/** A panel pot the circuit declares, with a designator the dump's `PART` lines never carry. */
const PAD_ONLY_POT: Component = {
  id: "pad_only_pot",
  kind: "potentiometer",
  parameters: {},
  pins: {},
  units: [{ name: "MAIN", pins: { ccw: net("GND"), wiper: net("PAD_WIPER"), cw: net("PAD_TOP") } }],
}

const DESIGNATORS: Readonly<Record<string, string>> = { pad_only_pot: "RV_PAD_ONLY" }
const PIN_NUMBERS = { potentiometer: { ccw: "1", wiper: "2", cw: "3" } }

function padOnlyCircuit() {
  return boardCircuitFrom({ components: [PAD_ONLY_POT], ports: {} }, DESIGNATORS, PIN_NUMBERS, undefined, undefined)
}

/** The three `PadTerminal`s a real `PAD ... FROM RV_PAD_ONLY.<pin>` set reads as, for `ref`. */
function padTerminalsFor(ref: string): readonly PadTerminal[] {
  return (["1", "2", "3"] as const).map((pin, index) => ({
    identity: `${ref}.${pin}`,
    ref,
    pin,
    row: 0,
    col: index,
  }))
}

test("a control represented only by PAD lines, with no PART line, passes", () => {
  const dump = parseBoardDump(EMPTY_DUMP_TEXT)
  expect(() =>
    assertLayoutMatchesCircuit(dump, padOnlyCircuit(), padTerminalsFor("RV_PAD_ONLY")),
  ).not.toThrow()
})

/**
 * The failure mode named in the brief: widening the check so a genuinely
 * absent part stops being reported would make this pass too. It must not.
 * No pads are handed over here, so `RV_PAD_ONLY` is absent from BOTH the
 * `PART` and the `PAD` side, and the refusal must still name it.
 */
test("a part genuinely absent from both PART and PAD lines is still refused by name", () => {
  const dump = parseBoardDump(EMPTY_DUMP_TEXT)
  expect(() => assertLayoutMatchesCircuit(dump, padOnlyCircuit(), [])).toThrow(
    /in the circuit but not on the board: RV_PAD_ONLY/,
  )
})

test("the corrected remedy names both line kinds it checked, and drops the wrong make-update/make-edit claim", () => {
  const dump = parseBoardDump(EMPTY_DUMP_TEXT)
  expect(() => assertLayoutMatchesCircuit(dump, padOnlyCircuit(), [])).toThrow(
    /neither a PART line nor a PAD line naming it \(both are checked\)/,
  )
})

test("a PAD naming a ref the circuit does not have is refused as on the board but not in the circuit", () => {
  const dump = parseBoardDump(EMPTY_DUMP_TEXT)
  const circuit = boardCircuitFrom({ components: [], ports: {} }, {}, {}, undefined, undefined)
  expect(() => assertLayoutMatchesCircuit(dump, circuit, padTerminalsFor("RV_PAD_ONLY"))).toThrow(
    /on the board but not in the circuit: RV_PAD_ONLY/,
  )
})
