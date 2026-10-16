# Making the layout machinery able to express a Pultec board

**Status:** design, awaiting the owner's review.
**Scope:** the capability, not the boards. Laying out the five sections is a
separate piece of work that this one unblocks — see **Decomposition**.

## Why

The owner, 2026-10-15: *"let's do the pultec layouts. it's the goal of this
branch. it will also help vet our new machinery."*

The in-process layout system built by
`docs/superpowers/plans/2026-10-14-stripboard-model-and-search.md` works on the
two `transistor-preamp` circuits and beats the owner's hand layouts on his own
objective. **It cannot express a Pultec board at all.** Not "produces a poor
one" — it refuses before a candidate exists.

## What a probe established, with evidence

A throwaway feasibility probe ran the real `pultec-low-boost` circuit through
the real pipeline and stopped at the first obstacle each time. Nothing was
modified. Its findings, each independently re-verified before being written
here:

**Nothing is missing that needs a datasheet.** 19 components, 14 nets, 50 pins,
and only four distinct footprints — every one with a recorded `LEAD_SPANS` entry
and a recorded `PIN_PATTERNS` entry. The first hypothesis was a missing part
record and it was wrong.

**B1 — off-board landings have no kind in the seed model.** `seedPartsFrom`
refuses `RV_LO_BOOST` (the 47K level pot) and `SW_LO_BOOST` (one pole of the
shared low-frequency rotary) because neither carries a footprint: they are
panel-mounted and reach the board as pads. `onBoard()` in
`tools/stripboard/targets.ts` already draws that distinction, and the IMPORT
path already models it — `tools/stripboard/vero-import.ts` declares
`OFF_BOARD_TERMINAL` and `padPlacementOf` makes each pad a one-hole
`Placement`. The CONSTRUCTIVE path has no counterpart: `SeedPart` is
`two-lead | fixed-field` and nothing else. Handing the seeder the repository's
own sentinel only moves the refusal to `stripboard-seed-parts-no-pattern`.

**B2 — a 1×N pin header can only be laid one way, and it is the wrong way.**
`ACROSS_DIRECTIONS` in `lib/stripboard/seed-fit.ts` is `S` and `N` only: a
fixed-field part can be flipped but never quarter-turned, and `alongSteps`
always indexes strips. Verified directly against the recorded patterns:

| footprint | pads | distinct `xSteps` | distinct `ySteps` |
| --- | --- | --- | --- |
| `PinHeader_1x05_P2.54mm_Vertical` | 5 | **1** | 5 |
| `PinHeader_1x02_P2.54mm_Vertical` | 2 | **1** | 2 |
| `DIP-16_W7.62mm` | 16 | 2 | 8 |
| `TO-92_Inline` | 3 | 3 | 1 |

So a 1×5 header puts all five pins on ONE strip, shorting five different nets,
and `checkField` correctly refuses. **The mapping is right for a DIP** — two
rows straddling strips with a cut between them is exactly what the owner
described — **and wrong for a 1×N header**, which needs the quarter-turn that
does not exist. This blocks every board carrying a header or a DIP, not only
the Pultec ones.

**B2a — the guard meant to catch this cannot fire.** `parts-row-axis` in
`lib/stripboard/seed-parts.ts` refuses a pattern whose `axis !== "x"`, but
`classifyPads` reports `axis: "x"` for a 1×N column because N rows of one pad
each decompose that way. It passes vacuously. That is this repository's
recurring defect — a predicate that can never fire reads exactly like one that
was tested and did not.

**B3 — the uniform-stride, one-net-per-strip seed cannot express this
circuit.** With B1 and B2 patched in the probe's scratchpad, **no ordering
builds**: all five `derivedOrderings` rules at strides 1–3, plus the
repository's own `assignStrips` gathered arrangement over five seeds. The
refusals are informative and three distinct kinds — reach at stride 1, field
cannot be seated at stride 2, off-board at stride 3.

The binding arithmetic, which is the whole design problem:

- `PinHeader_1x05` has a recorded band of `[5, 5]` holes and `geometry.kind ===
  "rigid"`: five pins on five CONSECUTIVE strips. Under a single uniform stride
  that forces **stride 1 for the whole board**.
- At stride 1, six `C_Rect_L7.2mm_P5.00mm` Cboost capacitors — recorded band
  `[2, 4]`, i.e. at most 3 strips of separation — tie ground (degree 10) to six
  DISTINCT junction nets. Ground's reach window is 6 strips; those six nets
  **exactly saturate it**, leaving no slack and no free scratch strip within
  reach of the anchor lead for the wire-join fallback. The refusal says so
  itself.

**One net per strip is what guarantees zero cuts, and it is also what makes
this circuit infeasible.**

## The owner's rulings this design is built on

- *"On the stripboard, I'm not going to stack them like hats, so they don't need
  to all be in the same place."* — junction header positions are NOT fixed input
  and are not shared across boards. The hardest constraint stays inside the
  search.
- *"I don't* require *a zero-cut board. I vastly prefer as few cuts as
  possible."* — cuts are admissible. **No new criterion follows from this**: the
  committed objective already prices a cut at 1.0 against 0.25 for a wire or a
  bridge, so "as few as possible" is already what the search minimises.
- *"Rigid parts are rigid. You cant push them out of the way or rout under
  them."* — both hard area rules stand unchanged and bind every generated board.
- *"The as-built diagram is instructive, but my directives are more authoritative
  than a file on disk."* — recorded in `CLAUDE.md`. A rule is not weakened
  because a built board breaks it.
- The branch is `feature/pultec-modular-scaffolding`: **the maximal scaffold is
  the point**, not an agent's embellishment. Each section board carries stand-in
  positions for the other four sections and the junction, and that is what
  `make check` grades.

## Design

Three changes, in dependency order. Each is separately testable and the first
two are mechanical.

### D1 — an off-board pad kind in the seed model

A third `SeedPart` kind: a one-hole terminal with no footprint geometry and no
orientation. `seedPartsFrom` builds it for a ref the footprint map does not name
**because the component carries only `part.symbol`** — distinguished from a ref
genuinely absent from the map, which must keep refusing by name. The shape to
match is `vero-import.ts`'s `padPlacementOf` and `OFF_BOARD_TERMINAL`;
`vero-export.ts` already round-trips such a placement.

Touches: `seed-model.ts`, `seed-parts.ts`, `seed-fit.ts`, and whatever
`moves.ts` needs so a pad can be relocated like any other placement.

### D2 — the quarter-turn for a fixed field, and a guard that can fire

`ACROSS_DIRECTIONS` gains the two quarter-turned facings so a moulded pin field
may be laid along a strip or across it, and the placer tries all four as it
already tries two. `board.ts`'s `holeInFrame` is the single owner of how a
facing maps a frame offset to a hole and must remain so — this is widening
which facings are attempted, not adding a second mapping.

**The decision that must be written down once, because two modules currently
contradict each other:** `lib/kicad/pin-pattern-model.ts` says rows are
"parallel to the strips" while `lib/stripboard/seed-model.ts` says "the along
axis is laid across the strips". Both cannot be right. The spec's position is
that the pattern module describes the FOOTPRINT (a fact about the part) and the
seed module describes a PLACEMENT (a choice about this board), so the two
vocabularies are different and the seeder chooses among facings rather than
inheriting one. Whichever wording survives, exactly one module may define it.

`parts-row-axis` must be made non-vacuous or replaced: either `classifyPads`
refuses to claim an axis it did not measure (a 1×N column has no measured
along-pitch), or the check reads the derived pad holes instead of the claimed
axis. A test over `PinHeader_1x02`, `PinHeader_1x05` and `DIP-16_W7.62mm` — the
three recorded footprints that expose it — is the evidence.

### D3 — widen the seed's strip model

Two relaxations, both of restrictions the constructor imposes on itself. Neither
adds machinery; both remove a reason the seeder refuses.

**D3a — a strip may host more than one net.** Today a net owns a strip and a
lead of another net may never land there. Relaxed, a strip hosts several nets in
disjoint column ranges and `derivedCuts` produces the cut between adjacent runs
of different nets — which it already does, and which was measured to agree with
VeroRoute on 54 of 54 cuts as to strip, count and separated run pair. This is
the change that opens the saturated window around ground.

**D3b — strip assignment becomes per-net rather than a uniform stride.**
`Ordering` is `{ name, nets, stride }` and `homeStripsFor(netlist, ordering,
grid)` already returns a `ReadonlyMap<string, number>`. Widen `Ordering` so an
explicit net→strip map may be supplied in place of nets-plus-stride; the map
form is what `tools/stripboard/seed-arrangement.ts`'s `assignStrips` already
returns, so the repository's own gathered arrangement becomes usable directly.
This is what lets the rigid header take five consecutive strips without forcing
every other net one strip apart.

**Both are needed and neither is sufficient.** D3a without D3b leaves the header
unable to get consecutive strips at a workable global stride; D3b without D3a
leaves ground's six-net window saturated.

## What is NOT changing

Stated so a later reader does not find these moved and assume it was intended:

- **the objective.** No area term, no tidiness term, no re-weighting. `OBJ2`
  forbids the second outright and the owner ruled on the first.
- **`stripboard/rules.json`** and every parameter in it, including the evaluation
  cap he set on 2026-10-15.
- **both hard area rules** and the exemption registry's scope — an exemption
  covers two named as-built boards and may never reach a generated one.
- **the benchmark gate.** The two `transistor-preamp` instances keep passing at
  their committed figures, and a figure that moves is REPORTED, never
  accommodated. This is the regression net for the whole change.
- **the `lib/stripboard/` → `tools/` boundary.** The core still reads no file
  and spawns nothing.

## Acceptance

**Who authors it matters more than what it says.** An agent may never author the
acceptance criteria for the artifact it produces, so this section names channels
that already exist rather than inventing a bar.

1. **The existing rules judge the board.** `violationsOf` empty, both hard area
   rules held, `HC1`–`HC10` as the grader applies them. None of these is new and
   none may be relaxed to make a board pass.
2. **The benchmark gate still passes** on both `transistor-preamp` instances, at
   figures counted off their own dumps at run time.
3. **The capability milestone is binary and is not a quality claim:**
   `pultec-low-boost` produces a sound candidate. It is the *existence* of a
   board that this piece of work is responsible for.
4. **Whether the board is any good is the owner's call on a render**, as it was
   for every seed in the previous plan. That judgement is not delegated to a
   figure and not made by the producing agent.

## Risks and open questions

- **D3a changes what the seeder guarantees.** Zero cuts was structural; it
  becomes a thing the objective pursues rather than a property of construction.
  Several modules state the old guarantee in prose and each must be corrected
  rather than left to go quietly false.
- **Cut count on the Pultec boards is unknown.** The owner prefers as few as
  possible and his own boards carry five; no figure is predicted here, and none
  should be adopted as a target.
- **A Pultec section is larger than anything measured.** The evaluation cap was
  sized from an 11-net circuit and `rules.json` says so. If a Pultec run reaches
  it, that is evidence for the cap and not a reason to raise it mid-run.
- **The four other sections are assumed to be the same problem as low-boost.**
  Only low-boost was probed. If `mid` — whose `B32529` capacitors are recorded
  as wanting a six-hole span against a four-hole reach — turns out to differ in
  kind, that is a finding for the plan rather than something to absorb.

## Decomposition

This spec is **piece 1 of two**. It ends when low-boost produces a board.

**Piece 2** — laying out the five sections, rendering each, getting the owner's
eye on them, and materialising them through the fork — is a separate spec with
its own plan, written once piece 1 has shown the machinery can express one of
these circuits. Splitting them keeps a demonstrable milestone in the middle
instead of five boards arriving at the end.
