/**
 * THE STEP 6 INSTRUMENT, HELD IN PLACE.
 *
 * Hand-written for Task 13 round 2 of the M1 schematic-authoring plan.
 *
 * **IT EXISTS BECAUSE THE INSTRUMENT HAD NO TEST AND NO CALLER** (round 1 review, I4).
 * `tools/schgen/elk/obstacle-census.ts` produced **G191**'s measured zero - *"no `PAIR_COVERAGE`
 * pair fires on ELK geometry"* - and G191's own settling mechanism is *"re-run
 * `obstacleCensus()`"*. Nothing imported it, no `Makefile` or `package.json` target ran it, so both
 * the finding and its remedy rested on a module that could rot without anything noticing. **A
 * measurement nothing holds in place is a measurement nobody can repeat**, which is the whole point
 * of recording one.
 *
 * What is asserted here is the instrument's own correctness, not the geometry's: that every
 * classification rule fires on a name its cited producer really writes, that an unrecognised name
 * is reported rather than dropped, and that the census runs end to end over a real circuit through
 * the real `elkjs`. **The per-block figures are deliberately NOT pinned** - they are a measurement
 * of a dependency at a version, and pinning them would make an `elkjs` bump a test failure rather
 * than a moved baseline.
 */

import { expect, test } from "bun:test"
import { ALL_CATEGORIES, categoryOf, obstacleCensus } from "../../../tools/schgen/elk/obstacle-census.ts"
import type { ObstacleCategory } from "../../../lib/schgen/render/obstacle-matrix.ts"
import { PARITY_CASES } from "../../../tools/schgen/authoring-census.ts"

/**
 * One real obstacle name per rule, **transcribed from the function that writes it** rather than
 * invented to match the pattern.
 *
 * A fixture written to fit the regex would test the regex against itself. Each of these is the
 * shape its cited producer emits: `layoutItems` writes `wire 3 of B` and `R1.2`, `textProblems`
 * writes `label OUT at (39.37, 19.05)` and `value of power symbol GND 1 at (34.29, 17.78)` — both
 * of those last two were produced by a real run and are quoted in **G191**.
 */
const NAMES: readonly { readonly name: string; readonly category: ObstacleCategory }[] = [
  { name: "wire 3 of oc-power", category: "wire" },
  { name: "anchor GND 0", category: "label-outline" },
  { name: "body of R1#1", category: "body" },
  { name: "bodies of R1#1 and R2#1", category: "body" },
  { name: "glyph of power symbol GND 1 at (20.32, 21.59)", category: "power-glyph" },
  { name: "value of power symbol GND 1 at (34.29, 17.78)", category: "field-text" },
  { name: "label OUT at (39.37, 19.05)", category: "label-outline" },
  { name: "Reference R1 at (10.16, 5.08)", category: "field-text" },
  { name: "Value 10k at (10.16, 7.62)", category: "field-text" },
  { name: "sheet text 0 at (10.16, 5.08)", category: "field-text" },
  { name: "frame Block", category: "frame-border" },
  { name: "no-connect at U1.5", category: "no-connect-marker" },
  { name: "DNP cross C2#1", category: "dnp-cross" },
  { name: "pin name IN of U1#1", category: "pin-name" },
  { name: "pin number 5 of U1#1", category: "pin-number" },
  { name: "pin end R1.2", category: "pin-line" },
  { name: "junction at (20.32, 21.59)", category: "junction" },
  { name: "interior graphic of U1#1", category: "interior-graphic" },
  { name: "R1.2 at (10.16, 7.62)", category: "pin-line" },
]

test("every classification rule fires on a name its cited producer really writes", () => {
  expect(NAMES.length).toBeGreaterThan(14)
  for (const { name, category } of NAMES) expect(categoryOf(name), name).toBe(category)
})

test("every obstacle category the matrix declares is reachable by some rule", () => {
  const reached = new Set(NAMES.map((n) => n.category))
  // `pwr-flag-glyph` is the one category no rule distinguishes: `glyphPair` writes "glyph of power
  // symbol …" for a PWR_FLAG too, and nothing in the name says `flag: true`. It is recorded here
  // rather than left as an unexplained hole, because a census that silently filed every flag glyph
  // as a plain power glyph would under-report the pwr-flag row of the matrix.
  const unreachable = ALL_CATEGORIES.filter((c) => !reached.has(c))
  expect(unreachable).toEqual(["pwr-flag-glyph"])
})

test("a name no transcribed rule reads is REPORTED as unclassified, never guessed at", () => {
  expect(categoryOf("something nothing writes")).toBeNull()
  expect(categoryOf("")).toBeNull()
  // And a near-miss of a real form is not quietly swept into the nearest category.
  expect(categoryOf("wires 3 of B")).toBeNull()
})

/**
 * The census end to end over one real parity circuit, through the real `elkjs`.
 *
 * **It is one case and not all four for run time**, and one is enough for what this test is for:
 * the instrument resolves symbols, builds graphs, drives the worker, adapts every block and
 * classifies whatever comes back. What it measures is **G191**'s business, not this test's.
 */
test("the census runs end to end over a real circuit and accounts for every block", async () => {
  const first = PARITY_CASES[0]
  expect(first, "there must be a parity case to run over").toBeDefined()
  if (first === undefined) return
  const census = await obstacleCensus([first])
  expect(census.blocks).toBe(first.authoring.blocks.length)
  expect(census.blocks).toBeGreaterThan(0)
  // Every block is accounted for exactly once: drawn, refused before the clearance checks, or
  // reaching them. A block that fell out of all three would be a block the census lost.
  expect(census.drawn + census.refusedBefore.length + census.reachedClearance.length).toBe(census.blocks)
  // The canonicalisation counts are internally consistent with the wire lists they describe.
  for (const c of census.counts) {
    expect(c.after, c.block).toBe(c.before - c.collapsed - c.zeroLength - c.contained)
    expect(c.before, c.block).toBeGreaterThan(0)
  }
  // Nothing was dropped for want of a classification rule.
  expect(census.unclassified).toEqual([])
}, 120_000)
