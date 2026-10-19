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
 * use. What is injected is only what would touch the operator's disk or need a
 * browser: the filesystem (`./memory-fs.ts`) and the PDF print. `guide/` on a
 * real board is never written by a test.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadBoardCircuit } from "../../tools/guide/circuit.ts"
import {
  writeGuidePacket, packetFiles, CLUSTERS_SVG, GUIDE_HTML, type GuideDeps,
} from "../../tools/guide/packet.ts"
import { memoryFs } from "./memory-fs.ts"

const REPO_ROOT = moduleRepoRoot()
const BOARD = "pultec-low-boost"
const DECLARATION = loadDeclaration(path.join(REPO_ROOT, "boards", BOARD, "perfboard.json"))
const GUIDE_DIR = path.join(DECLARATION.dir, "guide")

interface Packet {
  readonly files: Map<string, string>
  readonly report: string
}

/**
 * Run the real packet writer on the real board, through an in-memory
 * filesystem.
 *
 * `exportSchematicPdf` throws rather than recording: this board declares no
 * `"sch"`, so a call here would mean the test is no longer about the board it
 * says it is, and a silent stub would hide that.
 */
async function writePacket(): Promise<Packet> {
  const { fs, files } = memoryFs()
  const deps: GuideDeps = {
    kicadCli: "/fake/kicad-cli",
    htmlToPdf: "/fake/html-to-pdf",
    exportSchematicPdf: () => {
      throw new Error(`test: ${BOARD} declares no "sch", so no schematic should be exported`)
    },
    printGuidePdf: (_tool, _htmlPath, pdf) => {
      fs.writeText(pdf, "%PDF-fake")
    },
    fs,
    now: () => new Date("2026-10-18T12:00:00Z"),
    repoRoot: REPO_ROOT,
  }
  const report = await writeGuidePacket(DECLARATION, deps)
  return { files, report }
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
  const { files, report } = await writePacket()
  expect([...files.keys()].sort(), "the five-file packet plus the clusters image").toEqual(
    packetFiles(false, true).map((file) => path.join(GUIDE_DIR, file)).sort(),
  )
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
