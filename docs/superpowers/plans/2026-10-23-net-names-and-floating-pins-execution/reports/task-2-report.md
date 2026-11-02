# Task 2 report - what the model-`NC` path actually does

**Status: COMPLETE.** The deliverable is `NC PATH`, and it is **outcome 1 of the
brief's three**: the path works end to end, unchanged, on its first exercise. No
file under `lib/` was modified.

- Suite: **3822 pass / 0 fail / 43622 `expect()` across 354 files** (baseline
  3812 / 0 / 43602 / 353). Accounted term by term below.
- `bun run typecheck`: clean (`tsc --noEmit`, no output).
- `make check`: not run; it is `typecheck` plus three board-agreement targets
  (`pultec-schematic-agrees`, `pultec-scaffold-agrees`,
  `tascam-38-interface-valid`) and this change touches none of them. G251's red
  is pre-existing and not this task's.

---

## 1. `NC PATH` - the measurement

The check is `tests/schgen/ir/nc-end-to-end.test.ts` (new, hand-written,
declared in `tools/schgen/port-manifest.json`'s `handWritten`). It builds its
own `Network` - **no circuit authors `NC`**, as Task 4 and Task 5 require.

| question the brief asked | answer | how |
| --- | --- | --- |
| does a model `NC` reach the IR as `net: null`? | **yes** | `IrPin` for that pin has `net === null`, `origin === "circuit"`, `identity === "7"` |
| does `pinsDeclared` accept it? | **yes** | `validateCircuit` returns `[]` over all eleven drawing rules |
| does the pin reach `d.noConnects` and the emitted sheet? | **yes** | `SheetDrawing.noConnects` has length 1; the emitted sheet carries one `(no_connect ...)` whose `(at x y)` equals that point through `fmtMm` |

Also asserted: the pin is on **no** net of `Circuit.nets`, so nothing downstream
can read it as connected.

**Why it works, traced rather than assumed.** `lib/schgen/from-network.ts:222`
and `:233` put `{ nc: true, identity }` on the `PartSpec`; `lib/schgen/ir/build.ts:46`
calls `connectedNet` from `ir/types.ts:62-64`, which returns `null` for a
connection with no `net` key; `pinsDeclared` (`ir/validate.ts:67-74`) builds its
`have` set from pin NUMBERS, so a null-net pin counts as declared;
`render/unit-pins.ts:49`'s `noConnectEnds` selects `net === null` pins;
`render/sheets.ts:111-116` dedupes them onto `SheetDrawing.noConnects`;
`render/emit.ts:169` maps them through `render/emit-items.ts:215`'s `noConnect()`.

**Two line citations in the brief are off, and I verified rather than trusted
them.** `from-network.ts:222` and `:233` are correct. **`:468` is not the IR's
pin assembly** - it is `orientationsOfParts`'s `pinNets` map, which feeds the
orientation rule, not `IrPin.net`. The `null` that `ir/types.ts:247` documents
(*"Null means explicitly not connected"*) is produced by `connectedNet` in
`ir/types.ts:62`, reached from `ir/build.ts:46`. The brief's conclusion was
right; its mechanism pointed at the wrong line.

## 2. The four states, each on its own message

One fixture, one pin varied, **one** failure message per arm - so the assertion
is `toEqual` on the exact array, not a count:

| state | rule | exact message |
| --- | --- | --- |
| deliberate `NC` | accepted | `[]` |
| pin omitted from the model | `pinsDeclared` | `part U1: pin 7 (NC) is neither on a net nor declared not connected` |
| library pin typed `no_connect`, on a net | `pinSemantics` (`validate-nets.ts:47`) | `part U1: pin 7 is a no_connect pin but is on net IN` |
| pin alone on a one-pin net | `singlePinNets` | `net SPARE has only one pin (U1.6); connect it or declare the pin not connected` |

The fourth arm is **the `pt2399-core` shape reproduced on a fixture**: the net
passes `lib/model`'s own `done()` only because a port is declared for it, and the
IR refuses it anyway. The spec's *"one workaround, two validators, and it only
ever satisfied one of them"* is now a test rather than only a board.

State 2 - the one that protects against accident - is additionally pinned
structurally: the omitted pin is **absent from `c.pins`**, while the `NC` pin is
present. Nothing was relaxed to make state 1 pass, because nothing had to be.

## 3. `noConnect()`'s measured coverage - it was ALREADY fully exercised

I did not inherit the spec's sentence. `[RAN]` `bun test --coverage
--coverage-reporter=lcov` over the whole suite at a clean tree (before my test
existed, confirmed by the run's own `353 files` line):

- `lib/schgen/render/emit-items.ts`: **LF=137, LH=137, no uncovered lines.**
- **No module under `lib/schgen/` has zero line coverage.** `gates/pin-table.ts`
  is LF=78 LH=78; `render/emit.ts` is LF=149 LH=149.
- Per-file probes over the seventeen test files that reach the emitter:
  `noConnect()`'s body is **covered** by six - `tests/cli/schgen.test.ts`,
  `tests/schgen/emit-byte-stable.test.ts`, `tests/schgen/gates/gates.kicad.test.ts`,
  `tests/schgen/gates/round-trip.kicad.test.ts`,
  `tests/schgen/readability/measures.test.ts`,
  `tests/schgen/render/hidden-value-netlist.kicad.test.ts` - and **uncovered** by
  `tests/schgen/render/emit.test.ts`, `emit-refusals.test.ts`,
  `emit-power-refs.test.ts`, `pin-marks.test.ts`.
- **Corroborated in the bytes, not only in the instrumentation.** Generating the
  ported `mini` fixture design writes **3 `(no_connect ...)` items on
  `signal.kicad_sch`** and 0 on the other two sheets, matching
  `SheetDrawing.noConnects` of 3 and 0. Its `{ nc: true }` pins are authored at
  the **IR** level in `tests/schgen/__fixtures__/designs/mini/index.ts`.
- Because `tests/schgen/gates/round-trip.kicad.test.ts` exports that schematic's
  netlist with the real `kicad-cli`, **KiCad has already read a
  generator-emitted `(no_connect)`**.

**Caveat on the instrumentation, stated because it would otherwise be a false
precision.** bun 1.3.8's lcov `DA:` counts for this file are not usable as
execution counts - the same line reports 43 in a one-file run and in a 353-file
run. Only the zero / non-zero distinction was relied on, and every non-zero was
corroborated by the marker count above.

## 4. Three claims the task was sent in with that are wrong

**(a) `NC` was not unimported.** `[RAN]` `git grep` at `HEAD`: four files import
it from `lib/model` - `tests/kicad/schematic.test.ts`,
`tests/model/builder.test.ts`, `tests/model/include.test.ts`,
`tests/model/validate.test.ts`. The spec's sentence is true only of `circuits/`.
And `tests/kicad/schematic.test.ts` **already drove a model `NC` to a
`(no_connect)`** - through the superseded stub writer
(`lib/kicad/schematic.ts:186`), which is why it never helped the real generator.
The accurate statement is narrower: **no test drove a model `NC` through
`circuitSpecFrom` into `lib/schgen` at all.** That is what this task closed.

**(b) The README name the spec called stale is correct.**
`lib/schgen/README.md:303` names `noConnectEnds.test.ts` in a paragraph about
**what Task 7 ported**, and `[RAN]` `ls` of the pedals source shows all four
names in that sentence existing upstream in camelCase. It is the source
filename, correctly spelled. **No README change was needed and none was made** -
the spec's correction was itself uncorroborated, which is the error it was
correcting.

**(c) The README's "modules nothing runs" sentence is dated narrative the README
itself reverses.** `:306` lists `emit-items.ts` as of Task 6; `:409` says *"the
five modules nothing ran ... are now two"*. Measurement 3 shows even that is
stale. Nothing was edited - those are dated records, not current claims.

All three are recorded in `docs/known-gaps.md` **G278** clauses 3, 5 and 6.

## 5. What I changed, and what I deliberately did not

| file | change |
| --- | --- |
| `tests/schgen/ir/nc-end-to-end.test.ts` | **new.** 10 tests, 16 `expect()` |
| `tools/schgen/port-manifest.json` | the new test declared `handWritten`, required by `port-fidelity.test.ts`'s completeness check |
| `tests/kicad/symbol-names.test.ts` | `Fix:BIG8` added to `NOT_A_KICAD_SYMBOL`, with its reason |
| `docs/known-gaps.md` | **G278** |

**Nothing under `lib/` was touched**, and no existing assertion was weakened.

**Two repo-wide sweeps fired and are worth knowing about.**
`tests/kicad/symbol-names.test.ts` greps every `.ts` file for a part spec's
quoted `symbol` field and demands it resolve in an installed KiCad library. The
fixture needs a symbol whose LIBRARY types a pin `no_connect` - state 3 is
otherwise unreachable - and `Fix:BIG8` (pin 7, named `NC`) is the only verified
one in the tree. So it joins `NOT_A_KICAD_SYMBOL` beside `Fix:R`, `Fix:C`,
`Fix:OPAMP2`, held to the same four teeth that list already applies: still
swept, fails exactly as recorded, reason over 60 characters, and declared only
under `tests/schgen/`. It is the first hand-written rather than ported file to
need an entry. `tests/kicad/footprint-names.test.ts` fired on a `dip8` footprint
the fixture briefly carried; **the fixture now declares no footprint at all**,
which `from-network.ts`'s header already documents as the faithful transcription
of a model that declares none - rather than adding a bare name the repository
would then have to account for forever.

## 6. Suite move, term by term

```
baseline   3812 pass / 0 fail / 43602 expect() / 353 files
after      3822 pass / 0 fail / 43622 expect() / 354 files
```

- **+10 pass, +1 file**: `tests/schgen/ir/nc-end-to-end.test.ts`, which run
  alone reports `10 pass / 0 fail / 16 expect() calls / 1 file`.
- **+16 `expect()`** from that file.
- **+4 `expect()`** from the one new `NOT_A_KICAD_SYMBOL` entry: the
  exemption-teeth test (`symbol-names.test.ts:290`) asserts four times per entry
  inside its loop.
- 16 + 4 = **20**, which is 43622 - 43602. Nothing else moved.

## 7. Three fixture-construction refusals a successor will hit

None is a defect; each cost a run, and they are in G278 clause 7.

1. `authoringProblems` refuses `portDirections` naming a net no pin of the
   network is on - so a fixture with per-arm nets needs a per-arm direction map.
2. `lib/schgen/render/bus.ts` refuses a `bus` block holding more than one unit
   (*"bus block PROBE must hold exactly one unit (holds 3)"*) - a three-part
   fixture needs three blocks.
3. Compare an emitted `(at x y)` with `fmtMm` from `render/geometry.ts`: the
   emitter writes `48.26`, not `48.260`.

## 8. Concerns, in the order I would act on them

1. **No `kicad-cli` ran on a sheet whose `no_connect` came from a MODEL `NC`.**
   My fixture is one sheet, not a project; the existing `kicad-cli` proof is the
   `mini` design's IR-level `{ nc: true }`. Spec 3b's *"required gate"* - an
   end-to-end test proving `pt2399-core` pin 5's `NC` survives generation **and**
   round-trip verification - is Task 5's and is not discharged here.
2. **A green NC path is not permission to batch the five Pultec mounting pins.**
   Spec 3's requirement that each be classified individually, from the symbol's
   own pin definition and the switch documentation, is untouched. The tell the
   spec names - four switches calling the pin `MP` and one calling it `12` -
   still stands.
3. **`docs/known-gaps.md` is now 1.8 MB.** It greps clean (0 stray control
   bytes, verified by counting bytes rather than reading), but the size is
   becoming a cost of its own and nothing in the repository manages it.
4. **The spec carries three statements this task falsified**, and amending it is
   Task 6's call, not mine. G278 records them; a reader of the spec alone would
   still be misled.
5. **Coverage is unguarded.** `emit-items.ts` is at 100% lines today and nothing
   would notice if it regressed. Whether coverage should gate is an acceptance
   criterion, which `CLAUDE.md` reserves away from the agent that produced the
   artifact, so it is recorded as an untried mechanism rather than written.

---

# Round 1 — review response

**Verdict received: PASS / PASS WITH FINDINGS.** Six items; three Importants,
all documentation, none touching code or outcome 1. One of the three was the
coordinator's and was already fixed in the spec. **Nothing under `lib/` changed
in this round either, and no test assertion changed except one new comment.**

**Suite unchanged in every term: 3822 pass / 0 fail / 43622 `expect()` across
354 files.** `bun run typecheck` clean. A documentation round moved nothing,
which is what it should do.

## What the attack established, and it is the headline

Relayed from the reviewer, now G278 clause 11. Five mutations — breaking
`noConnectEnds`'s filter, disabling each of the three validator pushes, and
making `connectedNet` return `"IN"` instead of `null` — each killed exactly the
tests they should, the last killing six. Controls: **`NC` changed to an ordinary
net gives 0 `no_connect`s, the pin removed gives 0, `NC` gives 1** — the marker
appears if and only if the model declares `NC`. And the marker coordinate was
re-derived **without `layoutSheet`**, from `Fix.kicad_sym`'s pin 7 at
(10.16, 2.54), U1's emitted placement and KiCad's y inversion, landing on
(48.26, 35.56) — this fixture's marker. All four states were driven red by their
own mutations, state 2 is pinned twice, and nothing was relaxed.

## Item 1 (Important) — the lcov caveat did not cover what it claimed. FIXED

The reviewer is right and I verified it myself. `[RAN]` the per-file probe over
the four files my split calls uncovered: **`DA:217` reads 1 in all four**, and
line 217 is `return { key, node: list("no_connect", …) }` — `noConnect()`'s only
working line — in runs where the function is never called. `DA:215` and `DA:216`
read 0 in those four and 19 / 43 in a run that does call it.

So **`LF=137 LH=137` with "no uncovered lines" is not evidence that every line
executed**, and my caveat — "only zero-versus-non-zero was relied on" — was true
of the per-file split and false of the two aggregate sentences sitting above it.
G278 clause 4 now states what the lcov establishes (`DA:215`/`DA:216`
zero-versus-non-zero **within one run**) and what it cannot (`LH=LF` as
execution; the counts as execution counts), and the CRITERION now says plainly
that **the `mini` marker count is the settlement and the lcov is not**.

## Item 2 (Important) — the Fix:BIG8 reason rested on a search never run. FIXED

Also right, and the inversion is the uncomfortable part: I cited
`CLAUDE.md`'s *"verify names against the thing itself"* as a reason **not** to
look, when that rule mandates looking — and `tests/kicad/symbol-names.test.ts`'s
own `symbolExistsOnDisk` reads those libraries. `[RAN]` my own census over
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`: **4,513
`(pin no_connect` declarations across 139 of 223 libraries**, which reproduces
the coordinator's figure exactly.

The decision stands; its justification is replaced. The reason as it now reads
in the exemption entry is quoted in the hand-back.

Two further corrections went in with it: `Fix.kicad_sym` holds **two** symbols
with a `no_connect` pin (`BIG8` and `BIG8C`, pin 7 in both, differing only in
power-pin placement), so BIG8 was not the only candidate even among the
fixtures, and **the choice is recorded as arbitrary rather than dressed up**.

## Item 3 (Important, the coordinator's) — G278 clause 6's version. FIXED

I verified the mechanism rather than taking it: `[RAN]` bun's lcov emits **102
`SF:` records for the 105 `.ts` files** under `lib/schgen/` — it omits a module
it never loads instead of recording it at zero. The three omitted are
`ir/validate-rule.ts` and `render/sheet-types.ts` (type-only, so no runtime
module exists to load) and **`gates/oscar/boundary.ts`**, which is the one
`README.md:409` names.

So my "no module under `lib/schgen/` has zero coverage" was false, and clause 6's
"even that is now stale" overclaimed. The supportable conclusion, now recorded:
**the two became one** — `gates/pin-table.ts` is loaded and covered (LF=78
LH=78), `gates/oscar/boundary.ts` has no record at all, so `:409` still stands
for it. Clause 6 names this as **the same shape as the defect it was reporting**:
I read the absence of a zero-coverage record as the absence of a zero-coverage
module. Clause 4 now carries the rule that follows — **a coverage report read for
absence must be checked against the file list first**.

## Four minors — all fixed

1. **Clause 3's criterion said four importers; it is five**, and the fifth is
   this entry's own artifact. That is **G276**'s pattern found inside the entry
   that reports the figure. The clause's claim is unaffected (that `NC` *had*
   importers, not how many), so the figure is now dated: **four at `HEAD` as of
   `15696e0`, five from `b207b68`**.
2. **Clause 7 misquoted the block id.** The verbatim message is `block PROBE:
   bus rendering failed: bus block PROBE must hold exactly one unit (holds 3)`.
3. **`BIG8C`** — covered under Item 2.
4. **The `(at x y)` assertion could be over-read**, so both the test and G278
   now say what it establishes: that the **emitter** writes the marker at the
   coordinate the layout reported — nothing relocates, duplicates or drops it,
   and the `mm` formatting agrees with `fmtMm`. It does **not** independently
   establish that the layout's point is pin 7's end, because both sides come
   from `layoutSheet` and a wrong pin end would agree with itself. That half is
   the reviewer's independent derivation, recorded as relayed in clause 11.

## Files touched this round

| file | change |
| --- | --- |
| `docs/known-gaps.md` | G278: preamble, clauses 3, 4, 6, 7, 8 corrected; clause 11 added; CRITERION block reworked |
| `tests/kicad/symbol-names.test.ts` | the `Fix:BIG8` reason replaced |
| `tests/schgen/ir/nc-end-to-end.test.ts` | a comment on the `(at x y)` test saying what it establishes and what it does not |

Byte-scanned by counting: **0 stray control bytes** in all three, and `grep`
still finds `G278`.
