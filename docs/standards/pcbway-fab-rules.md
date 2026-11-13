# PCBWay fabrication rules for this project

This is the one place the bare-board fabrication rules are written down. The
KiCad project's Board Setup and the autorouter's floor instruction are both set
from this document, so neither depends on anyone's memory of a number.

Scope: a 2-layer FR-4 bare board with 1 oz (35 um) outer copper, sent to PCBWay
for fabrication. Through-hole parts, no assembly.

Three columns sit beside every rule, because a reader needs to know whose number
is whose:

- **PCBWay publishes** is what PCBWay's capabilities page states, with its tier.
  It is the only column that is the vendor's.
- **Adopted floor** is the plan's approved floor for this project. **PCBWay does
  not publish these as a tier.** They are this project's own values, set at or
  above what the page publishes.
- **Project value** is what this project designs to. It is the binding column,
  and the one the KiCad project and the router file are set from.

## Rules

| Rule | PCBWay publishes | Adopted floor | Project value |
| --- | --- | --- | --- |
| Track width | 0.1 mm (4 mil), standard tier | >= 0.15 mm | 0.3 mm signal, 0.5 mm power; 0.25 mm minimum |
| Copper clearance | 0.1 mm (4 mil), standard tier | >= 0.15 mm | 0.25 mm |
| Drill, vias and PTH | 0.15 mm minimum; below 0.2 mm or above 6 mm is surcharged, standard tier | >= 0.3 mm | 0.4 mm via drill; 0.8 mm via pad diameter; 0.3 mm minimum hole |
| Via annular ring | 0.15 mm (6 mil) for pads with vias, standard tier | >= 0.15 mm | 0.2 mm (0.8 mm via pad on a 0.4 mm drill) |
| Component-hole annular ring | not in the standard tier; advanced normal process >= 10 mil (0.254 mm) | not set by this standard | set by each footprint; must clear 0.254 mm (see below) |
| Hole to hole | not in the standard tier; advanced normal process: component hole >= 16 mil (0.406 mm), via (<= 0.45 mm) >= 11 mil | >= 0.4 mm | 0.5 mm |
| Mounting holes (NPTH) | NPTH finished-hole tolerance +/-0.05 mm, standard tier | non-plated, no annular ring | 3.2 mm hole, 7.0 mm keepout (see below) |
| Copper to board edge | not in the standard tier; advanced normal process, CNC milling, 0.25 mm | >= 0.25 mm | 0.5 mm |
| Silkscreen text | character width >= 0.15 mm, character height >= 0.8 mm, standard tier | stroke >= 0.15 mm, height >= 0.8 mm | stroke 0.15 mm, height 0.8 mm minimum |
| Layers, material | standard table spans 1 to 14 layers, FR-4 among materials; no separate 2-layer table | 2-layer FR-4, standard thickness and copper | same |

Silkscreen note: PCBWay's figure is a minimum **character width**; this
project's figure is **stroke** width. They are different quantities and are not
asserted equal. The 0.15 mm stroke is the project's own choice, and PCBWay's
page does not state a stroke figure.

### Caveat on the advanced-tier figures

Rows marked "advanced normal process" come from PCBWay's advanced-capability
table, not the standard table. Two things limit how far to trust them here.

- The page's tables render with garbled columns when fetched, so the tier
  (normal / medium / high) of each advanced figure was **read, not copied**.
  Re-check them on the live page before quoting one elsewhere.
- The advanced weld-ring and width/spacing rows are conditioned on outer copper
  weight. The figures quoted here are the **35 um (1 oz) outer copper** rows,
  which is why this standard assumes 2-layer, 1 oz copper.

For the same 35 um row, the advanced normal process also lists minimum outer
width/spacing of 5/6 mil and a via weld ring of >= 5 mil. The standard tier's
looser 4 mil trace and spacing figures are the ones in the table above.

### Annular rings: vias and component holes are different rules

PCBWay publishes two different annular-ring figures, and they must not be
conflated.

- **Vias.** Standard tier: 0.15 mm (6 mil) "for pads with vias in the middle".
  Advanced, 35 um, normal process: >= 5 mil. This project's 0.2 mm (7.87 mil)
  is a **via** ring, from a 0.8 mm pad on a 0.4 mm drill, and it sits above both
  of those figures.
- **Component holes (PTH pads).** Advanced tier, "Minimum weld ring (outer
  layer)", 35 um: **>= 10 mil (0.254 mm)** normal process, >= 8 mil medium
  difficulty. The standard tier publishes no component-hole figure. The 0.2 mm
  via ring above would fall below even the medium figure if read as a
  component-hole ring.

**This standard does not set the component-hole annular ring.** It comes from
each footprint's own pad and drill geometry. This is a through-hole board, so
every part pad is a component hole; the via rule does not cover them. The figure
those footprints must clear is 0.254 mm.

### Mounting holes

The fastener is a standard M3 screw in a 3.2 mm non-plated hole. The 7.0 mm
keepout envelope is taken from a DIN 125 Type A / ISO 7089 washer (3.2 mm
inside diameter, 7.0 mm outside diameter): no copper, part or silkscreen may sit
under the washer. This is an owner decision, recorded verbatim in
`docs/known-gaps.md` as G311.

## Why the adopted floors differ from what PCBWay publishes

The adopted floors are the plan's approved values. PCBWay does not publish them
as a tier: its page has no tier by that name, and its only extra-cost statement
for hole size is that holes above 6 mm or below 0.2 mm are surcharged. Where an
adopted floor is tighter than the page's figure (track, clearance, drill), that
is a project choice, not a vendor requirement. Where the page has no figure at
all in the standard tier (hole to hole, copper to edge, component-hole ring),
the advanced-tier figure is recorded as the nearest published reference and is
subject to the caveat above.

## Where each value is enforced

A rule written only in prose drifts, so each value is enforced from a file a
tool reads, not from this document.

- **`circuits/pt2399-core/pt2399-core.kicad_pro`** carries the Board Setup
  constraints (minimum track width, clearance, via and hole sizes, via annular
  ring, hole-to-hole, copper-to-edge, minimum text size) and the net-class
  widths. KiCad's DRC reads these. The net classes are named, and the names
  are part of this standard: **`Default`** is signal (track 0.3 mm, via
  diameter 0.8 mm, via drill 0.4 mm) and **`Power`** is power (track 0.5 mm).
  The project's `rule_severities` must also leave `items_not_allowed`,
  `courtyards_overlap` and `missing_courtyard` enabled (KiCad ignores
  `missing_courtyard` by default). `tools/pcb/fab-standard.ts` checks the
  constraint values and the net-class widths.

  **WHICH NETS ARE IN `Power` IS A SEPARATE CHECK, because the gate above
  cannot see it.** `fab-standard.ts` compares class DEFINITIONS, so a project
  declaring `Power` with no net assigned to it passes - and DRC passes too,
  because the signal width clears the minimum. The supply rails would then
  route at signal width with nothing red anywhere. The assignment lives in that
  project's `net_settings.netclass_patterns`, and
  `tests/pcb/netclass-patterns.test.ts` is what holds it: it asks `pcbnew` which
  class each net on the board resolves into, rather than reading the patterns
  back out of the JSON that is the matcher's input.

  **`rule_severities` IS CHECKED, AND NOT WHERE YOU WOULD LOOK FOR IT.** Neither
  of the two checks above touches it, which is why it reads as unguarded and was
  briefly recorded here as such. It is enforced by `tools/pcb/drc-report.ts`,
  which refuses when a real DRC report's `ignored_checks` array contains any of
  `items_not_allowed`, `courtyards_overlap` or `missing_courtyard`
  (`REQUIRED_ACTIVE_CHECKS`), and `tests/pcb/drc.test.ts` pins it. **That is a
  stronger check than reading the project file would be**, and deliberately so:
  it establishes that the three checks ACTUALLY RAN in the invocation whose
  report is being trusted, rather than that a `.kicad_pro` promised they would.
  A project file can be correct while the run that produced a report ignored
  them anyway - a different `--severity` selection, a stale project, a board
  opened against another project - and only the report can tell you which
  happened.
- **`circuits/pt2399-core/route-fab-floor.txt`** carries the same minimums as a
  standing instruction to the router.

The second file exists because without a standing floor instruction the
router's own fabrication tier necks tracks and shrinks vias below this
standard. KiCad's DRC would catch the result afterward, but the router should
not produce it in the first place.

`pt2399-core.kicad_pro` exists and passes `tools/pcb/fab-standard.ts`;
`route-fab-floor.txt` does not exist yet and a later task creates it from this
document. If a value here changes, both files change in the same commit.

## Not enforced

None of these is checked, so none should be mistaken for checked.

1. **Trace impedance and via inductance.** They do not matter at this board's
   audio frequencies and are not why these rules exist.
2. **Silkscreen graphic line width.** KiCad has no design rule for it at all.
   Text stroke is set above; graphic line width is not. It is MEASURED and
   disclosed rather than gated: `tests/pcb/silkscreen-widths.test.ts` reads the
   widths off the populated board through `tools/pcb/silkscreen-survey.ts`,
   compares them with the silkscreen stroke figure in the table above, and
   prints the result - run it to read the widths. No width is transcribed into
   this document, because these widths belong to the stock KiCad footprints the
   board places and change when its parts or KiCad's libraries change. Nothing
   refuses over the comparison; the consequence of a thin outline is a faint
   legend, not a rejected or dearer board.
3. **Assembly.** These are bare-board rules. Nothing here constrains part
   placement for an assembler, paste stencils or pick-and-place.

## Sources

- PCBWay, "PCB Capabilities": https://www.pcbway.com/capabilities.html
  (figures checked against the page on 2026-11-13, twice; see the caveat on the
  advanced-tier figures above).
- Mounting-hole washer envelope: DIN 125 Type A / ISO 7089 (3.2 mm ID, 7.0 mm
  OD), by owner decision G311 in `docs/known-gaps.md`.
