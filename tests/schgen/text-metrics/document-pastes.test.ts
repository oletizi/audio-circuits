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
/**
 * **AN INDEPENDENT RE-DERIVATION OF `verify`'s NOT-CHECKED LIST, scanning the raw document rather
 * than reusing `parseBlocks`.** Shared provenance is the document text and nothing else, so a
 * disagreement is a real disagreement between two scanners: a wrong line number, a wrong name, or a
 * dropped entry shows up as a list mismatch.
 *
 * It deliberately reimplements the fence walk instead of calling `parseBlocks`, because a check
 * built on the function it is checking is the shape this whole file exists to refuse.
 */
function notCheckedByOwnScan(d: string): readonly string[] {
  const lines = d.split("\n")
  const out: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^```(.*)$/.exec(lines[i] ?? "")
    if (open === null) continue
    const body: string[] = []
    let j = i + 1
    while (j < lines.length && !/^```\s*$/.test(lines[j] ?? "")) {
      body.push((lines[j] ?? "").replace(/\s+$/, ""))
      j += 1
    }
    const info = (open[1] ?? "").trim()
    // `elk-run` and `label-run` are §2's and §5's namespaces; against §1's log they are NOT output,
    // which is exactly what this list is of.
    if ((info.split(/\s+/)[0] ?? "") !== OUTPUT_FENCE) out.push(`line ${i + 1}: ${body.find((l) => l !== "") ?? "(empty block)"}`)
    i = j
  }
  return out
}

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

  /**
   * **THIS CASE WAS A PATTERN MATCH THAT COULD NOT FAIL, AND IT IS NOW A COMPARISON THAT CAN.**
   *
   * It used to assert `/^line \d+: \S/` over each entry. §5 pastes per-label detail whose every line
   * is indented under its block's header, so two of its blocks begin with spaces and the pattern was
   * loosened to `/^line \d+: .*\S/`. **A reviewer established two things about that.** First, the
   * loosening does not weaken what the guard refuses: the only input class the old form caught and
   * the new one did not is *a block whose first content line is indented*, which is a legitimately
   * named block and not a dodge. Second - and this is the finding - **`parseBlocks` right-trims every
   * line, so `first` is either guaranteed to contain non-whitespace or is the literal
   * `(empty block)`: the loosened pattern could not fail for any possible input.** The comment that
   * stood here named two shapes it supposedly still caught, an all-spaces first line and an all-blank
   * block, and the reviewer drove both: **both pass under the OLD pattern too.** It stated a fact
   * that driving refutes, which is worse than the un-failable assertion it was defending.
   *
   * **ROUTE TAKEN: keep the loosened form out of the assertion entirely and compare `verify`'s
   * report against an independent re-derivation from the raw document.** That can fail - if `verify`
   * mis-numbers an entry, names the wrong line, or drops one, the two lists diverge - and it is a
   * strictly stronger statement of this case's actual intent, which is that nothing leaves the
   * checked population unnamed.
   *
   * **THE ROUTE NOT TAKEN, and why.** A third route the reviewer names is to change the probe's own
   * indentation so §5's blocks begin in column one, which would let the original `\S` stand.
   * Declined on two grounds: the original pattern would then still be refusing a legitimate shape
   * (an indented first line) for no safety gain, and the probe's per-label lines are indented under
   * their block header because that is what makes a 489-line log readable. The dedent route the
   * reviewer checked - dedenting the document's copy - was never available: both blocks' first lines
   * are verbatim lines of §5's committed log, so dedenting breaks §5's own contiguity check.
   */
  test("the blocks that are NOT checked are reported by name, never silently dropped", () => {
    const v = verify(doc, log)
    expect(v.notOutput.length).toBeGreaterThan(0)
    expect(v.notOutput).toEqual(notCheckedByOwnScan(doc))
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

/**
 * **§5 IS HELD TO §5's OWN LOG BY A THIRD CALL, FOR THE REASON R17 GAVE FOR THE SECOND.**
 *
 * §5 is a third probe with a third log (`tools/schgen/label-freedom/probe-run.log`), and the
 * arrangement is §2's exactly: the document fences §5's blocks ` ```label-run ` so they stay out of
 * §1's and §2's output namespaces, this file maps the fence word - and only the fence word, at a
 * line start - and hands §5's slice to the same checker with §5's own log and §5's own run marker.
 *
 * **THE THREE LOGS MUST SHARE NO LINE, and the last case here is the direct statement of it.** The
 * whole-document call already enforces it indirectly for §1, and §2's call for §2: a block not
 * declared as THAT log's output which shares any line with it is the relabel dodge `verify` refuses.
 * **It cost a rename to satisfy.** §5's probe reuses Task 1's `laidOutBlocks`, whose skip lines are
 * word for word §1's log's `  SKIPPED ...` lines, so §5's probe prints `NOT MEASURED HERE: ...`
 * instead. §2's probe hit the same wall on its first section header.
 *
 * **WHAT THIS CAN AND CANNOT SEE** is §2's case list, unchanged: a figure edited in §5's prose, a
 * block truncated, re-padded, rewrapped, left stale or filled from another section of the same log.
 * It cannot see a block replaced by a different genuine, contiguous, unique slice of the SAME
 * declared section. Unlike §1's, **§5's probe can be re-driven from a clean checkout** - `kicad-cli`
 * is its only external dependency - so the staleness this coupling cannot see is cheaper to settle
 * there than in §1.
 */
const LABEL_LOG = path.join(repoRoot, "tools/schgen/label-freedom/probe-run.log")
const labelLog = fs.readFileSync(LABEL_LOG, "utf8")

/** §5's probe's own first section header: the line that marks one run of THAT probe. */
const LABEL_RUN_MARKER = "== WHAT THIS LABEL-FREEDOM RUN MEASURED"

/**
 * The document's heading for §5, which is where its slice begins and runs to the end of the file.
 *
 * **SINCE §6 WAS APPENDED, THAT SLICE CONTAINS §6, AND EVERY CASE BELOW STILL MEANS §5 FOR ONE
 * REASON: THEY COUNT ` ```label-run ` FENCES SPECIFICALLY RATHER THAN ALL FENCES.** §4 hit the
 * other version of this when §5 was appended - its slice ran to the end of the file and its pinned
 * count silently became a count of §4 plus §5 - and `sectionFour` now refuses without §5's heading
 * as an upper bound. §5 needs no such bound while its fence word is its own: §6's blocks are fenced
 * ` ```field-order-run `, so they are invisible to the mapping and to the pinned count, and they
 * reach §5's `verify` call as NOT CHECKED, which `verified + notOutput + failures = blocks` already
 * accounts for. **The dependence is on fence-word specificity, and it is written here so that
 * appending §7 is a decision rather than an accident.**
 */
const SECTION_5_HEADING = "§5 A global label's coordinates, and the four freedoms it actually has"

/** How many blocks §5 pastes. Pinned, so adding or dropping one is a deliberate edit here. */
const SECTION_5_BLOCKS = 13

/** §5's text with its fence word mapped into the checker's output namespace, and nothing else. */
function sectionFiveAsOutput(d: string): string {
  const at = d.indexOf(SECTION_5_HEADING)
  if (at < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_5_HEADING)}, so §5's slice cannot be found`)
  return d.slice(at).replace(/^```label-run /gm, `\`\`\`${OUTPUT_FENCE} `)
}

describe("section 5's pasted output, against section 5's own log", () => {
  test("the mapping changes fence words and nothing else", () => {
    const slice = doc.slice(doc.indexOf(SECTION_5_HEADING))
    const mapped = sectionFiveAsOutput(doc)
    expect((slice.match(/^```label-run /gm) ?? []).length).toBe(SECTION_5_BLOCKS)
    expect((mapped.match(/^```label-run /gm) ?? []).length).toBe(0)
    expect(slice.length - mapped.length).toBe("label-".length * SECTION_5_BLOCKS)
    const before = parseBlocks(slice).map((b) => b.lines.join("\n"))
    const after = parseBlocks(mapped).map((b) => b.lines.join("\n"))
    expect(after).toEqual(before)
  })

  test("every block section 5 pastes is a contiguous slice of section 5's committed log", () => {
    const v = verify(sectionFiveAsOutput(doc), labelLog, LABEL_RUN_MARKER)
    expect(v.failures).toEqual([])
    expect(v.verified).toBe(SECTION_5_BLOCKS)
    expect(v.verified + v.notOutput.length + v.failures.length).toBe(v.blocks)
  })

  /**
   * RED: one digit of the figure §5's whole Step 3 verdict rests on.
   *
   * **The victim line is taken from the log rather than written here**, the way §2's is, because a
   * hard-coded literal goes red when the probe gains a column - which is the test's own literal
   * drifting, not the document's. The line it picks is the TOTALS line, which carries "F1 alone
   * clears 5" - the figure that refutes this task's original premise.
   */
  test("RED: a single digit edited in the Step 3 totals", () => {
    const victim = labelLog.split("\n").find((l) => l.startsWith("TOTALS over "))
    if (victim === undefined) throw new Error("section 5's log has no TOTALS line, so the per-freedom scoreboard has moved and §5.7 needs re-reading")
    expect(doc.split(victim).length - 1).toBe(1)
    const perturbed = victim.replace("F1 alone clears 5", "F1 alone clears 6")
    expect(perturbed).not.toBe(victim)
    const v = verify(sectionFiveAsOutput(doc.replace(victim, perturbed)), labelLog, LABEL_RUN_MARKER)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("not a contiguous slice")
  })

  /**
   * RED: a whole genuine slice of a DIFFERENT section of the same log, substituted. §5 pastes four
   * blocks from `STEP 3 FREEDOMS` alone, so the section anchor is doing more work here than in §2.
   */
  test("RED: a genuine slice of another section of section 5's log", () => {
    const mapped = sectionFiveAsOutput(doc)
    const victim = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} STEP 2 ARMS`)
    const donor = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} STEP 3 POPULATION`)
    expect(victim?.lines.length).toBeGreaterThan(1)
    expect(donor?.lines.length).toBeGreaterThan(1)
    const v = verify(mapped.replace((victim?.lines ?? []).join("\n"), (donor?.lines ?? []).join("\n")), labelLog, LABEL_RUN_MARKER)
    expect(v.failures.length).toBe(1)
    expect(v.failures[0]).toContain("is not a contiguous slice of section")
  })

  /** The same staleness coupling §1 and §2 have: the document names the commit §5's log was taken at. */
  test("the commit section 5 pins is the commit section 5's log was taken at, on a clean tree", () => {
    const fromLog = /^label-freedom repository commit: ([0-9a-f]{40}) \(clean tree\)$/m.exec(labelLog)
    expect(fromLog?.[1]).toBeDefined()
    expect(doc).toContain(`at repository commit\n**\`${(fromLog?.[1] ?? "").slice(0, 7)}\`** with a clean tree`)
  })

  test("section 5's log is a probe run and not a hand-written fixture", () => {
    expect(labelLog).toContain(LABEL_RUN_MARKER)
    expect(labelLog).toContain("kicad-cli resolved to ")
    expect(labelLog).toContain("DISCRIMINATION ESTABLISHED: the same edit - renaming one global label - leaves the partition alone on one fixture")
    expect(labelLog).toContain("CONTROL PASSED: over 48 laid-out blocks, re-grading the unperturbed layout with checkLayout")
    expect(labelLog).toContain("arms whose measured result did not match the prediction published above: 0")
  })

  /**
   * **THE THREE LOGS SHARE NO LINE.** Asserted pairwise, because the indirect enforcement is one
   * call per log and a shared line is only visible from the other call.
   */
  test("the three logs this document quotes are pairwise line-disjoint", () => {
    const nonBlank = (t: string): Set<string> => new Set(t.split("\n").filter((l) => l.trim() !== ""))
    const one = nonBlank(log)
    const two = nonBlank(elkLog)
    const five = nonBlank(labelLog)
    expect([...five].filter((l) => one.has(l))).toEqual([])
    expect([...five].filter((l) => two.has(l))).toEqual([])
    // And neither of the other markers is readable in §5's log, which is how `verify` counts runs.
    expect(labelLog.split("\n").filter((l) => l === LABEL_RUN_MARKER).length).toBe(1)
    expect(labelLog.split("\n").filter((l) => l === RUN_MARKER || l === ELK_RUN_MARKER).length).toBe(0)
  })
})

/**
 * **§6's PASTED OUTPUT, AGAINST §6's OWN LOG - THE FOURTH CALL TO THE SAME CHECKER.**
 *
 * The arrangement is §2's and §5's exactly: the document fences §6's blocks ` ```field-order-run `
 * so they stay out of §1's, §2's and §5's output namespaces, this file maps the fence word - and
 * only the fence word, at a line start - and hands §6's slice to the same checker with §6's own log
 * and §6's own run marker.
 *
 * **THE ONE PLACE §6 DIFFERS FROM §5, stated rather than left to be noticed: there is no commit
 * coupling.** §1's log is pinned to a commit because §1's probe cannot be re-driven without
 * `kicad-cli`, KiCad's Python bindings and a font blob fetched from outside the repository. §6's
 * probe needs **nothing external at all** - `bun run tools/schgen/field-order/probe.ts` from a
 * clean checkout re-drives every figure §6.5 pastes - so a reader who doubts a number re-takes it
 * instead of trusting a pin. That is why the case list below carries no commit case and §5's does.
 *
 * **§6's SEVEN `kp-src` BLOCKS ARE NOT CHECKED BY ANYTHING AND CANNOT BE.** They are transcriptions
 * of a 1981 journal scan, so there is no log they could be a contiguous slice of. They are declared
 * NOT CHECKED by name, the way §4's eight are, and the last case here pins their count so that one
 * appearing or vanishing is a deliberate edit in this file.
 */
const FIELD_ORDER_LOG = path.join(repoRoot, "tools/schgen/field-order/probe-run.log")
const fieldOrderLog = fs.readFileSync(FIELD_ORDER_LOG, "utf8")

/** §6's probe's own first section header: the line that marks one run of THAT probe. */
const FIELD_ORDER_RUN_MARKER = "== WHAT THIS FIELD-ORDER RUN MEASURED"

/** The document's heading for §6, which is where its slice begins and runs to the end of the file. */
const SECTION_6_HEADING = "§6 Typesetting's penalty model, and the one condition its author puts on it"

/** How many blocks §6 pastes from its own log. Pinned, so adding or dropping one is deliberate. */
const SECTION_6_BLOCKS = 7

/** How many source transcriptions §6 pastes that no log can check. Pinned for the same reason. */
const SECTION_6_SOURCE_BLOCKS = 7

/**
 * **EVERY FENCE WORD §6 USES, WITH ITS COUNT - WHICH IS WHAT REPLACED A TAUTOLOGY.**
 *
 * The case below used to assert, for each block already filtered to `kp-src`, that its fence word
 * was not one of the four checked namespaces. That is `"kp-src" is not in [...]`, seven times, and
 * **it could not fail** - in the file whose whole subject is assertions that cannot fail
 * (§1.11's version 2: a rule strictly stronger in general and vacuous on the population it is
 * applied to). A tally over ALL of §6's blocks can fail three ways that matter: a block appears, a
 * block vanishes, or a block is relabelled into a namespace where it would resolve against a log
 * section and look verified.
 */
const SECTION_6_FENCES: Readonly<Record<string, number>> = { "field-order-run": SECTION_6_BLOCKS, "kp-src": SECTION_6_SOURCE_BLOCKS, sh: 1 }

/** §6's text with its fence word mapped into the checker's output namespace, and nothing else. */
function sectionSixAsOutput(d: string): string {
  const at = d.indexOf(SECTION_6_HEADING)
  if (at < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_6_HEADING)}, so §6's slice cannot be found`)
  return d.slice(at).replace(/^```field-order-run /gm, `\`\`\`${OUTPUT_FENCE} `)
}

describe("section 6's pasted output, against section 6's own log", () => {
  test("the mapping changes fence words and nothing else", () => {
    const slice = doc.slice(doc.indexOf(SECTION_6_HEADING))
    const mapped = sectionSixAsOutput(doc)
    expect((slice.match(/^```field-order-run /gm) ?? []).length).toBe(SECTION_6_BLOCKS)
    expect((mapped.match(/^```field-order-run /gm) ?? []).length).toBe(0)
    expect(slice.length - mapped.length).toBe("field-order-".length * SECTION_6_BLOCKS)
    const before = parseBlocks(slice).map((b) => b.lines.join("\n"))
    const after = parseBlocks(mapped).map((b) => b.lines.join("\n"))
    expect(after).toEqual(before)
  })

  test("every block section 6 pastes is a contiguous slice of section 6's committed log", () => {
    const v = verify(sectionSixAsOutput(doc), fieldOrderLog, FIELD_ORDER_RUN_MARKER)
    expect(v.failures).toEqual([])
    expect(v.verified).toBe(SECTION_6_BLOCKS)
    expect(v.verified + v.notOutput.length + v.failures.length).toBe(v.blocks)
  })

  /**
   * RED: one digit of the figure §6.5's whole finding rests on.
   *
   * **The victim line is taken from the log rather than written here**, the way §2's and §5's are,
   * because a hard-coded literal goes red when the probe gains a column - which is this file's own
   * literal drifting, not the document's. The line it picks is the one carrying `production 15,
   * arm-wise best 13`, which is the gap the whole section is about.
   */
  test("RED: a single digit edited in the field-order summary totals", () => {
    const victim = fieldOrderLog.split("\n").find((l) => l.includes("fallbacks summed over measured blocks:"))
    if (victim === undefined) throw new Error("section 6's log has no summed-fallbacks line, so the probe's summary has moved and §6.5 needs re-reading")
    expect(doc.split(victim).length - 1).toBe(1)
    const perturbed = victim.replace("production 53", "production 54")
    expect(perturbed).not.toBe(victim)
    const v = verify(sectionSixAsOutput(doc.replace(victim, perturbed)), fieldOrderLog, FIELD_ORDER_RUN_MARKER)
    // **ASSERTED ON THE MESSAGE AND NOT ON A COUNT.** `verify` has several refusal paths and each
    // produces exactly one failure, so a count alone would establish only that something broke.
    expect(v.failures.join("\n")).toContain("not a contiguous slice")
  })

  /**
   * RED: a whole genuine slice of a DIFFERENT section of the same log, substituted. This is the
   * attack a per-line membership test cannot see at all, and the section anchor is what refuses it.
   */
  test("RED: a genuine slice of another section of section 6's log", () => {
    const mapped = sectionSixAsOutput(doc)
    const victim = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} CONTROLS`)
    const donor = parseBlocks(mapped).find((b) => b.info === `${OUTPUT_FENCE} VERDICT`)
    expect(victim?.lines.length).toBeGreaterThan(1)
    expect(donor?.lines.length).toBeGreaterThan(1)
    const v = verify(mapped.replace((victim?.lines ?? []).join("\n"), (donor?.lines ?? []).join("\n")), fieldOrderLog, FIELD_ORDER_RUN_MARKER)
    expect(v.failures.join("\n")).toContain("is not a contiguous slice of section")
  })

  test("section 6's log is a probe run and not a hand-written fixture", () => {
    expect(fieldOrderLog).toContain(FIELD_ORDER_RUN_MARKER)
    /**
     * The predictions are printed BEFORE anything is measured, which is the whole of **G271**'s
     * corrected practice: the ordering is a property of the program, so the log carries it.
     *
     * **BOTH INDICES ARE ASSERTED PRESENT BEFORE THEY ARE COMPARED, and that is not pedantry - the
     * first version of this case went red on `-1 < -1` because both headers carried a trailing
     * ` ==` the log does not.** A missing header gives `-1`, and `-1 < <some index>` is TRUE for
     * every real index, so an ordering case written on bare `indexOf` passes when the earlier
     * header has vanished. That is the un-failable assertion this whole file exists to refuse.
     */
    const predictionsAt = fieldOrderLog.indexOf("== PREDICTIONS, PRINTED BEFORE ANY MEASUREMENT")
    const measurementAt = fieldOrderLog.indexOf("== PER BLOCK: FALLBACK COUNT ACROSS THE ORDERS")
    expect(predictionsAt).toBeGreaterThan(-1)
    expect(measurementAt).toBeGreaterThan(-1)
    expect(predictionsAt).toBeLessThan(measurementAt)
    expect(fieldOrderLog).toContain("  P1 HELD")
    // The corpus control and the no-silent-truncation control, both of which round 0 lacked.
    expect(fieldOrderLog).toContain("blocks with grid-legal geometry: 48")
    expect(fieldOrderLog).toContain("EXHAUSTIVE 720 of 720 order(s)")
    expect(fieldOrderLog).toContain("production 53, order-wise best 51, order-wise worst 54")
  })

  /**
   * **§6's LOG IS LINE-DISJOINT FROM THE OTHER THREE**, asserted here rather than by widening the
   * three-log case above, which stays exactly as it was. A shared line would turn the document red
   * at the OTHER log's call - a block not declared as that log's output sharing a line with it is
   * the relabel dodge `verify` refuses - so this states directly what the other calls enforce only
   * from one side.
   */
  test("section 6's log shares no line with the three logs this document already quotes", () => {
    const nonBlank = (t: string): Set<string> => new Set(t.split("\n").filter((l) => l.trim() !== ""))
    const six = nonBlank(fieldOrderLog)
    expect([...six].filter((l) => nonBlank(log).has(l))).toEqual([])
    expect([...six].filter((l) => nonBlank(elkLog).has(l))).toEqual([])
    expect([...six].filter((l) => nonBlank(labelLog).has(l))).toEqual([])
    expect(fieldOrderLog.split("\n").filter((l) => l === FIELD_ORDER_RUN_MARKER).length).toBe(1)
    expect(fieldOrderLog.split("\n").filter((l) => l === RUN_MARKER || l === ELK_RUN_MARKER || l === LABEL_RUN_MARKER).length).toBe(0)
  })

  /**
   * §6's source transcriptions are accounted for the way §4's blocks are: declared NOT CHECKED, by
   * name, with their count pinned. **They are the highest-risk material in the section** - a
   * quotation from a scan nobody can diff against anything - so what is checkable about them is
   * checked: that they exist, that there are exactly as many as §6.12 says, and that not one of
   * them has been relabelled into a checked namespace where it would resolve against a log section
   * and look verified.
   */
  test("section 6's source transcriptions are declared, counted, and in no log's namespace", () => {
    const slice = doc.slice(doc.indexOf(SECTION_6_HEADING))
    const tally: Record<string, number> = {}
    for (const b of parseBlocks(slice)) {
      const word = b.info.split(/\s+/)[0] ?? "(no info string)"
      tally[word] = (tally[word] ?? 0) + 1
    }
    // The tally over EVERY block in §6, against the pinned map. This is the case that replaced a
    // `"kp-src" is not in [...]` assertion over a list already filtered to `kp-src`.
    expect(tally).toEqual({ ...SECTION_6_FENCES })
    const sources = parseBlocks(slice).filter((b) => b.info.split(/\s+/)[0] === "kp-src")
    expect(sources.length).toBe(SECTION_6_SOURCE_BLOCKS)
    // Each carries the journal page it was transcribed from, which is the only provenance a reader
    // can act on: without it the hash in §6.1 pins a 66-page PDF and nothing narrower.
    for (const b of sources) expect(b.info).toMatch(/^kp-src p\.11\d\d /)
    // And every page a `kp-src` block names is one §6.1 says was opened as an image - the fix for
    // round 1's mis-citation, which put a p.1150 quotation on p.1162.
    const pagesRead = /\*\*Pages ([0-9,\s]+and\s+[0-9]+) were opened as images and read\*\*/.exec(doc)?.[1]
    if (pagesRead === undefined) throw new Error("§6.1 no longer states which pages were opened as images, so a block's page cannot be checked against it")
    for (const b of sources) expect(pagesRead).toContain(/p\.(\d+)/.exec(b.info)?.[1] ?? "")
    const v = verify(sectionSixAsOutput(doc), fieldOrderLog, FIELD_ORDER_RUN_MARKER)
    expect(v.notOutput.length).toBeGreaterThanOrEqual(SECTION_6_SOURCE_BLOCKS)
  })
})

/**
 * **§4's BLOCK ACCOUNTING IS A GUARDED ASSERTION RATHER THAN A SENTENCE - CONTROLLER RULING, fix
 * round 1 of Task 4.**
 *
 * §4 pastes eight blocks and **not one of them can be checked against a committed log**: they are
 * runs of third-party tools installed outside this repository, and transcriptions of a third-party
 * source tree. The research plan forbids the task that wrote them from adding a tool or a log to
 * the tree, so the coupling §1 and §2 have is not available to §4 and will not become available.
 *
 * **WHAT WAS THERE INSTEAD, AND WHY IT WAS NOT ENOUGH.** §4.12 stated the block count and the
 * `expect()` figure it predicts in prose. Prose that names a number is falsifiable by a reader who
 * checks it and by nobody else; the figure had already been wrong once, between round 0 and round
 * 1, because a block was added and the sentence was not. **The count is now pinned here**, so
 * adding or dropping a §4 block is a deliberate edit in this file - which is exactly how
 * `SECTION_2_BLOCKS` pins §2.
 *
 * **WHAT THIS CAN AND CANNOT SEE.** It can see a block appearing or vanishing, and it can see a §4
 * block relabelled into the checked namespace. **It cannot see a §4 block whose contents were
 * edited after the fact**, because there is no log to compare them with, and nothing in this
 * repository could see that. §4.12 says so in those words rather than leaving a reader to assume
 * the coupling is the same as §1's.
 */
const SECTION_4_HEADING = "§4 What comparable tools do when text will not fit"

/** How many blocks §4 pastes. Pinned, so adding or dropping one is a deliberate edit here. */
const SECTION_4_BLOCKS = 8

/**
 * The section name the relabel case below anchors a §4 block to. **It must match NO section of
 * §1's log**, because the path that case exists to exercise is `verify`'s refusal of a `run` block
 * whose declared section does not resolve. The case asserts that zero-match, and a precondition in
 * it refuses to run if the prefix ever stops colliding with nothing.
 */
const NO_SUCH_SECTION = "SECTION 4 HAS NO SECTION IN THIS LOG"

/**
 * §4's slice of the document: from §4's heading to §5's.
 *
 * **IT USED TO RUN TO THE END OF THE FILE, which was correct only while §4 was the last section.**
 * Appending §5 put twelve more blocks inside this slice, and the pinned count below would have gone
 * red with a message about §4 that was really about §5. It refuses rather than falling back to the
 * end of the file when §5's heading is missing, because a silent fallback would make the pinned
 * count mean one thing in one tree and another in the next.
 */
function sectionFour(d: string): string {
  const at = d.indexOf(SECTION_4_HEADING)
  if (at < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_4_HEADING)}, so §4's slice cannot be found`)
  const end = d.indexOf(SECTION_5_HEADING)
  if (end < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_5_HEADING)}, so §4's slice has no end and would swallow every later section`)
  if (end < at) throw new Error(`${DOCUMENT} carries §5's heading before §4's, so the section order has changed and these slices are wrong`)
  return d.slice(at, end)
}

describe("section 4's blocks are accounted for, although none of them can be checked against a log", () => {
  test("§4 pastes exactly the pinned number of blocks", () => {
    expect(parseBlocks(sectionFour(doc)).length).toBe(SECTION_4_BLOCKS)
  })

  test("every one of them declares itself as something other than probe output", () => {
    const tags = parseBlocks(sectionFour(doc)).map((b) => b.info.split(/\s+/)[0])
    expect(tags.length).toBe(SECTION_4_BLOCKS)
    // Neither §1's fence word nor §2's: a §4 block in either namespace would be anchored to a
    // section name that log does not have, so the whole-document case above would fail on SECTION
    // RESOLUTION - "matches 0 of the log's 11 headers" - which is a confusing message about a
    // missing header rather than a clear one about §4. The last case in this describe drives
    // exactly that path.
    for (const t of tags) expect([OUTPUT_FENCE, "elk-run"]).not.toContain(t)
  })

  test("the whole-document verdict reports all eight as NOT CHECKED, by line, after §4's heading", () => {
    const headingLine = doc.slice(0, doc.indexOf(SECTION_4_HEADING)).split("\n").length
    // Bounded above by §5's heading for the same reason `sectionFour` is: without it §5's blocks
    // join this count and the assertion fails with a message about §4. **It refuses rather than
    // falling back**, so the two bounds read alike: a silent fallback to end-of-file would make the
    // pinned count mean one thing in one tree and another in the next.
    const fifth = doc.indexOf(SECTION_5_HEADING)
    if (fifth < 0) throw new Error(`${DOCUMENT} has no heading ${JSON.stringify(SECTION_5_HEADING)}, so §4's block count has no upper bound and would include every later section`)
    const endLine = doc.slice(0, fifth).split("\n").length
    const v = verify(doc, log)
    const inFour = v.notOutput.filter((n) => {
      const at = Number(/^line (\d+):/.exec(n)?.[1] ?? 0)
      return at >= headingLine && at < endLine
    })
    expect(inFour.length).toBe(SECTION_4_BLOCKS)
    // Each contributes one `expect()` to the by-name case above, which is the whole of §4.12's
    // arithmetic. If this number and SECTION_4_BLOCKS ever disagree, a §4 block has left the
    // population and §4.12's figure is stale.
    expect(v.notOutput.length).toBeGreaterThanOrEqual(SECTION_4_BLOCKS)
  })

  /**
   * RED: a §4 block relabelled into §1's namespace. This is the one failure mode the pinned count
   * alone would not catch - the count is unchanged, and the block silently leaves the NOT CHECKED
   * population.
   *
   * **THE PREFIX IS CHOSEN TO MATCH NO SECTION OF §1's LOG, AND THAT IS THE WHOLE POINT OF THIS
   * ROUND'S FIX.** The path this case documents, and that the fence-word case above describes, is
   * the SECTION-RESOLUTION path: a §4 block in §1's namespace is anchored to a section name §1's
   * log does not have, so `verify` refuses it with *"matches 0 of the log's 11 headers"*. The
   * first version relabelled to `STEP 4b` - **which is a real section of that log** - so the block
   * resolved to a section and then failed one step later, on contiguity. **It went red for a
   * reason it did not document.** A reviewer drove it against `verify` directly and read the
   * actual message, which is the only way that is visible.
   *
   * `CLAUDE.md`: *"a skipped check must never look like a passing one."* A check that fires
   * through a different path than the one it names is the near neighbour of that - it passes, so
   * nothing complains, and a later reader believes a path is exercised that is not.
   *
   * **The assertion is on the MESSAGE and not only on the count**, because the count alone is what
   * let the wrong path masquerade as the right one. It is one `expect` rather than two so that
   * this round changes no `expect()` total.
   */
  test("RED: a section 4 block relabelled into the checked namespace fails on SECTION RESOLUTION", () => {
    // PRECONDITION, not an assertion, so this round changes no `expect()` total: if the prefix
    // ever BECAME a section of §1's log, this case would silently go back to testing contiguity -
    // which is the defect being fixed. A throw here says so loudly instead.
    const collisions = parseSections(log.split("\n")).filter((s) => s.title.startsWith(NO_SUCH_SECTION))
    if (collisions.length !== 0) {
      throw new Error(
        `${NO_SUCH_SECTION} now matches ${collisions.length} section(s) of §1's log, so this case would no longer ` +
          "exercise the section-resolution path it documents. Choose a prefix that matches none.",
      )
    }
    const first = parseBlocks(sectionFour(doc))[0]
    expect(first?.info).toBeDefined()
    const relabelled = doc.replace("```" + (first?.info ?? ""), `\`\`\`${OUTPUT_FENCE} ${NO_SUCH_SECTION}`)
    expect(relabelled).not.toBe(doc)
    const v = verify(relabelled, log)
    expect(v.failures).toEqual([expect.stringContaining(`names section ${JSON.stringify(NO_SUCH_SECTION)}, which matches 0 of the log's`)])
    expect(v.notOutput.length).toBe(verify(doc, log).notOutput.length - 1)
  })
})

/** The body of the one ```run block whose first line is `first`. */
function blockStartingWith(first: string): string[] {
  const hits = parseBlocks(doc).filter((b) => b.info.split(/\s+/)[0] === OUTPUT_FENCE && b.lines[0] === first)
  if (hits.length !== 1) throw new Error(`expected exactly one \`\`\`${OUTPUT_FENCE} block starting ${JSON.stringify(first)}; found ${hits.length}`)
  return [...(hits[0]?.lines ?? [])]
}
