# PCB fabrication rules: PCBWay standard spec

Ported from: [docs/standards/pcbway-fab-rules.md](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/standards/pcbway-fab-rules.md)

> **Authority at phase 4.** PCBWay's currently published capabilities are the authority when a board is prepared for fabrication in phase 4 of this port. Every figure below is kept with the date it carries: the pedals file gives no capture date for the PCBWay column, and its last change before the pin was 2026-10-04 (from that file's history in the pedals repository), so read each figure as of that date and no later. The one dated-by-event supersession inside the text, the "A2 Task 8 fix round 1" item in the plated-slot row, carries no calendar date and is kept as written.
>
> The board paths, file names and tools named in this document belong to the pedals repository at the pinned commit; they are linked where the file exists there and have no counterpart in this repository.
>
> **Edited in the port's final review (controller ruling):** the section the pedals file titles "Where the rules are enforced" read as a live instruction here (a board conforms when it carries the pedals router's `route-fab-floor.txt`; copy both files when starting a board; other boards must be brought to the standard). It is retitled "Where the rules were enforced in the pedals repository" and reframed as history of how pedals enforced the rules at the pin; this repository's enforcement is set in phase 4 with its own tooling. Every figure, date and pinned link in it is kept, and the rules table is not changed.

Every board in this repository is designed to PCBWay's **standard, no-extra-cost** 2-layer FR-4
specification. A design rule tighter than this spec raises the price of every order, so it is
a project standard, not a per-board choice. Where PCBWay's absolute capability is finer, those
finer values cost extra and are not used here.

## The rules

PCBWay's limits are floors, not targets. Pedal boards have room, so the project values carry
a margin over them: easier to fabricate, more tolerant of etch and drill variation, and still
at the lowest price.

| Rule | PCBWay, no extra cost | Project value |
|---|---|---|
| Track width | ≥ 0.15 mm (6 mil); 4–5 mil costs extra | 0.3 mm signal, 0.5 mm power; 0.25 mm minimum |
| Copper clearance | ≥ 0.15 mm (6 mil) | 0.25 mm |
| Drill (vias and PTH) | ≥ 0.3 mm; smaller costs extra | 0.4 mm via drill; 0.3 mm minimum hole |
| Annular ring | ≥ 0.15 mm | 0.2 mm (0.8 mm via pad on a 0.4 mm drill) |
| Hole to hole | ≥ 16 mil (0.4 mm) | 0.5 mm |
| Plated slot | width ≥ 0.5 mm; length ≥ 2 × width (shorter is "medium difficulty") | same. The h7-platform DC jack is now the Same Sky PJ-057AH, whose layout's 3.0 × 0.8 mm (3.75:1) slots meet the normal-process ratio. (Superseded: the PJ-102AH footprint's 1.60 × 1.00 mm (1.6:1) slots, accepted as medium difficulty, left the design in A2 Task 8 fix round 1.) |
| Copper to board edge | ≥ 0.25 mm (routed edge) | 0.5 mm |
| Silkscreen text | stroke ≥ 0.15 mm, height ≥ 0.8 mm | stroke 0.15 mm, height 0.8 mm minimum |
| Layers, material | 2-layer FR-4, standard thickness and copper | same |

Never go below the PCBWay column. Drop below the project column only where a footprint forces
it (for example, a fine-pitch part), and record why on the board.

These boards carry audio-frequency signals. The rules exist for manufacturability, not signal
integrity: trace impedance and via inductance do not matter here. What matters electrically
(input/output separation, ground pour) is set per board, for example in smd-v2's
[`fuzz/boards/smd-v2/fuzz.kicad_dru`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/boards/smd-v2/fuzz.kicad_dru).

## Where the rules were enforced in the pedals repository

**History, not an instruction.** This section says how the pedals repository enforced these
rules at the pinned commit. Nothing in it applies to this repository: the files, the router,
the DRC target and the board named below belong to the pedals repository and none of them came
across. This repository's enforcement of the rules table is set in phase 4 of this port, with
its own tooling. The rules table above is unchanged by this framing.

The pedals source's reasoning was that a rule written only in prose drifts, so each value lived
in the files the pedals tools read:

- **`<board>/fuzz.kicad_pro`**: Board Setup constraints (`min_track_width`, `min_clearance` via the
  Default net class, `min_via_diameter`, `min_via_annular_width`, `min_through_hole_diameter`,
  `min_hole_to_hole`, `min_copper_edge_clearance`, `min_text_thickness`, `min_text_height`) and
  every net class's `via_diameter` 0.8 / `via_drill` 0.4 and track widths. KiCad's DRC (in the pedals repository the DRC target lived in
  [`fuzz/Makefile`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/Makefile) at the pin,
  and the `drc_kicad` check belonged to the pedals routing tool `krt`, whose make rules are in
  [`make/krt.mk`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/make/krt.mk)) failed a board that broke them.
  Neither tool came across to this repository.
- **`<board>/route-fab-floor.txt`** (a pedals artifact; for example
  [`fuzz/boards/smd-v2/route-fab-floor.txt`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/boards/smd-v2/route-fab-floor.txt)):
  the same minimums for the KiCadRoutingTools router, applied as
  a standing route instruction from `placement-policy.json` (a pedals artifact; for example
  [`fuzz/boards/smd-v2/placement-policy.json`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/boards/smd-v2/placement-policy.json)). Without it the router's own
  fab tier necks tracks down to 0.127 mm and shrinks vias, below this spec.

In the pedals repository, a board conformed when both of those files carried these values and
its DRC was clean, and a new pedals board started from copies of both taken from
[`fuzz/boards/smd-v2/`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/boards/smd-v2/).

Conformance as the pedals file recorded it at the pin (its last change before the pin was
2026-10-04): [`fuzz/boards/smd-v2/`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/fuzz/boards/smd-v2/) conformed, and the
pedals repository's other boards predated the standard and were to be brought to it before they
were ordered. That is a statement about pedals boards; it names no board in this repository.

## Not checked by DRC

- **Silkscreen line width.** Some stock KiCad footprints draw 0.12 mm silkscreen outlines,
  thinner than PCBWay's 0.15 mm legend guideline. The worst case is faint outlines; it does not
  reject the board or add cost. KiCad has no rule for graphic line width, so this is not enforced.
- **Assembly.** These are bare-board rules. PCBWay assembly notes (part sourcing, LED spacer,
  fiducials) are in [`docs/superpowers/specs/fuzz-v2-sourcing/pcbway-assembly-notes.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/fuzz-v2-sourcing/pcbway-assembly-notes.md).

## Sources

- PCBWay PCB capabilities: <https://www.pcbway.com/capabilities.html>
- KiCad forum, design rules for PCBWay (6/6 mil and 0.3 mm holes for lowest price):
  <https://forum.kicad.info/t/board-setup-design-rules-for-pcbway-and-other-questions/52197>
