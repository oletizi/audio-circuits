---
title: Tascam 38 electrical analysis execution plan
date: 2026-10-13
status: Ready for execution
spec: ../specs/2026-10-12-tascam-38-external-electronics-design.md
---

# Tascam 38 — electrical analysis execution plan

## Mission and scope

Produce an evidence-backed, connector-by-connector **electrical interface specification** and **functional circuit analysis** for the interchangeable Tascam 38 record/play amplifier card, **retaining the original motherboard**. Analyze existing circuits and interconnections only. Do not design, source, fabricate, or modify hardware.

Execute the work queue to its defined completion or to an explicitly evidenced blocker. **Intermediate commits, documents, and chat updates are checkpoints, not stopping conditions.** Do not ask for approval between tasks.

## Source manifest and precedence

The two drawings are committed in `docs/tascam-38/sources/`; its `README.md` records their identity (title block, resolution, SHA-256) and provenance.

1. **Primary:** `docs/tascam-38/sources/tascam-38-amplifier-schematic.pdf`, the high-resolution **amplifier** drawing (formerly referred to as `p2(1).pdf`, now rotated to landscape).
2. **Control cross-reference:** `docs/tascam-38/sources/tascam-38-transport-schematic.pdf`, the high-resolution **tape transport** drawing (formerly `p1(1).pdf`, now rotated to landscape).
3. **Independent hypothesis set:** owner's `Tascam 38.xlsx`, `Junctions` sheet. Not yet in the repository. This is prior analysis, **not authoritative proof**.
4. **Lower-resolution corroboration:** `Tascam 38 Complete schematics (High quality scan).pdf`, two sheets. Not in the repository.

Use **only these preserved sources** for the core trace. Do not repeatedly search the web for a document already available. Preserve source-specific claims; distinguish direct observation from inference and worksheet hypotheses. Never claim to have read a source that could not be accessed.

## Canonical deliverables

Maintain **two authoritative files**, not a new report for each contact:

- `docs/tascam-38/interface-matrix.csv` — exactly 50 rows, one per J101–J108 contact.
- `docs/tascam-38/circuit-analysis.md` — circuit blocks, mode-state behavior, evidence register, unresolved items, and a final summary.

A machine-readable validator lives at `tools/tascam-38/validate-interface.py` and checks completeness, uniqueness, statuses and evidence requirements. Existing investigative documents remain provenance/history, not competing authorities.

### Interface-matrix schema

`connector,pin,card_side_node,motherboard_side_node,signal_class,mode_dependency,card_evidence,motherboard_evidence,status,uncertainty_id,notes`

- `status`: `VERIFIED`, `CANDIDATE`, `UNRESOLVED`, or `CONTRADICTED`.
- `VERIFIED` requires **both** card-side and motherboard-side paths independently traced to named component pins, connectors or rails, with evidence references for both. A worksheet row alone never qualifies.
- `CANDIDATE` is a plausible but not fully traced assignment; label its origin.
- `UNRESOLVED` identifies a specific ambiguous conductor, junction, unreadable label, or missing endpoint.
- `CONTRADICTED` identifies mutually inconsistent evidence, not merely a multi-terminal net.
- Evidence should cite **source filename, sheet, connector/component and crop coordinates or equivalent reproducible location**. If no coordinates are available, use precise drawing landmarks.
- A blank, `X`, or absent annotation is **not** proof of no-connect.
- Keep on-card and motherboard-side cross-connections separate even when their connector numbers match.

## Deterministic work queue

### Pass 0 — reconcile sources and initialize files

1. Verify filenames, SHA-256, page identity, orientation and actual image resolution.
2. Correct any misleading source references in canonical analysis.
3. Create the 50-row canonical matrix from the connector inventory, preserving existing hypotheses as `CANDIDATE` or `UNRESOLVED`, not `VERIFIED`.
4. Run the validator and commit. **Continue immediately.**

**Gate:** J101=4, J102=7, J103=6, J104=7, J105=7, J106=8, J107=7, J108=4; total 50, unique (connector,pin) keys.

### Pass 1 — card-side contact tracing

For each connector in order **J101, J103, J106, J108, J107, J104, J102, J105**, inspect **every pin**, following wires to components, rails and junction dots. Record relay **coil** versus **signal contact**, transistor terminal, winding, and any local common net. Do not skip undocumented pins.

**Gate:** every row has a card-side endpoint or a specific unresolved reason. Commit and continue.

### Pass 2 — motherboard-side contact tracing

For each of the same 50 pins, trace the mating P10x contact through the motherboard to head connectors (P121/P151/P161), line I/O (P131/P141), function board (J173–J175), output select (J180/J181), oscillator (J182), power/control (P171), or another explicitly identified contact. Record all junctions and crossings. Maintain **separate net identities** for the card and motherboard.

Resolve known issues:
- J102-5 ↔ J105-2 on card versus P102-5 ↔ P105-1 on motherboard.
- J106-8 contact exists; ground candidate not automatically verified.
- P108-1 / P107-1 / P104-6 common return.
- P107-2 / P104-7 candidate shared supply net.
- J103-4/6 and J108-2/3 erase/oscillator ambiguity.
- All `X` cells in the original worksheet.

**Gate:** every row has a motherboard endpoint or a specific unresolved reason; no implied ground/NC based solely on proximity. Commit and continue.

### Pass 3 — circuit-functional analysis

Document, with trace references, the full REPRO head → K101/TR101/U101 → EQ/selection → K102 → line output path; the SYNC pickup and monitoring path; INPUT/record amplification and EQ; bias oscillator feed and per-channel bias amplification; erase-head routing; meter feed; power rails and returns; and protection/muting. Distinguish Q110/Q106/Q105 **gating/shunt behavior** from simplistic series input selection. Document K101/K102/K103 separately.

**Gate:** every functional block has explicit inputs, outputs, control conditions and evidence; unknown behavior stays marked unknown. Commit and continue.

### Pass 4 — switching and operating modes

Derive a state table for INPUT, SYNC, REPRO, REC armed/unarmed, transport stopped/running, POWER MUTE, PLAY MUTE and punch transitions. For each state, record expected signal path, relay coil condition, gated branches and output source. **Do not infer active-high/low from a switch name alone**; trace the driving circuit and diode/transistor polarity.

**Gate:** every requested state is either supported by a sourced path or carries an exact unresolved dependency. Commit and continue.

### Pass 5 — audit and acceptance

1. Run automated matrix checks.
2. Independently re-trace all rows marked `VERIFIED`; do not use the worksheet as the second source.
3. Reconcile conflicts and document remaining ambiguities with connector/pin, source location, attempted methods, and the exact new evidence required.
4. Compare to the prior notes and correct false statements (including earlier 49-contact and mislabeled-scan claims).
5. Produce a final summary with counts of `VERIFIED`, `CANDIDATE`, `UNRESOLVED`, `CONTRADICTED`, and a reproducible list of outstanding blockers.
6. Commit authoritative files and validation results.

**Success:** 50 unique rows; every row either fully verified or transparently unresolved with reproducible evidence; all functional paths and modes analyzed to the limit of the source; all tests pass; a clear distinction between **analysis complete with open evidence questions** and **replacement design safe to build**. Never call a netlist electrically complete if any required contact remains unverified.

## Execution behavior / stop rules

- Execute passes in order; intermediate commits **must not terminate execution**.
- When one pin is ambiguous, log it and **continue to the next pin**. A single unresolved junction does not block the other 49 contacts.
- If GitHub rejects a write, save the exact artifact locally or in Library, retry a smaller or alternate supported write, and continue analysis. A transient GitHub write failure is not an electrical blocker.
- Do not stop merely because an analysis step is tedious, the chat has a convenient summary, or a checkpoint was reached.
- **Stop only** after the full acceptance audit, or when an actual tool/runtime limitation prevents further execution. In that case report exactly which work remains, what was attempted, and why it cannot continue.
- No claim of background work unless a long-running workflow has actually been started. In an ordinary chat, execution ends when the assistant's turn ends; for uninterrupted multi-hour work, run this plan in **ChatGPT Work** with access to the connected GitHub account and preserved source files.
- Final report must explicitly say `COMPLETE`, `BLOCKED`, or `INCOMPLETE — EXECUTION STOPPED`, with commit links and validation counts. Never say `BLOCKED` merely because the analysis is unfinished.

## Out of scope

PCB layout, card dimensions, parts sourcing, external chassis, replacement motherboard, fabrication, hardware power-up and electrical modifications.
