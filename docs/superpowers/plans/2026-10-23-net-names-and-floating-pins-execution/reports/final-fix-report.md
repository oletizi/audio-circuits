# Final fix dispatch: figure hygiene outward

Dispatch: single fix round closing the six-task plan, against `final-review.md`'s
PASS-with-findings verdict. Date 2026-10-24. Branch `feature/schematics-tooling`,
worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`.

**Scope held: prose, comments and register text only. No behaviour changed.** No
`.ts` predicate, assertion, rule list or glob was edited; `tools/schgen/port-manifest.json`
is byte-identical, so `files[]` is still 73, `diverged[]` is still 55, no `sha256`
moved and no file left the byte-check.

Every figure below was re-measured in this dispatch. Nothing was copied from the
review or from the dispatch brief. Two of the brief's own line numbers were wrong
and are noted under DISPUTES.

---

## VERIFICATION

| | result |
| --- | --- |
| suite, `SCHGEN_SOURCE` set | **3851 pass / 0 fail / 43711 `expect()` / 357 files** [151.53s] - driven before AND after the prose round, identical in every term |
| `bun run typecheck` | **clean**, `tsc --noEmit`, no output, exit 0 |
| census | **1 of 11 boards produce a schematic; 10 refused; 0 have no authoring declaration; 8 fallbacks across 1 board** |
| byte-check, all six touched files | **0 offending bytes** in each, counted as BYTES and never read |
| `tools/schgen/port-manifest.json` | **not in the diff** |

Every control byte in this dispatch was built with `String.fromCharCode(0)` in a
script. **None was typed into a tool parameter.** No `sed -i`, no sed `w`/`e`, no
heredoc, no `#` inside a quoted argument - every edit went through `Edit` and the
commit message through `git commit -F`. `git checkout HEAD --` was never used.

---

## THE FIVE IMPORTANTS

### 1. `CLAUDE.md` - the controller's own file. FIXED.

`CLAUDE.md:122-146` now reads, in substance:

- **`produces a schematic for 1 of the 11 boards in `boards/`` - `pt2399-core`, since 2026-10-24.**
- **`0 of 11` and "six are refused at `validateCircuit` on net names" are quoted
  as having stood there**, with the house-style correction note: the count is
  SUPERSEDED, the cause is REFUTED, and the cause is the worse of the two because
  a stale count misleads about progress while a stale cause sends the reader after
  a rule that is not there.
- **No board refuses on a net name at all**, with the owner's instruction verbatim
  (*"i absolutely do not care about the letter case of net names. That's a silly
  quibble."*) and **G150**'s re-drive cited for the reading of all eleven blocks.
- **What refuses today: FIVE boards at `validateCircuit`, one problem each** -
  four Pultec boards on a switch MOUNTING pin (`pin MP`), flagged as an **OPEN
  OWNER QUESTION and not work**, with **G282** cited and its closing *"Nobody asks
  him again unprompted"* quoted; and `pultec-mid` on a switch throw (`pin 12`)
  that **no slot in the model can carry**. Plus **five** `transistor-preamp`
  boards at ELK layout on text, power-symbol and junction placement.
- **`1 of 11` is explicitly not quotable without its second column**, with the
  instruction not to let it stand in that file or anywhere else without one: not
  one net label, flow not followable, `C13`/`C14` unresolvable, page 1 of 2 blank
  but for a sheet symbol, **19 of 24 reference designators disagreeing with the
  built board's** and the sharp example (the sheet's `R3` is 10K where the board's
  `R3` is 15K). **G285** is cited and its closing line quoted verbatim: *"It is
  not a candidate for G240 and must not be sent to him as one."*

**A second correction in the same bullet, not in the brief and found by reading
around the edit.** The bullet continued *"all nine now exist … and the board
figure did not move"*, which read as a live claim once the figure became 1 of 11.
It now says the figure **did not move THEN** and moved three days later for an
unrelated reason - Task 5 resolving `pt2399-core`'s validation refusal and its
sheet-name collision (**G284**), which is G285's own *Found* bullet.

### 2. `G274`'s live status bullet. FIXED.

*"six boards need their net names"* is **replaced rather than annotated**, because
that field is what a reader checks to decide whether the entry still binds. It now
reads **"FIVE BOARDS NEED A SWITCH-PIN DECLARATION and one needs a junction"**,
adds **G282** to the ground-owners beside G150 and G263, records that both halves
of the old clause were gone (count AND cause), states **ZERO boards need their net
names** against a dated `[RAN, CONFIRMED]` census, and names the five: four Pultec
on `pin MP` (open owner question) and `pultec-mid` on `pin 12`.

### 3. `tools/schgen/text-metrics/corpus.ts` - the live source comment. FIXED, comment only.

The module header now says the gate refuses **FIVE of the eleven boards** and
names the real cause (four Pultec on `pin MP`, `pultec-mid` on `pin 12`). The
correction block quotes the old *"six … on lower-case net names"* and says why the
cause mattered more than the count: it was the premise the next sentence used to
explain `StringRow.reachesTheDrawing`.

**And one thing the review did not catch, found by reading the code rather than
the comment.** `reachesTheDrawing` is `validationProblems.length === 0` at
`corpus.ts:76` - it is a property of the **BOARD**, not of a net. The old prose
said *"a character that enters the glyph set only through a refused NET"*, which
was wrong in **shape** as well as in cause. The comment now states the computation
and says the field is per board. The field's own doc comment was already correct.
**No behaviour changed**; `corpus.ts` is in the manifest's `handWritten[]`, not
`files[]`, so no `diverged[]` entry was needed and none was added.

### 4. `G150`'s Task-6 control citation. FIXED.

The control is sound - I located all four pre-plan baselines in place and the five
strings reproduce. Its citation could not bear three of them. The block now carries
a nested correction with a four-row table:

| board | the pre-plan record, re-driven here |
| --- | --- |
| `-lab` | **G259**'s Task 24 amendment, as originally cited - correct |
| `-buffered`, `-staged` | **G263** shape (1), `docs/known-gaps.md:2551` |
| `-feedback` | **G263** shape (3), `docs/known-gaps.md:2585` |
| `-loop` | `tools/schgen/label-freedom/probe-run.log:399`, a COMMITTED probe log (`git ls-files` confirms) and the only pre-plan record of `BUFFER_BASE at (29.21, 17.78)` anywhere |

I confirmed by reading G259's Task 24 amendment that the other four preamp boards
appear in it as *"no declaration"* with no coordinates at all. Named as false-greens
mechanism **27**. The *Evidence* bullet now cites all four locations and states
plainly that it once cited G259's amendment alone for all four. The *Verified*
bullet distinguishes the reviewer's independent re-drive from this dispatch's
location of each baseline.

### 5. `G289`'s offset and inverted geometry. FIXED in all four places.

**Re-measured against the historical blob** (`git show 391f028:…`, read as BYTES):

```
391f028  6185 bytes  1 offending byte  at offset 2811  line 49  col 32
HEAD     6925 bytes  0 offending bytes
```

- **The NUL is at byte 2811, not 2804.** Byte 2804 is the `.` of `.join` - the
  start of the call, not the byte. **Not a unit confusion:** the blob is 6185
  bytes and 6185 characters, pure ASCII throughout, so byte, codepoint and UTF-16
  offsets are all 2811.
- **The geometry is inverted.** `function pinSetKey` was at line **48** and the
  NUL at line **49**: the identifier was **one line ABOVE** the byte. The sentence
  is true of the REPAIRED file and false of the historical one.

All four sites corrected: **G289**'s header (now *"an identifier defined one line
above it"*), G289's body, `tests/document-control-bytes.test.ts` and
`tests/stripboard/materialize-net-names.test.ts`. G289 gained a replace-rather-than-annotate
block quoting both wrong figures and giving the re-drive.

**One thing I did differently from the brief, deliberately.** The review's phrasing
*"true of the repaired file - `NUL` at line 58, `pinSetKey` at 61"* is itself a
self-invalidating citation: writing the correction into that file's comment moved
those lines (they are 64 and 67 now). **The repaired file's geometry is therefore
stated as a RELATION - `pinSetKey` three lines after the `NUL` constant - and not
as two line numbers**, and G289 says why.

---

## THE TWO MINORS

- **Plan `:121`'s correction of a bad citation carried a bad citation.** Now cites
  **the symbol and the file, not the line**, with a nested block giving the drift I
  measured: `connectedNet` at `types.ts:62` at `2758137` and `1c0ade7`, `:113` at
  `257817e`, **`:120` at HEAD**. **And one the review missed:** the same sentence's
  `lib/schgen/ir/build.ts:46` is **`:47` at HEAD** - also moved, also now cited by
  symbol. The lesson is stated: a line number in a plan is a claim about one commit,
  and this plan's own later task falsified it.
- **Plan `:262` used `lib/kicad/sexpr-write.ts:32` as live evidence** thirteen lines
  after the block calling that path nonexistent. Corrected in place to
  `lib/schgen/render/sexpr-write.ts:31-33` (verified: `str()` at `:31`, the throw at
  `:32-33`; `lib/kicad/` holds `sexpr.ts` and no `sexpr-write.ts`), with the old
  path quoted and the reason the *"the wording stands"* convention does not cover it:
  that convention protects a dated judgement, not a path that resolves to nothing.

---

## THE EIGHT QUANTITIES: MEASURED vs WITHDRAWN

The brief's rule - *"where a figure is volatile, stop publishing it rather than
pinning it"* - decided four of these.

| quantity | resolution | how |
| --- | --- | --- |
| tracked `.ts` the source arm covers | **MEASURED. 894 at `391f028` (one dirty), 895 at `118737f` (all clean).** Both published, each with its tree named | `git ls-tree -r` read as bytes, three commits |
| in-tree CONTROL cases | **MEASURED. THREE.** `two` replaced; the guard's `CONTROL:` cases are the byte-offset one, the tab/CR/LF one and the top-of-C0 one | read off `tests/document-control-bytes.test.ts` |
| `DRAWING_RULES` at HEAD | **MEASURED. ELEVEN.** `ten` replaced in G150's Task-3 block, with all eleven members listed and the round-0/fix-round-1 history stated | counted off `lib/schgen/ir/validate.ts:236` |
| boards in the no-change control | **MEASURED. FIVE boards across FOUR distinct refusal strings** (`-buffered` and `-staged` share one). `four` replaced and the unit named | the census run |
| each Pultec board's pre-Task-3 refusals | **MEASURED, by splitting the row.** `13 to 27` is net-name violations ONLY; TOTALS are `14 to 28`, per board `20, 14, 14, 14, 28`. The one row that conflated them is now two rows, with the unit shift named as mechanism 25 | arithmetic over G259/G274's per-board figures against G150's range |
| the repaired file's size | **PART MEASURED, PART WITHDRAWN.** The claim is now *the SEPARATOR is one byte before and after*; `6185 before and after` is quoted as wrong about the change that published it (6185 historical, **6925** at `118737f`, `Bin 6185 -> 6925`). **The HEAD size is not published** - my own corrections moved it again | byte counts at both blobs |
| the NUL's byte offset | **MEASURED. 2811.** `2804` replaced, with the proof it is not a unit confusion | byte scan of the `391f028` blob |
| tracked files / offenders | **MEASURED, BOTH TREES, AND THE PAIR WITHDRAWN AS A PAIR.** `26 of 1304` is true of no commit: `391f028` is 1304/**27**, `118737f` is **1305**/26. The published pair measured the uncommitted tree between them. **Every site now names its tree** | `git ls-tree -r` at both commits |

**Three further figures WITHDRAWN rather than pinned**, following `G288`'s precedent
that the brief endorsed:

- **The `1 883 942-byte register copy`** (review Minor 14). The size is now
  deliberately absent. The register grows whenever anybody writes an entry, so the
  drive could not be re-taken against the figure describing it. **What is published
  instead is the re-drivable procedure**: append one NUL to a copy of
  `docs/known-gaps.md`, place it under `docs/`, and the guard names it at the
  appended offset, whatever that offset is today.
- **G289's `grep -c pinSetKey` returns 6 / 7 lines.** My own comment edits moved
  these to **8** and **11** - the figure moves whenever anybody writes the
  identifier down. Both are now recorded with their commits, and **the published
  claim is the invariant**: `grep` finds the identifier at all, which it could not
  before.
- **The repaired file's HEAD byte count**, as above.

**One review Minor fixed incidentally, because I had measured it:** the `13 .vrt`
are **eleven** board layouts under `boards/` plus **two** test fixtures
(`tests/fixtures/pultec-low-boost-c19-floated.vrt`,
`tests/fixtures/stripboard/pultec-low-boost-frozen.vrt`), now said in both places.

**And one stale `six` not in the brief**, found by reading around an edit: G150's
Task-3 block concluded *"six boards now refuse on ONE problem each"*, true on
2026-10-23 and five from 2026-10-24 once `pt2399-core` began generating. Kept as a
dated column with the later reading beside it.

---

## DISPUTES AND CORRECTIONS TO THE BRIEF

Two of the brief's line numbers are wrong. Neither changes any conclusion.

1. **`G274`'s status bullet is at `docs/known-gaps.md:25649`, not `:25656`.** `:25656`
   is inside the *What would settle it* bullet (*"produce a sheet for
   `transistor-preamp-lab`"*). I fixed the field the brief described, which exists
   and said what the brief said it said.
2. **The plan's live use of the nonexistent path is at `:262`, not `:260`**, and the
   block calling it nonexistent is **thirteen lines EARLIER**, not twelve - and the
   brief's *"twelve lines from"* reads as though the correction block follows it. It
   precedes it, which is what makes the residue worse: the file calls the path
   nonexistent first and then uses it.

**One substantive addition beyond the brief, which I flag because the brief said to
stop if an item needed a code change.** It did not. The `corpus.ts` comment was wrong
in a third way the review did not record - it described `reachesTheDrawing` as
excluding a refused NET when the field is `validationProblems.length === 0` and is
per BOARD. That is prose, fixed in prose; the code was always right.

**Nothing else is disputed.** The review's substance held everywhere I re-drove it:
every baseline is where it said, the NUL offset and geometry are as it measured, the
population pairs are true of no commit, and the suite, census and typecheck reproduce
exactly.

## WHAT IS STILL OPEN AND IS NOT MINE

- `make check` at root is RED on four boards (**G251**), pre-existing.
- The four `MP` pins remain an **open owner question** (**G282**); nobody asks him
  again unprompted.
- `SW_MID`'s `pin 12` remains a model gap with an UNTRIED mechanism.
- The five preamp boards remain out of scope at ELK.
- `docs/schematic/README.md`'s *"sixteen distinct mechanisms"* against
  `false-greens.md`'s 29, and the two closed research documents still saying *"six
  boards"*, are outside this plan's range and already recorded. Not touched.
