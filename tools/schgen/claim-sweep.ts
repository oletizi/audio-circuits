/**
 * **SWEEP THE TREE FOR A STALE CLAIM, AND SHOW WHAT AN EXCLUSION FILTER HIDES** - committed so
 * the figures `docs/known-gaps.md` **G245** publishes are re-run rather than rebuilt from a recipe
 * in prose, which is the same reason `gate-census.ts` and `authoring-census.ts` are committed.
 *
 *   bun run tools/schgen/claim-sweep.ts
 *   bun run tools/schgen/claim-sweep.ts --commit HEAD --claim '\b115\b|\b101\b' --narrow 'gate'
 *
 * **WHY IT PINS A COMMIT BY DEFAULT, AND WHY THAT IS THE WHOLE POINT** (controller ruling R70,
 * review item 2). G245 published a figure pair measured against the WORKING TREE in the middle of
 * a round of amendments, so re-running the same sweep a day later gives different numbers and the
 * published pair is unreachable - a `[RAN]` figure nobody can check, which `CLAUDE.md` treats as
 * not recorded. **Committing a script does not fix that by itself**: a script run against a moving
 * tree is as unreproducible as a shell line was. What fixes it is pinning the INPUT, so this
 * reconstructs a named commit with `git archive` into a temp directory and sweeps that.
 *
 * **THE THREE FORMS, AND THE MIDDLE ONE IS THE BUG** (G245, G244's class):
 *
 * - `broken` - exclude the register by filtering the OUTPUT LINES that mention it, which is what
 *   `grep -v known-gaps.md` after a pipe does. **It drops every line that CITES the register**,
 *   and in a register-citing codebase those are the evidentiary lines;
 * - `excludeFile` - exclude the register FILE, which is what was meant;
 * - `none` - no exclusion. **The control: it must be the largest**, or the pattern is matching
 *   something other than what the other two think they are narrowing.
 *
 * It asserts nothing and writes nothing. `DEFAULT_CLAIM` is the gate-1 problem-count claim Task 20
 * made historical; when no document carries that claim any more, this tool's defaults are stale and
 * **supersede means delete** applies to them.
 */

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** The repository root, from this file's own location: two directories up from tools/schgen/. */
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..")

/** The 115-and-101 gate-1 figures, which Task 20 made historical (G238, G245). */
const DEFAULT_CLAIM = "\\b115\\b|\\b101\\b"
/** Narrowed to lines that talk about validation or gates, so a bare number elsewhere is not a hit. */
const DEFAULT_NARROW = "problem|validate|gate|refus"
/** The tree the R70 sweep actually ran on: Task 20's own base. */
const DEFAULT_COMMIT = "34c3412"
const ROOTS = ["docs", "lib", "tools", "tests", "circuits"] as const
const REGISTER = "known-gaps.md"

export interface Hit {
  readonly file: string
  readonly line: number
  readonly text: string
}

export interface SweepCounts {
  /** Exclusion applied to output LINES that mention the register - the bug. */
  readonly broken: readonly Hit[]
  /** Exclusion applied to the register FILE - what was meant. */
  readonly excludeFile: readonly Hit[]
  /** No exclusion: the control, which must be the largest. */
  readonly none: readonly Hit[]
}

function everyFile(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) out.push(...everyFile(full))
    else if (name.endsWith(".md") || name.endsWith(".ts")) out.push(full)
  }
  return out
}

/** Every `.md`/`.ts` line under `root`'s declared directories matching both patterns. */
export function sweep(root: string, claim: RegExp, narrow: RegExp): SweepCounts {
  const none: Hit[] = []
  const excludeFile: Hit[] = []
  for (const dir of ROOTS) {
    for (const file of everyFile(path.join(root, dir))) {
      const rel = path.relative(root, file).split(path.sep).join("/")
      const lines = fs.readFileSync(file, "utf8").split("\n")
      lines.forEach((text, i) => {
        if (!claim.test(text) || !narrow.test(text)) return
        const hit: Hit = { file: rel, line: i + 1, text }
        none.push(hit)
        if (path.basename(file) !== REGISTER) excludeFile.push(hit)
      })
    }
  }
  // The bug, modelled exactly as the shell produced it: `grep -v` after a pipe sees `grep -rn`'s
  // whole output line - `file:line:text` - so it drops a line when the register is named ANYWHERE
  // in that string. That is two different drops at once: the register's own lines (because the
  // PATH matches, which is what made the filter look like it worked) and, in every other file,
  // every line that CITES the register.
  //
  // **THIS IS WHERE THE FIRST VERSION OF THIS TOOL WAS WRONG, and it would have published a wrong
  // figure.** It tested `h.text` alone, reported `broken` as 9 where the shell reported 6, and was
  // caught only by comparing against the shell run it was supposed to reproduce. A model of a bug
  // is not the bug; the control is the original.
  const broken = none.filter((h) => !`${h.file}:${h.line}:${h.text}`.includes(REGISTER))
  return { broken, excludeFile, none }
}

if (import.meta.main) {
  const arg = (name: string, fallback: string): string => {
    const i = process.argv.indexOf(`--${name}`)
    return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback
  }
  const commit = arg("commit", DEFAULT_COMMIT)
  const claim = new RegExp(arg("claim", DEFAULT_CLAIM))
  const narrow = new RegExp(arg("narrow", DEFAULT_NARROW), "i")

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-claim-sweep-"))
  try {
    const tar = execFileSync("git", ["archive", commit, ...ROOTS], { cwd: repoRoot, maxBuffer: 1 << 28 })
    execFileSync("tar", ["-x", "-C", work], { input: tar, maxBuffer: 1 << 28 })
    const counts = sweep(work, claim, narrow)
    console.log(`commit ${commit}; claim /${claim.source}/ narrowed by /${narrow.source}/i`)
    console.log(`  broken      (exclusion applied to the output LINE)  ${counts.broken.length}`)
    console.log(`  excludeFile (exclusion applied to the FILE)         ${counts.excludeFile.length}`)
    console.log(`  none        (control: must be the largest)          ${counts.none.length}`)
    const key = (h: Hit): string => `${h.file}:${h.line}`
    const kept = new Set(counts.broken.map(key))
    console.log("\nwhat the broken form HID that the correct one keeps:")
    for (const h of counts.excludeFile.filter((h) => !kept.has(key(h)))) {
      console.log(`  ${key(h)}  ${h.text.trim().slice(0, 100)}`)
    }
    console.log("\nevery site the correct form reports:")
    for (const h of counts.excludeFile) console.log(`  ${key(h)}`)
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}
