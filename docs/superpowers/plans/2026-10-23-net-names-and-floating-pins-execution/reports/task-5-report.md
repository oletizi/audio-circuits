# Task 5 report: `pt2399-core` declares `NC`, and the board behind it generates

**Status: COMPLETE.** All five steps done. §3b's required gate is discharged against
real `kicad-cli`. **The headline result is not the one the brief expected:**
`pt2399-core` does not stop at a text problem — it **produces a schematic**, and
it is the first board in this repository to do so. `0 of 11` → `1 of 11`.

---

## What was changed

| file | change |
| --- | --- |
| `circuits/pt2399-core/pt2399-core.ts` | pin `"5"` is `NC`; `.port("clk_o_unused", …)` **deleted**; the module paragraph that explained the port **deleted** and replaced with what is true |
| `circuits/pt2399-core/schematic/authoring.ts` | the placeholder net's `portDirections` entry and its `negotiablePort` **deleted** with the paragraph defending them; the sheet's `file` renamed off the project name |
| `tests/support/declared-nc.ts` | **new.** `declaredNcNodes` — the one input every `NC` allowance is keyed on, written once for two sites |
| `tests/circuits/pt2399-core.test.ts` | the name-keyed comparison rewritten with the pin-specific allowance, plus three adversarial arms |
| `tests/kicad/legacy-netlist.test.ts` | the **second** comparison site: three assertions carved out, in both directions |
| `tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` | **new.** §3b's required gate: generation + real `kicad-cli` + `roundTrip` |
| `tests/schgen/authoring-complete.test.ts` | `pt2399-core` refusals `[1,0,0,1]` → `[0,0,0,0]`; the G159 test inverted rather than deleted |
| `tests/schgen/ir/nc-end-to-end.test.ts` | Task 2's reservation marked discharged, with the one measurement that belongs there (G287) |
| `tests/schgen/ir/net-name.test.ts` | the perturbation table's second row no longer names a test; corrected in place |
| `tools/schgen/gate-census.ts`, `tests/schgen/gate-census.test.ts` | the `singlePinNets` register pointer moved off deleted **G159** |
| `tools/schgen/port-manifest.json` | the new test file declared **`handWritten`** — not `diverged` |
| `docs/schematic/template-parity.md` | regenerated: `pt-core` interface ports 6 → 5 |
| `docs/known-gaps.md` | **G159 deleted**; **G283–G288 added**; **G259** and **G274** amended |

---

## Verification

| check | result |
| --- | --- |
| `SCHGEN_SOURCE=… bun test` | **3845 pass / 0 fail / 43698 `expect()` across 356 files** (from 3838 / 0 / 43688 / 355) |
| `bun run typecheck` | **clean** (`tsc --noEmit`, no output) |
| `make -C boards/pt2399-core check` | **exit 2, byte-identical to baseline** but for this plan's own test counts — **no regression** (G251's pre-existing `bomConditions` cause) |
| control-byte check | every touched file: zero bytes `< 0x20` other than LF |

### The suite move, term by term

`+7` tests, `+10` `expect()`, `+1` file.

| file | tests | `expect()` |
| --- | --- | --- |
| `tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` (new) | **+4** | **+10** |
| `tests/circuits/pt2399-core.test.ts` | 5 → 8 = **+3** | 75 → 58 = **−17** |
| `tests/kicad/legacy-netlist.test.ts` | 23 → 23 = 0 | 31 → 45 = **+14** |
| `tests/schgen/authoring-complete.test.ts` | 37 → 37 = 0 | **+3** |
| **total** | **+7** | **+10** |

`−17` on `pt2399-core.test.ts` is the one that needs saying: the old comparison
ran `expect(ours[name]).toEqual(...)` inside a loop over 21 exported nets, so it
contributed 22 `expect()` for one claim. The replacement makes the claim once, in
a function that throws naming every disagreement, and spends its assertions on
three new arms instead. **Fewer `expect()` calls, strictly more checked** — the
old loop could not have caught a net the model has and the export does not.

**Independently confirmed**, rather than only reasoned: `make -C
boards/pt2399-core check` runs `tests/circuits/pt2399-core.test.ts` alone, and
its log went `5 pass / 75 expect()` → `8 pass / 58 expect()`. The
`authoring-complete` delta was checked with `git show HEAD:…` and a count of
`expect(` in the replaced block: 4 → 7.

`tests/schgen/verify.test.ts` did **not** move. The brief warned it has one
`expect` per gate-1 problem and would track `pt2399-core`'s count — `[READ]`
`verify.test.ts:147-157`: that test builds its own two-capacitor spec
(`cap("C1","3V3","GND")`, `cap("C2","low_er","GND")`), not a parity circuit. The
warning was sound and does not apply.

### Board census, per board

`SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts`:

| board | before | after |
| --- | --- | --- |
| **`pt2399-core`** | refused: `net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)` | **generated (1 sheet, 8 fallback field placements)** |
| `pultec-hi-boost` | refused: `part SW_HI_BOOST: pin MP () is neither on a net nor declared not connected` | unchanged |
| `pultec-hi-cut` | refused: `part SW_HI_CUT: pin MP ()` … | unchanged |
| `pultec-low-boost` | refused: `part SW_LO_BOOST: pin MP ()` … | unchanged |
| `pultec-low-cut` | refused: `part SW_LO_CUT: pin MP ()` … | unchanged |
| `pultec-mid` | refused: `part SW_MID: pin 12 (12)` … | unchanged |
| `transistor-preamp-buffered` | refused: `tp-stage` GND/VCC glyph touch + two label problems | unchanged |
| `transistor-preamp-feedback` | refused: `tp-stage` t-junction with no junction | unchanged |
| `transistor-preamp-lab` | refused: `tp-leg-emitter-bypass` label over label | unchanged |
| `transistor-preamp-loop` | refused: `tp-follower` label over label | unchanged |
| `transistor-preamp-staged` | refused: `tp-stage` GND/VCC glyph touch | unchanged |

**`1 of 11 boards produce a schematic` / `10 refused; 0 have no authoring
declaration`.** The ten remaining blockers are the same ten messages as the
before run — that is the control that nothing else moved.

---

## The brief's four decisive things

### 1. The fake port and its explanation are deleted

Both. The port, the three-line ports comment that pointed at it, the eight-line
module paragraph that said it *"does not imply the pin does anything
off-board"*, **and two more sites the brief did not list**: the authoring
declaration's `portDirections` entry and its `negotiablePort`, each with its own
paragraph arguing that `out` was "narrower than it looks". Those two were not
optional — `authoringProblems` (`lib/schgen/authoring.ts:333`) refuses
`portDirections names net "X", which no pin of this network is on`, so leaving
them would have replaced one refusal with another.

Nothing is hedged and nothing is stubbed. Each site now says what is true and,
where a reader would otherwise wonder, says what used to be there and why it was
false.

### 2. The allowance is pin-specific — and the arm that proves it is NOT the arm the brief sketched

**This is the most important thing in the report.** The brief's sketch was:

```ts
const broken = /* the same model with one resistor terminal dropped */
expect(() => equivalent(brokenNets, exportedNets)).toThrow(/missing/)
```

I wrote it, and **it does not discriminate.** A terminal dropped from the model
with the export untouched leaves a net *both sides have* with different members,
so it is caught by comparing members — **it is refused under the blanket rule
too.** I drove the blanket rule (`declaredNc.has(only)` → `true`) and that arm
**passed**.

The discriminating shape is the real one: KiCad gives an unwired pin **its own
one-member placeholder net**. So the arm that matters drops
`input_mix_resistor`'s `b` terminal (`R3.2`) from the model *and* gives the
export the `unconnected-(R3-Pad2)` net KiCad would have produced. Then the two
sides **agree everywhere else**, and the `NC` declaration is the only thing left
between a dropped connection and a green comparison.

`[RAN]` the perturbation, driven red first:

```
Expected pattern: /net unconnected-\(R3-Pad2\) is in the netlist and missing from the model/
Received function did not throw
Received value: [
  { net: "unconnected-(U1-CLK_O-Pad5)", node: "U1.5" },
  { net: "unconnected-(R3-Pad2)", node: "R3.2" },
]
 7 pass / 1 fail
```

**One test failed and seven passed** — so the arm is load-bearing and nothing
else in the file was carrying it. Restored: 8 pass.

The allowance does not pattern-match `unconnected-*`, does not treat one-member
nets as a class, and has a third arm proving a declared-`NC` pin the export shows
*wired* is refused rather than excused by its own declaration. The brief's
simpler arm is **kept**, with a comment saying in terms that it is not evidence
about the allowance.

### 3. §3b's required gate: discharged, both halves

`tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` generates the whole
`pt2399-core` project from `circuits/`, writes it, exports the root with real
`kicad-cli`, and compares:

- **present as `(no_connect` in the emitted sheet** — exactly one marker, and the
  expected count is **derived from the model** (`circuit.pins.filter(p => p.net === null)`), not written as `1`;
- **accepted by the comparison against the netlist export** — `kicad-cli` returns
  `unconnected-(U1-CLK_O-Pad5)` carrying `U1.5` alone, the same string the
  authored schematic's committed fixture carries, and
  `lib/schgen/gates/round-trip.ts` agrees on **all five** comparisons with
  `footprintsUndeclared` empty too.

It fails rather than skips when `kicad-cli` is absent, per G169.

**Task 2's reservation is what this discharges** (one sheet, hand-built fixture,
no `kicad-cli`), and `nc-end-to-end.test.ts` now says so at the place the
reservation was recorded.

**The gate was perturbed to prove it can fail**, and the perturbation produced a
finding worth more than the gate: with the emitter's `noConnects` output replaced
by `[]`, the marker assertion failed (`expected 1, received 0`) and **the other
three tests all passed** — `kicad-cli` still gave pin 5 its placeholder net and
the round trip still agreed on all five comparisons. **No netlist comparison can
tell a marked no-connect from a merely unwired pin.** Two of §3b's four states
are indistinguishable downstream of the netlist, and only an assertion on the
sheet's bytes sees the difference. **G287.** `git diff
lib/schgen/render/emit.ts` confirmed empty before re-running green.

### 4. The next problem behind this one — and it was not a text problem

The brief predicted a text-placement refusal and said finding it would be the
task's most valuable measurement. **What was actually behind the single-pin net
was a filename collision, and it is the most valuable measurement in the task:**

```
pt2399-core: refused
    generate: two generated files are named pt2399-core.kicad_sch
```

`tools/schgen/generated-files.ts:98` emits the hierarchical root as
`${project}.kicad_sch` and then adds one file per declared sheet; `add` refuses a
repeated name. **All thirteen declared designs name their sole sheet after their
project**, so every one of them hits this the moment its circuit validates. The
only design that does not is the ported `mini` fixture — because it declares *two*
sheets, so neither could be named after the project. **Nothing in this repository
had ever generated a single-sheet design**, which is why a defect in twelve files
went unseen. **G284** carries the census, the three mechanisms and the preference.

I fixed **only** `pt2399-core`'s (`file: \`${SHEET}.kicad_sch\``), because that is
the board the task reached and because the gate above could not otherwise be
discharged. The other twelve are blocked by earlier refusals, so an edit to them
could not be driven and would be unverifiable — **recorded as a prediction,
labelled as one.** I did not author a criterion for them; G284's criterion is
measurable and names (b) a check in `authoringProblems` as the untried mechanism
I would prefer, explicitly marked as not attempted.

**And then the board generated.** With the eight fallback field placements that
came with it, which is the second column that must never be dropped — **G285**
names all eight, says a reference designator sits over a wire in eight places and
over a pin in one, and says plainly that **nobody opened the PDF.** G240's
criterion is untouched: there is now an artifact to put in front of the owner,
which is a precondition for that criterion and not a step toward meeting it.

---

## Things I found that the brief did not anticipate

**(a) There are TWO model-versus-netlist comparison sites, not one.** The brief
named `tests/circuits/pt2399-core.test.ts`. `tests/kicad/legacy-netlist.test.ts`
compares the same model against the same fixture through `writeLegacyNetlist`'s
**text**, three times — the net map, the written bytes, and a names-discarded
membership comparison. All three went red on the model change alone. Both sites
are now keyed on the same rule, written once in `tests/support/declared-nc.ts`.

**(b) The two derivations of "this model as a netlist" disagree about how to
spell `NC`** — **G286**. `lib/kicad/from-network.ts:190` drops the pin;
`lib/schgen/gates/round-trip.ts`'s `modelPartition` gives it a one-member set
*"because that is how the export carries it"* and warns in terms about the hazard
of the other choice. **The obvious fix does not work:** KiCad's placeholder name
embeds the *symbol pin name* (`CLK_O`), which the model does not carry, so
`from-network` can match the shape but not the name. Exposure today is nil and
that is luck — `pt2399-core` is the only circuit declaring `NC` and is not one of
the boards `tests/circuits/kicad-round-trip.ts` serves. So the legacy-netlist
carve-outs assert in **both** directions (fixture has it, ours does not), and a
`from-network` that starts emitting the pin **fails there** rather than passing
quietly; G286 and the carve-outs are deleted together.

**(c) G159's suggested mechanism was wrong on the merits.** It offered *"give the
model somewhere to hold an `ncUnlisted` reason so the pin can be declared not
connected"*, tied to G151. **The model already had `NC`** —
`lib/model/types.ts:42`, exported from `lib/model/index.ts` — and declaring it
needed no new model slot at all. The criterion was right and binding; the
mechanism assumed a gap that did not exist. This is the fifth time on this branch
that pairing has come up.

**(d) Deleting a register entry leaves dangling pointers, and fifteen already
existed** — **G288**. `[RAN]` a script over `docs/known-gaps.md`: 261 entries
defined, 277 referenced, **16 defined nowhere**, fifteen of them predating this
task. So every deletion in this file's history has left its inbound pointers.
Most sites are dated measurement tables and should stay; the **live** one my
deletion created was `tools/schgen/gate-census.ts` *printing* `singlePinNets
(G159)` as tool output with a test asserting the string, and that moved to G283
with the reason written at both sites. The naive version of my script counted
`CRITERIA G<n>` as dangling and reported a much larger number — this file's own
header warns about that collision, which is how I caught it before publishing it.

**(e) One citation is deliberately left stale.**
`tools/schgen/label-syntax/fixtures.ts:83` cites *":190's clk_o_unused port"*,
and line 190 is gone. That string is echoed verbatim into Task 1's committed
`probe-run.log`, so editing it would desync a committed measurement from the code
that produced it, and re-running the probe would rewrite another task's artifact.
**No test compares that log to a re-run**, which is what makes leaving it safe and
is also why nothing would have caught the desync. Recorded in G283 as a decision.

---

## Constraints

- **No `diverged[]` entry was needed or added.** The new test file is declared
  `handWritten`, which is the sanctioned route and what Task 1 used. Nothing was
  taken off the byte-check.
- No `sed -i`, no sed `w`/`e`. Edits via Edit/Write; multi-step text work via
  Python scripts written with Write.
- No control-character escape was typed into any tool parameter. Every touched
  file was byte-checked (zero bytes `< 0x20` other than LF) rather than read.
- No AI attribution in the commit. No `git checkout HEAD --`. No writes to
  `~/.claude/projects/*/memory/`. No subagents dispatched.
- Commit message written to a file and applied with `git commit -F`.
- Nothing touched the five Pultec boards.

## Concerns

1. **`1 of 11` will be quoted without its second column.** The sheet has eight
   fallback field placements and nobody has looked at it. G285 and the G259
   amendment both say so in their first paragraph, and the count is asserted in a
   test so it cannot drift silently — but this is the number most likely to be
   misread as progress against G240.
2. **Twelve declarations carry G284's collision.** Each is one line. None can be
   verified today. If a later task fixes a board's earlier blocker and reports
   "still refused", this is the likely reason, and it will look like a new defect.
3. **G286 is the one I would most want a second opinion on.** The carve-outs in
   `tests/kicad/legacy-netlist.test.ts` are a real tolerance in a real gate. They
   assert in both directions and the entry has a measurable criterion, but a
   reader who finds them without the entry would reasonably widen them.
4. **G287 bounds a class of future checks.** Someone wiring an `NC` check will
   reach for the round trip because it looks thorough. It cannot see a missing
   marker.


---

# Fix round 1 — 2026-10-24

**Register and wording only. No source file changed; every edit is in `docs/known-gaps.md`.**
Three Importants and five Minors, all addressed. **I re-drove every claim rather
than taking the review's figures** — and that caught two things the review did not
say and one place where its wording was too narrow.

## I2 — the drawing, and the finding that would have cost the most

**I opened the PDF myself** (`exportPdf` on the generated root, both pages read as
images). The reviewer is right on every count, and the eight fallbacks are **not**
what is wrong:

| what is wrong | state |
| --- | --- |
| net labels | **none at all** — the only text ports are `+5V` and `GND` at J1 |
| signal flow | not followable; long orthogonal rings in near-parallel bundles |
| `C13` / `C14` | unresolvable — two identical symbols, one label above, one below |
| page 1 of 2 | blank but for one sheet symbol |
| bottom third of page 2 | empty |

**One thing I can add that sharpens it from a complaint into a lead:** the zero
labels are *diagnosable*. Task 1 of this plan measured (**G277**) that
`labelledNets` labels a net only when it is a rail, spans more than one block, or
touches a `bus` block. `pt2399-core` is declared as **one** block, so **no interior
net can be labelled, by construction.** The sheet is the faithful output of a
one-block declaration — which makes the declaration, not the placer, the place to
look.

**The designator permutation — confirmed independently, not relayed.** I drove
`annotation.refs` against `DESIGNATORS`: **19 of 24 differ**; only `C1 C2 C3 U1 J1`
keep their names. Generated `R3` is the part the board calls `R1`, value **10K**,
where the board's own `R3` is **15K**. `roundTrip` passes because **G177** already
records that it compares the designator *set* and never the *binding* of a
designator to the part the board calls by that name.

**The framing was the real defect, and the coordinator is right that it was mine.**
G285 and the G259 amendment both offered this sheet to the owner. Both offers are
**struck**, with the original wording quoted so the correction is legible:

- G285's *"nobody has looked at the sheet… G240's criterion is the thing that
  matters"* → replaced by what the sheet actually is, ending **"This sheet is
  evidence that the pipeline runs end to end. It is not a candidate for G240 and
  must not be sent to him as one."**
- G259's *"There is now, for the first time, an artifact to put in front of him"* →
  struck and quoted, replaced by **"What there is now is a pipeline that runs end
  to end on a real circuit. That is worth having and it is not an artifact for
  him."**

G285's criterion went from two clauses to **three**, with the new one first and
named as the blocker: *the generated reference designators agree with the board's,
or the disagreement is declared* — because a sheet whose part names permute the
board's cannot be checked against the board by anyone.

## I3 — the exposure claim, corrected and the trap named

**Confirmed by reading at the line, not relayed.** `tools/perfboard/check.ts:266`
is `toImportedNetlist(network, designators, pinNumbers, offBoard, padOrder)` — the
netlist `make -C boards/pt2399-core check` compares against the `.vrt`. So **U1
lowers to fifteen pins on the board-check path today.**

And `lib/kicad/from-network.ts:49-62`: `assertPinCount` throws only when a pin
number is **greater than** the declared count. **An absent pin is never counted and
never refused.** The repository's own comment at `from-network.ts:123` already
describes the same asymmetry for the pad-order case — independent corroboration I
had not noticed.

G286 now carries the corrected exposure, the silent-pass mechanism, and the
scenario spelled out so the next reader recognises it: G251 gets fixed, the board
check newly disagrees over a missing pad, **and the obvious suspect will be the
BOM change rather than a line that has been dropping pin 5 since this task.** The
superseded "exposure is nil" paragraph is kept and labelled, because *the reasoning
it used* — establishing "nil" by checking one caller instead of all of them — is
the thing to avoid.

## I1 — the collision figure, and my error was worse than off-by-one

**Driven, not read.** 11 of 13 collide (12 before my fix), exactly as the review
says. **But the cause is not that I was one row too wide — I compared the wrong
column.** I read the `project:` field off each `SchematicAuthoring`. `generate`
never uses it for this: `gate-census.ts:119`'s `parityDesign` sets `project:
c.name` (the case name), and `generatedFiles` names the root from the `DesignSpec`.
`[READ]` all five uses of `SchematicAuthoring.project` in the tree
(`authoring.ts:263`, `:380`, `authoring-checks.ts:143`, `from-network.ts:68`,
`:245`) — **every one is error-message text. It never names a file.**

`transistor-preamp` escapes because its case name (`transistor-preamp`) differs
from its authoring project (`transistor-preamp-lab`). **That escape is an accident
— a mismatch between two names somebody would reasonably align** — and I added
that to G284, plus a note that mechanism (b) is the only one that would also catch
the escape closing.

Corrected in **four places**: G284's heading, its correction block, its table (now
carrying a `collides?` column and the `DesignSpec` project), G259's "all twelve
other", and G274's "all thirteen". **The commit message carries the wrong figure
and cannot be rewritten; G284's block says so and is the correction of record.**

## Minors

**G288's totals were wrong, and the entry demonstrates its own subject.** The
correct figures were 262 defined / 213 distinct referenced, not 261/277.
- `277` was never a reference count: my script scanned the whole file, so every
  `### G283 …` heading counted as a reference to itself. `277` is the union.
- `261` was right when printed and **falsified by printing it** — appending the
  entry made it 262.

That is `docs/schematic/false-greens.md` **mechanism 23** (*"a figure published
about the artifact the change is still editing"*, verified at `:754`) inside the
entry written about a neighbouring failure. **Then it happened again during this
fix round**: 213 → 215 as my corrections added cross-references, then → 214 as I
removed one. **So I stopped pinning it.** G288 now reports the *dangling set* as
the load-bearing result — stable across every run, differing from parent `4be4815`
by exactly `[159]`, which is now established by direct comparison rather than
inferred — and says explicitly that the reference total is volatile and not a
figure to defend.

**And reading the sixteen sites resolved my own hedge in both directions:**
- **`G113` IS load-bearing** — `:14297` (*"hand-written, on G113's pattern"*) and
  `:14314` (*"A DEVIATION FROM THE MINIMUM G113 MEASURED"*) both send a reader to a
  measurement that is not there. A genuine broken pointer.
- **`G4` is a false positive** — its only two hits are this file's own header
  warning about the CRITERIA collision. **The script counted the warning about the
  trap as an instance of the trap.**
- `G3 G7 G8 G26 G46` are historical narrative; `:6143` names four in one breath.

So "16 dangling" is an upper bound containing at least one false positive and at
least one real defect. G288 says so.

**Fragility — confirmed by my own six, and the review's wording is too narrow.** I
ran six one-line perturbations (one extra U1 pin `NC`, on nets keeping ≥2 members):
**three of six flip straight back to refused**, and **not at a junction** — pin 1
fails ELK's clearance checks, pins 15 and 16 fail because *"snapping the ELK route
onto KiCad's 1.27 mm grid collapsed geometry"*. Pin 13 generates with **10**
fallbacks rather than 8. The reviewer's four-of-six used a different pin set.
**The figure differs with the pin set; the phenomenon does not** — recorded that
way, with the reviewer's figure marked RELAYED and mine CONFIRMED, rather than
copying a number I did not produce or a cause I did not observe.

**The stale-citation third option** is recorded in G283: keep the `why` string
byte-identical and add a dated note beside it. The framing I used was a false
dichotomy. **Not acted on** — changing it now would be a second edit to another
task's artifact for no measured gain — but flagged so it is not copied.

**Page 1 blank** is in G285's table.

## Verification

| check | result |
| --- | --- |
| `SCHGEN_SOURCE=… bun test` | **3845 pass / 0 fail / 43698 `expect()` across 356 files** — unchanged, as a register round should be |
| `bun run typecheck` | clean |
| control-byte check | `docs/known-gaps.md` and every touched file: zero bytes `< 0x20` other than LF |

No source file changed this round, so no suite move to account for.
