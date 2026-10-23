/**
 * **THE ROUND TRIP: spec §2's complete contract, as five separately reported comparisons between
 * a circuit model and the netlist `kicad-cli` exports from the schematic generated FROM that
 * model.** Hand-written for Task 11 of the M1 schematic-authoring plan; the pedals project has
 * no counterpart, so nothing byte-checks this file.
 *
 * ---
 *
 * **TWO WARNINGS BEFORE THE API, because they bound what a green result means.**
 *
 * **1. A CERTIFICATE VERIFIES WHAT IT WAS GIVEN, NOT WHAT YOU MEANT.** A tool in this
 * repository's history whose input format could not express a rotary selector drew *"an excellent
 * picture of a circuit that is not the Pultec"* - and its round-trip certificate was blind to it,
 * because the substitution happened UPSTREAM of the model this check compares against. Everything
 * here is self-consistency: the drawing agrees with the model it was drawn from. **The chain is
 * only as good as the link that checks the MODEL against the AUTHORED schematic, and that link is
 * the committed-netlist comparison (`tools/perfboard/netlist-sync.ts` and the `.net` fixtures
 * under `tests/fixtures/`), not this.** A generator that mangles a circuit the same way at both
 * ends passes every comparison below happily.
 *
 * **2. A SCHEMATIC CAN EXPORT A CORRECT NETLIST WHILE VISUALLY SUGGESTING WRONG CONNECTIONS.**
 * Wires that pass through a pin without a junction, a label sitting a grid step off the wire it
 * appears to name, two symbols overlapping - none of it moves the netlist. **The round trip is
 * NOT a readability gate and must never be reported as one.** What judges the drawing is
 * `lib/schgen/render/`'s clearance and sheet checks, and a person looking at the PDF.
 *
 * ---
 *
 * **WHY FIVE COMPARISONS AND NOT ONE.** `tests/circuits/kicad-round-trip.ts`'s
 * `expectSameCircuit` already compares three things in one assertion: the net partition as sorted
 * `designator.pin` sets ignoring net names, a designator-to-value map, and each component's
 * footprint. Spec §2 adds two and sharpens one, and the reason each is separate is that the one
 * before it cannot see what it sees:
 *
 * | compared | what the ones before it cannot see |
 * | --- | --- |
 * | `componentIdentity` | a net partition is over `designator.pin` STRINGS, so a component the schematic has and the model does not - on no net, or consistently swapped with another - leaves the partition untouched |
 * | `pinIdentity` | knowing the right designators are present fixes the pad COUNT and nothing else; the symbol a designator is drawn with is what fixes which pin is which, and a swap to another symbol with the same numbering changes no net |
 * | `netMembership` | values and symbols can all agree while a wire lands on the wrong pin |
 * | `values` | a correct topology with a wrong capacitor is a correct netlist |
 * | `footprints`, WHERE DECLARED | a footprint is not in the connectivity at all |
 *
 * **AND `footprintsUndeclared` IS REPORTED SEPARATELY AND IS NOT A PASS.** A part the model
 * declares no footprint for has nothing to compare, so `footprints` says nothing about it. An
 * empty `footprints` over a circuit where half the parts declare none would otherwise read as
 * agreement; `docs/known-gaps.md` **G152** measured one of this repository's four parity circuits
 * declaring a footprint on 0 of its 37 components, so that is not a hypothetical.
 *
 * **WHAT EACH COMPARISON DOES NOT SEE, said once.** `pinIdentity` compares the SYMBOL NAME, not
 * pin functions: `importNetlist` does not read a node's `pinfunction`, so a symbol that keeps its
 * lib id and has its pin NAMES edited is invisible here (gate 6, `gates/pin-identity.ts`, is what
 * compares a symbol's pin names against a datasheet table). `netMembership` ignores net NAMES by
 * design, so an interface net renamed with its topology intact passes it - gate 3,
 * `gates/connectivity.ts`, is what compares names, and it is a strictly stronger check that needs
 * the IR's net classification rather than only a netlist.
 */

import type { ImportedNetlist } from "../../kicad/netlist.ts"
import type { Circuit, IrPart, PartLabel } from "../ir/types.ts"

/** Spec §2's complete contract, as five separately reported comparisons. */
export interface RoundTripProblems {
  readonly componentIdentity: readonly string[]
  readonly pinIdentity: readonly string[]
  readonly netMembership: readonly string[]
  readonly values: readonly string[]
  readonly footprints: readonly string[]
  /** Components with no declared part: compared against nothing, and NOT a pass. */
  readonly footprintsUndeclared: readonly string[]
}

/** The symbol's entry name, which is what a netlist's `libsource` records. `Device:R` -> `R`. */
function symbolEntry(libId: string): string {
  const sep = libId.indexOf(":")
  return sep < 0 ? libId : libId.slice(sep + 1)
}

/**
 * A partition as a sorted list of sorted member strings - a MULTISET, so two nets that happen to
 * carry the same members are two entries and not one.
 */
function partitionOf(sets: readonly (readonly string[])[]): string[] {
  return sets.map((members) => [...members].sort().join(" ")).sort()
}

/**
 * The model's own partition, in the same shape the export's is read in.
 *
 * **A NOT-CONNECTED PIN IS A ONE-MEMBER SET, not an omission**, because that is how the export
 * carries it: `kicad-cli` gives every unconnected pin its own `unconnected-(REF-PadN)` net. Were
 * they dropped from this side only, a pin the model declares not connected and the schematic wires
 * to a rail would change the export's partition and not the model's, and the comparison would
 * report it as a stray net instead of as the wrong thing.
 */
function modelPartition(c: Circuit, refs: ReadonlyMap<PartLabel, string>): string[] {
  const byNet = new Map<string, string[]>()
  const unconnected: string[][] = []
  for (const pin of c.pins) {
    const ref = refs.get(pin.part)
    if (ref === undefined) continue
    const node = `${ref}.${pin.pin}`
    if (pin.net === null) unconnected.push([node])
    else byNet.set(pin.net, [...(byNet.get(pin.net) ?? []), node])
  }
  return partitionOf([...byNet.values(), ...unconnected])
}

/** Part label -> designator, for every part, with the parts that have none reported. */
function designators(
  c: Circuit,
  refs: ReadonlyMap<PartLabel, string>,
  problems: string[],
): Map<PartLabel, string> {
  const out = new Map<PartLabel, string>()
  for (const part of orderedParts(c)) {
    const ref = refs.get(part.label)
    if (ref === undefined) {
      problems.push(`part ${part.label} has no reference designator in the model's reference lock`)
      continue
    }
    out.set(part.label, ref)
  }
  return out
}

function orderedParts(c: Circuit): readonly IrPart[] {
  return [...c.parts.values()].sort((a, b) => a.order - b.order)
}

/** Pin numbers the model declares for each designator, including the not-connected ones. */
function modelPins(c: Circuit, refOf: ReadonlyMap<PartLabel, string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const pin of c.pins) {
    const ref = refOf.get(pin.part)
    if (ref === undefined) continue
    const seen = out.get(ref)
    if (seen === undefined) out.set(ref, new Set([pin.pin]))
    else seen.add(pin.pin)
  }
  return out
}

/** Pin numbers the export puts on some net, per designator. */
function exportedPins(exported: ImportedNetlist): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const members of Object.values(exported.nets)) {
    for (const member of members) {
      const dot = member.lastIndexOf(".")
      if (dot < 0) continue
      const ref = member.slice(0, dot)
      const pin = member.slice(dot + 1)
      const seen = out.get(ref)
      if (seen === undefined) out.set(ref, new Set([pin]))
      else seen.add(pin)
    }
  }
  return out
}

const sorted = (xs: Iterable<string>): string[] => [...xs].sort()

/**
 * Compare a circuit model against the netlist exported from the schematic generated from it.
 *
 * Every list is sorted and stable, so a caller can print or diff them. Nothing throws: a
 * disagreement is a problem string, which is what makes this usable from a gate runner.
 */
export function roundTrip(
  c: Circuit,
  refs: ReadonlyMap<PartLabel, string>,
  exported: ImportedNetlist,
): RoundTripProblems {
  const componentIdentity: string[] = []
  const refOf = designators(c, refs, componentIdentity)

  const inModel = new Set(refOf.values())
  const inSchematic = new Set(exported.components.map((x) => x.designator))
  for (const ref of sorted(inSchematic)) {
    if (ref.includes("?")) componentIdentity.push(`reference ${ref} in the schematic is unannotated`)
    else if (!inModel.has(ref)) componentIdentity.push(`reference ${ref} is in the schematic but not in the model`)
  }
  for (const ref of sorted(inModel)) {
    if (!inSchematic.has(ref)) componentIdentity.push(`reference ${ref} is in the model but not in the schematic`)
  }

  const componentOf = new Map(exported.components.map((x) => [x.designator, x]))
  const schematicPins = exportedPins(exported)
  const declaredPins = modelPins(c, refOf)

  const pinIdentity: string[] = []
  const values: string[] = []
  const footprints: string[] = []
  const footprintsUndeclared: string[] = []

  for (const part of orderedParts(c)) {
    const ref = refOf.get(part.label)
    if (ref === undefined) continue
    const component = componentOf.get(ref)
    // A designator the schematic does not have is componentIdentity's finding, reported once
    // there; comparing nothing against it here would double-count it.
    if (component === undefined) continue

    const want = symbolEntry(part.libId)
    const drawn = component.libPart
    if (drawn === undefined) {
      pinIdentity.push(`${ref} has no symbol in the schematic's netlist, so nothing fixes its pin numbering; the model says "${want}"`)
    } else if (drawn !== want) {
      pinIdentity.push(`${ref} is drawn with symbol "${drawn}" but the model says "${want}"`)
    }
    const expectPins = sorted(declaredPins.get(ref) ?? [])
    const actualPins = sorted(schematicPins.get(ref) ?? [])
    if (expectPins.join(",") !== actualPins.join(",")) {
      pinIdentity.push(`${ref} pin numbers: model [${expectPins.join(", ")}] vs schematic [${actualPins.join(", ")}]`)
    }

    if (component.value !== part.value) {
      values.push(`${ref}: the schematic says "${component.value}" and the model says "${part.value}"`)
    }

    if (part.footprint.trim() === "") {
      footprintsUndeclared.push(part.label)
      continue
    }
    if (component.footprint !== part.footprint) {
      footprints.push(
        `${ref}: the schematic says footprint "${component.footprint ?? "<none>"}" and the model says "${part.footprint}"`,
      )
    }
  }

  const netMembership: string[] = []
  const model = modelPartition(c, refs)
  const schematic = partitionOf(Object.values(exported.nets))
  if (model.join("\n") !== schematic.join("\n")) {
    const onlyModel = withoutOnce(model, schematic)
    const onlySchematic = withoutOnce(schematic, model)
    for (const set of onlyModel) netMembership.push(`the model connects [${set}] and the schematic does not`)
    for (const set of onlySchematic) netMembership.push(`the schematic connects [${set}] and the model does not`)
  }

  return {
    componentIdentity,
    pinIdentity,
    netMembership,
    values,
    footprints,
    footprintsUndeclared: footprintsUndeclared.sort(),
  }
}

/** `a` minus `b` as MULTISETS: an entry in `a` twice and in `b` once survives once. */
function withoutOnce(a: readonly string[], b: readonly string[]): string[] {
  const remaining = new Map<string, number>()
  for (const x of b) remaining.set(x, (remaining.get(x) ?? 0) + 1)
  const out: string[] = []
  for (const x of a) {
    const n = remaining.get(x) ?? 0
    if (n > 0) remaining.set(x, n - 1)
    else out.push(x)
  }
  return out
}
