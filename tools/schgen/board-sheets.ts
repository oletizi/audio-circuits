/**
 * **WHAT `schgen` PRODUCES FOR EVERY BOARD IN `boards/`, board by board** - the measurement
 * `CLAUDE.md`'s *What this project is* asks for, committed so it is re-run rather than rebuilt
 * from a recipe in prose.
 *
 *   bun run tools/schgen/board-sheets.ts [--out <dir>] [--pdf]
 *
 * **WHY THE SUBJECT IS A BOARD AND NOT A BLOCK.** `tools/schgen/remeasure-coverage.ts` counts
 * declared BLOCKS that draw, which is the right unit for a layout defect and the wrong one for the
 * mandate: the owner's test is *"the schematics for the circuits we are currently building"*, and
 * what he builds is the eleven boards under `boards/`. **A census over blocks cannot answer it** -
 * five blocks drawing is compatible with zero boards drawing, which is exactly the state
 * `docs/known-gaps.md` **G259** records.
 *
 * **EVERY BOARD GETS AN ARTIFACT, AND THE ARTIFACT CARRIES ITS CLASS** - Task 4 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`. The owner, after four attempts to get past
 * a gate produced no picture: *"this is a persistent pathology: a gate halts rendering and we never
 * look at the picture so we can't tell if the gate is insane or not"*, then *"gates can still
 * refuse to ratify an output, but they shouldn't HIDE the output. The output should still be
 * available, but clearly classified as unratified."*
 *
 * So `outcome` is one of `findings.ts`'s four classes rather than the old
 * `generated | refused | no-declaration`, a board whose gates complained has its drawing WRITTEN
 * with a `STATUS.md` beside it, and a board with no drawing at all gets a one-page refusal sheet.
 * `tools/schgen/board-artifacts.ts` writes both. **An untyped error reaching the one `catch` below
 * is a `generator-defect` and fails the run**, which is the spec's totality rule: an unclassified
 * refusal must never read as a property of a circuit.
 *
 * **EVERY BOARD IS NAMED, INCLUDING ANY THIS PIPELINE CANNOT BE OFFERED.** A board with no
 * `SchematicAuthoring` declaration (**G247**) cannot be handed to `generate` at all; it is reported
 * `not-drawable` with `declared: false` and the export that has none - never omitted, never counted
 * as a failure of the drawing code, and never counted as a pass. `CLAUDE.md`: *"a skipped check
 * must never look like a passing one."* All eleven are declared today.
 *
 * **IT REPORTS THE FALLBACK FIELD PLACEMENTS OF EVERY SHEET IT PRODUCES.** A board that generates
 * is not thereby a board whose text is clear: `render/field-placement.ts` places a unit's Reference
 * and Value at the least-covered candidate slot when no slot is clear, rather than refusing the
 * drawing, and every such placement is counted here and in each generation's own
 * `RENDER-REPORT.md`. **A sheet with overlapping text must not read as a clean sheet**, so the
 * count is a column of this table and a non-zero total is printed as a warning line.
 *
 * It writes only under `--out` (a scratch directory by default) and never into `boards/` or into
 * any circuit directory.
 */

import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { caseResolver, type ParityCase } from "./authoring-census.ts"
import { boardOutputRoot, prepareBoardOutput, writeBoardArtifacts } from "./board-artifacts.ts"
import { ALL_DECLARED_CASES } from "./board-declarations.ts"
import { parityDesign } from "./gate-census.ts"
import { generateReported, writeGeneration, type GenerateEnv } from "./generate.ts"
import { finding, SchgenRefusal, worstClass, type Finding, type RefusalClass } from "../../lib/schgen/findings.ts"
import { exportPdf, kicadVersion } from "./kicad-run.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import type { FieldFallback } from "../../lib/schgen/render/field-placement.ts"
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts"

/** One board directory as `boards/<name>/perfboard.json` declares it. */
export interface BoardRef {
  readonly name: string
  /** The circuit module the board's netlist is built from, relative to the board directory. */
  readonly circuit: string
  /** The exported builder in that module. */
  readonly export: string
}

/**
 * Every board under `boards/`, in directory order.
 *
 * **The board's own manifest is the authority for which circuit it is**, not a name match: a
 * directory called `pultec-hi-boost` says nothing about which TypeScript builds it, and
 * `perfboard.json` already carries `circuit` and `export` for the perfboard pipeline.
 */
export function boardRefs(repoRoot: string): readonly BoardRef[] {
  const dir = path.join(repoRoot, "boards")
  const names = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  return names.map((name) => {
    const file = path.join(dir, name, "perfboard.json")
    if (!fs.existsSync(file)) {
      throw new Error(
        `board ${name} has no perfboard.json, so which circuit it is cannot be read. Every board ` +
          "directory carries one for the perfboard pipeline; a board without one is not skipped " +
          "here, because a row missing from this census is a board somebody would read as having " +
          "nothing to say.",
      )
    }
    const json: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
    if (typeof json !== "object" || json === null) throw new Error(`${file} is not a JSON object`)
    const record = json as Record<string, unknown>
    const circuit = record["circuit"]
    const exported = record["export"]
    if (typeof circuit !== "string" || typeof exported !== "string") {
      throw new Error(`${file} must carry string "circuit" and "export" fields; it has ${JSON.stringify(record)}`)
    }
    return { name, circuit, export: exported }
  })
}

/**
 * The authoring declaration for a board's circuit, or null when none declares it.
 *
 * **The match is on the BUILDER, not on the circuit directory**, and that distinction is the whole
 * of **G247**: `circuits/transistor-preamp/` holds five board builders and ONE authoring
 * declaration, which is written against `transistorPreampLab()`. A match on the directory would
 * report four boards as declared that nothing declares, which is the inversion this tool exists to
 * make visible.
 */
export function declarationFor(board: BoardRef, cases: readonly ParityCase[] = ALL_DECLARED_CASES): ParityCase | null {
  return cases.find((c) => c.entry === `${board.export}()`) ?? null
}

export interface BoardSheets {
  readonly board: string
  /**
   * **THE SPEC'S FOUR CLASSES, and `refused` is gone because it was never one thing.**
   *
   * Until Task 4 of `docs/superpowers/plans/2026-10-27-gates-classify.md` this field read
   * `generated | refused | no-declaration`, and `refused` covered a circuit that cannot be drawn,
   * a drawing that is merely crowded, a drawing that is wrong about the circuit and a `TypeError`
   * out of this generator - four different answers to *"may I build from this"* collapsed into
   * one word. `lib/schgen/findings.ts` carries the vocabulary and the owner's line between them.
   *
   * **`no-declaration` IS NOT A FIFTH CLASS: it is `not-drawable`, and `declared` below says so.**
   * A board `generate` cannot be offered at all has no geometry and none could exist, which is
   * exactly what `not-drawable` means. The distinction a reader needs - *is this circuit unready,
   * or is it undeclared* - is a separate fact and is kept as a separate field rather than smuggled
   * into the class.
   */
  readonly outcome: RefusalClass
  /**
   * Whether a `SchematicAuthoring` declaration exists for this board's builder (**G247**).
   *
   * `false` means `generate` was never called, so no gate here judged anything: `CLAUDE.md`'s *"a
   * skipped check must never look like a passing one"*, and the census prints the count separately
   * for that reason. Every board under `boards/` is declared today.
   */
  readonly declared: boolean
  /** The blocker in full, empty for a board whose gates all passed. */
  readonly blocker: string
  /**
   * Every gate complaint behind `outcome`, each carrying the kind that decided it.
   *
   * **It is the evidence for the class and not a restatement of it.** `worstClass(findings)` is
   * where `outcome` comes from, so a reader who disagrees with a classification can see which
   * finding produced it rather than having to re-run the generation to find out.
   */
  readonly findings: readonly Finding[]
  readonly sheets: number
  /** Field placements the placer could not make clear, over every sheet of this board. */
  readonly fallbacks: readonly FieldFallback[]
  /** The written schematic root, and the PDF when one was exported. */
  readonly files: readonly string[]
  /**
   * Every sheet this generation drew, straight off `Generation.drawings`.
   *
   * **It is here so a caller can apply its own gate without generating twice.** The guide packet
   * refuses to print a sheet carrying any `fieldFallbacks` - text the placer could not keep clear -
   * and re-running `generate` to find that out would double the cost of every guide build.
   * Empty when no sheet was drawn at all, which is not the same as a board that drew a sheet with
   * no fallbacks: read `schematicRoot` first.
   */
  readonly drawings: readonly SheetDrawing[]
  /**
   * Absolute path to the written top-level `.kicad_sch`, or `undefined` when nothing was written.
   *
   * **Separate from `files` because a caller that wants to export or copy the schematic should not
   * have to guess which entry of a path list is the root.** It was already computed on the PDF
   * path; this lifts it out and makes it unconditional.
   */
  readonly schematicRoot: string | undefined
}

export interface BoardSheetsOptions {
  readonly outDir: string
  readonly pdf: boolean
}

/**
 * The class a board gets when **no drawing was produced**, whatever its findings said.
 *
 * **A `usable` CLASS WITH NO FILE ON DISK WOULD BE A LIE WITH A GOOD WORD ON IT.** `usable` and
 * `defective` both assert *a drawing exists* - the spec's table says so in as many words - so when
 * nothing was written the class is `not-drawable`: no geometry exists, which is the literal
 * meaning. This case is reachable: a sheet-level gate can refuse a whole sheet over crowding, and
 * crowding is `usable`, so `worstClass` alone would hand back `usable` for a board with no sheet.
 *
 * **`generator-defect` IS NEVER REWRITTEN.** A broken invariant of this generator is not a fact
 * about the circuit and must not be reported as one; that is the spec's cardinal distinction and
 * the reason the fourth class exists at all.
 */
export function classWithoutDrawing(worst: RefusalClass): RefusalClass {
  return worst === "generator-defect" ? worst : "not-drawable"
}

/**
 * One board's schematic generation: what it produced, classified, **with an artifact on disk
 * either way**.
 *
 * It calls `generateReported`, not `generate`: a generation whose gates complained comes back
 * complete and is WRITTEN, with a `STATUS.md` beside it naming the class. The owner's directive -
 * *"gates can still refuse to ratify an output, but they shouldn't hide the output"* - is this one
 * call plus `writeBoardArtifacts`.
 */
export async function boardSheets(board: BoardRef, repoRoot: string, options: BoardSheetsOptions): Promise<BoardSheets> {
  const outDir = path.join(options.outDir, board.name)
  fs.mkdirSync(outDir, { recursive: true })
  const declared = declarationFor(board)
  if (declared === null) {
    // **`not-drawable`, NOT A CLASS OF ITS OWN.** `generate` cannot be offered this board, so no
    // geometry exists and none could - the literal definition. `declared: false` carries the
    // distinction a reader needs, and the census prints its own count of it.
    const row: BoardSheets = {
      board: board.name,
      outcome: "not-drawable",
      declared: false,
      blocker:
        `no SchematicAuthoring declaration for ${board.export}() (${board.circuit}). ` +
        "`generate` cannot be offered this board at all: docs/known-gaps.md G247.",
      findings: [],
      sheets: 0,
      fallbacks: [],
      files: [],
      drawings: [],
      schematicRoot: undefined,
    }
    return { ...row, files: writeBoardArtifacts(outDir, row) }
  }
  // **THE RESOLVER IS THIS BOARD'S OWN NICKNAMES AND NOT EVERY DECLARED CASE'S.**
  // `symbolLibraries` refuses a whole batch containing one unresolvable nickname, which is right
  // for a drawing and wrong for a census: a batch resolver would turn one board's missing library
  // into a refusal on all eleven, and this tool's whole job is to say WHICH board is blocked by
  // WHAT. `tools/schgen/symbol-census.ts` makes the same move for the same reason.
  const design = { ...parityDesign(declared, caseResolver([declared]), repoRoot, outDir) }
  const env: GenerateEnv = { kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: true }
  try {
    const g = await generateReported(design, env)
    const written = writeGeneration(design, g)
    const files = [...written]
    const root = path.join(outDir, `${design.spec.project}.kicad_sch`)
    if (options.pdf) {
      const pdf = path.join(outDir, `${board.name}.pdf`)
      exportPdf(root, pdf)
      files.push(pdf)
    }
    const row: BoardSheets = {
      board: board.name,
      outcome: worstClass(g.findings),
      declared: true,
      blocker:
        g.findings.length === 0
          ? ""
          : `the drawing is UNRATIFIED (${worstClass(g.findings)}): ${g.findings.length} finding(s) over ` +
            `${g.drawings.length} sheet(s). It is written anyway and classified; see STATUS.md beside it.` +
            `${g.findings.map((f) => `\n  - [${f.kind}] ${f.where}: ${f.what}`).join("")}`,
      findings: g.findings,
      sheets: g.drawings.length,
      fallbacks: g.drawings.flatMap((d) => d.fieldFallbacks),
      files,
      drawings: g.drawings,
      schematicRoot: root,
    }
    return { ...row, files: [...files, ...writeBoardArtifacts(outDir, row)] }
  } catch (caught) {
    // **THE ONE `catch` EVERY REFUSAL PASSES THROUGH, and the two arms below are the spec's
    // totality rule.** A `SchgenRefusal` declares its class through its findings. **An untyped
    // error does not, and is a `generator-defect` that FAILS THE RUN** - it is not a quiet bucket:
    // a `TypeError` reported as an ordinary undrawable board would make a bug in this generator
    // read as a property of the owner's circuit, which is this project's cardinal failure. The
    // residual plain `Error` throws in `emit.ts`, `generated-files.ts`, `fittingPaper` and
    // `shelfPacking` reach here, and this is what makes finding them loud rather than optional.
    const message = caught instanceof Error ? caught.message : String(caught)
    const typed = caught instanceof SchgenRefusal
    const findings = typed
      ? caught.findings
      : [
          finding(
            "invariant-violated",
            `an unclassified ${caught instanceof Error ? caught.constructor.name : typeof caught} reached the board ` +
              `census: ${message}. Every refusal between validateCircuit and the written file must be a ` +
              "SchgenRefusal carrying its findings (lib/schgen/findings.ts); this one is not, so its class " +
              "cannot be read and it is reported as a defect in the generator rather than guessed at.",
            "tools/schgen/board-sheets.ts catch",
          ),
        ]
    const row: BoardSheets = {
      board: board.name,
      outcome: classWithoutDrawing(worstClass(findings)),
      declared: true,
      blocker: message,
      findings,
      sheets: 0,
      fallbacks: [],
      files: [],
      drawings: [],
      schematicRoot: undefined,
    }
    return { ...row, files: writeBoardArtifacts(outDir, row) }
  }
}

/**
 * Every directory under `boards/`, read **again and directly**, as the set the census's rows must
 * cover.
 *
 * **IT IS A SECOND READ ON PURPOSE AND NOT A CACHED COPY OF THE FIRST.** `boardRefs` reads the
 * same directory and then does work on each entry - it opens `perfboard.json` and insists on two
 * string fields - so comparing the census against `boardRefs`'s own output would be comparing a
 * list to itself, which `docs/schematic/false-greens.md` catalogues as a mechanism. This reads
 * the directory names and nothing else, so a board the row-building path drops for any reason at
 * all shows up as a name on one side and not the other.
 */
export function boardDirectoryNames(repoRoot: string): readonly string[] {
  return fs
    .readdirSync(path.join(repoRoot, "boards"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/**
 * Every board, classified, each with its artifacts written under `options.outDir`.
 *
 * **IT EMPTIES `options.outDir` FIRST** (spec section 5, *"replaced wholly on each run"*): a board
 * that stops drawing would otherwise leave last run's schematic beside this run's `STATUS.md`
 * saying `not-drawable`, which is a drawing and a classification that disagree.
 *
 * **AND IT ASSERTS ITS ROWS COVER EVERY BOARD DIRECTORY, by name and in both directions.** A row
 * missing from this census is a board a reader would take as having nothing to say - the reason
 * the `no-declaration` row exists at all - and this is the check that makes that impossible rather
 * than conventional.
 */
export async function boardSheetsCensus(repoRoot: string, options: BoardSheetsOptions): Promise<readonly BoardSheets[]> {
  prepareBoardOutput(options.outDir)
  const out: BoardSheets[] = []
  for (const board of boardRefs(repoRoot)) out.push(await boardSheets(board, repoRoot, options))
  const covered = out.map((r) => r.board).sort()
  const directories = boardDirectoryNames(repoRoot)
  const missing = directories.filter((n) => !covered.includes(n))
  const extra = covered.filter((n) => !directories.includes(n))
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `the board census does not cover boards/ exactly: ${missing.length} board director${missing.length === 1 ? "y" : "ies"} ` +
        `with no row (${missing.join(", ") || "none"}) and ${extra.length} row(s) naming no board directory ` +
        `(${extra.join(", ") || "none"}). ${directories.length} director${directories.length === 1 ? "y" : "ies"}, ` +
        `${covered.length} row(s). It is not reported as a warning and not defaulted to whatever rows exist: a ` +
        "board missing from this census reads as a board with nothing to say, and this tool exists to say which " +
        "board is blocked by what. Fix boardRefs or boardSheets, in tools/schgen/board-sheets.ts.",
    )
  }
  return out
}

/** Boards whose generation produced a drawing on disk - `usable` or `defective`, never a count of classes alone. */
const drew = (census: readonly BoardSheets[]): readonly BoardSheets[] => census.filter((r) => r.schematicRoot !== undefined)

/**
 * The census as lines.
 *
 * **THE FALLBACK TOTAL IS A LINE OF ITS OWN AND IS NEVER FOLDED INTO THE DRAWING COUNT.** Two
 * numbers that move independently - boards that produce a sheet, and text the placer could not
 * keep clear - read as one result the moment they share a line, and the second one is the price of
 * the first.
 *
 * **THE HEADLINE SENTENCE CHANGED SHAPE IN TASK 4, AND THE OLD ONE IS NOT RECOVERABLE FROM THE NEW
 * ONE.** It read *"N of 11 boards produce a schematic"*, which was a true sentence while a board
 * either generated or refused. Now that a board can produce a drawing the gates would not ratify,
 * *produces a schematic* answers the wrong question on its own: the question is whether anyone may
 * BUILD from it. So the count of drawings is printed beside its split into `usable` and
 * `defective`, and the boards with no drawing beside their split into `not-drawable` and
 * `generator-defect`. **A drawing count without its split must not be quoted** - the same rule
 * `CLAUDE.md` states for `7 of 11` and its second column.
 */
export function renderBoardSheets(census: readonly BoardSheets[]): string {
  const lines: string[] = []
  for (const r of census) {
    const fb = r.fallbacks.length
    const drawn = r.schematicRoot !== undefined ? ` (${r.sheets} sheet(s), ${fb} fallback field placement(s))` : " - NO DRAWING"
    lines.push(`${r.board}: ${r.outcome}${drawn}`)
    if (r.blocker !== "") for (const line of r.blocker.split("\n")) lines.push(`    ${line}`)
    for (const f of r.fallbacks) lines.push(`    FALLBACK ${f.block} ${f.key}: covers ${f.covers.join(", ")} (cost ${f.cost} um^2)`)
    for (const file of r.files) lines.push(`    wrote ${file}`)
  }
  const generated = drew(census)
  const fallbacks = census.reduce((n, r) => n + r.fallbacks.length, 0)
  const count = (cls: RefusalClass): number => census.filter((r) => r.outcome === cls).length
  lines.push("")
  lines.push(
    `${generated.length} of ${census.length} boards produce a drawing: ${count("usable")} usable, ${count("defective")} defective`,
  )
  lines.push(
    `${census.length - generated.length} produce none: ${count("not-drawable")} not-drawable, ` +
      `${count("generator-defect")} generator-defect`,
  )
  lines.push(`${census.filter((r) => !r.declared).length} have no authoring declaration (G247)`)
  // **A `generator-defect` IS A BUG REPORT AND NOT A BOARD STATUS, so it fails the run.** The spec:
  // *"it is not a bucket a board can sit in quietly"* - a broken invariant of this generator
  // reported as an ordinary undrawable board is the misclassification the whole reform exists to
  // prevent, and a line in a long census is not loud enough on its own.
  for (const r of census.filter((x) => x.outcome === "generator-defect")) {
    lines.push(
      `GENERATOR DEFECT on ${r.board}: this is a BUG REPORT, not a board status. The census FAILS. ` +
        `${r.findings.map((f) => `[${f.kind}] ${f.what}`).join("; ")}`,
    )
  }
  // **THE ZERO HAS TWO MEANINGS AND THEY ARE NOT THE SAME RESULT.** No fallback on sheets that
  // exist is a clean set of drawings; no fallback because no sheet was produced is no evidence at
  // all, and printing one sentence for both would make the emptiest possible run read as the best.
  lines.push(
    generated.length === 0
      ? "fallback field placements: NOT MEASURED - no board produced a sheet, so there is no placed text to count"
      : fallbacks === 0
        ? "0 fallback field placements: every Reference and Value on every produced sheet sits in a clear slot"
        : `WARNING: ${fallbacks} fallback field placement(s) across ${generated.filter((r) => r.fallbacks.length > 0).length} board(s). ` +
            "Those sheets carry text the placer could not keep clear; each generation's RENDER-REPORT.md names them per block and per unit.",
  )
  return lines.join("\n")
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const outFlag = argv.indexOf("--out")
  // **THE DEFAULT IS DURABLE NOW, AND IT USED TO BE `mkdtemp`.** A census that printed a temp path
  // and then let the OS reap it is the pathology this plan is about wearing a tool's clothes: the
  // reform is worth nothing if nobody opens the artifacts. `build/schgen-boards/` is gitignored
  // and replaced wholly on each run.
  const outDir = outFlag === -1 ? boardOutputRoot(moduleRepoRoot()) : path.resolve(argv[outFlag + 1] ?? ".")
  const options: BoardSheetsOptions = { outDir, pdf: argv.includes("--pdf") }
  console.log(`writing generations under ${outDir}`)
  const census = await boardSheetsCensus(moduleRepoRoot(), options)
  console.log(renderBoardSheets(census))
  if (census.some((r) => r.outcome === "generator-defect")) {
    console.error(
      "the census FAILED: at least one board reported generator-defect. That is an invariant of the " +
        "schematic generator breaking, not a property of a circuit, and it is a bug report rather than a " +
        "status. See the GENERATOR DEFECT line(s) above and each board's STATUS.md.",
    )
    process.exitCode = 1
  }
}
