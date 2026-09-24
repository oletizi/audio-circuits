/**
 * What a board's cut state means for the operator, read from the pinned
 * fork's `--dump-board` report.
 *
 * On a strip board VeroRoute gives each hole a net by PAINTING it, and a cut
 * is needed wherever two strip-adjacent holes carry different nets. It paints
 * the holes between pins only when the tracks are committed - `--update`, or
 * the GUI's Paste / Paste+Tidy, all of which run its AutoFillVero. A layout
 * saved from the GUI before that has unpainted holes, and where an unpainted
 * stretch of strip joins two different nets the fork reports
 * `CUT_STATE UNRESOLVED` with one `CUT_CONFLICT` line per stretch
 * (Src/Headless_dump.cpp). It refuses to guess where to cut, correctly: an
 * unpainted hole is still copper, so as saved that strip shorts the two nets.
 *
 * `--check` does not look at this - it can exit 0 with every net complete on
 * a board whose cuts cannot be worked out - so the check verb folds it in
 * here, and the cuts verb explains it rather than printing raw conflict lines.
 */
import type { CheckRun } from "./check.ts"

interface Hole {
  readonly position: string
  readonly nodeId: string
}

function lines(dump: string, keyword: string): string[][] {
  return dump
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields[0] === keyword)
}

/** The value of the dump's single CUT_STATE line; throws if there is none. */
export function cutStateOf(dump: string, vrtPath: string): string {
  const state = lines(dump, "CUT_STATE")[0]?.[1]
  if (state === undefined) {
    throw new Error(
      `${vrtPath}: --dump-board produced no CUT_STATE line, so whether this board's cuts ` +
        "can be worked out is unknown. This tool no longer understands what --dump-board prints.",
    )
  }
  return state
}

/** "row,col,nodeId" -> the hole it names. */
function hole(field: string | undefined, vrtPath: string): Hole {
  const parts = (field ?? "").split(",")
  const [row, col, nodeId] = parts
  if (parts.length !== 3 || row === undefined || col === undefined || nodeId === undefined) {
    throw new Error(`${vrtPath}: unreadable CUT_CONFLICT position "${field ?? ""}"`)
  }
  return { position: `(${row},${col})`, nodeId }
}

/** The operator-facing explanation of a `CUT_STATE UNRESOLVED` dump. */
export function unresolvedCutsMessage(vrtPath: string, dump: string): string {
  const netNames = new Map<string, string>()
  for (const [, id, keyword, name] of lines(dump, "NODE")) {
    if (id !== undefined && keyword === "NAME" && name !== undefined) netNames.set(id, name)
  }
  const describe = (h: Hole): string => {
    const name = netNames.get(h.nodeId)
    if (name === undefined) {
      throw new Error(`${vrtPath}: a CUT_CONFLICT names node ${h.nodeId}, which the dump never declared`)
    }
    return `${h.position} ${name}`
  }
  const conflicts = lines(dump, "CUT_CONFLICT").map((fields) => {
    const first = hole(fields[1], vrtPath)
    const second = hole(fields[2], vrtPath)
    return `    ${describe(first)}  ...  ${describe(second)}`
  })
  return [
    `CUTS NOT RESOLVED: ${vrtPath}`,
    "  VeroRoute has not painted this layout's strips, so where to cut them is not known.",
    `  In ${conflicts.length} places a strip joins two different nets across unpainted holes:`,
    ...conflicts,
    "  An unpainted hole is still copper, so as saved each of these strips shorts its two nets.",
    "  This happens when a layout is saved from the VeroRoute GUI before its tracks are",
    "  committed. Fix: run `make edit`, commit the tracks (Paste with auto-routing on, or",
    "  Paste+Tidy with it off), save, then run this again.",
  ].join("\n")
}

/**
 * A `--check` result with the board's cut state folded in: a check that passed
 * on a board whose cuts are unresolved becomes a failing one, carrying the
 * explanation. Any other combination is returned unchanged - a failing check
 * already says what is wrong, and a computed or not-applicable cut state has
 * nothing to add.
 */
export function foldCutState(check: CheckRun, dump: string, vrtPath: string): CheckRun {
  if (check.status !== 0) return check
  if (cutStateOf(dump, vrtPath) !== "UNRESOLVED") return check
  return { status: 1, output: `${check.output}${unresolvedCutsMessage(vrtPath, dump)}\n` }
}
