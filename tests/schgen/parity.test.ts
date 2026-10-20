import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { subgraphOf, selectRenderer } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"
import { CENSUS_DOC, censusOf, declaredBlockCount, renderCensus, VERDICT_KINDS } from "../../tools/schgen/parity.ts"

/**
 * **THE TEMPLATE-APPLICABILITY CENSUS, which is ONE OF M1's FOUR MEASUREMENTS and the one with
 * NO TARGET.** Spec §5.1 revision 4 separates them: **port parity** is a REGRESSION requirement
 * taken against the source project's own template fixtures (Task 7); **template applicability**
 * is this, *"how often the seven templates match this repository's circuit blocks"*, a
 * MEASUREMENT; **ELK coverage** is a test of the NEW capability (Tasks 12-14); **integrated
 * correctness** is the ARTIFACT and the only verdict of the four (Tasks 11 and 18).
 *
 * **SO NOTHING HERE PINS A PASS RATE, AND A LOW ONE IS NOT A FAILURE.** Requiring all seven
 * templates to draw our circuits would be finding 20's *"confusing a regression test with a
 * measurement"* exactly. `tests/schgen/symbol-census.test.ts` is the precedent and the same
 * reasoning applies: what is asserted is the census's STRUCTURE - that it covers every declared
 * block, that every outcome and every verdict is classified, that the per-template tallies
 * account for every probe - plus the one thing that is a criterion rather than a figure, which is
 * that the census agrees with `selectRenderer` about what would draw each block.
 *
 * **THE BRIEF'S SECOND TEST IS VACUOUS ON THIS REPOSITORY AND IS WRITTEN WIDER HERE.** It says
 * *"for every block, if the outcome is refused, expect its mismatch kind to be one of the four"*.
 * **No block of the four parity circuits refuses** - every one reaches ELK - so that loop body
 * would never execute and the test would pass by checking nothing, which is the failure
 * `CLAUDE.md` names as *"a skipped check must never look like a passing one"*. The classification
 * sweep below therefore runs over every per-template VERDICT, eight per block, so it cannot
 * silently become empty; the refused arm is still asserted, over whatever refusals exist.
 */

const CENSUS = censusOf(PARITY_CASES, parityResolver())

test("the census covers every block of every parity circuit", () => {
  // The two sides are counted independently: the left from the IR the generator built, the right
  // from the authoring declarations themselves. A block dropped on either path moves one only.
  expect(CENSUS.blocks.length).toBe(declaredBlockCount(PARITY_CASES))
  expect(CENSUS.blocks.length).toBeGreaterThan(0)
  for (const c of PARITY_CASES) {
    const mine = CENSUS.blocks.filter((b) => b.circuit === c.name)
    expect(mine.length, c.name).toBe(c.authoring.blocks.length)
  }
})

test("every block's outcome is one of the three, and a refusal says which kind of mismatch it is", () => {
  const mismatchKinds = VERDICT_KINDS.filter((k) => k !== "ok")
  for (const b of CENSUS.blocks) {
    expect(["realised", "elk", "refused"], `${b.circuit}/${b.block}`).toContain(b.outcome.kind)
    if (b.outcome.kind === "refused") {
      expect([...mismatchKinds], `${b.circuit}/${b.block}`).toContain(b.outcome.mismatch.kind)
      expect(b.outcome.mismatch.reason.length, `${b.circuit}/${b.block}`).toBeGreaterThan(0)
    }
    expect(b.parts, `${b.circuit}/${b.block}`).toBeGreaterThan(0)
    expect(b.units, `${b.circuit}/${b.block}`).toBeGreaterThanOrEqual(b.parts)
  }
})

test("every template's verdict on every block is classified, with a reason a person reads", () => {
  // This is the sweep that cannot go empty: one verdict per registered template per block.
  let seen = 0
  for (const b of CENSUS.blocks) {
    expect(
      b.verdicts.map((v) => v.template),
      `${b.circuit}/${b.block}`,
    ).toEqual([...TEMPLATES.keys()])
    for (const v of b.verdicts) {
      expect([...VERDICT_KINDS], `${b.circuit}/${b.block}/${v.template}`).toContain(v.kind)
      if (v.kind !== "ok") expect(v.reason.length, `${b.circuit}/${b.block}/${v.template}`).toBeGreaterThan(0)
      seen += 1
    }
  }
  expect(seen).toBe(CENSUS.blocks.length * TEMPLATES.size)
  expect(seen).toBeGreaterThan(0)
})

test("the per-template tallies account for every probe, over exactly the registered templates", () => {
  expect([...CENSUS.byTemplate.keys()]).toEqual([...TEMPLATES.keys()])
  expect(CENSUS.byTemplate.size).toBeGreaterThan(0)
  for (const [id, tally] of CENSUS.byTemplate) {
    expect(tally.realised + tally.notApplicable + tally.refused, id).toBe(CENSUS.blocks.length)
  }
})

test("unexercised is exactly the templates that drew nothing, and no others", () => {
  const drewNothing = [...CENSUS.byTemplate].filter(([, t]) => t.realised === 0).map(([id]) => id)
  expect([...CENSUS.unexercised]).toEqual(drewNothing)
  for (const id of CENSUS.unexercised) expect(TEMPLATES.has(id), id).toBe(true)
})

test("the census agrees with selectRenderer about what would draw each block", () => {
  // The criterion, not a figure: the census reports the SELECTOR's answer, so a probe that
  // disagreed with it would be reporting a template §1.3 would not have used. The circuit is
  // rebuilt here rather than taken from the census, so the two sides are independent.
  const symbols = parityResolver()
  let checked = 0
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const row of CENSUS.blocks.filter((b) => b.circuit === c.name)) {
      const selection = selectRenderer(subgraphOf(circuit, row.block, symbols), TEMPLATES)
      if (selection.kind === "template") {
        expect(row.outcome.kind, row.block).toBe("realised")
        if (row.outcome.kind === "realised") expect(row.outcome.template, row.block).toBe(selection.template)
      } else {
        expect(row.outcome.kind, row.block).toBe(selection.kind)
      }
      if (row.outcome.kind === "elk") {
        // An auto block reaches ELK exactly when every template reported not-applicable, so a
        // verdict of anything else here would mean the probe and the selector disagree.
        for (const v of row.verdicts) expect(v.kind, `${row.block}/${v.template}`).toBe("not-applicable")
      }
      checked += 1
    }
  }
  expect(checked).toBe(CENSUS.blocks.length)
})

test("the rendered census says which of the four measurements its numbers are", () => {
  // The whole point of spec revision 4's finding 20: a number reported without saying which
  // measurement it belongs to is how a measurement gets read as a gate.
  const text = renderCensus(CENSUS)
  expect(text).toContain("TEMPLATE APPLICABILITY")
  expect(text).toContain("MEASUREMENT WITH NO TARGET")
  for (const other of ["port parity", "ELK coverage", "integrated correctness"]) {
    expect(text, other).toContain(other)
  }
  for (const b of CENSUS.blocks) expect(text, b.block).toContain(b.block)
  for (const id of CENSUS.byTemplate.keys()) expect(text, id).toContain(id)
})

test("the committed census document is this run's output, compared by content", () => {
  // `CLAUDE.md`: derived artifacts are regenerated every run and compared by CONTENT, never by
  // timestamp - which is also why `renderCensus` writes no date into the file.
  const file = path.join(path.resolve(import.meta.dir, "..", ".."), CENSUS_DOC)
  const committed = fs.readFileSync(file, "utf8")
  expect(
    committed,
    `${CENSUS_DOC} is stale. Regenerate it with \`bun run schgen-parity\`. A diff here is not a ` +
      "defect: these are MEASURED numbers and they move when a circuit gains a part, when a " +
      "block declaration changes, when a template changes - and, because 15 of the 22 symbols a " +
      "drawing needs are pinned by nothing (docs/known-gaps.md G158), when the installed KiCad " +
      "changes, since the refusal reasons quote pin counts read from it.",
  ).toBe(renderCensus(CENSUS))
})
