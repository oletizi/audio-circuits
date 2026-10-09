/**
 * The Pultec scaffold board: one stand-in for every section, so any subset of the
 * five can be bench-tested with the ladder whole. See
 * `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`.
 *
 * DERIVED, NEVER TRANSCRIBED. Every component and every link below comes from
 * `allStandIns()` (the electrical model) - this module turns that data into a
 * physical `Network`, the same shape `circuits/pultec/physical/parts.ts` builds for
 * the five section boards. It adds no value, no connection and no isolation point of
 * its own.
 *
 * STAND-IN COMPONENTS AND ISOLATION LINKS ARE ORDINARY CONDUCTING COMPONENTS. A
 * fitted link conducts, and `assertElectricallyTransparent` would correctly refuse
 * calling it `physicalOnly` - that category is for a part that joins nothing to
 * anything, which a jumper, fitted, explicitly does not do. The whole reason this
 * board exists separately is so the five section boards keep their transparency
 * guarantee untouched; this board's declared purpose is to conduct, so nothing on it
 * needs that guarantee. ONLY the terminal block is `physicalOnly`, exactly as on
 * every section board.
 *
 * A link is modelled exactly as `circuits/transistor-preamp/parts.ts`'s `jumper()`
 * does: a two-position switch, "fitted" shorting its two pins, "removed" opening
 * them. Fitted means the section it stands in for is absent; removed means the real
 * board drives that segment.
 */
import { net } from "../../lib/model/types.ts"
import { componentNets } from "../../lib/model/topology.ts"
import { PHYSICAL_ONLY } from "../../lib/board/physicalize.ts"
import { allStandIns, GROUND_NET, REFERENCE_FLAT } from "../../lib/board/scaffold/index.ts"
import { OFF_BOARD } from "./off-board.ts"
import { partitionReference } from "./partition.ts"
import { footprintForKind, INDUCTOR_SYMBOL } from "./physical/parts.ts"
import type { Component, Connection, Network } from "../../lib/model/types.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"
import type { FlatState, IsolationPoint, StandIn } from "../../lib/board/scaffold/index.ts"

/**
 * The frequency state the scaffold's stand-ins emulate. Every figure in the design
 * doc was measured at `REFERENCE_FLAT`, and holding the stand-ins at a different
 * setting than the circuit's own flat costs up to 3.71 dB - so this is re-exported
 * rather than restated, and a consumer never has to import the scaffold internals to
 * read it.
 */
export const SCAFFOLD_FLAT: FlatState = REFERENCE_FLAT

/**
 * A 5-way 5.08mm terminal block: the union of every section's boundary nets, plus
 * ground.
 *
 * VERIFIED PRESENT in KiCad's own library before being written here, the same
 * discipline `TERMINAL_BLOCK_3` in `circuits/pultec/physical/parts.ts` records.
 * Confirm with:
 *
 *   ls "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/\
 * TerminalBlock_Phoenix.pretty/TerminalBlock_Phoenix_MKDS-1,5-5-5.08_1x05_P5.08mm_Horizontal.kicad_mod"
 *
 * Same family and pitch as the section boards' 3-way block, one size up.
 */
export const TERMINAL_BLOCK_5 =
  "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-5-5.08_1x05_P5.08mm_Horizontal"

/** The footprint/symbol pair for a two-pad removable link, VERIFIED PRESENT the same
 * way: both are already in use by `circuits/transistor-preamp/parts.ts`'s `jumper()`,
 * and were independently re-confirmed on disk for this change:
 *
 *   ls "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/\
 * Connector_PinHeader_2.54mm.pretty/PinHeader_1x02_P2.54mm_Vertical.kicad_mod"
 *   grep -c Jumper_2_Open \
 *     "/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Jumper.kicad_sym"
 */
const LINK_FOOTPRINT = "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical"
const LINK_SYMBOL = "Jumper:Jumper_2_Open"

/** One removable link: the stub net a stand-in's own terminal was moved to, and the
 * real boundary net it rejoins when fitted. */
interface LinkSpec {
  readonly id: string
  readonly section: string
  readonly stubNet: string
  readonly net: string
}

/** Characters a net or component id may carry that a derived identifier must not:
 * `RV_LO_BOOST.ccw-wiper` has a dot and a hyphen, neither legal to repeat verbatim
 * inside another id without inviting ambiguity. */
function sanitize(text: string): string {
  return text.replace(/[^A-Za-z0-9]+/g, "_")
}

function stubNet(section: string, point: IsolationPoint): string {
  return `SCAFFOLD_${sanitize(section).toUpperCase()}_${sanitize(point.component).toUpperCase()}_${point.terminal.toUpperCase()}_STUB`
}

function linkId(section: string, point: IsolationPoint): string {
  return `link_${sanitize(section).toLowerCase()}_${sanitize(point.component).toLowerCase()}_${point.terminal.toLowerCase()}`
}

/**
 * Break each isolation point: the resolved component keeps its id and kind, but the
 * one pin an isolation point names is rewired from the real boundary net to a fresh
 * stub net, and a `LinkSpec` records what must rejoin it when the link is fitted.
 *
 * Every isolation point must land on exactly one pin of exactly one component in this
 * stand-in - that is the whole content of `IsolationPoint`, which names a component, a
 * terminal and the net it should presently carry. A point that matches nothing, or
 * matches a pin already carrying a different net, means `lib/board/scaffold/isolate.ts`
 * and this module have drifted apart, and is a defect to throw on rather than skip.
 */
function isolate(
  standIn: StandIn,
): { readonly components: readonly ResolvedComponent[]; readonly links: readonly LinkSpec[] } {
  const links: LinkSpec[] = []
  const matched = new Set<IsolationPoint>()
  const components = standIn.components.map((resolved) => {
    const targeting = standIn.isolation.filter((point) => point.component === resolved.id)
    if (targeting.length === 0) return resolved
    const units = resolved.units.map((unit) => {
      const pins = { ...unit.pins }
      for (const point of targeting) {
        if (pins[point.terminal] !== point.net) continue
        matched.add(point)
        const stub = stubNet(standIn.section, point)
        links.push({ id: linkId(standIn.section, point), section: standIn.section, stubNet: stub, net: point.net })
        pins[point.terminal] = stub
      }
      return { ...unit, pins }
    })
    return { ...resolved, units }
  })
  const unmatched = standIn.isolation.filter((point) => !matched.has(point))
  if (unmatched.length > 0) {
    throw new Error(
      `Stand-in for ${standIn.section} has isolation point(s) naming a (component, terminal) ` +
        `that no resolved component carries: ${unmatched.map((p) => `${p.component}.${p.terminal}`).join(", ")}. ` +
        "lib/board/scaffold/isolate.ts and circuits/pultec/scaffold.ts have drifted apart.",
    )
  }
  return { components, links }
}

/** A resolved stand-in component, as an ordinary physical `Component`. Package pins
 * are expected empty, the same convention every kind `reduceToBoundary` can produce
 * (resistor, capacitor, inductor) already holds - checked rather than assumed, so a
 * future kind added there cannot have its package pins silently dropped. */
function toPhysicalComponent(resolved: ResolvedComponent): Component {
  if (Object.keys(resolved.pins).length > 0) {
    throw new Error(
      `Stand-in component ${resolved.id} declares package pins (${Object.keys(resolved.pins).join(", ")}), ` +
        "which toPhysicalComponent() does not carry across. Extend it rather than dropping them.",
    )
  }
  const base = {
    id: resolved.id,
    kind: resolved.kind,
    parameters: resolved.parameters,
    pins: {},
    units: resolved.units.map((unit) => ({
      name: unit.name,
      pins: Object.fromEntries(Object.entries(unit.pins).map(([pin, netName]) => [pin, net(netName)])),
    })),
  }
  if (OFF_BOARD.has(resolved.id)) {
    if (resolved.kind !== "inductor") {
      throw new Error(
        `Stand-in component ${resolved.id} is off-board but is kind "${resolved.kind}", not "inductor" - ` +
          "only an inductor is expected off the scaffold board (no part has been chosen for the ones " +
          "this circuit uses). Add a symbol rule for this kind if that has changed.",
      )
    }
    return { ...base, part: { symbol: INDUCTOR_SYMBOL } }
  }
  return { ...base, part: { footprint: footprintForKind(base) } }
}

/** A fitted-or-removed link, as a two-position switch - see `jumper()` in
 * `circuits/transistor-preamp/parts.ts` for the identical pattern. */
function toLinkComponent(spec: LinkSpec): Component {
  return {
    id: spec.id,
    kind: "switch",
    parameters: { positions: ["fitted", "removed"], contacts: { fitted: [["1", "2"]], removed: [] } },
    part: { footprint: LINK_FOOTPRINT, symbol: LINK_SYMBOL },
    pins: {},
    units: [{ name: "MAIN", pins: { "1": net(spec.stubNet), "2": net(spec.net) } }],
  }
}

/**
 * The scaffold board: every section's stand-in, each isolation point realised as a
 * removable link, plus one terminal block for every net any stand-in shares with the
 * rest of the circuit.
 */
export function pultecScaffold(): Network {
  const modules = partitionReference().modules
  const standIns = allStandIns(modules, SCAFFOLD_FLAT)

  const components: Component[] = []
  const boundaryNets = new Set<string>()
  for (const section of Object.keys(standIns).sort()) {
    const standIn = standIns[section]!
    for (const boundaryNet of standIn.boundary) boundaryNets.add(boundaryNet)
    const { components: isolated, links } = isolate(standIn)
    for (const resolved of isolated) components.push(toPhysicalComponent(resolved))
    for (const link of links) components.push(toLinkComponent(link))
  }

  // Ground last, exactly as `physicalizedBoard` orders a section board's own
  // terminal block.
  const crossingNets = [...boundaryNets].filter((n) => n !== GROUND_NET).sort()
  crossingNets.push(GROUND_NET)

  const pins: Record<string, Connection> = {}
  crossingNets.forEach((netName, index) => { pins[String(index + 1)] = net(netName) })
  components.push({
    id: "scaffold_terminals",
    kind: "connector",
    parameters: {},
    part: { symbol: "Connector_Generic:Conn_01x05", footprint: TERMINAL_BLOCK_5, electricallyInert: true },
    pins: {},
    units: [{ name: "MAIN", pins }],
    provenance: { source: PHYSICAL_ONLY },
  })

  const touched = new Set(components.flatMap(componentNets))
  const ports = Object.fromEntries(crossingNets.filter((netName) => touched.has(netName)).map((n) => [n, n]))

  return { ports, components }
}
