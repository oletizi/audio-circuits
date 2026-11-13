/**
 * WHICH NET CLASS EACH NET ACTUALLY ENDS UP IN, read from KiCad's own resolver
 * rather than from the `.kicad_pro`.
 *
 * WHY THIS EXISTS, AND THE FALSE-GREEN IT CLOSES. `./fab-standard.ts` compares
 * net class DEFINITIONS - that a `Power` class exists at 0.5 mm - and passes
 * whether or not any net is in it. DRC passes too, because the 0.3 mm `Default`
 * width clears the 0.25 mm floor. So a board whose `netclass_patterns` is empty
 * routes every rail at signal width and still clears every check in this
 * repository. The assignment is what this survey measures.
 *
 * AND IT IS MEASURED, NOT READ BACK. The `netclass_patterns` block in a
 * `.kicad_pro` is the input to KiCad's matcher, not its output: a JSON file
 * containing a pattern is not evidence that KiCad honours it. Everything here
 * comes out of `pcbnew` with the project loaded beside the board.
 *
 * THE MEMBERSHIP RULE, which is the one thing a caller must not get wrong.
 * KiCad 10 COMPOSES classes: a net matching a pattern resolves to the composite
 * name `"Power,Default"` - the matched class first, then the base class - and
 * NOT to `"Power"`. An equality test against `"Power"` therefore FAILS ON A
 * CORRECT BOARD, and that happened once already while this was being
 * investigated: the assertion reported a working pattern block as not honoured,
 * and the natural next move was to go editing a block that was already right.
 * `classesOf` below splits the composite, and `isInClass` is the predicate to
 * use; neither this file nor its caller ever compares a resolved name whole.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { defaultKicadPython } from "../../lib/kicad/install.ts"

/** Runs the KiCad Python interpreter against a script and a board. Injected for tests. */
export type NetClassRunner = (
  interpreter: string,
  script: string,
  boardPath: string,
) => { readonly status: number | null; readonly stdout: string; readonly stderr: string }

export const NETCLASS_SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), "netclass-survey.py")

export interface NetClassWidths {
  readonly trackWidthMm: number
  readonly clearanceMm: number
  readonly viaDiameterMm: number
}

export interface NetClassSurvey {
  /** Every class KiCad knows about on this board, by name, with its widths in mm. */
  readonly classes: Readonly<Record<string, NetClassWidths>>
  /**
   * Net name -> the class names it resolves into, the composite already split.
   * A net in `Power` reads `["Power", "Default"]`; a net in no pattern's class
   * reads `["Default"]`.
   */
  readonly nets: Readonly<Record<string, readonly string[]>>
}

export interface NetClassSurveyOptions {
  /** The interpreter to use. Defaults to `lib/kicad/install.ts`'s derived one. */
  readonly kicadPython?: string
  readonly runPython?: NetClassRunner
}

export function defaultRunNetClassPython(
  interpreter: string,
  script: string,
  boardPath: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(interpreter, [script, boardPath], { encoding: "utf8" })
  if (result.error !== undefined) {
    throw new Error(
      `could not run the KiCad Python interpreter at ${interpreter}: ${result.error.message}. It is not on PATH ` +
        "here; set KICAD_PYTHON or install KiCad (lib/kicad/install.ts holds the per-platform candidates). " +
        "Nothing is guessed from the .kicad_pro in its place - see this module's header for why that would not " +
        "be evidence.",
    )
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** The class names a composite resolved name denotes, in KiCad's order. */
export function classesOf(resolved: string): readonly string[] {
  return resolved
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
}

/** Whether a net resolved into `className`. The only correct way to ask; see this module's header. */
export function isInClass(survey: NetClassSurvey, netName: string, className: string): boolean {
  const resolved = survey.nets[netName]
  if (resolved === undefined) {
    throw new Error(
      `no net named "${netName}" on the surveyed board, so whether it is in "${className}" has no answer. ` +
        `The board carries: ${Object.keys(survey.nets).sort().join(", ")}. A missing net is not reported as ` +
        "false, because false would read as a measurement that was never taken.",
    )
  }
  return resolved.includes(className)
}

function widthsOf(raw: unknown, className: string, boardPath: string): NetClassWidths {
  const keys = ["trackWidthMm", "clearanceMm", "viaDiameterMm"] as const
  const values: Record<string, number> = {}
  for (const key of keys) {
    const value = (raw as Record<string, unknown> | null)?.[key]
    if (typeof value !== "number") {
      throw new Error(
        `the net-class survey of ${boardPath} reported class "${className}" with no numeric ${key} ` +
          `(got ${JSON.stringify(value)}). tools/pcb/netclass-survey.py emits all three for every class, so ` +
          "either the script and this reader have drifted apart or pcbnew's NETCLASS surface changed.",
      )
    }
    values[key] = value
  }
  return {
    trackWidthMm: values["trackWidthMm"] as number,
    clearanceMm: values["clearanceMm"] as number,
    viaDiameterMm: values["viaDiameterMm"] as number,
  }
}

export function surveyNetClasses(boardPath: string, opts: NetClassSurveyOptions = {}): NetClassSurvey {
  if (!fs.existsSync(boardPath)) {
    throw new Error(
      `no board at ${boardPath}, so no net class can be resolved for it. This survey asks pcbnew about a real ` +
        "board on disk and has nothing to fall back to.",
    )
  }
  const runPython = opts.runPython ?? defaultRunNetClassPython
  const interpreter = opts.kicadPython ?? defaultKicadPython()
  const result = runPython(interpreter, NETCLASS_SCRIPT, path.resolve(boardPath))
  if (result.status !== 0) {
    throw new Error(
      `${interpreter} ${NETCLASS_SCRIPT} exited ${result.status} on ${boardPath}, so the resolved net classes ` +
        `are unknown - which is NOT the same as the board having none.\n${result.stderr.trim()}`,
    )
  }
  // STDERR IS NOT A FAILURE SIGNAL: KiCad's bundled interpreter writes a wxApp
  // assertion on every run here, and the exit status above is the signal.
  const line = result.stdout.trim().split("\n").filter((text) => text.trim() !== "").at(-1) ?? ""
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${NETCLASS_SCRIPT} exited 0 but its last stdout line is not the JSON summary this reader expects ` +
        `(${reason}). The line was: ${JSON.stringify(line)}`,
    )
  }
  const rawClasses = (parsed as { classes?: unknown } | null)?.classes
  const rawNets = (parsed as { nets?: unknown } | null)?.nets
  if (typeof rawClasses !== "object" || rawClasses === null || typeof rawNets !== "object" || rawNets === null) {
    throw new Error(
      `${NETCLASS_SCRIPT}'s summary for ${boardPath} has no "classes" and "nets" objects: ${line}`,
    )
  }

  const classes: Record<string, NetClassWidths> = {}
  for (const [name, raw] of Object.entries(rawClasses as Record<string, unknown>)) {
    classes[name] = widthsOf(raw, name, boardPath)
  }
  const nets: Record<string, readonly string[]> = {}
  for (const [name, raw] of Object.entries(rawNets as Record<string, unknown>)) {
    if (typeof raw !== "string") {
      throw new Error(
        `${NETCLASS_SCRIPT} reported net "${name}" on ${boardPath} with a non-string resolved class name ` +
          `(${JSON.stringify(raw)}).`,
      )
    }
    nets[name] = classesOf(raw)
  }
  return { classes, nets }
}
