---
title: Build guide - printable layout images, schematic and checklist from one command
date: 2026-09-29
status: Draft for operator review
---

# Build guide

## Purpose

Turn a finished stripboard layout into a printable build packet with one
command, designed for building on the bench rather than for doing layout.
Today the operator exports PNGs from the VeroRoute GUI by hand, and those
images serve the bench poorly:

- cuts are hard to see;
- a part with lengthened leads (an electrolytic stretched across holes) has no
  lead lines, so it is hard to tell where its leads go;
- the contrast between strips and parts has to be turned down by hand, or a
  black-and-white laser printout is unreadable.

The operator also ticks off parts and cuts by hand as the build goes; the
packet should carry those checkboxes itself, on the layout images.

## Decisions

Made with the operator; each binds the design and the implementation plan.

| Decision | By | Why |
|---|---|---|
| Draw our own layout images rather than export VeroRoute's | Operator, on the recommendation above | VeroRoute's rendering is right for layout work but causes the three problems above; exporting it faithfully would reproduce them |
| Print-first styling: black on white, strips thin and light, parts, wires and labels solid black | Operator | Readable from a black-and-white laser printer |
| Cuts drawn as bold, numbered marks; the numbers match the checklist | Operator | Cuts are currently hard to see |
| Every part's leads drawn as lines from its body to its actual holes | Operator | Stretched leads are currently invisible |
| A checkbox beside every part and every cut, on the layout images | Operator | The operator ticks them off by hand today |
| A mirrored copper-side view for cutting | Recommended, not contested | Cuts are made from the copper side; no mental mirroring |
| One command per board produces the whole packet | Operator | The request |
| The fork change is data only: `--dump-board` reports pin positions and the grid size; no drawing in the fork | Recommended, not contested | Our renderer needs to know where every lead lands; all drawing stays in this repository |

## What one command produces

`make guide` in a board's directory (the CLI verb `bun run perfboard guide`,
with the same directory-as-context rule as every other verb) writes
`boards/<board>/guide/`:

1. **`layout-designators.svg`** - component side, each part labelled with its
   designator (R1, C2, Q3 ...).
2. **`layout-values.svg`** - component side, each part labelled with its value
   (47k, 220uF, 2N3904 ...).
3. **`copper-side.svg`** - the board mirrored as seen from the copper side:
   strips, numbered cuts and numbered solder bridges only.
4. **`schematic.pdf`** - `kicad-cli sch export pdf --black-and-white` of the
   board's declared schematic.
5. **`guide.html`** - the build guide, embedding the three images, printable
   from a browser.

`guide/` is generated and is added to `.gitignore`: every file in it is
derived from the committed `.vrt`, schematic and circuit, and regenerates in
seconds. (Committing it would put a second copy of the layout in git that can
fall out of date.)

The command refuses, naming the fix, when the layout's cuts cannot be worked
out (the same unresolved-cuts check `make check` now applies): a build packet
must never show a board whose cuts are unknown.

## The fork change (data only)

In `oletizi/veroroute-perfboard`, `--dump-board` gains two line kinds, in the
style of its existing grammar:

- `GRID <rows> <cols>` - the board's size in holes.
- `PIN <ref> <pinNumber> AT <row>,<col>` - one line per pin of every placed
  part: the hole its lead goes through, with the pin number as the netlist
  names it. A floating (unplaced) part prints no PIN lines.

Wires already report their ends (`WIRE ... ENDS r,c,... r,c,...`) and are drawn
from those. The change is tested in the fork, merged there, and adopted here by
advancing `veroroute.pin`.

## The renderer (`tools/guide/`)

Pure TypeScript, reading the `--dump-board` text and the circuit's
`DESIGNATORS` and values; SVG out. Everything is drawn on the hole grid (0.1"
pitch, scaled for print).

- **Strips:** thin light-grey lines along each row (or column, for vertical
  strips), with holes as small circles.
- **Cuts:** a bold black ✕ across the strip between the two holes, with its
  number beside it and a checkbox.
- **Solder bridges:** a bold black bar joining the two holes, numbered.
- **Wires:** solid black lines between their ends, with round end dots.
- **Parts:** a simple outline by VeroRoute type, at the centroid of its pins,
  with a line from the body to each pin's hole:
  - axial resistor: a rectangle between its pins;
  - electrolytic: a circle of its type's diameter (`CAP_ELECTRO_300` is
    300 mil), marked + on pin 1;
  - TO-92: a half-circle with pin 1 marked;
  - trim-pot, header, test point, jumper: a box around the pins, pin 1 marked.

  When the pins span more than the body (stretched leads), the lead lines show
  exactly where each lead goes. Each part carries its label (designator or
  value, per image) and a checkbox.
- **Mirroring:** the copper-side view flips columns (horizontal strips) or
  rows (vertical), and relabels nothing but the cut and bridge numbers.
- **Numbering:** cuts and bridges are numbered in reading order (row, then
  column, on the component side), and keep their numbers in the mirrored view
  so the checklist and both images agree.
- **Page fit:** the SVG's viewBox fits the board with a margin; printing scales
  it to the page.

## The guide (`guide.html`)

One printable page (with print CSS: no backgrounds, page breaks between
sections), each checklist item with a printed checkbox:

1. Board name, date generated, the `.vrt` and schematic it came from.
2. The three images.
3. **Cuts:** number, position, the two nets it separates (from the dump's
   `NODE` names).
4. **Solder bridges:** number, the two holes.
5. **Wire links:** each wire's two holes.
6. **Parts, in a suggested build order:** wire links, resistors, low parts
   (headers, sockets, trim-pots), capacitors, transistors. Each with
   designator, value and the holes its leads go through.
7. **Power-up checks:** the nodes to measure with the model's expected DC
   voltages beside blank spaces for readings. A board provides these by
   exporting `powerUpChecks()` from its circuit module (supply voltage, and the
   nodes and expected voltages, computed by the same operating-point
   simulation its tests use). A board that exports none gets a section that
   says so, rather than an empty one; the staged board provides them as the
   first user.

## Verification

- **Renderer:** unit tests on a small hand-written dump (a resistor, a
  stretched electrolytic, a wire, two cuts, a bridge): the SVG has a checkbox
  per part and per cut, cut numbers in reading order, lead lines ending on the
  pin holes, and mirrored cut positions in the copper view.
- **Dump parsing:** `GRID` and `PIN` lines parsed, and a refusal naming the
  missing line when a dump lacks them (an unpinned, older fork).
- **Guide:** the HTML lists every cut, bridge, wire and part in the dump, each
  with a checkbox, and the unresolved-cuts refusal fires.
- **End to end:** `make guide` on the staged board produces all five files.
- The fork's own tests cover the new dump lines.

## Build order

1. Fork: `GRID` and `PIN` lines in `--dump-board`, with tests; merge; advance
   `veroroute.pin`.
2. Dump parsing and the renderer, with tests.
3. The guide page and the `guide` verb and make target; `.gitignore`.
4. `powerUpChecks()` for the staged board.
5. Run it on the staged board.

## Open questions for review

- Paper size: US Letter assumed for the print CSS.
- Build order in the parts checklist: the order above is a common
  convention; change it if the operator builds differently.
