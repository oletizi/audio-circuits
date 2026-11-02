Task 2 review: What ELK already offers for labels
=================================================

Reviewed: `14ed8f0..338f31d` (4 commits), `docs/schematic/text-handling-research.md`
§2 (lines 728-1285), `docs/known-gaps.md` **G266** and the **G262** amendment,
`tools/schgen/elk-labels/{probe,arms,corpus}.ts` + `probe-run.log`, and three
`tools/schgen/port-manifest.json` entries. Reviewed against
`.superpowers/sdd/2026-10-22-text-handling-research/task-2-brief.md` as the single
source of requirements.

Verdicts
--------

**SPEC COMPLIANCE: PASS, with one required correction.** All seven steps are done
and committed. The permitted surface was respected exactly: the diff touches
`docs/`, `tools/schgen/elk-labels/` and three `port-manifest.json` provenance
entries and **nothing** in `lib/`, `circuits/`, `tests/` or any check. The probe
is committed, pins its input, prints the commit it measured, and re-drives every
published figure from a clean checkout. The inventory and the experiment are
graded separately (§2.0). The two-armed experiment exists, discriminates, and the
negative is stated plainly (§2.8). The register carries a new entry and an
amendment. No AI attribution anywhere. Both repositories clean.

The one required correction: **§2.7 restates, as fact and unhedged, the premise
the plan's own state section records as wrong** — see Finding 1. It is a defect in
the artifact, not a step left undone, which is why this is a PASS rather than a
fail.

**TASK QUALITY: HIGH.** Every headline figure re-derived independently on my own
walk of the graphs and my own option scan, with figures matching to the digit.
The committed log reproduces byte-for-byte except its own commit line. The
sentinel — the claim I was told was easiest to get wrong — survived an attack
considerably harder than the one it was built to pass. The disclosed near-miss
(0.12.0) is recorded with the right criterion, even though the mechanism it
credits does not close the hole (Finding 2). Three published claims have
imperfections, all of them conservative in direction.

The six named attacks
---------------------

### 1. "Not one label in the graph, and the serializer throws on one." — IT HOLDS.

**Attacked this way.** I did not reuse the probe's counters. I wrote my own walk
over `blockGraphs(repoRoot)` and counted at four levels — node, port, edge and
edge **section**, the last of which the probe does not count at all:

```
blocks: 48; boards: 11
nodes 398; ports 620; edges 494; input edge sections 0
LABELS: node 0; port 0; edge 0; section 0; TOTAL 0
CONTROL layoutOptions: nodes 398/398; ports 620/620
zero-size nodes (boundary): 144/398
```

**The control is real.** The same walk finds a non-empty `layoutOptions` record on
398 of 398 nodes — and, a control the probe does not publish, on **620 of 620
ports**. A walk that could not see a populated array would have returned zero
there too. So the zero is a measurement.

**The throw.** Driven at three sites rather than the probe's one: a label on a
node, on a port and on an edge each refuses, with the unlabelled graph of
`pt2399-core/pt-core` serializing to **12345 bytes** as the control, matching §2.4.

**Reachable from production, not only from a test.** `serializeElkInput` is called
at `lib/schgen/elk/graph.ts:325`, inside `elkInputOf`, which every block of every
board goes through on every generation run. It is not a test-only refusal. The
guard's scope is narrower than §2.4's wording in one respect — see Finding 6.

### 2. The sentinel. — IT HOLDS, and it holds harder than the document claims.

**Attacked this way.** I reproduced both arms and then built the third case the
brief asked for, four ways, because a single sentinel cannot distinguish "ELK did
not touch it" from "ELK coincidentally returned the input":

```
sentinel -7777777:  back 398; returned EXACTLY the input 398; (0,0) 0; other 0
sentinel -1234567:  back 398; returned EXACTLY the input 398; (0,0) 0; other 0
sentinel  4242424:  back 398; returned EXACTLY the input 398; (0,0) 0; other 0
sentinel 999999999: back 398; returned EXACTLY the input 398; (0,0) 0; other 0
asymmetric (-5555555, 8888888): back 398; returned exactly the input 398
CONTROL, same sentinel WITH the OUTSIDE hint: still at the sentinel 0; moved 398
```

Four distinct magnitudes, two of them **positive** — a positive coordinate is not
reachable by any legal placement of a label on a node at a non-negative position
with a small outside offset — and one **asymmetric** in sign between x and y. In
every case all 398 came back carrying exactly what was sent. The returned value
**tracks an arbitrary input**, which is what "ELK never wrote it" means and what
coincidence cannot produce. And the control closes the other side: the moment a
placement hint is set, **0 of 398** stay at the sentinel and all 398 move, so
ELK's placement machinery demonstrably overwrites the field when it runs.

A second, independent corroboration falls out of §2.5k's own numbers and I checked
it: arm f's graph comes back **116828961 × 77908587 µm**. ELK folded the sentinel
into the graph's bounding box. So it *read* the label and reserved space bounded by
it while never writing a coordinate — which is precisely the document's claim, and
it is visible in a figure the document already publishes.

Arm g re-derived: 398 labels back, **all 398 at (0,0)**, none with `x`/`y`
undefined. So a caller who sends no coordinate does get a position-shaped answer
back, and §2.6's "without the sentinel arm this section would have reported arm g's
(0,0) as a placement" is justified.

**One control the probe does not have, which I supplied — and the claim survives
it.** Arms e, f and g all set `elk.nodeSize.constraints: "[]"`, which the baseline
arm a does not. So "the graph grew" could have been the option rather than the
label. Isolated:

```
a  no labels, no options (baseline)   identical 48/48
a' no labels, constraints=[] ONLY     identical 48/48   <- the option alone is a no-op
g  labels, constraints=[] (no hint)   identical  0/48   wider 48  taller 40
e  labels, constraints=[] + OUTSIDE   identical  0/48   wider 48  taller 48
```

Setting the option with no labels leaves all 48 blocks byte-identical in size. The
growth in arms e and g is therefore the label. "ELK reserved space for a label it
never placed" is confirmed. The absence of that control from the probe is Finding 7.

### 3. "The obstacle is the output format, not a missing ELK feature." — IT HOLDS, and the generality check passes.

**Attacked this way.** I opened `lib/schgen/render/emit-items.ts` myself. The
citation is exact: `globalLabel` begins at line 227 and the s-expression closes at
241. Its only coordinate is `at3(l.at, angle)`. The one other positioned child is
`(property "Intersheetrefs" ... at3(refs.at, ...))`, which §2.7 names as the
exception and correctly says is not the label. There is no field anywhere in that
node for the text's own position. The `[READ]` is accurate.

**Generality.** I enumerated every emitter in that file rather than taking the
claim's scope on trust: `property` (symbol fields, line 66), `partSymbol`,
`powerSymbol`, `wire`, `junction`, `noConnect`, `globalLabel`, `pinMarkText`
(line 245), `text` (line 251), `frame`. There is **no** local `label` and no
`hierarchical_label` emitted anywhere. Every other text class — a symbol field, a
pin mark, sheet text — carries its own `(at …)`. So the format claim is narrow by
construction, and §2.7 **already scopes it correctly**: it gives three separate
answers for three classes and says of a symbol field "yes, geometrically". The
claim is not a claim about "the format" that secretly holds for one element type;
it is explicitly a claim about `global_label`, and `global_label` is the only class
this repository emits whose text has no coordinate of its own.

The supporting structural obstacle is also right. `edgesForNet`
(`lib/schgen/elk/graph.ts:240-251`) chains n terminals into n−1 two-terminal edges,
so an edge label is per segment, exactly as §2.7 says.

### 4. "It sets 0 of the 22 label-related options." — IT HOLDS. The version question is answered, and it exposes a hole in the pin.

**Attacked this way.** I re-derived the metadata against a bundle pinned by
**absolute path** into the repository's `node_modules`, so my own script could not
be the thing that drifted:

```
installed version: 0.9.3; worker sha256: 114c4f17aea4b297a2d3dd6c86bdfccb45e12040da964ea8f9766345fce4f538
knownLayoutOptions: 224; algorithms: 12; layered knownOptions: 140
ids containing label: 15; name/description only: 7; TOTAL: 22
of those 22, appearing as a literal under lib/schgen/elk: 0
CONTROL elk.spacing.nodeNode / elk.algorithm / elk.portConstraints / elk.edgeRouting: all found
```

Both numbers are the pinned tree's. `package.json` pins `"elkjs": "0.9.3"`;
`node_modules/elkjs` is 0.9.3; the committed log's own fourth line shows it resolved
from `node_modules`, and my re-run reproduced that line. The 22 is 15 + 7 and both
halves re-derive. Four controls, not three, and all four found by the same scan.

**But the pin does not cover the drift it is credited with, and I drove that.** See
Finding 2. The figures are unaffected.

### 5. The free-size price. — IT HOLDS.

**Attacked this way.** Re-derived on my own comparison of sent versus returned node
sizes, over all 48 blocks:

```
arm b free:     resized 398/398; worst 30966.9 um
arm c free+min: resized 362/398; worst 17790.0 um
```

Both figures to the digit. 30966.9 / 1270 = 24.4, so "over 24 grid steps" is right.
The claim is stated as "a different size", which is the honest form — `C1:1`'s
height **shrinks** 7620 → 2053.1 while its width grows, and §2.6 says so rather
than implying everything grew. The 362 under `nodeSize.minimum` is the figure that
carries the negative, and it is correct: pinning the symbol's box does not stop ELK
widening a node whose label is wider than its body.

### 6. The structural results at three line heights. — THE INVARIANCE HALF HOLDS; THE EXCEPTION-COMPLETENESS HALF DOES NOT.

**Attacked this way.** I parsed STEP 5j out of the committed log and enumerated
every one of the 45 (arm × quantity) cells, rather than reading the paragraph.

**Invariance: confirmed.** 39 of 45 cells are identical at all three heights, and
every structural result the document rests on is among them — arm f's 398 unplaced,
arms b and c's 398 own-body, arms d and g's 254 own-body, arm e's 266 wire
crossings, arm i's 24 wire crossings and 4 on-grid.

**Completeness: six cells vary, and the document names five.**

```
arm d  on-grid   [109, 95, 66]    named in 2.7
arm d  wire      [168, 178, 178]  named in 2.7
arm e  on-grid   [ 46, 43, 12]    NOT NAMED
arm g  on-grid   [187, 146, 136]  named in 2.7
arm g  wire      [  0,  4,  9]    named in 2.7
arm i  lbl-lbl   [  0,  5,  5]    named in 2.7, and called the exception
```

Arm e's grid legality is the unnamed one, and it is not an idle cell: it is the
figure §2.7 publishes two paragraphs above the invariance claim — *"only 12 of the
398 placed labels in arm e have a corner on a whole grid step, so 386 of them would
have to be snapped"* — inside the section whose invariance paragraph opens **"None
of this depends on which text box governs"**. Under the current model's 1270 µm
ruler those figures are 46 and 352. Finding 3.

Also verify, briefly
--------------------

- **The eight pasted blocks, driven rather than read.** All 8 ` ```elk-run ` blocks
  are exact, unique, **non-overlapping** contiguous slices of
  `tools/schgen/elk-labels/probe-run.log`, in order apart from 5k/5j, which §2
  deliberately reorders. They total **12404** of the log's 12412 bytes; the only
  unpasted bytes are eight single-newline inter-section gaps, which I printed
  individually. So "the whole run is pasted, there is no excerpt to hide anything
  in" is true. The published figure is 12396 — Finding 4.
- **Zero lines shared with §1's log**, driven over all non-empty lines of all eight
  blocks against all 55716 bytes of `tests/schgen/text-metrics/probe-run.log`.
- **The probe reproduces.** `bun run tools/schgen/elk-labels/probe.ts` at `338f31d`
  produced 12412 bytes differing from the committed log in **exactly one line** —
  `repository commit:`. Every figure in §2 is therefore live, not recorded.
- **The probe is committed and pins its input.** Both constants are checked on
  every run and the resolved install is printed in the log's third and fourth
  lines. The three `port-manifest.json` entries are provenance only: `handWritten`
  is a "not ported from the pedals tree" declaration, `tools/schgen` is a
  `DECLARED_DIR` in the completeness check, so the entries are **necessary** and
  carry no behaviour.
- **The log-section rename in `36e02e8`: confirmed, and I fired the collision
  myself.** I copied the document to the scratchpad, restored the old header
  `== WHAT THIS RUN MEASURED`, and ran the checker against the copy:
  `FAILED - the block at line 746 is fenced ```elk-run rather than ```run <section>,
  yet 1 of its lines appear in the run's log`. So the claim is driven, not asserted.
  §1's checker is green now: `document-pastes.test.ts` **16 pass / 0 fail**, and
  `verify-pastes.ts` direct reports **26 blocks, 14 VERIFIED, 12 declared NOT probe
  output, 0 FAILED**, with all eight §2 blocks listed by name. §1's blocks were not
  altered: the new document **starts with the old one byte-for-byte**, first
  differing offset 45692 = the old file's exact length. §2 is purely appended.
- **`338f31d`.** Prose only, in two places, both in §2: it deletes the assertion
  that `font.name`/`font.size` "are how a caller tells ELK what a label's text
  costs" and replaces it with what was not established, adding the matching §2.9
  bullet. No figure moved; the net diff over all four commits contains no deletion
  from the document at all.
- **G266 and the G262 amendment, against the register standard.** G266 carries
  eight numbered clauses, each with a check that could have failed and each named;
  CONFIRMED/RELAYED is stated and the RELAYED item (§1.4's 2043.1 µm) is identified;
  "why it is open" is per clause; "what would settle it" separates CRITERION from
  MECHANISM and marks each mechanism **UNTRIED**, including the unusually honest
  note on (2) that "the right behaviour when ELK legitimately grows a node is itself
  undecided, so the mechanism may be the wrong shape". It authors no acceptance
  criterion, deferring to G265(4) and G240. **The amendment sharpens rather than
  contradicts** the controller's correction: it does not repeat "the position is a
  netlist fact", and its added claim — the format gives no way to move the text
  without moving the anchor — is compatible with "the name and connection are
  netlist facts, the coordinates are not". One defect in G266, clause (3)'s
  mechanism attribution: Finding 2.
- **The two open items are honestly open.** The edge-label route is open in §2.7,
  §2.8, §2.9 and the G262 amendment, each time with the n−1 obstacle attached, and
  I verified `edgesForNet`. "KiCad connects a global label placed part-way along a
  wire was not established" is stated in §2.9 and the report, and no `.kicad_sch`
  was written in this task.
- **Suite and typecheck.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  → **3778 pass / 0 fail / 43457 expect() across 352 files** in 154.65 s. `bun run
  typecheck` clean (`tsc --noEmit`, no output). "Unchanged from HEAD" is plausible
  rather than re-driven — no test file is touched by the diff — I did not check out
  `14ed8f0` to re-count.
- **No AI attribution** in any of the four commits. I scanned bodies, authors,
  committers and `%(trailers)` for `claude|anthropic|co-authored|generated with|
  session_|noreply`: no hits. Author and committer are `oletizi <oletizi@mac.com>`
  throughout.
- **Both repositories clean**, before and after all my driving, including after a
  deliberate auto-install probe: `git status --porcelain` empty in the worktree and
  in `/Users/orion/work/pedals-work/digital-pedal-platform`.

Findings
--------

### IMPORTANT 1 — §2.7 relays as fact the premise the plan records as WRONG, in the task that amends G262. CONFIRMED.

`docs/schematic/text-handling-research.md` §2.7:

> The label's one position is `l.at`, which is the anchor — the point the wire ends
> at — and **G262** records that this is a netlist fact: KiCad connects the label
> where it is drawn. … Honouring it would mean moving the anchor, which moves the
> wire end, **which changes the circuit**.

`docs/superpowers/plans/2026-10-22-text-handling-research.md:207`, the review
finding the plan calls "most consequential" and marks ACCEPTED:

> **G262**, and the first draft of this task, said *a global label's position is a
> netlist fact, so only the side it leaves from is free.* A third-party review
> (2026-10-22) answered: **the label's NAME and its electrical CONNECTION are
> netlist facts; its drawing coordinates are not necessarily fixed by the circuit.**
> A label can move to another valid point on the same net, and this generator draws
> the wires, so it can also change the geometry that leaves no room.

The plan's state table assigns the correction to Task 5 ("**G262** is to be
corrected"), so the un-corrected G262 body is expected — but §2 is new prose written
after the correction was accepted, and it restates the corrected claim as a relay
*from* G262, without the `[CODE]`/not-a-measurement hedge G262's own Evidence clause
carries, and in the same document whose §2.9 concedes the adjacent question (does
KiCad connect a mid-wire label) was never driven.

The measured half of §2's negative does not depend on this and stands: a
`global_label`'s text has no coordinate of its own, verified at
`emit-items.ts:227-241`, so an ELK offset cannot be expressed. What does not stand
is the final clause. Moving the anchor to another valid point on the same net does
not change the circuit, by the plan's accepted correction, and this generator draws
the wires. The honest form of the obstacle is: ELK returns an **offset**, the file
wants an **anchor position**, and nothing in the generator converts one to the
other — not that honouring ELK would change the netlist.

The G262 amendment itself is clean, which makes this a document defect rather than
a register defect.

**Failure scenario.** Task 5's job is to correct G262. Task 5 reads §2.7 of the
document Task 2 just wrote, sees the corrected-wrong claim presented as a current
`[RAN]`-adjacent finding with an exact code citation behind it, and concludes the
coordinates are fixed after all. The plan's most consequential review finding is
undone by the document written after it, and the degree of freedom the review bought
— move the label to another valid point, or redraw the wire — is never pursued.

**What would settle it. CRITERION: §2.7 and §2.8 state the obstacle without
asserting that moving a global label's anchor changes the circuit, and mark any
relay of G262's "position is a netlist fact" as the claim the plan corrects at line
207.** MECHANISM, UNTRIED: replace the "which changes the circuit" clause with the
offset-versus-anchor statement and cross-reference plan line 207; two sentences, no
figure moves.

### IMPORTANT 2 — the probe's SHA-256 pin hashes a file that need not be the bundle the worker loads, so it would NOT have caught the drift G266(3) credits it with. CONFIRMED (driven).

`probe.ts`'s `pinned()` hashes
`path.join(moduleRepoRoot(), "node_modules/elkjs/lib/elk-worker.min.js")`, while the
worker is constructed from `import.meta.resolve("elkjs/lib/elk-worker.min.js")`.
`moduleRepoRoot()` (`tools/perfboard/repo-root.ts`) derives the root from **its own**
`import.meta.url`, not the caller's, so it returns the real repository root no matter
where the calling file lives. Driven from a file in the scratchpad:

```
moduleRepoRoot() from a file OUTSIDE the repo: /Users/orion/work/.../pultec-modularize
the file pinned() HASHES: .../pultec-modularize/node_modules/elkjs/lib/elk-worker.min.js
  version 0.9.3, sha256 114c4f17...   pin would PASS: true
the bundle import.meta.resolve() from THIS file would LOAD:
  file:///Users/orion/.bun/install/cache/elkjs@0.12.0@@@1/lib/elk-worker.min.js
  that install's version: 0.12.0
SAME FILE? false
```

So in exactly the situation G266(3) records — a copy of the probe outside the
repository — the hash refusal **passes** while a 0.12.0 worker is loaded. The thing
that reveals the drift is the printed `elkjs resolved from:` line, which is prose in
a log that no check reads. G266(3)'s own settlement says *"Committing it under
`tools/` achieves that; **the hash pin is what makes the failure loud**"* — the
committing is what closes it; the hash pin does not. §2.1 conflates the two the same
way.

This does not touch §2's figures. The committed probe lives inside the repository,
so the two paths coincide, and I re-derived 224 / 12 / 140 and 15 + 7 = 22 against a
bundle pinned by absolute path.

**Failure scenario.** A later agent imports `probe.ts`'s modules from a scratch
driver, or copies the probe to iterate on it, and re-takes §2's figures. The pin goes
green — it is hashing the right file — and 0.12.0's vocabulary (235 ids, 153 `layered`
options) is published under 0.9.3's name. The near-miss repeats, this time with a
guard whose entry in the register says it cannot.

**What would settle it. CRITERION: the probe refuses when the bundle it LOADS is not
the pinned one, not when a path-derived copy of it is not.** MECHANISM, UNTRIED: hash
the file behind `import.meta.resolve("elkjs/lib/elk-worker.min.js")` — the same URL
handed to `workerFactory` — instead of a `path.join` from `moduleRepoRoot()`, and
amend G266(3) to credit the commit location rather than the hash. Untried, and note
the resolve returns a `file://` URL that needs decoding before `readFileSync`, so the
one-line form may not be the right one.

### IMPORTANT 3 — the named height-dependent exception is not the only one, and the unnamed one is published as a figure in the section that claims independence. CONFIRMED (driven).

Six of 45 STEP 5j cells vary across §1's three line heights (table under attack 6).
§2.7 names five and says "all four are named rather than only the convenient ones".
Unnamed: **arm e's on-grid count, 46 / 43 / 12**. §2.7 publishes that cell's
2043.1 µm value as a load-bearing figure — *"only 12 of the 398 placed labels in arm
**e** have a corner on a whole grid step, so 386 of them would have to be snapped or
accepted off-grid"* — and three paragraphs later opens the invariance block with
"**None of this depends on which text box governs**". Under the current model's
1270 µm line the figures are 46 and 352.

The qualitative conclusion is robust: 46/398, 43/398 and 12/398 are all
overwhelmingly off-grid, so "adopting ELK's answers means snapping or accepting
off-grid" holds at every height. What does not hold is the completeness claim, and
the completeness claim is what licenses a later task to quote the number without a
height.

**Failure scenario.** Task 7 ranks the evidence and quotes "386 of 398 of ELK's
placements are off-grid" as a height-independent property, on the strength of §2.7's
own invariance paragraph. Under the ruler the model uses today it is 352 of 398. The
error is small and the direction is harmless, but the claim that made it safe to drop
the height was wrong — which is the shape this branch keeps paying for.

**What would settle it. CRITERION: every STEP 5j cell that varies across the three
heights is named in §2.7's invariance paragraph, and every figure §2 publishes from a
varying cell carries the height it was taken at.** MECHANISM, UNTRIED: add arm e's
46 / 43 / 12 to the list and the words "at 2043.1 µm" to the 12-of-398 sentence; the
"all four" count also needs fixing, since the sentence already lists five.

### MINOR 4 — the published paste-coverage figure does not reproduce; it is 8 bytes low. CONFIRMED (driven).

§2.10 and G266(5) say the eight blocks "cover 12396 of the log's 12412 bytes, the rest
being blank lines". Driven: the eight blocks are exact, unique, non-overlapping
contiguous slices totalling **12404** bytes, and the only unpasted bytes are eight
single-newline inter-section gaps, which I printed one by one. The discrepancy is
exactly 8 — one per block — i.e. a trailing-newline counting convention. The stated
explanation ("the rest being blank lines") accounts for 8 of the 16 bytes the figure
leaves unaccounted.

Direction is conservative: the blocks cover more of the log than claimed, so the
substantive point ("the whole run is pasted, there is no excerpt to hide anything in")
is understated rather than overstated.

**Failure scenario.** A later agent re-runs the coverage check the document invites,
gets 12404, and cannot tell whether 8 bytes of evidence went missing or the convention
differed — in a section whose whole purpose is to stand in for a check that cannot run.

**What would settle it. CRITERION: the coverage figure in §2.10 and G266(5) is the
number a re-run of the comparison prints.** MECHANISM, UNTRIED: state 12404 of 12412
and name the remainder as the eight inter-section newlines.

### MINOR 5 — "driven twice, at two commits, differing in exactly two lines" rests on an artifact that is not in the tree. CONFIRMED.

§2's header and G266's Evidence clause both assert it. Only one log is committed:
`04b6a1d` added `probe.ts`, `arms.ts` and `corpus.ts` with no log, and `cb35fe0`
added the single `probe-run.log` taken at `36e02e8`. The pre-rename run cannot be
inspected, so that sentence is not a check that could have failed — which is the
standard `CLAUDE.md` sets for register evidence.

The claim is almost certainly true and I have the stronger equivalent: my own re-run
at `338f31d` reproduces the committed log byte-for-byte except the `repository commit:`
line — **one** differing line at a **third** commit. That is a better sentence than the
one in the document, and it is re-drivable by anyone.

**Failure scenario.** A reviewer who tries to verify the two-line claim finds nothing
to verify and has to take it on trust, in a section that is otherwise unusually careful
about exactly that.

**What would settle it. CRITERION: every reproducibility claim in §2 names an artifact
a reader can compare.** MECHANISM, UNTRIED: restate it as "a re-run at a later commit
reproduces this log byte-for-byte except its own commit line", which the committed log
plus `bun run` establishes.

### MINOR 6 — §2.4's "no label can reach ELK by accident" is slightly wider than the guard it rests on. PLAUSIBLE.

`serializeElkInput` is called inside `elkInputOf` (`graph.ts:325`) on the graph object
it then returns. So it refuses a label present **at construction time**. A label
attached to that returned object between `elkInputOf` and the `layout` call would not
be seen by it. I confirmed the call site and that `elkInputOf` is the only builder; I
did not exhaustively trace every consumer of the returned `ElkBlockInput`, so this is
reasoned, not driven. No such mutation exists today, and the refusal does guard the
live path, which was the brief's question.

**Failure scenario.** An implementer takes §2.4's sentence as a guarantee, adds labels
in an adapter downstream of `elkInputOf`, and the manifest key silently stops
describing the input it names — which is G95's defect.

**What would settle it. CRITERION: the serializer's refusal covers every graph handed
to `elk.layout`, not only the one `elkInputOf` builds.** MECHANISM, UNTRIED: a second
refusal at the layout boundary, or re-wording §2.4 to say the guard sits at
construction. Note this is `lib/` work the research plan forbids, so re-wording is the
only move available in this task's surface.

### MINOR 7 — a published claim whose control the probe did not carry. CONFIRMED (I supplied it; the claim holds).

"ELK reserved space for a label it never placed" (§2.6, §2.8) compares arms e/f/g to
arm a, but e/f/g also set `elk.nodeSize.constraints: "[]"` where a sets nothing, so the
comparison confounds the option with the label. The plan requires every probe to carry
a control that passes and could have answered differently; this one was missing. I
drove it: no labels + `constraints=[]` leaves **48/48 blocks identical** to the
baseline, so the growth is the label and the claim stands. Recorded so the next agent
does not have to re-discover that the published arms are not minimal pairs against the
baseline.

**Failure scenario.** A reviewer or a later task notices the confound, cannot resolve
it from the committed log, and discounts the one capability finding §2 reports as a
positive.

**What would settle it. CRITERION: arm a and the label arms differ in the label alone,
or a fourth no-label arm carrying the same options is reported.** MECHANISM, UNTRIED:
add an `a'` arm — no labels, `constraints=[]` — to `ARMS`, which is a probe-only edit
inside the permitted surface.

What I drove versus what I read
-------------------------------

**Drove, all from `/Users/orion/work/audio-circuits-work/pultec-modularize`:**

- `bun run tools/schgen/elk-labels/probe.ts` — 12412 bytes, differing from the
  committed log in one line (the commit hash).
- My own independent walk of all 48 graphs via `blockGraphs`, counting nodes, ports,
  edges and edge sections, labels at all four levels, `layoutOptions` on nodes **and**
  ports, and zero-size boundary nodes.
- My own option-metadata scan against a bundle pinned by absolute path: 224 / 12 / 140,
  15 + 7 = 22, 0 set, four controls.
- The serializer refusal at node, port **and** edge; the 12345-byte control.
- Arm b and arm c resize re-derived from my own sent-versus-returned comparison.
- The sentinel attack: four distinct seeds including two positive, plus one asymmetric
  seed, plus the placement-hint control.
- Arm g's (0,0) and `undefined` counts; growth versus the **true** baseline.
- The option-versus-label isolation control the probe lacks.
- Paste-slice verification: 8 exact non-overlapping contiguous slices, 12404/12412
  bytes, every gap printed; 0 non-empty lines shared with §1's 55716-byte log.
- The claimed checker collision, fired on a scratchpad copy of the document with the
  old header restored.
- `document-pastes.test.ts` (16 pass / 0 fail) and `verify-pastes.ts` directly
  (26 blocks, 14 verified, 12 not checked, 0 failed).
- §1's bytes: the new document starts with `14ed8f0`'s copy exactly; first differing
  offset = the old length.
- The pin-coverage attack: `moduleRepoRoot()` versus `import.meta.resolve` from outside
  the tree.
- Enumeration of all 45 STEP 5j cells into varying and invariant.
- `SCHGEN_SOURCE=… bun test` and `bun run typecheck`.
- The attribution scan over all four commits.
- `git status --porcelain` in both repositories, before and after everything above
  (including after a deliberate auto-install).

**Read, not driven:**

- `lib/schgen/render/emit-items.ts` lines 52-262 — the `global_label` citation, and
  every other emitter in the file, to check the format claim's generality.
- `lib/schgen/elk/graph.ts` `edgesForNet` and line 325; `lib/schgen/elk/serialize.ts`
  `refuseUndeclared`; `tools/perfboard/repo-root.ts`.
- `tests/schgen/port-fidelity.test.ts` — `handWritten` semantics, `DECLARED_DIRS`.
- `docs/superpowers/plans/2026-10-22-text-handling-research.md` line 207 and the state
  table; `docs/known-gaps.md` G262 body + both amendments; G266 in full.
- ELK's own documentation. I did **not** retrieve `eclipse.dev/elk`, so §2.3's `[READ]`
  default table is RELAYED in this review. The two defaults the negative turns on —
  `nodeLabels.placement` empty and `nodeSize.constraints` empty — are independently
  corroborated by the option **descriptions `elkjs` itself returns** (in the driven
  log, and re-driven by me) and by §2.3's driven pairs, so nothing load-bearing rests
  on the un-retrieved pages.
- "Unchanged from HEAD" for the suite numbers: not re-counted at `14ed8f0`. No test
  file is touched by the diff.

Suite numbers I observed
------------------------

```
SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
 3778 pass
 0 fail
 43457 expect() calls
Ran 3778 tests across 352 files. [154.65s]

bun run typecheck   ->  $ tsc --noEmit   (no output, clean)

bun test tests/schgen/text-metrics/document-pastes.test.ts
 16 pass / 0 fail / 72 expect() calls

bun run tools/schgen/text-metrics/verify-pastes.ts tests/schgen/text-metrics/probe-run.log
 26 fenced block(s): 14 VERIFIED, 12 declared NOT probe output, 0 FAILED
```

Worktree clean, `/Users/orion/work/pedals-work/digital-pedal-platform` clean, nothing
committed by this review.
