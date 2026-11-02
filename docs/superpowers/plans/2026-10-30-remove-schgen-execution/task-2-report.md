### Task 2 report: Move the switch pin geometry to the parts file

**Status: DONE**

**Commit:** `c685da0` on `feature/schematics-tooling` (pushed to origin).

**Test summary:** `bun test` before: 4087 pass / 8 fail (4095 total). After:
4090 pass / 8 fail (4098 total) - the same 8 failures, all
`tests/schgen/port-fidelity.test.ts` on unset `SCHGEN_SOURCE`. Net +3 tests
(5 new in `tests/circuits/pultec-switch-geometry.test.ts`, -2 moved out of
`tests/schgen/nc-pins.test.ts`). `bun run typecheck` clean. `make check`
fails on exactly four boards - `pt2399-core`, `transistor-preamp-lab`,
`-loop`, `-staged` - confirmed by name in the log. The five drafted sheet
digests are byte-identical before and after.

**What moved:**
- `POLE_PIN` and `THROW_PINS`, with their doc comments kept verbatim, from
  `circuits/pultec/schematic/section-board.ts` to
  `circuits/pultec/physical/parts.ts`, placed immediately after
  `rotarySymbolFor` (beside `ROTARY_SYMBOLS_BY_POSITIONS`).
- `section-board.ts` now imports both from `../physical/parts.ts` and no
  longer declares them. Its three runtime refusal messages in
  `switchOverride` that named the old location ("POLE_PIN in
  circuits/pultec/schematic/section-board.ts holds..." etc.) were repointed
  at `circuits/pultec/physical/parts.ts`, since those are refusals a builder
  reads, not the provenance comments the brief said to keep verbatim. The
  module's own header comment (listing what the file declares) was adjusted
  similarly, one line, to say it uses rather than declares `THROW_PINS`.
- No other file imported `POLE_PIN`/`THROW_PINS` from `section-board.ts`;
  the five `circuits/pultec/schematic/{hi-boost,hi-cut,low-boost,low-cut,mid}.ts`
  files only import `sectionAuthoring`, untouched.

**The test split in `tests/schgen/nc-pins.test.ts`** (ruling 2):
- MOVED to `tests/circuits/pultec-switch-geometry.test.ts`: the two arms
  under "the selector symbols, read off the INSTALLED Switch.kicad_sym" that
  the brief's Step 1 gave verbatim equivalents for - "the pole is on the
  opposite side at angle 0, which is why POLE_PIN is not pin 1" and "THROW_PINS
  plus POLE_PIN plus MECHANICAL_PINS is EXACTLY each selector symbol's pin
  set". The new file reads the installed library through
  `tests/kicad/symbol-library-disk.ts`'s `installedSymbolPinNumbers` (per
  ruling 1), not through `lib/schgen/render/stock-symbols.ts` or
  `lib/schgen/ir/mechanical-pins.ts`.
- LEFT IN `nc-pins.test.ts`, unmoved: the other two arms of that same
  describe block - "SW_Rotary_1x12 has thirteen pins... every one passive and
  named with its own number" and "pin 12 is a THROW and nothing like a
  mounting lug" - because both need a pin's `(at x y angle)` and `type`,
  which `installedSymbolPinNumbers` does not expose (it answers only "which
  pin numbers does this symbol have"). They still depend on
  `lib/schgen/render/stock-symbols.ts`'s `symbolLibraries` and
  `lib/schgen/ir/mechanical-pins.ts`'s `mechanicalPinsOf`, both scheduled for
  deletion later; I left a comment in place of the two moved tests saying
  where they went and why the remaining two didn't. **Also left untouched,
  per the brief**: both `describe` blocks that test the `pinsDeclared`
  validator itself (`"ncPins declares specific pins"`,
  `"ncPins refuses rather than guessing"`) and the `"pultec-mid, the board
  that produced no drawing"` block.
- The `import { POLE_PIN, THROW_PINS } from ".../section-board.ts"` line in
  `nc-pins.test.ts` was deleted outright (not repointed) - after the two
  tests moved, neither constant is referenced anywhere else in that file.

**Positive controls added** (per the global constraint), in the new file:
one proving `installedSymbolPinNumbers` throws rather than returning an
empty list for an unresolvable lib id (so neither check above could pass
vacuously on a typo'd key); one proving the exact-pin-set check fails when
fed a `THROW_PINS` copy with one throw dropped (verified live - I temporarily
set `POLE_PIN["Switch:SW_Rotary_1x12"]` to `"1"` in the real file, confirmed
the test failed with "a pin is accounted for twice: Expected 13, Received
12", then restored the file byte-for-byte before committing); one proving
pin-containment rejects a pin number that doesn't exist. The two "assert
exact values" tests from the brief also got an explicit non-empty-table
guard (`expect(entries.length).toBeGreaterThan(0)`) so an accidentally
emptied table can't make the loop vacuous.

**Concerns:**
- The two geometry-and-mounting-lug arms left behind in `nc-pins.test.ts`
  (pin type/name-equals-number, and the angle/mounting-lug distinction) have
  no permanent replacement yet. When a later task deletes `lib/schgen/` and
  `nc-pins.test.ts` with it, that specific coverage (pin TYPE is `passive`,
  pin NAME equals its own number, pin 12's angle/side matches the wired
  throws rather than looking like a mount lug) is lost unless something
  picks it up first. `installedSymbolPinNumbers` as it stands can't express
  it, since it exposes only pin numbers. Flagging this now rather than
  silently letting it disappear in a later task; whether it's worth building
  a richer disk-backed helper (pin type + angle, not just number) is a call
  for whoever owns Task 9 / the generator deletion.
- I did not attempt to use `lib/kicad/sheet-agreement.ts`'s `MECHANICAL_PINS`
  table as a generic substitute for the brief's `libId.endsWith("_MP")`
  heuristic in the mount-lug clause; I used the brief's own condition
  verbatim since it was given as the exact test to write and it correctly
  distinguishes the two current entries. It is a naming-convention heuristic
  rather than a table lookup, which is slightly less robust in principle
  than a maintained table, but matches the task's explicit instructions.

---

### Round 2: closing the hole the first round's "Concerns" section flagged

**Status: DONE**

**Commit:** `60a46dd` on `feature/schematics-tooling` (pushed to origin, on
top of `c685da0` above).

**Root cause identified by the coordinator:** `installedSymbolPinNumbers`
exposed only a pin's number, so any check needing a pin's name, type,
position or angle couldn't be ported and was left behind in a file this plan
schedules for deletion. That had cost two sets of coverage, not one: the two
arms this report's Concerns section flagged, and - found by the coordinator,
not by me - the original `tests/schgen/ir/mechanical-pins.test.ts` arm 1's
geometric proof that each `MECHANICAL_PINS` entry has NO stroke endpoint
reaching it (as opposed to merely existing on the symbol). Instructed to fix
the root cause this round rather than deferring it again.

**What changed, all in commit `60a46dd`:**

1. **Widened `lib/kicad/symbol-library.ts`, not a second parser.**
   `SymbolPin` gained `name`, `type` and `length`, read by the SAME per-pin
   loop `symbolPins` already walked - two more atoms/children already
   present on the `(pin ...)` node being visited, not new parsing machinery.
   Added `symbolStrokeSegments(block)` (straight-stroke endpoints from
   rectangle edges, polyline/bezier legs, and a circle's bounding-box edges -
   deliberately NOT arcs or text, matching exactly what
   `lib/schgen/render/lib-graphics.ts`'s `drawn()` puts into ITS `segments`
   list, which is the only thing the ported check needs), `pinBodyEnd(pin)`
   and `strokeEndpointsAt(block, pin)` - a direct port of `endpointsAt` from
   `tests/schgen/ir/mechanical-pins.test.ts`, same trig-to-exact-direction
   trick. Pin-walking and the new graphics-walking share one factored,
   validated unit-scoping helper, `supportedUnitSymbols`, so a pin walk and a
   graphics walk of the same block can never disagree about which unit
   sub-symbols are in scope - that agreement is what makes comparing a pin's
   point against a stroke's endpoint meaningful at all. `symbolStrokeSegments`
   is scoped to stroke ENDPOINTS only - no de-duplication, no bounding-box
   union, no µm snapping, no arc/text handling - because reproducing more of
   `lib-graphics.ts`'s scope (built for the generator's own placement/text-
   avoidance needs) would have been writing a second symbol parser for a
   purpose nothing else in this repository has.
2. **Widened `tests/kicad/symbol-library-disk.ts`**: added
   `installedSymbolPins` (full shape) and `installedSymbolStrokeEndpoints
   (libId, pinNumber)`. Kept `installedSymbolPinNumbers` working for its
   existing callers by having it delegate to `installedSymbolPins` - neither
   `sheet-agreement-tables.test.ts` nor `pultec-switch-geometry.test.ts`
   needed updating for that function.
3. **Ported the two arms the first round left in `nc-pins.test.ts`** into
   `tests/circuits/pultec-switch-geometry.test.ts`: the pin count/type/
   name-equals-number check, and "pin 12 is a THROW and nothing like a
   mounting lug" (now ALSO asserting `installedSymbolStrokeEndpoints` gives
   it exactly 1, same as the wired throws - a strengthening the original
   arm couldn't make, since schgen's `mechanicalPinsOf` only checked table
   membership, never geometry, for this particular assertion). Removed the
   now-empty describe block and its now-dead imports (`mechanicalPinsOf`,
   `LibSymbol`) from `nc-pins.test.ts`; `pultecNetwork`/`pultecSymbols`/
   `ELEVEN_THROW` stay there because the `"pultec-mid"` describe block still
   needs them.
4. **Ported Task 1's dropped geometric check** into
   `tests/kicad/sheet-agreement-tables.test.ts`, without modifying
   `lib/kicad/sheet-agreement.ts` itself: added the stroke-endpoint-zero
   assertion (arm 1) into the existing generic "every mechanical-table
   entry..." test, and a new test porting arm 1b's contrast (all seven
   electrical pins of `Switch:SW_Rotary_1x6_MP` are reached by exactly one
   stroke endpoint). Arm 1b stayed pinned to that one symbol rather than
   generalized across the table, matching the original's own reasoning:
   `lib/kicad/sheet-agreement.ts`'s header already rejects "infer mechanical
   from stroke geometry" as a GENERAL rule (it misclassifies both terminals
   of `Device:R` and six of eight TL072 pins), so asserting the one-endpoint
   contrast for every future entry's un-listed pins would reintroduce
   exactly that rejected generalization.
5. Fixed `tests/kicad/symbol-library.test.ts`'s one pre-existing hardcoded
   pin-shape assertion to list `type`/`name`/`length`, forced by the
   `SymbolPin` type change; its fixture text already had `(name "~")` and
   `(length 1.27)`, so no fixture data changed.

**Positive controls, each live-verified by temporarily sabotaging the
production function and watching the right test fail, then restoring the
file and diffing it clean against a backup copy:**
- `lib/kicad/symbol-library.ts`'s `strokeEndpointsAt` forced to always
  return `1`: the new "CONTROL: the mount lug MP on SW_Rotary_1x6_MP has
  zero stroke endpoints..." test in `pultec-switch-geometry.test.ts` failed
  ("Expected: 0, Received: 1"), as did the main "pin 12 is nothing like a
  mounting lug" test's own stroke-endpoint assertions.
- The same function forced to always return `0`: the ported arm-1b test in
  `sheet-agreement-tables.test.ts` ("all seven ELECTRICAL pins are reached
  by exactly one stroke endpoint") failed on pin 1 ("Expected: 1, Received:
  0"), and that file's own new CONTROL test ("MP's own stroke-endpoint
  count is not what an electrical pin's is") failed too (`not.toBe` saw
  `0` vs `0`).
- A synthetic inline fixture (a `power_in` pin named `"VCC"`, built as a
  literal symbol block string rather than pulled from the installed
  library, since no real pin in this repository's symbols is a
  counter-example) proves the passive/name-equals-number assertions in the
  ported pin-shape test can fail on data that isn't the real SW_Rotary.

**The epsilon, as asked - stated plainly for a reader a year from now:**
`strokeEndpointsAt` compares a pin's computed body-side connection point
against every stroke segment's endpoints using `COINCIDENT_EPSILON = 1e-6`
(absolute, per axis), not exact equality. This is needed because this path
reads coordinates as plain mm floats parsed straight off the symbol's text,
rather than through schgen's canonical whole-µm integer grid, where two
independently-derived coordinates for the same point are bit-identical by
construction. Here the two sides are independently evaluated expressions
over the same decimal literals (one via `pin.x + pin.length *
round(cos(angle))`; the other via a direct `Number()` parse of a different
literal elsewhere in the same file), so they can differ by ordinary
IEEE-754 rounding noise at the ~1e-15 scale - confirmed directly on
`SW_Rotary_1x12` pin 12, where `-5.08` computed the two different ways
disagreed at the 15th decimal place before the epsilon was added (this also
forced one `toBe` in the ported pitch-step assertion in
`pultec-switch-geometry.test.ts` to become `toBeCloseTo(..., 10)` for the
same reason). What would make the 1e-6mm tolerance WRONG - admit a pin it
should reject - is one of two things: two genuinely distinct connection
points less than 0.000001mm apart, which KiCad's own 0.01mm coordinate
grain makes four orders of magnitude unlikely to ever occur in a real
drawing; or a pin whose own declared `length` or `angle` is itself wrong by
a similarly tiny amount - a data error in the symbol's own geometry, which
a coincidence test cannot catch and was never meant to, since it tests
whether two points coincide, not whether either point's declared inputs are
correct.

**The Bun crash, recorded regardless of the clean retry:** the first full
`bun test` rerun this round (`panic(main thread): Segmentation fault at
address 0x204`, Bun 1.3.8 on macOS 15.7.4/Apple Silicon) crashed 160.4s in,
with `tests/schgen/direction-seed.test.ts` the last file printed before the
crash; RSS peaked at 1.58GB on a 17.18GB machine, so not an OOM. "Bun has
crashed. This indicates a bug in Bun, not your code" was Bun's own message.
A solo retry of the identical command, with nothing else running
concurrently, passed cleanly and got past `direction-seed.test.ts` without
incident: `4094 pass / 8 fail` across `4102` tests in `272.41s`, the same 8
failures by name (`tests/schgen/port-fidelity.test.ts` on unset
`SCHGEN_SOURCE`) as every earlier baseline in this task. **The crash
happened while a concurrent `make check` (and, separately, another `bun
test` the coordinator had independently launched) were running in the same
sandbox at the same time; the clean run happened solo. That is one
data point under contention and one data point without it - suggestive,
not proof, of a contention-triggered Bun bug rather than a deterministic
fault in `direction-seed.test.ts` or in this round's changes.** Recorded as
a toolchain observation for whoever next sees a Bun segfault on a large
suite run: check whether something else was running at the same time before
spending time on the test file the crash happened to land in.

**Final gate numbers for this round:**
- `bun test`: `4094 pass / 8 fail` (4102 total), the same 8
  `tests/schgen/port-fidelity.test.ts` failures by name as baseline, up from
  the 4090/8 at the end of round 1 by exactly the 4 arms ported this round
  (2 into `pultec-switch-geometry.test.ts`, 2 into
  `sheet-agreement-tables.test.ts` - net pass-count change; the exact file
  breakdown also removed `nc-pins.test.ts`'s now-empty describe block).
- `make check`: fails on exactly four boards by name - `pt2399-core`,
  `transistor-preamp-lab`, `transistor-preamp-loop`, `transistor-preamp-staged`
  - confirmed from the log (five `Error 1` lines: one per failing board plus
  the outer `make`), no other board listed as FAIL.
- `bun run typecheck`: clean, re-confirmed immediately before this commit.
- Five drafted sheet sha256s: unchanged (confirmed by the coordinator this
  round; reconfirmed directly by me earlier in round 1 after the first set
  of changes).

**Concerns carried forward:** none outstanding from round 1 - both arms
that report flagged as left behind are now ported, and the dropped
mechanical-pins geometric check the coordinator found is ported too. The
Bun crash above is recorded as an open toolchain observation, not a defect
in this round's code (the clean solo retry is the evidence for that, with
the caveat stated above about what one-plus-one data points can and can't
establish).

---

### Round 3: a dropped test that round 1's own commit message called a move

**Status: DONE. This is the last round on Task 2.**

**Commit:** `a8646cb` on `feature/schematics-tooling` (on top of `60a46dd`
and `c685da0`), pushed to origin.

**What was wrong, found by the coordinator diffing against the original
rather than reading the round-1 summary.** The original `nc-pins.test.ts`
describe block had four arms. Round 1's commit `c685da0` and its own
in-file comment both said two of them moved to
`pultec-switch-geometry.test.ts`. Only one genuinely did - the exact-pin-set
test. The other, "the pole is on the opposite side at angle 0, which is why
POLE_PIN is not pin 1," asserted real geometry:

```ts
expect(pole?.angle).toBe(0)
for (const t of throws) {
  expect(t.angle).toBe(180)
  expect(Math.sign(t.x)).toBe(-Math.sign(pole?.x ?? 0))
}
```

What took its place, described as the same test moved, was only the brief's
Step-1 test: bare pin-number containment (`numbers.toContain(pole)`), no
angle, no side. **Why that matters rather than being a cosmetic weakening:**
the surviving exact-pin-set test compares the UNION `THROW_PINS ∪ POLE_PIN ∪
{mount lug}` against the symbol's pin set. If `POLE_PIN` and `THROW_PINS`
were corrupted by a pole/throw label swap - the real pole recorded as a
throw, a real throw recorded as the pole - the union is identical either
way, so that test and the bare-containment test both still pass. The
deleted angle/side assertion was the only one that could catch a pole/throw
swap, which is a real wiring error in a real rotary switch, not a
hypothetical one.

**The fix, in `tests/circuits/pultec-switch-geometry.test.ts`:**
- Added `assertPoleOppositeEveryThrow(libId, poleNumber, throwNumbers)`,
  carrying the original's actual assertions forward using
  `installedSymbolPins` (the Round 2 widening is what made `angle` and `x`
  available to this file at all): the recorded pole is at angle 0, and
  every one of its recorded throws is at angle 180 on the opposite side
  (`Math.sign`).
- **Generalised over the whole `POLE_PIN` table, rather than pinned to
  `Switch:SW_Rotary_1x12` the way the original was** (the original had only
  one table to check against at the time it was written, and ran against
  that one symbol specifically). This is a deliberate strengthening, not
  mere broadening, and it turns on one specific choice that is worth
  recording in detail because getting it wrong would have produced a test
  that fails on correct data:
  **`throwNumbers` is taken from `THROW_PINS[libId]`, not from "every pin
  of the symbol except the pole."** `Switch:SW_Rotary_1x6_MP` has an eighth
  pin, `MP`, the panel mounting lug - and `MP` is drawn on the SAME side as
  the pole, at angle 0, not opposite it at angle 180 (confirmed directly
  off the installed `Switch.kicad_sym`: pole pin 7 is at `(-7.62, 0, 0)`;
  `MP` is at `(-7.62, -5.08, 0)` - same `x`, same angle, different `y`).
  Had the check instead asserted "every pin but the pole is a throw at
  angle 180 opposite the pole," it would have demanded that of `MP` too,
  and failed on a symbol this repository's own data has never been wrong
  about. Scoping to `THROW_PINS[libId]` - the declaration that already
  claims to name exactly the throws - is what makes the generalisation
  correct for `SW_Rotary_1x6_MP` as well as `SW_Rotary_1x12`, rather than
  merely broader and accidentally wrong on the symbol with a mount lug.
- **Positive control, as asked**: "CONTROL: swapping which pin is recorded
  as the pole fails the angle-and-side check, although it would not change
  the exact-pin-set check above." It swaps `Switch:SW_Rotary_1x12`'s real
  pole (`"13"`) with its first real throw (`"1"`) and asserts
  `assertPoleOppositeEveryThrow` throws on the corrupted data - which it
  does, because pin `"1"` is drawn at angle 180, not 0. Confirmed by running
  the suite (the control test itself passes, meaning the inner call did
  throw as asserted).

**Correcting the record, in both files, per the instruction not to soften
it into "improves coverage":**
- `pultec-switch-geometry.test.ts`'s header comment now states plainly that
  one of the "two moved arms" it described was actually dropped, not moved,
  and has since been restored below it.
- `nc-pins.test.ts`'s comment (which previously said "All four of its arms
  moved to tests/circuits/pultec-switch-geometry.test.ts") now itemizes
  what happened to each of the four individually, naming `c685da0` by
  commit hash and saying directly that it described a drop as a move.
- This commit's own message says the same thing in the same words, rather
  than "restores an assertion" or "improves test coverage" - `c685da0`
  described a drop as a move, and this commit restores the angle/side
  assertion it dropped.

**Gate numbers for this round**, all re-confirmed after the fix:
- `bun run typecheck`: clean, re-run immediately before this commit.
- `bun test`: `4096 pass / 8 fail` (4104 total, 238.84s), the same 8
  `tests/schgen/port-fidelity.test.ts` failures by name as every earlier
  baseline in this task (confirmed by name: *every ported file is its
  source*, *every declared source root is a directory on disk*, *every
  copied fixture is byte-identical*, *every diverged entry names a real
  pedals source*, *every diverged file's source is unchanged*, *no
  hand-written file shadows a pedals source*, *a ported file importing a
  name an externals target does not export is refused*, *a from that
  escapes its source root is refused*). Pass count up 2 from round 2's 4094
  - the restored test and its swap control, no other change.
- `make check`: fails on exactly four boards - `pt2399-core`,
  `transistor-preamp-lab`, `transistor-preamp-loop`,
  `transistor-preamp-staged` - with all five Pultec boards `ok`. Exactly
  the baseline four, no more, no fewer.
- Five drafted sheet sha256s: reconfirmed byte-identical to the original
  baseline.

**The pattern across all three rounds of this task, recorded because it
generalises past this task:** every weakness found this round, and in
round 2, was a port that came out weaker than its original while being
described as faithful - and every one was caught by a reviewer diffing
against the source rather than by re-reading the summary of what was done.
Opening the original, enumerating every one of its assertions, and
accounting for each individually (moved, strengthened, or dropped with a
stated reason) is the check that would have caught this before review
rather than after it.

**Concerns carried forward: none.** This is the last round on Task 2; the
two constants and every arm that verified them against the installed
library are now in a permanent home with faithful, and in two cases
strengthened, assertions.
