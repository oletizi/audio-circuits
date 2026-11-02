transistor-preamp-staged - drafted page record
==============================================

**STATUS: REVIEWED, 2026-11-01.** The owner's verdict, verbatim: *"The repaired
drawing looks great"*. It is recorded in `../../../docs/schematic/verdicts.md`,
bound to the sha256 below, and that register is the authority over this file:
change one byte of the sheet and the page is awaiting review again. Nothing
below assesses the page; every line is an observation or a measurement another
reader can check.

| | |
| --- | --- |
| Sheet | `transistor-preamp-staged.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - the binding a verdict is recorded against** | `e6165baac555523691a400441245d4c14babb0301881dcfcb350702ba63e7775` |
| Render | `transistor-preamp-staged.generated-do-not-edit.svg` |
| sha256 of the render, volatile `<title>` line dropped - evidence, not a binding | `5e0449e6b8011032c135dcf5f33d6de9f07f0de4f59b478ad1e4a3674ce8caa0` |
| Status | **reviewed 2026-11-01** - verdict *"The repaired drawing looks great"*, recorded verbatim in `../../../docs/schematic/verdicts.md` against the sha256 above. Not recorded as approved: he has not used that word |
| Authority | model-authoritative: `circuits/transistor-preamp/staged-board.ts` |
| Promoted | 2026-11-01, on the owner's directive, to `circuits/transistor-preamp/staged-board.kicad_sch` (`288bd0a`), with hidden Footprint fields added from the model and the title block's "generated - do not edit" line removed. That file is now the board's schematic and is his to edit; this page stays here unchanged, as the record of where it came from. **The sheet `288bd0a` replaced carried a text block this page does not have**: `circuits/transistor-preamp/staged-board.ts`'s `schematicNotes()` - the STARTING SETTINGS (RV1-RV4 trim values, the 2B variant, "pull C1"), the Q2 emitter-follower measurement instructions, and the PANEL CONTROLS explanations. `make guide` printed that block from the old sheet and prints nothing from the promoted one; not restored, not added here. Open question for the owner, recorded in `docs/schematic/verdicts.md` and in the Decisions table of `docs/superpowers/specs/2026-11-01-staged-preamp-copperhead-drawing-design.md`: should the notes go back on the page, or should the build guide print `schematicNotes()` directly? |
| Drafted by | `make -C boards/transistor-preamp-staged draw`, copperhead, from the intent `drawingIntent()` generates from the model - **one group**, captioned `Transistor preamp - staged` (the owner's decision) |
| Draft sha256 (as `make draw` wrote it, re-papered) | `3b5a31ae87ae567263c8a8cac3d85a8cf436e3ba2ce5539f674fec22bc6ec743` |
| Repaired by | one akcli 0.22.0 op-list (380 ops, dry-run with `akcli plan` first, then `akcli draw --apply`), then literal text edits for what akcli has no operation for (wire stroke and colour, symbol fields, the group rectangle and caption) |
| Paper | `USLetter`. copperhead drafted on A3; `make draw` re-papered it; the draft's content then measured x 43.18..377.19, y 36.83..237.49 mm and did not fit Letter's inner frame (east overshoot 109.81 mm, south 33.61 mm). After repair the content measures x 26.67..254.00, y 35.56..148.59 mm and fits |
| Toolchain | `make draught-doctor`: every pinned tool matched. kicad-cli 10.0.5, akcli 0.22.0 (protocol 2) |

What the repair did, by class
-----------------------------

**copperhead's placement was replaced, not adjusted.** The draft placed the 34
parts in scattered columns and joined most nets with labels. The repaired page
keeps copperhead's symbols, its embedded library, its title, its group rectangle
and caption, and its per-net wire colours; **every part position, every
orientation and every wire on it is agent-authored.** It shares no part
coordinate with the draft.

| class | what changed | net diff (`akcli plan`) |
| --- | --- | --- |
| labels collapsed into wire | all 35 labels deleted (27 global, 8 local); every one of the 20 signal nets drawn as wire | no pin moved between nets; 20 nets lose their label-given name (see below) |
| power symbols collapsed into rails | 24 power symbols reduced to 2: one VCC symbol on a VCC rail along the top, one GND symbol on a GND rail along the bottom. Both power flags kept | `GND` and `VCC` lose only the deleted power symbols' pins (35 -> 19 and 15 -> 9 pin entries); no part pin changes net |
| re-placement and re-orientation | all 34 parts moved; transforms set so the three transistors are at rotation 0 and the two panel pots RV5 and RV7 are mirrored about x (pin 3 at the top, wiper to the right) | none |
| wiring | 100 copperhead wires deleted, 103 drawn; 38 junctions where three or more connections meet | none |
| fields | every placed symbol's Reference and Value restated as literals | not a connectivity change |
| wire stroke | 0.254 mm and copperhead's colour for each net, read off the draft | not a connectivity change |
| group rectangle and caption | resized to the content and moved with it | not a connectivity change |
| title block | `comment 1` = `generated - do not edit`; date set to the repair date (the draft carried copperhead's placeholder `2020-01-01`) | not a connectivity change |

Measurements, before and after
------------------------------

Before = the sheet `make draw` wrote. After = the sheet in this directory. ERC
and the netlist for "after" were run from this directory.

| measure | before | after |
| --- | --- | --- |
| ERC errors (`kicad-cli sch erc --severity-all --format json`) | 0 | 0 |
| ERC warnings, same invocation, from the sheet's own directory | 0 (build directory, with copperhead's `sym-lib-cache`) | 7 (this directory, empty `sym-lib-table`): 4 `lib_symbol_issues` - library `copperhead_power` not configured - and 3 `lib_symbol_mismatch` for the 2N3904. The same invocation on `../../pultec/pultec-hi-cut/` from its own directory gives 5 `lib_symbol_issues` of the same kind |
| netlist REF.PIN partition vs `tests/fixtures/transistor-preamp-staged.net` (`kicad-cli sch export netlist --format kicadxml`) | IDENTICAL, 22 nets / 78 pins | IDENTICAL, 22 nets / 78 pins |
| net names identical to the fixture | 9 of 22 | 1 of 22 (`GND`) |
| parenthesis depth at end / minimum | 0 / 0 | 0 / 0 |
| true wire crossings (`crossings.py`) | 2 | 0 |
| T-meetings (`crossings.py`) | 0 | 0 |
| orphan junctions (`junction_audit.py`) | 0 | 0 |
| wire-to-wire tees without a dot | 0 | 0 |
| pins on a wire interior without a dot | 0 | 0 |
| labels (`label_survey.py`) | 35 on 20 nets | 0 |
| symbols | 60 (34 parts, 24 power, 2 flags) | 38 (34 parts, 2 power, 2 flags) |
| placed pins | 104 (78 on parts) | 82 (78 on parts) |
| wires | 100 | 103 |
| total wire length | 411.48 mm | 1297.94 mm |
| wire corners (two wire ends at a right angle, no pin) | 8 | 9 |
| junctions | 6 | 38 |
| distinct wire strokes; strokes per net | 8; one per net | 8; one per net |
| paper fit, `paper_fit.py` | does not fit Letter | fits Letter |

**The symbol and pin counts changed, and only through the power symbols.** The
34 parts and their 78 pins are unchanged; 22 power symbols were deleted by the
rail collapse.

**Net names.** With no labels on the page, KiCad names 20 of the 22 nets
automatically, so the exported netlist no longer carries the model's names
(`BASE`, `COLLECTOR`, ...). The connectivity is identical. This follows the
owner's standing default that an on-page label is used when he asks for one
(`EVALUATING-DRAWINGS.md` P1). One local label per net would restore the names;
the longest are 21-23 characters and none of them fits on the short wires of
this arrangement without widening it.

Observations
------------

Coordinates are sheet millimetres, x east, y south.

- The input connector J1 is at (49.53, 93.98) on the west side, its pins pointing
  east. The output connector J2 is at (242.57, 97.79) on the east side, its body
  east of its pins.
- The power connector J3 is at the top-left corner, (34.29, 48.26). Its pin 1 is
  the west end of the VCC rail; its pin 2 runs down a vertical at x 41.91 to the
  west end of the GND rail. C4 hangs from the VCC rail and returns to that
  vertical.
- The VCC rail runs along y 48.26 from x 39.37 to x 219.71, ending on Q2's
  collector. The GND rail runs along y 138.43 from x 41.91 to x 234.95. There is
  one VCC symbol (`#PWR18`, x 44.45) and one GND symbol (`#PWR01`, x 41.91).
- The signal path runs west to east: J1, C2, Q1; Q1's collector, C3, RV5; RV5's
  wiper, C6, Q3; Q3's collector, C8, RV7; RV7's wiper, C9, Q2; Q2's emitter, C5,
  J2.
- The three transistors are drawn alike: collector up, emitter down, base from
  the west. Their bases are at y 93.98 (Q1), 91.44 (Q3) and 90.17 (Q2).
- The signal path is not on one horizontal line. Each stage's output leaves its
  collector above the base row (C3 at y 78.74, C8 at y 77.47) and drops into the
  next stage's pot, whose wiper feeds the next coupling capacitor at y 86.36
  (C6) and 85.09 (C9). C5 and J2 are at y 97.79.
- Stage 1's feedback RV1-R1 is a horizontal row at y 83.82, above the base wire,
  from x 73.66 on the base wire to the collector column at x 102.87.
- The base bias of Q3 (R8 over R9) and of Q2 (R5 over R6) are each one vertical
  from the VCC rail to the GND rail; the coupling capacitor enters that vertical
  from the west and the base wire leaves it to the east, at two different
  heights.
- The trimmers used as rheostats tie their wiper as follows: RV1's wiper drops to
  the base wire; RV3's wiper drops to the C3 wire; RV2's, RV4's and RV6's wipers
  each run as their own vertical to the GND rail, 3.81 mm east of the same part's
  pin-3 drop.
- Every emitter resistor and every bottom bias resistor drops straight to the GND
  rail. The longest such drop is J2 pin 2's, 38.1 mm, after a 2.54 mm jog west.
- The group rectangle is (26.67, 35.56)-(254.00, 148.59). Its distances to the
  Letter inner frame are west 14.69 mm, east 13.38 mm, north 23.58 mm, and
  23.24 mm south to the top of the title-block corner.
- The title block shows `generated - do not edit` and the file name
  `transistor-preamp-staged.generated-do-not-edit.kicad_sch`.

Left as it is, and why
----------------------

- **Nine wire corners remain**: J3's and J1's ground returns, the two emitter
  bypass branches (at C1 and C7), C3 to RV5, C8 to RV7, the VCC rail's east end on
  Q2's collector, and J2's ground return (two: its jog and the GND rail's east
  end). Removing any of them means moving a part off the
  row or column it shares with its neighbours; that would trade one count against
  another, not reduce a count, so it was stopped there.
- **Total wire length is about three times the draft's**, because the draft's 35
  labels were standing in for wire. The longest runs are the GND drops and J3's
  ground vertical.
- **The rectangle's west and east margins differ by 1.31 mm** (0.66 mm off
  centre). The content is kept on the 1.27 mm grid, and the page offset was
  chosen in 1.27 mm steps.
- **The ERC warnings from this directory are the library-configuration kind**,
  not connectivity. They come from the empty `sym-lib-table` this directory
  keeps by `../../README.md`'s layout (the symbols are embedded in the sheet), and
  from the installed KiCad library's 2N3904 differing from the copy copperhead
  embedded.
- **The arrangement is agent-authored and unreviewed as an arrangement**, as is
  every part orientation on it.

After promotion: stage 1 fixed, 2026-11-02 - AWAITING THE OWNER'S REVIEW
------------------------------------------------------------------------

**The board's canonical sheet changed; the page in this directory did not.**
Per `../../../docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md`
the staged board's stage 1 is fixed at the values tuned on the buffered board,
and `circuits/transistor-preamp/staged-board.kicad_sch` was repaired in place to
match: RV1-RV4 deleted, R1 820K (moved to RV1's old position on the feedback
row), R2 270K and C1 straight to the GND rail, R3 2.7K straight to the
collector. Nothing outside stage 1 moved.

| | |
| --- | --- |
| sha256 of `circuits/transistor-preamp/staged-board.kicad_sch` before | `402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493` (`288bd0a`) |
| **sha256 after - awaiting the owner's review** | `31a5e0c47ebf3a2ee1d94e6d3c0d62d534137e86690863abfbe9411fba04422e` |
| How | `repair/`: two akcli op-lists and one text-edit script, with `repair/REPLAY.md` and `repair/replay.sh` from the before sha256 to the after; replayed and matched before commit |
| Status | **awaiting the owner's review.** The verdict above binds the copperhead page in this directory, which is unchanged; it says nothing about the changed sheet |

**The repaired page is NOT added to this directory**, and that is a reading of
`../../README.md`, not an omission: its layout holds one page per board
directory, a page here is replaced only by a new drafting run, and this one is
kept as the record of where the canonical sheet came from. The record of the
change is the canonical sheet in `circuits/`, the committed `repair/` beside
this file, and its replay.

**Measured, before -> after** (`repair/verify.sh`): netlist export against the
model 22 nets / 34 parts (differs from the fixed-stage model, as it must) ->
18 nets / 30 parts, 0 differences in partition, values or footprints; ERC 0
errors and 7 warnings on both (4 `lib_symbol_issues`, 3 `lib_symbol_mismatch`,
the library-configuration kind recorded above); parenthesis depth 0 -> 0; true
crossings 0 -> 0; orphan junctions 0 -> 0; labels 0 -> 0; symbols 38 -> 34
(the four trims); placed pins 82 -> 70; wires 103 -> 91; total wire length
1297.94 -> 1272.54 mm; wire corners 9 -> 9; junctions 38 -> 34; wire groups with
more than one stroke 0 -> 0; paper fit: fits -> fits.
