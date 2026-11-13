/**
 * The h7-pedal's provenance check (h7 pedal pages plan, Task 5; Review Focus 4): every component's
 * `provenance.source` cites at least one `file:line` or ruling id, and every citation it carries
 * resolves. Tasks 6, 8 and 10 run it again over each group's blocks.
 *
 * What resolves:
 * - a `path:line` (`.md`, `.ts` or `.json`): the file exists, under `docs/h7-platform/` for a bare
 *   name such as `parts.md:158` or from the repository root for a path such as
 *   `docs/h7-platform/parts.md:158`, and the line exists and is not blank;
 * - a ruling id (`CR-...`, `R-<n>`, `RR-<n>`, `O-<n>`, `D<n>`): a `### <id>` heading in
 *   `docs/h7-platform/decisions.md`.
 *
 * A source with no citation, or with one citation that does not resolve, is a problem: a citation
 * that points at nothing is a source nobody can read, which is the failure this check exists for.
 *
 * Its limit: it proves a citation resolves, not that the cited line supports the claim. A pass here
 * is not verification of a part; a reviewer still reads the cited line.
 */
import fs from "node:fs"
import path from "node:path"
import type { Component } from "../../lib/model/index.ts"

const REPO = path.join(import.meta.dir, "../..")
const DOCS = path.join(REPO, "docs/h7-platform")
const DECISIONS = fs.readFileSync(path.join(DOCS, "decisions.md"), "utf8")
const HEADINGS = new Set(DECISIONS.split("\n").filter((l) => l.startsWith("### ")).map((l) => l.slice(4).trim()))

const FILE_LINE = /([\w./-]+\.(?:md|ts|json)):(\d+)/g
const RULING_ID = /\b(CR-[A-Z0-9]+(?:-[A-Z0-9]+)*|RR-\d+|R-\d+|O-\d+|D\d+)\b/g

function lineProblem(file: string, line: number): string | null {
  const candidates = file.includes("/") ? [path.join(REPO, file)] : [path.join(DOCS, file), path.join(REPO, file)]
  const found = candidates.find((p) => fs.existsSync(p))
  if (found === undefined) return `cites ${file}:${line}, and no such file exists`
  const lines = fs.readFileSync(found, "utf8").split("\n")
  const text = lines[line - 1]
  if (text === undefined) return `cites ${file}:${line}, past the file's ${lines.length} lines`
  if (text.trim().length === 0) return `cites ${file}:${line}, which is blank`
  return null
}

/** Every problem with one component's provenance. Empty is a pass. */
export function provenanceProblems(c: Component): string[] {
  const source = c.provenance?.source ?? ""
  const problems: string[] = []
  const fileLines = [...source.matchAll(FILE_LINE)]
  // A ruling id is looked for in what is left once the file:line citations are taken out, so a file
  // name such as `R-61.md` is not read as a ruling.
  const rest = source.replace(FILE_LINE, " ")
  const rulings = [...rest.matchAll(RULING_ID)].map((m) => m[1] ?? "")
  if (fileLines.length === 0 && rulings.length === 0) {
    return [`${c.id}: provenance ${JSON.stringify(source)} cites no file:line and no ruling id`]
  }
  for (const m of fileLines) {
    const problem = lineProblem(m[1] ?? "", Number(m[2]))
    if (problem !== null) problems.push(`${c.id}: ${problem}`)
  }
  for (const id of rulings) {
    if (!HEADINGS.has(id)) problems.push(`${c.id}: cites ruling ${id}, which is not a heading in docs/h7-platform/decisions.md`)
  }
  return problems
}
