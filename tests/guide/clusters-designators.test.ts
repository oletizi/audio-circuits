/**
 * THE HATCHING RESOLVES A GROUP'S PART IDS THROUGH `DESIGNATORS`, and this file
 * is the case the real boards cannot make.
 *
 * A group's `partIds` are COMPONENT IDS (`lib/board/scaffold/doc.ts`); a dump's
 * `PART` refs are REFERENCE DESIGNATORS; `DESIGNATORS` is the only place the two
 * meet (`CLAUDE.md`). `tools/guide/clusters.ts` compared the ids straight
 * against the dump until 2026-10-19 and passed every test, because
 * `designatorsFor` in `circuits/pultec/physical/parts.ts` returns the identity
 * map and all five Pultec layouts therefore carry refs that happen to equal
 * their ids. Under `CLAUDE.md`'s stated norm - semantic ids, KiCad designators,
 * which is already true of `pt2399-core` - `make check`'s own guard
 * (`tools/perfboard/scaffold-membership.ts`, which translates) would have passed
 * while `make guide` refused, naming a cause that was not the cause and
 * suggesting a `.vrt` edit as the remedy.
 *
 * **SO THIS FILE USES A NON-IDENTITY MAP ON PURPOSE.** `./fixture.ts`'s board
 * already has one - `bias_resistor` is `R1`, `input_cap` is `C1` - so the
 * vocabularies here are genuinely two, and every clause below fails if the
 * translation is removed. `./clusters-view.test.ts` keeps the mapping's
 * real-board case; what it cannot show is this one.
 */
import { test, expect } from "bun:test"
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import { clusterMarking } from "../../tools/guide/clusters.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import { renderLayout } from "../../tools/guide/render.ts"
import { wireLinkRefs } from "../../tools/guide/wire-links.ts"
import { DESIGNATORS, DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

const DUMP = parseBoardDump(DUMP_TEXT)

/** A doc whose groups name COMPONENT IDS, which is what a real one carries. */
function docNaming(groups: readonly { section: string; partIds: readonly string[] }[]): ScaffoldDoc {
  return {
    section: "test-section",
    flat: { loFrequency: "60Hz", hiFrequency: "10K", midFrequency: "1K", midMode: "boost" },
    groups,
    builds: [],
    external: [],
  }
}

const TWO_GROUPS = docNaming([
  { section: "low-cut", partIds: ["bias_resistor"] },
  { section: "hi-boost", partIds: ["input_cap"] },
])

test("the premise: this board's designators are NOT its component ids", () => {
  // Without this the whole file would be a second copy of the real-board case.
  expect(DESIGNATORS["bias_resistor"], "a semantic id with a KiCad designator").toBe("R1")
  expect(DESIGNATORS["input_cap"]).toBe("C1")
  expect(DUMP.parts.map((part) => part.ref), "and the layout is keyed by the designators").toContain("R1")
  expect(DUMP.parts.map((part) => part.ref), "never by the ids").not.toContain("bias_resistor")
})

test("a group's part ids are resolved to designators, so the marking is keyed the way the drawing is", () => {
  const marking = clusterMarking(TWO_GROUPS, DESIGNATORS, DUMP)
  if (marking === undefined) throw new Error("test: this doc declares two groups")
  expect([...marking.groupOf.entries()].sort(), "designator -> absent section").toEqual([
    ["C1", "hi-boost"],
    ["R1", "low-cut"],
  ])
  expect([...marking.groupOf.keys()], "and never the doc's own ids").not.toContain("bias_resistor")
})

test("the drawn hatch marks the designator's position, because that is what the dump places", () => {
  // ONE GROUP, ONE PART, and that is a property of this small fixture rather
  // than of the renderer: its parts sit close enough together that a second
  // patch is refused for reaching over a neighbour (`drawClusters`'s own
  // guard), which is a different subject. `./clusters-view.test.ts` draws four
  // groups on the real board.
  const marking = clusterMarking(docNaming([{ section: "low-cut", partIds: ["gain_trim"] }]), DESIGNATORS, DUMP)
  if (marking === undefined) throw new Error("test: this doc declares a group")
  const circuit = fixtureCircuit()
  const svg = renderLayout(DUMP, new Map(DUMP.parts.map((part) => [part.ref, part.ref])), {
    view: "component",
    title: "test-board - stand-in groups",
    edgeLabels: offBoardLabels(circuit),
    pads: [],
    padLabels: new Map(),
    wireLinks: wireLinkRefs(DUMP, circuit),
    clusters: marking,
  })
  const marked = [...svg.matchAll(/<rect\s[^>]*class="cluster"[^>]*data-part="([^"]*)"[^>]*>/g)].map(
    (match) => match[1] ?? "",
  )
  expect(marked, "the patch is named by the designator, not by the group's own id").toEqual(["RV1"])
})

test("an id with no DESIGNATORS entry refuses by name, rather than being looked for on the layout", () => {
  const doc = docNaming([{ section: "low-cut", partIds: ["a_part_nobody_mapped"] }])
  expect(() => clusterMarking(doc, DESIGNATORS, DUMP)).toThrow(
    /a_part_nobody_mapped, which is in no DESIGNATORS entry[\s\S]*nothing is guessed from the id/,
  )
})

test("a group part with a designator the layout does not place refuses without naming a .vrt edit", () => {
  // The id resolves, so the complaint is about the doc and the board
  // disagreeing - not about the two vocabularies. The committed layouts are
  // owner-approved, so the refusal must not send anybody to edit one.
  const doc = docNaming([{ section: "low-cut", partIds: ["drive_pot"] }])
  const absent = { ...DESIGNATORS, drive_pot: "RV9" }
  expect(() => clusterMarking(doc, absent, DUMP)).toThrow(
    /drive_pot \(RV9\)[\s\S]*holds no PART line for that designator/,
  )
  expect(() => clusterMarking(doc, absent, DUMP)).toThrow(/NOT a reason to edit the layout/)
})

test("two ids resolving to one designator refuse, naming both and the export that maps them", () => {
  const doc = docNaming([
    { section: "low-cut", partIds: ["bias_resistor"] },
    { section: "hi-boost", partIds: ["input_cap"] },
  ])
  const collided = { ...DESIGNATORS, input_cap: "R1" }
  expect(() => clusterMarking(doc, collided, DUMP)).toThrow(
    /bias_resistor and input_cap both resolve to the designator R1[\s\S]*DESIGNATORS export/,
  )
})
