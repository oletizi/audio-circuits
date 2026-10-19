import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import type { PadTerminal } from "../../tools/guide/pads.ts"
import { renderLayout } from "../../tools/guide/render.ts"
import { attr, elements } from "./svg-query.ts"

/**
 * Task 3: a pad's printed label comes from the caller, like a part's.
 *
 * **WHAT THIS FILE IS NOT.** It is not about what a label should SAY - that is
 * `tests/guide/pad-label.test.ts`'s job, over `padLabelOf`
 * (`tools/guide/pad-label.ts`). This file is about the renderer's side of the
 * interface: that `renderLayout` prints whatever the caller's `padLabels` map
 * gives it, and refuses a pad the map does not name, rather than deriving
 * anything from `pad.identity` itself.
 *
 * A board with no parts is enough for this: `GRID`, `VERTICAL_STRIPS` and
 * `CUT_STATE` are the only lines `parseBoardDump` always requires
 * (`tools/guide/dump.ts`'s own module comment), and a pad is a plain
 * `PadTerminal` value, never read off a `PART`/`PIN` line.
 */

const DUMP = parseBoardDump(["GRID 10 12", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED", ""].join("\n"))

const PAD: PadTerminal = { identity: "RV_LO_BOOST.1", ref: "RV_LO_BOOST", pin: "1", row: 2, col: 5 }

function options(padLabels: ReadonlyMap<string, string>) {
  return {
    view: "component" as const,
    title: "pad label render test",
    edgeLabels: [],
    pads: [PAD],
    padLabels,
    wireLinks: new Set<string>(),
    clusters: undefined,
  }
}

test("a pad prints the label the caller's map gives it, not its identity", () => {
  const svg = renderLayout(DUMP, new Map(), options(new Map([[PAD.identity, "LO BOOST wiper"]])))
  // THE DESCRIPTIVE LABEL IS ON THE SHEET.
  expect(svg, "the descriptive label is printed").toContain(">LO BOOST wiper<")
  // AND THE IDENTITY IS NOT - this is the asymmetry being closed. The identity
  // still keys the checkbox (`pad:RV_LO_BOOST.1`), so it legitimately appears
  // inside a `data-for` attribute; it must not appear as the PRINTED TEXT a
  // builder reads.
  expect(svg, "the bare identity is not printed as text").not.toContain(">RV_LO_BOOST.1<")
  const boxes = elements(svg, "rect", "checkbox").map((el) => attr(el, "data-for"))
  expect(boxes, "the checkbox is still keyed by the pad's identity").toEqual(["pad:RV_LO_BOOST.1"])
})

test("a pad missing from the label map refuses by name, rather than falling back to its identity", () => {
  expect(() => renderLayout(DUMP, new Map(), options(new Map()))).toThrow(/RV_LO_BOOST\.1/)
})
