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
 * choice made from the circuit. A net with no stub at either end of any edge gets the second rule
 * (h7 pedal Task 11b; `rootFlagPlacements` below): its flag on a label of its own, in the slot above
 * an edge's top pin.
 *
 * Refuses, naming the net: a root-homed net that no block port is bound to (no stub to put a flag
 * on, so the table and the model disagree); a net the second rule finds no free slot for; and a
 * chosen point with no stub label of the net in `rootSheetOps`'s op-list, or a slot that already
 * holds one (the arrangement and the op-list disagree).
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

interface Stub {
  readonly parent: string
  /** The pin's index down its edge, and the edge's pin count. */
  readonly k: number
  readonly n: number
  /** The stub label's point, mil. */
  readonly x: number
  readonly y: number
  /** `<block>/<side>`, and the y of the box's top edge. */
  readonly edge: string
  readonly side: "left" | "right"
  readonly boxTop: number
}

function stubsOf(network: Network, board: string): Stub[] {
  return arrangeRoot(network, board).flatMap((sheet) => {
    const side = (pins: readonly { readonly parent: string }[], s: "left" | "right", x: number): Stub[] =>
      pins.map((pin, k) => ({
        parent: pin.parent, k, n: pins.length, x, y: sheet.y + (k + 1) * ROOT_PIN_PITCH_MIL,
        edge: `${sheet.block}/${s}`, side: s, boxTop: sheet.y,
      }))
    return [...side(sheet.left, "left", sheet.x - ROOT_STUB_MIL), ...side(sheet.right, "right", sheet.x + sheet.width + ROOT_STUB_MIL)]
  })
}

/**
 * Where the root's flags go (`rootFlagPlacements`; `rootFlagOps` writes them): one PWR_FLAG for
 * each root-homed net, in net-name order.
 *
 * Rule 1 (CR-MODULE-ROOT-FITS-LETTER): at the net's first stub label that is the top pin of its edge
 * (rotation 0), else the first that is the bottom pin (rotation 180); see the module comment.
 *
 * Rule 2, for a net none of whose stubs is the top or bottom pin of its edge (first met on the h7
 * pedal's 5V_A_CODEC, the second pin of each of its three sheets; ruling
 * CR-PEDAL-ROOT-FLAG-EDGE-SLOT): the flag stands, rotation 0, on a LOCAL label of the net of its own,
 * at the slot one pitch above the edge's top pin - level with the box's top edge, in the stub
 * labels' column, written with the stubs' rotation. Nothing is drawn above that slot but the
 * cell's sheet-name margin, so the flag is not drawn onto another stub's label. The edge is the
 * net's first stub's edge (blocks order, west before east) whose top pin carries no rule-1 flag
 * (that flag would stand on the slot) and whose slot no other rule-2 flag has taken. The label
 * joins the net by name, as every stub label on the root does; it needs no wire, since the flag's
 * pin is at its point.
 */
export interface RootFlagPlacement {
  readonly net: string
  /** The flag's point, mil: a stub label's (rule 1) or its own label's (rule 2). */
  readonly at: readonly [number, number]
  readonly rotation: number
  /** Rule 2 only: the rotation of the flag's own label of the net, at the same point. */
  readonly labelRotation?: number
}

export function rootFlagPlacements(network: Network, board: string, homes: FlagHomes): readonly RootFlagPlacement[] {
  const labels = rootSheetOps(network, board).ops.filter((op) => op.op === "add_net_label")
  const labelAt = (net: string, x: number, y: number): boolean =>
    labels.some((op) => op.name === net && Array.isArray(op.at) && op.at[0] === x && op.at[1] === y)
  const stubs = stubsOf(network, board)
  const nets = rootFlaggedNets(homes)
  const edgeFlag = new Map<string, { readonly at: Stub; readonly rotation: number }>()
  for (const net of nets) {
    const on = stubs.filter((s) => s.parent === net)
    if (on.length === 0) {
      throw new Error(
        `root-flags.ts: pwr-flag-homes.ts homes ${net}'s PWR_FLAG on the root, but no block port is bound to ${net}, so the root ` +
          "draws no stub for it. Either the table names a net the board does not have, or the model lost the port; fix whichever is wrong.",
      )
    }
    const top = on.find((s) => s.k === 0)
    const bottom = on.find((s) => s.k === s.n - 1)
    const chosen = top !== undefined ? { at: top, rotation: 0 } : bottom !== undefined ? { at: bottom, rotation: 180 } : undefined
    if (chosen === undefined) continue
    if (!labelAt(net, chosen.at.x, chosen.at.y)) {
      throw new Error(`root-flags.ts: the arrangement puts a stub label of ${net} at (${chosen.at.x}, ${chosen.at.y}) mil, but rootSheetOps writes none there`)
    }
    edgeFlag.set(net, chosen)
  }
  const toppedEdges = new Set([...edgeFlag.values()].filter((c) => c.rotation === 0).map((c) => c.at.edge))
  const takenSlots = new Set<string>()
  const placements: RootFlagPlacement[] = []
  for (const net of nets) {
    const chosen = edgeFlag.get(net)
    if (chosen !== undefined) {
      placements.push({ net, at: [chosen.at.x, chosen.at.y], rotation: chosen.rotation })
      continue
    }
    const slot = stubs.find((s) => s.parent === net && !toppedEdges.has(s.edge) && !takenSlots.has(s.edge))
    if (slot === undefined) {
      throw new Error(
        `root-flags.ts: no stub label of ${net} is the top or bottom pin of its sheet edge, and every edge carrying ${net} already has a ` +
          "flag at its top pin or in its slot above it, so a PWR_FLAG on any of them would be drawn onto another stub's label or flag. " +
          "A rule for this case is not written; add one here rather than place the flag where it collides.",
      )
    }
    const at: readonly [number, number] = [slot.x, slot.boxTop]
    if (labels.some((op) => Array.isArray(op.at) && op.at[0] === at[0] && op.at[1] === at[1])) {
      throw new Error(`root-flags.ts: the slot above ${slot.edge}'s top pin, (${at[0]}, ${at[1]}) mil, already holds a stub label; the arrangement and this rule disagree`)
    }
    takenSlots.add(slot.edge)
    placements.push({ net, at, rotation: 0, labelRotation: slot.side === "left" ? 180 : 0 })
  }
  return placements
}

/** The root's flag op-list, from `rootFlagPlacements`: a rule-2 flag's own label first, then the flag. */
export function rootFlagOps(network: Network, board: string, homes: FlagHomes): AkcliOpList {
  const ops: AkcliOp[] = []
  for (const p of rootFlagPlacements(network, board, homes)) {
    if (p.labelRotation !== undefined) ops.push({ op: "add_net_label", name: p.net, at: [p.at[0], p.at[1]], scope: "local", rotation: p.labelRotation })
    ops.push({ op: "place_pwr_flag", at: [p.at[0], p.at[1]], rotation: p.rotation })
  }
  return opList(`${board}.kicad_sch`, ops)
}

if (import.meta.main) {
  const { board } = await boardFromArgs(process.argv.slice(2), "bun root-flags.ts <board-dir>")
  process.stdout.write(JSON.stringify(rootFlagOps(board.network, board.name, await flagHomes(board)), null, 1) + "\n")
}
