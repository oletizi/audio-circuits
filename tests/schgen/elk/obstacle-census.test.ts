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

/**
 * **`pwr-flag-glyph` CANNOT BE CLASSIFIED FROM AN OBSTACLE NAME, AND THIS ASSERTS IT OF THE CENSUS's
 * OWN RULES.**
 *
 * **Round 2's version of this test did not hold that claim.** It computed `unreachable` from this
 * file's own `NAMES` table, so a reviewer who added a real `pwr-flag-glyph` rule to
 * `obstacle-census.ts` watched the test **stay green** - it reddened only when the *fixture table*
 * changed. It pinned the matrix vocabulary and the table, not the census's behaviour, while its
 * comment claimed the census could not tell a flag glyph apart.
 *
 * This version asks `categoryOf` directly. `glyphPair` (`render/glyph-clearance.ts`) writes
 * *"glyph of power symbol …"* for a `PWR_FLAG` exactly as it does for a `GND`, and nothing in the
 * name carries `flag: true` - so a flag glyph classifies as `power-glyph` and the matrix's
 * `pwr-flag-glyph` row gets no evidence from this instrument. **If someone teaches the census to
 * tell them apart, this goes red**, which is the behaviour round 2 claimed and did not have.
 */
test("a PWR_FLAG glyph classifies as power-glyph, so the pwr-flag row gets no evidence here", () => {
  const flag = "glyph of power symbol PWR_FLAG 0 at (20.32, 21.59)"
  const rail = "glyph of power symbol GND 1 at (20.32, 21.59)"
  expect(categoryOf(flag)).toBe("power-glyph")
  expect(categoryOf(rail)).toBe("power-glyph")
  expect(categoryOf(flag)).toBe(categoryOf(rail))
  // And `pwr-flag-glyph` is a category the matrix really declares, so this is a gap and not a typo.
  expect(ALL_CATEGORIES).toContain("pwr-flag-glyph")
})

test("every other obstacle category the matrix declares is reachable by some rule", () => {
  const reached = new Set(NAMES.map((n) => n.category))
  expect(ALL_CATEGORIES.filter((c) => !reached.has(c))).toEqual(["pwr-flag-glyph"])
})

test("a name no transcribed rule reads is REPORTED as unclassified, never guessed at", () => {
  expect(categoryOf("something nothing writes")).toBeNull()
  expect(categoryOf("")).toBeNull()
  // And a near-miss of a real form is not quietly swept into the nearest category.
  expect(categoryOf("wires 3 of B")).toBeNull()
})

/**
 * The census end to end over every real parity circuit, through the real `elkjs`.
 *
 * **IT WAS ONE CASE UNTIL 2026-10-26 AND THAT MADE THE CENSUS'S OWN NON-VACUITY GUARD FIRE**
 * (`docs/known-gaps.md` **G296**). The case was `PARITY_CASES[0]`, chosen *"for run time"*, which
 * is `opamp-buffer`; `ob-buffer` started drawing, so **nothing in the subject reached the
 * clearance checks at all** and the guard below - `reachedClearance > 0` - went red. That guard
 * working is the whole reason it is there.
 *
 * **ONE CASE WAS NEVER THE RIGHT SUBJECT FOR THIS TEST and the run-time reason does not hold.**
 * `[RAN]` all four cases: **1.6 seconds**. One case also made the `unclassified` assertion
 * vacuous in a way nobody could see - `opamp-buffer` classifies nothing because it refuses
 * nothing, so an obstacle name the census could not read would have passed. Over all four it
 * refused FIVE names, which is what found the two missing `NAME_RULES` and the wrong citation on
 * a third.
 */
test("the census runs end to end over every real circuit and accounts for every block", async () => {
  const census = await obstacleCensus(PARITY_CASES)
  expect(census.blocks).toBe(PARITY_CASES.reduce((n, c) => n + c.authoring.blocks.length, 0))
  expect(census.blocks).toBe(12)
  // Every block is accounted for exactly once: drawn, refused before the clearance checks, or
  // reaching them. A block that fell out of all three would be a block the census lost.
  expect(census.drawn + census.refusedBefore.length + census.reachedClearance.length).toBe(census.blocks)
  // The canonicalisation counts are internally consistent with the wire lists they describe.
  for (const c of census.counts) {
    // The three merges REMOVE and R33's split ADDS, so the sign matters.
    expect(c.after, c.block).toBe(c.before - c.collapsed - c.zeroLength - c.contained + c.split)
    expect(c.before, c.block).toBeGreaterThan(0)
  }
  // **Nothing was dropped for want of a classification rule, AND THIS ASSERTION IS NO LONGER
  // VACUOUS.** Round 3 recorded it as vacuous - 0 of 12 blocks reached `checkLayout`, so the list
  // was empty because nothing had been classified - and pinned the 0 so that the day it changed
  // would be visible. **Ruling R33 changed it**, and this is that tripwire being spent: blocks now
  // reach the clearance checks, their problems are classified, and an obstacle name the census
  // cannot read would now show up here.
  expect(census.unclassified).toEqual([])
  // **THE TEETH, AND THEY ARE THINNER AGAIN THAN THEY WERE YESTERDAY** (**G297**). Reaching
  // `checkLayout` is what lets a problem be classified at all. It used to be `[RAN]` **exactly ONE
  // pair across the whole corpus** (`body`/`label-outline`, on one block - docs/known-gaps.md
  // G191); it reached **FOUR pairs over THREE blocks** at G296 and is **THREE pairs over TWO
  // blocks** now, every one of them a cell the matrix records a CHECK for rather than a reason.
  //
  // **`field-text|pin-line` IS THE PAIR THAT LEFT, AND IT LEFT WITH `tp-leg-upper`.** That block
  // was the only one in the corpus whose problems named a pin line - its `VCC` value over
  // `pin R1.1` - and the same change that made it draw took the pair's only real-geometry witness
  // out of the census. **So G125's *"95 of 105 cells rest on reading the source"* has TWO more
  // cells with real ELK geometry behind them rather than three**, and that is a loss recorded
  // beside the gain it came with: a cell loses its witness when the block that exercised it stops
  // being refused.
  expect(census.reachedClearance).toEqual([
    "optical-compressor/oc-power", "optical-compressor/oc-audio",
  ])
  expect(census.fired.map((f) => `${f.key} ${f.coverage}`)).toEqual([
    "body|field-text checked",
    "field-text|interior-graphic checked",
    "field-text|wire checked",
  ])
  // AND THE PAIR THAT LEFT IS ASSERTED AS ABSENT BY NAME, so its return reads as a result rather
  // than as a list growing by one.
  expect(census.fired.map((f) => f.key)).not.toContain("field-text|pin-line")
  // THE BLOCKS BEHIND EACH PAIR, so a pair that stopped firing on a block fails here naming it.
  expect(census.fired.map((f) => f.blocks.join(","))).toEqual([
    "optical-compressor/oc-power",
    "optical-compressor/oc-power",
    "optical-compressor/oc-audio,optical-compressor/oc-power",
  ])
  // EVERY FIRED CELL IS ONE THE MATRIX SAYS IS CHECKED - asserted as the property rather than only
  // inside the strings above, because a cell firing with coverage `absent` would be a clearance
  // pair nothing in the matrix claims to handle, which is G125's whole subject.
  expect(census.fired.every((f) => f.coverage === "checked")).toBe(true)
  expect(census.fired.length).toBe(3)
  // AND THE GUARD THAT CAUGHT THE ONE-CASE SUBJECT IS STILL LOADED: something still reaches the
  // clearance checks, so `unclassified` above is a reading and not an empty set by construction.
  expect(census.reachedClearance.length).toBeGreaterThan(0)
}, 120_000)
