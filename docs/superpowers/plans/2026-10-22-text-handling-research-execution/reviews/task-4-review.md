Task 4 review: how comparable tools handle schematic text that will not fit
===========================================================================

**SPEC COMPLIANCE: PASS** (one required follow-up, below)
**TASK QUALITY: HIGH**

**Scope of this review.** BASE `4fe4b41`, HEAD `fe0e7b8`, two commits, two files.
Every figure below that I report as CONFIRMED was re-driven in this session in the
scratchpad
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/c2d282b5-563b-4925-a635-40baac8284e1/scratchpad`
from independently fetched sources. Where I am RELAYING I say so. I fixed nothing
and committed nothing; `git status --porcelain` is empty.

**Headline:** I could not break the central claim. **N = 6, M = 0 HOLDS.** The
most falsifiable thing in the task — the OrCAD manual — reproduced at the exact
byte count *and* the exact SHA-256 on an independent retrieval, and every grep
count over it matched. All five Altium quotations are verbatim in the live page
bytes. All fifteen pinned file hashes match. All four netlistsvg arms reproduced
**byte-exactly** from a fixture I rebuilt from §4's prose alone. No Critical
finding. Two Important, eight Minor.

---

A. QUOTATION FIDELITY ON THE COMMERCIAL DOCUMENTATION — **PASS**
----------------------------------------------------------------

This was the highest-risk surface and it is clean. I did not grep for a paraphrase:
I fetched each page's raw bytes with `curl`, stripped tags, normalised only
whitespace and the four smart-punctuation pairs, and tested each quotation as an
exact substring, printing the longest matching prefix on a miss. The script is
`scratchpad/check-quote.py`; a miss would have named the divergence point.

**Altium — all five quotations verbatim. CONFIRMED.** Three pages, all reachable
by me on 2026-10-22, the retrieval date §4.6 states:

| page (sha256 of the bytes I fetched) | quotation | result |
| --- | --- | --- |
| `schematic/placed-components` `4a0f885e…` | "Autoposition – check to enable auto-positioning, meaning that the parameter is positioned automatically every time the associated component is rotated. Disable this option to keep the parameter position to the associated component when it is rotated." | HIT |
| same | "The default behavior of the Designator is to auto-position it as a component is rotated during placement." | HIT |
| `pcb-placement-editing-techniques` `c7370e9e…` | "The following nine positional styles are available for the text, all of which are classed as 'automatic positions', meaning the text remains in the chosen position as the component is moved and rotated:" | HIT |
| `schematic-placement-editing-techniques` `38b3ce94…` | "The schematic editor automatically stacks objects, text and graphics in layers. Each object is on a different layer depending on the creation order and, therefore, it is possible to place objects so that they overlap. The objects created or added recently are always on the top layer." | HIT |
| same | "Objects will be moved regardless of their position with respect to the reference. It is possible to end up with partial or total overlap of objects." | HIT |

**The greps that could have matched and did not. CONFIRMED.** On
`placed-components`: `overlap` 0, `collid` 0, `clutter` 0 — exactly §4.6's claim.

**The nine style names. CONFIRMED verbatim and in order** on the PCB page:
Left-Above, Left-Center, Left-Below, Center-Above, Center, Center-Below,
Right-Above, Right-Center, Right-Below. §4.6's "and a `Manual` style reached by
dragging the text" is CONFIRMED by the page's own sentence: *"You also can freely
click, hold and drag text to the required position directly in the workspace; this
will automatically switch the Autoposition property to Manual."*

**Both corrections to `text-placement-prior-art.md` §7. CONFIRMED.**
(1) The prior-art document quotes *"[n]ine positional styles ... all classed as
'automatic positions'"*; the page says **"all of which are classed as"** — a marked
elision, so a shortening, exactly as §4.6 characterises it. (2) The nine styles are
the PCB editor's: `Position Component Text` occurs once, on the PCB page; the
schematic page has 0 hits for `nine positional` and 0 for `Autoposition`. The
correction's premise holds.

**OrCAD — the strongest single piece of evidence in the task. CONFIRMED
INDEPENDENTLY.** §4.7 does not name the mirror, so I searched for it, found
`https://www.i-t.com/wp-content/uploads/2019/05/cap_ug.pdf`, and got:

- **5,487,028 bytes** — §4.7's figure, exactly.
- **SHA-256 `d1a6dd3b722c130834471f3e3090f86de5636e213ec10fa189c2a80e25e83bc9`** —
  §4.7's hash, exactly.
- `pdftotext -layout` → **31,433 lines** — §4.7's figure, exactly.
- `auto.?position` 0, `designator.*position` 0, `position.*designator` 0,
  `collision`/`collide`/`clutter`/`legib`/`too long` 0 each, `truncat` 5,
  `overlap` 3, `reference designator` 52 — **every count matches**, and the five
  `truncat` hits are exactly the ones §4.7 describes (a wildcard-search note, two
  third-party-program wrap/truncate notes, two "No truncation takes place").

A fabricated or paraphrased vendor quotation would have shown up here. None did.
**No Critical finding on surface A.**

*Minor on A:* §4.6 gives a URL for only one of the three Altium pages, and §4.7
gives no URL for the OrCAD mirror. I reached all four by guessing the Altium slugs
and searching for the PDF, but a later reader is doing that work again.

---

B. THE CONCLUSION, TOOL BY TOOL — **PASS**
-------------------------------------------

**Grades are not inflated.** Every statement about lepton-eda and xschem is marked
`[READ]`; neither is reported as observed behaviour anywhere in §4, §4.9, §4.11 or
the G260 amendment. §4.0's grade table says plainly that `[READ]` means nothing was
executed and that "a path not taken in the source is not a path proven not to exist
elsewhere in the program". Marker counts in §4: 14 `[READ]`, 13 `[RAN]`, 12
`[DOCS]`.

**All fifteen pinned file hashes MATCH.** I fetched each tool at the stated commit
(`git fetch --depth 1 <sha>`; all four resolved) and hashed each named blob, with a
deliberately wrong hash as a control that reported MISMATCH. Line counts match too
(`autoplace.scm` 1224, `deprecated.scm` 213, `draw.c` 7129, `svgdraw.c` 1241).

### lepton-eda `fd160f0` — classification CONFIRMED, every count re-derived

| §4 claim | my re-derivation |
| --- | --- |
| 45-row table | **45** rows CONFIRMED |
| 4 `pinlabel`, 4 `pinnumber`, 11 each `refdes`/`value`/`device`, 4 `netname` | CONFIRMED exactly |
| 3 of 45 rows carry a movement direction / `mov_dir` empty for 42 of 45 | CONFIRMED: non-empty are `refdes "<>^v" "^<"`, `value "<>^v" "v>"`, `device "<>^v" "v>"` |
| 10 of the 11 `refdes` rows have an empty `mov_dir` | CONFIRMED |
| the table's comment *"is an empty string if no movement is allowed"* | CONFIRMED verbatim, line 105 |
| nine `error` calls, all malformed-input | CONFIRMED: lines 320, 488, 712, 890, 915, 937, 948, 975, 1047 — 1 unknown point + 1 unknown coordinate + 2 unknown pin direction + 3 unknown reference + 1 odd attribute list + 1 invalid alignment = 9 |
| `adjust-pos-to-avoid-collision`'s only exit returns a position | CONFIRMED: single exit at line 903 returning `new-attrib-bounds-adjusted`, initialised to the input at 739, so it can never return null |
| `set-default-position` then always writes the text | CONFIRMED: lines 1110–1129, no failure channel |
| `get-object-pins` returns `'()` for a non-component | CONFIRMED, lines 499–502 |
| the four `refdes`/`value` hooks are commented out | CONFIRMED: `deprecated.scm` 98–105 (add/rotate/mirror component object, add attribute) plus the `complex-place-list-changed-hook` variant at 113–116 |
| `place-netname-attribute-handler` is live | CONFIRMED, `deprecated.scm:121` |
| repo-wide refusal grep returns 4 unrelated hits | CONFIRMED EXACTLY: two unit-test comments about config loops, two GTK comments about "stubborn refusal to draw" |

**The stray `2`. CONFIRMED, and the arithmetic too.** Line 782 of `autoplace.scm`
begins with `2` at column 1, inside `(- (- (min-x pins) 2 (max-x attrib)) spacing)`,
which Scheme's variadic `-` evaluates as `pins-min-x - 2 - attrib-max-x - spacing`.
`snap-coord-to-grid` (lines 718–729) **floors** for `coord <= 0` with
`autoplace-attributes-grid = 50` (line 41), so `snap(-100) = -100` and
`snap(-102) = -150` — **one whole grid step**, exactly §4.2's figure, from the real
definition rather than a transcription. Both pasted `lepton-src` blocks (777–786,
798–807) are faithful line-for-line, and the line-number prefix is the only
alteration, as declared.

**The empty-`mov_dir` finding. CONFIRMED.** With `move-direction` `""` the
`string-index` test at 802 is false, so the else branch at 805–806 sets the offset
to `+autoplace-attributes-grid`, against the table's own comment. Reading, not
observation, and §4.2 says so.

**Hunt for a missed refusal path — nothing found.** I ran a second-order vocabulary
sweep over the *whole* lepton-eda tree (194 `.c`, 119 `.h`, 337 `.scm`):
`too long/wide/big to` 0, `clip text` 0, `not enough room/space` 0, `abort` 0,
`skip text` 0. All 17 `truncat` hits are netlist-format name truncation (switcap
7/8 chars, futurenet2 8 chars) or GUI history lists; all 4 `ellipsi` hits are GTK
widget affordances, two of them commented out. The only text-overlap mention
outside `autoplace.scm` is `tools/tragesym/lepton-tragesym.scm:812`, which prints
*"Note: use sym_width to adjust symbol width if texts overlap."* — and it fires
`unless (zero? (+ pin-count/top pin-count/bottom))`, i.e. **unconditionally** for
any symbol with top or bottom pins, not in response to a detected overlap. So
§4.8's "Nothing examined asks a person because it could not place text" survives;
this is the nearest near-miss in that tree and §4 does not mention it.

**§4.10's named unread lepton paths are the right ones:** `libleptongui` and
`liblepton` are indeed the two C libraries at the tree root, and they are where a
rendering- or export-path refusal would live. I greped them and found none.

### xschem `36e0eab` — classification CONFIRMED

- `res.sym:70` `T {@name} 15 -18.75 0 0 0.2 0.2 {}` and `:71` `T {@value} 15 -6.25 …`;
  `opin.sym:35` `T {@lab} 20 -8.75 0 0 0.33 0.33 {}` — **all three CONFIRMED verbatim.**
  Version `3.4.8RC` CONFIRMED from `res.sym`'s header line.
- `draw.c:407` `if(size*xctx->mooz<3.0) return; /* too small */` with the `>1600`
  companion at 408; `draw.c:489` `if(xscale*FONTWIDTH*xctx->mooz<1)`;
  `svgdraw.c:881` `/* if(xscale*FONTWIDTH* xctx->mooz<1) continue; */` **commented
  out** — all CONFIRMED at the exact line numbers, including the stray space in
  `FONTWIDTH* xctx`.
- `netlist.c:1818` `"Error: overlapped instance found: %s(%s) -> %s\n"` CONFIRMED.
  `spice_netlist.c:641` `exit_code = err ? 10 : 0`, preceded at 640 by
  `/* critical error: force ERC window showing */`, and the file's `fclose(fd)` is at
  627 — **so the output really is produced before the flag is set.** CONFIRMED.
- The collision grep over `src/*.{c,h,tcl}` CONFIRMED: `warning_overlapped_symbols`
  and its call sites plus two hash-collision comments in `actions.c:36–37`. (See
  Minor 2 — the document adds a third hit that is not there.)
- **Hunt for a missed refusal path — nothing found.** The six hits for
  `no room` / `not enough room` and the one for `refus` over the whole tree are all
  in `scconfig/`, the vendored build-configuration tool, about buffer sizes.

### netlistsvg `d3518f1` and schemdraw `0.23` — see surface C

### Altium and OrCAD — grades CONFIRMED

§4.6 states that Altium's failure semantics "are not specified at all" rather than
inferring one, and §4.7 states the OrCAD result as an absence in a 2012 document
rather than a claim about the product. Both are the discipline the plan asked for.

---

C. THE TWO RAN OBSERVATIONS — **PASS, netlistsvg byte-exactly**
----------------------------------------------------------------

There is **no committed log** to verify against — §4's six blocks are declared
not-output precisely because the logs are scratchpad runs — so I re-drove both.

### netlistsvg: I reproduced all four arms EXACTLY

I installed the clone's dependencies with `npm install --legacy-peer-deps`
(698 packages, exit 0), confirmed `git status --porcelain built` reports **0**
modified files, and rebuilt the fixtures from §4.4's prose alone: the clone's
`test/analog/resistor_divider.json`, with the two resistor keys renamed and a
`value` attribute added for the long arms, and a `c_v` capacitor across the lower
resistor for the two-column arms. Every number in §4.4's three pasted blocks came
back identical:

| | §4.4 | my run |
| --- | --- | --- |
| baseline canvas / svg bytes | 74 x 249 / 3055 | **74 x 249 / 3055** |
| long canvas / svg bytes | 173 x 249 / 3358 | **173 x 249 / 3358** |
| baseline text boxes | r1 32..44, vout 47..71, r2 32..44 | **identical** |
| long text boxes | 32..176, 32..146, 47..71, 32..176, 32..146 | **identical** |
| one-column transforms, both arms | (17,47) (17,137) (12,12) (12,207) (32,112) | **identical in both arms** |
| two-column `parallel` | (22,47) **(173,152)** (17,12) (17,237) (12,152) (37,112) | **identical** |
| two-column `parallel-short` | (22,47) **(77,152)** (17,12) (17,237) (12,152) (37,112) | **identical** |
| exit code / stderr bytes, all four | 0 / 0 | **0 / 0, all four** |

**So the 96-unit move with five nodes unmoved is CONFIRMED by independent
re-drive**, as is the null result that makes it mean something: in one column the
five transforms are byte-identical between arms and only the declared canvas moves.
The 3-unit shortfall is CONFIRMED and is exactly 3 in three of four arms (long
176 vs 173, parallel 332 vs 329, parallel-short 104 vs 101; baseline 71 vs 74 is
inside).

**The convergence claim — the one that will be quoted — CONFIRMED at the pinned
commit.** `lib/Cell.ts:367` (inside `addLabels`, 348–378) pushes an ELK label with
`height: 11, width: (6 * newString.length)` carrying the template's own `x` and
`y - 6`. `lib/Cell.ts:266–273` (`render`) consumes each label **only** for
`label.text` via `setTextAttribute`; the coordinate ELK returns is never read. Both
line ranges in §4.4 are exactly right. The edge-label exception is CONFIRMED at
`lib/drawModule.ts:74–92`: a `fill: white; stroke: none` rect of
`(text.length + 2) * 6 - 2` by `9` behind a text that *does* use `e.labels[0].x/y`.

**And I closed the one gap the "ran built, read lib" caveat opens.** The executed
`built/Cell.js` carries `height: 11, width: (6 * newString.length)` at 366–367, its
`render` at 254–262 uses only `label.text`, and `built/drawModule.js:88,91` carries
the white rect. **So built/ and lib/ agree on every load-bearing point** — the
disclosed caveat is honest *and* harmless here.

**The self-caught false green is real. CONFIRMED.** `npm pack netlistsvg@1.0.2`
declares `"version": "1.0.2"` and its `built/drawModule.js` has **0** `busLabel`
occurrences and no `setAlternateCellType`, while the clone at `d3518f1` has both.
The tarball does predate the commit under the same version string, and discarding
it was correct.

### schemdraw 0.23: byte-identity CONFIRMED, result reproduced in substance

- `pip install schemdraw==0.23` into a fresh venv: **schemdraw 0.23, Python
  3.14.6, `ziamath` NOT installed** — all three exactly as reported.
- `diff -rq` clone vs wheel finds **exactly three** differing files — `elements/lines.py`,
  `logic/timing.py`, `logic/timingwaves.py` — none of them one a §4 claim rests on.
  CONFIRMED.
- **Byte identity by SHA-256 CONFIRMED** for `elements/elements.py`
  (`90df8c7d…`), `segments.py` (`27c82f2b…`) *and* `backends/svg.py`
  (`54195b00…`) between clone and installed wheel.
- `_place_label` at `elements.py:648`, and the **only** `raise` in 648–751 is
  `ValueError(f'Undefined location {label.loc}')` at line 750. CONFIRMED.
  Default `'top'` CONFIRMED at 436 and 528.
- The collision grep over every `.py` returns **exactly two** comments in
  `elements/twoterm.py` — 842 (arrow offset) and 882 (fill ordering). CONFIRMED.
- `svg.py:text_size`'s docstring — *"Size will be exact bounding box if ziamath
  installed and using path text mode. Otherwise size will be estimated based on
  character widths."* — CONFIRMED verbatim.
- **The run.** I rebuilt the control/treatment pair from §4.5's prose but chose a
  different geometry (horizontal, with a Line of the stated gap). Nothing is
  raised in either arm, both produce an SVG, 0 `clipPath` and 0 `textLength` in
  both, all four label lines present verbatim, **control 0 overlapping pairs vs
  treatment 1**, and the figure bbox grows. **And the text-box WIDTHS are
  identical to §4.5's**: "R1" 0.484 in both, the two-line label 4.062 in both. Same
  ruler, same strings, same qualitative answer. I could not reproduce §4.5's
  absolute coordinates because the fixture is not recorded (Important 2).

---

The remaining verification items
--------------------------------

**The taxonomy was NOT widened. CONFIRMED.** `docs/superpowers/plans/2026-10-22-text-handling-research.md:193`
carries the five behaviours verbatim, the plan file is untouched by both commits,
and §4.8's five canonical rows are the plan's five phrases word for word, none
altered, none dropped. Both non-fitting behaviours are recorded as non-fitting:
(a) growing the canvas is given a row that says **"THIS IS NOT ONE OF THE FIVE
ROWS and it is not being added as one"** and explains why filing it under *adjust
the surrounding geometry* would record a repair that did not happen; (b) the opaque
backing rect is recorded in §4.4 with no row at all. See Minor 5 for the one
presentational risk.

**The unretrieved lead is not counted as evidence. CONFIRMED.** Every count in §4
is six, or seven with KiCad (lines 2415, 2995, 2999, 3018, 3026, 3060). §4.7 says
in the same sentence that the lead "is NOT evidence and is NOT counted in §4.9",
and §4.10 and the G260 amendment both repeat the status. The lead is described as a
sixth *behaviour shape*, never as a seventh tool. **No standalone `docs/known-gaps.md`
entry exists for it** — `allegro`, `autosilk` and `silkscreen` appear in the
register only inside the G260 amendment (lines 1661–1668). See Important 1.

**§1, §2 and §3 are untouched. CONFIRMED for BOTH commits** from the hunk headers.
`bc477fc`: `@@ -1624,0 +1625,58 @@` and `@@ -2369,0 +2370,706 @@` — pure appends,
764 insertions, 0 deletions, as claimed. `fe0e7b8`: six hunks, the earliest at
**2433**, all of them past §4's heading at 2373. Combined over both commits:
`git diff -U0 4fe4b41 fe0e7b8 | grep -c '^-[^-]'` → **0**. The supplied diff
package's own headers (`@@ -1615,20` and `@@ -2360,10`, i.e. first changed lines
1625 and 2370) agree.

**The `expect()` accounting. CONFIRMED by a perturbation that could have failed.**
§4 adds exactly **six** fenced blocks (2 `lepton-src`, 3 `nsvg-run`, 1 `sd-run`);
none carries the `run` fence word, so none is registered as probe output, and the
standalone checker reports `39 fenced block(s): 14 VERIFIED, 25 declared NOT probe
output, 0 FAILED` with §4's six named by line (2578, 2606, 2703, 2750, 2777, 2835).
The one `expect()` apiece comes from the `for (const n of v.notOutput) expect(n)`
loop. I drove it: the test file alone is **110** `expect()` at HEAD; after I added
a seventh not-output fenced block it was **111**; I restored the file and
`git status --porcelain` is empty. So the 43489 → 43495 move is mechanically the
six blocks.

**G260's amendment fills only the half nobody had filled. CONFIRMED
independently.** The 58 inserted lines sit entirely inside G260 (1573–1750); no
other entry is touched. I scanned them mechanically for
`acceptable|threshold|tolerat|up to|at most|budget|per sheet|percent|%|limit`: five
hits, and every one is either naming the owner's question *as his*, the xschem
*zoom* threshold, or the explicit disclaimer "It does not answer how much overlap
is acceptable, propose a threshold, or rank the six behaviours." **No number, no
proportion, no tolerance, nothing that implies one.** The strongest statement is
that refusing is *unusual among its closest neighbours*, which is a fact about
other tools. One rhetorical caution: "**THE TRADE TASK 24 MADE IS THE ONE ALL SIX
OF THEM MAKE**" in bold caps reads as pressure until the next sentence, which
withdraws it explicitly ("a fact about what is conventional and not an argument
that the trade is right here"). Guarded, and I would leave it.

**No dependency was added. CONFIRMED.** The two commits change exactly two files,
`docs/known-gaps.md` and `docs/schematic/text-handling-research.md`. No
`package.json`, no lockfile, nothing vendored under `lib/` or `tools/`, no
untracked file. Everything I and the implementer installed lives in the scratchpad.

**Suite.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3785 pass / 0 fail / 43495 `expect()` across 352 files** (151.05s), exit 0.
Matches the report exactly.

**Typecheck.** `bun run typecheck` → clean (`tsc --noEmit`, no output, exit 0).

**No AI attribution.** Both commit messages read in full: no `Co-Authored-By`, no
`Claude-Session:`, no "Generated with" footer, no session link. CONFIRMED.

**Tree.** `git status --porcelain` empty, before and after my perturbation.

**False-green sweep.** I looked for all eleven recorded shapes and found none:
no tautology (every grep count and hash I re-drove had a failing counterpart — the
hash check ran a deliberately wrong hash as a control and reported MISMATCH); no
empty-range loop; no self-comparison; the perturbation moved the count in the
expected direction by exactly one; the controls in §4.4 and §4.5 genuinely answer
differently from their treatments and I reproduced both answers; the paraphrase-grep
trap was avoided by exact-substring matching against raw bytes; the
built-vs-lib version question is closed above; the version-string trap
(npm 1.0.2) is real and was caught by the implementer; and nothing rests only on a
gitignored directory — §4.12 explicitly labels the scratchpad verification script
"not committed and therefore not a check". **One new shape worth naming:** I caught
myself producing a false green mid-review — a zsh `set -- $pair` inside a loop
compared an empty hash to an empty expectation and printed MATCH. I rewrote it as a
script with an emptiness guard and a wrong-hash control. The lesson generalises:
*a comparison of two values both derived from the same failed extraction passes.*

---

Findings
--------

### Critical

None.

### Important

**I-1. The unretrieved Allegro/OrCAD place-and-report lead has no standalone
`docs/known-gaps.md` entry.** It is recorded only inside G260's Task-4 amendment
(lines 1661–1668), with its 403/login-wall/dead-DNS evidence and its settlement
("the Allegro/OrCAD PCB Editor manual"). I have ruled separately that it needs its
own entry; the implementer's report item 4 names exactly this as the one entry it
would add, so this is a known deferral rather than an oversight.
*Failure scenario:* a later agent scanning the register's headings for a
place-and-report precedent finds nothing — the lead is buried in an entry about
this repository's own field placement — re-researches it, and hits the same three
dead doors.

**I-2. Neither RUN's input fixture is recorded anywhere committed, so the task's
strongest evidence grade is the least re-drivable.** §4.0 says a reader has "the
commits, versions, install methods and hashes, and that is the whole of the
coupling available" — the fixtures are not among them. I reproduced netlistsvg
byte-exactly only because §4.4's prose happens to describe the fixture completely;
for schemdraw I could reproduce the *result* and the text-box widths but not the
coordinates, because the geometry is described in a sentence. The constraint
forbade adding a tool, a test or a log to the tree, but it did not forbid pasting
the fixture JSON and the eight-line schemdraw snippet as two more declared
not-output blocks, which is the cheap remedy.
*Failure scenario:* someone re-drives §4.5 with a different gap or orientation,
gets different numbers, and cannot tell whether §4.5 was wrong or the fixture
differed — so an OBSERVED finding degrades to an unfalsifiable one.

### Minor

**M-1. A wrong line citation in §4.5.** `SegmentText.get_bbox` is at
`schemdraw/segments.py:351`, calling `svg.text_size` at `:358`. §4.5 cites it as
`schemdraw/segments.py:102-132`, which is `Segment.__init__`'s parameter list and
`Segment.xform`. The substantive claim is true at the real location.
*Failure scenario:* a reader opens 102–132, finds no `text_size` call, and
discounts the surrounding paragraph.

**M-2. A hit attributed to the wrong tool's grep.** §4.3 says the xschem collision
grep returns "two comments about hash-function collisions **and one about arrow
coordinates**". The xschem grep returns only the two `actions.c` hash comments; the
arrow-coordinates comment is schemdraw's `twoterm.py:842`, which §4.5 reports
correctly as its own hit. The task report (not the document) states the xschem
result correctly as "two unrelated hash comments", so the document is the one that
drifted.
*Failure scenario:* a reader re-driving the xschem grep gets 2 unrelated hits
against a claimed 3 and concludes the tree moved or the grep was different.

**M-3. §4.2 undercounts lepton-eda's live-by-default autoplacers by one.**
`deprecated.scm:85-86` has a live `(add-hook! add-pin-hook (lambda (pin)
(autoplace-pin-attributes pin)) #t)`, so `pinlabel`/`pinnumber` are autoplaced out
of the box too — "the one text class lepton-eda autoplaces by default" should be
two. The error runs in the implementer's own disfavour: a pin is not a `component?`,
so `get-object-pins` returns `'()` for it as well and the collision adjustment is a
no-op for that class too (the guard is at line 761). The substantive point is
strengthened, and the refusal conclusion is untouched.

**M-4. §4.10's named unread xschem paths omit `src/psprint.c`, and I settled the
unknown it leaves open.** §4.3 concludes that "an exported file is not subject to
the suppression a screen redraw is" from `svgdraw.c` alone, and §4.10 lists as
unknown "whether the suppression threshold xschem applies on screen has any effect
on an exported PDF, since only the SVG exporter's guard was located". There is a
second exporter and one grep finds it: **`src/psprint.c:1185` carries the identical
guard, also commented out** — `/* if(xscale*FONTWIDTH* xctx->mooz<1) continue; */`.
So the §4.3 claim holds for the PS/PDF path too, and one of §4.10's three unknowns
is closed in the tool's favour. (`psprint.c:812,882` do apply the `textclip`
viewport cull, consistent with §4.3.)

**M-5. §4.8's table has six rows and the disclaimer lives inside a cell.** The five
canonical rows are verbatim and unaltered — the taxonomy is **not** widened, and
the "grow the canvas" row says so in bold in its own cell. But a reader skimming
the table sees six rows where the plan accepted five. Moving that behaviour out of
the table into a paragraph immediately beneath it would remove the risk entirely
without changing a word of the substance.

**M-6. §4 never uses `[RELAYED]`.** It carries §3's KiCad conclusion ("zero of
seven") and G260's fifteen without marking either as another section's figure. The
G260 amendment does mark them RELAYED, so the information exists — just not in the
section that uses it.

**M-7. The prior-art correction is one-way.** `docs/schematic/text-placement-prior-art.md`
§7 still attaches the nine positional styles to schematic designator text, with no
pointer to §4.6. The document's state (unedited) matches what §4.6 says about it —
"recorded here because that document is read and never rewritten" — which my charge
allows, but a reader of §7 alone will not learn it was corrected, and `CLAUDE.md`'s
"supersede means delete" leans the other way.

**M-8. §4.12's `expect()` figure is falsifiable prose, not a guarded assertion.**
Nothing in the suite pins 43495, so the figure goes stale silently rather than red.
The report's phrasing ("§4.12 states that figure, so the claim can fail") does not
overclaim, but the §4.12 sentence itself reads like a guard.

*Below Minor, for completeness:* §4.7 calls all three OrCAD `overlap` hits "about
selecting from among overlapping objects"; two of the three (lines 8494, 24412) are
specifically about TAB-cycling onto an overlapping wire segment. Same mechanism,
and I would not change it.

---

Verdicts
--------

**SPEC COMPLIANCE: PASS.** All five plan steps are discharged. Four open-source
tools read at a pinned commit with every blob hashed; two commercial tools from
documentation, marked as documentation and quoted from the bytes; the fixed
five-row taxonomy applied without widening, with both non-fitting behaviours
recorded as non-fitting; the three evidence grades declared, kept apart and never
confused; the conclusion stated as "of the N examined, M refuse, and here is how
each was established"; §4.10 a separate paragraph on what remains unknown; §4
appended as a pure insertion; G260 amended on its factual half only. The two
constraints most likely to be broken — no dependency, no answer to the owner's
question — are both intact. The one outstanding obligation is I-1, which the
implementer identified itself and which my ruling post-dates.

**TASK QUALITY: HIGH.** I set out to break this and could not. The three figures
most expensive to fake all reproduced on independent retrieval: the OrCAD manual at
the exact byte count and hash with every grep count matching, all five Altium
quotations verbatim in live page bytes, and all four netlistsvg arms byte-exactly
from a fixture rebuilt from the prose. All fifteen file hashes match; every
lepton-eda count (45 rows, the six-way name split, 42/45, 10/11, nine `error`
calls, four grep hits) matches; `snap(-100)`/`snap(-102)` matches from the real
definition; every xschem line number matches to the character. The controls are
real controls and I reproduced both of their answers. The `+6` is driven by a
perturbation. The one false green in the vicinity was caught by the implementer
itself. The eight Minor findings are citation and attribution slips, two of which
(M-3, M-4) I resolved in the tool's favour; none of them moves a classification, a
grade, or N and M.

**N = 6, M = 0: HOLDS**, and zero of seven with §3's KiCad.

**Suite:** 3785 pass / 0 fail / 43495 `expect()` across 352 files.
**Typecheck:** clean.
**Tree:** `git status --porcelain` empty.
