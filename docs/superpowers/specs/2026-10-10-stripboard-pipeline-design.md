---
title: Stripboard placement and routing — the pipeline
date: 2026-10-10
status: draft-for-review
---

# An agent-driven, repeatable stripboard placement-and-routing pipeline

Sub-project **S1a** of `2026-10-08-agent-authored-boards-design.md`. This is a
specification. No implementation code was written producing it, no C++ was modified, no
`.vrt` was written, and the only existing document it changes is the parent's `S1a`
Deliverable row, which now cites this file.

Two documents are its evidence base and are cited rather than restated:

- `2026-10-10-stripboard-placement-cost-design.md` — the identity `C = N + J − S_occ`, its
  derivation from the fork's own cut-derivation source, its exact verification on all five
  boards, the floor per board, the levers quantified, the objective function and the
  stopping rule. Cited below as **COST**.
- `2026-10-10-stripboard-move-verb-findings.md` — what the vendored fork can actuate and
  observe today, measured against the shipped binary. Cited below as **MOVE**.

Anything measured for this document alone is marked **(measured here)** and names the
command. Anything undetermined is marked undetermined rather than estimated.

---

## 1. What this sub-project is for

Five discrete Pultec EQ section boards need stripboard layouts. **Four of the five
committed layouts do not conduct.** `--check` against the netlist exported from today's
`physicalBoard(section)` reports 19, 13, 7 and 6 incomplete nets on mid, hi-boost, hi-cut
and low-cut (COST §2.4). Their required segment joins are 46, 27, 24 and 16 while they
supply 3, 0, 3 and 0 solder bridges and no wires at all, so most of the joins are simply
absent. Their cut counts — 65, 40, 32, 23 — are therefore not baselines to beat. They are
the cut cost of unfinished work.

The cause is not a tuning problem. `--import`'s placement is `Board::AddComponent`'s
`-1, -1` branch: a row-major first-fit sweep that takes the first hole where `PutDown`
succeeds, always at direction `'W'`, never consulting `parsed.m_nets` — nets are painted
*after* every part is already fixed (MOVE §3). There is no placement strategy to improve.
**It is to be replaced.**

Only low-boost conducts, at 5 cuts against a derived floor of 4 (COST §2.2).

**The owner's instruction, and the reason this sub-project exists.** Laying these out by
hand is fiddly, repeatable, measurable work, and agent cycles are cheaper than the owner's.
A first solution that technically works while leaving a person doing remedial work is a
failure, not a delivery. The Pultec is the **forcing function** for building general
pipeline tooling, not a one-off to get past: every component below is specified over
"a circuit and a hole grid", and the five boards are what proves it.

S1a depends on S0 in the parent's table, and the dependency is real: all five layouts are
stale against today's model because the scaffold stand-in parts are not placed yet
(COST §2.3). The pipeline works from the model, so it needs the model the scaffold work
settles.

---

## 2. The objective, and why it has no taste in it

### 2.1 The function

COST §4.1 fixes it, and this document adopts it unchanged:

> **minimise  F = C + ρ_w · W + ρ_s · B**

with `C` the count of `CUT ` lines, `W` the count of `WIRE` lines and `B` the count of
`SOLDER` lines in `--dump-board` on the candidate. Every term is a line count in a report
the producing agent did not write.

`C` is not an opinion about the placement. It is an exact function of it:
`C = N + J − S_occ`, derived from `DeriveCuts` and verified to the unit on all five boards
(COST §1.4, §1.6). `N` is a property of the circuit; `J` and `S_occ` are properties of the
placement; nothing else enters.

One subtlety worth stating so the function is read correctly: `B` prices something the
agent does not place. VeroRoute derives solder bridges itself in `Board::CalcSolder`, read
back by `DeriveBridges` (COST §1.5), so `B` is influenced by placement and never chosen
directly. `W` is the opposite — a wire is a component somebody puts down.

### 2.2 The hard constraints

COST §4.1's H1–H7, adopted with one strengthening and one clarification.

| | Constraint | Checked by |
| --- | --- | --- |
| H1 | Every net electrically whole. | `--check BOARD --netlist NET` exits 0 and reports no `incomplete` net. |
| H2 | Cuts actually derivable. | `CUT_STATE COMPUTED`; never `UNRESOLVED`, never `NOT_APPLICABLE`. |
| H3 | **Nothing floating, established from copper rather than from component state.** | Milestone 1 item M1.2. COST's H3 reads the `FLOATING` field on `PART`/`PAD`, which is correct and is the only line that moves; §4.2 says why that is too easy to miss and what M1.2 adds. |
| H4 | Every lead span within the tool's range: 2–16 holes. | `CompTypes::GetMinLength`/`GetMaxLength`, enforced the same way `lib/kicad/import-string.ts` already enforces `MAX_SPAN = 15` grid steps. |
| H5 | Every lead span within the part's **physical** reach. | A per-family `maxSpanHoles` the owner supplies. **Refuse without it** — §8.2. |
| H6 | The layout fits the stock the owner bought. | Occupied bounds within declared stripboard rows × columns. Needs `BOUNDS` and `ROWS`/`COLS`, which is M1.1. |
| H7 | The layout still matches the circuit. | `--check`'s schematic-delta section is empty. |

**Overlap is not a separate constraint, and that is why H3 matters so much.**
`Board::CanPutDown` refuses a placement that collides with occupied holes (MOVE §1.3), so
an overlapping move does not produce an overlapping board — it produces a *floating part*.
H3 is therefore the overlap check as well as the placement check, and §4.2 shows that the
one signal it depends on is today the single most dangerous gap in the tooling.

### 2.3 Why there is no legibility term

The parent's governing invariant:

> **An agent may never author the acceptance criteria for the specific artifact it is
> producing.**

A legibility, tidiness or neatness term is a term an agent scores itself on. Adding one
would reintroduce the exact failure the parent records — a floorplan graded against intent
the grading agent had chosen, reporting success on a board with the input stage 8 mm from
the output stage. So `F` carries no such term, and `H1`–`H7` are each either a line in a
report the agent did not write or a number the owner supplied.

Legibility is not thereby dismissed. It enters the way the parent says it may: through a
reviewed, circuit-independent rule library, or through an independent reviewing agent that
is never the author (§9.4). Never as a term in `F`.

---

## 3. The benchmark, and why it satisfies the invariant

### 3.1 The benchmark

**low-boost's committed layout was laid out by the owner, by hand, in the GUI.** The
provenance is in the history **(measured here**, `git log` over
`boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`**)**: commit `a33cb4d` ("layout")
touches that one binary file and nothing else, and `2f62ee1` ("Lay out the low-boost
board") describes the arrangement in the first person — *"Six frequency capacitors on one
strip, cut into six segments between the selector throws; R2 across the out and
lo_boost_in strips; the pot's wiper and cw tied by a solder bridge, which is the rheostat
wiring."* Both are authored by `oletizi` and neither carries any agent attribution.

What it achieves (COST §1.6, §2.2):

| | value |
| --- | --- |
| cuts | **5** (verified here: `--dump-board` reports 5 `CUT ` lines) |
| floor at its `S_occ` | **4** |
| nets complete / incomplete | 6 / **0** — the only one of the five that conducts |
| `J` | 1, supplied by its single `SOLDER` line at `(9,6)-(10,6)` |
| `κ = J/(P−N)` | 1/18 = **0.06** |

### 3.2 Why this satisfies the invariant, and why it is a first-class criterion

It is a number no agent chose, about an artifact no agent produced, measured by a tool no
agent wrote. That is precisely the shape of criterion the invariant demands, and it is
stronger than a rule file because it is an *achieved* result rather than a stated
aspiration: somebody did this, with these hands, on this circuit.

So it is an acceptance criterion, not a comparison of interest:

> **B1. On low-boost, the pipeline must reach `C ≤ 5` with `W = 0` and every net complete,
> starting from the import-placed board.** A run that does not is a failing run.

B1 is non-negotiable and is the first thing the pipeline is pointed at — before the four
unfinished boards, because on those there is nothing to be wrong against.

### 3.3 What it means if the pipeline cannot match it

It means the pipeline is worse than the owner's hands at the one job it exists to take
over, and the honest response is to say so and stop, not to lower the bar. Three readings
are distinguishable and the run must say which:

1. **The optimiser is weak.** `C > 5` while H1–H7 all hold and `κ` is well above 0.06.
   A search problem: the move set, the seed construction or the stopping rule.
2. **A constraint binds.** `C > 5` because `maxSpanHoles` (H5) forbids the spans low-boost
   actually uses. Then the pipeline is being asked to beat a layout built with reach it is
   not allowed to assume, and the remedy is the measurement of §8.2, not the search.
3. **The scorer is wrong.** `C ≤ 5` reported and `--check` or `make check` disagrees. That
   is §10's failure, and it is the worst of the three because it looks like success.

### 3.4 The honest risk: one board is one data point

low-boost is the smallest of the five (9 nets, 27 pins on the committed board; 14 nets, 40
pins against today's model — COST §2.2, §2.3) and it is the only hand-worked one. So:

- **B1 is a necessary condition, not a sufficient one.** A pipeline that matches 5 cuts on
  low-boost and produces an unbuildable mid board has passed B1 and failed.
- **`κ_bench = 0.06` as a cross-board threshold is extrapolation from n = 1.** It is adopted in
  §7.2 as a *parameter with that default* precisely so the extrapolation is visible and
  replaceable, and COST §5 is explicit that five boards cannot support a fit and that no
  ratio is fitted anywhere.
- The comparison between low-boost and the other four is confounded three ways — hand-worked
  versus import default, routed versus not routed, parts across the strips versus along
  them (COST §3.4b, L5). It is evidence for the mechanism the identity derives, not an
  independent estimate of any lever.

The way to retire this risk is more externally authored layouts, which only the owner can
supply, and this document does not pretend otherwise.

---

## 4. Milestone 1 — make the fork observable and actuable

**Nothing downstream is possible first.** Today the headless verb set is `--import`,
`--check`, `--update`, `--dump-board`, `--adopt`, `--set-strips`, `--stretch` plus four
test-only verbs, and **none of them moves a part** (MOVE §1, §2.3). An unrecognised flag
does not error: `Headless::Run` returns -1 and `main()` opens a GUI window, so
`--move low.vrt --ref C19 --to 5,5` times out after 5 s with no stdout and no stderr
(MOVE §2.3). That is the empirical confirmation that no actuator exists.

The items below are in **dependency order**, and the order is the argument: you cannot
score a candidate without M1.1, cannot trust a score without M1.2, cannot survive a search
without M1.3, cannot actuate without M1.4 and M1.5, and M1.6 only buys breadth.

Every item is a change to `.tools/veroroute-perfboard`, which is a **pinned fork**
(`veroroute.pin`, commit `5a282a6dca7e6e6b2f982ab1d97566494c489b4e`). Moving the pin
follows the existing rule: deliberately, in its own commit, saying what changed upstream
and why. Every new verb must be registered in **both** `kHeadlessFlags[]` and
`Headless_help.cpp`, or it hangs a build instead of failing it;
`tests/usage.test.ts` already enforces that agreement in both directions (MOVE §2.3).

### 4.1 M1.1 — extend `--dump-board`

**The prerequisite, because without it the optimiser cannot score a candidate.**

**Verified here**, against the shipped binary:

```
$ veroroute --dump-board boards/pultec-low-boost/pultec-low-boost.perfboard.vrt \
    | grep -cE '^(ROWS|COLS|BOUNDS)'
0
```

Zero. There is no grid-size line of any kind, no bounds line, no per-part direction and no
per-part row extent. The consequences, from MOVE §5.2 and COST §7.3:

- **`S_occ` is not observable.** COST had to reconstruct it by rebuilding every pin's hole
  from footprint patterns in `Src/CompTypes.cpp` and `Src/FootPrint.h`, and could not do
  even that for low-boost, whose parts are turned across the strips — that board's identity
  is verified by hand from a 40-line dump (COST §1.6, L3, L4). A reconstruction that
  reproduces four cut counts exactly is strong evidence and is still not a reading.
- **Occupancy and overlap are not computable.** `PART`'s `SPAN` field is
  `Component::GetCompCols()`, and `Grid.h`'s `GetCols(direction)` swaps rows and columns
  for direction `N`/`S`. So for a part turned across the strips, `SPAN` reports its body
  width and its lead span appears nowhere: `R2` and `C19` on low-boost report `SPAN 1` and
  kept reporting `SPAN 1` across thirteen accepted `--stretch grow` steps that demonstrably
  changed their span (COST §7.3 item 2). `GetCompRows()` is printed nowhere at all.
- **A legal destination cannot be told from an off-board one**, which matters because the
  grid wraps (§4.4).
- The grid size was obtained for COST only by a probe: ask `--author --op add-wire --at
  9999,c` to place a wire past the far edge and read the clamped position out of the
  refusal. That is a clever trick and it should not be the interface.

**Deliverable.** Appended dump lines, in the grammar's own append-only shape, documented in
`Headless_dump.cpp`'s grammar comment at the point of change:

| line / field | source | closes |
| --- | --- | --- |
| `ROWS <n>` and `COLS <n>` | `Grid::GetRows()`/`GetCols()` | H6, the toroid's interpretation |
| `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>` | `Board::GetBounds` | `S` in the identity is a bounds quantity (COST A6); makes `S_occ` directly checkable |
| `DIRECTION <W\|E\|N\|S>` on `PART` | `Component::GetDirection()` | the structural fact behind 68–75% of every board's cuts |
| a row-extent field on `PART` | `Component::GetCompRows()` | the part's occupied rectangle, hence occupancy and overlap. The token is fixed in the implementation plan and **must not collide with the board-level `ROWS`** |

Also in scope: **correct `--help`.** It claims `SPAN` is *"direction-aware, so it reads the
same regardless of how the part is rotated on the board"*, and `GetCols(direction)` is
precisely not that (COST §7.3). A help text that is wrong about an observable is worse than
a missing one.

**Verified how.** A test asserting each new line is present on both a horizontal-strip
board and a perfboard; a test that `BOUNDS` plus `DIRECTION` plus the row extent let a
scorer reconstruct `S_occ` and that `C = N + J − S_occ` then holds **as a direct reading**
on all five boards, reproducing COST §1.6's reconstructed figures including low-boost's
hand-checked ones. That is a regression test on the identity and on the new fields at once.

### 4.2 M1.2 — floating-part detection that reads copper

**The single most dangerous gap: a skipped check that looks like a passing one.**

Measured in MOVE §1.3 on a scratch copy of low-boost:

```
$ veroroute --stretch low.vrt --ref C19 --direction grow -o s1.vrt ; echo "exit=$?"
exit=0
$ veroroute --dump-board s1.vrt | grep '^PART C19'
PART C19 CAP_FILM .22uF FLOATING SPAN 1
```

Exit 0, no stderr, and a board saved with the part off it. The full dump diff is **one
line**. In particular:

- the `CUT` lines did not change — still 5. A part falling off the board changed nothing
  about the derived cut list.
- the `NODE` lines did not change either. `C19.1` and `C19.2` are still listed as net
  members, because `GetBoardMembership` (`Reconcile.cpp:51-65`) iterates `comp.GetNodeId(p)`
  — what the *component* records — not the copper.

**So a scoring loop reading the dump today cannot see that it has broken the board**, and
the precise sense matters. The one signal *is* in the dump — the `FLOATING` field on the
`PART` line — but it is the *only* line that changed: the actuator exited 0 and wrote the
board, the cut block is identical, the membership block is identical, and **every term in
`F` reads as a healthy board.** A scorer that computes `F` from the cut, wire and solder
counts, which is exactly what §2.1 says `F` is, scores a broken layout as a good one. The
field is sufficient for detection only for a scorer that already knows to look there first
and reject, which is MOVE §5.2's own conclusion.

COST §3.2 hit the same hazard independently: growing `C18` thirteen times left it
`FLOATING` while `--stretch` exited 0 at every step.

**Deliverable**, in two parts, because the dump field alone is insufficient:

1. **A refusal in the actuator.** Every verb that takes a part off the board and puts it
   back — `--stretch` today, `--move` and `--rotate` from M1.4/M1.5 — records
   `GetIsPlaced()` for every affected component before acting and **refuses without writing
   `OUTPUT`** if any component that was placed is not placed afterwards. This is the posture
   `Headless_author.h` already states: *"MOST OPS VERIFY THEIR OWN EFFECT before the board
   is written, because several of the underlying calls return void and do nothing silently
   when they cannot act."*
2. **A board-level statement in the dump.** A single line summarising copper-truth —
   whether every component in the netlist block has its pins on painted holes — so a scorer
   has one place to look and reject *first*, rather than having to join `PART` lines to
   `NODE` lines and notice an inconsistency. H3 reads this line.

**Verified how.** A test that the `C19` stretch above now exits non-zero and writes no
output; a test that a board deliberately saved with a floating part (produced through the
pre-fix binary or a fixture) is rejected by the dump-level statement, by name. A check that
cannot fail proves nothing, and this is the check whose failure mode is silence.

### 4.3 M1.3 — the zero-delta abort

`Board::MoveComps` opens with `assert(deltaRow != 0 || deltaCol != 0)` and
`assert(!GetDisableMove())`, and the generated Makefile defines `QT_NO_DEBUG` but **not**
`NDEBUG` (MOVE §2.3 item 8):

```
$ grep '^DEFINES' .tools/veroroute-perfboard/build/Makefile
DEFINES       = -DQT_NO_DEBUG -DQT_WIDGETS_LIB -DQT_GUI_LIB -DQT_NETWORK_LIB -DQT_CORE_LIB
```

So `assert` is live in the shipped build, and reaching `MoveComps` with a zero delta is a
**process abort**, not an error message. **An optimiser will propose a no-op eventually** —
a hill-climb sweeping every single-part move enumerates `Δ = (0,0)` by construction unless
something excludes it — and an abort mid-run is indistinguishable from a crash.

**This must be handled in the verb, not in the build.** The two remedies have very
different blast radii and should not be confused:

| remedy | blast radius | decision |
| --- | --- | --- |
| Guard in the verb: refuse a zero delta, and refuse when `GetDisableMove()`, before calling | one new verb; mirrors the GUI, which guards both (`HaveZeroDeltaRowCol` at `mainwindow_events.cpp:814`, `GetDisableMove()` at `:1013`) | **adopted** |
| Define `NDEBUG` in the build | disables *every* assert in the binary, including ones that are currently the only thing stopping worse states | **not adopted**; a separate decision if ever wanted |
| Change the asserts to returns in `Board_components.cpp` | changes the Board layer's contract for the GUI too | **not adopted** here |

Note that going through `MoveUserComps` rather than `MoveComps` gets both guards for free
(`Board_components.cpp:1021-1022`) — but it then *returns early and silently*, giving a
clean exit 0 and an unchanged board. So the verb guards explicitly and says which guard
fired. **Refusals teach.**

**Verified how.** A test that `--move --ref R2 --delta 0,0` exits non-zero with a message
naming the zero delta and writes no output; a test that the process does not abort (exit
status distinguishable from a signal).

### 4.4 M1.4 — an absolute move

`Board::MoveComps(compIds, deltaRow, deltaCol)` and `Board::MoveUserComps(deltaRow,
deltaCol)` take a **delta**, never a destination. Nothing in `Board.h`, `Board*.cpp`,
`CompManager.h`, `Component.h` or `FootPrint.h` takes a target row/column for a
placed part (MOVE §1.1).

Three properties make `delta = target − current` *not* equivalent to a destination API:

1. **Coordinates wrap toroidally.** `MoveComps` calls `MakeToroid(newRow, newCol)` on every
   component, and `Grid.h:356-370` wraps rather than refusing. An overshoot does not fail —
   it lands somewhere else, and looks like a successful move.
2. **The `bool` is `bPanned`, not success**, and **`PutDown`'s result is discarded** at
   `Board_components.cpp:1139`. The part is taken off its old position at step 4 *before*
   anything checks whether the destination is free, so a blocked move leaves it floating and
   says nothing (MOVE §1.3).
3. **A pan shifts every coordinate on the board.** `MoveComps` calls `Pan()` when the moved
   rect would leave the grid, growing the board. COST's own measurement hit this: thirteen
   `--stretch` steps on `C19` **silently shifted low-boost's whole circuit up by three rows**
   (COST §7.1). A caller tracking positions across moves that does not know this is wrong
   about every part it did not move.

**Deliverable.** A `kShipped` verb — the same character as `--stretch`, a deliberate single
edit to a named part — with the grammar MOVE §2.1 proposes:

```
--move BOARD --ref NAME (--delta R,C | --to R,C) -o OUTPUT
```

Reusing, not re-deriving, `Headless_author.cpp`'s `ClickSelectComps` (MOVE §2.2 step 3),
which already mirrors the GUI's selection sequence and has already been corrected twice.
Each step names its GUI counterpart, per the fork's stated convention: *"THIS IS NOT A
PARALLEL IMPLEMENTATION."*

It must, before writing `OUTPUT`:

- **take a destination** (`--to`) and compute the delta inside the verb;
- **refuse rather than wrap** — verify the part's final `GetRow()`/`GetCol()` equals the
  request and refuse otherwise;
- **verify every previously-placed part is still placed**, iterating the whole user group
  rather than only `--ref`, because `ResetUserGroup` selects siblings too and because the
  trax gate leaves *every* moved component floating if the track pattern will not go back
  down (MOVE §2.3 items 2 and 5);
- **verify the selection took** — `ResetUserGroup` returns `void` and silently ignores
  `TRAX_COMPID`, so check `GetIsUserComp(compId)`, which is what `OpSelect` already does;
- **report any pan.** Refusing on a pan is the honest cheap option and is also a real
  restriction, which belongs in the help text rather than being discovered. If `--to` is
  accepted across a pan, the verb re-expresses the target against the panned board and still
  verifies the landing.
- never write to a path it derived itself: one `-o`, required (`Headless.cpp:76-86`).

**Verified how.** A test per refusal: an occupied destination refuses and writes nothing; an
out-of-range `--to` refuses rather than wrapping (assert the landing, not just the exit
code); a move that pans is reported as such; a move of a part in an operator-made group
reports every component the group held. Plus the positive case: `--to R,C` lands at exactly
`R,C` and the dump says so.

### 4.5 M1.5 — rotate

`Board::RotateUserComps(bool bCW)` and `Board::RotateComps(const std::list<int>&, bool)`
exist (`Board.h:872,876`), with `Component::Rotate` (`Component.h:548`) as the per-part
primitive. **No verb exposes any of them** (COST §7.2).

This is not a nice-to-have. Part orientation is the structural lever behind COST §3.1's
68–75%: the four import-placed boards have every part lying *along* the strips and sit at
`J ≈ P − N` (48, 28, 24, 18 against `J` of 46, 27, 24, 16 — exact on hi-cut), while
low-boost has every part *across* and sits at `J = 1`. `--import` never tries any direction
but `'W'` (MOVE §3), so the baseline does not explore this axis at all, and today nothing
headless can.

**Deliverable.** A `--rotate` verb of the same shape as M1.4, comparing `GetDirection()`
before and after as its effect check, with M1.2's floating refusal and M1.3's guards.

**Note the trap it inherits.** `--help`'s claim that `SPAN` reads the same regardless of
rotation is false, because `GetCols(direction)` swaps rows and cols for `N`/`S`. A rotate
verb shipped before M1.1 would let a scorer rotate a part and then misread its span. M1.1
is listed first partly for this reason.

**Verified how.** Rotating a part changes `DIRECTION` in the dump (M1.1's new field) and
changes the reconstructed span in the expected direction; four rotations return the board to
its starting dump. This item also closes COST L5 by making the orientation lever
controllably measurable for the first time: rotate one board's parts, change nothing else,
re-measure.

### 4.6 M1.6 — a batch / in-process mode

**An enabler of search breadth, not a correctness item.** Stated that way deliberately,
because the two source documents differ in emphasis and the difference should not be
inherited silently:

- COST §6.3 measured ~13 ms per invocation (20 runs per row) and concluded *"the
  process-per-gesture interface is not the bottleneck and does not need batching."*
- MOVE §4.1 measured at 200 runs per row: `--version` 10.78 ms (the process-launch floor,
  no board), `--dump-board` on mid 11.71 ms, `--adopt` on mid 11.82 ms. Board I/O is
  therefore about **1 ms**, and **launch is 91% of every invocation.**

The two agree to within about 11% on the per-invocation figure; the 200-run sample governs.
Both conclusions stand: at ~12 ms the one-move verb already supports order 10² trials per
second, which is enough to drive the climb COST §6 specifies, so batching is not a
prerequisite. Removing the launch floor raises that to order 10³ — about **12× more trials
for the same machine time**, a ratio between two measured numbers rather than a projection
— which widens how much of the search space a run can cover, not whether its answers are
right.

**Deliverable.** A batch form of the move verb, built around
`Headless_transactional.cpp:44-51`'s **`CaptureBoardDump`**, which swaps `std::cout`'s
stream buffer for an `ostringstream` around `PrintBoardDump` so a verb can obtain the exact
`--dump-board` text of an in-memory board with no file round trip. That is exactly the
in-process scoring primitive a batch needs, and it already exists.

Two constraints the fork's own documents impose:

1. **Per-move verification, not one check at the end.** MOVE §2.3 lists five ways a single
   move does nothing quietly. A batch that verifies only the final state cannot say which
   move broke it.
2. **Transactional honesty.** `ApplyReconciliation` is expected to leave the in-memory board
   byte-identical when it rejects, and `--update` never saves on a failed apply. A batch
   inherits that standard: if move *k* of *N* fails, either the whole batch is refused and
   `OUTPUT` is never written, or the verb reports exactly which prefix landed. Silently
   saving a partial batch is the one outcome every existing verb is built to avoid.

**Ordering is deliberate: `--move` first, batch only once the one-move form's verification
is proven** (MOVE §4.3). Building the batch first means writing the verification and the
loop at once, with nothing to check the verification against.

**Rejected alternative, named on evidence.** A long-lived process fed moves on stdin would
remove the 10.78 ms floor entirely, and it is a larger change: a REPL is a new interaction
model, not a verb, and the fork has no precedent for one. The measured numbers say the batch
verb captures nearly all of the available saving without it.

**Verified how.** A batch of N moves produces a board byte-identical to N sequential
one-move invocations; a batch whose move *k* fails writes no output and names *k*; the
in-process dump text is byte-identical to the `--dump-board` text for the same board state.

---

## 5. Milestone 2 — the pipeline

### 5.1 Replace the placer

`--import`'s sweep is netlist-blind and has no strategy to improve (§1, MOVE §3). It is also
**order-dependent** — the result is a function of netlist part order, which is a function of
the KiCad export, and nothing records that dependency — and it **always succeeds**, because
`while(!bOK)` grows the board until something fits, so it cannot report a placement failure,
only an unboundedly tall board.

The replacement does not patch that loop. It takes the board `--import` produces as a
starting state and drives it with M1.4/M1.5/`--stretch`, scoring with `--dump-board`. The
`.vrt` is a binary `QDataStream` and **the only legitimate writer of one is the veroroute
binary** (MOVE §6.3 item 5), which is the whole reason Milestone 1 exists.

### 5.2 The two levers, exact and exhaustive

From the identity, `C = (N − S_occ) + J`. Those two addends sum to the whole cut count, so
the levers are not a guess and there is no third one (COST §3.6).

**Lever 1 — clustering: put a net's pins on one strip.** Drives `J` toward 0, worth exactly
one cut per split eliminated, and it simultaneously removes a join that would otherwise need
a bridge or a wire. It is **68–75% of every unfinished board's cuts**: 46 of 65 on mid, 27 of
40 on hi-boost, 24 of 32 on hi-cut, 16 of 23 on low-cut (COST §3.1). Do this first.

**Lever 2 — spend strips.** Drives `S_occ` toward `N`, worth exactly one cut per additional
strip that takes a net off a shared strip, exhausted at `S_occ = N`. Worth 19, 13, 8, 7 and 4
cuts on the five boards — and **already paid for**: mid occupies 4 of its 35 available rows,
and the four import-placed boards have 31, 32, 32 and 33 unused rows (COST §3.3, §2.2).

**Stretch is the enabler, not a cost term.** Its value is already counted inside the two
levers. What it buys is reach: **it lets a pin land on the strip its net already occupies, so
no join is needed in the first place** (COST §1.5).

**The correction that must not be lost.** A component lead can **never** supply a
segment-join. A two-terminal part's two leads sit on two *different* nets by construction, so
stretching it across strips `r` and `r+n−1` connects net A to net B — it does not rejoin one
net's two segments. Joins come from exactly three things: a **solder bridge** between
adjacent strips at a shared column (VeroRoute derives these itself), a **wire** for
non-adjacent strips (nothing derives these, so a net needing one and lacking one is reported
`incomplete`), or a **multi-pin part with two pins on one net** (COST §1.5). A pipeline that
treats a stretched resistor as a bridge will produce boards that do not conduct and score
them as if they did.

A second premise correction worth carrying: a two-terminal part with both leads on one strip
is a short **only if no cut separates them**. With a cut between them it is an ordinary,
correct stripboard idiom, and it is what four of the five committed layouts do for every
single part. It is not an impossibility, it is a price.

### 5.3 Feasibility is established; reach is the open question

COST §6.4 measured the five net graphs' RCM bandwidths — net-graph vertices are nets, edges
are forced by on-board components, off-board components break out as free single-hole pads
and force nothing:

| board | nets | max degree | bandwidth lower bound `⌈maxdeg/2⌉` | RCM ordering bandwidth (an upper bound) |
| --- | --- | --- | --- | --- |
| mid | 28 | 6 | 3 | 5 |
| hi-boost | 20 | 6 | 3 | 4 |
| hi-cut | 14 | 10 | 5 | 9 |
| low-cut | 14 | 12 | 6 | 11 |
| low-boost | 14 | 10 | 5 | 9 |

All five are inside the tool's 15-strip span ceiling, with margin. **So clustering is
geometrically feasible, and the tool's span limit is not the obstruction.** What limits how
aggressively it can be pushed is physical reach — §8.2 — not whether.

A bandwidth of `b` needs a part spanning `b + 1` holes, i.e. a lead pitch of `b × 2.54 mm`.
Arithmetic on the footprints this repository fixes (DIN0207 resistor: 6.3 mm body on 10.16 mm
pitch; B32529 film capacitor: 7.2 × 2.5 mm body, leads on 5.00 mm centres leaving the same
face — COST §3.2):

| needed bandwidth | span (holes) | lead pitch | lead past a DIN0207 shoulder, per side | outward splay per B32529 lead |
| --- | --- | --- | --- | --- |
| 4 (hi-boost) | 5 | 10.16 mm — the DIN0207 footprint's own pitch | 1.93 mm, already bent out at that pitch | 2.58 mm |
| 5 (mid) | 6 | 12.70 mm | 3.20 mm | 3.85 mm |
| 9 (hi-cut, low-boost) | 10 | 22.86 mm | 8.28 mm | 8.93 mm |
| 11 (low-cut) | 12 | 27.94 mm | **10.82 mm** | **11.47 mm** |
| 15 (the tool's ceiling) | 16 | 38.10 mm | 15.90 mm | 16.55 mm |

The last row reproduces COST §3.2's two figures, which is the arithmetic's check. **This is
arithmetic on footprints, not a reach claim** — exactly as COST states it, and §8.2 says what
would make it one. The binding row is low-cut's: one net per strip on all five boards at these
orderings requires about 10.8 mm of lead past a resistor's shoulder and about 11.5 mm of splay
on a film capacitor.

Measured stretch headroom in the tool, against today's model (`CAP_FILM2` at 3 holes,
`RESISTOR4` at 5): **13 increments on every film capacitor and 11 on every resistor**, with
`--stretch --ref board_terminals` refused immediately, because a terminal block's pin pitch is
not a lever (COST §3.2).

### 5.4 One constraint on the arrangement, not an obstruction

`junction_signals` on every board is a `SIP5` carrying all five ladder nets at 1-hole pitch.
Turned across the strips it pins those five nets to five consecutive strips in a fixed order;
laid along a strip it puts five nets on one strip and costs four cuts. It is the only component
forcing more than two nets together (COST §6.4). The pipeline must treat it as a fixed
sub-arrangement, not as a part to be placed independently.

### 5.5 Pipeline stages

Following COST §6.2's phases, with the actuators Milestone 1 supplies:

| stage | what it does | writes |
| --- | --- | --- |
| **P0 targets** | per board: `N`, `P`, `C_floor = max(0, N − R)`, the net graph, max degree, the bandwidth bounds. COST §2 and §6.4 are this stage, already done for the five boards. | the run directory's `targets.json` |
| **P1 seed by construction** | assign one net per strip in a low-bandwidth linear arrangement; place each part across the strips of its two nets; stretch to reach. Should land at or near `J = 0`. **Search is for what construction cannot reach.** | a candidate `.vrt` |
| **P2 climb** | hill-climb on `F` with the move set `move / rotate / stretch / add-wire / delete-wire`, evaluating each candidate by applying it to a scratch copy, running `--author --op autofill`, dumping, computing `F` and checking H1–H7. Reject on any hard-constraint failure. Accept on `ΔF < 0`. | candidates and their scores |
| **P3 grade** | the full acceptance check (§9.2) on the best candidate, independent of the generator | `run.json` |
| **P4 report** | the layout, the metrics, which stopping rule fired, and what remains open. Then a human makes the judgement calls `CLAUDE.md` reserves. | the run directory |

`--author --op autofill` re-runs `AutoFillVero` without needing a netlist, which is what makes
a fast evaluation loop possible at all (COST §7.4). Note that `AutoFillVero` runs on `--update`
and on `--author --op autofill` and **not** on `--import --strips` or `--set-strips`, and an
unpainted board reports `CUT_STATE UNRESOLVED` with no cut list — so the identity is not
silently wrong there, it is refused (COST A2). H2 is that refusal, surfaced.

**The generator and the grader must not share code.** P2's move generator proposes; P3 grades
with the full check. This is the sibling repository's most valuable property and §6 carries it
over verbatim.

---

## 6. What to reuse from the sibling repository, and what not to

The tooling is in **`/Users/orion/work/pedals-work/digital-pedal-platform`**, not `pedals`:
`pedals` has no `tools/placement/`, no `make/krt.mk` and no `pcb/` directory at all (MOVE
§6.1). `digital-pedal-platform` has `tools/placement/` (31 files, 3,441 lines), `tools/krt/`,
`make/krt.mk` and rule files under `fuzz/boards/<board>/placement-rules.json`. **Treat it as
read-only.** Nothing in it is to be modified; it is read to make this section concrete.

It is less of a cold start than it looks: `digital-pedal-platform/tools/perfboard/check.ts`
already spawns **this fork's binary** and parses `--dump-board` `CUT` lines.

### 6.1 Reuse — the architecture

| | What | Why it ports |
| --- | --- | --- |
| R1 | **Schema-versioned JSON rules with a strict loader.** `placement-rules.json` carries `"schema": 1`; `tools/placement/rules.ts` loads it through `rejectUnknown`, `requireArray`, `requireNumber` (`strict.ts`), so an unknown key is an error, not ignored. Each entry carries a free-text `note` recording *why* the number is what it is. | This project's "refuse rather than guess" and "an empty whitelist that refuses loudly beats a general rule that quietly accepts a guess", and "refusals teach". Reuse the shape and the strictness; the rule vocabulary is different. |
| R2 | **The generate-and-grade split, where repair only PROPOSES.** `repair.ts`: *"The repair only proposes; the caller grades the result with the full intent check, so a repair can never weaken acceptance."* | The single most valuable property to carry: an optimiser's move generator must never also be its acceptance test. It maps onto Milestone 1 exactly — the move verb actuates, the dump scores, and the two share no code. |
| R3 | **A declared, lexicographic ranking.** `routeAll.ts` exports `RANKING` as a string constant stating the order in prose, with the reason for each position beside it. | A reviewable ranking beats a weighted sum with tuned coefficients. The stripboard order: **cuts, then wire bridges, then solder bridges, then pin-bounding-box wirelength** — and `F`'s `ρ` weights exist for the one trade the owner actually has an opinion about (§8.1), not as a knob to fit. |
| R4 | **Two-condition termination, one of which is "stop and fix the cause".** `routeAll` stops once `passes` candidates pass (default 5) **or** when `sameFailures` results in a row share a failure signature (default 3), because a repeated failure is *"a systematic cause to fix, not a candidate to skip"*. | Directly portable. The stripboard failure signature is the failing check names plus the set of floating parts and the `CUT_CONFLICT` positions. It gives a principled stop that is not an iteration cap. |
| R5 | **Run directories, never the canonical artifact; adoption separate.** Runs land under `build/`; only an explicit `adopt-<board>` writes a board. | Matches the fork's own rule — `-o` required, the input board never edited in place (`Headless.cpp:76-86`) — and §9's single gate. |
| R6 | **Provenance manifests keyed by content hash.** `manifest.ts`'s `run.json` records `source.sha256`, `intent_sha256`, `rules_sha256`, `policy_sha256`, `engine_commit`, the overrides used, and per-candidate `sha256` plus checks plus metrics. | This project's "derived artifacts are regenerated every run and compared by content, never by timestamp", with the hashes written down. Hash the pinned veroroute commit where that tooling hashes `engine_commit`. |
| R7 | **Seeded determinism.** `--seeds 0 1 2 3 4`, the seed recorded per candidate. | A reproducible optimiser run needs exactly this, and §10's V6 depends on it. |
| R8 | **The injected-spawn / no-default-binary posture.** `tools/perfboard/check.ts` injects `SpawnVeroroute` for tests and **throws** when `VEROROUTE` is unset rather than guessing a path: *"A hardcoded `$HOME/src/...` is right on exactly one machine and wrong everywhere else... a spawn that quietly fails is the shape that reads as a clean board."* | Both halves. This repository already resolves `VEROROUTE` through `make/veroroute.mk` with an explicit override winning, so the two postures compose. |
| R9 | **The Makefile *pattern*** — `place-<board>` / `route-<board>` / `check-intent-<board>` / `adopt-<board>`, runs under `build/`, a required `FROM`. | A pattern worth copying. The engine-acquisition machinery is not: the engine is already here and already pinned. |

### 6.2 Do not reuse

| | What | Why not |
| --- | --- | --- |
| N1 | **All of `tools/placement/geometry.ts` and the millimetre rule semantics** — courtyards, `Rect`, `circleHitsRect`, `overlaps`, `inside`, `translate`, `separation.min_mm`, `proximity.max_mm`, `anchors.tolerance_mm`, `rot_tolerance_deg`. | Stripboard is an integer row/column grid. Clearance is not a continuous distance and overlap is hole occupancy — and here it is not even a check, because `CanPutDown` refuses a collision and the symptom is a floating part (§2.2). Porting mm geometry onto a hole grid introduces a unit that does not exist in the `.vrt`. |
| N2 | **`repairProximity`'s continuous sweep** at `STEP_MM = 0.1` with `MARGIN_MM = 0.3`. | The stripboard search space is enumerable exactly — every (row, column, direction) triple — so a continuous sweep with a margin is both wrong and unnecessary. |
| N3 | **The `KiCadRoutingTools` engine, and `make/krt.mk` as more than a pattern.** | It is a PCB autorouter and knows nothing of strips, cuts or solder bridges. The veroroute fork is this project's engine, already vendored and already pinned. |
| N4 | **`tools/placement/policy.ts`**, for now. | Its override allow-list exists to fence an external engine's free-form flags. The fork's verbs are a small fixed set with no tunable flags to fence. Revisit only if a move verb grows options worth gating. |
| N5 | **`applyEdits`/`parse` from `@/kicad/sexpr`**, as `repair.ts` uses them to rewrite `.kicad_pcb` text. | A `.vrt` is a binary `QDataStream` (`Headless.cpp:132-141`; `Headless_author.h` notes *"no fixture can be typed by hand"*). The only legitimate writer of a `.vrt` is the veroroute binary. |

---

## 7. The iterative scheme and its stopping rule

The owner asked for a target ratio **driven at iteratively**, not a first solution accepted.

### 7.1 The progress variable

COST §5 established that `C/N`, `C/parts` and `C/P` have no predictive power, and the one
dimensionless number worth tracking is

> **κ = J / (P − N) ∈ [0, 1]** — the fraction of the available splitting a layout has
> committed, so that `C = (N − S_occ) + κ · (P − N)`.

Measured: **0.96, 0.96, 1.00, 0.89** on the four import-placed boards and **0.06** on the
hand-laid one. The four unfinished boards are at or within 11% of the worst possible value.
`κ` is comparable across boards of different sizes and is computable from the dump — directly,
once M1.1 lands; by reconstruction before that.

### 7.2 The targets

| | target | value | status |
| --- | --- | --- | --- |
| **Drive target** | `κ → 0` | 0 | Not a parameter. `κ = 0` means every net occupies one segment, which is COST §2.1's condition (a). P1 seeds *at* it by construction. |
| **Clustering bound** (admissibility condition A2, not the whole of admissibility) | `κ ≤ κ_bench` | **0.06** | A **parameter** with that default. It is the measured `κ` of the only externally authored, conducting layout in the repository (§3.1) — a number no agent chose. On low-boost itself it coincides with B1: match or beat the owner's own hand layout. |
| **Floor tolerance** | `(F_i − F_floor) / max(1, F_0 − F_floor) < τ` | **0.05** | COST §6.4's `S2`, which is `Q2` in §7.3's naming. The owner's tolerance; this is its proposed default. |

**`κ_bench = 0.06` is extrapolation from one board, and it is a parameter for that reason.**
§3.4 states the risk; the default makes the extrapolation visible and one edit replaces it.

**`κ = 0` is not by itself the floor, and a scheme that treated it as one would stop early.**
`C = (N − S_occ) + κ·(P − N)`, so at `κ = 0` the board still carries `N − S_occ` cuts — 19,
13, 8, 7 and 4 on the five boards (COST §3.3). Lever 2 is what removes those, and it is
already paid for. So `κ = 0` closes the lever worth 68–75% and leaves the remaining 25–32%
on the table. **`C = C_floor` requires both** `κ = 0` and `S_occ = min(N, R)`, and
substituting gives `C = N − min(N, R) = max(0, N − R)`, which is COST §2.1's floor exactly.
That is why §7.3 has no separate "clustering done" terminal rule and why admissibility
carries a floor bound as well as a `κ` bound.

### 7.3 Stopping is not accepting

**A run stops for one of six reasons and is admissible for a different one.** Conflating them
is how a pipeline reports success on a board it merely gave up on, so the two are separated and
the run reports both.

**A naming note, because the collision would otherwise be a live ambiguity.** COST §6.4 labels
its stopping rules `S1`–`S5`, and the parent document labels its sub-projects `S0`, `S1`, `S1a`.
In a document that cites both, `S1` would mean two things. The stopping rules are therefore
**`Q1`–`Q6`** here, mapping one-to-one onto COST's `S1`–`S5` in order, with `Q6` added from the
sibling repository's failure-signature termination (R4). `S0`/`S1`/`S1a` keep their parent
meanings throughout this document and refer only to sub-projects.

**Stop at the first of:**

| | Rule | Measured how |
| --- | --- | --- |
| Q1 | **At the floor.** `C = C_floor` and `W = 0` — equivalently `κ = 0` and `S_occ = min(N, R)` and `W = 0`. | Dump counts against P0's `targets.json`. Terminal: nothing below the floor exists. |
| Q2 | **Within tolerance of the floor.** `(F_i − F_floor) / max(1, F_0 − F_floor) < τ`, `F_floor = C_floor`, default `τ = 0.05`. | Arithmetic on counts. |
| Q3 | **Local optimum under the move set.** A whole round — a full sweep of every single-part move — produced no accepted move. | The round's accepted-move counter is 0. |
| Q4 | **Marginal yield collapsed.** `(F_{i−1} − F_i) / evaluations_i < 1/2000` for two consecutive rounds: under one unit of `F` bought per 2,000 candidate evaluations, i.e. under one unit per roughly 80 s at the measured ~12 ms per gesture. | Counters only. |
| Q5 | **Budget spent.** The owner's evaluation cap reached. | Counter. |
| Q6 | **Systematic cause.** Three consecutive results share a failure signature (R4). | Signature comparison. Reports the cause; does not retry. |

**Q4 is the diminishing-returns rule proper.** `1/2000` is a proposed default and a parameter,
chosen so the threshold is a concrete amount of machine time rather than an impression. Q2's
`τ`, Q5's cap and Q6's run length are the owner's.

**Admissible** is a separate verdict, reached only when **all four** of:

| | Condition | What it bounds |
| --- | --- | --- |
| A1 | H1–H7 all hold. | The board conducts, is buildable within the declared reach, and fits the stock. Nothing is tradeable here. |
| A2 | `κ ≤ κ_bench`. | The clustering lever — 68–75% of every unfinished board's cuts. |
| A3 | `(F − F_floor) / max(1, F_0 − F_floor) < τ`. | The **whole** objective against the derived floor, which is the parent's stated S1a gate: *"cuts and wire bridges within a stated factor of the derived floor"*. A2 alone would pass a board at `κ = 0` that had spent none of its spare strips — mid has 31 unused rows. |
| A4 | On low-boost: B1 (`C ≤ 5`, `W = 0`, every net complete). | The externally authored benchmark. |

A2 and A3 are independent bounds on purpose: one on the dominant lever, one on the total.
Neither implies the other.

**A run that stops without being admissible exits non-zero and names the rule that fired and
the gap remaining.** It does not hand over a layout as though it were finished. A skipped
check must never look like a passing one, and neither must an abandoned search.

---

## 8. The two parameters that are the owner's and cannot be derived

Both are **parameters with defaults, never constants.** Neither has been supplied.

### 8.1 `ρ_w` — a wire bridge against a cut, in the owner's own hands

**Proposed default `ρ_w = 3`. Not yet supplied by the owner.** COST §4.3's reasoning, offered
as reasoning and not as a measurement:

- A cut is one operation: one twist of a spot-cutter or drill bit in one hole. No part to
  source, no lead to cut or strip, no second solder joint, nothing that can later work loose.
- A wire bridge is several: measure, cut, strip two ends, form, insert, solder two joints — and
  it adds a physical object that can be the wrong length, lift, or short against a neighbour.
- Pulling the other way: a cut is permanent and hard to inspect. A missed cut is an invisible
  short, and an over-enthusiastic one nicks the neighbouring strip. So a bridge is dearer than
  a cut but not by an order of magnitude.

Three is a defensible middle. **It is a default, not a finding**, and the point of making it a
parameter is that the owner's number replaces it without touching anything else. What would
settle it: the owner's own figure, or a timed trial — cut ten strips, fit ten bridges, take the
ratio.

**Proposed default `ρ_s = 1`** for a solder bridge: one blob at one hole pair, comparable to
one cut, and VeroRoute derives where it goes without being asked.

The parameter's effect is legible at both ends, which is why it is stated:

- At `ρ_w = 1` the optimiser trades a cut for a bridge freely and tends to produce wire-heavy
  boards.
- As `ρ_w → ∞` it never bridges, and H1 then forces one net per strip — which is the
  `C_floor = 0` regime. **A large `ρ_w` and a large board are the same instruction**, and that
  is the regime low-boost is already in.

**One honest gap:** both Pultec boards measured carry **zero `WIRE` lines** (MOVE §5.1), so the
`ρ_w · W` term is unexercised against real data. The first board the pipeline produces with a
wire on it is the first test of it.

### 8.2 A per-family `maxSpanHoles` — the physical lead reach

**This is the binding constraint on reaching the floor, and it is not yet measured.**

The repository fixes the footprints and nothing more. A grep of `docs/` finds body dimensions,
lead *pitches* and courtyards, and **nothing at all about how long a lead is or how tightly it
may be bent** (COST §3.2). The tool's 16-hole ceiling implies a 38.1 mm pitch, which is
15.9 mm of lead past each end of a 6.3 mm DIN0207 body, or 16.55 mm of outward splay per lead
on a B32529 whose leads leave the same face — a different and probably tighter geometry. §5.3's
table gives the figure at every bandwidth these boards actually need; the binding one is
low-cut's, about 10.8 mm and 11.5 mm respectively.

**What settles it**, from COST §3.2 and L1:

1. Measure, on the stock in the parts drawer, the straight lead length from body shoulder to
   tip for the DIN0207 resistor and the B32529 capacitor. That plus the body length gives the
   reachable pitch directly.
2. Record the minimum bend radius each lead tolerates without cracking the seal. The
   capacitor's datasheet states a minimum body-to-bend distance; the resistor's does not and
   wants a bench answer.
3. Write both as a per-family `maxSpanHoles` table beside `FILM_CAPACITOR_IMPORT_STRINGS` in
   `lib/kicad/import-string.ts`, with the measurement recorded in a comment the way the body
   widths already are.

**What the pipeline does in the meantime: it refuses.** `maxSpanHoles` is a required parameter
with **no default**, and the pipeline will not run without it. Per this project's practice,
refusing loudly beats defaulting to a guess: the whole point of the stretch lever is reach, and
a span the part cannot physically make is not a lever but a fiction. A default here would
produce boards that score well and cannot be built, which is the worst available outcome
because the arithmetic looks right.

**Once supplied, the pipeline must distinguish two failures**, the way the parent's
outline-expansion loop does:

- *the search did not find the floor* — a retry, a wider move set, a different seed;
- *the floor is unreachable under the supplied `maxSpanHoles`* — a design finding and a hard
  stop, reporting which board, which net pair, and how much reach would be needed (§5.3's
  table is that arithmetic).

Without the distinction the pipeline either searches an impossible problem forever or stops
with a misleading reason. **No constrained floor is derived in this document** — the
unconstrained floor `max(0, N − R)` is COST §2.1's and stands; what the floor becomes when
`maxSpanHoles` binds is undetermined (§12).

---

## 9. How a produced layout reaches the repository

### 9.1 Where candidates live

Under `build/stripboard/<board>/<stamp>/`, gitignored, never `boards/`. This satisfies both
the sibling repository's run-directory discipline (R5) and the fork's own rule that a verb
never writes to a path it derived for itself (`Headless.cpp:76-86`). `place` and `route` leave
`boards/**` byte-identical, and a test asserts it (§10 V7).

### 9.2 The criteria, and where they live

Per the invariant, the producing agent authors none of these.

| What | Where | Who may change it |
| --- | --- | --- |
| `ρ_w`, `ρ_s`, `τ`, `κ_bench`, Q4's threshold, Q5's cap, Q6's run length | one repository-level `stripboard/rules.json`, schema-versioned, unknown keys rejected (R1), each entry carrying its `note` | a reviewed change, with a test beside it |
| per-family `maxSpanHoles` | `lib/kicad/import-string.ts`, beside the import-string whitelist, with the measurement in a comment | a reviewed change, with a test over the range it claims |
| the stock the owner bought: rows × columns per board | a new declared field in the board's existing `boards/<board>/perfboard.json` | the owner — it is a fact about a purchase, not a judgement |

**The parameters are circuit-independent and reviewed once, deliberately, in the parent's rule
library pattern**: changing them is a reviewed change, using them is not. There is no per-board
criteria file an agent could draft, which is the hole a per-board file would open.

### 9.3 The gate

**One command admits a layout, and it is the only thing that writes under `boards/`.** A new
verb on the existing CLI (`tools/cli/perfboard.ts`), named in the implementation plan, acting
on `$(CURDIR)` the way every other verb there does — no `BOARD=` variable, because two ways to
say which board is two places for one fact to be wrong.

It refuses:

1. a candidate whose `sha256` differs from the one `run.json` records;
2. a `run.json` whose rules / `maxSpanHoles` / stock hashes differ from the current committed
   files — so a parameter cannot be slipped in after a run;
3. a provenance chain that does not start from the board as it now is;
4. a veroroute commit in `run.json` that differs from `veroroute.pin`;
5. any failing check, including a non-admissible verdict under §7.3;
6. an uncommitted layout, unless `--allow-dirty` — which is exactly how `update` and
   `stripboard` already behave, so git stays the undo.

Each refusal names what is missing, where to fix it, and why it is not defaulted.

### 9.4 `make check` is the existing gate and stays the gate

`make -C boards/<board> check` already runs `veroroute`, `netlist-agrees`, `wiring` and then
`bun tools/cli/perfboard.ts check -C .`, which checks the layout against the circuit it was
built from. Three consequences, stated so nothing is quietly weakened:

- **Nothing is added to `make check` that the pipeline authored.** The pipeline's own
  admissibility check is *upstream* of adoption, not a new clause in the gate.
- **Adoption is post-gated by `make check` as it stands.** An adopted board on which
  `make check` does not exit 0 is a failed adoption and is reverted; `make check`'s verdict is
  the repository's verdict, before and after.
- **The freshness guards still apply.** `netlist-agrees` regenerates the export every run and
  decides freshness from content, never from a timestamp, and `wiring` rewrites the panel
  guide so drift surfaces as a git diff. A pipeline-produced layout is subject to both.

### 9.5 The judgement calls that remain a human's

Buildability and the feel of the thing in the hand. The parent's replacement rule governs
unchanged — *an agent may author a placement and a route when the result is graded by code
against criteria the agent did not write for that artifact, and reaches the repository through
a single gate that verifies its provenance* — and the parent's third channel stays available:
**an independent reviewing agent, never the one that authored the artifact**, reading the board
and the metrics against the rule library and stating whether anything passes the rules while
plainly being wrong. That is a finding against the rule library, not against the board. Nothing
in §5 decides whether a board is nice to build, and **look at the output, not only the tests**:
the layout is rendered and read before anyone calls it good.

---

## 10. Verifying the pipeline itself

Distinct from verifying a layout. The question is: **how do we know the optimiser is not
fooling itself?**

The instructive precedent is COST §5's normalisation finding. Across the four import-placed
boards `C/P` is 0.92, 0.91, 0.91, 0.85 — a coefficient of variation of about 3%, which looks
like a law until low-boost arrives at 0.19 and the five-board variation jumps to roughly 38%.
The apparent constant is not a property of the circuits. **It is the fingerprint of the
placer**: lay every part along a strip and every pin becomes its own segment, so
`C ≈ P − S_occ` and `C/P ≈ 1 − S_occ/P`. Fitting a cuts-per-pin ratio to these boards would be
fitting to a placement strategy and reporting it as circuit complexity.

That generalises into the governing test of this section: **a metric that cannot distinguish a
good placer from a bad one is not a metric.**

| | Check | Why |
| --- | --- | --- |
| V1 | **The scorer's counts are reproduced independently.** On a fixture, the scorer's `C`, `W`, `B` equal `grep -c '^CUT '`, `'^WIRE'`, `'^SOLDER'` on the same dump, computed by a different code path. | The scorer must not be the only thing that can read its own input. |
| V2 | **The identity as a per-candidate self-check.** `C = N + J − S_occ` must hold on every candidate scored, using `N`, `J` and `S_occ` read from the dump (directly, once M1.1 lands). A disagreement is a scorer bug and **refuses the run**. | Exact on all five boards with no residual (COST §1.6). It is a free, exact consistency check available on every single evaluation, and there is no excuse for not taking it. |
| V3 | **The benchmark, re-derived.** Starting from the import-placed low-boost, the pipeline must reach `C ≤ 5`, `W = 0`, every net complete (B1). | Externally authored. §3.3 says what each failure mode means. |
| V4 | **Negative fixtures: the grader must fail things, by name.** A layout with a floated part; one with a net left incomplete; one with a span beyond `maxSpanHoles`; one not fitting the declared stock. Each must be rejected and each must name which constraint. | A grader that cannot fail proves nothing — the parent's gate-9 discipline, and §4.2's measured gap is exactly a check that failed silently. |
| V5 | **The placer-discrimination test.** Any statistic the pipeline reports must separate the pipeline's placement from `--import`'s first-fit on the *same* board by more than its across-board variation. A statistic that is stable across the four import-placed boards and changes on the hand-laid one is fingerprinting the placer; one that does *not* change when the placer is replaced is measuring nothing. | This is COST §5's finding turned into a test. It is the check that catches a pipeline grading itself against its own habits. |
| V6 | **Determinism.** Same seed, same inputs, same pinned commit → byte-identical candidate `.vrt` and identical `run.json` metrics. Compared by content, never by timestamp. | R7, and this project's rule for derived artifacts. |
| V7 | **Repository safety.** A full run leaves `boards/**` byte-identical. | Parent gate 11. The run directory is the only thing that changes. |
| V8 | **Termination honesty.** A run that stops without an admissible verdict exits non-zero and names the rule that fired and the gap remaining. A test asserts the non-zero exit on a deliberately under-budgeted run. | §7.3. A stop is not a pass. |
| V9 | **No fitted coefficient anywhere.** A review check, not a code one: the pipeline reports no ratio fitted across boards, and any constant it carries traces to a derivation, a measurement, or an owner's parameter. | Five boards cannot support a regression, and four of them are not routed (COST §5). A curve through these points is a curve through four broken layouts and one working one. |

---

## 11. Out of scope

- **PCB place and route.** That is the parent's **T1** (the KRT port) and its engine is
  KiCadRoutingTools, which knows nothing of strips, cuts or solder bridges. Nothing here
  touches it.
- **Schematic generation.** The parent's **T2** (the schgen port and the five new templates).
  This pipeline reads a netlist; it does not draw one.
- **The five layouts' actual content.** This document defines the pipeline; the layouts are its
  output. No part is placed here, no `.vrt` is written here, and §1's board figures are
  measurements of the committed state, not proposals for a new one.
- **The build and the measurement.** S1's work and the owner's: their bench, their hands, their
  ears. S1a hands them a layout and a wiring guide, nothing more.
- **Changes to the fork beyond Milestone 1.** In particular: defining `NDEBUG` in the build,
  changing the Board layer's assert contract, a stdin REPL, and any change to the `.vrt`
  format. Each is named and declined with its reason (§4.3, §4.6).
- **Panel wiring, enclosure and form factor.** The parent keeps these open as data and picks
  none of them.

---

## 12. Decisions

| | Decision | Who | Why |
| --- | --- | --- | --- |
| D1 | **The stripboard carve-out is withdrawn; agents place and route stripboard layouts.** | The owner, 2026-10-10, recorded in the parent's "Governing-document changes" | The carve-out narrowed "never place parts or route a board" to stripboard on the ground that no such pipeline exists there. That is the wrong kind of reason: "no pipeline exists" argues for building one, not for keeping the prohibition that makes building one unthinkable. As written it also left S1 quietly depending on hand layout for four boards. `CLAUDE.md`, `AGENTS.md` and `README.md` were updated to match in commit 5089cda. |
| D2 | **S1a exists as its own sub-project, with the Pultec as its forcing function.** | The owner | Laying five boards out by hand is fiddly, repeatable, measurable work, and agent cycles are cheaper than the owner's. A first solution that technically works while leaving a person doing remedial work is a failure, not a delivery. Everything here is specified over "a circuit and a hole grid"; the five boards are what proves it. |
| D3 | **No legibility, tidiness or neatness term in `F`.** | This spec, from the parent's governing principle | A term an agent scores itself on is the agent authoring its own acceptance criteria, which is the failure the parent records — a board graded clean with the input stage 8 mm from the output stage. Legibility enters through a reviewed rule library or an independent reviewer, never through `F`. |
| D4 | **low-boost's hand layout is a first-class acceptance criterion (B1): `C ≤ 5`, `W = 0`, every net complete.** | This spec | It was laid out by the owner by hand — commits `a33cb4d` and `2f62ee1`, authored by `oletizi`, no agent attribution — it is the only one of the five that conducts, and it sits at 5 cuts against a floor of 4. A number no agent chose, about an artifact no agent produced. Risk recorded: one board is one data point (§3.4), which is why `κ_bench` is a parameter. |
| D5 | **The `--dump-board` extension precedes everything else.** | This spec | Verified here: zero `ROWS`/`COLS`/`BOUNDS` lines exist today. Without them `S_occ`, occupancy and overlap are not computable, and the cost analysis had to reconstruct `S_occ` by probe and by hand. An optimiser cannot score a candidate it cannot measure, and a rotate verb shipped first would let a scorer misread a rotated part's span. |
| D6 | **Copper-true floating detection is a hard constraint, not a nicety.** | This spec | `--stretch` on `C19` exits 0 and saves the part `FLOATING` with `NODE` and `CUT` lines unchanged, because `GetBoardMembership` reads component nodeIds rather than copper. One field in the whole dump moves, and **every term in `F` reads as a healthy board** — so a scorer computing `F` from the counts scores a broken layout as a good one. A skipped check that looks like a passing one is the failure shape the whole workflow exists to prevent. It is also the overlap check, because `CanPutDown`'s refusal surfaces as a float. |
| D7 | **The zero-delta abort is guarded in the verb; the fork's asserts are left alone.** | This spec | An optimiser will propose a no-op eventually, and `assert` is live in the shipped build. A guard in the verb is local and reviewable; defining `NDEBUG` disables every assert in the binary and changing the asserts changes the Board layer's contract for the GUI. Different remedies, different blast radii. |
| D8 | **`--move` before a batch verb.** | MOVE §4.3, adopted here | The one-move verb is what makes the batch verb's per-move verification reviewable. Building the batch first means writing the verification and the loop at once, with nothing to check the verification against. At ~12 ms per gesture the one-move verb already drives order 10² trials per second. |
| D9 | **`--import`'s placer is replaced, not tuned.** | MOVE §3, adopted here | It never consults `parsed.m_nets`; nets are painted after every part is fixed. There is no placement strategy to improve, it is order-dependent on the KiCad export with nothing recording that dependency, and it cannot report a placement failure at all. |
| D10 | **`maxSpanHoles` is required with no default; the pipeline refuses without it.** | This spec, from COST §3.2 and L1 | The repository holds no lead-length or bend-radius data. A default would produce boards that score well and cannot be built — the worst outcome, because the arithmetic looks right. Refusing loudly beats defaulting to a guess. |
| D11 | **`ρ_w` and `ρ_s` are parameters with proposed defaults 3 and 1, never constants.** | This spec, from COST §4.3 | They are facts about one person's bench, their cutter, their eyesight and what they find tedious. Nothing in the repository, the fork or the circuit can supply them. Not yet supplied. |
| D12 | **`κ = J/(P−N)` is the progress variable; no ratio is fitted across boards.** | This spec, from COST §5 | `C/N`, `C/parts` and `C/P` fingerprint the placer, not the circuit — 0.85–0.92 with ~3% variation on four boards, 0.19 on the fifth. The identity needs no sample; anything beyond it would. |
| D13 | **Reuse the sibling repository's architecture; reuse none of its geometry.** | This spec, from MOVE §6 | Schema-versioned strict rules, generate-and-grade with repair that only proposes, a declared ranking, two-condition termination, hashed run manifests, seeded determinism and the injected-spawn posture all port. Millimetre courtyards, the continuous repair sweep, the KRT engine, `policy.ts` and s-expression text editing do not: a `.vrt` is a binary `QDataStream` and the grid is integers. |
| D14 | **Adoption goes through one gate; `make check` stays the gate.** | This spec, from the parent's replacement rule | The pipeline's admissibility check is upstream of adoption, never a new clause in `make check`. Nothing the pipeline authored is added to the repository's verdict. |

---

## 13. Honest limits

Carried from COST where they bear on this spec, plus what this document could not determine.

| # | What is not determined | What settles it |
| --- | --- | --- |
| H-1 | **The physical span a stretched part can reach** (COST L1). The binding constraint on reaching the floor. §5.3 gives what each board's RCM ordering needs — about 10.8 mm of lead past a DIN0207 shoulder and 11.5 mm of splay on a B32529 for the worst of the five — but those are arithmetic on footprints, not a reach claim. | §8.2's measurement, recorded as a per-family `maxSpanHoles` with the measurement in a comment. Until then the pipeline refuses. |
| H-2 | **What the floor becomes when `maxSpanHoles` binds.** The unconstrained floor `max(0, N − R)` is derived and stands. No constrained floor is derived here, so a board whose reach forbids one net per strip has no stated lower bound to be measured against. | A derivation, or — faster — running P1 under the measured reach and reading the result. Until then the pipeline reports the shortfall rather than a second floor. |
| H-3 | **Whether `C = 0` is attainable on any of these boards** (COST L2). It is the floor and §5.3 shows no span-ceiling obstruction, but no packing feasibility argument exists: parts across the strips consume columns, and nothing proves mid's 31 on-board components fit in 37 columns without overlap. | Run P1 once M1.4 and M1.5 exist, and read the result. Construction answers this faster than any proof. |
| H-4 | **`κ_bench = 0.06` rests on one board**, the smallest of the five and the only hand-worked one, and the comparison is confounded three ways (COST L5, L7). | More externally authored layouts, which only the owner can supply. It is a parameter so the extrapolation is visible. |
| H-5 | **`ρ_w` and `ρ_s` are proposals, not measurements** (COST L6), and the `ρ_w · W` term is unexercised: both Pultec boards measured carry zero `WIRE` lines (MOVE §5.1). | The owner's numbers, or a timed trial. The first produced board with a wire on it is the term's first real test. |
| H-6 | **The committed cut counts are not a baseline** (COST L8). 65 / 40 / 32 / 23 come from layouts with 19, 13, 7 and 6 incomplete nets, and all five are stale against today's model. | Re-measure after S0 lands and the boards are updated. COST §2.3's floor table is already stated against the current model, so it will not need redoing. |
| H-7 | **`PlaceFloaters`' scaling is undetermined** (MOVE §4.1). It is a `while(true)` loop over all components, inside the ~1 ms figure for boards of mid's size; nothing larger was tried, and the cost of `MoveComps` itself in isolation was not measured. | Measure on a board substantially larger than mid, once M1.4 exists. It bears on search breadth, not on correctness. |
| H-8 | **The per-net *geometry* is still not observable**, even after M1.1. The dump exposes net membership, never which holes a net paints, so per-net segment counts and track length are not readable; a pin-bounding-box proxy is available and must be labelled a proxy (MOVE §5.2). | Further appended dump lines, if a per-net term ever enters the ranking. `S_occ` and `J` do *not* need them, because M1.1's `BOUNDS` plus `DIRECTION` plus row extent make the identity's terms computable. |
| H-9 | **The parent's "Out of scope" section is now stale and this document does not fix it.** It still says *"Automating perfboard layout... no pipeline here places a perfboard part. The four remaining sections are laid out by the owner in VeroRoute, as low-boost was... S1 is that work and it is in scope; automating it is not."* S1a contradicts that bullet directly. | An owner edit to the parent. Flagged rather than made, because this task's instruction was to change only the `S1a` Deliverable row — but **supersede means delete**, and a governing document carrying both claims will be read by somebody who believes the wrong one. |
| H-10 | **The two source documents' per-gesture timings differ**: ~13 ms (n = 20, COST §6.3) against 11.71 ms (n = 200, MOVE §4.1), and their conclusions about batching differ in emphasis. | The 200-run sample governs; the two agree to within about 11%. §4.6 resolves the conclusions: batching is an enabler of breadth, not a prerequisite. |
