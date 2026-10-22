/**
 * **EVERY LINE THE RESEARCH DOCUMENT PASTES AS PROBE OUTPUT MUST BE A CONTIGUOUS RUN OF A REAL
 * RUN'S LOG, IN ORDER.**
 *
 *   bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp > run.log
 *   bun run tools/schgen/text-metrics/verify-pastes.ts run.log
 *
 * Research check for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` calls it**; `tests/schgen/text-metrics/document-pastes.test.ts` does, so it
 * runs on every `bun test` and can fail there.
 *
 * **WHY IT EXISTS.** The plan requires every number to be driven in the same action with its output
 * pasted. The first round of this task tidied SEVEN pasted blocks without meaning to: a line
 * truncated at a sentence boundary, a control that lost its parenthetical, two tables re-padded so
 * their columns lined up, a claim rewrapped across two lines, and one block left stale after the
 * probe grew a column. None changed a figure; all were edits to evidence, and reading for them by
 * eye did not find them.
 *
 * **WHY IT IS A REWRITE OF A PYTHON PREDECESSOR THAT WAS DEFEATED TWICE.** The first version asked
 * whether each line appeared ANYWHERE in the log and skipped any block where fewer than half did.
 * A reviewer broke both halves:
 *
 * - **(a)** a genuine line from elsewhere in the same log, moved into the wrong block, PASSED,
 *   because membership was flat over the whole log rather than positional;
 * - **(b)** fabricating four of six lines and leaving two genuine ones dropped the block below the
 *   50% gate, so it was **silently excluded** and the run reported success. **That is this
 *   repository's cardinal sin inside the tool built to prevent it**: a block edited *enough*
 *   stopped being checked, and the checker said green.
 *
 * **BOTH HOLES ARE CLOSED BY REMOVING THE INFERENCE.** A fenced block says what it is:
 *
 * - ` ```run ` - a paste of probe output. **Its lines must equal a contiguous slice of the log**,
 *   in order, including blank lines. A line moved in from elsewhere breaks the slice; a fabricated
 *   line breaks the slice; a re-padded line breaks the slice.
 * - any other fence - not probe output (a command to re-drive, a transcription of KiCad's source).
 *   **It must share NO line with the log**, which is what stops a block being relabelled to dodge
 *   the check, and it is REPORTED by its first line so that "not checked" can never be mistaken for
 *   "checked and clean".
 *
 * There is no gate and nothing to fall below. Every block is in exactly one of three states and all
 * three are printed: VERIFIED, NOT-OUTPUT (reported by name), or a failure.
 */

import fs from "node:fs"

export const DOCUMENT = "docs/schematic/text-handling-research.md"

/** The info string that declares a fenced block to be a paste of probe output. */
export const OUTPUT_FENCE = "run"

export interface Block {
  readonly info: string
  readonly lines: readonly string[]
  /** 1-based line number of the opening fence, for a message a reader can act on. */
  readonly at: number
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

/** The index in `log` where `block` begins as a contiguous slice, or -1. */
function contiguousAt(log: readonly string[], block: readonly string[]): number {
  if (block.length === 0) return -1
  for (let i = 0; i + block.length <= log.length; i += 1) {
    let ok = true
    for (let k = 0; k < block.length; k += 1) {
      if (log[i + k] !== block[k]) {
        ok = false
        break
      }
    }
    if (ok) return i
  }
  return -1
}

/** The first line of `block` that is not in the log at all, for a message naming what to look at. */
function firstStranger(log: ReadonlySet<string>, block: readonly string[]): string | null {
  for (const l of block) if (l !== "" && !log.has(l)) return l
  return null
}

export function verify(doc: string, logText: string): Verdict {
  const log = logText.split("\n").map((l) => l.replace(/\s+$/, ""))
  const logSet = new Set(log.filter((l) => l !== ""))
  const blocks = parseBlocks(doc)
  if (blocks.length === 0) throw new Error(`${DOCUMENT} has no fenced blocks; either the document moved or this parser is wrong`)
  const failures: string[] = []
  const notOutput: string[] = []
  let verified = 0
  for (const b of blocks) {
    const first = b.lines.find((l) => l !== "") ?? "(empty block)"
    if (b.info === OUTPUT_FENCE) {
      if (contiguousAt(log, b.lines) >= 0) {
        verified += 1
        continue
      }
      const stranger = firstStranger(logSet, b.lines)
      failures.push(
        `the \`\`\`${OUTPUT_FENCE} block at line ${b.at} is not a contiguous slice of the log. ` +
          (stranger === null
            ? "Every one of its lines is in the log somewhere, so it has been REORDERED, had lines REMOVED, or drawn lines from two different places - all of which are edits to evidence."
            : `First line that is nowhere in the log: ${JSON.stringify(stranger)}`),
      )
      continue
    }
    const shared = b.lines.filter((l) => l !== "" && logSet.has(l))
    if (shared.length > 0) {
      failures.push(
        `the block at line ${b.at} is fenced \`\`\`${b.info || "(no info string)"} rather than \`\`\`${OUTPUT_FENCE}, ` +
          `yet ${shared.length} of its lines appear in the run's log - e.g. ${JSON.stringify(shared[0])}. ` +
          `A block that carries a run's output is declared as output or it is not pasted: this is the only way a ` +
          "block can be relabelled out of being checked, so it fails rather than being skipped.",
      )
      continue
    }
    notOutput.push(`line ${b.at}: ${first}`)
  }
  return { blocks: blocks.length, verified, notOutput, failures }
}

export function report(v: Verdict): string {
  const lines = [
    `${v.blocks} fenced block(s): ${v.verified} VERIFIED against the log, ${v.notOutput.length} declared NOT probe output, ${v.failures.length} FAILED`,
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
