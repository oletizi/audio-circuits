# Task 2 — fix round 1 report

**Status: DONE.** All seven items addressed, committed and pushed on
`feature/schematics-tooling`. One deviation from a stated mechanism is recorded
below (the second checker invocation needed one optional parameter). Nothing in
the brief is disputed.

**Commits**

| SHA | what |
| --- | --- |
| `c2860e5` | IMPORTANT 2 + IMPORTANT 3 + MINOR 7 in the probe: hash the bundle the run LOADS, add control arms **j** and **k**, enumerate the height-varying cells, rename `STEP 5j`/`5k` to `STEP 6`/`STEP 7` |
| `053dfb2` | IMPORTANT 1 in the document and the register |
| `b6876c7` | ruling R17's second checker invocation, the re-spliced §2 blocks against the new log, and MINOR 4, 5, 6 + the prose halves of IMPORTANT 2, 3 and MINOR 7 |

**Suite:** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3785 pass / 0 fail / 43482 expect() across 352 files** (HEAD was 3778/352;
the +7 are this round's cases). `bun run typecheck` clean. The sibling repository's
`git status --porcelain` is empty. No AI attribution in any of the six commits on
this branch (grepped).

---

## IMPORTANT 1 — the sentence as it now reads

The paragraph is rewritten. Its measured half is verbatim-preserved; the inference
is gone and replaced by a pointer to the correction. **As it now reads:**

> **A GLOBAL LABEL: not as an offset, which is what ELK returns.** `[READ]`
> `lib/schgen/render/emit-items.ts:227-241`: a `global_label` is emitted as
> `(global_label <net> (shape bidirectional) (at l.at angle) (effects justify) ...
> (property "Intersheetrefs" ...))`. **Its text has no coordinate of its own.** The
> label's one position is `l.at`, the anchor, and the separately positioned
> `Intersheetrefs` property is the only other coordinate in the form. ELK's answer
> for a boundary node's label is an **offset from that anchor** - measured above as
> `(-1905, -2048.1)` for `+5V` - and **there is nowhere in the emitted form to put
> it.** That is the measurement, and it is the whole of what §2 establishes about
> this class.

It is followed by a paragraph headed **"WHAT DOES NOT FOLLOW, AND §2 SAID IT DID
UNTIL THIS CORRECTION"**, which quotes the deleted clause, quotes plan line 207
verbatim (name and connection are netlist facts, drawing coordinates are not
necessarily fixed, this generator draws the wires), names the three degrees of
freedom plus the generator's fourth, says *"§2 does not take any of that away: it
is Task 5's subject"*, and ends: *"Any citation of G262's netlist-fact framing,
here or anywhere, is a citation of the claim plan line 207 corrects."*

**§2.8 carried the same inference in two places and both are fixed.** Its
global-label row now marks the G262 citation as *"the claim the plan corrects at
line 207 - cited here only for the board counts"* and ends *"That is a property of
the emitted form, not a statement that the anchor cannot move - which is Task 5's
question, not this section's."* Its closing summary said *"a label whose position
is fixed by the netlist"*; it now says *"a label whose only coordinate in the
emitted form is its anchor"*, with a following sentence stating that the two are
not the same claim.

**The register carried it twice and both are corrected.** G262's Task 2 amendment
made the identical mistake in the identical words (*"not merely that moving a
label changes the circuit, but ..."*); it now quotes its own wrong sentence, names
plan line 207, and says *"Anyone citing this entry's netlist-fact framing is
citing the corrected claim."* G266 clause 1 gains the same pointer. §2.9 gains an
explicit non-establishment: §2 says nothing about whether a label's anchor may
move.

**One thing I did not change and am flagging rather than silently leaving.**
`docs/known-gaps.md` has a third site carrying the corrected premise, in an
earlier entry's amendment (around line 1414): *"A global label's position IS a
netlist fact - it connects where it is drawn - so the same mechanism cannot move
one off an overlap."* It predates Task 2 and is not an entry this task wrote. I
left it because Task 5 owns that correction and two agents editing one amendment
is how a deletion takes something with it; **it is not fixed and it will mislead
the same reader.**

## IMPORTANT 2 — the pin now hashes the bundle it loads, and the hole is driven in both directions

`[RAN]` From a scratch location outside the repository, with the pinned constants:

```
LOADED  : /Users/orion/.bun/install/cache/elkjs@0.12.0@@@1/lib/elk-worker.min.js
          version 0.12.0, sha256 e4f5c51c6f2fd564bb64e52e81c4a85a316ef2f24f8b90e1db5eb886c765b030
OLD PIN : hashes .../pultec-modularize/node_modules/elkjs/lib/elk-worker.min.js
          version 0.9.3, sha256 114c4f17...f538 -> PASSES
NEW PIN : hashes the resolved worker URL -> REFUSES
```

**The reviewer's finding reproduces exactly.** The fix is the mechanism suggested:
`WORKER_URL` is now one expression — `import.meta.resolve("elkjs/lib/elk-worker.min.js")` —
used twice, hashed by `pinned()` via `fileURLToPath` and handed to
`workerFactory`, so the file checked is the file loaded. A non-`file:` URL refuses
with a message saying why. The version is read from
`import.meta.resolve("elkjs/package.json")` by the same route.

**The documentation half is also done, because the criterion asks for one or the
other and the honest answer needs both.** §2.1 now says what closes the hole is
**where the probe is committed**, with the hash as a second lock rather than a
stand-in; **G266 clause 3** says the same and adds the transferable shape: *"a
guard whose subject is derived separately from the thing it is meant to guard can
be green about a file nothing loads."* The log line changed from *"pinned at
SHA-256"* to *"the bundle this run LOADS, hashed: SHA-256"*.

## IMPORTANT 3 — the completeness claim is computed, and the quoted figure carries its ruler

The probe now enumerates every arm-by-metric cell over the three line heights and
prints the result, so §2 quotes a figure instead of a tally: **55 cells, 49
invariant, 6 varying**, each varying cell printed with its three values. The six
are `d/wire`, `d/on-grid`, `e/on-grid`, `g/wire`, `g/on-grid`, `i/lbl-lbl` —
**including arm e's on-grid count, 46 / 43 / 12**, which the old list omitted. The
symbol-field sentence now reads: *"of the 398 placed labels in arm e, the number
whose corner lands on a whole grid step is 46 at the current model's 1270 µm line,
43 at the rendered ink's 1422.4 µm, and 12 at GetTextBox's 2043.1 µm — so between
352 and 386 of 398 would have to be snapped or accepted off-grid"*, with a clause
saying all three are given because the cell is one of the six that move. The
*"all four are named"* sentence is replaced by a paragraph that says what the old
one got wrong and why a completeness claim matters.

The six varying cells with 11 arms correspond to the reviewer's six with 9 arms;
the two new arms contribute 10 invariant cells.

## MINOR 4 — the coverage figure is now a line accounting that adds up

Replaced the byte figure with: the log is **117 lines — 100 quoted by the eight
blocks, 8 `== ` section headers (which now live in the fence info strings), 9
blank (eight separators and the trailing newline)**. `[RAN]` 100 + 8 + 9 = 117.
This is also what the brief's second option asks for — it states what it counts —
and it no longer depends on a byte count nobody can see at a glance. The old
figure was wrong twice over now, since the blocks changed shape when the section
headers moved into the fences.

## MINOR 5 — the two-run claim now rests on an artifact in the history

Replaced with: *"The run committed at `cb35fe0` carried nine arms, this one
carries eleven, and every row of arms a-i is identical between them;
`git show cb35fe0:tools/schgen/elk-labels/probe-run.log` is the earlier log and
the comparison is a `diff`."* `[RAN]` I drove that diff before replacing the log:
arms a–i are byte-identical between the nine-arm and eleven-arm runs. G266's
evidence line carries the same correction and names what round 0 did wrong.

## MINOR 6 — the serializer wording is narrowed to the guard

§2.4 now says the refusal fires **when a graph is serialized**, that `elkInputOf`
serializes every graph it builds so a labelled graph cannot be *constructed*
through this repository's own path without the throw, and then plainly: *"It is
not a guarantee that no label can ever reach ELK: the graph is a plain `ElkNode`,
and a caller that mutated it after `elkInputOf` returned would hand `elk.layout` a
label the serializer never saw. That is exactly what the arms below do,
deliberately."* The reachability-from-production point is kept.

## MINOR 7 — the arms are not minimal pairs; both controls are arms now, and one FAILS

Arms **j** (`nodeSize.constraints: []` + outside hint, no label) and **k**
(`[NODE_LABELS]` + inside hint, no label) are in the probe, so the log carries
them.

- **Arm j passes and confirms the reviewer's control**: 0 of 48 blocks moved. So
  in arms **d**–**g**, where §2.6's two decisive arms live, the growth is the
  label's.
- **Arm k FAILS**, which the reviewer's control did not cover: 254 nodes resized,
  worst **33020.0 µm**, 48 of 48 blocks moved, `pt-core`'s `C1:1` collapsing to
  **0 × 0** with no label present at all. **So arms b and c measure the option and
  the label together and nothing in §2 separates them.** §2.5 and §2.6 say so,
  §2.9 lists it as not established, and G266 clause 9 records it with a criterion
  met for one family and explicitly **not met** for the other.

Had I taken the reviewer's passing control as covering the table, the failing one
would never have been written.

## MINE/R17 — §2 is now held to §2's own log, with one recorded deviation

`tests/schgen/text-metrics/document-pastes.test.ts` calls the same checker a
second time with `tools/schgen/elk-labels/probe-run.log`. Seven new cases: the
fence mapping changes nothing but fence words; all **8** blocks verify; **RED** on
a single digit changed; **RED** on a genuine slice of another section substituted
whole; the two logs share no line and neither marker appears in the other's log;
the commit §2 pins is the commit §2's log was taken at on a clean tree; and §2's
log is a probe run rather than a fixture.

**THE DEVIATION, recorded because the mechanism was yours and it was not quite
enough.** *"A second invocation of the existing checker"* fails on its own:
`verify()` counts runs by the line `== WHAT THIS RUN MEASURED`, which is §1's
probe's header, and §2's log deliberately does not contain it — that disjointness
is what the round-0 collision bought. The second call therefore failed with *"the
log holds 0 run(s)"*. So `verify()` gained **one optional parameter**, the run
marker, defaulting to the existing constant: every existing call is unchanged, no
call became multi-log, and the CLI takes it as an optional third argument. The
alternative — appending §1's marker to §2's log in memory — would have been
fabricating the log's shape in the test.

**Two further notes.** §2's blocks keep the ` ```elk-run ` fence so §1's
whole-document call goes on refusing them as §1 output, which is the property that
caught the header collision; the test maps the fence word at line starts only and
asserts that exactly eight fences and no block body changed. And the blocks no
longer include their `== ` header line — the section name moved into the fence,
which is §1's own convention and is what lets the checker anchor them; that is why
MINOR 4's accounting changed shape.

**§2.10 is rewritten end to end** and now says §2 *is* checked, what the second
call establishes, what it still cannot (§1.11's standing caveat: the right output
under the right prose), and that the round-0 rename is what made the second call
possible at all.

---

## Anything I disagree with

Nothing in the brief. Two things to put back to you:

1. **The third netlist-fact site in the register** (above, under IMPORTANT 1) is
   untouched and still wrong. If Task 5 is not going to rewrite that amendment, it
   needs a one-line pointer the way G262's and G266's now have. **RULED AND DONE
   in round 2 below: it is G259, and it is amended rather than deferred.**
2. **Arms b and c remain uncontrolled** and I did not add the third arm that would
   separate them, because no conclusion in §2 rests on those two rows. If Task 7
   intends to cite them, they need that arm first.

---

# Task 2 — fix round 2

**Status: DONE.** One item, register only. **Commit `593f29e`**, pushed on
`feature/schematics-tooling`.

**Suite:** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3785 pass / 0 fail / 43482 expect() across 352 files** — unchanged, as a
register-only change should leave it. `bun run typecheck` clean. §1's paste
checker: 26 blocks, 14 verified, 12 declared not probe output, **0 failed**.
Sibling repository clean. No AI attribution in the commit.

## The item: G259's netlist-fact paragraph and its fixed-anchor mechanism

**Your ruling is right about where the survivor was and why it was the worst
place for it, and my round-1 reason for leaving it (two agents editing one
amendment) was live only while Task 5 was the owner of the correction.** It is
amended now, in the form G262's correction takes: the original paragraph is left
as written, and a new amendment at the end of the entry quotes it, quotes plan
line 207, and says what the mechanism rests on.

**G259 now carries two additions and nothing else changed** — the scoreboard rows,
every figure and the entry's criterion are untouched, and it authors no new
criterion.

**(1) A forward pointer at the paragraph itself**, because G259 is long, carries
three amendments, and a reader of a scoreboard may never reach the end of the
entry. It is a block quote immediately under the paragraph, attributed to this
amendment so the original text is visibly unrewritten:

> **THIS PARAGRAPH IS CORRECTED AT THE END OF THIS ENTRY (2026-10-22, Task 2 of
> the text-handling research plan).** *"A global label's position IS a netlist
> fact"* and *"the anchor point is fixed"* are the premise the plan records as
> WRONG at line 207; the four-candidate side search rests on it. The paragraph is
> left as written, with the pointer here, because a reader of this scoreboard may
> never reach the amendment - and nothing above it changes.

**(2) The amendment at the end of the entry**, headed *"AMENDED 2026-10-22 BY TASK
2 OF THE TEXT-HANDLING RESEARCH PLAN: THIS ENTRY'S ONE PARAGRAPH ABOUT THE LABEL
DEFECT RESTS ON A PREMISE THE PLAN RECORDS AS WRONG, AND IT IS THE LAST SITE IN
THIS FILE STILL CARRYING IT UNHEDGED."* It quotes the paragraph verbatim, quotes
plan line 207 verbatim, names the three degrees of freedom plus the generator's
fourth, and notes that this paragraph states the claim **with no hedge at all**
where G262 at least marks its version as a `[CODE]` reading.

**The mechanism half, which is the reason this is an amendment rather than a
pointer alone.** As it now reads:

> **AND THE SIDES MECHANISM RESTS ON THE CORRECTED PREMISE, which is why this
> amendment exists rather than a pointer.** *"The anchor point is fixed"* is the
> premise, and *"a four-candidate least-covered choice over sides"* is what
> follows from it. **With the anchor movable the candidate set may be wider than
> four**, and it may not be a choice over sides at all. The mechanism is still
> **UNTRIED and NOT A PLAN** - it was that before and it is that now - but it is
> no longer the mechanism that most resembles what worked, because the search
> space it is drawn from is larger than this paragraph knew. **Task 5 owns that
> question**, and this entry pre-closed it in the place an agent looks first.

It closes with Task 2's adjacent measurement marked as **not** the correction (the
emitted `global_label` has one coordinate, so an ELK offset has no representation
in this emitter's output vocabulary — a fact about the form, silent about where the
anchor may be put), and with evidence / verified / why-open / what-would-settle-it
lines. **"What would settle it" names no mechanism on purpose**: replacing the
four-candidate search with a guess at a wider one would repeat the error in a new
size. The criterion it points at is G240's, which this writer did not author.

**The evidence line states the check that could have failed**, since the finding
is a reading rather than a drive: a grep of `docs/known-gaps.md` for the
netlist-fact framing returns six sites, and reading each establishes that four are
G262's body-plus-amendment pair or the correction itself — leaving this as the only
one a reader could take as current. `[RAN]` after the amendment the same grep
returns **nine**: the original six, plus this amendment's forward pointer, its
quotation of the paragraph, and its quotation of plan line 207. **Every one of the
nine is now either a corrected statement with its correction attached, or part of
a correction.**

## Your three rulings, acknowledged

- **Arm k's failure accepted as found, and the qualifier you gave the owner
  corrected.** Recorded as standing practice in G266 clause 9's own words: a
  reviewer's control is evidence about what it covered, not about the table it was
  offered for.
- **R17's deviation accepted.** The optional run-marker parameter stands as the
  minimal way to meet the criterion.
- **The four non-surviving netlist-fact sites**: your enumeration matches mine —
  1708/1718 are G262's body and its `[CODE]` hedge, closed by G262's own
  amendment; 1765 and 2183 are the correction. Nothing further to do there.

## Anything I disagree with

Nothing. One thing carried forward unresolved from round 1, unchanged and not
re-raised: **arms b and c remain uncontrolled** (G266 clause 9 holds the
criterion as met for arms d–g and explicitly not met for b–c), so if Task 7 means
to cite those two rows they need the third arm first. **RULED AND DONE in round 3 below: arm c has
its own control now and it reproduces the re-reviewer's figures; arm b's
magnitude remains unseparated.**

---

# Task 2 — fix round 3

**Status: DONE.** Three items, all addressed. **Option taken for item 1: the
second — the sweep now covers every column STEP 5 publishes**, and the columns and
the swept cells are **one list** in the probe, so they cannot drift apart again.

**Commits**

| SHA | what |
| --- | --- |
| `9bbd78c` | ITEM 1 + ITEM 3 in the probe: one shared metric list for the table and the sweep, and arm **l** — arm c's own control |
| `31419be` | print a micrometre column to one decimal and a count as an integer (the shared list had collapsed `17790.0` to `17790` and `20.0` to `20`) |
| `76d6a2b` | the document and the register: all three items' prose, plus the RED case's victim line read from the log instead of written in the test |

**Suite:** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3785 pass / 0 fail / 43482 expect() across 352 files**, unchanged. `bun run
typecheck` clean. §1's paste checker: 26 blocks, 14 verified, 12 not-output, **0
failed**. Sibling repository clean. No AI attribution.

## ITEM 1 — the sweep is the table, by construction

**The reviewer's figure reproduces exactly.** `[RAN]` arm b's worst resize is
**31740.0 / 31587.6 / 30966.9 µm** — 25.0, 24.9 and 24.4 grid steps — and it is
now the seventh varying cell the probe enumerates.

**I took the stronger option.** The probe has one `METRICS` list; it prints the
STEP 5 table from it and sweeps the same list across the three heights, so
*"complete over every column STEP 5 publishes"* is true by construction rather
than by my keeping two lists in step. The sweep went from 5 quantities to **13** —
the nine the table published, plus `placed` and `no-coords` which were implicit in
the old `on-grid X/Y` fraction, and `moved` and `worst-um` which were the two
composite cells. **156 cells, 149 invariant, 7 varying**, each printed with its
three values.

**Every site that quotes a moving figure now carries its heights.**

- §2.6: *"the worst by **31740.0 µm** at the current model's 1270 µm line,
  **31587.6 µm** at the rendered ink's 1422.4 µm and **30966.9 µm** at
  `GetTextBox`'s 2043.1 µm — 25.0, 24.9 and 24.4 grid steps respectively"*, and a
  following paragraph saying this is the one figure §2 published without its
  height. **Arm c's 17790.0 µm is stated as invariant**, rather than left to be
  inferred from its absence from the list.
- §2.7's completeness paragraph is rewritten: it says round 0 mis-tallied, round 1
  computed over a subset, names the omitted cell, and ends *"Nothing else in those
  156 cells moves — and that sentence is now exactly as wide as the table above
  it, which is the whole point of the restructure."*
- **G266 clause 2** carries all three values and names *"over 24 grid steps"* as
  false at the current model's line, where it is exactly 25.0.
- **G266 clause 8** is rewritten around the lesson: *"Generalising a claim does not
  generalise its scope, and nobody checks the scope of a claim they have just
  computed"* — which is §1.11's n=1 lesson in a second costume, and I did not see
  it coming any more than that one's author did.

## ITEM 2 — the guard is credited with fenced blocks only

**G266 clause 5 now says what the guard reads.** *"a figure edited in §2 breaks the
suite"* is replaced by a paragraph headed **"WHAT THAT GUARD COVERS IS FENCED
BLOCKS, AND THE FIRST VERSION OF THIS CLAUSE SAID … WHICH IS WIDER THAN THE
GUARD"**, carrying the re-reviewer's drive (a prose figure edited 46 → 99, nothing
red), naming it as clause 3's shape again, and noting the wide version reached the
owner. The "why it is open" line now splits the clause: **the fenced-block half is
closed, the prose half is open.**

**I did not extend the guard**, per instruction, and recorded it as a gap with
**CRITERION: a figure in §2's prose that disagrees with §2's log fails the suite**
and a **MECHANISM marked UNTRIED and probably the wrong shape** — requiring every
decimal-bearing prose number to appear in the log would reject *"25.0 grid steps"*,
a correct derivation that is not in the log, so the rule would have to tell a
quotation from an arithmetic result, which is §1.11's *"checker reads prose"*
problem. The clause ends with what a reader can rely on: **a pasted block cannot
drift from the log; a prose figure beside it can.**

**I did the cross-check that gap invites**, since §2's prose is now the unguarded
surface: `[RAN]` every number of three or more characters in §2's prose is either
in the log or a legitimate derivation or reference. The derivations are 25.0 /
24.9 / 24.4 grid steps, 352 and 386 (398 − 46, 398 − 12), 218 (362 − 144), 3810
(3 × 1270), 106 (the line accounting) and the 0.4% padding figure; the rest are
section numbers, G-numbers, plan line 207, `emit-items.ts:227`, dates, commit
fragments, and the off-pin 0.12.0 / 235 / 153 figures that are marked as off-pin.
Each derivation checks out.

## ITEM 3 — arm l, and it reproduces the reviewer's figures to the digit

**Recorded as a measurement and driven rather than relayed**, because arm k
carries arm **b**'s option set and arm **c** had none. Arm **l** is
`[NODE_LABELS, MINIMUM_SIZE]` with the symbol's own box as the minimum and no
label.

`[RAN]` **144 nodes resized, worst 20.0 µm, 46 of 48 blocks moved** — the
re-reviewer's three figures exactly. **So they are CONFIRMED here, not relayed**,
and the log carries them.

**And the arm says more than "c fails its control too", which is why it was worth
driving.** `pt-core`'s `C1:1` comes back **unchanged at 4064 × 7620** while the
boundary node `port:+5V` goes from 0 × 0 to **20 × 20**: `MINIMUM_SIZE` preserves
every node that *has* a box and gives only the zero-size boundary nodes a 20 µm
body. **144 is exactly the boundary-node count**, which independently cross-checks
the 254 unit nodes §2.6 relies on — 254 + 144 = 398, a figure I derived in round 0
by reasoning about `INSIDE` placement and had not measured until now.

**So arm c's 362 resizes split into 144 boundary nodes at 20 µm (the option's) and
218 unit nodes widened by their labels (the label's)**, and §2.5, §2.6 and G266
clause 9 all say the probe does not attribute them individually — what the control
establishes is that the option's contribution there is **bounded at 20 µm and
confined to nodes with no geometry to lose.** G266 clause 9 now reads "three
option families, three controls, and they answer differently", and the settlement
line records the criterion as **MET for every arm** with arm b's magnitude the one
thing still unseparated and nothing depending on it.

## Two things that changed because something went red

Both are recorded because a reader of this report should see what the couplings
caught rather than only that they exist.

1. **The shared metric list collapsed `17790.0` to `17790` and `20.0` to `20`**,
   silently reformatting figures §2 and the register already quote. Caught by
   reading the first run's table. The metric descriptor now declares which columns
   are micrometres (`31419be`).
2. **The new RED case went red for real**, because its victim line was written out
   in the test and the probe had just gained a column. That is the coupling working
   — on the test's own literal rather than on the document, which is the wrong
   place for it. **The victim line is now read from the log** (the cell-count line,
   which is what §2.7's completeness claim rests on) and perturbed by incrementing
   its last number, so the case maintains itself and still has teeth.

## The three non-blocking observations

No action taken, as instructed. For the record: I agree that deleting a whole §2
block is caught by the pinned 8-block assertions rather than by `verify()`; that
clause 3's 235 / 11 / 153 figures are deliberately not re-drivable through the
committed probe, since the probe now refuses the bundle that produced them; and
that G262's body paragraph is closed by its own amendment's closing sentence.

## Anything I dispute

Nothing. Two things to leave on the record:

1. **Arm b's magnitude is still not separated from its option's** (G266 clause 9).
   Nothing in §2's conclusions depends on it; a further arm — `[NODE_LABELS]` with
   a zero-size label — would settle it.
2. **§2's prose is now the document's unguarded surface** (ITEM 2's gap). The
   cross-check above is a one-off by hand, not a check that runs.
