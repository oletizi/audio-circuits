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
(tariffs make them move). Refresh Mouser (and, once built, Digi-Key) prices
with `bun run parts refresh [<catalog id>...]`: it re-reads each source by its
supplier part number and rewrites only the price breaks and the date, and
writes nothing unless every lookup succeeds.

### The supplier tool and its keys

`bun run parts lookup|search|source|refresh` reads Mouser through its official
Search API (distributor web pages block automated fetches). Keys live outside
the repository and are never printed or committed:

- Mouser: `~/.config/mouser/mouser-credentials.txt` - one line, the Search API
  key (from the API Hub in a Mouser account).
- Digi-Key: `~/.config/digikey/digikey-credentials.txt` - two lines, client ID
  then client secret (an application on developer.digikey.com). The Digi-Key
  client itself is built once these exist (Task 2 of
  `docs/superpowers/plans/2026-09-30-supplier-search.md`); until then Digi-Key
  sources are added by hand, if at all.

## Matching a line

What each footprint in this repo demands (`tools/bom/footprints.ts`):

- **Axial resistor, `R_Axial_DIN0207_..._P10.16mm`:** a 0207 body (about
  6.3 mm long, 2.5 mm diameter - standard 1/4 W metal film); the leads are
  bent to the footprint's 10.16 mm pitch on the bench, so an axial entry
  records no lead spacing (no datasheet states one - do not invent it).
  Metal film, 1% unless the line says otherwise.
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
  yageogroup.com's YAGEO-MFR_DATASHEET.pdf) was readable. Resolved: use the
  `parts` tool (`bun run parts lookup|search|source`), which reads Mouser
  through its official Search API. Do not fetch distributor web pages.
- 2026-09-30: For a 1/4 W, 1% axial metal-film resistor (0207 body,
  R_Axial_DIN0207 footprint), Yageo's MFR-25FBF52-<value> is a good
  one-family choice across values: the MFR-25 size is rated 1/4 W at 70 degC
  with L=6.3+-0.5mm / diameter 2.4+-0.2mm (matches 0207), F=1% tolerance, B=
  bulk packaging (not reel), confirmed from Yageo's MFR series datasheet
  (yageogroup.com/content/Resource%20Library/Datasheet/YAGEO-MFR_DATASHEET.pdf),
  "Ordering Information" and "Dimensions" tables. Value coding is standard
  RKM (e.g. 100R = 100 ohm, 10K = 10,000 ohm, 1M = 1,000,000 ohm), so the
  same family covers small ohm values through megohms without switching
  parts. Confirm each value's SKU, stock and price with
  `bun run parts lookup MFR-25FBF52-<value> --supplier mouser` - do not
  commit a catalog entry from the MPN-construction rule alone.
- 2026-09-30: Mouser's value spelling for Yageo MFR-25FBF52 matches the
  datasheet's RKM-style ordering code exactly, with no leading/trailing zero
  padding - `22R` (not `22R0`), `1K`, `1K2`, `1K5`, `5K6`, `15K`, `47K`,
  `100K`, `470K` all matched `lookup` on the first try once spelled this way.
  `search MFR-25FBF52 <digits>` is the fallback when a guessed spelling
  0-matches; it also returns the family's near neighbors (e.g. `22R` vs
  `22R6` vs `22K1`), useful for confirming which one is the value wanted.
- 2026-09-30: The Mouser Search API's price breaks for MFR-25FBF52 (and, by
  extension, other Yageo passive reels/bulk packs sold this way) carry no
  field distinguishing a stocking-pack quantity from an ordinary cut-tape
  price break - every break just looks like "buy N for $/each". Do not infer
  `pack: true` on any of them; if the listing text does not say "bag of
  N"/"pack of N" outright, leave every break unmarked and set the entry's
  `stock` to `false`, even though the part itself is exactly the kind of
  cheap commodity resistor the "stock" flag is meant for. This makes the
  `stock: true` + pack-break enforcement in `tools/bom/catalog.ts` a real
  question for a resistor entry, not a formality.
- 2026-09-30: Panasonic's M-A (ECA) series - a current, general-purpose
  radial-leaded aluminum electrolytic family (industrial.panasonic.com,
  datasheet ABA0000C1218.pdf; NOT blocked, unlike mouser.com-hosted copies
  of the same datasheet, which return an Akamai block page) - covers this
  board's 10uF, 100uF, 220uF and 470uF/35V `CP_Radial` lines from one
  printed dimension table, each straight-lead value landing exactly on the
  footprint's diameter and lead spacing (e.g. 10uF/35V = 5x11mm, 2mm
  leads; 220uF/35V = 8x11.5mm, 3.5mm leads). Some values the table lists
  are 0-stock at Mouser for the straight-lead SKU (e.g. ECA-1VM101,
  100uF/35V); where a taped-and-formed variant ("I" or "B" suffix, the
  12th digit) shares the same lead pitch as the straight-lead row - check
  the datasheet's "Taping" columns, not just the "Straight" one - that
  variant is an equally good fit and is often the one actually in stock.
- 2026-09-30: The M-A (ECA) family's printed 35V dimension table has gaps
  at small values - it has no 22uF row at 35V (jumps 10uF to 47uF) even
  though Mouser lists an in-family MPN (ECA-1VM220) for exactly that
  value and voltage; Nichicon's UPJ series datasheet has the identical
  gap at 35V for its own 22uF part. Confirming such a value's case size
  from the datasheet is not possible when the row does not exist. Per
  this file's rule that body size and lead spacing may come from the
  supplier's stated parameters, Nichicon UPJ1V220MDD's Mouser Search API
  description text itself states the case and pitch ("35volts 22uF 5x11
  20% 2LS") and was used as the evidence instead - this is reasonable,
  but a real per-part datasheet would be stronger evidence if one turns
  up later.
- 2026-09-30: `bun run parts lookup|search|source` crashes (uncaught
  `Error`, exit 1, no output) on any Mouser query whose results include SKU
  511-2N3904 (a Mouser catalog row with `AvailabilityInStock: null` rather
  than a numeric string) - `tools/suppliers/mouser.ts`'s `parsePart` only
  accepts a numeric-string stock value. This hit `lookup 2N3904`,
  `search 2N3904` and `source 2N3904 --use standard` alike, since all three
  go through the same exact-partnumber/keyword query. Narrowing the search
  with a second keyword that this stale row does not match (e.g.
  `search 2N3904 TO-92`) sidesteps it and returns the other manufacturers'
  listings normally; this is a real tool bug (reported, not fixed by a
  researcher) rather than anything about the part itself.
- 2026-09-30: A BJT catalog entry's `mpn` must equal the circuit's modeled
  part number exactly (`tools/bom/fit.ts`'s `checkEqual("mpn", ...)`) - for
  the 2N3904 that means the entry's `mpn` field has to be the bare string
  `"2N3904"`, not a supplier ordering-code suffix. Several Mouser-listed
  "2N3904" parts are only available under a suffixed code: onsemi's cheap,
  well-stocked bulk-bag part is `2N3904BU` (10000/bulk bag per its own
  datasheet's ordering table), not bare `2N3904` - Mouser's SKU 511-2N3904
  for onsemi's literal bare part is the crashing row above, effectively
  unavailable through this tool. Diotec Semiconductor and Rectron both list
  their part under the bare Mouser mpn `"2N3904"` (SKUs 637-2N3904,
  583-2N3904) - pick one of those when the line needs an exact bare mpn
  match, even if a suffixed part elsewhere is cheaper or better-packaged.
- 2026-09-30: 2N3904 pinout genuinely varies by source, exactly as this
  file already warns - onsemi's current 2N3904/D datasheet (Rev. 9, and the
  standalone 2N3904/D, Oct 2024 Rev. 3) both draw pin 1 = emitter, pin 2 =
  base, pin 3 = collector (E-B-C) for the whole 2N3903/2N3904 family
  (TO-92 case 29-11, Style 1). Diotec Semiconductor's current datasheet
  (diotec.com/request/datasheet/2n3904.pdf, "Version 2026-03-10") also
  draws E-B-C. A secondary aggregator site (not the manufacturer) states
  Diotec's pinning as C-B-E - it was not used as evidence and appears to be
  either stale or a misreading; always read the manufacturer's own PDF
  package drawing, never an aggregator's transcription of it, and note
  which exact drawing/revision was read.
- 2026-09-30: Samtec's precision-machined (screw-machine) socket strips -
  series SS (standard height), ESS (elevated), SD/ESD (double row), HSS
  (high temp) - are documented on one shared catalog page (fetched from
  `suddendocs.samtec.com/catalog_english/ess.pdf`; Mouser's own copy of the
  same PDF, `mouser.com/datasheet/3/85/1/ess.pdf`, returns Mouser's Akamai
  block page like every other mouser.com-hosted PDF). The part number
  encodes position count directly: `<series>-1<NN>-<plating>-<lead style>`,
  where the `1` is the single-row type-strip digit and `NN` (01 thru 32) is
  the pin count - e.g. `SS-103-T-2-N` is a native single-row 3-position
  strip, not a longer strip that needs breaking down. A 2.54 mm / 0.1"
  TO-92 lead (about 0.41-0.53 mm per onsemi's TO-92 dimension table) fits
  this whole family's stated lead size range (0.38-0.56 mm / .015"-.022").
  The plain `SS` (standard height) series is cheaper than the outwardly
  similar `ESS` (elevated) series at the same position count and plating,
  and is the better default for socketing a bench-build discrete part.
- 2026-09-30: Mouser does not carry Runtron at all - `bun run parts search
  RM-065 --supplier mouser` and `search Runtron --supplier mouser` both
  return only unrelated parts (a Molex/AirBorn "VRM-06-..." connector
  family, and Rectron-manufacturer parts that fuzzy-matched "Runtron"). A
  `Potentiometer_Runtron_RM-065_Vertical` line always needs a substitute
  from a supplier Mouser does carry.
- 2026-09-30: The RM-065 footprint's true pin pattern (confirmed from
  Runtron's own datasheet, and cross-checked against the repository's own
  KiCad footprint file,
  `Potentiometer_THT.pretty/Potentiometer_Runtron_RM-065_Vertical.kicad_mod`,
  whose 1.0mm-drill pads sit at (0,0), (5,0) and (2.5,5) mm) is an
  isosceles triangle with the THIRD pin centered and offset the FULL base
  distance (5mm) perpendicular from the other two - not the shallower,
  much more common trimmer layout (base 5mm, third pin offset only 2.5mm)
  used by Bourns's 3306 (all of styles K/P/W - confirmed from Bourns's own
  3306 datasheet's "SUGGESTED PWB LAYOUT - STYLES K, P, W" drawing,
  bourns.com/docs/Product-Datasheets/3306.pdf) and by the locally-cached
  KiCad footprints for the Bourns 3299Y, Vishay T7-YA and Piher PT-10/PT-15
  trimmers. Do not assume any in-stock "6mm single-turn trimmer" matches
  RM-065 on pin layout alone - measure the actual triangle (base and
  perpendicular offset) from both datasheets before recording
  `specs.package: "RM-065"`. Amphenol Piher's PT6-V style (rotor code "V"
  in the part number, e.g. `PT6KV-102A2020`) does match, confirmed from
  Piher's own PT6 datasheet's "V = horizontal mounting - vertical
  adjustment" PCB pad drawing (page 3): both outer pins 0.9mm dia, 5mm
  apart, third pin 0.9mm dia, centered and offset the full 5mm
  perpendicular - the same triangle as RM-065's 1.0mm-dia holes.
- 2026-09-30 (corrected by the operator's session): a catalog entry's `mpn`
  is always the real orderable part number - never a circuit's identifier
  copied in to satisfy a check. `tools/bom/fit.ts` checks `mpn` equality only
  for active devices (bjt, diode, opamp, ic), where the type number is the
  part's identity. On a passive, the circuit's part number (e.g. the
  trimmers' "RM-065") names the footprint family, which the physical checks
  cover, so a compatible substitute such as Piher's PT6KV-102A2020 carries
  its own mpn. If a check ever demands recording something untrue, stop and
  report it instead.
- 2026-09-30: Both `runtron.com` (fetches 404 in this environment - the
  domain answers but not with the original site) and `piher.net` (blocks
  direct fetches, HTTP 403, the same as the distributor sites this file
  already warns about) were unreachable directly for their own PDF
  datasheets. Third-party mirrors that host the identical manufacturer
  PDF (letterhead, logo and footer URL unchanged) were readable instead:
  `soldered.com/productdata/...` for Runtron's RM065/RM063 datasheet, and
  `pk-components.de/fileadmin/Datenblaetter/PIHER/...` for Piher's PT6
  datasheet. A PDF that a `WebFetch` summarizes as "encoded/unreadable" is
  often still fully readable with the `Read` tool directly (it extracts
  the embedded text layer) or, for a dimension drawing where digits and
  labels get interleaved out of order in that text layer, by rendering
  the page to a PNG (`pdftoppm -png -r 600 ...`) and reading the image.
