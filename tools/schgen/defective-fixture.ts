/**
 * **A DELIBERATELY DEFECTIVE GENERATION, BECAUSE NO REAL BOARD IS ONE** - Task 5 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`.
 *
 *   bun run tools/schgen/defective-fixture.ts [--out <dir>] [--pdf]
 *
 * **THE PROBLEM THIS SOLVES IS THAT THE MARKS WOULD OTHERWISE BE UNEXERCISED.** The census of
 * 2026-10-27 reads *"10 of 11 boards produce a drawing: 10 usable, 0 defective"*. Every one of the
 * ten is `usable`, so a sweep over the real boards proves only that a ratified drawing is UNMARKED;
 * it cannot see the watermark at all. `CLAUDE.md`: *"a skipped check must never look like a passing
 * one"*, and a mark that no test has ever caused to be emitted is exactly that.
 *
 * **IT MARKS A REAL DRAWING AND NOT A TOY ONE, which is the point of doing it this way.** The
 * fixture takes a board that really generates, really lays out and really draws - its wires, its
 * part values, its net labels, its frames - and puts a `defective` finding beside it. What comes out
 * is the page a person would be shown if a gate did find that board wrong about its circuit, so the
 * owner's bar - *"it doesn't need to be easy to read, it just needs to be possible to read"* - is
 * judged against a page with something on it worth reading.
 *
 * **THE FINDING IS SYNTHETIC AND SAYS SO, IN ITS OWN TEXT.** Nothing here claims the board is
 * defective: `pultec-hi-boost` is `usable` and this tool does not touch the gates that said so. It
 * injects one `Finding` of a kind `lib/schgen/findings.ts` classes `defective` and re-emits the same
 * geometry under it. A reader who opens the fixture's `.kicad_sch` and greps the finding text finds
 * a sentence saying it was fabricated by this file.
 */

import fs from "node:fs"
import path from "node:path"
import { finding, type Finding } from "../../lib/schgen/findings.ts"
import type { LoadedDesign } from "../../lib/schgen/design.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { caseResolver } from "./authoring-census.ts"
import { boardRefs, declarationFor } from "./board-sheets.ts"
import { parityDesign } from "./gate-census.ts"
import { generateReported, type GenerateEnv } from "./generate.ts"
import { generatedFiles, VERSION_LOCK } from "./generated-files.ts"
import { exportPdf, kicadVersion } from "./kicad-run.ts"

/**
 * The board the fixture is built from.
 *
 * **IT IS A BOARD THAT DRAWS WELL, chosen for that and stated so nobody reads it as an accusation.**
 * `pultec-hi-boost` generates one A3 sheet with the whole hi-boost section on it - inductors,
 * capacitor bank, both trimmers, the rotary switch and the junction bus - and carries no finding of
 * its own, so everything the watermark lands on top of is geometry somebody might actually want to
 * trace through it.
 */
export const FIXTURE_BOARD = "pultec-hi-boost"

/**
 * The fabricated finding.
 *
 * **ITS KIND IS REAL AND ITS TEXT IS NOT.** `geometry-disagrees-with-ir` is the general
 * *"the drawing does not mean the circuit"* kind that `lib/schgen/elk/adapt.ts`'s obligation arms
 * raise, and `classOf` maps it to `defective` - so the class this fixture produces is arrived at by
 * the same mapping every real refusal goes through rather than being set by hand.
 */
export const FIXTURE_FINDING: Finding = finding(
  "geometry-disagrees-with-ir",
  "FABRICATED BY tools/schgen/defective-fixture.ts. No gate reported this. It exists so the two " +
    "marks an unratified drawing carries are emitted by something, since no board in boards/ is " +
    "defective today and a mark nothing exercises is a mark nobody has looked at.",
  "tools/schgen/defective-fixture.ts",
)

export interface DefectiveFixture {
  readonly board: string
  /** The design the generation ran against, so a caller can write the files where it expects them. */
  readonly design: LoadedDesign
  /** The generated file set as the gates really classified it: `usable`, and therefore unmarked. */
  readonly ratified: ReadonlyMap<string, string>
  /** The same geometry re-emitted under one fabricated `defective` finding, and therefore marked. */
  readonly marked: ReadonlyMap<string, string>
  /** The top-level schematic's name within both maps. */
  readonly rootFile: string
  /** Every sheet file of the generation, the root first. */
  readonly sheetFiles: readonly string[]
}

/**
 * Generate `FIXTURE_BOARD` twice over ONE layout: as the gates classified it, and as `defective`.
 *
 * **THE GEOMETRY IS GENERATED ONCE AND EMITTED TWICE, which is what makes the pair evidence.** A
 * second `generateReported` would re-run ELK, and a difference between the two file sets could then
 * be a different layout rather than the mark. Here `generatedFiles` is handed the same circuit, the
 * same annotation and the same drawings both times, so everything that differs between `ratified`
 * and `marked` is the mark and the manifest hash that covers it.
 */
export async function defectiveFixture(repoRoot: string, scratch: string): Promise<DefectiveFixture> {
  const board = boardRefs(repoRoot).find((b) => b.name === FIXTURE_BOARD)
  if (board === undefined) {
    throw new Error(
      `the defective fixture is built from boards/${FIXTURE_BOARD}, which is not a board directory. ` +
        "It is not substituted for whatever board happens to be first: the fixture's whole value is " +
        "that the watermark lands on known geometry, and a silently different board would make the " +
        "rendered page a different page from the one its reading describes.",
    )
  }
  const declared = declarationFor(board)
  if (declared === null) {
    throw new Error(
      `boards/${FIXTURE_BOARD} has no SchematicAuthoring declaration, so no drawing can be generated ` +
        "for it and the defective fixture has nothing to mark (docs/known-gaps.md G247).",
    )
  }
  fs.mkdirSync(scratch, { recursive: true })
  const design = parityDesign(declared, caseResolver([declared]), repoRoot, scratch)
  const env: GenerateEnv = { kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: true }
  const g = await generateReported(design, env)
  if (g.findings.length > 0) {
    throw new Error(
      `the defective fixture needs a board whose gates are clean, so that everything the mark adds is ` +
        `visible as a difference. ${FIXTURE_BOARD} reported ${g.findings.length} finding(s) on this run: ` +
        `${g.findings.map((f) => `[${f.kind}] ${f.what}`).join("; ")}. Either that board regressed, or the ` +
        "fixture should move to another clean board - it is not papered over here, because a fixture " +
        "whose baseline is already unratified proves nothing about the mark.",
    )
  }
  // The lock text this generation actually recorded, taken from the file set it produced rather than
  // re-serialized: re-serializing would be a second implementation of `resolveVersions`'s decision.
  const versionLockText = g.files.get(VERSION_LOCK)
  if (versionLockText === undefined) {
    throw new Error(`the generation wrote no ${VERSION_LOCK}, so the fixture cannot re-emit it with the same bytes`)
  }
  const inputs = {
    design,
    circuit: g.circuit,
    symbols: g.symbols,
    annotation: g.annotation,
    versions: g.versions,
    versionLockText,
    drawings: g.drawings,
    manifestSources: g.manifestSources,
  }
  const marked = generatedFiles({ ...inputs, findings: [FIXTURE_FINDING] })
  const rootFile = `${design.spec.project}.kicad_sch`
  return {
    board: FIXTURE_BOARD,
    design,
    ratified: g.files,
    marked,
    rootFile,
    sheetFiles: [rootFile, ...g.drawings.map((d) => d.sheet.file)],
  }
}

/** Write one of the fixture's file sets into `dir`, returning the absolute paths written. */
export function writeFixture(dir: string, files: ReadonlyMap<string, string>): readonly string[] {
  fs.mkdirSync(dir, { recursive: true })
  const written: string[] = []
  for (const [name, text] of files) {
    const file = path.join(dir, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, text)
    written.push(file)
  }
  return written
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const outFlag = argv.indexOf("--out")
  const outDir = outFlag === -1 ? path.join(moduleRepoRoot(), "build", "schgen-defective-fixture") : path.resolve(argv[outFlag + 1] ?? ".")
  fs.rmSync(outDir, { recursive: true, force: true })
  const fixture = await defectiveFixture(moduleRepoRoot(), path.join(outDir, "scratch"))
  const markedDir = path.join(outDir, "marked")
  const ratifiedDir = path.join(outDir, "ratified")
  for (const f of writeFixture(markedDir, fixture.marked)) console.log(`wrote ${f}`)
  for (const f of writeFixture(ratifiedDir, fixture.ratified)) console.log(`wrote ${f}`)
  if (argv.includes("--pdf")) {
    for (const [label, dir] of [["marked", markedDir], ["ratified", ratifiedDir]] as const) {
      const pdf = path.join(outDir, `${label}.pdf`)
      exportPdf(path.join(dir, fixture.rootFile), pdf)
      console.log(`wrote ${pdf}`)
    }
  }
  console.log(
    `the marked set is ${fixture.board} re-emitted under one fabricated ${FIXTURE_FINDING.kind} finding; ` +
      "the ratified set is the same geometry as its own gates classified it. Diff a sheet to see exactly what the mark adds.",
  )
}
