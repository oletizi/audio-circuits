/**
 * **HOW AN ATTEMPT'S EXPORTED NETLIST AGREES WITH THE BOARD MODEL, WITH THE APPROVED PAGE'S OWN
 * AGREEMENT REPORTED BESIDE IT.**
 *
 * `compareAttempt` runs the repository's `compareSheetToModel` twice against one model: once on
 * the attempt's `kicad-cli` netlist, once on a fresh export of the approved page. Nothing is
 * subtracted, filtered or normalised - the attempt's lists are exactly what `compareSheetToModel`
 * returns (`tests/schgen-trial/comparator-controls.test.ts`, "nothing adjusted"). The baseline is
 * there so a disagreement the approved page itself carries - the selector's `MP` mount lug, the
 * selector's `Value` text, and whatever else its own lists carry (measured on `pultec-low-boost`:
 * leading-zero capacitor value text and absent footprints as well) - is read beside each attempt
 * rather than charged to SchGen.
 *
 * **THE MODEL USES THE REQUEST'S PIN NUMBERS, FOR BOTH SIDES.** SchGen is told rule-derived pin
 * numbers (`./request.ts`'s `requestPinNumbers`), never the page-declared map `modelForSheet`
 * carries (`DECLARED_PIN_NUMBERS` in `tests/circuits/sheet-model.ts`, which swaps
 * `pultec-low-boost`'s `R2` to suit the approved page's wiring). An attempt is judged against what
 * it was asked for, so the model here replaces every component's pin numbers with the request's.
 * The consequence, stated rather than hidden: on `pultec-low-boost` the approved page's declared
 * `R2` swap appears in the BASELINE as a disagreement the approved page carries.
 *
 * **NET NAMES DO NOT COUNT, AND NO NORMALISATION IS ADDED FOR THEM.** `compareSheetToModel`
 * compares which pins share a net, never what the net is called, so a ground net named `0` against
 * `GND`, or a ground symbol drawn from stock `power:GND` with renumbered `#PWR` designators, reports
 * equal; a power symbol whose `Value` differs on one pin splits the net and reports it. Both are
 * proven by the controls on a re-exported sheet copy.
 *
 * CLI: `bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON`.
 */
import fs from "node:fs"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel, type SheetAgreement } from "../../lib/kicad/sheet-agreement.ts"
import { exportDraftedSheet } from "../../tests/circuits/drafted-sheet.ts"
import { modelForSheet, type SheetModel } from "../../tests/circuits/sheet-model.ts"
import { approvedSheetDigest, TRIAL_CIRCUIT } from "./boards.ts"
import { requestPinNumbers } from "./request.ts"

export interface AttemptComparison {
  /** `compareSheetToModel` on the attempt's netlist, exactly as returned. */
  readonly attempt: SheetAgreement
  /** `compareSheetToModel` on a fresh export of the approved page, against the same model. */
  readonly approvedBaseline: SheetAgreement
}

/** `modelForSheet(board)` with every component's pin numbers taken from the request's rule. */
export function trialModel(board: string): SheetModel {
  const model = modelForSheet(board)
  const pinNumbers = new Map<string, ReadonlyMap<string, string>>()
  for (const component of model.network.components) pinNumbers.set(component.id, requestPinNumbers(component))
  return { network: model.network, designators: model.designators, pinNumbers }
}

function readNetlist(netlistPath: string): string {
  if (!fs.existsSync(netlistPath)) {
    throw new Error(
      `no netlist at ${netlistPath}. compareAttempt compares a kicad-cli netlist export of an ` +
        "attempt's sheet; export it first. Not defaulted: an absent export has no connectivity " +
        "to compare, and reporting empty lists for it would read as agreement.",
    )
  }
  return fs.readFileSync(netlistPath, "utf8")
}

function compareTo(model: SheetModel, text: string): SheetAgreement {
  return compareSheetToModel(model.network, model.designators, model.pinNumbers, importNetlist(text))
}

/**
 * Compares the netlist at `netlistPath` against `board`'s model, and the approved page's fresh
 * export against the same model. Refuses a board whose committed page is not approved byte for
 * byte (`./boards.ts`).
 */
export function compareAttempt(board: string, netlistPath: string): AttemptComparison {
  approvedSheetDigest(board)
  const model = trialModel(board)
  const attempt = compareTo(model, readNetlist(netlistPath))
  const baseline = exportDraftedSheet(TRIAL_CIRCUIT, board)
  const approvedBaseline = compareSheetToModel(model.network, model.designators, model.pinNumbers, baseline)
  return { attempt, approvedBaseline }
}

function main(argv: readonly string[]): void {
  const [board, netlist, out] = argv
  if (board === undefined || netlist === undefined || out === undefined || argv.length !== 3) {
    throw new Error(
      "usage: bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON - all three are " +
        "required: the trial board, the attempt's kicad-cli netlist export, and where to write the " +
        "comparison.",
    )
  }
  const result = compareAttempt(board, netlist)
  fs.writeFileSync(out, `${JSON.stringify({ board, netlist, ...result }, null, 2)}\n`)
}

if (import.meta.main) main(process.argv.slice(2))
