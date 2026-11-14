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

/** Read the board and the approved intent, write the resolved intent, return where it went. */
export function resolveToFile(boardPath: string, intentPath: string, outPath: string): string {
  for (const file of [boardPath, intentPath]) {
    if (!fs.existsSync(file)) throw new Error(`${file} does not exist`)
  }
  const bounds = outlineBounds(fs.readFileSync(boardPath, "utf8"), boardPath)
  const intent: unknown = JSON.parse(fs.readFileSync(intentPath, "utf8"))
  const resolved = resolveIntentZones(intent, bounds, intentPath)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(resolved, null, 2)}\n`)
  return outPath
}

if (import.meta.main) {
  const [board, intent, out] = process.argv.slice(2)
  if (board === undefined || intent === undefined || out === undefined) {
    throw new Error(
      "usage: bun tools/pcb/resolve-intent-zones.ts <board.kicad_pcb> <approved-intent.json> " +
        "<resolved-intent.json>. The resolved file is a derived artifact: it belongs in a run " +
        "directory under build/, never beside the approved one.",
    )
  }
  const written = resolveToFile(board, intent, out)
  const bounds = outlineBounds(fs.readFileSync(board, "utf8"), board)
  console.log(
    `resolved against ${(bounds.x1 - bounds.x0).toFixed(2)} x ${(bounds.y1 - bounds.y0).toFixed(2)} mm ` +
      `outline at (${bounds.x0.toFixed(2)}, ${bounds.y0.toFixed(2)}); long edge ${longEdge(bounds)}`,
  )
  console.log(`wrote ${written}`)
}
