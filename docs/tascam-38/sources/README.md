# Tascam 38 schematic sources

These are the authoritative drawings for the Tascam 38 amplifier-card analysis.
Every trace claim in `docs/tascam-38/` should cite one of these files by name.

| File | Title block | Format | SHA-256 |
| --- | --- | --- | --- |
| `tascam-38-amplifier-schematic.pdf` | 38 AMPLIFIER SCHEMATIC DIAGRAM | 1 page, 5250 x 9000 px JPEG at 300 ppi | `4cd4961067d844c9df0c0958683038004e2d3d34c101e5f79d144e511309fd71` |
| `tascam-38-transport-schematic.pdf` | 38 TAPE TRANSPORT SCHEMATIC DIAGRAM | 1 page, 5250 x 9000 px JPEG at 300 ppi | `2133794b11d7df0286c08a3ab22102420d08eab4e6a163aac2a0b0c21db649cd` |

## Provenance

Supplied by the owner (2026-10-13). They are the high-resolution scans earlier
analysis referred to as `p2(1).pdf` (amplifier) and `p1(1).pdf` (transport),
rotated to landscape by the owner. The rotation rewrote the files, so the
SHA-256 values recorded for `p2(1).pdf` / `p1(1).pdf` in earlier documents
identify the pre-rotation files and do not match these. The table above is the
current identity.

The owner's original transport filename was spelled `trasport`; it is
committed here as `transport`.

## Owner's junction hypotheses

`tascam-38-junctions.csv` (SHA-256
`d6bce1c546750614521f5627c1a70967292a094889c7aa9ac46c79eac6c4c862`) is the
`Junctions` sheet of the owner's `Tascam 38.xlsx`, exported to CSV by the owner
(2026-10-13). It proposes an endpoint for each of the 50 J101-J108 contacts plus
the OUT SELECT J180/J181 contacts. It is prior reverse-engineering work, **a
hypothesis set to check against the drawings, not an authority**. In it, `X`
means unknown, not a verified no-connect; a blank `Source Junction` cell
continues the connector named above it.

## Not in the repository

- The lower-resolution `Tascam 38 Complete schematics (High quality scan).pdf`.
