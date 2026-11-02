Prior art, applied to the other four circuit families
=====================================================

Research pass, 2026-10-19. Companion to `./generation-prior-art.md` (the map),
`./generation-prior-art-second-pass.md` (the first measurement) and
`./generation-prior-art-third-pass.md` (the mature industry). **This document corrects a
scoping error in the second pass**, which ran `schematizer` and `weave` against the Pultec
alone - the passive EQ, the circuit those tools are worst at - and let the reader infer
that nothing can draw our circuits. The owner caught it.

**This document gathers evidence. It makes no recommendation about the port.**

How to read the evidence marks
------------------------------

| Mark | Means |
| --- | --- |
| `[RAN]` | I executed it. The command and its output are given, and the check could have failed |
| `[CODE]` | I read the implementation in a clone and am reporting what the code does |
| `[RELAYED]` | Someone else's claim, not verified here |

Everything ran under a scratch directory outside the repository. **No repository file was
created or changed.** Versions: `schematizer` 0.2.0, `skidl` 3.0.0, Python 3.14.6, Node
v22.19.0, Bun 1.3.8, `kicad-cli` 10.0.5, `weave` at `31532c9`.

0. What is the harness's and what is the tools'
-------------------------------------------------

Three things below are **the harness**, and a failure in them is its bug, not evidence
about a tool.

**(a) Two input conversions had to be written** - a `Network` into SKiDL and thence
schematizer's netlist JSON, and a `Network` into a SPICE netlist for weave.

**(b) The repository's own SPICE emitter could not be used for two of the four circuits,
and that is a finding about this repository.** `[RAN]`

- `circuits/pt2399-core`: `lib/sim/device-lines.ts` has **no emission rule for
  `kind: "ic"`** and throws. Independently, that circuit's 5-pin header does not declare
  `PartSpec.electricallyInert`, which the emitter also refuses.
- `circuits/optical-compressor`: refused because the 1N5817 and the vactrol LED carry no
  SPICE model - which `tests/circuits/optical-compressor.test.ts` already pins as intended.
- `resolveNetwork(pt2399Core(), ...)` throws `Missing ground port: ground`:
  `GROUND_PORT_KEY` in `lib/model/net-preference.ts` is the literal `"ground"` and
  `pt2399-core` keys its reference port `"gnd"`.

A **topology-only** SPICE emitter was therefore written in the harness. **It was
cross-checked against the repository's emitter on the two circuits that emitter accepts**
`[RAN]`: `opamp-buffer` 10 cards vs 10, agreeing on every card except the op-amp's
argument order (node multiset identical); `preamp-lab` 26 cards vs 26, `AGREE=True`.

**(c) Symbols and pin numbers had to be supplied** where a circuit declares none - the
optical compressor declares **no symbol on any component**. Every one was loaded from the
KiCad 10 libraries on disk, so an invented name fails rather than passes, and a supplied
pin NUMBER is checked against the symbol's own pin NAME. `[RAN]` **That guard has teeth,
proved by mutating it**: flipping the diode map yields `pin 1 is named 'K' on the symbol,
expected 'A' for canonical pin 'anode'`. One substitution is recorded rather than hidden:
the compressor's TL072H is drawn with the TL072 symbol.

**(d) One asymmetry is FORCED by the input formats.** schematizer was fed the **authored**
network - pots are pots, jumpers are jumpers. weave was fed the **resolved** network,
because SPICE has no potentiometer, jumper or connector. Section 4 quantifies the cost.

1. The circuits, as the tools saw them
----------------------------------------

`[RAN]`

| circuit | parts | nets | nets of degree > 2 | **max net degree** |
| --- | --- | --- | --- | --- |
| `opamp-buffer` | 9 | 7 | 5 | **6** (`GND`) |
| `preamp-lab` | 32 | 18 | 7 | **12** (`GND`), 9 (`BASE`) |
| `pt2399-core` | 24 | 21 | 11 | **12** (`GND`) |
| `optical-compressor` | 37 | 22 | 15 | **17** (`GND`), 9 (rail), 8 (`VBIAS`) |

**Every one of our circuits exceeds degree 4 on at least one net.**

2. schematizer: routed mode fails on ALL FOUR, including the simplest
-----------------------------------------------------------------------

`[RAN]` Three attempts per circuit per mode, 24 runs:

| circuit | `--mode normal` | seconds to fail | `--mode labels` |
| --- | --- | --- | --- |
| `opamp-buffer` (9 parts) | **0 / 3** | 3.4, 3.8, 2.9 | 3 / 3, 0.1 s |
| `preamp-lab` (32 parts) | **0 / 3** | 282.5, 259.6, 227.9 | 3 / 3 |
| `pt2399-core` (24 parts) | **0 / 3** | 194.4, 310.8, 269.8 | 3 / 3 |
| `optical-compressor` (37) | **0 / 3** | 484.0, 340.7, 764.3 | 3 / 3 |

**Zero successes in twelve attempts, across three circuit families and a digital-ish IC.**

**The result that kills the "passive EQ" explanation: `circuits/opamp-buffer.ts` fails.**
Nine parts, one op-amp, four capacitors - the simplest circuit this repository owns, and
the shape schematizer is supposedly built for. It fails in under four seconds.

3. The failure is net DEGREE, with a control separating degree from size
--------------------------------------------------------------------------

### 3.1 The degree sweep, on an active circuit

`[RAN]` One TL072 follower plus N capacitors from rail to ground; N is the only variable:

| N caps | max net degree | routed |
| --- | --- | --- |
| 0-3 | 1-4 | **12 / 12** |
| 4 | 5 | 3 / 8 |
| 5 | 6 | 2 / 5 |
| 6 | 7 | 4 / 8 |
| 8 | 9 | 5 / 8 |
| 10 | 11 | 1 / 5 |
| 12 | 13 | 1 / 5 |
| 14 | 15 | 1 / 5 |

**Max net degree <= 4: 12/12 routed. Max net degree >= 5: 17/44.** The second pass measured
"four capacitors in parallel route one time in three" on a passive circuit; this measures
3/8 at the same degree on an op-amp circuit. **The numbers match because the variable is
the same.**

### 3.2 The control: many parts, no high-degree net

`[RAN]` Same follower, capacitors in a **series chain** - every net degree exactly 2:

| N caps in series | parts | max degree | routed | time |
| --- | --- | --- | --- | --- |
| 4 | 5 | 3 | **5 / 5** | 0.3-0.6 s |
| 8 | 9 | 3 | **5 / 5** | 1.2-1.4 s |
| 14 | 15 | 3 | **5 / 5** | 3.8-3.9 s |

**Fifteen parts route fifteen times out of fifteen when no net exceeds degree 3. Fifteen
parts route once in five when one net has degree 15. Part count is not the variable.
Circuit family is not the variable. Net degree is.**

### 3.3 What this means for the second pass's central result

The second pass's conclusion was right about the mechanism and **too narrow about the
scope**. It is not about passive audio. **A shared ground net of degree 6 is enough**, and
every circuit in `circuits/` has one.

4. weave: it draws all four, and the input format deletes the parts that matter
---------------------------------------------------------------------------------

### 4.1 Everything converted and self-certified

`[RAN]` `opamp-buffer` mode 0, `preamp-lab` mode 2, `pt2399-core` mode 3,
`optical-compressor` mode 3 - all `MATCH`. Byte-deterministic across three conversions.

### 4.2 The ladder rung is not cosmetic

`[CODE]` `SAFE_MODES` is a ladder of layout-pattern disablings. `[RAN]` Running **every**
rung and recording the verifier's error count:

| circuit | mode 0 | mode 1 | mode 2 | mode 3 |
| --- | --- | --- | --- | --- |
| **Pultec** | **0 errors** | - | - | - |
| `opamp-buffer` | **0** | - | - | - |
| `preamp-lab` | 3 | 3 | **0** | - |
| `pt2399-core` | 3 | 3 | 3 | **0** |
| `optical-compressor` | 5 | 6 | 5 | **0** |

**This inverts the expectation the scoping error produced.** weave's *default* layout is
connectivity-correct on the passive EQ and **connectivity-wrong on three of our four
active/IC circuits**. `[CODE]` Mode 3 disables `noHang` - the pass that hangs a shunt part
below a bus - and `noFar`, which places feedback across a stage. **Those are precisely the
patterns that make decoupling caps and feedback networks look like a schematic. weave buys
its MATCH on our circuits by turning off its schematic sense.**

### 4.3 What the SPICE input format costs, counted

`[RAN]`

| circuit | authored | reached the drawing | **dropped** | split |
| --- | --- | --- | --- | --- |
| `opamp-buffer` | 9 | 6 | **3** connectors | - |
| `preamp-lab` | 32 | 17 | **15** (10 connectors, 5 switches) | 6 pots -> 2 each |
| `pt2399-core` | 24 | 23 | **1** header | - |
| `optical-compressor` | 37 | 32 | **5** connectors | 2 dual op-amps -> 2 each |

**On the transistor-preamp lab board, 15 of 32 authored parts - 47% - never reach the
drawing**: all five bias jumpers, three headers, all seven test points. Every trim-pot is
split into two resistors. **A bench board whose entire purpose is adjustable legs,
removable jumpers and probe points is drawn as a fixed resistor network with no probe
points**, and the substitution is invisible to weave's certificate.

A new symptom worth naming: a rheostat-strapped trim-pot resolves to one section with both
ends on the same net, and weave draws three of those as **a detached row of parts at the
bottom of the sheet with a GND flag at each end**, connected to nothing.

### 4.4 The drawings, measured and looked at

`[RAN]` Rendered with the second pass's renderer, **after fixing a renderer bug that was
the harness's and would have hidden the most important symbol**: weave synthesises a
`__blockN` symbol at run time for an N-pin subckt, absent from `symbols.json`, so the first
render of `pt2399-core` showed the PT2399's wires and not the PT2399. Caveat unchanged:
symbols are labelled boxes, not LTspice glyph art.

| drawing | symbols | wires | extent | aspect | longest segment | crossings | **wire through a body** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `opamp-buffer` | 10 | 37 | 816 x 496 | 0.61 | 208 | 1 | **1** |
| `preamp-lab` | 26 | 121 | 992 x 1248 | 1.26 | 720 | 2 | **3** |
| `pt2399-core` | 26 | 171 | 1072 x 2112 | **1.97** | 720 | 18 | 0 |
| `optical-compressor` | 37 | 244 | 1408 x 2128 | 1.51 | **1,616** | 21 | 0 |
| Pultec (second pass) | 23 | 141 | 896 x 1056 | 1.18 | 880 | 12 | 0 |

**`opamp-buffer` - the best drawing any tool produced.** Signal flows left to right: source,
input coupling cap, op-amp, output coupling cap, load. Ground is seven flags rather than a
net, so the degree-6 `GND` costs nothing visually. The feedback wire loops cleanly over the
body. **Against it**: one wire passes through the input bias resistor's body, and four
label pairs overprint.

**`pt2399-core` - the IC is drawn well and everything around it is not.** The PT2399 is a
single 16-pin block, 8 pins a side, and the circuit genuinely reads as "parts hung around an
IC". **Against it**: a **1:1.97 ribbon**, unusable without splitting; the decoupling caps
are nowhere near the pin they decouple; no rail convention, so `+5V` snakes up the whole
left margin as wire; a trunk of parallel vertical wires runs 1,000+ units down the middle;
18 crossings.

**`preamp-lab` - the worst of the four.** The source is buried in the middle of the sheet.
Three resistors float detached at the bottom with ground flags at both ends. Labels
overprint in at least five places, two are clipped, and three wires pass through symbol
bodies - one 384 units long straight through the load.

**`optical-compressor` - functionally scrambled.** The three functional blocks are not
grouped. **The vactrol's two halves are at opposite corners of the sheet** - the sidechain
LED top-left, the audio photocell bottom-right - which is the single most informative
pairing in an optical compressor placed at maximum separation.

5. `--mode labels` is the only mode that completes, and what it costs
-----------------------------------------------------------------------

`[RAN]` 12/12 across the four circuits in 0.1-0.2 s, and round-trip correct - `MATCH=True`
on all four, net partitions equal.

**Its one real advantage over weave is that nothing is deleted.** `[RAN]` The `preamp-lab`
sheet carries all six trim-pots, all five jumpers, all three headers and all seven test
points - the 15 parts weave's format cannot express. `pt2399-core`'s sheet draws the PT2399
with its real KiCad pin names.

**What it costs, looked at rather than asserted:**

- **No inter-part wires at all.** A netlist in picture form.
- **Label collisions are pervasive.** On `opamp-buffer` at 600 dpi: `VEENDVCC`, `GNDD0000`,
  `outputVCCerminalVE`.
- **Coincident placement.** On `preamp-lab` all **seven test points are piled on top of one
  another** - an unreadable blob.
- **The sheet is mostly empty**, while passives are crushed into dense overprinted bands.

`[RAN]` ERC per sheet: 19, 34, 27 and 43 violations. **`lib_symbol_mismatch` dominates
(11-41 per sheet)** - the embedded `lib_symbols` block does not match the on-disk library,
so KiCad reports every instance as drifted. Recorded as an observation, not diagnosed.

6. Determinism, re-checked on an op-amp circuit
--------------------------------------------------

`[RAN]` Four runs of identical input, `--mode normal`:

| pair | textual diff | geometry md5 |
| --- | --- | --- |
| r1 vs r2 | **197 lines differ** | **identical** - a pure serialization reshuffle |
| r1 vs r4 | **1,732 lines differ** | **differs** - a genuinely different drawing |
| r3 | - | **no output at all**: the same input failed to route |

**A content-comparison gate still cannot tell "the layout changed" from "two wires swapped
places"**, and **the same input can route on one run and fail on the next** - so a
per-circuit success rate is the only honest way to report routed mode.

7. The readable drawings, and the ceiling
--------------------------------------------

`[RAN]` **The 15-capacitor series chain**: a clean vertical column in correct sequential
order, each with its net label, terminating in a ground flag, with a real feedback wire.
**This is a legible schematic.**

`[RAN]` **The follower with 8 rail capacitors** (a routed high-degree case): the caps are
drawn as one vertical bank with real wires and junction dots - but the order is
`C1, C4, C3, C7, C2, C8, C5, C6`, and **the VCC and GND flags alternate sides down the
stack**, so the bank cannot be scanned.

**So the ceiling is visible: schematizer draws a low-degree ladder well, scrambles a
high-degree bank, and refuses outright above degree ~5. None of our five circuit families
is a low-degree ladder.**

8. What this pass did NOT establish
--------------------------------------

- **Only one of the five transistor-preamp boards was run.** Nothing suggests the other
  four differ, but they were not measured.
- **SchGen was not re-attempted**; the commercial tools remain unverified.
- **greadability was not re-run** on these circuits.
- **LTspice glyphs were still not rendered**; symbol-art legibility is unassessed.
- **The degree threshold is characterised, not explained.** Where in
  `schematizer.engine.route` it bites was not traced.
- **The sweep's non-monotonicity is unexplained** - N=8 routed 5/8 while N=5 routed 2/5.
- **`lib_symbol_mismatch` was not diagnosed.**
