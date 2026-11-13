/**
 * The pedal's default-population check (h7 pedal pages plan, Task 8; GitHub issue 33 P1; plan Review
 * Focus 7). CR-PEDAL-POPULATION makes the model the default fitted build: a not-fitted part whose
 * fitting would join or load nets is left out of it. Nothing in the model records population, so a
 * not-fitted part drawn as fitted would look like any other part. This check reads the circuit for
 * the signature each one would leave, and reports every one it finds; no findings is a pass.
 *
 * What it asserts, on a network holding one PCM3060 (the board, or the codec block alone):
 * - MODE (pin 28) meets exactly the 220 kOhm and nothing else, and that resistor's far end is DGND
 *   (pin 8's net). CODEC-06's not-fitted 0 ohm from MODE to DGND would add a second part
 *   (schematic-checklist.md:98).
 * - DEMP (pin 2) meets the 4.7 kOhm pull-down to DGND and no resistor to VDD (pin 7's net). CODEC-09's
 *   not-fitted pull-up is that resistor (:104).
 * - No component joins codec pin 1 or pin 2 to EXP_I2C_SCL or EXP_I2C_SDA, and neither pin is on one
 *   of them. CODEC-10's two not-fitted links are such components (:105).
 * - No component carries the id of a `NOT_FITTED_PARTS` entry (with its block prefix taken off).
 * - No node carries a pot's wiper beside one of its alternatives: a push button, or a resistor to
 *   3V3_D (a button fit's pull-up). The pot and button fits are alternatives "which the overlapping
 *   footprints prevent" fitting together (architecture.md:230). The model draws both at each control
 *   position (CR-PEDAL-POPULATION's variant positions), so a finding whose parts are all in
 *   `VARIANT_PART_IDS` is exempt, and nothing else is.
 *
 * Its limit: it knows the not-fitted positions the sources name. A not-fitted part a later source adds
 * needs its own rule here, with a control.
 */
import { blockOf } from "../../../lib/model/include.ts"
import type { Component, Connection, Network } from "../../../lib/model/index.ts"
import { PCM3060 } from "../pedal-parts.ts"
import { NOT_FITTED_PARTS, VARIANT_PART_IDS } from "../pedal-population.ts"
import { PCM3060_VALUES } from "../pedal-rulings.ts"

const I2C_NETS = ["EXP_I2C_SCL", "EXP_I2C_SDA"]
const BUTTON_PULLUP_RAIL = "3V3_D"

interface PinOnNet {
  readonly component: Component
  readonly pin: string
}

function netOf(c: Connection | undefined): string | undefined {
  return c?.kind === "net" ? c.net : undefined
}

/** Every (pin, net) of a component, package pins and unit pins together. */
function pinNets(c: Component): { readonly pin: string; readonly net: string }[] {
  const out: { pin: string; net: string }[] = []
  for (const [pin, conn] of Object.entries(c.pins)) {
    const n = netOf(conn)
    if (n !== undefined) out.push({ pin, net: n })
  }
  for (const unit of c.units) {
    for (const [pin, conn] of Object.entries(unit.pins)) {
      const n = netOf(conn)
      if (n !== undefined) out.push({ pin: c.units.length > 1 ? `${unit.name}/${pin}` : pin, net: n })
    }
  }
  return out
}

function members(n: Network, net: string): PinOnNet[] {
  return n.components.flatMap((component) => pinNets(component).filter((p) => p.net === net).map((p) => ({ component, pin: p.pin })))
}

/** The nets a component's other pins sit on. */
function otherNets(c: Component, net: string): string[] {
  return pinNets(c).map((p) => p.net).filter((x) => x !== net)
}

function ohms(c: Component): number | undefined {
  return c.kind === "resistor" && "ohms" in c.parameters ? c.parameters.ohms : undefined
}

/** The id without its block prefix: the id the sources' and the rulings' lists use. */
function baseId(n: Network, c: Component): string {
  const prefix = blockOf(n, c.id)
  return prefix !== null && c.id.startsWith(`${prefix}_`) ? c.id.slice(prefix.length + 1) : c.id
}

function codecPin(codec: Component, pin: string): string | undefined {
  return pinNets(codec).find((p) => p.pin === pin)?.net
}

function codecFindings(n: Network): string[] {
  const codecs = n.components.filter((c) => c.part?.mpn === PCM3060.mpn)
  if (codecs.length > 1) return [`${codecs.length} PCM3060 parts (${codecs.map((c) => c.id).join(", ")}); the pedal has one (schematic-checklist.md:87)`]
  const codec = codecs[0]
  if (codec === undefined) return []
  const findings: string[] = []
  const gnd = codecPin(codec, "8")
  const vdd = codecPin(codec, "7")
  const mode = codecPin(codec, "28")
  const fmt = codecPin(codec, "1")
  const demp = codecPin(codec, "2")
  if (gnd === undefined || vdd === undefined || mode === undefined || fmt === undefined || demp === undefined) {
    return [`${codec.id}: pins 1, 2, 7, 8 and 28 must each be on a net for the population check to read them`]
  }
  // MODE meets exactly the 220 kOhm, whose far end is DGND.
  const onMode = members(n, mode).filter((m) => m.component !== codec)
  const strap = onMode[0]?.component
  const strapOk = onMode.length === 1 && strap !== undefined && ohms(strap) === PCM3060_VALUES.modeToGndOhm &&
    otherNets(strap, mode).every((x) => x === gnd) && otherNets(strap, mode).length === 1
  if (!strapOk) {
    findings.push(
      `${codec.id} MODE (pin 28) on net ${mode} must meet exactly the ${PCM3060_VALUES.modeToGndOhm} ohm strap to DGND; it meets ` +
        `[${onMode.map((m) => `${m.component.id}.${m.pin}`).join(", ")}]. CODEC-06's 0 ohm is not fitted (schematic-checklist.md:98, CR-PEDAL-POPULATION)`,
    )
  }
  // DEMP meets the 4.7 kOhm pull-down and no resistor to VDD.
  const onDemp = members(n, demp).filter((m) => m.component !== codec)
  const pullDown = onDemp.some((m) => ohms(m.component) === PCM3060_VALUES.dempToGndOhm && otherNets(m.component, demp).every((x) => x === gnd))
  const pullUps = onDemp.filter((m) => ohms(m.component) !== undefined && otherNets(m.component, demp).includes(vdd))
  if (!pullDown || pullUps.length > 0) {
    findings.push(
      `${codec.id} DEMP (pin 2) on net ${demp} must meet the ${PCM3060_VALUES.dempToGndOhm} ohm pull-down to DGND and no pull-up to VDD (${vdd}); ` +
        `${pullDown ? "" : "the pull-down is missing; "}pull-ups found: [${pullUps.map((m) => m.component.id).join(", ")}]. ` +
        "CODEC-09's pull-up is not fitted (schematic-checklist.md:104, CR-PEDAL-POPULATION)",
    )
  }
  // No join from pin 1 or pin 2 to the expansion bus.
  for (const [pin, net] of [["1", fmt], ["2", demp]] as const) {
    if (I2C_NETS.includes(net)) findings.push(`${codec.id} pin ${pin} is on ${net} itself; CODEC-10's links are not fitted (schematic-checklist.md:105)`)
    for (const m of members(n, net).filter((x) => x.component !== codec)) {
      const joined = otherNets(m.component, net).filter((x) => I2C_NETS.includes(x))
      if (joined.length > 0) {
        findings.push(
          `${m.component.id} joins ${codec.id} pin ${pin} (net ${net}) to ${joined.join(", ")}; CODEC-10's links are not fitted ` +
            "(schematic-checklist.md:105, CR-PEDAL-POPULATION)",
        )
      }
    }
  }
  return findings
}

function notFittedIdFindings(n: Network): string[] {
  const ids = new Set(NOT_FITTED_PARTS.map((p) => p.id))
  return n.components
    .filter((c) => ids.has(baseId(n, c)))
    .map((c) => `${c.id} is NOT_FITTED_PARTS' "${baseId(n, c)}", which the default build does not carry (CR-PEDAL-POPULATION)`)
}

function bothFitsFindings(n: Network, exempt: ReadonlySet<string>): string[] {
  const findings: string[] = []
  for (const pot of n.components.filter((c) => c.kind === "potentiometer")) {
    const wiper = netOf(pot.units[0]?.pins.wiper)
    if (wiper === undefined) continue
    for (const m of members(n, wiper).filter((x) => x.component !== pot)) {
      const c = m.component
      const alternative = c.kind === "switch" || (ohms(c) !== undefined && otherNets(c, wiper).includes(BUTTON_PULLUP_RAIL))
      if (!alternative) continue
      if (exempt.has(baseId(n, pot)) && exempt.has(baseId(n, c))) continue
      findings.push(
        `${pot.id} (a pot fit) and ${c.id} (a button fit) are both on ${wiper}: the two fits are alternatives (architecture.md:230), ` +
          "and only VARIANT_PART_IDS may carry both (CR-PEDAL-POPULATION, variant positions)",
      )
    }
  }
  return findings
}

/** Every finding, with `exempt` as the variant-position exemption. `checkDefaultPopulation` passes exactly VARIANT_PART_IDS. */
export function populationFindings(n: Network, exempt: readonly string[]): string[] {
  return [...codecFindings(n), ...notFittedIdFindings(n), ...bothFitsFindings(n, new Set(exempt))]
}

/** The default-population check: no findings is a pass. */
export function checkDefaultPopulation(n: Network): string[] {
  return populationFindings(n, VARIANT_PART_IDS)
}
