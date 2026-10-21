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

Authority runs in both directions depending on where a circuit came from.
`lib/schgen/` writes a `.kicad_sch` **from** a model — templates, a layout
backend, deterministic UUIDs and a set of gates — and `bun run schgen` is its
front door. The Pultec runs the other way: an existing design imported
schematic-first, with the model derived from a netlist export.

`lib/kicad/schematic.ts` is the **superseded** stub writer that `lib/schgen/`
replaced. Nothing invites you to it: there is no script and no verb. It survives
only because the five `tests/circuits/transistor-preamp-*.test.ts` files are this
repository's only `kicad-cli` proof that KiCad reads a generated schematic the
way the circuit means it, and `schgen` cannot draw any of those five boards
today — it **refuses** `lab-board` at layout, and the other four it **cannot be
offered at all**, because no module declares a schematic for them.
`docs/known-gaps.md` **G247** measures the refusals, **G248** records what has to
be true before the file goes, and **G81** records what is wrong with what it
emits.

**KiCad is a primary tool here, not an optional extra.** `make check` runs
`kicad-cli` on every board on every run. Treat it the way you would a compiler.

Read `CLAUDE.md` for the conventions every circuit follows.

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
  has to be present to run `make check` against a declared board. It is also
  required for `bun test`: exactly one test, "KiCad reads the generated stub
  as the same circuit" in `tests/circuits/transistor-preamp-lab.test.ts`,
  deliberately invokes `kicad-cli` and **fails** (never skips) when it cannot
  find it, because it is the only proof that KiCad reads a generated
  schematic stub the way the circuit means it. Every other test injects
  `kicad-cli` out. The default assumes a standard macOS install
  (`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`); override
  `KICAD_CLI` if yours lives elsewhere.
- **[Google Chrome](https://www.google.com/chrome/)** (or another
  Chromium-family browser), for printing a build guide. Required by `make
  guide`, which renders `guide.html` to `guide.pdf` with it - printing is part
  of this build system rather than a manual step afterwards, so a missing
  converter **refuses by name** instead of writing a packet with no PDF. It is
  also required for `bun test`: exactly one test, "the real converter prints a
  multi-page PDF from a page with the guide's print CSS" in
  `tests/guide/print-pdf.test.ts`, invokes it and **fails** (never skips) when
  it cannot find it, because Chrome's headless flags have changed across
  versions and it is the only proof that the flags this repository passes
  still produce a PDF. The default assumes a standard macOS install
  (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`); override
  `HTML_TO_PDF` if yours lives elsewhere.
- **Homebrew's `qt@5`** (`brew install qt@5`), needed to build the VeroRoute
  fork the perfboard tooling drives. It is keg-only, which is why the tooling
  locates it via `brew --prefix qt@5` rather than expecting `qmake` on `PATH` -
  there is nothing to configure once it's installed.
- **[Bun](https://bun.sh/)**, for the runtime and the test suite.
- **Two npm RUNTIME dependencies, installed by `bun install` rather than by
  you**: `eecircuit-engine` (the vendored SPICE engine) and `elkjs` (the
  schematic layout backend, pinned to an exact version). Neither pulls in
  anything transitively and both ship their own types, so there is nothing to
  configure. `elkjs` is 7.7 MB on disk, almost all of it one
  GWT-compiled worker, and it needs a non-obvious construction under Bun -
  `docs/known-gaps.md` G183 records why, and why the pinned version is 0.9.3
  rather than the latest.
- **`SCHGEN_SOURCE`**, an environment variable (no default - see below),
  pointing at a local checkout of `digital-pedal-platform`'s
  `tools/schgen/` directory, the source tree the `lib/schgen/` port is
  ported from. Required for exactly one test,
  "every ported file is its source, rewritten only by the manifest" in
  `tests/schgen/port-fidelity.test.ts`, which **fails** (never skips) when
  it is unset, because it is the only proof that every file under
  `lib/schgen/` is still a mechanical port of its pedals source and not a
  hand edit. Unlike `kicad-cli`, Chrome or `qt@5`, this has **no default
  path to assume**: it names another private repository checkout on this
  machine, not a package with one standard install location, so nothing
  here guesses where that checkout lives. See `lib/schgen/README.md` and
  `docs/known-gaps.md` G110.

Nothing else needs setting up: the perfboard tooling builds and locates the
VeroRoute fork itself, and none of the rest of this requires an environment
variable. If you want to point at your own builds instead, `VEROROUTE`,
`QMAKE`, `KICAD_CLI` and `HTML_TO_PDF` are overrides, not required setup.

## Usage

```bash
bun install
bun test           # the full suite, including the SPICE simulations, one
                   # test that invokes kicad-cli directly, and one that
                   # requires SCHGEN_SOURCE (see Prerequisites)
bun run typecheck
```

`bun run schgen` is the schematic generator's front door, and it has two verbs:

```bash
bun run schgen check <design-module>       # build, validate, report staleness; writes nothing
bun run schgen generate <design-module>    # the same, then write the KiCad project
                                           #   --init             create the lock files
                                           #   --accept-toolchain record a new KiCad baseline
```

A design module is TypeScript exporting `design` (a `DesignSpec`); the only one
in this repository today is the ported fixture at
`tests/schgen/__fixtures__/designs/mini/index.ts`. `check` is read-only, which
is structural rather than careful - the only writer is injected into the CLI -
and it compares what is on disk to what the model produces **by content, never
by timestamp**. `lib/schgen/README.md` explains the generator; `docs/known-gaps.md`
**G165** is a look at what it draws.

Circuits are checked against real, physically-built layouts through the
perfboard workflow. `make check`, run from a board's directory (e.g.
`boards/pt2399-core`) or from the repository root to check every declared
board, is that workflow's front door - see `make help` for the rest of it.

`make guide`, run from a declared board's directory (e.g.
`boards/transistor-preamp-staged`), writes that board's printable build
packet into `<board>/guide/`: two component-side layout SVGs (by designator
and by value), a mirrored copper-side SVG of cuts and solder bridges, the
schematic as a black-and-white PDF (when the board declares one), and a
`guide.html` that embeds all three images with a build checklist (in build
order: ICs and transistors, resistors and trim-pots, capacitors, wire links,
wire-to-board junctions, solder bridges, cuts) and, where the circuit module
declares them, a power-up table of expected DC voltages - **plus that page
printed as `guide.pdf`, which is the file you take to the bench.** Printing
is part of this build system, not a step done by hand in a browser
afterwards: the converter is a Chromium-family browser resolved through the
`HTML_TO_PDF` make variable exactly as `kicad-cli` is through `KICAD_CLI`
(see `make help`), and a converter that is missing, that fails, or that exits
0 having printed nothing refuses by name rather than leaving a packet whose
PDF is quietly absent. `guide/` is regenerated whole on every run, is
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

A new board's KiCad schematic comes from `bun run schgen` — its two verbs and
what a design module is are at the top of this section. The committed
schematics under `circuits/` predate the generator and were arranged by hand;
nothing regenerates them, and `docs/known-gaps.md` **G247** measures which of
this repository's own boards `schgen` will accept today, which is none of the
five preamp boards.

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
