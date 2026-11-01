## Task 5 report: prove round-trip fidelity on the five approved sheets

### Status

DONE.

### Files

- Created: `tests/circuits/drafted-kicad-round-trip.test.ts` — one test per board
  (`pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`,
  `pultec-mid`) that exports the drafted page with the real `kicad-cli` right
  now, inside `bun test`, and a second per-board test that is the positive
  control for it.
- Modified: `tests/circuits/drafted-sheet.ts` — added one export,
  `exportDraftedSheet(circuit, board)`: refuses (does not skip) when
  `kicad-cli` is absent, in `kicadRoundTrip`'s own wording adapted to name the
  drafted sheet; otherwise exports the drafted page with `kicad-cli` to a temp
  dir and imports the result. Nothing else in that file changed; `drafted/`,
  `lib/kicad/sheet-agreement.ts` and `tests/circuits/sheet-model.ts` were not
  touched, as instructed.

**Added after the coordinator reviewed the first pass** (see "Step 4,
revisited" below) — the Step 4 measurement found a reducible coverage loss
rather than an irreducible one, and the coordinator asked for it to be closed
rather than handed to Task 6 as a warning:

- Created: `tests/circuits/committed-schematic.ts` — `exportCommittedSheet`
  (same fail-rather-than-skip posture, adapted wording) and `expectSameCircuit`
  / `BoardUnderTest` reproduced from `tests/circuits/kicad-round-trip.ts` rather
  than imported from it, because that file is deleted with the stub writer and
  this module's point is to survive that deletion the way
  `lib/kicad/sheet-agreement.ts` survives `lib/schgen/`'s.
- Created: `tests/circuits/transistor-preamp-kicad-round-trip.test.ts` — for
  each of the five `transistor-preamp` boards, exports its **committed**
  `.kicad_sch` (not a freshly-written stub) with `kicad-cli` right now and
  asserts `expectSameCircuit` against the model, plus a positive control per
  board.

### What the new test asserts, and why that is the claim this task wanted

For each of the five boards: `modelForSheet(board)` builds the model side
(`network`, `designators`, `pinNumbers`) with no import of `lib/schgen/` or
`tools/schgen/`. `exportDraftedSheet("pultec", board)` runs `kicad-cli` on the
committed `drafted/pultec/<board>/<board>.generated-do-not-edit.kicad_sch`
right now and imports the export. `compareSheetToModel` is run twice — once
against that fresh export, once against the committed `tests/fixtures/<board>.net`
fixture — and the two `SheetAgreement` results (all six lists:
`componentIdentity`, `netMembership`, `pinIdentity`, `values`, `footprints`,
`footprintsUndeclared`) are asserted equal with `toEqual`.

This is deliberately NOT a restatement of the five per-board
`registerDraftedPageTests` guards in `tests/circuits/pultec-*.test.ts`, which
already assert each board's exact disagreement lists against the committed
fixture and do not invoke `kicad-cli` (by design — see `drafted-sheet.ts`'s
own header on why running it there would check the same thing twice). What
this file adds is the one thing `bun test` alone did not have for these five
pages: a live `kicad-cli` run on the committed sheet, proving the committed
fixture is not stale, with the same "fail rather than skip when `kicad-cli` is
absent" posture `tests/circuits/kicad-round-trip.ts`'s `kicadRoundTrip` used
for the (now-dying) stub writer.

Positive control: each board also gets a test that runs
`withOnePinMoved` (already exported by `drafted-sheet.ts`) on the FRESH export
and asserts `netMembership` becomes non-empty — proving the equality assertion
above is not the same shape whether the two sides agreed or whether neither
one looked.

**The `transistor-preamp` extension (added in the second pass).** For each of
`lab-board`, `buffered-board`, `feedback-board`, `loop-board`, `staged-board`:
`exportCommittedSheet` runs `kicad-cli` on the board's own **committed**
`circuits/transistor-preamp/<stem>.kicad_sch` — the file its `perfboard.json`
already declares as `"sch"` and `make check`'s `netlist-agrees` already
reconciles — right now, inside `bun test`, and `expectSameCircuit` compares
the result against the model through `toImportedNetlist`'s VeroRoute
vocabulary (net partition, per-designator value, per-component footprint),
**not** `compareSheetToModel`: these boards have no off-board parts, so the
Pultec-specific comparison would be the wrong vocabulary, as
`committed-schematic.ts`'s header states. Positive control per board: perturb
the fresh export with `withOnePinMoved` and assert `expectSameCircuit` throws.
**Verified, not assumed, that the control fails for the right reason**: a
scratch run against `lab-board` and `staged-board` showed the unperturbed
export agreeing cleanly and the perturbed one throwing on an actual partition
mismatch (printed diff: a pin moved from one net's member list into another's)
rather than on `withOnePinMoved`'s own "fewer than two multi-pin nets" guard
(18 multi-pin nets were available on `lab-board` alone).

### Gates run (serially, per the global constraint)

**First pass (Pultec-only proof):**
- `bun run typecheck`: clean.
- `bun test tests/circuits/drafted-kicad-round-trip.test.ts`: 10 pass, 0 fail.
- `bun test` (full suite, alone): 4119 pass / 8 fail (baseline 4109/8, same 8
  `port-fidelity` cases, +10 new passes, no new failures).
- `make check` (alone): fails on exactly `pt2399-core`, `transistor-preamp-lab`,
  `transistor-preamp-loop`, `transistor-preamp-staged`; all five Pultec `ok`.
- Five drafted digests unchanged (`a1fa4159…`/`e9843e6d…`/`b9e42e6a…`/
  `5e1a4139…`/`d4b0b8cc…`).

**Second pass (after adding the `transistor-preamp` extension), re-run serially
from a clean tree:**
- `bun run typecheck`: clean.
- `bun test tests/circuits/transistor-preamp-kicad-round-trip.test.ts`: 10 pass,
  0 fail.
- `bun test` (full suite, alone): **4129 pass / 8 fail** — same 8
  `port-fidelity` cases by name; +10 more passes than the first pass's 4119
  (the 5 boards × 2 new tests), no new failures anywhere.
- `make check` (alone, run after `bun test` finished — never concurrently):
  fails on exactly the same four boards (`pt2399-core`, `transistor-preamp-lab`,
  `-loop`, `-staged`); all five Pultec boards and both
  `transistor-preamp-buffered`/`-feedback` `ok`.
- Five drafted digests re-hashed again: unchanged, same five prefixes.
- `git status --porcelain` after each pass showed only the files this task
  added/modified — nothing under `drafted/` ever appeared.

### Step 4 — what `transistor-preamp` has today through the stub writer, and what it keeps after Task 6

**Revised.** The first pass of this measurement (below, left intact as the
record of what was found) concluded the loss was irreducible. The coordinator
checked that conclusion against the actual files — all five boards have a
committed, real `.kicad_sch`; all five export `DESIGNATORS`;
`expectSameCircuit`'s comparison machinery (`toImportedNetlist`) lives under
`lib/kicad/`, not `lib/schgen/`, and survives — and found the loss was in fact
reducible: what dies is the SUBJECT (a freshly-written stub) and the one
caller that writes it, not the comparison, and not the sheet. **It has been
closed**, with `tests/circuits/committed-schematic.ts` and
`tests/circuits/transistor-preamp-kicad-round-trip.test.ts` (see Files and
Gates above). The corrected conclusion is in the new final paragraph below;
the superseded one is kept, struck through in spirit but not in fact, because
the measurement that produced it was the point of this step and the
correction is only legible next to what it corrects.

**The five boards and their two kicad-cli-adjacent tests.** Every one of
`tests/circuits/transistor-preamp-{lab,buffered,feedback,loop,staged}.test.ts`
carries exactly two tests built on `tests/circuits/kicad-round-trip.ts`:

1. **`"KiCad reads the generated stub as the same circuit"`** (30s timeout).
   Calls `kicadRoundTrip(BOARD, stem)`, which:
   - calls `writeSchematicStub(...)` — **`lib/kicad/schematic.ts` itself** —
     to synthesize a fresh `.kicad_sch` from the board's current `Network`,
     `designators`, `pinNumbers` and `notes`, in a temp dir, **right now**;
   - runs the real `kicad-cli` on that just-written file, right now, inside
     `bun test`;
   - imports the result and calls `expectSameCircuit(exported, BOARD)`, which
     asserts three things about what `kicad-cli` read off the fresh stub:
     - **net-membership partition** equality (`partition(exported)` vs.
       `partition(toImportedNetlist(network, designators, pinNumbers))`) —
       the stub's wiring, as `kicad-cli` reads it, matches the model, net
       names ignored;
     - **per-designator value** equality (`valuesOf(exported)` vs.
       `valuesOf(ours)`);
     - **per-component footprint** equality, one assertion per component in
       the network (`footprints.get(designator)` vs. `component.part?.footprint`,
       including components that declare none).
   This is the only place, for these five boards, where `kicad-cli` runs on
   something freshly generated from the live model, inside `bun test` alone,
   with no dependence on `make check` having been run first. It is the direct
   analogue of what Task 5 built for the five Pultec boards, except it
   generates its own throwaway schematic from the model instead of reading an
   approved page, because these boards have none.

2. **`"the schematic's netlist export describes the same circuit as the model"`**.
   Reads the **committed** `tests/fixtures/transistor-preamp-<board>.net` as a
   static file (`Bun.file(...).text()`), imports it, and runs the same
   `expectSameCircuit` three assertions against it. **Calls no `kicad-cli` and
   calls `writeSchematicStub` nowhere** — its only tie to the file being
   deleted is that `expectSameCircuit`/`BoardUnderTest`/`partition`/`valuesOf`
   currently live in `tests/circuits/kicad-round-trip.ts`, which Task 6's file
   list deletes alongside the stub writer, not because this test's logic
   needs the writer.

**The surrounding mechanism, which matters for what survives.** Each of these
five boards' `perfboard.json` declares both `"sch"` (a `.kicad_sch` committed
under `circuits/transistor-preamp/`, itself prior stub-writer output, checked
into the repo — not an agent-drawn `drafted/` page) and `"netlist"`
(`tests/fixtures/transistor-preamp-<board>.net`). `make check`'s
`netlist-agrees` target re-exports that committed `.kicad_sch` with `kicad-cli`
on every run and reconciles the fixture BY CONTENT
(`tools/perfboard/netlist-sync.ts`) — exactly the same mechanism the five
Pultec boards use against their `drafted/` pages. **This mechanism is
untouched by Task 6** (it never imported `lib/kicad/schematic.ts`; it just
re-exports whatever `.kicad_sch` bytes are already committed), so it keeps
running after the stub writer is deleted. But it only keeps the *fixture*
mechanically fresh against the *committed sch file* — it does not compare
either one against the *model*. The model-vs-schematic comparison is test 2
above, and test 2 does not invoke `kicad-cli` itself; it trusts `make check`
to have freshened the fixture first.

**What Task 6 must delete, and what that leaves.** Test 1 directly calls
`writeSchematicStub`, so it cannot survive `lib/kicad/schematic.ts`'s deletion
and must be the one Task 6's own instruction (*"the test is deleted with a
comment in the file saying what it proved and that Task 5's drafted-page round
trip is the remaining proof"*) is written for. **That comment's claim will be
false for these five boards specifically**, and the brief for Task 6 should say
so rather than imply coverage transferred: Task 5's drafted-page round trip
covers only `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`,
`pultec-low-cut` and `pultec-mid` — the five boards with an approved page under
`drafted/`. None of the five `transistor-preamp` boards has one (four have no
`SchematicAuthoring` declaration at all, and `generate` refuses `lab`'s — see
`tests/circuits/stub-writer-tripwire.test.ts`'s own header), so there is
nothing under `drafted/` for `exportDraftedSheet`/`compareSheetToModel` to be
pointed at for any of them.

**The net coverage change, as first measured (SUPERSEDED — see below).** Before
Task 6: five boards each have one test, inside `bun test` alone, that
regenerates a schematic from the live model and proves real `kicad-cli` reads
it exactly as the model means it (three assertion shapes: net membership,
values, footprints) — independent of whether `make check` has ever run. After
Task 6: that test is gone and nothing replaces it for these five boards. They
keep test 2 (model vs. the committed fixture, no live `kicad-cli` call) and
they keep `make check`'s mechanical fixture-freshening against the committed
`.kicad_sch` — the same two-tier structure Pultec's `drafted-sheet.ts` header
already describes and accepts for itself (*"run alone, ... a stale fixture
passes it. `make check` is where the freshness comes from"*) — but, unlike
Pultec, they gain no Task-5-style third tier that runs `kicad-cli` on a
committed, approved artifact inside `bun test` alone.

**This conclusion was wrong about being irreducible, and the coordinator caught
it on review.** It correctly measured that Test 1 needs the stub writer and
cannot survive its deletion. It incorrectly treated "these boards have no
`drafted/` page" as equivalent to "these boards have nothing Task 5's kind of
proof can run against" — but the thing Task 5's proof actually needs is *any*
committed schematic plus a comparison built for that schematic's vocabulary,
and these five boards have exactly that: a committed `.kicad_sch` under
`circuits/transistor-preamp/`, and `expectSameCircuit`'s `toImportedNetlist`
comparison, which never imported the stub writer and was never going anywhere.

**The corrected conclusion.** After Task 6: Test 1 (stub-writer-dependent) is
still gone, with nothing to replace it **at that exact description** — no test
will again write a *fresh, throwaway* stub from the live model and export
that. But `tests/circuits/transistor-preamp-kicad-round-trip.test.ts` (this
task, second pass) now gives each of the five boards a `bun test`-time, live-
`kicad-cli` proof against the schematic they actually keep — the same three
assertion shapes (net membership, values, footprints), run against the
**committed, real** `.kicad_sch` rather than a throwaway stub, which is a
truer claim about what ships than the stub ever was. **The coverage is not
reduced**: these five boards now have a `bun test`-time, live-`kicad-cli`,
model-vs-schematic proof exactly as the five Pultec boards do, each pointed at
the real artifact the board keeps (an approved `drafted/` page for Pultec; a
committed in-tree `.kicad_sch` for `transistor-preamp`), through whichever
comparison is honest for that artifact's vocabulary (`compareSheetToModel` for
Pultec's off-board parts; `expectSameCircuit`/`toImportedNetlist` for
`transistor-preamp`'s ordinary VeroRoute designators). Task 6's brief can
state this directly rather than hedge: deleting Test 1 from each of the five
`transistor-preamp-*.test.ts` files loses nothing that this task's second pass
does not already replace.

`tests/circuits/stub-writer-tripwire.test.ts` (also deleted by Task 6) is a
separate tripwire on the deletion precondition itself (`generate` still
refuses every candidate preamp board), not a model-agreement assertion; it
carries no coverage for `expectSameCircuit`'s three claims and is not counted
above.

### Commit

- `002175a` — "Move the kicad-cli round-trip proof onto the five drafted
  Pultec pages" (`tests/circuits/drafted-kicad-round-trip.test.ts`,
  `tests/circuits/drafted-sheet.ts`).
- `dec1009` — "Close the transistor-preamp coverage gap the stub writer's
  removal would leave" (`tests/circuits/committed-schematic.ts`,
  `tests/circuits/transistor-preamp-kicad-round-trip.test.ts`).

Both on branch `feature/schematics-tooling`, both pushed. `git status` clean
before each commit except the files listed for it.

### Concerns

- None outstanding. The one concern the first pass raised — that the
  coverage reduction was load-bearing for Task 6's brief and would need to be
  stated there explicitly — is moot: the coverage is closed, not reduced, so
  Task 6's brief needs no such caveat. Task 6's own instruction ("delete [Test
  1] with a comment saying what it proved and that Task 5's round trip is the
  remaining proof") is now literally true for all ten boards, Pultec and
  `transistor-preamp` alike, each pointed at the comparison honest for its own
  vocabulary.
- `tests/circuits/committed-schematic.ts` reproduces (does not import)
  `kicad-round-trip.ts`'s `expectSameCircuit`/`BoardUnderTest`/`partition`/
  `valuesOf`, because that file is deleted in Task 6 and this module's point
  is to survive that deletion. The two copies are byte-for-byte the same logic
  today; if `kicad-round-trip.ts` is edited before Task 6 lands, the two could
  drift silently until Task 6 deletes the original. Worth a one-line note in
  Task 6's dispatch rather than a structural fix now, since Task 6 deletes the
  original within the same plan.
- No fallbacks, no `any`/`as`/`@ts-ignore` introduced, no `#` in any heredoc or
  quoted argument, no control-character escapes typed, no hook bypassed, no
  file under `drafted/` touched, positive controls verified (not assumed) to
  fail for the right reason on at least two of the five `transistor-preamp`
  boards.
