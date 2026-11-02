# Tascam 38 connector analysis: comparison with owner's worksheet

Source: user-provided **Tascam 38.xlsx**, sheet `Junctions` (80 rows, 27 columns; populated columns A–I). Persisted original in ChatGPT Library: `/Tascam 38/Tascam 38 connector analysis.xlsx`. This is **prior analysis, not a verified schematic transcription**. Compare against the user-uploaded two-sheet high-resolution Tascam 38 schematic before treating any mapping as authoritative.

## Prior-analysis coverage

The worksheet documents individual contact hypotheses for amplifier connectors J101 (4 contacts), J102 (7), J103 (6), J104 (7), J105 (7), J106 (**8**), J107 (7), J108 (4); and output-select J180 (5), J181 (3). The amplifier contact entries total **50** when counting the 8 J106 entries, versus **49** in the previous investigation's J106=7 assumption. **Do not discard J106 pin 8** without checking the original drawing.

## High-value proposed signal routes

| Card connector/contact | Proposed route or function | Worksheet row | Confidence |
| --- | --- | --- | --- |
| J101-4 | J121 reproduce-head signal through K101/TR101 and U101 | 7 | Owner hypothesis; needs schematic confirmation |
| J101-2 | J180-2, 24 V K101 control | 5 | Owner hypothesis |
| J102-2 | J131-1 line OUTPUT via U101 and K102 | 11 | Owner hypothesis |
| J102-3 | J171-3 POWER MUTE; K102 control | 12 | Owner hypothesis |
| J102-4 | J180-4 common OFF, 24 V | 13 | Owner hypothesis |
| J104-1 | J171-6 PLAY MUTE | 27 | Owner hypothesis |
| J104-4 | J181-1 INPUT selection | 30 | Owner hypothesis |
| J104-5 | J181-2 SYNC selection | 31 | Owner hypothesis |
| J105-5 | +15 V rail | 40 | Owner hypothesis |
| J105-6 | J182-5 master oscillator | 41 | Owner hypothesis |
| J106-1 | J141-1 line INPUT | 45 | Owner hypothesis |
| J106-7 | J151 SYNC head | 51 | Owner hypothesis |
| J107-2 | +24 V | 56 | Owner hypothesis |
| J107-3 | +15 V | 57 | Owner hypothesis |
| J107-4 | -15 V | 58 | Owner hypothesis |
| J108-2,3 | J161 erase head | 65–66 | Owner hypothesis |
| J108-4 | J182-8 master oscillator | 67 | Owner hypothesis |

## Internal inconsistencies and checks

1. **J106 pin count:** Worksheet has pins 1–8; previous trace claimed 7. Resolve from original schematic.
2. **J102/J105 output cross-reference:** J102-5 (row 14) describes a route to J105-2, while J105-1 (row 36) points to J102-5 and calls it meter OUTPUT. At least one contact reference may be shifted.
3. **J103-5:** Cell D23 says `107` rather than `J107`; probable data-entry typo, not a proven circuit error.
4. **J103-4:** Cell C22 includes `J161 (ERASE HEAD) (?)`; explicitly uncertain.
5. **J103-6:** Cell C24 loops back to J103-4. Verify whether this is a valid net join or transcription mistake.
6. **J101-2:** Worksheet questions whether K101 shorts a 24 V line to ground or whether the relay is energized by that line. Check relay coil vs switch contacts and flyback diode D101 orientation.
7. **J180-1 vs J107-2:** Worksheet reports shared +24 V, but the label COMMON ON needs mode interpretation.
8. **J181-3:** Worksheet identifies REPRO selection without target; trace its actual connection.
9. **X entries:** Treat as unknown/possibly unused, not confirmed NC.
10. **J106-8:** Worksheet says GND; must verify rather than dropping it.

## Electrical tracing priority

1. Check connector contact count/order from original scan, beginning J106.
2. Reconcile J101-4 (repro head), J106-7 (sync), J108-2/3 (erase).
3. Trace K101/K102 coil and switched contacts independently; confirm control nets.
4. Trace +15 V/-15 V/+24 V and ground returns to each card connector.
5. Trace record amplifier and bias oscillator coupling, then remaining switching/meter paths.
6. Mark each contact **verified**, **contradicted**, or **unresolved**, with schematic coordinate evidence.

No manufacturing work; original motherboard retained. All eight cards interchangeable.
