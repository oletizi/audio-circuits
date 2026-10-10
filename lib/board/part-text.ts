/**
 * How a part reads to somebody holding it: the value to fit, and what it sits
 * between.
 *
 * SHARED BY TWO TABLES THAT ASK THE SAME QUESTION. `lib/board/wiring.ts` lists the
 * parts a board always carries; `lib/board/scaffold/wiring.ts` lists the parts of a
 * stand-in group, which are carried only in some builds. Both answer "which part do I
 * pick out of the drawer and what does it sit between", so both read the same
 * formatting. A second copy of `faradsText` would drift, and the drift would show up as
 * two guides disagreeing about the same capacitor.
 *
 * DELIBERATELY NOT `lib/kicad/value-notation.ts`. That answers "what text goes in a
 * netlist field" and is constrained by what VeroRoute compares. This answers "which
 * part do I fit", so it uses whichever unit keeps the number small, and a pot's taper -
 * irrelevant to a netlist, and the first thing a builder has to get right - is in here.
 */
import { isRecord } from "../guards.ts"
import type { Component, PinField } from "../model/types.ts"

/** Every pin a component declares, package pins and unit pins together. */
export function pinsOf(component: Component): Readonly<Record<string, Component["pins"][string]>> {
  const pins: Record<string, Component["pins"][string]> = { ...component.pins }
  for (const unit of component.units) Object.assign(pins, unit.pins)
  return pins
}

export function netOf(connection: Component["pins"][string]): string | undefined {
  return connection.kind === "net" ? connection.net : undefined
}

function ohmsText(ohms: number): string {
  if (ohms >= 1000) {
    const k = ohms / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `${ohms}R`
}

function henriesText(henries: number): string {
  return henries < 1 ? `${Math.round(henries * 1000)}mH` : `${henries}H`
}

function faradsText(farads: number): string {
  if (farads < 1e-9) return `${Math.round(farads * 1e12)}pF`
  if (farads < 1e-6) return `${Number((farads * 1e9).toPrecision(3))}nF`
  return `${Number((farads * 1e6).toPrecision(3))}uF`
}

/** A taper's curve name, narrowed by a predicate rather than asserted: a cast here
 * would let a taper with no `type` through to `undefined` in the rendered guide. */
function taperName(taper: unknown): string {
  if (!isRecord(taper)) return "unknown taper"
  const type = taper["type"]
  return typeof type === "string" ? type.toUpperCase() : "unknown taper"
}

/**
 * What a connector IS, read off its footprint rather than off its kind.
 *
 * THE KIND CANNOT ANSWER THIS, and answering it from the kind was a live defect: this
 * function used to return "terminal block" for every `kind: "connector"`, which labelled
 * the Pultec junction - a `PinHeader_1x05_P2.54mm_Vertical` - as a terminal block in all
 * five guides. The design doc rules that part out in terms ("A 1x05 screw terminal does
 * NOT fit - its body overhangs the second row"), so the guide was telling a builder to
 * buy the one part the design had rejected. `kind: "connector"` covers a screw terminal,
 * a pin header and a switching jack alike (`lib/model/types.ts`), exactly as inertness
 * is a property of the part and not of the kind.
 *
 * A WHITELIST THAT REFUSES, not a rule that guesses. An unrecognised footprint throws
 * naming the part and the footprint, because the failure being prevented is a confident
 * wrong label on the one line that sends somebody to a supplier.
 */
/**
 * A pin header's shape as its footprint name spells it - "1", "05", "2.54" - kept as
 * written rather than parsed to numbers, because "1x05" is how the part is sold and
 * `1x5` is not.
 */
interface HeaderShape {
  readonly columns: string
  readonly rows: string
  readonly pitch: string
}

function headerShape(footprint: string): HeaderShape | undefined {
  const match = /PinHeader_(\d+)x(\d+)_P([\d.]+)mm/.exec(footprint)
  const columns = match?.[1]
  const rows = match?.[2]
  const pitch = match?.[3]
  if (columns === undefined || rows === undefined || pitch === undefined) return undefined
  return { columns, rows, pitch }
}

function describeConnector(component: Component): string {
  const footprint = component.part?.footprint
  if (footprint === undefined) {
    throw new Error(
      `connector "${component.id}" has no footprint, so there is nothing to read its ` +
        "description off. What a connector IS - a header, a screw terminal, a jack - is a " +
        "property of the part, not of kind \"connector\", and it is not defaulted: the guide " +
        "would otherwise name a part somebody has to buy on the strength of a guess. Give it " +
        "a footprint, or keep it out of the wiring guide.",
    )
  }
  const header = headerShape(footprint)
  if (header !== undefined) {
    return `${header.columns}x${header.rows} pin header, ${header.pitch}mm pitch`
  }
  if (footprint.includes("TerminalBlock")) return "terminal block"
  throw new Error(
    `no description is recorded for connector "${component.id}" with footprint ` +
      `"${footprint}". Add its family to describeConnector in lib/board/part-text.ts, with ` +
      "the words for the part somebody actually fits. It is refused rather than described " +
      "generically because a wrong name here is what a builder orders from.",
  )
}

/**
 * Refuse a part whose description would be the bare kind.
 *
 * "potentiometer" with no value, "4-position switch" with no positions, or an unknown
 * kind's own name are all the SAME defect `describeConnector` refuses: a line somebody
 * orders a part from, with the part left out. The value-less form reads as a complete
 * answer, so nothing downstream can tell it from a described part - which is the
 * skipped check that looks like a passing one.
 */
function noDescription(component: Component, missing: string): never {
  throw new Error(
    `${component.kind} "${component.id}" has no ${missing}, so there is nothing to describe ` +
      "it by. A build guide's part line is what somebody orders from, and a line naming only " +
      `the kind ("${component.kind}") reads as a complete answer while leaving out the part - ` +
      "the same defect describeConnector in lib/board/part-text.ts refuses for a connector " +
      `with no footprint. Give it ${missing}, keep it out of the wiring guide, or - for a kind ` +
      "this function has no words for - add that kind to describePart in " +
      "lib/board/part-text.ts, with the words for the part somebody actually fits.",
  )
}

/** A one-line description of the part, for somebody holding it. */
export function describePart(component: Component): string {
  const parameters: Record<string, unknown> = { ...component.parameters }
  if (component.kind === "potentiometer") {
    const ohms = parameters["ohms"]
    if (typeof ohms !== "number") return noDescription(component, "numeric ohms")
    return `${ohmsText(ohms)} ${taperName(parameters["taper"])} potentiometer`
  }
  if (component.kind === "inductor") {
    const henries = parameters["henries"]
    if (typeof henries !== "number") return noDescription(component, "numeric henries")
    return `${henriesText(henries)} inductor`
  }
  if (component.kind === "switch") {
    const positions = parameters["positions"]
    if (!Array.isArray(positions)) return noDescription(component, "positions array")
    return `${positions.length}-position switch`
  }
  if (component.kind === "capacitor") {
    const farads = parameters["farads"]
    if (typeof farads !== "number") return noDescription(component, "numeric farads")
    return faradsText(farads)
  }
  if (component.kind === "resistor") {
    const ohms = parameters["ohms"]
    if (typeof ohms !== "number") return noDescription(component, "numeric ohms")
    return ohmsText(ohms)
  }
  if (component.kind === "connector") return describeConnector(component)
  return noDescription(component, "words in describePart for its kind")
}

/** A pin field as its rows actually are: how many rows, and the shape they agree on. */
interface FieldShape {
  readonly name: string
  /** The designators of its rows, in the order the board carries them. */
  readonly rowNames: readonly string[]
  readonly shape: HeaderShape
}

/**
 * What to buy for a field fitted with a stacking header, and why it is modelled a row
 * at a time.
 *
 * THE DEFECT THIS CLOSES. The guide named each row accurately - "1x05 pin header,
 * 2.54mm pitch" - and said nothing about the part, so a builder ordered two plain
 * vertical headers and could not stack the boards, which is the entire reason the
 * junction is a shared bus rather than a daisy chain. That is the same failure as the
 * one `describeConnector` exists for ("a wrong name here is what a builder orders
 * from"), one step quieter: the right footprint and the wrong part.
 */
function stackingWords(field: FieldShape): string {
  const rowCount = field.rowNames.length
  const whole = `${rowCount}x${field.shape.rows}`
  const pins = rowCount * Number(field.shape.rows)
  return [
    `**The ${field.name} rows are ONE ${whole} pin field — fit a single stacking header, ` +
      `not ${rowCount} plain ones.** ${field.rowNames.join(" and ")} are the ${rowCount} rows of ` +
      `one ${pins}-pin field at ${field.shape.pitch}mm pitch, and the part that goes in it is a ` +
      `${whole} LONG-TAIL (stacking) header: its tails reach through this board into the socket ` +
      "of the board above, which is what lets the boards stack and makes this junction a bus " +
      "they all share rather than a row of pins going nowhere.",
    "",
    `${rowCount} plain vertical 1x${field.shape.rows} headers fit the same holes and leave ` +
      "nothing to stack onto, so they are the one thing not to order. A ribbon socket spanning " +
      "every row, or individual leads, is the bench substitute when the boards are not stacked.",
    "",
    `It is ${rowCount} parts in the model and one part in the hand: the layout tool's part ` +
      "families (see `lib/kicad/import-string.ts`) have no multi-row shape at " +
      `${field.shape.pitch}mm row pitch, so the field is declared a row at a time. The holes, ` +
      "and what you fit in them, are the same either way.",
  ].join("\n")
}

/**
 * The words for each mating, keyed by the mating itself so a new one cannot be added to
 * `PinField` without words reaching the guide: this record stops typechecking if a
 * member has no entry.
 */
const MATING_WORDS: Readonly<Record<PinField["mating"], (field: FieldShape) => string>> = {
  stacking: stackingWords,
}

/**
 * One paragraph per declared pin field, saying what single part occupies the rows the
 * guide has just listed separately.
 *
 * DERIVED FROM THE ROWS, not written beside them: the pin count, the pitch and the
 * field's whole shape come off the components' own footprints, so a field that grew a
 * row or changed pitch changes these words rather than outliving them.
 */
export function pinFieldNotes(
  components: readonly Component[],
  designators: Readonly<Record<string, string>>,
): readonly string[] {
  const rowsByField = new Map<string, FieldRow[]>()
  for (const component of components) {
    const field = component.part?.pinField
    if (field === undefined) continue
    const row: FieldRow = {
      id: component.id,
      name: designators[component.id] ?? component.id,
      mating: field.mating,
      shape: fieldRowShape(field.name, component),
    }
    const existing = rowsByField.get(field.name)
    if (existing === undefined) rowsByField.set(field.name, [row])
    else existing.push(row)
  }
  return [...rowsByField].map(([name, rows]) => fieldNote(name, rows))
}

/** One row of a pin field, with everything the note needs read off it already. */
interface FieldRow {
  readonly id: string
  /** The designator the guide's own heading for this row uses. */
  readonly name: string
  readonly mating: PinField["mating"]
  readonly shape: HeaderShape
}

function fieldNote(name: string, rows: readonly FieldRow[]): string {
  const [first, ...rest] = rows
  if (first === undefined || rest.length === 0) {
    throw new Error(
      `pin field "${name}" has only one row (${first?.id ?? "none"}), so it describes no ` +
        "split: a field declaration exists to say that several connector components are rows " +
        "of ONE part. Either drop part.pinField from that component, or - if a single-row " +
        "field really does force a particular part - give pinFieldNotes in " +
        "lib/board/part-text.ts the words for that case rather than letting it borrow the " +
        "multi-row ones, which would tell a builder to stack a field with nothing to stack.",
    )
  }
  for (const row of rest) {
    if (row.shape.rows === first.shape.rows && row.shape.pitch === first.shape.pitch) continue
    throw new Error(
      `pin field "${name}" has rows of different shapes: ${first.id} is 1x${first.shape.rows} ` +
        `at ${first.shape.pitch}mm and ${row.id} is 1x${row.shape.rows} at ${row.shape.pitch}mm. ` +
        "Rows of one pin field occupy one rectangle of holes, so they must agree on length and " +
        "pitch; they are refused rather than described by the first row, which would state a " +
        "field size no part has.",
    )
  }
  // NO ROWS-DISAGREE-ABOUT-MATING CHECK, deliberately: `PinField["mating"]` has one
  // member, so two rows that disagree cannot be constructed and such a guard would be
  // unreachable code with no test able to reach it. Adding a second mating means adding
  // that refusal here with its test, in the same change as the new member.
  return MATING_WORDS[first.mating]({
    name,
    rowNames: rows.map((row) => `\`${row.name}\``),
    shape: first.shape,
  })
}

/** One row's header shape, refusing anything a pin field cannot be made of. */
function fieldRowShape(name: string, row: Component): HeaderShape {
  const footprint = row.part?.footprint
  const shape = footprint === undefined ? undefined : headerShape(footprint)
  if (shape === undefined) {
    throw new Error(
      `component "${row.id}" declares part.pinField "${name}" but its footprint ` +
        `(${footprint ?? "none"}) is not a pin header, so the field's size and pitch cannot be ` +
        "read off it. A pin field's rows are pin headers; the words the guide prints about the " +
        "part to fit are derived from their footprints rather than typed in, so a row with no " +
        "readable shape is refused instead of described vaguely.",
    )
  }
  if (shape.columns !== "1") {
    throw new Error(
      `component "${row.id}" declares part.pinField "${name}" but its footprint is a ` +
        `${shape.columns}x${shape.rows} header, which is already a multi-row field in one part. ` +
        "A pin field exists to rejoin SINGLE rows that the model had to split; a multi-row " +
        "footprint needs no field and combining two of them would state a size neither has.",
    )
  }
  return shape
}

/**
 * The shaft a control shares with another, or nothing.
 *
 * Read through a spread into `Record<string, unknown>` rather than `Reflect.get`, which
 * returns `any`. Shared so the panel-part flag and the stand-in section's warning about
 * moving a ganged shaft cannot disagree about whether this board has one.
 */
export function gangOf(component: Component): string | undefined {
  const parameters: Record<string, unknown> = { ...component.parameters }
  const gang = parameters["gang"]
  return typeof gang === "string" ? gang : undefined
}

/**
 * The nets a part sits between, each labelled where a selector or coil gives it a
 * name a bench can use.
 *
 * `labels` is net -> the name an off-board part knows that net by ("20Hz", "1H
 * inductor"). A net nobody labels prints bare: `si_mid_mid_sel_1khz` says little, but
 * it is what the netlist and the layout both call it, so it is traceable.
 */
export function betweenText(
  component: Component,
  labels: Readonly<Record<string, string>>,
): string {
  return Object.values(pinsOf(component))
    .flatMap((connection) => {
      const netName = netOf(connection)
      if (netName === undefined) return []
      const label = labels[netName]
      return [label === undefined ? netName : `${netName} (${label})`]
    })
    .join(" ↔ ")
}

/** The header every "which part, what value, between what" table shares. */
export const PART_TABLE_HEADER: readonly string[] = [
  "| Part | Fit | Between |",
  "| --- | --- | --- |",
]

/** One row of that table. */
export function partRow(
  component: Component,
  designator: string,
  labels: Readonly<Record<string, string>>,
  fitNote?: string,
): string {
  const fit = fitNote === undefined
    ? describePart(component)
    : `${describePart(component)} — ${fitNote}`
  return `| ${designator} | ${fit} | ${betweenText(component, labels)} |`
}
