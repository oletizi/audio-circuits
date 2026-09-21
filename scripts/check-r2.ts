#!/usr/bin/env bun
/**
 * R2 — a commit may not change both the RULER and the ARTIFACT.
 *
 * Design: docs/superpowers/specs/2026-09-21-schematic-readability-testing-design.md §9
 *
 * This is the highest-value anti-gaming control in the design, because it
 * makes the specific failure that motivated all of this structurally
 * impossible rather than merely discouraged:
 *
 *   RULER commit    — artifact byte-identical, so no improvement can be
 *                     claimed from a change to the measurement.
 *   ARTIFACT commit — ruler byte-identical, so success cannot be redefined
 *                     while changing the drawing.
 *
 * ENFORCEMENT IS PER COMMIT, never on an aggregate branch or PR diff. The
 * two cases come apart and checking the squashed diff gets them backwards:
 *
 *     commit A: circuit    }  aggregate touches both, but each commit
 *     commit B: ruler      }  is LEGAL
 *
 *     commit A: circuit+ruler }  must be REJECTED, though a later
 *     commit B: unrelated     }  aggregate view may obscure it
 *
 * Usage:  bun run check-r2 [<base-ref>]      default: @{upstream}
 *
 * Historical note: run against this branch's full history, the check
 * independently flagged exactly two commits, without being told what to
 * look for:
 *
 *   2fd548a  introduced the metrics AND changed layout.ts and all three
 *            circuit parts in one commit
 *   53b6df8  changed Sidechain.tsx AND the exemption list in one commit,
 *            after which "gratuitous 15 -> 11" was reported as progress
 *
 * Those are precisely the two commits whose reported improvements were
 * confounded between ruler and artifact. Both predate this rule and cannot
 * retroactively obey it, which is why the default range is unpushed
 * commits rather than all of history. They are recorded here because a
 * control that independently rediscovers the failure it was designed
 * against is worth more than one that merely restates it.
 */

/**
 * RULER = the readability MEASUREMENT APPARATUS. Narrow on purpose.
 *
 * Not "every test file". A module's own connectivity test is ordinary TDD
 * and belongs beside the component it tests; blocking that would forbid
 * correct practice while protecting nothing. What must never move in the
 * same commit as the drawing is the definition of success: the metrics,
 * the thresholds, the rail lists, the baselines.
 */
const RULER = [
  /^lib\/testing\/schematic-/,
  /^scripts\/check-r2\.ts$/,
  /^docs\/superpowers\/specs\/.*readability.*\.md$/,
  /^docs\/SCHEMATIC-STANDARDS\.md$/,
]

/**
 * ARTIFACT = things that change the RENDERED SCHEMATIC.
 *
 * Test files are excluded: they can alter neither the drawing nor the
 * definition of success, so they fall under "other" and constrain nothing.
 */
const ARTIFACT = [
  /^modules\/.*\.tsx$/,
  /^lib\/chips\//,
  /^lib\/opto\//,
  /^lib\/connectors\//,
  /^lib\/layout\.ts$/,
  /^index\.circuit\.tsx$/,
]

const isTest = (p: string) => /\.test\.tsx?$/.test(p)
const matches = (p: string, pats: RegExp[]) => pats.some((r) => r.test(p))

const classify = (p: string): "ruler" | "artifact" | "other" => {
  // The measurement apparatus is ruler even when it is a test file - those
  // tests ARE the definition of what the metrics mean.
  if (matches(p, RULER)) return "ruler"
  // Any other test exercises code without changing drawing or thresholds.
  if (isTest(p)) return "other"
  if (matches(p, ARTIFACT)) return "artifact"
  return "other"
}

const sh = async (args: string[]): Promise<string> => {
  const proc = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "pipe" })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`git ${args.join(" ")} failed: ${err.trim()}`)
  }
  return out
}

// Default to the commits this branch is about to push, not all of history:
// commits made before the rule existed cannot retroactively obey it.
const baseRef = Bun.argv[2] ?? "@{upstream}"

let range: string
try {
  await sh(["rev-parse", "--verify", baseRef])
  range = `${baseRef}..HEAD`
} catch {
  console.error(
    `R2: cannot resolve base ref "${baseRef}". Pass one explicitly, e.g.\n` +
      `  bun scripts/check-r2.ts main`,
  )
  process.exit(2)
}

const shas = (await sh(["rev-list", range])).trim().split("\n").filter(Boolean)

if (shas.length === 0) {
  console.log(`R2: no commits in ${range} — nothing to check.`)
  process.exit(0)
}

interface Violation {
  sha: string
  subject: string
  ruler: string[]
  artifact: string[]
}

const violations: Violation[] = []

for (const sha of shas) {
  const files = (await sh(["show", "--name-only", "--format=", sha]))
    .trim()
    .split("\n")
    .filter(Boolean)
  const ruler = files.filter((f) => classify(f) === "ruler")
  const artifact = files.filter((f) => classify(f) === "artifact")
  if (ruler.length > 0 && artifact.length > 0) {
    const subject = (
      await sh(["show", "--format=%s", "--no-patch", sha])
    ).trim()
    violations.push({ sha: sha.slice(0, 7), subject, ruler, artifact })
  }
}

console.log(`R2: checked ${shas.length} commit(s) in ${range}`)

if (violations.length === 0) {
  console.log("R2: PASS — no commit changes both the ruler and the artifact.")
  process.exit(0)
}

console.error(`\nR2: FAIL — ${violations.length} commit(s) change both:\n`)
for (const v of violations) {
  console.error(`  ${v.sha}  ${v.subject}`)
  for (const f of v.ruler) console.error(`      RULER     ${f}`)
  for (const f of v.artifact) console.error(`      ARTIFACT  ${f}`)
  console.error("")
}
console.error(
  "Split each into two commits. A ruler commit must leave the artifact\n" +
    "byte-identical so no improvement can be claimed from it; an artifact\n" +
    "commit must leave the ruler byte-identical so success cannot be\n" +
    "redefined while changing the drawing.\n",
)
process.exit(1)

export {}
