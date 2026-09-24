---
title: Porting the perfboard workflow from a private source repository
date: 2026-09-21
revised: 2026-09-22
status: approved-design
---

# Porting the perfboard workflow

> **Revised 2026-09-22.** The first version of this document designed against a tscircuit
> repository. tscircuit was then removed (`docs/decisions/2026-09-21-why-not-tscircuit.md`)
> and replaced by the canonical circuit model in `lib/model/`. That invalidated most of the
> input half of the design and reversed one of its headline decisions. What changed, and why,
> is recorded in **What the architecture change invalidated** below rather than quietly
> edited away, because reviewers read the first version.

## Problem

A private source repository carries a perfboard workflow that belongs here: a hand-authored
stripboard layout checked against the circuit by a forked VeroRoute, so a layout cannot
silently drift from the circuit it was built from. The operator has built this board;
`pt2399-core.perfboard.vrt` is the layout they are using, and the commit that introduced it is
titled "perfboard seems functional".

The workflow's design was recorded in a design document in that source repository, which is
not part of this repository and is not needed to work in this one - it explains *why* the
original workflow was shaped the way it was. This document covers what changes when the
workflow is ported here.

**The circuit itself is no longer part of this work.** `circuits/pt2399-core/pt2399-core.ts` already
exists, transcribed from `tests/fixtures/pt2399-core-veroroute.net` and verified against it by
`tests/circuits/pt2399-core.test.ts`. See Current state.

## What does not change

Inherited wholesale from the perfboard design, restated because the port must not drop them:

- **Layout is authored by hand; the tool verifies and reports.** Nothing places parts.
- **Net identity is membership, not name.** A net is the set of `(designator, pin)` nodes
  carrying it. Names are descriptive metadata for reports, never identity keys.
- **The circuit is strictly upstream.** Nothing flows from the layout back into the circuit.
- **Strip cuts are derived, never authored.**
- **The report is carried verbatim and parsed nowhere.** `ok` comes from the exit code alone.
  A circuit-clean board has no `Schematic delta` section at all — the heading is omitted, not
  left empty — so any rule reading ok-ness out of the body would call an unrouted board clean.
- **Off-board parts connect by flying leads from board-edge pads.**

## Current state

Work the architecture change delivered, which this design no longer has to:

| Done | Where |
| --- | --- |
| The circuit, transcribed from the built unit's netlist | `circuits/pt2399-core/pt2399-core.ts` |
| Verification at `(designator, pin)` precision | `tests/circuits/pt2399-core.test.ts` |
| Both fixtures checked in | `tests/fixtures/pt2399-core{,-veroroute}.net` |
| Id → designator mapping | `DESIGNATORS` in `circuits/pt2399-core/pt2399-core.ts` |
| Canonical pin → KiCad pin number | `PIN_NUMBERS`, and IC/connector pins are already numbers |
| EESchema v1.1 netlist **reader** | `lib/kicad/legacy-netlist.ts` |
| Modern `kicad-cli` netlist reader | `lib/kicad/netlist.ts` |

Baseline at time of writing: 287 tests pass, 0 fail.

The existing verification test already does what this design's first version proposed and what
its reviewer asked for — it compares net membership as sets of `designator.pin` members,
keyed by net name, against the netlist the built board was laid out from. That is the
`(reference, pin)` precision the reviewer insisted on, implemented before this document asked
for it.

## What the architecture change invalidated

Recorded so the diff against the first version is legible rather than mysterious.

**Dead, because `circuit-json` is gone:**

- The finding that `source_component` carries no footprint string. The model's `PartSpec` has
  `footprint`, `pads` and `symbolPins`.
- Import-string derivation from `pcb_plated_hole` geometry, and with it the grid-quantization
  contract, the rotation-invariant classification, the DIP row-structure assertions and the
  `ftype` family table. There is no PCB layer in this repository and no pad coordinates to
  quantize. The reviewer's first point, and my correction to it, are both moot.
- The union-find refactor of `lib/export/circuit-json.ts`. That file no longer exists;
  `lib/model/` supersedes it.
*(An earlier revision of this list also declared the value formatter dead, on the grounds that
`circuits/pt2399-core/pt2399-core.ts` carries values in source notation. That was wrong — see **Value
notation** below. The formatter is needed and is back.)*

**Reversed:**

- **Flat reference designators.** The first version decided the module should emit `C1`, `R7`,
  `U1` directly, and rejected a mapping layer. The architecture chose the mapping layer:
  semantic ids, with `DESIGNATORS` as the single place the two vocabularies meet, and
  `CLAUDE.md` now states the rule — "Ids are semantic; designators belong to KiCad". The
  spec's reasoning was sound for a repository where the circuit source was also the schematic;
  it is wrong here. The mapping layer wins, and `asDesignatorNets` in the existing test is the
  worked precedent for consuming it.
- **Not porting `deriveImportString.ts`.** See below. This is the substantive reversal.

**Renamed:** `modules/` → `circuits/`; fixtures live in `tests/fixtures/`, not `reference/`.

## The reversal: `deriveImportString.ts` comes across after all

The first version left 463 lines of KiCad-footprint-name derivation behind, arguing that
geometry contains the truth and names can lie. That argument was correct **given circuit-json
had no footprint names**. It has no force now: `PartSpec.footprint` is a name, and the names
in question are standard KiCad footprint names carrying their own dimensions.

The seven distinct footprints on this board, from `tests/fixtures/pt2399-core.net`, against
the import strings the built board actually used, from
`tests/fixtures/pt2399-core-veroroute.net`:

| KiCad footprint | Derives | Board used |
| --- | --- | --- |
| `R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` | `P10.16mm` = 0.4in | `RESISTOR4` |
| `C_Disc_D5.0mm_W2.5mm_P2.50mm` | `P2.50mm` ≈ 0.1in | `CAP_CERAMIC1` |
| `CP_Radial_D5.0mm_P2.50mm` | `D5.0mm` = 197 mil | `CAP_ELECTRO_200` |
| `CP_Radial_D6.3mm_P2.50mm` | `D6.3mm` = 248 mil | `CAP_ELECTRO_250` |
| `CP_Radial_D8.0mm_P3.50mm` | `D8.0mm` = 315 mil | `CAP_ELECTRO_300` |
| `DIP-16_W7.62mm` | 16 pins | `DIP16` |
| `PinHeader_1x05_P2.54mm_Vertical` | 1×5 | `SIP5` |

Every one agrees. The derivation is not speculative here — it is checkable against a board
that was built and works, for all 24 parts, which is stronger validation than the derivation
had in its own repository.

**This also resolves the C3 question.** `D6.3mm` derives `CAP_ELECTRO_250`, so the netlist
side is self-consistent and the `C3 retyped CAP_ELECTRO_300 -> CAP_ELECTRO_250` line in the
source repository's reports is the *board* holding 300 against a netlist saying 250. The
discrepancy is board-side. The earlier instruction stands unchanged: do not pre-emptively
correct it; let the first real check report it and resolve it against the physical part.

`FOOTPRINT_IMPORT_STRINGS`, the override table, comes across empty, as it did in the source
repository - with its comment explaining what belongs in it and why an override with no
stated reason is indistinguishable from a mistake. It matters more here than there, because
the grammar below is deliberately narrow.

### The grammar is narrow: proven families only

"Port `deriveImportString.ts`" overstates what should cross. The old file interprets the whole
KiCad footprint vocabulary; this repository should recognize only the families it has evidence
for, and refuse everything else. That is the repository's standing rule — errors, not
fallbacks — and it avoids carrying hundreds of lines of interpretation that no board here
exercises.

`lib/kicad/import-string.ts` recognizes exactly:

| Footprint name shape | Import string |
| --- | --- |
| `R_Axial_*_P<mm>mm_*` | `RESISTOR<n>` |
| `C_Disc_*_P<mm>mm` | `CAP_CERAMIC<n>` |
| `CP_Radial_D<mm>mm_*` | `CAP_ELECTRO_<mils>` |
| `DIP-<pins>_*` | `DIP<pins>` |
| `PinHeader_1x<pins>_*` | `SIP<pins>` |

Everything else refuses, naming the footprint and listing the shapes that derive. What crosses
from the source repository's tool is the *refusal quality* — a message that teaches which
field to fix — not the breadth of its vocabulary.

The 24-part assertion against the two fixtures then establishes that this grammar is
sufficient for the workflow, rather than merely plausible.

### Dimension quantization

Two different quantizations, and they are not the same rule.

**Lead pitch** (`RESISTOR<n>`, `CAP_CERAMIC<n>`), where `n` is span in 100-mil units:

```
n = round(mm / 2.54),  accepted when |mm - 2.54 * n| <= 0.15mm
```

The 0.15mm tolerance exists for a specific reason: KiCad names imperial parts with rounded
metric. `P2.50mm` is a nominal 0.1in part (0.04mm off), `P7.50mm` a nominal 0.3in part (0.12mm
off), while `P10.16mm` is exact. A tighter tolerance would refuse real, correct footprints; a
much looser one would start accepting genuinely off-pitch parts as though they fitted.

**Electrolytic body diameter** (`CAP_ELECTRO_<mils>`) is *not* a rounding to a 50-mil ladder,
and implementing it as one produces strings VeroRoute cannot import. The fork enumerates its
types in `Src/CompTypes.h`:

```
CAP_ELECTRO_200  _250  _300  _400  _500  _600
```

There is no 350, 450 or 550. A part measuring 8.9mm (350.4 mil) rounded to the nearest 50 mil
yields `CAP_ELECTRO_350`, which has no matching type and fails the import outright.

So the rule is **nearest member of the enumerated set**, whose gaps are uneven — 50 mil below
300, then 100 mil above:

| Footprint | mils | Nearest enumerated | Used by the board |
| --- | --- | --- | --- |
| `CP_Radial_D5.0mm_P2.50mm` | 196.85 | 200 | `CAP_ELECTRO_200` ✓ |
| `CP_Radial_D6.3mm_P2.50mm` | 248.03 | 250 | `CAP_ELECTRO_250` ✓ |
| `CP_Radial_D8.0mm_P3.50mm` | 314.96 | 300 | `CAP_ELECTRO_300` ✓ |

Note that the third rounds **down** by 15 mil. That is the observed behaviour of the board
that works, so nearest — not round-up — is the rule, even though rounding down means the
layout understates the part's physical size by that margin. The understatement is bounded by
half the local gap, and is a property of VeroRoute's coarse type set rather than a choice this
code makes.

A diameter outside `[200, 600]` mils refuses. An exact tie — 350.0 mil, equidistant between
300 and 400 — refuses rather than picking, because a silent choice there is a physical-size
claim nobody made.

The `_NP` (non-polarized) variants exist in the same enumeration and are **not** derived: no
footprint name on this board distinguishes them, and inferring polarity from a name that does
not state it is the kind of guess this grammar refuses. A non-polarized electrolytic goes
through the override table with a stated reason.

## Decisions

### Value notation is reconstructed by a formatter

The canonical model does **not** retain the spelling a circuit was authored with.
`builder.ts` parses on the way in:

```ts
capacitor(id, value, pins, part) {
  return this.push({ ..., parameters: { farads: parseValue(value) }, ... })
}
```

so `".1uF"` is `1e-7` by the time a `Network` exists, and nothing in `Parameters`, `PartSpec`
or `Provenance` keeps the original string. The authoring call site contains `.1uF`; the data
structure the exporter receives does not.

This matters because VeroRoute compares values as text. A netlist saying `100nF` where the
board holds `.1uF` produces a `Schematic delta` line per part, and `--check` exits 0 only when
the plan is empty.

Three ways out were available: retain the source spelling in the model, format canonically
from the numeric parameter, or accept a one-time value-spelling reconciliation into the
`.vrt`. **The formatter wins**, for two reasons. Retaining source spelling would put a display
concern inside the electrical model, which deliberately excludes such things — `Provenance` is
annotated "deliberately excluded from electrical identity comparison", and value spelling is
the same kind of fact. And a one-time reconciliation would permanently desync the exporter
from the fixture that proves it, discarding the strongest assertion this design has.

The policy, validated against all twelve distinct values on the board:

| Kind | Rule |
| --- | --- |
| Capacitance | below 10nF express in `pF`; 10nF and above express in `uF` |
| Resistance | express in `K` (uppercase) for 1kΩ–999kΩ |
| Both | strip a leading zero (`.1uF`, never `0.1uF`); strip a trailing `.0` |

This reproduces `560pF`, `5600pF`, `.01uF`, `.1uF`, `4.7uF`, `10uF`, `47uF`, `100uF`, `10K`,
`2.7K`, `15K`, `100K` — including the `5600pF` / `.01uF` pair that sits either side of the
10nF boundary and looks arbitrary until the rule is stated.

Decades the fixture does not exercise — bare ohms, megohms, farads at or above 1000uF — are
**refused, not guessed**, per this repository's standing rule against fallbacks.

The formatter is an artifact of the fork treating values as opaque strings. If the fork ever
compares values semantically it is deleted, and its removal is a completion rather than a
regression.

### Footprints are transcribed into the circuit, as evidence

`circuits/pt2399-core/pt2399-core.ts` does not currently populate `PartSpec.footprint`. It must, because
the footprint is what yields the import string, which is layout-geometry identity.

They are transcribed from `tests/fixtures/pt2399-core.net` — the checked-in modern netlist of
the built unit — under the repository's standing rule that transcription is evidence, not
memory. A test asserts every component's footprint matches that fixture, so a footprint cannot
be quietly edited to buy pad span the way the original C3 workaround did.

**Provenance note (added when clone-independence was fixed):** this fixture is regenerated by
`make check`/`tools/perfboard/netlist-sync.ts`, never by hand-invoking `kicad-cli` directly. That
module normalizes the machine-specific paths kicad-cli stamps into every export (the design
section's absolute `(source ...)`, and, via a pinned invocation cwd, every component's
`Sheetfile`) to a stable, repository-relative form before the fixture is compared or written -
see that module's own doc comment. Regenerating it by any other means reintroduces exactly the
machine-specific path this exists to remove.

### The exporter is the mirror of the importer, and lives beside it

`lib/kicad/legacy-netlist.ts` reads EESchema v1.1. The workflow needs the same format written.
It belongs in `lib/kicad/legacy-netlist.ts` alongside its reader, not in a new tree: one
format, one module, and the hazard comment about parenthesised net names already there is
exactly as load-bearing for writing as for reading.

The package field is emitted already holding the import string, so VeroRoute imports with no
Part Alias entry — the same trick the source repository's tool plays by rewriting text after
the fact, done at emit time instead.

### Three artifacts, and the exporter is only responsible for one

Precision here matters, because the C3 story is incoherent without it. There are three
distinct things, and "the board" is never an acceptable name for any of them:

```
circuits/pt2399-core/pt2399-core.ts        the canonical circuit
                               C3 footprint CP_Radial_D6.3mm_P2.50mm
        |
        v
emitted netlist                derived: C3 package CAP_ELECTRO_250
        :
tests/fixtures/                the netlist VeroRoute was actually fed
  pt2399-core-veroroute.net    records: C3 package CAP_ELECTRO_250
        :
boards/pt2399-core/            the persisted hand-authored layout
  *.perfboard.vrt              remembers: C3 typed CAP_ELECTRO_300
```

> **The invariant:** the exporter must semantically reproduce
> `pt2399-core-veroroute.net`. Differences between that netlist and the persisted `.vrt` are
> reconciliation deltas, and are deliberately outside the exporter's proof.

Stated this way the C3 situation is coherent rather than contradictory: circuit, derivation
and fixture all agree on `CAP_ELECTRO_250`, and only the `.vrt` disagrees — which is exactly
what a reconciler exists to report. An implementer must not try to make the exporter reproduce
the stale type held in the `.vrt`; that would be teaching the exporter to lie in order to
silence a delta the workflow exists to surface.

### The exporter's proof runs through the reader

The importer deliberately discards information — component UUIDs, ordering, the header comment
— so no exporter can reconstruct the fixture's literal bytes, and asserting against them would
be asserting on data the pipeline does not carry. Both assertions therefore compare
`ImportedNetlist` values, through the reader that is already trusted and tested.

**Writer self-consistency:**

```
fixture --import--> A --export--> text --import--> B        assert A == B
```

**The assertion that matters:**

```
pt2399Core() + DESIGNATORS + PIN_NUMBERS
  + derived import strings + formatted values
        --export--> text --import--> C                      assert C == A
```

The second proves the whole chain — circuit, designator map, pin numbering, footprint
transcription, import-string derivation, value formatting and writer — reproduces the netlist
a working board was built from. The first version of this design could assert connectivity
only; this asserts every field VeroRoute reads.

#### Name-strictness here, and why it is not a claim that names are identity

Both assertions compare `nets` maps keyed by net name, so both are **stricter** than the
inherited identity model requires. Under that model a net renamed without a membership change
is the same net, so a circuit that called `Net-(U1-LPF1-IN)` something legible would still
reconcile clean against the `.vrt`.

The strictness is kept because it currently holds — the circuit was transcribed with the
names verbatim — and a passing stricter assertion is a better statement than a passing looser
one. But it invites exactly one misreading, and the misreading is dangerous: an implementer
who concludes from a name-keyed comparison that names *are* identity may later key
reconciliation logic on them, which is the failure the whole membership model exists to
prevent. This workflow was built to survive KiCad's generated net names migrating between
electrical nets.

So a third, focused regression test states the invariant directly: take the lowered netlist,
rename every generated `Net-(...)` net without touching any membership, and assert the
connectivity is equivalent under a membership comparison. It needs no production abstraction —
a test-local helper that compares sorted member sets is enough. Its job is to be the thing an
implementer reads when they wonder whether a name matters.

### The driver is one TypeScript CLI

Unchanged from the first version and unaffected by the architecture change. The source
repository drove this from four `.mk` files over `pnpm`; this repository is bun plus
`package.json` scripts, and the operator's standing rule puts enforcement in CLI verbs.

The good idea in that make layer — **the directory you are standing in is the context** — is
kept. The `.mk` files are not.

```
bun run perfboard check        this board, or every board when run higher up
bun run perfboard cuts         the cut list and solder bridges
bun run perfboard update       apply the circuit to this layout, in place
bun run perfboard stripboard   convert to strip mode, in place
bun run perfboard edit         open in the forked VeroRoute
bun run perfboard board-info   what this directory declares
bun run perfboard boards       every declared board
bun run perfboard veroroute    acquire and build the pinned fork
```

`bun run <script>` chdirs to the package root before running the script - bun's documented
behaviour, for every `package.json` script, not something a script can opt out of. That
breaks the cwd-as-context decision above through exactly the invocation this repository
documents: `cd boards/pt2399-core && bun run perfboard board-info` runs `board-info` standing
in the repository root, not `boards/pt2399-core`. Direct invocation
(`bun tools/cli/perfboard.ts board-info`) is unaffected - only `bun run` rewrites cwd. The fix
is a `-C <dir>` flag, spelled the same as make's own `-C`. This is not the `BOARD=<name>`
indirection this design rejects elsewhere (a board is named only by the directory you stand
in, because two ways to say which board is two places for one fact to be wrong): `-C <dir>`
names no board at all, it is a PATH that changes which directory counts as "here" before
that one naming mechanism (cwd-as-context) applies, so it stays "the same mechanism driven
from elsewhere" rather than adding a second one. `bun run perfboard -C boards/pt2399-core
board-info` is the documented invocation's answer to `bun run`'s chdir.

`runCli(argv, opts)` returns an exit code with injected dependencies, so every verb is
testable under `bun test` with no binary present.

#### What each binary-backed verb actually does

Parity with the make layer this was ported from, which recorded the authority for these. The
fork's headless surface is `--check`, `--update`, `--set-strips`, `--dump-board`,
`--dump-netlist`, `--import`, `--adopt`, `--stretch`.

- **`cuts`** — `--dump-board <vrt>`, then report the `CUT_STATE`, `CUT`, `CUT_CONFLICT`,
  `SOLDER` and `CUT_UNCONNECTED_PIN` lines. **A dump carrying no `CUT_STATE` line is a
  refusal, not an empty list**: it means the tool no longer understands what
  `--dump-board` prints, and printing nothing would read as "no cuts needed". `CUT_STATE
  NOT_APPLICABLE` means the board is in isolated-hole mode and has no strips to cut, which
  is reported as that fact plus the `stripboard` verb that changes it — again, not an empty
  list.
- **`update`** — guard, export the netlist from the declared circuit,
  `--update <vrt> --netlist <net> -o <temp>`, then atomically replace. Reports what changed
  and names `git checkout --` as the way back.
- **`stripboard`** — requires a strip direction (there is no default: it is a fact about
  the board in the operator's hand, not a preference this tool can hold). Guard,
  `--set-strips <vrt> --strips <dir> -o <temp>`, atomic replace, then run the update path
  with `--allow-dirty` to fill the strips it just created. Converting without filling is
  half a conversion.
- **`edit`** — hands the layout to the forked binary and returns. It must not use a generic
  "open this file" mechanism, which would consult the desktop's association for `.vrt` and
  could launch a stock VeroRoute: a build that opens the board perfectly well and silently
  lacks every verb this workflow depends on.
- **`veroroute`** — clone the pinned commit from `veroroute.pin` into `.tools/` and build
  it. An explicitly set `VEROROUTE` wins and suppresses acquisition entirely: that is the
  operator pointing at their own development build, and their checkout is theirs.

`check`, `cuts`, `board-info` and `boards` write nothing. `update` and `stripboard` write the
declared layout **in place**, because git is the undo and a target that wrote a copy elsewhere
and told you to move it into position would hand you the one step that can go wrong.

#### The dirty-state guard is scoped to the layout, not the tree

> **Every verb that mutates the declared `.vrt` — `update`, `stripboard`, and any mutating
> verb added later — must pass this guard before VeroRoute is invoked:** refuse when the
> declared `.vrt` has modifications relative to `HEAD`, or is untracked.

Stated as a shared prerequisite of mutation rather than per verb, so it is implemented and
tested once and a future mutating verb cannot quietly omit it.

A whole-repository check would be wrong: editing `circuits/pt2399-core/pt2399-core.ts` and then running
`update` to reconcile the board against that edit is the normal workflow, and forcing a commit
of unrelated source first would obstruct the loop this tooling exists to support. Untracked is
refused for the same reason modified is — `git checkout --` cannot restore a file git has
never seen, so the stated guarantee would not hold.

**The guard makes committing part of the reconcile loop, by design.** A second `update` after
an uncommitted first one is refused, and that is correct rather than awkward: it forces the
operator to look at what the first one did before stacking another on top of it. The
acceptance procedure below therefore carries an explicit commit checkpoint, and any narrative
that runs two mutations back to back without one is wrong.

#### The guard needs an escape hatch, and one verb requires it

An earlier revision of this document specified the guard with no way past it. That is
wrong, and `stripboard` is the proof: it converts a layout to strip mode **and then
immediately fills the strips by running the update path**. The first write leaves the
layout dirty, so the second write would be refused by the guard the first write just
satisfied. A guard with no bypass makes that verb unimplementable.

So mutation takes `--allow-dirty`, and `stripboard` passes it to its own internal update
step. The flag is not a convenience: it is an explicit statement that the operator accepts
this run cannot be undone.

The two refusals stay distinct, because they are different mistakes with different fixes:

- **Untracked** — git has never seen this layout, so there is no way back at all.
- **Tracked but modified** — there is a way back, but it does not reach the state the
  operator is looking at now.

`--allow-dirty` suppresses both, and a verb that used it says so in its output rather than
reporting success as though the undo were intact.

#### A mutating verb must not be able to leave a corrupt layout

The fork settles this rather than leaving it to preference: `--update` **requires** `-o` and
has no in-place mode at all —

```cpp
if ( outPath == nullptr ) {
    std::cerr << "--update requires an output file (-o)" << std::endl;
    return 1;
}
```

— and on every reconcile-failure path it saves nothing, which its own comment states ("NOTHING
IS SAVED ON ANY OF THESE PATHS"). Its serialization is a plain `QDataStream` over a `QFile`,
not a `QSaveFile`, so the write to `-o` is not itself atomic.

So the shape is not a choice: a mutating verb runs VeroRoute with `-o` pointing at a temporary
file **in the same directory as the declared layout**, and replaces the declared `.vrt` by
`rename` only after the binary exits successfully. Same-directory `rename(2)` is atomic, so
the layout is either the old one or the new one and never a half-written file. A failed or
crashed run leaves the declared layout untouched, which is what makes "your board is
unchanged" a statement rather than a hope.

### The board declaration names a circuit module

```json
{
  "circuit": "../../circuits/pt2399-core/pt2399-core.ts",
  "export": "pt2399Core",
  "vrt": "pt2399-core.perfboard.vrt"
}
```

`export` is required rather than defaulted: a module may export several circuits, and guessing
which one a board was built from is exactly the class of silent wrong answer this workflow
exists to prevent. Both paths resolve against the declaration's own directory.

### Board artifacts live in a board tree

```
circuits/pt2399-core/pt2399-core.ts    the circuit, with its canonical footprint selection
boards/pt2399-core/        the hand-authored placement and routing that realizes it
```

The circuit is reusable across through-hole boards; the board is one build. A second build —
different strip orientation, a smaller board — is a new directory rather than a conflict.

### The fork stays external

`oletizi/veroroute-perfboard` is a GPLv3 Qt application with its own build, correctly not
vendored and not a submodule. `veroroute.pin` names an exact commit; `perfboard veroroute`
clones and builds it under `.tools/`; `VEROROUTE` overrides, and when set to anything other
than the built path nothing is acquired or rebuilt — that checkout is the operator's.

There is no guessed binary path. The default names a file this repository is responsible for
creating, and acquisition refuses to exit 0 without it existing. A check that cannot find its
binary stops the run naming what to set, because a skipped perfboard check is
indistinguishable from a passing one.

## Architecture

```
circuits/
  pt2399-core.ts            EXISTING - gains PartSpec.footprint per component

lib/kicad/
  legacy-netlist.ts         EXISTING reader - gains the matching writer
  netlist.ts                EXISTING - modern reader, source of the footprints
  import-string.ts          NEW - five proven footprint families + override table
  value-notation.ts         NEW - numeric parameters -> KiCad value spelling

tools/perfboard/
  declaration.ts            ported: perfboard.json load + discovery
  check.ts                  ported: spawn, exit-code-only verdict, verbatim report
  load.ts                   NEW - load a declared circuit module and call its export

tools/cli/
  perfboard.ts              the verbs

boards/pt2399-core/
  perfboard.json
  pt2399-core.perfboard.vrt   carried across unchanged
  pt2399-core.perfboard.png

veroroute.pin               the pinned fork commit
```

### Data flow

```
circuits/pt2399-core/pt2399-core.ts
    |  pt2399Core() -> Network
    v
Network + DESIGNATORS + PIN_NUMBERS      PartSpec.footprint
    |                                         |
    | (designator, pin) -> net                | import-string.ts
    | value-notation.ts                       |
    v                                         v
         +---- legacy-netlist writer ----+
                        |
                        v
     EESchema v1.1 netlist, package field = import string
                        |
                        v
        veroroute --check <board.vrt> --netlist <file>
                        |
                exit 0 / exit 1 + verbatim report
```

The netlist is regenerated on every run into a temp directory, so the comparison is against
the circuit as it is now rather than a checked-in netlist that may itself be stale.

## Testing

`bun test`, and no test requires the VeroRoute binary.

| Surface | Test |
| --- | --- |
| Footprint transcription | every component's footprint matches `pt2399-core.net` |
| `import-string.ts` | each family; both quantization rules; refusals; all 24 parts |
| `value-notation.ts` | the board's twelve values; refusal outside proven decades |
| The writer | writer self-consistency, and full chain reproducing the fixture |
| `declaration.ts` | absent / wrong-typed / empty fields are three messages |
| `check.ts` | exit 0, exit 1, unexpected status throws; report carried verbatim |
| `perfboard.ts` | every verb with injected deps; unknown flags; cwd resolution |

Assertions are on reports and exit codes, never on `.vrt` bytes — a `.vrt` is a versioned
serialization artifact, so a byte-for-byte golden fails when serialization changes without
semantics changing, and passes a semantically wrong board whose bytes happen to match. Byte
comparison is used only to assert a board was *not* modified.

## Implementation phases

1. **Footprints.** Transcribe `PartSpec.footprint` into `circuits/pt2399-core/pt2399-core.ts` from the
   modern netlist fixture, with the test that pins them to it.
2. **Import strings.** `lib/kicad/import-string.ts`: the five proven footprint families, both
   quantization rules, the empty override table, and the 24-part assertion against the two
   fixtures.
3. **Value notation.** `lib/kicad/value-notation.ts`, reconstructing source spelling from the
   numeric parameters, pinned by the board's twelve values.
4. **The writer.** EESchema v1.1 emission in `lib/kicad/legacy-netlist.ts`, proven through the
   reader by both assertions above.
5. **The declaration and check.** `tools/perfboard/{declaration,check,load}.ts`, ported.
6. **The CLI.** `tools/cli/perfboard.ts`, every verb, including the layout-scoped guard.
7. **The fork.** `veroroute.pin`, the `veroroute` verb, `.gitignore` for `.tools/`.
8. **The board and the fixed-point acceptance.** `boards/pt2399-core/` with the carried
   `.vrt`, run to the fixed point below.

Phases 1–6 need no VeroRoute binary. Phase 8 is acceptance and is where inherited
discrepancies surface.

### Phase 8 acceptance: reaching a fixed point

A single green `check` is not sufficient acceptance for a reconciliation system: it can hide a
derivation wrong in a way the first pass tolerates, or an emitter stable only by accident.

0. **Commit the carried layout**, before any mutating verb runs. It arrives in this repository
   as a new, untracked file, and the guard refuses an untracked layout — so without this the
   very first `update` is rejected.
1. `check` — record the report. Inherited deltas (C3's body diameter, any residue) surface.
2. Resolve each reported delta deliberately, against the physical board.
3. `update`, if the resolution requires it.
4. `check` — must exit 0.
5. **Inspect and commit the reconciled layout.** This checkpoint is load-bearing, not
   bookkeeping: step 3 left the `.vrt` modified relative to `HEAD`, so the guard refuses
   step 6 until it is committed.
6. `update` again — **must report an empty plan.**
7. `check` again — must exit 0.

Step 6 is the fixed point. A reconciler that keeps finding work on an unchanged input is wrong
in a way steps 1–4 cannot reveal.

The two commit checkpoints are a consequence of the dirty-state guard, and an earlier revision
of this document omitted them and so specified an acceptance procedure its own guard would
have refused. They are also the point of the guard rather than a tax imposed by it: each one
is a moment where the operator looks at what a mutation did before stacking another on top,
and each gives `git checkout --` something to return to.

The assertion at step 6 is on **the plan being empty**, not on `.vrt` bytes. That distinction
is load-bearing rather than cautious: at the pinned commit, byte-identity across an empty-plan
update is **false**, and measurably so.

`--update` re-serializes on every write, and the fork saved several persisted collections by
iterating a `std::unordered_map`. Iteration order there is a property of the hash table's
insertion history rather than of the board, so a load followed by a save reordered the file —
on libc++, exactly reversing the component list. Measured on this board: one save changed
10151 of 33309 bytes, and a second save returned the file byte-for-byte to where it started.
The board never changed; the file oscillated between two spellings of it and settled on
neither.

So an `update` that reconciles nothing still rewrites the layout, and the resulting whole-file
diff is indistinguishable from a real layout change. The empty plan is the only signal that
means what it says, which is why step 6 asserts on that and nothing else.

The cause is fixed upstream in the fork — save in key order, so the written bytes are a
function of the board alone (`oletizi/veroroute-perfboard` PR #2). Until `veroroute.pin` moves
to a commit carrying that fix, the paragraph above describes this repository's behaviour. When
it does move, the first save of any existing board reorders it once more, from hash order to
id order, and is stable from then on — so expect exactly one reordering commit per board at
that point, and none after.

## Risks and open questions

1. **C3's body diameter is a known inherited discrepancy.** The netlist side derives
   `CAP_ELECTRO_250` from `CP_Radial_D6.3mm_P2.50mm` and is self-consistent; the source
   repository's reports indicate the board holds `CAP_ELECTRO_300`. **Do not pre-emptively
   "fix" this.**
   Whatever the first check reports at phase 8 is ground truth, resolved then against the
   physical part.

2. **Strip mode.** The perfboard design records this board's `m_bVeroTracks` as false
   (isolated-hole perfboard) as of 2026-09-16, with twelve unrouted board-side nets genuine.
   The layout has been worked on since. Phase 8 establishes the current state; the
   `stripboard` verb exists if conversion is wanted.

3. **Off-board pad provenance.** `J1`'s five pins become `J1_1`..`J1_5` on the board via
   `BreakComponentIntoPads()`. Reconciliation resolves these through persisted provenance
   fields (VeroRoute format version 60). This is fork behavior and needs nothing here, but a
   pre-60 board needs the fork's one-time `adopt` step. Confirm at phase 8.

4. **Loading a circuit module from the CLI.** The declaration names a module and an export;
   `tools/perfboard/load.ts` imports it dynamically. A module that throws on import, or whose
   named export is absent or is not a function returning a `Network`, must fail naming the
   declaration — not produce an empty netlist, which would read as a board with no parts.

5. **`unconnected-(U1-CLK_O-Pad5)` is a single-member net.** It exists because the netlist
   shows pin 5 on a placeholder net rather than showing no connection. The writer must emit it
   as the fixture does. Whether VeroRoute treats a one-pin net as trivially complete is noted
   in the perfboard design (it does — fewer than two placed pins reads as cost zero), so it
   should not disturb the check.

## Out of scope

- Everything in the source repository's `tools/kicad/*`, `tools/derivation/*`, `board-sync`
  and `derive` — the KiCad PCB flow, which does not belong here.
- The `make/*.mk` layer.
- Any change to the VeroRoute fork. It is consumed at a pinned commit.
- Retiring the source repository's own copies. A separate decision in a separate repository.
- Automatic placement or routing as the primary workflow.
- Any write path from layout back to the circuit.
