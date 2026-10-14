# Tascam 38 trace reports

Per-contact trace reports behind `docs/tascam-38/interface-matrix.csv`. Each
matrix row's evidence columns cite a report here and the coordinates in it.

## Reproducing a cited location

Every coordinate is a full-resolution pixel `(x, y)` on a 300 dpi render of
`docs/tascam-38/sources/tascam-38-amplifier-schematic.pdf`, which is
9000 x 5250 px. The reports call that render `scratchpad/amp/full-1.png` and
their crops `scratchpad/agent-*/`; those were working files and are not
committed. Recreate them with:

```
pdftoppm -r 300 -png docs/tascam-38/sources/tascam-38-amplifier-schematic.pdf full
python3 tools/tascam-38/crop.py full-1.png X0 Y0 X1 Y1 out.png WIDTH GRID
```

`crop.py` takes a box in full-resolution pixels; `WIDTH / (X1 - X0)` is the
zoom, and `GRID` draws labelled lines every that many pixels.

## Drawing conventions the reports rely on

- Each J10x box has one more cell than contacts; one cell is empty. A
  contact is the notch on the side of its printed number nearest the empty
  cell. J101, J103, J104, J106, J107, J108 have the empty cell at the left;
  J105 has it at the right. J102 follows the left-end reading.
- A filled dot is a junction. A crossing without a dot is not a connection.
- Italic voltage annotations ("24V", "-15V", "13.7V") are printed DC values at
  a node, in the same hand as the sheet's measured-voltage notes. They are not
  rail names, and two lines both annotated "-15V" may be different nodes.

## Reports

| Report | Contacts | Pass |
| --- | --- | --- |
| `pass1-j101-j103.md` | J101-1..4, J103-1..6 | 1, card side |
| `pass1-j106-j108.md` | J106-1..8, J108-1..4 | 1, card side |
| `pass1-j107-j104.md` | J107-1..7, J104-1..7 | 1, card side |
| `pass1-j102-j105.md` | J102-1..7, J105-1..7 | 1, card side |
| `pass2-p101-p103.md` | P101-1..4, P103-1..6 | 2, motherboard side |
| `pass2-p106-p108.md` | P106-1..8, P108-1..4 | 2, motherboard side |
| `pass2-p107-p104.md` | P107-1..7, P104-1..7 | 2, motherboard side |
| `pass2-p102-p105.md` | P102-1..7, P105-1..7 | 2, motherboard side |

| `retrace-j101-j102.md` | J101, J102 both sides | independent blind re-trace |
| `retrace-j103-j104.md` | J103, J104 both sides | independent blind re-trace |
| `retrace-j105-j106.md` | J105, J106 both sides | independent blind re-trace |
| `retrace-j107-j108.md` | J107, J108 both sides | independent blind re-trace |

The Pass 1 and Pass 2 reports cite `scratchpad/agent*/` crops; recreate them
as above.

## How a row became VERIFIED

The `retrace-*` reports were written by four further agents working under
`retrace-protocol.md`, which forbade them to read the Pass 1/2 reports, the
matrix or the owner's worksheet, and required them to establish the
connector-numbering convention for themselves. They were also grouped
differently from the Pass 1/2 agents. A row is `VERIFIED` only where the
re-trace reached the same card-side node and the same motherboard endpoint as
the first trace. Where the two agree that a contact has no wire, the row stays
`UNRESOLVED`: absence on the drawing is not a verified no-connect.
