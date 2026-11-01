## Task 4 report: the census classifies, and every board gets an artifact

**Status: complete. Commit `23b2cf2`, pushed to `feature/schematics-tooling`.** All six steps of `task-4-brief.md` done, including Step 5 — the three
transistor-preamp drawings were rendered, read, and are described below in my own words.

---

### What the run reports

```
10 of 11 boards produce a drawing: 10 usable, 0 defective
1 produce none: 1 not-drawable, 0 generator-defect
0 have no authoring declaration (G247)
WARNING: 39 fallback field placement(s) across 9 board(s).
```

| board | class | drawing | findings |
| --- | --- | --- | --- |
| `pt2399-core` | `usable` | 1 sheet | 0 (15 fallback placements) |
| `pultec-hi-boost` | `usable` | 1 sheet | 0 (8 fallbacks) |
| `pultec-hi-cut` | `usable` | 1 sheet | 0 (2 fallbacks) |
| `pultec-low-boost` | `usable` | 1 sheet | 0 (5 fallbacks) |
| `pultec-low-cut` | `usable` | 1 sheet | 0 (1 fallback) |
| **`pultec-mid`** | **`not-drawable`** | **none — refusal sheet** | 1 `circuit-invalid` |
| `transistor-preamp-buffered` | `usable` | 1 sheet | **2 `text-clearance`** (1 fallback) |
| `transistor-preamp-feedback` | `usable` | 1 sheet | 0 (0 fallbacks) |
| `transistor-preamp-lab` | `usable` | 1 sheet | 0 (3 fallbacks) |
| `transistor-preamp-loop` | `usable` | 1 sheet | **2 `text-clearance`** (2 fallbacks) |
| `transistor-preamp-staged` | `usable` | 1 sheet | **6 `text-clearance`** (2 fallbacks) |

**The committed expectations all hold.** `pultec-mid` is `not-drawable`; **no board is
`generator-defect`**; every other board produces a drawing. The usable/defective split was not
predicted and is recorded here rather than pinned in a test: **10 usable, 0 defective.** No
residual plain-`Error` throw (`emit.ts`, `generated-files.ts`, `fittingPaper`, `shelfPacking`)
fired on any board during this work.

### The census line, and why it changed

It read `7 of 11 boards produce a schematic`. **That sentence is gone**, because *produces a
schematic* now answers the wrong question on its own: a board can produce a drawing the gates will
not ratify, and the question a reader has is whether he may BUILD from it. The headline is now the
drawing count **with its split**, and a second line for the boards with no drawing with its own
split. A drawing count without its second column must not be quoted — the same rule `CLAUDE.md`
states for `7 of 11`.

**`CLAUDE.md`'s own `7 of 11` paragraph is now stale** (it is `10 of 11` under the new vocabulary,
with nothing defective). I have NOT edited it: that is a governance file and amending it is not
this task's to do. It is the first thing the next agent should correct, and the paragraph itself
says `bun tools/schgen/board-sheets.ts` is the only thing that answers the question.

---

## STEP 5: THE THREE DRAWINGS NOBODY HAD SEEN

Rendered with `kicad-cli sch export pdf` and `pdftoppm -png -r 150`, then read with the Read tool.
All three are A3, two pages (page 1 is the root sheet symbol, page 2 is the drawing).

**The headline, and it is not what I expected.** All three are *far* more readable than the
refusals implied — real, followable schematics with titled functional frames, every value printed,
signal flow traceable. **And on all three, the thing the gate refused over is NOT the worst thing
on the page.** The `text-clearance` findings are near-touches of legible text. The genuinely
unreadable text on these pages is a *fallback field placement*, which `findings.ts` classes
`usable` and which refuses nothing at all.

### `transistor-preamp-buffered`

Six titled dashed frames laid across the top half of an A3 sheet: *Collector-feedback bias leg*,
*Collector load leg*, *Base-to-ground bias leg*, *Emitter follower output stage*, *Emitter AC
bypass leg*, and the big *Collector-feedback gain stage, coupling, decoupling and headers*. It
reads as a circuit. Q1 sits in the main block with its collector-feedback bias arriving as a
`COLLECTOR` global label, C1/C2/C3 coupling caps fanned out to the right, C4 decoupling to the
`VCC` power symbol below, and J1/J2 headers on the left. The emitter-follower block with Q2, R5/R6
biasing, R7 and C5 is clean and completely legible.

**The reported collisions are cosmetic.** The vertical `VCC` power-symbol value runs up toward Q1's
pin `2` number and the two glyphs sit adjacent — bounding boxes touch, both are perfectly readable,
nothing is obscured. This is the owner's "ugly but usable" exactly.

**The real defect is R4's value and the gate said nothing about it.** `R4` sits beside the J1
header and its value — `1.5K` — has a vertical green GND wire and a junction dot landing on the
decimal point. It renders as `1●5K`. **You cannot tell from this page whether R4 is 1.5K, 15K or
something else.** That is a *fallback field placement*, classed `usable`. The gate that hid this
whole board for five days was complaining about a VCC label brushing a pin number, while the one
value on the page you actually cannot read passed.

### `transistor-preamp-loop`

Same shape, one block richer: an added *Global feedback loop leg* with R9/RV5 and a `LOOP_CAP`
label, plus C6 and R1 in the main gain-stage block. Seven frames. Signal flow is followable: J2/J1
in, through R5 to Q1's base, collector out through C2/C3 to `BUFFER_BASE`, emitter follower with Q2
in its own frame, loop feedback returning as a global label.

**This is the most damaged of the three, and again not where the gate pointed.** Two separate text
items are struck through by wires in the main block:

- `R5`'s value `4.6K` has a green wire and a junction dot through it — it reads `1●6K`, two
  digits ambiguous.
- `C4`'s reference and value `100uF` have a vertical wire running straight down through both
  lines of text.

The two reported `text-clearance` findings are, again, the `VCC` value brushing Q1's pin `2`
number. Legible. The two wire-struck labels are not, and they are *fallbacks*.

### `transistor-preamp-staged`

The busiest page: eight frames, three transistors (Q1, Q2, Q3), twelve resistors, nine capacitors,
seven trimmers, two complete gain stages plus an emitter follower, with `DRIVE_TOP`,
`CHARACTER_CAP`, `BUFFER_BASE`, `BASE`, `COLLECTOR` and `BYPASS_CAP` as cross-block labels. It is
dense but it is a schematic — I could follow the second gain stage from C5/R5/RV5 through Q2 to
R7/R8 and out.

**Its six findings are real crowding and are visible.** In the *Second gain stage with DRIVE and
TRANSFORMER DRIVE* block, the vertical `VCC` text runs up into the left point of the `BUFFER_BASE`
global-label hexagon while `C5`'s `22uF` sits immediately left of it — three pieces of text in one
small spot. And `R5`'s value `100K` has the DRIVE_WIPER wire through its `K`. All of it is still
readable; none of it is wrong about the circuit. `usable` is the right class.

The frames do not overlap (I checked the two that look adjacent at the top left — there is a gap).

### What to take to the owner

The gates that hid these three boards were **not insane, but they were pointed at the wrong
thing.** Every one of the ten `text-clearance` findings across the three boards is the same
near-touch of two legible pieces of text. Meanwhile `fallback field placement` — which refuses
nothing — is where the unreadable values live: `R4 1.5K` on buffered, `R5 4.6K` and `C4 100uF` on
loop. **39 fallbacks across 9 boards.** That is the inversion worth his attention, and it is only
visible because the drawings exist now.

### The refusal sheet

`pultec-mid` gets `REFUSAL.kicad_sch`, which `kicad-cli` exports to a single A4 page. Rendered and
read: title block reads *"pultec-mid: not-drawable"* with the comment *"UNRATIFIED (not-drawable) —
this page is a refusal, not a schematic"*, and the body names the board, the class, what the class
means, and the demand verbatim — *part SW_MID: pin 12 (12) is neither on a net nor declared not
connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts*. It carries no symbol,
no wire and no net, so it cannot be mistaken for a drawing. Per the spec's narrowing, the
interrogable artifact for this board is the demand, and **G282** records that exact class of demand
as one to question rather than satisfy.

---

## What was built

### 1. `generateReported`, beside the strict `generate` (`tools/schgen/generate.ts`)

The site at the old `generate.ts:436` dropped a COMPLETE `Generation` — every sheet, every emitted
file — and threw. It is now split, on the `realiseBlockReported`/`realiseBlock` pattern this
repository already uses:

- **`generateReported`** returns the generation with its `findings`. It still throws when there is
  no complete generation (invalid circuit, undrawn sheet) — that is a different thing from an
  unratified one.
- **`generate`** is `generateReported` plus the findings gate, and it keeps its callers:
  `tools/cli/schgen.ts` and `tools/schgen/verify.ts` write into CIRCUIT directories, where an
  unmarked unratified sheet would be indistinguishable from a ratified one until Task 5 adds the
  marks. The census writes only into its own gitignored directory with a `STATUS.md`.

`tests/schgen/gates/geometry-survives.test.ts`'s end-to-end assertion that
`transistor-preamp-buffered` refuses from `generate` is therefore untouched and still passes.

### 2. The four classes reach `BoardSheets` (`tools/schgen/board-sheets.ts`)

`outcome` is now `RefusalClass`. `refused` is gone: it covered an undrawable circuit, a crowded
drawing, a wrong drawing and a `TypeError` under one word. `no-declaration` is **not** a fifth
class — it is `not-drawable` (no geometry exists and none could), with a new `declared: boolean`
carrying the G247 distinction so the census can still count it separately. A new
`findings: readonly Finding[]` carries the evidence for the class.

Two rules at the one `catch`:

- **A `SchgenRefusal` is classified by `worstClass(findings)`.**
- **An untyped `Error` is a `generator-defect` and FAILS THE RUN** — synthesised as an
  `invariant-violated` finding, printed as a `GENERATOR DEFECT … this is a BUG REPORT, not a board
  status` line, and `process.exitCode = 1` from the CLI.

`classWithoutDrawing` is the one subtlety worth naming: a board that produced NO file cannot be
`usable` or `defective`, because both of those classes assert a drawing exists. It is reachable —
a sheet-level gate can refuse a whole sheet over crowding, and crowding is `usable` — so the floor
is `not-drawable`. **`generator-defect` is never rewritten**, because a broken invariant must never
be reported as a fact about a circuit.

### 3. A durable, gitignored output directory (`tools/schgen/board-artifacts.ts`, new)

`build/schgen-boards/<board>/`, named explicitly in `.gitignore` with its reason. The CLI default
**used to be `mkdtemp`** — a census that printed a path the OS then reaped is the pathology in a
tool's clothes. `prepareBoardOutput` empties the root on every run (a stale drawing beside a fresh
`not-drawable` status is a false green) and refuses to empty a filesystem root.

Per board: **`STATUS.md`** for every board, clean ones included, naming the class, what the class
MEANS, the blocker in full and every finding by kind; and **`REFUSAL.kicad_sch`** whenever no
drawing exists — one page, text only, no symbol/wire/net.

### 4. Coverage assertions

`boardSheetsCensus` reads `boards/` **a second time, directly** (`boardDirectoryNames`) and refuses
when its rows and the directory set disagree in either direction. The test anchors independently:
its own `fs.readdirSync` of `boards/`, `expect(BOARD_DIRS.length).toBe(11)`, then set equality. No
list is summed against itself.

### 5. `tests/schgen/board-status.test.ts` (new, 21 tests)

Runs the census (previously `boardSheetsCensus` had exactly one caller — its own
`import.meta.main`). Asserts the committed expectations; that every row's class **follows from its
own findings**; that every board has a `STATUS.md` and that a `REFUSAL.kicad_sch` exists exactly
when no drawing does; that every reported file exists; that the census line prints both splits;
that the `GENERATOR DEFECT` line exists (over a fabricated row, since no real board reports it) and
that no real board prints it. The usable/defective split is deliberately NOT pinned.

### 6. Consumers updated

- `tools/guide/schematic-source.ts`: `!result.declared` → `none`; `schematicRoot === undefined` →
  withheld `drawn: false`; **new arm** — a drawing with findings is withheld `drawn: true`, because
  a build guide is the document somebody solders from. An unreachable "reported generated but wrote
  no schematicRoot" guard was DELETED rather than left (supersede means delete).
- `tools/schgen/board-geometry.ts`: tests `r.drawings.length === 0` instead of the outcome string,
  so the three preamp boards are now MEASURED rather than skipped. Its own three-value `outcome`
  stays, documented as *not* a ratification class.

### 7. `tools/schgen/library-digest.ts` (new) — a size extraction, not a redesign

`generate.ts` was at 485 lines and the brief said extract rather than exceed. `DIGEST_EXEMPT`,
`moduleTreeDigest` and the two library-directory constants moved WHOLE, comments and all;
`generate.ts` re-exports all four (the barrel it already keeps for `writeGeneration`), so no import
anywhere changed. One string inside a refusal message was repointed at the new file.
`generate.ts` is now 368 lines.

---

## Verification

- `bun run typecheck` — clean.
- Full suite BEFORE: `Ran 3909`, 3908 pass / 1 fail — and **the one failure was my own
  contamination**: `port-fidelity.test.ts` picked up `library-digest.ts`, which I created while
  that run was in flight. The brief's stated baseline of `Ran 3909`, 0 fail is confirmed by the
  count; the failure is explained, not adjusted away.
- Full suite AFTER, on the committed tree (`23b2cf2`): **`Ran 3930` across 366 files, 3930 pass,
  0 fail**, 165s. **Accounted for term by term: +21 and +1 file, which is exactly
  `tests/schgen/board-status.test.ts`'s 21 tests.** No existing test changed its result.
  `tests/schgen/decomposition-probe.test.ts` did not flake on either of the two full runs.
- `bun tools/schgen/board-sheets.ts` — exit 0, output above.
- `kicad-cli sch export pdf` succeeded on all three preamp boards and on the refusal sheet.

## Two things the repository's own guards caught, recorded rather than quietly fixed

**`tests/stripboard/temp-scratch.test.ts` caught my leaking scratch directory.** The census
directory must outlive every test in the file, so it cannot be removed in the scope that made it;
it is now `freshTempScratch("board-status-")` with `afterAll(cleanUpTempScratch)`. The guard
matches the hook by a regex that accepts `afterAll(cleanUpTempScratch)` and
`afterAll(() => cleanUpTempScratch…)` but not a braced body — I wrote the braced form first and it
failed again, correctly.

**A `.gitignore` line-number citation went stale in the same commit that moved it.**
`DIGEST_EXEMPT`'s reason cited `.gitignore:20` and `.gitignore:54`; adding the census's output
directory shifted both by ten. Both now name the entry rather than its line, and the moved file
says so at the top — a line number in prose is a transcription with a date on it.

## A process incident, recorded because the rule is in `CLAUDE.md` and I broke it

My first draft of `tests/schgen/board-status.test.ts` contained a character-class regex whose two bounds were written as backslash-u escapes for
code points 0 and 31 (not reproduced here, for the reason this paragraph is about), typed
as escapes into a Write tool parameter. **It arrived as two real control bytes** (a NUL at
offset 14295 and a 0x1F at 14297). bun reported *"Invalid regular expression: range out of order in
character class"*; the rendered file looked exactly like what I typed. It happened in the test
whose own assertion is *that no line carries a control byte*. The check is now a char-code
comparison built in code (`hasControlByte`), with no escape typed anywhere, and every file I
touched was byte-counted: zero control bytes.

**AND THEN IT HAPPENED AGAIN, IN THIS REPORT, IN THE PARAGRAPH ABOVE DESCRIBING IT.** Quoting the
offending regex put the same two bytes into this file. Caught by byte-counting the report, which is
the only thing that catches it — the rendered text looked correct both times. `CLAUDE.md` says
there is no care level at which typing the escape is safe; two incidents in one task, the second
while writing about the first, is as direct a confirmation as that claim can get.

## Not done here, deliberately

- **The two marks** (watermark + title-block status field) are Task 5. Until they exist, an
  unratified drawing is written only into the gitignored census directory, beside a `STATUS.md`
  that names its class, and never into a circuit directory.
- **Fixing any gate.** The spec puts that out of scope so the question can be asked with the
  drawing in hand. The *"what to take to the owner"* section above is that question.
- **`docs/known-gaps.md`** is frozen for this plan; nothing was added. The observation about
  fallbacks being the real damage while `text-clearance` does the refusing belongs there once the
  freeze lifts.
