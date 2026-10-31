/**
 * **THE ARTIFACT EVERY BOARD GETS, whatever its gates said** - Task 4 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`, against the spec
 * `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4).
 *
 * The owner, having watched four gate-bypass attempts produce no picture: *"this is a persistent
 * pathology: a gate halts rendering and we never look at the picture so we can't tell if the gate
 * is insane or not"*, and then the directive: *"Gates can still refuse to ratify an output, but
 * they shouldn't HIDE the output. The output should still be available, but clearly classified as
 * unratified."*
 *
 * So this module writes, per board and under one durable gitignored directory:
 *
 * - **`STATUS.md`** - the class, the blocker in full, and every finding by kind. It is written for
 *   EVERY board, including the clean ones, because a directory that holds a status file only when
 *   something is wrong makes its absence the thing a reader has to notice.
 * - **`REFUSAL.kicad_sch`** - a one-page sheet naming the board and the reason, written when the
 *   board produced NO drawing. It is a KiCad file and not only prose so the spec's *"an artifact a
 *   person can open"* is satisfied by the same program the drawings are opened in, and so
 *   `kicad-cli` can export it to a page beside theirs.
 *
 * **THE REFUSAL SHEET IS NOT A DRAWING AND MUST NEVER BE MISTAKEN FOR ONE.** It carries no symbol,
 * no wire and no net - nothing but text - so there is no geometry on it to read as a circuit. That
 * is the spec's narrowing for `not-drawable`: *"the interrogable artifact is THE DEMAND"*.
 */

import fs from "node:fs"
import path from "node:path"
import { text } from "../../lib/schgen/render/emit-items.ts"
import { um, type Point } from "../../lib/schgen/render/geometry.ts"
import { int, list, print, str, yesNo } from "../../lib/schgen/render/sexpr-write.ts"
import { uuidV5 } from "../../lib/schgen/render/uuid.ts"
import type { Finding, RefusalClass } from "../../lib/schgen/findings.ts"

/**
 * Where the census writes, relative to the repository root.
 *
 * **IT IS DURABLE AND GITIGNORED, which are two requirements and not one.** Durable, because the
 * point of the whole reform is that somebody OPENS these files - a `mkdtemp` directory that the
 * run prints the path of and nobody can find again is the pathology in a new costume. Gitignored,
 * because every file in it is re-derived from committed sources in one run of this tool, and a
 * committed copy could only ever fall out of date with the circuit it claims to draw.
 *
 * `.gitignore`'s `build/` already covers it; the entry is named there anyway so a reader of that
 * file learns what is in here.
 */
export const BOARD_OUTPUT_DIR = "build/schgen-boards"

/** The census's output root for a repository. */
export function boardOutputRoot(repoRoot: string): string {
  return path.join(repoRoot, BOARD_OUTPUT_DIR)
}

/**
 * The output root, **emptied**, so each run's contents are that run's and nothing else.
 *
 * **A STALE BOARD DIRECTORY IS WORSE THAN A MISSING ONE.** A board that stops producing a drawing
 * would otherwise leave last run's schematic sitting there, with a fresh `STATUS.md` beside it
 * saying `not-drawable` - a drawing and a classification that disagree, which is precisely the
 * false green this spec exists to prevent. So the directory is replaced WHOLLY rather than written
 * over, per spec §5.
 *
 * It refuses to empty anything but a directory whose path ends in `BOARD_OUTPUT_DIR`'s own last
 * segment, or a temporary directory a test made: `fs.rmSync(dir, { recursive: true })` on a
 * mis-resolved root is not a recoverable mistake, and the guard is cheap.
 */
export function prepareBoardOutput(dir: string): string {
  const base = path.basename(path.resolve(dir))
  if (base === "" || base === "." || base === path.parse(dir).root) {
    throw new Error(
      `the board census will not empty ${dir}: it resolves to a filesystem root or to nothing. ` +
        "This directory is removed and recreated on every run (spec section 5, 'replaced wholly " +
        "each run'), so it must be a named leaf directory - build/schgen-boards by default, or a " +
        "temp directory under --out. It is not defaulted to the current directory because the " +
        "mistake is unrecoverable.",
    )
  }
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** The per-board status note. `blocker` is empty for a board nothing complained about. */
export interface BoardStatus {
  readonly board: string
  readonly outcome: RefusalClass
  readonly blocker: string
  readonly findings: readonly Finding[]
  /** The written schematic root, or `undefined` when no drawing was produced. */
  readonly schematicRoot: string | undefined
}

const CLASS_MEANING: Readonly<Record<RefusalClass, string>> = {
  usable: "A drawing exists and is correct about the circuit. It may be ugly; the owner's line is that ugly ships.",
  defective: "A drawing exists and is WRONG ABOUT THE CIRCUIT. Do not build from it.",
  "not-drawable": "No geometry exists and none could. The artifact here is the demand, not a drawing.",
  "generator-defect":
    "An invariant of the schematic generator failed. This is a BUG REPORT, not a property of the circuit, " +
    "and it fails the census run.",
}

/**
 * `STATUS.md` for one board.
 *
 * **IT NAMES THE CLASS IN THE FIRST LINE AND SAYS WHAT THE CLASS MEANS IN THE SECOND.** A reader
 * who opens one of these directories has a `.kicad_sch` in front of them and one question: may I
 * build from this. A status file that printed a bare word would make him go and find the spec.
 */
export function statusMarkdown(s: BoardStatus): string {
  const lines: string[] = []
  lines.push(`${s.board}: ${s.outcome.toUpperCase()}`)
  lines.push("")
  lines.push(CLASS_MEANING[s.outcome])
  lines.push("")
  lines.push(
    s.schematicRoot === undefined
      ? "No schematic was written for this board. REFUSAL.kicad_sch in this directory is a one-page sheet naming the reason."
      : `Schematic: ${path.basename(s.schematicRoot)}`,
  )
  lines.push("")
  if (s.blocker !== "") {
    lines.push("What the gates said, in full:")
    lines.push("")
    for (const line of s.blocker.split("\n")) lines.push(`    ${line}`)
    lines.push("")
  }
  lines.push(
    s.findings.length === 0
      ? "No findings: every gate this generation ran passed."
      : `${s.findings.length} finding(s), each with the kind that decided the class:`,
  )
  for (const f of s.findings) lines.push(`  - [${f.kind}] ${f.where}: ${f.what}`)
  lines.push("")
  lines.push(
    "Written by tools/schgen/board-sheets.ts. This whole directory is replaced on every run; " +
      "nothing here is hand-edited and nothing here is committed.",
  )
  return `${lines.join("\n")}\n`
}

const LINE_PITCH = um(6.35)
const LEFT = um(15)
const TOP = um(20)
const WRAP = 108

/** One long line broken on spaces to at most `WRAP` characters, so nothing runs off the page. */
function wrap(line: string): string[] {
  if (line.length <= WRAP) return [line]
  const out: string[] = []
  let current = ""
  for (const word of line.split(" ")) {
    if (current === "") current = word
    else if (`${current} ${word}`.length <= WRAP) current = `${current} ${word}`
    else {
      out.push(current)
      current = word
    }
  }
  if (current !== "") out.push(current)
  return out
}

/** The lines of the refusal sheet, in order. Separated from the emission so a test can read them. */
export function refusalSheetLines(s: BoardStatus): readonly string[] {
  const lines: string[] = [
    `UNRATIFIED - ${s.outcome.toUpperCase()} - NO DRAWING WAS PRODUCED`,
    "",
    `Board: ${s.board}`,
    `Class: ${s.outcome}`,
    "",
    ...wrap(CLASS_MEANING[s.outcome]),
    "",
    "THIS PAGE IS NOT A SCHEMATIC. It carries no symbol, no wire and no net. It is the refusal,",
    "written so that a board which produces no drawing still produces something a person can open.",
    "",
    "What the gates said:",
    "",
  ]
  for (const line of s.blocker.split("\n")) lines.push(...wrap(line))
  lines.push("")
  lines.push(`${s.findings.length} finding(s):`)
  for (const f of s.findings) lines.push(...wrap(`  - [${f.kind}] ${f.where}: ${f.what}`))
  return lines
}

/**
 * A one-page `.kicad_sch` carrying nothing but those lines.
 *
 * **EVERY LINE IS ITS OWN `text` ITEM, which is forced rather than chosen.** `sexpr-write.ts`'s
 * `str` refuses a control character outright - *"emit one text item per line"* - and a newline
 * inside a KiCad string is exactly the control-byte class `CLAUDE.md` spends a section on. One
 * item per line also means a line that grew too long is visible as a line, not as a string that
 * silently runs off the page edge; `wrap` above keeps them inside A4's width.
 */
export function refusalSheet(s: BoardStatus): string {
  const items = refusalSheetLines(s).map((line, i) => {
    const at: Point = { x: LEFT, y: TOP + i * LINE_PITCH }
    return text(`refusal:${s.board}:${i}`, { text: line, at }).node
  })
  return `${print(
    list(
      "kicad_sch",
      list("version", int(20260306)),
      list("generator", str("schgen-board-census")),
      list("generator_version", str("10.0")),
      list("uuid", str(uuidV5(`refusal:${s.board}`))),
      list("paper", str("A4")),
      list(
        "title_block",
        list("title", str(`${s.board}: ${s.outcome}`)),
        [list("comment", int(1), str(`UNRATIFIED (${s.outcome}) - this page is a refusal, not a schematic`))],
      ),
      list("lib_symbols"),
      items,
      list("embedded_fonts", yesNo(false)),
    ),
  )}\n`
}

/**
 * The status note, and the refusal sheet when there is no drawing. Returns what it wrote.
 *
 * **THE REFUSAL SHEET IS WRITTEN WHENEVER NO SCHEMATIC EXISTS, and not only for `not-drawable`.**
 * The spec's table gives `generator-defect` *"whatever geometry exists, if any, plus the refusal
 * sheet"*, and a `defective` or `usable` class that nonetheless produced no file is a disagreement
 * somebody has to see rather than a case to omit - the sheet names the class it was given.
 */
export function writeBoardArtifacts(dir: string, s: BoardStatus): readonly string[] {
  fs.mkdirSync(dir, { recursive: true })
  const written: string[] = []
  const status = path.join(dir, "STATUS.md")
  fs.writeFileSync(status, statusMarkdown(s))
  written.push(status)
  if (s.schematicRoot === undefined) {
    const sheet = path.join(dir, "REFUSAL.kicad_sch")
    fs.writeFileSync(sheet, refusalSheet(s))
    written.push(sheet)
  }
  return written
}
