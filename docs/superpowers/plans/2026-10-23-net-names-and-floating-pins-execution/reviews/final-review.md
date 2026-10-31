# Final review: net names and floating pins, and Task 6's own review

Reviewer: final reviewer and Task 6 task reviewer, both roles, one pass.
Range `2758137..118737f`, 23 commits, 40 files, +5266/−205.
Worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`, branch `feature/schematics-tooling`.
Date 2026-10-24.

Every claim below is marked **CONFIRMED** (I re-drove it here) or **RELAYED** (another agent's
figure, not re-driven). `docs/schematic/false-greens.md`'s index was read before any check was
written; mechanism numbers below cite it.

**VERDICTS**

| | verdict |
| --- | --- |
| the whole plan | **PASS with findings.** No guard got weaker, the measurement work is strong and unusually honest about its own limits, and the suite, census and typecheck all reproduce exactly. What failed is figure hygiene **outward**: `CLAUDE.md` and a live source comment still carry both the count and the *cause* this plan deleted. |
| Task 6, A1 — the guard | **PASS.** Driven red four ways by me, including against the real register's bytes; the three in-tree CONTROL arms discriminate under three separate weakenings; the by-extension scope justification holds on re-measurement. |
| Task 6, A2 — incident six and the widening | **PASS on the work, FINDINGS on the record.** The repair is correct, the NUL **predates the plan by seven days**, and the widening to 895 `.ts` files is the right call, properly declared in three places. But the entry recording it gets the byte offset wrong by 7 and states the geometry backwards, in its own header. |

---

## SECTION A — TASK 6

### A1. The guard — CONFIRMED, and it has teeth

`tests/document-control-bytes.test.ts`: **CONFIRMED** 6 cases / 13 assertions
(5 + 1 + 4 + 1 + 1 + 1 = 13, counted off the file), green at HEAD in 305 ms.

**My own red drives**, all with the NUL built by `String.fromCharCode(0)` and never typed, all
against untracked plants so no tracked file was touched:

| plant | result |
| --- | --- |
| 52-byte scratch document under `docs/` | **RED**, `docs/zz-final-review-red-drive.md byte 46: 0x00`, 5 pass / 1 fail |
| a copy of the **real 1 912 084-byte register** with a NUL appended | **RED**, `docs/zz-final-review-register-copy.md byte 1912084: 0x00` |
| scratch `.ts` under `tests/` (the source arm) | **RED**, `tests/zz-final-review-red-drive.ts byte 25: 0x00` |

It names the file and the byte offset in every case. **CONFIRMED.**

**The three in-tree CONTROL arms discriminate** — driven by publishing three untracked copies of
the guard, each with one predicate weakened, so the real file was never edited:

| weakening | what went red |
| --- | --- |
| NUL added to the allowed set | **only** `CONTROL: … the byte offset of a NUL` (5 pass / 1 fail) |
| tab/CR/LF no longer allowed | 5 fail, including `CONTROL: tab, CR and LF are accepted` |
| only `0x00` refused | **only** `CONTROL: a byte at the top of the C0 range is caught too` (5 pass / 1 fail) |

Each arm fails for its own reason and no other. That is not false-greens mechanism 10 (a
perturbation that reddens something else): I read which assertion failed, not the exit code.
**CONFIRMED.**

**The 26-of-1304 justification — CONFIRMED in substance, with a finding on the pair.** My own
`git ls-files -z` walk, reading bytes (never text):

| | at parent `391f028` | at `118737f` (the publishing commit) |
| --- | --- | --- |
| tracked files | **1304** | **1305** |
| offenders | **27** | **26** |
| tracked `.ts` / clean | 894 / **893** | 895 / **895** |
| tracked `.md` / `.json`, clean | 168 / 82, all clean | 168 / 82, all clean |
| offender split | 13 `.vrt`, 9 `.png`, 3 `.pdf`, 1 `.kicad_sch`, **1 `.ts`** | 13 `.vrt`, 9 `.png`, 3 `.pdf`, 1 `.kicad_sch` |

So **the pair (26, 1304) is true of no commit** — see Finding 6. The *conclusion* it supports is
untouched and I confirm it: a repo-wide scan is red by construction, and 13 of the 26 are `.vrt`
layouts, the one output class that works for 11 of 11 boards. The populations the guard actually
scans are **156 documents** and **895 sources**, both **CONFIRMED** by re-running the globs, with
no non-`.md` in the document arm. `docs/` holds exactly 3 `.pdf`, 3 `.csv` and 3 `.net.xml`
tracked non-`.md` files — **CONFIRMED**, so the directory-scope argument is sound.

### A2. Incident six — CONFIRMED, and it predates the plan

**The repair.** `tests/stripboard/materialize-net-names.test.ts` now binds
`const NUL = String.fromCharCode(0)` and joins on it. **CONFIRMED** by reading the file and by a
byte scan: 0 offending bytes.

**`grep` now finds the identifier. CONFIRMED, driven both ways:**

- the parent blob (`git show 391f028:…`): `grep -c pinSetKey` prints nothing, **exit 1**;
- at HEAD: `grep -c pinSetKey` prints **6**, and `grep -rn pinSetKey tests/` names **7** lines.
  Four of the six are code (`:61`, `:113`, `:121`, `:128`) and two are the repair's own comment
  (`:48`, `:51`), exactly as **G289** says; the seventh line is the guard's own doc comment.

**Does the NUL predate the plan? YES — CONFIRMED, and this is the strongest justification the
guard has.** I walked every commit that touched the file and byte-scanned each blob:

```
094219ee  2026-10-16  bytes=6185  controlBytes=1 at=2811
118737f3  2026-10-24  bytes=6925  controlBytes=0
```

The file has exactly two revisions. The NUL arrived **2026-10-16**, seven days before the plan's
first commit `2758137` (2026-10-23 16:36), and survived every review and every `grep` in between.
So this is not one of the plan's own escapes; it is a pre-existing instance the plan found, which
is the part that argues for the guard existing at all.

**The widening to a second arm over 895 `.ts` files — the right call, and correctly declared.**
Judged on three grounds and it passes all three:

1. **The population is where the sixth incident was.** A document-only scope would not have found
   it and would not find the seventh. The widening is caused by a measurement, not by taste.
2. **It costs nothing and hides nothing.** All 895 are clean at HEAD, the arm asserts its
   population is >800 and names two specific members before scanning (so it cannot pass by reading
   nothing — false-greens mechanism 2), and the one file that legitimately holds a control byte
   (`ctl-nul.kicad_sch`) falls outside both arms **by extension rather than by exception**, which
   is the stronger form: a scope that lists its exceptions acquires more.
3. **It is declared three times** — in `G289`, in `G277`'s amendment, and in the test's own
   `SOURCE_SCOPE` doc comment — each naming it as a deviation from the briefed scope and giving
   the reason in one line. That is what `CLAUDE.md` asks of a deviation.

The one thing I would hold against it is that `.json` was measured clean (82 files) and left
unscanned with the arm recorded as an untried one-line mechanism. That is the honest treatment, not
a gap: no incident has landed there and the brief named a scope.

### A3. The census and the 108→5 — CONFIRMED row by row

`SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts` re-driven at a clean tree. **Every row matches
the task report character for character**, including all eight fallback lines and their µm² costs:

```
1 of 11 boards produce a schematic
10 refused; 0 have no authoring declaration
WARNING: 8 fallback field placement(s) across 1 board(s).
```

- `pt2399-core` generated, 1 sheet, 8 fallbacks. **CONFIRMED.**
- four Pultec boards at `part SW_{HI_BOOST,HI_CUT,LO_BOOST,LO_CUT}: pin MP () is neither on a net
  nor declared not connected`, one problem each. **CONFIRMED.**
- `pultec-mid` at `part SW_MID: pin 12 (12) …` — a different pin from the other four.
  **CONFIRMED.**
- five `transistor-preamp` boards at ELK. **CONFIRMED.**

**108 → 5. CONFIRMED arithmetically and in both columns.** `G259`'s scoreboard row records the
before tally as `18, 20, 14, 14, 14, 28` (sums to 108, **RELAYED** — I cannot re-drive a
2026-10-21 reading) and the after as `0, 1, 1, 1, 1, 1` (sums to 5), which is exactly what my
census run prints.

**The no-change control — the comparison holds; the citation does not.** I re-drove all five ELK
refusal strings against the committed pre-plan records and **every one reproduces character for
character**:

| board | today's string | where the pre-plan record actually is |
| --- | --- | --- |
| `-lab` | `label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)` | **G259** Task 24 amendment, `docs/known-gaps.md:1438` ✓ |
| `-buffered`, `-staged` | `the glyph of power symbol GND 0 at (31.75, 27.94) touches the glyph of power symbol VCC 1 at (31.75, 30.48), which is on another net` | **G263**, `:2551` — *not* the cited amendment |
| `-feedback` | `net GND branches at (38.1, 44.45) (t-junction)` | **G263**, `:2585` — *not* the cited amendment |
| `-loop` | `label BUFFER_BASE at (29.21, 17.78) overlaps label BUFFER_EMITTER at (46.99, 19.05)` | `tools/schgen/label-freedom/probe-run.log:399` — the **only** pre-plan record of these coordinates anywhere |

So the control is real and I confirm it. Its stated evidence is wrong — see Finding 4. **G259**'s
Task 24 amendment records coordinates for **one** preamp board and records the other four as
*"no declaration"*, because the nine declarations had not landed yet. Two of the three real
baselines are in **G263**; `-loop`'s is in a committed probe log and in no register entry at all.

The report's answer to *"did a board refuse on something nobody had seen?"* — **no, and that is a
property of the census rather than a shortfall**, because `generate` stops at the first refusing
block — is right, and the two places where the prediction *did* hold (G284's sheet-name collision,
G282 clause 3's Pultec text problem) are correctly attributed to Tasks 5 and 4 rather than to this
run. That is the honest form of a null result.

### A4. The suite move — CONFIRMED term by term, with a check that could have failed

`SCHGEN_SOURCE=… bun test`, full suite, re-driven here:

```
3851 pass / 0 fail / 43711 expect() calls / 357 files   [148.16s]
```

**Identical to the report. CONFIRMED.** Term by term:

- `tests/document-control-bytes.test.ts` alone: **6 pass / 13 expect() / 1 file.** So
  3851 − 6 = 3845, 43711 − 13 = 43698, 357 − 1 = 356 — the claimed baseline, exactly.
- **No existing test's count moved — CONFIRMED by a drive, not by arithmetic.** The Task 6 commit
  touches exactly three files: the register, the new guard, and
  `tests/stripboard/materialize-net-names.test.ts`. I reconstructed the **pre-repair blob** from
  `391f028`, published it as an untracked test file and ran it: **2 pass / 20 expect()**, identical
  to the same file at HEAD. That is a check that could have failed and did not.
- `tests/schgen/verify.test.ts` is not in the commit, and **no `circuits/` or `lib/` file is
  either**, so the one-expect-per-gate-1-problem total had nothing to shift it. **CONFIRMED.**

`bun run typecheck` (`tsc --noEmit`): **clean, no output, exit 0. CONFIRMED.**

### A5. The disclosed constraint breach — content intact, and I agree with the framing

**G289's content is intact and correctly placed. CONFIRMED.** It sits last in the register at
`docs/known-gaps.md:27536`, in numeric order after **G288**, with a well-formed header, the
six-incident table, and all five required bullets (Found / Evidence / Verified / Why it is open /
What would settle it) with CONFIRMED-versus-RELAYED marked per row and the mechanism half marked as
offered-and-none. The entry introduced **no new dangling `G<n>` reference** (I re-drove G288's
census at HEAD; the set is unchanged). And the file is byte-clean: my scan reports **0** offending
bytes across all 168 tracked `.md` files, so the heredoc did not deposit a control byte of its own
— which would have been the seventh incident, in the entry about the sixth.

**I agree with the assessment, and I would go slightly further.** The `#`-in-heredoc rule exists
because Claude Code's permission gate flags a newline-followed-by-`#` inside a quoted argument;
its purpose is to avoid a disruptive prompt, not to protect content. Here no prompt fired, the
bytes landed correctly, the write was byte-verified rather than read, every other register edit on
the task used `Edit`, and the commit message itself was correctly written to a file and applied
with `git commit -F`. The risk was **procedural**: the breach consumed the rule's safety margin
without consuming its cost. Disclosing it unprompted, in the report and not only in conversation,
is the behaviour the repository asks for, and I would not grade it as a defect. The remediation is
already in hand — the same `git commit -F` discipline applied to the register body, or `Edit`.

---

## SECTION B — THE WHOLE PLAN

### B1. Figure consistency — the plan's weakest axis, and the failures point outward

Method: a whitespace-normalised, blockquote-and-emphasis-stripped sweep over **every tracked `.md`
and `.ts`**, with a two-line window so a phrase broken by this repository's 77-character hard wrap
still matches (false-greens mechanism 20). I never grepped for a paraphrase of a quotation I was
verifying; every quoted span below was located and read in place.

**What is correctly handled, and credit where it is due:**

- **`13 of 13` → `11 of 13`: CONFIRMED clean.** Zero hits for `13 of 13` or
  `thirteen of thirteen` anywhere in the tree. **G284** carries the correction with the original
  standing — *"THE FIGURE IN THIS ENTRY'S FIRST VERSION WAS all thirteen AND IT IS WRONG"* — and
  the re-diagnosis is in it too: not an off-by-one but a **wrong column**, because
  `SchematicAuthoring.project` never names a file. The re-driven figure `11 of 13 collide` is in
  the entry.
- **`0 of 11` → `1 of 11`: CONFIRMED correct inside the register.** `G259`'s scoreboard is a
  history table whose five columns read `0, 0, 0, 1, 1`, which is the right shape — a superseded
  reading kept as a dated column, not a superseded claim left standing.
- **`four-of-six` → `three-of-six` NC perturbations: CONFIRMED handled honestly.** **G285** carries
  `three of the six flip the board straight back`, and the reviewer's own `four of six` is retained
  **with the discriminating reason** — *"The figure differs with the pin set"* — and marked
  **RELAYED**. Two figures that look contradictory and are not, with the resolution beside them.
  That is better than deleting one.
- **`G150`'s two `six` → `five` replacements: CONFIRMED**, both stating *"`six` stood here and is
  replaced rather than annotated"*.
- **`G274` clause 2's closing line: CONFIRMED** replaced, reading
  `FIVE BOARDS REFUSE BEFORE ANY TEXT IS PLACED AT ALL. SIX stood here`.
- **`NET_NAME` / `netNames` deleted then restored: CONFIRMED recorded** in four places — the
  constant's own comment (*"do not delete the rule again"*), `validate.ts`'s comment, `G150`
  clause (2), and `port-manifest.json`'s two `why` fields with the coordinator's reversal quoted
  verbatim.

**THE SAME QUANTITY STATED TWICE WITH DIFFERENT VALUES** — the direct answer to the question:

| quantity | value A | value B |
| --- | --- | --- |
| tracked `.ts` files the source arm covers | **895** — `G277` amendment table, `docs/known-gaps.md:26224`; `G289`, `:27583` | **894** — `G277` amendment Evidence bullet, `:26266`, 42 lines later in the same block; and `tests/document-control-bytes.test.ts:77` |
| in-tree CONTROL cases in the guard | **three** — the `G277` amendment's own table, `:26224`–`:26230` | **two** — `"The two in-tree CONTROL cases are the fourth"`, `:26235`, five lines below its own table |
| `DRAWING_RULES` rule count at HEAD | **eleven** — `tools/schgen/port-manifest.json:739`, and HEAD itself | **ten** — `G150`, `docs/known-gaps.md:13353`, left standing after fix round 1 restored `netNames` |
| boards acting as the no-change control | **five** — the five boards `G150`'s Task-6 block itself enumerates, and the report's *"the five ELK rows are unchanged"* | **four** — `"Four of the eleven boards therefore act as a no-change control"`, `:13448`; and the report's *"Those four boards"* |
| each Pultec board's pre-Task-3 refusals | **20, 14, 14, 14, 28** — `G259:1749`, `G274` clause 2 | **13 to 27** — `G150:13349`, reconcilable only by reading its parenthetical as a decomposition |
| the repaired file's size | **6185 bytes** — `G289`, `:27581`, *"before and after"* | **6925 bytes** — the committed file, and `git diff`'s own `Bin 6185 -> 6925` |
| the NUL's byte offset | **2804** — `G289`, `:27537` | **2811** — the blob, measured here |
| tracked files scanned | **1304** with **26** offenders — three sites | neither pair exists at any commit: 1304→27, 1305→26 |

**AND A SUPERSEDED FIGURE STILL LIVE, WHICH IS THE FINDING OF THIS REVIEW.** Three of them, all
*outside* the register, which is why six task reviews could not see them: `CLAUDE.md:122`,
`docs/known-gaps.md:25656` (G274's live status bullet) and
`tools/schgen/text-metrics/corpus.ts:10`. Findings 1–3 below.

Two of the three carry not just a stale **count** but a stale **cause** — *"on net names"*,
*"on lower-case net names"* — naming a rule this plan deleted. A stale count misleads about
progress; a stale cause sends the next agent after a rule that is not there.

### B2. Did any guard get weaker? — NO. CONFIRMED on every axis I could drive

| check | result |
| --- | --- |
| `port-manifest.json` `files[]` | **73 before, 73 after.** No file added, none removed, **no `sha256` changed**. No file left the byte-check. **CONFIRMED** |
| `port-manifest.json` `diverged[]` | **55 before, 55 after. No new entry.** Task 3's divergences were appended to three *existing* entries' `why` and `task` fields (`"Task 8"` → `"Task 8 and Task 3"`), which is the honest form — it costs no new byte-check. **CONFIRMED** |
| new `cuts` | **three**, all in `rewrites[]`: two on `tests/schgen/ir/author.test.ts` (the `NET_NAME` UPPER_SNAKE `describe` block and its import) and one on `tests/schgen/gates/pin-table.test.ts` (`"mechanical net not UPPER_SNAKE"`). **All three are exactly the assertions the deleted rule took with it**, and a declared cut keeps the file byte-checked. **CONFIRMED** — no other assertion loosened |
| the narrowed gate (`pin-table.ts:60`) | **untouched at the line**, still `if (typeof net !== "string" || !NET_NAME.test(net)) throw fail();`. Only the constant's definition moved, in an already-diverged file. **CONFIRMED** |
| the deleted-and-restored rule | `netNames` is in `DRAWING_RULES` at HEAD; the list is **eleven rules before and eleven after**, same members. **CONFIRMED** |
| the empty string still refused | `NET_NAME` went `/^[A-Z0-9][A-Z0-9_]*$/` → `/^[^\x00-\x1f]+$/`. The `+` refuses `""`. **CONFIRMED** |
| a control character refused at **validation** time | `validate.ts:104` applies `NET_NAME` to every net of the IR at gate 1 and `:117`'s `netNameProblem` names the offending code points; `render/sexpr-write.ts:32`'s `str()` draws the **same** line at emit. So the refusal is at validation *and* emit, not only at emit. **CONFIRMED** |

Net effect on strictness: **strictly weaker on letter case and punctuation, which is the owner's
decision, and equal everywhere else.** The empty string and the whole C0 range are refused before
and after, and the refusal moved *earlier* (validation) rather than later. That is the correct
outcome of a deliberate relaxation.

### B3. The three remaining blockers — all three honestly stated. CONFIRMED

- **The four `MP` pins: an owner question, not work. CONFIRMED.** `G282`'s *What would settle it*
  reads *"FOR THE FOUR `MP` PINS this is an OWNER QUESTION, not a measurement"*, names the two
  things only he can answer (which rotary switch is fitted — no MPN is recorded for any Pultec
  selector — and whether the mount lug goes to net `"0"`), marks the mechanism **UNTRIED**, and
  closes with *"Nobody asks him again unprompted."* Nothing answered it: my census shows all four
  boards still refusing on the same pin, so nothing was declared.
- **`SW_MID` pin 12: a model gap with an untried mechanism, not implemented. CONFIRMED.** The
  criterion is stated as measurable; the mechanism (*let the model carry a terminal set distinct
  from the pad landings*) is marked **UNTRIED**. The census still prints
  `part SW_MID: pin 12 (12) is neither on a net nor declared not connected`, so it was not built.
- **The five preamp boards: out of scope, and no text-placement work crept in. CONFIRMED by the
  diff.** Across all 23 commits, **no file under `lib/schgen/render/`, `lib/schgen/elk/`,
  `tools/schgen/text-metrics/`, `tools/schgen/label-freedom/`, nor any `classify` or `placement`
  module is touched.** The only `label-*` additions are under `label-syntax/` — Task 1's
  measurement probe, which is about what KiCad accepts in a label *name*, not about where a label
  is *placed*. The owner's overlap decisions in `G260`/`G265` are untouched.

### B4. The drawing's state — CONFIRMED, and the caveats are in the right places

- **`G285` is not quotable as `1 of 11` without its caveats. CONFIRMED.** The caveat is in the
  **entry header itself** (*"so it is not a drawing anyone has said is good"*), which is the one
  place a `grep "^### G"` reader cannot miss, and the fix-round-1 block carries the five-row table
  (no net labels at all, flow not followable, `C13`/`C14` unresolvable, page 1 blank but for a
  sheet symbol, bottom third of A4 empty). It ends, verbatim:
  *"It is not a candidate for G240 and must not be sent to him as one."* **CONFIRMED** at
  `docs/known-gaps.md:27225`.
- **Both offers are struck with the original wording quoted. CONFIRMED.** `G285`:
  *"It said `1 of 11` is 'the kind of number that gets quoted without its second column' and then,
  with the G259 amendment, offered the sheet as 'an artifact to put in front of him'."*
  `G259`: *"STRUCK HERE IS STRUCK, fix round 1. It read: 'There is now, for the first time, an
  artifact to put in …'"*. Both quote the struck text rather than merely announcing a strike,
  which is what makes the strike auditable.
- **The designator permutation is where a scoreboard reader meets it, and I re-derived it.
  CONFIRMED by a check that could have failed.** I read the `REFMAP.md` of my own census
  generation and compared Reference against Label over all 24 rows: **5 agree** — exactly
  `C1, C2, C3, J1, U1` — and **19 differ**. And the sharp example reproduces: generated `R3` maps
  to board label `R1`, Value **10K**, while the board's own `R3` is **15K** (drawn as `R2`). That
  is `G285`'s sentence, independently re-derived.
  It is recorded in **G259**'s scoreboard as a new row (`generated reference designators agreeing
  with the built board's … 5 of 24`), in **G259**'s Task 6 amendment prose, in **G274**'s Task 6
  board table, and in **G285** three times. A reader of the scoreboard meets it.

### B5. The register's integrity — strong, with one live-status miss

- **`G159`'s deletion: CONFIRMED, and what it took with it is recorded.** Deleted by Task 5
  (`dc140e3`). **G288** exists because of exactly `CLAUDE.md`'s warning, lists the sixteen dangling
  numbers, and fixed the one live pointer it created (`tools/schgen/gate-census.ts` printed
  `singlePinNets (G159)` in tool output; both it and its test moved to **G283**, with the reason at
  both sites). The remaining fifteen are correctly characterised as dated measurement-table cells
  whose rewriting would falsify a dated figure.
- **`G279`'s deletion: CONFIRMED, and it took nothing with it.** Zero `G279` references anywhere in
  `docs/`, `lib/`, `tools/`, `tests/`, `CLAUDE.md` or `AGENTS.md`. Its content was folded into
  `G150` clause (2), which says so in terms: *"Both were closed in round 1 and the entry that held
  them is deleted"*, and then states both closures. That is the right disposal: the content
  survives at the entry that owns the subject.
- **Entry form: CONFIRMED** across G277–G289. Each new entry carries what was found, where, the
  evidence, CONFIRMED-versus-RELAYED marked **per bullet** (not per entry), and CRITERION kept
  distinct from MECHANISM with every mechanism marked **UNTRIED**. `G277`'s clause-10 mechanism was
  **replaced rather than annotated** because it was wrong on the merits, with the replaced text
  quoted — the form `CLAUDE.md` asks for.
- **`G288`'s volatile-total call: I endorse it, and I re-drove the census to say so.** My own
  script (headings versus body references, excluding the `CRITERIA G<n>` namespace):

  | commit | entries | distinct refs | dangling |
  | --- | --- | --- | --- |
  | `4be4815` (parent) | 257 | 208 | **15** |
  | `dc140e3` (where G288 was written) | **262** | **213** | **16** |
  | `118737f` (HEAD) | 263 | 216 | **16** |

  `set(HEAD) − set(parent)` is **`[159]`** and the reverse is empty. All three of G288's published
  figures reproduce **exactly** at the commit that published them, the dangling **set** is
  invariant across all three commits, and the reference total has indeed drifted 213 → 216 since.
  **The call to pin the set and not the total is correct**, and the reason given is the right one:
  any prose that cites an entry moves the total, so a figure that moves whenever anybody writes
  about anything is not a figure to publish and defend. Pinning the set instead makes the invariant
  the load-bearing claim — which is precisely the remedy false-greens mechanism 23 asks for, applied
  by an entry that names itself as an instance of 23.
- **The `G4` false positive: CONFIRMED and correctly diagnosed.** `G4`'s only two occurrences are
  the register's own header warning about the `CRITERIA G<n>` collision. The script counted the
  warning about the trap as an instance of the trap. `G288` says so, and says in terms that *"16
  dangling references is an upper bound containing at least one false positive and at least one
  genuine defect"* (`G113`, which I spot-checked: `:14297` and `:14314` do point a reader at a
  measurement that is not there). Stating a count as an upper bound with one confirmed member of
  each kind is better than publishing a clean number.

The one miss is **G274's live status bullet** — Finding 2 — which is a figure *and* a cause left
standing in the field a reader checks to decide whether an entry still binds.

### B6. The ten refuted claims — spot-checked five, all five correct in form

Each is corrected **in place**, with the original wording quoted and left standing, in nested
blockquotes that make the layering of corrections readable. That is the right pattern and it is
applied consistently.

| claim | correction | my verdict |
| --- | --- | --- |
| `lib/kicad/sexpr-write.ts:32` | plan `:248` names it *"the nonexistent"* path and gives `lib/schgen/render/sexpr-write.ts:31` | **CONFIRMED.** `lib/kicad/sexpr-write.ts` does not exist; `lib/schgen/render/sexpr-write.ts` does, with `str()` at `:31` and the control-character throw at `:32-33`. See Finding 12 for a residue |
| `noConnectEnds.test.ts` | spec `:252`: *"No such file exists."* The local file is `tests/schgen/render/no-connect-ends.test.ts` | **CONFIRMED.** The kebab-case file exists; no camelCase file does |
| `from-network.ts:468` offered as the IR's pin assembly | plan `:121`: *"It does — but it is the wrong code path"*, `:468` is inside `orientationsOfParts` building a `pinNets` map for orientation | **CONFIRMED.** `orientationsOfParts` spans `:458-472` and `:468` is its `pinNets.set(...)` line. The diagnosis — *"a citation that is locally true and structurally irrelevant is worse than a typo, because it reads as evidence"* — is exactly right. See Finding 11 for the irony |
| a README's upstream filename called "stale" | spec `:259`, nested one level deeper: *"It is not stale and it is not a defect"*, with the original sentence quoted and the reason — `lib/schgen/README.md:303` names what Task 7 **ported**, and all four upstream files are camelCase | **CONFIRMED.** I read `README.md:303`: the four names sit inside a sentence about what was ported. The self-assessment — *"a worse error than the first, because it put a false defect claim about a correct document into an approved spec"* — is the correct grading |
| the `net.length === 0` mechanism | plan `:224`, refuted on **both** grounds: `"RAW\rCR"` has non-zero length and Task 1 measured that a CR exports at exit 0 and renames the net; and the line sits in a byte-checked port, so editing it needs two new `diverged[]` entries | **CONFIRMED on both halves.** My `diverged[]` comparison shows 55 → 55 with no new entry and no `sha256` change, which is the measured proof that the better route was taken |

The two I did not spot-check (the adversarial test that proved nothing, and the relayed figure
wrong in both count and cause) I leave **RELAYED**. Across the five I did check, every correction
is substantively right, not merely present — I drove or read the thing each one asserts.

---

## FINDINGS

### Important

**1. `CLAUDE.md:122-125` still tells every agent that no board generates and that six boards refuse
on net names.** The paragraph reads, unchanged in this range:

> `lib/schgen/` exists, draws **35 of this repository's 52 declared ELK blocks**, and **produces a
> schematic for 0 of the 11 boards in `boards/`**: six are refused at `validateCircuit` on net names
> and five at ELK layout on text, power-symbol and junction placement.

Three claims, two superseded and one refuted: it is **1 of 11**; it is **five** at
`validateCircuit`; and **no board refuses on net names at all** — `G150`'s own Task-6 block says
*"not one of the eleven boards mentions a net name, a case, or `UPPER_SNAKE` in what refuses it"*.
`CLAUDE.md` **was edited in this very range** (`f02fc67`, +29 lines for the control-byte rule), so
the opportunity was there; and the paragraph's own precedent is to correct a wrong prediction in
place — it opens by saying so. **CONFIRMED** by reading the file and the diff.
*Failure scenario:* the next agent reads `CLAUDE.md` first, as the file instructs, concludes the
schematic output class delivers nothing and that the blocker is net-name casing, and either re-does
Task 3's deletion or declines schematic work on the grounds that it has never produced an output.

**2. `G274`'s live "Why it is open" bullet still says six boards need their net names.** At
`docs/known-gaps.md:25656`:

> Clauses 2-5 are measurements and are open because nothing is fixed: **six boards need their net
> names and one needs a junction before any text work reaches them**

This is the entry's own top-level status field, placed **after** both of this plan's blockquoted
amendments to it, and it is the field a reader checks to decide whether the entry still binds.
Zero boards need their net names; five need a switch-pin declaration. The same entry's clause-2
closing line **was** corrected (`:25482`, *"FIVE BOARDS REFUSE … SIX stood here"*), so the task
corrected one instance of the figure in `G274` and missed the one that states the entry's current
status. **CONFIRMED.**
*Failure scenario:* an agent picking up the text-placement work reads G274's status, goes looking
for the net-name rule to satisfy, and finds it deleted — then has to re-derive the real blocker
from a census run, which is the work G274 exists to save.

**3. `tools/schgen/text-metrics/corpus.ts:9-11` asserts the deleted rule in a live source comment.**

> **IT TAKES THE STRINGS FROM `buildCircuit`, WHICH IS UPSTREAM OF THE GATE THAT REFUSES SIX OF THE
> ELEVEN BOARDS** … `generate` runs `validateCircuit` after `buildCircuit`, and **six boards refuse
> there on lower-case net names**

Both the count and the cause are gone. Worse than a stale figure: the next sentence uses this
premise to explain what `StringRow.reachesTheDrawing` means, so the comment mis-describes the
module's own field. The code is fine — `reachesTheDrawing` is computed by calling
`validateCircuit`, so it tracks reality — but the prose tells a reader the wrong thing about what
the computation means. **CONFIRMED** by reading the file. `CLAUDE.md`'s *"supersede means delete"*
applies to a comment as much as to a pattern.
*Failure scenario:* an agent re-running the text-metrics corpus for the glyph-set work concludes
that the strings excluded from the drawing are excluded for casing, and either widens the alphabet
on a false premise or treats the exclusion as already fixed.

**4. `G150`'s Task-6 control cites an amendment that cannot support three of its four comparisons.**
The block claims the four preamp coordinate strings are *"character for character what **G259**'s
Task 24 amendment recorded on 2026-10-21"*, and its Evidence bullet reads
*"`[READ]` **G259**'s Task 24 amendment for the 2026-10-21 coordinates compared against."*
That amendment records coordinates for **`transistor-preamp-lab` only**; the other four boards
appear in it as *"no declaration"*, because the nine declarations landed later the same day. The
real baselines are **G263** (`:2551` for buffered/staged, `:2585` for feedback) and
`tools/schgen/label-freedom/probe-run.log:399` (for loop — the only pre-plan record of
`BUFFER_BASE at (29.21, 17.78)` anywhere in the repository). **I re-drove the comparison and all
four strings reproduce exactly**, so the control holds; its stated evidence does not.
This is false-greens mechanism **27** — a check credited, in the register, with reach it does not
have — and mechanism **22**'s cousin: the citation was written from where the writer expected the
figures to be, not from where they are.
*Failure scenario:* a later agent re-checking the no-change control opens the cited amendment,
finds four of the five boards marked "no declaration" and no coordinates at all, and concludes the
control was never driven — discarding a result that is in fact sound.

**5. `G289`'s byte offset is wrong by 7 and its geometry claim is inverted, both in the entry
header.** Measured here against the parent blob:

- the NUL is at byte **2811**, not 2804. The entry's own guard reports offsets in the form
  `<path> byte <offset>`, so the two are directly comparable. **2804 is the offset of the `.` in
  `.join`** — the start of the call, not the byte. This is not a unit confusion: I decoded the
  2811-byte prefix and it contains **zero** non-ASCII characters, so byte, codepoint and UTF-16
  offsets are all 2811.
- *"`pinSetKey` is … defined in that file, at line 48, three lines below the byte"* is
  self-contradictory and wrong in direction: `function pinSetKey` was at line **48** and the NUL at
  line **49**, so the identifier was **one line above** the byte. The sentence is true of the
  *repaired* file — `NUL` at line 58, `pinSetKey` at 61 — and false of the historical one it
  describes.

The inverted sentence appears in **four** places: `G289`'s header, `G289`'s body,
`tests/document-control-bytes.test.ts:74-75`, and `tests/stripboard/materialize-net-names.test.ts:52`.
**CONFIRMED** at all four. The finding itself is entirely sound; what is wrong is the "where".
*Failure scenario:* a reader re-driving the entry against `391f028`'s blob gets 2811 and an
identifier above the byte, cannot reconcile either with the entry, and has to decide whether the
entry describes this incident or a different one — in a register whose whole value is that a later
reader can re-derive what it says.

### Minor

**6. The pair (26 offenders, 1304 tracked) is true of no commit, and the attribution names one.**
At the parent `391f028`: 1304 tracked, **27** offenders, 894 `.ts` of which **one is dirty**. At
`118737f`: **1305** tracked, 26 offenders, **895** `.ts` all clean. The published pair is a true
measurement of an **uncommitted intermediate tree** — repair applied, guard file written but not
yet `git add`ed — which is a legitimate thing to measure but not what
`tests/document-control-bytes.test.ts:77` says: *"a byte count over every tracked file **at the
commit that fixed it**: all 894 `.ts` …"*. False-greens mechanism **23** in the file written to
guard the class, and mechanism **25** (a figure published without the configuration it was taken
under — here, *which tree*). The honest form costs four words: *at the working tree before this
file was added*.

**7. `G277`'s amendment contradicts its own table five lines later** — *"The two in-tree CONTROL
cases are the fourth"* against a table listing three CONTROL rows, and a guard that has three. The
report says three.

**8. *"the file is 6185 bytes before and after"* (`G289`)** — the committed file is **6925** bytes,
and `git diff`'s own header says `Bin 6185 -> 6925`. The claim is true of the byte-replacement step
in isolation and false of the change that published it. One clause fixes it: *the separator is one
byte before and after; the comment that explains it adds 740.*

**9. Four versus five boards in the no-change control.** `G150`'s Task-6 block concludes
*"Four of the eleven boards therefore act as a no-change control"* immediately after enumerating
**five** (`-lab`, `-buffered`, `-staged`, `-feedback`, `-loop`). Four is the number of **distinct
refusal strings** — `-buffered` and `-staged` share one — and five is the number of boards. The
report has the same slip in one paragraph: *"The five ELK rows are unchanged … Those four boards
are therefore a no-change control."*

**10. `G150` still says `DRAWING_RULES` is ten rules.** At `:13353`, inside the Task-3 block:
*"`netNames` rule is **deleted** and `DRAWING_RULES` is ten rules"*. Fix round 1 restored the rule
and HEAD has **eleven**, which `port-manifest.json:739` states correctly. `G150`'s later bullet
does record the restore, so the correction exists — but the figure in the earlier block was not
replaced, and the register's convention elsewhere on this plan was to replace a superseded figure
in place and say so.

**11. The plan's correction of a wrong citation now carries a wrong citation.** The Task-2
correction block (plan `:121`) says *"The IR's `null` comes from `connectedNet` at
`lib/schgen/ir/types.ts:62`"*. That was true when written (`1c0ade7`); **Task 3 of the same plan**
grew the `NET_NAME` doc comment and moved `connectedNet` to `:113`, and HEAD has it at `:120`. At
HEAD, `ir/types.ts:62` is a line of prose about the owner's *"silly quibble"*. Measured across the
range: `2758137` → 62, `1c0ade7` → 62, `257817e` → **113**, `118737f` → **120**. The block whose
lesson is *"a citation that is locally true and structurally irrelevant is worse than a typo"* is
now a citation that is neither locally true nor structurally relevant, invalidated by the next task
of the plan that wrote it.

**12. A path named as nonexistent in one correction block is used as live evidence in another, 12
lines earlier in the same file.** Plan `:248` calls `lib/kicad/sexpr-write.ts:32` *"the nonexistent"*
path; plan `:260`, inside a different (earlier, dated) correction block, reads *"Today the only
thing stopping it is `str()` at `lib/kicad/sexpr-write.ts:32`"*, unflagged. The *"the wording
stands"* convention is right, but a reader meeting the earlier block first gets a nonexistent path
with nothing beside it.

**13. Two ranges for the same before-figure.** `G150:13349` gives each Pultec board's pre-Task-3
refusals as **13 to 27**; `G259:1749` and `G274` clause 2 give **20, 14, 14, 14, 28**. They differ
by one because G150's range counts net-name violations and the parenthetical *"(net names + 1
undeclared pin)"* has to be read as a decomposition rather than a label. Reconcilable, but only by
a reader who notices that the parenthetical changes the unit (mechanism **25**).

**14. The 1 883 942-byte register copy cannot be re-taken.** `G277`'s amendment reports a red drive
against *"a **1 883 942-byte copy of the real register**"*, red at `byte 1883940`. The register is
**1 912 084** bytes at HEAD — it grew by 28 142 bytes during Task 6's own amendments — so the
figure describes a snapshot that no longer exists. The drive's *purpose* (would it have caught
incident 1, against the register's real bytes?) is sound and I re-drove it at today's size: red at
`byte 1912084`. Mechanism **23** again, in the mildest form.

**15. "13 `.vrt` perfboard layouts"** — eleven are board layouts under `boards/`; two are
`tests/fixtures/pultec-low-boost-c19-floated.vrt` and
`tests/fixtures/stripboard/pultec-low-boost-frozen.vrt`. The argument (a repo-wide scan is red on
the one working output class) is unaffected.

### Not findings, recorded because I looked

- `docs/schematic/README.md`'s *"the sixteen distinct mechanisms"* against `false-greens.md`'s 29 is
  a live superseded figure, but it is **outside this range** and `false-greens.md:109-121` already
  records it with a criterion for settling it. Not this plan's.
- `docs/schematic/text-handling-research.md:5705` and `docs/schematic/text-handling-report.md:228`
  still say *"six boards"*. Both are closed research documents, and `G273` records in terms that
  that document *"is read and never rewritten, so nothing inside it will ever say so."* Pre-existing
  class, correctly already recorded, not this plan's to fix.
- `lib/kicad/schematic.ts:8` and `README.md:37` say `generate` draws none of *those five* boards —
  the preamp five, still true.
- `tools/schgen/label-syntax/probe.ts:436` freezes the **old** regex in the probe's own file so its
  figures stay re-derivable, and says so. That is the right handling of a figure whose subject the
  plan changed, and the opposite of the mistakes in Findings 1–3.

---

## Verification state at the end of this review

| | result |
| --- | --- |
| suite | **3851 pass / 0 fail / 43711 `expect()` / 357 files**, `SCHGEN_SOURCE` set. CONFIRMED |
| `bun run typecheck` | **clean**, `tsc --noEmit`, no output, exit 0. CONFIRMED |
| census | **1 of 11 boards produce a schematic; 10 refused; 0 have no authoring declaration; 8 fallbacks across 1 board.** Every row matches the report. CONFIRMED |
| guard, driven red | **four ways by me**, plus three weakenings proving the three CONTROL arms discriminate. CONFIRMED |
| `git status --porcelain` | **empty** |
| SHA-256 restoration | `tests/document-control-bytes.test.ts`, `tests/stripboard/materialize-net-names.test.ts` and `docs/known-gaps.md` all **OK** against hashes taken before any perturbation |

Nothing under version control was modified. Every perturbation was an untracked file, created and
deleted; the one tracked-file comparison (the pre-repair blob) was reconstructed with `git show`
into a new untracked path and removed. `git checkout HEAD --` was never used. All control bytes in
this review were built in code with `String.fromCharCode`; none was typed into a tool parameter.
Artifacts are in the session scratchpad.
