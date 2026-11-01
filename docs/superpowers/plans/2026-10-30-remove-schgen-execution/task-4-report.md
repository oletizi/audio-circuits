# Task 4 report — switch the board guards onto the standalone comparison

**Status: DONE_WITH_CONCERNS.**

**Commits** (branch `feature/schematics-tooling`, pushed, BASE `f44e3f0`):

| SHA | what |
| --- | --- |
| `d432e7a` | Move `SPDT_PINS` out of `circuits/pultec/schematic/section-board.ts` into `circuits/pultec/physical/parts.ts`, beside `POLE_PIN`/`THROW_PINS` |
| `a02e8da` | Create `tests/circuits/sheet-model.ts` and `tests/circuits/guard-equivalence.test.ts` |
| `b4cc896` | Switch `registerDraftedPageTests` onto `compareSheetToModel`; delete `roundTripOf`; correct the prose in six test files |
| `b781ad5` | **Fix round 1** — `DraftedPageUnderTest.footprintlessParts`, asserted exactly on all five boards |

**Test summary:** `bun test tests/circuits/guard-equivalence.test.ts` — **10 pass / 0
fail**: the five approved pages agree on all **six** `SheetAgreement` lists, element
for element and **UNSORTED**, plus five controls that each fire on one swapped pin
number.

---

## Gates

- `bun test`: **4109 pass / 8 fail**. Baseline was 4099/8; the delta is exactly the
  ten new tests. All eight failures are `tests/schgen/port-fidelity.test.ts` on
  unset `SCHGEN_SOURCE`, confirmed by running that file alone (4 pass / 8 fail, the
  eight named).
- `bun run typecheck`: clean.
- `make check`: exit 2 on exactly `pt2399-core`, `transistor-preamp-lab`,
  `transistor-preamp-loop`, `transistor-preamp-staged`. **All five Pultec boards
  `ok`.**
- `drafted/`: `git status --porcelain drafted/` empty; digests `a1fa4159`,
  `e9843e6d`, `b9e42e6a`, `5e1a4139`, `d4b0b8cc` — unchanged, re-checked after
  `make check`.
- Gates run **serially**. No full `bun test` ran alongside `make check`.

---

## Three things the brief did not predict, each found by running the test

**1. `pultecDesignator` is NOT the designator map these pages carry, and the brief's
Interfaces line says it is.** `pultecDesignator("SW_HI_CUT")` is `SW_HI_CUT`; the
page and its committed export say `SW1`. The pages were annotated by
`lib/schgen/lock/annotate.ts` from an EMPTY references lock, which assigns
`<refPrefix><n>` in part order, counting per prefix from 1. `sheet-model.ts`
reproduces that from three facts, each traced to the generator's own code and named
in the module header: part order is `network.components`' index
(`schematicParts` is `network.components.map(...)`), the label is
`pultecDesignator`'s answer (that is what `sectionAuthoring`'s `designators` is), and
`refPrefix` is the label's leading capitals (`from-network.ts`'s `refPrefixOf`).
That is why the exports carry `SI1`..`SI6` for stand-in parts drawn with an ordinary
`Device:R`. **The map is deliberately not read off the netlist under test** — a
designator map derived from that would make `componentIdentity` vacuous, which is
the one list whose job is to notice a part on one side and not the other.

**2. `R2` on `pultec-low-boost` carries a declared pin swap that no rule derives.**
Caught as two `netMembership` disagreements on an approved page on the first run of
the equivalence test — not reasoned about in advance. `circuits/pultec/schematic/low-boost.ts`
declares `symbolPins: { MAIN: { a: "2", b: "1" } }` for it, on the owner's
observation of 2026-10-27: *"what is odd is R1, which has an unnecessary hairpin to
the out label. And the out label is oddly far away. you could easily rotate R1 to get
rid of the hairpin."* That file is deleted with the generator, so `sheet-model.ts`'s
`DECLARED_PIN_NUMBERS` carries the map with the observation that earned it, the
`hairpins` measurement behind it, and the reason it is a per-board override rather
than a rule change. It refuses a stale entry (a board or a component the network does
not have) and refuses a partial one, which is the rule the declaration it replaces
also followed.

**3. `SPDT_PINS` had no home that survives the deletion.** `pultec-mid`'s
`SW_MID_MODE` is a `Switch:SW_SPDT` whose model pins (`common`, `boost`, `cut`) are
not pin numbers, so a declaration is required and no rule can supply one. The table
was private to `section-board.ts`. Moved to `parts.ts` beside `POLE_PIN`/`THROW_PINS`
rather than copied into test code — Task 2 moved those two for exactly this reason
and missed this one because only `pultec-mid` has a three-pin toggle. **This is a
disclosed widening of Task 2's move**, outside Task 4's Files block; the alternative
was a second source of truth for which terminal of one switch is the pole.

---

## The pin-number map's contract, as implemented

- **The unused twelfth detent of `pultec-mid`'s selector** enters the map under its
  own pin number as its key (`{ ..., "12": "12" }`), so no model pin claims it and
  `compareSheetToModel` treats it as a declared no-connect. The key is the number
  because `ComponentOverride.ncPins` — the declaration this replaces — is keyed by
  number too, and a canonical name for a pin the circuit never names would be an
  invention. A collision between such a key and a real pin name refuses.
- **`MP` is absent**, and `SELECTOR_PIN_DISAGREEMENT` is reported on all four
  six-way pages as expected.
- Task 1's suggested derivation (`invert(part.spec.pins)` keyed by
  `PinConnection.identity`) was **not** usable — `part.spec` is the IR, which is
  what is being removed. The map is built from the declared tables instead:
  `POLE_PIN`/`THROW_PINS`/`rotaryPadOrder` for rotaries, `SPDT_PINS` for the toggle,
  identity for the `connector` junction rows (their model pin names `1`..`5` are the
  symbol's numbers, each checked against `^[1-9][0-9]*$`), and a four-entry
  positional table for `resistor`/`capacitor`/`inductor`/`potentiometer`.
- Multi-unit parts, package pins, a declared `part.symbolPins` and an unlisted kind
  all **refuse by name**. None arises on any Pultec board; each would have been an
  untested path on the one map whose errors are invisible.

---

## The standing porting instruction, discharged

`registerDraftedPageTests`' five tests, assertion by assertion:

| test | assertions | disposition |
| --- | --- | --- |
| sheet digest | digest equals the record's; control: digest of bytes+`x` differs | **UNCHANGED** — no comparison in it |
| netlist source | export text contains `(source "drafted/…")` | **UNCHANGED** |
| components and nets | `componentIdentity == []`, `netMembership == []` | **MOVED** |
| the pin control | `netMembership != []` on `withOnePinMoved`'s export | **MOVED**; `withOnePinMoved` untouched |
| known disagreements | `pinIdentity` sorted vs the board's list; `values` sorted vs the board's list; every `footprints` entry contains `footprint "<none>"`; `footprints.length > 0` | **MOVED**, all four |

Nothing dropped, nothing weakened, no assertion unaccounted for. `footprintsUndeclared`
was the one list the original asserted nothing about, which is why it is accounted for
as a **gap** rather than as a dropped assertion — and it is now **STRENGTHENED**: fix
round 1 adds a sixth assertion to the last test, `footprintsUndeclared` exactly against
the board's own list.

---

## Concerns

**1. `footprintsUndeclared` has no production reader after Task 9 — RULED, CLOSED in
`b781ad5`.** Raised as Important and sent back by the controller, who overrode the
scope objection deliberately: *"A guard whose sole assertion is removed by a later
task in the same plan is a lapsing guard, which is the failure this plan's whole
ordering exists to prevent"*, and it is the third instance of that shape in this plan
after Task 1's carried-over tables and Task 2's stranded arms. Closed as proposed —
see the section below.

**2. The one declared pin swap now lives in test code.** `DECLARED_PIN_NUMBERS` in
`tests/circuits/sheet-model.ts` is a fact about an approved drawing, and the page's
bytes are frozen by a committed digest, so it cannot rot the way a circuit fact
could. It is still a declaration about a drawing sitting under `tests/`. If the
second plan gives drawing-side declarations a home outside `tests/`, that entry
should move there with it.

**3. `modelForSheet`'s board table is static.** `BOARDS` names each board's circuit
module and builder and **checks both against `boards/<board>/perfboard.json` on every
call**, refusing on a mismatch, so the manifest stays the authority. It is not a
dynamic import, because a wrong path should fail by name rather than at await time.
A sixth drafted board needs a line there; the refusal says so.

**4. The equivalence test's control is a pin swap, not a mutated expectation.** It
swaps two pin numbers on the first component with at least two pins and asserts
`netMembership` then differs. The swap leaves the pin SET unchanged, so `pinIdentity`
cannot catch it and `netMembership` must — which is the list the board guards assert
empty. It is self-validating: if the swapped pins shared a net the swap would be
invisible and the assertion would fail. It fires on all five boards.

**5. One observation, not reproduced: nothing about the five pages' `values`
disagreements changed**, including `pultec-low-cut`'s eight, and the six lists agree
on every page without any value-side special casing. `compareSheetToModel` re-derives
values through `valueFor` where `roundTrip` read `part.value` from the IR, and the two
agree on all five pages — which is `a02e8da`'s test re-running Task 1's claim rather
than relaying it.

---

## Fix round 1 — concern 1 closed (`b781ad5`)

`DraftedPageUnderTest` gains `footprintlessParts`, beside `pinDisagreements` and
`valueDisagreements`, and each of the five board files names its own list. Measured,
not transcribed from the earlier count:

| board | n | the list |
| --- | --- | --- |
| `pultec-hi-boost` | 7 | `L_HI_BOOST_100MH`, `L_HI_BOOST_200MH`, `L_HI_BOOST_300MH`, `L_HI_BOOST_600MH`, `RV_HI_BOOST`, `RV_HI_Q`, `SW_HI_BOOST` |
| `pultec-hi-cut` | 2 | `RV_HI_CUT`, `SW_HI_CUT` |
| `pultec-low-boost` | 2 | `RV_LO_BOOST`, `SW_LO_BOOST` |
| `pultec-low-cut` | 2 | `RV_LO_CUT`, `SW_LO_CUT` |
| `pultec-mid` | 8 | `L_MID_0R1H`, `L_MID_0R22H`, `L_MID_0R45H`, `L_MID_1H`, `L_MID_2H`, `RV_MID`, `SW_MID`, `SW_MID_MODE` |

Counts match the 7/2/2/2/8 the controller carried. **Every member of every list is an
off-board part** — an inductor, a potentiometer or a switch — and nothing else appears
in any of them: there is no on-board passive hiding in there, which was the thing
worth checking rather than assuming.

**Asserted exactly, never as a count**, and compared **UNSORTED**:
`compareSheetToModel` sorts that list itself and each board's entry is written in that
order, so `toEqual` on the arrays as returned is the available claim and the stronger
one. The failure that matters is a component silently **acquiring or losing** a
footprint declaration, which moves it between `footprintsUndeclared` and `footprints`
and leaves the count unchanged.

**The assertion was mutated live to prove it has teeth.** Dropping `SW_HI_CUT` from
`pultec-hi-cut`'s list failed the test at `drafted-sheet.ts:329` naming the missing
component (`+ "SW_HI_CUT"`); the revert is byte-identical and the file re-passes.

`tests/circuits/pultec-hi-boost.test.ts`' header said *"the shared body deliberately
asserts nothing about that list"* — that sentence was true and is now false, so it is
corrected in place rather than left to read as a deliberate silence that no longer
exists.

### Gates, re-run serially after the fix

- `bun test`: **4109 pass / 8 fail**, the same eight `port-fidelity` failures on unset
  `SCHGEN_SOURCE`. **45708 expect calls against 45703** before the fix — the five new
  assertions, one per board, and nothing else moved.
- `bun run typecheck`: clean.
- `make check`: exit 2 on exactly `pt2399-core`, `transistor-preamp-lab`,
  `transistor-preamp-loop`, `transistor-preamp-staged`; `pultec-hi-boost`,
  `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-mid` and the two
  other preamp boards all `ok`.
- `drafted/`: digests `a1fa4159`, `e9843e6d`, `b9e42e6a`, `5e1a4139`, `d4b0b8cc`,
  `git status --porcelain drafted/` empty.

### What Task 9 must now know

`guard-equivalence.test.ts` can be deleted without losing a channel: all six of
`SheetAgreement`'s lists have a production reader. `componentIdentity` and
`netMembership` are asserted empty, `pinIdentity`, `values` and
`footprintsUndeclared` are asserted exactly per board, and every `footprints` entry is
asserted to read `footprint "<none>"` with a non-vacuity floor beside it.
`modelUnderTest` and `drafted-sheet.ts`' remaining `lib/schgen/`+`tools/schgen/`
imports exist only for that test and go with it.

### Controller's accepted findings, recorded here so they survive the workspace

- **Finding 1** — the controller records the spec's error as its own: Task 3's move of
  `pultecDesignator` was correct (it supplies the label the annotation rule consumes)
  but not sufficient on its own, and the spec said otherwise.
- **Finding 2** — context the implementer could not have: the `R2` override was
  committed the previous day, and the controller had told the owner at the time that it
  probably ought to be reverted, since the page it improves is no longer what ships. It
  was not reverted, so it binds, and `DECLARED_PIN_NUMBERS` is now what keeps that
  approved page's netlist honest after the declaring file dies.
- **Finding 3** — the disclosed widening of Task 2's move is the correct resolution;
  one fact lives in one place.
- Concerns 2 through 5 accepted as recorded, no action.
