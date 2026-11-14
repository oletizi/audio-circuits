# h7-pedal: the audio pedal board, drawn one page per block

The circuit: `circuits/h7-platform/pedal-board.ts` (`h7Pedal()`, `DESIGNATORS`, `PIN_NUMBERS`,
`PAGE_GROUPS`, `drawingPages()`), one `include()`d block per page under `circuits/h7-platform/pedal/`
(ruling CR-PEDAL-BLOCKS; the board includes a block once its task has built it). Model-authoritative
(`TOOLING.md` step 0): every page is derived from the model. The board is
`boards/h7-pedal/perfboard.json`, kind `pcb`; it declares no `sch` and no `netlist` yet, because
there is no root sheet to name or export.

The project is drawn under design change C3 (`TOOLING.md`, "Multi-page drawing"), as the module's
is (`../h7-module/RECORD.md`): one sheet per block, each block's ports drawn as hierarchical labels,
and a root sheet joining them, assembled once every page is drawn. Each block page is checked
against its own block of the model by the shared tools, `sh draughting/pages/verify.sh
drafted/h7-platform/h7-pedal <block> <sheet>`. The pedal's own data for those tools is in
`repair/tools/`: its three declared tables (`pwr-flag-homes.ts`, `cross-page-drivers.ts`,
`erc-allowances.ts`, each written from the pedal's nets and holding only what the pages drawn so far
need) and its title-block data (`title_block.py`).

**The pages carry the module's page conventions unchanged** (`docs/h7-platform/decisions.md`):
[CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails) (no rail power
symbol on a block page; GND and the rails are wires ending in the block's hierarchical labels),
[CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags) (at most one
PWR_FLAG per net across the hierarchy, at the home the board's table declares),
[CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers),
[CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check) and
[CR-MODULE-BEAD-VALUE](../../../docs/h7-platform/decisions.md#cr-module-bead-value) (a bead is drawn
with its rated impedance, by `valueFor`).

**A page here is UNREVIEWED until the owner records a verdict on its sha256; each page's status
below says which it is.** A verdict is bound to the sha256 in the table below;
`docs/schematic/verdicts.md` is where it is recorded.

## Sheets

| sheet | role | sha256 |
| --- | --- | --- |
| `interface.kicad_sch` | block interface | `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a` |
| `entry.kicad_sch` | block entry | `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736` |
| `pf.kicad_sch` | block pf | `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385` |
| `modsw.kicad_sch` | block modsw | `89ed82bcbc60b4e2f075257768f68a4a66370348dc5db4e7c4b9632ca3099dc2` |
| `prail.kicad_sch` | block prail | `f440c0c355718e6e280f955abe1ef8df8f2075cf89d5866f3ef854f90ae15780` |
| `ldo_vmid.kicad_sch` | block ldo_vmid | `584cdc4ce97d96875c2c2b76a9504e99997eb1a21623668b7feb7202e6f96ecd` |
| `usb.kicad_sch` | block usb | `efe062770501a63ad44dfe33558fcb54f7bd6676b5bab682b25278317aecb653` |
| `midi_i2c.kicad_sch` | block midi_i2c | `fb12cf76ea6924f8cc1a983c9eaed4f85a004e15e399836941852d0e818afc4f` |
| `fsw_led.kicad_sch` | block fsw_led | `de6b3e173b854daef218356aa2ade4c1b66cdd5277eed411b969780865fb2021` |
| `controls_a.kicad_sch` | block controls_a | `0e01516c5059915c4bc1b9b22d711689c7f5311af0c78d22bbc7cda3fbdd5888` |
| `controls_b.kicad_sch` | block controls_b | `cd3f1a0869064b31cd5d9302e188614e4fb6f58e74481c8c2ae342644f0da9db` |
| `expr_ref.kicad_sch` | block expr_ref | `f85af0345995f4a4b162ecbe287849ebbcbbdaa6eea9b06f229dab14b011539c` |
| `codec_sup.kicad_sch` | block codec_sup | `9f98870190e4b1207c005494b73ec8fb75f2f48857df9723e612a96902ce3147` |
| `sai_iso.kicad_sch` | block sai_iso | `ffc831855bd99856e6c84610169623a34f99ca50e15a834fccb0b23251cff9c8` |
| `codec.kicad_sch` | block codec | `1c17ed164ce98f749cb2db3a88f815e59d10ed82d92b5ca5a924952f4c414588` |
| `jacks_byp.kicad_sch` | block jacks_byp | `2ad7be98ed45efb192ccd5dc4a56f892bc009c6b3c98beb4d3d3a0de7565c489` |
| `in_fe.kicad_sch` | block in_fe | `37049f7c8c5bb7894936c2ae6df4e62d10ef8aceaa6d7e939ad224e11bb196d2` |
| `adc_drv.kicad_sch` | block adc_drv | `7b35259f9717da2d34344fb030f0ba8d46db3c6001b41a04aa9c092a49da5079` |

Each committed `.svg` beside a sheet is `draughting/pages/render.sh`'s render of that sheet's
committed bytes, with the pinned kicad-cli.

| page | status | render |
| --- | --- | --- |
| interface | **REVIEWED, 2026-11-13** (Task 7a); `verify.sh` exits 0 | `interface.svg` |
| entry | **REVIEWED, 2026-11-13** (Task 7a); `verify.sh` exits 0 | `entry.svg` |
| pf | **REVIEWED, 2026-11-13** (Task 7b); `verify.sh` exits 0 | `pf.svg` |
| modsw | **REVIEWED, 2026-11-13** (Task 7b); `verify.sh` exits 0 | `modsw.svg` |
| prail | **REVIEWED, 2026-11-13** (Task 7c); `verify.sh` exits 0 | `prail.svg` |
| ldo_vmid | **REVIEWED, 2026-11-13** (Task 7c); `verify.sh` exits 0 | `ldo_vmid.svg` |
| usb | **REVIEWED, 2026-11-13** (Task 9a); `verify.sh` exits 0 | `usb.svg` |
| midi_i2c | **REVIEWED, 2026-11-13** (Task 9a); `verify.sh` exits 0 | `midi_i2c.svg` |
| fsw_led | **REVIEWED, 2026-11-13** (Task 9a); `verify.sh` exits 0 | `fsw_led.svg` |
| controls_a | **REVIEWED, 2026-11-13** (Task 9b); `verify.sh` exits 0 | `controls_a.svg` |
| controls_b | **REVIEWED, 2026-11-13** (Task 9b); `verify.sh` exits 0 | `controls_b.svg` |
| expr_ref | **REVIEWED, 2026-11-13** (Task 9b); `verify.sh` exits 0 | `expr_ref.svg` |
| codec_sup | UNREVIEWED (Task 9c); `verify.sh` exits 0 | `codec_sup.svg` |
| sai_iso | UNREVIEWED (Task 9c); `verify.sh` exits 0 | `sai_iso.svg` |
| codec | UNREVIEWED (Task 9c); `verify.sh` exits 0 | `codec.svg` |
| jacks_byp | UNREVIEWED (Task 11a); `verify.sh` exits 0 | `jacks_byp.svg` |
| in_fe | UNREVIEWED (Task 11a); `verify.sh` exits 0 | `in_fe.svg` |
| adc_drv | UNREVIEWED (Task 11a); `verify.sh` exits 0 | `adc_drv.svg` |

## The drafts every repair starts from

`make -C boards/h7-pedal draw`, 2026-11-13, toolchain checked first by `make draught-doctor` (every
pinned tool matched). The replay's own `make draw`, a second run, drafted byte-identical sheets.
Each repaired page's intent is committed as `repair/<block>/intent.json`, and `repair/replay.sh`
checks each draft against the sha256 here, so every later repair starts from these bytes.

| draft | block | parts | sha256 |
| --- | --- | --- | --- |
| `build/draw/h7-pedal/entry/entry.kicad_sch` | entry | 15 | `561fc836dbaf7178ab2742b2f7d24edcd8d63647040c78678bd2518b46ddec56` |
| `build/draw/h7-pedal/pf/pf.kicad_sch` | pf | 13 | `b7e7c33e37f2650bd183ca26622f52af351459b648ffaf87587cd5d0ebc12abb` |
| `build/draw/h7-pedal/modsw/modsw.kicad_sch` | modsw | 13 | `b7d0331996774d07ec11b3d761bdedec98c665bf2a1b12da2aba75dee62f4fa6` |
| `build/draw/h7-pedal/prail/prail.kicad_sch` | prail | 20 | `ef60fc61776a0806efbc1d389534dec23494317f53ab8c1c0fddabb18fbd5cb9` |
| `build/draw/h7-pedal/ldo_vmid/ldo_vmid.kicad_sch` | ldo_vmid | 19 | `4ab75dd0e2aad78af64d3e949bce37bf81401380570ae5844ef1b8576017d096` |
| `build/draw/h7-pedal/interface/interface.kicad_sch` | interface | 2 | `11fc06bf395a95e524a2406fe24b24a3890dcfa2ea60b95ae4ad498d8d95c6df` |

The digital and controls group (Task 8 built its nine blocks; `make draw` drafts every block the
model holds). Drafted 2026-11-13 by Task 9a's first replay, toolchain checked first by `make
draught-doctor` (every pinned tool matched); `repair/replay.sh` checks every one of them from Task 9a
on, so a model change shows there first. The six drafts above were byte-identical on the same run.

| draft | block | parts | sha256 |
| --- | --- | --- | --- |
| `build/draw/h7-pedal/codec_sup/codec_sup.kicad_sch` | codec_sup | 11 | `9390a014569c83cd32908125a65d021e58f18488b79d0f4b4ed6d1f9c4fa723c` |
| `build/draw/h7-pedal/codec/codec.kicad_sch` | codec | 13 | `06a886b93ffa8ff1a3bb52a04de5d018f765dbd83031ffc6fb8695f547af1a60` |
| `build/draw/h7-pedal/sai_iso/sai_iso.kicad_sch` | sai_iso | 11 | `8686ecd5ebd920c4e74f9f5d90efe3c8bf074b519669507341d439a73690bb6e` |
| `build/draw/h7-pedal/expr_ref/expr_ref.kicad_sch` | expr_ref | 23 | `c850a8f2602995833845c1261997bc721ee4b5a7994e3cd76f1892fa8494694d` |
| `build/draw/h7-pedal/controls_a/controls_a.kicad_sch` | controls_a | 18 | `74224c99b06a91fb19df787204fd1b7ac2965f8711ba172f9d5d77148920da68` |
| `build/draw/h7-pedal/controls_b/controls_b.kicad_sch` | controls_b | 18 | `645388b8dfb1b473cc68711b52898714208841062be5523cc8fdef59bb8b751e` |
| `build/draw/h7-pedal/fsw_led/fsw_led.kicad_sch` | fsw_led | 18 | `88f1ad86fec322ef31f5263a60a4be09dcc5570aeaf18840b50da4b9ffc9daa7` |
| `build/draw/h7-pedal/usb/usb.kicad_sch` | usb | 13 | `9413b7ab36e0947f4b25542a752f1ab5c03a28def027e82afd0074a2490bff2b` |
| `build/draw/h7-pedal/midi_i2c/midi_i2c.kicad_sch` | midi_i2c | 14 | `bb11ba3014f260df8f60200c9e968a62e22c9248cc4cc91c6e6cece0f74a2eb2` |

The analog group (Task 10 built its four blocks; Task 11a draws their pages, each section below).
Drafted 2026-11-13 by two `repair/replay.sh` runs into new directories, the second after these
values were added to it: both drafted the four byte for byte the same, and both reached every
committed page's sha256. `repair/replay.sh` checks every one of them from Task 10 on. That run's
`make draw` printed no ADVISORY section and one `NO INDEPENDENT NETLIST:` block. Paper fit and every
other measure of these drafts are Task 11's, measured when each page is repaired.

| draft | block | parts | sha256 |
| --- | --- | --- | --- |
| `build/draw/h7-pedal/in_fe/in_fe.kicad_sch` | in_fe | 23 | `7bc866bc29b99f9a693dc0fbc1e30a6caf500a95c1c894374d08a612a9e45357` |
| `build/draw/h7-pedal/adc_drv/adc_drv.kicad_sch` | adc_drv | 21 | `a745a03f71a727e9337fdeeb5f3e2636b76949947b85e6f6b7fdc0e87e6950b0` |
| `build/draw/h7-pedal/out/out.kicad_sch` | out | 31 | `2bda188d7584df76a20a7054327bb86939846bcec66535d481d38cac160070dd` |
| `build/draw/h7-pedal/jacks_byp/jacks_byp.kicad_sch` | jacks_byp | 18 | `5652b8ed7bc8febf97f28090871fa51a518304136dee8fcc87bb45f2e8aea8bb` |

The part counts against the inventory's §1.3 headings (B9 "about 21", B10 21, B11 "about 28", B12 18; `docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md` lines 32 to 35): in_fe's 23 are the 21 parts B9 lists plus CR-PEDAL-TEST-PADS' two GND pads (tp_in_l_gnd, tp_in_r_gnd). out's 31 are the 29 parts B11's own items list (per channel C_A+, C_A-, R_D1, R_D2, R_FO, R_GO, C_FO, C_GO, R_S, C_OUT, C_DC, R_B and the output pad, 26; U_OUT; its 100 nF and 10 uF), plus the two GND pads (tp_out_l_gnd, tp_out_r_gnd); the heading's "about 28" is one below its own list, and that is the third part. adc_drv and jacks_byp match.

For these nine, `make draw` again printed no ADVISORY section and one `NO INDEPENDENT NETLIST:`
block for the board. copperhead drafted codec_sup, controls_a, controls_b, fsw_led and midi_i2c on
A5 and codec, sai_iso, expr_ref and usb on A4; re-papered to US Letter, every one fits the inner
frame except codec, which overshoots it east by 8.213 mm. No power symbol on any of them.

What `make draw` printed, beside the pages:

- **No ADVISORY section.** `make draw` prints one when a pinned tool outside the drawing path
  disagrees with the lock; none did.
- **`NO INDEPENDENT NETLIST:`**, once for the board (design change C2): the board declares no
  `"netlist"`, so the pre-draft partition check did not run against a committed export. *"There is
  no schematic to export a netlist from yet, and none was derived from the model to stand in: a
  check that compares the model with itself cannot fail."* That is a check not made. The binding
  check is each page's own `kicad-cli` export against the model, which `draughting/pages/verify.sh`
  runs per block.
- **Paper.** copperhead drafted entry on A4, pf on A5, modsw on A5, prail on A3, ldo_vmid on A4 and
  interface on A5; `make draw` re-papered each to US Letter. pf, modsw and interface fit the inner
  frame. **Three overshoot it east**: entry by 3.133 mm (content x 25.400 to 270.510 mm), prail by
  81.873 mm and ldo_vmid by 10.753 mm, against a frame ending at 267.377 mm. copperhead's notes:
  entry *"the natural layout fits A4 at 21% utilization, but no smaller sheet holds the reflowed
  content (A5 196×75 mm vs 190×94 usable)"*; prail *"the natural layout fits A3 at 12% utilization,
  but no smaller sheet holds the reflowed content ()"*; ldo_vmid *"the natural layout fits A4 at 27%
  utilization, but no smaller sheet holds the reflowed content (A5 225×87 mm vs 190×94 usable)"*.
  These are findings about the drafts, not withholding grounds; each page's repair places its own
  parts.
- **No power symbol on any draft**: 0 power symbols and 0 PWR_FLAGs on all six (every net on a
  block page is kind `signal`, C3).

The measurement suite on each draft (selftest: 10 controls, every one moved or fired, on every page):

| block | wires | labels (global) | no-connects | true crossings | T-meetings | orphan junctions | wire tees without a dot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| entry | 47 | 9 (8) | 0 | 2 | 10 | 0 | 7, with 10 collinear overlapping pairs |
| pf | 60 | 17 (11) | 0 | 5 | 1 | 0 | 1, with 1 collinear overlapping pair |
| modsw | 41 | 17 (15) | 0 | 0 | 0 | 0 | 0 |
| prail | 94 | 14 (5) | 1 | 5 | 13 | 0 | 10, with 7 collinear overlapping pairs |
| ldo_vmid | 85 | 15 (5) | 2 | 6 | 0 | 0 | 0 |
| interface | 3 | 1 (0) | 4 | 0 | 0 | 0 | 0 |
| usb (Task 9a) | 74 | 21 (17) | 4 | 23 | 4 | 0 | 3, with 4 collinear overlapping pairs |
| midi_i2c (Task 9a) | 48 | 14 (10) | 1 | 0 | 0 | 0 | 0 |
| fsw_led (Task 9a) | 52 | 21 (13) | 0 | 1 | 0 | 0 | 0 |

## How the pages are repaired

As the module's Task 7b pages are (`../h7-module/RECORD.md`, "How the Task 7b pages are
repaired"), by the shared tools in `draughting/pages/`, each block's directory holding only its own
placement (`repair/<block>/layout.py`) and wiring (`repair/<block>/02-wire.py`); `repair/replay.sh`
runs the steps for each block (`repair_block`, copied from the module's unchanged): `ports.ts`,
`net_strokes.py`, `place.py`, `pins.py`, `02-wire.py`, `hierarchical-labels.ts ops` then `check`,
`text_edits.py`.

**A multi-unit part** (the ldo_vmid page's U5, an OPA1688 in three units) is placed unit by unit,
each unit a `layout.py` key `<ref>:<unit>` (Task 7c): `page.py`'s `place_ops` moves each unit by
`move_component` with its `unit` and refuses any rotation or mirror on one, since akcli 0.22.0's
`set_component_transform` takes no unit; `pins.py` and `text_edits.py` key it the same way; and
`draughting/measure/kicad_sheet.py` places each instance's own unit's pins only (`instance_pins`),
where it had placed every unit's pins at every instance. `net_strokes.py` did the same and was
missed until the Task 7c review: it found no draft wire on ldo_vmid's VMID_L and VMID_R, and their
stroke was written by hand; it now uses `instance_pins`, the hand entries are gone, and
`tests/draught/net-strokes-multi-unit.test.ts` holds it on the dual-op-amp fixture (it fails on the
former tool, which found only VCC and VEE there). The single-unit result is unchanged: across
51 sheets (every `.kicad_sch` under `drafted/`, `docs/research/` and `tests/fixtures/`, and the six
pedal drafts), only the two holding a multi-unit symbol (this draft and the
dual-op-amp test fixture) gave different pin points, and the module's replay, `verify-root.sh` and
`erc-control.sh` came out as before.

**A mirrored part** (the usb page's U15, mirrored left to right, and the usb draft's J7, which
copperhead mirrors top to bottom; Task 9a): `draughting/pages/net_strokes.py` placed every pin as if
no part were mirrored. On the usb draft that seeded J7's pins at their unmirrored places, J7's SBU2
(an unconnected pin, named no net by akcli) landed on another net's wire, and the tool stopped
sorting a `None` net name. It now reflects a mirrored part's pins after the rotation, as `pins.py`
does, and refuses any other mirror atom. Across every committed `.kicad_sch` (`drafted/`,
`tests/fixtures/`, `docs/research/`, `circuits/`) and the fifteen pedal drafts, no sheet on which the
former and the present tool both run gives a different result; five the former tool stopped on now
run (the approved `pultec-low-boost` page, two research sheets and the pedal's usb and expr_ref
drafts). `tests/draught/net-strokes-mirror.test.ts` runs it on `pultec-low-boost` (one mirrored
potentiometer); it fails on the former tool, and checks that RV1's two nets take the stroke of the
wire at each mirrored pin. **KiCad mirrors a field's justification with a part mirrored left to
right**, as it turns it with a rotation of 90 or 180: on U15 (rotation 0) and J8 (rotation 270), a
field written `left` in the sheet read right-justified on the render. Until the Task 9a fix round
U15's `layout.py` wrote `right` to get a left-justified page, and J8's wrote `left` and read right.
**Controller ruling (the owner may override), the fix round:** `text_edits.py` now swaps the
justification for a `(mirror y)` part too, so a layout states the justification the page shows (U15
`left`, J8 `right`), and refuses a justified field on a part mirrored top to bottom at rotation 90 or
270, which no page has measured. Both pages' bytes are unchanged; `tests/draught/text-edits-mirror-justify.test.ts`
re-runs the tool on both committed pages and requires their bytes, and a control (U15's layout
stating `right`) requires the tool to write `left`.

**A page note** (the midi_i2c page's, Task 9a): `layout.py` may declare `NOTES`, each a list of lines
and a point; `02-wire.py` adds each through `page.Wiring.note`, an akcli `add_text` op in op-list 02
with its lines joined by a newline built in code, and `text_edits.py` makes each left-justified
(akcli writes none, and KiCad centres a text on its point, measured on a probe) and refuses a count
that is not `NOTES`'s. Its group-caption match now requires the caption's `(at ...)` to end the line,
which is copperhead's form and not akcli's, so a note is never taken for the caption. A page with no
`NOTES` gets no op and no edit: the replay reaches every earlier page's sha256 with the change.

The measurements in each table are `draughting/pages/verify.sh` on the page, and the same steps run
without stopping on the draft (a draft fails verify.sh's model comparison and its ERC, as a draft is
not a page). None of these is a judgement of a page.

## The tables after Task 7b

The pf and modsw pages are the first with active parts, so the pedal's tables took their first
entries there, each from that page's ERC report (`repair/tools/`, each file's header says why):

- `pwr-flag-homes.ts`: **GND on the root**, under
  [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags). The pf page's
  U1 and U2 have `power_in` GND pins, and no pin anywhere on the pedal's GND is a power output
  (measured over `h7Pedal()`: 44 passive, 4 `power_in`, and U5's OPA1688 V-, `power_in` on the
  project symbol). The module kept its GND flag on its power page only because that page was
  approved with it; no pedal page carries a flag, so GND's goes on the root and no block page draws
  one.
- `cross-page-drivers.ts`: **5V_A** (driven by U4's OUT on the ldo_vmid page, a `power_out` pin, so
  its one-block-root stand-in is a PWR_FLAG; drafted ruling
  [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers),
  the measurement is in the pf section), and **PF_TRIP** and **PF_ON** (driven by U2's 1Y and 2Y on
  the pf page; each reaches one MOSFET gate, typed `input`, on the modsw page).
- `erc-allowances.ts`: still empty. No page needs an allowance.

**What this does to the Task 7a pages: nothing to their bytes, and one count each under their
one-block roots.** Each one-block root now carries the root's GND flag on its GND stub, so that
stub's label no longer dangles. Re-run after the tables changed: `verify.sh` exits 0 on both
pages; `/interface/` and `/entry/` stay at 0 errors and 0 warnings; `/` drops from 1 to 0
`label_dangling` on interface and from 3 to 2 on entry. Each page's own table below is as it was
measured in Task 7a.

## The tables after Task 7c

The prail and ldo_vmid pages each added one net to `pwr-flag-homes.ts`, from that page's ERC
report under its one-block root (the file's header has both):

- **VIN_MOD on the root.** The prail page's U3 VIN (pin 3) is `power_in`, and `/prail/` reported
  `power_pin_not_driven` on it. No pin on the pedal's VIN_MOD is a power output (measured over
  `h7Pedal()`: C12, C14, C15, C16, R12, TP4, Q1's drain and J2 pin 19, all passive, and U3's VIN).
- **VIN_A on the root.** The ldo_vmid page's U4 IN (pin 8) is `power_in` (U5's V+, pin 8, too), and
  `/ldo_vmid/` reported `power_pin_not_driven` on U4's IN. No pin on the pedal's VIN_A is a power
  output (C2-C7, C25, C30, C31, R22, TP2 and D1's cathode passive; U4's EN `input`; U4's IN and U5's
  V+ `power_in`).

`cross-page-drivers.ts` is unchanged. **The 5V_A entry was checked against the page that holds its
driver**: the ldo_vmid page draws U4 pin 1, named OUT and typed `power_out` in the embedded
`h7-platform:TPS7A4901DGN` (sheet line 897), on 5V_A (the page's model comparison is 0, 0, 0, 0),
and the entry's source line, `circuits/h7-platform/pedal/ldo-vmid.ts:66`, is U_LDO's part line, pin
1 on 5V_A. Under the ldo_vmid page's own one-block root no stand-in is placed for 5V_A, since
ldo_vmid is the driving block. Whether the assembled root clears 5V_A with U4 itself is the root's
check (`root-drivers.ts`), and is not run until the root exists.
[CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers)
was adopted by the controller at the Task 7b review and amended at Task 7c (its appended
**Amended** note): the refusal of a flag on a `power_out` driver's net now runs board-wide, and
`repair/tools/erc-control.sh` re-runs the pf page's measurement and the refusal.

`erc-allowances.ts` is still empty: no page needs an allowance.

**What this does to the four earlier pages: nothing to their bytes, and counts under their
one-block roots only.** Re-run with these tables, `verify.sh` exits 0 on interface, entry, pf and
modsw, each block sheet at 0 errors and 0 warnings, and each sha256 unchanged. Their one-block roots
now carry the root's flag on a VIN_MOD or VIN_A stub where they reach one: `/` on entry drops from 2
to 1 `label_dangling` (VIN_A), on modsw from 2 to 1 (VIN_MOD), and interface's `/` reads 0 errors and
66 warnings (VIN_MOD); pf reaches neither. Each page's own table below is as it was measured in its
task.

## The tables after Task 9a

- `pwr-flag-homes.ts`: **3V3_D on the root**, from the usb page's report under its one-block root:
  U15's VCC (pin 10) is `power_in`, and `/usb/` reported `power_pin_not_driven` on it. No pin on the
  pedal's 3V3_D is a power output (measured over `h7Pedal()`: J2 pin 18, the module's 3V3_D, and the
  pull-ups, decoupling capacitors, R83, R86, R93, R94, TP6 and J8 pin 1 are passive; U10's, U15's and
  U16's VCC are `power_in`). Under the one-block root the stub flag clears it: `/usb/` reads 0
  errors.
- `cross-page-drivers.ts` and `erc-allowances.ts` are unchanged.

**What this does to the six earlier pages: nothing to their bytes.** Of the six, only interface has a
3V3_D port (J2 pin 18), so only its one-block root changes: its 3V3_D stub now carries the root's
flag, and its `/` reads 0 errors and 64 warnings where it read 66. Re-run with this table,
`verify.sh` exits 0 on all six, each block sheet at 0 errors and 0 warnings, each sha256 unchanged;
the replay into a new directory reaches every earlier page's sha256.

## interface: the two module sockets (Task 7a)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a`.
Render: `interface.svg` beside it.

The block: `circuits/h7-platform/pedal/interface.ts`, 2 parts (J1 and J2, J_MOD_A and J_MOD_B,
`Connector_Generic:Conn_01x20`, Value `801-43-020-10-012000`, parts.md:158), 35 ports: GND on J1.20
and J2.20, and 34 that each reach one pad. J1's pads 16 to 19 are the contract's NC pins.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `interface` is one of the pedal's 19 blocks and holds
  J_MOD_A and J_MOD_B only.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads), cited by the block for what it does NOT hold: no
  test pad is on this page; each pad goes to the block that builds its net.
- [R-5](../../../docs/h7-platform/decisions.md#r-5): the 40-pin interface is two 1 x 20 parts, J_MOD_A (contract pins 1-20) and
  J_MOD_B (21-40), female on the pedal.
- [R-61](../../../docs/h7-platform/decisions.md#r-61): the socket is Mill-Max 801-43-020-10-012000, the Value both parts carry.
- [RR-5](../../../docs/h7-platform/decisions.md#rr-5): contract pins 16-19 are reserved, so J1's pads 16-19 carry no-connects.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, 3V3_D,
  VREF_A and VIN_MOD are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin on it is passive, so ERC needs none here; `repair/tools/pwr-flag-homes.ts`
  was empty when it was drawn (Task 7b has since homed GND's flag on the root; see "The tables
  after Task 7b").
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  each port's label holds exactly its pins (0 of 35 on the wrong net).
- The placement and wiring are the module's interface page's
  (`../h7-module/repair/interface/layout.py` and `02-wire.py`), which the owner approved on
  2026-11-12, copied: the pedal's interface block is built through the same `socketPads` and its
  pads carry the same contract nets. Two things differ, both drawing choices: the title, and the
  group rectangle's east edge, moved 7.62 mm east (195.58 to 203.2 mm) because the first render of
  this page showed J2's Value, the socket's longer part number, crossing it.
- The stroke of the 34 nets the draft drew no wire for: copperhead's stroke for a net of no colour
  family, the one the draft's GND carries (`interface/layout.py`, `UNDRAWN_STROKES`). A drawing
  choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 2 (J1, J2: the model declares none) | 0; 2 |
| exported components, nets, net members | 2, 39, 40 | 2, 39, 40 |
| exported nets carrying a model net name | 1 of 39 (/GND) | 35 of 39 (every port; the 4 others are J1's no-connect pads) |
| ports whose label is on the wrong net | 34 of 35 (no label: each one-pad port is unconnected on the draft) | 0 of 35 |
| ERC, the sheet alone | 34 errors (`pin_not_connected` 34), 0 warnings | 35 errors (`pin_not_connected` 35: each hierarchical label has no parent sheet), 34 warnings (`isolated_pin_label` 34) |
| ERC under a one-block root, `/interface/` | 34 errors (`pin_not_connected` 34) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 70 errors (`hier_label_mismatch` 35, `label_dangling` 35), 0 warnings | 1 error (`label_dangling` 1, a stub's label; admitted by `erc_sheets.py` as the stubs' with one block), 68 warnings (`isolated_pin_label` 68) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 0 | 0 of 1 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 1 on 1 net (0 global) | 35 on 35 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 1 | 0 of 35 |
| symbols (parts, power symbols, PWR_FLAGs) | 2 (2, 0, 0) | 2 (2, 0, 0) |
| placed pins | 40 | 40 |
| wires, total length | 3, 17.78 mm | 40, 351.79 mm |
| wire corners | 0 | 3 |
| junctions | 0 | 1 |

### What the page shows, as observations

- J1 and J2 stand upright side by side, J1 west of J2, pin 1 at the top, every pin facing west.
- Each pad with a signal runs west by one 300 mil stub to its hierarchical label, so the labels
  stand in two columns, J1's west of J1 and J2's between the two sockets.
- J1's pads 16 to 19 carry no-connects.
- GND's label is on J1.20's stub. J2.20 runs west, drops to a row under both sockets, runs west
  under J1 and rises to J1.20's stub, where a junction joins it.
- Both sockets carry Reference over Value, centred above pin 1; J2's Value ends inside the group
  rectangle.
- The page's arrangement is the module interface page's, and so are its 35 port names and the pad
  each sits on: the two blocks' `ports.json` are equal (compared as name-to-pins maps).

## entry: the power entry (Task 7a)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736`.
Render: `entry.svg` beside it.

The block: `circuits/h7-platform/pedal/entry.ts`, 15 parts: J3 (J_DC, `Connector:Barrel_Jack`),
FB1 (FB_IN, `Device:FerriteBead`), D1 and D2 (D_AIN, D_MIN, `Diode:PMEG4030ER`), C1 (C_SCH), C2
(C_PROTHF), C3 to C6 (C_BULK to C_BULK4, `Device:C_Polarized`), C7 (C_PROT), R1 (R_VBLD), TP1, TP2
and TP3 (`Connector:TestPoint`). Ports GND, VIN, VIN_A and VIN_MSW (VIN_MSW reaches one pin, D2's
cathode). VIN_FB is private to the page and is drawn as wire, with no label.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `entry` is one of the pedal's 19 blocks: the DC jack,
  both Schottkys, FB_IN, the hold-up reservoir on VIN_A, R_VBLD (and, by CR-PEDAL-TEST-PADS, the
  VIN, VIN_A and GND pads).
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the pedal adds no model kind. D1
  and D2 are `diode`, pin 1 K and pin 2 A on `Diode:PMEG4030ER`, which is why each anode is pin 2
  on the page. FB_IN is an `inductor` (the block cites it as CR-PEDAL-KINDS' FERRITE_IN), so the
  model carries henries and the page draws the rating (CR-MODULE-BEAD-VALUE, below).
- [CR-PEDAL-CHASSIS-PAD](../../../docs/h7-platform/decisions.md#cr-pedal-chassis-pad), cited by the block for what it does NOT hold:
  the chassis-bond GND pad is layout, not a model part, so it is not on this page.
- [R-35](../../../docs/h7-platform/decisions.md#r-35), amended by [R-40](../../../docs/h7-platform/decisions.md#r-40): one PMEG4030ER per branch (D1 to VIN_A, D2 to the
  module branch), and VIN_A's reservoir of four 100 uF 35 V cans, C3 to C6 (R-40 the fourth).
- [R-36](../../../docs/h7-platform/decisions.md#r-36): R1 (R_VBLD) 10.0 kOhm on VIN, so VIN falls after a plug pull.
- The block also cites PWR-01 and PWR-02 (`schematic-checklist.md` lines 117 and 118, the jack's
  polarity and one Schottky per branch); those are checklist items, not rulings, and reach this page
  through CR-PEDAL-DC-JACK and R-35.
- [CR-PEDAL-DC-JACK](../../../docs/h7-platform/decisions.md#cr-pedal-dc-jack): J3 on the generic
  `Connector:Barrel_Jack`, pin 1 (centre) on GND, pin 2 (sleeve) on VIN, no switch contact.
- [CR-PEDAL-FB-IN](../../../docs/h7-platform/decisions.md#cr-pedal-fb-in): FB1 from VIN to VIN_FB,
  both diodes' anodes on VIN_FB, C1 (C_SCH) on VIN, C2 (C_PROTHF) on VIN_A beside C7 (C_PROT).
- [CR-MODULE-BEAD-VALUE](../../../docs/h7-platform/decisions.md#cr-module-bead-value), as
  CR-PEDAL-FB-IN applies it: FB1 reads its rating, "600R@100MHz" (`valueFor`), not the model's 3 µH.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): TP1 on VIN, TP2
  on VIN_A, TP3 the one GND pad.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): VIN_MSW, D2's cathode.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, VIN and
  VIN_A are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin on it is passive, so ERC needs none here; `repair/tools/pwr-flag-homes.ts`
  was empty when it was drawn (Task 7b has since homed GND's flag on the root; see "The tables
  after Task 7b").
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 4 ports on the wrong net.
- Drawing choices, not transcriptions: J3 is mirrored top to bottom (`mirror x`) so its VIN pin is
  its upper pin and VIN's row runs above GND's; both diodes are turned 180 so each anode is west;
  VIN_MSW, which the draft drew no wire for, takes the blue stroke copperhead gives the VIN family
  (VIN_A and VIN_FB on the draft), by copperhead's own family rule (`entry/layout.py`,
  `UNDRAWN_STROKES`).
- The placement is the third: the first render showed FB1's Value running into D1's, TP1's Value
  into C1's, and each capacitor's Value reaching its east neighbour's body; the second, TP2's Value
  running into VIN_A's label (`entry/layout.py` records each change).

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 15 (the model declares none) | 0; 15 |
| exported components, nets, net members | 15, 5, 27 | 15, 5, 27 |
| exported nets carrying a model net name | 4 of 5 (/GND, VIN, VIN_A, VIN_FB) | 4 of 5 (/GND, /VIN, /VIN_A, /VIN_MSW; the fifth is VIN_FB, private and unlabelled) |
| ports whose label is on the wrong net | 3 of 4 | 0 of 4 |
| ERC, the sheet alone | 1 error (`pin_not_connected` 1, D2 pin 1), 2 warnings (`lib_symbol_mismatch` 2) | 4 errors (`pin_not_connected` 4: each hierarchical label has no parent sheet), 3 warnings (`isolated_pin_label` 1, `lib_symbol_mismatch` 2) |
| ERC under a one-block root, `/entry/` | 1 error (`pin_not_connected` 1, D2 pin 1), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 4, `label_dangling` 4), 2 warnings (`lib_symbol_mismatch` 2) | 3 errors (`label_dangling` 3, the stubs' labels with one block, which `erc_sheets.py` admits), 4 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 2, 10 | 0, 0 |
| orphan junctions, of total | 0 of 4 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 7; 10 | 0; 0 |
| labels | 9 on 4 nets (8 global) | 4 on 4 nets, all hierarchical |
| paper fit (US Letter) | overshoots east by 3.133 mm | fits |
| wire groups with more than one stroke | 0 of 9 | 0 of 5 |
| symbols (parts, power symbols, PWR_FLAGs) | 15 (15, 0, 0) | 15 (15, 0, 0) |
| placed pins | 27 | 27 |
| wires, total length | 47, 731.52 mm | 47, 370.84 mm |
| wire corners | 8 | 3 |
| junctions | 4 | 21 |

**`lib_symbol_mismatch`, 2 warnings on the draft and on the page**, measured with `kicad-cli sch erc
--severity-all`: *"Symbol 'PMEG4030ER' doesn't match copy in library 'Diode'"*, on D1 and on D2.

D1's and D2's embedded symbol (`Diode:PMEG4030ER`, `entry.kicad_sch` line 970; line 969 on the
draft), measured against the sheet and the installed `Diode.kicad_sym` (KiCad 10.0.5):

| | embedded in the sheet (draft and page alike) | installed `PMEG4030ER` |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "PMEG40T10ER")` (installed line 43025): fields only, its pins and graphics the parent's |
| pins | K pin 1 at (-3.81, 0), A pin 2 at (3.81, 0), both passive, length 2.54: identical, token for token, to the installed parent `PMEG40T10ER`'s | the parent's: the same two |
| graphics | the parent's three polylines, the same 12 points | the parent's |
| Value | `PMEG40T10ER` (the parent's) | `PMEG4030ER` |
| Datasheet | `.../data-sheet/PMEG40T10ER.pdf` (the parent's) | `.../data-sheet/PMEG4030ER.pdf` |
| Description | "40V, 1A low Vf Trench MEGA Schottky barrier rectifier, SOD-123W" (the parent's) | "40V, 3A low Vf MEGA Schottky barrier rectifier, SOD-123W" |
| Footprint, `ki_fp_filters`, `ki_keywords` | `Diode_SMD:Nexperia_CFP3_SOD-123W`, `Nexperia*CFP3*SOD?123W*`, "forward voltage diode" | the same |

So the embedded copy is the parent `PMEG40T10ER` flattened under the child's name. That is what
copperhead's flattening of an `extends` symbol produces, as the carrier record measured for
`USBLC6-2SC6` (`../h7-carrier/RECORD.md`, U2's embedded symbol). It is third-party behaviour, and this
repair does not touch `lib_symbols`.

**What reaches the page's netlist export** (`kicad-cli sch export netlist --format kicadxml` on the
committed sheet): each instance's own Value is `PMEG4030ER,115`, the fitted part. Its instance
Datasheet and Description fields are empty. But the `libpart` for `Diode` / `PMEG4030ER` carries
the description "40V, 1A low Vf Trench MEGA Schottky barrier rectifier, SOD-123W", the doc
`PMEG40T10ER.pdf`, and the field Value `PMEG40T10ER`. D1's and D2's `libsource` repeats that
description. So the export describes D1 and D2 as the 40 V 1 A part, with that part's data sheet.

**This is not an electrical fault.** The pins, their numbers, types and positions are the
installed part's, the model comparison is 0, 0, 0, 0, and ERC reports it as a warning. The fitted
part is the 3 A PMEG4030ER (R-35, `PMEG4030ER` in `pedal-parts.ts`), and the instance Value says
so.

**Trap for a later output:** a reader taking the description or data sheet from this page's export
or symbol fields gets the 1 A part's. **What would settle it:** the embedded symbol carrying the
installed `PMEG4030ER`'s own Value, Datasheet and Description. Either the repair rewrites those three
properties in `lib_symbols` (a direct text edit; it changes the page's bytes, so it is a redraw the
owner sees), or copperhead resolves `extends` with the child's fields. Neither is done here: both
pages were sent to the owner at their current sha256.

### What the page shows, as observations

- J3 stands at the west, mirrored top to bottom: pin 2 (VIN) is its upper pin, pin 1 (GND) its
  lower, both facing east.
- VIN runs east on one row from J3.2. VIN's hierarchical label sits on a stub rising from the row
  just east of J3, its text vertical; TP1 stands on the row; C1 and R1 hang from it to the GND row;
  FB1 lies in the row.
- At VIN_FB, east of FB1, a riser goes up to a second row: D2, anode west, runs east to VIN_MSW's
  hierarchical label, which points east. D1, anode west, continues on the first row into VIN_A.
- VIN_A runs east from D1's cathode: C3 to C6, C7 and C2 hang from it to the GND row, 450 mil apart;
  TP2 stands on the row; VIN_A's hierarchical label ends the row at the east, pointing east.
- GND runs along a row under the VIN row, its hierarchical label at the west end pointing west;
  J3.1 drops to it, TP3 hangs under it, and every hanging part's pin 2 meets it.
- VIN_A, VIN_FB and VIN_MSW wires carry copperhead's blue stroke; VIN and GND its default.
- The hanging parts carry Reference over Value east of their bodies; D1's below the row, D2's and
  FB1's above their rows; J3's above its body; the pads' east of their circles.

## pf: the power-fail supervisor (Task 7b)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385`.
Render: `pf.svg` beside it.

The block: `circuits/h7-platform/pedal/pf.ts`, 13 parts: U1 (U_PF, `h7-platform:TPS3808G01DBV`,
TPS3808G01DBVR), R2 (R_PFT1 13.0 kOhm), R3 (R_PFT2 174 kOhm), R4 (R_PFB 10.0 kOhm), D3 (D_PFCL,
BAS116H on `Device:D`), C8 (C_PFS 1 nF), C9 (C_PF 100 nF), C10 (C_PFCT 47 nF), R5 (R_PFPU 100 kOhm),
U2 (U_PFINV, `74xGxx:SN74LVC2G14DBV`, SN74LVC2G14DBVR), C11 (C_PFINV 100 nF), R6 (R_PFTPD 100 kOhm),
R7 (R_PFONPD 100 kOhm). Ports 5V_A, GND, PF_ON, PF_TRIP and VIN (VIN reaches one pin, R2's pin 1).
PF_CLAMP, PF_SENSE, PF_CT and PF_OK are private to the page and drawn as wire, with no label.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `pf` is one of the
  pedal's 19 blocks: U_PF, its sense divider, and U_PFINV making PF_TRIP and PF_ON.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): U1 and U2 are `ic`; D3 is
  `diode`, pin 1 K and pin 2 A, so its cathode (pin 1) is on PF_CLAMP and its anode on GND.
- [R-36](../../../docs/h7-platform/decisions.md#r-36): U_PF senses VIN at the jack through a 0.1 %
  divider.
- [R-37](../../../docs/h7-platform/decisions.md#r-37): U_PF's open-drain RESET drives only PF_OK,
  pulled up to 5V_A by R5; a Schmitt inverter makes PF_TRIP.
- [R-40](../../../docs/h7-platform/decisions.md#r-40): the top resistor split into R_PFT1 (R2) and
  R_PFT2 (R3) with D_PFCL (D3) clamping the node between them; C_PFCT 47 nF (C10) on CT; the dual
  inverter, U2.
- [CR-PEDAL-POWER-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-power-readings):
  U_PFINV's channel A is gate 1 (1A pin 1 on PF_OK, 1Y pin 6 PF_TRIP) and channel B gate 2 (2A pin
  3 on PF_TRIP, 2Y pin 4 PF_ON).
- [CR-PEDAL-POWER-DATASHEET-ENDS](../../../docs/h7-platform/decisions.md#cr-pedal-power-datasheet-ends):
  the GND ends of C10 (CT to GND) and C8 (SENSE to GND), from TI SBVS050N.
- [CR-PEDAL-SYMBOL-TPS3808G01](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-tps3808g01):
  U1 is the project symbol, RESET typed `open_collector`.
- [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes): BAS116H on
  `Device:D`, pin 1 K, pin 2 A.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): the rule U1's
  project symbol and U2's stock symbol are held to (U2, `74xGxx:SN74LVC2G14DBV`, is the part's own
  stock symbol, `pedal-parts.ts`).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 5V_A and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. GND's single flag is on the root (`pwr-flag-homes.ts`, "The tables after Task 7b"), so
  the one-block root puts a stub flag on GND.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and the drafted
  [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  5V_A's driver is U4's OUT on the ldo_vmid page; its one-block-root stand-in is a PWR_FLAG (below).
  The page itself is the driver of PF_TRIP and PF_ON, the entries the modsw page needs.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 5 ports on the wrong net.
- The block also cites `power.md` lines 121, 142 and 149, `bypass-relay.md` lines 184 to 186 and
  `parts.md` lines 59 to 74 and 104 for each part; those are the design notes the rulings above
  rest on, not rulings.
- Drawing choices, not transcriptions: C9 and C11 stand together at the west, next to the 5V_A and
  GND labels, because the signal path runs west to east between the two rows and any column nearer
  U1 or U2 would cross it; D3 is turned 270 so its cathode is up; R5 is turned 180 so its 5V_A pin
  is up; VIN, which the draft drew no wire for, takes copperhead's default stroke, the one VIN has on
  the entry page (`pf/layout.py`, `UNDRAWN_STROKES`).

### The 5V_A stand-in, measured on this page

Under the one-block root, with GND's stub flag in place, `kicad-cli sch erc` (10.0.5) on this page:

| stand-in on 5V_A's stub | `/pf/` |
| --- | --- |
| none | 1 error: `power_pin_not_driven`, *"Symbol U1 Pin 6 [VDD, Power input, Line]"* |
| `Connector:TestPoint` (CR-MODULE-CROSS-PAGE-DRIVERS' stand-in, by the `PAGES_CROSS_PAGE_DRIVERS_TABLE` override) | the same 1 error |
| a PWR_FLAG (the stand-in `standInKind` chooses for U4's `power_out` OUT) | 0 errors, 0 warnings |

With no table entries at all, `/pf/` reports 2 errors, `power_pin_not_driven` on U1's VDD (5V_A) and
on U1's GND (GND); GND's root flag clears the second. A flag home for 5V_A is not taken: U4's OUT is
`power_out`, so a PWR_FLAG on 5V_A in the assembled hierarchy would be a second power output on the
net.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 7b leaves them.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 13 (the model declares none) | 0; 13 |
| exported components, nets, net members | 13, 9, 34 | 13, 9, 34 |
| exported nets carrying a model net name | 8 of 9 (/PF_CLAMP, /PF_CT, /PF_ON, /PF_SENSE, /PF_TRIP, 5V_A, GND, PF_OK; VIN is unconnected) | 5 of 9 (/5V_A, /GND, /PF_ON, /PF_TRIP, /VIN, the ports; the other 4 private and unlabelled) |
| ports whose label is on the wrong net | 3 of 5 | 0 of 5 |
| ERC, the sheet alone | 3 errors (`pin_not_connected` 1, R2 pin 1; `power_pin_not_driven` 2), 0 warnings | 7 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `power_pin_not_driven` 2), 3 warnings (`isolated_pin_label` 1, `lib_symbol_issues` 1, `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/pf/` | 3 errors (`pin_not_connected` 1, `power_pin_not_driven` 2: U1's VDD and GND), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 5, `label_dangling` 3), 4 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 1, `lib_symbol_mismatch` 1) | 2 errors (`label_dangling` 2, the PF_ON and PF_TRIP stubs' labels, alone with one block; `erc_sheets.py` admits them), 4 warnings (the same four) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 5, 1 | 3, 0 |
| orphan junctions, of total | 0 of 7 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 1; 1 | 0; 0 |
| labels | 17 on 8 nets (11 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 17 | 0 of 9 |
| symbols (parts, power symbols, PWR_FLAGs) | 13 (13, 0, 0) | 13 (13, 0, 0) |
| placed pins | 34 | 34 |
| wires, total length | 60, 572.77 mm | 57, 795.02 mm |
| wire corners | 13 | 7 |
| junctions | 7 | 21 |

The draft's ERC columns were measured beside the committed `sym-lib-table` as well as where `make
draw` wrote it: in `build/draw/` the draft alone reports 0 warnings, because its own `sym-lib-table`
maps the stock libraries to copperhead's vendored `sym-lib-cache`; copied beside the committed table it
reports the page's `lib_symbol_issues` 1 and `lib_symbol_mismatch` 1. So both warnings come from the
library context, not from the repair, as the module record found for its usb_dfu page.

**`lib_symbol_issues` 1**: *"The current configuration does not include the symbol library
'h7-platform'"*, on U1. A block page has no `.kicad_pro` beside it, and kicad-cli 10.0.5 does not
take the committed `sym-lib-table` without one; the module's reset_boot and sdram pages, whose
parts include project symbols, carry the same warning, and its root, with a `.kicad_pro`, does not
(`../h7-module/RECORD.md`). U1's symbol is embedded in the sheet, so its pins are the project
symbol's.

**`lib_symbol_mismatch` 1**: *"Symbol 'SN74LVC2G14DBV' doesn't match copy in library '74xGxx'"*, on
U2. Measured as the entry page's PMEG4030ER was:

| | embedded in the sheet (draft and page alike, `pf.kicad_sch` line 14) | installed `SN74LVC2G14DBV` (`74xGxx.kicad_sym` line 27242) |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "Inverter_Schmitt_Dual")`: fields only, its pins and graphics the parent's |
| pins and graphics | identical, whitespace-normalised, to the installed parent `Inverter_Schmitt_Dual`'s: 1 1A input, 2 GND power_in, 3 2A input, 4 2Y output, 5 V_{CC} power_in, 6 1Y output | the parent's |
| Value | `Inverter_Schmitt_Dual` (the parent's) | `SN74LVC2G14DBV` |
| Datasheet | empty (the parent's) | `https://www.ti.com/lit/ds/symlink/sn74lvc2g14.pdf` |
| Description | "Dual schmitt inverter" (the parent's) | "Dual schmitt inverter, VCC from 1.65 to 5.5 V, SOT-23" |
| Footprint | empty (the parent's) | `Package_TO_SOT_SMD:SOT-23-6` |
| `ki_fp_filters` | `SOT?23* SOT?363* SC?70*` (the parent's) | `SOT?23*` |

copperhead's flattening of an `extends` symbol takes the parent's fields under the child's name,
as the entry page's D1 and D2 and the carrier's U2 show. What reaches the page's export
(`kicad-cli sch export netlist --format kicadxml`): U2's own Value is `SN74LVC2G14DBVR`, the fitted
part; its libsource and libpart describe it as "Dual schmitt inverter", with no data sheet and no
footprint, and the libpart's Value field is `Inverter_Schmitt_Dual`. **Not an electrical fault**:
pins, numbers, types and positions are the installed part's, and the model comparison is 0, 0, 0, 0.
**Trap for a later output**: the export carries the parent's generic description and no data sheet
or footprint for U2. **What would settle it**: the embedded symbol carrying the child's fields, by a
`lib_symbols` text edit (a change to the page's bytes) or by copperhead resolving `extends` with the
child's fields. Not done here.

### Why the page has three crossings, as the layout records it

Observations of the symbols' pin order, not a judgement of the page:

- **U1's MR** (pin 3) sits on the symbol's west side between SENSE (pin 5) above and CT (pin 4)
  below, both on other nets, and MR is on 5V_A with VDD on the top of the body. Any wire from MR to
  the 5V_A row therefore passes SENSE's or CT's wire. Here MR's riser crosses the SENSE row once.
- **U2's PF_TRIP** joins 1Y (pin 6, east, upper) to 2A (pin 3, west, lower). On the symbol, 1Y and 2A
  separate 2Y and GND on one side from 1A and VCC on the other, so a wire between them encloses one
  pair. Here it runs under U2 and crosses U2's GND drop and PF_ON's row, once each. R6 hangs from that
  run.

### What the page shows, as observations

- A 5V_A row along the top and a GND row along the bottom, each from its hierarchical label at the
  west edge, pointing west.
- C9 and C11 stand across the two rows at the west, next to the labels.
- VIN's hierarchical label, pointing west, starts the signal row: R2 lies in it, then the clamp node,
  with D3 (cathode up) hanging to GND, then R3, then the SENSE node, with R4 and C8 hanging to GND,
  and the row runs east into U1's SENSE.
- U1 stands in the middle, VDD up to the 5V_A row and GND down to the GND row. MR's wire goes west
  and rises to the 5V_A row, crossing the SENSE row. CT's goes west and down to C10.
- U1's RESET runs east on one row into U2's 1A; R5 hangs from the 5V_A row onto it.
- U2 stands east of U1, VCC up and GND down. 1Y runs east to PF_TRIP's label at the east edge. From
  a node east of U2 the PF_TRIP wire also runs down, west under U2 and up into 2A; R6 hangs from that
  run to GND. 2Y runs east to PF_ON's label, R7 hanging from it to GND.
- The PF_TRIP and PF_ON labels end the page at the east, in the input shape akcli writes every
  hierarchical label in (`TOOLING.md`, C3).
- The private nets carry copperhead's blue stroke; 5V_A, GND and VIN its default.
- The hanging parts carry Reference over Value east of their bodies; D3's and R6's west; R2's and R3's
  above the row; U1's under its body; U2's above its body.

## modsw: the module load switch (Task 7b)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `89ed82bcbc60b4e2f075257768f68a4a66370348dc5db4e7c4b9632ca3099dc2`.
Render: `modsw.svg` beside it.

The block: `circuits/h7-platform/pedal/modsw.ts`, 13 parts: Q1 (Q_MSW, AOD4185 on
`Transistor_FET:Q_PMOS_GDS`), R8 (R_MSWT 15.0 kOhm), R9 (R_MSWB 4.30 kOhm), Q2 (Q_MSWD, AO3400A),
C12 (C_SS 2.2 uF), D4 (D_SS, BAS116H on `Device:D`), R10 (R_SSR 15.0 kOhm), C13 (C_GS 220 nF), D5
(D_GS, BAS116H), R11 (R_GSB 470 kOhm), Q3 (Q_VDIS, AO3400A), R12 (R_VDIS 10.0 Ohm), TP4
(`Connector:TestPoint`). Ports GND, PF_ON, PF_TRIP, VIN_MOD and VIN_MSW (PF_ON and PF_TRIP each reach
one pin, Q2's and Q3's gates). MSW_G, MSW_X, MSW_GH, MSWD_D and VDIS_D are private to the page and
drawn as wire, with no label.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `modsw` is one of the
  pedal's 19 blocks: Q_MSW, its soft start and gate hold, and Q_VDIS (the single transistor placed
  here).
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the MOSFETs are `ic`; D4
  and D5 are `diode`, pin 1 K and pin 2 A, so each cathode is on the gate row.
- [R-38](../../../docs/h7-platform/decisions.md#r-38): Q_MSW between D_MIN and VIN_MOD, switched
  through Q_MSWD from PF_ON, gate network R_MSWT and R_MSWB; the soft start C_SS, D_SS and R_SSR;
  Q_VDIS with R_VDIS discharging VIN_MOD while tripped. As amended by
  [R-41](../../../docs/h7-platform/decisions.md#r-41) (Q_MSW an AOD4185, its network re-sized),
  [R-42](../../../docs/h7-platform/decisions.md#r-42) (R_VDIS 10.0 Ohm, CRCW201010R0FKEFHP) and
  [R-49](../../../docs/h7-platform/decisions.md#r-49) (C_GS, D_GS and R_GSB hold the gate through the
  plug-in edge).
- [CR-PEDAL-POWER-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-power-readings): R_VDIS
  (R12) on the VIN_MOD side with Q_VDIS's drain on VDIS_D; Q_VDIS's and Q_MSWD's sources on GND.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): VIN_MSW, Q_MSW's source,
  D_MIN's cathode on the entry page.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): TP4 on VIN_MOD
  ("Added: VIN_MOD").
- [CR-PEDAL-SYMBOL-AOD4185](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-aod4185): Q1 on
  the generic `Q_PMOS_GDS`, 1 G, 2 D, 3 S.
- [CR-PEDAL-SYMBOL-AO3400A](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a): Q2 and
  Q3 on the stock `Transistor_FET:AO3400A`, 1 G, 2 S, 3 D.
- [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes): BAS116H on
  `Device:D`.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): clause 1, a
  MOSFET's gate is `input`, which is why PF_ON and PF_TRIP need their drivers on this page's check.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VIN_MSW,
  VIN_MOD and GND are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; GND's single flag is on the root, and no pin here is a power input.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  PF_ON and PF_TRIP are driven by U2's 2Y and 1Y on the pf page (`cross-page-drivers.ts`); each
  takes a `Connector:TestPoint` stand-in on its stub under this page's one-block root. With the
  table overridden to no entries, `/modsw/` reports 2 errors, `pin_not_driven` on *"Symbol Q2 Pin 1
  [G, Input, Line]"* and *"Symbol Q3 Pin 1 [G, Input, Line]"*; with the entries, 0 and 0.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 5 ports on the wrong net.
- The block also cites `power.md` lines 147 to 162 and `parts.md` lines 61 to 77 for each part;
  those are design notes, not rulings.
- Drawing choices, not transcriptions: Q1 is turned 270 and mirrored top to bottom, so its source is
  west, its drain east and its gate down; D4 is turned 270 (cathode up); D5 is turned 180 (anode
  west, cathode east); PF_ON and PF_TRIP, which the draft drew no wire for, take copperhead's third
  palette colour, the next one no family on this page uses (`modsw/layout.py`, `UNDRAWN_STROKES`,
  says why); Q1's fields moved up after the first render showed its Value touching its body.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 7b leaves them.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 13 (the model declares none) | 0; 13 |
| exported components, nets, net members | 13, 10, 28 | 13, 10, 28 |
| exported nets carrying a model net name | 8 of 10 (/GND, /VDIS_D, MSWD_D, MSW_G, MSW_GH, MSW_X, VIN_MOD, VIN_MSW; PF_ON and PF_TRIP are unconnected) | 5 of 10 (/GND, /PF_ON, /PF_TRIP, /VIN_MOD, /VIN_MSW, the ports; the other 5 private and unlabelled) |
| ports whose label is on the wrong net | 4 of 5 | 0 of 5 |
| ERC, the sheet alone | 4 errors (`pin_not_connected` 2 and `pin_not_driven` 2, on Q2's and Q3's gates), 0 warnings | 7 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `pin_not_driven` 2, on Q2's and Q3's gates), 4 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 2) |
| ERC under a one-block root, `/modsw/` | 4 errors (`pin_not_connected` 2, `pin_not_driven` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 7 errors (`hier_label_mismatch` 5, `label_dangling` 2), 5 warnings (`isolated_pin_label` 3, `lib_symbol_mismatch` 2) | 2 errors (`label_dangling` 2, the VIN_MOD and VIN_MSW stubs' labels, alone with one block; `erc_sheets.py` admits them), 2 warnings (`lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 1, 0 |
| orphan junctions, of total | 0 of 2 | 0 of 13 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 17 on 8 nets (15 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 17 | 0 of 10 |
| symbols (parts, power symbols, PWR_FLAGs) | 13 (13, 0, 0) | 13 (13, 0, 0) |
| placed pins | 28 | 28 |
| wires, total length | 41, 257.81 mm | 40, 464.82 mm |
| wire corners | 15 | 5 |
| junctions | 2 | 13 |

The draft's 0 warnings alone are where `make draw` wrote it; copied beside the committed
`sym-lib-table` it reports the page's `lib_symbol_mismatch` 2, so they come from the library context,
as on the pf page.

**`lib_symbol_mismatch` 2**: *"Symbol 'AO3400A' doesn't match copy in library 'Transistor_FET'"*, on
Q2 and on Q3, one embedded symbol. Measured as the pf page's U2 was:

| | embedded in the sheet (draft and page alike, `modsw.kicad_sch` line 620) | installed `AO3400A` (`Transistor_FET.kicad_sym` line 1590) |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "Q_NMOS_GSD")`: fields only, its pins and graphics the parent's |
| pins and graphics | identical, whitespace-normalised, to the installed parent `Q_NMOS_GSD`'s: 1 G input, 2 S passive, 3 D passive | the parent's |
| Value | `Q_NMOS_GSD` (the parent's) | `AO3400A` |
| Datasheet | empty (the parent's) | `http://www.aosmd.com/pdfs/datasheet/AO3400A.pdf` |
| Description | "N-MOSFET transistor, gate/source/drain" (the parent's) | "30V Vds, 5.7A Id, N-Channel MOSFET, SOT-23" |
| Footprint | empty (the parent's) | `Package_TO_SOT_SMD:SOT-23` |
| `ki_keywords`; `ki_fp_filters` | "transistor NMOS N-MOS N-MOSFET"; none (the parent's) | "N-Channel MOSFET"; `SOT?23*` |

In the page's export, Q2's and Q3's own Value is `AO3400A`, the fitted part; their libsource and
libpart describe them as "N-MOSFET transistor, gate/source/drain", with no data sheet or footprint,
and the libpart's Value field is `Q_NMOS_GSD`. **Not an electrical fault**: pins, numbers, types and
positions are the installed part's, and the model comparison is 0, 0, 0, 0. The trap and what would
settle it are the pf page's U2's, above. Q1's `Q_PMOS_GDS` is a symbol of its own, not an
`extends`, and reports no mismatch.

### Why the page has one crossing, as the layout records it

An observation of the circuit's connections, not a judgement of the page: node X joins R10, on
Q1's source side, to C12, on its drain side, so the X wire runs under Q1 from west to east and, with
the power row through Q1, closes a loop around the gate network. The gate network (the gate row, R8,
D4, D5 and the GH run) sits inside it; R9 joins the gate row to Q2, which takes GND and PF_ON from
outside. R9's drop crosses the X row once.

### What the page shows, as observations

- VIN_MSW's hierarchical label at the west, pointing west, starts the power row; Q1 lies in the row
  with its source (pin 3) west, its drain (pin 2) east and its gate (pin 1) pointing down; the row
  ends east in VIN_MOD's hierarchical label, pointing east.
- West of Q1, hanging from the VIN_MSW row: R10 down to the X row; C13 and R11 down to a short run
  that ends in D5's anode; R8 down to the gate row.
- D5 lies on the gate row's level, anode west and cathode east; from its cathode the gate row runs
  east, taking R8, D4's cathode (D4 rising from the X row) and R9, to Q1's gate column, where it turns
  up into the gate.
- The X row runs from R10 east, under the gate row and under Q1, to C12, which hangs from the VIN_MOD
  row east of Q1. R9's drop crosses the X row on its way down to Q2's drain.
- Q2 stands under R9: its gate west on one stub to PF_ON's label, its source down to the GND row,
  whose label is at its west end, under PF_ON's, both pointing west.
- East of C12 on the VIN_MOD row: TP4 standing on the row, then R12 hanging to Q3's drain; Q3's gate
  west on one stub to PF_TRIP's label, pointing west; its source down to the GND row.
- VIN_MSW and VIN_MOD wires carry copperhead's purple stroke; MSW_G, MSW_GH and MSW_X its blue;
  PF_ON and PF_TRIP its teal; GND, MSWD_D and VDIS_D its default. On the entry page VIN_MSW is blue,
  because copperhead colours each page's families on their own (there the VIN family is the first
  and only one); a reader following VIN_MSW across the two pages sees two colours.
- The hanging parts carry Reference over Value east of their bodies; D4's west; D5's and Q1's above;
  Q2's and Q3's east of their bodies; TP4's east of its circle.

## prail: the pedal digital rail 3V3_P (Task 7c)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `f440c0c355718e6e280f955abe1ef8df8f2075cf89d5866f3ef854f90ae15780`.
Render: `prail.svg` beside it.

The block: `circuits/h7-platform/pedal/prail.ts`, 20 parts: U3 (U_PRAIL,
`Regulator_Switching:TPS62933F`, TPS62933FDRLR), C14 and C15 (C_PIN1/2 10 uF), C16 (C_PINHF 100 nF),
L1 (L_PRAIL 4.7 uH, 74439346047), C17-C19 (C_POUT1-3 22 uF), C20 (C_POUT_HF 100 nF), R13 (R_FB_TOP
32.4 kOhm), R14 (R_FB_BOTTOM 10.0 kOhm), C21 (C_SS 33 nF), R15 (R_BST 0 Ohm), C22 (C_BST 100 nF),
R16 (R_PEN 150 kOhm), R17 (R_PENPD 1.00 MOhm), C23 and C24 (C_PEN1/2 4.7 uF), Q4 (Q_PEN,
`Transistor_FET:2N7002`, 2N7002,215), R18 (R_PENS 180 Ohm). Ports 3V3_P, GND, PF_ON, PF_TRIP and
VIN_MOD (PF_ON and PF_TRIP each reach one pin, R16's pin 1 and Q4's gate). PRAIL_EN, PRAIL_SW,
PRAIL_BST, PRAIL_BST_CAP, PRAIL_SS, PRAIL_FB and PEN_D are private to the page and drawn as wire,
with no label. U3's RT (pin 1) is a no-connect.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `prail` is one of the
  pedal's 19 blocks: U_PRAIL and its EN delay, with Q_PEN (the single transistor placed here).
- [R-25](../../../docs/h7-platform/decisions.md#r-25): 3V3_P from a TPS62933FDRLR on VIN_MOD, its EN
  following PF_ON through the network of R-44.
- [R-44](../../../docs/h7-platform/decisions.md#r-44), [R-45](../../../docs/h7-platform/decisions.md#r-45),
  [R-52](../../../docs/h7-platform/decisions.md#r-52) and [R-58](../../../docs/h7-platform/decisions.md#r-58):
  the EN network, R_PEN (R16) from PF_ON, R_PENPD (R17) and C_PEN (C23, C24) to GND, and Q_PEN (Q4,
  gate PF_TRIP, source GND) through R_PENS 180 Ohm (R18) to EN. The block cites them through
  power.md:85 (EC-QPEN-RESET).
- [CR-PEDAL-POWER-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-power-readings): "copied"
  is the module buck's own network without its input filter; the bootstrap order BST, R_BST, C_BST,
  SW and C_SS's GND end (the pedals checklist's PWR-06 and v1 verification, quoted there); C_PEN's
  other end on GND.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): U3 (a regulator) and Q4 (a
  MOSFET) are `ic`.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): U3 and Q4 are on
  their own stock symbols, held to the rule; clause 1 makes Q4's gate `input`, which is why PF_TRIP
  needs its driver on this page's check; clauses 6 and 7 predict TPS62933F's RT `passive` and SW
  `output`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VIN_MOD, 3V3_P
  and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. GND's and VIN_MOD's single flags are on the root ("The tables after Task 7c"), so the
  one-block root puts a stub flag on each.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  PF_ON and PF_TRIP are driven by U2's 2Y and 1Y on the pf page (`cross-page-drivers.ts`, the
  entries the modsw page added); each takes a `Connector:TestPoint` stand-in under this page's
  one-block root. The sheet alone reports `pin_not_driven` on *"Symbol Q4 Pin 1 [G, Input, Line]"*;
  under the one-block root, with the stand-ins, `/prail/` is at 0 and 0.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 5 ports on the wrong net.
- The block also cites `power.md` lines 85, 272, 376 to 380 and 437, the schematic checklist's PWR-06
  (line 124) and `parts.md` lines 57 and 78 to 90 for each part; those are design notes, not rulings.
- Drawing choices, not transcriptions: C14-C16 stand together at the west, next to the VIN_MOD and
  GND labels, because the EN row runs west to east between the two rows and any column nearer U3's
  VIN would cross it; R18 is turned 180 so its EN pin is up; R16, R15 and L1 lie in their rows
  (rotation 90); PF_ON and PF_TRIP, which the draft drew no wire for, take the teal (copperhead
  palette colour 3) the modsw page gives them, so the PF family is one colour on both pages that
  draw it (`prail/layout.py`, `UNDRAWN_STROKES`); fields moved after the renders listed in
  `prail/layout.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 7c leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 20 (the model declares none) | 0; 20 |
| exported components, nets, net members | 20, 13, 47 | 20, 13, 47 |
| exported nets carrying a model net name | 10 of 13 | 5 of 13 (/3V3_P, /GND, /PF_ON, /PF_TRIP, /VIN_MOD, the ports; the other 8 private and unlabelled) |
| ports whose label is on the wrong net | 3 of 5 | 0 of 5 |
| ERC, the sheet alone | 5 errors (`pin_not_connected` 2, R16 pin 1 and Q4 pin 1; `pin_not_driven` 1, Q4's gate; `power_pin_not_driven` 2, U3's VIN and GND), 2 warnings (`lib_symbol_mismatch` 2) | 8 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `pin_not_driven` 1, Q4's gate; `power_pin_not_driven` 2, U3's VIN and GND), 4 warnings (`isolated_pin_label` 2, PF_ON and PF_TRIP; `lib_symbol_mismatch` 2) |
| ERC under a one-block root, `/prail/` | 5 errors (`pin_not_connected` 2, `pin_not_driven` 1, `power_pin_not_driven` 2), 1 warning (`same_local_global_label` 1) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 6 errors (`hier_label_mismatch` 5, `label_dangling` 1), 6 warnings (`isolated_pin_label` 4, `lib_symbol_mismatch` 2) | 1 error (`label_dangling` 1, the 3V3_P stub's label, alone with one block; `erc_sheets.py` admits it), 2 warnings (`lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 5, 13 | 0, 0 |
| orphan junctions, of total | 0 of 13 | 0 of 27 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 10; 7 | 0; 0 |
| labels | 14 on 10 nets (5 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | overshoots east 81.873 mm | fits |
| wire groups with more than one stroke | 0 of 14 | 0 of 12 |
| symbols (parts, power symbols, PWR_FLAGs) | 20 (20, 0, 0) | 20 (20, 0, 0) |
| placed pins | 47 | 47 |
| wires, total length | 94, 1578.61 mm | 66, 894.08 mm |
| wire corners | 22 | 3 |
| junctions | 13 | 27 |

**`lib_symbol_mismatch` 2**, on U3 and on Q4: *"Symbol 'TPS62933F' doesn't match copy in library
'Regulator_Switching'"* and *"Symbol '2N7002' doesn't match copy in library 'Transistor_FET'"*.
Each installed symbol is an `extends`, and each embedded copy is the parent flattened under the
child's name, as the pf page's U2 and the modsw page's Q2 and Q3 are. Measured with the same
comparison (whitespace-normalised units and pins against the installed parent):

| | embedded (`prail.kicad_sch` line 487) | installed `TPS62933F` (`Regulator_Switching.kicad_sym` line 149786, `(extends "TPS62933")`) |
| --- | --- | --- |
| pins and graphics | identical to the installed parent `TPS62933`'s: 1 RT passive, 2 EN input, 3 VIN power_in, 4 GND power_in, 5 SW output, 6 BST passive, 7 SS passive, 8 FB input | the parent's |
| Value | `TPS62933` (the parent's) | `TPS62933F` |
| Datasheet; Footprint; `ki_fp_filters` | the same as the child's | `https://www.ti.com/lit/ds/symlink/tps62933.pdf`; `Package_TO_SOT_SMD:SOT-583-8`; `SOT?583*` |
| Description | "3.8-30V, 3A Synchronous Buck Converters with pulse frequency modulation (PFM), SOT583-8" (the parent's) | "... with forced continuous conduction mode (FCCM), SOT583-8" |
| `ki_keywords` | "synchronous buck converter pulse frequency modulation" (the parent's) | "synchronous buck converter forced continuous conduction mode" |

| | embedded (`prail.kicad_sch` line 729) | installed `2N7002` (`Transistor_FET.kicad_sym` line 813, `(extends "Q_NMOS_GSD")`) |
| --- | --- | --- |
| pins and graphics | identical to the installed parent `Q_NMOS_GSD`'s: 1 G input, 2 S passive, 3 D passive | the parent's |
| Value | `Q_NMOS_GSD` (the parent's) | `2N7002` |
| Datasheet | empty (the parent's) | `https://www.onsemi.com/pub/Collateral/NDS7002A-D.PDF` |
| Description | "N-MOSFET transistor, gate/source/drain" (the parent's) | "0.115A Id, 60V Vds, N-Channel MOSFET, SOT-23" |
| Footprint; `ki_fp_filters` | empty; none (the parent's) | `Package_TO_SOT_SMD:SOT-23`; `SOT?23*` |

U3's and Q4's own Values on the page are `TPS62933FDRLR` and `2N7002,215`, the fitted parts. **Not
an electrical fault**: pins, numbers, types and positions are the installed parts', and the model
comparison is 0, 0, 0, 0. **Trap for a later output**: an export reading U3's library description
gets the PFM part, TPS62933, where the fitted part is the FCCM TPS62933F; Q4's gets the generic
MOSFET with no data sheet or footprint. The module's power page draws the same embedded TPS62933F
and carries the same warning (`../h7-module/RECORD.md`). What would settle it is the pf page's U2's,
above. Not done here.

### Why the page has no crossing, as the layout records it

An observation, not a judgement of the page: every net here reaches U3 from one side only (VIN, EN,
SS and RT west; BST, SW and FB east; GND down), and the EN network's parts all hang from one row, so
each row is crossed by nothing. The FB row runs west under C22 and L1 from R13's foot to U3's FB.

### What the page shows, as observations

- A VIN_MOD row along the top and a GND row along the bottom, each from its hierarchical label at
  the west edge, pointing west. C14, C15 and C16 stand across the two rows at the west.
- PF_ON's label, pointing west, starts the EN row: R16 lies in it, and the row runs east into U3's
  EN. Hanging from it, west to east: R18 (from Q4's drain below), R17, C23 and C24, to GND.
- PF_TRIP's label, pointing west, under PF_ON's, goes by one stub into Q4's gate; Q4's source drops
  to GND.
- The VIN_MOD row runs east past the EN network and drops into U3's VIN, just west of U3.
- C21 hangs from U3's SS to GND; U3's RT carries a no-connect.
- East of U3: BST through R15 to C22's top; SW east through C22's bottom pin and L1 onto the 3V3_P
  row, which runs to 3V3_P's label at the east edge, pointing east, with R13 and C17-C20 hanging
  from it. FB runs east under C22 and L1 to R13's foot, R14 below it to GND.
- PRAIL_* wires carry copperhead's blue stroke; PF_ON and PF_TRIP the teal they carry on the modsw
  page; VIN_MOD, 3V3_P, GND and PEN_D its default. On the modsw page VIN_MOD is purple, because
  copperhead colours each page's families on their own (there VIN_MOD and VIN_MSW are a family; here
  VIN_MOD is alone); a reader following VIN_MOD across the two pages sees two colours.
- The hanging parts carry Reference over Value east of their bodies; C21's, R18's, C22's, R13's and
  R14's west; R16's, R15's and L1's above the row; U3's above its body; Q4's west of its source.

## ldo_vmid: 5V_A and VMID (Task 7c)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `584cdc4ce97d96875c2c2b76a9504e99997eb1a21623668b7feb7202e6f96ecd`.
Render: `ldo_vmid.svg` beside it.

The block: `circuits/h7-platform/pedal/ldo-vmid.ts`, 17 parts on 19 placed instances: U4 (U_LDO,
`h7-platform:TPS7A4901DGN`, TPS7A4901DGNR), R19 (R_LDOT 32.4 kOhm), R20 (R_LDOB 10.0 kOhm), C25
(C_LIN 10 uF), C26 (C_LOUT 10 uF), C27 (C_NR 10 nF), C28 (C_FF 10 nF), R21 (R_5VA 0 Ohm), R22 and R23
(R_VMID_TOP/BOTTOM 100 kOhm), C29 (C_VMID 10 uF), R24 and R25 (R_VMID_IN_L/R 10.0 kOhm), U5 (U_VMID,
`h7-platform:OPA1688xD`, OPA1688IDR, three units: A, B and the supply), C30 (C_VMID_HF 100 nF), C31
(C_VMID_BULK 10 uF), TP5 (`Connector:TestPoint`). Ports 5V_A, 5V_A_CODEC, GND, VIN_A, VMID_L and
VMID_R (5V_A_CODEC reaches one pin, R21's pin 2). LDO_FB, LDO_NR, VMID, VMID_IN_L and VMID_IN_R are
private to the page and drawn as wire, with no label. U4's NC (pin 3) and DNC (pin 7) are
no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `ldo_vmid` is one of the
  pedal's 19 blocks: U_LDO, R_5VA, the VMID divider and U_VMID.
- [D3](../../../docs/h7-platform/decisions.md#d3): the 5V_A LDO, rated for the protected input.
- [CR-PEDAL-SYMBOL-TPS7A4901](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-tps7a4901): U4
  is the project symbol: pin 6 NR/SS `passive`, pin 7 DNC `no_connect`, pin 3 NC `free`, pin 9
  PowerPAD stacked under GND pin 4, OUT `power_out`.
- [CR-PEDAL-SYMBOL-OPA1688](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-opa1688): U5 is
  the project symbol, three units (A, B, supply), under
  [CR-PEDAL-SYMBOL-PROJECT](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-project).
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): the rule both
  project symbols are held to; clause 3 makes U4's OUT `power_out`, which is why 5V_A takes no flag
  home and is the pf page's cross-page power driver.
- [CR-PEDAL-POWER-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-power-readings): U_LDO's
  pin 3 left open, drawn as a no-connect.
- [CR-PEDAL-POWER-DATASHEET-ENDS](../../../docs/h7-platform/decisions.md#cr-pedal-power-datasheet-ends):
  C27 (C_NR) from NR/SS to GND and C28 (C_FF) from FB to OUT, from TI SBVS121E.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): TP5 on 5V_A.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): U4 (a regulator) is an
  `ic`, and U5, the OPA1688, an `opamp`.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): 5V_A_CODEC is an awaiting
  net of the board until the codec blocks are built, which is why its port reaches one pin.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VIN_A, 5V_A,
  5V_A_CODEC and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. GND's and VIN_A's single flags are on the root ("The tables after Task 7c"); 5V_A has
  none, its driver being U4's `power_out` OUT on this page.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  this page holds the 5V_A entry's driver, U4 pin 1 OUT; no stand-in is placed under its own
  one-block root, and nothing on it needs one.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- The block also cites `power.md` lines 33, 474, 488 and 489, `analog.md` lines 148 and 149, the
  schematic checklist's PWR-08 to PWR-11 and PWR-15 (lines 129 to 132 and 138) and `parts.md` lines
  57, 83, 84, 86 and 105; those are design notes, not rulings. Its note that a schematic needs no
  MPN for the feedback, divider, follower-input, 0 Ohm and 100 nF parts cites `docs/known-gaps.md`
  G245, the owner's decision on where a fully specified BOM binds.
- Drawing choices, not transcriptions: one band, read west to east as two sections, the LDO and
  then VMID, both between the VIN_A and GND rows; U5's three units at rotation 0, unmirrored (akcli
  0.22.0 cannot rotate one unit, `draughting/pages/page.py`, `place_ops`); 5V_A_CODEC takes the
  default stroke 5V_A has (`ldo_vmid/layout.py`, `UNDRAWN_STROKES`, says why); VMID_L and VMID_R
  keep the stroke the draft draws them in, the VMID family's purple; fields and parts moved after
  the renders listed in `ldo_vmid/layout.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 7c leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`. The placed-pin count counts each unit's own pins
(`draughting/measure/kicad_sheet.py`, `instance_pins`, Task 7c); U4's GND and PowerPAD are two pins
at one point, so the junction audit reports 45 pin points.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 17 (the model declares none) | 0; 17 |
| exported components, nets, net members | 17, 13, 46 | 17, 13, 46 |
| exported nets carrying a model net name | 10 of 13 | 6 of 13 (/5V_A, /5V_A_CODEC, /GND, /VIN_A, /VMID_L, /VMID_R, the ports; the other 7 private and unlabelled) |
| ports whose label is on the wrong net | 1 of 6 | 0 of 6 |
| ERC, the sheet alone | 3 errors (`pin_not_connected` 1, R21 pin 2; `power_pin_not_driven` 2, U4's IN and GND), 4 warnings (`lib_symbol_issues` 4) | 8 errors (`pin_not_connected` 6: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, U4's IN and GND), 5 warnings (`isolated_pin_label` 1, 5V_A_CODEC; `lib_symbol_issues` 4) |
| ERC under a one-block root, `/ldo_vmid/` | 3 errors (`pin_not_connected` 1, `power_pin_not_driven` 2), 0 warnings | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 10 errors (`hier_label_mismatch` 6, `label_dangling` 4), 6 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 4) | 3 errors (`label_dangling` 3, the 5V_A, VMID_L and VMID_R stubs' labels, alone with one block; `erc_sheets.py` admits them), 4 warnings (`lib_symbol_issues` 4), re-measured in Task 9c's fix round 1; it read 6 (`isolated_pin_label` 2, 5V_A_CODEC's stub label and sheet label) until Task 9c homed 5V_A_CODEC's flag on the root (the codec_sup section), which puts a flag on that stub. The draft column is as Task 7c measured it |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 6, 0 | 1, 0 |
| orphan junctions, of total | 0 of 15 | 0 of 26 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 15 on 10 nets (5 global) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | overshoots east 10.753 mm | fits |
| wire groups with more than one stroke | 0 of 15 | 0 of 11 |
| symbols (part instances, power symbols, PWR_FLAGs) | 19 (19, 0, 0) | 19 (19, 0, 0) |
| placed pins | 46 | 46 |
| wires, total length | 85, 894.08 mm | 78, 1004.57 mm |
| wire corners | 26 | 15 |
| junctions | 15 | 26 |

**`lib_symbol_issues` 4**: *"The current configuration does not include the symbol library
'h7-platform'"*, on U4 and on each of U5's three units. This is the pf page's U1 warning: a block page
has no `.kicad_pro`, and kicad-cli 10.0.5 does not take the committed `sym-lib-table` without one.
Both symbols are embedded in the sheet. No `lib_symbol_mismatch`: TP5's `Connector:TestPoint` and the
`Device` symbols match their installed copies.

### Why the page has one crossing, as the layout records it

An observation of U4's pin order, not a judgement of the page: on the symbol's east side NR/SS (pin
6) sits between OUT (pin 1) above and FB (pin 2) below, and OUT and FB are joined outside the body
through R19 and C28 (5V_A to LDO_FB). That loop encloses NR/SS, while C27 takes NR/SS to GND, outside
it. Here C27's drop to the GND row crosses the FB row once.

### What the page shows, as observations

- A VIN_A row along the top and a GND row along the bottom, each from its hierarchical label at the
  west edge, pointing west. C25 stands across the two rows at the west.
- A riser from the VIN_A row goes down into U4's IN and on into its EN; U4's NC on the west side and
  DNC on top carry no-connects; its GND and PowerPAD drop to the GND row.
- U4's OUT runs east on the 5V_A row to 5V_A's label, pointing east, in the middle of the page; on
  it, west to east, R19 and C28 hang to the FB row, C26 hangs to GND, TP5 stands on the row, and R21
  hangs down to the 5V_A_CODEC row, whose label is under 5V_A's.
- U4's FB drops and runs east on the FB row under R19 and C28; R20 hangs from it to GND. C27 hangs
  from NR/SS to GND, crossing the FB row.
- East of the LDO section, between the same rows: C30, C31 and U5's supply unit (V+ up, V- down);
  then R22 from the VIN_A row down to the VMID row, with R23 and C29 hanging from it to GND.
- The VMID row runs east through R24 into U5A's +IN; from a node it drops to a lower row through R25
  into U5B's +IN. Each unit's output runs east to its label (VMID_L, VMID_R) at the east edge,
  pointing east, and from a node loops down, west under the body, and up into its -IN.
- On U4, the project symbol's pin names NC and NR/SS run into each other across the body, and DNC
  and GND, drawn vertical, run into OUT's; that is the symbol's own drawing
  (CR-PEDAL-SYMBOL-TPS7A4901: pins 3, 6 and 7 moved to the body edge and shown), not a placement.
  U5A's and U5B's pin names "OUT A" and "OUT B" meet the triangle's edge.
- LDO_FB and LDO_NR carry copperhead's blue stroke; VMID_IN_L, VMID_IN_R, VMID_L and VMID_R its
  purple; VIN_A, 5V_A, 5V_A_CODEC, VMID and GND its default.
- The hanging parts carry Reference over Value east of their bodies; R24's and R25's above their
  rows; U4's above its body, under the VIN_A row; U5A's and U5B's above their bodies, U5C's east of
  its pins; TP5's east of its circle.

## usb: the USB-C socket and its isolation switch (Task 9a)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `efe062770501a63ad44dfe33558fcb54f7bd6676b5bab682b25278317aecb653`.
Render: `usb.svg` beside it.

The block: `circuits/h7-platform/pedal/usb.ts`, 13 parts, the carrier's USB path with the carrier's
ids: J7 (J_USB, `Connector:USB_C_Receptacle_USB2.0_16P`, no MPN), R80 and R81 (R_CC1, R_CC2 5.1
kOhm), R82 (R_SHLD 1 MOhm), C57 (C_SHLD 4.7 nF), U14 (U_ESD, `Power_Protection:USBLC6-2SC6`), C58
(C_VBUS 100 nF), U15 (U_USBSW, `h7-platform:TS3USB221RSER`), R83 (R_USBEN 10.0 kOhm), C59 (C_USBSW
100 nF), R84 and R85 (R_VBUS_TOP 12.0 kOhm, R_VBUS_BOT 20.0 kOhm), C60 (C_VBUS_SENSE 100 nF). Ports
3V3_D, GND, USB_DM, USB_DP, USB_EN_N and USB_VBUS_SENSE (USB_DM and USB_DP each reach one pin, U15's
7 and 8). VBUS, USB_C_DP, USB_C_DM, USB_CC1, USB_CC2 and USB_SHIELD are private to the page and drawn
as wire, with no label. J7's SBU1 and SBU2 (A8, B8) and U15's second port (pins 3 and 4) are
no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `usb` is one of the
  pedal's 19 blocks: the receptacle, its ESD part, the isolation switch and the VBUS sense divider.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings): the
  pedal's USB path takes the carrier's ids and the carrier's names for its private nets.
- [CR-PEDAL-USB-C](../../../docs/h7-platform/decisions.md#cr-pedal-usb-c): J7 is the stock 16-pin
  receptacle with no part number, as on the carrier and the module; no MPN because a schematic needs
  none, citing `docs/known-gaps.md` G245, the owner's decision on where a fully specified BOM binds.
- [D10](../../../docs/h7-platform/decisions.md#d10): the USB ESD part and the VBUS sense.
- [R-14](../../../docs/h7-platform/decisions.md#r-14): U15 between the socket's USB pins and the ESD
  part and receptacle, VCC from 3V3_D, its active-low OE held off by R83 to 3V3_D.
- [CR-PEDAL-USBSW](../../../docs/h7-platform/decisions.md#cr-pedal-usbsw), carrying
  [CR-CARRIER-USBSW-SELECT](../../../docs/h7-platform/decisions.md#cr-carrier-usbsw-select): U15's S
  (pin 9) on GND, its second port (pins 3 and 4) not connected, C59 100 nF at VCC.
- [CR-CARRIER-USBSW-SYMBOL](../../../docs/h7-platform/decisions.md#cr-carrier-usbsw-symbol): U15 is
  the project symbol `h7-platform:TS3USB221RSER`, pin for pin from TI SCDS220M Table 4-1.
- [CR-PEDAL-VBUS-IDS](../../../docs/h7-platform/decisions.md#cr-pedal-vbus-ids): C58 is `c_vbus`, at
  U14's pin 5; C60 is `c_vbus_sense`, on USB_VBUS_SENSE.
- [CR-PEDAL-VBUS-SENSE-CAP](../../../docs/h7-platform/decisions.md#cr-pedal-vbus-sense-cap) and
  [R-57](../../../docs/h7-platform/decisions.md#r-57): C60 is fitted, the carrier's 100 nF; the
  divider is the carrier's 12.0 kOhm over 20.0 kOhm. The open row VBUS-HOTPLUG stays open.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): the rule U14's and
  U15's symbols are held to; clause 1 makes U14's terminals, its GND included, `passive`, and clause 2
  makes U15's VCC and GND `power_in`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. GND's and 3V3_D's single flags are on the root ("The tables after Task 9a"), so the
  one-block root puts a stub flag on each. With neither, `/usb/` reports `power_pin_not_driven` on
  *"Symbol U15 Pin 10 [VCC, Power input, Line]"* (measured with 3V3_D not yet in the table).
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- Checklist items, not rulings: the schematic checklist's USB-01 (line 207, CC1 and CC2 5.1 kOhm to
  GND, the D pairs joined), USB-02 (line 208, VBUS on no rail), USB-04 (line 213, the USBLC6-2's
  pins and C_VBUS) and USB-05 (line 214, the shell through R_SHLD and C_SHLD). The block also cites
  `architecture.md` lines 257 and 258, `parts.md` lines 145, 146 and 177, and TI SCDS220M p. 15
  section 8.3; those are design notes.
- Drawing choices, not transcriptions: U15 mirrored left to right, so that its connector side faces
  U14 and its MCU side faces east; U14 at rotation 0 with each I/O pair joined by a loop round its
  body (below); USB_VBUS_SENSE's label mid-page, so that C59 can reach the top GND row east of it;
  USB_DM and USB_DP, which the draft drew no wire for, take the USB family's blue
  (`usb/layout.py`, `UNDRAWN_STROKES`, says why); fields moved after the renders listed in
  `usb/layout.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9a leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 13 (the model declares none) | 0; 13 |
| exported components, nets, net members | 13, 16, 53 | 13, 16, 53 |
| exported nets carrying a model net name | 10 of 16 | 6 of 16 (/3V3_D, /GND, /USB_DM, /USB_DP, /USB_EN_N, /USB_VBUS_SENSE, the ports; 6 private and unlabelled, and 4 single no-connect pins) |
| ports whose label is on the wrong net | 4 of 6 | 0 of 6 |
| ERC, the sheet alone | 4 errors (`pin_not_connected` 2, U15 pins 8 and 7; `power_pin_not_driven` 2, U15's VCC and GND), 2 warnings (`lib_symbol_mismatch` 1, U14; `lib_symbol_issues` 1, U15) | 8 errors (`pin_not_connected` 6: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, U15's VCC and GND), 4 warnings (`isolated_pin_label` 2, USB_DP and USB_DM; `lib_symbol_mismatch` 1; `lib_symbol_issues` 1) |
| ERC under a one-block root, `/usb/` | 4 errors (`pin_not_connected` 2, `power_pin_not_driven` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 10 errors (`hier_label_mismatch` 6, `label_dangling` 4), 4 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 1, `lib_symbol_issues` 1) | 2 errors (`label_dangling` 2, the USB_EN_N and USB_VBUS_SENSE stubs' labels, alone with one block; `erc_sheets.py` admits them), 6 warnings (`isolated_pin_label` 4, USB_DP's and USB_DM's labels and stubs; `lib_symbol_mismatch` 1; `lib_symbol_issues` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 23, 4 | 7, 0 |
| orphan junctions, of total | 0 of 8 | 0 of 24 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 3; 4 | 0; 0 |
| labels | 21 on 10 nets (17 global) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 21 | 0 of 12 |
| symbols (parts, power symbols, PWR_FLAGs) | 13 (13, 0, 0) | 13 (13, 0, 0) |
| placed pins | 53 | 53 |
| wires, total length | 74, 825.50 mm | 71, 1120.14 mm (read 1115.06 mm here until the Task 9a fix round: a figure taken before a last wire change; `verify.sh` on the committed sheet reports 1120.14) |
| wire corners | 24 | 19 |
| junctions | 8 | 24 |

**`lib_symbol_mismatch` 1**, on U14: *"Symbol 'USBLC6-2SC6' doesn't match copy in library
'Power_Protection'"*. The installed symbol is an `extends`, and the embedded copy is the parent
flattened under the child's name, as the carrier page's U2 (the same part,
`../h7-carrier/RECORD.md`, "U2's embedded symbol") and this board's PMEG4030ER, SN74LVC2G14,
AO3400A, TPS62933F and 2N7002 are. Measured (the embedded fields and pins against the installed
child and parent):

| | embedded (`usb.kicad_sch` line 1300) | installed `USBLC6-2SC6` (`Power_Protection.kicad_sym` line 36479, `(extends "USBLC6-2P6")`) |
| --- | --- | --- |
| pins and graphics | identical to the installed parent `USBLC6-2P6`'s (line 36016): 1 I/O1, 2 GND, 3 I/O2, 4 I/O2, 5 VBUS, 6 I/O1, all `passive`, same positions and lengths | the parent's |
| Value | `USBLC6-2P6` (the parent's) | `USBLC6-2SC6` |
| Datasheet; `ki_keywords` | the same as the child's | `https://www.st.com/resource/en/datasheet/usblc6-2.pdf`; "usb ethernet video" |
| Footprint; `ki_fp_filters` | `Package_TO_SOT_SMD:SOT-666`; `SOT?666*` (the parent's) | `Package_TO_SOT_SMD:SOT-23-6`; `SOT?23*` |
| Description | "Very low capacitance ESD protection diode, 2 data-line, SOT-666" (the parent's) | "... SOT-23-6" |

U14's own Value on the page is `USBLC6-2SC6`, and its own Footprint field is empty. **Not an
electrical fault**: pins, numbers, types and positions are the installed part's, and the model
comparison is 0, 0, 0, 0. **Trap for a later output**, the carrier's: a footprint read from U14's
library fields is SOT-666 where the part is SOT-23-6.

**`lib_symbol_issues` 1**, on U15: *"The current configuration does not include the symbol library
'h7-platform'"*. This is the pf page's U1 warning: a block page has no `.kicad_pro`, and kicad-cli
10.0.5 does not take the committed `sym-lib-table` without one. The symbol is embedded in the sheet.
J7's `Connector:USB_C_Receptacle_USB2.0_16P` is not an `extends` and reports nothing.

**`isolated_pin_label` 2**, on the sheet alone: USB_DP's and USB_DM's hierarchical labels each sit on a
net with one pin (U15's 8 and 7), as the board's model has them; their other pins are on the
interface page. Under the one-block root the same two nets add the stub labels' two.

### Why the page has seven crossings, as the layout records it

An observation of where the pins are, not a judgement of the page (`usb/layout.py` gives each):

- J7 has D- (A7, B7) above D+ (A6, B6), and U14 has I/O1 (D+, pin 1) above I/O2 (D-, pin 3), so the
  two data nets cross once between them.
- U14's two I/O1 pins (1 and 6) and two I/O2 pins (3 and 4) are separate pins on the symbol, each pair
  on opposite sides of the body, and its VBUS pin is on top and its GND underneath. D+ is joined by a
  loop over the body and D- by a loop under it, so VBUS's drop to pin 5 crosses the D+ loop and the
  GND drop from pin 2 crosses the D- loop. (The first version drew each data row through U14, pin 1
  in and pin 6 out; its export split each data net in two at U14, and `verify.sh` refused it on
  netMembership.)
- R80, R81 and C58 sit between the VBUS row and the data rows, so their GND rises across the VBUS row
  once to the top GND row.
- U15's S (pin 9) sits between its D- (pin 7) and OE (pin 6) on one side of the body, so its drop to
  GND crosses OE's row once.
- R83 joins 3V3_D, which U15's VCC takes above the data rows, to OE, below them, so the 3V3_D
  vertical crosses USB_DP and USB_DM.

### What the page shows, as observations

- J7 at the west, its pins facing east: VBUS at the top, then CC1, CC2, the two D- and the two D+
  pins, SBU1 and SBU2 with no-connects; GND (A1, with A12, B1 and B12 at the same point) and the
  shell (SH) at the bottom.
- A GND row along the top of the page from GND's hierarchical label at the west edge, pointing west;
  it runs down J7's west side to a GND row along the bottom.
- VBUS rises from J7 to a row that runs east past C58 to U14's column and drops into U14's VBUS
  (pin 5). R84 stands on that corner; from its top the sense row runs east past R85 and C60, which
  stand between it and the top GND row, to USB_VBUS_SENSE's label, pointing east, in the middle of
  the page.
- CC1 and CC2 run east to R80 and R81, lying in their rows; their GND ends and C58's join a bar that
  rises to the top GND row.
- The data rows run east from J7, D+ stepping up across D-, into U14's west pins; from tees west of
  U14 each loops round the body (D+ over it, D- under it) and rejoins its row east of U14, which runs
  on into U15's 1D+ and 1D-.
- U15, mirrored left to right: its D+ and D- run east to USB_DP's and USB_DM's labels at the east,
  pointing east; its VCC rises to the 3V3_D row, which runs east to 3V3_D's label; its GND and S
  drop to the bottom GND row; its OE runs east and down to the USB_EN_N row, which runs east past R83
  to USB_EN_N's label. C59 stands on the 3V3_D vertical between the 3V3_D row and the top GND row;
  R83 hangs from it, crossing the two MCU-side data rows, to the USB_EN_N row.
- The shell drops to a short row under J7, with R82 and C57 hanging from it to the bottom GND row.
- The USB family's nets (USB_CC1, USB_CC2, USB_C_DP, USB_C_DM, USB_SHIELD, USB_VBUS_SENSE, USB_EN_N,
  USB_DP, USB_DM) carry copperhead's blue stroke; VBUS, 3V3_D and GND its default.
- The hanging parts carry Reference over Value east of their bodies; R82's, R84's and R85's west;
  R80's above its row and R81's below it; J7's above its body; U14's under the D- loop, east of its
  GND drop; U15's above its body, east of its VCC rise.

## midi_i2c: MIDI OUT, the MIDI UART header and the I2C pull-ups (Task 9a)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `fb12cf76ea6924f8cc1a983c9eaed4f85a004e15e399836941852d0e818afc4f`.
Render: `midi_i2c.svg` beside it.

The block: `circuits/h7-platform/pedal/midi-i2c.ts`, 14 parts: U16 (U_MIDIDRV,
`h7-platform:SN74LVC1G07DBV`, SN74LVC1G07DBVR), C61 (C_MIDIDRV 100 nF), R86 (R_TXPU 18.0 kOhm), Q9
(Q_MIDI, `Transistor_FET:AO3401A`), R87 (R_MGP 160 Ohm), R88-R91 (RA, four 130 Ohm), R92 (RC 10 Ohm),
J8 (J_MIDI, `Connector_Generic:Conn_01x04`, the MIDI UART header, not fitted), R93 and R94
(R_SCL_PU, R_SDA_PU_EXP 2.40 kOhm), TP6 (the 3V3_D pad, `Connector:TestPoint`). Ports 3V3_D, 3V3_P,
EXP_I2C_SCL, EXP_I2C_SDA, GND, MIDI_PIN4, MIDI_PIN5, MIDI_UART_RX and MIDI_UART_TX (EXP_I2C_SCL,
EXP_I2C_SDA, MIDI_PIN5 and MIDI_UART_RX each reach one pin: R93's 1, R94's 1, R92's 1 and J8's 3).
MIDI_GATE and MIDI_DRAIN are private to the page and drawn as wire, with no label. U16's NC (pin 1)
is a no-connect.

**What the page does not draw, and its note.** The page carries a text note under the GND row (in
`midi_i2c/layout.py`, `NOTES`), which reads:

> Not drawn on this page:
> - The MIDI OUT loop's connector and the CA-033 ferrites at it: no source names the connector or
>   its pinout (CR-PEDAL-MIDI; open row MIDI-OUT-CONNECTOR). MIDI_PIN4 and MIDI_PIN5 run on to it as
>   ports of the board.
> - The MIDI IN receiver and its network, until open row MIDI-IN-RECEIVER-STOCK closes
>   (CR-PEDAL-MIDI). MIDI_UART_RX reaches only J8 pin 3 here.
> - An I2C expansion connector: no source names one (CR-PEDAL-I2C-EXPANSION; open row
>   I2C-EXPANSION-CONNECTOR).
>
> J8, the MIDI UART header (USB-08, OWN-04), is drawn and is NOT FITTED (CR-PEDAL-POPULATION, class 2).

Each part left undrawn, and the open row that holds it:

| not drawn | open row | ruling |
| --- | --- | --- |
| the connector carrying MIDI pins 4 and 5 (MIDI_PIN4, MIDI_PIN5) | MIDI-OUT-CONNECTOR (`docs/h7-platform/open-items.md` line 128) | CR-PEDAL-MIDI; the nets are ports by CR-PEDAL-DIGITAL-READINGS (`UNDRAWN_CONNECTOR_NETS`) |
| the CA-033 ferrites that "go at the jack" | MIDI-OUT-CONNECTOR, and PEDAL-POWER-PARTS-TO-MODEL (line 62) | CR-PEDAL-MIDI |
| the MIDI IN receiver and its network | MIDI-IN-RECEIVER-STOCK (line 73) | CR-PEDAL-MIDI |
| an I2C expansion connector | I2C-EXPANSION-CONNECTOR (line 129) | CR-PEDAL-I2C-EXPANSION |

Nothing stands in for any of them on the page: MIDI_PIN4 and MIDI_PIN5 end in their hierarchical
labels at the east edge, pointing east.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `midi_i2c` is one of the
  pedal's 19 blocks: the MIDI OUT driver and switch, the MIDI header and the I2C pull-ups.
- [CR-PEDAL-MIDI](../../../docs/h7-platform/decisions.md#cr-pedal-midi): the not-fitted 4-pin header
  and R-26's MIDI OUT driver and switch are drawn, up to the nets the sources name, MIDI_PIN4 and
  MIDI_PIN5; the connector carrying the loop and the MIDI IN receiver are not.
- [OWN-04](../../../docs/h7-platform/decisions.md#own-04): the header stays unpopulated; its pinout,
  USB-08's 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND.
- [CR-PEDAL-POPULATION](../../../docs/h7-platform/decisions.md#cr-pedal-population), class 2: a
  connector whose fitting adds no on-board path is modelled and drawn, with a note that it is not
  fitted; J8 is that connector.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings): the
  3V3_D test pad is on this page; MIDI_PIN4 and MIDI_PIN5 are ports of the block and of the board
  (`UNDRAWN_CONNECTOR_NETS`); C61's other end is on GND.
- [R-26](../../../docs/h7-platform/decisions.md#r-26): the high-side P-MOSFET switch, Q9 with R87,
  RA and RC. [R-23](../../../docs/h7-platform/decisions.md#r-23): U16 on 3V3_D pulls Q9's gate low.
  [R-28](../../../docs/h7-platform/decisions.md#r-28): R86 18.0 kOhm from MIDI_UART_TX to 3V3_D.
  [R-53](../../../docs/h7-platform/decisions.md#r-53), cited with R-26 through `power.md` line 460.
- [R-21](../../../docs/h7-platform/decisions.md#r-21): the I2C expansion pull-ups, 2.40 kOhm, on the
  pedal only. [CR-PEDAL-I2C-EXPANSION](../../../docs/h7-platform/decisions.md#cr-pedal-i2c-expansion):
  no I2C expansion connector is drawn.
- [CR-PEDAL-LOGIC-DECOUPLING](../../../docs/h7-platform/decisions.md#cr-pedal-logic-decoupling): C61,
  100 nF at U16's VCC.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): TP6 on 3V3_D.
- [CR-PEDAL-SYMBOL-SN74LVC1G07](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-sn74lvc1g07):
  U16 is the project symbol, A and Y named, Y `open_collector`.
- [CR-PEDAL-SYMBOL-AO3400A](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a): Q9 is
  the stock AO3401A, G 1, S 2, D 3.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): clause 1 makes Q9's
  gate `input`; clause 2 makes U16's VCC and GND `power_in`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D, 3V3_P
  and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; GND's and 3V3_D's single flags are on the root, so the one-block root puts a stub flag
  on each. 3V3_P needs none here: Q9's source and R87 are passive.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 9 ports on the wrong net.
- Checklist items, not rulings: the schematic checklist's USB-08 (line 217, the header). The block
  also cites `power.md` lines 413 and 460, `parts.md` lines 138 to 144, `architecture.md` line 342 and
  TI SCES296AG p. 11 section 8.3; those are design notes.
- Drawing choices, not transcriptions: Q9 mirrored top to bottom, source up; J8 turned 270 and
  mirrored left to right, pins up, 3V3_D, TX, RX, GND west to east; the lower 3V3_D row joined to the
  top one by a vertical west of MIDI_UART_TX's label; 3V3_P's and MIDI_UART_RX's labels mid-page;
  MIDI_PIN5 and MIDI_UART_RX, which the draft drew no wire for, take the MIDI family's purple, and
  EXP_I2C_SCL and EXP_I2C_SDA the palette's third colour, teal (`midi_i2c/layout.py`,
  `UNDRAWN_STROKES`, says why); fields and the note moved after the renders listed in
  `midi_i2c/layout.py`.

### MIDI_PIN4 and MIDI_PIN5 under ERC

The brief expected dangling-label or single-pin findings on the two nets that lead to the undrawn
connector, and an error, if any, to be judged as a fault or as a consequence of the omission.
Measured on this page:

- **The sheet alone**: MIDI_PIN4's hierarchical label reports `pin_not_connected` (*"Hierarchical
  Label 'MIDI_PIN4'"*, as all nine labels do with no parent sheet), and MIDI_PIN5's
  `isolated_pin_label`, a warning: its net has one pin, R92's 1.
- **Under the one-block root**: `/midi_i2c/` reports **0 errors and 0 warnings**. On `/`, MIDI_PIN4's
  stub label is one of the three `label_dangling` errors (with 3V3_P's and MIDI_UART_TX's), each a
  stub whose net reaches no other sheet under a one-block root, which `erc_sheets.py` admits for
  every page; MIDI_PIN5's stub label is an `isolated_pin_label` warning.

**So no ERC error on the block's sheet comes from the omission, and no allowance is proposed or
added** (`erc-allowances.ts` is still empty). What this does not settle: on the pedal's assembled
root (Task 11), MIDI_PIN4's and MIDI_PIN5's sheet pins reach no other sheet there either, so the root
can be expected to report a dangling label on each, which no stub admission covers. That is the
root's check to make, and the allowance ruling in the shape of CR-MODULE-VCAP-ERC, if one is wanted,
belongs with it.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9a leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 14 (the model declares none) | 0; 14 |
| exported components, nets, net members | 14, 12, 33 | 14, 12, 33 |
| exported nets carrying a model net name | 7 of 12 | 9 of 12 (the nine ports; MIDI_GATE and MIDI_DRAIN private and unlabelled, and U16's NC) |
| ports whose label is on the wrong net | 7 of 9 | 0 of 9 |
| ERC, the sheet alone | 6 errors (`pin_not_connected` 4, R92 pin 1, R93 pin 1, R94 pin 1, J8 pin 3; `power_pin_not_driven` 2, U16's VCC and GND), 2 warnings (`lib_symbol_issues` 1, U16; `lib_symbol_mismatch` 1, Q9) | 10 errors (`pin_not_connected` 8: eight of the nine hierarchical labels have no parent sheet, MIDI_PIN5's reports `isolated_pin_label` instead; `power_pin_not_driven` 2, U16's VCC and GND), 6 warnings (`isolated_pin_label` 4, EXP_I2C_SCL, EXP_I2C_SDA, MIDI_UART_RX and MIDI_PIN5; `lib_symbol_issues` 1; `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/midi_i2c/` | 6 errors (`pin_not_connected` 4, `power_pin_not_driven` 2), 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 16 errors (`hier_label_mismatch` 9, `label_dangling` 7), 4 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 1, `lib_symbol_mismatch` 1) | 3 errors (`label_dangling` 3, the 3V3_P, MIDI_PIN4 and MIDI_UART_TX stubs' labels, alone with one block; `erc_sheets.py` admits them), 10 warnings (`isolated_pin_label` 8, the four one-pin ports' labels and stubs; `lib_symbol_issues` 1; `lib_symbol_mismatch` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 1, 0 |
| orphan junctions, of total | 0 of 6 | 0 of 19 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 14 on 7 nets (10 global) | 9 on 9 nets, all hierarchical |
| text notes | 0 | 1 |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 14 | 0 of 11 |
| symbols (parts, power symbols, PWR_FLAGs) | 14 (14, 0, 0) | 14 (14, 0, 0) |
| placed pins | 33 | 33 |
| wires, total length | 48, 339.09 mm | 45, 706.12 mm |
| wire corners | 12 | 7 |
| junctions | 6 | 19 |

**`lib_symbol_mismatch` 1**, on Q9: *"Symbol 'AO3401A' doesn't match copy in library
'Transistor_FET'"*. The installed symbol is an `extends`, and the embedded copy is the parent
flattened, as the modsw page's AO3400A is. Measured:

| | embedded (`midi_i2c.kicad_sch` line 861) | installed `AO3401A` (`Transistor_FET.kicad_sym` line 1674, `(extends "TP0610T")`) |
| --- | --- | --- |
| pins and graphics | identical to the installed parent `TP0610T`'s (line 83318): 1 G input, 2 S passive, 3 D passive | the parent's |
| Value | `TP0610T` (the parent's) | `AO3401A` |
| Datasheet | `http://www.vishay.com/docs/70209/70209.pdf` (the parent's) | `http://www.aosmd.com/pdfs/datasheet/AO3401A.pdf` |
| Description | "-0.18A Id, -60V Vds, P-Channel MOSFET, SOT-23" (the parent's) | "-4.0A Id, -30V Vds, P-Channel MOSFET, SOT-23" |
| Footprint; `ki_fp_filters`; `ki_keywords` | the same as the child's | `Package_TO_SOT_SMD:SOT-23`; `SOT?23*`; "P-Channel MOSFET" |

Q9's own Value on the page is `AO3401A`. **Not an electrical fault**: pins, numbers, types and
positions are the installed part's, and the model comparison is 0, 0, 0, 0. **Trap for a later
output**: an export reading Q9's library fields gets the 0.18 A, 60 V Vishay TP0610T and its data
sheet, where the fitted part is the 4.0 A, 30 V AO3401A.

**`lib_symbol_issues` 1**, on U16: *"The current configuration does not include the symbol library
'h7-platform'"*, the pf page's U1 warning: a block page has no `.kicad_pro`. The symbol is embedded.

**`isolated_pin_label` 4**, on the sheet alone: the four one-pin ports' hierarchical labels; their
nets' other pins are on the interface page (EXP_I2C_SCL, EXP_I2C_SDA, MIDI_UART_RX) or on no page
(MIDI_PIN5, above).

### Why the page has one crossing, as the layout records it

An observation of where the pins are, not a judgement of the page: the MIDI OUT chain runs from
MIDI_UART_TX's label at the west to MIDI_PIN4's at the east, with U16's VCC above it and its GND below
it, so C61, 3V3_D to GND at U16, crosses it once: its GND drop crosses the gate row east of U16.

### What the page shows, as observations

- MIDI_UART_TX's label at the west, pointing west; the TX row runs east past R86 (standing up to the
  top 3V3_D row) and J8's TX riser into U16's A (pin 2), U16 pointing east.
- U16's Y (pin 4) runs east on the gate row past C61's GND drop and R87 (standing up to the 3V3_P
  row) into Q9's gate. Q9, mirrored top to bottom: its source rises to the 3V3_P row, whose label is
  at its west end, pointing west, mid-page; its drain drops to the drain row, from which R88-R91 hang
  side by side to the MIDI_PIN4 row, which runs east to MIDI_PIN4's label at the east edge, pointing
  east.
- MIDI_PIN5's label under it, pointing east, goes west to R92, which hangs to the GND row.
- 3V3_D's label at the west edge, pointing west, starts the lower 3V3_D row: R93 and R94 hang from it
  to the SCL and SDA rows, whose labels are at the west, pointing west; TP6 hangs under it; it ends
  in J8's 3V3_D pin. A vertical from it, west of MIDI_UART_TX's label, rises to the top 3V3_D row,
  which takes R86's top, U16's VCC and C61's top.
- J8, pins up: 3V3_D, TX, RX, GND west to east. RX rises and runs east to MIDI_UART_RX's label,
  pointing east, between the TX row and U16's foot; GND rises one step and runs east to U16's GND
  drop, which drops to the GND row along the bottom, GND's label at its west end, pointing west.
- U16's NC (pin 1) carries a no-connect.
- The note, under the group rectangle, left-justified, in nine lines.
- MIDI_UART_TX, MIDI_UART_RX, MIDI_GATE, MIDI_DRAIN, MIDI_PIN4 and MIDI_PIN5 carry copperhead's
  purple; 3V3_D and 3V3_P its blue; EXP_I2C_SCL and EXP_I2C_SDA teal; GND its default.
- The hanging parts carry Reference over Value east of their bodies; R93's and R92's west; U16's
  west of its VCC pin, above its A pin; Q9's east of its body; J8's under its east end; TP6's under
  it.

## fsw_led: the footswitch inputs and the LEDs (Task 9a)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"schematics approved"* (`docs/schematic/verdicts.md`). sha256 `de6b3e173b854daef218356aa2ade4c1b66cdd5277eed411b969780865fb2021`.
Render: `fsw_led.svg` beside it.

The block: `circuits/h7-platform/pedal/fsw-led.ts`, 18 parts. Per footswitch: J5 and J6 (J_FSW1/2,
`Connector_Generic:Conn_01x02`, the header to the hung footswitch board), R70 and R72 (R_FSW_PU1/2
10.0 kOhm), C55 and C56 (C_FSW1/2 100 nF), R71 and R73 (R_FSW1/2 1.20 kOhm). Per LED: D10 and D11
(LED1/2, WP7113ID, `Device:LED`), R74 and R77 (R_LED1/2 100 Ohm), Q7 and Q8 (Q_LED1/2,
`Transistor_FET:AO3400A`), R75 and R78 (R_LED1/2_G 100 Ohm), R76 and R79 (R_LED1/2_PD 10.0 kOhm).
Ports 3V3_D, 3V3_P, FSW1, FSW2, GND, LED1 and LED2 (FSW1, FSW2, LED1 and LED2 each reach one pin:
R71's 2, R73's 2, R75's 1 and R78's 1). FSW1_SW, FSW2_SW and LEDn_A, LEDn_K, LEDn_G are private to the
page and drawn as wire, with no label. No no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `fsw_led` is one of the
  pedal's 19 blocks: the two footswitch inputs and the two LED drivers.
- [CR-PEDAL-FOOTSWITCH](../../../docs/h7-platform/decisions.md#cr-pedal-footswitch): each footswitch
  input is a 2-pad connector, pin 1 the switch node FSWn_SW, pin 2 GND; the switch is on the hung
  board.
- [R-22](../../../docs/h7-platform/decisions.md#r-22): the footswitch series resistor and debounce,
  the 10.0 kOhm pull-up, 100 nF and 1.20 kOhm.
- [CR-PEDAL-LED-MOSFET](../../../docs/h7-platform/decisions.md#cr-pedal-led-mosfet): the LED switches
  are AO3400A, gate through 100 Ohm, 10.0 kOhm gate pull-down.
- [R-13](../../../docs/h7-platform/decisions.md#r-13): the gate pull-down. [R-27](../../../docs/h7-platform/decisions.md#r-27):
  the LED resistors, 100 Ohm on 3V3_P.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings): each
  LED gate's pull-down sits on the gate, after the 100 Ohm series resistor.
- [CR-PEDAL-SYMBOL-AO3400A](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a): Q7 and Q8
  are the stock AO3400A, G 1, S 2, D 3.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the LEDs are `diode`
  (cathode 1, anode 2), the MOSFETs `ic`.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): clause 1 makes Q7's
  and Q8's gates `input`, and the LEDs' terminals `passive`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D, 3V3_P
  and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. No pin here is a power input, so nothing on the page needs one; the one-block root puts
  the root's stub flags on GND and 3V3_D, as for every page reaching them.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 7 ports on the wrong net.
- Checklist items, not rulings: the schematic checklist's CTL-04 (line 183, the footswitch node) and
  CTL-05 (line 187, the LED switch). The block also cites `power.md` lines 415 and 458,
  `parts.md` lines 135 to 137, `mechanical-and-controls.md` line 398 and `architecture.md` line 266;
  those are design notes.
- Drawing choices, not transcriptions: two sections, the LEDs west and the footswitches east, each
  channel 2 the mirror image of channel 1 about one GND row across the page (Q8 mirrored top to
  bottom, D11 turned 270 and D10 90, J5 mirrored left to right and J6 turned 180); the two 3V3_P rows
  joined west of the LED labels and the two 3V3_D rows east of the FSW labels; FSW1, FSW2, LED1 and
  LED2, which the draft drew no wire for, take copperhead's default stroke, as none of them is in a
  family (`fsw_led/layout.py`, `UNDRAWN_STROKES`, says why); fields and the rectangle moved after the
  renders listed in `fsw_led/layout.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9a leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 18 (the model declares none) | 0; 18 |
| exported components, nets, net members | 18, 15, 38 | 18, 15, 38 |
| exported nets carrying a model net name | 11 of 15 | 7 of 15 (the seven ports; the other 8 private and unlabelled) |
| ports whose label is on the wrong net | 6 of 7 | 0 of 7 |
| ERC, the sheet alone | 4 errors (`pin_not_connected` 4, R71 pin 2, R73 pin 2, R75 pin 1, R78 pin 1), 2 warnings (`lib_symbol_mismatch` 2, Q7 and Q8) | 7 errors (`pin_not_connected` 7: each hierarchical label has no parent sheet), 6 warnings (`isolated_pin_label` 4, FSW1, FSW2, LED1 and LED2; `lib_symbol_mismatch` 2) |
| ERC under a one-block root, `/fsw_led/` | 4 errors (`pin_not_connected` 4), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 12 errors (`hier_label_mismatch` 7, `label_dangling` 5), 4 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 2) | 1 error (`label_dangling` 1, the 3V3_P stub's label, alone with one block; `erc_sheets.py` admits it), 10 warnings (`isolated_pin_label` 8, the four one-pin ports' labels and stubs; `lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 1, 0 | 0, 0 |
| orphan junctions, of total | 0 of 5 | 0 of 12 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 21 on 11 nets (13 global) | 7 on 7 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 21 | 0 of 15 |
| symbols (parts, power symbols, PWR_FLAGs) | 18 (18, 0, 0) | 18 (18, 0, 0) |
| placed pins | 38 | 38 |
| wires, total length | 52, 322.58 mm | 38, 546.10 mm |
| wire corners | 8 | 2 |
| junctions | 5 | 12 |

**`lib_symbol_mismatch` 2**, on Q7 and Q8: *"Symbol 'AO3400A' doesn't match copy in library
'Transistor_FET'"*, the modsw page's Q2 and Q3 warning. The installed AO3400A
(`Transistor_FET.kicad_sym` line 1590) is `(extends "Q_NMOS_GSD")`, and the embedded copy
(`fsw_led.kicad_sch` line 668) is the parent flattened: pins and graphics identical to the installed
parent `Q_NMOS_GSD`'s (line 68850: 1 G input, 2 S passive, 3 D passive); Value `Q_NMOS_GSD`, no
Footprint, no Datasheet, Description "N-MOSFET transistor, gate/source/drain", all the parent's,
where the child has `AO3400A`, `Package_TO_SOT_SMD:SOT-23`,
`http://www.aosmd.com/pdfs/datasheet/AO3400A.pdf` and "30V Vds, 5.7A Id, N-Channel MOSFET, SOT-23".
Q7's and Q8's own Values on the page are `AO3400A`. **Not an electrical fault**: the model
comparison is 0, 0, 0, 0. **Trap for a later output**: an export reading their library fields gets
the generic MOSFET with no footprint or data sheet. J5's and J6's `Conn_01x02` and the LEDs'
`Device:LED` are not `extends` and report nothing.

**`isolated_pin_label` 4**, on the sheet alone: the four one-pin ports' hierarchical labels; each
net's other pin is a module-socket pin on the interface page, which has a port for each of the four.

### Why the page has no crossing, as the layout records it

An observation, not a judgement of the page: each channel's parts hang between its own rail row and
the one GND row, channel 2 the mirror of channel 1 about it, and the rail rows of each section meet
by a vertical outside its labels (3V3_P west of the LED labels, 3V3_D east of the FSW labels), so
no row is crossed.

### What the page shows, as observations

- A GND row across the middle of the page, from GND's label at the west edge, pointing west.
- The LED section at the west. LED1's label above GND's and LED2's below, each pointing west,
  starts a gate row through R75 or R78 into Q7's or Q8's gate; R76 hangs from LED1's gate row down to
  the GND row and R79 rises from LED2's up to it. Q7's source drops to the GND row and its drain
  rises into D10's cathode; D10 points down, its anode up through R74 to a 3V3_P row along the top,
  whose label is at its west end, pointing west. Q8, D11 and R77 are the mirror image below, to a
  3V3_P row along the bottom. A vertical west of the LED labels joins the two 3V3_P rows.
- The footswitch section at the east. J5, pins facing east, starts FSW1_SW's row, which runs east
  past R70 (up to a 3V3_D row) and C55 (down to GND) and through R71 to FSW1's label, pointing east;
  J5's pin 2 drops to the GND row. J6, turned 180, its pin 2 above its pin 1, is the mirror image
  below, R72 down to a 3V3_D row along the bottom, C56 up to GND, through R73 to FSW2's label. A
  vertical east of the FSW labels joins the two 3V3_D rows, and 3V3_D's label is at the top row's
  east end, pointing east.
- LED1's private nets carry copperhead's purple, LED2's its teal, 3V3_D and 3V3_P its blue; FSW1_SW,
  FSW2_SW, the four one-pin ports and GND its default.
- The hanging parts carry Reference over Value east of their bodies; R75's and R71's above their
  rows, R78's and R73's below; J5's above it and J6's below it; Q7's, Q8's, D10's and D11's east of
  their bodies.

## controls_a: control positions 1 to 3 (Task 9b)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `0e01516c5059915c4bc1b9b22d711689c7f5311af0c78d22bbc7cda3fbdd5888`.
Render: `controls_a.svg` beside it.

The block: `circuits/h7-platform/pedal/controls.ts` (`controlsABlock`), 18 parts, six per position
(position n: pot, R_PUn, button, R_BTNn, R_POSn, C_POSn; ids from `VARIANT_POSITIONS`): POS1 RV1
(`rv_pos1`, RV16AF-41 B10K, `Device:R_Potentiometer`), R52 (`r_pu1`, 10.0 kOhm), SW1 (`sw_btn1`,
TC-6610-17-100G, `Switch:SW_Push`), R53 (`r_btn1`, 1.00 kOhm), R54 (`r_pos1`, 10.0 kOhm), C49
(`c_pos1`, 100 nF); POS2 RV2, R55, SW2, R56, R57, C50; POS3 RV3, R58, SW3, R59, R60, C51. Ports
VREF_A, 3V3_D, POS1, POS2, POS3 and GND, each reaching two or more pins, so copperhead drafted a wire
for every net and no stroke is written by hand. POSn_NODE and POSn_BTN are private to the page and
drawn as wire, with no label. No no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): the inventory's
  `controls` is split in two, `controls_a` holding positions 1 to 3 (contract pins 22 to 24).
- [CR-PEDAL-CONTROL-NODE](../../../docs/h7-platform/decisions.md#cr-pedal-control-node): each
  position is one node joining the pot's wiper, R_PUn, the button and R_POSn; the button returns
  through R_BTNn to GND; R_POSn runs to the pin, where C_POSn goes to GND; the pot runs from ccw = GND
  to cw = VREF_A; both fits are drawn at every position, and the page says each position is fitted
  with a pot or a button per effect.
- [CR-PEDAL-POPULATION](../../../docs/h7-platform/decisions.md#cr-pedal-population), the third class,
  variant positions: both fits modelled and drawn, **with a note that exactly one fit is placed per
  position**. The page note (text on the sheet, below the group rectangle), quoted:

  > Each control position is fitted per effect with a pot or a button: exactly one fit is placed per position.
  > Both fits are drawn (CR-PEDAL-POPULATION, variant positions; CR-PEDAL-CONTROL-NODE; open row CONTROL-POSITION-VARIANTS).
  > - POS1: pot fit RV1; button fit SW1 with its pull-up R52; always fitted R53, R54, C49.
  > - POS2: pot fit RV2; button fit SW2 with its pull-up R55; always fitted R56, R57, C50.
  > - POS3: pot fit RV3; button fit SW3 with its pull-up R58; always fitted R59, R60, C51.

  The pot fit is `rv_posn`, the button fit `sw_btnn` and `r_pun`, and always fitted `r_btnn`,
  `r_posn`, `c_posn`, as `VARIANT_POSITIONS` lists them. Open row CONTROL-POSITION-VARIANTS
  (`docs/h7-platform/open-items.md` line 115) holds whether the variant export carries only the fitted
  parts.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the pots are
  `potentiometer`, and which end of `Device:R_Potentiometer` is ccw is a choice: ccw = pin 1, wiper =
  pin 2, cw = pin 3. On this page pin 1 of every pot is on GND and pin 3 on VREF_A. The buttons are
  `switch`.
- [O-17](../../../docs/h7-platform/decisions.md#o-17) and [O-18](../../../docs/h7-platform/decisions.md#o-18):
  the owner's choice of the TC-6610-17-100G button, and each of the six positions a pot or a button
  per effect (`docs/h7-platform/parts.md` lines 131 and 132).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VREF_A, 3V3_D
  and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin here is `passive`, so nothing on the page needs one; the one-block root puts
  the root's stub flags on GND and 3V3_D, as for every page reaching them.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- Design notes the block cites, not rulings: `power.md` line 417, `analog.md` line 364,
  `mechanical-and-controls.md` lines 298 and 300, `architecture.md` line 230.
- Drawing choices, not transcriptions (`repair/tools/controls_page.py`, shared with controls_b, which
  is the same circuit; `controls_a/layout.py` names the parts): the three positions stand one above
  another, each read west to east from the pot to its POSn label, the second the mirror image of the
  first top to bottom; the pots of positions 1 and 3 mirrored top to bottom (pin 3 north), position
  2's not; the buttons turned 270 (positions 1 and 3) and 90 (position 2); R_POS turned 90 in the
  node row; VREF_A's bus west of the pots, 3V3_D's east of the POS labels, GND's rows joined east of
  the POS labels; fields and the rectangle moved after the renders listed in
  `repair/tools/controls_page.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9b leaves them (VREF_A's flag homed on the root, from the
expr_ref page; with Task 9a's tables `/` read one `label_dangling` more, the VREF_A stub's, and the
draft one `isolated_pin_label` fewer). The draft column was
measured on the draft copied beside the committed `sym-lib-table`, by `verify.sh`'s steps run one at
a time, since `verify.sh` stops at the draft's port labels.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 18 (the model declares none) | 0; 18 |
| exported components, nets, net members | 18, 12, 39 | 18, 12, 39 |
| exported nets carrying a model net name | 12 of 12 | 6 of 12 (the six ports; the other six private and unlabelled) |
| ports whose label is on the wrong net | 3 of 6 (3V3_D, GND and VREF_A, drawn as global labels) | 0 of 6 |
| ERC, the sheet alone | 0 errors, 0 warnings | 5 errors (`pin_not_connected` 5: the hierarchical labels VREF_A, GND, POS1, POS2 and 3V3_D have no parent sheet), 0 warnings |
| ERC under a one-block root, `/controls_a/` | 0 errors, 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 9 errors (`hier_label_mismatch` 6, `label_dangling` 3), 3 warnings (`isolated_pin_label` 3) | 3 errors (`label_dangling` 3, the stubs' labels alone with one block; `erc_sheets.py` admits them), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 3, 0 | 1, 0 |
| orphan junctions, of total | 0 of 3 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 6 | 0; 0 |
| labels | 23 on 12 nets (11 global, 12 local) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 23 | 0 of 12 |
| symbols (parts, power symbols, PWR_FLAGs) | 18 (18, 0, 0) | 18 (18, 0, 0) |
| placed pins | 39 | 39 |
| wires, total length | 63, 306.07 mm | 58, 1024.89 mm |
| wire corners | 19 | 10 |
| junctions | 3 | 21 |

**The sheet alone reports five of the six hierarchical labels, not six.** POS3's label (at 119.38,
124.46 mm, the same form as POS1's and POS2's) draws no `pin_not_connected`, on three runs of the
same bytes. An earlier version of this page, with the rectangle's east edge at 165.1 mm and the
fields in their first places, reported six. Not diagnosed; under the one-block root every label
meets a sheet pin and `/controls_a/` reads 0 errors, 0 warnings.

No symbol on this page is an `extends` symbol, and no `lib_symbol_mismatch` is reported.

### Why the page has one crossing, as the layout records it

An observation, not a judgement of the page: each of the three positions joins all three rails
(VREF_A at the pot's cw end, 3V3_D at R_PU, GND at the pot's ccw end, R_BTN and C_POS), and each rail
is one connected wire ending in one label. Contracted to its rails and positions, the page is the
graph K3,3, which has no drawing in a plane without a crossing, so at least one crossing is a
property of the circuit as drawn with one label per port. The one on the page is position 2's GND
row crossing the 3V3_D bus on its way to the outer GND vertical that comes down to position 3.

### What the page shows, as observations

- Three rows, one per position, POS1 at the top, POS2 in the middle, POS3 at the bottom. In each,
  the pot's wiper starts the node row, which runs east past R_PU and the button and through R_POS to
  the POSn label at the east, pointing east; C_POS hangs from the row between R_POS and the label.
- Positions 1 and 3: R_PU above the row, its top on a 3V3_D stub; the button and R_BTN below, down
  to the position's GND row; C_POS down to the same row; the pot's pin 3 up to a VREF_A stub and its
  pin 1 down to the GND row. Position 2 is their mirror image top to bottom: its GND row above, its
  3V3_D and VREF_A stubs below.
- VREF_A: a vertical west of the pots joins the three positions' stubs; VREF_A's label is at the top
  stub's west end, pointing west.
- 3V3_D: a vertical east of the POS labels joins the three stubs; 3V3_D's label is at the top stub's
  east end, pointing east.
- GND: positions 1 and 2's GND rows meet between them and are joined by a short vertical east of the
  POS labels; position 2's row runs on east across the 3V3_D vertical to an outer vertical down to
  position 3's GND row, which runs west to GND's label at the bottom west, pointing west.
- POS1's private nets carry copperhead's blue, POS2's its purple, POS3's its teal; the rails and the
  POS nets its default.
- The pots carry Reference over Value west of their bodies, the resistors and capacitors theirs east
  of their bodies, the buttons theirs east of their bodies (on positions 1 and 3 past the plunger,
  which KiCad draws on the east side at rotation 270 and the west at 90), and R_POS's centred on
  the node row's side away from its button (above on positions 1 and 3, below on position 2).
- The page note is below the group rectangle, at the west.

## controls_b: control positions 4 to 6 (Task 9b)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `cd3f1a0869064b31cd5d9302e188614e4fb6f58e74481c8c2ae342644f0da9db`.
Render: `controls_b.svg` beside it.

The block: `circuits/h7-platform/pedal/controls.ts` (`controlsBBlock`), 18 parts, six per position
(position n: pot, R_PUn, button, R_BTNn, R_POSn, C_POSn; ids from `VARIANT_POSITIONS`): POS4 RV4
(`rv_pos4`, RV16AF-41 B10K, `Device:R_Potentiometer`), R61 (`r_pu4`, 10.0 kOhm), SW4 (`sw_btn4`,
TC-6610-17-100G, `Switch:SW_Push`), R62 (`r_btn4`, 1.00 kOhm), R63 (`r_pos4`, 10.0 kOhm), C52
(`c_pos4`, 100 nF); POS5 RV5, R64, SW5, R65, R66, C53; POS6 RV6, R67, SW6, R68, R69, C54. Ports
VREF_A, 3V3_D, POS4, POS5, POS6 and GND, each reaching two or more pins, so copperhead drafted a wire
for every net and no stroke is written by hand. POSn_NODE and POSn_BTN are private to the page and
drawn as wire, with no label. No no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): the inventory's
  `controls` is split in two, `controls_b` holding positions 4 to 6 (contract pins 25 to 27).
- [CR-PEDAL-CONTROL-NODE](../../../docs/h7-platform/decisions.md#cr-pedal-control-node): each
  position is one node joining the pot's wiper, R_PUn, the button and R_POSn; the button returns
  through R_BTNn to GND; R_POSn runs to the pin, where C_POSn goes to GND; the pot runs from ccw = GND
  to cw = VREF_A; both fits are drawn at every position, and the page says each position is fitted
  with a pot or a button per effect.
- [CR-PEDAL-POPULATION](../../../docs/h7-platform/decisions.md#cr-pedal-population), the third class,
  variant positions: both fits modelled and drawn, **with a note that exactly one fit is placed per
  position**. The page note (text on the sheet, below the group rectangle), quoted:

  > Each control position is fitted per effect with a pot or a button: exactly one fit is placed per position.
  > Both fits are drawn (CR-PEDAL-POPULATION, variant positions; CR-PEDAL-CONTROL-NODE; open row CONTROL-POSITION-VARIANTS).
  > - POS4: pot fit RV4; button fit SW4 with its pull-up R61; always fitted R62, R63, C52.
  > - POS5: pot fit RV5; button fit SW5 with its pull-up R64; always fitted R65, R66, C53.
  > - POS6: pot fit RV6; button fit SW6 with its pull-up R67; always fitted R68, R69, C54.

  The pot fit is `rv_posn`, the button fit `sw_btnn` and `r_pun`, and always fitted `r_btnn`,
  `r_posn`, `c_posn`, as `VARIANT_POSITIONS` lists them. Open row CONTROL-POSITION-VARIANTS
  (`docs/h7-platform/open-items.md` line 115) holds whether the variant export carries only the fitted
  parts.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the pots are
  `potentiometer`, and which end of `Device:R_Potentiometer` is ccw is a choice: ccw = pin 1, wiper =
  pin 2, cw = pin 3. On this page pin 1 of every pot is on GND and pin 3 on VREF_A. The buttons are
  `switch`.
- [O-17](../../../docs/h7-platform/decisions.md#o-17) and [O-18](../../../docs/h7-platform/decisions.md#o-18):
  the owner's choice of the TC-6610-17-100G button, and each of the six positions a pot or a button
  per effect (`docs/h7-platform/parts.md` lines 131 and 132).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VREF_A, 3V3_D
  and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin here is `passive`, so nothing on the page needs one; the one-block root puts
  the root's stub flags on GND and 3V3_D, as for every page reaching them.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- Design notes the block cites, not rulings: `power.md` line 417, `analog.md` line 364,
  `mechanical-and-controls.md` lines 298 and 300, `architecture.md` line 230.
- Drawing choices, not transcriptions: controls_a's, unchanged (`repair/tools/controls_page.py`,
  shared by the two pages, which are the same circuit; `controls_b/layout.py` names the parts): the three positions stand one above
  another, each read west to east from the pot to its POSn label, the second the mirror image of the
  first top to bottom; the pots of positions 1 and 3 mirrored top to bottom (pin 3 north), position
  2's not; the buttons turned 270 (positions 1 and 3) and 90 (position 2); R_POS turned 90 in the
  node row; VREF_A's bus west of the pots, 3V3_D's east of the POS labels, GND's rows joined east of
  the POS labels; fields and the rectangle moved after the renders listed in
  `repair/tools/controls_page.py`.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9b leaves them (VREF_A's flag homed on the root, from the
expr_ref page; with Task 9a's tables `/` read one `label_dangling` more, the VREF_A stub's, and the
draft one `isolated_pin_label` fewer). Every figure in both
columns is the same as controls_a's; only the names differ. The draft column was
measured on the draft copied beside the committed `sym-lib-table`, by `verify.sh`'s steps run one at
a time, since `verify.sh` stops at the draft's port labels.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 18 (the model declares none) | 0; 18 |
| exported components, nets, net members | 18, 12, 39 | 18, 12, 39 |
| exported nets carrying a model net name | 12 of 12 | 6 of 12 (the six ports; the other six private and unlabelled) |
| ports whose label is on the wrong net | 3 of 6 (3V3_D, GND and VREF_A, drawn as global labels) | 0 of 6 |
| ERC, the sheet alone | 0 errors, 0 warnings | 5 errors (`pin_not_connected` 5: the hierarchical labels VREF_A, GND, POS4, POS5 and 3V3_D have no parent sheet), 0 warnings |
| ERC under a one-block root, `/controls_b/` | 0 errors, 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 9 errors (`hier_label_mismatch` 6, `label_dangling` 3), 3 warnings (`isolated_pin_label` 3) | 3 errors (`label_dangling` 3, the stubs' labels alone with one block; `erc_sheets.py` admits them), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 3, 0 | 1, 0 |
| orphan junctions, of total | 0 of 3 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 6 | 0; 0 |
| labels | 23 on 12 nets (11 global, 12 local) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 23 | 0 of 12 |
| symbols (parts, power symbols, PWR_FLAGs) | 18 (18, 0, 0) | 18 (18, 0, 0) |
| placed pins | 39 | 39 |
| wires, total length | 63, 306.07 mm | 58, 1024.89 mm |
| wire corners | 19 | 10 |
| junctions | 3 | 21 |

**The sheet alone reports five of the six hierarchical labels, not six**, as on controls_a: here
POS6's label (at 119.38, 124.46 mm, the third position's, as POS3's there) draws no
`pin_not_connected`. Not diagnosed; under the one-block root every label meets a sheet pin and
`/controls_b/` reads 0 errors, 0 warnings.

No symbol on this page is an `extends` symbol, and no `lib_symbol_mismatch` is reported.

### Why the page has one crossing, as the layout records it

An observation, not a judgement of the page: each of the three positions joins all three rails
(VREF_A at the pot's cw end, 3V3_D at R_PU, GND at the pot's ccw end, R_BTN and C_POS), and each rail
is one connected wire ending in one label. Contracted to its rails and positions, the page is the
graph K3,3, which has no drawing in a plane without a crossing, so at least one crossing is a
property of the circuit as drawn with one label per port. The one on the page is position 2's GND
row crossing the 3V3_D bus on its way to the outer GND vertical that comes down to position 3.

### What the page shows, as observations

- Three rows, one per position, POS4 at the top, POS5 in the middle, POS6 at the bottom. In each,
  the pot's wiper starts the node row, which runs east past R_PU and the button and through R_POS to
  the POSn label at the east, pointing east; C_POS hangs from the row between R_POS and the label.
- Positions 1 and 3: R_PU above the row, its top on a 3V3_D stub; the button and R_BTN below, down
  to the position's GND row; C_POS down to the same row; the pot's pin 3 up to a VREF_A stub and its
  pin 1 down to the GND row. Position 2 is their mirror image top to bottom: its GND row above, its
  3V3_D and VREF_A stubs below.
- VREF_A: a vertical west of the pots joins the three positions' stubs; VREF_A's label is at the top
  stub's west end, pointing west.
- 3V3_D: a vertical east of the POS labels joins the three stubs; 3V3_D's label is at the top stub's
  east end, pointing east.
- GND: positions 1 and 2's GND rows meet between them and are joined by a short vertical east of the
  POS labels; position 2's row runs on east across the 3V3_D vertical to an outer vertical down to
  position 3's GND row, which runs west to GND's label at the bottom west, pointing west.
- POS4's private nets carry copperhead's blue, POS5's its purple, POS6's its teal; the rails and the
  POS nets its default.
- The pots carry Reference over Value west of their bodies, the resistors and capacitors theirs east
  of their bodies, the buttons theirs east of their bodies (on positions 1 and 3 past the plunger,
  which KiCad draws on the east side at rotation 270 and the west at 90), and R_POS's centred on
  the node row's side away from its button (above on positions 1 and 3, below on position 2).
- The page note is below the group rectangle, at the west.

## expr_ref: the expression input, the VREF_A blocking network and HW_REV (Task 9b)

**Status: REVIEWED, 2026-11-13.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `f85af0345995f4a4b162ecbe287849ebbcbbdaa6eea9b06f229dab14b011539c`.
Render: `expr_ref.svg` beside it.

The block: `circuits/h7-platform/pedal/expr-ref.ts`, 23 parts. J4 (`j_exp`, NMJ6HCD2,
`Connector_Audio:NMJ6HCD2`: T on EXP_TIP_J, R on EXP_RING, S on GND, RN on EXP_RN, TN and SN not
connected); the tip chain D7 (`d_esd_tip`, PESD12VL1BA), R44 (`r_tip`, 22.0 kOhm), C45 (`c_tip`,
1 nF), R45 (`r_tip_pd`, 10 MOhm), R46 (`r_expin`, 2.2 MOhm), U13 (`u_exp`, MCP6001T-I/OT,
`h7-platform:MCP6001T-OT`), C46 (`c_exp`, 100 nF), R47 (`r_exp_out`, 1.00 kOhm), C47 (`c_exp_out`,
100 nF); plug detect R48 (`r_det`, 1 kOhm) and R49 (`r_det_pd`, 100 kOhm); the ring D8
(`d_esd_ring`, PESD12VL1BA), C44 (`c_ring`, 100 nF) and R43 (`r_ref`, 3.30 kOhm); the blocking network
U12 (`u_refblk`, LM66100DCKR, `h7-platform:LM66100DCK`), Q6 (`q_refen`, 2N7002,215,
`Transistor_FET:2N7002`), R41 (`r_eng`, 100 kOhm), R42 (`r_ce`, 100 kOhm), D9 (`d_rclamp`,
PMEG4005AEA,115, `Device:D_Schottky`); the HW_REV divider R50 (`r_hwrev_top`, 20.0 kOhm), R51
(`r_hwrev_bottom`, 2.49 kOhm), C48 (`c_hwrev`, 100 nF). Ports VREF_A, EXPR_TIP, HW_REV,
EXPR_DETECT and GND, each reaching two or more pins, so copperhead drafted a wire for every net and
no stroke is written by hand. The eleven private nets are drawn as wire, with no label. Two
no-connects, J4's TN and SN.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `expr_ref` is the
  expression jack and its chain, the VREF_A blocking network, U_EXP and HW_REV.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings): J4's
  pins (T, R, S on their nets, RN the ring-normal, TN and SN not connected); EXPR_DETECT's 100 kOhm at
  the pin, after the 1 kOhm; each PESD12VL1BA with pin 1 on the line and pin 2 on GND; U_EXP a unity
  follower, VSS on GND, VDD on VREF_A, then 1.00 kOhm to EXPR_TIP and 100 nF from EXPR_TIP to GND;
  C46 from VREF_A to GND. **Open row EXPR-JACK-CONTACT-MAP** (`docs/h7-platform/open-items.md`
  line 130): Neutrik's data sheet was not fetched, so which physical contact each of J4's letters is
  stays open; EXP_RN, and so EXPR_DETECT, depend on RN being the ring-normal leaf.
- [CR-PEDAL-HW-REV](../../../docs/h7-platform/decisions.md#cr-pedal-hw-rev): revision 1's divider,
  20.0 kOhm, 2.49 kOhm, 100 nF at the pin.
- [CR-PEDAL-SYMBOL-LM66100](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-lm66100),
  [CR-PEDAL-SYMBOL-MCP6001](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-mcp6001) and
  [CR-PEDAL-SYMBOL-PESD12VL1BA](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-pesd12vl1ba):
  U12, U13, D7 and D8 are project symbols; [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes):
  D9 is `Device:D_Schottky`, cathode 1.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): clause 5 types
  U12's ST `open_collector`, which is what the allowance below excuses; clause 1 makes Q6's gate
  `input`.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the jack is `switch`, the
  TVS, U12 and Q6 `ic`, D9 `diode`, U13 `opamp`.
- **[CR-PEDAL-LM66100-ST-ERC](../../../docs/h7-platform/decisions.md#cr-pedal-lm66100-st-erc)**,
  drafted by this task and adopted by the controller, 2026-11-13 (commit 00a1bcc): the page's one
  ERC error under its one-block root,
  `pin_to_pin` between U12's ST and the PWR_FLAG on GND, is excused by one declared allowance (below).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VREF_A and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; VREF_A's is homed on the root (below).
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 5 ports on the wrong net.
- Checklist items, not rulings: CTL-08 (schematic-checklist.md line 196), CTL-09 (line 197), CTL-10
  (line 201). Design notes the block cites: `analog.md` lines 307 to 314, 320, 322, 331, 335, 339,
  340, 347 and 351; `parts.md` lines 106 to 114 and 133.
- Drawing choices, not transcriptions (`expr_ref/layout.py` says each): J4 at the west, mirrored top
  to bottom so its pins read TN, T, RN, R, SN, S from the north; three bands east of it, the tip
  chain at the top, plug detect in the middle and the ring with the blocking network at the bottom,
  the last read east to west (VREF_A in at U12's VIN on the east, U12 mirrored left to right, REF_OUT
  out of VOUT westward through R43 to the ring); Q6 mirrored left to right, gate east; the VREF_A and
  GND verticals east of the labels; the HW_REV divider east of them.

### The tables and shared tools after Task 9b

- `pwr-flag-homes.ts`: **VREF_A on the root.** Under the expr_ref page's one-block root, `/expr_ref/`
  reported `power_pin_not_driven` on U12's VIN (pin 1, `power_in`). Survey of `h7Pedal()` (a script
  over the model and the symbol libraries): VREF_A's pins are J2 pin 1 (passive), U12's VIN and U13's
  VDD (`power_in`), and passives (the six pots' cw ends, C46, R41, R50); no power output. Of the
  earlier pages, interface (J2 pin 1), controls_a and controls_b have a VREF_A port; their bytes do
  not change, and each still verifies: interface's `/` reads 0 errors and 62 warnings where it read
  64, and controls_a's and controls_b's `/` 3 errors where they read 4.
- `erc-allowances.ts`: **its first entry**, CR-PEDAL-LM66100-ST-ERC: sheet `/expr_ref/`, `pin_to_pin`
  between U12 pin 5 and the PWR_FLAG on GND. To name a flag as an allowance's partner, the shared
  tools changed: `draughting/pages/erc_match.py` reads an item `Symbol #PWR<n> Pin 1 [Power output`
  as (`PWR_FLAG`, "1"), since the number is the holding sheet's; `draughting/pages/erc-allowances.ts`
  holds a `PWR_FLAG` partner to pin 1 and to a declared flag home for the entry's net;
  `draughting/pages/kicad-pro.ts` refuses such an entry, because a `.kicad_pro` exclusion keys the
  flag's uuid on the root, which it cannot read yet (the pedal root's task). The module's one
  allowance is unchanged and the module's replay and controls pass. `repair/tools/erc-control.sh`
  controls 7 to 10 re-run the allowance: the page verifies with it, fails without it on that pin
  pair, and an allowance naming U12 pin 4 or the flag's pin 2 is refused. Since the fix round the
  matcher also reads a board root's renamed flag, `#FLG<n>` (`tests/draught/erc-match-flag.test.ts`),
  so what the pedal root still needs is the flag's uuid for its `.kicad_pro`.
- `draughting/pages/text_edits.py` reads a mirror in both of the sheet's forms. copperhead drafted J4
  mirrored top to bottom and Q6 left to right, as the layout places them, so akcli left each mirror on
  a line of its own (copperhead's form); the tool read only akcli's form, on the `(at ...)` line, and
  refused J4 as unmirrored. No committed pedal or module sheet held the own-line form before this
  page (counted), and every earlier page replays byte-identical.
  `tests/draught/text-edits-mirror-forms.test.ts` reproduces this page's bytes from a reset copy and,
  as a control, requires the refusal when J4's own-line mirror is deleted.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 9b leaves them. The draft column was measured on the draft
copied beside the committed `sym-lib-table`, by `verify.sh`'s steps run one at a time.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 23 (the model declares none) | 0; 23 |
| exported components, nets, net members | 23, 16, 58 | 23, 16, 58 |
| exported nets carrying a model net name | 14 of 16 | 5 of 16 (the five ports; the other eleven private and unlabelled) |
| ports whose label is on the wrong net | 3 of 5 | 0 of 5 |
| ERC, the sheet alone | 2 errors (`power_pin_not_driven` 2, U12's VIN and GND), 6 warnings (`lib_symbol_issues` 4, `lib_symbol_mismatch` 2) | 7 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, U12's VIN and GND), 6 warnings (the same six) |
| ERC under a one-block root, `/expr_ref/` | 2 errors (`power_pin_not_driven` 2, U12's VIN and GND), 3 warnings (`same_local_global_label` 3) | **1 error, excused by CR-PEDAL-LM66100-ST-ERC** (`pin_to_pin`, U12 pin 5 ST against the stub PWR_FLAG on GND), 0 warnings |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 5, `label_dangling` 3), 8 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 4, `lib_symbol_mismatch` 2) | 3 errors (`label_dangling` 3, the stubs' labels alone with one block; `erc_sheets.py` admits them), 6 warnings (`lib_symbol_issues` 4, `lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 5, 6 | 4, 0 |
| orphan junctions, of total | 0 of 11 | 0 of 33 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 3; 6 | 0; 0 |
| pins on a wire's interior without a dot | 1 | 0 |
| labels | 31 on 14 nets (24 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 31 | 0 of 14 |
| symbols (parts, power symbols, PWR_FLAGs) | 23 (23, 0, 0) | 23 (23, 0, 0) |
| placed pins | 58 | 58 |
| wires, total length | 94, 740.41 mm | 88, 1287.78 mm |
| wire corners | 13 | 16 |
| junctions | 11 | 33 |

The draft under the one-block root reports no `pin_to_pin` on U12's ST because its GND is drawn as
global labels, a net apart from the root's `/GND`, whose stub carries the flag; and it reports U12's
VIN and GND undriven for the same reason.

**`lib_symbol_issues` 4**: *"The current configuration does not include the symbol library
'h7-platform'"*, on D7, D8, U12 and U13, the pf page's warning: a block page has no `.kicad_pro`, and
kicad-cli 10.0.5 does not take the committed `sym-lib-table` without one. The symbols are embedded in
the sheet.

**`lib_symbol_mismatch` 2**, on J4 and Q6, both `extends` symbols whose embedded copy is the parent
flattened (measured against the installed libraries):

| | J4 embedded | `NMJ6HCD2` installed (`Connector_Audio.kicad_sym` line 20009) | Q6 embedded | `2N7002` installed (`Transistor_FET.kicad_sym` line 813) |
| --- | --- | --- | --- | --- |
| parent | `AudioJack3_Switch` (line 4113) | | `Q_NMOS_GSD` (line 68850) | |
| Value | `AudioJack3_Switch` | `NMJ6HCD2` | `Q_NMOS_GSD` | `2N7002` |
| Footprint | (none) | `Connector_Audio:Jack_6.35mm_Neutrik_NMJ6HCD2_Horizontal` | (none) | `Package_TO_SOT_SMD:SOT-23` |
| Datasheet | (none) | `https://www.neutrik.com/en/product/nmj6hcd2` | (none) | `https://www.onsemi.com/pub/Collateral/NDS7002A-D.PDF` |
| Description | "Audio Jack, 3 Poles (Stereo / TRS), Switched Poles (Normalling)" | "M Series, 6.35mm (1/4in) stereo jack, switched, with chrome ferrule and straight PCB pins" | "N-MOSFET transistor, gate/source/drain" | "0.115A Id, 60V Vds, N-Channel MOSFET, SOT-23" |
| pins | T, R, S, TN, RN, SN, all passive: the parent's | | 1 G input, 2 S passive, 3 D passive: the parent's | |

The instances' own Values on the page are `NMJ6HCD2` and `2N7002,215`. **Not an electrical fault**:
the model comparison is 0, 0, 0, 0. **Trap for a later output**: an export reading the library fields
gets the generic jack and MOSFET with no footprint or data sheet; J4's Neutrik footprint in
particular is on the installed child only.

### Why the page has four crossings, as the layout records it

Observations, not a judgement of the page, each crossing at the point `crossings.py` reports:

- (114.3, 48.26) mm, **C46's GND lead across the row into U13's + input.** The tip band's signal row
  runs from J4 to EXPR_TIP, interrupted only by U13's body, and C46 joins VREF_A above it to GND below
  it, so any place for C46 beside U13 crosses that row; the alternative, C46 on the VREF_A and GND
  verticals at the east, puts it 3 inches from the VDD pin it decouples.
- (124.46, 62.23) mm, **the follower's feedback across U13's VSS lead.** The symbol has VDD on top and
  VSS underneath, and a loop from the output to the - input closes round one side of the body or the
  other, enclosing one supply pin; it runs under, crossing VSS.
- (144.78, 105.41) mm, **R42's run across U12's GND lead.** R42 joins VOUT (west) to CE (east); a path
  between them closes round U12, and encloses either VIN or the GND, N/C and ST pins, whose net must
  leave; it runs under U12, crossing the one GND lead the three are joined into.
- (195.58, 66.04) mm, **the tip band's GND row across the VREF_A vertical.** VREF_A reaches the bottom
  band from the top row down a vertical east of the labels, and the tip band's GND reaches the bottom
  row down a vertical further east; the inner of the two is crossed by the outer one's row.

### What the page shows, as observations

- J4 at the west, its pins facing east: T rises to the tip row, RN runs straight east, R drops to the
  ring row, S drops to the bottom GND row; TN and SN carry no-connect flags.
- The tip row at the top: past D7 (down to the tip band's GND row), through R44, past C45 and R45
  (down to that row), through R46 into U13's + input. U13's VDD rises to the VREF_A row along the
  top, with C46 hanging from that row west of U13; its VSS drops to the GND row. Its output runs east
  past the feedback tap, through R47 to EXPR_TIP's label, pointing east, with C47 down to GND.
- The detect row in the middle, from RN through R48 to EXPR_DETECT's label, pointing east; R49 rises
  from it to the tip band's GND row.
- The bottom band, read east to west: VREF_A comes down the vertical east of the labels into U12's
  VIN (U12 mirrored, VOUT west); REF_OUT runs west past R42's run and D9 (down to GND) through R43 to
  the ring row, past C44 and D8 (down to GND) to J4's R. U12's N/C and ST join west of it and meet its
  GND lead under it. Its CE row runs east past R42 to Q6's drain (Q6 mirrored, gate east), whose gate
  takes R41 from the VREF_A vertical; Q6's source drops to the bottom GND row, which runs west to GND's
  label, pointing west.
- East of the labels, the VREF_A vertical, then the GND vertical joining the two GND rows, then the
  HW_REV divider: R50 down from the VREF_A row to the HW_REV node, R51 and C48 down to the tip band's
  GND row, HW_REV's label east, pointing east; VREF_A's label is at the top row's east end, pointing
  east.
- The EXP_ nets (the tip chain's, EXP_RING and EXP_RN) carry copperhead's blue, EXPR_TIP and
  EXPR_DETECT its purple, REF_OUT, REF_CE and REF_ENG its teal; the rest its default.
- U13's VDD and VSS pin names, drawn by the project symbol inside the triangle, overlap the VIN+ and
  VIN- names on the render; the symbol's geometry is `Amplifier_Operational:MCP6001-OT`'s
  (CR-PEDAL-SYMBOL-MCP6001), and this page does not change it.

## codec_sup: the codec domain's supply, oscillator and local reset (Task 9c)

**Status: UNREVIEWED.** sha256 `9f98870190e4b1207c005494b73ec8fb75f2f48857df9723e612a96902ce3147`.
Render: `codec_sup.svg` beside it.

The block: `circuits/h7-platform/pedal/codec-sup.ts`, 11 parts. U6 (U_CVDD, TPS7A2433DBVR,
`h7-platform:TPS7A2433DBV`: IN and EN on 5V_A_CODEC, OUT on 3V3_CODEC, GND, pin 4 NC open) with C32
(C_CVDDIN 1 uF, 5V_A_CODEC to GND) and C33 (C_CVDDOUT 1 uF, 3V3_CODEC to GND); D6 (D_CVCL,
PMEG4005AEA, `Device:D_Schottky`: anode 3V3_CODEC, cathode 5V_A_CODEC); R26 (R_CBLD 3.60 kOhm,
3V3_CODEC to GND); U7 (U_XO, X1G0041710019, the SG-210STF, on the stand-in `Oscillator:SG-5032CAN`: ST
and VCC on 3V3_CODEC, GND, OUT on XO_OUT) with C34 (C_XO 100 nF); U8 (U_CRST, TLV803EA29DBZR, on
`h7-platform:TLV803EA30DBZR`: VDD on 3V3_CODEC, GND, open-drain RESET on CODEC_RST_N) with C35
(C_CRST 100 nF); R27 (R_CRST 4.70 kOhm, CODEC_RST_N to 3V3_CODEC); Q5 (Q_PFR, AO3400A: drain on
CODEC_RST_N, gate PF_TRIP, source GND). Ports 3V3_CODEC, 5V_A_CODEC, CODEC_RST_N, GND, PF_TRIP and
XO_OUT (PF_TRIP and XO_OUT each reach one pin: Q5's gate and U7's OUT). No private net. One
no-connect, U6's pin 4.

**Not modelled and not drawn** (CR-PEDAL-POPULATION, class 1): v1's R_RST_PD, 10 kOhm from
CODEC_RST_N to GND (analog.md line 63, "stays not fitted"; R-31, R-53). The codec page's population
note lists it with the codec's not-fitted parts.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `codec_sup` is one of
  the pedal's blocks: the codec domain's regulator, clamp, oscillator and local reset.
- [R-29](../../../docs/h7-platform/decisions.md#r-29): U_XO, the SG-210STF 12.288 MHz on 3V3_CODEC
  with 100 nF, ST tied high.
- [R-30](../../../docs/h7-platform/decisions.md#r-30): U_CVDD from 5V_A_CODEC to 3V3_CODEC, D_CVCL
  from OUT to IN, R_CBLD 3.60 kOhm to GND (amended by
  [R-53](../../../docs/h7-platform/decisions.md#r-53)).
- [R-31](../../../docs/h7-platform/decisions.md#r-31): U_CRST, R_CRST 4.70 kOhm to 3V3_CODEC, and
  R_RST_PD not fitted (amended by [R-40](../../../docs/h7-platform/decisions.md#r-40) and R-53).
- [R-37](../../../docs/h7-platform/decisions.md#r-37): Q_PFR, an AO3400A, on CODEC_RST_N, driven by
  PF_TRIP.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings):
  U_CVDD's EN tied to IN and pin 4 open (TI SBVS386E p. 3 Table 5-1, p. 11 section 7.3.1); Q_PFR's
  source on GND; each decoupling capacitor from its rail to GND.
- [CR-PEDAL-POPULATION](../../../docs/h7-platform/decisions.md#cr-pedal-population): R_RST_PD, class
  1, is not on the page.
- [CR-PEDAL-SYMBOL-TPS7A2433](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-tps7a2433): U6
  is the project symbol from `Regulator_Linear:TLV70033_SOT23-5`, pin 4 `free` and shown.
- [CR-PEDAL-SYMBOL-SG-210STF](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-sg-210stf): U7
  is drawn from the stand-in `Oscillator:SG-5032CAN`; its stock Footprint field names the 5032
  package, and no footprint is taken from it.
- [CR-PEDAL-SYMBOL-TLV803EA29](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-tlv803ea29):
  U8 is the module's `h7-platform:TLV803EA30DBZR`; its Value field and the model's `mpn` say
  TLV803EA29DBZR.
- [CR-PEDAL-SYMBOL-AO3400A](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a) and
  [CR-PEDAL-SYMBOL-AO3400A-AMENDED](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a-amended):
  Q5 is the stock AO3400A, G 1, S 2, D 3 (Q_PFR is on the ruling's cost list).
- [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes): D6, the
  PMEG4005AEA, is `Device:D_Schottky`, 1 K, 2 A.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds) and
  [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): Q5's gate is
  `input`; U8's RESET `open_collector`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 5V_A_CODEC,
  3V3_CODEC and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; 5V_A_CODEC's flag is on the root (below), and the one-block root puts the root's stub
  flags on 5V_A_CODEC and GND.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  PF_TRIP's driver is U2 on the pf page, an entry since Task 7b; the one-block root stands a
  TestPoint in for it.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- Design notes, not rulings: analog.md lines 63, 374, 383, 387, 401 and 407 and parts.md lines 97 to
  104, which the block cites part by part.
- Drawing choices, not transcriptions: one band read west to east along the 3V3_CODEC rail, D6 over
  U6 between taps on the rows either side of it, XO_OUT's and PF_TRIP's labels mid-page; PF_TRIP and
  XO_OUT, which the draft drew no wire for, take copperhead's default stroke, as neither shares its
  prefix with another net on the page (`codec_sup/layout.py`, `UNDRAWN_STROKES`, says why); fields
  and the rectangle moved after the renders listed below.

### The tables after this page

- `pwr-flag-homes.ts`: **5V_A_CODEC on the root.** Under this page's one-block root `kicad-cli sch
  erc` reported `power_pin_not_driven` on U6's IN (pin 1, `power_in`). Survey of `h7Pedal()` with the
  installed and project libraries: 5V_A_CODEC's pins are R21's pin 2 (ldo_vmid, PWR-15's 0 ohm from
  5V_A, passive), C32, C36, C37 and D6's cathode (passive), U6's EN (pin 3, `input`), and U6's IN and
  U9's VCC (pin 24, codec page; `power_in`). No power output, so CR-MODULE-PWR-FLAGS puts its one
  flag on the root, as for GND, VIN_MOD, VIN_A, 3V3_D and VREF_A. With it, `/codec_sup/` reads 0
  errors.
- 3V3_CODEC is not homed: U6's OUT (pin 5) is `power_out`. The pages that reach 3V3_CODEC without U6
  (codec, sai_iso) take a cross-page driver entry when their ERC reports it.
- `cross-page-drivers.ts` and `erc-allowances.ts` are unchanged by this page.

**What the new home does to the earlier pages: nothing to their bytes.** Of the twelve, only
ldo_vmid has a 5V_A_CODEC port (R21's pin 2). Its one-block root's 5V_A_CODEC stub now carries the
root's flag, and its `/` reads 3 errors and 4 warnings where it read 6 (its section above now
records both; the two `isolated_pin_label` warnings on the 5V_A_CODEC stub's label and the sheet's hierarchical
label are gone). Re-run with this table, `verify.sh` exits 0 on ldo_vmid, `/ldo_vmid/` at 0 errors
and 0 warnings, its sha256 unchanged, and the replay into a new directory reaches every earlier
page's sha256.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 11 (the model declares none) | 0; 11 |
| exported components, nets, net members | 11, 7, 29 | 11, 7, 29 |
| exported nets carrying a model net name | 4 of 7 | 6 of 7 (the six ports; the seventh is U6's pin 4, unconnected) |
| ports whose label is on the wrong net | 5 of 6 | 0 of 6 |
| ERC, the sheet alone | 5 errors (`pin_not_connected` 2, U7 pin 3 and Q5 pin 1; `pin_not_driven` 1, Q5's gate; `power_pin_not_driven` 2, U6's IN and GND), 3 warnings (`lib_symbol_issues` 2, U6 and U8; `lib_symbol_mismatch` 1, Q5) | 9 errors (`pin_not_connected` 6: each hierarchical label has no parent sheet; `pin_not_driven` 1, Q5's gate; `power_pin_not_driven` 2, U6's IN and GND), 5 warnings (`isolated_pin_label` 2, XO_OUT and PF_TRIP; `lib_symbol_issues` 2; `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/codec_sup/` | 5 errors (`pin_not_connected` 2, `pin_not_driven` 1, `power_pin_not_driven` 2, U6's IN and GND), 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 9 errors (`hier_label_mismatch` 6, `label_dangling` 3), 6 warnings (`isolated_pin_label` 3, `lib_symbol_issues` 2, `lib_symbol_mismatch` 1) | 2 errors (`label_dangling` 2, the 3V3_CODEC and CODEC_RST_N stubs' labels, alone with one block; `erc_sheets.py` admits them), 5 warnings (`isolated_pin_label` 2, XO_OUT's stub label and the sheet's XO_OUT label; `lib_symbol_issues` 2; `lib_symbol_mismatch` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 6 | 0 of 22 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 15 on 4 nets (14 global, 1 local) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 15 | 0 of 6 |
| symbols (parts, power symbols, PWR_FLAGs) | 11 (11, 0, 0) | 11 (11, 0, 0) |
| placed pins | 29 | 29 |
| wires, total length | 42, 269.24 mm | 44, 591.82 mm |
| wire corners | 10 | 4 |
| junctions | 6 | 22 |
| no-connects | 1 (U6 pin 4) | 1 (U6 pin 4) |

**`pin_not_driven` 1 and `power_pin_not_driven` 2 on the sheet alone** are Q5's gate (PF_TRIP's
driver is on the pf page), U6's IN (5V_A_CODEC's flag is on the root) and U6's GND (GND's flag is on
the root). Under the one-block root the TestPoint stand-in and the two stub flags remove all three.

**`lib_symbol_issues` 2**, on U6 and U8: *"The current configuration does not include the symbol
library 'h7-platform'"*. This is the pf page's U1 warning: a block page has no `.kicad_pro`, and
kicad-cli 10.0.5 does not take the committed `sym-lib-table` without one. Both symbols are embedded
in the sheet.

**`lib_symbol_mismatch` 1**, on Q5: *"Symbol 'AO3400A' doesn't match copy in library
'Transistor_FET'"*, the fsw_led page's Q7 and Q8 warning: the installed AO3400A is `(extends
"Q_NMOS_GSD")`, and the embedded copy (`codec_sup.kicad_sch` line 1013) is the parent flattened,
with the parent's Value, no Footprint and no Datasheet. Q5's own Value on the page is `AO3400A`.
**Not an electrical fault**: the model comparison is 0, 0, 0, 0. **Trap for a later output**: an
export reading Q5's library fields gets the generic MOSFET with no footprint or data sheet. U7's
`Oscillator:SG-5032CAN` is not reported: it is the parent of its library's `extends` entry, not an
`extends` itself.

Q5's fields, read from the installed library and the sheet (`Transistor_FET.kicad_sym`):

| field | installed `AO3400A` (line 1590, `extends "Q_NMOS_GSD"`) | installed parent `Q_NMOS_GSD` (line 68850) | embedded copy (`codec_sup.kicad_sch` line 1013) |
| --- | --- | --- | --- |
| Value | `AO3400A` | `Q_NMOS_GSD` | `Q_NMOS_GSD` (the instance's own Value is `AO3400A`) |
| Footprint | `Package_TO_SOT_SMD:SOT-23` | empty | empty |
| Datasheet | `http://www.aosmd.com/pdfs/datasheet/AO3400A.pdf` | empty | empty |
| Description | "30V Vds, 5.7A Id, N-Channel MOSFET, SOT-23" | "N-MOSFET transistor, gate/source/drain" | "N-MOSFET transistor, gate/source/drain" |

**`isolated_pin_label` 2**, on the sheet alone: XO_OUT's and PF_TRIP's hierarchical labels, each on
one pin here; XO_OUT's other pins are the codec's SCKI1 and SCKI2 (codec page) and PF_TRIP's are on
the pf and modsw pages.

### Why the page has no crossing, as the layout records it

An observation, not a judgement of the page: every part hangs between the one rail row and the GND
row, or between the CODEC_RST_N row and one of them, and D6 runs over U6 between taps on the rows on
either side of it, so no row is crossed.

### What the page shows, as observations

- One band. 5V_A_CODEC's label at the west edge, pointing west, starts a row that runs east past C32
  (down to the GND row) and a tap for D6 into U6's IN; U6's EN, below IN, joins the row west of it.
- D6 over U6, pointing west: its cathode from a tap on the 5V_A_CODEC row west of U6, its anode to a
  tap on the 3V3_CODEC rail east of it.
- U6's OUT starts the 3V3_CODEC rail, which runs east past C33, R26, C34, U7 (VCC straight up to it,
  ST up to it from the west), C35, U8 (VDD straight up) and R27 to 3V3_CODEC's label at the east edge,
  pointing east. U6's NC (pin 4) carries a no-connect.
- U7's OUT runs east to XO_OUT's label, pointing east, before C35.
- U8's RESET starts the CODEC_RST_N row, which runs east past R27 (up to the rail) and Q5's drain to
  its label at the east edge, pointing east, under 3V3_CODEC's. PF_TRIP's label, pointing west, sits
  west of Q5's gate.
- The GND row runs under the band from GND's label at the west edge, pointing west, to Q5's source.
- Every wire carries copperhead's default stroke.
- The hanging parts carry Reference over Value east of their bodies; D6's above it; U6's Reference
  above it and Value below; U7's Reference above and Value below; U8's Reference and Value east of
  its body, above and below the RESET row.
- Renders: the first had R26's fields over C33's and D6's Value over the diode; the parts east of C33
  moved 100 to 200 mil east, D6's fields moved up and the rectangle's top edge with them.

## sai_iso: the SAI domain isolation buffers (Task 9c)

**Status: UNREVIEWED.** sha256 `ffc831855bd99856e6c84610169623a34f99ca50e15a834fccb0b23251cff9c8`.
Render: `sai_iso.svg` beside it.

The block: `circuits/h7-platform/pedal/sai-iso.ts`, 11 parts. U10 (U_ISO_M, SN74LVC3G34DCTR,
`h7-platform:SN74LVC3G34DCT`, four units: gate 1 DOUT_CODEC to ISO_DOUT, gate 2 LRCK_CODEC to
ISO_LRCK, gate 3 BCK_CODEC to ISO_BCK, the supply unit on 3V3_D and GND) with C42 (C_ISO_M 100 nF,
3V3_D to GND); R34, R35 and R36 (R_BIAS_DOUT, _LRCK, _BCK, 47 kOhm, each gate's input to GND); R37,
R38 and R39 (R_ISO_DOUT, _LRCK, _BCK, 470 Ohm, each ISO_ output to the contract nets CODEC_DOUT,
CODEC_LRCK and CODEC_BCK); U11 (U_ISO_C, SN74LVC1G34DBVR, `h7-platform:SN74LVC1G34DBV`: A on
CODEC_DIN, Y on DIN_CODEC, VCC on 3V3_CODEC, GND, pin 1 "No internal connection") with C43 (C_ISO_C
100 nF, 3V3_CODEC to GND) and R40 (R_BIAS_DIN 47 kOhm, CODEC_DIN to GND). Ports 3V3_CODEC, 3V3_D,
BCK_CODEC, LRCK_CODEC, DOUT_CODEC, DIN_CODEC, CODEC_DOUT, CODEC_DIN, CODEC_LRCK, CODEC_BCK and GND
(CODEC_DOUT, CODEC_LRCK, CODEC_BCK and DIN_CODEC each reach one pin: R37's, R38's and R39's pin 2 and
U11's Y). ISO_DOUT, ISO_LRCK and ISO_BCK are private to the page and drawn as wire, with no label.
One no-connect, U11's pin 1.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `sai_iso` is one of the
  pedal's blocks: the SAI crossing between the module's 3V3_D domain and the codec's 3V3_CODEC
  domain.
- [R-10](../../../docs/h7-platform/decisions.md#r-10): the SAI domain isolation, architecture.md
  lines 255 and 256 (IF-PD-1): U_ISO_M powered from the receiving side toward the module, 47 kOhm
  bias to GND on each input, 470 Ohm 1 % between each output and its interface pin; U_ISO_C on the
  codec rail toward the codec with a 47 kOhm bias on its input.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings):
  U_ISO_M's gate order (gate 1 DOUT, gate 2 LRCK, gate 3 BCK) and its supply as a fourth unit; R40 to
  GND; each decoupling capacitor from its rail to GND.
- [CR-PEDAL-LOGIC-DECOUPLING](../../../docs/h7-platform/decisions.md#cr-pedal-logic-decoupling): C42
  and C43, 100 nF at each buffer's VCC (TI SCES366L p. 10 section 10; SCES519O p. 15 section 8.3).
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): the codec-side nets
  BCK_CODEC, LRCK_CODEC, DOUT_CODEC and DIN_CODEC; the module side is the contract's pins 32 to 35.
- [CR-PEDAL-SYMBOL-SN74LVC3G34](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-sn74lvc3g34):
  U10's project symbol; its unit 2 is gate 3 (pins 6, 2) and unit 3 gate 2 (pins 3, 5), so the page
  shows U10A on DOUT, U10C on LRCK and U10B on BCK.
- [CR-PEDAL-SYMBOL-SN74LVC1G34](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-sn74lvc1g34):
  U11's project symbol, pins 2 (A) and 4 (Y) named from SCES519O.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds) and
  [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): the buffers' A pins
  `input`, Y pins `output`, VCC and GND `power_in`.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D,
  3V3_CODEC and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; the one-block root puts the root's stub flags on 3V3_D and GND (homes since Tasks 9a and
  7b).
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  3V3_CODEC's driver, U6's OUT on the codec_sup page, is a new entry (below); the one-block root
  stands a PWR_FLAG in for it.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 11 ports on the wrong net.
- Design notes, not rulings: architecture.md lines 255 and 256, parts.md lines 115 and 116 and
  open-items.md line 45, which the block cites part by part. The 47 kOhm and 470 Ohm carry no MPN;
  a schematic needs none (G245).
- Drawing choices, not transcriptions: four signal rows stacked, the to-module three in
  architecture.md line 255's order and then DIN, each read west to east; U11 mirrored top to bottom so
  its GND faces the comb's run above it and its VCC the 3V3_CODEC row below; a GND comb down the west
  side, west of the labels; U10's supply unit at the bottom east with C42; CODEC_DOUT, CODEC_LRCK,
  CODEC_BCK and DIN_CODEC, which the draft drew no wire for, take the default stroke, as CODEC_DIN,
  the drafted member of their CODEC family, has it on the draft (`sai_iso/layout.py`,
  `UNDRAWN_STROKES`, says why); fields and the rectangle moved after the renders listed below.

### The tables after this page

- `cross-page-drivers.ts`: **3V3_CODEC, driven by U6's OUT (pin 5) on the codec_sup page.** Under
  this page's one-block root `kicad-cli sch erc` reported `power_pin_not_driven` on U11's VCC (pin 5,
  `power_in`). U6's symbol, `h7-platform:TPS7A2433DBV`, types pin 5 `power_out`, so `standInKind`
  makes the stand-in a PWR_FLAG (CR-PEDAL-CROSS-PAGE-POWER-DRIVERS), and 3V3_CODEC takes no flag
  home (`checkPowerDriversUnflagged`). With it, `/sai_iso/` reads 0 errors.
- `pwr-flag-homes.ts` and `erc-allowances.ts` are unchanged by this page.

**What the entry does to the earlier pages: nothing.** Of the thirteen, only codec_sup reaches
3V3_CODEC, and it holds the driver, so its one-block root places no stand-in; its `verify.sh` output
is unchanged.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 11 (the model declares none) | 0; 11 |
| exported components, nets, net members | 11, 15, 31 | 11, 15, 31 |
| exported nets carrying a model net name | 10 of 15 | 11 of 15 (the eleven ports; the other four are ISO_DOUT, ISO_LRCK and ISO_BCK, private and unlabelled, and U11's pin 1) |
| ports whose label is on the wrong net | 7 of 11 | 0 of 11 |
| ERC, the sheet alone | 7 errors (`pin_not_connected` 4, R37, R38 and R39 pin 2 and U11 pin 4; `power_pin_not_driven` 3, U11's VCC, U10's VCC and GND), 5 warnings (`lib_symbol_issues` 5) | 12 errors (`pin_not_connected` 9, hierarchical labels with no parent sheet; `power_pin_not_driven` 3, the same three pins), 9 warnings (`isolated_pin_label` 4, the four one-pin ports' labels; `lib_symbol_issues` 5) |
| ERC under a one-block root, `/sai_iso/` | 7 errors (`pin_not_connected` 4, `power_pin_not_driven` 3), 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 19 errors (`hier_label_mismatch` 11, `label_dangling` 8), 8 warnings (`isolated_pin_label` 3, `lib_symbol_issues` 5) | 4 errors (`label_dangling` 4, the BCK_CODEC, CODEC_DIN, DOUT_CODEC and LRCK_CODEC stubs' labels, alone with one block; `erc_sheets.py` admits them), 13 warnings (`isolated_pin_label` 8, the four one-pin ports' stub labels and sheet labels; `lib_symbol_issues` 5) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 0 | 0 of 13 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 16 on 10 nets (9 global, 7 local) | 11 on 11 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 16 | 0 of 14 |
| symbols (part instances, power symbols, PWR_FLAGs) | 14 (14: U10's four units and ten single-unit parts, 0, 0) | 14 (14, 0, 0) |
| placed pins | 31 | 31 |
| wires, total length | 39, 191.77 mm | 36, 675.64 mm |
| wire corners | 14 | 3 |
| junctions | 0 | 13 |
| no-connects | 1 (U11 pin 1) | 1 (U11 pin 1) |

**`power_pin_not_driven` 3 on the sheet alone**: U11's VCC (3V3_CODEC, driven by U6 on codec_sup),
U10's VCC (3V3_D's flag is on the root) and U10's GND (GND's flag is on the root). Under the
one-block root the PWR_FLAG stand-in and the two stub flags remove all three.

**`lib_symbol_issues` 5**, on U10's four units and U11: *"The current configuration does not include
the symbol library 'h7-platform'"*. This is the pf page's U1 warning: a block page has no
`.kicad_pro`, and kicad-cli 10.0.5 does not take the committed `sym-lib-table` without one. Both
symbols are embedded in the sheet. No `lib_symbol_mismatch`: the `Device` symbols match their
installed copies.

**`isolated_pin_label` 4**, on the sheet alone: CODEC_DOUT, CODEC_LRCK, CODEC_BCK and DIN_CODEC, each
on one pin here; the contract nets' other pins are module-socket pins on the interface page, and
DIN_CODEC's other pin is the codec's DIN (pin 12, codec page).

**Observation, undiagnosed: the sheet-alone ERC reports `pin_not_connected` on 9 of the 11
hierarchical labels; CODEC_LRCK's and CODEC_BCK's are not reported** (repeatable). This is the
controls pages' observation (the sheet alone omitted the third position's label there). Under the
one-block root `/sai_iso/` reads 0 errors and 0 warnings, the port-label check reads 0 of 11, and the
export puts /CODEC_LRCK on R38's pin 2 and /CODEC_BCK on R39's pin 2, so the omission hides no fault.

### Why the page has no crossing, as the layout records it

An observation, not a judgement of the page: the GND comb runs down the west side, west of every
label, so each bias resistor's run reaches it without passing a signal row; R36's run drops onto
U11's GND run; the two supply rows sit under the DIN row, each from its own buffer, and the GND row
runs under them.

### What the page shows, as observations

- Three to-module rows at the top, one under another: DOUT_CODEC, LRCK_CODEC and BCK_CODEC, each
  label at the west, pointing west, past its 47 kOhm (hanging down) into its gate of U10 (U10A, U10C,
  U10B), the gate's output through its 470 Ohm to the contract net's label at the east (CODEC_DOUT,
  CODEC_LRCK, CODEC_BCK), pointing east.
- The DIN row under them: CODEC_DIN's label at the west, pointing west, past R40 (hanging down) into
  U11's A; U11's Y east to DIN_CODEC's label, pointing east. U11 is mirrored top to bottom: its GND
  (pin 3) and pin 1, with its no-connect, face up; its VCC faces down.
- A GND comb down the west side, west of the labels, taking R34's, R35's and R40's runs, and U11's GND
  run, onto which R36 drops; it runs down to a GND row along the bottom, which runs east past C43,
  U10D's GND and C42 to GND's label, pointing east.
- The 3V3_CODEC row under the DIN row: from U11's VCC west past C43 (down to GND) to its label,
  pointing west. U10D, the supply unit, at the bottom east: its VCC up to the 3V3_D row, which runs
  east past C42 (down to GND) to its label, pointing east.
- ISO_DOUT, ISO_LRCK and ISO_BCK carry copperhead's purple, 3V3_D and 3V3_CODEC its blue, every other
  net its default.
- The gate units carry Reference over Value above their bodies; U11's east of its body under the DIN
  row; U10D's west of its body; the bias resistors' and capacitors' east of their bodies; the 470 Ohm
  resistors' above them.
- Renders: the first had U10's fields on the gate bodies' tops, U11's fields over its own body and
  U10D's Value across C42's lead; the rows went from 600 to 800 mil apart, U11's fields moved east,
  U10D's west, and the rectangle's top and bottom with them.

## codec: the PCM3060 in hardware mode (Task 9c)

**Status: UNREVIEWED.** sha256 `1c17ed164ce98f749cb2db3a88f815e59d10ed82d92b5ca5a924952f4c414588`.
Render: `codec.svg` beside it. **Since Task 10 its block sheet is at 0 ERC errors and 0 warnings
under its one-block root, with no allowance**: VINL and VINR, the two `pin_not_driven` errors this
task had excused by one-item allowances under CR-PEDAL-CODEC-VIN-AWAITING-ERC (adopted by the
controller as temporary, d3e0e95), are met by cross-page driver entries naming adc_drv's R_O, and the
allowances are gone (CR-PEDAL-CODEC-VIN-AWAITING-ERC-AMENDED; "Task 10: VINL and VINR driven", at the
end of this section). The sha256 is unchanged. The Task 9c text below is the record as it was then.

The block: `circuits/h7-platform/pedal/codec.ts`, 13 parts. U9 (U_CODEC, PCM3060PWR,
`h7-platform:PCM3060PW`) with C36 and C37 (C_VCC_HF 100 nF and C_VCC_BULK 10 uF, 5V_A_CODEC to GND),
C38 and C39 (C_VDD_HF 100 nF and C_VDD_BULK 10 uF, 3V3_CODEC to GND), C40 and C41 (C_VCOM_HF 100 nF
and C_VCOM_BULK 10 uF, CODEC_VCOM to GND); the straps R28 (R_MODE 220 kOhm, MODE pin 28 to GND), R29
(R_FMT 4.7 kOhm, MC/SCL/FMT pin 1 to 3V3_CODEC) and R30 (R_DEMP 4.7 kOhm, MD/SDA/DEMP pin 2 to GND),
and MS/ADR/IFMD (pin 27) on 3V3_CODEC; R31, R32 and R33 (33 Ohm: BCK1 and BCK2 to BCK_CODEC, LRCK1
and LRCK2 to LRCK_CODEC, DOUT to DOUT_CODEC); SCKI1 and SCKI2 on XO_OUT; DIN on DIN_CODEC; RST on
CODEC_RST_N; VINL, VINR and VOUTL+/-, VOUTR+/-; ZEROL and ZEROR (pins 13, 14) open; DGND, SGND and the
two AGNDs on GND. Ports 3V3_CODEC, 5V_A_CODEC, BCK_CODEC, CODEC_RST_N, DIN_CODEC, DOUT_CODEC, GND,
LRCK_CODEC, VINL, VINR, VOUTL+, VOUTL-, VOUTR+, VOUTR- and XO_OUT (eleven reach one pin each: R31's,
R32's and R33's pin 2, and U9's RST, DIN, VINL, VINR and the four VOUTs). CODEC_FMT, CODEC_DEMP,
CODEC_MODE, CODEC_VCOM, BCK_PIN, LRCK_PIN and DOUT_PIN are private to the page and drawn as wire, with
no label. Two no-connects, U9's pins 13 and 14.

**The population note** (text on the page, CR-PEDAL-POPULATION class 1), verbatim:

```
Not fitted, not modelled and not drawn (CR-PEDAL-POPULATION, class 1):
- codec_mode_link: CODEC-06's 0 ohm from MODE (pin 28) to DGND, for the I2C option
- codec_demp_pullup: CODEC-09's 4.7 kohm pull-up from MD/SDA/DEMP (pin 2) to VDD, the SDA pull-up for I2C mode
- codec_scl_link: CODEC-10's 0 ohm from MC/SCL/FMT (pin 1) to EXP_I2C_SCL (contract pin 12)
- codec_sda_link: CODEC-10's 0 ohm from MD/SDA/DEMP (pin 2) to EXP_I2C_SDA (contract pin 13)
- codec_rst_pulldown: v1's R_RST_PD, 10 kohm from CODEC_RST_N to GND
CODEC-10's sheet note:
I2C mode = fit both links, fit MODE 0 Ω (CODEC-06) and remove the 220 kΩ, remove the pin-2 4.7 kΩ pull-down and fit the DNF pull-up.
```

Each part's line is its id and `what` from `NOT_FITTED_PARTS`, and the last line is
`CODEC10_SHEET_NOTE` (`circuits/h7-platform/pedal-population.ts`).
`tests/circuits/h7-pedal-codec-note.test.ts` holds the committed sheet's note to both; its control,
the expr_ref page, carries none of the lines. codec_rst_pulldown would load CODEC_RST_N, which the
codec_sup page draws; it is listed here because CR-PEDAL-POPULATION has the codec page's note list
every class 1 part.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `codec` is one of the
  pedal's blocks: the PCM3060 and its straps, decoupling and series resistors.
- [CR-PEDAL-PCM3060-VALUES](../../../docs/h7-platform/decisions.md#cr-pedal-pcm3060-values): the
  values read from CODEC-02 to CODEC-09 (the decoupling pairs, 220 kOhm, 4.7 kOhm, 4.7 kOhm).
- [D20](../../../docs/h7-platform/decisions.md#d20), [D2](../../../docs/h7-platform/decisions.md#d2):
  IFMD to VDD (CODEC-07) and MODE's 220 kOhm (CODEC-06), as the block cites them.
- [CR-PEDAL-DIGITAL-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-digital-readings): the
  33 Ohm parts between the codec's pins and the codec-side SAI nets, BCK1/BCK2 and LRCK1/LRCK2 joined
  ahead of theirs, DIN with none; the private net names; each decoupling capacitor to GND.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): BCK_CODEC, LRCK_CODEC,
  DOUT_CODEC, DIN_CODEC, VINL, VINR and VOUTL+/-, VOUTR+/-, and "Nets awaiting their other block"
  (VINL, VINR and the VOUTs, `AWAITING_NETS`, until Task 10).
- [CR-PEDAL-POPULATION](../../../docs/h7-platform/decisions.md#cr-pedal-population): the five class 1
  parts are not on the page, and the page carries the note above.
- [CR-PEDAL-SYMBOL-PCM3060](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-pcm3060): U9's
  project symbol, pin 27 `~{MS}/ADR/IFMD`, VCOM `passive`.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds) and
  [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 5V_A_CODEC,
  3V3_CODEC and GND are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; the one-block root puts the root's stub flags on 5V_A_CODEC and GND.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  3V3_CODEC (U6's OUT, a PWR_FLAG stand-in, since the sai_iso page), and three new entries, below.
- [CR-PEDAL-CODEC-VIN-AWAITING-ERC](../../../docs/h7-platform/decisions.md#cr-pedal-codec-vin-awaiting-erc),
  drafted by this task, **adopted by the controller as temporary, 2026-11-13 (d3e0e95); Task 10 removes it**: the two allowances, below.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 15 ports on the wrong net.
- Checklist items, not rulings: the schematic checklist's CODEC-02 to CODEC-12 (lines 88 to 110),
  which the block cites part by part; analog.md lines 370, 407 and 486; architecture.md line 213. The
  10 uF parts carry no MPN; a schematic needs none (G245).
- Drawing choices, not transcriptions: U9 unrotated in the middle, its west side's straps, inputs and
  SAI pins wired west and its east side's outputs east; the supply rows over U9 (3V3_CODEC west from
  VDD, 5V_A_CODEC east from VCC) with their capacitors hanging to GND runs; the three SAI pairs joined
  on three columns, LRCK nearest; a GND vertical down the west side and another down the east, joined
  by a GND row along the bottom; the population note under the band. CODEC_RST_N, which the draft drew
  no wire for, takes the CODEC family's blue (CODEC_DEMP, CODEC_FMT, CODEC_MODE and CODEC_VCOM are blue
  on the draft), and BCK_CODEC, LRCK_CODEC and DOUT_CODEC the default of BCK_PIN, LRCK_PIN and
  DOUT_PIN; the other one-pin ports the default (`codec/layout.py`, `UNDRAWN_STROKES`, says why). On
  the codec_sup page CODEC_RST_N is in the default stroke: there it shares its prefix with no other
  net. Fields, the rectangle and the note moved after the renders listed below.

### The tables and shared tools after this page

- `cross-page-drivers.ts`: **CODEC_RST_N, XO_OUT and DIN_CODEC.** Under this page's one-block root
  `kicad-cli sch erc` reported `pin_not_driven` on U9's RST (pin 15), SCKI1 (pin 6) and DIN (pin 12),
  each `input`. CODEC_RST_N is driven by U8's `~{RESET}` (pin 2, `open_collector`) on the codec_sup
  page, XO_OUT by U7's OUT (pin 3, `output`) on the codec_sup page, DIN_CODEC by U11's Y (pin 4,
  `output`) on the sai_iso page; each stand-in is a TestPoint. With them, three of the five errors are
  gone. On the codec_sup and sai_iso pages, which hold those drivers, the one-block root places no
  stand-in, and their `verify.sh` output is unchanged.
- `erc-allowances.ts` (**removed at Task 10**; see the end of this section): **two one-item allowances, CR-PEDAL-CODEC-VIN-AWAITING-ERC.** The other two
  errors, `pin_not_driven` on U9's VINL (pin 25) and VINR (pin 26), have no driver in the model: what
  drives them is in the adc_drv block, which the model holds from Task 10 (`AWAITING_NETS`). A
  cross-page driver entry is held to the model, so cannot name one. Each error is admitted as an
  allowance of one item, the pin. To hold one, the shared tools now take a one-item allowance for
  `pin_not_driven` only (`ONE_ITEM_TYPES`, `draughting/pages/erc-allowances.ts`), match exactly its one
  item (`erc_match.py`), and refuse it in `kicad-pro.ts`. Controls: `erc-control.sh` 11 to 14 (the
  page verifies with the allowances; without them it fails on exactly U9 pins 25 and 26; a VINL
  allowance on U9 pin 15, and a one-item `pin_to_pin` allowance, are refused);
  `tests/draught/erc-allowances-one-item.test.ts` (the matcher takes exactly the one pin, not pin 26,
  not a second item, not another sheet; a one-item PWR_FLAG partner is refused; and every allowance
  under the ruling names a net still in `AWAITING_NETS`, so the test fails on the change that builds
  adc_drv). Control of the guard itself (fix round 1, review M3): a scratch edit took VINL out of
  `AWAITING_NETS` and kept it a port of `h7Pedal()` (in `UNDRAWN_CONNECTOR_NETS`), so the model still
  built, as it will once adc_drv exists. The guard's case alone failed, with "VINL is no longer in
  AWAITING_NETS (circuits/h7-platform/pedal-board.ts): its driving block is built"; the test's other
  cases passed, and no model-validation error was raised. `pedal-board.ts` was restored byte for byte.
  (The first record of this control removed VINL from `AWAITING_NETS` only; that edit failed in
  `loadBoard`, on the model's own one-pin-net validation, before the guard ran, so it could not tell
  a working guard from a missing one.) The expr_ref allowance and the module's are two-item and unaffected: their replays and
  controls are unchanged.
- `pwr-flag-homes.ts` is unchanged by this page.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 13 (the model declares none) | 0; 13 |
| exported components, nets, net members | 13, 24, 52 | 13, 24, 52 |
| exported nets carrying a model net name | 11 of 24 | 15 of 24 (the fifteen ports; the other nine are the seven private nets, unlabelled, and U9's pins 13 and 14) |
| ports whose label is on the wrong net | 14 of 15 | 0 of 15 |
| ERC, the sheet alone | 19 errors (`pin_not_connected` 11, the eleven one-pin ports' pins; `pin_not_driven` 5, U9's RST, VINL, VINR, SCKI1 and DIN; `power_pin_not_driven` 3, U9's DGND, VDD and VCC), 1 warning (`lib_symbol_issues` 1, U9) | 23 errors (`pin_not_connected` 15: each hierarchical label has no parent sheet; `pin_not_driven` 5 and `power_pin_not_driven` 3, the same pins), 12 warnings (`isolated_pin_label` 11, the eleven one-pin ports' labels; `lib_symbol_issues` 1) |
| ERC under a one-block root, `/codec/` | 19 errors (2 excused: `pin_not_connected` 11, `pin_not_driven` 5, `power_pin_not_driven` 3), 3 warnings (`same_local_global_label` 3) | **2 errors, both excused by CR-PEDAL-CODEC-VIN-AWAITING-ERC (`pin_not_driven`, U9 pins 25 and 26), 0 warnings** |
| ERC under a one-block root, `/` | 24 errors (`hier_label_mismatch` 15, `label_dangling` 9), 7 warnings (`isolated_pin_label` 6, `lib_symbol_issues` 1) | 0 errors, 19 warnings (`isolated_pin_label` 18, the stub label and the sheet label of each of the nine one-pin ports with no stand-in; `lib_symbol_issues` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 10, 0 | 4, 0 |
| orphan junctions, of total | 0 of 11 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 2 | 0; 0 |
| labels | 15 on 11 nets (7 global, 8 local) | 15 on 15 nets, all hierarchical |
| paper fit (US Letter) | overshoots east by 8.213 mm | fits |
| wire groups with more than one stroke | 0 of 15 | 0 of 22 |
| symbols (parts, power symbols, PWR_FLAGs) | 13 (13, 0, 0) | 13 (13, 0, 0) |
| placed pins | 52 | 52 |
| wires, total length | 74, 1338.58 mm | 72, 1115.06 mm |
| wire corners | 16 | 13 |
| junctions | 11 | 21 |
| no-connects | 2 (U9 pins 13 and 14) | 2 (U9 pins 13 and 14) |
| text notes | 0 | 1 (the population note) |

**`pin_not_driven` 5 and `power_pin_not_driven` 3 on the sheet alone**: RST, SCKI1 and DIN, whose
drivers are on the codec_sup and sai_iso pages (TestPoint stand-ins under the one-block root); VINL
and VINR, whose driver the model does not hold (the allowances); DGND (GND's flag is on the root),
VDD (3V3_CODEC, U6's OUT on codec_sup; a PWR_FLAG stand-in) and VCC (5V_A_CODEC's flag is on the
root). Under the one-block root only VINL and VINR remain.

**`lib_symbol_issues` 1**, on U9: *"The current configuration does not include the symbol library
'h7-platform'"*. This is the pf page's U1 warning: a block page has no `.kicad_pro`, and kicad-cli
10.0.5 does not take the committed `sym-lib-table` without one. The symbol is embedded in the sheet.
No `lib_symbol_mismatch`: the `Device` symbols match their installed copies.

**`isolated_pin_label` 11**, on the sheet alone: the eleven one-pin ports' labels; each net's other
end is on another page (BCK_CODEC, LRCK_CODEC and DOUT_CODEC on sai_iso, CODEC_RST_N on codec_sup,
DIN_CODEC on sai_iso) or in a block the model does not hold yet (VINL, VINR and the VOUTs).

### Why the page has four crossings, as the layout records it

Observations, not a judgement of the page:

- **Three among the SAI pairs.** U9's west side runs, north to south, LRCK1, BCK1, SCKI1, DIN, LRCK2,
  BCK2, SCKI2, and the model joins LRCK1 to LRCK2, BCK1 to BCK2 and SCKI1 to SCKI2 on that side. Each
  pair's two pins interleave with each other pair's (L B S, then L B S), so any two of the three
  joins cross at least once on that side, three crossings in all. The page has three: BCK1's run
  over the LRCK column, SCKI1's over it, and BCK2's over the SCKI column. DIN's label sits between
  the pins and the columns, so DIN adds none.
- **One between IFMD and DEMP.** FMT (pin 1, through R29) and IFMD (pin 27) both go to 3V3_CODEC, and
  the DEMP pin between them (pin 2, through R30) goes to GND, so with VDD's rail over U9 the DEMP
  branch is enclosed by 3V3_CODEC and its way to GND crosses it once: IFMD's vertical up to the rail
  crosses DEMP's row.

### What the page shows, as observations

- U9 in the middle, unrotated, its west pins wired west and its east pins east.
- Over U9: VDD rises to the 3V3_CODEC rail, which runs west past R29 (up from the FMT row), the IFMD
  vertical, C38 and C39 to 3V3_CODEC's label, pointing west; VCC rises to the 5V_A_CODEC row, which
  runs east past C36 and C37 to its label, pointing east. The four capacitors hang down to GND runs.
- West of U9, north to south: FMT through R29 up to the rail; DEMP west to R30, which rises to the
  west GND run; IFMD west to its vertical up to the rail; RST west to CODEC_RST_N's label; MODE west to
  R28, which rises to the west GND run; VINL and VINR each to its label, pointing west.
- The SAI pairs on three columns: LRCK1 and LRCK2 join on the nearest, which rises to a row through
  R32 to LRCK_CODEC's label; BCK1 and BCK2 on the farthest, which runs west through R31 to
  BCK_CODEC's label; SCKI1 and SCKI2 on the middle one, which drops to a row west to XO_OUT's label.
  DIN runs west to DIN_CODEC's label, between U9 and the columns. Every one of these labels points
  west.
- East of U9: VOUTL+, VOUTL-, VOUTR+ and VOUTR- each east to its label, pointing east; ZEROR and ZEROL
  carry no-connects; DOUT east through R33 to DOUT_CODEC's label, pointing east; VCOM east past C40
  and C41, which hang down to the GND row.
- GND: the west run under C38 and C39 (taking R30 and R28) runs to a vertical down the west side,
  west of the labels, to the GND row along the bottom, which takes U9's four ground pins, C40 and C41
  and runs east to a vertical up to the east run under C36 and C37; GND's label at the row's west
  end, pointing west.
- The population note under the band, left-justified.
- The CODEC family (CODEC_FMT, CODEC_DEMP, CODEC_MODE, CODEC_VCOM, CODEC_RST_N) carries copperhead's
  blue; every other net its default.
- U9's Reference and Value west of its bottom, right-justified; the vertical resistors' and the
  capacitors' fields beside their bodies (R30's west, R28's west); the horizontal resistors' above
  them.
- Renders: the first had C38's and C39's fields over each other, likewise C36's and C37's and C40's
  and C41's, R28 at the west GND vertical at the end of a MODE row across the page, the note over the
  rectangle's bottom edge, and the east GND vertical well east of the labels; the capacitors were
  spread, R28 moved beside U9 rising to the west GND run, R33 and DOUT_CODEC's label moved west to the
  VOUT labels' column, the east vertical with them, and the note down.

### Task 10: VINL and VINR driven, and the allowances removed

Task 10 built `adc_drv`, so the model holds VINL's and VINR's drivers, and carried out
[CR-PEDAL-CODEC-VIN-AWAITING-ERC](../../../docs/h7-platform/decisions.md#cr-pedal-codec-vin-awaiting-erc)'s
Set by clause, recorded in
[CR-PEDAL-CODEC-VIN-AWAITING-ERC-AMENDED](../../../docs/h7-platform/decisions.md#cr-pedal-codec-vin-awaiting-erc-amended).
**No byte of this page changed.**

- `cross-page-drivers.ts` gains VINL (adc_drv R107, `r_o_l`, pin 2) and VINR (adc_drv R112, `r_o_r`,
  pin 2): R_O's end on the codec pin, passive, so each stand-in is a TestPoint. The driver check now
  resolves a resistor's `b` to `Device:R` pin 2 through PIN_NUMBERS, and takes an empty `pinName` for
  the symbol's unnamed pin; both mechanisms await the controller in that amendment.
- `erc-allowances.ts` holds the expr_ref entry alone. The one-item support is deleted from
  `draughting/pages/erc-allowances.ts`, `erc_match.py`, `erc_sheets.py`, `root_erc.py` and
  `kicad-pro.ts`, with `tests/draught/erc-allowances-one-item.test.ts` and the one-item case of
  `tests/draught/kicad-pro-refusals.test.ts`.
- `erc-control.sh` controls 11 to 14 are replaced by 11 to 13: the page at 0 errors with the two
  stand-ins; with the driver table less VINL and VINR, `/codec/` at 2 errors, `pin_not_driven` on U9
  pins 25 and 26 and nothing else; a VINL entry naming R107 pin 1 refused ("R107 pin 1 is on net
  adc_drv_ADC_OUT_L in the model, not on VINL").

Measured with `sh draughting/pages/verify.sh drafted/h7-platform/h7-pedal codec
drafted/h7-platform/h7-pedal/codec.kicad_sch` at Task 10, against the Task 9c page column above:

| measure | Task 9c | Task 10 |
| --- | --- | --- |
| sha256 | `1c17ed16...4c414588` | `1c17ed16...4c414588` (unchanged) |
| stand-in drivers under the one-block root | 3V3_CODEC (PWR_FLAG), CODEC_RST_N, XO_OUT, DIN_CODEC | the same, and VINL (for adc_drv R107 pin 2), VINR (for adc_drv R112 pin 2) |
| ERC under a one-block root, `/codec/` | 2 errors, both excused by CR-PEDAL-CODEC-VIN-AWAITING-ERC, 0 warnings | **0 errors, 0 warnings; no error excused by an allowance** |
| ERC under a one-block root, `/` | 0 errors, 19 warnings (`isolated_pin_label` 18, `lib_symbol_issues` 1) | 0 errors, 15 warnings (`isolated_pin_label` 14: the stub and sheet labels of the seven one-pin ports with no stand-in; `lib_symbol_issues` 1) |
| `verify.sh` exit | 0 | 0 |

## jacks_byp: the audio jacks and the bypass relays (Task 11a)

**Status: UNREVIEWED.** sha256 `2ad7be98ed45efb192ccd5dc4a56f892bc009c6b3c98beb4d3d3a0de7565c489`.
Render: `jacks_byp.svg` beside it.

The block: `circuits/h7-platform/pedal/jacks-byp.ts`, 18 parts. The input jacks J9 (`j_in_l`) and J10
(`j_in_r`) and the output jacks J11 (`j_out_l`) and J12 (`j_out_r`), NMJ6HCD2,
`Connector_Audio:NMJ6HCD2`, used as TS: T on IN_TIP_L, IN_TIP_R, OUT_JACK_L and OUT_JACK_R, S on
GND, J10's TN on IN_TIP_L, every other contact not connected; D12 to D15 (`d_esd_in_l`,
`d_esd_in_r`, `d_esd_out_l`, `d_esd_out_r`, PESD12VL1BA, `h7-platform:PESD12VL1BA`), pin 1 on the
four jack nets, pin 2 on GND; K1 (`k_byp_in`) and K2 (`k_byp_out`), G6K-2F-Y DC3, `Relay:G6K-2`,
coil 1 on 3V3_P, coil 8 on RELAY_DRV, COM 3 and 6 on IN_TIP_L and IN_TIP_R (K1) and OUT_JACK_L and
OUT_JACK_R (K2), NC 2 and 7 on BYP_L and BYP_R, NO 4 and 5 on FX_IN_L and FX_IN_R (K1) and FX_OUT_L
and FX_OUT_R (K2); Q10 (`q_byp`, AO3400A, `Transistor_FET:AO3400A`) drain RELAY_DRV, source GND,
gate RELAY_GATE; R125 (`r_relay_en`, 3.9 kOhm) RELAY_EN to RELAY_GATE; R126 (`r_bpd`, 15.0 kOhm)
RELAY_GATE to GND; Q11 (`q_pfg`, AO3400A) drain RELAY_GATE, gate PF_TRIP, source GND; D16 and D18
(`d_bf_in`, `d_bf_out`, 1N4148W-7-F, `Diode:1N4148W`) anode RELAY_DRV, cathode SUP_IN and SUP_OUT;
D17 and D19 (`d_bz_in`, `d_bz_out`, BZT52C12-7-F, `Device:D_Zener`) anode 3V3_P, cathode SUP_IN and
SUP_OUT. Ports 3V3_P, FX_IN_L, FX_IN_R, FX_OUT_L, FX_OUT_R, GND, PF_TRIP and RELAY_EN; six reach one
pin each (K1's and K2's pins 4 and 5, R125's pin 1 and Q11's gate). IN_TIP_L, IN_TIP_R, OUT_JACK_L,
OUT_JACK_R, BYP_L, BYP_R, RELAY_DRV, RELAY_GATE, SUP_IN and SUP_OUT are private to the page and drawn
as wire, with no label. Fifteen no-connects: every jack's R, RN and SN, J9's, J11's and J12's TN.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `jacks_byp` is one of
  the pedal's blocks: the four audio jacks, their ESD diodes and the bypass relays with their driver.
- [CR-PEDAL-ANALOG-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-analog-readings): the
  sleeves on GND; J9's TN open and only J10's normal modelled as a contact; each PESD12VL1BA's pin 1
  on its jack net, and the output diodes on OUT_JACK_x (read against analog.md line 184); the private
  names RELAY_GATE, SUP_IN and SUP_OUT; the two suppressors on the same two nets, which coil each
  sits beside being placement.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the relays and MOSFETs and
  the PESD12VL1BA are `ic`, drawn as the model has them; the jacks `switch`; the diodes `diode`,
  cathode 1, anode 2. [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match).
- [CR-PEDAL-SYMBOL-AO3400A](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a) and its
  [amendment](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-ao3400a-amended): Q10's and Q11's
  numbering, 1 G, 2 S, 3 D.
- [CR-PEDAL-SYMBOL-PESD12VL1BA](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-pesd12vl1ba):
  D12 to D15's project symbol.
- [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes): D17 and
  D19, BZT52C12-7-F, on `Device:D_Zener`.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets) and
  [CR-PEDAL-NETS-AMENDED](../../../docs/h7-platform/decisions.md#cr-pedal-nets-amended): FX_IN_x,
  FX_OUT_x, RELAY_EN, PF_TRIP and 3V3_P as shared nets; IN_TIP_L private to this block.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_P and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; the one-block root puts the root's stub flag on GND.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  PF_TRIP, driven by U2's 1Y on the pf page (the entry since Task 7b), a TestPoint stand-in under the
  one-block root.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 8 ports on the wrong net.
- Sources, not rulings: schematic-checklist.md AIO-01 and AIO-18 to AIO-21 (lines 151, 168 to 171),
  bypass-relay.md lines 90 to 102, 112 to 115 and 242 to 246, parts.md lines 107, 122 to 125 and 133,
  which the block cites part by part.
- Drawing choices, not transcriptions: the page reads west to east along the audio path, the right
  channel above the left as the relays' pin order puts it once they are turned; K1 turned 90 and
  mirrored left to right and K2 turned 90, so their NC, NO and coil-1 pins face each other across a
  gap and BYP_R, BYP_L and the 3V3_P row run straight across it; J9 mirrored top to bottom, J12
  mirrored left to right and J11 turned 180, so each lower jack's sleeve is at its bottom and each
  jack's pins face the relays; the suppressors hang from the 3V3_P row to the RELAY_DRV row under the
  relays, which runs from K1's coil 8 at the west to K2's at the east; the driver under that row, Q10
  upright; GND along the bottom, with a vertical down each outer edge from a short row over each upper
  jack (that run is what reaches J10's and J12's sleeves, at the top of their bodies, without crossing
  their tips). FX_IN_x, FX_OUT_x and PF_TRIP, which the draft drew no wire for, take the default
  stroke, RELAY_EN the RELAY family's (210 120 0) (`jacks_byp/layout.py`, `UNDRAWN_STROKES`, says why).
  Q10's fields moved after the first render (below).

### The tables after this page

Unchanged. `verify.sh` read 6 flag homes, 9 cross-page drivers and 1 ERC allowance. The page's
PF_TRIP is met by the existing entry (pf U2 1Y); 3V3_P reaches only passive pins here (the relay
coils' pin 1 and the Zeners' anodes, `passive` in `Relay:G6K-2` and `Device:D_Zener`), so it needs no
driver or flag for this page's own sheet to clear; and no allowance is used.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 18 (the model declares none) | 0; 18 |
| exported components, nets, net members | 18, 33, 66 | 18, 33, 66 |
| exported nets carrying a model net name | 12 of 33 | 8 of 33 (the eight ports; the other 25 are the ten private nets, unlabelled, and the fifteen no-connect pins) |
| ports whose label is on the wrong net | 7 of 8 | 0 of 8 |
| ERC, the sheet alone | 7 errors (`pin_not_connected` 6, K1 pins 4 and 5, K2 pins 4 and 5, R125 pin 1, Q11 pin 1; `pin_not_driven` 1, Q11's gate), 12 warnings (`lib_symbol_issues` 4, `lib_symbol_mismatch` 8) | 9 errors (`pin_not_connected` 8: each hierarchical label has no parent sheet; `pin_not_driven` 1, Q11's gate), 18 warnings (`isolated_pin_label` 6, the six one-pin ports' labels; `lib_symbol_issues` 4; `lib_symbol_mismatch` 8) |
| ERC under a one-block root, `/jacks_byp/` | 7 errors (`pin_not_connected` 6, `pin_not_driven` 1), 1 warning (`same_local_global_label` 1) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 14 errors (`hier_label_mismatch` 8, `label_dangling` 6), 14 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 4, `lib_symbol_mismatch` 8) | 1 error (`label_dangling` 1, the 3V3_P stub's label, alone with one block; `erc_sheets.py` admits it), 22 warnings (`isolated_pin_label` 10, the stub and sheet labels of the five one-pin ports with no stand-in, FX_IN_L, FX_IN_R, FX_OUT_L, FX_OUT_R and RELAY_EN; `lib_symbol_issues` 4; `lib_symbol_mismatch` 8) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 6, 0 | 0, 0 |
| orphan junctions, of total | 0 of 5 | 0 of 23 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 34 on 12 nets (27 global, 7 local) | 8 on 8 nets, all hierarchical |
| paper fit (US Letter) | overshoots east by 3.133 mm | fits |
| wire groups with more than one stroke | 0 of 34 | 0 of 18 |
| symbols (parts, power symbols, PWR_FLAGs) | 18 (18, 0, 0) | 18 (18, 0, 0) |
| placed pins | 66 | 66 |
| wires, total length | 64, 372.11 mm | 70, 1266.19 mm |
| wire corners | 9 | 17 |
| junctions | 5 | 23 |
| no-connects | 15 | 15 |

The selftest ran first on both: 10 controls, every one moved or fired.

**`pin_not_driven` 1 on the sheet alone**: Q11's gate (pin 1, `input`) on PF_TRIP, whose driver is U2's
1Y on the pf page; under the one-block root its TestPoint stand-in clears it.

**`lib_symbol_issues` 4**, on D12 to D15: *"The current configuration does not include the symbol
library 'h7-platform'"*, the pf page's U1 warning: a block page has no `.kicad_pro`, and kicad-cli
10.0.5 does not take the committed `sym-lib-table` without one. The symbol is embedded in the sheet.

**`lib_symbol_mismatch` 8**: J9 to J12 (*"Symbol 'NMJ6HCD2' doesn't match copy in library
'Connector_Audio'"*), Q10 and Q11 (*"Symbol 'AO3400A' doesn't match copy in library
'Transistor_FET'"*), and D16 and D18 (*"Symbol '1N4148W' doesn't match copy in library 'Diode'"*).
Each is an `extends` symbol whose embedded copy is its parent flattened. NMJ6HCD2 is measured on the
expr_ref page (J4) and AO3400A on the modsw page (Q2, Q3), the same embedded copies. 1N4148W, new on
this page, measured the same way (`jacks_byp.kicad_sch` line 645 against the installed library):

| | D16, D18 embedded (sheet line 645) | `1N4148W` installed (`Diode.kicad_sym` line 1235) |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "1N4001")` (parent at line 495): fields only |
| pins | 1 K passive, 2 A passive: identical to the parent's | the parent's |
| Value | `1N4001` (the parent's) | `1N4148W` |
| Footprint | `Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal` (the parent's) | `Diode_SMD:D_SOD-123` |
| Datasheet | `http://www.vishay.com/docs/88503/1n4001.pdf` (the parent's) | `https://www.vishay.com/docs/85748/1n4148w.pdf` |
| Description | "50V 1A General Purpose Rectifier Diode, DO-41" (the parent's) | "75V 0.15A Fast Switching Diode, SOD-123" |

The instances' own Values on the page are `1N4148W-7-F`. **Not an electrical fault**: the model
comparison is 0, 0, 0, 0. **Trap for a later output**: an export reading the library fields gets a
1N4001 in DO-41 for D16 and D18. `Relay:G6K-2` and `Device:D_Zener` have no `extends`, and their
embedded copies match the installed ones (fields and pins, `Relay.kicad_sym` line 31222,
`Device.kicad_sym` line 41579): no warning on K1, K2, D17 or D19.

**`isolated_pin_label` 6**, on the sheet alone: the six one-pin ports' labels; each net's other end is
on another page (FX_IN_x on in_fe, FX_OUT_x on out, PF_TRIP on pf, RELAY_EN on interface).

### Why the page has no crossing, as the layout records it

Observations, not a judgement of the page: with K1 and K2 turned so that their NC, NO and coil-1 pins
face each other in the same order, BYP_R, BYP_L and 3V3_P each run straight from K1 to K2 and the
four NO pins end at labels in the gap; each jack's T sits on its relay's COM row or turns to it
without passing another net's pin; the sleeve runs of J10 and J12, at the top of their bodies, leave
over their bodies to the outer GND verticals rather than across their tips.

### What the page shows, as observations

- The input jacks at the west, J10 over J9, pins facing east; the output jacks at the east, J12 over
  J11, pins facing west. J10's T runs straight east past D13 to K1's COM 6; K2's COM 6 straight east
  past D15 to J12's T. J10's TN and J9's T join on a vertical that runs east past D12 to K1's COM 3;
  K2's COM 3 runs east past D14 and down to J11's T. The unused contacts carry no-connects.
- K1 and K2 in the middle, bodies upright, their NC, NO and coil-1 pins facing each other. Across the
  gap, north to south: FX_IN_R's label (pointing east) and FX_OUT_R's (pointing west), BYP_R, FX_IN_L's
  and FX_OUT_L's labels, BYP_L, and the 3V3_P row from coil 1 to coil 1.
- D17 and D16 hang from the 3V3_P row beside K1, D19 and D18 beside K2, onto the RELAY_DRV row under
  the relays; 3V3_P's label hangs from the row between them, pointing down. The RELAY_DRV row runs from
  K1's coil 8 (down the west side of K1) to K2's coil 8 (down the east side of K2).
- Under the RELAY_DRV row: Q10 upright, its drain on the row; its gate row runs west past R126 (down
  to GND), Q11's drain and R125, whose far end runs west to RELAY_EN's label; Q11's gate runs west to
  PF_TRIP's label. Both labels point west.
- GND: a row along the bottom from GND's label at the west (pointing west), taking J9's sleeve, D12,
  Q11, R126, Q10, D14 and J11's sleeve; a vertical up each outer edge of the page to a short row over
  each upper jack, which takes that jack's sleeve and D13 or D15.
- The ESD diodes' fields east of their bodies; the suppressors' toward the middle of the gap; the
  relays' above their bodies; the jacks' under theirs; R125's Reference above it and Value below.
- Renders: the first had Q10's fields 3.81 mm east of its origin, over its drain's pin number; they
  moved to 6.35 mm.

## in_fe: the input front ends (Task 11a)

**Status: UNREVIEWED.** sha256 `37049f7c8c5bb7894936c2ae6df4e62d10ef8aceaa6d7e939ad224e11bb196d2`.
Render: `in_fe.svg` beside it.

The block: `circuits/h7-platform/pedal/in-fe.ts`, 23 parts. Per channel, left then right: R95 and
R99 (`r_rf_x`, 1.0 kOhm) from FX_IN_x to IN_RF_x; on IN_RF_x, C62 and C66 (`c_rf_x`, 100 pF) and R96
and R100 (`r_pd_x`, 22 MOhm) to GND, and the input pads TP7 and TP9 (`tp_in_x`); C63 and C67
(`c_in_x`, 47 nF) from IN_RF_x to IN_AC_x; R97 and R101 (`r_div1_x`, 1.50 MOhm) from IN_AC_x to
IN_T_x, with C64 and C68 (`c_comp_x`, 110 pF) across them; R98 and R102 (`r_div2_x`, 1.00 MOhm) from
IN_T_x to VMID_x; C65 and C69 (`c_t_x`, 160 pF) from IN_T_x to GND; the GND pads TP8 and TP10
(`tp_in_x_gnd`). U17 (`u_in`, OPA1688, `h7-platform:OPA1688xD`, three units): unit A the left
follower, unit B the right (+IN on IN_T_x, OUT and -IN on IN_FOLLOW_x), unit C V+ on VIN_A and V- on
GND, with C70 (`c_uin_hf`, 100 nF) and C71 (`c_uin_bulk`, 10 uF) from VIN_A to GND. Ports FX_IN_L,
FX_IN_R, GND, IN_FOLLOW_L, IN_FOLLOW_R, VIN_A, VMID_L and VMID_R; four reach one pin each (R95's and
R99's pin 1, R98's and R102's pin 2). IN_RF_x, IN_AC_x and IN_T_x are private to the page and drawn as
wire, with no label. No no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `in_fe` is one of the
  pedal's blocks: each channel from the input relay's NO contact to its follower.
- [CR-PEDAL-ANALOG-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-analog-readings): the
  private names IN_AC_x and IN_T_x (the documents' "node T"); the input test pads and their GND pads
  drawn on this page.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): the input pad on
  IN_RF_x and the GND pad beside it, each a `Connector:TestPoint`.
- [CR-PEDAL-SYMBOL-OPA1688](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-opa1688): U17's
  project symbol, numbered unit by unit from `part.symbolPins` (A 1 OUT, 2 -IN, 3 +IN; B 5 +IN, 6
  -IN, 7 OUT; C 8 V+, 4 V-).
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds) (the OPA1688 `opamp`) and
  [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match).
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): FX_IN_x, IN_FOLLOW_x and
  VMID_x as shared nets.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VIN_A and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; VIN_A's and GND's flags are homed on the root (Tasks 7c and 7b), and the one-block root
  puts them on its stubs, which clears U17's V+ and V-.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 8 ports on the wrong net.
- Sources, not rulings: schematic-checklist.md AIO-02 to AIO-07 (lines 152 to 157), PWR-11 (line
  132), line 149 (A = L, B = R); analog.md lines 124 to 126, 163, 167, 168 and 172; parts.md lines 57
  and 105, which the block cites part by part.
- Drawing choices, not transcriptions: two channel rows, left above right, read west to east from
  FX_IN_x's label to IN_FOLLOW_x's; one GND row between them, the left channel's shunt parts hanging
  down to it and the right channel's rising to it (the right channel's C_RF, R_PD and C_T 100 mil east
  of the left's, so no point on the row takes four wires); each C_COMP on a loop beside its R_DIV1, on
  the side away from the GND row; each R_DIV2's far end west to VMID_x's label; U17's units at
  rotation 0 (`page.place_ops` refuses a turned or mirrored unit), each follower loop under its body;
  the supply unit and its two capacitors east of the outputs, between a VIN_A row and the GND row.
  FX_IN_x and VMID_x, which the draft drew no wire for, take the default stroke (`in_fe/layout.py`,
  `UNDRAWN_STROKES`, says why). Fields and the supply section moved after the renders listed below.

### The tables after this page

Unchanged. `verify.sh` read 6 flag homes, 9 cross-page drivers and 1 ERC allowance. No pin on this
page needs a cross-page driver: the only `input` pins, U17's +IN and -IN, sit on IN_T_x and
IN_FOLLOW_x, which the page's own parts drive (`R_DIV1`'s and `R_DIV2`'s passive pins, U17's OUT). No
allowance is used.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 23 (the model declares none) | 0; 23 |
| exported components, nets, net members | 23, 14, 48 | 23, 14, 48 |
| exported nets carrying a model net name | 10 of 14 | 8 of 14 (the eight ports; the other six are the six private nets, unlabelled) |
| ports whose label is on the wrong net | 5 of 8 | 0 of 8 |
| ERC, the sheet alone | 6 errors (`pin_not_connected` 4, R95 pin 1, R99 pin 1, R98 pin 2, R102 pin 2; `power_pin_not_driven` 2, U17's V+ and V-), 3 warnings (`lib_symbol_issues` 3) | 10 errors (`pin_not_connected` 8: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, U17's V+ and V-), 7 warnings (`isolated_pin_label` 4, the four one-pin ports' labels; `lib_symbol_issues` 3) |
| ERC under a one-block root, `/in_fe/` | 6 errors (`pin_not_connected` 4, `power_pin_not_driven` 2), 1 warning (`same_local_global_label` 1) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 14 errors (`hier_label_mismatch` 8, `label_dangling` 6), 5 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 3) | 2 errors (`label_dangling` 2, the IN_FOLLOW_L and IN_FOLLOW_R stubs' labels, alone with one block; `erc_sheets.py` admits them), 11 warnings (`isolated_pin_label` 8, the stub and sheet labels of the four one-pin ports; `lib_symbol_issues` 3) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 1, 2 | 0, 0 |
| orphan junctions, of total | 0 of 7 | 0 of 28 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 2; 0 | 0; 0 |
| labels | 24 on 10 nets (19 global, 5 local) | 8 on 8 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 24 | 0 of 14 |
| symbols (part instances, power symbols, PWR_FLAGs) | 25 (25: 23 parts, U17 in three units; 0, 0) | 25 (25, 0, 0) |
| placed pins | 48 | 48 |
| wires, total length | 79, 581.66 mm | 68, 640.08 mm |
| wire corners | 31 | 11 |
| junctions | 7 | 28 |
| no-connects | 0 | 0 |

The selftest ran first on both: 10 controls, every one moved or fired.

**`power_pin_not_driven` 2 on the sheet alone**: U17's V+ (pin 8, VIN_A) and V- (pin 4, GND), both
`power_in`; VIN_A's and GND's flags are on the root, and under the one-block root the stubs' flags
clear both.

**`lib_symbol_issues` 3**, on U17's three units: *"The current configuration does not include the
symbol library 'h7-platform'"*, the pf page's U1 warning: a block page has no `.kicad_pro`, and
kicad-cli 10.0.5 does not take the committed `sym-lib-table` without one. The symbol is embedded in the
sheet. No `lib_symbol_mismatch`: `Device:R`, `Device:C` and `Connector:TestPoint` match their installed
copies.

**`isolated_pin_label` 4**, on the sheet alone: the four one-pin ports' labels; FX_IN_x's other end is
on jacks_byp (K1's NO pins) and VMID_x's on ldo_vmid (U5's outputs).

### Why the page has no crossing, as the layout records it

Observations, not a judgement of the page: each channel's nets follow one another along its row, so
no net has to pass another to reach its next part; the shunt parts of both channels meet one GND row
from opposite sides; each C_COMP's loop and each follower loop lies on the side of its row away from
that GND row; VMID_x leaves R_DIV2's far end on the GND row's side of the channel row, west, in a span
no other wire uses.

### What the page shows, as observations

- The left channel's row, west to east: FX_IN_L's label (pointing west), R95, the IN_RF_L node with
  TP7 rising from it and C62 and R96 hanging to the GND row, C63, the IN_AC_L node, R97 with C64 on a
  loop above it, the IN_T_L node with R98 (its foot west to VMID_L's label, pointing west) and C65
  (down to the GND row), and U17A's +IN. U17A's OUT runs east to IN_FOLLOW_L's label (pointing east)
  and loops under the body into -IN.
- The right channel's row the same, below the GND row: TP9 hangs below it, C66, R100, R102 and C69
  rise from it (R102's top west to VMID_R's label), C68's loop is below R101, U17B's loop under its
  body.
- The GND row between the channels, from GND's label at the west (pointing west), past TP8 (its circle
  up) and TP10 (its circle down), the six shunt drops, U17C's V- and C70 and C71, which hang from the
  VIN_A row; VIN_A's label at that row's east end, pointing east.
- IN_RF_x, IN_AC_x, IN_T_x and IN_FOLLOW_x carry copperhead's blue; GND, VIN_A, FX_IN_x and VMID_x
  the default.
- The horizontal parts' fields over the left row and under the right row (R97's and R101's on the side
  facing their C_COMP); the hanging parts' east of their bodies; U17A's and U17B's centred above the
  body; U17C's, C70's and C71's east of their bodies.
- Renders: the first had the horizontal capacitors' fields on their plates, TP10's Reference on the
  GND row, TP8's Value beside GND's label and U17C's fields over C70; the capacitors' fields moved
  0.889 mm out, TP8's and TP10's 1.27 mm off the row, and C70, C71 and VIN_A's label 400 mil east. The
  second had TP7's Value on the IN_RF_L row; TP7's fields moved 1.27 mm up.

## adc_drv: the ADC drivers (Task 11a)

**Status: UNREVIEWED.** sha256 `7b35259f9717da2d34344fb030f0ba8d46db3c6001b41a04aa9c092a49da5079`.
Render: `adc_drv.svg` beside it.

The block: `circuits/h7-platform/pedal/adc-drv.ts`, 21 parts. Per channel, left then right: C72 and
C76 (`c_ac_x`, 22 uF, `Device:C_Polarized`, + on IN_FOLLOW_x) to ADC_AC_x; R103 and R108 (`r_in_x`,
10.0 kOhm) to ADC_INV_x; R104 and R109 (`r_fa_x`, 10.0 kOhm) and C73 and C77 (`c_fa_x`, 47 pF) from
ADC_INV_x to ADC_OUT_x; R105 and R110 (`r_vbias_top_x`, 2.00 kOhm) from 5V_A to VBIAS_x; R106 and R111
(`r_vbias_bot_x`, 2.00 kOhm) and C74 and C78 (`c_vbias_x`, 10 uF) from VBIAS_x to GND; R107 and R112
(`r_o_x`, 100 Ohm) from ADC_OUT_x to VINL or VINR; C75 and C79 (`c_vin_x`, 2.2 nF) from VINx to GND.
U18 (`u_adc`, OPA1688, `h7-platform:OPA1688xD`, three units): unit A the left stage, unit B the right
(+IN on VBIAS_x, -IN on ADC_INV_x, OUT on ADC_OUT_x), unit C V+ on 5V_A and V- on GND, with C80
(`c_uadc_hf`, 100 nF) and C81 (`c_uadc_bulk`, 10 uF). Ports 5V_A, GND, IN_FOLLOW_L, IN_FOLLOW_R, VINL
and VINR; two reach one pin each (C72's and C76's pin 1). ADC_AC_x, ADC_INV_x, ADC_OUT_x and VBIAS_x
are private to the page and drawn as wire, with no label. No no-connects.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `adc_drv` is one of the
  pedal's blocks: each channel from its follower's output to the codec's analog input.
- [CR-PEDAL-ANALOG-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-analog-readings): the
  private names ADC_AC_x, ADC_INV_x and ADC_OUT_x; each VBIAS_x capacitor to GND; U18's 10 uF as
  parts.md's op-amp decoupling part although on 5V_A; R_O modelled, AIO-11 read against AIO-12.
- [CR-PEDAL-SYMBOL-OPA1688](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-opa1688): U18's
  project symbol, numbered unit by unit (A 1 OUT, 2 -IN, 3 +IN; B 5 +IN, 6 -IN, 7 OUT; C 8 V+, 4 V-).
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds) and
  [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match).
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): IN_FOLLOW_x, VINL and VINR as
  shared nets.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 5V_A and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page; GND's flag is on the root.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  5V_A, driven by U4's OUT on the ldo_vmid page (`power_out`), a PWR_FLAG stand-in under the one-block
  root, which clears U18's V+. This page holds the drivers the VINL and VINR entries name
  ([CR-PEDAL-CODEC-VIN-AWAITING-ERC-AMENDED](../../../docs/h7-platform/decisions.md#cr-pedal-codec-vin-awaiting-erc-amended)):
  R107 pin 2 on VINL and R112 pin 2 on VINR, which the model comparison confirms; under this page's own
  root no stand-in is placed for them, since adc_drv is the driving block. Those entries certify
  connectivity, not drive; whether the assembled root clears the codec's VINL and VINR with R107 and
  R112 is the root's check (`root-drivers.ts`, Task 11b).
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 6 ports on the wrong net.
- Sources, not rulings: schematic-checklist.md AIO-08 to AIO-12 (lines 158 to 162), PWR-11 (line
  132), line 149 (A = L, B = R); analog.md lines 159 and 176; parts.md lines 57, 105 and 108, which the
  block cites part by part.
- Drawing choices, not transcriptions: two bands, the left channel above the right, each read west to
  east from IN_FOLLOW_x's label to VINx's; each band's 5V_A and GND rows above it, R_VBIAS_TOP hanging
  from the 5V_A row west of where the GND row starts, R_VBIAS_BOT, C_VBIAS and C_VIN rising to the GND
  row; the feedback under each unit, R_FA's loop and C_FA's below it; U18's units at rotation 0, as
  `page.place_ops` requires; the supply unit and its capacitors between the upper band's rows, east of
  the outputs; the two 5V_A rows joined by a vertical down the west edge, the two GND rows by one down
  the east edge (`adc_drv/layout.py` says why the rails are above each band). IN_FOLLOW_x, which the
  draft drew no wire for, takes the default stroke (`UNDRAWN_STROKES` says why). The supply section
  moved after the first render (below).

### The tables after this page

Unchanged. `verify.sh` read 6 flag homes, 9 cross-page drivers and 1 ERC allowance; the page uses the
5V_A entry and no allowance. The VINL and VINR entries (Task 10) are checked against the model on
every run (`tables.ts`), and this page draws the pins they name on those nets.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as this page leaves them. The draft columns were measured on the draft
copied beside the committed `sym-lib-table`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 21 (the model declares none) | 0; 21 |
| exported components, nets, net members | 21, 14, 48 | 21, 14, 48 |
| exported nets carrying a model net name | 12 of 14 | 6 of 14 (the six ports; the other eight are the eight private nets, unlabelled) |
| ports whose label is on the wrong net | 4 of 6 | 0 of 6 |
| ERC, the sheet alone | 4 errors (`pin_not_connected` 2, C72 pin 1 and C76 pin 1; `power_pin_not_driven` 2, U18's V+ and V-), 3 warnings (`lib_symbol_issues` 3) | 8 errors (`pin_not_connected` 6: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, U18's V+ and V-), 5 warnings (`isolated_pin_label` 2, IN_FOLLOW_L's and IN_FOLLOW_R's labels; `lib_symbol_issues` 3) |
| ERC under a one-block root, `/adc_drv/` | 4 errors (`pin_not_connected` 2, `power_pin_not_driven` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 10 errors (`hier_label_mismatch` 6, `label_dangling` 4), 5 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 3) | 2 errors (`label_dangling` 2, the VINL and VINR stubs' labels, alone with one block; `erc_sheets.py` admits them), 7 warnings (`isolated_pin_label` 4, the stub and sheet labels of IN_FOLLOW_L and IN_FOLLOW_R; `lib_symbol_issues` 3) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 10 | 0 of 26 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 25 on 12 nets (17 global, 8 local) | 6 on 6 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 25 | 0 of 14 |
| symbols (part instances, power symbols, PWR_FLAGs) | 23 (23: 21 parts, U18 in three units; 0, 0) | 23 (23, 0, 0) |
| placed pins | 48 | 48 |
| wires, total length | 75, 580.39 mm | 74, 1280.16 mm |
| wire corners | 16 | 12 |
| junctions | 10 | 26 |
| no-connects | 0 | 0 |

The selftest ran first on both: 10 controls, every one moved or fired.

**`power_pin_not_driven` 2 on the sheet alone**: U18's V+ (pin 8, 5V_A) and V- (pin 4, GND), both
`power_in`; under the one-block root 5V_A's PWR_FLAG stand-in (for U4's OUT) and GND's stub flag clear
both.

**`lib_symbol_issues` 3**, on U18's three units: *"The current configuration does not include the
symbol library 'h7-platform'"*, the pf page's U1 warning (no `.kicad_pro` beside a block page). The
symbol is embedded in the sheet. No `lib_symbol_mismatch`: `Device:R`, `Device:C` and
`Device:C_Polarized` match their installed copies.

**`isolated_pin_label` 2**, on the sheet alone: IN_FOLLOW_L's and IN_FOLLOW_R's labels; each net's
other end is on in_fe (U17's outputs).

### Why the page has no crossing, as the layout records it

Observations, not a judgement of the page: on each unit's west side +IN (VBIAS_x) is over -IN (the
input row), so both ends of the bias divider are drawn above VBIAS_x, where no signal wire runs, and
the GND row starts east of R_VBIAS_TOP's drop to the 5V_A row; the feedback loops lie under the unit,
on the side away from the rails; C_VIN rises from VINx into the empty span between the output row and
the GND row; the two bands' rails meet on verticals at the page's west and east edges, beyond the
input and VIN labels.

### What the page shows, as observations

- Each band, west to east: IN_FOLLOW_x's label (pointing west), C_AC with its + terminal west, R_IN,
  the ADC_INV_x node into U18's -IN; from the node, a vertical down to R_FA's loop and C_FA's loop
  under the unit, both returning up a vertical east of U18's OUT; OUT east through R_O, past C_VIN
  (rising to the GND row), to VINx's label (pointing east).
- Over each band: the 5V_A row; R_VBIAS_TOP hanging from it and dropping to the VBIAS_x row, which runs
  east past R_VBIAS_BOT and C_VBIAS (both rising to the band's GND row) into U18's +IN.
- The upper band's 5V_A row runs east past U18C's V+, C80 and C81 to 5V_A's label (pointing east); its
  GND row east past U18C's V-, C80 and C81 to a vertical down the east edge to the lower band's GND row,
  which ends at GND's label (pointing east). A vertical down the west edge joins the two 5V_A rows.
- The VBIAS nets carry copperhead's purple, the ADC nets its blue; 5V_A, GND, VINx and IN_FOLLOW_x the
  default.
- The horizontal parts' fields above them, C_FA's below its loop; the vertical parts' east of their
  bodies; U18A's and U18B's centred above the body; U18C's east of its body.
- Renders: the first had U18C's fields over C80; C80, C81, the east GND vertical and both rail labels
  moved 400 mil east.
