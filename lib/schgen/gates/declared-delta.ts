/**
 * **A PERMITTED ELECTRICAL CHANGE IS DERIVED FROM A DECLARED TRANSFORMATION AND NEVER FROM AN
 * OUTPUT.** This module is the rule in code rather than in prose, and the review sentence that
 * earned it is the reason, verbatim:
 *
 * > *"waiting until generated schematics exist to enumerate their differences creates precisely
 * > the provenance risk gate 8 is supposed to prevent: a generator defect could be retrospectively
 * > classified as an intended change."*
 *
 * `docs/known-gaps.md` **G104** records the argument that was withdrawn and why. The invariant
 * underneath is `CLAUDE.md`'s: **an agent may never author the acceptance criteria for the artifact
 * it is producing.** A delta list written from a parity census is a list of differences chosen by
 * the thing being graded, and the gate whose whole value is that *"an undeclared difference fails
 * by construction"* would have had nothing left to fail on.
 *
 * **THE FOUR THINGS THAT MAKE IT A RULE AND NOT A WISH.**
 *
 * 1. **`DeclaredDelta.from` NAMES THE TRANSFORMATION AND HAS NO DEFAULT.** There is no constructor
 *    anywhere that omits it: `parseDeclaredDeltas` is the only way to obtain a `PermittedDelta`
 *    with deltas in it, and it refuses a blank `from`.
 * 2. **THE FILE MUST BE COMMITTED.** A delta list edited in a working tree and not committed is
 *    exactly the provenance hole: it can be written after the difference is seen and before the
 *    gate is run, and nothing in the history would show it. `parseDeclaredDeltas` refuses a file
 *    git does not have at `HEAD`, and refuses a declaration whose text differs from `HEAD`'s.
 * 3. **THERE IS NO CODE PATH FROM A GRAPH TO A DELTA.** This module does not import
 *    `reference-graph.ts`, does not name `ReferenceGraph` or `graphFromNetlist`, and takes no graph
 *    in any signature - so a delta cannot be computed from the output being graded even by
 *    accident. `tests/schgen/gates/declared-delta.test.ts` asserts the absence over this file's own
 *    text, which is the only form of that claim a check can hold.
 * 4. **AN EMPTY DECLARED LIST IS REFUSED, not read as "nothing is permitted".** `{"kind":"empty"}`
 *    says *no electrical change at all* and is M1's whole answer; `{"kind":"declared","deltas":[]}`
 *    says the same thing in a shape that invites an entry to be appended, and the two must not be
 *    spellable two ways.
 *
 * **WHAT APPLYING A DELTA WOULD DO IS M2's AND IS NOT HERE.** `GraphEdit` is parsed and validated;
 * nothing applies one. `checkReferenceGraph` REFUSES a `declared` permitted delta rather than
 * ignoring its entries, because silently comparing two graphs while holding a list of edits nobody
 * applied would be the worst available outcome - a pass that means nothing. M1's half of gate 8 is
 * the EMPTY delta (spec revision 4), and the Pultec's transformation manifest, derived from
 * `circuits/pultec/partition.ts`'s declared transformations and never from a generated drawing, is
 * M2's. **`docs/known-gaps.md` G242 records that this module's `declared` arm is exercised only by
 * its own tests** - the state **G226** names - with the precondition that would wire it and what
 * its absence costs.
 *
 * **ONE DELIBERATE DUPLICATION, RECORDED RATHER THAN TIDIED.** `lib/schgen/gates/oscar/boundary.ts`
 * declares `DeltaEdit`, the OSCAR shape, whose five kinds carry the same payloads as `GraphEdit`'s
 * plus their own `delta` (a CORE-BRIEF id) and `why`. They are not unified here because unifying
 * them means choosing M2's provenance channel - a CORE-BRIEF id against this module's `from` - and
 * that choice belongs with the CORE-BRIEF reader, which is not ported. **`docs/known-gaps.md`
 * G242, item three, holds the reconciliation open with its price**, which is that an edit kind
 * added to one union and not the other is a silent divergence nothing checks.
 */
import { execFileSync } from "node:child_process"
import path from "node:path"
import { isRecord, rejectUnknown } from "../strict.ts"

/** `"PART.PIN"`, or `"new:<NAME>"` for a net a declared transformation introduces. */
export type NetRef = string

/**
 * One graph-level edit a declared transformation produces. The five kinds are
 * `gates/oscar/boundary.ts`'s `DeltaEdit` kinds without its CORE-BRIEF fields - see this file's
 * header on why the two are not yet one type.
 *
 * **Nothing applies one.** They are parsed so that a declaration can be checked, refused and read;
 * applying them to a reference graph is M2's.
 */
export type GraphEdit =
  | { readonly kind: "setValue"; readonly part: string; readonly value: string }
  | { readonly kind: "removePart"; readonly part: string }
  | { readonly kind: "addPart"; readonly part: string; readonly value: string; readonly pins: Readonly<Record<string, NetRef>> }
  | { readonly kind: "mergeNets"; readonly keep: NetRef; readonly drop: NetRef }
  | { readonly kind: "movePin"; readonly part: string; readonly pin: string; readonly to: NetRef }

export const GRAPH_EDIT_KINDS: readonly string[] = ["setValue", "removePart", "addPart", "mergeNets", "movePin"]

/**
 * Spec §2 rev 4: a delta is derived from a declared TRANSFORMATION, never from an output.
 * `from` names the transformation that produces it. There is no constructor that omits it.
 */
export interface DeclaredDelta {
  readonly id: string
  /** The transformation: e.g. "partition: removes other sections". Never blank. */
  readonly from: string
  readonly why: string
  readonly edit: GraphEdit
}

export type PermittedDelta =
  /** M1: no electrical change at all. A circuit rendered from its own model has nothing to differ by. */
  | { readonly kind: "empty" }
  /** M2: the transformation manifest. */
  | { readonly kind: "declared"; readonly deltas: readonly DeclaredDelta[] }

/** The shorthand for M1's answer, so a caller never has to spell a literal that could drift. */
export const EMPTY_DELTA: PermittedDelta = { kind: "empty" }

export const DELTA_FILE_KEYS: readonly string[] = ["kind", "deltas"]
export const DELTA_KEYS: readonly string[] = ["id", "from", "why", "edit"]

/** `git -C <dir> <args>`, or null when git itself could not be run (not when it exits non-zero). */
function git(dir: string, args: readonly string[]): string | null {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  } catch {
    return null
  }
}

/**
 * **THE PROVENANCE CHECK: the declaration being read must be the one in the repository's
 * history.**
 *
 * Two refusals and they are different failures. `HEAD:<path>` missing means the list was never
 * committed - it could have been written after the difference was seen. `HEAD:<path>` differing
 * from the text being parsed means it was committed once and has been edited since, which is the
 * same hole with a history in front of it.
 *
 * **It refuses rather than defaulting when git cannot be run at all.** A delta list whose
 * provenance could not be established is not a delta list: `CLAUDE.md`'s rule for missing
 * functionality is a named throw and never a fallback.
 *
 * **IT COMPARES `HEAD` AGAINST THE TEXT BEING PARSED, NOT AGAINST THE FILE ON DISK, and the first
 * version of this function did the latter.** That version could not fail for a caller who passed
 * text from anywhere: it read the path's bytes itself, found them equal to `HEAD`'s, and then
 * `parseDeclaredDeltas` went on to parse the `json` argument - which nothing had checked. The
 * guarantee this gate needs is about the DECLARATION IT READ, so that is what is compared.
 * `tests/schgen/gates/declared-delta.test.ts`'s *"bytes on disk have been edited since"* case is
 * what caught it, by passing a committed path with uncommitted text.
 */
function assertCommitted(json: string, file: string): void {
  const abs = path.resolve(file)
  const dir = path.dirname(abs)
  const top = git(dir, ["rev-parse", "--show-toplevel"])
  if (top === null) {
    throw new Error(
      `the permitted-delta declaration ${file} cannot be checked for provenance: git could not be ` +
        "run in its directory. Gate 8 admits a delta only because a committed declaration says a " +
        "transformation produces it, so an unverifiable declaration is refused rather than trusted.",
    )
  }
  const root = top.trim()
  const rel = path.relative(root, abs)
  const committed = git(root, ["show", `HEAD:${rel}`])
  if (committed === null) {
    throw new Error(
      `the permitted-delta declaration ${rel} is NOT COMMITTED (git has no HEAD:${rel}). A list of ` +
        "permitted electrical changes that exists only in a working tree can be written after the " +
        "difference is seen and leaves no trace in the history, which is the provenance risk gate 8 " +
        "exists to prevent. Commit the declaration, then run the gate.",
    )
  }
  if (committed !== json) {
    throw new Error(
      `the permitted-delta declaration being read differs from the committed HEAD:${rel}. The gate ` +
        "reads the declaration that is in the HISTORY, and an uncommitted edit to it is the same " +
        "provenance hole as an uncommitted file. Commit the change, then run the gate. (This " +
        "compares HEAD against the text passed in, not against the path's current bytes: a check " +
        "of the path against itself could not fail for a caller that passed text from elsewhere.)",
    )
  }
}

function parseEdit(v: unknown, where: string): GraphEdit {
  if (!isRecord(v)) throw new Error(`${where}: "edit" must be an object with a "kind"`)
  const kind = v["kind"]
  const str = (key: string): string => {
    const x = v[key]
    if (typeof x !== "string" || x.trim() === "") throw new Error(`${where}: a ${String(kind)} edit needs a non-blank "${key}"`)
    return x
  }
  switch (kind) {
    case "setValue":
      rejectUnknown(v, ["kind", "part", "value"], where)
      return { kind: "setValue", part: str("part"), value: str("value") }
    case "removePart":
      rejectUnknown(v, ["kind", "part"], where)
      return { kind: "removePart", part: str("part") }
    case "addPart": {
      rejectUnknown(v, ["kind", "part", "value", "pins"], where)
      const pins = v["pins"]
      if (!isRecord(pins) || Object.keys(pins).length === 0) throw new Error(`${where}: an addPart edit needs a non-empty "pins" object`)
      const out: Record<string, NetRef> = {}
      for (const [pin, net] of Object.entries(pins)) {
        if (typeof net !== "string" || net.trim() === "") throw new Error(`${where}: addPart pin "${pin}" needs a non-blank net reference`)
        out[pin] = net
      }
      return { kind: "addPart", part: str("part"), value: str("value"), pins: out }
    }
    case "mergeNets":
      rejectUnknown(v, ["kind", "keep", "drop"], where)
      return { kind: "mergeNets", keep: str("keep"), drop: str("drop") }
    case "movePin":
      rejectUnknown(v, ["kind", "part", "pin", "to"], where)
      return { kind: "movePin", part: str("part"), pin: str("pin"), to: str("to") }
    default:
      throw new Error(`${where}: unknown edit kind ${JSON.stringify(kind)} (allowed: ${GRAPH_EDIT_KINDS.join(", ")})`)
  }
}

function parseDelta(v: unknown, file: string, i: number): DeclaredDelta {
  const where = `${file}: deltas[${i}]`
  if (!isRecord(v)) throw new Error(`${where} must be an object`)
  rejectUnknown(v, DELTA_KEYS, where)
  const id = v["id"]
  if (typeof id !== "string" || id.trim() === "") throw new Error(`${where} has no "id"; every permitted delta is named so it can be cited`)
  const from = v["from"]
  if (typeof from !== "string" || from.trim() === "") {
    throw new Error(
      `${where} (${id}) names no TRANSFORMATION: "from" is absent or blank. A permitted electrical ` +
        "change is admitted because a declared transformation produces it, and the transformation is " +
        'named - e.g. "partition: removes other sections". A difference found by looking at a ' +
        "generated drawing is a DEFECT REPORT, never an entry here: see this module's header and " +
        "docs/known-gaps.md G104.",
    )
  }
  const why = v["why"]
  if (typeof why !== "string" || why.trim() === "") {
    throw new Error(`${where} (${id}) has no "why"; a delta states why the transformation produces it, never only that it does`)
  }
  return { id, from, why, edit: parseEdit(v["edit"], `${where} (${id})`) }
}

/**
 * The permitted delta a COMMITTED declaration file states, or a refusal.
 *
 * `json` is the file's text and `file` is its path; both are taken because the provenance check
 * compares the two and a caller that passed text from somewhere else would be defeating it.
 */
export function parseDeclaredDeltas(json: string, file: string): PermittedDelta {
  assertCommitted(json, file)
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!isRecord(parsed)) throw new Error(`${file} must hold an object with a "kind" of "empty" or "declared"`)
  rejectUnknown(parsed, DELTA_FILE_KEYS, file)
  const kind = parsed["kind"]
  if (kind === "empty") {
    if ("deltas" in parsed) throw new Error(`${file}: kind "empty" means no electrical change at all, so it may not carry "deltas"`)
    return EMPTY_DELTA
  }
  if (kind !== "declared") throw new Error(`${file}: unknown kind ${JSON.stringify(kind)} (allowed: empty, declared)`)
  const deltas = parsed["deltas"]
  if (!Array.isArray(deltas)) throw new Error(`${file}: kind "declared" needs a "deltas" array`)
  if (deltas.length === 0) {
    throw new Error(
      `${file}: kind "declared" with an empty "deltas" array says the same thing as kind "empty" in a ` +
        'shape that invites an entry. Write {"kind":"empty"} when no electrical change is permitted.',
    )
  }
  const out = deltas.map((d, i) => parseDelta(d, file, i))
  const seen = new Set<string>()
  for (const d of out) {
    if (seen.has(d.id)) throw new Error(`${file}: two deltas share the id "${d.id}"; an id is how a delta is cited and must be unique`)
    seen.add(d.id)
  }
  return { kind: "declared", deltas: out }
}

/** How a permitted delta reads in a gate's result, so a report never has to render the union itself. */
export function describePermitted(p: PermittedDelta): string {
  return p.kind === "empty"
    ? "empty: no electrical change is permitted"
    : `declared: ${p.deltas.length} delta(s) - ${p.deltas.map((d) => `${d.id} from ${d.from}`).join("; ")}`
}
