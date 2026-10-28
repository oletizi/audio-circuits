# Does KiCad have schematic auto-layout? And would it, if the thing worked?

**Research pass, 2026-10-28.** Commissioned to test one hypothesis:

> *"If schematic auto-layout tooling that actually worked existed, KiCad would
> have it."*

**The hypothesis is FALSE, and the reason is structural rather than evidential.**

KiCad could not have had an in-application schematic layout plugin at any point
in its history, because **until KiCad 11 there was no programmatic surface of
any kind on the schematic editor** — no Python module, no action-plugin host, no
usable IPC command set. The maintainer who owns that API says so in his own
words, and gives the cause: not "nobody wanted it" but *"due to historical
reasons / technical debt, it is not currently feasible to provide an API that
allows you to work with schematic symbols."* The request for one was filed
**2017-10-28** and closed **2026-09-19** — nine years — and for most of that
span the schematic editor was the one major KiCad surface a plugin could not
reach at all.

So the absence of schematic auto-layout in KiCad is **not evidence that
schematic auto-layout does not work.** It is evidence about KiCad's internal
data model and its API ordering. A working engine, had one existed, would have
had nowhere to plug in.

**The hypothesis also fails on its own premise in a second, independent way.**
It assumes KiCad ships automation when automation works. KiCad **declines
PCB autorouting too** — the thing that demonstrably works and that every
commercial tool ships. A maintainer closed the standing autorouting request
with *"we aren't going to implement it anyway"* (**§4.3**). The project's
revealed preference is for **interactive, operator-in-the-loop tools** on both
sides of the design. Inferring from "KiCad does not ship X" to "X does not
work" fails on a case where X is known to work.

---

## How to read the labels

- **VERIFIED** — I read or ran the primary source myself, on this machine or by
  fetching the file. The source is named.
- **RELAYED** — a secondary source says it and I did not confirm it
  independently.

**Local environment every empirical claim was measured against:**

- KiCad **10.0.5**, `/Applications/KiCad/KiCad.app` — `kicad-cli version` → `10.0.5`.
- Shipped documentation: `.../SharedSupport/help/en/eeschema.html`, 950 KB, the
  KiCad 10 Schematic Editor manual, converted to 9,385 lines of text and grepped.
- Upstream source read via the **public GitLab API** on `kicad/code/kicad`,
  refs `10.0` (the released branch) and `master` (KiCad 11 development).

**What this document does NOT duplicate.** The repository has already surveyed
the *engines* (`docs/schematic/generation-prior-art*.md`, `elk-spike.md`,
`2026-10-28-schematic-layout-engines.md`) and the *agent tool surfaces*
(`2026-10-28-agent-kicad-surfaces.md`, which independently reached the same
conclusion about the IPC API from the other direction). This pass is about
**KiCad itself**: what it ships, what its maintainers have said, and whether a
plugin could exist.

---

## 1. What layout/placement automation does KiCad 10 ship for schematics?

### 1.1 The complete action inventory — VERIFIED

Every KiCad tool action carries a dotted string identifier compiled into the
binary. Extracting them from the shipped kifaces gives an exhaustive, no-judgement
census of what the editors can be commanded to do.

```
strings -a /Applications/KiCad/KiCad.app/Contents/PlugIns/_eeschema.kiface \
  | grep -Eo '^eeschema\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$' | sort -u
```

**230 `eeschema.*` actions in KiCad 10.0.5.** Of those, the ones that move
anything automatically are **exactly four**, plus a six-action manual aligner:

| Action | What it does | Scope |
| --- | --- | --- |
| `eeschema.InteractiveEdit.autoplaceFields` | Positions a symbol's Reference/Value/other **field text** | Text only, never the symbol |
| `eeschema.InteractiveDrawing.autoplaceAllSheetPins` | Distributes **hierarchical sheet pins** around a sheet's border | Sheet pins only |
| `eeschema.InteractiveEdit.cleanupSheetPins` | Deletes sheet pins with no matching hierarchical label | Deletion, not placement |
| `eeschema.EditorControl.annotateAutomatically` | Assigns **reference designators** | Names, not geometry |
| `eeschema.AlignToGrid` | Snaps a selection to the grid | Operator-selected, one step |
| `eeschema.Align.{alignLeft,alignRight,alignTop,alignBottom,alignCenterX,alignCenterY}` | Moves a selection to share one edge with a reference item | Operator-selected, 1-D |

**There is no automatic placement of symbols. There is no automatic routing of
wires. There is no "tidy up", "arrange", "clean up schematic" or "auto-layout"
command of any kind.** The strings `arrange`, `tidy`, `autorout`, `autolayout`
and `auto-arrang` return **nothing** from the eeschema kiface.

**`AUTOPLACER` appears once as a class name in the eeschema binary**, and the
build path compiled beside it is
`.../kicad/eeschema/autoplace_fields.cpp` — the field placer the brief already
knew about. **It is the only autoplacer in the schematic editor.** Confirmed.

The one further string worth recording is `Unknown autoplace algorithm`, which
implies the field placer is selectable among variants; the settings keys beside
it are `autoplace_fields.enable`, `autoplace_fields.allow_rejustify` and
`autoplace_fields.align_to_grid`. All three are about **field text**.

### 1.2 The source tree says the same thing — VERIFIED

Recursive listing of `eeschema/` and `pcbnew/` on ref `10.0`, filtered for
file names suggesting placement or routing:

| | files in dir | placement/routing files |
| --- | --- | --- |
| `eeschema/` | **863** | `autoplace_fields.cpp`; `sch_item_alignment.{cpp,h}`; `tools/sch_align_tool.{cpp,h}` |
| `pcbnew/` | **1457** | `autorouter/ar_autoplacer.{cpp,h}`; `autorouter/autoplace_tool.{cpp,h}`; a whole `router/` directory (**20+ files**: `pns_router`, `pns_line_placer`, `pns_diff_pair_placer`, `pns_meander_placer`, `pns_placement_algo.h`, `router_tool`, …); `tools/align_distribute_tool.{cpp,h}` |

The schematic editor has **no `router/` directory and no autoplacer directory.**
`sch_align_tool.cpp` registers exactly six actions (read: `Go( &SCH_ALIGN_TOOL::AlignTop, … )`
and five siblings) and **no distribute action**, where pcbnew's
`align_distribute_tool.cpp` registers both align and distribute.

### 1.3 What the shipped KiCad 10 manual says — VERIFIED

Grepping the 9,385-line schematic manual for `autoplace|auto-place|automatically place|auto.?rout|tidy|arrange|align|distribut` returns **three** relevant passages, and no fourth:

**Field autoplacement**, manual §2.5.4:

> "Symbol fields can be automatically moved to an appropriate location with the
> Autoplace Fields action (select a symbol and press `O`). Field autoplacement
> is configurable in the Schematic Editor's Editing Options, including a setting
> to always autoplace fields. You can also disable autoplacement for individual
> fields in the Symbol Properties or Field Properties dialogs."

**Align Elements to Grid**, manual §2.3 (grid section):

> "Symbols, wires, and other elements that are not aligned to the grid can be
> snapped back to the grid by selecting them, right clicking, and clicking
> Align Elements to Grid."

**Aligning objects**, manual §2.18:

> "The align tool moves a selection of objects so that they are all aligned with
> a reference object. There are six different alignments to choose from… To
> align objects by a given edge, select the objects, then right click and choose
> **Align/Distribute → Align to Left** (or another alignment as desired)."

**Note the wording of that last one, because it is a small, honest tell.** The
manual names the submenu **"Align/Distribute"** — but KiCad 10's schematic
editor has no distribute action (§1.1, §1.2). The menu label was carried over
from the PCB editor's equivalent. The schematic half of the feature is
**half-delivered and the documentation has not caught up.**

### 1.4 `kicad-cli` — VERIFIED

```
kicad-cli sch --help   →  {erc, export, upgrade}
kicad-cli sch export   →  {bom, dxf, hpgl, netlist, pdf, ps, python-bom, svg}
```

Eleven verbs, all of them **read-only reporting or plotting**. There is no CLI
verb that modifies a schematic's geometry at all — not a placement verb, not an
alignment verb, not even an "autoplace fields" verb. (Contrast: the PCB side's
`kicad-cli pcb` has no autorouter verb either, which is consistent with §4.)

### 1.5 Schematic DRC beyond ERC — VERIFIED, and the answer is no

The string `design rule` (any case) **does not appear in `_eeschema.kiface` at
all.** The schematic manual mentions DRC only in the sense of **net classes
carrying board rules downstream** ("Net classes are named groupings of nets that
can be assigned design rules (for the PCB)") and of the Schematic Setup dialog
editing **ERC** severities. `eeschema.InspectionTool` offers exactly four
actions: `runERC`, `checkSymbol`, `diffSymbol`, `showBusSyntaxHelp`.

**There is no geometric or presentational rule check on a schematic.** Nothing
in KiCad will tell you a wire crosses a symbol, that two labels overlap, that a
sheet is unbalanced, or that a part sits off-grid in a way that breaks nothing
electrically. The single exception is an **ERC** violation, not a DRC one, for
off-grid connection points (manual: *"This violation occurs when a symbol pin or
wire end is not aligned to the connection grid"*) — and it fires because it
breaks **connectivity**, not because it looks bad.

**This is directly load-bearing for this repository.** The project's own
`CLAUDE.md` requires that criteria for an artifact come from somewhere other
than the producing agent. KiCad supplies **no** presentational criteria for a
schematic. There is no upstream rule file to defer to. Whatever legibility
criteria this project uses, it authors them, because nobody else has.

---

## 2. What has the KiCad project SAID about schematic auto-layout?

### 2.1 Nothing — and the shape of the silence is the finding

**VERIFIED.** Searched the KiCad issue tracker (`kicad/code/kicad`, public
GitLab API, `state=all`, titles) for every phrasing I could construct:

| search (in title) | hits | schematic-layout hits |
| --- | --- | --- |
| `autoplace` | 35 | **0** (all 35 are field autoplace, sheet-pin autoplace, or *PCB* footprint autoplace) |
| `auto-place` | 10 | **0** (field auto-placer or PCB auto-place) |
| `auto layout` | **0** | 0 |
| `auto arrange` | **0** | 0 |
| `arrange` | 6 | **0** (array arrangement, PCB-from-schematic placement) |
| `tidy` | 1 | 0 (it is about `clang-tidy`) |
| `autorouter` | 5 | 0 (all PCB) |
| `distribute` | 16 | **1** — #6769, below |

**In 26,000 issues there is not one request for schematic symbol
auto-placement or schematic wire auto-routing.** Not one that was granted, and
— the part that matters for this hypothesis — **not one that was refused
either.** There is no maintainer reasoning to quote, because nobody has ever
asked. That is a very different fact from "it was tried and rejected", and the
hypothesis under test assumes the latter.

### 2.2 The nearest thing: #6769, open since 2020 — VERIFIED

**"Align and Distribute tools for Eeschema/Symbol Editor"**,
<https://gitlab.com/kicad/code/kicad/-/work_items/6769>, opened **2020-12-17**,
labels `eeschema, priority::wishlist, symbol-editor`, **still open**.

The requester asked for align + distribute on schematic pins. **Seth Hillbrand
(KiCad lead developer), 2024-10-27**, verbatim:

> "The implementation here is to duplicate the alignment functionality from the
> pcb editor/footprint editor in the schematic and symbol editors. The tool
> should be abstracted from placement_tool.cpp in pcbnew/tools into
> common/tools. The tool can share most of the code except for things like
> GetBoundingBoxes and the selection logic that gets parent items when pins/pads
> are part of the selection"

He assigned it to a contributor the same day and unassigned them **2025-05-26**.
The **align** half shipped (it is in KiCad 10 — §1.1). The **distribute** half
did not, which is why the manual's menu label promises a command that is not
there (§1.3).

**Read the ambition in that comment.** The most advanced schematic-geometry
automation the KiCad lead has ever described wanting is **porting the PCB
editor's six-way align tool.** Not a placer. Not a router. A selection-based
aligner — the kind of thing a drawing program has had since 1990 — and it took
four years to half-land.

### 2.3 What they HAVE said, about the API that would have hosted a plugin

See **§3**. The statements are there, they are substantial, and they are about
*why there is no surface*, not about layout.

---

## 3. THE PLUGIN QUESTION — can a plugin even reach the schematic editor?

**The prior under test:** *KiCad's action-plugin / Python scripting system is
PCBNEW-ONLY, and eeschema exposes no plugin API in any released version.*

**VERDICT: CONFIRMED for every released version through KiCad 10, with one
important qualification — the IPC API got a thin schematic handler in KiCad 9/10
that is too small to build on, and the real schematic API is landing in
KiCad 11 (unreleased).**

This is the most important finding in the pass.

### 3.1 The Python module does not exist — VERIFIED, decisively

The only KiCad Python module in the shipped bundle:

```
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/
  Versions/3.9/lib/python3.9/site-packages/
    pcbnew.py
    _pcbnew.so
```

**That is the entire list.** No `eeschema`, no `schematic`, no `sch`, no
`kicad_sch`. The rest of site-packages is numpy, scipy, shapely, wx, requests —
third-party dependencies, not KiCad bindings.

`eeschema/python_scripts/` in the source tree holds **16 files, all of them BOM
and netlist exporters** (`bom_csv_grouped_by_value.py`,
`netlist_form_OrcadPcb2.py`, `kicad_netlist_reader.py`, …). These are
**external processes that KiCad hands an XML netlist to**. They cannot see the
schematic's geometry, cannot modify it, and are not plugins in any meaningful
sense.

### 3.2 The action-plugin HOST exists only in pcbnew — VERIFIED

Grepping both kifaces for the action-plugin machinery:

| symbol / build path | `_pcbnew.kiface` | `_eeschema.kiface` |
| --- | --- | --- |
| `pcbnew/action_plugin.cpp` | present | — |
| `pcbnew/python/scripting/pcbnew_action_plugins.cpp` | present | — |
| `pcbnew/python/scripting/pcbnew_scripting.cpp` | present | — |
| `PYTHON_ACTION_PLUGINS`, `register_action`, `deregister_action` | present | — |
| `ACTION_PLUGIN`, `RunActionPlugin` | present | — |
| `PANEL_PCBNEW_ACTION_PLUGINS` (the preferences panel) | present | — |
| `ActionPluginButtons` (the toolbar) | present | — |

**The schematic editor contains no plugin host at all.** It is not that the host
is there and the bindings are missing; the entire subsystem is compiled into the
PCB editor only. **An in-application schematic layout plugin was structurally
impossible, not merely unwritten.**

### 3.3 The IPC API: schematic coverage per released version — VERIFIED

KiCad's SWIG replacement is a protobuf-over-named-pipe IPC API. Its proto
definitions ship in `libkiapi`. Measured:

**KiCad 10.0.5, `api/proto/schematic/`:**

| file | content |
| --- | --- |
| `schematic_commands.proto` | **866 bytes — the GPL header, `syntax = "proto3"`, `package kiapi.schematic.types;`, and NOTHING ELSE. Zero messages. Zero commands.** |
| `schematic_types.proto` | **75 lines. 7 definitions:** `enum SchematicLayer` (one member, `SL_UNKNOWN = 0`), `Line`, `Text`, `LocalLabel`, `GlobalLabel`, `HierarchicalLabel`, `DirectiveLabel` |

Independently confirmed from the shipped binary: `strings` on
`libkiapi.10.0.5.dylib` yields exactly `kiapi.schematic.types.Text` and
`kiapi.schematic.types.SchematicLayer` as the only reachable schematic symbols,
against **hundreds** of `kiapi.board.*` message names.

**There is no `Symbol` message in KiCad 10's schematic API.** A client can
describe a wire and four flavours of label. It cannot describe a part.
`eeschema/api/api_handler_sch.cpp` does register create/update/delete handlers
and does guard `SCH_SYMBOL_T`, so the plumbing is half-there — but with no
protobuf type for a symbol, **no client can place one**.

**`master` (KiCad 11 development), same paths — VERIFIED:**

| file | content |
| --- | --- |
| `schematic_commands.proto` | **2,719 bytes, 5 messages:** `GetSchematicHierarchy`, `SchematicHierarchyResponse`, `GetSchematicNetlist`, `SchematicNetlistResponse`, **`PlaceSymbolFromLibrary`** |
| `schematic_types.proto` | **~57 definitions**, including `SchematicSymbol`, `SchematicSymbolInstance`, `SchematicSymbolTransform`, `SchematicPin`, `SchematicLine`, `Junction`, `NoConnectMarker`, `BusEntry`, `SheetPin`, `SheetSymbol`, `Group`, `SchematicTable`, … |

So: **the schematic API arrives in KiCad 11.** It is not released. And note what
even the KiCad 11 command set is: `PlaceSymbolFromLibrary` places a symbol **at
a position the client computes**. KiCad 11 gives a layout engine somewhere to
put its answer. It does not contain a layout engine.

### 3.4 The maintainer's reasoning, verbatim — VERIFIED, and this is the core of the pass

Issue **#2077, "Schematic Editor Python API"**,
<https://gitlab.com/kicad/code/kicad/-/work_items/2077> — filed from Launchpad
**2017-10-28**, closed **2026-09-19**. Labels `api, eeschema, feature-request, priority::wishlist, python`.

**Jon Evans (`craftyjon`), the KiCad maintainer who owns the API, 2024-12-18.**
Asked by a user frustrated that the feature had slipped seven years of
milestones, he answered at length. The operative passage, verbatim:

> "In this case, the decision was made a while ago to focus on replacing the PCB
> editor API first, because of some unexpected complexity in enabling the API on
> the schematic editor side.
>
> To go into a bit more depth: **due to historical reasons / technical debt, it
> is not currently feasible to provide an API that allows you to work with
> schematic symbols. The other parts of a schematic are easy, but we anticipate
> that many of the use cases people have for a schematic editor API would
> require access to symbols, and I didn't feel like it was a good use of time to
> build a half-measure that allowed people to access wires and labels but not
> symbols.** The original plan was that I would build out the new API on the PCB
> side while other people on the team worked on that technical debt, but the
> technical debt hasn't been dealt with yet (because people's volunteer
> schedules changed).
>
> The first priority with the new API is to make it possible for KiCad to move
> away from using SWIG and having to bundle wxPython, both of which cause us a
> fair bit of development and packaging headache. Bringing this new style of API
> to other places in KiCad that have not had an API before is an important, but
> secondary, goal."

**That paragraph explains the KiCad 10 proto file exactly.** Wires and labels
are there; symbols are not; the maintainer says in so many words that he
declined to ship the half-measure — and the half-measure is what shipped as the
10.0 proto anyway, unused.

The same comment names the mechanism behind the whole asymmetry: **the schematic
editor's internal data model carries technical debt that makes exposing symbols
infeasible.** Not a policy. Not a judgement about automation. A data model.

He closed the issue **2026-09-19**:

> "Schematic API work is largely complete, and since some adventurous users are
> already doing testing, I'm going to call this issue closed. There are still
> things not yet in for V11 that I'm working on, but basic schematic interaction
> is done. Specific requests for additional features should be tracked in their
> own issues."

**Marek Roszko (`mroszko`), KiCad developer, 2022-08-23**, on issue #12268
("KiCAD PCB and Schematic Editor GUI control with plugin"), asked whether an
external plugin could drive both editors' GUIs:

> "With the python in pcbnew, it can do some things but your mileage will vary.
> **No such api exists at all in the schematic editor for the time being.** The
> python in pcbnew is one day getting overhauled."

That issue was closed and locked the next day.

### 3.5 Plugin authors asking, over eight years — VERIFIED

#2077's thread is a record of plugin authors hitting this wall. Quoting the
authors directly:

**`yaqwsx` (Jan Mrázek, author of KiKit — one of the best-known KiCad
plugins), 2020-12-04:**

> "I maintain KiKit. KiKit needs information from the schematics to be able to
> generate assembly files for fabhouses. Currently, I have written a simple and
> poor parser of v5 file format. I would like to have KiKit ready for the v6
> when it will be released. **I am a little confused if the scripting support
> for Eeschema will be included in v6 release. Or should I start writing
> S-expression parser for schematics files?**"

The answer he got from another community member was *"You could reuse an
S-expression parser rather than writing your own"*. **That is the whole
ecosystem in one exchange: the schematic has no API, so every tool writes its
own s-expression parser.** Which is exactly what this repository's own
`2026-10-28-agent-kicad-surfaces.md` found from the other end, surveying
`kicad-skip`, `kicadts`, `kiutils` and `_cst.py` — four independent
s-expression editors, because there was never an alternative.

**`yaqwsx` again, 2022-09-15**, after Seth Hillbrand said the feature would
likely slip again:

> "Do you think that it is realistic to get both eeshema API and the new pcbnew
> API in v8? **I offered my help several times on the developer list with
> API-related development. I was asking what is needed the most or where is the
> best place to participate to help the most. But I never got an answer.** What
> can we, as a community, do to help you to get proper KiCAD API?"

**`bsder`, 2020-10-26**, wanting a "Sort Designator by PCB Position" plugin,
blocked on the same thing.

**On the forum — RELAYED** (fetched via the Discourse search API; these are
community moderators and long-time contributors, not maintainers, and I read
only the search blurbs):

- 2019-03-11, on importing a netlist into a schematic: *"This will be difficult
  with the current way Eeschema works. First, **there is no scripting API in
  Eeschema** yet so you would have to directly write the schematic file outside
  of Eeschema."*
- 2020-06-19, on snapping everything back to grid: *"Also there sadly is **no
  scripting API in eeschema**."*
- 2018-09-10, on dragging symbols while maintaining connectivity: *"**There is
  no API access for eeschema currently**, the equivalent function would need to
  be done by the script."*

Three independent people, across two years, answering three unrelated
questions, all stopped by the same wall.

### 3.6 Why this matters more than the layout question

**The absence of KiCad schematic auto-layout has a sufficient explanation that
has nothing to do with whether auto-layout works.** For KiCad's entire history
until version 11, an author who had a working schematic placer had three
options: fork KiCad in C++, write an s-expression editor outside it, or give up.
The first requires becoming a KiCad developer; the second is what everyone did;
the third is what most did.

**Note the one-way asymmetry this produces in the plugin ecosystem**, which
§4.4 of the PCB contrast makes concrete: there are plugins that read the
schematic to place the *PCB*, because the schematic is readable as a file and
the PCB is writable through an API. There are none going the other way.

---

## 4. Contrast with the PCB side

### 4.1 The measured gap

| | schematic editor | PCB editor |
| --- | --- | --- |
| tool actions (KiCad 10.0.5 binary) | **230** | **371** |
| source files (ref `10.0`) | 863 | 1457 |
| Python module | **none** | `pcbnew.py` + `_pcbnew.so` |
| action-plugin host | **none** | `ACTION_PLUGIN`, `PYTHON_ACTION_PLUGINS`, prefs panel, toolbar |
| IPC proto: commands | **0 messages** (10.0); 5 on `master` | ~dozens, `kiapi.board.commands.*` |
| IPC proto: types | **7** (10.0); ~57 on `master` | hundreds, `kiapi.board.types.*` |
| automatic placement | field text, sheet pins | **`Autoplacer.autoplaceSelected`, `Autoplacer.autoplaceOffboard`** (`autorouter/ar_autoplacer.cpp`) |
| interactive routing | — | **`InteractiveRouter.*`, 20+ actions**, push-and-shove (`router/pns_*`) |
| autoroute | — | `InteractiveRouter.Autoroute` ("Attempt Finish Selected (Autoroute)") |
| external router integration | **none** | Specctra DSN export / SES import; `"Copper layer type for Freerouter and other external routers."` |
| align | 6 actions | 6 actions |
| **distribute** | **0 actions** | **4 actions** |
| geometric rule check | **none** (ERC only) | full DRC engine with a rule language |

The `specctra`/`freerout`/`autorout` strings return **nothing** from
`_eeschema.kiface` and **sixteen** hits from `_pcbnew.kiface`. The asymmetry is
not subtle and it is not a matter of degree.

### 4.2 The stated reason for the asymmetry

**It is the API ordering and the data-model debt of §3.4, in the maintainer's
words, and nothing else was ever offered.** No maintainer has said schematic
automation is undesirable, out of scope, or unworkable. They said the schematic
editor could not be reached, and that fixing it was behind the SWIG removal in
priority.

### 4.3 And the PCB side is not the counter-example the hypothesis needs — VERIFIED

This is the finding that breaks the hypothesis on its own terms.

**Issue #2264, "Autorouting"** (from Launchpad 2018-10-14). **Jeff Young
(`jeffyoung`), KiCad developer, closing it 2021-10-21:**

> "I can see some justification for keeping this open so others don't report it,
> but...
>
> 1) it hasn't collected any up-votes in two years, so that doesn't seem to be
> much of an issue, and...
>
> 2) **we aren't going to implement it anyway.**
>
> So I'm closing it."

**Issue #25885** (2026-10-21, one week before this pass) proposed exactly the
thing: a C++ translation of Freerouting integrated into the PCB editor, code
complete, tested on five platforms, 244 replay cases. **Marek Roszko rejected
it the same day**, on grounds that have nothing to do with whether it works:

> "You lack the knowledge of the freerouting history.
>
> The original author of freerouting got legal action taken against the codebase
> by their former employer, who claimed the auto router was owned by them as
> they were also a CAD company. Said company still exists, that author walked
> away from the code with no mention of resolution.
>
> **The free routing codebase thus remains in copyright dispute and is not
> really GPL other than wishful thinking right now.**
>
> We cannot touch said codebase or it's derivatives without the resolution to
> the original legal claim."

**So KiCad does not ship a PCB autorouter either** — not because PCB
autorouting fails (Freerouting is in daily use, and the PCM hosts three more
autorouters, §5.2) but for a licence dispute and an earlier flat declination.
And KiCad *did* ship one once: forum participants report (**RELAYED**, from the
Discourse search index) that *"KiCad previously had a basic autorouter in
versions 3/4"* that *"was removed as it was not of very good quality"*.

**The inference the hypothesis wants to make — "KiCad does not have it,
therefore it does not work" — is refuted on a case where the thing demonstrably
works.** KiCad's revealed preference is for interactive tools with the operator
in the loop. That preference, not an evidential judgement about algorithms, is
what the absence measures.

### 4.4 What the practitioners say about automatic *placement* — RELAYED

The forum thread *"Where to discuss autorouter/placer?"* (2021-01-26) is the one
place the community argued it out. These are moderators and long-time
contributors, not maintainers, and I read a fetched summary rather than the raw
thread, so **RELAYED**:

- `retiredfeline` (moderator): autoplacement is hard because *"there are factors
  that cannot be expressed mathematically, e.g. external constraints on
  component position."*
- `halachal`: *"there is SO MUCH KNOWLEDGE about the design and constraints of
  the system that isn't and never will be contained in the pcb layout file."*
- `qu1ck`: *"Place components in an efficient manner? Virtually impossible
  because information is not there."*
- `John_Pateman`, bringing it back to the schematic: *"How do you indicate
  placement in your schematic?"*

**Read that last one carefully, because it cuts both ways and the second way is
the interesting one.** Their objection to PCB autoplacement is that **the input
file does not carry the designer's intent.** A schematic generated from a model
that *does* carry declared intent — blocks, signal flow, declared ports — is not
the case they are describing. Their argument is about information, not about
algorithms, and it is an argument about `.kicad_pcb` files.

---

## 5. Third-party and PCM tooling: is there any schematic auto-layout?

### 5.1 The official PCM registry: 136 packages, zero — VERIFIED

Enumerated every package in the official addon registry
(`gitlab.com/kicad/addons/metadata`, `packages/` tree) and fetched all 136
`metadata.json` files. **0 fetch errors.** Searched every name, description and
keyword field for `schematic, eeschema, sch, symbol, autoplace, auto-place,
layout, arrange, tidy, align, placement, route, wire, netlist, generate` —
79 packages matched at least one term.

**Not one of the 136 does schematic placement, schematic wire routing, or
schematic tidying.** The matches sort into four groups:

1. **Schematic-as-input, PCB-as-output** — the schematic is read to arrange
   *footprints*. `com.github.sagarHackeD.PlaceBySchKiCad` ("place footprints in
   PCB from schematic positions"), `com.github.gauravmm.hierarchicalpcb`
   ("Enforce sub-PCB layouts for sub-schematics"),
   `com.github.ducky64.SubLayout`, `com.github.MitjaNemec.ReplicateLayout`,
   `com.github.MitjaNemec.SaveRestoreLayout`,
   `com.github.mey-26.kicad-layout-clone`,
   `com.github.MitjaNemec.PlaceFootprints`. **Seven plugins, all running
   schematic → PCB, none running schematic → schematic.** §3.6 explains why:
   that is the only direction the APIs allowed.
2. **PCB autorouters** — `app.freerouting.kicad-plugin`,
   `com.github.bbenchoff.orthoroute` (GPU PathFinder),
   `com.github.michaelgaylor.tracklayer`,
   `com.github.drandyhaas.kicadroutingtools` (Rust A*),
   `vn.thanhduongvs.fanout-tool`. **Five.** The PCB side has a competitive
   market in automated routing inside the PCM; the schematic side has nothing.
3. **Schematic content, not schematic geometry** —
   `com.github.Sajitha-Aldeniya.KiCAD-Schematic-Blocks-Plugin` (save/reuse
   circuit blocks: copy-paste, the operator places them),
   `com.github.MitjaNemec.SwapStubs`,
   `com.github.officialdyray.projectinstances`,
   `com.github.kerstensrobin.kicad-breadboard` (places parts on a *virtual
   breadboard*, not on a sheet), `com.github.jarrettr.stretch` ("KiCad to SVG
   and then back again").
4. **Libraries, colour themes, fab-house uploaders, BOM and report generators** —
   the bulk.

**The search that would have found one.** If a schematic auto-layout addon
existed in the PCM, its metadata would have to avoid *all fourteen* of
`schematic, eeschema, sch, symbol, autoplace, auto-place, layout, arrange, tidy,
align, placement, route, wire, generate` to escape this net, which is not a
describable plugin. **The absence is real.**

### 5.2 Outside the PCM — VERIFIED searches, small positive, informative

GitHub repository search (public API, sorted by stars):

| query | total_count | relevant |
| --- | --- | --- |
| `kicad schematic autoplace` | **0** | — |
| `kicad_sch generator` | **0** | — |
| `kicad eeschema plugin` | 2 | neither does layout |
| `eeschema layout` | 1 | not relevant |
| `kicad schematic placement` | 34 | 3, all below |
| `kicad schematic layout` | 597 | 0 doing schematic layout |
| `netlist to schematic` | 59 | 2, below |
| `schematic autolayout` | 2 | `tscircuit/schematic-autolayout` (4★) |

**`kicad schematic autoplace` returns literally zero repositories on GitHub.**

What does exist, with stars and last push, because the numbers are the point:

| repo | ★ | pushed | what |
| --- | --- | --- | --- |
| `tpecar/nl2sch` | 19 | **2021-02-08** | "Netlist to KiCad schematic" — the oldest serious attempt, dormant five years |
| `tscircuit/schematic-autolayout` | 4 | 2026-08-19 | autolayout algorithms for tscircuit schematics |
| `arashmparsa/KICAD-autowire` | **0** | 2025-10-13 | "analyzes connectivity → optimizes placement → wires with strategy" |
| `anbu-05/kicad-schematic-tidy` | **0** | 2026-10-25 | "A Codex skill for tidying existing KiCad schematic sheets with six presentation and connectivity rules" |
| `d-e-e-p/schematic-from-netlist` | **0** | 2025-11-13 | "auto gen schematic and layout from netlist" |
| `kidmosey/SchGen` | **0** | 2026-06-03 | "YAML → KiCad 10 schematic + initial PCB generator" |
| `mikelenko/SolverSCH` | **0** | 2026-03-30 | "Python-based circuit solver and KiCad schematic auto-generator" |

**Every single one is an external file manipulator. Not one is a KiCad plugin.**
That is §3 restated as an ecosystem census: the architecture forced everyone
outside the application, and once outside, nobody accumulated users.

**And the shape of that table is itself a finding.** The only KiCad schematic
auto-layout work with any momentum is **zero-starred, dated 2025-2026, and
agent-adjacent** — written by people doing what this project is doing, in the
last twelve months, since LLM agents made generating a schematic a thing anyone
wanted. Before that, there is `nl2sch` at 19 stars and five years idle.

**There is no mature, maintained, adopted schematic auto-layout tool for KiCad
to adopt.** (The repository's `docs/schematic/generation-prior-art*.md` and
`elk-spike.md` have already run the *engines* — ELK, schematizer, Weave,
netlistsvg — on this project's own circuits. Those documents are the measured
record; this section is a census of the KiCad-specific tooling around them, and
it finds the same void from the registry side.)

---

## 6. Historical note: did any EDA tool ever ship schematic auto-layout?

*A parallel research pass covered the commercial and historical EDA tools
(OrCAD/Cadence, Altium/Protel, Mentor, Viewlogic, Zuken, and the
HDL-to-schematic viewers in Vivado/Quartus/Design Vision). Its findings are
recorded separately and are not duplicated here. The relevant bearing on the
hypothesis is in §7.*

---

## 7. What this means for the hypothesis, stated plainly

**"If schematic auto-layout tooling that actually worked existed, KiCad would
have it" is FALSE.** Three independent reasons, each sufficient:

1. **KiCad had no schematic plugin surface to host it.** No Python module, no
   action-plugin host, and an IPC schematic API with **zero commands and no
   symbol type** through KiCad 10. The maintainer's stated cause is
   **data-model technical debt**, not a judgement about automation: *"it is not
   currently feasible to provide an API that allows you to work with schematic
   symbols."* The request sat nine years. KiCad 11 is the first release where
   such a plugin becomes possible at all.

2. **Nobody ever asked, so nothing was ever refused.** Zero issues in 26,000
   requesting schematic symbol auto-placement or wire auto-routing. The
   hypothesis needs a refusal to draw its inference from. There is none. The
   nearest request is a **six-way align tool**, open since 2020, half-shipped.

3. **KiCad also does not ship PCB autorouting, which works.** *"we aren't going
   to implement it anyway."* The project declines automation it could have; the
   absence measures its preference for interactive tools, not the state of the
   art.

**What the pass does NOT establish, and must not be read as establishing.** None
of this is evidence that schematic auto-layout *does* work. §5.2 is a thin
field: zero-starred repositories, one dormant 19-star project, nothing mature.
The honest reading is that **KiCad's silence carries no information either
way** — and that the question of whether an engine produces readable sheets has
to be settled by measuring engines on real circuits, which is what
`docs/schematic/elk-spike.md`, `generation-prior-art*.md` and `m1-remeasurement.md`
did and what any future pass must do.

**Three things this pass found that bear directly on the project's own work:**

- **KiCad supplies no presentational criteria for a schematic** (§1.5). No
  geometric DRC, no legibility check, no off-grid-but-connected warning. The
  only schematic check in KiCad is ERC, and it fires on connectivity. There is
  no upstream rule file to defer to; the criteria this project is held to, it
  authors.
- **`kicad-cli` cannot modify a schematic** (§1.4). Eleven verbs, all read-only.
  It is a verifier, never a mutator — which is exactly the role
  `2026-10-28-agent-kicad-surfaces.md` assigned it independently.
- **KiCad 11's `PlaceSymbolFromLibrary` takes a position from the client**
  (§3.3). When KiCad finally opens the schematic editor to plugins, it provides
  the socket and not the engine. Whatever computes the position still has to
  exist somewhere else.

---

## 8. Reproducing every measurement in this document

```
K=/Applications/KiCad/KiCad.app/Contents
P=kicad%2Fcode%2Fkicad

# §1.1  the complete eeschema action inventory (230)
strings -a $K/PlugIns/_eeschema.kiface \
  | grep -Eo '^eeschema\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$' | sort -u

# §1.1 / §4.1  the pcbnew inventory (371), and the Autoplacer/InteractiveRouter groups
strings -a $K/PlugIns/_pcbnew.kiface \
  | grep -Eo '^pcbnew\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$' | sort -u

# §1.5  no design rules in the schematic editor (expect no output)
strings -a $K/PlugIns/_eeschema.kiface | grep -Ei 'design rules?'

# §3.1  the only KiCad Python module (expect pcbnew.py and _pcbnew.so, nothing else)
ls $K/Frameworks/Python.framework/Versions/3.9/lib/python3.9/site-packages \
  | grep -iE 'kicad|pcbnew|eeschema|sch'

# §3.2  the action-plugin host exists in one kiface only
strings -a $K/PlugIns/_pcbnew.kiface   | grep -c 'PYTHON_ACTION_PLUGINS'
strings -a $K/PlugIns/_eeschema.kiface | grep -c 'PYTHON_ACTION_PLUGINS'

# §3.3  the KiCad 10 schematic IPC surface, from the shipped binary
strings -a $K/Frameworks/libkiapi.10.0.5.dylib | grep -i 'schematic\.' | sort -u

# §3.3  the same, from upstream source, 10.0 vs master
for R in 10.0 master; do
  for F in schematic_commands schematic_types; do
    curl -s "https://gitlab.com/api/v4/projects/$P/repository/files/api%2Fproto%2Fschematic%2F$F.proto/raw?ref=$R" \
      | grep -cE '^(message|enum|service) '
  done
done

# §1.2 / §4.1  the source-tree file census
curl -s "https://gitlab.com/api/v4/projects/$P/repository/tree?path=eeschema&ref=10.0&recursive=true&per_page=100"

# §2.1  the issue searches (substitute each keyword)
curl -s "https://gitlab.com/api/v4/projects/$P/issues?search=autoplace&in=title&state=all&per_page=60"

# §2.2 / §3.4 / §4.3  the maintainer quotes (notes need GraphQL; the REST notes
# endpoint returns 401 unauthenticated, the public GraphQL endpoint does not)
curl -s -X POST https://gitlab.com/api/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{project(fullPath:\"kicad/code/kicad\"){issue(iid:\"2077\"){discussions{nodes{notes{nodes{author{username} body createdAt system}}}}}}}"}'
```

For **§5.1**, the PCM enumeration walks
`https://gitlab.com/api/v4/projects/kicad%2Faddons%2Fmetadata/repository/tree?path=packages`
and fetches `packages/<id>/metadata.json` for each of the 136 entries.

**The one gap in reproducibility, recorded rather than hidden.** GitLab's REST
`issues/:iid/notes` endpoint returns `401 Unauthorized` on this public project,
so every maintainer quote in §2.2, §3.4 and §4.3 came through the **public
GraphQL endpoint** instead. I read the `body` field as returned by the API; I
did not render the issue pages. The quotes are therefore VERIFIED as
API-returned text, and anyone re-checking them should use the GraphQL call above
rather than the REST one.

The forum material in §3.5 and §4.4 came through the Discourse **search** API
and a summarising fetch respectively, not from reading the raw threads, which is
why it is labelled RELAYED.
