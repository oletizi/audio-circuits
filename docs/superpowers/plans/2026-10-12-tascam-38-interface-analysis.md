---
title: Tascam 38 external electronics — interface analysis plan
date: 2026-10-12
status: Draft for execution
spec: ../specs/2026-10-12-tascam-38-external-electronics-design.md
---

# Milestone 1: transport/electronics interface analysis

## Objective

Establish an evidence-backed electrical boundary for replacing the Tascam 38's record/reproduce electronics with an external chassis, using the Tascam MS-16 as a packaging and wiring reference. This phase produces documentation, **not** replacement hardware or speculative connector pinouts.

## Sources located

- Tascam 38 complete schematics (12-page scan): https://peel.dk/Archive/Tascam/Tascam%2038%20Complete%20schematics%20%28High%20quality%20scan%29.pdf
- Alternate 38 schematics and searchable board inventory: https://manuals.plus/tascam/38-8-track-analog-tape-recorder-manual
- Tascam 38 service manual/calibration index: https://www.manualslib.com/products/Tascam-38-3978544.html
- Tascam MS-16 153-page operation/service manual listing: https://www.audioservicemanuals.com/t/tascam/tascam-ms/6435738-tascam-ms-16-operating-service-manual
- Additional MS-16 manual source (publisher requests links rather than reposting): https://www.analogrules.com/manuals/tascam1.html

These links establish document availability, **not** validation of any connector pin or electrical value. Record page/sheet identifiers only after direct inspection. Do not commit third-party scans without redistribution rights.

## Initial 38 board inventory (source index, pinouts unverified)

| Assembly | Known role / investigation |
| --- | --- |
| HEAD PCB | Reproduce, record/sync and erase head terminations |
| MOTHER PCB | Channel-card and cross-board interconnects; candidate for bypass |
| REC/PLAY AMPL PCB | Channel reproduce, record, bias amplification and EQ |
| MASTER OSC PCB | Shared oscillator; determine erase/bias distribution |
| FUNCTION PCB and FUNCTION LED PCB | Arm and mode selection signals |
| OUT SELECT PCB | Output switching and monitor selection |
| IN/OUT PCB | Line input/output terminations |
| CONTROL PCB and PUNCH IN/OUT PCB | Transport/mode timing and switching |
| POWER SUPPLY PCB | Existing supply dependencies; keep transport supply separate initially |

## Task A — evidence inventory

- [ ] Obtain readable copies of both original schematics.
- [ ] Record document title, scan edition, page, drawing number and revision where available.
- [ ] Identify every relevant 38 board and its physical connector designation.
- [ ] Identify MS-16 transport-to-amplifier bundle connector(s), cable groups, shielding and grounding.
- [ ] Photograph the actual 38 and MS-16 wiring/connector assemblies and note any revisions differing from the drawings.

**Acceptance:** Every referenced schematic is retrievable and every claimed connector has a page/sheet source or is marked unknown.

## Task B — 38 pin-level interface matrix

Create `docs/tascam-38/interface-matrix.csv` with columns:

`assembly,connector,pin,signal_name,source,destination,signal_class,mode,nominal_voltage_or_level,source_impedance,shield_return,source_document,source_page,verification_status,notes`

Trace head and audio first, then control, bias/erase, supply, meter and ground. Unknown fields stay blank; never infer pins from connector numbering alone.

**Acceptance:** For each head winding and relevant operating mode, the signal path can be traced from physical head connector to channel card, with unresolved segments called out explicitly.

## Task C — MS-16 architectural comparison

Document where its head preamps, oscillator, erase drivers, control decoding and power regulation live. Identify the electrical properties of the cable assembly rather than assuming the same harness will work on a 38.

**Acceptance:** A sourced transport-versus-chassis block comparison, plus a list of transferable practices and machine-specific constraints.

## Task D — feasibility and reversible breakout

- Identify the smallest safe internal 38 adapter point that avoids the old amplifier card-edge connector.
- Evaluate whether an external unbuffered head cable is plausible given measured/documented inductance, impedance and capacitance.
- Specify grounding, connector segregation, strain relief, protection and fail-safe record switching.
- Document what the original motherboard still supplies to transport logic and what cannot be removed.
- Define a non-destructive measurement procedure; do not inject DC into heads or connect record/erase drive to sensitive test inputs.

**Acceptance:** Written go/no-go for single-channel reproduce prototype and a list of measurements required before selecting its first-stage circuit.

## Task E — review gate

A reviewer independently checks each source-backed claim, the completeness of interface coverage, and the separation of verified facts from hypotheses. Only then write a single-channel reproduce implementation plan with numerical acceptance thresholds derived from the service manual and a known-good machine.

## Current blockers

- Full connector-level reading of both schematics is not yet complete.
- Actual cable construction and machine revision need physical verification.
- Head impedance and cable capacitance are not yet established.
