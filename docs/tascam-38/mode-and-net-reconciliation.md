# Connector verification priorities and observed circuit states

Source: uploaded high-resolution Tascam 38 amplifier drawing (`p2(1).pdf`) and owner worksheet `Tascam 38.xlsx`.

## Immediate observation from enlarged channel-1 circuit

- U101 first half is marked with an operating node at **13.1 V**, while the schematic also shows **0 V** and **-15 V** references. These annotations are node operating values, not proof of connector supply assignments.
- The K101 relay coil is drawn across a 24 V feed and a separately routed control return, with D101 parallel to the coil. The contact switches the input-transformer feed; coil and signal contact are distinct.
- The diagram shows three labeled signal-selection paths INPUT (Q110), SYNC (Q106), and REPRO (Q105), each with a separate control diode. Their logic cannot be collapsed into one REC signal.
- K102 is a second relay near the line output and has a distinct coil/diode arrangement from K101.
- The lower record/equalization circuit contains U102 halves and K103; the presence of K103 means a reproduce-only replacement may still need a defined record-head isolation state.

## Connector reconciliation

All eight connector groups total 50 contacts, including **J106 with 8**. The owner worksheet contains 50 proposed mappings. These are *candidate routes*, not verified continuity.

### Targeted contradictions

1. J102-5 points to J105-2 in the J102 worksheet row, but J105-1 points back to J102-5. These cannot both be treated as a unique single destination without tracing the net.
2. J103-4 references both erase head and J108-3, with an explicit question mark; J103-6 references J103-4. Treat this as one possible multi-terminal net, not two confirmed separate erase connections.
3. J106-3/J106-4 are labeled -15 V/+15 V in the worksheet, while J107-4/J107-3 duplicate those rails. Verify the physical parallel distribution and which grounds carry signal versus supply return.
4. The worksheet's X entries are not verified NC; an X is a missing annotation.

## Schematic tracing checklist

For each candidate pin, record (a) pin label at card connector, (b) immediate component or node on card, (c) matching motherboard connector contact, (d) every junction on motherboard, (e) named endpoint or rail, (f) whether independently verified. Keep separate operating-mode annotations for INPUT, SYNC, REPRO, REC and POWER MUTE.

**Current gate:** The full end-to-end 50-contact netlist remains unverified. The source is available; do not assert a physical/electrical blocker without specifying an actual ambiguous crossing.
