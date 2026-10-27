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
