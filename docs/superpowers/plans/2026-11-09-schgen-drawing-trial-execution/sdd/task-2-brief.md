### Task 2: The request generator, from the model only

**Files:**
- Modify: `lib/kicad/sheet-agreement.ts` (export `intendedSymbol`; no behaviour change)
- Create: `tools/schgen-drawing-trial/request.ts`
- Create: `tools/schgen-drawing-trial/boards.ts`
- Test: `tests/schgen-trial/request.test.ts`

**Interfaces:**
- Consumes: `modelForSheet(board): SheetModel` (`tests/circuits/sheet-model.ts`); `toImportedNetlist` (`lib/kicad/from-network.ts`); `intendedSymbol(component): string`; `sha256OfFile`, `draftedSheet` (`tests/circuits/drafted-sheet.ts`).
- Produces: `TRIAL_BOARDS: readonly string[]` and `approvedSheetDigest(board): string` (throws if the sheet's sha256 is not in `verdicts.md`) in `boards.ts`.
- Produces: `interface TrialRequest { board: string; text: string; symbols: string[]; netlist: { components: {designator: string; value: string; symbol: string}[]; nets: Record<string, string[]>; labels: Record<string, string> } }` and `buildRequest(board: string): TrialRequest` and `parseRequest(text: string): TrialRequest["netlist"]` in `request.ts`.
- Produces: CLI `bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR` writing `request.json` and `request.txt`.

Request text format, fixed for every board (three sections, in this order; one item per line; nothing else):
`PARTS:` lines `<designator> <value> <library:symbol>`; `NETS:` lines `<net>: <designator.pin> <designator.pin> ...` with pin names as the symbol numbers them; `LABELS:` lines `<label> -> <net>`. The ground net is named `GND`. Before writing the generator, read SchGen's published request examples (its dataset on Hugging Face or `sch_examples`) and record in the module comment how they state connectivity. If a mechanical convention of theirs can be followed, follow it and record that; if not, record the difference as a departure.

- [ ] **Step 1: Write the failing tests** in `request.test.ts`, one `for` over `TRIAL_BOARDS`:
  - `round trip`: `parseRequest(buildRequest(b).text)` deep-equals `buildRequest(b).netlist`, and every model pin appears in exactly one net.
  - `matches the model`: the netlist's net partition equals the partition from `toImportedNetlist(modelForSheet(b)...)`, with `0` renamed to `GND`.
  - `control`: moving one pin to another net in the text makes `matches the model` fail (assert the comparison reports a difference).
  - `no placement leak`: no `(at `-derived coordinate pair, no `rotation`/`mirror` token, and no UUID from the approved sheet appears in `text`.
  - `symbols`: `symbols` contains `power:GND`, contains no `copperhead_power:` entry and no `PWR_FLAG`.
  - `approval check`: `approvedSheetDigest` returns a digest found in `docs/schematic/verdicts.md`, and throws for a temp copy with one byte changed.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/request.test.ts` → expect FAIL (module missing).
- [ ] **Step 3: Implement** `boards.ts`, `request.ts`, the `intendedSymbol` export.
- [ ] **Step 4: Run** `bun test tests/schgen-trial/request.test.ts && bun run typecheck` → expect all pass.
- [ ] **Step 5: Commit.**

