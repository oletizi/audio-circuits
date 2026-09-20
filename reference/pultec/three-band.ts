/** The Pultec three-band EQ reference network.
 *
 * Topology is assembled mechanically from the machine-generated netlist in
 * `source/three-band-eq.netlist.json`, which is an exact `kicad-cli` export of
 * the manufactured schematic. No connectivity is retyped here. Component values
 * come from that same export and are corroborated against Ian Thompson-Bell's
 * documentation in `values.md`. What each off-board terminal is comes from
 * `controls.ts`.
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
import netlist from "./source/three-band-eq.netlist.json"
import type { PassiveElement, PassiveNetwork } from "../../lib/passives/topology.ts"
import type { ControlState } from "../../lib/passives/control-state.ts"
import { EXCLUDED_COMPONENTS, POTS, SELECTORS } from "./controls.ts"
import { parseValue } from "../../lib/passives/units.ts"

/** Canonical names for the nets the schematic names itself. Everything else is
 * derived from the terminal it belongs to, so net identity stays traceable. */
const NAMED_NETS: Readonly<Record<string, string>> = {
  "/IN": "in",
  "/OUT": "out",
  "/HI BOOST OUT": "hi_boost_out",
  "/LO BOOST IN": "lo_boost_in",
  GND: "0",
}

/** The hi boost level pot's wiper. Open in this model by construction. */
export const HI_BOOST_WIPER_NET = "hi_boost_wiper"

function canonicalNet(name: string): string {
  const named = NAMED_NETS[name]
  if (named !== undefined) return named
  const derived = /^Net-\(([A-Za-z0-9]+)-Pin_(\d+)\)$/.exec(name)
  if (derived) return `${derived[1].toLowerCase()}_p${derived[2]}`
  if (name.startsWith("/pultec-mid-band/")) {
    return `mid_${name.slice("/pultec-mid-band/".length).toLowerCase().replace(/\s+/g, "_")}`
  }
  throw new Error(`Net name has no canonical form: ${name}`)
}

interface NodeRef {
  readonly ref: string
  readonly pin: string
}

function buildNetIndex(): Map<string, string> {
  const index = new Map<string, string>()
  for (const net of netlist.nets) {
    const canonical = canonicalNet(net.name)
    for (const node of net.nodes as readonly NodeRef[]) {
      index.set(`${node.ref}.${node.pin}`, canonical)
    }
  }
  return index
}

const NET_OF = buildNetIndex()

function netAt(ref: string, pin: string): string {
  const net = NET_OF.get(`${ref}.${pin}`)
  if (net === undefined) throw new Error(`No net for ${ref} pin ${pin}`)
  return net
}

/** tscircuit-style two-terminal passives: KiCad numbers their pins 1 and 2. */
function twoTerminal(ref: string, value: string): PassiveElement {
  const pins = { a: netAt(ref, "1"), b: netAt(ref, "2") }
  const provenance = { source: "pultec-three-band-eq.kicad_sch @ c0f6f39" }
  if (ref.startsWith("C")) {
    return { ref, kind: "capacitor", pins, parameters: { farads: parseValue(value) }, provenance }
  }
  if (ref.startsWith("R")) {
    return { ref, kind: "resistor", pins, parameters: { ohms: parseValue(value) }, provenance }
  }
  throw new Error(`Not a two-terminal passive: ${ref}`)
}

function buildPassives(): readonly PassiveElement[] {
  const out: PassiveElement[] = []
  for (const [ref, value] of Object.entries(netlist.components)) {
    if (!ref.startsWith("C") && !ref.startsWith("R")) continue
    if (EXCLUDED_COMPONENTS[ref] !== undefined) continue
    out.push(twoTerminal(ref, value))
  }
  return out
}

/** A LOG pot's curve constant is not stated by any source. The validated
 * control matrix uses only the extremes, where the taper is irrelevant: at
 * fraction 0 and 1 every curve returns 0 and 1 exactly. The constant below is
 * therefore inert for every state this reference is validated at, and is
 * recorded rather than hidden. See unresolved item 5. */
const UNVALIDATED_LOG_CURVE = 4.8

/** Both branches are inert at the control extremes the reference is validated
 * at: every curve returns exactly 0 at fraction 0 and exactly 1 at fraction 1.
 * A pot whose taper class no source states resolves here as linear, which is a
 * placeholder for "cannot matter at the validated states" rather than a claim.
 * See unresolved item 5. */
function taperFor(taperClass: "log" | "lin" | "unstated") {
  return taperClass === "log"
    ? ({ type: "log", curveConstant: UNVALIDATED_LOG_CURVE } as const)
    : ({ type: "linear" } as const)
}

function buildPots(): readonly PassiveElement[] {
  return POTS.filter(pot => pot.connector !== "J20" && pot.connector !== "J21")
    .map(pot => ({
      ref: pot.ref,
      kind: "potentiometer" as const,
      pins: {
        ccw: netAt(pot.connector, "1"),
        wiper: netAt(pot.connector, "2"),
        cw: netAt(pot.connector, "3"),
      },
      parameters: { ohms: pot.ohms, taper: taperFor(pot.taperClass) },
      provenance: { source: pot.source },
    }))
}

/** The hi boost level pot, kept because the signal path runs through it. Its
 * wiper feeds the absent resonant branch and is a declared open. */
function buildHiBoostLevel(): PassiveElement {
  const pot = POTS.find(p => p.connector === "J21")
  if (!pot) throw new Error("hi boost level pot missing from POTS")
  return {
    ref: pot.ref,
    kind: "potentiometer",
    pins: { ccw: netAt("J21", "1"), wiper: HI_BOOST_WIPER_NET, cw: netAt("J21", "3") },
    parameters: { ohms: pot.ohms, taper: { type: "linear" } },
    provenance: { source: `${pot.source}; wiper open, resonant branch not modelled` },
  }
}

function buildSelectors(): readonly PassiveElement[] {
  return SELECTORS.map(selector => {
    const common = netAt(selector.commonConnector, "1")
    const pins: Record<string, string> = { common }
    const contacts: Record<string, readonly (readonly [string, string])[]> = {}
    selector.positions.forEach((position, index) => {
      const throwPin = `t${index + 1}`
      pins[throwPin] = netAt(selector.throwsConnector, String(index + 1))
      contacts[position] = [["common", throwPin]]
    })
    return {
      ref: selector.ref,
      kind: "switch" as const,
      pins,
      parameters: { positions: selector.positions, contacts },
      provenance: { source: selector.source },
    }
  })
}

/** The reference network: low cut, low boost and hi cut in full, hi boost
 * level pot retained with an open wiper, hi boost resonant branch and mid
 * section absent. */
export const THREE_BAND_REFERENCE: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    ...buildPassives(),
    ...buildPots(),
    buildHiBoostLevel(),
    ...buildSelectors(),
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
  return open
}

/** Control settings the reference is validated at. Only pot extremes are used:
 * the LOG curve constant is unstated, and at an extreme the wiper sits on an
 * endpoint where every curve agrees exactly. */
export function controlState(
  loCut: 0 | 1,
  loBoost: 0 | 1,
  hiBoostLevel: 0 | 1,
  positions: { loCut: string; loBoost: string; hiCut: string },
  hiCut: 0 | 1 = 0,
): ControlState {
  return {
    potPositions: {
      RV_LO_CUT: loCut,
      RV_LO_BOOST: loBoost,
      RV_HI_BOOST: hiBoostLevel,
      RV_HI_CUT: hiCut,
    },
    switchPositions: {
      SW_LO_CUT: positions.loCut,
      SW_LO_BOOST: positions.loBoost,
      SW_HI_CUT: positions.hiCut,
    },
  }
}
