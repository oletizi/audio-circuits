import { describe, expect, it } from "bun:test"
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { NET_NAME, type CircuitSpec, type PartSpec, type Rendering } from "../../../lib/schgen/ir/types.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { parsePinTable } from "../../../lib/schgen/gates/pin-table.ts"
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { netsOf } from "../../../lib/schgen/authoring.ts"
import { caseResolver } from "../../../tools/schgen/authoring-census.ts"
import { ALL_DECLARED_CASES } from "../../../tools/schgen/board-declarations.ts"

/**
 * **WHAT A NET NAME MAY BE AFTER THE CASE DEMAND CAME OUT** - Task 3 of the
 * net-names-and-floating-pins plan, 2026-10-23.
 *
 * Hand-written, not ported, and it exists because the change it covers is spread across three
 * files the pedals source will never have this shape of: `NET_NAME`'s definition
 * (`lib/schgen/ir/types.ts`), the NARROWED `netNames` rule in `lib/schgen/ir/validate.ts`, and the
 * pin-table gate that applies the same predicate as a **backstop on a different input**
 * (`lib/schgen/gates/pin-table.ts`, which is a byte-checked PORT and is deliberately not edited).
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
 * `docs/known-gaps.md` **G150** carries the owner's decision, **G277** the `kicad-cli`
 * measurement, **G280** what the control-character class does NOT cover, and **G281** why the
 * gate's own file was not edited.
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
    // THE POSITIVE CONTROL FOR THE RULE'S NARROWING. A rule removed and a rule that stopped
    // running look identical from inside `validate.ts`; this is driven through the real
    // composition.
    expect(problems(base([res("R_A", "x", "GND"), res("R_B", "x", "GND")]))).toEqual([])
  })

  it("reports no net-name problem of any kind for a synthetic name", () => {
    const reported = problems(base([res("R_A", "Net-(C10-Pad1)", "GND"), res("R_B", "Net-(C10-Pad1)", "GND")]))
    expect(reported).toEqual([])
  })
})

/**
 * **THE REFUSAL IS AT VALIDATION TIME AND NOT ONLY AT EMIT TIME** - Task 3 fix round 1.
 *
 * Round 0 deleted the `netNames` rule outright because the brief said to, which left `str()`
 * (`lib/schgen/render/sexpr-write.ts:31`) as the only thing refusing a control character in a net
 * name - **a refusal at EMIT time, reported against a sheet rather than against a circuit.** The
 * coordinator closed that rather than parking it: *"The owner removed the CASING demand, not all
 * net-name validation."* `lib/schgen/ir/validate.ts`'s `netNames` rule is back, carrying the new
 * predicate and a message that names the measured reason.
 *
 * **THESE ASSERT THE MESSAGE, NEVER A COUNT**, and they assert the NET IS NAMED - the point of a
 * validation-time refusal over an emit-time one is that it says which net, before any geometry
 * runs.
 */
describe("validateCircuit refuses a net name that is empty or carries a control character", () => {
  // Built with fromCharCode rather than written as an escape. Twice on this plan, a control
  // escape typed into a file became a real control BYTE on disk - once making a regex
  // un-parseable, once splitting a doc comment across lines. There is no escape to mangle here.
  const CR = String.fromCharCode(0x0d)
  const NUL = String.fromCharCode(0x00)

  it("refuses a carriage return, and the reason it gives is the SILENT RENAME", () => {
    const reported = problems(base([res("R_A", `RAW${CR}CR`, "GND"), res("R_B", `RAW${CR}CR`, "GND")]))
    expect(reported.length, `expected exactly one problem, got ${JSON.stringify(reported)}`).toBe(1)
    const only = reported[0] ?? ""
    expect(only).toContain('net "RAW\\rCR" is not a usable net name')
    expect(only, "it names which character").toContain("control character (U+000D)")
    expect(only, "the reason is the rename and not rejection").toContain("come back from the netlist as a DIFFERENT net name")
    expect(only, "it says why it is not defaulted away").toContain("no exit code reports")
    expect(only, "it cites the measurement").toContain("tools/schgen/label-syntax/probe-run.log")
  })

  it("refuses a NUL and names it", () => {
    const reported = problems(base([res("R_A", `RAW${NUL}NUL`, "GND"), res("R_B", `RAW${NUL}NUL`, "GND")]))
    expect(reported.length, JSON.stringify(reported)).toBe(1)
    expect(reported[0] ?? "").toContain("control character (U+0000)")
  })

  it("refuses a tab, although kicad-cli accepts a tab verbatim", () => {
    // The arm that keeps the reason honest: a tab does NOT break anything in KiCad, so a message
    // claiming KiCad rejects it would be false. It is refused because the class is refused.
    const reported = problems(base([res("R_A", `RAW${String.fromCharCode(0x09)}TAB`, "GND"), res("R_B", `RAW${String.fromCharCode(0x09)}TAB`, "GND")]))
    expect(reported.length, JSON.stringify(reported)).toBe(1)
    expect(reported[0] ?? "").toContain("control character (U+0009)")
  })

  it("refuses an empty net name, citing the model's own contract", () => {
    const reported = problems(base([res("R_A", "", "GND"), res("R_B", "", "GND")]))
    expect(reported.length, JSON.stringify(reported)).toBe(1)
    const only = reported[0] ?? ""
    expect(only).toContain('net "" is not a usable net name')
    expect(only).toContain("it is empty")
    expect(only, "it cites the contract the gate must not be weaker than").toContain("net name must not be empty")
  })

  it("names EVERY offending character, so one message is not read as one defect", () => {
    const net = `A${CR}B${NUL}C`
    const reported = problems(base([res("R_A", net, "GND"), res("R_B", net, "GND")]))
    expect(reported.length, JSON.stringify(reported)).toBe(1)
    expect(reported[0] ?? "").toContain("control character (U+000D, U+0000)")
  })

  it("produces no problem containing a newline, which verify.test.ts:156 requires of gate 1", () => {
    // tests/schgen/verify.test.ts asserts one expect per gate-1 problem that the problem has no
    // newline in it. A multi-line refusal here would break that file rather than this one.
    const reported = problems(base([res("R_A", `RAW${CR}CR`, "GND"), res("R_B", `RAW${CR}CR`, "GND")]))
    for (const p of reported) expect(p, p).not.toContain(String.fromCharCode(0x0a))
  })
})

/**
 * **THE GENERATOR PASSES NET NAMES THROUGH UNCHANGED** - Task 3 fix round 1, item two, and it is
 * a BETTER tripwire than the one it replaces.
 *
 * **WHAT WAS LOST AND WHY IT HAD TO BE REPLACED.** `tests/schgen/authoring-complete.test.ts`'s
 * own comment named itself the guard against *"a later task 'fixing' one of them the forbidden
 * way: a generator that normalised net names would drop `netNames` to 0 and fail the counts
 * here"*. That worked only as a **side effect** of asserting UPPER_SNAKE - the refusal count was
 * the tripwire - so it died with the casing rule.
 *
 * **"AND NOTHING NOW NOTICES A NORMALISER" WAS THIS WRITER'S CLAIM IN ROUND 0 AND IT IS TOO
 * STRONG - driven, not reasoned.** `[RAN]` with the generator perturbed in place to
 * `connection.net.toUpperCase()` at both pin-assembly sites in `lib/schgen/from-network.ts`
 * (restored afterwards):
 *
 * | | under a case-folding generator |
 * | --- | --- |
 * | `authoring-complete.test.ts`'s refusal COUNTS - the mechanism its comment named | **passed** |
 * | `authoring-complete.test.ts`'s *"the one single-pin net is pt2399-core's CLK_O placeholder"* | **failed** |
 * | `tests/schgen/ir/validate.test.ts` | **passed, 17 of 17** |
 * | the sweep below | **failed, naming the circuit and the net** |
 *
 * So one assertion does still catch *this* normaliser, and it catches it **incidentally**: it
 * asserts the string `net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)` verbatim, so a
 * rename shows up as a changed message. **That is a literal name on one net of one circuit, not a
 * pass-through invariant** - a rename that left that net alone, a truncator, or a rename on any of
 * the other 197 nets would not reach it. The mechanism the old comment actually named - the
 * refusal count - did **not** fire.
 *
 * > **THAT TABLE IS A DATED MEASUREMENT AND ITS SECOND ROW NO LONGER NAMES A TEST, 2026-10-24,
 * > Task 5. The rows stand as measured; what follows is what changed under them.** `pt2399-core`
 * > declares U1 pin 5 `NC`, so `unconnected-(U1-CLK_O-Pad5)` does not exist, the refusal that
 * > quoted it is gone, and the `authoring-complete.test.ts` assertion that spelled it out is
 * > replaced by one about the pin. **So the "one assertion does still catch this normaliser"
 * > above is now ZERO assertions, and the sweep below is the whole of the guard** - which is the
 * > conclusion the paragraph after the table already draws. Nothing was weakened to get here: the
 * > incidental catch was a literal net name, and the net stopped existing.
 *
 * **WHY THIS IS STRONGER THAN WHAT IT REPLACES.** The old count noticed a normaliser only because
 * normalising would have made names PASS a rule they were failing. It was blind to a case-folder
 * on an already-upper-case name, to a truncator, and to any rename between two names the rule
 * accepted. **Comparing the sets catches all of those, over every declared case**, and it states
 * **G150**'s criterion directly - *"the mapping from the model's name to that name is stated once
 * and is reversible"* - rather than through a refusal count.
 *
 * **WHAT IT COVERS AND WHAT IT DOES NOT.** This is the `Network` -> `CircuitSpec` -> `Circuit`
 * arm, which is where a generator would rename. The `Circuit` -> emitted `.kicad_sch` -> exported
 * netlist arm is gate 3's (`tools/schgen/verify.ts`, *"netlist equals IR"*), and nothing here
 * duplicates it.
 */
describe("net names reach the IR unchanged", () => {
  const caseSymbols = caseResolver(ALL_DECLARED_CASES)

  it("ranges over every declared case, so the sweep below is not empty", () => {
    expect(ALL_DECLARED_CASES.length, "a sweep over nothing is a check that cannot fail").toBe(13)
  })

  it("the IR's net set is the model's net set, exactly, for all 13 declared cases", () => {
    const disagreements: string[] = []
    let netsCompared = 0
    for (const c of ALL_DECLARED_CASES) {
      const model = [...netsOf(c.network)].sort()
      const ir = [...buildCircuit(circuitSpecFrom(c.network, c.authoring, caseSymbols), { symbols: caseSymbols }).nets.keys()].sort()
      netsCompared += model.length
      const lost = model.filter((n) => !ir.includes(n))
      const invented = ir.filter((n) => !model.includes(n))
      if (lost.length > 0) disagreements.push(`${c.name}: in the model and not in the IR: ${JSON.stringify(lost)}`)
      if (invented.length > 0) disagreements.push(`${c.name}: in the IR and not in the model: ${JSON.stringify(invented)}`)
    }
    expect(
      netsCompared,
      "the comparison must actually have nets to compare; 198 was the figure when this was written",
    ).toBeGreaterThan(150)
    expect(
      disagreements,
      "A net name changed between the circuit model and the IR. G150's criterion is that the " +
        "mapping is stated once and is REVERSIBLE, because spec section 2's round trip compares " +
        "the exported netlist's net names against the model's. A normaliser, a case-folder or a " +
        "truncator in the generator lands here. If a rename is genuinely wanted, it is a declared " +
        "map with an owner decision behind it, not a silent transformation.",
    ).toEqual([])
  })
})
