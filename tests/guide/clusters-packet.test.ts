/**
 * THE CLUSTERS PAGE IS DELIVERED, not merely renderable.
 *
 * `tests/guide/clusters-view.test.ts` asserts the hatching's mapping, and it
 * does so by calling `renderLayout` directly - which is the right shape for
 * that question and leaves three lines of DELIVERY unexercised: the
 * `hasClusters` arm of `packetFiles`, the `layout-clusters.svg` write in
 * `tools/guide/packet.ts`, and the fourth `image(...)` in
 * `tools/guide/guide.ts`. Every other `packetFiles` call in the tree passes
 * `false` and every other `GuideImages` hard-codes `clusters: undefined`, so
 * deleting all three left `bun test`, `bun run typecheck` and `make check`
 * green while `make guide` silently stopped emitting the page. That is the
 * failure `tools/guide/guide.ts`'s own module comment names for the schematic
 * notice - *"a reader holding four pages and concluding the fifth fell out of
 * the stapler - a skipped step that looks like a passing one"* - and the only
 * thing that noticed the page working in the first place was a person reading
 * the PDF, which is not a check.
 *
 * WHY THE REAL BOARD AND THE REAL VERB. The premise - that this board declares
 * stand-in groups at all - is a fact about `boards/pultec-low-boost`'s circuit
 * module, so the board is loaded the way `make guide` loads it: the committed
 * `.vrt` through the real pinned veroroute binary and the board's own circuit
 * module, the shape `./junction-pad-rows.test.ts` and `./board-pipeline.ts`
 * use. `guide/` on a real board is never written by a test.
 *
 * **THIS BOARD NOW DECLARES AN `"sch"`, AND THAT CHANGED THIS FILE'S PREMISE.**
 * Until `boards/pultec-low-boost/perfboard.json` named the approved page in
 * `drafted/pultec/pultec-low-boost/`, it declared none, and the paragraph that
 * stood here said so: `resolveSchematic` offered the board to a REAL `schgen`
 * generation against `REPO_ROOT`, that generation resolved `"withheld"`, and
 * `exportSchematicPdf` below THREW so that a stray export would be loud. It
 * also predicted the transition that has now happened - *"the day the
 * arrangement work drives that count to zero the board resolves `"generated"`
 * instead"* - and the prediction was right about the mechanism and wrong about
 * which arm would fire: the board got a DECLARED page rather than a ratified
 * generated one, so `resolveSchematic` returns `"printed"` on its first branch
 * and never reaches `schgen` at all.
 *
 * **SO THE OVERRIDE RECORDS INSTEAD OF THROWING, AND IT IS STILL THE SAME
 * GUARD.** An export is no longer stray - it is what a declared board is for -
 * so the test asserts it happened EXACTLY ONCE and for the declared sheet,
 * which is a stronger claim than the throw ever made and keeps the real
 * `kicad-cli` out of this harness's `/fake/kicad-cli` path. A silent stub is
 * what this file has always refused, and recording with an assertion is not one.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadBoardCircuit } from "../../tools/guide/circuit.ts"
import {
  writeGuidePacket, packetFiles, CLUSTERS_SVG, GUIDE_HTML, SCHEMATIC_PDF, type GuideDeps,
} from "../../tools/guide/packet.ts"
import { memoryFs } from "./memory-fs.ts"

const REPO_ROOT = moduleRepoRoot()
const BOARD = "pultec-low-boost"
const DECLARATION = loadDeclaration(path.join(REPO_ROOT, "boards", BOARD, "perfboard.json"))
const GUIDE_DIR = path.join(DECLARATION.dir, "guide")

interface Packet {
  readonly files: Map<string, string>
  readonly report: string
  /** Every `exportSchematicPdf` call, as `[schPath, pdfPath]`. */
  readonly exports: readonly (readonly [string, string])[]
}

/**
 * Run the real packet writer on the real board, through an in-memory
 * filesystem.
 *
 * `exportSchematicPdf` RECORDS, and every caller below asserts what it
 * recorded - see this file's module comment for why it no longer throws. It
 * writes through `fs` rather than to disk for the reason `printGuidePdf` does:
 * the staging directory this packet is assembled in exists only in the memory
 * filesystem, and an export that wrote anywhere else would leave the packet a
 * file short.
 */
async function writePacket(): Promise<Packet> {
  const { fs, files } = memoryFs()
  const exports: (readonly [string, string])[] = []
  const deps: GuideDeps = {
    kicadCli: "/fake/kicad-cli",
    htmlToPdf: "/fake/html-to-pdf",
    exportSchematicPdf: (_kicadCli, schPath, pdfPath) => {
      exports.push([schPath, pdfPath])
      fs.writeText(pdfPath, "%PDF-fake-schematic")
    },
    printGuidePdf: (_tool, _htmlPath, pdf) => {
      fs.writeText(pdf, "%PDF-fake")
    },
    fs,
    now: () => new Date("2026-10-18T12:00:00Z"),
    repoRoot: REPO_ROOT,
  }
  const report = await writeGuidePacket(DECLARATION, deps)
  return { files, report, exports }
}

test("the premise: pultec-low-boost declares stand-in groups, so its packet has a clusters page to deliver", async () => {
  const circuit = await loadBoardCircuit(DECLARATION)
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error(`test: ${BOARD} declares SCAFFOLD; the guide did not load it`)
  expect(scaffold.groups.length, "a group for each of the other four sections").toBe(4)
  // THE FILE LIST ITSELF, asserted directly: `packetFiles(_, true)` naming the
  // image is one of the three delivery lines, and a packet whose written set
  // and whose declared set both lost it would otherwise agree with itself.
  expect(packetFiles(false, true), "the clusters image is one of the packet's files").toContain(CLUSTERS_SVG)
  expect(packetFiles(false, false), "and only on a board that has groups").not.toContain(CLUSTERS_SVG)
})

test("the packet for a board with stand-in groups holds layout-clusters.svg, hatched", async () => {
  const { files, report, exports } = await writePacket()
  expect([...files.keys()].sort(), "the five-file packet plus the clusters image").toEqual(
    packetFiles(true, true).map((file) => path.join(GUIDE_DIR, file)).sort(),
  )
  // THE EXPORT HAPPENED, ONCE, AND FROM THE DECLARED SHEET. `hasSchematic: true`
  // above says the packet claims a schematic page; this says the page came from
  // the file `perfboard.json` names and from nothing else, which is the claim the
  // throwing override used to make in the negative.
  expect(exports.map(([sch]) => sch), "exactly one export, from the declared sheet").toEqual([
    DECLARATION.schPath ?? "test: the declaration names no sch",
  ])
  // INTO THE STAGING DIRECTORY, not into `guide/` - `tools/guide/packet.ts`
  // assembles the packet beside the real directory and swaps it in only once
  // every file exists, so the path the export was handed is the staging one and
  // the file set above is what it became after the rename.
  const pdf = exports[0]?.[1] ?? ""
  expect(path.basename(pdf)).toBe(SCHEMATIC_PDF)
  expect(path.dirname(pdf).startsWith(path.join(DECLARATION.dir, ".guide-staging-")), pdf).toBe(true)
  const clusters = files.get(path.join(GUIDE_DIR, CLUSTERS_SVG))
  if (clusters === undefined) throw new Error(`the packet wrote no ${CLUSTERS_SVG}`)
  // HATCH PATCHES, not merely a file: an unhatched copy of the designators
  // image under this name would be the silence the page exists to end.
  expect(clusters, "the image carries hatch patches").toContain('class="cluster"')
  expect(clusters, "and defines the patterns they point at").toContain("<pattern id=")
  expect(report, "and the console report names it").toContain(CLUSTERS_SVG)
})

test("guide.html embeds the fourth image, captioned as the stand-in groups page", async () => {
  const { files } = await writePacket()
  const html = files.get(path.join(GUIDE_DIR, GUIDE_HTML))
  if (html === undefined) throw new Error(`the packet wrote no ${GUIDE_HTML}`)
  expect(html.match(/<svg /g)?.length, "four layout images, not the three every board has").toBe(4)
  expect(html, "the fourth image says what it is").toContain("Component side - stand-in groups (hatched)")
  // THE PAGE IS THE ONE BEFORE THE DECISION IT INFORMS (`tools/guide/guide.ts`):
  // the picture, then the section where the builder records which groups this
  // build populates.
  const imageAt = html.indexOf("Component side - stand-in groups (hatched)")
  const sectionAt = html.indexOf("<h2>Stand-in groups</h2>")
  expect(sectionAt, "the packet prints the Stand-in groups section").toBeGreaterThan(-1)
  expect(imageAt, "the hatched image comes before that section").toBeLessThan(sectionAt)
})
