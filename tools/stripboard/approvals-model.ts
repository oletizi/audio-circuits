/**
 * WHAT A RECORDED RENDER APPROVAL IS: the one file's path, its schema version,
 * the twelve fields an entry carries, the one termination an approval may admit,
 * who may grant one, and the VERDICT shape a consultation answers with.
 *
 * **THE CHANNEL THIS IMPLEMENTS ALREADY EXISTS AND NOTHING HERE AUTHORS IT.**
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, under
 * *Acceptance*, channel 4, verbatim: ***"Whether a board is any good is the
 * owner's call on a render, as it has been for every board in this project. Not
 * a figure, and not the producing agent's. The abandoned `lab` board is why:
 * valid connectivity and a low construction cost did not make it worth
 * building."*** `CLAUDE.md` says the same thing from the other side - criteria
 * reach an artifact through a rule file, a spec, or a reviewing agent that is
 * never the one that authored it. **This module is the way that channel reaches
 * the adoption gate, which had no way to hear it.** It is a RECORDING
 * mechanism, not a new standard.
 *
 * **WHY THE ADOPTION GATE NEEDED ONE AT ALL.** `CRITERIA G2.5` is read through
 * `./report-model.ts`'s `exitCodeFor(outcome, rule)` over the six stopping
 * rules, and **every one of the six describes how a SEARCH terminated**. The
 * materialisation path performs no search (`docs/known-gaps.md` G22), so it
 * records `./termination.ts`'s `NO_SEARCH` - a state outside the six that earns
 * no bound and licenses nothing. `./adopt-verdict.ts` refused such a run
 * outright, which was right while nothing carried the owner's call: an agent may
 * not author the clause that would admit it. **The clause did not need
 * inventing. It needed a channel.**
 *
 * **THE ONE QUESTION AN APPROVAL ANSWERS, AND IT ANSWERS NOTHING ELSE:** may a
 * run that performed no search be adopted? Every other check still has to pass
 * on its own - the hashes, the chain, the fork commits, the candidate's own
 * `admissible` outcome, `make check` after the copy. `ADMITTED_TERMINATIONS` is
 * a whitelist of one for exactly that reason.
 *
 * **ITS OWN FILE FOR THE REASON `./exemptions-model.ts` IS**: the declarations
 * are most of this area's prose and none of its behaviour, so `./approvals.ts`
 * is the strict loader and nothing else. **NOTHING HERE READS A FILE OR REFUSES
 * ANYTHING.** Consumers import everything they need from `./approvals.ts`, which
 * re-exports this module's declarations.
 *
 * **THE SHAPE FOLLOWS `stripboard/exemptions.json`'s, WHICH IS THIS
 * REPOSITORY'S PRECEDENT FOR RECORDING AN OWNER DECISION WITH PROVENANCE** - a
 * subject, what is admitted, why, who granted it, when, his words verbatim, what
 * it does NOT excuse, and who consults it. Two deliberate departures, each
 * because an approval is a different kind of claim from an exemption:
 *
 *   - **it is SCOPED TO BYTES.** An exemption is over a board that will not
 *     change again; an approval is over a board a pipeline will produce again
 *     and differently. So an entry carries `candidateSha256`, and a consultation
 *     compares it: approval of a render is approval of THAT board as rendered,
 *     and a later, different board for the same section is not covered by it;
 *   - **`ownerWords` IS A LIST.** He approved this board in two separate
 *     sentences, and a single string would have made an agent's concatenation of
 *     them the record. One utterance per entry of the list, each as he typed it.
 *
 * **WHAT THIS MECHANISM CANNOT DO, SAID HERE RATHER THAN DISCOVERED LATER: no
 * file can prove the owner said anything.** `./approvals-read.ts` refuses a
 * record with no quote, a quote in the narrator's voice, and a quote that is the
 * entry's own reasoning wearing quotation marks - but a determined agent can
 * fabricate a plausible sentence, and no guard here would catch it. What the
 * design does instead is make a forgery EXPENSIVE AND VISIBLE: it must name one
 * board and one 64-hex candidate hash, it lives in a committed file with his
 * name on it, the run directory carries his words beside `run.json`
 * (`./materialize-run.ts`), and the adoption prints the entry it was admitted
 * on. The residual is `docs/known-gaps.md` G27 and it is not papered over here.
 */
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { NO_SEARCH, type NoSearch, type Termination } from "./termination.ts"

/**
 * The one committed registry, absolute - computed once, for the reason
 * `EXEMPTIONS_PATH` is: a second way to name this file would be a second file
 * for anything that cites it.
 */
export const APPROVALS_PATH = path.join(moduleRepoRoot(), "stripboard", "render-approvals.json")

/** How the registry is cited in a notice and a refusal: short, and copy-pasteable. */
export const APPROVALS_FILE = "stripboard/render-approvals.json"

/** The only schema version this loader reads. */
export const APPROVALS_SCHEMA = 1

/**
 * The terminations an approval may admit, and **NOTHING ELSE IS ADMISSIBLE
 * THROUGH THIS CHANNEL.**
 *
 * `NO_SEARCH` and nothing else. The six stopping rules are not here and must not
 * be added: a run that searched is decided by `exitCodeFor(outcome, rule)`, which
 * is `G2.5` as CRITERIA states it, and an approval that could admit a `Q5` stop
 * would be overruling a clause CRITERIA states twice - *a run that stops on `Q5`
 * is reported as a failure rather than as a result*. **An empty-by-default
 * whitelist that refuses loudly is the point**: widening this is a deliberate
 * edit with a test beside it, never a silent accommodation of the next awkward
 * run.
 */
export const ADMITTED_TERMINATIONS = [NO_SEARCH] as const

export type AdmittedTermination = NoSearch

/** Who may grant a render approval. A whitelist of one; see this module's comment. */
export const APPROVAL_GRANTORS = ["owner"] as const

export type ApprovalGrantor = (typeof APPROVAL_GRANTORS)[number]

/** One recorded approval: which board, which bytes, on whose word, and said how. */
export interface RenderApproval {
  /** Unique, and how a notice cites this entry. */
  readonly id: string
  /** The board it is over - a board name as `boards/<board>/perfboard.json` declares it. */
  readonly board: string
  /**
   * The sha256 of the candidate `.vrt` he approved, lowercase hex.
   *
   * **THIS FIELD IS THE SCOPE AND IT IS WHY AN APPROVAL CANNOT TRAVEL.**
   * Approval of a render is approval of THAT board as rendered; a later run that
   * produces different bytes for the same section produces a different hash, and
   * this entry does not cover it. It is compared against
   * `run.json`'s `canonical.inputs.candidateSha256`, which the gate has already
   * checked against the candidate file itself (`candidate-hash`), so the chain
   * from these characters to the bytes that would be copied under `boards/` is
   * closed before this entry is read.
   */
  readonly candidateSha256: string
  /**
   * What he was actually shown, and how it was made.
   *
   * PROSE RATHER THAN A PATH, because the artifact he looked at is a picture in
   * a session scratchpad and the thing being adopted is a `.vrt`. The honest
   * statement of how those two are related belongs here, in words, where a
   * reader can judge it - **not collapsed into a path that would imply he
   * inspected the bytes.**
   */
  readonly renderedFrom: string
  /** The terminations this approval admits - `ADMITTED_TERMINATIONS` and nothing else. */
  readonly admits: readonly AdmittedTermination[]
  /** Why the approval was sought and what it settles. */
  readonly why: string
  readonly grantedBy: ApprovalGrantor
  /** ISO `yyyy-mm-dd`, the day he said it. */
  readonly grantedOn: string
  /**
   * His words, verbatim, one utterance per entry. Not paraphrased, not tidied,
   * not concatenated, typos included.
   *
   * **A RECORD THAT MERELY ASSERTS APPROVAL IS REFUSED.** His words are the
   * evidence; a paraphrase is an agent's reconstruction of it.
   * `./approvals-read.ts` holds the three readings that refuse one.
   */
  readonly ownerWords: readonly string[]
  /**
   * The edges, written down rather than argued later. At least
   * `APPROVAL_EDGES_REQUIRED`, and two names are required in the text.
   */
  readonly doesNotExcuse: readonly string[]
  /**
   * Repository-relative paths of the files that really consult this entry.
   *
   * **AN APPROVAL NOBODY READS IS A GATE NOBODY OPENED**, sitting in a file that
   * looks like governance, so each path is proven to exist by the loader and
   * proven to reach this loader transitively by
   * `tests/stripboard/approvals.test.ts`.
   */
  readonly consultedBy: readonly string[]
  /** The provenance note, in `stripboard/rules.json`'s convention. */
  readonly note: string
}

export interface ApprovalRegistry {
  readonly schema: 1
  readonly approvals: readonly RenderApproval[]
  /** One entry per field of the registry that carries a recorded decision. */
  readonly notes: Readonly<Record<string, string>>
}

/** What a consultation asks about: one board, the bytes in hand, and how the run ended. */
export interface AskedAbout {
  readonly board: string
  /** The candidate hash `run.json` records, which the gate has already checked. */
  readonly candidateSha256: string
  /**
   * How the run ended, as `run.json` records it.
   *
   * **IT IS THE WHOLE `Termination` AND NOT ONLY THE ADMISSIBLE ONE, WHICH IS
   * DELIBERATE AND IS NOT A WIDENING OF WHAT MAY BE APPROVED.** `approvalFor`
   * REFUSES a question about one of the six stopping rules by name, and that
   * refusal is the thing a test has to be able to drive. Typed narrowly here, it
   * would be unreachable without a cast - and this repository's rule is no
   * casts - so the guard would be one no test covers, which is
   * `./stop-model.ts`'s `assertOrderCoversTable` lesson applied one module
   * further on.
   */
  readonly termination: Termination
}

/**
 * What a consultation answers with - **A UNION AND NEVER A BOOLEAN.**
 *
 * `approved` carries the entry and the `notice` a consumer must report;
 * `unapproved` carries the `complaint` saying which way it missed - no entry for
 * the board, an entry over different bytes, or an entry that does not admit this
 * termination. **There is no third, quiet member.** A consultation is only made
 * about a termination that needs approving, so there is no *nothing to approve*
 * case to fall through: `./approvals-consult.ts` refuses a question about a run
 * that searched rather than answering it blandly.
 *
 * **A CALLER CANNOT ACCIDENTALLY GET SILENCE.** Both members are objects, so
 * `if (verdict)` is always true and reads as nothing; the outcome has to be
 * discriminated, and each member carries the text that says what it found.
 */
export type ApprovalVerdict =
  | {
      readonly outcome: "approved"
      readonly board: string
      readonly candidateSha256: string
      readonly termination: AdmittedTermination
      readonly approval: RenderApproval
      readonly notice: string
    }
  | {
      readonly outcome: "unapproved"
      readonly board: string
      readonly candidateSha256: string
      readonly termination: AdmittedTermination
      /** The entry over this board, when there is one and it did not cover this. */
      readonly nearest: RenderApproval | undefined
      readonly complaint: string
    }

/** Every field an entry must carry, in the order the committed file carries them. */
export const APPROVAL_ENTRY_KEYS = [
  "id",
  "board",
  "candidateSha256",
  "renderedFrom",
  "admits",
  "why",
  "grantedBy",
  "grantedOn",
  "ownerWords",
  "doesNotExcuse",
  "consultedBy",
  "note",
] as const

/** Every key a schema-1 file may carry at the top level, and no other. */
export const APPROVAL_TOP_LEVEL_KEYS: readonly string[] = ["schema", "approvals", "notes"]

/**
 * The notes block's keys: one recorded decision per field of the registry's own
 * design, not per entry - an entry carries its own `note`.
 */
export const APPROVAL_NOTE_KEYS: readonly string[] = [
  "schema",
  "approvals",
  "admits",
  "candidateSha256",
  "grantedBy",
  "ownerWords",
]

/**
 * The fewest edges an entry may state.
 *
 * THREE, because the design named three and each is load-bearing: an approval
 * does not travel to different bytes, it does not excuse electrical soundness,
 * and it does not excuse any other check the gate runs. An entry with two has
 * thought about two ways of being misread and this record has three.
 */
export const APPROVAL_EDGES_REQUIRED = 3

/**
 * The two names an entry's edges must mention.
 *
 * **THEY ARE THE EDGES WHOSE ABSENCE IS DANGEROUS, and a NAME is required
 * rather than a description because a name is checkable against the thing that
 * exports it and a paraphrase is not** - `./exemptions-model.ts`'s
 * `SOUNDNESS_PREDICATE` carries that reasoning and this is the same device:
 *
 *   - `violationsOf` (`lib/stripboard/invariants.ts`) - a reader taking an
 *     approval to cover soundness has read it as excusing a board that is not
 *     the circuit, which no approval here means and none may mean;
 *   - `candidateSha256` (`./run-dir.ts`'s `CanonicalInputs`) - the scope. An
 *     approval read as covering *the low-boost board* rather than *these bytes*
 *     would admit every later layout of that section on one look at one picture.
 */
export const APPROVAL_REQUIRED_EDGE_NAMES = ["violationsOf", "candidateSha256"] as const

/**
 * THE FOUR WORD LISTS THE READINGS OF `ownerWords` RUN OVER - **declared in
 * `lib/owner-words.ts` since Task 16 of the M1 schematic-authoring plan, and
 * re-exported here so every existing importer of this module is unaffected.**
 *
 * **WHY THEY MOVED, and nothing about them changed.** `schematic/readability-baselines.json`
 * (spec §3.3) is a SECOND registry recording the owner's judgement about a
 * produced artifact, and its loader is `lib/schgen/readability/baseline.ts` -
 * which may not import from `tools/` (the M1 plan's global constraint). So the
 * three readings had to be reachable from `lib/`, and the only alternative was
 * a second copy of these lists: two places to keep correct, which `CLAUDE.md`
 * forbids, and which that task's brief forbids by name (*"reuse
 * `tools/stripboard/approvals-read.ts`'s three refusals rather than writing a
 * fourth reader of the same shape"*).
 *
 * **NOTHING WAS WIDENED.** Each list holds exactly the entries it held here, and
 * the reasoning for each - why the voice test is POSITIVE, what it costs, why
 * the words are matched on boundaries, why `SELECTION_NON_ARTIFACTS` is the one
 * admissible blacklist - travelled with them verbatim and is in that file.
 * `tests/stripboard/approvals-refusals.test.ts` still drives all three readings
 * through `loadApprovals`, so the move is checked rather than asserted.
 */
export {
  FIRST_OR_SECOND_PERSON,
  NARRATION_MARKERS,
  SELECTION_NON_ARTIFACTS,
  SELECTION_SEPARATOR,
} from "../../lib/owner-words.ts"
