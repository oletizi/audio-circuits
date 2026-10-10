# Stripboard placement cost: the cut/bridge identity, its floor, and the levers

Status: **analysis and specification.** Nothing here is built. No part was placed and no
layout was written in producing it; every number below came from reading the pinned
VeroRoute fork's source or from running one of its read-only verbs against the committed
layouts. The scratch scripts that produced the tables are named at each table so the
measurement can be re-run.

Scope: the five Pultec section boards under `boards/pultec-*`, whose networks are
`physicalBoard(section)` in `circuits/pultec/physical/board.ts`.

---

## 0. A standing rule this work contradicts, and why

`CLAUDE.md` says, under "Who does what, and why":

> **Never place parts or route a board.** The tooling verifies a layout against a circuit
> and reports; it does not author one.

**The owner has overridden that rule for this purpose.** Recorded here plainly, with the
reasoning, because an override nobody wrote down is indistinguishable from a violation.

| | |
| --- | --- |
| Decision | An agent may compute and apply stripboard placements that minimise cuts and wire bridges on a fixed hole grid. |
| Who | The owner, in commissioning this analysis. |
| Why | The rule exists to keep *judgement* calls away from agents - "is this schematic legible", "is this board buildable by a person holding it". Cut and bridge minimisation is not that kind of question. On a fixed grid it is a combinatorial problem over countable quantities: `--dump-board` reports the cut count, the bridge count and every part's position, and §1 below shows the cut count is an exact function of the placement, not an opinion about it. What the rule protects - legibility, buildability, the feel of the thing in the hand - is untouched, and §4 deliberately keeps it out of the objective. |
| Consequence | `CLAUDE.md` needs amending to scope the prohibition to the judgement calls it was written for, and to name this document as the carve-out. **That edit is not made here** - this document does not touch `CLAUDE.md`. |

A second standing rule is **not** overridden and governs §4:
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`, "The governing
principle":

> **An agent may never author the acceptance criteria for the specific artifact it is
> producing.**

Everything in the objective function of §4 is either a count `--dump-board` prints, a
limit the fork's own source fixes, or the one number the owner supplies. There is no
"tidiness" or "legibility" term, and there is deliberately no term an agent would score
itself on.

---

## 1. The identity

### 1.1 The sketch, and what survives of it

The sketch handed to this analysis was:

> A strip is divided into SEGMENTS by cuts. Over a board with `S` strips and `C` cuts the
> number of segments is `S + C`. A net occupying `k` disjoint segments needs `k - 1`
> connections to rejoin them - each supplied either by a WIRE BRIDGE or by a component
> lead that happens to span those strips.

**The first sentence is exactly right.** The second half is wrong in one specific and
consequential way, corrected in §1.5.

### 1.2 What a cut is, in the fork's own terms

There is no "strip break" object in VeroRoute's board model. `Board::AutoFillVero()`
(`Src/Board.cpp`) paints an electrical `nodeId` onto every hole a strip covers, and
`DeriveCuts` (`Src/Reconcile_cuts.cpp`) emits one `StripCut` at every position where that
`nodeId` changes between two strip-adjacent holes:

```
if ( bHavePrev && nodeId != prevNodeId )
    out.push_back( StripCut{ holeBefore, pos } );
```

So a cut is not an invented concept and not a heuristic. **It is a `nodeId` boundary.**

### 1.3 Assumptions

The identity needs these, and each is checkable:

| | Assumption | Status on the five boards |
| --- | --- | --- |
| A1 | The board is in strip mode (`VERO_TRACKS 1`). | Holds: `VERO_TRACKS 1`, `VERTICAL_STRIPS 0` on all five. |
| A2 | Strip connectivity is painted - every in-bounds hole that is neither a pin nor a physical gap carries a `nodeId`. `AutoFillVero` runs on `--update` and on `--author --op autofill`, and **not** on `--import --strips` or `--set-strips`. | Holds: `CUT_STATE COMPUTED` on all five. An unpainted board reports `CUT_STATE UNRESOLVED` and `DeriveCuts` is never reached, so the identity is not silently wrong there - it is refused. |
| A3 | No physical gap (`Element::GetIsHole()` or `GetSoicProtected()` - `Strips::IsPhysicalGap`) falls inside the bounds. A gap severs a strip *without* a cut. | Holds (no SOIC parts, no drilled-out holes). With `G` such gaps the identity generalises to `Segments = S + C + G`. |
| A4 | No unpainted wire end sits mid-strip. One forces `CUT_STATE UNRESOLVED`. | Holds: `0` `WIRE` lines on all five. |
| A5 | An unpainted component pin is transparent to strip continuity (`Strips::IsUnconnectedComponentPin`) - it neither creates nor removes a segment. | Holds vacuously: `0` `CUT_UNCONNECTED_PIN` lines on all five. |
| A6 | "Strip" means a row (horizontal mode) or column (vertical mode) inside `Board::GetBounds` - **not** inside the saved grid. `GetStripAxis` (`Src/Reconcile_strips.cpp`) derives the walk range from `GetBounds`, so strips outside the occupied bounding box are never walked and cost nothing. | Holds. §7 records that `GetBounds` is not reported by any verb. |

### 1.4 The derivation

Let `S` = strips inside the bounds, `C` = cuts, and let a **segment** be a maximal run of
strip-adjacent holes carrying one `nodeId`.

**Lemma 1 (the sketch's first half).** On one strip, `c` cuts partition the hole run into
`c + 1` segments. Summing over strips:

> **Segments = S + C.**

**Lemma 2 (an empty strip is one segment, not many).** A strip inside the bounds with no
pin on it is painted a *single* fresh `nodeId`, not one per hole. `AutoFillVero`'s loop
ends with

```
nodeIdTop = pC->GetNodeId(); lenTop = 1;	// Start top count
```

so the hole it has just painted becomes the "top run" for the next hole, which then takes
that same id by the shorter-run-wins rule. Such a strip contributes one segment and one
strip, and they cancel.

*Measured, because this is the step the first reading of the source got wrong.* On a
scratch copy of low-boost, `--stretch --ref C19 --direction grow` was accepted 13 times,
which carried that capacitor across 11 strips that previously held nothing, and
`--author --op autofill` then reported **5 cuts - the same 5 as before**, all on one
strip. Had an empty strip cost one segment per hole it would have cost ~25 cuts each.
(`scratchpad/experiments.sh`, and the follow-up run in the session log.)

**Lemma 3.** Every segment carries either a real net's `nodeId` or an empty strip's filler
id. With `N` = real nets placed, `k_n` = segments net `n` occupies, and `E` = empty
in-bounds strips:

> **Segments = Σ_n k_n + E.**

**Theorem.** Writing `J = Σ_n (k_n − 1)` for the **segment joins** the layout requires, and
`S_occ = S − E` for the strips that carry at least one real net, Lemmas 1 and 3 give
`S + C = N + J + E`, and the empty strips cancel:

> ## **C = N + J − S_occ**

Three countable quantities. `N` is a property of the circuit. `S_occ` and `J` are
properties of the placement, and nothing else enters.

**Corollary (the achievable range).** `J` is at least `0` (every net one segment) and at
most `P − N`, where `P` is the pin count (every pin its own segment). So for a given
circuit on a given number of strips:

> **N − S_occ ≤ C ≤ P − S_occ.**

The circuit fixes both endpoints. The placement fixes only where between them the board
lands.

### 1.5 Where the sketch was wrong

> "...each supplied either by a WIRE BRIDGE or by a component lead that happens to span
> those strips."

**A component lead can never supply a join.** A two-terminal part's two leads sit on two
*different* nets by construction, so stretching it across strips `r` and `r+n−1` connects
net A to net B - it does not rejoin one net's two segments. The three things that do
supply a join are:

1. a **solder bridge** between two *adjacent* strips at a shared column - VeroRoute derives
   these itself (`Board::CalcSolder`, read back by `DeriveBridges`), so they appear as
   `SOLDER` lines without anyone placing them;
2. a **wire**, for segments on non-adjacent strips - nothing derives these, so a net that
   needs one and has not got one is simply reported `incomplete` by `--check`;
3. a **multi-pin component with two pins on one net**, which joins them through the part.

What stretching actually buys is therefore not a substitute bridge. **It lets a pin reach
the strip its net already occupies, so that no join is needed in the first place** - it
pushes `J` down, which §1.4 shows is worth one cut each.

A second correction, to the geometry premise:

> "a two-terminal part whose leads land on the SAME strip is a short and therefore
> useless."

It is a short **only if no cut separates the two leads.** With a cut between them, a part
lying along a strip and straddling that cut is an ordinary, correct stripboard idiom - and
it is what four of the five committed layouts do for every single part. The premise is not
an impossibility, it is a *price*: §3.1 measures it.

### 1.6 The identity, verified

`scratchpad/verify-identity.ts` rebuilds every pin's hole from `--dump-board` (anchor
position plus the footprint patterns in `Src/CompTypes.cpp` and `Src/FootPrint.h`) and
re-derives the cut list, for the four boards whose parts all lie *along* the strips:

| board | pins rebuilt | N | S_occ | J | N + J − S_occ | cuts predicted | **cuts reported** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mid | 71 | 23 | 4 (rows 0,1,2,4) | 46 | 65 | 65 | **65** |
| hi-boost | 44 | 16 | 3 (rows 0,1,2) | 27 | 40 | 40 | **40** |
| hi-cut | 35 | 11 | 3 (rows 0,1,2) | 24 | 32 | 32 | **32** |
| low-cut | 27 | 9 | 2 (rows 0,2) | 16 | 23 | 23 | **23** |

Exact on all four. low-boost cannot be rebuilt that way - its parts are turned *across*
the strips, and §3.2 explains why the dump then hides their lead span - so it is checked by
hand from its 40-line dump: nets on strips are rows 3 (six nets), 5, 7, 9 and 10, giving
`S_occ = 5`; only `lo_boost_in` occupies two segments (rows 9 and 10), giving `J = 1`; and
`N + J − S_occ = 9 + 1 − 5 = ` **5**, the reported count. Its one join is supplied by its
one `SOLDER` line, at `(9,6)-(10,6)`.

---

## 2. The floor, per board

### 2.1 What the floor is

From the corollary, with `R` strips physically available:

> **C_floor = max(0, N − min(R, N)) = max(0, N − R)**

attained by a placement in which **(a)** every net occupies exactly one segment (`J = 0`),
and **(b)** no strip inside the bounds is left without a net, which is free - empty strips
cancel, so the board may simply be larger than it needs. Condition (a) is the whole of it.

A placement meeting (a) is **one net per strip**, and that has a geometric price: a part
joining nets on strips `r` and `r'` must physically span `|r − r'| + 1` holes. So the
arrangement of nets along the strips must be a *linear arrangement of the net graph whose
bandwidth is within the span a part can reach* (§3.2). `scratchpad/netgraph.ts` measures
that; the floor is a lower bound either way, and §7 records that the floor is loose
because feasibility of the packing is not proven here.

### 2.2 The table

Board facts from `--dump-board`; grid dimensions from the clamp probe in
`scratchpad/measure.ts` (see §6.3); model facts from `physicalBoard(section)`.

| board | N (on board) | P (pins on board) | S_occ | grid (rows × cols) | **C floor at current S_occ** | **C floor at R strips** | **C actual** | gap to floor at R | J | solder bridges | wires |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mid | 23 | 71 | 4 | 35 × 37 | 19 | **0** | **65** | 65 | 46 | 3 | 0 |
| hi-boost | 16 | 44 | 3 | 35 × 37 | 13 | **0** | **40** | 40 | 27 | 0 | 0 |
| hi-cut | 11 | 35 | 3 | 35 × 37 | 8 | **0** | **32** | 32 | 24 | 3 | 0 |
| low-cut | 9 | 27 | 2 | 35 × 37 | 7 | **0** | **23** | 23 | 16 | 0 | 0 |
| low-boost | 9 | 27 | 5 | 14 × 34 | 4 | **0** | **5** | 5 | 1 | 1 | 0 |

The floor at `R` strips is 0 on all five because every board's grid has more rows than the
board has nets. The *interesting* floor is the middle column: **even keeping each board at
exactly the number of strips it uses today, mid's 65 cuts have a floor of 19 and low-cut's
23 have a floor of 7.**

### 2.3 Against the current model, not the stale layout

All five layouts are stale. `--check` against the netlist exported from today's
`physicalBoard` (`scratchpad/export-and-check.ts`) reports a schematic delta on every
board - the scaffold stand-in parts are not placed yet. A future placement works from the
model, so these are the numbers to aim at:

| board | nets (model) | on-board components | on-board pins | off-board components (break out as free single-hole pads) | **C floor at R = 35** |
| --- | --- | --- | --- | --- | --- |
| mid | 28 | 31 | 68 | 8 | 0 |
| hi-boost | 20 | 20 | 46 | 7 | 0 |
| hi-cut | 14 | 19 | 44 | 2 | 0 |
| low-cut | 14 | 18 | 42 | 2 | 0 |
| low-boost | 14 | 17 | 40 | 2 | 0 |

### 2.4 The finding that reframes the whole baseline

`--check` also reports **routing completeness per net**, and this is the single most
important measurement in this document:

| board | nets complete | nets **incomplete** | nets blocked (parts not yet placed) | cuts |
| --- | --- | --- | --- | --- |
| mid | 1 | **19** | 8 | 65 |
| hi-boost | 0 | **13** | 7 | 40 |
| hi-cut | 1 | **7** | 6 | 32 |
| low-cut | 0 | **6** | 8 | 23 |
| low-boost | 6 | **0** | 8 | 5 |

**Four of the five cut counts describe layouts that do not conduct.** Their `J` is 46, 27,
24 and 16 while they supply 3, 0, 3 and 0 solder bridges and no wires at all, so most of
the required joins are simply absent - which is exactly what the `incomplete` lines say.
`65`, `40`, `32` and `23` are therefore not baselines to improve on; they are the cut cost
of unfinished work. Only low-boost is a working layout, and it is the one at `J = 1`.

---

## 3. The levers, quantified

### 3.1 Clustering: putting a net's pins on one strip

**What it changes.** `J`. Worth exactly **one cut per split eliminated**, by §1.4, and it
simultaneously removes one join that would otherwise need a bridge or a wire.

**What it is worth on these boards.** The identity partitions every board's cut count into
exactly two addends, and this lever owns the larger one:

| board | C | = N − S_occ (the strip term) | + J (the clustering term) | clustering's share |
| --- | --- | --- | --- | --- |
| mid | 65 | 19 | **46** | 71% |
| hi-boost | 40 | 13 | **27** | 68% |
| hi-cut | 32 | 8 | **24** | 75% |
| low-cut | 23 | 7 | **16** | 70% |
| low-boost | 5 | 4 | **1** | 20% |

**Its limit.** `J ≥ 0`, and `J = 0` requires every net's pins to share one strip. The
binding constraints are the column budget (a net with `d` pins needs `d` holes on its
strip, and `max d` is 14 on hi-cut and low-boost against 37 columns) and the span reach of
the parts that have to arrive there, which is §3.2.

**Why the four import-placed boards sit at the top of the range.** With every part laid
*along* a strip, nearly every pin becomes its own segment, so `J → P − N`. Measured:
`P − N` is 48, 28, 24, 18 against `J` of 46, 27, 24, 16 - on hi-cut it is exact. That is
also the whole explanation of the "cuts per pin ≈ 0.9" regularity in §5.

### 3.2 Stretch: making a part reach a distant strip

**What it changes.** Which strips a part's two leads can land on, and therefore whether a
net has to split at all. A part whose footprint spans `n` holes, turned across the strips,
joins strip `r` to strip `r + n − 1`.

**What spans are reachable.** From `CompTypes::GetMinLength`/`GetMaxLength`
(`Src/CompTypes.h`) and `FootPrint::CanStretch` (`Src/FootPrint.h`), for every family these
boards use:

| family | min footprint span | max footprint span | strips a part can bridge | increment per `--stretch` |
| --- | --- | --- | --- | --- |
| `RESISTOR`, `CAP_FILM`, `CAP_FILM_WIDE`, `CAP_CERAMIC`, `INDUCTOR`, `DIODE` | 2 holes | **16 holes** | `r` to `r+1` … `r` to `r+15` | 1 hole |
| `CAP_ELECTRO_200/250` | 2 holes | 16 holes | as above | 1 hole |
| `CAP_ELECTRO_300` | 3 holes | 16 holes | `r+2` … `r+15` | 1 hole |
| `CAP_ELECTRO_400` | 5 holes | 16 holes | `r+4` … `r+15` | 1 hole |
| `CAP_ELECTRO_500/600` | 6 holes | 16 holes | `r+5` … `r+15` | 1 hole |
| `BLOCK_200MIL<n>` | `2n+1` holes | `2·maxPins+1` | fixed 200-mil pitch | 2 holes |
| `WIRE` | 2 holes | `INT_MAX` | unbounded | 1 hole |

`lib/kicad/import-string.ts` enforces the same ceiling from the netlist side
(`MIN_SPAN = 1`, `MAX_SPAN = 15` grid steps, i.e. 2–16 holes), citing `Src/CompTypes.h`.

**Measured headroom.** On a scratch copy of low-boost (`scratchpad/experiments.sh`):

- `--stretch --ref R2 --direction grow` was accepted **13 times** and refused on the 14th.
  `R2` is a bare `RESISTOR` (3-hole default on the stale board) and 3 + 13 = 16, the ceiling.
- `--stretch --ref C19 --direction grow` was likewise accepted **13 times** - `CAP_FILM`,
  same 3-hole default.
- `--stretch --ref board_terminals --direction grow` was **refused immediately**. A terminal
  block's pin pitch is not a lever.

Against today's model, which declares `CAP_FILM2` (3 holes) and `RESISTOR4` (5 holes):
**13 increments of headroom on every film capacitor and 11 on every resistor.**

**One measured hazard.** Growing `C18` (a `CAP_FILM_WIDE`) 13 times left it reporting
`FLOATING` in the dump - `--stretch` exited 0 at every step while some step unplaced the
part. A placer must re-read the dump after every stretch and reject a step that floats a
component; the verb will not tell it.

**The physical bound, and what is missing.** The repository fixes the footprints:

- resistors: `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal`
  (`AXIAL_RESISTOR`, `circuits/pultec/physical/parts.ts`) - a 6.3 mm body on a 10.16 mm
  pitch, so 1.93 mm of lead is already bent out per side.
- film capacitors: `Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm` → `CAP_FILM2`
  (`FILM_CAPACITOR_IMPORT_STRINGS`, `lib/kicad/import-string.ts`), body 7.2 × 2.5 mm, leads
  on 5.00 mm centres, dimensions read from the TDK/EPCOS B32529 datasheet per
  `docs/pultec/capacitor-selection.md`.

Reaching VeroRoute's 16-hole ceiling means a 15 × 2.54 = **38.1 mm** lead pitch. For the
resistor that is `(38.1 − 6.3) / 2 = 15.9 mm` of lead extending beyond each end of the body;
for the capacitor, whose leads leave the *same* face, it is `(38.1 − 5.00) / 2 = 16.55 mm`
of outward splay per lead, which is a different and probably tighter geometry than an axial
part's.

**The repository holds no data on lead length or bend radius for either part.** A grep of
`docs/` finds body dimensions, lead *pitches* and courtyards, and nothing at all about how
long a lead is or how tightly it may be bent. So the
numbers above are arithmetic on the footprints, not a reach claim, and **no maximum
physical span is asserted here.** What would settle it:

1. Measure, on the stock actually in the parts drawer, the straight lead length from body
   shoulder to tip for the DIN0207 resistor and the B32529 capacitor. That plus the body
   length gives the reachable pitch directly.
2. Record the minimum bend radius each lead tolerates without cracking the seal (the
   capacitor's datasheet states a minimum distance from body to bend; the resistor's does
   not and wants a bench answer).
3. Write both into a new table beside `FILM_CAPACITOR_IMPORT_STRINGS` as a per-family
   `maxSpanHoles`, with the measurement recorded in a comment the way the body widths
   already are. **Until that table exists, a placer must take `maxSpanHoles` as a required
   parameter and refuse without it** - the whole point of the stretch lever is reach, and a
   span the part cannot physically make is not a lever but a fiction.

### 3.3 Strip count: spreading nets over more strips

**What it changes.** `S_occ`. Worth exactly **one cut per additional strip that takes a net
off a shared strip**, by §1.4, up to `S_occ = N`, after which further strips are free and
worthless (they cancel, Lemma 2).

**What it is worth on these boards.** `N − S_occ`, the first addend of §3.1's table: **19,
13, 8, 7 and 4 cuts.** Every board has the strips to spend - mid uses 4 of 35 rows.

**Its limit.** `S_occ ≤ min(N, R)`. Beyond `N` the lever is exhausted. The physical price
is board height: one net per strip for mid's 28 model nets is a 28-strip board, 71 mm tall
at 0.1 in pitch.

### 3.4 Strip orientation

Two separate things live under this heading and they must not be conflated.

**(a) The board's strip axis** - `--set-strips horizontal|vertical`, which "changes the
track style and nothing else" and moves no part. Swapping it transposes the problem:
strips become columns, so `S` becomes the column count and the per-strip hole budget
becomes the row count. On these boards that is 37-vs-35 and 34-vs-14, so the lever is worth
nothing on the four import-placed boards and would cost low-boost most of its hole budget.
It matters only where the board is strongly non-square or where the net graph's bandwidth
differs between the two axes. **Not a lever of interest here.**

**(b) A part's own orientation** - whether a two-terminal part lies *along* a strip
(straddling a cut, costing cuts, consuming one strip) or *across* it (costing no cut of its
own, consuming one column across several strips). This is the structural choice behind
§3.1's numbers: the four import-placed boards have every part along the strips and sit at
`J ≈ P − N`; low-boost has every part across and sits at `J = 1`.

**Measured, as a property of the layouts rather than a controlled experiment**, because no
verb can rotate a part (§6.1): the four along-strip boards report 0.85–0.92 cuts per pin;
the one across-strip board reports 0.19. That comparison is confounded - low-boost is also
the only hand-worked board and the only routed one - so it is evidence for the mechanism
§3.1 derives, not an independent estimate of the lever.

**Its limit.** A part across the strips consumes one column over its whole span, so the
column budget caps how many may cross the same strips at once: with 37 columns and mid's 31
on-board components, feasible but not roomy. Orientation also has no verb, so today it can
only be set at `--import` time or in the GUI.

### 3.5 Board dimensions

**What it changes.** `R` (the ceiling on `S_occ`, §3.3) and the per-strip hole budget (the
ceiling on how many pins a net may gather, §3.1). Both are hard constraints rather than
costs.

**On these boards.** Grids are 35 × 37 for mid, hi-boost, hi-cut and low-cut - identical,
which is the signature of VeroRoute's import default rather than a decision - and 14 × 34
for low-boost, which has been trimmed by hand. Four boards therefore have 31, 32, 32 and 33
unused rows, i.e. far more strips than §3.3 can spend.

**Its limit.** The physical stripboard the owner buys. This is the right place for that to
bite, and §4 makes it a constraint, not a weighted term - a board that does not fit the
stock is not a slightly worse board, it is not a board.

### 3.6 Diminishing returns, by lever

Summing §3.1 and §3.3 accounts for **100%** of every board's cut count exactly, by the
identity. So the ordering of effort is not a guess:

1. **Clustering (`J → 0`)**: 68–75% of the cost on the four unfinished boards. Do this first.
2. **Strip count (`S_occ → N`)**: the remaining 25–32%. Nearly free here, since the strips
   are already on the board.
3. **Stretch**: not a cost term of its own. It is the *enabler* of 1 and 2 - without reach,
   one net per strip is not constructible - and its value is therefore already counted inside
   them. Spend effort on it only where a specific part cannot reach.
4. **Orientation (board axis)** and **board dimensions**: worth nothing on these five, and a
   constraint rather than a lever.

---

## 4. The objective function

### 4.1 The function

> **minimise  F = C + ρ_w · W + ρ_s · B**

where, all read straight out of `--dump-board` on the candidate layout:

| symbol | what it is | where it comes from |
| --- | --- | --- |
| `C` | cuts | count of `CUT ` lines |
| `W` | wire bridges | count of `WIRE` lines |
| `B` | solder bridges | count of `SOLDER` lines |
| `ρ_w` | **the owner's exchange rate**: hands-cost of one wire bridge in units of one cut | §4.3 - a parameter, never a constant |
| `ρ_s` | hands-cost of one solder bridge in the same units | §4.3 |

Subject to these hard constraints, every one of them machine-checkable:

| | Constraint | How it is checked |
| --- | --- | --- |
| H1 | Every net electrically whole. | `--check BOARD --netlist NET` exits 0 and reports no `incomplete` net. |
| H2 | Cuts actually derivable. | `CUT_STATE COMPUTED` - never `UNRESOLVED`, never `NOT_APPLICABLE`. |
| H3 | Every part placed. | No `FLOATING` on any `PART`/`PAD` line (§3.2's measured hazard). |
| H4 | Every lead span within the tool's range. | 2–16 holes, `CompTypes::GetMinLength`/`GetMaxLength`. |
| H5 | Every lead span within the part's **physical** reach. | A per-family `maxSpanHoles` the owner supplies; **refuse without it** (§3.3, §7). |
| H6 | The layout fits the physical board. | Occupied bounds within the owner's declared stripboard rows × columns. |
| H7 | The layout still matches the circuit. | `--check`'s schematic-delta section is empty. |

### 4.2 Why there is no legibility term

There is no "tidiness", "legibility" or "neatness" addend, and that is deliberate per §0:
an agent scoring its own layout on legibility is exactly the failure
`2026-10-08-agent-authored-boards-design.md` records. Everything in `F` is a line count
from a report the agent did not write, and everything in H1–H7 is either that same report
or a number the owner gave. If legibility must enter, it enters the way that design says:
as a reviewed, circuit-independent rule library, or through an independent reviewing agent -
never as a term in this function.

### 4.3 The one input that cannot be derived

**`ρ_w`, the exchange rate between a wire bridge and a cut, in terms of the owner's own
hands.** Nothing in the repository, the fork or the circuit can supply it. It is a fact
about one person's bench, their cutter, their eyesight and what they find tedious.

**Proposed default: `ρ_w = 3`.** The reasoning, offered as reasoning and not as a
measurement:

- A cut is one operation: one twist of a spot-cutter or drill bit in one hole. No part to
  source, no lead to cut or strip, no second solder joint, nothing that can later work loose.
- A wire bridge is several: measure, cut, strip two ends, form, insert, solder two joints -
  and it adds a physical object that can be the wrong length, lift, or short against a
  neighbour.
- Pulling the other way: a cut is permanent and hard to inspect. A missed cut is an
  invisible short, and an over-enthusiastic one nicks the neighbouring strip. So a bridge is
  dearer than a cut but not by an order of magnitude.

Three is a defensible middle. **It is a default, not a finding**, and the whole point of
making it a parameter is that the owner's own number replaces it without touching anything
else.

**Proposed default: `ρ_s = 1`.** A solder bridge between adjacent strips is one blob at one
hole pair, comparable to one cut, and VeroRoute derives where it goes without being asked.

Two consequences worth stating, so the parameter's effect is legible:

- At `ρ_w = 1` the optimiser will trade a cut for a bridge freely and will tend to produce
  wire-heavy boards.
- As `ρ_w → ∞` it will never bridge, and `H1` then forces one net per strip - which by §2.1
  is the `C_floor = 0` regime. So a *large* `ρ_w` and a *large* board are the same
  instruction, and that is the regime low-boost is already in.

---

## 5. Which normalisation predicts, and which does not

`scratchpad/measure.ts` plus §1.6. `P` is pins on the board, `parts` is `PART` + `PAD` lines.

| board | C | C / N | C / parts | C / P | **J / (P − N)** |
| --- | --- | --- | --- | --- | --- |
| mid | 65 | 2.83 | 1.33 | 0.92 | 46/48 = **0.96** |
| hi-boost | 40 | 2.50 | 1.25 | 0.91 | 27/28 = **0.96** |
| hi-cut | 32 | 2.91 | 1.45 | 0.91 | 24/24 = **1.00** |
| low-cut | 23 | 2.56 | 1.28 | 0.85 | 16/18 = **0.89** |
| low-boost | 5 | 0.56 | 0.28 | 0.19 | 1/18 = **0.06** |

**None of `C/N`, `C/parts` or `C/P` has predictive power, and the numbers show why.** Across
the four import-placed boards `C/P` is 0.92, 0.91, 0.91, 0.85 - a coefficient of variation
of about 3% - which looks like a law until low-boost arrives at 0.19 and the five-board
coefficient of variation jumps to roughly 38%. The apparent constant is not a property of
the circuits. It is the fingerprint of the *placer*: lay every part along a strip and every
pin becomes its own segment, so `C ≈ P − S_occ` and `C/P ≈ 1 − S_occ/P`. Fitting a
cuts-per-pin ratio to these boards would be fitting to a placement strategy and then
reporting it as circuit complexity. `C/N` and `C/parts` fail the same way for the same
reason.

**What does predict is not a fit at all.** `C = N + J − S_occ` is exact on all five boards
(§1.6), to the unit, with no residual. The circuit contributes only `N` and the endpoints
`N − S_occ` and `P − S_occ`; everything else is the placement. The one dimensionless number
worth tracking is therefore

> **κ = J / (P − N) ∈ [0, 1]** - the fraction of the available splitting a layout has
> committed, so that `C = (N − S_occ) + κ · (P − N)`.

Measured: **0.96, 0.96, 1.00, 0.89, 0.06.** The four unfinished boards are at or within 11%
of the worst possible value; low-boost is at 6% of it. `κ` is the progress variable for §6,
it is comparable across boards of different sizes, and it is computable from `--dump-board`
alone.

**On the sample size.** Five boards cannot support a regression, and this document does not
attempt one - there is no fitted coefficient anywhere in it. Worse, §2.4 shows four of the
five are not routed, so any curve through these points would be a curve through four broken
layouts and one working one. The identity is used precisely because it needs no sample: it
is derived from the cut-derivation source and then confirmed, exactly, on every board.

---

## 6. The iterative scheme

### 6.1 Shape

Hill-climbing on `F` over the layout, with the dump as the only measurement surface.

- **State**: a `.vrt`.
- **Moves**: `move(part, Δrow, Δcol)`, `rotate(part)`, `stretch(part, grow|shrink)`,
  `add-wire(at)`, `delete-wire`. Of these, **only `stretch` and `add-wire` exist today**
  (§6.2).
- **Evaluation**: apply the move to a scratch copy, run `--author --op autofill`, run
  `--dump-board`, compute `F` and check H1–H7. Reject the move if any hard constraint fails.
- **Acceptance**: accept on `ΔF < 0`. A restart schedule or simulated annealing is an
  implementation choice this document does not fix.

### 6.2 Phases

**Phase 1 - establish the targets, no placement.** For each board compute `N`, `P`,
`C_floor = max(0, N − R)`, the net graph, `max net-graph degree`, the bandwidth lower bound
`⌈maxdeg/2⌉` and the bandwidth of one concrete ordering. Record them. This phase is the
tables in §2 and §6.4 and is already done.

**Phase 2 - seed by construction, not by search.** Assign one net per strip in the order a
low-bandwidth linear arrangement gives, place each part across the strips of its two nets,
and stretch it to reach. This should land at or near `J = 0`, i.e. at `C = N − S_occ`,
without any search at all. Search is for what construction cannot reach.

**Phase 3 - hill-climb** under §6.1 until the stopping rule fires.

**Phase 4 - report**, and hand the layout to a human for the judgement `CLAUDE.md`
reserves. Nothing in phases 1–3 decides whether the board is nice to build.

### 6.3 Budget, measured

The headless interface is one gesture per process launch, which sounds prohibitive and is
not. Measured on this machine: **20 `--dump-board` runs on mid in 0.26 s real, and 20
`--stretch` runs on low-boost in 0.24 s** - about **13 ms per invocation**, so roughly
**4,600 gestures per minute**. A move costs a stretch-or-move plus an autofill plus a dump,
so on the order of **1,500 candidate evaluations per minute**. A 100,000-evaluation climb is
about an hour of wall time. The process-per-gesture interface is not the bottleneck and does
not need batching.

### 6.4 The diminishing-returns stopping rule

Stated in measurable terms, with no judgement call. Let `F_0` be the seed layout's objective
(phase 2), `F_i` the best after round `i`, and a **round** be a full sweep of every
single-part move in the move set.

**Stop at the first of:**

| | Rule | Measured how |
| --- | --- | --- |
| S1 | **At the floor.** `C = C_floor` and `W = 0`. | `--dump-board` counts vs §2.2. Nothing below the floor exists, so this is terminal. |
| S2 | **Within tolerance of the floor.** `(F_i − F_floor) / max(1, F_0 − F_floor) < τ`, where `F_floor = C_floor` and `τ` is the owner's tolerance; proposed default `τ = 0.05`. | Arithmetic on counts. |
| S3 | **Local optimum under the move set.** A whole round produced no accepted move. | Accepted-move counter for the round is 0. |
| S4 | **Marginal yield collapsed.** `(F_{i−1} − F_i) / evaluations_i < 1 / 2000` for two consecutive rounds - fewer than one unit of `F` bought per 2,000 candidate evaluations, i.e. under one unit of `F` per ~80 s at §6.3's measured rate. | Counters only. |
| S5 | **Budget spent.** The owner's evaluation cap reached. | Counter. |

S4 is the diminishing-returns rule proper. `1 / 2000` is a proposed default and a
parameter, chosen so that the threshold is a concrete amount of machine time rather than an
impression. S2's `τ` and S5's cap are the owner's.

**Phase-1 numbers the scheme needs** (`scratchpad/netgraph.ts`; net-graph vertices are nets,
edges are forced by on-board components, off-board components break out as free single-hole
pads and force nothing):

| board | nets | net-graph edges | max degree | bandwidth **lower** bound `⌈maxdeg/2⌉` | bandwidth of one RCM ordering (an **upper** bound) | within the 15-strip span ceiling? |
| --- | --- | --- | --- | --- | --- | --- |
| mid | 28 | 29 | 6 | 3 | 5 | yes |
| hi-boost | 20 | 21 | 6 | 3 | 4 | yes |
| hi-cut | 14 | 19 | 10 | 5 | 9 | yes |
| low-cut | 14 | 22 | 12 | 6 | 11 | yes |
| low-boost | 14 | 22 | 10 | 5 | 9 | yes |

Every board admits a one-net-per-strip arrangement whose worst part span is within
VeroRoute's 16-hole ceiling, with margin. **So the obstruction to `C = 0` on these boards is
not the tool's span limit. It is whether a 10-to-12-strip span is physically reachable by a
7.2 mm film capacitor** - which is §3.2's unmeasured quantity and is the single piece of
missing data that most constrains this work.

The only component forcing more than two nets together is `junction_signals` on every board:
a `SIP5` carrying all five ladder nets at 1-hole pitch, so turned across the strips it pins
those five nets to five consecutive strips in a fixed order, and laid along a strip it puts
five nets on one strip and costs four cuts. That is a constraint on the arrangement, not an
obstruction to the floor.

---

## 7. What is missing from the tooling

### 7.1 `--author --op move` - the gap that blocks everything

`--author`'s ops are `group`, `select`, `move-label`, `add-wire`, `merge`, `autofill`
(`Src/Headless_author.h`). **There is no op that moves a component.** `move-label` moves a
text label, not the part. So no headless gesture can change a placement, and the whole of
§6 is unreachable today.

**What adding it involves.** Small, and the call it needs already exists:

- `Board::MoveUserComps(int deltaRow, int deltaCol)` (`Src/Board_components.cpp:1019`) is
  what the GUI's drag calls. It returns whether the grid was panned.
- `--author` already looks a component up by name through `CompManager` and already
  verifies its own effect before writing (`add-wire` checks `GetIsPlaced()` and then
  `GetRow()`/`GetCol()` against the request). A `move` op is: select the named component as
  `OpSelect` does, call `MoveUserComps`, then make the same placement check, then save.
- The one thing it must report that `add-wire` does not is **the pan**. `MoveUserComps`
  returning true means every other part's coordinates shifted, which a caller tracking
  positions across moves has to know about. §1.6's own measurement hit this: thirteen
  `--stretch` steps on `C19` panned the whole low-boost circuit up by three rows, silently.

### 7.2 `--author --op rotate`

Orientation is the structural lever behind §3.1's 68–75%, and nothing headless can set it.
`Board::RotateUserComps(bool bCW)` and `Board::RotateComps(const std::list<int>&, bool)`
(`Src/Board.h:872,876`) already exist, and `Component::Rotate` (`Src/Component.h:548`) is
the per-part primitive. Same shape of addition as `move`, with the same effect check -
compare `GetDirection()` before and after.

### 7.3 Four things `--dump-board` does not report

Each is state that changes what a board means while being invisible in every report, which
is the defect class the fork's own grammar comment says it exists to remove:

1. **A component's `DIRECTION`.** Whether a part lies along or across the strips is the
   single largest structural fact about a stripboard layout and appears nowhere.
2. **`GetCompRows`.** `PART`'s `SPAN` field is `Component::GetCompCols()`, which
   `Grid.h`'s `GetCols(direction)` **swaps with rows for direction `N`/`S`**. So for a part
   turned across the strips, `SPAN` reports its *body width* and its lead span appears
   nowhere. Measured: `R2` and `C19` on low-boost report `SPAN 1` and kept reporting `SPAN 1`
   across thirteen accepted `--stretch grow` steps that demonstrably changed their span - the
   anchor row moved and the circuit panned, the span field never did.
   This also makes `--help`'s claim about that field wrong: it says `SPAN` is
   "direction-aware, so it reads the same regardless of how the part is rotated on the
   board", and `GetCols(direction)` is precisely not that. Worth fixing in the help text as
   well as adding the field.
3. **The grid size** (`GetRows()`/`GetCols()`). Measured here only by a workaround: ask
   `--author --op add-wire --at 9999,c` to place a wire past the far edge and read the
   clamped position out of its refusal ("the wire was placed at 13,0 ... the position was
   clamped into the board"), remembering a `WIRE` is a 1×3 footprint so the anchor clamps to
   `rows−1` and `cols−3`. It needs a sweep over the other axis because a probe down an
   occupied lane floats instead of clamping. That is a clever trick and it should not be the
   interface.
4. **`GetBounds`.** This is the one that matters most for §1: `GetStripAxis` derives the
   strip walk from `GetBounds`, so `S` in the identity is a bounds quantity, and bounds
   include the text box as well as the parts (`Board::GetBounds`, `Src/Board.h:710`). `S_occ`
   was recovered here by reconstructing pin rows; a `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>`
   line would make the identity directly checkable from one dump.

### 7.4 What is not missing

- **`--stretch`** does exactly what the stretch lever needs, one increment per invocation,
  and refuses at the family's limit. Its only defect is that it can float a part while
  exiting 0 (§3.2).
- **`--author --op autofill`** re-runs `AutoFillVero` without needing a netlist, which is
  what makes a fast evaluation loop possible at all.
- **Speed.** 13 ms per gesture (§6.3). No batching needed.

---

## 8. Honest limits

| # | What could not be determined | What would settle it |
| --- | --- | --- |
| L1 | **The physical span a stretched part can reach.** VeroRoute's 16-hole ceiling is known; the part's is not, and §6.4 shows this is the binding constraint on reaching the floor. | Measure straight lead length from body shoulder to tip on the actual DIN0207 resistor and B32529 capacitor stock, and the minimum body-to-bend distance each tolerates. Record as a per-family `maxSpanHoles` beside `FILM_CAPACITOR_IMPORT_STRINGS`, with the measurement in a comment. Until then a placer must take the value as a required parameter and refuse without it. |
| L2 | **Whether `C = 0` is actually attainable** on any of these boards. §2 proves it is the floor and §6.4 shows no span-ceiling obstruction, but no packing feasibility argument is given: parts across the strips consume columns, and nothing here proves 31 of them fit in 37 columns without overlap. | Run phase 2 of §6.2 once `--op move` and `--op rotate` exist, and read the result. Construction answers this faster than any proof. |
| L3 | **`S_occ` is not directly observable.** It was reconstructed from pin rows (§1.6), which required knowing each footprint's pin pattern and each part's orientation - and orientation is not in the dump. The reconstruction is validated by reproducing all four cut counts exactly, which is strong, but it is not a direct reading. | §7.3's `BOUNDS` line, plus a `DIRECTION` field on `PART`. |
| L4 | **low-boost's identity is verified by hand, not by script.** Its parts are turned across the strips, so their lead spans are absent from the dump (§7.3 item 2) and the reconstruction script cannot run on it. | Same fix: report `GetCompRows`. |
| L5 | **The orientation lever (§3.4b) has no controlled measurement.** The 0.9-vs-0.19 cuts-per-pin comparison is confounded with "hand-worked versus import default" and with "routed versus not routed". | `--op rotate` (§7.2), then rotate one board's parts and re-measure with nothing else changed. |
| L6 | **`ρ_w` and `ρ_s` are proposals.** §4.3's values are reasoning about bench work, not measurement, and are flagged as such in the function. | The owner's own numbers, or a timed trial: cut ten strips and fit ten bridges, and take the ratio. |
| L7 | **The sample is five boards, four of them unrouted.** No ratio is fitted anywhere in this document for exactly that reason (§5). | More boards, and routed ones. The identity does not need them; any claim beyond the identity would. |
| L8 | **The committed cut counts are not a baseline.** `65 / 40 / 32 / 23` come from layouts `--check` reports as having 19, 13, 7 and 6 incomplete nets (§2.4), and all five are stale against today's model. | Re-measure after the scaffold work lands and the boards are updated. The floor table in §2.3 is already stated against the current model so it will not need redoing. |
