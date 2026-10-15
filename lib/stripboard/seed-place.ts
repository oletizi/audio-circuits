/**
 * THE WORKSPACE A CONSTRUCTION MUTATES, and how a column is chosen: by how
 * comfortable the position is to build, and only then by clustering.
 *
 * `./seed.ts` is the API and the gate; `./seed-fit.ts` holds the two placers;
 * `./seed-area.ts` holds the geometry and the measured rules. This file is the
 * state in between and the one decision every placement shares.
 *
 * **THE RULE EVERYTHING HERE KEEPS, stated once:** a lead lands either on its
 * own net's HOME strip - the strip the ordering gave that net - or on a SCRATCH
 * strip, which is a strip no net calls home and which exactly one lead claims.
 * A lead never lands on another net's home strip. So no strip carries two nets'
 * leads, every strip is a single run, and `derivedCuts` returns nothing.
 *
 * **AND THE RULE THAT WAS MISSING, which is why this file was rewritten.** The
 * first version took the lowest free column every time, so a 34 x 27 stock came
 * back as a board 31 strips by THREE columns with 37 leads in it and an
 * electrolytic can stacked on a trimmer - the owner's word was *"kafkaesque"*.
 * It never reached sideways because nothing ever asked it to. `chooseColumn`
 * below is the thing that asks: it scans every column, ranks them by
 * `comfortOf`, and only breaks ties by clustering. **Spreading is therefore not
 * a score - it is what happens when the first position that is comfortable to
 * build is taken instead of the first position that is empty.**
 *
 * **CLUSTERING IS SECONDARY AND THE ORDER IS THE OWNER'S**: *"Clustering is
 * nice, but secondary to ease of assembly."* So comfort is the first key and
 * cluster distance only separates equally comfortable columns. A tighter,
 * better-clustered board is not an improvement here; it is the trade he ruled
 * against.
 */
import { type Grid, type Hole, type Placement, type Wire, type Bridge } from "./board.ts"
import { holeKey } from "./cuts.ts"
import { joinColumnFor } from "./join-column.ts"
import {
  COMFORT_ORDER,
  areaRect,
  comfortOf,
  rectOnBoard,
  rigidOverlap,
  routedUnderRigid,
  type FramePin,
  type PartArea,
  type Rect,
} from "./seed-area.ts"
import {
  homeStripsFor,
  refuse,
  type Ordering,
  type SeedLead,
  type SeedNetlist,
  type SeedPart,
} from "./seed-model.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/** One terminal put in one hole - what a placement is made of. */
export interface Seat {
  readonly lead: SeedLead
  readonly hole: Hole
}

/** A board being built: the decisions so far, and what is still free. */
export interface Workspace {
  readonly grid: Grid
  readonly ordering: string
  readonly spans: ReadonlyMap<string, LeadSpan>
  readonly home: ReadonlyMap<string, number>
  /** Strip to the net that calls it home - the inverse of `home`. */
  readonly hosted: ReadonlyMap<number, string>
  /** Holes holding a lead, a wire end or a bridge. One lead per hole. */
  readonly taken: Set<string>
  /** Scratch strip to the `<ref>.<pin>` that claimed it. One lead per scratch strip. */
  readonly claimed: Map<number, string>
  /** Net to every strip a lead of it landed on. */
  readonly landed: Map<string, Set<number>>
  /** Net to the centre column of every placed part that touches it - for clustering. */
  readonly nearNet: Map<string, number[]>
  /** Every placed part's rectangle, which is what clearance is measured against. */
  readonly areas: PartArea[]
  readonly placements: Placement[]
  readonly wires: Wire[]
  readonly bridges: Bridge[]
}

function onBoard(workspace: Workspace, hole: Hole): boolean {
  return (
    hole.strip >= 0 &&
    hole.column >= 0 &&
    hole.strip < workspace.grid.strips &&
    hole.column < workspace.grid.columns
  )
}

export function free(workspace: Workspace, hole: Hole): boolean {
  return onBoard(workspace, hole) && !workspace.taken.has(holeKey(hole))
}

/** A strip no net calls home and no lead has claimed. */
export function scratchFree(workspace: Workspace, strip: number): boolean {
  return (
    strip >= 0 &&
    strip < workspace.grid.strips &&
    !workspace.hosted.has(strip) &&
    workspace.claimed.get(strip) === undefined
  )
}

export function homeOf(workspace: Workspace, net: string): number {
  const strip = workspace.home.get(net)
  if (strip === undefined) {
    // Unreachable through seedsFrom: homeStripsFor refuses an ordering that
    // leaves a net out, and validateNetlist refuses a lead whose net the
    // reference does not carry. Stated rather than silently defaulted, because
    // a 0 here would be every unhosted net shorted onto strip 0.
    refuse(
      "net-has-no-home",
      `net "${net}" has no home strip under ordering "${workspace.ordering}", and reaching ` +
        "this point means homeStripsFor accepted an ordering it should have refused. Fix " +
        "lib/stripboard/seed-model.ts's ordering-missing-net check; nothing is substituted.",
    )
  }
  return strip
}

function record(workspace: Workspace, net: string, strip: number): void {
  const strips = workspace.landed.get(net)
  if (strips === undefined) workspace.landed.set(net, new Set([strip]))
  else strips.add(strip)
}

/**
 * One position a placement could take: where it sits, what it would cover, and
 * how comfortable it is to build there.
 */
export interface Position {
  readonly origin: Hole
  readonly direction: Placement["direction"]
  readonly rect: Rect
  readonly seated: readonly Seat[]
  readonly comfortRank: number
  readonly clusterDistance: number
  readonly column: number
}

function centreColumn(rect: Rect): number {
  return (rect.minColumn + rect.maxColumn) / 2
}

/**
 * How far this position is from the parts already placed that share a net with
 * it - the secondary key, and zero when none is placed yet.
 */
function clusterDistance(workspace: Workspace, part: SeedPart, rect: Rect): number {
  const leads: readonly SeedLead[] = part.kind === "two-lead" ? part.leads : part.field
  const columns: number[] = []
  for (const lead of leads) {
    for (const column of workspace.nearNet.get(lead.net) ?? []) columns.push(column)
  }
  if (columns.length === 0) return 0
  const mean = columns.reduce((total, column) => total + column, 0) / columns.length
  return Math.abs(centreColumn(rect) - mean)
}

/**
 * The best column for a placement whose strips are already decided: **comfort
 * first, then clustering, then the lowest column.**
 *
 * `seatsAt` says where the terminals go at a given origin column and `framePins`
 * says where they are in the part's own frame, which is the frame the body
 * margins are stated in. A column is rejected outright - never ranked - when a
 * hole is taken or off the board, when the part's rectangle leaves the stock,
 * when it would put a lead under a rigid part, or when its area would overlap a
 * rigid part's. The last two are the owner's two hard geometric rules and they
 * are rejections rather than tiers, because *"rigid parts shouldn't be routed
 * through/under"* and *"Rigid parts are rigid. You cant push them out of the way
 * or rout under them."* have no cheaper version. A formable part overlapping
 * another formable part is NOT rejected - it ranks `crowded`, which is the tier
 * that case exists for.
 */
export function chooseColumn(
  workspace: Workspace,
  part: SeedPart,
  direction: Placement["direction"],
  framePins: readonly FramePin[],
  originAt: (column: number) => Hole,
  seatsAt: (column: number) => readonly Seat[],
): Position | undefined {
  let best: Position | undefined
  for (let column = 0; column < workspace.grid.columns; column += 1) {
    const origin = originAt(column)
    const seated = seatsAt(column)
    if (!seated.every(({ hole }) => free(workspace, hole))) continue
    const rect = areaRect(framePins, part.body, origin, direction)
    if (!rectOnBoard(rect, workspace.grid.strips, workspace.grid.columns)) continue
    const area: PartArea = {
      ref: part.ref,
      rigid: part.rigid,
      rect,
      leads: seated.map(({ hole }) => hole),
    }
    if (routedUnderRigid(area, workspace.areas) !== null) continue
    if (rigidOverlap(area, workspace.areas) !== null) continue
    const comfortRank = COMFORT_ORDER.indexOf(comfortOf(rect, workspace.areas))
    const position: Position = {
      origin,
      direction,
      rect,
      seated,
      comfortRank,
      clusterDistance: clusterDistance(workspace, part, rect),
      column,
    }
    if (best === undefined || isBetter(position, best)) best = position
  }
  return best
}

/** Comfort, then cluster distance, then the lowest column. Declared, so two runs agree. */
export function isBetter(a: Position, b: Position): boolean {
  if (a.comfortRank !== b.comfortRank) return a.comfortRank < b.comfortRank
  if (a.clusterDistance !== b.clusterDistance) return a.clusterDistance < b.clusterDistance
  return a.column < b.column
}

/**
 * Commit one placement: its holes become taken, its scratch strips claimed, its
 * rectangle recorded, and each lead's strip and column recorded against its net.
 */
export function commit(workspace: Workspace, part: SeedPart, position: Position): void {
  const pins = new Map<string, Hole>()
  for (const { lead, hole } of position.seated) {
    pins.set(lead.pin, hole)
    workspace.taken.add(holeKey(hole))
    record(workspace, lead.net, hole.strip)
    const near = workspace.nearNet.get(lead.net)
    if (near === undefined) workspace.nearNet.set(lead.net, [centreColumn(position.rect)])
    else near.push(centreColumn(position.rect))
    if (hole.strip !== homeOf(workspace, lead.net)) {
      workspace.claimed.set(hole.strip, `${part.ref}.${lead.pin}`)
    }
  }
  workspace.areas.push({
    ref: part.ref,
    rigid: part.rigid,
    rect: position.rect,
    leads: position.seated.map(({ hole }) => hole),
  })
  workspace.placements.push({
    ref: part.ref,
    footprint: part.footprint,
    origin: position.origin,
    direction: position.direction,
    holes: position.seated.map(({ hole }) => hole),
    pins,
  })
}

const JOIN_WHY =
  "a join is what makes a net whole across two strips, so a strip left unjoined is an OPEN " +
  "that no cut list can close (lib/stripboard/invariants.ts)"

/**
 * Every net whose leads landed on more than one strip gets those strips joined,
 * lowest to highest.
 *
 * **A PATH AND NOT A STAR: `k` strips cost `k - 1` joins either way**, and
 * joining each strip to its nearest neighbour is what makes the joins short and
 * what turns a one-strip gap into a solder bridge instead of a wire. A bridge is
 * the only feature that joins two adjacent strips without a wire, and
 * `./board.ts` records it as the short-hop alternative the committed boards use.
 *
 * **WHICH OF THE TWO IS CHEAPER IS NOT DECIDED HERE AND COULD NOT BE**: the
 * weights are not an input to `seedsFrom`, `F` prices `W` and `B` separately for
 * the owner's stated reason, and a module that read `stripboard/rules.json` to
 * choose would be a core module reading the file the scorer is handed.
 *
 * **WHICH COLUMN A JOIN RUNS IN IS `./join-column.ts`'s, and it used to be
 * here.** The move generator has to make the same decision when a relocated
 * lead needs a wire back to its net, so the rule moved out to where both can
 * read it and the private copy was deleted. `Workspace` satisfies that module's
 * `JoinSite` structurally, which is why this call passes it unchanged.
 */
export function joinNets(workspace: Workspace, netlist: SeedNetlist): void {
  for (const net of [...netlist.nets.keys()].sort()) {
    const strips = [...(workspace.landed.get(net) ?? [])].sort((a, b) => a - b)
    let low: number | undefined
    for (const high of strips) {
      const previous = low
      low = high
      if (previous === undefined) continue
      const column = joinColumnFor(workspace, previous, high)
      if (column === undefined) {
        refuse(
          "no-column-to-join",
          `net "${net}" has leads on strips ${previous} and ${high} and there is no column ` +
            `where both strips still have a free hole, so neither a wire nor a bridge can be ` +
            `put between them.\nThe stock is ${workspace.grid.strips} strips of ` +
            `${workspace.grid.columns} holes and ordering "${workspace.ordering}" filled it.\n` +
            `This is not skipped and no hole is shared: ${JOIN_WHY}, and a lead sharing a hole ` +
            "with a wire end is what the owner asked not to build - \"I would prefer leads not " +
            "share holes - it makes building easier\".",
        )
      }
      if (high - previous === 1) {
        workspace.bridges.push({ column, strips: [previous, high], net })
      } else {
        workspace.wires.push({
          from: { strip: previous, column },
          to: { strip: high, column },
          net,
        })
      }
      workspace.taken.add(holeKey({ strip: previous, column }))
      workspace.taken.add(holeKey({ strip: high, column }))
    }
  }
}

/** A workspace ready to be built into, with every net's home strip resolved. */
export function workspaceFor(
  grid: Grid,
  ordering: Ordering,
  spans: ReadonlyMap<string, LeadSpan>,
  netlist: SeedNetlist,
): Workspace {
  const home = homeStripsFor(netlist, ordering, grid)
  return {
    grid,
    ordering: ordering.name,
    spans,
    home,
    hosted: new Map([...home].map(([net, strip]) => [strip, net])),
    taken: new Set<string>(),
    claimed: new Map<number, string>(),
    landed: new Map<string, Set<number>>(),
    nearNet: new Map<string, number[]>(),
    areas: [],
    placements: [],
    wires: [],
    bridges: [],
  }
}
