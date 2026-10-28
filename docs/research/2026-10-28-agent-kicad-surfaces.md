# Agent/LLM tool-surfaces for KiCad schematic manipulation

**Survey date:** 2026-10-28
**Question:** what can an agent drive as a *tool* to read, place, move, wire and
inspect a `.kicad_sch`, rather than writing its own layout algorithm?

**Local environment all empirical claims were measured against:**

- KiCad **10.0.5** at `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`
- Test subject: `circuits/pt2399-core/pt2399-core.kicad_sch`, which is
  `(version 20260306) (generator_version "10.0")` — 40 symbols, 72 wires,
  16 junctions, 6 global labels, 8 library symbols, 5689 lines.

Every "PASS/FAIL" and every number below was produced by running the thing, not
by reading its README. Where I could not run it, the claim is labelled
**UNVERIFIED** and says why.

---

## The one-paragraph answer

**Nothing in the released KiCad toolchain lets an agent place a symbol or draw a
wire through an API.** The IPC API that replaced SWIG covers the PCB editor
only, in every released version; schematic support is merged on `master` for
KiCad 11 and is unreleased. Every "KiCad MCP server" is therefore doing
file-level s-expression editing behind an RPC hop — none is driving KiCad — so
the real question is never "MCP or library" but *whose s-expression editor*.

On that question: **`kicad-skip` (Python) and `kicadts` (TypeScript) both work on
KiCad 10 files and each has a different disqualifying-if-ignored gap**;
**`kiutils` silently destroys KiCad 10 data while `kicad-cli` still exits 0**;
and the most credible schematic editor found in any language is **`_cst.py`
inside `mcp-server-kicad`** — byte-preserving, zero third-party KiCad
dependencies, and the only project here claiming CI against KiCad 10.
`kicad-cli` supplies the verification half of a loop and is solid, with one
sharp caveat: its exit code proves loadability, not fidelity.

**And the most decision-relevant artifact in this survey is a negative result
published by one of the maintainers** — an A/B showing a 109-tool KiCad MCP
server losing badly to plain Claude Code with `kicad-cli` and no plugin. It is
the next section, because it reframes everything after it.

---

## 0. The maintainer who measured his own MCP server and stopped building it

`ProductOfAmerica/mcp-server-kicad` entered **maintenance mode in October 2026**
and its README says why, with numbers. Quoted verbatim from
https://github.com/ProductOfAmerica/mcp-server-kicad#why-maintenance-mode:

> "The plugin was built on one idea: KiCad files are large, so an AI assistant
> should change them through tools instead of editing the text. We tested that
> idea against plain Claude Code with KiCad installed and no plugin: the same
> model (Claude Opus 5.5), the same settings and the same tasks, each result
> judged by KiCad 10 itself (netlist, board, ERC and DRC)."
>
> - "**Six single edits** on a public KiCad 10 design (a value change,
>   do-not-populate, a footprint swap, pads assigned to a net, a footprint
>   rotation, a net renamed across sheets), three runs each. **Plain Claude Code
>   got all 18 right. With the plugin, 3 of 18 were right.**"
> - "**A long session of 20 board edits.** Both got every edit right, and the
>   plugin's sessions used about **1.8 times as much context**."
> - "**Why the plugin failed**, from reading every transcript: It had no tool for
>   some edits (a pad's net, the do-not-populate flag, swapping one footprint).
>   Its instructions told the model never to edit KiCad files directly, so the
>   model stopped and asked instead. Its board-sync tool rewrote almost every
>   footprint on the board, so the model undid its own work."
> - "**The premise did not hold in these tests.** Plain Claude Code changed a
>   2 MB board without reading it whole: it searched for the part and edited only
>   the lines it needed."
>
> "**What to use instead:** a coding agent such as Claude Code, with KiCad
> installed. Ask it to check its changes with `kicad-cli` (netlist export, ERC,
> DRC) before it finishes."

**Their own caveats, also verbatim:** *"These were small tests on one design, not
a verdict on every board or every model. They were enough to stop adding tools.
The test material is not published, because the design it used carries no
licence."*

**A scope limit they do not draw and this document must.** Five of the six
single edits and all twenty long-session edits are **modifications to an existing
design** — a value, a flag, a footprint, a pad net, a rename. **The A/B does not
test generating a schematic from nothing**, which is the harder half of this
repo's mandate and the half `lib/schgen/` exists for. So it is strong evidence
against the MCP-tool layer for *editing*, and silent on authoring.

**Why it matters here anyway.** The configuration that won is the one this repo
already has: a coding agent, KiCad installed, `kicad-cli` invoked on every board
on every `make check`, and circuits held as data. The failure modes it names are
also instructive in their own right — a tool surface with gaps makes a model
stop and ask rather than act, and a coarse sync tool can undo the model's own
work. Both are arguments for fine-grained, total coverage or none.

---

## 1. KiCad's own IPC API (`kicad-python` / `kipy`) — PCB only, today

**What it is.** The official protobuf-over-IPC client that replaces the SWIG
`pcbnew` bindings. Talks to a *running* KiCad; there is no offline/file mode.

- PyPI: `kicad-python` — latest **0.8.0, 2026-08-30**. Dev Status 5 (Production/Stable).
- Repo: https://gitlab.com/kicad/code/kicad-python
- Docs: https://docs.kicad.org/kicad-python/
- Install: `pip install kicad-python` (imports as `kipy`)

### The critical fact, verified three independent ways

**The released client ships schematic modules that do not even import.**

Measured by installing `kicad-python==0.8.0` into a clean venv and importing:

```
IMPORT OK   kipy
IMPORT OK   kipy.board
IMPORT FAIL kipy.schematic       -> ImportError: cannot import name 'PageSettings'
                                    from 'kipy.common_types'
IMPORT FAIL kipy.schematic_types -> ImportError: cannot import name 'BusEntryType'
                                    from 'kipy.proto.schematic.schematic_types_pb2'
KiCad.get_board      present: True
KiCad.get_schematic  present: False
wheel built against KiCad API: 10.0.6-0-gcaf7377e9c
```

Three corroborating lines of evidence:

1. **The wheel's own source.** `kipy/schematic.py` and `kipy/schematic_types.py`
   exist and look complete — `Schematic.create_items/get_items/update_items/
   remove_items`, `get_symbols/get_lines/get_labels/get_netlist/get_hierarchy`,
   commits, `SchematicSymbolInstance` with a settable `position`, `transform`,
   and `reference_field`/`value_field` (each a `SchematicField` whose `text`
   carries its own position), `SchematicLine` with settable `start`/`end`
   (= a wire), plus `Junction`, `NoConnectMarker`, `BusEntry`, `SchematicPin`,
   and all four label classes. **Every single `versionadded` marker in those two
   files reads `0.x.y (KiCad 11)`** — an unfilled template. By contrast
   `board.py`/`board_types.py` markers are concrete (`0.7.0 (KiCad 10.0.0)`,
   `0.8.0 (KiCad 10.0.6)`). There is **no `get_schematic()` accessor anywhere in
   0.8.0**, and nothing imports the `Schematic` class, so it is unreachable even
   if it loaded.
2. **KiCad's C++ server, from tagged source.** `eeschema/api/api_handler_sch.cpp`
   at tags `9.0.0` and `10.0.7` is ~10 KB / 303 lines and registers **one**
   handler, `GetOpenDocuments`. `deleteItemsInternal` is a `// TODO`;
   `getItemFromDocument` is a `// TODO` returning `std::nullopt`. No `GetItems`
   is registered for the schematic document type, and `eeschema/sch_symbol.cpp`
   at 10.0.7 contains **zero** `SCH_SYMBOL::Serialize`/`Deserialize` definitions
   (vs 4 on `master`). On `master` the same file is **116,704 bytes** and
   registers ~35 handlers including `GetItems`, `GetItemsById`,
   `GetSchematicNetlist`, `GetSchematicHierarchy` and **`PlaceSymbolFromLibrary`**.
   (Relayed from a delegated source audit, spot-checked by me against the wheel;
   I did not re-fetch every tag.)
3. **Official docs, verbatim** — https://dev-docs.kicad.org/en/apis-and-binding/ipc-api/for-addon-developers/index.html

   > "KiCad 9 and 10 only support IPC API plugins in the PCB Editor."
   > "KiCad 11 adds support for plugins in the Schematic Editor."
   > "The IPC API in KiCad 9 and 10 only supports communication with a running
   > instance of the KiCad GUI." / "Support for running in headless mode through
   > `kicad-cli` was added for KiCad 11."
   > "The IPC API in KiCad 9 and 10 has no support for plotting or exporting
   > files from KiCad designs." / "This support was added for KiCad 11 and up."

**Beware the published docs.** https://docs.kicad.org/kicad-python/ documents a
`Schematic` module and `get_schematic()`. **That site is built from `main`, not
from the PyPI release.** The `0.x.y (KiCad 11)` annotation is the tell. Reading
it will convince you the schematic API is available. It is not.

### Developer statements (verbatim)

Jon Evans (KiCad lead), devlist 2024-12-21, announcing the IPC API beta
(https://groups.google.com/a/kicad.org/g/devlist/c/2jOrNz9hd78):

> "The IPC API in 9.0 has focused on replicating the functionality currently
> available to SWIG action plugins. It does not add very many new features yet,
> and it does not yet support the schematic editor or library editors."

Jon Evans, devlist 2025-05-12, asked for an eeschema API roadmap
(https://groups.google.com/a/kicad.org/g/devlist/c/ViU9P2nvCEA):

> "The schematic editor is less stable in terms of internals and there are some
> important changes happening with regards to sheet storage."
> "we should not release any API until we can consider it stable to support, and
> it is harder to chase a moving target."

**The KiCad 9.0.0 release post promised this for 10 and it did not land:**

> "This interface will be extended to support the schematic editor during
> version 10 development."
> — https://www.kicad.org/blog/2025/02/Version-9.0.0-Released/

The KiCad 10.0.0 release post mentions no API at all, and every IPC change in
the 10.0.x point releases is board-side.

### Timeline

- KiCad 9.0.0: 2025-02. KiCad 10.0.0: 2026-03-20. **KiCad 10.0.7: 2026-10 (current stable).**
- **KiCad 11.0: unreleased.** GitLab milestone `11.0` is open at ~82% (218/264)
  **with no due date**; milestone `12.0` is scheduled 2027-02-01 → 2028-02-01.
- **UNVERIFIED:** a KiCad 11 release date. A search snippet said "around
  February 2027" and the cadence plus the 12.0 window is consistent, but I found
  **no primary statement**. Treat Feb 2027 as inference, not fact.

### Existence proof that the KiCad 11 path works

https://github.com/JaskoJacker/kicad-11-boardview-to-schematic — builds a
schematic from a boardview via the IPC API using `kicad-python` **0.9.0.dev0**
and `get_schematic()`, requiring **KiCad 11 nightly (internal 10.99)**. README
states "this project targets KiCad 11, which has not been released yet" and
warns the schematic API may break between builds. 0 stars, MIT. Notably its
README says *"The program does not draw wires: the technician does"* — it places
symbols and marks pins, and leaves wiring to a human. This both confirms
`get_schematic()` arrives in 0.9.0 (not 0.8.0, which I verified lacks it) and is
a caution about how much the new API actually does for you.

### SWIG `pcbnew`

Deprecated since 9.0, **still present in 9 and 10**, **removed on `master`**
(`pcbnew/python/swig/pcbnew.i` is HTTP 200 at tags `9.0.0` and `10.0.7`, 404 on
`master`). Confirmed locally: the KiCad 10.0.5 bundle ships
`site-packages/pcbnew.py` + `_pcbnew.so` under Python 3.9 — and **no eeschema or
schematic Python module of any kind**. There has never been a scripting API for
eeschema in any released KiCad version; dev-docs state "Python bindings are
provided for the PCB editor only at this time."

**Verdict for schematic layout: unusable today. Watch 0.9.0 + KiCad 11.**
It is, however, the only surface that will ever offer `PlaceSymbolFromLibrary`
and a real netlist/hierarchy query, so it is the right long-term target.

---

## 2. `kicad-cli` — the verification half of a loop, and it is solid

Verified against the local KiCad **10.0.5** binary.

```
kicad-cli sch {erc, export, upgrade}
kicad-cli sch export {bom, dxf, hpgl, netlist, pdf, ps, python-bom, svg}
kicad-cli sym export {svg}
kicad-cli jobset run
```

**What matters for a render-look-revise loop:**

- **`sch export svg`** — the one to use. Flags that matter: `--pages`,
  `-b/--black-and-white`, `-e/--exclude-drawing-sheet`, `-t/--theme`,
  `-n/--no-background-color`, and **`--draw-hop-over`** (draws hops at wire
  crossings — new in the 10 series, directly relevant to judging crossings).
- **`sch erc`** — `--format json`, `--severity-all`, and
  **`--exit-code-violations`** for a nonzero exit. This is a real gate. On my
  mutated file it correctly reported `label_dangling`,
  `unconnected_wire_endpoint`, and **`endpoint_off_grid`** — which is exactly the
  class of defect a programmatic placer introduces.
- **`sch export netlist`** — `--format kicadsexpr|kicadxml|spice|spicemodel|...`.
  The route to checking a generated sheet against a model.
- **`jobset run`** — batch several outputs from a `.kicad_jobset`.

**Gaps worth knowing:**

- **There is no `sch export png`.** `pcb render` does PNG/JPEG but only 3D PCB
  views. To get a raster a vision loop can look at, you rasterize the SVG or PDF
  yourself. Locally available: `rsvg-convert`, `magick`, `inkscape`, `pdftoppm`,
  `sips` (the repo currently uses none of them).
- `sch export hpgl` still exists although `pcb export hpgl` is "No longer
  supported as of KiCad 10.0".
- **`kicad-cli` cannot author or mutate a schematic.** `sch upgrade` rewrites
  the format version; that is the only write path, and it is not an edit.

**Serious caveat: `kicad-cli` exiting 0 is not evidence the file is right.**
See §5 — it rendered a file that had lost all 192 `hide` flags, happily, at
exit 0. It validates *loadability*, not fidelity.

---

## 3. `kicad-skip` — works on KiCad 10, perfect fidelity, cannot add a new part

- Repo: https://github.com/psychogenic/kicad-skip — 230 stars, 35 forks,
  **28 open issues**, LGPL-2.1
- PyPI: `kicad-skip` **0.2.5** — **the only release, 2024-02-16**
- **Last commit: 2024-02-16.** Branch pushes to 2024-05-26. **Dormant ~2.5 years.**
- Install: `pip install kicad-skip`
- Self-described as targeting "kicad 7+"

### Measured, against the KiCad 10 file

| Capability | Result |
| --- | --- |
| Load KiCad 10 `.kicad_sch` (v20260306) | **PASS** (with cosmetic `can't parsy` warnings) |
| Enumerate symbols by Reference | **PASS** — all 40 |
| Read symbol `.at` | **PASS** `[226.06, 93.98, 0]` |
| **Read absolute pin locations** | **PASS** `[('', 226.06, 90.17), ('', 226.06, 97.79)]` |
| `move()` symbol (moves fields too) | **PASS** |
| Read Reference field position | **PASS** `[229.87, 92.7099, 0]` |
| **Set field position independently** | **PASS** |
| Create a wire (`sch.wire.new()`) | **PASS** |
| Create junction / local label | **PASS** |
| Clone a symbol, rename, move | **PASS** → `R99` at `[50,50,270]`, `lib_id` `Device:R` preserved |
| **Create a NEW symbol from a library** | **FAIL** — `NotImplementedError: Unimplemented` |

`sch.symbol.new("Device:R")` and `sch.symbol.new("R99")` both raise
`NotImplementedError: Unimplemented`. **So an agent can only use part types
already present on the sheet**, via `clone()`. For generating a sheet from a
model this is the blocking limitation — unless you seed a template sheet with
one of every part you need.

### Round-trip fidelity: excellent

Token-level diff of original vs rewritten:

```
keys LOST entirely: NONE
keys ADDED: ['label']            (the label I added)
keys with FEWER occurrences: none
```

All KiCad-10-only tokens survive — `body_style` (40), `do_not_autoplace` (259),
`in_pos_files` (48), `embedded_fonts` (9), `generator_version` — **even though
the parser prints `can't parsy` for them.** The warnings are cosmetic; unknown
nodes pass through intact. Rendered text elements: 154 original → 156 after my
edits (+2, consistent with what I added). `kicad-cli sch erc` and
`sch export svg` both succeed on the output.

### Two real defects found

1. **Whitespace is not preserved: 5689 lines → 1238 lines.** Formatting is
   normalised to near-one-line-per-node. For a repo that commits `.kicad_sch`,
   **every kicad-skip write produces a whole-file diff**, destroying review
   legibility. This is the single biggest practical objection.
2. **`wire.delta_x` is buggy.** `w.start_at(pin); w.delta_x = 10` produced
   `start [236.06, 100.17]`, `end [246.06, 2.54]` — the end Y is `2.54`, not the
   start's `100.17`. It sets `end.x` without initialising `end.y` from `start`.
   ERC then flagged the resulting 98 mm wire. **Set `start.value`/`end.value`
   explicitly and do not use `delta_x`/`delta_y`.**

**Verdict: the best Python option for *editing* an existing KiCad 10 sheet** —
pin locations are absolute and free, field positions are settable, fidelity is
exact. Disqualified for *generating* a sheet (no new symbols) and awkward for a
git-tracked repo (reformats everything). Dormant, so expect no fixes.

---

## 4. `kicad-sch-api` — CONTAMINATED for pin geometry, by its own documentation

- Repo: https://github.com/circuit-synth/kicad-sch-api — 57 stars, 19 forks,
  15 open issues, MIT
- PyPI: `kicad-sch-api` **0.5.6, 2025-11-19** — 32 releases, Dev Status 4 (Beta)
- **Last commit 2025-12-05.** ~11 months quiet as of 2026-10.
- Docs: https://kicad-sch-api.readthedocs.io/ — install `pip install kicad-sch-api`,
  Python 3.10+
- Part of the `circuit-synth` org (`circuit-synth` 0.12.1, 2026-01-09)

**Claims** "exact format preservation", output "indistinguishable from
hand-drawn", component add/move, pin-to-pin wiring, labels, field positioning,
KiCad library integration with "automatic pin position calculation", and
**"Manhattan-style orthogonal routing" generating "L-shaped wire paths
automatically"** — the only library surveyed that claims a router.

### The claims are refuted by the project's own `docs/KNOWN_LIMITATIONS.md`

**This is a correction to an earlier draft of this document, which flagged
`kicad-sch-api` as "the one most worth testing first" on the strength of those
claims.** Its own limitations file, quoted verbatim from
`circuit-synth/kicad-sch-api/docs/KNOWN_LIMITATIONS.md`, says otherwise:

> **2. Symbol Rotation and Position Transformation in Pin Positioning**
> **File**: `kicad_sch_api/core/types.py:165` (`SchematicSymbol.get_pin_position`)
> **Issue**: Pin position calculations don't account for component rotation or
> symbol offset transformations.
> **Impact**: Pin-to-pin wiring may be slightly inaccurate for rotated
> components. Affects automated wire routing accuracy.
> **Priority**: MEDIUM

> **3. Wire Connectivity Analysis**
> **File**: `kicad_sch_api/core/managers/wire.py:307`
> **Issue**: Connectivity analysis for nets and wires is simplified.
> **Impact**: Complex wire junction detection may miss some connections.
> Affected by very short wire segments or unusual routing patterns.

(Plus limitation 1: bounding-box calculations ignore rotation, priority LOW.)
All three are "Documented as known limitation" — **unfixed**, in a library whose
last commit was 2025-12-05.

**Why this is disqualifying rather than merely a caveat.** The "automatic pin
position calculation" that made it interesting is the exact thing admitted
broken, and **limitations 2 and 3 compound into silent wrongness**: wrong pin
coordinates for any rotated part, plus junction detection that misses short
segments, produces a schematic that can pass a netlist-level assertion and still
be electrically wrong. "Works for 0° rotation (most common case)" is not a
property any real schematic has — rotated passives are the norm, and
`pt2399-core` has a symbol at 270°.

**It is load-bearing for three of the MCP servers in §10** —
`circuit-synth/mcp-kicad-sch-api`, `blwfish/kicad-mcp`, and the save path of
`oaslananka/kicad-mcp-pro` — so anything trusting their pin positioning inherits
this. `kicad-mcp-pro` is the exception: it computes its own rotation- and
mirror-aware pin geometry and carries a helper whose docstring notes
"kicad-sch-api does not expose it", i.e. it is working around the library rather
than trusting it.

**Still UNVERIFIED:** I did not run it against a KiCad 10 (v20260306) file, and
its docs state it requires "a KiCAD 7 or 8 installation". The format question is
now moot for adoption, but the above is read from the project's documentation,
not from a test.

---

## 5. `kiutils` — DO NOT USE on KiCad 10. It destroys data silently.

- Repo: https://github.com/mvnmgrx/kiutils — 129 stars, 47 forks, GPL-3.0
- PyPI: `kiutils` **1.4.8, 2024-02-02**. **Dev Status 5 "Production/Stable".**
- **Last commit 2024-05-02.** Dormant. Self-described "for KiCad 6.0 and up".

It *appears* to work. Measured:

| Capability | Result |
| --- | --- |
| Load KiCad 10 file | **PASS** — `version=20260306 n_symbols=40 n_wires=72` |
| Move a symbol + write | **PASS** |
| Create a wire + write | **PASS** |
| `kicad-cli sch export svg` on output | **PASS, exit 0** |

**And the output is wrecked.** Token diff, original → kiutils round-trip:

```
keys LOST entirely: body_style, do_not_autoplace,
                    duplicate_pin_numbers_are_jumpers, embedded_fonts,
                    exclude_from_sim, generator_version, hide, in_pos_files,
                    pin_numbers

   hide:              192 -> 0
   do_not_autoplace:  259 -> 0
   exclude_from_sim:   48 -> 0
   in_pos_files:       48 -> 0
   body_style:         40 -> 0
   embedded_fonts:      9 -> 0
   pin_numbers:         6 -> 0
   duplicate_pin_numbers_are_jumpers: 8 -> 0
```

**Losing all 192 `hide` flags makes every hidden Footprint, Datasheet and
Description field visible.** The rendered consequence, measured on the SVG:

| File | `<text>` elements | SVG bytes |
| --- | --- | --- |
| original | **154** | 322,378 |
| kiutils round-trip | **643** | 4,851,689 |
| kicad-skip round-trip | 156 | 321,248 |

**4.2× the text, 15× the file — and `kicad-cli` exited 0 on it.** This is a
textbook false green of the kind `docs/schematic/false-greens.md` catalogues: a
dataclass parser that models KiCad 6 drops every token added since, and the
renderer cheerfully draws the wreckage. A netlist-level assertion would pass
too; only looking at the picture, or diffing tokens, catches it.

**Verdict: unusable for KiCad 10.** Its "Production/Stable" classifier and
successful load are both actively misleading.

---

## 6. `kicadts` (TypeScript) — best fidelity, best fit for this repo, two sharp edges

This is the most interesting find for a Bun/TypeScript codebase.

- **npm `kicadts` 0.0.62, published 2026-10-27** — i.e. the day before this
  survey. **62 versions** since 2025-09-29.
- **Real repo: https://github.com/tscircuit/kicadts** (MIT, 9 stars, 22 forks,
  13 open issues, last commit 2026-10-27). Note `zenoutlabs/kicadts` and
  `sreecharan-desu/kicadts` are forks with 0 stars; the npm `repository` field
  points at `tscircuit/kicadts`.
- Install: `bun add kicadts`

**Relevant to this repo's history:** it is a **tscircuit-org** package. tscircuit
itself was removed from this project (`docs/decisions/2026-09-21-why-not-tscircuit.md`).
`kicadts` is only a file-format library — no board, no renderer, no JSX, no
reactive model — so it does not reintroduce what that decision rejected. Worth
stating explicitly rather than letting the org name decide it.

**Shape:** every KiCad token is a class. `parseKicadSch(text)` returns a
`KicadSch` with accessors `version, generator, generatorVersion, uuid, paper,
titleBlock, libSymbols, sheetInstances, embeddedFonts, symbolInstances,
properties, images, sheets, symbols, texts, labels, globalLabels, junctions,
wires, noConnects, arcs, polylines, rectangles, textBoxes`, and `getString()` to
serialize. Exported classes include `Wire, Junction, Label, GlobalLabel,
SchematicSymbol, SchematicText, SchematicTextBox, SchematicArc,
SchematicPolyline, SchematicRectangle, At, Xy, EmbeddedFonts, FieldsAutoplaced,
ExcludeFromSim` — i.e. it models KiCad 9/10 tokens, not KiCad 6.

### Measured, against the KiCad 10 file

| Capability | Result |
| --- | --- |
| Parse KiCad 10 file | **PASS** `{v:20260306, gv:"10.0"}` |
| Counts | **PASS** 40 symbols / 72 wires / 16 junctions / 6 global labels / 8 libSymbols |
| Read `libraryId` | **PASS** `Device:C` (note: accessor is `libraryId`, **not** `libId`) |
| Move symbol (`at.x/at.y`) | **PASS** |
| Read field positions + `hide` | **PASS** `Reference C12 @[229.87,92.7099]`, `Value 5600pF`, `Footprint …` |
| Set field position independently | **PASS** |
| Create `Wire` with `pts` | **PASS** |
| Create `Junction`, `Label` | **PASS** |
| **Create a new `SchematicSymbol` with `libraryId`** | **PASS** (but see gotcha 2) |
| Read pin geometry | **PARTIAL** — `libSymbols.symbols[].subSymbols[].pins[].at` gives `{at:[-12.7,12.7,0], len:2.54}`; these are **library-local**, not resolved absolute |

### Round-trip fidelity: the best of the three

Pure parse → `getString()`, zero edits:

```
keys LOST: NONE
keys ADDED: NONE
count differences: none - byte-level token parity
```

5689 → 5779 lines (whitespace close but not identical), and the rendered SVG has
**exactly 154 text elements, matching the original.** `kicad-cli sch export svg`
succeeds on no-edit, move-only and move+wire variants.

### Two sharp edges, both found by running it

**Gotcha 1 — moving a symbol orphans its fields, and KiCad then silently
re-places them.** There is no `move()` helper. Measured:

```
ORIGINAL    symbol at [226.06, 93.98]  Reference field at [229.87, 92.7099]  fieldsAutoplaced: true
AFTER MOVE  symbol at [236.06, 93.98]  Reference field at [229.87, 92.7099]  fieldsAutoplaced: true
```

The field stays at its old absolute position **and `fields_autoplaced` remains
`true`**, so KiCad re-autoplaces on load. The rendered text changed in ways
beyond the moved symbol: `'C12'` 2→1, `'5600pF'` 4→3, `'GND'` 15→14, total
154→151. **The file you wrote is not the drawing you get.** An agent moving
symbols must move each field by the same delta *and* clear `fieldsAutoplaced`,
or accept KiCad's autoplacement. (`kicad-skip`'s `move()` handles children for
you; this is the one place it is clearly better.)

**Gotcha 2 — it will serialize an invalid schematic that KiCad refuses to open,
with no complaint.** My first test did `new SchematicSymbol()` with
`libraryId = "Device:R"` and nothing else. It serialized fine. Then:

```
kicad-cli sch export svg  ->  "Failed to load schematic"
kicad-cli sch erc         ->  exit 3
```

Isolating it proved the library was innocent: no-edit, move-only and move+wire
all load fine. **A new symbol also needs a `lib_symbols` definition, a `uuid`,
and instance data**, and `kicadts` neither supplies nor validates any of it.
There is no schema check — the only gate is `kicad-cli`. **Always round-trip
through `kicad-cli` after writing; a successful `getString()` means nothing.**

### Pin geometry is the real gap for wiring

`kicadts` hands you **library-local** pin coordinates. To wire pin-to-pin you
must apply the instance's position, rotation and mirror yourself. `kicad-skip`
gives absolute `pin.location` for free. If an agent is to wire by pin, either
implement that transform once and test it, or get pin positions from
`kicad-skip` / the exported netlist.

**Verdict: the strongest base for *generating* schematics in this repo** — it is
TypeScript (no Python boundary), actively released, models KiCad 10 tokens,
achieves byte-level token parity, and **can create new symbols** (the thing
`kicad-skip` cannot). Price: you implement the symbol-transform math, the
field-move bookkeeping, and the `lib_symbols` plumbing yourself, and you lean on
`kicad-cli` as the only validator. Caution: 9 stars, 0.0.x, 62 versions in 13
months — a fast-moving pre-1.0 dependency.

---

## 7. Other TypeScript/JS options (metadata only, not run)

| Package | Latest | Repo | Signal |
| --- | --- | --- | --- |
| `kicad-sch-ts` | 1.0.3, **2026-01-06** | https://github.com/agrimsingh/kicad-sch-ts (3 stars, MIT) | 4 versions all within **2 days**, then silence. Claims round-trip fidelity + CLI + components/wires/labels/sheets, but explicitly **"KiCAD 7/8"**. Abandoned-looking. |
| `kicad-toolkit` | 1.3.7, 2026-09-28 | https://github.com/SunboX/kicad-toolkit (2 stars, GPL-3.0-or-later) | Parses into CircuitJSON + renders. **Parse/render oriented, not an editor.** GPL-3.0 is a licensing decision for this repo. |
| `kicad-converter` | 0.0.17, 2025-07-08 | tscircuit-adjacent, no repo field | KiCad ↔ JSON/CircuitJSON conversion. Dormant. |
| `kicad-to-json` | 1.1.7, **2021** | https://github.com/jdthorpe/kicad-module-parser | Board/module files to JSON. Ancient, not schematic-focused. |

None of these were tested against a KiCad 10 file. `kicadts` dominates the group
on activity and on modelling KiCad 10 tokens.

---

## 8. `sexpdata` and roll-your-own

- PyPI `sexpdata` **1.0.2, 2024-01-09**, BSD-2, **Dev Status 3 (Alpha)**,
  https://github.com/jd-boyd/sexpdata

A generic S-expression reader/writer with no KiCad knowledge. It is what
`kicad-skip` is built on (installed as its dependency). Using it directly means
owning the whole KiCad schema — which is what this repo's `lib/schgen/` already
does. **It offers an agent no leverage over the existing in-repo generator**;
listed only so it is not mistaken for a KiCad tool.

---

## 9. `SKiDL` — active, but explicitly not a placer

- PyPI `skidl` **3.0.0, 2026-10-16** (very active: 2.3.0 in July, 3.0.0 in
  October), Dev Status 5, https://github.com/devbisme/skidl

Describes circuits in Python and emits netlists; `generate_schematic()` /
`generate_svg()` produce "editable KiCad schematic files or static, hyperlinked
SVG (KiCad 6–10)". **But the README states the limitation plainly: "No automatic
symbol placement and wire routing"** — users place and route in KiCad
afterwards.

- **UNVERIFIED:** older SKiDL carried an experimental schematic autoplacer/router.
  I did not establish whether 3.0.0 retains it or what the quoted line scopes.
  Given this repo already has its own circuit-as-data model, SKiDL's value would
  be only its placement engine, so **this is the one thing worth checking** before
  dismissing it.

Overlap warning: SKiDL is a *competing* circuit-description layer. Adopting it
wholesale would duplicate `lib/model/`, not complement it.

---

## 10. KiCad MCP servers

**I read the tool-registration source for each of these, not the READMEs.** That
mattered: my first pass triaged this field from stars and commit dates and got
the ranking badly wrong. Corrections are called out below, because the way the
metadata misleads is itself the finding.

| Project | Stars | Last commit | Release | Schematic editing? |
| --- | --- | --- | --- | --- |
| [ProductOfAmerica/mcp-server-kicad](https://github.com/ProductOfAmerica/mcp-server-kicad) | 15 | 2026-10-23 | **`v0.21.1` 2026-10-20**, PyPI `mcp-server-kicad` 0.21.1 (68 releases) | **Yes — the most complete surface found** |
| [oaslananka/kicad-mcp-pro](https://github.com/oaslananka/kicad-mcp-pro) | 160 | **2026-10-28** | `v4.4.0` 2026-10-24, npm `kicad-mcp-pro` 4.4.0 | **Yes, incl. an iterative readability loop** |
| [Seeed-Studio/kicad-mcp-server](https://github.com/Seeed-Studio/kicad-mcp-server) | 174 | 2026-10-22 | none | **Partial — adds only, cannot move** |
| [lamaalrajih/kicad-mcp](https://github.com/lamaalrajih/kicad-mcp) | **531** | 2025-10-17 | none | **No — read-only analysis + export** |
| [circuit-synth/mcp-kicad-sch-api](https://github.com/circuit-synth/mcp-kicad-sch-api) | 21 | 2025-08-20 | `v0.1.0` | Wraps `kicad-sch-api`; abandoned after 2 days |
| [ANamelessDrake/kicad-mcp](https://github.com/ANamelessDrake/kicad-mcp) | 1 | 2026-10-01 | none | Claims KiCad **8**; not examined |
| [danidask/mcp-server-kicad](https://github.com/danidask/mcp-server-kicad) | 0 | 2026-10-12 | none | **A fork** of ProductOfAmerica (see below) |

### Correction 1: stars are inversely related to capability here

**`lamaalrajih/kicad-mcp` has 531 stars — 3× the next — and cannot edit a
schematic at all.** Its entire tool set is `analysis_tools, bom_tools,
drc_tools, export_tools, netlist_tools, pattern_tools, project_tools,
validation_tools`. No schematic authoring module exists. It has also been
dormant since 2025-10-17. **If you pick by popularity you get the one that
cannot do the job.**

### Correction 2: `danidask` is a fork, not a one-day vanity repo

I initially dismissed `danidask/mcp-server-kicad` as "created and abandoned the
same day" with 0 stars. **It is a fork** (`fork: true`,
`parent: ProductOfAmerica/mcp-server-kicad`) created 2026-10-12. The upstream is
GPL-3.0, created 2026-03-09, with **68 PyPI releases** to `v0.21.1`. The "one
day of history" was one day of *fork* history. A repo's age and star count say
nothing when it is a fork.

### `ProductOfAmerica/mcp-server-kicad` — the one to look at

PyPI summary: *"**Byte-preserving** MCP servers for KiCad: schematic capture,
PCB layout, ERC, DRC, and manufacturing exports"*. Dev Status 4 (Beta), Python
3.11+. Upstream description says *"Maintenance mode: security and KiCad
compatibility fixes only"*.

- **Install:** `uvx --from mcp-server-kicad mcp-server-kicad-schematic`, or
  `pip install mcp-server-kicad`. It ships **split servers** — separate
  `-schematic`, `-pcb`, `-symbol`, `-project` entry points — so the schematic
  surface can be mounted alone.
- **Mechanism — notable:** runtime dependencies are only `mcp` and
  `typing-extensions`. **No third-party KiCad library at all.** It implements its
  own concrete syntax tree (`_cst.py`), which is where "byte-preserving" comes
  from. It does not inherit the §5 kiutils rot or the §3 reformatting problem.
- **It is the only thing in this entire survey with CI against KiCad 10.** Its
  README: *"KiCad 9.x or 10.x are the existing offline integration targets"* and
  *"CI runs the full suite on Linux against KiCad 9 and KiCad 10, and on macOS
  and Windows against KiCad 10, plus a KiCad-free Python 3.13 CI job."* Every
  other library here was either untested on 10 or (kiutils) silently broken on it.
- **43 schematic tools, annotated by effect** (`_READ_ONLY`, `_ADDITIVE`,
  `_DESTRUCTIVE`, `_EXPORT`) — the annotations are real MCP tool annotations, so
  a client can gate the destructive ones:

  *Read:* `get_schematic_summary`, `list_schematic_components/labels/wires/
  global_labels/hierarchical_labels/sheets/junctions/no_connects/bus_entries`,
  **`get_symbol_pins`**, **`get_pin_positions`**, **`get_net_connections`**.

  *Place and move:* **`place_component`**, **`move_component`**,
  `add_lib_symbol`, `set_component_property`, `add_power_symbol`,
  `set_page_size`, **`auto_place_decoupling_cap`**.

  *Wire:* **`add_wires`** (batch), **`connect_pins`**, **`wire_pins_to_net`**,
  `add_junctions`, `no_connect_pin`, `add_label`, `add_global_label`,
  `add_hierarchical_label`, `modify_hierarchical_label`, `add_text`.

  *Remove:* `remove_component/label/wire/junction/no_connect/text/
  hierarchical_label`.

  *Verify:* `list_unconnected_pins`, `run_erc`, `export_schematic`,
  `export_netlist`, `export_bom`.

  Internals confirm the hard parts are actually done: `_get_pin_pos_cst`,
  `_auto_junctions_cst` (inserts junctions where a new wire crosses an existing
  one), `_bounds_check` against page size, and
  `_copy_lib_symbol_from_file_cst`/`_copy_system_lib_symbol_cst` (pulls a symbol
  definition out of a system library into `lib_symbols`). `_refuse_derived`
  refuses derived symbols rather than guessing.
- **It also ships Claude Code skills and reviewer subagents.** Six skills
  (`using-kicad`, `circuit-design`, **`schematic-plan`** — *"Planning exact
  placement coordinates and wiring. Pure planning, no writes"* —
  `schematic-design`, `pcb-layout`, `verification`), and *"The design skills hand
  their artifacts to independent reviewer subagents before moving on, so a bad
  BOM or a bad placement plan gets caught before it becomes a schematic."*
  That split — plan, then a reviewer that is not the producer — is the same
  invariant this repo's `CLAUDE.md` states about never letting an agent author
  the acceptance criteria for its own artifact. Worth reading even if the server
  is never installed.
- **UNVERIFIED:** I did not install or run it. All of the above is read from
  source, `pyproject.toml`, PyPI metadata and README. The CI claim in particular
  is the project's own statement; I did not inspect its workflow files.
- **One caution found in `pyproject.toml`:** `kiutils` is a *test* dependency,
  used to "read written files back as an independent oracle". Given §5 — kiutils
  drops nine KiCad 10 token families on round-trip — an oracle built on it could
  pass a file it has itself misread. The comment says "No runtime path parses"
  with kiutils, so this is a test-integrity question, not a data-loss risk to
  your files. Flagging it because it is exactly the false-green shape.

### `oaslananka/kicad-mcp-pro` — has the iterative loop, built on `kicad-sch-api`

Most active repo in the field (last commit the day of this survey; npm
`kicad-mcp-pro` 4.4.0). **2,274 files.** My churn warning stands — commit
`#1517` in a repo created 2026-05-31, and three `v4.4.0` artifacts tagged within
two seconds, suggest heavy automated generation — but **there is substantial
real schematic code**, so "slop" was the wrong call.

- **Mechanism:** depends on **`kicad-sch-api>=0.5.0,<0.6`** (§4),
  `kicad-python>=0.6,<0.9` and `sexpdata`. So it inherits §4's unverified
  KiCad 10 status — and conversely, it is evidence that someone has built
  seriously on `kicad-sch-api`, which raises the priority of testing it (§4).
- `schematic/` holds `basic_authoring` (`add_symbol`, `add_wire`, `add_bus`,
  `add_bus_wire_entry`, `add_no_connect`, `add_label`, `add_labels_batch`,
  `add_power_symbol`), `connectivity_authoring`, `symbol_mutation`
  (**`move_symbol`**, `update_properties`, `set_dnp`), `hierarchy_authoring`,
  `sheet_wiring`, `sheet_pins`, `template_instantiation`, `semantic_ir`,
  `topology`, `inspection`, `layout_inspection`, `destructive_edit`,
  `back_annotation`, `guarded_api_save`, `rendering`.
- **`layout_automation.py` is the most on-point thing in this survey.** It
  implements `auto_place_symbols`, `autoplace_fields`, `auto_place_functional`
  (functional-zone placement), and **`fix_readability(max_passes=3)`** — a real
  render-look-revise loop. Read verbatim from source, it runs `run_visual_qa`,
  extracts finding codes, applies a fix, and repeats until clean, stable, or
  pass-limited. The finding codes it acts on are `offsheet_symbol`,
  `offsheet_label`, `symbol_overlap`, `text_overlap`; the ones it reports as
  needing manual follow-up are `symbol_overlap`, `label_overlap`,
  `dense_label_fanout`. Its remedies are: grow the sheet one step along a paper
  ladder; re-space overlapping symbols; auto-place fields. It saves with
  `preserve_format=True`.
- **The honest limitation, visible in the code:** the symbol re-spacing fires
  only `if "symbol_overlap" in codes and not self.schematic_has_connections(...)`
  — i.e. **it refuses to re-space once the sheet has any wires**, because moving
  symbols would break them. So the automatic placer is a *pre-wiring* tool. That
  is the right guard, and it is also the admission that nothing here re-routes.

### `Seeed-Studio/kicad-mcp-server` — add-only, and raw regex underneath

174 stars, active (last commit 2026-10-22), 85 files, has tests
(`tests/test_tools/`). **No license file** — a blocker for adoption regardless of
quality.

- `tools/schematic.py` is read-only: `list_schematic_components`,
  `get_symbol_details`, `search_symbols`, `list_schematic_nets`,
  `get_schematic_info`.
- `tools/schematic_editor.py` (674 lines) exposes exactly **five** write tools:
  `add_component_from_library`, `add_wire`, `add_label`, `add_global_label`,
  `add_hierarchical_label`.
- **There is no move/reposition tool anywhere in the repo.** It can add but not
  rearrange, which rules it out for a revise loop.
- **Mechanism: raw `re` + `uuid` + `Path` string surgery on the `.kicad_sch`
  text.** It imports no s-expression parser at all. It does do the hard parts by
  hand — `_insert_symbol_into_lib_symbols`, `_lib_pin_offset`, `_pin_anchor`,
  `_extract_symbol_from_kicad_sym` — and a source comment at line 547 shows the
  author knows the risk, noting a construct "accepted by lenient parsers
  (sexpdata, kicad-skip) but makes KiCad's own [parser]…". Regex editing of
  s-expressions is nonetheless the most fragile mechanism in this survey.
- Its `utils/kicad_python.py` is about locating an interpreter that can
  `import pcbnew` (SWIG) for the **PCB** tools. Nothing drives a schematic API —
  consistent with §1.

### The two biggest KiCad MCP projects, which I missed on the first pass

Neither appears in the official MCP registry, which is probably why. **Both are
larger than everything above combined, and both have the schematic *legibility*
tooling this repo actually wants.** Metadata below is from the GitHub API; where
a capability is relayed from a delegated source audit rather than my own read, I
say so.

**`mixelpixx/KiCAD-MCP-Server` — 3,002 stars, 399 forks, MIT, active (pushed
2026-10-26).** https://github.com/mixelpixx/KiCAD-MCP-Server · ~247 tools, with
`KICAD_MCP_TOOLBOXES=core` narrowing the default to 37. A TypeScript MCP front
end spawning a long-lived Python subprocess; schematic work is its own
`sexpdata`-based editing, PCB work is `pcbnew` SWIG with an experimental `kipy`
backend.

**I verified `src/tools/schematic-layout.ts` myself** — five real `server.tool(`
registrations, and they are the most on-point tools found anywhere in this
survey:

- **`set_schematic_property_position`** — move a Reference or Value field to an
  absolute (x, y) in mm, with optional angle and visibility. **This is the field
  positioning that `mcp-server-kicad`, `kicad-skip`-via-MCP and most others lack.**
- **`batch_set_schematic_property_positions`** — many field moves in one
  read/write, returning per-item applied/failed with reasons.
- **`autoplace_schematic_fields`** — repositions every Reference and Value field
  so it sits outside the component body **and outside any net labels attached to
  its pins**, avoiding collisions with other components and already-placed
  fields; net-label-aware, with a `clearance` defaulting to one 1.27 mm grid unit.
- **`lint_schematic_cosmetic`** — netlist-safe raw-text passes that never move a
  symbol, pin, wire, junction or label anchor: `hide_pin_names`, and
  `orient_labels` which sets each label's angle and justify from the sheet-space
  outward side of the pin it sits on, rotation- and mirror-aware. Has `dryRun`.
- **`suggest_schematic_declutter`** — re-orients overlapping labels while holding
  each **anchor fixed** because it is the electrical connection point, changing
  only orientation and justification; **dry-run by default**, returning proposals
  plus an overlap score **before and after**.

Caveats: the file is only 174 lines, so these are thin registrations over Python
implementations I did not read. **Not on npm or PyPI** despite a `package.json`
naming `kicad-mcp` — install is `git clone` plus a setup script. Four boundaries
in the call path. And its `docs/KNOWN_ISSUES.md` is honest about real breakage
(relayed): `get_board_info` broken on KiCad 9 layer enums, SWIG zone-fill
segfaults, the SWIG backend cannot push to a running UI.

**`mixelpixx/Konnect` — 1,432 stars, AGPL-3.0, and `archived: true` as of
2026-10-25.** https://github.com/mixelpixx/Konnect · Its successor
**`Orchis-ai-LLC/Konnect-EDA`** (64 stars, licence `NOASSERTION`) is
**closed-source commercial**, free during beta, the repo being downloads and an
issue tracker only. 228 tools over 21 on-demand toolsets. Schematic editing was
its **own Rust `.kicad_sch` engine** with atomic write and UUID preservation,
needing no KiCad install; PCB went through the KiCad 10 IPC API. Its README is
explicit that it deliberately avoided a "third-party schematic library with known
gaps" — i.e. it rejected both `kicad-skip` and `kicad-sch-api`, which §4 now
vindicates.

Relayed, **not** verified by me (the Rust `tool!` macros):
`get_schematic_pin_locations` accounting for rotation and mirroring and returning
`orientation_degrees` and `length_mm`; `reset_schematic_field_positions`;
`add_wire` auto-detecting T-junctions and inserting dots; `delete_schematic_wire`
**pruning the junction dots it leaves unjustified**; `move_connected` stretching
connected wire stubs while plain `move_schematic_component` explicitly does not;
`fix_connectivity` snapping near-miss endpoints with `dry_run`;
`check_schematic_overlaps`, `find_orphan_items`, `find_single_pin_nets`,
visual-baseline set/compare. It also deprecated its own
`auto_place_from_schematic` with "autonomous whole-board mutation is retired —
apply bounded, explicit `move_component` operations instead", which is a finding
in itself.

**The durable value is its specification, not its code.** The AGPL Rust source is
frozen; `Konnect-EDA/tool-directory.md` is a 449-line statement of what each
schematic operation must *mean*. See the recommendation below.

### Three more worth knowing

- **`copperheadhq/copperhead`** — 666 stars, 139 forks, Apache-2.0, pushed
  2026-10-28, TypeScript. https://github.com/copperheadhq/copperhead · Edits real
  `.kicad_sch` text and holds **the largest open-source legible-schematic
  drafting engine found**; I confirmed `src/kicad/` contains `legibility.ts`
  (34 KB), `score.ts` (21 KB), `populate.ts` (40 KB), `symlib.ts`, `sexp.ts`.
  **But its MCP server deliberately exposes only five opaque, outcome-level
  tools**, on an argued security position: "The security boundary is tool
  granularity… no file-edit tool, no raw KiCad tool, no way to drive one step of
  the loop." Self-labelled EXPERIMENTAL. **Unusable as a schematic-editing
  server; the most interesting TypeScript prior art in the ecosystem**, and a
  direct counter-argument to fine-grained tool surfaces worth reading alongside §0.
- **`blwfish/kicad-mcp`** — 27 stars, MIT, pushed 2026-10-28 (active). Wraps
  `kicad-sch-api` (so it inherits §4's rotation defect) but deliberately exposes
  only **18 tools** — 12 routers with an `operation` parameter — explicitly to
  stay inside every client's tool limit. Has `add_wire_between_pins` and a
  `schematic_layout` router. Not on PyPI.
- **`Huaqiu-Electronics/kicad-mcp`** — 25 stars, MIT, **last commit 2026-04-20**.
  **Owns the PyPI name `kicad-mcp`** (not `lamaalrajih`). Drives the *running*
  KiCad editor over an NNG socket, so the document must be open. 26 schematic
  tools, but no junction, no no-connect, no field positioning.
- **`belaszalontai/kipilot-mcp`** — 14 stars, Apache-2.0. A near-1:1 `kipy`
  wrapper whose schematic surface is **generic item CRUD**
  (`kicad_sch_create_items`/`update_items`/…), so its capability is bounded by
  whatever KiCad's IPC schematic mutation permits — which §1 shows is
  approximately nothing in 9/10.

**PyPI name traps** (relayed, consistent with my own finding that
`mcp-kicad-sch-api` is absent from PyPI): `kicad-mcp` is Huaqiu's,
`kicad-mcp-server` belongs to an unrelated `bunnyf/pcb-mcp`, and
`mcp-kicad-sch-api` is not on PyPI at all despite its README's `pip install`
line. Also `devbisme/kicad-skip` does not exist — `kicad-skip` is
`psychogenic/kicad-skip` (Pat Deegan); devbisme is SKiDL's author.

### What this means for this repo

**The §1 constraint still binds and explains the whole field:** no released
KiCad has a schematic API, so every server above is doing file-level
s-expression editing behind an RPC hop. None of them is driving KiCad.

So the choice is not "MCP server vs library" but "whose s-expression editor". On
that basis:

- **`mcp-server-kicad`'s `_cst.py` is the most credible schematic editor found
  in any language** — byte-preserving, no stale dependencies, CI against
  KiCad 10, pin positions and auto-junctions implemented, effects annotated. If
  the goal is an agent with hands on a sheet *today*, this is the thing to test
  first, ahead of `kicad-skip` and ahead of writing more `lib/schgen/`.
- **But mounting it as an MCP server is probably still wrong here.** This repo's
  generator is TypeScript and its criteria live in rule files and tests; an RPC
  tool surface whose effects you cannot unit-test from `bun test` fits poorly,
  and `CLAUDE.md` is explicit that criteria must not arrive through the producing
  agent. The value to extract is its *approach* — a CST for fidelity, pin-anchor
  resolution, auto-junctions, page-bounds checks, effect annotations — and its
  plan/review split.
- **`kicad-mcp-pro`'s `fix_readability` is the closest existing thing to the
  iterative cost-minimisation this repo wants**, and its "no re-spacing once
  wired" guard is a result worth knowing before designing one: placement and
  routing cannot be separated passes unless the placer runs first and once.

---

## Recommendations for this repo

**1. Treat `kicad-cli` as the gate, and never trust its exit code alone.**
It is required, fast and already in `make check`. But §5 proves exit 0 on a file
that lost 192 `hide` flags and rendered 4.2× the text. **Pair every write with
both a `kicad-cli` load *and* a token-count diff against the input.** The
token-diff script used throughout this document is ~10 lines of Python and
caught what `kicad-cli` and a netlist assertion both missed. That belongs in
`make check` as a test, not in prose.

**2. There is no "drive KiCad as a tool" option today, and the honest framing
is that `lib/schgen/` is not a workaround — it is the only approach that exists.**
The IPC API is the thing that will eventually remove that burden, and it is
~KiCad 11 away with no committed date. Nothing in this survey justifies
abandoning `lib/schgen/`.

**3. If an existing sheet must be *edited*, `kicad-skip` is the tool** — absolute
pin locations, settable field positions, exact token fidelity. Accept that it
reformats the whole file, avoid `delta_x`/`delta_y`, and note it cannot add a
part type the sheet does not already have.

**4. If `lib/schgen/` wants a token layer instead of hand-rolled s-expressions,
`kicadts` is the candidate to evaluate** — TypeScript, byte-level token parity,
can create symbols. Budget for the symbol-transform math, field-move
bookkeeping, and `lib_symbols` plumbing, and pin a version.

**5. Ban `kiutils` outright**, and consider §5 a worked entry for
`docs/schematic/false-greens.md`.

**6. Do not build on `kicad-sch-api`, and treat anything that wraps it as
suspect for pin geometry.** Its own `KNOWN_LIMITATIONS.md` admits
`get_pin_position` ignores rotation and that wire connectivity analysis is
simplified — the two defects compound into a schematic that passes a netlist
assertion and is still wrong. This reverses an earlier draft of this document,
which named it the thing to test first.

**7. Read `mcp-server-kicad` before extending `lib/schgen/`, even if it is never
installed.** It has solved, in a byte-preserving CST, the four things a
schematic placer must get right — pin-anchor resolution, auto-junction insertion
where a new wire meets an existing one, page-bounds checks, and pulling a symbol
definition from a system library into `lib_symbols`. It is also the only project
here with CI against KiCad 10, and its plan/execute/review split with a reviewer
that is not the producer matches this repo's stated invariant. Borrowing the
approach costs nothing; re-deriving it costs a plan.

**8. The render-look-revise loop needs a rasterizer**, because
`kicad-cli sch export` has no PNG. `rsvg-convert` is present locally and is the
cheapest route from `sch export svg` to an image an agent can look at.

**9. Before designing an iterative placer, note `kicad-mcp-pro`'s result:** its
`fix_readability` loop re-spaces overlapping symbols **only when the sheet has no
wires**, because moving a symbol breaks them. Nothing in this survey re-routes.
Placement and routing are therefore not separable passes unless placement runs
first and once — which is a constraint on the design, discovered for free.
Konnect reached the same conclusion from the other direction, deprecating its
whole-board auto-placer in favour of "bounded, explicit `move_component`
operations".

**10. The highest-value output of this survey is criteria, not code — and
`CLAUDE.md` says criteria must not come from the agent producing the artifact.**
Three independent, externally-authored specifications of what schematic
legibility operations must *mean* now exist, and they agree with each other:

- `Orchis-ai-LLC/Konnect-EDA/tool-directory.md` — 449 lines on which deletions
  must prune now-unjustified junction dots, which moves must stretch connected
  wires and which must not, what a pin location must account for.
- `mixelpixx/KiCAD-MCP-Server/src/tools/schematic-layout.ts` — field
  autoplacement must be net-label aware with an explicit clearance; a declutter
  pass holds each label's anchor fixed because it is the electrical connection
  point, changes only orientation and justify, is dry-run by default, and reports
  an overlap score before and after.
- `copperheadhq/copperhead/src/kicad/legibility.ts` + `score.ts` — a third,
  TypeScript, scoring-based take.

**These are the right shape for this repo's rule file or spec**, because nobody
here wrote them to justify an artifact produced here. Reading them costs an hour;
re-deriving them costs a plan.

**11. Do not adopt an MCP server as the mechanism** — §0 is a maintainer's own
measured argument against the layer, and §10 shows every server is editing
s-expressions behind an RPC hop anyway. Borrow the approaches and the criteria.

---

## Everything this document does not establish

1. **No MCP server was installed or run** (§10). Tool names, effect annotations,
   mechanisms and dependencies were read from source and `pyproject.toml`, which
   establishes what each *offers* but not that any of it works. In particular
   `mcp-server-kicad`'s KiCad 10 CI claim is the project's own README statement;
   I did not inspect its workflow files. `ANamelessDrake/kicad-mcp` was not
   examined at all beyond metadata.
2. **`kicad-sch-api` against KiCad 10** (§4) — not run. The rotation and
   connectivity defects are read from the project's own `KNOWN_LIMITATIONS.md`,
   which is strong evidence but is documentation, not a test.
2a. **The implementations behind `mixelpixx`'s five layout tools** — I confirmed
   the registrations in a 174-line TypeScript file; the Python that does the work
   is unread. Its `KNOWN_ISSUES.md` breakage list is relayed, not verified.
2b. **Konnect's capabilities are relayed, not verified** — I confirmed the repo
   is archived and the successor is closed-source, but did not read the Rust.
2c. **`copperheadhq/copperhead`'s legibility engine** — I confirmed the file
   sizes exist; I did not read the engine or run it.
3. **KiCad 11's release date** (§1) — milestone has no due date; Feb 2027 is
   inference from the 12.0 window and prior cadence, not a primary statement.
4. **Whether `master`-branch `kicad-python` + a KiCad 11 nightly actually
   places a symbol** — neither I nor the delegated audit ran a nightly. The C++
   handler list and the boardview project are source/README evidence only.
5. **Whether KiCad 10's inherited `CreateItems`/`UpdateItems` succeed at runtime**
   for `SCH_LINE`/labels. Source says symbols have no serialization; lines and
   labels do. Untested, and there is no read path regardless.
6. **Whether a `schematic`-scoped IPC action plugin renders a button in KiCad 9/10.**
   Source wiring in `sch_edit_frame.h` / `toolbars_sch_editor.cpp` suggests yes;
   dev-docs say PCB-only. Unresolved, and moot — such a plugin could only call
   `GetOpenDocuments`.
7. **Whether SKiDL 3.0.0 retains an experimental schematic autoplacer** (§9) —
   the one SKiDL question worth answering.
8. **The three untested TS/JS libraries** in §7.
9. **The cause of `kicadts`'s 154→151 text change** is attributed to
   `fields_autoplaced` re-placement on the strength of the measured field
   coordinates; I did not confirm it by clearing the flag and re-rendering.

## Reproducing the measurements

Scratch artifacts are under the session scratchpad only; nothing was installed
into the repo. The measurements rerun with: a venv holding
`kicad-skip`/`kiutils`/`kicad-python==0.8.0`, `bun add kicadts`, the KiCad 10.0.5
`kicad-cli`, and `pt2399-core.kicad_sch` as input. The two checks that did the
real work were (a) a token-frequency `Counter` over `\(([a-z_]+)[\s\)]` compared
input vs output, and (b) a count of `<text` in the exported SVG. Both are small
enough to belong in the repo as tests rather than as a document.
