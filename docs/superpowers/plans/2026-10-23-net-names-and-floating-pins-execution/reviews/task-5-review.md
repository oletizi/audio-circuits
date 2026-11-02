Task 5 review: `pt2399-core` declares `NC`, and the board behind it draws
==========================================================================

Reviewed at `dc140e3` (parent `4be4815`), worktree
`/Users/orion/work/audio-circuits-work/pultec-modularize`, branch
`feature/schematics-tooling`. Every `[RAN]` below was driven in this session.
`[READ]` means read here. `[RELAYED]` means another agent's figure not
re-derived here; there is exactly one, and it is named.

**SPEC COMPLIANCE: PASS.**
**TASK QUALITY: PASS WITH FINDINGS** - three Important, five Minor, none
Critical. The engineering is unusually well driven: every claim I re-drove
reproduced, including the two that refute the brief. The findings are about
what was published around the work, not about the work.

---

## A. The drawing. I opened it.

`[RAN]` `bun tools/schgen/board-sheets.ts --out <scratch> --pdf`, then
`pdftoppm -r 400` and read both pages, plus five crops at 400 dpi.

**Can a person read this schematic? Parts of it, yes. As a drawing, no - and
the reason is not the eight fallbacks.**

### What is right

- **The `no_connect` marker is there and it is unmistakable.** A blue X sits on
  U1 pin 5 beside the `CLK_O` label. This is the first visual confirmation that
  the thing the whole task is about reaches the page.
- **U1 and its immediate neighbourhood are genuinely legible.** The 16-pin
  symbol, its pin numbers, its pin names, `R3`/`C11`/`C8`/`C12` with values
  attached - a person could read that corner and believe it.
- **Values are attached to the right symbols.** Every value I spot-checked
  belongs to the symbol it sits beside.
- **Nothing is drawn over a pin in a way that misrepresents a connection**, as
  far as I could see. The census reports one field covering `pin C10.2`; I went
  looking for it at 400 dpi and could not see it - the "covers" metric is a
  bounding-box overlap and that one does not read as a connection on the page.
- **I saw no text-over-text anywhere.** The eight fallbacks are all
  text-over-wire.
- Connectivity is not in question: the `kicad-cli` round trip agrees on all
  five comparisons, so the drawing's electrical meaning is the model's.

### What is wrong

- **There is no followable signal flow.** There is no left-to-right
  progression and no input-to-output reading order. U1 sits top-right, the
  five-pin header `J1` bottom-right, and fourteen capacitors and eight
  resistors are packed into a dense raft on the left. Nets are long orthogonal
  wires that circumnavigate the block in near-parallel bundles - several
  rectangles of wire enclosing most of the drawing. **There is not one net
  label on the sheet.** Tracing `GND`, or working out which `J1` pin is
  `INPUT`, means following a single green line across two thirds of the page
  through four or five corners, with other lines running parallel a millimetre
  away. A person *can* do it. A person will not want to, and will not trust the
  result.
- **Reference designators are ambiguous in at least two places, and that is
  worse than text-over-wire.** `C13` and `C14` are two identical capacitor
  symbols side by side with `C14 10uF` placed above and between them and
  `C13 .01uF` below and between them: there is no way to tell from the drawing
  which designator belongs to which symbol. The same pattern recurs with the
  `R1`/`R7` and `R4`/`R7` resistor bodies, where labels sit on different sides
  of their symbols with no consistent convention.
- **Text really is struck through by wires, visibly.** `C9` and `5600pF` both
  have a vertical wire running through the glyphs. `R7 15K` sits directly on a
  long horizontal wire, below and left of its own body, so it reads as a label
  on the wire rather than on the resistor.
- **Page 1 of 2 conveys nothing.** The hierarchical root is an empty sheet
  symbol with no hierarchical pins, a title and a file name. The five declared
  interface ports do not surface there.
- **The drawing uses the upper-left half of an A4 sheet.** The bottom third is
  blank. The congestion is not a space problem.

### The thing nobody has said, and it is the most important sentence in A

**The generated sheet's reference designators are a permutation of the board's.**
`[READ]` the generation's own `REFMAP.md`: 24 parts, and **19 of them carry a
different designator in the generated schematic than the model's
`DESIGNATORS` map gives them.** Generated `R3` is 10K; the board's `R3` is 15K.
Generated `C9` is the model's `C12`. Only `C1`, `C2`, `C3`, `J1` and `U1`
coincide.

This is self-consistent and not a bug in the drawing - `roundTrip` takes
`refs` from the generation itself, and `docs/known-gaps.md` **G177** already
records in terms that the round trip is blind to the designator binding. But
**G285** and the **G259** amendment both offer this sheet as *"an artifact to
put in front of him"* for **G240**'s criterion, which is *a generated schematic
compared against a drawing the owner trusts.* Put this sheet beside his board
and nineteen of twenty-four part names disagree.

### What A does not elect

Whether eight fallbacks, the raft-and-ring routing, or the designator
permutation are acceptable is the owner's call under **G260**/**G265**/**G240**.
This section describes; it decides nothing. **G285**'s *"this writer did not
open the PDF"* is now discharged as a fact - the PDF has been opened and
described - but **G240**'s criterion is untouched, because nothing here
compared the sheet against a drawing he trusts.

---

## B. The required gate: discharged. CONFIRMED on all three sub-claims.

### It fails rather than skips

`[RAN]` `KICAD_CLI=/nonexistent/kicad-cli bun test
tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` → **exit 1, 0 pass / 1
fail**, with the refusal naming the path, naming `lib/kicad/install.ts`, and
saying in terms that it does not skip. **CONFIRMED.**

### The count is genuinely derived, not a literal dressed as derivation

`[READ]` the assertion is
`expect(sheet.match(/\(no_connect/g) ?? []).toHaveLength(declaredNc.length)`
where `declaredNc = circuit.pins.filter((p) => p.net === null)` over the
generation's own IR. No literal appears in it.

`[RAN]` the perturbation the brief asked for, six times over six candidate
pins. Two of them generate:

| second pin declared `NC` | generation | result |
| --- | --- | --- |
| `reference_bypass` b (`C3.2`) | succeeds | `declaredNc = ["C3.2","U1.5"]`, **3 pass / 1 fail** - the only failure is the fallback count (8 → 6) |
| `oscillator_cc1_bypass` b (`C4.2`) | succeeds | `declaredNc = ["C4.2","U1.5"]`, **3 pass / 1 fail** - the only failure is the fallback count (8 → 7) |
| `supply_bypass_local` b, `supply_bulk` b, `oscillator_cc0_bypass` b, `lpf1_node_filter_cap` a, `regen_node_filter_cap` b | ELK refuses | n/a |

**The marker assertion PASSED with `declaredNc.length === 2`** - so the sheet
carried two `(no_connect` items and the expectation moved with the model. Had
the gate been written `toHaveLength(1)` it would have failed here with
*"Expected length: 1, Received length: 2"*. **CONFIRMED: derived.**

(The file's preceding `expect(declaredNc.map(...)).toEqual(["U1.5"])` is a
literal, and it is the right kind of literal: it pins *which* pin, not how
many. I replaced it with a `console.log` for this drive and restored it.)

### Round trip

`[RAN]` the gate green at a clean tree: **4 pass / 10 expect()**, real
`kicad-cli` 10.0.5. **CONFIRMED.**

---

## C. The allowance: one pin, not a class. CONFIRMED - and the brief's own arm
does not discriminate.

### Driving the widening

`[RAN]` `declaredNc.has(only)` → `true` in `agreeOnNets`, i.e. the blanket
*"a one-member net is an intentional no-connect"* rule written out:

```
(fail) a terminal NOT declared NC, on its own placeholder net, is still refused
Expected pattern: /net unconnected-\(R3-Pad2\) is in the netlist and missing from the model/
Received function did not throw
Received value: [
  { net: "unconnected-(U1-CLK_O-Pad5)", node: "U1.5" },
  { net: "unconnected-(R3-Pad2)", node: "R3.2" },
]
 7 pass / 1 fail / 58 expect()
```

**One arm fails and names both excused pins; seven pass.** This reproduces the
implementer's report byte for byte. **CONFIRMED.**

### The discriminating arm really discriminates

`[READ]` the arm drops `input_mix_resistor`'s `b` (`R3.2`) from the model
**and** rewrites the export so that `Net-(C7-Pad1)` loses `R3.2` and a new
`unconnected-(R3-Pad2)` net carries it alone - which is what KiCad does to an
unwired pin. Both sides then agree on every other net, so the `NC` declaration
is the only thing between a dropped connection and green. **CONFIRMED** by the
drive above: it is the one arm the widening kills.

### Your sketch: REFUTED, and the implementer is right

Your brief asked for *"the same model with one resistor terminal dropped"*
against an untouched export, asserted to throw `/missing/`. That arm exists in
the file, labelled *"a terminal dropped from the model with the netlist
untouched is caught on members"*, and under the widened key it **PASSED** -
it is one of the seven. It is caught by comparing members of a net both sides
have, so the blanket rule refuses it too, so it establishes nothing about the
allowance.

**Your brief would have shipped a test that looked like proof and was not.**
The implementer kept the arm, with a comment saying in terms that it is not
evidence about the allowance. That is the right disposition and it is recorded
in **G283**.

---

## D. The second fix, and the one real defect in this task

### The fix is correctly scoped

`[READ]` the diff touches `SHEETS` in `circuits/pt2399-core/schematic/
authoring.ts` only: `file: "pt2399-core.kicad_sch"` → `` file: `${SHEET}.kicad_sch` ``.
`[RAN]` the sheet census over `ALL_DECLARED_CASES`: `pt2399-core` is the only
one whose sheet file changed. **CONFIRMED.**

### **G284 states its prediction as a prediction. It also states it wrong.**

`[RAN]` a census over `ALL_DECLARED_CASES` computing each design's actual
root file through `parityDesign` - the function `board-sheets.ts` and
`gate-census.ts` both call - and comparing it against each declared sheet's
`file`:

```
cases=13 collisions=11
```

| design | `design.spec.project` | root the generator writes | sheet file | collides? |
| --- | --- | --- | --- | --- |
| `pt2399-core` | `pt2399-core` | `pt2399-core.kicad_sch` | `core.kicad_sch` | **no - fixed** |
| **`transistor-preamp`** | **`transistor-preamp`** | **`transistor-preamp.kicad_sch`** | **`transistor-preamp-lab.kicad_sch`** | **no - and never did** |
| the other eleven | = case name | `<case>.kicad_sch` | `<case>.kicad_sch` | yes |

**`tools/schgen/gate-census.ts:119` sets `project: c.name`.** `authoring.project`
is read only to build error messages (`lib/schgen/authoring.ts:263,:380`,
`from-network.ts:68,:245`, `authoring-checks.ts:143`) - it never reaches
`DesignSpec`. The `transistor-preamp` case is named `transistor-preamp` and its
declaration's `project` field says `transistor-preamp-lab`, so the generator's
root is `transistor-preamp.kicad_sch` and the sheet is
`transistor-preamp-lab.kicad_sch`. **They do not collide.**

So the correct figures are **12 of 13 before the fix, 11 of 13 after**, not
"all thirteen" and "the other twelve". **G284**'s table, its headline, the
**G259** amendment (*"all twelve other declared designs have the same collision
waiting"*), the **G274** amendment (*"all thirteen declared designs name their
sole sheet after their project"*) and the commit message all carry the same
off-by-one.

The entry's CRITERION is unaffected and still right. The labelling is right -
it says plainly that twelve rows are read and not run, and that this is a
prediction. **What is wrong is the prediction's content**, and the reason it is
wrong is exactly the thing the entry could not drive: it read `authoring.project`
off the declaration instead of following which field becomes `DesignSpec.project`.

---

## G287: CONFIRMED, and it is the strongest argument in the task

`[RAN]` `lib/schgen/render/emit.ts:169`'s `d.noConnects.map(...)` replaced by
`([] as typeof d.noConnects).map(...)` - the marker gone, nothing else touched -
against real `kicad-cli`:

```
error: expect(received).toHaveLength(expected)
Expected length: 1
Received length: 0
(fail) ... is drawn as exactly one no_connect marker ...
 3 pass / 1 fail / 10 expect()
```

**Three of the four tests passed with the marker deleted.** `kicad-cli` still
gave pin 5 `unconnected-(U1-CLK_O-Pad5)` with `U1.5` alone, and `roundTrip`
still agreed on all five comparisons. **No netlist comparison can distinguish a
marked no-connect from an unwired pin**, and spec §3b's states 3 and 4 are
therefore indistinguishable downstream of the netlist. The only guard is the
assertion on the sheet's bytes. `emit.ts` restored and re-driven green.

**This is the finding that earns §3b's insistence on the marker**, and
**G287**'s *"CRITERION for any future `NC` check: it asserts on the emitted
sheet, or it is accompanied by a statement of what it cannot see"* is the right
settlement.

---

## Two comparison sites, not three. CONFIRMED.

`[RAN]` the blast-radius check rather than a grep: `lib/kicad/from-network.ts`
perturbed to emit a declared-`NC` pin as a one-member
`unconnected-(<REF>-Pad<N>)` net - the thing **G286** says would resolve it -
and the **full suite** run:

```
3842 pass / 3 fail / 43690 expect() across 356 files
```

**All three failures are in `tests/kicad/legacy-netlist.test.ts`**, each with
the message *"our derivation now emits the placeholder: G286 is resolved, so
delete it and these carve-outs"*. Nothing else in 356 files noticed.

So: site 1 is `tests/circuits/pt2399-core.test.ts` (model against the committed
export, name-keyed, does not use `from-network`); site 2 is
`tests/kicad/legacy-netlist.test.ts` (three assertions through
`writeLegacyNetlist`'s text). **There is no third.** The other `pt2399Core`
consumers - `tests/kicad/footprint-names.test.ts`, `tests/kicad/lead-span.test.ts`,
`tests/perfboard/declaration.test.ts` - compare footprints, lead spans and
declaration paths, not nets.

## G286's carve-outs assert in BOTH directions. CONFIRMED.

The same drive is the proof: `ncDivergence` asserts the fixture HAS the
placeholder, that our derivation has NONE, and that `U1.5` appears nowhere in
ours, **before** dropping the net. A fixed `from-network.ts` fails at all three
sites with a message naming the entry and telling the reader to delete both
together. A one-way carve-out would have gone green on that perturbation; this
one went red three times. Restored, `git status` clean.

---

## The suite move, term by term

`[RAN]` the full suite at `dc140e3`:
**3845 pass / 0 fail / 43698 `expect()` across 356 files.** CONFIRMED.

`[RAN]` the four files at both ends - the parent side in a throwaway
`git worktree` at `4be4815`, since the per-file deltas are what the brief asks
to verify:

| file | tests (base → head) | `expect()` (base → head) |
| --- | --- | --- |
| `tests/circuits/pt2399-core.test.ts` | 5 → 8 = **+3** | 75 → 58 = **−17** |
| `tests/kicad/legacy-netlist.test.ts` | 23 → 23 = **0** | 31 → 45 = **+14** |
| `tests/schgen/authoring-complete.test.ts` | 37 → 37 = **0** | 740 → 743 = **+3** |
| `tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` (new) | **+4** | **+10** |
| **total** | **+7** | **+10**, **+1 file** |

Every term CONFIRMED. The parent's *whole-suite* total (3838 / 43688 / 355) is
the one figure I am **[RELAYED]** on: the worktree run returned 78
environment-dependent failures (missing `.tools/`, un-built board artifacts), so
it is not a usable total. The arithmetic closes against my own head-side total
and the per-file deltas, and the diff touches no other test file's assertion
count (`gate-census.test.ts` is a one-string change; `nc-end-to-end.test.ts` and
`net-name.test.ts` are comment-only).

### Did the −17 drop coverage? No.

The replaced block was `expect(Object.keys(ours).sort()).toEqual(Object.keys(
imported.nets).sort())` plus a 21-iteration `expect(ours[name]).toEqual([...members])`
= 22 `expect()` for two claims. The replacement makes both claims inside
`agreeOnNets` - which throws naming every disagreement - and spends 4
`expect()` on three new arms. 22 → 1 is −21; +4 arms is +4; **−17 exactly.**

What the replacement covers that the loop did not: it reports *every*
disagreement at once instead of stopping at the first, and it asserts the
allowance FIRED (`expect(allowed).toEqual([{net, node}])`), which is the
difference between an allowance and a comparison that happened to pass. Both
directions of net presence are still covered - the old key-set assertion did
that too, so the report's *"the old loop could not have caught a net the model
has and the export does not"* is true of the **loop** and not of the **test**.
A reader could take that sentence more widely than it holds.

Order sensitivity is not a loss: `asDesignatorNets` sorts every net's members,
so the old `toEqual` was already order-insensitive in practice. See Minor 1 for
the one micro-loss.

---

## The rest of the checklist

| check | result |
| --- | --- |
| `bun run typecheck` | `[RAN]` **exit 0, no output** |
| board census, per board | `[RAN]` **`1 of 11 boards produce a schematic` / `10 refused; 0 have no authoring declaration`**, the eight `FALLBACK` lines identical to **G285**'s table unit for unit and cost for cost, and the ten refusal messages identical to the before-run's. CONFIRMED |
| `make -C boards/pt2399-core check` | `[RAN]` **exit 2**, failing at `no "bomConditions" export` - **G251**'s pre-existing cause. The only in-log difference from the baseline is this plan's own `5 pass / 75 expect()` → `8 pass / 58 expect()`. The *byte-identical* phrasing is **[RELAYED]**; the exit code, the cause and the absence of any new failure are CONFIRMED |
| `tools/schgen/port-manifest.json` | `[RAN]` structural diff against the parent: `handWritten` gained exactly `tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts`; **no `diverged[]` entry added**, nothing removed, no other key changed. CONFIRMED |
| `docs/schematic/template-parity.md` | `[RAN]` `bun run schgen-parity` at a clean tree → **byte-identical**, `git diff` empty. The committed file is the regenerated content, not a hand edit. CONFIRMED |
| control bytes | `[RAN]` a byte census over all 14 touched files: **zero bytes below 0x20 other than LF**, counted not read. CONFIRMED |
| AI attribution | `[RAN]` the commit message against `Co-Authored-By`, `Claude-Session`, `Generated with`, `claude.ai/code`, the robot emoji and the bare string `Claude`: **none present**. CONFIRMED |
| **G159** deleted, live pointer moved | `[RAN]` the dangling census at HEAD and at the parent. **16 dangling at HEAD, 15 at the parent, the one new number is exactly `G159`**, and the two sets are otherwise identical: `G3 G4 G7 G8 G18 G25 G26 G36 G37 G41 G42 G46 G113 G194 G198`. The live pointer - `gate-census.ts` printing `singlePinNets (G159)` plus the `gate-census.test.ts` assertion - moved to **G283** at both sites. The surviving `G159` mentions in source are comments *explaining the deletion*, not citations of a live entry. **No new dangling reference beyond `G159` itself.** CONFIRMED |
| `G159`'s residue inside the register | the five remaining prose mentions sit inside **G178**, **G238** and **G245**, all dated measurement entries - which is the characterisation **G288** gives. A reader of **G238** does meet a dead pointer; **G288** owns that and does not claim otherwise |

---

## Findings

### Important

**I1 - G284's census is 11 of 13, not 13 of 13, and the entry will send a later
task to rename a file that needs no rename.**
`transistor-preamp`'s design spec carries `project: "transistor-preamp"`
(`gate-census.ts:119` sets `project: c.name`) while its sheet is
`transistor-preamp-lab.kicad_sch`; `authoring.project` is only ever used in
error strings. *Failure scenario:* a later task takes G284's *"all thirteen"*
at face value, renames the transistor-preamp lab sheet for a collision that was
never there, or - worse - sees that board generate without hitting the
collision and concludes G284's prediction is unreliable in general when it is
merely one row too wide. **Same off-by-one in G259's and G274's amendments and
in the commit message.** Settlement: re-measure with the census I ran
(`parityDesign(c, …).spec.project` against each `SheetSpec.file`) and correct
the four sites; the criterion and the preference for mechanism (b) stand.

**I2 - the first generated schematic carries designators that are a
permutation of the board's, and nothing in the task says so.**
19 of 24 differ (`REFMAP.md` is the mapping; generated `R3` is a 10K where the
board's `R3` is 15K). G177 already records that `roundTrip` is blind to the
designator binding, so this is not a new mechanism - but **G285** and the
**G259** amendment both offer this sheet as the artifact to put in front of the
owner for **G240**, and neither mentions it. *Failure scenario:* the owner
compares the first schematic this repository has ever produced against his
built board, finds nineteen part names wrong, and concludes the generator is
broken - when what is missing is a committed `refs.lock.json` pinning the
board's own designators.

**I3 - the first board-level consumer of the `NC` declaration is
`make -C boards/pt2399-core check`, and G286 does not know about it.**
`tools/perfboard/check.ts:266` lowers the circuit through `toImportedNetlist` -
the function G286 records as dropping the `NC` pin - and hands the result to
the forked VeroRoute to compare against the board's `.vrt`, which was laid out
from a netlist where `U1.5` sat on `unconnected-(U1-CLK_O-Pad5)`.
`assertPinCount` only refuses pin numbers *above* the declared count, so U1
lowering to 15 pins passes silently. The export runs **before** the BOM gate,
so it already runs today; the comparison downstream of it does not, because
G251's `bomConditions` refusal stops the board first. G286 says *"exposure today
is nil"* and names only `tests/circuits/kicad-round-trip.ts` and the
transistor-preamp boards. *Failure scenario:* G251 is fixed, this board's check
newly disagrees with its `.vrt` over a missing pad, and the cause looks like the
BOM change.

### Minor

**M1 - one micro-loss in the −17.** `agreeOnNets` compares members with
`includes`-based set difference where the old loop used `toEqual` on arrays. A
model net listing the same node twice would now be invisible. It cannot arise
from a pin map, so this is a note rather than a defect; order sensitivity is
*not* a loss, because `asDesignatorNets` sorts.

**M2 - G288's own totals do not reproduce.** The entry says *"261 entries
defined, 277 referenced"*; at this commit I count **262** `### G<n>` headings
and **213** distinct referenced numbers. The **dangling set reproduces exactly**,
which is the load-bearing claim, and 261 is what the script would have returned
before G288's own heading was added - `docs/schematic/false-greens.md`
mechanism **23**, *a figure published about the artifact the change is still
editing*, in the entry that exists to catch this class.

**M3 - the deliberately stale citation: defensible, but a third option was not
considered.** Leaving `label-syntax/fixtures.ts:83` alone keeps Task 1's
committed `probe-run.log` corresponding to the code that produced it, and I
confirmed `[RAN]` that nothing compares that log to a re-run
(`net-name.test.ts:194` asserts only that a refusal cites the log's *path*;
`document-pastes.test.ts` reads the text-metrics, elk-labels, label-freedom and
field-order logs, not this one). So the decision is right on its stated
trade-off. But it leaves live source carrying a false line citation - *"and
:190's clk_o_unused port"*, where line 190 and the port are both gone - which
is the same class of false citation the task corrected for G159's tool output.
A third option meets both: keep the `why` string byte-identical so the log
still matches, and add a dated note *beside* it saying the port was deleted on
2026-10-24. Worth one line in G283.

**M4 - the `1 of 11` is fragile, and that was measured here rather than
claimed.** Declaring any one of `supply_bypass_local`, `supply_bulk`,
`oscillator_cc0_bypass`, `lpf1_node_filter_cap` or `regen_node_filter_cap`'s
GND pin `NC` - a one-line change each - flips `pt2399-core` straight back to
`refused`, four times at *"net GND branches at (x, y) (t-junction) and no
junction is emitted there"* and once at a power-symbol glyph touch. Two of six
candidates still generate. Nobody should read `1 of 11` as a board that has
settled. Not recorded anywhere; it belongs beside G285.

**M5 - half the PDF is empty.** Page 1 of 2 is the hierarchical root: one
empty sheet symbol with no hierarchical pins, so the five declared interface
ports do not appear on it. Consistent with the child sheet having no
hierarchical labels, so it is not a correctness defect - but a reader opening
the artifact meets a blank page first.

---

## Spec compliance, clause by clause

| spec clause | status |
| --- | --- |
| §3's `pt2399-core` block - *"remove the fake port and declare the pin `NC`"* | **met.** The port, the module paragraph that documented its falsehood, the `portDirections` entry and the `negotiablePort` are all deleted; the pin map says `NC` |
| decision (1) - *"only a pin explicitly declared `NC` in the authoritative model may be matched to an unconnected pin or a synthetic placeholder"* | **met**, and driven: widening the key to the net's shape reddens the discriminating arm |
| decision (1) - *"never a class of shapes the comparison tolerates"* | **met.** No `unconnected-*` match, no one-member-net class, at either site |
| §3b - `NC` represented at all four stages | **met.** `{kind:"nc"}` in the model; `IrPin.net === null` asserted in `authoring-complete.test.ts`; `(no_connect` asserted in the sheet bytes; the synthetic export name expected by name at both comparison sites |
| §3b - *"four states must stay distinguishable"* | **met as far as it can be, and the limit is recorded.** States 3 and 4 are indistinguishable downstream of the netlist - G287, driven here |
| §3b - **required gate** | **met.** Whole project generated from `circuits/`, real `kicad-cli`, all five round-trip comparisons, fails rather than skips |
| Third-party review finding 5 | **met**, and the brief's own illustration of it corrected |
| *"Deleting or loosening any other assertion is not [correct]"* (§2) | **met.** The one inverted test (`authoring-complete.test.ts`) is strictly stronger: it now asserts the rule found nothing *and* that the three sites carrying the fake port carry it no longer, each in a direction a re-added port would fail |
| *"An agent may never author the acceptance criteria for the artifact it is producing"* (`CLAUDE.md`) | **met.** G284 names its preferred mechanism as untried and authors no criterion for the twelve; G285 leaves G240's criterion untouched and says plainly what was not confirmed |

---

## Tree state

`[RAN]` SHA-256 over all **1304** tracked files before and after this review:
**identical**. `git status --porcelain` **empty**. The throwaway worktree at
`4be4815` is removed and `git worktree list` shows only the six pre-existing
ones. Every perturbation - `pt2399-core.ts` (seven times),
`pt2399-nc-round-trip.kicad.test.ts`, `pt2399-core.test.ts`,
`lib/schgen/render/emit.ts`, `lib/kicad/from-network.ts`,
`docs/schematic/template-parity.md` - was restored and verified by hash. All
generated projects, PDFs, PNGs, logs and scripts are in the scratchpad.
