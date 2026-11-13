/**
 * The pedal's default-population check (h7 pedal pages plan, Task 8; GitHub issue 33 P1; plan Review
 * Focus 7). CR-PEDAL-POPULATION makes the model the default fitted build: a not-fitted part whose
 * fitting would join or load nets is left out of it. Nothing in the model records population, so a
 * not-fitted part drawn as fitted would look like any other part. This check reads the circuit for
 * the signature each one would leave, and reports every one it finds; no findings is a pass.
 *
 * What it asserts, on a network holding one PCM3060 (the board, or the codec block alone). A network
 * with no PCM3060 is itself a finding: the codec rules could not run, and a skipped check must never
 * read as a pass (CLAUDE.md).
 * - MODE (pin 28) meets exactly the 220 kOhm and nothing else, and that resistor's far end is DGND
 *   (pin 8's net). CODEC-06's not-fitted 0 ohm from MODE to DGND would add a second part
 *   (schematic-checklist.md:98).
 * - DEMP (pin 2) meets the 4.7 kOhm pull-down to DGND and no resistor to VDD (pin 7's net). CODEC-09's
 *   not-fitted pull-up is that resistor (:104).
 * - No component joins codec pin 1 or pin 2 to EXP_I2C_SCL or EXP_I2C_SDA, and neither pin is on one
 *   of them. CODEC-10's two not-fitted links are such components (:105).
 * - CODEC_RST_N (pin 15's net) meets no resistor to GND. v1's R_RST_PD is that resistor, never fitted
 *   (analog.md:63, :411); this catches it under any id.
 * - No component carries the id of a `NOT_FITTED_PARTS` entry (with its block prefix taken off).
 * - No node carries a pot's wiper beside one of its alternatives: a push button, or a resistor to
 *   3V3_D (a button fit's pull-up). The pot and button fits are alternatives "which the overlapping
 *   footprints prevent" fitting together (architecture.md:230). The model draws both at each control
 *   position (CR-PEDAL-POPULATION's variant positions), so a pot and an alternative are exempt only as
 *   a pair from one `VARIANT_POSITIONS` entry, matched by full id: in the board, both in the controls
 *   block that holds that position (`CONTROL_BLOCK_POSITIONS`); in a network with no blocks, the bare
 *   ids. Nothing else is exempt.
 * - No pot wiper or push-button node meets a resistor to VREF_A: "A button-fitted control position
 *   pulls up to 3V3_D, never to VREF_A" (architecture.md:230). No exemption.
 *
 * Its limit: it knows the not-fitted positions the sources name. A not-fitted part a later source adds
 * needs its own rule here, with a control.
 */
import { blockOf } from "../../../lib/model/include.ts"
import type { Component, Connection, Network } from "../../../lib/model/index.ts"
import { PCM3060 } from "../pedal-parts.ts"
import { NOT_FITTED_PARTS, VARIANT_POSITIONS, type VariantPosition } from "../pedal-population.ts"
import { PCM3060_VALUES } from "../pedal-rulings.ts"
import { CONTROL_BLOCK_POSITIONS } from "./controls.ts"

const I2C_NETS = ["EXP_I2C_SCL", "EXP_I2C_SDA"]
const BUTTON_PULLUP_RAIL = "3V3_D"
const FORBIDDEN_PULLUP_RAIL = "VREF_A"

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
  const findings: string[] = []
  if (codec === undefined) {
    return [
      `no PCM3060 (MPN ${PCM3060.mpn}) in this network, so the codec's MODE, DEMP, I2C-link and reset rules could not run; ` +
        "the pedal has one (schematic-checklist.md:87). A check that could not run is reported, not passed",
    ]
  }
  const gnd = codecPin(codec, "8")
  const vdd = codecPin(codec, "7")
  const mode = codecPin(codec, "28")
  const fmt = codecPin(codec, "1")
  const demp = codecPin(codec, "2")
  const rst = codecPin(codec, "15")
  if (gnd === undefined || vdd === undefined || mode === undefined || fmt === undefined || demp === undefined || rst === undefined) {
    return [`${codec.id}: pins 1, 2, 7, 8, 15 and 28 must each be on a net for the population check to read them`]
  }
  // RST meets no resistor to GND (v1's R_RST_PD, never fitted).
  for (const m of members(n, rst).filter((x) => x.component !== codec && ohms(x.component) !== undefined)) {
    if (otherNets(m.component, rst).includes(gnd)) {
      findings.push(
        `${m.component.id} pulls ${codec.id} RST (pin 15) on net ${rst} to GND; v1's R_RST_PD is never fitted ` +
          "(analog.md:63, :411; R-53; CR-PEDAL-POPULATION)",
      )
    }
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

/** The full ids of each exempt (pot, alternative) pair: same VARIANT_POSITIONS entry, same block. */
function exemptPairs(n: Network, variants: readonly VariantPosition[]): ReadonlySet<string> {
  const pairs = new Set<string>()
  for (const v of variants) {
    const position = Number(v.position.replace(/^POS/, ""))
    const blocks: readonly (readonly [string, readonly number[]])[] = Object.entries(CONTROL_BLOCK_POSITIONS)
    const prefix = blocks.find(([, ps]) => ps.includes(position))?.[0]
    let full: (id: string) => string
    if (n.blocks.length === 0) full = (id) => id
    else if (prefix !== undefined && n.blocks.some((b) => b.prefix === prefix)) full = (id) => `${prefix}_${id}`
    else continue
    for (const pot of v.potFit) for (const alt of v.buttonFit) pairs.add(`${full(pot)}|${full(alt)}`)
  }
  return pairs
}

function bothFitsFindings(n: Network, variants: readonly VariantPosition[]): string[] {
  const exempt = exemptPairs(n, variants)
  const findings: string[] = []
  for (const pot of n.components.filter((c) => c.kind === "potentiometer")) {
    const wiper = netOf(pot.units[0]?.pins.wiper)
    if (wiper === undefined) continue
    for (const m of members(n, wiper).filter((x) => x.component !== pot)) {
      const c = m.component
      const alternative = c.kind === "switch" || (ohms(c) !== undefined && otherNets(c, wiper).includes(BUTTON_PULLUP_RAIL))
      if (!alternative) continue
      if (exempt.has(`${pot.id}|${c.id}`)) continue
      findings.push(
        `${pot.id} (a pot fit) and ${c.id} (a button fit) are both on ${wiper}: the two fits are alternatives (architecture.md:230), ` +
          "and only a pair from one VARIANT_POSITIONS entry may carry both (CR-PEDAL-POPULATION, variant positions)",
      )
    }
  }
  return findings
}

function vrefPullUpFindings(n: Network): string[] {
  const nodes = new Set<string>()
  for (const c of n.components) {
    if (c.kind === "potentiometer") {
      const w = netOf(c.units[0]?.pins.wiper)
      if (w !== undefined) nodes.add(w)
    }
    if (c.kind === "switch") for (const p of pinNets(c)) nodes.add(p.net)
  }
  const findings: string[] = []
  for (const node of [...nodes].filter((x) => x !== FORBIDDEN_PULLUP_RAIL)) {
    for (const m of members(n, node).filter((x) => ohms(x.component) !== undefined)) {
      if (otherNets(m.component, node).includes(FORBIDDEN_PULLUP_RAIL)) {
        findings.push(
          `${m.component.id} pulls the control node ${node} up to ${FORBIDDEN_PULLUP_RAIL}; a button fit pulls up to 3V3_D, ` +
            "never to VREF_A (architecture.md:230)",
        )
      }
    }
  }
  return findings
}

/**
 * Every finding, with `variants` as the variant-position exemption. `checkDefaultPopulation` passes
 * exactly VARIANT_POSITIONS (whose pot-fit and button-fit ids are VARIANT_PART_IDS).
 */
export function populationFindings(n: Network, variants: readonly VariantPosition[]): string[] {
  return [...codecFindings(n), ...notFittedIdFindings(n), ...bothFitsFindings(n, variants), ...vrefPullUpFindings(n)]
}

/** The default-population check: no findings is a pass. */
export function checkDefaultPopulation(n: Network): string[] {
  return populationFindings(n, VARIANT_POSITIONS)
}
