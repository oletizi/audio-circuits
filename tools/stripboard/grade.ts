/**
 * `A1`: the verdict that all ten hard constraints hold.
 *
 * CRITERIA's `A1` row: *"`HC1`-`HC10` all hold … the board conducts, has the
 * connectivity the netlist says **and no more** (`HC8`), is buildable within the
 * declared reach at **both** ends (`HC5`, `HC9`), carries no part whose pin
 * pattern the owner refuses to mount (`HC10`), and fits the stock. **Nothing is
 * tradeable.**"*
 *
 * THE TABLE IS A TABLE AND THE CONJUNCTION IS NOT WRITTEN OUT, and that is the
 * whole reason this file is shaped this way. The defect CRITERIA found in
 * PIPELINE was an `A1` that stated `H1`-`H9`: nine conjuncts where there were
 * ten constraints, which left a board free to violate a declared hard
 * constraint while passing every admissibility condition. A conjunction spelled
 * as nine `&&`s and a typo is a verdict that ignores one constraint, so `a1`
 * **asserts the result set covers all ten ids before it folds them**, and
 * `HARD_CONSTRAINTS` is checked against `CONSTRAINT_IDS` rather than trusted to
 * be complete by inspection.
 *
 * `R2` - THE GENERATE/GRADE SPLIT. *"The thing that mutates the board and the
 * thing that certifies it are two implementations of nothing in common."*
 * Nothing in this module's TRANSITIVE import closure is the scorer, the search,
 * the move set or the ranking, and
 * `tests/stripboard/grade.test.ts` computes that closure rather than grepping
 * for a filename - a transitive import through any third module satisfies a
 * grep and the gap is then invisible. What the two sides DO share is the dump
 * parser and the targets, deliberately: both must agree on what the dump SAYS
 * or they are grading different boards, and that sharing is asserted too so it
 * is a decision in the record rather than an accident the closure test
 * tolerates.
 *
 * NO OTHER MODULE CHECKS A HARD CONSTRAINT. Task 15's ranking runs over
 * candidates that passed `a1`; Task 20's verdict consumes
 * `ConstraintResult[]`. `./extent.ts` is a MEASUREMENT module like
 * `./copper.ts`, not a second place a constraint is decided.
 */
import fs from "node:fs"
import path from "node:path"
import { hc1, hc10, hc2, hc3, hc4, hc5, hc6, hc7, hc8, hc9 } from "./constraints.ts"
import {
  CONSTRAINT_IDS,
  type CheckInput,
  type ConstraintId,
  type ConstraintResult,
  type Stock,
} from "./constraints-model.ts"
import type { StripboardRules } from "./rules.ts"

export {
  CONSTRAINT_IDS,
  parseCheckReport,
  type CheckInput,
  type CheckReport,
  type ConstraintId,
  type ConstraintResult,
  type Stock,
} from "./constraints.ts"

/**
 * The ten checks, in CRITERIA's own order. **Exactly ten entries.**
 *
 * `HC10` IS ONE ENTRY although it conjoins a footprint half and a placement
 * half, because both are clauses of one criterion sentence - see `hc10`.
 */
export const HARD_CONSTRAINTS: readonly {
  readonly id: ConstraintId
  readonly check: (input: CheckInput) => ConstraintResult
}[] = [
  { id: "HC1", check: hc1 },
  { id: "HC2", check: hc2 },
  { id: "HC3", check: hc3 },
  { id: "HC4", check: hc4 },
  { id: "HC5", check: hc5 },
  { id: "HC6", check: hc6 },
  { id: "HC7", check: hc7 },
  { id: "HC8", check: hc8 },
  { id: "HC9", check: hc9 },
  { id: "HC10", check: hc10 },
]

/**
 * Every constraint's result for one candidate.
 *
 * IT REFUSES A TABLE THAT IS NOT THE TEN, before grading anything. A table that
 * lost an entry - to a bad merge, to a refactor, to a deletion somebody thought
 * was a duplicate - would otherwise produce a verdict that reads exactly like a
 * real one while a declared hard constraint went unchecked.
 *
 * IT ALSO REFUSES AN ENTRY WHOSE CHECK RETURNS THE WRONG ID, because a check
 * that reports under another's name makes two constraints look like one held and
 * one missing, and `a1`'s coverage assertion would then fire on the wrong fault.
 */
export function gradeHardConstraints(input: CheckInput): readonly ConstraintResult[] {
  assertTableIsTheTen()
  return HARD_CONSTRAINTS.map((entry) => {
    const result = entry.check(input)
    if (result.id !== entry.id) {
      throw new Error(
        `the check registered for ${entry.id} returned a result for ${result.id}. A check that ` +
          "reports under another constraint's name makes one constraint read as held and " +
          "another as missing, so this refuses rather than recording either.",
      )
    }
    return result
  })
}

function assertTableIsTheTen(): void {
  const ids = HARD_CONSTRAINTS.map((entry) => entry.id)
  if (ids.length !== CONSTRAINT_IDS.length || ids.some((id, index) => id !== CONSTRAINT_IDS[index])) {
    throw new Error(
      `HARD_CONSTRAINTS is [${ids.join(", ")}] and CRITERIA's A1 is over ` +
        `[${CONSTRAINT_IDS.join(", ")}].\nThis refuses rather than grading what is left: the ` +
        "defect CRITERIA found in PIPELINE was an A1 stated over nine constraints where there " +
        "were ten, which left a board free to violate a declared hard constraint while passing " +
        "every admissibility condition. A grader missing an entry produces a verdict that reads " +
        "exactly like a real one.",
    )
  }
}

/**
 * `A1`: all ten hold.
 *
 * THE COVERAGE ASSERTION COMES FIRST AND IS NOT OPTIONAL. `results.every(...)`
 * over a short list is a verdict that ignores a constraint - it is `true` for
 * the empty list - so this refuses a result set that is not exactly the ten ids,
 * once each, before folding. That refusal is what makes the fold safe to be as
 * simple as it is.
 */
export function a1(results: readonly ConstraintResult[]): boolean {
  const seen = new Set<ConstraintId>()
  for (const result of results) {
    if (seen.has(result.id)) {
      throw new Error(
        `a1 was handed two results for ${result.id}. Which one is the verdict is not in the ` +
          "data, and folding both would let a duplicate pass stand in for a missing constraint.",
      )
    }
    seen.add(result.id)
  }
  const missing = CONSTRAINT_IDS.filter((id) => !seen.has(id))
  if (missing.length > 0) {
    throw new Error(
      `a1 was handed ${results.length} result(s) and ${missing.length} of CRITERIA's ten hard ` +
        `constraints are absent: ${missing.join(", ")}.\nThis refuses rather than folding what ` +
        "arrived: `every` is true of an empty list and true of nine passes, so an A1 computed " +
        "over an incomplete set is a board certified against constraints nobody checked. " +
        "Nothing in A1 is tradeable.",
    )
  }
  return results.every((result) => result.held)
}

/**
 * The stock a layout must fit: the board's own declaration when it makes one,
 * and the rules default otherwise.
 *
 * THE TWO SOURCES HAVE DIFFERENT AUTHORITY AND BOTH ARE THE OWNER'S. The rules
 * default is *"34 strips x 27 columns, the board he usually uses"*; a board cut
 * from a different piece *"declares its own size in `boards/<board>/
 * perfboard.json`, which overrides this default - the per-board declaration is
 * also the owner's, being a fact about a purchase rather than a judgement
 * (`PAR4`)."* `source` records which one answered, because a figure whose
 * provenance is lost cannot be checked against him again.
 *
 * IT READS THE RAW JSON RATHER THAN GOING THROUGH `loadDeclaration`, and that is
 * deliberate: `PerfboardDeclaration` has no stock field, so `loadDeclaration`
 * would discard the key, and a fixture declaring only a stock is not a complete
 * declaration. **No board declares one today** - all eleven
 * `boards/*\/perfboard.json` carry `circuit`, `export`, `vrt` and sometimes the
 * `sch`/`netlist` pair, and nothing else - so this path is exercised by a
 * fixture rather than by the tree, which is stated here so nobody reads the
 * absence as the feature being unused.
 *
 * A MALFORMED `stock` REFUSES rather than falling back to the default. A
 * declaration that tried to say something about the owner's stock and failed is
 * not the same as one that said nothing, and silently substituting 34 x 27
 * would grade a board against a piece he does not have.
 */
export function stockFor(declarationFile: string, rules: StripboardRules): Stock {
  const abs = path.resolve(declarationFile)
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8"))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${abs}: could not read this board's declaration to find out what stock it is cut from: ` +
        `${detail}`,
    )
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${abs}: expected a JSON object at the top level of perfboard.json`)
  }
  // `getOwnPropertyDescriptor` rather than `parsed["stock"]`: it reads the
  // object's OWN property and never walks the prototype chain, so a declaration
  // cannot inherit a stock from anywhere. `Object.hasOwn` would say the same
  // thing and is ES2022; this tsconfig targets ES2020.
  const declared: unknown = Object.getOwnPropertyDescriptor(parsed, "stock")?.value
  if (declared === undefined) {
    return { rows: rules.stockRows, cols: rules.stockCols, source: "rules-default" }
  }
  return { ...readDeclaredStock(declared, abs), source: "board" }
}

function readDeclaredStock(
  declared: unknown,
  file: string,
): { readonly rows: number; readonly cols: number } {
  const refuse = (fault: string): never => {
    throw new Error(
      `${file}: the "stock" field ${fault}. It must be {"rows": <positive integer>, "cols": ` +
        '<positive integer>}, the size in holes of the piece this board is cut from.\nThis is ' +
        "NOT defaulted to the rules file's 34 x 27: a declaration that tried to say something " +
        "about the owner's stock and failed is not one that said nothing, and substituting the " +
        "default would grade this board against a piece he does not have.",
    )
  }
  if (typeof declared !== "object" || declared === null || Array.isArray(declared)) {
    return refuse(`is ${declared === null ? "null" : typeof declared} rather than an object`)
  }
  const rows: unknown = Object.getOwnPropertyDescriptor(declared, "rows")?.value
  const cols: unknown = Object.getOwnPropertyDescriptor(declared, "cols")?.value
  if (typeof rows !== "number" || !Number.isInteger(rows) || rows < 1) {
    return refuse(`has a "rows" of ${JSON.stringify(rows)}`)
  }
  if (typeof cols !== "number" || !Number.isInteger(cols) || cols < 1) {
    return refuse(`has a "cols" of ${JSON.stringify(cols)}`)
  }
  return { rows, cols }
}
