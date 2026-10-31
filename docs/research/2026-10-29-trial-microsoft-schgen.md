# Hands-on trial: Microsoft SchGen's emitter, without its model

**What this is.** A hands-on trial of `github.com/microsoft/SchGen` (MIT),
restricted to the part of it this project might use: the **emitter** and its
**primitive vocabulary**. The model that generates circuits is out of scope. A
human (this writer) wrote the drawing program by hand and chose every position
and orientation, exactly as an agent in this repository would have to.

**The circuit is `pultec-low-boost`**, taken from the netlist this project's
own model exports. Nothing about the circuit was invented.

**Governance.** `EVALUATING-DRAWINGS.md` binds this document. Everything said
below about the rendered page is an **observation** — what is on the page and
where — and nothing is a verdict. The page is **unreviewed**. It is included
here so the owner can review it; no check in this document advances its status.

---

## The deliverable

A rendered schematic page of `pultec-low-boost`, produced by SchGen's emitter
from a hand-written program.

| artifact | path |
| --- | --- |
| page, PDF | `docs/research/2026-10-29-trial-microsoft-schgen/pultec-low-boost-schgen.pdf` |
| page, PNG (200 dpi) | `docs/research/2026-10-29-trial-microsoft-schgen/pultec-low-boost-schgen.png` |
| the `.kicad_sch` the emitter wrote | `.../pultec-low-boost-schgen.kicad_sch` |
| exported netlist | `.../pultec-low-boost-schgen.netlist.xml` |
| ERC report | `.../pultec-low-boost-schgen.erc.rpt` |
| the hand-written program | `.../pultec_low_boost.schgen.py` |
| the page as it renders with SchGen's own blank-sheet template | `.../pultec-low-boost-schgen-NIL-UUID-blank.png` |
| crops | `.../crop-connectors.png`, `crop-input-chain.png`, `crop-shaping-network.png`, `crop-pot-and-r1.png`, `crop-rotary-and-cap-bank.png` |

Working tree for the trial (not in the repo, not installed into it):
`…/scratchpad/schgen-trial/` — `SchGen/` (clone), `venv/`, `work/`.

**No symbol was substituted.** SW1 is the real `Switch:SW_Rotary_1x6_MP`, with
pins 1–6, common 7 and mounting lug MP. J1 and J2 are
`Connector_Generic:Conn_01x05`. Two deviations were needed to get there and
both are named in full below: a missing data file had to be reconstructed, and
a four-line defect in SchGen's pin extraction had to be patched. Neither
changes a coordinate.

---

## RAN vs READ

**RAN** (on this machine, Python 3.14.6 in a venv with `kicad-skip==0.2.5` and
`sexpdata==1.0.0`, KiCad 10.0.5):

- `git clone --depth 1 https://github.com/microsoft/SchGen.git`
- `init_project.py` on SchGen's own example `sch_examples/imu_L1.py`
- `init_project.py` on the hand-written `pultec_low_boost.py`, stock and patched
- a pin-geometry probe over every symbol the circuit needs
- a scan of all 223 installed KiCad symbol libraries for the pin-extraction defect
- `kicad-cli sch export pdf | netlist | erc`, `kicad-cli sch upgrade`
- `pdftoppm`, `magick` for rasterising, cropping and ink measurement
- a statement-reordering experiment on the drawing program

**READ, not run:** the training, dataset-construction and evaluation halves of
the repo; the fine-tuning pipeline; `modules/llm_interface.py`. None of it is
needed to drive the emitter.

---

## 1. The primitive vocabulary, confirmed from source

`config.py::prepare_context()` builds a system prompt that defines exactly five
functions. All five exist in `modules/kicad_sch_interface.py` with the
signatures the prompt states:

```
add_schematic_symbol(symbol_lib, symbol_name, pos_x, pos_y, reference, value, rotation, mirror)
get_pin_location(symbol_ref, pin_name)
add_label(label_pos, label_text, label_ref, label_type="input", text_orient="left")
connect_pins(sym_a, pin_a, sym_b, pin_b)
write_out_all_wires()
```

`schematic_generation/sch_examples/imu_L1.py` is a genuine worked example in
that format, and `config.py` embeds it in the prompt. The reported summary was
accurate.

**It is five of thirty-seven.** `modules/kicad_sch_interface.py` defines 37
module-level functions, and `from modules.kicad_sch_interface import *` puts
all of them in the program's namespace. The 32 undocumented ones include
`add_new_wire`, `add_auto_wire`, `draw_manhattan_wire`, `add_junction`,
`add_net_label`, `get_symbol_location`, `move_global_label` and
`set_schematic_filename`. **The trial used only the documented five**, because
the five are what the system is specified around.

### What an author may state

| | |
| --- | --- |
| **Position** | Absolute, in mm, in a Y-**up** frame whose origin is the bottom-left of the sheet. `kicad_sch_interface` applies `reY(y) = 210 - y` and snaps both axes to the 1.27 mm grid. The example's `center_x_1 + (-72)` style is ordinary Python arithmetic, not an API feature. |
| **Orientation** | `rotation` ∈ {0, 90, 180, 270} and `mirror` ∈ {None, "x", "y"}. Both work; measured below. |
| **Anchoring to a pin** | Only by **reading back**: `get_pin_location(ref, pin)` returns a placed pin's absolute coordinate. You cannot declare "put this 5 mm right of that pin" — you place the part, then read the pin, then use the number. |
| **Labels** | Absolute position plus `text_orient` ∈ left/right/top/bottom. `add_label` always makes a **global** label; net labels exist in the module but not in the vocabulary. |
| **Wire routing** | **Nothing.** `connect_pins` is the only connection verb and it takes no geometry. |

### What it decides for you

- **The route of every wire.** Collinear pins get one straight segment. Anything
  else is deferred to `write_out_all_wires()`, which draws a two-segment
  Manhattan L and picks the corner and bend direction itself
  (`draw_manhattan_wire`, `connect_bent_wires`).
- **Detours.** `add_auto_wire` compares each segment's bounding box against an
  accumulating `BOUNDING_BOX_DICT` of every symbol, label and wire placed so
  far. If the overlap in x plus the overlap in y exceeds **1.27 mm**, it
  silently substitutes a three-segment jog shifted by 1.27…6.35 mm. If no jog
  fits, it **falls back to a diagonal wire** (`allow_diagonal=True`).
  One detour fired in this trial, on RV1's wiper jumper.
- **Junctions.** Inserted automatically at L-corners and at collinear overlaps.
- **The symbol you asked for.** `best_symbol_name_from_lib_tree` fuzzy-matches
  the `symbol_name` against `modules/component_repository.json` with
  `SequenceMatcher` and accepts any score ≥ 0.5, so a name that is not in the
  index is silently replaced by the nearest one. Separately,
  `_resolve_symbol_lib` **overrides the `symbol_lib` you passed** with the first
  library in that index that contains the resolved name.
- **The unit.** `create_symbol_instance` hardcodes `('unit', '1')`. A dual
  op-amp's B section cannot be placed at all.
- **Property text placement.** `create_symbol_instance` adds the library's
  Reference/Value offsets to the symbol origin **without rotating them**, so a
  rotated part's two texts land where an unrotated one's would. Visible on the
  page, described in §6.

### Reference designators are regexes

`my_skip_lib/eeschema/schematic/symbol.py:80` resolves a reference with
`re.fullmatch(regex, …)` where the *regex* is the designator string you pass.
`#PWR1` is safe; a designator containing `+`, `*`, `(` or `?` would not be.

### Could an agent write and rewrite such a program mechanically?

**Placement: yes.** The program is a flat list of calls with literal absolute
coordinates and no control flow. It is trivially regenerable, and
`get_pin_location` makes it self-measuring — an agent can place, read the pins
back, and adjust.

**Routing: no.** There is no sentence in the vocabulary that says where a wire
goes. An agent that dislikes a route can only move the parts and re-run, and
then it is arguing with the auto-router rather than drawing.

**Order-dependence: mechanism present, not demonstrated here.** The detour logic
consults a dictionary that accumulates as statements execute, so in principle
reordering statements changes the drawing. **Tested**: moving the fourteen
ground `connect_pins` calls ahead of the six selector-to-capacitor calls
produced a **byte-identical set of 44 wire segments**. The hazard is latent in
this program, not shown.

---

## 2. Three things that do not run as shipped

### 2.1 `modules/component_repository.json` is missing, and nothing generates it

`add_schematic_symbol` calls `best_symbol_name_from_lib_tree`, which reads
`modules/component_repository.json` on its first call. **That file is not in the
repository** — `.gitignore` excludes `*.json` — and no code in the repository
produces it. SchGen's own shipped example fails on its first symbol:

```
File ".../modules/kicad_sch_interface.py", line 80, in _all_symbols_from_lib_tree
    data: Dict[str, Any] = json.loads(lib_tree_path.read_text(encoding="utf-8"))
FileNotFoundError: [Errno 2] No such file or directory:
  '.../SchGen/modules/component_repository.json'
```

**Reconstructed** (`work/build_repo.py`) in the shape the code expects —
`{level1: {level2: {symbol_lib: [symbol_name, …]}}}` — from the top-level
symbol names in the 223 installed `*.kicad_sym` libraries: **223 libraries,
22,784 symbols**, emitted in sorted filename order. SchGen's first-match rule
then resolves `C`, `R`, `R_Potentiometer` → `Device`; `SW_Rotary_1x6_MP` → `Switch`;
`Conn_01x05` → `Connector_Generic`; `GND` → `power`, which is what this circuit
wants.

### 2.2 `export/organized_fp.json` is missing, and its generator raises

`init_project.py`'s last step calls `get_fp()`, which reads
`export/organized_fp.json`. Also absent. Its generator cannot produce it:

```
File ".../modules/utils/kicad_scan_lib.py", line 552, in gather_footprints_by_lib
    sys.stdout.write(f"\rLib {lib_idx}/{total_libs}: {lib_name}         ")
NameError: name 'sys' is not defined. Did you forget to import 'sys'?
```

The schematic is already written when this fires, so it costs nothing for a
drawing. It means `init_project.py` always exits non-zero.

### 2.3 `init_project.py` mishandles a project name containing a path

`init_kicad_project` builds `Path.cwd()/project_name` then
`project_dir/f"{project_name}.kicad_sch"`, so `../work/imu_proj` becomes
`…/work/imu_proj/../work/imu_proj.kicad_sch` and raises `FileNotFoundError`.
Cosmetic; run it from the directory you want the project in.

---

## 3. The defect that blocks this circuit outright

`modules/utils/kicad_add_symbol.py:718`, in `extract_pins_from_symbol`:

```python
if isinstance(item, list) and len(item) > 2 and item[0] == 'symbol' and item[2][0] == 'pin':
```

It collects a unit sub-symbol's pin UUIDs **only when that unit's first child is
a pin**. A unit body that opens with a graphic yields zero pin entries in the
placed instance, and then `get_pin_location` dies:

```
File ".../modules/kicad_sch_interface.py", line 863, in get_pin_location
    elif pin_name in symbol.pin:
TypeError: argument of type 'NoneType' is not a container or iterable
```

`Device:R` survives because its graphics live in `R_0_1` and its pins in
`R_1_1`. `Switch:SW_Rotary_1x6_MP` does not: its `_1_1` opens with a
`polyline`. Neither does `Connector_Generic:Conn_01x05`: its `_1_1` opens with
a `rectangle`.

**Measured across the installed libraries** (`work/scan_wirable.py`):

| | addressable | not addressable |
| --- | ---: | ---: |
| all 223 libraries, 22,784 symbols | 7,959 | **14,825 (65.1 %)** |
| `Connector_Generic` | 0 | 334 |
| `Connector` | 131 | 270 |
| `Switch` | 28 | 51 |
| `Amplifier_Operational` | 120 | 307 |
| `Transistor_FET` | 116 | 492 |
| `Device` | 442 | 94 |
| `power` | 101 | 0 |

Every rotary switch in `Switch` is in the right-hand column. So is every symbol
in `Connector_Generic`. **Stock SchGen places all 33 symbols of this circuit and
then throws on the first `get_pin_location("J1", "1")`** — `work/runs/stock.log`.

**What was done about it.** The program applies a four-line monkey-patch, opt-in
via `SCHGEN_PATCH_PINS=1`, that replaces the `item[2][0] == 'pin'` guard with a
scan of every child of every unit sub-symbol. It touches nothing else and
changes no coordinate. It is in `pultec_low_boost.schgen.py` where a reader can
check it.

**The alternative was silent substitution and it was rejected.** The addressable
substitutes available are `Switch:SW_DIP_x04` (an 8-pin DIP switch — not a
rotary) and `Connector:DIN-5`. Drawing a DIP switch and calling it a 6-way
rotary would have invalidated the comparison this trial exists to make.

---

## 4. The page rendered blank, with exit code 0

`kicad-cli 10.0.5 sch export pdf` on the emitted file printed `Plotted to …`,
exited 0, wrote a 22 KB PDF — **and the PDF contains only the A4 frame and an
empty title block reading `File: untitled.kicad_sch`.** The netlist export
likewise succeeded and contained `<components/>` and `<nets/>`. ERC reported
`Found 0 violations`. **Three green results on an empty page.** The evidence is
`pultec-low-boost-schgen-NIL-UUID-blank.png`.

SchGen's own shipped `imu_L1.py` output renders the same way. SchGen's shipped
*pre-built* `sch_examples/imu.kicad_sch` (made on KiCad 8) renders fine under
KiCad 10.0.5, as does this repository's `circuits/pultec/pultec-mid-band.kicad_sch`
— both also declare `(version 20231120)`. So the file-format version is **not**
the problem, and KiCad 10 does read SchGen's declared version forward.

### The cause

`init_project.py::make_kicad_sch()` hardcodes the root sheet UUID as the **nil
UUID**:

```
(uuid "00000000-0000-0000-0000-000000000000")
```

Every symbol's instance path is then `/00000000-0000-0000-0000-000000000000`.
KiCad 10.0.5 resolves no symbol instance against a nil sheet path, so it draws
and netlists nothing — and says nothing.

**Bisected** (`work/diag_minimal.py`, `work/diag_render*.py`). One
`add_schematic_symbol` call is enough to reproduce. Replacing the nil UUID (in
the header and in the instance paths) with any non-nil UUID makes the symbol
draw and the netlist report it. Ruled out along the way, each tested
independently and in combination, each leaving the page blank: the unquoted
`(property Value …)` token SchGen emits where KiCad writes `(property "Value" …)`;
the vestigial empty `(symbol_instances)`; bumping `(version)` /
`(generator_version)`. `kicad-cli sch upgrade` **succeeds** on the nil-UUID file
and rewrites it to version 20260306 — and the upgraded file still renders blank,
which is what proves the problem is the path and not the grammar.

**Deviation taken.** `work/run_like_init_project.py` is `init_project.py`'s main
path with the template's nil UUID replaced by a real one and the `get_fp()` step
(§2.2) skipped. Nothing else differs.

**This is the finding most worth carrying out of the trial**, independent of
SchGen: a schematic toolchain can report success three different ways over a
page with nothing on it. `docs/schematic/false-greens.md` is the register for
this class.

---

## 5. Netlist comparison — all 14 nets match

`kicad-cli sch export netlist --format kicadxml`, compared by **pin set** rather
than by net name (`work/compare_netlist.py`):

```
components in drawing: 19
  C1 C2 C3 C4 C5 C6 J1 J2 R1 RV1 SI1 SI2 SI3 SI4 SI5 SI6 SI7 SI8 SW1

MATCH  0                14 pins, drawn as 'GND'
MATCH  Net-(C1-Pad2)    2 pins, same name
MATCH  Net-(C2-Pad2)    2 pins, same name
MATCH  Net-(C3-Pad2)    2 pins, same name
MATCH  Net-(C4-Pad2)    2 pins, same name
MATCH  Net-(C5-Pad2)    2 pins, same name
MATCH  Net-(C6-Pad2)    2 pins, same name
MATCH  Net-(SI1-Pad2)   2 pins, same name
MATCH  Net-(SI3-Pad2)   2 pins, same name
MATCH  Net-(SI4-Pad1)   3 pins, same name
MATCH  hi_boost_out     4 pins, same name
MATCH  in               3 pins, same name
MATCH  lo_boost_in      7 pins, same name
MATCH  out              3 pins, same name

NETS IN THE DRAWING WITH NO SPEC COUNTERPART:
  unconnected-(SW1-PadMP): ['SW1.MP']  (spec says this pin is on no net)
```

**Every net matches on its pin set, including the 14-pin ground and the 7-pin
`lo_boost_in`.** Thirteen of the fourteen also match on name. The one name
difference is ground: the spec calls it `0` (the SPICE convention this
project's exporter uses), the drawing calls it `GND` because the ground points
are drawn with `power:GND` symbols. Same 14 pins either way.

`SW1.MP` is on its own `unconnected-(SW1-PadMP)` net, which is what "on no net"
looks like after a round trip through KiCad.

All 18 values round-trip verbatim: `.33uF .22uF .12uF .068uF .047uF .033uF`,
`56K`, `47K`, `0R 47K .047uF 430R 0R 4.7K 0R 100K`.

### ERC: 4 messages

```
[pin_not_connected]  error    SW1 Pin MP           -- by design; the mechanical lug
[power_pin_not_driven] error  #PWR1 Pin 1          -- the usual missing PWR_FLAG, reported once for the net
[lib_symbol_mismatch] warning J1 [Conn_01x05]      -- cached lib_symbol differs from the library copy
[lib_symbol_mismatch] warning J2 [Conn_01x05]      -- same
```

The two `lib_symbol_mismatch` warnings are a property of what SchGen writes into
`lib_symbols`; they were not diagnosed further and are recorded here as
undiagnosed.

---

## 6. What is on the page

**Observations only.** The page is unreviewed.

**Extent.** Sheet A4 landscape, 297 × 210 mm. The placed anchor points (symbol
origins, wire endpoints, label attachment points) span x 33.0–228.6 mm and,
measuring upward from the bottom edge, y 77.9–184.6 mm. The sheet's lower-right
quadrant below y ≈ 110 mm and right of x ≈ 180 mm holds the title block and
nothing else; the strip right of x ≈ 250 mm is empty.

**Wires.** 44 segments: 30 horizontal, 14 vertical, **0 diagonal**. **0 interior
crossings** — no horizontal segment passes through the interior of a vertical
one anywhere on the page (`work/count_crossings.py`). 2 junction dots. 14 global
labels, 33 symbols.

**Blocks, left to right and top to bottom.**

*Input chain* (`crop-input-chain.png`), on one horizontal line near the top:
a hexagonal `in` flag, then SI1, then SI2, then a long horizontal run to SI7,
then an `out` flag. All four resistors are drawn horizontally, bodies as
upright red rectangles with the green wire entering and leaving on the
centreline. Below the node between the `in` flag and SI1, a vertical wire drops
to SI8, drawn vertically, and continues to a downward ground triangle. From
SI7's left pin a vertical wire drops to a `hi_boost_out` flag whose text is
rotated 90° and reads bottom-to-top.

*Shaping network* (`crop-shaping-network.png`), two lines below: a
`hi_boost_out` flag feeds SI5, then SI6, then a `lo_boost_in` flag. From the
node at SI5's right pin a vertical wire drops one line and turns right into
SI4, then runs to SI3 (drawn as two vertical bars, horizontal), then to a second
`lo_boost_in` flag. The vertical-to-horizontal turn is a bare right angle with
no junction dot.

*Connectors* (`crop-connectors.png`), at the left: J1 is a vertical yellow
rectangle with five pin stubs on its right, numbered 1–5 top to bottom, its
reference below the body and its value `5-pin` above it. Four hexagonal flags —
`in`, `hi_boost_out`, `lo_boost_in`, `out` — sit to the right of pins 1–4, each
on a short green wire. Pin 5's wire runs right and ends at a downward ground
triangle. **The `#PWR3` and `GND` texts of that ground symbol are printed across
the bodies of the `hi_boost_out`, `lo_boost_in` and `out` flags.** J2, below, is
a horizontal yellow rectangle with five pin stubs pointing down, numbered 1–5
left to right with the numbers rotated 90°; five vertical wires run down to five
ground triangles in a row. **The five `#PWR4`…`#PWR8` references are printed on
top of one another in one row, and the five `GND` values on top of one another
in the row below, both rows lying across the pin stubs and over the `J2`
reference.**

*Pot and series resistor* (`crop-pot-and-r1.png`), to the right: two
`lo_boost_in` flags with text rotated 90°, one above RV1 and one above R1. RV1
is a narrow vertical rectangle, pin 3 at top, pin 1 at bottom, pin 2 entering
from the left with an arrowhead. The wiper-to-top-end jumper is a green path
that leaves the wiper to the left, turns up and rejoins at the body's top-left
corner — it runs alongside the body outline and touches it. A green junction dot
sits on the wiper pin. This jumper is the one wire on the page the auto-router
rerouted: the log records
`Auto-routing wire from [203.2, 72.39] to [203.2, 76.2] due to overlap with
existing wires: {'R_Potentiometer - RV1': …}`. Below RV1 a wire runs down to a
ground triangle. R1 is a vertical rectangle with a straight wire from the flag
above it, through it, to an `out` flag below.

*Rotary and capacitor bank* (`crop-rotary-and-cap-bank.png`), lower left: SW1 is
a yellow rectangle containing a drawn rotary mechanism — pivot, moving contact
bar, curved arrow — with six contact circles on the right, numbered 1–6 outside
the body. Pin 7 enters from the left on a long horizontal wire to a
`lo_boost_in` flag. **`MP` is labelled at the lower left on a short stub with no
wire attached.** The reference `SW1` sits below the body; the value `6-way` is
printed to the right of the body **across the pin-1 number and the pin-1 wire**.
Six horizontal wires leave pins 1–6 and run right to C1…C6, which step down and
to the right in a staircase so that each wire is a single straight run. Each
capacitor's value sits above-left of its body and its reference below. **Each
capacitor's value text sits on the wire belonging to the capacitor above-left of
it, and each reference text sits on the wire below** — for example `.22uF` lies
on the pin-1 wire and `C1` lies on the pin-2 wire. From each capacitor a long
horizontal wire runs right to a ground symbol drawn as a right-pointing hollow
triangle; the triangles are in two columns. **The six `#PWRn` references and six
`GND` values are stacked above and to the left of their triangles and overlap
each other in two columns of six lines.**

**Reference and value text collide on every rotated two-terminal part.** On the
horizontal resistors the two texts land at the same height a couple of
millimetres apart and overprint: SI1 reads as `0R` and `SI1` superimposed, SI2
as `47K`+`SI2`, SI4 as `430R`+`SI4`, SI5, SI6, SI7 likewise; the vertical SI8
reads as `100K`+`SI8`, R1 as `56K`+`R1`, and RV1's `47K`+`RV1` lands on its
wiper pin and pin-2 number. The capacitors, rotated 270°, do **not** overprint —
their library offsets happen to separate along the rotated axis. This follows
from `create_symbol_instance` adding the library's text offsets without rotating
them (§1).

---

## 7. What this trial did not test

- Anything above the emitter: the model, the dataset, the fine-tuning, the
  self-correction loop in `generate.py`.
- Multi-unit symbols. `unit` is hardcoded to 1, so a dual op-amp's B section
  cannot be placed; no circuit here exercised it.
- Multi-sheet schematics. Everything is one root sheet.
- Footprints and PCB export (§2.2 blocks it).
- Whether the two `lib_symbol_mismatch` warnings matter.
- Whether the emitter's output is statement-order dependent in general — the
  one reorder tested changed nothing (§1).

---

## Owner's verdict, 2026-10-29

Shown the rendered page with no commentary and asked whether it worked well
enough to consider:

> *"it looks like kicad. Its worse than copperwhatsit."*

Recorded as the qualified reviewer's evaluation. This supersedes any description
of the page elsewhere in this document; nothing here is a quality judgement.
