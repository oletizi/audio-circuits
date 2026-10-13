# Electrical trace verification gate — 2026-10-13

## Actual work performed in this pass

Inspected the original user-uploaded two-sheet PDF at high magnification, including the head-board area, J101–J108 amplifier-side drawing, and motherboard bus crossings. Compared the complete owner's `Junctions` worksheet, not merely the earlier summarized CSV.

### Directly verified at the amplifier-card end

- **J101-1:** common return below the TR101 stage.
- **J101-2:** K101 coil / D101 suppression-diode return; upper coil terminal labeled 24V.
- **J101-3:** common return.
- **J101-4:** reproduce-head signal input to K101's *signal contacts* and the TR101 primary/input network.
- **J106:** 8 contacts, not 7, giving 50 contacts across J101–J108.
- **P171/J171:** 11 labeled motherboard supply/control nets (separate from card pins).
- **Head PCB:** separate REPRO, SYNC, ERASE windings; the head wiring drawing also depicts returns/shields, so a two-wire-only abstraction loses information.

### Component-level verification

K101 coil and signal contact are electrically distinct; coil has 24V supply and D101 suppression. The first reproduce stage includes TR101, L101 1.2mH, C101/C136 470pF, U101 1/2, R112 1k and C105 10uF, then mode-select JFETs and downstream stages. The diagram note explicitly says the schematic shows one channel except for some components; this does not contradict owner confirmation of interchangeable cards.

### Comparison with owner worksheet

- J101 pin 2 coil and pin 4 reproduce-input proposals are **consistent with direct card-side trace**.
- J101 pins 1/3 ground proposals are **consistent with direct card-side trace**.
- J106-8 exists, resolving the old count discrepancy; its proposed ground assignment remains to be checked.
- **J102-5 vs J105-1/J105-2** is contradictory within the worksheet and remains unverified.
- J103-4/6 erase routing and J108-2/3 require further tracing; do not conflate sync pickup, record drive and erase drive.
- The spreadsheet's `X` cells are not verified no-connects.

## Why a complete 50-pin verified netlist is not claimed

The original PDF is a rasterized full-sheet diagram. The motherboard is rendered as many long parallel conductors with closely spaced junctions. On attempted visual tracing from **P121** to **P101** and from **P151** to **P106**, crossings and branches prevent me from certifying every endpoint unambiguously from the existing magnified image. The component-level J101 endpoints are verified, but the *motherboard-side full path* is not.

This is a **specific evidence-quality limitation**, not a missing manual or a request to search the web. A higher-resolution/vector scan, board artwork, or de-energized physical continuity measurements would resolve it. Until then, treat the unverified owner mappings as candidate nets and do not power a replacement card based on them.

## Corrected completion status

- **Done:** Board/function inventory; connector group/count inventory; supply/control bus mapping; full 50-contact hypothesis inventory; first-stage circuit decomposition; J101 card-side contact trace; discrepancies documented.
- **Not done:** Complete 50-contact end-to-end verified electrical netlist; operational-mode truth table; safe replacement schematic.
- **Actual blocker to certifying remaining ambiguous motherboard routes:** insufficiently distinguishable raster junction/crossing evidence on the current scan, with no independent continuity evidence.

No PCB manufacturing work was attempted. Motherboard remains in scope as the existing interface, not for replacement.
