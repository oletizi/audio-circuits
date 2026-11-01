Final fix dispatch: the ten named fixes from `final-review.md`
=============================================================

**Dispatch:** one fix agent, 2026-10-31. **Base:** `5149f56`. **Six commits**, in
coherent units: the stale cause; the inert controls; the citation sweep; the
approval claims; the figures and false premises; the documentation pointer and the
recorded gap.

| commit | finding |
| --- | --- |
| `2795de5` | **I1** |
| `7f86a1b` | **I2**, **M3**, **M2** |
| `be59c4e` | **I4** |
| `e896c87` | **I3** |
| `87d16c8` | **M1**, **M4**, **M5** |
| `9607721` | **M6** + the G303 record |

**Nothing was pushed.** **No `drafted/` file, no `docs/schematic/verdicts.md` and
no `schematic/readability-baselines.json` byte was touched**, verified by
`git diff 5149f56..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json`
returning empty after every commit.

---

I1. The stale cause inside a live refusal message
-------------------------------------------------

**Sites:** `circuits/pultec/designators.ts:28` and `:52` (the latter inside the
`throw`), `tests/circuits/pultec-designators.test.ts:16`. All three named *"the IR's
`partShapes` rule"*; the IR is `lib/schgen/ir/`, deleted by this plan.

**What the rule actually is now, worked out from the throw and its one consumer.**
`pultecDesignator` has exactly one caller in the tree: `sheetDesignators` in
`tests/circuits/sheet-model.ts`, which takes the label's leading capitals with
`^([A-Z]+)` as the part's **reference prefix** and numbers parts per prefix from 1.
That same function's own throw already said so — *"`pultecDesignator` … already
refuses a label that is not `^[A-Z][A-Z0-9_]*$`, so reaching this means that check
was weakened"* — so the dependency was live and statable, and there was no need to
invent a reason or to delete the clause.

**What changed.** The `DESIGNATOR` regex now carries a doc comment stating that
dependency, plus the reason `.` and `-` are replaced (KiCad's reference field does
not carry them) and an explicit note that **this is not a letter-case rule about net
names and must not grow into one**, quoting the owner's G150 words. The throw states
the same reason in one clause instead of citing the deleted rule. The test's control
comment states it too, pointing at the production file rather than restating it.

**Deviation: none.** The review offered two options — state the requirement on its
own authority, or delete the clause. The first applied, because the authority exists.

**Checked:** `grep -rn partShapes lib tools circuits tests schematic` now returns no
hit in code (only `docs/` prose and plan records, which are historical).
`bun test tests/circuits/pultec-designators.test.ts` 3 pass / 0 fail.

---

I2. The control that could not fail, guarding the digest binding
----------------------------------------------------------------

**Site:** `tests/circuits/drafted-sheet.ts:262`.

```ts
expect(createHash("sha256").update(fs.readFileSync(sheet)).update("x").digest("hex")).not.toBe(computed)
```

`sha256(bytes ++ "x") != sha256(bytes)` is a property of SHA-256 and holds for every
file in existence. The comment claimed it catches a `recordedSheetDigest` that
returns the computed value — **which would pass both lines**.

**What it was rebuilt into.** `recordedSheetDigest(circuit, board)` is now a thin
wrapper over a new `sheetDigestInRecord(dir)`, which takes a **directory**. That is
the seam the control needs: nothing under `drafted/` may be perturbed (the bytes are
frozen and the standing gate is that a diff over them is empty), so the control
builds a stand-in temp directory holding

- a **byte-identical copy of the real sheet**, and
- the **real record with its `THE BINDING` digest replaced** by `sha256("none")`,

and asserts the answer is the record's digest. The only thing that differs between
the stand-in and the real pair is the record's row, so an implementation that
answered from the sheet cannot pass. A second arm removes the `THE BINDING` row
entirely and asserts the parse refuses — without it, a parse that returned the first
64 hex characters it found anywhere in the record would still pass everything else.

The surrounding guard was not touched.

**DROVE THE SABOTAGE.** `sheetDigestInRecord` was temporarily changed to hash the
only `.kicad_sch` in the directory it is handed — the exact fault the old comment
described. `bun test tests/circuits/pultec-hi-cut.test.ts` then reported **6 pass /
1 fail**:

```
error: expect(received).toBe(expected)
Expected: "140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe"
Received: "e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332"
(fail) pultec-hi-cut: the digest compared above comes out of the record and not out of the sheet
```

**The equality assertion the control guards stayed GREEN under that sabotage**,
which is the evidence that the pair this replaced would have been green too. The
sabotage was reverted and the suite re-run.

**Deviation:** the review suggested *"delete the line, or make it a control that
could fail."* It was made into a control that can fail, which needed a signature
change the review did not anticipate — `recordedSheetDigest` taking a directory
through `sheetDigestInRecord`. The reason is recorded in that function's own doc
comment.

**Side effect, handled:** the per-board test count went from five to seven, so the
header's *"The five tests every board … gets"* figure is **deleted rather than
corrected**, and the two sites that cited a test by ordinal
(`drafted-kicad-round-trip.test.ts`) now name it by what it asserts.

---

M3. The other control that passed regardless of its subject
-----------------------------------------------------------

**Site:** `tests/circuits/pultec-switch-geometry.test.ts:241-246`.
`expect(numbers).not.toContain("not-a-real-pin-number")` never perturbed `POLE_PIN`,
so it said nothing about the containment arm it was labelled a control for.

**What it was rebuilt into.** The perturbation is now derived **from the recorded
pole** (`${pole}0`), which is the stale-table corruption the containment arm exists
to catch. The real claim is asserted first so the perturbation cannot pass on an
empty lookup, the perturbation is asserted to differ from the original so a no-op
sabotage fails, and the table's non-vacuity is asserted in the test itself.

**DROVE THE SABOTAGE.** `installedSymbolPinNumbers` was temporarily changed to also
admit a trailing-digit variant of every pin number — making the containment arm
vacuous. The new control **failed**:

```
error: Switch:SW_Rotary_1x6_MP: a pole recorded as "70"
Expected to not contain: "70"
(fail) CONTROL: the recorded pole pin PERTURBED off the symbol's own numbering is NOT contained
```

and the **old line, run against the same sabotage in a scratch file, PASSED** (1
pass / 0 fail). Sabotage reverted.

**Deviation:** the review allowed deleting it with a reason in the comment. It was
rebuilt instead, because the arm it guards is real and a control with teeth is worth
more than an honest absence here.

**Also noted by the review and not changed:** the `CONTROL: a pin set missing one of
the symbol's real throws` arm has no non-vacuity floor of its own (the floor is
asserted in a different test). Left as the review left it — it was an observation,
not a named fix.

---

M2. The declared-table read, restored
-------------------------------------

**Site:** `tests/circuits/pultec-switch-geometry.test.ts:74` (and the parallel
expression at `:236`). `libId.endsWith("_MP") ? ["MP"] : []` replaced a declared-table
lookup with a name heuristic.

**Where the declared table lives now:** `MECHANICAL_PINS`, exported from
`lib/kicad/sheet-agreement.ts`. The table is **read, not reimplemented** — a local
`declaredMechanicalPins(libId)` wraps it with `Object.hasOwn` for that module's own
stated reason (a lib id colliding with an `Object.prototype` member must not return
a function). `mechanicalPinsOf` in that module takes a `Component` and is not
exported, which is why a two-line reader over the exported table is the right seam.

**DROVE THE DIFFERENCE.** A scratch file modelled a future `THROW_PINS` entry for
`Switch:SW_Rotary_1x5_MP` with **no** `MECHANICAL_PINS` entry — the case the review
named. The name heuristic **passes** (it supplies a lug the table does not declare);
the declared read **fails**. 1 pass / 1 fail, exactly as the review predicted.

**Deviation: none.**

---

I4. The verbatim-move self-reference cluster
--------------------------------------------

Ten present-tense citations of the deleted `tests/circuits/kicad-round-trip.ts`
across nine files were named. **All ten repaired**, each resolved to the module it
actually meant rather than rewritten mechanically.

| site | what it cited it for | repointed to |
| --- | --- | --- |
| `tests/kicad/sheet-agreement-tables.test.ts:20` (**added by this plan**) | refuse-don't-skip | reason stated on its own authority (`CLAUDE.md`'s *"A skipped check must never look like a passing one"*), with `committed-schematic.ts`'s `exportCommittedSheet` and `drafted-sheet.ts`'s `exportDraftedSheet` named **after** it, not instead of it |
| `tests/kicad/symbol-library-disk.ts:18` | refuse-don't-skip | `tests/circuits/committed-schematic.ts` |
| `tests/kicad/footprint-library.ts:7` | refuse-don't-skip, for kicad-cli | `tests/circuits/committed-schematic.ts` |
| `tests/kicad/pin-pattern.test.ts:88` | refuse-don't-skip precedent | `tests/circuits/committed-schematic.ts` |
| `tests/guide/print-pdf.test.ts:10` | refuse-don't-skip for a toolchain binary | `tests/circuits/committed-schematic.ts` |
| `tests/guide/print-pdf.test.ts:26` | **duplicating `KICAD_CLI`'s make default** | `lib/kicad/netlist.ts`'s `KICAD_CLI`, which still duplicates `KICAD_CLI ?=` in `make/board.mk` and is held to it by `tests/kicad/install.test.ts` |
| `tests/guide/print-pdf.test.ts:155` | the deleted `stub-writer-tripwire.test.ts`'s **60s timeout** | `./merge-pdf.test.ts`'s three real-merge-tool tests, the live subprocess-driving tests in that directory |
| `tests/guide/merge-pdf.test.ts:16` | refuse-don't-skip | `tests/circuits/committed-schematic.ts` |
| `tests/guide/single-document.test.ts:22` | refuse-don't-skip | `tests/circuits/committed-schematic.ts` |
| `tests/stripboard/extent-fixtures.ts:17` | **a non-`.test.ts` helper several test files import** | `tests/circuits/drafted-sheet.ts`, which is exactly that |

**The two that needed a different answer are the point of the instruction not to
rewrite the path mechanically.** `print-pdf.test.ts:26` is about a constant, not a
refusal; `:155` cites a second deleted file for a timeout convention, not the
round-trip at all.

**Deviation — scope added, five further sites of the same class:**

- `tests/circuits/pultec-{hi-boost,hi-cut,low-boost,low-cut,mid}.test.ts:8`, five
  identical citations of `./kicad-round-trip.ts`'s `expectSameCircuit`. That
  function lives in `./committed-schematic.ts` now, so the repair is unambiguous.
- `tests/circuits/drafted-sheet.ts:9`, a **present-tense claim about what the
  deleted module compares** — the sharpest surviving instance in a file this
  dispatch was already editing. Leaving it would have been the "seen and left"
  failure I1 exists to record.
- `tests/circuits/drafted-sheet.ts:86`, *"in the same words `kicadRoundTrip` uses"* —
  put into the past tense with the deletion named.

**Left alone, deliberately:** citations that label themselves as deleted in the same
breath — `committed-schematic.ts`'s five ("dies with the writer", "is deleted along
with the stub writer"), `drafted-kicad-round-trip.test.ts:5` ("was this proof"), and
`transistor-preamp-kicad-round-trip.test.ts:7`, whose next sentence is "The stub
writer is deleted, and that test could not survive it." `CLAUDE.md` is explicit that
a dangling reference which announces itself is inert.

---

I3. The approval claims
-----------------------

**The premise, re-verified here:** all five sheets' `(paper …)` and digests were read
off disk; of the eight sha256 digests in `docs/schematic/verdicts.md`, the review
established that exactly one — `e9843e6d…`, `pultec-hi-cut` — equals a sheet's
present bytes. **`docs/schematic/verdicts.md` was not opened for writing and is
unchanged.**

**The fix is not five-to-one.** Not one of the eighteen sites behaves differently
because a page is approved; every one is about the page a board declares as its
`"sch"`, committed under `drafted/`. So the code now **says what it depends on** —
"committed", or "the page this board declares" — and leaves the word *approved* to
the register. A count of approvals in a comment would rot again the moment he
re-approves a page; *"the sheets committed under `drafted/`"* cannot.

**Four were inside refusal messages** a person reads at a failure:
`sheet-model.ts`'s unknown-board throw, its stale-table throw, its
`POSITIONAL_PINS` throw, and `tools/guide/merge-pdf.ts`'s qpdf-exited-nonzero throw.

**Five modules carry a short paragraph saying why the word is absent**, so the next
agent does not put it back: `lib/kicad/sheet-agreement.ts`,
`tests/circuits/sheet-model.ts`, `tests/circuits/drafted-sheet.ts`,
`tests/circuits/drafted-kicad-round-trip.test.ts`, `tools/guide/merge-pdf.ts`. Each
points at `docs/schematic/verdicts.md` as the authority and at
`EVALUATING-DRAWINGS.md` §5 for why a status cannot be restated.

**`tools/guide/merge-pdf.ts` keeps the word in one place and the comment says why.**
Its resize refusals speak of approval correctly — *a drawing shrunk to fit is a
change to the drawing, which is its reviewer's to accept* — and that is a different
claim from a page's status. The module header now draws that distinction explicitly
so a later sweep does not flatten it.

**Deviation — scope added, three further sites** found by re-running the review's own
grep after the edit:

- `tests/guide/clusters-packet.test.ts:27`;
- `tests/circuits/transistor-preamp-kicad-round-trip.test.ts:10`;
- `tests/circuits/committed-schematic.ts:6`, which the review read as *"correct — it
  is distinguishing."* It does distinguish, but **by location, not by status**: a
  `transistor-preamp` sheet is not under `drafted/`, which is the fact that matters,
  and saying it with the word *approved* carries a status claim the file cannot know.

**Checked:** the review's sweep
`grep -rn "five approved\|approved page\|approved sheet\|approved Pultec" lib tools tests circuits schematic`
now returns **nothing**.

---

M1. The composed minors in `tests/circuits/sheet-model.ts`
----------------------------------------------------------

**The board key.** `DECLARED_PIN_NUMBERS` is keyed by board, and
`checkDeclaredPinNumbers` checked only the component half; the board key was read by
a bare bracket index. A typo'd or renamed key therefore made the whole entry
**silently inert** — `pinNumbersOn` fell through to the positional rule, and the only
symptom was `pultec-low-boost`'s `netMembership` guard failing with a message about
two nets rather than about a declaration that had stopped applying. The one
hand-declared exception in the rebuilt guard, the `R2` a/b swap the owner's verdict
asked for, hung off that key.

**It now refuses, naming the offending key and the boards that exist, with no
fallback.** Both lookups go through `Object.hasOwn`, matching
`lib/kicad/sheet-agreement.ts`'s stated reason. The doc comment records the failure
mode that earned the check and names the live way to reach it (renaming a board
directory — the keys here are strings and nothing moves them).

**DROVE IT.** The key was temporarily renamed to `pultec-lo-boost`.
`bun test tests/circuits/pultec-low-boost.test.ts` → 4 pass / 3 fail, every failure
carrying:

```
DECLARED_PIN_NUMBERS in tests/circuits/sheet-model.ts is keyed by board, and
[pultec-lo-boost] name no board in BOARDS, whose boards are [pultec-hi-boost,
pultec-hi-cut, pultec-low-boost, pultec-low-cut, pultec-mid]. …
```

Reverted.

**The header figure.** It said the committed exports carry `SI1`..`SI6`. The maxima
are `SI8`, `SI6`, `SI8`, `SI9`, `SI9` — true of `pultec-hi-cut` alone. **Deleted
rather than corrected**, per `CLAUDE.md`, with the per-file command that answers it
(`grep -o 'SI[0-9]*' tests/fixtures/pultec-<board>.net | sort -u -V | tail -1`) left
in its place.

**Deviation: none.** The third deferred minor the review composed — the bare bracket
index — is closed by the same change.

---

M4. The false paper premise
---------------------------

**Sites:** `tools/guide/schematic-notice.ts:132-133`, `tests/guide/packet.test.ts:128`.
Both said *"Four of the five Pultec sheets declare A4 and the fifth A3, so every
packet today carries one page that is not US Letter."*

**Measured here:** all five sheets declare `USLetter`. Both halves false, the
conclusion inverted. Pre-existing (`3ae58e9`, before `fdbc51a`) and never written
down.

**What the code does with that premise, checked before the comment was edited.**
`schematicPaperNotice` compares the **actual** page sizes (`samePaper(schematicPaper,
GUIDE_PAPER)`) and returns `[]` when they match. So it is **already silent on every
packet today, by measuring rather than by assuming** — the premise was never load
bearing.

**The behaviour is NOT removed**, and the comment now says so and why: a page's size
is its own `(paper …)` setting, a future sheet can be drawn on anything, and a notice
deleted because today's five agree would have to be rewritten from the owner's words
the first time one does not. The owner's *"I don't have an A3-capable printer"* quote
is kept untouched. The figure is **not corrected** — a count of sheets by paper size
is a transcription with a date on it — and the command that answers it stands
instead. `packet.test.ts` now says plainly that the A4 dimensions there are the
test's own synthesised fixture, which is the only way to exercise the arm.

**Raised, per the brief:** the premise's falsity is the finding; the behaviour is
sound and defensible on its own terms, so nothing was deleted. **It is a dormant
guard, not an unnecessary one.**

---

M5. The figure with its own disproof printed beside it
------------------------------------------------------

**Site:** `lib/kicad/value-notation.ts:161`. It read *"49 of them across 29 files"*
and handed the reader the grep to check it with.

**Re-ran that grep at `HEAD`:**
`grep -rn "refPrefix:" lib tools tests circuits | grep -v "readonly refPrefix"`
returns **1 hit, and it is this comment** — 1 line in 1 file.

**Why, which is worse than the figure being stale:** `refPrefix` was a field of
`IrPart`, which went with `lib/schgen/ir/`. The command measured a vocabulary this
repository no longer has while the number beside it described a tree that no longer
exists. `PartSpec` survives; `IrPart` does not.

**What changed.** The figure is deleted. The surviving half of the cost is stated
against `PartSpec` alone, with `grep -rn "part: {" lib tools tests circuits` left as
the command that measures it — **no answer written next to it**, per `CLAUDE.md`. The
deletion and its reason are recorded in place, because the command's own failure to
reproduce its number is the most useful evidence the rule has.

**Deviation: none.** The review preferred deleting the figure and keeping the
command; the command was replaced as well, because the one printed no longer measures
anything.

---

M6. The baselines correction, discoverable from more than one place
-------------------------------------------------------------------

`schematic/README.md` is the sole home of the `readability-baselines.json` open owner
question and was cited from exactly one place in the tree. A block at the head of
`docs/schematic/README.md` now points at it, says what is there, and says the
question is the owner's.

**`schematic/readability-baselines.json` is NOT touched.** Leaving its stale `notes`
block alone is the right call for the three independent reasons the review
established: the file is a registry of the owner's recorded judgements about a
drawing, and an agent may never author the acceptance criteria for an artifact it
produces; the standing gate is that a diff over the file is empty, and editing a
file to make its prose true defeats a gate rather than satisfying it; and the
correction already exists beside the file. **Only its discoverability was wrong.**

---

Recorded, not implemented: G303's watermark directive
-----------------------------------------------------

`docs/known-gaps.md` **G303**'s unratified-drawing watermark — the owner's *"critical
safety signal to NOT USE the drawing at the bench"* — now has **no implementation
anywhere**. Its only producer was the generator, held by
`tests/schgen/watermark.test.ts`; both went in this plan. **This is not a loss the
plan caused** — the pages under `drafted/` never carried the mark, because they are
not the generator's output. What makes it live is that **four of the five pages the
build guides print are awaiting re-approval**, so a rule about marking an unratified
drawing speaks to exactly those pages while nothing honours it.

It is recorded in `docs/research/2026-10-30-schgen-removed.md` §6, under what nothing
in this repository holds any more, in one paragraph, with **what would settle it
named as his decision rather than an agent's design**: whether the signal is wanted
on a page drawn by the `TOOLING.md` loop, and if so where in that loop it is applied.
A mark on a drawing is a statement about the drawing's status, and
`EVALUATING-DRAWINGS.md` §5 reserves status to the reviewer.

---

Deferred, and not done
----------------------

- **M7** — `SheetAgreement`'s six mutable `string[]` fields. Not touched. A
  hardening, not a defect; ruled a deferred minor.
- **The review's item (iii)** — whether `make check`'s four failure causes are
  *identical* to the pre-plan baseline rather than merely the same four boards. Not
  attempted: it needs a checkout of `fdbc51a` and a re-run, which is not a fix.

---

Gates
-----

| gate | result |
| --- | --- |
| `bun run typecheck` | **exit 0, no diagnostics** |
| `bun test`, run alone | **2724 pass / 0 fail, 38546 `expect()` calls, 258 files, 126.66 s**, exit 0 |
| `git diff 5149f56..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json` | **empty** |
| control-character scan, all 29 touched files | **0 hits, 0 missing, canary fired** |

**The control-character scan is a Python script** (forbidden set `{0–8, 11, 12,
14–31}` built with `range()`, never typed as an escape) and it **writes its own
canary first** — a temp file containing `bytes([0])` — and refuses to report a clean
run if the canary does not fire. It printed `canary fired: [(1, 2, 0)]` on every
invocation. macOS `grep` has no `-P`; the review's first attempt reported "0 hits
over 0 files" for exactly that reason, which is why this scan carries the canary
inside the same process.

**One control-character-adjacent incident, worth recording.** The first draft of the
M4 comment put `drafted/pultec/*/*.kicad_sch` inside a JSDoc block. The `*/` **closed
the comment**, producing `TS1005`, `TS1110` and `TS1128` at lines nothing had edited.
Caught by `bun run typecheck`, and the path is written out in prose instead. It is
the same class as the escape rule — a character that means something to the file
format, typed into a comment, with the error surfacing somewhere else.

**Per-finding verification runs, all green at the time of each commit:**
`tests/circuits/pultec-designators.test.ts` 3/0; the seven files around the controls
53/0 (up from 43 — ten new tests, two per drafted board); `tests/kicad` +
`tests/guide` + `tests/circuits` + the stripboard helper 664/0 across 68 files;
`tests/circuits` + `tests/guide` 395/0 across 49 files; `tests/circuits` 192/0;
`tests/circuits` + `tests/guide` + `tests/kicad/value-notation.test.ts` 424/0 across
50 files.

**Suite delta, and why.** The reported baseline is **2714 pass / 0 fail across 258
files**. The solo run here is **2724 pass / 0 fail across 258 files**: **+10 tests,
none removed, no file added or deleted.** `registerDraftedPageTests` gained two per
board — "the digest compared above comes out of the record and not out of the sheet"
and "a record with no BINDING row refuses rather than answering" — across five
drafted boards, and what they replaced was **one inert assertion inside an existing
test**, not a test. `expect()` calls went 38526 → 38546, which is +4 per board: two
new assertions in each new test, net of the inert line removed.

Run **alone**, nothing concurrent, 126.66 s. No segfault. `grep -c "(fail)"` over the
log: **0**.
