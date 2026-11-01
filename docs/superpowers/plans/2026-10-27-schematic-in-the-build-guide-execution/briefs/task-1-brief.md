## Task 1: Closed-form wire geometry

**Files:**
- Create: `lib/schgen/render/fan-geometry.ts`
- Test: `tests/schgen/fan-geometry.test.ts`

**Interfaces:**
- Consumes: `Wire` from `lib/schgen/render/block-types.ts` — `{ readonly a: Point; readonly b: Point; readonly net: NetName }`. `Point` is `{ x: Um; y: Um }`.
- Produces: `export interface WireGeometry { readonly crossings: number; readonly corners: number; readonly segments: number }` and `export function wireGeometry(wires: readonly Wire[]): WireGeometry`.

**Why these two numbers and not a third.** A crossing is two segments of *different* nets meeting at a point interior to both — it is a thing a reader's eye has to resolve. A corner is a vertex where one net's path changes axis. Both have closed forms and neither is a readability verdict. **Two segments of the SAME net crossing is not counted**: that is one net's own geometry and KiCad draws a junction there.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test"
import { wireGeometry } from "../../lib/schgen/render/fan-geometry.ts"
import type { Wire } from "../../lib/schgen/render/block-types.ts"

// NO CAST. `Um`, `NetName`, `PartLabel` and `BlockId` are plain aliases in this repository
// (`lib/schgen/render/geometry.ts:11`, `lib/schgen/ir/types.ts:35`), so a literal is assignable
// and `as` is neither needed nor permitted - CLAUDE.md: never bypass typing.
const w = (ax: number, ay: number, bx: number, by: number, net: string): Wire => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  net,
})

describe("wireGeometry counts what a reader's eye has to resolve", () => {
  it("counts one crossing where two different nets cross interior to both", () => {
    const g = wireGeometry([w(0, 10, 20, 10, "A"), w(10, 0, 10, 20, "B")])
    expect(g.crossings).toBe(1)
  })

  it("does NOT count two segments of the SAME net crossing, because KiCad junctions them", () => {
    const g = wireGeometry([w(0, 10, 20, 10, "A"), w(10, 0, 10, 20, "A")])
    expect(g.crossings).toBe(0)
  })

  it("does NOT count a touch at a segment ENDPOINT, which is a corner and not a crossing", () => {
    const g = wireGeometry([w(0, 10, 10, 10, "A"), w(10, 0, 10, 20, "B")])
    expect(g.crossings).toBe(0)
  })

  it("counts a corner where one net turns, and none on a straight run", () => {
    expect(wireGeometry([w(0, 0, 10, 0, "A"), w(10, 0, 10, 10, "A")]).corners).toBe(1)
    expect(wireGeometry([w(0, 0, 10, 0, "A"), w(10, 0, 20, 0, "A")]).corners).toBe(0)
  })

  it("reports the segment count, so a zero is distinguishable from an empty block", () => {
    expect(wireGeometry([]).segments).toBe(0)
    expect(wireGeometry([w(0, 0, 10, 0, "A")]).segments).toBe(1)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test tests/schgen/fan-geometry.test.ts`
Expected: FAIL — `Cannot find module '../../lib/schgen/render/fan-geometry.ts'`

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test tests/schgen/fan-geometry.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add lib/schgen/render/fan-geometry.ts tests/schgen/fan-geometry.test.ts
git commit -m "Closed-form wire geometry: crossings and corners, and what they refuse to be"
```

---

