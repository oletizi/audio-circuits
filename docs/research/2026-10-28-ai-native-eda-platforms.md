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
the `10.0` branch — so the protos ship, which is why this writer initially read
them as the shipped capability.

**A second measurement narrows it further, and the two together are stronger
than either.** KiCad's own developer documentation
(`https://dev-docs.kicad.org/en/apis-and-binding/ipc-api/for-addon-developers/`)
states: *"KiCad 9 and 10 only support IPC API plugins in the PCB Editor"* and
*"KiCad 11 adds support for plugins in the Schematic Editor."* (VERIFIED by a
delegated researcher via page fetch; quoted wording passed through a summarizer,
so treat the exact phrasing as approximate and the substance as confirmed.)

So the honest statement is: **the protos exist, the three commands are defined,
and the Schematic Editor does not host IPC plugins in 9 or 10 at all.** The
schematic API is scaffolding, not a surface. Schematic-editor plugin support is
slated for **KiCad 11**, which secondary sources put at roughly February 2027
(RELAYED, not confirmed). Either way the conclusion for today is the same and
the reconciliation matters only so a later reader does not "discover" the proto
directory and conclude the API is usable.

**A trap worth naming, VERIFIED by a delegated researcher via the GitHub API:**
`github.com/KiCad/kicad-python` is **archived**, `archived: true`, last commit
2022-01-09 with the message *"Add deprecation notice"*. The current
`kicad-python` on PyPI is the IPC bindings — a different thing with the same
name. Do not land on the GitHub repo and conclude the bindings are dead.

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

### `schematizer` — the only automatic netlist→`.kicad_sch` placer AND router

`https://github.com/devbisme/schematizer` · PyPI `schematizer`

**This is the find of the survey for this repository's actual problem.** It is
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

**Read Weave's pipeline and verifier design; do not adopt the package.** The
pattern-matching-around-a-layered-core idea and the safe-mode ladder port
directly to TypeScript — `elkjs` is live on npm (`0.12.1`, published
2026-10-28, VERIFIED).

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
| `kiutils` | Python | 129 | **2024-05-02** | PyPI `1.4.8`, 2024-02-02 | **Stale ~2.5 yr** |
| `kicad-skip` | Python | 230 | **2024-02-16** | PyPI `0.2.5`, 2024-02-16 | **Stale ~2.7 yr** |

`kiutils` and `kicad-skip` are *manipulation* libraries — typed s-expression
trees, no placement, no routing — and both have been untouched across KiCad
8 → 9 → 10. This independently corroborates the `kicadts` recommendation above:
it is the only maintained option, in the right language, and its weakness is
that its user base is essentially tscircuit itself.

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

### atopile, from this angle

VERIFIED by the delegated researcher: 4,026 stars, `pushed_at` 2026-10-14 but
**last commit on the default branch 2026-03-11** — about seven months, a
discrepancy worth noting, since development may have moved to branches.
RELAYED: atopile deliberately produces **no readable schematic**; it exports a
netlist and placement groupings to KiCad, ratsnest only. A third-party fork
(`just1jak/atopile`, 0 stars, last commit 2026-10-19) claims to save a real
`.kicad_sch` with symbols and nets derived from PCB pad assignments —
unverified, a personal fork, noted only to close the loop.

**Conclusion: atopile is not a source of schematic-generation capability.** A
dedicated researcher was also assigned to atopile and JITX; see
[Not closed](#not-closed) for whether that report arrived.

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
