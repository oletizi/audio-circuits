ELK at block scale - a second measurement spike
===============================================

Spike, 2026-10-19. Run against the question
[`./elk-spike.md`](./elk-spike.md) §8 left open about itself:

> *"These numbers are ELK with no template at all, which is exactly what seam A
> asks of it, and they are not a prediction about seam A plus a template
> library."*

The first spike laid out WHOLE CIRCUITS, flat. Seam A, as
[`../superpowers/specs/2026-10-19-schematic-authoring-design.md`](../superpowers/specs/2026-10-19-schematic-authoring-design.md)
§1 defines it, hands ELK **one block at a time**. Arranging 32 parts is not the
same problem as arranging four, and that difference is what is measured here.

**This document gathers evidence. It makes no recommendation about the
architecture.** It does not say whether to keep seam A, drop it, or move it.

Evidence marks: `[RAN]` executed, the check could have failed; `[CODE]` read the
implementation; `[RELAYED]` repeated from elsewhere. Versions: Node v22.19.0,
Python 3.14.6, `netlistsvg` at `d3518f1` with its pinned **elkjs 0.7.1**, same
checkout and same `lib/analog.svg` skin as the first spike. Nothing installed
globally; nothing committed; no repository file changed.

Summary - the five questions, answered
-----------------------------------------

1. **Bends per edge improves, and most of the improvement is the boundary, not
   the routing.** Whole circuits ran 2.19-3.27 against the third pass's probe at
   1.72. Eighteen declared blocks run **0.67-2.89** on the best policy; 6 of 18
   beat the probe and 12 of 18 are at or below 2.0. But the relationship to size
   is weak (Spearman rho **+0.57**), and with port edges excluded it nearly
   vanishes (**+0.15**). A 28-part block scores 1.77 and a 3-part block scores
   2.00.
2. **Yes, and it is near 9-12 parts - but the thing that breaks is NOT bends per
   edge.** Below about 9 parts, inter-net crossings are ZERO and are invariant
   under declaration-order shuffling. At 12 parts a block has 28 crossings and
   its crossing count moves with declaration order. Above 17 parts bends per
   edge is still fine and the ASPECT is 4.7:1 and 6.6:1.
3. **The crash reproduces at block scale and it got WORSE at parent scale.**
   `oc-audio`, a 12-part declared block, refuses 3/3, and **45 of its 256
   orientation assignments** fail. Both parents also refuse: the 76-part Pultec
   reference refuses under **both vertical policies**, where every one of its
   five declared sections lays out.
4. **Congruence holds at block scale.** Four declared, structurally identical
   bias legs, laid out alone, draw congruently - identical y-offsets, identical
   floor-to-trim vector, identical starting corner - with the one x difference
   predicted exactly by the drawn width of the component's id text. G97's flat
   measurement spanned -912 to +564.
5. **A block boundary is expensive and the cost rises as blocks get smaller.**
   Port glyphs are **10-67 % of the cells** in a block's drawing, port edges
   carry **more bends per edge than internal edges on every one of the 8 blocks
   of 8 parts or more**, and a 1-part block's drawing is two-thirds boundary.

**Does block scale change the picture? Partly, and not where the first spike was
worst.** The paired control is the clearest thing here: the same 37-part circuit,
same converter, same policy, drawn whole gives **293 inter-net crossings, 3.18
bends per edge, 4.05:1**; drawn as its three declared blocks gives **48 crossings
total, 2.70, worst aspect 3.11** - and a 4.6x reduction in wire length. The
76-part Pultec reference goes from REFUSED to five clean drawings. That is a
large, real gain. What does NOT improve is everything the first spike's §3 was
about: a 12-part block still has 28 crossings, two 17-part blocks are 4.5:1 and
4.7:1 ribbons, the component banks are still out of order, and the interface
ports still land in the middle of the sheet. **Block scale removes the
catastrophe and leaves the complaint.**

0. The harness, reported separately from ELK's behaviour
----------------------------------------------------------

Everything in `.../scratchpad/elk-block-spike/` is this spike's own code, all
throwaway, all labelled so in its own header, none of it committed. A bug in it
is not evidence about ELK.

**The converter is the first spike's, machine-extracted rather than retyped.**
`extract.js` copies lines 48-285 of that spike's `net2elk.ts` into `convert.ts`,
adding `export` to five declarations and one declared behavioural patch (below).
`[RAN]` A check reports the extracted body **identical to the source after
stripping the export prefixes**, and `blocks2elk.ts` regenerates all fifteen of
the first spike's whole-circuit inputs through the extracted code and compares
them to that spike's files on disk: **15 byte-identical, 0 different.** If the
extraction had changed behaviour, every number below would be suspect.

`extract2.js` does the same for the partition verifier, out of `verify.ts`.

### Harness bugs found, and what each one would have cost

**H1 - `[RAN]` the first spike's converter maps a diode's pins to the wrong skin
pids, and that bug has never fired.** It says `anode -> "A"`, `cathode -> "B"`.
A scan of `lib/analog.svg` prints `diode_v | alias: d_v | pids: +,-`; `A`/`B`
belong to the resistor, capacitor, inductor and crystal templates. None of the
first spike's five circuits contains a diode. Two blocks here do, and ELK
refuses the input outright with `JsonImportException: Referenced shape does not
exist: reverse_polarity_diode.A`. Patched in `extract.js`, declared and printed;
**the patch is inert on the first spike's inputs, which is what the 15
byte-identical control establishes.** Until this spike, the repository's ELK
evidence had never drawn a diode.

**H2 - `[RAN]` this spike's own mutation arm was too weak, and the same blind
spot is in the first spike's verifier.** `verify-blocks.ts --mutate` first moved
one pin to a FRESH bit; 27 of 54 rows still reported SAME. The partition
comparison is deliberately over net CONTENTS ignoring net NAMES, so on a small
block, relocating one pin to a net of its own leaves the multiset of groups
unchanged. Merging the pin onto an EXISTING bit instead gives **54 of 54
DIFFERENT**. **A pin moved to a brand-new net is invisible to this check, in
both spikes.**

**H3 - `[RAN]` `portcost.py` read only one of the two ELK JSON edge forms** and
reported 0 port edges for every bias leg. netlistsvg emits cell-to-cell edges as
`sources`/`targets` lists and port-reaching and self edges as
`source`/`target` + `sourcePort`/`targetPort`. Both are read now.

**H4 - `[CODE]` `measure.py`'s `labels_past_right_edge` column is dead.** It
compares a `<text>`'s LOCAL `x` against the absolute canvas width and reports 0
on all 56 drawings here. The first spike's §7 figure did not come from it - it
came from `labels.py`, which accumulates the transform. `[RAN]` This spike's
`overflow.py` reproduces that: **5 of 14 on the first spike's own outputs**,
matching its recorded "5 of 15".

**H5 - `[CODE]` every port is emitted as `direction: "input"`,** because the
repository IR has no port direction. netlistsvg therefore draws every port -
entry and exit alike - as an inbound `inputExt` arrow, and ELK is told every one
of them is a source. §7's numbers are measured under that condition and a
different declaration might place them differently.

**H6 - inherited, unchanged:** the pin-side split for `ic`, `connector`,
`switch` and `potentiometer` drawn as `generic` is still "sort and split in
half" for ICs, still a guess, and still the reason a generic cell's identity is
unreadable in every drawing below.

**H7 - one thing in the block inventory is derived by this harness and not read
off the repository:** the PORTS of a Pultec section. See §1.

`[RAN]` **The partition check passes 54 of 54** - every generated block input,
re-read off disk, carries the net partition the block's `Network` declares -
and **54 of 54 fail under mutation**.

1. The blocks, and why none of them is this harness's judgement
-----------------------------------------------------------------

The brief's constraint is the point: at block scale the decomposition must come
from the repository, not from an agent reading a circuit and deciding where the
blocks are. Four declared channels were used and nothing else. `[CODE]`

| channel | what declares it | blocks |
| --- | --- | --- |
| `include(prefix, network, portMap)` | `circuits/optical-compressor/index.ts` composes exactly three, and each is already a `Network` with its own `.port(...)` set | `oc-power` 8, `oc-audio` 12, `oc-sidechain` 17 |
| `OWNERSHIP` / `partitionReference()` | `circuits/pultec/partition.ts` assigns every component of `THREE_BAND_REFERENCE` to one of five named sections | `pultec-low-cut` 9, `pultec-low-boost` 9, `pultec-hi-cut` 13, `pultec-hi-boost` 17, `pultec-mid` 28 |
| `LEGS` + `addLeg()` | `circuits/transistor-preamp/lab-board.ts` declares six adjustable legs and builds five through one constructor with an explicit two-net boundary | `leg-upper`, `leg-feedback`, `leg-lowerA`, `leg-lowerB` 3 each, `leg-collector` 2 |
| `allStandIns()` | `lib/board/scaffold/index.ts` derives one stand-in per absent Pultec section, each carrying its own `boundary` array | `standin-*` 1, 1, 2, 2, 4 |

**Eighteen blocks, 1 to 28 parts.** Both parents were also emitted, through the
same converter, as the paired control in §4: `opticalCompressor()` at 37 parts
and `THREE_BAND_REFERENCE` at 76.

**H7, stated plainly.** A `Network` needs ports and the Pultec partition exports
components. The rule used is: *a net is a port of a section iff the section
touches it AND it appears in `boundaryConductors()` or in `externalPorts()`* -
both from `partition.ts`, but the rule combining them is the harness's. The
`include()` blocks, the legs and the stand-ins all carry their boundary
explicitly and needed no rule.

2. Routing success, timing, determinism
------------------------------------------

`[RAN]` 18 blocks x 3 policies x 3 runs = 162 runs, plus 2 parents x 3 x 3 = 18.

| | blocks | the two parents |
| --- | --- | --- |
| laid out at all | **53 of 54** (`oc-audio` h-rails refused 3/3) | **3 of 6** |
| wall clock | **0.142 - 0.238 s**, mean 0.167 over 159 runs | 0.294 - 0.455 s |
| determinism, same input x 3 | **1 distinct output, 53 of 53** | 1 distinct, 3 of 3 |
| non-axis-aligned segments | **0, all 53** | **1** - see below |
| PINS_NOT_REACHED / NETS_DRAWN_IN_PIECES | **0 / 0, all 53** | 0 / 0 |
| wire through a drawn symbol body | **0**, except the transistor's own three leads in `oc-sidechain`, the exception the first spike's control reproduces | same |

**So the first spike's §1 and §5 survive at block scale**: where ELK completes it
completes fast, repeatably, with electrically correct and orthogonal routes.

`[RAN]` **ONE TRUE DIAGONAL, and it is on a parent, not a block.** The first
spike reported 0 non-axis-aligned segments on every one of 14 drawings. Across
53 block drawings here: still 0. On `WHOLE-optical-compressor__v-bare` there is
**one**: a segment from (1770, 472) to (2290, 682) on `net_22`, which carries
exactly `sidechain_led_sense_resistor.B` and `sidechain_vactrol_led.-`. **Caveat,
stated because it matters:** that net ends on a diode, and the diode symbol
mapping is the H1 patch this spike introduced, so the attribution is weaker than
it looks - though `oc-power` and `oc-sidechain` both draw diodes with zero
diagonals.

### 2.1 The first spike's §1.1 instability shrinks with the block, and below 9 parts it is gone

`[RAN]` §1.1 found that shuffling cell order - same components, same nets, same
partition - moved inter-net crossings by up to 3x. Re-run on blocks, declaration
order plus three seeded shuffles:

| | cells | inter-net crossings over four orders | distinct drawings |
| --- | --- | --- | --- |
| `leg-upper` | 3 | 0, 0, 0, 0 | 3 |
| `standin-hi-cut` | 4 | 0, 0, 0, 0 | 3 |
| `oc-power` | 8 | 0, 0, 0, 0 | 4 |
| `pultec-low-boost` | 9 | 5, 5, 5, 5 | 4 |
| `oc-audio` | 13 | 28, 26, 22, 29 | 4 |
| `pultec-hi-boost` | 17 | **14, 29, 21, 14** | 4 |
| `oc-sidechain` | 18 | 20, 16, 17, 22 | 4 |
| `pultec-mid` | 28 | **37, 20, 20, 25** | 4 |
| `WHOLE-optical-compressor` | 39 | **293, 204, 308, 337** | 4 |

**The drawing still changes with every reordering at every size.** What changes
is whether the MEASURE changes with it: at and below 9 cells the crossing count
is invariant, and from 13 cells up it moves by up to 2.1x. **Below about 9
parts, a block's measured quality is a property of the block; above it, it is
partly a property of the order somebody typed the components in.** That bears
directly on §2.1's generation manifest and §3.3's baseline.

3. Block size against every measure
--------------------------------------

`[RAN]` `v-bare` - the policy that was best on four of five circuits in the first
spike. `xnet` is crossings between different nets. `internal b/e` excludes every
edge touching a port glyph.

| block | parts | ports | canvas | aspect | xnet | edges | **bends/edge** | internal b/e |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `standin-low-cut` | 1 | 2 | 215x129 | 1.67 | 0 | 2 | **1.00** | 1.00 |
| `standin-mid` | 1 | 2 | 125x144 | 0.87 | 0 | 2 | **1.00** | 1.00 |
| `standin-hi-boost` | 2 | 2 | 227x199 | 1.14 | 0 | 3 | **0.67** | 0.00 |
| `standin-low-boost` | 2 | 3 | 235x159 | 1.48 | 0 | 4 | **1.50** | 1.50 |
| `leg-collector` | 2 | 2 | 207x187 | 1.11 | 0 | 4 | 2.00 | 2.50 |
| `leg-upper` | 3 | 2 | 354x190 | 1.86 | 0 | 5 | 2.00 | 2.00 |
| `leg-feedback` | 3 | 2 | 390x190 | 2.05 | 0 | 5 | 2.00 | 2.00 |
| `leg-lowerA` | 3 | 2 | 378x190 | 1.99 | 0 | 5 | 2.00 | 2.00 |
| `leg-lowerB` | 3 | 2 | 378x190 | 1.99 | 0 | 5 | 2.00 | 2.00 |
| `standin-hi-cut` | 4 | 2 | 256x289 | 0.89 | 0 | 7 | **1.00** | 1.00 |
| `oc-power` | 8 | 4 | 831x267 | 3.11 | **0** | 20 | 2.70 | 2.67 |
| `pultec-low-boost` | 9 | 3 | 469x385 | **1.22** | 5 | 23 | 2.13 | 2.07 |
| `pultec-low-cut` | 9 | 2 | 592x315 | 1.88 | 4 | 24 | 2.46 | 2.12 |
| `oc-audio` | 12 | 7 | 944x640 | 1.48 | **28** | 37 | **2.89** | 2.82 |
| `pultec-hi-cut` | 13 | 2 | 878x295 | 2.98 | 16 | 33 | 2.48 | 2.27 |
| `oc-sidechain` | 17 | 6 | 1178x650 | 1.81 | 20 | 39 | 2.51 | 2.26 |
| `pultec-hi-boost` | 17 | 2 | 1361x290 | **4.70** | 14 | 32 | **1.66** | 1.63 |
| `pultec-mid` | 28 | 3 | 2716x410 | **6.63** | 37 | 53 | **1.77** | 1.75 |
| *(parent)* `optical-compressor` | 37 | 9 | 3663x904 | 4.05 | **293** | 139 | **3.18** | 3.13 |
| *(parent)* `pultec-three-band` | 76 | 3 | - | - | **ELK REFUSED, 3/3** | - | - | - |

`[RELAYED]` For comparison, the first spike's whole-circuit `v-bare` row:
`opamp-buffer` 2.64, `transistor-preamp-lab` 2.86, `pt2399-core` 2.95,
`pultec-low-boost` 2.97, `pultec-hi-boost` 2.19; probe 1.72.

**The headline, and the qualification that goes with it.**

- **Bends per edge improves.** Range moves from 2.19-3.27 to **0.67-2.89**.
  **6 of 18 blocks beat the 1.72 probe**; the first spike beat it 0 of 14.
  12 of 18 are at or below 2.00.
- **But size is a weak predictor.** `[RAN]` Spearman rho over the 18 blocks is
  **+0.57** for bends/edge and **+0.15** once port edges are excluded. A 28-part
  block (1.77) beats a 3-part block (2.00). Under the horizontal policy the
  picture is different and much stronger - rho **+0.92**, internal **+0.87** -
  which says the monotone size effect is a property of that policy, not of ELK.
- **Inter-net crossings are where size really tells.** Zero on every block of 8
  parts or fewer. Then 4, 5, 14, 16, 20, 28, 37 - and 293 on the 37-part parent.
  **Crossings grow faster than linearly in parts, and bends per edge does not.**
- **Aspect gets WORSE with size while bends/edge gets better.** `pultec-mid` at
  28 parts scores a good 1.77 on a **6.63:1** canvas; `pultec-hi-boost` 1.66 on
  **4.70:1**. The parent calls a 1:1.97 ribbon unusable. **Bends per edge and
  aspect disagree about these two blocks, and only one of them is the thing a
  reader meets.**
- **The policy result from the first spike holds and sharpens.** `h-rails` is
  worse on bends/edge for **17 of 17** blocks that laid out (2.00-3.73), and it
  is the policy that makes `oc-audio` crash.

4. The paired control - the same circuit, whole and in blocks
----------------------------------------------------------------

`[RAN]` **This is the measurement the first spike could not make.** Every block
above comes out of a parent the repository also declares as one network.
Emitting those parents through the same converter, same policy, same skin makes
one comparison where the ONLY difference is whether ELK saw the circuit whole or
a declared block at a time.

### `optical-compressor`, `v-bare` - 37 parts either way

| | parts | aspect | xnet | edges | bends/edge | wire length |
| --- | --- | --- | --- | --- | --- | --- |
| **whole** | 37 | 4.05 | **293** | 139 | **3.18** | **159 967** |
| `oc-power` | 8 | 3.11 | 0 | 20 | 2.70 | |
| `oc-audio` | 12 | 1.48 | 28 | 37 | 2.89 | |
| `oc-sidechain` | 17 | 1.81 | 20 | 39 | 2.51 | |
| **the three blocks** | 37 | worst **3.11** | **48 total** | 96 | **2.70** | **35 070** |

**6.1x fewer inter-net crossings, 4.6x less wire, and the worst block's aspect
is better than the whole's.** `v-rails` gives the same shape: 267 -> 47, 3.27 ->
2.68, 5.04 -> 3.14.

**The blocks have FEWER EDGES than the whole, 96 against 139**, and that is the
mechanism rather than a curiosity: the parent's maximum net degree is 19 and no
block's exceeds 7. A ground that fans to nineteen pins across one sheet becomes
four smaller fans, and the edges that disappear are the ones that were crossing
everything.

### `pultec-three-band`, `v-bare` and `v-rails` - 76 parts

| | result |
| --- | --- |
| **whole** | **ELK REFUSED, 3/3, both vertical policies** |
| the five sections | all five lay out, 3/3 each; xnet total **76**, bends/edge **2.04**, worst aspect 6.63 |

Under `h-rails`, where the whole does lay out: whole **373** crossings, **3.56**
bends/edge, **8.37:1**; the five sections total **239** crossings, **3.37**, worst
aspect 4.05. **A real but much smaller gain - and the 28-part `pultec-mid` at
3.73 is WORSE than its own parent.** Decomposition is not uniformly a win per
block; it is a win in the totals and in whether the thing completes at all.

5. The crash (question 3)
----------------------------

`[RAN]` **It reproduces at block scale, and decomposition is what contains it.**

`oc-audio` - a 12-part declared `include()` block - refuses 3/3 under `h-rails`
with the identical message `docs/known-gaps.md` **G94** records:

```
Error: java.lang.IllegalStateException: Invalid hitboxes for scanline
       constraint calculation.
```

`circuits/optical-compressor/parts/audio-path.ts` declares G94's exact recipe:
`signal_opamp` unit A has `in-` and `out` both on `BUF_OUT` (the spec's
unity-gain input buffer), and `attenuator_series_resistor` hangs off that same
net.

**Swept.** `[RAN]` All 2^8 = **256 orientation assignments** of that block's
eight passives: **45 fail**. The smallest failing set is **two components** -
`attenuator_series_resistor` and `input_coupling_cap` drawn horizontally.

**Narrowed, and it corrects half of G94.** `[RAN]`

| arm | result |
| --- | --- |
| is the lateral horizontal in every failing set? | **45 of 45.** `input_coupling_cap`: 32 of 45 |
| break the op-amp self-loop, leave everything else | **0 of 256 fail** |
| remove the lateral off the self-loop net, keep the loop | **32 of 128 still fail** |
| remove the lateral AND break the rheostat strap on `gain_terminal` | **31 of 128 still fail** |

**The self-loop is necessary. A lateral on the self-loop net is NOT.** G94 says
"removing either lays out cleanly"; at this block that holds for the self-loop
half and fails for the lateral half - delete `attenuator_series_resistor` and a
different horizontal passive takes its place. **Whether that is a correction to
G94 or a second sufficient condition in a different circuit cannot be settled
from here**, because G94's narrowing was done on `opamp-buffer` and this is
`oc-audio`. What is settled is that breaking the self-loop clears all 256.

**And the parents are worse than their blocks.** `[RAN]`

| | h-rails | v-bare | v-rails | self-loop cells |
| --- | --- | --- | --- | --- |
| `WHOLE-optical-compressor` 37 | **REFUSED** | ok | ok | 3 |
| its three blocks | 1 of 3 refused | 3 of 3 ok | 3 of 3 ok | |
| `WHOLE-pultec-three-band` 76 | ok | **REFUSED** | **REFUSED** | 4 |
| its five sections | 5 of 5 ok | 5 of 5 ok | 5 of 5 ok | |

**The 76-part Pultec reference refuses under the DEFAULT vertical policy, and
every one of its five declared sections lays out.** Its four self-loop cells are
the strapped wipers of `RV_LO_CUT`, `RV_LO_BOOST`, `RV_HI_Q` and `RV_MID` -
`circuits/transistor-preamp/parts.ts` states the strap as a deliberate
repository-wide convention ("every leg fails to its MAXIMUM resistance"), so this
shape is not rare here. `pultec-mid` carries one of those four on its own and
lays out fine.

**`[RAN]` A single-flip sweep over all 18 blocks - 108 flips, one passive each -
produced ZERO failures.** The crash needs at least two.

6. Congruence (question 4)
-----------------------------

`[RAN]` Disjointness is trivially satisfied inside one block and is not reported
as an improvement. **G97's second half is the live question**, and the answer is
the opposite of what it measured flat.

`circuits/transistor-preamp/lab-board.ts` declares four structurally identical
bias legs through one constructor. Laid out ALONE, `v-bare`, offsets between cell
top-left corners:

| leg | canvas | jumper -> floor | floor -> trim | jumper top-left |
| --- | --- | --- | --- | --- |
| `leg-upper` | 354x190 | (+107, +28) | (+54, +65) | (81, 22) |
| `leg-feedback` | 390x190 | (+125, +28) | (+54, +65) | (81, 22) |
| `leg-lowerA` | 378x190 | (+119, +28) | (+54, +65) | (81, 22) |
| `leg-lowerB` | 378x190 | (+119, +28) | (+54, +65) | (81, 22) |

`[RELAYED]` G97, the same four legs inside one flat 32-part drawing: outer link
spanning **-912 to +564**, one leg running the opposite direction from the other
three.

**Every vertical offset is identical. The floor-to-trim vector is identical. The
starting corner is identical.** The only difference is one x value, and `[RAN]`
**it is predicted exactly**: jumper -> floor dx = `6 * len(component id) + 5`,
giving 107 / 125 / 119 / 119 for ids of length 17 / 20 / 19 / 19 - **4 of 4
match to the pixel.** 6 px per character is the 0.6 em at 10 px monospace the
skin uses. **The blocks are congruent; the drawn width of the component's NAME is
what separates them.**

**Two qualifications, both measurable.** `[RAN]` Under `v-rails` the congruence
BREAKS: `leg-upper` lands at (91, 42) on a 364x210 canvas while `leg-feedback`
stays at (81, 22) on 390x190, and the floor-to-trim vector splits +54 / +44.
The cause is the rail glyph - `leg-upper` runs from `VCC` and gets a `vcc`
symbol, `leg-feedback` runs from `COLLECTOR` and gets none. **Adding a rail
symbol to one of two identical blocks stops them drawing alike.** Under
`h-rails` the four legs stay congruent in shape and the canvas widths diverge
further (480 to 536).

7. What a block boundary costs (question 5)
----------------------------------------------

`[CODE]` A declared port becomes a CELL: netlistsvg emits an `inputExt` arrow
glyph, 30x20, one pin on the right, and ELK lays it out like any other node. It
is not free annotation.

`[RAN]` `v-bare`, port glyphs classified from the input's own `ports` declaration:

| block | parts | ports | port glyphs as share of cells | port edges | **bends/edge, port** | **bends/edge, internal** |
| --- | --- | --- | --- | --- | --- | --- |
| `standin-mid` | 1 | 2 | **0.67** | 2 of 2 | 1.00 | - |
| `standin-low-boost` | 2 | 3 | **0.60** | 4 of 4 | 1.50 | - |
| `leg-upper` | 3 | 2 | 0.40 | 2 of 5 | 2.00 | 2.00 |
| `oc-power` | 8 | 4 | 0.33 | 14 of 20 | 2.71 | 2.67 |
| `pultec-low-cut` | 9 | 2 | 0.18 | 8 of 24 | **3.12** | 2.12 |
| `oc-audio` | 12 | 7 | 0.35 | 15 of 37 | 3.00 | 2.82 |
| `pultec-hi-cut` | 13 | 2 | 0.13 | 11 of 33 | **2.91** | 2.27 |
| `oc-sidechain` | 17 | 6 | 0.25 | 16 of 39 | 2.88 | 2.26 |
| `pultec-hi-boost` | 17 | 2 | 0.11 | 2 of 32 | 2.00 | 1.63 |
| `pultec-mid` | 28 | 3 | 0.10 | 5 of 53 | 2.00 | 1.75 |
| *(parent)* `optical-compressor` | 37 | 9 | 0.19 | 39 of 139 | 3.31 | 3.13 |

- **The boundary is the bendy part.** Port edges carry more bends per edge than
  internal edges on **every one of the 8 blocks of 8 parts or more**, and on the
  parent, by up to 1.5x (`pultec-low-cut`, 3.12 against 2.12). Of the seven
  smaller blocks that have both kinds of edge, five are equal and one
  (`leg-collector`) is lower.
- **The finer the cut, the more of the drawing is boundary.** A 1-part block's
  drawing is **two-thirds port glyphs**; a 28-part block's is one tenth. Cutting
  blocks smaller trades crossings for boundary.
- **Port glyphs land in the interior, not at an edge.** `[RAN]` Measured as a
  fraction of canvas width: `pultec-low-cut` puts `hi_boost_out` at 0.87 and
  `output` at 0.29; `pultec-mid` puts `ground` at 0.91, `input` at 0.72 and
  `hi_boost_out` at 0.01; `pultec-hi-boost` puts `input` at 0.02 and
  `hi_boost_out` at 0.06 - **the two interface ports adjacent, in the left
  twentieth of a 1361-wide sheet.** ELK is not told a port is a boundary and
  does not treat it as one.
- **Every arrow points the same way.** H5: the IR has no port direction, so all
  of them are `inputExt`. On `leg-upper` the exit port `to` draws as an arrow
  pointing INTO the trim-pot.
- **`[RAN]` Dangling nets are rare and all declared.** Across 18 blocks, 20
  single-pin nets, and **every one of them is a declared port** - zero
  undeclared. A block cut by `include()`, by `OWNERSHIP` or by a stand-in's
  `boundary` does not leave a net hanging that the declaration does not name.

8. Looked at - the drawings, read
------------------------------------

`[RAN]` Rendered at 2x and read.

### `leg-upper`, 3 parts, `v-bare` - the smallest thing that is still wrong

Flow is left-to-right and top-to-bottom and the resistor is recognisable. Then:
**the jumper and the trim-pot both draw as unlabelled boxes reading `generic`**,
so two of three parts are mutually indistinguishable (H6). **The rheostat strap -
wiper and cw on one net, the repository's deliberate failure-mode convention -
draws as a large empty rectangle of wire** looping out of `out0`, around the
bottom, back into `in1`: a reader takes a box around nothing as a boundary, and
it costs 4 of the drawing's 10 bends. And the exit port `to` is an inbound arrow
placed mid-sheet. **At three parts, with zero crossings and a congruent layout,
the drawing still has three defects a reader would trip on.**

### `standin-hi-cut`, 4 parts, `v-bare` - the one that simply reads

A vertical ladder with junction dots, the pot's two arms in series down the
right, `R1` returning on the left, both ports labelled. **This is a correct and
legible schematic.** Its one fault is that `RV_HI_CUT.ccw-wiper` runs off the
right edge of a 256-wide canvas.

### `oc-power`, 8 parts, `v-bare` - zero crossings, wrong story

A rail bus along the top and a ground bus below it, the divider in the middle,
every decoupling capacitor hanging between them. Zero inter-net crossings. But
**the power entry is in the bottom-right corner**: `supply_input` at x = 0.75,
the protection diode below it pointing down, `ground` at x = 0.86. **The supply
enters at the right and works leftwards**, which is backwards, and the connector
is another unlabelled `generic` box. Two labels run off the right edge.

### `oc-audio`, 12 parts, `v-bare` - where it stops working

28 crossings on twelve parts. **`signal_opamp:A`, the input buffer, sits at mid
RIGHT; `signal_opamp:B`, the makeup amplifier downstream of it, sits at bottom
LEFT.** The signal runs right, then left, then right again, in a block whose
whole job is one series chain. `output_pulldown_resistor` sits inside a closed
rectangle of wire. The seven port arrows are scattered - `rail` far left,
`makeup_output` top left, `bias` bottom centre, `output` at x = 0.69. **This is
the first spike's `pt2399-core` complaint, reproduced on twelve parts.**

### `pultec-hi-boost`, 17 parts, `v-bare` - 1.66 bends per edge and a 4.7:1 ribbon

The four tapped inductors in a row, the capacitor bank beneath, the selector
fanning out to it - **the one idiom the first spike said reads, and it reads
better here than it did on the physical board.** And: 1361 x 290. `input` at
x = 0.02 and `hi_boost_out` at 0.06, adjacent at the far left, so there is no
flow direction. The bank is **not in frequency order** - C2a2, C15, C16, C17,
C4a2, C14 left to right. `L_HI_BOOST_100MH` runs off the right edge.

### `pultec-mid`, 28 parts, `v-bare` - the best bends/edge in the large group

1.77 bends per edge on a **2716 x 410, 6.63:1** sheet. Seventeen capacitors in
one row, out of frequency order (200, 300, 500, 700B, 700A, 2kB, 2kA, 4kA, 4kB,
5k, 3kB, 3kA, 1kA, 1kB, 1k5, 7kB, 7kA), eleven selector throws fanning across
the full width, `input` at x = 0.72 and `ground` at 0.91. **Low bends per edge
is not the same thing as readable, and this drawing is the proof.**

### `WHOLE-optical-compressor`, 37 parts, `v-bare` - what the blocks are being compared against

3663 x 904, 293 crossings, 48 cells, and the one diagonal. Rails run the full
width across the top; both op-amp packages' four sections are scattered to four
different regions; the detector chain crosses the sheet three times. **Put the
three block drawings beside it and the case for decomposing is visual before it
is numeric.**

9. Is there a size at which output stops being acceptable? (question 2)
--------------------------------------------------------------------------

`[RAN]` Three different measures put the break in three different places, and
that is the answer:

| what changes | where |
| --- | --- |
| inter-net crossings stop being zero | between **8 and 9 parts** (0 at 8, then 4, 5, 14, 16, 20, 28, 37) |
| crossing count stops being a property of the block and starts tracking declaration order | between **9 and 13 cells** (§2.1: invariant at 9, moves 22-29 at 13) |
| arrangement stops telling the circuit's story | **12 parts** (`oc-audio` §8), and it is already shaky at 8 (`oc-power`) |
| aspect leaves the parent's stated bound | **17 parts** (4.70:1 and, at 28, 6.63:1) |
| bends per edge | **never, monotonically** - the 28-part block beats five smaller ones |

**The number that is directly useful to the design is about nine parts**, and it
is the same number from two independent measures. Below it a block draws with
zero crossings and a quality that does not move when somebody reorders the
source file. **It is not the number at which drawings become GOOD** - `leg-upper`
at three parts has three legibility defects - it is the number below which
quality is determined and above which it is not.

**And a cut that fine is expensive.** §7: at 1-4 parts, port glyphs are
33-67 % of the cells. **The size at which a block draws predictably is close to
the size at which the drawing is mostly boundary.**

10. Minor reproducible defects at block scale
------------------------------------------------

`[RAN]`

- **Labels past the right-hand canvas edge: 26 of 53 block drawings** (11/18
  `v-bare`, 10/18 `v-rails`, 5/17 `h-rails`), against 5 of 14 at whole-circuit
  scale. **The canvas-sizing defect gets MORE common at block scale**, because
  the canvas shrinks and the component ids do not. Worst overflow 13 px.
- **Duplicate wire segments: 0-80 per drawing.** Any crossing measure that does
  not collapse them double-counts.
- **Zero-length segments: 0-5 per block drawing** (10 on a parent). True
  diagonals: 0 on all 53 blocks, 1 on one parent - §2.
- **The `generic` symbol's own two texts overlap** in every drawing containing
  one; 0-3 label-on-label overlaps per drawing, all of that pair.
- **Wires through text: 0-16 per drawing, on 31 of 53.**

11. What this spike did not test
-----------------------------------

- **A template.** Still none, in either spike. Seam A as designed sends ELK the
  subgraph *left over* after templates have drawn their neighbours; this
  harness gives it the whole block with no neighbourhood at all. **These numbers
  are a block in isolation, and seam A's block is a block in context.** That gap
  is the biggest assumption in the document.
- **Everything in §1.4.** Output is SVG. No grid snapping, junction emission,
  symbol transforms, re-validated clearance or refusal-on-invalidated-route.
- **The round trip (§2).** Nothing exported through `kicad-cli`.
- **Seam B, and how block drawings would be composed onto one sheet.** Each
  block was drawn on its own canvas. The totals in §4 add up crossings across
  three sheets; a mechanism that put them on one sheet would add its own.
- **Any block above 28 parts.** The repository declares none.
- **Whether the ~9-part figure in §9 transfers.** It comes from 18 blocks out of
  two parents, and both parents are unusual - one is a 76-part passive EQ, the
  other a 37-part compressor with two dual op-amps.
