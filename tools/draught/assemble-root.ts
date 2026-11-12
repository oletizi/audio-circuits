/**
 * THE ROOT SHEET OF A MULTI-PAGE DRAWING (design change C3), written as an akcli op-list from
 * `Network.blocks` - one `add_sheet` per block, one sheet pin per port, each pin wired to a short
 * stub carrying a LOCAL label named for the parent net the port is bound to. Two sheet pins on one
 * parent net meet because their two labels share a text on the root; that is the boundary the
 * root draws, and KiCad's export of the assembled root is the evidence of it.
 *
 * Sheet pins are named by the PORT (matching the block sheet's hierarchical label,
 * `./hierarchical-labels.ts`); root labels by the PARENT NET. The two differ whenever a block is
 * included with a port map that renames.
 *
 * The placement is a fixed arrangement, not a judgement made here: blocks in `Network.blocks`
 * order, three to a row, sheet pins down the left edge in port-name order at a fixed pitch. It
 * computes no layout from the circuit. akcli's `add_sheet` writes the sheet node, its pins at the
 * edge points and its `(instances ...)` page block (`akcli/writers/handlers/sheets.py`).
 *
 * The root's STARTING text is written here too (`blankRootSheet`), rather than by `akcli new`,
 * because `akcli new` mints a random root uuid on every run (`akcli/writers/blank.py`, `uuid4()`)
 * and a replay must reach the same bytes. The uuid is derived from the board's name. It is on US
 * Letter from the start, so the root needs no re-papering.
 *
 * Usage (the replay runs both):
 *   bun tools/draught/assemble-root.ts blank <board>                       > <board>.kicad_sch
 *   bun tools/draught/assemble-root.ts ops <module> <export> <board>       > 01-assemble.json
 */
import { createHash } from "node:crypto"
import type { Network } from "../../lib/model/types.ts"
import { networkFrom, opList, type AkcliOp, type AkcliOpList } from "./akcli-ops.ts"

/** Distance between sheet pins down a sheet's left edge, and from the top edge to the first. */
export const ROOT_PIN_PITCH_MIL = 200
/** Length of the wire from a sheet pin to its parent-net label. */
export const ROOT_STUB_MIL = 400
const SHEET_WIDTH_MIL = 2000
const ORIGIN_MIL = 1500
const COLUMN_PITCH_MIL = 3200
const ROW_GAP_MIL = 800
const PER_ROW = 3

/** A uuid-shaped string derived from `seed`, so the same board always gets the same root uuid. */
function seededUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

/** The root sheet before any op: akcli's blank sheet, with a uuid seeded by the board and US Letter paper. */
export function blankRootSheet(board: string): string {
  const tab = String.fromCharCode(9)
  const newline = String.fromCharCode(10)
  return [
    "(kicad_sch",
    `${tab}(version 20231120)`,
    `${tab}(generator "eeschema")`,
    `${tab}(generator_version "8.0")`,
    `${tab}(uuid "${seededUuid(`c3-root-sheet:${board}`)}")`,
    `${tab}(paper "USLetter")`,
    `${tab}(lib_symbols)`,
    `${tab}(sheet_instances`,
    `${tab}${tab}(path "/"`,
    `${tab}${tab}${tab}(page "1")`,
    `${tab}${tab})`,
    `${tab})`,
    ")",
  ].join(newline) + newline
}

export function rootSheetOps(network: Network, board: string): AkcliOpList {
  if (network.blocks.length === 0) {
    throw new Error(`${board}: the network has no blocks, so there is no root to assemble; a one-page board has no root sheet.`)
  }
  const ops: AkcliOp[] = []
  const heights = network.blocks.map((b) => (Object.keys(b.ports).length + 1) * ROOT_PIN_PITCH_MIL)
  let rowTop = ORIGIN_MIL
  network.blocks.forEach((block, index) => {
    const column = index % PER_ROW
    if (index > 0 && column === 0) {
      rowTop += Math.max(...heights.slice(index - PER_ROW, index)) + ROW_GAP_MIL
    }
    const x = ORIGIN_MIL + column * COLUMN_PITCH_MIL
    const ports = Object.entries(block.ports).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    ops.push({
      op: "add_sheet",
      name: block.prefix,
      file: `${block.prefix}.kicad_sch`,
      at: [x, rowTop],
      size: [SHEET_WIDTH_MIL, heights[index]],
      pins: ports.map(([name], k) => ({ name, type: "input", side: "left", offset_mil: (k + 1) * ROOT_PIN_PITCH_MIL })),
    })
    ports.forEach(([, parent], k) => {
      const y = rowTop + (k + 1) * ROOT_PIN_PITCH_MIL
      ops.push({ op: "add_wire", vertices: [[x, y], [x - ROOT_STUB_MIL, y]] })
      ops.push({ op: "add_net_label", name: parent, at: [x - ROOT_STUB_MIL, y], scope: "local", rotation: 180 })
    })
  })
  return opList(`${board}.kicad_sch`, ops)
}

async function main(argv: readonly string[]): Promise<void> {
  const [mode, ...rest] = argv
  if (mode === "blank" && rest.length === 1 && rest[0] !== undefined) {
    process.stdout.write(blankRootSheet(rest[0]))
    return
  }
  if (mode === "ops" && rest.length === 3) {
    const [module, exportName, board] = rest
    if (module === undefined || exportName === undefined || board === undefined) throw new Error("ops needs <module> <export> <board>")
    process.stdout.write(JSON.stringify(rootSheetOps(await networkFrom(module, exportName), board), null, 1) + "\n")
    return
  }
  throw new Error("usage: assemble-root.ts blank <board> | ops <module> <export> <board>")
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
