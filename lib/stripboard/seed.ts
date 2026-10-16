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
 *      span reaches that far; failing that on a SCRATCH strip - a strip no net
 *      calls home, claimed by exactly one lead - and failing that on a strip
 *      another net already occupies, which is admitted provided no net is left
 *      INTERLEAVED on it;
 *   3. a net whose leads ended up on several strips has those strips joined,
 *      lowest to highest, by a solder bridge where they are adjacent and a wire
 *      where they are not.
 *
 * **A STRIP MAY THEREFORE CARRY SEVERAL NETS, AND THE CUTS THAT PART THEM ARE
 * DERIVED RATHER THAN PLANNED** - `derivedCuts` cuts between adjacent runs of
 * DIFFERENT nets on one strip, and this module neither counts those cuts nor
 * prices them.
 *
 * **THE SENTENCE THIS REPLACES IS STRUCK RATHER THAN DELETED, because it is why
 * the module was built as it was:** ~~*"SO NO STRIP EVER CARRIES TWO NETS'
 * LEADS, AND EVERY SEED THIS MODULE PRODUCES HAS ZERO CUTS"*~~ - stated here as
 * a structural property of the home/scratch rule, and true of this construction
 * until 2026-10-15. It made a Pultec board impossible to express, and the owner
 * corrected the premise under it: ***"Zero cuts was never a requirement. I have
 * an overwhelmingly strong preference for AS FEW CUTS AS POSSIBLE. That does not
 * nor has it ever meant zero cuts is a requirement."***
 *
 * **SO "AS FEW AS POSSIBLE" IS THE OBJECTIVE'S BUSINESS AND NO NEW CRITERION
 * FOLLOWS.** `stripboard/rules.json` already prices a cut at 1.0 against 0.25
 * for a wire or a bridge - the owner's *"favor wires over cuts. cuts are harder
 * and more error prone"* - so the three shapes in step 2 are tried in that
 * committed price order and nothing here ranks the result. What the construction
 * still does NOT price is BOARD AREA, which `OBJ1`'s closed term list leaves out,
 * so a seed here spreads across more strips than a person would use. **That is a
 * finding for the owner and not a defect to fix here**: adding an area or
 * wire-length term would be authoring a criterion, and `OBJ2` forbids a tidiness
 * term outright.
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
 *   - **no net left interleaved on a strip the part lands on** - `interleavingOn`
 *     in `./separable.ts`, applied per candidate column in `./seed-place.ts`.
 *     Interleaving is not electrically illegal, and the refusal is not a claim
 *     that it is: a wire could rejoin the two runs, but `joinNets` below joins a
 *     net's STRIPS rather than two runs on one strip, so a seed carrying one
 *     would hand the search a board its own joiner cannot finish. `violationsOf`
 *     remains the authority on soundness and is unchanged;
 *   - **nothing routed under a rigid part** - the owner, 2026-10-14: *"Rigid
 *     parts shouldn't be routed through/under."* Checked per candidate column in
 *     `./seed-place.ts` and checked again over the finished board below; his own
 *     two boards hold it in 84 of 85 leads;
 *   - **nothing overlapping a rigid part's area at all** - the owner,
 *     2026-10-15: *"Rigid parts are rigid. You cant push them out of the way or
 *     rout under them."* Checked per candidate column in `./seed-place.ts`
 *     (`rigidOverlap`) and NOT re-checked over the finished board: `joinNets`
 *     adds no part and moves none, so a second pass here could not fire and *"a
 *     predicate that can never fire"* is the defect this plan has caught four
 *     times. The lead rule IS re-checked below because that check predates the
 *     reasoning and removing it is not this change's business;
 *   - **room to work where there is room** - *"if there's room for parts to have
 *     their own space, they should be given that space"*, which `./seed-area.ts`
 *     applies as a preference order over positions rather than as a cost.
 *
 * **BODY COLLISION BETWEEN TWO FORMABLE PARTS IS STILL NOT REFUSED, and that is
 * the whole of how these rules coexist.** The owner, 2026-10-14: *"Resistors,
 * diodes, most capacitors can be jostled out of the way of each other"*, and
 * *"Don't worry about body collisions on the stripboard. It's extremely
 * flexible."* So two FORMABLE bodies overlapping is admitted - his `buffered`
 * board has one such pair, `C3`/`R1` - because either of the two can be bent
 * aside. An overlap where EITHER part is rigid is refused, because the part that
 * would have to be bent aside cannot be.
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
  type Ordering,
  type SeedNetlist,
} from "./seed-model.ts"
import { validateNetlist } from "./seed-validate.ts"
import { placeFixedField } from "./seed-field.ts"
import { placeOffBoard, placeTwoLead } from "./seed-fit.ts"
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
  // A COMPLETE SWITCH AND NEVER AN `if`/`else`, so that a fourth part kind is a
  // compile error here rather than a part that is silently never placed. The
  // `if`/`else` this replaces would have sent an off-board pad to the two-lead
  // placer and refused inside it, naming the wrong thing.
  for (const part of placementOrder(netlist.parts)) {
    switch (part.kind) {
      case "fixed-field":
        placeFixedField(workspace, part)
        break
      case "two-lead":
        placeTwoLead(workspace, part)
        break
      case "off-board":
        placeOffBoard(workspace, part)
        break
    }
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
 * enforced by the `taken` set, and a net whole in one component is what the
 * interleaving rejection plus `joinNets` buys - and that is exactly why they are
 * checked: *"a skipped check must
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
      "This construction is meant to make both violations impossible - no lead lands where it " +
      "would leave a net interleaved on a strip, so every net is in one run on each strip it " +
      "touches and every net's strips are joined - so a violation here is a defect in " +
      "lib/stripboard/seed-place.ts.\nIt is refused rather " +
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
