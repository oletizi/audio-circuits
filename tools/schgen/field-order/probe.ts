/**
 * **DOES THE ORDER THE FIELD PLACER WALKS A BLOCK'S UNITS IN CHANGE WHAT IT DRAWS?**
 *
 *   bun run tools/schgen/field-order/probe.ts
 *
 * Hand-written for Task 6 of the 2026-10-22 text-handling research plan. It is a RESEARCH PROBE
 * and a DIAGNOSTIC: no gate calls it, nothing refuses because of it, it writes no file into the
 * repository, and it changes nothing in `lib/`.
 *
 * **WHAT QUESTION IT IS FOR.** Knuth and Plass, *Breaking Paragraphs into Lines* (1981), measure
 * the gap between deciding each item in order and optimising the whole assignment, and report it
 * as numbers rather than arguing it - 300 experiments at 300 line widths, then per-line demerit
 * tables. `lib/schgen/render/field-placement.ts` decides each UNIT in order and never reconsiders:
 * `placeFields` pushes each placed unit's two text boxes onto `placed`, which is an obstacle for
 * every later unit. **Whether that sequential dependence actually costs anything on this
 * repository's own blocks is a measurement nobody has taken**, and until it is taken, "optimise
 * the whole assignment instead" is a sentence about other people's problems.
 *
 * **THE CORPUS IS EVERY DECLARED CASE, AND ROUND 0's WAS NOT.** The first version of this probe
 * walked `PARITY_CASES` - four circuits, ten blocks - and published the result as *"every declared
 * ELK block with a grid-legal layout"*. **That corpus excludes every Pultec board**, and
 * `CLAUDE.md` is explicit that the boards in `boards/` are the proving ground and that an agent
 * arguing some output does not matter for the current boards is reasoning from the wrong end. It
 * now walks `ALL_DECLARED_CASES` through `text-metrics/step4.ts`'s `laidOutBlocks`, which is the
 * SAME population function section 5 of the research document uses, so the two sections' block
 * counts are comparable by construction rather than by coincidence - and a control below requires
 * them to agree.
 *
 * **EXHAUSTIVE WHERE IT FITS, BOUNDED AND SAID SO WHERE IT DOES NOT.** Round 0 drove 30 seeded
 * shuffles and called that "33 orders". It was far fewer: the LCG's first draw for seeds 1..30 is
 * always about 0.24, so **all thirty made the same first swap** - a two-unit block's thirty
 * shuffles were thirty copies of `reverse`. A sample whose arms are not distinct is a sample of
 * one wearing a count. So: a block with `n! <= EXHAUSTIVE_CAP` orders is driven over **every**
 * order, and the word *exhaustive* is then true rather than hopeful; a larger block is driven over
 * a **deduplicated** sample and the output prints both the number of distinct orders driven and
 * the number that exist. **Silent truncation is a recorded false-green shape here**, so the bound
 * is printed per block and never inferred.
 *
 * **IT MEASURES AND IT CHOOSES NOTHING.** There is no objective function here, no score, no
 * threshold and no verdict. A fallback count is reported per block per order; the spread is
 * reported; nothing in this file says which order is better or what count is acceptable. That is
 * an acceptance criterion for an artifact this repository's agents produce, and `CLAUDE.md`
 * forbids the producing agent from authoring one (`docs/known-gaps.md` **G240**, **G260**).
 *
 * **NOTHING IS INVENTED AND NOTHING IS REMOVED, which is the same soundness argument
 * `tools/schgen/masked-problems.ts`'s `unitSlots` makes.** Every placement, wire and anchor is the
 * one the production pipeline produced. Only the ORDER the placer walks the placements in differs,
 * so a difference in the result is a property of the walk rather than of a drawing somebody
 * invented. `unitSlots` already drives one arm of this - each unit moved to the front - and this
 * probe's P4 control cross-checks against it.
 *
 * **THE PREDICTIONS ARE PRINTED BEFORE ANYTHING IS MEASURED, in this run's own output.**
 * `docs/known-gaps.md` **G271** records why: a prediction written only into a per-task report lives
 * under `.superpowers/`, which is gitignored, so "predicted before the run" was not verifiable from
 * the committed tree. The ordering here is a property of the program.
 */

import { blockFields } from "../../../lib/schgen/render/field-placement.ts"
import { blockPowerLibs } from "../../../lib/schgen/render/power-text.ts"
import { ALL_DECLARED_CASES } from "../board-declarations.ts"
import { laidOutBlocks } from "../text-metrics/step4.ts"
import { unitSlots } from "../masked-problems.ts"
import type { BlockLayout, BlockSubgraph, Placement } from "../../../lib/schgen/render/block-types.ts"

/**
 * **THE PREDICTIONS, AS DATA, SO THE PROGRAM PRINTS THEM BEFORE IT MEASURES ANYTHING.**
 *
 * Each one is falsifiable by this run and each says what would refute it. P2 and P3 are the two
 * that could go either way and are the reason the probe exists; P1, P4, P5 and P6 are controls, and
 * a control that cannot fail is not a control, so each names the defect it would expose.
 *
 * **P1 IS A DETERMINISM CONTROL AND NOT A FIDELITY ONE, which round 0 overstated.** The `identity`
 * order is the production order copied into a new array, driven through the same function, so it
 * cannot test that this probe reaches the production path - it tests that `placeFields` is a pure
 * function of its input and that nothing in this probe's per-order bookkeeping carries state from
 * one order into the next. Fidelity to the shipped path is established by the import, not by an arm.
 */
const PREDICTIONS: readonly string[] = [
  "P1 (CONTROL, DETERMINISM - NOT FIDELITY) the identity order reproduces the production order exactly, slot and fallback status, for every unit of every block. It tests that placeFields is a pure function of its input and that this probe carries no state between orders; it CANNOT test that the probe reaches the shipped path, because both arms are the same order. REFUTED BY: any difference, which would mean one of those two things is false.",
  "P2 at least one block's fallback COUNT differs between the production order and some other order. REFUTED BY: every order of every block agreeing with production, which would mean the sequential dependence costs nothing on this corpus and the first-fit-versus-optimum-fit distinction is academic here.",
  "P3 for at least one block the MINIMUM fallback count over the driven orders is strictly below production's. REFUTED BY: production already being the order-wise minimum everywhere, which is a stronger result than P2's negation and would say the walk order is already as good as any driven.",
  "P4 (CONTROL) every unit that masked-problems.ts marks `fallsBackUnconditionally` falls back under EVERY driven order. REFUTED BY: any such unit placing clear under some order, which would mean `unitSlots`'s first-position argument is wrong and G239's Task 22 amendment rests on it.",
  "P5 (CONTROL) the placed body box of every unit is identical under every driven order. REFUTED BY: any difference, which would mean permuting the placement list moved geometry and not just the walk, so every figure here would be about a drawing nobody produced.",
  "P6 (CONTROL, CORPUS) this run's grid-legal block count equals the figure section 5 of the research document pastes for the same population function, 48. REFUTED BY: a different count, which would mean two sections of one document measure different corpora while both say 'every declared block' - which is exactly what round 0 of this probe did.",
  "P7 (CONTROL, NO SILENT TRUNCATION) every block reported EXHAUSTIVE was driven over exactly n! orders, and every block reported BOUNDED was driven over strictly fewer than n! DISTINCT orders. REFUTED BY: any block whose driven count and its bound disagree with its own label, which is the shape round 0 shipped - thirty arms that were not thirty orders.",
]

/** §5's committed figure for the same population function, which P6 compares against. */
const SECTION_5_GRID_LEGAL = 48

/**
 * Largest `n!` this probe will enumerate in full. At 5040 a seven-unit block is exhausted; an
 * eight-unit block is 40320 and is sampled instead, with its bound printed.
 */
const EXHAUSTIVE_CAP = 5040

/** How many DISTINCT orders a block too large to exhaust is driven over. */
const SAMPLE_ORDERS = 200

/**
 * `mulberry32`, seeded through its own avalanche step.
 *
 * **ROUND 0 USED A BARE LCG SEEDED WITH 1..30 AND EVERY ARM MADE THE SAME FIRST SWAP**, because a
 * linear congruential generator's first output is an affine function of its seed: for small
 * consecutive seeds the first draw barely moves. `mulberry32` mixes the counter before it is used,
 * so consecutive seeds give unrelated first draws - and the deduplication below means a collision
 * costs an order rather than silently inflating a count.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates under `mulberry32(seed)`. Returns a new array; the input is not touched. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a === undefined || b === undefined) continue
    out[i] = b
    out[j] = a
  }
  return out
}

/** `n!`, or `Infinity` once it stops being worth a number. */
function factorial(n: number): number {
  let f = 1
  for (let i = 2; i <= n; i += 1) {
    f *= i
    if (!Number.isFinite(f)) return Infinity
  }
  return f
}

/** Every permutation of `items`, by Heap's algorithm. Only called when `factorial(n) <= cap`. */
function permutations<T>(items: readonly T[]): T[][] {
  const out: T[][] = []
  const a = [...items]
  const c = new Array<number>(a.length).fill(0)
  out.push([...a])
  let i = 0
  while (i < a.length) {
    if (c[i]! < i) {
      const j = i % 2 === 0 ? 0 : c[i]!
      const x = a[i]!
      const y = a[j]!
      a[i] = y
      a[j] = x
      out.push([...a])
      c[i]! += 1
      i = 0
      continue
    }
    c[i] = 0
    i += 1
  }
  return out
}

/** A placement order, named so a report can say which one moved a unit. */
interface Order {
  readonly name: string
  readonly placements: readonly Placement[]
}

const orderKey = (ps: readonly Placement[]): string => ps.map((p) => `${p.part}#${p.unit}`).join(">")

interface OrderSet {
  readonly orders: readonly Order[]
  /** True when `orders` is every permutation of the block's placements. */
  readonly exhaustive: boolean
  /** `n!` for this block, or Infinity. */
  readonly bound: number
}

/**
 * The orders one block is driven over: all of them where that is affordable, otherwise the
 * production order, its reverse, and deduplicated shuffles until `SAMPLE_ORDERS` DISTINCT orders
 * exist or the generator stops finding new ones.
 */
function orderSetFor(placements: readonly Placement[]): OrderSet {
  const bound = factorial(placements.length)
  if (bound <= EXHAUSTIVE_CAP) {
    const all = permutations(placements)
    // Production first, so it is `orders[0]` for every block under both branches.
    const prodKey = orderKey(placements)
    const rest = all.filter((p) => orderKey(p) !== prodKey)
    return {
      orders: [
        { name: "production", placements },
        { name: "identity", placements: [...placements] },
        ...rest.map((p, i) => ({ name: `perm-${String(i + 1).padStart(5, "0")}`, placements: p })),
      ],
      exhaustive: true,
      bound,
    }
  }
  const seen = new Set<string>([orderKey(placements)])
  const orders: Order[] = [
    { name: "production", placements },
    { name: "identity", placements: [...placements] },
  ]
  const reverse = [...placements].reverse()
  if (!seen.has(orderKey(reverse))) {
    seen.add(orderKey(reverse))
    orders.push({ name: "reverse", placements: reverse })
  }
  // A generous attempt budget, so "fewer than SAMPLE_ORDERS distinct" means the space is small
  // rather than that the generator gave up early. The driven count is printed either way.
  for (let seed = 1; seen.size < SAMPLE_ORDERS && seed <= SAMPLE_ORDERS * 50; seed += 1) {
    const p = shuffled(placements, seed)
    const key = orderKey(p)
    if (seen.has(key)) continue
    seen.add(key)
    orders.push({ name: `shuffle-${String(seed).padStart(5, "0")}`, placements: p })
  }
  return { orders, exhaustive: false, bound }
}

/**
 * **WHETHER A FALLBACK IS DRAWN OVER OTHER TEXT, classified by a WHITELIST that refuses to guess.**
 *
 * `render/field-placement.ts` names every obstacle a fallback covers, and the names come from four
 * files. Classifying them by a rule like *"anything with 'text' in it"* would silently mislabel
 * `interior text 0 of U1#A` correctly and `pin name IN of U1#A` wrongly, so the prefixes are
 * enumerated and **anything matching none of them is printed as UNCLASSIFIED rather than counted as
 * not-text**. An empty UNCLASSIFIED list is then a check that could have failed; a non-empty one is
 * a defect in this list and says so.
 */
const TEXT_COVERS: readonly RegExp[] = [
  /^label /, /^value of power /, /^Reference of /, /^Value of /, /^pin name /, /^interior text /, / text$/,
]
const NON_TEXT_COVERS: readonly RegExp[] = [
  /^wire /, /^pin [^ ]+$/, /^graphic /, /^no-connect marker on /, /^power /, /^body of /, /^own body$/, /^DNP cross /,
]

/** One unit's outcome under one order, reduced to what a comparison needs. */
interface UnitOutcome {
  readonly key: string
  /** The chosen slot, as the two field anchors and the inside flag - the whole of what was decided. */
  readonly slot: string
  readonly fellBack: boolean
  /** The placed body box, which no order may move. */
  readonly body: string
}

function outcomes(g: BlockSubgraph, layout: BlockLayout, order: Order): ReadonlyMap<string, UnitOutcome> {
  const permuted: BlockLayout = { ...layout, placements: order.placements }
  const out = new Map<string, UnitOutcome>()
  for (const u of blockFields(g, permuted, blockPowerLibs(g))) {
    const f = u.fields
    out.set(u.key, {
      key: u.key,
      slot: `${f.reference.at.x},${f.reference.at.y},${f.reference.justify}|${f.value.at.x},${f.value.at.y},${f.value.justify}|inside=${u.inside}`,
      fellBack: u.fallback !== null,
      body: `${u.body.minX},${u.body.minY},${u.body.maxX},${u.body.maxY}`,
    })
  }
  return out
}

interface BlockResult {
  readonly circuit: string
  readonly block: string
  readonly units: number
  readonly driven: number
  readonly exhaustive: boolean
  readonly bound: number
  readonly production: number
  readonly lo: number
  readonly hi: number
  /** Units whose chosen slot is not the production slot under at least one order. */
  readonly slotMovers: readonly string[]
  /** Units whose fallback status is not the production status under at least one order. */
  readonly statusMovers: readonly string[]
  /** Units `unitSlots` calls unconditional. */
  readonly unconditional: readonly string[]
  /** Under the PRODUCTION order: `<unit> covers <what>` for every fallback that covers text. */
  readonly textFallbacks: readonly string[]
  /** Cover strings this probe's whitelist does not recognise. Must be empty. */
  readonly unclassified: readonly string[]
  readonly violations: readonly string[]
}

async function measure(): Promise<{ readonly results: readonly BlockResult[]; readonly skipped: readonly string[]; readonly offered: number }> {
  const { laid, skipped } = await laidOutBlocks(ALL_DECLARED_CASES)
  const results: BlockResult[] = []
  for (const l of laid) {
    const set = orderSetFor(l.layout.placements)
    const violations: string[] = []
    const slotMovers = new Set<string>()
    const statusMovers = new Set<string>()
    const counts: number[] = []

    const base = outcomes(l.g, l.layout, set.orders[0]!)
    const fellBackEverywhere = new Map<string, boolean>([...base.keys()].map((k) => [k, true]))
    for (const order of set.orders) {
      const got = order.name === "production" ? base : outcomes(l.g, l.layout, order)
      counts.push([...got.values()].filter((u) => u.fellBack).length)
      if (got.size !== base.size) violations.push(`P1/P5: order ${order.name} returned ${got.size} unit(s), production returned ${base.size}`)
      for (const [key, u] of got) {
        if (!u.fellBack) fellBackEverywhere.set(key, false)
        const b = base.get(key)
        if (b === undefined) { violations.push(`P1: order ${order.name} has unit ${key}, production does not`); continue }
        if (u.body !== b.body) violations.push(`P5: ${key} body is ${u.body} under ${order.name} and ${b.body} under production`)
        if (order.name === "identity") {
          if (u.slot !== b.slot) violations.push(`P1: ${key} slot is ${u.slot} under identity and ${b.slot} under production`)
          if (u.fellBack !== b.fellBack) violations.push(`P1: ${key} fallback is ${u.fellBack} under identity and ${b.fellBack} under production`)
          continue
        }
        if (u.slot !== b.slot) slotMovers.add(key)
        if (u.fellBack !== b.fellBack) statusMovers.add(key)
      }
    }

    // P7's control, computed rather than asserted in prose: the label and the counts must agree.
    const distinct = new Set(set.orders.map((o) => orderKey(o.placements))).size
    if (set.exhaustive && set.orders.length - 1 !== set.bound) {
      violations.push(`P7: ${l.block} is labelled EXHAUSTIVE with ${set.orders.length - 1} order(s) beside the identity copy, and its bound is ${set.bound}`)
    }
    if (!set.exhaustive && distinct >= set.bound) {
      violations.push(`P7: ${l.block} is labelled BOUNDED with ${distinct} distinct order(s) and a bound of ${set.bound}`)
    }

    const unconditional = unitSlots(l.g, l.layout).filter((u) => u.fallsBackUnconditionally).map((u) => u.key)
    for (const key of unconditional) {
      if (fellBackEverywhere.get(key) !== true) violations.push(`P4: ${key} is marked unconditional and placed CLEAR under some order`)
    }

    // **WHAT THE PRODUCTION ORDER'S FALLBACKS ARE DRAWN OVER.** Taken from `blockFields` directly
    // rather than from `outcomes`, because `FieldFallback.covers` is the placer's own list and
    // re-deriving it here would be a second opinion about the thing being measured.
    const textFallbacks: string[] = []
    const unclassified: string[] = []
    for (const u of blockFields(l.g, l.layout, blockPowerLibs(l.g))) {
      if (u.fallback === null) continue
      for (const what of u.fallback.covers) {
        if (TEXT_COVERS.some((r) => r.test(what))) { textFallbacks.push(`${u.key} covers ${what}`); continue }
        if (NON_TEXT_COVERS.some((r) => r.test(what))) continue
        unclassified.push(`${l.circuit}/${l.block} ${u.key}: ${JSON.stringify(what)}`)
      }
    }

    results.push({
      circuit: l.circuit, block: l.block, units: base.size, driven: distinct, exhaustive: set.exhaustive, bound: set.bound,
      production: counts[0] ?? 0, lo: Math.min(...counts), hi: Math.max(...counts),
      slotMovers: [...slotMovers].sort(), statusMovers: [...statusMovers].sort(),
      unconditional: [...unconditional].sort(), textFallbacks, unclassified, violations,
    })
  }
  return { results, skipped, offered: ALL_DECLARED_CASES.length }
}

async function main(): Promise<void> {
  console.log("== WHAT THIS FIELD-ORDER RUN MEASURED")
  console.log("subject: lib/schgen/render/field-placement.ts placeFields, over every declared ELK block with a grid-legal layout")
  console.log("corpus: ALL_DECLARED_CASES through text-metrics/step4.ts laidOutBlocks - the same population function section 5 uses")
  console.log(`orders: EVERY permutation where n! <= ${EXHAUSTIVE_CAP}; otherwise up to ${SAMPLE_ORDERS} DEDUPLICATED orders, with n! printed as the bound`)
  console.log("what varies: the ORDER of layout.placements. Nothing else. Geometry, wires and anchors are the pipeline's own.")
  console.log("")
  console.log("== PREDICTIONS, PRINTED BEFORE ANY MEASUREMENT")
  for (const p of PREDICTIONS) console.log(`  ${p}`)
  console.log("")

  const { results, skipped, offered } = await measure()

  console.log("== THE CORPUS")
  console.log(`declared cases offered to the probe: ${offered}; blocks with grid-legal geometry: ${results.length}`)
  for (const s of skipped) console.log(`  NOT PERMUTED HERE: ${s}`)
  console.log("")

  console.log("== PER BLOCK: FALLBACK COUNT ACROSS THE ORDERS")
  let anyCountDiffers = false
  let anyBelowProduction = false
  for (const r of results) {
    if (r.lo !== r.hi) anyCountDiffers = true
    if (r.lo < r.production) anyBelowProduction = true
    const scope = r.exhaustive ? `EXHAUSTIVE ${r.driven} of ${r.bound}` : `BOUNDED ${r.driven} of ${r.bound}`
    console.log(
      `${r.circuit}/${r.block}: ${r.units} unit(s), ${scope} order(s), production ${r.production} fallback(s), min ${r.lo} max ${r.hi}` +
        ` | slot changed for ${r.slotMovers.length}, fallback status changed for ${r.statusMovers.length}, unconditional ${r.unconditional.length}`,
    )
    if (r.statusMovers.length > 0) console.log(`    STATUS MOVERS: ${r.statusMovers.join(", ")}`)
    if (r.slotMovers.length > 0) console.log(`    SLOT MOVERS: ${r.slotMovers.join(", ")}`)
  }
  console.log("")

  console.log("== WHAT THE PRODUCTION ORDER'S FALLBACKS ARE DRAWN OVER")
  const textFallbacks = results.flatMap((r) => r.textFallbacks.map((t) => `${r.circuit}/${r.block} ${t}`))
  const unclassified = results.flatMap((r) => r.unclassified)
  console.log(`fallbacks covering at least one piece of TEXT: ${new Set(textFallbacks.map((t) => t.split(" covers ")[0])).size}`)
  for (const t of textFallbacks) console.log(`  TEXT: ${t}`)
  console.log(`cover strings this probe's whitelist does not recognise: ${unclassified.length}`)
  for (const u of unclassified) console.log(`  UNCLASSIFIED: ${u}`)
  console.log("")

  const violations = results.flatMap((r) => r.violations)
  const of = (p: string): number => violations.filter((v) => v.startsWith(p)).length
  console.log("== CONTROLS")
  console.log(`  P1 identity reproduces production (determinism, not fidelity): ${of("P1")} violation(s)`)
  console.log(`  P4 unconditional units fall back under every order: ${of("P4")} violation(s)`)
  console.log(`  P5 geometry is invariant across orders: ${of("P5")} violation(s)`)
  console.log(`  P6 grid-legal block count against section 5's committed ${SECTION_5_GRID_LEGAL}: measured ${results.length}`)
  console.log(`  P7 every EXHAUSTIVE label matches n! and every BOUNDED label is below it: ${of("P7")} violation(s)`)
  for (const v of violations) console.log(`    VIOLATION ${v}`)
  console.log("")

  console.log("== VERDICT ON EACH PREDICTION")
  console.log(`  P1 ${of("P1") === 0 ? "HELD" : "REFUTED"}`)
  console.log(`  P2 ${anyCountDiffers ? "HELD" : "REFUTED"} - at least one block's fallback count differs between orders`)
  console.log(`  P3 ${anyBelowProduction ? "HELD" : "REFUTED"} - at least one block has an order below production's count`)
  console.log(`  P4 ${of("P4") === 0 ? "HELD" : "REFUTED"}`)
  console.log(`  P5 ${of("P5") === 0 ? "HELD" : "REFUTED"}`)
  console.log(`  P6 ${results.length === SECTION_5_GRID_LEGAL ? "HELD" : "REFUTED"}`)
  console.log(`  P7 ${of("P7") === 0 ? "HELD" : "REFUTED"}`)
  console.log("")

  const prodTotal = results.reduce((s, r) => s + r.production, 0)
  const bestTotal = results.reduce((s, r) => s + r.lo, 0)
  const worstTotal = results.reduce((s, r) => s + r.hi, 0)
  const units = results.reduce((s, r) => s + r.units, 0)
  const exhaustive = results.filter((r) => r.exhaustive).length
  console.log("== SUMMARY")
  console.log(`  ${results.length} block(s) measured, ${skipped.length} not permuted; ${exhaustive} block(s) driven EXHAUSTIVELY, ${results.length - exhaustive} BOUNDED`)
  console.log(`  unit placements over the measured blocks: ${units}`)
  console.log(`  fallbacks summed over measured blocks: production ${prodTotal}, order-wise best ${bestTotal}, order-wise worst ${worstTotal}`)
  console.log(`  units whose slot moves under some order: ${results.reduce((s, r) => s + r.slotMovers.length, 0)}`)
  console.log(`  units whose fallback status moves under some order: ${results.reduce((s, r) => s + r.statusMovers.length, 0)}`)
  console.log("  NOTE: the order-wise best is a MEASUREMENT of spread and NOT a target. Nothing here says fewer fallbacks is the objective,")
  console.log("  what a fallback costs, or how many are acceptable - that is the owner's (docs/known-gaps.md G260).")
  console.log("  NOTE: the order-wise best is EXACT for a block marked EXHAUSTIVE and an UPPER BOUND on the minimum for one marked BOUNDED.")
}

await main()
