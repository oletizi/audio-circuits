# Deleting `lib/schgen/` and `tools/schgen/`: the dependency sweep, and the one measurement that stops it

**Status: NOT DONE. No code was deleted, moved or edited.** This document is the
sweep the deletion was to rest on, and it records why the deletion was not
carried out as specified: one of the task's stated preconditions is false, and
correcting it changes what the work is, not merely how much of it there is.

The owner's decision is `docs/known-gaps.md` **G306** and nothing here disputes
it. What is in question is only the *mechanism*, and specifically which checks
on the five approved Pultec pages survive it.

---

## 1. The precondition that is false

The task states, as measured:

> **`make check` does NOT touch schgen.** Zero mentions in a full run.

**It does.** `make check` executes `lib/schgen/gates/round-trip.ts`,
`lib/schgen/ir/build.ts`, `lib/schgen/lock/annotate.ts`,
`lib/schgen/render/library.ts`, and four modules under `tools/schgen/`, once for
each of the five Pultec section boards, on every run.

**Why the original measurement missed it, which is the instructive part.** The
evidence was a grep for the string `schgen` in a `make check` log. A log records
what the tools *print*, and these tools print test counts, not module paths. A
grep of log text **could not have detected an import** — it is the shape of
false-green `CLAUDE.md` names: *"Evidence must be a check that could have
failed."*

### The chain, and the check that could have failed

`make/board.mk`'s `netlist-agrees` requires, for every board declaring an
`"sch"`:

```
NETLIST_TEST := $(REPO_ROOT)/tests/circuits/$(notdir $(CURDIR)).test.ts
...
@cd "$(REPO_ROOT)" && bun test "$(NETLIST_TEST)"
```

All five Pultec boards declare their `drafted/` page as `"sch"`, so all five run
`tests/circuits/pultec-*.test.ts`. Each of those is three lines that delegate to
`tests/circuits/drafted-sheet.ts`, whose imports are:

```ts
import { roundTrip, type RoundTripProblems } from "../../lib/schgen/gates/round-trip.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { annotate, EMPTY_LOCK } from "../../lib/schgen/lock/annotate.ts"
import type { Circuit, PartLabel } from "../../lib/schgen/ir/types.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { caseResolver } from "../../tools/schgen/authoring-census.ts"
import { boardRefs, declarationFor } from "../../tools/schgen/board-sheets.ts"
import { parityDesign } from "../../tools/schgen/gate-census.ts"
import { designResolver } from "../../tools/schgen/generate.ts"
```

**The positive control.** `lib/schgen/gates/round-trip.ts` was moved aside and
the board gate re-run:

```
$ mv lib/schgen/gates/round-trip.ts /tmp/rt-probe.ts
$ bun test tests/circuits/pultec-mid.test.ts
error: Cannot find module '../../lib/schgen/gates/round-trip.ts'
       from '.../tests/circuits/drafted-sheet.ts'
 0 pass
 1 fail
```

Restored immediately; the tree is clean. Before the move the same command
reported `5 pass / 0 fail / 40 expect() calls` in 951 ms — and that exact
5-pass, ~1 s block appears **five times** in a full `make check` log (lines 36,
46, 56, 66, 76 of the captured baseline), once per Pultec board.

### What dies with it, which is four guards and not one

`registerDraftedPageTests` in `tests/circuits/drafted-sheet.ts` registers five
tests per board. Delete schgen without relocating and all five go, for all five
boards:

1. **the committed sheet still hashes to the digest its `RECORD.md` binds it
   to** — the approved bytes, with a positive control proving the digest moves
   with the file;
2. **the committed netlist was exported from the drafted sheet and no other
   file** — asserts `(source "drafted/<circuit>/<board>/...")`;
3. **every component and every net agrees between the drafted page and the
   model** — the round-trip;
4. **moving one pin between two nets is reported** — the positive control for
   the zero in (3);
5. **the page's known disagreements with the model are exactly the
   drawn-elsewhere ones** — the selector mount lug and the `Value` fields,
   asserted as exact lists rather than tolerated.

And `make check` would then fail on five boards it currently passes, because
`netlist-agrees` refuses by name when `tests/circuits/<board>.test.ts` is
absent. That contradicts the task's own *"`make check` fails on exactly the four
baseline boards and no others."*

### A second, smaller precondition that is also wrong

The task says to *"verify all five sha256s against `docs/schematic/verdicts.md`
before and after."* **Four of the five are not in that file.** The binding lives
in each page's own `drafted/pultec/<board>/RECORD.md`, which is where
`recordedSheetDigest` parses it from, and deliberately so: *"a hash copied into
a test file is a second place for one fact to be wrong."*

| board | sha256 of the `.kicad_sch` | in `RECORD.md` | in `verdicts.md` |
| --- | --- | --- | --- |
| `pultec-hi-boost` | `a1fa415966ad026c2448c25e65a7e267e51554853cb563399f62befc47bf668e` | yes | no |
| `pultec-hi-cut` | `e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332` | yes | yes |
| `pultec-low-boost` | `b9e42e6a90a7fee4a440760bc67df1968fd756325987327db84b434a565dbc59` | yes | no |
| `pultec-low-cut` | `5e1a4139918cf7ddb9a9f4588b2f3e04091539cd9d5830650bc95c359c8896db` | yes | no |
| `pultec-mid` | `d4b0b8cc6e3be35298cf1a240dcf8705bce655822224493670089df272138e2b` | yes | no |

All five are unchanged — nothing in this pass wrote to `drafted/`.

---

## 2. The baseline, captured before anything was touched

- **`make check`** — fails on exactly four boards and no others:
  `pt2399-core` (`component "delay_ic" (kind "ic") has no parts-list rule in
  tools/bom/needs.ts`), `transistor-preamp-lab`, `transistor-preamp-loop`,
  `transistor-preamp-staged`. Exit 2.
- **`bun test`** — `4058 pass / 8 fail`, 4066 tests across 379 files, 248 s. All
  8 failures are `tests/schgen/port-fidelity.test.ts` on an unset
  `SCHGEN_SOURCE`, exactly as the task states.
- **`bun run typecheck`** — clean, exit 0.
- **Size.** `lib/schgen/` 110 files / 22,365 lines; `tools/schgen/` 81 files /
  17,674 lines; `tests/schgen/` 152 files / 26,141 lines.

---

## 3. The complete dependency sweep

Every tracked file outside the three schgen directories that *imports* from them,
by consumer. Mentions in comments are listed separately in §3.3, because they are
a different problem with a different fix.

### 3.1 Real imports the task's list named

| consumer | what it imports | from |
| --- | --- | --- |
| `tools/guide/placement.ts` | `createOccupancy`, `leastCovered`, `MARK_WEIGHT`, `Occupancy` | `lib/schgen/render/occupancy.ts` |
| `tools/guide/schematic-source.ts` | `worstClass`; `BoardRef`, `BoardSheets`, `BoardSheetsOptions` | `lib/schgen/findings.ts`, `tools/schgen/board-sheets.ts` |
| `tools/draught/gate.ts` | `compareConnectivity`, `expectedConnectivity`, `stockSymbolDir` | `lib/schgen/gates/connectivity.ts`, `lib/schgen/render/library.ts` |
| `tools/cli/schgen.ts` | `loadDesign`, `stockSymbolDir` | `lib/schgen/design.ts`, `lib/schgen/render/library.ts` |

`tools/cli/schgen-anchors.ts` and `tools/cli/schgen-parity.ts` are the other two
CLI verbs. `tools/draught/gate.ts` has **no consumer at all** — nothing in the
repository imports it, no Make target and no CLI verb reaches it — so the task's
instruction to delete it stands unopposed.

### 3.2 Real imports the task's list MISSED

**a. `tools/guide/packet.ts`** — not only `schematic-source.ts`. It imports
`boardRefs as schgenBoardRefs`, `boardSheets as schgenBoardSheets` and two types
from `tools/schgen/board-sheets.ts` directly, and injects them as the defaults
for its own `deps.boardRefs` / `deps.boardSheets`. Simplifying the guide's
fallback path therefore touches `packet.ts`, not just `schematic-source.ts`.

**b. Ten files under `circuits/` — a directory the task says not to touch.**

```
circuits/opamp-buffer.schematic.ts
circuits/optical-compressor/schematic/authoring.ts
circuits/optical-compressor/schematic/overrides.ts
circuits/pt2399-core/schematic/authoring.ts
circuits/pultec/schematic/{hi-boost,hi-cut,low-boost,low-cut,mid,section-board}.ts
circuits/transistor-preamp/schematic/{authoring,buffered-board,feedback-board,loop-board,preamp-boards,staged-board}.ts
```

They import `negotiablePort` and the types `SchematicAuthoring`,
`BlockDeclaration`, `PortDirection`, `ComponentOverride` from
`lib/schgen/authoring.ts`, and `RailSpec`, `SheetSpec` from
`lib/schgen/ir/types.ts`. Delete `lib/schgen/` and `bun run typecheck` fails on
all ten. **These files are consumed only by schgen and by tests** — no other
importer exists — so they are themselves part of the surface the decision is
about, and `circuits/pultec/schematic/section-board.ts` alone is 27 KB of block,
rail and sheet declarations written for the generator.

**c. `tests/circuits/drafted-sheet.ts` and the five `tests/circuits/pultec-*.test.ts`** —
§1. This is the blocking one.

**d. `tests/circuits/stub-writer-tripwire.test.ts`** — imports
`circuitSpecFrom`, `nicknamesOf`, `createResolver`, `stockSymbolDir`,
`symbolLibraries`, `generate`, `kicadVersion`, and the types `DesignSpec`,
`LoadedDesign`, `SchematicAuthoring`, plus
`circuits/transistor-preamp/schematic/authoring.ts`. It is the tripwire that
keeps `lib/kicad/schematic.ts` honest about being superseded.

**e. `tests/guide/schematic-class-gate.test.ts`** — imports `buildCircuit`,
`finding`/`Finding`, `layoutSheet`, `SheetDrawing`, `BoardRef`, `BoardSheets`.

**f. `tests/cli/schgen.test.ts`** — imports `stockSymbolDir`, `writeGeneration`,
`kicadVersion`. A test file for the CLI verbs, outside `tests/schgen/`.

**g. `tests/kicad/install.test.ts`** — imports `stockSymbolDir` from
`lib/schgen/render/library.ts`. A single utility import in an otherwise
unrelated test.

**h. `build/mid-guide-probe/probe-mid.ts` and `build/no-layout-withholding/demo.ts`**
import from `lib/schgen/`, but `build/` is **untracked** (0 files in
`git ls-files build`), so they are not a constraint — noted only so the next
sweep does not mistake them for one.

### 3.3 Comment-only references — a honey pot, not a dependency

These name `lib/schgen/` as the generator or as a loader but import nothing from
it. Each is a sentence that would send a reader to a deleted directory:

`tools/repo.ts` (port manifest), `tools/stripboard/approvals-model.ts`,
`tools/stripboard/approvals-words.ts`, `lib/owner-words.ts`,
`lib/kicad/schematic.ts`, `lib/kicad/symbol-library.ts`,
`lib/kicad/{footprint,install,libtable,netlist,value-notation}.ts`,
`lib/kicad/symbols/PROVENANCE.md`, `tools/guide/{guide,packet,schematic-notice}.ts`,
`tests/{document-control-bytes,kicad/*,stripboard/temp-scratch,guide/*}.test.ts`,
and the five `drafted/pultec/*/RECORD.md`.

**The task's reading of the stripboard pair needs one correction.**
`tools/stripboard/approvals-model.ts` and `approvals-words.ts` *name*
`lib/schgen/readability/baseline.ts` as the loader for the readability readings;
they **do not import it**. So `readability/baseline.ts` has no live consumer
outside schgen and its own tests — and that is the problem rather than the
reprieve: `schematic/readability-baselines.json` is a committed
**owner-judgement registry**, and deleting its only loader leaves the registry
with nothing that can read it. That should be a deliberate decision, not a
side-effect.

### 3.4 Build and config

- **`package.json`** — three scripts: `schgen`, `schgen-parity`,
  `schgen-anchors`. Delete with the verbs.
- **`.gitignore`** — ignores `build/schgen-boards/` and
  `build/schgen-defective-fixture/`, with comments naming
  `bun tools/schgen/board-sheets.ts` and `bun tools/schgen/defective-fixture.ts`.
- **`Makefile`, `make/*.mk`, `tsconfig.json`** — no schgen reference. Confirmed
  by grep over all five files.

---

## 4. What the relocation actually costs, measured three ways

Measured by transitive closure of relative imports (script in the session
scratchpad; read-only).

| what is relocated | schgen modules pulled in | schgen lines |
| --- | --- | --- |
| `tests/circuits/drafted-sheet.ts`'s imports **as written** | 58 | **22,836** |
| the comparison core alone (`round-trip`, `ir/build`, `lock/annotate`, `render/library`) | 12 | **1,958** |
| that, plus `from-network`, `render/stock-symbols` and `authoring.ts` (so `circuits/` compiles) | 18 | **3,969** |

The first figure is why "relocate the few pieces" does not describe the work as
specified: taken literally, the five board gates reach **nearly the whole
generator**, including ELK layout and every render template. The reach comes from
four pieces of glue in `tools/schgen/` — `parityDesign` (17 lines of body),
`caseResolver` (5), `designResolver`, `boardRefs`/`declarationFor` — each of
which lives in a census file that imports the generator wholesale.
`lib/schgen/design.ts` alone costs 9,845 lines of closure.

The third figure is the bounded version, and it is the one worth considering:
**18 modules, 3,969 lines, 11 % of schgen**, letting roughly 32,500 lines of
`lib/schgen/` + `tools/schgen/` and most of `tests/schgen/`'s 26,141 lines go.
It needs thin substitutes for those four glue functions and it keeps
`circuits/*/schematic/*.ts` untouched.

**What it does not do is remove the honey pot from the relocated part.** The
18 modules are the schematic IR and its authoring vocabulary:
`authoring.ts`'s `SchematicAuthoring` / `BlockDeclaration` / `SheetSpec` /
`RailSpec`, `ir/types.ts`'s sheet geometry, `rules/orientation.ts`,
`rules/pin-sides.ts`, and six modules under `render/`. The task requires that
*"nothing you move may keep a name or a comment implying it draws schematics"* —
and this material cannot be renamed out of implying it, because declaring blocks,
rails and sheets for a layout engine is what it is. A home named for
*comparing a drawing against the model* describes `round-trip.ts` honestly and
describes `rules/orientation.ts` not at all.

---

## 5. Why this was handed back rather than decided

Both available branches break something the task states must hold:

- **Delete wholesale.** `bun run typecheck` fails on ten files under
  `circuits/`; `make check` fails on five more boards than the four baseline
  ones; and the five approved pages lose all four guards in §1 — including the
  one binding each page's bytes to the digest its `RECORD.md` records.
- **Relocate the bounded 3,969 lines.** Every functional precondition is met and
  `circuits/` is untouched, but about 4,000 lines of schematic-drawing
  vocabulary survive in `lib/` under some new name, which is the honey pot the
  decision is about.

Which guard the approved drawings keep, and how much drawing vocabulary may
survive a deletion whose stated purpose is to remove drawing vocabulary, are
acceptance criteria for this change. `CLAUDE.md`: *"An agent may never author the
acceptance criteria for the artifact it is producing."* So they are recorded here
and put back rather than chosen.

---

## 6. Separately: `lib/kicad/schematic.ts`

**Its justification survives schgen's removal, and strengthens.** It is kept
alive by `tests/circuits/kicad-round-trip.ts` and the five
`tests/circuits/transistor-preamp-*.test.ts` files, which are the repository's
only `kicad-cli` proof that KiCad reads a stub the way the circuit means it —
and that has nothing to do with schgen.

**But its doc comment becomes false in three places**, and it is one of the
honey-pot sentences:

- *"`lib/schgen/` is the schematic generator and `bun run schgen` is its front
  door"*;
- *"`lib/schgen/` is the fix, not an alternative"*;
- the whole paragraph explaining its survival in terms of which boards
  `generate` refuses.

With schgen gone this stub becomes the **only** model-to-`.kicad_sch` writer in
the repository, while its own comment records (via **G81**) that what it emits is
a known failure mode. That combination is a sharper honey pot than the one being
removed, and the comment needs to point at `TOOLING.md`'s loop and say plainly
that nothing here draws a schematic from a model any more. Not deleted, not
edited — reported, as instructed.

---

## 7. The instructional documents that would need correcting

Named with the sentence, so the correction is a small edit rather than a reread.
**None was changed in this pass**, because the right wording depends on §5.

| document | the sentence |
| --- | --- |
| `CLAUDE.md:136` | *"The schematic generator is `lib/schgen/`, and `lib/kicad/schematic.ts` is the superseded stub it replaced"* |
| `CLAUDE.md:144-145` | the two commands it tells agents to run: `bun tools/schgen/board-sheets.ts`, `bun run tools/schgen/board-geometry.ts` |
| `CLAUDE.md:324` | *"`bun tools/schgen/board-sheets.ts` is the worked example"* of a measurement living in a tool |
| `CLAUDE.md:227` | cites `lib/schgen/ir/validate.ts` as stating no reason for the net-name rule |
| `README.md:29-38` | the paragraph on `lib/schgen/` writing a `.kicad_sch` from a model, and on the stub |
| `README.md:245-259` | *"`bun run schgen` is the schematic generator's front door"*, with its two verbs |
| `README.md:337-341` | *"A new board's KiCad schematic comes from `bun run schgen`"* |
| `README.md:190-203` | the `SCHGEN_SOURCE` environment variable and the port-fidelity testcases |
| `TOOLING.md:38-40` | *"`lib/schgen/` remains the ..."* |
| `TOOLING.md:54, 68` | bun *"runs this repo's own `tools/schgen/*.ts`"*; *"`bun` is still required, for `bun tools/schgen/board-sheets.ts`"* |
| `docs/schematic/README.md:159` | points at `lib/schgen/render/text-boxes.ts` as live code |
| `.gitignore:8-25` | the two comments naming schgen commands |

**Deliberately left alone**, per the task and `CLAUDE.md`'s own rule that a
dangling `G<n>` or path in the historical record is inert:
`DEVELOPMENT-LOG.md`, `docs/known-gaps.md`, `docs/research/*`,
`docs/superpowers/specs/*`, `docs/superpowers/plans/*`,
`docs/schematic/schgen-development-history.md`, and the five
`drafted/pultec/*/RECORD.md`. Those record what happened.

---

## 8. What a later reader should take from this

- **The grep that cleared `make check` could not have failed.** A log grep tests
  what a tool prints, never what it imports. The import graph is the only
  evidence about an import graph, and it is cheap to compute.
- **`tests/circuits/<board>.test.ts` is a Make-enforced interface.** Any board
  declaring an `"sch"` must have one, by name, or `netlist-agrees` refuses. A
  plan that deletes test files has to check that list.
- **A directory's reach is not its size.** Four glue functions turned a
  1,958-line need into a 22,836-line dependency. Measuring the closure of what
  is *needed* rather than of what is *imported* changed the answer by a factor
  of six.
