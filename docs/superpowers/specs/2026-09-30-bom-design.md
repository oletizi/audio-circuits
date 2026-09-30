---
title: Parts lists - committed BOMs with manufacturer part numbers and supplier links, kept in step with the circuit
date: 2026-09-30
status: Implemented
---

# Parts lists (BOM)

## Purpose

Finding the right part - the right footprint and rating, at a reasonable
price - is the painful step of every build. The answer, once found, is
currently lost: it lives in a browser tab or an order history. This design
makes each board's parts list a committed, reviewable record: every line
names the exact part chosen (manufacturer and part number), why it fits, and
where to buy it, and the list is kept in step with the circuit as the circuit
changes.

## Decisions

Made with the operator; each binds the design and the implementation plan.

| Decision | By | Why |
|---|---|---|
| The parts list, with manufacturer part numbers and supplier links, is committed to the repository and updated over time | Operator | So the research is not lost, and a list can be improved rather than redone |
| What a board needs is derived from the circuit on every run, never typed by hand | Designer, accepted | A hand-typed needs list falls out of step with the circuit |
| One shared parts catalog across boards: a part chosen once is reused by every board that needs it | Designer, accepted | The same 100k resistor should not be researched per board |
| One exact part per line, with several supplier links, each marked with its use | Operator | Mouser and Digi-Key for standard parts; Tayda for large orders (slow shipping); specialist shops (stomp box parts, Antique Electronic Supply) for pedal and valve-amp parts; Amazon for fast prototype orders of parts not subject to counterfeiting (hookup wire, headers) |
| Parts with no meaningful part number (hookup wire, header strip) are catalog entries with a description and links only | Designer, accepted | They are still bought and still need a link |
| A capacitor's required voltage rating is the smallest standard rating at or above 1.2 x the board's highest supply rail (24 V -> 35 V; 9 V -> 16 V) | Designer, accepted; the 1.2 margin made explicit during implementation, matching the 24 V -> 35 V example given the operator | At power-up a coupling capacitor can briefly see nearly the whole rail, and a part rated exactly at the rail has no headroom for supply tolerance |
| A resistor's required power is its operating-point dissipation times two, and never less than 1/4 W | Designer, accepted | Normal derating; 1/4 W is the smallest size the layouts assume |
| `make bom` reports differences and never changes a choice on its own | Designer, accepted | Choosing a part is a decision, made by a person or by the researcher on request |
| Parts are chosen in stages: first the researcher agent searching supplier sites, later a Mouser and Digi-Key search built into the tool (its own design) | Operator (option 3) | The file format settles before the search is automated |
| Research is done by one committed researcher agent, which reads and adds to committed sourcing notes | Operator | The expertise survives the end of any conversation |
| An axial part fits by its body size alone; lead spacing is not checked | Designer, during the first research pass | Axial leads are bent to the footprint's pitch on the bench, and no datasheet states a lead spacing; requiring one pushed the researcher to record a claim with no source |
| A panel pot is two purchases: the pot itself and the header on the board | Designer, accepted | The board's header labels hide the pot, which is the part that actually needs choosing |
| Default panel pot: 16 mm body, solid shaft, board (PCB) pins | Operator | The operator's standard; recorded in the sourcing notes as the researcher's default |
| Buy quantities depend on the board's maturity: a prototype board suggests stocking quantities of the cheap commodity parts (see the stocking-quantity row below) (to amortise shipping) and the needed quantity of the rest; a production run suggests boards x need, moved up to a larger price break whenever that costs less in total | Operator | That is how the operator buys |
| Both modes add a shrinkage margin, rounded up so every line has at least one spare | Operator | "Nothing worse than losing or breaking a part and having no extras" |
| A price is out of date after 45 days | Operator | Tariffs make prices move quickly |
| Prototype stocking is by a per-board stocking quantity, not by "pack" price breaks: a `stock` part is bought at the smallest listed price break at or above the larger of the covered quantity and `stockQuantity` (the staged board: 100). The `pack` mark on price breaks is removed | Operator ("yes. start at 100"), on the final review (Important 2) | Suppliers' search services never say which quantities are packs, so the pack rule never took effect and every cheap part was bought at need |
| For an active device (bjt, diode, opamp, ic) the circuit's part number is compared with the entry's `specs.type` (the device type, with datasheet evidence), and the entry's `mpn` is always the real order code | Operator, on the final review (Important 4) | Exact `mpn` equality ruled out real order codes such as 2N3904BU and would force a false mpn like "TL072" onto a TL072CP |
| An extra may opt out of the shrinkage margin with `"spares": false`; absent means the margin applies | Designer, final review (Minor 5), controller ruling | The margin bought a second 150 ft wire kit, about half the staged board's order; a spare stripboard is sensible, a spare wire kit is not |

## What is stored, and where

### What a board needs (derived, not stored)

Worked out from the board's circuit on each run. Components with identical
requirements share one line. Each line carries:

- a stable line key built from the requirement (kind, value, taper, footprint,
  and the model's part number where the circuit names one, e.g. 2N3904);
- the designators it covers and the quantity;
- the value (ohms, farads; taper for pots);
- physical constraints from the footprint, through an explicit table of known
  footprints (an unknown footprint throws, naming it and the table):
  - axial resistor `R_Axial_DIN0207_..._P10.16mm`: 0207 body (6.3 mm x
    2.5 mm), 10.16 mm lead spacing;
  - radial electrolytic `CP_Radial_D<d>mm_P<p>mm`: body diameter at most `d`,
    lead spacing `p`, polarised;
  - `TO-92_Inline`: TO-92 package, and the pin order the footprint assumes
    (emitter, base, collector for the 2N3904 as modelled);
  - `Potentiometer_Runtron_RM-065_Vertical`: RM-065 trimmer body and pinout;
  - `PinHeader_1x<n>_P2.54mm`: an n-pin 2.54 mm header;
- required ratings: capacitor voltage (the rule above), resistor power (the
  rule above);
- for a panel pot, a second line for the pot itself (value, taper), marked
  off-board.

Ratings need the board's supply rail and control settings. A board's circuit
module declares them by exporting `bomConditions()`, returning the simulation
environment, the control state and a one-line description of both. The
staged board builds it from its existing shared environment and `START`. A
board whose module does not export it is refused, naming the export to add;
no voltage is assumed. Resistor power is computed at those control settings
only, and the report says so.

### The shared catalog: `parts/<id>.json`

One file per part, so every change is a small, readable diff. An entry holds:

- `id` (the file name), `kind`, a plain description;
- `manufacturer` and `mpn` (absent only for commodity parts such as wire);
  the `mpn` is always the real order code the part is sold under;
- `specs`: value, tolerance, voltage or power rating, lead spacing, body size,
  package, taper, and for an active device its `type` (e.g. 2N3904, TL072) -
  whatever applies to its kind;
- `evidence`: for each spec, the datasheet or supplier page it was read from
  (URL and what it confirmed). A spec with no evidence is not allowed;
- `why`: why this part was chosen over the alternatives;
- `stock`: whether this is a cheap commodity part worth stocking when
  prototyping (resistors, small film and ceramic capacitors, headers), set by
  the researcher per the sourcing notes;
- `sources`: supplier, URL, supplier's part number, currency, price breaks
  (quantity and unit price at each, as the supplier lists them), the date the
  prices were checked, and the use (`standard`, `bulk`, `specialty`,
  `prototype-fast`).

### Each board's choices: `boards/<board>/bom.json`

- `lines`: line key -> catalog id;
- `extras`: parts the circuit does not know about - transistor sockets, the
  stripboard, hookup wire, knobs - each a catalog id, a quantity and a reason,
  and optionally `"spares": false`. Absent, `spares` is true: the documented
  default, the same shrinkage margin every line gets. `false` buys the
  extra's quantity x boards with no margin, for an extra where a spare is not
  worth buying (a 150 ft six-spool wire kit). Any value other than a boolean
  is refused;
- `purchasing`: required, with a shrinkage margin in both modes (a fraction
  greater than zero). The quantity to cover is need x boards x (1 +
  shrinkage), rounded up - so any line gets at least one spare, however small
  its need. Then:
  - `{ "mode": "prototype", "shrinkage": <fraction>, "stockQuantity": <n> }`
    (one board) - for a `stock` part, the target is the larger of that
    quantity and `stockQuantity` (a positive integer, required in this mode),
    and the suggestion is the smallest listed price break at or above the
    target, or the target itself at the largest break's price when every
    break is smaller; for any other part, that quantity;
  - `{ "mode": "run", "boards": <n>, "shrinkage": <fraction> }` - that
    quantity, moved up to a larger price break whenever the larger quantity
    costs less in total.

### The shopping list: `boards/<board>/BOM.md` (generated, committed)

A table per section (on the board, off the board, extras): designators,
needed quantity, suggested buy quantity (per `purchasing`), description,
manufacturer and part number, a link per supplier with its use, unit and line
price at the suggested quantity, and a total per supplier. Committed so it can
be read on GitHub from a phone while ordering.

## The command

`make bom` in a board directory (CLI verb `bom`, the same
directory-as-context rule as every other verb):

1. Derives what the board needs.
2. Compares it with `bom.json` and the catalog, and reports:
   - lines with nothing chosen yet;
   - choices whose line the circuit no longer has;
   - chosen parts that no longer meet their line (value, rating, lead
     spacing, body size, package), naming the field;
   - prices whose check date is older than 45 days.
3. Rewrites `BOM.md`.

It exits non-zero when any line is unchosen or unmet, so an incomplete list
is visible. It never edits `bom.json` or the catalog.

`make check` also fails when a board with a `bom.json` has a stale `BOM.md`
or a chosen part that no longer meets its line, so the list cannot quietly
fall behind the circuit. Boards without `bom.json` are unaffected.

## The researcher agent

`.claude/agents/part-researcher.md`, committed: the one way parts are
researched, whichever session calls it. Its instructions:

- Read `docs/parts/sourcing-notes.md` first; the operator's rules there win.
- Work one line at a time, from the requirement `make bom` reports.
- Every spec written into a catalog entry comes from a datasheet or supplier
  page actually read, recorded in `evidence`; never from memory. A spec it
  cannot confirm is left out and reported, not guessed.
- Match the footprint: lead spacing, body size, package, and pin order (a
  TO-92 part's pinout must match the footprint's).
- Apply the rating rules; prefer a reasonable price at the operator's
  suppliers, per their use (above).
- Reuse an existing catalog entry when one meets the line.
- Write its result: the catalog entry and the board's `bom.json` choice, for
  the operator to review as a diff.
- Add anything general it learns to the sourcing notes.

`docs/parts/sourcing-notes.md`, committed: the growing know-how - supplier
quirks, which part families fit which footprints, the operator's preferences.
Seeded with the supplier preferences in the Decisions table. The operator
edits it too.

## Verification

- Unit tests: deriving lines (grouping, keys, footprint table, unknown
  footprint refused, panel pot split); the rating rules; the comparison
  report (unchosen, removed, unmet by field, stale price); buy quantities in
  both purchasing modes (stocking quantity; shrinkage then a cheaper larger price
  break); catalog entry
  validation (evidence required per spec); `BOM.md` rendering.
- `bomConditions()` missing is refused with the export named.
- End to end: the staged board's list filled by the researcher agent as the
  first worked example; `make bom` passes on it and `BOM.md` is committed.

## Build order

1. Deriving needs: footprint table, rating rules, `bomConditions()` on the
   staged board.
2. Catalog and `bom.json` formats with validation; the comparison report;
   `BOM.md`; the `bom` verb, `make bom`, and the `make check` hook.
3. The researcher agent definition and seeded sourcing notes.
4. Fill the staged board's list with the researcher; commit catalog entries,
   `bom.json` and `BOM.md`.

## Not in this design

- The Mouser and Digi-Key search tool (its own design, after this format has
  been used).
- Combining several boards into one order, and tracking parts already on hand.
- Putting a list into a supplier's cart.

## Resolved on review

- Panel pots: 16 mm, solid shaft, board pins (Decisions table).
- Buy quantities: by board maturity, `purchasing` in `bom.json` (Decisions
  table), with a shrinkage margin in both modes. The staged board is a
  prototype.
- Price staleness: 45 days.
