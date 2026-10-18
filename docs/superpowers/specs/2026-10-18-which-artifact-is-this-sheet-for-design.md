Which artifact is this sheet for
===============================

**Status** awaiting owner review. **Settles** `docs/known-gaps.md` G44, and the
sheet half of G47.

The owner, 2026-10-18: *"re: g44 you should fix that gap."*

The defect
----------

A generated sheet tells a builder to fit a stacking header into the junction
field. That is true of the PCB this design is ultimately fabricated as, and
wrong for the stripboard on his bench, where the field takes soldered leads and
no header is fitted at all. Two surfaces carry it:

- **`wiring.md`** gets the whole `stackingWords` paragraph
  (`lib/board/part-text.ts:189-210`) through `pinFieldNotes`, reached from
  `lib/board/wiring.ts:333`. It leads with *"fit a single stacking header, not 2
  plain ones"* and names the bench case in a subordinate clause three sentences
  later: *"Individual leads soldered into the field are the bench substitute
  when the boards are not stacked."*
- **`guide.html`** prints `5-pin header` as the junction rows' Value, from
  `valueLabel` (`tools/guide/off-board.ts:89`), which gives every connector
  `${pins.length}-pin header` regardless of what is fitted. Four occurrences on
  `pultec-low-boost`.

**The claim is right and the audience is wrong.** Nothing here is a false
statement about the PCB; it is a true statement about the PCB printed as an
instruction to somebody holding veroboard.

A correction to the recommendation already given
------------------------------------------------

**The owner was told the fix would be "the field declares both fittings" - and
that is the wrong design.** It was recommended in this session before the code
was read, and it is withdrawn here rather than quietly replaced, because he
accepted a direction on the strength of it.

Why it is wrong: a bench fitting is **not a property of a field.** "This field
takes soldered leads at the bench" is true of EVERY pin field on stripboard, for
the same reason every time - you do not fit headers on a bench prototype. A
per-field property whose value is identical for every field it could ever be
declared on is a worse model than no property: it invites a reader to think it
varies, and it gives an author a place to get it wrong.

**And a flag on the board declaration is weaker than it looks, for a reason that
is measurable rather than aesthetic.** `lib/model/types.ts:113-114` admits
exactly one mating, `readonly mating: "stacking"`; every board under `boards/`
is a stripboard; the declaration file is named `perfboard.json`; and
`writeGuidePacket` takes a `PerfboardDeclaration`. So **a target field would be a
flag with one possible value**, whose other branch nothing exercises. G44's own
framing - *"the fix needs a notion the tooling does not have: which artifact a
sheet describes"* - is therefore slightly wrong, and that correction is already
recorded in the entry: **the tooling is not missing the distinction, it has a
wrong default.** Every sheet it produces today is a bench sheet.

The design
----------

**The audience is a property of the generator, which already knows it
statically.** So it is stated where it is known, and stated as a required
argument so that nothing can inherit it by default.

**1. The model is untouched.** `PinField.mating` stays `"stacking"` and keeps
meaning what it means: the purchase the field forces on the fabricated PCB.
Nothing true is deleted. This is the constraint G44 records as WRONG FIX 1 and
it is honoured.

**2. `pinFieldNotes` takes the audience as a required argument.**

```ts
export type SheetAudience = "bench-stripboard" | "fabricated-pcb"

export function pinFieldNotes(
  components: readonly Component[],
  designators: ReadonlyMap<string, string>,
  audience: SheetAudience,
): readonly string[]
```

**No default value.** A default is precisely the defect being fixed: it is how
PCB wording reached a bench sheet without anybody choosing it. A future PCB
generator must say which words it wants, and the typechecker makes it.

**3. `MATING_WORDS` is keyed by mating AND audience**, so a new mating cannot be
added to `PinField` without words for both audiences - extending the guarantee
the current record already carries (*"this record stops typechecking if a member
has no entry"*).

**4. `wiring.md`'s junction paragraph, for `bench-stripboard`.** The exact text
to emit, for owner review - this is the wording that reaches the sheet, so it is
in the spec rather than left to an implementer:

> **The junction rows are ONE 2x05 pin field, and on this stripboard you fit no
> header in it at all — solder individual leads into the holes.** J1 and J2 are
> the 2 rows of one 10-pin field at 2.54mm pitch. Land each wire directly in its
> hole.
>
> **For the fabricated PCB this design is for, that same field takes a single
> 2x05 LONG-TAIL (stacking) header**, whose tails reach through the board into
> the socket of the board above - which is what makes the junction a bus the
> stacked boards share. That part is for the PCB build and is not fitted here.
>
> It is 2 parts in the model and one field in the hand: the layout tool's part
> families (see `lib/kicad/import-string.ts`) have no multi-row shape at 2.54mm
> row pitch, so the field is declared a row at a time. The holes are the same
> either way.

The row count, pin count and pitch stay DERIVED from the components' own
footprints, exactly as now, so a field that grows a row changes these words
rather than outliving them. **Dropped from the bench wording:** *"N plain
vertical headers ... are the one thing not to order"*, because at the bench you
order nothing for this field, and a warning about a wrong purchase is noise on a
sheet where there is no purchase. **Kept, moved:** the ribbon sentence already
says a ribbon socket is not used here, and that stays correct.

**5. `fabricated-pcb` keeps today's `stackingWords` text unchanged.** It is
correct for that audience, and nothing generates it yet. It exists so the PCB
words are not lost and so the record has two audiences rather than one plus a
gap.

**6. `valueLabel` says what is fitted, for a connector in a pin field.**
`tools/guide/off-board.ts:89` currently returns `${pins.length}-pin header` for
every connector. For a connector whose `component.part.pinField` is declared, on
a bench sheet, it returns instead:

```
soldered leads (5-hole junction field)
```

The field's own `name` supplies the word `junction`; the hole count is the part's
`PIN` line count, as now. A connector with no `pinField` is unaffected and still
reads `5-pin header` - the input, output and power headers are real headers and
this change must not touch them.

**7. One refusal, and no fallback.** A declared mating with no words for the
requested audience throws, naming the mating, the audience, and
`MATING_WORDS` as the place to fix it. There is no path that prints the other
audience's words instead: silently substituting them is the defect.

Testing
-------

- `pinFieldNotes` under `bench-stripboard` does NOT contain `fit a single
  stacking header` as an instruction, and DOES contain the soldered-leads
  instruction. Asserted on the real Pultec network, not a fixture.
- `pinFieldNotes` under `fabricated-pcb` still produces today's text verbatim,
  so the PCB words are provably unchanged.
- `valueLabel` returns the soldered-leads string for `junction_signals` and
  `junction_grounds`, and still returns `N-pin header` for a connector with no
  `pinField`. Both on a real board.
- A mating with no entry for one audience fails to typecheck, demonstrated by a
  type-level test if the repo has the pattern, and otherwise by the refusal
  test.
- The generated `wiring.md` for all five sections is regenerated and read; the
  five `.vrt` files stay byte-unchanged.

Out of scope, with reasons
--------------------------

- **No PCB packet generator.** Nothing fabricates a PCB packet yet, so there is
  nothing to generate and no second audience to exercise. The `fabricated-pcb`
  words exist to be correct when there is, not to be built against now.
- **No board is re-laid out, re-derived or re-adopted.** The owner, 2026-10-18:
  *"Leave the approved boards alone for bow"*. The five `.vrt` files are
  byte-unchanged by this work.
- **The junction ground row stays.** G47 measures that removing it opens net `0`
  on every adopted board. This change alters what a sheet SAYS about that row,
  never whether it exists.
- **`mating` gains no new value.** The vocabulary of matings is about the PCB
  and is not the axis that varies here.

Decisions
---------

| What | Who | Why |
| --- | --- | --- |
| Fix the gap rather than record it | owner, 2026-10-18 | *"re: g44 you should fix that gap."* |
| Leave the adopted boards alone | owner, 2026-10-18 | *"Leave the approved boards alone for bow"* - so this is a wording and vocabulary change only |
| Audience belongs to the generator, not to the field or the board | this spec, for owner review | a bench fitting is identical for every field, and a board-level flag would have one possible value today |
| Withdraw the "field declares both fittings" recommendation | this spec | it was given before the code was read; recorded as withdrawn rather than replaced, because the owner accepted a direction on it |
| The model keeps `mating: "stacking"` | G44, carried forward | changing it would delete a true fact about the PCB to suit a prototype's build sheet |
| The audience argument has no default | this spec | a default is how PCB wording reached a bench sheet unchosen in the first place |
| The exact sheet wording is in this spec | `CLAUDE.md` invariant | an agent may never author the acceptance criteria for the artifact it produces, so the wording reaches the artifact through this document and the owner's review of it |
