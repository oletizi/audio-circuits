/**
 * **DOES A DRAWN SHEET STILL AGREE WITH THE CIRCUIT MODEL IT IS THE PICTURE OF?** Five separately
 * reported comparisons between a `Network` and the netlist `kicad-cli` exports from a schematic,
 * and nothing else.
 *
 * It is the standalone replacement for `lib/schgen/gates/round-trip.ts`, written so that the four
 * guards binding the five approved pages under `drafted/pultec/` to their models survive the
 * deletion of `lib/schgen/`. **It imports nothing from `lib/schgen/` or `tools/schgen/`, and that
 * is the whole point of it** - it reads a `Network`, a designator map, a pin-number map and an
 * imported netlist, all four of which exist without a schematic generator.
 *
 * ---
 *
 * **TWO WARNINGS BEFORE THE API, carried over verbatim in substance from the module this
 * replaces, because they bound what a green result means.**
 *
 * **1. A CERTIFICATE VERIFIES WHAT IT WAS GIVEN, NOT WHAT YOU MEANT.** Everything here is
 * agreement between a drawing and a model. A substitution made UPSTREAM of the model - a selector
 * the model never carried - is invisible to every comparison below. The link that checks the model
 * against the AUTHORED schematic is the committed-netlist comparison
 * (`tools/perfboard/netlist-sync.ts` and the `.net` fixtures), not this.
 *
 * **2. A SCHEMATIC CAN EXPORT A CORRECT NETLIST WHILE VISUALLY SUGGESTING WRONG CONNECTIONS.**
 * Wires passing through a pin without a junction, a label a grid step off the wire it appears to
 * name, two symbols overlapping - none of it moves the netlist. **This is NOT a readability gate
 * and must never be reported as one.** `EVALUATING-DRAWINGS.md` says who may judge a drawing.
 *
 * ---
 *
 * **WHY FIVE LISTS AND NOT ONE.** Each sees something the one before it cannot:
 *
 * | compared | what the ones before it cannot see |
 * | --- | --- |
 * | `componentIdentity` | a net partition is over `designator.pin` STRINGS, so a component the schematic has and the model does not - on no net, or consistently swapped - leaves the partition untouched |
 * | `pinIdentity` | knowing the right designators are present fixes the pad COUNT and nothing else |
 * | `netMembership` | values and pin counts can all agree while a wire lands on the wrong pin |
 * | `values` | a correct topology with a wrong capacitor is a correct netlist |
 * | `footprints`, WHERE DECLARED | a footprint is not in the connectivity at all |
 *
 * ---
 *
 * **WHAT THIS DOES NOT CARRY ACROSS FROM `round-trip.ts`, STATED RATHER THAN DISCOVERED LATER.**
 *
 * **THE SYMBOL-NAME HALF OF `pinIdentity` IS GONE.** That module also compared the netlist's
 * `libsource` part name against the lib id the generator resolved for each part, reporting
 * `X is drawn with symbol "A" but the model says "B"`. A `Network` carries `part.symbol` only
 * where a circuit chose to declare one - the generator's by-kind rule and its authoring overrides
 * are what filled the rest - so this module has no complete statement of the intended symbol to
 * compare against, and inventing one from the kind would be a second rule library living here.
 * **It is EMPTY on all five drafted Pultec pages, so an equivalence test against the old output
 * is NOT evidence that this half was carried over.** What would restore it: a model-id to lib-id
 * map, the same shape `designators` has, supplied by the caller.
 *
 * **`footprintsUndeclared` IS GONE AS A LIST, AND ITS WARNING IS NOT.** A part the model declares
 * no footprint for has nothing to compare, so `footprints` says nothing about it, and an empty
 * `footprints` over a circuit where half the parts declare none reads as agreement while being
 * silence. The parts in that state are simply skipped here; a caller that needs the count must ask
 * the `Network` for it.
 *
 * **NOTHING THROWS ON A DISAGREEMENT, AND IT DOES THROW ON A MISSING INPUT.** A disagreement is a
 * problem string, which is what makes this usable from a test or a gate runner. A component with
 * no designator, or a pin with no number, is not a disagreement - it is a question this module was
 * not given the data to ask - so it refuses by name instead of comparing nothing and passing.
 */

import type { Component, Connection, Network } from "../model/types.ts"
import type { ImportedNetlist } from "./netlist.ts"
import { valueFor } from "./value-notation.ts"

/** The five comparisons, each sorted and stable so a caller can print or diff them. */
export interface SheetAgreement {
  componentIdentity: string[]
  netMembership: string[]
  pinIdentity: string[]
  values: string[]
  footprints: string[]
}

/**
 * Library pins that are MECHANICAL MOUNT POINTS: a terminal on the symbol body that no conductor
 * inside the symbol reaches, which the electrical model is therefore not required to carry.
 *
 * **THIS IS THE SAME CLAIM `lib/schgen/ir/mechanical-pins.ts` MAKES, AND THE DUPLICATE IS
 * DELIBERATE FOR THE LENGTH OF ONE PLAN.** That file is deleted with the rest of `lib/schgen/`,
 * after the equivalence test that compares this module's output against its predecessor's on the
 * five drafted pages - which is also what checks the two tables agree while both exist. It is
 * keyed by KiCad library id, values are pin NUMBERS, and the entry below was read off KiCad
 * 10.0.5's `Switch.kicad_sym`: `MP` is the panel mounting lug, a `passive` pin with an empty name
 * at (-7.62, -5.08) whose body-side end no polyline reaches, unlike pole pin 7's.
 *
 * **WHY IT IS NEEDED AT ALL, which is not obvious.** `kicad-cli` gives every unconnected pin its
 * own `unconnected-(REF-PadN)` net, so a mount lug the model does not carry is in the EXPORT's net
 * partition. Omitting it from the model's would make the two partitions differ and be reported as
 * a schematic-only connection - the wrong finding, in the wrong list. `pinIdentity` is where the
 * model-has-fewer-pins fact belongs and is where it is reported.
 *
 * **AN ENTRY IS A DELIBERATE EDIT WITH A TEST BESIDE IT, never a silent widening.** Ten symbols in
 * KiCad's `Switch` library carry an `MP` pin; they are not added until a board needs one and the
 * claim has been checked against the installed library. An empty table that refuses loudly beats a
 * general rule that quietly accepts a guess - a geometric rule was measured and flagged 17 of 36
 * pins across eight other symbols this repository uses, including both terminals of `Device:R`.
 */
const MECHANICAL_PINS: Readonly<Record<string, readonly string[]>> = {
  "Switch:SW_Rotary_1x6_MP": ["MP"],
}

/**
 * The mechanical pins of the symbol a component declares, as pin numbers.
 *
 * Empty for a symbol with no entry AND for a component declaring no symbol, which is the common
 * case: absence means "every pin of this symbol is electrical", never "unknown". `Object.hasOwn`
 * rather than a bare lookup, so a lib id colliding with an `Object.prototype` member cannot return
 * a function and exempt nonsense.
 */
function mechanicalPinsOf(component: Component): readonly string[] {
  const symbol = component.part?.symbol
  if (symbol === undefined) return []
  return Object.hasOwn(MECHANICAL_PINS, symbol) ? (MECHANICAL_PINS[symbol] ?? []) : []
}

/**
 * A partition as a sorted list of sorted member strings - a MULTISET, so two nets that happen to
 * carry the same members are two entries and not one.
 */
function partitionOf(sets: readonly (readonly string[])[]): string[] {
  return sets.map((members) => [...members].sort().join(" ")).sort()
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

const sorted = (xs: Iterable<string>): string[] => [...xs].sort()

/** One symbol pin of one component, under the KiCad pin number the caller's map gives it. */
interface ResolvedPin {
  readonly number: string
  /**
   * What the model puts on it, or `null` for a pin the pin-number map declares and the model puts
   * nothing on - an unused rotary detent, say. A `null` is NOT an absence: it is the same claim an
   * explicit `NC` makes, it counts towards the component's pin numbering, and it is a one-member
   * set in the partition, because that is how `kicad-cli` exports such a pin.
   */
  readonly connection: Connection | null
}

/**
 * Every symbol pin of `component`, under its KiCad pin number.
 *
 * **THE PIN-NUMBER MAP IS THE AUTHORITY FOR WHICH PINS EXIST, and the model for what is on them.**
 * A canonical pin the model connects and the map does not name refuses; a number the map names and
 * no model pin claims is a declared no-connect. Those two rules are what let an unused detent be
 * accounted for without this module reading an authoring file.
 *
 * A MECHANICAL pin is the other case and is NOT named in the map - see `MECHANICAL_PINS`.
 */
function resolvePins(
  component: Component,
  numbers: ReadonlyMap<string, string>,
): readonly ResolvedPin[] {
  const claimedBy = new Map<string, string>()
  const out: ResolvedPin[] = []
  const place = (canonical: string, where: string, connection: Connection): void => {
    const number = numbers.get(canonical)
    if (number === undefined) {
      throw new Error(
        `component "${component.id}" ${where} pin "${canonical}" has no entry in the pin-number ` +
          "map handed to compareSheetToModel, so there is no KiCad pin number to compare it " +
          "under. Add it where the caller builds that map. It is not defaulted: a canonical pin " +
          "name is not a pin number, and an unmapped pin dropped quietly would leave its net one " +
          "member short on the model side and be reported as a schematic-only connection - the " +
          "wrong finding, in the wrong list.",
      )
    }
    const prior = claimedBy.get(number)
    if (prior !== undefined) {
      throw new Error(
        `component "${component.id}": pin number "${number}" is claimed by both ${prior} and ` +
          `${where} pin "${canonical}". One symbol pin carries one net, so the pin-number map ` +
          "must be injective over the pins the model declares. Fix the map where the caller " +
          "builds it; nothing is preferred, because whichever pin won would silently overwrite " +
          "the other's net.",
      )
    }
    claimedBy.set(number, `${where} pin "${canonical}"`)
    out.push({ number, connection })
  }
  for (const [canonical, connection] of Object.entries(component.pins)) {
    place(canonical, "package", connection)
  }
  for (const unit of component.units) {
    for (const [canonical, connection] of Object.entries(unit.pins)) {
      place(canonical, `unit "${unit.name}"`, connection)
    }
  }
  const unclaimed = new Set<string>()
  for (const number of numbers.values()) if (!claimedBy.has(number)) unclaimed.add(number)
  for (const number of sorted(unclaimed)) out.push({ number, connection: null })
  return out
}

/** The KiCad reference for `component`, refusing rather than deriving one. */
function designatorOf(component: Component, designators: ReadonlyMap<string, string>): string {
  const ref = designators.get(component.id)
  if (ref === undefined) {
    throw new Error(
      `component "${component.id}" has no entry in the designator map handed to ` +
        "compareSheetToModel, so nothing says which reference on the sheet is this part. The map " +
        'is the caller\'s because this model carries no designator ("Ids are semantic; ' +
        'designators belong to KiCad"); add the entry where the caller builds it. It is not ' +
        "defaulted: a designator derived from a semantic id would compare this part against " +
        "whichever symbol happened to carry that reference, and agree or disagree for a reason " +
        "nobody declared.",
    )
  }
  return ref
}

/** The pin-number map for `component`, refusing rather than guessing one. */
function pinNumbersOf(
  component: Component,
  pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>,
): ReadonlyMap<string, string> {
  const numbers = pinNumbers.get(component.id)
  if (numbers === undefined) {
    throw new Error(
      `component "${component.id}" has no entry in the pin-number map handed to ` +
        "compareSheetToModel, so none of its pins can be named the way a netlist names them " +
        '("REF.pin"). Add the entry where the caller builds that map. It is not defaulted: which ' +
        "number carries which canonical pin is a property of the concrete symbol the part is " +
        "drawn with, and a guess would put this part's nets on pins the symbol may not have.",
    )
  }
  return numbers
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

/**
 * Compare a circuit model against the netlist exported from a schematic of it.
 *
 * `designators` maps a model component id to its KiCad reference. `pinNumbers` maps a component id
 * to that component's canonical pin name -> KiCad pin number map. Both are PARAMETERS and neither
 * is derived here: a designator and a pin number are facts about a particular drawing, and this
 * model deliberately holds neither.
 *
 * Every list is sorted and stable. Nothing throws on a disagreement; a missing input refuses.
 */
export function compareSheetToModel(
  network: Network,
  designators: ReadonlyMap<string, string>,
  pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>,
  exported: ImportedNetlist,
): SheetAgreement {
  const refOf = new Map<string, string>()
  for (const component of network.components) {
    refOf.set(component.id, designatorOf(component, designators))
  }

  const componentIdentity: string[] = []
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

  const pinIdentity: string[] = []
  const values: string[] = []
  const footprints: string[] = []
  const byNet = new Map<string, string[]>()
  const unconnected: string[][] = []

  for (const component of network.components) {
    const ref = refOf.get(component.id)
    if (ref === undefined) throw new Error(`component "${component.id}" lost its designator`)
    const numbers = pinNumbersOf(component, pinNumbers)
    const pins = resolvePins(component, numbers)

    // THE MODEL'S PARTITION IS BUILT FOR EVERY COMPONENT, including one the schematic has no
    // symbol for: a missing designator is componentIdentity's finding, and dropping the part's
    // nets here as well would turn one problem into a dozen stray-net reports.
    for (const pin of pins) {
      const node = `${ref}.${pin.number}`
      if (pin.connection !== null && pin.connection.kind === "net") {
        byNet.set(pin.connection.net, [...(byNet.get(pin.connection.net) ?? []), node])
      } else {
        // A NOT-CONNECTED PIN IS A ONE-MEMBER SET, not an omission, because that is how the export
        // carries it - `kicad-cli` gives every unconnected pin its own `unconnected-(REF-PadN)`
        // net. Dropped from this side only, a pin the model declares not connected and the sheet
        // wires to a rail would be reported as a stray net instead of as the wrong thing.
        unconnected.push([node])
      }
    }
    const declared = new Set(pins.map((p) => p.number))
    for (const pin of mechanicalPinsOf(component)) {
      if (!declared.has(pin)) unconnected.push([`${ref}.${pin}`])
    }

    const drawn = componentOf.get(ref)
    // A designator the schematic does not have is componentIdentity's finding, reported once
    // there; comparing nothing against it here would double-count it.
    if (drawn === undefined) continue

    const expectPins = sorted(declared)
    const actualPins = sorted(schematicPins.get(ref) ?? [])
    if (expectPins.join(",") !== actualPins.join(",")) {
      pinIdentity.push(`${ref} pin numbers: model [${expectPins.join(", ")}] vs schematic [${actualPins.join(", ")}]`)
    }

    const value = valueFor(component)
    if (drawn.value !== value) {
      values.push(`${ref}: the schematic says "${drawn.value}" and the model says "${value}"`)
    }

    // An absent footprint is an absent footprint, not a blank nobody chose: the model's field is
    // optional and a part declaring none has nothing to compare, so it is skipped. See the header
    // on why that silence is not agreement.
    const footprint = component.part?.footprint ?? ""
    if (footprint.trim() === "") continue
    if (drawn.footprint !== footprint) {
      footprints.push(
        `${ref}: the schematic says footprint "${drawn.footprint ?? "<none>"}" and the model says "${footprint}"`,
      )
    }
  }

  const netMembership: string[] = []
  const model = partitionOf([...byNet.values(), ...unconnected])
  const schematic = partitionOf(Object.values(exported.nets))
  if (model.join("\n") !== schematic.join("\n")) {
    for (const set of withoutOnce(model, schematic)) netMembership.push(`the model connects [${set}] and the schematic does not`)
    for (const set of withoutOnce(schematic, model)) netMembership.push(`the schematic connects [${set}] and the model does not`)
  }

  return { componentIdentity, netMembership, pinIdentity, values, footprints }
}
