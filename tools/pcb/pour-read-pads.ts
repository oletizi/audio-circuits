/**
 * PADS, TRACKS AND VIAS, as `./pour.ts` reads them off a saved board. Zones are
 * in `./pour-read.ts`. Every refusal here names what could not be read and why
 * it is not guessed.
 *
 * A pad's angle in a saved board is ABSOLUTE (it already includes its footprint's
 * - measured on this repository's own board, where a footprint at 270 carries
 * pads at 270), so it is used as written; see `./pour-geometry.ts`.
 */
import { child, children } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { toBoard } from "./pour-geometry.ts"
import type { PadOutline, Pt } from "./pour-geometry.ts"
import { expandLayers, num } from "./pour-read.ts"
import { PourRefusal } from "./pour-refusal.ts"

export interface BoardPad {
  readonly ref: string
  readonly number: string
  readonly type: string
  /** The pad's net name, or null if it names none. */
  readonly net: string | null
  readonly layers: readonly string[]
  readonly outline: PadOutline
}

function referenceOf(footprint: SNode, where: string): string {
  const ref = footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1]
  if (ref === undefined || ref === "") {
    throw new PourRefusal(
      "board-shape",
      `${where}: a footprint (${footprint.atoms[0] ?? "?"}) has no Reference property. Pads are keyed by reference, ` +
        "and keying one by its library name instead would file its figures under a name nobody wrote on the board.",
    )
  }
  return ref
}

function outlineOf(pad: SNode, footprint: SNode, padWhere: string): PadOutline {
  const at = child(footprint, "at")
  const padAt = child(pad, "at")
  const size = child(pad, "size")
  if (at === undefined || padAt === undefined || size === undefined) {
    throw new PourRefusal("board-shape", `${padWhere} or its footprint lacks an (at ...) or (size ...).`)
  }
  const shape = pad.atoms[2] ?? ""
  const w = num(size.atoms[0], "pad width", padWhere)
  const h = num(size.atoms[1], "pad height", padWhere)
  let radius: number
  if (shape === "circle" || shape === "oval") radius = Math.min(w, h) / 2
  else if (shape === "rect") radius = 0
  else if (shape === "roundrect") {
    const ratio = child(pad, "roundrect_rratio")?.atoms[0]
    if (ratio === undefined) {
      throw new PourRefusal("board-shape", `${padWhere} is a roundrect with no (roundrect_rratio ...); its corner radius is not guessed.`)
    }
    radius = num(ratio, "roundrect_rratio", padWhere) * Math.min(w, h)
  } else {
    throw new PourRefusal(
      "board-shape",
      `${padWhere} has shape "${shape}". Only circle, oval, rect and roundrect outlines are read; a trapezoid or ` +
        "custom pad would be approximated, and the ring spokes are counted on is placed from that outline.",
    )
  }
  return {
    centre: toBoard(
      [num(padAt.atoms[0], "pad x", padWhere), num(padAt.atoms[1], "pad y", padWhere)],
      [num(at.atoms[0], "footprint x", padWhere), num(at.atoms[1], "footprint y", padWhere)],
      at.atoms[2] === undefined ? 0 : num(at.atoms[2], "footprint rotation", padWhere),
    ),
    hx: w / 2,
    hy: h / 2,
    radius,
    degrees: padAt.atoms[2] === undefined ? 0 : num(padAt.atoms[2], "pad angle", padWhere),
  }
}

/**
 * Every pad `wanted` selects, by (reference, net). Only the selected pads are
 * required to have a readable outline, so a pad nothing asks about cannot
 * refuse the board.
 */
export function readPads(
  root: SNode,
  where: string,
  copper: readonly string[],
  wanted: (ref: string, net: string | null) => boolean,
): readonly BoardPad[] {
  const out: BoardPad[] = []
  for (const footprint of children(root, "footprint")) {
    const ref = referenceOf(footprint, where)
    for (const pad of children(footprint, "pad")) {
      const net = child(pad, "net")?.atoms[0] ?? null
      if (!wanted(ref, net)) continue
      const number = pad.atoms[0] ?? ""
      const padWhere = `${where}: pad ${ref}-${number}`
      if ((child(footprint, "layer")?.atoms[0] ?? "") !== "F.Cu") {
        throw new PourRefusal(
          "board-shape",
          `${padWhere} is on a footprint that is not on F.Cu. A back-side footprint is stored mirrored and this ` +
            "reader does not unmirror it; it is refused rather than measured at the wrong place.",
        )
      }
      out.push({
        ref,
        number,
        type: pad.atoms[1] ?? "",
        net,
        layers: expandLayers(child(pad, "layers")?.atoms ?? [], copper),
        outline: outlineOf(pad, footprint, padWhere),
      })
    }
  }
  return out
}

/** A ground track as a polyline (an arc is read as start - mid - end, which understates its sweep) and its width. */
export interface GroundTrack {
  readonly layer: string
  readonly path: readonly Pt[]
  readonly widthMm: number
}

export function readGroundTracks(root: SNode, where: string, groundNet: string): readonly GroundTrack[] {
  const out: GroundTrack[] = []
  for (const track of root.nodes.filter((n) => n.name === "segment" || n.name === "arc")) {
    if (child(track, "net")?.atoms[0] !== groundNet) continue
    const layer = child(track, "layer")?.atoms[0]
    if (layer === undefined) throw new PourRefusal("board-shape", `${where}: a ${track.name} on ${groundNet} has no (layer ...).`)
    const path = ["start", "mid", "end"]
      .filter((key) => track.name === "arc" || key !== "mid")
      .map((key): Pt => {
        const node = child(track, key)
        if (node === undefined) throw new PourRefusal("board-shape", `${where}: a ${track.name} on ${groundNet} has no (${key} ...).`)
        return [num(node.atoms[0], `track ${key} x`, where), num(node.atoms[1], `track ${key} y`, where)]
      })
    out.push({ layer, path, widthMm: num(child(track, "width")?.atoms[0], "track width", where) })
  }
  return out
}

export interface GroundVia {
  readonly at: Pt
  readonly diameterMm: number
}

export function readGroundVias(root: SNode, where: string, groundNet: string): readonly GroundVia[] {
  return children(root, "via")
    .filter((v) => child(v, "net")?.atoms[0] === groundNet)
    .map((via) => {
      const at = child(via, "at")
      if (at === undefined) throw new PourRefusal("board-shape", `${where}: a via on ${groundNet} has no (at ...).`)
      return {
        at: [num(at.atoms[0], "via x", where), num(at.atoms[1], "via y", where)] as const,
        diameterMm: num(child(via, "size")?.atoms[0], "via size", where),
      }
    })
}
