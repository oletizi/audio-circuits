# AI-native / agent-driven EDA for schematic capture and layout

Survey date 2026-10-28. Scope: platforms and libraries that an **agent** could
drive to produce a **schematic a person can build from at a bench**, with
attention to KiCad interoperability.

## How to read this document

Every claim below is tagged:

- **VERIFIED** — this writer checked a primary source and names it. Where the
  source is code, the commit is named and the grep or file read is reproducible.
- **RELAYED** — a secondary source or the vendor's own marketing says it; this
  writer did not confirm it.
- **UNVERIFIED** — could not be established either way; stated as a gap.

A figure in this file is a transcription with a date on it. Where a claim is a
count of something in a live repository, the command that re-derives it is given
beside it so the reader can re-run rather than trust.

**One methodological limit, stated up front:** this survey's web-search budget
was exhausted (200/200 calls) before every lead was closed. The leads left open
are listed in [Not closed](#not-closed) rather than quietly dropped.

---

## The finding that reframes the whole survey

**You cannot write a KiCad schematic through KiCad's API. Every tool that
generates one writes the s-expression file directly.**

VERIFIED, against KiCad's own source on `master` today:

```
curl -s "https://gitlab.com/api/v4/projects/kicad%2Fcode%2Fkicad/repository/files/api%2Fproto%2Fschematic%2Fschematic_commands.proto/raw?ref=master" | grep -n '^message'
```

returns, in an 82-line file, exactly three commands and their responses:

| Command | Direction |
| --- | --- |
| `GetSchematicHierarchy` | read |
| `GetSchematicNetlist` | read |
| `PlaceSymbolFromLibrary` | **write — the only one** |

By comparison `api/proto/board/board_commands.proto` on the same revision holds
**60** messages (`grep -c '^message'`). The schematic side of the IPC API can
place a symbol. It has **no command to draw a wire, place a label, create a
junction, or add a sheet.** `api/proto/schematic/` exists on both `master` and
the `10.0` branch, so this is the shipped state, not a pre-release gap.

And the CLI is export-only. VERIFIED on the locally installed KiCad **10.0.5**:

```
$ kicad-cli sch export --help
Usage: sch export [--help] {bom,dxf,hpgl,netlist,pdf,ps,python-bom,svg}
```

There is no `sch import`, no `sch generate`, no netlist-to-schematic verb.

**Three independent codebases converge on the same workaround**, which is the
strongest evidence that it is the only one:

- `tscircuit/circuit-json-to-kicad` emits `.kicad_sch` through the `kicadts`
  s-expression object model (VERIFIED by reading
  `lib/schematic/CircuitJsonToKicadSchConverter.ts`, which imports
  `KicadSch` from `kicadts`).
- `copperheadhq/copperhead` carries its own `src/kicad/sexp.ts` and
  `src/kicad/emit.ts` and edits `.kicad_sch` files directly (VERIFIED by file
  listing at commit `476cc15`).
- `tpecar/nl2sch`'s README says so in as many words: it generates "the
  schematic file directly" because "KiCad's eeschema API wasn't ready"
  (RELAYED — fetched README summary, not read in full).

**What this means for this repository.** The question "which platform can we
drive to get a schematic" has a narrower answer than it looks: *nobody is
driving KiCad to draw a schematic, because KiCad will not be driven.* The
competitive surface is entirely about who writes better s-expressions from a
better intermediate representation. That is the same problem `lib/schgen/`
already has, which means the useful imports from this survey are **libraries and
architectures**, not platforms.

---

## tscircuit — the key question, answered

This repository rejected tscircuit on 2026-09-21
(`docs/decisions/2026-09-21-why-not-tscircuit.md`) on one specific ground: a
schematic wire-routing failure is silently re-rendered as a net label via
`_doInitialSchematicTraceRenderWithDisplayLabel()`, producing a drawing that
looks deliberate. The task asked whether that behaviour has changed and whether
routing failures can now be made loud.

### Method

Shallow-cloned `tscircuit/core` and `tscircuit/props` at HEAD and grepped the
source. This is a check that could have failed — the function could have been
deleted, or an error record could have appeared.

```
git clone --depth 1 https://github.com/tscircuit/core.git
git clone --depth 1 https://github.com/tscircuit/props.git
```

- `core` HEAD: `d02e74a61471b0b5eb71de0c7ea9610b1a086f76`, `Wed Oct 28 18:11:34 2026`, tagged `v0.0.2228`
- `props` HEAD: `7378262fbd85ad8a2929556f80fab9ea37172561`, `Wed Oct 28 06:05:49 2026`
- npm: `@tscircuit/core@0.0.2228`, `time.modified = 2026-10-28T18:13:13Z`

The project is extremely active — core was published the same day this survey
ran. Nothing here is a judgement on an abandoned tool.

### Answer: the behaviour has NOT changed, and it now covers more cases

**VERIFIED.** The function exists at HEAD, in its own file, called from three
sites:

```
core/lib/components/primitive-components/Trace/Trace__doInitialSchematicTraceRenderWithDisplayLabel.ts:5
core/lib/components/primitive-components/Trace/Trace.ts:384
core/lib/components/primitive-components/Trace/Trace_doInitialSchematicTraceRender.ts:234, 393, 494
```

The failure path at line 383–394 of `Trace_doInitialSchematicTraceRender.ts` is
verbatim:

```ts
let results: SimplifiedPcbTrace[] = autorouter.solveAndMapToTraces()

if (results.length === 0) {
  if (
    !hasSheetLocalSchematicPortRepresentation &&
    (trace._isSymbolToChipConnection() ||
      trace._isSymbolToSymbolConnection() ||
      trace._isChipToChipConnection())
  ) {
    trace._doInitialSchematicTraceRenderWithDisplayLabel()
    return
  }
  const directLineRouter = new DirectLineRouter({ input: simpleRouteJsonInput })
  results = directLineRouter.solveAndMapToTraces()
```

Zero results from the autorouter, and the connection is one of three recognised
kinds, means a label is emitted and the function returns. **No warning, no error
record, no return value, nothing a caller can test.** The hardcoded
`MAX_ITERATIONS: 100` and `OBSTACLE_MARGIN: 0.1` are still at the call site,
exactly as the September decision recorded.

**One thing changed, and it widened the behaviour.** The September note recorded
the condition as symbol-to-chip or symbol-to-symbol.
`_isChipToChipConnection()` is now in the disjunction too. This writer cannot
distinguish "added since September" from "the September note was incomplete" —
the shallow clone has no history. Either way, the silent degradation at HEAD
covers chip-to-chip connections, which is most of a digital schematic's
interesting wiring and a fair amount of an analog one's.

**And there is a second degradation this repository had not recorded, which
fires on SUCCESS.** VERIFIED, same file, lines 486–495:

```ts
if (
  !hasSheetLocalSchematicPortRepresentation &&
  trace.getSubcircuit()._parsedProps.schTraceAutoLabelEnabled &&
  countComplexElements(junctions, edges) >= 5 &&
  (trace._isSymbolToChipConnection() ||
    trace._isSymbolToSymbolConnection() ||
    trace._isChipToChipConnection())
) {
  trace._doInitialSchematicTraceRenderWithDisplayLabel()
  return
}
```

The autorouter **succeeded**. `edges` and `junctions` are computed. They are
then discarded and replaced with a label because the route has five or more
complex elements. This is a legibility heuristic — a dogleggy wire is arguably
worse than a label — and as a *design choice* it is defensible. As a
*mechanism* it is the same failure: a drawing decision taken on the agent's
behalf with no record that it was taken.

The mitigating fact, and it matters: this one is gated on
`schTraceAutoLabelEnabled`, which **is** in the props schema (VERIFIED:
`props/lib/components/group.ts:644` declares `schTraceAutoLabelEnabled?: boolean`
and line 782 `z.boolean().optional()`). It is `optional()` with no default, so
absent means falsy, so **the success-path substitution is opt-in and off by
default.** The failure-path substitution has no flag at all.

### Can routing failures be made loud? No — and the asymmetry is structural

This is the sharpest result in the survey, because tscircuit **already has the
mechanism** and declines to use it on the schematic side.

VERIFIED by grep over `core/lib` at HEAD:

| Query | Hits |
| --- | --- |
| `pcb_autorouting_error` | present in ~8+ sites, including `Group.ts` lines 1006, 1301, 1579, 2155, 2219, and three dedicated `should-skip-autorouting-because-of-*.ts` helpers |
| `schematic_error`, `schematic_route_error`, `schematic_trace_error`, `schematic_autorouting_error` | **zero** |
| `routingFailure`, `RoutingFailed`, `strictSchematic`, `throwOnRoutingFailure` in `core/lib` and `props/lib` | **zero** |

So: a **PCB** autorouting failure inserts a first-class, queryable
`pcb_autorouting_error` record into the circuit JSON. A **schematic** routing
failure inserts a `schematic_net_label` that is indistinguishable from one the
author asked for. There is no schematic error record type in the system. The
tool knows how to be loud; it is loud about copper and quiet about drawings.

`_schDirectLineRoutingEnabled` — the escape hatch the September decision
identified — is **still unreachable**. VERIFIED: it is read in core
(`Trace_doInitialSchematicTraceRender.ts:349`, as
`trace.getSubcircuit().props._schDirectLineRoutingEnabled`) and `grep -rn
"schDirectLineRouting" props/lib` returns **nothing** at props HEAD. The
September finding that zod's default `strip` mode removes it before it reaches
core therefore stands unrefuted; this writer did not re-run it empirically, so
treat the *mechanism* as RELAYED from the earlier decision and the *absence from
the schema* as VERIFIED.

**Nothing in the September decision has been refuted. The disqualifying property
is intact, it covers one more connection class, and there is a second instance
of the same pattern that the decision did not know about.**

### What a consumer CAN do, which is worth recording

The degradation destroys the *distinction* but not the *evidence*. The emitted
circuit JSON contains `schematic_net_label` records. A caller who knows which
nets it asked to be wired can count labels against that expectation and refuse.
That is a loud gate — built **outside** tscircuit, by the consumer, over the
output. It is not configuration; it is post-hoc detection. For this repository
that is an interesting shape regardless of tscircuit: *the gate lives in the
consumer and reads the artifact*, which is precisely the "criteria never reach
an artifact through the agent that produced it" invariant.

Caveat on that detection, stated because it is the obvious trap: a
`schematic_net_label` is also the legitimate rendering of an intentional net
label, so a bare count conflates the two. The caller must compare against
declared intent, not against zero.

### The rest of tscircuit's schematic layout story, late 2026

The task asked specifically about `@tscircuit/schematic-autolayout` and newer
packages. The picture is one of rapid churn with the old names left standing.

| Package | npm version | npm `time.modified` | Status |
| --- | --- | --- | --- |
| `@tscircuit/core` | 0.0.2228 | 2026-10-28 | live, daily |
| `@tscircuit/props` | 0.0.715 | 2026-10-28 | live |
| `@tscircuit/schematic-trace-solver` | 0.0.214 (npm) / 0.0.238 (pinned in core via jscdn tarball) | 2026-09-29 | live, 778 commits |
| `@tscircuit/schematic-autolayout` | 0.0.8 | **2026-08-19** | 4 stars, 38 commits — effectively dormant |
| `@tscircuit/schematic-match-adapt` | 0.0.18 (still a core dependency) | — | **repository archived 2025-08-04**, read-only |
| `@tscircuit/matchpack` | ^0.0.100 (core dependency) | — | live |

VERIFIED: versions and `time.modified` from `npm view`. VERIFIED: core's
`package.json` at HEAD lists `@tscircuit/schematic-match-adapt: ^0.0.18` and
`@tscircuit/schematic-trace-solver` pinned to a
`https://jscdn.tscircuit.com/.../0.0.238.tgz` tarball. RELAYED: the archive date
of `schematic-match-adapt` and the star counts, from GitHub page fetches.

Two notes a later reader needs:

1. **`@tscircuit/schematic-autolayout` is the wrong package to evaluate.** It
   holds row/column/"central LR bug with ascending columns" placement
   heuristics, is at 0.0.8 with 4 stars, and has not moved since August. The
   live placement work is `matchpack` and the live routing work is
   `schematic-trace-solver`. Core depends on both.
2. **Core depends on an archived repository.** `schematic-match-adapt`
   (the "Partition Match Adapt Refine Stitch" template-matching layout engine)
   is read-only on GitHub yet still in core's dependency list. Core also pins
   several solvers to **git commit SHAs and CDN tarballs** rather than npm
   ranges (`bga-fanout-solver`, `implicit-copper-pour-solver`,
   `via-stitch-solver`, `winding-breakout-point-solver`, `bus-lanes-solver`,
   `dogbone-solver`, `flex-utils`). VERIFIED from `core/package.json`. That is a
   supply-chain shape worth knowing before depending on core.

**`schematic-trace-solver` makes net labels first-class rather than
exceptional.** Its documented pipeline is `MspConnectionPairSolver` (minimum
spanning tree over pin pairs) → `SchematicTraceLinesSolver` →
`TraceOverlapShiftSolver` → `NetLabelPlacementSolver` → `InlineNetLabelSolver`
→ `NetLabelToTraceSolver`, and its README states: *"Net connections will not be
routed, net labels are placed instead."* (RELAYED — README fetch.) Its issue
tracker carries PRs titled "Fix horizontal fallback bounds for rail net labels"
and "test: reproduce ground label orientation fallback", and core carries
"fix(schematic): mark ports with attached **fallback**/solver net labels as
connected" (`tscircuit/core` PR #4709). RELAYED from search-result titles, not
read. The word *fallback* is load-bearing: the new solver has a label-fallback
concept of its own, and the work going into it is about placing those labels
*better*, not about reporting that they happened.

**Agent surface: real, and it is a CLI.** `@tscircuit/cli` 0.1.2420 and
`@tscircuit/eval` 0.0.1665, both modified 2026-10-28 (VERIFIED via `npm view`).
Headless evaluation of a `.tsx` circuit to circuit JSON is a genuine programmatic
surface an agent can drive. MCP servers exist but **none is official**:
`charlielockyer-rice/tscircuit-mcp` (read-only access to the component
registry), `cloudlnkcn/tscircuit-mcp` (claims write/eval/check/preview/export),
`mohan-bee/pcb-runframe-mcp`. RELAYED from search results and MCP directory
listings; this writer installed none of them. Treat the ambitious one as
unverified.

**Independent corroboration of the silent-failure pattern, from two unrelated
parties.** This matters because the September decision rests on one reading of
one code path by one agent in this repository.

- A dev.to writeup, *"A documented prop that silently stacked every component at
  the origin"*, describes `pcbLayout={{ matchAdapt: true }}` in tscircuit/core
  having no branch in `Group.ts`'s dispatch, so every component stayed at the
  origin. Quoted: *"Not an error. Not a warning. Four components, one
  coordinate, a board that looks plausible until you notice all the footprints
  are in the same place."* RELAYED. Different code path, same class of defect:
  a documented option degrading silently into plausible-looking garbage.
  Corroborated by three separate core PRs in the search results all titled some
  variant of "fall back to pack layout when `pcbLayout` mode is `match-adapt`"
  (#4025, #4668, #4744) — a fallback that needed fixing three times.
- `copperheadhq/copperhead` issue #233 audits schematic drawing quality against
  a human's and reports *"a 16-cap bank carries 26 power symbols where the human
  used 2"*, labels reduced *"197 to 117"* after fixes, and — the relevant part —
  that the round-trip reported `lost=0 gained=0` the whole time: *"hiding the
  quality loss in file metrics rather than obvious errors."* RELAYED. That is
  this repository's own "look at the output, not only the tests" written by
  someone else.

### URL

`https://github.com/tscircuit/core`,
`https://docs.tscircuit.com/guides/tscircuit-essentials/automatic-schematic-layout`
(which still says, verbatim: *"Automatic layout is in beta! We're changing and
improving the layout algorithms, if it doesn't work for you stay tuned!"*).

---

## The two libraries worth taking from tscircuit without taking tscircuit

This is the most actionable result for this repository, and it was not in the
brief.

### `kicadts` — MIT, typed TypeScript object model for KiCad s-expressions

`https://github.com/tscircuit/kicadts` · npm `kicadts@0.0.62`, modified
2026-10-27 (VERIFIED via `npm view`). 229 commits, 9 stars, MIT (RELAYED from
GitHub fetch).

Reads **and** writes `.kicad_sch`, `.kicad_pcb`, `.kicad_mod`. Every KiCad token
is a class; populate the model and call `getString()` for deterministic
s-expression output. Standalone — it does not depend on tscircuit core.

Given the KiCad-API finding above, this is the only generally useful answer to
"how does a TypeScript program write a `.kicad_sch`". It is the layer this
repository would otherwise have to write itself. Caveat: 9 stars, `0.0.x`, and
the README's example shows `version: 20240101`, so format-version currency
against KiCad 10 is **UNVERIFIED**.

### `circuit-json-to-kicad` — the serializer, usable without tscircuit's router

`https://github.com/tscircuit/circuit-json-to-kicad` · npm
`circuit-json-to-kicad@0.0.258`, modified 2026-10-28, 783 merged PRs
(VERIFIED: `npm view`; `git log -1` gives `590ba3d`, `Wed Oct 28 08:53:39 2026`,
`v0.0.258 (#783)`).

VERIFIED by reading `lib/index.ts` and `lib/schematic/`: it exports
`CircuitJsonToKicadSchConverter`, `CircuitJsonToKicadPcbConverter`,
`CircuitJsonToKicadProConverter`, `CircuitJsonToKicadModConverter`,
`CircuitJsonToKicadLibraryConverter`. The schematic path is a staged pipeline:

```
InitializeSchematicStage → AddLibrarySymbolsStage → AddSchematicSymbolsStage
→ AddSchematicTracesStage → AddSchematicNetLabelsStage
→ AddSchematicGraphicsStage → AddSheetInstancesStage
```

with real supporting machinery around it: `selectSchematicPaperSize`,
`getSchematicPageLayout`, `createKicadSchematicTitleBlock`,
`partitionCircuitJsonBySheet`, `buildSchematicSheetPlan`, `buildChildSheetNodes`
(hierarchical multi-sheet export), and a `symbols-stage-converters/` directory
that builds library symbols from schematic primitives (arcs, polylines,
rectangles, circles, text, fills). `AddSchematicTracesStage` emits `Wire`, `Pts`,
`Xy`, `Stroke`, `Junction` from `kicadts`.

**The decisive property, VERIFIED from its imports:** the converter's only
inputs are `CircuitJson` (the open `circuit-json` format),
`@tscircuit/circuit-json-util`, `kicadts` and `transformation-matrix`. **It does
not import `@tscircuit/core`.** So a project that emits Circuit JSON — symbol
positions, `schematic_trace` edges, net labels — can use this as a pure
`.kicad_sch` serializer and **never instantiate tscircuit's React runtime or its
rejected router at all.**

That is the shape to consider: keep this repository's own `lib/schgen/` placer
and router, which is where the acceptance criteria live and can be made loud,
and borrow only the s-expression serialization that KiCad's API refuses to
provide.

**Two caveats, both load-bearing.**

1. `AddSchematicTracesStage` serializes whatever `schematic_trace` records
   exist; `AddSchematicNetLabelsStage` serializes whatever `schematic_net_label`
   records exist, turning them into KiCad global labels and `#PWR` power
   symbols (VERIFIED: `AddSchematicNetLabelsStage.ts:36, 126, 221`). Neither
   stage can tell a degraded label from an intended one — **the information was
   destroyed upstream in core.** So if you *do* drive the full tscircuit stack,
   the degradation is carried faithfully into the `.kicad_sch` and arrives in
   KiCad looking like a deliberate net label. That is this repository's
   disqualifying concern, now propagated all the way to the deliverable.
2. 10 stars, `0.0.x`, no CLI binary (library only — `bin` is empty, VERIFIED
   from `package.json`), and `grep -rn "TODO\|not supported\|NotImplemented\|
   unsupported" lib/` returned **nothing**, which means the README has no
   limitations section *and* the code carries no markers — so the honest
   statement is that **its gaps are undocumented**, not that there are none.

---

## Copperhead — the closest thing to this repository's own program

`https://copperhead.sh` · `https://github.com/copperheadhq/copperhead`

This was not in the brief and is arguably the most relevant find. It is an
open-source agent that designs, documents and verifies PCBs by editing real
KiCad files in a git repository — described by its own README as *"Cursor for
circuit boards."*

VERIFIED by shallow clone, HEAD `476cc15965f0d1eeda70afb9e806936f6bb15c5c`,
`Thu Oct 22 12:55:16 2026`:

| Fact | Value |
| --- | --- |
| npm name / version | `copperhead` 0.12.0 |
| License | Apache-2.0 |
| Runtime | Node ≥20, TypeScript |
| Runtime deps | `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `commander`, `execa`, `openai`, `zod` — six, deliberately thin |
| CLI binary | `copperhead` → `dist/cli.js` |
| MCP server | `src/mcp/server.ts` — present in-tree |

RELAYED from the GitHub page: 666 stars, 139 forks, 424 commits, 114 open
issues, 161 PRs.

### What it actually does

RELAYED from the README: `copperhead do "add reverse-polarity protection on
VIN"` proposes a change, edits `.kicad_sch` and `.kicad_pcb` directly, runs
ERC/DRC through `kicad-cli`, and iterates until the checks pass. CLI verbs:
`init`, `do`, `check`, `create`, `sync`, `export bom`, `skill`, `doctor`, `mcp`,
with `--model`, `--dry-run`, `--json`.

**It is explicitly not a router:** *"Not an autorouter. Routing stays human or
delegated; copperhead produces the DRC-clean draft that layout tools optimize
from."*

### The architecture, which is the part worth stealing

VERIFIED by file listing and reading headers under `src/kicad/`:

```
src/kicad/draft/ir.ts          489 lines   SchematicIntent / IntentNet / IntentPart / ValidatedIntent
src/kicad/draft/engine.ts    6,616 lines   the deterministic drafting engine
src/kicad/draft/symsource.ts   615 lines   symbol resolution, power symbols
src/kicad/draft/draft.ts       224 lines   orchestration
src/kicad/legibility.ts        743 lines   the read-only legibility checker
src/kicad/sexp.ts, emit.ts                 s-expression read / write
```

The engine's own header comment, VERIFIED verbatim:

> *"The rule-based deterministic drafting engine (design D1/D2). All geometry is
> computed in integer multiples of the 1.27mm grid, so every pin lands on-grid
> by construction. No randomness, no clock, no environment-dependent ordering:
> identical IR yields an identical placement model on every machine."*

It carries named, commented constants of exactly the kind this repository's
stripboard and schematic work needs — `U = 1.27`, `STUB = 2`, `BASE_MARGIN = 4`,
`MEASURED_MARGIN = 2`, `VMARGIN = 2`, `POWER_REACH = 6`, `MEASURE_PAD = 1`,
`BOX_PAD`, `BOX_INSET`, `BANK_AIR`, `BANK_GAP`, `NC_HALF` — and an `Overhang`
type measured from *what a cell actually drew*, with a second pass that shrinks
the cell to the measured extent. That is the "minimising a measurable cost is
not a taste judgement" practice, implemented.

**And the legibility checker is the invariant this repository states, written as
code.** Its header, VERIFIED verbatim:

> *"Deterministic read-only legibility checker (design C1-C9). Pure geometry over
> the sexp accessors: no serialization, no file writes, no subprocess, no
> network, no LLM. `check` reports its findings; the create pipeline gates on
> them (design C6)."*

Thirteen named failure families with per-family severity, VERIFIED from
`LEGIBILITY_FAMILIES` and `DEFAULT_SEVERITY`:

| Family | Severity |
| --- | --- |
| `off-grid` | error |
| `symbol-overlap` | error |
| `text-collision` | error |
| `wire-through-symbol` | error |
| `out-of-frame` | error |
| `ungrouped-symbol` | error |
| `unlabeled-group` | error |
| `group-overlap` | error |
| `empty-title-block` | error |
| `label-orientation` | advisory |
| `low-utilization` | advisory |
| `crowding` | advisory |
| `cross-group-wire` | advisory |

The division of labour is: **the LLM writes the intent IR; a deterministic
engine draws; a deterministic checker that never saw the LLM gates the result.**
That is `CLAUDE.md`'s "an agent may never author the acceptance criteria for the
artifact it is producing," expressed as three modules. Whatever else this survey
found, this is the design to read.

### Be skeptical of it, in three specific ways

1. **Its own honesty is the strongest skeptical signal, and it is damning.**
   RELAYED from the README: status *"early"*; Phase 1 implemented; and —
   quoted — *"its acceptance tests need a live model and have not been observed
   passing end to end."* A tool whose end-to-end acceptance has never been
   observed passing is not a tool you adopt; it is a design you read.
2. **Only part of it is deterministic.** `init`, `check` and `export bom` are
   LLM-free. `do`, `create` and `sync --resolve` require a model backend. So the
   deterministic engine and checker are reachable, but the thing that makes the
   intent is not.
3. **`engine.ts` is 6,616 lines in one file.** By this repository's own
   300–500-line rule that is thirteen to twenty-two files' worth of code in one.
   Read it for its constants and its two-pass measure-then-shrink idea; do not
   read it as a model of modularity.

Its issue #233, quoted in the tscircuit section above, is also the best
available third-party evidence that "generated schematic" and "schematic a human
would accept" are far apart even in a deterministic, non-LLM drafting pipeline —
26 power symbols where a person used 2, and the round-trip metrics reporting
`lost=0 gained=0` throughout.

---

## Koppar — the only hosted platform with a real agent surface and a schematic claim

`https://koppar.ai` · `https://github.com/Koppar-AI/koppar-kicad-plugin` ·
MCP endpoint `https://app.koppar.ai/mcp`

Not in the brief. The strongest *"an agent can drive this today"* answer in the
survey for anything that claims to produce a schematic.

**The MCP server is real and remote.** RELAYED from the Glama MCP connector
listing: Streamable HTTP, `MCP 2025-11-25`, at `https://app.koppar.ai/mcp`,
exposing **64 tools**. The schematic-relevant ones named in that listing:

| Tool | Claim |
| --- | --- |
| `submit_circuit` | synthesizes a schematic from a design brief |
| `edit_circuit` | *"Apply SEARCH/REPLACE patches to your latest script and re-run every check"* |
| `create_custom_symbol` | registers symbols for parts absent from KiCad libraries |
| `create_design`, `import_kicad_project` | project lifecycle |
| `auto_place`, `anneal_place`, `place_footprints` | placement |
| `route_board`, `couple_pairs`, `finish_board` | routing |
| `run_drc`, `check_net_rules`, `check_physics` | checks |
| `get_bom`, `choose_bom_part`, `consolidate_bom_basic` | sourcing |

Note what `edit_circuit` gives away: patches are applied to *"your latest
script"*, so Koppar has an internal circuit **DSL or script** as its
intermediate representation, not a GUI document. That is the same architectural
bet as atopile, JITX, Coppr and this repository. The DSL itself appears
undocumented publicly — **UNVERIFIED**.

**KiCad output including schematics.** RELAYED from the plugin README: "Ask
Koppar" lets you describe a board and Koppar *"researches the parts, writes and
checks the schematic, then places and routes the board"*, producing complete
KiCad projects — `.kicad_sch`, board, rules, libraries, BOM. The plugin supports
KiCad 7–10 on Linux/macOS/Windows, uses only Python stdlib plus `pcbnew` and
`wx`, and returns changes as one entry on KiCad's undo stack. It also ships
`scripts/route_board.py` and `scripts/board_tool.py` as CLI entry points.
Apache-2.0 for the plugin code (name and logo trademarked).

**Pricing.** RELAYED from koppar.ai: free tier of three designs, no card;
pay-as-you-go €15/$15 per finished board; "Builder" €39/month with 5 boards,
unlimited edits, and **CLI/MCP/Claude Code access**; Team custom per-seat. The
site also says paid plans *launch in 2027* with teams currently on a pilot
programme — so the self-serve commercial surface is **not yet live**, and the
€39 tier that gates MCP access is a future product. Flag this hard.

**Skeptical read.** The plugin repository had **0 stars and 2 commits** when
fetched (RELAYED) — the GitHub presence is a distribution channel for a
closed, server-side product, not the product. All generation runs server-side
behind an API key from `app.koppar.ai`. No named customers, no funding
disclosed, no team named, no founding date. The Glama listing's own TDQS note
says a 64-tool surface is *"far beyond a reasonably scoped MCP tool set."* The
headline claim *"nobody touched the copper"* and the gate *"boards only receive
Gerbers at zero DRC errors"* are both about **copper**: DRC-clean says nothing
about whether the schematic is legible, and this survey found no legibility
claim or metric anywhere in Koppar's material. Their one genuinely reassuring
claim is that parts which cannot be found are *"reported, not invented"*, which
is the right posture — **unverified**.

**Schematic quality: entirely unverified.** No independent review, no sample
`.kicad_sch`, no user reports were found. This writer did not create an account.

---

## ProtoFlow — claims a CLI and MCP; treat with care

`https://www.protoflow.ai` · desktop app, Windows/macOS/Linux, "ProtoFlow LLC",
© 2026.

RELAYED from its own site: plain-English description to an editable schematic
with real LCSC/DigiKey/Mouser parts; ERC/DRC; ngspice simulation; git
integration; export to **KiCad**, Altium, EAGLE, PADS, EDIF, plus Gerbers,
drill and JLCPCB BOM/CPL. Pricing: Free (no expiry, 5 basic + 10 Pro AI
messages/day, 10 part-generation units/month), Pro $19.99/month, Enterprise
custom. Crucially for this survey, the site states you can *"drive the editor
from your own tools over the ProtoFlow CLI and MCP."*

Their own framing is the right one and worth quoting: *"Treat it like a fast
junior engineer. You still sign off."* They also claim every generated symbol
and footprint opens in the normal editors with checkable pin numbers and pad
dimensions.

**Skeptical read, and it is substantial.** The web presence is dominated by SEO
comparison pages — `/compare/best-ai-schematic-generator`,
`/compare/flux-ai-alternative`, `/compare/easyeda-alternative`,
`/generate-parts`, `/guides/how-to-design-pcb-schematic-with-ai` — which is a
content-farm pattern rather than an engineering-led one. The site carries a logo
wall (Logitech, Honda, Samsung) and "20k+ engineers" with **no case studies, no
named contacts and no third-party verification**; logo walls of that kind are
routinely unlicensed. No founders or team are named. Only the macOS download was
linked on the page fetched, despite three platforms being claimed. The CLI and
MCP are **asserted by the vendor and unverified by this writer** — no repository,
no npm package, no documentation URL for either was located. No independent user
reports were found.

Verdict: plausible, possibly good, and **not something to rely on without
installing it and reading its output**. If one claim in this survey deserves a
one-hour hands-on check before it is believed, it is ProtoFlow's CLI/MCP.

---

## Coppr / copprlab — pre-launch, IR-based, nothing to drive yet

`https://copprlab.com` — *"Engineering Intent, Compiled."*

RELAYED from the landing page: compiles design intent into schematics, placed
and routed layouts, verified BOM and Gerbers; KiCad-compatible; *"LLMs edit the
IR, not the GUI"*; versioned "v0.1 — 2026".

That one line — LLMs edit the IR, not the GUI — is the same architectural thesis
as copperhead's `draft/ir.ts`, Koppar's internal script, atopile's `.ato` and
this repository's `Network`. Four independent parties converging on it is the
most useful signal Coppr provides.

**Status: pre-launch.** A "Board Sprint: Pre-launch partners" offer, a design
partner signup, a `/download/` link. No public API, CLI or MCP mentioned. No
funding, team or founding information. **Nothing here is drivable today**, and
there is no evidence beyond the landing page. UNVERIFIED throughout.

---

## Smaller and adjacent finds

**`tpecar/nl2sch`** — `https://github.com/tpecar/nl2sch`. Python 3.9+, converts
Protel/Altium netlists to `.kicad_sch`. RELAYED: 19 stars, **9 commits**,
apparently inactive, built for one project (EBAZ4205) migration. It *places and
connects* components but explicitly does **not** lay them out — *"Components
still need to be organized by the user."* Its `--skip-missing` flag **drops** a
component when no matching rule exists, which is exactly the silent-degradation
pattern this survey keeps finding. Its value here is one sentence of
corroboration: it writes the schematic file directly because the eeschema API
was not ready.

**Koppar's free web tools** — `https://tools.koppar.ai` (formerly
`tools.snapcircuits.tech`, a 301). Search results attributed to it a KiCad
netlist → `.kicad_sch` converter with *"real library symbols, motif-aware
placement, a multipage hierarchy for larger designs, and SVG previews"*
(RELAYED, from search snippet). The page itself, when fetched, carried only
*"free KiCad tools online · open a schematic, view a netlist, route a PCB"* —
no feature detail, no API, no maturity signal. The richer claim could **not** be
confirmed from the page. Web-only as far as could be established. Worth one
manual visit precisely because "motif-aware placement from a netlist" is this
repository's problem statement.

**`Seeed-Studio/kicad-mcp-server`** — `https://github.com/Seeed-Studio/kicad-mcp-server`.
RELAYED from its description: MCP server for KiCad that analyses schematics and
PCBs, traces pin-level connections, and *"automate[s] design editing"*, for any
MCP-compatible AI tool. Not investigated further; **UNVERIFIED** and a priority
lead, since a KiCad-side MCP server with editing is directly on this
repository's path.

**Named in a third-party 2026 survey**, `https://jlcpcb.com/blog/ai-tools-for-ai-pcb-design`
(published 2026-09-28, updated 2026-10-19), RELAYED and useful only as a list of
names to chase: with a schematic story — **Flux**, **CELUS** (requirements →
reference schematics + BOM), **Circuit Mind** (architecture diagrams →
schematics + BOM), **EasyEDA Pro** (AI agent connectivity via an **Extension
API** — a surface worth checking), **JITX**, **ProtoFlow**. Layout/routing only —
**Quilter**, **Cadence Allegro X AI**, **Altium Designer**/Altium 365,
**DeepPCB**.

---

## Not closed

Recorded rather than dropped, because the next reader needs to know what was not
checked, not only what was.

1. **Web-search budget exhausted at 200/200 calls** partway through. Leads below
   were reachable by direct fetch only, and several were not reached at all.
2. **Flux.ai, atopile, JITX, Quilter, Diode Computers, CircuitMind, Zener,
   netlistsvg, SKiDL, schemdraw, circuitikz, xschem, Horizon EDA, `kicad-skip`,
   `kiutils`, and the LLM-schematic-generation literature** were delegated to
   parallel researchers whose reports had not returned when this file was
   written. **Their sections are absent from this document, not negative
   findings.** See the handback summary for whatever arrived.
3. **`_schDirectLineRoutingEnabled` reachability** was established by its
   absence from the props schema, not by running a circuit with the prop set.
   The zod-`strip` mechanism remains relayed from the September decision.
4. **Whether `_isChipToChipConnection()` was added to the failure condition
   since September** is undetermined — the shallow clone has no history. A full
   clone and `git log -L` on that hunk would settle it.
5. **`kicadts` format-version currency against KiCad 10** is unverified; its
   README example shows `version: 20240101`.
6. **Koppar's and ProtoFlow's schematic output quality** is unverified in both
   cases. No account was created, no app installed, no generated `.kicad_sch`
   read. Both are vendor claims.
7. **`Seeed-Studio/kicad-mcp-server`** was found late and not investigated.
8. **`tools.koppar.ai`'s netlist→schematic converter** claim could not be
   confirmed from the page.
9. **No tool in this survey was run.** Everything about output quality is
   relayed, inferred from code, or absent. Per this repository's own practice —
   look at the output, not only the tests — the next step for any candidate here
   is to generate one sheet for one of the boards in `boards/` and read it.

---

## What this survey concludes for this repository

Stated as claims that can be tested, not as advice.

1. **No platform in this survey can be driven by an agent to produce a legible
   KiCad schematic with verifiable quality today.** Koppar has the agent surface
   and no legibility evidence; copperhead has the legibility checker and has
   never been observed passing end to end; tscircuit has the maturity and the
   disqualifying silent degradation; ProtoFlow asserts a CLI and MCP nobody has
   confirmed.
2. **KiCad will not be driven to draw a schematic, so writing s-expressions is
   not a workaround — it is the state of the art.** `lib/schgen/` is on the only
   road there is. That is a stronger position than it looked before this survey.
3. **The two things worth importing are a serializer and an architecture.**
   `kicadts` (MIT, typed, read/write, standalone) and `circuit-json-to-kicad`
   (consumes open Circuit JSON, does not import tscircuit core) remove the
   s-expression layer from this repository's scope without adopting anything it
   rejected. Copperhead's three-module split — LLM writes the IR, deterministic
   engine draws, deterministic checker gates — is the implementation of an
   invariant `CLAUDE.md` already states.
4. **The September tscircuit decision is confirmed, widened, and now has a
   second instance.** The failure-path degradation is intact at HEAD, covers
   chip-to-chip as well, has no flag, and emits no error record in a system that
   emits `pcb_autorouting_error` freely for copper. A second degradation fires
   on *successful* routes above a complexity threshold, gated on
   `schTraceAutoLabelEnabled` and off by default.
5. **Everyone building this is converging on an intermediate representation that
   an LLM edits and a deterministic tool draws from.** atopile, JITX, Koppar
   (`edit_circuit` patching "your latest script"), Coppr (*"LLMs edit the IR, not
   the GUI"*), copperhead (`draft/ir.ts`) and this repository (`Network`) are the
   same bet, made six times independently. The differentiator is not the IR. It
   is **who holds the acceptance criteria**, and copperhead is the only one of
   the six found to have written them down as a gate the producer cannot author.
