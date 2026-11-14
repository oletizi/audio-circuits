/**
 * THE BOARD OUTLINE, DERIVED FROM WHAT IS ON THE BOARD - the one thing the
 * routing engine refuses to do.
 *
 * `py_tools/check_floorplan.py` says it outright: *"THE BOARD OUTLINE IS NOT
 * EDITABLE BY THIS TOOLCHAIN. `envelope` is READ from the board... Nothing here
 * writes Edge.Cuts."* `tools/pcb/resolve-intent-zones.ts` refuses a board with
 * no Edge.Cuts for the same reason. Both are right to refuse, and something
 * still has to write one, so it is here, where the derivation can be stated and
 * checked rather than chosen.
 *
 * **AN OUTLINE CAN COME FROM TWO PLACES AND ONLY ONE OF THEM IS A DERIVATION.
 * READ THIS BEFORE CHOOSING A MODE.** For `pt2399-core` the size is the OWNER'S
 * DECISION - *"increase the board size to 150mm x 100mm"*, 2026-11-13 - and
 * `floorplan-intent.json` `envelope.size_mm` records it. A board whose intent
 * declares a size takes `--write-declared`, and shrinking it to the parts would
 * be overriding him with a measurement. `--write-derived` is for a board whose
 * size nobody has ruled on. Picking the wrong one is not silent:
 * `./resolve-intent-zones.ts` refuses a board whose outline disagrees with its
 * intent's declared size.
 *
 * THE DERIVATION, which is what `--write-derived` computes and the whole of
 * what this module decides for itself:
 *
 *   outline = the bounding box of every placed footprint's COURTYARD,
 *             grown by the fabrication standard's copper-to-edge clearance
 *
 * The courtyard rather than the pads, because the courtyard is what the DRC
 * and the placement grader both compare - `courtyards_overlap` is a courtyard
 * test and the grader's `legality` budget counts a courtyard leaving the
 * outline as out-of-bounds. The clearance comes from
 * `./fab-standard.ts`'s `RULE_MINIMUMS.min_copper_edge_clearance`, read rather
 * than written down again, so a change to the standard moves this outline.
 *
 * WHAT THIS MODULE REFUSES TO DO, because it would be the inversion Task 8 of
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`
 * exists to prevent: it never grows an outline to accommodate a placement that
 * was graded against a different one. It computes the box the parts occupy and
 * nothing else. A caller that places, derives, re-places and derives again is
 * iterating a fixed point - each placement graded against the geometry it was
 * made on - and a caller that nudges an edge outward until a stale grade passes
 * is doing the forbidden thing with the same function.
 */
import fs from "node:fs"
import { child, parseSexpr, type SNode } from "../../lib/kicad/sexpr.ts"
import { assertStillParses, withoutTopLevelForms, withTopLevelForms } from "./board-forms.ts"
import { RULE_MINIMUMS } from "./fab-standard.ts"
import { declaredEnvelopeSize } from "./resolve-intent-zones.ts"
import type { Bounds } from "./resolve-intent-zones.ts"

/** The standard's copper-to-edge floor, read from the one place it is written. */
export const EDGE_CLEARANCE_MM = RULE_MINIMUMS["min_copper_edge_clearance"] as number

const COURTYARD_LAYERS = new Set(["F.CrtYd", "B.CrtYd"])
const GRAPHIC = /^fp_(line|rect|poly|arc|circle)$/
const EDGE_SHAPE = /^gr_(line|rect|poly|arc|circle)$/

/** One footprint's reference and the courtyard box it occupies in BOARD coordinates. */
export interface PlacedCourtyard {
  readonly ref: string
  readonly box: Bounds
}

function numbers(node: SNode, key: string, where: string): readonly [number, number] {
  const found = child(node, key)
  if (found === undefined) throw new Error(`${where}: no (${key} ...)`)
  const x = Number(found.atoms[0])
  const y = Number(found.atoms[1])
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`${where}: (${key} ...) does not carry two numbers`)
  }
  return [x, y]
}

/**
 * A footprint graphic's points in the footprint's OWN frame, with a circle or
 * an arc expanded to its full extent.
 *
 * Reading a circle's two literal points instead would report a zero-height box,
 * and every mounting hole and radial electrolytic on this board draws its
 * courtyard as one circle - so the bug would shrink the outline rather than
 * announce itself.
 */
function localPoints(node: SNode, where: string): readonly (readonly [number, number])[] {
  if (node.name === "fp_circle") {
    const [cx, cy] = numbers(node, "center", where)
    const [ex, ey] = numbers(node, "end", where)
    const r = Math.hypot(ex - cx, ey - cy)
    return [
      [cx - r, cy - r],
      [cx + r, cy + r],
    ]
  }
  const out: (readonly [number, number])[] = []
  for (const key of ["start", "end", "mid", "center"]) {
    if (child(node, key) !== undefined) out.push(numbers(node, key, where))
  }
  for (const pts of node.nodes.filter((n) => n.name === "pts")) {
    for (const xy of pts.nodes.filter((n) => n.name === "xy")) {
      out.push([Number(xy.atoms[0]), Number(xy.atoms[1])])
    }
  }
  if (out.length === 0) {
    throw new Error(
      `${where}: a (${node.name} ...) on a courtyard layer carries no point this tool can read. ` +
        "Refused rather than skipped: a dropped courtyard shape shrinks the box every outline " +
        "below is derived from, and the board would come out too small with nothing to show it.",
    )
  }
  return out
}

/**
 * An `(fp_* ...)` arc that is not expanded to its true extent, and why that is
 * not a defect HERE: a courtyard arc's three points are its endpoints and a
 * point ON the curve, so their bounding box can understate the extent by up to
 * the sagitta. No footprint this board places draws a courtyard arc - every one
 * is lines, rectangles or a full circle - and this function would have to solve
 * for the arc's centre to do better. If a board ever places one, the box is
 * conservative in the wrong direction, so it is named here rather than left for
 * someone to discover from a part hanging over an edge.
 */
export const ARC_COURTYARDS_ARE_APPROXIMATED =
  "a courtyard arc's extent is taken from its three stated points, which can understate it by the sagitta"

/** Rotates a footprint-local point into board coordinates. KiCad rotates clockwise-positive. */
function toBoard(
  point: readonly [number, number],
  at: readonly [number, number],
  degrees: number,
): readonly [number, number] {
  const rad = (-degrees * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const [x, y] = point
  return [at[0] + x * c - y * s, at[1] + x * s + y * c]
}

/** Every placed footprint's courtyard box, in board coordinates. */
export function placedCourtyards(boardText: string, where: string): readonly PlacedCourtyard[] {
  const root = parseSexpr(boardText)
  const out: PlacedCourtyard[] = []
  for (const footprint of root.nodes.filter((n) => n.name === "footprint")) {
    const library = footprint.atoms[0] ?? "?"
    const reference = footprint.nodes.find(
      (n) => n.name === "property" && n.atoms[0] === "Reference",
    )?.atoms[1]
    const ref = reference ?? library
    const atNode = child(footprint, "at")
    if (atNode === undefined) throw new Error(`${where}: footprint ${ref} has no (at ...)`)
    const at = numbers(footprint, "at", `${where}: footprint ${ref}`)
    const rotation = atNode.atoms[2] === undefined ? 0 : Number(atNode.atoms[2])
    if (!Number.isFinite(rotation)) {
      throw new Error(`${where}: footprint ${ref} has an unreadable rotation ${String(atNode.atoms[2])}`)
    }
    const xs: number[] = []
    const ys: number[] = []
    for (const node of footprint.nodes) {
      if (!GRAPHIC.test(node.name)) continue
      if (!COURTYARD_LAYERS.has(child(node, "layer")?.atoms[0] ?? "")) continue
      for (const point of localPoints(node, `${where}: footprint ${ref}`)) {
        const [bx, by] = toBoard(point, at, rotation)
        xs.push(bx)
        ys.push(by)
      }
    }
    if (xs.length === 0) {
      throw new Error(
        `${where}: footprint ${ref} (${library}) draws no F.CrtYd or B.CrtYd geometry, so it has ` +
          "no courtyard. A footprint with no courtyard is invisible to KiCad's courtyards_overlap " +
          "check and contributes nothing to the outline derived here - both silently. " +
          "docs/standards/pcbway-fab-rules.md requires missing_courtyard enabled for this reason.",
      )
    }
    out.push({
      ref,
      box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    })
  }
  if (out.length === 0) {
    throw new Error(
      `${where} holds no footprints, so there is no placed extent to derive an outline from. ` +
        "An outline is not invented for an empty board: see make/pcb.mk's update-pt2399-core for " +
        "how a board gets its footprints.",
    )
  }
  return out
}

/** One pad's owning reference and its bounding box in BOARD coordinates. */
export interface PlacedPad {
  readonly ref: string
  readonly pad: string
  readonly box: Bounds
}

/**
 * Every pad on the board, as a box in board coordinates.
 *
 * A pad's `(at ...)` is relative to its footprint and carries its own rotation,
 * which this does NOT apply to the pad's own shape: it rotates the pad's CENTRE
 * into board coordinates and then takes an axis-aligned box of `(size ...)`,
 * swapping the two when the footprint's rotation is an odd multiple of 90
 * degrees. For a circular or square pad that is exact; for a rectangular pad at
 * an arbitrary angle the box is approximate, and the approximation is named
 * here rather than hidden because no caller in this repository places one.
 */
export function placedPads(boardText: string, where: string): readonly PlacedPad[] {
  const root = parseSexpr(boardText)
  const out: PlacedPad[] = []
  for (const footprint of root.nodes.filter((n) => n.name === "footprint")) {
    const ref =
      footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ??
      footprint.atoms[0] ??
      "?"
    const atNode = child(footprint, "at")
    if (atNode === undefined) throw new Error(`${where}: footprint ${ref} has no (at ...)`)
    const at = numbers(footprint, "at", `${where}: footprint ${ref}`)
    const rotation = atNode.atoms[2] === undefined ? 0 : Number(atNode.atoms[2])
    const swap = Math.round(Math.abs(rotation)) % 180 === 90
    for (const pad of footprint.nodes.filter((n) => n.name === "pad")) {
      const local = numbers(pad, "at", `${where}: pad of ${ref}`)
      const size = numbers(pad, "size", `${where}: pad of ${ref}`)
      const [cx, cy] = toBoard(local, at, rotation)
      const halfX = (swap ? size[1] : size[0]) / 2
      const halfY = (swap ? size[0] : size[1]) / 2
      out.push({
        ref,
        pad: pad.atoms[0] ?? "",
        box: { x0: cx - halfX, y0: cy - halfY, x1: cx + halfX, y1: cy + halfY },
      })
    }
  }
  return out
}

/** The bounding box of every placed courtyard. */
export function placedExtent(boardText: string, where: string): Bounds {
  const boxes = placedCourtyards(boardText, where)
  return {
    x0: Math.min(...boxes.map((b) => b.box.x0)),
    y0: Math.min(...boxes.map((b) => b.box.y0)),
    x1: Math.max(...boxes.map((b) => b.box.x1)),
    y1: Math.max(...boxes.map((b) => b.box.y1)),
  }
}

/** Rounds a box OUTWARD to `step` mm, so a margin can only grow and never shrink. */
export function grownTo(bounds: Bounds, margin: number, step = 0.01): Bounds {
  const out = (v: number): number => Math.ceil((v + margin) / step - 1e-9) * step
  const back = (v: number): number => Math.floor((v - margin) / step + 1e-9) * step
  const round = (v: number): number => Math.round(v / step) * step
  return {
    x0: round(back(bounds.x0)),
    y0: round(back(bounds.y0)),
    x1: round(out(bounds.x1)),
    y1: round(out(bounds.y1)),
  }
}

/**
 * The outline this board should have: its placed extent grown by the standard's
 * copper-to-edge clearance.
 */
export function derivedOutline(boardText: string, where: string): Bounds {
  return grownTo(placedExtent(boardText, where), EDGE_CLEARANCE_MM)
}

/** The `(gr_rect ...)` form for a rectangular outline on `Edge.Cuts`. */
export function outlineRectForm(bounds: Bounds, uuid: string): string {
  const n = (v: number): string => String(Number(v.toFixed(4)))
  return [
    "(gr_rect",
    `\t\t(start ${n(bounds.x0)} ${n(bounds.y0)})`,
    `\t\t(end ${n(bounds.x1)} ${n(bounds.y1)})`,
    "\t\t(stroke",
    "\t\t\t(width 0.05)",
    "\t\t\t(type default)",
    "\t\t)",
    "\t\t(fill no)",
    '\t\t(layer "Edge.Cuts")',
    `\t\t(uuid "${uuid}")`,
    "\t)",
  ].join("\n")
}

/**
 * `boardText` with its `Edge.Cuts` graphics replaced by one rectangle.
 *
 * REPLACED, not added to. A second outline shape left behind would widen the
 * bounding box every consumer reads - `resolve-intent-zones.ts` resolves the
 * approved zone fractions against it, and the grader reads the envelope from it
 * - so a stale edge would quietly move the criteria rather than show up as a
 * stray line. The count removed is returned so a caller can say what it took out.
 */
export function withOutlineRect(
  boardText: string,
  where: string,
  bounds: Bounds,
  uuid: string,
): { readonly text: string; readonly replaced: number } {
  if (bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) {
    throw new Error(
      `${where}: refusing to write an empty or inverted outline ` +
        `(${bounds.x0}, ${bounds.y0}) to (${bounds.x1}, ${bounds.y1}).`,
    )
  }
  const stripped = withoutTopLevelForms(boardText, where, (form, body) => {
    if (!EDGE_SHAPE.test(form.name)) return false
    return /\(layer\s+"Edge\.Cuts"\)/.test(body)
  })
  const text = withTopLevelForms(stripped.text, where, [outlineRectForm(bounds, uuid)])
  assertStillParses(text, where)
  return { text, replaced: stripped.removed }
}

export function describeBounds(bounds: Bounds): string {
  return (
    `${(bounds.x1 - bounds.x0).toFixed(2)} x ${(bounds.y1 - bounds.y0).toFixed(2)} mm at ` +
    `(${bounds.x0.toFixed(2)}, ${bounds.y0.toFixed(2)})`
  )
}

const USAGE = [
  "usage: bun tools/pcb/board-outline.ts <board.kicad_pcb> [mode]",
  "",
  "  (no mode)                                  REPORT only; changes nothing.",
  "  --write-declared <intent.json> <x> <y> <uuid>",
  "       Write the size the intent's `envelope.size_mm` declares, at origin (x, y).",
  "       THIS IS THE MODE FOR A BOARD WHOSE SIZE SOMEBODY RULED ON. The size comes",
  "       from the intent and is never a command-line number; the origin is, because",
  "       where the rectangle sits on the sheet is not a criterion and the intent says",
  "       so ('a rect carries an origin, and an origin goes stale').",
  "  --write-derived <uuid>",
  "       Write the placed courtyard extent grown by the standard's copper-to-edge",
  "       clearance. ONLY for a board whose size nobody has ruled on - on pt2399-core",
  "       this would override the owner with a measurement.",
  "",
  "  The uuid is required and never generated, so re-running produces the same bytes.",
].join("\n")

if (import.meta.main) {
  const args = process.argv.slice(2)
  const board = args[0]
  if (board === undefined) throw new Error(USAGE)
  const text = fs.readFileSync(board, "utf8")
  const extent = placedExtent(text, board)
  const courtyards = placedCourtyards(text, board)
  console.log(`${courtyards.length} placed footprint(s)`)
  console.log(`placed courtyard extent ${describeBounds(extent)}`)
  console.log(
    `outline DERIVED from it would be ${describeBounds(derivedOutline(text, board))} ` +
      `(extent + ${EDGE_CLEARANCE_MM} mm all round)`,
  )

  const mode = args[1]
  if (mode === undefined) {
    console.log("no mode given, so nothing was written")
  } else if (mode === "--write-declared") {
    const [intentPath, xText, yText, uuid] = args.slice(2)
    if (intentPath === undefined || xText === undefined || yText === undefined || uuid === undefined) {
      throw new Error(`--write-declared needs <intent.json> <x> <y> <uuid>.\n\n${USAGE}`)
    }
    const size = declaredEnvelopeSize(JSON.parse(fs.readFileSync(intentPath, "utf8")), intentPath)
    if (size === undefined) {
      throw new Error(
        `${intentPath} declares no envelope.size_mm, so there is no declared size to write. Use ` +
          "--write-derived if this board's size is genuinely nobody's decision, and say so.",
      )
    }
    const x = Number(xText)
    const y = Number(yText)
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`origin (${xText}, ${yText}) is not two numbers`)
    const declared = { x0: x, y0: y, x1: x + size[0], y1: y + size[1] }
    const written = withOutlineRect(text, board, declared, uuid)
    fs.writeFileSync(board, written.text)
    console.log(`declared size ${size[0]} x ${size[1]} mm from ${intentPath}`)
    console.log(`replaced ${written.replaced} Edge.Cuts shape(s) with ${describeBounds(declared)} in ${board}`)
  } else if (mode === "--write-derived") {
    const uuid = args[2]
    if (uuid === undefined) throw new Error(`--write-derived needs a uuid argument.\n\n${USAGE}`)
    const written = withOutlineRect(text, board, derivedOutline(text, board), uuid)
    fs.writeFileSync(board, written.text)
    console.log(`replaced ${written.replaced} Edge.Cuts shape(s) with the DERIVED rectangle in ${board}`)
  } else {
    throw new Error(`unrecognised mode ${JSON.stringify(mode)}.\n\n${USAGE}`)
  }
}
