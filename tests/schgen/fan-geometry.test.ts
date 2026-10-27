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

  it("counts one corner when three same-net arms meet at one point", () => {
    const g = wireGeometry([
      w(0, 0, 20, 0, "A"),
      w(10, -10, 10, 0, "A"),
      w(10, 0, 10, 10, "A"),
    ])
    expect(g.corners).toBe(1)
  })

  it("counts one corner for a spine with perpendicular tap", () => {
    const g = wireGeometry([
      w(0, 0, 10, 0, "A"),
      w(10, 0, 20, 0, "A"),
      w(10, 0, 10, 10, "A"),
    ])
    expect(g.corners).toBe(1)
  })

  it("counts one corner for a four-arm same-net cross junction", () => {
    const g = wireGeometry([w(0, 0, 20, 0, "A"), w(10, -10, 10, 10, "A")])
    expect(g.corners).toBe(1)
  })

  it("counts separate corners at different points", () => {
    const g = wireGeometry([
      w(0, 0, 10, 0, "A"),
      w(10, 0, 10, 10, "A"),
      w(20, 0, 30, 0, "A"),
      w(30, 0, 30, 10, "A"),
    ])
    expect(g.corners).toBe(2)
  })

  it("throws on diagonal wire, naming net and endpoints", () => {
    expect(() => {
      wireGeometry([w(0, 0, 10, 10, "A")])
    }).toThrow(/Diagonal wire on net 'A'.*from.*\(0,0\).*to.*\(10,10\)/)
  })

  it("throws on zero-length wire", () => {
    expect(() => {
      wireGeometry([w(5, 5, 5, 5, "A")])
    }).toThrow(/Zero-length wire/)
  })

  it("counts a corner at a fractional coordinate where one net turns", () => {
    const g = wireGeometry([w(0, 0, 12.5, 0, "A"), w(12.5, 0, 12.5, 10, "A")])
    expect(g.corners).toBe(1)
  })
})
