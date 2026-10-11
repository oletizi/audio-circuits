/**
 * P0: what each board is graded against, and the ONE implementation of the
 * cut/bridge identity.
 *
 * THE AUTHORITY for everything below is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) and, for the identity and the floor,
 * `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md`
 * (COST) §1.4, §2.1, §2.3 and §6.4. Where this module and those documents
 * differ, the documents win and this comment is the defect.
 *
 * THE IDENTITY, AND WHY IT HAS EXACTLY ONE IMPLEMENTATION:
 *
 *     C = N + J − S_occ            (COST §1.4's theorem)
 *     C_floor = max(0, N − R)      (COST §2.1, R the board's strips)
 *     κ = J / (P − N)              (CRITERIA K1, the progress variable)
 *
 * `occupiedStrips`, `segmentJoins` and `clustering` live here and NOWHERE
 * ELSE (PLAN §"exported names", Task 11). V2 re-checks the identity on every
 * candidate scored, and a second copy of the arithmetic would turn that check
 * into a comparison of one module against a copy of itself.
 *
 * THE FLOOR IS DERIVED, NOT CHOSEN, and that is what makes the two verdicts
 * downstream mean anything: Q4 projects the cost of finishing against
 * `g = F − C_floor`, the gap that provably remains, and A3 measures the
 * achieved objective against the same floor. A wrong floor makes both wrong
 * and nothing further down notices.
 *
 * **FOR EVERY PULTEC SECTION THE FLOOR IS ZERO** at the stock's 34 strips,
 * because each board has fewer nets than the stock has strips (COST §2.3,
 * CRITERIA §1's PAR-preference passage). That is the arithmetic working, not
 * failing: it says the cut count is bounded below only by the geometry, which
 * is why the pipeline reports the shortfall rather than claiming optimality.
 *
 * NO CONSTRAINED FLOOR IS DERIVED HERE OR ANYWHERE IN THIS PLAN. What the
 * floor becomes once `maxSpanHoles` or `minSpanHoles` binds is undetermined
 * (CRITERIA limit H-2), so `cutFloor` is the UNCONSTRAINED floor and a run
 * reporting `at-floor` must say so (CRITERIA §6).
 *
 * WHAT COUNTS AS A NET, A PIN AND AN ON-BOARD COMPONENT, because all three
 * were measured against COST's tables rather than decided here:
 *
 * - `netCount` is every net any pin names, on-board lead or off-board
 *   breakout pad alike. An off-board part lands as free single-hole pads on
 *   this board's copper, so its nets take strips like any other. Reproduces
 *   COST §2.3's "nets (model)" column exactly: 28, 20, 14, 14, 14.
 * - `pinCount` is every pin of every component, which is the `P` of COST
 *   §1.4's corollary `N − S_occ ≤ C ≤ P − S_occ` and of CRITERIA K1's κ:
 *   holes with a lead in them, and a pad prints a `PIN` line exactly as a
 *   part's lead does (see `tests/fixtures/stripboard/
 *   pultec-low-boost-frozen.dump`, whose ten `PAD` lines contribute ten of
 *   its twenty-seven `PIN` lines). It is therefore NOT COST §2.3's
 *   "on-board pins" column, which counts only the parts' own leads.
 * - a component is ON THE BOARD when `part.footprint` is set, and OFF it
 *   when it has only a `part.symbol`. That is the physical board model's own
 *   distinction - `circuits/pultec/physical/parts.ts` attaches a footprint to
 *   a board-resident part and a symbol to an off-board landing, from the
 *   single residency list in `circuits/pultec/off-board.ts` - and it is read
 *   from the model rather than re-derived from any part's name or kind.
 *   `tests/stripboard/targets.test.ts` holds the two vocabularies against
 *   each other on all five boards.
 *
 * THE NET GRAPH'S EDGES ARE FORCED BY ON-BOARD COMPONENTS ONLY (COST §6.4).
 * An off-board component breaks out as free single-hole pads and forces
 * nothing: a panel rotary does not make the nets it switches between
 * adjacent in the arrangement, because no part body has to reach across
 * them. Reproduces COST §6.4's edge counts and maximum degrees exactly.
 *
 * TWO BANDWIDTH FIGURES, NEITHER OF THEM "THE" BANDWIDTH. `⌈maxDegree/2⌉` is
 * a LOWER bound (a net with `d` neighbours needs `d/2` of them on one side of
 * it), and the bandwidth of the one reverse-Cuthill-McKee ordering recorded
 * here is an UPPER bound (it is one concrete arrangement, not an optimal
 * one). Both are kept and neither is reported alone. Minimum bandwidth is
 * NP-hard and nothing here claims to compute it.
 *
 * REVERSAL DOES NOT CHANGE BANDWIDTH, and the ordering is reversed anyway.
 * Cuthill-McKee reversed is the standard ordering, and its advantage over
 * plain Cuthill-McKee is in PROFILE and fill-in, not in bandwidth, which is
 * invariant under reversing a linear arrangement. It is recorded here so
 * nobody reads the reversal as the step that produced the figure.
 */
import { noPinLinesMessage, type BoardDump } from "../guide/dump.ts"
import type { Component, Network } from "../../lib/model/types.ts"

/**
 * The eight refusals P0 raises, as a union rather than loose strings so the
 * `switch` below proves every member has a reason: add a ninth without an arm
 * and `bun run typecheck` fails, because `notDefaultedBecause` then has a
 * reachable end and a declared `string` return. The same device as
 * `GeometryRefusal`'s in `./geometry-contract.ts`.
 */
export type TargetsRefusal =
  | "targets-board"
  | "targets-strips"
  | "targets-nets"
  | "targets-residency"
  | "occupied-missing-pins"
  | "identity-counts"
  | "negative-joins"
  | "clustering-undefined"

/** One sentence per refusal: what is missing, and why it is not defaulted. */
function notDefaultedBecause(refusal: TargetsRefusal): string {
  switch (refusal) {
    case "targets-board":
      return (
        "A board's name is how every report and every refusal downstream says WHICH board " +
        "it is talking about, so it is not defaulted from the network: two targets with no " +
        "name read alike in a run report and a reader cannot tell which board failed. Pass " +
        "the board's directory name under boards/."
      )
    case "targets-strips":
      return (
        "R is the strip count the floor is derived against and one strip is worth one cut " +
        "(COST 2.1), so a defaulted R would be a floor nobody chose - and Q4 and A3 are " +
        "both measured against it. HC6's figure for the owner's stock is `stockRows` in " +
        "stripboard/rules.json; a board cut from a different piece declares its own size " +
        "in boards/<board>/perfboard.json."
      )
    case "targets-nets":
      return (
        "N is the first term of C = N + J - S_occ, so a network naming no nets has no cost " +
        "identity to be graded against. Deriving max(0, 0 - R) = 0 from it would report a " +
        "board as already at its floor, which is the one answer that must never be guessed."
      )
    case "targets-residency":
      return (
        "The net graph's edges are forced by ON-BOARD components only (COST 6.4), so a " +
        "network with nothing on the board yields an edgeless graph and targets nothing " +
        "can be held to. A component is on the board when its `part.footprint` is set and " +
        "off it when it carries only a `part.symbol`; a network with no footprint anywhere " +
        "is an ELECTRICAL network that was never physicalized. Pass " +
        "`physicalBoard(section)` from circuits/pultec/physical/board.ts, not the section's " +
        "electrical network."
      )
    case "occupied-missing-pins":
      return (
        "S_occ is counted from the `PIN` holes, so a placed part whose leads are not " +
        "reported makes it an undercount - and S_occ enters C = N + J - S_occ negatively, " +
        "so an undercount inflates J and flatters the clustering of the very layout being " +
        "graded. It is not skipped over for the same reason: a quieter S_occ is " +
        "indistinguishable from a better layout."
      )
    case "identity-counts":
      return (
        "C, N, S_occ, J and P are COUNTS - of cut lines, nets, strips, segment joins and " +
        "pins - so a negative or fractional one is a measurement that did not come from " +
        "counting anything. Rounding or clamping it would carry the fault into the " +
        "identity, which is checked on every candidate and would then be checking a " +
        "repaired number against itself."
      )
    case "negative-joins":
      return (
        "J = sum over nets of (segments - 1) and every term is at least zero, so a negative " +
        "J describes no layout whatsoever. The likeliest cause is a dump whose `CUT_STATE` " +
        "is UNRESOLVED, where the cut list is absent rather than empty and `C` is therefore " +
        "not a derived count at all (CRITERIA HC2): `transistor-preamp-lab` reads C = 0, " +
        "N = 18, S_occ = 17 and yields J = -1 for exactly that reason. Check `CUT_STATE` " +
        "first; a COMPUTED dump reaching here instead means S_occ or the net count was read " +
        "from a different board than the cuts were. Returning the impossible value would " +
        "hide whichever it is."
      )
    case "clustering-undefined":
      return (
        "kappa = J / (P - N) is the fraction of the AVAILABLE splitting a layout has " +
        "committed (CRITERIA K1), and P - N is how much splitting the circuit admits at " +
        "all: J is at most P - N by COST 1.4's corollary. At P = N nothing can split, so " +
        "there is no fraction to report and no value - 0 least of all, which would read as " +
        "a perfectly clustered board - may stand in for one. Below P = N, or above " +
        "J = P - N, the three counts did not come from one board."
      )
  }
}

function refuse(refusal: TargetsRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(P0; COST sections 1.4, 2.1 and 6.4 and CRITERIA K1, K4, K5 and Q4 are the " +
      "authority, and tools/stripboard/targets.ts is the only implementation of the " +
      "identity.)",
  )
}

/** The net graph: nets as vertices, on-board components as the edges they force. */
export interface NetGraph {
  /** Every net the network names, sorted. Vertices with no edge are included. */
  readonly nets: readonly string[]
  /** Each unordered pair once, low end first, sorted. */
  readonly edges: readonly (readonly [string, string])[]
  readonly maxDegree: number
  /** `⌈maxDegree/2⌉`: a LOWER bound on any arrangement's bandwidth. */
  readonly bandwidthLowerBound: number
}

/** What one board is graded against. P0's output, per board. */
export interface BoardTargets {
  readonly board: string
  /** `N`: every net any pin names, lead or breakout pad. */
  readonly netCount: number
  /** `P`: every pin of every component - every hole with a lead in it. */
  readonly pinCount: number
  /** `R`: the strips available. */
  readonly strips: number
  /** `C_floor = max(0, N − R)`, UNCONSTRAINED (CRITERIA limit H-2). */
  readonly cutFloor: number
  readonly netGraph: NetGraph
  /** One reverse-Cuthill-McKee arrangement of `netGraph.nets`. */
  readonly ordering: readonly string[]
  /** That ordering's bandwidth: an UPPER bound, never "the" bandwidth. */
  readonly orderingBandwidth: number
}

/** Every net this component's pins name, once per pin (so `P` can be summed). */
function pinNetsOf(component: Component): readonly string[] {
  const nets: string[] = []
  for (const group of [component.pins, ...component.units.map((unit) => unit.pins)]) {
    for (const connection of Object.values(group)) {
      if (connection.kind === "net") nets.push(connection.net)
    }
  }
  return nets
}

/**
 * Whether this component sits on the board, read off the physical model's own
 * marker: a board-resident part carries `part.footprint`, an off-board landing
 * carries only `part.symbol`. Never inferred from an id or a kind.
 */
export function onBoard(component: Component): boolean {
  return component.part?.footprint !== undefined
}

/**
 * One net, its neighbours held as object references rather than by name.
 *
 * References rather than a name-keyed map so that every traversal below is
 * total by construction: there is no lookup that can miss and therefore no
 * branch that must either invent a vertex or skip an edge. `position` is the
 * ordering's assignment, and the bandwidth is read off those positions.
 */
interface Vertex {
  readonly net: string
  readonly neighbours: Vertex[]
  position: number
}

/** The pair key for an unordered edge, low end first. */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`
}

interface BuiltGraph {
  readonly vertices: readonly Vertex[]
  readonly edges: readonly (readonly [string, string])[]
}

/**
 * The vertices and edges: every net a vertex, every on-board component's
 * distinct net pairs an edge, de-duplicated so two parts joining one pair
 * count once.
 */
function buildGraph(network: Network): BuiltGraph {
  const byNet = new Map<string, Vertex>()
  const vertexFor = (netName: string): Vertex => {
    const existing = byNet.get(netName)
    if (existing !== undefined) return existing
    const created: Vertex = { net: netName, neighbours: [], position: -1 }
    byNet.set(netName, created)
    return created
  }

  for (const component of network.components) {
    for (const netName of pinNetsOf(component)) vertexFor(netName)
  }

  const keys = new Set<string>()
  const edges: (readonly [string, string])[] = []
  for (const component of network.components) {
    if (!onBoard(component)) continue
    const touched = [...new Set(pinNetsOf(component))].sort()
    for (let i = 0; i < touched.length; i += 1) {
      for (let j = i + 1; j < touched.length; j += 1) {
        const a = touched[i]
        const b = touched[j]
        const key = edgeKey(a, b)
        if (keys.has(key)) continue
        keys.add(key)
        edges.push([a, b])
        const va = vertexFor(a)
        const vb = vertexFor(b)
        va.neighbours.push(vb)
        vb.neighbours.push(va)
      }
    }
  }

  const vertices = [...byNet.values()].sort((a, b) => (a.net < b.net ? -1 : a.net > b.net ? 1 : 0))
  edges.sort((left, right) => (left[0] === right[0]
    ? (left[1] < right[1] ? -1 : 1)
    : (left[0] < right[0] ? -1 : 1)))
  return { vertices, edges }
}

/** Fewest neighbours first, then by name, so the ordering is reproducible. */
function byDegreeThenName(a: Vertex, b: Vertex): number {
  if (a.neighbours.length !== b.neighbours.length) return a.neighbours.length - b.neighbours.length
  return a.net < b.net ? -1 : a.net > b.net ? 1 : 0
}

/**
 * The reverse Cuthill-McKee ordering, and the positions it assigns.
 *
 * Breadth-first from the lowest-degree unvisited vertex, neighbours taken in
 * increasing degree, each connected component laid down contiguously, the
 * whole reversed at the end. A net no on-board component touches is its own
 * component and lands in a block of its own, so it separates no edge's
 * endpoints and cannot inflate the bandwidth.
 */
function reverseCuthillMcKee(vertices: readonly Vertex[]): readonly Vertex[] {
  const visited = new Set<Vertex>()
  const order: Vertex[] = []
  for (const root of [...vertices].sort(byDegreeThenName)) {
    if (visited.has(root)) continue
    visited.add(root)
    const queue: Vertex[] = [root]
    // An index rather than `shift()`, which is typed `Vertex | undefined` and
    // would need an unreachable branch to narrow.
    for (let head = 0; head < queue.length; head += 1) {
      const vertex = queue[head]
      order.push(vertex)
      for (const neighbour of [...vertex.neighbours].sort(byDegreeThenName)) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        queue.push(neighbour)
      }
    }
  }
  const reversed = [...order].reverse()
  reversed.forEach((vertex, index) => { vertex.position = index })
  return reversed
}

/** The widest gap an edge spans in the ordering: `max |pos(a) − pos(b)|`. */
function bandwidthOf(ordered: readonly Vertex[]): number {
  let widest = 0
  for (const vertex of ordered) {
    for (const neighbour of vertex.neighbours) {
      widest = Math.max(widest, Math.abs(vertex.position - neighbour.position))
    }
  }
  return widest
}

/**
 * One board's targets: `N`, `P`, the derived floor, the net graph and one
 * arrangement of it.
 *
 * `strips` is `R`, the strips the board has, and is required: see
 * `targets-strips`.
 */
export function deriveTargets(network: Network, strips: number, board: string): BoardTargets {
  if (board.trim() === "") {
    refuse("targets-board", `the board name is "${board}"`)
  }
  if (!Number.isInteger(strips) || strips < 1) {
    refuse("targets-strips", `${board} was given ${strips} strips`)
  }

  const { vertices, edges } = buildGraph(network)
  const netCount = vertices.length
  if (netCount === 0) {
    refuse("targets-nets", `${board}'s network names no nets at all`)
  }

  if (!network.components.some(onBoard)) {
    refuse(
      "targets-residency",
      `none of ${board}'s ${network.components.length} components carries a part.footprint`,
    )
  }

  const pinCount = network.components.reduce(
    (total, component) => total + pinNetsOf(component).length,
    0,
  )
  let maxDegree = 0
  for (const vertex of vertices) maxDegree = Math.max(maxDegree, vertex.neighbours.length)
  const ordered = reverseCuthillMcKee(vertices)

  return {
    board,
    netCount,
    pinCount,
    strips,
    cutFloor: Math.max(0, netCount - strips),
    netGraph: {
      nets: vertices.map((vertex) => vertex.net),
      edges,
      maxDegree,
      bandwidthLowerBound: Math.ceil(maxDegree / 2),
    },
    ordering: ordered.map((vertex) => vertex.net),
    orderingBandwidth: bandwidthOf(ordered),
  }
}

/**
 * `S_occ`: how many distinct strips hold a lead.
 *
 * A hole's strip is its ROW under horizontal strips and its COLUMN under
 * vertical ones - the axis `VERTICAL_STRIPS` names, which is the same
 * definition HC8's reconstruction uses and is a definition rather than data
 * (nothing in the dump states it). `PAD` holes print `PIN` lines like any
 * other lead and are counted with them.
 */
export function occupiedStrips(dump: BoardDump): number {
  for (const part of dump.parts) {
    if (part.placement === "floating") continue
    const pins = dump.pins[part.ref]
    if (pins === undefined || pins.length === 0) {
      refuse("occupied-missing-pins", noPinLinesMessage(part))
    }
  }
  const strips = new Set<number>()
  for (const pins of Object.values(dump.pins)) {
    for (const pin of pins) strips.add(dump.verticalStrips ? pin.col : pin.row)
  }
  return strips.size
}

/** A count must be a whole number and not negative, or it counted nothing. */
function requireCount(value: number, name: string, context: string): void {
  if (!Number.isInteger(value) || value < 0) {
    refuse("identity-counts", `${context}: ${name} is ${value}`)
  }
}

/**
 * `J = C − N + S_occ`: the segment joins a layout requires, from COST §1.4's
 * identity rearranged.
 *
 * REFUSES A NEGATIVE RESULT rather than returning it, naming `CUT_STATE` as
 * the likeliest cause. That reading is free and exact, and it is CRITERIA
 * HC2's condition arriving by a second route - not a substitute for reading
 * `CUT_STATE` itself.
 */
export function segmentJoins(cuts: number, netCount: number, occupied: number): number {
  const context = `C = ${cuts}, N = ${netCount}, S_occ = ${occupied}`
  requireCount(cuts, "the cut count C", context)
  requireCount(netCount, "the net count N", context)
  requireCount(occupied, "the occupied-strip count S_occ", context)
  const joins = cuts - netCount + occupied
  if (joins < 0) {
    refuse("negative-joins", `${context} gives J = C - N + S_occ = ${joins}`)
  }
  return joins
}

/**
 * `κ = J / (P − N)`: the fraction of the available splitting a layout has
 * committed (CRITERIA K1), in `[0, 1]`.
 *
 * `κ = 0` is NOT the floor and must not be read as one: at `κ = 0` the board
 * still carries `N − S_occ` cuts, so `C = C_floor` needs `κ = 0` AND
 * `S_occ = min(N, R)`.
 */
export function clustering(joins: number, pinCount: number, netCount: number): number {
  const context = `J = ${joins}, P = ${pinCount}, N = ${netCount}`
  requireCount(joins, "the segment-join count J", context)
  requireCount(pinCount, "the pin count P", context)
  requireCount(netCount, "the net count N", context)
  const available = pinCount - netCount
  if (available <= 0) {
    refuse("clustering-undefined", `${context} gives P - N = ${available}`)
  }
  if (joins > available) {
    refuse("clustering-undefined", `${context} has J above P - N = ${available}`)
  }
  return joins / available
}
