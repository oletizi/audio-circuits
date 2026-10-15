/**
 * CONSTRUCTIVE SEEDS: a strip for each net, parts placed so their leads land
 * there, and a wire or a bridge where a net must span.
 *
 * **ONE CANDIDATE PER ORDERING, IN THE ORDER GIVEN, WITH NO RANKING.** That is
 * the shape of this module and the reason for it: the seed may decide
 * placements, and it may not decide which seed is good. `objectiveOf` prices a
 * candidate from the owner's weights and `violationsOf` says whether it is
 * sound; a preference here - an ordering nudged, a rule adjusted because a
 * number came out badly - would be *"an agent authoring the acceptance criteria
 * for the artifact it is producing"*, which is the one thing this repository is
 * built to prevent.
 *
 * **THE STRUCTURE, STATED PLAINLY, BECAUSE IT HAS A CONSEQUENCE THE OBJECTIVE
 * REWARDS AND A PERSON MIGHT NOT.**
 *
 *   1. each net gets a HOME STRIP from the ordering, at `index * stride`;
 *   2. a part's leads land on their own nets' home strips wherever its recorded
 *      span reaches that far, and otherwise on a SCRATCH strip - a strip no net
 *      calls home, claimed by exactly one lead;
 *   3. a net whose leads ended up on several strips has those strips joined,
 *      lowest to highest, by a solder bridge where they are adjacent and a wire
 *      where they are not.
 *
 * **SO NO STRIP EVER CARRIES TWO NETS' LEADS, AND EVERY SEED THIS MODULE
 * PRODUCES HAS ZERO CUTS.** That is a structural property rather than a lucky
 * measurement: `derivedCuts` cuts between adjacent runs of DIFFERENT nets on one
 * strip, a home strip holds only its own net and a scratch strip holds one lead,
 * so each strip is a single run. It is also what the cost function asks for -
 * `rho_w` is 0.25 in `stripboard/rules.json`, one cut for four wires, on the
 * owner's *"favor wires over cuts. cuts are harder and more error prone"* - and
 * the trade it makes is PAID IN BOARD AREA, which `OBJ1`'s closed term list does
 * not price. A seed here spreads across more strips than a person would use.
 * **That is a finding for the owner and not a defect to fix here**: adding an
 * area or wire-length term would be authoring a criterion, and `OBJ2` forbids a
 * tidiness term outright.
 *
 * **WHAT IS CHECKED BEFORE A PLACEMENT IS COMMITTED**, after the owner's rulings:
 *
 *   - **lead reach** - `minSpanHoles`/`maxSpanHoles` from the supplied span map
 *     (`HC5`, `HC9`), for a two-lead part, whose separation is the one geometric
 *     lever it has;
 *   - **holes actually free** - one lead per hole, the owner: *"I would prefer
 *     leads not share holes - it makes building easier."* **Wire and bridge
 *     endpoints take empty holes too, and that is stricter than the owner's rule
 *     needs.** His rule is about leads, and `runsOf` in `./cuts.ts` states that
 *     *"a bridge soldered onto a lead's own hole is the ordinary case"* - so a
 *     shared hole would be legal. It is not used here because the stricter rule
 *     costs nothing on the boards measured and removes a question: all four
 *     wires on `transistor-preamp-feedback` end in holes no lead is in, which is
 *     checked by matching its `WIRE` ends against its own 37 `PIN` lines rather
 *     than read off the layout. Two of its three `SOLDER` lines DO sit on a lead
 *     (`5,5` is `RV1.3`, `7,9` is `R1.1`), so the strictness is this module's
 *     choice and not the owner's practice;
 *   - **the board edge** - every hole inside the declared stock, and every part's
 *     whole rectangle too;
 *   - **nothing routed under a rigid part** - the owner, 2026-10-14: *"Rigid
 *     parts shouldn't be routed through/under."* This is the one HARD geometric
 *     rule, it is checked per candidate column in `./seed-place.ts` and checked
 *     again over the finished board below, and his own two boards hold it in 0
 *     of 85 leads;
 *   - **room to work where there is room** - *"if there's room for parts to have
 *     their own space, they should be given that space"*, which `./seed-area.ts`
 *     applies as a preference order over positions rather than as a cost.
 *
 * **BODY COLLISION IS STILL NOT REFUSED, and the distinction is the whole of how
 * these rules coexist with the earlier ruling.** The owner, 2026-10-14: *"Don't
 * worry about body collisions on the stripboard. It's extremely flexible."* So
 * two bodies overlapping is admitted - his `buffered` board has four such pairs -
 * and what is refused is a LEAD or a lead-bearing placement inside a RIGID
 * part's area, which is routing under it rather than brushing against it.
 *
 * **`Placement.holes` IS STILL EXACTLY `Placement.pins`' HOLES.** The body enters
 * through `./seed-area.ts`, which is a placement RULE, and never through the
 * model's own notion of what a part occupies. `lib/kicad/footprint-extent.ts`
 * and `lib/kicad/formed-frame.ts` are imported again - by
 * `./seed-parts.ts` alone - because the two rules above cannot be applied without
 * knowing how much space a part takes, and those two modules are the only things
 * that derive it from the KiCad files rather than from memory.
 */
import { holesOverlap, type Candidate, type Grid } from "./board.ts"
import { derivedCuts, type ReferenceNets } from "./cuts.ts"
import { describeViolations, violationsOf } from "./invariants.ts"
import { routedUnderRigid } from "./seed-area.ts"
import {
  placementOrder,
  refuse,
  validateNetlist,
  type Ordering,
  type SeedNetlist,
} from "./seed-model.ts"
import { placeFixedField, placeTwoLead } from "./seed-fit.ts"
import { joinNets, workspaceFor } from "./seed-place.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/** One ordering's candidate: placed, joined, and checked before it is handed back. */
function seedFrom(
  netlist: SeedNetlist,
  grid: Grid,
  spans: ReadonlyMap<string, LeadSpan>,
  ordering: Ordering,
): Candidate {
  const workspace = workspaceFor(grid, ordering, spans, netlist)
  for (const part of placementOrder(netlist.parts)) {
    if (part.kind === "fixed-field") placeFixedField(workspace, part)
    else placeTwoLead(workspace, part)
  }
  joinNets(workspace, netlist)
  for (const area of workspace.areas) {
    const under = routedUnderRigid(area, workspace.areas.filter((other) => other !== area))
    if (under === null) continue
    refuse(
      "routed-under-rigid",
      `ordering "${ordering.name}" produced a board on which "${under.guest}" has a lead in hole ` +
        `${under.hole.strip},${under.hole.column}, inside the area "${under.host}" covers - and ` +
        `"${under.host}" is a rigid part.\nThe owner's rule is that nothing is routed under one: ` +
        "its terminals cannot be formed, so it cannot be jostled aside to get at the joint " +
        "beneath it.\nEvery candidate column is checked for this before it is ranked " +
        "(chooseColumn in lib/stripboard/seed-place.ts), so reaching here is a defect in that " +
        "check rather than in the input - and it is refused rather than returned, because a " +
        "board a person cannot solder is not a seed.",
    )
  }
  const candidate: Candidate = {
    grid,
    placements: workspace.placements,
    wires: workspace.wires,
    bridges: workspace.bridges,
  }
  checkSeed(candidate, netlist.nets, ordering)
  return candidate
}

/**
 * The two checks a finished seed is held to before it is returned, **run rather
 * than argued for.**
 *
 * The construction is meant to make both impossible - one lead per hole is
 * enforced by the `taken` set, and one net per strip is what the home/scratch
 * rule buys - and that is exactly why they are checked: *"a skipped check must
 * never look like a passing one"*, and a structural argument that has gone
 * stale looks precisely like a sound one. A seed the optimizer must repair is a
 * decision that should never have been accepted, so a failure here refuses
 * instead of returning the board.
 *
 * **WHAT THEY ESTABLISH AND WHAT THEY DO NOT.** `violationsOf` is empty exactly
 * when every reference net is whole in one copper component and no component
 * carries two nets, over the cuts `derivedCuts` derives for this board - so they
 * establish that the candidate is electrically what the netlist asks for. They
 * say nothing about whether it is cheap, buildable in a person's hands, or a
 * shape anybody would choose; `objectiveOf` answers the first and the hard
 * constraints the second.
 */
function checkSeed(candidate: Candidate, reference: ReferenceNets, ordering: Ordering): void {
  const clash = holesOverlap(candidate)
  if (clash !== null) {
    refuse(
      "holes-shared",
      `ordering "${ordering.name}" produced a board on which ${clash.refs.join(" and ")} all ` +
        `claim hole ${clash.hole.strip},${clash.hole.column}.\nThe placer's own hole set should ` +
        "have made that impossible, so this is a defect in lib/stripboard/seed-place.ts and " +
        "not in the input. The owner asked for one lead per hole - \"I would prefer leads not share " +
        "holes - it makes building easier\" - and a board that breaks it is not handed back " +
        "with a note.",
    )
  }
  const violations = violationsOf(candidate, derivedCuts(candidate, reference), reference)
  if (violations.length === 0) return
  refuse(
    "unsound",
    `ordering "${ordering.name}" produced a board that does not realise the netlist:\n` +
      `${describeViolations(violations).map((line) => `  ${line}`).join("\n")}\n` +
      "This construction is meant to make both violations impossible - every lead lands on its " +
      "own net's strip or on a strip claimed by nothing else, and every net's strips are joined " +
      "- so a violation here is a defect in lib/stripboard/seed-place.ts.\nIt is refused rather " +
      "than returned: a seed the search has to repair is a decision that should never have been " +
      "accepted, and a search handed an unsound seed reports the fault as a defect in whichever " +
      "move it was holding at the time.",
  )
}

/**
 * One candidate per ordering, constructed, checked and returned in the order the
 * orderings were given.
 *
 * `netlist` is the circuit and its reference nets; `grid` is the stock; `spans`
 * is the recorded lead reach, keyed by footprint, as `LEAD_SPANS` has it;
 * `orderings` is the net layouts to build from. **Nothing is ranked and nothing
 * is filtered** - a caller judges with `objectiveOf` and `violationsOf`.
 */
export function seedsFrom(
  netlist: SeedNetlist,
  grid: Grid,
  spans: ReadonlyMap<string, LeadSpan>,
  orderings: readonly Ordering[],
): readonly Candidate[] {
  if (orderings.length === 0) {
    refuse(
      "no-orderings",
      "seedsFrom was given no orderings, so there is no net layout to build a seed from and " +
        "the answer would be an empty list that reads exactly like a circuit nothing could be " +
        "built for.\nAn ordering is every net in the order they take strips, with the stride " +
        "between them; it is a parameter precisely so that this module does not choose one. " +
        "Nothing is substituted: a default ordering here would be this module deciding which " +
        "seed the search starts from, which is the decision the parameter exists to keep with " +
        "the caller.",
    )
  }
  validateNetlist(netlist)
  if (netlist.parts.length === 0) {
    refuse(
      "no-parts",
      "the netlist carries no parts, so a seed for it would be a board with no placements - " +
        "which scores zero and means nothing.\nNothing is substituted: an empty board is not a " +
        "seed, and returning one would hand the search a candidate it can only make worse.",
    )
  }
  return orderings.map((ordering) => seedFrom(netlist, grid, spans, ordering))
}
