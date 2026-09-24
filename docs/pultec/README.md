# Pultec passive EQ modularization

> ## PARTLY SUPERSEDED — READ THIS FIRST.
>
> The ELECTRICAL content of this directory is still the record of why the Pultec
> reference is transcribed the way it is: the governing single-reference-network
> requirement below, the source links, the component values and the reference
> transcription checklist all still hold, and `reference/pultec/` implements them.
>
> The SOFTWARE content does not. Every reference here to `lib/passives/`,
> `lib/export/`, tscircuit or a `"types": ["tscircuit"]` tsconfig entry describes a
> repository that no longer exists — `lib/passives/` became `lib/model/` in Plan A,
> `lib/export/` was deleted, and tscircuit was removed by `feature/active-devices`.
> Nothing in this directory may be treated as an instruction to create a file or a
> dependency. Canon for that is
> `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` and `CLAUDE.md`.

See the [implementation plan and change inventory](implementation-plan.md) for
implemented groundwork, proposed files, sequencing, and completion criteria.

## Governing requirement

LF + HF + wiring must reproduce a single reviewed EQP-1A passive reference
network, component-for-component and node-for-node, under identical source and
load conditions. Physical modularity must preserve the interacting branches.
Do not implement LF boost, LF attenuation, HF boost, or HF attenuation as
independent cascaded filters. Makeup amplification stays outside this network.

## Current status

The Pultec reference and its physical split now exist. `reference/pultec/`
holds the transcribed single reference network; `circuits/pultec/` holds the
five physicalized board circuits (`low-cut.ts`, `low-boost.ts`, `hi-cut.ts`,
`hi-boost.ts`, `mid.ts`); `boards/pultec-low-cut/`, `boards/pultec-low-boost/`,
`boards/pultec-hi-cut/`, `boards/pultec-hi-boost/` and `boards/pultec-mid/`
hold the five declared stripboard layouts built from them. Capacitor footprint
selection for those boards is recorded in
[`capacitor-selection.md`](capacitor-selection.md). The topology utility in
`lib/model/topology.ts` is what `assertSameTopology` in the tests above is
built from.

## Reference evidence and unresolved authority

Inspected 2026-09-19:

- [Gyraf source index](https://gyraf.dk/gy_pd/pultec/pultec.htm).
  Separates the reverse-engineered original-style circuit from the modified
  G-Pultec and notes corrections to potentiometer values. Transformer figures
  in the reverse engineering are not reliable impedance specifications.
- [Original-style drawing, November 2001](https://gyraf.dk/gy_pd/pultec/pultech.gif).
  Visually inspected. It includes the passive network, transformers, amplifier,
  and supply. This is a candidate transcription source, **not yet an approved
  factory EQP-1A reference**. Retain the complete drawing's provenance.
- [Modified G-Pultec drawing](https://gyraf.dk/gy_pd/pultec/gy_pd_sch.gif).
  Secondary comparison only. Do not silently mix its component values, switch
  positions, loading, or amplifier interface with the original-style drawing.
- [Original manual link via Purple Audio](https://purpleaudio.com/pdflib/PultecEQP.pdf).
  Retrieval failed during this initial pass. Its contents have not been checked;
  do not assume it documents the encapsulated passive filter.

The Gyraf PCB split is evidence of a physical assembly technique, not proof of
an LF/HF electrical boundary or a suitable connector pin count for this project.
Before declaring an authoritative reference, reconcile the candidate against
original filter documentation or another independently documented tracing.
Record unresolved junctions, tap connections, and pot conventions explicitly.

## Transcription checklist

1. Name each net on the unsplit filter drawing. Record every resistor, capacitor,
   pot terminal, switch pole/contact, inductor tap, and junction. Distinguish
   crossings from connected wires. Give unlabelled parts stable local reference
   IDs and document their location in the source drawing.
2. Separate input/output boundary conditions from filter elements. Determine the
   impedance looking toward each transformer/amplifier; a winding's DC resistance
   is not its audio impedance. Keep source and load assumptions in the test fixture.
3. Keep all three pot terminals, direction, resistance, and taper. Preserve ganged
   switch states and winding/tap relationships; do not replace a tapped winding
   with independent inductors without a separately justified model.
4. Review the unsplit netlist against the source before deriving modules. Store
   the reviewed reference independently of the module implementation so errors in
   the latter cannot rewrite the expected result.
5. Assign components to LF, HF, or explicitly justified shared ownership. A
   component belongs to exactly one physical module. Derive the connector nets
   from this assignment; choose physical pins only after electrical review.

## Organization, as built

| Module | `circuits/pultec/` | `boards/` | Responsibility |
| --- | --- | --- | --- |
| Low cut | `low-cut.ts` | `pultec-low-cut/` | Low frequency selection and cut network |
| Low boost | `low-boost.ts` | `pultec-low-boost/` | Low frequency boost network |
| Hi cut | `hi-cut.ts` | `pultec-hi-cut/` | High frequency selection and cut network |
| Hi boost | `hi-boost.ts` | `pultec-hi-boost/` | High frequency boost, bandwidth (Q) and resonant inductor network |
| Mid | `mid.ts` | `pultec-mid/` | Mid selection network, from Thompson-Bell's documentation |

Five physical boards, one per module above, rather than the two-module LF/HF
split this document originally proposed - `reference/pultec/partition.ts`
assigns every reference component to exactly one of the five, following the
built hardware's own section boundaries. The interconnect between boards adds
only conductors and terminal blocks (`circuits/pultec/parts.ts`); a net
crossing a board boundary is a declared port, never implicit. External
signal/return ports need routing even where a board's own topology does not
put them on its critical path - see the per-board module docblocks and
`reference/pultec/unresolved.md` for the low/high frequency selectors' shared
physical switch, which crosses board boundaries the same way.

## Validation gates

- **Topology:** `assertSameTopology` compares labelled components, terminal nets,
  parameters, and external ports. `partitionTopology` preserves those identities
  while deriving cross-module nets. It rejects missing/unknown ownership. These
  helpers do not parse schematics or prove a source transcription correct.
- **Circuit export:** ~~once tscircuit modules exist, flatten their actual emitted
  connectivity~~ (**stale** — tscircuit was removed; the emitted representation is
  now a SPICE deck from `lib/sim/`), resolve connector wiring to canonical reference
  nets, and compare it against the independent reference fixture. Comparing an
  unchanged partition alone does not test the eventual PCB implementation.
- **Behavior:** compare unsplit and composed AC responses (magnitude and phase)
  with identical source/load models. Sweep all frequency selections, boost/cut
  extremes and intermediate settings, bandwidth extremes, simultaneous LF boost
  and cut, and combined LF/HF operation. Record tolerances before accepting results.
- **Standalone:** first compare against the full network with the omitted section
  at a precisely defined neutral setting. Establish whether the substitute must
  change with frequency selection. Do not assume a wire, open circuit, or single
  resistor is adequate. Keep approximations outside the combined reference path.
- **Hardware:** connector parasitics and real inductor impedance/losses require
  subsequent measurement; labelled graph equality alone cannot validate them.

Next deliverable: a reviewed unsplit reference netlist with a source-to-component
inventory and explicit loading assumptions, followed by the physical LF/HF cut.
