/**
 * ONE DRAWING PAGE PER BLOCK (design change C3): lower a composed `Network` - one whose parts all
 * came in through `include()` - to one copperhead intent per `Network.blocks` record.
 *
 * Each page's intent is `intentFromNetwork` (`./intent-from-network.ts`) over that block's
 * components only, with the board-wide `DESIGNATORS` (one numbering across every page, so a
 * reference names one part on the whole project). What a page adds over a one-page intent:
 *
 * - **A net's text on the page.** A PORT net is named by its port name - the name the block uses
 *   for it, which is also the sheet pin's name on the root (`./assemble-root.ts`) and the
 *   hierarchical label's text (`./hierarchical-labels.ts`). A PRIVATE net is named by its model
 *   name WITHOUT the block prefix: the model's `a_FB` is drawn `FB`. Two blocks therefore carry
 *   the same text for two different nets, and that is safe only because the label on a private net
 *   is LOCAL to its sheet - which `./hierarchical-labels.ts` enforces, and which the two-block
 *   fixture's negative control 3 proves is load-bearing (`tests/circuits/two-block-project.test.ts`).
 *   `TOOLING.md`, design change C3, states the choice.
 * - **Every net is `kind: "signal"`.** copperhead infers ground and power from a net's NAME and
 *   draws them as power symbols (`GND=ground~ (~=inferred from the net name)` in its own report),
 *   and a KiCad power symbol joins every sheet of a hierarchy by name. A block's `GND` drawn as a
 *   symbol would reach the other pages without going through the root, so the root's wiring could
 *   be deleted and nothing would notice. `signal` is copperhead's documented override.
 * - **The port nets are marked** (`DrawingPage.ports`): each port's name, the parent net it is bound
 *   to, the block's pins on it, and whether copperhead drafts it. copperhead refuses a net with one
 *   endpoint, so a port reaching ONE pin of the block is left out of the intent and its
 *   hierarchical label goes on that pin instead.
 *
 * Nothing here computes a coordinate.
 */
import type { Component, Connection, Network } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { intentFromNetwork, type CopperheadIntent, type CopperheadIntentNet } from "./intent-from-network.ts"

/** One port of a block, as its page and the root both need it. */
export interface PagePort {
  /** The port's name: the sheet pin's name on the root and the hierarchical label's text. */
  readonly name: string
  /** The parent net the port is bound to: the local label's text on the root. */
  readonly net: string
  /** `REF.PIN` of every pin of this block on the port's net, sorted. */
  readonly pins: readonly string[]
  /** False when the net reaches one pin of the block: copperhead refuses a one-endpoint net, so it is not in the intent. */
  readonly drafted: boolean
}

export interface DrawingPage {
  /** The block's `include()` prefix: the page's file stem and the root sheet's name. */
  readonly block: string
  readonly intent: CopperheadIntent
  readonly ports: readonly PagePort[]
}

function portsByParentNet(prefix: string, ports: Readonly<Record<string, string>>): Map<string, string> {
  const byParent = new Map<string, string>()
  for (const [port, parent] of Object.entries(ports)) {
    const previous = byParent.get(parent)
    if (previous !== undefined) {
      throw new Error(
        `block "${prefix}": ports "${previous}" and "${port}" are both bound to parent net "${parent}". ` +
          "The block's page would carry two hierarchical labels with different names for one net, and the " +
          "root two sheet pins for it; draw that net through one port.",
      )
    }
    byParent.set(parent, port)
  }
  return byParent
}

/** The net's text on the block's page: its port name, or its model name without the prefix. */
function pageText(prefix: string, net: string, byParent: ReadonlyMap<string, string>): string {
  const port = byParent.get(net)
  if (port !== undefined) return port
  const own = `${prefix}_`
  if (!net.startsWith(own)) {
    throw new Error(
      `block "${prefix}" has a part on net "${net}", which is neither one of its ports nor prefixed "${own}". ` +
        "include() names every unbound net with the prefix, so this block was not built by include(); a page " +
        "cannot tell whether such a net is the block's own or shared.",
    )
  }
  return net.slice(own.length)
}

function renamed(c: Connection, prefix: string, byParent: ReadonlyMap<string, string>): Connection {
  return c.kind === "nc" ? c : { kind: "net", net: pageText(prefix, c.net, byParent) }
}

function blockComponents(network: Network, prefix: string, ids: readonly string[], byParent: ReadonlyMap<string, string>): Component[] {
  return ids.map((id): Component => {
    const component = network.components.find((c) => c.id === id)
    if (component === undefined) throw new Error(`block "${prefix}" names component "${id}", which the network does not hold.`)
    const rename = (pins: Readonly<Record<string, Connection>>): Record<string, Connection> =>
      Object.fromEntries(Object.entries(pins).map(([pin, c]) => [pin, renamed(c, prefix, byParent)]))
    return { ...component, pins: rename(component.pins), units: component.units.map((u) => ({ ...u, pins: rename(u.pins) })) }
  })
}

/**
 * A private net drawn with a port's text would join that port on the sheet: a local label and a
 * hierarchical label of one text are one net within a sheet (measured with `kicad-cli` on the
 * two-block fixture: a local `3V3` label placed on block b's `GND` net merged the two). Refused.
 */
function checkPrivateTexts(
  network: Network, prefix: string, ids: readonly string[], byParent: ReadonlyMap<string, string>, portNames: ReadonlySet<string>,
): void {
  for (const component of network.components.filter((c) => ids.includes(c.id))) {
    for (const pins of [component.pins, ...component.units.map((u) => u.pins)]) {
      for (const c of Object.values(pins)) {
        if (c.kind !== "net" || byParent.has(c.net)) continue
        const text = pageText(prefix, c.net, byParent)
        if (portNames.has(text)) {
          throw new Error(
            `block "${prefix}": private net "${c.net}" is drawn as "${text}", which is also a port's name. A local ` +
              "label and a hierarchical label of one text join on a sheet, so the two would collide into one net; " +
              "rename the private net or the port.",
          )
        }
      }
    }
  }
}

function checkCoverage(network: Network, groups: Readonly<Record<string, string>>): void {
  if (network.blocks.length === 0) {
    throw new Error(
      "the network has no blocks, so it has no pages: a multi-page drawing is one page per include()d " +
        "block. A board built without include() is a one-page board and exports drawingIntent() instead.",
    )
  }
  const prefixes = network.blocks.map((b) => b.prefix)
  for (const prefix of prefixes) {
    if (groups[prefix] === undefined) {
      throw new Error(`no page caption is given for block "${prefix}". Each block's page needs the caption copperhead draws around it.`)
    }
  }
  for (const key of Object.keys(groups)) {
    if (!prefixes.includes(key)) {
      throw new Error(`a page caption is given for block "${key}", which the network does not have. Its blocks are: ${prefixes.join(", ")}.`)
    }
  }
  const inBlock = new Set(network.blocks.flatMap((b) => b.componentIds))
  const loose = network.components.filter((c) => !inBlock.has(c.id)).map((c) => c.id)
  if (loose.length > 0) {
    throw new Error(
      `components ${loose.map((id) => `"${id}"`).join(", ")} belong to no block. A multi-page board's root sheet ` +
        "holds only the block sheets and their wiring, so every part must come in through include().",
    )
  }
}

export function drawingPagesFromNetwork(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  groups: Readonly<Record<string, string>>,
): readonly DrawingPage[] {
  checkCoverage(network, groups)
  return network.blocks.map((block): DrawingPage => {
    const group = groups[block.prefix] ?? ""
    const byParent = portsByParentNet(block.prefix, block.ports)
    checkPrivateTexts(network, block.prefix, block.componentIds, byParent, new Set(Object.keys(block.ports)))
    const components = blockComponents(network, block.prefix, block.componentIds, byParent)
    const flat = intentFromNetwork({ components, ports: {}, blocks: [] }, designators, pinNumbers, { group, netKinds: {} })
    const ports = Object.entries(block.ports)
      .map(([name, net]): PagePort => {
        const pins = flat.nets.find((n) => n.name === name)?.pins ?? []
        if (pins.length === 0) {
          throw new Error(
            `block "${block.prefix}": port "${name}" reaches no pin of the block, so its page would carry a ` +
              "hierarchical label on nothing. Remove the port or connect it.",
          )
        }
        return { name, net, pins: [...pins].sort(), drafted: pins.length > 1 }
      })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    const undrafted = new Set(ports.filter((p) => !p.drafted).map((p) => p.name))
    const nets = flat.nets
      .filter((n) => !undrafted.has(n.name))
      .map((n): CopperheadIntentNet => ({ name: n.name, kind: "signal", pins: n.pins }))
    return { block: block.prefix, intent: { ...flat, nets }, ports }
  })
}
