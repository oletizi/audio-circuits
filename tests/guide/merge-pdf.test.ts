/**
 * Tests for the real PDF merge step (tools/guide/merge-pdf.ts): the one that
 * makes a board's packet ONE printable document instead of two.
 *
 * **FIVE OF THESE DRIVE STAND-IN MERGE TOOLS**, for the reason
 * `tests/guide/print-pdf.test.ts` drives stand-in converters: each is one way
 * the step can fail, and the worst of them fail SILENTLY. Two matter most and
 * neither the exit status nor the `%PDF` magic can see either one:
 *
 *  - a tool that exits 0 and writes a VALID PDF with the schematic page
 *    missing - a packet that reads as complete and is not;
 *  - a tool that FITS the schematic to the guide's paper - a drawing shrunk to
 *    a size nobody approved.
 *
 * **THE LAST FOUR RUN THE REAL MERGE TOOL AND FAIL RATHER THAN SKIP**, on the
 * precedent `tests/guide/print-pdf.test.ts` and `tests/circuits/kicad-round-trip.ts`
 * set: `make guide` needs the merge tool the way it needs the browser, so it
 * is part of the toolchain, and these are the only proof that the arguments
 * this repository passes still merge on the machine in front of us.
 *
 * `mkdtempSync` IS DELIBERATELY WRITTEN OUT IN EVERY TEST rather than hidden
 * behind a factory, exactly as `tests/guide/print-pdf.test.ts` writes it out:
 * `tests/stripboard/temp-scratch.test.ts` holds every mkdtemp site under
 * `tests/` to removing the directory it named, and it reads the source for
 * an assignment of a named const from `fs.mkdtempSync`, so a factory returning
 * one would have to be waved through that check to pass. It caught this file
 * on its first full run - twice: once for the factory, and once for a version
 * of THIS PARAGRAPH that wrote the call out with its opening parenthesis,
 * which the guard reads as a site. Both reports were right.
 */
import { test, expect } from "bun:test"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  SCHEMATIC_PAGE,
  defaultMergeSchematicPage,
  defaultPdfPageCount,
  defaultPdfPageSizes,
  mergeArgs,
} from "../../tools/guide/merge-pdf.ts"
import { defaultPdfMerge } from "../../tools/guide/pdf-merge-install.ts"

/**
 * Still duplicates the default `PDF_MERGE := ...` line in make/board.mk, as
 * `tests/guide/print-pdf.test.ts` duplicates `HTML_TO_PDF`'s: a constant
 * shared between make and TypeScript is not possible, so the two are kept in
 * step by hand and `tests/kicad/install.test.ts` checks they agree.
 */
const PDF_MERGE = process.env["PDF_MERGE"] ?? defaultPdfMerge()

/** US Letter portrait and landscape, in points: the paper the packet prints on. */
const LETTER: readonly [number, number] = [612, 792]
const LETTER_LANDSCAPE: readonly [number, number] = [792, 612]
/** A4 landscape as `kicad-cli` exports it - what the Pultec sheets declare today. */
const A4_LANDSCAPE: readonly [number, number] = [841.896, 595.296]

/**
 * A minimal, valid, uncompressed PDF with one page per entry of `sizes`.
 *
 * Hand-built rather than printed by a browser so a test can state the page
 * sizes it is checking for, and so the merge is exercised on pages whose
 * `/MediaBox` is the only thing that distinguishes them. `/Resources` is
 * present on every page because without it qpdf reports a repair WARNING and
 * **exits 3**, which the merge step refuses - a measured fact about the tool,
 * recorded here because it is also why that refusal exists.
 */
function minimalPdf(sizes: readonly (readonly [number, number])[]): string {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${sizes.map((_, i) => `${i + 3} 0 R`).join(" ")}] /Count ${sizes.length} >>`,
    ...sizes.map(([w, h]) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << >> >>`),
  ]
  let body = "%PDF-1.4\n"
  const offsets: number[] = []
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefAt = body.length
  const rows = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")
  return (
    `${body}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${rows}` +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  )
}

/** The three paths one merge takes, with the two inputs written into `dir`. */
function inputsIn(
  dir: string,
  guideSizes: readonly (readonly [number, number])[] = [LETTER, LETTER, LETTER],
  schematicSizes: readonly (readonly [number, number])[] = [LETTER_LANDSCAPE],
): { readonly guide: string; readonly schematic: string; readonly out: string } {
  const guide = path.join(dir, "guide-pages.pdf")
  const schematic = path.join(dir, "schematic.pdf")
  fs.writeFileSync(guide, minimalPdf(guideSizes))
  fs.writeFileSync(schematic, minimalPdf(schematicSizes))
  return { guide, schematic, out: path.join(dir, "guide.pdf") }
}

test("a merge tool that is not there is refused by name, with the PDF_MERGE pointer", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    const missing = path.join(dir, "no-such-qpdf")
    expect(() => defaultMergeSchematicPage(missing, guide, schematic, out)).toThrow(
      new RegExp(`could not run the PDF merge tool at ${missing}[\\s\\S]*Set PDF_MERGE`),
    )
    expect(fs.existsSync(out)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a merge tool that cannot count pages is refused before any merge is attempted", () => {
  // The page count is read with the SAME tool, so a tool that cannot answer
  // --show-npages cannot check the result either. /bin/echo exits 0 and prints
  // something that is not a number.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    expect(() => defaultMergeSchematicPage("/bin/echo", guide, schematic, out)).toThrow(
      /--show-npages[\s\S]*which is not a page count/,
    )
    expect(fs.existsSync(out)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

/** A stand-in tool that answers the two read-only flags for real and then does `then`. */
function standIn(dir: string, name: string, then: readonly string[]): string {
  const script = path.join(dir, name)
  fs.writeFileSync(
    script,
    [
      "#!/bin/sh",
      `REAL="${PDF_MERGE}"`,
      'case "$1" in --show-npages|--json=*) exec "$REAL" "$@" ;; esac',
      "for last; do :; done",
      ...then,
      "",
    ].join("\n"),
  )
  fs.chmodSync(script, 0o755)
  return script
}

test("a merge tool that exits non-zero is refused, quoting how it was invoked", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    const script = standIn(dir, "fails.sh", ["exit 9"])
    expect(() => defaultMergeSchematicPage(script, guide, schematic, out)).toThrow(
      /exited 9 merging[\s\S]*It was invoked as: --empty --pages/,
    )
    expect(fs.existsSync(out)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a merge tool that exits 0 and writes nothing is refused - the case the exit status hides", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    const script = standIn(dir, "does-nothing.sh", ["exit 0"])
    expect(() => defaultMergeSchematicPage(script, guide, schematic, out)).toThrow(
      new RegExp(`exited 0 but wrote no PDF at ${out}`),
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a merge tool that writes something that is not a PDF is refused, naming %PDF", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    const script = standIn(dir, "writes-rubbish.sh", ['printf "GIF89a not a pdf" > "$last"', "exit 0"])
    expect(() => defaultMergeSchematicPage(script, guide, schematic, out)).toThrow(
      /does not begin with %PDF - it is not a PDF \(first bytes: "GIF8"\)/,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a merge that silently drops the schematic page is refused, naming both page counts", () => {
  // THE CHECK NEITHER THE EXIT STATUS NOR THE %PDF MAGIC CAN MAKE. This tool
  // exits 0 and writes a perfectly valid PDF - it is just the guide with no
  // schematic page in it, which is the one failure that would publish a packet
  // that reads as complete and is not.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir)
    const script = standIn(dir, "drops-a-page.sh", [`exec "$REAL" --empty --pages "${guide}" 1-z -- "$last"`])
    expect(() => defaultMergeSchematicPage(script, guide, schematic, out)).toThrow(
      /has 3 pages, not the 4 expected \(3 guide \+ 1 schematic\)/,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a merge that FITS the schematic to the guide's paper is refused, naming the page and both sizes", () => {
  // THE OTHER CHECK THE EXIT STATUS CANNOT MAKE, and the one the owner's
  // constraint turns on: he prints US Letter, and a page scaled to reach that
  // tray is a drawing nobody approved. This stand-in does exactly what a
  // well-meaning fit-to-page step would - every page comes out Letter - and
  // the step refuses it rather than publishing it.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir, [LETTER, LETTER, LETTER], [A4_LANDSCAPE])
    const script = standIn(dir, "fits-to-page.sh", [
      `exec "$REAL" --empty --pages "${guide}" 1 "${guide}" 1 "${guide}" 2-z -- "$last"`,
    ])
    expect(() => defaultMergeSchematicPage(script, guide, schematic, out)).toThrow(
      /page 2 of the merged PDF .* is 215.9 x 279.4 mm \(US Letter, portrait\), but .*schematic.pdf is 297.0 x 210.0 mm \(A4, landscape\) - the merge RESIZED or ROTATED it/,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("mergeArgs refuses a guide with no pages rather than building a range nobody can read", () => {
  expect(() => mergeArgs("/g.pdf", "/s.pdf", 0, "/out.pdf")).toThrow(/guide of 0 pages/)
})

test("the real merge tool puts the schematic at SCHEMATIC_PAGE and resizes nothing", () => {
  if (!fs.existsSync(PDF_MERGE)) {
    throw new Error(
      `the PDF merge tool was not found at ${PDF_MERGE}. Install qpdf, or set PDF_MERGE. This ` +
        "test does not skip: it is the only proof that the arguments make/board.mk passes still " +
        "merge on this machine.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    // A4 landscape deliberately, which is what the Pultec sheets export today:
    // the merge is size-agnostic and must carry the page through untouched
    // whatever paper it is on. Whether a reader can PRINT it is a separate
    // question the document states on page one, not one this step decides.
    const { guide, schematic, out } = inputsIn(dir, [LETTER, LETTER, LETTER], [A4_LANDSCAPE])
    defaultMergeSchematicPage(PDF_MERGE, guide, schematic, out)
    expect(fs.readFileSync(out).subarray(0, 4).toString("latin1")).toBe("%PDF")
    expect(defaultPdfPageCount(PDF_MERGE, out)).toBe(4)
    const sizes = defaultPdfPageSizes(PDF_MERGE, out)
    expect(sizes[SCHEMATIC_PAGE - 1]).toEqual({ widthPt: 841.896, heightPt: 595.296 })
    expect(sizes.filter((size) => size.widthPt === 612 && size.heightPt === 792).length).toBe(3)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)

test("the real merge tool appends a schematic to a one-page guide without asking for page 2", () => {
  // The `${SCHEMATIC_PAGE}-z` range is out of bounds on a guide with no page 2,
  // and qpdf refuses an out-of-range range rather than ignoring it, so the
  // argument list has to omit that range entirely. A guide this short is not
  // what any board prints today, which is exactly why it needs a test.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic, out } = inputsIn(dir, [LETTER], [LETTER_LANDSCAPE])
    defaultMergeSchematicPage(PDF_MERGE, guide, schematic, out)
    expect(defaultPdfPageCount(PDF_MERGE, out)).toBe(2)
    expect(defaultPdfPageSizes(PDF_MERGE, out)).toEqual([
      { widthPt: 612, heightPt: 792 },
      { widthPt: 792, heightPt: 612 },
    ])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)

test("the real tool's page count and page sizes are readings, not defaults", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-merge-pdf-"))
  try {
    const { guide, schematic } = inputsIn(dir, [LETTER, LETTER, LETTER, LETTER], [A4_LANDSCAPE, LETTER])
    expect(defaultPdfPageCount(PDF_MERGE, guide)).toBe(4)
    expect(defaultPdfPageCount(PDF_MERGE, schematic)).toBe(2)
    expect(defaultPdfPageSizes(PDF_MERGE, schematic).length).toBe(2)
    // The control: the same two readers over a file that is not a PDF at all
    // refuse, so the numbers above are measurements and not fallbacks.
    const rubbish = path.join(dir, "not-a.pdf")
    fs.writeFileSync(rubbish, "GIF89a")
    expect(() => defaultPdfPageCount(PDF_MERGE, rubbish)).toThrow(/--show-npages/)
    expect(() => defaultPdfPageSizes(PDF_MERGE, rubbish)).toThrow(/--json=latest/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)

test("the merge tool resolver covers darwin, linux and win32, and refuses anything else by name", () => {
  // Pure path arithmetic, the shape tests/kicad/install.test.ts uses for the
  // other two resolvers: the linux and win32 arms have not run on a machine of
  // either kind, and this file does not claim they have.
  expect(defaultPdfMerge("linux")).toBe("/usr/bin/qpdf")
  expect(defaultPdfMerge("win32")).toBe("C:\\Program Files\\qpdf\\bin\\qpdf.exe")
  expect(["/opt/homebrew/bin/qpdf", "/usr/local/bin/qpdf"]).toContain(defaultPdfMerge("darwin"))
  expect(() => defaultPdfMerge("plan9")).toThrow(/PDF_MERGE/)
})

test("the resolved default names a tool that exists on this machine and runs", () => {
  // Not a tautology: it is the check that the candidate list in
  // pdf-merge-install.ts names a binary that is really here and answers for
  // itself. A candidate list nobody ran is a whitelist of guesses.
  expect(fs.existsSync(PDF_MERGE)).toBe(true)
  expect(execFileSync(PDF_MERGE, ["--version"], { encoding: "utf8" })).toContain("qpdf")
})
