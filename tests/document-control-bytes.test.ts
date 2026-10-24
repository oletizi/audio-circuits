/**
 * THE DOCUMENTS A HUMAN EDITS CARRY NO STRAY CONTROL BYTE.
 *
 * Task 6 of `docs/superpowers/plans/2026-10-23-net-names-and-floating-pins.md`, and the history is
 * the specification. **SIX** incidents on that one plan in three days, every one invisible in a
 * rendered diff and every one caused by typing a control-character escape into a tool parameter
 * where it arrived as the real byte:
 *
 * 1. A raw NUL in `docs/known-gaps.md`, which made `grep` treat all 25,000 lines as binary and
 *    suppress every match - and grepping that file is how every agent on this branch navigates it
 *    (`docs/known-gaps.md` **G277** clause 10).
 * 2. A repair of (1) broken because Python's text mode translates CR on READ.
 * 3. Two silently failed `Edit` calls in a review, where the escape became bytes and stopped
 *    matching the file.
 * 4. A NUL in `CLAUDE.md`, committed inside the very commit that added the rule against it
 *    (`f02fc67`) - the file every agent reads for its instructions became unsearchable.
 * 5. Raw bytes in the plan's own file, leaving all 463 lines unmatched by plain `grep` until
 *    another task noticed.
 * 6. A NUL in `./stripboard/materialize-net-names.test.ts`, a `.join()` separator typed as the
 *    byte - **found by the scan this task ran to decide this guard's scope**, not by anything
 *    failing. It is why the source arm below exists (**G289**).
 *
 * **G277** clause 10's criterion is checkable in one line over the bytes and says it **must be
 * checked that way rather than by reading**, because the failure is invisible in a rendered diff
 * and makes the tool you would check it with go quiet. Its mechanism was recorded UNTRIED, with
 * the prediction that this will recur because nothing in the suite or `make check` looks for it.
 * This file is that scan.
 *
 * **WHY THE SCOPE IS BY EXTENSION AND NOT BY DIRECTORY.** `docs/` is not a text-only tree: it
 * holds three PDFs (`docs/pultec/P3bandDoc.pdf` and two under `docs/tascam-38/sources/`), three
 * CSVs and three `.net.xml` netlist exports. A PDF is binary by construction, so a
 * directory-scoped scan would be red on the first run for a reason that is not a defect. Scoping
 * to `*.md` and `*.ts` also excludes, without having to name them, the two populations that legitimately
 * hold a control byte: `tools/schgen/label-syntax/sheets/ctl-nul.kicad_sch`, a fixture carrying
 * one deliberate NUL to exercise **G277** clause 9's control arm, and
 * `tools/schgen/label-syntax/probe-run.log`, which records what `kicad-cli` emitted.
 *
 * **AND A LONE CR WOULD PASS THIS GUARD ANYWAY**, which is worth saying because the task brief
 * described the fixtures as carrying "a NUL and a lone CR" as if both needed excluding. CR is in
 * the allowed set - the scan's business is the C0 range MINUS tab, CR and LF - so
 * `ctl-carriage-return.kicad_sch` holds nothing this guard would refuse even in scope.
 * `[RAN]` a byte count over all ten fixture sheets: one offending byte in the tree, in
 * `ctl-nul.kicad_sch`.
 */

import { test, expect, afterAll } from "bun:test"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { Glob } from "bun"
import { cleanUpTempScratch, freshTempScratch } from "./support/temp-scratch.ts"

// The three CONTROL cases below each make a scratch directory under TMPDIR, so this file is held
// to `./support/temp-scratch.ts`'s registry: that module's comment carries the measurement where
// 60,000 unremoved directories filled the owner's disk, and
// `./stripboard/temp-scratch.test.ts` refuses a registering file that does not arm the hook.
afterAll(cleanUpTempScratch)

const TAB = 0x09
const LF = 0x0a
const CR = 0x0d

/**
 * The documents a human edits. `docs/**` is the register and every design, spec, plan and
 * writeup; `CLAUDE.md` and `AGENTS.md` are the governance files every agent reads first, and
 * incident 4 above landed in one of them.
 */
const SCOPE: readonly string[] = ["docs/**/*.md", "CLAUDE.md", "AGENTS.md"]

/**
 * **THE SECOND ARM, AND IT IS A DELIBERATE WIDENING OF THE SCOPE THIS TASK WAS GIVEN.** The task
 * brief scoped this guard to the three patterns above - "the documents a human edits". Driving the
 * measurement found a **sixth** incident of the same class **in a TypeScript source**:
 * `tests/stripboard/materialize-net-names.test.ts` held a raw NUL in a `.join()` separator, and
 * `grep -c pinSetKey` over that file returned **nothing, at exit 1**, for an identifier defined
 * three lines below the byte. A document-only scope would never have found it and would never
 * find the next one. **G289** carries the measurement, the repair and this deviation.
 *
 * `[RAN]` a byte count over every tracked file at the commit that fixed it: **all 894 `.ts`, all
 * 168 `.md` and all 82 `.json` files are clean.** The 26 tracked files that do hold a C0 byte are
 * 13 `.vrt` perfboard layouts, 9 `.png`, 3 `.pdf` and the one deliberate fixture sheet - which is
 * why the scan is scoped by EXTENSION and not by directory, and why **G277** clause 10's suggested
 * "repo-wide byte scan" is not what got written.
 */
const SOURCE_SCOPE: readonly string[] = ["lib/**/*.ts", "tools/**/*.ts", "tests/**/*.ts", "circuits/**/*.ts"]

function matching(root: string, patterns: readonly string[]): string[] {
  const seen = new Set<string>()
  for (const pattern of patterns) for (const f of new Glob(pattern).scanSync(root)) seen.add(f)
  return [...seen].sort()
}

function documentsInScope(root: string): string[] {
  return matching(root, SCOPE)
}

/**
 * Every byte below 0x20 that is not tab, CR or LF, reported as `<path> byte <offset>: 0x<hex>`.
 * The offset is a BYTE offset into the file and not a line number, because a line number is what
 * you cannot get once `grep` has decided the file is binary.
 */
function controlByteOffences(root: string, files: readonly string[]): string[] {
  const offences: string[] = []
  for (const f of files) {
    const bytes = readFileSync(join(root, f))
    for (const [i, b] of bytes.entries()) {
      if (b < 0x20 && b !== TAB && b !== LF && b !== CR) {
        offences.push(`${f} byte ${i}: 0x${b.toString(16).padStart(2, "0")}`)
      }
    }
  }
  return offences
}

test("the scope is not empty and holds the three documents the incidents landed in", () => {
  const files = documentsInScope(".")
  // An empty glob would make the scan below pass by scanning nothing, which is the failure mode
  // `CLAUDE.md` names: a skipped check must never look like a passing one.
  expect(files).toContain("CLAUDE.md")
  expect(files).toContain("AGENTS.md")
  expect(files).toContain("docs/known-gaps.md")
  expect(files.length).toBeGreaterThan(100)
  expect(files.filter((f) => !f.endsWith(".md"))).toEqual([])
})

test("no committed text document carries a control byte outside tab, CR and LF", () => {
  expect(controlByteOffences(".", documentsInScope("."))).toEqual([])
})

test("no TypeScript source carries a control byte outside tab, CR and LF either", () => {
  const sources = matching(".", SOURCE_SCOPE)
  // Same anti-vacuity guard as above: an empty population would make this pass by reading nothing.
  expect(sources).toContain("tests/stripboard/materialize-net-names.test.ts")
  expect(sources).toContain("tools/schgen/label-syntax/fixtures.ts")
  expect(sources.length).toBeGreaterThan(800)
  expect(controlByteOffences(".", sources)).toEqual([])
})

test("CONTROL: the scan names the file and the byte offset of a NUL, so the empty result above counts", () => {
  // Built in code, never typed: `String.fromCharCode(0)` is the rule this guard exists to enforce,
  // and typing the escape here would make this file the seventh incident.
  const dir = freshTempScratch("control-byte-guard-")
  writeFileSync(join(dir, "AGENTS.md"), `before${String.fromCharCode(0)}after\n`)
  expect(controlByteOffences(dir, ["AGENTS.md"])).toEqual(["AGENTS.md byte 6: 0x00"])
})

test("CONTROL: tab, CR and LF are accepted, so the scan is not refusing every document it reads", () => {
  const dir = freshTempScratch("control-byte-guard-")
  const allowed =`a${String.fromCharCode(TAB)}b${String.fromCharCode(CR)}${String.fromCharCode(LF)}c${String.fromCharCode(LF)}`
  writeFileSync(join(dir, "CLAUDE.md"), allowed)
  expect(controlByteOffences(dir, ["CLAUDE.md"])).toEqual([])
})

test("CONTROL: a byte at the top of the C0 range is caught too, not just NUL", () => {
  // 0x1f was the second byte `od -c` found in the register in incident 1, beside the NUL.
  const dir = freshTempScratch("control-byte-guard-")
  writeFileSync(join(dir, "AGENTS.md"), `${String.fromCharCode(0x1f)}\n`)
  expect(controlByteOffences(dir, ["AGENTS.md"])).toEqual(["AGENTS.md byte 0: 0x1f"])
})
