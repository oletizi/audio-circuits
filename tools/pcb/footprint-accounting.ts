/**
 * EVERY FOOTPRINT THAT LEFT A BOARD OR ARRIVED ON IT IS ACCOUNTED FOR BY NAME.
 *
 * `after === (before - removed) + added`, checked over the board's own bytes
 * both sides of an edit, with every discrepancy named rather than counted.
 *
 * **WHY THIS IS A SEPARATE, PURE FUNCTION AND NOT THREE LINES INSIDE THE TOOL
 * THAT EDITS THE BOARD.** `./place-mounting-holes.ts` carried a guard that
 * compared the number of forms its removal callback had dropped against the
 * number it had recorded. This task's reviewer called that nearly tautological
 * and was right: the count and the record are pushed adjacent to each other, so
 * the guard catches the next `return true` added without a matching push and
 * nothing else - not a wrong predicate, which is the defect that actually
 * happened twice. Worse, **no committed test could reach its throw**, because
 * within correct code the two can only be made to disagree by editing the
 * source. Its only evidence was a mutation run in a transcript, which is the
 * shape of thing this plan has spent a week catching.
 *
 * A pure function over four arguments can be driven to every one of its
 * refusals from a test, with no source mutation and no board on disk - which is
 * what `tests/pcb/footprint-accounting.test.ts` does. And because it compares
 * the SETS rather than trusting the editing mechanism's own bookkeeping, it is
 * independent of how the edit was made: a footprint dropped by a path nobody
 * remembered to instrument still shows up here.
 *
 * **KEYED ON uuid, NOT ON REFERENCE.** Two footprints can share a reference -
 * a board mid-edit, a hand-placed duplicate - and a reference-keyed set would
 * silently collapse them, which is exactly the kind of quiet loss this module
 * exists to make loud. KiCad writes a uuid on every footprint; one without a
 * uuid is refused rather than skipped.
 */
import { parseSexpr } from "../../lib/kicad/sexpr.ts"

/** One footprint on a board: its uuid, and a label a person can read. */
export interface FootprintIdentity {
  readonly uuid: string
  /** `REF (Library:Name)`, for refusal messages. */
  readonly label: string
}

/** Every footprint on a board, by uuid. Refuses one with no uuid. */
export function footprintsOf(boardText: string, where: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const footprint of parseSexpr(boardText).nodes.filter((n) => n.name === "footprint")) {
    const library = footprint.atoms[0] ?? "?"
    const reference =
      footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? "?"
    const uuid = footprint.nodes.find((n) => n.name === "uuid")?.atoms[0]
    if (uuid === undefined || uuid === "") {
      throw new Error(
        `${where}: footprint ${reference} (${library}) carries no (uuid ...). This accounting is ` +
          "keyed on uuid because two footprints can share a reference, and a footprint with no " +
          "uuid cannot be told from another one - so it is refused rather than counted, which is " +
          "the quiet loss this module exists to prevent. KiCad writes a uuid on every footprint.",
      )
    }
    if (out.has(uuid)) {
      throw new Error(
        `${where}: two footprints share the uuid ${uuid} (${out.get(uuid) ?? "?"} and ` +
          `${reference} (${library})). A uuid is meant to be unique and this accounting cannot ` +
          "tell them apart.",
      )
    }
    out.set(uuid, `${reference} (${library})`)
  }
  return out
}

function describe(uuids: readonly string[], labels: ReadonlyMap<string, string>): string {
  return uuids.map((uuid) => `${labels.get(uuid) ?? "?"} [${uuid.slice(0, 8)}]`).join(", ")
}

/**
 * Refuses unless `after` is exactly `before` minus `removed` plus `added`.
 *
 * Four ways it can fail, and each is named separately because they mean
 * different things:
 *
 *  - **a footprint vanished and nobody named it** - the silent deletion this
 *    whole module is about;
 *  - **a footprint arrived and nobody named it** - a form written twice, or a
 *    paste that landed where it should not have;
 *  - **something named as removed is still there AND was not re-added** - the
 *    removal did not take, so a caller reporting it has reported a fiction.
 *    Re-adding the same uuid is REPLACEMENT and is legitimate: the
 *    mounting-hole tool derives a hole's uuid from its reference precisely so a
 *    re-run is byte-identical, so it removes MH1 and writes MH1 back every time;
 *  - **something named as added is not there** - a form that did not land,
 *    which is the failure the tool's own read-back check exists for and this
 *    one catches independently of it;
 *  - **something named as removed was not on the board to begin with** - a
 *    credit for something that was never there. This one can only over-report
 *    and never hide a loss, so it is the least dangerous of the five; it is
 *    here because an accounting function that accepts a phantom removal is
 *    wrong at its own job, and because at the moment it mattered it would read
 *    as confusing rather than as a defect.
 *
 * `added` is deliberately NOT required to be absent from `before`: re-adding a
 * uuid that was removed is REPLACEMENT, which is what makes the mounting-hole
 * step byte-idempotent, and the second bullet above already catches an `added`
 * that arrived without a removal because `footprintsOf` refuses the duplicate
 * uuid such a board would carry.
 */
export function verifyFootprintAccounting(opts: {
  readonly before: ReadonlyMap<string, string>
  readonly after: ReadonlyMap<string, string>
  readonly removed: readonly string[]
  readonly added: readonly string[]
  readonly where: string
}): void {
  const labels = new Map([...opts.before, ...opts.after])
  const removed = new Set(opts.removed)
  const added = new Set(opts.added)
  const problems: string[] = []

  const vanished = [...opts.before.keys()].filter((uuid) => !opts.after.has(uuid) && !removed.has(uuid))
  if (vanished.length > 0) {
    problems.push(
      `${vanished.length} footprint(s) LEFT THE BOARD WITHOUT BEING NAMED: ` +
        `${describe(vanished, labels)}`,
    )
  }
  const appeared = [...opts.after.keys()].filter((uuid) => !opts.before.has(uuid) && !added.has(uuid))
  if (appeared.length > 0) {
    problems.push(
      `${appeared.length} footprint(s) ARRIVED WITHOUT BEING NAMED: ${describe(appeared, labels)}`,
    )
  }
  // `- added`, which is the whole of what makes REPLACEMENT expressible. The
  // mounting-hole tool derives each hole's uuid from its reference so that a
  // re-run produces identical bytes, so removing MH1 and writing MH1 back is a
  // remove AND an add of the SAME key. Without this clause the first run of this
  // guard reported all four holes as "reported removed and still on the board",
  // which was the guard being wrong rather than the tool - and it is the one
  // thing about the invariant that is not obvious from `after = before - removed
  // + added` read as prose.
  // A CREDIT FOR SOMETHING THAT WAS NEVER THERE. This can only over-report and
  // never hide a loss, which is why it is the last of the five rather than the
  // first - but an accounting function that accepts a removal of a footprint
  // that was not on the board before the edit is wrong at its own job, and it
  // would read as confusing rather than as a defect at the moment it mattered.
  const phantom = opts.removed.filter((uuid) => !opts.before.has(uuid))
  if (phantom.length > 0) {
    problems.push(
      `${phantom.length} footprint(s) were reported REMOVED but were NOT ON THE BOARD BEFORE the ` +
        `edit: ${describe(phantom, labels)}`,
    )
  }
  const survived = opts.removed.filter((uuid) => opts.after.has(uuid) && !added.has(uuid))
  if (survived.length > 0) {
    problems.push(
      `${survived.length} footprint(s) were reported REMOVED and are still on the board: ` +
        `${describe(survived, labels)}`,
    )
  }
  const missing = opts.added.filter((uuid) => !opts.after.has(uuid))
  if (missing.length > 0) {
    problems.push(
      `${missing.length} footprint(s) were reported ADDED and are not on the board: ` +
        `${describe(missing, labels)}`,
    )
  }

  if (problems.length > 0) {
    throw new Error(
      `${opts.where}: the footprints on this board do not account for the edit that was made.\n  - ` +
        `${problems.join("\n  - ")}\n` +
        `Before: ${opts.before.size} footprint(s); after: ${opts.after.size}; named removed: ` +
        `${opts.removed.length}; named added: ${opts.added.length}. The requirement is that AFTER ` +
        "equals BEFORE minus the named removals plus the named additions - compared over the " +
        "board's own bytes rather than over the editing tool's bookkeeping, so a footprint " +
        "dropped by a path nobody instrumented is still caught.",
    )
  }
}
