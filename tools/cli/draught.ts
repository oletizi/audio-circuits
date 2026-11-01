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
 * **`akcli doctor` IS INCLUDED FOR CONTEXT, NOT AS A SECOND GATE - AND ONLY
 * WHEN `akcli` IS ACTUALLY ONE OF THE TOOLS THIS RUN IS CHECKING.**
 * `TOOLING.md` describes `akcli doctor` as printing its own environment
 * report over python, kicad-cli, ngspice, symbols, config and network - more
 * than the lock's single pinned version number covers. It is run best-effort
 * and its output (or the reason it could not run at all, such as "akcli is
 * Task 3's to install and is not here yet") is folded into the report. It
 * never changes the exit code: `checkToolchain` already reports a missing or
 * mismatched `akcli` as a toolchain problem in its own right, so a second,
 * separate signal from running `doctor` would just be the same fact told
 * twice - one authoritative and one advisory would invite them to disagree.
 *
 * **Fix round 1, Important 1.** The gate on `"akcli" in lock` was missing
 * entirely: `runAkcliDoctor` ran unconditionally, so a lock with no `akcli`
 * entry at all still printed `akcli doctor could not run... ENOENT`
 * unconditionally beside an unconditional `exit 0` "every tool matches" -
 * a visible error sitting next to a success a reader cannot tell whether to
 * believe, which is this project's own central rule (a skipped check must
 * never look like a passing one, and the reverse holds too: a check that is
 * not IN SCOPE must not look like one that failed) inverted. `akcli doctor`
 * now runs only when `akcli` is a key of the `Toolchain` being checked -
 * `tests/draught/doctor.test.ts` carries the regression this is checked
 * against, reproducing the reviewer's exact repro state (a lock trimmed to
 * only the tools actually installed).
 */
import { execFileSync } from "node:child_process"
import { defaultAkcli } from "../draught/akcli-install.ts"
import { checkToolchain, readLock, type Toolchain, type ToolchainProblem } from "../draught/toolchain.ts"
import { isMain } from "./entrypoint.ts"

const LOCK_RELATIVE = "draughting/tools.lock.json"

/**
 * Render every toolchain disagreement `checkToolchain` found - one line per
 * tool naming what was wanted, what was found (or that nothing was), and the
 * command that fixes it - or, when there are none, a line saying plainly
 * that the pinned lock matched rather than an empty string.
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

/**
 * Run `akcli doctor` through the same resolved binary `toolchain.ts` probes,
 * and report its own output - or, when the binary is not there at all (Task
 * 3 has not installed it yet on this machine, which is expected rather than
 * a bug in this verb), the reason it could not run. Never throws: a doctor
 * command that cannot run IS information for this report, not a crash in it.
 */
function runAkcliDoctor(): string {
  const akcli = defaultAkcli()
  try {
    const output = execFileSync(akcli, ["doctor"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    return output.trim()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return `akcli doctor could not run at ${akcli}: ${detail}`
  }
}

export interface DraughtDoctorResult {
  readonly text: string
  readonly exitCode: number
}

/**
 * The whole report: `akcli doctor`'s own output first, but ONLY when `akcli`
 * is one of the tools `lock` names - never unconditionally (fix round 1,
 * Important 1, above) - then the pinned-toolchain report `checkToolchain`
 * produced against `lock`. The exit code comes from the toolchain report
 * alone - see the module comment for why `akcli doctor`'s own success or
 * failure never contributes a second signal.
 *
 * `lock` defaults to `readLock()` (the real `draughting/tools.lock.json`),
 * the shape `make draught-doctor` calls this with; it takes an explicit
 * `Toolchain` so a test can drive this function directly - including with
 * `akcli` removed - rather than only the pure `renderToolchainReport` half.
 */
export function runDraughtDoctor(lock: Toolchain = readLock()): DraughtDoctorResult {
  const sections: string[] = []
  if ("akcli" in lock) {
    sections.push("akcli doctor:", runAkcliDoctor(), "")
  }
  const problems = checkToolchain(lock)
  sections.push(renderToolchainReport(problems))
  return { text: sections.join("\n"), exitCode: problems.length === 0 ? 0 : 1 }
}

if (isMain(import.meta.url)) {
  const { text, exitCode } = runDraughtDoctor()
  console.log(text)
  process.exit(exitCode)
}
