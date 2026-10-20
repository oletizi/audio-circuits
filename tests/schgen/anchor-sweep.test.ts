import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import {
  ANCHOR_DOC,
  ANCHOR_ROLES,
  anchorSweepOf,
  renderAnchorSweep,
} from "../../tools/schgen/anchor-sweep.ts"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"
import { VERDICT_KINDS, type VerdictKind } from "../../tools/schgen/parity.ts"

/**
 * **THE SECOND COLUMN OF THE TEMPLATE-APPLICABILITY MEASUREMENT.** Same measurement as
 * `parity.test.ts` - spec §5.1's, the one with NO TARGET - read a second way: with an anchor
 * brute-forced over each block's own member units, rather than as the circuits are declared.
 *
 * **NOTHING HERE PINS THE PASS RATE EITHER.** What is asserted is the sweep's structure, the
 * exhaustiveness of its probe space against an independently computed count, and the guard that
 * makes `ANCHOR_ROLES` honest. **The one figure asserted as a value is that the sweep finds at
 * least one realised probe**, and that is not a target: it is the discrimination check that stops
 * *"4658 not-applicable"* being read off a sweep that could not have found anything.
 */

const SWEEP = anchorSweepOf(PARITY_CASES, parityResolver())

/**
 * The size of the probe space, counted independently of the sweep's own loop: for every member
 * unit of every declared block, the number of injective assignments of each template's roles to
 * that unit's IR pins. A unit the sweep failed to visit, or a role assignment it failed to
 * enumerate, moves one side of the comparison only.
 */
function expectedProbes(): number {
  const symbols = parityResolver()
  const permutations = (n: number, k: number): number => {
    let x = 1
    for (let i = 0; i < k; i += 1) x *= n - i
    return Math.max(x, 0)
  }
  let total = 0
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const declaration of c.authoring.blocks) {
      const block = circuit.blocks.get(declaration.id)
      if (block === undefined) throw new Error(`${c.name}: the IR has no block ${declaration.id}`)
      for (const member of block.members) {
        const pins = circuit.pins.filter((p) => p.part === member.part && p.unit === member.unit).length
        for (const roles of ANCHOR_ROLES.values()) total += permutations(pins, roles.length)
      }
    }
  }
  return total
}

test("the sweep covers every declared block and its whole probe space", () => {
  expect(SWEEP.blocks.length).toBe(PARITY_CASES.reduce((n, c) => n + c.authoring.blocks.length, 0))
  expect(SWEEP.blocks.length).toBeGreaterThan(0)
  expect(SWEEP.probes).toBe(expectedProbes())
  expect(SWEEP.probes).toBeGreaterThan(0)
  // The sweep's own total must also be the sum of its rows: a block whose probes were not counted
  // would make the headline figure a sum over fewer blocks than the table shows.
  expect(SWEEP.blocks.reduce((n, b) => n + b.probes, 0)).toBe(SWEEP.probes)
  expect(SWEEP.realised + SWEEP.notApplicable + SWEEP.applied).toBe(SWEEP.probes)
  for (const b of SWEEP.blocks) expect(b.probes, b.block).toBeGreaterThan(0)
})

test("the sweep finds at least one template that draws one of this repository's blocks", () => {
  // THE DISCRIMINATION CHECK, and the reason the rest of the sweep's numbers mean anything. If
  // this goes to zero, every "not-applicable" below could be a sweep that supplies no usable
  // anchor at all rather than a template that does not fit.
  expect(SWEEP.realised).toBeGreaterThan(0)
  expect(SWEEP.drawing.length).toBeGreaterThan(0)
  const drew = SWEEP.blocks.filter((b) => b.realisedBy.length > 0)
  expect(drew.length).toBeGreaterThan(0)
  for (const b of drew) {
    expect(b.examples.length, b.block).toBe(b.realisedBy.length)
    for (const e of b.examples) {
      expect(e.kind, `${b.block}/${e.template}`).toBe("ok")
      expect(b.realisedBy, b.block).toContain(e.template)
    }
  }
})

test("drawing and stillUnexercised partition the anchor-driven templates exactly", () => {
  const all = [...ANCHOR_ROLES.keys()]
  expect([...SWEEP.drawing, ...SWEEP.stillUnexercised].sort()).toEqual([...all].sort())
  for (const id of SWEEP.drawing) expect(SWEEP.stillUnexercised, id).not.toContain(id)
  for (const id of all) expect(TEMPLATES.has(id), id).toBe(true)
  expect(all.length).toBeGreaterThan(0)
})

test("every probe that applied and failed carries a classified kind and a reason", () => {
  const applied = SWEEP.blocks.flatMap((b) => b.applied)
  const kinds: readonly VerdictKind[] = VERDICT_KINDS.filter((k) => k !== "ok" && k !== "not-applicable")
  // Non-empty on this repository today; the assertion is guarded so it cannot pass over nothing.
  expect(applied.length, "no probe applied and failed, so this sweep proves nothing about them").toBeGreaterThan(0)
  for (const p of applied) {
    expect([...kinds], `${p.block}/${p.template}`).toContain(p.kind)
    expect(p.reason.length, `${p.block}/${p.template}`).toBeGreaterThan(0)
  }
})

test("a wrong ANCHOR_ROLES entry refuses rather than measuring a missing-role refusal", () => {
  // The guard that makes the restated role table honest, driven. `crystal` reads roles a and b; a
  // table claiming it reads "x" makes every crystal probe report "crystal needs an anchor with
  // roles a and b", which would be counted as not-applicable and read as "the idiom does not fit".
  expect(() => anchorSweepOf(PARITY_CASES, parityResolver(), new Map([["crystal", ["x"]]]))).toThrow(
    /ANCHOR_ROLES names the wrong roles for crystal/,
  )
})

test("an empty roles table refuses rather than reporting 0 of 0", () => {
  // A sweep over nothing would print "0 realised" and look exactly like a result.
  expect(() => anchorSweepOf(PARITY_CASES, parityResolver(), new Map())).toThrow(
    /the roles table is empty, so this sweep would probe nothing/,
  )
})

test("a subset of the roles table sweeps only those templates, so the table is what is measured", () => {
  const only = anchorSweepOf(PARITY_CASES, parityResolver(), new Map([["connector-fanout", []]]))
  expect([...only.drawing, ...only.stillUnexercised]).toEqual(["connector-fanout"])
  expect(only.probes).toBeLessThan(SWEEP.probes)
  expect(only.probes).toBeGreaterThan(0)
})

test("the rendered sweep says which measurement it is and names every block", () => {
  const text = renderAnchorSweep(SWEEP)
  expect(text).toContain("TEMPLATE APPLICABILITY, a MEASUREMENT WITH NO TARGET")
  for (const other of ["port parity", "ELK coverage", "integrated correctness"]) {
    expect(text, other).toContain(other)
  }
  expect(text).toContain("It chooses no arrangement, writes no declaration and emits no schematic.")
  for (const b of SWEEP.blocks) expect(text, b.block).toContain(b.block)
})

test("the committed sweep document is this run's output, compared by content", () => {
  const file = path.join(path.resolve(import.meta.dir, "..", ".."), ANCHOR_DOC)
  expect(
    fs.readFileSync(file, "utf8"),
    `${ANCHOR_DOC} is stale. Regenerate it with \`bun run schgen-anchors\`. These are MEASURED ` +
      "numbers: they move with a circuit, a declaration, a template - and with the installed KiCad, " +
      "because 15 of the 22 lib ids a drawing needs are pinned by nothing (docs/known-gaps.md G158).",
  ).toBe(renderAnchorSweep(SWEEP))
})
