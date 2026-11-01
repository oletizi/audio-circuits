# Non-EDA drawing ecosystems as a route to bench schematics

Survey date 2026-10-28. The question: **is there a drawing ecosystem outside
KiCad that would produce better bench reference documents** — a page a person
reads while building the circuit by hand — given that an agent makes the
placement decisions and this project will not author layout algorithms.

Every claim below is marked **VERIFIED** (this writer ran it, or read the
primary source) or **RELAYED** (someone else's claim, not checked here).

The acid test used throughout is the one the brief named: a Pultec-style
low-frequency boost section with a **6-way rotary frequency selector driving a
capacitor bank**, plus a pot, an inductor and an op-amp output stage. Where a
tool could draw it, it was drawn, rendered, and **looked at**.

## The headline

**No non-EDA ecosystem solves placement.** That is the finding, and it is
uniform across every system surveyed, including the one the brief hoped would:
Penrose. The systems divide cleanly into two groups and neither group gives
this project what it wants:

- **Beautiful symbols, 100% authored placement** — **circuit_macros**,
  circuitikz, SchemDraw, Typst/`zap`. These draw superbly and will render
  whatever you tell them, including nonsense. **None has collision detection.**
  The agent does all the placing.
- **Automatic placement, non-idiomatic results** — Penrose, netlistsvg/ELK.
  These solve for coordinates, and the coordinates they find are *valid graph
  layouts* rather than *readable schematics*. Both failed the acid test, and
  both failed **silently**.

The second group's failure mode is the one that matters most here, and it is
documented with running code in section 3.

**Two findings worth promoting to the top:**

- **`circuit_macros` was not on the brief's list and produced the best
  schematic in the survey** — better than circuitikz, with the richest symbol
  set found anywhere and the only rotary switch that models make-before-break.
  LPPL, and its CTAN entry was updated the day of this survey. Section 5.
- **The KiCad baseline was measured rather than assumed, and it is better than
  expected.** In monochrome it is a good bench page, and it brings a title
  block with a **revision number** that *nothing else in this survey produces*.
  That finding corrected a draft of this document. Section 6.

## Summary table

| Ecosystem | Placement | Agent-writable | 6-way rotary? | Licence | Maturity | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **circuit_macros** | authored, relative-anchored | yes, but **m4 quoting is hostile** | **yes — incl. make-before-break** | LPPL 1.3c | v11.1, CTAN updated 2026-10-28 | **Best output** |
| **circuitikz** | authored, absolute + node-anchored | yes, very | **yes, first-class** | GPL/LPPL | v1.8.7, 4 releases in 2026 | **Strong** |
| **SchemDraw** | authored, turtle + named anchors | yes, very | **yes, first-class** | MIT | v0.23, 33 releases, active | **Strong, fastest loop** |
| Typst `zap` | authored, relative + named nodes | yes | **no switch at all** | MIT | **ARCHIVED 2026-10-11** | Dead |
| draw.io | authored, absolute (mxGraph XML) | XML only, no DSL | **yes (3/4/6-pos)** + tubes | Apache-2.0 / GPL-3.0 | active | GUI with XML backdoor |
| **Penrose** | **constraint-solved** | yes (Substance ≈ netlist) | would need authoring | MIT | v3.3.1, 8.0k stars | **Silent failure** |
| netlistsvg | **automatic (ELK)** | yes | **inexpressible** | MIT | last commit 2024-01 | Stale, non-idiomatic |
| Graphviz / Mermaid / D2 | automatic | yes | **no electrical symbols at all** | — | healthy, wrong domain | **Structural dead end** |

Measured warm edit→render loop cost (VERIFIED, this machine):
SchemDraw **0.08 s**, Typst/zap **0.85 s**, Penrose **0.9 s**,
netlistsvg ~1 s, circuitikz/tectonic **3.05 s**.

---

## 1. circuitikz / TikZ / LaTeX

**VERIFIED by running it.** `tectonic` was already installed; circuitikz
resolved and compiled from the standard bundle with no setup.

### How placement is expressed

**Entirely authored. There is no auto-placement whatsoever.** Every component
sits where a coordinate puts it. Three idioms are available and all three are
the author's responsibility:

- absolute: `\draw (0,0) to[R] (3,0);`
- node-anchored: `\node[op amp, anchor=+] (OA) at (15.6,2.4) {};` then `(OA.out)`
- relative / path-relative: `-- ++(0.8,0)`, and the `-|` / `|-` orthogonal
  shorthands

The `-|` and `|-` operators are the closest thing to routing: they make a
two-segment right-angle path. **They do not avoid anything** — not components,
not other wires, not labels.

### The acid test

**VERIFIED.** A ~20-component low-boost section with the 6-way rotary and cap
bank compiled **first try** from mechanically-authored source.

circuitikz 1.4.6 (the version in tectonic's bundle) ships a **first-class
rotary switch multipole**, confirmed by reading `pgfcircmultipoles.tex` in the
bundle cache:

```
rotary switch/.style args={#1in#2wiper#3}
rotary switch <->=6 in 100 wiper 50
```

with generated anchors `out 1` … `out N`, plus `cout N`, `aout N`, `sqout N`,
and `in`/`cin`/`ain` on the wiper side (VERIFIED by reading the
`\expandafter\xdef\csname pgf@anchor@rotaryswitch@out...` loop at line 878).
It also ships `dipchip` (`pin N`/`bpin N`) and `muxdemux` for ICs.

**This is the only ecosystem surveyed whose rotary switch is both present and
electrically correct out of the box, alongside SchemDraw.**

### What the output looked like

**Revision 1** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/circuitikz/lowboost.png`

Symbols were publication-grade immediately: proper zigzag resistors, a real
inductor coil, triangle op-amp, correct ground glyphs, consistent line weight,
and genuine LaTeX typography (`siunitx` set "100 kΩ" and "1 µF" with correct
thin spaces). **But the capacitor bank was illegible**: at a 0.95 cm row pitch
every designator overstruck the value above it — `C_12` sat on top of `47 nF`,
`C_13` on `33 nF`, and so on for all six rows. circuitikz emitted no warning.
The rotary fan-out wires also took long detours back to the left.

**Revision 2** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/circuitikz/circuitikz-final.png`

One edit — row pitch 0.95 → 1.45 cm and a staggered per-channel breakout x —
**fixed every collision**. The result is a genuinely buildable bench page: all
six branches read cleanly, each tagged with its frequency, the rotary fans out
correctly, the op-amp stage is clean. Three compile iterations, ~3–5 s each.

### The warning this run produced

**VERIFIED.** In revision 2 this writer left a stray debug line
(`\draw (SW.out \i) -- (\bx, 0);`). It drew six nonsense diagonals across the
drawing, **TeX compiled with rc=0 and said nothing**. circuitikz has no concept
of a net: a wire is a pen stroke. There is no check that a wire connects
anything, no check that two components that should be joined are, and no check
that anything is legible. *Everything* electrical is the author's
responsibility, and the renderer is incapable of disagreeing.

### Maturity, licence, interop

- **VERIFIED** via CTAN JSON API: current CircuiTikz is **1.8.7 (2026-09-12)**,
  licence **GPL + LPPL**, copyright 2007–2026, four maintainers. Releases
  v1.8.4, v1.8.5, v1.8.6, v1.8.7 all landed in 2026 — very actively maintained.
- **VERIFIED caveat**: `tectonic`'s default bundle pins **circuitikz 1.4.6
  (2022-02-04)** — four years behind. Everything above was built against 1.4.6.
  Getting 1.8.7 means a newer tectonic bundle or a full TeX Live.
- **VERIFIED**: TikZ's auto-layout (`graphdrawing` + `\usegdlibrary{layered}`)
  **cannot run under tectonic**. Tried it; the error is explicit:
  `Package pgf Error: You need to run LuaTeX to use the graph drawing library.`
  Tectonic is XeTeX-based. The only auto-layout path in the TikZ world
  therefore requires a full TeX Live with LuaTeX, and in any case lays out
  *graphs*, not schematics.
- **KiCad interop**: one project exists — `khoripollo/SchemAccess`, "KiCad to
  CircuiTikz" (**VERIFIED** via GitHub API: created 2026-08-25, pushed
  2026-10-26, **0 stars**, MIT, Python+TeX, 12 MB). **VERIFIED by reading its
  `ARCHITECTURE.md`**: it is a **transcriber, not a placer** — "KiCad
  millimetre coordinates (Y down) are mapped linearly onto TikZ units (Y up) so
  the drawing preserves the original layout." That is an interesting shape
  (KiCad holds placement, circuitikz does the drawing) but the project is two
  months old, unproven, and a linear coordinate map will not reconcile KiCad's
  symbol sizes with circuitikz's, so label collisions are likely.

---

## 2. Typst + `zap`

**VERIFIED by running it.** `typst` was already installed; packages
auto-downloaded from the registry on first compile.

### Registry survey

**VERIFIED** by downloading and searching the full Typst Universe index
(`https://packages.typst.org/preview/index.json`, **5,070 packages**):

| Package | Version | Licence | What it is |
| --- | --- | --- | --- |
| **`zap`** | 0.6.0 | MIT | the circuit package — CeTZ-based |
| `circuiteria` | 0.2.1 | Apache-2.0 | **block** diagrams, not schematics |
| `typed-physics` | 0.3.0 | MIT | DC circuit systems (physics teaching) |
| `quill` | 0.8.0 | MIT | **quantum** circuits — not applicable |
| `cetz` | 0.5.3 | LGPL-3.0+ | the general drawing layer underneath |

### The disqualifying finding

**VERIFIED by reading the repository README at
`https://codeberg.org/grangelouis/zap`**, and by the Codeberg API:

> **"This package is no longer maintained."**

The repo is **`archived: True`**, last updated **2026-10-11**, 39 stars, 13
open issues. The author moved it from GitHub to Codeberg and stopped. `zap` is
the only real circuit-schematic package in the entire Typst registry, and **it
is dead as of seventeen days before this survey.**

### Symbol vocabulary — fails the acid test

**VERIFIED by reading `src/lib.typ` and `src/symbols/switch.typ`** in the
unpacked 0.6.0 tarball. `zap` has `potentiometer`, `rheostat`, `opamp`,
`transformer`, BJTs, MOSFETs, JFETs, logic gates — but its **only switch is a
single-pole open/closed two-terminal `switch()`**. No SPDT, no multi-position,
**no rotary**.

The 6-way rotary is therefore **not expressible**. Drawing it as six
independent SPST switches — which is what the render below does — is
**electrically wrong**: it says six capacitors can be selected at once, when a
rotary selects exactly one.

A second limitation, **VERIFIED by reading `src/symbol.typ`**: a symbol has
**one** `label` slot (content or a dict). There is no separate value/annotation
slot like circuitikz's `l=` + `a=` pair, so designator and value must be packed
into one stacked content block.

### What the output looked like

**Attempt 1** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/typst/lowboost.png`

Compiled first try in 2.5 s including package downloads. Clean IEC-style
symbols. But this writer had misused `i:` — which is a **current annotation**,
not a value — so every value rendered with a misleading current arrow through
the component, and several values collided with the ground bus ("10 kΩ"
rendered with the ground wire struck through the 1).

**Attempt 2** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/typst/lowboost2.png`

Clean, modern, legible; no collisions; **0.46 s**. Remaining problems:
the closed switch (position 3) renders as a **plain horizontal line
indistinguishable from a wire**, and `zap`'s op-amp is a plain rectangle rather
than the conventional triangle.

### Verdict

The **iterate-and-look loop is genuinely excellent** — a syntax error came back
in 0.23 s, a full rebuild in 0.46 s, far better than LaTeX. Typst is scriptable
and the authoring model (named nodes + relative coordinates) suits an agent
well. **But the one circuit package is archived and cannot draw the switch the
brief asked about.** Building on `zap` means adopting an abandoned dependency
*and* writing a rotary-switch symbol. Not recommended.

---

## 3. Penrose — the high-value item, and the one that fails most instructively

**VERIFIED by running it**, `@penrose/roger` 3.3.1 installed from npm.

### Maturity and licence

**VERIFIED** via GitHub API: `penrose/penrose`, **MIT**, **8,005 stars**, 362
forks, 182 open issues, not archived, last push **2026-10-04**, language
TypeScript, homepage penrose.cs.cmu.edu.

**Release cadence is the caveat**: v3.0.0–v3.2.0 all landed in July–August
2023, then **a two-year gap**, then v3.3.0 (2025-09-28) and v3.3.1
(2026-08-30). Recent commits are overwhelmingly CI and Dependabot. This is a
research artifact with maintenance, not a product under active development.

### Is there a circuit domain? Yes — and it is the right shape

**VERIFIED.** `packages/examples/src/logic-circuit-domain/` contains
`logic-gates.domain`, two Style files, and half-adder and full-adder Substance
files.

**The Substance file is literally a netlist**, which is exactly this project's
`Network` model:

```
Node XORIN1, XORIN2, XOROUT
XORGate XOR := MakeXORGate(XORIN1, XORIN2, XOROUT)
Connection C3 := MakeConnection(S1OUT1, XORIN1)
```

Mapping this project's circuit model onto Substance would be close to
mechanical. **That half of the brief's hope is confirmed.**

### Is the Style file declarative constraints, or a program?

**VERIFIED by reading `half-adder-color.style` in full. The answer is: both,
and the split is the problem.**

**The layout half is genuinely declarative.** Unknowns are declared with `?`
and the optimizer solves:

```
forall Node x { vec2 x.center = (?, ?) }
forall InputNode A; InputNode B {
    ensure equal(A.center[0], B.center[0])
    ensure norm(A.center - B.center) > 55
}
forall Gate G; Gate H {
    ensure lessThan(0.6 * (G.height + H.height), abs(G.part1.center[1] - H.part1.center[1]))
}
```

That is precisely the "agent declares intent, system solves coordinates"
division the brief wanted. **It is real and it works.**

**The symbol half is a hand-built program with magic numbers.** The XOR gate is
**seven overlapping primitives** with hand-computed geometry and
**background-coloured masking rectangles** used to carve the shape by
occlusion:

```
scalar G.GG = 50.0
shape G.part4 = Circle {
    center : (G.part1.center[0] - G.GG + 4.5, G.part1.center[1])
    r : sqrt(25.0 * 25.0 + (G.GG - 20.0) * (G.GG - 20.0))
    fillColor : #F7F4E9      -- same as the background; this is a mask
}
```

There is no symbol library. **Every analog part — resistor, cap, pot,
inductor, transformer, op-amp, and a 6-way rotary switch — would have to be
built this way.**

**Mitigation found (VERIFIED):** `@penrose/core` does ship an **`Image`** shape
with an `href` and a `pathResolver`, so external SVG symbols *can* be imported
and placed by the optimizer. That would remove most of the symbol-drawing
burden. **But an `Image` is a rectangle with a centre and no pin anchors**, so
pin geometry still has to be hand-declared per symbol in the Style, exactly as
the logic-gate style does:

```
ensure equal(vdist(IN1.center, (G.part1.center[0] - 20.0, G.part1.center[1] + 17.0)), 0.0)
```

### Routing is a three-segment Z with one free variable

**VERIFIED.** The entire wire router is:

```
forall Connection C where C := MakeConnection(A, B) with Node A; Node B {
    scalar C.pivot = ?
    ...three Lines through (C.pivot, A.y) and (C.pivot, B.y)...
    encourage equal(A.center[1], B.center[1])
    ensure lessThan(A.center[0], B.center[0])
    ensure lessThan(A.center[0], C.pivot)
    ensure lessThan(C.pivot, B.center[0])
}
```

No obstacle avoidance, no crossing minimisation, no crossing hops, no bus
handling. And note `ensure lessThan(A.center[0], B.center[0])`: **every
connection is forced strictly left-to-right.**

### Four experiments, and what they showed

**Experiment 1 — the half adder (the "easy" one).**
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/penrose/run/half-adder.png`

Solved in **0.9 s**, and it is genuinely attractive — good colour, good line
weight, LaTeX-set labels. The layout is readable but loose: the top third of
the canvas is empty, the IN2 signal takes a large detour, and the two long
wires into the XOR run adjacent enough to be hard to tell apart.

**Experiment 2 — determinism.** **VERIFIED**: the same `variation` seed
produces **byte-identical SVG** across runs. Good news for a committed
artifact. But different seeds produce **materially different layouts**.

**Experiment 3 — the full adder, which the example's own README flags as
"sometimes hard to find a global optimum".** Two seeds:

- `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/penrose/run/fa-AlphaOne.png`
- `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/penrose/run/fa-BetaTwo.png`

**Both are unbuildable, and they are broken differently.** Seed AlphaOne: the
`INCARRY` label runs straight through the AND gate's input leads; that gate's
two input wires are piled on top of each other as near-coincident stubs; a wire
passes **through** the lower AND gate's body; the `CARRY` label overlaps its
own node. Seed BetaTwo: **two gates visibly overlap each other** at the
bottom-right, and both `INCARRY` and `CARRY` labels overlap their node circles.

This is a **five-gate digital circuit** — far simpler than the acid test — and
the flagship circuit example of the system cannot lay it out legibly.

**Experiment 4 — the decisive one: feedback.** Analog audio circuits are full
of feedback. Because every `Connection` carries `ensure lessThan(A.x, B.x)`, a
cycle is **provably infeasible**. A two-AND-gate circuit with the output of the
second returning to the input of the first was built and run:

`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/penrose/run/feedback2.png`

**Penrose exited 0, printed "The diagram has been saved", and produced a
drawing in which the two AND gates overlap and the feedback wire is simply not
visible.** No error. No warning. No non-zero exit.

### Why this is disqualifying for unsupervised use

**VERIFIED.** `roger`'s only output on success is the filename. The
`--dump-metadata` flag gives **counts and timings only**:

```json
"optProblem": { "constraintCount": 64, "objectiveCount": 6 }
```

**No residuals. No per-constraint satisfaction. No convergence flag.** The
infeasible drawing above reported exactly the same clean metadata shape as a
good one. `ensure` is a **penalty term in a non-convex optimisation, not a
guarantee** — the optimizer may leave it violated, and nothing tells you it
did. The 202-constraint full-adder that overlapped two gates reported success
too.

This is precisely the failure mode `docs/schematic/false-greens.md` catalogues
and that CLAUDE.md names: *a skipped check must never look like a passing one*.
Penrose will hand back a confident, beautiful, wrong drawing.

**A further sharp edge, VERIFIED by accident:** the shipped Style is **not
total over its own Domain.** `logic-gates.domain` declares Buffer, NOTGate,
ORGate, NORGate, NANDGate and XNORGate; `half-adder-color.style` implements
only XORGate, ANDGate and SplitComponent. Using a declared-but-unstyled type
crashes at render with `Could not find H.width (at line 220...)`. That failure
at least is **loud**, which is the right behaviour — and notable precisely
because the constraint violations are not.

### Could a violation gate be built?

Yes, and this is the honest mitigation: `@penrose/core` exposes the optimisation
state programmatically, so a wrapper could evaluate the constraint residuals
after solving and refuse a drawing with any violated `ensure`. **That is a
checker, not a layout algorithm**, so it does not conflict with the project's
"we will not author layout algorithms" position. But it is work that does not
exist today, and it would sit on top of a system whose router is a one-variable
Z-path that forbids feedback.

### Verdict

**The division of labour is exactly right and the implementation is not ready.**
Penrose is the most intellectually aligned system in this survey and the one
this project would most like to work. It should be **recorded as the thing to
re-examine**, not adopted now. Adopting it today means: authoring every analog
symbol, replacing the router (which forbids feedback), and building the
violation gate that stops it lying — which is most of a schematic layout
system, i.e. exactly what the project said it would not write.

---

## 4. SchemDraw

**VERIFIED by running it.** `pip install schemdraw` into a scratch venv;
rendered via the pure-Python **SVG backend** (no matplotlib needed — the
`matplotlib` backend errored, `schemdraw.use('svg')` worked immediately).

### Maturity and licence

**VERIFIED** via PyPI JSON and GitHub API: **MIT**, current **0.23
(2026-05-29)**, **33 releases**, repo `cdelker/schemdraw`, **281 stars**, last
push **2026-10-08**, not archived. Steady cadence (0.20 Mar 2025, 0.21 Jul
2025, 0.22 Nov 2025, 0.23 May 2026). Essentially a single-maintainer project,
but a consistently maintained one.

### How placement is expressed

**Authored, turtle-style with named anchors** — the brief's description is
confirmed. Direction and length (`.right()`, `.down().length(2.0)`), absolute
placement (`.at((x, y))`, `.to((x, y))`), a drawing-state stack (`d.push()` /
`d.pop()`), and **named anchors on every element** (`pot.tap`, `oa.in1`,
`oa.out`, `sw.T3`). No auto-placement of any kind.

### Symbol vocabulary — the best of any system surveyed

**VERIFIED by introspecting the installed package: 226 elements.** Critically:

```
SwitchRotary(n=6, dtheta=..., theta0=..., radius=..., arrowcontact=...)
  Anchors: P (pole), T1..Tn (one per contact)
```

It also has `Potentiometer`, `PotentiometerIEC`, `PotentiometerIEEE`, `PotBox`,
`SwitchSpdt`, `SwitchSpdt2`, `SwitchDpdt`, `SwitchDIP`, `SwitchReed`, `Relay`,
`Transformer`, `Opamp`, and — notably for audio — **`AudioJack`**.

**SchemDraw and circuitikz are the only two systems here with a correct 6-way
rotary out of the box.**

### What the output looked like

**Revision 1** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/schemdraw/lowboost.png`

The **best symbol drawing of the three authored-placement systems**: ANSI
zigzag resistors, a proper triangle op-amp, a real rotary switch with contact
circles and a wiper arrow, heavy confident line weight, clean sans labels.
**But the output buffer collided with the capacitor bank** — "C11" sat on the
op-amp's + input, "47n" overlapped it, and the 20 Hz row's bus dot landed on
the op-amp triangle. Rendered silently, no warning. The rotary also fanned
up-left, sending all six breakout wires back across the switch body.

**Revision 2** — `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/schemdraw/lowboost2.png`

Two edits — fan the contacts rightward (`theta0=-50, dtheta=20`), lift the
buffer clear — and **every collision resolved**. Fully legible and buildable.
The remaining blemish is that the six rotary contacts crowd into a tight
near-collinear arc and the breakout wires bundle, which is cosmetic rather than
disqualifying.

### Loop speed

**VERIFIED: 0.08 s** warm — **by a wide margin the fastest iterate-and-look
loop in this survey**, ~38× faster than tectonic. For an agent driving a
render-look-adjust loop, that difference is structural, not cosmetic.

### Interop

**No KiCad path.** The only hit is `volkswagenfeature/schemdraw_Kicad`
(**VERIFIED** via GitHub API: **0 stars, last push 2018-09-27**) — a dead
2018 experiment. Output is SVG (and matplotlib formats if installed).

---

## 5. General diagram engines applied to circuits

This section was investigated in parallel by a second agent; its findings are
folded in below. Where a claim came from that agent rather than this writer it
is marked **RELAYED (sub-agent)** even where that agent ran the tool, since
this writer did not re-run it.

### netlistsvg — investigated directly by this writer, and the most interesting negative

**VERIFIED by running it.** This is the one tool in the entire survey where the
agent declares **only a netlist** and a real layout engine (**ELK**, the
Eclipse Layout Kernel) places *and* routes everything. It deserves to be
recorded properly because it is the closest working thing to what the brief
wanted.

**Maturity — stale.** **VERIFIED** via GitHub and npm APIs: `nturley/netlistsvg`,
MIT, **836 stars**, but **last commit 2024-01-25** and npm **1.0.2 published
2022-05-10**. It pins **`elkjs ^0.3.0`**, several major versions behind current
elkjs (whose own repo was pushed the day of this survey). The layout engine
underneath is alive; this consumer of it is not.

**It ships an analog skin.** **VERIFIED by reading `lib/analog.svg`**: 25 cell
types — `resistor_h/v`, `capacitor_h/v`, `inductor_h/v`, four diode families,
`transistor_npn/pnp`, `opamp`, `transformer_1p_1s`, `xtal`, `gnd`, `vcc`,
`vee`, voltage/current sources, and `generic`.

**It fails the acid test outright, two ways:**

1. **No potentiometer and no switch of any kind** in the analog skin.
2. **VERIFIED by reading the skin**: `generic` — the escape hatch — has
   **exactly four fixed pins** (`in0`, `in1`, `out0`, `out1`). A 6-way rotary
   needs seven. **The rotary switch is not expressible at all**, even as a
   generic box, without authoring a new skin symbol.

**The curated example looks good.**
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/netlistsvg/ce.png`
— the shipped common-emitter fixture auto-lays out into a conventional,
readable arrangement: supply at top, ground at bottom, transistor centre, input
left, output right, no collisions. Genuinely impressive for zero placement
input. **But it shows designators only, no values.**

**This writer's own netlist shows why that example flatters it.**
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/netlistsvg/lowboost2.png`

Values *do* work once the skin's short type aliases (`c_h`, `r_v`, `l_h`, `op`)
and exact pin names (op-amp pins are `+ - OUT VCC VEE`) are used — C1/1u,
R1/100k, L1/100mH all render correctly with proper symbols. **But ELK's layout
is not a schematic.** The capacitor bank came out in the order **C16, C15, C12,
C11, C14, with C13 dangling below on its own**; the op-amp — the output stage —
was placed at the **far left**; the ground and shelving nets became full-width
buses with many crossings.

**This is the general lesson about auto-layout for schematics, and it applies
to Penrose too:** ELK optimises graph-drawing objectives (edge crossings, edge
length, layer assignment). A schematic has *conventions* — power up, ground
down, signal left-to-right, banks in declared order, functional blocks kept
together — that are not graph properties at all. **A good graph layout is not a
readable schematic**, and no amount of solver quality closes that gap.

A partial mitigation exists and was found but not exercised: **VERIFIED by
reading `lib/Cell.ts`**, cells accept `fixedPosX`/`fixedPosY` layout
attributes, so an agent could pin the parts whose position carries meaning and
let ELK fill in the rest. That hybrid is the most promising auto-layout shape
seen in this survey — but it sits on a package last touched in January 2024.

### circuit_macros — the find of the survey, and it beats everything above

**This was not on the brief's list and it is the best non-EDA option found.**
Investigated by the parallel agent; **the headline artifact was then verified
by this writer looking at the rendered page directly.**

`circuit_macros` is a set of **m4 macros** by J. D. Aplevich (U. Waterloo) that
emit `pic`, processed by `dpic` into PostScript, SVG, TikZ/PGF or MetaPost.
It is the package textbooks have been drawn with for decades.

- **Licence LPPL 1.3c, version 11.1.** **RELAYED (sub-agent, from CTAN):** the
  CTAN page was **updated 2026-10-28 — the day of this survey**; the GitLab
  mirror `aplevich/Circuit_macros` shows last activity 2026-06-28. Low star
  count, decades of single-maintainer continuity — textbook-infrastructure
  maturity rather than hype. `dpic` is in Homebrew, BSD-2-Clause.
- **Placement: authored, relative-anchored** — `resistor(right_ elen)` then
  `capacitor(down_ elen) with .start at A`, with named points on every element
  (`.start`, `.end`, `.c`, `.In1`, `.Out`). Absolute `at (x,y)` available. **No
  auto-layout, no collision checking** — same as circuitikz and SchemDraw.
- **Agent-writable: yes, strongly** — line-oriented plain text, one macro call
  per element, and the language has loops, conditionals and arithmetic.
  **The real cost: m4's backtick-apostrophe quoting is hostile, and errors
  surface as downstream `pic` syntax errors rather than at the offending line.**
  That is a worse diagnostic story than any other tool here.
- **Symbol vocabulary: the best found anywhere in this survey.** **RELAYED
  (sub-agent, from grepping `libcct.m4`, 4,565 lines, 200+ macros):**
  `resistor`, `capacitor`, `inductor`, `potentiometer` (arbitrary tap),
  `opamp`, `transformer`, `diode`, `bi_tr`, `mosfet`, `j_fet`, `switch`,
  `relay`, `contacts`, `jack`, `plug`, `speaker`, `Header`, `ground`, `xtal`,
  `tline`, `variable`, `tapped`, `shielded`.
- **It has a parameterised multi-position rotary switch.** **RELAYED
  (sub-agent, `libcct.m4:1907-1950`):**
  `RotarySwitch(startdeg:enddeg, poles=N; wipers=spec; segments=spec; ...)` —
  arbitrary pole count, multiple wipers, **make-before-break shorting
  segments**. That last detail is more electrically expressive than either
  circuitikz's or SchemDraw's rotary. **VERIFIED by this writer** from the
  sub-agent's render `…/general-engines/cm/pultec2.png`: a five-position switch
  drew with `COM`, contacts `P1`–`P5` and a labelled wiper arrow.
- **Gap: no vacuum tube / triode symbol.** **RELAYED (sub-agent):** grep for
  `triode|vacuum|tube` in `libcct.m4` returned nothing. **For a Pultec that
  matters**, since the original is a tube design. It would have to be a custom
  macro, which the language supports.

**The output — VERIFIED by this writer, looking at the page:**
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/general-engines/cm/aa_latex-1.png`

This is the shipped `AudioAmp.m4` example rendered through the LaTeX/TikZ path.
**It is the best schematic produced by anything in this survey**, and it is not
close. A ~30-component analog power amp: designator *and* value on every part
(`R1 / 10 k`, `C4 / 3.3 pF`, `Q7 / MTP8P10`); clean orthogonal wiring with
correct junction dots; MOSFETs with body diodes and BJTs drawn in circles;
zeners; a potentiometer with a wiper arrow; op-amp pin numbers (7, 6, 4); and —
the part no auto-layout tool produced — **the supply rails drawn as labelled
horizontal lines across the page, `+45 V` at the top, `GROUND` across the
middle, `−45 V` at the bottom.** That is the schematic convention a bench
reader depends on, and it is exactly what ELK and Penrose cannot invent.

**Toolchain gotcha, RELAYED (sub-agent, verified by them by running it):**
macOS's `/usr/bin/m4` **fails** with `ERROR: end of file in comment` —
circuit_macros uses `changecom` and **requires GNU m4** (`brew install m4`).
Two output paths work: SVG (`m4 svg.m4 libcct.m4 x.m4 | dpic -v`), which does
**not** typeset LaTeX math, and LaTeX/TikZ (`m4 pgf.m4 …; dpic -g`), which is
the one that produced the page above.

### The general diagram engines — a structural dead end

**RELAYED (sub-agent), who ran Graphviz and D2 and looked at the output.**

The brief expected most of these to fail and they do, **for a structural reason
rather than a maturity one, which is why they should not be revisited**: they
model a *graph*. A schematic is not a graph. A net is a **hyperedge joining N
pins**; these tools have directed edges between node bounding boxes. There is
no pin, no two-terminal passive, no junction dot. And their auto-layout is a
*liability*: a bench reader needs signal-left-to-right and rails-at-top, which
no force-directed or layered algorithm will produce.

| Tool | Verdict | Key evidence |
| --- | --- | --- |
| **Graphviz** | **NOT VIABLE** | Ran it. Output is "a flowchart of labelled boxes". **No electrical symbols at all.** GND collapses to one node, destroying return topology. `splines=ortho` **silently drops all edge labels**. SVG node images fail to load (`res.svg` "not found as a file or as a shape library member") — only raster PNG works, forfeiting print quality. Edges attach to bounding boxes: **no pin anchoring, ever.** |
| **Mermaid** | **NOT VIABLE** | Official docs list 31 diagram types; **none is electrical.** Healthy project (90.9k stars, MIT), wrong domain. |
| **D2** | **NOT VIABLE** | Ran it. Complete shape list has **no electrical shape** and no symbol-library mechanism. Engines are dagre/ELK/tala — **graph layout, not constraint solvers you can give electrical intent to.** Output was "a handsome blue-and-white flowchart". |
| **Asymptote** | **NOT VIABLE** | Manual TOC checked: ships a `feynman` module for Feynman diagrams and a `CAD` module, **but nothing for circuits.** A blank sheet — and circuit_macros is the same idea already finished. |
| **MetaPost** | **NOT VIABLE (dead)** | `makecirc` is real but **last updated 2003-10-28, 23 years stale**; CTAN's own page redirects readers to circuitikz and circuit-macros. `mpcirc` **does not exist** (HTTP 404). `expressg` is ISO data modelling, wrong domain. |
| **SVG-native** | **NOT VIABLE** | `svgwrite` and `svg.js` are healthy generic emitters with **zero electrical content**. **No established, maintained SVG electrical symbol set exists** — every candidate found was ≤13 stars and/or stale since 2023. |
| **Excalidraw** | **MARGINAL** | `.excalidrawlib` is plain JSON and **fully machine-generable** — its one real strength. But the best community library (24 items, 2022, unversioned) stops at **SPDT; no rotary.** Killer objection: **the house style is deliberately hand-drawn/sketchy**, the opposite of publication quality. |
| **draw.io** | **MARGINAL — but 2nd best vocabulary** | **426 electrical shapes** across 16 palettes, including **`Selector Switch (3/4/6 positions)`**, two potentiometers, and a **`VacuumTubes` palette with Triode/Tetrode/Pentode** — which circuit_macros lacks. `mxElectrical.js` defines real `mxConnectionConstraint` **pin points**, the only general tool here with a pin concept. But it is a **GUI editor with an XML backdoor**: no source language, undocumented stencil style strings that must be scraped from the sidebar JS, no geometry checking, no netlist. **Headless export was NOT verified end to end.** Desktop build is GPL-3.0. |
| **Dia** | **NOT VIABLE** | Ships a real `Circuit.sheet` — but its **complete 32 objects include no potentiometer, no switch of any kind, no rotary, no transformer.** |
| **Ipe** | **NOT VIABLE** | Actively developed, beautiful LaTeX-text vector editor — but GitHub search for `ipelet circuit` returns **`total_count: 0`**. No electrical library exists. |
| **xcircuit** | **MARGINAL — interesting near-miss** | GPL-2.0, actively maintained (pushed 2026-10-15). Native format is **literally PostScript**, and symbols carry `pinlabel`s, `value`/`units`, a `pkg` footprint and **SPICE/PCB netlist directives** — real schematic-capture semantics, and **it can emit SPICE netlists**. But **no potentiometer and no rotary switch**, and it is driven as an interactive Tcl/Tk GUI with no documented DSL. |
| **Cassowary / kiwisolver** | **NOT VIABLE standalone** | A pure *linear* constraint solver. No symbols, no geometry, no domain content — and linear arithmetic cannot express orthogonal net routing. A component to build with, not a tool. |
| **Haskell `diagrams`** | **NOT VIABLE** | **Zero occurrences of "circuit"** in the `diagrams-contrib` module list. Has the right *primitives* (`Layout.Constrained`, `Anchors`) and nothing else; wrapper repo quiet since 2025-04. |
| **GLayout / OpenFASOC** | **NOT VIABLE — wrong problem** | Generates analog **IC physical layout (GDS)** for silicon, not schematics for a perfboard. |

**No tool in this group has any KiCad import or export path.** Every one would
consume a netlist generated from this project's own `Network` model; none
round-trips.

---

## 6. The KiCad baseline — measured, not assumed

Before recommending anything it was necessary to see what this project's
current route actually produces, rather than assume it is worse.

**VERIFIED by running `kicad-cli` 10.0.5** on a real board in this repository,
`circuits/pultec/pultec-mid-band.kicad_sch` (Rev 4, 2024-07-15):

```
kicad-cli sch export pdf --black-and-white --output <out>.pdf <sheet>.kicad_sch
```

- Default colour export:
  `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/kicad/pultec-mid.png`
- **Monochrome export, cropped to the capacitor bank:**
  `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/kicad/pultec-mid-bw-crop.png`

**This finding corrected a draft of this document.** The assumption going in
was that the non-EDA tools would plainly beat KiCad on page quality. **In
monochrome at print resolution, KiCad's output is a good bench document** —
clean, well-spaced, legible, with the capacitor bank reading clearly as six
series pairs selected from a six-pin header.

**Two things KiCad gives that nothing else in this survey does:**

1. **A title block.** Sheet name, source filename, title, date, **revision**,
   sheet size, and A–D / 1–6 grid references down the margins. A person at a
   bench holding a printed page can tell *which revision they are building*.
   Not one of circuitikz, SchemDraw, zap, Penrose or netlistsvg produces this,
   and for a bench reference document it is not a small thing.
2. **Designator plus a semantic name on every part** — `C8 / Mid C1A`,
   `C9 / Mid C1B`, `J36 / Mid C Sel Ret`. That second field is what makes the
   page navigable against the model.

**Where KiCad is genuinely weaker:** its stroke font is cruder than LaTeX or
Helvetica typography; connector pin numbers are rotated 90° and small; and the
default colour scheme is poor for a monochrome printout — though
`--black-and-white` fixes that completely and is a one-flag change.

**An incidental finding worth recording.** This sheet *is* a capacitor bank
with a selector — the acid test's circuit — and **the selector is not drawn as
a rotary switch at all.** It is expressed as pin headers (`J36 Mid C Sel Ret`,
`J14 Mid L Sel send`, `J38 Mid Cut/Bst Sw`), because the boards are modular and
the switch is off-board wiring. So the "6-way rotary symbol" capability that
separates circuitikz and SchemDraw from the rest **may matter less for the
boards already in hand than the brief implies** — though the brief asked for it
explicitly, and a mandate wider than the current boards is the stated reason
not to reason from the current boards alone.

## 7. Recommendation

### Is there a non-EDA ecosystem that would produce better bench documents?

**On typography and symbol drawing: yes — and `circuit_macros` most of all.**
Its `AudioAmp` render is a better-looking analog schematic than anything KiCad,
circuitikz or SchemDraw produced here, with labelled supply rails across the
page, designator-plus-value throughout, and correct junction dots.
circuitikz and SchemDraw also set type better than KiCad's stroke font. All
three passed the acid test and all three have a correct 6-way rotary switch.

**On the whole page: no.** Once the KiCad baseline is actually rendered in
monochrome (section 6), the gap narrows sharply, and KiCad wins back the title
block, the revision, and the designator-plus-name pairing. The non-EDA tools
would have to re-implement all of that before they were even level.

**For the project's actual problem: no — because the project's problem is
placement, and none of these solves it.** Every system that draws beautifully
requires the agent to author every coordinate, exactly as a KiCad-based route
would. Every system that places automatically produces layouts that are valid
graphs and unreadable schematics, and does so **silently**.

The brief's hope was that Penrose would supply the missing half. It does not,
and the reasons are concrete and recorded in section 3: the router forbids
feedback, the symbols must all be hand-built, and — decisively — **violated
constraints are not reported, so a wrong drawing is indistinguishable from a
right one at the tool's interface.**

### What would be given up by leaving KiCad

This is the part that should weigh heaviest, because it is not about drawing:

- **Netlist identity.** A KiCad schematic *is* a netlist. A circuitikz or
  SchemDraw drawing is a set of pen strokes that happen to look like one.
  Nothing in either ecosystem can tell you that a wire you drew connects what
  you meant — this writer proved that by accident, leaving a stray `\draw` that
  compiled clean and drew six nonsense diagonals. The project would be giving
  up the one artifact that makes a drawing *checkable*.
- **ERC.** No non-EDA tool here has any concept of an unconnected pin, a
  short, or a duplicated designator.
- **The downstream mandate.** CLAUDE.md names five output classes, three of
  them PCB-bound. A drawing in TeX or Python is a terminal artifact; it feeds
  no netlist to a layout tool, no BOM, no fabrication output. Leaving KiCad for
  the schematic means the schematic stops being the upstream of the boards.
- **`make check`.** The repository already invokes `kicad-cli` on every board
  on every run and CLAUDE.md says to treat KiCad as a compiler. Everything
  surveyed here is a renderer, not a compiler.

### What this writer would actually do

**Keep KiCad as the model and the authority. Treat the non-EDA tools as
renderers, not replacements.** The project already holds circuits as data and
already authors placement; what a non-EDA tool can add is a better-looking
*page*, not a better *process*. Options in order of appeal:

1. **Emit a bench page from the existing model into one of the three
   authored-placement tools.** All three are genuine upgrades on typography and
   none gives up the netlist, because **the netlist stays in the model**:
   - **`circuit_macros`** if page quality is the priority. It produced the best
     schematic in this survey by a clear margin, has the richest symbol set,
     and its rotary switch is the most electrically expressive of any. Pay for
     it in m4 quoting pain and poor error locality, and budget a custom macro
     for tube symbols.
   - **SchemDraw** if loop speed and ordinary maintainability matter more. It
     is Python, MIT, trivially agent-writable, has 226 elements including a
     correct rotary and an `AudioJack`, and renders in **0.08 s** — ~38× faster
     than tectonic. For an agent driving a render-look-adjust loop that
     difference is structural.
   - **circuitikz** if the project is already going to have a LaTeX toolchain
     for other documents. Best typography, first-class rotary, very actively
     maintained — but note tectonic's bundle pins a 2022 version.
2. **Whatever is chosen, add the title block.** KiCad's revision/date/sheet
   block is a real advantage for a bench page (section 6) and none of these
   tools has one. It is cheap to add and should not be quietly lost.
3. **If an auto-placement experiment is wanted anyway**, netlistsvg with
   `fixedPosX`/`fixedPosY` is the cheapest honest trial: pin the parts whose
   position carries meaning, let ELK fill in the rest. But it needs new skin
   symbols for the rotary and the potentiometer, and the package has been
   untouched since January 2024.

**Do not revisit Graphviz, Mermaid or D2.** They fail structurally, not for
want of maturity: a net is a hyperedge over pins and these tools have edges
between bounding boxes. There is nothing to wait for.

**On Penrose specifically:** record it and revisit. The Domain/Substance/Style
division is the right idea and this project's model maps onto Substance almost
directly. What makes it unusable today is not the idea but three fixable-in-
principle things: a router that forbids feedback, an empty analog symbol
vocabulary, and no constraint-violation reporting. If any of those changes —
particularly the last — it is worth re-running this experiment.

### The one thing worth carrying forward regardless

**Every tool in this survey will render an illegible or electrically wrong page
and report success.** circuitikz drew six nonsense diagonals at rc=0. SchemDraw
drew the op-amp on top of the capacitor bank. zap drew a closed switch as a
plain wire. Penrose drew two gates on top of each other and dropped a wire
while exiting 0. netlistsvg scrambled a capacitor bank into a meaningless
order.

Whatever ecosystem is chosen, **the gate has to be built by this project**, and
it has to look at the rendered page rather than the source — which is what
CLAUDE.md already says under *"Look at the output, not only the tests"*. No
ecosystem surveyed here brings that gate with it.

---

## Artifacts

All renders are in the session scratchpad at
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/drawing-survey/`:

| Path (relative to that directory) | What it shows |
| --- | --- |
| `circuitikz/lowboost.png` | circuitikz rev 1 — cap-bank label collisions |
| `circuitikz/circuitikz-final.png` | circuitikz rev 2 — **clean, buildable** |
| `circuitikz/lowboost2.tex` | the source for the above |
| `typst/lowboost.png` | zap attempt 1 — current-arrow and bus collisions |
| `typst/lowboost2.png` | zap attempt 2 — clean, but 6 SPST not a rotary |
| `schemdraw/lowboost.png` | SchemDraw rev 1 — op-amp over the cap bank |
| `schemdraw/lowboost2.png` | SchemDraw rev 2 — **clean, buildable** |
| `penrose/run/half-adder.png` | Penrose solves a small layout, attractively |
| `penrose/run/fa-AlphaOne.png` | full adder, seed 1 — unbuildable |
| `penrose/run/fa-BetaTwo.png` | full adder, seed 2 — **gates overlap** |
| `penrose/run/feedback2.png` | **infeasible feedback: exits 0, draws garbage** |
| `netlistsvg/ce.png` | ELK auto-layout at its best (curated fixture) |
| `netlistsvg/lowboost.png` | wrong type names → everything a generic box |
| `netlistsvg/lowboost2.png` | correct types — **ELK scrambles the cap bank** |
| `kicad/pultec-mid.png` | **KiCad baseline**, default colour export |
| `kicad/pultec-mid-bw-crop.png` | **KiCad baseline**, monochrome, cap bank + title block |

From the parallel investigation, under
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/general-engines/`:

| Path | What it shows |
| --- | --- |
| `cm/aa_latex-1.png` | **circuit_macros via LaTeX/TikZ — the best page in this survey** |
| `cm/audioamp.png` | same via the SVG backend (LaTeX math left unprocessed) |
| `cm/pultec.png`, `cm/pultec2.png` | rotary switch renders; placement collisions are the author's |
| `gv/passive-eq.png`, `gv/passive-eq-neato.png` | Graphviz — a flowchart, not a schematic |
| `d2/eq.png` | D2 — a flowchart, not a schematic |

## Caveats on this survey

- Everything circuitikz was built against **circuitikz 1.4.6** (tectonic's
  pinned bundle), not the current 1.8.7. Symbol behaviour may differ.
- The `circuit_macros` and general-engine sections were produced by a parallel
  agent. **This writer independently verified the two load-bearing claims** —
  the quality of `cm/aa_latex-1.png` and the existence of a working rotary
  switch in `cm/pultec2.png` — by looking at the renders. The rest of that
  agent's claims are marked RELAYED and were not re-run here.
- draw.io's **headless export was never verified end to end** by anyone. Treat
  "renders headlessly" as unproven.
- The acid-test circuit is this writer's own invention in the Pultec idiom, not
  a transcription of any real Pultec schematic. It exists to exercise the
  tools, not to specify a circuit.
