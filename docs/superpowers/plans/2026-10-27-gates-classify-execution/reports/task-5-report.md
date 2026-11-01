## Task 5: The two marks — report

**Commit:** `d994d03` on `feature/schematics-tooling`, pushed.
**Spec:** `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4).
**Authority:** `docs/known-gaps.md` **G303** — the owner's directive and his watermark reasoning.

---

### What was built

| | where |
| --- | --- |
| the watermark, as graphic `text` in the `.kicad_sch` | `lib/schgen/render/unratified-mark.ts` (new, hand-written), emitted by `lib/schgen/render/emit.ts` |
| the title-block comment | the same module; `emitContext` reserves one of KiCad's nine slots |
| the obligation-5 exemption, at the site | `lib/schgen/elk/adapt.ts`, in the numbered order-of-operations block where obligation 5 is stated |
| the deliberately defective fixture | `tools/schgen/defective-fixture.ts` |
| both directions, over all eleven boards | `tests/schgen/watermark.test.ts` |

`EmitContext` gains a **required** `status: RefusalClass`. There is no default: a silent
`usable` would let an unratified generation go out unmarked the day somebody adds a caller and
forgets. `tools/schgen/generated-files.ts` reads it off `worstClass(findings)` — the findings are
passed in, not the class, so `worstClass` stays the single place a class is decided.

`lib/schgen/render/emit.ts` moved from `files[]` to `diverged[]` in `tools/schgen/port-manifest.json`
with `sourceSha 4e600c1f…`. The three new files are in `handWritten`.

---

### The watermark: text, placement, size, weight — and why

**Text:** `DEFECTIVE - DO NOT BUILD` (24 characters). Short enough to set large, and it answers the
only question a person holding the page has. `markBandText` is an exhaustive switch over
`RefusalClass` with no `default` arm, so `not-drawable` and `generator-defect` have their own text
too — see *The hole I closed* below.

**Placement:** four horizontal bands, centred on the page width, at 0.14, 0.34, 0.54 and 0.74 of
the page height. **Horizontal and not diagonal**, deliberately: KiCad's schematic text takes its
angle from a four-way spin style, so a 45° band is not something this code can ask for without
discovering at export time whether the angle survived, and an unverified angle is a poor bet on the
one item whose job is to be legible. **The bands stop well above the title block**, because that is
where the *other* mark prints — a probe with four evenly spaced bands struck through its own
title-block comment and left it half-legible.

**Size:** computed from the paper, not fixed — `0.86 × paper width / line length`. 0.86 keeps the
band inside KiCad's drawing frame; the first probe, set by eye, lost the `D` of `DEFECTIVE` and the
`D` of `BUILD` under the frame. One character per glyph size is `text-boxes.ts`'s own measured
convention, and it is conservative in the right direction (the rendered probe measured ≈0.92 × size
per character, so a band comes out slightly narrower than its budget). On A3 that is ≈15 mm glyphs;
on A4 ≈10.6 mm.

**Weight:** red `200,0,0`, **alpha 0.35**, **stroke thickness 0.15 × size**.

This was chosen by looking at rendered pages, not by reasoning. Seven variants of
(alpha × thickness × band count) were exported through `kicad-cli` to PDF and rasterised at 150 dpi
over `pultec-hi-boost`'s real A3 sheet. What the readings found:

- **Alpha alone is not enough.** At alpha 0.3 with KiCad's default pen the bands are a ghost —
  present if you look for them, missable if you do not. The glyphs are **stroked, not filled**, so a
  thin pen leaves almost no ink.
- **`thickness` is the control that makes it unmissable.** 0.15 × size is where the bands read as a
  warning from across a desk.
- **Alpha 0.5 at that thickness is too much**: it swallowed `RV1 47K` and `C7 1000pF` whole. A
  drawing whose part values cannot be read is not "possible to read".
- **Alpha 0.35 at that thickness is the setting shipped.**

---

### The title-block comment

`UNRATIFIED - DEFECTIVE: this drawing is WRONG ABOUT THE CIRCUIT - DO NOT BUILD` (77 characters,
under the ~80 the title-block strip holds; the operative words are at the end of these lines, so an
overrun loses exactly the part that matters).

It goes in **`comment 1`**, which the rendered page corrected me about: KiCad stacks the comment
fields *upward*, so comment 1 prints at the **bottom** of the stack, immediately above `Sheet:` and
the title — the spot a reader's eye arrives at on its way to the title. My first code comment
claimed the opposite ordering; `marked.pdf` is what fixed it.

**One of the nine slots is reserved unconditionally**, so a caller gets eight (`MAX_AUTHOR_COMMENTS`).
A warning field that exists only when there is room for it is not a field a reader can rely on, and
the generation that most needs the warning would be the one with no room. `emit-refusals.test.ts`'s
"at most 9" test became an "at most 8, the ninth reserved" test with the reason in a comment.

---

### Step 6: I rendered the page and read it

`build/schgen-defective-fixture/marked.pdf`, page 2 (A3, `hi-boost.kicad_sch`), rasterised at 150 dpi
and again at 300 dpi cropped to the top-left quadrant. In my own words:

**Is the warning unmissable?** Yes, and not marginally. Four bands of pink-red capitals march down
the page, each spanning nearly the full width; the top three cross the drawing and the fourth sits
in the empty lower half. You cannot look at any part of that page without a letter of
`DEFECTIVE - DO NOT BUILD` in view. At thumbnail size the drawing dissolves into noise and the
bands are the only thing still legible, which is the right failure mode. The title block is clean
and carries the full sentence in red, third line of the comment stack, directly above `Sheet: /…`.

**Can you still trace the circuit underneath?** Yes. At 300 dpi the first band runs straight through
the hi-boost section — over `RV1 47K`, over the `10K` trimmer, over `hi_boost_out` — and every one
of those reads. The bands are *outlines*, not fills: the glyph strokes are wide but there is clear
paper inside the `D`, the `O`, the `E`, and wires pass through them as dark green lines over pink.
Where a green wire crosses a pink stroke the wire is still the darker mark and the eye follows it.
Component values under a stroke are the hardest case — `hi_boost_out`'s last two letters and
`SI6 56K` in the low-boost group sit partly under ink and need a second look — but nothing I tried
to read was illegible.

**Honest verdict against the bar:** this is "possible to read, not easy", and it lands nearer the
"possible" end than the "easy" one. I would not want to work from this page for an hour. I could
answer "what is R1 and where does its right-hand end go" from it in a few seconds, which is what
interrogating a gate's output requires. That is the trade the owner asked for; he accepts or
rejects it by opening `build/schgen-defective-fixture/marked.pdf` (regenerate with
`bun tools/schgen/defective-fixture.ts --pdf`) and comparing it with `ratified.pdf` beside it, which
is the same geometry unmarked.

**Page 1 (the root sheet, A4)** carries the bands too, although it draws no circuit — it is the file
a person opens first, and a root that looked ratified while its children were marked would be the
crop case all over again at project scale.

---

### kicad-cli

Clean, every time, no warning beyond the usual macOS Fontconfig noise:

- `sch export pdf` on the marked root: `Plotted to …marked.pdf. Done.`, exit 0, both pages correct.
- `sch export netlist --format kicadxml` on the marked root and the unmarked one: **the components,
  their pins and every net are byte-identical.** This is the obligation-5 exemption measured rather
  than asserted — the claim is that the mark is not circuit geometry, which is a claim about what
  KiCad makes of the file, so KiCad was asked.
- The `<design>` header *does* differ, and that difference is the mechanism working, not a leak:
  the status comment shows up as `<comment number="1" value="UNRATIFIED - DEFECTIVE…"/>`, because a
  title-block field is a title-block field and KiCad reports them. The test excludes the header and
  says in as many words what it is excluding and why, and asserts the excluded part really does
  differ so the exclusion cannot hide an empty comparison.

---

### Verification

| | result |
| --- | --- |
| `bun run typecheck` | clean |
| `bun test` (with `SCHGEN_SOURCE` set) | **`Ran 3947 tests across 367 files`, 3947 pass, 0 fail**, 44775 expect() calls, 172 s |
| census | unchanged: `10 of 11 boards produce a drawing: 10 usable, 0 defective`; `1 produce none: 1 not-drawable` |
| `tests/schgen/port-fidelity.test.ts` | 12 pass |

**The `Ran` total, term by term.** Baseline `3930` + `17` = `3947`. The seventeen are exactly
`tests/schgen/watermark.test.ts`. Nothing else changed count: `emit-refusals.test.ts` had one test
rewritten in place, not added.

**One run of three was not clean and it is worth recording.** The first full run reported
`3945 pass, 2 fail`; one of the two was `tests/schgen/decomposition-probe.test.ts` timing out at
5000 ms, which the brief names as a load-dependent flake. The second failure's name scrolled out of
the captured tail and I did not keep it — two subsequent full runs were `0 fail`, so both were load
flakes, but I am recording that I lost the name rather than asserting what it was.

**`make check` fails, for four reasons that are not this change.** Its `typecheck` passes and both
schematic guards pass (`circuits/pultec/generated/three-band-eq.net.xml is current`,
`scaffold.json is current`). The four failures are all in the board walk:
`circuits/pt2399-core/pt2399-core.ts` has no `bomConditions` export; `CUT_STATE UNRESOLVED` on a
pultec board; 15 open nets on a transistor-preamp board's HC8; and no `LEAD_SPANS` entry for
`Capacitor_THT:CP_Radial_D10.0mm_P5.00mm`. None of those paths is touched by this commit. **I did
not prove they pre-date it by running `make check` at `HEAD~1`** — I am reasoning from which files
they read, which is weaker than a measurement, and I say so rather than claiming otherwise.

---

### Decisions I took that the brief left to me

**1. The marks key off `RefusalClass`, not off "is it defective".** The brief and the spec say *a
`defective` sheet carries both marks; a `usable` or `not-drawable` one carries neither*. I
implemented *`usable` is the only unmarked class*, which is the same thing for every reachable case
today and closes a hole the literal reading leaves: **a `generator-defect` finding does not have to
come with an absent drawing.** A checker could raise one and still leave a complete, emittable
generation — `worstClass` would say `generator-defect`, the census would write the sheets, and under
the literal rule they would go out unmarked. `not-drawable` and `generator-defect` therefore have
their own band text and their own comment. They are unreachable through `generatedFiles` today, and
the test over the eleven boards asserts the direction that matters for them: a board with no drawing
writes no sheet at all, only its `REFUSAL.kicad_sch`.

**2. The strict `generate` still refuses, and two stale doc comments were corrected rather than
deleted.** Both said, in effect, *"the marks are Task 5; until they exist, refusing is the only
honest thing this form can do."* That reason has now expired. I did **not** change the behaviour:
whether a circuit directory should hold a marked unratified drawing is a decision about this
repository's committed artifacts, nothing in the brief or the spec takes it, and taking it silently
inside a doc comment is not how this repository changes what it commits. The comments now say the
question is open rather than answered by a missing feature. **This is the thing most worth an owner
decision out of this task.**

**3. The fixture marks a real board, not a toy.** `pultec-hi-boost` — one A3 sheet, 24 parts,
inductors, the capacitor bank, both trimmers, the rotary switch, the junction bus — generated once
and emitted **twice** from the same circuit, annotation and drawings, so everything that differs
between `ratified/` and `marked/` is the mark and the manifest hash that covers it. A second
`generateReported` would re-run ELK and a difference could then be a different layout. The fixture
refuses if that board's gates are not clean, with the reason stated: a fixture whose baseline is
already unratified proves nothing about the mark.

---

### Things I found and am not fixing (not in `docs/known-gaps.md`, which is frozen)

**A. `fittingPaper`'s `grewFrom` is computed and never read, and `emitSheet` writes the DECLARED
paper.** `lib/schgen/render/sheets.ts:217-241` returns `grewFrom`, and `grep` finds no reader
anywhere. `emitSheet` puts `d.sheet.paper` — the *declared* size — in the file header, while the
geometry is laid out against `PAPER[fitted.paper]`, the size the packer actually landed on. **If a
sheet ever grows, the file will claim a page smaller than its own contents.** No sheet grows today
(every board emits A3 or A4 and nothing reported a growth), so this is latent. I placed the
watermark against `PAPER[d.sheet.paper]` for exactly this reason, with the reason at the call site:
the page KiCad draws is the one named in the header, and a warning band that fell off that page
would be a warning nobody sees.

**B. The marks are a warning, not an enforcement boundary** — the spec says so and this
implementation claims nothing stronger. A person can delete the four `text` items in Eeschema and
print. Removal is detected only when regeneration or verification runs.

**C. No plain `Error` fired during this work.** The brief named the residual untyped throws in
`emit.ts`, `generated-files.ts`, `fittingPaper` and others as a known residual; none of them was
reached, including by the two new `throw`s I added in `unratified-mark.ts` and `defective-fixture.ts`.

---

### What a reviewer should check by looking, not by running

1. Open `build/schgen-defective-fixture/marked.pdf` next to `ratified.pdf`
   (`bun tools/schgen/defective-fixture.ts --pdf`). Page 2 of each is the same drawing.
2. Decide whether the weight is right. **That is the owner's call and not the implementer's**, which
   is why the constants that set it — `BAND_WIDTH`, `BAND_TOP`, `BAND_PITCH`, `BAND_COUNT`,
   `BAND_THICKNESS`, `BAND_ALPHA` — are six named values at the top of one 200-line module with the
   probe readings written beside them, rather than numbers buried in the emitter.
3. `diff build/schgen-defective-fixture/ratified/hi-boost.kicad_sch build/schgen-defective-fixture/marked/hi-boost.kicad_sch`
   is 58 lines: four `text` items and one `comment`. Nothing else moved.
