/**
 * RESOLVE THE APPROVED, OUTLINE-INDEPENDENT INTENT AGAINST A BOARD'S ACTUAL
 * OUTLINE, and write the resolved copy the engine consumes.
 *
 * WHY THIS EXISTS, which is the only interesting thing about it. The approved
 * `floorplan-intent.json` declares no coordinates: the board outline is Task
 * 8's decision, and a rectangle approved before that decision would be stale
 * the moment the outline moved - the regrade would then check the wrong
 * rectangle while reporting a pass. But a zone-less intent cannot drive the
 * tool it exists to drive. Measured by this plan's independent reviewer, over
 * sixteen seeding runs: `place_seed.py` places a block early only when that
 * block carries a zone rect (`zones_by_name = {z.name: z for z in
 * intent.blocks if z.rect is not None}`), and its decap stage seats a cap only
 * against a supply pin of an **already-placed** IC. With no zone anywhere, U1
 * is never placed early, the decap stage seats nothing, and the one rule in
 * the intent doing real work becomes unreachable. Zero clean seeds in sixteen
 * runs.
 *
 * So the intent declares its geometry as FRACTIONS of whatever outline the
 * board turns out to have, and this tool turns those fractions into the rects
 * the engine reads. The fractions are approved; the rects are derived. That is
 * the same arrangement the mounting-hole keepouts already use, and it is what
 * keeps the agent that produces a placement from authoring the criteria it is
 * graded against: nothing here chooses a fraction, and nothing downstream
 * chooses a rect.
 *
 * THIS TOOL NEVER WRITES A BOARD AND NEVER CHOOSES AN OUTLINE. It reads
 * Edge.Cuts and refuses a board that has none, naming whose decision that is.
 */
import fs from "node:fs"
import path from "node:path"
import { parseSexpr, child, type SNode } from "../../lib/kicad/sexpr.ts"
import { derivedHardware, mountingHoleRule } from "./mounting-hardware.ts"

/** The outline's bounding box, in board millimetres. */
export interface Bounds {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** The four compass edges the engine names, as it spells them. */
export type Edge = "north" | "south" | "east" | "west"

const EDGE_LAYER = "Edge.Cuts"
const SHAPES = /^gr_(line|rect|poly|arc|circle)$/

function pointsOf(node: SNode, where: string): readonly (readonly [number, number])[] {
  const out: (readonly [number, number])[] = []
  for (const key of ["start", "end", "mid", "center"]) {
    const found = child(node, key)
    if (found === undefined) continue
    const x = Number(found.atoms[0])
    const y = Number(found.atoms[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`${where}: (${node.name} (${key} ...)) does not carry two numbers`)
    }
    out.push([x, y])
  }
  for (const pts of node.nodes.filter((n) => n.name === "pts")) {
    for (const xy of pts.nodes.filter((n) => n.name === "xy")) {
      out.push([Number(xy.atoms[0]), Number(xy.atoms[1])])
    }
  }
  if (out.length === 0) {
    throw new Error(
      `${where}: a (${node.name} ...) on ${EDGE_LAYER} carries no point this tool can read. It is ` +
        "refused rather than skipped: an outline shape silently dropped shrinks the bounding box " +
        "and every fraction below would resolve against the wrong rectangle.",
    )
  }
  return out
}

/**
 * The bounding box of a board's `Edge.Cuts` geometry.
 *
 * A circle or an arc is expanded to its full extent rather than read as its
 * two literal points - a rounded corner read as a chord would pull the box in.
 */
export function outlineBounds(boardText: string, where: string): Bounds {
  const root = parseSexpr(boardText)
  const xs: number[] = []
  const ys: number[] = []
  for (const node of root.nodes) {
    if (!SHAPES.test(node.name)) continue
    if (child(node, "layer")?.atoms[0] !== EDGE_LAYER) continue
    if (node.name === "gr_circle") {
      const centre = child(node, "center")
      const edge = child(node, "end")
      if (centre === undefined || edge === undefined) {
        throw new Error(`${where}: a gr_circle on ${EDGE_LAYER} has no center/end pair`)
      }
      const cx = Number(centre.atoms[0])
      const cy = Number(centre.atoms[1])
      const r = Math.hypot(Number(edge.atoms[0]) - cx, Number(edge.atoms[1]) - cy)
      xs.push(cx - r, cx + r)
      ys.push(cy - r, cy + r)
      continue
    }
    for (const [x, y] of pointsOf(node, where)) {
      xs.push(x)
      ys.push(y)
    }
  }
  if (xs.length === 0) {
    throw new Error(
      `${where} has no ${EDGE_LAYER} geometry, so there is no outline to resolve the intent's ` +
        "fractions against. This is not defaulted to a rectangle: the board outline is Task 8's " +
        "decision in docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md, and " +
        "a rectangle invented here would become the design by accident.",
    )
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/**
 * Which edge of this outline is a LONG one.
 *
 * `south` and `east` are the two the engine would call the far edges in x and
 * y. The choice between the two members of a long pair is a tie, and a tie
 * broken differently on two runs is worse than a tie broken arbitrarily once,
 * so the rule names one. A square board has no long edge and takes `south` by
 * the same argument.
 */
export function longEdge(bounds: Bounds): Edge {
  return bounds.x1 - bounds.x0 >= bounds.y1 - bounds.y0 ? "south" : "east"
}

interface Record_ {
  [key: string]: unknown
}

/**
 * The board size an intent DECLARES, or `undefined` when it declares none.
 *
 * `undefined` is not a default and not a pass: `resolveIntentZones` says in its
 * console output that the size went unchecked, and
 * `tests/pcb/resolve-intent-zones.test.ts` pins that the APPROVED intent carries
 * `[150, 100]` - so this key disappearing is a red test rather than a guard
 * quietly switching itself off.
 *
 * A `rect` here is REFUSED, by the same argument the approved file makes for
 * declaring a size: a rect carries an origin, an origin is a board coordinate,
 * and where the rectangle sits on the sheet is not a criterion anybody ruled on.
 */
export function declaredEnvelopeSize(
  intent: unknown,
  where: string,
): readonly [number, number] | undefined {
  const root = asRecord(intent, where)
  const envelope = root["envelope"]
  if (envelope === undefined) return undefined
  const spec = asRecord(envelope, `${where}: envelope`)
  if (spec["rect"] !== undefined) {
    throw new Error(
      `${where}: envelope.rect is declared. This file declares a SIZE, not a rect - a rect carries ` +
        "an origin, and an origin is a board coordinate that goes stale the moment the outline is " +
        "moved on the sheet. Declare envelope.size_mm and let the origin be wherever the board puts it.",
    )
  }
  const size = spec["size_mm"]
  if (size === undefined) {
    throw new Error(
      `${where}: envelope is declared with no size_mm. An envelope block that constrains nothing ` +
        "is worse than none at all: it reads as a declared board size to anyone who greps for one.",
    )
  }
  const pair = asArray(size, `${where}: envelope.size_mm`)
  if (pair.length !== 2) {
    throw new Error(`${where}: envelope.size_mm has ${pair.length} entries, expected two: [width, height]`)
  }
  const [width, height] = pair.map((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(
        `${where}: envelope.size_mm[${index}] is ${JSON.stringify(value)}, not a positive number of mm.`,
      )
    }
    return value
  }) as [number, number]
  return [width, height]
}

/** How far a board's outline may differ from the declared size before it is a different board. */
export const SIZE_TOLERANCE_MM = 0.001

/**
 * Refuses a board whose outline is not the size its intent declares.
 *
 * THIS IS THE GUARD THE APPROVED INTENT ASKED FOR AND SAID DID NOT EXIST:
 * *"No tool compares this size to the board's Edge.Cuts today... until it exists
 * this number is authored and unchecked."* It lives in the resolver because the
 * resolver is already the thing that opens the board and reads its outline, and
 * because EVERY consumer of the resolved intent goes through here - so a board
 * quietly resized cannot reach the seeder or the grader without passing this.
 *
 * It compares the SIZE and ignores the origin, deliberately: the intent declares
 * a size precisely so that moving the rectangle on the sheet is not a change to
 * the design.
 */
export function requireDeclaredSize(
  intent: unknown,
  bounds: Bounds,
  intentWhere: string,
  boardWhere: string,
): readonly [number, number] | undefined {
  const size = declaredEnvelopeSize(intent, intentWhere)
  if (size === undefined) return undefined
  const width = bounds.x1 - bounds.x0
  const height = bounds.y1 - bounds.y0
  const off = Math.max(Math.abs(width - size[0]), Math.abs(height - size[1]))
  if (off > SIZE_TOLERANCE_MM) {
    throw new Error(
      `${boardWhere} has a ${width.toFixed(3)} x ${height.toFixed(3)} mm outline, but ${intentWhere} ` +
        `declares envelope.size_mm ${size[0]} x ${size[1]} mm (off by ${off.toFixed(3)} mm). ` +
        "THE DECLARED SIZE IS THE OWNER'S DECISION AND THIS IS NOT RESOLVED AGAINST THE BOARD " +
        "INSTEAD: every zone fraction in this intent is a fraction OF the outline, so resolving " +
        "against a different rectangle would silently move the criteria the placement is graded " +
        "against - which is exactly the staleness the fractions exist to prevent. Write the " +
        "declared size with `bun tools/pcb/board-outline.ts <board> --write-declared " +
        "<intent> <x> <y> <uuid>`; do not edit the declared size to match the board.",
    )
  }
  return size
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

function fraction(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `${where}: expected a fraction of the outline between 0 and 1, got ${JSON.stringify(value)}. ` +
        "Fractions are the whole point of this construct - a millimetre figure here would be a " +
        "coordinate approved before the outline exists.",
    )
  }
  return value
}

/**
 * The approved intent plus the rects and the compass edge its
 * `context.outline_derivation` says to compute from this outline.
 *
 * It refuses an approved file that already carries a rect, because the two
 * mechanisms would then disagree silently about which one the engine read.
 */
export function resolveIntentZones(intent: unknown, bounds: Bounds, where: string): Record_ {
  const root = asRecord(intent, where)
  // The intent's own envelope block is validated HERE, wherever the intent is
  // read: a declared `rect`, or a `size_mm` that is not two positive numbers,
  // is a statement about this file and is wrong against every board. The
  // comparison against a REAL outline is in `resolveToFile` below, because this
  // function takes a `Bounds` with no board behind it and cannot tell a board's
  // own outline from one a caller made up for a unit test.
  declaredEnvelopeSize(root, where)
  const context = asRecord(root["context"], `${where}: context`)
  const derivation = context["outline_derivation"]
  if (derivation === undefined) {
    throw new Error(
      `${where}: no context.outline_derivation. This tool exists to resolve that construct and ` +
        "has nothing else to do; an intent without one either needs no resolving, in which case " +
        "do not run this, or has lost the key, in which case the zones would silently vanish.",
    )
  }
  const spec = asRecord(derivation, `${where}: context.outline_derivation`)
  const zones = asRecord(spec["zones"], `${where}: context.outline_derivation.zones`)
  const blocks = asArray(root["blocks"], `${where}: blocks`).map((b, i) =>
    asRecord(b, `${where}: blocks[${i}]`),
  )
  const width = bounds.x1 - bounds.x0
  const height = bounds.y1 - bounds.y0

  const named = new Set<string>()
  const out = blocks.map((block) => {
    const name = block["name"]
    if (typeof name !== "string") throw new Error(`${where}: a block has no string name`)
    if (block["zone"] !== undefined) {
      throw new Error(
        `${where}: block "${name}" already carries a zone rect. The approved intent declares no ` +
          "coordinates; a rect in it means either that this tool has already run on its output, " +
          "or that someone hard-coded one. Resolve from the approved file, never from a resolved one.",
      )
    }
    const frac = zones[name]
    if (frac === undefined) return block
    named.add(name)
    const four = asArray(frac, `${where}: context.outline_derivation.zones.${name}`)
    if (four.length !== 4) {
      throw new Error(
        `${where}: context.outline_derivation.zones.${name} has ${four.length} entries, expected ` +
          "four: [x0, y0, x1, y1] as fractions of the outline.",
      )
    }
    const [fx0, fy0, fx1, fy1] = four.map((v, i) =>
      fraction(v, `${where}: context.outline_derivation.zones.${name}[${i}]`),
    ) as [number, number, number, number]
    if (fx0 >= fx1 || fy0 >= fy1) {
      throw new Error(
        `${where}: context.outline_derivation.zones.${name} is empty or inverted ` +
          `([${four.join(", ")}]). A zone with no area admits no part and would fail every seed.`,
      )
    }
    return {
      ...block,
      zone: [
        round4(bounds.x0 + fx0 * width),
        round4(bounds.y0 + fy0 * height),
        round4(bounds.x0 + fx1 * width),
        round4(bounds.y0 + fy1 * height),
      ],
    }
  })

  for (const name of Object.keys(zones)) {
    if (named.has(name)) continue
    throw new Error(
      `${where}: context.outline_derivation.zones names "${name}", which is not a declared block. ` +
        "A zone for a block that does not exist constrains nothing and would resolve silently.",
    )
  }

  const edgeRule = spec["header_edge"]
  const connectors = asArray(root["edge_connectors"], `${where}: edge_connectors`).map((c, i) =>
    asRecord(c, `${where}: edge_connectors[${i}]`),
  )
  const resolvedConnectors = connectors.map((connector) => {
    if (edgeRule === undefined) return connector
    const rule = asRecord(edgeRule, `${where}: context.outline_derivation.header_edge`)
    if (rule["ref"] !== connector["ref"]) return connector
    if (connector["edge"] !== undefined) {
      throw new Error(
        `${where}: edge connector ${String(connector["ref"])} already carries an edge. The compass ` +
          "edge is derived from the outline's aspect, so a literal one in the approved file is a " +
          "coordinate decision taken before the outline existed.",
      )
    }
    return { ...connector, edge: longEdge(bounds) }
  })
  if (edgeRule !== undefined) {
    const rule = asRecord(edgeRule, `${where}: context.outline_derivation.header_edge`)
    const ref = rule["ref"]
    if (!connectors.some((c) => c["ref"] === ref)) {
      throw new Error(
        `${where}: context.outline_derivation.header_edge names ${JSON.stringify(ref)}, which is ` +
          "not in edge_connectors. The derived edge would then be computed and dropped, and the " +
          "seeder would go on refusing to seat the part - the defect this rule exists to fix.",
      )
    }
  }

  return { ...root, blocks: out, edge_connectors: resolvedConnectors }
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
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
  requireDeclaredSize(intent, bounds, intentPath, boardPath)
  const zoned = resolveIntentZones(intent, bounds, intentPath)
  const resolved = withHardware(zoned, boardText, boardPath, rulesPath, bounds)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(resolved, null, 2)}\n`)
  return outPath
}

if (import.meta.main) {
  const [board, intent, out, rules] = process.argv.slice(2)
  if (board === undefined || intent === undefined || out === undefined || rules === undefined) {
    throw new Error(
      "usage: bun tools/pcb/resolve-intent-zones.ts <board.kicad_pcb> <approved-intent.json> " +
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
  console.log(`wrote ${written}`)
}
