/**
 * The wiring guide for one physicalized board.
 *
 * WHAT THIS EXISTS TO CLOSE. A board's layout shows a run of pads. Which of
 * them is 20Hz, which is a pot's wiper, which two must be linked together -
 * none of that is on the board, and until this existed it lived only in a
 * `PAD_ORDER` literal in TypeScript. A builder at the bench with a layout and
 * a bag of parts could not wire the panel without reading the source.
 *
 * WHY NOT THE FORK'S `--pin-names`. That was the obvious answer and it does
 * not work. Its table is keyed by FOOTPRINT, and the fork's own help says so:
 * "The table belongs to the FOOTPRINT, so every 3PDT in the schematic shares
 * it and two of them cannot disagree about where 1A is." On the mid board
 * `RV_MID` (ccw/wiper/cw) and `SW_MID_MODE` (common/boost/cut) are both
 * `PADS3`, so one table cannot describe both. It also solves a different
 * problem: it exists so a netlist that refers to pins BY NAME can say which
 * hole that is, and this repository's netlists number pads 1..n from the
 * declared pad order, so there is nothing for it to resolve.
 *
 * DERIVED, NEVER AUTHORED. Everything here comes from the board network and
 * its declared pad order, so the guide cannot describe a board that is not the
 * one being built. `tools/perfboard/wiring-sync.ts` regenerates it on every
 * run and rewrites it only when the content differs, the same way the KiCad
 * netlist fixture is kept honest.
 */
import { physicalOnly } from "./physicalize.ts"
import type { Component, Network } from "../model/types.ts"

export interface WiringInput {
  /** The module name, as `boards/pultec-<name>` spells it. */
  readonly boardName: string
  /** Repository-relative path of the circuit this was generated from. */
  readonly circuitPath: string
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly offBoard: ReadonlySet<string>
  readonly padOrder: Readonly<Record<string, readonly string[]>>
  /** Crossing net -> the OTHER boards that touch it. */
  readonly sharedBy: Readonly<Record<string, readonly string[]>>
}

/** Every pin a component declares, package pins and unit pins together. */
function pinsOf(component: Component): Readonly<Record<string, Component["pins"][string]>> {
  const pins: Record<string, Component["pins"][string]> = { ...component.pins }
  for (const unit of component.units) Object.assign(pins, unit.pins)
  return pins
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

/**
 * Capacitance as somebody reads it off a part, not as a netlist spells it.
 *
 * `lib/kicad/value-notation.ts` answers "what text goes in a netlist field" and
 * is constrained by what VeroRoute compares; this answers "which part do I pick
 * out of the drawer", so it uses whichever unit keeps the number small.
 */
function faradsText(farads: number): string {
  if (farads < 1e-9) return `${Math.round(farads * 1e12)}pF`
  if (farads < 1e-6) return `${Number((farads * 1e9).toPrecision(3))}nF`
  return `${Number((farads * 1e6).toPrecision(3))}uF`
}

/**
 * A one-line description of the part, for somebody holding it.
 *
 * Deliberately not `valueFor` from the KiCad lowering: that answers "what text
 * goes in a netlist field", and this answers "which part do I fit". A pot's
 * taper is the clearest case - irrelevant to the netlist, and the first thing
 * a builder needs to get right.
 */
function describe(component: Component): string {
  const parameters: Record<string, unknown> = { ...component.parameters }
  if (component.kind === "potentiometer") {
    const ohms = parameters["ohms"]
    const taper = parameters["taper"]
    const curve = typeof taper === "object" && taper !== null && "type" in taper
      ? String((taper as { type: unknown }).type).toUpperCase()
      : "unknown taper"
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

function netOf(connection: Component["pins"][string]): string | undefined {
  return connection.kind === "net" ? connection.net : undefined
}

/**
 * Net -> the selector position that reaches it, across every off-board switch.
 *
 * A capacitor's far end lands on a net called `j10_p1`, which says nothing at a
 * bench. The selector that switches it knows the net as "20Hz". Joining the two
 * is what turns the on-board parts list from a net dump into something you can
 * place parts from.
 */
function selectorLabels(
  network: Network,
  offBoard: ReadonlySet<string>,
): Readonly<Record<string, string>> {
  const labels: Record<string, string> = {}
  for (const component of network.components) {
    if (!offBoard.has(component.id)) continue

    if (component.kind === "switch") {
      const positions = positionsByPin(component)
      const pins = pinsOf(component)
      for (const [pin, position] of Object.entries(positions)) {
        const connection = pins[pin]
        const netName = connection === undefined ? undefined : netOf(connection)
        if (netName !== undefined) labels[netName] = position
      }
      continue
    }

    // An off-board inductor's tap net is named `j15_p3` by the netlist, which
    // tells a builder nothing about which coil it reaches. Naming it by the
    // inductor's value is what says "this capacitor pairs with the 300mH coil".
    // Only the tap end is labelled: the other end is the shared coil return,
    // which every inductor lands on, so labelling it would be noise.
    if (component.kind === "inductor") {
      const value = describe(component)
      const pins = pinsOf(component)
      const tap = pins["a"]
      const tapNet = tap === undefined ? undefined : netOf(tap)
      if (tapNet !== undefined) labels[tapNet] = value
    }
  }
  return labels
}

/**
 * What you place and solder, with the value to fit.
 *
 * This used to be omitted, on the reasoning that the layout already shows where
 * these parts go. That was wrong in the one situation the guide exists for:
 * somebody doing the layout is holding a bag of parts and a board full of
 * designators, and the layout does NOT say that C18 is 330nF or that its far
 * end is the 20Hz throw.
 */
function onBoardTable(
  network: Network,
  designators: Readonly<Record<string, string>>,
  offBoard: ReadonlySet<string>,
): string {
  const labels = selectorLabels(network, offBoard)
  const rows: string[] = []
  for (const component of network.components) {
    if (offBoard.has(component.id) || physicalOnly(component)) continue
    const pins = pinsOf(component)
    const connections = Object.values(pins)
      .flatMap((connection) => {
        const netName = netOf(connection)
        if (netName === undefined) return []
        const label = labels[netName]
        return [label === undefined ? netName : `${netName} (${label})`]
      })
      .join(" ↔ ")
    rows.push(
      `| ${designators[component.id] ?? component.id} | ${describe(component)} | ${connections} |`,
    )
  }
  if (rows.length === 0) return "_None._\n"
  return ["| Part | Fit | Between |", "| --- | --- | --- |", ...rows].join("\n")
}

/** Pads that land on the same net, which the builder has to link together. */
function linkedPads(
  order: readonly string[],
  pins: Readonly<Record<string, Component["pins"][string]>>,
): readonly (readonly string[])[] {
  const byNet = new Map<string, string[]>()
  order.forEach((pin, index) => {
    const connection = pins[pin]
    const netName = connection === undefined ? undefined : netOf(connection)
    if (netName === undefined) return
    const label = `${index + 1} (${pin})`
    const existing = byNet.get(netName)
    if (existing) existing.push(label)
    else byNet.set(netName, [label])
  })
  return [...byNet.values()].filter(pads => pads.length > 1)
}

/**
 * Which switch position selects a given throw pin.
 *
 * The low selectors name their throws `t1`..`t6`, which says nothing at a
 * bench. The frequency is in `contacts`, which maps a position to the contact
 * pairs it closes, so the position that closes `common`-to-`t1` IS the label
 * for that pad. Reading it from there rather than the pin name means the guide
 * cannot disagree with the frequency tables the circuit is built from.
 */
function positionsByPin(component: Component): Readonly<Record<string, string>> {
  const contacts = Reflect.get(component.parameters, "contacts")
  if (typeof contacts !== "object" || contacts === null) return {}
  const byPin: Record<string, string> = {}
  for (const [position, pairs] of Object.entries(contacts)) {
    if (!Array.isArray(pairs)) continue
    for (const pair of pairs) {
      if (!Array.isArray(pair)) continue
      for (const pin of pair) {
        if (typeof pin === "string" && pin !== "common") byPin[pin] = position
      }
    }
  }
  return byPin
}

function padTable(
  component: Component,
  order: readonly string[],
  pins: Readonly<Record<string, Component["pins"][string]>>,
  sharedBy: Readonly<Record<string, readonly string[]>> | undefined,
): string {
  const selects = positionsByPin(component)
  const header = sharedBy === undefined
    ? ["| Pad | Terminal | Selects | Net |", "| --- | --- | --- | --- |"]
    : ["| Pad | Terminal | Net | Also on |", "| --- | --- | --- | --- |"]
  const rows = order.map((pin, index) => {
    const connection = pins[pin]
    const netName = connection === undefined ? "?" : netOf(connection) ?? "no connection"
    if (sharedBy !== undefined) {
      const others = sharedBy[netName] ?? []
      const reach = others.length > 0 ? others.join(", ") : "no other board"
      return `| ${index + 1} | ${pin} | ${netName} | ${reach} |`
    }
    return `| ${index + 1} | ${pin} | ${selects[pin] ?? "—"} | ${netName} |`
  })
  return [...header, ...rows].join("\n")
}

function section(
  component: Component,
  designator: string,
  order: readonly string[],
  sharedBy: Readonly<Record<string, readonly string[]>> | undefined,
): string {
  const pins = pinsOf(component)
  const lines = [`### ${designator} — ${describe(component)}`, ""]
  lines.push(padTable(component, order, pins, sharedBy), "")

  const gang = Reflect.get(component.parameters, "gang")
  if (typeof gang === "string") {
    lines.push(
      `**Ganged (\`${gang}\`).** This is one pole of a two-pole switch shared with ` +
        "another board — not a switch of its own. Both poles turn together on one shaft, " +
        "and fitting two separate switches makes two controls out of what should be one.",
      "",
    )
  }

  for (const pads of linkedPads(order, pins)) {
    // NOT an instruction to solder the two terminals together - the board's own
    // copper already joins these pads, so running one wire to each achieves it.
    // It is flagged because the tying is a DESIGN decision (a pot wired this way
    // is a rheostat, not a divider), and a builder who "tidied" it by moving a
    // wire would have built a different circuit with nothing to catch them.
    lines.push(
      `**Pads ${pads.join(" and ")} are one net.** The board joins them, so those ` +
        "terminals end up tied together — that is deliberate, not an accident of routing. " +
        "Wire each terminal to its own pad and leave the tying to the board.",
      "",
    )
  }

  return lines.join("\n")
}

export function wiringDocument(input: WiringInput): string {
  const offBoard: string[] = []
  const physical: string[] = []

  for (const component of input.network.components) {
    const isPhysical = physicalOnly(component)
    if (!isPhysical && !input.offBoard.has(component.id)) continue

    const designator = input.designators[component.id] ?? component.id
    const order = isPhysical
      ? Object.keys(pinsOf(component))
      : input.padOrder[component.id]
    if (order === undefined) {
      throw new Error(
        `no declared pad order for off-board component "${component.id}" on board ` +
          `"${input.boardName}". The wiring guide numbers pads from that order, so it cannot ` +
          "be derived or guessed.",
      )
    }
    const rendered = section(component, designator, order, isPhysical ? input.sharedBy : undefined)
    if (isPhysical) physical.push(rendered)
    else offBoard.push(rendered)
  }

  return [
    `# ${input.boardName} — wiring`,
    "",
    `Generated from \`${input.circuitPath}\`. Do not edit by hand — \`make check\` regenerates`,
    "it on every run and overwrites anything that has drifted, so a change here shows up as a",
    "git diff you have to look at rather than as a file somebody has to remember to update.",
    "",
    "There are three kinds of thing here, and they are wired differently:",
    "",
    "- **On the board** — parts you place and solder. The layout says where; this says",
    "  which part and what it sits between.",
    "- **Panel parts** — pots and switches that are NOT on the board. Each of their",
    "  terminals gets a wire to one pad. Pad numbers count from 1 in layout order.",
    "- **Board terminals** — the wires that leave this board for the OTHER boards, not",
    "  for the panel. This is the inter-board harness.",
    "",
    "## On the board",
    "",
    onBoardTable(input.network, input.designators, input.offBoard),
    "",
    "## Panel parts",
    "",
    "Off the board, wired back to it. Nothing here is soldered to the board itself.",
    "",
    offBoard.length > 0 ? offBoard.join("\n") : "_None._\n",
    "## Board terminals",
    "",
    "Where this board joins the rest of the EQ. Each pin is one wire to another board —",
    "the **Also on** column names which. A net reaching no other board is a chassis or",
    "shield landing, present so there is somewhere to put that wire rather than",
    "improvising one later.",
    "",
    physical.length > 0 ? physical.join("\n") : "_None._\n",
  ].join("\n")
}
