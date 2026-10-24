
# Mechanical symbol pins: the schematic validator should not demand an electrical disposition for a mount lug

**Status:** written 2026-10-24, approved by the owner in conversation the same
day. Bounded change. Awaiting his review of this file before implementation.

**The register entries this corrects:** `docs/known-gaps.md` **G282** (its owner
question is struck by this spec), **G264**, **G259**.

## 1. The question that produced this, and the three layers that came off

Four Pultec boards refuse at `validateCircuit`, one problem each:

> `part SW_HI_BOOST: pin MP () is neither on a net nor declared not connected`

`G282` closed as an **owner question**, naming two things only he could answer:
*which rotary switch is fitted*, and *whether its mount lug is to be wired to
net `"0"`*. He asked three questions and all three layers came off:

1. **"Why do you need to know which rotary switch is fitted?"** — I did not. I
   had treated *"is that lug at chassis potential?"* as a fact about the part.
   But a schematic's `NC` does not claim the terminal is floating in the
   physical world; it claims **no conductor in this circuit reaches it**. The
   panel is not in the circuit model at all, so whether the frame touches a
   grounded panel cannot make `NC` false. `G282` itself recorded the symbol
   showing `MP` as *"a terminal on the body, not internally connected to the
   contacts"* — the whole electrical truth, already on disk.
2. **"Why do you need the specific part number of a component in a
   schematic?"** — I did not, and `CLAUDE.md` already said so. A fully
   specified BOM *"binds when someone else sources and places the parts… never
   for a schematic"* (**G245**, his own earlier correction). I then invented a
   fresh reason to need an MPN before drawing.
3. **"Why do you need to specify a mechanical part in the schematic?"** — I do
   not, and I cannot avoid it either: **KiCad's library has no single-pole
   rotary symbol without a mount pin.** `1x3_MP` through `1x9_MP` are `_MP`
   only; the non-`MP` rotaries are `1x12`, `2x6`, `3x4`, `4x3`. The mount pin
   rides along with the only symbol that draws a six-position selector.

**And the answer was in a code comment the whole time.**
`circuits/pultec/schematic/section-board.ts:162`, written before any of this
work:

> *"`SW_Rotary_1x6_MP` also carries a mounting pin `MP`, which is a mechanical
> pad and is on no net in the model"*

**So the blocker is ours.** `pinsDeclared` demands that *every* library pin be
on a net or declared `NC`, with no notion of a pin that is mechanical. This is
the fourth instance of the pattern `CLAUDE.md` names — **a refusal whose reason
cannot be stated** — and as with the other three, the owner caught it and no
agent or review did.

## 2. Why "just declare `MP: NC` on the four boards" is not the fix

It is the mechanism `G282` recorded as untried, and it is the obvious cheap
move. **It is measured to break the boards.** `G282` clause 2 drove exactly
this for `SW_MID`'s pin 12: adding the pin to the unit's pin map cleared
`validateCircuit` and turned `make -C boards/pultec-mid check` from exit 0 to

> `SW_MID retyped PADS12 -> PADS13`

because a switch's unit pins **are** its board landings on this path —
`padOrderFor` (`circuits/pultec/physical/parts.ts:464`) sends `kind: "switch"`
to `rotaryPadOrder` (`:246`), which reads `units[0].pins`, and its own words are
*"an off-board part's pads are the wire landings a builder solders to."* **A
landing for a terminal no wire reaches is wrong for the board**, so the
committed layout is right to disagree.

`G282` states the gap in one sentence: **one model field serves two consumers
with different needs.** The schematic needs the symbol's full terminal set; the
board needs the wired subset. Declaring `NC` pays the board to satisfy the
schematic.

**This spec takes the other side of that gap:** keep the mechanical pin out of
the model entirely — it is a property of the *library symbol*, not of the
circuit — and teach the schematic validator not to ask about it.

## 3. The design

### 3.1 A per-symbol table of mechanical pins

New file `lib/schgen/ir/mechanical-pins.ts`:

```ts
/** Library pins that are mechanical mount points: a terminal on the symbol body that no
 *  conductor inside the symbol reaches. Keyed by KiCad library id.
 *
 *  READ OFF THE INSTALLED LIBRARY, NOT REMEMBERED (CLAUDE.md: "verify names against the
 *  thing itself"). Re-verify any entry with:
 *
 *    awk '/\(symbol "<libId-without-prefix>"/,/\(symbol "<next>"/' \
 *      "$KICAD_SYMBOL_DIR/Switch.kicad_sym" | grep -E '\(number "|\(pin '
 *
 *  An entry is a deliberate edit with a test beside it, never a silent widening: a
 *  whitelist that refuses loudly beats a general rule that accepts a guess.
 */
export const MECHANICAL_PINS: Readonly<Record<string, readonly string[]>> = {
  "Switch:SW_Rotary_1x6_MP": ["MP"],
  // further entries added only as a board needs one, each verified against the library
}
```

**WHAT A TABLE ENTRY MEANS, AND WHAT IT DOES NOT** (third-party review finding
5, accepted verbatim as the limiting sentence):

> The listed symbol pin **may be omitted from the circuit's electrical
> connections without error.** It does **not** mean the physical mounting
> feature can be ignored for PCB design, electrical bonding or safety
> analysis.

The exemption is about **schematic completeness only**. Nothing here says a
mount lug is electrically irrelevant in the world; it says the canonical
electrical model is not required to carry a terminal no conductor in the
circuit reaches.

**Only `1x6_MP` goes in on this change.** Ten symbols in KiCad's `Switch`
library carry an `MP` pin — the seven rotaries `1x3_MP`…`1x9_MP` and three
MPN-named slide switches `SW_SP3T_NR01103`, `SW_SP4T_NR01104`,
`SW_SP5T_NR01105` — and `circuits/pultec/physical/parts.ts:162-168` already maps
selector positions 3..9 onto the `_MP` family, so the rest will be wanted
eventually. They are **not** added speculatively. `CLAUDE.md`: *"An empty
whitelist that refuses loudly beats a general rule that quietly accepts a
guess."*

### 3.2 Why a table and not geometry inference

The tempting alternative is to derive it: a pin is mechanical when no graphic
stroke endpoint lands on its body-side end. **It was investigated, and the
first version of this section rejected it for a reason that is WRONG. The
reason is replaced by a measurement, and the wrong one is shown rather than
edited away** — `CLAUDE.md`'s rule that a mechanism is advice from someone who
had not yet tried it.

> ~~`UnitGraphics.segments` flattens rectangle edges and polyline legs into the
> same list, and `MP`'s inner end sits **on** the body rectangle — as does the
> pole pin 7's. A naive "does a stroke touch it" test says yes for both.~~

**It discriminates perfectly on this symbol, which is exactly why it is a trap.**
`[RAN]` the resolver over `Switch:SW_Rotary_1x6_MP`: counting stroke
**endpoints** at each pin's body-side end gives **1 for all seven electrical
pins** (throws 1–6 and pole 7) and **0 for `MP`**. Point-on-segment *touch*
counts are 2 against 1. So the rule I claimed could not tell them apart tells
them apart cleanly.

**AND THEN IT FAILS CATASTROPHICALLY ON ORDINARY SYMBOLS, in the dangerous
direction.** `[RAN]` the same test over nine symbols this repository uses,
counting electrical pins it would misclassify as mechanical:

| symbol | pins | would be flagged mechanical |
| --- | --- | --- |
| `Switch:SW_Rotary_1x6_MP` | 8 | **1** — `MP`, correct |
| `Switch:SW_Rotary_1x12` | 13 | 0 |
| `Transistor_BJT:2N3904` | 3 | 0 |
| `Device:R` | 2 | **2 — both terminals** |
| `Device:C` | 2 | **2 — both terminals** |
| `Device:R_Potentiometer` | 3 | **2** |
| `Switch:SW_SPDT` | 3 | **3 — all of them** |
| `Connector_Generic:Conn_01x02` | 2 | **2** |
| `Amplifier_Operational:TL072` | 8 | **6** — `-`, `+`, `V-`, `+`, `-`, `V+` |

A symbol's body graphic frequently just **abuts** its pins with no stroke
endpoint at the junction, so the rule would exempt most pins in the repository
and **disable `pinsDeclared` almost entirely** — silently, while every test
that does not happen to cover a flagged pin keeps passing. **A false positive
here exempts a genuinely undeclared electrical pin, which is the exact defect
the gate exists to catch.**

**So the whitelist is right, and now for a measured reason instead of a guessed
one:** a general rule validated on the single symbol that motivated it is
`CLAUDE.md`'s *"general rule that quietly accepts a guess"*, and this one is
wrong on 17 of the 35 pins of eight other symbols. `docs/known-gaps.md`
**G290** carries the measurement, because the idea looks clean on the one
symbol a reader will try it on.

### 3.3 The validator change

`lib/schgen/ir/validate.ts`, `pinsDeclared` (`:151-161`) — skip a library pin
listed as mechanical for that part's `libId`:

```ts
const pinsDeclared: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const have = new Set(c.pins.filter((q) => q.part === p.label).map((q) => q.pin));
    const mechanical = new Set(MECHANICAL_PINS[p.libId] ?? []);
    for (const lp of symbols.resolve(p.libId).pins) {
      if (mechanical.has(lp.number)) continue;
      if (!have.has(lp.number)) out.push(`part ${p.label}: pin ${lp.number} (${lp.name}) is neither on a net nor declared not connected`);
    }
  }
  return out;
};
```

**Editing this file is sanctioned and already documented.** `validate.ts` is a
**diverged** port — its header says *"It no longer re-derives from the pedals
source… **edit this file**"* — and its `port-manifest.json` divergence entry
exists because of `G245`, the BOM gate, which is the same owner correction in
the same rule list. This change extends that entry rather than opening a new
kind of deviation.

**Nothing else is relaxed.** `pinSemantics`, `singlePinNets`, `unitsPlaced`,
`validateSourcing` and the `pin-identity` gate are untouched.

**THE EXEMPTION IS ALLOW-OMITTED, NOT SKIP-IF-PRESENT, AND THE SKETCH ABOVE
ALREADY HAS THAT PROPERTY** — review finding 1 asked for a code change here and
it is **declined, with the reason stated** rather than silently ignored.

`pinsDeclared` reports exactly one thing: a library pin that is **missing** from
the circuit's declarations. Its only `out.push` is guarded by `!have.has(...)`.
So when `MP` **is** explicitly declared, `have.has("MP")` is true and the
refusal could not fire regardless of the `continue` — the `continue` skips a
check that is already inert in that case. The two cases finding 1 says are
*"treated identically"* are indeed both silent here, and that is correct,
because neither is an undeclared pin.

**What finding 1 is actually asking for is already true, and it is true
elsewhere in the validator.** An explicitly declared `MP` stays subject to
normal validation by the rules that iterate `c.pins` rather than the symbol's
pin list, and none of them consult `MECHANICAL_PINS`:

- `singlePinNets` (`validate-nets.ts:12`) refuses `MP` alone on a net —
  *"net X has only one pin (SW_HI_BOOST.MP); connect it or declare the pin not
  connected"*;
- `pinSemantics` (`:34`) still applies its `power_in`, `no_connect` and
  multiple-driver checks to it;
- `pin-identity` and the round-trip gates are unchanged.

So a deliberate bond of a mount lug to chassis ground remains representable
**and** validated. **Finding 1's test is accepted even though its code change
is not** — arm 6 in §4 pins the behaviour down so a later refactor cannot
quietly turn the exemption into a blanket skip. That is the half of the finding
with teeth.

### 3.4 A stale table entry must refuse, not silently pass

A `MECHANICAL_PINS` entry naming a pin the symbol does not have would quietly
exempt nothing while looking correct — the shape of defect that has twice
shipped a KiCad footprint that does not exist. So `pinsDeclared` also refuses
when an entry is unresolvable against the symbol:

> `part <label>: MECHANICAL_PINS lists pin "<n>" for <libId>, which has no such pin; the table is stale — re-verify it against the installed library`

**IMPLEMENTATION TRAP, and the §3.3 sketch gets it wrong.** This check cannot
live inside the `for (const lp of symbols.resolve(...).pins)` loop: a stale
entry names a pin the symbol does **not** have, so that loop never reaches it
and the refusal could never fire. It must iterate **the table's entries against
the symbol's pin set**, outside and before the pin loop. A guard that cannot
fire is the exact failure this repository's practices exist to prevent.

### 3.5 Drift: vendor the symbol rather than record a hash

Review finding 2 is right that the §4 arm 1 evidence is too weak — `passive` is
not a mechanical classification, and ordinary switch and resistor terminals are
`passive` too. **Its proposed mechanism is replaced by one this repository
already owns**, which is better because it is a check that can fail rather than
a note that goes stale.

`lib/schgen` resolves symbols from the **installed** KiCad library, and
`lib/schgen/render/stock-symbols.ts` already refuses when a **vendored** symbol
is not byte-identical to the installed library's flattened text, *"naming both
files and both SHA-256 hashes."* The vendored set is currently **eight symbols
across five nicknames** — `Connector`, `Connector_Generic`, `Device`, `Jumper`,
`Transistor_BJT` — and **`Switch` is not among them**, so no drift check covers
the symbol this spec exempts a pin on.

**So: vendor `Switch:SW_Rotary_1x6_MP`** via `tools/kicad/vendor-symbols.ts`
(the only thing that may write that directory). Any change to that symbol in a
future KiCad then **refuses loudly** instead of silently exempting a pin whose
role may have moved. `lib/kicad/symbols/PROVENANCE.md` already records the
library version (KiCad 10.0.5), which satisfies the review's
*"record the library version"* without a second place to keep correct.

**Cost, recorded rather than paid silently:** one more vendored file to refresh
on a KiCad upgrade, and a `Switch` nickname that now carries a vendored symbol
where it carried none. `docs/known-gaps.md` **G119** and **G117** carry why the
vendored set works at symbol granularity rather than file granularity.

## 4. Tests

In `tests/schgen/ir/` (new `mechanical-pins.test.ts`, plus cases added to
`validate.test.ts`):

| | what it asserts | why it could fail |
| --- | --- | --- |
| 1 | `MP` of `Switch:SW_Rotary_1x6_MP` exists in the **installed** library, type `passive`, name `""` | fails if KiCad restructures the symbol — the table's claim is checkable, not remembered |
| 2 | `pinsDeclared` returns no problem for a part whose only undeclared pin is `MP` | the change does what it says |
| 3 | **NEGATIVE CONTROL: `pinsDeclared` still refuses an undeclared THROW on the same symbol**, by message | without this arm the test suite passes if the rule is disabled outright |
| 4 | a `MECHANICAL_PINS` entry naming a nonexistent pin produces the stale-table refusal, by message | §3.4 |
| 5 | a part on a symbol with **no** table entry still refuses every undeclared pin | the exemption is keyed, not global |
| 6 | an **explicitly declared** `MP` is still validated: `MP` alone on a net is refused by `singlePinNets`, by message | review finding 1 — stops a later refactor turning allow-omitted into blanket-skip |
| 7 | drift: the vendored `Switch:SW_Rotary_1x6_MP` is byte-identical to the installed library, via the existing `stock-symbols` refusal | §3.5 — fails on any KiCad change to the symbol |
| 8 | the generated sheet's `lib_symbols` still carries the **complete** stock symbol including `MP`, with its geometry unaltered | review finding 3 — **a CONTROL, see below** |
| 9 | the four boards' `make check` stays at **exit 0** and their `boards/pultec-*/pultec-*.perfboard.vrt` stay **byte-identical** | review finding 4 — no physical consequence from a schematic-validator change |
| 10 | census: the four `MP` boards no longer report the `pinsDeclared` problem | §5, the deliverable |

**Arm 3 is the load-bearing one.** Assertions are on failure **messages**, never
counts — these rules have several refusal paths each producing exactly one
problem.

**ARMS 8 AND 9 ARE CONTROLS AND ARE LABELLED AS SUCH, because this repository's
rule is that evidence must be a check that could have failed.** Both are kept —
they are cheap and they are the right regression guards — but neither can fail
today, and saying so is the honest form:

- **Arm 8:** `emit.ts:153` emits `ctx.symbols.resolve(id).node`, the whole
  flattened symbol verbatim, so every pin including `MP` is preserved **by
  construction**. The arm fails only if someone later filters pins at emit
  time, which is exactly what it is there to catch.
- **Arm 9:** `pinsDeclared` lives in `lib/schgen` and the board path reads
  `circuits/pultec/physical/` and `lib/board/`. The change cannot reach the
  landing-pad derivation. The arm fails only if the two paths become coupled —
  and **note that `G251`'s table shows the five `pultec-*` boards at exit 0
  today, so "stays at exit 0" is a real criterion rather than a weakened
  "unchanged".**

Existing tests that assert the four boards' `MP` refusal, if any, move with the
demand; nothing else is weakened.

## 5. What this does and does not promise

**Promises:** the four `MP` boards — `pultec-hi-boost`, `pultec-hi-cut`,
`pultec-low-boost`, `pultec-low-cut` — clear `validateCircuit`. No MPN, no model
field, no owner decision.

**Does NOT promise four drawn schematics, and the precedent is measured.**
`G274`: the census names the **first** refusing problem per board, not the only
one. `G282` clause 3 drove exactly this for `pultec-mid` and its next refusal
was:

> `block pultec-mid-junction: … value of power symbol 0 0 at (31.75, 31.75) overlaps label hi_boost_out at (20.32, 34.29); …`

which is the **`G260`/`G265` text-placement class the owner's three overlap
decisions govern, and it is out of scope here.** The honest expected outcome is
**four boards past gate 1 for the first time**, most likely landing on that
text-placement refusal. The census number is the deliverable; a drawing is not.

## 6. What stays open, deliberately

- **`SW_MID`'s pin 12 is NOT this.** It is the unwired twelfth **throw** of an
  eleven-position selector, not a mount point — `G282` clause 1 establishes that
  from the symbol and the owner's *"Assume a 1x12"*. `NC` is **true** of it and
  no model slot can carry it. It is the other side of the one-field-two-consumers
  gap and needs its own change. `pultec-mid` stays refused.
- **Whether the mount lugs get a wire to ground on the built units.** That is a
  real question and it is his, but it changes the **build guide**, not the
  schematic, and nothing is blocked waiting for it. `JUNCTION_NETS` has no
  chassis or shield net, so there is nothing to bond to in the model today.
- **The remaining nine `MP`-bearing symbols**, added one verified entry at a
  time when a board needs one.

## 7. Decisions

| what | who | why |
| --- | --- | --- |
| The validator stops demanding a disposition for a mechanical pin, rather than the four boards declaring `NC` | owner, 2026-10-24, approving the analysis in conversation | `NC` via a unit pin is measured to break the board check (`PADS12 -> PADS13`); the pin is a property of the library symbol, not of the circuit |
| No MPN is needed to draw a schematic | owner, 2026-10-21 (`G245`) and again 2026-10-24 | *"a fully specified BOM isn't needed for schematics"*; a BOM binds the consumer that sources and places parts |
| `G282`'s owner question is **struck**, not answered | this writer, under the three questions above | the question asked for data a schematic has no use for; leaving it open would have four boards waiting on an answer that changes nothing |
| A per-symbol whitelist, not geometry inference | this writer | §3.2 — the geometry is ambiguous at the body outline and the repo's stated preference is a whitelist that refuses loudly |
| Only `1x6_MP` is listed on this change | this writer | refuse rather than guess; the other nine are verified when wanted |
| Finding 1's code change DECLINED, its test ACCEPTED | this writer, §3.3 | `pinsDeclared` only reports missing pins, so the `continue` is inert when the pin is declared; the semantics it asks for already hold, and the rules that would catch a bad explicit `MP` iterate `c.pins` and never consult the table |
| Finding 2's substance ACCEPTED, its mechanism REPLACED | this writer, §3.5 | vendoring the symbol puts it under an existing byte-exact drift refusal; a recorded hash or version in a comment is a note that goes stale, not a check that can fail |
| Findings 3 and 4 ACCEPTED as labelled CONTROLS | this writer, §4 | both are the right regression guards and neither can fail today; an unlabelled control that cannot fail is the false-green this repository catalogues |

## 8. Third-party review, 2026-10-24

Reviewed against `validate.ts`, `pin-identity.ts`, `section-board.ts` and the
canonical component model. **Verdict: approve with two revisions before
implementation.** Dispositions are in the table above and the sections they
name; findings 3, 4 and 5 are folded in as arms 8, 9 and the §3.1 limiting
sentence.

**The review was right about something this writer had wrong**, and it is
recorded because it changed an acceptance criterion: this writer expected the
Pultec boards' `make check` to be red (CLAUDE.md says `make check` is red on
four boards) and was ready to weaken arm 9 to *"unchanged rather than green"*.
`G251`'s table says the four red boards are `pt2399-core`,
`transistor-preamp-lab`, `-loop` and `-staged`, and **the five `pultec-*`
boards are at exit 0.** The review's stronger framing is the correct one.

**Its one structural suggestion not taken** is finding 1's code change, for the
reason in §3.3: it asks the exemption to be defined as allow-omitted rather than
skip-if-present, and the sketched code already has that property because the rule
has no other refusal path. Recorded here rather than argued in a session, so a
later reader sees the disagreement and can overrule it.
