/**
 * WRITE THE RESOLVED INTENT, AND BIND IT TO THE BOARD IT WAS RESOLVED AGAINST.
 *
 * `./resolve-intent-zones.ts` turns the approved intent's FRACTIONS into rects
 * and a compass edge against a `Bounds`. This file is the other half: it adds
 * the mounting hardware's keepouts, writes the artifact, stamps it with the
 * board it came from, and refuses to let a stale one be used.
 *
 * **THE SPLIT IS THE RESPONSIBILITY, not the line count.** Resolving a fraction
 * is a pure function of an intent and a rectangle; writing a derived artifact
 * and keeping it honest about its provenance is a different job with different
 * failure modes, and the second one is where the staleness lives.
 */
import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import { derivedHardware, mountingHoleRule } from "./mounting-hardware.ts"
import {
  declaredEnvelopeSize, longEdge, outlineBounds, requireDeclaredSize, resolveIntentZones,
  type Bounds,
} from "./resolve-intent-zones.ts"

interface Record_ {
  [key: string]: unknown
}

function asRecord(value: unknown, where: string): Record_ {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected a JSON object`)
  }
  return value as Record_
}

function asArray(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${where}: expected a JSON array`)
  return value
}

/**
 * The resolved intent with the mounting hardware's keepouts and `must_lock`
 * references added, derived from the outline and the approved rule.
 *
 * WHY THIS IS A SECOND DERIVATION IN THE SAME FILE AND NOT A SECOND TOOL. The
 * approved `floorplan-intent.json` says of its own empty `keepouts` array that
 * the four coordinates are derived *"exactly as the mounting-hole keepouts
 * are"* - the same construct as the zone fractions, for the same reason: a
 * coordinate approved before the outline existed would be stale the moment the
 * outline moved. One resolver means one place where the approved file turns
 * into the file the engine reads, so the two halves cannot disagree about which
 * outline they resolved against.
 */
function withHardware(resolved: Record_, boardText: string, boardWhere: string, rulesPath: string, bounds: Bounds): Record_ {
  const rule = mountingHoleRule(JSON.parse(fs.readFileSync(rulesPath, "utf8")), rulesPath)
  const hardware = derivedHardware(boardText, boardWhere, bounds, rule)
  const existing = asArray(resolved["keepouts"], `${boardWhere}: keepouts`)
  if (existing.length > 0) {
    throw new Error(
      `the intent already carries ${existing.length} keepout(s). The approved file declares none, ` +
        "so a keepout in it is either this tool's own output being resolved a second time or a " +
        "hand-written coordinate. Resolve from the approved file, never from a resolved one.",
    )
  }
  const mustLock = asArray(resolved["must_lock"], `${boardWhere}: must_lock`).map(String)
  // De-duplicated, because a must_lock entry repeated is a rule stated twice
  // and a reader cannot tell which one is the derived half.
  const locks = [...new Set([...mustLock, ...hardware.mustLock])]
  return { ...resolved, keepouts: hardware.keepouts, must_lock: locks }
}

/**
 * The block a resolved intent carries naming the board it was resolved against.
 *
 * **WHY A RESOLVED INTENT HAS TO SAY WHAT IT WAS RESOLVED AGAINST.** The
 * resolved file is a SEPARATE artifact handed to the engine as a separate
 * argument - `check_floorplan.py <board> --intent <resolved>` - and the engine
 * does not re-derive the outline from the board to check it. Its only reference
 * to a board used to be the `board` path copied out of the approved file, so a
 * resolved file left on disk from before an outline change could grade a
 * RESIZED board against the old zone rect and the old keepout circles and
 * report a pass. That is exactly the staleness the fraction construct exists to
 * prevent, reintroduced one level down where nothing was looking for it.
 *
 * So the resolution records the outline, the declared size and a digest of the
 * board's bytes, and `verifyResolvedIntent` refuses a mismatch. The digest is
 * over the WHOLE board rather than the outline alone: a placement is graded
 * against this file too, and a board whose parts moved is a different grading
 * subject even when its edge did not.
 */
export interface ResolvedAgainst {
  readonly board: string
  readonly outline: readonly [number, number, number, number]
  readonly size_mm: readonly [number, number] | null
  readonly board_sha256: string
  readonly note: string
}

/**
 * The stamp lives at `context.resolved_against`, NOT at the top level, and the
 * engine is why: `check_floorplan.py` validates its intent schema strictly and
 * refuses an unknown top-level key -
 * `unknown top-level key(s): resolved_against. Known keys: blocks, board,
 * context, ...` - which is the right behaviour and is how this was found.
 * `context` is the one key it carries without interpreting, which is exactly
 * what a provenance stamp needs.
 */
const RESOLVED_AGAINST = "resolved_against"

function resolvedAgainst(boardPath: string, boardText: string, bounds: Bounds, size: readonly [number, number] | undefined): ResolvedAgainst {
  return {
    board: boardPath,
    outline: [bounds.x0, bounds.y0, bounds.x1, bounds.y1],
    size_mm: size === undefined ? null : [size[0], size[1]],
    board_sha256: createHash("sha256").update(boardText).digest("hex"),
    note:
      "The board this file was resolved against. Every zone rect, compass edge and keepout circle " +
      "below is derived from that outline, and the engine does not re-derive it - so a resolved " +
      "intent used against a different board would grade the wrong rectangle and report a pass. " +
      "tools/pcb/resolve-intent-zones.ts's verifyResolvedIntent refuses that, and " +
      "`make grade-pt2399-core` runs the resolve first so it cannot be skipped. Regenerate with " +
      "`make resolve-pt2399-core`; this file is derived and belongs under build/.",
  }
}

/**
 * Refuses unless `resolvedPath` was resolved against `boardPath` as it stands.
 *
 * A resolved intent with no `resolved_against` block is REFUSED rather than
 * accepted: it was written before this guard existed, and the whole point is
 * that an unbound resolved file is the thing that can silently grade the wrong
 * board. `make resolve-pt2399-core` rewrites it in seconds.
 */
export function verifyResolvedIntent(resolvedPath: string, boardPath: string): ResolvedAgainst {
  for (const file of [resolvedPath, boardPath]) {
    if (!fs.existsSync(file)) throw new Error(`${file} does not exist`)
  }
  const resolved = asRecord(JSON.parse(fs.readFileSync(resolvedPath, "utf8")), resolvedPath)
  const context = asRecord(resolved["context"] ?? {}, `${resolvedPath}: context`)
  const block = context[RESOLVED_AGAINST]
  if (block === undefined) {
    throw new Error(
      `${resolvedPath} carries no context.${RESOLVED_AGAINST} block, so there is nothing to check ` +
        "it " +
        "against. An unbound resolved intent can grade a board it was not resolved for and " +
        `report a pass. Rewrite it: make resolve-pt2399-core`,
    )
  }
  const stamp = asRecord(block, `${resolvedPath}: ${RESOLVED_AGAINST}`)
  const digest = createHash("sha256").update(fs.readFileSync(boardPath, "utf8")).digest("hex")
  if (stamp["board_sha256"] !== digest) {
    throw new Error(
      `${resolvedPath} was resolved against a different ${boardPath}.\n` +
        `  resolved against sha256 ${String(stamp["board_sha256"]).slice(0, 16)}...\n` +
        `  the board on disk is   ${digest.slice(0, 16)}...\n` +
        "Every zone rect and keepout circle in that file is derived from the board's outline, and " +
        "the engine does not re-derive it - so grading with this file would check the wrong " +
        "rectangle and could report a pass for a placement that is wrong for this board. " +
        "Rewrite it: make resolve-pt2399-core",
    )
  }
  return stamp as unknown as ResolvedAgainst
}

/** Read the board and the approved intent, write the resolved intent, return where it went. */
export function resolveToFile(
  boardPath: string,
  intentPath: string,
  outPath: string,
  rulesPath: string,
): string {
  for (const file of [boardPath, intentPath, rulesPath]) {
    if (!fs.existsSync(file)) throw new Error(`${file} does not exist`)
  }
  const boardText = fs.readFileSync(boardPath, "utf8")
  const bounds = outlineBounds(boardText, boardPath)
  const intent: unknown = JSON.parse(fs.readFileSync(intentPath, "utf8"))
  // THE GUARD AGAINST A RESIZED BOARD, and it is here rather than inside
  // `resolveIntentZones` because this is the function that has a real board.
  // Every consumer of a resolved intent goes through this path - the CLI below,
  // and anything that resolves from files - so a board quietly resized away
  // from the owner's declared size cannot reach the seeder or the grader.
  const size = requireDeclaredSize(intent, bounds, intentPath, boardPath)
  const zoned = resolveIntentZones(intent, bounds, intentPath)
  const resolved = withHardware(zoned, boardText, boardPath, rulesPath, bounds)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const context = asRecord(resolved["context"] ?? {}, `${intentPath}: context`)
  const stamped = {
    ...resolved,
    context: { ...context, [RESOLVED_AGAINST]: resolvedAgainst(boardPath, boardText, bounds, size) },
  }
  fs.writeFileSync(outPath, `${JSON.stringify(stamped, null, 2)}\n`)
  return outPath
}

if (import.meta.main) {
  const [board, intent, out, rules] = process.argv.slice(2)
  if (board === undefined || intent === undefined || out === undefined || rules === undefined) {
    throw new Error(
      "usage: bun tools/pcb/resolved-intent.ts <board.kicad_pcb> <approved-intent.json> " +
        "<resolved-intent.json> <placement-rules.json>\n" +
        "  The resolved file is a derived artifact: it belongs in a run directory under build/, " +
        "never beside the approved one.\n" +
        "  <placement-rules.json> is REQUIRED and not optional, because the mounting-hole " +
        "keepouts are derived from its anchors.mounting_holes rule. An optional rules file would " +
        "mean a run that silently resolved to zero keepouts and graded a board with no " +
        "hardware clearance at all, which reads exactly like a clean pass.",
    )
  }
  const written = resolveToFile(board, intent, out, rules)
  const bounds = outlineBounds(fs.readFileSync(board, "utf8"), board)
  console.log(
    `resolved against ${(bounds.x1 - bounds.x0).toFixed(2)} x ${(bounds.y1 - bounds.y0).toFixed(2)} mm ` +
      `outline at (${bounds.x0.toFixed(2)}, ${bounds.y0.toFixed(2)}); long edge ${longEdge(bounds)}`,
  )
  // SAID OUT LOUD EITHER WAY. An intent with no declared size is a legitimate
  // state - the engine reads the outline from the board and most boards' sizes
  // are nobody's ruling - but a guard that does not run must never read like one
  // that passed.
  const size = declaredEnvelopeSize(JSON.parse(fs.readFileSync(intent, "utf8")), intent)
  console.log(
    size === undefined
      ? `${intent} declares no envelope.size_mm, so THE OUTLINE SIZE WAS NOT CHECKED against anything`
      : `outline size matches the declared envelope.size_mm of ${size[0]} x ${size[1]} mm`,
  )
  const stamp = verifyResolvedIntent(written, board)
  console.log(
    `bound to ${path.basename(board)} sha256 ${stamp.board_sha256.slice(0, 16)}... ` +
      `outline [${stamp.outline.join(", ")}]`,
  )
  console.log(`wrote ${written}`)
}
