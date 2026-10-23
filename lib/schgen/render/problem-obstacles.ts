/**
 * Hand-written; no pedals source. The pedals generator never needed this, because its
 * `RealiseResult` had nowhere to put it.
 *
 * **WHAT THIS IS FOR.** Task 8's `clearance` mismatch must name the constraint that was violated
 * and the PAIR of obstacles that violated it (`clearanceViolation` in `block-types.ts`), and the
 * one template site that reports a clearance violation - `connector-fanout`'s *"found no rotation
 * without collisions"* - has `checkLayout`'s problems in hand as **strings**. This module turns
 * one of those strings into its relation and its two obstacles.
 *
 * **IT IS A DEVIATION FROM THE TASK BRIEF'S MECHANISM, AND THE DEVIATION IS THE POINT.** The
 * brief says *"`checkLayout`'s problem strings need enough structure for the pair to be
 * recovered"*. Restructuring `checkLayout` to return objects was the obvious reading and it is not
 * available: its eleven sub-checks live in eight ported modules
 * (`body-clearance.ts`, `text-scene.ts`, `glyph-clearance.ts`, `wire-safety.ts`,
 * `connectivity.ts`, `field-placement.ts`, `unit-pins.ts`, `layout-check.ts` itself) and every
 * clearance test in `tests/schgen/render/` asserts their exact text, so changing the shape would
 * have diverged eight more ported files and rewritten the assertions of the tests that hold them -
 * which ruling R4 forbids. The CRITERION the brief states is met instead by reading the structure
 * the strings already have, declared here as data, and `docs/known-gaps.md` **G145** records the
 * deviation.
 *
 * **IT REFUSES RATHER THAN GUESSING, IN TWO WAYS.** Many `checkLayout` problems name ONE subject -
 * *"unit R1#1 is not placed"*, *"net N is split into 2 pieces"* - and some name three.
 * `obstaclesOf` returns `null` for every string whose relation is not in `RELATIONS`, **and for
 * the forms in `NOT_A_PAIR`, which contain a relation phrase and still do not name a pair.** The
 * caller then throws naming the problem and this file. An invented obstacle pair would be worse
 * than a refusal: it is a classification nobody can check, in the field a reader would trust most.
 *
 * **The second kind of refusal exists because the first was not enough, found in review.** A
 * problem can hold `" touches "` and mean something else entirely - see `NOT_A_PAIR` - so matching
 * a relation is necessary and not sufficient.
 */
/**
 * Where the two obstacles of a problem sit in its text, keyed by the relation phrase that joins
 * them. **Every phrase here is transcribed from the code that writes it, named per entry** - never
 * recalled - because a phrase that no producer writes is a check that cannot fire, and one that is
 * written differently is a refusal nobody sees coming.
 */
interface Relation {
  /** The phrase as the producer writes it, including its spaces. */
  readonly infix: string;
  /** The relation's short name, used as the `constraint` of the mismatch. */
  readonly constraint: string;
  /** The module and function that writes it. */
  readonly writtenBy: string;
}

const RELATIONS: readonly Relation[] = [
  { infix: " overlaps ", constraint: "overlaps", writtenBy: "textProblems (text-scene.ts); bodyGlyphProblems and glyphGlyphProblems (glyph-clearance.ts)" },
  { infix: " lies under ", constraint: "lies under", writtenBy: "textProblems (text-scene.ts), the DNP-cross loop" },
  { infix: " crosses the border of ", constraint: "crosses frame border", writtenBy: "textProblems (text-scene.ts), the frame loop" },
  { infix: " touches ", constraint: "touches", writtenBy: "glyphPair (glyph-clearance.ts)" },
  { infix: " lies on the line of pin ", constraint: "on pin line", writtenBy: "onPinLine (body-clearance.ts)" },
  { infix: " passes through the body of ", constraint: "through body", writtenBy: "clearanceProblems (body-clearance.ts), the wire loop" },
  { infix: " lies inside the body of ", constraint: "inside body", writtenBy: "clearanceProblems (body-clearance.ts), the anchor loop" },
  { infix: " passes over pin end ", constraint: "wire over pin", writtenBy: "wireOverPin (wire-safety.ts)" },
  { infix: " lies mid-wire on ", constraint: "pin mid-wire", writtenBy: "wireOverPin (wire-safety.ts)" },
  { infix: " ends mid-wire on ", constraint: "wire end mid-wire", writtenBy: "checkWireSafety (wire-safety.ts), the wire-pair loop" },
  { infix: " ends on ", constraint: "wire ends on wire", writtenBy: "checkWireSafety (wire-safety.ts), the wire-pair loop" },
  { infix: " lies on pin end ", constraint: "anchor on pin end", writtenBy: "checkWireSafety (wire-safety.ts), the anchor loop" },
  { infix: " lies on ", constraint: "anchor on wire", writtenBy: "checkWireSafety (wire-safety.ts), the anchor loop" },
  { infix: " coincides with anchor ", constraint: "anchors coincide", writtenBy: "checkWireSafety (wire-safety.ts), the anchor loop" },
  { infix: " coincides with pin end ", constraint: "pin ends coincide", writtenBy: "checkWireSafety (wire-safety.ts), the pin-pair loop" },
];

/** `bodies of <a> and <b> overlap` - the one producer that puts both obstacles in front. */
const BODIES = /^bodies of (.+) and (.+) overlap$/;

/**
 * **Problem forms that LOOK like a pair and are not one.** Checked before `RELATIONS`, so
 * `obstaclesOf` returns nothing for them and the caller refuses loudly.
 *
 * `componentProblems` (`layout-check.ts`) writes
 * `` `not-connected pin ${nc.what} touches ${whats(others)}` ``, and `whats` joins **every** other
 * item in the component with `", "`. Two things are wrong with letting the `" touches "` relation
 * have it, and the second is worse than the first:
 *
 * 1. with two or more others, the second obstacle would be a LIST - `"wire 3 of B, wire 4 of B"` -
 *    in a field documented as one obstacle, which Task 12 onward reads;
 * 2. it is a **connectivity** defect - a pin declared not connected is touching something - and
 *    filing it as a `clearance` violation with `constraint: "touches"` would classify it as a
 *    drawing collision. A plausible-and-wrong classification is worse than a refusal, which is
 *    the whole reason this module returns `null` rather than guessing.
 *
 * This was a live defect, not a precaution: the relation's citation named `componentProblems` as
 * one of its writers while the code mishandled it, and `connector-fanout` passes rotation 0's
 * FIRST problem whatever it is, so it was reachable.
 */
const NOT_A_PAIR: readonly { readonly form: RegExp; readonly writtenBy: string }[] = [
  { form: /^not-connected pin /, writtenBy: "componentProblems (layout-check.ts), the not-connected pin loop" },
];

/**
 * A qualifier a producer appends after the second obstacle, which is prose about the PROBLEM
 * rather than part of the obstacle's name. Transcribed from its writer: `, which is on another
 * net` (glyph-clearance.ts's `glyphPair`) and `; split the wire there` (wire-safety.ts, twice).
 *
 * **A COORDINATE IS NOT A QUALIFIER AND IS DELIBERATELY KEPT.** Cutting a trailing ` at (x, y)`
 * was tried and removed: the producers print the point on whichever side reads better - the LEFT
 * in `body-clearance.ts`'s `onPinLine`, the RIGHT in `wire-safety.ts`'s anchor loop - so a rule
 * that cut it from the second obstacle only would strip half the pairs and leave the other half,
 * which is an inconsistency a reader would take for a distinction. The point is part of how a
 * drawing names the thing that collided.
 */
const TRAILING = [/, which is on another net$/, /; split the wire there$/];

const trimTrailing = (s: string): string => TRAILING.reduce((acc, re) => acc.replace(re, ""), s).trim();

export interface ProblemObstacles {
  /** The relation's short name, for the mismatch's `constraint`. */
  readonly constraint: string;
  readonly obstacles: readonly [string, string];
}

/**
 * The relation and the two obstacles of one `checkLayout` problem, or `null` when it names no
 * pair this module knows. **`null` is not a failure of the problem** - most problems genuinely
 * have one subject - it means the caller may not report a `clearance` mismatch from it, and must
 * say so rather than inventing one.
 *
 * `RELATIONS` is tried in order and the first infix found wins, which is why the longer phrases
 * that contain a shorter one sit above it: `" lies on pin end "` before `" lies on "`, and
 * `" ends mid-wire on "` before `" ends on "`. `tests/schgen/render/problem-obstacles.test.ts`
 * holds that ordering with the real problem strings of both.
 */
export function obstaclesOf(problem: string): ProblemObstacles | null {
  // Before anything else: a form that looks like a pair and is not one (see NOT_A_PAIR).
  if (NOT_A_PAIR.some((n) => n.form.test(problem))) return null;
  const bodies = BODIES.exec(problem);
  if (bodies !== null) {
    const a = bodies[1];
    const b = bodies[2];
    if (a !== undefined && b !== undefined) return { constraint: "bodies overlap", obstacles: [a, b] };
  }
  for (const r of RELATIONS) {
    const at = problem.indexOf(r.infix);
    if (at === -1) continue;
    const left = problem.slice(0, at).trim();
    const right = trimTrailing(problem.slice(at + r.infix.length));
    if (left === "" || right === "") continue;
    return { constraint: r.constraint, obstacles: [left, right] };
  }
  return null;
}

/** Every relation this module recognises, for the test that holds the list to its producers. */
export const RELATION_INFIXES: readonly string[] = RELATIONS.map((r) => r.infix);

/** Who writes each relation, by infix - cited so a reader can check the claim rather than take it. */
export const RELATION_WRITERS: ReadonlyMap<string, string> = new Map(RELATIONS.map((r) => [r.infix, r.writtenBy]));

/** The forms refused by name (see `NOT_A_PAIR`), each with the function that writes it. */
export const REFUSED_FORMS: readonly { readonly form: RegExp; readonly writtenBy: string }[] = NOT_A_PAIR;
