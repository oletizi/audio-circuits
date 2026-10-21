/**
 * **DO THE PORTED TEMPLATES DRAW THIS REPOSITORY'S BLOCKS? - the TEMPLATE-APPLICABILITY census,
 * which is ONE OF M1's FOUR MEASUREMENTS and the one with NO TARGET.**
 *
 *   bun run schgen-parity            (writes docs/schematic/template-parity.md)
 *   bun tools/schgen/parity.ts       (prints it)
 *
 * **WHICH MEASUREMENT EVERY NUMBER IN HERE IS, said once and said first**, because spec revision
 * 4's finding 20 names the failure of *"confusing a regression test with a measurement"*:
 *
 * | measurement | where it is taken | what it is |
 * | --- | --- | --- |
 * | port parity | Task 7, against the SOURCE project's own template fixtures | a REGRESSION requirement |
 * | **template applicability** | **here**, against this repository's declared blocks | **a MEASUREMENT WITH NO TARGET** |
 * | ELK coverage | Tasks 12-14, over the blocks this census records as `elk` | a test of the NEW capability |
 * | integrated correctness | Tasks 11 and 18 | the ARTIFACT, and the only verdict of the four |
 *
 * §5.1: the templates *"were sized by a 103-block digital mainboard. Nothing is known about their
 * pass rate on circuits that are mostly passive chains, dividers and op-amp stages. The
 * measurement: run them and count."* **So a block no template draws is a finding ABOUT A
 * TEMPLATE, not a defect in the circuit, the declaration or this tool** - and nothing here may be
 * tuned to raise the count.
 *
 * **IT MEASURES THE DERIVED ARM.** Each circuit is built, `circuitSpecFrom` turns it into a
 * `CircuitSpec` under its authoring declaration, `buildCircuit` makes the IR, and every declared
 * block goes to `selectRenderer` with the real registry. Nothing is read off a text sweep and no
 * input is invented.
 *
 * **`validateCircuit` IS DELIBERATELY NOT CALLED.** `docs/known-gaps.md` **G151** records that
 * `circuitSpecFrom`'s output does not pass it - which is the correct consequence of *"no backend
 * invents an input"*, since passing would need an invented net rename and an invented no-connect
 * reason. `buildCircuit` does not call it, so the census builds and measures without inventing
 * either. (The third class this sentence used to name, invented BOM fields, is no longer one of
 * `validateCircuit`'s: Task 20 moved `bomFields` to `validateSourcing` under the owner's ruling
 * that the BOM requirement belongs to the CONSUMER of an artifact - **G245**.)
 *
 * **TWO READINGS ARE REPORTED, AND THEY ARE DIFFERENT QUESTIONS.** `outcome` is the SELECTOR's
 * answer for a block - what §1.3 would actually use, which for a `wired` block consults only the
 * declared template. `verdicts` is an APPLICABILITY PROBE: every registered template's own
 * verdict on that block's subgraph, which is §5.1's question and which the `Selection` type
 * deliberately drops (`{kind:"elk"}` carries no mismatch, so the reason every template declined
 * is lost). Recording it is **G141**'s third suggested mechanism - *"have the render report say
 * which blocks reached ELK and which templates declined them, so the silence is at least
 * recorded"* - and `censusOf` asserts the two readings agree where they must, so a probe that
 * drifted from the selector refuses rather than reporting a template §1.3 would not have used.
 */

import { crossingNets } from "../../lib/schgen/authoring-checks.ts"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { runTemplate, selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { twoPinNets } from "../../lib/schgen/render/layout-kit.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { BlockId, Circuit, Rendering, TemplateId } from "../../lib/schgen/ir/types.ts"
import type { BlockSubgraph, BlockUnit, Mismatch, MismatchKind, Template } from "../../lib/schgen/render/block-types.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/** The committed document this census writes, relative to the repository root. */
export const CENSUS_DOC = "docs/schematic/template-parity.md"

/** A template's own verdict on a subgraph: it drew it, or the kind of mismatch it reported. */
export type VerdictKind = "ok" | MismatchKind

export const VERDICT_KINDS: readonly VerdictKind[] = [
  "ok",
  "not-applicable",
  "invalid-geometry",
  "clearance",
  "backend-raised",
]

/**
 * Exhaustiveness in both directions, so `VERDICT_KINDS` cannot under-report a kind the render
 * layer has started producing. A fifth `MismatchKind` leaves this object incomplete and
 * `bun run typecheck` fails here; the comparison below then fails at import if the list and the
 * object ever disagree, which is the half the compiler cannot see.
 */
const VERDICT_KIND_COVERAGE: Readonly<Record<VerdictKind, true>> = {
  ok: true,
  "not-applicable": true,
  "invalid-geometry": true,
  clearance: true,
  "backend-raised": true,
}

const UNLISTED_KINDS = Object.keys(VERDICT_KIND_COVERAGE).filter((k) => !VERDICT_KINDS.some((v) => v === k))
if (UNLISTED_KINDS.length > 0 || Object.keys(VERDICT_KIND_COVERAGE).length !== VERDICT_KINDS.length) {
  throw new Error(
    `tools/schgen/parity.ts: VERDICT_KINDS and VERDICT_KIND_COVERAGE disagree (unlisted: ` +
      `${UNLISTED_KINDS.join(", ") || "none"}; listed ${VERDICT_KINDS.length}, covered ` +
      `${Object.keys(VERDICT_KIND_COVERAGE).length}). Add the kind to the list - it is not defaulted, ` +
      "because a census that silently drops a mismatch kind reports a template as applicable when it " +
      "refused.",
  )
}

export interface TemplateVerdict {
  readonly template: TemplateId
  readonly kind: VerdictKind
  /** The mismatch's own sentence, verbatim; empty only for `ok`, which has nothing to say. */
  readonly reason: string
}

export type BlockOutcome =
  | { readonly kind: "realised"; readonly template: TemplateId }
  /** Every template the block offered reported `not-applicable`, so §1.3 selects the ELK backend. */
  | { readonly kind: "elk" }
  | { readonly kind: "refused"; readonly mismatch: Mismatch }

export interface BlockParity {
  readonly circuit: string
  readonly block: BlockId
  /** Distinct parts the block holds. */
  readonly parts: number
  /** Units placed, which exceeds `parts` wherever a multi-section package is a member. */
  readonly units: number
  /** Nets crossing the block boundary, so a reader can see how isolated the block is. */
  readonly crossings: number
  /**
   * Units `twoPinNets` - the templates' OWN predicate, imported rather than restated - reports as
   * not two-terminal-with-both-pins-connected. `rail-row`, `divider` and `passive-chain` refuse a
   * block on the first of these.
   */
  readonly notTwoTerminal: number
  /**
   * Units that are not ELECTRICALLY two-terminal either - more than two distinct connected nets,
   * or a pin connected to nothing. **Where `notTwoTerminal` exceeds this, the difference is a
   * pin-count convention rather than a topology fact**: see `electricallyTwoTerminal` and
   * `docs/known-gaps.md` **G160**.
   */
  readonly notTwoTerminalGenuine: number
  /** Parts whose `refPrefix` is not `C`, which is `decoupling-bank`'s own predicate. */
  readonly notCapacitors: number
  readonly declared: Rendering
  readonly outcome: BlockOutcome
  /** Every registered template's own verdict on this block - the applicability probe. */
  readonly verdicts: readonly TemplateVerdict[]
}

export interface TemplateTally {
  readonly realised: number
  readonly notApplicable: number
  readonly refused: number
}

export interface ParityCensus {
  readonly blocks: readonly BlockParity[]
  readonly byTemplate: ReadonlyMap<TemplateId, TemplateTally>
  /** Registered templates that drew none of this repository's blocks. */
  readonly unexercised: readonly TemplateId[]
}

/** How many blocks the authoring declarations themselves declare, counted without the IR. */
export function declaredBlockCount(cases: readonly ParityCase[]): number {
  return cases.reduce((n, c) => n + c.authoring.blocks.length, 0)
}

/**
 * One template's verdict on one subgraph, through `render/blocks.ts`'s own `runTemplate`, so the
 * rule that **a throw becomes `backend-raised` and NEVER `not-applicable`** (**G84**) is stated in
 * one place. Round 1 of this file restated that wrapping here; the Task 10 review had it exported
 * instead and the copy deleted.
 */
export function verdictOf(t: Template, g: BlockSubgraph): TemplateVerdict {
  const r = runTemplate(t, g)
  return r.ok
    ? { template: t.id, kind: "ok", reason: "" }
    : { template: t.id, kind: r.mismatch.kind, reason: r.mismatch.reason }
}

/** The selector's answer for one block, in the census's own vocabulary. */
function outcomeOf(
  circuit: Circuit,
  id: BlockId,
  symbols: SymbolResolver,
  templates: ReadonlyMap<TemplateId, Template>,
): BlockOutcome {
  const selection = selectRenderer(subgraphOf(circuit, id, symbols), templates)
  if (selection.kind === "template") return { kind: "realised", template: selection.template }
  if (selection.kind === "refused") return { kind: "refused", mismatch: selection.mismatch }
  return { kind: "elk" }
}

/**
 * **Whether a unit is ELECTRICALLY two-terminal: exactly two distinct connected nets, with no pin
 * left unconnected** - which is NOT what `twoPinNets` asks. `twoPinNets` requires
 * `pins.length === 2`, so a part wired as a rheostat, with two of its pins strapped to one net,
 * counts as not-two-terminal although it has two terminals.
 *
 * **This distinction is the whole of `docs/known-gaps.md` G160's `notTwoTerminal` versus
 * `notTwoTerminalGenuine` split**, and it exists because round 1 of this census reported *"the
 * trimmer has three pins"* as though it were a topology fact when it is a pin-count convention.
 * **Nothing here changes `twoPinNets`**: it is a ported, reviewed decision, and the measurement's
 * job is to say how much of the refusal it accounts for.
 */
function electricallyTwoTerminal(u: BlockUnit): boolean {
  if (u.pins.some((p) => p.net === null)) return false
  return new Set(u.pins.flatMap((p) => (p.net === null ? [] : [p.net]))).size === 2
}

/**
 * The probe and the selector must agree, or the census is reporting a template §1.3 would not
 * have used. This refuses rather than reporting the disagreement, because a census that prints
 * two answers and picks one is a guess with a table around it.
 */
function assertAgreement(row: BlockParity): void {
  const drew = row.verdicts.filter((v) => v.kind === "ok").map((v) => v.template)
  if (row.outcome.kind === "elk" && drew.length > 0) {
    throw new Error(
      `block ${row.circuit}/${row.block}: selectRenderer selected the ELK backend, which means every ` +
        `template it offered reported "not-applicable", but the applicability probe says ${drew.join(", ")} ` +
        "drew it. The two readings disagree, so one of them is wrong: either candidatesFor no longer " +
        "offers an auto block every template, or a template is not deterministic. Fix " +
        "lib/schgen/render/blocks.ts or the template - not this census.",
    )
  }
  if (row.outcome.kind === "realised") {
    const chosen = row.outcome.template
    const verdict = row.verdicts.find((v) => v.template === chosen)
    if (verdict === undefined || verdict.kind !== "ok") {
      throw new Error(
        `block ${row.circuit}/${row.block}: selectRenderer drew it with template ${chosen}, but the ` +
          `applicability probe reports that template as ` +
          `${verdict === undefined ? "not probed at all" : verdict.kind}. The two readings disagree; see ` +
          "lib/schgen/render/blocks.ts.",
      )
    }
  }
}

/**
 * One block of one circuit, measured.
 *
 * **IT TAKES A BUILT `Circuit` RATHER THAN A `ParityCase` SO ITS THREE OUTCOME ARMS CAN BE
 * EXERCISED.** On this repository's four circuits every row comes out `elk`, so `realised` and
 * `refused` would be code no test ever ran - and *"0 realised, 0 refused"* read off a census whose
 * positive arm has never fired is a skipped check that looks like a passing one.
 * `tests/schgen/parity.test.ts` drives both arms through this entry point with the ported
 * template tests' own block fixtures. `crossings` is passed in because it is a property of the
 * `Network` and its authoring declaration, which a fixture `Circuit` does not have.
 */
export function blockParityOf(
  circuitName: string,
  circuit: Circuit,
  id: BlockId,
  crossings: number,
  symbols: SymbolResolver,
  templates: ReadonlyMap<TemplateId, Template> = TEMPLATES,
): BlockParity {
  const irBlock = circuit.blocks.get(id)
  if (irBlock === undefined) {
    throw new Error(
      `${circuitName} declares block ${id} and the IR built from it has no such block. The census ` +
        "counts declared blocks and measures IR blocks, so a block missing on one side is a defect " +
        "in lib/schgen/from-network.ts or lib/schgen/ir/build.ts - it is not skipped, because a " +
        "parity row that quietly vanishes is a check that stopped running.",
    )
  }
  if (irBlock.rendering.kind === "bus") {
    throw new Error(
      `${circuitName}/${id} is rendered "bus", and this census has no row shape for it: a bus block ` +
        "is drawn by the bus renderer (render/bus.ts, Task 6b - docs/known-gaps.md G131), is never " +
        "offered to the template set, and therefore has no template-applicability answer at all. " +
        "Reporting it as `elk` would be false and reporting it as not-applicable would credit eight " +
        "templates with declining a block they were never shown.",
    )
  }
  const g = subgraphOf(circuit, id, symbols)
  const row: BlockParity = {
    circuit: circuitName,
    block: id,
    parts: new Set(irBlock.members.map((m) => m.part)).size,
    units: irBlock.members.length,
    crossings,
    notTwoTerminal: g.units.filter((u) => twoPinNets(u) === null).length,
    notTwoTerminalGenuine: g.units.filter((u) => !electricallyTwoTerminal(u)).length,
    notCapacitors: g.units.filter((u) => u.part.refPrefix !== "C").length,
    declared: irBlock.rendering,
    outcome: outcomeOf(circuit, id, symbols, templates),
    verdicts: [...templates.values()].map((t) => verdictOf(t, g)),
  }
  assertAgreement(row)
  return row
}

/**
 * Every declared block of every parity circuit, measured.
 *
 * **`registry` IS A PARAMETER, and that is the Task 10 review's M1/M2.** It defaults to the real
 * `TEMPLATES`, so the brief's two-argument call shape still reads. Passing a different map lets a
 * test drive the `realised` and *"every registered template drew at least one block"* paths, which
 * no test reached while all twelve rows were `elk`, and **lets Step 7's perturbation be performed
 * by passing a smaller map rather than by editing a ported file** - which is how round 1 had to do
 * it. It is not a fallback: the default is the canonical registry, and there is no second-choice
 * behaviour behind it.
 */
export function censusOf(
  cases: readonly ParityCase[],
  symbols: SymbolResolver,
  registry: ReadonlyMap<TemplateId, Template> = TEMPLATES,
): ParityCensus {
  const templates = [...registry.values()]
  const blocks: BlockParity[] = []
  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const declaration of c.authoring.blocks) {
      blocks.push(
        blockParityOf(
          c.name,
          circuit,
          declaration.id,
          crossingNets(c.network, c.authoring, declaration.id).size,
          symbols,
          registry,
        ),
      )
    }
  }
  const byTemplate = new Map<TemplateId, TemplateTally>()
  for (const t of templates) {
    const mine = blocks.map((b) => b.verdicts.filter((v) => v.template === t.id)).flat()
    byTemplate.set(t.id, {
      realised: mine.filter((v) => v.kind === "ok").length,
      notApplicable: mine.filter((v) => v.kind === "not-applicable").length,
      refused: mine.filter((v) => v.kind !== "ok" && v.kind !== "not-applicable").length,
    })
  }
  const unexercised = [...byTemplate].filter(([, t]) => t.realised === 0).map(([id]) => id)
  return { blocks, byTemplate, unexercised }
}

if (import.meta.main) {
  const { renderCensus } = await import("./parity-render.ts")
  console.log(renderCensus(censusOf(PARITY_CASES, parityResolver())))
}
