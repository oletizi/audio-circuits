---
title: Transistor preamp lab board - model, KiCad schematic stub, stripboard
date: 2026-09-23
status: Implemented (revision 3)
brief: docs/transistor-preamp/microphone-preamp-feedback-lab.md
---

> **Revision 2**, after third-party review. Accepted: explicit rheostat
> wiring and its failure mode (§3.2), which corrects revision 1's claim that a
> failed wiper opens a leg; numeric sanity bounds (§5); test points (§3.2);
> a settings table on the stub (§4.3); an explicit ownership boundary (§4.4);
> "about 1.5M" wording; and a Build 2A setting. Declined, with reasons in
> §3.3: a 100 Ω floor in the emitter bypass branch.

> **Revision 3**, after the final whole-branch review of the implementation.
> Corrections to bring this spec in line with what was built, not new design
> decisions: the settings helper is named `legPosition`, not `legSetting`,
> and has no inverse (§3.4, §5 item 3); the jumper-removed sentinel is named
> `REMOVED`, not `OUT` (§3.2, §3.4); the footprint family match is the exact
> name `TO-92_Inline`, not a wildcard (§4.1); the schematic writer reads each
> part's `part.symbol` rather than a separate symbol table, and places
> symbols in the circuit's declaration order rather than `DESIGNATORS` order,
> which keeps each leg's parts together (§4.3); `resolveNetwork`'s single-pin
> exemption for electrically inert connectors is recorded (§3.2); and §6
> step 5 states what `make check` reports before the board is placed.

# Transistor preamp lab board

## 1. Purpose

The creative brief (`docs/transistor-preamp/microphone-preamp-feedback-lab.md`)
describes a sequence of breadboard builds, from one common-emitter 2N3904 stage
towards a multi-transistor feedback amplifier. This spec covers the first
milestone of that sequence and one change of medium: **moving from breadboard to
stripboard**.

The deliverable is one stripboard, the *lab board*. It covers the brief's
divider-biased stage (Build 0), the split-emitter experiments (Build 1),
collector feedback added to the divider (Build 2A, DC-coupled only) and
collector-feedback bias (Build 2B), all selected by jumpers and trim-pots. It
arrives as:

1. a circuit function in the canonical model, with SPICE checks;
2. a generated KiCad schematic **stub**, with every part, symbol, footprint and
   connection present but not arranged, which the operator then lays out by hand
   in KiCad;
3. a board directory that the existing `perfboard` tooling drives, so the
   stripboard layout is made in VeroRoute and checked against the circuit.

Arranging the schematic drawing and placing the stripboard layout are the
operator's work. This spec takes both only as far as the hand-off.

## 2. Non-goals

- The brief's AC-coupled feedback variant of Build 2A (the series capacitor), the
  Build 3 emitter follower and the Build 4 global-feedback block. They are later
  milestones, and the board is not laid out to accept them.
- Reconciling the brief's reported bench readings. The brief records that they
  are mutually inconsistent (§ "Accuracy check"). This model is the **nominal**
  circuit as the brief states it, and serves as a prediction to hold bench
  readings against. It is not a transcription of the as-built breadboard.
- Any automatic schematic arrangement or stripboard placement.
- Transistor β sweeps in simulation. The registered 2N3904 model has one
  parameter set. Swapping devices is a bench experiment.

## 3. The circuit

### 3.1 One board, one circuit, named settings

The operator asked for two circuits: the nominal divider-biased stage, and the
same stage with the +9 V-to-base resistor exchanged for a collector-to-base
resistor. They are built as **one board**, so the model has **one** circuit
function, `transistorPreampLab()` in
`circuits/transistor-preamp/lab-board.ts`, and the two circuits are two **named
settings** of it (§3.4). A named setting is a `ControlState`: jumper positions
plus trim-pot positions. One netlist then serves the schematic, the layout and
every simulation.

### 3.2 Topology

Nets: `VCC` (+9 V), `GND`, `IN_EXT` (input header, before the coupling cap),
`BASE`, `COLLECTOR`, `EMITTER`, `OUT` (output header, after the coupling cap),
plus the internal nets each leg needs between its jumper, fixed resistor and
trim-pot.

**The values below are starting points for bench experiments, not design
targets.** They are chosen so that each leg's range covers the brief's
suggestions with room to explore either side. Where a range proves wrong on the
bench, the operator swaps the fixed resistor or the trim-pot.

Every adjustable resistance is a **trim-pot wired as a rheostat, in series with
a fixed resistor that sets its minimum**. At the rheostat's lowest setting a
bias leg is never 0 Ω, so no setting drives the base directly from a rail. Each
bias leg also has a 2-pin jumper that removes it entirely, because a pot cannot
reach "disconnected".

**Rheostat wiring is fixed and explicit.** In every trim-pot, the wiper is
strapped to the `cw` end. `ccw` goes to one node of the leg, and `wiper` and
`cw` together go to the other. The leg resistance is then `position × R_trim`,
which rises clockwise. The strap sets the failure mode: an open or
intermittent wiper leaves the full element between `ccw` and `cw`, so the leg
fails to its **maximum** resistance, never to open and never to zero. For a bias
leg that means less base drive. For the emitter bypass branch it means the
stage is mostly unbypassed. Both are safe. The circuit declares this wiring at
pin level, so the generated schematic and netlist carry it. The simulation does
not model a wiper failure. The reasoning is recorded, not tested.

| Position | Parts (in series) | Adjustable range | Brief values it reaches |
|---|---|---|---|
| Upper bias leg, `VCC`→`BASE` | jumper, 47k fixed, 50k trim | 47k–97k | 80k (Build 0) |
| Feedback leg, `COLLECTOR`→`BASE` | jumper, 470k fixed, 1M trim | 470k to about 1.5M | 470k, 680k, 1M, 1.3M, about 1.5M (2A, 2B) |
| Lower bias leg A, `BASE`→`GND` | jumper, 4.7k fixed, 10k trim | 4.7k–14.7k | 10k (Build 0) |
| Lower bias leg B, `BASE`→`GND` | jumper, 47k fixed, 200k trim | 47k–247k | 150k (2B) |
| Collector resistor, `VCC`→`COLLECTOR` | 1k fixed, 2k trim | 1k–3k | 1.8k |
| Emitter DC path, `EMITTER`→`GND` | **1.5k fixed only** | — | 1.5k |
| Emitter bypass branch, `EMITTER`→`GND` | jumper, 220µF, 1k trim | 0 Ω–1k | see §3.3 |

Why the bias legs are split in two: the divider's 80k/10k and the feedback
configurations' 470k–1.5M/150k are 15–20× apart. One trim-pot spanning both
would put one end of the range in the first few percent of its travel.

Fitting the upper leg and the feedback leg together is the brief's Build 2A
(collector feedback added to the divider), DC-coupled.

Other parts:

- **Transistor:** 2N3904, `Transistor_BJT:2N3904` symbol (E-B-C pin order),
  `Package_TO_SOT_THT:TO-92_Inline` footprint, fitted in a socket so devices can
  be swapped without adjusting anything, which is the brief's central experiment.
  SPICE model `2N3904` (already registered).
- **Input coupling cap** `IN_EXT`→`BASE`: 10µF electrolytic.
- **Output coupling cap** `COLLECTOR`→`OUT`: 10µF electrolytic.
- **Supply decoupling** `VCC`→`GND`: 100µF electrolytic. The brief does not
  call for this. It is a design choice, and the module comment says so.
- **Headers:** input (`IN_EXT`, `GND`), output (`OUT`, `GND`) and power
  (`VCC`, `GND`), each a 2-pin 2.54 mm header, `electricallyInert`.
- **Test points:** single-pin headers on `VCC`, `BASE`, `EMITTER`,
  `COLLECTOR`, `GND`, `IN_EXT` and `OUT`, `electricallyInert`, with the
  `Connector:TestPoint` symbol and a `PinHeader_1x01` footprint (`SIP1`). The
  brief asks for `VB`, `VE` and `VC` against one ground after every change, and
  these give each of those a probe or clip point. `resolveNetwork`'s own
  input contract otherwise requires at least two pins per component; a single
  pin is exempted, but only for an `electricallyInert` connector, which is
  what every test point here is.

**Capacitor values are placeholders.** The brief gives no coupling or bypass
values. The values above are sized so that each corner sits well below 100 Hz
at the smallest resistance it sees across the trim ranges. The module comment
must label them as placeholders until the bench confirms them. (The input
cap's corner moves with the bias network's input impedance, which changes a
lot between settings. Shrinking that cap on the bench to make the change
audible is a good exercise, and it needs no change to the board.) An electrolytic
follows the existing two-terminal rule: pin `a` is pin 1, which is `+` on
`Device:C_Polarized`. The comment states which node each `+` faces, from the
nominal DC voltages: `BASE` for the input cap, `COLLECTOR` for the output cap,
`EMITTER` for the bypass cap, and `VCC` for the decoupling cap.

### 3.3 The emitter arrangement: a deliberate departure from the brief

The brief's Build 1 splits the emitter resistor in series (100 Ω + 1.4 kΩ) and
bypasses the lower part. This board does something else. It keeps **one fixed
1.5k DC path** and adds a **parallel AC branch** (bypass cap in series with a
trim), which a jumper can remove.

- The DC operating point never depends on a pot, which meets the brief's rule
  that no pot sits in the emitter-to-ground DC path.
- A failed wiper sends the branch to its maximum (§3.2), which leaves the
  stage mostly unbypassed. That is a safe failure.
- At audio frequencies the unbypassed emitter resistance is roughly
  `1.5k ∥ R_trim`. Trim at zero is fully bypassed, jumper removed is fully
  unbypassed, and everything in between is available to dial in on the bench.

**Why there is no fixed floor in the bypass branch.** A review proposed a
100 Ω fixed resistor in series with the trim, to reproduce the brief's 100 Ω
residual degeneration as the endpoint. That is declined. The brief's Build 1
comparison names **0 Ω (fully bypassed)**, 100 Ω, 220 Ω and 1.5 kΩ, and Build 0
is the fully bypassed stage, so zero is one of the points the experiment
needs. A 100 Ω floor would remove it, while 100 Ω without the floor is one trim
setting away.

### 3.4 Named settings

Trim-pot settings are written in **ohms of total leg resistance** and converted
to wiper positions by a helper (`legPosition`). The helper **throws** when the
requested ohms fall outside the leg's range. It never clamps. There is no
inverse function; nothing in this design needs to go from a wiper position
back to ohms.

| Setting | Jumpers fitted | Leg values |
|---|---|---|
| `nominal` | upper, lower A, bypass | upper 80k, lower A 10k, collector 1.8k, bypass trim 0 Ω |
| `dividerWithFeedback` | upper, feedback, lower A, bypass | as `nominal`, plus feedback 1M (Build 2A) |
| `collectorFeedback` | feedback, lower B, bypass | feedback 470k, lower B 150k, collector 1.8k, bypass trim 0 Ω |
| `collectorFeedbackOnly` | feedback, bypass | feedback 1.3M, collector 1.8k, bypass trim 0 Ω |

Every trim-pot must have a position in every setting, because `resolveNetwork`
requires one. A trim-pot on a leg whose jumper is removed gets its mid position,
and a comment says that value is irrelevant.

### 3.5 Designators

Semantic ids appear in the circuit source. Designators appear only in the
exported `DESIGNATORS` map:

| Id | Designator | Value / part |
|---|---|---|
| `upper_bias_jumper` / `upper_bias_floor` / `upper_bias_trim` | JP1 / R1 / RV1 | — / 47k / 50k |
| `feedback_bias_jumper` / `feedback_bias_floor` / `feedback_bias_trim` | JP2 / R2 / RV2 | — / 470k / 1M |
| `lower_bias_a_jumper` / `lower_bias_a_floor` / `lower_bias_a_trim` | JP3 / R3 / RV3 | — / 4.7k / 10k |
| `lower_bias_b_jumper` / `lower_bias_b_floor` / `lower_bias_b_trim` | JP4 / R4 / RV4 | — / 47k / 200k |
| `collector_floor` / `collector_trim` | R5 / RV5 | 1k / 2k |
| `emitter_dc_resistor` | R6 | 1.5k |
| `emitter_bypass_jumper` / `emitter_bypass_cap` / `emitter_bypass_trim` | JP5 / C1 / RV6 | — / 220µF / 1k |
| `input_coupling_cap` / `output_coupling_cap` / `supply_decoupling_cap` | C2 / C3 / C4 | 10µF / 10µF / 100µF |
| `gain_transistor` | Q1 | 2N3904 |
| `input_header` / `output_header` / `power_header` | J1 / J2 / J3 | — |
| `vcc_test_point` / `base_test_point` / `emitter_test_point` / `collector_test_point` / `ground_test_point` / `input_test_point` / `output_test_point` | TP1–TP7 | — |

### 3.6 Parts and footprints

| Kind | Footprint | VeroRoute type |
|---|---|---|
| Fixed resistor | `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` | `RESISTOR4` (existing) |
| Trim-pot (Bourns 3006P, 15-turn) | `Potentiometer_THT:Potentiometer_Bourns_3006P_Horizontal` | `TRIM_3006P` (**new**) |
| Transistor | `Package_TO_SOT_THT:TO-92_Inline` | `TO92` (**new**) |
| 10µF electrolytic | `Capacitor_THT:CP_Radial_D5.0mm_P2.00mm` | `CAP_ELECTRO_200` (existing) |
| 100µF electrolytic | `Capacitor_THT:CP_Radial_D6.3mm_P2.50mm` | existing electrolytic family |
| 220µF electrolytic | `Capacitor_THT:CP_Radial_D8.0mm_P3.50mm` | existing electrolytic family |
| Jumper, header | `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` | `SIP2` (existing) |
| Test point | `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical` | `SIP1` (existing) |

Electrolytic can sizes are typical, not measured. Once the operator has the
physical parts, any disagreement surfaces as a reconciliation delta in
`perfboard check`, and it is resolved against the part, never by editing the
circuit to silence it.

A jumper is `kind: "switch"` with positions `fitted` and `removed`: fitted
shorts pins `1`–`2`, removed shorts nothing. Its value comes from its part
name, in the same way as connectors.

## 4. Tooling changes

### 4.1 Footprint families (`lib/kicad/import-string.ts`)

- `TO-92_Inline` (exactly) → `TO92`, a 3-pin consistency check.
- `Potentiometer_Bourns_3006P_Horizontal` (exactly) → `TRIM_3006P`, a 3-pin
  consistency check.

Each name is matched EXACTLY, not as a prefix: a neighbouring variant (a
wide-pitch TO-92, a vertical trimmer) has different geometry, and mapping it
onto the same fixed shape would place the part on the wrong holes. Both type
names are taken from the pinned fork's `Src/CompTypes.h`, and a code comment
cites that file as the evidence. Every other TO-92 and potentiometer variant
keeps refusing, with the existing teaching message extended to list the two
new shapes.

### 4.2 Value notation (`lib/kicad/value-notation.ts`)

- `potentiometer` leaves `UNFORMATTED_ELECTRICAL_KINDS` and is formatted from
  `ohms` with the resistor formatter, so a 1M trim is `1M`.
- `switch` leaves the refused set only for a part that declares an `mpn` or a
  symbol, whose value is then that name, as for connectors. A switch with
  neither keeps refusing.

### 4.3 Schematic stub writer (`lib/kicad/schematic.ts`, new)

Input: the `Network`, `DESIGNATORS`, and a pin-number table keyed by kind (the
`PIN_NUMBERS` convention from `circuits/pt2399-core.ts`, extended with
`bjt`, `potentiometer` and `switch`). There is no separate symbol table: the
writer reads each part's own `part.symbol`, the same field every other
consumer of a `Component` already uses. Output: KiCad 10 `.kicad_sch` text.

- **Vendored symbols.** The definitions for `Device:R`, `Device:C_Polarized`,
  `Device:R_Potentiometer_Trim`, `Transistor_BJT:2N3904`,
  `Connector_Generic:Conn_01x02`, `Connector:TestPoint` and
  `Jumper:Jumper_2_Open` are copied into
  `lib/kicad/symbols/`. A provenance note records the KiCad 10.0.5 library they
  came from and the libraries' CC-BY-SA 4.0 licence with its design-use
  exception. `2N3904` is defined in the library as `(extends "Q_NPN_EBC")`,
  and a schematic's embedded `lib_symbols` must be self-contained, so the
  vendored copy is **flattened**, and the note records that. Generation never
  reads the installed KiCad.
- **Placement.** Symbols go on a plain grid, one cell per component, in the
  circuit's declaration order, which keeps each leg's parts together (a
  designator sort would instead group by part type - all resistors, then all
  trims - scattering a leg's jumper, floor and trim across the grid). Each
  symbol carries `Reference`, `Value` and `Footprint` properties. Each pin
  gets a short wire to a local net label named after its net. Connectivity is
  carried entirely by labels.
- **Settings table.** The stub carries a text block listing each named
  setting, which jumpers it fits and its starting trim values. The block is
  generated from the same `ControlState`s the simulations use, so the
  schematic is also the bench document. Like the rest of the stub, it is a
  snapshot and the operator owns it afterwards.
- **Refusals.** A component with no designator, no symbol, no footprint or an
  unmapped pin throws an error naming it. A pin present on the symbol but
  absent from the circuit throws too. A no-connect must be declared, never
  implied by an omission.

### 4.4 Stub generation verb (`tools/cli/schematic-stub.ts`, new)

`bun run schematic-stub <circuit-module> <export> <out.kicad_sch>` writes the
stub. It **refuses to overwrite** an existing file, because once written, the
schematic belongs to the operator. After that, the board's existing
`sch`/`netlist` pair and `netlist-sync` keep it in agreement with the circuit.

**Ownership boundary.** The stub's presentation is disposable. After
generation, only **electrical equivalence** to the canonical circuit is
enforced: designators, values, footprints and net membership, compared
through the exported netlist. Symbol positions, wires versus labels, label
names on nets that ports do not fix, text and graphical grouping all belong to
the operator. Nothing may compare them against the stub.

### 4.5 Board directory (`boards/transistor-preamp-lab/`)

- `perfboard.json` points at the schematic
  (`circuits/transistor-preamp/lab-board.kicad_sch`), the circuit module and
  its export, the netlist fixture (`tests/fixtures/transistor-preamp-lab.net`,
  produced by `netlist-sync`) and the `.vrt`.
- `Makefile` is the one-line include.
- The first `.vrt` comes from `perfboard update` with all parts unplaced. It is
  committed as the operator's starting point.

## 5. Verification

Tests are written first, following TDD.

1. **Footprint families.** Each new shape maps to its type, and neighbouring
   unsupported shapes still refuse.
2. **Value notation.** Trim values format like resistors. A jumper takes its
   part name, and a switch with neither an mpn nor a symbol refuses.
3. **Settings helper.** Converting ohms to a position gives the expected
   fraction at the ends and midpoint of a leg's range, and out-of-range ohms
   throw.
4. **Sanity simulation, per setting.** The board is a bench instrument, and
   exact numbers are the bench's job, so these checks confirm only that the
   circuit is wired so that each setting works. The bounds are deliberately
   generous: they exist to catch wiring and generation errors, not to predict
   the experiment. For every setting, `runOperatingPoint` must show
   `I_E` > 0.1 mA and `VCE` > 1 V, and `runAcSweep` at 1 kHz into a
   100 kΩ load must show a finite gain with `|Av|` > 1 and a phase within
   45° of 180°, which confirms inversion. (The brief's own numbers come from readings it calls
   inconsistent, so they would be the wrong reference anyway.)
5. **Schematic round trip.** The stub is written and read back through the
   s-expression parser, and every component, property and label is present.
6. **KiCad round trip.** `kicad-cli sch export netlist` on the generated stub,
   imported with `importNetlist`, gives the same designators, values,
   footprints and net memberships as the circuit. If `kicad-cli` cannot be
   found, the test **fails** with a message naming the binary and where it was
   looked for. It does not skip.

`bun test` and `bun run typecheck` pass before every commit.

## 6. Build order

Each step is committed and pushed when it is coherent.

1. Footprint families and value notation (§4.1, §4.2).
2. The circuit, its settings and its SPICE checks (§3).
3. The schematic stub writer and vendored symbols (§4.3).
4. The generation verb, the generated stub, and the board directory with its
   initial `.vrt` (§4.4, §4.5).
5. Hand-off: the operator arranges the schematic in KiCad and places the
   stripboard in VeroRoute. `make check` verifies both against the circuit.
   Until the operator has placed it, `make check` on this board reports
   incomplete nets and cuts against the unplaced starting layout from
   `perfboard import` (§4.5) - that is expected, not a failure - and it stays
   the gate from then on as the layout is placed and refined.
