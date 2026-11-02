/**
 * Tests for the `guide` verb's dispatch (tools/cli/perfboard-binary-verbs.ts),
 * reached through `runCli`. The binary, kicad-cli and circuit module are
 * injected; the filesystem is a real throwaway tree, so the staging-and-swap
 * into `guide/` is exercised for real.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { packetFiles, type GuideDeps } from "../../tools/guide/packet.ts"
import { DUMP_TEXT, fixtureCircuit } from "../guide/fixture.ts"
import { fakePdfTools } from "../guide/fake-pdf-tools.ts"

function boardTree(schematic: "declared" | "none" = "declared"): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-guide-"))
  const dir = path.join(root, "boards", "demo")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, "perfboard.json"),
    JSON.stringify({
      circuit: "c.ts",
      export: "demo",
      vrt: "demo.vrt",
      ...(schematic === "declared" ? { sch: "demo.kicad_sch", netlist: "demo.net" } : {}),
    }),
  )
  return root
}

const kicadCalls: string[][] = []
const printCalls: string[][] = []
/**
 * THE MERGE AND THE PAGE-SIZE READ ARE FAKED although this file writes a REAL
 * throwaway tree: the PDFs in it are the four bytes `%PDF`, and a real qpdf
 * would refuse them - rightly, which is the merge step's own test's subject
 * (tests/guide/merge-pdf.test.ts). What this file exercises is the verb's
 * dispatch and the real staging-and-swap.
 */
const pdfTools = fakePdfTools((file, text) => fs.writeFileSync(file, text))
const DEPS: Omit<GuideDeps, "kicadCli" | "htmlToPdf" | "pdfMerge"> = {
  runVeroroute: () => ({ status: 0, output: DUMP_TEXT }),
  exportSchematicPdf: (cli, sch, pdf) => {
    kicadCalls.push([cli, sch, pdf])
    fs.writeFileSync(pdf, "%PDF-fake")
  },
  printGuidePdf: (tool, html, pdf) => {
    printCalls.push([tool, html, pdf])
    fs.writeFileSync(pdf, "%PDF-fake")
  },
  mergeSchematicPage: pdfTools.mergeSchematicPage,
  pdfPageSizes: pdfTools.pdfPageSizes,
  loadCircuit: async () => fixtureCircuit(),
}

/** The three tool paths `make guide` passes, in the order it passes them. */
const TOOLS = [
  "--kicad-cli", "/fake/kicad-cli",
  "--html-to-pdf", "/fake/html-to-pdf",
  "--pdf-merge", "/fake/pdf-merge",
] as const

test("guide writes the packet into the board's guide/ directory, as ONE document", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["guide", ...TOOLS], {
      cwd: dir, log: (line) => lines.push(line), error: (line) => errors.push(line), guideDeps: DEPS, repoRoot: root,
    })
    expect(errors).toEqual([])
    expect(code).toBe(0)
    expect(fs.readdirSync(path.join(dir, "guide")).sort()).toEqual([...packetFiles(false)].sort())
    expect(fs.readdirSync(dir).sort()).toEqual(["guide", "perfboard.json"])
    expect(fs.readdirSync(dir).filter((name) => name.startsWith(".guide-staging"))).toEqual([])
    expect(kicadCalls.at(-1)?.[0]).toBe("/fake/kicad-cli")
    expect(printCalls.at(-1)?.[0]).toBe("/fake/html-to-pdf")
    // THE MERGED ONE, and nothing else printable beside it: the schematic is
    // page 2 of this file now, and the two intermediates are gone.
    expect(fs.readFileSync(path.join(dir, "guide", "guide.pdf"), "utf8")).toBe("%PDF-merged")
    expect(fs.existsSync(path.join(dir, "guide", "schematic.pdf"))).toBe(false)
    expect(fs.existsSync(path.join(dir, "guide", "guide-pages.pdf"))).toBe(false)
    expect(fs.readFileSync(path.join(dir, "guide", "guide.html"), "utf8")).toContain("boards/demo/demo.vrt")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide writes one document for a board with no schematic, through the real filesystem", async () => {
  // The same case packet.test.ts covers in memory, driven through the verb and
  // a real staging-and-swap, because that is the path `make guide` takes on the
  // Pultec sections - none of which declares a schematic.
  const root = boardTree("none")
  try {
    const dir = path.join(root, "boards", "demo")
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["guide", ...TOOLS], {
      cwd: dir, log: (line) => lines.push(line), error: (line) => errors.push(line), guideDeps: DEPS, repoRoot: root,
    })
    expect(errors).toEqual([])
    expect(code).toBe(0)
    expect(fs.readdirSync(path.join(dir, "guide")).sort()).toEqual([...packetFiles(false)].sort())
    expect(lines.join("\n")).toContain('declares no "sch"')
    const html = fs.readFileSync(path.join(dir, "guide", "guide.html"), "utf8")
    expect(html).toContain("No schematic in this packet")
    expect(html).toContain("boards/demo/perfboard.json")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses with neither tool path, naming both, writing nothing", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const errors: string[] = []
    const code = await runCli(["guide"], { cwd: dir, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("--kicad-cli and --html-to-pdf")
    expect(fs.existsSync(path.join(dir, "guide"))).toBe(false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses with --kicad-cli alone, naming the converter flag it is missing", async () => {
  // The flag this change added is NOT optional: a run without it would be a
  // packet with no PDF, which is the silence the whole guide path refuses.
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const errors: string[] = []
    const code = await runCli(["guide", "--kicad-cli", "/fake/kicad-cli"], {
      cwd: dir, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS,
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("guide is missing --html-to-pdf")
    expect(fs.existsSync(path.join(dir, "guide"))).toBe(false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses a tool flag given with no path, rather than eating the next flag", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const errors: string[] = []
    const code = await runCli(["guide", "--kicad-cli", "--html-to-pdf", "/fake/html-to-pdf"], {
      cwd: dir, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS,
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("--kicad-cli needs a path")
    expect(fs.existsSync(path.join(dir, "guide"))).toBe(false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide takes the three tool flags in any order", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const errors: string[] = []
    const code = await runCli(
      [
        "guide",
        "--pdf-merge", "/fake/pdf-merge",
        "--html-to-pdf", "/fake/html-to-pdf",
        "--kicad-cli", "/fake/kicad-cli",
      ],
      { cwd: dir, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS, repoRoot: root },
    )
    expect(errors).toEqual([])
    expect(code).toBe(0)
    expect(fs.readdirSync(path.join(dir, "guide")).sort()).toEqual([...packetFiles(false)].sort())
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses from a directory that declares no board", async () => {
  const root = boardTree()
  try {
    const errors: string[] = []
    const code = await runCli(["guide", ...TOOLS], {
      cwd: root, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS,
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain('"guide" verb acts on exactly one declared board')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
