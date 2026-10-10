import { test, expect } from "bun:test"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import { writeGuidePacket, type GuideFs } from "../../tools/guide/packet.ts"
import { DUMP_TEXT, fixtureCircuit } from "./fixture.ts"
import { attr, cutCentre, elements, holeCentre, lineEnds, num, type At } from "./svg-query.ts"

/**
 * End to end: the fixture's hand-written dump through the real preflight,
 * checklist, renderer and guide page, then the numbers read back out of
 * what was written. Cut N, bridge BN and wire WN in the checklist must name
 * the holes that the images draw cut N's cross, bridge N's bar and wire N's
 * line between - on every image that draws them.
 */

const DECLARATION: PerfboardDeclaration = {
  file: "/repo/boards/test-board/perfboard.json",
  dir: "/repo/boards/test-board",
  circuitPath: "/repo/circuits/test.ts",
  exportName: "testBoard",
  vrtPath: "/repo/boards/test-board/test.vrt",
  schPath: "/repo/circuits/test.kicad_sch",
  netlistPath: "/repo/tests/fixtures/test.net",
}

const GUIDE = "/repo/boards/test-board/guide"

async function writtenPacket(): Promise<ReadonlyMap<string, string>> {
  const files = new Map<string, string>()
  const fs: GuideFs = {
    makeDir: () => {},
    removeDir: (dir) => {
      for (const file of [...files.keys()]) if (file.startsWith(`${dir}/`)) files.delete(file)
    },
    writeText: (file, text) => {
      files.set(file, text)
    },
    rename: (from, to) => {
      for (const [file, text] of [...files]) {
        if (!file.startsWith(`${from}/`)) continue
        files.set(`${to}${file.slice(from.length)}`, text)
        files.delete(file)
      }
    },
  }
  await writeGuidePacket(DECLARATION, {
    kicadCli: "/fake/kicad-cli",
    runVeroroute: () => ({ status: 0, output: DUMP_TEXT }),
    exportSchematicPdf: (_cli, _sch, pdf) => fs.writeText(pdf, "%PDF-fake"),
    loadCircuit: async () => fixtureCircuit(),
    fs,
    now: () => new Date("2026-09-29T12:00:00Z"),
    repoRoot: "/repo",
  })
  return files
}

function file(files: ReadonlyMap<string, string>, name: string): string {
  const contents = files.get(`${GUIDE}/${name}`)
  if (contents === undefined) throw new Error(`test: the packet has no ${name}`)
  return contents
}

/** The checklist's rows, each as its cells, from the written guide.html. */
function checklistRows(html: string): string[][] {
  return [...html.matchAll(/<tr class="item">(.*?)<\/tr>/g)].map((match) =>
    [...(match[1] ?? "").matchAll(/<td>(.*?)<\/td>/g)].map((cell) => cell[1] ?? ""),
  )
}

function rowsNumbered(html: string, pattern: RegExp): { number: number; cells: string[] }[] {
  return checklistRows(html).flatMap((cells) => {
    const match = pattern.exec(cells[0] ?? "")
    return match?.[1] === undefined ? [] : [{ number: Number(match[1]), cells }]
  })
}

function midpoint(a: At, b: At): At {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** The same two points, in either order. */
function sameEnds(ends: readonly [At, At], a: At, b: At): boolean {
  const eq = (p: At, q: At): boolean => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01
  return (eq(ends[0], a) && eq(ends[1], b)) || (eq(ends[0], b) && eq(ends[1], a))
}

const files = await writtenPacket()
const HTML = file(files, "guide.html")
const IMAGES = ["layout-designators.svg", "layout-values.svg", "copper-side.svg"] as const
const COMPONENT_IMAGES = ["layout-designators.svg", "layout-values.svg"] as const

test("cut N in the checklist is between the two holes cut N's cross sits between, on every image", () => {
  const cuts = rowsNumbered(HTML, /^(\d+)$/)
  expect(cuts.map((cut) => cut.number)).toEqual([1, 2])
  for (const image of IMAGES) {
    const svg = file(files, image)
    for (const { number, cells } of cuts) {
      const [a, b] = (cells[1] ?? "").split(" and ")
      if (a === undefined || b === undefined) throw new Error(`test: unreadable cut row ${cells.join(" | ")}`)
      expect({ image, number, at: cutCentre(svg, number) }).toEqual({
        image, number, at: midpoint(holeCentre(svg, a), holeCentre(svg, b)),
      })
    }
  }
})

test("bridge BN in the checklist joins the two holes bridge N's bar joins, on every image", () => {
  const bridges = rowsNumbered(HTML, /^B(\d+)$/)
  expect(bridges.map((bridge) => bridge.number)).toEqual([1])
  for (const image of IMAGES) {
    const svg = file(files, image)
    for (const { number, cells } of bridges) {
      const [a, b] = (cells[1] ?? "").split(" to ")
      if (a === undefined || b === undefined) throw new Error(`test: unreadable bridge row ${cells.join(" | ")}`)
      const bar = elements(svg, "line", "bridge").find((el) => attr(el, "data-bridge") === String(number))
      if (bar === undefined) throw new Error(`test: ${image} draws no bridge ${number}`)
      expect(sameEnds(lineEnds(bar), holeCentre(svg, a), holeCentre(svg, b))).toBe(true)
      const label = [...svg.matchAll(/<text class="bridge-number"[^>]*>(.*?)<\/text>/g)].map((m) => m[1])
      expect(label).toContain(`B${number}`)
    }
  }
})

test("wire WN in the checklist runs between the holes wire N's line does, with W<N> printed beside it", () => {
  const wires = rowsNumbered(HTML, /^W(\d+)$/)
  expect(wires.map((wire) => wire.number)).toEqual([1, 2])
  for (const image of COMPONENT_IMAGES) {
    const svg = file(files, image)
    for (const { number, cells } of wires) {
      const [, from, to] = cells
      if (from === undefined || to === undefined) throw new Error(`test: unreadable wire row ${cells.join(" | ")}`)
      const wire = elements(svg, "line", "wire").find((el) => attr(el, "data-wire") === String(number))
      if (wire === undefined) throw new Error(`test: ${image} draws no wire ${number}`)
      const ends = lineEnds(wire)
      expect(sameEnds(ends, holeCentre(svg, from), holeCentre(svg, to))).toBe(true)
      const tag = new RegExp(`<text class="wire-number" data-wire="${number}"[^>]*>W${number}</text>`).exec(svg)?.[0]
      if (tag === undefined) throw new Error(`test: ${image} prints no W${number}`)
      // Beside its own wire: within a pitch (20) of the segment's bounding box.
      const x = num(tag, "x")
      const y = num(tag, "y")
      const near = 20
      expect(x).toBeGreaterThan(Math.min(ends[0].x, ends[1].x) - near)
      expect(x).toBeLessThan(Math.max(ends[0].x, ends[1].x) + near)
      expect(y).toBeGreaterThan(Math.min(ends[0].y, ends[1].y) - near)
      expect(y).toBeLessThan(Math.max(ends[0].y, ends[1].y) + near)
    }
  }
  expect(file(files, "copper-side.svg")).not.toContain('class="wire-number"')
})
