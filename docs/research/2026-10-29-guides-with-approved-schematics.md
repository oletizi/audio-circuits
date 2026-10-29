The build guides print the approved pages
========================================

**What was asked, in the owner's words:** *"Do we have approved drawings for all
of the modular pultec circuits? If so, let's fix the build guides to include
them."*

Four of the five Pultec section boards now print their approved schematic page in
their build packet. `pultec-mid` prints nothing and says so, because it has no
drawing yet. **The mechanism was already in the repository**; what changed is
that four boards stopped being undeclared.

Reproduce everything below with:

```
make -C boards/pultec-hi-cut check        the guard the declaration turns on
make -C boards/pultec-hi-cut guide        the packet, schematic page and all
```

---

## 1. The four hashes, before and after the move

**Every page was verified against `docs/schematic/verdicts.md` before the copy
and again after it.** Not one byte changed. A copy that changed bytes would not
be the approved page, and the hash is what the verdict binds to.

| board | approved page, where it was | sha256 before | sha256 after |
| --- | --- | --- | --- |
| `pultec-low-boost` | `docs/research/2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch` | `42cdca00…5c7d6dd7` | **identical** |
| `pultec-low-cut` | `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch` | `65914fd9…18310f9de8d` | **identical** |
| `pultec-hi-boost` | `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch` | `240c61df…5c58f0135a` | **identical** |
| `pultec-hi-cut` | `docs/research/2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch` | `7ccf557c…83900a76f1` | **identical** |

Full digests:

```
42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7  pultec-low-boost
65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d  pultec-low-cut
240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a  pultec-hi-boost
7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1  pultec-hi-cut
```

**The research directories were not deleted.** They are the execution record;
the copies under `drafted/` are what a build guide points at.

**The hash is now checked on every run rather than being a figure in this file.**
Each board's `tests/circuits/<board>.test.ts` re-computes it and compares it with
the digest `drafted/pultec/<board>/RECORD.md` records, so an edit to an approved
page fails instead of passing quietly. The digest is parsed out of the record
rather than written into the test: a hash copied into a test file is a second
place for one fact to be wrong.

---

## 2. Where the pages live, and the one place the spec could not be met

`drafted/pultec/<board>/`, per §3 of
`../superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`:
top level, never under `circuits/`, with a README at the root saying these are
agent-drafted and never hand-edited. Each board directory holds the sheet, the
`.kicad_pro` it renders in, the SVG render, an empty `sym-lib-table` and a
`RECORD.md`.

### The title-block notice: carried by the FILE NAME, and why

§3 also requires *"generated - do not edit"* in every title block. **None of the
four approved sheets carries it, and it cannot be added**: each page's
`title_block` holds only `title`, `date` and `rev`, and writing a `comment` field
into the file would change the bytes and break the binding to the verdict. The
spec was written before any page was approved and does not say what to do when
the two requirements collide.

**What was done instead, measured rather than assumed.** KiCad's title block
prints the sheet's **file name** on its `File:` line, so each page is committed as
`<board>.generated-do-not-edit.kicad_sch`. Rendered and read at 300 dpi, the
title block prints:

```
Sheet: /
File: pultec-hi-cut.generated-do-not-edit.kicad_sch
Title: pultec-hi-cut
Size: A4    Date: 2026-10-29                      Rev: A
KiCad E.D.A. 10.0.5                               Id: 1/1
```

The notice is inside the box and nothing is cut off at either end. It costs zero
bytes, and KiCad's own window title says the same thing to anyone who opens one.
**A page drafted from here on should carry the notice in its `title_block` as
well, emitted by whatever draws it**; for these four the bytes are frozen and
only the name is available.

### The project context, which changes the render

Both the hi-cut and hi-boost runs found that the `.kicad_pro` beside a sheet
changes what plots: a generated project with `intersheets_ref_show: true` draws
`[1]` beside every global label, which earns nothing on a one-sheet page. The
`build/schgen-boards/` projects those runs borrowed are **git-ignored**, so each
drafted directory carries its own `.kicad_pro` with that flag off, and its own
empty `sym-lib-table`. Without them a sheet here would render differently from
the sheet he approved.

### The SVG render diffs, and its digest is evidence only

`kicad-cli sch export svg` stamps one `<title>SVG Image created as … date …</title>`
line, so the raw file digest moves on every export whether or not the drawing
did. `RECORD.md` records `sha256(svg minus that one line)`, which **reproduced
exactly on a re-export** on this machine with KiCad 10.0.5. Cross-machine and
cross-version stability is **unmeasured**, which is why `verdicts.md` calls that
digest evidence and not a binding, and why `RECORD.md` repeats it.

---

## 3. The netlists, and what the declaration turns on

`sch` and `netlist` must be declared together, so each board declares both. The
exports went to `tests/fixtures/pultec-<board>.net`, where all six
already-declared boards keep theirs, and were produced **through
`tools/perfboard/netlist-sync.ts`** rather than by hand: a raw `kicad-cli sch
export netlist` stamps the design section with a machine-specific absolute path,
which is exactly what that module exists to normalise.

**Declaring the pair turns on `make/board.mk`'s `netlist-agrees`**, which
re-exports the netlist from the sheet on **every run** and reconciles it by
content, never by timestamp - and which **fails naming the file** when
`tests/circuits/<board>.test.ts` does not exist. So there are four of those, over
a shared body in `tests/circuits/drafted-sheet.ts`.

### Why the comparator is not `expectSameCircuit`

`tests/circuits/kicad-round-trip.ts`'s `expectSameCircuit` compares a KiCad
export against `toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS,
OFF_BOARD_IDS, PAD_ORDER)` - the **VeroRoute lowering**, in which an off-board
part's footprint is the string `PADS<n>` and its pins are numbered by `PAD_ORDER`
index. A Pultec section board has four to seven off-board parts, so that
comparison reports a disagreement on every one of them about a vocabulary
neither side is wrong in. Run against the hi-cut model it does not even get that
far: it throws on `RV_HI_CUT` having no `part.footprint`.

What compares a drawing with a model is `lib/schgen/gates/round-trip.ts`, and its
five separately-reported comparisons are what these tests read.

### What it reports on all four pages

| comparison | result |
| --- | --- |
| `componentIdentity` | **0 problems** on all four |
| `netMembership` | **0 problems** on all four |
| `pinIdentity` | 1 on each: `SW1 pin numbers: model [1…7] vs schematic [1…7, MP]` |
| `values` | 1 on three boards; **8 on low-boost** |
| `footprints` | 17 to 20 per board, **every one reading `footprint "<none>"`** |
| `footprintsUndeclared` | 2, 2, 7, 2 - parts the model declares no footprint for either |

**The three residual classes are all properties of how these sheets were drawn,
not of any circuit:**

1. **`SW1`'s mechanical mount lug.** The page is drawn with the stock
   `SW_Rotary_1x6_MP` symbol, which carries a mount pad the model does not - *"a
   mounting pin `MP`, which is a mechanical pad and is on no net in the model"*
   (`circuits/pultec/schematic/section-board.ts:162`), the same fact `G282`
   records. It appears in the export as `unconnected-(SW1-PadMP)`, a one-member
   net.
2. **`SW1`'s `Value` field** holds the symbol name where the model holds
   `6-way selector`.
3. **No part on any of the four pages carries a `Footprint` field at all.**
   copperhead and akcli write none. The tests assert that every footprint
   problem reads `"<none>"`, so a problem naming a real footprint - the page and
   the model disagreeing about which part is fitted - would fail.

**And one that is NOT in that list, recorded because it is a real divergence
nobody has ruled on.** The low-boost page writes six capacitor values and
`SI3`'s with a **leading zero** - `0.33uF` where the model writes `.33uF`. Same
capacitance, different string, and the comparison is over strings because a
correct topology with a wrong capacitor is a correct netlist. It came from that
page's field-restating pass. **Which spelling the model should carry is not a
decision this guard can make**, so both sides were left alone and the seven
entries are asserted by name in `tests/circuits/pultec-low-boost.test.ts`.

### Every reading has a positive control

- **The sheet digest** - the same bytes plus one more hash to a different value.
- **`netMembership: []`** - moving one pin between the export's two largest nets
  makes it non-empty, in each of the four tests. An empty problem list is the
  same shape whether the comparison agreed or never looked.
- **The footprint loop** - asserted non-empty, so `for (… of [])` cannot pass
  having examined nothing.
- **The parenthesis-depth and control-byte scan** - on all four sheets: final
  depth 0, lowest reached 0, zero C0 bytes outside tab/CR/LF, against a count of
  2332 to 2798 LF bytes in the same pass. The control: **the same scan over a
  copy with the final closing paren removed reads depth 1**, so the check moves.
  On that break `kicad-cli sch export netlist` exited **3** and wrote no export -
  it did not exit 0 on this particular break, though the brief's warning stands
  for other modes, which is why the components-and-nets check below exists
  anyway.
- **The net sets** - each export has 15 to 21 nets and 19 to 27 components, not
  the empty `<components/>`/`<nets/>` a broken sheet can produce. The hi-cut
  export's 15 nets match, membership for membership, the net sets
  `docs/research/2026-10-29-hi-cut-full-run/verify-after.txt` measured on the
  page when it was shown to him.

**One false reading was produced and discarded during this work, recorded because
it is the shape of the failure this repository keeps hitting.** A hand-written
regex for net-pin sets merged all 15 hi-cut nets into one 51-member net and the
script around it printed `netlist nets 1` as a clean reading. It was caught by
comparing the count against the research run's. The measurement was redone with
the repository's own `importNetlist` - **a second parser written for one run is a
second thing that can be wrong, and this one was.**

---

## 4. What each guide's schematic page actually shows

`make guide` writes `schematic.pdf` into the packet for all four boards. **It is
a separate file, not a page inside `guide.pdf`** - see §6.

Measured on each one:

| | all four |
| --- | --- |
| pages | **1** |
| page size | **841.896 x 595.296 pt, A4 landscape**, upright, not rotated |
| differing pixels vs a direct `kicad-cli sch export pdf` of the drafted sheet, at 200 dpi | **0** |
| control: the same comparator over two different boards' pages | **141,417 differing pixels** |

So each packet's schematic page is pixel-identical to the approved sheet, and
the comparator that says so is one that moves.

**Looked at, not only measured** - each page rendered at 200 dpi and read:

- **`pultec-hi-cut`** - the Hi cut group across the lower half, the selector at
  its left with `sel1`…`sel6` running right to ten capacitors, the `lo_boost_in`
  rail along the group's top; five stand-in groups and the Junction group in a
  row above it. Every group rectangle, every value and every label is inside the
  sheet frame. The lower-left quarter of the page is empty.
- **`pultec-low-boost`** - Interface, Hi boost and Lo boost across the top, Cap
  bank below with six capacitors and the selector. The capacitor values print
  with the leading zero noted in §3.
- **`pultec-low-cut`** - five groups in a row across the top, Lo cut below with
  the selector and seven capacitors.
- **`pultec-hi-boost`** - Junction, Mid, Hi cut, Lo boost and Lo cut across the
  top; the Hi boost group below with the four tapped coil sections on the
  `coil_top` rail and nine capacitors beneath them. The Lo boost stand-in group
  reads `lo_boost_in` into `SI6` to `out` with `SI7` shunting to a ground below
  it, which is the group he approved after the hairpin repair.

**Nothing is clipped, nothing is rotated, nothing is scaled down, and the
schematic did not displace a layout image** - the four layout SVGs are still
inline in `guide.html` and still start on page 2 of `guide.pdf`, checked by
rendering it.

**This writer is not a qualified reviewer of a drawing and nothing above is a
judgement of one.** `EVALUATING-DRAWINGS.md` binds; these are observations and
measurements about what is on the page and where.

### `pultec-mid`

Declares nothing, deliberately, and its packet carries the `Schematic withheld`
notice with the reason printed in full: *"defective: the drawing is UNRATIFIED
(defective): 1 finding(s) over 1 sheet(s)."* The header row reads
`withheld - see "Schematic withheld" below`. That is the existing notice
explaining itself, which is what it is for; no page was faked.

---

## 5. `make check`

**It was already failing before any of this, on four boards, and it fails in
exactly the same way after.** Both runs are the full root `make check`.

| board | baseline | after |
| --- | --- | --- |
| `pt2399-core` | **FAIL** - no `bomConditions` export in `circuits/pt2399-core/pt2399-core.ts` | **FAIL**, same |
| `pultec-hi-boost` | ok | ok |
| `pultec-hi-cut` | ok | ok |
| `pultec-low-boost` | ok | ok |
| `pultec-low-cut` | ok | ok |
| `pultec-mid` | ok | ok |
| `transistor-preamp-buffered` | ok | ok |
| `transistor-preamp-feedback` | ok | ok |
| `transistor-preamp-lab` | **FAIL** - layout incomplete, HC8/HC10 no verdict | **FAIL**, same |
| `transistor-preamp-loop` | **FAIL** | **FAIL**, same |
| `transistor-preamp-staged` | **FAIL** | **FAIL**, same |

`diff` over the two runs' `ok`/`FAIL` lines: **identical**. None of the four
pre-existing failures is a Pultec board and none of them is touched by this work.

The four declared boards' rows changed in one way that is the point of the
exercise: each now runs `netlist-sync` plus its five tests
(`5 pass, 0 fail`) where it previously printed the `declares no "sch"/"netlist"
pair` notice. `pultec-mid` still prints that notice.

**One interruption worth recording.** Between the two runs the root `make check`
halted at `typecheck` on `tools/schgen/junction-probe.ts`, a file a concurrent
agent had created and not yet made typecheck - `error TS2339: Property
'mismatch' does not exist on type 'RealiseResult'` and `error TS2554`. Nothing
here touched that file; it was fixed in `d07af7b` and the after-run above is from
a tree where `bun run typecheck` is clean. While it was broken the board walk was
reached instead by running `make -C boards/<board> check` for all eleven, which
is the same recipe the aggregate walk runs, and it produced the same eleven rows.

---

## 6. Where the existing tooling and the practice spec were insufficient

Each of these is reported rather than fixed. None of them blocked the work.

1. **The guide's `Schematic` header row names the `.kicad_sch`, and somebody at a
   bench cannot open one.** `schematicRow` in `tools/guide/schematic-notice.ts`
   prints `schematic.path`, which for `kind: "printed"` is the declared source
   file and for `kind: "generated"` is `schematic.pdf`. So the four declared
   boards' guides print
   `drafted/pultec/pultec-hi-cut/pultec-hi-cut.generated-do-not-edit.kicad_sch`
   while the printable page is `schematic.pdf` in the same directory, unnamed.
   A generated board would name the PDF. **The two branches point a reader at
   two different kinds of thing for the same reason**, and the printed-branch one
   is the kind a builder cannot read.
2. **The schematic is a separate PDF, not a page of `guide.pdf`.** `guide.pdf` is
   11 pages of US letter; `schematic.pdf` is one page of A4 landscape beside it.
   That is a defensible split - a schematic wants landscape and the guide wants
   portrait - but **nothing in the packet says the stack is two documents**, and
   the module comment's list of packet files is the only place the second one is
   named.
3. **§3 requires a title-block notice the approved pages cannot carry.** See §2.
   The spec does not anticipate a page approved before the practice existed, and
   the hash binding and the in-file notice cannot both be satisfied.
4. **§3 asks for an SVG render as a thing git can diff, and KiCad stamps a
   timestamp into every one.** Every regeneration therefore shows a one-line diff
   that is not a change to the drawing. The digest in `RECORD.md` is of the file
   minus that line; **nothing in the repository computes it**, so that comparison
   is a script in a research directory rather than a check that re-runs.
5. **`make/board.mk` requires `tests/circuits/<board>.test.ts` and says what it
   is for, but the only helper it points at is the wrong comparator for a Pultec
   board.** See §3. A board with off-board parts needs
   `lib/schgen/gates/round-trip.ts`, and nothing said so until
   `tests/circuits/drafted-sheet.ts`.
6. **`drafted/` has no tool that answers "which pages are staged and do they
   still hash to their records".** The four tests answer it one board at a time,
   through `make check`. §3's recutils register with its staleness check is still
   not built, and this is the second interim markdown substrate standing in for
   it after `docs/schematic/verdicts.md`.
7. **`resolveSchematic`'s withholding gate is untouched and still correct for
   undeclared boards** - `pultec-mid` proves it on every run. Worth saying because
   the easy wrong move here would have been to loosen it.

---

## 7. What was not done

- **`docs/schematic/verdicts.md` was not edited.** No entry was added or altered.
- **No rule, check, comment or doc clause says that warm words amount to
  approval.** The owner's parenthesis - *"do not generalize this into a dumb
  rule"* - binds, and `EVALUATING-DRAWINGS.md` §5 still reads that approval is
  state the reviewer writes, never derived. `drafted/README.md` and each
  `RECORD.md` quote his ruling and say so explicitly.
- **No page was edited.** Not one byte of any of the four sheets changed.
- **`pultec-mid` was left declaring nothing.** No placeholder sheet, no stub.
- **`circuits/pultec/electrical/` was not touched.**
- **`circuits/pultec/schematic/low-boost.ts` was left modified and unstaged**, as
  were `tests/schgen/elk/junctions.test.ts` and the concurrent agent's other
  files.
- **The leading-zero value divergence on the low-boost page was not resolved**,
  on either side. It is recorded and asserted, not fixed.
- **The four pre-existing `make check` failures were not fixed.** They are
  unrelated to this work and fixing them would have hidden the comparison.
- **The header-row and two-document findings in §6 were not acted on.** They are
  decisions about what the printed document should say, and the brief asked for
  them to be reported.
