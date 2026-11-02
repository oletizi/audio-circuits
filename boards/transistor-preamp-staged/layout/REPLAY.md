# Replaying the fixed-stage-one layout

**What this is.** The record of how
`boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt` was
re-placed when stage 1 became three fixed resistors, per
`docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md`. It
is committed the way a drawing repair is (`TOOLING.md` step 5.5): the commands
and the one input they read sit beside the layout, and replaying them reaches
the committed board byte for byte.

| | sha256 |
| --- | --- |
| end: the committed `.vrt` | `4e579f9872a0d844972f843562051f7afffadc7f21ed853d2c8bfe5ad6d2ebb9` |

There is no start sha256. The replay does not edit the previous board: it
builds a fresh one from the circuit's own netlist export, so its only inputs are
the circuit model (through `export-net.ts`) and `layout.txt`.

## Replay

From anywhere in the repository, with a new or empty work directory
(`replay.sh` refuses a non-empty one, and stops non-zero naming the step when
any step cannot run):

```
sh boards/transistor-preamp-staged/layout/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. `bun export-net.ts` - the board's netlist export, through
   `tools/perfboard/check.ts`'s `exportNetlistFor`, the same lowering `make
   check` compares the board against.
2. `veroroute --import <net> -o imported.vrt --strips horizontal` - a fresh
   board holding exactly the netlist's thirty parts, every one where the
   importer puts it.
3. `veroroute --materialize imported.vrt --layout layout.txt -o staged.vrt` -
   every part to the holes `layout.txt` names, the two wire links, and the
   copper of each strip.
4. `veroroute --check staged.vrt --netlist <net>` - every net complete.
5. The sha256 of `staged.vrt` must be the end value above, and so must the
   committed board's.

Toolchain: the VeroRoute fork at the commit `veroroute.pin` pins (the script
refuses a binary whose `.built-commit` disagrees; `make veroroute` builds it),
bun. Replayed on 2026-11-02 at fork commit
`9d35333ca782d0e0ffd5e5b15578f2da66c4a564` and reached the end sha256; the
import and the materialize are both byte-deterministic (two runs, equal
hashes), and the export's `created` timestamp does not reach the `.vrt`.

Then, to look at it:

```
sh boards/transistor-preamp-staged/layout/render.sh
```

which runs `make guide` and rasterizes the guide's two layout drawings into the
`.png` renders beside the board.

## The files

| file | what it is |
| --- | --- |
| `layout.txt` | the `--materialize` document: `GRID`, `STRIPS`, a `PIN` statement for every lead of every part, the two `WIRE`s, and one `COPPER` run per used strip, painted from its first contact to its last and anchored to a pin on it |
| `export-net.ts` | prints the board's netlist export on stdout |
| `replay.sh` | the five steps above |
| `render.sh` | regenerates the two `.png` renders from `make guide`'s drawings |

## How the layout was decided

The buffer (Q2 and around it, strips AB to AI), J2, J3 and the RV6 and RV7
headers keep the holes they had in `60ded02`'s layout. Stage 2 (Q3 and around
it), J1 and the RV5 header keep their columns and move up one strip, for the
reason below; the parts named below also change column.

- **Stage 1 is three strips and no wires.** Q1 stands in column 11 across
  strips N (emitter), O (base) and P (collector), directly above the input
  strip Q and the ground strip R. Every stage-1 part bridges between those five
  strips: R1 820k P-O (stood on end), R2 270k O-R, R4 1.5k N-R, C1 220uF N-R,
  C2 10uF O-Q, C3 10uF P-T (to DRIVE_TOP), and R3 2.7k P-AC (to VCC, the same
  thirteen-hole run R3 had before). The old stage 1 needed twelve strips, two
  wire links and three solder bridges.
- **Stage 2 moved up one strip, and Q3 turned over.** C7, the 470uF D10 can,
  had its leads three steps apart (rows 21 and 24) in `60ded02`'s layout. The
  pinned fork cannot give that part a three-step lead span: `StretchRadial` moves its second lead
  to the last column on the first grow, so its spans are 2, 4, 5, 6 ... steps
  (measured: `--stretch --direction grow` three times from the import gives
  lead holes 29-31, then 29-33, 29-34, 29-35),
  and `--materialize`'s length derivation (which assumes one step per grow)
  reaches none of the larger ones for this part. C7 is therefore at its native
  two-step span, which needs the emitter strip two strips from CHARACTER_CAP:
  Q3 now has its collector on strip U, base V, emitter W, and strip X is left
  empty between W and CHARACTER_CAP on Y.
- **C3, C6, C8 and R11 moved right** to columns 24, 20, 25 and 22 so that no two
  bodies sit in neighbouring columns of the same strips.

| | `60ded02` | this layout |
| --- | --- | --- |
| BOUNDS | `5,0 34,24` (30 strips x 25 holes) | `13,0 34,24` (22 strips x 25 holes) |
| strips used | 30 | 21 (strip X is empty) |
| cuts | 0 | 0 |
| wire links | 4 | 2 |
| solder bridges | 4 | 1 |

It fits the 35-strip x 27-hole stock with no cuts.
