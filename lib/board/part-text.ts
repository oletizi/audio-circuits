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
import type { Component } from "../model/types.ts"

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
  const header = /PinHeader_(\d+)x(\d+)_P([\d.]+)mm/.exec(footprint)
  const columns = header?.[1]
  const rows = header?.[2]
  const pitch = header?.[3]
  if (columns !== undefined && rows !== undefined && pitch !== undefined) {
    return `${columns}x${rows} pin header, ${pitch}mm pitch`
  }
  if (footprint.includes("TerminalBlock")) return "terminal block"
  throw new Error(
    `no description is recorded for connector "${component.id}" with footprint ` +
      `"${footprint}". Add its family to describeConnector in lib/board/part-text.ts, with ` +
      "the words for the part somebody actually fits. It is refused rather than described " +
      "generically because a wrong name here is what a builder orders from.",
  )
}

/** A one-line description of the part, for somebody holding it. */
export function describePart(component: Component): string {
  const parameters: Record<string, unknown> = { ...component.parameters }
  if (component.kind === "potentiometer") {
    const ohms = parameters["ohms"]
    const curve = taperName(parameters["taper"])
    return typeof ohms === "number" ? `${ohmsText(ohms)} ${curve} potentiometer` : "potentiometer"
  }
  if (component.kind === "inductor") {
    const henries = parameters["henries"]
    return typeof henries === "number" ? `${henriesText(henries)} inductor` : "inductor"
  }
  if (component.kind === "switch") {
    const positions = parameters["positions"]
    return Array.isArray(positions) ? `${positions.length}-position switch` : "switch"
  }
  if (component.kind === "capacitor") {
    const farads = parameters["farads"]
    return typeof farads === "number" ? faradsText(farads) : "capacitor"
  }
  if (component.kind === "resistor") {
    const ohms = parameters["ohms"]
    return typeof ohms === "number" ? ohmsText(ohms) : "resistor"
  }
  if (component.kind === "connector") return describeConnector(component)
  return component.kind
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
