# Sourcing notes

The know-how behind the parts catalog (`parts/`). The `part-researcher` agent
(`.claude/agents/part-researcher.md`) reads this before every search and adds
to **Lessons** when it learns something general. The operator edits it too;
where the operator's rules here and anything else disagree, the operator's
rules win.

Design: `docs/superpowers/specs/2026-09-30-bom-design.md`.

## The operator's rules

### Suppliers, by use

Every source in a catalog entry carries one of these uses:

| Use | Suppliers | When |
|---|---|---|
| `standard` | Mouser, Digi-Key | Standard parts, any build. The default for anything with a real part number. |
| `bulk` | Tayda | Large orders. Cheap, but ships from overseas: slow for a prototype. |
| `specialty` | Stomp box parts suppliers; Antique Electronic Supply | Guitar-pedal parts (pots, knobs, jacks, enclosures) and valve-amp parts. |
| `prototype-fast` | Amazon | Fast, free shipping for a prototype - ONLY for parts not subject to counterfeiting (below). |

Give every entry at least one `standard` source where one exists, so the part
is traceable to a real manufacturer's part number.

### Counterfeits

Amazon (and marketplace sellers generally) only for commodity parts where a
fake does not matter: hookup wire, pin headers, stripboard, sockets, knobs,
hardware. Never for transistors, ICs, electrolytic capacitors, or anything
whose rating matters.

### Panel pots

Default: 16 mm body, solid shaft, board (PCB) pins. Taper and value come from
the line.

### Buying quantities

Set per board in `bom.json` (`purchasing`), not here. The researcher's job is
to record every price break a supplier lists, mark which breaks are stocking
packs (`pack: true`, e.g. a bag of 100 resistors), and set `stock: true` on
cheap commodity parts worth stocking when prototyping: resistors, small film
and ceramic capacitors, headers, wire.

### Prices

Record the date checked. Prices older than 45 days are reported as stale
(tariffs make them move); re-check and update the date rather than keeping an
old one.

## Matching a line

What each footprint in this repo demands (`tools/bom/footprints.ts`):

- **Axial resistor, `R_Axial_DIN0207_..._P10.16mm`:** a 0207 body (about
  6.3 mm long, 2.5 mm diameter - standard 1/4 W metal film) on 10.16 mm lead
  spacing. Metal film, 1% unless the line says otherwise.
- **Radial electrolytic, `CP_Radial_D<d>mm_P<p>mm`:** body diameter at most
  `d`, lead spacing exactly `p`. Read both from the datasheet's dimension
  table for the exact value and voltage - diameters vary with voltage.
- **TO-92, `TO-92_Inline`:** the footprint here numbers pins emitter, base,
  collector (E-B-C). TO-92 parts of the "same" type differ between
  manufacturers and suffixes; confirm the pinout from the datasheet's package
  drawing and record it in `specs.pinout`.
- **Trimmer, `Potentiometer_Runtron_RM-065_Vertical`:** a Runtron RM-065
  footprint (6 mm square-ish trimmer, three pins in a triangle, vertical
  adjust). A compatible part must match that pin layout; record the evidence.
- **Pin header, `PinHeader_1x<n>_P2.54mm`:** an n-pin, 2.54 mm header. Buying
  a breakaway strip and cutting it is fine; the entry is the strip, and the
  quantity is in pins.

### Ratings

- Capacitor voltage: at least the line's `minVolts` (1.2 x the board's
  highest rail, rounded up to a standard rating: 24 V board -> 35 V).
- Resistor power: at least the line's `minWatts` (2 x the operating-point
  dissipation, never less than 1/4 W).

## Lessons

(Appended by the researcher and the operator: supplier quirks, part families
that fit or do not fit a footprint, links that moved. One bullet each, with
the date.)
