/**
 * **STEP 3's REPORT: per blocked block, per global label, what each of the four freedoms buys.**
 *
 * Research apparatus for Task 5 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **A measurement, not a fix.**
 *
 * **IT REPORTS PER FREEDOM AND NEVER MERGES THE VERDICTS, because the brief requires it and says
 * why:** *"no side assignment clears it"* and *"nothing clears it"* are different results - the
 * first says side selection is insufficient, the second says the problem is elsewhere - and only
 * the second would justify the fixed-anchor framing this task was originally written around. A
 * single merged verdict would hide which was found.
 */

import { checkLayout } from "../../../lib/schgen/render/layout-check.ts"
import { anchorCandidates, anchorAndSide, extendedStub, labelAnchorIndices, labelProblems, labelsIn, sideAssignments, sweep, SIDES, type SweepResult } from "./freedoms.ts"
import type { BlockLayout, BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { Side } from "../../../lib/schgen/render/geometry.ts"

export interface Laid {
  readonly circuit: string
  readonly block: string
  readonly g: BlockSubgraph
  readonly layout: BlockLayout
  readonly refusal: string
}

/** Cap on a marginal sweep (one label moved). No marginal space below comes near it. */
const CAP = 20000

/**
 * Cap on a joint sweep over the two labels of one pair.
 *
 * **It is above every joint space this repository's blocked blocks produce** (the widest is 32256),
 * so no pair verdict below is a partial search. `sweep` says so by name when a cap bites, and the
 * summary carries that word; a capped "nothing clears it" would be a different claim from an
 * exhausted one.
 */
const PAIR_CAP = 60000

const verdict = (r: SweepResult): string =>
  `${r.tried} candidate(s); clears the whole block: ${r.clearsBlock ? "YES" : "NO"}; clears every label problem: ${r.clearsLabels ? "YES" : "NO"}; ` +
  `best total ${r.bestTotal === Number.POSITIVE_INFINITY ? "n/a" : r.bestTotal} at [${r.bestTotalAt}]; best label-problem count ${r.bestLabel === Number.POSITIVE_INFINITY ? "n/a" : r.bestLabel} at [${r.bestLabelAt}]${r.capped === "" ? "" : `; ${r.capped}`}`

/**
 * THE CONTROL, and it can fail in both directions.
 *
 * Re-grading the UNPERTURBED layout with `checkLayout` must reproduce exactly the problems the ELK
 * adapter's own refusal carries - every problem text must appear in the refusal string, and a block
 * the adapter accepted must grade clean. If this is red, every sweep below is grading something
 * other than the production refusal and no figure in Step 3 means anything.
 */
export function regradeControl(laid: readonly Laid[]): readonly string[] {
  const out: string[] = []
  for (const l of laid) {
    const problems = checkLayout(l.g, l.layout)
    if (l.refusal === "") {
      if (problems.length > 0) out.push(`${l.circuit}/${l.block}: the adapter accepted this layout and a re-grade finds ${problems.length} problem(s): ${problems.join(" ; ")}`)
      continue
    }
    if (problems.length === 0) {
      out.push(`${l.circuit}/${l.block}: the adapter refused this layout and a re-grade finds no problem at all`)
      continue
    }
    for (const p of problems) if (!l.refusal.includes(p)) out.push(`${l.circuit}/${l.block}: re-graded problem is not in the adapter's refusal text: ${p}`)
  }
  return out
}

/** Blocks that refuse, and whose refusal names at least one global label. */
export const labelBlocked = (laid: readonly Laid[]): readonly Laid[] => laid.filter((l) => l.refusal !== "" && labelProblems(checkLayout(l.g, l.layout)).length > 0)

/** The sides the laid-out anchors already have, so the base assignment can be named in the log. */
const baseSides = (l: Laid, idx: readonly number[]): string => idx.map((i) => `${l.layout.anchors[i]?.net ?? "?"}:${l.layout.anchors[i]?.side ?? "?"}`).join(" ")

export interface BlockReport {
  readonly name: string
  readonly labels: number
  readonly problems: number
  readonly labelProblems: number
  /** Best over every freedom, marginal and joint: `clears` is an EMPTY problem list. */
  readonly f1: SweepResult
  readonly f2Best: number
  readonly f4Best: number
  readonly f3: { readonly clears: boolean; readonly best: number }
  readonly f124: { readonly clearsBlock: boolean; readonly clearsLabels: boolean; readonly best: number }
  readonly pair: { readonly pairs: number; readonly clearsBlock: boolean; readonly clearsLabels: boolean; readonly best: number; readonly capped: boolean }
  /** Candidate anchor points on the label's own net, summed over the block's label anchors. */
  readonly ownSegmentPoints: number
  readonly otherSegmentPoints: number
}

const min = (a: number, b: number): number => (b < a ? b : a)

export function reportBlock(l: Laid, log: (s: string) => void): BlockReport {
  const problems = checkLayout(l.g, l.layout)
  const idx = labelAnchorIndices(l.g, l.layout)
  log("")
  log(`${l.circuit}/${l.block}: ${problems.length} problem(s), ${labelProblems(problems).length} naming a global label; ${idx.length} label anchor(s); ${l.layout.wires.length} wire(s)`)
  for (const p of problems) log(`  PROBLEM ${p}`)
  log(`  base sides as laid out: ${baseSides(l, idx)}`)

  // **FREEDOM 1: the label's orientation.** Every assignment of the four sides to every label
  // anchor of the block, exhaustively where 4^n fits under the cap.
  const space = 4 ** idx.length
  const f1 = sweep(l.g, sideAssignments(l.layout, idx), CAP)
  log(`  FREEDOM 1 (orientation; side space 4^${idx.length} = ${space}): ${verdict(f1)}`)

  let f2Best = Number.POSITIVE_INFINITY
  let f4Best = Number.POSITIVE_INFINITY
  let f3Best = Number.POSITIVE_INFINITY
  let f3Clears = false
  let f124Best = Number.POSITIVE_INFINITY
  let f124ClearsBlock = false
  let f124ClearsLabels = false
  let ownPoints = 0
  let otherPoints = 0

  for (const i of idx) {
    const a = l.layout.anchors[i]
    if (a === undefined) continue
    const named = problems.filter((p) => labelsIn(p).includes(a.net))
    const cand = anchorCandidates(l.layout, a)
    const here: readonly Side[] = [a.side]
    // **FREEDOM 2: the anchor slid along the segment it is already on**, side held as laid out.
    const f2 = sweep(l.g, anchorAndSide(l.layout, i, cand.sameSegment, here), CAP)
    // **FREEDOM 4: the generator's own choice of WHICH segment of the net to attach to.**
    const f4 = sweep(l.g, anchorAndSide(l.layout, i, cand.otherSegments, here), CAP)
    // Freedoms 1, 2 and 4 together for this one label: every reachable anchor point x every side.
    const f124 = sweep(l.g, anchorAndSide(l.layout, i, [...cand.sameSegment, ...cand.otherSegments], SIDES), CAP)
    // **FREEDOM 3: the surrounding wire geometry**, in the bounded form `extendedStub` documents.
    const f3 = sweep(
      l.g,
      (function* () {
        for (let k = 1; k <= 8; k += 1) {
          const grown = extendedStub(l.layout, a, k)
          if (grown === null) return
          for (const side of SIDES) {
            const anchors = grown.layout.anchors.map((x, j) => (j === i ? { ...x, side } : x))
            yield { what: `${a.net} stub +${k} steps to (${grown.at.x / 1000}, ${grown.at.y / 1000}) side ${side}`, layout: { ...grown.layout, anchors } }
          }
        }
      })(),
      CAP,
    )
    log(`  label ${a.net} at (${a.at.x / 1000}, ${a.at.y / 1000}) side ${a.side}: named in ${named.length} problem(s); own-segment grid points ${cand.sameSegment.length}, other-segment grid points ${cand.otherSegments.length}`)
    log(`    FREEDOM 2 (slide on its own segment, side fixed): ${verdict(f2)}`)
    log(`    FREEDOM 4 (another segment of the same net, side fixed): ${verdict(f4)}`)
    log(`    FREEDOMS 1+2+4 for this label alone: ${verdict(f124)}`)
    log(`    FREEDOM 3 (its stub lengthened 1-8 steps, every side): ${verdict(f3)}`)
    f2Best = min(f2Best, f2.bestTotal)
    f4Best = min(f4Best, f4.bestTotal)
    f3Best = min(f3Best, f3.bestTotal)
    f3Clears = f3Clears || f3.clearsBlock
    f124Best = min(f124Best, f124.bestTotal)
    f124ClearsBlock = f124ClearsBlock || f124.clearsBlock
    f124ClearsLabels = f124ClearsLabels || f124.clearsLabels
    ownPoints += cand.sameSegment.length
    otherPoints += cand.otherSegments.length
  }

  // **THE PAIRS: both labels of a label-over-label problem moved together**, which is the only
  // combination the marginal sweeps above cannot reach. Anchor points x sides for BOTH.
  let pairs = 0
  let pairClearsBlock = false
  let pairClearsLabels = false
  let pairBest = Number.POSITIVE_INFINITY
  let pairCapped = false
  for (const p of problems) {
    const nets = [...new Set(labelsIn(p))]
    if (nets.length < 2) continue
    const pair = nets.map((n) => idx.find((i) => l.layout.anchors[i]?.net === n)).filter((i): i is number => i !== undefined)
    if (pair.length < 2) continue
    const [i, j] = pair as [number, number]
    const ai = l.layout.anchors[i]
    const aj = l.layout.anchors[j]
    if (ai === undefined || aj === undefined) continue
    const ci = anchorCandidates(l.layout, ai)
    const cj = anchorCandidates(l.layout, aj)
    const pi = [...ci.sameSegment, ...ci.otherSegments]
    const pj = [...cj.sameSegment, ...cj.otherSegments]
    const joint = sweep(
      l.g,
      (function* () {
        for (const one of anchorAndSide(l.layout, i, pi, SIDES)) {
          for (const two of anchorAndSide(one.layout, j, pj, SIDES)) yield { what: `${one.what} + ${two.what}`, layout: two.layout }
        }
      })(),
      PAIR_CAP,
    )
    log(`  PAIR ${nets.join(" + ")}: joint space ${pi.length * 4} x ${pj.length * 4} = ${pi.length * 4 * pj.length * 4}: ${verdict(joint)}`)
    pairs += 1
    pairClearsBlock = pairClearsBlock || joint.clearsBlock
    pairClearsLabels = pairClearsLabels || joint.clearsLabels
    pairBest = min(pairBest, joint.bestTotal)
    pairCapped = pairCapped || joint.capped !== ""
  }

  return {
    name: `${l.circuit}/${l.block}`,
    labels: idx.length,
    problems: problems.length,
    labelProblems: labelProblems(problems).length,
    f1,
    f2Best,
    f4Best,
    f3: { clears: f3Clears, best: f3Best },
    f124: { clearsBlock: f124ClearsBlock, clearsLabels: f124ClearsLabels, best: f124Best },
    pair: { pairs, clearsBlock: pairClearsBlock, clearsLabels: pairClearsLabels, best: pairBest, capped: pairCapped },
    ownSegmentPoints: ownPoints,
    otherSegmentPoints: otherPoints,
  }
}

const n = (v: number): string => (v === Number.POSITIVE_INFINITY ? "n/a" : String(v))
const yn = (v: boolean): string => (v ? "YES" : "NO")

/**
 * The compact per-block scoreboard §5 pastes.
 *
 * **IT NEVER MERGES THE FREEDOMS INTO ONE VERDICT**, per the brief: a row says separately whether
 * side selection alone clears the block, whether anchor relocation does, and whether the bounded
 * wire-geometry change does.
 */
export function summaryLines(reports: readonly BlockReport[]): readonly string[] {
  const w = Math.max(...reports.map((r) => r.name.length))
  const out: string[] = [
    `${"block".padEnd(w)}  lbl  prob/lbl  F1 block/lbl best  F2best  F4best  F3 block/best  F1+2+4 block/lbl best  PAIR n/block/lbl best`,
  ]
  for (const r of reports) {
    out.push(
      `${r.name.padEnd(w)}  ${String(r.labels).padStart(3)}  ${String(r.problems).padStart(4)}/${String(r.labelProblems).padEnd(3)}  ` +
        `${yn(r.f1.clearsBlock).padEnd(3)}/${yn(r.f1.clearsLabels).padEnd(3)} ${n(r.f1.bestTotal).padStart(4)}  ` +
        `${n(r.f2Best).padStart(6)}  ${n(r.f4Best).padStart(6)}  ` +
        `${yn(r.f3.clears).padEnd(3)}/${n(r.f3.best).padStart(4)}       ` +
        `${yn(r.f124.clearsBlock).padEnd(3)}/${yn(r.f124.clearsLabels).padEnd(3)} ${n(r.f124.best).padStart(4)}          ` +
        `${String(r.pair.pairs)}/${yn(r.pair.clearsBlock)}/${yn(r.pair.clearsLabels)} ${n(r.pair.best)}${r.pair.capped ? " CAPPED" : ""}`,
    )
  }
  const anyClear = (f: (r: BlockReport) => boolean): number => reports.filter(f).length
  out.push(
    `TOTALS over ${reports.length} label-blocked block(s): F1 alone clears ${anyClear((r) => r.f1.clearsBlock)}; ` +
      `F3 alone clears ${anyClear((r) => r.f3.clears)}; F1+2+4 on one label clears ${anyClear((r) => r.f124.clearsBlock)}; ` +
      `a joint pair move clears ${anyClear((r) => r.pair.clearsBlock)}; ` +
      `some freedom clears ${anyClear((r) => r.f1.clearsBlock || r.f3.clears || r.f124.clearsBlock || r.pair.clearsBlock)}; ` +
      `NOTHING tried here clears ${anyClear((r) => !(r.f1.clearsBlock || r.f3.clears || r.f124.clearsBlock || r.pair.clearsBlock))}`,
  )
  // **THE THIRD OUTCOME, WHICH A BLOCK/NO-BLOCK COLUMN HIDES.** A block can have every problem that
  // names a global label cleared and still refuse, on a problem that has no label in it. Reporting
  // that as "nothing clears it" would attribute another defect class to the label question.
  const clearsLabels = (r: BlockReport): boolean => r.f1.clearsLabels || r.f124.clearsLabels || r.pair.clearsLabels
  const stuck = reports.filter((r) => !(r.f1.clearsBlock || r.f3.clears || r.f124.clearsBlock || r.pair.clearsBlock))
  out.push(
    `OF THE ${stuck.length} THAT NOTHING CLEARS: ${stuck.filter(clearsLabels).length} have every LABEL problem cleared by some freedom and refuse on a problem with no label in it ` +
      `(${stuck.filter(clearsLabels).map((r) => r.name).join(", ") || "none"}); ${stuck.filter((r) => !clearsLabels(r)).length} keep at least one label problem under every freedom tried ` +
      `(${stuck.filter((r) => !clearsLabels(r)).map((r) => r.name).join(", ") || "none"})`,
  )
  out.push(
    `CANDIDATE ANCHOR POINTS on the labels' own nets, summed: own segment ${reports.reduce((s, r) => s + r.ownSegmentPoints, 0)}, ` +
      `other segments ${reports.reduce((s, r) => s + r.otherSegmentPoints, 0)}, over ${reports.reduce((s, r) => s + r.labels, 0)} label anchor(s)`,
  )
  return out
}
