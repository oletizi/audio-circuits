/**
 * `make draught-doctor` - THE VERB THAT REFUSES ON A TOOLCHAIN DISAGREEMENT.
 *
 * `tools/draught/toolchain.ts` (Task 1 of
 * `.superpowers/sdd/2026-10-30-institutionalise-draughting.md`) can read the
 * pinned lock and measure every disagreement; nothing before this module
 * decided what to DO about one. This is that decision: print every
 * disagreement by name, with the command that fixes it, and exit non-zero
 * when there is at least one - exit 0 only when the whole lock matches.
 *
 * **A SILENT SUCCESS IS THE DEFECT THIS WHOLE PLAN EXISTS TO PREVENT.**
 * `renderToolchainReport([])` does not return an empty string: it names what
 * was checked (the lock file itself) and says plainly that it matched,
 * because a blank line here would be indistinguishable from a check that
 * never ran at all.
 *
 * **`akcli doctor` IS ADVISORY TO THE EXIT CODE - RUN ONLY WHEN `akcli` IS
 * ACTUALLY ONE OF THE TOOLS THIS RUN IS CHECKING, AND LABELLED ADVISORY IN
 * THE OUTPUT ITSELF.** `TOOLING.md` describes `akcli doctor` as printing its
 * own environment report over python, kicad-cli, ngspice, symbols, config
 * and network - more than the lock's single pinned version number covers,
 * and a machine being offline must never make a verb about VERSION PINNING
 * refuse. So the exit code stays scoped to `checkToolchain` alone.
 *
 * **Fix round 1, Important 1.** The gate on `"akcli" in lock` was missing
 * entirely: `runAkcliDoctor` ran unconditionally, so a lock with no `akcli`
 * entry at all still printed `akcli doctor could not run... ENOENT`
 * unconditionally beside an unconditional `exit 0` "every tool matches".
 * Fixed by running `akcli doctor` only when `akcli` is a key of the
 * `Toolchain` being checked.
 *
 * **Fix round 2.** That gate closed only the case where `akcli` could not
 * run AT ALL. The reviewer built a stub `akcli` that version-matches the
 * lock (so `checkToolchain` reports no problem) but exits non-zero on
 * `doctor` (a real failure of the kind `akcli doctor` alone can see - its
 * own README lists python, kicad-cli, ngspice, symbols, config and network,
 * none of which `checkToolchain` touches) - reproducing the SAME
 * contradiction in a different shape: a visible failure sitting directly
 * above an unqualified "every tool matches" and `exit 0`. The earlier
 * module comment's reasoning - that a second signal "would invite them to
 * disagree" - assumed the two probes cannot disagree; they demonstrably
 * can, since they check different things. The fix is not to merge the two
 * signals (the exit code stays scoped to the lock, as above) but to remove
 * the CONTRADICTION in what is printed:
 *
 *   1. the success line stops being unqualified when `akcli doctor` itself
 *      reported a problem - it says the pinned versions matched AND that an
 *      advisory check found something, naming it;
 *   2. the advisory section is labelled ADVISORY and NON-GATING in the
 *      output itself, not only in this comment;
 *   3. the qualified line states what was and was not verified -
 *      `checkToolchain` verified pinned versions; `akcli doctor` covers more
 *      and does not gate.
 *
 * "Advisory" is advisory TO THE EXIT CODE ONLY - it is still a real problem
 * worth fixing, so the wording never reads as "ignorable".
 * `tests/draught/doctor.test.ts` carries both the pure-composition test and
 * the full reproduction (a real stub `akcli` installed at the resolved path
 * for the duration of one test, removed immediately after).
 */
import { spawnSync } from "node:child_process"
import { defaultAkcli } from "../draught/akcli-install.ts"
import { checkToolchain, readLock, type Toolchain, type ToolchainProblem } from "../draught/toolchain.ts"
import { isMain } from "./entrypoint.ts"

const LOCK_RELATIVE = "draughting/tools.lock.json"

const AKCLI_DOCTOR_HEADER =
  "akcli doctor (ADVISORY - does not gate this verb's exit code; checks python, kicad-cli, " +
  "ngspice, symbols, config and network, beyond the single pinned version checkToolchain " +
  "verifies below):"

/**
 * Render every toolchain disagreement `checkToolchain` found - one line per
 * tool naming what was wanted, what was found (or that nothing was), and the
 * command that fixes it - or, when there are none, a line saying plainly
 * that the pinned lock matched rather than an empty string.
 *
 * Deliberately unaware of `akcli doctor` - that composition lives in
 * `composeDraughtDoctorReport` below, so this stays the pure per-problem
 * renderer the original brief's two tests exercise.
 */
export function renderToolchainReport(problems: readonly ToolchainProblem[]): string {
  if (problems.length === 0) {
    return `draught-doctor: every tool pinned in ${LOCK_RELATIVE} matches - checked ${LOCK_RELATIVE} against what is actually installed.\n`
  }
  const header =
    problems.length === 1
      ? `draught-doctor: 1 toolchain disagreement against ${LOCK_RELATIVE}:`
      : `draught-doctor: ${problems.length} toolchain disagreements against ${LOCK_RELATIVE}:`
  const lines = problems.map(
    (problem) =>
      `  ${problem.tool}: wanted ${problem.wanted}, found ${problem.found ?? "nothing"} - fix: ${problem.how}`,
  )
  return [header, ...lines].join("\n") + "\n"
}

/** What running `akcli doctor` itself found: whether it ran clean, and its own report. */
export interface AkcliDoctorReport {
  readonly ok: boolean
  readonly summary: string
}

/**
 * Run `akcli doctor` through the same resolved binary `toolchain.ts` probes.
 * `spawnSync` (never `execFileSync`) deliberately: it never throws on a
 * non-zero exit, so a genuine "doctor ran and found a problem" (fix round 2)
 * stays distinguishable from "the binary could not be run at all" (fix round
 * 1) instead of both collapsing into the same catch block. Never throws
 * either way: a doctor command that cannot run, or that runs and reports a
 * problem, IS information for this report, not a crash in it.
 */
function runAkcliDoctor(): AkcliDoctorReport {
  const akcli = defaultAkcli()
  const result = spawnSync(akcli, ["doctor"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) {
    return { ok: false, summary: `akcli doctor could not run at ${akcli}: ${result.error.message}` }
  }
  const combined = `${result.stdout}${result.stderr}`.trim()
  if (result.status === 0) {
    return { ok: true, summary: combined === "" ? "(akcli doctor printed nothing)" : combined }
  }
  return {
    ok: false,
    summary:
      combined !== ""
        ? combined
        : `akcli doctor at ${akcli} exited ${result.status ?? "with no status"} with no output`,
  }
}

/**
 * Fix round 2, point 1: when `checkToolchain` found no disagreement but
 * `akcli doctor` itself reported a problem, the success line must stop
 * being the unqualified last word. Appended rather than replacing it, so
 * the true fact `checkToolchain` established ("the pinned versions match")
 * is still stated plainly - it is just no longer stated ALONE.
 */
function qualifyPassForAdvisoryFailure(base: string): string {
  return (
    `${base.trimEnd()} checkToolchain verified only the pinned version shown above; ` +
    "akcli doctor (above, ADVISORY) checks more and reported a problem of its own. That " +
    "problem does not make draught-doctor refuse - akcli doctor does not gate this verb's exit " +
    "code - but it is a real problem with your toolchain, not something to ignore.\n"
  )
}

export interface DraughtDoctorResult {
  readonly text: string
  readonly exitCode: number
}

/**
 * Pure composition: given what `checkToolchain` found and what `akcli
 * doctor` reported (or `null` when `akcli` was not even one of the tools
 * being checked), build the final text and exit code. Exported and tested
 * directly - without running any subprocess - so the qualification logic
 * (fix round 2) and the gating logic (fix round 1) each have a test that
 * does not depend on this machine's install state.
 */
export function composeDraughtDoctorReport(
  problems: readonly ToolchainProblem[],
  akcliDoctor: AkcliDoctorReport | null,
): DraughtDoctorResult {
  const sections: string[] = []
  if (akcliDoctor !== null) {
    sections.push(AKCLI_DOCTOR_HEADER, akcliDoctor.summary, "")
  }
  let toolchainReport = renderToolchainReport(problems)
  if (problems.length === 0 && akcliDoctor !== null && !akcliDoctor.ok) {
    toolchainReport = qualifyPassForAdvisoryFailure(toolchainReport)
  }
  sections.push(toolchainReport)
  return { text: sections.join("\n"), exitCode: problems.length === 0 ? 0 : 1 }
}

/**
 * The whole report, for real: run `akcli doctor` only when `akcli` is one of
 * the tools `lock` names (fix round 1), check the lock itself, and compose
 * the two through `composeDraughtDoctorReport` (fix round 2) rather than
 * assembling the text here directly - so the composition's qualification
 * logic is exercised by this real path too, not only by a direct unit test
 * of the pure function.
 *
 * `lock` defaults to `readLock()` (the real `draughting/tools.lock.json`),
 * the shape `make draught-doctor` calls this with; it takes an explicit
 * `Toolchain` so a test can drive this function directly - including with
 * `akcli` removed, or with a stub installed at its resolved path - rather
 * than only the pure halves.
 */
export function runDraughtDoctor(lock: Toolchain = readLock()): DraughtDoctorResult {
  const akcliDoctor = "akcli" in lock ? runAkcliDoctor() : null
  const problems = checkToolchain(lock)
  return composeDraughtDoctorReport(problems, akcliDoctor)
}

if (isMain(import.meta.url)) {
  const { text, exitCode } = runDraughtDoctor()
  console.log(text)
  process.exit(exitCode)
}
