# Hands-on trial: three KiCad-emitting / schematic-drawing packages

**Date:** 2026-10-28
**Circuit under test:** `pultec-low-boost` (19 parts, 14 nets), netlist exactly as
KiCad exports it from this project's model.
**Everything below was RUN.** Where a claim rests on reading source rather than
running it, it says so. Exact errors are quoted verbatim.

All three packages install cleanly from PyPI into Python 3.14.6 venvs. Nothing
was installed into the repository; the repository was not modified.

## The headline

| | circuitsmith 0.1.0 | akcli-kicad 0.22.0 | mege-circuits 0.1.1 |
| --- | --- | --- | --- |
| Installs | yes | yes | yes |
| Emits `.kicad_sch` | **no** | **yes** | **no** |
| Drew this circuit | **refused** | **yes** | partially |
| Can represent the 6-way rotary | **no** | **yes, exactly** | **no, not at all** |
| Round-trips to a netlist a check could fail on | netlist path only | **yes, exact** | own JSON only |
| Has a layout lint that can fail | no | **yes, 22 findings** | no |

**One tool of the three did the job: `akcli-kicad`.** It drew the circuit with
real KiCad symbols, including `Switch:SW_Rotary_1x6_MP` — a genuine 6-way
rotary with the MP lug, nothing faked — and `kicad-cli` re-exported a netlist
that matches the given spec pin-for-pin on all 14 nets.

## 1. circuitsmith 0.1.0 — REFUSED at the first resistor

`pip install circuitsmith` succeeds. Note what it does **not** install: there is
**no `circuitsmith` console script and no `entry_points.txt`.** It is a library.
The runnable entry point is `python -m circuitsmith.renderer`.

### It does not emit a KiCad schematic

The PyPI summary says *"Generate KiCad-compatible schematics from declarative
YAML."* The installed package contains **no `kicad` module and no `.kicad_sch`
writer** — `grep -ri kicad` over the package matches only `export/netlist_exporter.py`,
whose own docstring says it emits the **KiCad 7.x intermediate netlist**
(`(export (version "E"))`), the legacy *Update PCB from Netlist* import format.
Its dependencies are `schemdraw` + `matplotlib`. "KiCad-compatible" means a
netlist you can import, not a schematic.

### Shipped-package defect: `rules.json` is missing

The first run died before reaching the circuit:

```
FileNotFoundError: [Errno 2] No such file or directory:
  '.../site-packages/circuitsmith/knowledge/rules.json'
```

`knowledge/__init__.py` expects it next to itself. It is **absent from the wheel
AND from the sdist** (the sdist ships only `__init__.py` and
`validate_catalog.py` under `knowledge/`). So `--out-erc-report` is
unconditionally broken in 0.1.0 as published. Dropping the flag gets past it.

### The actual refusal

```
renderer aborted at kernel: kernel escalation (no-canonical-rule) on R1:
  resistor R1 matches no canonical rule
  (not paired with an LED, not on a recognised pull-up path)
```

This is not a bug, it is the design. `layout/kernel.py` dispatches on a **closed
set of canonical topology rules**, every one an Arduino-hookup shape:
`RULE_MCU_ANCHOR`, `RULE_LED_TO_GND`, `RULE_RESISTOR_WITH_LED`,
`RULE_PULLUP_RESISTOR`, `RULE_BUTTON_TO_GND`, `RULE_DECOUPLING_CAP`,
`RULE_I2C_SENSOR`, `RULE_HEADER_OR_JACK`. **A resistor that is neither an LED
ballast nor a pull-up raises `EscalationError`.** Every resistor in an audio
signal chain is a series or shunt element, so the circuit cannot be placed. With
`--no-ai` (the default, per its own ADR-0002) the escalation fails loud.

It writes an honest machine-readable refusal record, which is a genuinely good
property:

```yaml
layout:
  state: incomplete
  placed: 0
  total:  19
  escalations:
    - { category: no-canonical-rule, component: R1, ... }
```

### The catalog cannot express the circuit anyway

`load_profiles()` returns **20 profiles**: resistor, capacitor, LED, pushbutton,
piezo, 11 connectors, 2 MCUs, 2 I2C sensors. There is **no potentiometer, no
switch beyond a 2-pin pushbutton, no rotary, and no 5-pin header** (the catalog
has 2/3/4/6/8). The catalog is extensible only by dropping a `.py` file into the
installed package directory — `load_profiles()` is called with no argument at
both call sites, so the path is not configurable — and any new profile must
borrow one of the eight categories the kernel knows or it throws.

**What I faked, and what the tool then silently discarded.** To get as far as
the refusal I declared RV1 as `pin_header_3`, SW1 as `pin_header_8`, and J1/J2
as `pin_header_6`, carrying the truth in the `value` field (`"6-way rotary"`,
`"47K pot"`). **Those values were silently dropped** for all four connector
profiles — they appear as empty in both the netlist and the BOM CSV:

```
RV1,connectors/pin_header_3,,,,
SW1,connectors/pin_header_8,,,,
```

So the output gives no indication whatever that SW1 is a rotary. This is exactly
the silent-substitution hazard that invalidates comparisons.

### The data path is sound; the drawing path is a block diagram

Bypassing layout, the netlist path is clean: `validate` 0 findings, ERC 0
findings, **14 nets with every pin exactly as specified**. The data model is
fine.

The drawing is not. Its **success case** — the control circuit (ESP32 + LED +
ballast resistor) in the tool's native idiom, which renders `renderer ok` — is
this:

> `RENDERS/01-circuitsmith/circuitsmith-CONTROL-blinky.png`

Three **identical 32×32 white boxes** labelled U1, R1, D1 on one horizontal
line. No symbols, no pin stubs, no values, no net names. Despite depending on
`schemdraw`, `_emit_svg` writes plain `<rect>`s. All three components sit at
y=0, so the GND wire is drawn straight through the R1 and D1 boxes, collinear
with and invisible beneath the LED_DRIVE wire. **This is a block diagram, not a
schematic, and nobody could build from it.**

### What the YAML lets you decide

Worth recording, because the separation is the interesting part. `.circuit.yml`
carries **only topology** — components, types, values, and nets as `pins` /
`path` / `bus`+`backbone`+`taps`. **No geometry at all.** Placement lives in a
separate `.layout.yml` that the kernel *emits* and you may then edit:

- `region`: `mcu-center`, `left-column`, `right-column`, `top-row`,
  `bottom-row`, `free`, `path-of-<REF.PIN>`, `bus-<NET>`, `pin-symbol-<NET>`
- `row`, `col`, `position` (0..1), `step`, `attached-to`, `attach-step`
- `label`: `above` / `below` / `left` / `right`; `label-budget`
- `gx`, `gy` (only in `free`); `capacity-overrides`, `region-anchor-overrides`
- `topology-fingerprint` per placement, so CI can detect drift

**There is no orientation or mirror field.** The slot vocabulary is
MCU-centric, which is the same assumption the kernel encodes.

**Verdict: not usable here, and not close.** The refusal is excellent — precise,
loud, naming the rule that failed — but it refuses the entire problem domain.

## 2. akcli-kicad 0.22.0 — DREW IT, round-tripped exactly

A substantial tool: 30+ verbs (`draw`, `plan`, `check`, `render`, `export`,
`diff`, `verify`, `arrange`, `pins`, `bbox`, `undo`, `ops`, …). It edits real
`.kicad_sch` files through JSON op-lists.

### Every part maps to a real KiCad symbol — nothing faked

Because ops carry a `lib_id`, the question "can it draw a 6-way rotary" becomes
"does KiCad have the symbol", and it does:

| Part | Symbol | Fidelity |
| --- | --- | --- |
| SW1 6-way rotary | `Switch:SW_Rotary_1x6_MP` | **exact** — pins 1-6, 7, **MP** |
| RV1 47K pot | `Device:R_Potentiometer` | **exact** — pins 1, 2, 3 |
| J1, J2 5-pin | `Connector_Generic:Conn_01x05` | **exact** |
| C1-C6, SI3 | `Device:C` | exact |
| R1, SI1-SI8 | `Device:R` | exact |

**Nothing in this circuit was faked, substituted, or approximated.** The rotary
symbol even carries the MP mounting lug as a real pin, which is the thing this
repository has had to reason about separately (`G282`).

### The op vocabulary, and what the author must state

22 core ops + 11 macros. `place_component` takes `lib_id`, `designator`,
`x_mil`, `y_mil`, **`rotation`**, **`mirror`**, `unit`, `value`, `footprint`.
So the author states **absolute position and orientation** — far more control
than circuitsmith's slots, and correspondingly more work.

Three properties that make it mechanically drivable by an agent:

- **`akcli pins <lib_id> --at X Y --rotation R --json`** returns pin world
  coordinates as a **pure geometry query**, no file needed. Layout arithmetic is
  therefore computable up front rather than guessed.
- **`add_wire` accepts mixed pin-ref / point vertices**, multi-segment:
  `["C1.2", [cx, y], "SW1.1"]`. `add_net_label` and `place_gnd` accept a bare
  `"REF.PIN"`.
- **`plan` is a true dry-run** ("nothing written") and prints a **net diff** of
  every net it would create with member counts.

`connect_and_label` draws a wire plus **one** mid-wire label, and **refuses
non-axis-aligned endpoints** rather than drawing a diagonal:

```
from/to are not axis-aligned: [...] vs [...] mil
```

### Answering an open question in this repo: parenthesised net labels

`CLAUDE.md` records `Net-(C10-Pad1)` as *"a genuine unanswered question about
what KiCad accepts in a label."* **Measured answer: it is accepted, verbatim.**
`add_net_label` with `name: "Net-(C1-Pad2)"` was accepted by akcli, written to
the sheet, and `kicad-cli sch export netlist` returned `(name "/Net-(C1-Pad2)")`
— parentheses and hyphens intact, through a full write-and-re-export cycle.
Nothing in KiCad 10.0.5 objects to them.

### The iteration loop, measured

I generated the op-list with a Python script from the netlist (70 ops), computing
the cap-bank fan-in so that the **leftmost cap takes the bottom-most switch pin**
— which makes every horizontal run pass above every vertical drop to its left,
and the fan-in crossing-free by construction.

Then I looked at the rendered page and ran `akcli check --layout --erc`. **The
lint independently caught every defect I had found by eye, with coordinates and
a remedy, and five more I had missed.** Rewriting the generator against its
output:

| | Findings | What remained |
| --- | --- | --- |
| **v1** | **22** | 3 `LABEL_OVERLAP`, 7 `LABEL_OVER_SYMBOL`, 6 `POWER_ON_PIN`, 5 `LABEL_OVER_WIRE`, 1 dangling |
| **v2** | **13** | 3 + 3 + 6, power-on-pin all cleared |
| **v3** | **1** | **only** `ERC_DANGLING_NET` on `SW1.MP` |

**The single remaining finding is correct and expected** — the spec says SW1.MP
is a mechanical lug on no net, and KiCad names it `unconnected-(SW1-PadMP)`.

The remedies were specific enough to act on mechanically. Two examples, verbatim:

```
LAYOUT_POWER_ON_PIN  power symbol GND (#PWR08) anchored on J2 pin 1 tip
  (1700,3800) — its body renders over the part; rotate it so the body
  extends away from the pin, or anchor it mid-wire
LAYOUT_LABEL_OVER_WIRE  label 'Net-(C2-Pad2)' at (10000,3000) runs over the
  wire (10600,4650)-(10600,2900) it is not attached to
```

### The netlist round-trip — all 14 nets, exact

`kicad-cli sch export netlist` on the drawn sheet, compared to the given spec:

```
MATCH 0 (14 pins)          MATCH Net-(SI1-Pad2) (2)   MATCH in (3)
MATCH Net-(C1..C6-Pad2)    MATCH Net-(SI3-Pad2) (2)   MATCH lo_boost_in (7)
MATCH Net-(SI4-Pad1) (3)   MATCH hi_boost_out (4)     MATCH out (3)
+ unconnected-(SW1-PadMP)  <- correct: the lug is on no net
```

**Identical for v1, v2 and v3.** The rewrites changed geometry and changed
nothing electrical — which is exactly the property that makes an iterative
placement loop safe.

### Looking at the page

**v1** (`akcli-pultec-low-boost-v1.png`, zooms beside it): the rotary is
unmistakable — proper SP6T with the rotor arrow, six numbered contacts right,
pin 7 and MP left — and the fan-in is clean. But the facing-pin labels collapse
into illegible mush: `Nett-((SI11-PPad22))`, exactly the collision
`connect_and_label`'s own docstring calls *"the canonical fix for facing-pin
label collisions"* and which I had caused by using two `add_net_label` ops
instead. J2's five GND symbols at 100-mil pitch stack into an unreadable blob.

**v3** (`akcli-pultec-low-boost-v3-FINAL.png`): every net label reads cleanly
and clear of wires; J1 reads `in 1 / hi_boost_out 2 / lo_boost_in 3 / out 4`
down the connector; J2's grounds fan out on a staggered diagonal; the cap-bank
labels run vertically along their own drops; values (`0R`, `47K`, `430R`,
`4.7K`, `56K`, `100K`, `0.047uF`) are all legible.

**Would I build from it? For what it shows, yes.** Two honest defects remain
that the lint does not cover:

- **Cap value text is struck through by the ground wire.** `0.033uF` … `0.33uF`
  each have the GND drop running through the glyphs. akcli places the value at
  the symbol's default field offset and does not check it against wires. This is
  the same class as this repo's own `text-clearance` findings.
- **RV1 is cramped** — the rotated `lo_boost_in` label crowds the pot body.
- Sheet utilisation is poor (my layout, not the tool's): the drawing occupies
  the top-left of A3 and the bottom half is empty.

### File integrity against this repo's own generated sheet

`bun tools/schgen/board-sheets.ts` first (10 of 11 boards draw). Pointing akcli
at `build/schgen-boards/pultec-low-boost/low-boost.kicad_sch` **on a copy**:

**It reads the repo's sheet correctly** and recovers exactly the spec netlist,
including `SW1.MP` as a single-pin net — independent confirmation that this
repo's generator output is electrically right.

Then a one-op write (`add_text`) and a before/after comparison:

```
sha256 differs (expected - a text was added)
token families: 64 before, 64 after; 6 families changed
   at +1, effects +1, font +1, size +1, text +1, uuid +1
```

Exactly the six families one `(text …)` element requires, each `+1`. Nothing
else moved:

```
global_label  13 -> 13  SAME       wire       109 -> 109  SAME
symbol        39 -> 39  SAME       junction    14 ->  14  SAME
property     220 -> 220 SAME       pin         75 ->  75  SAME
NET NAME CHECK: PASS - all 15 net names survive unchanged
```

**This is the direct refutation of the failure mode the brief warned about** (a
popular library silently dropping every `global_label`). akcli's rewrite is
surgical. It also wrote a rotated backup to `.akcli/backups/` and a
`journal.jsonl`, and offers `akcli undo`.

### Costs

- **Slow.** `plan` / `draw` on a 70-op list takes **≈3 minutes**. Tolerable for
  a batch generator, painful for interactive iteration.
- Needs a `.kicad_pro` for a real project (`akcli project init`); it warns.
- The op-list is verbose — 73 ops for 19 parts — but it is **plain JSON emitted
  by a script**, which is the point.

**Verdict: the only one of the three that did the job, and it did it well.**

## 3. mege-circuits 0.1.1 — real symbols, unbuildable page, no rotary

11,350 lines, and **no reference to KiCad anywhere in the package.** It is a
`schemdraw` drawing DSL plus a stripboard planner with its own ERC and a JSON
netlist. The stripboard half is interesting for this repo's bench-build output
class; it was not exercised here.

### It cannot represent the rotary — stated explicitly

`ElementType` has **exactly seven members**: `WIRE`, `RESISTOR`, `FUSE`,
`CAPACITOR`, `PMOS`, `BJT_NPN`, `ZENER`.

**There is no switch of any kind, no potentiometer, no connector, no inductor,
no plain diode, and no element with more than three terminals.** The 6-way
rotary **cannot be drawn even approximately.** I did not substitute one. The six
capacitors each terminate on their own node named `SW1.<n> (NO SWITCH)`, and
SW1, its common pin 7 and its MP lug are simply absent. RV1 is drawn as a plain
resistor labelled `47K (POT - FAKED)` — the wiper is lost, and with it the fact
that RV1.2 and RV1.3 are strapped together. J1/J2 have no element and collapse
to labelled nodes.

**Its own ERC detects the hole**, which is to its credit:

```
ERC issues: 6
  warning single_terminal_net  Net 'c1_sel' has only one component terminal.
  ... (c2_sel .. c6_sel)
```

### Alignment-first placement

The genuinely interesting idea, and relevant to this repo's placement-intent
work: you state **relative constraints**, not coordinates.

```python
r1 = align(r1, vcc, Alignment.CENTER)
r1 = align(r1, vcc, Alignment.STACK_BOTTOM)
midpoint = align(midpoint, r1, Alignment.BOTTOM)
```

Vocabulary: `LEFT RIGHT TOP BOTTOM CENTER TOP_CENTER BOTTOM_CENTER LEFT_CENTER
RIGHT_CENTER STACK_LEFT STACK_RIGHT STACK_TOP STACK_BOTTOM`, with `axes=` and
`stack_gap=`. Elements are two-terminal with `start`/`end` bound to **node
objects**, so connectivity is node identity — clean and agent-writable.

### Looking at the page

`RENDERS/03-mege/mege-pultec-low-boost.png`. Symbols are **real** — proper
resistor zigzags and capacitor plates, values shown — which already beats
circuitsmith's boxes. But as a bench document it fails badly:

- **Elements land on top of each other.** SI1 and R1 are drawn at the *same
  position*, their texts overprinting into `SI1`/`5O6RK`; SI8 and SI3 likewise
  (`0.1047uKF`). My alignment chains anchored from the same node resolved to the
  same spot, and **the tool neither detected nor prevented the collision.**
- **All six `(NO SWITCH)` labels overprint** into one illegible run.
- **Wires dangle in mid-air** — SI5 and SI6 run off the bottom; the far ends are
  never routed back, so connectivity is not visually traceable.
- I cannot trace `lo_boost_in` to its seven members on the page.

The control (its own `voltage_divider.py`, 2 resistors) renders cleanly, so the
tool works at the scale it demonstrates. **It does not survive 19 parts**, and
there is no lint to tell you so — the contrast with akcli's 22-finding report is
the sharpest difference in this trial.

### Round-trip

`export_netlist` returns a **Python dict** (not a string — calling it as one
raises `TypeError: data must be str, not dict`), serialised here to JSON. It is
its own format: `{name, nets[], components{ref: {kind, value, terminals{}}}}`.
Fine for an internal check; **no KiCad interchange at all**, so it cannot feed
the netlist gate this repo already runs.

**Verdict: not usable for schematics here.** The alignment-constraint idea is
worth stealing; the implementation does not scale to this circuit and the
element vocabulary excludes most of what audio circuits are made of.

## What this changes

1. **`akcli-kicad` is worth a serious evaluation as a drawing back end.** It is
   the first tool in these surveys that took this circuit, drew it with correct
   symbols including the rotary, produced a page worth reading, and round-tripped
   to a netlist that a check could fail on. Its `check --layout` overlaps
   substantially with what `lib/schgen/` already does (`text-clearance`,
   fallback field placement) and its findings are of the same kind.
2. **Parenthesised, hyphenated, lower-case net labels are fine in KiCad 10.0.5.**
   Measured end-to-end. This closes the real half of the `G150` question.
3. **"Generates KiCad schematics" on a package page means nothing until run.**
   One of three claimants emits `.kicad_sch`. circuitsmith emits an import
   netlist and a box diagram; mege emits neither.
4. **A tool with no overlap lint cannot be iterated against.** The whole akcli
   result rests on `check --layout` giving a number that went 22 → 13 → 1.
   mege and circuitsmith offer no such number, so there is nothing to drive down.

## Reproducing

Everything lives under the session scratchpad
(`.../scratchpad/trial-emit/`), outside the repository:

- `venv-circuitsmith/`, `venv-akcli-kicad/`, `venv-mege-circuits/`
- `circuitsmith/pultec-low-boost.circuit.yml` — the YAML, fakes commented
- `akcli/gen_ops.py`, `gen_ops2.py`, `gen_ops3.py` — the op-list generators
- `akcli/roundtrip.py` — netlist comparison against the spec
- `akcli/integrity.py` — sha256 + token census + net-name survival
- `mege/pultec_low_boost.py` — the mege drawing, fakes documented in the header
- `RENDERS/` — every rendered page
