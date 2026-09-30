# Build Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command per board (`make guide`, CLI verb `guide`) writes a printable build packet: layout images with designators and with values, a mirrored copper-side view, the schematic as a black-and-white PDF, and an HTML build guide with checklists in the operator's order of operations.

**Architecture:** The VeroRoute fork's `--dump-board` gains `GRID` and `PIN` lines (data only). This repository parses the dump, renders print-first SVGs, and assembles the guide. Nothing is drawn in the fork.

**Tech Stack:** TypeScript on Bun; the fork is C++/Qt with vitest tests; `kicad-cli` for the schematic PDF.

**Spec:** `docs/superpowers/specs/2026-09-29-build-guide-design.md` (approved). Its Decisions table binds this plan.

## Decisions (from the spec; binding)

- Our own renderer, not VeroRoute's images. Print-first: black on white, strips thin and light grey, parts, wires and labels solid black.
- Cuts are bold numbered ✕ marks; solder bridges bold numbered bars; numbers in reading order on the component side, kept in the mirrored view.
- Every part's leads are drawn from its body to its actual holes (stretched leads visible).
- A checkbox beside every part and every cut on the layout images.
- Rows lettered (A, B, C ...), columns numbered (1, 2, 3 ...); every position is written that way. Off-board connections labelled at the board edge; a header with name, size and a summary line; a legend. (Conventions borrowed from VeroDesigner; no code copied - it has no licence.)
- A mirrored copper-side view for cutting.
- The checklist follows the operator's order: ICs and transistors, resistors (with trim-pots), capacitors, wire links, wire-to-board junctions, solder bridges, cuts last.
- `guide/` is generated and gitignored.
- The command refuses a board whose cuts are unresolved.
- The fork change is data only.

## Global Constraints

- Imports are explicit relative paths with the `.ts` extension.
- No fallbacks, no mock data outside tests; every unhandled case throws an error that names the thing, the observed state and the fix.
- Never bypass typing: no `any`, no `as Type` casts, no `@ts-ignore`.
- Files stay under 300–500 lines; split by responsibility.
- `bun test` and `bun run typecheck` pass before every commit. Commit and push after each task. No AI attribution of any kind in commit messages or PR text.
- Never put `#` inside a Bash heredoc or multi-line quoted argument; write commit messages and PR bodies to files. Never use `sed` to write files.
- Work in this repository on branch `feature/transistor-preamp`. Fork work happens ONLY in a separate worktree (Task 1); never touch the operator's existing fork checkout at `/Users/orion/src/veroroute-perfboard` or its `feature/reconcile` branch.

---

### Task 1: The fork reports pins and grid size

**Where:** a new worktree of the fork: `git -C /Users/orion/src/veroroute-perfboard worktree add /Users/orion/src/veroroute-perfboard-dump-pins -b feature/dump-pins origin/main`.

- [ ] **Step 1: Test first.** Add `tests/dump-pins.test.ts` (vitest, in the style of `tests/cuts.test.ts` and `tests/wires.test.ts`, using `@/helpers/run`): import a fixture netlist (`two-pin-complete.net`, and a stretched-part fixture such as `cap-electro-600-stretch.net` or a `--stretch` of an imported part), `--dump-board` the result, and assert:
  - exactly one `GRID <rows> <cols>` line, with positive integers matching the board;
  - for every placed `PART`, one `PIN <ref> <pin> AT <row>,<col>` line per pin, pins named as the netlist names them, each position inside the grid and inside that part's footprint rectangle;
  - a stretched part's two `PIN` lines lie its declared span apart;
  - a floating part prints no `PIN` lines;
  - `WIRE` parts print no `PIN` lines (wires keep their existing `WIRE` line).
  Run the fork's tests; the new ones fail.
- [ ] **Step 2: Implement** in a new `Src/Headless_dump_pins.cpp` (with its declarations where `DumpWires` is declared), called from `PrintBoardDump` after `DumpComponents`:
  - `GRID`: `board.GetRows()`, `board.GetCols()`.
  - `PIN`: for each component, in the same order and skip rules as `DumpComponents` (`IsSkippedForDump`, and skip `COMP::WIRE`), if placed: walk its footprint rectangle (`GetRow()`..`GetRow()+GetCompRows()-1`, `GetCol()`..`GetCol()+GetCompCols()-1`, layer `GetLyr()`), and for each hole whose element has a slot for the component (`GetSlotFromCompId`) with a valid pin index (`GetSlotPinIndex`), print `PIN <name> <PinRef::FormatPinNumber(pinIndex)> AT <row>,<col>`, sorted by pin index.
  - Add both line kinds to the `--dump-board` grammar comment and the `--help` text, in the existing style. Add the new file to the build (the `.pro`).
- [ ] **Step 3:** Build the binary (as `make/veroroute.mk` / `tools/perfboard/acquire.ts` build it in this repository), run the fork's full test suite; all pass.
- [ ] **Step 4:** Commit, push the branch, and open a PR in `oletizi/veroroute-perfboard` against `main` (title "--dump-board reports each placed part's pin holes and the grid size"; body from a file). Do NOT merge it: merging is the operator's call.
- [ ] **Step 5: Adopt it here.** In this repository, advance `veroroute.pin` to the branch's commit (confirm `tools/perfboard/acquire.ts` can check out a commit that is on a pushed branch but not yet on `main`; if it cannot, report BLOCKED rather than working around it), rebuild with `bun run perfboard veroroute`, and confirm `--dump-board` on `boards/transistor-preamp-staged/*.vrt` prints `GRID` and `PIN` lines. Run this repository's tests (`bun test`), including the perfboard tests, and `make -C boards/transistor-preamp-staged check`. Commit and push: "Pin the VeroRoute fork at the commit whose dump reports pins and grid size".

### Task 2: Parsing the dump

**Files:** create `tools/guide/dump.ts`; test `tests/guide/dump.test.ts`.

- [ ] Parse the `--dump-board` text into a typed `BoardDump`: `grid {rows, cols}`, `verticalStrips: boolean`, `parts[] {ref, type, value, placement (row, col) | "floating", span}`, `pins` (by ref: `{pin, row, col}[]`), `wires[] {name, ends: [{row, col}, {row, col}]}`, `nodes` (id → name), `cutState`, `cuts[] {a, b}` and `bridges[] {a, b}` as hole positions with node ids. Throw, naming the line kind and the fix (rebuild at the pinned commit), when `GRID` or `PIN` lines are absent while parts are placed.
- [ ] Provide `holeName(row, col): string` giving the lettered-row, numbered-column form (row 0 → `A`, 25 → `Z`, 26 → `AA`; column 0 → `1`), used everywhere a position is written.
- [ ] Tests on hand-written dump text: every line kind parsed; the refusal for a missing `GRID`/`PIN`; `holeName` at 0, 25, 26 and a column.
- [ ] `bun test && bun run typecheck`; commit and push.

### Task 3: The renderer

**Files:** create `tools/guide/render.ts` (split into `render-parts.ts` if it passes about 300 lines); test `tests/guide/render.test.ts`.

- [ ] `renderLayout(dump, labels, options): string` returning SVG, with `labels` a map from part ref to the text to print (designators or values), and `options.view` either `"component"` or `"copper"`. Everything on a 0.1-inch hole grid, scaled for print; the viewBox fits the board plus margins for the edge labels, header and legend.
- [ ] Drawing, per the spec's renderer section: lettered rows and numbered columns along the edges; strips as thin light-grey lines with small hole circles; cuts as bold ✕ between the two holes, numbered, each with a checkbox; solder bridges as bold bars, numbered; wires as black lines with end dots; parts as outlines by VeroRoute type at the centroid of their pins (axial resistor rectangle, electrolytic circle of its type's diameter with + at pin 1, TO-92 half-circle with pin 1 marked, trimmer/header/other a box around its pins with pin 1 marked), a lead line from body to every pin hole, the label on the body where it fits and beside it where not, and a checkbox beside every part; off-board connections labelled at the board edge (input, output, power and panel-pot headers, from the circuit's ports and connector/panel-pot parts passed in by the caller); a header with the board name, size, and a summary line; a legend.
- [ ] Numbering: cuts and bridges in reading order on the component side (row, then column), exported so the guide uses the same numbers. The copper view mirrors columns (horizontal strips) or rows (vertical), draws strips, cuts and bridges only (no parts), and keeps the numbers.
- [ ] Tests on a small hand-written dump (a resistor, a stretched electrolytic, a wire, two cuts, a bridge): a checkbox per part and per cut; cut numbers in reading order; each lead line ends on its pin hole; the copper view mirrors cut positions and omits parts; no colour other than black, white and the strip grey appears.
- [ ] `bun test && bun run typecheck`; commit and push.

### Task 4: The guide and the command

**Files:** create `tools/guide/guide.ts` (HTML) and `tools/guide/packet.ts` (writes the packet); modify `tools/cli/perfboard.ts` and `tools/cli/perfboard-binary-verbs.ts` (verb `guide`), `make/board.mk` (target `guide`, help line), `.gitignore` (`boards/*/guide/`); tests `tests/guide/guide.test.ts`, `tests/guide/packet.test.ts`.

- [ ] `buildGuideHtml(input): string`: the header (board name, date, the `.vrt` and schematic paths), the three images embedded, then the build checklist in the operator's order - ICs and transistors, resistors (with trim-pots), capacitors, wire links, wire-to-board junctions (headers, test points, panel-pot headers), solder bridges, cuts last - each item a printed checkbox, with designator, value and hole names for parts, hole names for wires and bridges, and number, holes and the two net names for cuts; then the power-up checks. Print CSS: US Letter, no backgrounds, page breaks between the images and the checklist.
- [ ] Part grouping by VeroRoute type and the circuit kind (transistors and ICs; resistors and potentiometers; capacitors; connectors and panel pots as junctions). A part that fits no group throws, naming it (no silent "other" bucket).
- [ ] Power-up checks: if the circuit module exports `powerUpChecks()`, render its rows (label, node, expected volts, a blank for the reading); if it does not, render a section saying the board declares none.
- [ ] `writeGuidePacket(declaration, deps)`: run `--dump-board`; refuse (throw, with the same explanation `make cuts` gives) when the cut state is unresolved; render the three SVGs; export the schematic with `kicad-cli sch export pdf --black-and-white`; write the HTML; all into `boards/<board>/guide/`, replacing what was there. Binary, kicad-cli and filesystem injected, as the other verbs do.
- [ ] Verb `guide` (board directory as context), `make guide` target, help text, `.gitignore`.
- [ ] Tests: the HTML lists every part, wire, bridge and cut from a hand-written dump, in the operator's order, each with a checkbox; an ungroupable part throws; the unresolved-cuts refusal fires; the no-power-up-checks section appears when none are exported; the packet writer writes all five files (with injected fakes).
- [ ] `bun test && bun run typecheck`; commit and push.

### Task 5: The staged board's packet

- [ ] Export `powerUpChecks()` from `circuits/transistor-preamp/staged-board.ts`: a 24 V supply, and expected DC voltages for Q1 base, emitter and collector, Q3 base, emitter and collector, Q2 base and emitter, and the transformer side of C5 (0 V), computed by the same operating-point simulation the staged tests use at `START`. Test it.
- [ ] Run `make -C boards/transistor-preamp-staged guide`; confirm the five files exist, the SVGs open, the cut count matches `make cuts`, and the checklist order is the operator's.
- [ ] Update `docs/transistor-preamp/README.md` and the repository `README.md` usage with the `guide` command. Set the spec's status to Implemented. Commit and push.
