/**
 * **SPEC §2's ROUND-TRIP CONTRACT, AS FIVE SEPARATE COMPARISONS, EACH WITH A MUTATION THAT ONLY
 * IT CATCHES.** The design is the ported pedals `mini` fixture; the netlist is a real
 * `kicad-cli sch export netlist --format kicadsexpr` of the schematic this repository's own
 * generator emitted for it.
 *
 * **IT USES THE REAL `kicad-cli` AND FAILS RATHER THAN SKIPS WHEN IT IS MISSING.** That is the
 * convention `tests/circuits/kicad-round-trip.ts` already sets and the owner's directive
 * (`docs/known-gaps.md` **G169**) requires: KiCad is a dependency here, and a check that skips
 * when its tool is absent cannot be told apart from one that passed. `KICAD_CLI` is the variable
 * to set; `lib/kicad/install.ts` holds the per-platform defaults and nothing here writes a path.
 *
 * **WHY FIVE AND NOT ONE.** `tests/circuits/kicad-round-trip.ts`'s `expectSameCircuit` compares
 * three things (the net partition, values, footprints) in one assertion. The spec's contract adds
 * component identity and pin identity and splits the footprint claim, and it is the SEPARATION
 * that has the teeth: a mutation that only one comparison can see proves that comparison is
 * carrying its own weight rather than riding on a neighbour's. The mutations below are therefore
 * built to be invisible to the other four, and `roundTrip`'s module comment states what each
 * comparison does and does not see.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"
import { miniInScratch } from "../__fixtures__/designs/mini/run.ts"
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import type { ImportedComponent, ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { importNetlist } from "../../../lib/kicad/netlist.ts"
import type { Circuit, IrPart, PartLabel } from "../../../lib/schgen/ir/types.ts"
import { roundTrip } from "../../../lib/schgen/gates/round-trip.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { generate, writeGeneration, type GenerateEnv } from "../../../tools/schgen/generate.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"

afterAll(cleanUpTempScratch)

const env = (): GenerateEnv => ({
  kicadVersion: kicadVersion(),
  stockDir: stockSymbolDir(),
  initLock: true,
  acceptToolchain: false,
})

function requireKicadCli(): void {
  if (fs.existsSync(KICAD_CLI)) return
  throw new Error(
    `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts ` +
      "holds the per-platform defaults). This test does NOT skip: the round trip is the only " +
      "proof KiCad reads the generated schematic the way the model means it, and a skipped check " +
      "that resembles a passing one is the failure this workflow exists to prevent.",
  )
}

interface Generated {
  readonly circuit: Circuit
  readonly refs: ReadonlyMap<PartLabel, string>
  readonly exported: ImportedNetlist
}

/** The ONE generation and the ONE kicad-cli export every case below mutates a copy of. */
let g: Generated | null = null

const generated = (): Generated => {
  if (g === null) throw new Error("the mini design was not generated")
  return g
}

beforeAll(async () => {
  requireKicadCli()
  const d = miniInScratch()
  const generation = await generate(d, env())
  writeGeneration(d, generation)
  const net = exportSexprNetlist(path.join(d.outDir, `${d.spec.project}.kicad_sch`))
  g = { circuit: generation.circuit, refs: generation.annotation.refs, exported: importNetlist(net.text) }
}, 180_000)

/** `exported` with one component's record replaced, found by designator. */
function withComponent(n: ImportedNetlist, designator: string, edit: (c: ImportedComponent) => ImportedComponent): ImportedNetlist {
  const found = n.components.find((c) => c.designator === designator)
  if (found === undefined) throw new Error(`the export has no component ${designator}`)
  return { ...n, components: n.components.map((c) => (c.designator === designator ? edit(c) : c)) }
}

/** The designator of the first IR part satisfying `pick`, through the generation's own refs. */
function designatorOf(pick: (p: IrPart) => boolean): string {
  const { circuit, refs } = generated()
  for (const part of [...circuit.parts.values()].sort((a, b) => a.order - b.order)) {
    if (!pick(part)) continue
    const ref = refs.get(part.label)
    if (ref === undefined) throw new Error(`part ${part.label} has no reference`)
    return ref
  }
  throw new Error("no IR part matched")
}

/** The names of the two nets with the most members, which are the two safest to move a pin between. */
function twoBiggestNets(n: ImportedNetlist): readonly [string, string] {
  const bySize = Object.entries(n.nets)
    .filter(([, members]) => members.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))
  const [first, second] = bySize
  if (first === undefined || second === undefined) throw new Error("the export has fewer than two multi-pin nets")
  return [first[0], second[0]]
}

describe("the round trip over the generated mini design", () => {
  it("agrees on all five comparisons, with no component left uncompared", () => {
    const { circuit, refs, exported } = generated()
    const p = roundTrip(circuit, refs, exported)
    expect(p.componentIdentity).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.netMembership).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints).toEqual([])
    // Not a pass by omission: every part of this design declares a footprint, so the
    // uncompared list is empty BECAUSE there is nothing uncompared.
    expect(p.footprintsUndeclared).toEqual([])
  })

  it("a component the schematic has and the model does not is caught by component identity alone", () => {
    const { circuit, refs, exported } = generated()
    // On no net, so the partition is untouched; not in the IR, so values, footprints and the
    // per-designator pin comparison never reach it.
    const extra: ImportedComponent = { designator: "R999", value: "10k", footprint: "Resistor_SMD:R_0603_1608Metric", libPart: "R" }
    const p = roundTrip(circuit, refs, { ...exported, components: [...exported.components, extra] })
    expect(p.netMembership).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints).toEqual([])
    expect(p.componentIdentity).toEqual(["reference R999 is in the schematic but not in the model"])
  })

  it("the wrong symbol under the right designator is caught by pin identity, not by the partition", () => {
    const { circuit, refs, exported } = generated()
    // A symbol swap with the pads and the wiring left alone: the netlist's ONLY record of which
    // pins a designator has, and what they mean, is its libsource. Two components swapped
    // consistently produce the same partition, and so does this.
    const u = designatorOf((part) => part.libId === "Amplifier_Operational:OPA1678")
    const p = roundTrip(circuit, refs, withComponent(exported, u, (c) => ({ ...c, libPart: "LM358" })))
    expect(p.netMembership).toEqual([])
    expect(p.componentIdentity).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints).toEqual([])
    expect(p.pinIdentity).toEqual([`${u} is drawn with symbol "LM358" but the model says "OPA1678"`])
  })

  it("a pin moved between two nets is caught by net membership alone", () => {
    const { circuit, refs, exported } = generated()
    const [from, to] = twoBiggestNets(exported)
    const members = exported.nets[from] ?? []
    const moved = members[0]
    if (moved === undefined) throw new Error(`net ${from} has no members`)
    // The pin still exists on exactly one net, so every designator keeps its own pin numbers and
    // only the PARTITION changes.
    const nets = {
      ...exported.nets,
      [from]: members.filter((m) => m !== moved),
      [to]: [...(exported.nets[to] ?? []), moved].sort(),
    }
    const p = roundTrip(circuit, refs, { ...exported, nets })
    expect(p.componentIdentity).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints).toEqual([])
    expect(p.netMembership.length).toBeGreaterThan(0)
  })

  it("a wrong capacitor on a correct topology is caught by values alone", () => {
    const { circuit, refs, exported } = generated()
    const c = designatorOf((part) => part.libId === "Device:C")
    const p = roundTrip(circuit, refs, withComponent(exported, c, (x) => ({ ...x, value: "47u" })))
    expect(p.componentIdentity).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.netMembership).toEqual([])
    expect(p.footprints).toEqual([])
    expect(p.values.length).toBe(1)
    expect(p.values[0]).toContain(`${c}: the schematic says "47u"`)
  })

  it("a wrong footprint on a correct symbol is caught by footprints alone", () => {
    const { circuit, refs, exported } = generated()
    const r = designatorOf((part) => part.libId === "Device:R")
    const p = roundTrip(circuit, refs, withComponent(exported, r, (x) => ({ ...x, footprint: "Resistor_SMD:R_0805_2012Metric" })))
    expect(p.componentIdentity).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.netMembership).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints.length).toBe(1)
    expect(p.footprints[0]).toContain("Resistor_SMD:R_0805_2012Metric")
    expect(p.footprintsUndeclared).toEqual([])
  })

  it("a component with no declared footprint is reported, not passed", () => {
    const { circuit, refs, exported } = generated()
    // The model carries no footprint for this part, so there is nothing to compare it against.
    // `footprints` staying empty must NOT read as agreement, which is why the uncompared parts
    // are a separate list.
    const label = "no_part_component"
    const donor = [...circuit.parts.values()].sort((a, b) => a.order - b.order)[0]
    if (donor === undefined) throw new Error("the mini circuit has no parts")
    const undeclared: IrPart = { ...donor, label, footprint: "", order: donor.order }
    const parts = new Map(circuit.parts)
    parts.set(label, undeclared)
    const withUndeclared: Circuit = { ...circuit, parts }
    const withRef = new Map(refs)
    withRef.set(label, "R998")
    const p = roundTrip(withUndeclared, withRef, {
      ...exported,
      components: [
        ...exported.components,
        { designator: "R998", value: donor.value, libPart: donor.libId.slice(donor.libId.indexOf(":") + 1) },
      ],
    })
    expect(p.footprints).toEqual([])
    expect(p.footprintsUndeclared).toContain(label)
  })
})
