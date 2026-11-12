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
 * The placement is a fixed rule, not a judgement made here, and it puts every sheet symbol inside
 * US Letter's inner frame (`./root-arrangement.ts`): blocks packed tallest first, each at the
 * first free point (smallest y, then smallest x) where its cell lies inside the frame, clear of the
 * title block and of the cells already placed; sheet pins in port-name order at a fixed pitch, down
 * the left edge, or - for a block with more ports than one edge holds within the frame - the first
 * half down the left edge and the rest down the right. A board whose blocks cannot all be placed
 * is refused, naming the block, rather than drawn off the paper. akcli's `add_sheet` writes
 * the sheet node, its pins at the edge points and its `(instances ...)` page block
 * (`akcli/writers/handlers/sheets.py`).
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
import { arrangeRoot, ROOT_PIN_PITCH_MIL, ROOT_STUB_MIL } from "./root-arrangement.ts"

export { ROOT_PIN_PITCH_MIL, ROOT_STUB_MIL } from "./root-arrangement.ts"

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
  for (const sheet of arrangeRoot(network, board)) {
    ops.push({
      op: "add_sheet",
      name: sheet.block,
      file: sheet.file,
      at: [sheet.x, sheet.y],
      size: [sheet.width, sheet.height],
      pins: [
        ...sheet.left.map((p, k) => ({ name: p.port, type: "input", side: "left", offset_mil: (k + 1) * ROOT_PIN_PITCH_MIL })),
        ...sheet.right.map((p, k) => ({ name: p.port, type: "input", side: "right", offset_mil: (k + 1) * ROOT_PIN_PITCH_MIL })),
      ],
    })
    sheet.left.forEach((p, k) => {
      const y = sheet.y + (k + 1) * ROOT_PIN_PITCH_MIL
      ops.push({ op: "add_wire", vertices: [[sheet.x, y], [sheet.x - ROOT_STUB_MIL, y]] })
      ops.push({ op: "add_net_label", name: p.parent, at: [sheet.x - ROOT_STUB_MIL, y], scope: "local", rotation: 180 })
    })
    const east = sheet.x + sheet.width
    sheet.right.forEach((p, k) => {
      const y = sheet.y + (k + 1) * ROOT_PIN_PITCH_MIL
      ops.push({ op: "add_wire", vertices: [[east, y], [east + ROOT_STUB_MIL, y]] })
      ops.push({ op: "add_net_label", name: p.parent, at: [east + ROOT_STUB_MIL, y], scope: "local", rotation: 0 })
    })
  }
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
