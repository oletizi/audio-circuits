/**
 * THE CONSULTATION: *is this board excused from this rule, and what must be said
 * about it* - plus the audit trail of which entries actually excused something.
 *
 * **ITS OWN FILE FOR THE 500-LINE CEILING, SPLIT AT THE LOAD/CONSULT SEAM.**
 * `./exemptions.ts` and `./exemptions-read.ts` answer *what is in the file*;
 * this one answers *what the file says about a measurement*, and it reads no
 * file at all. `./exemptions.ts` re-exports everything here, so a consumer
 * imports the front door.
 *
 * **AN EXEMPTION MAKES A VIOLATION REPORTED, NOT INVISIBLE**, which is the one
 * decision this module is built around and the owner approved it explicitly.
 * `verdictFor` answers with a DISCRIMINATED UNION and never a boolean, so a
 * consumer cannot get silence by dropping a value on the floor; `noticesOf` is
 * the single call that turns verdicts into the lines a run must print, so a
 * consumer cannot handle one reportable outcome and forget the other. **A silent
 * exemption is a skipped check that looks like a passing one.**
 */
import {
  EXEMPTIONS_FILE,
  type Exemption,
  type ExemptionRegistry,
  type ExemptionVerdict,
  type Measured,
} from "./exemptions-model.ts"

/**
 * THE AUDIT TRAIL: which entries actually excused something in this process.
 *
 * **IT IS NOT A CACHE AND IT IS KEYED BY ENTRY ID RATHER THAN BY REGISTRY
 * INSTANCE**, so every consumer in one process contributes to the same record
 * whichever copy of the registry it loaded. `tests/stripboard/exemptions.test.ts`
 * drives the consumers and then asserts `unconsulted` is empty; an entry nothing
 * measures leaves its id out and that test goes red.
 */
const CONSULTED = new Set<string>()

/** Every entry id that has excused something in this process. */
export function consultedIds(): ReadonlySet<string> {
  return CONSULTED
}

/** The ids in `registry` that nothing in this process has consulted. */
export function unconsulted(registry: ExemptionRegistry): readonly string[] {
  return registry.exemptions.filter((entry) => !CONSULTED.has(entry.id)).map((entry) => entry.id)
}

function exemptNotice(entry: Exemption, measured: Measured): string {
  return (
    `stripboard-exempt: "${measured.subject}" breaks ${measured.rule} in ` +
    `${measured.places.length} place(s) - ${measured.places.join(", ")} - and is EXEMPT: ` +
    `${entry.subjectKind}, granted by ${entry.grantedBy} on ${entry.grantedOn}, ` +
    `${EXEMPTIONS_FILE} entry "${entry.id}". Reported rather than excused away - the board is ` +
    "built and in use, and the rule still binds every board the tooling generates."
  )
}

function unexcusedComplaint(
  measured: Measured,
  covering: Exemption | undefined,
): string {
  const head =
    `stripboard-unexcused: "${measured.subject}" breaks ${measured.rule} in ` +
    `${measured.places.length} place(s) - ${measured.places.join(", ")} - and no recorded ` +
    "exemption covers it: "
  const middle =
    covering === undefined
      ? `${EXEMPTIONS_FILE} has no entry for this subject.`
      : `entry "${covering.id}" is over this subject but is only from ` +
        `${covering.from.join(" and ")}, and an exemption is from NAMED rules.`
  return (
    head +
    middle +
    ` Only the owner may grant one, recorded in ${EXEMPTIONS_FILE} with its reason and ` +
    "provenance; nothing is excused by a consultation that found nothing."
  )
}

/**
 * Consult the registry about one measured rule on one subject.
 *
 * **IT ANSWERS WITH A VERDICT AND NEVER A BOOLEAN**, so a consumer cannot get
 * silence by dropping a value: every member of the union is an object, the
 * outcome has to be discriminated, and the two outcomes with something to say
 * carry the text that says it. `noticesOf` turns a list of verdicts into the
 * lines a run must print.
 *
 * `clean` consults nothing - with no violation there is nothing to excuse, so an
 * entry does not get to look used by a board that did not need it.
 */
export function verdictFor(registry: ExemptionRegistry, measured: Measured): ExemptionVerdict {
  const { subject, rule, places } = measured
  if (places.length === 0) return { outcome: "clean", subject, rule }

  const covering = registry.exemptions.find((entry) => entry.subject === subject)
  if (covering === undefined || !covering.from.includes(rule)) {
    return {
      outcome: "unexcused",
      subject,
      rule,
      count: places.length,
      places,
      complaint: unexcusedComplaint(measured, covering),
    }
  }
  CONSULTED.add(covering.id)
  return {
    outcome: "exempt",
    subject,
    rule,
    count: places.length,
    places,
    exemption: covering,
    notice: exemptNotice(covering, measured),
  }
}

/**
 * The lines a run MUST report, in the order the verdicts were reached.
 *
 * **ONE CALL, SO A CONSUMER CANNOT HANDLE THE EXEMPT CASE AND FORGET THE
 * UNEXCUSED ONE** - or the reverse, which is the worse direction. A `clean`
 * verdict contributes nothing, which is the only silence this module admits.
 */
export function noticesOf(verdicts: readonly ExemptionVerdict[]): readonly string[] {
  const lines: string[] = []
  for (const verdict of verdicts) {
    if (verdict.outcome === "exempt") lines.push(verdict.notice)
    else if (verdict.outcome === "unexcused") lines.push(verdict.complaint)
  }
  return lines
}
