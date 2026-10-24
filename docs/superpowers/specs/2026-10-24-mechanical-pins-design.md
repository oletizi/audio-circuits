
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
stroke leads inward from its body-side end. **It was investigated and
rejected.** `UnitGraphics.segments` (`lib/schgen/render/lib-graphics.ts`)
flattens *rectangle edges and polyline legs into the same list*, and `MP`'s
inner end at `(-5.08, -5.08)` sits **on** the body rectangle
`(-5.08, 8.89)..(5.08, -6.35)` — as does the pole pin 7's inner end at
`(-5.08, 0)`. A naive "does a stroke touch it" test says yes for both. The real
discriminator is directional (pin 7 joins a polyline running inward to the
wiper; `MP` joins nothing), which is implementable and is exactly the *"general
rule that quietly accepts a guess"* the whitelist is preferred over.

Recorded here so the next reader does not re-derive the idea and mistake its
rejection for an oversight.

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
`validateSourcing` and the `pin-identity` gate are untouched. A mechanical pin
is on no net, so `singlePinNets` never sees it.

### 3.4 A stale table entry must refuse, not silently pass

A `MECHANICAL_PINS` entry naming a pin the symbol does not have would quietly
exempt nothing while looking correct — the shape of defect that has twice
shipped a KiCad footprint that does not exist. So `pinsDeclared` also refuses
when an entry is unresolvable against the symbol:

> `part <label>: MECHANICAL_PINS lists pin "<n>" for <libId>, which has no such pin; the table is stale — re-verify it against the installed library`

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

**Arm 3 is the load-bearing one.** Assertions are on failure **messages**, never
counts — these rules have several refusal paths each producing exactly one
problem.

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
