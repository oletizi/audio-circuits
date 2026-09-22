/** Components built mechanically from the machine-generated netlist.
 *
 * Everything here comes from `source/three-band-eq.netlist.json`, an exact
 * `kicad-cli` export of the manufactured schematic — low cut, low boost, hi cut,
 * and the hi boost branch (selector, tapped inductor, level and Q pots). No
 * connectivity is retyped: net identity is derived from the netlist's own pin
 * references via `netAt`. What each off-board terminal is comes from `controls.ts`.
 *
 * The mid section is NOT here — its topology comes from documentation rather
 * than the netlist (see `three-band.ts` and `mid.ts`), which is precisely the
 * provenance boundary this file exists to keep visible.
 */
import netlist from "./source/three-band-eq.netlist.json"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"
import {
  EXCLUDED_COMPONENTS,
  HI_BOOST_POSITIONS,
  HI_FREQUENCY_GANG,
  POTS,
  SELECTORS,
} from "./controls.ts"
import { parseValue } from "../../lib/model/units.ts"

/** Canonical names for the nets the schematic names itself. Everything else is
 * derived from the terminal it belongs to, so net identity stays traceable. */
const NAMED_NETS: Readonly<Record<string, string>> = {
  "/IN": "in",
  "/OUT": "out",
  "/HI BOOST OUT": "hi_boost_out",
  "/LO BOOST IN": "lo_boost_in",
  GND: "0",
}

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
  for (const netEntry of netlist.nets) {
    const canonical = canonicalNet(netEntry.name)
    for (const node of netEntry.nodes as readonly NodeRef[]) {
      index.set(`${node.ref}.${node.pin}`, canonical)
    }
  }
  return index
}

const NET_OF = buildNetIndex()

export function netAt(ref: string, pin: string): string {
  const found = NET_OF.get(`${ref}.${pin}`)
  if (found === undefined) throw new Error(`No net for ${ref} pin ${pin}`)
  return found
}

/** tscircuit-style two-terminal passives: KiCad numbers their pins 1 and 2. */
function twoTerminal(ref: string, value: string): Component {
  const pins = { a: net(netAt(ref, "1")), b: net(netAt(ref, "2")) }
  const provenance = { source: "pultec-three-band-eq.kicad_sch @ c0f6f39" }
  if (ref.startsWith("C")) {
    return {
      id: ref, kind: "capacitor", parameters: { farads: parseValue(value) }, pins: {},
      units: [{ name: "MAIN", pins }], provenance,
    }
  }
  if (ref.startsWith("R")) {
    return {
      id: ref, kind: "resistor", parameters: { ohms: parseValue(value) }, pins: {},
      units: [{ name: "MAIN", pins }], provenance,
    }
  }
  throw new Error(`Not a two-terminal passive: ${ref}`)
}

export function buildPassives(): readonly Component[] {
  const out: Component[] = []
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
 * See unresolved item 5. Exported for `buildMid`'s documentation-sourced pot,
 * which needs the same rule. */
export function taperFor(taperClass: "log" | "lin" | "unstated") {
  return taperClass === "log"
    ? ({ type: "log", curveConstant: UNVALIDATED_LOG_CURVE } as const)
    : ({ type: "linear" } as const)
}

export function buildPots(): readonly Component[] {
  return POTS.filter(pot => pot.connector !== "J20" && pot.connector !== "J21")
    .map(pot => ({
      id: pot.ref,
      kind: "potentiometer" as const,
      parameters: { ohms: pot.ohms, taper: taperFor(pot.taperClass) },
      pins: {},
      units: [{
        name: "MAIN",
        pins: {
          ccw: net(netAt(pot.connector, "1")),
          wiper: net(netAt(pot.connector, "2")),
          cw: net(netAt(pot.connector, "3")),
        },
      }],
      provenance: { source: pot.source },
    }))
}

/** The hi boost level and Q pots, both wired to their real nets.
 *
 * The Q pot's ccw and wiper terminals sit on one net, so its ccw-wiper section
 * is shorted out and it behaves as a variable resistor in series with Qmax —
 * which is what a Q control is.
 */
export function buildHiBoostPots(): readonly Component[] {
  const find = (connector: string) => {
    const pot = POTS.find(p => p.connector === connector)
    if (!pot) throw new Error(`Pot missing from POTS: ${connector}`)
    return pot
  }
  const level = find("J21")
  const q = find("J20")
  return [
    {
      id: level.ref,
      kind: "potentiometer",
      parameters: { ohms: level.ohms, taper: taperFor(level.taperClass) },
      pins: {},
      units: [{
        name: "MAIN",
        pins: { ccw: net(netAt("J21", "1")), wiper: net(netAt("J21", "2")), cw: net(netAt("J21", "3")) },
      }],
      provenance: { source: level.source },
    },
    {
      id: q.ref,
      kind: "potentiometer",
      parameters: { ohms: q.ohms, taper: taperFor(q.taperClass) },
      pins: {},
      units: [{
        name: "MAIN",
        pins: { ccw: net(netAt("J20", "1")), wiper: net(netAt("J20", "2")), cw: net(netAt("J20", "3")) },
      }],
      provenance: { source: q.source },
    },
  ]
}

/** The hi boost tapped winding, as one inductor per tap.
 *
 * The coil is NOT grounded. Per the builder's master schematic, the selected
 * capacitor injects at its own tap and the coil's TOP end runs out to Qmax, so
 * the winding section in circuit is the one between that tap and the top. Each
 * modelled inductor therefore spans tap -> coil top, and the documentation's
 * Lboost value for a position is the inductance of exactly that section.
 *
 * This is what makes the section work the way its documentation describes:
 * "High boost is achieved by frequency selectively shorting out some or all of
 * the 47K potentiometer". The capacitor and winding form a series resonant
 * branch from the input to the level pot's wiper, which goes low-impedance at
 * resonance and bridges out the upper part of the pot. Qmax and the Q pot sit
 * inside that loop and are what damp it — which is why the documentation calls
 * Qmax necessary once modern low-DCR coils are used.
 *
 * Representing one tapped coil as four separate inductors is legitimate because
 * the selector energises exactly one at a time: an unselected tap's capacitors
 * are disconnected at their tails, so that section carries no current and
 * cannot couple into the live one. If two sections ever carried current
 * together this would be wrong and the winding would need explicit coupling,
 * which the project's design notes warn about directly.
 */
export function buildHiBoostInductors(): readonly Component[] {
  const byTapPin = new Map<string, number>()
  for (const position of HI_BOOST_POSITIONS) {
    const existing = byTapPin.get(position.tapPin)
    if (existing !== undefined && existing !== position.henries) {
      throw new Error(
        `Tap ${position.tapPin} has two inductances: ${existing} and ${position.henries}`,
      )
    }
    byTapPin.set(position.tapPin, position.henries)
  }
  return [...byTapPin.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tapPin, henries]) => ({
      id: `L_HI_BOOST_${Math.round(henries * 1000)}MH`,
      kind: "inductor" as const,
      parameters: { henries },
      pins: {},
      // Tap -> coil top. The top returns to the board at J19, which feeds Qmax.
      units: [{ name: "MAIN", pins: { a: net(netAt("J15", tapPin)), b: net(netAt("J19", "1")) } }],
      provenance: {
        source: "P3bandDoc.pdf p2 Lboost column; tap grouping confirmed by the "
          + "capacitors the netlist places on each J15 terminal; coil top to "
          + "Qmax per the builder's master schematic",
      },
    }))
}

/** The hi boost selector.
 *
 * The master schematic shows one pole: the input feeds the common, and each
 * throw reaches one capacitor. The tap does not need switching, because each
 * capacitor is hard-wired to the tap its frequency calls for — which is why six
 * positions need only four tap wires, with 4k/5k sharing 0.3H and 10k/16k
 * sharing 0.1H.
 */
export function buildHiBoostSelector(): Component {
  const pins: Record<string, string> = { common: netAt("J13", "1") }
  const contacts: Record<string, readonly (readonly [string, string])[]> = {}
  for (const position of HI_BOOST_POSITIONS) {
    const throwPin = `t_${position.label}`
    pins[throwPin] = netAt("J8", position.capacitorPin)
    contacts[position.label] = [["common", throwPin]]
  }
  return {
    id: "SW_HI_BOOST",
    kind: "switch",
    parameters: {
      positions: HI_BOOST_POSITIONS.map(p => p.label),
      contacts,
      gang: HI_FREQUENCY_GANG,
    },
    pins: {},
    units: [{
      name: "MAIN",
      pins: Object.fromEntries(Object.entries(pins).map(([pin, netName]) => [pin, net(netName)])),
    }],
    provenance: { source: "P3bandDoc.pdf p5, HISWA: the first pole of the high frequency selector, common from the input, one throw per capacitor" },
  }
}

export function buildSelectors(): readonly Component[] {
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
      id: selector.ref,
      kind: "switch" as const,
      parameters: selector.gang === undefined
        ? { positions: selector.positions, contacts }
        : { positions: selector.positions, contacts, gang: selector.gang },
      pins: {},
      units: [{
        name: "MAIN",
        pins: Object.fromEntries(Object.entries(pins).map(([pin, netName]) => [pin, net(netName)])),
      }],
      provenance: { source: selector.source },
    }
  })
}
