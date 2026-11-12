/**
 * TURN A DRAFTED BLOCK SHEET'S LABELS INTO THE BLOCK'S BOUNDARY (design change C3), as an akcli
 * op-list.
 *
 * copperhead 0.12.0 emits only LOCAL and GLOBAL labels (`draughting/copperhead/src/kicad/emit.ts`):
 * a wired run's name is local, and a net that also leaves through a stub is named by global flags
 * (`src/kicad/draft/engine.ts`, "a stub ends in a global flag"). On one sheet that is harmless. In
 * a hierarchy a GLOBAL label joins every sheet by name, so a private net drawn global would merge
 * with another block's private net of the same text with nothing on the root to show it. So, on one
 * block sheet:
 *
 * - **each PORT net**: every copperhead label carrying the port's text is deleted, and ONE
 *   hierarchical label of that text is added - at the first deleted label's place, or, when
 *   copperhead drew none (a port reaching one pin, which copperhead cannot draft; see
 *   `./drawing-pages.ts`), on the port's first pin. A port net copperhead labelled more than once
 *   gets LOCAL labels at the other places, so its pieces stay joined: a local and a hierarchical
 *   label of one text are one net on a sheet (measured with `kicad-cli` on the two-block fixture).
 * - **each GLOBAL label on a private net** is deleted and replaced by a LOCAL label of the same text,
 *   place and angle.
 *
 * Every delete is by the label's own uuid, never by position: akcli's `delete_object` match on a
 * point that misses is a "replay-safe note", not an error, so a position mismatch would leave the
 * global label in place silently. `blockSheetLabelProblems` is the post-condition, and the replay
 * runs it after applying.
 *
 * Usage:
 *   bun tools/draught/hierarchical-labels.ts ops   <module> <block> <sheet>   > 01-hierarchical-labels.json
 *   bun tools/draught/hierarchical-labels.ts check <module> <block> <sheet>   (exits 1 naming each problem)
 */
import fs from "node:fs"
import path from "node:path"
import { child, parseSexpr } from "../../lib/kicad/sexpr.ts"
import { importModule, mmToMil, opList, type AkcliOp, type AkcliOpList } from "./akcli-ops.ts"
import type { DrawingPage, PagePort } from "./drawing-pages.ts"

export type LabelKind = "label" | "global_label" | "hierarchical_label"

export interface SheetLabel {
  readonly kind: LabelKind
  readonly text: string
  readonly xMil: number
  readonly yMil: number
  readonly rotation: number
  readonly uuid: string
}

function isLabelKind(name: string): name is LabelKind {
  return name === "label" || name === "global_label" || name === "hierarchical_label"
}

/** Every top-level label of a sheet, in file order. Labels inside symbols or sheets are not top-level and not read. */
export function sheetLabels(sheetText: string): SheetLabel[] {
  const root = parseSexpr(sheetText)
  const out: SheetLabel[] = []
  for (const node of root.nodes) {
    if (!isLabelKind(node.name)) continue
    const text = node.atoms[0]
    const at = child(node, "at")?.atoms
    const uuid = child(node, "uuid")?.atoms[0]
    if (text === undefined || at === undefined || at.length < 2 || uuid === undefined) {
      throw new Error(`a ${node.name} on the sheet lacks its text, (at x y) or (uuid); the sheet is not one KiCad wrote.`)
    }
    out.push({
      kind: node.name, text,
      xMil: mmToMil(Number(at[0])), yMil: mmToMil(Number(at[1])), rotation: Number(at[2] ?? "0"), uuid,
    })
  }
  return out
}

function portOps(port: PagePort, labels: readonly SheetLabel[]): AkcliOp[] {
  const own = labels.filter((l) => l.text === port.name)
  const [first, ...rest] = own
  if (first === undefined) {
    const pin = port.pins[0]
    if (pin === undefined) throw new Error(`port "${port.name}" reaches no pin, so there is nowhere to put its label.`)
    return [{ op: "add_net_label", name: port.name, at: pin, scope: "hierarchical" }]
  }
  return [
    ...own.map((l): AkcliOp => ({ op: "delete_object", uuid: l.uuid })),
    { op: "add_net_label", name: port.name, at: [first.xMil, first.yMil], scope: "hierarchical", rotation: first.rotation },
    ...rest.map((l): AkcliOp => ({ op: "add_net_label", name: port.name, at: [l.xMil, l.yMil], scope: "local", rotation: l.rotation })),
  ]
}

export function hierarchicalLabelOps(sheetText: string, page: DrawingPage, targetFile: string): AkcliOpList {
  const labels = sheetLabels(sheetText)
  const already = labels.filter((l) => l.kind === "hierarchical_label")
  if (already.length > 0) {
    throw new Error(
      `${targetFile} already carries hierarchical labels (${already.map((l) => l.text).join(", ")}). copperhead ` +
        "emits none, so this sheet has been through this step; apply it to a fresh draft.",
    )
  }
  const portNames = new Set(page.ports.map((p) => p.name))
  const ops: AkcliOp[] = page.ports.flatMap((port) => portOps(port, labels))
  for (const label of labels) {
    if (label.kind !== "global_label" || portNames.has(label.text)) continue
    ops.push({ op: "delete_object", uuid: label.uuid })
    ops.push({ op: "add_net_label", name: label.text, at: [label.xMil, label.yMil], scope: "local", rotation: label.rotation })
  }
  return opList(targetFile, ops)
}

/** What must hold of a block sheet after the op-list: each problem named, an empty list when none. */
export function blockSheetLabelProblems(sheetText: string, page: DrawingPage): string[] {
  const labels = sheetLabels(sheetText)
  const problems: string[] = []
  const portNames = new Set(page.ports.map((p) => p.name))
  for (const port of page.ports) {
    const n = labels.filter((l) => l.kind === "hierarchical_label" && l.text === port.name).length
    if (n !== 1) problems.push(`port "${port.name}" has ${n} hierarchical labels, expected exactly 1`)
  }
  for (const label of labels) {
    if (label.kind === "global_label") problems.push(`global label "${label.text}" remains; a global label joins every sheet by name`)
    if (label.kind === "hierarchical_label" && !portNames.has(label.text)) {
      problems.push(`hierarchical label "${label.text}" names no port of block "${page.block}"`)
    }
  }
  return problems
}

async function pageOf(module: string, block: string): Promise<DrawingPage> {
  const exported = (await importModule(module))["drawingPages"]
  if (typeof exported !== "function") throw new Error(`${module} exports no drawingPages().`)
  const pages: unknown = exported()
  if (!Array.isArray(pages)) throw new Error(`${module}'s drawingPages() did not return an array.`)
  for (const candidate of pages) {
    if (isPage(candidate) && candidate.block === block) return candidate
  }
  throw new Error(`${module}'s drawingPages() has no page for block "${block}".`)
}

// Known limitation (H7 module plan, Task 5 review): `isDrawingPage` in tools/draught/draw-intent.ts is a
// second, stricter guard for the same type. Consolidate the two when either is next touched.
function isPage(value: unknown): value is DrawingPage {
  return typeof value === "object" && value !== null && "block" in value && "intent" in value && "ports" in value
}

async function main(argv: readonly string[]): Promise<void> {
  const [mode, module, block, sheet] = argv
  if ((mode !== "ops" && mode !== "check") || module === undefined || block === undefined || sheet === undefined) {
    throw new Error("usage: hierarchical-labels.ts ops|check <module> <block> <sheet>")
  }
  const page = await pageOf(module, block)
  const text = fs.readFileSync(sheet, "utf8")
  if (mode === "ops") {
    process.stdout.write(JSON.stringify(hierarchicalLabelOps(text, page, path.basename(sheet)), null, 1) + "\n")
    return
  }
  const problems = blockSheetLabelProblems(text, page)
  if (problems.length > 0) throw new Error(`${sheet}:\n  ${problems.join("\n  ")}`)
  console.log(`${sheet}: one hierarchical label per port of block "${block}", no global label`)
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
