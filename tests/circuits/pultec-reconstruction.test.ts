import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { THREE_BAND_REFERENCE } from "../../reference/pultec/three-band.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import { pultecLowCut } from "../../circuits/pultec/low-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/low-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/hi-cut.ts"
import { pultecHiBoost } from "../../circuits/pultec/hi-boost.ts"
import { pultecMid } from "../../circuits/pultec/mid.ts"

// Reversed on purpose: reconstruction must not depend on board order.
const BOARDS: readonly (() => Network)[] = [
  pultecMid, pultecHiBoost, pultecHiCut, pultecLowBoost, pultecLowCut,
]

/**
 * The five boards wired together: every board's electrical content, with the
 * terminal blocks projected away.
 *
 * Joining the boards needs no explicit step. Nets are implied by pin references
 * and the crossing nets carry the same name on every board, so two boards'
 * components naming "hi_boost_out" are already on one net the moment they sit
 * in one component list. A terminal block is where that wire physically lands,
 * which is exactly why projecting it away leaves the circuit unchanged.
 */
function reconstructed(): Network {
  const components: Component[] = []
  for (const build of BOARDS) components.push(...projectPhysical(build()).components)
  return { ports: THREE_BAND_REFERENCE.ports, components }
}

test("partitioning, physicalization and interconnection do not change the circuit", () => {
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, reconstructed())).not.toThrow()
})

test("every reference component is on exactly one board", () => {
  const counts = new Map<string, number>()
  for (const component of reconstructed().components) {
    counts.set(component.id, (counts.get(component.id) ?? 0) + 1)
  }
  const duplicated = [...counts].filter(([, n]) => n > 1).map(([id]) => id).sort()
  expect(duplicated).toEqual([])

  const missing = THREE_BAND_REFERENCE.components
    .map((c) => c.id)
    .filter((id) => !counts.has(id))
    .sort()
  expect(missing).toEqual([])
})

test("the terminal blocks are the only thing projection removes", () => {
  let projected = 0
  for (const build of BOARDS) projected += build().components.filter(physicalOnly).length
  expect(projected).toBe(BOARDS.length)
})

test("removing a board is caught, so the test is not vacuous", () => {
  const short: Network = {
    ports: THREE_BAND_REFERENCE.ports,
    components: BOARDS.slice(1).flatMap((build) => [...projectPhysical(build()).components]),
  }
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, short)).toThrow()
})
