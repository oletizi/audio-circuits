# Stripboard Model and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An in-process stripboard model, cut derivation and search that reaches the construction cost of the owner's hand-built `feedback` and `buffered` boards on those same instances, with VeroRoute demoted to importer, witness and exporter.

**Architecture:** A board is a grid of strips, parts occupying hole sets, wires joining holes, nets as pin sets. Cuts are **derived** from placement plus wires, never searched. Connectivity is union-find in memory, so a candidate costs microseconds instead of six subprocess launches. The search uses constructive seeds and **compound candidates** — move-and-wire as one proposal — which is the move the old architecture could not express.

**Tech Stack:** TypeScript on Bun. KiCad 9 libraries on disk. The pinned VeroRoute fork (`veroroute.pin` → `ed6c5a6`), invoked for exactly three things and never from the core.

**Spec:** `docs/superpowers/specs/2026-10-14-stripboard-search-redesign-design.md` (S1b, revision 3), which argues from `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` (**CRITERIA**, approved by the owner 2026-10-13).

---

## OWNER RULING, 2026-10-14: BODY COLLISIONS ARE NOT MODELLED

**His words, verbatim:** *"Don't worry about body collisions on the stripboard. It's
extremely flexible."* Taken with his earlier *"the whole point of stripboards is to use the
flexibility of the leads… The only time you care about the body dimensions is if the leads
are very short… or rigid like dip packaged chips."*

**What this changes, measured by Task 13 rather than assumed.** `Placement.holes` — a
part's body-derived occupied area — is read by **exactly one consumer**: `holesOverlap`,
i.e. body-to-body collision. Stock fit reads the dump's `BOUNDS` (`rank.ts`); the
buildability check reads feature holes (`extent.ts`). Task 13 corrected a comment in
`board.ts` that claimed all three read it; only the first does. **So this ruling removes
the single consumer of body occupancy.**

**What it unblocks, and it is the benchmark itself.** Task 13 reported two obstacles to
importing the owner's built boards: a hole-ownership rule that refused `feedback` (a
resistor lead sits in a hole the `RV4` trimmer's body covers — on a board he built and
uses), and 13 of `buffered`'s 21 parts being undescribable because a stretched two-pin part
has no body model. **Both were body questions. Both are now moot.** A placement is its
pins.

**What is NOT changed by it, and must not be dropped on this ruling's authority:**

- **Pin holes still matter.** Whether two *leads* may share one hole is a **separate,
  still-open question** the owner has not answered. Do not fold it into this ruling.
- **Lead reach still matters.** `HC5`/`HC9` bound whether a part's leads can span the holes
  assigned to it, and they are unaffected.
- **Pin pattern still matters.** `HC10`'s footprint half — whether a package's pins
  decompose into rows the strips can take — is pin geometry, not body area.

**`lib/kicad/footprint-extent.ts` and `formed-frame.ts` (Tasks 12 and 13) now have no
consumer in the core.** They are correct, tested, and were built to answer a question that
has since been withdrawn. They are **kept for now rather than deleted**, because this plan's
author is not confident enough in one reading of one sentence to destroy two tasks of
verified work — but `supersede means delete` applies, and **if nothing claims them by the
end of this plan they go.** Recorded here so the decision is deliberate rather than
forgotten.

## OWNER RULINGS, 2026-10-14: ONE LEAD PER HOLE, AND NOTHING MOUNTS ON THE COPPER SIDE

**Leads do not share holes.** His words: *"I would prefer leads not share holes—it makes
building easier."* Recorded as **stated** — a preference with a build reason, not a physical
impossibility. Two leads *can* be twisted into one hole; he would rather they were not. The
model therefore treats one occupant per hole as a rule, and **if a search ever finds a board
reachable only by sharing one, that is a finding to put back to him rather than a licence to
relax it.**

Measured, and it agrees: Task 13 found **pad-point overlap on none of the committed boards**.
Every layout here, including the two he built, already honours this.

**Nothing mounts on the copper side.** His words: *"I don't want to mount parts on the copper
side. It's harder to solder."* So a placement is on the component side, always; there is no
second face to search over and no flipped variant of a part.

**A cut falls between holes.** His words: *"Cuts should be between holes."* So no hole is cut
through and no longer run is scraped. `Cut { strip, afterColumn }` — the type Task 2 already
declares — is therefore the whole vocabulary, and the position question narrows to *which gap
between which two holes*, never *what shape of removal*. This **simplifies** Task 2's
convention rather than complicating it, and with the body ruling above, the only thing a cut
can foul is a lead's solder joint or a solder bridge.

## STANDING EXCLUSION: THE TERMINAL BLOCK IS NOT A GAP TO FILL

**No task in this plan may report the Phoenix terminal block as missing data, a blocker, or
`part-researcher` work.** It has now been raised three times and the owner has had to say
so three times: *"We don't use terminal blocks on stripboards. I've told you that MANY
times."*

**Why it keeps resurfacing, and the fix.** `tests/fixtures/stripboard/pultec-low-boost-frozen.dump`
is a byte-frozen capture from before the part left the design, so it legitimately contains
`board_terminals`. Anything that tries to import that fixture hits a footprint recorded in
no table and correctly reports "no record" — and a reader then relays it as a gap to close.
**It is not a gap. It is a superseded part in a historical capture.**

Verified 2026-10-14: `BLOCK_200MIL*` appears in **zero** live board layouts; the live design
carries none; `9f57dcc` removed it from all five Pultec layouts on the owner's instruction.
The only other traces are a stale `ki_fp_filters` hint in `pultec-mid-band.kicad_sch` — a
KiCad footprint-picker suggestion, not a part.

**So the frozen fixture is EXCLUDED, not blocked.** It cannot be fully imported and that is
the correct and final state. It remains valuable for what it is: a regression fixture whose
7 parts and 10 pads do import, and a record of a layout as it stood. `B1-frozen` was already
withdrawn as a benchmark on separate grounds.

**If a task finds itself about to write "the terminal block needs a record", the correct
sentence is "the frozen fixture is excluded; see the standing exclusion."**

## OWNER RULINGS, 2026-10-14: CLUSTER, AND LEAVE ROOM TO WORK

**Verbatim:** *"I try to cluster related parts, AND I try to give myself room to work. I have
actual fingers—I'm not a pick and place machine."* And on spacing: *"Rigid parts shouldn't be
routed through/under. Resistors, diodes, most capacitors can be jostled out of the way of
each other, but if there's room for parts to have their own space, they should be given that
space. Dense layouts are harder to work with than layouts with enough room."*

**THE TWO RULES ARE ORDERED, and the order is his.** *"Clustering is nice, but secondary to
ease of assembly."* Where they conflict — and they will, since keeping parts near their nets
packs them together while leaving room spreads them apart — **room to work wins.** Clustering
is satisfied with whatever freedom remains after the board is comfortable to build; a seed
made tighter to improve clustering is not an improvement but the trade he has ruled against.

**This is a build constraint, not a taste one.** A part wedged between two others cannot be
soldered by a person with a hand and an iron. That is why it is the owner's to state and why
it does not fall under `OBJ2`'s ban — a legibility metric invented by an agent would be the
agent's taste; a clearance a builder's fingers require is a fact about building.

**THE DEFECT THIS NAMES, measured on Task 6's best seed.** The stock is 34 strips × 27
columns — **918 holes**. The seed used 31 strips × **3 columns** and put 37 leads in them,
leaving roughly **790 holes untouched** while stacking a 10 mm electrolytic on a trim pot.
It spread along one axis to the limit and never reached sideways at all. The owner's word
for the result: *"kafkaesque"*.

**IT IS A CONSTRUCTION DEFECT, NOT AN OBJECTIVE DEFECT, and that distinction decides who
may fix it.** `F = C + 0.25·W + 0.25·B` contains nothing that prefers a narrow board. A
layout using the width, with parts near their own nets, needs *fewer* wires and therefore
scores **better** than the ribbon. The seeder assigns one net per strip and drops parts into
the first free columns; nothing in it reaches sideways. It is not choosing density — it
never considers the alternative. **So the objective is not touched**, which matters because
changing it is the one thing an agent may not do on its own judgement, while changing a
constructor is ordinary work.

**THE NUMBER COMES FROM HIS OWN BUILT BOARDS, NOT FROM AN AGENT.** "Enough room" needs a
figure, and an agent choosing one would be setting its own grade. `transistor-preamp-feedback`
and `transistor-preamp-buffered` were laid out by hand **and built and used**, so the
clearance he actually leaves is recorded in them. Measure it there and cite the boards, the
same way the forming anchor was settled from KiCad's own files rather than from a guess. If
the measurement does not yield a usable figure, **report that and ask him** — do not
substitute one.

## Global Constraints

- **An agent may never author the acceptance criteria for the artifact it is producing.** No new term in `F`, no eleventh hard constraint, **no legibility metric**, no tuned threshold introduced by the thing being measured.
- **Never widen a bound, span table, whitelist or rules value to make something pass.** If a fix would need it, stop and report.
- **No fallbacks or mock data outside test code.** Throw instead; every `throw` names what is missing, where to fix it, and why it is not defaulted.
- **No `any`, no `as Type`, no `@ts-ignore`.** Files 300–500 lines. Relative imports carry the `.ts` extension. Supersede means delete.
- **A skipped check must never look like a passing one.**
- **Report what you measure, never what was hoped.**
- **Scratch goes in the session scratchpad** — never `/tmp`, never `/private/var`. Measurement runs clean up after themselves; `make prune-runs` and `make prune-temp` exist. The absence of this constraint filled the owner's disk on 2026-10-13.
- **A regex asserted against a long message matches its reasoning rather than its verdict.** Assert the discriminating identifier; `toStartWith` on the front-of-message identifier is the pattern already used here. This class recurred five times in the previous plan.
- **Mutation testing cannot catch a predicate that is too permissive.** "N mutations, N killed" is evidence a check exists, not that it is tight.
- **A derivation written beside correct code gets less scrutiny than the code.** Three times in the previous plan the code was right and its stated explanation was wrong. Check arithmetic against a run before writing it down.

## Baseline

HEAD at plan start: `bun test` **1900 pass / 0 fail / 0 skip across 173 files**; `bun run typecheck` clean; `build/stripboard` 0 bytes with zero run directories; `TMPDIR` delta zero across consecutive suite runs; `make check` 2 ok / 9 FAIL.

## File Structure

| file | responsibility |
| --- | --- |
| `lib/stripboard/board.ts` | **new** — the model: `Grid`, `Placement`, `Wire`, `Candidate`. Data only, no behaviour. |
| `lib/stripboard/connectivity.ts` | **new** — union-find over strip segments, wire endpoints and bridges; `componentsOf`. **Phase 2 only: built fresh from derived cuts, never from declared nets.** |
| `lib/stripboard/cuts.ts` | **new** — significant contacts, runs, derived cuts, the cut-position convention. **Phase 1 only: synthesis from declared identity, no union-find.** |
| `lib/stripboard/invariants.ts` | **new** — the two `HC8` invariants as a per-candidate precondition. |
| `lib/stripboard/seed.ts` | **new** — constraint-aware constructive seeds. |
| `lib/stripboard/moves.ts` | **new** — compound candidates, including move-and-wire. |
| `lib/stripboard/search.ts` | **new** — the loop, consuming `CRITERIA`'s existing `Q1`–`Q6`. |
| `tools/stripboard/vero-import.ts` | **new** — `.vrt` dump → `Candidate`. Adapter, outside the core. |
| `tools/stripboard/vero-export.ts` | **new** — `Candidate` → declarative import → `.vrt`, with the round trip. |

**`lib/stripboard/` is the core and may not import from `tools/`.** That direction is the enforceable form of the owner's boundary and Task 3 tests it.

---

### Task 12: What a footprint OCCUPIES, sourced from the `.kicad_mod` — ADDED AFTER TASK 1, AND IT RUNS SECOND

**Execution order is now 1, 12, 8, 2, 3, 4, 5, 6, 7, 9, 10, 11.**

**Files:**
- Create: `lib/kicad/footprint-extent.ts`
- Create: `tests/kicad/footprint-extent.test.ts`

**Interfaces — Produces:** `occupiedAreaFor(footprint): FootprintExtent`, giving the holes a
part covers relative to its origin. Task 1's `geometryOf` consumes it; Tasks 8, 6 and 2
depend on `geometryOf` working at all.

**WHY, measured by Task 1 rather than assumed.** `geometryOf` cannot be built from
`pinPatternFor` alone, because **a `PinPattern` records pads and says nothing about the
body** — its own comment states that *"a body width is not a pin position and does not enter
this classification at all."* Measured: the three `C_Rect` footprints in
`lib/kicad/pin-pattern.ts` carry **byte-identical pads** — `pad("1", 0, 0)`, `pad("2", 5, 0)`
— at body widths 2.5, 3.5 and 4.5 mm. And the difference is not cosmetic: the frozen
low-boost board places the 3.5 mm one as a three-row `CAP_FILM_WIDE` and the 2.5 mm one as
a one-row `CAP_FILM`. So today `geometryOf` **refuses every footprint**, correctly.

**`VEROROUTE_FOOTPRINT_ROWS` is not the answer**, and Task 1 checked: it lives in `tools/`
behind the core boundary, it is keyed by VeroRoute type rather than KiCad footprint, and its
own record says deriving an extent from the leads was wrong by one on `C18`.

**THE SOURCE IS THE `.kicad_mod` ON DISK, AND IT HAS THE ANSWER.** Verified 2026-10-14: the
courtyard start Y for those same three footprints reads `-1.25`, `-1.75`, `-2.25` — exactly
half of each body width, distinguishing precisely what the pads cannot. `PinPattern` already
carries each footprint's `.kicad_mod` path and its `(version <n>)` token, so the provenance
chain exists.

**RULING: a separate module, not a field on `PinPattern`.** That type's stated scope is pad
classification and it says so; widening it to carry body data would contradict its own
comment. `footprint-extent.ts` keyed by KiCad footprint name keeps one responsibility each,
and both live in `lib/` so the core can reach them.

**This is part geometry, so the project's rule governs it: refuse rather than guess, and
prove it with a test over the range it claims.** The extent is **derived from the
`.kicad_mod`, never transcribed by hand**, and a footprint whose file does not record a
courtyard **refuses by name**. This repository has shipped three library names that did not
exist; a hand-typed extent table would be the same failure in a new place.

- [ ] **Step 1: Write the failing test.** Open the three `C_Rect` files and assert the
  extents **differ**, which is the whole point — a derivation that returned the same answer
  for all three would satisfy any weaker test.

```ts
test("three footprints with identical pads have different occupied areas", () => {
  const widths = ["2.5", "3.5", "4.5"].map(
    (w) => occupiedAreaFor(`Capacitor_THT:C_Rect_L7.2mm_W${w}mm_P5.00mm`),
  )
  const distinct = new Set(widths.map((e) => JSON.stringify(e)))
  expect(distinct.size, "the three are told apart").toBe(3)
})

test("a footprint whose .kicad_mod records no courtyard refuses by name", () => {
  expect(() => occupiedAreaFor(SYNTHETIC_NO_COURTYARD)).toThrow(/^footprint-extent-no-courtyard:/)
})
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement**, reading the courtyard from the file `PinPattern`'s `source`
  names. **Verify the `(version <n>)` token matches** what the pattern recorded — a file that
  has changed under us is a refusal, not a silent re-read.

- [ ] **Step 4: Confirm they pass. Then check the derivation against the one board that
  disagreed with a lead-derived extent:** the frozen low-boost places `C18` as three rows.
  Assert the derived extent agrees. **If it does not, report the disagreement — do not adjust
  the derivation until you understand it**, which is how a wrong model acquires a passing test.

- [ ] **Step 5: Wire `geometryOf` to it and confirm Task 1's refusals narrow** — the
  unrecorded-pattern and unmountable-pattern refusals stay; `no-occupied-area` should now
  fire only for footprints genuinely missing a courtyard.

- [ ] **Step 6: Run `bun run check`. Commit.**

---

### Task 1: The model, as data with no behaviour

**Files:**
- Create: `lib/stripboard/board.ts`
- Create: `tests/stripboard/model/board.test.ts`

**Interfaces — Produces:**
```ts
export interface Grid { readonly strips: number; readonly columns: number }
export interface Hole { readonly strip: number; readonly column: number }
export interface Placement {
  readonly ref: string
  readonly footprint: string
  readonly origin: Hole
  readonly direction: "W" | "E" | "N" | "S"
  /** Every hole this part occupies, derived from its footprint and direction. */
  readonly holes: readonly Hole[]
  /** Pin name to the hole it sits in. */
  readonly pins: ReadonlyMap<string, Hole>
}
export interface Wire {
  readonly from: Hole
  readonly to: Hole
  /** The net this wire exists to carry. Declared, never discovered. */
  readonly net: string
}
/** A solder blob joining two ADJACENT strips at one column. */
export interface Bridge {
  readonly column: number
  readonly strips: readonly [number, number]
  readonly net: string
}
export interface Candidate {
  readonly grid: Grid
  readonly placements: readonly Placement[]
  readonly wires: readonly Wire[]
  readonly bridges: readonly Bridge[]
}
/** A footprint's occupied holes and pin mapping, at an origin and direction. */
export function geometryOf(
  footprint: string, origin: Hole, direction: Placement["direction"], patterns: PinPatterns,
): { holes: readonly Hole[]; pins: ReadonlyMap<string, Hole> }
```

Tasks 2 and 4–8 consume all of these.

**`Bridge` is in the model because `B` is in the objective** (third review, finding 2).
`F = C + ρ_w·W + ρ_s·B`, and revision 1 of this plan gave `Candidate` no way to express
`B` at all — so scoring would have had to assume zero, infer it, or wait for VeroRoute,
and all three defeat in-process scoring. A bridge joins ADJACENT strips at a column (the
frozen fixture carries `SOLDER 9,6 10,6`, and all fifteen `SOLDER` lines across the five
committed dumps join adjacent strips at one shared column — counted, not eyeballed), which
makes it a short-hop alternative to a
wire and therefore a **routing decision, not a consequence**. The owner's reason for
pricing it beside a wire, verbatim: *"A solder blob will turn into a wire on my bench."*

**`geometryOf` is the derivation nothing in revision 1 implemented** (third review,
finding 3, generalised). Revision 1 declared `holes` and `pins` as "derived from its
footprint and direction" and no task derived them. The importer needs it and **so does
the seed builder** — the review caught it only on the import side. `pinPatternFor` in
`lib/kicad/pin-pattern.ts` is the source. **A footprint whose pattern is not recorded
REFUSES by name**; occupied holes are never reconstructed from a pin bounding box,
because two footprints can share pin positions and differ in body, and overlap detection,
stock fit and buildability all read this.

- [ ] **Step 1: Write the failing test.**

```ts
import { expect, test } from "bun:test"
import { holesOverlap, type Candidate } from "../../../lib/stripboard/board.ts"

test("two placements occupying one hole are detected, by the hole and both refs", () => {
  const clash = holesOverlap(twoPartsOnOneHole())
  expect(clash, "an overlap is reported").not.toBeNull()
  expect(clash?.hole).toEqual({ strip: 2, column: 3 })
  expect([...(clash?.refs ?? [])].sort(), "both parts are named").toEqual(["C1", "R1"])
})

test("a candidate whose parts occupy distinct holes reports no overlap", () => {
  expect(holesOverlap(twoPartsApart())).toBeNull()
})
```

- [ ] **Step 2: Run it and confirm it fails** with the module missing.

- [ ] **Step 3: Implement the types and `holesOverlap`.** Data only — no scoring, no connectivity, no cut logic. A `Wire` whose `net` is absent does not compile; that is the point of putting it in the type.

- [ ] **Step 4: Run the tests and confirm they pass. Run `bun run check`.**

- [ ] **Step 5: Commit.**

---

### Task 2: Connectivity and cut derivation — the heart, and the one place a subtle error is invisible

**Files:**
- Create: `lib/stripboard/connectivity.ts`, `lib/stripboard/cuts.ts`
- Create: `tests/stripboard/model/cuts.test.ts`, `tests/stripboard/model/cuts-agree.test.ts`

**Interfaces:**
- Consumes: `Candidate`, `Hole`, `Wire` from Task 1.
- Produces: `componentsOf(candidate, cuts): ReadonlyMap<string, number>` keyed by hole; `derivedCuts(candidate, reference): readonly Cut[]`; `type Cut = { readonly strip: number; readonly afterColumn: number }`.

**ORDERING RULING (pre-flight, 2026-10-14): Task 8 runs BEFORE this task, so the task
numbers no longer match execution order.** Revision 2 had this task's differential test
building a `Candidate` from a dump while the importer that does exactly that was Task 8,
five tasks later — so the test would have needed a second, throwaway converter, and
`supersede means delete` forbids leaving two. Task 8 is therefore executed second, and its
own tests assert **only that the import is faithful** — placements, pins, wires and bridges
against the dump's own `PART`, `PIN`, `WIRE` and `SOLDER` lines — with **no cut
assertions**, because cuts do not exist until this task. Execution order is
**1, 8, 2, 3, 4, 5, 6, 7, 9, 10, 11**.

**THE CONTRACT, from the spec — implement it exactly, and do not simplify it.**

**A significant contact is a component pin OR a wire endpoint.** A wire endpoint in an otherwise empty hole makes that hole electrically meaningful, and **a strip carrying no pins at all can still be a routing conductor between two wire endpoints.** A derivation walking only pins misses both.

Per strip: significant contacts in column order, each labelled with its reference net, grouped into maximal runs of one net. **A cut is required between each adjacent pair of runs of different nets.**

**A wire's net is declared** (Task 1's type). A wire whose declared net is not reachable from a component pin through the candidate's own connectivity is **refused by name** — it connects nothing.

**TWO PHASES, AND NO FIXPOINT** (third review, finding 1 — the blocking one, and it
overturns what revision 1 of this plan argued for).

Revision 1 said to build the uncut graph, propagate net identity, find conductors
carrying two nets, derive cuts, re-split and recompute. **That cannot work. Union-find
merges and cannot split.** Build the uncut graph first and a strip carrying nets A and B
is already one component — the intended distinction is destroyed before anything is
derived, and there is nothing left to "re-split".

The second review called this a circular dependency and this plan's author pushed back,
insisting it was a well-defined fixpoint. **Both were wrong, and the right answer is
simpler than either.** The fixpoint is removed entirely rather than retained for
"resolving routing relationships" — nothing remains for it to do, and leaving it in the
document invites it back.

1. **Cut synthesis, from DECLARED identity.** Pin nets come from the circuit; wire and
   bridge nets are declared on the candidate. Partition each strip into regions by
   intended net and select cuts between incompatible regions. **This is a per-strip scan
   and uses no union-find at all.**
2. **Electrical verification, from GEOMETRY.** Build a FRESH connectivity graph out of
   the resulting cuts, wires and bridges, and run `HC8` on it (Task 5).

The separation is the same one the wire-net rule already establishes: **declared identity
builds, geometry judges.** A candidate whose declared nets agree with its wiring but whose
geometry does not is exactly what phase 2 exists to catch, and a derivation that reused
phase 1's labels in phase 2 would be unable to catch it.

**A CUT UNDER A PART'S BODY IS NORMAL AND MUST NOT BE AVOIDED** (owner, 2026-10-14).
His words: *"parts definitely straddle cuts. All dip packages have cuts under them to
separate the two pin rows."* The physical reason makes it obvious once stated: **a cut is
made on the COPPER side and a body sits on the COMPONENT side** — opposite faces, so they
cannot foul each other. This also restates his earlier `HC10` ruling, *"dips should span
strips with a cut down the middle, like a breadboard."* A derivation treating a body as an
obstacle would refuse the standard way every DIP is mounted.

**Cut position is a declared convention with a test**, not an emergent property of a loop.
Between two runs there may be several empty holes and they are not equally safe — but
**only what shares the copper side with the cut can make one unsafe: a hole carrying a
lead's solder joint, and a solder bridge.** Not a body, and not a link wire, which runs
over the top. An earlier draft of this plan listed "a lead, a solder bridge or a wire
anchor"; one of those three is not a constraint and another is on the wrong side of the
board. State the rule in the module comment and test it directly.

- [ ] **Step 1: Write the failing tests**, both directions.

```ts
test("a strip carrying two nets needs one cut, between their runs", () => {
  const cuts = derivedCuts(twoNetsOnStripThree(), reference())
  expect(cuts).toEqual([{ strip: 3, afterColumn: 5 }])
})

test("a wire-only strip carrying ONE net is a conductor and needs NO cut", () => {
  // REVISION 1 OF THIS PLAN ASSERTED THE OPPOSITE AND WAS WRONG (third review,
  // finding 1). It required `cuts.some(cut => cut.strip === 7)`, baking in the
  // assumption that recognising a wire-only strip means cutting it. A strip
  // holding two endpoints of the SAME net needs zero cuts, and that test would
  // have taught the model a falsehood and then passed.
  const candidate = wireOnlyStripOneNet()
  expect(derivedCuts(candidate, reference()).filter((cut) => cut.strip === 7)).toEqual([])
  // What DOES matter about it: the strip conducts, so its holes are one component.
  const components = componentsOf(candidate, derivedCuts(candidate, reference()))
  expect(components.get("7,2"), "both endpoints share a component").toBe(components.get("7,9"))
})

test("a wire-only strip carrying TWO nets needs a cut between them", () => {
  // The companion fixture the review asked for: same shape, incompatible
  // net-owned contacts, so the cut is required rather than assumed.
  const cuts = derivedCuts(wireOnlyStripTwoNets(), reference())
  expect(cuts.filter((cut) => cut.strip === 7).length, "one cut on strip 7").toBe(1)
})

test("a wire whose declared net no pin reaches is refused, naming the wire and the net", () => {
  expect(() => derivedCuts(wireToNowhere(), reference())).toThrow(/connects nothing/)
})
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement connectivity, then cut derivation.** Union-find over strip segments and wire endpoints.

- [ ] **Step 4: Run the tests and confirm they pass.**

- [ ] **Step 5: THE DIFFERENTIAL TEST, and it is this task's real deliverable.** Eleven
  boards are committed with cut sets VeroRoute derived itself. Import each with
  **`candidateFromDump` from Task 8, which now runs BEFORE this task** (see the ordering
  ruling below), run `derivedCuts`, and **compare against the dump's own `CUT` lines, board
  by board.**

```ts
test("our derived cuts match VeroRoute's own on every committed board", () => {
  for (const board of COMMITTED_BOARDS) {
    const dump = parseBoardDump(fs.readFileSync(board.dump, "utf8"))
    const ours = derivedCuts(candidateFrom(dump), referenceFor(board))
    // POSITIONS, NOT COUNTS (third review, finding 9). Two cut sets can agree on
    // how many and disagree on which strip - and the materialization contract in
    // Task 9 requires PHYSICAL-state equivalence, so a count match would let a
    // disagreement about position through the one test meant to catch it.
    expect(canonical(ours), board.name).toEqual(canonical(dump.cuts))
  }
})

test("where cut positions legitimately differ, the copper partitions still agree", () => {
  // The fallback for the case above: if a convention differs but the electrical
  // result does not, say so explicitly rather than loosening the position test.
  for (const board of COMMITTED_BOARDS) {
    expect(partitionOf(ourCuts(board)), board.name).toEqual(partitionOf(veroCuts(board)))
  }
})
```

**This is the strongest evidence available and it is free: an independent C++ implementation, written years ago with no knowledge of this model, on eleven real boards.** A mismatch is a finding either way — report the board, both counts and the strip they differ on. **Do not adjust the derivation to make a board agree without understanding why it disagreed**; that is how a wrong model acquires a passing test.

- [ ] **Step 6: Run `bun run check`. Commit.**

---

### Task 3: The core runs with VeroRoute absent, and a test says so

**Files:**
- Create: `tests/stripboard/model/no-fork.test.ts`

**Why now rather than later:** the spec's boundary is the owner's decision, and this plan makes a fork feature necessary for materialization. Without a test, the dependency creeps back and nobody notices. This project has repeatedly had principles nothing enforced — a renderer that could not draw its own boards, a leak metric watching the wrong directory, an `[external]` mark on an agent's sentence.

- [ ] **Step 1: Write the test.** Two halves, and the second is the one with teeth.

```ts
test("no core module imports from tools/ or spawns a process", async () => {
  for (const entry of CORE_MODULES) {
    const closure = await importClosure(entry)
    for (const reached of closure) {
      expect(reached.startsWith("tools/"), `${entry} reaches ${reached}`).toBe(false)
    }
  }
})

test("the core's own suite passes with the fork unavailable", () => {
  // NOT MOCKED, AND NOT BY RENAMING THE BINARY (third review, finding 8).
  // Renaming mutates shared tool state and leaves the environment damaged if
  // the process is killed - which has happened in this repository. No renaming
  // is needed: tools/perfboard/acquire.ts locates the fork through the
  // VEROROUTE environment variable, so a subprocess with it pointed at a path
  // that does not exist proves the same thing and touches nothing on disk.
  const result = runCoreSuiteWith({ VEROROUTE: "/nonexistent/veroroute" })
  expect(result.exitCode, "the core does not need the fork").toBe(0)
})
```

`importClosure` is in `lib/import-closure.ts` and is synchronous despite its `async` signature; use it.

- [ ] **Step 2: Run it. If it already passes, make it fail** by adding a `tools/` import to a core module temporarily, confirm the failure names the module and the reached file, then revert. A guard that has never failed is not known to work.

- [ ] **Step 3: Run `bun run check`. Commit.**

---

### Task 4: Scoring, against the criteria that already exist

**Files:**
- Create: `lib/stripboard/score.ts`
- Create: `tests/stripboard/model/score.test.ts`

**Interfaces:**
- Consumes: `derivedCuts` (Task 2); `loadRules(file?)` from `tools/stripboard/rules.ts` — **but the core may not import `tools/`**, so the rules are passed IN as a plain value by the caller. Task 3's test fails otherwise.
- Produces: `objectiveOf(candidate, cuts, weights): number` — `F = C + ρ_w·W + ρ_s·B`.

**Nothing in this task invents a number.** The weights come from `stripboard/rules.json`, which is the owner's reviewed parameter file under `PAR3`. A weight hard-coded here would be an agent setting a criterion.

- [ ] **Step 1: Write the failing test**, asserting `F` against hand arithmetic with the committed weights, and that an absent weight **refuses** rather than defaulting.

- [ ] **Step 2: Run it and confirm it fails. Step 3: Implement. Step 4: Confirm it passes.**

- [ ] **Step 5: Run `bun run check`. Commit.**

---

### Task 5: The two `HC8` invariants as a per-candidate precondition

**Files:**
- Create: `lib/stripboard/invariants.ts`
- Create: `tests/stripboard/model/invariants.test.ts`

**Interfaces:**
- Produces: `violationsOf(candidate, cuts, reference): readonly Violation[]` — empty when both invariants hold.

Two invariants, checked **before** a candidate is scored:
1. no copper-connected component holds terminals of two different reference nets;
2. every reference net's terminals lie in one component.

**These are not new.** They are `HC8`, which exists in `tools/stripboard/equivalence.ts` with a negative-fixture suite. What changes is that they move **inward** — from a check on an exported artifact to a precondition on every candidate — which is affordable in memory and was not at 12 ms a look.

- [ ] **Step 1: Write the failing tests**, one per invariant, each asserting the violation names the net and the component.

- [ ] **Step 2–4: fail, implement, pass.**

**A CANDIDATE IS A WHOLE BOARD STATE, NOT A SEQUENCE OF GESTURES** (third review,
finding 4, accepted and taken further). Requiring both invariants per candidate means a
compound move must reach a valid state atomically — and a move that relocates a part may
also need to remove a wire, move another endpoint, or change which cuts fall. If the
generator can only append gestures, it cannot traverse that, which is the old
architecture's limitation in a new representation.

The review proposes a transaction over board state. **This plan goes further and drops
"gesture" entirely.** A gesture vocabulary is an artifact of driving VeroRoute's CLI; now
that the model is ours, a move generator simply **returns a new `Candidate`**. Simpler
than a transaction, strictly more general, and it deletes the concept that caused the
problem. Intermediate states do not exist, so they cannot be invalid; only the produced
candidate is checked.

- [ ] **Step 5: Cross-check against the existing verifier.** On each committed board, `violationsOf` and `netlistEquivalence(dumpText, reference)` from `tools/stripboard/equivalence.ts` must agree about whether the board is sound. **Disagreement is a finding to report, not to paper over** — one of the two is wrong and it matters which.

- [ ] **Step 6: Run `bun run check`. Commit.**

---

### Task 6: Constraint-aware constructive seeds

**Files:**
- Create: `lib/stripboard/seed.ts`
- Create: `tests/stripboard/model/seed.test.ts`

**Interfaces:**
- Consumes: span bounds, passed in as data — `leadSpanFor(footprint)` from `lib/kicad/lead-span.ts` returns a `LeadSpan` with `minSpanHoles` and `maxSpanHoles`.
- Produces: `seedsFrom(netlist, grid, spans, orderings): readonly Candidate[]`.

Decide which strip hosts each net, place parts so their pins land there, run a wire where a net must span.

**Feasibility is checked before a strip assignment is committed, and span is only its first condition.** A part's terminals have a bounded separation, so assigning its two nets to strips it cannot span produces a seed impossible to realise and wastes the optimizer's time repairing a decision that should never have been made. **But a feasible separation can still be impossible** because the holes are already taken, or the board edge intervenes.

**What feasibility means here, after the owner's rulings:**

- **Lead reach** — `minSpanHoles`/`maxSpanHoles` from `lib/kicad/lead-span.ts`, which is `HC5`/`HC9` and is unaffected by anything decided today.
- **Holes actually free** — *"I would prefer leads not share holes—it makes building easier."* One lead per hole.
- **The board edge** — a placement must fit the declared stock, 34 strips × 27 columns.
- **NOT body collision.** *"Don't worry about body collisions on the stripboard. It's extremely flexible."* A placement is its pins; bodies are not modelled, and `geometryOf`'s occupied-area half has no consumer. **Do not reach for `lib/kicad/footprint-extent.ts` or `formed-frame.ts`** — both are unclaimed and slated for deletion.

**A failed construction names the conflicting assignments** rather than silently substituting a placement — a seed the optimizer must repair is a decision that should never have been accepted.

**Seeds come from several orderings and are judged only by the acceptance rule.** A seed heuristic hand-tuned until a benchmark passes is an agent grading its own work — the invariant this whole project rests on.

- [ ] **Step 1: Write the failing tests** — a feasible assignment yields a seed; an infeasible one **refuses naming both nets and the part**; several orderings yield several distinct seeds.

- [ ] **Step 2–4: fail, implement, pass. Step 5: `bun run check`. Commit.**

---

### Task 7: Compound candidates, including move-and-wire

**Files:**
- Create: `lib/stripboard/moves.ts`
- Create: `tests/stripboard/model/moves.test.ts`

**This is the move the old architecture could not express, and the reason for the rewrite.**
A generator **returns whole `Candidate`s**, each differing from the base in as many ways as
it likes — in particular, a part moved onto a strip **and** the wire that makes the move
pay, in one candidate scored as a unit.

**There is no gesture type, and that is deliberate** (see Task 5). A gesture vocabulary is
an artifact of driving VeroRoute's CLI. A move is a function from `Candidate` to
`Candidate`, so "several gestures at once" is not a feature to build — it is the absence of
a restriction that only ever existed because the old search spoke to a subprocess.

- [ ] **Step 1: Write the failing test**, and make it the discriminating one:

```ts
test("a move that only pays once its wire exists is proposed as ONE candidate", () => {
  const base = padContiguousOnOneStrip()
  const proposals = movesFrom(base, reference(), spans(), patterns())
  // A candidate that both relocated a part AND added a wire, relative to base.
  const compound = proposals.filter(
    (next) => next.wires.length > base.wires.length && movedRefs(base, next).length > 0,
  )
  expect(compound.length, "move-and-wire is proposed as one candidate").toBeGreaterThan(0)

  // AND THE RELOCATION ALONE DOES NOT PAY - which is exactly why the old search
  // never found it, and why this assertion is the discriminating one rather than
  // the count above. Build the same move WITHOUT its wire and score both.
  for (const next of compound) {
    const withoutWire = { ...next, wires: base.wires }
    expect(
      objectiveOf(withoutWire, derivedCuts(withoutWire, reference()), weights()),
      "the relocation alone is no better than the base",
    ).toBeGreaterThanOrEqual(objectiveOf(base, derivedCuts(base, reference()), weights()))
  }
})
```

- [ ] **Step 2–4: fail, implement, pass. Step 5: `bun run check`. Commit.**

---

### Task 8: Import an existing `.vrt` into the model

**Files:**
- Create: `tools/stripboard/vero-import.ts`
- Create: `tests/stripboard/vero-import.test.ts`

**Interfaces:**
- Consumes: `parseBoardDump(dumpText)` from `tools/guide/dump.ts`.
- Produces: `candidateFromDump(dumpText, reference, footprints, patterns): Candidate`.

**The dump alone is not enough, and revision 1 assumed it was** (third review, finding 3).
A `PART` line carries a VeroRoute type and a span; the model needs the **KiCad footprint
identity** and **every occupied hole**. Two footprints can share pin positions and differ
in body, so the occupied area is not recoverable from pin coordinates. The extra input is
the board's own footprint map — the shape `tests/fixtures/stripboard/*.footprints.json`
already has, and which `perfboard.json` names a circuit for.

**A component whose geometry cannot be reconstructed is REFUSED by name.** Its occupied
area is never inferred from a pin bounding box: overlap detection, stock fit and physical
buildability all read that field, so a guess there is wrong in three places at once.

This is the adapter that lets a human layout become a starting point — the owner's *"even a human starting point"* — and it is what the benchmarks need.

**THIS TASK RUNS SECOND, immediately after Task 1** (pre-flight ordering ruling, recorded
in Task 2). Task 2's differential test needs a dump-to-`Candidate` converter, and writing a
throwaway one there would leave two converters to keep correct.

- [ ] **Step 1: Write the failing test. NO CUT ASSERTIONS — cuts do not exist yet.** Round
  trip each committed board and assert the import is faithful: every `PART` line becomes a
  placement at the same origin and direction, every `PIN` line's hole matches
  `geometryOf`'s, every `WIRE` and `SOLDER` line becomes a wire or bridge. **Assert per
  board by name**, not an aggregate — an aggregate hides which board broke.

- [ ] **Step 2–4: fail, implement, pass. Step 5: `bun run check`. Commit.**

---

### Task 9: Declarative materialization, and what it must defend against

**Files:**
- Create: `tools/stripboard/vero-export.ts`, plus the fork change
- Create: `tests/stripboard/vero-export.test.ts`

**The fork gains a declarative board-state import.** The optimizer emits a complete placement-and-routing description and VeroRoute materializes it atomically. Gesture replay is rejected — it would carry the old architecture's coordinate shifts and state divergence into the new one. Writing `.vrt` bytes ourselves is rejected — making us the writer of the artifact VeroRoute witnesses destroys the independence the boundary exists for.

**The round trip requires PHYSICAL-STATE equivalence for PLACEMENTS — identical placements,
orientations, wire endpoints and bridge positions — and ELECTRICAL equivalence for cuts.**

An earlier revision required exact cut positions too. **The owner has ruled that out:
*"the cut position doesn't matter. That's false precision."*** Tracks are cut before the
board is populated, so the clearance argument behind the old requirement has no force.
Task 2 measured the consequence: our cuts and the fork's agree on 54 of 54 as to strip,
count and which run pair each separates, on 38 of 54 exact gaps, and the electrical result
is identical either way — and the fork's gap is a function of what AutoFill painted rather
than of any building rule.

**So this task no longer has to defend cut positions against AutoFill.** It must verify
AutoFill's cuts give the **same electrical result** — a different *set* is a real
disagreement — but a different *gap* between the same two runs is **not** a round-trip
failure and must not be reported as one.

**And it must defend that against the fork itself.** `tools/stripboard/score.ts:32` and `tools/stripboard/cut-necessity.ts:26` both record that **`AutoFillVero` re-derives the whole cut set every time a candidate is painted.** The fork will overwrite our cuts on materialization. **The importer must suppress or survive AutoFill**, or every exported board silently becomes AutoFill's candidate rather than the optimizer's. Prove it with a test that materializes a candidate whose cuts differ from AutoFill's preference and asserts ours survive.

**The ownership rule, stated as a rule rather than left to judgement** (third review,
finding 6): the declarative importer **materializes the requested physical state exactly,
or it refuses.** It never substitutes AutoFill's routing, and it never partially applies.
VeroRoute's independently derived cut set is then compared as a **separate verification
step**, and a disagreement is **reported, never silently adopted.** This matters more now
that bridges are in the model, since they are a second thing the fork has opinions about.

- [ ] **Step 1: Build and pin the fork change**, following `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`'s Task 1 shape for building and pinning. **The push to `oletizi/veroroute-perfboard` is authorised**, 2026-10-14, in the owner's words: *"you are free to make any changes you need to the veroroute fork."* This supersedes the earlier reading of *"you can do whatever you want with the fork"* as general permission that still needed a per-branch confirmation — it does not. No further nod is required for a fork change or a push of one. What still holds is everything that was never about permission: the change is pinned by commit so the build is reproducible, the fork stays an INDEPENDENT WITNESS (we do not write `.vrt` bytes ourselves), and a disagreement between its cut set and ours is reported rather than adopted.

- [ ] **Step 2: Write the failing round-trip test** — physical-state equivalence per field, and the AutoFill-survival case.

- [ ] **Step 3–4: implement, pass. Step 5: `bun run check`. Commit.**

---

### Task 10: The search loop, and the benchmark that judges it

**Files:**
- Create: `lib/stripboard/search.ts`
- Create: `tests/stripboard/model/benchmark.test.ts`

**Interfaces:**
- Consumes: Tasks 4–7. Stopping comes from `CRITERIA`'s `Q1`–`Q6`, retained unchanged.
- Produces: `search(seeds, rules, budget): SearchResult`.

**The algorithm is not fixed by this plan.** Implement the loop so that the acceptance rule, the compound move set and the stopping rules are the fixed parts, and the strategy is swappable. Then **measure at least two strategies** on the benchmark instances and report both. Naming a winner before measuring is the failure this project's record documents five times.

**The benchmark is exact-instance regression.** Run `feedback` and `buffered` — the owner's hand-built boards — on their own circuits, footprints and constraints, and compare construction cost.

| board | nets | cuts | wires | extent |
| --- | --- | --- | --- | --- |
| `feedback` | 11 | 5 | 4 | 16 × 18 |
| `buffered` | 13 | 5 | 4 | 20 × 34 |

**Cuts-per-net is a cross-circuit diagnostic only** — cut count follows occupied strips and segment runs, not net count.

**THE SEARCH IS RUN FROM IMPORTED BOARDS AS WELL AS FROM SEEDS.** Task 8's importer turns a hand layout into a `Candidate`, so the owner's own boards are a legitimate starting point and not only a benchmark — his words, *"even a human starting point"*.

**A CORRECTION THAT IS RECORDED RATHER THAN QUIETLY DROPPED, because it was relayed to the owner before it was checked.** Task 7's report claimed that from a zero-cut seed **no single-part move is an improvement**, reasoning that one net per strip means no cuts and no cuts is the objective's floor. **That reasoning is wrong and the claim is false.** Zero cuts is the floor of the CUT TERM, not of `F` — `F = C + 0.25·W + 0.25·B` also prices wires and bridges, and a move that lands two of a net's leads on one strip removes a wire or a bridge without adding a cut. Measured on `transistor-preamp-feedback` across nine orderings, sound strictly-cheaper proposals number 73 on the `part-walk s3` seed the owner approved (F 3.75 → 3.50), 78 on `degree-descending s3`, 52 on two others, and 0 on exactly two — both `degree-ascending`. The gradient is there on seven of nine. The Task 7 review caught it; the figures above were then re-derived independently before this paragraph was written.

**What the owner ruled still stands, because he was answering a question about the seed and not about the search.** Given the three readings — the seed is good; the objective is missing a board-area term; the seed should start deliberately worse — he said *"The seed is fine. No complaints."* So **no area or tidiness term is added** (OBJ2 forbids the second outright, and inventing either would be an agent authoring the criteria for its own artifact) and **the seed is not degraded on purpose**. What changes is only the expectation: a search from the seed should be expected to MOVE, and a run that reports no improvement from a `part-walk` or `reference-order` seed is now a signal to investigate the search, not a correct result to accept.

**BOARD AREA IS NOT A CRITERION, AND FEWER CUTS IS STRONGLY PREFERRED — the owner, 2026-10-14, shown three rendered boards for the same circuit rather than asked in the abstract.**

> **CORRECTED 2026-10-15, BY HIM, AND THE ORIGINAL WORDING IS LEFT BELOW SO THE DRIFT IS LEGIBLE.** This passage said "ZERO CUTS IS STRONGLY PREFERRED" and went on to call the seed's zero-cut property a FEATURE and to declare a shared-strip seed "not wanted". **He never required zero cuts and never said he did.** His words, 2026-10-15: *"Zero cuts was* never *a requirement. I have an overwhelmingly strong preference for AS FEW CUTS AS POSSIBLE. That does not nor has it ever meant zero cuts is a requirement."* What he ruled on below was a choice between three RENDERED BOARDS, one of which happened to have zero cuts; the preference is monotonic in cut count and always was. The committed objective already encodes it exactly — a cut at 1.0 against 0.25 for a wire or a bridge — so nothing further is needed to express it, and **a seed that puts two nets on one strip where one cut pays for it is NOT forbidden.** `docs/superpowers/specs/2026-10-15-pultec-layout-capability-design.md` depends on that, because one net per strip is also what makes a Pultec section inexpressible. The three were: ours cost-optimised (31 x 21, 651 holes, **0 cuts**, 9 wires, 4 bridges, `F` 3.25); his own hand board (16 x 18, 288 holes, 5 cuts, 4 wires, 3 bridges, `F` 6.75); and ours area-optimised (19 x 21, 399 holes, 8 cuts, 10 wires, 5 bridges, `F` 11.75). His hand board beats both of ours on size AND on cut, wire and bridge count together, and that was said to him plainly. His ruling: *"I much prefer the one with zero cuts."*

So, settled and not to be revisited by an agent: **no area term is added to `OBJ1`**. ~~and the seed's structural zero-cut property is a FEATURE rather than the accident it was first reported as. The capability that was about to be proposed — a seed that deliberately puts two nets on one strip where a single cut pays for it, the thing he does by hand — **is not wanted**.~~ **That struck sentence is the drift his 2026-10-15 correction above is about, and it is kept struck rather than deleted so the mistake stays visible.** What he settled here is that a board spending holes to avoid cuts is a trade he is happy with — not that cuts are forbidden, and not that a shared-strip seed may never be built. `rho_w = rho_s = 0.25` against a cut at 1.0 already encodes it and needs no change on this evidence; he was not asked to re-weight and no agent may infer one.

**This also sets what Task 10 is trying to beat.** Not board size. The cost-optimised board already beats the hand layout on `F` (3.25 against 6.75), so the benchmark question is whether the search improves on the SEED, and the comparison against the hand board is reported as context rather than as a target.

Report both starting points and both figure sets. **Do not tune the seed, the objective or the move set to make a number improve** — this repository's record documents that failure five times, and the correction above is a sixth in a different costume: a comfortable conclusion stated without measuring.

- [ ] **Step 1: Record the before state.** Nothing to beat yet; record the seeds' own cost so the search's contribution is separable from the constructive seed's. Record the imported hand board's cost the same way, since it is the second starting point.

- [ ] **Step 2: Run both benchmark instances. Report cuts, wires, `F`, the stopping rule, and whether every net is whole.**

- [ ] **Step 3: Write the comparison into `docs/stripboard/pipeline-verification.md`** as a new numbered section: the command, the commit, the seed, the strategy, both figure sets, the delta against the hand result.

- [ ] **Step 4: THE BENCHMARK IS A GATE, not only a report** (third review, finding 7).
  State plainly whether the hand result was matched. **If it was not, this milestone has
  FAILED** — the measured gap is retained for diagnosis and the search redesign is not
  reported as complete. Reporting a miss honestly and calling the work done are different
  outcomes and revision 1 conflated them.

  **The guard the review does not state, and it matters here:** the gate's threshold is
  **fixed data** — the hand result, already measured and committed — and is **not
  adjustable by whoever is trying to pass it.** A gate whose bar can be moved by the
  implementer is the invariant failure this project exists to prevent, wearing a gate's
  clothes. **A disappointing number reported honestly remains worth more than a flattering
  one**: the previous plan's honest null is what produced this design.

- [ ] **Step 5: Commit.**

---

### Task 11: Calibrate the budget, bounded

**Files:**
- Modify: `stripboard/rules.json`, `docs/stripboard/pipeline-verification.md`

**No number is proposed by this plan, and none may be invented.** The owner's words: *"We need to arrive at that by experimenting and gathering empirical evidence, not by fiat."*

- [ ] **Step 1: DECLARE THE CEILINGS BEFORE RUNNING ANYTHING** (third review, finding 10).
  Write the wall-clock and disk ceilings into the report file first, as a committed
  statement of intent, then run. Revision 1 told the implementer to stop at "a stated
  ceiling" without saying who states it or when — which left a significant operational
  decision to the agent mid-experiment, and this repository has a full disk from exactly
  that shape of instruction.

- [ ] **Step 2: Run the ladder.** Each benchmark instance at **successive orders of
  magnitude**, stopping at the ceilings declared in Step 1. **Not one enormous run** — an implementer reading a measurement instruction on 2026-10-13 produced 126,435 invocations and 3.2 GB, and a full disk followed.

- [ ] **Step 3: Report the marginal improvement each step buys**, and the spread across seeded restarts at several budgets — a budget only one lucky seed needs is not a budget.

- [ ] **Step 4: Put the value to the owner with those curves.** It is a `PAR3` parameter; an agent setting it is an agent choosing a criterion. Record it as a deliberate edit carrying the run that justifies it, under `K3`'s ratchet.

- [ ] **Step 5: Commit.**

---

## Self-review

**Spec coverage.** The model, cut derivation with wire-endpoint contacts, declared wire nets, the fixpoint ordering and the cut-position convention are Task 2. The two `HC8` invariants as a precondition are Task 5. Materialization with physical-state equivalence and AutoFill survival is Task 9. The no-VeroRoute invariant is Task 3. Constraint-aware seeds are Task 6. Compound moves are Task 7. Termination via retained `Q1`–`Q6` is Task 10. Exact-instance benchmarking is Task 10. The bounded budget ladder is Task 11.

**Gaps I am naming rather than hiding.** `lab`'s negative-control role — presenting it beside a generated layout for human review — is **not a task here**, because it is a workflow for the owner rather than code, and inventing a test for it would be inventing the legibility metric `OBJ2` forbids. The two corrections to `CRITERIA`'s record — `B1-frozen`'s provenance mark and `V3`'s superseded deviation — are **documentation edits the owner should ratify**, not implementation, and are deliberately left out of the task list.

**Placeholder scan.** No "TBD", no "handle edge cases". Every test step carries real assertions against named values. Tasks 10 and 11 are measurement tasks whose deliverable is a number, and their steps are concrete actions.

**Revision 2** answers a third review, of the plan itself: three blocking findings (the
cut-derivation fixpoint, the missing solder-bridge representation, the import geometry
contract), four high and three medium. Two of them overturned positions this plan's author
had argued for — the fixpoint, which is removed entirely rather than repaired, and a test
asserting that a wire-only strip must be cut, which was simply false and would have passed.

**Type consistency.** `Candidate`, `Placement`, `Wire`, `Bridge`, `Hole`, `Grid` are defined in Task 1 and used identically in 2, 4–8. `derivedCuts(candidate, reference)` is produced in Task 2 and consumed in 4, 5, 8. `Cut` is `{ strip, afterColumn }` throughout. Interfaces consumed from existing code were verified on disk on 2026-10-14: `parseBoardDump` in `tools/guide/dump.ts`, `copperGraph(dump)` and `CopperGraph { components, componentCount }` in `tools/stripboard/copper.ts`, `netlistEquivalence(dumpText, reference)` and `ReferenceNets` in `tools/stripboard/equivalence.ts`, `loadRules(file?)` in `tools/stripboard/rules.ts`, `leadSpanFor(footprint, spans?, unsourced?)` in `lib/kicad/lead-span.ts`.

**Ordering.** Task 2 gates everything; Task 3 runs early so the boundary cannot erode; Task 10 gates Task 11. **Task 9 no longer waits on anything** — the fork push was authorised on 2026-10-14 (see its Step 1).
