The shared parts catalog: one `<id>.json` per part, reused by every board's
`bom.json`. `make bom` reads every `*.json` here and never writes this directory.
Entries are added by the part-researcher agent or by hand; `bun run parts refresh
[<id>...]` rewrites the Mouser and Digi-Key sources of existing
entries in place - their price breaks and `checked` date only, never which part
was chosen - in the same 2-space JSON format these files are kept in.

An entry's `mpn` is always the real order code (e.g. `2N3904BU`). An active
device (bjt, diode, opamp, ic) also states its device type as `specs.type`
(e.g. `2N3904`), with evidence; that, not the `mpn`, is what a line's part
number is matched against. `stock: true` marks a cheap commodity part
(resistors, small film and ceramic capacitors, headers): a prototype board
buys its `purchasing.stockQuantity` of it, rounded up to the next listed price
break - when that break's unit price is within `maxStockUnitPrice` and the
supplier's order stays within `maxStockOverage` (see the board's `bom.json`).

Format and rules: `docs/superpowers/specs/2026-09-30-bom-design.md` ("The shared
catalog"), validated by `tools/bom/catalog.ts`.
