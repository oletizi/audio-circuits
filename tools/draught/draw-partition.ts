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
import { verifyIntentAgainstModel } from "./draw-draft.ts"

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
        `(${declaration.netlistPath}) on net partition - EVALUATING-DRAWINGS.md §3 permits withholding a ` +
        "drawing whose connectivity disagrees with the circuit model, so nothing was drafted:",
      ...agreement.disagreements,
    ].join("\n"),
  }
}
