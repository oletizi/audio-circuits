# Audio Circuits

A collection of audio circuits under development. Some are core, reusable
components meant to appear in future designs; some are designs in their own
right. Nothing here is finished software — it is hardware in progress.

## What this repository is for

**It is for carrying a circuit from a model to something buildable, with agents
doing that work end to end:**

- **A circuit is held as data** — built with `lib/model/`'s `circuit()` builder
  or read from a KiCad netlist — where it can be validated, simulated in SPICE,
  composed, partitioned and checked.
- **The KiCad and VeroRoute interfaces are driven by agents too**, which
  arrange schematics and place and route layouts for stripboard, perfboard and
  manufactured PCBs. Until 2026-10-10 this file said the opposite — that those
  were a person's work because agents are bad at hardware design. That is no
  longer the project's position; see
  `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`.
- **What an agent never does is set the bar its own artifact is measured
  against.** Acceptance criteria come from a rule file, a spec, or a reviewing
  agent that did not produce the artifact. That constraint is the one thing kept
  from the older arrangement, because the failure it prevents is real: an agent
  that writes its own criteria from the layout it already produced will pass
  every check it set itself.

Authority runs in both directions depending on where a circuit came from. For a
circuit an agent designs, the model is authoritative and the drawing is derived
from it. The Pultec runs the other way: an existing design imported
schematic-first, with the model derived from a netlist export.

**A `.kicad_sch` is not written by code in this repository.** It is drawn by
`TOOLING.md`'s loop — copperhead drafts, akcli-kicad repairs, `kicad-cli`
renders and exports, the reviewer gives a verdict on the rendered page, and the
page is committed under `drafted/<circuit>/<board>/` beside a `RECORD.md`
carrying the sha256 the verdict is bound to.

> **This paragraph described a model-to-schematic generator at `lib/schgen/`
> with `bun run schgen` as its front door, and a superseded stub writer at
> `lib/kicad/schematic.ts` kept alive for the `transistor-preamp` round trips.
> All of it is deleted** — `lib/schgen/`, `tools/schgen/`, `tests/schgen/`,
> `lib/kicad/schematic.ts` and the three `schgen` CLI verbs — in the plan at
> `docs/superpowers/plans/2026-10-30-remove-schgen.md`, with the findings in
> `docs/research/2026-10-30-schgen-removed.md`. **The `kicad-cli` proof the stub
> was being kept for did not depend on the stub**: it is
> `tests/circuits/transistor-preamp-kicad-round-trip.test.ts`, which exports
> each board's committed `.kicad_sch` under `circuits/transistor-preamp/` with
> the real `kicad-cli` and compares it against the live model — so all five
> boards kept the proof and only its subject changed. **G247**, **G248** and
> **G81** measured a generator that no longer exists.

**KiCad is a primary tool here, not an optional extra.** `make check` runs
`kicad-cli` on every board on every run. Treat it the way you would a compiler.

## The documents that govern the work

Read them in this order. Each outranks the ones below it.

| | |
| --- | --- |
| [`CONSTITUTION.md`](CONSTITUTION.md) | the few principles this project does not revisit |
| [`EVALUATING-DRAWINGS.md`](EVALUATING-DRAWINGS.md) | **canonical on drawings** - who may judge one, what counts as a valid evaluation, what an agent may say about one. An agent is not a qualified reviewer, and *better*, *good*, *clean*, *readable* and *legible* are forbidden words about any drawing produced here |
| [`CLAUDE.md`](CLAUDE.md) | the conventions every circuit follows |
| [`AGENTS.md`](AGENTS.md) | the shared working rules |
| [`TOOLING.md`](TOOLING.md) | **how a schematic actually gets drawn** - the toolchain with exact versions, the copperhead-then-akcli loop, the known repair classes (it says how many, and the set is not closed), the checks that must be able to fail, and what the procedure does not yet cover |
| [`docs/schematic/verdicts.md`](docs/schematic/verdicts.md) | the owner's verdicts on the pages he has seen, verbatim, each bound to the sha256 of the sheet. The defects he named are the only statements of what he wants that carry authority |
| [`DEVELOPMENT-LOG.md`](DEVELOPMENT-LOG.md) | newest session first - what was done, and what went wrong doing it |

`TOOLING.md` is the procedure and **not** the criteria; `EVALUATING-DRAWINGS.md`
is the criteria, because an agent may never author the bar its own artifact is
measured against.

This repository was previously a tscircuit component package. tscircuit has
been removed entirely — see `docs/decisions/2026-09-21-why-not-tscircuit.md`
for why.

The largest single body of content is the passive Pultec EQ in
`circuits/pultec/`: Ian Thompson-Bell's "Pultec 3 Band EQ", which combines an
EQP-1 and an MEQ-5. Its model is assembled directly from a `kicad-cli` netlist
export of the schematic in that directory, independently of the `circuit()`
builder `circuits/pt2399-core/pt2399-core.ts` uses. It is **unvalidated** — no
unit has been built from it, and the model is known to be incomplete — see
`docs/pultec/provenance.md` and `docs/pultec/unresolved.md` before treating
anything computed from it as more than a model prediction.

## Project Structure

```
audio-circuits/
├── lib/
│   ├── model/            # Canonical circuit model: types, per-kind pin
│   │                     # vocabularies, validation, the circuit() builder,
│   │                     # include() composition
│   ├── kicad/            # Readers for two KiCad netlist export formats, and
│   │   │                 # the superseded stub writer (schematic.ts) - see
│   │   │                 # "Authority runs in both directions" above and
│   │   │                 # docs/known-gaps.md G248 for why it is still here
│   │   └── symbols/      # Vendored KiCad symbol definitions the stub writer
│   │                     # embeds, so its output never depends on an installed
│   │                     # KiCad - see symbols/PROVENANCE.md
│   └── sim/              # SPICE netlist generation, AC and operating-point
│       └── models/       # Device models, each with its own provenance
│
├── circuits/             # One directory per circuit, holding its authored
│   │                     # sources together - the KiCad schematic and project
│   │                     # files alongside the .ts that models them. No KiCad
│   │                     # file sits at this level; see CLAUDE.md.
│   ├── pt2399-core/      # Transcribed from the netlist of a board that was
│   │                     # physically built and works
│   ├── pultec/           # The Pultec 3-band EQ schematic, and the five
│   │                     # physicalized stripboard modules derived from it
│   ├── transistor-preamp/ # A common-emitter lab board reconfigured by
│   │                     # jumpers and trim-pots
│   ├── optical-compressor/ # An LA-2A-inspired optical compressor: three
│   │                     # blocks joined by include(), transcribed from the
│   │                     # design spec in docs/superpowers/specs/
│   └── opamp-buffer.ts   # A unity-gain TL072 buffer
│
│                         # Within a circuit: model/ for a mechanically derived
│                         # electrical model, boards/ for physicalized board
│                         # modules, generated/ for artifacts a tool rebuilds
│
├── boards/               # Perfboard directories the perfboard CLI drives,
│                         # each checking a circuit against a physical
│                         # stripboard layout in VeroRoute, e.g.
│                         # transistor-preamp-lab/
│
├── tests/                # Model, kicad, sim, circuit and reference tests
│
└── docs/                 # Design notes, specs and plans
```

## Prerequisites

- **[KiCad](https://www.kicad.org/)**, for `kicad-cli`. Required: the perfboard
  workflow re-exports each board's netlist from its KiCad schematic on every
  run (see `make/board.mk`'s `netlist-agrees`), not just once, so `kicad-cli`
  has to be present to run `make check` against a declared board. **It is
  required for `bun test` far more widely than this paragraph used to claim.**
  It said *"exactly one test"* - "KiCad reads the generated stub as the same
  circuit" in `tests/circuits/transistor-preamp-lab.test.ts` - *"and every
  other test injects `kicad-cli` out."* **Both halves are false, measured:**
  with `KICAD_CLI` pointed at a path that does not exist, **208 testcases fail
  across 55 files, 294 further tests never register at all** (144 of them in
  twelve files that leave no trace whatever), and **50 more skip**. That test
  is also **one of five bearing the same name**, one per transistor-preamp
  board. `docs/known-gaps.md` **G250** carries the six-arm measurement. What is
  true of the original sentence is its *point*: those tests invoke `kicad-cli`
  and **fail rather than skip**, because they are the only proof that KiCad
  reads this repository's committed sheets the way the circuits mean them.
  **The five per-board tests that carried that claim were named "KiCad reads
  the generated stub as the same circuit" and are deleted with the stub
  writer**; the claim moved whole to
  `tests/circuits/transistor-preamp-kicad-round-trip.test.ts` and
  `tests/circuits/drafted-kicad-round-trip.test.ts`, which run `kicad-cli` on
  the committed `.kicad_sch` instead of on a freshly written stub. The default
  assumes a standard macOS install
  (`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`); override
  `KICAD_CLI` if yours lives elsewhere.
- **[Google Chrome](https://www.google.com/chrome/)** (or another
  Chromium-family browser), for printing a build guide. Required by `make
  guide`, which renders `guide.html` to the guide's own pages with it -
  printing is part of this build system rather than a manual step afterwards,
  so a missing converter **refuses by name** instead of writing a packet with
  no PDF. It is
  also required for `bun test`: exactly one test, "the real converter prints a
  multi-page PDF from a page with the guide's print CSS" in
  `tests/guide/print-pdf.test.ts`, invokes it and **fails** (never skips) when
  it cannot find it, because Chrome's headless flags have changed across
  versions and it is the only proof that the flags this repository passes
  still produce a PDF. **That "exactly one" is measured and exact**: masking
  `HTML_TO_PDF` gives **one** failing testcase, that one, and nothing
  unregistered (**G250**'s `nochrome` arm). The default assumes a standard macOS install
  (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`); override
  `HTML_TO_PDF` if yours lives elsewhere.
- **[qpdf](https://qpdf.sourceforge.io/)** (`brew install qpdf`), for merging
  the schematic page into a build guide so a board's packet is one printable
  document. Required by `make guide`, and by `bun test`:
  `tests/guide/merge-pdf.test.ts` and `tests/guide/single-document.test.ts`
  invoke it and **fail rather than skip**, because they are the only proof that
  the arguments this repository passes still merge, and that the inserted page
  is neither dropped nor resized. qpdf rather than `pdfunite` or `gs` for two
  stated reasons: `gs` re-distills the content streams, which is a re-render of
  an approved drawing, and qpdf is the one that will also report the page count
  and every page's size, which is what the merge is verified with. The default
  assumes Homebrew (`/opt/homebrew/bin/qpdf`, then `/usr/local/bin/qpdf`);
  override `PDF_MERGE` if yours lives elsewhere.
- **Homebrew's `qt@5`** (`brew install qt@5`), needed to build the VeroRoute
  fork the perfboard tooling drives. It is keg-only, which is why the tooling
  locates it via `brew --prefix qt@5` rather than expecting `qmake` on `PATH` -
  there is nothing to configure once it's installed.
- **[Bun](https://bun.sh/)**, for the runtime and the test suite.
- **One npm RUNTIME dependency you need, installed by `bun install` rather than
  by you**: `eecircuit-engine`, the vendored SPICE engine. It pulls in nothing
  transitively and ships its own types, so there is nothing to configure.

  **`elkjs` 0.9.3 is still declared in `package.json` and NOTHING IMPORTS IT.**
  It was the deleted generator's layout backend; the only remaining mentions of
  it in the tree are that declaration, `bun.lock` and the research documents.
  Recorded rather than quietly dropped, because removing a declared dependency
  is a `package.json` change and this was a prose pass: **the dependency is
  dead weight, not a prerequisite**, and `docs/known-gaps.md` G183's note on
  constructing it under Bun no longer applies to anything here.
- **No `SCHGEN_SOURCE`, and there is nothing to set.** This list carried that
  environment variable as a prerequisite for eight tests in
  `tests/schgen/port-fidelity.test.ts`, which proved every file under
  `lib/schgen/` was still a mechanical port of its `digital-pedal-platform`
  source. **That file and the tree it guarded are deleted**, nothing in the
  repository reads the variable, and a `bun test` on a fresh machine no longer
  has those eight failures in its baseline. `docs/known-gaps.md` G110 and
  G250's `noschgen` arm measured a prerequisite that no longer exists.

Nothing else needs setting up: the perfboard tooling builds and locates the
VeroRoute fork itself, and none of the rest of this requires an environment
variable. If you want to point at your own builds instead, `VEROROUTE`,
`QMAKE`, `KICAD_CLI` and `HTML_TO_PDF` are overrides, not required setup.

### Which of these a green `bun test` is NOT evidence about

**A missing prerequisite does not always produce a failure. Two of the five
make tests DISAPPEAR, and the suite's printed file count does not move when
they do** - so `3672 pass / 0 fail` in a tree missing one of them is a true
statement about a smaller suite than the number suggests. Measured over six
full-suite arms; `docs/known-gaps.md` **G250** carries the table, the method and
the per-file losses.

| prerequisite | what its absence does to `bun test` |
| --- | --- |
| **`kicad-cli`** | **ERASES 294 tests**, 144 of them in twelve files that leave no `testsuite` element, no name and no failure; 208 further testcases fail by name; 50 skip |
| **the VeroRoute binary** | **ERASES 48 tests**, 6 of them with no trace at all; 77 testcases fail by name |
| Google Chrome | fails **1** test, by name. Nothing erased |
| Homebrew `qt@5` | **nothing at all** - the suite exits 0. It is needed to BUILD the VeroRoute binary, not to use one that exists |

**This table had a fifth row, `SCHGEN_SOURCE`**, measured as eight named
failures in one file with nothing erased. Both the file and the variable are
deleted; the row is removed rather than kept as a prerequisite nobody can
satisfy. The other four rows are unchanged and were not re-measured in that
change, so they remain G250's figures with G250's date on them.

**The rule behind the table is where the prerequisite is resolved, not which
prerequisite it is**: resolved inside a test it fails loudly, resolved at a test
file's module scope it takes the rest of the file with it. If you are comparing
two suite runs, compare the junit reports' per-file testcase counts; `Ran N
tests` under-reports the gap by the number of unhandled errors, and `across N
files` does not move at all.

## Usage

```bash
bun install
bun test           # the full suite, including the SPICE simulations and the
                   # tests that invoke kicad-cli directly (see Prerequisites)
bun run typecheck
```

**There is no verb that writes a schematic, and `bun run schgen` is gone.**
It had two verbs, `check` and `generate`, over a design module exporting a
`DesignSpec`; all three verbs, the generator behind them and the one fixture
design in the tree were deleted with
`docs/superpowers/plans/2026-10-30-remove-schgen.md`. **G165**'s look at what it
drew is a look at deleted output.

A schematic is drawn by hand-running [`TOOLING.md`](TOOLING.md)'s loop and is
approved by the reviewer, never by a check. What `bun test` holds is the other
direction: `tests/circuits/drafted-kicad-round-trip.test.ts` and
`tests/circuits/transistor-preamp-kicad-round-trip.test.ts` export committed
sheets with the real `kicad-cli` and compare them against the models, **by
content, never by timestamp**.

Circuits are checked against real, physically-built layouts through the
perfboard workflow. `make check`, run from a board's directory (e.g.
`boards/pt2399-core`) or from the repository root to check every declared
board, is that workflow's front door - see `make help` for the rest of it.

`make guide`, run from a declared board's directory (e.g.
`boards/transistor-preamp-staged`), writes that board's printable build
packet into `<board>/guide/`: two component-side layout SVGs (by designator
and by value), a mirrored copper-side SVG of cuts and solder bridges, and a
`guide.html` that embeds all three images with a build checklist (in build
order: ICs and transistors, resistors and trim-pots, capacitors, wire links,
wire-to-board junctions, solder bridges, cuts) and, where the circuit module
declares them, a power-up table of expected DC voltages - **plus `guide.pdf`,
which is ONE printable document and the only file you take to the bench.** It
is that page printed, with the board's black-and-white schematic merged in as
its **page 2** on every board that has a schematic; the header's `Schematic`
row names that page. There is no second PDF: the packet used to be an
eleven-page `guide.pdf` and a one-page `schematic.pdf` beside it with nothing
saying the stack was two documents, and the owner asked for one
(2026-10-30: *"merge them. I want a single printable document"*).

Printing and merging are both part of this build system, not steps done by
hand afterwards: the converter is a Chromium-family browser resolved through
the `HTML_TO_PDF` make variable and the merge tool is a qpdf-compatible binary
resolved through `PDF_MERGE`, each exactly as `kicad-cli` is through
`KICAD_CLI` (see `make help`). A converter or merge tool that is missing, that
fails, or that exits 0 having produced nothing usable refuses by name rather
than leaving a packet whose document is quietly absent - and the merge is
checked against the artifact rather than the exit status, because a merge that
**drops** the schematic page still writes a valid PDF and still exits 0. The
page count and every page's size are read back from the merged file, so a
dropped page or a page the tool **resized** is a refusal. **Nothing is ever
scaled to fit**: a schematic page on paper other than US Letter goes in at its
own size and the document says so on page one. `guide/` is regenerated whole on every run, is
git-ignored, and is never hand-edited; the command refuses to write a packet
when the layout has unresolved cuts, an unplaced part, or disagrees with the
circuit it claims to be.

`make bom`, run from a declared board's directory, keeps that board's parts
list. It reads the board's circuit module (including its `bomConditions()`
export, the operating point resistor dissipation is simulated at), the
board's `bom.json` (which catalog part fills each line, the extras, and the
purchasing mode: a prototype names a `stockQuantity`, bought of every part
the catalog marks `stock`, rounded up to the next listed price break - but
only at or below `maxStockUnitPrice`, and only while each supplier's order
stays within `maxStockOverage` over the same order at covered quantities,
the costliest bulk buys set aside first) and the shared catalog in `parts/`. It derives what the
board needs from the circuit, reports the lines with nothing chosen, choices
the circuit no longer has, chosen parts that no longer meet their line
(naming the field - an active device fits by its catalog `specs.type`, never
its order code `mpn`), unknown catalog ids, and prices older than 45 days, then
rewrites the board's `BOM.md`. It exits non-zero until every line is chosen
and met. It never edits `bom.json` or the catalog: choices are made by a
person or the part-researcher agent. A board with no `bom.json` is refused,
naming the file to create; the minimal one is
`{ "purchasing": { "mode": "prototype", "shrinkage": 0.1, "stockQuantity": 100, "maxStockUnitPrice": 0.15, "maxStockOverage": 0.5 }, "lines": {}, "extras": [] }`.
`BOM.md` ends with a "Bulk buys" note: which parts are bought in bulk, and
which are not and why; the report lists the latter as information only.
For a board with a `bom.json`, `make check` also fails when the committed
`BOM.md` differs from a fresh rendering, a chosen part no longer meets its
line, or `bom.json` names a catalog part that does not exist; unchosen lines and stale prices do not fail `check`, and boards
without `bom.json` are unaffected.

`bun run parts` reads supplier data through Mouser's Search API and
Digi-Key's Product Information API (both official): `lookup <mpn>` for one
exact part's supplier part numbers, stock, price breaks and links at both
suppliers (Digi-Key: one listing per packaging); `search <keywords...>` for
candidates; `source <mpn> --supplier mouser|digikey --use <use> [--sku <part
number>]` to print a catalog source ready to paste; `refresh [<catalog
id>...]` to update the catalog's Mouser and Digi-Key prices in place (it
writes nothing unless every lookup succeeds). `--supplier` narrows any verb
to one supplier. Keys are read from `~/.config/mouser/mouser-credentials.txt`
and `~/.config/digikey/digikey-credentials.txt` and never printed; see
`docs/parts/sourcing-notes.md`.

A new board's KiCad schematic is **drawn**, not generated: [`TOOLING.md`](TOOLING.md)
is the procedure and [`EVALUATING-DRAWINGS.md`](EVALUATING-DRAWINGS.md) binds
before it. The committed schematics under `circuits/` were arranged by hand and
nothing regenerates them; the drawn pages live under `drafted/<circuit>/<board>/`
with their verdicts in [`docs/schematic/verdicts.md`](docs/schematic/verdicts.md).
**This paragraph said a new board's schematic comes from `bun run schgen`, and
cited G247 for which boards that generator would accept** - the verb and the
generator are deleted, so the question G247 answered is not one anybody can ask
of this tree.

## How the Pultec reference is validated

`circuits/pultec/electrical/three-band.ts` is not compared against any board or module —
none currently exist for it. What "validated" means here is narrower:

- **Topology** comes from an exact `kicad-cli` netlist export of a board that
  was actually manufactured. **Values** come from Thompson-Bell's documentation.
  The two agree on every capacitor position, which is what makes the reference
  evidence rather than a transcription. See `docs/pultec/provenance.md` for
  the corroboration in full.
- `tests/pultec/three-band.test.ts` checks the network is structurally
  valid and spot-checks component values against the documentation.
- `tests/pultec/partition.test.ts` checks that a hypothetical split of the
  reference into per-section modules (`circuits/pultec/partition.ts`) would
  own every element exactly once and recompose to the same network — a
  consistency check on the model, not a comparison against anything built.
- `tests/pultec/ac.test.ts` runs the network through SPICE across a matrix
  of control settings and checks the frequency response against hand-derived
  analytic values and the documented curve shapes.

None of this touches real hardware or a real PCB. See `docs/pultec/provenance.md`
("UNVALIDATED") and `docs/pultec/unresolved.md` item 1.

### Discrete inductors

The reference models the two multi-tapped coils as nine discrete inductors —
the hi boost section's four taps and the mid section's five — rather than as
tapped windings. The tap nets become internal nodes in the model. This removed
a modelling caveat about winding coupling between taps; see
`docs/pultec/unresolved.md` item 7 for what was retired and why.

The inductors are specified electrically rather than by part number — values,
±20% tolerance, DCR — in `docs/pultec/values.md`, together with the
measurements behind those limits. Nothing physical has been measured against
them; see `docs/pultec/unresolved.md`.

All eleven mid frequencies are modelled. A build that wants fewer would leave
positions unpopulated, because a position designed out of the model needs the
model changed to recover it — but no build exists yet to make that call.

## Writing a circuit

A circuit is a function that returns a `Network`:

```ts
export function myStage(): Network {
  return circuit()
    .resistor("input_bias_resistor", "10k", { a: "IN", b: "GND" })
    .port("input", "IN")
    .port("ground", "GND")
    .done()
}
```

Circuits compose with `include()`, which binds every declared port explicitly —
there are no implicit global nets, not even ground. Component ids are semantic
(`input_bias_resistor`, never `R1`); reference designators belong to KiCad.

**Give it a directory.** A circuit lives in `circuits/<circuit-name>/`, and its
authored sources sit there together — the `.ts` above alongside the
`.kicad_sch` and `.kicad_pro` if it has them. No KiCad file belongs at the top
level of `circuits/`, and an editable schematic never belongs under
`reference/`, which is for derived artifacts and analysis. The test is whether
the file will be *edited* here: if it will, it is a source.

`CLAUDE.md` has the conventions in full.

## Open questions

`docs/pultec/unresolved.md` is the list, kept deliberately rather than
tidied away. The two that matter most to anyone building this:

- **R3 is fitted at 4K7**, the value the documentation gives for the build with
  no inductors. An inductive build calls for nominally 470R, a difference of
  about 5 dB of maximum high boost and half the Q. One resistor.
- **Nothing here has been measured against hardware.** Every figure is
  model-derived.

## References

- [multi-channel-preamp](https://github.com/oletizi/multi-channel-preamp) — where the
  Pultec schematic and documentation came from originally. **This is history, not a
  dependency:** both are vendored under `circuits/pultec/` and `docs/pultec/`, nothing here reads
  anything from that repository, and it has its own purpose and lifecycle. The only
  external code this project depends on is the pinned VeroRoute fork.
- `docs/pultec/` — the modularization plan and its review. **Superseded as software
  instruction** — its `lib/passives/`, `lib/export/` and tscircuit references describe a
  layout this repository no longer has; each file carries a banner saying so. Its
  electrical content still stands.
- `docs/decisions/` — recorded architecture decisions, including why tscircuit
  was dropped
- `docs/schematic/` — the research the schematic-generation program rests on:
  what the published standards say about readable schematics, what already
  exists in agent and programmatic schematic generation, and how one working
  generator actually arrived at drawings somebody accepted.
  **`docs/schematic/README.md` is the index, and it records how far each of the
  three can be trusted** — they differ sharply, and the weakest verified nothing
  by running it.
- `docs/superpowers/specs/` — design documents for individual changes
