# Corroborated component values

Values from Ian Thompson-Bell's *Pultec 3 Band EQ Documentation*
(`P3bandDoc.pdf`), checked position-by-position against the netlist extracted
from `pultec-three-band-eq.kicad_sch` at `c0f6f39`. See
[README.md](README.md) for the source hierarchy.

"Position" is the selector-terminal pin the capacitor's far end lands on, read
directly from the netlist. `‖` marks two capacitors on the same position.

## Low boost / low cut

Doc page 4, "Pultec Lo Boost/Cut". The doc notes these frequencies are the same
as in the PMEQP1A.

| Freq | Cboost (doc) | Netlist | | Ccut (doc) | Netlist | |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | 330n | C18 330n | ok | 18n | C1 18n | ok |
| 30 | 220n | C19 220n | ok | 10n | C2 10n | ok |
| 60 | 120n | C20 120n | ok | 4n7 + 1n | C3 4.7n ‖ C7 1n | ok |
| 100 | 68n | C21 68n | ok | 3n3 | C4 3n3 | ok |
| 150 | 47n | C22 47n | ok | 2n2 | C5 2n2 | ok |
| 200 | 33n | C23 33n | ok | 1n8 | C6 1n8 | ok |

Low boost capacitors return to GND; low cut capacitors sit between the
`/HI BOOST OUT` node and the `Lo Cut Sel Snd` terminal.

## Hi boost / hi cut

Doc page 2, "Pultec Hi Boost/Cut". The doc gives two mutually exclusive builds:
`Cboost` with the VTB9042 inductor fitted, or `Cpoorboost` with the inductor and
HiQ pot pins shorted out. **This design uses the `Cboost` set**, so it is the
inductive build. That matters for the Qmax resistor — see unresolved item 2.

| Freq | Lboost (doc) | Cboost (doc) | Netlist | | Ccut (doc) | Netlist | |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3K | 0.6H | 4n7 | C14 4n7 | ok | 47n + 33n | C24 47n ‖ C30 33n | ok |
| 4K | 0.3H | 4n7 + 470pF | C15 4n7 ‖ C2a2 470pF | ok | 47n + 10n | C25 47n ‖ C31 10n | ok |
| 5K | 0.3H | 3n3 | C16 3n3 | ok | 47n | C26 47n | ok |
| 8K | 0.2H | 1n + 1n | C17 1nF ‖ C4a2 1nF | ok | 22n + 10n | C27 22n ‖ C32 10n | ok |
| 10K | 0.1H | 1n + 1n5 | C34 1nF ‖ C5a2 1n5 | ok | 22n + 2n2 | C28 22n ‖ C33 2n2 | ok |
| 16K | 0.1H | 1n | C35 1nF | ok | 15n | C29 15n | ok |

The `pultec-boost-high` breakout board exposes taps at 600mH, 300mH, 200mH and
100mH — the four distinct values in the `Lboost` column.

For reference, the unused poor-man's column is `Cpoorboost`: 15n+1n, 10n+2n2,
10n, 4n7+1n, 4n7, 1n+1n5.

## Mid boost / cut

Doc page 3, "Pultec Mid Boost/Cut": eleven frequencies, same as the Pultec MEQ5,
using a VTB9050 inductor. The KiCad schematic implements a **six-position
subset** with placeholder values (`Mid C1A` … `Mid C6B`), so which six of these
eleven are fitted is unresolved — see unresolved item 3.

| Freq | L | C |
| --- | --- | --- |
| 200 | 2H | 330n |
| 300 | 2H | 150n |
| 500 | 2H | 47n |
| 700 | 2H | 22n + 3n3 |
| 1K | 1H | 22n + 3n3 |
| 1K5 | 1H | 12n |
| 2K | 0.45H | 12n + 2n2 |
| 3K | 0.45H | 4n7 + 1n5 |
| 4K | 0.22H | 4n7 + 2n2 |
| 5K | 0.22H | 4n7 |
| 7K | 0.1H | 2n2 + 1n |

## Resistors

| Ref | Netlist | Function | Doc |
| --- | --- | --- | --- |
| R1 | 430R | Hi cut series | 430 on the doc's schematic |
| R2 | 56K | Lo boost / lo cut | 56K on the doc's schematic |
| R3 | 4K7 | Qmax, hi boost | **disputed** — see unresolved item 2 |

## Potentiometers

Read from the doc's hand-drawn master schematic (page 5). These are front-panel
parts and appear in the KiCad schematic only as 3-pin screw terminals, so the
netlist neither confirms nor contradicts them.

| Control | Value | Taper |
| --- | --- | --- |
| Lo cut | 470K | LOG |
| Lo boost | 47K | LOG |
| Mid boost/cut | 47K | LOG |
| Hi boost | 47K | LIN |
| Qmax / HiQ | 10K | LIN |
| Hi cut | see unresolved item 4 | |

The KiCad schematic corroborates the mid pot independently: terminal J29 is
labelled "Mid Lvl (47 Log)".

No log-taper curve constant is stated anywhere, which the simulation model
requires — see unresolved item 5.

## Loading

The doc states the output "should be loaded with not less than 470K". This is
the load model the AC harness needs as an explicit input.

## Discrete inductor specification

Nine discrete inductors replace the two tapped coils, one per tap position, on
the section boards (`modules/pultec-hi-boost/`, `modules/pultec-mid/`). See
`docs/superpowers/specs/2026-09-20-discrete-inductors-design.md` for the full
design rationale; the specification and measurement tables below are
reproduced from that document verbatim, as the place someone selecting parts
will look.

**These numbers come from the validated model, not from a datasheet.** No
physical part has been measured against them — that is a separate question
from unresolved item 1, "as-built hardware is not captured".

**Reproducing them needs one setting these tables do not state.** "High boost
at 5kHz, boost above flat" leaves the Q control's position open, and the
figures move with it. An independent check reproduced both DCR columns, and the
tolerance table's ratios to within 3%, at a Q setting of roughly 0.55–0.6; the
exact position used originally was not recorded. Anyone re-deriving these should
expect to sweep Q to land on the same curve, and no committed script regenerates
the tables — worth writing before the numbers are relied on for a purchase.

| Section | Values | Tolerance | DCR | Current |
| --- | --- | --- | --- | --- |
| High boost | 0.6, 0.3, 0.2, 0.1 H | ±20% | ≤1kΩ, ≤500Ω preferred | Line level |
| Mid | 2, 1, 0.45, 0.22, 0.1 H | ±20% | ≤1kΩ, ≤500Ω preferred | Line level |

Nine parts. Anything meeting the spec qualifies: a catalogue inductor, a
pot-core part, or a small transformer winding with the other side left open.

### Where those numbers come from

Both limits were measured against the validated model rather than assumed, and
both are looser than the usual instinct for inductor-based EQ.

**DCR barely matters.** Q in these sections is set by the deliberate damping —
Qmax and the mid's boost-return resistor — not by the coil. Coil losses are
small against the 4.7kΩ already in the loop. High boost at 5kHz, boost above
flat:

| Coil DCR | Qmax 4K7 | Qmax 470R |
| --- | --- | --- |
| 0Ω | +15.5 dB, Q≈1.1 | +20.6 dB, Q≈2.3 |
| 250Ω | +15.3 dB | +20.2 dB, Q≈2.1 |
| 500Ω | +15.1 dB | +19.8 dB, Q≈2.0 |
| 1kΩ | +14.8 dB | +19.0 dB, Q≈1.8 |
| 2kΩ | +14.1 dB | +17.8 dB, Q≈1.6 |

The centre frequency does not move at any value. This is what removes the need
for thick-wire, low-DCR, physically large coils — most of what makes audio
inductors expensive.

Both Qmax columns are shown because which value is actually fitted is
unresolved — see unresolved item 2.

**Tolerance barely matters either**, because the curves are broad by design.
Worst-case deviation anywhere in 1k–20kHz, high boost at 5kHz:

| L tolerance | Worst-case error |
| --- | --- |
| ±10% | 0.80 dB |
| ±20% | 1.67 dB |
| ±30% | 2.62 dB |
| ±50% | 4.87 dB |

±20% is under 2 dB. Standard parts are ±10% or ±20%, so tolerance is not a
selection criterion.
