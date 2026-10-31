# Task 4 report — classify the five Pultec switch pins, then declare them

**Status: COMPLETE. Five pins classified individually. NOTHING DECLARED, and that
is the task's correct outcome in both groups rather than an unfinished step.**

- **Commit:** `4be4815`, pushed to `feature/schematics-tooling`. Parent `f02fc67`.
- **Suite:** `SCHGEN_SOURCE=… bun test` → **3838 pass / 0 fail / 43688 `expect()`
  across 355 files** — exactly the figure the brief gave, **unmoved**. No term to
  account for, because no test, source or circuit file changed: the commit is two
  markdown files.
- **`bun run typecheck`:** clean (`tsc --noEmit`, exit 0).
- **Census:** unmoved at **0 of 11**; all five Pultec boards still name the same
  one problem each. Per-board detail below.
- **`make -C boards/pultec-mid check`:** exit 0 before, during the reverts, and
  after. Verified, because one experiment took it red and I needed to know it came
  back.

---

## 1. The register — one verdict per switch, and they are not the same

| switch | board | symbol | symbol pin | part number on record | verdict | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `SW_HI_BOOST` | `pultec-hi-boost` | `Switch:SW_Rotary_1x6_MP` | `MP`, name `""`, type `passive` | **NONE** | **UNDETERMINED — declared nothing** | CONFIRMED |
| `SW_HI_CUT` | `pultec-hi-cut` | `Switch:SW_Rotary_1x6_MP` | `MP`, name `""`, type `passive` | **NONE** | **UNDETERMINED — declared nothing** | CONFIRMED |
| `SW_LO_BOOST` | `pultec-low-boost` | `Switch:SW_Rotary_1x6_MP` | `MP`, name `""`, type `passive` | **NONE** | **UNDETERMINED — declared nothing** | CONFIRMED |
| `SW_LO_CUT` | `pultec-low-cut` | `Switch:SW_Rotary_1x6_MP` | `MP`, name `""`, type `passive` | **NONE** | **UNDETERMINED — declared nothing** | CONFIRMED |
| `SW_MID` | `pultec-mid` | `Switch:SW_Rotary_1x12` | `12`, name `"12"`, type `passive` | **NONE**; the symbol cites a datasheet, which was fetched and read | **NOT A MOUNTING PIN. The unwired twelfth THROW. `NC` is true of it — and no model slot can carry it** | CONFIRMED |

**Sources consulted, per switch:** the installed
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Switch.kicad_sym`
(every pin of each symbol dumped and read, never recalled); the symbols' own
`Description`, `Datasheet`, `Footprint` and `ki_fp_filters` properties; for
`SW_MID`, the datasheet its symbol cites, fetched and extracted with
`pdftotext -layout`; and the repository's own part record
(`circuits/pultec/physical/parts.ts`, `circuits/pultec/off-board.ts`, `parts/`,
`boards/*/bom.json`).

**The brief's tell was right and it paid off: the two names ARE two different
things.** Batching them would have declared `NC` on a throw and on four terminals
whose electrical role nothing on disk establishes.

---

## 2. `SW_MID` pin 12 — classified, and the classification does not need the part

`Switch:SW_Rotary_1x12` has **no `MP` pin and no mount point of any kind**. Read
off the installed library: pins `1`..`12` at `x = +15.24`, angle 180 — the throw
column — and pin `13` at `x = -15.24`, angle 0, the pole, which
`POLE_PIN` in `circuits/pultec/schematic/section-board.ts` already records.

`MID_POSITIONS` (`circuits/pultec/electrical/mid.ts:45`) has **eleven** entries.
`circuits/pultec/physical/parts.ts` already carries the owner's decision —
**verbatim `"Assume a 1x12"`** — and its consequence: *"twelve detents exist,
eleven are wired, the twelfth is unused."* `switchOverride` maps `common` → 13
and the eleven throws → 1..11, leaving pin 12.

**So the question for this pin is not "is a frame bonded?" but "does the circuit
wire the twelfth throw?", and the repository's own recorded decision answers it.**
A throw terminal that no conductor reaches is exactly what `NC` asserts. No part
identification is needed, which is why this one is determinable and the other
four are not.

**The symbol's cited datasheet corroborates the family, and was read rather than
assumed.** `Datasheet = http://cdn-reichelt.de/documents/datenblatt/C200/DS-Serie%23LOR.pdf`
→ Reichelt **Serie CK Drehschalter**. The four rotary symbols in that library
with no `_MP` variant (`1x12`, `2x6`, `3x4`, `4x3`) are exactly that sheet's four
configurations. Verbatim: **`1-polig, 12 Positionen`** (types `CK-1039`/`CK-1029`
solder tab, `CK-1059`/`CK-1049` solder pin, each `mit`/`ohne Endanschlag`);
**`Gehäusematerial: glasfaserverstärktes Nylon`** — an insulating body; and a
terminal drawing of positions `1`..`12` with **no separate chassis, frame or
mounting terminal**. **What it does not say:** it does not say the end stop is
settable to an arbitrary position, so `parts.ts`' *"stop set to eleven"* remains
that writer's reasoning, which `parts.ts` itself already flags.

---

## 3. Why `SW_MID` was still not declared — a measured model gap, not an unfinished classification

**Both model slots were driven. Both refuse.**

**(a) A unit pin — the brief's own mechanism.** Added `t_unused_12: NC` to
`SW_MID`'s `MAIN` unit in `circuits/pultec/electrical/three-band.ts`.

- `bun run typecheck` clean.
- **`pultec-mid` cleared `validateCircuit` completely** and the census moved it
  off gate 1 for the first time (see §5).
- **`make -C boards/pultec-mid check` went exit 0 → `FAIL`, naming
  `SW_MID retyped PADS12 -> PADS13`.**

A switch's unit pins **are** its board landings on this path: `padOrderFor`
(`circuits/pultec/physical/parts.ts:464`) sends `kind: "switch"` to
`rotaryPadOrder` (`:246`), which reads `units[0].pins`; `padOrderFor`'s own words
are *"an off-board part's pads are the wire landings a builder solders to."* **A
landing for a terminal no wire reaches is wrong for the board**, so the committed
layout is right to disagree, and `G251` records `pultec-mid` at exit 0 before
this — a regression, not a pre-existing red. Reverted.

> **A prediction of mine that was refuted, recorded as such.** I expected
> `tools/guide/pad-label.ts`'s `pad-label-unselected-throw` to refuse a throw
> closing at zero positions. **It did not.** The regenerated
> `boards/pultec-mid/wiring.md` printed `| 13 | t_unused_12 | — | no connection |`
> and carried on. The blocker is the pad **count**, not the pad **label**. The
> side-effect regeneration was then undone by re-running the board check against
> the reverted model; the tree is clean.

**(b) A package pin.** `pins: { "12": NC }` on the component instead, which
`padOrderFor` does not read at all. **The model's own validator refuses it before
any board check:**

```
component "SW_MID": package pin "12" is not in the switch vocabulary []
```

`checkVocabulary`, `lib/model/validate.ts:96-101`. `PACKAGE_PINS.switch` is `[]`
(`lib/model/kinds.ts:45`) and the package check is a **strict whitelist**, unlike
`from-network.ts`' `vocabulary.length > 0 &&` guard. So this route is closed by
the model and not merely by taste — just as well, since `Component.pins` is
documented *"Package pins shared across units: supply, shield, substrate"* and
its only non-empty use anywhere in the repository is an op-amp's `v+`/`v-`.
Reverted.

**The gap, stated once.** One model field serves two consumers with different
needs: the schematic needs the symbol's **full** terminal set including a
terminal the circuit does not wire; the board needs only the **wired** subset;
`units[0].pins` is both. `G264` said *"there is no pin to mark"* — that is now
measured and **corrected**: there is a pin to mark, and marking it breaks a board.

**I did not improvise the fix.** The untried mechanism — a `Connection`-aware
filter in `padOrderFor`, so a landing is made only for a wired terminal while
`rotaryPadOrder` keeps the full detent order the symbol numbering needs — touches
`circuits/pultec/physical/parts.ts`, `circuits/pultec/schematic/section-board.ts`,
three `tests/guide/` files and `lib/kicad/from-network.ts`' own `padOrderFor`, none
of them in this task's file list. It also carries the exact hazard
`switchOverride` already refuses over: making the pad list and the symbol pin list
differ in length puts a throw's pad number and its symbol pin number out of step,
and *"a throw numbered one position out is a wrong connection in a drawing that
looks right."* **It needs a brief and a reviewer who did not write it.** Recorded
as MECHANISM, UNTRIED in `G282`.

---

## 4. Why the four `MP` pins cannot be classified — four separate facts

1. **The symbol does not assert isolation.** Verbatim from the installed library:
   `(pin passive line (at -7.62 -5.08 0) (length 2.54) (name "") (number "MP"))`.
   Its inner end lands at `(-5.08, -5.08)` on the body rectangle
   `(-5.08, 8.89)..(5.08, -6.35)`, and **no polyline joins it** — the pole (pin 7)
   by contrast ends at `(-5.08, 0)` and joins `(-5.08 0) -> (-3.81 0)` to the
   wiper. The symbol says "a terminal on the body, not internally connected to the
   contacts" and nothing more.
2. **`passive` is a CHOICE in this library, so it carries information.**
   `grep -o '(pin [a-z_]* ' Switch.kicad_sym | sort | uniq -c` → **451 `passive`,
   3 `no_connect`, 2 `input`, 2 `power_in`.** The three `no_connect` pins are on
   `SW_SP3T_NR01103` and `SW_SP4T_NR01104`, **MPN-named symbols in the same file**.
   Where these authors knew a pin was electrically unconnected they typed it
   `no_connect`; on `MP` they typed `passive`. *(A check that could have failed: if
   the library used no `no_connect` pins at all, the choice would carry nothing.
   It uses three.)*
3. **There is no part to consult.** `Switch:SW_Rotary_1x6_MP` has
   `Footprint ""`, `Datasheet ""` and no `ki_fp_filters` — all six of its
   properties were listed. Every `_MP` variant is the same; only the non-`MP`
   family cites the CK sheet. The repository records no part either: nothing in
   `circuits/pultec/` sets `part.mpn` on any switch (`offBoardPart` adds only
   `symbol`), `parts/` has no rotary-switch catalog entry, and `boards/pultec-*/`
   carry **no `bom.json` at all** — only `pt2399-core` and
   `transistor-preamp-staged` have one.
4. **There is no net to bond it to even if it were bonded.** The Pultec model has
   no chassis, shield or earth net. `JUNCTION_NETS`
   (`circuits/pultec/physical/parts.ts:403`) is
   `["in", "hi_boost_out", "lo_boost_in", "out", "0"]`, and the *"chassis ground"*
   that `parts.ts:516` mentions is net `"0"`, from `GROUND_NET` in
   `lib/board/scaffold/flat.ts`. Declaring `MP` on `"0"` would put a panel
   switch's mount lug on circuit ground and **print a wire for it in five
   generated build guides** — a build instruction nothing on disk authorises.

**And a real rotary's mount point is usually continuous with its frame, and a
frame bolted to a grounded metal panel is at chassis potential whether or not a
wire is soldered to the lug.** So `NC` is not the safe default it looks like here:
on four boards it would be a false electrical assertion if the fitted lug is
bonded. **Nothing declared. The four boards still refuse on the same pin.**

> **There is also no escape by choosing a different symbol.** `SW_Rotary_1x6`
> without `_MP` **does not exist**: `grep -c '(symbol "SW_Rotary_1x6"'` is 0, and
> the library's whole single-pole family is `_MP` from `1x3` to `1x9`, then
> `1x12`. `parts.ts`' table is accurate. The `MP` pin must be declared one way or
> the other, and the determination needs the real part.

---

## 5. Board census after, per board — and the newly revealed problem

**At the committed state the census is byte-for-byte what it was before: 0 of 11,
11 refused, 0 without an authoring declaration.** Per board, first refusing
problem:

| board | refuses on |
| --- | --- |
| `pt2399-core` | `net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)` — **Task 5's** |
| `pultec-hi-boost` | `part SW_HI_BOOST: pin MP () is neither on a net nor declared not connected` |
| `pultec-hi-cut` | `part SW_HI_CUT: pin MP () …` |
| `pultec-low-boost` | `part SW_LO_BOOST: pin MP () …` |
| `pultec-low-cut` | `part SW_LO_CUT: pin MP () …` |
| `pultec-mid` | `part SW_MID: pin 12 (12) …` |
| the five `transistor-preamp-*` | ELK text placement / junction geometry — unchanged, `G247` |

**I do not promise any of them draw, and none of them do.**

**THE NEWLY REVEALED PROBLEM, which is this task's most valuable measurement and
exists nowhere else.** With `SW_MID`'s pin 12 declared, `pultec-mid` passes
`validateCircuit` entirely and the refusal becomes:

> `block pultec-mid-junction: the ELK route does not pass the clearance checks
> that grade template output (spec 1.4 obligation 4): value of power symbol 0 0 at
> (31.75, 31.75) overlaps label hi_boost_out at (20.32, 34.29); label
> hi_boost_out at (20.32, 34.29) overlaps label out at (36.83, 33.02); label
> hi_boost_out at (20.32, 34.29) overlaps glyph of power symbol 0 0 at (31.75,
> 31.75)`

That is `G260`/`G265`'s **text-placement** class, which the plan's Global
Constraints put out of scope, and it is the **first time a Pultec board has been
seen past gate 1**. `G274` predicted exactly this — the census names the first
refusing problem, not the only one — and the prediction held. **It also means the
four `MP` pins, if the owner answers "isolated", are not one declaration away from
a drawing: they are one declaration away from the same text-placement wall, and
blocked behind the §3 model gap in the meantime.**

---

## 6. The review's recommended mechanism — declined, and the decline verified

Finding 2 proposed `PinTable.mechanicalPads`. Verified against the tree:
`lib/schgen/from-network.ts:29-31` states *"`PartSpec.pads` in the model maps a
canonical pin to a footprint pad, which is the opposite thing"*; `:359` sets
`mechanicalPads: []` unconditionally on the network-derived path, which is the
**only** path these five boards use; `lib/schgen/gates/pin-identity.ts` consumes
it to compare pads against a pin table. It is a footprint-pad concept with no
authority over whether a schematic symbol pin is electrically isolated.
**The criterion — classify from verified semantics, never from "currently
floating" — is what was followed.**

---

## 7. Incidental repair, in this change

`docs/superpowers/plans/2026-10-23-net-names-and-floating-pins.md` held the
character-class bounds of its own net-name predicate as **raw bytes** `0x00` and
`0x1f` rather than as the escape text. `file(1)` reported the plan as `data`, and
**`grep` without `-a` matched nothing in any of its 463 lines** — so an agent
grepping this plan for its own task got silence that looked like absence. That is
the exact failure `CLAUDE.md`'s control-byte rule was added for, found in the plan
that rule's own task was written against, and it is why I had to `grep -a` to find
`Global Constraints` at all.

Repaired by a script building the bytes with `chr()` — never typed into a tool
parameter — `+6` bytes. **CRITERION: `file <plan>` says text, and
`grep -c "Global Constraints" <plan>` is 1.** Both false before, both true after;
**0** control bytes other than tab/newline/CR remain. Every file I touched was
checked by counting bytes rather than by reading: `docs/known-gaps.md` is
`1825781 → 1841976` bytes, delta `16195`, which equals the entry's length exactly,
with 0 control bytes and 1 occurrence of `### G282`.

**Flagged because it is scope creep.** It is a two-byte-class repair that
preserves the sentence's meaning and restores `grep` for Tasks 5 and 6; revert it
if unwanted.

---

## 8. Register entry

**`docs/known-gaps.md` `G282`** — the per-switch register with every piece of
evidence, **CONFIRMED per switch** (nothing relayed), including the refuted
prediction and the `G264` correction. CRITERION is separated from MECHANISM in two
places, and both mechanisms are marked untried. It states plainly that the four
`MP` pins are an **OWNER QUESTION, not a measurement**.

---

## 9. Concerns

1. **The four `MP` pins need the owner, and the question is narrow.** Which rotary
   switch is fitted (no MPN is recorded for any Pultec selector), and **is its
   mount lug to be wired to net `"0"`?** I could not ask him directly from here;
   the question is recorded in `G282` under "what would settle it" and is relayed
   in my hand-back. Per the repository's rule, nobody asks again unprompted.
2. **Even "isolated" does not unblock the four.** The declaration would hit
   `PADS7 → PADS8` on all four boards exactly as `SW_MID` hit
   `PADS12 → PADS13`. The §3 model gap is the real blocker on all five, and it is
   the thing worth a brief.
3. **This task produced no code change, and that should be read deliberately.**
   One group was undeterminable; the other was determined and undeclarable. Both
   outcomes are the ones the brief pre-authorised, and I chose them over a
   confident `NC` and over improvising a cross-file derivation change whose checks
   I would have been choosing myself.
4. **`make check` at the root is still RED on four boards** (`G251`) —
   pre-existing, not mine, and `boards/pultec-mid` specifically is back at exit 0,
   verified after both reverts.
5. **No file was taken off the byte-check**, no `diverged[]` entry was added, and
   nothing needed one.
