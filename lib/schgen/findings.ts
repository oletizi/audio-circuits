/**
 * The vocabulary a gate refusal is classified by, for `docs/superpowers/sdd/2026-10-27-gates-classify`.
 *
 * Hand-written for Task 1 of that plan. A later task uses this vocabulary to classify every
 * refusal a gate raises; this file only states the classes, the kinds, and the one mapping
 * between them.
 *
 * **THE OWNER'S LINE, AND NOTHING ELSE.** A gate may refuse to ratify a drawing, but it must not
 * HIDE the drawing - the output stays available and is classified rather than withheld. The
 * owner's line between the two serious classes, verbatim: a drawing that is WRONG ABOUT THE
 * CIRCUIT must not be built from; a drawing that is CORRECT BUT HARD TO READ is "ugly but usable"
 * and ships. `classOf` below encodes exactly that line and nothing else - it is not this file's
 * place to invent a fifth class or to second-guess which side of the line a kind falls on.
 */

/** What a refusal says about the artifact. The spec's four classes. */
export type RefusalClass = "usable" | "defective" | "not-drawable" | "generator-defect"

/**
 * A closed union of every reason a gate can refuse. Adding a kind here without giving it a class
 * in `classOf` is a COMPILE ERROR, not a silent fallthrough - see `classOf`'s doc comment for the
 * mechanism.
 */
export type FindingKind =
  // wrong about the circuit
  | "short" | "split-net" | "missing-junction" | "nc-contact" | "dangling-end"
  | "label-misnames-net" | "cross-sheet-disagreement" | "reference-disagreement"
  // hard to read
  | "body-clearance" | "glyph-clearance" | "text-clearance" | "field-fallback"
  // no geometry
  | "no-template-applies" | "packing-failed" | "paper-exhausted" | "circuit-invalid"
  // this generator is broken
  | "invariant-violated" | "backend-raised"

export interface Finding {
  readonly kind: FindingKind
  readonly what: string
  readonly where: string
}

/**
 * The kind-to-class mapping, which is the owner's and not this file's to revise.
 *
 * **THIS SWITCH HAS NO `default` ARM, AND THAT IS THE MECHANISM, NOT A STYLE CHOICE.** TypeScript
 * narrows `kind` to `never` after every named case; if `FindingKind` gains a member without a
 * case here, that `never` assignment fails to compile. A `default` arm - however it is written -
 * would make this totality check decorative: it would let a new kind fall through to whatever the
 * default returns, silently and without a class, which is exactly the failure this file exists to
 * prevent. So no `default`, ever, and no widening the return type to accept `undefined` to work
 * around it either.
 */
export function classOf(kind: FindingKind): RefusalClass {
  switch (kind) {
    // wrong about the circuit -> defective: a drawing wrongly withheld costs a look, one wrongly
    // shipped costs a build.
    case "short":
    case "split-net":
    case "missing-junction":
    case "nc-contact":
    case "dangling-end":
    case "label-misnames-net":
    case "cross-sheet-disagreement":
    case "reference-disagreement":
      return "defective"
    // hard to read -> usable: crowding is not incorrectness.
    case "body-clearance":
    case "glyph-clearance":
    case "text-clearance":
    case "field-fallback":
      return "usable"
    // no geometry -> not-drawable: there is no artifact to classify as right or wrong.
    case "no-template-applies":
    case "packing-failed":
    case "paper-exhausted":
    case "circuit-invalid":
      return "not-drawable"
    // invariant broken -> generator-defect: the tool is wrong, not the circuit or the drawing.
    case "invariant-violated":
    case "backend-raised":
      return "generator-defect"
  }
}

/** Serious enough to let a `generator-defect` or `defective` finding mask a merely cosmetic one. */
const SEVERITY: readonly RefusalClass[] = ["generator-defect", "defective", "not-drawable", "usable"]

/**
 * The most serious class among a list of findings. An empty list is `usable`, so a clean drawing
 * needs no special case: it carries no findings, and "no findings" must read the same as "ship
 * it" rather than as an unclassified absence.
 */
export function worstClass(findings: readonly Finding[]): RefusalClass {
  let worst: RefusalClass = "usable"
  for (const finding of findings) {
    const candidate = classOf(finding.kind)
    if (SEVERITY.indexOf(candidate) < SEVERITY.indexOf(worst)) worst = candidate
  }
  return worst
}

/**
 * A refusal that declares its class. An untyped `Error` reaching the census is itself a
 * `generator-defect`: every refusal this generator raises must carry the findings that caused it,
 * named by kind, so the census can classify it rather than treat it as an opaque failure.
 */
export class SchgenRefusal extends Error {
  readonly findings: readonly Finding[]

  constructor(findings: readonly Finding[], message: string) {
    super(message)
    this.findings = findings
  }
}
