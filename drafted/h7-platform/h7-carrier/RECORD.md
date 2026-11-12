h7-carrier - drafted page record
================================

**STATUS: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"ok, approved"*.
It is recorded in `../../../docs/schematic/verdicts.md`, bound to the sha256
below, and that register is the authority over this file: change one byte of the
sheet and the page is awaiting review again. The verdict is on the drawing, not a
clearance of the circuit: the USB sense path is not cleared for physical bring-up
(VBUS-HOTPLUG). Nothing below assesses the page; every line is an observation or
a measurement another reader can check.

| | |
| --- | --- |
| Sheet | `h7-carrier.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8` |
| Render | `h7-carrier.generated-do-not-edit.svg` |
| sha256 of the render, volatile `<title>` line dropped - **evidence, not a binding** | `b49ee79296e37e0aeef957ef9c473759a5e19cca16315439b219126367fe8e67` |
| Status | **reviewed 2026-11-12** - *"ok, approved"*, recorded in `docs/schematic/verdicts.md` against the sha256 above |
| Authority | model-authoritative: `circuits/h7-platform/carrier-board.ts` (`h7Carrier()`), the circuit's own transcription record |
| Drafted by | `make -C boards/h7-carrier draw`, copperhead 0.12.0, from the intent `drawingIntent()` generates from the model - **one group**, captioned `H7 bring-up carrier` (`carrier-board.drawing.ts`). At first draft the board declared no netlist, so `make draw` printed its `NO INDEPENDENT NETLIST:` block (`TOOLING.md`, design change C2): the pre-draft partition check did not run, and the binding comparison is this page's own `kicad-cli` export against the model, below and in `tests/circuits/drafted-kicad-round-trip.test.ts`. **Redrafted when the model gained C4** (commit `5dafd81`, CR-CARRIER-VBUS-SENSE-CAP): with `sch`/`netlist` declared as the previous page and its export, `make draw` refused on net partition, and the disagreement was exactly C4.1 on USB_VBUS_SENSE and C4.2 on GND, the intended model change. Per `TOOLING.md` C2 the declaration's `sch`/`netlist` were removed for that one draft (the `NO INDEPENDENT NETLIST:` block printed again), the page was repaired, and the declaration was restored with the fixture re-exported from the new page |
| Draft sha256 (as `make draw` wrote it, re-papered) | `f5c427e8c6558c2e744762890dc8dd2a24bd39ff52784d29af9e4ad89c27419f` |
| Repaired by | two akcli 0.22.0 op-lists (`repair/01-place.json`, 402 ops; `repair/02-wire.json`, 210 ops), each dry-run with `akcli plan` first, then `akcli draw --apply`; then literal text edits for what akcli has no operation for (wire stroke, fields, group rectangle and caption). `repair/REPLAY.md` replays it from a fresh `make draw` to the sha256 above; replayed 2026-11-11 and matched |
| Paper | `USLetter`. copperhead drafted on A3; `make draw` re-papered it; the draft's content then overshot Letter's inner frame by 128.863 mm east and 39.963 mm south. After repair `paper_fit.py` reports it fits |
| Toolchain | `make draught-doctor`: every pinned tool matched. kicad-cli 10.0.5, akcli 0.22.0 (protocol 2) |
| `sym-lib-table` | names one library, `h7-platform`, at `${KIPRJMOD}/../../../circuits/h7-platform/h7-platform.kicad_sym` - inside the repository, so it resolves from a fresh checkout. Every symbol is also embedded in the sheet. Measured: ERC from this directory reports no `h7-platform` library issue; the same ERC with an empty `sym-lib-table` reports one more `lib_symbol_issues` warning, naming `h7-platform` |
| Netlist fixture | `../../../tests/fixtures/h7-carrier.net` is **`kicad-cli`'s export of this drafted page**, written by `make -C boards/h7-carrier netlist-agrees`. It is not derived from the model |

The controller rulings this page rests on
-----------------------------------------

Each is a **controller ruling (the owner may override)**, not an owner decision,
and each is recorded in `docs/h7-platform/decisions.md`:

- [CR-CARRIER-BREAKOUT](../../../docs/h7-platform/decisions.md#cr-carrier-breakout) - every contract pin to two 1 × 20 breakout headers, J3 and J4, pad for pad with the sockets; a header pin is the one breakout terminal a reserved pin (16-19) has on the carrier.
- [CR-CARRIER-TEST-POINTS](../../../docs/h7-platform/decisions.md#cr-carrier-test-points) - TP1-TP4 on VIN_MOD, 3V3_D, VREF_A and GND; TP5-TP8 on the four SAI nets.
- [CR-CARRIER-USB-C](../../../docs/h7-platform/decisions.md#cr-carrier-usb-c) - the receptacle J6, R4 and R5 on CC1 and CC2, SBU1/SBU2 unconnected, and **the shield network R6 ∥ C2**, which mirrors the pedal's USB-05.
- [CR-CARRIER-ESD](../../../docs/h7-platform/decisions.md#cr-carrier-esd) - U2, wired as the pedal's USB-04 wires it, **with C_VBUS (C3)**, which mirrors the pedal's USB-04.
- [CR-CARRIER-VBUS-SENSE](../../../docs/h7-platform/decisions.md#cr-carrier-vbus-sense) - R2 over R3 from VBUS to contract pin 31.
- [CR-CARRIER-VBUS-SENSE-CAP](../../../docs/h7-platform/decisions.md#cr-carrier-vbus-sense-cap) - R-57's sense-node capacitor **C4**, 100 nF from USB_VBUS_SENSE to GND, in parallel with R3, a separate part from C3. The page shows its Value as `.1uF`, the form copperhead's intent gives it and C3.
- [CR-CARRIER-USBSW-SELECT](../../../docs/h7-platform/decisions.md#cr-carrier-usbsw-select) - **U1's S pin (9) to GND**, its second port (pins 3, 4) not connected.
- [CR-CARRIER-USBSW-SYMBOL](../../../docs/h7-platform/decisions.md#cr-carrier-usbsw-symbol) - **U1 is drawn from the project symbol** `h7-platform:TS3USB221RSER`.
- [CR-CARRIER-RAIL-LOADS](../../../docs/h7-platform/decisions.md#cr-carrier-rail-loads) and [CR-CARRIER-DUMMY-LOADS](../../../docs/h7-platform/decisions.md#cr-carrier-dummy-loads) - J7 with R7 147R on 3V3_D, J8 with R8 357R on VREF_A.
- [CR-CARRIER-VIN](../../../docs/h7-platform/decisions.md#cr-carrier-vin) - the VIN entry J5 and **the fuse F1, 0.75 A hold**, shown on the page as `0.75A hold`.
- [R-14](../../../docs/h7-platform/decisions.md#r-14) - the USB isolation switch U1, its 3V3_D supply with C1, and its enable pull-up R1 on USB_EN_N.

What the repair did, by class
-----------------------------

**copperhead's placement was replaced, not adjusted.** The repaired page keeps
copperhead's symbols, its embedded library, its title, its group rectangle and
caption, and its per-net wire colours. **Every part position, every orientation
and every wire on it is agent-authored**, written in `repair/layout.py` and
`repair/02-wire.py`.

| class | what changed | connectivity |
| --- | --- | --- |
| labels collapsed into wire | all 89 copperhead labels deleted (global and local, on 43 nets). Each socket pad is now a wire to the same breakout pad; 35 local labels added, one on each breakout-band wire that is not a rail, at x 152.4 mm, naming the contract signal. No net carries two labels | the export is unchanged against the model (table below); 8 nets that carried a label on the draft now take KiCad's own name |
| power symbols | 36 copperhead power symbols reduced to 30, all of copperhead's own: 5 3V3_D, 17 GND, 3 VBUS, 3 VIN_MOD, 2 VREF_A. On the B band, contract pins 38, 39 and 40 (3V3_D, VIN_MOD, GND) take a symbol at each connector's pin and no band wire; pin 21 (VREF_A) is a band wire with one symbol. The five PWR_FLAGs kept, one per rail | no part pin changes net |
| re-placement and re-orientation | all 31 parts moved. J1, J2, J5, J7, J8 and U1 mirrored about y; F1 at rotation 90; R2 at rotation 270; TP5-TP8 at rotation 180 | none |
| wiring | 169 copperhead wires deleted, 139 drawn; 31 junctions, one wherever three or more connections meet | none |
| fields | every part's Reference and Value and every power symbol's Value restated as literals, centred, horizontal. C4's Reference and Value sit below its GND wire, at x 222.25 mm, since TP8 is west of C4 and R3's fields east of it. **R3's Value moved when C4 was added**, from x 226.3 to x 227.4 mm (its Reference's x), because C4's lower plate ended on its first character at the old position. **The Value is hidden on 15 parts** whose Value is the KiCad symbol's own name and nothing else: TP1-TP8 (`TestPoint`), J5, J7, J8 (`Conn_01x02`), J3, J4 (`Conn_01x20`), J6 (`USB_C_Receptacle_USB2.0_16P`). A hidden field is still in the netlist | not a connectivity change |
| wire stroke | 0.254 mm and copperhead's colour for each net, read off the draft (`repair/net_strokes.py`) | not a connectivity change |
| group rectangle and caption | resized to (13.97, 15.24)-(254.00, 168.91) mm and the caption moved with it | not a connectivity change |
| title block | date 2026-11-11 (the draft carried copperhead's `2020-01-01`); `comment 1` = `generated - do not edit` | not a connectivity change |

Measurements, before and after
------------------------------

Before = the sheet `make draw` wrote, measured in `build/draw/h7-carrier/`.
After = the sheet in this directory, measured here. Every number came from
`repair/verify.sh`.

| measure | before | after |
| --- | --- | --- |
| sha256 | `f5c427e8...` | `c9355a88...` |
| ERC errors (`kicad-cli sch erc --format json --severity-all`) | 0 | 0 |
| ERC warnings, same invocation, from the sheet's own directory | 0 (build directory, with copperhead's `sym-lib-cache`) | 36: 35 `lib_symbol_issues` (library `copperhead_power` not configured) and 1 `lib_symbol_mismatch` (`USBLC6-2SC6`'s embedded symbol differs from the installed `Power_Protection` copy; the measured fields are under "U2's embedded symbol" below) |
| `compareSheetToModel` on the `kicad-cli` export: componentIdentity / netMembership / pinIdentity / values / footprints | 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| footprintsUndeclared (the model declares no footprint) | 31 of 31 | 31 of 31 |
| export size | 31 components, 52 nets, 153 net members | 31 components, 52 nets, 153 net members |
| exported nets carrying a model net name | 48 of 52 | 40 of 52 |
| parenthesis depth at end / minimum | 0 / 0 | 0 / 0 |
| true wire crossings (`crossings.py`) | 2 | 33 |
| T-meetings (`crossings.py`) | 0 | 0 |
| orphan junctions (`junction_audit.py`), out of total | 0 of 2 | 0 of 31 |
| wire-to-wire tees without a dot | 0 | 0 |
| pins on a wire interior without a dot | 0 | 0 |
| labels (`label_survey.py`) | 89 on 43 nets | 35 on 35 nets |
| symbols | 72 (31 parts, 36 power, 5 flags) | 66 (31 parts, 30 power, 5 flags) |
| placed pins | 194 (153 on parts) | 188 (153 on parts) |
| wires | 169 | 139 |
| total wire length | 854.71 mm | 4378.96 mm |
| wire corners (two wire ends at a right angle, no pin) | 24 | 11 |
| junctions | 2 | 31 |
| distinct wire strokes; wire groups with more than one stroke | 10; 0 | 10; 0 |
| paper fit (`paper_fit.py`) | does not fit Letter | fits Letter |

**The 33 crossings, by where they are.** 21 are on the B band: the taps for
contract pins 31-37 leave their band wire downward and cross the band wires
below them (pin 31's tap crosses 6, pin 32's 5, pin 33's 4, pin 34's 3, pin
35's 2, pin 36's 1, pin 37's 0). 10 are on the A band: USB_EN_N's tap leaves
pin 11's wire upward to U1's OE and crosses pins 1-10. 1 is where the
receptacle's D- pair, which J6 places above its D+ pair, goes down to the D-
line south of U2 and crosses the D+ line. 1 is where U1's S pin goes down to
its GND symbol and crosses the OE wire. C4's two wires cross nothing; the count
is the same as on the page before C4 was added (sha256 `dc9e93ea...`, 33).

**The symbol and pin counts changed only through the power symbols.** The 31
parts and their 153 pins are unchanged.

**What adding C4 changed against the previous page** (`dc9e93ea...`), measured
by comparing the regenerated op-lists and pin file with the previous committed
ones: op-list 01 gained C4's move and transform (and deletes five more draft
objects, because the new draft has 169 wires and 2 junctions where the previous
one had 165 and 1); op-list 02 gained two wires, (231.14, 83.82)-(222.25, 83.82)
on USB_VBUS_SENSE and (231.14, 91.44)-(222.25, 91.44) on GND, and one junction
at (231.14, 91.44), where R3's lower pin, the GND symbol and C4's GND wire meet;
every other pin point, wire, junction, label and per-net stroke is unchanged.
The one other change on the page is R3's Value, moved 1.1 mm east (fields row
above).

**An electrical fault was found and fixed during the repair, not on this page.**
The first wiring pass drew U2 in line, D+ into pin 1 and out of pin 6. The
model puts pins 1 and 6 on one net (USB_C_DP) and pins 3 and 4 on another
(USB_C_DM); KiCad treats each as a separate pin, so that pass exported six
`netMembership` disagreements and was not kept. On this page U2 sits between a
D+ line north of it and a D- line south of it, and each of its four I/O pins is
wired to its line. The table above is measured on this page.

Choices made, and the ones not taken
------------------------------------

- **One draft was taken.** The intent has one group (`carrier-board.drawing.ts`)
  and the repair replaced every placement, so no second group arrangement was
  drafted (`TOOLING.md` step 2 asks for the choice to be recorded).
- **Socket and breakout drawn as two bands of 20 wires.** J2 (socket, pins
  21-40) faces J4 (its breakout) across one band; J1 (pins 1-20) faces J3 below
  it. Each socket pad is a wire to the same breakout pad, which is what replaces
  the draft's 89 labels.
- **Taps cross the band; not taken: a fanned band.** A net that also reaches a
  third part leaves its band wire and crosses the wires beside it. Opening the
  band so each tapped net has room for its parts between itself and its
  neighbour would remove those crossings at the cost of four corners per tapped
  wire and a longer band; not drawn, so not measured.
- **Rails on the B band by symbol.** Pins 38-40 take a power symbol at each
  connector's pin rather than a band wire, which keeps the band taps from
  crossing three more wires each (21 more crossings). Pin 21 (VREF_A, the top
  row, which no tap crosses) is a band wire with one symbol.
- **B band above A band.** USB_EN_N's tap (A pin 11) goes up 10 rows to OE; down
  would cross 8 rows and would put OE's wire across the D+ and D- wires, which
  arrive at U1 from the B band. The two are traded here.
- **ICs upright.** U1 is mirrored about y only (VCC north, GND south, port 1
  west), U2 is at rotation 0 (VBUS north, GND south). The D-/D+ crossing at J6
  is the cost: turning both U2 and U1 over (power pins south) would remove it.
- **No label on the eight nets that are not on a band**: VIN_IN, DUMMY_3V3D,
  DUMMY_VREF_A, USB_CC1, USB_CC2, USB_C_DP, USB_C_DM, USB_SHIELD. Each is drawn
  as wire; the export names them by KiCad's own rule.

Observations
------------

Coordinates are sheet millimetres, x east, y south.

- The B band: J2 at (142.24, 53.34), pins east at x 147.32; J4 at (248.92,
  53.34), pins west at x 243.84. Rows y 30.48 (pin 21) to 78.74 (pin 40), 2.54 mm
  apart.
- The A band: J1 at (142.24, 137.16), J3 at (248.92, 137.16), the same columns.
  Rows y 114.3 (pin 1) to 162.56 (pin 20). Pin 20 is a band wire with one GND
  symbol at x 185.42.
- Tap columns on the B band: pin 37 (USB_DP) x 172.72 and pin 36 (USB_DM) x
  177.8, down to U1's D+ and D-; pins 32-35 (the SAI nets) x 195.58, 203.2,
  210.82, 218.44, down to TP5-TP8 at y 83.82; pin 31 (USB_VBUS_SENSE) x 231.14,
  down to R2 east (to a VBUS symbol) and R3 south (to GND).
- C4 at (222.25, 87.63), rotation 0, 8.89 mm west of R3 and level with it: its
  upper pin is wired east at y 83.82 to the sense node at (231.14, 83.82), its
  lower pin east at y 91.44 to R3's lower pin and the GND symbol there, which
  now carry a junction. TP8's circle is west of C4's plates; R3's Reference and
  Value are between C4 and R3.
- USB_EN_N: from A pin 11 at x 182.88 up to y 104.14, west to U1's OE (pin 6) and
  east to R1, whose other end has a 3V3_D symbol.
- The USB path runs west to east: J6 at (33.02, 86.36), its pins east at x
  48.26; U2 at (86.36, 106.68); U1 at (121.92, 99.06). The D+ line is at y
  93.98 from J6 to U1's 1D+ (pin 1); the D- line is at y 121.92, rising at x
  109.22 to U1's 1D- (pin 2). U2's pins 1 and 6 go up to the D+ line; pins 3 and
  4 go down to the D- line.
- J6's VBUS (all four pins share one point) runs east at y 71.12 to C3 and a
  VBUS symbol; U2's VBUS pin has its own VBUS symbol. R5 and R4 hang from CC2
  and CC1 to GND. The shell goes down to R6 ∥ C2 and GND.
- North-west, left to right at y 40.64: J5 to F1 to TP1 and a VIN_MOD symbol;
  J7 with TP2 and a 3V3_D symbol on pin 1, R7 to GND on pin 2; J8 with TP3 and a
  VREF_A symbol on pin 1, R8 to GND on pin 2; TP4 on a GND symbol.
- The title block shows `generated - do not edit` and the file name
  `h7-carrier.generated-do-not-edit.kicad_sch`.

Left as it is, and why
----------------------

- **The ERC warnings from this directory are the library-configuration kind**,
  not connectivity: `copperhead_power` is embedded in the sheet and named in no
  `sym-lib-table`, as on `../../transistor-preamp/transistor-preamp-staged/`, and
  copperhead's embedded `USBLC6-2SC6` differs from the installed copy (measured below).
- **Total wire length is about five times the draft's**, because the draft's
  labels stood in for the band wires and the taps.
- **The arrangement is agent-authored**, as is every part orientation and every
  hidden Value on it, including C4's position and its fields below its GND wire,
  the region changed since the previous page. The owner's verdict on this sheet
  is in `docs/schematic/verdicts.md`.

U2's embedded symbol (`Power_Protection:USBLC6-2SC6`), measured against the sheet and the installed
`Power_Protection.kicad_sym`
---------------------------------------------------------------------------------------------

| | embedded in the sheet (and so in the netlist fixture) | installed `USBLC6-2SC6` |
| --- | --- | --- |
| pins | six, identical to the installed parent `USBLC6-2P6`'s (I/O1 1, GND 2, I/O2 3, I/O2 4, VBUS 5, I/O1 6, same positions and lengths) | `(extends "USBLC6-2P6")`: the same six |
| Value | `USBLC6-2P6` (the parent's) | `USBLC6-2SC6` |
| Footprint | `Package_TO_SOT_SMD:SOT-666` | `Package_TO_SOT_SMD:SOT-23-6` |
| footprint filter (`ki_fp_filters`) | `SOT?666*` | `SOT?23*` |
| Description | "Very low capacitance ESD protection diode, 2 data-line, SOT-666" | "... SOT-23-6" |

The pins are the same, so the difference is not electrical and the model comparison cannot see it.
The embedded copy carries the parent's fields, which is what copperhead's flattening of an
`extends` symbol produces (third-party behaviour, not changed here).

**Trap for footprint assignment in a later PCB output:** a footprint taken from this page's
symbol fields for U2 is SOT-666, and its filter is SOT-666, while the installed part is
SOT-23-6. Take U2's footprint from the part, not from the embedded symbol.
