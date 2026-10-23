/**
 * EVERY OPTION THIS BACKEND EMITS IS ONE `elkjs` ACTUALLY HAS, ON AN ELEMENT IT ACTUALLY APPLIES TO.
 *
 * Hand-written for review round 2 of Task 12 (Important 3) of the M1 schematic-authoring plan.
 *
 * **WHY IT EXISTS, measured.** `[RAN]` `elkjs` **silently ignores an option it does not recognise -
 * key or value - with no raise and no warning.** On one probe graph, `no constraint`,
 * `FIRST_SEPARATE`, `FIRST`, a value of `"NOT_AN_ELK_VALUE"` and a misspelt key
 * (`…layerConstraintt`) all produced **byte-identical geometry**, and only `LAST_SEPARATE` moved
 * it: six arms, **two distinct geometries**. So a typo in any option string this backend emits is
 * invisible - the drawing simply differs - and **the generation manifest (spec §2.1) and the
 * readability baseline (spec §3.3) would both certify the wrong thing as the right thing.** That
 * is *"a skipped check must never look like a passing one"* pointed at the options layer, and
 * nothing checked it until this file. `docs/known-gaps.md` **G187**.
 *
 * **THE VOCABULARY IS NOT HARD-CODED HERE.** The option keys are collected from a REAL block's
 * graph, so an option `lib/schgen/elk/graph.ts` starts emitting is checked without anyone adding
 * it to a list, and a list that went stale cannot hide one.
 *
 * **ONE HALF OF THE REVIEW'S MECHANISM IS NOT AVAILABLE, and that is recorded rather than
 * quietly dropped.** It asked for *"every value in its declared enum"*.
 * `ElkLayoutOptionDescription` carries `id`, `name`, `description`, `group`, `type` and `targets`
 * and **no choices**, so `knownLayoutOptions()` cannot be asked what an `ENUM`'s legal values are.
 * What is checkable - and checked below - is the id, the element kind, the algorithm, and that a
 * numeric-typed option carries a number. **G187** holds the residue and its criterion.
 */

import { beforeAll, expect, test } from "bun:test"
import ELK from "elkjs/lib/elk-api.js"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { BLOCK_OPTIONS, wholeGridSteps } from "../../../lib/schgen/elk/options.ts"
import { dividerSubgraph, inboundAndOutboundBlock } from "./fixtures.ts"
import type { ElkLayoutAlgorithmDescription, ElkLayoutOptionDescription, ElkNode } from "elkjs/lib/elk-api.js"

/**
 * `elkjs` accepts `elk.<rest>` as shorthand and reports the full id. Measured: all 224 ids
 * `knownLayoutOptions()` returns begin `org.eclipse.elk`, and **not one of the eight keys this
 * backend emits is found by a literal lookup** - the review's mechanism as written would have
 * failed on every key. This is the expansion that makes it work, and it is the only translation.
 */
const FULL_ID = (key: string): string => key.replace(/^elk\./, "org.eclipse.elk.")

/** Where an option was found, in `targets`' vocabulary. */
type Where = "PARENTS" | "NODES" | "PORTS"

interface Emitted {
  readonly key: string
  readonly value: string
  readonly where: Where
  /** For a refusal that names the thing carrying it. */
  readonly on: string
}

/** Every option key and value the graph carries, with the element kind it sits on. */
function emittedOptions(graph: ElkNode): Emitted[] {
  const out: Emitted[] = []
  const take = (opts: Readonly<Record<string, string>> | undefined, where: Where, on: string): void => {
    for (const [key, value] of Object.entries(opts ?? {})) out.push({ key, value, where, on })
  }
  take(graph.layoutOptions, "PARENTS", `root graph ${graph.id}`)
  for (const node of graph.children ?? []) {
    take(node.layoutOptions, "NODES", `node ${node.id}`)
    for (const port of node.ports ?? []) take(port.layoutOptions, "PORTS", `port ${port.id}`)
  }
  return out
}

let known: readonly ElkLayoutOptionDescription[] = []
let algorithms: readonly ElkLayoutAlgorithmDescription[] = []
let emitted: readonly Emitted[] = []

beforeAll(async () => {
  const elk = new ELK({
    workerUrl: import.meta.resolve("elkjs/lib/elk-worker.min.js"),
    workerFactory: (url?: string) => new Worker(url ?? import.meta.resolve("elkjs/lib/elk-worker.min.js")),
  })
  try {
    known = await elk.knownLayoutOptions()
    algorithms = await elk.knownLayoutAlgorithms()
  } finally {
    elk.terminateWorker()
  }
  // Two blocks, because the inbound layer constraint appears on neither of them alone: a divider
  // has only rail boundaries, and `inboundAndOutboundBlock` is the only fixture with a non-rail one.
  emitted = [
    ...emittedOptions(elkInputOf(dividerSubgraph()).graph),
    ...emittedOptions(elkInputOf(inboundAndOutboundBlock()).graph),
  ]
}, 120_000)

test("elkjs reports a non-empty option vocabulary, so the checks below are not over nothing", () => {
  expect(known.length).toBeGreaterThan(100)
  expect(algorithms.length).toBeGreaterThan(0)
  expect(emitted.length).toBeGreaterThan(0)
})

test("the emitted set is exactly the fifteen option keys this backend declares", () => {
  // If graph.ts starts emitting a sixteenth, this fails and the checks below then cover it too.
  // It went from eight to fifteen in round 3, when the seven options ELK had been left to default
  // were set at whole grid steps (docs/known-gaps.md G188).
  expect([...new Set(emitted.map((e) => e.key))].sort()).toEqual([
    "elk.algorithm",
    "elk.direction",
    "elk.edgeRouting",
    "elk.layered.layering.layerConstraint",
    "elk.layered.spacing.edgeEdgeBetweenLayers",
    "elk.layered.spacing.edgeNodeBetweenLayers",
    "elk.layered.spacing.nodeNodeBetweenLayers",
    "elk.padding",
    "elk.port.side",
    "elk.portConstraints",
    "elk.spacing.edgeEdge",
    "elk.spacing.edgeNode",
    "elk.spacing.nodeNode",
    "elk.spacing.nodeSelfLoop",
    "elk.spacing.portPort",
  ])
})

test("every emitted option key is one elkjs actually has", () => {
  const ids = new Set(known.flatMap((o) => (o.id === undefined ? [] : [o.id])))
  const unknown = [...new Set(emitted.filter((e) => !ids.has(FULL_ID(e.key))).map((e) => `${e.key} (on ${e.on})`))].sort()
  expect(
    unknown,
    "elkjs ignores an option id it does not recognise, with no raise and no warning, so a typo " +
      "here changes the drawing and nothing else - see docs/known-gaps.md G187",
  ).toEqual([])
})

test("every emitted option sits on an element kind elkjs applies it to", () => {
  const byId = new Map(known.flatMap((o) => (o.id === undefined ? [] : [[o.id, o] as const])))
  const misplaced: string[] = []
  for (const e of emitted) {
    const described = byId.get(FULL_ID(e.key))
    if (described === undefined) continue // the test above owns that failure
    const targets = described.targets ?? []
    if (!targets.some((t) => t === e.where)) {
      misplaced.push(`${e.key} is on ${e.on} (${e.where}) and elkjs targets it at ${targets.join("/") || "nothing"}`)
    }
  }
  expect(
    misplaced,
    "an option on the wrong kind of element is ignored exactly as silently as a misspelt one",
  ).toEqual([])
})

test("the algorithm named is one elkjs has", () => {
  const value = BLOCK_OPTIONS["elk.algorithm"]
  expect(value).toBeDefined()
  const ids = new Set(algorithms.flatMap((a) => (a.id === undefined ? [] : [a.id])))
  expect([...ids], `elk.algorithm is "${String(value)}"`).toContain(FULL_ID(`elk.${String(value)}`))
})

test("every numeric-typed option carries a finite number", () => {
  const byId = new Map(known.flatMap((o) => (o.id === undefined ? [] : [[o.id, o] as const])))
  const NUMERIC = ["DOUBLE", "INT", "FLOAT"]
  let checked = 0
  for (const e of emitted) {
    const type = byId.get(FULL_ID(e.key))?.type
    if (type === undefined || !NUMERIC.some((n) => n === type)) continue
    checked += 1
    expect(Number.isFinite(Number(e.value)), `${e.key} = "${e.value}" on ${e.on} (${type})`).toBe(true)
  }
  // Both spacings are DOUBLE, on two graphs: a run that checked nothing would pass the loop.
  expect(checked).toBeGreaterThanOrEqual(4)
})

test("a misspelt key is NOT in the vocabulary, so the check above can fail", () => {
  const ids = new Set(known.flatMap((o) => (o.id === undefined ? [] : [o.id])))
  expect(ids.has(FULL_ID("elk.layered.layering.layerConstraint"))).toBe(true)
  expect(ids.has(FULL_ID("elk.layered.layering.layerConstraintt"))).toBe(false)
  expect(ids.has(FULL_ID("elk.algorith"))).toBe(false)
})

test("knownLayoutOptions exposes no enum choices, which is why G187's value half is open", () => {
  const side = known.find((o) => o.id === FULL_ID("elk.port.side"))
  expect(side?.type, "if this stops being ENUM the residue has changed shape").toBe("ENUM")
  // The fields elkjs's own type declares, and `choices` is not among them.
  expect(Object.keys(side ?? {}).some((k) => k.toLowerCase().includes("choice"))).toBe(false)
  expect(Object.keys(side ?? {}).some((k) => k.toLowerCase().includes("value"))).toBe(false)
})

/**
 * **EVERY SPACING AND THE PADDING THIS BACKEND SENDS IS A WHOLE NUMBER OF GRID STEPS, AND THE SET
 * IT SENDS IS PINNED.**
 *
 * **THIS TEST REPLACES ONE THAT ASSERTED THE OPPOSITE, AND THE REPLACEMENT IS THE POINT.** Round 2
 * pinned four spacing options as **unset**, as a tripwire over `docs/known-gaps.md` **G188** - *"it
 * goes RED if someone sets one without updating this list"*. Round 3 set them, under an explicit
 * controller sanction, so **the tripwire did its job and is now spent**: what it guarded against
 * was an undeclared change, not the change itself.
 *
 * What it guards now is the other direction. ELK's defaults are bare numbers in the geometry's
 * unit - micrometres here - so **an option left unset is an option at roughly 10 µm**, which is
 * 0.8% of a grid step and is what produced the sub-grid jogs G188 measures. So:
 *
 * - every spacing-or-padding value this backend sends is a **whole number of grid steps**, which is
 *   spec §1.4's criterion stated as an assertion rather than as prose;
 * - the SET it sends is pinned, so adding or dropping one is a deliberate edit;
 * - `elk.spacing.nodeSelfLoop` is asserted present **by name**, because it is the one option whose
 *   absence a reader would never guess at: a net with two terminals on one unit becomes a
 *   self-loop, and `layered` routes those with that option alone. Measured: 11 self-loops across 10
 *   of 12 blocks, and dropping this option takes sub-grid segments from 0 back to 9.
 */
test("every spacing and padding this backend sends is a whole number of grid steps", () => {
  const spacingIds = known.flatMap((o) => (o.id !== undefined && /\.(spacing|padding)/.test(o.id) ? [o.id] : []))
  expect(spacingIds.length, "elkjs must report a spacing vocabulary, or the subtraction is over nothing").toBeGreaterThan(5)
  const sent = Object.keys(BLOCK_OPTIONS).filter((k) => /\.(spacing|padding)/.test(k))
  expect(sent.sort()).toEqual([
    "elk.layered.spacing.edgeEdgeBetweenLayers",
    "elk.layered.spacing.edgeNodeBetweenLayers",
    "elk.layered.spacing.nodeNodeBetweenLayers",
    "elk.padding",
    "elk.spacing.edgeEdge",
    "elk.spacing.edgeNode",
    "elk.spacing.nodeNode",
    "elk.spacing.nodeSelfLoop",
    "elk.spacing.portPort",
  ])
  // The one whose absence nobody would guess at, named so it cannot be dropped silently.
  expect(Object.keys(BLOCK_OPTIONS)).toContain("elk.spacing.nodeSelfLoop")
  // Every one is a known option id, and every VALUE is a whole number of grid steps.
  let checked = 0
  for (const key of sent) {
    expect(known.some((o) => o.id === FULL_ID(key)), `${key} must be a known option id`).toBe(true)
    const value = BLOCK_OPTIONS[key] ?? ""
    const numbers = [...value.matchAll(/\d+/g)].map((m) => Number(m[0]))
    expect(numbers.length, `${key} = "${value}" must carry a number`).toBeGreaterThan(0)
    for (const n of numbers) {
      checked += 1
      expect(wholeGridSteps(n), `${key} = "${value}": ${n} is not a whole number of grid steps`).toBe(true)
    }
  }
  // `elk.padding` carries four numbers and the other eight one each: a run that checked nothing
  // would pass every loop above.
  expect(checked).toBe(12)
})
