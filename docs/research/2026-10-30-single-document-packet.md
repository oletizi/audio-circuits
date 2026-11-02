# One printable document per board

**Date** 2026-10-30. **Branch** `feature/schematics-tooling` (PR #20).

The owner, on a packet that was two PDFs:

> *"merge them. I want a single printable document"*

and, mid-task, the constraint that changed the shape of the answer:

> *"We also need to change the page size of the schematics—I don't have an
> A3-capable printer. I live in california and have a printer capable of
> printing US letter 8.5x11""*

**This writer is not a qualified reviewer of a drawing and nothing here is a
judgement of one.** `EVALUATING-DRAWINGS.md` binds. Everything below about a
page is a measurement or an observation of what is on it and where.

---

## 1. What changed

`boards/<board>/guide/` held an eleven-page `guide.pdf` and a one-page
`schematic.pdf` beside it, and **nothing in the packet said the stack was two
documents** - the guide's `Schematic` header row named the `.kicad_sch`, which
is a file a builder at a bench cannot open, while the printable schematic page
sat unnamed in the same directory
(`docs/research/2026-10-29-guides-with-approved-schematics.md` §6.1 and §6.2
reported both).

Now there is one document. `guide.pdf` is the guide's own pages with the
schematic merged in as **page 2**, and `schematic.pdf` is a staging
intermediate that the packet removes before it publishes anything.

| | before | after |
| --- | --- | --- |
| files in `guide/` | 6 (7 with the clusters image) | 5 (6 with the clusters image) |
| printable PDFs | 2 | **1** |
| `Schematic` header row | `drafted/pultec/…/….kicad_sch` | `page 2 of this document, printed from drafted/pultec/…/….kicad_sch` |

### Where the schematic page went, and why page 2

`SCHEMATIC_PAGE` in `tools/guide/merge-pdf.ts` is the one place that fact
lives: the merge builds its page ranges from it and the header row prints it,
so the printed row and the merge cannot come to disagree. Three reasons it is
2 rather than 1 or last:

1. **The header names it.** Page one is the header block - board, date, layout,
   schematic - and the `Schematic` row's job is to send a reader to the
   drawing. A row pointing at the very next page is a pointer somebody holding
   paper can follow; a path to a KiCad source file is not.
2. **It is a reference, so it arrives before the work.** Everything after it is
   something a builder DOES - the three layout images, the stand-in groups
   decision, then the checklist whose section 1 is where a build starts. The
   schematic is what the rest is checked against, so it is in hand before the
   first step rather than behind eleven pages of it.
3. **The document still opens on what it is.** Putting the schematic first
   would make a reader meet a drawing before the page naming the board, the
   date and the layout it came from - and would move page one's notices, which
   exist to be seen before any other page, to page two.

The guide's own pagination is untouched: its page one is still the header, its
images still begin on its page two. Only the merged document's numbering shifts,
by one, from the schematic page on.

---

## 2. The merge tool

Resolved exactly the way `KICAD_CLI` and `HTML_TO_PDF` are, because that was
the instruction and because a third pattern would be a third place a path can
be wrong:

- `make/board.mk` has `PDF_MERGE`, set only when `$(origin PDF_MERGE)` is
  `undefined`, from `tools/cli/resolved-default.ts pdf-merge`, then `export`ed
  and passed to the verb as `--pdf-merge`.
- `tools/guide/pdf-merge-install.ts` holds the per-platform candidate list, as
  `tools/guide/browser-install.ts` does for the browser. **The linux and win32
  candidates are UNVERIFIED** - no machine of either kind ran them, and the
  module says so.
- `tests/kicad/install.test.ts` runs the real `make print-PDF_MERGE` with the
  variable genuinely unset and with an explicit override, exactly as it does
  for the other two.

**qpdf, and the choice is argued rather than assumed.** Three tools on this
machine can join two PDFs. `gs` re-distills the content streams, which is a
re-render of an approved drawing and therefore not available at any price. Of
the other two, qpdf is the one that will also **answer for what it did**:
`--show-npages` and `--json=latest` report the merged file's page count and
every page's `/MediaBox`, which is what the merge is verified with. A merge
tool that cannot be interrogated would leave the exit status as the only
evidence.

### Not trusting the exit code

`tools/guide/print-pdf.ts` records that Chrome exits 0 when it prints nothing.
The merge step is worse off, because **a merge that drops a page writes a
valid PDF**. So four things are asked of the artifact, and three of them are
checks the exit status cannot make:

1. the output exists;
2. it begins with `%PDF`;
3. it has as many pages as the two inputs had between them;
4. **every page is the same size as the page it came from** - which is how
   "nothing is scaled" becomes a check rather than an intention.

Each has a test driving a stand-in tool that fails in exactly that way
(`tests/guide/merge-pdf.test.ts`), including one that exits 0 and writes a
valid PDF with the schematic page missing, and one that fits every page to the
guide's paper.

**A MEASURED FACT WORTH CARRYING FORWARD: qpdf exits 3 when it succeeds with
warnings.** Handed a PDF whose pages carry no `/Resources`, it repairs them,
says so, writes a correct file, and exits **3**. The merge treats that as a
refusal rather than waving it through, because a warning means one of the two
inputs is malformed and the inputs are this repository's own printed guide and
an approved sheet's export. The refusal message names the 3 case so the next
reader is not left guessing.

**One real bug was caught by these tests before any board ran.** The
verification's expected page sizes were first built as the two inputs
concatenated - guide pages then schematic pages - but the MERGED order splits
the guide's pages around the insertion point. The real-tool test failed
immediately, naming page 2 on a correct merge. A verification that had been
loosened to make that pass would then have checked nothing.
`expectedPages()` now builds the expectation from `SCHEMATIC_PAGE`, the same
constant the ranges come from.

---

## 3. The paper problem, which is not solved and is now stated on the paper

**Four of the five approved Pultec sheets declare A4 and the fifth declares A3.
The owner prints US Letter. Nothing in this change alters a sheet's paper
setting**, because changing `(paper ...)` moves the frame and the title block,
the file's bytes change, and its sha256 stops matching
`docs/schematic/verdicts.md` - a re-approval that is the reviewer's to give.

So the merge is **size-agnostic and never scales**, and the document says what
it is. Page one of every Pultec packet now carries a bordered notice:

> **Page 2 is not on this document's paper**
>
> Every page of this document is 215.9 x 279.4 mm (US Letter, portrait) except
> page 2, the schematic, which is 420.0 x 297.0 mm (A3, landscape).
>
> Nothing here has scaled it: the page goes in exactly as it was exported, and
> the packet refuses to publish a merge that resized any page. So a printer
> given this document and 215.9 x 279.4 mm (US Letter, portrait) paper will
> either shrink page 2 by a factor nobody here chose, or clip it. …
>
> The page's size comes from the `(paper ...)` setting in
> `drafted/pultec/pultec-mid/pultec-mid.generated-do-not-edit.kicad_sch`, not
> from this packet. Changing it moves the sheet frame and title block, so it is
> a change the drawing's reviewer has to approve - it is not something this
> tool does on its own.

and `make guide` says the same thing in the console, so it is not only on paper.

**`pultec-mid` does not fit US Letter and is awaiting the owner's decision.**
The coordinator's measurement, relayed and not re-measured here: mid's sheet
body content is 367.6 x 133.9 mm against roughly 265 x 185 mm usable inside a
Letter-landscape frame - **over by about 103 mm of width** - while the other
four are 182 to 233 mm wide and would fit with no re-arrangement at all. The
choice between a narrower re-layout, a two-page split and a reduction is his.
**Nothing here papers over it and nothing here scales it to fit.**

**THE NOTICE IS WAITING TO DISAPPEAR.** It fires only when the schematic page
is not on the guide's paper. The day a sheet's paper becomes `USLetter` and is
re-approved, that board's packet prints no notice and nothing else has to
change. `tests/guide/packet.test.ts` has both arms.

**A gap this surfaced and did not fix:** `lib/schgen/ir/types.ts`'s
`Paper` type is `"A4" | "A3" | "A2" | "A1"`. **schgen cannot emit a US Letter
sheet at all.** `lib/` was out of scope here. A generated board taking the
`"generated"` branch of `resolveSchematic` will therefore always trip the paper
notice until that type grows a Letter member.

---

## 4. Measurements

All five boards, after `make guide`. `pdfinfo` for the page sizes, `qpdf
--show-npages` for the counts, `pdftoppm -r 200` and ImageMagick `compare
-metric AE` for the pixels.

### Page counts and the inserted page's size

| board | guide pages before | merged pages | page 1 | **page 2** | page 3 |
| --- | --- | --- | --- | --- | --- |
| `pultec-hi-boost` | 11 | **12** | 612 x 792 (letter) | **841.896 x 595.296 (A4)** | 612 x 792 |
| `pultec-hi-cut` | 11 | **12** | 612 x 792 (letter) | **841.896 x 595.296 (A4)** | 612 x 792 |
| `pultec-low-boost` | 11 | **12** | 612 x 792 (letter) | **841.896 x 595.296 (A4)** | 612 x 792 |
| `pultec-low-cut` | 11 | **12** | 612 x 792 (letter) | **841.896 x 595.296 (A4)** | 612 x 792 |
| `pultec-mid` | 12 | **13** | 612 x 792 (letter) | **1190.52 x 841.896 (A3)** | 612 x 792 |

Every merged document is its guide's page count **plus one**, and page 2's
dimensions are identical to the standalone `kicad-cli` export's: **the page was
not scaled.**

### The schematic page's content, merged against standalone

Rendered at 200 dpi and compared pixel for pixel against a fresh
`kicad-cli sch export pdf --black-and-white` of the same approved sheet:

| board | merged page 2 | standalone | differing pixels |
| --- | --- | --- | --- |
| `pultec-hi-boost` | 2339 x 1654 px | 2339 x 1654 px | **0** |
| `pultec-hi-cut` | 2339 x 1654 px | 2339 x 1654 px | **0** |
| `pultec-low-boost` | 2339 x 1654 px | 2339 x 1654 px | **0** |
| `pultec-low-cut` | 2339 x 1654 px | 2339 x 1654 px | **0** |
| `pultec-mid` | 3307 x 2339 px | 3307 x 2339 px | **0** |

**Controls, so the zeros are readings and not a comparator that cannot move.**
A3 and A4 pages cannot be compared pixel for pixel, so each control is a
same-size pair:

| control | differing pixels |
| --- | --- |
| `pultec-hi-boost` merged p2 vs `pultec-hi-cut` standalone (both A4) | **146,163** |
| `pultec-low-boost` merged p2 vs `pultec-low-cut` standalone (both A4) | **130,837** |
| `pultec-mid` merged p2 vs its own page rotated 180° (both A3) | **294,036** |

### The approved sheets

`sha256` of all five `.kicad_sch` files, **before and after**, against
`docs/schematic/verdicts.md`:

| board | sha256 | matches verdicts.md |
| --- | --- | --- |
| `pultec-hi-boost` | `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a` | yes |
| `pultec-hi-cut` | `7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1` | yes |
| `pultec-low-boost` | `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7` | yes |
| `pultec-low-cut` | `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d` | yes |
| `pultec-mid` | `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8` | yes |

**Not one byte of any sheet changed**, and `docs/schematic/verdicts.md`,
`drafted/`, `circuits/` and `lib/` were not edited.

### `GUIDE_PAPER`'s points are a measurement, not a transcription

The printed notice says this document is `215.9 x 279.4 mm (US Letter)`, from
`tools/guide/paper.ts`'s `GUIDE_PAPER`, while what actually sets the page size
is `@page { size: letter }` handed to a browser. If the two ever disagreed,
every paper notice would be making a false claim about the document in the
reader's hands and nothing else would notice.
`tests/guide/single-document.test.ts` prints a real multi-page guide with the
real browser and measures **every** page with the real merge tool: all
612 x 792 pt. The same test merges a deliberately-not-Letter page in and
measures that the inserted page keeps its size and the guide's pages keep
theirs.

---

## 4a. `make check`, `bun test`, `bun run typecheck`

`bun run typecheck`: **clean**.

`bun test`: **4053 pass, 8 fail** over 4061 tests in 378 files. **All eight are
`tests/schgen/port-fidelity.test.ts`**, each printing its own cause -
*"SCHGEN_SOURCE is not set. It must point at digital-pedal-platform's
`tools/schgen/` directory"* - which is the pre-existing failure the task
described and which nothing here sets or unsets. **No other test fails**, and
`tests/guide`, `tests/cli` and `tests/kicad` together are **593 pass, 0 fail**.

`make check`: **7 ok, 4 FAIL**, which is exactly the set the task described,
and every one prints a cause with nothing to do with a packet's pages:

| board | result | the cause it printed |
| --- | --- | --- |
| `pt2399-core` | FAIL | `component "delay_ic" (kind "ic") has no parts-list rule in tools/bom/needs.ts` - a concurrent agent's area |
| `transistor-preamp-lab` | FAIL | `CUT_STATE UNRESOLVED`, so HC8 and HC10 have no verdict |
| `transistor-preamp-loop` | FAIL | HC8: 15 opens - the copper does not partition the pins as the netlist does |
| `transistor-preamp-staged` | FAIL | HC5: `C8 spans 14 holes against maxSpanHoles 11` |
| all five `pultec-*` | **ok** | |
| `transistor-preamp-buffered`, `-feedback` | ok | |

**ONE FAILURE WAS MINE AND IS FIXED, and recording it is the point of running
the whole suite.** `tests/stripboard/temp-scratch.test.ts` holds every
`mkdtemp` site under `tests/` to removing the directory it named, and it
reported `guide/merge-pdf.test.ts: 1 unnamed site(s)` - twice over, in two
different forms. First the new test file hid its `mkdtemp` behind a `scratch()`
factory, which the guard reads as an unnamed site; `tests/guide/print-pdf.test.ts`
already carries a comment saying exactly why it does not do that, and this file
now writes the call out in each test as that one does. Then **the paragraph
added to explain the fix wrote the call out WITH its opening parenthesis, which
the guard also reads as a site** - so the comment about the guard tripped the
guard. Both reports were correct.

**ON THE METHOD, because the by-name diff was attempted a harder way first and
that way was invalid.** A `git worktree` at `HEAD` with `node_modules` and
`.tools` symlinked in collected **3985** tests against the working tree's
**4061** and failed **86**, because the worktree has none of the generated
artifacts and caches a full tree accumulates. Comparing against that would
have been comparing against a false baseline. What is reported above is the
after-run's failures named individually, each with the cause the run itself
printed, against the pre-existing set the task stated - which they match
exactly.

---

## 5. The standalone `schematic.pdf`: deleted, and why

**Decision: it goes.** The page is in the document now, so keeping the file
would put the same printable page in the packet twice with nothing saying
which to print - which is the state the owner asked to end, and the
instruction was for *a single printable document*, not for one document plus
a spare.

The counter-argument was considered and is recorded because it is a real one:
`guide.html` is kept beside `guide.pdf` on the stated grounds that *"keeping
both costs nothing and leaves the source of the printed pages sitting next to
them."* The difference is that `guide.html` is the SOURCE of the printed
pages and is not itself a second printable document; a surviving
`schematic.pdf` would be the identical printable page, in the identical
format, with no way for a reader to tell which one the packet means.

What went with it, since *supersede means delete*:

- `SCHEMATIC_PDF` no longer names a packet file. The constant survives in
  `tools/guide/packet.ts` as the name of a **staging intermediate** (kept, so
  that a reader of an older `make guide` log or report finds it), and the
  module comment says plainly that it does not survive the run.
- `packetFiles(hasSchematic, hasClusters)` lost its first parameter. The file
  list is now the same whether or not the board has a schematic, so a
  parameter distinguishing them would be a distinction with nothing behind it.
  What tells a reader whether the packet carries a schematic is the document:
  the header row, and the notice on page one when there is none.
- `GuideSchematic`'s `generated` variant lost its `path` field, whose only
  value was the string `"schematic.pdf"` - a file that no longer exists. The
  header row for a generated page now names page 2 and points at
  `generatedNote`.
- One test assertion, `expect(html).toContain("schematic.pdf")` in
  `tests/guide/generated-schematic.test.ts`, would have gone on passing while
  the packet named a file that is not there. It now asserts the page number and
  asserts the filename is **absent**.

---

## 6. The no-schematic path still produces one document

A board with no schematic page needs no merge at all, so the guide is printed
straight to `guide.pdf` and the merge tool is never invoked - requiring one
would refuse a packet that was already complete. Both arms are exercised:

- `tests/guide/packet.test.ts`, *"a board with NO schematic is printed straight
  to guide.pdf, with no merge tool involved"*: the merge list is empty, the
  print's output path is `guide.pdf`, and the file list is the same five files.
- the same file's `"none"` test: the page-one notice, the declaration, the
  circuit model, and the report line are all unchanged.
- `tests/cli/perfboard-guide-verb.test.ts` drives the same case through the
  real verb and a **real** staging-and-swap on a throwaway tree.
- `tests/guide/generated-schematic.test.ts` covers all four `GuideSchematic`
  shapes, including both `withheld` sub-cases.

No Pultec board exercises this path any more - all five declare a sheet - which
is why it is tested on the fixture board and through the verb rather than
observed on a real packet.

---

## 7. What `buildGuideHtml` now refuses

The printed page cannot say what paper the schematic is on unless somebody
measured it, so the measurement is a required input and both ways of getting it
wrong are refusals rather than defaults:

- a packet whose `schematic.kind` is `"printed"` or `"generated"` with **no**
  `schematicPaper` - it would print a document that says nothing about needing
  other paper;
- a `schematicPaper` with **no** schematic page - it would print a
  `Page 2 is not on this document's paper` notice about a page that is not
  there.

Both name `tools/guide/packet.ts` as the defective caller, because that is
what they would be.

And `onePage` in `tools/guide/schematic-export.ts` refuses a **multi-page**
schematic export: the header row and the paper notice both name exactly one
page, the merge would happily insert several, and the document would go on
describing one. Every schematic this repository exports today is one sheet and
therefore one page, measured on all five boards - so a second page means
something changed that the printed structure has not been taught.

---

## 8. What was not done

- **No approved sheet's `(paper ...)` was changed**, and no sheet's bytes
  changed. `docs/schematic/verdicts.md`, `drafted/`, `circuits/` and `lib/`
  were not edited.
- **Nothing scales a page**, anywhere - there is no fit-to-page code path to
  disable, and the merge refuses a tool that resizes one.
- **`pultec-mid`'s page was not made to fit.** It is 103 mm too wide for
  Letter and that is the owner's decision; §3 states it rather than hiding it.
- **No rule about net naming, designators or documentation was invented.** The
  scope was the packet's page structure.
- **The guide's own pagination was not changed.** Its first image was left
  breaking to its own page naturally rather than forced there; the schematic
  lands at page 2 because the merge puts it there, not because of CSS.
- **`schgen`'s `Paper` type was not extended** to include US Letter (`lib/` is
  out of scope); §3 records the consequence.
- **The two `pdf-merge-install.ts` non-darwin candidates were not verified** on
  a machine of either kind.
