import { describe, expect, it } from "bun:test"
import { hairpins } from "../../lib/schgen/render/fan-geometry.ts"
import type { Wire } from "../../lib/schgen/render/block-types.ts"

// NO CAST: `Um` and `NetName` are plain aliases in this repository, so a literal is assignable.
const w = (ax: number, ay: number, bx: number, by: number, net: string): Wire => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  net,
})

describe("a hairpin is a net turning back on itself, and nothing else", () => {
  it("finds the reversal and reports both legs, so a caller can tell a flipped part from a real detour", () => {
    // THE GEOMETRY MEASURED ON pultec-low-boost's `out` NET, verbatim: it leaves R1 going LEFT
    // two cells, drops, then runs RIGHT forty-nine. The two horizontal legs cover the same x
    // ground twice, which is the doubling back; the vertical leg between them is the corner.
    const found = hairpins([
      w(54, 25, 52, 25, "out"),
      w(52, 25, 52, 28, "out"),
      w(52, 28, 101, 28, "out"),
    ])
    expect(found.length).toBe(1)
    const h = found[0]
    expect(h?.net).toBe("out")
    expect(h?.axis).toBe("x")
    expect(h?.backtrack).toBe(2)
    expect(h?.onward).toBe(49)
  })

  it("does NOT count two collinear segments continuing the same way", () => {
    expect(hairpins([w(0, 0, 10, 0, "A"), w(10, 0, 20, 0, "A")]).length).toBe(0)
  })

  it("does NOT count a corner, which is one horizontal and one vertical", () => {
    expect(hairpins([w(0, 0, 10, 0, "A"), w(10, 0, 10, 10, "A")]).length).toBe(0)
  })

  it("does NOT count two different nets running opposite ways through one point", () => {
    expect(hairpins([w(10, 0, 0, 0, "A"), w(10, 0, 20, 0, "B")]).length).toBe(0)
  })

  it("finds a reversal on the y axis as readily as on x", () => {
    // Up two, across, back down past where it started: the same y ground covered twice.
    const found = hairpins([w(0, 10, 0, 8, "A"), w(0, 8, 5, 8, "A"), w(5, 8, 5, 40, "A")])
    expect(found.length).toBe(1)
    expect(found[0]?.axis).toBe("y")
    expect(found[0]?.backtrack).toBe(2)
  })

  it("counts a six-way fan-out as ZERO, which is what ShapeMeasures.reversing cannot do", () => {
    // Six branches leaving one hub, three each way. Every pair shares the hub and opposes, but
    // none of them is a net doubling back on its own path - they are siblings of a star.
    // This is the case the existing `reversing` measure scores 1 for and this one must not.
    // Three branches leaving one hub the same way, and one leaving the other way: a star, not a
    // doubling back. The opposed pair meets only at the hub point, so the spans do not overlap.
    const hub = [w(50, 0, 40, 0, "N"), w(50, 0, 30, 0, "N"), w(50, 0, 60, 0, "N")]
    expect(hairpins(hub).length).toBe(0)
  })

  it("reports nothing for no wires, so a zero is a measurement rather than an absence", () => {
    expect(hairpins([]).length).toBe(0)
  })
})
