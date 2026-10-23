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
  switches' **mounting pin** (`MP` on four, pin `12` on `SW_MID`). That is the
  mechanical lug that bolts the switch to the panel. It connects to nothing, and
  declaring `NC` says exactly that.
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

---

## Decisions for review

**(1) `pt2399-core`: declare `NC`, or relax the one-pin-net rule instead?**

Declaring `NC` makes the model truthful and deletes the fake port. **Its cost:**
the model's net set would no longer mirror the netlist export exactly, and a
verification test compares the two — so that test has to learn that *a KiCad
placeholder net maps to `NC`* is an expected difference rather than a drift. The
schematic stays authoritative; the derivation gains one documented rule.

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

## Verification

- `SCHGEN_SOURCE=… bun test` — currently **3812 pass / 0 fail / 43602 `expect()`
  across 353 files**. Any move accounted for term by term.
- `bun run typecheck` clean.
- `make check` is red on four boards for causes recorded in **G251**, red at the
  old `main` for the same missing export, and **not this design's to fix.**
- The per-board census re-driven, so the before/after is measured rather than
  asserted: `bun tools/schgen/board-sheets.ts`.
