/**
 * **CLOSED-FORM GEOMETRY OF A DRAWING'S WIRES. It is not a readability score and may not become
 * one.** `CLAUDE.md` and the constitution's first principle forbid inventing a number that stands
 * in for a person's judgement of whether a drawing reads; three such proxies were invented in two
 * days and each pointed the opposite way to the owner's judgement on a specific occasion.
 *
 * **What these two ARE:** a crossing is two segments of DIFFERENT nets meeting at a point interior
 * to both, which is a thing a reader's eye must resolve and KiCad draws no junction for. A corner
 * is a vertex where one net's path changes axis. Both have closed forms. Neither is combined with
 * the other, weighted, or thresholded here - a caller that does so is building the forbidden thing.
 *
 * **Same-net crossings are deliberately NOT counted.** Two segments of one net meeting is that
 * net's own geometry and carries a junction; counting it would make a correct star topology look
 * like clutter.
 */
import type { Wire } from "./block-types.ts";

export interface WireGeometry {
  /** Different-net segment pairs meeting interior to both. */
  readonly crossings: number;
  /** Vertices where one net's path changes axis. */
  readonly corners: number;
  /** Segments measured, so a zero is distinguishable from an empty block. */
  readonly segments: number;
}

const horizontal = (w: Wire): boolean => w.a.y === w.b.y;
const vertical = (w: Wire): boolean => w.a.x === w.b.x;

/** Strictly between, so a touch at an endpoint is a corner rather than a crossing. */
const between = (v: number, lo: number, hi: number): boolean =>
  v > Math.min(lo, hi) && v < Math.max(lo, hi);

function crosses(p: Wire, q: Wire): boolean {
  if (p.net === q.net) return false;
  const [h, v] = horizontal(p) && vertical(q) ? [p, q] : vertical(p) && horizontal(q) ? [q, p] : [];
  if (h === undefined || v === undefined) return false;
  return between(v.a.x, h.a.x, h.b.x) && between(h.a.y, v.a.y, v.b.y);
}

export function wireGeometry(wires: readonly Wire[]): WireGeometry {
  let crossings = 0;
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const p = wires[i];
      const q = wires[j];
      if (p !== undefined && q !== undefined && crosses(p, q)) crossings++;
    }
  }

  let corners = 0;
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const p = wires[i];
      const q = wires[j];
      if (p === undefined || q === undefined || p.net !== q.net) continue;
      if (horizontal(p) === horizontal(q)) continue;
      const ends = [p.a, p.b];
      const theirs = [q.a, q.b];
      if (ends.some((e) => theirs.some((t) => t.x === e.x && t.y === e.y))) corners++;
    }
  }

  return { crossings, corners, segments: wires.length };
}
