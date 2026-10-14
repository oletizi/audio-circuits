# Pass 6 - datasheet research for open items A6, A9, M1, the switching transistors and U103

Method: web search, then download the documents themselves and read them
(text extraction where the PDF has a text layer, visual reading of scanned pages
where it does not). Every fact below names the document it was read from. Where
only secondary sources (cross-reference tables, distributor listings) were
available, that is said. Forum posts are flagged as forum posts and are not
used as evidence for any conclusion.

The most useful source turned out to be the Tascam 38 Operation and Maintenance
manual's own parts lists, reached via ManualsLib's page images:
https://www.manualslib.com/manual/1008533/Tascam-38.html
(page images at `https://static-data2.manualslib.com//pdf5/101/10086/1008533-tascam/images/38_<N>_bg.jpg`;
ManualsLib page index N runs a few pages ahead of the printed page number).

## Parts-list facts from the Tascam 38 manual (they bear on several questions)

REC/REP AMPL. PCB ASSY parts list, printed page 87 (ManualsLib page 91):

- `U101  5147028000  JRC-4558D-D`
- `U102  5220406700  RC4558`
- `U103  5292210600  BIAS Ampl. Module`
- `Q101, Q103  5145103000  FET, 2SK-68AM`; `Q105~Q107  5145103000  FET, 2SK-68AM`; `Q110  5145103000  FET, 2SK-68AM`
- `Q119  5042625000  2SC-1318S`
- `Q108, Q111, Q118, Q120  2SC-1684S`; `Q109, Q112  2SA-733P`

CONTROL PCB ASSY parts list, printed page 85 (ManualsLib page 89):

- `U519  5147047000  M54410P`
- `Q535  5145043000  2SA720Q`
- also `U501~U504 SN7400N`, `U505 SN7474N`, `U506~U514 SN7400N`, `U515~U517 uPC393C`, `U518 LM2902`

So the manufacturer's parts list confirms all the FETs are the M rank, gives
U103 as a module, and names U519 as **M54410P** (not H54410P) - see M1.

## A6 - 2SK68A, rank M

**Maker: NEC.** Primary datasheet found: NEC "N-CHANNEL JUNCTION FIELD-EFFECT
TRANSISTOR 2SK68A", NEC Electron Device data-book pages 15-17, scanned copy at
https://www.datasheetarchive.com/datasheet/9e40800e30dfbfe3?term=2sk68a
(read visually; it is a scan with no text layer).

Lines read from it:

- Description: "The 2SK68A is designed for use in driver stage of AF low noise amplifier."
- Absolute maximum ratings: "VGDO Gate to Drain Voltage ... -50 V"; "VGSO Gate to Source Voltage ... -50 V"; "VDSX* Drain to Source Voltage ... 50 V" (*VGS = -2.0 V); "ID Drain Current ... 20 mA"; "IG Gate Current ... 10 mA"; total power dissipation 250 mW.
- Electrical characteristics (Ta = 25 C):
  - "IDSS Zero-Gate Voltage Drain Current  0.5 (min)  3.0 (typ)  12 (max) mA  VDS=10V, VGS=0"
  - "VGS(off) Gate to Source Cutoff Voltage  -0.13 (min)  -0.5 (typ)  -1.5 (max) V  VDS=10V, ID=10uA"
  - "IGSS Gate Cutoff Current  -1.0 (max) nA  VGS=-20V, VDS=0"
- Classification of IDSS (test condition VDS = 10 V, VGS = 0):
  `K 0.5-1.5   L 1.0-3.0   M 2.0-6.0   N 4.0-12` (mA)
- Package: "1. DRAIN 2. GATE 3. SOURCE", EIAJ SC-43, JEDEC TO-92.

**So for the M rank: IDSS = 2.0 to 6.0 mA.** NEC does not give VGS(off) per
rank; the only VGS(off) specification is the part-wide -0.13 V to -1.5 V
(at ID = 10 uA). The datasheet's "gate to source cutoff voltage vs. zero-gate
voltage drain current" graph shows |VGS(off)| rising with IDSS, so an M part
sits in the middle of that range, but the guaranteed worst case to design
against is -1.5 V.

Corroboration (secondary, consistent with NEC): a Japanese FET specification
table (pages 30-31 of an unidentified data book, downloaded from
https://www.datasheetarchive.com/datasheet/89c9000cbb1b7fe6?term=2sk68a)
lists 2SK68A, NEC, "LF LN A", VGDO -50, IDSS 0.5m-12m at VDS 10, VGS(off)
-0.13 to -1.5 at VDS 10 / ID 10 uA. The American Microsemiconductor
distributor listing https://www.americanmicrosemi.com/?p=53313 gives the same
figures (VGS(off) min .13, max 1.5 V at ID 10 u; IDSS 500u to 12m). A
D.A.T.A.-style cross-reference table (k68 shortform, datasheetarchive) printed
"4/12mA" against every rank - that table is garbled and should not be used.

**Is a gate at -5.2 V to -6.2 V beyond worst-case VGS(off)?** Yes, with margin.
With source and drain at 0 V, VGS = -5.2 V is 3.7 V beyond the -1.5 V
worst-case cutoff (about 3.5 times it), and -6.2 V is 4.7 V beyond it. The
reverse bias is far below the -50 V VGSO/VGDO ratings, and gate leakage is
guaranteed below 1 nA even at -20 V.

One caveat the analysis should state: the -1.5 V is a cutoff relative to the
more negative channel terminal. Because the source and drain carry audio, the
switch stays off only while both stay above (gate voltage + 1.5 V). That is
signal peaks down to about -3.7 V with the gate at -5.2 V, or about -4.7 V
with it at -6.2 V. For signal levels near the 38's nominal -10 dBV (0.3 V)
and its +18 dBV (8.0 V rms) maximum line input, a node that carries the
largest signals could cross that limit at the bottom of the swing. Whether any
JFET node actually swings that far is a question for the circuit analysis, not
for the datasheet. (Spec figures are from the 38 manual's specification page,
see U103.)

## A9 - 4558 dual op-amp pinout

**NJM4558 (New Japan Radio / JRC)**, datasheet "NJM4558/4559 DUAL OPERATIONAL
AMPLIFIER", Ver.2013-11-05, copy hosted at
https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/697/NJM4558_59_11-0-13.pdf
(text extracted). PIN FUNCTION, which covers NJM4558D (DIP8):

`1. A OUTPUT  2. A -INPUT  3. A +INPUT  4. V-  5. B +INPUT  6. B -INPUT  7. B OUTPUT  8. V+`

Absolute maximum supply voltage: "Supply Voltage V+/V- +-18 V".

**RC4558 (Texas Instruments)**, datasheet SLOS073H (March 1976, revised
October 2024), https://www.ti.com/lit/ds/symlink/rc4558.pdf (text
extracted), Table 4-1 Pin Functions: `1OUT 1, 1IN- 2, 1IN+ 3, VCC- 4, 2IN+ 5,
2IN- 6, 2OUT 7, VCC+ 8` - the same pinout. Supply ratings are VCC+ 18 V and
VCC- -18 V.

The 38 parts list gives U101 = JRC-4558D-D and U102 = RC4558 (maker not
stated), so both datasheets apply.

Consistency with the traced circuit:

- "U101 1/2", input on pin 5, feedback to pin 6, output pin 7: pin 5 is
  +IN B (non-inverting), pin 6 is -IN B (inverting), pin 7 is OUT B.
  Consistent: signal into the non-inverting input, feedback to the inverting
  input, and the output is pin 7.
- "U101 2/2", input on pin 3, feedback to pin 2: pin 3 is +IN A
  (non-inverting), pin 2 is -IN A (inverting), so the output is **pin 1** (OUT A).
- The schematic's "1/2" is the datasheet's section B and "2/2" is section A.
  That is a labelling difference, not an inconsistency.
- U102 pin 4 = V- at -14.2 V and pin 8 = V+ at +13.7 V: consistent with the
  pinout. The supply span (27.9 V total) is inside the +-18 V rating.
- Both stages take their input on the non-inverting pin, so both are
  non-inverting configurations (assuming no other input path into pins 2 or 6
  that the trace did not show).

## M1 - U519 "H54410P" transport logic

**The part is Mitsubishi M54410P, not a Hitachi custom part.** The 38 manual's
CONTROL PCB ASSY parts list reads `U519 5147047000 M54410P` (printed page 85,
ManualsLib page 89). "H54410P" looks like a misreading of the printed "M".

Primary datasheet: Mitsubishi (DGTL LOGIC) "M54410P KEY CONTROLLER FOR TAPE
DECK", data-book pages 2-49 to 2-52, scanned copy at
https://www.datasheetarchive.com/datasheet/M54410P/Mitsubishi?term=m54410p&version=1
(read visually). Radiomuseum also lists the M54410 as "Tape Deck Key
Controller, TTL compatible", DIP-16, Vcc 5 V, Icc ~54 mA:
https://radiomuseum.org/tubes/tube_m54410.html

Pin configuration (top view), as read from the datasheet:

| Pin | Name | Dir | Pin | Name | Dir |
| --- | --- | --- | --- | --- | --- |
| 1 | PLAY (active low) | in | 16 | Vcc | |
| 2 | STOP (active low) | in | 15 | OFF | out |
| 3 | FF (active low) | in | 14 | OFAST | out |
| 4 | MEMO (active low) | in | 13 | ORW | out |
| 5 | RW (active low) | in | 12 | OPLAY | out |
| 6 | PAUSE (active low) | in | 11 | OPAUSE | out |
| 7 | REC (active low) | in | 10 | OREC | out |
| 8 | GND | | 9 | AR (active low, record prevention) | in |

This matches the 38 schematic labels the analysis already traced: U519 pin 12
"PLAY OUT", pin 10 "REC OUT" and pin 11 "PAUSE OUT" fall on OPLAY, OREC and
OPAUSE.

Function and polarity, from the datasheet's PIN NAMES AND FUNCTIONS table:

- OPLAY: "Output pin that goes high in the PLAY mode"
- OREC: "Output pin that goes high in the REC/PLAY or REC/PAUSE mode"
- OPAUSE: "Output pin that goes high in the PAUSE mode"
- REC input: "effective only when it is set to low together with PLAY"
- PLAY input: "when set to low together with REC, recording starts"
- Inputs are active low ("the desired tape mode is controlled by setting these
  input pins momentarily to low") and have built-in pull-ups. The output
  equivalent circuit is an NPN to ground with a 1.5 kohm pull-up to Vcc, so
  outputs can be wired-AND or drive a transistor directly.
- Power-on: "all the outputs are set to low and the STOP mode is established."
- Supply: Vcc 4.5-5.5 V (5 V typical), abs. max 7 V; VOH min 2.9 V (typ 4.3 V)
  at IOH = -0.4 mA; IOH (VO = 0.9 V) min -1.6 mA, typ -2.6 mA.

"Operations with each input" truth table (outputs OFAST / OFF / ORW / OREC /
OPAUSE / OPLAY):

- STOP: L L L L L L
- FF: H H L L L L
- RW: H L H L L L
- PLAY: L L L L L H
- PAUSE: L L L L H L
- REC/PLAY: L L L H L H
- REC/PAUSE: L L L H H L

This settles the analysis's open items:

- U1: PLAY OUT is active high (H in PLAY and REC/PLAY), and REC OUT is
  active high (H in REC/PLAY and REC/PAUSE).
- U3: in PAUSE the chip drops PLAY OUT low and raises PAUSE OUT. In
  REC/PAUSE, REC OUT stays high, PAUSE OUT is high and PLAY OUT is low.
- U7 (partly): the AR input (pin 9) is the chip's own record inhibit. Note 5
  says: "When AR is low, the OREC output is not set to high. Should the AR be
  low when the OREC output is high, the OREC output is set to low." MEMO
  (pin 4) does the same to ORW.

What the 38's own wiring does to pins 4 and 9 still has to come from the
schematic.

## Switching transistors - 2SC1318 and 2SA720

The 38 parts lists fit Q119 = 2SC-1318S (amplifier PCB) and Q535 = 2SA720Q
(control PCB). The letter suffix is the hFE rank.

**2SC1318 (NPN).** Datasheet "Transistors 2SC1317, 2SC1318, Silicon NPN
epitaxial planer type, For low-frequency power amplification and driver
amplification, Complementary to 2SA719 and 2SA720", copy hosted at
https://www.phippselectronics.com/wp-content/uploads/2022/07/2SC1317.pdf
(text extracted). The page layout is Panasonic/Matsushita's, and the PDF
author field reads "MEC", but the extracted text never names the maker, so
calling it Panasonic is an attribution, not a quotation. Datasheet aggregators
list 2SC1318 under Panasonic.

- Absolute maximum ratings (Ta = 25 C) for 2SC1318: VCBO 60 V, **VCEO 50 V**,
  VEBO 7 V, ICP 1 A, **IC 500 mA**, PC 625 mW, Tj 150 C.
- hFE1 at VCE = 10 V, IC = 150 mA: 85-340 overall. By rank: Q 85-170,
  R 120-240, **S 170-340**.
- VCE(sat) at IC = 300 mA, IB = 30 mA: 0.35 V typ, 0.6 V max. fT 200 MHz typ.
  Pinout (TO-92): 1 Emitter, 2 Collector, 3 Base (E-C-B).

**2SA720 (PNP).** I did not obtain the original Panasonic sheet: alldatasheet's
"PANASONIC/2SA720" page returned HTTP 403. What I did read is a second-source
datasheet, "2SA719/2SA720(PNP) TO-92 Bipolar Transistors" (LGE/Luguang
format), at https://static.chipdip.ru/lib/435/DOC042435807.pdf (text
extracted):

- Features: "For low-frequency power amplification and driver amplification".
- Maximum ratings (TA = 25 C) for 2SA720: VCBO -60 V, **VCEO -50 V**,
  VEBO -5 V, **IC -500 mA continuous**, PC 625 mW, TJ 150 C.
- Pinout: 1 EMITTER, 2 COLLECTOR, 3 BASE.
- The Panasonic 2SC1317/2SC1318 sheet above independently confirms 2SA720 is
  the complement of 2SC1318.

I did not read this second-source sheet's hFE rank table, so I have no
figure for the Q rank. If the rank matters, by analogy with the complement it
is probably 85-170 - but that is inference, not a datasheet line.

## U103 "BIAS AMPL" and the bias frequency

**U103 is a module, not an IC.** The 38 parts list (REC/REP AMPL PCB, printed
page 87) reads `U103 5292210600 BIAS Ampl. Module`. TEAC gives only its
internal part number; no IC type is named. The circuit description calls it a
unit too. Section 1-16-2 "Bias and record control circuit", printed pages
50-51 (ManualsLib pages 51-52):

> "On the other hand, when Q119 goes on, bias oscillator amplifier unit U103
> starts to amplify the bias signal supplied from master bias oscillator U301
> and the amplified output is supplied to both the record and erase heads."

Fig. 1-16(A) on the same page draws "BIAS AMP U103" (pins 1-6 shown, +15 V on
the top) fed from "U301 MASTER BIAS OSC" (pins 1, 3, 4, 6, +15 V and -15 V),
with C134 and L108 on the head side. Fig. 1-16(B), "Record Circuit Switching
Timing Diagram", shows the bias envelope ramping up over 90 ms, starting
80 ms after REC ON, and ramping down over 70 ms, starting 40 ms after REC OFF.
It shows the REC relay pulling in 40 ms after REC ON and dropping out 200 ms
after REC OFF, and OUTPUT switching SYNC to INPUT 20 ms after REC ON and back
400 ms after REC OFF. The text says those timings "depend on the values of
C132, C135 and C119".

**Bias frequency: 150 kHz.** The 38 manual's "SPECIFICATIONS OF THE 38",
printed page 25 (ManualsLib page 26), under ELECTRICAL reads
"Bias Frequency: 150 kHz". The same page gives nominal line input -10 dBV
(0.3 V) and maximum +18 dBV (8.0 V), and record level calibration of "0 VU
reference; 250 nWb/m". Radiomuseum agrees: "Bias frequency: 150 kHz"
(https://www.radiomuseum.org/r/teac_8_track_recorderreproducer_tascam_38.html).
So does a forum user's scope observation of "the 150 kHz bias signal" at
TP1 (https://www.tascamforums.com/threads/no-erase-record-on-chan-3-tascam-38.9137) -
both secondary; the manual line is the evidence.

What I did not find: anything that identifies the contents of the
5292210600 module (no schematic of its inside in the manual pages I viewed).
The repository's own block-record-bias-erase.md already notes the sheet has no
internal drawing of U103.

## Where I looked without success

- 2SK68A: datasheetcatalog.com (DNS failure), alldatasheet (403),
  alltransistors (403), diyaudio threads (browser challenge), Wayback
  (offline). Several of the datasheetarchive results for 2SK68A were unrelated
  pages (NEC uPD1937C, other FET tables).
- 2SA720 Panasonic original: alldatasheet (403).
- Tascam manual: hifiengine (needs login), ManualsLib HTML pages (Cloudflare
  for curl; their page images loaded and are what is quoted above).
