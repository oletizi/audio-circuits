# Net names and floating pins: getting six boards past validation

**Status: written 2026-10-23, awaiting owner review. Nothing implemented.**

Six of the eleven boards in `boards/` never reach geometry — they refuse at
`validateCircuit`, before any text is placed. This design removes the reasons.

It follows from three things already decided: the owner's instruction that
**letter case of net names is not a constraint** (`G150`, 2026-10-23, verbatim:
*"i absolutely do not care about the letter case of net names. That's a silly
quibble."*); the measurement that **those six boards each carry net-name
violations plus exactly one other problem** (`G274` clause 2); and `CLAUDE.md`'s
rule that a refusal whose reason cannot be stated should not exist.

**It promises no drawn schematics.** See *What this does not promise*.

---

## The three pieces, and the order is load-bearing

### 1. Measure what KiCad accepts in a label — FIRST

**Why this comes first.** The casing rule refuses two different things with one
message. `hi_boost_out` fails on **case alone**, which is the silly part.
`pt2399-core`'s nets look like **`Net-(C10-Pad1)`** and `unconnected-(U1-CLK_O-Pad5)`
— those fail on case **and on parentheses, hyphens and brackets**. Deleting the
rule admits the second kind into the emitter, and **nobody has ever checked
whether KiCad accepts those characters in a global label.** `G150`'s own relax
mechanism flagged exactly this: *"nobody has checked what KiCad does with
`Net-(U1-REF)` as a global label."*

Deleting the rule before measuring would risk emitting a `.kicad_sch` that KiCad
mangles or rejects, and the failure would be silent.

**What to measure**, with a committed probe under `tools/schgen/` declared
`handWritten` in `port-manifest.json`, and a committed log:

- Does `kicad-cli` **parse** a sheet carrying a global label named
  `Net-(C10-Pad1)`?
- Does the **net name survive a netlist round trip** byte-for-byte, or does KiCad
  re-quote or rename it? The repository has a round-trip contract, so a rename
  breaks a gate rather than merely looking different.
- Does it **render**, and is the label legible in the PDF export? (Not SVG —
  `G265` clause 1 records that SVG omits a global label's outline.)
- Which characters, if any, the s-expression writer must **quote or escape**.

**Three outcomes, each implying a different part 2:** KiCad accepts them, and the
rule can go entirely; KiCad accepts but re-quotes, and the writer needs the
escaping and the round-trip comparison needs to know; or KiCad rejects them, and
those nets need renaming — which is a different and larger change than this
design, and would come back for review.

**A SECOND, SEPARATE QUESTION, added 2026-10-23 on third-party review, and it is
the best thing the review raised: do these nets need to be LABELS at all?**
*"`Net-(C10-Pad1)`"* is a name **KiCad generated** for an otherwise unnamed net.
Whether KiCad accepts it as a label is a syntax question; whether the generator
should *display* a label for every net is an **authoring-policy** question, and a
valid schematic connects parts with wires without labelling internal nets. If the
electrical partition survives without rendering synthetic names, that is
preferable to drawing `unconnected-(U1-CLK_O-Pad5)` on a sheet.

**Three corrections to how the review framed it, each driven:**

- **The generator does not label every net.** `[READ]` labels come from
  `anchorsToSymbols`, which `render/cross-sheet.ts:29` records as emitting for a
  block's **boundary** — so internal nets already go unlabelled, and the policy
  the review asks for is substantially the one in force.
- **It would clear none of the measured blockers.** The collisions refusing
  boards are on **authored** names — `BYPASS_JUMPED`/`BYPASS_CAP` and
  `BUFFER_BASE`/`BUFFER_EMITTER` — not synthetic ones. The review hedged to *"may
  eliminate some geometry problems"*, which is fair, but the measured count it
  eliminates is **zero**.
- **On `pt2399-core` it is already handled by part 3.** The synthetic name
  becomes a label *only because of the fake port*, since ports are boundary nets.
  Deleting the port removes the label.

  > **THAT MECHANISM IS REFUTED, 2026-10-23, BY THIS PLAN'S OWN TASK 1, AND THE
  > WORDING ABOVE STANDS AS WRITTEN.** `[RAN]` **a declared port does NOT make a
  > net a label.** `lib/schgen/ir/build.ts:152` sets `offSheet` **empty
  > unconditionally**, so `labelledNets` labels only a rail, a net spanning two
  > blocks, or a net touching a `bus` block — and `pt2399-core` is one block.
  > **The conclusion survives and is stronger than this bullet claimed: the label
  > was never there to remove.** The boundary census is **zero** — 16 synthetic
  > names exist, all on `pt2399-core`, and none reaches a global label. See
  > **G277**.
  >
  > **Anyone reading this bullet rather than the register would reason from a
  > false premise**, which is why the correction sits here rather than only in
  > `G277`. The criterion was right and the mechanism was mine and wrong — the
  > fourth time on this branch that pairing has come up, which is the whole point
  > of this repository keeping them distinct.

**So the residual is a measurement rather than a policy change: does any
synthetic net name cross a block boundary on any board?** If none does, the
question is closed by the architecture and the probe can say so.

### 2. Remove the casing demand

`NET_NAME` is defined at `lib/schgen/ir/types.ts:55` as `/^[A-Z0-9][A-Z0-9_]*$/`
and has **three live call sites, not one:**

| site | what it is | what happens to it |
| --- | --- | --- |
| `lib/schgen/ir/validate.ts:50` | the `netNames` rule — **the blocker** | removed |
| `lib/schgen/gates/pin-table.ts:60` | a **gate that throws** on a non-matching net | narrowed, not deleted — see below |
| `lib/schgen/authoring.ts:387` | a census helper exported for `G150`'s measurement | removed with the entry's measurement, or kept and renamed if `G150`'s figures are still cited |

**The gate needs care and is the one place to get this wrong.** `pin-table.ts:60`
reads `if (typeof net !== "string" || !NET_NAME.test(net)) throw fail();` — two
checks in one condition. The **type** check must stay. Only the **format** check
goes, or is replaced by whatever part 1 establishes is actually required. A gate
is a guard, and this repository's standing practice is that weakening one to make
code pass is the defect, not the fix.

**AND THE REPLACEMENT PREDICATE MUST BE WRITTEN DOWN, not left as "drop the
regex" — added 2026-10-23 on third-party review, which caught this precisely.**
Reducing the condition to `typeof net !== "string"` **admits the empty string.**
The canonical model's own `net()` helper refuses an empty name, so a gate that
accepted one would be **weaker than the contract it exists to guard** — the exact
shape of defect this section warns about, in the change meant to avoid it.
**Minimum replacement: a non-empty string, plus whatever part 1 establishes KiCad
requires.** *Removing a naming convention is not removing input validation.*

**The tests must separate the four cases** so a future loosening cannot pass
unnoticed: a lowercase name (accepted), a KiCad synthetic name (accepted or
refused per the measurement), an **empty string** (refused), and a non-string
(refused).

**Tests that assert the casing refusal go with the rule.** Deleting a test
because it asserts a rule being deliberately removed is correct. **Deleting or
loosening any other assertion is not**, and the diff should show no other test
weakened.

**Explicitly out of scope:** `partShapes` in the same file carries a separate
UPPER_SNAKE demand on **part labels** (`lib/schgen/ir/validate.ts`, via `LABEL`).
The owner's decision names net names and this design does not extend it. In
practice that rule never fires, because reference designators are uppercase
anyway.

### 3. The six floating pins

**The mechanism exists and has never been used.** `lib/model/types.ts:42`
exports `NC: Connection = { kind: "nc" }`, and `circuits/opamp-buffer.ts:64`
states plainly that *"no pin here is an explicit no-connect, and this circuit
authors no `NC`."* A repository-wide search finds no circuit authoring it. **So
this is `NC`'s first use, on six pins at once**, and the risk is an untested path
rather than a complicated one.

**Two different rules produce the six problems**, and conflating them is how this
gets done wrong:

- **`lib/schgen/ir/validate.ts:72`** — *"pin N is neither on a net nor declared
  not connected"*. Fires on the **five Pultec boards**, one pin each: the rotary
  switches' **mounting pin** (`MP` on four, pin `12` on `SW_MID`).

  > **REVISED 2026-10-23 ON THIRD-PARTY REVIEW. The first version of this
  > paragraph said the pin *"is the mechanical lug that bolts the switch to the
  > panel. It connects to nothing, and declaring `NC` says exactly that."* **That
  > inferred electrical isolation from the pin's NAME**, which is precisely what
  > `CLAUDE.md`'s *"verify names against the thing itself"* forbids, and the
  > review was right to stop it. **A mounting terminal may be isolated, or may be
  > bonded to chassis, shield or switch frame** — and if it is bonded, `NC` is a
  > false declaration that would hide a real connection.
  >
  > **The tell was in front of me: four switches call this pin `MP` and one calls
  > it `12`.** Two different names is a reason to check whether they are two
  > different things, not to batch them.
  >
  > **REQUIREMENT: each of the five pins is classified from the symbol's own pin
  > definition and the switch's documentation, individually, before any `NC` is
  > authored.** Where a terminal is bonded to chassis or shield, that connection
  > is represented explicitly rather than declared absent. Five pins may not come
  > out the same way.
  >
  > **AND THE REVIEW'S RECOMMENDED MECHANISM IS DECLINED, with the deviation
  > recorded as this repository's criterion-versus-mechanism rule requires.** It
  > proposed using *"the existing mechanical-pin authority, `PinTable.mechanicalPads`,
  > which supports explicit `net` and `nc` declarations."* `[READ]` that is a
  > **footprint-pad** concept, not a schematic-pin one: `lib/schgen/from-network.ts:29`
  > states *"`PartSpec.pads` in the model maps a canonical pin to a footprint
  > pad"*, `from-network.ts:359` sets `mechanicalPads: []` so it is **always empty
  > on the network-derived path this generator uses**, and `lib/schgen/gates/pin-identity.ts`
  > consumes it to compare pads against a pin table. **It carries no authority on
  > whether a schematic symbol pin is electrically isolated.** The criterion —
  > classify from verified semantics, never from "currently floating" — is
  > adopted; the mechanism is not.
- **`lib/schgen/ir/validate-nets.ts:17`** — *"net X has only one pin; connect it
  or declare the pin not connected"*. Fires on **`pt2399-core`**, whose PT2399
  pin 5 (`CLK_O`) is unused.

**And `pt2399-core` already has a workaround, which is the interesting part of
this whole design.** Its model carries KiCad's placeholder net
`unconnected-(U1-CLK_O-Pad5)` verbatim, because the schematic is authoritative
and the model is derived from the netlist export. To satisfy validation it then
declares a **port**:

```
.port("clk_o_unused", "unconnected-(U1-CLK_O-Pad5)")
```

and its module comment says what that port means:

> *"the port does not imply the pin does anything off-board, only that the
> netlist shows it on a net rather than showing no connection at all."*

**A port is "a net that leaves the board." `CLK_O` does not leave the board.**
So the model states something false and documents the falsehood in a comment —
to satisfy a rule. That is the pattern `CLAUDE.md` now names, found a fourth
time, and found in the repository's own authored source rather than in a tool's
demand.

It also **does not work**: the port satisfies `lib/model`'s own validation
(`done()`), and `lib/schgen/ir/validate-nets.ts:17` still refuses the board.
**One workaround, two validators, and it only ever satisfied one of them.**

**Recommendation: remove the fake port and declare the pin `NC`**, so the model
says the true thing instead of the false thing with an explanation. This is the
one piece with a real consequence and it is the first decision for review.

### 3b. `NC` IS AN ELECTRICAL ASSERTION, NOT A VALIDATOR BYPASS — the transformation contract

**Added 2026-10-23 on third-party review**, which was right that the first
version treated the consequence of `NC` as an adjustment to netlist comparison
when it is more than that. **`NC` must survive every stage, and each stage
represents it differently:**

| stage | representation |
| --- | --- |
| canonical model | `Connection` tagged `{ kind: "nc" }` — `lib/model/types.ts:42` |
| schematic IR | `IrPin.net === null` — *"Null means explicitly not connected"*, `ir/types.ts:247` |
| emitted `.kicad_sch` | a **`no_connect` marker** at the pin endpoint |
| exported netlist | KiCad may assign a synthetic name to the pin; the comparison must expect that |

**Four states must stay distinguishable**, and conflating any two is the defect:
a pin **deliberately** declared `NC`; a pin **accidentally omitted** from the
model; a pin marked no-connect **in the KiCad schematic**; and a pin that merely
**has no wire attached**. Omitting a wire is not equivalent to documenting an
intentional no-connect — KiCad's own ERC treats a bare dangling pin as a defect
and a marked one as intent.

**The capability already exists in code, so this is a contract to state and wire
rather than emitter work to build** — a correction to the review's framing, which
read as though the marker might be missing. `[READ]`: `render/emit-items.ts:215`
defines `noConnect()`, `render/emit.ts:169` emits `d.noConnects`, and
`lib/kicad/schematic.ts:186` writes the `(no_connect …)` form. **The inverse
guard also already exists:** `ir/validate-nets.ts:47` refuses *"pin X is a
no_connect pin but is on net Y"*, so one of the four confusions is enforced
against today.

> **TWO CORRECTIONS TO AN EARLIER DRAFT OF THIS PARAGRAPH, and the first is the
> kind of error this repository has shipped twice.** It cited
> **`noConnectEnds.test.ts`** as already testing the marker. **No such file
> exists.** The test is `tests/schgen/render/no-connect-ends.test.ts` —
> kebab-case — and the camelCase name was **copied out of
> `lib/schgen/README.md:303` rather than checked against the tree**, which is
> exactly what `CLAUDE.md`'s *"verify names against the thing itself"* forbids and
> why that rule exists.
>
> > **AND THE SENTENCE THAT STOOD HERE BLAMED THE README, WRONGLY. Corrected
> > 2026-10-23 by this plan's Task 2.** It read: *"The README's name is stale and
> > is a separate small defect."* **It is not stale and it is not a defect.**
> > `[READ]` `lib/schgen/README.md:303` names those four files inside a sentence
> > about what **Task 7 PORTED**, and all four exist **upstream** in camelCase —
> > `bodyClearance.test.ts`, `textClearance.test.ts`, `unitText.test.ts`,
> > `noConnectEnds.test.ts`, verified in the sibling repository — while all four
> > local equivalents are kebab-case. The README is correctly naming the source
> > files. **My original error stands (I cited a local path that does not exist);
> > what was wrong was blaming another document for it, which I asserted without
> > reading the context it was written in.** That is a worse error than the first,
> > because it put a false defect claim about a correct document into an approved
> > spec.
>
> Second: the draft said the capability was *tested*, and softened that to a test
> merely existing because `lib/schgen/README.md` lists `emit-items.ts` among the
> modules nothing runs.
>
> > **BOTH HALVES OF THAT ARE NOW SUPERSEDED BY MEASUREMENT, 2026-10-23, Task 2.**
> > `[RAN]` full-suite lcov at a clean tree: `lib/schgen/render/emit-items.ts` is
> > **LF=137, LH=137 — no uncovered lines** — and **no module under
> > `lib/schgen/` has zero coverage.** `noConnect()`'s body is exercised by six of
> > the seventeen emitter-reaching test files, and generating the `mini` fixture
> > writes **three `(no_connect …)` items**, one of which `round-trip.kicad.test.ts`
> > exports with real `kicad-cli` — **so KiCad already reads a
> > generator-emitted no-connect.** The README sentence I leaned on is **dated
> > narrative that the README itself reverses a hundred lines later**, and even the
> > reversal is now stale. **Measuring it was the instruction; the instruction was
> > right and the premise behind it was not.** See **G278**.

**Required gate, not a serialization detail:** an end-to-end test proving
`pt2399-core` pin 5's `NC` status survives generation **and** round-trip
verification.

---

## Decisions for review

**(1) `pt2399-core`: declare `NC`, or relax the one-pin-net rule instead?**

Declaring `NC` makes the model truthful and deletes the fake port. **Its cost:**
the model's net set would no longer mirror the netlist export exactly, and a
verification test compares the two — so that test has to learn that *a KiCad
placeholder net maps to `NC`* is an expected difference rather than a drift. The
schematic stays authoritative; the derivation gains one documented rule.

> **AND THAT ALLOWANCE MUST BE PIN-SPECIFIC — added 2026-10-23 on third-party
> review, which identified this as the single biggest risk of weakening the
> round-trip gate, and I agree without qualification.** A broad rule of the form
> *"a single-pin net corresponds to an intentional `NC`"* would **hide a genuine
> connectivity mistake**: a resistor terminal accidentally dropped during model
> transformation also appears as a single-pin net, and the gate exists to catch
> exactly that.
>
> **Only a pin explicitly declared `NC` in the authoritative model may be matched
> to an unconnected pin or a synthetic placeholder in KiCad's export.** Every
> other missing connection stays refused. The allowance is a named exception for
> one declared pin, never a class of shapes the comparison tolerates.

Relaxing the rule instead is the other reading, and it has a real argument:
**KiCad itself generates `unconnected-(...)` nets for floating pins**, so a rule
that refuses them is refusing KiCad's own output — which may be a fifth instance
of the same pattern rather than a legitimate demand. **I recommend `NC`** because
the rule is doing useful work in the other five cases: a pin you forgot to wire
looks exactly like a pin you left open on purpose, unless someone says which.

**(2) If part 1 finds KiCad mangles the punctuation** — rename those nets in the
derivation, or teach the writer to escape them? This cannot be decided before the
measurement, and it comes back for review if the measurement forces it.

---

## What this does not promise

**It does not promise six drawn schematics, and the research is explicit about
why.** `G274` records that the board census **names the first refusing problem,
not the only one.** Fixing the named problem on a board may reveal the next one
behind it. That finding falsified two claims in a closed section of the research
document and it applies here.

**The honest outcome is six boards reaching the layout stage for the first
time**, where nobody has measured what they hit — because they have never got
past validation. The five boards that *do* reach layout all fail there, on a
power-symbol glyph collision (two boards), a missing junction (one), and
label-over-label overlaps (two).

**This design contains no text-placement work.** The owner's three overlap
decisions — minimise rather than gate, KiCad's own text box governs, annotate
rather than refuse — are recorded in `G260` and `G265` and are a separate piece
of work.

## Risks

- **`NC`'s first use.** Exported, documented, never exercised. Expect the IR,
  the emitter and the gates each to meet a `null` net for the first time.
- **The gate at `pin-table.ts:60`.** Narrowing a guard is the step most likely to
  weaken something quietly. The type check stays.
- **Test deletion.** Removing tests that assert the deleted rule is right;
  anything else weakened in the same diff is not.
- **The round-trip contract.** Both part 1's outcome and decision (1) can move
  what the generated netlist is compared against.

## Third-party review, 2026-10-23 — verdict and disposition

Reviewed at git blob `3717848`: **"Approve the direction, request revisions
before implementation."** Two High, three Medium. **All five are accepted on
their criteria; two had their mechanism or framing corrected, each driven against
the tree rather than argued.**

| finding | verdict | what changed |
| --- | --- | --- |
| **1 High** — `NC` must survive the whole transformation, with a real no-connect marker | **accepted, scope corrected** | the contract is now §3b. **The capability already exists** (`emit-items.ts:215`, `emit.ts:169`, `kicad/schematic.ts:186`, `noConnectEnds.test.ts`) and one of the four confusions is already guarded (`validate-nets.ts:47`), so this is contract work, not emitter work |
| **2 High** — mechanical pins must not be classified `NC` by default | **criterion accepted, mechanism declined** | my paragraph inferred isolation from the pin's **name**, against `CLAUDE.md`'s own rule — corrected in place. But `PinTable.mechanicalPads` is a **footprint-pad** concept, **always empty** on this path (`from-network.ts:29`, `:359`), and carries no authority over schematic-pin isolation |
| **3 Medium** — synthetic names are exporter artifacts, not necessarily labels | **accepted, three corrections** | the best finding in the review. But labels are already **per boundary anchor**, not per net (`cross-sheet.ts:29`); it clears **zero** measured blockers, which are on authored names; and on `pt2399-core` deleting the fake port already removes the label |
| **4 Medium** — the gate needs an explicit replacement predicate | **accepted, no caveat** | `typeof net !== "string"` alone admits the empty string, which `net()` refuses — the gate would end up weaker than the contract it guards |
| **5 Medium** — `NC` round-trip equivalence must be pin-specific | **accepted, no caveat** | the biggest risk of weakening the gate. A blanket single-pin-net rule would hide a dropped resistor terminal |

**What the review endorsed and this design keeps unchanged:** remove the casing
requirement; measure KiCad before touching the emitter; delete the fake `CLK_O`
port; keep strict pin validation; keep text placement out of scope; promise no
drawn schematics.

**Its acceptance-test table is adopted**, with one row re-labelled: *"Pultec
mechanical pins — classified from verified mechanical-pin semantics"* stands as a
criterion, but the authority is the symbol pin definition and the switch
documentation, not `mechanicalPads`.

## Verification

- `SCHGEN_SOURCE=… bun test` — currently **3812 pass / 0 fail / 43602 `expect()`
  across 353 files**. Any move accounted for term by term.
- `bun run typecheck` clean.
- `make check` is red on four boards for causes recorded in **G251**, red at the
  old `main` for the same missing export, and **not this design's to fix.**
- The per-board census re-driven, so the before/after is measured rather than
  asserted: `bun tools/schgen/board-sheets.ts`.
