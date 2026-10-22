/**
 * **EVERY BLOCK THE RESEARCH DOCUMENT PASTES AS PROBE OUTPUT MUST BE A CONTIGUOUS, UNIQUE SLICE OF
 * ONE NAMED SECTION OF ONE RUN'S LOG.**
 *
 *   bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp > run.log
 *   bun run tools/schgen/text-metrics/verify-pastes.ts run.log
 *
 * Research check for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` calls it**; `tests/schgen/text-metrics/document-pastes.test.ts` does, so it
 * runs on every `bun test` and can fail there.
 *
 * **WHY IT EXISTS.** The plan requires every number to be driven in the same action with its output
 * pasted. The first round of this task tidied SEVEN pasted blocks without meaning to - a truncated
 * line, a control that lost its parenthetical, two tables re-padded, a rewrapped claim, and one
 * block left stale. None changed a figure; all were edits to evidence, and reading for them by eye
 * did not find them.
 *
 * **THREE VERSIONS OF THIS FILE HAVE BEEN DEFEATED, AND THE SEQUENCE IS THE POINT.**
 *
 * 1. **Flat membership, with a 50% gate.** A genuine line moved into the wrong block PASSED, and a
 *    block with fewer than half its lines in the log was SILENTLY EXCLUDED - so fabricating four of
 *    six lines produced a green run. **A block edited enough stopped being checked.**
 * 2. **Contiguity, with every block declaring itself.** That closed both, and
 *    **CONTIGUITY IS VACUOUS AT LENGTH 1**: a one-line block collapses "contiguous slice" back to
 *    "appears anywhere in the log", which is exactly hole 1. A reviewer swapped the document's one
 *    single-line block for an unrelated genuine log line, twice, and the checker exited 0.
 *    **A rule strictly stronger for n >= 2 was strictly EQUAL at n = 1**, and nobody checks the
 *    boundary of a rule they have just strengthened.
 * 3. **This version.** Three independent requirements, because each closes something the others do
 *    not:
 *
 * - **A `run` block names the log SECTION it came from** - ` ```run STEP 4b ` - and its slice must
 *   lie inside that section. The prefix must match exactly one `== ` header, so a renamed step
 *   fails loudly rather than silently matching nothing. This is what stops a block, of ANY length,
 *   being satisfied by output from somewhere else in the run.
 * - **At least two non-blank lines**, which is what stops the degenerate collapse above.
 * - **Exactly one match inside that section**, which is what stops a repeated line making the
 *   anchor ambiguous - and `run` blocks may not overlap each other, which catches the same slice
 *   being pasted twice (that happened once, by hand, and was caught by eye rather than by this).
 *
 * **ONE RUN PER LOG, REFUSED LOUDLY AND BY NAME** (controller ruling R15). A log holding two runs
 * gives every section header a twin, so *"which section is this block from"* stops being a question
 * with an answer - and the document pins ONE commit, which a two-run log cannot carry. **The
 * section rule alone already refuses such a log**, with one "matches 2 of the log's headers"
 * failure per block; what the explicit check adds is a reader who can tell WHY, instead of fourteen
 * confusing failures and no cause. Handling multiples was costed and declined: it would need the
 * document to declare which run as well as which section, which is more machinery than anything
 * here needs. **The log is constrained instead, and the refusal says what to do about it.**
 *
 * **WHAT NO VERSION OF THIS CAN CHECK, stated rather than left to be discovered.** A block could be
 * replaced by a DIFFERENT genuine, contiguous, unique slice of the SAME declared section, and this
 * would pass. Closing that needs the checker to know which output belongs under which prose, and it
 * cannot read prose. The section anchor narrows the target from the whole log to one step; it does
 * not eliminate it.
 */

import fs from "node:fs"

export const DOCUMENT = "docs/schematic/text-handling-research.md"

/** The info string that declares a fenced block to be a paste of probe output. */
export const OUTPUT_FENCE = "run"

/** Fewest non-blank lines a `run` block may carry. At one, contiguity says nothing. */
export const MIN_OUTPUT_LINES = 2

/** The probe's first section header. A log carrying two of these carries two runs. */
export const RUN_MARKER = "== WHAT THIS RUN MEASURED"

export interface Block {
  readonly info: string
  readonly lines: readonly string[]
  /** 1-based line number of the opening fence, for a message a reader can act on. */
  readonly at: number
}

export interface Section {
  readonly title: string
  /** Index of the first line AFTER the header, and of the line after the section's last. */
  readonly from: number
  readonly to: number
}

export interface Verdict {
  readonly blocks: number
  readonly verified: number
  /** Blocks that declare themselves as something other than probe output, by their first line. */
  readonly notOutput: readonly string[]
  /** Every reason the document fails. Empty means it passes. */
  readonly failures: readonly string[]
}

export function parseBlocks(doc: string): readonly Block[] {
  const out: Block[] = []
  const lines = doc.split("\n")
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^```(.*)$/.exec(lines[i] ?? "")
    if (open === null) continue
    const body: string[] = []
    let j = i + 1
    while (j < lines.length && !/^```\s*$/.test(lines[j] ?? "")) {
      body.push((lines[j] ?? "").replace(/\s+$/, ""))
      j += 1
    }
    if (j >= lines.length) throw new Error(`the fenced block opened at line ${i + 1} is never closed`)
    out.push({ info: (open[1] ?? "").trim(), lines: body, at: i + 1 })
    i = j
  }
  return out
}

/** The log's `== ` sections, in order. */
export function parseSections(log: readonly string[]): readonly Section[] {
  const heads: { title: string; index: number }[] = []
  log.forEach((l, i) => {
    if (l.startsWith("== ")) heads.push({ title: l.slice(3), index: i })
  })
  return heads.map((h, i) => ({ title: h.title, from: h.index + 1, to: heads[i + 1]?.index ?? log.length }))
}

/** Every index in `log` where `block` begins as a contiguous slice, restricted to `[from, to)`. */
function matchesWithin(log: readonly string[], block: readonly string[], from: number, to: number): number[] {
  const out: number[] = []
  if (block.length === 0) return out
  for (let i = from; i + block.length <= to; i += 1) {
    let ok = true
    for (let k = 0; k < block.length; k += 1) {
      if (log[i + k] !== block[k]) {
        ok = false
        break
      }
    }
    if (ok) out.push(i)
  }
  return out
}

function firstStranger(log: ReadonlySet<string>, block: readonly string[]): string | null {
  for (const l of block) if (l !== "" && !log.has(l)) return l
  return null
}

export function verify(doc: string, logText: string): Verdict {
  const log = logText.split("\n").map((l) => l.replace(/\s+$/, ""))
  const logSet = new Set(log.filter((l) => l !== ""))
  const sections = parseSections(log)
  const blocks = parseBlocks(doc)
  if (blocks.length === 0) throw new Error(`${DOCUMENT} has no fenced blocks; either the document moved or this parser is wrong`)
  const failures: string[] = []
  const notOutput: string[] = []
  const runs = log.filter((l) => l === RUN_MARKER).length
  if (runs !== 1) {
    failures.push(
      `the log holds ${runs} run(s) - it must hold exactly one, recognised by the line ${JSON.stringify(RUN_MARKER)}. ` +
        'Every section header would otherwise have a twin, so "which section is this block from" stops having an answer, ' +
        "and the document pins ONE commit, which a multi-run log cannot carry. Split the log or re-drive the probe.",
    )
  }
  /** Log spans already claimed by a `run` block, so the same slice cannot be pasted twice. */
  const claimed: { readonly at: number; readonly end: number; readonly by: number }[] = []
  let verified = 0

  for (const b of blocks) {
    const first = b.lines.find((l) => l !== "") ?? "(empty block)"
    const tag = b.info.split(/\s+/)[0] ?? ""
    if (tag !== OUTPUT_FENCE) {
      const shared = b.lines.filter((l) => l !== "" && logSet.has(l))
      if (shared.length > 0) {
        failures.push(
          `the block at line ${b.at} is fenced \`\`\`${b.info || "(no info string)"} rather than \`\`\`${OUTPUT_FENCE} <section>, ` +
            `yet ${shared.length} of its lines appear in the run's log - e.g. ${JSON.stringify(shared[0])}. ` +
            "A block that carries a run's output is declared as output or it is not pasted: this is the only way a " +
            "block can be relabelled out of being checked, so it fails rather than being skipped.",
        )
        continue
      }
      notOutput.push(`line ${b.at}: ${first}`)
      continue
    }

    const prefix = b.info.slice(OUTPUT_FENCE.length).trim()
    if (prefix === "") {
      failures.push(`the \`\`\`${OUTPUT_FENCE} block at line ${b.at} names no section. Write \`\`\`${OUTPUT_FENCE} <prefix of a "== " header>.`)
      continue
    }
    const hits = sections.filter((s) => s.title.startsWith(prefix))
    if (hits.length !== 1) {
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} names section ${JSON.stringify(prefix)}, which matches ${hits.length} ` +
          `of the log's ${sections.length} headers. It must match exactly one: a renamed or duplicated step fails here rather ` +
          "than quietly anchoring the block to nothing.",
      )
      continue
    }
    const section = hits[0]!
    const nonBlank = b.lines.filter((l) => l !== "").length
    if (nonBlank < MIN_OUTPUT_LINES) {
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} carries ${nonBlank} non-blank line(s); at fewer than ` +
          `${MIN_OUTPUT_LINES}, "a contiguous slice of the log" says no more than "this line is in the log somewhere", ` +
          "which is the hole contiguity was written to close. Paste the neighbouring line as well.",
      )
      continue
    }
    const found = matchesWithin(log, b.lines, section.from, section.to)
    if (found.length === 0) {
      const stranger = firstStranger(logSet, b.lines)
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} is not a contiguous slice of section ${JSON.stringify(section.title)}. ` +
          (stranger === null
            ? "Every one of its lines is in the log somewhere, so it has been REORDERED, had lines REMOVED, or drawn lines from another section - all of which are edits to evidence."
            : `First line that is nowhere in the log: ${JSON.stringify(stranger)}`),
      )
      continue
    }
    if (found.length > 1) {
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} matches section ${JSON.stringify(section.title)} at ${found.length} ` +
          "different offsets, so which output it quotes is ambiguous. Paste more of the surrounding lines.",
      )
      continue
    }
    const at = found[0]!
    const end = at + b.lines.length
    const clash = claimed.find((c) => at < c.end && c.at < end)
    if (clash !== undefined) {
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} quotes log lines ${at + 1}-${end} and the block at line ${clash.by} ` +
          `already quotes ${clash.at + 1}-${clash.end}. Two blocks pasting the same output is how the same line came to appear ` +
          "twice in this document once already.",
      )
      continue
    }
    claimed.push({ at, end, by: b.at })
    verified += 1
  }
  return { blocks: blocks.length, verified, notOutput, failures }
}

export function report(v: Verdict): string {
  const lines = [
    `${v.blocks} fenced block(s): ${v.verified} VERIFIED against a named section of the log, ${v.notOutput.length} declared NOT probe output, ${v.failures.length} FAILED`,
    "",
    "NOT CHECKED - these blocks declare themselves as something other than a paste of probe output,",
    "and are listed so that a reader can see what was not verified rather than assuming it was:",
    ...v.notOutput.map((n) => `  ${n}`),
  ]
  if (v.failures.length > 0) {
    lines.push("", "FAILED - the document edited what it pasted:")
    for (const f of v.failures) lines.push(`  ${f}`)
  }
  return lines.join("\n")
}

if (import.meta.main) {
  const log = process.argv[2]
  const doc = process.argv[3] ?? DOCUMENT
  if (log === undefined) throw new Error("usage: bun run tools/schgen/text-metrics/verify-pastes.ts <probe run log> [document]")
  const v = verify(fs.readFileSync(doc, "utf8"), fs.readFileSync(log, "utf8"))
  console.log(report(v))
  if (v.failures.length > 0) process.exit(1)
}
