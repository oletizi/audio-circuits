/**
 * `--check`'s report, parsed into the two facts `HC1` and `HC7` read.
 *
 * WHY THIS EXISTS AT ALL, which is a correction to a fact worth stating.
 * `tools/perfboard/check.ts` spawns `--check BOARD --netlist NET` and returns
 * `CheckRun { status, output }` - the RAW CONCATENATED stdout and stderr, and
 * deliberately so: *"the report body is on stdout, but an unreadable board
 * writes an empty report and puts the only diagnostic on stderr."* It does NOT
 * parse the report into sections, and nothing else did either. So this is new,
 * and `HC1` and `HC7` read this one parse rather than either of them re-running
 * a second checker.
 *
 * THE ONE FACT THAT DECIDES HOW IT IS WRITTEN, from `check.ts`'s own comment: a
 * board whose circuit matches *"has no `Schematic delta` section AT ALL - the
 * heading is omitted, not left empty."* So an ABSENT HEADING IS `[]` AND AN
 * UNPARSEABLE REPORT REFUSES, naming the report. The alternative - an absent
 * heading and an unreadable report both resolving to "no delta" - is a skipped
 * check that looks like a passing one, which is the failure mode the whole
 * workflow exists to prevent.
 *
 * THE GRAMMAR, transcribed from `Src/Reconcile_report.cpp`'s `FormatReport` and
 * measured against two real runs (`pultec-hi-boost`, which fails with a
 * non-empty delta, and `pt2399-core`, which passes with no delta heading):
 *
 *   [Schematic delta]        omitted entirely when the plan has no delta lines
 *   <delta line>...
 *   Layout state             ALWAYS printed
 *   <net> complete
 *   <net> incomplete
 *   <net> blocked (<member> unplaced, ...)
 *   Cuts: <n>                ALWAYS printed, last
 *
 * `Layout actions` never appears: `--check` always passes `bApplied = false`.
 *
 * `blocked` IS NOT FOLDED INTO `incompleteNets`, and the reason is that it is a
 * different word for a different cause. A blocked net has an UNPLACED member,
 * which is `HC3`'s signal read from the other side, and `FormatReport` gives
 * "blocked" priority over `NetIsComplete`'s answer precisely so the two are not
 * confused. It still reaches `HC1`, because `HC1` reads `status` as well and a
 * board with an unplaced net member does not exit 0.
 *
 * ANYTHING AFTER THE `Cuts:` LINE IS THE STDERR TAIL and is not parsed.
 * `spawnVeroroute` concatenates `${stdout}${stderr}`, in that order, so a
 * diagnostic always lands after the report body rather than inside it.
 */
import type { CheckRun } from "../perfboard/check.ts"

/** The two facts `HC1` and `HC7` read, plus the exit status neither invents. */
export interface CheckReport {
  readonly status: number
  /** Nets the report renders as `<net> incomplete`. See the module comment on `blocked`. */
  readonly incompleteNets: readonly string[]
  /** The `Schematic delta` section's lines. `[]` for an ABSENT heading, which is the match case. */
  readonly schematicDelta: readonly string[]
}

const WHY_NOT_DEFAULTED =
  "This is NOT defaulted to an empty report: an absent heading and an unreadable report both " +
  'resolving to "nothing wrong" is a skipped check that looks like a passing one, which is the ' +
  "one verdict a broken run must never produce. Fix the run that produced this output, or the " +
  "grammar reader here if Src/Reconcile_report.cpp's FormatReport has moved."

function refuse(fault: string, run: CheckRun): never {
  throw new Error(
    `unreadable --check report: ${fault}. The report, verbatim, between markers:\n` +
      `--- begin report (exit ${run.status}) ---\n${run.output}\n--- end report ---\n` +
      WHY_NOT_DEFAULTED,
  )
}

/**
 * `--check`'s output as `HC1` and `HC7` read it, refusing anything it cannot
 * account for line by line.
 *
 * EVERY LINE IS ACCOUNTED FOR, not only the ones being looked for. A net line
 * in a shape this reader does not know means `FormatReport` has moved, and
 * skipping it would silently shrink `incompleteNets` - the exact shape of a
 * check that passes by looking at nothing.
 */
export function parseCheckReport(run: CheckRun): CheckReport {
  const lines = run.output.split("\n")
  const stateIndex = lines.findIndex((line) => line.trim() === "Layout state")
  if (stateIndex === -1) {
    refuse('it has no "Layout state" heading, which FormatReport always prints', run)
  }

  const preamble = lines.slice(0, stateIndex).filter((line) => line.trim() !== "")
  let schematicDelta: readonly string[] = []
  if (preamble.length > 0) {
    if (preamble[0]?.trim() !== "Schematic delta") {
      refuse(
        `the lines before "Layout state" do not begin with a "Schematic delta" heading - the ` +
          `first is "${preamble[0] ?? ""}"`,
        run,
      )
    }
    schematicDelta = preamble.slice(1).map((line) => line.trim())
  }

  const cutsOffset = lines.slice(stateIndex + 1).findIndex((line) => line.trim().startsWith("Cuts:"))
  if (cutsOffset === -1) {
    refuse('it has no "Cuts:" line after "Layout state", which FormatReport always prints', run)
  }
  const netLines = lines
    .slice(stateIndex + 1, stateIndex + 1 + cutsOffset)
    .map((line) => line.trim())
    .filter((line) => line !== "")

  const incompleteNets: string[] = []
  for (const line of netLines) {
    if (/ blocked \(.*\)$/.test(line)) continue
    if (line.endsWith(" complete")) continue
    if (line.endsWith(" incomplete")) {
      incompleteNets.push(line.slice(0, -" incomplete".length))
      continue
    }
    refuse(
      `the Layout state line "${line}" is none of "<net> complete", "<net> incomplete" or ` +
        '"<net> blocked (...)"',
      run,
    )
  }

  return { status: run.status, incompleteNets, schematicDelta }
}
