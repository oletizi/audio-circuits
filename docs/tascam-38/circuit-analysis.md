# Tascam 38 REC/PLAY AMPL card - circuit analysis

**Status:** Pass 3 (functional blocks) complete to the limit of the amplifier
sheet. Pass 4 (operating-mode table) and Pass 5 (audit) not yet done. This is
an analysis of the existing card, not a replacement design, and nothing here
is a basis for powering a replacement card.

**Authority:** `sources/tascam-38-amplifier-schematic.pdf`, channel-1 card
drawing. Card contacts are as in `interface-matrix.csv` (38 VERIFIED, 12
UNRESOLVED). The per-block reports with drawing coordinates for every claim
are in `analysis/`:

| Block | Report |
| --- | --- |
| Reproduce, source selection, output, meter feed | `analysis/block-reproduce-output.md` |
| Sync pickup, K101/K103 head switching, K103 drive | `analysis/block-sync-headswitch.md` |
| Line input, record amplifier, bias, erase, meter amplifier | `analysis/block-record-bias-erase.md` |
| Relay coils, mutes, selection-gate drive, FUNCTION override | `analysis/block-control-muting.md` |

Each report separates what the drawing shows from interpretation. This
summary keeps that separation: statements marked *interpretation* are
reasoning from the traced topology, not printed facts.

## Devices

From the parts table on the sheet (around (1980-2900, 1150-1640)):

| Ref | Part | Type / role |
| --- | --- | --- |
| U101 | JRC-4558D-D | dual op-amp: reproduce/sync preamp (1/2), line amplifier (2/2) |
| U102 | RC-4558T1 | dual op-amp: input buffer (1/2), record amplifier (2/2) |
| U103 | listed only as "BIAS AMPL" | bias / erase amplifier; no part number or internals on this sheet |
| Q101, Q103, Q105, Q106, Q107, Q110 | 2SK68AM | N-channel JFET switches |
| Q108, Q111, Q118, Q120 | 2SC1684S | NPN |
| Q109, Q112 | 2SA733P | PNP |
| Q119 | 2SC1318S | NPN (bias enable) |
| D110, D111 | 1N60 | meter rectifier |
| K101, K102, K103 | - | relays; K102 drawn as a reed contact |

## Block diagram

```mermaid
flowchart LR
  RH[Repro head<br/>J101-3/4] --> K101
  SH[Sync/record head<br/>J106-7/8] --> K103U[K103 upper set]
  K103U -- sync throw --> K101
  K101 --> PRE[TR101 + U101 1/2<br/>preamp, EQ via Q101/Q103]
  PRE --> PM[Q107 PLAY MUTE shunt]
  PM --> R120[R120 trim] --> Q105[Q105 REPRO]
  PM --> R122[R122 trim] --> Q106[Q106 SYNC]
  IN[Line input J106-1] --> BUF[U102 1/2 buffer]
  BUF --> R156[R156 trim] --> Q110[Q110 INPUT]
  Q105 --> SEL((select node))
  Q106 --> SEL
  Q110 --> SEL
  SEL --> LA[U101 2/2 line amp] --> K102[K102 output relay] --> OUT[Line out J102-2]
  K102 --> J1025[J102-5 to J105-1<br/>motherboard link] --> MET[Q111/Q112 meter amp<br/>D110/D111] --> VU[J105-7 VU meter]
  BUF --> RA[U102 2/2 record amp<br/>pre-emphasis] --> K103U
  OSC[Master osc J108-4] --> U103[U103 bias amp] -- C134 bias --> SH
  U103 -- L108 --> EH[Erase head J108-2/3]
  EH --> K103L[K103 lower set] --> J1081[J108-1]
```

## Functional blocks

### Reproduce and sync preamp (shared)

- The reproduce head reaches the card on J101-4 (one lead, to K101's fixed
  contact) and J101-3 (other lead, card common bus). The sync head on P151
  reaches it on J106-7 (to K103's upper moving contact) and J106-8 (common
  bus).
- **There is one preamp for both heads.** K101's moving contact feeds
  L101 1.2mH / C101 // C136 470p, then TR101, R101 10, R102 220k, into
  U101 1/2 pin 5. K101 selects between J101-4 (reproduce head) and a line
  from K103's upper fixed contact (sync path).
- U101 1/2 feedback: (R104 470k // C103 0.012) in series with (R106 33k //
  C104 270p // [R107 1.5k + switched branches]); shunt leg R103 330 + C102
  100u. The switched branches are R108 5k + Q101 (gated from J103-4, REPRO
  line) and R110 5k + Q103 (gated from J103-2, SYNC line) - separate EQ trims
  for reproduce and sync. *Interpretation:* reproduce equalisation set by
  the 470k // 0.012 network, with mode-specific mid/high correction.
- Output: R112 1k, L107/C137//C138 trap, C105 10u, Q107 PLAY MUTE shunt,
  then R120 10k (REPRO level, to Q105) and R122 10k (SYNC level, to Q106).

### Source selection and line output

- Q105 (REPRO), Q106 (SYNC) and Q110 (INPUT) are N-JFETs whose outputs join
  at (6543, 1109). INPUT comes from the U102 1/2 input buffer via C120 and
  the R156 20k trim.
- After selection: W109, W110, R113 1k / R114 10k, U101 2/2 (non-inverting,
  gain about 11 from R116 22k / R115 2.2k), R117 1k, C106 2.2u, R118 100k,
  L102 trap, then K102's contact to J102-2 (line output P131-1) and J102-5.
- J102-5 returns over the motherboard U-link to J105-1, so **the meter
  feed is taken after K102**: R119 56k, R141 50k meter trim, W112, C109,
  R142, into the Q111/Q112 meter amplifier, then C112 / R149, D110 clamp and
  D111 rectifier into C114, giving a positive DC level on J105-7 (VU meter
  P176-1).

### Record amplifier

- J106-1 (line input P141-1) through R160 27k (R161 22k to bus) into U102 1/2,
  a unity-gain follower. Its output (node A via C120) feeds the INPUT monitor
  tap (R202 / R156 / R157) and the record path.
- Record level: R165 12k to the R176 10k trim; wiper to U102 2/2.
- U102 2/2 feedback R179 39k + (R180 15k // C125 0.47u), shunt R178 4.7k,
  plus a series-resonant branch L103 2.4mH (adjustable) / R183 1k / C127
  0.0039 near 52 kHz with nominal values. *Interpretation:* record treble
  pre-emphasis.
- Output C126, R181 1.5k // C140 0.0027, test point TP1, then the
  L105 3mH // C131 390p trap (near 147 kHz nominal) to node N_REC, which is
  K103's upper lower-throw. *Interpretation:* the trap keeps bias out of the
  record amplifier.

### Bias and erase

- J108-4 (master oscillator P182-8, annotated AC10V) drives U103 pin 3.
  U103 runs from +B (pin 7) and -B (pin 1); its output node is annotated
  AC65V (pin 5), with L106 1.3mH (adjustable) across pins 5/6 and W132 to
  pin 4.
- **Bias injection:** AC65V node through the C134 100p trimmer onto the
  head-side lead J106-7 at (6620, 1930), not through K103. C134 sets bias.
- **Erase:** AC65V node through L108 (no value printed) to J108-2; return on
  J108-3 through K103's lower contact to J108-1 / U103 pin 6. No separate
  erase-current trim.
- **Bias enable:** U103 pin 2 through R198 8.2 to Q119 (emitter on -15V),
  driven by Q118 from J107-7 (FUNCTION) through D115 / R191 with a C132 10u
  delay (about 0.15 s). J107-7 high enables bias.

### Head switching (K103) and its drive

- K103 upper set: moving contact J106-7 (head). Throws: N_REC (record
  drive), which it is drawn resting on, and a line to K101's sync-side fixed
  contact.
- K103 lower set: moving contact J108-1. Throws: J108-3 (erase return),
  which it is drawn resting on, and the TP1 record-output node.
- Coil: J107-2 (24V) to Q120 collector, D114 across it; Q120 (NPN) emitter
  J107-1 (0V), base from J107-7 via D117 / R200 / R201 with R199 / C135.
  **K103 is energised when J107-7 is high.**

### Control inputs and muting

All polarities below come from traced diode orientation and device type, not
from signal names.

| Input (card contact, motherboard) | Element | Traced behaviour |
| --- | --- | --- |
| J101-2 (P180-2), J101-1 (0V) | K101 coil | energised when P180-2 is driven positive; OUT SELECT Q204 (PNP) sources it |
| J102-4 (P180-3), J102-3 (P171-3 POWER MUTE) | K102 coil | energised only when P180-3 is at 24V **and** POWER MUTE sinks current; open or high POWER MUTE keeps the output open |
| J104-1 (P171-6 PLAY MUTE) | Q107 shunt | passes when J104-1 is held negative (annotated -6.8V); at 0V or open Q107 conducts and mutes the SYNC/REPRO line. INPUT is not on this line |
| J103-6 (P181-3) | Q105 REPRO gate | Q105 on when P181-3 is at 24V; R125 to -15V holds it off otherwise |
| J104-5 (P181-2) | Q106 SYNC gate | Q106 on when P181-2 is at 24V and Q108 is off |
| J104-4 (P181-1), Q109 | Q110 INPUT gate | Q110 on when P181-1 is driven or Q109 conducts |
| J103-4 (P181-3), J103-2 (P181-2) | Q101 / Q103 EQ branches | each on when its line is at 24V |
| J104-3 (P174-1 FUNCTION) | Q108, then Q109 | Q108 on forces SYNC off (clamps via D108) and turns on Q109 (emitter fed from J104-2 / P180-4), forcing INPUT on. D109 / C119 hold Q108 on briefly after FUNCTION drops |
| J107-7 (P174-1 FUNCTION) | Q120 -> K103; Q118 / Q119 -> U103 | FUNCTION high energises K103 and enables bias |

*Interpretation:* J104-3 and J107-7 are the same motherboard net (P174-1),
so one FUNCTION line per channel switches the head to record drive, turns on
bias and erase, and forces the monitor to INPUT. That reads as the channel's
record-arm-and-record state; Pass 4 must confirm it against the FUNCTION and
transport circuitry.

From the OUT SELECT board (outside the card): the REPRO lower pole is a
changeover from 24V (J180-1) that at OFF feeds P180-4 (which supplies the
INPUT and SYNC poles and the Q109 emitter) and at ON feeds P181-3. Pressing
REPRO therefore also removes the INPUT/SYNC supply and the Q109 override.

## Relay drawn state

The sheet does not mark relay states. The printed operating voltages show the
K101 and K103 coils energised and the selection nodes in the INPUT-selected
state (SYNC pressed, FUNCTION high). *Interpretation:* the sheet appears to
draw K101 and K103 in their **energised** positions, matching the printed
state - K103 energised puts the head on record drive and closes the erase
loop; K101 energised selects the sync line. On that reading K101 released
selects the reproduce head, and K103 released connects the head to the sync
line and puts J108-1 on TP1. This is not established by the drawing and is
the first item for a bench check.

## Open items

| ID | Item | Location / evidence | What resolves it |
| --- | --- | --- | --- |
| A1 | Which relay position is energised for K101 and K103 (see above) | block-sync-headswitch.md U1; block-control-muting.md | Continuity check across each relay with its coil driven and undriven |
| A2 | What drives POWER MUTE and PLAY MUTE, and why PLAY MUTE is annotated -6.8V | P171-3 / P171-6 leave this sheet | Trace on the transport sheet (power supply / control PCB) |
| A3 | Q118 base annotated -14.4V (bias off) while J107-7 is annotated 24V (bias on) | block-record-bias-erase.md | Probably measured in different modes; confirm by measurement |
| A4 | U103 internals and part number not on this sheet | parts table lists "BIAS AMPL" only | Service manual or physical part |
| A5 | L108 value not printed; bias frequency not on this sheet | block-record-bias-erase.md | Service manual; master oscillator sheet |
| A6 | Whether -5.2V / -6.2V gate bias fully pinches off a 2SK68AM (M grade) | block-control-muting.md | 2SK68A datasheet pinch-off range |
| A7 | R139 printed "68" (ohms, or a missing k) | block-control-muting.md | Physical part or parts list |
| A8 | W119 drawn faint and broken (fitted or not); W109 / W110 / W112 fitted | block-record-bias-erase.md, block-reproduce-output.md | Physical card |
| A9 | U101 / U102 input polarity (no +/- marks drawn) | block-reproduce-output.md | 4558 pinout |
| A10 | J108-1 to 0V (matrix C17) decides whether the released K103 grounds the record output | interface-matrix.csv | Continuity P108-1 to P171-7 |
| A11 | OUT SELECT upper-pole network that decides when the K101 / K102 drivers turn on | block-control-muting.md | Trace the OUT SELECT board fully (Pass 4) |
