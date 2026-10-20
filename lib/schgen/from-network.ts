/**
 * A `Network` PLUS ITS AUTHORING DECLARATION BECOMES A `CircuitSpec` - and nothing in between is
 * invented.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. Every field of `PartSpec` comes
 * from exactly one of three places, and which one is stated per field below:
 *
 * | `PartSpec` field | source |
 * | --- | --- |
 * | `label`, `refPrefix` | `SchematicAuthoring.designators`, declared |
 * | `libId` | `part.symbol` (model), else a `symbol` override, else `symbolForKind` (rule) |
 * | `units` | the resolved symbol's own unit count |
 * | `value` | `lib/kicad/value-notation.ts`'s `valueFor`, derived from the model's parameters |
 * | `footprint` | `part.footprint`, and `""` where the model declares none - see below |
 * | `bom` | `SchematicAuthoring.declared.bom`, declared (see `BomSource`) |
 * | `source` | `SchematicAuthoring.declared.source`, declared |
 * | `pins` | the model's connections, through `part.symbolPins`, a `symbolPins` override, or `canonicalPinNumbers` |
 * | pin sides (on `SchematicPart`, not `PartSpec`) | `rules/pin-sides.ts`, always; a declared `pinSides` is checked against it and never replaces it |
 * | `dnp`, `checklist`, `pinTable`, `mechanicalPads`, `ncUnlisted` | fixed, each for a stated reason |
 *
 * **THE FIVE FIXED FIELDS, because "fixed" has to be a decision rather than a shrug:**
 *
 * - `dnp` is `false`: this model has no do-not-populate concept at all, so every part it declares
 *   is a part that is fitted. A model that gains one would set this from it;
 * - `checklist` is empty: a checklist is review surface attached to a generated drawing and
 *   nothing in the model or in this task produces one;
 * - `pinTable` is `null`: it keys `h7-platform/pintables/<key>.json`, which this repository does
 *   not have in any form;
 * - `mechanicalPads` is empty: `PartSpec.pads` in the model maps a canonical pin to a footprint
 *   pad, which is the opposite thing - a `MechanicalPad` is a pad with NO symbol pin, and the
 *   model has no way to say that;
 * - `ncUnlisted` is `null`, and this one is a REFUSAL rather than a fixed value in disguise. It
 *   needs a reason string, the model has nowhere to put one, and `docs/known-gaps.md` **G151**
 *   records the consequence: `circuits/opamp-buffer.ts` wires one section of a TL072 and says in
 *   its own header that *"section B is simply UNDECLARED - no pin here is an explicit
 *   no-connect"*, so pins 5, 6 and 7 reach a `CircuitSpec` neither on a net nor declared NC and
 *   the IR's `pinsDeclared` rule refuses them by name. Nothing here invents an NC.
 *
 * **`footprint` IS `""` WHERE THE MODEL DECLARES NONE, AND THAT IS NOT THE BLANK THE BRIEF
 * FORBIDS.** `PartSpec.footprint` in the model is optional and `circuits/optical-compressor/`
 * sets it on **0 of its 37** components, so an empty footprint field is the faithful transcription
 * of a stated absence - a schematic symbol with no footprint assigned yet, which is an ordinary
 * and legal state in KiCad. `BomFields` is the opposite case and gets the opposite treatment: the
 * model has no slot for three of its four keys, so carrying blanks there would be representing a
 * claim the model cannot make. See `BomSource` in `./authoring.ts` for that decision; the
 * footprint measurement is recorded in **G152**.
 */

import { assertAuthoring, type SchematicAuthoring, type ComponentOverride } from "./authoring.ts"
import { canonicalPinNumbers, kindStatesItsSymbol, noSymbolRefusal, symbolForKind } from "./rules/symbols.ts"
import { pinSidesFor, type PinSide } from "./rules/pin-sides.ts"
import { preferredOrientation } from "./rules/orientation.ts"
import { valueFor } from "../kicad/value-notation.ts"
import { packagePins } from "../model/kinds.ts"
import type { BlockSpec, BomFields, CircuitSpec, NetName, PartLabel, PartSpec, PinConnection, PinNumber, RailSpec } from "./ir/types.ts"
import type { Rotation } from "./render/geometry.ts"
import type { LibSymbol, SymbolResolver } from "./render/library.ts"
import type { Component, Network } from "../model/types.ts"

const EMPTY_BOM: BomFields = { Manufacturer: "", MPN: "", Supplier: "", SupplierPart: "", AbsMaxV: null }

const REF_PREFIX = /^([A-Z]+)/

function designatorOf(component: Component, authoring: SchematicAuthoring): string {
  const designator = authoring.designators[component.id]
  if (designator === undefined) {
    throw new Error(
      `component "${component.id}" has no entry in the designators map of "${authoring.project}". ` +
        "A part's label and reference prefix are its KiCad identity and this model deliberately " +
        "does not carry one (CLAUDE.md: \"Ids are semantic; designators belong to KiCad\"), so " +
        "it is declared in the schematic authoring file and never derived from the semantic id.",
    )
  }
  return designator
}

function refPrefixOf(designator: string, id: string): string {
  const match = REF_PREFIX.exec(designator)
  const prefix = match === null ? undefined : match[1]
  if (prefix === undefined) {
    throw new Error(
      `designator "${designator}" (component "${id}") does not start with capital letters, so ` +
        "there is no reference prefix to read off it. The IR requires ^[A-Z]+$; fix the " +
        "designator rather than declaring a prefix separately, because two fields saying the " +
        "same thing is two things to keep in step.",
    )
  }
  return prefix
}

/** How a part's symbol was settled, so a caller can count what the rule covered. */
export type SymbolOrigin = "model" | "override" | "rule"

export interface SymbolChoice {
  readonly libId: string
  readonly origin: SymbolOrigin
}

/**
 * The symbol for `component`: the model's declaration, else an override, else the by-kind rule.
 *
 * The model wins, because `part.symbol` IS a declaration in the model and G99's criterion puts
 * that first. An override alongside it is a REFUSAL rather than a precedence question: two places
 * claiming one symbol means whichever a reader consulted first would be the answer they got, and
 * `CLAUDE.md`'s "supersede means delete" says the loser is deleted rather than shadowed.
 */
export function symbolChoiceFor(component: Component, override: ComponentOverride | undefined): SymbolChoice {
  const declared = component.part?.symbol
  const overridden = override?.symbol
  if (declared !== undefined && overridden !== undefined) {
    throw new Error(
      `component "${component.id}" declares part.symbol "${declared}" in the circuit model AND a ` +
        `symbol override "${overridden}" in its authoring file. Nothing is preferred: delete one. ` +
        "If the model's symbol is wrong, fix the model; if the drawing needs a different symbol " +
        "from the one the part is, that is a claim the model should carry.",
    )
  }
  if (declared !== undefined) return { libId: declared, origin: "model" }
  if (overridden !== undefined) return { libId: overridden, origin: "override" }
  // The refusal names the COMPONENT and not only its kind: a perturbation that added a `switch`
  // to a fixture produced a message saying "a switch" had no symbol, which leaves a reader of a
  // 37-part circuit to go and find which one. See `noSymbolRefusal` for why it is composed there.
  if (!kindStatesItsSymbol(component.kind)) {
    throw new Error(noSymbolRefusal(component.kind, component.parameters, `component "${component.id}"`))
  }
  return { libId: symbolForKind(component.kind, component.parameters), origin: "rule" }
}

interface PinMapRequest {
  readonly component: Component
  readonly symbol: LibSymbol
  readonly override: ComponentOverride | undefined
}

function declaredUnitMap(r: PinMapRequest, unitName: string): Readonly<Record<string, string>> | undefined {
  const fromModel = r.component.part?.symbolPins?.[unitName]
  const fromOverride = r.override?.symbolPins?.[unitName]
  if (fromModel !== undefined && fromOverride !== undefined) {
    throw new Error(
      `component "${r.component.id}" unit "${unitName}": part.symbolPins and the authoring ` +
        "file's symbolPins override both map it. Nothing is preferred: delete one.",
    )
  }
  return fromModel ?? fromOverride
}

/** Canonical pin -> KiCad pin number for one model unit, declared or by a reviewed rule. */
function unitPinNumbers(r: PinMapRequest, unitName: string, names: readonly string[]): ReadonlyMap<string, string> {
  const declared = declaredUnitMap(r, unitName)
  if (declared !== undefined) {
    const missing = names.filter((n) => declared[n] === undefined)
    if (missing.length > 0) {
      throw new Error(
        `component "${r.component.id}" unit "${unitName}": the declared symbolPins map omits ` +
          `[${missing.join(", ")}]. A partial map is not completed by a rule here, because a map ` +
          "that covers some pins is a statement that the author looked at all of them.",
      )
    }
    return new Map(names.map((n) => [n, declared[n] ?? ""]))
  }
  if (r.symbol.unitCount > 1) {
    throw new Error(
      `component "${r.component.id}" unit "${unitName}": ${r.symbol.libId} has ` +
        `${r.symbol.unitCount} units and no symbolPins map declares which one this is. No rule ` +
        "derives it: the model's units are a NAMED list and a circuit may legitimately declare " +
        'them in any order (["B", "A"] is legal), so matching the first model unit to symbol ' +
        "unit 1 would be a guess that is invisible when it is wrong. Declare " +
        "`part.symbolPins` keyed by unit name on the component, or a `symbolPins` override with " +
        "a non-blank `why`.",
    )
  }
  return canonicalPinNumbers({
    kind: r.component.kind,
    symbol: r.symbol,
    names,
    what: `component "${r.component.id}" unit "${unitName}"`,
  })
}

function pinsOf(r: PinMapRequest): Readonly<Record<PinNumber, PinConnection>> {
  const numbers = new Set(r.symbol.pins.map((p) => p.number))
  const out: Record<PinNumber, PinConnection> = {}
  const claimedBy = new Map<string, string>()
  const place = (number: string, canonical: string, where: string): void => {
    if (!numbers.has(number)) {
      throw new Error(
        `component "${r.component.id}" ${where}: pin "${canonical}" maps to pin number ` +
          `"${number}", which ${r.symbol.libId} does not have (its pins: ` +
          `${[...numbers].join(", ")}).`,
      )
    }
    const prior = claimedBy.get(number)
    if (prior !== undefined) {
      throw new Error(
        `component "${r.component.id}": pin number "${number}" of ${r.symbol.libId} is claimed ` +
          `by both ${prior} and ${where} pin "${canonical}". One symbol pin carries one net.`,
      )
    }
    claimedBy.set(number, `${where} pin "${canonical}"`)
  }
  const packageNames = Object.keys(r.component.pins)
  if (packageNames.length > 0) {
    const vocabulary = packagePins(r.component.kind)
    const unknown = packageNames.filter((n) => vocabulary.length > 0 && !vocabulary.includes(n))
    if (unknown.length > 0) {
      throw new Error(
        `component "${r.component.id}": package pins [${unknown.join(", ")}] are not in the ` +
          `"${r.component.kind}" package vocabulary [${vocabulary.join(", ")}] that ` +
          "lib/model/kinds.ts declares.",
      )
    }
    const map = canonicalPinNumbers({
      kind: r.component.kind,
      symbol: r.symbol,
      names: packageNames,
      what: `component "${r.component.id}" package pins`,
    })
    for (const [canonical, number] of map) {
      place(number, canonical, "package")
      const connection = r.component.pins[canonical]
      if (connection === undefined) throw new Error(`component "${r.component.id}": package pin "${canonical}" vanished`)
      out[number] = connection.kind === "net" ? { net: connection.net, identity: canonical } : { nc: true, identity: canonical }
    }
  }
  for (const unit of r.component.units) {
    const names = Object.keys(unit.pins)
    if (names.length === 0) continue
    const map = unitPinNumbers(r, unit.name, names)
    for (const [canonical, number] of map) {
      place(number, canonical, `unit "${unit.name}"`)
      const connection = unit.pins[canonical]
      if (connection === undefined) throw new Error(`component "${r.component.id}": unit pin "${canonical}" vanished`)
      out[number] = connection.kind === "net" ? { net: connection.net, identity: canonical } : { nc: true, identity: canonical }
    }
  }
  return out
}

function bomFieldsFor(component: Component, authoring: SchematicAuthoring): BomFields {
  const source = authoring.declared.bom
  if (source.kind === "unsourced") return EMPTY_BOM
  const fields = source.fields[component.id]
  if (fields === undefined) {
    throw new Error(
      `component "${component.id}" has no entry in declared.bom.fields of "${authoring.project}", ` +
        'whose BOM source is "declared". Add the entry, or declare the whole circuit ' +
        '{ kind: "unsourced", why: … } - the fields are not blanked here, because a blank ' +
        "Manufacturer nobody chose is exactly the silent default Task 9's brief forbids.",
    )
  }
  return fields
}

export interface SchematicPart {
  readonly spec: PartSpec
  readonly component: Component
  readonly symbol: LibSymbol
  readonly symbolOrigin: SymbolOrigin
  /** Every symbol pin's side. */
  readonly pinSides: ReadonlyMap<PinNumber, PinSide>
  /** The pin numbers whose side came from a declared override rather than from the geometry. */
  readonly sidesFromOverride: ReadonlySet<PinNumber>
}

/**
 * Every symbol pin's side, read from the library - and a declared side CHECKED against it.
 *
 * **`ComponentOverride.pinSides` IS AN ASSERTION, NOT AN OVERRIDE, AND THAT IS A CHANGE**
 * (Task 9 review, round 1; `docs/known-gaps.md` **G155**). It used to be an override, and a
 * TOTAL one returned outright without ever calling `pinSidesFor` - so a declared side was never
 * compared against the glyph's geometry and **nothing in the suite would have caught a
 * declaration the symbol contradicts.** That is an invention at the call site wearing a
 * declaration's clothes, which is G99's own failure mode; and because the deleted
 * two-distinct-sides rule had forced such a declaration onto 19 of the 25 override-carrying
 * components, a genuinely wrong one would have looked ordinary.
 *
 * So the geometry is read on EVERY path, a declared side that disagrees with it refuses naming
 * the pin, the declared side and the library's, and `sidesFromOverride` records which pins were
 * asserted - not which were overridden, because none can be.
 */
function sidesFor(component: Component, symbol: LibSymbol, override: ComponentOverride | undefined): {
  readonly sides: ReadonlyMap<PinNumber, PinSide>
  readonly fromOverride: ReadonlySet<PinNumber>
} {
  const sides = new Map(pinSidesFor(component.kind, symbol))
  const declared = override?.pinSides
  if (declared === undefined) return { sides, fromOverride: new Set<PinNumber>() }
  const numbers = symbol.pins.map((p) => p.number)
  const unknown = Object.keys(declared).filter((n) => !numbers.includes(n))
  if (unknown.length > 0) {
    throw new Error(
      `component "${component.id}": the pinSides declaration names pin number(s) ` +
        `[${unknown.join(", ")}], which ${symbol.libId} does not have (its pins: ` +
        `${numbers.join(", ")}).`,
    )
  }
  const asserted = new Set<PinNumber>()
  const disagreements: string[] = []
  for (const [number, side] of Object.entries(declared)) {
    const library = sides.get(number)
    if (library !== side) disagreements.push(`pin ${number}: declared "${side}", library says "${library ?? "nothing"}"`)
    asserted.add(number)
  }
  if (disagreements.length > 0) {
    throw new Error(
      `component "${component.id}": the pinSides declaration disagrees with ${symbol.libId}'s ` +
        `own geometry - ${disagreements.join("; ")}. A pin's side is read from the library on ` +
        "every path and a declaration cannot move it: the symbol's `(at x y angle)` is where a " +
        "pin is drawn, and a declaration that contradicts it would put a net on an edge the " +
        "glyph does not have. Fix the declaration, or use a symbol that draws the pin where the " +
        "circuit needs it.",
    )
  }
  return { sides, fromOverride: asserted }
}

/**
 * The part's value field, through `lib/kicad/value-notation.ts`'s `valueFor`, with the symbol
 * that was actually RESOLVED for it.
 *
 * `valueFor`'s last two steps are `part.mpn`, then the part name of `part.symbol` - *"for a part
 * with no electrical parameter - an IC, a connector - KiCad's value field holds the part name"* -
 * and it refuses a component with neither. Three of the four parity circuits have such a
 * component: a connector whose symbol arrives through an override rather than through the model,
 * so `component.part.symbol` is absent while the drawing has a perfectly good symbol name to put
 * in the field. Handing `valueFor` the resolved lib id is not a second formatter and not a
 * substitute value: it is the same function, asked with the symbol this part is being drawn with.
 */
function valueOf(component: Component, libId: string): string {
  return valueFor({ ...component, part: { ...component.part, symbol: libId } })
}

function partOf(component: Component, authoring: SchematicAuthoring, symbols: SymbolResolver): SchematicPart {
  const override = authoring.overrides[component.id]
  const designator = designatorOf(component, authoring)
  const choice = symbolChoiceFor(component, override)
  const symbol = symbols.resolve(choice.libId)
  const { sides, fromOverride } = sidesFor(component, symbol, override)
  const units: number[] = []
  for (let u = 1; u <= symbol.unitCount; u += 1) units.push(u)
  // The model's optional footprint, carried across as the model states it. See the header: an
  // absent footprint is an absent footprint, not a blank nobody chose.
  const declaredFootprint = component.part?.footprint
  const footprint = declaredFootprint === undefined ? "" : declaredFootprint
  return {
    spec: {
      label: designator,
      refPrefix: refPrefixOf(designator, component.id),
      libId: choice.libId,
      units,
      value: valueOf(component, choice.libId),
      footprint,
      bom: bomFieldsFor(component, authoring),
      dnp: false,
      checklist: [],
      source: authoring.declared.source,
      pinTable: null,
      pins: pinsOf({ component, symbol, override }),
      mechanicalPads: [],
      ncUnlisted: null,
    },
    component,
    symbol,
    symbolOrigin: choice.origin,
    pinSides: sides,
    sidesFromOverride: fromOverride,
  }
}

/** Every part of `network`, in network order, with what settled its symbol and its pin sides. */
export function schematicParts(
  network: Network,
  authoring: SchematicAuthoring,
  symbols: SymbolResolver,
): readonly SchematicPart[] {
  assertAuthoring(authoring, network)
  return network.components.map((component) => partOf(component, authoring, symbols))
}

/** The `CircuitSpec` for `network` under `authoring`. Nothing in it is invented at a call site. */
export function circuitSpecFrom(
  network: Network,
  authoring: SchematicAuthoring,
  symbols: SymbolResolver,
): CircuitSpec {
  const parts = schematicParts(network, authoring, symbols)
  const labelOf = new Map<string, PartLabel>(parts.map((p) => [p.component.id, p.spec.label]))
  const blocks: BlockSpec[] = authoring.blocks.map((block) => {
    const members = block.members.map((id) => {
      const label = labelOf.get(id)
      if (label === undefined) {
        throw new Error(
          `block ${block.id} names member "${id}", which is not a component of this network. ` +
            "Block members are component ids exactly as the Network names them, never prefix " +
            "patterns and never designators.",
        )
      }
      return label
    })
    const rendering =
      block.rendering.kind === "wired"
        ? { kind: "wired" as const, template: block.rendering.template, anchor: block.anchor }
        : block.rendering
    return { id: block.id, sheet: block.sheet, title: block.title, members, checklist: [], rendering }
  })
  return {
    parts: parts.map((p) => p.spec),
    blocks,
    sheets: authoring.sheets,
    rails: authoring.rails,
    // Ruling R29: spec 1.5 step 2's answer per part, derived HERE because this is where the
    // `Network` is - `rules/orientation.ts` keys on `ComponentKind` and nothing downstream of the
    // IR carries one (docs/known-gaps.md G182). `buildCircuit` refuses a hole in it.
    orientations: orientationsOfParts(parts, authoring.rails),
    // Ruling R29, closing G186: the one input a layout backend needs that the IR had no slot for.
    // It is the declaration verbatim, not a distillation: `assertAuthoring` has already checked
    // that every net the model declares a port of has an entry, and G99 records that a net
    // crossing a BLOCK boundary below the circuit's own has none by design.
    portDirections: authoring.portDirections,
  }
}

/** Part label -> every symbol pin's side. The completeness check's second half reads this. */
export function pinSidesOf(
  network: Network,
  authoring: SchematicAuthoring,
  symbols: SymbolResolver,
): ReadonlyMap<PartLabel, ReadonlyMap<PinNumber, PinSide>> {
  return new Map(schematicParts(network, authoring, symbols).map((p) => [p.spec.label, p.pinSides]))
}

/**
 * Part label -> the orientation spec §1.5's rule library prefers, or `null` where it leaves the
 * choice to the backend.
 *
 * This is `rules/orientation.ts`'s only consumer today and it is what keeps that rule library
 * from being a module nothing reads: the counts it produces are reported per circuit.
 */
export function preferredOrientationsOf(
  network: Network,
  authoring: SchematicAuthoring,
  symbols: SymbolResolver,
): ReadonlyMap<PartLabel, Rotation | null> {
  return orientationsOfParts(schematicParts(network, authoring, symbols), authoring.rails)
}

/**
 * The same map, over parts already built - which is what `circuitSpecFrom` has in hand.
 *
 * **IT IS FACTORED OUT RATHER THAN CALLED TWICE** (ruling **R29**). `circuitSpecFrom` now carries
 * this map on the `CircuitSpec`, and calling `preferredOrientationsOf` from inside it would run
 * `schematicParts` a second time over the same network - which is not merely wasted work: it is
 * two derivations of one answer, and `CLAUDE.md`'s *supersede means delete* and spec §1.4
 * obligation 3's *"no second copy to drift"* both say one. The exported wrapper above stays
 * because `tools/schgen/authoring-census.ts` and the Task 9 tests measure the rule per circuit
 * from a `Network`, which is a different entry point to the same function.
 */
export function orientationsOfParts(
  parts: readonly SchematicPart[],
  rails: readonly RailSpec[],
): ReadonlyMap<PartLabel, Rotation | null> {
  const byNet = new Map<NetName, RailSpec>(rails.map((r) => [r.net, r]))
  const out = new Map<PartLabel, Rotation | null>()
  for (const part of parts) {
    const pinNets = new Map<string, NetName | null>()
    for (const pin of part.symbol.pins) {
      const connection = part.spec.pins[pin.number]
      pinNets.set(pin.number, connection === undefined || !("net" in connection) ? null : connection.net)
    }
    out.set(part.spec.label, preferredOrientation(part.component.kind, { symbol: part.symbol, pinNets, rails: byNet }))
  }
  return out
}

/**
 * Per `SymbolOrigin`, how many parts settled their symbol that way - the Step 6 measurement, and
 * the thing a successor re-runs instead of rebuilding.
 */
export function symbolOriginCounts(parts: readonly SchematicPart[]): Readonly<Record<SymbolOrigin, number>> {
  const counts = { model: 0, override: 0, rule: 0 }
  for (const part of parts) counts[part.symbolOrigin] += 1
  return counts
}

/**
 * Every lib id this circuit's drawing needs - the parts' symbols and the rails' power symbols -
 * resolved WITHOUT a resolver, so a caller can work out which library nicknames to open before
 * it has one.
 *
 * `symbolLibraries` deliberately takes the nicknames it is asked for rather than every library
 * the machine has installed (its own comment: *"a lock over every library a machine happens to
 * have installed would be a fingerprint of the machine"*), so something has to name them first,
 * and the only honest source is the declaration plus the by-kind rule.
 */
export function libIdsOf(network: Network, authoring: SchematicAuthoring): readonly string[] {
  const ids = new Set<string>()
  for (const component of network.components) {
    ids.add(symbolChoiceFor(component, authoring.overrides[component.id]).libId)
  }
  for (const rail of authoring.rails) ids.add(rail.symbol)
  return [...ids].sort()
}

/** The library nicknames `libIdsOf` needs opened. */
export function nicknamesOf(network: Network, authoring: SchematicAuthoring): readonly string[] {
  const nicknames = new Set<string>()
  for (const libId of libIdsOf(network, authoring)) {
    const nickname = libId.slice(0, libId.indexOf(":"))
    if (nickname === "") throw new Error(`lib id "${libId}" is not in Lib:Name form`)
    nicknames.add(nickname)
  }
  return [...nicknames].sort()
}

export interface MpnSymbolDisagreement {
  readonly component: string
  readonly mpn: string
  readonly libId: string
  /** The lib id's part name - what the symbol calls itself. */
  readonly symbolName: string
}

/**
 * Components whose `part.mpn` differs from the part name of the symbol they are drawn with.
 *
 * **ADDED BY THE TASK 9 REVIEW, round 1, and it is the signature of a whole class.** Nothing
 * noticed that `circuits/optical-compressor/` declares `part.mpn: "TL072H"` on two op-amps while
 * the drawing gives them `Amplifier_Operational:TL072` - a hardware claim (that the two share a
 * pinout) made in an authoring file, unguarded, and invisible because the sheet carries BOTH
 * names, the mpn in the value field and `TL072` in the lib id. The disagreement is computable
 * from data already in hand, so it is computed.
 *
 * **IT IS A REPORT AND NOT A REFUSAL, deliberately.** A disagreement is often correct: a trimmer
 * ordered as an `RM-065` is drawn with `Device:R_Potentiometer_Trim`, and a symbol name is not an
 * order code. What is NOT acceptable is a disagreement nobody has looked at, so
 * `tests/schgen/authoring-complete.test.ts` pins the exact set over the parity circuits and a new
 * one turns the suite red until a reader classifies it. `docs/known-gaps.md` **G156** carries the
 * one live hardware claim in the current set.
 */
export function mpnSymbolDisagreements(parts: readonly SchematicPart[]): readonly MpnSymbolDisagreement[] {
  const out: MpnSymbolDisagreement[] = []
  for (const part of parts) {
    const mpn = part.component.part?.mpn
    if (mpn === undefined) continue
    const libId = part.spec.libId
    const colon = libId.indexOf(":")
    if (colon < 0) throw new Error(`lib id "${libId}" is not in Lib:Name form`)
    const symbolName = libId.slice(colon + 1)
    if (symbolName === mpn) continue
    out.push({ component: part.component.id, mpn, libId, symbolName })
  }
  return out
}
