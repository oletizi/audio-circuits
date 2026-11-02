---
title: Tascam 38 external electronics — interface analysis plan
date: 2026-10-12
status: Revised for motherboard-compatible card first
spec: ../specs/2026-10-12-tascam-38-external-electronics-design.md
---

# Milestone 1: transport/electronics interface analysis

## Objective

Establish the existing Tascam 38 amplifier-card electrical and mechanical interface so a pin-compatible replacement can be designed and tested using the **unmodified motherboard**. The MS-16 external-chassis architecture remains a later reference. This phase produces documentation, not replacement hardware or speculative connector pinouts.

## Sources located

- Tascam 38 complete schematics (12-page scan): https://peel.dk/Archive/Tascam/Tascam%2038%20Complete%20schematics%20%28High%20quality%20scan%29.pdf
- Alternate 38 schematics and searchable board inventory: https://manuals.plus/tascam/38-8-track-analog-tape-recorder-manual
- Tascam 38 service manual/calibration index: https://www.manualslib.com/products/Tascam-38-3978544.html
- Tascam MS-16 153-page operation/service manual listing: https://www.audioservicemanuals.com/t/tascam/tascam-ms/6435738-tascam-ms-16-operating-service-manual
- Additional MS-16 manual source (publisher requests links rather than reposting): https://www.analogrules.com/manuals/tascam1.html

These links establish document availability, **not** validation of any connector pin or electrical value. Record page/sheet identifiers only after direct inspection. The owner has chosen to commit the high-resolution amplifier and transport scans; see `docs/tascam-38/sources/README.md`.

## Initial 38 board inventory (source index, pinouts unverified)

| Assembly | Known role / investigation |
| --- | --- |
| HEAD PCB | Reproduce, record/sync and erase head terminations |
| MOTHER PCB | Retain unmodified for first working replacement card; document connector signals and dependencies |
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

## Task B — 38 amplifier-card pin-level interface matrix

Create `docs/tascam-38/interface-matrix.csv` with columns:

`assembly,connector,pin,signal_name,source,destination,signal_class,mode,nominal_voltage_or_level,source_impedance,shield_return,source_document,source_page,verification_status,notes`

Trace every existing amplifier-card edge contact, including head/audio, control, bias/erase, supply, meter and ground. Document connector geometry, pin numbering, keying, mating and mechanical clearance. Unknown fields stay blank; never infer pins from connector numbering alone.

**Acceptance:** Every amplifier-card edge contact is accounted for (including no-connects) and traced to the motherboard or explicitly marked unresolved. The motherboard remains unchanged.

## Task C — MS-16 architectural comparison

Document where its head preamps, oscillator, erase drivers, control decoding and power regulation live. Identify the electrical properties of the cable assembly rather than assuming the same harness will work on a 38.

**Acceptance:** A sourced transport-versus-chassis block comparison, plus a list of transferable practices and machine-specific constraints.

## Task D — pin-compatible card feasibility and safe validation

- Specify a pin-compatible replacement card using the original motherboard connector, with no transport or motherboard modifications.
- Document card-edge geometry, signal levels, power rails, grounding, head loading, switching and calibration requirements. Defer external cable feasibility until the card works.
- Specify bench tests and protection checks before plugging a prototype into the motherboard; include safe record switching and head protection.
- Document all original motherboard dependencies and preserve them in the first prototype.
- Define a non-destructive measurement procedure; do not inject DC into heads or connect record/erase drive to sensitive test inputs.

**Acceptance:** Written go/no-go for a pin-compatible single-channel reproduce card, with required bench tests and measurements before first insertion.

## Task E — review gate

A reviewer independently checks each source-backed claim, the completeness of interface coverage, and the separation of verified facts from hypotheses. Only then write a motherboard-compatible single-channel reproduce-card implementation plan with numerical acceptance thresholds derived from the service manual and a known-good machine.

## Deferred work

Motherboard replacement, card-edge bypass, external cabling and the full external electronics chassis are explicitly out of scope until a usable replacement amplifier card has been validated on the existing motherboard.

## Current blockers

- Full connector-level reading of both schematics is not yet complete.
- Actual cable construction and machine revision need physical verification.
- Head impedance and cable capacitance are not yet established.
