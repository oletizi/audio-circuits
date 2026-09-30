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

- 2026-09-30: Mouser, Digi-Key, Tayda, Newark and DigiPart all blocked
  automated fetching of product pages from this environment - Digi-Key,
  Newark, Tayda and DigiPart returned HTTP 403; Mouser returned HTTP 200 but
  an Akamai "Access Denied"/captcha page instead of the product page. This
  held across regional mirrors (mouser.co.uk, eu.mouser.com, digikey.ca) and
  with browser-like User-Agent/Accept-Language headers. Only the
  manufacturer's own datasheet PDF (fetched directly, e.g.
  yageogroup.com's YAGEO-MFR_DATASHEET.pdf) was readable. Until this
  clears, a resistor (or other standard/bulk-sourced) line cannot get a
  valid catalog entry from here, since a source needs a distributor page
  actually read for its SKU and price, and the mpn/price cannot be guessed;
  finishing needs a session with a working browser against these sites, or a
  reachable API/mirror.
- 2026-09-30: For a 1/4 W, 1% axial metal-film resistor (0207 body,
  R_Axial_DIN0207 footprint), Yageo's MFR-25FBF52-<value> is a good
  one-family choice across values: the MFR-25 size is rated 1/4 W at 70 degC
  with L=6.3+-0.5mm / diameter 2.4+-0.2mm (matches 0207), F=1% tolerance, B=
  bulk packaging (not reel), confirmed from Yageo's MFR series datasheet
  (yageogroup.com/content/Resource%20Library/Datasheet/YAGEO-MFR_DATASHEET.pdf),
  "Ordering Information" and "Dimensions" tables. Value coding is standard
  RKM (e.g. 100R = 100 ohm, 10K = 10,000 ohm, 1M = 1,000,000 ohm), so the
  same family covers small ohm values through megohms without switching
  parts. Distributor SKU, stock and price still need confirming per value
  once a distributor site can actually be read (see the fetch-blocking
  lesson above) - do not commit a catalog entry from the MPN-construction
  rule alone.
