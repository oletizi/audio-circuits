# SDD ledger — plan: docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide.md

Spec: docs/superpowers/specs/2026-10-26-schematic-in-the-build-guide-design.md (read; it is the binding authority)
Branch: feature/schematics-tooling. Base at start: cb4311c
Scope this run: Tasks 1-4. Tasks 5-6 are an owner-facing drawing loop, handled in-session.

Suite baseline: `Ran 3872`, 0 fail, with
SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen

## Pre-flight scan

### Pairs sharing a file or an interface

| pair | produced -> consumed | finding |
| --- | --- | --- |
| T1 -> T2 | `wireGeometry(wires): WireGeometry`, `{crossings, corners, segments}` | CLEAN. T2's code reads exactly those three fields. |
| T1 -> T4 | none | CLEAN. No shared file. |
| T2 -> T3 | T3 modifies `tools/schgen/board-geometry.ts` to use the shared resolver | **CONFLICT 1.** T2 detects a refusal with `try/catch` around `generate`; T3's resolver returns `{kind:"refused", reason}` instead. T3's step list never says to convert T2's catch block. |
| T2 -> T4 | none | CLEAN. Both read `SheetDrawing`, neither writes the other's files. |
| T3 -> T4 | `generatedSheetFor(boardName, outDir, repoRoot, env)` | **CONFLICT 2.** T4 calls it from `writeGuidePacket`, which holds a `PerfboardDeclaration` and `GuideDeps` — not a board name, an outDir, or a `GenerateEnv`. The plan never says how T4 obtains the three. |
| T3 -> T3 | `board-sheets.ts` and `board-geometry.ts` both move to the resolver | CLEAN, given CONFLICT 1 is ruled. |
| T4 -> T5/T6 | the packet gate | CLEAN. T5 changes arrangement, not the gate. |

### Each task against itself

| task | finding |
| --- | --- |
| T1 | CLEAN. Traced all five test cases against the implementation by hand: crossing interior (1), same-net (0), endpoint touch (0 — `between` is strict), corner turn (1), straight run (0 — same-axis pairs skipped), segments. Test and code agree. |
| T2 | CLEAN once `WireGeometry` is imported alongside `wireGeometry`; the Interfaces block names both. |
| T3 | CLEAN. Verification is a diff of before/after census output with the `wrote <path>` lines filtered, which is correct — the outDir is a fresh temp dir per run. |
| T4 | CLEAN. `GuideInput` and `GuideSchematic` are both exported from `tools/guide/guide.ts`; `GuideImages.clusters` is `string \| undefined` and required, and the test supplies it. Expected delta `Ran 3872 -> 3874` matches the two tests it adds. |
| T5 | Carries no tests and no code by design — it is the drawing loop. Not dispatched to a subagent. |

### Rulings

Ruling 1 (CONFLICT 1): T3 converts `board-geometry.ts`'s `try/catch` refusal path to the resolver's
`{kind:"refused", reason}` branch, and keeps printing the refusal in place of the numbers rather
than beside zeros. Why: two copies of board-to-design resolution is the exact drift T3 exists to
prevent, and leaving one caller on `try/catch` keeps the second copy alive in all but name. Cost if
wrong: a small rework of one tool's error branch; no behaviour a board depends on.

Ruling 2 (CONFLICT 2): `generatedSheetFor` keeps the signature the plan gives it. T4 derives
`boardName` as `path.basename(declaration.dir)`, generates into a temp dir it creates and removes,
and builds `GenerateEnv` the way `tools/schgen/board-sheets.ts` already does — `kicadVersion()` and
`stockSymbolDir()`, with `initLock: false` and `acceptToolchain: false`. Why: the alternative is
changing the resolver to take a `PerfboardDeclaration`, which `board-sheets.ts` does not have (it
holds a `BoardRef`), so that change would push the mismatch onto the other caller rather than
removing it. `initLock`/`acceptToolchain` are false because a guide build must never write a lock
baseline as a side effect. Cost if wrong: the packet could resolve the wrong board — loudly, because
`assertLayoutMatchesCircuit` already refuses a netlist that does not match the layout.

### Rulings added after reading the code the plan touches (before Task 1 dispatch)

Ruling 2 AMENDED, and the original was WRONG. It said the packet should build `GenerateEnv` with
`initLock: false, acceptToolchain: false`. `[READ]` `tools/schgen/generate.ts:111-115`: `readRefLock`
throws `"<outDir>/refs.lock.json not found"` when the file is absent and `initLock` is false. The
packet generates into a throwaway temp directory, which never has one, so `false` would make EVERY
board refuse and the gate would withhold every sheet for a reason that is an artefact of this
ruling. Corrected: the packet uses `initLock: true, acceptToolchain: true`, exactly as
`tools/schgen/board-sheets.ts` does. The lock files land in the temp outDir and are discarded with
it, so nothing is written into the repository. Cost if wrong: none now; had it shipped, four boards
would have refused with a misleading message.

Ruling 3 (NEW, and it reshapes Task 3): Task 3 does NOT create `tools/schgen/generated-sheet.ts`.
`[READ]` `tools/schgen/board-sheets.ts:121-170`: `boardSheets(board, repoRoot, options)` is ALREADY
an exported per-board resolver returning `{outcome, blocker, sheets, fallbacks, files}`, with
`declarationFor(board)` handling the no-declaration case. A new module would be the second copy of
board-to-design resolution that Task 3 exists to prevent. Task 3's real work is to extend
`BoardSheets` with the two things the packet needs and `board-sheets.ts` does not expose - the
`drawings` (for the fallback gate) and the schematic root path on its own rather than inside
`files` - and to have the packet call `boardSheets`. The plan's `GeneratedSheet` union and
`generatedSheetFor` signature are superseded by the existing `BoardSheets`/`outcome` shape, which
already distinguishes `generated`, `refused` and `no-declaration`. Cost if wrong: Task 4 consumes a
different shape than the plan's text names, so the plan's Task 4 interface block is stale and the
dispatch must carry the real one. Recorded here so the next reader sees why the file the plan names
does not exist.

Ruling 4 (NEW, execution order): Tasks 2 and 3 SWAP. The plan has Task 2 build the geometry tool by
re-implementing `board-sheets.ts`'s board loop inline, then Task 3 extract a shared resolver and
retrofit Task 2's tool onto it. Given Ruling 3 there is no extraction to do - the resolver exists -
and the only thing standing between it and Task 2 is that `BoardSheets` does not expose
`drawings`, which is exactly what `wireGeometry` needs. Writing the duplicate loop in Task 2 and
deleting it in Task 3 is work whose entire output is thrown away, and it would put a second copy of
the resolution in the tree for one task's duration.

So: Task 1 (geometry, dispatched), then Task 3' (extend `BoardSheets` with `drawings` and the
schematic root path; move `board-sheets.ts` onto it), then Task 2' (the geometry tool, calling
`boardSheets`), then Task 4 (the packet and the gate). The plan's Task 2 Step 3 - paste the baseline
table into the plan - still happens, at the end of Task 2'.

Why: the plan's argument for Task 3 is "one resolver, two callers"; executing its task order would
briefly create two. The spec's criterion is untouched - a baseline measured by a committed tool, and
the packet and the census sharing one resolution. Cost if wrong: the ledger and the plan disagree on
task numbering, which a reader resolves by reading this line. No code consequence.

## Task 1

Task 1: implemented (commit 3975e30, 5 pass, typecheck clean, verified independently by controller).
Task 1: review - SPEC ✅, QUALITY Not approved. 1 Critical, 1 Important, 3 Minor. The Critical and
the Important both originate in the PLAN'S OWN CODE, which the implementer transcribed verbatim as
instructed - they are not implementer errors.

Ruling 5 (plan-mandated finding, and the finding WINS): the reviewer's Critical is correct and the
plan's `wireGeometry` is wrong. `[RAN]` all three cases directly against the committed module:
- three same-net arms meeting at one point (10,0): `corners = 2` for ONE physical vertex;
- a bus spine with one perpendicular tap at (10,0): `corners = 2` for ONE junction;
- two different-net DIAGONALS that visibly cross: `crossings = 0`, silently.

**It is load-bearing rather than theoretical.** `edgesForNet` in this repository emits a STAR - a
hub with every sibling radiating from it - so a hub carrying both horizontal and vertical arms is
the normal case, not an edge case, and the corner count would be systematically inflated on exactly
the topology the generator produces. Task 2's whole purpose is a baseline that is not an opinion; a
number that overcounts every star hub is not one.

The diagonal case is the second half and is the worse failure in kind: returning `0` for a crossing
that is plainly there is a skipped check that looks like a passing one, which `CLAUDE.md` names as
the failure mode the whole workflow exists to prevent.

DECIDED, and the corrected semantics are mine to set because the defect is the plan's:
1. `corners` counts per VERTEX, not per segment pair. A corner is a point at which one net has at
   least one horizontal and at least one vertical incident segment; one count per (net, point).
   Two-segment turn = 1. Three-arm T = 1. Straight run = 0.
2. A wire that is neither horizontal nor vertical is REFUSED with a message naming the wire, its
   net and its endpoints, per `CLAUDE.md`'s refuse-rather-than-guess rule. Silently scoring it zero
   is the defect above.
3. A zero-length wire is REFUSED the same way; it is degenerate, and it currently satisfies both
   `horizontal` and `vertical` at once.
The three Minors about collinear overlap and O(n^2) are deferred - recorded below, not fixed.

Cost if wrong: the baseline's corner figures change meaning. Contained, because no baseline has been
published anywhere yet - Task 2 has not run. Had this shipped, every figure Task 2 produced would
have been wrong in a direction nobody would have questioned.

Task 1: minor (deferred): collinear different-net overlap counts as 0 crossings; unstated scope limit.
Task 1: minor (deferred): crossings and corners are two separate O(n^2) passes; fine at tens-to-low-hundreds of segments, undocumented.
Task 1: fix round 1/5 (3 addressed, 0 open; commits 3975e30..980791f). Controller re-verified all
three independently before the re-review: three-arm T = 1, spine+tap = 1, four-arm cross = 1, two
separate same-net turns = 2, straight run = 0, and both refusals throw naming the net and endpoints.

Task 1: CONTROLLER-FOUND GAP, not visible in any task diff: the FULL SUITE is red.
`tests/schgen/port-fidelity.test.ts` asserts every `.ts` under `lib/schgen/` is in the port
manifest's `files[]`, `diverged[]` or `handWritten[]`, and `lib/schgen/render/fan-geometry.ts` is in
none. The guard is correct and is doing its job - provenance for every schgen file. Task 1 is not
complete until the manifest declares the new files. Enters the fix loop as round 2.

Task 1: minor (deferred, NOT caused by this task): `tests/schgen/decomposition-probe.test.ts` is a
LOAD-DEPENDENT TIMEOUT FLAKE. It enumerates 524,216 probes, takes 3.27s alone, and took 5602ms
against bun's default 5000ms while a review subagent ran concurrently - so it failed in the
controller's suite run and passes on its own. `[RAN]` both ways. It sets no explicit timeout. A test
whose verdict depends on machine load is a check that reports a pass or a fail for reasons unrelated
to the code. Flagged to the final whole-branch review; out of scope for Task 1.

Ruling 6: the flake is NOT fixed inside Task 1. Why: it predates this plan (committed at 7edba5d),
it is in no file Task 1 touches, and widening a timeout is a change to a measurement harness that
deserves its own review rather than riding in on an unrelated task's fix round. Cost if wrong: the
suite stays intermittently red under load, which could mask a real failure in a later task - so the
controller re-runs any 2-fail suite result per-file before acting on it, as it did here.
Task 1: fix round 2/5 (2 addressed, 0 open; commits 980791f..a296af3). Controller re-verified the
fractional case, the integer cases and the comma-in-net-name edge independently before the
re-review. Re-review: both ADDRESSED, no new breakage, only the three in-scope files touched.
Task 1: minor (deferred): `VertexInfo` is declared inside `wireGeometry` rather than at module scope.
Task 1: minor (deferred): the pre-existing `handWritten` array is not globally lexicographic; predates this work.
Task 1: complete (commits cb4311c..a296af3, review clean). FULL SUITE `Ran 3884`, 3884 pass, 0 fail,
with SCHGEN_SOURCE set. Delta from the 3872 branch baseline is +12, exactly the twelve
fan-geometry tests, checked term by term rather than assumed.

New suite baseline for later tasks: 3884.

## Task 3' (the plan's Task 3, reshaped by Ruling 3; runs before Task 2' by Ruling 4)

Task 3': implemented (commit a0bf085). `BoardSheets` gains `drawings` and `schematicRoot`, both
populated on all three return paths; `root` hoisted out of the `--pdf` conditional. No new module.
Controller verified independently: both fields present on all three paths, `bun run typecheck`
exit 0, and the census prints 7 of 11 with low-cut 1 / low-boost 5 / 34 total - identical to the
pre-task baseline.

Task 3': DEFECT IN MY OWN BRIEF, found by the implementer and worth recording. The brief's Step 3
verification was `diff` of census output with `grep -v "^    wrote "`. That filter does not strip
the `writing generations under <mktemp dir>` line, which varies on every run by construction, so
the brief's stated check could never have produced an empty diff for ANY change, including a
no-op. The implementer noticed, diffed from line 2 onward instead, and said so plainly rather than
reporting a pass. A verification step that cannot produce its stated result is the "skipped check
that looks like a passing one" failure wearing a verification's clothes - in my own brief, in the
same session that recorded the rule.

Ruling 7: the brief's filter is not retrofitted. Why: Task 2' and Task 4 do not use it, and
rewriting a brief for a task already committed changes the record of what was actually asked. The
correction lives here instead, where the next person writing such a check will read it. Cost if
wrong: nothing - no future step depends on that filter.
Task 3': review - SPEC ✅, QUALITY Approved. No Critical, no Important.
Task 3': minor (deferred): `schematicRoot`'s doc comment says "Absolute path" but `BoardSheetsOptions.outDir`
is a plain `string` with no absoluteness guarantee. Pre-existing behaviour, not introduced here; the
only current caller resolves first. The new comment makes a claim the type does not enforce.
Task 3': the reviewer's one ⚠️ - whether the controller really told the implementer to expect
`Ran 3884` rather than the brief's `3877` - RESOLVED by the controller, who holds the dispatch: yes,
the dispatch said 3884 verbatim. The brief's 3877 was written when Task 1 had 5 tests; its two fix
rounds took it to 12, so 3872 + 12 = 3884. The controller ran the suite itself at 3884/0 fail before
dispatching. Not a gap.
Task 3': complete (commits a296af3..a0bf085, review clean).

## Task 2' (the plan's Task 2, reshaped by Rulings 3 and 4)

Task 2': implemented (commits 395f01d tool + port-manifest, b2bd57b baseline into the plan).
Split into two commits because the baseline must cite the SHA of the commit that introduced the
tool, which cannot exist before that commit - disclosed plainly by the implementer, and the
reviewer confirmed 395f01d is the parent of b2bd57b, i.e. the natural order.
Task 2': review - SPEC ✅, QUALITY Approved. No Critical, no Important.
Task 2': controller ran the tool independently and got the same numbers as the report and the
pasted table, per board and in total: 802 segments, 103 crossings, 494 corners, 34 fallbacks over
7 of 11. Refusals print the blocker in full; no row of zeros for a board that drew nothing.

THE BASELINE, for the drawing loop to be measured against (re-run: `bun run tools/schgen/board-geometry.ts`):
  pultec-low-cut    103 segments,  8 crossings, 61 corners, 1 fallback
  pultec-low-boost  111 segments,  4 crossings, 70 corners, 5 fallbacks
The two boards being built split in opposite directions - low-boost has HALF low-cut's crossings and
MORE corners. That matches the rendered pages: low-boost's fan is a long staircase that turns
constantly without crossing itself; low-cut's runs are shorter and straighter but tangle more.
Neither number alone identifies which is harder to read, which is the point of keeping them separate.

Task 2': minor (deferred): `BoardGeometry` fills `segments/crossings/corners/fallbacks` with 0 on
the refused and no-declaration paths. The renderer never prints them, so the OUTPUT is honest, but a
future consumer reading the record directly could take 0 as "measured zero" rather than "not
applicable" and deflate an average - one layer below the print statement, the same class of mistake
this area exists to prevent. A `number | undefined` or a discriminated union would make the state
unrepresentable. Flagged to the final whole-branch review.
Task 2': minor (deferred): port-manifest entry is placed beside `board-sheets.ts` rather than in
global alphabetical order; no test enforces ordering and the array is not globally sorted anyway.
Task 2': complete (commits a0bf085..b2bd57b, review clean).

## Task 4

Task 4: implemented (commit f42c129). `GuideSchematic` gains `generated` and `withheld`;
`writeGuidePacket` resolves a board with no `"sch"` through `boardRefs`/`boardSheets`; the gate is
every sheet carrying zero `fieldFallbacks`. Suite `Ran 3887`, 0 fail - 3884 plus the brief's three
tests, exactly.

Task 4: CONTROLLER LOOKED AT THE PAGE, not only at the report. `[RAN]` `make guide` in
`boards/pultec-low-boost`, rasterised page one at 120 dpi and read it. It shows the header row
`Schematic: withheld - see "Schematic withheld" below` and a bordered notice headed **Schematic
withheld** naming the board, `boards/pultec-low-boost/perfboard.json`, the circuit model the other
pages WERE checked against (`circuits/pultec/physical/low-boost.ts`), the reason verbatim - *"5
fallback field placement(s): text the placer could not keep clear"* - and the command that
reproduces it. **It does NOT print the no-schematic notice.** The two claims are distinct on the
paper, which is the whole point of the fourth variant. The CLI also says it on stdout.

Ruling 8 (deviation from my brief, and the deviation is RIGHT): the brief said to call
`boardRefs(repoRoot)` directly. The implementer instead added optional `boardRefs`/`boardSheets`
overrides to `GuideDeps`, defaulting to the real functions, and injected `boardRefs: () => []` into
the existing `tests/guide/packet.test.ts` harness. Why it is right: that harness uses a synthetic
`/repo` root with no `boards/` directory on disk, and the real `boardRefs` does an unguarded
`fs.readdirSync` that throws ENOENT - so the literal instruction would have broken a passing test
to no purpose. `GuideDeps` already injects `exportSchematicPdf`, `loadCircuit`, `fs` and `now` the
same way, so this follows the file's established pattern rather than inventing one. Accepted as
written. Cost if wrong: two more injection points to keep honest in `GuideDeps`; the review is
asked to check the defaults are the real functions and that no test silently relies on a stub where
it means to exercise the real path.
Task 4: review - SPEC ✅, QUALITY Approved with findings: 4 Important, 3 Minor. All four outcomes
traced correct by the reviewer; gate predicate is literally every-drawing-zero-fallbacks; temp dir
cannot reach `boards/`; `packetFiles` agrees with what was written; the injected defaults are the
real functions, not stubs.

Ruling 9 (Important 1, and it is MY BRIEF'S defect): the generated branch calls
`defaultExportSchematicPdf` directly, bypassing `deps.exportSchematicPdf`, because my brief said to
use that function by name. FIX IT. The failure is latent and springs exactly when the drawing work
SUCCEEDS: `tests/guide/clusters-packet.test.ts` injects a THROWING `exportSchematicPdf` so a stray
export is loud, and runs the real `pultec-low-boost` against the real repoRoot. The moment Task 5
drives low-boost's fallbacks to zero, that board resolves `generated` and the export spawns the real
binary at the test's fake `/fake/kicad-cli` path, defeating the test's own guard. A trap that arms
itself on success is worse than one that fires now. Cost if wrong: none; honouring an existing
injection seam cannot break a caller that was not using it.

Ruling 10 (Important 2): the temp dir leaks when `resolveSchematic` itself throws - `mkdtempSync`
is inside it, the removing `finally` is in the caller and only runs once it has returned. Two live
throw paths sit between them, and one is real rather than hypothetical: `boardSheets` catches only
around `generate`, so `kicadVersion()`, `stockSymbolDir()` and `parityDesign()` throw straight
through. FIX IT. Not Critical - the litter is in `/tmp`, never in `boards/`.

Ruling 11 (Important 3): `tools/guide/packet.ts` is 499 lines against this project's stated 300-500
ceiling, so the next edit to it breaks the rule. FIX IT by extracting `resolveSchematic` and its doc
comment to `tools/guide/schematic-source.ts`, which also gives rulings 9 and 10 a cleaner home.

Ruling 12 (Important 4): PARKED, not fixed, and recorded in a code comment instead. A no-`sch`
board's guide now depends on schgen's own `KICAD_CLI` resolution in `kicad-run.ts`, which no caller
can redirect - `make guide` passes `--kicad-cli`, and that governs the EXPORT but not the
GENERATION that precedes it. So an operator whose working kicad is only at the make-resolved path
gets a refusal where they previously got a guide. Why parked: fixing it means threading kicad
configuration through `boardSheets`, which is schgen's territory and ripples to the census tool;
that is its own task with its own review, not a rider on this one. Why it must not be silent: it is
a real behavioural regression for a configuration this machine does not happen to have. The register
is frozen, so by the rule that replaced it the defect goes in a comment beside the code. Cost if
wrong: a guide build refuses on a machine where KICAD_CLI differs, and the comment is what tells
that person why.

Ruling 13 (Minor, promoted): `[].every(...)` is `true`, so a `generated` outcome carrying zero
drawings would pass the gate on no evidence and export. The reviewer could not construct that state
from `generate`. Promoted and FIXED anyway because it is this project's cardinal failure shape - a
check that reports a pass having examined nothing - and the guard is one condition. `board-sheets.ts`
already makes exactly this distinction for its own zero.
Task 4: minor (deferred): unreachable second refusal for the `generated`-without-`schematicRoot`
case; two refusals for one condition, worded differently.
Task 4: fix round 1/5 (5 addressed + the test-comment item, 0 open; commits f42c129..65055b0).
Re-review: all ADDRESSED, no new breakage. `packet.ts` 499 -> 402 lines, `schematic-source.ts` 187,
both under the ceiling; exported surface unchanged, `SCHEMATIC_PDF` re-exported so no importer moves.
Temp dir now has TWO independent guarantees, each covering the half the other cannot reach: a
try/catch inside the resolver that removes it before rethrowing, and the caller's `finally` for
every path once the resolver has returned.
Task 4: controller verified Ruling 12's parked comment describes the MECHANISM accurately rather
than plausibly - `[READ]` `tools/schgen/kicad-run.ts:12` imports `KICAD_CLI` from
`lib/kicad/netlist.ts` as a module-level constant and passes it straight to `spawnSync`, and
`netlist.ts` resolves it as `process.env["KICAD_CLI"] ?? defaultKicadCli()`. `--kicad-cli` reaches
`deps.kicadCli` and nothing else. The comment says exactly that and does not overclaim. Worth the
check: a permanent comment that misdescribes the system is worse than no comment.
Task 4: the implementer rebuilt low-boost's guide after all five fixes and the rasterised page one
is BYTE-IDENTICAL to the pre-fix render. The re-review confirmed the diff is consistent with that:
every change is an injection indirection resolving to the same default, temp-dir lifecycle, a pure
move, or a branch unreachable for low-boost's real generation. Five real defects closed, zero
observable change - which is what a hardening round should look like.
Task 4: complete (commits b2bd57b..65055b0, review clean).

ALL FOUR MECHANICAL TASKS COMPLETE. Task 5 (the arrangement, developed by drawing) and Task 6 are
owner-facing and are not dispatched to subagents.

## Final whole-branch review and its fix wave

Final review (opus, scope cb4311c..65055b0): SPEC coverage confirmed for pieces 1-3; piece 4
absent and documented as such. THREE BLOCKING Important findings, all real, all fixed in one wave
at 23ef67a: the duplicated crossings measurement without its refusal; the withheld notice asserting
a sheet was drawn when schgen had refused; and the execution record existing only in a gitignored
file while the committed plan still described the superseded design.

Scoped re-review of 65055b0..23ef67a (opus): ALL ADDRESSED, no new breakage. It checked the three
things most likely to be met in letter only, and each held:
- the chosen mechanism for finding 1 refuses in EXACTLY the cases `sheetMeasuresOf` refuses - it
  diffed both paths and confirmed there is no guard, filter or transformation between
  `canonicalTopology` and the published crossing figure that the new code skips;
- `drawn` is set at all three `withheld` construction sites and a fourth is structurally
  impossible, because the field is required and non-optional with no default, so typecheck is the
  check that would fail;
- the per-block attribution cannot double-count (frames are disjoint by `pack.ts`'s GAP and
  `frames.ts`'s margins; a point in more than one frame returns undefined) and cannot silently lose
  a wire (both the ambiguous and the unmatched case increment a counter that is PRINTED).

Suite at 23ef67a: `Ran 3889`, 0 fail - 3887 plus the two per-branch notice tests. Baseline unmoved:
low-boost 4 crossings, low-cut 8, totals 802/103/494/34.

RESIDUAL RISKS, adjudicated rather than fixed - there is no second fix wave:

Ruling 14: `tools/schgen/board-geometry.ts` has NO unit test, so the per-block attribution, the
`unattributed` path and the board-named rethrow are evidenced only by a manual tool run. PARKED,
and it is the first thing to build if the drawing loop starts leaning on the per-block figures.
Why parked: the tool is a reporting surface over `wireGeometry` and `canonicalTopology`, both of
which are tested, and its arithmetic invariant was checked by hand on all seven boards. Cost if
wrong: a regression in attribution surfaces as a printed line nobody asserts, which is precisely
the shape this project distrusts - so this is a park with a short fuse, not a dismissal.

Ruling 15: the invariant "per-block figures sum to the per-board total" holds only because frames
are disjoint and no sheet-level wire exists outside a block. PARKED. A future packer that overlaps
frames would break it silently. It is cheap to assert and nobody has. Cost if wrong: the per-block
breakdown quietly stops summing, and the per-board row - which remains the authority - stays right.

Ruling 16: `blockFrames` keys frames by `blockId`, so two frames sharing a blockId on one sheet
would keep the last and the sibling's wires would fall to `unattributed`. PARKED as visible rather
than silent: the loss is counted and printed, which is the behaviour this project asks for.

ALL FOUR MECHANICAL TASKS COMPLETE AND REVIEWED. Tasks 5 and 6 - the arrangement developed by
drawing - are owner-facing and were never in this run's scope.
