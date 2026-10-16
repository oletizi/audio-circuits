# High-resolution scan audit — corrected sheet identity and motherboard topology

Date: 2026-10-13. Source: user's native 300-dpi large-format scans, 5250×9000 raster pixels each, rotated to landscape for inspection.

## Source correction (important)

- `p1(1).pdf`, SHA-256 `cd656f66db0c474cc126da80a28d387f09c9740c06df080353edc38d95eda76b`: **TAPE TRANSPORT SCHEMATIC DIAGRAM**, not amplifier. The previous `alternate-amplifier-scan.md` manifest incorrectly called it the amplifier schematic.
- `p2(1).pdf`, SHA-256 `fda7f796a0bfb159d2f5d2c1ce68046df89cf2459f382cc89aba471853310e0d`: **AMPLIFIER SCHEMATIC DIAGRAM**, not a second sheet of a multi-sheet amplifier drawing. Previous `alternate-amplifier-scan-sheet-2.md` misdescribed it.

Both files are preserved in Library, but their **Library filenames are misleading**. Use their hashes and this corrected manifest to identify them.

## New direct findings from native-resolution amplifier drawing

1. The diagram shows **eight mated connector groups** for the detailed channel 1 amplifier, with corresponding repeated connectors for channels 2–8: J101/P101 (4 contacts), J103/P103 (6), J106/P106 (8), J108/P108 (4), J107/P107 (7), J104/P104 (7), J102/P102 (7), J105/P105 (7). Total **50** contacts. Connector sequence left-to-right is significant: J101, J103, J106, J108, J107, J104, J102, J105.
2. The central motherboard lines are not all independent straight runs: native-resolution inspection reveals **junction dots at some crossing points**, notably under the J106 group and near the J107/J104 groups. Consequently, a simple row-index mapping from left to right is invalid.
3. **J108/P108 pin 4** has a long trace leaving the pin, running rightward and joining the common bus near J107/P107; it is not merely a local ground return. The downstream oscillator connection proposed by the owner's spreadsheet is plausible but **not yet verified end-to-end**.
4. **J102/P102 pin 5** has a distinct trace that crosses to the J105/P105 group through an upper loop. This supports the owner's observation of an internal cross-connection, but the precise J105 destination requires following the loop through the right-side segment and its junctions; do not select J105-1 or -2 by proximity.
5. The lower half of the drawing explicitly repeats the same 50 contact numbers for channels 2–8; the large blank rectangles denote omitted duplicate circuitry, not a different amplifier type.
6. **P171/J171** is the 11-contact supply/control connector. Its labels are in drawing order 6V, 0V, POWER MUTE, REC MODE, REC SIGNAL, PLAY MUTE, 0V, 24V, +B(15V), -B(-15V), 0V. The adjacent **P172/J172** is a separate two-contact connector; its nets are not automatically part of P171.

## Relationship of transport schematic to amplifier sheet

The transport sheet separately shows the power supply, motor/transport control, keyboard, sensors, counter, and control logic. The amplifier sheet shows the motherboard's incoming named supply/control buses. To infer operating-mode behavior, the transport control outputs must be correlated with those buses; no pin-level behavior or timing should be invented merely from matching signal names.

## Audit status

**Verified:** which PDF is which, connector names/order/contact counts, visible topology and specific crossing/junction caveat, supply/control bus labels.

**Not verified:** all 50 contact endpoints, full coil switching truth table, bias/erase signal direction and return paths, or measured electrical levels.

## Next systematic step

Trace each contact as a separate net on the native-resolution image, marking explicit junctions and every endpoint. Use owner worksheet hypotheses only as a cross-check. Keep two columns for **card-side endpoint** and **motherboard-side endpoint**, and a third for **functional interpretation**. Do not collapse these into a single speculative signal name.
