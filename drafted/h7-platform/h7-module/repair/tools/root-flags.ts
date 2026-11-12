/**
 * THE ROOT-HELD PWR_FLAGs OF THE h7-module ROOT SHEET, as an akcli op-list (ruling
 * CR-MODULE-PWR-FLAGS; the table is `./pwr-flag-homes.ts`). One `place_pwr_flag` for each module
 * net the table homes on `ROOT_SHEET`, and none for any other net: GND's single flag is the power
 * page's, and a second one anywhere is an ERC `pin_to_pin` at the root (measured; the ruling).
 *
 * Where each flag goes. The root `tools/draught/assemble-root.ts` draws gives every port of every
 * block a short stub ending in a LOCAL label naming the parent net, so a net reached by several
 * blocks has several stub labels of one text, all joined on the root. The flag goes at the FIRST of
 * them in the op-list's order (blocks in `Network.blocks` order, ports in name order), exactly where
 * `./one-block-root.ts` puts its stand-in flag on the one stub it has. A fixed rule, not a choice
 * made from the circuit.
 *
 * Refuses, naming the net: a root-homed net that no block port is bound to (no stub to put a flag
 * on, so the table and the model disagree), and a label op without a point.
 *
 * usage: bun root-flags.ts <board>     (from the repository root; writes the op-list to stdout)
 */
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import { opList, type AkcliOp, type AkcliOpList } from "../../../../../tools/draught/akcli-ops.ts"
import { rootSheetOps } from "../../../../../tools/draught/assemble-root.ts"
import type { Network } from "../../../../../lib/model/index.ts"
import { ROOT_SHEET, SHARED_FLAG_HOME } from "./pwr-flag-homes.ts"

/** The module nets whose single PWR_FLAG lives on the root, in name order. */
export function rootFlaggedNets(): string[] {
  return Object.entries(SHARED_FLAG_HOME)
    .filter(([, home]) => home === ROOT_SHEET)
    .map(([net]) => net)
    .sort()
}

/** The root's flag op-list: one PWR_FLAG at the first stub label of each root-homed net. */
export function rootFlagOps(network: Network, board: string): AkcliOpList {
  const labels = rootSheetOps(network, board).ops.filter((op) => op.op === "add_net_label")
  const ops: AkcliOp[] = []
  for (const net of rootFlaggedNets()) {
    const first = labels.find((op) => op.name === net)
    if (first === undefined) {
      throw new Error(
        `root-flags.ts: pwr-flag-homes.ts homes ${net}'s PWR_FLAG on the root, but no block port is bound to ${net}, so the root ` +
          "draws no stub for it. Either the table names a net the module does not have, or the model lost the port; fix whichever is wrong.",
      )
    }
    const at = first.at
    if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
      throw new Error(`root-flags.ts: the root's stub label for ${net} carries no point; assemble-root.ts no longer writes (x, y) labels`)
    }
    ops.push({ op: "place_pwr_flag", at: [at[0], at[1]], rotation: 0 })
  }
  return opList(`${board}.kicad_sch`, ops)
}

if (import.meta.main) {
  const board = process.argv[2]
  if (board === undefined) throw new Error("usage: bun root-flags.ts <board> - the board name (the root file's stem) is required")
  process.stdout.write(JSON.stringify(rootFlagOps(h7Module(), board), null, 1) + "\n")
}
