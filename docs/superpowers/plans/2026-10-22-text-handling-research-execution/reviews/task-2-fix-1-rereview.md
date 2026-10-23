# Task 2 — fix round 1 + 2, scoped re-review

**Scope.** The nine named items only, plus a hunt for defects the fixes introduced. Not a fresh
review of Task 2. BASE `338f31d`, HEAD `593f29e`, four commits
(`c2860e5`, `053dfb2`, `b6876c7`, `593f29e`).

**VERDICT: ALL NINE ADDRESSED.** One NEW finding (minor, and of exactly the class IMPORTANT 3
closed — a published figure that moves with the line height, in a column the new enumeration does
not sweep). Five further observations, none blocking.

**What I re-drove rather than relayed.** The drift scenario in both directions, from a scratch
location, including the probe's own `pinned()`; the whole probe, byte-compared to the committed log;
the line accounting; the `cb35fe0` git object and the arms a–i comparison; arms j and k; the
height sweep of the four columns the probe does *not* sweep; arm **c**'s missing control, which
nobody had run; six RED perturbations of §2's blocks through the real checker; the full suite;
`typecheck`; `kicad-cli`; the commit range's attribution.

---

## Suite, typecheck, tools

| | result |
| --- | --- |
| `SCHGEN_SOURCE=.../tools/schgen bun test` | **3785 pass / 0 fail / 43482 expect() across 352 files** (151.77 s) — matches the implementer's figure to the digit |
| `bun run typecheck` (`tsc --noEmit`) | clean, exit 0 |
| `bun test tests/schgen/text-metrics/document-pastes.test.ts` | 23 pass / 0 fail / 97 expect() — the new §2 cases are registered and run (16 + 7) |
| without `SCHGEN_SOURCE` | `tests/schgen/port-fidelity.test.ts` → **8 fail / 4 pass**: the port-fidelity guard FAILS rather than skips, as the plan requires |
| `kicad-cli` | not on `PATH`; resolved at `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`, `version` → **10.0.5** |
| AI attribution in `338f31d..593f29e` | **none.** `git log --format='%H%n%an <%ae>%n%B'` over the range, grepped case-insensitively for `co-authored`, `claude`, `session`, `generated with`, `anthropic`, `noreply` → no match |
| worktree / sibling repo | both `git status --porcelain` empty. The sibling `digital-pedal-platform` was read only (as `SCHGEN_SOURCE`) and is unmodified |

---

## I-1 — §2.7 relayed the premise plan line 207 records as WRONG — **ADDRESSED**

**Check (CONFIRMED, every site, not only the one quoted).** `grep -n "netlist fact\|netlist-fact\|changes the
circuit\|change the circuit"` over `docs/schematic/text-handling-research.md` and
`docs/known-gaps.md` → 20 hits. Read each:

| site | state |
| --- | --- |
| research doc 1161–1181 | the correction itself: quotes the deleted clause, quotes plan line 207 verbatim, links the plan, names the three freedoms + the generator's fourth, ends *"Any citation of G262's netlist-fact framing, here or anywhere, is a citation of the claim plan line 207 corrects."* |
| research doc 1268 | §2.8's global-label row: G262 cited *"only for the board counts"*, marked as the claim the plan corrects at line 207 |
| research doc §2.8 closing summary | now *"a label whose only coordinate in the emitted form is its anchor"*, followed by *"'Its only coordinate is its anchor' is NOT 'its position is fixed by the netlist'"* |
| research doc §2.9 | explicit non-establishment: *"It says nothing about whether a global label's ANCHOR may move"* |
| known-gaps 1414 (G259 body) | original paragraph, with the forward pointer immediately under it — see **R21** |
| known-gaps 1421, 1519, 1528, 1557, 2250 | all inside corrections (G259's amendment, G262's amendment, G266) |
| known-gaps 1775/1785 (G262 body) | the body claim, hedged in its own Evidence bullet (*"is `[CODE]`… and is NOT a measurement of KiCad's behaviour"*) and corrected by this entry's own 2026-10-22 amendment 50 lines below |
| known-gaps 1827–1838 | G262's amendment, which quotes its own wrong sentence and corrects it |

The only surviving `"changes the circuit"` in the research document is inside the quotation of the
deleted clause. **The measured half is intact and is what I read in the source**: `[READ]`
`lib/schgen/render/emit-items.ts` emits one `(at …)` for a `global_label`; the correction does not
touch that.

**Judgement on the one asymmetry.** G262's body paragraph (1775) is the only netlist-fact statement
without a pointer *at the paragraph*, where G259's got one. Its correction is in the same entry and
its own Evidence bullet already hedges it, and the controller ruled this closed in round 2
(*"1708/1718 are G262's body and its `[CODE]` hedge, closed by G262's own amendment"* — same lines,
shifted by round 2's insertions). I record it rather than reopen it: if G259 needed a pointer
because a scoreboard reader may not reach the end, G262 is also long and carries three amendments.

## I-2 — the SHA-256 pin hashed a file that need not be the bundle loaded — **ADDRESSED**

**Driven myself, both directions, from the scratchpad (CONFIRMED).**

1. `scratchpad/drift.ts` — a file outside the repository that imports the repository's own
   `moduleRepoRoot` (which derives its answer from *its own* module url, so it still returns the
   repo root) and resolves `elkjs` for itself:

   ```
   LOADED   /Users/orion/.bun/install/cache/elkjs@0.12.0@@@1/lib/elk-worker.min.js
            version 0.12.0  sha256 e4f5c51c…b030
   OLD PIN  <repo>/node_modules/elkjs/lib/elk-worker.min.js  0.9.3  114c4f17…f538  -> PASSES
   NEW PIN  (the file behind the URL handed to workerFactory)                       -> REFUSES
   SAME FILE? false
   ```

   The reviewer's finding reproduces exactly, and the new rule refuses it.

2. **The probe's own `pinned()`, not a replica.** I copied `probe.ts` into the scratchpad with only
   its relative imports rewritten to absolute repository paths, so `import.meta.resolve` resolves
   from the scratch location. It throws, naming the loaded bundle:
   *"The bundle it would LOAD is /Users/orion/.bun/install/cache/elkjs@0.12.0@@@1/… version 0.12.0
   …"*. **The guard can fail in the scenario it is credited for.**

3. **The legitimate case still passes, and more than passes.** `bun run
   tools/schgen/elk-labels/probe.ts` at HEAD: exit 0, and `diff` against the committed
   `probe-run.log` shows **one line** different — its own `repository commit:` line
   (`053dfb2…` vs `593f29e…`). Every figure in §2 re-drives byte-for-byte at HEAD.

**Documentation half also done** (and the criterion only asked for one): §2.1 names *"what was
doing the real work all along is WHERE the probe is committed"* with the hash as a second lock, and
G266 clause 3 carries the same plus the transferable shape. The log line now reads *"the bundle this
run LOADS, hashed: SHA-256 …"*.

## I-3 — the height-dependent exception list was incomplete — **ADDRESSED** (see the NEW finding)

**The enumeration is COMPUTED, not a hand-written list dressed as a computation (CONFIRMED by
reading `probe.ts:334-373` and by my own run).** `METRICS` is a named array of five accessors; the
sweep runs every arm at every `LINE_HEIGHTS` entry through the same `runArm` the main table uses;
the cell total is printed as `ARMS.length * METRICS.length`; invariance is decided by
`v.every(x => x === v[0])`; and a cell holding the wrong number of heights **throws**. Nothing is
keyed off a literal list of arm names. The three heights are distinct (1270 / 1422.4 / 2043.1), so
the comparison range is not empty.

My run: `cells (arm x metric): 55; INVARIANT: 49; VARYING: 6`, with
`d/wire 168/178/178`, `d/on-grid 109/95/66`, `e/on-grid 46/43/12`, `g/wire 0/4/9`,
`g/on-grid 187/146/136`, `i/lbl-lbl 0/5/5`. Arm **e**'s on-grid cell — the one the old list omitted
— is present.

**The quoted figure now carries its ruler**: §2.7 reads *"the number whose corner lands on a whole
grid step is 46 at the current model's 1270 µm line, 43 at the rendered ink's 1422.4 µm, and 12 at
`GetTextBox`'s 2043.1 µm — so between 352 and 386 of 398 would have to be snapped or accepted
off-grid"*, with the clause saying all three are given because the cell is one of the six that move.
Arithmetic checks: 398−46 = 352, 398−12 = 386. The named-count/list-length mismatch is gone: the
count is a printed figure (6) and the list has six entries. *"all four are named"* survives only
inside the paragraph that corrects it.

## MINOR-4 — the byte figure — **ADDRESSED**

**The accounting reproduces (CONFIRMED).** `tools/schgen/elk-labels/probe-run.log` is 13838 bytes;
`split("\n")` → **117** elements; `== ` headers **8**; blank elements **9**; content lines **100**;
8 + 9 + 100 = 117. I re-extracted the document's eight `elk-run` blocks and counted **100** quoted
lines, every one of them present in the log. The old `12396` is gone from both files.

Note for the record: `wc -l` reports **116** (the file has 116 newlines and ends with one). The
document says so explicitly — *"the eight separators between sections and the file's trailing
newline"* — so the 117 is accounted for rather than off by one.

## MINOR-5 — the two-run claim — **ADDRESSED**

**The git object exists and the claim holds (CONFIRMED).** `git show
cb35fe0:tools/schgen/elk-labels/probe-run.log` → exit 0, 12412 bytes, nine arms (a–i). The current
log carries eleven (a–k). I compared the arm rows mechanically: **arms a–i are byte-identical
between the two logs.** G266's evidence line carries the same claim and says what round 0 did wrong.

## MINOR-6 — §2.4's wording — **ADDRESSED**

§2.4 now says the refusal fires *"when a graph is serialized"*, that `elkInputOf` serializes every
graph it builds so a labelled graph cannot be **constructed** through this repository's own path
without the throw, and then plainly that it is **not** a guarantee that no label can ever reach ELK,
naming the post-return mutation and noting that is exactly what the arms do. *"No label can reach
ELK by accident"* survives only as the quoted earlier draft. The reachability-from-production point
is kept.

## MINOR-7 — the arms are not minimal pairs — **ADDRESSED, and arm k genuinely fails**

**Both arms driven by me, from my own probe run (CONFIRMED):**

- **arm j** (`nodeSize.constraints: []` + OUTSIDE hint, no label): `0/48` blocks moved, 0 resized,
  and in STEP 7 the graph is `162306.0 x 133354.0` — byte-identical to the baseline. The control
  passes, so arms d–g's growth is the label's.
- **arm k** (`[NODE_LABELS]` + INSIDE hint, no label): **254 resized, worst 33020.0 µm, 48/48 blocks
  moved**, and `pt-core`'s `C1:1` comes back `0.0x0.0` with no label present. **Fails exactly as
  reported.**

The pair is well constructed: arm k failing is itself the proof that arm j's range was not empty —
the same shape of control *can* come back red.

**Where the failure is published, which is the half the brief asked me to check.** §2.5 and §2.6
carry it, §2.9 lists *"It did not separate the option's effect from the label's in arms b and c"*
among the non-establishments and names the third arm that would, and **G266 clause 9** records both
arms with the criterion met for d–g and explicitly **not met** for b–c, closing with *"a control
that lives only in a review is a control nobody can re-drive … and the control that FAILED would
never have been written at all if the reviewer's passing one had been taken as covering the whole
table."* A later task reading either file meets the failure before it could cite arms b or c.

## R17-DEVIATION — §2 held to §2's own log — **ADDRESSED, deviation sound, teeth confirmed**

**The deviation is minimal and the claim about it is true (CONFIRMED by reading and by grep).**
`verify(doc, logText, runMarker = DEFAULT_RUN_MARKER)`; `DEFAULT_RUN_MARKER = RUN_MARKER`. Every
call site: 16 two-argument calls in §1's describe (unchanged), three three-argument calls in §2's,
and the CLI taking an optional third `process.argv[4]`. No call became multi-log — the
`runs !== 1` refusal is untouched and still counts a single marker.

**I drove the teeth myself through the real checker, in memory, on blocks the suite's own RED cases
do not touch:**

| perturbation | result |
| --- | --- |
| as committed | 8 verified of 9 blocks, 1 notOutput (the `sh` block), **0 failures** |
| STEP 6: `55` → `56` | **RED**, *"not a contiguous slice of section \"STEP 6: …\""* |
| STEP 5: arm k's `33020.0` → `33021.0` | **RED** |
| STEP 7: arm b's `177950.0` → `177951.0` | **RED** |
| STEP 4's body replaced by STEP 3's (a genuine slice of the same log) | **RED**, *"is not a contiguous slice of section"* |
| CONTROL: §2's blocks against §1's log | 9 failures, *"the log holds 0 run(s)"* — it does not accidentally verify |
| CONTROL: §2's log with §1's default marker | 1 failure, *"the log holds 0 run(s)"* — the marker is load-bearing and the default is not silently satisfied |

**No §2 block silently stopped being checked across the STEP 5j→6 / 5k→7 rename.** The document
holds exactly **8** `elk-run` fences (`WHAT THIS ELK LABEL RUN MEASURED`, STEP 1–5, STEP 7, STEP 6),
the log holds exactly **8** `== ` sections, the test pins `SECTION_2_BLOCKS = 8` and asserts
`v.verified === 8`, and my run reports 8 verified with each block anchoring to exactly one section —
`verify()` itself refuses a block whose prefix matches 0 or 2 headers. The last `run` (§1) fence in
the document is at line 580 and §2's heading is below it, so the `d.slice(§2 heading)` slice cannot
swallow a §1 block or leave a §2 one outside. The rename was necessary rather than cosmetic:
`STEP 5` as a prefix would have matched three headers and no block could have anchored.

## R21 — G259's netlist-fact paragraph and its sides mechanism — **ADDRESSED**

**It meets the criterion.** A reader who reaches the paragraph cannot take it as current: the
forward pointer is a block quote **immediately under it**, naming plan line 207, saying the
four-candidate side search rests on the corrected premise, and saying why the paragraph is left as
written. A reader who reaches the end of the entry meets the full amendment, which quotes the
paragraph and line 207 verbatim, names the three freedoms plus the generator's fourth, marks the
mechanism as resting on a corrected premise (*"with the anchor movable the candidate set may be
wider than four"*), and deliberately offers no replacement mechanism.

**The scoreboard is untouched, and this is a fact about the commit rather than a reading:**
`593f29e` is `docs/known-gaps.md | 67 ++++++++…`, **67 insertions and 0 deletions**. No row, figure
or criterion in G259 could have changed. The amendment authors no criterion of its own and points at
G240's.

---

# NEW FINDING

## N-1 (minor, same class as I-3) — the computed completeness covers 5 of STEP 5's 9 columns, and a figure in a column it does not sweep DOES move with the line height

**What I drove.** `METRICS` in the sweep is `unplaced`, `lbl-lbl`, `own-body`, `wire`, `on-grid` —
five of the nine columns STEP 5 publishes. Not swept: `sent/back`, `resized (worst µm)`,
`blocks moved`, `lbl-other-body`. So I ran all eleven arms at all three heights myself, measuring
exactly those columns (worker hashed to §2's pin first, so this is the same ELK):

```
                     1270.0            1422.4            2043.1
b  resized 398  worst 31740.0     31587.6           30966.9     moved 48/48
c  resized 362  worst 17790.0     17790.0           17790.0     moved 48/48
d-g resized 0   worst 0.0          0.0               0.0
k  resized 254  worst 33020.0     33020.0           33020.0     moved 48/48
other-body 0 everywhere
```

Two consequences, one benign and one not:

- **The published sentence is TRUE.** *"0 nodes resized in **d** through **g**"* holds at all three
  heights, as does arm k's 33020.0 and arm c's 17790.0. Nothing published is wrong.
- **But arm b's worst resize MOVES: 31740.0 / 31587.6 / 30966.9.** G266 clause 2 publishes
  *"398 of 398 nodes come back a different size, **the worst by 30966.9 um - over 24 grid steps**"*
  with no height named, and §2.7's enumeration paragraph ends *"**Nothing else moves**"* while G266
  clause 8 says *"**Every** structural finding … holds at all three heights"* and lists *"0 nodes
  resized in the fixed-size family"* — a quantity the enumeration does not compare. At the current
  model's 1270 µm line the worst resize is 31740.0 µm, which is **exactly 25 grid steps**, not
  *"over 24"*.

**Failure scenario, which is I-3's own.** Task 5 or Task 7 cites 30966.9 µm (or `blocks moved`, or
`resized`) as height-independent on the strength of *"nothing else moves"* and a completeness claim
that is, by construction, only about five metrics. That is precisely what *"only 12 of 398"*
invited, surviving in the four columns the fix did not sweep.

**What would settle it** — CRITERION, which is the brief's own and not mine: the completeness claim
names the quantities it is complete over, OR the sweep covers every column STEP 5 publishes.
MECHANISM (mine, not binding, and I have not tried it): add `resized`, `worstResize` and the
blocks-moved comparison to `METRICS`; the cell count then prints 8 × 11 = 88 and arm b's
worst-resize appears in the varying list. A reader of G266 clause 2 would also need the height
beside 30966.9.

---

# FURTHER OBSERVATIONS (not defects; recorded so nobody re-derives them)

**O-1. Arm k is arm b's option set, not arm c's — and I ran c's missing control.** k sets
`[NODE_LABELS]` + INSIDE; arm c sets `[NODE_LABELS, MINIMUM_SIZE]` plus a per-node
`nodeSize.minimum`, which k does not. So k is labelled *"the control for arms b-c"* but is strictly
b's. I built c's own control (c's options, no label) and drove it: **144 resized, worst 20.0 µm,
46 of 48 blocks moved** — it fails too. **The published conclusion holds for both rows**, and is now
driven for c rather than inferred from b. Nothing to change; this is the measurement a later agent
would otherwise have to take.

**O-2. R17's teeth cover the pasted blocks, not §2's prose figures.** I edited the prose sentence
`46 at the current model's 1270 µm line` → `99 at …`, outside any fence: **0 failures**. §2.10 is
honest about this (*"It cannot tell whether the right output sits under the right prose"*), but
G266 clause 5's one-liner *"a figure edited in §2 breaks the suite"* is looser than the guard, and
it bounds the brief's claim that R17 *"makes Importants 1 and 3 enforceable"*: I-3's three values
live in prose, and only their appearance inside the STEP 6 block is held to the log.

**O-3. Deleting a whole §2 block is not a `verify()` failure.** Removing STEP 4's fence and body
gives `verified 7 / blocks 8, 0 failures` from the checker. It is still caught — the test pins
`SECTION_2_BLOCKS = 8` and asserts `verified === 8` — but the catch lives in the test, not in the
checker, so a future second call written without those two assertions would lose it.

**O-4. G266 clause 3's 0.12.0 figures (235 ids / 11 algorithms / 153 `layered` options) are no
longer re-drivable through the committed probe** — by design, since it now refuses that bundle. The
*mechanism* is re-drivable and I did re-drive it (a scratch resolution lands on
`elkjs@0.12.0@@@1`); the three counts rest on round 0's scratch run. Low cost, worth knowing before
someone quotes them.

**O-5. The log pins `053dfb2` and was committed two commits later at `b6876c7`.** The coupling the
test enforces is document-pin == log-commit, which holds, and my re-drive at `593f29e` reproduces
the log byte-for-byte except that line — so nothing behavioural drifted in between. Also: the log's
header prints an absolute user path (`file:///Users/orion/…/node_modules/elkjs/package.json`), now
committed. Harmless, but it is machine-specific text inside an artifact a test compares literally
(the test matches on the prefix only, so it does not break elsewhere).

**Attack surface I looked for and did NOT find:** a guard whose test range is empty (the three line
heights are distinct; arm k proves arm j's control could have failed); a control returning the
treatment's answer (both controls carry the treatment's options and no label, and one fails); an
assertion comparing a value to itself (the fence-mapping test compares `parseBlocks(slice)` against
`parseBlocks(mapped)` — different inputs, bodies only); a figure with no committed log behind it
(all 100 quoted lines are in the log, and every §2 prose figure I spot-checked — 266, 254, 12345
bytes, 445010/162306 = 2.74, 352/386 — resolves to the log or to arithmetic on it); evidence resting
in a gitignored directory (the only `.superpowers/` mention added in the range is rhetorical); a test
registered nowhere (the new cases run: 23 in that file); a renamed log section orphaning a block
(8 fences ↔ 8 sections, all anchored, all verified).
