import { describe, expect, it } from "bun:test"
import { buildGuideHtml, type GuideInput, type GuideSchematic } from "../../tools/guide/guide.ts"

const input = (schematic: GuideSchematic): GuideInput => ({
  boardName: "pultec-low-boost",
  generated: "2026-10-27",
  layoutPath: "boards/pultec-low-boost/pultec-low-boost.perfboard.vrt",
  schematic,
  images: { designators: "<svg/>", values: "<svg/>", copper: "<svg/>", clusters: undefined },
  checklist: [],
  powerUpChecks: undefined,
  wiringPath: undefined,
  scaffold: undefined,
})

describe("a withheld schematic is a different claim from an absent one", () => {
  it("names the reason, so nobody reads a withheld sheet as a board with no schematic", () => {
    const html = buildGuideHtml(
      input({
        kind: "withheld",
        declarationPath: "boards/pultec-low-boost/perfboard.json",
        circuitPath: "circuits/pultec/physical/low-boost.ts",
        reason: "5 fallback field placement(s): text the placer could not keep clear",
      }),
    )
    expect(html).toContain("5 fallback field placement")
    expect(html).toContain("withheld")
    expect(html).not.toContain("there is no schematic for pultec-low-boost to print")
  })

  it("a generated-and-clean schematic prints as a page, like a hand-authored one", () => {
    const html = buildGuideHtml(input({ kind: "generated", path: "schematic.pdf" }))
    expect(html).toContain("schematic.pdf")
    expect(html).not.toContain("withheld")
  })

  it("an absent schematic still prints the no-schematic notice, unchanged", () => {
    const html = buildGuideHtml(
      input({
        kind: "none",
        declarationPath: "boards/pultec-low-boost/perfboard.json",
        circuitPath: "circuits/pultec/physical/low-boost.ts",
      }),
    )
    expect(html).toContain("no schematic")
    expect(html).not.toContain("withheld")
  })
})
