import { test, expect } from "bun:test"
import {
  MODULE_OWNERS,
  OWNERSHIP,
  boundaryConductors,
  externalPorts,
  partitionReference,
} from "../../circuits/pultec/partition.ts"
import { THREE_BAND_REFERENCE } from "../../circuits/pultec/electrical/three-band.ts"
import { assertSameTopology, componentNets, partitionTopology } from "../../lib/model/topology.ts"

test("every element is owned exactly once, by a declared module", () => {
  const refs = THREE_BAND_REFERENCE.components.map(c => c.id).sort()
  expect(Object.keys(OWNERSHIP).sort()).toEqual(refs)
  for (const owner of Object.values(OWNERSHIP)) {
    expect(MODULE_OWNERS).toContain(owner)
  }
})

test("partitioning preserves the reference exactly", () => {
  const split = partitionReference()
  const recomposed = {
    ports: split.ports,
    components: Object.values(split.modules).flat().reverse(),
  }
  // Reversed on purpose: recomposition must not depend on element order.
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, recomposed)).not.toThrow()
})

test("all five modules are populated", () => {
  const split = partitionReference()
  expect(Object.keys(split.modules).sort()).toEqual([
    "hi-boost", "hi-cut", "low-boost", "low-cut", "mid",
  ])
  // Hi boost carries its capacitor bank, Qmax, the winding modelled per tap,
  // both pots and one pole of the high frequency selector.
  const hiBoost = new Set(split.modules["hi-boost"]?.map(c => c.id) ?? [])
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

test("ground became a boundary net once the mid section returned to it", () => {
  // It was not one while only low boost touched ground. The mid's cut return
  // and input shunt now land there too, so ground crosses a module boundary and
  // needs a conductor between the boards rather than just a local connection.
  // It remains an external port either way, which is the case the plan flags:
  // a port still has to reach the outside world even when one board owns it.
  expect(boundaryConductors().map(c => c.net)).toContain("0")
  expect(Object.values(externalPorts())).toContain("0")

  const split = partitionReference()
  const groundOwners = new Set(
    Object.entries(split.modules)
      .filter(([, components]) =>
        components.some(c => componentNets(c).includes("0")))
      .map(([owner]) => owner),
  )
  expect([...groundOwners].sort()).toEqual(["low-boost", "mid"])
})

test("hi_boost_out is where four sections meet", () => {
  // Hi boost's output, lo cut's and hi cut's inputs, and the mid rheostat all
  // land on this node. It is the busiest conductor in the partition.
  const junction = boundaryConductors().find(c => c.net === "hi_boost_out")
  if (!junction) throw new Error("hi_boost_out is not a boundary net")
  expect([...junction.owners].sort()).toEqual(["hi-boost", "hi-cut", "low-cut", "mid"])
})

test("every external port is reachable from the partitioned modules", () => {
  const split = partitionReference()
  const owned = new Set(
    Object.values(split.modules).flat().flatMap(c => componentNets(c)),
  )
  for (const net of Object.values(THREE_BAND_REFERENCE.ports)) {
    expect(owned.has(net)).toBe(true)
  }
})
