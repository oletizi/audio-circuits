# AI-native / agent-driven EDA for schematic capture and layout

Survey date 2026-10-28. Scope: platforms and libraries that an **agent** could
drive to produce a **schematic a person can build from at a bench**, with
attention to KiCad interoperability.

## READ THIS FIRST: on several questions this repository already knows more

**This document is a web survey. It ran no tools against this repository's
circuits. On the tools that matter most it is therefore the WEAKER source, and
it was written before its author found the stronger ones.** Recorded here rather
than quietly reconciled, because the near-miss is the useful part: a survey that
treats `schematizer` as "the find" is a survey whose author had not read
`docs/schematic/`.

**Eight research passes and two measured spikes have already run on schematic
generation**, indexed at [`../schematic/README.md`](../schematic/README.md).
Where they and this document disagree, **they win** — they installed the tools
and ran them on this repository's own circuits.

| If you want to know | Read this instead | Not this |
| --- | --- | --- |
| Whether `schematizer` can draw a Pultec | [`../schematic/generation-prior-art-second-pass.md`](../schematic/generation-prior-art-second-pass.md) — **0 successes in 9 attempts** | this document's `schematizer` section |
| Whether Weave can represent this repo's circuits | same, plus [`../schematic/generation-prior-art-circuit-families.md`](../schematic/generation-prior-art-circuit-families.md) — run against **all four** repo circuits | this document's Weave section |
| What ELK does on these circuits | [`../schematic/elk-spike.md`](../schematic/elk-spike.md), [`../schematic/elk-block-spike.md`](../schematic/elk-block-spike.md) — **15 inputs × 3** | nothing here |
| netlistsvg's layout mechanism | [`../schematic/generation-prior-art-third-pass.md`](../schematic/generation-prior-art-third-pass.md) — **read in code** | this document's summary |
| Which library to manipulate a `.kicad_sch` with | [`2026-10-28-agent-kicad-surfaces.md`](2026-10-28-agent-kicad-surfaces.md) — every tool **run against `pt2399-core.kicad_sch` on KiCad 10.0.5** | this document's library table |
| Whether an off-the-shelf engine can replace `lib/schgen/` | [`2026-10-28-schematic-layout-engines.md`](2026-10-28-schematic-layout-engines.md) | nothing here |

**What this document is still the only source for**, and why it was worth
writing: the commercial and agent-surface picture — Flux, Koppar, atopile, JITX,
ProtoFlow, Coppr, copperhead — their MCP servers, pricing, licensing, corporate
health and export surfaces. None of the prior passes covered those. It also
settles the KiCad-API question from the protos and corrects this repository's own
tscircuit decision.

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

## The whole survey on one screen

The brief asked five questions of each candidate. Here they are, answered. The
long sections below carry the evidence; this table carries none and should not be
quoted without it.

**"Agent-drivable"** means an agent can invoke it today without a human in the
loop per run. **"Readable schematic"** means a drawing a person could build from
at a bench — not a netlist, and not a wall of net labels.

| | Agent-drivable today | Produces a readable schematic | KiCad schematic out | Maturity |
| --- | --- | --- | --- | --- |
| **Flux.ai** | **Yes** — real MCP server, `agent` scope, verified at protocol level. But prose delegation only, no construction primitives | Claims to; no public evidence. All first-hand reports (≤ Jun 2026) say placement is unusable | **No.** EDIF netlist only — no geometry. One-way door | Shipping hard, $37M, no free tier, $50/mo entry, in active federal litigation |
| **tscircuit** | **Yes** — headless CLI + eval, published daily | Partly. Silently degrades failed wire routes to net labels; no error record exists for it | **Yes** — `circuit-json-to-kicad`, but with tscircuit-flavoured `lib_id`s | Very mature and very active. Disqualified here on the degradation, not on maturity |
| **`schematizer`** | **Yes** — CLI, neutral JSON input | Places and routes — the only one that does — but **failed 9/9 on a Pultec-shaped section** when this repo ran it | **Yes**, KiCad 6–10 | **Five weeks old.** Non-deterministic by design. Author: *"the block placement doesn't look great"* |
| **Copperhead** | **Yes** — CLI + in-tree MCP server | Yes by design: deterministic engine + a 13-family legibility gate | **Yes** — edits `.kicad_sch` directly | Apache-2.0, 666 stars, active — and *"acceptance tests… have not been observed passing end to end"* |
| **Koppar** | **Yes** — hosted MCP, 64 tools, `submit_circuit` | Claims to; zero legibility evidence; all claims are about copper | **Yes**, claimed — full KiCad projects | Plugin repo has 2 commits. Server-side, closed. Paid plans launch 2027 |
| **ProtoFlow** | Vendor claims CLI + MCP; **neither located** | Claims to | Claims KiCad export, ungated | Plausible; heavy SEO-farm signals, unverified logo wall, no team named |
| **`kicadts`** | n/a — a library | n/a — you draw | **Yes**, read and write, typed; **measured PASS on this repo's own KiCad 10 file** | MIT, 229 commits, published 2026-10-27. **The serializer to use** |
| **`kiutils`** | n/a — a library | n/a | Reads and writes, and **silently drops 192 `hide` flags** while every check passes | **DO NOT USE.** Dormant since 2024, marked Production/Stable |
| **Weave** | Partly — browser tool with a Node batch runner | **Yes**, with a round-trip certificate — but it **could not represent a rotary selector at all**, invisibly | **No** — LTspice `.asc` | 14 stars, one author, **no LICENSE file in the repo**. Read it, don't adopt it |
| **netlistsvg** | Yes | No — block-diagram grade, SVG only, you supply orientation | **No** | **Dormant since 2024-01.** SKiDL dropped it 2026-10-16 |
| **atopile** | Driving `ato build` only — **the MCP server was removed** in 0.15.9 | **No, by stated thesis** — *"Schematics are pictures"*. "Prism" is a viewer with no designators or values | **No.** Writes `.kicad_pcb` directly; the only `.kicad_sch` code is a *reader* | 4k stars, MIT, YC W24 — and the open line is soft-deprecated, the repo 6 months stale, and the build needs an account |
| **JITX** | **Yes, best in survey** — official Claude Code + Codex skills, headless CLI, `--format json`, `--dry` | **Yes, inside JITX** — multi-page, title blocks, author tables, hierarchical diagrams | **Probably not.** `legacy-kicad` exporter exists; **0 of 443 doc pages mention KiCad**; one weak report says PCB only | Proprietary, license server, active. Free tier **requires your designs be open hardware** |
| **Diode Computers** | **Yes** — MIT Rust CLI + 5 first-party Claude Code skills. Built an MCP server and **deleted it** | **Yes, and it reconciles** — placement, net symbols, hierarchy, and minimal-edit repair against a sheet a human rearranged | **Yes, natively** — *"`.kicad_sch` files match KiCad 10's output"*. **KiCad only; the "exports to Altium" claim is false** | MIT, 469 stars, **pushed today**, a release every 2–3 days, a16z + YC S24. Docs lag badly |
| **Quilter.ai** | **No** — no API, CLI, SDK or MCP, and their docs say so | **No, by stated policy** — *"Quilter isn't for you"* for schematic work | Consumes and returns `.kicad_pcb`; you supply outline, footprints and netlist | ~$40M raised, alive. ⚠️ **free-tier inputs may be used for training** |
| **Circuit Mind** | **No** — nothing public; OIDC wall, 0 repos, 0 packages | **Yes** — multi-sheet with refdes and ports, per a **LANL report**; and **50% complete on an FPGA board after ~80 h manual** | **None at all.** Altium / OrCAD / Xpedition only | $33.4M total, $25M announced the day of this survey. Enterprise sales only |
| **CELUS** | **Yes** — an **official MCP server**, OAuth, ~20 tool areas | **Yes** — one hierarchical sheet per CUBO, plus a searchable PDF | **Yes** — `.kicad_pro` + `.kicad_sch` + `.kicad_wks`. ⚠️ **single-use browser-bound download links block headless retrieval** | Shipping, NXP embed — but **no funding round since Jul 2022**. Free tier makes **all projects public** |
| **Zener** | — | — | — | **Not a company.** It is Diode's DSL; `zener.tech` is a for-sale parking page |
| **Coppr** | **No** — pre-launch | Claims to | Claims KiCad-compatible | Landing page and a waitlist |
| **KiCad's own IPC API** | **Not yet** — `kipy` 0.8.0 ships a full `Schematic` class marked **`versionadded (KiCad 11)`** | n/a — it *is* KiCad | native, once KiCad 11 lands; and it drives a **running** KiCad, never headless | Official, versioned, 16 releases. **The ceiling, dated** |

**And the one answer that governs all of them:** nothing in this table writes a
KiCad schematic *through KiCad*. They all write the file. KiCad's own API will
change that, in **KiCad 11**, and even then only against a running instance.

**If you read one row, read Diode Computers. If you read one paragraph, read
[the two retreats](#the-mcp-ecosystem-and-the-two-retreats-that-matter-more-than-the-ecosystem):
two independent teams built EDA MCP servers, measured them against a plain
coding agent with `kicad-cli`, and withdrew.**

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
**60** messages (`grep -c '^message'`).

> **THE INFERENCE THIS WRITER DREW FROM THAT WAS WRONG, AND THE CORRECTION IS
> MORE INTERESTING THAN THE ERROR.** This section originally concluded from the
> 82-line proto that the API *"has no command to draw a wire, place a label,
> create a junction, or add a sheet."* **False.** A parallel researcher reported
> the opposite, and chasing the disagreement produced the real answer.
>
> **Item CRUD is not in the schematic proto because it is in the SHARED one.**
> VERIFIED by downloading the `kicad-python` wheel (import name `kipy`) and
> listing it: `kipy/proto/schematic/schematic_commands_pb2.py` is **907 bytes**,
> while `kipy/proto/common/commands/editor_commands_pb2.py` is **13,653 bytes**
> and `board_commands_pb2.py` is 15,858. The generic editor commands —
> `CreateItems`, `GetItems`, `GetItemsById`, `UpdateItems`, `RemoveItems`, plus
> commit handling — are **shared between the board and the schematic**. Counting
> messages in `schematic_commands.proto` measures only what is schematic-
> *specific*. **Reading one proto file and generalising was the error.**
>
> **And the Python surface is complete.** VERIFIED from
> `kipy/schematic.py` (14,038 bytes) in `kicad-python` **0.8.0, uploaded
> 2026-08-30**: `class Schematic` exposes `create_items`, `get_items`,
> `get_items_by_id`, `update_items`, `begin_commit`, `push_commit`,
> `drop_commit`, `save`, `save_as`, `revert`. And `kipy/schematic_types.py`
> (51,578 bytes) defines the whole vocabulary — `SchematicLine`, `Junction`,
> `NoConnectMarker`, `BusEntry`, `LocalLabel`, `GlobalLabel`,
> `HierarchicalLabel`, `DirectiveLabel`, `SheetPin`, `SheetSymbol`,
> `SchematicSymbolInstance`, `SchematicPin`, `SchematicText`,
> `SchematicGraphicShape`, `Group`, `SchematicNet`. **You could draw a wire with
> this.**

**So why does the conclusion stand? Because of one line, and it is the decisive
evidence in this whole section.** VERIFIED, `kipy/schematic.py:78-81`, the entire
docstring of the class:

```python
class Schematic:
    """
    .. versionadded:: 0.x.y (KiCad 11)
    """
```

**The schematic API is annotated as added in KiCad 11 — and the version number
is still a placeholder.** `kipy/kicad_api_version.py` reads
`KICAD_API_VERSION = "10.0.6-0-gcaf7377e9c"`, so these bindings were generated
against a 10.0.x API that does not yet host what they describe.

Three independent facts, each checkable, now agree:

1. `schematic_commands.proto` carries only reads plus `PlaceSymbolFromLibrary`
   (VERIFIED, GitLab `master`).
2. `kipy`'s `Schematic` class is `versionadded (KiCad 11)` with an unassigned
   version (VERIFIED, wheel contents).
3. KiCad's dev docs state *"KiCad 9 and 10 only support IPC API plugins in the
   PCB Editor"* and *"KiCad 11 adds support for plugins in the Schematic
   Editor"* (RELAYED via page fetch through a summarizer — substance confirmed,
   exact wording approximate).

**The honest statement: the bindings are ready and the host is not.** The
Python API for creating schematic items exists, is official, is versioned, and
**lands with KiCad 11** — which secondary sources put at roughly February 2027
(RELAYED). Locally, KiCad **10.0.5**'s `kicad-cli` offers only
`{fp,jobset,pcb,sch,sym,version}` with no `api-server` verb at all (VERIFIED).

**What changes, and what does not.** The conclusion for today is unchanged:
you cannot write a KiCad schematic through KiCad's API, so every tool that
generates one writes the file. **What changes is the forecast, and it is a real
strategic input:** this is a dated, official, already-written API with a full
item vocabulary, not a vague roadmap item. Anything built now on direct
s-expression writing should expect an official alternative for *interactive
repair* within a KiCad major version — and should note that even then it will be
a **remote-control API against a running KiCad**, over NNG/protobuf sockets, not
a headless file generator. For CI and for an unattended agent, file generation
plus `kicad-cli` remains the right path regardless of KiCad 11.

**A trap worth naming, VERIFIED by a delegated researcher via the GitHub API:**
`github.com/KiCad/kicad-python` is **archived**, `archived: true`, last commit
2022-01-09 with the message *"Add deprecation notice"*. The current
`kicad-python` on PyPI is the IPC bindings, developed on GitLab at
`kicad/code/kicad-python` — a different thing with the same name. Do not land on
the GitHub repo and conclude the bindings are dead. VERIFIED from PyPI: 16
releases, `0.1.0a0` 2024-04-03 through **`0.8.0` 2026-08-30**, actively
developed.

And the CLI is export-only. VERIFIED on the locally installed KiCad **10.0.5**:

```
$ kicad-cli sch export --help
Usage: sch export [--help] {bom,dxf,hpgl,netlist,pdf,ps,python-bom,svg}
```

There is no `sch import`, no `sch generate`, no netlist-to-schematic verb.

**Four independent codebases converge on the same workaround**, which is the
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
- `Seeed-Studio/kicad-mcp-server` — an MCP server written *for* KiCad, by a
  hardware vendor, with every reason to use the official API if it could — says
  it outright. Quoted from its README (RELAYED, page fetch): *"Schematic editing
  is **experimental**. KiCad has no Python API for schematic editing, so tools
  use manual S-expression manipulation."* See its entry below.

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

### The September decision's stated MECHANISM is wrong, and the escape hatch is reachable

This is the one place where the earlier decision is refuted, and it is recorded
here rather than quietly corrected because the refutation is useful.

The September decision said of `_schDirectLineRoutingEnabled`: *"it is absent
from `@tscircuit/props` and props parse in zod `"strip"` mode, so it never
reaches core."* **The first clause is right, the second is right, and the
conclusion does not follow.**

Three checks, each of which could have failed:

1. **Absent from the schema.** VERIFIED: `grep -rn "schDirectLineRouting"
   props/lib` returns nothing at props HEAD.
2. **Zod does strip it.** VERIFIED empirically, not inferred — installed
   `@tscircuit/props@0.0.715` and ran `groupProps.parse()` on an input carrying
   both flags:

   ```
   keys surviving parse: name, schTraceAutoLabelEnabled, subcircuit
   _schDirectLineRoutingEnabled present after parse: false
   schTraceAutoLabelEnabled present after parse: true = true
   ```

3. **But core does not read the parsed props.** VERIFIED from
   `core/lib/components/base-components/PrimitiveComponent/PrimitiveComponent.ts:214-219`:

   ```ts
   constructor(props: z.input<ZodProps>) {
     super(props)
     this.children = []
     this.childrenPendingRemoval = []
     this.props = props ?? {}              // <- the RAW, unparsed object
     const zodProps = getConstructionPropsSchema(this.config.zodProps)
     const parsePropsResult = zodProps.safeParse(props ?? {})
     if (parsePropsResult.success) {
       this._parsedProps = parsePropsResult.data   // <- stripping happens HERE only
   ```

   And the call site reads **`.props`**, not `._parsedProps`
   (`Trace_doInitialSchematicTraceRender.ts:349`):

   ```ts
   if (trace.getSubcircuit().props._schDirectLineRoutingEnabled) {
     Autorouter = DirectLineRouter as any
     skipOtherTraceInteraction = true
   }
   ```

**So the flag reaches core.** Zod's strip removes it from `_parsedProps` and
leaves `.props` untouched, and `.props` is what this branch consults. The
September decision inferred unreachability from a stripping behaviour that is
real but applies to the wrong object.

**What that buys, and why it does not rescue tscircuit.** Selecting
`DirectLineRouter` happens *before* the routing attempt, and the label branch
fires only on `results.length === 0`. A direct-line router does not return zero
results, so **the failure-path label substitution would not fire at all.** With
`schTraceAutoLabelEnabled` left at its default (off), the complexity-threshold
substitution does not fire either. You would get wires, always.

They would be straight lines, drawn without obstacle avoidance, through symbol
bodies where the geometry demands it. That is not "loud" in the sense of an error
record — but measured against the September decision's own standard it is a
different and better failure: *"A tool that fails loudly is workable. One that
disguises failure as a design decision cannot be verified by looking."* **A line
through a transistor's body is visible on inspection. A plausible net label is
not.** The disguise is what was disqualifying, and this removes the disguise.

**Four caveats, because this is a code-path reading and not a demonstration:**

- **This writer did not run a tscircuit circuit end to end.** The claim verified
  is that the flag reaches the branch; that `DirectLineRouter` then produces
  acceptable geometry on a real analog sheet is **UNVERIFIED** and is the
  obvious next experiment.
- `setProps` reassigns `this.props = newProps` from the **parsed** result
  (`PrimitiveComponent.ts:235`), so the raw key is lost if `setProps` is ever
  called on that subcircuit. The flag survives construction, not mutation.
- It is off-schema, so TypeScript rejects it and passing it needs a cast —
  which `CLAUDE.md` forbids outright ("Never bypass typing: no `any`, no
  `as Type`"). Depending on an undeclared, underscore-prefixed prop that the
  vendor's own types disown is depending on an implementation detail.
- The call site itself already carries `DirectLineRouter as any`, which is a fair
  indication of how supported this path is.

**The decision's conclusion survives; its reasoning does not.** The
disqualifying property is intact, it covers one more connection class than
recorded, there is a second instance of the same pattern the decision did not
know about, and the escape hatch it believed unreachable is reachable by a route
this repository's own typing rules forbid. The honest summary is **not** "there
is no way to make it loud" but: *there is a way to stop it lying, it is
unsupported and untyped, nobody has run it, and it substitutes visibly-bad
geometry for invisibly-wrong labels.*

`docs/decisions/2026-09-21-why-not-tscircuit.md` should be amended with this
correction. It is left to a deliberate edit rather than done here, because
amending a decision record is not a research task.

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

## Flux.ai — a real MCP server, no KiCad export, and a lawsuit

`https://www.flux.ai` · docs `https://docs.flux.ai` · MCP `https://app.flux.ai/mcp`
Legal entity **Defy Gravity, Inc.**

Delegated research. The headline is that **the brief's premise was wrong in one
direction and right in another**: Flux does have a genuine, protocol-correct
agent surface, and it has no path to a KiCad schematic at all.

### It is no longer a PCB tool with a copilot

VERIFIED from the homepage and a 179-URL docs sitemap: Flux now markets an
end-to-end "AI hardware engineer" spanning requirements, industrial design,
parts, electronics, **mechanical CAD**, **firmware**, **wire harnesses**,
simulation, manufacturing and "launch." "Copilot" as a product name is
effectively gone — `/reference/copilot` now serves the "Flux agent" page.

Skeptical note worth carrying: that is an enormous surface for a company that
raised $37M in February 2026, and the October 2026 changelog shows roughly **20
posts in one month**, a new product category every two days. That rate is not
consistent with depth in any one of them, and this survey has no way to assess
depth beyond the docs.

**What the agent claims to do to a schematic** is edit it, not suggest. VERIFIED
quotes from `docs.flux.ai/reference/flux-agent`: *"Edits the schematic, PCB
layout, and 3D CAD in the Flux editors"*; and from `/reference/copilot`: *"can
create and update schematics, arrange and route a PCB, write firmware…"*

Two modes, and the split matters: **Chat** is free, reads the whole project, and
**cannot edit designs**. **Agent** reads and changes the device, metered in ACUs.

One documented human gate is conspicuous by its asymmetry (VERIFIED): *"Flux
asks before it changes your copper or rules."* **No equivalent gate is
documented for schematic edits.** The same asymmetry as tscircuit's error
records — copper is treated as consequential, drawings are not.

### The MCP server is real, and it was verified at the protocol level

This is the part of the brief's premise that was wrong, and it was established by
direct HTTP probe rather than from marketing. VERIFIED:

```
POST https://app.flux.ai/mcp            → 401 + www-authenticate: Bearer realm=…
GET  /.well-known/oauth-protected-resource   → 200
GET  /.well-known/oauth-authorization-server → 200, with
     authorization_endpoint, token_endpoint, registration_endpoint,
     code_challenge_methods_supported: ["S256"]
```

A correctly implemented remote MCP server with **OAuth 2.1, PKCE S256 and
Dynamic Client Registration**. Not a landing page. Setup is
`claude mcp add -t http flux https://app.flux.ai/mcp`, and documented clients
include Claude Code, Claude.ai, Cursor, VS Code, Codex, ChatGPT and Notion AI.

**Long-lived API keys with a dedicated `agent` scope exist.** VERIFIED quote from
`docs.flux.ai/account/flux-mcp-server`: *"Grant project read access to read
project data, write access to make design changes, and **agent access to ask
Flux to complete design work**."*

**So: a human clicks once** — to OAuth in or mint a key — and after that the
surface is headless with no documented per-design click. Flux's own announcement
describes exactly the autonomous case: *"'Create a Flux project for this, and
have Flux design the first board.' His agent creates the project and hands Flux
the design job. Flux plans the board, picks the parts, and draws the schematic."*
The endpoint and scopes are VERIFIED; **that capability working is Flux's claim,
untested.**

### But the shape of that surface disqualifies it here, and this is the real finding

**No MCP tool names or schemas are published anywhere** — docs, announcement and
compare pages all describe capabilities in prose and narrative scenarios, never
as a tool reference. `tools/list` needs an authenticated account, which the
researcher did not have. So the exact tool surface is **UNVERIFIED**.

What *is* clear from the docs' own phrasing is the architecture: **delegation,
not manipulation.** Every capability sentence reads "**ask** Flux to…" or
"**hand** design jobs to Flux." Your agent does not place a symbol or draw a
net; it reads project data and posts a natural-language request into a Flux
thread, then waits for Flux's cloud agent. There is no documented primitive like
"create component" or "connect pin A to pin B."

Three consequences, stated plainly:

1. You cannot drive deterministic construction from a model you own. You can
   only ask an opaque remote agent in prose and read back what it did.
2. Cost and latency are Flux's, metered per structural change.
3. **Your acceptance criteria cannot reach into the loop.** Flux's agent
   produces the artifact *and* decides when it is done. That is the exact
   inversion of this repository's invariant, and it is not a configuration
   choice — it is the product's architecture.

A fourth item is worth recording because it is this repository's forbidden
pattern sold as a feature. VERIFIED from `/reference/knowledge-base` and an
Oct 20 2026 post, "Teach Flux Your Team's Standards": Flux **infers design
standards from your past work and applies them to future projects**, with a
human "accept the items that are correct" step. An agent deriving the acceptance
criteria from artifacts it previously produced, with the agent proposing the
rules and the accept step the only thing standing between that and a closed
loop.

**Everything else is absent.** VERIFIED: no REST API (the sitemap lists
`/reference/api-overview`, which **302s to the docs home** — a dead entry for a
removed page); no CLI; no SDK; no webhooks (the nearest thing is *outbound* —
Flux's agent calling *your* APIs with stored secrets). `github.com/flux-ai`
exists, created 2020-12-14, with **0 public repositories**. A GitHub code search
for `"app.flux.ai/mcp"` returns **one hit across all of GitHub**, an unrelated
markdown note — the official server exists and the ecosystem around it is empty.

**A search-pollution warning worth keeping:** almost every query for "flux
API/SDK/MCP" returns Black Forest Labs' FLUX image model,
`black-forest-labs/flux-mcp`, RunOnFlux, or `flux.umin.ai`. If anyone reports a
Flux MCP server on GitHub, check which Flux.

### Export: there is no KiCad path, and schematic export is a netlist with a schematic's name on it

VERIFIED from `docs.flux.ai/reference/data-portability`. Electronics exports:
Gerbers+drill, BOM, pick & place, **Schematic Netlist as `.edif`**, layout
netlist `.d356`, IPC-2581C, ODB++, GenCAD, JEP30 `.xml`. Project as `.flx`.
Mechanical: STEP/BREP/USD/STL/OBJ/3MF/GLB/FBX and DXF/SVG/PDF for 2D.

- **No `.kicad_sch`, no `.kicad_pcb`, no KiCad format anywhere in the export
  list.**
- **The asymmetry is total.** Flux documents **import** from Altium, OrCAD,
  PADS, CADSTAR, **KiCad**, Eagle, Fusion, EasyEDA, DipTrace, Proteus, Upverter
  and more — about 18 "X-to-Flux" migration guides. There are **zero**
  "Flux-to-X" guides. The page named `flux-to-altium-migration-doc` is, on
  inspection, Altium → Flux content.
- **The EDIF export carries components, connections, properties and hierarchy —
  and no sheet geometry, symbol placement or wire routes.** For a project whose
  whole premise is that a schematic is an artifact a person reads, that is not a
  schematic export. It is a netlist export.
- **Not round-trippable**, structurally: you cannot reconstruct the drawing from
  EDIF, and `.flx` re-import is not documented.

**The one community bridge, and what it proves.** `myneral-labs/flux-to-kicad`
(`https://github.com/myneral-labs/flux-to-kicad`) — Python, 1,016 lines, one
file, **one commit, 0 stars, 0 forks, no license, a committed `.DS_Store`**. One
person's one-off. VERIFIED by reading the repo, and it establishes three useful
facts:

1. **`.flx` is plain JSON**, with `pcbLayoutNodes`, `elements`, `nets[].pins`
   and `diagram_position` coordinates.
2. **Flux embeds footprints as base64 `.kicad_mod` assets inside the `.flx`**, so
   PCB-side extraction to KiCad is tractable and footprints come across
   losslessly. Flux's PCB geometry is KiCad-format internally.
3. **Schematic-side extraction is not tractable.** Its README says so: *"The
   schematic layout is auto-generated and not a 1:1 reproduction of the Flux
   schematic view."* Its approach is a fixed **5-column grid** plus *"a net label
   at every pin connection point for all 42 nets"* — a netlist rendered as a wall
   of labels. It also has to filter out *"virtual elements (Flux net portals)"*,
   because Flux's connectivity model uses portal pseudo-elements rather than
   drawn wires in places.

So even with full access to the proprietary project file, the person who did the
work could not reproduce the drawing. **Flux is a one-way door for schematics.**

### Pricing: there is no free tier, and the entry point is $50/mo

The pricing page injects prices client-side; the researcher rendered it in a
real browser and read the DOM. All VERIFIED.

| Plan | Monthly | Annual/mo | Included | Overage |
| --- | --- | --- | --- | --- |
| Explore | **$50** | $40 | 40 ACUs/mo | — |
| Build | **$100** | $80 | 120 ACUs/mo | $2/ACU |
| Pro | **$250** | $200 | 400 ACUs/mo | $2/ACU, plus a $250 card hold |
| Teams | **$500/mo** or $4,900/yr | — | 600 pooled ACUs, 5 seats; +$100/mo per seat (+60 ACUs) | $2/ACU |
| Enterprise | contact | — | *"Advanced export formats (JEP30, more coming soon)"*, SOC2, SLA | — |

- **No free tier.** Every individual plan is a **7-day trial** then paid. Teams
  purchases *"do not include a trial."* The only free thing is Chat mode, which
  cannot edit designs. If you hold an impression of Flux as free for public
  projects, it is obsolete — and this is roughly a **10× rise** at the entry
  point versus the ~$5/mo tier that mid-2026 complaints describe (RELAYED).
- **How much design work one ACU buys is undocumented.** Nothing on the pricing
  page, the FAQ, `/reference/copilot-credits` or
  `/account/how-acus-and-on-demand-charges-work` translates ACUs into
  schematics, nets or parts. **This is the most important unanswerable cost
  question**, and it is exactly what the user complaints are about.
- **Two Flux pages contradict each other** on whether Chat consumes ACUs, and
  **two more contradict each other on export gating** — `data-portability` lists
  JEP30 unrestricted while Enterprise advertises "advanced export formats" as a
  differentiator. **Whether EDIF schematic-netlist export is available on a $50
  plan could not be confirmed**, and it is the one export that would matter.
- **Pricing is volatile, and here is the primary-source proof.** Flux's own
  pricing JS bundle contains a hard-coded enum of **16 grandfathered cohorts**:
  `from_202410, from_202504, from_202601, from_202602, from_202604, from_202606C,
  from_202606E, from_202606HA, from_202607, from_202607B, from_202609,
  from_202609L, from_202609R, from_202609RL, from_202609RS, from_202610`. That
  is **11 repricings in 2026, five of them in September alone.** Any price here
  is a snapshot with a short half-life.

### The company is alive, well funded, and in active federal litigation

**Shipping hard.** VERIFIED: ~20 blog/changelog posts in October 2026, the most
recent dated 2026-10-28. No sign of shutdown, wind-down, stagnation or
acquisition. There *is* a visible pivot in positioning from "AI copilot for PCB
design" to "AI hardware engineer for the whole device" — expansion, not retreat.

**Funding: $37M total, disclosed 2026-02-27** (Series B led by 8VC plus a
previously unannounced $10M with Outsiders Fund and Bain Capital Ventures). CEO
and founder **Matthias Wagner**. RELAYED with a caveat that matters: **the
Series B amount is reported as $25M, $27M and $30M by different outlets with
different named leads.** Only the $37M total is safe to quote.

**Traction figures are company-supplied and unverifiable:** "1 million signups,"
"nearly 6.5 million devices created," "75% of customers had never designed a
PCB before." Signups and devices-created are the two softest metrics available
— neither is paying customers or finished boards.

**Active litigation: *Adafruit Industries, LLC, Limor Fried, Phillip Torrone v.
Defy Gravity, Inc.*, N.D. Cal. 3:26-cv-05480.** VERIFIED by reading the
CourtListener docket, found because **`adafruit.com/flux` now 302-redirects to
it**. Declaratory judgment under 28 U.S.C. §2201, filed **2026-06-05**, before
Magistrate Judge Laurel D. Beeler.

Sequence from the docket: around 2026-05-22 Flux's counsel (Fenwick & West) sent
Adafruit a demand letter invoking the **Computer Fraud and Abuse Act** and
demanding Adafruit not publish an article, *"including statements about Flux's
intellectual property, commercial traction, and user base"* (RELAYED — the
letter was not published verbatim). On 2026-06-02 Adafruit went public and
paused its blog; the story hit Hacker News at **684 points / 283 comments**
(VERIFIED via the HN API), with both Limor Fried and Phil Torrone commenting.
Adafruit says it accessed *"only information that Flux's own systems made
publicly available through a server misconfiguration"* and that its reporting
was responsible disclosure (RELAYED). Adafruit filed with 16 exhibits; Defy
Gravity moved to dismiss 2026-08-31; the responsive pleading is due 2026-12-02
with a case-management conference 2026-11-19. **Status: active and unresolved.**

Why this belongs in a technical survey rather than a gossip column, in three
specific ways:

1. The demand letter sought to suppress statements about Flux's *"intellectual
   property, commercial traction, and user base"* — **precisely the three claims
   this section would otherwise relay from Flux.** Treat them accordingly.
2. An HN commenter flagged that Flux advertises *"the world's largest
   community-driven public library of Adafruit products, including footprints,
   symbols, datasheets, and simulation models"* and could not find licensing
   information (RELAYED, unverified). Given the parties, **library provenance
   looks like a live question** — relevant if you ever reused a Flux library
   part.
3. **A server misconfiguration exposing user data** is directly relevant if you
   would be uploading private circuit designs.

### Quality: uniformly bad first-hand reports, all five months stale

VERIFIED via the HN Firebase API, so usernames, timestamps and text are exact.
All from the 2026-06-02 thread.

The most relevant comment in the entire survey, from `karmicthreat`:

> *"I've used Flux.ai before; it was a pretty bad experience. **After about
> 50-100$ in tokens a couple of times, I couldn't get more than a couple of
> simple components on the schematic. And not in sensible positions.** The
> product just grinds tokens for little return… **I had far better luck wiring
> together KiCad MCP, SKIDL.** … **Placement is probably the big issue that
> needs to be solved now.**"*

Note exactly what that says: components land, but **not in sensible positions**.
It is a *placement* failure, not a correctness failure — the thing `lib/schgen/`
exists to solve — reported by someone who then went and built this repository's
approach instead.

Others, same thread: *"an absolutely awful product"* (an EE who tried it
repeatedly); *"i gave them a $100~ bucks and i got like nothing in return"*;
*"a total waste of time"*; *"not even able to do a basic TSOP LED driver without
you needing to spend hundreds of dollars to correct its mistakes."* One
comparatively positive data point: `joshfee` found Flux *"expensive and
unimpressive"* but got *"a seemingly functional PCB"* from a competing agentic
workflow — establishing the task class is not impossible.

**Weigh this carefully, in both directions.**

Reasons to discount it: selection bias is severe — every first-hand report came
from a thread about Flux sending a legal threat to a beloved open-hardware
company, which selects hard for people who want to say something bad. And **all
of it predates 2026-06-02**, since when Flux has shipped the MCP server, Chat
mode, "Flux Adaptive," slash commands, parallel agent threads and roughly twenty
more things in October alone.

Reasons to take it seriously anyway: the reports are specific, first-hand and
**consistent on mechanism** — people spent real money and got almost no
schematic, with placement quality named. The complaint is **structural rather
than a bug**: ACU metering means failures cost money, and nothing tells you how
much work an ACU buys, which no shipped feature changes. And **Flux has published
no counter-evidence** — this survey found no public example of a complete,
legible, agent-generated Flux schematic reviewed by an engineer in public; the
one doc page about legibility describes a self-run check whose criteria Flux
authors.

**The honest summary: the product was unusable for schematics as of June 2026,
and there is no data since.** A deliberate search for any first-hand Q3/Q4 2026
report on schematic output quality found none before the search budget ran out.
That is the biggest gap in the Flux picture.

### One more thing, because it is pointed at this repository

Flux published **"KiCad + Codex Isn't a Team Workflow"** on **2026-10-26**
(`https://www.flux.ai/p/blog/kicad-plus-codex-not-a-team-workflow`), by its CEO.
Its core line: *"KiCad + Codex is the equivalent of bolting an AI agent onto VS
Code."* VERIFIED. Read it as a statement of what Flux thinks its moat is, not as
a technical critique: **its arguments are collaboration, supply-chain context
and tool fragmentation. It does not claim the file-based approach produces worse
boards, and it names no specific technical failure.**

### Verdict for this repository

Flux is **agent-drivable and useless here**, and both halves matter. The MCP
server is real and well built; the surface it exposes is prose delegation to an
opaque remote agent that owns both the arrangement and the judgement of whether
the arrangement is good. There is no KiCad schematic export and, per the one
person who tried hardest, no way to reconstruct one from the project file. The
Pultec's authority model — schematic authoritative, model derived — has nothing
to attach to.

The one genuinely useful technical datum is narrower and more interesting than
the platform: **`.flx` is JSON and embeds footprints as base64 `.kicad_mod`,
so Flux's PCB geometry is KiCad-format internally.** The schematic side is not,
because its connectivity partly lives in net-portal pseudo-elements rather than
drawn wires.

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

## atopile — anti-schematic by thesis, and the open-source line is being wound down

`https://atopile.io` · `https://github.com/atopile/atopile` · PyPI `atopile`

Delegated research, which downloaded and grepped the shipped 0.15.9 source
distribution rather than trusting the docs, **because for atopile the docs, the
UI, the GitHub repo and the shipped package all disagree.**

### The finding that reframes the rest: the open-source repo is not the product

VERIFIED:

- `github.com/atopile/atopile` default branch HEAD is `619eda7`, dated
  **2026-03-11**. A query for commits on `main` since 2026-06-01 returns **zero**.
- GitHub releases stop at `v0.14.1004` (2026-02-12). **There is no `v0.15.*` tag
  in the repo at all.**
- PyPI's latest is **0.15.9, uploaded 2026-09-12**. The shipped release is about
  six months ahead of the public git history.

And they say so themselves, from their blog of 2026-08-06 (VERIFIED by rendering
the page — it is a client-rendered SPA and `curl` returns an empty shell):

> *"We recently merged our open-source and closed-source code into a single
> repository to improve development velocity. **As a result, the public
> repository has become stale, despite us working full-time on the project.**"*

The same post announces the pivot — *"atopile 0.16 now runs the full IDE in your
browser: app.atopile.io"* — and the wind-down: *"We are **soft-deprecating the
0.15 line**… it is not a second product line that we will maintain indefinitely.
We will announce a removal date in the future."* What stays open is *"the
compiler and graph core"*; what is closed includes *"the browser-based IDE and
our improved agent harnesses."*

**So the thing you would evaluate — a local CLI writing files into your git
repo — is the line being deprecated. The investment is in a hosted, login-gated
browser IDE.**

### Does it generate a readable schematic? No, and that is the product thesis

**VERIFIED by enumerating every `@muster.register(...)` build target in
`src/atopile/build_steps.py` of the 0.15.9 sdist.** The complete list is
`resolve-dependencies`, `init-build-context`, `modify-typegraph`,
`instantiate-app`, `prepare-build`, three `post-instantiation-*` checks,
`load-pcb`, `picker`, `prepare-nets`, `post-solve-checks`, `update-pcb`,
`post-pcb-checks`, `build-design`, `bom`, `step`, `glb`, `3d-image`, `2d-image`,
`mfg-data`, `manifest`, `variable-report`, `pinout`, `power-tree`, `stackup`,
`datasheets`, `data-interface-layout`, `default`, `all`,
`collect-manufacturing`.

**There is no schematic target.** The only drawing-shaped artifact in the entire
build is `power-tree`, which emits a **Mermaid** file. `pinout`, `stackup`,
`variable-report` and `data-interface-layout` are all JSON.

**And there is a trap here worth recording, because it would fool an evaluator.**
The only `.kicad_sch` references in shipped non-test code form a *detector*, not
a writer (`src/atopile/model/manufacturing.py:196`):

```python
kicad_sch_path = build_dir / f"{target}.kicad_sch"
if kicad_sch_path.exists():
    outputs.kicad_sch = str(kicad_sch_path)
```

It surfaces a `.kicad_sch` for download *if one happens to be sitting in the
build directory*. Nothing in the build puts one there. Meanwhile the UI's
file-type table lists `{type: 'kicad_sch', label: 'KiCad Schematic', …,
available: true}` — **a download affordance for a file the build never
produces.** Looking only at the UI would have concluded the feature exists.

**The request was filed and closed as stale.** Issue #1472, *"Artifact: Generate
kicad schematic"*, opened 2025-08-28 by an atopile org member, asking for exactly
the minimum viable thing:

> *"Generate basic functional kicad schematic that doesn't use wires (just
> netlabels). Motivation: review; checking low level connections (electrical);
> **communicating with people outside the team (who don't use ato)**."*

Closed 2026-08-06 with *"Closed stale issue opened by atopile org member."*
Note a trap: GitHub's `state_reason` field reads `completed`, which is
misleading — the human comment says stale. An earlier PR, #537 *"KiCAD Schematic
Generation"* (2024-11-18), described as *"the base of something that needs
on-going work to produce schematics EEs will be happy with"*, is also closed, and
nothing of it survives in 0.15.9.

**The 2024-era viewer was removed outright.** The March 2026 snapshot had
`ato view` and `src/atopile/visualizer/web/` with `GraphScene.tsx`,
`NodeMesh.tsx`, `EdgeLines.tsx` — a force-directed graph of nodes and edges, no
symbol library, no wire router, no sheet. In shipped 0.15.9 **both the verb and
the directory are gone.**

**The new claim is "Prism", and the screenshot was examined rather than
believed.** VERIFIED by rendering atopile.io today: *"**Prism draws the
schematic**, power tree, system view and pinout straight from the code."* The
delegated researcher downloaded the marketing screenshot
(`atopile.io/prism-schematic-g1v4q5zn.png`, 1812×888) and looked at it, per this
repository's own rule. The honest assessment:

- It **is** a genuine symbol-and-wire drawing — op-amp triangles with `+`/`−` on
  the correct pins, zigzag resistors, a capacitor, GND bars, junction dots, a
  hierarchical signal label, a dot-grid canvas.
- **But there are no reference designators and no values anywhere.** Op-amp
  units are labelled by instance path (`front.a`, `front.b`, `back.a`); every
  resistor and the capacitor is **completely unlabelled** — no `R1`, no `10k`.
- No title block, no sheet border, no page boundary; the drawing runs off the
  edges of the frame.

**It is a navigable inspection view of the netlist, not a document you could
hand someone to stuff a board from**, because it carries neither designators nor
values. Against the five output classes it does not satisfy "schematic" as a
deliverable. Whether Prism can export anything at all is **UNVERIFIED** —
nothing in the open tree implements it and `app.atopile.io` is login-gated.

**They invest in the opposite direction.** VERIFIED: 0.15.9 contains a
substantial new subsystem absent from the stale GitHub tree —
`src/faebryk/libs/eda/` with `kicad/convert/schematic/`,
`altium/convert/schematic/`, `hl/models/schematic.py`, exposing
`read_kicad_schematic_to_hl(path)` and `convert_schematic_to_netlist`. It
**reads** `.kicad_sch` and Altium `.SchDoc` into atopile. There is no write path.
It serves an Altium-import funnel. Their investment is in consuming other
people's schematics, not producing any.

**And the thesis, stated plainly on their homepage** (VERIFIED):

> *"**Schematics are pictures. AI can't reliably read, check or change them.**"*

with a benchmark table claiming *"Schematic PDF 117k tokens / 5.5 min / 55%
correct"* against *"Code 14k / 15 s / 100%"*, measured on a 70-component
battery-management board, five "which pins share a net?" questions, four frontier
models, two runs each, September 2026.

**This is the answer to the brief's question.** Schematic generation is not a
roadmap gap; it is the thing atopile's pitch is positioned against. Do not expect
them to build it.

### KiCad integration, precisely — and the brief's prior was out of date

VERIFIED from source, and it corrects the brief's stated assumption:

- **atopile writes the `.kicad_pcb` directly.** `update-pcb` loads the existing
  PCB through their Zig s-expression parser, mutates the object graph, and dumps
  it back.
- **It does NOT emit a `.net` netlist for pcbnew to import.** `config.py`
  reserves a path and `set_kicad_netlist_path_in_project()` only writes
  `project.pcbnew.last_paths.netlist` into the `.kicad_pro` as a GUI
  convenience. Nothing in the build writes a netlist. **It did once** — issue
  #824 *"Fix `apply_netlist`"*, Jan 2025 — and that approach was replaced by
  direct PCB transformation. So "generates a netlist consumed by pcbnew" was
  true and is no longer how it works.
- **There is a KiCad plugin**, `src/atopile/kicad_plugin/`, and its job is
  **layout reuse, not schematic**: the build emits a `.layouts.json` mapping
  module addresses to reusable `.kicad_pcb` layouts, and a "Pull Group" plugin
  syncs PCB groups to the module hierarchy so a sub-module is laid out once and
  replicated. Genuinely clever, and orthogonal to schematics.
- **Can you open the result in eeschema? No — there is nothing to open.**

### The agent story regressed, which is the opposite of what you would expect

- **There WAS an MCP server.** VERIFIED in the March 2026 tree:
  `src/atopile/mcp/mcp_server.py`, CLI verb `ato mcp start --no-http`, exposing
  `build_project`, `search_and_install_jlcpcb_part`, `install_package`,
  `verify_package`, `inspect_library_module_or_interface`,
  `get_library_modules_or_interfaces`, `inspect_package`, `find_packages`,
  `find_project_from_filepath`. The VS Code extension auto-installed it and also
  wrote a Cursor/Claude-style rules file.
- **It is GONE in shipped 0.15.9.** VERIFIED: grepping the full sdist for `mcp`,
  `modelcontextprotocol` and `mcp_server` across `.py/.ts/.tsx/.toml` returns
  **zero hits**, and `find -iname "*mcp*"` finds nothing. The 0.15.9 verb list is
  `build`, `inspect`, `sync/add/remove`, `dependencies`, `create`, and hidden
  `package`/`lsp`/`kicad-ipc`/`dev`, plus `serve`, `auth`, `validate`. No `mcp`,
  no `view`.
- **It was replaced by an in-house agent behind their own gateway.** VERIFIED:
  `src/atopile/agent/gateway.py`'s docstring reads *"Gateway client — single
  auth point for all requests to **gateway.atopile.io**"*, and it points
  `AsyncAnthropic` and `AsyncOpenAI` at base URLs resolving under that gateway,
  with `DEEPPCB_BASE_URL` for autorouting. **Their agent calls Claude and GPT
  through atopile's proxy, billed against atopile's token allowance, not your
  key.** Free users get *"a considerable number of agent tokens: comparable to a
  $20 monthly subscription."*

An external agent driving atopile today drives `ato build` as a subprocess and
nothing more.

Worth noting for its own sake: the repo is developed with Claude Code — a
top-level `CLAUDE.md`, an `AGENTS.md`, and **22 skills under `.claude/skills/`**
(`agent`, `ato-language`, `compiler`, `fabll`, `faebryk`, `graph`, `lsp`,
`pyzig`, `sexp`, `solver`, `planning`, `code-review`, …).

### The build is not hermetic, and that dependency has already failed hard

This is the strongest cautionary datapoint in the entire survey, and it is
pointed straight at a practice this repository already holds.

- **`ato build` requires an account.** VERIFIED from
  `src/faebryk/libs/picker/api/api.py:59` — `get_auth_token()`, and a refusal
  telling you to `ato auth login`. **You cannot build a board offline or
  anonymously.**
- **That dependency broke for 19 days.** VERIFIED, issue #1829 (2026-07-19):
  `components.atopileapi.com` and `packages.atopileapi.com` went **NXDOMAIN**,
  and *"the picking stage retries for ~3 minutes, then the build dies — even
  with `--keep-picked-parts`, and even for boards whose parts were all previously
  picked."* The reporter noted *"no released version escapes it"*. Four duplicate
  issues were filed. A maintainer closed it as a false alarm, then reopened it
  (*"I agree, it's a real issue. Sorry for closing it!"*). A user in-thread,
  2026-08-03: *"I've been looking into it a little bit and it seems **the
  project might be dead**… I've got a pile of designs I really don't want to have
  to draw up old-fashioned schematics for."* atopile's own admission: *"The
  components service used by older releases was retired before a clear migration
  path was in place… **that was our mistake**."*
- **VERIFIED by direct test today, 2026-10-28:** `components.atopileapi.com` and
  `packages.atopileapi.com` **still do not resolve**. `legacy.atopileapi.com`,
  the new default in 0.15.9, resolves and returns **HTTP 401**. **Every atopile
  release at or below 0.15.7 is permanently unbuildable**, three months on.

**Against that, this repository's insistence that KiCad is a local, required,
compiler-like dependency reads as the correct call rather than a limitation.**
`CLAUDE.md` says to treat KiCad "the way you would a compiler: required, and not
something to engineer around." atopile engineered around a local parts library
and the vendor's DNS took the build with it.

### Maturity, and the community's own objection

VERIFIED: 4,026 stars, 256 forks, 37 contributors, 29 open issues, created
2023-12-19, MIT, Python+Zig, YC W24, Python pin `>=3.14,<3.15` (aggressive).
PyPI cadence was brisk through April 2026 (0.15.0–0.15.7 all in one month) then
**two releases in six months**. No public pricing page (`/pricing` 404s).

Issue-tracker health is a mixed signal. VERIFIED: of the 15 most recently created
issues the 11 newest are all open, several substantive and unanswered — *"`ato
build` silently converts blind/micro vias to through vias"* (#1840, zero
comments); a Windows wheel crashing on import with an illegal instruction
(#1838, zero comments); duplicate UUIDs across part instances breaking the board
(#1834, zero comments).

And #1843, filed **two days before this survey**, which is worth quoting because
it is a user arriving at the same conclusion from the outside:

> *"a few months later, when I actually began working on it I've realized that
> **CLI is deprecated. Everything is hidden behind an account, repositories are
> dropped, domains changed. Nothing is open-source about a CLI that talks to a
> closed-source server.**"*

Unanswered by maintainers as of today.

**Third-party adoption could not be measured credibly, and the researcher said
so.** A GitHub code search reports 2,320 files named `ato.yaml`, but the listed
repositories were dominated by false positives (`DataDog/integrations-core`,
`librenms/librenms`, `prebid/prebid-server`). **Do not quote 2,320.** The only
unambiguously real atopile projects in the sample were atopile's own —
`spin-servo-drive` (128 stars, 63 `.ato` files), `hil` (103 files), `nonos`,
`cell-sim`, `ai-pin`, and `atopile/packages` (1,712 `.ato` files, the first-party
library).

### One thing worth copying outright

**atopile's `--frozen` build.** VERIFIED from `build_steps.py`: `update_pcb`
does a `kicad.compare_without_uuid(original, updated)` diff and, under
`--frozen`, writes `.original.kicad_pcb` / `.updated.kicad_pcb` and **raises with
a markdown diff table** rather than silently rewriting. That is *"derived
artifacts are regenerated every run and compared by content, never by
timestamp"* implemented as a loud refusal, with the UUID noise excluded so the
diff is readable. It is the right shape for this repository's generated
artifacts.

---

## JITX — the brief was wrong twice, and the second correction matters

`https://www.jitx.com` · `https://docs.jitx.com` · `https://github.com/JITx-Inc`
· PyPI `jitx`

### Correction 1: it is not Stanza-based any more

VERIFIED. **JITX's current product is Python.** `pip install jitx` gives
**4.4.3, uploaded 2026-10-01**, requiring Python ≥3.12. Every active repo in the
`JITx-Inc` org is Python (`py-jitx-mechanical` pushed 2026-10-27, `jitx-skills`
2026-10-24, `jitx-examples`, `jitx-pnp`, `jitx-refdes`, `py-jitx-dxf`,
`jitx-emn-importer`); the `stanzapm` repo — their fork of L.B. Stanza — was last
pushed **2025-09-16** and sits unmaintained. The current 443-page documentation
set contains the word "stanza" on **three pages**, all stray leftovers. The
legacy VS Code extension is still called **"JITX-3"**, frozen at v3.36.1
(2026-01-20), while the product moved to v4.

**Any Stanza-based evaluation you have read describes a previous product.**

Architecture, VERIFIED: `jitx` (pure Python, 381 KB wheel) is a **thin client**.
It depends on `jitxcore` (protobuf datastructures) and talks over a **websocket**
to a separately installed proprietary **"launcher"** binary holding the solver,
schematic engine, autorouter and CAD exporters. Your Python is translated to
protobuf (`jitxcore._proto.design_pb2`, `schematic_pb2`) and submitted.

### Correction 2: JITX IS schematic-centric — and probably still cannot give you a `.kicad_sch`

The brief suspected JITX goes code → PCB with schematics secondary. **That is
wrong about JITX's internals and probably right about its deliverables**, and
the gap between those two is the finding.

**Schematics are first class inside JITX.** VERIFIED by enumerating the docs TOC:
there is an entire **Schematic View** section plus **Schematic UI Commands** —
37 pages — covering Group Change Page, Group Merge, Group Replication, Group
Split, **Hierarchical Diagram**, Net Merge, Net Split, Organize Ports, Schematic
Groups, Transforms, and commands including `add-page`, **`edit-sheet-title`**,
`page`, `pages`, `replicate`, `select-net`, `select-wire`.

**And the Python API has drawing-sheet furniture**, which only exists if you are
producing an engineering drawing. VERIFIED from
`docs.jitx.com/en/latest/api/jitx.schematic.html` and confirmed live in the
shipped wheel (`jitx/_translate/schematic.py` marshalling into
`schematic_pb2.AuthorCell/AuthorRow/AuthorTable`): `SchematicTemplate`,
`AuthorTable`, `AuthorRow`, `AuthorCell`, `DataCell`, `TableCell`,
`SchematicTitlePage`, `SchematicMarking`.

**Symbols are authored with real geometry**, at the level `lib/schgen/` works
at. VERIFIED, verbatim from their Altium compat docs:

```python
class MyGroundSymbol(Symbol):
    gnd = Pin(at=(0, 0), direction=Direction.Up)
    vertical = Polyline(width=0.1, points=[(0, 0), (0, -1)])
    horizontals = [ Polyline(width=0.1, points=[(-0.5, -1), (0.5, -1)]), ... ]
    def __init__(self):
        AltiumSymbolProperty(AltiumSymbol.PowerGndPower).assign(self)
```

**The export surface is documented in the package metadata and nowhere else.**
VERIFIED, verbatim from `jitx-4.4.3.dist-info/METADATA`:

> `jitx design export [DESIGN] --to FORMAT` — Exports a loaded design to a CAD
> format (`--to {kicad,altium,edx,xml,odb,step}`) via the runtime.

And the KiCad exporter is registered as **`legacy-kicad`** in
`jitx/_runtime/_legacy_plugins.py`, which sends a websocket message
`("des", "export-cad", {...})` into the closed runtime — **so the actual file
writing happens inside the proprietary launcher and cannot be read.**

**Here is the strong negative signal, and it is a check that could have failed.**
The delegated researcher downloaded the Sphinx `searchindex.js` for the entire
current documentation set — 443 documents — and searched the full-text term
index:

| Term | Documents |
| --- | --- |
| `kicad` | **0** |
| `gerber` | **0** |
| `edx`, `xml`, `dxf`, `emn`, `idf` | **0** |
| `odb` | 2 (release notes + an architecture doc) |
| `cad` | 4, none an export guide |
| `altium` | has a real API page |

**`jitx.com/plans` advertises "KiCad integration" as included even in the free
tier, and 443 pages of current documentation do not mention KiCad once.** The
exporter exists in code and is labelled "legacy."

The only external datapoint on what it writes is weak and the researcher flagged
it as such: a single hobby repo's issue (`ihsinoky/he-piantor-42` #45) claims
`legacy-kicad` produces **`.kicad_pcb` only**, one-way, no round-trip. RELAYED,
from one anonymous repo with machine-generated-looking issue titles, read as a
summary. **It is the only evidence available and it says PCB, not schematic.**

**Verdict: treat "JITX gives me a `.kicad_sch`" as unproven and likely false, and
"JITX gives me a schematic PDF" as undocumented.** Altium gets first-class
schematic-symbol support; KiCad gets a legacy exporter nobody documents. If JITX
is pursued, that is the first question to put to them, and it is the one thing
443 pages do not answer.

Their own FAQ frames the workflow honestly (RELAYED, and it predates the Python
rewrite): you get *"a board with routing rules and an initial component
placement"* that is *"exported back to your existing CAD tool for final place
and route"*, plus *"a schematic and BoM that has been rigorously checked for
correctness"*, exporting to *"CAD (KiCAD and Altium right now, we will write
more exporters)."*

### The agent surface is the best in this survey, and it is skills-over-CLI

- **An official Claude Code plugin marketplace.** VERIFIED:
  `github.com/JITx-Inc/jitx-skills` (20 stars, created 2026-01-29, pushed
  2026-10-24). README: *"JITX hardware design automation skills for both Claude
  Code and Codex/GPT."* Install is `/plugin marketplace add JITx-Inc/jitx-skills`
  then `/plugin install jitx-skills@jitx`. **Nine skills**: `jitx` (base
  workflow), `jitx-component-modeler` (*"Generate JITX Python component code
  from datasheets, KiCad footprints, or user specifications"*),
  `jitx-circuit-builder`, `jitx-substrate-modeler`, `jitx-physical-layout`,
  `jitx-interconnect-constraints`, `jitx-pin-assignment`, `jitx-code-review`,
  `jitx-mechanical`.
- **The official docs name Claude Code.** VERIFIED: the CLI is *"a good fit for
  terminal-centric workflows, **headless and CI environments, and designing
  circuit boards in collaboration with coding agents like Claude Code**."*
- **Headless and machine-readable.** VERIFIED: `jitx runtime start
  --background`; `jitx design build --all`; **`--format json` on every
  subcommand**; and **`--dry`**, which exercises instantiation and translation
  with no runtime connection — a fast inner loop for an agent.
- **No MCP server.** VERIFIED: zero hits in docs and wheel. Their bet is skills
  over a well-documented JSON-emitting CLI, which for this purpose is arguably
  easier to drive than an MCP server.

### Licensing is the sting, and it is easy to misread

- **The Python packages are proprietary.** VERIFIED: both `jitx` 4.4.3 and
  `jitxcore` 4.4.0 carry `Classifier: License :: Other/Proprietary License`.
  **There is no open-source JITX.**
- **A license server and online sign-in are mandatory.** VERIFIED from
  `jitx/_auth/login.py`: an RFC 8628 device-authorization flow writing a license
  JWT and refresh JWT to disk, validated by the launcher, which *"embeds the
  public key for license verification."*
- **Two tiers** (VERIFIED, `jitx.com/plans`):
  - **Free and Open** — *"Free Indefinitely"*, but licensed **CERN
    OHL-Permissive v2**, "designs only; incompatible with proprietary/GPL
    designs." **Read that carefully: the open licence applies to the designs you
    produce, not to the tool. The free tier means your boards must be open
    hardware.** Includes KiCad and Altium integration and unlimited complexity.
  - **Enterprise** — contact sales. Proprietary designs, PLM, Siemens
    Xpedition, air-gapped install.
- RELAYED and stale: a 2024 HN thread (193 points) repeatedly cites
  **$1,000/month** commercial pricing. **Treat that as a 2024 figure**; it is the
  only number anyone has published.

**Alive and shipping:** VERIFIED PyPI releases through 2026 — 4.0.5 (Jan),
4.2.0 (Jun), 4.4.0 (Aug), 4.4.1 (Sep), 4.4.2/4.4.3 (Oct 1); docs updated
2026-08-31; repos pushed within the last week. No acquisition or shutdown news
found, though that search was not exhaustive.

**Adoption evidence is the weakest part of the case, and the researcher said
so.** VERIFIED: the legacy VS Code extension has 3,825 lifetime installs since
2021 with an average rating of **2.0 from two ratings** (statistically
meaningless, but it is what exists). `jitx-skills` has 20 stars;
`jitx-examples` has 1. Named integrations (Siemens, Altium, Ansys, Keysight) are
RELAYED from the homepage; **no named customers**. Against atopile's 4,026 stars
JITX's public footprint is an order of magnitude smaller — consistent with an
enterprise/defence-shaped business (air-gapped installs, Xpedition, HFSS, PLM)
rather than a community one, which may mean quieter and more solvent, but it
means **essentially no public evidence of who ships boards with it.**

### What to take from JITX

**Its schematic data model, not its product.** `SchematicTemplate` /
`AuthorTable` / `SchematicTitlePage` / `SchematicMarking` alongside
`Symbol(Pin(at=…), Polyline(…))` is a tidy, hand-overridable decomposition of
exactly the problem `lib/schgen/` solves. And the fact that JITX exposes
**"organize ports", "group merge/split", "net merge/split" as *named
operations*** is a direct answer to the "an agent may never author its own
acceptance criteria" problem: **those are the knobs, and the criteria live
outside them.** A named, enumerable operation set is auditable in a way a
monolithic "lay out the sheet" pass is not.

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

## Netlist → schematic: the open-source landscape

Delegated research, returned in full and summarised here. Where this section
says VERIFIED it means the delegated researcher checked a primary source — the
GitHub REST API, raw file contents, registry JSON, or the arXiv API — and named
it. Their report distinguished page-fetch summaries from byte-verified reads;
that distinction is preserved where it changes what you may conclude.

### `schematizer` — the only automatic netlist→`.kicad_sch` placer and router, and it cannot draw a Pultec

`https://github.com/devbisme/schematizer` · PyPI `schematizer`

> **THIS SECTION WAS WRITTEN AS "THE FIND OF THE SURVEY" AND IT IS WRONG FOR
> THIS REPOSITORY. The correction is shown rather than edited away, because what
> produced it is the argument for the rule it broke.**
>
> **This repository installed `schematizer` and ran it, and the result is in
> [`../schematic/generation-prior-art-second-pass.md`](../schematic/generation-prior-art-second-pass.md).**
> A Pultec EQP-1A-shaped passive section — 25 parts, 22 nets, rotary selectors
> fanning out to capacitor banks, potentiometers strapped as rheostats, an
> inductor in the HF boost leg — **never routed. 0 successes in 9 attempts**,
> every one ending in `schematizer.engine.route.RoutingFailure`, taking
> **26 to 121 seconds to fail**. The failing net varied run to run, which is the
> randomised placement showing through. `--mode labels` succeeded every time in
> 0.13 s.
>
> **Symbol vocabulary was never the obstacle** — `Switch:SW_Rotary_1x7_MP`,
> `Switch:SW_Rotary_1x4_MP`, `Device:R_Potentiometer`, `Device:L` and
> `Device:Transformer_1P_1S` all load from stock KiCad 10 libraries and all
> serialise into schematizer's netlist JSON. **The router is the obstacle, on
> precisely this repository's circuit idiom.**
>
> **And the non-determinism is worse than this document reported, in a way that
> matters.** The measured pass diffed whole output directories over three runs
> per configuration: `--mode labels` is **byte-for-byte reproducible**,
> `--mode normal` is not — but comparing *geometry only* showed that a `normal`
> run may differ from its predecessor by a **pure serialization reshuffle** (the
> same wire, same deterministic UUID, at a different file offset), by a
> **genuinely different layout**, or by both, **with nothing in the output
> distinguishing the cases.** Their conclusion, which this document would have
> got wrong: *"normalising UUIDs and sorting elements would not make the output
> stable — it would only hide the cases where it was not."*
>
> Also measured there: its own test suite gives **126 passed, 13 failed, 22
> skipped** in that environment, all 13 failures one cause (skidl could not
> resolve the KiCad symbol libraries), and *"NOT reported as defects"*.
>
> **What survives of this section:** the architectural description, the input
> format, the two modes, and the maturity figures are accurate and useful. The
> *recommendation* does not survive. Read the paragraphs below as "what the tool
> is," not "what it would do for us" — that question is already answered, no.

It is
SKiDL 3.0.0's schematic-generation engine, extracted into a standalone package
explicitly so that front ends other than SKiDL can use it. From its README
(VERIFIED, fetched verbatim):

> `schematizer` does the *graphical* half of EDA: it takes a tool-neutral netlist
> document and does all the drawing work — component placement, wire routing, and
> writing either editable `.kicad_sch` files or static, cross-linked `.svg` pages
> for a selected KiCad version (6–10). It is not tied to any particular front
> end: **any** tool that emits the netlist format can use it.

> **Self-contained.** … no `.kicad_sym` re-parse, no KiCad library access, and
> **no runtime dependency on skidl**. The only runtime dependency is `simp_sexp`.

**It is not a stub.** VERIFIED by reading the source tree with file sizes: ~617 KB
of Python, of which `engine/route.py` is **140,684 bytes** and `engine/place.py`
is **86,362 bytes**, plus `engine/sexp_schematic.py` (60 KB),
`engine/gen_schematic.py` (33 KB), `geometry.py` (32 KB), `engine/snap.py`
(25 KB), `engine/decisions.py` (19 KB), `engine/labels.py` (16 KB), a vendored
`data/power.kicad_sym` (165 KB), and seven test files. A 140 KB router is an
implementation.

Placement is **force-directed** in four phases; routing is five phases (coarse
cells, global Manhattan pathfinding, terminal assignment on cell peripheries,
greedy detailed switchbox routing, concatenation), shortest nets first.

**The input format is fully specified and emittable from TypeScript.** VERIFIED
by reading `src/schematizer/loader.py` and `tests/data/flat.json`. It validates
`format == "skidl-generic-netlist"` and `version == 1` and hard-errors
otherwise. The document carries `symbols` (keyed by `lib_id`, each with
`draw_cmds` and per-unit `pins` with `x`, `y`, `orient`, `rotation`, `length`,
`func`), `components` (`ref`, `lib_id`, `value`, `footprint`, `hiertuple`,
`symtx`, `orientation_locked`, `fields`, `pins`), `nets` (`name`, `code`,
`stub`, `stub_explicit`, `netio`, `implicit`, `nc`, `attrs.netclasses`, `nodes`)
and `netclasses`.

Three structural facts change the integration estimate:

1. **Symbol graphics travel inside the netlist** as `symbols[lib_id].draw_cmds`
   — flattened KiCad s-expressions handed to the writer as-is. This is why the
   package needs no KiCad library access, and it is also **the main integration
   cost**: a TypeScript producer must lift `draw_cmds` and pin geometry out of
   the on-disk `.kicad_sym` libraries once per symbol. Mechanical, but real.
2. **Multi-unit parts are first class** — `loader.py` builds a unit per entry
   when a part has more than one, labelled `uA`, `uB`, … Directly relevant to
   this repository's documented multi-section-package convention and to a valve
   triode.
3. **Layout hints are caller-supplied, not inferred** — `symtx` (mirror/rotate),
   `orientation_locked`, per-net `stub`/`stub_explicit`/`netio`. So the caller
   retains the arrangement decisions, which is the right side of this
   repository's invariant.

Two modes, and the second matters here. Default is placed-and-routed. **`--mode
labels`** produces *"a schematic whose connectivity is exact by construction …
Parts are placed unrotated on a plain, deterministic grid. There is no placement
optimization and no wire routing, so it is fast (about 2 s for a 190-part
design)"* — every connected pin gets a stub to a power symbol or label, NC pins
get NC flags, and `.kicad_sch` is the only permitted output. `--flatness`
controls hierarchy from one page per subcircuit (with hyperlinked, back-linked
SVG children) to everything on one page.

**The caveat that collides with this repository's settled practice.** VERIFIED,
README, under *"Randomized layout"*:

> Placement starts parts at random positions and the router breaks ties randomly,
> so the same netlist produces a different — equally valid — drawing on every
> run. **There is no way to pin a layout down: if you get one you want to keep,
> keep the generated files.**

`CLAUDE.md` requires derived artifacts to be regenerated every run and compared
by content. A generator that draws differently every run cannot be held to that.
Worse, a stated criterion like "the drawing has at most N crossings" becomes a
per-run lottery rather than a property of the circuit — which quietly breaks the
"criteria reach the artifact through a channel the producer did not author"
invariant, because the criterion is no longer testing anything stable.
**`--mode labels` is deterministic and is therefore the only mode compatible
with this repository's regeneration discipline**; the placed-and-routed mode is a
one-shot you capture. Note also KiCad 5 is rejected with an explanatory error;
`--tool` accepts `kicad6` through `kicad10`.

**Maturity, stated plainly: five weeks old as a public package.** VERIFIED:
PyPI `0.1.0` 2026-09-24, `0.2.0` 2026-10-13; repo 4 stars, last commit
2026-10-12. The engine is older — SKiDL's `HISTORY.md` shows schematic
generation for KiCad 6–9 arriving in `2.2.2` on **2026-04-03** (before which it
was KiCad-5-only), so the modern capability is about seven months old.

**Its author's own assessment**, from the SKiDL blog (RELAYED through a page
summariser, not byte-verified): *"Quite frankly, the block placement doesn't look
great."* And: *"at this point, it's better than what we had (which was nothing),
but the quality of the schematics still needs improvement."*

### The cautionary datum, and it is the most useful one in the survey

SKiDL issue #318 (`https://github.com/devbisme/skidl/issues/318`, opened
2026-07-03, closed 2026-07-28). VERIFIED. `generate_schematic` **dropped all
wiring of non-first units of multi-unit parts**. The part was a `Valve:ECC83` —
a three-unit valve triode. The reporter's table, verbatim:

| Netlist source | U1 pins present |
| --- | --- |
| skidl `generate_netlist()` | 1,2,3,4,5,6,7,8,9 |
| `kicad-cli sch export netlist` on the generated `.kicad_sch` | **6,7,8 only** |

Quoted: *"Nets dropped from the schematic include every net whose only symbol
contact was through unit uB or uC (in our case **6 of 11 nets lost or
truncated**) … an electrically different circuit, **with no error or warning
during generation.**"*

Three things to take from it, and they are pointed at this repository
specifically:

1. **It was a valve in a multi-unit package.** The Pultec is a valve EQ and
   multi-section packages are a documented convention here. This is this
   repository's shape of circuit, and it is exactly where the tool silently
   lied.
2. **It was caught only by a `kicad-cli sch export netlist` round trip.** The
   generator reported success. That is `docs/schematic/false-greens.md`
   material contributed by a stranger.
3. **It is fixed** — SKiDL `2.3.0` (2026-07-28): *"Fixed multi-unit part
   reference handling so all units share a single base reference rather than
   compound references."* The class of bug is not fixed. Read the rest of that
   changelog entry as a maturity gauge: as of mid-2026 the same generator was
   also emitting `??` for missing power symbols and question marks for
   references.

**And nobody has an answer for layout preservation.** SKiDL issue #316
(`https://github.com/devbisme/skidl/issues/316`), opened **2026-06-23**, still
open, **zero comments** (VERIFIED against the comments endpoint). Titled *"RFC:
layout-preserving KiCad schematic regeneration"*, it says: *"generated schematics
often need manual cleanup in Eeschema before they are readable enough for
debugging, review, and handoff"*; *"A generated schematic may be electrically
correct but still hard to debug if symbol placement, wire routing, labels, and
grouping are poor"*; and *"rerunning schematic generation can overwrite manual
readability improvements made in KiCad, even when the logical netlist has not
changed."* Four months open, no maintainer response. **No tool in this survey
preserves a human's or an agent's schematic layout across regeneration.**

### Weave — deterministic, certified, and the architecture to read

*Weave: Verified Netlist-to-Schematic Conversion via Layered Graph Layout*,
**arXiv:2607.03835**, submitted 2026-07-04 (VERIFIED via the arXiv API). Code at
`https://github.com/senolgulgonul/weave` — 14 stars, last commit 2026-08-19,
described as *"SPICE netlist → LTspice .asc · elkjs layout"*.

**It is JavaScript, it uses elkjs, and it is deterministic with a correctness
certificate.** From its README (VERIFIED, fetched verbatim) — and the middle
sentence is the design insight:

> The netlist is parsed into components and nets. Nets are classified as
> **ground, supply rail, or signal**. Signal components become nodes in a graph
> that **elkjs** lays out with its **layered (Sugiyama)** algorithm, giving
> left-to-right signal flow and orthogonal wire routing. **Feedback loops,
> divider legs, hanging shunts, and supply corners are handled as placement
> patterns rather than graph nodes, which keeps the main signal chain clean.**

That is the problem netlistsvg never solved. **You do not hand the whole analog
circuit to a layered layout engine. You extract the signal chain as the graph,
and handle rails, shunts, dividers and feedback as pattern-matched placements
around it.**

Two more mechanisms worth naming:

> The part that makes Weave trustworthy is the **round-trip verifier**. After
> generating the `.asc`, Weave parses its own output back into a netlist and
> compares the connectivity, net by net, against the original. If every net
> matches, you get a green badge. If some nets differ, you get an honest count of
> how many need attention.

> **Safe-mode ladder:** … Rather than fail, Weave climbs a ladder of
> progressively simpler layout modes, switching patterns off one by one down to
> pure elkjs, and keeps the first result the verifier accepts. Correctness is
> guaranteed at every rung by the verifier, so a safe-mode result is never wrong,
> only plainer.

**Note what the safe-mode ladder is, and what it is not.** It degrades the
*drawing* and reports the rung — it never degrades *connectivity*, because a
verifier that could have failed gates every rung. That is the legitimate form of
the thing tscircuit does illegitimately: tscircuit substitutes a label for a
wire and says nothing; Weave simplifies the layout, proves the connectivity
survived, and tells you which rung it landed on.

Reported numbers (RELAYED through the arXiv abstract page): 100% compilation
success and 100% connectivity verification against **Schemato**'s 76% and 0.35
graph-edit distance; exact connectivity on **88.4%** of 3,460 netlistable
circuits from Analog Devices' LTspice demo collection, with the remaining
failures *"confined to a single, well-characterized class of dense multi-pin
power modules."*

Element coverage is analog-complete for this repository's purposes (VERIFIED
from the README): R, L, C, V, I, D, BJT and MOSFET including LTspice's 4-node
substrate export, **JFET**, subcircuits with parameter tails, dependent sources
`E`/`G`/`F`/`H`, behavioural `B`, switches `S`/`W`, transmission lines `T`, `K`
coupling, `A` special-function, with SPICE `+` continuations joined.

**Caveats (VERIFIED): output is LTspice `.asc`, not `.kicad_sch` — the wrong
target.** The repository is also messy: eight timestamped multi-megabyte HTML
snapshots at top level plus a 3.4 MB `index.html`; it is a single-file browser
tool, not a library. 14 stars, one author, 2.5 months stale.

> **Two corrections from this repository's own measured pass**
> ([`../schematic/generation-prior-art-second-pass.md`](../schematic/generation-prior-art-second-pass.md)),
> which ran Weave rather than reading it. Both matter.
>
> **1. There is no licence.** Measured: *"The `weave` repository contains no
> `LICENSE` file. `git ls-files` lists 16 files and none is a licence; the GitHub
> API reports `license=null`."* Its `cli/package.json` declares
> `"license": "MIT"`, so the intent is evident, but **there is no licence text in
> the repository.** Anyone proposing to reuse Weave's code should resolve that
> with the author first. This document's advice to read-don't-adopt happens to
> be safe; the reason it is safe is not the reason it gave.
>
> **2. Weave cannot represent this repository's circuits, and the loss is
> invisible — which is a sharp limit on round-trip certification generally.**
> Measured: *"the rotary selector cannot be represented in Weave's input at
> all."* Weave consumes a SPICE netlist, so *"seven HF capacitors had to be
> written as permanently connected in parallel."* Weave then drew an accurate
> picture of **the substituted circuit**, and *"the substitution happens before
> Weave sees anything and is invisible"* in the output. **Its verifier certifies
> the netlist it was given, not the circuit you meant.** A round-trip
> certificate proves *faithfulness*, never *fidelity to intent* — and the step
> that loses the intent sits upstream of the thing doing the certifying. That
> caveat transfers directly to the `kicad-cli` round-trip gate recommended in
> this document's conclusions, and it should be carried with it.
>
> Also measured: Weave's drawing *"is tall and stretched"* — its own stated
> weakness, visible — but it *"at least shows that a bank exists, which is more
> than schematizer's routed output manages."* And its **88.4% figure on 3,460
> Analog Devices circuits was not reproduced.** Note also that no renderer ships
> with Weave's CLI, so the measuring pass had to write one.

**Read Weave's pipeline and verifier design; do not adopt the package** — and
note which half survived contact with this repository's circuits. The
pattern-matching-around-a-layered-core idea and the safe-mode ladder port
directly to TypeScript; `elkjs` is live on npm (`0.12.1`, published 2026-10-28,
VERIFIED), and this repository has **already run ELK on its own circuits across
15 inputs** — read [`../schematic/elk-spike.md`](../schematic/elk-spike.md) and
[`../schematic/elk-block-spike.md`](../schematic/elk-block-spike.md) before
re-deriving any of it.

### netlistsvg — real analog support, dormant, and abandoned by its main consumer

`https://github.com/nturley/netlistsvg`. VERIFIED: 836 stars, 55 open issues,
**last commit 2024-01-25**, last GitHub release `v1.0.2` 2020-12-12, npm
`1.0.2` published **2020-12-12** — no npm publish in about six years. A
modernisation PR (#153, `v2.0.0-alpha.1`) was **closed** 2026-03-16.

**It genuinely does analog.** VERIFIED by reading `lib/analog.svg` and
extracting its 25 cell types: `resistor_h/v`, `capacitor_h/v`, `inductor_h/v`,
`diode_h/v`, `diode_led_h/v`, `diode_schottky_h/v`, `transistor_npn`,
`transistor_pnp`, `opamp`, `transformer_1p_1s`, `xtal`, `voltage_source`,
`current_source`, `vcc`, `vee`, `gnd`, `inputExt`, `outputExt`, `generic`. Its
ELK config runs **layered, direction DOWN**, with constants and split/join nodes
disabled. `test/analog/` holds real fixtures including `resistor_divider.json`
and `common_emitter_full.json`.

**What the input demands of you is the disqualifier.** VERIFIED by reading
`common_emitter_full.json` in full:

1. **You choose the symbol orientation, not the tool** — cells are typed `r_v`,
   `c_h`, `q_npn`. Issue #40, *"WIP: Auto orient analog components"*, has been
   open since **2018-06-04**.
2. **Power and ground are pseudo-cells you instantiate per attachment point** —
   the example literally contains `gnd83`, `gnd85`, `gnd89`, `vcc80`, `vcc86`.
   There is no "GND is special" concept.
3. **`port_directions` per pin drives the layering** — every passive declares
   `{"A":"input","B":"output"}`. You hand-feed signal-flow direction per
   terminal.

So the caller supplies a large part of the arrangement the tool is supposed to be
doing — and then it emits **SVG only, never `.kicad_sch`**. The symbol set has
**no potentiometer, no FET of any kind, no switch, no valve, no multi-tap
transformer, no photoresistor**, and no unit concept, so a dual op-amp is two
unrelated `opamp` cells. This repository's circuits need most of what is
missing.

**The trajectory signal is unambiguous.** VERIFIED from SKiDL's `HISTORY.md` for
`3.0.0` (2026-10-16): *"`generate_svg()` no longer shells out to `netlistsvg`
(which is no longer a dependency). It now draws the same placed-and-routed
schematic that `generate_schematic()` produces."* The most prominent
programmatic-circuit tool in this space used netlistsvg as its renderer and
dropped it. Its structural analog issues — #31 *"Better horizontal analog
flow"* (2018), #52 *"Redundant 'Larry' VCCs"* (2019), #68 *"Nets that should
stay parallel get tangled up"* (2019) — are all still open.

### Dead ends, recorded so nobody re-checks them

| Tool | Status | Why it does not serve |
| --- | --- | --- |
| `schemdraw` | 281 stars, **active**, last commit 2026-10-08 | A *drawing DSL*, not a generator. Requires `.right()`, `.down()`, `.at()` placement directives. No netlist import, no KiCad export. |
| `lcapy` | 305 stars, active, 2026-08-16 | Netlist → CircuiTikZ, and uniquely can annotate node voltages and branch currents from solving the circuit. But layout is **semi-automatic only** — orientation hints required. **No KiCad output.** |
| `lt2circuitikz` | 117 stars, **2023-03-27** | LTspice `.asc` → circuitikz. Consumes an already-drawn schematic; does **no layout**. |
| `f18m/netlist-viewer` | 97 stars, 2026-02-26 | SPICE netlist viewer. No KiCad output. Layout algorithm unverified. |
| `aidangoettsch/asg` | 31 stars, **2020-10-25** | SPICE netlist → schematic, WOSET 2020. Six years stale. Prior art only. |
| `xschem` | 506 stars, **last commit 2026-10-28** | Very active, full Tcl command surface, but **no netlist→schematic path and no KiCad output**. Its parametric *generator attribute* — `schematic=schematicgen.tcl(buf,4)` makes xschem run a script and read a schematic from stdout — is a genuinely good idea this repository could copy per functional block. |
| `lepton-eda` (ex-`gschem`) | 268 stars, active 2026-10-27 | Guile-scriptable, hierarchy-aware, but everything points **schematic→netlist**. Not KiCad's format. **UNDER-RESEARCHED** — the Guile examples wiki was not reached. |
| Horizon EDA | 1,325 stars, active 2026-10-04 | A Python module exists (docs index lists it) but its docs page **404s** and it is not in-repo. **Unassessed.** Native format is not KiCad's regardless. |

**No netlist → circuitikz tool that performs layout was found.** Searched for
and not located at all: `circuit_tools`, `SPICED`, `Artisan` — absence of
evidence, not evidence of absence.

### KiCad file libraries: the Python ones are stale, the TypeScript one is not

VERIFIED via the GitHub API and registry JSON by the delegated researcher.

| Library | Lang | Stars | Last commit | Last release | Status |
| --- | --- | --- | --- | --- | --- |
| **`kicadts`** | **TypeScript** | 9 | **2026-10-27** | npm `0.0.62`, 2026-10-27, 62 versions since 2025-09-29 | **Active** |
| `rjwalters/kicad-tools` | Python | 74 | **2026-10-28** | — | Active |
| `kicad-sch-api` | Python | 57 | 2025-12-05 | PyPI `0.5.6`, 2025-11-19 | Semi-active |
| `kiutils` | Python | 129 | **2024-05-02** | PyPI `1.4.8`, 2024-02-02 | **DO NOT USE — see below** |
| `kicad-skip` | Python | 230 | **2024-02-16** | PyPI `0.2.5`, 2024-02-16 | **Stale ~2.7 yr** |

`kiutils` and `kicad-skip` are *manipulation* libraries — typed s-expression
trees, no placement, no routing — and both have been untouched across KiCad
8 → 9 → 10.

> **`kiutils` is not merely stale: it destroys data silently on KiCad 10, and
> this repository measured it.** From
> [`2026-10-28-agent-kicad-surfaces.md`](2026-10-28-agent-kicad-surfaces.md),
> run against `circuits/pt2399-core/pt2399-core.kicad_sch`
> (`version 20260306`, 40 symbols, 72 wires): loading **PASSED**, moving a
> symbol **PASSED**, creating a wire **PASSED**, and
> `kicad-cli sch export svg` on the output **PASSED, exit 0**. And the round
> trip lost whole token classes:
>
> | token | before → after |
> | --- | --- |
> | `hide` | **192 → 0** |
> | `do_not_autoplace` | **259 → 0** |
> | `exclude_from_sim` | 48 → 0 |
> | `in_pos_files` | 48 → 0 |
> | `body_style` | 40 → 0 |
> | `embedded_fonts` | 9 → 0 |
> | `pin_numbers` | 6 → 0 |
>
> plus `generator_version` and `duplicate_pin_numbers_are_jumpers` gone
> entirely. **Every check passed and 192 `hide` flags vanished** — so a
> schematic round-tripped through `kiutils` renders, exports and exits zero
> while every field that was deliberately hidden is now shown. It is marked
> "Production/Stable" on PyPI and self-scoped to "KiCad 6.0 and up."
>
> This is the survey's cleanest specimen of a false green, and it is an
> instructive one: `kicad-cli` exiting 0 is **not** a correctness gate. It
> proves the file parses, nothing more. The gate this document's conclusions
> recommend is `kicad-cli sch export netlist` *compared against the model* —
> which would also not have caught this, because connectivity was preserved.
> **Legibility loss and connectivity loss need different checks.**

That corroborates the `kicadts` recommendation from a second direction — and
`kicadts` was measured on the same file rather than assumed: parsing **PASSED**
(`{v:20260306, gv:"10.0"}`), counts **PASSED** (40 symbols / 72 wires / 16
junctions / 6 global labels / 8 libSymbols), reading `libraryId` **PASSED**
(note the accessor is `libraryId`, **not** `libId`), moving a symbol **PASSED**,
and reading field positions with their `hide` flags **PASSED**. Its exported
class list models KiCad 9/10 tokens (`EmbeddedFonts`, `FieldsAutoplaced`,
`ExcludeFromSim`), not KiCad 6. **It is the only maintained option, in the right
language, verified against this repository's own file** — and that companion
document names two sharp edges this one did not look for, so read it before
depending on the library.

**One point worth stating explicitly rather than letting an org name decide
it:** `kicadts` is a tscircuit-org package, and tscircuit was removed from this
project. `kicadts` is a file-format library only — no board, no renderer, no
JSX, no reactive model, and above all **no router** — so it does not reintroduce
anything `docs/decisions/2026-09-21-why-not-tscircuit.md` rejected. The thing
that decision disqualified was a router that disguises failure; this package has
no router at all.

### `kicad-schematic-builder` — 0 stars, and its README is the best prose in the survey

`https://github.com/movray/kicad-schematic-builder`. VERIFIED: 0 stars, last
commit 2026-10-12. Tiny and brand new. Quote:

> Tools like SKiDL describe a circuit as code, but **their generated schematics
> are hard to read.** kicad-schematic-builder takes the parts from the netlist and
> **lets you place symbols, wires, labels and power symbols on a grid yourself,
> like you would in the schematic editor.** Afterwards it **checks with
> `kicad-cli` that the drawing connects exactly what the netlist says.**

Its API shape (VERIFIED from README) is `sch.place("U1", 100, 100)`,
`sch.wire(sch.pin("U1","VDD"), (100,80), sch.pin("C1","1"))`, `sch.power(...)`,
`sch.label(...)`, `sch.write(...)`, then `verify("board.kicad_sch",
"board.net")`. Wires split where they touch pins, labels and wire-ends with
**junction dots added automatically**; coordinates snapped to the **1.27 mm
grid**; symbols resolved **the way KiCad does it** — project `sym-lib-table`,
then global, then `${KICAD9_SYMBOL_DIR}` — with `extends` flattened as KiCad
embeds it. Stated limits, verbatim: *"Single sheet, net labels only (no
hierarchical or global labels yet). The layout is up to you: there is no
automatic placement or routing. The output is regenerated on every run, edits
made in KiCad are overwritten."* Developed on a 16-part, 34-net board.

**This is this repository's architecture, written by someone else, in Python, at
0 stars.** An agent places and routes; a mechanical gate it did not author
(`kicad-cli` netlist round trip) decides correctness; the artifact regenerates
deterministically. Do not depend on it. The shape is the point, and `kicadts`
gives the same primitives in TypeScript.

### LLM schematic-generation research, 2024–2026

All arXiv metadata VERIFIED through `export.arxiv.org/api/query`.

| Paper | arXiv | Submitted | Generates | Code |
| --- | --- | --- | --- | --- |
| **Schemato** | 2411.13899 | 2024-11 (v2) | LTspice `.asc` from SPICE netlist — a *drawn* schematic | dataset `Circuits-LTSpice`, 117 netlists; 76% compilation success (RELAYED) |
| **EEschematic** | 2510.17002 | 2025-10-19 | Schematic diagrams from SPICE netlists. Multimodal, 6 few-shot analog substructure examples, **Visual Chain-of-Thought** refining placement and wiring for clarity and **symmetry** | not verified |
| **SchGen** | 2605.30345 | 2026-05-28 | *"the first large language model that generates **editable PCB schematics** from natural-language requests"* | not verified |
| **Weave** | 2607.03835 | 2026-07-04 | LTspice `.asc`, deterministic, certified | **yes** |
| **AnalogMaster** | 2604.20916 | 2026-04-22 | Image → netlist → sizing → placement → routing | not verified |
| **PANDA** | 2606.15052 | 2026-06-13 | Intent → topology → sizing → IC layout (not schematic) | not verified |

**SchGen's representation is the idea worth stealing**, and it is close to
something this repository already does: **schematic editing primitives with
relative placement and pin-name-based wiring** instead of absolute geometry. That
is a schematic IR an agent can author and a renderer resolves to coordinates —
it decouples *arrangement*, which `CLAUDE.md` assigns to the agent, from
*coordinates*, which belong to the tool.

**The topology-synthesis line is off the critical path** — these emit netlists
or topologies, not drawings: **AnalogCoder** (PySpice code), **LaMAGIC**
(2407.18269) and **LaMAGIC2** (2506.10235), **AnalogGenie** (2503.00205,
ICLR 2025), **CktGen** (2410.00995), **EXPLORE** (2607.13416),
**AnalogRetriever** (2604.23195). All RELAYED from search listings.

One title is worth chasing for its own sake: *"Validation and Simulation Catch
Different Errors: Four Levels of Evaluation for LLM-Generated Circuits"*
(arXiv 2609.26830) — RELAYED, unread, and squarely on this repository's "look at
the output, not only the tests" practice. Also RELAYED and unread: a 2025 FITEE
review, *"A review of automatic schematic generation techniques and their
application to printed circuit boards"* — probably the single best entry point
to the classical, non-LLM automatic-schematic-generation literature.

### atopile, as seen from this angle — and one corroboration

Two researchers reached atopile independently, which is useful because they
agree on the conclusion and one found something the other did not.

Corroborated: **atopile deliberately produces no readable schematic.** Both
independently measured the default-branch staleness — 4,026 stars with the last
`main` commit on **2026-03-11**. See the full
[atopile section](#atopile--anti-schematic-by-thesis-and-the-open-source-line-is-being-wound-down)
above for the shipped-package evidence.

One extra item, recorded only to close the loop: a third-party fork
(`just1jak/atopile`, **0 stars**, last commit 2026-10-19) claims to save a real
`.kicad_sch` with symbols and nets derived from the PCB's pad assignments.
Unverified, a personal fork, and deriving a schematic from pad assignments is
unlikely to yield anything legible. Noted, not recommended.

### One more detail on `circuit-json-to-kicad` that changes its value here

VERIFIED by the delegated researcher reading
`lib/schematic/getLibraryId.ts`: `lib_id` resolves against the
**`schematic-symbols` npm package**, not KiCad's stock libraries.

```ts
import { symbols } from "schematic-symbols"
function isBuiltinSymbol(symbolName: string): boolean { return symbolName in symbols }
if (isBuiltinSymbol(schematicComp.symbol_name)) return `Device:${schematicComp.symbol_name}`
return `Custom:${schematicComp.symbol_name}`
```

So the output carries `Device:resistor` — tscircuit's name — **not** `Device:R`,
KiCad's. And the `lib_symbols` graphics are synthesized from tscircuit's own
primitives. The `.kicad_sch` is valid, self-contained and legible, but its
symbols are **tscircuit-flavoured rather than KiCad-canonical**: those `lib_id`s
correspond to nothing in this repository's symbol libraries. For a project whose
practice is *"verify names against the thing itself — the libraries are on
disk,"* that is a real mismatch and it must be weighed before adopting the
converter wholesale. The pipeline is nonetheless 37 files and **196 tests under
`tests/sch`** (VERIFIED), which is the best available reference implementation.

**Its symbol coverage is good for analog audio and has one gap that matters
here.** VERIFIED by enumerating `tscircuit/schematic-symbols`: **437 symbol
files**, roughly 110 distinct symbols with orientation variants. Present:
`potentiometer` ×3, `transformer_4_winding`, `opamp_with_power` /
`opamp_no_power`, NPN/PNP, `darlington_pair_transistor`, N/P JFET, N/P-channel
depletion and enhancement MOSFETs with eight orientation variants each,
**`light_dependent_resistor`** (this repository's `photoresistor` kind),
`phototransistor_optocoupler`, SPST/SPDT/DPST/DPDT switches with
normally-closed variants, push buttons, crystal, resonator, ferrite bead,
speaker, fuse, varistor, zener, schottky, testpoint, ground/vcc/rail variants.
**Absent: any vacuum tube or valve symbol.** For a Pultec that is a gap to fill.

### Direct answer to "what takes a netlist and produces a placed, routed `.kicad_sch`"

**Exactly one tool, and it is five weeks old.**

| | `schematizer` |
| --- | --- |
| Input | `skidl-generic-netlist` v1 JSON — fully specified, emittable from TypeScript |
| Output | `.kicad_sch` (KiCad 6–10), or SVG off the same layout pass |
| Placement | **Yes** — force-directed, 4 phases, 86 KB |
| Routing | **Yes** — 5 phases, global + switchbox, 141 KB |
| Hierarchy | Yes, `--flatness` |
| Deterministic | **No** by default; **yes** in `--mode labels` (no routing) |
| Maturity | PyPI 0.1.0 2026-09-24; 4 stars; engine ~7 months old |
| Author's view | *"the block placement doesn't look great"* |
| Known hazard | Silently dropped 6 of 11 nets on a `Valve:ECC83` as late as July 2026. Fixed. Round-trip or do not trust it. |
| Needs KiCad libs | No — symbols travel embedded, so **you extract them yourself** |

**Writes `.kicad_sch` but you supply the placement:** `kicadts` (TS,
2026-10-27), `circuit-json-to-kicad` (TS, 2026-10-28, non-canonical `lib_id`s),
`kicad-schematic-builder` (Py, real KiCad libs, auto junctions, 1.27 mm snap),
`kicad-sch-api` (Py, 2025-12), `kicad-skip` and `kiutils` (Py, 2024).

**Does not exist:**

- A KiCad-native programmatic schematic API (see the headline section).
- A netlist → circuitikz tool that does layout.
- **Any tool that preserves a human's or an agent's schematic layout across
  regeneration.** SKiDL #316 asked on 2026-06-23 and got no reply.
- **Any analog schematic generator that is simultaneously deterministic and
  emits `.kicad_sch`.** Weave is deterministic and certified but writes LTspice
  `.asc`. `schematizer` writes `.kicad_sch` but randomizes, except in a mode
  that does no routing. **That gap is exactly where this repository sits**, and
  it is the clearest statement in this survey of why `lib/schgen/` exists.

---

## Diode Computers — the one company shipping, in the open, what this repository is building

`https://www.diode.computer` · docs `https://docs.pcb.new` · code
`https://github.com/diodeinc/pcb` (**MIT**)

**This is the most relevant find in the survey and it was not in the brief's
expectations.** It is the only company shipping, openly, a model-to-`.kicad_sch`
generator with placement, net symbols, hierarchy **and reconciliation**.

Three distinct things, and conflating them is how to get this company wrong
(all VERIFIED):

1. **`pcb` — an MIT, Rust CLI** compiling **Zener**, a Starlark-based hardware
   description language, into KiCad schematics and boards; runs ngspice, does
   DFM, emits manufacturing data. **Free, local, offline, no account.**
2. **A hosted design service** at `build.diode.computer` — self-serve, "you,
   with our AI agent."
3. **An enterprise design shop** — **"From $10,000 per design, plus fab"**,
   boards assembled in Brooklyn.

**Liveness is not in doubt.** VERIFIED via `gh api`: 469 stars, 61 forks, MIT,
**pushed 2026-10-28T17:11Z — today**, releases v0.4.94 (10-28), .93 (10-25),
.92 (10-22), .91 and .90 (10-20) — every two to three days, with a
Keep-a-Changelog **CHANGELOG of 2,692 lines**.

### The schematic capability, which is the real thing

VERIFIED: a dedicated crate, `crates/pcb-kicad-sch/`, whose source files are

```
analysis.rs  component_slots.rs  compose.rs  connectivity/  cut.rs
field_autoplace.rs  hierarchy.rs  identity.rs  kicad.rs  model.rs
net_symbols.rs  placement.rs  project.rs  reconcile.rs  repair.rs
root_interface.rs  sheet_placements.rs  source.rs  symbol.rs
```

The command is **`pcb apply schematic <file.zen>`** — VERIFIED from
`crates/pcbc/src/apply.rs`: `#[command(about = "Apply a Zener design to its
linked KiCad project")]`, with `Schematic` and `Layout` subcommands, calling
`apply_linked_schematic(&design.schematic)` then
`pcb_kicad::open_eeschema(&result.root_schematic)`.

Selected CHANGELOG entries, verbatim and VERIFIED, because this is where the
capability becomes legible:

- *"`pcb apply schematic` reconciles a linked KiCad schematic with its design,
  planning and applying per-issue repairs."*
- *"**`.kicad_sch` files match KiCad 10's output, so KiCad saves no longer
  rewrite them.**"* — byte-level fidelity to KiCad's own writer, which is a
  serious engineering commitment and the thing that makes diffs readable.
- *"Place generated schematic net symbols outside full component geometry in
  **deterministic wired staircases**, sharing one symbol only across adjacent
  same-net pins and reserving the routed staircase during component packing."*
- *"Improve generated schematic placement and **repair connectivity issues with
  minimal verified edits instead of regenerating the affected nets**."*
- *"`pcb apply schematic` grows new sheets up to A0."*
- *"Interpret KiCad schematic bus connectivity, including vectors, groups,
  aliases, and hierarchical buses, while preserving buses during `pcb apply`."*
- *"Preserve sheet graphics and text annotations when updating KiCad
  schematics."*
- *"Wire rotated and mirrored schematic symbol pins at KiCad's physical pin
  anchors."*
- *"Support KiCad 9 schematics, saving edited pages as KiCad 10."*
- *"`pcb apply schematic` removes obsolete generated module sheets… **while
  preserving live and user-organized sheets**."*

**That last cluster is the hard part of the problem**, and it is the one SKiDL
issue #316 asked about and got no answer to: a human rearranges the generated
sheet and the generator must not stomp it. **Diode has built the reconciliation
path, not a one-shot emitter.** On this axis they are ahead of everything else
in this survey, including this repository.

### Agent surface: a CLI plus Claude Code skills — and they deleted their MCP server

VERIFIED command modules in `crates/pcbc/src/`: `apply`, `bom`, `build`,
`bundle`, `dfm`, `drc`, `fmt`, `freerouting`, `gerber`, `gltf`, `import`,
`info`, `inspect`, `ipc2581`, `layout`, `list`, `lsp`, `migrate`, `mod`, `new`,
`open`, `publish`, `quote`, `release`, `resolve`, `sim`, `step`, `test`,
`update`, `vendor`.

**Five first-party Claude Code skills ship in the repo** at `skills/`:
`zener-language`, `importing-kicad-projects`, `librarian`, `registry-search`,
`spice-sim`. VERIFIED, and worth reading as craft examples — `zener-language/SKILL.md`
says *"For CLI behavior, use the installed command's `--help`; **do not invent or
infer subcommands or flags**"* and *"The selected symbol is the authority for its
footprint, part identity, datasheet, and pins."*

CI auth is documented: `pcb auth login --service-account --stdin <
credentials.json` with `DIODE_API_URL` / `DIODE_CLIENT_ID` /
`DIODE_CLIENT_SECRET`, plus a GitHub Action at `diodeinc/pcb-action`.

**A real but undocumented REST API exists.** VERIFIED: `api.diode.computer`
returns a structured Fastify 404 while `/openapi.json`, `/docs` and
`/documentation/json` all 404 — a live API with no published reference. Routes
read from source include `/api/boms/match`, `/api/quotes` and a remote sandbox
(`/exec`, `/fs/read`, `/fs/write`).

**And they built an MCP server and deleted it.** VERIFIED, CHANGELOG v0.3.72,
2026-04-27: *"Removed the hidden `pcb mcp` command and deleted the `pcb-mcp` /
`rquickjs` integration from the workspace."* Earlier entries show it had been
substantial — `pcb mcp eval`, `execute_tools`, `resolve_datasheet`,
`search_registry`, `run_layout`, a `zener-docs` resource. All consolidated into
the CLI and skills. See [the two retreats](#the-mcp-ecosystem-and-the-two-retreats-that-matter-more-than-the-ecosystem) below.

### KiCad interop, precisely — and a widely-repeated claim corrected

**Import is KiCad-only.** VERIFIED from `crates/pcbc/src/import/README.md`:
`pcb import <design.kicad_sch|project.kicad_pro> <output-directory>`, a
nine-phase pipeline running ERC, DRC and schematic/PCB **parity** checks,
mapping KiCad sheets to Zener modules and classifying power/ground nets from
native power symbols. Notably: *"Connectivity follows the schematic even when
the PCB is out of sync… Source ERC, DRC, and schematic/PCB parity findings are
**reported, not import blockers**."*

**Export:** `pcb apply schematic` → `.kicad_sch` + `.kicad_pro`; `pcb layout` →
`.kicad_pcb`; plus `pcb gerber`, `pcb ipc2581`, `pcb step`, `pcb gltf`, ODB++,
`pcb bom`, `pcb sim`, and `pcb publish --netlist-dir` for JSON netlists.

**The correction, and it is worth carrying:** multiple roundups state Diode
"exports to KiCad and Altium" or "KiCad, Altium and Cadence". **VERIFIED false
from the code** — `crates/pcb-eda/` contains exactly one backend directory,
`kicad`. The only Altium mention in 2,692 CHANGELOG lines is *"`pcb import`
handles more KiCad projects, **including Altium conversions**"* — meaning KiCad
projects that KiCad's own importer already converted. Interchange with
Altium or Cadence happens, if at all, through **manufacturing** formats. **Do
not repeat the "exports to Altium" claim.**

**Hard dependency:** **KiCad 10.x is required** for layout (`pcb build` is not).
Windows is experimental, WSL2 recommended.

### Maturity, funding, and two honest caveats

VERIFIED: YC **Summer 2024**, founded 2024 by Davide Asnaghi and Lenny Khazan,
Brooklyn Navy Yard, YC status Active, team size 10, hiring. Series A led by
**Andreessen Horowitz**, announced **2025-07-23**. **The $11.4M figure is
RELAYED** — neither a16z's own post nor Diode's states an amount.

**The Anthropic partnership is real and narrower than the hype.** VERIFIED that
Diode's post (2025-12-12) links to Anthropic's own at
`claude.com/blog/making-claude-a-better-electrical-engineer`, and that it was a
**training** partnership whose gains went into Claude Sonnet 4.5 and later
models, **not a product release**. Anthropic states *"Claude Sonnet 4.5's
reference designs were preferred by Diode's electrical engineers 8 out of 10
times."* The *"roughly 250 reference designs in two weeks"* claim is
first-party and **could not be verified** — `zener.diode.computer` is a JS SPA
and the API exposes no public registry route.

**Docs lag the code badly.** VERIFIED: `docs.pcb.new/llms.txt` lists **four
pages**, and **there is no documentation page for `pcb apply schematic`** — the
most interesting command in the tool. The CHANGELOG and `--help` are the real
reference. Budget for reading source.

### The one place this repository appears to be ahead, and it should keep it

**VERIFIED by grepping all 2,692 CHANGELOG lines for `hairpin`, `crossing`,
`legib`, `readab`: nothing.** Diode's legibility machinery is a staircase and
packing heuristic plus `placement.rs: pub fn off_page_warnings` ("one warning
per page whose symbols extend past its paper"). Their own claim about the
readable artifact is modest: *"When needed, the code renders directly into
graphical schematics, so engineers can always see the visual representation they
expect"* — and there is **no `pcb schematic render` command**; the readable
artifact is the `.kicad_sch` opened in eeschema.

**So a well-funded, a16z-backed, Anthropic-partnered team shipping every two
days has no published equivalent of `bun run tools/schgen/board-geometry.ts`
(crossings, corners, fallbacks) or `board-sheets.ts` (what draws and what
refuses).** On the evidence, `CLAUDE.md`'s rule that *"a measurement goes in a
tool or a test that re-runs it"* is not merely hygiene — **it is the one axis
where this repository has an instrument nobody else in this survey publishes.**

**Read `crates/pcb-kicad-sch/` before extending `lib/schgen/`.** It is MIT, it
is the closest prior art that exists, and its CHANGELOG is a record of which
problems in this space are real.

---

## Quilter.ai — a verified negative, by stated policy

`https://www.quilter.ai` · `https://docs.quilter.ai`

The brief asked whether Quilter touches schematics at all. **It does not, and
that is policy rather than a gap** — the cleanest verified answer in the survey.

VERIFIED, verbatim from `docs.quilter.ai/about-quilter/what-quilter-isnt.md`:

> *"Quilter is a design agent, not a 'copilot'. … **If you're looking for a tool
> that can generate, review, apply, or discard arbitrary blocks of schematic or
> layout, Quilter isn't for you.**"*

> *"Quilter is an implementer, not a proofreader. … Quilter doesn't check
> schematic logic or design intent beyond what you specify."*

And it delegates schematic work back to you: *"we rely on your tool to handle
tasks like: Updating board files; **Modifying or annotating schematics**…"*
Also *"Quilter is a submission and review interface, **not a CAD tool**."*

**What it strictly requires as input** (VERIFIED) tells you the division of
labour: **you** draw the board outline (*"Quilter can't define or resize the
board outline for you"* — `Edge.cuts` in KiCad), **you** pre-load footprints
(*"Quilter doesn't manage your component footprints"*), **you** supply a valid
netlist matching the schematic, and **you** should pre-place connectors, with a
candid warning that otherwise *"your USB connector [ends] up in the center of
your board."*

**No agent surface at all.** VERIFIED: no API, CLI, SDK or MCP server. Their own
GitBook agent-query endpoint answers *"there's no documented, supported
programmatic path for an autonomous agent to submit a job and retrieve its
results,"* and the full ~60-page doc index has no API, developer or auth
section. A nice irony: their docs are unusually agent-*readable* — every page
has a `.md` twin — so an agent can read Quilter's docs programmatically and
cannot use Quilter programmatically.

**A trap:** `github.com/api-evangelist/quilter` looks like API documentation and
is not. Its own README says *"This is not our API… an independent, third-party
profile"* and it is a stub with zero endpoints.

**Two corrections to the brief's assumptions**, both VERIFIED:

- **Pricing is not per-board credits.** From `quilter.ai/pricing`: *"Pay per
  Project. Not per Seat"*, and the cost is set by the number of **unrouted pins
  at upload** — pre-routed sections do not count. **No dollar figures are
  published anywhere**; the CTAs are "Talk to Sales."
- **KiCad and Altium are native**; Cadence Allegro and Siemens Xpedition go
  through **a Quilter-supplied exporter script to IPC-2581**. Layouts come back
  in the format sent. **Exact file extensions are never published** — their own
  docs query confirms *"the exact accepted suffix is not listed."*

**The warning worth carrying:** VERIFIED via their docs query — **free-tier
inputs may be used for training.** *"Quilter's FAQ says those terms permit
training on users' direct inputs and synthetic training data generated from
them… paying-customer designs… are not used for training. Don't submit designs
to the free tier if you need that training exclusion."* A free non-commercial
tier is self-serve; commercial is enterprise sales-led.

RELAYED funding: $10M Series A Feb 2024 (Benchmark), $25M Series B 2025-10-07
(Index Ventures), **~$40M total**. One third-party write-up reportedly headlined
"$25 Billion" — ignore it. A circulating free-tier eligibility figure of "fewer
than 10 people and under $50K revenue" is **RELAYED and absent from Quilter's
own docs.**

---

## "Zener" — not a company. A clean negative worth recording

The brief listed Zener as an AI-hardware startup. **There is no such company**,
and the confusion has a specific cause worth naming.

VERIFIED:

- **Zener is Diode Computers' Starlark-based hardware description language**,
  named after the diode, MIT-licensed inside `github.com/diodeinc/pcb`, with
  reference designs at `zener.diode.computer`.
- `zener.tech` → HTTP 307 → **a GoDaddy for-sale parking page**.
- `zener.ai` → HTTP 200 with an **empty body**. No product, no EDA content.
- No AI-hardware or EDA company named Zener appears in YC's directory or in any
  reachable coverage. Other "Zener" entities are unrelated (RELAYED): a Spanish
  renewable-energy firm, a Nepalese 3D-printing shop, an Oslo distributor.

**If a source calls Zener an AI EDA startup, it mistook Diode's language for a
company.** Recorded so the question is not re-asked.

Same category, same treatment: **"Fabrik" does not exist** as an AI hardware
startup — VERIFIED, four of seven candidate domains are identical 114-byte
parking stubs. And **PrimisAI is now ChipNexus**; `primisai.com` is listed for
sale, so anyone citing "PrimisAI" in late 2026 is using a dead name.

---

## Circuit Mind — the best public evidence that generated schematics are buildable-from, and the best public evidence of the ceiling

`https://www.circuitmind.io`

Three products (RELAYED via a delegated researcher): **ACE**, where you author
an architecture **block diagram in their web app** — not a prompt, not a netlist
— and it emits schematic, BOM, ICD, derating and power analysis; **AVE**, an
agentic verification engine reviewing an *existing* schematic against datasheets
and your own checklists, **launched 2026-10-28, the day of this survey**; and
**ELIXIR** for library generation. **It does not do PCB layout.**

**No agent surface.** VERIFIED: no REST API, CLI, MCP, SDK or package. The app
302s to an OIDC wall (Django OAuth Toolkit shape); `/api/schema/` is also behind
it. **Zero public GitHub repos, zero npm packages.** Enterprise sales only —
every CTA is "Book a demo", no self-serve, no published pricing.

**No KiCad interoperability whatsoever.** VERIFIED negative: KiCad appears
nowhere on their site or in their technical material. Every export list names
only Altium, OrCAD, Siemens Xpedition and System Capture — no `.kicad_sch`, no
EDIF, IPC-2581, ODB++, Gerber or `.net`. **For this repository that is a hard
disqualifier.**

### Why it is still the most valuable entry in this section

**The primary source is not Circuit Mind marketing. It is a Los Alamos National
Laboratory public-release report** — LA-UR-25-30842 Rev.1, *"AI Assisted PCB
Design to Increase Productivity and Efficiency"*, Love & Mu, issued
**2025-11-14** (LANL-authored, hosted on Circuit Mind's HubSpot, so it is also a
marketing asset — weigh accordingly). Verbatim:

> *"Circuit Mind's schematic generation capability enables the design to be
> organized across multiple schematic pages for improved readability. It
> connects components through ports and net labels, while ensuring selected
> components are compatible and meet design requirements. The tool automatically
> incorporates decoupling capacitors according to component datasheets,
> specifies no-connects, and adds regulators where needed."*

Its figures show multi-sheet drawings with placed symbols, drawn wires,
hierarchical sheets (Main / Connectors / Power / RTC / Microcontroller / Memory
/ Peripherals), inter-sheet ports, net labels and reference designators. **That
is a schematic an engineer works from — the first such public evidence in this
survey.**

**And the same document records the failure mode, which is the more useful
half.** This is the quantified honest ceiling that nothing else in the survey
provides:

| Design | Setup | Solve | Manual | Total | "Completion" |
| --- | --- | --- | --- | --- | --- |
| Medium | 35 min | 8 min | 3.5 h | **4 h 13 min** | **90%** |
| High (FPGA) | 1 h | 25 min | **~80 h** | **~80 h** | **50%** |

Real defects found in review: *"LED in-series resistor values need to be
calculated manually"*; *"Micro AB connector 5V rail (VBUS) not connected"*; an
unconnected exposed pad on a load switch; no magnetics on the Ethernet
connector; a duplicated 10k pullup; IO expander signals unconnected. Parts
**outside** their curated database become *"virtual blocks"* that *"only provide
net names as placeholders and do not include reference designators or pin
descriptors."* And *"the Circuit Mind platform does not support FPGAs."* The
high-difficulty figure is described as *"a wall of bus-stub lines"* that reads
poorly at page scale.

**That is the shape of the entire category, stated in someone else's numbers:
inside a curated parts database it genuinely draws; outside it, the savings go
to roughly zero.** A valve EQ with rotary-selected capacitor banks is firmly
outside any vendor's curated database.

**Alive and funded.** VERIFIED from Companies House: CIRCUIT MIND LIMITED, no.
11389569, incorporated 2018-05-30, **Active**, latest filing **2026-10-14**
(share allotment to Circuit Mind Inc., a US-parent flip). 32 staff, 8 open
roles. RELAYED: **$25M announced 2026-10-28** — $18.5M Series A led by Norwest
plus a previously unannounced seed; $33.4M total.

---

## CELUS — an official MCP server, `.kicad_sch` export, and a seam that blocks headless use

`https://www.celus.io`

**Name-collision warning first, and it is a real trap.** VERIFIED: `celus.net`
is a **completely different company** — library e-resource usage statistics —
and *it* has a public REST API. **If you see "CELUS has a REST API", it is
almost certainly that one.**

Browser-only SaaS. The flow (RELAYED): a **Design Assistant** turns a prompt or
sketch into functional blocks on a canvas; **CUBO™** is their unit of reuse —
*"a well-defined application of an electronic component"*, a parameterised
sub-circuit with declared interfaces and ports; **Find Solutions** resolves each
block to a concrete CUBO and MPNs, validating port compatibility; then one
click gives a wired schematic plus BOM plus an EDA package.

**CUBO is conceptually close to this repository's `include(prefix, network,
portMap)`** — a reusable sub-circuit with declared ports and no implicit global
nets. Worth noting as independent convergence on the composition model.

**It has an official MCP server, and this is the only hosted schematic
generator in the survey that does.** VERIFIED from
`celus.io/knowledge/claude-connector`:

- Endpoint **`https://app.celus.io/mcp-servers/celus-design-studio/mcp`**, OAuth
  via CELUS sign-in, account required.
- Tool areas: requirements management; project create/open/clone; reference-design
  search; **block-diagram and canvas editing** (add/change/remove blocks and
  connections); **run Find Solutions**; design-issue identification; **CUBO
  library search, compare, lock/unlock per block**; component and datasheet
  lookup; alternates; Design Assistant.
- Output, verbatim: Claude can *"Generate and read the schematic PDF, the BOM
  spreadsheet and the CAD project package."*
- Execution model, and it is the right one: *"Tools that only read… run straight
  away. Anything that changes a project… asks for your confirmation before it
  runs."*

**The hard seam, verbatim and VERIFIED:** *"Download links for output files are
single-use and only work in a browser where you are signed in to CELUS as the
same user."* **So an agent can drive the design and read the schematic PDF, but
pulling the `.kicad_sch` ZIP to disk headlessly is blocked.** That is their
documented limitation, not a measurement — nobody tested it.

**Export, with exact extensions** (VERIFIED from `celus.io/knowledge/output-files`):
the KiCad package is a ZIP with **`.kicad_pro`**, **`.kicad_sch`** (hierarchical,
**one sheet per CUBO**, symbols and footprints pre-attached) and
**`.kicad_wks`** (page layout and title block). Altium gets
`.PrjPcb`/`.SchDoc`/`.PcbDoc`; Eagle `.sch`; OrCAD X XML in beta. **Explicitly
absent: `.kicad_pcb`, `.kicad_sym`, `.kicad_mod`, `.net`, Gerber, IPC-2581,
ODB++, EDIF, STEP.** And **PCB layout is not generated** — verbatim: *"Now it is
time for you to place components on the PCB board, do the routing and finish the
layout."*

**An unresolved contradiction, flagged rather than papered over.** Three CELUS
sources disagree about PCB files: `output-files` lists `.PcbDoc` for Altium but
**no `.kicad_pcb`**; a 2024 news post says the KiCad integration gives *"a
complete PCB Project package"*; and the homepage claims designs open *"straight
in Altium, Cadence, Siemens, Fusion or KiCad"* — **but Cadence and Siemens are
not in the output list at all.** The homepage over-claims relative to the docs.
**Test it on a free account rather than trusting either.**

**Two risk signals.** VERIFIED: the free **Community Account** makes **all
projects and content public**, and CELUS *"reserves the right to… partly or
fully phase out the Community Account without replacement"* — so **if any work
must stay private the free tier is unusable.** AI Credits are metered and
*"shall lapse without compensation"* on termination. And RELAYED: **no disclosed
funding round since July 2022** (€25M Series A led by Earlybird; formerly named
**Contunity**) — over four years, which for a venture-backed EDA company is a
real signal, though release notes through 2026-10-14 and a CELUS platform
embedded on NXP.com in September 2026 argue against imminent death. **Recorded as
not-found rather than confirmed-absent.**

**A business-model observation worth internalising:** nearly every 2026 CELUS
announcement is a **component-manufacturer partnership** (NXP, RECOM, BrainChip,
Alif, Variscite). They monetise substantially as a **design-in and
demand-generation channel for chip vendors** — good for free-tier survival,
**bad for the neutrality of part recommendations.**

---

## AllSpice.io — a real agent surface, and an inconsistency to flag hard

`https://allspice.io`. A Gitea-fork hardware git and review platform — the
strongest *ops* surface in the survey, and **not a generator**.

RELAYED via a delegated researcher: a REST API, the **`py-allspice` SDK (4.3.0,
MIT, 2026-09-30)**, GitHub-Actions-compatible CI, and webhooks. Its "DRCY AI"
review product is shipping (docs updated 2026-10-23) and states it uses Claude
via AWS Bedrock and *"We do not fine-tune on customer data."* **From
$34,800/yr**, enterprise only, no commercial free tier.

**The inconsistency, and it decides whether this is useful here:** the Hub
reportedly parses **`.kicad_sch`, `.kicad_pcb` and `.kicad_sym` as "Stable"** —
**but the SDK's `SupportedTool` enum contains only ALTIUM, ORCAD,
SYSTEM_CAPTURE, DEHDL and DXDESIGNER, and `grep -i kicad` across `py-allspice`
returns zero matches.** So the web product claims KiCad support that the
programmatic surface does not expose. **Anyone planning to drive AllSpice over
its API for KiCad work should test that before committing.**

---

## The MCP ecosystem, and the two retreats that matter more than the ecosystem

The brief asked whether EDA MCP servers exist. **They do — more than two dozen,
and the ecosystem is crowded and young.** But the two most informative entries
are projects that **withdrew**, and their reasoning is the most strategically
important finding in this survey.

### Retreat 1: a KiCad MCP server went to maintenance mode after losing to plain Claude Code

**`ProductOfAmerica/mcp-server-kicad`** — 15 stars, GPL-3.0, PyPI v0.21.1,
**109 tools**, listed in the official MCP registry. It went to **maintenance
mode in October 2026** and published why. RELAYED via a delegated researcher,
and the numbers are specific: a head-to-head against plain Claude Code with
KiCad installed, same model, judged by KiCad 10 itself —

> **"Six single edits… three runs each. Plain Claude Code got all 18 right.
> With the plugin, 3 of 18 were right."**

A 20-edit session: both correct, but the plugin used about **1.8× the context**.
Three diagnosed causes: some edits had no corresponding tool; **its own
instructions forbade direct file edits, so the model stopped and asked**; and
its board-sync tool rewrote nearly every footprint, so the model **undid its own
work**. Its recommendation: *"a coding agent such as Claude Code, with KiCad
installed. Ask it to check its changes with `kicad-cli`."*

**Carry the author's caveats with the number:** *"small tests on one design, not
a verdict"*, and the test material is unpublished — **n=1 and
unreproducible.** It is an anecdote with arithmetic, not a study.

### Retreat 2: Diode deleted its MCP server and consolidated into CLI plus skills

Covered above — CHANGELOG v0.3.72, 2026-04-27. **Two independent teams, working
on the same problem, concluded that wrapping EDA operations in MCP tools did not
pay, and both ended up recommending the same thing: the agent edits the files
and verifies with `kicad-cli`.**

**That is what this repository already does.** The convergence is real even
though neither datum is rigorous, and it is a reason to be skeptical of any
proposal to wrap `lib/schgen/` in an MCP server. **Read both before anyone
makes that proposal.**

### Retreat 3: the largest one went closed-source

**`mixelpixx/Konnect`** — 1,432 stars, AGPL, Rust, 217 tools — was
**archived 2026-10-25**, and its successor `Orchis-ai-LLC/Konnect-EDA` is
**commercial, closed-source, with zero releases** (created 2026-10-24).
RELAYED. A third cautionary tale about building on this ecosystem.

### The ecosystem, with the entries that matter here

RELAYED via `gh api` on 2026-10-28 by a delegated researcher; star counts and
dates are transcriptions and will drift.

| Stars | Repo | Pushed | Licence | Why it matters |
| --- | --- | --- | --- | --- |
| 3,002 | `mixelpixx/KiCAD-MCP-Server` | 10-26 | MIT | 247 tools, including **65 schematic tools** "(authoring, batch edits, hierarchy, layout)". **Not in the official registry** |
| 289 | `salitronic/eda-agent` | 10-28 | Apache-2.0 | Altium-first, ~600 tools over a DelphiScript bridge into a live session. Its own warning: *"Experimental… Some can crash the Altium DelphiScript engine"* |
| 174 | `Seeed-Studio/kicad-mcp-server` | 10-22 | **none** | Analysis-first; writes are primitive (`add_wire`, `add_label`) with **no placement engine**. **No licence file** — correcting this document's earlier "MIT" relay |
| 160 | `oaslananka/kicad-mcp-pro` | 10-28 | MIT | **The most rigorous.** PyPI and npm, a Zenodo DOI, OpenSSF badges, a published *"KiCad programmatic parity 85.7%"*, progressive-disclosure profiles. Admirably honest that its SI/PI/EMC/thermal are *"first-order, closed-form estimates… not a substitute for a field solver"*, and its task-outcome evidence *"intentionally reports `insufficient_evidence`"* |
| 127 | `tangency-labs/pcbcraft` | 10-20 | GPL-3.0 | *"MCP-first Rust EDA"*, 44 tools, stable IDs, revision guards. **Created 2026-10-12 — sixteen days old.** Honest: *"not a KiCad replacement yet"* |
| 67 | `Cognitohazard/ltspice-mcp` | 10-27 | GPL-3.0 | **Edits LTspice `.asc` schematics** and returns named measurements (cutoff, overshoot, phase margin). One of very few MCP servers touching a real schematic *drawing* format |
| 56 | `IntelligentElectron/universal-netlist` | 10-28 | Apache-2.0 | **The best cross-vendor schematic reader found**: OrCAD `.DSN` binary, Altium `.SchDoc`, KiCad v6–10 **with no KiCad install**, into an open `.netlist.json` schema |
| **27** | **`blwfish/kicad-mcp`** | **10-28** | MIT | **Low stars, high quality, and the closest thing to a schematic-placement scorer anyone has published.** 18 tools including **`schematic_layout` ("topology-aware schematic placement")**, `suggest_placement`, and **`analyze_placement_telemetry` ("placement quality scoring")**; 2,000+ tests; Freerouting pinned with measured reasoning |

**`blwfish/kicad-mcp` is the one to look at**, for the same reason Diode's
changelog gap matters: a **placement quality score** is the instrument this
whole category lacks, and a 27-star project has one. Unverified beyond the tool
list — nobody ran it.

Also noted: `lamaalrajih/kicad-mcp` (531 stars) is **stale ~12 months**;
`circuit-synth/kicad-sch-api` (57) ~11 months idle;
`Finerestaurant/kicad-mcp-python` (41) ~15 months stale and built on the
official IPC API. In the official MCP registry: `ProductOfAmerica/mcp-server-kicad`,
`oaslananka/kicad-mcp-pro`, `embedded-society/altium-designer-mcp`, and
**`com.pcbeditor/pcbeditor`** (registered 2026-10-28, remote streamable-HTTP at
`https://mcp.pcbeditor.com/mcp`, 16 tools, claiming parts/schematic/placement/autorouting
plus KiCad import-export, free account) — a hosted commercial entrant worth one
look. **The 3,002-star server and Seeed's are not registered**, so the registry
is not an index of the ecosystem.

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
MIT, Python. RELAYED from a README fetch: 174 stars, 96 commits, active. This is
the most directly relevant MCP server found, and the most honest about its
limits.

It exposes two tiers. **Analysis, read-only and solid:** component and net
listing, symbol search, hierarchy inspection, footprint and track analysis,
pin-level connection tracing, ERC/DRC via `kicad-cli`, pin-conflict detection.
**Editing, explicitly experimental:** `add_component_from_library`, `add_wire`,
`add_label`, `create_kicad_project`, `setup_pcb_layout`, `export_gerber`.

Its README caveat is the quotable one, and it is the fourth independent
confirmation of this survey's headline finding: *"Schematic editing is
**experimental**. KiCad has no Python API for schematic editing, so tools use
manual S-expression manipulation."* It recommends the GUI for design work and
itself for analysis.

Architecturally it uses three channels, which is itself informative about what is
possible: `pcbnew` when installed into KiCad's bundled Python (full PCB
analysis), `kicad-cli` headless for ERC/DRC, and raw s-expression parsing for
schematic editing and as a PCB fallback. Without the Python setup it degrades to
text parsing and *"you get basic data (track counts, net names, widths) but lose
precise lengths, design rules, and signal integrity analysis"* — a degradation
the README at least names.

**Why it matters here:** `add_wire` and `add_label` over an MCP interface is the
nearest thing found to "an agent draws a schematic in KiCad." It is experimental
and it is s-expression manipulation underneath, so it offers no capability
`kicadts` does not, and `kicadts` is typed. Its genuine value is the
**read/analysis half**: an agent-facing way to interrogate an existing
`.kicad_sch` and run ERC, which is the reviewing side of the loop rather than the
producing side. Not installed or run — **output quality UNVERIFIED**.

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
2. **All four delegated reports landed and are folded in.** Every item in the
   brief is now covered. What is NOT covered is below.
3. **All three incumbent EDA vendors actively block automated fetching, so
   their AI features are unassessed.** VERIFIED as blocked: Cadence's
   Allegro X AI page returns **403** to WebFetch, `curl` *and* a
   text-extraction proxy; Altium's `/altium-ai`, `/ai`, `/solutions/ai` and
   `/newsroom` all **404**. Siemens was not attempted. **This needs a browser
   or a fresh search budget, not more `curl`.** Two tangential verified
   signals: AllSpice lists Cadence Allegro X schematics and `.brd` as "Stable"
   parse targets, and JITX green-checks Siemens Xpedition on its Enterprise
   tier. **DeepPCB** is likewise a gap — it appeared only as a competitor named
   in Quilter's own comparison blog and in roundups; `deeppcb.ai` was never
   fetched, so **nothing about it here is verified.** **EasyEDA Pro's Extension
   API** is a gap too: two MCP servers describe themselves as built on JLCEDA's
   *"official Run API Gateway"*, which implies a real automation API, but
   JLCEDA's own docs were not read.
4. **`_schDirectLineRoutingEnabled` was resolved, and against the earlier
   decision** — see that section. What remains open is the *consequence*:
   nobody has run a circuit with the flag set and looked at the geometry
   `DirectLineRouter` produces on an analog sheet. That is a one-hour
   experiment and the highest-value open item on the tscircuit question.
5. **Whether `_isChipToChipConnection()` was added to the failure condition
   since September** is undetermined — the shallow clone has no history. A full
   clone and `git log -L` on that hunk would settle it.
6. **`kicadts` format-version currency against KiCad 10 is RESOLVED** — a
   companion pass parsed this repository's own `pt2399-core.kicad_sch`
   (`version 20260306`, generator `10.0`) with it and every check passed. This
   document's earlier doubt rested on a README example showing
   `version: 20240101`, which was the wrong thing to read. What remains open
   are the **two sharp edges** that companion names and this survey did not
   look for.
7. **Koppar's, ProtoFlow's, CELUS's, Flux's and Diode's schematic output
   quality** is unverified in every case. No account was created, no app
   installed, no generated `.kicad_sch` from any commercial or hosted tool has
   been read. **Nobody in any of the four delegated passes verified that any of
   these tools produces a legible drawing** — which is precisely what
   `docs/schematic/false-greens.md` exists to catch, and it is wide open across
   the entire category.
8. **`tools.koppar.ai`'s netlist→schematic converter** claim could not be
   confirmed from the page.
9. **Two contradictions between delegated researchers are recorded unresolved
   rather than adjudicated.** (a) **JITX symbols**: one pass found a Python API
   for authoring symbols as `Pin(at=…)` plus `Polyline(…)` with Altium power-symbol
   mapping; another reported that *"All symbols use `BoxSymbol`"* and the
   schematic viewer is read-only. Both can be true — a custom-symbol API
   alongside box symbols by default — but **nobody rendered a JITX sheet**, so
   which one you get is unknown. (b) **Seeed's `kicad-mcp-server` licence**:
   recorded as MIT from one page fetch and as **no licence file** from a `gh
   api` check. **Prefer the `gh api` reading** and treat the licence as absent
   until a `LICENSE` file is seen.
10. **No tool was run BY THIS SURVEY** — everything here about output quality is
   relayed, inferred from code, or absent. **But several were run by this
   repository**, and those results supersede this document wherever they touch:
   see [READ THIS FIRST](#read-this-first-on-several-questions-this-repository-already-knows-more).
   What is genuinely unrun anywhere is the **commercial** tier — Koppar,
   ProtoFlow, Flux, JITX, copperhead. No account was created, no app installed,
   no generated `.kicad_sch` from any of them has been read.
11. **The four highest-value unrun experiments**, in order, each cheap:
    - **Point `pcb import` at one of this repository's existing `.kicad_sch`
      files and read what comes back.** It is MIT, free, offline, needs no
      account, and it is the only reconciliation implementation in existence.
      Reading `crates/pcb-kicad-sch/` costs nothing either.
    - **`kicad-cli sch export netlist` on a `lib/schgen/` output, compared
      against the model's netlist.** `make check` already runs `kicad-cli`. This
      is a gate, not a measurement, and it is the one three independent projects
      converged on. Carry Weave's caveat with it: a round trip certifies
      faithfulness to the netlist it was handed, not fidelity to intent.
    - **`_schDirectLineRoutingEnabled: true` on a tscircuit subcircuit**, to see
      what `DirectLineRouter` actually draws. One hour, and it settles the
      amendment this document says `docs/decisions/2026-09-21-why-not-tscircuit.md`
      needs.
    - **`circuit-json-to-kicad` fed hand-written Circuit JSON** for one small
      repo circuit, to test whether it is usable as a pure serializer without
      tscircuit core. The import graph says yes; nobody has tried.

---

## What this survey concludes for this repository

Stated as claims that can be tested, not as advice.

1. **One project can be driven by an agent to produce a KiCad schematic today,
   and it is `diodeinc/pcb`.** MIT, Rust, pushed the day of this survey, with a
   dedicated `pcb-kicad-sch` crate doing placement, net symbols, hierarchy and
   **minimal-edit reconciliation against a sheet a human has rearranged** —
   the problem SKiDL #316 asked about and nobody answered. Everything else
   fails one of the three tests: Koppar and Flux have the agent surface and no
   legibility evidence; Circuit Mind has the drawings and no KiCad and no API;
   CELUS has an MCP server and `.kicad_sch` but browser-bound download links;
   copperhead has the legibility checker and *"acceptance tests… have not been
   observed passing end to end"*; tscircuit has the maturity and the
   disqualifying silent degradation; ProtoFlow asserts a CLI and MCP nobody has
   confirmed; Quilter declines schematics by policy. **Nobody has verified that
   any of them draws a legible sheet, including Diode — and the one tool this
   repository did measure, `schematizer`, failed 9 times out of 9 on a
   Pultec.**
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
4. **The September tscircuit decision's conclusion is confirmed and widened; its
   reasoning is refuted.** The failure-path degradation is intact at HEAD and
   covers chip-to-chip as well, and it emits no error record in a system that
   emits `pcb_autorouting_error` freely for copper. A second degradation fires
   on *successful* routes above a complexity threshold, gated on
   `schTraceAutoLabelEnabled` and off by default. But
   `_schDirectLineRoutingEnabled` **does** reach core — zod strips it from
   `_parsedProps` and the call site reads raw `.props` — so there is an
   unsupported, untyped way to force wires that nobody has run.
   `docs/decisions/2026-09-21-why-not-tscircuit.md` needs amending.
5. **Everyone building this is converging on an intermediate representation that
   an LLM edits and a deterministic tool draws from.** atopile, JITX, Koppar
   (`edit_circuit` patching "your latest script"), Coppr (*"LLMs edit the IR, not
   the GUI"*), copperhead (`draft/ir.ts`), SchGen (relative placement plus
   pin-name wiring) and this repository (`Network`) are the same bet, made seven
   times independently. **The differentiator is not the IR. It is who holds the
   acceptance criteria** — and only two of the seven were found to have written
   them down as a gate the producer cannot author: copperhead's 13-family
   legibility checker, and Weave's net-by-net round-trip certificate.
6. **The one gate every serious project arrived at independently is a netlist
   round trip, and this repository is one command away from it.** Weave's binary
   connectivity certificate, `kicad-schematic-builder`'s `verify()`, and SKiDL
   issue #318 — where `kicad-cli sch export netlist` was the *only* thing that
   caught 6 of 11 nets silently vanishing from a valve triode's drawing — are
   three independent arrivals at the same check. `make check` already invokes
   `kicad-cli` on every board on every run. **`kicad-cli sch export netlist`
   compared against the model's netlist is a check that could have failed, is not
   authored by the producing agent, and is the single highest-value item in this
   survey.** Weave's framing is worth adopting verbatim: a **binary correctness
   certificate, not a similarity score.**
7. **Two architectural ideas are worth stealing, and neither package should be
   adopted.** Weave's pipeline — classify nets as ground/rail/signal, put only
   the **signal chain** into a layered ELK layout, handle feedback loops, divider
   legs, hanging shunts and supply corners as **placement patterns rather than
   graph nodes**, then climb a **safe-mode ladder** that switches patterns off
   one at a time and keeps the first result the verifier accepts. And JITX's
   schematic model, where "organize ports", "group merge/split" and "net
   merge/split" are **named, enumerable operations** — auditable in a way a
   monolithic "lay out the sheet" pass is not. `elkjs` is live on npm.
8. **Two practices this repository already holds were vindicated by someone
   else's failure.** atopile made its *build* depend on a vendor's live DNS
   record; `components.atopileapi.com` went NXDOMAIN for 19 days and **every
   release at or below 0.15.7 is still permanently unbuildable three months
   later**. Against that, treating KiCad as a local, required, compiler-like
   dependency is the correct call, not a limitation. And atopile's `--frozen`
   build — rebuild, diff ignoring UUIDs, **refuse with a markdown table of every
   changed path** — is *"regenerated every run and compared by content, never by
   timestamp"* implemented as a loud refusal, and is worth copying outright.
9. **The clearest statement of where this repository actually sits:** no analog
   schematic generator exists that is **simultaneously deterministic and emits
   `.kicad_sch`**. Weave is deterministic and certified and writes LTspice
   `.asc`. `schematizer` writes `.kicad_sch` and randomizes its layout by
   design, except in a mode that does no routing. Nobody preserves a layout
   across regeneration — SKiDL issue #316 asked on 2026-06-23 and has zero
   replies. That gap is not a market nobody noticed; it is a hard problem nobody
   has solved, and it is the one `lib/schgen/` is in.
   **And this repository has already proved the point empirically rather than
   by survey:** `schematizer`, the only automatic placer-and-router targeting
   `.kicad_sch`, **failed 9 times out of 9 on a Pultec-shaped passive section**,
   with the symbol vocabulary never the obstacle. The routing of a rotary
   selector fanning into a capacitor bank is the open problem, and no
   off-the-shelf tool solves it.
10. **The failure mode this survey kept finding is this repository's own named
    enemy, and it is everywhere.** tscircuit relabelling a failed route;
    tscircuit's `matchAdapt` stacking every component at the origin with *"not
    an error, not a warning"*; `nl2sch`'s `--skip-missing` dropping a component;
    SKiDL dropping 6 of 11 nets with *"no error or warning during
    generation"*; copperhead's own issue #233 reporting `lost=0 gained=0`
    through a 4× quality regression; atopile shipping a download button for a
    `.kicad_sch` the build never writes. Six independent instances of a tool
    reporting success while the artifact became wrong or unreadable.
    `docs/schematic/false-greens.md` is not a local curiosity — it is the
    central defect of this entire product category.

    **And the seventh instance is the one to keep, because it was measured here
    and it defeats the obvious gate.** `kiutils` round-trips a KiCad 10
    schematic, passes every check including `kicad-cli sch export svg` at exit
    0, and silently drops **192 `hide` flags and 259 `do_not_autoplace`
    flags**. Connectivity survives, so a netlist round trip would pass too. The
    artifact is wrecked and both available gates say fine. **Legibility loss and
    connectivity loss are different failures and need different checks** — which
    is the argument for copperhead's legibility checker existing *alongside*
    Weave's connectivity certificate rather than instead of it.

11. **Two independent teams built EDA MCP servers, measured them, and withdrew
    — and both landed on what this repository already does.**
    `ProductOfAmerica/mcp-server-kicad` (109 tools) went to maintenance mode
    publishing **18/18 correct for plain Claude Code versus 3/18 with the
    plugin**, and Diode deleted `pcb mcp` outright. Both now recommend "the
    agent edits the files and verifies with `kicad-cli`." **Carry the caveat
    with the number** — n=1, one unpublished design, an anecdote with
    arithmetic rather than a study. But it is a reason to be skeptical of any
    proposal to wrap `lib/schgen/` in an MCP server, and to read both write-ups
    first. A third data point in the same direction: the ecosystem's largest
    server, Konnect at 1,432 stars, was **archived 2026-10-25** and went
    closed-source.
12. **The category has no legibility instrument, and that is where this
    repository is plausibly ahead of a well-funded team.** Diode ships every
    two to three days with a16z money and an Anthropic training partnership,
    and grepping all 2,692 lines of its changelog for `hairpin`, `crossing`,
    `legib` and `readab` returns **nothing**; its legibility machinery is a
    packing heuristic plus an off-page warning. The only published
    placement-quality scorer found anywhere was `blwfish/kicad-mcp`'s
    `analyze_placement_telemetry`, in a **27-star** repository. Against that,
    `tools/schgen/board-geometry.ts` and `board-sheets.ts` are instruments
    nobody else publishes — which makes `CLAUDE.md`'s "a measurement goes in a
    tool that re-runs it" a competitive position and not merely hygiene.
13. **Circuit Mind's LANL report is the number to quote when anyone asks how
    close generated schematics are.** Not vendor marketing: a Los Alamos
    public-release report measuring their platform at **90% complete on a
    medium board after 3.5 h of manual work, and 50% complete on an FPGA board
    after ~80 h** — with parts outside the curated database degrading to
    *"virtual blocks [that] only provide net names as placeholders"*. **Inside a
    curated parts database these tools genuinely draw; outside it the savings
    go to roughly zero.** A valve EQ with rotary-selected capacitor banks is
    firmly outside every curated database in this survey.
14. **The strongest thing this survey can say in favour of the current
    direction is negative, and it should be read that way.** Nothing here is a
    tool to buy instead of building. The useful imports are a serializer
    (`kicadts`, measured against this repository's own file), a gate
    (`kicad-cli sch export netlist`, already a dependency), a layout idea
    (Weave's signal-chain-plus-patterns), an operation vocabulary (JITX's named
    schematic operations), a refusal pattern (atopile's `--frozen` diff), an
    architecture (copperhead's producer/drawer/gate split) and **a body of
    prior art to read before extending `lib/schgen/` (`crates/pcb-kicad-sch/`,
    MIT)**. Seven borrowings, no platform. **An agent that reads this survey and
    concludes there is a product to adopt has misread it.**
