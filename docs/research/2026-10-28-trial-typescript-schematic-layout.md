# Hands-on trial: four TypeScript schematic layout/render packages

**Date:** 2026-10-28
**Circuit:** `pultec-low-boost` — 19 parts, 14 nets, one 6-way rotary selector, one
mechanical mounting lug on no net.
**Method:** every package was installed, driven from code, rendered, rasterised
and **looked at**. Nothing below is from a README unless it says so.

> **Scope note.** This trial measures *drawing* capability only. It says nothing
> about whether any of these should enter this repository, and it is not a
> recommendation. It is the evidence a recommendation would have to argue from.

## Verdict in one table

| | `@wire-lang/core` | `@tscircuit/*` | `@schemd/core` | `@veriflow/schematic-core` |
| --- | --- | --- | --- | --- |
| Installs as published | **yes** | **NO** (see below) | yes | yes |
| Real runtime deps | **0** | **5 undeclared** (→ 65 pkgs) | **0** | 1 |
| Licence | MIT (file shipped) | MIT file, **`license` field absent** | MIT (file shipped) | MIT field, **no LICENSE file** |
| Draws component symbols | **yes, good** | **no** (ships none) | **yes, good** | **no** — every part is a rectangle |
| Places parts automatically | yes (one row) | **yes, well** | no — author states `at (x,y)` | yes (columns) |
| Routes wires | yes | yes | yes | yes, cleanly |
| Crossing vs junction distinguishable | **yes — hop arcs + dots** | **no primitive at all** | dots only | dots only |
| Fails loudly when it cannot do the job | **yes, explicitly** | **NO — silent** | **yes, best-in-class** | n/a (nothing failed) |
| Drawing reads back into connectivity | yes (layout model + SVG attrs) | yes (output JSON) | **yes — SVG round-trips to source** | yes (render model) |
| Can represent the 6-way rotary | **no** | **no** | **no** | **no** |
| Buildable bench page for this circuit | no | no | **closest** | no |

**No tool in this trial can draw a 6-way rotary switch.** All four were given an
8-pin box and told it was a rotary. Every claim below is about a drawing with a
box where the rotary should be, and that substitution is named everywhere it
matters rather than quietly absorbed.

---

## 1. `@wire-lang/core` 0.4.0

MIT, **genuinely zero dependencies**, 5 releases since 2026-06-18, last
2026-09-07, one maintainer. Parser, compiler, layout engine and SVG renderer in
one package — the only candidate here that is a complete path from text to a
drawn sheet with no code of ours in between.

**RAN.** `pultec-low-boost.wire` → `compile()` → `layout()` → `serializeSvg()`.
Clean compile: 19 components, 14 nets, 14 of 14 drawn as wires, **zero
degraded to labels**.

### What the author states, what the tool decides

The author states parts, values and nets. The tool decides **everything
positional** — the author cannot place anything. That is the headline limitation
and it is the reason the sheet is unusable.

The language is small and completely mechanical to generate and regenerate:
`component <id> <Type> <prop>=<value>`, `net <name>: <refs>`, `no-connect <ref>`.
26 built-in component types, 28 symbols, plus `define component` for a local
type mapped onto an existing symbol. Nets are implied by pin references, exactly
like this repository's own model.

### The layout is the problem

`layout=flow` (default) puts all 19 parts in **one row, 2476 × 476 units** — a
5:1 strip — and routes every net as a long orthogonal detour above and below it.
`layout=bus-rail` is materially better: it recognises `GND` as a rail, drops the
six caps onto a labelled ground bus, and draws proper hop arcs where wires cross.
It is still one row, 3000 units wide.

**Grouping — the one feature that would fix this — is not implemented, and the
tool says so out loud:**

```
[warning] group.not-yet-honored: Group "CapBank" is accepted but the bundled
          renderer does not lay groups out yet.
[warning] render.not-yet-honored: Render hint "side" is accepted but the bundled
          renderer does not position by it yet.
```

This is the opposite of the failure mode this project rejected tscircuit for in
Sept 2026. `wire-lang` accepts the hint, records it on the model, and then warns
that the renderer ignores it. The source comment is explicit: *"Keeps authors
from assuming a silent no-op worked."* It is the single most encouraging thing
found in this trial, and it is worth more than the drawing quality.

### Looking at it

Symbol and label quality is **excellent** — crisp capacitor plates, resistor
zigzags, a correct potentiometer wiper arrow, values set above each designator
and completely clear of wires. Crossings are drawn as semicircular hops and
junctions as filled dots, so the two are never confusable. The `no-connect` X on
`SW1.MP` is drawn correctly.

Defects seen in the image, not inferred:
- **Label collision inside the IC box**: `SEL6` and `MP` are superimposed and
  both unreadable.
- `SW1` is an 8-pin IC box. Nothing marks it as a switch; it reads as a logic
  part.
- The one-row placement means tracing any net requires following a wire across
  the full 2476-unit width.

### Readback: the check has teeth

The layout model carries exact terminal coordinates and per-net segment
geometry; the SVG carries `data-wire-net`, `data-wire-id` and `data-wire-symbol`.
A geometric readback was written that ignores the stated netlist entirely and
rebuilds connectivity from **drawn geometry only** — terminal points, segment
polylines, and junction dots, honouring the convention that a T-junction needs a
dot.

```
derived nets (from geometry): 15
expected nets (from source) : 15
READBACK OK: drawn geometry reproduces the stated netlist exactly.
```

**Mutation test** — nudge one terminal 3 units and re-run:

```
EXPECTED BUT NOT DRAWN (1):  C3.2 SW1.SEL3
DRAWN BUT NOT EXPECTED (2):  C3.2 / SW1.SEL3
EXIT=1
```

The check fails, and names the net and both pins. This is a real falsifiable
gate on the drawn artifact.

### Measured gaps

- `parseQuantity(".33uF")` returns **null**. Leading-decimal values — exactly how
  this project's netlist writes capacitors — are not parsed. `0.33uF` and `330nF`
  both work.
- `56K` parses with `dimension: "unknown"`; only `56kohm` / `430R` / `0R` are
  recognised as resistance.
- `SI*` and `SW1` designators raise `component.unusual-designator` warnings
  (9 of them). Harmless, but noisy against this repository's naming.

---

## 2. `@tscircuit/schematic-trace-solver` 0.0.214 + `@tscircuit/matchpack` 0.0.100

### These packages do not install as published

The "0 dependencies" report is a **packaging defect, not a feature**. Both
declare `dependencies: undefined` (only a `typescript` peer), and both bundles
import bare packages at module load. Exact errors:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'graphics-debug'
  imported from node_modules/@tscircuit/matchpack/dist/index.js

Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@tscircuit/math-utils'
  imported from node_modules/@tscircuit/schematic-trace-solver/dist/index.js
```

Bare imports found in the shipped bundles:

- matchpack — `@tscircuit/math-utils`, `calculate-packing`, `graphics-debug`,
  `transformation-matrix`
- trace-solver — `@tscircuit/math-utils`, `calculate-elbow`, `connectivity-map`,
  `flatbush`, `graphics-debug`, `@tscircuit/math-utils/line-intersections`

The problem is transitive: installing those surfaced a further missing
`@tscircuit/solver-utils` inside `calculate-packing`. **Five packages had to be
installed by hand, taking the tree from 7 to 65.** Neither package carries a
`license` field in `package.json`, though both ship an MIT LICENSE file.

### They are solvers, not renderers

Neither ships a single schematic symbol or any SVG writer. They consume chip
*rectangles* with pin coordinates and emit trace polylines and label anchors.
**Every symbol in the rendered page below is ours** — roughly 170 lines of
renderer written for this trial. That is the honest answer to "complete path from
description to drawing": there is no path; they are two stages of one.

### They ran, and they ran well

`matchpack` placed all 19 chips in 143 ms with **0 overlapping pairs** by its own
`checkForOverlaps`. The trace solver converged in 55 ms across a 28-stage
pipeline. No crashes, no hangs.

### The decisive question: loud or silent?

This project rejected tscircuit's main renderer in Sept 2026 because its wire
router **silently degraded a failed route into a net label**. The README for the
newer package states the opposite guarantee:

> *"When there's a direct connection between two pins, there is guaranteed to be
> a routed trace between them."*

13 of 14 nets were passed as `directConnections` — the guaranteed kind. Only
`GND` was passed as a `netConnection` (the label-based kind). Connectivity was
then rebuilt from the solver's own output, counting a net as whole only if drawn
traces join it. The MSP solver is entitled to re-span a net, so pair-level
checking would be unfair; this is measured electrically.

```
nets fully wired by traces: 5 / 14
nets left in pieces, relying on LABEL TEXT to be electrically whole: 9

labels on the net I ASKED to be labelled (GND): 6
labels on nets I asked to be ROUTED as traces   : 21
```

And the pipeline's own bookkeeping, at the same moment:

```
solved: true   failed: false   error: none
SchematicTraceLinesSolver.failedConnectionPairs: 0
UnroutedTraceRecoverySolver.solvedUnroutedTraces: 0
... all 25 sub-solvers: solved=true failed=false
```

**The answer is silent, and in one respect worse than before.** Nine nets were
left in disconnected islands held together only by matching text, and *no counter
anywhere in the pipeline records it*. `failedConnectionPairs` is zero because the
degradation does not happen at the routing stage — it happens at
`NetLabelPlacementSolver`, which treats placing a label as a **success**, not a
fallback. There is no flag, no count and no severity to assert against. A gate
built on this pipeline's own status would pass a drawing whose heart is not
wired.

Reading the recovery solver confirms the shape: `UnroutedTraceRecoverySolver._step`
silently `return`s for ground-net pairs and for pairs beyond
`maxMspPairDistance`, recording nothing.

In the rendered page this is unmistakable: **SW1 pins 1–4 each carry a red net
label (`Net-(C1-Pad2)` … `Net-(C4-Pad2)`) and the matching capacitors sit
elsewhere with the same text.** The cap-bank-to-rotary connection — the entire
point of this circuit — is drawn as text matching, not as wires. `J2` is left
completely disconnected at the bottom of the sheet.

### Where credit is due

Tested fairly against the solver's *own* label geometry (its `center`, `width`,
`height`), its label placement is good:

```
label-label overlapping pairs: 0
labels crossed by a trace: 3 of 27
```

`NetLabelNetLabelCollisionSolver` works. The visual text collisions in the saved
PNG are **our renderer's** designator/value text, not tscircuit's, and should not
be held against it.

One genuine drawing limitation: **21 trace/trace crossings, and the output model
has no crossing primitive at all** — no hop, no gap, no flag. A renderer
consuming this output cannot distinguish a crossing from a junction.

---

## 3. `@schemd/core` 1.3.1

MIT with LICENSE shipped, **genuinely zero runtime dependencies**, 26 releases
since 2026-07-16, last **2026-10-27 — the day before this trial**. The most
actively maintained package here. `engines` demands Node ≥ 24; it ran correctly
on Node 22 (noted, not relied on).

**RAN.** Final drawing: 33 components, 40 connections, `routing.attempts: 0`,
`rippedUp: 0`, zero diagnostics. **This produced the best page of the four.**

### What the author states, what the tool decides

The author states **positions** — `at (x, y)` or `right-of REF by 190`. The tool
decides **routing** only. This is the inverse of wire-lang and matchpack, and for
this project it is arguably the right split: the floorplan is the part a person
or a reviewing agent has an opinion about, and it is stated in text that an agent
can rewrite.

### Refusals that teach

The refusals are the best encountered in this trial. They name the part, the
exact violation, the line, **and a concrete remedy coordinate**:

```
G2 overlaps G1 by 14 units vertically; move G2 to y >= 194, or use a UML container.

G9 geometry exceeds the declared 1500x900 bounds: extends 24 above y=0;
   move G9 to y >= 64. Widen the fence bounds if the diagram needs the room.
```

`diagnoseSchematic` lists every problem at once with line and column, for an
editor to underline.

### Mechanical rewriting works — with one sharp caveat

An auto-fix loop was written that parses `move <id> to <axis> <op> <n>` out of
the diagnostic and edits that part's `at (x, y)`, with no human judgement
anywhere. It works. But on one floorplan it **oscillated forever** between two
individually-correct, jointly-unsatisfiable demands:

```
round 0: move G9 to y >= 64   (bounds)
round 1: move G9 to y <= 50   (overlap with SI2)
round 2: move G9 to y >= 64
...
```

No value of `y` satisfies both. This is precisely the CRITERION-versus-MECHANISM
distinction this repository already records: the *criterion* (stay in bounds,
do not overlap) is sound and checkable; the *mechanism* (move to `y >= 64`) is
advice from something that has not considered the other constraint. **An agent
driving this tool must solve globally and detect oscillation; following the
remedies one at a time does not converge.** An oscillation guard was added and
the floorplan fixed by hand.

### The drawing is unrepresentable in one respect, and says so

- **No rotary.** `SWITCH_TYPES` is `["spst","spdt","pushbutton","relay"]`. SW1 is
  an `ic` box labelled "6-way rotary" in text only.
- **A potentiometer has no wiper port.** `describeComponentPorts("resistor",
  {type:"potentiometer"})` returns `["in","out"]`. RV1 is a 3-terminal part and
  only 2 terminals can be wired. For this circuit RV1.2 and RV1.3 are tied, so
  it reduces to a rheostat — but **`RV1.3` is genuinely absent from the drawing**
  and the readback below reports it rather than hiding it.
- `connector` has only 2 ports, so 5-pin J1/J2 are `ic` boxes too.
- `ic` pin names must match `^[A-Za-z]`, so pins cannot be named `1`…`7`.

### Looking at it

Generous orthogonal routing, real ground-symbol triangles, correct resistor and
capacitor glyphs, a proper potentiometer arrow, hollow terminal circles distinct
from filled junction dots, and values legible and clear of wires. **The six caps
fan into SEL1–SEL6 in a clean ordered bundle — the heart of the circuit reads
correctly.** This is the only page of the four a person could plausibly work from.

The defect, confirmed by zooming in, is the one the README warns about —
*"text is measured for Arial and placed without regard to its neighbours"*:

- **The `ic` label is drawn twice** — once *inside* the box where it collides
  with and obliterates `COM`, and once below the box. Same for J1 and J2.
- `MP` is rotated 90° and cramped against `SEL6`.

### Readback is the best of the four

Two independent routes, both of which work:

1. `buildNetlist` on the compiled document — 33 nodes, 23 nets, 40 edges, with
   terminals as `{componentId, port}`.
2. **`parseSchematicSvg` reads the emitted SVG back into declarations.**
   `73 of 73` lines recovered; 33 components and 40 connections recovered.

And the decompiler **names what it cannot carry rather than guessing** —
the same discipline this repository asks of its own refusals:

```json
[{"code":"component-variant","detail":"Family options such as type= and variant= are not
  stamped on the markup ... A recovered resistor is a plain resistor even if it was
  declared as a thermistor."},
 {"code":"net-name","detail":"Wires carry the resolved net identity, not the author's
  net= name. Nets the parser inferred are indistinguishable from nets the author named."}]
```

**The check caught a real error.** A netlist comparison against the true pultec
netlist was written. It failed, and the failure was correct: **SI6 was wired
backwards** in the hand-authored floorplan. After correcting it, the *only*
remaining discrepancy is the one declared above:

```
EXPECTED BUT NOT DRAWN:  J1.3 R1.1 RV1.2 RV1.3 SI3.1 SI6.2 SW1.7
DRAWN BUT NOT EXPECTED:  J1.3 R1.1 RV1.2      SI3.1 SI6.2 SW1.7
```

13 of 14 nets reproduce exactly; `lo_boost_in` is short `RV1.3` because the tool
cannot represent a third terminal. That is a tool limitation surfaced by a check,
which is the correct outcome.

### Does it fail loudly when it cannot route?

Partly demonstrated. A shuffle-crossing stress (`n` parts per row, full reversal,
narrowing channel) routed **every** case up to n=20 with `attempts: 0` — the
channel lattice is stronger than expected, and congestion refusal was never
provoked. The refusals actually observed were all *geometry* (overlap, bounds),
and those are loud and exact. The README's claim that an unroutable document *"is
rejected with the wire that could not be placed"* was **not reached, so it is
unverified here** — recorded as untested rather than confirmed.

### Other measured defects

- **Every output mode returns an HTML `<figure>` fragment, never a standalone
  SVG file.** The `<svg>` element must be sliced out by the caller.
- **`mode: "full"` emits invalid XML.** It writes a bare `data-schematic`
  attribute; `rsvg-convert` and `xmllint` both refuse it:
  `Specification mandates value for attribute data-schematic`. Use
  `embedded-css` for a file.
- API misuse gives a raw `TypeError` from deep inside `netlist.js`, not a
  teaching refusal — `inspectSchematic` takes a parsed document, not a source
  string, and says so only by crashing.

---

## 4. `@veriflow/schematic-core` 1.5.0

MIT in `package.json` but **no LICENSE file is shipped**; no README either.
One dependency (`@veriflow/hdl-core`), 6 releases since 2026-08-14, last
2026-09-11. Description: *"Host-neutral schematic graph and layout core for
Vik-VeriFlow."*

**RAN.** `layoutSchematic` in 151 ms: 4 columns, 19 nodes, 14 networks **all
with geometry**, 22 junctions, 106 segments, zero truncated labels.

### It is not an analog schematic tool

This is a **digital HDL block-diagram** core, and the type surface says so
plainly: `GraphNodeKind` is `'port' | 'instance' | 'constant' | 'expression' |
'opaque' | 'generateArray'`; `PinDirection` is `'driver' | 'load' |
'bidirectional'`; pins carry a bus `WidthValue`; nets carry `protocol` and
`master`/`slave` interface roles; the graph is keyed by `fileUri`, `moduleKey`
and `moduleName` and carries `HdlDiagnostic`s.

Decisively:

```
SchematicNodeBodyShape = 'rectangle' | 'directional-port' | 'bidirectional-port'
node body shapes used: {"rectangle":19}
```

**Three body shapes exist and all are boxes.** There is no resistor, capacitor,
ground, polarity or wiper anywhere in the package, and `PinSide` is `'left' |
'right'` only. It also ships no renderer — `serializeSchematicRenderModel` hands
back geometry and the host draws it, so the SVG here is again ours.

### Looking at it

The routing is, in isolation, **the cleanest of the four**: orthogonal, four tidy
columns, correct junction dots, very few crossings, nothing overlapping, no text
truncated. On the wrong primitive. A 0.33 µF capacitor and a 6-way rotary switch
are drawn as **identical rectangles** distinguished only by their caption. There
is no ground reference on the page at all — GND is just a net threading between
boxes — and there is no concept of a no-connect, so `SW1.MP` is a pin with
nothing attached and nothing marking it deliberate.

An electronics person cannot read this as a circuit. It is a correct, well-drawn
block diagram of a netlist.

---

## What this trial establishes

1. **The rotary is unrepresentable in all four.** Any of these would need a
   symbol contributed upstream or a local symbol library before it could draw
   this circuit honestly.
2. **tscircuit's newer layout packages reproduce the exact failure this project
   rejected in Sept 2026, and hide it better.** Nine of fourteen nets degraded
   from wires to labels while every one of 25 sub-solvers reported success and
   `failedConnectionPairs` stayed at zero. There is no status to assert against.
   They also do not install as published.
3. **`@wire-lang/core` has the right instincts and the wrong maturity.** It warns
   explicitly that it is ignoring a hint — the behaviour this repository most
   wants — but grouping is unimplemented, so every sheet is one long row.
4. **`@schemd/core` produced the only page worth looking at twice**, has the best
   refusals, round-trips its own SVG back to source, and tells you what the
   markup cannot carry. Its costs are that the author owns the floorplan, its
   remedies can be mutually unsatisfiable, it has no rotary and no pot wiper, and
   it never emits a bare SVG file.
5. **Readback is achievable in all four** and in three of them a check was
   actually made to fail — on wire-lang by mutation, on schemd by catching a real
   wiring error of ours. That property is cheap to obtain and worth insisting on.

## Reproducing

Everything is under
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/trial/`
(scratchpad, not the repo; the repo's `package.json` and `bun.lock` were not
touched). Drivers: `run-wire.mjs`, `run-tscircuit.mjs`, `run-schemd.mjs`,
`run-veriflow.mjs`. Checks: `readback-wire.mjs`, `readback-tsc.mjs`,
`check-tsc-labels.mjs`, `readback-schemd.mjs`, `verify-schemd.mjs`,
`autofix-schemd.mjs`, `stress-schemd.mjs`. Shared circuit data: `circuit.mjs`.
