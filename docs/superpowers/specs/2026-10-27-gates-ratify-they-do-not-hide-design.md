# Gates classify; they do not hide

**Status:** revision 3, 2026-10-27. Two independent reviews preceded it — one by a Claude agent on
revision 1 (five Criticals), one by Codex on revision 2 (three Criticals, verdict *not sound*).
**Both found factual errors about this codebase, and revision 2's were load-bearing.** What each
got wrong is at the end; revision 1 is `f25600e`, revision 2 `5457209`.

**Authority:** `docs/known-gaps.md` **G303** — the owner's directive, his watermark reasoning, and
his line between *defective* and *merely ugly*, all verbatim. This designs the mechanism. Where it
narrows the directive it says so.

## The directive

> *"Gates can still refuse to ratify an output, but they shouldn't **hide** the output. The output
> should still be available, but clearly classified as unratified"*

> *"it's ugly but usable. I want to preserve the warning watermark for schematics that are
> incorrect or otherwise should not be trusted or used"*

> *"Both."* — on whether the mark is a watermark or a title-block field.

## The three classes

A drawing **wrong about the circuit** must not be built from. A drawing that is **correct and hard
to read** is a drawing, and it ships.

- **`not-drawable`** — no geometry exists. The reason is printed; there is no picture.
- **`defective`** — a drawing exists and is wrong about the circuit. **Marked twice** (below), and
  it does not reach a build guide.
- **`usable`** — a drawing exists and is correct. It may be ugly. It ships with its findings.

## What this changes today — AND WHY THE PREDICTION IN REVISION 2 WAS WRONG

Revision 2 committed a table promising `10 of 11` usable, on the strength of three boards refusing
at the block-level clearance gate. **Codex disproved it before implementation**, which is what a
pre-committed prediction is for:

`lib/schgen/render/sheets.ts:258-259` runs `assertSheetSafe` and `assertTextClear` **after** block
realisation, and `textProblems` checks `pinTexts` overlaps — the same class as the preamp refusal
(`value of power symbol VCC 1 … overlaps pin Q1.2 text`). The `fallback` exemption covers only
Reference/Value fields the placer marked; a power symbol's value is not one. **So preserving the
block-level geometry moves those boards to a different throw and nothing else.**

**The lesson generalises and is the reason the site table below is total:** a reform that converts
one gate and leaves a later gate of the same class in place has changed nothing visible. The
sheet-level gates are in scope, and revision 2 omitted them.

**No per-board prediction is made in this revision**, because an honest one requires knowing the
sheet-level gates' behaviour after conversion, and that is what the first run measures. What IS
committed, and what the first run can disagree with:

- `pultec-mid` is `not-drawable`. It refuses at `validateCircuit`, before any geometry.
- Every other board is `usable` or `defective`, and **none is `not-drawable`** — if a board other
  than `pultec-mid` comes back not-drawable, a gate was misclassified and that is a finding.
- **Zero boards are `defective`** unless a correctness gate fires. If one does, the drawing and the
  finding are both reported rather than the number being quietly accepted.

## Scope: every refusal site declares its class, in code

**`false-greens.md` mechanism 16: *"inference was replaced by declaration plus a totality
assertion."*** Revision 1 took the assertion and left the inference. Revision 2 declared some sites
and missed the sheet-level ones, so the totality had no defined population.

**The population is every `throw` between `validateCircuit` and emission**, enumerated below. **An
unconverted throw reaching the census is a failure, not a `not-drawable`.**

| site | class | why |
| --- | --- | --- |
| `adapt.ts` junction disagreement | `defective` | a branch with no junction is a connection KiCad does not make |
| `adapt.ts` clearance | `usable` | crowding |
| `adapt.ts:280`, `:304` snap disagreements | **`generator-defect`** | their own text says *"this is a defect in `lib/schgen/elk/snap.ts`, not a layout that cannot be drawn"*. A fourth class, because calling a broken invariant `not-drawable` makes a bug read as an ordinary board |
| `blocks.ts:265`, `bus.ts:137` invalid layout | **per-finding, typed** | see below |
| `blocks.ts:259` every template `not-applicable` | `not-drawable` | no backend produced geometry |
| `blocks.ts:296`, `:304` backend missing / refusing | inherits the wrapped refusal's class | |
| `bus.ts:76`, `:119` construction failures | `not-drawable` | thrown mid-construction, no layout in hand |
| **`sheets.ts:258` `assertSheetSafe`** | **per-finding, typed** | omitted in revision 2; the reason its prediction failed |
| **`sheets.ts:259` `assertTextClear`** | **`usable`** | text crowding at sheet level — the same class as the block-level clearance gate, and it must be converted with it or nothing changes |
| **`sheets.ts:77` packer failure** | **`not-drawable`** | no placement exists |
| **`sheets.ts:224`, `:244` paper exhausted** | **`not-drawable`** | a drawing that fits no paper has no paper to be drawn on |
| **`sheets.ts:61`, `:95`, `:112` symbol/unit/body missing** | **`generator-defect`** | an invariant, not a board property |
| `generate.ts:368`, `:377` refs and cross-sheet | `defective`, generation-level | correctness, attributable to no single sheet |
| `validateCircuit` | `not-drawable` | **for the circuit it rejects.** Not asserted of every input refusal — revision 2's *"no geometry, none possible"* overclaimed |

### Findings are typed, not prose

`checkLayout` returns `string[]` (`layout-check.ts:191`), mixing wrong connectivity, dangling
wires, body clearance and text clearance. **A class cannot be read off a sentence**, and revision
2's "per-problem" left the implementer to invent a correctness policy by parsing prose.

**`checkLayout` and `textProblems` return typed findings** — a kind, a severity class, and the
message — and the drawing takes the worst class among its findings.

## The mechanism

### The chain, corrected

Revision 2 said the geometry is preserved at the clearance arm and lost on one line. **It is lost
one layer higher, and revision 2 named the wrong place:**

```
adapt.ts:294   const layout: BlockLayout = { ... }        geometry exists
adapt.ts:331   checked: null,                             junction arm discards it
adapt.ts:362   checked: layout,                           clearance arm keeps it in AdaptReport
adapt.ts:367   return adaptElkLayoutReported(...).result  <-- AND HERE IT IS DROPPED
```

`RealiseResult`'s false arm carries `mismatch` and no layout (`block-types.ts:151`). So the
widening is `RealiseResult` → `elkBackendFrom` → `realiseBlock` / `renderBlock` → `layoutSheet` →
`SheetDrawing` → `Generation` → `BoardSheets`, **plus non-throw paths for the sheet-level gates**,
which revision 2's "one return chain and one null" did not cover.

### Findings have two homes

`SheetDrawing` carries sheet-level findings, as `fieldFallbacks` already does. `Generation` carries
generation-level ones, because `assertRefsMatchDrawings` and `assertCrossSheet` belong to no single
sheet. **A generation-level `defective` marks every sheet of that generation** — the drawing a
person opens must carry the warning, and nothing in `Generation` reaches the paper on its own.

### Status is anchored

The population is `BOARDS`, asserted at `tests/schgen/board-declarations.test.ts:48` as
`expect(BOARDS.length).toBe(11)`. The census asserts its rows cover `BOARDS` exactly. **A test runs
the census** — `boardSheetsCensus` has exactly one caller today, its own `import.meta.main`, so
revision 1's "tests assert on status" described a harness that did not exist.

### The mark, BOTH of them

The owner said **"Both"**, and **revision 2 dropped the title block** — a silent narrowing of an
explicit instruction, in a document with a section about not doing that.

1. **A watermark**, as graphic text in the `.kicad_sch`. The editable artifact must carry it; a
   mark applied only at PDF export leaves the file `make check` runs `kicad-cli` over unmarked.
   **The bar is possible to read, not easy.**
2. **A title-block field**, so the warning survives a zoom, a crop, or a thumbnail where the
   overlay is not in frame.

**Obligation 5 exemption, stated rather than assumed.** `adapt.ts:29` forbids emitting a schematic
*"whose geometry was altered after its last clearance check."* The mark is added after it, and is
exempt because **it is not circuit geometry** — no net, no pin, no connectivity. A sheet must never
be refused for its own warning.

**What the mark is and is not.** It survives export and is detected if removed: exact
generated-file comparison (`generated-files.ts:121`) and the manifest hash both change. **It is not
tamper-proof** — a person can delete it in KiCad and print. It is a warning to a reader, not an
enforcement boundary, and this spec claims nothing stronger.

**Both directions are asserted over all eleven**: a `defective` sheet carries both marks; a
`usable` or `not-drawable` one carries neither.

**And a deliberately defective fixture is required.** With zero boards predicted defective, a test
that only checks real boards cannot exercise the watermark at all. A fixture with a known
correctness fault proves the mark is emitted, survives `kicad-cli` PDF export, and leaves the
drawing inspectable underneath.

### Where the output lives

A durable, gitignored output directory holding one artifact per board. `not-drawable` boards get a
**one-page refusal sheet** naming the board and the reason — not a drawing, and not nothing, so
that *no picture exists* is itself visible rather than an absence. Revision 2 claimed "every board
has a PDF" while defining a class that has none.

## Acceptance

**Done is:** every board in `BOARDS` has an artifact on disk a person can open; each carries its
class; the committed expectations above either hold or their mismatches are reported as findings;
and **the owner, looking at the three transistor-preamp drawings nobody has ever seen, can say
whether the gates that hid them were right.**

**That last clause is the point and code cannot satisfy it.** The reform is worth nothing if nobody
then looks.

**Not done when:** the statuses exist in a data structure but the artifact does not carry one. Not
when the census prints a new column. Not when the tests pass.

## Out of scope, and the narrowing stated

- **Fixing any gate.** Whether each is *right* is per-gate work, and this design exists so it can be
  asked with the drawing in hand.
- **`pultec-mid`** gets no drawing. **This is where G303's *"every board produces a drawing"* is
  narrowed.** The interrogable artifact for a not-drawable board is **the demand**, not a picture —
  it refuses because `pinsDeclared` wants a disposition for `SW_MID` pin 12, and **G282** records
  that exact class of demand being questioned rather than satisfied.
- **The selector-bank arrangement**, which this interrupted.

## What the two reviews caught

Kept because the pattern outlives the corrections.

**Revision 1 (Claude):** its central premise about throws was false; it kept inference and took
only mechanism 16's assertion; its totality assertion was true by construction, in a spec citing
the catalogue of that exact mechanism; and it handed the producing agent both the scope test and
the pass test — *"every board that can be drawn at all"*, with the implementer deciding which those
are.

**Revision 2 (Codex):** a second clearance gate at `sheets.ts:259` re-catches exactly what the
first one caught, so its `10 of 11` prediction was unsupported; the geometry is dropped at
`adapt.ts:367`, not at the line it named; and **it silently dropped the owner's "Both"**. Its site
table was not total, and its "per-problem" classification was undeterminable because `checkLayout`
returns prose.

**The common thread in all three of this writer's errors: a confident factual claim about code
that had been read too quickly.** Both reviews were code-grounded and both paid for themselves in
one pass.
