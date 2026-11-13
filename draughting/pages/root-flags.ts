/**
 * THE ROOT-HELD PWR_FLAGs OF A BOARD'S ROOT SHEET, as an akcli op-list (the board's
 * `pwr-flag-homes.ts`; the module's ruling CR-MODULE-PWR-FLAGS). One `place_pwr_flag` for each board
 * net the table homes on its `ROOT_SHEET`, and none for any other net: a flag homed on a block page is
 * that page's, and a second one anywhere is an ERC `pin_to_pin` at the root (measured; the ruling).
 *
 * Where each flag goes. The root `tools/draught/assemble-root.ts` draws gives every port of every
 * block a short stub ending in a LOCAL label naming the parent net, so a net reached by several
 * blocks has several stub labels of one text, all joined on the root. A PWR_FLAG at rotation 0 stands
 * north of its pin with its "PWR_FLAG" text above it; at rotation 180, south and below. Sheet pins are
 * one `ROOT_PIN_PITCH_MIL` apart, so a flag drawn toward a neighbouring stub lands on that stub's
 * label: measured on the h7-module's Task 7e fix round 1 render, the flags on mcu's east-edge VREF_A
 * and VSSA labels (rotation 0) put their text on the VCAP and VREF_A labels a row above. So the flag
 * goes at the first stub label of the net, in blocks order, west edge before east, that is the TOP pin
 * of its sheet edge (rotation 0, nothing above it but the box's top), else the first that is the
 * BOTTOM pin of its edge (rotation 180, nothing below it but the box's bottom). A fixed rule, not a
 * choice made from the circuit.
 *
 * Refuses, naming the net: a root-homed net that no block port is bound to (no stub to put a flag
 * on, so the table and the model disagree); a net with no stub at the top or bottom of an edge; and
 * a chosen point with no stub label of the net in `rootSheetOps`'s op-list (the arrangement and the
 * op-list disagree).
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun root-flags.ts <board-dir>     (from the repository root; writes the op-list to stdout)
 */
import type { Network } from "../../lib/model/index.ts"
import { opList, type AkcliOp, type AkcliOpList } from "../../tools/draught/akcli-ops.ts"
import { rootSheetOps } from "../../tools/draught/assemble-root.ts"
import { arrangeRoot, ROOT_PIN_PITCH_MIL, ROOT_STUB_MIL } from "../../tools/draught/root-arrangement.ts"
import { boardFromArgs } from "./board.ts"
import { flagHomes, type FlagHomes } from "./flag-homes.ts"

/** The board nets whose single PWR_FLAG lives on the root, in name order. */
export function rootFlaggedNets(homes: FlagHomes): string[] {
  return Object.entries(homes.shared)
    .filter(([, home]) => home === homes.rootSheet)
    .map(([net]) => net)
    .sort()
}

/** The root's flag op-list: one PWR_FLAG at a top or bottom stub label of each root-homed net (see above). */
export function rootFlagOps(network: Network, board: string, homes: FlagHomes): AkcliOpList {
  const labels = rootSheetOps(network, board).ops.filter((op) => op.op === "add_net_label")
  const sheets = arrangeRoot(network, board)
  const ops: AkcliOp[] = []
  for (const net of rootFlaggedNets(homes)) {
    const stubs = sheets.flatMap((sheet) => [
      ...sheet.left.map((pin, k) => ({ pin, k, n: sheet.left.length, x: sheet.x - ROOT_STUB_MIL })),
      ...sheet.right.map((pin, k) => ({ pin, k, n: sheet.right.length, x: sheet.x + sheet.width + ROOT_STUB_MIL })),
    ].map((s) => ({ ...s, y: sheet.y + (s.k + 1) * ROOT_PIN_PITCH_MIL }))).filter((s) => s.pin.parent === net)
    if (stubs.length === 0) {
      throw new Error(
        `root-flags.ts: pwr-flag-homes.ts homes ${net}'s PWR_FLAG on the root, but no block port is bound to ${net}, so the root ` +
          "draws no stub for it. Either the table names a net the board does not have, or the model lost the port; fix whichever is wrong.",
      )
    }
    const top = stubs.find((s) => s.k === 0)
    const bottom = stubs.find((s) => s.k === s.n - 1)
    const chosen = top !== undefined ? { at: top, rotation: 0 } : bottom !== undefined ? { at: bottom, rotation: 180 } : undefined
    if (chosen === undefined) {
      throw new Error(
        `root-flags.ts: no stub label of ${net} is the top or bottom pin of its sheet edge, so a PWR_FLAG on any of them would be drawn ` +
          "onto a neighbouring stub's label. A rule for this case is not written; add one here rather than place the flag where it collides.",
      )
    }
    const { x, y } = chosen.at
    const label = labels.find((op) => op.name === net && Array.isArray(op.at) && op.at[0] === x && op.at[1] === y)
    if (label === undefined) {
      throw new Error(`root-flags.ts: the arrangement puts a stub label of ${net} at (${x}, ${y}) mil, but rootSheetOps writes none there`)
    }
    ops.push({ op: "place_pwr_flag", at: [x, y], rotation: chosen.rotation })
  }
  return opList(`${board}.kicad_sch`, ops)
}

if (import.meta.main) {
  const { board } = await boardFromArgs(process.argv.slice(2), "bun root-flags.ts <board-dir>")
  process.stdout.write(JSON.stringify(rootFlagOps(board.network, board.name, await flagHomes(board)), null, 1) + "\n")
}
