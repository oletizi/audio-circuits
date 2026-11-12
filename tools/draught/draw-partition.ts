/**
 * `make draw`'s pre-draft partition check: the intent's net partition against the board's
 * committed netlist export, and what to say when the board has no export to check against.
 *
 * **A `pcb` BOARD MAY HAVE NEVER HAD A SCHEMATIC (design change C2).** The netlist the check
 * compares against is an export of a hand-authored schematic, so a board whose schematic
 * is the thing being drafted has none. For such a board the check cannot run, and the verb
 * says so in a block of its own rather than drafting silently: a skipped check that looks
 * identical to a passing one is the failure this workflow exists to prevent
 * (`CLAUDE.md`). It does NOT write a netlist derived from the model to stand in - comparing
 * the model with a copy of itself would pass every time and prove nothing. The binding check
 * for such a page is the drafted page's own `kicad-cli` export compared with the model
 * (`tests/circuits/drafted-kicad-round-trip.test.ts`).
 *
 * A perfboard board with no netlist still refuses, as it always has: its schematic exists
 * and declaring the pair is cheap, so a missing one is a fault in the declaration.
 */
import fs from "node:fs"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { verifyIntentAgainstModel, verifyPageAgainstModel } from "./draw-draft.ts"
import type { DrawingPage } from "./drawing-pages.ts"

type Intent = Parameters<typeof verifyIntentAgainstModel>[0]

/** Either the partition check ran and agreed (`notice` absent), did not run (`notice`), or refused. */
export type PartitionOutcome =
  | { readonly kind: "agrees" }
  | { readonly kind: "not-run"; readonly notice: string }
  | { readonly kind: "refused"; readonly message: string }

/** The block printed when the check could not run. Starts with the token the tests and the reviewer look for. */
export function noIndependentNetlistNotice(board: string, declarationFile: string): string {
  return [
    `NO INDEPENDENT NETLIST: ${declarationFile} declares no "netlist" for ${board}, so the pre-draft`,
    "partition check (the intent's nets against a committed model export) did NOT run.",
    "  There is no schematic to export a netlist from yet, and none was derived from the model",
    "  to stand in: a check that compares the model with itself cannot fail.",
    "  The binding check is the drafted page's own kicad-cli export compared with the model",
    "  (tests/circuits/drafted-kicad-round-trip.test.ts), which only exists once the page is committed.",
    "  Until then this draft's connectivity has been checked against nothing independent.",
  ].join("\n")
}

export function checkPartition(opts: {
  readonly board: string
  readonly declaration: PerfboardDeclaration
  readonly intent: Intent
  readonly intentPath: string
}): PartitionOutcome {
  const { board, declaration } = opts
  if (declaration.netlistPath === undefined) {
    if (declaration.kind === "pcb") {
      return { kind: "not-run", notice: noIndependentNetlistNotice(board, declaration.file) }
    }
    return {
      kind: "refused",
      message:
        `${declaration.file} declares no "netlist" field, so there is no committed model export to verify ` +
        `${board}'s intent against. Declare "sch"/"netlist" there (tools/perfboard/declaration.ts) before drafting.`,
    }
  }

  // A disagreement here is the one ground EVALUATING-DRAWINGS.md section 3 permits withholding a
  // page for - a drawing whose connectivity would disagree with the circuit model.
  let netlistText: string
  try {
    netlistText = fs.readFileSync(declaration.netlistPath, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { kind: "refused", message: `could not read ${declaration.netlistPath}: ${detail}.` }
  }
  const agreement = verifyIntentAgainstModel(opts.intent, netlistText)
  if (agreement.agrees) return { kind: "agrees" }
  return {
    kind: "refused",
    message: [
      `${board}'s intent (${opts.intentPath}) disagrees with the model's committed netlist ` +
        `(${declaration.netlistPath}) on net partition, so nothing was drafted. Two things can cause this, ` +
        "and the refusal cannot tell them apart:",
      "  (a) the model changed and the committed page is stale: for a pcb board whose declared netlist is the " +
        "kicad-cli export of the previous drafted page, a legitimate model change lands here;",
      "  (b) the model is wrong: EVALUATING-DRAWINGS.md §3 permits withholding a drawing whose connectivity " +
        "disagrees with the circuit model.",
      `  The fixture compared against is ${declaration.netlistPath}. TOOLING.md, section C2, says what to do for (a).`,
      ...agreement.disagreements,
    ].join("\n"),
  }
}

/**
 * The same check for a MULTI-PAGE board (design change C3): each block page against the model's
 * committed netlist restricted to that block's parts (`verifyPageAgainstModel`). With no netlist
 * declared, a `pcb` board gets the C2 notice ONCE for the whole board, not once per page - there is
 * one missing export, not one per page.
 */
export function checkPagesPartition(opts: {
  readonly board: string
  readonly declaration: PerfboardDeclaration
  readonly pages: readonly DrawingPage[]
}): PartitionOutcome {
  const { board, declaration } = opts
  if (declaration.netlistPath === undefined) {
    if (declaration.kind === "pcb") return { kind: "not-run", notice: noIndependentNetlistNotice(board, declaration.file) }
    return {
      kind: "refused",
      message: `${declaration.file} declares no "netlist" field, so there is no committed model export to verify ${board}'s pages against.`,
    }
  }
  let nets: Readonly<Record<string, readonly string[]>>
  try {
    nets = importNetlist(fs.readFileSync(declaration.netlistPath, "utf8")).nets
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { kind: "refused", message: `could not read ${declaration.netlistPath}: ${detail}.` }
  }
  const disagreements: string[] = []
  for (const page of opts.pages) {
    const agreement = verifyPageAgainstModel(page, nets)
    if (!agreement.agrees) disagreements.push(...agreement.disagreements.map((d) => `block ${page.block}: ${d}`))
  }
  if (disagreements.length === 0) return { kind: "agrees" }
  return {
    kind: "refused",
    message: [
      `${board}'s pages disagree with the model's committed netlist (${declaration.netlistPath}), compared block by ` +
        "block, so nothing was drafted. The two causes in TOOLING.md section C2 apply to a page as to a board: " +
        "the model moved on and the committed project is stale, or the model is wrong.",
      ...disagreements,
    ].join("\n"),
  }
}
