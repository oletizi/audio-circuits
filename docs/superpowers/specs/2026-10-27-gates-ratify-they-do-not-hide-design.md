# Gates classify; they do not hide

**Status:** revision 4, 2026-10-27. Three independent reviews preceded it — one Claude agent on
revision 1 (five Criticals), Codex on revision 2 (*not sound*, three Criticals) and on revision 3
(*not sound*, four Criticals). **Revision 4 changes approach rather than patching**, for the reason
in the next section. Earlier revisions: `f25600e`, `5457209`, `cc9874e`.

**Authority:** `docs/known-gaps.md` **G303** — the owner's directive, his watermark reasoning, and
his line between *defective* and *merely ugly*, verbatim.

## Why this revision is shorter than the last

Revision 3's four Criticals were one defect wearing four hats: **its refusal-site table was not
total, and no hand-written table ever will be.** Codex named roughly twenty more throw sites in
`generate.ts`, `frames.ts`, `emit.ts`, `elk/graph.ts`, `read-graph.ts`, `sheet-graph.ts`,
`layout-check.ts` and `text-scene.ts`, and its enumeration was itself explicitly partial.

**`false-greens.md` mechanism 16 is *declaration plus a totality assertion*. Revisions 2 and 3
attempted the declaration IN A DOCUMENT.** A table of ~350 sites in prose would be stale at its
first commit and would be exactly what `CLAUDE.md` forbids — *a figure in prose is a transcription
with a date on it*.

**So the declaration moves into the code, and a test enforces totality.** The spec specifies the
mechanism and the vocabulary. The enumeration is implementation work that the mechanism makes
impossible to leave half-done.

## The directive

> *"Gates can still refuse to ratify an output, but they shouldn't **hide** the output. The output
> should still be available, but clearly classified as unratified"*

> *"it's ugly but usable. I want to preserve the warning watermark for schematics that are
> incorrect or otherwise should not be trusted or used"*

> *"Both."* — on whether the mark is a watermark or a title-block field.

## The four classes

Three describe a board. The fourth describes **this generator**, and keeping it separate is the
point: a broken invariant must never read as a property of the circuit.

| class | meaning | artifact | census |
| --- | --- | --- | --- |
| `usable` | a drawing exists and is correct. May be ugly. | the drawing, unmarked | counted usable |
| `defective` | a drawing exists and is **wrong about the circuit** | the drawing, **marked twice** | counted defective; never reaches a build guide |
| `not-drawable` | no geometry exists and none could | a **one-page refusal sheet** naming the board and the reason | counted not-drawable |
| `generator-defect` | an invariant of this generator failed | **whatever geometry exists, if any, plus the refusal sheet** | **not a board status — the census FAILS** |

**`generator-defect` fails the run.** It is not a bucket a board can sit in quietly: a snap
disagreement whose own message says *"this is a defect in `lib/schgen/elk/snap.ts`, not a layout
that cannot be drawn"* is a bug, and a bug that reports as an ordinary undrawable board is this
project's cardinal failure. Revision 3 introduced this class and never said what it produced; this
is the answer.

## The mechanism

### 1. Every refusal carries a declared class, or the run fails

A refusal is raised as a typed error carrying its class, not a bare `Error`. **The chokepoint is
`tools/schgen/board-sheets.ts:185`**, the one `catch` every refusal already passes through. It
currently reads `caught.message` and calls everything `refused` — a classifier that cannot tell a
gate from a `TypeError`, which is the inference half mechanism 16 replaced.

**An untyped error reaching that catch is a `generator-defect` and fails the run.** That is the
totality assertion: not a count that sums to itself, but a rule under which an unconverted throw
cannot be silently absorbed. **Enumerating the sites is implementation work; the test is what makes
it finishable.**

### 2. Findings are typed, with a declared kind→class mapping

`checkLayout` returns `string[]` (`layout-check.ts:191`) mixing shorts, split nets, dangling ends,
NC contact, body clearance, glyph clearance and text clearance. `assertSheetSafe` likewise combines
wire safety with body clearance (`sheet-check.ts:83`). **A class cannot be read off a sentence.**

Each producer returns findings with a `kind`. **The kind→class mapping is a single exhaustive table
in code**, over a closed union, so the compiler fails when a kind is added without a class. The
mapping's principle, which decides every case:

- **wrong about the circuit → `defective`.** A short, a split net, a missing junction, an NC pin in
  contact, a dangling end, a label that misnames a net, cross-sheet or reference disagreement.
- **hard to read → `usable`.** Body clearance, glyph clearance, text clearance, field fallbacks,
  crowding of any kind.

**That principle is the owner's line and is not the implementer's to re-decide.** Where a kind is
genuinely ambiguous, it is `defective` and the ambiguity is reported — a drawing wrongly withheld
costs a look; a drawing wrongly shipped costs a build.

### 3. The geometry survives

```
adapt.ts:294   const layout: BlockLayout = { ... }        geometry exists
adapt.ts:331   checked: null,                             junction arm discards it
adapt.ts:362   checked: layout,                           clearance arm keeps it in AdaptReport
adapt.ts:367   return adaptElkLayoutReported(...).result  and HERE it is dropped
```

`RealiseResult`'s false arm carries `mismatch` and no layout (`block-types.ts:151`). The widening
runs `RealiseResult` → `elkBackendFrom` → `realiseBlock`/`renderBlock` → `layoutSheet` →
`SheetDrawing` → `Generation` → `BoardSheets`, **and the sheet-level gates
(`sheets.ts:258-259`) need non-throw paths too** — without them the preamp boards simply refuse
later, which is what killed revision 2's prediction.

**Emission is inside the boundary.** A throw in `emit.ts` or `generated-files.ts` can hide a
drawing that is already laid out, so those sites are classified like any other. Revision 3's
*"between `validateCircuit` and emission"* was ambiguous and is replaced by: **every refusal from
`validateCircuit` to the written file.**

**A partial multi-sheet generation is kept.** When a later sheet or a generation-level check fails,
the sheets already drawn are emitted and marked, rather than the whole generation being discarded.

### 4. The marks, both of them

1. **A watermark** as graphic text in the `.kicad_sch` — the editable artifact must carry it, and a
   mark applied only at PDF export leaves the file `kicad-cli` reads unmarked. **Possible to read,
   not easy.**
2. **A title-block comment field**, so the warning survives a zoom, a crop or a thumbnail. `emit.ts`
   carries nine comment fields; one is reserved for status.

**Exact text, placement and size are the implementer's to choose and the owner's to accept by
looking at a rendered page** — per `G303`, that bar is settled by showing him one, not by prose.

**Obligation 5 exemption, stated:** `adapt.ts:29` forbids emitting a schematic *"whose geometry was
altered after its last clearance check."* The mark is added after it and is exempt because **it is
not circuit geometry** — no net, no pin, no connectivity. A sheet must never be refused for its own
warning.

**It is a warning, not an enforcement boundary.** Removal is detected only when regeneration or
verification runs (`generated-files.ts:121`); a person can strip it in KiCad and print. This spec
claims nothing stronger.

**Both directions asserted:** a `defective` sheet carries both marks; a `usable` one carries
neither. **A deliberately defective fixture** proves the mark is emitted, survives `kicad-cli`
export, and leaves the drawing inspectable — with zero defective boards expected, no test over real
boards exercises it.

### 5. Where the output lives

A durable, gitignored directory, one artifact per board, replaced wholly on each run. The census
runs from a test as well as from its CLI — `boardSheetsCensus` has exactly one caller today, its
own `import.meta.main`.

## What is committed, and can fail

- `pultec-mid` is `not-drawable`.
- **No board is `generator-defect`.** If one is, the run fails and that is a bug report.
- **Every other board produces a drawing** — `usable` or `defective`. If any other board comes back
  `not-drawable`, a gate was misclassified.
- **No per-board usable/defective split is predicted.** Revision 2 predicted one and Codex disproved
  it from a gate the table had missed; predicting again before the sites are enumerated would be
  guessing twice.

## Acceptance

**Every board in `BOARDS` has an artifact a person can open**, carrying its class; the commitments
above hold or their failures are reported; and **the owner, looking at the three transistor-preamp
drawings nobody has ever seen, can say whether the gates that hid them were right.**

**Code cannot satisfy that last clause.** The reform is worth nothing if nobody then looks.

**Not done when:** statuses exist in a data structure but the artifact does not carry one. Not when
the census prints a new column. Not when the tests pass.

## Out of scope, and the narrowing stated

- **Fixing any gate.** This design exists so that question can be asked with the drawing in hand.
- **`pultec-mid`** gets no drawing, and **this is where G303's *"every board produces a drawing"* is
  narrowed.** For a not-drawable board the interrogable artifact is **the demand** — it refuses
  because `pinsDeclared` wants a disposition for `SW_MID` pin 12, and **G282** records that exact
  class of demand being questioned rather than satisfied.
- **The selector-bank arrangement**, which this interrupted.

## What three reviews caught

**Revision 1 (Claude):** its premise about throws was false; it kept inference and took only
mechanism 16's assertion; its totality assertion was true by construction, in a spec citing the
catalogue of that mechanism; and it handed the producing agent both the scope test and the pass
test.

**Revision 2 (Codex):** a second clearance gate at `sheets.ts:259` re-catches what the first
caught, so its `10 of 11` prediction was unsupported; geometry is dropped at `adapt.ts:367`, not
where it said; and **it silently dropped the owner's "Both"**.

**Revision 3 (Codex):** its "total" table omitted ~20 sites and could not be completed by hand;
`generator-defect` had no output semantics; "per-finding, typed" still left the acceptance policy
to the implementer.

**The thread through all of them: a confident claim about code read too quickly, and an
enumeration attempted in prose that belonged in a type.** All three reviews were code-grounded and
each paid for itself in one pass.
