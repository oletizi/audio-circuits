# Cross-reference consistency audit of the 50-contact worksheet

Source: owner-supplied `Tascam 38.xlsx` / `Junctions`, compared with the high-resolution Tascam 38 amplifier schematic `p2(1).pdf`. **This is a logical audit of the owner's annotations, not an electrical continuity test.**

## Coverage

All 50 amplifier-card contacts are represented in `interface-matrix.csv`. Of these, **11** are recorded as `X` (unknown), not established NC: J102-1/6/7, J103-1/3, J104-7, J105-2/3/4, J107-5/6. A schematic-based full-route verification has **not** been completed for any of the 50.

## Intra-card references requiring consistency checks

| Source contact | Owner's claimed other contact | Finding |
| --- | --- | --- |
| J102-5 | J105-2 | Card-side connection J102-5 to J105-2 verified from high-resolution scan |
| J105-1 | J102-5 | Motherboard-side connection P102-5 to P105-1 verified from high-resolution scan; distinct from card-side cross-link |
| J103-4 | J108-3 | Possible shared net; J108-3 described as erase |
| J103-5 | J107-4 | Both annotated negative supply, internally plausible |
| J103-6 | J103-4 | Could be two contacts on one net; must confirm junction |
| J104-3 | J107-7 | Reciprocal description appears at J107-7 |
| J107-7 | J104-3 | Reciprocal description appears at J104-3 |

**Important:** A one-way worksheet reference does not prove a circuit contradiction. Two pins may legitimately share a multi-terminal net. **Resolved:** the apparent J102/J105 contradiction came from mixing the card-side and motherboard-side wiring. See `j102-j105-trace.md`. The function of each cross-connected net is still unresolved.

## Head connector geometry from the drawing

The head assembly shows distinct REPRO (P121), SYNC (P151), and ERASE (P161) connector families. The image shows winding and shield/return conductors, so do not infer all connector conductors are interchangeable grounds. The high-resolution image confirms these families, **not** the full route to a specific amplifier pin.

## Engineering implications

1. Before any replacement card, verify each head input, record/erase drive and oscillator connection end-to-end.
2. Independently trace relay coils and contacts. The J101-2/K101 and J102-3/K102 candidate control assignments should not be interpreted as audio-signal nets.
3. Keep 0V returns separate in the audit until proven common at the relevant current and noise domains.
4. Derive the INPUT/SYNC/REPRO/REC/MUTE truth table from the drawing, not from assumed switch positions.
5. Preserve the motherboard; no manufacturing or enclosure work is in scope.

## Status

**Completed:** systematic 50-row candidate inventory, explicit evidence levels, 11 unknown contacts identified, internal reference consistency audit, head connector family separation.

**Outstanding:** 50 independent end-to-end motherboard conductor traces and mode-state truth table. This report does not certify a replacement-card pinout.
