# Three known failures: what each refusal was really asking for

**2026-10-30.** `make check` carried four failing boards and `bun test` ten failing
tests. This records what was behind the three that were handed to this session as
bounded defects, what was supplied, what evidence establishes it, and the two things
it found on the way that are nobody's to paper over.

**Nothing here is a figure to quote on its own.** Each measurement names the command
or the test that re-runs it; where this document gives a number, the number is there
to say what was seen on 2026-10-30 and the re-run is the authority.

## 1. `pt2399-core` has no `bomConditions` export - REFUSED, and the refusal is the deliverable

**What the gate asked for:** *"circuits/pt2399-core/pt2399-core.ts: no
"bomConditions" export. Export `bomConditions(): BomConditions`
(tools/bom/conditions.ts)."*

**THE REMEDY THAT MESSAGE NAMES DOES NOT WORK, and that is the finding.** Exporting
well-formed conditions moves the refusal exactly one step. `tools/bom/run.ts`
computes `resistorDissipation(network, conditions)` before `deriveNeeds`, and
`deriveNeeds` requires a dissipation figure for *every* resistor - this board has
eight - refusing by name rather than assuming one safe. Three things stand in the
way, all three run rather than reasoned to:

| | what refuses | message |
| --- | --- | --- |
| 1 | `resolveNetwork` (`lib/model/control-state.ts`) | `Missing ground port: ground` |
| 2 | `toSpiceOperatingPointNetlist` (`lib/sim/device-lines.ts`) | `component "delay_ic" unit "MAIN": kind "ic" has no SPICE emission rule in this emitter` |
| 3 | nothing - it is an absence | no basis exists for `environment.source` or `environment.load` |

(1) is one word: `GROUND_PORT_KEY` is the literal `"ground"` and this circuit alone
keys its reference port `"gnd"`. It is deliberately not changed, because changing it
moves the refusal to (2) and closes nothing.

(2) is the real blocker. The PT2399 is the only active device on the board, nothing
in `lib/sim/models/` is a PT2399, and the DC solution every resistor's wattage comes
from is a statement about that part's two internal op-amps.

(3) is the one that would have been easiest to fake. An operating-point deck carries
a source series resistance and a load resistance, both of which move the operating
point they feed, and nothing in this repository records what drives `INPUT` or loads
`OUTPUT` on this board - there is no bench environment for it as there is for the
staged preamp (`circuits/transistor-preamp/staged-environment.ts`). A plausible pair
would have been invented data with arithmetic on top of it.

**The rail is NOT what is missing.** It is 5 V - the `+5V` net this transcription
carries on J1 pin 1 - and `highestRailVolts` is the one consumer that would have been
satisfied by a declaration.

**What was supplied:** a `bomConditions` export that REFUSES, naming all three, plus
a test (`tests/circuits/pt2399-core.test.ts`) that holds the refusal to naming them
AND re-measures (1) and (2) against the live code. The day a PT2399 model lands, that
test fails and the refusal is the thing to delete.

**WHAT WOULD SETTLE IT - one of two, and the second is not an agent's to take.**
Either a DC model for the PT2399 with the provenance `lib/sim/models/` requires of
every model in it; or **the owner's decision that this board has no parts list**, in
which case the thing to delete is `boards/pt2399-core/bom.json` - `checkBoardBom`
does not apply to a board without one, and that file is what turned this gate on for
a board that cannot satisfy it. **Deleting it to quiet the gate was not taken from
here**: `docs/known-gaps.md` **G251** already carries the 2026-10-16 instruction for
exactly this shape - report it and STOP, do not weaken the gate. The question has not
been put to the owner either, because it stalls nothing that is waiting on it today.

## 2. No lead span for `CP_Radial_D10.0mm_P5.00mm` - SUPPLIED, from the part's own datasheet

**What the gate asked for:** a span, *"read the lead length, lead diameter and body
dimensions off a named part's datasheet, record them with their document number,
revision and table"*.

**The part is named by the board, not chosen here.**
`boards/transistor-preamp-staged/bom.json` buys
`electrolytic-470uf-35v-radial-10x16mm`, which is Panasonic M-A **ECA-1VM471**,
470 uF 35 V, phi10 x 16 mm. The Nichicon PS case-size table the three smaller
electrolytic entries rest on stops at phi8, so there was no row to extend - and
extending one would have recorded one manufacturer's guarantees for another's part.

**Evidence, and how it was obtained.** Panasonic **ABA0000C1218**, dated 01-Sep-25,
the document `parts/electrolytic-470uf-35v-radial-10x16mm.json` already cites.
`curl` against `industrial.panasonic.com` times out from this machine; the PDF came
down through `WebFetch` and was read with `pdftotext -layout` and by rendering page 1
at 600 dpi and reading the drawing.

- *Characteristics list*, 35 V section, 470 uF row: `oD x L` **10.0 x 16.0**, lead
  dia. `od` **0.6**, lead space Straight **5.0** / Taping *B 5.0 / Taping *i -, part
  no. **ECA1VM471( )**, min. packaging 200 straight leads.
- *Dimensions* box, `Unit: mm` table: `oD` 5.0 / 6.3 / 8.0 / **10.0** / 12.5 / 16.0 /
  18.0 against `od` 0.5 / 0.5 / 0.6 / **0.6** / 0.6 / 0.8 / 0.8 and `F` 2.0 / 2.5 /
  3.5 / **5.0** / 5.0 / 7.5 / 7.5.
- The KiCad footprint itself, read as a file: `descr "CP, Radial series, Radial, pin
  pitch=5.00mm, diameter=10mm, height=16mm"`, pads 1 and 2 at x 0 and x 5. **The
  footprint and the catalogue part are the same can.**

**THE LEAD IS 14 mm AND IT IS THE NEGATIVE ONE - the reading that decides the
maximum.** The drawing's `14min.` and `3min.` are a dimension CHAIN running away from
the body: the first ends at the end of the SHORT lead, which the drawing marks with a
circled minus, the second at the end of the LONG lead, marked with a circled plus. A
span is something BOTH leads must reach, so 14 mm binds and the positive lead's 17 mm
is unusable. **This repository had read both figures before and resolved neither**:
`docs/parts/2026-10-10-capacitor-and-inductor-research.md` section 2.2 records only
that they are *"on the lead"*. A reader who took the chain as one 17 mm lead would
record a maximum the negative lead cannot make.

**What the entry derives to:** 2 to 11 holes - the grid at the floor, lead-limited at
the ceiling. Not asserted by hand: `tests/kicad/lead-span.test.ts` recomputes every
recorded integer from the recorded dimensions and checks that one hole further is out
of reach, and `tests/kicad/footprint-extent.test.ts` opens the `.kicad_mod` and
checks its version token, derived body and pad positions against the entry.

### 2a. A second footprint nobody had noticed

The same board places
`Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, which was in no table
either. `make check` never named it, because `measure` refuses on the first
unrecorded footprint it reaches. It is a moulded SIP pin field like the 1x01, 1x02
and 1x05 already recorded, three holes, evidenced by the footprint file's own pads.

### 2b. Why the coverage test did not catch either

`tests/kicad/lead-span.test.ts` asserts that *"every footprint the boards place is
recorded or deliberately unsourced"* over a list of boards that held **eight of the
eleven** with a `boards/<name>/perfboard.json`.
`transistor-preamp-staged`, `-loop` and `-buffered` were not in it. All eleven are
now, which is what made both gaps red before they were filled. **A coverage test is
only as wide as its list.**

### 2c. What recording the span then exposed - NOT FIXED, and not this session's

**`transistor-preamp-staged` grades now, and HC5 does not hold:** `C8` spans 14 holes
against `maxSpanHoles` 11 for `Capacitor_THT:CP_Radial_D5.0mm_P2.00mm` - 33.02 mm of
pitch for a can whose 15 mm leads reach about 26.6 mm. `HC8`, `HC9` and `HC10` all
hold on the board. **A refusal became a verdict, and the verdict is red.** That is a
fact about the layout, the layout was not touched, and HC5 was not relaxed. Re-run:
`make -C boards/transistor-preamp-staged check`.

**And the board started importing, which three tables asserted it could not.** Each
went red by design; each is answered in the way its own comment asks for, and the
cross-checks in `tests/stripboard/model/` now reach three of the seven committed
boards rather than two. One figure moved that is NOT explained:
four of that board's ten cuts are not reproduced by the fork's own
hug-the-earlier-run rule, where the old figure's only two misses were on `feedback`
and were explained by its paint being a person's. Nothing here establishes whose
paint the staged board carries; the test comment says so and names what would settle
it.

## 3. `decomposition-probe.test.ts` times out - SUPPLIED an explicit timeout

**What the failure was:** bun's per-test default is 5000 ms. The probe was measured
at 9748 ms at one commit, 9299 ms in this session's baseline run, and **passes in
3.7 s when its file is run alone**. So it failed as a TIMEOUT: a red that says
nothing about any assertion in it.

**The slowness is not itself a defect.** The probe enumerates every subset of each
Pultec section - 2^n masks against four templates, for the sections with at most 18
members - and that enumeration IS the question it asks.

**A SECOND INSTANCE OF THE SAME DEFECT WAS IN THE SAME BASELINE, and it was not on
the list handed over:** `tests/guide/print-pdf.test.ts`'s *"the real converter prints
a multi-page PDF"* at 5962 ms against the same 5000 ms default. It launches real
headless Chrome on purpose - it is the only proof that the flags `make/board.mk`
passes still produce a PDF on this machine - and a cold browser start is not a 5 s
operation on a loaded machine. It is fixed the same way.

Both figures follow this repository's own conventions: 120_000 for the probe, as the
two `tests/schgen/elk/` tests that do real work use, and 60_000 for the browser, as
`tests/circuits/stub-writer-tripwire.test.ts` uses for its subprocess. Both are wide
enough that a failure there is a hang rather than contention. **Verified in a full
`bun test` run, not in isolation**, which is the only run where either ever failed.

## 4. What was refused, and why

- **A source and a load for `pt2399-core`.** No basis exists; both move the operating
  point; see section 1.
- **A PT2399 SPICE model.** It would be an acceptance criterion authored by the agent
  whose artifact it judges, and a macromodel with no stated provenance is what
  `lib/sim/models/` exists to prevent.
- **Declaring the PT2399 `electricallyInert`.** It would make the deck emit and the
  gate pass. The part is the only active device on the board; the claim would be
  false.
- **Deleting `boards/pt2399-core/bom.json`.** It would make `make check` green on
  that board by making the gate not apply. Owner's decision, per G251.
- **Relaxing HC5 for `transistor-preamp-staged`, or touching its layout.** The span
  it is stretched to is one the part cannot make.
- **Touching `transistor-preamp-lab` and `-loop`.** Their stripboard layouts are
  unpainted (`CUT_STATE UNRESOLVED`), so HC8 and HC10 refuse a verdict. That is
  correct behaviour.

## 5. Before and after

Both runs are full runs on this machine, the before taken at `7e69627` and the after
at the head of this branch. The failure lists are compared **by name with timings
stripped**, which is `fails-before.txt` against `fails-after.txt` in the run scratch.

### `bun test`: ten failures, then eight, and the diff is two deletions

```
$ diff fails-before.txt fails-after.txt
3d2
< does a Pultec section decompose across the reachable templates? > enumerates subsets
<   of each section and reports which a template draws
10d8
< the real converter prints a multi-page PDF from a page with the guide's print CSS
```

**No additions.** The eight that remain are all of
`tests/schgen/port-fidelity.test.ts`, which refuses on an unset `SCHGEN_SOURCE` -
it needs digital-pedal-platform's `tools/schgen/` on disk and defaults to no guessed
path. The totals: `3990 pass / 12 fail` on the mid-session run that still carried
the import ripples, `3992 pass / 10 fail` before, **`4001 pass / 8 fail` after**,
across 374 files. The test count rises from 4002 to 4009: the new entries' tests plus
the three per-board comparisons `transistor-preamp-staged` joins.

### `make check`: four boards before, four after - the same four, two for new reasons

```
pt2399-core                 FAIL -> FAIL   (reason changed: a refusal that names the chain)
transistor-preamp-lab       FAIL -> FAIL   (unchanged: CUT_STATE UNRESOLVED, not ours)
transistor-preamp-loop      FAIL -> FAIL   (unchanged: CUT_STATE UNRESOLVED, not ours)
transistor-preamp-staged    FAIL -> FAIL   (reason changed: NOT GRADED -> HC5 NOT HELD)
```

**This is two more than the task that commissioned the work expected, and the
difference is the two refusals above rather than a check that was left red.** The
brief assumed `pt2399-core` needed only the export and that
`transistor-preamp-staged` would pass once its span was recorded. Neither assumption
survived contact: section 1 is why the first board cannot pass without a PT2399
model or an owner decision, and section 2c is the real HC5 violation the span datum
made visible on the second. **Both boards moved from a refusal to a stated reason,
which is the direction this repository counts as progress**, and nothing was relaxed
to shorten the list.

The exact `make check` text for both is quoted in the two sections above; it is also
reproducible per board with `make -C boards/<name> check`.

