/**
 * THE TWO `HC8` INVARIANTS, MOVED INWARD: a precondition on every candidate,
 * checked before it is scored.
 *
 *   1. **no short** - no copper-connected component holds terminals of two
 *      different reference nets;
 *   2. **no open** - every reference net's terminals lie in one component.
 *
 * **THEY ARE NOT NEW, AND SAYING SO IS THE POINT.** They are `HC8`, whose
 * authority is `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * and whose existing implementation is `tools/stripboard/equivalence.ts`, with a
 * negative-fixture suite and a geometry contract behind it. **What changes here
 * is WHERE they are applied**, not what they say: that module grades an EXPORTED
 * artifact, parsing a `.vrt` dump and reconstructing the copper from the fork's
 * own geometry export. This one grades a `Candidate` in memory, from
 * `./connectivity.ts`'s partition.
 *
 * **WHY THAT MAKES IT AFFORDABLE PER CANDIDATE, with the figure attributed where
 * it belongs.** The ~12 ms the design document prices this move at is the cost of
 * ONE FORK INVOCATION, measured over the old search's 126,435 launches for 20,000
 * evaluations. `netlistEquivalence` itself spawns nothing - it reads text. But
 * the text has to come from somewhere, and its only producer is a `--dump-board`
 * run of the fork, so asking `HC8` about a candidate meant exporting the
 * candidate first. Nothing here exports anything.
 *
 * **THE VOCABULARY IS DELIBERATELY THAT MODULE'S.** `OpenViolation` is its
 * `OpenFinding` and `ShortViolation` is its `ShortFinding`, down to the field
 * names - `net` and `groups` for an open, `nets` and `hole` for a short - so a
 * reader who has learnt one does not have to learn the other and the two can be
 * compared finding for finding. Three deviations, each stated rather than left
 * for somebody to notice:
 *
 *   - **The two findings are ONE flat list with a `kind` tag**, not an
 *     `EquivalenceVerdict`'s two fields plus an `equivalent` boolean. The plan's
 *     signature is `violationsOf(...): readonly Violation[]` and "empty when both
 *     invariants hold", so `equivalent` would be `violations.length === 0`
 *     restated - a second spelling of one fact, which is the shape this
 *     repository deletes.
 *   - **Each group of an open names its COMPONENT ID, and a short names one
 *     too.** `OpenFinding.groups` is pins only; it sorts BY component and then
 *     drops the number. Here the ids mean something a reader can act on -
 *     `componentsOf` assigns them in grid order over the candidate's own holes,
 *     so the id is reproducible from the candidate - and the plan asks for a
 *     violation that names the net AND the component.
 *   - **There is no `contractVersion`.** That field is the version of the DUMP
 *     GEOMETRY CONTRACT - which lines a `.vrt` dump must print - and no dump is
 *     read here. Carrying it would claim a provenance this check does not have.
 *
 * **IT READS THE PARTITION, NEVER A DECLARED LABEL.** `componentsOf` is phase 2
 * of the derivation: built fresh from the cuts, the wires and the bridges, from
 * geometry alone. Phase 1 (`./cuts.ts`) built those cuts from DECLARED net
 * identity. These invariants are phase 2's consumers, and they must not reach
 * back for phase 1's labels: **a candidate whose declared nets agree with its
 * wiring but whose geometry does not is exactly what they exist to catch**, and a
 * check that compared declared labels with declared labels would agree with
 * itself on every board. So the only two things read are the reference netlist -
 * upstream of the candidate entirely - and the partition.
 *
 * **WHAT A VIOLATION IS, AND WHAT A REFUSAL IS.** A violation is a board that
 * could be built and would not work: the geometry is legible and wrong. A
 * refusal is a candidate this check cannot grade at all - a reference pin no
 * placement puts in a hole, a pin two nets claim, a lead off the stock. `HC8`
 * draws the line in the same place and for the stated reason: reporting a pin
 * that is nowhere as a net split in two names the wrong constraint and points at
 * the wrong fix.
 *
 * **A PAD PLACEMENT'S IDENTITY IS ITS `ref` AND ITS PIN NAME.** An off-board part
 * with three terminals is three placements sharing one `ref`
 * (`tools/stripboard/vero-import.ts` records why), so the pin map below is keyed
 * `${ref}.${pin}` and never by `ref` alone - which would collapse the three to one
 * entry, and a lookup for a reference pin would then find the wrong hole or none.
 * The pair is formed by `./pin-id.ts`, the one place in this model it is spelled,
 * so the key here and the `PAD` statement the exporter writes cannot drift apart.
 * **Measured, not reasoned to:** that mutation is one of the eleven
 * `tests/stripboard/model/invariants.test.ts` records running, and it failed 27
 * assertions across the two test files.
 */
import type { Candidate, Hole } from "./board.ts"
import { componentsOf } from "./connectivity.ts"
import { holeKey, type Cut, type ReferenceNets } from "./cuts.ts"
import { pinId } from "./pin-id.ts"

/**
 * One reference net whose terminals fell into two or more components - an OPEN.
 *
 * `groups` is the net's pins grouped by the component each landed in, in
 * ascending component order with each group's pins sorted, so two runs over equal
 * candidates produce equal findings.
 */
export interface OpenViolation {
  readonly kind: "open"
  readonly net: string
  readonly groups: readonly OpenGroup[]
}

/** One component an open net reaches, and which of its pins landed there. */
export interface OpenGroup {
  readonly component: number
  readonly pins: readonly string[]
}

/**
 * Two or more reference nets sharing one component - a SHORT.
 *
 * `hole` is one hole of the shared component, as the witness a reader can go and
 * look at: the lexicographically smallest pin's hole, declared so that two runs
 * over one candidate name the same hole.
 */
export interface ShortViolation {
  readonly kind: "short"
  readonly nets: readonly string[]
  readonly component: number
  readonly hole: string
}

export type Violation = OpenViolation | ShortViolation

function refuse(key: string, body: string): never {
  throw new Error(`${key}: ${body}`)
}

/**
 * Appended to the refusals that are about the candidate rather than the
 * reference.
 *
 * It says what is downstream, because that is what makes the refusal actionable:
 * these invariants are a PRECONDITION, so a candidate that cannot be graded here
 * must not reach the scorer at all.
 */
const WHY_NOT_SKIPPED =
  "The pin is not skipped: a reference pin left out of this partition is a terminal neither " +
  "invariant can see, so a net that is genuinely split would read as whole and a candidate " +
  "that cannot be built would be scored and kept"

/**
 * Every placed pin's hole, keyed `${ref}.${pin}` - the way the reference netlist
 * names a pin.
 *
 * **KEYED BY `ref` AND PIN, NEVER BY `ref`.** Two placements may legitimately
 * share one `ref` (an off-board part's expanded pads), and a map keyed by `ref`
 * would keep whichever came last and resolve the rest to the wrong hole without
 * refusing.
 */
function holesByPin(candidate: Candidate): ReadonlyMap<string, Hole> {
  const holes = new Map<string, Hole>()
  for (const placement of candidate.placements) {
    for (const [pin, hole] of placement.pins) {
      const id = pinId(placement.ref, pin)
      const already = holes.get(id)
      if (already !== undefined) {
        const [first, second] = [holeKey(already), holeKey(hole)].sort()
        refuse(
          "stripboard-invariants-pin-declared-twice",
          `two placements both put "${id}" in a hole - ${first} and ${second} - so the ` +
            "candidate states two positions for one lead.\nFix whichever built the candidate: " +
            "an off-board part's terminals are separate placements that share a ref, and their " +
            "identity is the ref AND the pin name, so two placements naming one pin are a " +
            "duplicate rather than two terminals (tools/stripboard/vero-import.ts states the " +
            "convention).\nNeither hole is preferred: which one the candidate meant is not in " +
            "the candidate, and grading the wrong one would report a short or an open on a " +
            "board nobody described.",
        )
      }
      holes.set(id, hole)
    }
  }
  return holes
}

/**
 * Each reference net's pins mapped to the component they landed in, refusing
 * every input this check cannot grade.
 *
 * The three refusals about the reference are `HC8`'s own, under this module's
 * keys; the two about the candidate have no counterpart there, because a
 * `Candidate` is an input `equivalence.ts` never sees.
 */
function componentsByNet(
  candidate: Candidate,
  reference: ReferenceNets,
  components: ReadonlyMap<string, number>,
  holes: ReadonlyMap<string, Hole>,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  if (reference.size === 0) {
    refuse(
      "stripboard-invariants-empty-reference",
      "the reference netlist has no nets, so there is nothing to partition the candidate's " +
        "copper against.\nPass the nets from the netlist export, or fix the export that " +
        "produced none.\nIt does not return no violations: every net of an empty reference is " +
        "trivially whole and no component holds two of them, so the answer would be `sound` " +
        "for ANY candidate at all - a pass that looks exactly like a real one, on a board the " +
        "search would then keep.",
    )
  }
  const netByPin = new Map<string, string>()
  const byNet = new Map<string, ReadonlyMap<string, number>>()
  for (const [net, pins] of reference) {
    if (pins.length === 0) {
      refuse(
        "stripboard-invariants-empty-reference-net",
        `reference net "${net}" lists no pins, so it cannot be shown whole or split.\nFix the ` +
          "netlist export that emitted it.\nIt is not treated as satisfied: grading a net with " +
          "no members is grading nothing while reporting a result, and the net a schematic " +
          "drew would then be unrepresented in both invariants.",
      )
    }
    const byPin = new Map<string, number>()
    for (const pin of pins) {
      const claimed = netByPin.get(pin)
      if (claimed !== undefined && claimed !== net) {
        const [first, second] = [claimed, net].sort()
        refuse(
          "stripboard-invariants-pin-on-two-nets",
          `"${pin}" is on reference net "${first}" and again on reference net "${second}", so ` +
            "this reference cannot be true of any board.\nFix it in the netlist export, or in " +
            "the schematic it came from.\n**It is not reported as a short, and that is the " +
            "whole reason this refusal is here**: measured on tools/stripboard/equivalence.ts " +
            "before its export reader grew the same guard, a pin listed on two nets produced a " +
            "SHORT finding " +
            "on a board whose copper was correct - so the remedy a reader would act on was a " +
            "layout change when there was nothing wrong with the layout.\nNeither listing is " +
            "preferred: which one the schematic meant is not in the input.",
        )
      }
      netByPin.set(pin, net)
      byPin.set(pin, componentOf(pin, holes, components, candidate))
    }
    byNet.set(net, byPin)
  }
  return byNet
}

/** Which component one reference pin's lead is in, refusing by name when it has none. */
function componentOf(
  pin: string,
  holes: ReadonlyMap<string, Hole>,
  components: ReadonlyMap<string, number>,
  candidate: Candidate,
): number {
  const hole = holes.get(pin)
  if (hole === undefined) {
    refuse(
      "stripboard-invariants-reference-pin-not-placed",
      `"${pin}" is a reference pin and no placement on this candidate puts it in a hole.\nFix ` +
        "whichever built the candidate, or the netlist export it was built against - a " +
        "candidate is a whole board state, so a part the reference names and the board does " +
        "not place is an incomplete candidate rather than a board with a fault.\nIt is NOT an " +
        "open: a terminal that is nowhere is not a net split across two pieces of copper, and " +
        `reporting it as one would name the wrong constraint and point at the wrong fix - the ` +
        `same line HC8 draws, for the same reason.\n${WHY_NOT_SKIPPED}.`,
    )
  }
  const component = components.get(holeKey(hole))
  if (component === undefined) {
    refuse(
      "stripboard-invariants-pin-hole-off-grid",
      `"${pin}" has its lead in hole ${holeKey(hole)}, and that hole is not in the candidate's ` +
        `copper partition - the grid is ${candidate.grid.strips} strips of ` +
        `${candidate.grid.columns} holes, and componentsOf covers every one of them.\nFix ` +
        "whichever built the candidate: a lead off the stock is a board that cannot be made, " +
        "and the stock size is the one thing a layout cannot negotiate.\nIt is not clamped to " +
        `the nearest hole: a clamped lead puts a terminal where no terminal is.\n` +
        `${WHY_NOT_SKIPPED}.`,
    )
  }
  return component
}

/**
 * INVARIANT 2: every reference net's terminals lie in one component.
 *
 * A net whose pins span two or more components, with the pins grouped by the
 * component they landed in.
 */
function opens(byNet: ReadonlyMap<string, ReadonlyMap<string, number>>): readonly OpenViolation[] {
  const found: OpenViolation[] = []
  for (const net of [...byNet.keys()].sort()) {
    // Cannot be undefined: the key came from this map's own key list.
    const byPin = byNet.get(net) ?? new Map<string, number>()
    const pinsByComponent = new Map<number, string[]>()
    for (const [pin, component] of byPin) {
      const group = pinsByComponent.get(component) ?? []
      group.push(pin)
      pinsByComponent.set(component, group)
    }
    if (pinsByComponent.size < 2) continue
    const groups = [...pinsByComponent.entries()]
      .sort(([a], [b]) => a - b)
      .map(([component, pins]) => ({ component, pins: [...pins].sort() }))
    found.push({ kind: "open", net, groups })
  }
  return found
}

/**
 * INVARIANT 1: no component holds terminals of two different reference nets.
 *
 * **A COMPLETENESS CHECK IS STRUCTURALLY BLIND TO THIS**, which is the whole
 * reason the invariant is stated separately: joining two nets leaves BOTH of them
 * reading complete, so a check that only asks whether each net is whole has
 * nothing to report. `tools/stripboard/equivalence.ts`'s module comment records
 * the same, against the fork's own `HC1`-`HC7`.
 */
function shorts(
  byNet: ReadonlyMap<string, ReadonlyMap<string, number>>,
  holes: ReadonlyMap<string, Hole>,
): readonly ShortViolation[] {
  const netsByComponent = new Map<number, Set<string>>()
  const witnessByComponent = new Map<number, string>()
  for (const [net, byPin] of byNet) {
    for (const [pin, component] of byPin) {
      const nets = netsByComponent.get(component) ?? new Set<string>()
      nets.add(net)
      netsByComponent.set(component, nets)
      // The witness is the lexicographically smallest pin in the component, so
      // two runs over one candidate name the same hole - the convention
      // `ShortFinding.hole` already declares.
      const witness = witnessByComponent.get(component)
      if (witness === undefined || pin < witness) witnessByComponent.set(component, pin)
    }
  }
  const found: ShortViolation[] = []
  for (const [component, nets] of [...netsByComponent.entries()].sort(([a], [b]) => a - b)) {
    if (nets.size < 2) continue
    const witness = witnessByComponent.get(component)
    const hole = witness === undefined ? undefined : holes.get(witness)
    if (witness === undefined || hole === undefined) {
      // **THIS IS A TYPE NARROWING AND NOT A GUARD, and it is said plainly
      // because the plan deleted a guard that could never fire.** The two maps
      // above are written in one loop over the same pins, and every one of those
      // pins already resolved to a hole in `componentOf` or the whole call
      // refused - so no candidate reaches this branch. It is here because
      // `Map.get` is typed `number | undefined` and this repository forbids `as`
      // and `@ts-ignore`, which leaves a throw as the only way to narrow it.
      // `tools/stripboard/equivalence.ts` carries the same throw, under the word
      // `unreachable`, for the same reason. A mutation run cannot kill it and no
      // test asserts it; its key is listed in the test file's refusal table as
      // unreachable rather than left looking like a checked one.
      throw new Error(
        `stripboard-invariants-witness-missing: unreachable - component ${component} holds ` +
          `${nets.size} reference nets (${[...nets].sort().join(", ")}) and no pin of its own, ` +
          "which cannot happen because those nets were recorded pin by pin.\nFix " +
          "lib/stripboard/invariants.ts: reaching here means the net walk and the witness walk " +
          "disagree, so neither may be trusted.\nIt is not reported without a witness: a short " +
          "a reader cannot go and look at is a finding they cannot act on.",
      )
    }
    found.push({ kind: "short", nets: [...nets].sort(), component, hole: holeKey(hole) })
  }
  return found
}

/**
 * The two invariants over one candidate and one cut list - **empty exactly when
 * both hold**.
 *
 * **THE CUTS ARE A PARAMETER AND ARE NOT DERIVED HERE**, for the reason
 * `./score.ts` gives for taking the cut count rather than re-deriving it: the
 * search derives the cuts once per candidate and then both checks and scores
 * them, so deriving them again inside the check would double the only
 * non-trivial work in the loop. It is also what makes the check USEFUL: handed a
 * cut list that is not the one `derivedCuts` would produce - a stale list, or
 * one a move generator carried over from the candidate it mutated - the
 * invariants report what that board would actually do, which is the question.
 *
 * **OPENS FIRST, THEN SHORTS; opens by net name, shorts by component id.** A
 * declared order, so two runs over equal candidates return equal lists and a
 * test may compare two results directly. It is the order `describeVerdict`
 * renders `HC8`'s findings in.
 */
export function violationsOf(
  candidate: Candidate,
  cuts: readonly Cut[],
  reference: ReferenceNets,
): readonly Violation[] {
  const components = componentsOf(candidate, cuts)
  const holes = holesByPin(candidate)
  const byNet = componentsByNet(candidate, reference, components, holes)
  return [...opens(byNet), ...shorts(byNet, holes)]
}

/**
 * One line per violation, naming the net or nets and the components - the
 * counterpart of `describeVerdict`, and deliberately close to its wording.
 *
 * A candidate that holds both invariants has no violations and so renders no
 * lines.
 */
export function describeViolations(violations: readonly Violation[]): readonly string[] {
  return violations.map((violation) => {
    if (violation.kind === "open") {
      const groups = violation.groups
        .map((group) => `component ${group.component} {${group.pins.join(", ")}}`)
        .join(" | ")
      return (
        `OPEN: reference net "${violation.net}" has terminals in ${violation.groups.length} ` +
        `separate copper components: ${groups}. The candidate does not join them, so this net ` +
        "is not whole."
      )
    }
    const nets = violation.nets.map((net) => `"${net}"`).join(" and ")
    return (
      `SHORT: reference nets ${nets} share copper component ${violation.component}, witnessed ` +
      `at hole ${violation.hole}. A completeness check cannot detect this: joining two nets ` +
      "leaves BOTH of them reading complete, so a check that only asks whether each net is " +
      "whole has nothing to report."
    )
  })
}
