# Gates classify; they do not hide

**Status:** revision 2, written 2026-10-27 after an independent review of revision 1 returned five
Critical findings, three of which were defects in this writer's own reasoning rather than in the
policy. What they were, and where they are answered, is in **What revision 1 got wrong** at the
end. Revision 1 is at `f25600e` if the comparison is wanted.

**Authority:** `docs/known-gaps.md` **G303**, which carries the owner's directive, his reasoning
for the watermark, and his line between *defective* and *merely ugly*, all verbatim. This document
designs the mechanism. It does not re-decide the policy, and where it narrows the directive it says
so out loud.

## The directive

> *"Gates can still refuse to ratify an output, but they shouldn't **hide** the output. The output
> should still be available, but clearly classified as unratified"*

> *"it's ugly but usable. I want to preserve the warning watermark for schematics that are
> incorrect or otherwise should not be trusted or used"*

## The three classes

**The owner's line, and it is the organising principle rather than a detail:** a drawing that is
**wrong about the circuit** must not be built from. A drawing that is **correct and hard to read**
is a drawing, and it ships.

- **`not-drawable`** — no geometry exists and none could. The reason is printed. There is no
  picture, and saying so is the honest answer.
- **`defective`** — a drawing exists and is wrong about the circuit. **Watermarked**, and it does
  not reach a build guide.
- **`usable`** — a drawing exists and is correct. It may be ugly. It ships, and its findings travel
  with it.

**This repository had already half-drawn this line twice and never finished it.** `CLAUDE.md` calls
the missing-junction class *"the one class that must keep refusing, because it makes a drawing
WRONG ABOUT THE CIRCUIT"*, and **G291** records the touching-glyph case being reserved to the owner
as *"possibly a CORRECTNESS class rather than a crowding one"*. Both were asides. This makes the
distinction the thing the design turns on.

## What this changes today, measured

`[RAN]` `bun tools/schgen/board-sheets.ts`. The four boards that refuse split across exactly that
line:

| board | refuses on | class |
| --- | --- | --- |
| `pultec-mid` | `circuit is invalid` — `SW_MID` pin 12 | `not-drawable` |
| `transistor-preamp-buffered` | clearance: power-symbol value over pin text | `usable` |
| `transistor-preamp-loop` | clearance: power-symbol value over pin text | `usable` |
| `transistor-preamp-staged` | clearance: value over a label | `usable` |

**Three of the four refuse on legibility and should draw.** `7 of 11` becomes `10 of 11`, one
`not-drawable`, and **zero `defective`** — no board fails a correctness check today, so the
watermark has no subjects. That is the right state for a safety mark, not evidence it is
unnecessary: the junction check fired on a `DOWN` probe within the hour of being discussed.

**It also amends the gate at `f42c129`**, which withholds a sheet carrying any fallback field
placement. Under the owner's line that gate is too strict: `pultec-low-cut` (1 fallback) and
`pultec-low-boost` (5) are correct drawings and their build guides should carry them. **This is a
refinement of G300's *"wonky is worse than nothing"*, not a reversal** — a drawing that cannot be
trusted still must not reach the bench.

## Scope: which refusals change, and which do not

**The boundary is whether a drawable geometry exists at the point of refusal.** Revision 1 stated
that boundary and left each site's classification to the implementer, which is the defect below.

**EVERY REFUSAL SITE IN THE NAMED MODULES DECLARES ITS OWN CLASS, IN CODE.** A site is annotated
`not-drawable`, `defective` or `usable` where it is written, and **an unconverted throw arriving at
the census is itself a failure rather than a `not-drawable`.** This is the half of
`false-greens.md` mechanism 16 that revision 1 dropped — *"inference was replaced by **declaration**
plus a totality assertion"* — and without it the classifier is a bare `catch` over an `Error`
message, which cannot tell a gate from a `TypeError`.

**The sites are classified in this document and reviewed before implementation**, because the
agent that writes the conversion may not also decide what counts. The list is below; it is the
spec's, not the implementer's.

| site | class | why |
| --- | --- | --- |
| `adapt.ts` junction disagreement | `defective` | a branch with no junction is a connection KiCad does not make — wrong about the circuit |
| `adapt.ts` clearance | `usable` | crowding; the owner's line |
| `blocks.ts:265`, `bus.ts:137` invalid layout | **per-problem** | `checkLayout` returns a mixed list; each problem carries its own class and the drawing takes the worst |
| `blocks.ts:259` every template `not-applicable` | `not-drawable` | no backend produced geometry |
| `blocks.ts:296`, `:304` backend missing or refusing | **inherits** | the refusal it wraps already has a class |
| `bus.ts:76` two pins at one location on different nets | `not-drawable` | thrown mid-construction, no layout in hand |
| `bus.ts:119` `staggered` exhausts `MAX_STAGGER` | `not-drawable` | same |
| `adapt.ts:280`, `:304` snap disagreements | `not-drawable`, **and loudly** | their own text says *"this is a defect in `lib/schgen/elk/snap.ts`, not a layout that cannot be drawn"* — they are bugs and must not read as ordinary undrawable boards |
| `sheets.ts` `fittingPaper` exhausted | `not-drawable` | a drawing that fits no paper has no paper to be drawn on |
| `generate.ts:368` `assertRefsMatchDrawings`, `:377` `assertCrossSheet` | `defective`, **generation-level** | correctness, and not attributable to one sheet — see below |
| `validateCircuit` and every input refusal | `not-drawable` | no geometry, none possible |

## The mechanism

### The type chain, named

Revision 1 named no type, so an implementer would have had to invent the propagation. The geometry
is **already preserved on one path and discarded on another, three lines apart**:

```
adapt.ts:294   const layout: BlockLayout = { ... }     the geometry exists
adapt.ts:331   checked: null,                          the junction arm discards it
adapt.ts:362   checked: layout,                        the clearance arm already returns it
```

So the work is not converting 351 throws. It is widening one chain so a drawing can be carried
alongside its findings:

`RealiseResult` → `realiseBlock` / `renderBlock` (`BusResult`) → `layoutSheet` → `SheetDrawing` →
`Generation` → `BoardSheets`.

`adapt.ts:331`'s `checked: null` becomes `checked: layout`, which is the single smallest change in
the design and the one that makes the junction case visible at all.

### Findings have two homes, because one of them is not per sheet

`SheetDrawing` carries sheet-level findings, as `fieldFallbacks` already does. **`Generation`
carries generation-level findings**, because `assertRefsMatchDrawings` and `assertCrossSheet` fire
after every drawing exists and belong to no single sheet. Revision 1 had no home for these and
would have forced them into a sheet or back into a throw.

### Status is anchored, not self-counting

Revision 1's totality assertion was `rows.length === rows.length` — true by construction, which is
`false-greens.md` mechanism 1, in a document citing that file.

**The population is anchored to `BOARDS`**, the declared board list, asserted at
`tests/schgen/board-declarations.test.ts:48` as `expect(BOARDS.length).toBe(11)`. The census
asserts that its rows cover `BOARDS` exactly — a board missing from the *population* fails, not
just a board missing from a bucket.

**`boardSheetsCensus` has exactly one caller today: its own `import.meta.main`.** No test and no
`make` target runs it, so revision 1's *"tests assert on status"* described a harness that does not
exist. **A test runs the census and asserts the per-board status table below.**

### The expected status of all eleven boards, written down before the first run

So that the first run can **disagree** with the spec rather than define it. If reality differs, the
difference is a finding to report, not a table to quietly correct.

| `usable` (10) | `not-drawable` (1) | `defective` (0) |
| --- | --- | --- |
| `pt2399-core`, `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `transistor-preamp-buffered`, `transistor-preamp-feedback`, `transistor-preamp-lab`, `transistor-preamp-loop`, `transistor-preamp-staged` | `pultec-mid` | — |

### The mark, and where it lives

**In the `.kicad_sch`, as graphic text, not at PDF export.** The artifact a person opens in KiCad
must carry it; a mark applied only at export leaves the editable file unmarked, and that file is
what `make check` runs `kicad-cli` over.

**It is exempt from obligation 5 and the exemption is stated rather than assumed.** `adapt.ts:29`
requires that *"no generated schematic is emitted whose geometry was altered after its last
clearance check."* The watermark is added after that check by construction. It is exempt because it
is **not circuit geometry** — it carries no net, no pin and no connectivity, and a clearance
violation between a defect notice and the defective drawing it describes is not a defect. A sheet
must never be refused for its own warning.

**Both directions are asserted, over all eleven**: a `defective` sheet carries the mark, and a
`usable` or `not-drawable` one carries none. Revision 1 required only the first, which an
unconditional stamp would satisfy.

### Where an unratified drawing durably lives

Revision 1 said the output must be "available" and gave it no location — the census writes into
`fs.mkdtempSync` and the guide path deletes its temp directory, so **no unratified PDF survives for
the owner to open**, which is what the whole acceptance clause rests on. The census gains a durable
output directory, gitignored, holding one PDF per board regardless of class.

## Acceptance

**Done is:** every board in `BOARDS` has a PDF on disk that a person can open; each carries its
class; the per-board table above either matches or its mismatches are reported; and **the owner,
looking at the three transistor-preamp drawings nobody has ever seen, can say whether the clearance
gate that hid them was right.**

**That last clause is the point and the only one code cannot satisfy.** The reform is worth nothing
if nobody then looks.

**Not done when:** the statuses exist in a data structure but the PDF does not carry one. Not when
the census prints a new column. Not when the tests pass.

## Explicitly out of scope, and one narrowing stated

- **Fixing any gate.** Whether each gate is *right* is a separate question per gate, and this design
  exists so it can be asked with the drawing in hand.
- **`pultec-mid`.** It is `not-drawable`, so it gets no picture, and **this is where the directive
  is narrowed**: G303 asks that *"every board under `boards/` produces a drawing a person can look
  at"*, and one board will not. **The interrogable artifact for a not-drawable board is the demand
  itself, not a picture** — `pultec-mid` refuses because `pinsDeclared` wants a disposition for
  `SW_MID` pin 12, and **G282** records that exact class of demand being questioned rather than
  satisfied. That is a separate piece of work and it is named here so the narrowing is not silent.
- **The selector-bank arrangement**, which this interrupted and which resumes after.

## What revision 1 got wrong

Kept rather than edited away, because three of the five were this writer's reasoning and the
pattern is more useful than the corrections.

1. **Its central premise was false.** *"A refusal is a `throw`, so the geometry is destroyed."* At
   the two gates that matter it is not a throw, and the clearance arm **already** returns the
   geometry. The real change is one return type and one `null`.
2. **It kept inference and took only the assertion** from mechanism 16 — the half that mattered was
   declaration. Now every site declares.
3. **Its totality assertion was true by construction**, in a spec citing the document that
   catalogues that exact mechanism.
4. **It handed the producing agent both the scope test and the pass test** — *"every board that
   **can be drawn at all**"*, with the implementer deciding which those are. `CLAUDE.md` names this
   precisely. Now the site classes and the per-board table are the spec's, written before the run.
5. **Its acceptance contradicted its own scope**, promising the owner a judgement on four boards
   while putting one of them out of scope.
