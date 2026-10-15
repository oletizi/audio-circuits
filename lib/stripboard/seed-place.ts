/**
 * HOW A SEED'S BOARD ACTUALLY GETS BUILT: the workspace a construction mutates,
 * the two placers, and the joins that make each net whole.
 *
 * `./seed.ts` is the API and the gate - it validates the inputs, runs one
 * construction per ordering and refuses a board that does not hold. This file is
 * the construction. The split is for the line ceiling and falls at a real seam:
 * everything here mutates one `Workspace` and nothing here decides whether the
 * result is good.
 *
 * **THE RULE EVERYTHING BELOW KEEPS, stated once:** a lead lands either on its
 * own net's HOME strip - the strip the ordering gave that net - or on a SCRATCH
 * strip, which is a strip no net calls home and which exactly one lead claims.
 * A lead never lands on another net's home strip. So no strip carries two nets'
 * leads, every strip is a single run, and `derivedCuts` returns nothing.
 * MEASURED rather than argued: `C = 0` on all 243 seeds built while this module
 * was written - 10 from derived orderings and 233 from random ones, across
 * `transistor-preamp-feedback` and `transistor-preamp-buffered`. What it
 * costs is board area, which `OBJ1`'s closed term list does not price; the
 * module comment in `./seed.ts` says so plainly, because it is a finding for the
 * owner rather than something to quietly rely on.
 */
import {
  type Grid,
  type Hole,
  type Placement,
  type Wire,
  type Bridge,
} from "./board.ts"
import { holeKey } from "./cuts.ts"
import {
  homeStripsFor,
  refuse,
  spanFor,
  type FixedFieldPart,
  type Ordering,
  type SeedFieldPin,
  type SeedLead,
  type SeedNetlist,
  type SeedPart,
  type TwoLeadPart,
} from "./seed-model.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/**
 * The directions a moulded pin field may be laid in, and **why there are two of
 * them rather than four.**
 *
 * `FACINGS` in `./board.ts` maps a footprint's own x axis - the axis
 * `classifyPads` decomposes its pin ROW along - onto the board. Under `E` and
 * `W` that axis runs along a strip, which puts every pin of the row on ONE
 * strip; under `S` and `N` it runs across the strips, one pin per strip. **Only
 * the second is used**, because a row along one strip is several nets' leads
 * interleaved on one conductor, and that is the open no cut list can close.
 * Which of `S` and `N` a part takes decides only which side of it the other rows
 * sit on, and the owner has ruled that question away for the one part here it
 * applies to: *"I dont care about trimmer orientation."*
 */
const FIELD_DIRECTIONS: readonly ("S" | "N")[] = ["S", "N"]

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

function free(workspace: Workspace, hole: Hole): boolean {
  return onBoard(workspace, hole) && !workspace.taken.has(holeKey(hole))
}

/** The lowest column at which every one of these strips has a free hole. */
function sharedColumn(workspace: Workspace, strips: readonly number[]): number | undefined {
  for (let column = 0; column < workspace.grid.columns; column += 1) {
    if (strips.every((strip) => free(workspace, { strip, column }))) return column
  }
  return undefined
}

/** A strip no net calls home and no lead has claimed. */
function scratchFree(workspace: Workspace, strip: number): boolean {
  return (
    strip >= 0 &&
    strip < workspace.grid.strips &&
    !workspace.hosted.has(strip) &&
    workspace.claimed.get(strip) === undefined
  )
}

function homeOf(workspace: Workspace, net: string): number {
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
 * Commit one placement: its holes become taken, its scratch strips claimed, and
 * each lead's strip recorded against its net.
 */
function commit(
  workspace: Workspace,
  part: SeedPart,
  direction: Placement["direction"],
  origin: Hole,
  seated: readonly { readonly lead: SeedLead; readonly hole: Hole }[],
): void {
  const pins = new Map<string, Hole>()
  for (const { lead, hole } of seated) {
    pins.set(lead.pin, hole)
    workspace.taken.add(holeKey(hole))
    record(workspace, lead.net, hole.strip)
    if (hole.strip !== homeOf(workspace, lead.net)) {
      workspace.claimed.set(hole.strip, `${part.ref}.${lead.pin}`)
    }
  }
  workspace.placements.push({
    ref: part.ref,
    footprint: part.footprint,
    origin,
    direction,
    holes: seated.map(({ hole }) => hole),
    pins,
  })
}

const SPAN_SOURCE =
  "The bounds are the owner's recorded part geometry (lib/kicad/lead-span.ts, HC5 and HC9) and " +
  "are not negotiable by a layout: a span the part cannot make is a board that scores well and " +
  "cannot be built"

/**
 * A two-lead part, placed across the strips its two nets host, or with one lead
 * on a scratch strip and a join.
 *
 * **THE ORDER THE TWO SHAPES ARE TRIED IN IS BY COST AND NOT BY TASTE.** Both
 * leads on their own home strips costs nothing; one lead off its home strip
 * costs exactly one join, which `F` prices at `rho_w` or `rho_s`. There is no
 * third shape: a part whose anchor lead cannot sit on its own home strip either
 * way round is one this construction has nothing left to offer, and it refuses
 * rather than substituting a placement. (A part whose two leads are on ONE net
 * is a separate branch, not a third shape - it lies along that strip, because
 * the two holes are already on one conductor.)
 *
 * **A STRAY LEAD GOES ON THE SCRATCH STRIP CLOSEST TO ITS OWN NET'S HOME** that
 * the anchor lead can still reach. Closest, because the join is then shortest -
 * and at a distance of one strip it is a solder bridge rather than a wire, which
 * is how the owner's own board joins a trimmer's wiper to the end it is tied to
 * (`SOLDER 4,5 5,5` on `transistor-preamp-feedback`: strip 5 column 5 holds
 * `RV1.3`, and strip 4 is where its wiper `RV1.2` sits - checked against the
 * dump's own `PIN` lines, not read off the picture). It is a measurable quantity
 * driven down, not a preference.
 */
export function placeTwoLead(workspace: Workspace, part: TwoLeadPart): void {
  const span = spanFor(part.footprint, workspace.spans)
  const [first, second] = part.leads
  const homes = [homeOf(workspace, first.net), homeOf(workspace, second.net)] as const

  if (homes[0] === homes[1]) {
    // Both leads on one net: the part lies ALONG that strip at its minimum
    // span, because the two holes are on the same conductor and the distance
    // between them buys nothing.
    const width = span.minSpanHoles
    for (let column = 0; column + width - 1 < workspace.grid.columns; column += 1) {
      const a = { strip: homes[0], column }
      const b = { strip: homes[0], column: column + width - 1 }
      if (!free(workspace, a) || !free(workspace, b)) continue
      commit(workspace, part, "E", a, [{ lead: first, hole: a }, { lead: second, hole: b }])
      return
    }
  } else {
    const holes = Math.abs(homes[0] - homes[1]) + 1
    if (holes >= span.minSpanHoles && holes <= span.maxSpanHoles) {
      const column = sharedColumn(workspace, homes)
      if (column !== undefined) {
        const a = { strip: homes[0], column }
        const b = { strip: homes[1], column }
        const direction = homes[1] > homes[0] ? "S" : "N"
        commit(workspace, part, direction, a, [
          { lead: first, hole: a },
          { lead: second, hole: b },
        ])
        return
      }
    }
    for (const [anchor, stray] of [[first, second], [second, first]] as const) {
      const anchorHome = homeOf(workspace, anchor.net)
      const strayHome = homeOf(workspace, stray.net)
      const strip = nearestScratch(workspace, anchorHome, strayHome, span)
      if (strip === undefined) continue
      const column = sharedColumn(workspace, [anchorHome, strip])
      if (column === undefined) continue
      const anchorSeat = { lead: anchor, hole: { strip: anchorHome, column } }
      const straySeat = { lead: stray, hole: { strip, column } }
      // The seats are listed in the part's OWN pin order, because `origin` is
      // where the footprint's first pad lands and `direction` is read against
      // that same frame.
      const originSeat = anchor === first ? anchorSeat : straySeat
      const secondSeat = anchor === first ? straySeat : anchorSeat
      const direction = secondSeat.hole.strip > originSeat.hole.strip ? "S" : "N"
      commit(workspace, part, direction, originSeat.hole, [originSeat, secondSeat])
      return
    }
  }
  refuse(
    "leads-cannot-reach",
    `"${part.ref}" (${part.footprint}) has "${first.pin}" on net "${first.net}" and ` +
      `"${second.pin}" on net "${second.net}", and under ordering "${workspace.ordering}" those ` +
      `two nets are hosted on strips ${homes[0]} and ${homes[1]} - a span of ` +
      `${Math.abs(homes[0] - homes[1]) + 1} holes against this footprint's recorded ` +
      `[${span.minSpanHoles}, ${span.maxSpanHoles}].\nNo scratch strip the anchor lead can ` +
      "reach is free either, so neither a direct placement nor a single join can realise this " +
      `assignment, and the board edge or the holes already taken are what closed it off.\n` +
      `${SPAN_SOURCE}.\nNothing is substituted: a placement outside the band is a seed the ` +
      "optimizer would have to repair, and a decision that should never have been accepted is " +
      "worse than a construction that stopped. Change the ordering - the stride is what sets " +
      "how far apart two hosted nets are - or give the circuit a wider piece of stock.",
  )
}

/** The free scratch strip nearest the stray lead's own home that the anchor can still reach. */
function nearestScratch(
  workspace: Workspace,
  anchorHome: number,
  strayHome: number,
  span: LeadSpan,
): number | undefined {
  let best: number | undefined
  for (let strip = 0; strip < workspace.grid.strips; strip += 1) {
    if (!scratchFree(workspace, strip)) continue
    const holes = Math.abs(strip - anchorHome) + 1
    if (holes < span.minSpanHoles || holes > span.maxSpanHoles) continue
    if (best === undefined || Math.abs(strip - strayHome) < Math.abs(best - strayHome)) best = strip
  }
  return best
}

/** One way of laying a moulded field down: where it sits, and what it would cost. */
interface FieldOption {
  readonly direction: "S" | "N"
  readonly originStrip: number
  /** Each terminal with the strip it would land on, paired so neither can drift. */
  readonly rows: readonly { readonly pin: SeedFieldPin; readonly strip: number }[]
  readonly joins: number
}

/**
 * A part with a moulded pin field, laid across the strips.
 *
 * **THE FIELD IS ORIENTED AND NEVER RESHAPED.** Every option below places every
 * pin at the step offsets the part was declared with; what varies is the
 * direction (two of them - see `FIELD_DIRECTIONS`) and which strip the field
 * starts on. **A pin may land only on its OWN net's home strip or on a free
 * scratch strip** - never on another net's home strip, which is what keeps every
 * strip to one net and therefore keeps the cut count at zero.
 *
 * **OPTIONS ARE ORDERED BY JOIN COUNT, WHICH IS THE COST `F` PRICES**, then by
 * direction and then by the lowest starting strip so that two runs over equal
 * inputs return equal boards. The first option that also has a free column
 * wins; the column search is separate because a window can be sound in strips
 * and full in holes.
 */
export function placeFixedField(workspace: Workspace, part: FixedFieldPart): void {
  const options: FieldOption[] = []
  for (const direction of FIELD_DIRECTIONS) {
    for (let originStrip = 0; originStrip < workspace.grid.strips; originStrip += 1) {
      const rows = part.field.map((pin) => ({
        pin,
        strip: direction === "S" ? originStrip + pin.alongSteps : originStrip - pin.alongSteps,
      }))
      let joins = 0
      let sound = true
      for (const { pin, strip } of rows) {
        if (strip < 0 || strip >= workspace.grid.strips) {
          sound = false
          break
        }
        if (strip === homeOf(workspace, pin.net)) continue
        if (!scratchFree(workspace, strip)) {
          sound = false
          break
        }
        joins += 1
      }
      if (sound) options.push({ direction, originStrip, rows, joins })
    }
  }
  options.sort(
    (a, b) =>
      a.joins - b.joins ||
      FIELD_DIRECTIONS.indexOf(a.direction) - FIELD_DIRECTIONS.indexOf(b.direction) ||
      a.originStrip - b.originStrip,
  )
  for (const option of options) {
    for (let column = 0; column < workspace.grid.columns; column += 1) {
      const seated = option.rows.map(({ pin, strip }) => ({
        lead: pin,
        hole: {
          strip,
          column: option.direction === "S" ? column - pin.acrossSteps : column + pin.acrossSteps,
        },
      }))
      if (!seated.every(({ hole }) => free(workspace, hole))) continue
      commit(workspace, part, option.direction, { strip: option.originStrip, column }, seated)
      return
    }
  }
  refuse(
    "field-cannot-be-seated",
    `"${part.ref}" (${part.footprint}) has a moulded field of ${part.field.length} terminals ` +
      `and under ordering "${workspace.ordering}" there is no way to lay it down.\nIts ` +
      "terminals and the strips hosting their nets are:\n" +
      part.field
        .map(
          (pin) =>
            `  "${pin.pin}" on net "${pin.net}", hosted on strip ${homeOf(workspace, pin.net)}, ` +
            `at ${pin.alongSteps} steps along the row and ${pin.acrossSteps} across`,
        )
        .join("\n") +
      `\n${options.length} of the ${FIELD_DIRECTIONS.length * workspace.grid.strips} windows ` +
      "were sound in strips, and none of those had a column with every hole free.\nA field pin " +
      "may land on its own net's home strip or on a strip no net hosts and no other lead has " +
      "claimed; a pin on another net's home strip is refused rather than placed, because two " +
      "nets' leads on one conductor is the open no cut list can close.\nNothing is " +
      "substituted. Change the ordering - which nets sit beside each other, and the stride " +
      "between them, is what decides whether a moulded field reaches two home strips at once.",
  )
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
 * choose would be a core module reading the file the scorer is handed. A search
 * that wants the other one swaps it and is scored.
 */
export function joinNets(workspace: Workspace, netlist: SeedNetlist): void {
  for (const net of [...netlist.nets.keys()].sort()) {
    const strips = [...(workspace.landed.get(net) ?? [])].sort((a, b) => a - b)
    let low: number | undefined
    for (const high of strips) {
      const previous = low
      low = high
      if (previous === undefined) continue
      const column = sharedColumn(workspace, [previous, high])
      if (column === undefined) {
        refuse(
          "no-column-to-join",
          `net "${net}" has leads on strips ${previous} and ${high} and there is no column ` +
            `where ` +
            `both strips still have a free hole, so neither a wire nor a bridge can be put ` +
            `between them.\nThe stock is ${workspace.grid.strips} strips of ` +
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
    placements: [],
    wires: [],
    bridges: [],
  }
}
