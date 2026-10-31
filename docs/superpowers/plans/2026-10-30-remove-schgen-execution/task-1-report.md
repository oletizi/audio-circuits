## Task 1 report: a sheet-to-model comparison that does not import schgen

**Status: DONE** - but everything below this line is the FIRST round, and there are TWO addenda at
the end. **Read them before acting on any figure here.** Round 2 sent back concerns 2 and 3 as
coverage gaps and they are closed (addendum 1); round 3's review finding - that the two tables I
carried over lost the tests that kept them from rotting - is closed too (addendum 2). The module
has six lists and not five, and the test counts in this half are superseded. Nothing is edited away, because what the first round
got wrong about those two comparisons is the argument for the instruction that fixed them.

First-round status, as recorded: DONE_WITH_CONCERNS. The module was written, tested, typechecked
clean, and its output measured equal to `roundTrip`'s on all five drafted Pultec pages before the
commit landed. The concerns were about two capabilities I judged the brief's fixed signature could
not express - **and I was wrong about one of them for a measurable reason, which the addendum
states** - and about one assumption Task 4 has to honour when it builds the pin-number map.

**Commit:** `2d96574` on `feature/schematics-tooling`, pushed. 694 insertions, two new files,
nothing modified and nothing deleted.

**Tests:** `bun test tests/kicad/sheet-agreement.test.ts` 18 pass / 0 fail / 21 expect calls.
`bun test tests/kicad/` 262 pass / 0 fail / 1887 expect calls across 19 files.
`bun run typecheck` clean (no output).

### What was built

`lib/kicad/sheet-agreement.ts` exports

```ts
compareSheetToModel(
  network: Network,
  designators: ReadonlyMap<string, string>,
  pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>,
  exported: ImportedNetlist,
): SheetAgreement
```

with `SheetAgreement = { componentIdentity: string[]; netMembership: string[]; pinIdentity:
string[]; values: string[]; footprints: string[] }`, exactly as the brief's interface section
states. Its imports are `../model/types.ts` (types only), `./netlist.ts` (types only) and
`./value-notation.ts`. Nothing from `lib/schgen/` or `tools/schgen/`.

The five message strings are transcribed from `round-trip.ts` character for character:

- `reference ${ref} in the schematic is unannotated`
- `reference ${ref} is in the schematic but not in the model`
- `reference ${ref} is in the model but not in the schematic`
- `${ref} pin numbers: model [${...}] vs schematic [${...}]`
- `${ref}: the schematic says "${a}" and the model says "${b}"` (values)
- `${ref}: the schematic says footprint "${a ?? "<none>"}" and the model says "${b}"`
- `the model connects [${set}] and the schematic does not`
- `the schematic connects [${set}] and the model does not`

`partitionOf`, `withoutOnce` and `sorted` are copied verbatim, including the multiset semantics and
the lexicographic (not numeric) pin sort, so `[1, 13, 2]` is the correct rendering and a test
asserts it as such.

### The equivalence measurement, done before committing

The brief defers the equivalence proof to Task 4, but shipping a module whose whole purpose is to
match an existing one without checking the match would have been a guess. A scratch script (written
to the repository root, run, then deleted - deliberately NOT committed, because the equivalence test
is Task 4's artifact) built each board the way `tests/circuits/drafted-sheet.ts` does
(`boardRefs` -> `declarationFor` -> `parityDesign` -> `designResolver` -> `buildCircuit` ->
`annotate`), ran `roundTrip` on it, then derived `designators` and `pinNumbers` from
`schematicParts(declared.network, declared.authoring, symbols)` and ran `compareSheetToModel` on the
same `ImportedNetlist`. Both sides' five lists were sorted and compared element by element.

| board | componentIdentity | netMembership | pinIdentity | values | footprints |
| --- | --- | --- | --- | --- | --- |
| pultec-hi-boost | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 20 = 20 |
| pultec-hi-cut | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 19 = 19 |
| pultec-low-boost | 0 = 0 | 0 = 0 | 1 = 1 | 8 = 8 | 17 = 17 |
| pultec-low-cut | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 18 = 18 |
| pultec-mid | 0 = 0 | 0 = 0 | 0 = 0 | 2 = 2 | 31 = 31 |

Every list agreed element for element, not merely in length. `ALL FIVE PAGES AGREE`.

**How `designators` and `pinNumbers` were derived for that run, because Task 4 needs the same
answer.** For each `SchematicPart`: `designators.set(part.component.id, refs.get(part.spec.label))`,
and `pinNumbers.set(part.component.id, Map(Object.entries(part.spec.pins).map(([number, conn]) =>
[conn.identity, number])))` - the IR's pin map INVERTED, keyed by `PinConnection.identity`, which is
the canonical pin name for a model pin and the symbol pin's own name for a pin the authoring file
declares not-connected. That inversion is what makes pultec-mid work; see the first concern below.
Task 4 cannot use that derivation (it imports schgen) but it has to produce the same map.

### Judgement calls copied rather than improved, as instructed

1. **The pin sort is lexicographic**, so a twelve-throw selector reads `model [1, 13, 2]`. Numeric
   would read better and would break equivalence.
2. **`netMembership` is computed last but reported second**, matching the field order the brief
   fixes and the construction order `round-trip.ts` uses.
3. **A not-connected pin is a one-member set, never an omission**, because `kicad-cli` gives every
   unconnected pin its own `unconnected-(REF-PadN)` net. The reasoning is reproduced in the code
   comment where it lives.
4. **The model's partition is built for every component including one the schematic has no symbol
   for**, while `pinIdentity`/`values`/`footprints` skip that component. That asymmetry is
   `round-trip.ts`'s and it is right: the missing designator is `componentIdentity`'s single
   finding, and dropping the part's nets too would turn one problem into a dozen stray-net reports.
5. **A part declaring no footprint is skipped silently.** `round-trip.ts` collected it in a sixth
   list; this interface has no sixth list. See concern 3.

### The one mechanism that is NOT a transcription

`round-trip.ts` reads `mechanicalPinsOf(part.libId)` from `lib/schgen/ir/mechanical-pins.ts` to add
a mount lug to the model's partition as a one-member set. Without it, `SW1.MP` is in the export's
partition and not the model's, and `netMembership` on four of the five pages would report a
schematic-only connection - the wrong finding, in the wrong list.

That table is therefore **duplicated into `lib/kicad/sheet-agreement.ts`**, keyed by KiCad lib id
with one entry (`"Switch:SW_Rotary_1x6_MP": ["MP"]`), read through `component.part?.symbol` rather
than through a resolved lib id. The duplication is deliberate and temporary: the schgen copy is
deleted later in this plan, and while both exist Task 4's equivalence test is what checks they
agree. The header says so, and carries forward the measured reason the table is a whitelist rather
than a geometric rule (a stroke-endpoint rule discriminates perfectly on the rotary and then flags
17 of 36 pins across eight other symbols, including both terminals of `Device:R`).

Reading `component.part?.symbol` instead of the generator's resolved lib id is exact on these five
pages (every off-board Pultec part declares `part.symbol` through `offBoardPart`, and
`symbolChoiceFor` refuses a model symbol and an override both), and it is strictly narrower in
general: a part whose symbol comes only from the by-kind rule gets no mechanical pins. None of the
rule-derived symbols in this repository (`Device:R`, `Device:C`, `Device:L`, the trim pot) has an
entry, so the narrowing changes nothing today.

### Tests, and the control beside each one

18 tests in `tests/kicad/sheet-agreement.test.ts`, every assertion a whole-list `toEqual`, never a
count:

| test | control that proves it can fail |
| --- | --- |
| all five lists empty on an agreeing sheet | the five perturbation tests below, one per list |
| reference in the schematic not in the model (the brief's test, verbatim) | the agreeing baseline |
| reference in the model not in the schematic | the agreeing baseline |
| unannotated `R?` reported as unannotated, not as a stranger | asserts the `is unannotated` wording, so the `includes("?")` branch cannot be skipped |
| one pin moved between two nets: all four messages, both directions | the agreeing baseline |
| an extra symbol pin in the export | the agreeing baseline |
| a changed value string | the agreeing baseline |
| a declared footprint the sheet disagrees with | a third test where the footprints agree and the list is empty |
| a declared footprint with no field on the sheet -> `"<none>"` | same |
| a mount lug is a one-member set, not a stray net | the same export against `Switch:SW_Rotary_1x12`, which is NOT in the table, DOES report `the schematic connects [SW1.MP] and the model does not` |
| a pin-number entry the model puts nothing on is a declared no-connect | the same sheet with that entry dropped reports both a `netMembership` and a `pinIdentity` disagreement |
| four refusals: no designator, no pin-number map, no pin number, two pins on one number | each asserts the refusal's own first sentence as a substring |

The mechanical-pin control is the one worth noting: it is the only way to show that table is
load-bearing without deleting it, and it fires.

### Concerns

**1. `pinNumbers` has to carry the declared-not-connected pins, and the brief's wording does not
say so.** The brief describes it as "canonical pin name to KiCad pin number". pultec-mid's selector
is drawn with `Switch:SW_Rotary_1x12`, and its unused twelfth detent is declared not-connected in
the schematic AUTHORING FILE (`ComponentOverride.ncPins`), not in the model. `round-trip.ts` sees
that pin because the IR carries it; a `Network` does not. So this module adopts the rule that **a
`pinNumbers` entry no model pin claims is a declared no-connect** - it counts towards the
component's pin numbering AND is a one-member set in the partition, which is exactly the IR's
treatment. That is what makes pultec-mid's `pinIdentity` empty and its `netMembership` empty.

Two consequences Task 4 must honour:
- the map for mid's `SW1` must contain an entry for pin `12` (keyed by whatever name - the
  derivation above uses the symbol pin's own name, via `PinConnection.identity`);
- the map for the four six-way selectors must **NOT** contain an entry for `MP`. The mechanical
  table accounts for that pin. If `MP` is put in the map instead, it becomes a declared no-connect,
  `SELECTOR_PIN_DISAGREEMENT` disappears and the equivalence test fails loudly rather than
  silently - which is the right failure, but it will cost a debugging round if nobody expects it.

**2. The symbol-name half of `pinIdentity` is not reproduced, and the equivalence measurement is no
evidence either way.** `round-trip.ts` also compared the netlist's `libsource` part name against the
resolved lib id, reporting `X is drawn with symbol "A" but the model says "B"` (and a separate
message when the netlist carries no symbol at all). Its stated purpose is real: "a swap to another
symbol with the same numbering changes no net". A `Network` plus a designator map plus a pin-number
map has no complete statement of the intended symbol - the generator's by-kind rule and its
authoring overrides supplied it for every part that does not declare `part.symbol` - so this module
does not make that comparison. **It is empty on all five pages, so the five-way agreement above does
not demonstrate it was carried over.** The header says this in capitals. What would restore it: a
model-id to lib-id map, the same shape `designators` has, supplied by the caller.

**3. `footprintsUndeclared` is gone as a list, and it was not empty.** `round-trip.ts` reported
parts the model declares no footprint for separately and said in its own header that an empty
`footprints` over such a circuit "would otherwise read as agreement". Measured on the five pages:
**7, 2, 2, 2 and 8 components** respectively declare no footprint and are therefore skipped
silently here. `tests/circuits/drafted-sheet.ts` never asserted on that list, so nothing regresses
in the suite - but the information is lost from the interface, and the five-list shape the brief
fixes has nowhere to put it. If that matters, it is a sixth field or a separate function.

**4. A missing designator throws where `round-trip.ts` pushed a problem string.** Its `designators()`
helper pushed `part ${label} has no reference designator in the model's reference lock` into
`componentIdentity` and carried on. The task's global constraint says throw, so this throws naming
the component, what is missing and why it is not defaulted. On the five pages every component has an
entry, so the two agree; a circuit with a hole in its designator map would get a refusal here and a
problem string there.

**5. `values` is re-derived through `valueFor(component)`, not through the resolved lib id.**
`round-trip.ts` compared against `valueFor({...component, part: {...component.part, symbol:
resolvedLibId}})`. With no lib id in hand, this calls `valueFor(component)` directly. The two agree
whenever the model declares `part.symbol`, which it does for every Pultec part whose value falls
through to the symbol name (the two selectors, the SPDT, both junction headers), and whenever the
value comes from a parameter or an `mpn`. The case that differs is a component with no numeric
parameter, no `mpn` AND no declared symbol: `round-trip.ts` would compare against the rule-resolved
symbol's part name, and this **throws** out of `valueFor` ("has neither an mpn nor a symbol"). That
is a loud refusal rather than a wrong answer, and no board in hand reaches it.

**6. `pinNumbers` is keyed by canonical pin name alone, so it cannot address a multi-unit part.** A
dual op-amp's unit A and unit B both have `in+`. This module detects the collision and **throws**
(`pin number "N" is claimed by both unit "A" pin "in+" and unit "B" pin "in+"`) rather than letting
one unit's net overwrite the other's. Every Pultec component is single-unit, so it does not arise
on the five pages; `circuits/opamp-buffer.ts` and `circuits/optical-compressor/` would hit it. The
brief fixes the signature, so this is recorded rather than fixed: the type wants to be
`ReadonlyMap<string, ReadonlyMap<string, ReadonlyMap<string, string>>>` keyed by unit name, or the
key wants to be `unit/pin`.

### Deviations from the brief's steps

Steps 2-5 prescribe writing the one componentIdentity test, watching it fail with
`Cannot find module`, then implementing. The module was written first and the brief's test is in the
file verbatim; the failure-then-pass sequence on a missing module was not performed, so the only
honest claim is that every test in the file passes now and that each one has a control that makes it
fail on a perturbation. The controls are where the value of that step actually lies and they are
all present and all demonstrated.

---

## Addendum: concerns 2 and 3 closed

**Status: DONE.** Both coverage gaps are closed. **Commit `02b921c`** on
`feature/schematics-tooling`, pushed; 241 insertions, 34 deletions, the same two files.

**Tests:** `bun test tests/kicad/sheet-agreement.test.ts` 24 pass / 0 fail / 32 expect calls (was
18/21). `bun test tests/kicad/` 268 pass / 0 fail / 1898 expect calls across 19 files.
`bun run typecheck` clean. `lib/kicad/sheet-agreement.ts` is 455 lines, the test file 446.

### Concern 2: the symbol-name half of `pinIdentity` is restored

**I did not implement the prescribed mechanism, and the deviation is the point of this section.**
The instruction was to read `component.part?.symbol` and throw where it is absent. I measured what
that would do before writing it, because `CLAUDE.md` holds that the criterion binds and the
mechanism is advice from someone who had not yet tried it. **The throw would fire on the majority
of components of every one of the five pages:**

| page | parts | `part.symbol` ABSENT on |
| --- | --- | --- |
| pultec-hi-boost | 27 | **18** |
| pultec-hi-cut | 21 | **17** |
| pultec-low-boost | 19 | **15** |
| pultec-low-cut | 20 | **16** |
| pultec-mid | 39 | **29** |

Every one is an ordinary resistor or capacitor (`C14`, `R3`, `C2a2`, `SI_HI_CUT_R1`, every
`C_MID_*Hz_*`). `roundTrip` never needed them to declare a symbol because `symbolChoiceFor` fell
through to `symbolForKind` in `lib/schgen/rules/symbols.ts` - a **four-entry reviewed whitelist**,
circuit-independent, with a recorded reason for every kind left out. So "the model does not declare
a symbol" was never the gap; the gap was that the whitelist lives in the module being deleted.

**What I implemented instead**, which is `symbolChoiceFor`'s own total function minus the authoring
override that disappears with the generator anyway:

1. `component.part?.symbol` where the model declares one - a declaration outranks a rule;
2. else `SYMBOL_BY_KIND` - the four entries carried into `lib/kicad/sheet-agreement.ts`
   (`resistor: Device:R`, `capacitor: Device:C`, `photoresistor: Device:R_Photo`, `diode: Device:D`),
   each with the reason the kind alone settles it;
3. else **throw** naming the component and its kind, saying that a symbol choice for that kind is a
   claim about which PART is fitted, and that a skip would make this comparison vacuous for exactly
   the parts whose symbol is a real decision.

There is no fallback and no skip in that chain - step 3 is a refusal, and it is the same refusal
`noSymbolRefusal` makes. The whitelist is a duplicate for the length of this plan, exactly like
`MECHANICAL_PINS`, and its header says so.

**The evidence that the composition reproduces the old expectation is not an argument, it is a
measurement:** across all five pages, the number of components where `symbolEntry(part.symbol)`
disagrees with `symbolEntry(resolved libId)` is **0**. So where the model declares a symbol it
always equals what the generator resolved, and where it does not the whitelist supplies the same
string the rule did.

Messages are `round-trip.ts`'s, verbatim, both branches:
- `${ref} is drawn with symbol "${drawn}" but the model says "${want}"`
- `${ref} has no symbol in the schematic's netlist, so nothing fixes its pin numbering; the model says "${want}"`

and the symbol check is pushed **before** the pin-numbers check, as it was there.

**Four new tests, three of them controls:**

| test | why it is a control |
| --- | --- |
| `R2` drawn with `R_Small` where the model says `R` | `Device:R` and `Device:R_Small` both number their terminals 1 and 2, so `netMembership` and the pin-count check are both asserted empty in the same test - this is the only comparison that can see it |
| one `comp` with no `libsource` at all | exercises the other branch, which the agreeing fixture would otherwise never reach; the fixtures now carry `libsource` precisely so this is a distinct case rather than the default |
| a capacitor declaring `Device:C_Polarized` against a sheet drawn with `C_Polarized` | the whitelist would have said `C`, so the empty list is the declaration winning and not the comparison being absent - and the test above proves it can fire |
| an inductor with no `part.symbol` | asserts the refusal's own words; `inductor` is deliberately outside the whitelist because the symbol depends on the core |

### Concern 3: `footprintsUndeclared` is restored as a list

`SheetAgreement` now has six fields. `footprintsUndeclared: string[]`, sorted, populated in the
same place and the same way `round-trip.ts` populated it - inside the per-component loop, after the
`drawn === undefined` skip, with a `continue` so a part in that state is not also compared.

**One deliberate difference: it names components by MODEL ID where the old list named them by IR
label.** This module has no labels. The id is the right vocabulary anyway - this is the one finding
whose fix is in the model, on `part.footprint`, which a reader reaches by id - and it is also what
keeps the two lists comparable, because **id and IR label are the same string for every
footprint-less part of all five pages**. That is measured, not assumed: `RV_HI_BOOST`, `RV_HI_Q`,
`L_HI_BOOST_100MH`, `L_HI_BOOST_200MH`, `L_HI_BOOST_300MH`, `L_HI_BOOST_600MH`, `SW_HI_BOOST` on
hi-boost; `RV_HI_CUT`/`SW_HI_CUT`, `RV_LO_BOOST`/`SW_LO_BOOST`, `RV_LO_CUT`/`SW_LO_CUT` on the
other three; and the five `L_MID_*` inductors plus `RV_MID`, `SW_MID`, `SW_MID_MODE` on mid. Every
one is a panel control, a selector or an inductor - the off-board parts, which `offBoardPart`
gives a symbol and no footprint.

**Three new or strengthened tests:**

| test | why it is a control |
| --- | --- |
| the all-agreeing baseline now asserts `footprintsUndeclared: ["r_in", "r_out"]` | the baseline's five empty lists were the exact "reads as agreement" case the old header warned about, and now they say so out loud |
| a circuit declaring every footprint reports `[]` | the perturbation in reverse: the list is empty only when every part declares one |
| the agreeing-footprint test asserts `footprintsUndeclared: ["r_out"]` beside `footprints: []` | the sheet carries an SMD field for `R2` that was compared against nothing; without this line the empty `footprints` beside it is unqualified |
| a component the schematic has no symbol for is in NEITHER footprint list | guards the skip, so one missing designator cannot be reported twice under two names |

### Re-measured equivalence, all six lists, all five pages

Same harness as before (scratch script, run, deleted), extended to the sixth list.

| page | componentIdentity | netMembership | pinIdentity | values | footprints | footprintsUndeclared |
| --- | --- | --- | --- | --- | --- | --- |
| pultec-hi-boost | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 20 = 20 | 7 = 7 |
| pultec-hi-cut | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 19 = 19 | 2 = 2 |
| pultec-low-boost | 0 = 0 | 0 = 0 | 1 = 1 | 8 = 8 | 17 = 17 | 2 = 2 |
| pultec-low-cut | 0 = 0 | 0 = 0 | 1 = 1 | 1 = 1 | 18 = 18 | 2 = 2 |
| pultec-mid | 0 = 0 | 0 = 0 | 0 = 0 | 2 = 2 | 31 = 31 | 8 = 8 |

`ALL FIVE PAGES AGREE ON ALL SIX LISTS` - element for element, sorted, not merely in length.

**Two things worth reading off that table rather than skipping past.** First, `pinIdentity` still
carries exactly one entry on the four six-way boards and none on mid, which means the restored
symbol comparison added **no** entries - it could only have done so by disagreeing, and the zero
disagreements measured above are why it did not. Had the whitelist been wrong about `Device:R` or
`Device:C` it would have fired on 15-29 components per page. Second, `footprintsUndeclared` matched
on all five, which is the id-equals-label claim above verified rather than asserted.

### One consequence for Task 4

`SheetAgreement` now has **six** fields, not the five the brief's interface section specifies. The
equivalence test should compare all six - `footprintsUndeclared` is the only one whose membership
is a bare identifier rather than a sentence, and it is the one whose vocabulary changed, so it is
the most worth asserting rather than the least.

---

## Addendum 2: round-2 finding closed - the carried-over tables now have the tests that keep them honest

**Status: DONE.** **Commit `2ae9f20`** on `feature/schematics-tooling`, pushed. 196 insertions, 14
deletions, three files: `lib/kicad/sheet-agreement.ts`, the new
`tests/kicad/sheet-agreement-tables.test.ts`, and `tests/kicad/symbol-library-disk.ts`.

**Tests:** `bun test tests/kicad/` **273 pass / 0 fail / 1910 expect calls across 20 files** (was
268 across 19). `bun run typecheck` clean. The two schgen originals are untouched and still green
(20 pass / 0 fail / 52 expect calls) - nothing was moved out from under them.

### The finding, restated as it was

I carried `SYMBOL_BY_KIND` and `MECHANICAL_PINS` out of `lib/schgen/` and **left their keepers
behind.** `tests/schgen/rules/symbols.test.ts:37` asserted the whitelist is exactly four kinds and
resolved every lib id in it; `tests/schgen/ir/mechanical-pins.test.ts:140` resolved every key, with
`:102`'s `withoutMp()` resolver as its staleness control. Both die in Task 9. My copies had nothing,
three of the four whitelist entries were exercised by no test at all, and the header's *"was
resolved against the libraries on disk where it was first written"* was a past-tense measurement in
prose - the exact shape `CLAUDE.md` forbids.

### What was built

**`tests/kicad/sheet-agreement-tables.test.ts`**, five arms, reading the installed library through
`tests/kicad/symbol-library-disk.ts` - **not** `lib/schgen/render/stock-symbols.ts`. That helper
already carried the refuse-don't-skip wording and cites
`tests/circuits/kicad-round-trip.ts` for it, so the refusal is reused rather than re-worded:

> `symbol library for "X" is not at <path>. Install KiCad or set KICAD_SYMBOLS. This test does not
> skip: it is the only check that a symbol this repository names in a part spec is a symbol some
> KiCad can resolve, and this repository has three times shipped a KiCad name that does not exist.`

| arm | what it asserts |
| --- | --- |
| 1 | `ALL_KINDS.length` is 11 (*"a kind list nothing iterates is a check that cannot fail"*, the original's words), the whitelist is exactly `["resistor", "capacitor", "photoresistor", "diode"]`, and **all four lib ids resolve with their pin numbers printed into the expectation** - `Device:R (pins 1, 2)`, `Device:C (pins 1, 2)`, `Device:R_Photo (pins 1, 2)`, `Device:D (pins 1, 2)`. The pins are in the expectation precisely so every entry is exercised rather than counted. |
| 2 | **generic over `MECHANICAL_PINS`**: the table is non-empty, every KEY resolves (the throw IS the assertion - the typo'd-symbol hole nothing else closes, because a table exempting a pin of a symbol nobody has simply never fires), every pin it names is a pin that symbol really has, and a table claiming ALL of a symbol's pins is refused. |
| 3 | the table's exact contents - `["Switch:SW_Rotary_1x6_MP"] -> ["MP"]`. |
| 4 | **the staleness control**: a table entry the drawn sheet has no pin for is REPORTED. |
| 5 | **the control for arm 2's control**: `installedSymbolPinNumbers("Device:R_NotAKicadSymbol")` refuses, asserted on two phrases of its message. |

**Arm 4 is the one that needed thought, and it is a translation rather than a copy.** The schgen
original hid `MP` from the resolver and asserted `pinsDeclared` named the stale entry. This module
has no validator, so the question is what its OWN output does with a stale entry: the table puts
`SW1.MP` into the model's partition, the sheet has no such node, and the disagreement surfaces as
`the model connects [SW1.MP] and the schematic does not`. **The assertion is on that message and
not on the mere presence of a problem**, because a neutered `mechanicalPinsOf` would leave the list
empty - which is exactly what mutation 4 below shows.

**`tests/kicad/symbol-library-disk.ts`** gains `installedSymbolPinNumbers(libId)`: flattens any
`(extends)` through `flattenedSymbol`, reads pins through `symbolPins`, and **refuses an absent
symbol rather than returning an empty list**, with the reason stated - an empty list would make
every claim about that symbol's pins pass for the wrong reason. Its library parse is now cached
once in `LIBRARIES` and the name set derived from it, where before the file was parsed and the
names rebuilt separately; `installedSymbolNames`' contract is unchanged and its callers
(`symbol-names.test.ts`) are green.

Both tables are now **exported** from `lib/kicad/sheet-agreement.ts`. A table nothing can read is
a table nothing can check, and the headers say that is why.

### The header claim now points at the thing that re-runs it

The past-tense sentence is gone. In its place, on `SYMBOL_BY_KIND`:

> **EVERY LIB ID HERE IS RESOLVED AGAINST THE INSTALLED LIBRARY ON EVERY RUN, BY
> `tests/kicad/sheet-agreement-tables.test.ts`** - which is the only form that claim may take.
> […] That test also asserts the table is exactly these four kinds, so a fifth cannot arrive
> unexamined, and it refuses rather than skips when no library is installed.

and on `MECHANICAL_PINS`, that what keeps it from rotting *"is
`tests/kicad/sheet-agreement-tables.test.ts`, NOT THIS COMMENT"*, generic over the table, with the
reason the schgen original's review gave for that: a hard-coded first version would have let the
tenth `_MP` symbol be added with no check at all.

### Verified by mutation, four ways, every one reverted

Not asserted - run. Each mutation was applied to `lib/kicad/sheet-agreement.ts`, the suite run, and
the mutation reverted.

| mutation | result |
| --- | --- |
| key typo'd to `Switch:SW_Rotary_1x6_MPX` | **3 fail** - arm 2 refuses naming the path and the typo, arms 3 and 4 fall with it |
| pin changed to `["NOPE"]` | **3 fail** - `Switch:SW_Rotary_1x6_MP has no pin NOPE` |
| `photoresistor` lib id to `Device:R_PhotoX` | **1 fail** - arm 1, refusing on `Device.kicad_sym` |
| `mechanicalPinsOf` neutered to return `[]` | **2 fail** - arm 4 AND the mount-lug test in the main file, together |

The third is the one worth noting: before this round, that mutation would have been caught by
**nothing**, since `photoresistor` was one of the three entries no test touched.

### Equivalence re-confirmed after the edits

Because the module was edited, the five-page comparison was re-run rather than assumed. All six
lists, all five pages, element for element, sorted:

| page | counts (identity / nets / pins / values / footprints / undeclared) |
| --- | --- |
| pultec-hi-boost | 0 / 0 / 1 / 1 / 20 / 7 |
| pultec-hi-cut | 0 / 0 / 1 / 1 / 19 / 2 |
| pultec-low-boost | 0 / 0 / 1 / 8 / 17 / 2 |
| pultec-low-cut | 0 / 0 / 1 / 1 / 18 / 2 |
| pultec-mid | 0 / 0 / 0 / 2 / 31 / 8 |

`ALL FIVE PAGES AGREE ON ALL SIX LISTS`.

### Not acted on, as instructed

The sorted-comparison gap and the pin-map-authority consequence are Task 4's dispatch; the five
Minors are deferred in the ledger. Nothing in this round touches either.
