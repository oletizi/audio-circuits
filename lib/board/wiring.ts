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
import {
  PART_TABLE_HEADER,
  describePart,
  gangOf,
  netOf,
  partRow,
  pinFieldNotes,
  pinsOf,
} from "./part-text.ts"
import { physicalOnly } from "./physicalize.ts"
import { standInGroupsSection, standInOwners, standInPartIds } from "./scaffold/wiring.ts"
import type { Component, Network } from "../model/types.ts"
import type { ScaffoldDoc } from "./scaffold/doc.ts"

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
  /**
   * The stand-in groups this board holds and what each build does with them, rendered
   * as the "Stand-in groups" section.
   *
   * SET BY EVERY BOARD THAT CURRENTLY GETS A GUIDE. The five Pultec section boards each
   * export a `SCAFFOLD` built by `circuits/pultec/physical/scaffold-doc.ts`, and
   * `tools/perfboard/wiring-sync.ts` passes it through, so this is no longer a field
   * nothing sets.
   *
   * WHY IT IS STILL OPTIONAL, stated accurately because the obvious reason is wrong:
   * it is NOT that `pt2399-core` and the two transistor-preamp boards take the
   * `undefined` branch. They get no guide at all - `wiringDocumentFor` returns
   * `not-applicable` for a board with nothing off it - so they reach neither branch. It
   * is optional because `wiringDocument` is a generic entry point in `lib`: a board can
   * have panel parts and no stand-in groups, that board would then get a guide with
   * nothing to say here, and a required field would make it invent an empty `ScaffoldDoc`
   * (which `asScaffoldDoc` refuses anyway, since a build with no boards builds nothing).
   * Today the `undefined` branch is exercised only by `tests/board/wiring.test.ts`, which
   * is the honest state of it: a supported shape with no board in this repository
   * currently in it.
   *
   * The previous shape - a map of every section's `StandIn` plus a flat state - described
   * the separate scaffold board that has since been deleted, and could not answer the
   * question a section board's guide has to: which groups does THIS board populate, in
   * THIS build, and which board carries the rest.
   */
  readonly scaffold?: ScaffoldDoc
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
      const value = describePart(component)
      const pins = pinsOf(component)
      const tap = pins["a"]
      const tapNet = tap === undefined ? undefined : netOf(tap)
      if (tapNet !== undefined) labels[tapNet] = value
    }
  }
  return labels
}

/**
 * What you place and solder on EVERY build of this board, with the value to fit.
 *
 * This used to be omitted, on the reasoning that the layout already shows where
 * these parts go. That was wrong in the one situation the guide exists for:
 * somebody doing the layout is holding a bag of parts and a board full of
 * designators, and the layout does NOT say that C18 is 330nF or that its far
 * end is the 20Hz throw.
 *
 * STAND-IN PARTS ARE DELIBERATELY NOT HERE. They sit in positions the layout holds in
 * every configuration, but a given build populates only some of them, and listing them
 * beside the parts that are always fitted is read as "fit all of these" - which is the
 * instruction that puts two copies of one group on one bus. They are listed under
 * "Stand-in groups", by group, with the build that calls for each.
 */
function onBoardTable(
  network: Network,
  designators: Readonly<Record<string, string>>,
  offBoard: ReadonlySet<string>,
  standIns: ReadonlySet<string>,
): string {
  const labels = selectorLabels(network, offBoard)
  const rows: string[] = []
  for (const component of network.components) {
    if (offBoard.has(component.id) || physicalOnly(component)) continue
    if (standIns.has(component.id)) continue
    rows.push(partRow(component, designators[component.id] ?? component.id, labels))
  }
  if (rows.length === 0) return "_None._\n"
  return [...PART_TABLE_HEADER, ...rows].join("\n")
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
  standInFor: string | undefined,
): string {
  const pins = pinsOf(component)
  const lines = [`### ${designator} — ${describePart(component)}`, ""]
  lines.push(padTable(component, order, pins, sharedBy), "")

  if (standInFor !== undefined) {
    // A panel part can belong to a stand-in group - the 1H coil mid's stand-in needs is
    // one - and then it is wired only in the builds that populate that group. Without
    // this note it sits among the parts every build wires, which reads as "always".
    lines.push(
      `**Part of the ${standInFor} stand-in group.** Wire it only in the builds where ` +
        `**Stand-in groups** below tells you to populate ${standInFor} on this board; in every ` +
        "other build this part is not fitted and these pads carry nothing.",
      "",
    )
  }

  const gang = gangOf(component)
  if (gang !== undefined) {
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
  const standIns = input.scaffold === undefined
    ? new Set<string>()
    : standInPartIds(input.scaffold)
  const standInFor = input.scaffold === undefined
    ? new Map<string, string>()
    : standInOwners(input.scaffold)

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
    const rendered = section(
      component,
      designator,
      order,
      isPhysical ? input.sharedBy : undefined,
      standInFor.get(component.id),
    )
    if (isPhysical) physical.push(rendered)
    else offBoard.push(rendered)
  }

  const kinds = [
    "- **On the board** — parts you place and solder in every build. The layout says where;",
    "  this says which part and what it sits between.",
    "- **Panel parts** — pots and switches that are NOT on the board. Each of their",
    "  terminals gets a wire to one pad. Pad numbers count from 1 in layout order.",
    "- **Board terminals** — the wires that leave this board for the OTHER boards, not",
    "  for the panel. This is the inter-board harness.",
  ]
  if (input.scaffold !== undefined) {
    kinds.push(
      "- **Stand-in groups** — positions this board holds for the sections you are NOT",
      "  building. Which of them you populate depends on the build, and that section says",
      "  which, for every build this board can be part of.",
    )
  }

  return [
    `# ${input.boardName} — wiring`,
    "",
    `Generated from \`${input.circuitPath}\`. Do not edit by hand — \`make check\` regenerates`,
    "it on every run and overwrites anything that has drifted, so a change here shows up as a",
    "git diff you have to look at rather than as a file somebody has to remember to update.",
    "",
    `There are ${input.scaffold === undefined ? "three" : "four"} kinds of thing here, ` +
      "and they are wired differently:",
    "",
    ...kinds,
    "",
    "## On the board",
    "",
    onBoardTable(input.network, input.designators, input.offBoard, standIns),
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
    // WHICH PART, not only which holes. The rows below are named by footprint, and a
    // footprint is a landing rather than a purchase: the junction's two rows are one
    // long-tail header in the hand, and a builder who ordered what the headings alone
    // say would fit two plain headers and then be unable to stack the boards the shared
    // bus exists for. A field declaration on the parts says they are one part; these
    // notes say what that part is, derived from the rows' own footprints.
    ...pinFieldNotes(input.network.components, input.designators)
      .flatMap((note) => [note, ""]),
    physical.length > 0 ? physical.join("\n") : "_None._\n",
    ...(input.scaffold === undefined
      ? []
      : [standInGroupsSection(
        input.scaffold,
        input.network,
        input.designators,
        selectorLabels(input.network, input.offBoard),
        input.offBoard,
      )]),
  ].join("\n")
}
