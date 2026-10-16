# Motherboard right-hand conductor tracing (2026-10-13)

Source: uploaded native-resolution Tascam 38 **amplifier** schematic (p2(1).pdf), motherboard connector region P107, P104, P102, P105. Evidence is the visible uninterrupted conductor and junction dot, not the owner's spreadsheet.

## Directly visible motherboard connections

- **P107-1 and P104-6** share a horizontal conductor. Junction dots at both vertical intersections establish connection.
- **P107-3 and P105-6** appear on a shared horizontal conductor in the enlarged region. Confirm the contact numbering and any intervening junction before treating this as an independently certified net.
- **P107-7 and P104-3** appear to be joined by a short horizontal run. Verify against the full native image before certifying because multiple parallel runs occur here.
- **P102-5 and P105-1** are joined by a U-shaped conductor in the upper motherboard connector row; the repeated lower channel row shows the same arrangement.
- **P104-7, P102-6, P102-7** have no obvious vertical conductor at this crop scale. **Do not classify as NC** without tracing the entire original sheet.

## Crucial distinction

The motherboard P102-5 to P105-1 connection does **not** establish the same wiring on the amplifier card. The card-side J102-5 to J105-2 conductor is separate, as documented in j102-j105-trace.md.

## Open

Trace each horizontal bus back to the named supply/control connector, head PCB, function PCB or oscillator. Do not infer the electrical function from a horizontal position alone. No physical motherboard modification is proposed.
