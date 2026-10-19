/**
 * Task 6: the packet's fourth layout image says which stand-in group each
 * part belongs to, by a hatch fill, so a builder can see the clusters at a
 * glance before deciding which of them to populate.
 *
 * **THIS FILE ASSERTS THE MAPPING, NOT THE PRESENCE OF FOUR HATCHES.** A view
 * that defined four hatches and applied one of them to the wrong part would
 * pass every presence check and be worse than no image at all: the five
 * Pultec layouts are frozen and owner-approved, so a builder who finds the
 * diagram and the board disagreeing has no reason to suspect the diagram. So
 * each clause below pins one part to one group - first on the component
 * identities, before anything is drawn, then on the emitted SVG, then against
 * the checklist's own `Fit` column.
 *
 * **THE HATCH GEOMETRIES THEMSELVES ARE NOT ASSERTED AND MUST NOT BE.** Which
 * hatch a group gets is `tools/guide/hatch.ts`'s, and a test that spelled out
 * "45 degree lines at 5 units" would make this file the acceptance criteria for
 * an artifact an agent produced - the one thing `CLAUDE.md` forbids outright.
 * **That the owner has since ratified those fills (2026-10-18, *"the hatching
 * looks good."*) does not license asserting them here**, and the reason is the
 * same one: his ruling is the criterion, this file is not, and a test pinned to
 * a geometry would silently become the thing a later change is measured
 * against. What is asserted is that the assignment is a
 * BIJECTION onto whatever styles that file holds, and that the legend names
 * the same hatch the parts carry. Change the fills there and this file still
 * passes; mis-map one part and it fails.
 *
 * WHY THE REAL BOARD. The premise - which parts of `pultec-low-boost` stand in
 * for which absent section - is a fact about that board's `ScaffoldDoc`, read
 * through the real pinned veroroute binary and the real pipeline, the shape
 * `./fit-condition.test.ts` and `./zero-ohm-is-a-wire-link.test.ts` use.
 * Nothing here is a fixture and no expected set is written down by hand.
 */
import { test, expect } from "bun:test"
import { clusterMarking, hatchFor, UNHATCHED_MEANS, type ClusterMarking } from "../../tools/guide/clusters.ts"
import { componentAt, type BoardCircuit } from "../../tools/guide/circuit.ts"
import { HATCH_STYLES } from "../../tools/guide/hatch.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import { renderLayout } from "../../tools/guide/render.ts"
import { escapeXml } from "../../tools/guide/svg.ts"
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
import { wireLinkRefs } from "../../tools/guide/wire-links.ts"
import { FIT_SECTION_TITLES, loadBoard, sectionsNamed } from "./board-pipeline.ts"
import { attr, num } from "./svg-query.ts"

interface View {
  readonly scaffold: ScaffoldDoc
  readonly circuit: BoardCircuit
  /** Every stand-in part id, with the absent section it stands in for - from the doc. */
  readonly sectionOf: ReadonlyMap<string, string>
  readonly marking: ClusterMarking
  /** The stand-in-groups image. */
  readonly clusters: string
  /** The designators image, which is the same drawing WITHOUT the hatching. */
  readonly designators: string
  /** Every placed part's ref. */
  readonly placed: readonly string[]
  readonly zeroOhm: readonly string[]
  readonly fitOf: ReadonlyMap<string, string>
}

async function view(boardName: string): Promise<View> {
  const { dump, pads, circuit, checklist } = await loadBoard(boardName)
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error(`test: ${boardName} declares SCAFFOLD; the guide did not load it`)
  const marking = clusterMarking(scaffold, dump)
  if (marking === undefined) throw new Error(`test: ${boardName} declares groups; clusterMarking produced none`)
  const sectionOf = new Map<string, string>()
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) sectionOf.set(partId, group.section)
  }
  const labels = new Map(dump.parts.map((part) => [part.ref, part.ref]))
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const common = {
    view: "component" as const,
    edgeLabels: offBoardLabels(circuit),
    pads,
    padLabels,
    wireLinks: wireLinkRefs(dump, circuit),
  }
  // The Fit cell of every row that has one, keyed by the row's part - the
  // checklist's own answer, not a recomputation of it.
  const fitOf = new Map<string, string>()
  for (const section of sectionsNamed(checklist, FIT_SECTION_TITLES)) {
    for (const row of section.rows) {
      const ref = row[0]
      const fit = row[row.length - 1]
      if (ref === undefined || fit === undefined) throw new Error(`test: a ${section.title} row is malformed`)
      fitOf.set(ref, fit)
    }
  }
  return {
    scaffold,
    circuit,
    sectionOf,
    marking,
    clusters: renderLayout(dump, labels, { ...common, title: `${boardName} - groups`, clusters: marking }),
    designators: renderLayout(dump, labels, { ...common, title: `${boardName} - designators`, clusters: undefined }),
    placed: dump.parts.filter((part) => part.placement !== "floating").map((part) => part.ref),
    zeroOhm: dump.parts
      .filter((part) => isZeroOhmResistor(componentAt(circuit, part.ref)))
      .map((part) => part.ref)
      .sort(),
    fitOf,
  }
}

/** Every hatch patch in the image: which part it marks, which group, and which fill it carries. */
function patches(svg: string): readonly { readonly part: string; readonly group: string; readonly fill: string }[] {
  return [...svg.matchAll(/<rect\s[^>]*class="cluster"[^>]*>/g)].map((match) => ({
    part: attr(match[0], "data-part"),
    group: attr(match[0], "data-group"),
    fill: attr(match[0], "fill"),
  }))
}

/** The board outline's box, from the drawing itself. */
function boardBox(svg: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const rect = [...svg.matchAll(/<rect\s[^>]*class="board"[^>]*>/g)][0]
  if (rect === undefined) throw new Error("test: the drawing has no board outline")
  const x = num(rect[0], "x")
  const y = num(rect[0], "y")
  return { minX: x, minY: y, maxX: x + num(rect[0], "width"), maxY: y + num(rect[0], "height") }
}

/**
 * Every piece of text whose anchor sits inside the board outline, sorted.
 *
 * **THE CLAUSE BEING CHECKED IS "NO NEW TEXT INSIDE THE OUTLINE", AND IT IS
 * CHECKED BY COMPARISON RATHER THAN BY COUNTING TO ZERO.** The component view
 * already prints a part's designator on or beside its body, so a literal "no
 * text inside the outline" would fail on the image this one is derived from.
 * What G2 (pad labels crowd their row) and G17 (a long label runs off the
 * outline) make costly is a THIRD per-part string, so the assertion is that
 * this image's text inside the outline is exactly the designators image's.
 */
function textInside(svg: string): readonly string[] {
  const board = boardBox(svg)
  return [...svg.matchAll(/<text\s[^>]*>([^<]*)<\/text>/g)]
    .filter((match) => {
      const x = num(match[0], "x")
      const y = num(match[0], "y")
      return x >= board.minX && x <= board.maxX && y >= board.minY && y <= board.maxY
    })
    .map((match) => match[1] ?? "")
    .sort()
}

test("the premise: low-boost's four groups hold eight stand-in parts, all of them placed on the board", async () => {
  const { scaffold, sectionOf, placed } = await view("pultec-low-boost")
  expect(scaffold.groups.length, "a group for each of the other four sections").toBe(4)
  expect(sectionOf.size, "eight stand-in parts, each named once").toBe(8)
  for (const partId of sectionOf.keys()) {
    expect(placed, `${partId} is a placed part on the board`).toContain(partId)
  }
  // The premise that makes "no own-circuit part is hatched" worth asserting:
  // this board carries parts that are NOT stand-ins.
  expect(placed.length, "the board carries more parts than its stand-ins").toBeGreaterThan(8)
})

test("the marking maps each stand-in part to its own declared group, and names no other part", async () => {
  const { sectionOf, marking } = await view("pultec-low-boost")
  // ON THE COMPONENT IDENTITIES, BEFORE ANYTHING IS DRAWN: the mapping is
  // wrong or right here, and the SVG clauses below only check that the
  // drawing carries this answer faithfully.
  expect([...marking.groupOf.entries()].sort(), "part -> its declared absent section").toEqual(
    [...sectionOf.entries()].sort(),
  )
  expect([...marking.groups].sort(), "the groups, in the doc's own vocabulary").toEqual(
    [...new Set(sectionOf.values())].sort(),
  )
  // A BIJECTION ONTO THE STYLES, whatever those styles are: four groups, four
  // distinct hatches, no two groups sharing one.
  const fills = marking.groups.map((group) => hatchFor(marking, group).id)
  expect(new Set(fills).size, "each group gets a hatch of its own").toBe(marking.groups.length)
  expect(marking.groups.length, "no more groups than tools/guide/hatch.ts holds styles").toBeLessThanOrEqual(
    HATCH_STYLES.length,
  )
})

test("every stand-in part is hatched exactly once, with its own group's hatch, and nothing else is hatched", async () => {
  const { sectionOf, marking, clusters } = await view("pultec-low-boost")
  const drawn = patches(clusters)
  expect(drawn.map((patch) => patch.part).sort(), "one patch per stand-in part, and no other").toEqual(
    [...sectionOf.keys()].sort(),
  )
  for (const patch of drawn) {
    const section = sectionOf.get(patch.part)
    if (section === undefined) throw new Error(`${patch.part} is hatched and is in no declared group`)
    expect(patch.group, `${patch.part}'s patch names its own absent section`).toBe(section)
    expect(patch.fill, `${patch.part} carries the ${section} group's hatch`).toBe(
      `url(#${hatchFor(marking, section).id})`,
    )
  }
  // The pattern each group's parts point at is really defined in the document:
  // a fill naming a pattern that is not there draws nothing at all.
  for (const group of marking.groups) {
    expect(clusters, `the ${group} group's hatch is defined in the drawing`).toContain(
      `<pattern id="${hatchFor(marking, group).id}"`,
    )
  }
})

test("the three layout images that are not the groups image carry no hatching at all", async () => {
  const { designators } = await view("pultec-low-boost")
  expect(patches(designators), "the designators image hatches nothing").toEqual([])
  expect(designators, "and defines no hatch pattern").not.toContain("<pattern")
})

test("the legend names each group beside the hatch its parts carry, and says what no hatch means", async () => {
  const { marking, clusters } = await view("pultec-low-boost")
  const swatches = [...clusters.matchAll(/<rect\s[^>]*class="cluster-swatch"[^>]*>/g)].map((match) => match[0])
  expect(swatches.length, "one legend swatch per group").toBe(marking.groups.length)
  for (const group of marking.groups) {
    const swatch = swatches.find((candidate) => attr(candidate, "data-group") === group)
    if (swatch === undefined) throw new Error(`the legend does not name the ${group} group`)
    // THE LEGEND AND THE PARTS MUST POINT AT ONE PATTERN. A legend that showed
    // the hi-cut group's hatch beside the word "hi-boost" is the
    // misidentification this whole file exists to refuse, one level up.
    expect(attr(swatch, "fill"), `the ${group} swatch carries the ${group} group's hatch`).toBe(
      `url(#${hatchFor(marking, group).id})`,
    )
    expect(clusters, `the legend prints the ${group} group's name`).toContain(group)
  }
  // WITHOUT THIS SENTENCE THE ABSENCE OF A HATCH HAS NO STATED MEANING, which
  // matters exactly when a hatch comes out faint on a bad photocopy. Escaped,
  // because it is drawn as SVG text and carries an apostrophe.
  expect(clusters, "the legend says what an unhatched part is").toContain(escapeXml(UNHATCHED_MEANS))
})

test("every hatched part is a conditional row in the checklist, and every conditional row is hatched", async () => {
  const { clusters, fitOf, sectionOf } = await view("pultec-low-boost")
  const hatched = new Set(patches(clusters).map((patch) => patch.part))
  for (const ref of hatched) {
    const fit = fitOf.get(ref)
    const section = sectionOf.get(ref)
    if (fit === undefined) throw new Error(`${ref} is hatched and has no Fit cell in the checklist`)
    expect(fit, `${ref}'s Fit cell names its group`).toBe(`only with the ${section} group`)
  }
  // AND THE OTHER DIRECTION, which is the one a presence check cannot make: a
  // row the table calls conditional and the picture leaves unmarked sends a
  // builder looking for a cluster that is not drawn.
  for (const [ref, fit] of fitOf) {
    if (fit === "always") continue
    expect(hatched.has(ref), `${ref}'s Fit cell reads "${fit}", so the picture must hatch it`).toBe(true)
  }
})

test("a stand-in that is a wire link is hatched too, and is still drawn as a wire rather than a part", async () => {
  const { clusters, designators, zeroOhm, sectionOf } = await view("pultec-low-boost")
  // THE PREMISE: some of this board's stand-ins resolve to 0 Ω, so they have
  // no body for a hatch to fill. If that stopped being true this test would
  // pass by having nothing to check.
  expect(zeroOhm.length, "low-boost carries zero-ohm stand-ins").toBeGreaterThan(0)
  const hatched = new Set(patches(clusters).map((patch) => patch.part))
  for (const ref of zeroOhm) {
    expect(sectionOf.has(ref), `${ref} is a stand-in`).toBe(true)
    expect(hatched.has(ref), `${ref} is hatched although it has no body`).toBe(true)
    const wires = [...clusters.matchAll(/<line\s[^>]*class="wire"[^>]*>/g)]
      .map((match) => match[0])
      .filter((element) => element.includes(`data-ref="${ref}"`))
    expect(wires.length, `${ref} is still drawn as one wire`).toBe(1)
  }
  // Nothing about the parts drawing moved: the hatching is an overlay on the
  // same picture, not a second way of drawing the board.
  const bodies = (svg: string): number => (svg.match(/class="part-body"/g) ?? []).length
  expect(bodies(clusters), "the groups image draws the same part bodies as the designators image").toBe(
    bodies(designators),
  )
})

test("the groups image adds no text inside the board outline", async () => {
  const { clusters, designators, marking } = await view("pultec-low-boost")
  expect(textInside(clusters), "the same text inside the outline as the designators image").toEqual(
    textInside(designators),
  )
  for (const group of marking.groups) {
    const named = textInside(clusters).filter((content) => content.includes(group))
    expect(named, `the ${group} group is named in the legend, never inside the board outline`).toEqual([])
  }
})

test("the mapping holds on a second real board, whose groups are a different set", async () => {
  const { sectionOf, marking, clusters, fitOf } = await view("pultec-low-cut")
  // A DIFFERENT SET, which is what makes this a second case rather than a
  // repeat: low-cut stands in for low-boost, and low-boost stands in for
  // low-cut.
  expect([...marking.groups].sort(), "low-cut carries a low-boost group and not a low-cut one").toContain("low-boost")
  const drawn = patches(clusters)
  expect(drawn.map((patch) => patch.part).sort()).toEqual([...sectionOf.keys()].sort())
  for (const patch of drawn) {
    const section = sectionOf.get(patch.part)
    if (section === undefined) throw new Error(`${patch.part} is hatched and is in no declared group`)
    expect(patch.group, `${patch.part}'s group`).toBe(section)
    expect(fitOf.get(patch.part), `${patch.part}'s Fit cell`).toBe(`only with the ${patch.group} group`)
  }
})

test("a board that declares no stand-in groups gets no marking at all", async () => {
  const { dump, circuit } = await loadBoard("pt2399-core")
  expect(circuit.scaffold, "pt2399-core is not a Pultec section").toBeUndefined()
  expect(clusterMarking(circuit.scaffold, dump), "no scaffold, no groups image").toBeUndefined()
})

test("the copper view refuses a marking rather than printing an unhatched sheet", async () => {
  // THE COPPER VIEW DRAWS NO PARTS AT ALL, so a marking there has nothing to
  // mark. It refuses, because an unhatched copper sheet is indistinguishable
  // from a board with no groups - the silence this image exists to end.
  const { dump, pads, circuit } = await loadBoard("pultec-low-boost")
  const marking = clusterMarking(circuit.scaffold, dump)
  if (marking === undefined) throw new Error("test: low-boost declares groups")
  expect(() =>
    renderLayout(dump, new Map(dump.parts.map((part) => [part.ref, part.ref])), {
      view: "copper",
      title: "low-boost - copper",
      edgeLabels: offBoardLabels(circuit),
      pads,
      padLabels: new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)])),
      wireLinks: wireLinkRefs(dump, circuit),
      clusters: marking,
    }),
  ).toThrow(/copper/)
})
