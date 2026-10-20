/**
 * **THE SECOND COLUMN OF THE TEMPLATE-APPLICABILITY MEASUREMENT: what the four anchor-driven
 * templates do when an anchor is brute-forced over a block's own member units.**
 *
 *   bun run schgen-anchors        (writes docs/schematic/template-parity-anchors.md)
 *   bun tools/schgen/anchor-sweep.ts
 *
 * **WHY IT EXISTS, and it is the Task 10 review's finding C1.** The census in
 * `tools/schgen/parity.ts` measures the templates **as these circuits are declared**, and every
 * declared block is `{kind:"auto"}` with `anchor: null`, so **48 of its 96 verdicts are the four
 * anchor-driven templates saying "needs an anchor"** - a statement about Task 9's declaration and
 * not about any template's fit. Reading that column alone supports the conclusion *"the templates
 * do not fit these circuits"*, **and that conclusion is false**: this sweep finds that
 * `connector-fanout` draws two of this repository's blocks.
 *
 * **IT IS A MEASUREMENT AND IT AUTHORS NOTHING.** Brute-forcing an anchor over a block's own
 * members chooses no arrangement to ship, emits no schematic, and writes no declaration: it answers
 * §5.1's actual question, which is a property of templates and circuits rather than of
 * declarations. **An agent may not author the acceptance criteria for what it produces; it may
 * measure.** A realised probe here is NOT a recommendation to declare that anchor - which anchor a
 * block should carry is a design decision with a drawing to look at, and nothing here looks at one.
 *
 * **EVERY PROBE GOES THROUGH THE REAL AUTHORING PATH.** The block's declaration is copied with its
 * rendering replaced, `circuitSpecFrom` and `buildCircuit` are run again, and the template is
 * called through `render/blocks.ts`'s own `runTemplate`. Nothing reaches into the IR to mutate a
 * rendering in place, and no template is called outside the wrapper that classifies a throw as
 * `backend-raised` rather than `not-applicable` (**G84**).
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { runTemplate, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { BlockDeclaration, SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { BlockId, PinNumber, TemplateAnchor, TemplateId } from "../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"
import type { VerdictKind } from "./parity.ts"

/** The committed document this sweep writes, relative to the repository root. */
export const ANCHOR_DOC = "docs/schematic/template-parity-anchors.md"

/**
 * **The roles each anchor-driven template reads off its anchor, by template id.**
 *
 * These are restated from the four templates, which read `anchor.roles["a"]` and friends inline
 * and export no table. **A WRONG ENTRY HERE CANNOT PASS SILENTLY:** a template whose role is
 * missing refuses with its own sentence naming the roles it wants - *"crystal needs an anchor with
 * roles a and b"* - and `anchorSweepOf` **throws** if any probe produces a reason containing
 * *"needs an anchor"*, because under a probed anchor no template should ever say that. So the
 * guard that makes this table honest is a check that could fail, not this comment.
 *
 * `connector-fanout` reads no roles at all: its anchor is the part it fans out from.
 */
export const ANCHOR_ROLES: ReadonlyMap<TemplateId, readonly string[]> = new Map<TemplateId, readonly string[]>([
  ["connector-fanout", []],
  ["crystal", ["a", "b"]],
  ["regulator", ["in", "out"]],
  ["opamp-stage", ["out", "inv", "noninv"]],
])

export interface AnchorProbe {
  readonly circuit: string
  readonly block: BlockId
  readonly template: TemplateId
  readonly part: string
  readonly unit: number
  readonly roles: Readonly<Record<string, PinNumber>>
  readonly kind: VerdictKind
  readonly reason: string
}

export interface AnchorBlockResult {
  readonly circuit: string
  readonly block: BlockId
  readonly probes: number
  /** Templates that drew this block under at least one anchor. */
  readonly realisedBy: readonly TemplateId[]
  /** One representative realised probe per template that drew it. */
  readonly examples: readonly AnchorProbe[]
  /** Probes whose mismatch is neither `ok` nor `not-applicable` - a template applied and failed. */
  readonly applied: readonly AnchorProbe[]
}

export interface AnchorSweep {
  readonly probes: number
  readonly realised: number
  readonly notApplicable: number
  readonly applied: number
  readonly blocks: readonly AnchorBlockResult[]
  /** Templates that drew at least one block under some anchor. */
  readonly drawing: readonly TemplateId[]
  /** Anchor-driven templates that drew nothing under any anchor over any member. */
  readonly stillUnexercised: readonly TemplateId[]
}

/** Every injective assignment of `roles` to distinct members of `pins`, in pin order. */
function roleAssignments(
  roles: readonly string[],
  pins: readonly PinNumber[],
): readonly Readonly<Record<string, PinNumber>>[] {
  const [head, ...rest] = roles
  if (head === undefined) return [{}]
  const out: Readonly<Record<string, PinNumber>>[] = []
  for (const pin of pins) {
    for (const tail of roleAssignments(rest, pins.filter((p) => p !== pin))) {
      out.push({ [head]: pin, ...tail })
    }
  }
  return out
}

/**
 * The authoring declaration with one block's rendering replaced by a wired template and anchor.
 *
 * **EXPORTED so a test reuses it rather than restating it.** It is a PROBE: the returned value is
 * never written to a circuit's authoring file, and building one is not a proposal that the block
 * should be declared this way.
 */
export function withAnchor(
  authoring: SchematicAuthoring,
  id: BlockId,
  template: TemplateId,
  anchor: TemplateAnchor,
): SchematicAuthoring {
  const blocks = authoring.blocks.map((b): BlockDeclaration => {
    if (b.id !== id) return b
    // `authoringProblems` requires the anchor on BlockDeclaration.anchor and null inside the
    // rendering; this is the shape it validates, not a shape invented here.
    return { ...b, rendering: { kind: "wired", template, anchor: null }, anchor }
  })
  return { ...authoring, blocks }
}

/**
 * Brute-force an anchor for every anchor-driven template over every member unit of every declared
 * block, and report what each template says.
 */
export function anchorSweepOf(
  cases: readonly ParityCase[],
  symbols: SymbolResolver,
  rolesTable: ReadonlyMap<TemplateId, readonly string[]> = ANCHOR_ROLES,
): AnchorSweep {
  if (rolesTable.size === 0) {
    throw new Error(
      "tools/schgen/anchor-sweep.ts: the roles table is empty, so this sweep would probe nothing and " +
        "report 0 of 0 - a measurement that looks like a result and reads nothing. Pass ANCHOR_ROLES, " +
        "or a subset of it.",
    )
  }
  const blocks: AnchorBlockResult[] = []
  let probes = 0
  let realised = 0
  let notApplicable = 0
  let applied = 0
  for (const c of cases) {
    const base = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const declaration of c.authoring.blocks) {
      const baseBlock = base.blocks.get(declaration.id)
      if (baseBlock === undefined) throw new Error(`${c.name}: the IR has no block ${declaration.id}`)
      const examples: AnchorProbe[] = []
      const appliedHere: AnchorProbe[] = []
      const realisedBy = new Set<TemplateId>()
      let here = 0
      for (const [templateId, roles] of rolesTable) {
        const template = TEMPLATES.get(templateId)
        if (template === undefined) {
          // Reachable: `TemplateId` is a closed union over `TEMPLATE_IDS`, but `TEMPLATES` is a
          // separate map, so an id can be a legal `TemplateId` and not be registered - which is
          // exactly the state a dropped registration leaves. It refuses rather than skipping,
          // because a template silently absent from a sweep reads as a template that declined.
          throw new Error(
            `tools/schgen/anchor-sweep.ts: the roles table names ${templateId}, which is a TemplateId ` +
              "but is not in the template registry, so there is nothing to probe. Register it or drop " +
              "it from the table; it is not skipped.",
          )
        }
        for (const member of baseBlock.members) {
          const unitPins = base.pins
            .filter((p) => p.part === member.part && p.unit === member.unit)
            .map((p) => p.pin)
          for (const assignment of roleAssignments(roles, unitPins)) {
            const anchor: TemplateAnchor = { part: member.part, unit: member.unit, roles: assignment }
            const authoring = withAnchor(c.authoring, declaration.id, templateId, anchor)
            const circuit = buildCircuit(circuitSpecFrom(c.network, authoring, symbols), { symbols })
            const result = runTemplate(template, subgraphOf(circuit, declaration.id, symbols))
            const kind: VerdictKind = result.ok ? "ok" : result.mismatch.kind
            const reason = result.ok ? "" : result.mismatch.reason
            if (reason.includes("needs an anchor")) {
              throw new Error(
                `${c.name}/${declaration.id}: ${templateId} reported "${reason}" although this probe ` +
                  `supplied the anchor ${member.part}#${member.unit} with roles ` +
                  `${JSON.stringify(assignment)}. That means ANCHOR_ROLES names the wrong roles for ` +
                  `${templateId}, so the sweep was measuring a missing-role refusal instead of the ` +
                  "template's fit. Fix the table in tools/schgen/anchor-sweep.ts against the template's " +
                  "own `anchor.roles[...]` reads.",
              )
            }
            const probe: AnchorProbe = {
              circuit: c.name,
              block: declaration.id,
              template: templateId,
              part: member.part,
              unit: member.unit,
              roles: assignment,
              kind,
              reason,
            }
            probes += 1
            here += 1
            if (kind === "ok") {
              realised += 1
              if (!realisedBy.has(templateId)) examples.push(probe)
              realisedBy.add(templateId)
            } else if (kind === "not-applicable") {
              notApplicable += 1
            } else {
              applied += 1
              appliedHere.push(probe)
            }
          }
        }
      }
      blocks.push({
        circuit: c.name,
        block: declaration.id,
        probes: here,
        realisedBy: [...realisedBy],
        examples,
        applied: appliedHere,
      })
    }
  }
  const drawing = [...rolesTable.keys()].filter((id) => blocks.some((b) => b.realisedBy.includes(id)))
  const stillUnexercised = [...rolesTable.keys()].filter((id) => !drawing.includes(id))
  return { probes, realised, notApplicable, applied, blocks, drawing, stillUnexercised }
}

const describeRoles = (roles: Readonly<Record<string, PinNumber>>): string => {
  const entries = Object.entries(roles)
  return entries.length === 0 ? "(no roles)" : entries.map(([r, p]) => `${r}=${p}`).join(" ")
}

export function renderAnchorSweep(s: AnchorSweep): string {
  const drew = s.blocks.filter((b) => b.realisedBy.length > 0)
  const out: string[] = []
  out.push("# Template applicability, second column: the templates under a brute-forced anchor\n")
  out.push(
    "**GENERATED - do not hand-edit.** `bun run schgen-anchors` rewrites this file from\n" +
      "`tools/schgen/anchor-sweep.ts`. No date, for the reason `template-parity.md` gives, and the same\n" +
      "dependence on the installed KiCad applies (`docs/known-gaps.md` **G158**).\n",
  )
  out.push(
    "**WHICH MEASUREMENT THIS IS: TEMPLATE APPLICABILITY, a MEASUREMENT WITH NO TARGET** - the same\n" +
      "one `template-parity.md` takes, read a second way. Not port parity (Task 7), not ELK coverage\n" +
      "(Tasks 12-14), not integrated correctness (Tasks 11 and 18).\n",
  )
  out.push(
    "**WHY A SECOND COLUMN.** `template-parity.md` measures the templates *as these circuits are\n" +
      "declared*, and every block is declared `{kind:\"auto\"}` with no anchor, so the four anchor-driven\n" +
      "templates are never offered one and half that document's verdicts say only *\"needs an anchor\"*\n" +
      "(**G141**). This sweep supplies an anchor mechanically - every member unit of the block, every\n" +
      "injective assignment of the template's roles to that unit's pins - and reports what the template\n" +
      "then says. **It chooses no arrangement, writes no declaration and emits no schematic.** A\n" +
      "realised probe here is evidence that a template CAN draw the block, and is not a recommendation\n" +
      "to declare that anchor.\n",
  )
  out.push("## The sweep\n")
  out.push("| | count |")
  out.push("| --- | --- |")
  out.push(`| probes (block x anchor-driven template x member unit x role assignment) | **${s.probes}** |`)
  out.push(`| realised - the template drew the block | **${s.realised}** |`)
  out.push(`| a template applied and failed (not \`not-applicable\`) | **${s.applied}** |`)
  out.push(`| \`not-applicable\` | **${s.notApplicable}** |`)
  out.push(`| **blocks drawn by at least one template under some anchor** | **${drew.length} of ${s.blocks.length}** |`)
  out.push(
    `| anchor-driven templates that drew something | **${s.drawing.length} of ${ANCHOR_ROLES.size}**` +
      `${s.drawing.length === 0 ? "" : ` (${s.drawing.map((id) => `\`${id}\``).join(", ")})`} |`,
  )
  out.push("")
  out.push(
    s.stillUnexercised.length === 0
      ? "**Every anchor-driven template drew something under some anchor.**"
      : `**Drew nothing under ANY anchor over ANY member: ${s.stillUnexercised
          .map((id) => `\`${id}\``)
          .join(", ")}.** For these the refusal is about the block, not the declaration.`,
  )
  out.push("")
  out.push("## Per block\n")
  out.push("| circuit | block | probes | drawn by | a template applied and failed |")
  out.push("| --- | --- | --- | --- | --- |")
  for (const b of s.blocks) {
    out.push(
      `| ${b.circuit} | \`${b.block}\` | ${b.probes} | ` +
        `${b.realisedBy.length === 0 ? "-" : b.realisedBy.map((id) => `\`${id}\``).join(", ")} | ` +
        `${b.applied.length} |`,
    )
  }
  out.push("")
  if (drew.length > 0) {
    out.push("## The anchors that drew something, verbatim\n")
    out.push("| circuit | block | template | anchor |")
    out.push("| --- | --- | --- | --- |")
    for (const b of drew) {
      for (const e of b.examples) {
        out.push(`| ${e.circuit} | \`${e.block}\` | \`${e.template}\` | \`${e.part}\`#${e.unit} ${describeRoles(e.roles)} |`)
      }
    }
    out.push("")
  }
  const appliedProbes = s.blocks.flatMap((b) => b.applied)
  if (appliedProbes.length > 0) {
    out.push("## Where a template applied and failed\n")
    out.push(
      "These are NOT `not-applicable`: the template recognised its idiom and the geometry or the\n" +
        "connectivity then disagreed. Under spec §1.3 a declared template reporting one of these is a\n" +
        "generation error that nothing may rescue, so these are the substantive refusals.\n",
    )
    out.push("| circuit | block | template | anchor | kind | reason |")
    out.push("| --- | --- | --- | --- | --- | --- |")
    for (const p of appliedProbes) {
      out.push(
        `| ${p.circuit} | \`${p.block}\` | \`${p.template}\` | \`${p.part}\`#${p.unit} ` +
          `${describeRoles(p.roles)} | ${p.kind} | ${p.reason} |`,
      )
    }
    out.push("")
  }
  return out.join("\n")
}

if (import.meta.main) {
  console.log(renderAnchorSweep(anchorSweepOf(PARITY_CASES, parityResolver())))
}
