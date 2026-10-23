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
 * **IT MEASURES AND IT CHOOSES NOTHING.** There is no objective function here, no score, no
 * threshold and no verdict. A fallback count is reported per block per arm; the spread across arms
 * is reported; nothing in this file says which arm is better or what count is acceptable. That is
 * an acceptance criterion for an artifact this repository's agents produce, and
 * `CLAUDE.md` forbids the producing agent from authoring one (`docs/known-gaps.md` **G240**,
 * **G260**).
 *
 * **NOTHING IS INVENTED AND NOTHING IS REMOVED, which is the same soundness argument
 * `tools/schgen/masked-problems.ts`'s `unitSlots` makes.** Every placement, wire and anchor is the
 * one the production pipeline produced. Only the ORDER the placer walks the placements in differs,
 * so a difference in the result is a property of the walk rather than of a drawing somebody
 * invented. `unitSlots` already drives one arm of this - each unit moved to the front - and this
 * probe's third control cross-checks against it.
 *
 * **THE PREDICTIONS ARE PRINTED BEFORE ANYTHING IS MEASURED, in this run's own output.**
 * `docs/known-gaps.md` **G271** records why: a prediction written only into a per-task report lives
 * under `.superpowers/`, which is gitignored, so "predicted before the run" was not verifiable from
 * the committed tree. The ordering here is a property of the program.
 */

import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { adaptElkLayoutReported } from "../../../lib/schgen/elk/adapt.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { blockFields } from "../../../lib/schgen/render/field-placement.ts"
import { blockPowerLibs } from "../../../lib/schgen/render/power-text.ts"
import { elkPrePass } from "../elk/layout.ts"
import { PARITY_CASES, parityResolver } from "../authoring-census.ts"
import { unitSlots } from "../masked-problems.ts"
import type { BlockLayout, BlockSubgraph, Placement } from "../../../lib/schgen/render/block-types.ts"

/**
 * **THE PREDICTIONS, AS DATA, SO THE PROGRAM PRINTS THEM BEFORE IT MEASURES ANYTHING.**
 *
 * Each one is falsifiable by this run and each says what would refute it. P2 and P3 are the two
 * that could have gone either way and are the reason the probe exists; P1, P4 and P5 are controls
 * whose expected answer is "no difference", and a control that cannot fail is not a control, so
 * each names the defect it would expose.
 */
const PREDICTIONS: readonly string[] = [
  "P1 (CONTROL) the identity arm reproduces production exactly - same slot and same fallback status for every unit of every block. REFUTED BY: any difference, which would mean this probe's plumbing is not the production path and nothing below is about the shipped placer.",
  "P2 at least one block's fallback COUNT differs between production order and some other arm. REFUTED BY: every arm of every block agreeing with production, which would mean the sequential dependence costs nothing here and the first-fit/total-fit distinction is academic for this corpus.",
  "P3 for at least one block the MINIMUM fallback count over the arms is strictly below production's. REFUTED BY: production already being the arm-wise minimum everywhere, which is a stronger result than P2's negation and would say the walk order is already as good as any of these.",
  "P4 (CONTROL) every unit that masked-problems.ts marks `fallsBackUnconditionally` falls back in EVERY arm. REFUTED BY: any such unit placing clear under some permutation, which would mean `unitSlots`'s first-position argument is wrong and G239's Task 22 amendment rests on it.",
  "P5 (CONTROL) the placed body box of every unit is identical across every arm. REFUTED BY: any difference, which would mean permuting the placement list moved geometry and not just the walk, so every figure here would be about a drawing nobody produced.",
]

/** A deterministic 32-bit LCG, so every arm below is reproducible from its seed alone. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Fisher-Yates under `lcg(seed)`. Returns a new array; the input is not touched. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const rand = lcg(seed)
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

/** How many seeded shuffle arms each block gets, beside `production` and `reverse`. */
const SHUFFLES = 30

interface Arm {
  readonly name: string
  readonly order: (placements: readonly Placement[]) => readonly Placement[]
}

function arms(): readonly Arm[] {
  const seeded: Arm[] = []
  for (let i = 1; i <= SHUFFLES; i += 1) seeded.push({ name: `shuffle-${String(i).padStart(2, "0")}`, order: (p) => shuffled(p, i) })
  return [
    { name: "production", order: (p) => p },
    { name: "identity", order: (p) => [...p] },
    { name: "reverse", order: (p) => [...p].reverse() },
    ...seeded,
  ]
}

/** One unit's outcome under one arm, reduced to what a comparison needs. */
interface UnitOutcome {
  readonly key: string
  /** The chosen slot, as the two field anchors and the inside flag - the whole of what was decided. */
  readonly slot: string
  readonly fellBack: boolean
  /** The placed body box, which no arm may move. */
  readonly body: string
}

function outcomes(g: BlockSubgraph, layout: BlockLayout, arm: Arm): ReadonlyMap<string, UnitOutcome> {
  const permuted: BlockLayout = { ...layout, placements: arm.order(layout.placements) }
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
  /** Fallback count per arm, arm name to count. */
  readonly counts: ReadonlyMap<string, number>
  /** Units whose chosen slot is not the production slot under at least one arm. */
  readonly slotMovers: readonly string[]
  /** Units whose fallback status is not the production status under at least one arm. */
  readonly statusMovers: readonly string[]
  /** Units `unitSlots` calls unconditional. */
  readonly unconditional: readonly string[]
  readonly violations: readonly string[]
}

async function measure(): Promise<readonly BlockResult[]> {
  const symbols = parityResolver()
  const all = arms()
  const results: BlockResult[] = []
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const pre = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const outcome = pre.get(block.id)
      if (outcome === undefined || !outcome.ok) continue
      const layout = adaptElkLayoutReported(g, outcome).checked
      // A block with no grid-legal layout has no placements to permute. It is NOT silently
      // dropped: the summary prints how many were skipped and why, because a block missing from a
      // census reads as a block with nothing behind it.
      if (layout === null) {
        results.push({
          circuit: c.name, block: block.id, units: 0, counts: new Map(), slotMovers: [], statusMovers: [],
          unconditional: [], violations: ["NO LAYOUT: refused before a grid-legal geometry existed, so there is nothing to permute"],
        })
        continue
      }
      const byArm = new Map<string, ReadonlyMap<string, UnitOutcome>>()
      for (const arm of all) byArm.set(arm.name, outcomes(g, layout, arm))
      const base = byArm.get("production")
      if (base === undefined) throw new Error(`block ${block.id}: no production arm, which is a defect in this probe`)

      const violations: string[] = []
      const slotMovers = new Set<string>()
      const statusMovers = new Set<string>()
      const counts = new Map<string, number>()
      for (const arm of all) {
        const got = byArm.get(arm.name)
        if (got === undefined) throw new Error(`block ${block.id}: arm ${arm.name} produced nothing, which is a defect in this probe`)
        counts.set(arm.name, [...got.values()].filter((u) => u.fellBack).length)
        if (got.size !== base.size) violations.push(`P1/P5: arm ${arm.name} returned ${got.size} unit(s), production returned ${base.size}`)
        for (const [key, u] of got) {
          const b = base.get(key)
          if (b === undefined) { violations.push(`P1: arm ${arm.name} has unit ${key}, production does not`); continue }
          // P5's control: geometry may not move, on ANY arm including identity.
          if (u.body !== b.body) violations.push(`P5: ${key} body is ${u.body} under ${arm.name} and ${b.body} under production`)
          if (arm.name === "identity") {
            if (u.slot !== b.slot) violations.push(`P1: ${key} slot is ${u.slot} under identity and ${b.slot} under production`)
            if (u.fellBack !== b.fellBack) violations.push(`P1: ${key} fallback is ${u.fellBack} under identity and ${b.fellBack} under production`)
            continue
          }
          if (u.slot !== b.slot) slotMovers.add(key)
          if (u.fellBack !== b.fellBack) statusMovers.add(key)
        }
      }
      const unconditional = unitSlots(g, layout).filter((u) => u.fallsBackUnconditionally).map((u) => u.key)
      for (const key of unconditional) {
        for (const arm of all) {
          const u = byArm.get(arm.name)?.get(key)
          if (u === undefined) { violations.push(`P4: ${key} is unconditional and arm ${arm.name} returned no unit for it`); continue }
          if (!u.fellBack) violations.push(`P4: ${key} is marked unconditional and placed CLEAR under ${arm.name}`)
        }
      }
      results.push({
        circuit: c.name, block: block.id, units: base.size, counts,
        slotMovers: [...slotMovers].sort(), statusMovers: [...statusMovers].sort(),
        unconditional: [...unconditional].sort(), violations,
      })
    }
  }
  return results
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  if (s.length === 0) return 0
  return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2
}

async function main(): Promise<void> {
  console.log("== WHAT THIS FIELD-ORDER RUN MEASURED ==")
  console.log(`arms: production, identity, reverse, and ${SHUFFLES} seeded Fisher-Yates shuffles (seeds 1..${SHUFFLES}, LCG 1664525/1013904223)`)
  console.log("subject: lib/schgen/render/field-placement.ts placeFields, over every declared ELK block with a grid-legal layout")
  console.log("what varies: the ORDER of layout.placements. Nothing else. Geometry, wires and anchors are the pipeline's own.")
  console.log("")
  console.log("== PREDICTIONS, PRINTED BEFORE ANY MEASUREMENT ==")
  for (const p of PREDICTIONS) console.log(`  ${p}`)
  console.log("")

  const results = await measure()

  console.log("== PER BLOCK: FALLBACK COUNT ACROSS THE ARMS ==")
  let anyCountDiffers = false
  let anyBelowProduction = false
  for (const r of results) {
    if (r.counts.size === 0) {
      console.log(`${r.circuit}/${r.block}: ${r.violations[0] ?? "no layout"}`)
      continue
    }
    const production = r.counts.get("production") ?? 0
    const values = [...r.counts.values()]
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    if (lo !== hi) anyCountDiffers = true
    if (lo < production) anyBelowProduction = true
    console.log(
      `${r.circuit}/${r.block}: ${r.units} unit(s), production ${production} fallback(s), arms min ${lo} median ${median(values)} max ${hi}` +
        ` | slot changed for ${r.slotMovers.length}, fallback status changed for ${r.statusMovers.length}, unconditional ${r.unconditional.length}`,
    )
    if (r.statusMovers.length > 0) console.log(`    STATUS MOVERS: ${r.statusMovers.join(", ")}`)
    if (r.slotMovers.length > 0) console.log(`    SLOT MOVERS: ${r.slotMovers.join(", ")}`)
  }
  console.log("")

  console.log("== CONTROLS ==")
  const violations = results.flatMap((r) => r.violations.filter((v) => !v.startsWith("NO LAYOUT")))
  console.log(`  P1 identity reproduces production: ${violations.filter((v) => v.startsWith("P1")).length} violation(s)`)
  console.log(`  P4 unconditional units fall back on every arm: ${violations.filter((v) => v.startsWith("P4")).length} violation(s)`)
  console.log(`  P5 geometry is invariant across arms: ${violations.filter((v) => v.startsWith("P5")).length} violation(s)`)
  for (const v of violations) console.log(`    VIOLATION ${v}`)
  console.log("")

  console.log("== VERDICT ON EACH PREDICTION ==")
  console.log(`  P1 ${violations.some((v) => v.startsWith("P1")) ? "REFUTED" : "HELD"}`)
  console.log(`  P2 ${anyCountDiffers ? "HELD" : "REFUTED"} - at least one block's fallback count differs between arms`)
  console.log(`  P3 ${anyBelowProduction ? "HELD" : "REFUTED"} - at least one block has an arm below production's count`)
  console.log(`  P4 ${violations.some((v) => v.startsWith("P4")) ? "REFUTED" : "HELD"}`)
  console.log(`  P5 ${violations.some((v) => v.startsWith("P5")) ? "REFUTED" : "HELD"}`)
  console.log("")

  const measured = results.filter((r) => r.counts.size > 0)
  const skipped = results.filter((r) => r.counts.size === 0)
  const prodTotal = measured.reduce((s, r) => s + (r.counts.get("production") ?? 0), 0)
  const bestTotal = measured.reduce((s, r) => s + Math.min(...r.counts.values()), 0)
  const worstTotal = measured.reduce((s, r) => s + Math.max(...r.counts.values()), 0)
  console.log("== SUMMARY ==")
  console.log(`  ${measured.length} block(s) measured, ${skipped.length} skipped for having no grid-legal layout`)
  console.log(`  fallbacks summed over measured blocks: production ${prodTotal}, arm-wise best ${bestTotal}, arm-wise worst ${worstTotal}`)
  console.log(`  units whose slot moves under some arm: ${measured.reduce((s, r) => s + r.slotMovers.length, 0)}`)
  console.log(`  units whose fallback status moves under some arm: ${measured.reduce((s, r) => s + r.statusMovers.length, 0)}`)
  console.log("  NOTE: the arm-wise best is a MEASUREMENT of spread and NOT a target. Nothing here says fewer fallbacks is the objective,")
  console.log("  what a fallback costs, or how many are acceptable - that is the owner's (docs/known-gaps.md G260).")
}

await main()
