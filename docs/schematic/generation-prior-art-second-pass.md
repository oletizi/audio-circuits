Prior art, second pass: what happens when you actually run it
=============================================================

Research pass, 2026-10-19. Companion to `./generation-prior-art.md`, which closed by
saying it was "a map of where to look, not a measurement". **This document is the
measurement.** It does not replace the first pass and it does not overwrite its caveats;
it settles what running and reading code can settle, and says plainly what it could not.

**This document gathers evidence. It makes no recommendation about the port.**

How to read the evidence marks
------------------------------

| Mark | Means |
| --- | --- |
| `[RAN]` | I executed it. The command and its output are given, and the check could have failed |
| `[CODE]` | I read the implementation in a clone and am reporting what the code does, not what a README says |
| `[RELAYED]` | Someone else's claim, not verified here. Same standing as the whole of the first pass |

Everything was done under a scratch directory outside the repository. Nothing was
installed globally. Versions used: Python 3.14.6, Node v22.19.0, `kicad-cli` 10.0.5,
`schematizer` 0.2.0, `skidl` 3.0.0, `elkjs` 0.12.0.

1. What was cloned, and what ran
--------------------------------

`[RAN]` All five clones succeeded. Repository facts re-checked against the GitHub API
rather than a summariser - **this is the first pass's self-declared least reliable
category, and it mostly holds up**:

| Repo | Stars | Commits | Licence | Last push | Ran? |
| --- | --- | --- | --- | --- | --- |
| `devbisme/schematizer` | 3 | 13 | MIT | 2026-10-18 | **yes, extensively** |
| `microsoft/SchGen` | 39 | 3 | MIT | 2026-10-03 | no - needs API key + CUDA + KiCad 8.0.9 |
| `senolgulgonul/weave` | 13 | 29 | **see below** | 2026-08-19 | **yes** |
| `rpgove/greadability` | 76 | - | BSD-3-Clause | 2018-11-20 | **yes** |
| `devbisme/skidl` | 1695 | - | MIT | 2026-10-17 | yes (used to build inputs) |

The first pass's star and commit counts are **exactly right**. So the counts it distrusted
were sound; the thing it was right to distrust was everything it inferred about behaviour.

**One correction, and it matters for reuse.** `[RAN]` **The `weave` repository contains no
`LICENSE` file.** `git ls-files` lists 16 files and none is a licence; the GitHub API
reports `license=null`. Its `cli/package.json` declares `"license": "MIT"`, so the intent
is evident, but there is no licence text in the repository. **Anyone proposing to reuse
Weave's code should resolve this with the author first.**

2. `schematizer`: it runs, it is correct, and it cannot draw this circuit
-------------------------------------------------------------------------

### 2.1 It installs and runs cleanly

`[RAN]` `pip install ./schematizer` into a venv; `schematizer --help` works. On the bundled
2-part test netlist it produces a `.kicad_sch` that **KiCad 10 opens, renders to PDF and
runs ERC on** without complaint. As a piece of software plumbing it is in good order.

`[RAN]` Its own test suite: **126 passed, 13 failed, 22 skipped**. All 13 failures are one
cause, `FileNotFoundError: Can't open file: Device.` - skidl could not resolve the KiCad
symbol libraries in this environment. **Whether these pass in the author's `tox`
environment is unknown, and they are NOT reported as defects.**

### 2.2 The non-determinism claim is TRUE, but it is not what the README says

`[RAN]` Three runs per configuration, diffing whole output directories:

| input | mode | r1 vs r2 | r1 vs r3 |
| --- | --- | --- | --- |
| flat | normal | **differ** | **differ** |
| flat | labels | identical | identical |
| hier | normal | **differ** (all 3 sheets) | **differ** (all 3 sheets) |
| hier | labels | identical | identical |

So **`--mode labels` is byte-for-byte reproducible and `--mode normal` is not.**

`[RAN]` **But the diff is not always a different drawing.** Comparing geometry only (md5 of
the sorted set of all `(at ...)` and `(xy ...)` coordinates):

- `flat`/normal runs 1 and 2 have **identical geometry**; the 30-line textual diff is a
  randomly generated root sheet UUID plus **two wires emitted in a different order** - the
  same wire, same deterministic UUID, at a different file offset.
- `flat`/normal run 3 **does** differ geometrically.
- `hier`/normal `d_stage1` differs geometrically across all three runs.

**Read carefully, this is worse rather than better.** A run may differ from its predecessor
by a *pure serialization reshuffle*, by a *different layout*, or by both, with nothing in
the output distinguishing the cases. A content-comparison gate cannot tell "the layout
changed" from "two wires swapped places", so **normalising UUIDs and sorting elements would
not make the output stable - it would only hide the cases where it was not.**

### 2.3 Routed mode fails on the passive-EQ idiom - the central result

A Pultec EQP-1A-shaped passive section was built in SKiDL (25 parts, 22 nets) with rotary
selectors fanning out to capacitor banks, potentiometers strapped as rheostats, and an
inductor in the HF boost leg. **Symbol vocabulary was never the obstacle** - `[RAN]`
`Switch:SW_Rotary_1x7_MP`, `Switch:SW_Rotary_1x4_MP`, `Device:R_Potentiometer`, `Device:L`
and `Device:Transformer_1P_1S` all load from stock KiCad 10 libraries and all serialise
into schematizer's netlist JSON.

`[RAN]` **The full Pultec never routed. 0 successes in 9 attempts**, each ending in
`schematizer.engine.route.RoutingFailure`, taking between **26 and 121 seconds** to fail.
The failing net varied run to run, which is the randomised placement showing through.
`--mode labels` succeeded every time in 0.13 s.

`[RAN]` One rotary selector, N throws, each throw to its own capacitor, all re-converging
on one node:

| throws | `MP` grounded | normal mode |
| --- | --- | --- |
| 3, 4, 5 | no | routes |
| 3, 4, 5 | yes | routes |
| 7 | no | **routes** |
| 7 | yes | **RoutingFailure** |

So a 7-way fan-out on its own is routable, and **adding one further connection to the
switch's mounting pin defeats the router.**

`[RAN]` The simpler and more damning probe - **N capacitors in plain parallel between two
nodes**, three attempts each. (Cross-checked: for every row, outputs produced + logs
containing a routing failure sum to exactly 3.)

| caps in parallel | routed |
| --- | --- |
| 4 | **1 / 3** |
| 6 | **1 / 3** |
| 8 | **2 / 3** |
| 10 | **0 / 3** |
| 12 | **0 / 3** |
| 14 | **0 / 3** |

**Four capacitors in parallel route one time in three. By ten, never.** Failures split
across `GlobalRoutingFailure` (11), `RoutingFailure` (14) and `SwitchboxRoutingFailure`
(6). Two high-degree nets are enough; no switch, no inductor, no pot is needed to break it.

**The answer to "could it draw a passive audio EQ" is no, and the reason is not the exotic
parts.** It is that a passive EQ is made of elements hung in parallel off shared nodes, and
that is the shape the router handles worst.

### 2.4 Correctness is not the problem - readability is

`[RAN]` A round-trip check in the spirit of Weave's (export a netlist from the *generated*
`.kicad_sch` with `kicad-cli sch export netlist`, compare net partitions as sets of
`ref:pin`, ignoring net names and `#`-prefixed power refs). On every output produced at all
- 7-way fan-out in both modes, 8-cap bank, labels-mode Pultec - **`MATCH=True`**. When
schematizer emits a file, the connectivity is right.

**So they were rendered and looked at.** The 7-throw fan-out, routed mode:

- **The capacitor bank is not drawn as a bank.** Left to right the parts read `C7`,
  [switch], `C1`, `C5`, `C6`, `C2`, `C3`, `C4` - `C7` is on the *opposite side of the
  switch* from its six siblings, and the rest are in no order, at three different vertical
  offsets. There is no fan and nothing to scan.
- **Text is rendered upside down.** `C5`'s reference is mirrored and `100nF` appears
  rotated 180 degrees under at least three capacitors - the `symtx` hint dragging text with
  the part. On a printed sheet it is simply unreadable.
- **Labels collide.** `SW_Rotary_1x7_MP` is drawn straight through the switch body and out
  across its pins; `SW1` sits on the switch's own arrow glyph.
- **Wires double back.** Several switch pins exit right, travel the width of the drawing,
  and return left.

Labels mode on the 25-part Pultec is the honest alternative: a shelf-packed grid with every
pin stubbed to a named label and **no inter-part wires at all**. Deterministic and correct.
Also a netlist in picture form - you cannot see the cap bank, the fan-out or the signal
path - with label text colliding heavily.

**This is the first pass's thesis confirmed by running rather than by reading: correctness
is solved and readability is not.**

3. Weave: the code exists, the verifier is real, and it draws better
--------------------------------------------------------------------

### 3.1 The round-trip certification is real, and it is 116 lines

`[CODE]` `cli/verify.js` is not a claim; it is a short, readable implementation:

1. **Parse the emitted `.asc`** for `WIRE`, `FLAG`, `SYMBOL` and `SYMATTR` records.
2. **Rebuild connectivity geometrically.** Every symbol pin is rotated by the symbol's
   rotation and offset to an absolute coordinate. For each wire, every interesting point
   **lying on that segment** (exact integer coordinate test, horizontal or vertical only)
   is collected, sorted, and consecutive points unioned in a union-find.
3. **Name the groups** from flags; same-named flags merge across the sheet, `0` is ground.
4. **Compare partitions, not names.** Each net becomes a signature: the sorted
   `comp:pinIndex` set. Flag-named groups additionally check the flag name.
5. **Binary verdict**: `MATCH=True` iff the error list is empty.

**Two properties worth naming before anyone transplants this.** It is *partition* equality,
so ordinary signal net names are deliberately not compared. And the coincidence test is
**exact integer coordinate equality on axis-aligned segments**, sound only because
everything is snapped to a grid first; it would silently under-report on un-snapped or
diagonal geometry.

`[RAN]` `symbols.json` is **924 KB with 5,093 symbol entries**, confirming the first pass's
relayed figure.

### 3.2 It ran, and it verified a Pultec-shaped network

`[RAN]` A 23-element all-passive network - input source, series resistor, four LF
capacitors, seven HF capacitors, three HF-atten capacitors, an inductor, five 1 MΩ
resistors standing in for the pots, and a load - **converted and self-certified on the
first attempt, at `mode 0`**, the top of the safe-mode ladder, with no pattern disabling.

### 3.3 What it draws - and the limit that matters more

No renderer ships with the CLI, so `[RAN]` one was written using **Weave's own
`symbols.json`** for pin coordinates and bounding boxes. **Caveat stated plainly: symbols
are drawn as labelled boxes, not LTspice glyph art.** A judgement about *placement and
routing* from this picture is sound; a judgement about *glyph legibility* is not.

In a 1016 x 1176 drawing with 141 wires:

- **Clean orthogonal routing.** No wire passes through a symbol body. No reference label is
  rotated or mirrored.
- **Signal flows left to right** - source at far left, load and output at right.
- **The capacitor banks are spatially grouped.** `CHF4`-`CHF7` form one visible vertical
  column and `CHF1`-`CHF3` another. They are **not in numeric order**, but a reader can see
  that a bank exists - which is more than schematizer's routed output manages.
- **Weave's own stated weakness is visible**: the drawing is tall and stretched, with
  several wires spanning the full width.

**The limit that matters is upstream of the drawing, and it is decisive.** `[RAN]` **A
rotary selector cannot be represented in Weave's input at all.** Weave consumes a SPICE
netlist, and SPICE has no multi-position selector element. To get a Pultec through, all
seven HF capacitors had to be written as permanently connected in parallel. **Weave drew an
excellent picture of a circuit that is not the Pultec.** For a tool whose whole value
proposition is a verified round trip, the thing it verifies is the connectivity of the
substituted circuit - the substitution happens before Weave sees anything and is invisible
to its certificate.

4. SchGen: Spatial Violation does NOT ship
-------------------------------------------

`[RAN]` Not runnable here: `config.py` requires an `openrouter_api_key`, the README
requires `torch==2.8.0` on CUDA 12.8 plus `flash-attn`, and it pins **KiCad 8.0.9**.

**But the question the first pass called "the single most valuable thing to check next" is
answerable by reading the code, and the answer is no.**

`[CODE]` The shipped evaluation is `evaluation/eval.py` driving `modules/sch_evaluation.py`.
`evaluation()` returns exactly four things:

| key | what it is |
| --- | --- |
| `passed` | the generated Python executed without raising |
| `netlist_evaluation` | `jaccard`, `precision`, `recall`, `f1` over symbol-pin node sets |
| `errors` | **the number of lines containing the substring `"error"`** in captured output |
| `erc_errors` | counts in four KiCad ERC categories |

**There is no Spatial Violation implementation, no overlap metric, and no normalisation,
anywhere in the published evaluation path.**

`[CODE]` The only overlap code is `check_position_overlap_error` and
`check_box_overlap_error` in `modules/utils/kicad_add_symbol.py`, and they are
**generation-time guards, not metrics**. With `RAISE_ERR_FLAG = False` (the default) they
merely `print` a line beginning `Error: Symbol '...' overlaps`. **So the paper's "normalised
overlaps among symbols, labels and wires" survives in the shipped code only as an
undifferentiated side effect**: those printed lines contain the word "error", so they are
swept into the `errors` integer alongside every other error-ish line of output.

That is a finding about the repository, not a claim that the paper's numbers are wrong -
the implementation may simply not have been released.

5. The elkjs contradiction, settled
------------------------------------

`[RAN]` `elkjs` 0.12.0, a Pultec-shaped graph (one selector node fanning to 7 capacitor
nodes re-converging on one node, 14 edges), laid out four times:

| `edgeRouting` | edges | sections w/ bends | total bend points | **non-axis-aligned sections** |
| --- | --- | --- | --- | --- |
| `ORTHOGONAL` | 14 | 12 | 24 | **0** |
| `POLYLINE` | 14 | 0 | 0 | 12 |
| `SPLINES` | 14 | 14 | 28 | 12 |
| (unset) | 14 | 12 | 24 | **0** |

**ELK does orthogonal edge routing, it returns the routes, and every segment is
axis-aligned.** `ORTHOGONAL` is also the layered algorithm's default. The contrary claim is
false as a statement about ELK.

**The first pass's guess at the explanation is confirmed by the mechanism.** The routes live
in `edge.sections[].bendPoints`, nowhere else. A caller that reads only `children[].x/y` and
re-draws its own edges will observe `edgeRouting` to have "no visible effect".

Note separately `[RELAYED]`, and *not* contradicted here: the SKiDL discussion reports elkjs
producing worse results than hand-written heuristics *for SKiDL's case*. "ELK can route
orthogonally" and "ELK's output suited that project" are different questions and only the
first is settled.

6. The "orthogonal reads worse" study, identified
--------------------------------------------------

> **Tim Dwyer, Bongshin Lee, Danyel Fisher, Kori Inkpen Quinn, Petra Isenberg, George
> Robertson, Chris North. "A Comparison of User-Generated and Automatic Graph Layouts."**
> IEEE InfoVis / TVCG, 2009.

`[RAN]` The passage the first pass was relaying, verbatim:

> "It is noteworthy that G0 (the orthogonal layout) had only 7 crossings while the next
> best layout in terms of crossings (the force-directed layout G2) had almost twice as many
> (13). Yet, G0's performance in terms of user choice was dismal. The ten users who chose to
> complete the tasks using G0 were also slow and inaccurate in finding the clique and
> leaf-nodes, **although the sample size is too small to be conclusive.** In general we did
> not find any strong correlation between crossing count and either user preference or task
> time and accuracy."

So the first pass was right to call it a flag rather than a fact - **and so does the paper,
in its own words.**

**The mechanism the paper gives is the part that bears on schematics:**

> "Users seemed to have particular trouble with the circular and orthogonal layouts in this
> regard. In the orthogonal layout there were **a large number of right angle bends in edges
> inside the clique.**"

The harm is attributed to **bends**, not to crossings. A schematic is orthogonal by
convention, so bends are intrinsic to the form and cannot be designed away - which makes
**bend count, not crossing count, the metric this study implicates** for anything
schematic-shaped. The study's own headline conclusion is that crossing count did not
correlate with task performance at all.

7. `greadability`: it runs, and it breaks its own contract on a schematic
--------------------------------------------------------------------------

`[CODE]` What it measures:

| metric | computation |
| --- | --- |
| `crossing` | `1 - c/cMax`, `c` = pairwise straight-line segment intersections |
| `crossingAngle` | `1 - d/dMax` - mean deviation of crossing angles from an ideal 70 degrees |
| `angularResolutionMin` | deviation of adjacent incident edge angles from `360/degree` |
| `angularResolutionDev` | average deviation of angles between incident edges |

`[RAN]` Results on real generated schematics:

| graph | n | m | crossing | crossingAngle | angResMin | angResDev |
| --- | --- | --- | --- | --- | --- | --- |
| 7-fanout, routed mode | 8 | 13 | 0.533 | 0.119 | 0.030 | 0.075 |
| 7-fanout, labels mode | 8 | 13 | **-1.000** | **-0.571** | 0.000 | 0.073 |
| Pultec 25-part, labels mode | 25 | 39 | 0.309 | 0.258 | 0.282 | 0.334 |

**The README states "Each is a number in the range [0, 1] with higher numbers indicating
better layouts". `[RAN]` That is false on schematic-shaped input.** The cause was checked
rather than guessed: `cMax` is **not** degenerate (30, and 576 for the Pultec). The metric
goes negative because the actual crossing count exceeds the supposed approximate maximum -
**60 crossings against a `cMax` of 30**.

**The deeper applicability problem is not the range bug.** greadability measures **straight
lines between node centres**. A schematic's wires are orthogonal polylines routed around
obstacles. The crossings it counts are not the crossings a reader sees. Labels mode scores
*worst* on crossings while drawing **no inter-part wires at all**.

**It can therefore score a placement. It cannot score a routed schematic** without first
being given the real wire polylines, which is a change to the metric, not a configuration
of it.

8. AEM: paywalled, stopped as instructed
-----------------------------------------

`[RAN]` One attempt through open-access routes. **"AEM-PCB Reverser: Circuit Schematic
Generation in PCB Reverse Engineering Using Reinforcement Learning Based on Aesthetic
Evaluation Metric", IEEE TCAD, document 10349696.** IEEE Xplore paywalled; Semantic Scholar
returned HTTP 403; no open-access PDF surfaced. **The formula was not retrieved.**

`[RELAYED]` Search summaries state AEM "considers factors such as component placement
specifications, neatness, routing complexity, and line length". That is a list of named
factors from a summariser, **not a formula and not read here**. It should not be built on.

9. What this pass did NOT establish
------------------------------------

- **SchGen was never executed.** Only the *absence of Spatial Violation from the shipped
  evaluation* is established, and that by reading code.
- **LTspice's own glyphs were not rendered** for Weave's output. Placement and routing
  judgements hold; symbol-art legibility is unassessed.
- **13 of schematizer's 161 tests could not be made to run here**, all on skidl symbol
  library resolution. No claim is made that they are defects.
- **Weave's 88.4% figure on 3,460 Analog Devices circuits was not reproduced.** It needs
  LTspice on Windows.
- **The commercial tools remain entirely unverified** - Flux, CELUS, JITX, Quilter.
- **Purchase's seven formulas were still not retrieved.** greadability cites Dunne et al.
  and Gove 2018, not Purchase 2002 directly.
- **The Pultec used here is a layout probe, not a circuit claim.** Nothing about frequency
  response should be read off it.
- **Per-run timings for the cap-bank sweep were lost** to stderr interleaving; only success
  counts are reported, cross-checked against failure logs.
