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
  if (component.kind === "connector") return "terminal block"
  return component.kind
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
