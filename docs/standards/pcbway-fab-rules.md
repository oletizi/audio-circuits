# PCBWay fabrication rules for this project

This is the one place the bare-board fabrication rules are written down. The
KiCad project's Board Setup and the autorouter's floor instruction are both set
from this document, so neither depends on anyone's memory of a number.

Two numbers sit beside every rule, because a reader needs to know which is ours
and which is the vendor's:

- **Vendor floor (as adopted)** is the "no extra cost" floor this project
  adopted for each rule. It is deliberately more conservative than the bare
  minimum PCBWay publishes; see "Where the published page differs" below.
- **Project value** is what this project designs to. It is the binding column.

Scope: a 2-layer FR-4 bare board sent to PCBWay for fabrication. THT parts, no
assembly.

## Rules

| Rule | Vendor floor (as adopted) | Project value |
| --- | --- | --- |
| Track width | >= 0.15 mm | 0.3 mm signal, 0.5 mm power; 0.25 mm minimum |
| Copper clearance | >= 0.15 mm | 0.25 mm |
| Drill, vias and PTH | >= 0.3 mm | 0.4 mm via drill; 0.3 mm minimum hole |
| Annular ring | >= 0.15 mm | 0.2 mm (0.8 mm via pad on a 0.4 mm drill) |
| Hole to hole | >= 0.4 mm | 0.5 mm |
| Mounting holes (NPTH) | non-plated, no annular ring | 3.2 mm hole, 7.0 mm keepout envelope (see below) |
| Copper to board edge | >= 0.25 mm | 0.5 mm |
| Silkscreen text | stroke >= 0.15 mm, height >= 0.8 mm | stroke 0.15 mm, height 0.8 mm minimum |
| Layers, material | 2-layer FR-4, standard thickness and copper | same |

### Mounting holes

The fastener is a standard M3 screw in a 3.2 mm non-plated hole. The 7.0 mm
keepout envelope is taken from a DIN 125 Type A / ISO 7089 washer (3.2 mm
inside diameter, 7.0 mm outside diameter): no copper, part or silkscreen may
sit under the washer.

## Where the published page differs

Checked against PCBWay's capabilities page (source below) on 2026-11-13. The
page's figures are looser than the adopted floors in most rows. The adopted
floors were not changed to match; they are the more conservative choice and the
project values sit above both. Recorded here so nobody mistakes the adopted
column for a quotation.

| Rule | Adopted floor | What the page publishes |
| --- | --- | --- |
| Track width | 0.15 mm | Standard PCB: min trace 0.1 mm (4 mil). Advanced, normal process, 35 um outer copper: >= 5 mil (about 0.127 mm) |
| Copper clearance | 0.15 mm | Standard PCB: min spacing 0.1 mm (4 mil). Advanced, normal: >= 6 mil (about 0.152 mm) |
| Drill | 0.3 mm | Standard: drill 0.15 to 6.0 mm; holes under 0.2 mm or over 6 mm "subject to extra charges". Advanced, normal: 0.20 to 6.5 mm. No 0.3 mm figure appears |
| Annular ring | 0.15 mm | Standard: 0.15 mm (6 mil) for pads with vias. Advanced, normal: via >= 5 mil, component hole >= 10 mil (about 0.254 mm) |
| Hole to hole | 0.4 mm | Advanced, normal: component hole >= 16 mil (about 0.406 mm); via (<= 0.45 mm) >= 11 mil (about 0.28 mm) |
| Copper to board edge | 0.25 mm | Advanced, normal, CNC milling: 0.25 mm. Matches |
| Silkscreen | 0.15 mm stroke, 0.8 mm height | 0.15 mm minimum character width, 0.8 mm minimum character height. Matches |
| NPTH | non-plated | NPTH finished-hole tolerance +/-0.05 mm (standard); slot width, non-plated >= 0.8 mm |
| Layers, material | 2-layer FR-4 | Standard table covers 1 to 14 layers, FR-4 among materials, thickness 0.2 to 3.2 mm. The page publishes no separate 2-layer table |

The page does not use the phrase "no extra cost" for any of these rows other than
the drill-size surcharge. The adopted floors are therefore this project's
reading of the safe, standard-priced region, not PCBWay's own words.

## Where each value is enforced

A rule written only in prose drifts, so each value is enforced from a file a
tool reads, not from this document.

- **`circuits/pt2399-core/pt2399-core.kicad_pro`** carries the Board Setup
  constraints (minimum track width, clearance, via and hole sizes, annular ring,
  hole-to-hole, copper-to-edge, minimum text size) and the net-class widths
  (0.3 mm signal, 0.5 mm power). KiCad's DRC reads these.
- **`circuits/pt2399-core/route-fab-floor.txt`** carries the same minimums as a
  standing instruction to the router.

The second file exists because without a standing floor instruction the
router's own fabrication tier necks tracks and shrinks vias below this
standard. KiCad's DRC would catch the result afterward, but the router should
not produce it in the first place.

Neither file exists yet; later tasks create them from this document. If a value
here changes, both files change in the same commit.

## Not enforced

None of these is checked, so none should be mistaken for checked.

1. **Trace impedance and via inductance.** They do not matter at this board's
   audio frequencies and are not why these rules exist.
2. **Silkscreen graphic line width.** KiCad has no design rule for it at all.
   Text stroke is set above; graphic line width is not. A later task measures
   and records it rather than gating on it.
3. **Assembly.** These are bare-board rules. Nothing here constrains part
   placement for an assembler, paste stencils or pick-and-place.

## Sources

- PCBWay, "PCB Capabilities": https://www.pcbway.com/capabilities.html
  (figures in this document checked against the page on 2026-11-13; the page's
  tables render with garbled columns, so the tier mapping of the advanced table
  was read, not copied, and should be re-checked on the live page before a
  figure is quoted elsewhere).
- Mounting-hole washer envelope: DIN 125 Type A / ISO 7089 (3.2 mm ID, 7.0 mm
  OD), by owner decision.
