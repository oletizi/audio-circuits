# Canonical Circuit Model — Design

**Status:** proposed, awaiting maintainer review
**Date:** 2026-09-21
**Supersedes:** `2026-09-21-schematic-readability-testing-design.md` (and its plan), which
measured a renderer this design removes.

## 1. Purpose

Establish one way to describe a circuit in this repository, verify it by simulation
against targets stated in its design spec, and hand the human-readable schematic to a
person working in KiCad — with changes flowing both ways without destroying either
side's work.

### 1.1 Why now

The repository currently holds two representations of the same thing:

- circuits authored as tscircuit TSX components (all eight of them), and
- `lib/passives/` — a declarative network model, *derived* from tscircuit output by
  `lib/export/circuit-json.ts`, used for SPICE simulation.

`ExportMapping` in that file is a hand-maintained translation table between the two. It
requires that "every component must appear", remaps `pin1`/`pin2` to `a`/`b`, and throws
on any unmapped port. It exists solely because there are two models. It is 290 lines of
pure seam.

### 1.2 Why tscircuit is being removed

Measured, not assumed. Four fixtures (retained in the readability workspace as
`label-rule*.tsx`) established how tscircuit decides between drawing a wire and emitting
a net label:

- A named `<net>` element **always** emits a label — any distance, any orientation, any
  number of members.
- A pin-to-pin trace emits a label **when the schematic wire router fails to find a
  path**. Core runs an autorouter and, on zero results for a symbol/chip connection,
  calls `_doInitialSchematicTraceRenderWithDisplayLabel()` and returns.
- There is no distance threshold in the code. Distance and pin orientation matter only
  because they determine whether routing succeeds — wires appear below roughly 3 units
  when pins face along the connection axis, and never when the run must dogleg across
  symbol bodies.
- The router's settings (`MAX_ITERATIONS: 100`, `OBSTACLE_MARGIN: 0.1`, margin tiers)
  are hardcoded at the call site.
- `_schDirectLineRoutingEnabled` would substitute a router that cannot fail, but it is
  absent from `@tscircuit/props` and props parse in zod `"strip"` mode, so passing it
  from JSX never reaches core. Verified: labels identical with it set and unset.

The disqualifying property is not that labels appear. It is that **a routing failure is
silently re-rendered as a label**, producing a drawing that looks deliberate. A tool that
fails loudly is workable. One that disguises failure as a design decision cannot be
verified by looking, and offers no override.

Two prior claims recorded in this repository were wrong and are corrected here:
"multi-terminal junctions never render as wires" (they do — zero labels at six members,
wired pin-to-pin), and a theory that member count drives the choice (it does not).

## 2. Principles

1. **One model.** Exactly one way to describe a circuit, repository-wide.
2. **Supersede means delete.** A replaced pattern is removed in the same change that
   replaces it, never left as a stub. Vestigial code is mistaken for canon by readers
   and agents, and propagates itself into new work.
3. **Errors, not fallbacks.** Missing data throws, naming what is missing.
4. **Targets come from the spec, not from measurement.** A test asserts what the design
   claimed, never a value harvested from current behaviour.

Principle 4 is a direct response to this repository's experience with recorded baselines,
where the update ritual was "set it to whatever we measured" and the metric stopped
constraining anything.

## 3. The canonical model

A circuit is components plus the nets their pins name. Nets are implied by pin
references rather than declared separately — one place to keep correct, which is how
`PassiveNetwork` already works.

```ts
interface Network {
  readonly components: readonly Component[]
  /** External interface: port name -> net name. */
  readonly ports: Readonly<Record<string, string>>
}

interface Component {
  /** Unique within the network. Stable, human-readable: "R_IN_BIAS". */
  readonly ref: string
  readonly kind: ComponentKind
  /** Pin name -> net name. */
  readonly pins: Readonly<Record<string, string>>
  readonly parameters: Parameters
  readonly part?: PartIdentity
}

interface PartIdentity {
  readonly mpn?: string
  readonly symbol: string       // KiCad symbol id, "Amplifier_Operational:TL072"
  readonly footprint?: string   // KiCad footprint id
  readonly spiceModel?: string  // subcircuit or .model name
}
```

### 3.1 Component kinds

Existing: `resistor`, `capacitor`, `inductor`, `potentiometer`, `switch`.
Added: `opamp`, `bjt`, `diode`, `photoresistor`.

No structural change is required. `pins` is already `Record<string, string>`, so an
eight-pin op-amp is expressible today. The work is in two downstream places:

- `resolveNetwork` (`control-state.ts`) currently requires exactly two pins keyed
  `a`/`b` and rejects anything else.
- The SPICE emitter reads `pins.a`/`pins.b` directly.

Both must generalise to named, arbitrary-arity pins. Two-terminal passives keep `a`/`b`
as their conventional pin names, so existing networks remain valid.

### 3.2 `PartIdentity` replaces footprinter

Once tscircuit is gone, footprints become KiCad library references and live on the
component. The same record carries the symbol the sync tool needs when creating a part
the human has not drawn, and the model name simulation needs. One place, three
consumers.

### 3.3 Identity

`ref` is human-readable and may be renamed. It is **not** the sync key. KiCad symbols
carry a native UUID that survives renaming a designator, moving between sheets, and
re-annotation. The sync baseline (§6) stores the `ref` ↔ UUID pairing, so no opaque
identifiers appear in circuit source and a rename is recognised as a rename rather than
a delete plus an add.

## 4. Authoring

A circuit is a function returning a `Network`. A builder keeps declarations terse; one
primitive handles composition.

```ts
export function pultecMid(p: { boost: Value }): Network {
  const n = circuit()
  n.resistor("R1", "10k", { a: "IN", b: "MID" })
  n.capacitor("C1", p.boost, { a: "MID", b: "GND" })
  n.port("IN", "IN")
  n.port("OUT", "MID")
  n.port("GND", "GND")
  return n.done()
}

export function passiveEq(): Network {
  const n = circuit()
  n.include("MID", pultecMid({ boost: "10nF" }),
            { IN: "SIG_IN", OUT: "SIG_MID", GND: "GND" })
  n.include("LB", pultecLowBoost(),
            { IN: "SIG_MID", OUT: "SIG_OUT", GND: "GND" })
  return n.done()
}
```

Active devices use named pins:

```ts
n.opamp("U1", { symbol: "Amplifier_Operational:TL072", spiceModel: "TL072" },
        { "IN+": "SIG_IN", "IN-": "FB", OUT: "OUT", "V+": "V9", "V-": "GND" })
```

### 4.1 `include` is the whole composition story

`include(prefix, network, portMap)`:

- prefixes every ref (`MID_R1`)
- renames internal nets to `<prefix>_<net>`
- binds the sub-circuit's declared ports to the parent's nets per `portMap`

It throws when `portMap` omits a declared port, names an undeclared one, or would
collide with an existing ref. This is the explicit, checkable equivalent of
`<PultecMid name="MID"/>` plus traces.

### 4.2 Validation moves into construction

`done()` runs structural validation and throws on: duplicate refs, pin names invalid for
the kind, unbound ports, and pins left unconnected. `expectNoFloatingPins` — a test
helper today — becomes structurally unreachable.

### 4.3 Consequence

Circuits become plain values. No rendering, no async, no autorouter. Connectivity tests
that currently take roughly 50 seconds become milliseconds, and render timeouts cease to
be a category of failure.

## 5. Simulation

`lib/sim/` already provides `toSpiceNetlist`, `runAcSweep` over `eecircuit-engine`,
floating-branch pruning, and comparison helpers. Three additions.

### 5.1 Emitter support for active devices

Op-amps emit subcircuit invocations (`X`), BJTs and diodes emit device lines plus
`.model` references. Pin order per kind is fixed by the emitter, not by author order, so
a mis-ordered pin map cannot silently produce a different circuit.

### 5.2 A model library with provenance

`lib/sim/models/` holds SPICE text in three categories, kept distinct because their
trust and licensing differ:

- **Standard discretes** (2N3904, 1N4148) — short `.model` lines stored as data.
- **Vendor subcircuits** (TL072) — vendor `.subckt` text, vendored as files, each
  recording its origin and terms.
- **Behavioural models** — written here, with the derivation documented.

A component's `spiceModel` names an entry. An unknown name throws rather than
substituting anything.

### 5.3 The vactrol, and what is deliberately excluded

A vactrol is two coupled devices: an LED, and an LDR whose resistance depends on the
LED's current. The LED is an ordinary diode. The LDR becomes a behavioural resistor
following the transfer curve already stated in the compressor spec (dark resistance
≥ 1 MΩ; R_LDR ≤ 10.2 kΩ at full drive).

**Excluded from the first version: the LDR's time lag.** Real vactrol release is
dominated by the photocell's slow recovery. The compressor spec characterises the
detector capacitor's discharge but not the cell's own lag. Modelling it badly would be
worse than omitting it, because it would yield release figures that look authoritative
and are not. Recorded as a known gap; release-time assertions stay out of scope until
the cell is characterised.

### 5.4 What tests assert

```ts
const ac = await acSweep(net, { in: "IN", out: "OUT", from: "20Hz", to: "20kHz" })
expectGainAt(ac, "1kHz", { db: 0, tol: 0.5 })

const op = await operatingPoint(net, { supplies: { V9: "9V" } })
expectNodeVoltage(op, "VBIAS", { volts: 4.5, tol: 0.1 })
```

Targets are transcribed from the circuit's design spec. Stored response curves are
**not** part of this design; see §2 principle 4.

### 5.5 A precondition this creates

Principle 4 means a circuit cannot get simulated assertions until its design spec states
numeric targets. Only the optical compressor currently has a spec in that form. The
Pultec sections have `docs/pultec/`, and the `pt2399` branch validates against a
documented insertion loss, but whether each of the five sections has stated,
transcribable targets is unverified.

**Therefore each rung of §9.2 that ports a circuit must first confirm its targets exist,
and write them into a spec if they do not.** Writing targets by measuring the current
implementation is forbidden by principle 4 — targets are derived from the circuit's
intended response, not harvested from its behaviour. Where a section's intended response
cannot be established, that circuit ports with connectivity and value assertions only,
and the missing targets are recorded as a gap rather than invented.

## 6. KiCad sync

### 6.1 Artefacts

Per circuit, three files:

| File | Owner | Contents |
|---|---|---|
| `circuits/<name>.ts` | code | the `Network` |
| `kicad/<name>/<name>.kicad_sch` | human | the drawing |
| `kicad/<name>/.sync-base.json` | tool | last agreed netlist + `ref` ↔ UUID pairings |

The baseline is what makes "I changed this" distinguishable from "you changed this". Two
independently editable sides without a common ancestor can only guess; with one, this is
an ordinary three-way merge.

### 6.2 What syncs

Netlist facts only: components, values, part identity, and which pins sit on which nets.

Placement, wire geometry, sheet organisation, annotation and title blocks are the
human's exclusively. The tool never writes them.

### 6.3 Code → KiCad

- **New component** — insert the symbol in a marked unplaced area for the human to
  position.
- **Value or part change** — edit the symbol property in place.
- **Deletion** — remove the symbol; report any wires left dangling.
- **Connectivity change** — attach a KiCad **net label** to the affected pin rather than
  attempting to route a wire.

The last point is the design's one concession, and it is deliberate. A wire is drawn
geometry; nothing can redraw a human's layout safely. A net label is electrically
correct, idiomatic KiCad, requires no routing, and is conspicuous — it reads as
machine-added and awaiting tidy-up, and the human replaces it with a drawn wire at
leisure. This is the opposite of the tscircuit behaviour that motivated this design: a
label here is a visible, chosen fallback, not a silent one disguising a failure.

### 6.4 KiCad → code

The tool emits a precise change list. It does **not** rewrite TypeScript: auto-editing
circuit definitions is fragile and a wrong edit is expensive. Drift cannot persist
silently because a test fails while code and schematic disagree, so the report is always
acted on.

### 6.5 Conflicts

Reported and skipped individually; all non-conflicting changes still merge. The cases:
the same value changed differently on both sides; a component deleted on one side and
edited on the other; the same pin rewired differently.

## 7. Repository structure

```
circuits/            circuit definitions (functions returning Network)
lib/model/           Network, Component, validation, the circuit() builder
lib/sim/             SPICE emission, simulation, assertions
lib/sim/models/      device models, with provenance
lib/kicad/           netlist extraction, symbol editing, three-way merge
kicad/<name>/        hand-drawn schematics and their sync baselines
docs/superpowers/specs/   design specs, including per-circuit targets
```

`lib/passives/` is renamed `lib/model/` as part of this work. The name described the
Pultec's passive EQ section, not an architectural boundary, and keeping it would imply a
distinction this design does not make.

## 8. Testing strategy

| Layer | Asserts | Cost |
|---|---|---|
| Model | validation rejects malformed networks; `include` prefixing and port binding | milliseconds |
| Circuit | parts, values and connectivity match the design spec | milliseconds |
| Simulation | behaviour meets targets stated in the design spec | seconds |
| Sync | three-way merge cases, including every conflict class | milliseconds |
| Round-trip | a `.kicad_sch` parsed and re-emitted is byte-identical | milliseconds |

The round-trip test is load-bearing: it is what makes in-place editing of a human's
schematic safe to attempt at all.

Existing practice worth keeping: `lib/passives/mutable.ts` exists so tests can corrupt a
network deliberately and prove validation catches it. That pattern extends to the new
validation.

## 9. Migration and removal

### 9.1 Preserved first

`docs/superpowers/specs/2026-09-21-optical-compressor-design.md` exists **only** on
`feature/opto-compressor`, along with 46 unmerged commits. It is the actual engineering —
topology, thresholds, vactrol selection, release model — and is tool-independent.
Cherry-picking it to `main` is step zero of the plan, before anything else.

A short decision record carrying §1.2's findings is written alongside it, so the
tscircuit question is not re-opened and no apparatus is left behind to explain it.

### 9.2 Order — a capability ladder

Each rung deletes what it replaces **in the same commit**, so no circuit ever exists in
two representations.

1. Authoring layer and validation. No circuits yet.
2. **Five Pultec sections.** Passive only — every part is already supported, so this
   proves the path end to end with zero new device work.
3. **`pultec-passive-eq`.** Proves `include`.
4. **Op-amp support and vendor subcircuits**, then `opamp-buffer`.
5. **BJT, diode, photoresistor, vactrol behavioural model**, then the optical
   compressor. Hardest case, deliberately last.
6. **KiCad sync.** May begin once step 2 lands; it needs only a netlist.
7. Final sweep: dependency removal, `CLAUDE.md` rewrite.

### 9.2a This is more than one implementation plan

The ladder spans a new authoring layer, device and simulation work, a three-way merge
tool, and eight circuit ports. That is too much for a single plan to hold without
becoming a document nobody can execute against.

Proposed split, each producing working, tested software on its own:

| Plan | Rungs | Delivers |
|---|---|---|
| A — model and authoring | 0-3 | `Network`, the builder, `include`, validation, five Pultec sections and `pultec-passive-eq` ported, their TSX deleted |
| B — active devices and simulation | 4-5 | op-amp/BJT/diode/photoresistor support, model library, vactrol behavioural model, `opamp-buffer` and the compressor ported, their TSX deleted |
| C — KiCad sync | 6-7 | round-trip test, netlist extraction, three-way merge, dependency removal, `CLAUDE.md` rewrite |

Plan A must complete before B (B's circuits need the authoring layer). C may begin after
A, and its round-trip test (§10) should run early regardless, since a negative result
there changes the sync design.

### 9.3 Deleted

With the port that supersedes each:

- all eight TSX modules
- `lib/chips/`, `lib/connectors/`, `lib/layout.ts`
- `lib/export/circuit-json.ts` — the translation seam
- `lib/testing/circuit-assertions.ts`
- `lib/testing/schematic-tier1.ts`, `lib/testing/schematic-gate.ts`, their tests,
  `scripts/check-r2.ts`, and the readability spec and plan
- `*.circuit.tsx` entry points
- the `tscircuit` dependency, the tscircuit skill, and the tscircuit sections of
  `CLAUDE.md`

`feature/opto-compressor` is abandoned apart from the cherry-pick. Its 46 commits are
measurement apparatus for a removed renderer, plus a module rewritten in step 5.

## 10. Risks

| Risk | Handling |
|---|---|
| `kicadts` cannot round-trip our schematics losslessly | Round-trip test (§8) is written **first**, in step 6, before any in-place editing. If it fails, the sync design is reconsidered before work is sunk into it. |
| Vendor SPICE models unavailable or unlicensed for redistribution | Provenance recorded per model (§5.2). Where a model cannot be vendored, the circuit's simulated assertions are scoped to what can be modelled, and the gap is recorded rather than approximated. |
| Op-amp subcircuits converge poorly, making simulation flaky | Step 4 is a gate: if `opamp-buffer` cannot be simulated reliably, simulation scope for active circuits is reconsidered before step 5 commits to the compressor. |
| KiCad symbol library ids drift between KiCad versions | `PartIdentity.symbol` is data, and a missing symbol throws at sync time with the id named. |
| The compressor port is larger than estimated | It is last, so every earlier rung is already delivering value independently. |

## 11. Open questions for the maintainer

1. **Net naming across the seam.** KiCad derives net names from labels and generates the
   rest. Our nets are named in code. The baseline pairs them, but a net renamed on both
   sides is a conflict class this design does not yet specify handling for.
2. **Reference designators.** KiCad expects `R1`, `C3`, `U2`. Our refs are semantic
   (`R_IN_BIAS`). Proposal: carry both — semantic `ref` in code, designator as a KiCad
   property paired in the baseline — but whether designators should also appear in code
   is unresolved.
3. **Multi-sheet schematics.** Assumed single-sheet per circuit for now. Hierarchical
   sheets in KiCad would interact with `include` in ways not designed here.
