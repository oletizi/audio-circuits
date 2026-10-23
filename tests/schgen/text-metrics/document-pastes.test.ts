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
import { DOCUMENT, MIN_OUTPUT_LINES, OUTPUT_FENCE, RUN_MARKER, parseBlocks, parseSections, verify } from "../../../tools/schgen/text-metrics/verify-pastes.ts"

const repoRoot = moduleRepoRoot()
const LOG = path.join(repoRoot, "tests/schgen/text-metrics/probe-run.log")
const doc = fs.readFileSync(path.join(repoRoot, DOCUMENT), "utf8")
const log = fs.readFileSync(LOG, "utf8")

/** A line of the log that is genuine, and belongs to a DIFFERENT block than the one it is moved into. */
const LINE_FROM_ELSEWHERE = "ORDERING ink < advance < box: 0 violation(s) over 264 strings"

/** The one-line block this document used to carry, and the lines it now carries instead. */
const CONTROL_LINE =
  "CONTROL PASSED: over 10 laid-out blocks the parallel search reproduces lib/schgen/render/field-placement.ts exactly, block, unit, lib id, cost and covers."

/** The block that line now lives in: the five SKIPPED lines above it, and the line itself. */
const CONTROL_BLOCK = [
  "  SKIPPED opamp-buffer: validateCircuit reports 3 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them",
  "  SKIPPED optical-compressor: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them",
  "  SKIPPED optical-compressor/oc-audio: refused before checkLayout, so there is no grid-legal geometry to measure",
  "  SKIPPED optical-compressor/oc-sidechain: refused before checkLayout, so there is no grid-legal geometry to measure",
  "  SKIPPED pt2399-core: validateCircuit reports 18 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them",
  CONTROL_LINE,
]

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
    const owner = parseBlocks(doc).find((b) => b.lines[0] === RATIO_BLOCK_FIRST)
    expect(owner?.info.split(/\s+/)[0]).toBe(OUTPUT_FENCE)
    const relabelled = doc.replace("```" + (owner?.info ?? "") + "\n" + RATIO_BLOCK_FIRST, "```\n" + RATIO_BLOCK_FIRST)
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

  /**
   * **THE n=1 HOLE, which survived its own fix.** Contiguity collapses to flat membership at
   * length one, so the version before this one let the document's single-line block be swapped for
   * any unrelated genuine log line. The document no longer has a one-line block; this builds one.
   */
  test("RED: a run block shrunk to a single line, with and without a swap", () => {
    const shrunk = doc.replace(CONTROL_BLOCK.join("\n"), CONTROL_LINE)
    expect(shrunk).not.toBe(doc)
    for (const [name, text] of [
      ["shrunk", shrunk],
      ["shrunk and swapped for a genuine line from another section", shrunk.replace(CONTROL_LINE, LINE_FROM_ELSEWHERE)],
    ] as const) {
      const v = verify(text, log)
      expect(`${name}: ${v.failures.length}`).toBe(`${name}: 1`)
      expect(v.failures[0]).toContain(`carries 1 non-blank line(s); at fewer than ${MIN_OUTPUT_LINES}`)
    }
  })

  /**
   * The general form of the n=1 attack: substitute a WHOLE genuine contiguous slice taken from
   * another section. Length does not save a block from this; the section anchor does.
   */
  test("RED: a whole genuine slice of another section, substituted for a block", () => {
    const victim = parseBlocks(doc).find((b) => b.info.startsWith(`${OUTPUT_FENCE} STEP 2 ROUTE 2`))
    const donor = parseBlocks(doc).find((b) => b.info.startsWith(`${OUTPUT_FENCE} STEP 3b`))
    expect(victim?.lines.length).toBe(donor?.lines.length)
    const v = verify(doc.replace((victim?.lines ?? []).join("\n"), (donor?.lines ?? []).join("\n")), log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("is not a contiguous slice of section")
  })

  /** Padding a short block to length with a line that is NOT its neighbour. */
  test("RED: a one-line block padded to two with a non-neighbouring genuine line", () => {
    const shrunk = doc.replace(CONTROL_BLOCK.join("\n"), `${LINE_FROM_ELSEWHERE}\n${CONTROL_LINE}`)
    const v = verify(shrunk, log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("is not a contiguous slice of section")
  })

  /** Blank lines are not content: two of them must not satisfy the minimum. */
  test("RED: a block padded with blank lines rather than output", () => {
    const v = verify(doc.replace(`\`\`\`${OUTPUT_FENCE} STEP 3b:\n`, `\`\`\`${OUTPUT_FENCE} STEP 3b:\n\n\n`), log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("is not a contiguous slice of section")
  })

  /** An anchor that names no section, or two, is a failure rather than a block anchored to nothing. */
  test("RED: a section renamed in the log, and a section duplicated in it", () => {
    const renamed = verify(doc, log.replace("== STEP 4b: G260", "== STEP 4z: G260"))
    expect(renamed.failures.length).toBeGreaterThan(0)
    expect(renamed.failures[0]).toContain("matches 0 of the log's")
    const duplicated = verify(doc, log.replace("== STEP 3b: WHERE", "== STEP 3b: WHERE THE THREE QUANTITIES DISAGREE WITH EACH OTHER\n== STEP 3b: WHERE"))
    expect(duplicated.failures.length).toBe(1)
    expect(duplicated.failures[0]).toContain("matches 2 of the log's")
  })

  /** Two blocks quoting the same output: how the same line came to appear twice once already. */
  test("RED: two blocks claiming the same slice of the log", () => {
    const donor = parseBlocks(doc).find((b) => b.info.startsWith(`${OUTPUT_FENCE} STEP 3b`))
    const victim = parseBlocks(doc).find((b) => b.info.startsWith(`${OUTPUT_FENCE} STEP 2 ROUTE 2`))
    const dup = doc
      .replace(`\`\`\`${OUTPUT_FENCE} STEP 2 ROUTE 2:`, `\`\`\`${OUTPUT_FENCE} STEP 3b:`)
      .replace((victim?.lines ?? []).join("\n"), (donor?.lines ?? []).join("\n"))
    const v = verify(dup, log)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("already quotes")
  })

  /**
   * **RULING R15, and the reason it is an explicit check rather than a consequence.** A two-run log
   * is already refused by the section rule, once per block; without this the reader gets fourteen
   * "matches 2 of the log's headers" failures and no cause.
   */
  test("RED: a log holding two runs is refused by name, before any block is judged", () => {
    const v = verify(doc, `${log}\n${log}`)
    expect(v.failures[0]).toContain("the log holds 2 run(s)")
    expect(v.failures[0]).toContain("Split the log or re-drive the probe")
    // The consequence is still visible, which is what makes the named refusal worth having.
    expect(v.failures.length).toBeGreaterThan(1)
    expect(v.verified).toBe(0)
  })

  test("a log holding NO run is refused too, so the marker is load-bearing in both directions", () => {
    const v = verify(doc, log.replace(RUN_MARKER, "== SOMETHING ELSE ENTIRELY"))
    expect(v.failures[0]).toContain("the log holds 0 run(s)")
  })

  test("the log's sections are the anchors the document names, and there are more than one", () => {
    const sections = parseSections(log.split("\n"))
    expect(sections.length).toBeGreaterThan(1)
    for (const b of parseBlocks(doc).filter((x) => x.info.split(/\s+/)[0] === OUTPUT_FENCE)) {
      const prefix = b.info.slice(OUTPUT_FENCE.length).trim()
      expect(`${prefix} matches ${sections.filter((sx) => sx.title.startsWith(prefix)).length}`).toBe(`${prefix} matches 1`)
    }
  })
})

/**
 * **§2 IS HELD TO §2's OWN LOG BY A SECOND CALL - CONTROLLER RULING R17.**
 *
 * R15 made the checker single-log, and that stands: a log holding two runs gives every section
 * header a twin. **It was read as one log per REPOSITORY, which it never said**, and the
 * consequence was that §2 of the document - a different probe, a different log - was held to
 * nothing: the case above checks §1 against §1's log and treats §2's blocks only as "declared not
 * output, sharing no line with §1's log". A figure edited in §2's prose, or a block edited after
 * the fact, failed nothing.
 *
 * **WHY §2's BLOCKS ARE TAGGED ` ```elk-run ` IN THE DOCUMENT AND RE-TAGGED HERE.** Tagging them
 * ` ```run ` would make the whole-document case above fail, correctly: §1's log has no section
 * called `STEP 6`. So the document keeps them out of §1's output namespace, and this file maps the
 * fence word - and only the fence word, at a line start - before handing §2's own text to the same
 * checker with §2's own log. **The block bodies are untouched**, which the first case below
 * asserts by counting what the mapping changed.
 *
 * **THE ONE THING THE CHECKER GAINED is an optional run-marker parameter**, because the line that
 * marks the start of a run is a property of the probe that wrote the log and §2's probe writes a
 * different one - deliberately, since a shared line between the two logs is exactly the relabel
 * dodge the whole-document case refuses. Every existing call is unchanged.
 */
const ELK_LOG = path.join(repoRoot, "tools/schgen/elk-labels/probe-run.log")
const elkLog = fs.readFileSync(ELK_LOG, "utf8")

/** §2's probe's own first section header: the line that marks one run of THAT probe. */
const ELK_RUN_MARKER = "== WHAT THIS ELK LABEL RUN MEASURED"

/** The document's heading for §2, which is where its slice begins. */
const SECTION_2_HEADING = "§2 What ELK already offers for labels"

/** How many blocks §2 pastes. Pinned, so adding or dropping one is a deliberate edit here. */
const SECTION_2_BLOCKS = 8

/** §2's text with its fence word mapped into the checker's output namespace, and nothing else. */
function sectionTwoAsOutput(d: string): string {
  const at = d.indexOf(SECTION_2_HEADING)
  if (at < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_2_HEADING)}, so §2's slice cannot be found`)
  return d.slice(at).replace(/^```elk-run /gm, `\`\`\`${OUTPUT_FENCE} `)
}

describe("section 2's pasted output, against section 2's own log", () => {
  test("the mapping changes fence words and nothing else", () => {
    const slice = doc.slice(doc.indexOf(SECTION_2_HEADING))
    const mapped = sectionTwoAsOutput(doc)
    expect((slice.match(/^```elk-run /gm) ?? []).length).toBe(SECTION_2_BLOCKS)
    expect((mapped.match(/^```elk-run /gm) ?? []).length).toBe(0)
    expect(slice.length - mapped.length).toBe("elk-".length * SECTION_2_BLOCKS)
    // The bodies are identical block for block: only the info strings moved.
    const before = parseBlocks(slice).map((b) => b.lines.join("\n"))
    const after = parseBlocks(mapped).map((b) => b.lines.join("\n"))
    expect(after).toEqual(before)
  })

  test("every block section 2 pastes is a contiguous slice of section 2's committed log", () => {
    const v = verify(sectionTwoAsOutput(doc), elkLog, ELK_RUN_MARKER)
    expect(v.failures).toEqual([])
    expect(v.verified).toBe(SECTION_2_BLOCKS)
    expect(v.verified + v.notOutput.length + v.failures.length).toBe(v.blocks)
  })

  /**
   * RED: one digit of one figure, which is the drift this invocation exists to catch.
   *
   * **The victim line is taken from the log rather than written here**, because the first version
   * hard-coded it and went red when the probe gained a column - a failure that was the coupling
   * working, but on the test's own literal rather than on the document. The line it picks is the
   * cell-count line, which is the one the completeness claim in §2.7 rests on.
   */
  test("RED: a single digit edited in a section 2 block", () => {
    const victim = elkLog.split("\n").find((l) => l.startsWith("cells (arm x metric)"))
    if (victim === undefined) throw new Error("section 2's log has no cell-count line, so the completeness figure has moved and §2.7 needs re-reading")
    expect(doc.split(victim).length - 1).toBe(1)
    const perturbed = victim.replace(/(\d+)$/, (n) => String(Number(n) + 1))
    expect(perturbed).not.toBe(victim)
    const v = verify(sectionTwoAsOutput(doc.replace(victim, perturbed)), elkLog, ELK_RUN_MARKER)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("not a contiguous slice")
  })

  /** RED: a whole genuine slice of a DIFFERENT section of the same log, substituted. */
  test("RED: a genuine slice of another section of section 2's log", () => {
    const mapped = sectionTwoAsOutput(doc)
    const victim = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} STEP 2`)
    const donor = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} STEP 3`)
    expect(victim?.lines.length).toBeGreaterThan(1)
    expect(donor?.lines.length).toBeGreaterThan(1)
    const v = verify(mapped.replace((victim?.lines ?? []).join("\n"), (donor?.lines ?? []).join("\n")), elkLog, ELK_RUN_MARKER)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("is not a contiguous slice of section")
  })

  /**
   * **THE TWO LOGS MUST SHARE NO LINE, and this is the direct statement of it.** The
   * whole-document case already enforces it indirectly - a non-`run` block sharing a line with
   * §1's log is the relabel dodge - and that is how the collision was found: §2's probe originally
   * named its first section `== WHAT THIS RUN MEASURED`, §1's own header and the line R15 counts
   * runs by.
   */
  test("the two logs share no line, so neither marker can be read in the other's log", () => {
    const sectionOne = new Set(log.split("\n").filter((l) => l.trim() !== ""))
    const shared = elkLog.split("\n").filter((l) => l.trim() !== "" && sectionOne.has(l))
    expect(shared).toEqual([])
    expect(elkLog.split("\n").filter((l) => l === ELK_RUN_MARKER).length).toBe(1)
    expect(elkLog.split("\n").filter((l) => l === RUN_MARKER).length).toBe(0)
    expect(log.split("\n").filter((l) => l === ELK_RUN_MARKER).length).toBe(0)
  })

  /** The same staleness coupling §1 has: the document names the commit §2's log was taken at. */
  test("the commit section 2 pins is the commit section 2's log was taken at, on a clean tree", () => {
    const fromLog = /^repository commit: ([0-9a-f]{40}) \(clean tree\)$/m.exec(elkLog)
    expect(fromLog?.[1]).toBeDefined()
    expect(doc).toContain(`at repository commit\n**\`${(fromLog?.[1] ?? "").slice(0, 7)}\`** with a clean tree`)
  })

  test("section 2's log is a probe run and not a hand-written fixture", () => {
    expect(elkLog).toContain(ELK_RUN_MARKER)
    expect(elkLog).toContain("the bundle this run LOADS, hashed: SHA-256 ")
    expect(elkLog).toContain("CONTROL PASSED: serializeElkInput REFUSES a graph carrying an ELK label")
    expect(elkLog).toContain("arms that raised: 0")
  })
})

/** The body of the one ```run block whose first line is `first`. */
function blockStartingWith(first: string): string[] {
  const hits = parseBlocks(doc).filter((b) => b.info.split(/\s+/)[0] === OUTPUT_FENCE && b.lines[0] === first)
  if (hits.length !== 1) throw new Error(`expected exactly one \`\`\`${OUTPUT_FENCE} block starting ${JSON.stringify(first)}; found ${hits.length}`)
  return [...(hits[0]?.lines ?? [])]
}
