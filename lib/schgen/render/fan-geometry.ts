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

  const vertexPoints = new Set<string>();
  for (const w of wires) {
    vertexPoints.add(`${w.net},${w.a.x},${w.a.y}`);
    vertexPoints.add(`${w.net},${w.b.x},${w.b.y}`);
  }

  const netWires = new Map<string, Wire[]>();
  for (const w of wires) {
    if (!netWires.has(w.net)) {
      netWires.set(w.net, []);
    }
    netWires.get(w.net)!.push(w);
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
            vertexPoints.add(`${w1.net},${x},${y}`);
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
            vertexPoints.add(`${vWire.net},${x},${y}`);
          }
        }
      }
    }
  }

  let corners = 0;
  for (const vertexKey of vertexPoints) {
    const parts = vertexKey.split(",");
    const net = parts[0]!;
    const x = parseInt(parts[1]!, 10);
    const y = parseInt(parts[2]!, 10);

    let hasHorizontal = false;
    let hasVertical = false;

    for (const w of wires) {
      if (w.net !== net) continue;

      if (horizontal(w)) {
        const minX = Math.min(w.a.x, w.b.x);
        const maxX = Math.max(w.a.x, w.b.x);
        if (y === w.a.y && x >= minX && x <= maxX) {
          hasHorizontal = true;
        }
      }

      if (vertical(w)) {
        const minY = Math.min(w.a.y, w.b.y);
        const maxY = Math.max(w.a.y, w.b.y);
        if (x === w.a.x && y >= minY && y <= maxY) {
          hasVertical = true;
        }
      }
    }

    if (hasHorizontal && hasVertical) corners++;
  }

  return { crossings, corners, segments: wires.length };
}
