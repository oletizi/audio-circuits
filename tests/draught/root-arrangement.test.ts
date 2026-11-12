/**
 * The root's arrangement (`tools/draught/root-arrangement.ts`, design change C3): every sheet
 * symbol inside US Letter's inner frame and clear of its title block, no two cells overlapping, a
 * block with more ports than one edge holds split down both edges, the same arrangement every time,
 * and a board that cannot fit refused rather than drawn off the paper.
 *
 * The h7 module is the case that needed it: its root as first assembled overshot the paper by
 * 779 mm, with 10 of its 12 sheet symbols off the page (root_sheets_fit.py on the Task 7e root, commit
 * 71db737: "sheets on the paper: 2 of 12"; ruling CR-MODULE-ROOT-FITS-LETTER).
 */
import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import type { BlockRecord, Network } from "../../lib/model/types.ts"
import { h7Module } from "../../circuits/h7-platform/module-board.ts"
import { rootSheetOps } from "../../tools/draught/assemble-root.ts"
import {
  arrangeRoot, LETTER_FRAME_MM, LETTER_TITLE_BLOCK_MM, ROOT_PIN_PITCH_MIL, ROOT_STUB_MIL,
} from "../../tools/draught/root-arrangement.ts"

const MM = 0.0254

function boxesMm(network: Network): { block: string; x0: number; y0: number; x1: number; y1: number }[] {
  return arrangeRoot(network, "t").map((s) => ({
    block: s.block, x0: s.x * MM, y0: s.y * MM, x1: (s.x + s.width) * MM, y1: (s.y + s.height) * MM,
  }))
}

test("the h7 module's twelve sheet symbols all lie inside the frame and clear of the title block", () => {
  const boxes = boxesMm(h7Module())
  expect(boxes.map((b) => b.block)).toEqual(h7Module().blocks.map((b) => b.prefix))
  for (const b of boxes) {
    expect(b.x0).toBeGreaterThan(LETTER_FRAME_MM.x0)
    expect(b.y0).toBeGreaterThan(LETTER_FRAME_MM.y0)
    expect(b.x1).toBeLessThan(LETTER_FRAME_MM.x1)
    expect(b.y1).toBeLessThan(LETTER_FRAME_MM.y1)
    const t = LETTER_TITLE_BLOCK_MM
    expect(b.x1 <= t.x0 || b.y1 <= t.y0, `${b.block} is clear of the title block`).toBe(true)
  }
  for (const a of boxes) {
    for (const b of boxes) {
      if (a === b) continue
      expect(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${a.block} and ${b.block} do not overlap`).toBe(true)
    }
  }
})

test("every stub and label of the h7 root lies inside the frame", () => {
  const f = LETTER_FRAME_MM
  for (const op of rootSheetOps(h7Module(), "h7-module").ops) {
    const points: unknown[] = op.op === "add_wire" && Array.isArray(op.vertices) ? op.vertices : op.op === "add_net_label" ? [op.at] : []
    for (const p of points) {
      if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") throw new Error("a point that is not (x, y)")
      expect(p[0] * MM > f.x0 && p[0] * MM < f.x1 && p[1] * MM > f.y0 && p[1] * MM < f.y1).toBe(true)
    }
  }
})

test("mcu's 90 ports split 45 and 45 down both edges; a block that fits one edge keeps them all west", () => {
  const sheets = arrangeRoot(h7Module(), "h7-module")
  const mcu = sheets.find((s) => s.block === "mcu")
  expect(mcu?.left.length).toBe(45)
  expect(mcu?.right.length).toBe(45)
  const ports = [...(mcu?.left ?? []), ...(mcu?.right ?? [])].map((p) => p.port)
  expect(ports).toEqual([...ports].sort())
  for (const s of sheets.filter((x) => x.block !== "mcu")) expect(s.right).toEqual([])
})

test("a sheet pin on the east edge is wired east to its label", () => {
  const sheet = arrangeRoot(h7Module(), "h7-module").find((s) => s.block === "mcu")
  const first = sheet?.right[0]
  if (sheet === undefined || first === undefined) throw new Error("mcu carries no east pin")
  const ops = rootSheetOps(h7Module(), "h7-module").ops
  const east = sheet.x + sheet.width
  const y = sheet.y + ROOT_PIN_PITCH_MIL
  expect(ops.some((op) => op.op === "add_wire" && JSON.stringify(op.vertices) === JSON.stringify([[east, y], [east + ROOT_STUB_MIL, y]]))).toBe(true)
  const label = ops.find((op) => op.op === "add_net_label" && JSON.stringify(op.at) === JSON.stringify([east + ROOT_STUB_MIL, y]))
  expect(label?.name).toBe(first.parent)
  expect(label?.rotation).toBe(0)
})

test("the arrangement is deterministic", () => {
  expect(JSON.stringify(rootSheetOps(h7Module(), "h7-module"))).toBe(JSON.stringify(rootSheetOps(h7Module(), "h7-module")))
})

test("the arrangement is the one in the committed op-list, whatever ran in this process before", () => {
  // A call made first on another board must not change the result (no state outside the function),
  // and the result must be the bytes the replay checks against: repair/root/01-assemble.json.
  rootSheetOps(syntheticNetwork([block("zz", 3), block("aa", 90)]), "other")
  const committed = readFileSync(
    "drafted/h7-platform/h7-module/repair/root/01-assemble.json", "utf8",
  )
  expect(JSON.stringify(rootSheetOps(h7Module(), "h7-module"), null, 1) + "\n").toBe(committed)
})

function syntheticNetwork(blocks: readonly BlockRecord[]): Network {
  const base = h7Module()
  return { ...base, blocks }
}

function block(prefix: string, ports: number): BlockRecord {
  const map: Record<string, string> = {}
  for (let i = 0; i < ports; i++) map[`P${String(i).padStart(3, "0")}`] = `${prefix.toUpperCase()}_N${i}`
  return { prefix, componentIds: [], ports: map }
}

test("a block too tall even down both edges is refused, naming it", () => {
  expect(() => arrangeRoot(syntheticNetwork([block("huge", 200)]), "t")).toThrow(/block "huge" has 200 ports/)
})

test("blocks that cannot all fit are refused, naming the first left over", () => {
  const many = Array.from({ length: 12 }, (_, i) => block(`b${String(i).padStart(2, "0")}`, 60))
  expect(() => arrangeRoot(syntheticNetwork(many), "t")).toThrow(/does not fit US Letter's inner frame: block "b\d\d" finds no free place/)
})
