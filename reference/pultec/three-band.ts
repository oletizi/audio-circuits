/** The Pultec three-band EQ reference network.
 *
 * The low cut, low boost, hi cut and hi boost sections are assembled mechanically
 * from the machine-generated netlist in `source/three-band-eq.netlist.json` - see
 * `from-netlist.ts`, which owns that derivation. Component values come from that
 * same export and are corroborated against Ian Thompson-Bell's documentation in
 * `values.md`. What each off-board terminal is comes from `controls.ts`.
 *
 * SCOPE. This models the low cut, low boost and hi cut sections in full. Two
 * parts of the circuit are deliberately absent, and the model is named for that
 * rather than pretending to be the whole EQ:
 *
 *   - The hi boost resonant branch (selector, tapped inductor, Qmax and Q pot).
 *     Its wiring lives off-board and is only recorded in a hand-drawn schematic,
 *     so transcribing it carries real uncertainty. The hi boost LEVEL pot is
 *     retained, because the signal path runs through it and both sources agree
 *     on its three connections; its wiper is a declared open.
 *   - The mid section, whose capacitor values are placeholders in the schematic.
 *
 * See `unresolved.md`. Any response computed from this model is the response of
 * this subset, not of the built unit.
 */
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import { HI_BOOST_POSITIONS, SELECTORS } from "./controls.ts"
import { parseValue } from "../../lib/model/units.ts"
import {
  buildHiBoostInductors,
  buildHiBoostPots,
  buildHiBoostSelector,
  buildPassives,
  buildPots,
  buildSelectors,
  netAt,
  taperFor,
} from "./from-netlist.ts"
import {
  MID_LEVEL,
  MID_MODES,
  MID_POSITIONS,
  MID_RESISTORS,
  MID_TAPS,
  MID_TAP_POINT,
  tapLabel,
} from "./mid.ts"
import type { MidMode } from "./mid.ts"

/** The hi boost level pot's wiper. Open in this model by construction. */
export const HI_BOOST_WIPER_NET = "hi_boost_wiper"

/** Nets the mid section introduces. None of them exist on the manufactured
 * board's netlist, because the mid lives on its own sub-board; they are named
 * here so the mid's provenance stays visibly separate. */
const MID_SELECTOR_COMMON = "mid_sel_common"
const MID_COIL_RETURN = "mid_coil_return"
const MID_BOOST_RETURN = "mid_boost_return"
const MID_CUT_RETURN = "mid_cut_return"

export const MID_NETS = {
  selectorCommon: MID_SELECTOR_COMMON,
  coilReturn: MID_COIL_RETURN,
  boostReturn: MID_BOOST_RETURN,
  cutReturn: MID_CUT_RETURN,
} as const

function midTapNet(henries: number): string {
  return `mid_tap_${tapLabel(henries).toLowerCase()}`
}

function midThrowNet(label: string): string {
  return `mid_sel_${label.toLowerCase()}`
}

/** The mid boost/cut section, authored from documentation rather than derived
 * from the netlist. See `mid.ts` for why the provenance differs.
 *
 * The level pot is a rheostat from the hi boost / lo cut junction down to the
 * LC network, so the section shunts the signal path to a variable depth rather
 * than sitting in series with it.
 */
function buildMid(): readonly Component[] {
  const provenance = { source: "P3bandDoc.pdf p3 and the master schematic p5; NOT netlist-derived" }
  const components: Component[] = []

  for (const position of MID_POSITIONS) {
    position.capacitors.forEach((capacitance, index) => {
      components.push({
        id: `C_MID_${position.label}_${index === 0 ? "A" : "B"}`,
        kind: "capacitor",
        parameters: { farads: parseValue(capacitance) },
        pins: {},
        units: [{
          name: "MAIN",
          pins: { a: net(midTapNet(position.henries)), b: net(midThrowNet(position.label)) },
        }],
        provenance,
      })
    })
  }

  for (const henries of MID_TAPS) {
    components.push({
      id: `L_MID_${tapLabel(henries)}`,
      kind: "inductor",
      parameters: { henries },
      pins: {},
      // Tap down to the coil's return end, which the cut/boost switch routes.
      units: [{ name: "MAIN", pins: { a: net(midTapNet(henries)), b: net(MID_COIL_RETURN) } }],
      provenance,
    })
  }

  components.push({
    id: "R_MID_BOOST",
    kind: "resistor",
    parameters: { ohms: MID_RESISTORS.boostReturnOhms },
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("in"), b: net(MID_BOOST_RETURN) } }],
    provenance,
  })
  components.push({
    id: "R_MID_CUT",
    kind: "resistor",
    parameters: { ohms: MID_RESISTORS.cutReturnOhms },
    pins: {},
    units: [{ name: "MAIN", pins: { a: net(MID_CUT_RETURN), b: net("0") } }],
    provenance,
  })
  components.push({
    id: "R_MID_SHUNT",
    kind: "resistor",
    parameters: { ohms: MID_RESISTORS.inputShuntOhms },
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("in"), b: net("0") } }],
    provenance,
  })

  // Rheostat: the wiper is tied to the cw end, so only the ccw-wiper section
  // carries current and the pot reads as a variable resistor.
  components.push({
    id: "RV_MID",
    kind: "potentiometer",
    parameters: { ohms: MID_LEVEL.ohms, taper: taperFor(MID_LEVEL.taperClass) },
    pins: {},
    units: [{
      name: "MAIN",
      pins: {
        ccw: net(MID_TAP_POINT),
        wiper: net(MID_SELECTOR_COMMON),
        cw: net(MID_SELECTOR_COMMON),
      },
    }],
    provenance,
  })

  const selectorPins: Record<string, string> = { common: MID_SELECTOR_COMMON }
  const selectorContacts: Record<string, readonly (readonly [string, string])[]> = {}
  for (const position of MID_POSITIONS) {
    const pin = `t_${position.label}`
    selectorPins[pin] = midThrowNet(position.label)
    selectorContacts[position.label] = [["common", pin]]
  }
  components.push({
    id: "SW_MID",
    kind: "switch",
    parameters: { positions: MID_POSITIONS.map(p => p.label), contacts: selectorContacts },
    pins: {},
    units: [{
      name: "MAIN",
      pins: Object.fromEntries(Object.entries(selectorPins).map(([pin, netName]) => [pin, net(netName)])),
    }],
    provenance,
  })

  components.push({
    id: "SW_MID_MODE",
    kind: "switch",
    parameters: {
      positions: [...MID_MODES],
      contacts: {
        boost: [["common", "boost"]],
        // Centre position: the coil's return goes nowhere, so no current can
        // flow and the whole section is out of circuit.
        off: [],
        cut: [["common", "cut"]],
      },
    },
    pins: {},
    units: [{
      name: "MAIN",
      pins: {
        common: net(MID_COIL_RETURN),
        boost: net(MID_BOOST_RETURN),
        cut: net(MID_CUT_RETURN),
      },
    }],
    provenance,
  })

  return components
}

/** The reference network: low cut, low boost and hi cut in full, hi boost
 * level pot retained with an open wiper, hi boost resonant branch and mid
 * section absent. */
export const THREE_BAND_REFERENCE: Network = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    ...buildPassives(),
    ...buildPots(),
    ...buildHiBoostPots(),
    ...buildHiBoostInductors(),
    ...buildSelectors(),
    buildHiBoostSelector(),
    ...buildMid(),
  ],
}

/** Nets that are open on purpose at a given control state, for the lint.
 *
 * A rotary selector connects its common to exactly one throw, so every other
 * throw's capacitor tail is genuinely floating. That is the circuit behaving
 * correctly, not a transcription error, and it is precisely the "unused switch
 * contacts" case the lint's exemption exists for. Which nets are open therefore
 * depends on where the switches are set.
 *
 * The hi boost level pot's wiper is NOT listed: an unloaded wiper still sits
 * between the pot's two resolved halves, so it carries two terminals and is not
 * a singleton.
 */
export function declaredOpens(state: ControlState): readonly string[] {
  const open: string[] = []
  for (const selector of SELECTORS) {
    const selected = state.switchPositions[selector.ref]
    if (selected === undefined) throw new Error(`No position for ${selector.ref}`)
    selector.positions.forEach((position, index) => {
      if (position === selected) return
      open.push(netAt(selector.throwsConnector, String(index + 1)))
    })
  }
  const hiBoost = state.switchPositions.SW_HI_BOOST
  if (hiBoost === undefined) throw new Error("No position for SW_HI_BOOST")
  for (const position of HI_BOOST_POSITIONS) {
    if (position.label === hiBoost) continue
    open.push(netAt("J8", position.capacitorPin))
  }
  const midPosition = state.switchPositions.SW_MID
  if (midPosition === undefined) throw new Error("No position for SW_MID")
  for (const position of MID_POSITIONS) {
    if (position.label === midPosition) continue
    open.push(midThrowNet(position.label))
  }
  const midMode = state.switchPositions.SW_MID_MODE
  if (midMode === undefined) throw new Error("No position for SW_MID_MODE")
  if (midMode !== "boost") open.push(MID_BOOST_RETURN)
  if (midMode !== "cut") open.push(MID_CUT_RETURN)
  return open
}

/** Control settings the reference is validated at. Only pot extremes are used:
 * the LOG curve constant is unstated, and at an extreme the wiper sits on an
 * endpoint where every curve agrees exactly. */
export function controlState(
  loCut: 0 | 1,
  loBoost: 0 | 1,
  hiBoostLevel: 0 | 1,
  positions: { loFrequency: string; hiFrequency: string; mid?: string },
  hiCut: 0 | 1 = 0,
  hiQ: 0 | 1 = 0,
  mid: { level: 0 | 1; mode: MidMode } = { level: 0, mode: "off" },
): ControlState {
  return {
    potPositions: {
      RV_LO_CUT: loCut,
      RV_LO_BOOST: loBoost,
      RV_HI_BOOST: hiBoostLevel,
      RV_HI_CUT: hiCut,
      RV_HI_Q: hiQ,
      RV_MID: mid.level,
    },
    switchPositions: {
      // One physical rotary drives both low banks, as on the high side.
      SW_LO_CUT: positions.loFrequency,
      SW_LO_BOOST: positions.loFrequency,
      // One physical rotary drives both high banks.
      SW_HI_CUT: positions.hiFrequency,
      SW_HI_BOOST: positions.hiFrequency,
      SW_MID: positions.mid ?? MID_POSITIONS[0]!.label,
      SW_MID_MODE: mid.mode,
    },
  }
}
