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
 * `circuitSpecFrom`'s output does not pass it - four rule classes refuse, which is the correct
 * consequence of *"no backend invents an input"*, since passing would need an invented net
 * rename, an invented no-connect reason and invented BOM fields. `buildCircuit` does not call it,
 * so the census builds and measures without inventing any of the three.
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
import { selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { twoPinNets } from "../../lib/schgen/render/layout-kit.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { BlockId, Circuit, Rendering, TemplateId } from "../../lib/schgen/ir/types.ts"
import type { BlockSubgraph, Mismatch, MismatchKind, Template } from "../../lib/schgen/render/block-types.ts"
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
 * One template's verdict on one subgraph.
 *
 * **A THROW BECOMES `backend-raised`, NEVER `not-applicable`**, for the reason
 * `render/blocks.ts`'s `runTemplate` gives: *"a template that crashed has told us nothing about
 * whether its idiom fits, and treating a crash as 'does not apply' is exactly how a defect in the
 * preferred rendering path goes dark"*. That wrapper is not exported, so this is the same
 * wrapping stated a second time; if it is ever exported, delete this and call it.
 */
function verdictOf(t: Template, g: BlockSubgraph): TemplateVerdict {
  try {
    const r = t.realise(g)
    return r.ok
      ? { template: t.id, kind: "ok", reason: "" }
      : { template: t.id, kind: r.mismatch.kind, reason: r.mismatch.reason }
  } catch (e) {
    return {
      template: t.id,
      kind: "backend-raised",
      reason: `template ${t.id} failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/** The selector's answer for one block, in the census's own vocabulary. */
function outcomeOf(circuit: Circuit, id: BlockId, symbols: SymbolResolver): BlockOutcome {
  const selection = selectRenderer(subgraphOf(circuit, id, symbols), TEMPLATES)
  if (selection.kind === "template") return { kind: "realised", template: selection.template }
  if (selection.kind === "refused") return { kind: "refused", mismatch: selection.mismatch }
  return { kind: "elk" }
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
    notCapacitors: g.units.filter((u) => u.part.refPrefix !== "C").length,
    declared: irBlock.rendering,
    outcome: outcomeOf(circuit, id, symbols),
    verdicts: [...TEMPLATES.values()].map((t) => verdictOf(t, g)),
  }
  assertAgreement(row)
  return row
}

/** Every declared block of every parity circuit, measured. */
export function censusOf(cases: readonly ParityCase[], symbols: SymbolResolver): ParityCensus {
  const templates = [...TEMPLATES.values()]
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

function describeDeclared(r: Rendering): string {
  if (r.kind === "wired") return `wired/${r.template}`
  return r.kind
}

function describeOutcome(o: BlockOutcome): string {
  if (o.kind === "realised") return `realised by \`${o.template}\``
  if (o.kind === "elk") return "**elk** - every template not-applicable"
  return `**refused** (${o.mismatch.kind})`
}

const HEADER = `# Template applicability: do the ported templates draw this repository's blocks?

**GENERATED - do not hand-edit.** \`bun run schgen-parity\` rewrites this file from
\`tools/schgen/parity.ts\`, and \`tests/schgen/parity.test.ts\` compares the committed copy against a
fresh run **by content**, never by timestamp. There is deliberately no date in this file: a
timestamp would make every run a diff and make stale look current.

## WHICH OF M1's FOUR MEASUREMENTS THIS IS

**Every number below is TEMPLATE APPLICABILITY: a MEASUREMENT WITH NO TARGET.** Spec §5.1,
revision 4, finding 20 separates four things that had been read as one, and names the failure of
confusing them:

| measurement | where it is taken | what it is |
| --- | --- | --- |
| port parity | Task 7, against the SOURCE project's own nine template fixtures | a **regression** requirement: it holds or the port is broken |
| **template applicability** | **this file**, against this repository's declared blocks | **a MEASUREMENT WITH NO TARGET** |
| ELK coverage | Tasks 12-14, over the blocks recorded here as \`elk\` | a test of the **new capability** |
| integrated correctness | Tasks 11 and 18 | the **artifact**, and the only verdict of the four |

§5.1: the templates *"were sized by a 103-block digital mainboard. Nothing is known about their
pass rate on circuits that are mostly passive chains, dividers and op-amp stages. The measurement:
run them and count."*

**So a low count here is a RESULT, not a problem.** A block no template draws is a finding about a
template. Nothing in the circuits, the declarations or the templates may be tuned to raise it, and
this census never becomes a threshold - Task 17 re-runs it as a second reading of the same
measurement.

## Two readings, and they answer different questions

- **Outcome** is what \`selectRenderer\` would actually do with the block under spec §1.3. For a
  \`wired\` block that consults only the declared template.
- **Verdicts** is an applicability probe: every registered template's own verdict on the block's
  subgraph, which is §5.1's question. \`Selection\`'s \`{kind:"elk"}\` carries no mismatch, so the
  reason each template declined is otherwise lost - recording it is \`docs/known-gaps.md\`
  **G141**'s third suggested mechanism. The census refuses if the two readings disagree.
`

/** The census as the committed markdown document. */
export function renderCensus(c: ParityCensus): string {
  const out: string[] = [HEADER]
  out.push("## Per block\n")
  out.push("| circuit | block | parts | units | crossing nets | declared | outcome |")
  out.push("| --- | --- | --- | --- | --- | --- | --- |")
  for (const b of c.blocks) {
    out.push(
      `| ${b.circuit} | \`${b.block}\` | ${b.parts} | ${b.units} | ${b.crossings} | ` +
        `${describeDeclared(b.declared)} | ${describeOutcome(b.outcome)} |`,
    )
  }
  const realised = c.blocks.filter((b) => b.outcome.kind === "realised").length
  const elk = c.blocks.filter((b) => b.outcome.kind === "elk").length
  const refused = c.blocks.filter((b) => b.outcome.kind === "refused").length
  out.push("")
  out.push(
    `**${c.blocks.length} declared blocks: ${realised} drawn by a template, ${elk} to the ELK backend, ` +
      `${refused} refused.**`,
  )
  out.push("")
  out.push("## The two predicates that do the refusing, measured per block\n")
  out.push(
    "Counted with the templates' own predicates rather than restatements of them: `twoPinNets`\n" +
      "from `render/layout-kit.ts`, which `rail-row`, `divider` and `passive-chain` each refuse a\n" +
      "block on, and `refPrefix !== \"C\"`, which is `decoupling-bank`'s. **This is description, not\n" +
      "prescription** - it says what the blocks hold, not what they should hold.\n",
  )
  out.push("| circuit | block | units | units not two-terminal with both pins connected | parts that are not capacitors |")
  out.push("| --- | --- | --- | --- | --- |")
  for (const b of c.blocks) {
    out.push(`| ${b.circuit} | \`${b.block}\` | ${b.units} | ${b.notTwoTerminal} | ${b.notCapacitors} |`)
  }
  out.push("")
  const allTwoPin = c.blocks.filter((b) => b.notTwoTerminal === 0)
  out.push(
    `**${c.blocks.length - allTwoPin.length} of ${c.blocks.length} blocks hold at least one unit that is not ` +
      "two-terminal with both pins connected**, which is where the three subgraph-only templates stop" +
      (allTwoPin.length === 0
        ? "."
        : `. The ${allTwoPin.length === 1 ? "one that does" : `${allTwoPin.length} that do`} not - ${allTwoPin
            .map((b) => `\`${b.block}\``)
            .join(", ")} - ${allTwoPin.length === 1 ? "gets" : "get"} past that predicate and ${
            allTwoPin.length === 1 ? "is" : "are"
          } declined on TOPOLOGY instead; the verdict rows below say how.`),
  )
  out.push("")
  out.push("## Per template\n")
  out.push("Over all " + String(c.blocks.length) + " blocks, each template's own verdict:\n")
  out.push("| template | realised | not-applicable | refused |")
  out.push("| --- | --- | --- | --- |")
  for (const [id, t] of c.byTemplate) {
    out.push(`| \`${id}\` | ${t.realised} | ${t.notApplicable} | ${t.refused} |`)
  }
  out.push("")
  out.push(
    c.unexercised.length === 0
      ? "**Every registered template drew at least one block.**"
      : `**Unexercised - drew no block of this repository's circuits: ${c.unexercised
          .map((id) => `\`${id}\``)
          .join(", ")}** (${c.unexercised.length} of ${c.byTemplate.size}).`,
  )
  out.push("")
  out.push("## Every verdict, with its reason verbatim\n")
  out.push("The sentence each template gave, unedited. This is the diagnosis the counts above cannot carry.\n")
  for (const b of c.blocks) {
    out.push(`### ${b.circuit} / \`${b.block}\` - ${b.parts} parts, ${b.units} units, ${describeOutcome(b.outcome)}\n`)
    out.push("| template | verdict | reason |")
    out.push("| --- | --- | --- |")
    for (const v of b.verdicts) {
      out.push(`| \`${v.template}\` | ${v.kind} | ${v.kind === "ok" ? "-" : v.reason} |`)
    }
    out.push("")
  }
  return out.join("\n")
}

if (import.meta.main) {
  console.log(renderCensus(censusOf(PARITY_CASES, parityResolver())))
}
