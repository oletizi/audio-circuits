/**
 * WHAT A RECORDED EXEMPTION IS: the one file's path, its schema version, the
 * eleven fields an entry carries, the two rules that may be exempted at all, who
 * may grant one, and the VERDICT shape a consultation answers with.
 *
 * **ITS OWN FILE FOR THE REASON `./rules-model.ts` IS**: the declarations are
 * most of this area's prose and none of its behaviour, so `./exemptions.ts` is
 * the strict loader and nothing else. **NOTHING HERE READS A FILE OR REFUSES
 * ANYTHING.** Consumers import everything they need from `./exemptions.ts`,
 * which re-exports this module's declarations.
 *
 * **WHY THE REGISTRY EXISTS, in the owner's words, 2026-10-15:** ***"You should
 * keep a record of exemptions. My ad-built boards should be exempt from the
 * stricter standards of our new tooling—and, that exemption should carry a
 * reason and provenance so we don't have to keep having this dumb
 * conversation"*** - *"ad-built"* is his typo for *"as-built"*, quoted as he
 * typed it here and in `stripboard/exemptions.json`, because a quote an agent
 * tidies is a quote nobody can check against what was said.
 *
 * **IT IS THE SECOND HALF OF A TWO-HALF DECISION AND NEITHER HALF STANDS
 * ALONE.** The first half, same day, same conversation: ***"I've already told
 * you how rigid parts operate. The as-built diagram is instructive, but my
 * directives are more authoritative than a file on disk."*** So his boards do
 * not get to weaken the rules - `lib/stripboard/seed-area.ts` is untouched by
 * anything here and unreachable from it - and the rules do not get to indict his
 * boards. Carrying one half without the other is how the conversation he is
 * tired of starts again.
 *
 * **AN EXEMPTION MAKES A VIOLATION REPORTED, NOT INVISIBLE**, which is the one
 * decision the shapes below are built around and the owner approved it
 * explicitly. `ExemptionVerdict` IS A DISCRIMINATED UNION AND NOT A BOOLEAN, so
 * a consumer cannot get silence by dropping a value on the floor: the `exempt`
 * outcome carries a `notice` that names the board, the rule and the count, and
 * `./exemptions.ts`'s `noticesOf` is the one call that turns verdicts into the
 * lines a run must print. **A silent exemption is a skipped check that looks
 * like a passing one.**
 *
 * **THE GOVERNING INVARIANT, restated here because this is where the grant
 * vocabulary lives:** an agent may never author the acceptance criteria for the
 * artifact it is producing
 * (`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`), and an
 * agent that could grant an exemption FROM a criterion would be authoring that
 * criterion by subtraction. `GRANTORS` is therefore a whitelist of one.
 */
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/**
 * The one committed registry, absolute - computed once, for the reason
 * `RULES_PATH` is: a second way to name this file would be a second file for
 * anything that hashes or cites it.
 */
export const EXEMPTIONS_PATH = path.join(moduleRepoRoot(), "stripboard", "exemptions.json")

/** How the registry is cited in a notice and a refusal: short, and copy-pasteable. */
export const EXEMPTIONS_FILE = "stripboard/exemptions.json"

/** The only schema version this loader reads. */
export const EXEMPTIONS_SCHEMA = 1

/**
 * The rules an exemption may be granted from, and **NOTHING ELSE IS
 * EXEMPTABLE.**
 *
 * These are the two HARD placement rules in `lib/stripboard/seed-area.ts`, both
 * the owner's directives: `routedUnderRigid` (*"Rigid parts shouldn't be routed
 * through/under."*) and `rigidOverlap` (*"Rigid parts are rigid. You cant push
 * them out of the way or rout under them."*).
 *
 * **THE WHITELIST IS SHORT ON PURPOSE AND REFUSES LOUDLY.** An empty-by-default
 * whitelist that refuses beats a general rule that quietly accepts a guess, so
 * adding a rule here is a deliberate edit with a test beside it and never a
 * silent widening. In particular `violationsOf` - every reference net whole in
 * one copper component, no component carrying two nets - IS NOT HERE AND MUST
 * NOT BE ADDED: it is electrical soundness, which is a different claim from how
 * hard a board was to build, and a board that is not the circuit is not a board
 * anybody wanted exempted.
 */
export const EXEMPTABLE_RULES = ["routedUnderRigid", "rigidOverlap"] as const

export type ExemptableRule = (typeof EXEMPTABLE_RULES)[number]

/**
 * What kind of thing a subject is.
 *
 * `as-built-board` is a board that was laid out by hand, built, and is in use -
 * an artifact that predates the tooling and was never held to it. **THERE IS
 * DELIBERATELY NO KIND FOR A GENERATED BOARD.** A board the tooling produces is
 * held to both rules in full, so a kind that could name one would be a way to
 * exempt the thing the rules exist for.
 */
export const SUBJECT_KINDS = ["as-built-board"] as const

export type SubjectKind = (typeof SUBJECT_KINDS)[number]

/** Who may grant an exemption. A whitelist of one; see this module's comment. */
export const GRANTORS = ["owner"] as const

export type Grantor = (typeof GRANTORS)[number]

/** One recorded exemption: what is excused, from what, why, and on whose word. */
export interface Exemption {
  /** Unique, and how a notice cites this entry. */
  readonly id: string
  /** The artifact that is exempt - a board name as `COMMITTED_BOARDS` files it. */
  readonly subject: string
  readonly subjectKind: SubjectKind
  /** The rules it is exempt from, named so a reader can find them. */
  readonly from: readonly ExemptableRule[]
  /** Why - laid out, built, in use, and never held to the tooling. */
  readonly why: string
  readonly grantedBy: Grantor
  /** ISO `yyyy-mm-dd`, the day he granted it. */
  readonly grantedOn: string
  /** His words, verbatim. Not paraphrased, not tidied, typos included. */
  readonly ownerWords: string
  /** The edges, written down rather than argued later. At least two. */
  readonly doesNotExcuse: readonly string[]
  /**
   * Repository-relative paths of the files that really consult this entry.
   *
   * **AN EXEMPTION NOBODY READS IS A RULE NOBODY ENFORCES**, hiding in a file
   * that looks like governance, so each path is proven to exist by the loader
   * and proven to reach this loader transitively by
   * `tests/stripboard/exemptions.test.ts`.
   */
  readonly consultedBy: readonly string[]
  /** The provenance note, in `stripboard/rules.json`'s convention. */
  readonly note: string
}

export interface ExemptionRegistry {
  readonly schema: 1
  readonly exemptions: readonly Exemption[]
  /** One entry per field of the registry that carries a recorded decision. */
  readonly notes: Readonly<Record<string, string>>
}

/** What a consultation asks about: a subject, a rule, and where it broke. */
export interface Measured {
  readonly subject: string
  readonly rule: ExemptableRule
  /**
   * The offending places, as a measurement names them - `"Q1/RV3"` for an
   * overlapping pair, `"R4 under RV4"` for a lead inside a rigid area. The COUNT
   * is `places.length` and is never passed separately: two sources for one
   * number is a number that can disagree with itself.
   */
  readonly places: readonly string[]
}

/**
 * What a consultation answers with - **A UNION AND NEVER A BOOLEAN.**
 *
 * `clean` is nothing to excuse, so nothing is reported and no entry is
 * consulted. `exempt` is a recorded exemption covering what was found, and it
 * carries the `notice` the consumer must report. `unexcused` is a violation no
 * entry covers - a board with no entry, or a rule the entry does not name - and
 * it carries the `complaint`.
 *
 * **A CALLER CANNOT ACCIDENTALLY GET SILENCE.** Every member is an object, so
 * `if (verdict)` is always true and reads as nothing; the outcome has to be
 * discriminated, and the two outcomes that have something to say carry the text
 * that says it.
 */
export type ExemptionVerdict =
  | {
      readonly outcome: "clean"
      readonly subject: string
      readonly rule: ExemptableRule
    }
  | {
      readonly outcome: "exempt"
      readonly subject: string
      readonly rule: ExemptableRule
      readonly count: number
      readonly places: readonly string[]
      readonly exemption: Exemption
      readonly notice: string
    }
  | {
      readonly outcome: "unexcused"
      readonly subject: string
      readonly rule: ExemptableRule
      readonly count: number
      readonly places: readonly string[]
      readonly complaint: string
    }

/** Every field an entry must carry, in the order the committed file carries them. */
export const ENTRY_KEYS = [
  "id",
  "subject",
  "subjectKind",
  "from",
  "why",
  "grantedBy",
  "grantedOn",
  "ownerWords",
  "doesNotExcuse",
  "consultedBy",
  "note",
] as const

/**
 * **THERE IS NO `TEXT_KEYS` OR `LIST_KEYS` TABLE, AND THERE WAS**: two lists
 * naming which fields are strings and which are lists of strings, exported,
 * imported, and read by nothing - `readEntry` names every field at its own call
 * site, which is the stricter shape and the one the interface above already
 * documents. They are DELETED rather than left for somebody to find and trust.
 */

/** Every key a schema-1 file may carry at the top level, and no other. */
export const TOP_LEVEL_KEYS: readonly string[] = ["schema", "exemptions", "notes"]

/**
 * The notes block's keys: one recorded decision per field of the registry's own
 * design, not per entry - an entry carries its own `note`.
 */
export const NOTE_KEYS: readonly string[] = ["schema", "exemptions", "from", "grantedBy"]

/**
 * The fewest edges an entry may state.
 *
 * TWO, because the design named two and both are load-bearing: an exemption is
 * about a specific as-built artifact and does not travel to a board the tooling
 * generates, and it does not excuse electrical soundness. A single edge is an
 * entry that has thought about one way of being misread.
 */
export const EDGES_REQUIRED = 2

/**
 * The one name an entry's edges must mention: `violationsOf`.
 *
 * **IT IS THE EDGE WHOSE ABSENCE IS DANGEROUS.** A reader taking an exemption to
 * cover soundness has read it as excusing a board that is not the circuit, which
 * no exemption in this repository means and none may mean. Requiring the NAME
 * rather than a description of it is deliberate: a name is checkable against the
 * module that exports it (`lib/stripboard/invariants.ts`), and a paraphrase is
 * not.
 *
 * **IT IS NOT CALLED `..._SYMBOL`, AND THAT IS NOT A STYLE CHOICE.**
 * `tests/kicad/symbol-names.test.ts` sweeps every `.ts` file for a constant
 * whose name ends in `SYMBOL` assigned a quoted string and resolves the value
 * against the installed KiCad symbol libraries - so the first spelling of this
 * constant made that sweep report `violationsOf` as a symbol in no library.
 * Driven, not guessed: the sweep failed. A name here that looks like a part name
 * is a name that gets looked up as one.
 */
export const SOUNDNESS_PREDICATE = "violationsOf"
