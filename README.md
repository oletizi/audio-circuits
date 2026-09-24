# Audio Circuits

A collection of audio circuits under development. Some are core, reusable
components meant to appear in future designs; some are designs in their own
right. Nothing here is finished software — it is hardware in progress.

## What this repository is for

**It is a bridge between AI agents and human designers**, and the split of
responsibilities is deliberate:

- **The TypeScript is for agents.** Agents are good at software, so a circuit
  is held as data — built with `lib/model/`'s `circuit()` builder or read from
  a KiCad netlist — where it can be validated, simulated in SPICE, composed,
  partitioned and checked. That is work an agent can do well and be held to.
- **The KiCad and VeroRoute interfaces are for the human designer.** Agents are
  bad at hardware design: they cannot draw a legible schematic and cannot be
  trusted to lay out a physical board. So the handoff is explicit. An agent
  codifies and tests the circuit; a person picks it up in KiCad and VeroRoute
  and produces the things that actually get built — readable schematics, and
  buildable layouts for stripboard, perfboard and manufactured PCBs.

Authority runs in both directions depending on where a circuit came from.
`lib/kicad/schematic.ts` writes a `.kicad_sch` **from** a model, as a starting
point a person rearranges into something legible. The Pultec runs the other
way: an existing design imported schematic-first, with the model derived from a
netlist export.

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
│   │   │                 # the schematic-stub writer (schematic.ts) that
│   │   │                 # writes a KiCad .kicad_sch from a Network
│   │   └── symbols/      # Vendored KiCad symbol definitions the stub writer
│   │                     # embeds, so a generated schematic never depends on
│   │                     # an installed KiCad - see symbols/PROVENANCE.md
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
- **Homebrew's `qt@5`** (`brew install qt@5`), needed to build the VeroRoute
  fork the perfboard tooling drives. It is keg-only, which is why the tooling
  locates it via `brew --prefix qt@5` rather than expecting `qmake` on `PATH` -
  there is nothing to configure once it's installed.
- **[Bun](https://bun.sh/)**, for the runtime and the test suite.

Nothing else needs setting up: the perfboard tooling builds and locates the
VeroRoute fork itself, and none of this requires an environment variable. If
you want to point at your own builds instead, `VEROROUTE`, `QMAKE` and
`KICAD_CLI` are overrides, not required setup.

## Usage

```bash
bun install
bun test           # the full suite, including the SPICE simulations and one
                   # test that invokes kicad-cli directly (see Prerequisites)
bun run typecheck
```

Circuits are checked against real, physically-built layouts through the
perfboard workflow. `make check`, run from a board's directory (e.g.
`boards/pt2399-core`) or from the repository root to check every declared
board, is that workflow's front door - see `make help` for the rest of it.

A new board's KiCad schematic starts from a generated stub, written once with
`bun run schematic-stub <circuit-module> <export> <out.kicad_sch>` (e.g.
`circuits/transistor-preamp/lab-board.kicad_sch`) and arranged by hand in
KiCad from there; see `lib/kicad/schematic.ts`'s module comment for what the
stub does and does not carry.

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
- `docs/superpowers/specs/` — design documents for individual changes
