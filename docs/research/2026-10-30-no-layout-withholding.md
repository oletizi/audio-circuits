Stop the build guide withholding a drawing for a layout reason
==============================================================

2026-10-30, on `feature/schematics-tooling` (PR #20).

**THE INSTRUCTION.** The owner, on a page withheld over a layout measurement:

> *"we need to get rid of this stupid refusal to generate on error. If I can't
> look at it, I cant decide if the refusal is for dumb reasons. Is the refusal
> because of an electrical problem or for a dumb invented layout "problem" that
> agents have no business deciding?"*

and, shouted:

> *"STOP PASSING JUDGEMENT ON LAYOUT!!! DO NOT PASS JUDGEMENT ON LAYOUT!!!!! YOU
> MUST SHOW ME WHAT YOU THINK MIGHT BE WRONG!!!!!!!! YOU ARE NOT A QUALIFIED
> REVIEWER!!!!!!!!!!!!!!!*"

`docs/known-gaps.md` **G305** records the directive with his words; this
document records what it found and what was changed.

The drawings to look at
-----------------------

Every board's drawing, exported by the repository's own census
(`bun run tools/schgen/board-sheets.ts --pdf`), at
`build/schgen-boards/<board>/<board>.pdf`: `pt2399-core`, `pultec-hi-boost`,
`pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-mid`,
`transistor-preamp-buffered`, `-feedback`, `-lab`, `-loop`, `-staged`.

Ten of the eleven carry at least one fallback field placement, which is exactly
what the deleted gate withheld a build-guide page for. **No judgement of any of
them is offered here, and none is this writer's to offer.**

What was wrong
--------------

`lib/schgen/findings.ts`'s `classOf` sorts every finding a gate can raise into
four classes and states that *"the kind-to-class mapping ... is the owner's and
not this file's to revise"*. The four crowding kinds - `body-clearance`,
`glyph-clearance`, `text-clearance`, `field-fallback` - return **`usable`**,
with the comment *"crowding is not incorrectness."* Nine kinds that are wrong
about the circuit return `defective`.

`tools/guide/schematic-source.ts` then made that decision a second time, its own
way, downstream of the classifier:

- `result.findings.length > 0` withheld the page for **any** finding, including
  the four the classifier calls `usable`;
- `result.drawings.every((d) => d.fieldFallbacks.length === 0)` withheld it
  again for a fallback field placement, which is a `field-fallback` finding -
  `usable`.

**Its own history is the argument.** `DEVELOPMENT-LOG.md` §2 records the
fallback gate hiding a whole drawing over a `VCC` label touching a pin number,
while `R4`'s value rendering as `1<dot>5K` - where `1.5K` and `15K` cannot be
told apart - passed ungated. The gate hid the page, so nobody could see either.

Both arms also contradicted a directive already in the register. **G303**,
2026-10-27: *"gates can still refuse to ratify an output, but they shouldn't
HIDE the output."* The census obeys it - it writes every board's drawing with a
`STATUS.md` naming the class - and the build guide did not.

**AND THE REGISTER HAD ALREADY STRUCK THIS EXACT GATE THREE DAYS EARLIER.**
G303, in full: *"G300 recorded him as saying 'if the schematics are wonky, it's
worse than having nothing at all', and the gate built on it (`f42c129`)
withholds a sheet carrying ANY fallback field placement. **That gate is now too
strict and is amended by this.**"* The same entry also contains *"a sheet that
fails its checks still must not reach a build guide."* **Two sentences in one
entry, disagreeing about the same gate, and the code kept the stricter one.**
That is the thing to notice for next time: the ruling was recorded and the code
was not changed, and the entry that recorded it also carried the sentence that
let the gate stay.

**AND THE GATE CAME FROM A MECHANISM, NOT FROM A CRITERION.** **G300** clause 2
is the owner's *"If the schematics are wonky, it's worse than having nothing at
all"*; the mechanism written beside it, by the agent recording it, was *"a gate
on the deliverable: a sheet that fails its clearance checks degrades to the
no-schematic notice."* `CLAUDE.md` already says which half binds: *"the criterion
is the settlement; the mechanism is advice from someone who had not yet tried
it."* The mechanism is what 2026-10-30 struck. The criterion is untouched and
still binds - a `defective` sheet still never reaches a build guide.

Every gate that can withhold, suppress or mark a drawing
--------------------------------------------------------

| # | Gate | Where | Acts on | Action |
|---|------|-------|---------|--------|
| 1 | fallback field placements withhold the guide page | `tools/guide/schematic-source.ts` (was line 194) | `usable` (`field-fallback`) | **DELETED** |
| 2 | any finding withholds the guide page | `tools/guide/schematic-source.ts` (was line 153) | every class, `usable` included | **NARROWED** to `worstClass(findings) !== "usable"` |
| 3 | zero sheets drawn withholds the page | `tools/guide/schematic-source.ts` | no artifact | **KEPT**, reworded: it is an absent drawing, not a judged one. Its old text claimed a measurement ("NOT MEASURED ... no placed text to confirm clear") that only made sense as half of gate 1 |
| 4 | no `schematicRoot` withholds the page | `tools/guide/schematic-source.ts` | no artifact (`not-drawable`) | **KEPT** - the no-drawing notice is the honest output |
| 5 | the printed notices | `tools/guide/schematic-notice.ts` | - | **KEPT**; they print what the resolver decided and decide nothing. Doc comments corrected, because three of them described the deleted ground |
| 6 | `"generated"` with no `schematicRoot` throws | `tools/guide/packet.ts:388` | - | **KEPT** - a guard against a defect in `resolveSchematic`, not a judgement of a drawing |
| 7 | **`onePage`: an exported schematic that is not exactly one page refuses the WHOLE packet** | `tools/guide/schematic-export.ts:57` | structural; **not** `defective` | **LEFT ALONE, AND NAMED - see below. It is now the thing standing where gates 1 and 2 stood.** |
| 8 | the board census | `tools/schgen/board-sheets.ts` | - | **KEPT.** It withholds nothing: every board gets an artifact and a class. It fails the run only on `generator-defect`, which is a bug report about schgen, not a board status. One doc comment corrected: `drawings`'s comment advertised itself as the input to gate 1 |
| 9 | the census's fallback WARNING line | `tools/schgen/board-sheets.ts` `renderBoardSheets` | `usable` | **KEPT** - it prints a count beside a drawing that was written anyway. Disclosure, not suppression |
| 10 | the refusal sheet and `STATUS.md` | `tools/schgen/board-artifacts.ts` | no artifact | **KEPT** - a one-page sheet saying why nothing was drawn is the honest output for a board with no drawing |
| 11 | the geometry census | `tools/schgen/board-geometry.ts` | - | **KEPT** - it already measures unratified drawings deliberately and says so |
| 12 | **the watermark and the title-block comment** | `lib/schgen/render/unratified-mark.ts` | `defective`, `not-drawable`, `generator-defect` | **UNTOUCHED, AND IT WAS ALREADY ON THE OWNER'S LINE**: `markBandText("usable")` and `markStatusComment("usable")` both return `null`, so a crowded sheet carries no mark at all. `tests/schgen/watermark.test.ts` asserts it |
| 13 | **`generate()` (the strict form) throws on ANY finding** | `tools/schgen/generate.ts:327` | every class, `usable` included | **LEFT ALONE - see below** |
| 14 | `assertSheetSafe` throws on any sheet finding | `lib/schgen/render/sheet-check.ts:120` | every class | **LEFT ALONE: it has no production caller.** `lib/schgen/render/sheets.ts:279` calls the non-throwing `sheetSafety`; only tests call the throwing form |
| 15 | `realiseBlock` (the strict form) throws on any finding | `lib/schgen/render/blocks.ts:265` | every class | **LEFT ALONE: no production caller.** `bus.ts:207` calls `realiseBlockReported` |
| 16 | a sheet that cannot be laid out at all refuses the generation | `tools/schgen/generate.ts:295` | no geometry (`not-drawable`) | **KEPT** - no sheet exists to show |

### Gate 13, the one remaining non-`defective` refusal, and why it is left

`generate()` is `generateReported()` plus *"a non-empty `findings` refuses"*, so
it refuses on a `usable` crowding finding. Its callers are `tools/cli/schgen.ts`
and `tools/schgen/verify.ts`, both of which write into a **circuit directory**.

It is left alone for three reasons, and it is flagged rather than quietly kept:

1. **It hides no picture.** `generateReported` holds the same drawing and hands
   it back; `tools/schgen/board-sheets.ts` writes it under
   `build/schgen-boards/`, classified, with its `STATUS.md`. That is G303's
   *"the output should still be available"*, already satisfied.
2. **What it governs is what gets COMMITTED**, not what gets looked at. The
   file says so: *"committing a marked unratified drawing into a circuit
   directory is a decision nobody has taken, and taking it silently inside a doc
   comment is not how this repository changes what it commits."*
3. Changing it changes what `make check` does on four boards, which is a
   separate change with a separate blast radius.

**It is his call, not this writer's.** If the answer is that an unratified
drawing may be written into a circuit directory because it now carries its own
watermark, the one-line change is in `generate()` and the question is whether
the repository wants those files committed.

### Gate 7, which is now the next wall

With gates 1 and 2 gone, a generated drawing reaches the PDF export - and
`onePage` refuses the whole packet:

```
pultec-mid's exported schematic is 2 pages, and this packet's printed structure
names exactly one ("page 2 of this document", in the header's Schematic row).
```

**Every schgen generation will hit this.** A generation writes a hierarchy root
plus one file per sheet (`pultec-mid.kicad_sch` + `mid.kicad_sch`), and
`kicad-cli sch export pdf` on the root exports the root page and the sheet page
- two pages. The hand-drawn `drafted/` sheets are single files, which is why
this never fired before.

It is NOT a layout judgement and it is not removable as it stands: merging two
pages into a document whose own header says *"page 2 is the schematic"* would
make the document lie about itself. The refusal already names the fix -
*"teach `tools/guide/schematic-notice.ts` and `tools/guide/merge-pdf.ts` to name
a range of pages first"* - and that is a feature, not this change. Recorded here
so the next agent finds it before re-discovering it.

What a `usable` page's findings reach
-------------------------------------

**On the guide page: nothing, today.** This is stated rather than fixed, because
inventing a mechanism nobody asked for is how the deleted gates got built.

- The `"generated"` arm of `GuideSchematic` carries no findings field. The page
  prints one line - *"generated by `schgen` ... it is not hand-drawn"* - and
  says nothing about what any gate found. **A builder holding the guide cannot
  see that a value is drawn over a wire.**
- The `"withheld"` arm DOES print its reason in full, including the per-finding
  lines `boardSheets` puts in `blocker`. That machinery is kept and is now
  reached only by a `defective` drawing or an absent one.
- On the sheet itself, a `usable` drawing carries no mark, deliberately
  (gate 12).
- **Durably, they reach `build/schgen-boards/<board>/STATUS.md` and
  `RENDER-REPORT.md`**, written by `bun run tools/schgen/board-sheets.ts`, plus
  that tool's own stdout. In the *guide* path the same artifacts are written
  into the temp directory `resolveSchematic` creates, which the packet deletes -
  so a `make guide` run leaves no record of them.

**What would close it:** a findings field on the `"generated"` arm and a notice
that prints them under the schematic page, so the page that carries the drawing
also carries what the gates said about it. Not done here.

Reachability today
------------------

**All eleven boards declare an `"sch"`**, so `resolveSchematic` returns
`"printed"` on its first branch and no board reaches the changed code through
`make guide` at all. The change is therefore invisible in today's packets, and
the gate it removes was invisible in the same way - which is part of why it
survived. To exercise it, `build/no-layout-withholding/demo.ts` (gitignored)
drives the real `writeGuidePacket` with a declaration copy that omits
`schPath`; that is how gate 7 above was found.

Tests
-----

- **`tests/guide/schematic-class-gate.test.ts` is NEW.** Neither deleted gate
  had a test, which is why a rule contradicting `classOf` survived in the same
  repository as `classOf`. The decision is now covered in both directions: a
  `usable` drawing carrying a `field-fallback` and a `body-clearance` finding
  resolves to a PAGE; a `defective` one is still withheld with `drawn: true`;
  and a row whose `outcome` field disagrees with its own findings cannot smuggle
  a wrong drawing through, because the resolver re-derives the class.
- **`tests/guide/generated-schematic.test.ts` - expectations MOVED, with the
  reason written in the file.** Two fixtures passed
  `"5 fallback field placement(s)"` as a withholding reason. What they assert -
  what the notice prints for a `"withheld"` input - is unchanged and still
  holds, so they now carry a reason a `drawn: true` withholding can actually
  produce. A fixture quoting a reason the resolver can no longer emit is a test
  passing on a situation that does not exist.

Verification
------------

- `bun run typecheck`: clean.
- `make check`: **fails on exactly the four baseline boards and no others** -
  `pt2399-core` (*"component \"delay_ic\" (kind \"ic\") has no parts-list rule
  in tools/bom/needs.ts"*), `transistor-preamp-lab`, `transistor-preamp-loop`,
  `transistor-preamp-staged` (layout state incomplete). Identical to the known
  baseline.
- `bun test`: **4058 pass, 8 fail, 4066 tests across 379 files.** All eight
  failures are `tests/schgen/port-fidelity.test.ts` refusing for an unset
  `SCHGEN_SOURCE`, which is the known baseline, by name:

  ```
  a from that escapes its source root is refused, whether or not it declares one
  a ported file importing a name an externals target does not export is refused, naming both
  every copied (non-.ts) fixture is byte-identical to its pedals source
  every declared source root is a directory on disk and is used by an entry
  every diverged entry names a real pedals source, a file on disk, and its reason
  every diverged file's pedals source is unchanged since it diverged
  every ported file is its source, rewritten only by the manifest
  no hand-written file shadows a pedals source file
  ```

  The guide suite alone (`bun test tests/guide/`) is 212 pass, 0 fail across 30
  files, including the five new cases.
