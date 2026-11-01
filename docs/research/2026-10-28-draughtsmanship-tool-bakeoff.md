# Draughtsmanship tool bakeoff, 2026-10-28

**This is a RUN report, not a survey.** Every tool below was installed and
executed against real files from this repository on this machine. Where a claim
is relayed rather than measured, it says so in the clause that makes it.

**The question.** What can this repository REUSE, today, for schematic
DRAUGHTSMANSHIP — how a schematic is drawn and how it is judged? Explicitly NOT
circuit generation: connectivity is assumed given.

## Environment

| | |
|---|---|
| Repo | `/Users/orion/work/audio-circuits-work/pultec-modularize` (worktree, branch `feature/schematics-tooling`) |
| KiCad | 10.0.5 at `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` |
| Schematic format | `(version 20260306)` — confirmed by reading the token out of both subjects |
| Node | v22.19.0, npm 11.5.2 |
| Python | 3.14.6, venv at `<scratchpad>/venv` (nothing installed into the repo) |

**Test subjects**, regenerated with `bun tools/schgen/board-sheets.ts` at the
start of the run:

| Board | Root sheet sha256 | Content |
|---|---|---|
| `build/schgen-boards/pultec-low-boost/low-boost.kicad_sch` | `03028122280d423fe77b7422deebf44753bbd71576f1f9514b0560355155f210` | 22 symbols, 109 wires, 14 junctions, 13 global labels, 6 texts |
| `build/schgen-boards/transistor-preamp-lab/transistor-preamp-lab.kicad_sch` | `d64d8b30292b0cbc89c516b7eae3151e4650e5e0d8d59884764643feb4cea526` | 39 symbols, 132 wires, 19 junctions, 14 global labels |

A third subject was added as a control: `circuits/pultec/pultec-three-band-eq.kicad_sch`,
a **hand-drawn** sheet that no generator here produced. It is the right file to
separate "checks geometry" from "checks my own conventions". It was read only;
nothing under `circuits/` or `lib/` was modified.

---

## The headline, before the detail

1. **copperhead's legibility checker IS reusable as a standalone gate on an
   arbitrary `.kicad_sch`.** Its public entry point takes a file path, reads the
   file, and returns findings. No project, no config, no copperhead pipeline, no
   network, no LLM, no subprocess. Verified read-only by sha256. **This is the
   single highest-value result in the run.**
2. **kicad-sch-api CORRUPTS our KiCad 10 files on a no-op round trip.** It
   silently drops **every `global_label`**, and KiCad's own netlist exporter
   then reports the named nets gone and eleven pins newly unconnected. It logs
   `Successfully parsed schematic` and raises nothing. **Do not adopt it for
   anything that writes.**
3. **There IS a third standalone checker and it is the best fit of the three:**
   `rashuky/kicad-sch-lint` (MIT, pure Python, zero dependencies for `lint`),
   19 check codes, built for KiCad 10, with a `fix` that re-places fields and
   **rolls back on any kicad-cli netlist change**. It took
   `transistor-preamp-lab` from 2 errors to **0** — confirmed independently by
   copperhead — with the netlist provably unchanged. Its risk is social, not
   technical: 0 stars, 0 forks, one author, all commits on one day.
4. **Two external tools independently contradict this repo's own
   `STATUS.md`.** `build/schgen-boards/pultec-low-boost/STATUS.md` says
   *"USABLE … No findings: every gate this generation ran passed."* copperhead
   finds 8 errors on that file; kicad-sch-lint finds 9 errors and 2 warnings.
   This is not a tool disagreement — our own `RENDER-REPORT.md` states the cause
   in writing (§4 below).

---

## 1. copperhead — `copperheadhq/copperhead`

### What it is

| | |
|---|---|
| Repo | https://github.com/copperheadhq/copperhead |
| Licence | **Apache-2.0** (confirmed: `LICENSE` is the Apache 2.0 text) |
| Stars / forks | 666 / 139 (GitHub API, 2026-10-28) |
| Language | TypeScript, `"type": "module"`, Node >= 20 |
| Created / pushed | 2026-07-18 / 2026-10-28 |
| Releases | v0.12.0 (2026-10-15), v0.11.0, v0.10.0, v0.9.0, v0.8.1 |
| Open issues | 275 |
| Contributors | `animesh-chouhan` 324 commits, then 27, 16, 8, 7, 7, 7, 6, 5, 4 |
| Activity | `stats/participation`, last 15 weeks: `…53, 154, 58, 44, 0, 7, 10, 34, 13, 4, 43, 0, 0, 3, 1` |

Activity reading: a very heavy summer, a real tail-off. The last three weeks are
`0, 3, 1`. The default-branch HEAD in a `--depth 50` clone is `476cc15`
(2026-10-22). Not dead, not thriving. 275 open issues is a lot for 666 stars.

### THE QUESTION: standalone gate, or only its own pipeline?

**ANSWER: STANDALONE. Decisively.** Two independent proofs.

**Proof 1 — the shipped CLI has a flag for exactly this.** `src/cli.ts`:

```
scoreGroup
  .command('schematic')
  .option('--file <path>', 'score this .kicad_sch instead of the configured schematic (any sheet, no repo needed)')
```

Run verbatim:

```
$ npx tsx src/cli.ts score schematic --file .../build/schgen-boards/pultec-low-boost/pultec-low-boost.kicad_sch
score: 40/100
  cap: 40 — 9 error-severity legibility finding(s) cap the composite below the known-good floor (85)
  pin-attachment: raw 0.8667, score 0.963, weight 10, contributes 8.37
  island-parts: raw 0.0667, score 0.667, weight 5, contributes 2.9
  wire-crossings: raw 5, score 0.167, weight 10, contributes 1.45
  wire-bends: raw 54, score 0.129, weight 5, contributes 0.56
  wire-length: raw 1247.14, score 0.538, weight 5, contributes 2.34
  label-to-wire-ratio: raw 0.1193, score 1, weight 5, contributes 4.35
  group-cohesion: raw 130.9868, score 0.64, weight 10, contributes 5.56
  flow-direction: raw 4, score 0, weight 10, contributes 0
  utilization: raw 1, score 1, weight 10, contributes 8.7
  axis-alignment: raw 0.5789, score 0.579, weight 10, contributes 5.03
  spacing-uniformity: raw 0.8367, score 0.837, weight 10, contributes 7.28
  straight-wire-ratio: raw 0.5046, score 0.505, weight 5, contributes 2.19
  label-alignment: raw 0.6154, score 0.615, weight 5, contributes 2.68
  whitespace-balance: raw 0.1998, score 0.8, weight 10, contributes 6.96
  pair-symmetry: raw 0, score 0, weight 5, contributes 0
wiring style: 84.12/100 (convention-free, never capped)
  pin-attachment: raw 0.8667, score 0.963, weight 30
  island-parts: raw 0.0667, score 0.667, weight 20
  power-symbol-economy: raw 0.1579, score 1, weight 15
  labels-per-part: raw 0.6842, score 1, weight 15
  crossings-per-wire: raw 0.0459, score 0.686, weight 10
  straight-wire-ratio: raw 0.5046, score 0.505, weight 10
```

**Proof 2 — the library function is a one-liner to drive.** The whole driver
(`<scratchpad>/copperhead/standalone-gate.ts`) is:

```ts
import { checkLegibility, formatLegibility, LEGIBILITY_FAMILIES } from './src/kicad/legibility.js';
const report = await checkLegibility(f, { docsDir: null });
console.log(formatLegibility(report));
```

`checkLegibility(rootSch: string, opts)` reads the file via `readSheetGeometry`
in `sexp.ts` and follows hierarchical child sheets. Its own module comment:

> *Deterministic read-only legibility checker (design C1-C9). Pure geometry over
> the sexp accessors: no serialization, no file writes, no subprocess, no
> network, no LLM.*

That comment is a claim, so it was tested: sha256 of every input was taken
before and after. All three unchanged.

### VERBATIM OUTPUT — pultec-low-boost

```
families (13): off-grid, symbol-overlap, text-collision, wire-through-symbol, out-of-frame, ungrouped-symbol, unlabeled-group, group-overlap, empty-title-block, label-orientation, low-utilization, crowding, cross-group-wire

===== build/schgen-boards/pultec-low-boost/pultec-low-boost.kicad_sch =====
legibility: 9 error, 4 advisory finding(s) across 2 sheet(s):
  1. [error] text-collision @ Pultec low-boost section board (35.56, 75.95) refs: C3 Value — C3 Value text sits on a wire; move the text off the wire
  2. [error] text-collision @ Pultec low-boost section board (34.8, 53.34) refs: C4 Reference — C4 Reference text sits on a wire; move the text off the wire
  3. [error] text-collision @ Pultec low-boost section board (34.8, 55.88) refs: C4 Value — C4 Value text sits on a wire; move the text off the wire
  4. [error] text-collision @ Pultec low-boost section board (34.8, 41.91) refs: C5 Reference — C5 Reference text sits on a wire; move the text off the wire
  5. [error] text-collision @ Pultec low-boost section board (34.8, 44.45) refs: C5 Value — C5 Value text sits on a wire; move the text off the wire
  6. [error] text-collision @ Pultec low-boost section board (34.8, 33.02) refs: C6 Value — C6 Value text sits on a wire; move the text off the wire
  7. [error] text-collision @ Pultec low-boost section board (189.23, 123.19) refs: SI6 Reference — SI6 Reference text sits on a wire; move the text off the wire
  8. [error] empty-title-block @ / (287, 200) refs: revision, date — title block has empty revision, date field(s)
  9. [error] empty-title-block @ Pultec low-boost section board (410, 287) refs: revision, date — title block has empty revision, date field(s)
  10. [advisory] cross-group-wire @ Pultec low-boost section board (207.65, 111.76) refs: Stand-in group for the absent hi-cut section, (unlabeled) — a 97.79mm wire on net (unlabeled) exceeds the 50.8mm maximum; shorten the route or use a net label pair
  11. [advisory] cross-group-wire @ Pultec low-boost section board (221.62, 179.07) refs: Junction bus, out — a 52.07mm wire on net out exceeds the 50.8mm maximum; shorten the route or use a net label pair
  12. [advisory] cross-group-wire @ Pultec low-boost section board (64.77, 66.04) refs: low-boost section, (unlabeled) — a 68.58mm wire on net (unlabeled) exceeds the 50.8mm maximum; shorten the route or use a net label pair
  13. [advisory] cross-group-wire @ Pultec low-boost section board (102.24, 24.13) refs: low-boost section, out — a 52.07mm wire on net out exceeds the 50.8mm maximum; shorten the route or use a net label pair
  note: caption-validation skipped (no docs directory provided; group captions not validated against docs)
sheets=2 errors=9 advisories=4
```

### VERBATIM OUTPUT — transistor-preamp-lab

```
===== build/schgen-boards/transistor-preamp-lab/transistor-preamp.kicad_sch =====
legibility: 4 error, 3 advisory finding(s) across 2 sheet(s):
  1. [error] text-collision @ Transistor preamp lab board (100.71, 150.88) refs: C3 Value — C3 Value text sits on a wire; move the text off the wire
  2. [error] text-collision @ Transistor preamp lab board (39.37, 121.92) refs: JP5 Reference — JP5 Reference text sits on a wire; move the text off the wire
  3. [error] empty-title-block @ / (287, 200) refs: revision, date — title block has empty revision, date field(s)
  4. [error] empty-title-block @ Transistor preamp lab board (410, 287) refs: revision, date — title block has empty revision, date field(s)
  5. [advisory] low-utilization @ Transistor preamp lab board (126.37, 100.96) refs: Transistor preamp lab board — content occupies 0.36 of the usable frame (threshold 0.5); paper "B" would fit this content
  6. [advisory] cross-group-wire @ Transistor preamp lab board (109.22, 137.8) refs: Common-emitter stage, coupling, headers and test points, (unlabeled) — a 52.07mm wire on net (unlabeled) exceeds the 50.8mm maximum; shorten the route or use a net label pair
  7. [advisory] cross-group-wire @ Transistor preamp lab board (93.98, 148.59) refs: Common-emitter stage, coupling, headers and test points, (unlabeled) — a 53.34mm wire on net (unlabeled) exceeds the 50.8mm maximum; shorten the route or use a net label pair
  note: caption-validation skipped (no docs directory provided; group captions not validated against docs)
sheets=2 errors=4 advisories=3
```

### Read-only proof and family census

Verbatim from `<scratchpad>/copperhead/gate-configured.ts`:

```
===== build/schgen-boards/pultec-low-boost/low-boost.kicad_sch =====
sha256 before: 03028122280d423fe77b7422deebf44753bbd71576f1f9514b0560355155f210
sha256 after:  03028122280d423fe77b7422deebf44753bbd71576f1f9514b0560355155f210
READ-ONLY: YES (unchanged)
family census (uncapped, all families on):
  off-grid: 0          symbol-overlap: 0     text-collision: 7
  wire-through-symbol: 0   out-of-frame: 0   ungrouped-symbol: 0
  unlabeled-group: 0   group-overlap: 0      empty-title-block: 1
  label-orientation: 0 low-utilization: 0    crowding: 0
  cross-group-wire: 4
all-families:  8 error / 4 advisory
4-off config:  7 error / 4 advisory  (disabled: ungrouped-symbol, unlabeled-group, group-overlap, empty-title-block)

===== build/schgen-boards/transistor-preamp-lab/transistor-preamp-lab.kicad_sch =====
READ-ONLY: YES (unchanged)
  text-collision: 2   empty-title-block: 1   low-utilization: 1   cross-group-wire: 2
all-families:  3 error / 3 advisory
4-off config:  2 error / 3 advisory

===== circuits/pultec/pultec-three-band-eq.kicad_sch =====   (HAND-DRAWN CONTROL)
READ-ONLY: YES (unchanged)
  text-collision: 28   ungrouped-symbol: 73   low-utilization: 1   cross-group-wire: 5
all-families:  40 error / 6 advisory
4-off config:  20 error / 6 advisory
```

### The 13 families, and which of them are convention-dependent

`LEGIBILITY_FAMILIES` in `src/kicad/legibility.ts`, with the shipped default
severity:

| # | Family | Default severity | Convention-free? | What it means |
|---|---|---|---|---|
| 1 | `off-grid` | error | **yes** | a pin tip, wire end or label not on `gridPitch` (default 1.27 mm) |
| 2 | `symbol-overlap` | error | **yes** | two symbol *bodies* overlap (pins excluded — see §2's false-positive) |
| 3 | `text-collision` | error | **yes** | visible text over a wire, another text, or a symbol body |
| 4 | `wire-through-symbol` | error | **yes** | a wire segment crosses a symbol body it does not terminate on |
| 5 | `out-of-frame` | error | **yes** | an item outside the frame inset (10 mm) or inside the 110×34 mm title block |
| 6 | `ungrouped-symbol` | error | **NO** | a non-power symbol inside no group rectangle |
| 7 | `unlabeled-group` | error | **NO** | a rectangle with no caption in its top band |
| 8 | `group-overlap` | error | **NO** | two group rectangles overlap |
| 9 | `empty-title-block` | error | **NO** | `rev` / `date` / `company` empty (this is the `G245` shape — a purchasing/admin demand gating a drawing) |
| 10 | `label-orientation` | advisory | **yes** | a label's text points back across the wire it anchors to |
| 11 | `low-utilization` | advisory | mostly | content occupies < 0.5 of the usable frame; names a smaller paper that fits |
| 12 | `crowding` | advisory | **yes** | items closer than `minPitch` (default 2.54 mm) |
| 13 | `cross-group-wire` | advisory | partly | a wire longer than `maxWireLength` (default 50.8 mm); names the groups it spans |

**The group convention is one sentence, and this repo already satisfies it by
accident.** `legibility.ts:464`: a group is a sheet `rectangle` with a non-hidden
`text` inside it whose `y` is within the top `min(height*0.25, 10)` mm.
`schgen` already draws exactly that, which is why families 6-8 scored **zero** on
both generated boards and 73 on the hand-drawn one. That number is the price of
pointing it at a sheet with no group boxes.

**All four convention-dependent families switch off through the public API** —
proved above, `disabled: ungrouped-symbol, unlabeled-group, group-overlap,
empty-title-block`. With them off, the checker is pure geometry.

### Is the drafting engine a PLACES-ROW tool?

**YES — it decides layout itself and an agent cannot drive the placement.**
`src/kicad/draft/ir.ts` module comment, verbatim:

> *The netlist-intent IR (`schematic.intent.json`): the compact declarative
> input the model authors instead of geometry (design D5/D6). **No coordinates,
> ever — the engine computes every position.** Re-drafting the same IR fully
> regenerates the sheet.*

The entire input surface is `parts[] {ref, libId, value, footprint?, group}`,
`nets[] {name, pins[], kind?}`, `noConnect[]`, and three `hints`:
`groupOrder`, `paper`, `date`. `engine.ts` is 365 KB. **Nothing here is useful to
this repo**, which already has its own placer and which (per `CLAUDE.md`) wants
agents doing the placing against criteria they did not author.

### What is actually worth taking

**The checker, not the engine.** Vendoring closure for `checkLegibility`, with
**zero npm dependencies** (only `node:fs/promises`, `node:fs`, `node:path`):

| File | Lines |
|---|---|
| `src/kicad/legibility.ts` | 743 |
| `src/kicad/sexp.ts` | 687 |
| `src/kicad/strokefont.ts` | 115 |
| `src/kicad/score.ts` (optional, for the scores) | 501 |
| **total** | **2046** |

Plus one type import, `LegibilityUserConfig` from `../config.js`.

**And there is a second, under-advertised prize: the `style` sub-score.**
`score.ts:29`, verbatim:

> *Wiring style, scored without the drafting standard's conventions. The
> composite above needs group boxes, captions and a title block, so a
> hand-drawn sheet that lacks them is capped at 40 whatever its craft. This
> block measures only how the parts connect — the thing a reader of any
> schematic judges first — and is never capped, so an engine draft and the
> human drawing of the same circuit compare on one scale.*

Its six metrics — `pin-attachment`, `island-parts`, `power-symbol-economy`,
`labels-per-part`, `crossings-per-wire`, `straight-wire-ratio` — are exactly the
"one scale for a hand drawing and a generated one" that this repo keeps needing
and has no instrument for.

---

## 2a. kicad-sch-api (PyPI) — **A MEASURED, SEVERE NEGATIVE**

| | |
|---|---|
| PyPI | `kicad-sch-api` **0.5.6** (installed; its `__init__.py` reports `__version__ = "0.5.5"` — an internal inconsistency) |
| Repo | https://github.com/circuit-synth/kicad-sch-api |
| Licence | MIT |
| Stars / forks | 57 / 19 |
| Created / **pushed** | 2025-08-13 / **2025-12-05 — almost eleven months stale** |
| Open issues | 15 |
| Summary | *"Professional KiCAD schematic manipulation library with exact format preservation"* |

### The test

Load and `save()` with the default `preserve_format=True`, touching nothing.
Compare sha256, byte length, and a census of `(token` counts.

### VERBATIM OUTPUT

```
===== build/schgen-boards/pultec-low-boost/low-boost.kicad_sch =====
format version: 20260306
sha256 before: 03028122280d423fe77b7422deebf44753bbd71576f1f9514b0560355155f210  (79202 bytes)
loaded: 22 components
sha256 after:  a6cea5469c85f87ed3fafd2017c246f195b6516c46c0764cee04b0ee6843d2d4  (74972 bytes)
BYTE-IDENTICAL: NO
token-family census: 15 token(s) changed count:
  (at                           before=296    after=270    delta=-26
  (comment                      before=2      after=0      delta=-2
  (effects                      before=281    after=255    delta=-26
  (fields_autoplaced            before=0      after=22     delta=+22
  (font                         before=281    after=255    delta=-26
  (global_label                 before=13     after=0      delta=-13
  (hide                         before=165    after=187    delta=+22
  (justify                      before=63     after=31     delta=-32
  (page                         before=0      after=1      delta=+1
  (path                         before=22     after=23     delta=+1
  (property                     before=220    after=207    delta=-13
  (shape                        before=13     after=0      delta=-13
  (sheet_instances              before=0      after=1      delta=+1
  (size                         before=281    after=255    delta=-26
  (uuid                         before=225    after=212    delta=-13

===== build/schgen-boards/transistor-preamp-lab/transistor-preamp-lab.kicad_sch =====
format version: 20260306
sha256 before: d64d8b30292b0cbc89c516b7eae3151e4650e5e0d8d59884764643feb4cea526  (110276 bytes)
loaded: 39 components
sha256 after:  db96841eb71ade8f7dca8e392addc784dbabfa010d880d34142bf04b8cd44f8e  (106115 bytes)
BYTE-IDENTICAL: NO
token-family census: 18 token(s) changed count:
  (at                           before=460    after=430    delta=-30
  (comment                      before=2      after=0      delta=-2
  (do_not_autoplace             before=66     after=64     delta=-2
  (effects                      before=419    after=389    delta=-30
  (embedded_fonts               before=10     after=11     delta=+1
  (fields_autoplaced            before=0      after=39     delta=+39
  (font                         before=419    after=389    delta=-30
  (global_label                 before=14     after=0      delta=-14
  (hide                         before=292    after=329    delta=+37
  (justify                      before=86     after=51     delta=-35
  (page                         before=0      after=1      delta=+1
  (path                         before=39     after=40     delta=+1
  (property                     before=364    after=348    delta=-16
  (shape                        before=14     after=0      delta=-14
  (sheet_instances              before=0      after=1      delta=+1
  (show_name                    before=66     after=64     delta=-2
  (size                         before=419    after=389    delta=-30
  (uuid                         before=290    after=276    delta=-14
```

**Answer to "byte-identical or corrupts": it CORRUPTS.** Not a formatting
divergence — a content loss.

### The known failure mode in this space, inverted

The brief named "a silent drop of `hide` flags" as what to watch for. **`hide`
went UP, not down** (+22 and +37) because it adds `fields_autoplaced` and hides
fields. What it drops instead is far worse.

### Proof this is connectivity loss, not cosmetics

The schematics were re-exported through KiCad 10's own netlist exporter before
and after, and the net-name sets diffed:

```
--- low-boost: diff orig.names rt.names ---
11,12d10
< (name "hi_boost_out")
< (name "in")
15d12
< (name "lo_boost_in")
23a21
> (name "Net-(R1-Pad1)")
24a23
> (name "Net-(SI3-Pad1)")
27d25
< (name "out")
40a39,49
> (name "unconnected-(J1-Pin_1-Pad1)")
> (name "unconnected-(J1-Pin_2-Pad2)")
> (name "unconnected-(J1-Pin_3-Pad3)")
> (name "unconnected-(J1-Pin_4-Pad4)")
> (name "unconnected-(R1-Pad2)")
> (name "unconnected-(SI1-Pad1)")
> (name "unconnected-(SI2-Pad2)")
> (name "unconnected-(SI5-Pad1)")
> (name "unconnected-(SI7-Pad1)")
> (name "unconnected-(SI7-Pad2)")
> (name "unconnected-(SI8-Pad1)")

--- transistor-preamp-lab ---
8,10d7
< (name "BASE")
< (name "BYPASS_CAP")
< (name "BYPASS_JUMPED")
12d8
< (name "COLLECTOR")
16d11
< (name "EMITTER")
28a24,26
> (name "Net-(Q1-B)")
> (name "Net-(Q1-C)")
> (name "Net-(Q1-E)")
… plus 3 Net-(RVn-Pad2) and 8 unconnected-(…)
```

The lost names are **exactly** the `global_label` names in the originals:

```
$ grep -A1 '(global_label' low-boost.kicad_sch | grep -o '"[^"]*"' | sort -u
"hi_boost_out"  "in"  "lo_boost_in"  "out"
$ grep -A1 '(global_label' transistor-preamp-lab.kicad_sch | grep -o '"[^"]*"' | sort -u
"BASE"  "BYPASS_CAP"  "BYPASS_JUMPED"  "COLLECTOR"  "EMITTER"
```

### ROOT CAUSE — and it is NOT a KiCad-10 problem

The top-level dispatch in `kicad_sch_api/core/parser.py` handles exactly these
element types:

```
arc, bezier, circle, embedded_fonts, generator, generator_version,
hierarchical_label, image, junction, label, lib_symbols, no_connect, paper,
polyline, rectangle, sheet, sheet_instances, symbol, symbol_instances, text,
text_box, title_block, uuid, version, wire
```

**`global_label` is not in that list.** It falls through every `elif` and is
discarded. There is also no `bus`, no `bus_entry`, no `netclass_flag`. The
library *does* carry `add_global_label` / `remove_global_label` writers and a
`GLOBAL = "global_label"` enum member, so it can create one it will then fail to
read back. This is a structural parser gap, **version-independent** — the
"docs say KiCad 7 or 8" framing is a red herring. Pointing it at a KiCad 7 file
with global labels would lose them too.

### The false green

Loading with `logging.DEBUG`, verbatim:

```
INFO:kicad_sch_api.core.parser:Successfully parsed schematic with 22 components
DEBUG:kicad_sch_api.core.schematic:Schematic initialized with 22 components, 109 wires, 14 junctions, 6 texts, 0 labels, 0 hierarchical labels, 0 no-connects, and 0 nets with managers initialized
COMPONENTS 22
has global_labels attr: False
global_labels raised 'Schematic' object has no attribute 'global_labels'
```

No warning. No exception. The loaded object does not even expose a
`global_labels` attribute to ask about. `save()` returns normally. **This is the
exact shape `docs/schematic/false-greens.md` catalogues**: a tool reporting
success while the thing you asked about became unreadable.

### Verdict

**Do not adopt for writing. Do not adopt for round-tripping. The "exact format
preservation" claim in its own PyPI summary is false on our files.** If some
read-only use is ever wanted, it must first be gated by a token census like the
one above, because the loss is invisible otherwise.

---

## 2b. kicad-mcp-pro — drivable, narrow, and it made our sheet worse

| | |
|---|---|
| Repo | https://github.com/oaslananka/kicad-mcp-pro |
| PyPI / npm | `kicad-mcp-pro` **4.4.0**, both |
| Licence | MIT |
| Stars / forks | 160 / 30 |
| Created / pushed | 2026-05-31 / 2026-10-28 (active) |
| Open issues | 20 |

### Can `fix_readability(max_passes=3)` be driven against an arbitrary sheet?

**YES.** `_get_schematic_file()` reads `cfg.sch_file`, and its own refusal names
the alternative to a project:

```
"No schematic file is configured. Call kicad_set_project() or set KICAD_MCP_SCH_FILE."
```

Setting `KICAD_MCP_SCH_FILE` to a copy of `low-boost.kicad_sch` and calling the
registered tool in-process:

```
server exposes 332 tools
  sch_visual_qa: PRESENT
  sch_fix_readability: PRESENT
  sch_autoplace_fields: PRESENT

--- call sch_fix_readability({'max_passes': 3}) ---
Readability fix: WARN -> WARN over 1 pass(es).
pass 1: WARN (symbol_overlap, title_block_company, title_block_date, title_block_rev)
No automatic fixes were applied.
Manual follow-up suggested for: symbol_overlap (try sch_auto_place_functional / sch_auto_resize_sheet).

sha256 after:  03028122280d423fe77b7422deebf44753bbd71576f1f9514b0560355155f210 (79202 bytes)
FILE CHANGED: NO
token-family census: IDENTICAL
global_label: 13 -> 13
```

So: drivable, and on our board it did **nothing** — stopping after one pass
because no fix applied.

### What the codes actually ARE

The brief said "codes like symbol_overlap / text_overlap / offsheet_*". The real
and complete set is `COSMETIC_PENALTIES` in `kicad_mcp/models/visual_qa.py` —
**16 codes in 7 categories**, with fixed penalty weights:

| Code | Penalty | Category |
|---|---|---|
| `symbol_overlap` | 15.0 | readability |
| `offsheet_symbol` | 12.0 | readability |
| `text_overlap` | 10.0 | readability |
| `label_overlap` | 8.0 | readability |
| `offsheet_label` | 8.0 | readability |
| `dense_label_fanout` | 3.0 | readability |
| `grid_misalignment` | 4.0 | grid |
| `diagonal_wire` | 3.0 | wiring |
| `font_inconsistency` | 4.0 | typography |
| `power_symbol_sideways` | 6.0 | orientation |
| `sheet_density_imbalance` | 3.0 | layout_balance |
| `title_block_missing` | 4.0 | documentation |
| `title_block_title` | 4.0 | documentation |
| `title_block_rev` | 1.0 | documentation |
| `title_block_date` | 1.0 | documentation |
| `title_block_company` | 1.0 | documentation |

`run_cosmetic_qa(sch_text: str)` is a pure function over schematic TEXT and runs
standalone, no project and no server:

```
===== low-boost.kicad_sch =====
{"cosmetic_score": 57.0, "status": "WARN", "symbol_count": 22, "label_count": 13,
 "wire_count": 109, "worst_category": "readability",
 "penalties_by_category": {"documentation": 3.0, "readability": 60.0}}
finding census: {"symbol_overlap": 4, "title_block_company": 1, "title_block_date": 1, "title_block_rev": 1}
  symbol_overlap: Symbols C1 and C2 overlap (~7.2 mm² of body). Move them apart…
  symbol_overlap: Symbols C2 and C3 overlap (~7.2 mm² of body)…
  symbol_overlap: Symbols C4 and C5 overlap (~7.2 mm² of body)…
  symbol_overlap: Symbols C5 and C6 overlap (~7.2 mm² of body)…

===== transistor-preamp-lab.kicad_sch =====
{"cosmetic_score": 67.0, ...}  census: {"symbol_overlap": 2, "title_block_*": 3}

===== pultec-three-band-eq.kicad_sch (hand-drawn) =====
{"cosmetic_score": 53.0, "penalties_by_category": {"documentation": 1.0, "orientation": 6.0, "readability": 390.0}}
census: {"power_symbol_sideways": 1, "symbol_overlap": 26, "title_block_company": 1}
```

### `symbol_overlap` IS A FALSE POSITIVE BY CONSTRUCTION — measured

copperhead reports `symbol-overlap: 0` on `low-boost`. kicad-mcp-pro reports 4.
The file settles it. `parse_placed_symbols` builds the "body box" from
`parse_lib_symbol_local_points`, and for `Device:C` those points span
`y -6.604 .. 6.604`. From the `lib_symbols` block in our own file:

```
(polyline (xy -2.032 0.762) (xy 2.032 0.762))     <- the plates
(polyline (xy -2.032 -0.762) (xy 2.032 -0.762))
(pin passive line (at 0 3.81 270) (length 2.794)) <- tip at y = 6.604
(pin passive line (at 0 -3.81 90) (length 2.794))
```

The **drawn body** is 1.524 mm tall. kicad-mcp-pro's "body box" is 13.208 mm
tall — **8.7×** — because it includes the pin tips. Our caps sit on an 11.43 mm
pitch, so adjacent pin-tip boxes overlap by 1.778 mm × 4.064 mm = 7.2 mm², which
is the number in its own message.

**Consequence: any two symbols wired end-to-end in a column are reported as
overlapping.** That is why it fires 26 times on the hand-drawn board and 4 times
on ours, and why its own fixer refuses to act on it (`symbol_overlap` only
triggers a re-space `if not schematic_has_connections(...)` — i.e. never on a
wired sheet). Two independent tools (copperhead and kicad-sch-lint, §3) both
report zero body overlap on the same files.

### It has no text-over-wire check at all

`run_cosmetic_qa` passes `wires` only to `detect_grid_misalignment` and
`detect_diagonal_wires`. `detect_text_overlap(placed, labels)` compares text to
text and text to label, never text to wire. It therefore reported
`text_overlap: 0` on a sheet where copperhead found 7 and kicad-sch-lint found 9
text-on-wire collisions. **The single most useful draughtsmanship check for this
repository is absent from it.**

### The write path, and the one piece that is sound

`fix_readability`'s repertoire is three actions only:

1. `offsheet_symbol|offsheet_label` → grow the sheet one step up the paper ladder
2. `symbol_overlap` → re-space, **only if the sheet has no connections at all**
3. `text_overlap` → `autoplace_fields_apply`

Forcing (3) directly on a copy:

```
--- sch_autoplace_fields({'dry_run': True}) ---
Dry run: would reposition Reference/Value fields on 19 symbol(s): C1, C2, C3, C4, C5, C6, J2, J1, R1, RV1, SI1, SI2, SI3, SI4, SI5, SI6, SI7, SI8, SW1.
--- sch_autoplace_fields({}) ---
The schematic was updated. Reload it manually in KiCad if needed.
Auto-placed Reference/Value fields on 19 symbol(s): …
sha256 after:  5853b17828f71c206ad6d8a679166f26f3a8381c709b982458b37e45d976a23e (77244 bytes)  global_label=13
FILE CHANGED: YES
```

Connectivity verification:

```
token deltas after sch_autoplace_fields: NONE (counts identical)
NET NAME SETS IDENTICAL -- connectivity preserved
```

**Good news:** `sch_autoplace_fields` is a TEXT mutator
(`transactional_write_to_schematic_file`), not a kicad-sch-api save, so it does
NOT inherit the global-label destruction. **Bad news:** kicad-mcp-pro's
`_load_kicad_schematic` is literally `from kicad_sch_api import load_schematic`,
so every one of its 332 tools that goes through the *library* save path carries
the §2a defect. That boundary must be mapped per-tool, not assumed.

### AND THE RESULT: it made the sheet WORSE

copperhead, as an independent referee, on the same file before and after
`sch_autoplace_fields`:

```
### BEFORE (schgen output) ###
  text-collision: 7
all-families:  8 error / 4 advisory
### AFTER kicad-mcp-pro sch_autoplace_fields ###
  text-collision: 14
all-families:  11 error / 4 advisory
### copperhead score ###
before: cap 40 — 8 error-severity legibility finding(s)
after:  cap 40 — 11 error-severity legibility finding(s)
```

**Text collisions doubled, 7 → 14.** The tool reported success on 19 symbols,
and its own `sch_visual_qa` saw `text_overlap: 0` both before and after —
because it cannot see text on wires. A remedy that silently doubles the defect
it claims to fix, while its own gauge reads zero throughout.

### Verdict

Drivable against an arbitrary sheet, which answers the question asked. But the
taxonomy is weaker than copperhead's, its headline detector is a false positive
by construction, it is blind to the defect class that matters most here, and its
one applicable repair measurably degraded our board. **Take the 16-code
taxonomy as a cross-check on ours; take none of the code.**

---

## 3. Other standalone legibility checkers — ONE REAL FIND

### 3a. `rashuky/kicad-sch-lint` — THE BEST TECHNICAL FIT IN THE RUN

| | |
|---|---|
| Repo | https://github.com/rashuky/kicad-sch-lint |
| Licence | MIT |
| **Stars / forks** | **0 / 0** |
| Created / pushed | **2026-09-25 / 2026-09-25 — every commit on one day** |
| Open issues | 0 |
| Language | Python ≥3.10, **`dependencies = []`** for `lint`/`fix`/`inspect`; `pymupdf` only for `render` |
| Size | 3,960 lines across 17 modules |
| Target | *"Readability linter, renderer and text fixer for **KiCad 10** schematics. Built for AI assistants that edit `.kicad_sch` files as text and cannot see the result."* |

**It is the exact shape this repo is asking for**, down to the framing.

#### The 19 check codes

```
$ python3 -m kschlint checks
text-overlap             error    Two texts overlap
text-over-body           error    Text lies on a symbol body
field-on-own-body        warning  Field drawn across its own symbol outline
text-over-wire           error    A wire or pin runs through text
body-overlap             error    Two symbol bodies overlap
wire-through-body        error    Wire passes through a symbol body
wire-overlap             error    Collinear wires overlap
label-floating           error    Label is not on a wire or pin
wire-end-on-pin-line     error    Wire ends on a pin line, not on the pin tip
pin-on-wire-middle       warning  Pin tip touches the middle of a wire
missing-junction         warning  T connection without a junction dot
four-way-junction        warning  Four wires meet at one point
dangling-wire            warning  Wire end is not connected
off-grid                 warning  Connection point off the 1.27 mm grid
outside-frame            warning  Item outside the drawing frame or on the title block
text-too-close           info     Text closer than the clearance to another item
vertical-field           info     Reference or value is vertical
power-symbol-rotated     info     Power symbol not upright
unneeded-junction        info     Junction dot where only two wires meet
```

**Not one of these is a convention.** Every code is geometry or KiCad
connectivity semantics. There is no `ungrouped-symbol` and no
`empty-title-block`. `lint` exits 1 on errors, so it is a CI gate as shipped.

#### VERBATIM — pultec-low-boost

```
$ python3 -m kschlint lint build/schgen-boards/pultec-low-boost
#1 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(31.564, 32.894): wire runs through C6 Value '.033uF'
#2 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(31.564, 44.324): wire runs through C5 Value '.047uF'
#3 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(31.564, 55.754): wire runs through C4 Value '.068uF'
#4 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(32.931, 75.82): wire runs through C3 Value '.12uF'
#5 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(33.559, 30.354): wire runs through C6 Reference 'C6'
#6 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(33.559, 41.784): wire runs through C5 Reference 'C5'
#7 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(33.559, 53.214): wire runs through C4 Reference 'C4'
#8 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(34.321, 73.28): wire runs through C3 Reference 'C3'
#9 E text-over-wire low-boost.kicad_sch /Pultec low-boost section board/ @(190.981, 123.064): wire runs through SI6 Reference 'SI6'
#10 W four-way-junction low-boost.kicad_sch /Pultec low-boost section board/ @(34.29, 60.96): 4 connections meet at (34.29, 60.96). Offset one branch to make two T junctions
#11 W four-way-junction low-boost.kicad_sch /Pultec low-boost section board/ @(196.85, 172.72): 4 connections meet at (196.85, 172.72). Offset one branch to make two T junctions
9 errors, 2 warnings, 0 info
```

#### VERBATIM — transistor-preamp-lab

```
$ python3 -m kschlint lint build/schgen-boards/transistor-preamp-lab --severity info
#1 E text-over-wire … wire runs through JP5 Reference 'JP5'
#2 E text-over-wire … wire runs through C3 Value '10uF'
#3 W four-way-junction … @(93.98, 121.92): 4 connections meet …
#4 W four-way-junction … @(110.49, 121.92): 4 connections meet …
#5..#11 I vertical-field  #PWR100x Value 'VCC'/'GND' is vertical. Horizontal text reads better
2 errors, 2 warnings, 7 info
```

#### Cross-validation against copperhead

| Board | copperhead `text-collision` | kschlint `text-over-wire` | Agreement |
|---|---|---|---|
| low-boost | 7 | 9 | all 7 of copperhead's are in kschlint's 9; kschlint additionally catches C3 Reference and C6 Reference |
| transistor-preamp-lab | 2 (JP5 Ref, C3 Val) | 2 (JP5 Ref, C3 Val) | **exact** |
| both | `symbol-overlap: 0` | `body-overlap: 0` | **exact — and both refute kicad-mcp-pro's 4** |

Two tools written by different people in different languages agree on the
defect set. That is as close to ground truth as this run can get without a human
reading the drawing — which was also done (below).

#### The `fix` — the strongest result in the whole bakeoff

`fix` moves only visible fields and local labels, never symbols, pins or wires;
with `--write` it diffs the kicad-cli netlist before and after and restores the
files on any difference.

```
$ python3 -m kschlint fix <copy>/pultec-low-boost --write
low-boost.kicad_sch: C4 Reference -> (34.163, 53.467) angle 0 left
low-boost.kicad_sch: C4 Value -> (34.163, 56.007) angle 0 left
low-boost.kicad_sch: C5 Reference -> (34.163, 42.037) angle 0 left
low-boost.kicad_sch: C5 Value -> (34.163, 44.577) angle 0 left
low-boost.kicad_sch: C6 Reference -> (40.513, 25.527) angle 0 right
low-boost.kicad_sch: C6 Value -> (40.513, 28.067) angle 0 right
low-boost.kicad_sch: C3 Reference -> (34.163, 72.517) angle 0 left
low-boost.kicad_sch: C3 Value -> (34.163, 75.057) angle 0 left
low-boost.kicad_sch: SI6 Reference -> (185.293, 124.587) angle 90 center
low-boost.kicad_sch: SI6 Value -> (185.293, 127.127) angle 90 center
written. netlist unchanged. findings 11 -> 6

$ python3 -m kschlint fix <copy>/transistor-preamp-lab --write
transistor-preamp-lab.kicad_sch: C3 Reference -> (96.266, 148.717) angle 90 right
transistor-preamp-lab.kicad_sch: C3 Value -> (100.076, 148.717) angle 90 right
transistor-preamp-lab.kicad_sch: JP5 Reference -> (43.307, 115.951) angle 0 center
written. netlist unchanged. findings 4 -> 2
```

**Its "netlist unchanged" claim was independently verified**, not taken on
trust — this writer re-exported both netlists with `kicad-cli` and diffed them:

```
NET NAME SETS IDENTICAL
node-level diff: NODE SETS IDENTICAL
global_label count: 13
```

**And copperhead, as an independent referee, on the repaired files:**

```
===== lintfix/pultec-low-boost/low-boost.kicad_sch =====
  text-collision: 6        (was 7)
all-families:  7 error / 4 advisory     (was 8)
===== lintfix/transistor-preamp-lab/transistor-preamp-lab.kicad_sch =====
  text-collision: 0        (was 2)
all-families:  1 error / 3 advisory     (was 3)
4-off config:  0 error / 3 advisory     (was 2)
```

**`transistor-preamp-lab` went to ZERO errors on both independent checkers,
with the netlist provably identical.** kschlint's own re-lint agrees:
`0 errors, 2 warnings, 0 info`.

Contrast with kicad-mcp-pro on the same class of repair: 7 → 14. One tool
halved-to-zeroed the defect; the other doubled it.

#### The render, and looking at it

`render` plots through kicad-cli and overlays numbered boxes on the findings. It
was run on the repaired `transistor-preamp-lab` and **the PNG was read** (not
merely produced), per this repo's "look at the output" practice. The sheet is
legible: `C3`'s reference and value now sit clear below the capacitor, `JP5`'s
reference is clear of its wire, group boxes and their captions are intact, and
the only two overlaid boxes are the remaining four-way junctions near `J2`. The
repair did what it said and did not disturb the drawing.

```
$ python -m kschlint render <copy>/transistor-preamp-lab --sheet transistor-preamp-lab.kicad_sch --boxes
/var/folders/.../kschlint/Transistor preamp lab board.png  region [14.1, 9.2, 238.7, 190.7]  7.1 px/mm
2 findings drawn
```

#### How its geometry was established (read, not run)

Its README claims — **relayed, not verified by this writer** — that
`tests/test_transform.py` places three stock symbols in all 12 rotation/mirror
combinations, puts a label where its model says each pin tip is, and checks
KiCad's netlist puts every pin on its own label's net. The test file exists in
the clone; it was not executed. The *behaviour* implied by that claim was
independently confirmed by the netlist-invariance checks above.

#### THE RISK, STATED PLAINLY

**0 stars, 0 forks, 0 issues, one author, every commit dated 2026-09-25.** This
is a one-sitting repository with no users and no maintenance history. Adopting
it as a dependency is adopting an orphan. Adopting it as **vendored MIT source**
(3,960 lines, zero runtime dependencies) is a different and much safer
proposition, and is what the licence permits.

### 3b. `Matthew-Laplace/schematic-readability` — runs, but is not a gate

MIT, 1 star, 1 fork, created 2026-10-04, pushed 2026-10-11. Mostly an agent
skill (`SKILL.md` plus ~10 reference documents), with one runnable script,
`scripts/audit_figure_svg.py` (505 lines, stdlib only). Run against a kicad-cli
SVG export of `low-boost`:

```
$ kicad-cli sch export svg -o <dir> low-boost.kicad_sch
$ python3 scripts/audit_figure_svg.py <dir>/low-boost.svg
   text runs: 126 (123 non-empty)
   segments: 1129  diagonals(>0.5u): 112  long(>=5.0u): 1  longest: 5.3381
     long diagonal 5.338u  (58.83,32.36) -> (57.35,37.49)  [decide: symbol graphic or routed segment]
   distinct wire endpoints: 1791  coincident with another endpoint: 402  NOT coincident: 1389
   label anchors: 123  min clearance: 0.055u  below 0.5u: 98   [estimate: anchor only, not the ink box]
```

It runs on an arbitrary SVG, but **it is not a legibility gate and says so
itself** in its module docstring: *"this script never rasterises, so it cannot
settle text-versus-wire overlap"*, and *"It cannot see device pins, because an
SVG export does not mark them."* 98 of 123 anchors "below the project limit" is
noise — it is measuring each label anchor against its own symbol's graphics.
**Its value is the two criteria documents** (`references/readability-rules.md`,
249 lines; `references/readability-scoring.md`, 203 lines), which are
externally-authored specifications of what legibility means — the shape
`CLAUDE.md` wants for acceptance criteria.

### 3c. `mixelpixx/KiCAD-MCP-Server` — one narrow, sound tool

MIT, **3,002 stars**, 399 forks, pushed 2026-10-26 — by far the most
established project in this run. Only one piece is draughtsmanship:
`python/commands/schematic_declutter.py` → `suggest_schematic_declutter`, which
takes `schematicPath` directly and is dry-run by default. Its reasoning is
exactly right and worth quoting:

> *a net label's `(at x y)` IS its electrical connection point. Moving the anchor
> off its wire would disconnect the net. So this tool holds every label's anchor
> FIXED and only changes its orientation (0/90/180/270) and justification.*

Run standalone (stubbing `pcbnew`, which its package `__init__` imports —
a real friction point, not a clean import):

```
low-boost.kicad_sch:            labels 13, obstacles 22, overlaps_before 0, after 0, proposals 0
transistor-preamp-lab.kicad_sch: labels 14, obstacles 39, overlaps_before 0, after 0, proposals 0
pultec-three-band-eq.kicad_sch:  labels 14, obstacles 55, overlaps_before 2, after 0, proposals 2
```

**Scope is labels only** — no fields, no text-over-wire, no body overlap. Its
text model is a flat `_CHARS_PER_MM = 1.5` advance, much cruder than copperhead's
and kschlint's real stroke-font extents. Useful as a narrow label-orientation
remedy; not a checker.

### 3d. Examined and ruled out

| Project | Why not |
|---|---|
| `AvatarSD/KiSkill` (MIT, 6★) | `kicad_lib/verify.py` is electrical (net/segment contact), not legibility. Its live path needs a running KiCad over IPC; its own comment says schematic items over IPC are **v11**, so it cannot drive KiCad 10 schematics anyway. |
| `aklofas/kicad-happy` (MIT, 1528★) | Agent skills + scripts for BOM, LCSC, SPICE, datasheets. Its "readability" hits are all in datasheet/BOM code. No geometric schematic checker. |
| `salitronic/eda-agent` (Apache-2.0, 289★) | Drives a **live session** of Altium/KiCad/EasyEDA. Not a file-in, findings-out checker. |
| `94xhn/kicad-file-doctor` (MIT, 0★) | Diagnoses files KiCad refuses to load (unbalanced parens, BOM, missing `lib_symbols`). Useful for a different problem; not legibility. |
| `Sailcatamaran/kicad-mcp-pro`, `renovate-bot/…` | Forks/mirrors. |

### Is there a maintained, established, standalone schematic-legibility checker?

**No.** That is the honest finding, and it is important.

- The **best taxonomy and the best-engineered checker** (copperhead) is a
  component inside an AI PCB-agent product, reusable only because its author
  happened to keep it pure and expose `--file`. It is 666 stars but one
  dominant author and visibly cooling.
- The **best-fitting tool** (kicad-sch-lint) has zero users.
- The **most established project** (mixelpixx, 3,002 stars) contributes one
  narrow label-orientation pass.
- **Nothing on PyPI or npm is a maintained schematic-legibility linter.** The
  closest-named package, `kicad-sch-api`, does not check legibility at all and
  corrupts our files.

So the choice is not "adopt a maintained upstream instead of our homegrown
code". It is **"vendor someone else's better-tested geometry, under a permissive
licence, and own it"**.

---

## 4. What this run says about OUR tooling

**Two external tools contradict our own verdict on the same bytes.**

`build/schgen-boards/pultec-low-boost/STATUS.md`:

> `pultec-low-boost: USABLE`
> *"No findings: every gate this generation ran passed."*

Against the same file: copperhead 8 errors, kicad-sch-lint 9 errors + 2 warnings.
Nine text-on-wire collisions on a sheet our gate calls clean.

**The cause is already written down in our own output.**
`build/schgen-boards/pultec-low-boost/RENDER-REPORT.md`:

> **6 field pair(s) on this generation's sheets are drawn over something.** The
> placer had no clear slot for them and took the least-covered one rather than
> refuse the drawing. **These overlaps are NOT reported by the text-clearance
> checks - the placer already knew** - so this list is where they are reported,
> and a sheet with a row here is not a clean sheet.

The placer suppresses the findings for the overlaps it created. `STATUS.md` then
reports "No findings". **A reader of `STATUS.md` alone is told a defective sheet
is clean** — the exact failure `CLAUDE.md`'s "a skipped check must never look
like a passing one" exists to prevent. This is not a hypothesis: two independent
checkers, written by two other people, found the overlaps the placer declined to
report, and named the same symbols.

Our `FindingKind` union (`lib/schgen/findings.ts:30`) has four "hard to read"
kinds — `body-clearance`, `glyph-clearance`, `text-clearance`, `field-fallback`
— against kschlint's 19 and copperhead's 13. Coverage mapping:

| Ours | kicad-sch-lint | copperhead |
|---|---|---|
| `body-clearance` | `body-overlap`, `wire-through-body`, `text-over-body` | `symbol-overlap`, `wire-through-symbol` |
| `glyph-clearance` | `text-too-close` | `crowding` |
| `text-clearance` | `text-overlap`, `text-over-wire` | `text-collision` |
| `field-fallback` | — (our concept; its *consequence* is `text-over-wire`) | — |
| — | `off-grid`, `outside-frame`, `wire-overlap`, `label-floating`, `wire-end-on-pin-line`, `pin-on-wire-middle`, `four-way-junction`, `unneeded-junction`, `field-on-own-body`, `vertical-field`, `power-symbol-rotated` | `off-grid`, `out-of-frame`, `label-orientation`, `low-utilization`, `cross-group-wire` |

`wire-end-on-pin-line` is worth singling out: *"wire ends on a pin line but not
on the tip. KiCad does not connect it."* That is a silent connectivity defect
that looks correct in a render, and neither our checker nor copperhead has it.

---

## 5. Recommendation

| Rank | Take | Form | Why |
|---|---|---|---|
| 1 | **`kicad-sch-lint`** | **Vendor the MIT source** (3,960 lines, zero deps), do not depend on the repo | Best code-to-need fit in the run: KiCad 10 native, 19 convention-free codes, exits 1 for CI, and a `fix` that proved netlist-invariant and drove a board to zero errors. Vendoring converts its one real risk — an unmaintained orphan — into ordinary owned code. |
| 2 | **copperhead's `legibility.ts` + `score.ts`** | **Vendor the Apache-2.0 source** (2,046 lines incl. `sexp.ts`/`strokefont.ts`, zero npm deps), or shell `npx copperhead score schematic --file` as a referee | It is TypeScript, like our stack. The `style` sub-score is the convention-free "one scale for a hand drawing and a generated one" we have no instrument for. Four families must be configured off before it judges anything. |
| 3 | Use the two **as a cross-check on each other** | — | They agreed exactly on `transistor-preamp-lab` and overlapped fully on `low-boost`, and jointly refuted kicad-mcp-pro's false positives. Two independent implementations disagreeing is the cheapest possible signal that one of them is wrong. |
| 4 | `kicad-mcp-pro`'s **16-code table** | Read it; cite it in a rule file | It is an externally-authored taxonomy, which `CLAUDE.md` wants and an agent here may not write for itself. Take none of its code. |
| 5 | `schematic-readability`'s **two reference docs** | Read them | Same reason. |
| — | **`kicad-sch-api`** | **REJECT** | Destroys `global_label` on save, silently, on our KiCad 10 files, with a success log. |
| — | copperhead's **drafting engine** | **REJECT** | *"No coordinates, ever — the engine computes every position."* A places-row tool; we already have a placer, and `CLAUDE.md` wants agents driving it. |
| — | Any **MCP server** as the mechanism | **REJECT** | Every server here edits s-expressions behind an RPC hop. The libraries underneath are directly importable, and both winners ship a plain CLI. |

### The immediate, concrete move

Point `kicad-sch-lint` at every board `board-sheets.ts` produces and make its
exit code part of `make check`. That is one command, zero dependencies, and it
would have caught, on the day they appeared, the nine collisions our own
`STATUS.md` currently calls "no findings".

---

## What this document does NOT establish

1. **copperhead's `engine.ts` (365 KB) was not read or run.** Its places-row
   character rests on `ir.ts`'s explicit statement, `draft.ts`, and the absence
   of any coordinate field in the intent schema — strong, but source evidence.
2. **kicad-sch-lint's `tests/test_transform.py` was not executed.** Its pin-tip
   model is attested by the README and corroborated indirectly by the
   netlist-invariance of its `fix`; the test itself was not run.
3. **No tool was tested on a sheet with buses, bus entries, netclass flags,
   rule areas, or text boxes.** Our boards have none. `kicad-sch-api` has no
   parser branch for `bus`, `bus_entry` or `netclass_flag` either, so its loss
   there is likely but unmeasured.
4. **`copperhead check` (the full ERC+DRC+drift verb) was not run** — only
   `score schematic --file` and the library entry point. The full verb needs a
   `.copperhead/config.json` and a repo layout.
5. **kicad-mcp-pro's other 329 tools were not audited** for which of them route
   through `kicad_sch_api.load_schematic`/`save`. The boundary was established
   for `sch_autoplace_fields` (text mutator, safe) and for
   `_load_kicad_schematic` (kicad-sch-api, unsafe) only.
6. **The three-band-eq control was never repaired**, only measured. Nothing
   under `circuits/` was modified.
7. **GitHub metrics are a single snapshot**, 2026-10-28, from the GitHub REST
   API. The copperhead commit-per-day histogram is truncated by a `--depth 50`
   clone; the weekly figures come from `stats/participation` and are complete.
8. **WebSearch was unavailable** (session budget exhausted before this task
   began). Discovery was done through the GitHub search API, `npm view` and
   `pip`, which finds repositories and packages but would miss a tool published
   only on a personal site or a forge other than GitHub.

## Reproducing this

Everything lives under the session scratchpad
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/`:

| Path | What it does |
|---|---|
| `copperhead/standalone-gate.ts` | calls `checkLegibility` on arbitrary files |
| `copperhead/gate-configured.ts` | sha256 read-only proof, family census, severity-off proof |
| `roundtrip.py` | kicad-sch-api load/save, sha256 + token census |
| `netlist-diff.sh` | kicad-cli netlist export before/after, net-name set diff |
| `adjudicate.py` | prints kicad-mcp-pro's body boxes for the disputed pairs |
| `mcppro-qa.py` | runs `run_cosmetic_qa` standalone |
| `drive-fix-readability.py` | drives `sch_fix_readability` via `KICAD_MCP_SCH_FILE` |
| `drive-autoplace.py` | drives `sch_autoplace_fields`, write path |
| `venv/` | Python 3.14.6 venv — nothing was installed into the repo |
