# Connector reconciliation, pass 3 — 2026-10-12

**Source of truth:** user-uploaded two-sheet Tascam 38 schematic, amplifier sheet 1. **Independent candidate source:** user-uploaded `Tascam 38.xlsx`, worksheet `Junctions`. This pass uses the enlarged central drawing, not web search.

## Confirmed correction: J106/P106 has 8 contacts

The original enlarged amplifier drawing explicitly labels **J106/P106 pins 8,7,6,5,4,3,2,1**. Earlier investigation files stating seven contacts were wrong. The full eight connector groups contain **50 contacts**: J101 4, J102 7, J103 6, J104 7, J105 7, J106 **8**, J107 7, J108 4. The owner's worksheet independently contains J106-8, described as ground; the ground assignment is **not independently verified**.

## Provisional functional groups from owner worksheet (NOT verified netlist)

- **J101:** pins 1/3 ground; pin 2 J180-2 relay control; pin 4 reproduce head via J121. K101 and D101 associated with relay control; K101 switching routes reproduce-head signal toward TR101/U101. Relay coil/contact behavior must be traced separately.
- **J102:** pin 2 line output to J131-1, pin 3 power mute from J171-3, pin 4 OUT SELECT common-off J180-4, pin 5 candidate connection to J105-2; other contacts unknown.
- **J103:** pin 2 SYNC select J181-2, pin 5 negative rail via J107-4; pins 4/6 and erase association ambiguous.
- **J104:** pin 1 PLAY MUTE, pin 2 J180-4, pin 3 function signal/J107-7, pin 4 INPUT select, pin 5 SYNC select, pin 6 ground, pin 7 unknown.
- **J105:** pin 1 J102-5 meter/output candidate, pin 5 +15 V, pin 6 oscillator J182-5, pin 7 VU meter J176-1. J105-1 vs J105-2 discrepancy remains.
- **J106:** pin 1 line INPUT J141-1; pins 3/4 ±15 V; pin 7 SYNC head J151; pins 2/5/6/8 proposed grounds.
- **J107:** pin 1 ground; pins 2/3/4 +24/+15/-15 V; pin 7 function J174-1 and J104-3; pins 5/6 unknown.
- **J108:** pin 1 ground, pins 2/3 erase head J161, pin 4 master oscillator J182-8.

These are **hypotheses from the spreadsheet**, not confirmed contact-level tracing. In particular, the ambiguous K101 interpretation must not be converted into a switching specification without inspecting the coil and contacts.

## Schematic evidence and next tracing priorities

1. The enlarged central image directly establishes J106 contact **8** and the connector mating order.
2. The enlarged head drawing identifies P121/J121 (repro), P151/J151 (sync), P161/J161 (erase) at the motherboard boundary, **not yet their final card contact**.
3. Next, follow P121 conductor(s) to P101 and trace K101 coil versus contacts; check J101-4 against that route.
4. Trace P151 into P106/J106-7 and P161 into P108/J108-2/3, resolving junctions individually.
5. Trace J102/J105 output/meter routes and then the remaining switching/power pins.

**No PCB/manufacturing work. The motherboard stays unchanged.** All eight amplifier cards use the same design.
