Final whole-branch review: `feature/schematics-tooling`, `fdbc51a..5149f56`
===========================================================================

**Reviewer:** a final-review agent, 2026-10-31. **Range:** 35 commits, 446 files,
+6,546 / −69,375 — re-measured here with `git diff --shortstat fdbc51a..HEAD` and
`git log --oneline fdbc51a..HEAD | wc -l`, both matching the brief exactly. Working
tree empty (`git status --porcelain` silent).

**This review states for every check whether it was RAN or REASONED.** Nothing
below that carries a number was taken from a report; every figure in this file was
produced by a command in this session unless the line says `[REASONED]` or names
the task report it is relayed from.

**Governance read first**, as instructed: `CLAUDE.md` at `HEAD` (not the stale copy
the harness injected — see Observation O1) and `EVALUATING-DRAWINGS.md` in full.
**No drawing is judged here.** The words this project forbids about a drawing it
produced do not appear in this file about any drawing. Where a page's state is
named it is `approved`, `awaiting re-approval` or `unreviewed`, read off
`docs/schematic/verdicts.md` and the five `RECORD.md`, which are the authority.
Nothing in this file edits either.

---

## Verdict

**FINISHABLE WITH NAMED FIXES.** Every gate passes at the figures the plan
reported, the four guards are rebuilt with teeth, the protected artifacts are
untouched and byte-verified, and the net capability test comes out in the plan's
favour. What is left is one inert control, one stale cause inside a live refusal
message, and a cluster of now-false approval claims in code the plan itself added
— all of them text or test-only, none of them behavioural, and all of them in the
two classes the brief predicted the plan would still be carrying.

---

## Gates — RAN, all of them

| gate | command | result |
| --- | --- | --- |
| typecheck | `bun run typecheck` | **exit 0**, no diagnostics. **RAN** |
| suite | `bun test` (run alone, nothing concurrent) | **2714 pass / 0 fail, 38526 `expect()` calls, 258 files, 122.31 s**. Matches the reported 2714/0/258 exactly. No segfault. **RAN** |
| board checks | `make check` (run alone, full log captured) | **4 FAIL / 7 ok**, exit 2. FAIL: `pt2399-core`, `transistor-preamp-lab`, `transistor-preamp-loop`, `transistor-preamp-staged`. ok: the five Pultec boards, `transistor-preamp-buffered`, `transistor-preamp-feedback`. **RAN** |
| failure causes | `grep "NOT HELD"` over that log | `pt2399-core` HC8 (`CUT_STATE UNRESOLVED`) + HC10 (no verdict for `C3`); `-lab` HC8 (15 opens); `-loop` HC8 (15 opens, same shape); `-staged` HC5 (`C8` spans 14 vs max 11). **Four boards, buildability causes only; not one failure names a schematic.** **RAN** |
| schgen gone from the run | `grep -ci schgen` over the `make check` log | **0**. The five-times-a-run generator invocation the spec recorded is gone. **RAN** |
| protected artifacts | `git diff fdbc51a..HEAD -- drafted/ docs/schematic/verdicts.md` | **empty**. **RAN** |
| baselines registry | `git diff --stat fdbc51a..HEAD -- schematic/readability-baselines.json` | **empty**. **RAN** |
| sheet digests | `shasum -a 256` on each `drafted/pultec/*/…kicad_sch` vs the `THE BINDING` row of its `RECORD.md` | **5 of 5 MATCH**: `a1fa4159…`, `e9843e6d…`, `b9e42e6a…`, `5e1a4139…`, `d4b0b8cc…`. **Positive control RAN**: one byte appended to a copy of the mid sheet gives `ffa00c09…`, so the comparison could have failed. **RAN** |
| control bytes | Python scan over all 78 added/modified/renamed paths for any byte in `{0–8, 11, 12, 14–31}`, the set built in code and never typed | **0 hits across 78 files, 0 missing paths.** **Positive control RAN**: a canary written with `bytes([0])` is detected. (A first attempt with BSD `grep -P` returned "0 hits" over **0 files** because macOS grep has no `-P` — a check that could not have failed, caught only because the canary was in the same script. Recorded because it is this repository's own named failure mode, met in the act of checking for it.) **RAN** |
| build files | `grep -rn schgen Makefile make/ package.json` | no live reference; `.gitignore:10-11` mentions it only in a comment saying it is deleted. **RAN** |

**No gate was reasoned about. All ten were executed.**

---

## 1. NET CAPABILITY — what can this repository no longer check?

**Method, RAN:** grouped all 368 deletions from `final-names.txt` by directory;
extracted the 32 deletions outside the three generator trees and read each one's
pre-image with `git show fdbc51a:<path>`; resolved importers of every deleted
non-generator module with **fixed-string** `git grep -lF` at `fdbc51a` (a regex
grep for `repo.ts` matched `reports` and produced a 180-file false positive —
discarded); and swept the deleted `tests/schgen/` tree for references to surviving
subjects (`drafted/`, `boards/`, `circuits/`, non-generator `lib/`).

**The plan's claim holds, and I could not break it.** Every deletion I sampled is
either generator machinery, or a check whose subject went with the generator, or a
check with a named and verified successor:

| deleted check | subject | where it is now |
| --- | --- | --- |
| `tests/schgen/rules/symbols.test.ts` (resolve every whitelist lib id) | `SYMBOL_BY_KIND` | `tests/kicad/sheet-agreement-tables.test.ts`, **strengthened**: all four kinds now resolved with their pin lists in the expectation; three of the four had no test of any kind before. **Verified by reading both.** |
| `tests/schgen/ir/mechanical-pins.test.ts` (resolve every key; `endpointsAt` geometry) | `MECHANICAL_PINS` | same file. **Task 1 deferred the dropped `endpointsAt` arm and Task 9 restored it** as `installedSymbolStrokeEndpoints(libId, number) === 0`, with the 0/1 contrast on `SW_Rotary_1x6_MP`'s seven electrical pins beside it. **That flagged minor is CLOSED.** |
| `tests/schgen/symbol-census.test.ts` ("every symbol a parity circuit names resolves") | symbol literals + `VENDORED_SYMBOLS` | `tests/kicad/symbol-names.test.ts`, nine arms including the derived arm over all five Pultec boards and the vendored byte-identity arm ported from `stock-symbols.test.ts` with two controls. **Wider than what it replaced.** |
| `tests/circuits/kicad-round-trip.ts` + the five stub tests | stub output | `tests/circuits/committed-schematic.ts` → the five committed `transistor-preamp` `.kicad_sch`; `tests/circuits/drafted-kicad-round-trip.test.ts` → the five `drafted/` sheets. **Ten boards keep a live `kicad-cli` proof where five had one.** `expectSameCircuit` is reproduced logic-identical; the only field dropped from `BoardUnderTest` is `notes`, which `expectSameCircuit` never read and only `writeSchematicStub` needed. **Verified assertion-for-assertion against `git show fdbc51a:tests/circuits/kicad-round-trip.ts`.** |
| `tests/kicad/footprint-names.test.ts`'s fixture-library arm, `FIXTURE_FOOTPRINT_LIBRARY` | four `Pkg:*` fixture ids | **deleted with their only declaration sites**, and the skip-arm removed from the sweep too. Strictly stricter: every swept lib id now resolves or is accounted for by `NOT_A_KICAD_FOOTPRINT` / `CONSTRUCTED_FOR_A_REFUSAL` / `SYNTHETIC:`. **Verified by reading the diff.** |
| `tests/kicad/install.test.ts`'s two-resolver agreement arm | the duplicate `stockSymbolDir()` | **no subject**: `defaultSymbolDir` is now the only implementation. Superseded, with a comment where it stood. |
| `tools/guide/schematic-source.ts`'s generate-a-missing-page path, and `GuideSchematic`'s `"generated"` / `"withheld"` kinds | a board declaring no `"sch"` | **deleted rather than left live-but-unreachable** — `tools/guide/guide.ts:36-44` says so. All eleven boards declare an `"sch"`. **Supersede-means-delete honoured; verified by reading the surviving union.** |
| `lib/kicad/footprint.ts`, `lib/kicad/libtable.ts`, `tools/repo.ts` | — | **zero non-generator importers at `fdbc51a`** (fixed-string grep). Footprint-on-disk resolution survives in `tests/kicad/footprint-library.ts` and is exercised on every run. |

**Three things the deletion did lose, none of them a surviving subject, all three
worth naming:**

1. **`tests/schgen/board-declarations.test.ts`'s sweep of `boards/`** — "every board
   has a declaration", pinned at eleven. The declarations are deleted, so the
   assertion has no subject; the board **count** survives at
   `tests/guide/guide.test.ts:69` (`expect(rows.length).toBe(11)`). **RAN** the grep
   for a surviving count.
2. **`tests/schgen/watermark.test.ts`** — the unratified-drawing watermark, the
   owner's *"critical safety signal to NOT USE the drawing at the bench"* (G303).
   **That directive now has no implementation anywhere in the repository.** Its
   producer was the generator, so this is not a net loss *caused* by the plan — the
   `drafted/` pages carried no such mark before `fdbc51a` either. But the directive
   outlived the only code that ever honoured it, and four of the five pages the
   build guides print are awaiting re-approval. Nobody has written this down.
   **Observation, not a defect of this branch.**
3. **`tools/draught/gate.ts`** — the findings document already records this as a
   widened gap rather than a resolution. Confirmed: nothing replaced it.

**So: no finding in the direction the brief expected.** I looked for a deleted
check with a surviving unprotected subject and did not find one. The one candidate
with real force — item 2 above — turns out to predate the branch.

---

## 2. THE RECURRING DEFECT — did the porting remedy hold?

**Method, RAN:** for four relocations I opened the pre-image with
`git show fdbc51a:<path>`, enumerated its assertions by hand, and accounted for
each one.

**`circuits/pultec/designators.ts` ← `circuits/pultec/schematic/section-board.ts`.**
Function body, `DESIGNATOR` regex, map contents and throw message are
character-identical except one path string. `designatorsFor` (the whole-network map
builder) is **dropped with a reason**: it existed to fill
`SchematicAuthoring.designators`, and `tests/circuits/sheet-model.ts:428` now
applies `pultecDesignator` itself. **Accounted for. One stale cause survives — see
Finding I1.**

**`tests/circuits/pultec-switch-geometry.test.ts` ← `tests/schgen/nc-pins.test.ts`'s
"the selector symbols" block.** Four original arms, all four accounted for:
13-pin/passive/name-equals-number **moved**; pin-12-is-a-throw **moved and
strengthened** (gains a stroke-endpoint measurement the original "could only argue
around", and `toBeCloseTo(…, 10)` with the float reason stated); pole-at-angle-0
**dropped then restored**, generalised over the whole `POLE_PIN` table with a swap
control that the original lacked; the exact-pin-set arm **moved with one
weakening** — see Finding M2. The file's own header discloses the drop and the
restoration in its own words. **The remedy held, visibly.**

**`tools/guide/occupancy.ts` ← `lib/schgen/render/occupancy.ts`.** 82% rename,
comment-only diff; `createOccupancy`/`leastCovered`/`MARK_WEIGHT` unchanged.
`tests/guide/occupancy.test.ts` is the original "the weighted overlap cost" block
**verbatim** — I diffed it against
`git show fdbc51a:tests/schgen/render/field-fallback.test.ts`'s block and it is
identical, and that block was the whole of it (one `it`). `leastCovered` has four
live consumers under `tools/guide/` and is covered by the guide suite. **Accounted
for, nothing dropped.**

**`tools/text-metrics/verify-pastes.ts` + `tests/text-metrics/document-pastes.test.ts`.**
88% / 94% renames; diff is path strings, the usage message, and added commentary.
All four logs moved to `docs/schematic/text-handling-research-logs/`. The §6
paragraph that claimed the probe could be re-driven is **rewritten into past
tense** with the loss stated. This pair was deleted and restored inside Task 9 and
the file says so at its own head. **Accounted for, and the restoration is the
single most valuable catch on the branch.**

**`lib/kicad/sheet-agreement.ts`** is a rebuild rather than a port, so there is no
pre-image to diff; its equivalence to `lib/schgen/gates/round-trip.ts` was measured
by a test that no longer exists (see Observation O4). Its refusal messages all
carry the "why it is not defaulted" clause `CLAUDE.md` requires, and I checked
each: `intendedSymbol`, `resolvePins`'s two throws, `designatorOf`, `pinNumbersOf`.
**Verified by reading all 471 lines.**

---

## 3. CONTROLS THAT CANNOT FAIL

**Method, RAN:** scripted sweep over every added/modified `.ts` under
`tests/`, `tools/`, `lib/` for `.not.to*`, `toBeGreaterThan(0)`, `toBeTruthy`,
`toBeDefined()`; then read each hit in context. 60 hits, 58 of them real.

**Two inert ones, both named below as findings I2 and M3.** Everything else in the
sweep is a control with teeth, and several are unusually strong: `withOnePinMoved`
refuses rather than passing when a board has fewer than two multi-pin nets;
`document-pastes.test.ts` guards every perturbation with
`expect(perturbed).not.toBe(victim)` so a no-op sabotage fails; the
`sheet-agreement-tables.test.ts` staleness control asserts the **message**
(`"the model connects [SW1.MP] and the schematic does not"`) rather than the mere
presence of a problem, which is exactly the distinction the brief asked after.

I also checked the perturbation-lands question for the two highest-value controls.
**`withOnePinMoved`** moves a member between the two largest multi-pin nets, so the
perturbation lands on the object `netMembership` counts (a net partition) — RAN: it
fires on all ten boards, since `bun test` is green with those ten `not.toEqual([])`
assertions live. **The swap control in `pultec-switch-geometry.test.ts`** folds the
real pole into the throws and promotes throw 1, which leaves the union `{1..13}`
unchanged — so it perturbs the pole/throw *assignment*, which is the object the
angle-and-side check reads, and not the set the exact-set check reads. Correct by
construction, and the comment says so.

---

## 4. THE DEFERRED MINORS AS A SET

**Method, RAN:** read all ~25 deferred-minor lines out of
`.superpowers/sdd/2026-10-30-remove-schgen/progress.md` together, then checked each
against `HEAD` rather than against its own ruling.

**Two of the flagged ones are already closed at `HEAD`:** Task 1's dropped
`endpointsAt` (restored in Task 9, verified above), and the Task 4/5 minors about
`section-board.ts` and `kicad-round-trip.ts` drift (both files deleted).

**One composition is real and it is the answer to this question.**
**`tests/circuits/sheet-model.ts` carries three of the ~25**, and together they are
worse than any of them alone:

- the header's figure says the committed exports carry `SI1`..`SI6` (line 38);
- `DECLARED_PIN_NUMBERS`'s top-level **board** key is validated by nothing
  (`checkDeclaredPinNumbers` checks only the component half, lines 398-411);
- that key is read by bare bracket index where `lib/kicad/sheet-agreement.ts` uses
  `Object.hasOwn` and explains why.

Composed: **the one hand-declared exception in the rebuilt guard — the `R2` a/b swap
that makes `pultec-low-boost` agree with its page — hangs off an unvalidated key
read by an unguarded index, inside a file whose header figure about those very
exports is wrong on four boards of five.** I measured the figure: **RAN**
`grep -o 'SI[0-9]*' tests/fixtures/pultec-*.net | sort -u -V | tail -1` per file →
`SI8`, `SI6`, `SI8`, `SI9`, `SI9`. True of `pultec-hi-cut` alone. That is exactly
the class `CLAUDE.md` names — *"a figure in prose is a transcription with a date on
it"* — in a file added by this plan.

The failure mode is loud rather than silent (a typo'd board key makes the entry
inert and `pultec-low-boost`'s `netMembership` guard then fails with a message about
the wrong thing), which is why this is Minor and not Important. But it is the one
place on this branch where three deferred minors sit in one guard, and **the board
key is three lines to close**, as its own ledger entry says.

**No other composition found.** The remaining minors are isolated: `SheetAgreement`'s
mutable `string[]` fields (a caller can `push` into a problem list — mild, and the
`toEqual` consumer that cared is gone), the double library cache in
`symbol-library-disk.ts`, the Task 3 report's imprecise "verbatim except two"
claim, the equivalence test's partial non-vacuity floor (moot — the test is
deleted and the per-board guards assert both lists exactly).

**Should any be fixed before the branch is finished?** **One:** the
`DECLARED_PIN_NUMBERS` board key, because it is three lines, it is in the guard the
whole plan was ordered around, and the ledger already flagged it for this review.
The `SI1..SI6` figure should be deleted rather than corrected, per this
repository's own rule about figures in prose. Everything else: no.

---

## 5. THE VERBATIM-MOVE SELF-REFERENCE — the fifth instance, and the cluster

**Method, RAN:** scripted sweep over all 78 added/modified/renamed text files for
every `./…` or `../…` relative path mention, resolving each against the file's own
directory. 32 unresolvable mentions found; each read in context. Then a
fixed-string sweep of the whole surviving tree for the names of every deleted file
the plan touched.

**Most of the 32 are legitimate** — a reference explicitly labelled "deleted",
"dies with the writer", "existed only while both did". `CLAUDE.md` is explicit that
a dangling reference is inert. Three classes are not legitimate:

**(a) The `kicad-round-trip.ts` precedent cluster — 10 sites in 9 files.** The
deleted `tests/circuits/kicad-round-trip.ts` is cited in the **present tense as a
live precedent** by:

```
tests/kicad/sheet-agreement-tables.test.ts:20   "for the reason tests/circuits/kicad-round-trip.ts gives"   ← ADDED by this plan
tests/kicad/symbol-library-disk.ts:18            "...both give"                                             ← MODIFIED by this plan
tests/guide/print-pdf.test.ts:10, :26            "the precedent of..."                                       ← MODIFIED by this plan
tests/guide/print-pdf.test.ts:155                "(tests/circuits/stub-writer-tripwire.test.ts)"             ← also deleted
tests/guide/merge-pdf.test.ts:16                 "precedent ... and ..."
tests/guide/single-document.test.ts:22           "the precedent ... set"
tests/stripboard/extent-fixtures.ts:17
tests/kicad/footprint-library.ts:7               "for the reason ... gives for kicad-cli"
tests/kicad/pin-pattern.test.ts:88
```

**The sharpest is the first: a file this plan ADDED cites, as the source of its
refuse-don't-skip reasoning, a file the same plan deletes.** That is the fifth
instance of the class, and it is the one the brief predicted. The *reason* survives
(a skipped check must never look like a passing one); the file that gave it does
not, so a reader following the citation finds nothing. Per `CLAUDE.md` this is a
**stale cause**, not an inert dangling path: *"a stale cause sends the next agent
after a rule that is not there."* The findings document covers doc-to-**test**
pointers in prose documents; it does not cover code comments citing deleted test
files, and nobody has swept for them.

**(b) `circuits/pultec/designators.ts` — the IR citation. See Finding I1.**

**(c) The two known live instances, both confirmed at `HEAD`:**
`circuits/pultec/physical/parts.ts:298` says *"its previous home,
`../schematic/section-board.ts`, is deleted"* (correct and deliberate), but the
`POLE_PIN` comment at :247 still says *"which is why `../physical/parts.ts` keeps
eleven throws"* while living **in** that file; and
`tests/circuits/drafted-kicad-round-trip.test.ts:37` still says *"The five boards
with an approved page"*. Both already known.

**Nothing else in the class.** The sweep over 78 files found no other relative path
in a comment that stopped resolving from its new home.

---

## 6. FACTS THAT ARE NO LONGER TRUE

**The premise verified first, by measurement, not by trusting the brief.** **RAN:**
extracted every `sha256` from `docs/schematic/verdicts.md` and compared against the
five sheets on disk. The verdict digests are `42cdca00`, `54900d50`, `65914fd9`,
`3c2f302b`, `240c61df`, `7ccf557c`, `1f8de321` and `e9843e6d`. **Exactly one —
`e9843e6d…`, `pultec-hi-cut` on US Letter, centred — equals a sheet's present
bytes.** Each of the other four `RECORD.md` files narrates its own re-paper and
re-draw. `EVALUATING-DRAWINGS.md` §5 binds a verdict to the artifact reviewed.
**So: one page of five carries a verdict bound to the bytes present; four are
awaiting re-approval. Confirmed independently.**

**Every claim of an approval count or status in the surviving tree, swept and
reported.** **RAN:** `grep -rn "five approved\|approved page\|approved sheet\|approved Pultec" lib tools tests circuits schematic`.
**18 sites in live code, 15 of them now false or misleading, and 12 of those are in
files this plan ADDED:**

| file:line | claim |
| --- | --- |
| `lib/kicad/sheet-agreement.ts:7` | "the five approved pages under `drafted/pultec/`" |
| `lib/kicad/sheet-agreement.ts:11` | "on all five approved pages before the switch" |
| `lib/kicad/sheet-agreement.ts:51` | "all five pages" (count only — true) |
| `tests/circuits/sheet-model.ts:9` | "the approved page" |
| `tests/circuits/sheet-model.ts:14` | "across all five approved pages" |
| `tests/circuits/sheet-model.ts:59` | "the KiCad reference the approved page carries" |
| `tests/circuits/sheet-model.ts:65` | "One board whose `"sch"` is an approved page" |
| `tests/circuits/sheet-model.ts:110` | **inside a refusal message**: "…approved page under drafted/pultec/ are […]" |
| `tests/circuits/sheet-model.ts:130` | **inside a refusal message**: "comparing the approved page against a circuit it was not drawn…" |
| `tests/circuits/sheet-model.ts:141` | "the four kinds the five approved pages carry" |
| `tests/circuits/sheet-model.ts:328` | **inside a refusal message**: "kinds the five approved Pultec pages carry" |
| `tests/circuits/sheet-model.ts:417` | "every component … carries on its approved page" |
| `tests/circuits/drafted-kicad-round-trip.test.ts:1-2` | "THE ONLY PROOF THAT KICAD READS AN **APPROVED** `drafted/` PAGE…" |
| `tests/circuits/drafted-kicad-round-trip.test.ts:10` | "the approved pages under `drafted/pultec/`" |
| `tests/circuits/drafted-kicad-round-trip.test.ts:37` | "The five boards with an approved page" |
| `tests/circuits/drafted-sheet.ts:20` | "on all five approved pages" |
| `tests/circuits/committed-schematic.ts:6` | "not a `drafted/` approved page" (correct — it is distinguishing) |
| `tools/guide/merge-pdf.ts:137` | **inside a refusal message**: "an approved sheet's export" |

**The irony is the finding.** `docs/research/2026-10-30-schgen-removed.md:352-355`
says, in terms: *"**Do not quote "five approved pages" from this document**, and do
not derive the count from `drafted/` either."* The findings document got this right.
**The code the same plan wrote says it eighteen times, four of them inside refusal
messages a person will read at a failure.** That is the whole of Finding I3.

**And a second class of no-longer-true fact, which nobody has written down and
which predates the branch.** **RAN:** `grep -m1 -o '(paper "[^"]*")'` on each of
the five sheets → **all five declare `USLetter`**. The re-paper landed at `3ae58e9`,
before `fdbc51a`. But `tools/guide/schematic-notice.ts:132-133` — **live production
code, in a file this plan modified** — still reads:

> *"Four of the five Pultec sheets declare A4 and the fifth declares A3, so **every
> packet today carries one page that is not US Letter**."*

Both halves are false and the conclusion is inverted. `tests/guide/packet.test.ts:128`
repeats the first half; `tests/guide/paper.test.ts:18-21` says "measured on all four
A4 Pultec sheets" / "measured on pultec-mid" (a dated historical measurement, so
less misleading). The notice function itself is correct — it compares actual page
sizes — so **no check is wrong; the stated cause for the check's existence is.**
Verified pre-existing with `git show fdbc51a:tools/guide/schematic-notice.ts`.

---

## 7. WHAT THE BRANCH LEAVES OPEN

**`docs/research/2026-10-30-schgen-removed.md` §5 and §6 already carry almost all of
this, accurately, and I verified each item rather than relaying it:**

| item | verified |
| --- | --- |
| `schematic/readability-baselines.json` has no loader, `"baselines": []`, one commit in its history | **RAN**: `"baselines": []` read off the file; range diff over it empty; `grep` finds no loader anywhere |
| its `notes` block still describes that loader in the present tense | **RAN**: four present-tense "the loader refuses…" sentences read off the file |
| `elkjs` 0.9.3 declared with nothing importing it | **RAN**: `package.json:23`, `bun.lock:9`; `grep -rn elkjs lib tools tests circuits` → **no hits** |
| `make check` baseline of four FAIL / seven ok | **RAN**, above |
| nothing guards a doc-to-test pointer any more | **REASONED** from the findings document plus the absence of `tests/schgen/pointers.test.ts`; not independently re-derived |
| `tools/draught/gate.ts` gone with nothing in its place | **RAN**: no replacement found |
| the four text-handling probes deleted, their logs kept | **RAN**: four logs present under `docs/schematic/text-handling-research-logs/`, `bun test` green over the 44 cases that read them |

**Judgement asked for: is leaving `readability-baselines.json` untouched still the
right call?** **Yes, and for three independent reasons that all point the same way.**
(i) `CLAUDE.md`'s invariant — an agent may never author the acceptance criteria for
the artifact it is producing — and this file is a registry of the owner's recorded
judgements about a drawing, which is exactly such a criterion. (ii) The plan's own
standing gate is that a diff over the file is empty, and an agent that edits a file
to make its prose true has defeated a gate rather than satisfied it. (iii) The
correction exists and is findable beside the file, in `schematic/README.md`, which
says plainly that there is no loader and that the question is the owner's. **The
only thing I would change is discoverability**, below.

**Added to the open list — things I found that nobody has written down:**

1. **The 18 approval claims in live code** (Finding I3). The findings document
   warns against quoting the count; the code states it.
2. **The 10-site `kicad-round-trip.ts` precedent cluster** (Finding I4). The
   doc-to-test-pointer gap is recorded for *prose documents*; code comments were
   never swept.
3. **The `the IR's partShapes rule` citation inside a live refusal message**
   (Finding I1).
4. **`tools/guide/schematic-notice.ts`'s A4/A3 paper claim**, false on all five
   sheets. Pre-existing; now in a file this plan touched.
5. **`lib/kicad/value-notation.ts`'s "49 of them across 29 files"**, with the grep
   command printed beside it. **RAN** that grep at `HEAD`: it returns **1**. The
   file does disclose that "the paragraphs below are its original reasoning, in the
   tense it was written in", which covers the tense but not the figure — a reader
   is handed a runnable command and a number it no longer produces.
6. **`schematic/README.md` is reachable from one place only.** **RAN**:
   `grep -rn "schematic/README.md"` finds it cited from
   `docs/research/2026-10-30-schgen-removed.md` and nowhere else — not from
   `docs/schematic/README.md`, not from `CLAUDE.md`, not from the top `README.md`.
   It is the sole home of the baselines correction and of the lesson *"a finding
   belongs beside the thing that outlives the change"*. Minor.
7. **The G303 watermark directive has no implementation anywhere** (§1 item 2).
   Predates the branch; nobody has recorded that it is now unimplemented.
8. **`symbolPins`, `symbolStrokeSegments` and `supportedUnitSymbols` in
   `lib/kicad/symbol-library.ts` have zero production callers** and are reached only
   from `tests/kicad/symbol-library-disk.ts`. The file says so in its own header,
   which is the right handling; recorded because the same is true of
   `valueIsSymbolPartName` and the two together are a small pattern — library code
   kept alive by tests — rather than one instance.

---

## Findings, ranked

### Critical

**None.**

### Important

**I1. `circuits/pultec/designators.ts` carries a stale cause inside a live refusal
message.** Three sites name a rule that no longer exists anywhere in the
repository — `designators.ts:28`, `designators.ts:52` and
`tests/circuits/pultec-designators.test.ts:16`, all saying *"the IR's `partShapes`
rule"*. **RAN** `grep -rn partShapes lib tools circuits tests schematic`: those
three sites and nothing else. The live throw reads:

> `…the result "${designator}" is not ${DESIGNATOR.source}, which the IR's partShapes rule requires of every part label.`

The IR is `lib/schgen/ir/`, deleted by this plan. So the refusal's "why" is
unverifiable: a reader cannot find the rule, and `CLAUDE.md` is explicit that where
the "why it is not defaulted" clause cannot be written, *"you have found a demand to
question rather than a refusal to satisfy."* **The move was not verbatim** — the
same message's path reference *was* updated from `schematic/section-board.ts` to
`designators.ts` — so the IR clause was seen and left. Worse than a dangling path,
by this repository's own ranking: *"a stale count misleads about progress; a stale
cause sends the next agent after a rule that is not there."* **Fix:** state the
requirement on its own authority (a KiCad reference designator starts with letters
and carries no `.` or `-`) or delete the clause. **Do not re-erect the regex as a
demand without a reason** — it is adjacent to the `UPPER_SNAKE` case `CLAUDE.md`
records as G150.

**I2. `tests/circuits/drafted-sheet.ts:262` — a control that cannot fail, guarding
the binding guard, with a comment claiming a property it does not test.**

```ts
expect(computed).toBe(recordedSheetDigest(circuit, board))
// The positive control: the digest is of THIS file and moves with its bytes. Without it, a
// `recordedSheetDigest` that returned the computed value would pass the line above forever.
expect(createHash("sha256").update(fs.readFileSync(sheet)).update("x").digest("hex")).not.toBe(computed)
```

`sha256(bytes ++ "x") ≠ sha256(bytes)` is a property of SHA-256 and holds for every
file in existence. It says nothing whatever about `recordedSheetDigest`. **The
stated failure it exists to catch — `recordedSheetDigest` returning the computed
value — would pass both lines.** This is the `expect(x).not.toBe(x + " ")` shape the
plan already caught once in Task 9, written into guard 1, the one guard that makes
an approval mean a specific artifact. Guard 1 is **not** actually inert —
`recordedSheetDigest` parses `RECORD.md` with a strict regex and throws unless
exactly one `THE BINDING` row matches, and I verified all five digests independently
with `shasum` — so the risk is a false sense of coverage rather than a hole. **Fix:**
delete the line, or make it a control that could fail (assert the digest came out of
the record, e.g. that a record with the row removed throws).

**I3. Eighteen approval claims in live code, fifteen false, twelve in files this
plan added — four of them inside refusal messages.** Table in §6. One page of five
carries a verdict bound to its present bytes (measured). The plan's own findings
document explicitly forbids quoting the count; the code states it eighteen times.
`EVALUATING-DRAWINGS.md` §5 is the clause this sits against: approval is state the
reviewer writes, bound to the exact artifact, *"so that a stale approval cannot be
expressed"* — and a test header that says "THE ONLY PROOF THAT KICAD READS AN
APPROVED PAGE" over four pages awaiting re-approval expresses one. **Fix:** say
`drafted/` or "committed page" where the code means "the page this board declares",
and leave the word *approved* to `docs/schematic/verdicts.md`. The code does not
need the status at all — not one of the eighteen sites behaves differently because a
page is approved.

**I4. The `kicad-round-trip.ts` precedent cluster: ten present-tense citations of a
deleted file across nine files, one of them in a file this plan added.** List in
§5(a). This is the fifth instance of the verbatim-move self-reference class and the
one the brief predicted was still there. It is a stale *cause* in each case — "for
the reason X gives" — and the surviving repository has nothing that guards a code
comment's citation of a test file. **Fix:** in the three files this plan touched
(`tests/kicad/sheet-agreement-tables.test.ts:20`,
`tests/kicad/symbol-library-disk.ts:18`, `tests/guide/print-pdf.test.ts:10/26/155`),
state the reason on its own authority or mark the citation as historical. The five
untouched files are ordinary dangling references and can be left; but they should be
recorded as such, because right now nothing says they are.

### Minor

**M1. `tests/circuits/sheet-model.ts`'s three deferred minors compose.** §4. The
board key of `DECLARED_PIN_NUMBERS` is validated by nothing and read by bare bracket
index, inside a file whose header figure (`SI1`..`SI6`) is wrong on four boards of
five — measured: `SI8`, `SI6`, `SI8`, `SI9`, `SI9`. **The board key is the one thing
I would fix before this branch is finished.** Delete the figure rather than correct
it.

**M2. `pultec-switch-geometry.test.ts:74` replaced a declared-table lookup with a
name heuristic.** The original arm accounted for every pin as
`THROW_PINS ∪ POLE_PIN ∪ mechanicalPinsOf(libId)`; the port uses
`libId.endsWith("_MP") ? ["MP"] : []`. Correct for both of today's entries, but it
is *"a general rule that quietly accepts a guess"* where `CLAUDE.md` prefers *"an
empty whitelist that refuses loudly"*, and it means a future symbol added to
`THROW_PINS` without a `MECHANICAL_PINS` entry passes here while
`compareSheetToModel` silently omits its lug from the model partition. The original
arm would have failed. Narrow, because `MECHANICAL_PINS` is independently held to
the installed library by `sheet-agreement-tables.test.ts` (including the restored
stroke-endpoint geometry) — but that test cannot see a *missing* entry. **Fix:** read
`MECHANICAL_PINS[libId]`.

**M3. `pultec-switch-geometry.test.ts:242-246` — a control that passes regardless of
its subject.** `expect(numbers).not.toContain("not-a-real-pin-number")` over the
installed pin numbers. It never perturbs `POLE_PIN`, so it demonstrates nothing
about the containment assertion it is labelled a control for; it could only fail if
KiCad shipped a pin literally so named. Materially harmless — the same test file
carries three controls that do have teeth, including the lib-id refusal and the
dropped-throw set comparison. Also noted: the `CONTROL: a pin set missing one of the
symbol's real throws` arm iterates `THROW_PINS` with no non-vacuity floor of its own
(the floor is asserted in a different test).

**M4. `tools/guide/schematic-notice.ts:132-133` and `tests/guide/packet.test.ts:128`
state a paper split that is false on all five sheets.** All five declare
`USLetter` (measured); the comment says four A4 + one A3 and concludes *"every
packet today carries one page that is not US Letter"*, which is inverted. The check
itself is correct. Pre-existing (`3ae58e9`, before `fdbc51a`), so not this branch's
defect — but in a file this branch edited, and written down here for the first time.

**M5. `lib/kicad/value-notation.ts`'s "49 of them across 29 files" is now 1.**
**RAN** the grep the comment prints. The file discloses the *tense* of the paragraph
but not the figure, and the figure comes with a runnable command.

**M6. `schematic/README.md` is cited from exactly one place in the repository** —
the findings document — and it is the only home of the baselines correction. Not
linked from `docs/schematic/README.md`, `CLAUDE.md` or `README.md`.

**M7. `SheetAgreement`'s six fields are mutable `string[]`.** A caller can push into
a problem list. The consumer that made this harmless (the `toEqual` equivalence
test) is deleted; the per-board guards compare sorted copies, so nothing is wrong
today. Deferred in Task 1; still open.

### Observations (not findings)

**O1. The harness injected a stale `CLAUDE.md`.** The copy in this session's system
context carried the pre-plan text — *"The schematic generator is `lib/schgen/`"* plus
the two `tools/schgen/` commands — i.e. **the honey pot itself**. The file at `HEAD`
(lines 136-185) is properly amended: both halves shown struck, the commands recorded
as deleted with three replacements named, and `TOOLING.md` + `EVALUATING-DRAWINGS.md`
pointed at. **Verified by reading `HEAD`, not the injection.** Worth knowing because
an agent that trusts its injected context will read the deleted generator as current.

**O2. The deletion left no live reference in anything that executes.**
`Makefile`, `make/`, `package.json`: zero `schgen` references outside a `.gitignore`
comment saying it is deleted. `make check` log: zero mentions.

**O3. `make check`'s four failures are the four the spec named, with buildability
causes only.** `pt2399-core` still fails before its page is ever looked at — the
G303 shape the findings document flags and correctly declines to fix here.

**O4. `lib/kicad/sheet-agreement.ts:11` records a measurement in prose whose test is
deleted** — "measured on all six lists on all five approved pages" by
`tests/circuits/guard-equivalence.test.ts`, which "existed only while both did". This
is inherently a one-time cross-over measurement, so there is no tool that could
re-run it; the module names the commit (`f6a4d40^..`) where it lives. Acceptable, and
noted only because `CLAUDE.md` is strict that a measurement belongs in something that
re-runs.

**O5. Several things on this branch are stronger than what they replaced**, and a
review that only lists defects misreports the change: ten boards carry a live
`kicad-cli` proof where five did; `footprintsUndeclared` gained a per-board exact
assertion where only the (temporary) equivalence test ever read it; three of
`SYMBOL_BY_KIND`'s four entries had no test of any kind before
`sheet-agreement-tables.test.ts`; the `MECHANICAL_PINS` stroke-endpoint geometry was
restored rather than lost; and the `verify-pastes` guard over a 432 KB surviving
deliverable was deleted and caught.

---

## Ran versus reasoned

**RAN (28 distinct checks, every command executed in this session):**
`bun run typecheck`; `bun test` (solo); `make check` (twice — once for the tail,
once captured to a log); `grep "NOT HELD"` and `grep -ci schgen` over that log;
`git diff fdbc51a..HEAD -- drafted/ docs/schematic/verdicts.md`;
`git diff --stat` over `schematic/readability-baselines.json`;
`git diff --shortstat fdbc51a..HEAD` and the commit count; `git status --porcelain`;
five `shasum -a 256` digest comparisons **plus a one-byte perturbation control**;
a Python control-byte scan over all 78 added/modified/renamed files **with a canary
control**; a Python relative-path resolver over the same 78 files; a scripted
negative-assertion sweep over every changed `.ts` under `tests/`/`tools/`/`lib/`;
fixed-string importer resolution at `fdbc51a` for four deleted modules; the five
`(paper …)` declarations; the five `SI<n>` maxima out of the netlist fixtures; the
`refPrefix:` grep; the `partShapes` grep; the `elkjs` importer grep; the
`leastCovered` consumer grep; the `repoRoot` survival grep; the surviving
board-count grep; the approval-claim sweep over `lib tools tests circuits schematic`;
the `schematic/README.md` citation sweep; `verdicts.md` digest extraction;
`git show fdbc51a:<path>` on eleven deleted files read in full or in part; and the
full text of `lib/kicad/sheet-agreement.ts`, `tests/circuits/drafted-sheet.ts`,
`tests/circuits/committed-schematic.ts`,
`tests/circuits/transistor-preamp-kicad-round-trip.test.ts`,
`tests/circuits/drafted-kicad-round-trip.test.ts`,
`tests/circuits/pultec-switch-geometry.test.ts`,
`tests/kicad/sheet-agreement-tables.test.ts`, `tests/guide/occupancy.test.ts`,
`circuits/pultec/designators.ts`, `tests/circuits/pultec-designators.test.ts`,
`schematic/README.md` and `CLAUDE.md` lines 125-185.

**REASONED (three, each labelled where it is used):**
(i) that nothing guards a doc-to-test pointer any more — taken from the findings
document and the absence of `tests/schgen/pointers.test.ts`, not re-derived by
building the guard's replacement;
(ii) that the five untouched files in the `kicad-round-trip.ts` cluster are
ordinary dangling references rather than stale causes — a judgement about tense,
not a measurement;
(iii) the `make check` failure causes being *identical* to the pre-plan baseline —
I measured the four boards and their four `NOT HELD` rules at `HEAD` but did not
check out `fdbc51a` and re-run, so "the same causes" is relayed from the Task 9
report and corroborated by the fact that no cause names a schematic.

**Nothing in the Gates table, the digest verification, the control-byte scan or any
numbered finding is reasoned. Every figure in this file was produced by a command
here.**
