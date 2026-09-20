import { test, expect } from "bun:test"
import {
  MODULE_OWNERS,
  OWNERSHIP,
  boundaryConductors,
  externalPorts,
  partitionReference,
} from "../../reference/pultec/partition.ts"
import { THREE_BAND_REFERENCE } from "../../reference/pultec/three-band.ts"
import { assertSameTopology, partitionTopology } from "../../lib/passives/topology.ts"

test("every element is owned exactly once, by a declared module", () => {
  const refs = THREE_BAND_REFERENCE.elements.map(e => e.ref).sort()
  expect(Object.keys(OWNERSHIP).sort()).toEqual(refs)
  for (const owner of Object.values(OWNERSHIP)) {
    expect(MODULE_OWNERS).toContain(owner)
  }
})

test("partitioning preserves the reference exactly", () => {
  const split = partitionReference()
  const recomposed = {
    ports: split.ports,
    elements: Object.values(split.modules).flat().reverse(),
  }
  // Reversed on purpose: recomposition must not depend on element order.
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, recomposed)).not.toThrow()
})

test("all four modules are populated", () => {
  const split = partitionReference()
  expect(Object.keys(split.modules).sort()).toEqual([
    "hi-boost", "hi-cut", "low-boost", "low-cut",
  ])
  // Hi boost carries its capacitor bank, Qmax, the winding modelled per tap,
  // both pots and one pole of the high frequency selector.
  const hiBoost = new Set(split.modules["hi-boost"]?.map(e => e.ref) ?? [])
  for (const ref of ["C14", "R3", "RV_HI_BOOST", "RV_HI_Q", "SW_HI_BOOST",
                     "L_HI_BOOST_600MH", "L_HI_BOOST_100MH"]) {
    expect(hiBoost.has(ref)).toBe(true)
  }
})

test("a mis-typed owner is rejected rather than making a phantom module", () => {
  expect(() =>
    partitionTopology(
      THREE_BAND_REFERENCE,
      { ...OWNERSHIP, R1: "hi-kut" },
      { allowedOwners: MODULE_OWNERS },
    ),
  ).toThrow("Unknown owner: hi-kut")
})

test("the connector table accounts for every boundary crossing", () => {
  const conductors = boundaryConductors()
  const nets = conductors.map(c => c.net)

  // The internal signal nodes are shared between modules and must each become
  // a conductor between boards.
  expect(nets).toContain("hi_boost_out")
  expect(nets).toContain("lo_boost_in")
  expect(nets).toContain("out")

  for (const conductor of conductors) {
    expect(conductor.owners.length).toBeGreaterThan(1)
    expect(conductor.terminals.length).toBeGreaterThan(0)
  }
})

test("ground is an external port, not an inter-module boundary, in this scope", () => {
  // Every element on ground is a low-boost element — the Cboost bank and the
  // low boost pot's ccw end — so ground crosses no module boundary here. It is
  // still a conductor every board needs physically, which is why the plan
  // insists external ports are routed even when a single board owns them. In
  // the complete circuit the hi boost inductor and the mid section also return
  // to ground, and it would become a boundary net; both are out of scope.
  expect(boundaryConductors().map(c => c.net)).not.toContain("0")
  expect(Object.values(externalPorts())).toContain("0")

  const split = partitionReference()
  const groundOwners = new Set(
    Object.entries(split.modules)
      .filter(([, elements]) =>
        elements.some(e => Object.values(e.pins).includes("0")))
      .map(([owner]) => owner),
  )
  expect([...groundOwners]).toEqual(["low-boost"])
})

test("hi_boost_out is the low-cut / hi-cut / hi-boost junction", () => {
  const junction = boundaryConductors().find(c => c.net === "hi_boost_out")
  if (!junction) throw new Error("hi_boost_out is not a boundary net")
  expect([...junction.owners].sort()).toEqual(["hi-boost", "hi-cut", "low-cut"])
})

test("every external port is reachable from the partitioned modules", () => {
  const split = partitionReference()
  const owned = new Set(
    Object.values(split.modules).flat().flatMap(e => Object.values(e.pins)),
  )
  for (const net of Object.values(THREE_BAND_REFERENCE.ports)) {
    expect(owned.has(net)).toBe(true)
  }
})
