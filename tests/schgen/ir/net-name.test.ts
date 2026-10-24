import { describe, expect, it } from "bun:test"
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { NET_NAME, type CircuitSpec, type PartSpec, type Rendering } from "../../../lib/schgen/ir/types.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { parsePinTable } from "../../../lib/schgen/gates/pin-table.ts"
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts"

/**
 * **WHAT A NET NAME MAY BE AFTER THE CASE DEMAND CAME OUT** - Task 3 of the
 * net-names-and-floating-pins plan, 2026-10-23.
 *
 * Hand-written, not ported, and it exists because the change it covers is spread across three
 * files the pedals source will never have this shape of: `NET_NAME`'s definition
 * (`lib/schgen/ir/types.ts`), the `netNames` rule's DELETION from `lib/schgen/ir/validate.ts`, and
 * the pin-table gate that still applies the predicate (`lib/schgen/gates/pin-table.ts`, which is a
 * byte-checked PORT and is deliberately not edited).
 *
 * **THE FOUR CASES ARE SEPARATED ON PURPOSE** and the spec requires it, *"so a future loosening
 * cannot pass unnoticed"*: a lower-case name (accepted), a KiCad synthetic name (accepted), the
 * empty string (refused), a non-string (refused). The control-character cases the predicate
 * implies are here too.
 *
 * **EVERY REFUSAL IS ASSERTED BY MESSAGE AND NEVER BY A COUNT.** `parsePinTable` and
 * `validateCircuit` each have many refusal paths and each produces one problem, so a count-only
 * assertion would establish only that something broke.
 *
 * **WHY THE EMPTY-STRING CASE IS THE ONE TO WATCH.** Reducing the gate to `typeof net !== "string"`
 * would admit `""`, which `lib/model/types.ts:45`'s own `net()` refuses - the gate would end up
 * weaker than the contract it guards, in the change meant to remove a demand rather than a check.
 *
 * `docs/known-gaps.md` **G150** carries the owner's decision, **G279** the one refusal this change
 * relocated, and **G280** what the control-character class does NOT cover.
 */

const symbols = fixtureResolver()
const res = (label: string, a: string, b: string): PartSpec =>
  twoPin({ label, refPrefix: "R", libId: "Fix:R", value: "1k", footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false })
const NO_TEMPLATE: Rendering = { kind: "auto" }
const base = (parts: PartSpec[]): CircuitSpec => ({
  parts,
  blocks: [{ id: "B", sheet: "s", title: "B", members: parts.map((p) => p.label), checklist: [], rendering: NO_TEMPLATE }],
  sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
  rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
  orientations: noOrientationPreferences(parts),
  portDirections: NO_PORT_DIRECTIONS,
})
const problems = (spec: CircuitSpec): readonly string[] => validateCircuit(buildCircuit(spec, { symbols }), symbols)

/**
 * A pin table that parses, so each case below changes exactly one thing about it.
 *
 * **`symbol` is a REAL installed lib id and not an invented one.**
 * `tests/kicad/symbol-names.test.ts` sweeps every `<Library>:<Name>` out of the source and
 * resolves it against an installed KiCad, with an exemption list that has teeth; an invented
 * `"L:S"` here failed that sweep, which is the guard working. `parsePinTable` never resolves the
 * symbol, so a real name costs nothing and adds no exemption.
 */
const GOOD_TABLE = {
  mpn: "M",
  document: { id: "D", revision: "A", cited: "T", url: null },
  symbol: "Device:R",
  pins: { "1": "OUT" },
  aliases: {},
  pinAliases: {},
  mechanicalPads: { "9": { net: "GND" } },
}

/** `mechanicalPads.9`'s value, as unparsed JSON, through the real gate. */
function gate(padValue: string): () => void {
  const json = JSON.stringify(GOOD_TABLE).replace('{"net":"GND"}', padValue)
  return () => {
    parsePinTable("X", json)
  }
}

const MECHANICAL_REFUSAL = /pin table X: mechanicalPads\.9 must be \{"net": "<NAME>"\} or \{"nc": true\}/

describe("NET_NAME, the predicate that replaced the UPPER_SNAKE demand", () => {
  it("accepts a lower-case authored name - the owner's decision, and 20 labelled Pultec nets", () => {
    for (const n of ["hi_boost_out", "in", "lo_boost_in", "out", "j15_p1", "mid_sel_1k5hz"]) {
      expect(NET_NAME.test(n), n).toBe(true)
    }
  })

  it("accepts a KiCad synthetic name, which Task 1 measured kicad-cli round-tripping byte-identical", () => {
    // tools/schgen/label-syntax/probe-run.log: both parse at exit 0, come back octet for octet,
    // and draw a label; quoteString escapes nothing for either.
    for (const n of ["Net-(C10-Pad1)", "unconnected-(U1-CLK_O-Pad5)", "+5V"]) {
      expect(NET_NAME.test(n), n).toBe(true)
    }
  })

  it("still accepts every UPPER_SNAKE name the deleted rule accepted", () => {
    // The deleted test's own positive list, kept: removing a demand must not have narrowed
    // anything, and nothing here would notice if it had.
    for (const n of ["VIN_PROT", "3V3_D", "5V_A", "SDRAM_A12", "GND"]) expect(NET_NAME.test(n), n).toBe(true)
  })

  it("refuses the empty string, because lib/model/types.ts's own net() does", () => {
    expect(NET_NAME.test("")).toBe(false)
  })

  it("refuses every control character in str()'s class, and refuses exactly that class", () => {
    for (let code = 0x00; code <= 0x1f; code += 1) {
      const n = `RAW${String.fromCharCode(code)}NAME`
      expect(NET_NAME.test(n), `U+${code.toString(16).padStart(4, "0")}`).toBe(false)
    }
    // The boundary on the other side, unmeasured by Task 1 and so NOT refused: G280.
    expect(NET_NAME.test("RAW NAME"), "a space is not a control character").toBe(true)
    expect(NET_NAME.test("RAW\u007fNAME"), "DEL is outside the class; G280").toBe(true)
  })

  it("refuses the two characters that silently RENAME a net, which is why the class is refused at all", () => {
    // Task 1 round 2, `[RAN]` against kicad-cli 10.0.5: a carriage return and a NUL both export
    // at exit 0 and draw a label, and the netlist comes back carrying "RAWCR" and a truncated
    // "RAW". "KiCad rejects a control character" is FALSE - a tab is accepted verbatim - so the
    // reason is the silent rename, not rejection.
    expect(NET_NAME.test("RAW\rCR"), "carriage return: came back as RAWCR").toBe(false)
    expect(NET_NAME.test("RAW\u0000NUL"), "NUL: came back as RAW, truncated").toBe(false)
    expect(NET_NAME.test("RAW\tTAB"), "tab: kicad-cli accepts it verbatim, and it is refused anyway").toBe(false)
  })
})

describe("the pin-table gate still refuses what it must", () => {
  it("accepts a lower-case mechanical net, which it refused before Task 3", () => {
    expect(gate('{"net":"gnd"}')).not.toThrow()
  })

  it("refuses an empty mechanical net - the check this change was most likely to drop", () => {
    expect(gate('{"net":""}')).toThrow(MECHANICAL_REFUSAL)
  })

  it("refuses a non-string mechanical net, because the type half of the gate is untouched", () => {
    expect(gate('{"net":7}')).toThrow(MECHANICAL_REFUSAL)
    expect(gate('{"net":null}')).toThrow(MECHANICAL_REFUSAL)
  })

  it("refuses a mechanical net carrying a control character", () => {
    expect(gate('{"net":"RAW\\u0000NUL"}')).toThrow(MECHANICAL_REFUSAL)
    expect(gate('{"net":"RAW\\rCR"}')).toThrow(MECHANICAL_REFUSAL)
  })
})

describe("validateCircuit no longer refuses a drawing for a net name's case", () => {
  it("validates a circuit whose nets are all lower case", () => {
    // THE POSITIVE CONTROL FOR THE DELETION. A rule removed and a rule that stopped running look
    // identical from inside `validate.ts`; this is driven through the real composition.
    expect(problems(base([res("R_A", "x", "GND"), res("R_B", "x", "GND")]))).toEqual([])
  })

  it("reports no net-name problem of any kind for a synthetic name", () => {
    const reported = problems(base([res("R_A", "Net-(C10-Pad1)", "GND"), res("R_B", "Net-(C10-Pad1)", "GND")]))
    expect(reported).toEqual([])
  })
})
