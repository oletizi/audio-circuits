/**
 * What a `.kicad_pcb` ACTUALLY contains, read off the file with
 * `lib/kicad/sexpr.ts` - the independent read that makes R7 and R8 of
 * `./update-from-schematic.ts` checks rather than claims.
 *
 * WHY NOT ASK THE WRITER. The `pcbnew` half of that tool prints its own counts,
 * and they are useful for diagnostics, but a tool that trusts the thing it is
 * meant to be checking has not checked it: the counts would agree with the
 * board in memory whether or not `SaveBoard` wrote what it was given. These
 * numbers come from the bytes on disk.
 *
 * A KICAD 10 FORMAT FACT, so a correct board is not misread as a broken one:
 * KiCad 10 writes a pad's net as `(net "Net-(U1-LPF2-IN)")` - NAME ONLY, no
 * code - and emits NO top-level net table whatsoever. A grep for the KiCad 7-9
 * form `(net <code> "<name>")` matches nothing on a correctly netted KiCad 10
 * board, so a netted pad is counted here by the presence of a `(net ...)` child
 * with a non-empty name, and never from a net table.
 */
import fs from "node:fs"
import { child, children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"

export interface BoardSurvey {
  readonly footprints: number
  /** Pads carrying a non-empty net name. */
  readonly nettedPads: number
  /**
   * Every key in the board's `(setup ...)` block as a `/`-joined path, nested
   * blocks included (`pcbplotparams/layerselection`), sorted - KEYS, not sizes:
   * KiCad writes out values it previously left implicit, so the block
   * legitimately GROWS across a load-and-save, and only a key that DISAPPEARED
   * is a loss.
   *
   * REPEATS ARE KEPT, not deduped. A key written twice before and once after has
   * lost one, and a deduplicated set would read that as no loss at all - which
   * is not what "any key present before is absent after" says. The comparison
   * is `lostSetupKeys` in `./update-from-schematic.ts`, and it is a multiset
   * comparison for this reason.
   */
  readonly setupKeys: readonly string[]
}

function collectKeys(node: SNode, prefix: string, into: string[]): void {
  for (const sub of node.nodes) {
    if (sub.name === "") continue
    const key = prefix === "" ? sub.name : `${prefix}/${sub.name}`
    into.push(key)
    collectKeys(sub, key, into)
  }
}

export function setupKeysOf(board: SNode): readonly string[] {
  const setup = child(board, "setup")
  if (setup === undefined) return []
  const keys: string[] = []
  collectKeys(setup, "", keys)
  return keys.sort()
}

export function surveyBoardText(text: string): BoardSurvey {
  const board = parseSexpr(text)
  const footprints = children(board, "footprint")
  let nettedPads = 0
  for (const footprint of footprints) {
    for (const pad of children(footprint, "pad")) {
      const net = child(pad, "net")
      if (net !== undefined && (net.atoms[0] ?? "") !== "") nettedPads += 1
    }
  }
  return { footprints: footprints.length, nettedPads, setupKeys: setupKeysOf(board) }
}

export function surveyBoard(boardPath: string): BoardSurvey {
  return surveyBoardText(fs.readFileSync(boardPath, "utf8"))
}
