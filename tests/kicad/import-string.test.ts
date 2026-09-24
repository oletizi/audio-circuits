import { test, expect } from "bun:test"
import { importStringFor, declaredPinCount } from "../../lib/kicad/import-string.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"

test("derives the five proven families", () => {
  expect(importStringFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"))
    .toBe("RESISTOR4")
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  expect(importStringFor("Capacitor_THT:CP_Radial_D5.0mm_P2.50mm")).toBe("CAP_ELECTRO_200")
  expect(importStringFor("Capacitor_THT:CP_Radial_D6.3mm_P2.50mm")).toBe("CAP_ELECTRO_250")
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
  expect(importStringFor("Package_DIP:DIP-16_W7.62mm")).toBe("DIP16")
  expect(importStringFor("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"))
    .toBe("SIP5")
})

test("an 8.0mm body rounds DOWN to the nearest enumerated diameter", () => {
  // 314.96 mil. The enumerated set has no 350, so this is nearest-member
  // selection over an uneven ladder, not rounding to 50 mil.
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
})

test("rounded-metric names for imperial parts are inside the pitch tolerance", () => {
  // P2.50mm is a nominal 0.1in part, 0.04mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  // P7.50mm is a nominal 0.3in part, 0.12mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D9.0mm_W2.5mm_P7.50mm")).toBe("CAP_CERAMIC3")
})

test("an off-grid pitch refuses, naming the measurement", () => {
  expect(() => importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P9.40mm"))
    .toThrow(/9\.4.*2\.54.*0\.15/s)
})

test("a diameter equidistant between two enumerated types refuses", () => {
  // 8.89mm is 350.00000000000006 mil - the midpoint of the 300/400 gap, which
  // float error resolves in favour of 400 by 1.2e-13. Ambiguity is therefore
  // detected as a band, and this asserts the band is actually reachable.
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D8.89mm_P3.50mm"))
    .toThrow(/equidistant.*CAP_ELECTRO_300.*CAP_ELECTRO_400/s)
})

test("a diameter outside the enumerated range refuses", () => {
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D3.0mm_P2.00mm")).toThrow(/175.*650/s)
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D20.0mm_P7.50mm")).toThrow(/175.*650/s)
})

test("an unrecognized family refuses, listing the shapes that derive", () => {
  expect(() => importStringFor("Package_TO_SOT_THT:TO-92_Inline"))
    .toThrow(/TO-92_Inline[\s\S]*R_Axial[\s\S]*PinHeader_1x/)
})

test("an override wins over the derivation", () => {
  // The override must produce a string `derive()` would NOT produce on its own -
  // otherwise this test stays green even if the override lookup is deleted.
  // "Package_TO_SOT_THT:TO-92_Inline" matches none of the derivable families
  // (see "an unrecognized family refuses" above), so `derive()` throws for it;
  // only the override lookup can make this call succeed.
  const overrides = new Map([["Package_TO_SOT_THT:TO-92_Inline", "PADS3"]])
  expect(importStringFor("Package_TO_SOT_THT:TO-92_Inline", overrides)).toBe("PADS3")
})

test("pin-count types report their count; span types do not", () => {
  expect(declaredPinCount("DIP16")).toBe(16)
  expect(declaredPinCount("SIP5")).toBe(5)
  expect(declaredPinCount("RESISTOR4")).toBeNull()
  expect(declaredPinCount("CAP_ELECTRO_200")).toBeNull()
})

/**
 * Parses the `PART <name> <type> <value> <FLOATING|AT <row>,<col>> SPAN <n>`
 * lines `--dump-board` prints (Src/Headless_dump.cpp), returning designator
 * -> type. Only the fields this test needs; SPAN is deliberately not
 * captured - see the test below for why it can't be used here.
 */
function parseBoardDumpPartTypes(dump: string): Map<string, string> {
  const types = new Map<string, string>()
  for (const line of dump.split("\n")) {
    const match = /^PART (\S+) (\S+) /.exec(line)
    if (match === null) continue
    const designator = match[1]
    const type = match[2]
    if (designator === undefined || type === undefined) {
      throw new Error(`malformed PART line in board dump: "${line}"`)
    }
    types.set(designator, type)
  }
  return types
}

/**
 * The two families whose VeroRoute import string carries a lead-span digit
 * (RESISTOR4, CAP_CERAMIC1, ...) that a board never persists as such.
 *
 * Verified from the fork's own source, not guessed:
 * - `Headless_dump.cpp`'s `TypeField()` reconstructs a PART line's <type>
 *   field from `Component::GetImportStr()`, appending `GetNumPins()` only
 *   for the pin-count families (SIP, DIP, SWITCH_*, STRIP_100MIL,
 *   BLOCK_*00MIL). RESISTOR and CAP_CERAMIC are not in that list, and
 *   `GetImportStr()` "only ever holds the generic per-type import string
 *   ... never the schematic's original numeric suffix" (Headless_dump.cpp
 *   comment above TypeField). So the dump's <type> field for these two is
 *   always the bare family name - there is no digit to compare.
 * - `Reconcile.cpp` documents, as an empirically-verified fact, that for
 *   these length-suffixed families `cols == digit + 1` (`SpanImportStr`/
 *   `GetExpectedSpanCols`), and `Headless_dump.cpp:56-57` documents PART's
 *   `SPAN <n>` field as exactly that `cols`
 *   (`Component::GetCompCols()`, "the footprint's current column span,
 *   direction-aware"). So SPAN - 1 = digit IS an unambiguous relationship
 *   in the abstract.
 * - But `GetCompCols()` is direction-aware: `CompElementGrid::GetCols(dir)`
 *   returns the footprint's internal ROW count instead of its column count
 *   when the part is mounted 'N'/'S' (vertical), because a vertical part's
 *   long (lead-span) axis then runs along the board's rows, not its
 *   columns. On this real board, EVERY RESISTOR and CAP_CERAMIC part dumps
 *   `SPAN 1` (see tests/fixtures/pt2399-core-board.dump) - and a
 *   horizontally-mounted two-pin part cannot occupy a single column (its
 *   two pins would collapse onto one point), so by elimination every one
 *   of these parts is mounted vertically. Their SPAN therefore reports the
 *   footprint's column footprint (1), not its lead-span digit - and the
 *   row count that WOULD reveal the digit is not part of this grammar at
 *   all (only SPAN/cols is ever printed, never rows).
 * Conclusion: on this board, SPAN cannot be used to recover the declared
 * digit for these two families - not because the SPAN/digit relationship
 * is ambiguous in the abstract, but because the dimension it reports here
 * is the wrong one, and the dump has no field that reports the right one.
 * So only the FAMILY is asserted for RESISTOR/CAP_CERAMIC below.
 */
const AXIAL_LENGTH_SUFFIX_FAMILIES = new Set(["RESISTOR", "CAP_CERAMIC"])

test("a 5.08mm terminal block derives to a 200-mil block", () => {
  expect(importStringFor(
    "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal",
  )).toBe("BLOCK_200MIL3")
})

test("a 5.00mm terminal block also derives to a 200-mil block", () => {
  // 5.00mm is 0.08mm from the 5.08mm grid multiple, inside the 0.15mm tolerance,
  // so the common KiCad 5.00mm parts are usable without an override.
  expect(importStringFor(
    "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3_1x03_P5.00mm_Horizontal",
  )).toBe("BLOCK_200MIL3")
})

test("a terminal block is recognized by its LIBRARY, not by its part name", () => {
  // Altech's 46 footprints and Wuerth's 14 are named for the manufacturer's
  // series, not "TerminalBlock..." - so a rule matching the name after the colon
  // silently refuses 60 real parts. The library prefix is the reliable
  // discriminator, and this is the test that holds that.
  expect(importStringFor("TerminalBlock_Altech:Altech_AK300_1x03_P5.00mm_45-Degree"))
    .toBe("BLOCK_200MIL3")
})

test("a 2.54mm terminal block derives to a 100-mil block", () => {
  expect(importStringFor(
    "TerminalBlock:TerminalBlock_Xinya_XY308-2.54-3P_1x03_P2.54mm_Horizontal",
  )).toBe("BLOCK_100MIL3")
})

test("a terminal block at a pitch that is neither one nor two grid steps refuses", () => {
  expect(() => importStringFor("TerminalBlock_Phoenix:Phoenix_1x02_P7.62mm"))
    .toThrow(/3 grid steps/)
})

test("a terminal block with no readable pin count refuses", () => {
  expect(() => importStringFor("TerminalBlock_Phoenix:Phoenix_MKDS_P5.08mm")).toThrow(/pin count/)
})

test("block pin counts are declared, so a netlist cannot reference a pin the block lacks", () => {
  expect(declaredPinCount("BLOCK_200MIL3")).toBe(3)
  expect(declaredPinCount("BLOCK_100MIL4")).toBe(4)
})

test("a film capacitor not on the whitelist refuses and says the list is how to add one", () => {
  expect(() => importStringFor("Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"))
    .toThrow(/FILM_CAPACITOR_IMPORT_STRINGS/)
})

test("a whitelisted film capacitor returns its recorded import string", () => {
  const whitelist = new Map([["Capacitor_THT:C_Rect_L4.6mm_W2.5mm_P2.50mm", "CAP_FILM1"]])
  expect(importStringFor("Capacitor_THT:C_Rect_L4.6mm_W2.5mm_P2.50mm", undefined, whitelist))
    .toBe("CAP_FILM1")
})

test("every part of the built board derives the import string (or family) its own dump shows", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const boardTypes = parseBoardDumpPartTypes(
    await Bun.file("tests/fixtures/pt2399-core-board.dump").text(),
  )

  expect(modern.components.length).toBe(24)
  for (const component of modern.components) {
    const footprint = component.footprint
    if (footprint === undefined) throw new Error(`${component.designator} has no footprint`)
    const boardType = boardTypes.get(component.designator)
    if (boardType === undefined) {
      throw new Error(
        `${component.designator} has no PART line in tests/fixtures/pt2399-core-board.dump`,
      )
    }
    const derived = importStringFor(footprint)
    if (AXIAL_LENGTH_SUFFIX_FAMILIES.has(boardType)) {
      // Fixed-geometry parts (the four electrolytics, J1, U1) reconstruct
      // their FULL import string exactly - fully non-circular, since the
      // board never stores the netlist's import string verbatim, only the
      // enum type it was built from. Axial parts only get a family check;
      // see AXIAL_LENGTH_SUFFIX_FAMILIES above for why span is excluded.
      expect(derived.replace(/[0-9]+$/, "")).toBe(boardType)
    } else {
      expect(derived).toBe(boardType)
    }
  }
})
