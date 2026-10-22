/**
 * **EVERY STRING THE ELEVEN BOARDS WOULD DRAW AS A REFERENCE, A VALUE OR A NET LABEL**, with the
 * board each came from, so Task 1's error table is over this repository's own text and not over an
 * alphabet somebody chose.
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it.**
 *
 * **IT TAKES THE STRINGS FROM `buildCircuit`, WHICH IS UPSTREAM OF THE GATE THAT REFUSES SIX OF THE
 * ELEVEN BOARDS**, and that is deliberate and is reported rather than hidden: `generate` runs
 * `validateCircuit` after `buildCircuit`, and six boards refuse there on lower-case net names
 * (`tools/schgen/board-sheets.ts` prints the refusals). Those names are therefore strings the
 * drawing code is OFFERED and never emits. `StringRow.reachesTheDrawing` marks which rows survive
 * validation, so a character that enters the glyph set only through a refused net can be counted
 * separately instead of silently widening the alphabet.
 *
 * **A REFERENCE HAS TWO STRINGS AND BOTH ARE HERE.** `render/field-placement.ts` reserves room for
 * `reservedReference(prefix)` - the prefix plus three digits, `R000` - while the drawing prints the
 * annotated designator, `R4`. The first is what the layout measures and the second is what a reader
 * sees, so an error table over one of them answers only half the question.
 */

import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts"
import { intersheetRefs } from "../../../lib/schgen/render/page-refs.ts"
import { reservedReference } from "../../../lib/schgen/render/text-boxes.ts"
import type { Circuit, PartLabel } from "../../../lib/schgen/ir/types.ts"
import { caseResolver, type ParityCase } from "../authoring-census.ts"
import { boardRefs, declarationFor } from "../board-sheets.ts"

export type StringKind = "reserved-reference" | "reference" | "value" | "net" | "intersheet-refs"

export interface StringRow {
  readonly board: string
  readonly kind: StringKind
  readonly text: string
  /** The part or net the string belongs to, as the model names it. */
  readonly owner: string
  /**
   * False when this board refuses at `validateCircuit`, so the string is offered to the drawing
   * code and never reaches a sheet. **Not a filter**: the row stays and the caller reports both.
   */
  readonly reachesTheDrawing: boolean
}

export interface BoardCorpus {
  readonly board: string
  readonly circuit: Circuit
  readonly refs: ReadonlyMap<PartLabel, string>
  readonly validationProblems: readonly string[]
  readonly rows: readonly StringRow[]
}

/** The eleven boards under `boards/`, with the declaration each is drawn from. */
export function declaredBoards(repoRoot: string): readonly { readonly board: string; readonly declaration: ParityCase }[] {
  return boardRefs(repoRoot).map((b) => {
    const declaration = declarationFor(b)
    if (declaration === null) {
      throw new Error(
        `board ${b.name} has no SchematicAuthoring declaration for ${b.export}(). This probe measures ` +
          "the text of every board the drawing code is offered; a board it cannot build is not skipped, " +
          "because a row missing from this corpus is text nobody measured. Add the declaration to " +
          "tools/schgen/board-declarations.ts or state here why this board is out of scope.",
      )
    }
    return { board: b.name, declaration }
  })
}

export function boardCorpus(board: string, declaration: ParityCase): BoardCorpus {
  const symbols = caseResolver([declaration])
  const circuit = buildCircuit(circuitSpecFrom(declaration.network, declaration.authoring, symbols), { symbols })
  const validationProblems = validateCircuit(circuit, symbols)
  const reaches = validationProblems.length === 0
  const { refs } = annotate(circuit, EMPTY_LOCK, new Map<PartLabel, string>())
  const rows: StringRow[] = []
  const add = (kind: StringKind, text: string, owner: string): void => {
    rows.push({ board, kind, text, owner, reachesTheDrawing: reaches })
  }
  for (const [label, part] of circuit.parts) {
    add("reserved-reference", reservedReference(part.refPrefix), label)
    const ref = refs.get(label)
    if (ref === undefined) {
      throw new Error(`board ${board}: part ${label} has no annotated reference, so the string the drawing prints is unknown`)
    }
    add("reference", ref, label)
    add("value", part.value, label)
  }
  for (const net of circuit.nets.keys()) add("net", net, net)
  for (const rail of circuit.rails.keys()) add("net", rail, rail)
  for (const [net, text] of intersheetRefs(circuit)) if (text !== "") add("intersheet-refs", text, net)
  return { board, circuit, refs, validationProblems, rows }
}

export function wholeCorpus(repoRoot: string): readonly BoardCorpus[] {
  return declaredBoards(repoRoot).map(({ board, declaration }) => boardCorpus(board, declaration))
}

/** Distinct characters of the given rows, in code-point order. */
export function glyphSet(rows: readonly StringRow[]): readonly string[] {
  const seen = new Set<string>()
  for (const r of rows) for (const ch of r.text) seen.add(ch)
  return [...seen].sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
}

/** Distinct strings of the given rows, with every (board, kind, owner) that produced each. */
export function distinctStrings(rows: readonly StringRow[]): readonly { readonly text: string; readonly rows: readonly StringRow[] }[] {
  const by = new Map<string, StringRow[]>()
  for (const r of rows) {
    const hit = by.get(r.text)
    if (hit === undefined) by.set(r.text, [r])
    else hit.push(r)
  }
  return [...by.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([text, rs]) => ({ text, rows: rs }))
}
