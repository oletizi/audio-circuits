/**
 * **THE RESEARCH DOCUMENT IS HELD TO A RUN'S LOG ON EVERY `bun test`.**
 *
 * `tools/schgen/text-metrics/verify-pastes.ts` is the checker; this is what makes it able to fail.
 * **Controller ruling R12**: an evidence-checker that nothing runs is the built-but-unwired pattern
 * applied to the very artifact class it polices, and `docs/known-gaps.md` records that pattern four
 * times on this branch (**G226**). It is wired into `bun test` rather than `make check` because
 * `bun test` is green and runs.
 *
 * **WHAT THIS GUARDS, AND WHAT IT DOES NOT.** It guards
 * `docs/schematic/text-handling-research.md` against `probe-run.log` beside this file: if a pasted
 * block is edited after the fact - truncated, re-padded, rewrapped, left stale, or filled with
 * lines from elsewhere in the same run - this goes red. **It does NOT establish that the log is a
 * current run of the probe**, and nothing here could: re-driving the probe needs `kicad-cli`, the
 * KiCad Python bindings and a 2.9 MB font blob fetched to a path outside the repository. What it
 * does instead is COUPLE the two: the document names the commit its figures were measured at, the
 * log records the commit it was taken at, and the last case below requires them to agree. A log
 * refreshed without re-pinning the document, or a document re-pinned without refreshing the log,
 * fails here.
 *
 * **THE PERTURBATIONS ARE BUILT IN MEMORY AND THE DOCUMENT IS NEVER WRITTEN.** Three of them are a
 * reviewer's own attacks on this checker's Python predecessor, which went through two of them.
 */

import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../../../tools/perfboard/repo-root.ts"
import { DOCUMENT, OUTPUT_FENCE, parseBlocks, verify } from "../../../tools/schgen/text-metrics/verify-pastes.ts"

const repoRoot = moduleRepoRoot()
const LOG = path.join(repoRoot, "tests/schgen/text-metrics/probe-run.log")
const doc = fs.readFileSync(path.join(repoRoot, DOCUMENT), "utf8")
const log = fs.readFileSync(LOG, "utf8")

/** A line of the log that is genuine, and belongs to a DIFFERENT block than the one it is moved into. */
const LINE_FROM_ELSEWHERE = "ORDERING ink < advance < box: 0 violation(s) over 264 strings"

/** The first line of a `run` block, used as the anchor for the fabrication attack. */
const RATIO_BLOCK_FIRST =
  "estimate / glyph advance sum: n=264 min 0.955 p25 1.037 median 1.091 p75 1.200 max 1.448; the estimate is SMALLER than this quantity for 11 of 264 strings"

describe("the research document's pasted output", () => {
  test("every ```run block is a contiguous slice of the committed probe log", () => {
    const v = verify(doc, log)
    expect(v.failures).toEqual([])
    expect(v.verified).toBeGreaterThan(0)
    // Nothing falls out of the population: every block is in exactly one accounted state.
    expect(v.verified + v.notOutput.length + v.failures.length).toBe(v.blocks)
  })

  test("the blocks that are NOT checked are reported by name, never silently dropped", () => {
    const v = verify(doc, log)
    expect(v.notOutput.length).toBeGreaterThan(0)
    for (const n of v.notOutput) expect(n).toMatch(/^line \d+: \S/)
  })

  /**
   * **ATTACK (a), a reviewer's**: move a GENUINE line of the same log into the wrong block. The
   * predecessor passed this, because membership was flat over the whole log rather than positional.
   */
  test("RED: a genuine line from elsewhere in the same log, moved into the wrong block", () => {
    const victim =
      'route 1 vs route 2, stroked-outline width: 40 of 264 strings differ by more than a nanometre; worst disagreement 0.001524 um, on "TestPoint" - floating-point residue, not a difference in geometry'
    expect(doc.split(victim).length - 1).toBe(1)
    expect(log).toContain(LINE_FROM_ELSEWHERE)
    const v = verify(doc.replace(victim, LINE_FROM_ELSEWHERE), log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("not a contiguous slice")
  })

  /**
   * **ATTACK (b), a reviewer's, and the worse one**: fabricate four of six lines and leave two
   * genuine anchors. The predecessor dropped the block below its 50% gate and SILENTLY stopped
   * checking it, then reported success.
   */
  test("RED: four of six lines fabricated, two genuine anchors left in place", () => {
    const block = blockStartingWith(RATIO_BLOCK_FIRST)
    const fabricated = block.map((l, i) => (i % 3 === 1 ? l : l.replace(/n=264/, "n=999").replace(/widest/, "narrowest")))
    const v = verify(doc.replace(block.join("\n"), fabricated.join("\n")), log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("not a contiguous slice")
    // **The fabricated block is still ACCOUNTED FOR.** That is the whole point of the fix: under
    // the predecessor it left the population entirely and the run reported success. Here it is a
    // failure, and verified + notOutput + failures still covers every block in the document.
    expect(v.verified + v.notOutput.length + v.failures.length).toBe(v.blocks)
    expect(v.verified).toBe(v.blocks - v.notOutput.length - 1)
  })

  /**
   * **ATTACK (c), the dodge the fix for (b) would otherwise open**: relabel a block that carries
   * real output so that it is no longer declared as output, and it leaves the checked population.
   */
  test("RED: a block carrying real output is relabelled out of being declared output", () => {
    const block = blockStartingWith(RATIO_BLOCK_FIRST)
    const relabelled = doc.replace("```" + OUTPUT_FENCE + "\n" + block[0], "```\n" + block[0])
    expect(relabelled).not.toBe(doc)
    const v = verify(relabelled, log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("appear in the run's log")
  })

  /**
   * The document names the commit its figures were measured at; the log records the commit it was
   * taken at. **Neither can move without the other**, which is the only staleness this file can
   * see.
   */
  test("the document's pinned commit is the commit the log was taken at, on a clean tree", () => {
    const fromLog = /^repository commit: ([0-9a-f]{40}) \(clean tree\)$/m.exec(log)
    expect(fromLog?.[1]).toBeDefined()
    const short = (fromLog?.[1] ?? "").slice(0, 7)
    expect(doc).toContain(`at repository commit **\`${short}\`** with a clean tree`)
  })

  test("the log is a probe run and not a hand-written fixture", () => {
    expect(log).toContain("== WHAT THIS RUN MEASURED")
    expect(log).toContain("font source: ")
    expect(log).toContain("pinned at SHA-256 dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9")
    expect(log).toContain("CONTROL PASSED: over 10 laid-out blocks the parallel search reproduces")
  })
})

/** The body of the one ```run block whose first line is `first`. */
function blockStartingWith(first: string): string[] {
  const hits = parseBlocks(doc).filter((b) => b.info === OUTPUT_FENCE && b.lines[0] === first)
  if (hits.length !== 1) throw new Error(`expected exactly one \`\`\`${OUTPUT_FENCE} block starting ${JSON.stringify(first)}; found ${hits.length}`)
  return [...(hits[0]?.lines ?? [])]
}
