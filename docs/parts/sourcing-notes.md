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
to record every price break a supplier lists, exactly as listed, and set
`stock: true` on cheap commodity parts worth stocking when prototyping:
resistors, small film and ceramic capacitors, headers. A prototype board's
`purchasing` names a `stockQuantity` (the staged board: 100); a `stock` part
is then bought at the smallest listed price break at or above the larger of
that and the quantity needed, or that target itself at the largest break's
price when every break is smaller. Two caps in the same `purchasing` keep
bulk buying cheap: a bulk buy is taken only at or below `maxStockUnitPrice`
(the staged board: 0.15, in the source's currency), and per supplier and
currency the bulk buys may raise the order by at most `maxStockOverage`
(the staged board: 0.5, i.e. 50%) over the same order at covered
quantities; the bulk buys adding the most money are set aside first. A part set aside
is bought at the covered quantity; `make bom` and `BOM.md` say which, and
why. So marking a pricier commodity part (the Samtec pin headers, 0.2-0.3
USD each) `stock` costs nothing: the unit-price cap keeps it at the covered
quantity. Every line and extra gets the board's
shrinkage margin (at least one spare); an extra where a spare is not worth
buying, such as a multi-spool wire kit, says `"spares": false` in `bom.json`.

### Prices

Record the date checked. Prices older than 45 days are reported as stale
(tariffs make them move). Refresh Mouser and Digi-Key prices
with `bun run parts refresh [<catalog id>...]`: it re-reads each source by its
supplier part number (for Digi-Key, the product number of the one packaging
the source records) and rewrites only the price breaks and the date. It
writes nothing if any lookup or validation fails; a part no longer listed
(or listed without a price) is reported and left as it is, and the rest are
still written.

### The supplier tool and its keys

`bun run parts lookup|search|source|refresh` reads Mouser through its official
Search API and Digi-Key through its Product Information API (distributor web
pages block automated fetches). Without `--supplier`, `lookup` and `search`
query both, so they need both key files and refuse, naming the missing one,
if either is absent; with only one supplier's key, pass `--supplier mouser`
or `--supplier digikey`. Keys live outside the repository and are never
printed or committed:

- Mouser: `~/.config/mouser/mouser-credentials.txt` - one line, the Search API
  key (from the API Hub in a Mouser account).
- Digi-Key: `~/.config/digikey/digikey-credentials.txt` - a YAML mapping of
  two keys, `clientID: <client id>` and `clientSecret: <client secret>` (an
  application on developer.digikey.com with the Product Information API,
  production environment; the tool uses OAuth2 client credentials, so the
  app's callback URL is never called).

Digi-Key lists one manufacturer part under several product numbers, one per
packaging (cut tape, tape and reel, Digi-Reel, bulk), each with its own price
breaks; `lookup` prints each as its own offer with a `packaging:` line, and
`source --supplier digikey` refuses until `--sku` names one. For a hobby
quantity choose the cut-tape (CT) or bulk number: tape and reel starts at a
full reel, and Digi-Reel carries a per-order reeling fee (shown in its
packaging line). A Marketplace listing (sold by a third party through
Digi-Key) names its seller in the same line. `source` refuses both a
Digi-Reel listing (naming the same product's cut-tape number to use instead)
and a Marketplace listing: a catalog source cannot record the fee or the
seller. `lookup` still shows them.

A Digi-Key `lookup` reads every page of Digi-Key's keyword search for the
part number. When the search finds more products than the tool pages through,
it refuses rather than return a list that might be missing exact matches;
name the Digi-Key product number with `source ... --sku` instead.

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
- **Pin header, `PinHeader_1x<n>_P2.54mm`:** an n-pin, 2.54 mm header. The
  fit check requires `specs.pins` to equal n exactly, so the entry is a part
  sold at exactly n positions (e.g. Samtec's `TSW-10<n>-07-G-S`; see
  Lessons), never a longer breakaway strip recorded as if it were n pins.
  The quantity is in parts, one per header on the board.

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
  extension, other Yageo passive reels and bags sold this way) carry no
  field saying which quantity is a bag and which a cut quantity - every
  break just looks like "buy N for $/each". Record every break as listed;
  stocking is decided by the board's `stockQuantity`, not by the listing.
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
- 2026-09-30 (resolved; kept for the record): `tools/suppliers/mouser.ts`
  now reads a null, absent or empty `AvailabilityInStock` as "stock not
  stated" and a listing with no price breaks as "price not listed", so the
  crash below no longer happens and no second keyword is needed to avoid it.
  As first reported: `bun run parts lookup|search|source` crashed (uncaught
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
- 2026-09-30 (revised by the operator's decision): an active device (bjt,
  diode, opamp, ic) fits a line by its device TYPE, not its order code.
  `tools/bom/fit.ts` compares the circuit's part number with the entry's
  `specs.type` (e.g. `"2N3904"`, with datasheet evidence like every spec);
  the entry's `mpn` is never compared, and is always the real order code.
  So onsemi's cheap, well-stocked bulk-bag `2N3904BU` (10000/bulk bag per
  its own datasheet's ordering table) is eligible for a 2N3904 line under
  its real mpn, with `specs.type: "2N3904"` - as are Diotec's and Rectron's
  parts sold under the bare order code `2N3904` (SKUs 637-2N3904,
  583-2N3904). An entry with no `specs.type` is reported as "type: not
  stated". Mouser's SKU 511-2N3904 (onsemi's literal bare part) was the
  crashing row above (since fixed: it now reads with its stock "not
  stated"; check it with `bun run parts lookup 2N3904` rather than assuming
  it is unavailable).
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
  copied in to satisfy a check. For active devices (bjt, diode, opamp, ic),
  where the type is the part's identity, `tools/bom/fit.ts` compares the
  circuit's part number with `specs.type`, never with `mpn` (see the 2N3904
  lesson above). On a passive, the circuit's part number (e.g. the
  trimmers' "RM-065") names the footprint family, which the physical checks
  cover, so a compatible substitute such as Piher's PT6KV-102A2020 carries
  its own mpn. If a check ever demands recording something untrue, stop and
  report it instead.
- 2026-09-30: A `PinHeader_1x<n>_P2.54mm_Vertical` line's fit check
  (`tools/bom/fit.ts`) requires `specs.pins` to equal `n` exactly, so one
  catalog entry cannot honestly cover two different position counts (e.g. a
  board's 2-pin and 3-pin header lines) even though "buy a breakaway strip
  and cut it to length" is the normal way to buy headers - the entry's
  `specs.pins` would have to misstate the strip's own as-sold length.
  Samtec's TSW series (Mouser's "2.54MM CLASSIC PCB HDR STRIP" /
  "Through-Hole .025\" Sq Post Header" family) sells the same 0.1"/2.54mm
  single-row header natively cut to every position count - `TSW-10<n>-07-G-S`
  for `n` positions, e.g. `TSW-102-07-G-S` (2 pin) and `TSW-103-07-G-S`
  (3 pin), both in stock and cheap (about $0.29-0.36 each in ones) - so a
  genuine exact-count part exists rather than needing one invented; this is
  the same family already used for this board's 3-position TO-92 socket
  (`socket-to92-3position-machined-2.54mm`, Samtec's machined-pin SS
  series). Mouser's own Search API data gives no pin-count/pitch parameter
  for these SKUs, but Samtec's own product pages
  (`samtec.com/products/tsw-10<n>-07-g-s`) state both directly and plainly
  ("2 Pin", "1 Row", "Pitch: .100\" (2.54 mm)") and are readable (unlike
  `mouser.com`-hosted PDFs or `suddendocs.samtec.com` PDFs, both blocked per
  the lesson above) - use the product page, not the datasheet PDF, for this
  family.
- 2026-09-30: Amazon product pages are not fetchable in this environment
  either, on top of the distributor sites this file already warns about -
  `curl`/`WebFetch` on an `amazon.com` product URL returns HTTP 200/500 with
  no product content, only Amazon's "Continue shopping" bot-check page
  (`/errors_page/validateCaptcha`). Per this repository's own rule ("Amazon
  ... only if you can actually read the listing; otherwise Mouser"), this
  means Amazon is effectively unavailable for every commodity accessory
  sourced so far (stripboard, hookup wire) and Mouser was used instead, even
  though the sourcing notes prefer Amazon for this class of part. Re-check
  periodically in case this changes; do not silently skip the "actually
  read it" requirement in the meantime.
- 2026-09-30: Mouser's hookup-wire catalog (Alpha Wire, Belden) is almost
  entirely industrial/mil-spec PTFE or heavy PVC spools - even a plain
  22 AWG solid PVC 100ft spool (Belden 8530-005100) lists around $125, and
  most 22 AWG solid options are $150-1500+ per spool (PTFE-insulated,
  600-1000V rated) - not a reasonable price for bench hookup wire. SparkFun's
  small assortment SKUs are carried by Mouser under their own SparkFun MPNs
  (e.g. `PRT-11367`, "Hook-Up Wire - Assortment (Solid Core, 22 AWG)", ~$25)
  and are a much better price match for a prototype build, confirmed genuine
  22 AWG solid-core wire from SparkFun's own product page
  (sparkfun.com/products/11367) - but note it is honestly six 25ft spools
  in one box (150ft total, six colors), not one continuous spool of a single
  color; record it as what it actually is rather than as "one spool."
- 2026-09-30: BusBoard Prototype Systems' own site (`busboard.com/<sku>`,
  e.g. `busboard.com/ST2`) states each stripboard's exact hole grid, pitch
  and track direction in plain text ("31 x 39 holes (31 strips)", "drilled
  on 0.1\" (2.54mm) centers", "Tracks run the length of the board") and is
  readable directly, unlike Mouser's hosted copy of the same datasheet PDF.
  Mouser also lists an unrelated part (a Molex Woodhead hose-stop kit)
  under the identical literal mpn "ST2" as BusBoard's board, which makes
  `bun run parts source ST2 --supplier mouser --use ...` refuse with
  "matched more than one listing" even though only one of the two is a
  stripboard - `search "ST2 BusBoard"` (a second keyword) resolves it to
  the one real candidate, the same fallback already noted above for
  2N3904, but the `source` verb itself has no way to take that extra
  keyword, so the `Source` object had to be built by hand from the `search`
  JSON output rather than printed by `source`. (Since resolved: `source ST2
  --supplier mouser --use <use> --sku <Mouser part number>` now picks the
  one listing, and refuses if that listing's mpn is not ST2.)
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
- 2026-09-30: For a 16mm panel pot, "solid shaft" and "knurled shaft" are
  genuinely different physical parts, not two names for the same thing -
  confirmed from three independent manufacturer catalogs (Taiwan Alpha's
  RV16AF "Metal Shaft Type" page draws separate K (knurled, 18-tooth),
  F (flatted) and R/R1 (plain cylindrical) shafts; Piher's PC-16 datasheet
  likewise lists separate metal/plastic "plain" (no code letter) and
  knurled shaft-code families; TT Electronics' P160 ordering guide has an
  explicit Shaft Type field with E=Slotted, F=Flatted, P=Plain, Q=Knurled
  as four distinct options). A genuinely solid/plain round shaft takes a
  set-screw knob with a round bore; a knurled or D/split shaft takes a
  push-on or clamp knob keyed to that texture - the two knob families are
  not interchangeable. Read the manufacturer's own shaft-type table rather
  than assuming a "16mm potentiometer" is one standard shaft.
- 2026-09-30: None of Alpha's RV16AF, Bourns's PDB18, or Piher's PC-16
  families had one single in-stock-at-Mouser SKU combination that was
  simultaneously: PCB-pin terminals, genuinely plain/solid (non-knurled)
  round shaft, and available at BOTH a 1k and a 25k linear value (this
  board's two panel-pot values) - Bourns PDB18's standard resistance table
  has no 25k value at all (jumps 20k to 50k); Piher's PC16SV vertical
  PCB-pin plain-shaft linear family stocks 25k but its only 1k SKU in that
  configuration was a 600-unit factory-order break (0 on-hand); Alpha's
  only in-stock PCB-pin plain-round-shaft (R1) SKU is a 100k right-angle
  part, not 1k or 25k. Alpha's RV16AF-10-15R1-B family (solder-lug
  terminals, R1 = plain round 6.35mm metal shaft, confirmed from Taiwan
  Alpha's own catalog PDF, downloaded directly via
  `taiwanalpha.com/downloads?target=products&id=94` - `taiwanalpha.com`'s
  product-listing pages are JS-rendered and not readable via a plain
  `curl`/static fetch, but the `WebFetch` tool's renderer found the
  catalog-PDF download link, `/downloads?target=products&id=<id>`, which
  itself is a direct, non-JS PDF fetch) was the one family that covered
  both values in stock with a genuinely solid shaft, at the cost of
  solder-lug rather than PCB-pin terminals - a reasonable trade for an
  off-board panel pot, which is wired to its on-board header by hand
  regardless of its own terminal style.
- 2026-09-30: TT Electronics/BI Technologies' P160 series (16mm panel
  potentiometer, "Model P160 Series" datasheet at
  `ttelectronics.com/TTElectronics/media/ProductFiles/Datasheet/P160.pdf` -
  readable directly, unlike Mouser's hosted copy of the same PDF) is
  heavily stocked at Mouser across nearly every standard value in its
  knurled-shaft ("Q") PC-pin style (P160KN-0QC15B<value>), but its plain-
  shaft ("P") variants do not turn up in Mouser's stock at all under any
  shaft-length/CCW-position code tried - useful as a knurled-shaft PC-pin
  panel pot family if a knurled shaft (push-on knob) is acceptable, but
  not a source for a genuinely solid/plain-shaft part.
- 2026-10-09: Digi-Key's product-details service refuses a part number that
  more than one manufacturer makes (2N3904: HTTP 404 "Duplicate Products
  found ... provide manufacturerId"), so `bun run parts lookup` reads
  Digi-Key's keyword search instead and keeps exact part-number matches -
  for 2N3904 that is several makers (Diotec, DComponents, Marketplace
  sellers; the first page of 5 products held 5 exact matches out of 53
  products found), each listing printed with its manufacturer. Choose by
  manufacturer as well as part number. Digi-Key's parameter lists use "-"
  for a parameter that does not apply; it is printed as Digi-Key states it.
- 2026-10-09 (fixed the same day; kept for the record): `bun run parts
  search|lookup --supplier digikey` used to crash ("ProductsCount is a
  undefined, not a finite number") whenever Digi-Key's keyword search found
  nothing - hit searching for Eagle Plastic Devices' knob (450-AA193 and
  "Eagle Plastic Devices" both 0-result) and Taiwan Alpha's panel pot
  (RV16AF-10-15R1-B1K-3CLA, "RV16AF", "Taiwan Alpha" all 0-result): Digi-Key
  does not carry either manufacturer at all. The cause: Digi-Key answers a
  search that finds nothing with empty `Products` and `ExactMatches` and no
  `ProductsCount` at all (recorded in
  `tests/fixtures/suppliers/digikey-keyword-no-results.json`). The tool now
  reads that as no results and prints `Digi-Key: no exact match for "..."`
  (exit 0), as it does for Mouser. A no-match on every keyword tried for a
  manufacturer means Digi-Key does not carry that manufacturer.
- 2026-10-09: Digi-Key sometimes drops a SparkFun catalog number's category
  prefix in its own "manufacturer part number" field - SparkFun's own
  product page states the part as "PRT-11367" (sparkfun.com/products/11367,
  "SKU: PRT-11367"), and Mouser lists it that way too, but Digi-Key's
  keyword search returns it as bare "11367" (same manufacturer, SparkFun
  Electronics; same description, "6 Spools, 25 ft each"; Digi-Key's own
  datasheet filename is literally "PRT-11367_Web.pdf"). Search the bare
  number (strip a "PRT-"/similar prefix) if the prefixed form finds nothing
  exact, and confirm it is the same product from the manufacturer,
  description and datasheet filename before using it.
- 2026-10-09: Digi-Key lists several of this board's parts (Nichicon
  UPJ1V220MDD 22uF cap, Samtec SS-103-T-2-N TO-92 socket) at 0 stock; one of
  the two (UPJ1V220MDD) also carries no price at that 0-stock listing, and
  `bun run parts source --supplier digikey` correctly refuses a SKU with no
  price ("Digi-Key lists no price for <sku>: choose another SKU or
  supplier") - that entry was left Mouser-only. A 0-stock listing that does
  still carry a price (SS-103-T-2-N, 1 break at $0.87) is not refused and
  was recorded as a source; 0 stock on a single listed break is not, by
  itself, a reason to skip a `standard` source - only a missing price is.
