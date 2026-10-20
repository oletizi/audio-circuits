/**
 * `selectRenderer`: the three rules of spec §1.3, as three assertions. Task 8, Step 2;
 * hand-written, no pedals source.
 *
 * **THIS IS THE G84 TEST.** The register entry reads: *"a labels fallback for a block no template
 * fits degrades the GATE, not merely the drawing"*, and the sentence the plan quotes back at this
 * file is *"if ELK rescues a template that should have worked, defects in the preferred rendering
 * path go dark."* So the rule is asymmetric on purpose:
 *
 * - **every** mismatch `not-applicable`, **on an `auto` block** - no template claims the topology,
 *   nothing was drawn, nothing is hidden - selects the ELK backend;
 * - **any** other mismatch - a template applied, drew something, and disagreed with the IR or
 *   violated a clearance - REFUSES, and ELK does not get a turn;
 * - and a **`wired`** block's `not-applicable` REFUSES too, because the author declared that
 *   template and §1.3's ELK row quantifies over the library (*"no template in the library supports
 *   this topology"*), which one template declining can never establish. Plan decision **D3** says
 *   it the same way, inside the paragraph defining `auto`. `docs/known-gaps.md` **G147**.
 *
 * **THE FOURTH TEST IS THE ONE THAT HOLDS THAT LAST RULE, AND IT WAS MISSING IN ROUND 1.** The
 * refusing fixture below is a `wired` regulator returning `invalid-geometry`, which refuses under
 * the unqualified rule too - so deleting the `rendering.kind === "auto"` condition in
 * `selectRenderer` left all of these green and only the ported template tests red. All four
 * perturbations are in the Task 8 report; the one that discriminates is the fourth.
 *
 * **THE FIXTURES ARE REAL TEMPLATES ON REAL SUBGRAPHS**, not stubs. The refusing one is the
 * regulator fixture `tests/schgen/render/templates/regulator.test.ts` already uses for its
 * "refuses a pin on the input net that is not on the input pin's side" case: that site is one of
 * the two `invalid-geometry` sites in the whole template set, so a stub would have been testing
 * the selection rule against a mismatch no template produces.
 */
import { describe, expect, test } from "bun:test"
import { blockCircuit, cap, res, symbols } from "../__fixtures__/circuits.ts"
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { PartSpec, Rendering } from "../../../lib/schgen/ir/types.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"

/** The five-pin LDO of the regulator fixtures, with `nrNet` on pin 4. */
const reg = (nrNet: string): PartSpec => ({
  label: "U_LDO", refPrefix: "U", libId: "Fix:REG3", units: [1], value: "REG3", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: {
    "1": { net: "VIN", identity: "IN" }, "2": { net: "VIN", identity: "EN" }, "3": { net: "GND", identity: "GND" },
    "4": { net: nrNet, identity: "NR" }, "5": { net: "VOUT", identity: "OUT" },
  },
})

const AUTO: Rendering = { kind: "auto" }
const REGULATOR: Rendering = { kind: "wired", template: "regulator", anchor: { part: "U_LDO", unit: 1, roles: { in: "1", out: "5" } } }
const DIVIDER: Rendering = { kind: "wired", template: "divider", anchor: null }

const graphOf = (parts: PartSpec[], rendering: Rendering, external: string[]): BlockSubgraph =>
  subgraphOf(blockCircuit(parts, rendering, { external }), "B", symbols)

/**
 * An `auto` block no template fits: a five-pin part is not two-terminal, so `rail-row`,
 * `decoupling-bank`, `divider` and `passive-chain` each refuse on the shape, and the four
 * anchor-driven templates refuse because `auto` carries no anchor (`docs/known-gaps.md` **G141**).
 * Every refusal is `not-applicable`, which is the condition that selects ELK.
 */
const subgraphNoTemplateFits = (): BlockSubgraph =>
  graphOf([reg("NR"), cap("C_NR", "NR", "GND")], AUTO, ["VIN", "VOUT"])

/**
 * A `wired` regulator block whose NR pin sits on the IN net but on the symbol's UP side. The
 * template applies - it has its anchor, its rotation and its banks - draws, and then reports
 * geometry the IR contradicts: `regulator.ts`'s *"pin 4 is on the in net VIN but on the up
 * side"*, an `invalid-geometry`.
 */
const subgraphWhoseGeometryFails = (): BlockSubgraph =>
  graphOf([reg("VIN")], REGULATOR, ["VIN", "VOUT"])

/** The strap divider of `templates/divider.test.ts`: 3V3 down through a tap to GND. */
const dividerSubgraph = (): BlockSubgraph =>
  graphOf([res("R_TOP", "3V3", "TAP"), res("R_BOT", "TAP", "GND"), cap("C_TAP", "TAP", "GND")], DIVIDER, ["TAP"])

/**
 * A block that DECLARES the divider template and is not a divider: the T network of
 * `templates/divider.test.ts`, whose shunt hangs from a node above the last one, so `divider.ts`
 * reports *"parts to GND start from different nodes (B, A)"* - a `not-applicable`, the only kind
 * whose handling depends on the rendering variant.
 */
const subgraphDeclaringATemplateThatDoesNotApply = (): BlockSubgraph =>
  graphOf([res("R1", "3V3", "A"), res("R2", "A", "B"), res("R3", "B", "GND"), cap("C1", "A", "GND")], DIVIDER, [])

describe("selectRenderer", () => {
  test("only not-applicable selects ELK", () => {
    expect(selectRenderer(subgraphNoTemplateFits(), TEMPLATES).kind).toBe("elk")
  })

  test("a template that applied and failed REFUSES, and ELK does not rescue it", () => {
    const s = selectRenderer(subgraphWhoseGeometryFails(), TEMPLATES)
    expect(s.kind).toBe("refused")
    if (s.kind === "refused") {
      expect(s.mismatch.kind).toBe("invalid-geometry")
      expect(s.mismatch.reason).toContain("pin 4 is on the in net VIN but on the up side")
    }
  })

  test("a template that realised its subgraph is used", () => {
    const s = selectRenderer(dividerSubgraph(), TEMPLATES)
    expect(s.kind).toBe("template")
    if (s.kind === "template") {
      expect(s.template).toBe("divider")
      expect(s.layout.placements.map((p) => p.part).sort()).toEqual(["C_TAP", "R_BOT", "R_TOP"])
    }
  })

  /**
   * **A DECLARED TEMPLATE'S `not-applicable` REFUSES, AND THIS IS THE ONLY TEST HERE THAT SAYS
   * SO.** The other three pass under the unqualified rule *"all not-applicable selects ELK"*; this
   * one is what makes `selectRenderer` disagree with it. Deleting the
   * `rendering.kind === "auto"` condition turns exactly this test red, which is the perturbation
   * worth having, and the ported template tests red with it.
   *
   * The reason the rule is asymmetric is in the header: `{kind:"wired", template:"divider"}` is an
   * author asserting *this block is drawn by the divider template*, so the template declining it
   * makes the assertion false - a generation error naming the block and the template, not an
   * invitation to a general router that nothing declared.
   */
  test("a declared template that does not apply REFUSES; only an auto block falls to ELK", () => {
    const s = selectRenderer(subgraphDeclaringATemplateThatDoesNotApply(), TEMPLATES)
    expect(s.kind).toBe("refused")
    if (s.kind === "refused") {
      expect(s.mismatch.kind).toBe("not-applicable")
      expect(s.mismatch.reason).toContain("parts to GND start from different nodes")
    }
  })

  /**
   * The `bus` renderer is not this function's business and it says so rather than guessing: a bus
   * block's connectivity is drawn by `render/bus.ts`, which is Task 6b's and is not in this tree
   * (`docs/known-gaps.md` **G131**). Nothing is defaulted, because a bus block quietly handed to
   * the template set would be refused by all eight and sent to ELK - a wrong drawing, chosen by
   * accident.
   */
  test("a bus block is refused by name, not sent to a template or to ELK", () => {
    const g = graphOf([res("R_A", "X", "GND"), res("R_B", "X", "GND")], { kind: "bus", groups: [] }, [])
    expect(() => selectRenderer(g, TEMPLATES)).toThrow(/block B is rendered "bus"/)
  })
})
