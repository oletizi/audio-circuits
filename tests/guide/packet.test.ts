import { test, expect } from "bun:test"
import path from "node:path"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import { unresolvedCutsMessage } from "../../tools/perfboard/cut-state.ts"
import {
  writeGuidePacket, packetFiles, GUIDE_HTML, GUIDE_PAGES_PDF, GUIDE_PDF, SCHEMATIC_PAGE,
  SCHEMATIC_PDF, type GuideDeps,
} from "../../tools/guide/packet.ts"
import { GUIDE_PAPER, type PageSize } from "../../tools/guide/paper.ts"
import { DUMP_TEXT, fixtureCircuit } from "./fixture.ts"
import { fakePdfTools } from "./fake-pdf-tools.ts"
import { memoryFs } from "./memory-fs.ts"

const DECLARATION: PerfboardDeclaration = {
  file: "/repo/boards/test-board/perfboard.json",
  dir: "/repo/boards/test-board",
  circuitPath: "/repo/circuits/test.ts",
  exportName: "testBoard",
  vrtPath: "/repo/boards/test-board/test.vrt",
  schPath: "/repo/circuits/test.kicad_sch",
  netlistPath: "/repo/tests/fixtures/test.net",
}

interface Harness {
  readonly deps: GuideDeps
  readonly files: Map<string, string>
  readonly veroroute: (readonly string[])[]
  readonly kicad: (readonly string[])[]
  /** One entry per `printGuidePdf` call: the converter, the HTML in, the PDF out. */
  readonly printed: (readonly string[])[]
  /** One entry per merge: the tool, the printed guide, the schematic, the output. */
  readonly merges: (readonly string[])[]
}

function harness(dump: string, initial: Record<string, string> = {}, paper: PageSize = GUIDE_PAPER): Harness {
  const { fs, files } = memoryFs(initial)
  const veroroute: (readonly string[])[] = []
  const kicad: (readonly string[])[] = []
  const printed: (readonly string[])[] = []
  const pdfTools = fakePdfTools((file, text) => fs.writeText(file, text), paper)
  const deps: GuideDeps = {
    kicadCli: "/fake/kicad-cli",
    htmlToPdf: "/fake/html-to-pdf",
    pdfMerge: "/fake/pdf-merge",
    mergeSchematicPage: pdfTools.mergeSchematicPage,
    pdfPageSizes: pdfTools.pdfPageSizes,
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
  return { deps, files, veroroute, kicad, printed, merges: pdfTools.merges }
}

const GUIDE = "/repo/boards/test-board/guide"

test("the packet writer writes all five files into the board's guide directory", async () => {
  const h = harness(DUMP_TEXT)
  const report = await writeGuidePacket(DECLARATION, h.deps)
  // `false`: the fixture circuit declares no SCAFFOLD, so there are no
  // stand-in groups to hatch and the packet carries no fourth layout image.
  // What that image holds on a board that HAS groups is
  // tests/guide/clusters-view.test.ts's subject.
  //
  // FIVE, NOT SIX: the schematic is a PAGE of guide.pdf now, and the two
  // intermediates it was merged from - guide-pages.pdf and schematic.pdf -
  // are removed before the swap. A packet holding a second printable PDF is
  // the state the owner asked to end.
  expect([...h.files.keys()].sort()).toEqual(packetFiles(false).map((file) => `${GUIDE}/${file}`).sort())
  expect(h.files.has(`${GUIDE}/${SCHEMATIC_PDF}`), "no second printable PDF survives").toBe(false)
  expect(h.files.has(`${GUIDE}/${GUIDE_PAGES_PDF}`), "nor the unmerged intermediate").toBe(false)
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

test("the schematic is merged into guide.pdf from the two staged intermediates", async () => {
  // THE DELIVERY LINE FOR "one printable document": the merge is called once,
  // with the printed-but-unmerged guide and the exported schematic page, and
  // it writes guide.pdf. A packet that printed both files and never merged
  // them would otherwise pass every other assertion in this file.
  const h = harness(DUMP_TEXT)
  await writeGuidePacket(DECLARATION, h.deps)
  expect(h.merges.length).toBe(1)
  const [tool, guideIn, schematicIn, out] = h.merges[0] ?? []
  expect(tool).toBe("/fake/pdf-merge")
  expect(guideIn).toContain(`.guide-staging-`)
  expect(guideIn?.endsWith(`/${GUIDE_PAGES_PDF}`)).toBe(true)
  expect(schematicIn?.endsWith(`/${SCHEMATIC_PDF}`)).toBe(true)
  expect(out?.endsWith(`/${GUIDE_PDF}`)).toBe(true)
  expect(h.files.get(`${GUIDE}/${GUIDE_PDF}`), "the published PDF is the MERGED one").toBe("%PDF-merged")
  // AND THE PRINTED PAGE NAMES WHERE IT WENT. The header row used to name the
  // .kicad_sch, which a builder at a bench cannot open.
  const html = h.files.get(`${GUIDE}/${GUIDE_HTML}`) ?? ""
  expect(html).toContain(
    `<dt>Schematic</dt><dd>page ${String(SCHEMATIC_PAGE)} of this document, printed from ` +
      "circuits/test.kicad_sch</dd>",
  )
})

test("a schematic page on other paper is carried unscaled and SAID SO, on the page and in the report", async () => {
  // Four of the five Pultec sheets declare A4 and the fifth A3; the owner
  // prints US Letter. Nothing scales the page, so the document has to say it
  // needs other paper - otherwise it is a packet that silently needs a printer
  // the reader does not own.
  const h = harness(DUMP_TEXT, {}, { widthPt: 841.896, heightPt: 595.296 })
  const text = await writeGuidePacket(DECLARATION, h.deps)
  const html = h.files.get(`${GUIDE}/${GUIDE_HTML}`) ?? ""
  expect(html).toContain(`Page ${String(SCHEMATIC_PAGE)} is not on this document's paper`)
  expect(html).toContain("297.0 x 210.0 mm (A4, landscape)")
  expect(html).toContain("215.9 x 279.4 mm (US Letter, portrait)")
  expect(html).toContain("refuses to publish a merge that resized any page")
  expect(text).toContain("297.0 x 210.0 mm (A4, landscape)")
})

test("a schematic page on the document's own paper prints no paper notice at all", async () => {
  // The other half of the guard: a notice on a document that prints fine would
  // be the false alarm that devalues it everywhere it is true.
  const h = harness(DUMP_TEXT, {}, { widthPt: 792, heightPt: 612 })
  const text = await writeGuidePacket(DECLARATION, h.deps)
  const html = h.files.get(`${GUIDE}/${GUIDE_HTML}`) ?? ""
  expect(html).not.toContain("not on this document")
  expect(text).not.toContain("BUT page")
  expect(text).toContain(`page ${String(SCHEMATIC_PAGE)} is the schematic`)
})

test("a multi-page schematic export is refused rather than described as one page", async () => {
  // The header row and the paper notice both name ONE page. A two-page export
  // would merge happily while the document went on describing one, so it is a
  // refusal rather than a guess at which page to name.
  const h = harness(DUMP_TEXT, { [`${GUIDE}/guide.html`]: "previous" })
  const twoPages: GuideDeps = {
    ...h.deps,
    pdfPageSizes: () => [GUIDE_PAPER, GUIDE_PAPER],
  }
  await expect(writeGuidePacket(DECLARATION, twoPages)).rejects.toThrow(
    /exported schematic is 2 pages, and this packet's printed structure names exactly one/,
  )
  expect([...h.files.entries()]).toEqual([[`${GUIDE}/guide.html`, "previous"]])
})

test("a failed merge leaves the previous packet in place, naming the merge tool", async () => {
  const h = harness(DUMP_TEXT, { [`${GUIDE}/guide.html`]: "previous" })
  const failing: GuideDeps = {
    ...h.deps,
    mergeSchematicPage: (tool) => {
      throw new Error(`could not run the PDF merge tool at ${tool}`)
    },
  }
  await expect(writeGuidePacket(DECLARATION, failing)).rejects.toThrow(
    /could not run the PDF merge tool at \/fake\/pdf-merge/,
  )
  expect([...h.files.entries()]).toEqual([[`${GUIDE}/guide.html`, "previous"]])
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

test("the guide's own pages are printed from the STAGED guide.html, before the swap into guide/", async () => {
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
  // TO THE INTERMEDIATE, not to guide.pdf: on a board with a schematic page
  // guide.pdf is what the MERGE writes, from this print's output.
  expect(pdfOut).toBe(`${path.dirname(htmlIn ?? "")}/${GUIDE_PAGES_PDF}`)
  expect(htmlIn).not.toContain(`${GUIDE}/`)
  expect(h.files.get(`${GUIDE}/${GUIDE_PDF}`)).toBe("%PDF-merged")
})

test("a board with NO schematic is printed straight to guide.pdf, with no merge tool involved", async () => {
  // One document either way, and a board with nothing to merge must not need a
  // merge tool to get one - requiring it would refuse a packet that was
  // already complete.
  const { schPath: _sch, netlistPath: _net, ...withoutSchematic } = DECLARATION
  const h = harness(DUMP_TEXT)
  await writeGuidePacket(withoutSchematic, h.deps)
  expect(h.merges).toEqual([])
  expect(h.printed.length).toBe(1)
  expect(h.printed[0]?.[2]?.endsWith(`/${GUIDE_PDF}`)).toBe(true)
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

test("a board that declares no schematic gets the same file list, and prints why", async () => {
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
