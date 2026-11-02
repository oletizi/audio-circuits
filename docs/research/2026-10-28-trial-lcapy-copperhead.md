# Hands-on trial: Lcapy and Copperhead on pultec-low-boost

**Date:** 2026-10-28
**Circuit:** pultec-low-boost (19 parts, 14 nets, as exported by KiCad from this
project's own model)
**What this is:** a trial, not a survey. Both tools were installed and run, the
circuit was drawn with each, every page was rendered and looked at, and the
resulting netlist was compared back against the specification. Nothing below is
read off a README.

Renders live outside the repo, under the session scratchpad:

```
/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/
  7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/trial-lcapy-copperhead/
  RENDERS-pultec-low-boost/
```

## Verdict first

| | Lcapy | Copperhead |
| --- | --- | --- |
| Installed and ran | yes | yes |
| Needed an LLM / API key | no | **no** (`draft schematic` is deterministic) |
| Drew the 6-way rotary | **NO — faked** | **yes, natively** |
| Drew the MP mounting lug | **NO — absent** | **yes**, as a no-connect |
| Drew the pot's two separately landed wiper pins | **NO — faked as a rheostat** | **yes** |
| Drew the 5-pin connectors | **NO — omitted** | yes |
| Netlist matches spec | yes, after 4 attempts and 3 documented fakes | **yes, exactly, first try** |
| ERC clean | n/a (not a KiCad file) | **0 errors, 0 warnings** |
| Output is editable downstream | no (circuitikz/PDF) | **yes, a real `.kicad_sch`** |
| Effort to a sensible page | **high** — see below | **one JSON file** |

**Copperhead is the better tool for this circuit, and the earlier
recommendation to reject it was wrong.** It was rejected on the basis of
reading `draft/ir.ts` and seeing "No coordinates, ever — the engine computes
every position", without rendering anything. The page it actually produces is a
properly framed A4 KiCad sheet with a title block, grouped subsystems, correct
symbols, zero label overlaps and zero wire crossings. Its real weakness is
sheet utilisation (21% ink), not correctness or legibility.

## The rotary switch — the thing that invalidates comparisons

The brief warned that tools silently substitute something else for a rotary
selector. Measured result:

**Lcapy has no rotary switch of any kind.** Enumerated directly from the
installed package (`lcapy.schemcpts.classes`), the complete switch vocabulary is
`SW`, `SWnc`, `SWno`, `SWpush`, `SWspdt`. The widest is SPDT — three terminals.
A 1-pole 6-way selector needs eight (6 contacts + common + lug). **This was
faked** as six independent normally-open SPST switches on a shared bus. That is
not the same circuit: six SPSTs can select several caps at once, or none; a
1-pole rotary selects exactly one. `SW1.MP` is simply absent — Lcapy has no
mechanical pad.

**Copperhead drew the real part.** `Switch:SW_Rotary_1x6_MP` exists in KiCad
10.0.5's library with pins `1..6`, `7` and `MP` — an exact match for this
netlist, mounting lug included. Copperhead resolves symbols from the real KiCad
libraries, so anything KiCad has, it can draw. `SW1.MP` was declared in
`noConnect` and came out as a proper no-connect marker, landing on its own
`unconnected-(SW1-PadMP)` net in the exported netlist. **No fake was needed
anywhere in the Copperhead drawing.**

This single difference is decisive for this repository: the circuits here are
full of rotary selectors and mechanical lugs.

---

## Trial 1 — Lcapy

Installed `lcapy 1.26` into a venv. Rendering needs LaTeX + circuitikz, which
was not present; TinyTeX was installed into the scratchpad and
`circuitikz`/`pgf`/`siunitx`/`standalone` added with `tlmgr`. Lcapy's own PNG
path then worked via `pdftoppm`.

### How much do you have to say to get a sensible drawing?

**A great deal. With no hints at all it refuses to draw.** The netlist alone
produces:

```
RuntimeError: The vertical schematic graph has a loop. For example, a node
needs to be both above and below another node.
```

Lcapy does not place anything by itself. Every component needs a direction, and
the directions must form a globally consistent partial order in x and in y. The
tool is a constraint solver you hand a layout to — it is not an autoplacer.

**What it decides for you:** only the spacing between things and the final
coordinates. You decide the topology of the drawing, every direction, and in
practice most lengths.

**What it costs when you get it wrong:** the refusals are the worst part. They
name no component:

```
The horizontal schematic graph has a loop.
The horizontal schematic graph is dodgy, probably a component is attached to
  the wrong nodes or a direction attribute is bogus.
```

To find the offending line I had to write a bisector
(`lcapy/narrow.py`) that adds lines cumulatively and reports the first one that
breaks position solving. **With 34 lines and no line numbers in the error, this
is not optional tooling — it is required to work at all.**

### Sharp edges found by running it

1. **Component kind is inferred from the designator prefix, so this project's
   designators are unusable.** `SI8 in 0 100e3` fails with
   `Syntax error: Too many args ... Expected format: Sname box` — `SI*` is
   parsed as Lcapy's `S` (shape) rule. Every part had to be renamed
   (`RSI8`, `CSI3`, …) and the true designator restored through a `l=` label
   override. **A tool whose type system is the reference designator cannot take
   this repository's netlists as-is.**
2. **Comment character is `#%*`, not `;`.** Header lines written with `;` were
   silently parsed as components and produced a LaTeX failure far downstream
   (`I do not know the key '/tikz/No lengths'`). The error pointed at the TeX,
   not at the comment.
3. **Values must not carry a unit letter.** `0.33uF` throws
   `Invalid expression`; `0.33u` is fine. Left to itself Lcapy then formats
   `100e3` as **`0.1 MΩ`**, not `100k` — every value needed an explicit `l=`
   override to read correctly.
4. **No multi-pin connector.** J1/J2 were omitted and faked as labelled stubs.
5. **The potentiometer cannot be drawn with its wiper strapped.** RV1.2 and
   RV1.3 are both on `lo_boost_in`. Lcapy's 3-terminal `RV` plus a tie-back
   wire either refuses to place, or, with the wire marked `free`, **draws a
   diagonal line slashing across the pot body** (visible in `lcapy-1.png`). It
   was redrawn as a variable resistor, which is the conventional symbol for a
   strapped pot but loses the fact that pins 2 and 3 are separately landed.
6. **`autoground` does not work.** The documented draw kwarg draws no ground
   symbol. Grounds must be drawn by a separate short wire carrying `sground`.
   Putting `sground` on the component instead makes Lcapy **print the
   component's label twice** — once by the part and once by the ground symbol
   (visible in `lcapy-2.png`).

### Can it express the capacitor bank fanning into the rotary?

Yes, and this is Lcapy's best moment. Two shapes were tried:

- **Attempt 1** — a horizontal bus with six switch droppers. Works, but the
  capacitor value labels are **struck through by the neighbouring capacitor's
  plates** (`C5=47nF`, `C4=68nF`, `C3=0.12µF`, `C2=0.22µF` all collide).
- **Attempts 2–4** — a vertical comb: ground rail | capacitor | switch contact |
  common bus. This is how a selector bank is conventionally drawn, it reads
  well, and it removes every label collision.

The comb is a good drawing. But note what produced it: **I chose it.** Lcapy
contributed the spacing.

### Iteration (all four pages saved)

| Page | What changed | What the render showed |
| --- | --- | --- |
| `lcapy-1.png` | directions only | draws, but cap labels struck through by neighbouring plates; switches labelled nonsense `SW1f=0` (Lcapy printing the switch's `Time` parameter); `SI8` reads `0.1 MΩ`; diagonal slash across the pot; grounds are bare open circles; every scaffolding node name printed as clutter |
| `lcapy-2.png` | `l=` labels, comb layout, grounds, node labels off | all collisions gone and values correct — but `sground` on a component **duplicated** the `SI8` and `RV1` labels, left a stray open terminal, and the 6-row comb opened a huge empty quadrant |
| `lcapy-3.png` | grounds via separate wires; comb pitch 2.0 → 1.5 | duplicates gone — but Lcapy placed `in` directly above `lbi`, so SI8's downward ground stub and the J1.3 stub landed on the same vertical line and **the page reads as if `lo_boost_in` were grounded** |
| `lcapy-4.png` | J1.3 label moved onto the horizontal wire | clean |

**`lcapy-3.png` is the one to remember.** Nothing errored, the netlist was
still correct, and the page acquired a false statement — a grounded
`lo_boost_in` — purely from placement. No check would have caught it. Only
looking at it did.

### Final state

`lcapy-4.png`: values legible and clear of wires, no wire crossings, grounds
correct, cap bank legible. **Topology verified: all 14 nets match the spec**
(`lcapy/verify2.py`). Remaining defects: a large empty quadrant bottom-right,
no sheet frame or title block, and the three fakes above.

---

## Trial 2 — Copperhead

`git clone`, `npm install` (263 packages, 3s). Although Copperhead is marketed
as an LLM agent, **the drafting engine is a separate deterministic verb** and
the CLI says so itself:

```
draft   deterministically draft an artifact from its declared intent;
        no LLM, no network
```

Input is one file, `schematic.intent.json`, learned from
`manual-tests/reference-boards/`. It took **one attempt**:

```
npx tsx src/cli.ts --repo <board> draft schematic

drafted: 4 group(s), 78 wire segment(s), 21 label(s), 1 no-connect(s) on A4
  sheet fit: A4, ink 21% of the usable frame, compaction failed
  note: placement search: SI1 turned 90°, SI5 turned 180°, SI4 turned 90°;
        label overlaps 0 to 0, wire crossings 0 to 0
```

No API key, no network, no iteration to make it *work*. Footprints are
**optional** — only `ref`, `libId`, `value` and `group` are required, which is
consistent with this repository's position that a fully specified BOM does not
gate a schematic (G245). It did **not** ask which rotary switch is fitted, and
it did **not** object to the net names `in`, `lo_boost_in` or
`Net-(C1-Pad2)` — lowercase, underscores, parentheses and hyphens all accepted
(relevant to G150).

### Is the drawing any good?

**Yes.** `copperhead-1-four-groups.png` is a real A4 KiCad sheet:

- Proper title block: title, `Size: A4`, `Date: 2026-10-28`, `Rev: A`,
  `KiCad E.D.A. 10.0.5`.
- Four subsystem groups drawn as coloured dashed boxes with headings —
  "Interface", "Hi boost", "Lo boost", "Cap bank". Genuinely helpful.
- **Every value legible and clear of every wire.** I could read SI1 0R,
  SI2 47K, SI8 100K, SI5 0R, SI7 0R, R1 56K, RV1 47K, SI3 0.047uF, SI4 430R,
  SI6 4.7K and all six capacitor values without ambiguity.
- **Zero wire crossings**, as reported and as confirmed by eye.
- Proper GND symbols; `PWR_FLAG` synthesized automatically.
- **The rotary is drawn as a rotary** — rotor arrow, six contacts, common on
  pin 7, `MP` carrying a no-connect X.
- The cap bank fans from the six contacts down to a ground rail at six
  different wire heights so nothing crosses. This is the single best-drawn
  region across both tools.

**Would I build from it?** Yes — more readily than from the Lcapy page, and
with the decisive practical advantage that it is a `.kicad_sch` you can open,
ERC, edit and hand to a fabricator.

### Criticisms, from looking at it

1. **Sheet utilisation is poor.** 21% ink; the whole bottom-right quadrant is
   empty. The engine says so honestly ("compaction failed", "no smaller sheet
   holds the reflowed content") rather than hiding it.
2. **It draws a netlist, not a signal flow.** 21 net labels on a 19-part
   circuit. To follow `hi_boost_out` you find three separate labels in three
   boxes rather than tracing a wire. Correct, checkable, but it does not read
   like a schematic an engineer would draw by hand.
3. **Minor label overhang:** `Net-(C1-Pad2)` and `Net-(SI4-Pad1)` sit on their
   group's dashed border.
4. J2's five grounded pins each get their own stacked GND symbol — correct,
   visually repetitive.

### What the author can control

This is the complete surface, read from `src/kicad/draft/ir.ts` and confirmed
by use:

| Control | Where | Effect |
| --- | --- | --- |
| `group` | per part (**required**) | which subsystem box the part lands in — the main layout lever |
| `hints.groupOrder` | array of group names | left-to-right order of the boxes |
| `hints.paper` | string | pin the sheet size instead of deriving it |
| `hints.date` | string | title-block date; in the IR, not the wall clock, so identical IR emits identical bytes on any day |
| `kind` | per net: `power`/`ground`/`signal` | overrides pin-type inference; drives GND symbols and PWR_FLAG |
| `noConnect` | array of `REF.PIN` | emits no-connect markers — how `SW1.MP` is handled |
| `libId` | per part | the actual KiCad symbol, so symbol choice is fully the author's |
| `footprint` | per part (optional) | not required to draft |
| `SUBSYSTEMS.md` | `docs/` | supplies group order when `hints.groupOrder` is absent |

**There are no coordinates and no per-symbol nudge.** The "PLACES-row" reading
of the IR was accurate as a description; it was wrong as grounds for rejection,
because the rows the engine places are good.

To test how much that control is worth, I redrafted with the four groups merged
into two (`copperhead-2-two-groups.png`). The result is a genuine trade-off,
not an improvement:

```
ink 33% of the usable frame (up from 21%)
wire crossings 2 to 1          (v1 achieved 0)
note: hang refused: SI6 could not be placed cleanly on RV1.2
```

The signal path now reads left-to-right, which is better — but RV1 becomes
crowded, with a 90°-rotated `lo_boost_in` label jammed against the pot body,
and `lo_boost_in` now appears four times. **Version 1 is the better page.**
Author control is real but coarse: you steer by group membership and order, and
the engine does the rest.

### Verification

- **ERC: `Found 0 violations`** — 0 errors, 0 warnings, on the generated file,
  with `--severity-all`.
- **Netlist exported from the generated schematic matches the spec exactly** —
  all 14 nets, including `lo_boost_in` carrying both `RV1.2` and `RV1.3`
  (which Lcapy could not represent), plus `SW1.MP` correctly alone on
  `unconnected-(SW1-PadMP)`. Checked by `copperhead/verify_ch.py` against
  `kicad-cli sch export netlist`.

---

## Files

All under the scratchpad path given at the top, in
`RENDERS-pultec-low-boost/`:

| File | What |
| --- | --- |
| `lcapy-1.png` / `.pdf` / `.tex` | Lcapy attempt 1, directions only |
| `lcapy-2.png` / `.pdf` / `.tex` | Lcapy attempt 2, labels + comb |
| `lcapy-3.png` / `.pdf` / `.tex` | Lcapy attempt 3, the false-ground page |
| `lcapy-4.png` / `.pdf` / `.tex` | Lcapy attempt 4, final |
| `lcapy-1.source.sch`, `lcapy-4.source.sch` | the hinted netlists |
| `copperhead-1-four-groups.png` / `.pdf` / `.svg` | Copperhead, 4 groups — **the best page produced by either tool** |
| `copperhead-1-four-groups.kicad_sch` | the editable KiCad file |
| `copperhead-1.intent.json` | the whole input |
| `copperhead-2-two-groups.png` / `.pdf` / `.svg` | Copperhead, 2 groups |

## What this leaves open

- Copperhead's `create`/`do` verbs (the LLM agent) were not exercised at all.
  Only `draft schematic` was, which is the part that matters for generating a
  sheet from a model this repository already holds.
- Neither tool was tested on a multi-sheet or hierarchical design.
- Lcapy's value of being a symbolic circuit analyser — it does MNA, transfer
  functions, Laplace — was not exercised. **As a draughtsman it is weak, but
  that may not be what it is for.** If this repository ever wants symbolic
  transfer functions rather than SPICE sweeps, Lcapy is worth revisiting on
  those grounds, separately from drawing.

---

# Appendix A — two follow-up probes on Copperhead

Both probes attack the worst defect on the page in the main trial. Eleven more
variants were drafted, rendered and looked at. Driver scripts:
`copperhead/variants.py` and `copperhead/combo.py` in the scratchpad.

## Probe 1 — are the `Net-(C1-Pad2)` labels removable?

**First, a correction to the main report.** I wrote that Copperhead "draws a
netlist, not a signal flow" and counted 21 labels. That over-stated the case,
and reading the emitted file rather than the picture shows why:

```
                 (label ...)   (global_label)   (wire ...)
p1-auto               8              13             78
p1-meaningful         8              13             78
```

The `Net-(Cn-Pad2)` items are **local labels — plain text annotations sitting
on top of continuous wires**, not substitutes for them. The six capacitors are
genuinely wired to the six rotary contacts; you can trace every one. Only the
**13 global labels** actually replace a wire run. KiCad draws the two
differently and the distinction is visible once you know to look: global labels
are boxed, local labels are bare text.

**Can the names be made anonymous? No.** `ir.ts:318` rejects an empty name —
`net ... needs a string name and a pins array` — so every net is named, and
the engine's own comment says the name "is drawn as label text and embedded
verbatim in the generated" file. There is no anonymous-net concept in the IR.

**Does renaming change the drawing? Only the text — and that is still worth
doing.** With `c1_sel`…`c6_sel`, `hi_in`, `lo_t1`, `lo_t2`, the wire count,
label count and label kinds are **identical**; the geometry does not move. But
the page is materially quieter: six 13-character strings become six
6-character ones, and they say something. `probe-p1-meaningful.png` is simply a
better page than `copperhead-1-four-groups.png` at zero cost, and it is the
variant I would keep.

**The third variant was the surprise.** One-character names (`a`…`i`) did not
merely shorten text — they changed the layout: 72 wires instead of 78, and the
sheet **compacted from A4 at 21% ink to A5 at 48%**. The engine explains it:
`label reach measured: the wrap fitted again takes A5, not A4`. **Label text
length feeds the group-gap calculation, so net names are a layout input, not
just annotation.** `a`…`i` are useless names and the variant is not usable, but
it proves the mechanism — and it links Probe 1 to Probe 2, which turn out to be
the same defect seen twice.

**Reads best, of the three:** `c*_sel` (meaningful) > `Net-(Cn-Pad2)` (auto) >
`a`…`i` (tiny). The tiny names win on density and lose on meaning, which is the
wrong trade for a document someone builds from.

## Probe 2 — is the empty quadrant a paper choice or a placement defect?

**It is a placement defect, and `groupOrder` fixes it. `paper` does not.**

| Variant | Sheet | Ink | Outcome |
| --- | --- | --- | --- |
| `groupOrder` Interface, Hi, Lo, Cap (default) | A4 | 21% | compaction **failed** |
| `groupOrder` Cap, Lo, Hi, Interface | A4 | 21% | compaction **failed** |
| **`groupOrder` Interface, Cap, Lo, Hi** | **A5** | **51%** | **compacted** |
| **`groupOrder` Hi, Lo, Cap, Interface** | **A5** | **51%** | **compacted** |
| `paper: A5` | A5 | **2232%** | **overflow — unusable** |
| `paper: A3` | A3 | 9% | pinned; worse |
| `paper: USLetter` | A4 | 21% | hint refused as non-standard, derived instead |

Two of four group permutations more than double the ink and drop a whole paper
size, with **wire crossings still 0 and label overlaps still 0**. The empty
quadrant in the main trial was an artefact of the order I happened to declare.

**Forcing the paper is actively destructive.** `probe-p2-paper-A5.png`: the
"Lo boost" group box runs off the bottom of the frame and **straight through
the title block**, erasing it — the remains read `…d_sch`, `…ost`, `26-10-28`.
The **entire Cap bank group, including the rotary and all six capacitors, is
missing from the page.** The engine warns loudly and correctly rather than
hiding it:

```
content does not fit the hinted sheet (A5) even with groups and columns
  wrapped; the drawing will overflow the frame
group boxes still wrong after 3 re-tilings (a box crosses the frame by
  57.6 mm); the sheet is drawn as it stands
```

**And this is the finding that matters most to this repository: `kicad-cli sch
erc --severity-all` reported `Found 0 violations` on that page.** A sheet with
a third of the circuit missing and the title block destroyed passes ERC
cleanly, because ERC checks connectivity, not draughtsmanship. It is a
textbook false green of the kind `docs/schematic/false-greens.md` catalogues,
and the only thing that caught it was rendering the page and looking at it.
**Any gate built on ERC alone would have passed this.** `hints.paper` should be
treated as a pin for a sheet already known to fit, never as a way to make
content smaller.

## The combination, and which page wins

`probe-combo-iface-last.png` applies both results at once — meaningful names
plus a compacting order: **A5, 48% ink, 0 crossings, 0 label overlaps, ERC
clean**, with the clean `c*_sel` fan. It is the densest legible page produced
in this trial.

**But it is not unambiguously the best, and the reason is worth recording.**
The compacting orders make the placement search mirror parts: `SI1 turned 270°,
SI2 turned 270°`. The Hi boost chain then reads **right-to-left** — `hi_in`
sits to the left of SI1 and `in` to its right, the reverse of the signal. It is
electrically identical (a resistor has no polarity) and it still passes every
check, but a person tracing the page has to read that block backwards. The A4
pages keep left-to-right flow.

So:

- **Best for reading / handing to a builder:** `probe-p1-meaningful.png` —
  A4, 21% ink, left-to-right signal flow, clean short net names. Wasteful of
  paper, easiest to follow.
- **Best for page economy:** `probe-combo-iface-last.png` — A5, 48% ink, same
  clean names, but two mirrored resistors in Hi boost.

Both are better than the page in the main trial. **The verdict on Copperhead
improves: the two defects I reported are each controllable from the IR, by one
line each, and neither required touching the engine.** What remains genuinely
outside the author's reach is symbol-level orientation — you cannot tell it to
stop mirroring SI1.

## Appendix files

All in `RENDERS-pultec-low-boost/`:

| File | What |
| --- | --- |
| `probe-p1-meaningful.png` / `.pdf` | **meaningful net names, A4 — best for reading** |
| `probe-p1-tiny.png` / `.pdf` | 1-char names; proves names drive layout |
| `probe-combo-iface-last.png` / `.pdf` / `.intent.json` | **names + order, A5 48% — best page economy** |
| `probe-p2-order-iface-last.png` / `.pdf` | order alone, A5 51% |
| `probe-p2-order-bank-mid.png` / `.pdf` | the other compacting order, A5 51% |
| `probe-p2-order-bank-first.png` / `.pdf` | a non-compacting order, A4 21% |
| `probe-p2-paper-A5.png` / `.pdf` | **the overflow: title block destroyed, Cap bank missing, ERC still clean** |
| `probe-p2-paper-A3.png` / `.pdf` | A3, 9% ink |

---

# Appendix B — can any automated gate catch the overflow page?

The `paper: A5` variant was regenerated and its project kept, because the
question it answers decides what a checking practice has to require. Project,
schematic, netlist, ERC report and render are at
`RENDERS-pultec-low-boost/probe-p2-paper-A5-project/`. The regenerated render
is byte-for-byte the same size as the original (66,877 bytes), so this is the
same page.

## The answer: the parts are PRESENT in the file, drawn off-frame

**Not absent. Present, complete, correctly wired, and plotted off the sheet.**

A5 is 210 x 148 mm. Nine of the 29 symbol instances sit below the bottom edge:

| Ref | Lib id | X mm | Y mm | How far below the 148 mm edge |
| --- | --- | --- | --- | --- |
| SW1 | `Switch:SW_Rotary_1x6_MP` | 69.85 | **168.91** | 20.9 mm |
| C6 | `Device:C` | 80.01 | **181.61** | 33.6 mm |
| C5 | `Device:C` | 92.71 | **181.61** | 33.6 mm |
| C4 | `Device:C` | 107.95 | **181.61** | 33.6 mm |
| C3 | `Device:C` | 123.19 | **181.61** | 33.6 mm |
| C2 | `Device:C` | 137.16 | **181.61** | 33.6 mm |
| C1 | `Device:C` | 152.40 | **181.61** | 33.6 mm |
| PWR01 (GND) | `copperhead_power:GND` | 80.01 | **187.96** | 40.0 mm |
| FLG01 (PWR\_FLAG) | `copperhead_power:PWR_FLAG` | 152.40 | **187.96** | 40.0 mm |

Every other instance is on-sheet. The full y range of the drawing is
27.9 .. 188.0 mm against a 148 mm page. **35 of 77 wire start points are also
off-sheet.** So the entire Cap bank — the rotary, all six capacitors, their
ground symbol and the only PWR\_FLAG — is plotted 21 to 40 mm past the bottom
of the paper. `kicad-cli sch export pdf` clips at the frame, so they are
simply not on the page. The loss happens at plot time, not at emit time: open
the same file in the KiCad GUI and everything is there.

## What each gate sees

| Gate | Exit code | What it reported | Catches it? |
| --- | --- | --- | --- |
| `kicad-cli sch erc --severity-all --exit-code-violations` | **0** | `Found 0 violations` | **NO** |
| Netlist vs the circuit model | — | 19/19 components; **all 14 spec nets match exactly** | **NO** |
| `copperhead score schematic` | 0 | **40/100** vs **83.4/100** for the good A4 sheet; `10 error-severity legibility finding(s) cap the composite below the known-good floor (85)` | **YES — but advisory** |
| `copperhead draft schematic --json` | 0 | `report.sheetFit.compaction = "overflow"`, `ok: true` | **YES — but advisory** |
| Rendering the page and looking | — | a third of the circuit gone, title block erased | **YES** |

**The netlist comparison is blind, and this is the load-bearing result.** It is
not that the gate is too weak — it is structurally incapable. The file contains
all 19 components, and the exported netlist reproduces **all fourteen specified
nets exactly**, `lo_boost_in` with all seven pins including `SW1.7`, and
`SW1.MP` alone on its unconnected net. A netlist diff against the circuit model
returns a perfect match for a page that is missing its biggest subsystem.
**No connectivity check of any kind can see this defect, because connectivity
is not what is broken.**

So the coordinator's second hypothesis is the correct one — with one important
amendment.

## The amendment: it is not true that only looking can catch it

Copperhead emits two machine-readable signals and **acts on neither**:

- `draft --json` puts `"compaction": "overflow"` in `report.sheetFit`, and the
  prose notes in `report.notes[]`.
- `score schematic` scores the page **40/100 against 83.4/100** for the good
  sheet, and names the cap rule explicitly.

A cheap programmatic gate therefore does exist. It just is not the one anybody
would reach for by default, and **it is not ERC**.

## Does a script notice? No — and this is the trap

Measured exactly:

```
draft schematic           EXIT CODE: 0      STDERR: 0 bytes
draft schematic --json    EXIT CODE: 0      "ok": true
score schematic           EXIT CODE: 0      (score 40/100)
kicad-cli sch erc         EXIT CODE: 0      Found 0 violations
```

**Every warning goes to stdout; stderr is empty; every exit code is zero.**
`src/cli.ts` calls `process.exit(0)` unconditionally once drafting succeeds —
"succeeds" means the IR validated, not that the sheet fits. The `score` verb's
own description calls its exit code "advisory", and it is: a 40/100 page exits
0 exactly like an 83.4/100 one.

A script written the obvious way —

```
copperhead draft schematic && kicad-cli sch erc ... && echo ok
```

— prints `ok` for a sheet with a third of the circuit missing and the title
block destroyed. **Both commands succeed. Both are telling the truth about the
question they were asked.** Nobody asked whether the drawing fits.

## What this requires of a checking practice

1. **A netlist-equivalence check against the model cannot be the draughtsmanship
   gate.** It passes this page perfectly. It remains the right check for
   connectivity and should be kept — but it must never be cited as evidence
   that a sheet is drawable.
2. **ERC is weaker still** and must never stand alone.
3. **The gate that works is an assertion on the drafter's own fit report** —
   refuse when `report.sheetFit.compaction == "overflow"`, and treat
   `score schematic` below the tool's stated known-good floor of 85 as a
   failure. Both are one line and neither exists by default.
4. **Exit codes here are not a signal.** Anything driving this tool must parse
   `--json`, not test `$?`.
5. **Rendering and looking remains the backstop**, because the three defects
   this trial actually found by eye — the struck-through Lcapy capacitor
   labels, the false grounded `lo_boost_in` in `lcapy-3.png`, and this page —
   were each invisible to every check that passed at the time.

This is `docs/schematic/false-greens.md` territory, and the sharpest specimen
of it the trial produced: **not a check that failed to run, but four checks
that ran, answered correctly, and were all asking the wrong question.**

## Appendix B files

`RENDERS-pultec-low-boost/probe-p2-paper-A5-project/` contains the full kept
project: `pultec-low-boost.kicad_sch`, `.kicad_pro`, `schematic.intent.json`,
`sym-lib-table`, `sym-lib-cache/`, the exported `net.xml`, `erc.rpt`, and
`render.pdf` / `render.png`.
Forensics scripts: `copperhead/a5_forensics.py`, `copperhead/gate_check.py`.

---

# Appendix C — calibrating Copperhead's legibility score against known-quality drawings

Appendix B proposed `score schematic` as the gate that catches what ERC cannot.
Before adopting that scale it was calibrated against six drawings whose quality
is already known. **It does not survive calibration.** The finding is that the
score is not usable as an external criterion for this repository, and the
reasons are specific rather than a matter of taste.

## Two corrections to the run itself

1. **`--file` silently bypasses the config.** `cli.ts` calls
   `scoreSchematic(resolve(opts.file), { docsDir: null })` with no `config`
   argument, so severity overrides passed in `.copperhead/config.json` are
   ignored on that path. Every run below therefore goes through `--repo` with a
   purpose-built config. Anyone scoring with `--file` is always scoring
   defaults, whatever their config says.
2. **Two of the paths given are near-empty hierarchical top sheets.** Both
   `build/schgen-boards/pultec-low-boost/pultec-low-boost.kicad_sch` (1,099
   bytes) and `scratchpad/lay/pultec-low-boost.kicad_sch` (1,514 bytes) contain
   **zero symbol instances** — they are parent sheets that reference a child.
   The drawings are in `low-boost.kicad_sch` in each directory (22 and 24
   instances). Those are what was scored. Scoring the top sheets would have
   measured empty pages.

## The numbers

Each sheet scored twice: defaults, and with `ungrouped-symbol`,
`unlabeled-group`, `group-overlap` and `empty-title-block` set to `off`.

| Sheet | Composite (default) | Composite (conv. off) | Errors (default) | Errors (conv. off) | Error families once conventions are off | Style |
| --- | --- | --- | --- | --- | --- | --- |
| 1a human hand-drawn, three-band-eq | **40.0** | **40.0** | 40 | 20 | 20 text-collision | 87.57 |
| 1b human hand-drawn, mid-band | **40.0** | **40.0** | 20 | 10 | 10 text-collision | 88.23 |
| 2 schgen generated, low-boost (known-bad) | **40.0** | **40.0** | 8 | 7 | 7 text-collision | 84.12 |
| 3 agent hand-laid, low-boost | **40.0** | **40.0** | 14 | 3 | 3 text-collision | 88.51 |
| 4 Copperhead p1-meaningful | **83.5** | **83.5** | 0 | 0 | none | 89.60 |
| 5 Copperhead A5 overflow (known-bad anchor) | **40.0** | **40.0** | 10 | 10 | 10 out-of-frame | 89.57 |

## Does it rank these drawings the way a person would? No.

**Does the hand-drawn human schematic outrank the generated one? NO — they
tie, at exactly 40.0.** And on the underlying error count the ranking is
*inverted*: the owner's own schematic carries **20** error findings with
conventions off against the known-bad generated board's **7**. By the only
number underneath the cap, the scale says the known-bad sheet is nearly three
times cleaner than the reference drawing.

**Does the hand-laid sheet outrank the generated one?** By composite, no — tie
at 40.0. By error count with conventions off, yes: 3 against 7, which does
agree with the human judgement that it is the better page. But **the composite
hides the one discrimination the checker got right.**

### The composite cannot rank at all

**Five of six sheets score exactly 40.0.** The cap floors any sheet carrying
one or more error-severity findings to 40 — `cap: 40 — N error-severity
legibility finding(s) cap the composite below the known-good floor (85)`. The
composite is therefore not a scale but a **binary**: 85-and-up for a sheet with
zero error findings, 40 for everything else. The owner's reference schematic,
the known-bad generated board, the hand-laid sheet and a page with a third of
its circuit off the paper all receive the identical number.

A gate asserting "score >= 85" is just asserting "zero error findings". That is
a legitimate check, but it is not a quality scale and must not be described as
one.

### Turning the convention families off changes the findings a great deal and the ranking not at all

The earlier pass's claim is confirmed exactly:

- Human three-band-eq: 40 errors → 20. **Half of every finding against the
  owner's schematic was `ungrouped-symbol`** — penalty for not drawing
  Copperhead's group rectangles, which no human draws.
- Human mid-band: 20 → 10, same split.
- Agent hand-laid: 14 → 3. **Eleven of fourteen were convention findings.**
- Generated board: 8 → 7; it already draws something the checker accepts.

So the convention families are a large and real distortion, and they fall
hardest on exactly the drawing that defines "good" here. **But because the cap
is binary, removing them moves no composite at all.** Both complaints are true
at once: the scale is convention-laden, and fixing that does not make it rank.

### The style sub-score is readable alone, is convention-free — and ranks the broken page second

`style` is reported separately as "convention-free, never capped", and it is:
it is a weighted mean of six metrics with no cap applied, so it can be read on
its own. Its ranking:

```
89.60  Copperhead p1-meaningful
89.57  Copperhead A5 OVERFLOW        <-- a third of the circuit is off the page
88.51  agent hand-laid
88.23  human hand-drawn mid-band
87.57  human hand-drawn three-band-eq
84.12  schgen generated (known-bad)
```

**The catastrophically broken page places second of six, 1.3 points above the
owner's own schematic.** The whole spread from best to worst is 5.5 points,
across drawings that range from the repository's reference for good
draughtsmanship to a sheet missing its biggest subsystem. Style is
convention-free and useless as a criterion, because what it measures —
pin attachment, island parts, power-symbol economy, labels per part, crossings
per wire, straight-wire ratio — are all properties that **survive a part being
plotted off the paper**. The parts are still attached, still unlabelled, still
uncrossed; they are simply not on the page.

The one thing both scales agree on is that the schgen board is worst, which is
correct. That is one true discrimination out of six.

## What the score is composed of

**Composite — 15 metrics, weights totalling 115** (contributions are normalised
to 100, so a weight of 10 contributes at most 8.70):

| Metric | Weight | | Metric | Weight |
| --- | --- | --- | --- | --- |
| pin-attachment | 10 | | utilization | 10 |
| wire-crossings | 10 | | axis-alignment | 10 |
| group-cohesion | 10 | | spacing-uniformity | 10 |
| flow-direction | 10 | | whitespace-balance | 10 |
| island-parts | 5 | | wire-bends | 5 |
| wire-length | 5 | | label-to-wire-ratio | 5 |
| straight-wire-ratio | 5 | | label-alignment | 5 |
| pair-symmetry | 5 | | | |

Over all of it sits the cap, which overrides the weighted result entirely
whenever any error-severity legibility finding exists. In practice the cap, not
the fifteen metrics, decides the number.

**Style — 6 metrics, weights totalling exactly 100, never capped:**
pin-attachment 30, island-parts 20, power-symbol-economy 15, labels-per-part
15, crossings-per-wire 10, straight-wire-ratio 10. It can be read on its own,
and `--json` exposes it at `style.composite` with per-metric
`raw`/`score`/`weight`/`contribution`.

The 13 legibility families are `off-grid`, `symbol-overlap`, `text-collision`,
`wire-through-symbol`, `out-of-frame`, `ungrouped-symbol`, `unlabeled-group`,
`group-overlap`, `empty-title-block`, `label-orientation`, `low-utilization`,
`crowding`, `cross-group-wire`. The first nine default to `error`, the last
four to `advisory`, and each is individually settable to
`error`/`advisory`/`off` under `legibility.severity` in
`.copperhead/config.json`.

## Verdict

**The score is not usable as an external criterion for this repository.** It
fails the calibration in three independent ways: the composite is binary and
ties four drawings of plainly different quality at one number; by the error
count underneath that cap it ranks the owner's reference schematic *below* a
known-bad generated board; and the convention-free sub-score places a page
missing a third of its circuit in second place. The only sheet in the set that
clears the stated floor of 85 is the one Copperhead itself drew.

What survives is narrower and still worth having:

- **`out-of-frame` is a good, targeted check.** It is the only family that
  fired on the A5 overflow, it fired ten times, it is unambiguous, and it is
  exactly the defect no netlist or ERC check can see (Appendix B). Asserting
  zero `out-of-frame` findings is a real gate.
- **`text-collision` is worth reading as a pointer**, not a score. It is the
  only family common to all four non-Copperhead sheets, and on the owner's
  schematic it names specific text — "C23 Value text sits on a wire". Whether
  those twenty are genuine defects or an artefact of the checker's box is an
  open question this trial did not settle; the code claims the box is
  deliberately undersized so as never to raise a false collision.
- **Nothing here justifies a numeric threshold.** Use the families as named
  checks; do not adopt the number.

This is the same shape of error as the gates in Appendix B, one level up: a
tool that answers precisely the question it was asked, where the question is
not the one that matters. **A criterion must be calibrated against work whose
quality is already known before it is allowed to judge new work** — and this
one was adopted in Appendix B on the strength of a single reading, 40 against
83.4, that looked decisive and was an artefact of a binary cap.

## Appendix C files

Scripts: `copperhead/calibrate.py` (builds a repo per sheet per setting and
scores it), `copperhead/summarise.py`, `copperhead/families.sh`.
Raw per-run JSON: `copperhead/calibration.json`. Per-sheet scoring repos:
`copperhead/calib/<sheet>-<on|off>/`.
