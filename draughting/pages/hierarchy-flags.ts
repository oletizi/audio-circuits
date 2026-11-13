/**
 * EXACTLY ONE PWR_FLAG PER FLAGGED NET ACROSS A BOARD'S WHOLE HIERARCHY, at its declared home (the
 * board's `pwr-flag-homes.ts`; the module's ruling CR-MODULE-PWR-FLAGS). The whole-project check the
 * ruling asks the root step for; `./flag-check.ts` checks one block page at a time.
 *
 * Input: the `kicad-cli` export of `./hierarchy_flag_probe.py`'s probe root, in which every flag of
 * every sheet is a component FLGPROBE<k> with pin 1 on its net, and the probe's map (k -> the sheet
 * it is on). Which BOARD net a flag sits on is read from the export's real members on that net,
 * mapped through the model (`modelPinNets`: each "designator.pin" -> its board net), never
 * from a net name: a private net's exported name is KiCad's, and a shared net's is whichever label
 * KiCad chose.
 *
 * Fails (exit 1), naming the net:
 *  - a net in SHARED_FLAG_HOME with no flag, or with more than one;
 *  - a net in SHARED_FLAG_HOME whose flag is on another sheet than its declared home;
 *  - a private flag (PRIVATE_FLAGS) missing, doubled, or off its block;
 *  - a flag on ANY net the tables do not declare - including a block's private net, which
 *    `flag-check.ts` passes as private (the parked Task 7a minor: this is its backstop);
 *  - a flag whose net holds no model pin, or whose members map to two board nets;
 *  - an export listing a different number of probes than the probe wrote.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun hierarchy-flags.ts <board-dir> <probe-export.net> <probe-map.json>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { pinNumberFor } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { boardFromArgs, type PageBoard } from "./board.ts"
import { flagHomes, type FlagHomes } from "./flag-homes.ts"

/**
 * "designator.pin number" -> the board net the model puts it on, for every connected pin of every
 * component (`DESIGNATORS`, and `pinNumberFor` over `PIN_NUMBERS`, as the round-trip comparison
 * numbers them). Throws on a component with no designator.
 */
export function modelPinNets(board: PageBoard): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const c of board.network.components) {
    const ref = board.designators[c.id]
    if (ref === undefined) throw new Error(`${c.id} has no designator in DESIGNATORS (${basename(board.circuitRel)})`)
    for (const pins of [c.pins, ...c.units.map((u) => u.pins)]) {
      for (const [key, connection] of Object.entries(pins)) {
        if (connection.kind === "net") out.set(`${ref}.${pinNumberFor(c, key, board.pinNumbers)}`, connection.net)
      }
    }
  }
  return out
}

export interface FlagPlace {
  readonly probe: string
  readonly sheet: string
  readonly net: string
}

/** The declared home of every flagged board net: shared nets from the table, private ones as `<block>_<net>` on their block. */
export function declaredHomes(table: FlagHomes): ReadonlyMap<string, string> {
  const homes = new Map<string, string>(Object.entries(table.shared))
  for (const [block, nets] of Object.entries(table.privateFlags)) for (const net of nets) homes.set(`${block}_${net}`, block)
  return homes
}

/** Every fault in where the hierarchy's flags sit, against the declared homes; empty when each flagged net has exactly one, at home. */
export function flagFaults(places: readonly FlagPlace[], homes: ReadonlyMap<string, string>): string[] {
  const faults: string[] = []
  const byNet = new Map<string, FlagPlace[]>()
  for (const p of places) byNet.set(p.net, [...(byNet.get(p.net) ?? []), p])
  for (const [net, home] of [...homes].sort()) {
    const on = byNet.get(net) ?? []
    if (on.length === 0) faults.push(`${net} carries no PWR_FLAG anywhere in the hierarchy; its declared home is ${home}`)
    if (on.length > 1) faults.push(`${net} carries ${on.length} PWR_FLAGs, on ${on.map((p) => p.sheet).join(", ")}; it must carry exactly one, on ${home}`)
    for (const p of on) if (p.sheet !== home) faults.push(`${net}'s PWR_FLAG is on ${p.sheet}; its declared home is ${home}`)
  }
  for (const [net, on] of [...byNet].sort()) {
    if (!homes.has(net)) faults.push(`${net} carries a PWR_FLAG (on ${on.map((p) => p.sheet).join(", ")}) and has no declared flag home; declare it in pwr-flag-homes.ts with its reason, or remove the flag`)
  }
  return faults
}

if (import.meta.main) {
  const usage = "bun hierarchy-flags.ts <board-dir> <probe-export.net> <probe-map.json>"
  const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
  const [exportFile, mapFile] = rest
  if (exportFile === undefined || mapFile === undefined) {
    throw new Error(`usage: ${usage} - all three are required`)
  }
  const homes = declaredHomes(await flagHomes(board))
  const probeMap: unknown = JSON.parse(readFileSync(mapFile, "utf8"))
  if (typeof probeMap !== "object" || probeMap === null || Array.isArray(probeMap)) throw new Error(`${mapFile} is not a JSON object`)
  const sheetOf = new Map<string, string>()
  for (const [probe, entry] of Object.entries(probeMap)) {
    const sheet: unknown = typeof entry === "object" && entry !== null ? Reflect.get(entry, "sheet") : undefined
    if (typeof sheet !== "string") throw new Error(`${mapFile}: ${probe} names no sheet`)
    sheetOf.set(probe, sheet)
  }
  const boardNetOf = modelPinNets(board)
  const exported = importNetlist(readFileSync(exportFile, "utf8"))
  const faults: string[] = []
  const probes = exported.components.map((c) => c.designator).filter((d) => d.startsWith("FLGPROBE")).sort()
  if (probes.length !== sheetOf.size) faults.push(`the probe export lists ${probes.length} PWR_FLAG(s) and the probe wrote ${sheetOf.size}; a flag was not exported`)
  const places: FlagPlace[] = []
  for (const probe of probes) {
    const sheet = sheetOf.get(probe) ?? "<not in the probe map>"
    const nets = Object.entries(exported.nets).filter(([, members]) => members.includes(`${probe}.1`))
    const members = nets[0]?.[1]
    if (nets.length !== 1 || members === undefined) {
      faults.push(`PWR_FLAG ${probe} (on ${sheet}) is on ${nets.length} exported nets; expected exactly one`)
      continue
    }
    const boardNets = [...new Set(members.filter((m) => !m.startsWith("FLGPROBE")).map((m) => boardNetOf.get(m) ?? `<${m} is on no model net>`))]
    const net = boardNets[0]
    if (boardNets.length !== 1 || net === undefined) {
      faults.push(`PWR_FLAG ${probe} (on ${sheet}) is on a net whose real pins map to ${boardNets.length} model nets (${boardNets.join(", ") || "none: no part pin on it"})`)
      continue
    }
    console.log(`PWR_FLAG ${probe}: on ${sheet}, board net ${net}`)
    places.push({ probe, sheet, net })
  }
  faults.push(...flagFaults(places, homes))
  for (const fault of faults) console.error(`hierarchy-flags.ts: FAIL - ${fault}`)
  if (faults.length === 0) console.log(`hierarchy-flags.ts: ${places.length} PWR_FLAG(s), exactly one on each of ${homes.size} flagged net(s), each at its declared home`)
  process.exit(faults.length === 0 ? 0 : 1)
}
