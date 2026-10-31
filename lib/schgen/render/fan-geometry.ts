/**
 * **CLOSED-FORM GEOMETRY OF A DRAWING'S WIRES. It is not a readability score and may not become
 * one.** `CLAUDE.md` and the constitution's first principle forbid inventing a number that stands
 * in for a person's judgement of whether a drawing reads; three such proxies were invented in two
 * days and each pointed the opposite way to the owner's judgement on a specific occasion.
 *
 * **What these three ARE:**
 * - A **crossing** is two segments of DIFFERENT nets meeting at a point interior to both, which is a
 *   thing a reader's eye must resolve and KiCad draws no junction for.
 * - A **corner** is a vertex (a point on the plane) where one net has at least one horizontal
 *   segment AND at least one vertical segment incident to it. Counted once per distinct (net, point).
 *   A two-segment turn is 1 corner; a three-arm T is 1; a straight run of collinear segments is 0;
 *   a four-arm cross is 1.
 * - A **segment** count, so zero is distinguishable from an empty block.
 *
 * All three have closed forms. Neither is combined with the other, weighted, or thresholded here -
 * a caller that does so is building the forbidden readability score.
 *
 * **Same-net crossings are deliberately NOT counted.** Two segments of one net meeting is that
 * net's own geometry and carries a junction; counting it would make a correct star topology look
 * like clutter.
 *
 * **Non-axis-aligned wires are REFUSED.** A diagonal wire (neither horizontal nor vertical) is
 * silently invisible to both crossing and corner definitions, which report zero for geometry that
 * is plainly there. This project's rule is refuse rather than guess. The message names the net,
 * both endpoints, and why it is not defaulted.
 *
 * **Zero-length wires are REFUSED.** A wire where both endpoints are identical is rejected the
 * same way, because it satisfies both horizontal and vertical at once.
 */
import type { Wire } from "./block-types.ts";
import type { NetName } from "../ir/types.ts";
import type { Point, Um } from "./geometry.ts";

export interface WireGeometry {
  /** Different-net segment pairs meeting interior to both. */
  readonly crossings: number;
  /** Vertices where one net has both horizontal and vertical incident segments. Counted once per distinct (net, point). */
  readonly corners: number;
  /** Segments measured, so a zero is distinguishable from an empty block. */
  readonly segments: number;
}

const horizontal = (w: Wire): boolean => w.a.y === w.b.y;
const vertical = (w: Wire): boolean => w.a.x === w.b.x;

/** Strictly between, so a touch at an endpoint is a corner rather than a crossing. */
const between = (v: number, lo: number, hi: number): boolean =>
  v > Math.min(lo, hi) && v < Math.max(lo, hi);

function validateWire(w: Wire): void {
  if (w.a.x === w.b.x && w.a.y === w.b.y) {
    throw new Error(
      `Zero-length wire on net '${w.net}' at (${w.a.x},${w.a.y}): crossing and corner definitions require non-zero-length axis-aligned segments`
    );
  }
  if (!horizontal(w) && !vertical(w)) {
    throw new Error(
      `Diagonal wire on net '${w.net}' from (${w.a.x},${w.a.y}) to (${w.b.x},${w.b.y}): crossing and corner definitions require axis-aligned segments`
    );
  }
}

function crosses(p: Wire, q: Wire): boolean {
  if (p.net === q.net) return false;
  const [h, v] = horizontal(p) && vertical(q) ? [p, q] : vertical(p) && horizontal(q) ? [q, p] : [];
  if (h === undefined || v === undefined) return false;
  return between(v.a.x, h.a.x, h.b.x) && between(h.a.y, v.a.y, v.b.y);
}

export function wireGeometry(wires: readonly Wire[]): WireGeometry {
  for (const w of wires) {
    validateWire(w);
  }

  let crossings = 0;
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const p = wires[i];
      const q = wires[j];
      if (p !== undefined && q !== undefined && crosses(p, q)) crossings++;
    }
  }

  interface VertexInfo {
    net: string;
    x: number;
    y: number;
  }
  const vertexPoints = new Map<string, VertexInfo>();

  const addVertex = (net: string, x: number, y: number): void => {
    const key = `${net},${x},${y}`;
    if (!vertexPoints.has(key)) {
      vertexPoints.set(key, { net, x, y });
    }
  };

  for (const w of wires) {
    addVertex(w.net, w.a.x, w.a.y);
    addVertex(w.net, w.b.x, w.b.y);
  }

  const netWires = new Map<string, Wire[]>();
  for (const w of wires) {
    const list = netWires.get(w.net);
    if (list === undefined) {
      netWires.set(w.net, [w]);
    } else {
      list.push(w);
    }
  }

  for (const wireList of netWires.values()) {
    for (let i = 0; i < wireList.length; i++) {
      for (let j = i + 1; j < wireList.length; j++) {
        const w1 = wireList[i];
        const w2 = wireList[j];

        if (horizontal(w1) && vertical(w2)) {
          const hWire = w1;
          const vWire = w2;
          const x = vWire.a.x;
          const y = hWire.a.y;
          const hMinX = Math.min(hWire.a.x, hWire.b.x);
          const hMaxX = Math.max(hWire.a.x, hWire.b.x);
          const vMinY = Math.min(vWire.a.y, vWire.b.y);
          const vMaxY = Math.max(vWire.a.y, vWire.b.y);
          if (x >= hMinX && x <= hMaxX && y >= vMinY && y <= vMaxY) {
            addVertex(w1.net, x, y);
          }
        } else if (vertical(w1) && horizontal(w2)) {
          const vWire = w1;
          const hWire = w2;
          const x = vWire.a.x;
          const y = hWire.a.y;
          const hMinX = Math.min(hWire.a.x, hWire.b.x);
          const hMaxX = Math.max(hWire.a.x, hWire.b.x);
          const vMinY = Math.min(vWire.a.y, vWire.b.y);
          const vMaxY = Math.max(vWire.a.y, vWire.b.y);
          if (x >= hMinX && x <= hMaxX && y >= vMinY && y <= vMaxY) {
            addVertex(vWire.net, x, y);
          }
        }
      }
    }
  }

  let corners = 0;
  for (const vertex of vertexPoints.values()) {
    let hasHorizontal = false;
    let hasVertical = false;

    for (const w of wires) {
      if (w.net !== vertex.net) continue;

      if (horizontal(w)) {
        const minX = Math.min(w.a.x, w.b.x);
        const maxX = Math.max(w.a.x, w.b.x);
        if (vertex.y === w.a.y && vertex.x >= minX && vertex.x <= maxX) {
          hasHorizontal = true;
        }
      }

      if (vertical(w)) {
        const minY = Math.min(w.a.y, w.b.y);
        const maxY = Math.max(w.a.y, w.b.y);
        if (vertex.x === w.a.x && vertex.y >= minY && vertex.y <= maxY) {
          hasVertical = true;
        }
      }
    }

    if (hasHorizontal && hasVertical) corners++;
  }

  return { crossings, corners, segments: wires.length };
}

/**
 * **A HAIRPIN: a net that travels one way along an axis and then back the other, at a point.**
 *
 * The owner, 2026-10-25 and again 2026-10-27: *"Hairpins are very hard to trace"*, and on the
 * generated `pultec-low-boost` sheet, *"what is odd is R1, which has an unnecessary hairpin to the
 * out label."* He is right, and the measurement below is what that sentence looks like in numbers:
 * net `out` leaves `R1` going LEFT for 2 grid cells, drops, and then runs RIGHT for 49.
 *
 * **IT IS NOT A READABILITY SCORE AND MAY NOT BECOME ONE.** Whether a drawing reads has no closed
 * form, and `CLAUDE.md` records three invented proxies that each pointed the opposite way to his
 * judgement. *"Does this net's path reverse direction on an axis"* has a closed form, like a
 * crossing or a corner. Nothing here combines, weights, ranks or thresholds it.
 *
 * **WHY NOT `ShapeMeasures.reversing`, WHICH ALREADY EXISTS** (`lib/schgen/render/compose.ts`):
 * that counts NETS, one point if any segment of a net ever runs against any other. A six-way
 * fan-out scores the same 1 as this hairpin, and two hairpins on one net also score 1. It cannot
 * find a hairpin, locate it, or say how bad it is - and the register records it condemning the
 * star topology on an occasion where the owner looked at the drawings and preferred them.
 *
 * **IT REPORTS THE SHORT LEG, WHICH IS WHAT MAKES IT ACTIONABLE.** A reversal where the backtrack
 * is 2 cells and the onward run is 49 is a part facing the wrong way; a reversal where both legs
 * are long is a route genuinely going somewhere and coming back. The caller gets both lengths and
 * the point, and decides.
 */
export interface Hairpin {
  readonly net: NetName;
  /** Where the net turns back on itself. */
  readonly at: Point;
  /** The axis it reverses on. */
  readonly axis: "x" | "y";
  /** The shorter of the two opposed runs, in micrometres - the backtrack. */
  readonly backtrack: Um;
  /** The longer of the two, in micrometres - what it doubles back from. */
  readonly onward: Um;
}

/**
 * Every point where one net's path reverses along an axis.
 *
 * A reversal is two segments of ONE net, on the same axis, sharing an endpoint, running in
 * OPPOSITE directions from it. Two collinear segments continuing the same way are not a reversal,
 * and a corner (one horizontal, one vertical) is not either - that is `corners`.
 */
export function hairpins(wires: readonly Wire[]): readonly Hairpin[] {
  const out: Hairpin[] = [];
  const span = (w: Wire, axis: "x" | "y"): readonly [number, number] =>
    axis === "x" ? [Math.min(w.a.x, w.b.x), Math.max(w.a.x, w.b.x)] : [Math.min(w.a.y, w.b.y), Math.max(w.a.y, w.b.y)];
  const run = (w: Wire, axis: "x" | "y"): number => (axis === "x" ? w.b.x - w.a.x : w.b.y - w.a.y);
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const p = wires[i];
      const q = wires[j];
      if (p === undefined || q === undefined || p.net !== q.net) continue;
      const axis: "x" | "y" | null = horizontal(p) && horizontal(q) ? "x" : vertical(p) && vertical(q) ? "y" : null;
      if (axis === null) continue;
      const dp = run(p, axis);
      const dq = run(q, axis);
      // SAME direction is a continuation, not a doubling back - including two collinear segments
      // meeting end to end, which point opposite ways from their shared point and are a straight line.
      if (dp === 0 || dq === 0 || Math.sign(dp) === Math.sign(dq)) continue;
      const [p0, p1] = span(p, axis);
      const [q0, q1] = span(q, axis);
      const overlap = Math.min(p1, q1) - Math.max(p0, q0);
      // **THE OVERLAP IS THE WHOLE TEST.** Two opposed runs that merely touch at a point are a
      // straight line through it; two that cover the same ground twice are the net doubling back.
      if (overlap <= 0) continue;
      const a = Math.abs(dp);
      const b = Math.abs(dq);
      const at = axis === "x" ? { x: Math.max(p0, q0), y: p.a.y } : { x: p.a.x, y: Math.max(p0, q0) };
      out.push({ net: p.net, at, axis, backtrack: Math.min(a, b), onward: Math.max(a, b) });
    }
  }
  return out;
}
