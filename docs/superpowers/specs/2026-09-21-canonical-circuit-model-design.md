# Canonical Circuit Model — Design

**Status:** revision 2, proposed, awaiting maintainer review
**Date:** 2026-09-21
**Supersedes:** `2026-09-21-schematic-readability-testing-design.md` (and its plan), which
measured a renderer this design removes.

Revision 2 responds to a third-party review. Changes: components model multiple symbol
units (§3.2); component identity is separated from reference designator (§3.3); net
identity for reconciliation is membership-based with overlap matching (§6.2); canonical
pin names are fixed per kind (§3.4); `include` forbids implicit global nets (§4.1);
floating-net validation is stated precisely (§4.3); structural and behavioural acceptance
are separated (§5.5); the round-trip gate is strengthened to mutation-preservation
(§8.1); code-side deletion no longer removes symbols automatically (§6.4); machine-added
labels are given explicit lifecycle semantics (§6.5).

## 1. Purpose

Establish one way to describe a circuit in this repository, verify it against targets
stated in its design spec, and hand the human-readable schematic to a person working in
KiCad — with changes flowing both ways without destroying either side's work.

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

Measured, not assumed. Four fixtures established how tscircuit chooses between drawing a
wire and emitting a net label:

- A named `<net>` element **always** emits a label — any distance, any orientation, any
  number of members.
- A pin-to-pin trace emits a label **when the schematic wire router fails to find a
  path**. Core runs an autorouter and, on zero results for a symbol/chip connection,
  calls `_doInitialSchematicTraceRenderWithDisplayLabel()` and returns.
- There is no distance threshold in the code. Distance and pin orientation matter only
  because they determine whether routing succeeds — wires appear below roughly 3 units
  when pins face along the connection axis, and never when the run must dogleg across
  symbol bodies.
- The router's settings (`MAX_ITERATIONS: 100`, `OBSTACLE_MARGIN: 0.1`, margin tiers) are
  hardcoded at the call site.
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
   replaces it, never left as a stub. Vestigial code is mistaken for canon by readers and
   agents, and propagates itself into new work.
3. **Errors, not fallbacks.** Missing data throws, naming what is missing.
4. **Targets come from the spec, not from measurement.** A test asserts what the design
   claimed, never a value harvested from current behaviour.
5. **The human owns the drawing.** Geometry, placement and sheet structure are never
   written by a tool. Where honouring that conflicts with applying a change
   automatically, the change is reported instead.

Principle 4 responds to this repository's experience with recorded baselines, where the
update ritual was "set it to whatever we measured" and the metric stopped constraining
anything. Principle 5 is the rule that decides §6's asymmetries.

## 3. The canonical model

A circuit is components plus the nets their pins name. Nets are implied by pin references
rather than declared separately — one place to keep correct.

```ts
interface Network {
  readonly components: readonly Component[]
  /** External interface: port name -> net name. */
  readonly ports: Readonly<Record<string, string>>
}

interface Component {
  /** Stable semantic identity, e.g. "input_bias". Never a designator. See §3.3. */
  readonly id: string
  readonly kind: ComponentKind
  readonly parameters: Parameters
  /** Package-level realisation. */
  readonly part?: PartSpec
  /** Package pins shared across units: supply, shield, substrate. */
  readonly pins: Readonly<Record<string, string>>
  /** One entry per functional unit. Single-unit parts have exactly one. */
  readonly units: readonly Unit[]
}

interface Unit {
  /** Unique within the component: "A"/"B" for a dual op-amp, "MAIN" otherwise. */
  readonly name: string
  /** Canonical pin name -> net name. Names fixed by kind (§3.4). */
  readonly pins: Readonly<Record<string, string>>
  /** KiCad symbol unit for this unit, when it differs from the package symbol. */
  readonly symbol?: string
  /** SPICE subcircuit invoked once per unit. */
  readonly spiceModel?: string
}

interface PartSpec {
  readonly mpn?: string
  readonly footprint?: string
  readonly symbol?: string   // KiCad symbol library id
}
```

### 3.1 Component kinds

Existing: `resistor`, `capacitor`, `inductor`, `potentiometer`, `switch`.
Added: `opamp`, `bjt`, `diode`, `photoresistor`.

`pins` is already `Record<string, string>`, so arbitrary arity needs no structural
change. Two downstream places must generalise:

- `resolveNetwork` (`control-state.ts`) currently requires exactly two pins keyed `a`/`b`.
- The SPICE emitter reads `pins.a`/`pins.b` directly.

Two-terminal passives keep `a`/`b` as their canonical pin names, so existing networks
remain valid.

### 3.2 Units: one physical component, one or more symbol units

**A `Component` is one physical part.** A TL072 is a single component: one package, one
footprint, one BOM line, one MPN — and *two* amplifier units plus shared supply pins.

This distinction is load-bearing rather than decorative, because each consumer wants a
different level:

| Consumer | Works at |
|---|---|
| KiCad | one symbol instance **per unit** (U1A, U1B), sharing a designator |
| SPICE | one subcircuit invocation **per unit**, supply pins from the package |
| BOM and footprint | one line **per package** |

Supply pins live in `Component.pins` because they belong to the package and are shared.
Signal pins live in `Unit.pins`.

Single-unit parts are not special-cased: a resistor has exactly one unit named `MAIN`,
and the builder (§4) constructs it, so authoring a resistor never mentions units.

**Plan A need not implement multi-unit KiCad mapping**, but the model carries units from
the start, because the alternative is baking in a one-component/one-symbol assumption
that the compressor and `opamp-buffer` both violate in Plan B.

### 3.3 Identity, and what is not identity

Three distinct things, previously conflated:

| Concept | Lives in | Owner | Mutable |
|---|---|---|---|
| `Component.id` | circuit source | code | treated as immutable (below) |
| Reference designator (`R17`, `U1`) | sync baseline | **KiCad** | freely |
| KiCad symbol unit UUID | `.kicad_sch` | KiCad | no |

`id` is semantic and stable — `input_bias`, not `R17`. The sync baseline pairs it with
the KiCad symbol unit UUIDs it maps to.

**Designators are not declared in circuit source.** A designator is a schematic
presentation concern; KiCad's annotation tool renumbers them routinely, and running it
must never look like a circuit change. The baseline records the designator so a BOM can
be produced, but code never states one. (This deviates from the review's suggestion of a
`designator?` field on `Component`: a field that code declares but KiCad owns would drift
by construction.)

**`id` is treated as immutable for synchronisation.** It is a string in source, so
nothing can enforce that. The honest consequence: **a changed `id` is indistinguishable
from a delete plus an add, so it is reported and never applied.** That is safe precisely
because §6.4 removes automatic deletion.

### 3.4 Canonical pin names belong to the kind

Each kind fixes its pin vocabulary. Downstream formats do not get to dictate it — this is
the main reason a canonical model is worth having.

| Kind | Unit pins | Package pins |
|---|---|---|
| resistor, capacitor, inductor, photoresistor | `a`, `b` | — |
| diode | `anode`, `cathode` | — |
| bjt | `base`, `collector`, `emitter` | — |
| opamp | `in+`, `in-`, `out` | `v+`, `v-` |
| potentiometer | `ccw`, `wiper`, `cw` | — |
| switch | per switch kind | — |

Each kind additionally declares three mappings, stored with the kind rather than with the
consumer:

- canonical pin → KiCad symbol pin number, per unit
- canonical pin → SPICE positional argument order
- canonical pin → footprint pad

A pin name outside its kind's vocabulary throws at construction.

### 3.5 `PartSpec` replaces footprinter

Once tscircuit is gone, footprints become KiCad library references. `PartSpec` carries
package-level facts; `Unit.symbol` and `Unit.spiceModel` carry per-unit ones. The review
proposed flattening these onto `Component`; that is rejected because units make the
package/unit split real, and flattening would have to be undone in Plan B.

## 4. Authoring

A circuit is a function returning a `Network`. A builder keeps declarations terse; one
primitive handles composition.

```ts
export function pultecMid(p: { boost: Value }): Network {
  const n = circuit()
  n.resistor("series_r", "10k", { a: "IN", b: "MID" })
  n.capacitor("shunt_c", p.boost, { a: "MID", b: "GND" })
  n.port("IN", "IN")
  n.port("OUT", "MID")
  n.port("GND", "GND")
  return n.done()
}

export function passiveEq(): Network {
  const n = circuit()
  n.include("mid", pultecMid({ boost: "10nF" }),
            { IN: "SIG_IN", OUT: "SIG_MID", GND: "GND" })
  n.include("low_boost", pultecLowBoost(),
            { IN: "SIG_MID", OUT: "SIG_OUT", GND: "GND" })
  return n.done()
}
```

A dual op-amp declares its units once and its supply once:

```ts
n.opamp("sidechain_amp", {
  part: { mpn: "TL072CP", symbol: "Amplifier_Operational:TL072",
          footprint: "Package_DIP:DIP-8_W7.62mm" },
  supply: { "v+": "V9", "v-": "GND" },
  units: {
    A: { "in+": "DET_IN", "in-": "DET_FB", out: "DET_OUT" },
    B: { "in+": "MAKEUP_IN", "in-": "MAKEUP_FB", out: "MAKEUP_OUT" },
  },
})
```

### 4.1 `include`, and no implicit global nets

`include(prefix, network, portMap)`:

- prefixes every component id (`mid_series_r`)
- renames internal nets to `<prefix>_<net>`
- binds the sub-circuit's declared ports to the parent's nets per `portMap`

**Invariant, stated deliberately: there are no implicit or global nets in a `Network`.**
Ground, supply rails and bias references are not special. Every net crossing a
composition boundary must be declared as a port and explicitly bound.

This is why `pultecMid` declares a `GND` port. The property it buys: `mid_GND` can never
silently appear because someone assumed ground was ambient. A supply rail that should be
shared and is not becomes a construction error rather than a subtle simulation result.

`include` throws when `portMap` omits a declared port, names an undeclared one, or would
collide with an existing id.

### 4.2 Validation at construction

`done()` throws on duplicate ids, pin names outside the kind's vocabulary (§3.4), unbound
ports, and violations of §4.3.

### 4.3 What "floating" means, precisely

A pin having a net name does not make it connected. The invariant:

> Every net must contain **either at least two component pins, or at least one component
> pin and one declared external port.**

So `R1.a -> FOO` with nothing else on `FOO` is a construction error, while a connector
pin alone on a net that is also a declared port is valid.

Pins intentionally unconnected are declared as such (`nc`), which exempts them and
documents the intent. An undeclared single-pin net is never assumed to be deliberate.

## 5. Simulation

`lib/sim/` already provides `toSpiceNetlist`, `runAcSweep` over `eecircuit-engine`,
floating-branch pruning, and comparison helpers.

### 5.1 Emitter support for active devices

Op-amps emit one subcircuit invocation per unit; BJTs and diodes emit device lines plus
`.model` references. Positional argument order comes from the kind's mapping (§3.4), not
from author order, so a mis-ordered pin map cannot silently produce a different circuit.

### 5.2 A model library with provenance

`lib/sim/models/` holds SPICE text in three categories, kept distinct because their trust
and licensing differ:

- **Standard discretes** (2N3904, 1N4148) — short `.model` lines stored as data.
- **Vendor subcircuits** (TL072) — vendor `.subckt` text, vendored as files, each
  recording origin and terms.
- **Behavioural models** — written here, with the derivation documented.

An unknown `spiceModel` name throws rather than substituting anything.

### 5.3 The vactrol, and what is deliberately excluded

A vactrol is two coupled devices: an LED, and an LDR whose resistance depends on the
LED's current. The LED is an ordinary diode. The LDR becomes a behavioural resistor
following the transfer curve stated in the compressor spec (dark resistance ≥ 1 MΩ;
R_LDR ≤ 10.2 kΩ at full drive).

**Excluded from the first version: the LDR's time lag.** Real vactrol release is dominated
by the photocell's slow recovery. The compressor spec characterises the detector
capacitor's discharge but not the cell's own lag. Modelling it badly would be worse than
omitting it, because it would yield release figures that look authoritative and are not.
Recorded as a known gap; release-time assertions stay out of scope until the cell is
characterised.

### 5.4 What behavioural tests assert

```ts
const ac = await acSweep(net, { in: "IN", out: "OUT", from: "20Hz", to: "20kHz" })
expectGainAt(ac, "1kHz", { db: 0, tol: 0.5 })

const op = await operatingPoint(net, { supplies: { V9: "9V" } })
expectNodeVoltage(op, "VBIAS", { volts: 4.5, tol: 0.1 })
```

Targets are transcribed from the circuit's design spec. Stored response curves are **not**
part of this design; see §2 principle 4.

### 5.5 Structural and behavioural acceptance are separate gates

| Gate | Asserts | Required to migrate? |
|---|---|---|
| **Structural** | expected components, values, and topology | **yes, always** |
| **Behavioural** | gain, corner frequency, bias voltage, insertion loss | only where the spec states targets |

**A circuit with no defensible behavioural target is still fully migrated and structurally
verified.** Simulation is not a precondition for canonicalisation.

Where a circuit's spec does state targets, they are transcribed. Where it does not, the
missing targets are recorded as a gap. **Writing targets by measuring the current
implementation is forbidden** (§2 principle 4) — a target is a claim about intent, and one
harvested from behaviour constrains nothing.

Only the optical compressor currently has a spec in target-stating form. Whether each
Pultec section does is unverified, and each migration confirms it before relying on it.

## 6. KiCad sync

### 6.1 Artefacts

| File | Owner | Contents |
|---|---|---|
| `circuits/<name>.ts` | code | the `Network` |
| `kicad/<name>/<name>.kicad_sch` | human | the drawing |
| `kicad/<name>/.sync-base.json` | tool | last agreed netlist, identity pairings, designators |

The baseline makes "I changed this" distinguishable from "you changed this". Two
independently editable sides without a common ancestor can only guess; with one, this is
an ordinary three-way merge.

### 6.2 Net identity is membership, matched by overlap

Net *names* cannot serve as identity across the seam: KiCad derives names from labels and
generates the rest, so a rename on each side is indistinguishable from a rewire.

**A net's reconciliation identity is the set of `(component id, unit, pin)` triples on
it.** Its name is metadata.

Exact set equality will not do, however: adding one component to a net changes its
membership, and exact matching would report every rewire as a net deleted plus a net
created — destroying the continuity the rule exists to provide. So:

- Each candidate net is matched against baseline nets by **maximal membership overlap**.
- A match is accepted when one baseline net is the unique best overlap **and** shares more
  than half of that baseline net's members.
- A tie, or a best overlap at or below half, is a **conflict**: reported, not guessed.

A name change with unchanged membership is therefore not a connectivity change at all,
and a rename on both sides is a metadata conflict rather than a structural one.

### 6.3 What syncs

Netlist facts only: components, values, part identity, and which pins sit on which nets.

Placement, wire geometry, sheet organisation, annotation and title blocks are the human's
exclusively (§2 principle 5).

### 6.4 Code → KiCad

| Change | Action | Why |
|---|---|---|
| New component | insert symbol units in a marked unplaced area | additive; disturbs no existing geometry |
| Value / part change | edit symbol property in place | touches one property |
| Connectivity change | attach a net label to the affected pin | see below |
| **Deletion** | **report as obsolete; do not remove** | see below |

**Connectivity changes use net labels, not wires.** A wire is drawn geometry and nothing
can redraw a human's layout safely. A net label is electrically correct, idiomatic KiCad,
requires no routing, and is conspicuous — it reads as machine-added and awaiting tidy-up.
This is the inverse of the tscircuit behaviour that motivated this design: a label here is
a visible, chosen fallback, not a silent one disguising a failure.

**Deletion does not remove symbols automatically.** Adding an unplaced symbol disturbs
nothing; removing one embedded in a hand-drawn network changes wire endpoints and
connectivity semantics in a drawing the tool does not own. That is qualitatively
different, and principle 5 decides it. Obsolete symbols are reported. Removal is available
only under an explicit destructive mode the human invokes deliberately.

### 6.5 Machine-added labels have no synchronisation identity

A label added by the tool is a mechanism for making a requested connectivity change
electrically true — nothing more. The baseline **must not** record it or expect it to
persist.

Once the KiCad netlist reflects the requested connectivity, the label may be moved,
renamed, or replaced by drawn wire geometry with no drift reported. Reconciliation compares
**electrical topology**, never the graphical mechanism KiCad uses to express it.

Without this rule, tidying up a machine-added label would read as a connectivity change
and the tool would fight the human for the drawing.

### 6.6 KiCad → code

The tool emits a precise change list. It does **not** rewrite TypeScript: auto-editing
circuit definitions is fragile and a wrong edit is expensive. Drift cannot persist
silently because a test fails while code and schematic disagree, so the report is always
acted on.

### 6.7 Conflicts

Reported and skipped individually; all non-conflicting changes still merge. The classes:

- the same value changed differently on both sides
- a component deleted on one side and edited on the other
- the same pin rewired differently
- a net whose membership match is tied or below threshold (§6.2)
- a net renamed on both sides (metadata conflict)
- a `Component.id` changed in code (§3.3) — indistinguishable from delete plus add

## 7. Repository structure

```
circuits/            circuit definitions (functions returning Network)
lib/model/           Network, Component, Unit, kinds, pin schemas, validation, builder
lib/sim/             SPICE emission, simulation, assertions
lib/sim/models/      device models, with provenance
lib/kicad/           netlist extraction, symbol editing, three-way merge
kicad/<name>/        hand-drawn schematics and their sync baselines
docs/superpowers/specs/   design specs, including per-circuit targets
```

`lib/passives/` is renamed `lib/model/`. The name described the Pultec's passive EQ
section, not an architectural boundary, and keeping it would imply a distinction this
design does not make.

## 8. Testing strategy

| Layer | Asserts | Cost |
|---|---|---|
| Model | validation rejects malformed networks; `include` prefixing, port binding, global-net invariant | ms |
| Circuit | parts, values and connectivity match the design spec | ms |
| Simulation | behaviour meets spec-stated targets, where they exist | seconds |
| Sync | three-way merge cases, including every conflict class in §6.7 | ms |
| KiCad fidelity | §8.1 | ms |

### 8.1 Round-trip is necessary but not sufficient

Byte-identical parse-then-serialise proves only that parsing is lossless. It says nothing
about whether a *targeted edit* preserves everything unrelated to it — which is the entire
safety case for §6.

The gate is therefore two-part:

1. **Round-trip:** a `.kicad_sch` parsed and re-emitted is byte-identical.
2. **Mutation preservation:** for each supported edit — change a value, change a
   footprint, add a net label, add a symbol, and (destructive mode only) delete a
   symbol — the structural diff of the result contains **only** the intended mutation.

Fixtures use real hand-drawn schematics, not generated ones. A failure here kills the
sync design before effort is sunk into it, which is the point of running it first.

Existing practice worth keeping: `lib/passives/mutable.ts` exists so tests can corrupt a
network deliberately and prove validation catches it. That pattern extends to the new
validation.

## 9. Migration and removal

### 9.1 Preserved first

`docs/superpowers/specs/2026-09-21-optical-compressor-design.md` exists **only** on
`feature/opto-compressor`, along with 46 unmerged commits. It is the actual engineering —
topology, thresholds, vactrol selection, release model — and is tool-independent.
Cherry-picking it to `main` is step zero, before anything else.

A short decision record carrying §1.2's findings is written alongside it, so the tscircuit
question is not re-opened and no apparatus is left behind to explain it.

### 9.2 Order — a capability ladder

**Each individual circuit migration deletes its superseded representation in the same
commit.** A plan is a sequence of such atomic migrations, not one enormous replacement.

1. Authoring layer, kinds, pin schemas, validation. No circuits yet.
2. **Five Pultec sections.** Passive only — every part already supported, so this proves
   the path end to end with zero new device work.
3. **`pultec-passive-eq`.** Proves `include` and the global-net invariant.
4. **Op-amp support, units, vendor subcircuits**, then `opamp-buffer`.
5. **BJT, diode, photoresistor, vactrol behavioural model**, then the optical compressor.
6. **KiCad sync.** May begin once step 2 lands; needs only a netlist.
7. Final sweep: dependency removal, `CLAUDE.md` rewrite.

### 9.3 Three plans

| Plan | Rungs | Delivers |
|---|---|---|
| A — model and authoring | 0-3 | `Network`, `Unit`, pin schemas, builder, `include`, validation; six passive circuits ported, their TSX deleted |
| B — active devices and simulation | 4-5 | op-amp/BJT/diode/photoresistor, multi-unit KiCad mapping, model library, vactrol model; `opamp-buffer` and the compressor ported, their TSX deleted |
| C — KiCad sync | 6-7 | fidelity gate (§8.1) **first**, netlist extraction, three-way merge, dependency removal, `CLAUDE.md` rewrite |

A precedes B. C may begin after A, and is independently killable: if §8.1 fails, C is
abandoned without invalidating A or B.

### 9.4 Deleted

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

`feature/opto-compressor` is abandoned apart from the cherry-pick.

## 10. Risks

| Risk | Handling |
|---|---|
| `kicadts` cannot support safe surgical edits | §8.1's two-part gate runs first in Plan C. Failure kills C only. |
| Vendor SPICE models unavailable or unlicensed | Provenance recorded per model (§5.2). Where a model cannot be vendored, assertions scope to what can be modelled and the gap is recorded, never approximated. |
| Op-amp subcircuits converge poorly | Step 4 is a gate: if `opamp-buffer` cannot be simulated reliably, behavioural scope for active circuits is reconsidered before step 5. Structural migration proceeds regardless (§5.5). |
| Multi-unit mapping proves harder than modelled | The model carries units from Plan A; only the KiCad mapping is deferred to B, so a harder-than-expected mapping does not invalidate authored circuits. |
| KiCad symbol library ids drift between versions | `PartSpec.symbol` is data; a missing symbol throws at sync time with the id named. |
| The compressor port is larger than estimated | It is last; every earlier rung delivers independently. |

## 11. Open questions for the maintainer

1. **Multi-sheet schematics.** Assumed one sheet per circuit. KiCad hierarchical sheets
   would interact with `include` — plausibly they should correspond, but that is not
   designed here.
2. **Designator allocation before a schematic exists.** §3.3 puts designators in the
   baseline, owned by KiCad. A circuit that has been authored but never drawn therefore
   has no designators, so a BOM produced from code alone would be unannotated. Acceptable,
   or should the tool allocate provisional designators?
3. **Where `ControlState` fits.** `resolveNetwork` resolves pot and switch positions into
   a concrete network for simulation. Whether a KiCad schematic corresponds to the
   unresolved network (a pot as one symbol) or a resolved one is not specified; the former
   is assumed.
