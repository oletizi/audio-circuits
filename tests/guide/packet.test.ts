import { test, expect } from "bun:test"
import path from "node:path"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import { unresolvedCutsMessage } from "../../tools/perfboard/cut-state.ts"
import {
  writeGuidePacket, packetFiles, GUIDE_HTML, GUIDE_PDF, type GuideDeps, type GuideFs,
} from "../../tools/guide/packet.ts"
import { DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

const DECLARATION: PerfboardDeclaration = {
  file: "/repo/boards/test-board/perfboard.json",
  dir: "/repo/boards/test-board",
  circuitPath: "/repo/circuits/test.ts",
  exportName: "testBoard",
  vrtPath: "/repo/boards/test-board/test.vrt",
  schPath: "/repo/circuits/test.kicad_sch",
  netlistPath: "/repo/tests/fixtures/test.net",
}

/** An in-memory filesystem: file path -> contents. */
function memoryFs(initial: Record<string, string> = {}): { fs: GuideFs; files: Map<string, string> } {
  const files = new Map(Object.entries(initial))
  const under = (dir: string): string[] => [...files.keys()].filter((file) => file.startsWith(`${dir}/`))
  return {
    files,
    fs: {
      makeDir: () => {},
      removeDir: (dir) => {
        for (const file of under(dir)) files.delete(file)
      },
      writeText: (file, text) => {
        files.set(file, text)
      },
      rename: (from, to) => {
        for (const file of under(from)) {
          files.set(`${to}${file.slice(from.length)}`, files.get(file) ?? "")
          files.delete(file)
        }
      },
    },
  }
}

interface Harness {
  readonly deps: GuideDeps
  readonly files: Map<string, string>
  readonly veroroute: (readonly string[])[]
  readonly kicad: (readonly string[])[]
  /** One entry per `printGuidePdf` call: the converter, the HTML in, the PDF out. */
  readonly printed: (readonly string[])[]
}

function harness(dump: string, initial: Record<string, string> = {}): Harness {
  const { fs, files } = memoryFs(initial)
  const veroroute: (readonly string[])[] = []
  const kicad: (readonly string[])[] = []
  const printed: (readonly string[])[] = []
  const deps: GuideDeps = {
    kicadCli: "/fake/kicad-cli",
    htmlToPdf: "/fake/html-to-pdf",
    runVeroroute: (args) => {
      veroroute.push(args)
      return { status: 0, output: dump }
    },
    exportSchematicPdf: (cli, sch, pdf) => {
      kicad.push([cli, sch, pdf])
      fs.writeText(pdf, "%PDF-fake")
    },
    printGuidePdf: (tool, htmlPath, pdf) => {
      printed.push([tool, htmlPath, pdf])
      fs.writeText(pdf, "%PDF-fake")
    },
    loadCircuit: async () => fixtureCircuit(),
    fs,
    now: () => new Date("2026-09-29T12:00:00Z"),
    repoRoot: "/repo",
  }
  return { deps, files, veroroute, kicad, printed }
}

const GUIDE = "/repo/boards/test-board/guide"

test("the packet writer writes all six files into the board's guide directory", async () => {
  const h = harness(DUMP_TEXT)
  const report = await writeGuidePacket(DECLARATION, h.deps)
  expect([...h.files.keys()].sort()).toEqual(packetFiles(true).map((file) => `${GUIDE}/${file}`).sort())
  expect(h.veroroute).toEqual([["--dump-board", DECLARATION.vrtPath]])
  expect(h.kicad[0]?.[0]).toBe("/fake/kicad-cli")
  expect(h.kicad[0]?.[1]).toBe("/repo/circuits/test.kicad_sch")
  expect(report).toContain(GUIDE_PDF)
  const html = h.files.get(`${GUIDE}/guide.html`) ?? ""
  expect(html).toContain("boards/test-board/test.vrt")
  expect(html).toContain("circuits/test.kicad_sch")
  expect(html).toContain("2026-09-29")
  expect(html.match(/<svg /g)?.length).toBe(3)
  expect(h.files.get(`${GUIDE}/layout-values.svg`)).toContain("2N3904")
  expect(report).toContain("guide.html")
})

test("the packet replaces what was in the guide directory before, and nothing outside it", async () => {
  const outside = {
    [DECLARATION.file]: "{}",
    [DECLARATION.vrtPath]: "layout",
    "/repo/boards/test-board/guide-notes.txt": "the operator's own notes",
  }
  const h = harness(DUMP_TEXT, { [`${GUIDE}/stale.svg`]: "old", ...outside })
  await writeGuidePacket(DECLARATION, h.deps)
  expect(h.files.has(`${GUIDE}/stale.svg`)).toBe(false)
  for (const [file, contents] of Object.entries(outside)) expect(h.files.get(file)).toBe(contents)
})

test("a layout in isolated-hole mode is refused, naming the stripboard verb", async () => {
  const h = harness(DUMP_TEXT.replace("CUT_STATE COMPUTED", "CUT_STATE NOT_APPLICABLE"))
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(/NOT_APPLICABLE[\s\S]*"stripboard" verb/)
  expect(h.files.size).toBe(0)
})

test("a cut state this tool does not know is refused rather than guessed at", async () => {
  const h = harness(DUMP_TEXT.replace("CUT_STATE COMPUTED", "CUT_STATE SOMETHING_NEW"))
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(/CUT_STATE SOMETHING_NEW/)
  expect(h.files.size).toBe(0)
})

test("a layout out of step with the circuit is refused before anything is written", async () => {
  const h = harness(DUMP_TEXT.replace("PART R1 RESISTOR 10K AT 2,3 SPAN 1\n", "").replace(/PIN R1 .*\n/g, ""))
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(/in the circuit but not on the board: R1/)
  expect(h.files.size).toBe(0)
})

const UNRESOLVED_DUMP = [
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "NODE 1 NAME VCC R1.1",
  "NODE 2 NAME GND R1.2",
  "VERTICAL_STRIPS 0",
  "CUT_STATE UNRESOLVED",
  "CUT_CONFLICT 2,4,1 2,7,2",
  "GRID 10 12",
  "PIN R1 1 AT 2,3",
  "PIN R1 2 AT 6,3",
  "",
].join("\n")

test("unresolved cuts are refused with the explanation make cuts gives, and nothing is written", async () => {
  const h = harness(UNRESOLVED_DUMP, { [`${GUIDE}/guide.html`]: "previous" })
  const expected = unresolvedCutsMessage(DECLARATION.vrtPath, UNRESOLVED_DUMP)
  expect(expected).toContain("CUTS NOT RESOLVED")
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(expected)
  expect([...h.files.keys()]).toEqual([`${GUIDE}/guide.html`])
  expect(h.kicad).toEqual([])
  expect(h.printed).toEqual([])
})

test("a floating part is refused, naming it and the fix", async () => {
  const h = harness(DUMP_TEXT.replace("PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3", "PART C1 CAP_ELECTRO_200 10uF FLOATING SPAN 3")
    .replace("PIN C1 1 AT 5,5\n", "").replace("PIN C1 2 AT 5,9\n", ""))
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(/C1 is not placed.*Place it in VeroRoute/s)
  expect(h.files.size).toBe(0)
})

test("guide.pdf is printed from the STAGED guide.html, before the swap into guide/", async () => {
  // The converter is handed the staging copy, not the published one, because
  // the print has to be inside the staging guarantee: a converter that fails
  // must leave the previous packet whole (the test below), which it cannot do
  // if the swap already happened.
  const h = harness(DUMP_TEXT)
  await writeGuidePacket(DECLARATION, h.deps)
  expect(h.printed.length).toBe(1)
  const [tool, htmlIn, pdfOut] = h.printed[0] ?? []
  expect(tool).toBe("/fake/html-to-pdf")
  expect(htmlIn).toContain(".guide-staging-")
  expect(htmlIn?.endsWith(`/${GUIDE_HTML}`)).toBe(true)
  expect(pdfOut).toBe(`${path.dirname(htmlIn ?? "")}/${GUIDE_PDF}`)
  expect(htmlIn).not.toContain(`${GUIDE}/`)
  expect(h.files.get(`${GUIDE}/${GUIDE_PDF}`)).toBe("%PDF-fake")
})

test("a failed PDF print leaves the previous packet in place, naming the converter", async () => {
  const h = harness(DUMP_TEXT, { [`${GUIDE}/guide.html`]: "previous" })
  const failing: GuideDeps = {
    ...h.deps,
    printGuidePdf: (tool) => {
      throw new Error(`could not run the HTML-to-PDF converter at ${tool}`)
    },
  }
  await expect(writeGuidePacket(DECLARATION, failing)).rejects.toThrow(
    /could not run the HTML-to-PDF converter at \/fake\/html-to-pdf/,
  )
  expect([...h.files.entries()]).toEqual([[`${GUIDE}/guide.html`, "previous"]])
})

test("a board that declares no schematic gets a five-file packet that prints why", async () => {
  // SUPERSEDES THE REFUSAL THAT USED TO BE ASSERTED HERE (known-gaps G16): a
  // board with no "sch" is now packeted, and the omission is PRINTED. What is
  // checked is all three halves of that: kicad-cli is never reached, the
  // packet is exactly the five files, and the statement is in guide.html -
  // the file a person prints - naming the board, the declaration, the circuit
  // model the pages were checked against, and the fix.
  const { schPath: _sch, netlistPath: _net, ...withoutSchematic } = DECLARATION
  const h = harness(DUMP_TEXT)
  const report = await writeGuidePacket(withoutSchematic, h.deps)
  expect([...h.files.keys()].sort()).toEqual(packetFiles(false).map((file) => `${GUIDE}/${file}`).sort())
  expect(h.files.has(`${GUIDE}/schematic.pdf`)).toBe(false)
  expect(h.kicad).toEqual([])
  const html = h.files.get(`${GUIDE}/guide.html`) ?? ""
  expect(html).toContain("No schematic in this packet")
  expect(html).toContain("there is no schematic for test-board to print")
  expect(html).toContain("boards/test-board/perfboard.json")
  expect(html).toContain("circuits/test.ts")
  expect(report).toContain('declares no "sch"')
  expect(report).not.toContain("schematic.pdf")
})

test("a failed schematic export leaves the previous packet in place", async () => {
  const h = harness(DUMP_TEXT, { [`${GUIDE}/guide.html`]: "previous" })
  const failing: GuideDeps = {
    ...h.deps,
    exportSchematicPdf: () => {
      throw new Error("kicad-cli exited 1")
    },
  }
  await expect(writeGuidePacket(DECLARATION, failing)).rejects.toThrow(/kicad-cli exited 1/)
  expect([...h.files.entries()]).toEqual([[`${GUIDE}/guide.html`, "previous"]])
})

test("headers are labelled by what goes in their holes, on the values image and in the checklist", async () => {
  const h = harness(DUMP_TEXT)
  await writeGuidePacket(DECLARATION, h.deps)
  const valuesSvg = h.files.get(`${GUIDE}/layout-values.svg`) ?? ""
  const partLabels = [...valuesSvg.matchAll(/<text class="part-label"[^>]*>(.*?)<\/text>/g)].map((m) => m[1])
  expect(partLabels).toContain("2-pin header")
  expect(partLabels).toContain("3-pin header")
  expect(partLabels).not.toContain("25K")
  const html = h.files.get(`${GUIDE}/guide.html`) ?? ""
  expect(html).toContain("<td>J1</td><td>2-pin header</td>")
  expect(html).toContain("<td>RV2</td><td>3-pin header (25K pot, off-board)</td>")
  for (const [file, contents] of h.files) {
    expect({ file, hasSymbolName: contents.includes("Conn_01x02") }).toEqual({ file, hasSymbolName: false })
  }
})

test("a placed part with no PIN lines is refused before anything is written, with the rebuild fix", async () => {
  const h = harness(DUMP_TEXT.replace(/PIN RV1 .*\n/g, ""), { [`${GUIDE}/guide.html`]: "previous" })
  await expect(writeGuidePacket(DECLARATION, h.deps)).rejects.toThrow(/part RV1 .*no PIN lines.*`make veroroute`/s)
  expect([...h.files.entries()]).toEqual([[`${GUIDE}/guide.html`, "previous"]])
})
