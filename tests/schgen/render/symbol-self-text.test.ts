import { afterAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { placedSymbolTextOverlaps, symbolTextOverlaps } from "../../../lib/schgen/render/symbol-self-text.ts"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"

/**
 * `lib/schgen/render/symbol-self-text.ts` against itself.
 *
 * **THIS IS A HAND-WRITTEN TEST, NOT A PORT, AND IT EXISTS BECAUSE THE PORT
 * COULD NOT LAND.** `docs/known-gaps.md` **G123** has the full story: the
 * pedals `render/symbolSelfText.test.ts` is import-clean and runs, but its
 * fixture calls `fs.mkdtempSync` and removes nothing, so
 * `tests/stripboard/temp-scratch.test.ts` - the standing guard that followed a
 * 60,000-directory `TMPDIR` and a full disk - refuses the whole suite. Cleanup
 * is content a manifest `cuts` entry cannot add (cuts are deletion-only), and
 * a ported file may not be hand-edited, so the entry came out of
 * `tools/schgen/port-manifest.json`. **G123**'s criterion is that
 * `symbolTextOverlaps` and `placedSymbolTextOverlaps` are exercised by a test
 * and `TMPDIR` is left clean; this file is one of the two mechanisms it names,
 * and it needs no upstream edit, no guard change and no ported byte touched.
 *
 * **THE ASSERTIONS ARE NOT THIS FILE'S AUTHOR'S.** Every fixture symbol, every
 * expected string and every case below is transcribed from
 * `$SCHGEN_SOURCE/render/symbolSelfText.test.ts`, which is the authority for
 * what this module is supposed to refuse - the agent writing a test may not
 * decide what its subject should do. Three things differ from that source, all
 * mechanical: the temp directory comes from `freshTempScratch` and is removed
 * by `afterAll(cleanUpTempScratch)`; the imports are this repository's relative
 * paths; and `vitest` is `bun:test`. **If the pedals source's expectations
 * change, this file is wrong and the diff is the evidence** - it is not
 * byte-checked by `tests/schgen/port-fidelity.test.ts`, which is the price of
 * hand-writing it and is recorded in **G123**.
 *
 * The defects behind these cases are real and named in
 * `docs/schematic/schgen-development-history.md` §6: a custom symbol whose own
 * pin text overlapped itself (`TPS7A4901` NR/SS-DNC, the `CORNER` fixture), and
 * the stock `W25Q128JVS` drawing GND 0.13 mm under HOLD/RESET/IO3, which a
 * strict-overlap test missed and the 0.254 mm minimum gap caught (the `W25`
 * fixture).
 */

afterAll(cleanUpTempScratch)

const pin = (type: string, x: number, y: number, angle: number, name: string, num: string): string =>
  `(pin ${type} line (at ${x} ${y} ${angle}) (length 2.54) (name "${name}" (effects (font (size 1.27 1.27)))) (number "${num}" (effects (font (size 1.27 1.27)))))`

function symbol(name: string, pins: readonly string[], opts = ""): string {
  return `  (symbol "${name}" ${opts}(pin_names (offset 1.016)) (exclude_from_sim no) (in_bom yes) (on_board yes)
    (property "Reference" "U" (at 0 7.62 0) (effects (font (size 1.27 1.27))))
    (property "Value" "${name}" (at 0 6.35 0) (effects (font (size 1.27 1.27))))
    (symbol "${name}_0_1" (rectangle (start -10.16 5.08) (end 10.16 -7.62) (stroke (width 0.254) (type default)) (fill (type background))))
    (symbol "${name}_1_1"
      ${pins.join("\n      ")}))`
}

/** A library with: CLEAN (names well apart), CORNER (a bottom pin's name runs into a side pin's, as TPS7A4901 rev 1 did), HIDDEN (the same, names hidden). */
function lib(): string {
  const corner = [pin("passive", 12.7, -2.54, 180, "DNC", "7"), pin("passive", 5.08, -10.16, 90, "NR/SS", "6")]
  // Stock Memory_Flash:W25Q32JVSS (which W25Q128JVS extends), default name offset: GND (bottom) ends 0.13 mm under HOLD/RESET/IO3.
  const w25 = [pin("bidirectional", -10.16, -5.08, 0, "~{HOLD}/~{RESET}/IO_{3}", "7"), pin("power_in", 0, -12.7, 90, "GND", "4")]
  // The same pins with the side pin one grid step higher: clean.
  const w25raw = [pin("bidirectional", -10.16, -2.54, 0, "~{HOLD}/~{RESET}/IO_{3}", "7"), pin("power_in", 0, -12.7, 90, "GND", "4")]
  // An overbarred side name that ends before the bottom pin once its markup is dropped ("RAS" is 3 characters, "~{RAS}" 6).
  const markup = [pin("input", -10.16, -5.08, 0, "~{RAS}", "18"), pin("power_in", 0, -12.7, 90, "VSS", "28")]
  const text = `(kicad_symbol_lib (version 20241209) (generator "test")
${symbol("CLEAN", [pin("input", -12.7, 2.54, 0, "IN", "1"), pin("output", 12.7, 2.54, 180, "OUT", "2"), pin("power_in", 0, -10.16, 90, "GND", "3")])}
${symbol("CORNER", corner)}
${symbol("HIDDEN", corner, "(pin_numbers (hide yes)) ").replace("(pin_names (offset 1.016))", "(pin_names (offset 1.016) (hide yes))")}
${symbol("NUMBERS", [pin("passive", -12.7, -8.89, 0, "", "10"), pin("passive", -8.89, -10.16, 90, "", "11")])}
${symbol("W25", w25, "(pin_numbers (hide yes)) ").replace("(pin_names (offset 1.016)) ", "")}
${symbol("W25RAW", w25raw, "(pin_numbers (hide yes)) ").replace("(pin_names (offset 1.016)) ", "")}
${symbol("MARKUP", markup, "(pin_numbers (hide yes)) ").replace("(pin_names (offset 1.016)) ", "")}
${symbol("OFFSET0", [pin("passive", -12.7, 0, 0, "A", "1"), pin("passive", 12.7, 0, 180, "K", "2")]).replace("(pin_names (offset 1.016))", "(pin_names (offset 0))")}
)`
  // THE ONE SUBSTANTIVE DIFFERENCE FROM THE PEDALS SOURCE: its `fs.mkdtempSync`
  // is this, so `afterAll(cleanUpTempScratch)` removes what the fixture made
  // and tests/stripboard/temp-scratch.test.ts stays green. See G123.
  const dir = freshTempScratch("schgen-symtext-")
  const file = path.join(dir, "T.kicad_sym")
  fs.writeFileSync(file, text)
  return file
}

describe("symbolTextOverlaps: a symbol's own pin names and numbers never overlap each other", () => {
  const r = createResolver(new Map([["T", lib()]]))

  it("accepts a symbol whose pin names and numbers are apart", () => {
    expect(symbolTextOverlaps(r.resolve("T:CLEAN"))).toEqual([])
  })

  it("reports a bottom pin's name running up into a side pin's name", () => {
    expect(symbolTextOverlaps(r.resolve("T:CORNER"))).toEqual([
      'T:CORNER unit 1: pin name "NR/SS" (pin 6) overlaps pin name "DNC" (pin 7)',
    ])
  })

  it("ignores names and numbers the symbol hides", () => {
    expect(symbolTextOverlaps(r.resolve("T:HIDDEN"))).toEqual([])
  })

  it("reports two pin numbers that meet at a corner", () => {
    expect(symbolTextOverlaps(r.resolve("T:NUMBERS"))).toEqual([
      'T:NUMBERS unit 1: pin number "10" (pin 10) overlaps pin number "11" (pin 11)',
    ])
  })

  it("refuses texts closer than the minimum gap, as on the stock W25Q128JVS", () => {
    expect(symbolTextOverlaps(r.resolve("T:W25"))).toEqual([
      'T:W25 unit 1: pin name "GND" (pin 4) overlaps pin name "~{HOLD}/~{RESET}/IO_{3}" (pin 7)',
    ])
    expect(symbolTextOverlaps(r.resolve("T:W25RAW"))).toEqual([])
  })

  it("accepts an offset-0 pin whose name and number sit on opposite sides of its own pin line", () => {
    expect(symbolTextOverlaps(r.resolve("T:OFFSET0"))).toEqual([])
  })

  it("measures the text KiCad draws, not its overbar and subscript markup", () => {
    expect(symbolTextOverlaps(r.resolve("T:MARKUP"))).toEqual([])
  })
})

describe("placedSymbolTextOverlaps: every symbol a design places, stock or custom", () => {
  const r = createResolver(new Map([["T", lib()]]))

  it("reports each overlapping symbol once, naming the parts that place it", () => {
    const parts = [
      { label: "U_A", libId: "T:CORNER", units: [1] },
      { label: "U_B", libId: "T:CORNER", units: [1] },
      { label: "U_C", libId: "T:CLEAN", units: [1] },
    ]
    expect(placedSymbolTextOverlaps(parts, r)).toEqual([
      'T:CORNER unit 1 (placed as U_A, U_B): pin name "NR/SS" (pin 6) overlaps pin name "DNC" (pin 7)',
    ])
  })

  it("checks only the units the design places", () => {
    expect(placedSymbolTextOverlaps([{ label: "U_A", libId: "T:CORNER", units: [] }], r)).toEqual([])
  })
})
