/**
 * THE RENDERED GATE CENSUS, AND THE ONE THING IT USED TO DROP.
 *
 * **SPEC §2.1's CRITERION IS ABOUT WHAT A GATE REPORTS, NOT ABOUT WHAT A STRUCT HOLDS.** Task 16
 * put `manifest` on every `GateResult` and asserted it in `tests/schgen/verify.test.ts`; the only
 * non-test caller of `runGates` is `tools/schgen/gate-census.ts`, whose renderer printed the gate,
 * the problem count and the classified labels and **dropped the field**. So the criterion was met
 * in the data structure and in no artifact a person reads. `CLAUDE.md`: look at the output, not
 * only the tests.
 *
 * **THE ASSERTIONS BELOW ARE ON THE CONTENT AND NOT ON THE PRESENCE OF A LINE.** Two gates whose
 * derivations differ must render differently, and each citation must land under ITS OWN gate - a
 * test that only looked for the word "derivation" would pass over a renderer that printed the
 * first gate's citation on every row, which is the exact failure mode a joint-derivation record
 * exists to rule out.
 *
 * **IT RENDERS A CONSTRUCTED CENSUS RATHER THAN DRIVING `gateCensus`.** That function builds four
 * parity designs, invokes `kicad-cli` and runs ELK, and every gate of all four reports the SAME
 * citation today (`docs/known-gaps.md` G151: gate 1 refuses on all four, so every row carries
 * `MANIFEST_UNREAD`) - so a real run cannot distinguish two derivations, which is the property
 * under test. `tests/schgen/verify.test.ts` is where the citations themselves are driven against a
 * real generation.
 */
import { describe, expect, it } from "bun:test"
import { GATES, MANIFEST_UNREAD } from "../../tools/schgen/verify.ts"
import { GATE_ORDER, renderGateCensus, type CircuitGates } from "../../tools/schgen/gate-census.ts"

const LIVE = "MANIFEST.json 0123456789ab; schematic/readability-baselines.json 0 baseline(s)"
const DEAD = "MANIFEST.json fedcba987654 (NOT LIVE); schematic/readability-baselines.json 0 baseline(s)"

/** Two circuits whose gates ran against DIFFERENT derivations, which is the case that must be legible. */
const CENSUS: readonly CircuitGates[] = [
  {
    name: "one",
    entry: "circuits/one/one.ts",
    results: [
      { gate: GATES.upToDate, problems: [], manifest: LIVE },
      { gate: GATES.netlist, problems: ["net GND has only one pin"], manifest: LIVE },
    ],
    notRegistered: [{ gate: GATES.oscar, why: "the design's `oscar` is null" }],
  },
  {
    name: "two",
    entry: "circuits/two/two.ts",
    results: [
      { gate: GATES.upToDate, problems: [], manifest: DEAD },
      { gate: GATES.netlist, problems: ["not run: generation was refused"], manifest: MANIFEST_UNREAD },
    ],
    notRegistered: [],
  },
]

const rendered = (): readonly string[] => renderGateCensus(CENSUS, false).split("\n")

/** The derivation line the renderer put under one circuit's gate, or "" when it put none. */
function derivationUnder(lines: readonly string[], circuit: string, gate: string): string {
  const start = lines.findIndex((l) => l.startsWith(`${circuit} (`))
  expect(start, `the census names no circuit ${circuit}`).toBeGreaterThanOrEqual(0)
  const row = lines.findIndex((l, i) => i > start && l.includes("ran ") && l.includes(gate))
  expect(row, `${circuit} has no row for ${gate}`).toBeGreaterThan(start)
  const next = lines[row + 1] ?? ""
  return next.includes("derivation") ? next.slice(next.indexOf("derivation") + "derivation".length).trim() : ""
}

describe("the rendered gate census", () => {
  it("names, per gate, the derivation that gate ran against", () => {
    const lines = rendered()
    expect(derivationUnder(lines, "one", GATES.upToDate)).toBe(LIVE)
    expect(derivationUnder(lines, "one", GATES.netlist)).toBe(LIVE)
  })

  it("tells two gates apart when they ran against different manifests", () => {
    const lines = rendered()
    expect(derivationUnder(lines, "one", GATES.upToDate), "circuit one's live manifest").toBe(LIVE)
    expect(derivationUnder(lines, "two", GATES.upToDate), "circuit two's is NOT LIVE").toBe(DEAD)
    expect(
      derivationUnder(lines, "two", GATES.netlist),
      "and a gate that never ran says the manifest was never read",
    ).toBe(MANIFEST_UNREAD)
  })

  it("names the derivation on the rows that report a PASS, which is §2.1's whole criterion", () => {
    const lines = rendered()
    for (const circuit of ["one", "two"]) {
      // Gate 1 carries no problems in this census: a row that reports a pass and names no
      // derivation is exactly the state the manifest exists to refuse.
      expect(derivationUnder(lines, circuit, GATES.upToDate), `${circuit}: the passing row`).not.toBe("")
    }
  })

  it("still prints the problem count, the classified labels and the gates that did not run", () => {
    const text = renderGateCensus(CENSUS, false)
    expect(text, "the count").toContain("1 problem(s)")
    expect(text, "the classification").toContain("singlePinNets (G159): net has only one pin")
    expect(text, "and a gate that never registered is named, never omitted").toContain(
      `DID NOT RUN ${GATES.oscar}`,
    )
  })

  it("prints every problem under --all without losing the derivation line", () => {
    const lines = renderGateCensus(CENSUS, true).split("\n")
    expect(lines.some((l) => l.trim() === "net GND has only one pin"), "the problem in full").toBe(true)
    expect(derivationUnder(lines, "one", GATES.netlist), "and the citation is still its own line").toBe(LIVE)
  })

  it("declares every gate runGates can register, so an absent one is named rather than omitted", () => {
    expect(GATE_ORDER.map(({ gate }) => gate)).toEqual([
      GATES.upToDate,
      GATES.netlist,
      GATES.pinIdentity,
      GATES.checklist,
      GATES.oscar,
    ])
  })
})
