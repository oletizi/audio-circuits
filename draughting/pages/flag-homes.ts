/**
 * A board's PWR_FLAG HOMES, read from `<board-dir>/repair/tools/pwr-flag-homes.ts`: where each shared
 * net's single PWR_FLAG lives (the module's ruling is CR-MODULE-PWR-FLAGS). Each net carries at most
 * one PWR_FLAG across the whole hierarchy, because two on one net are an ERC `pin_to_pin` error (power
 * output to power output).
 *
 * The table exports `ROOT_SHEET` (the name it uses for the root sheet as a home), `SHARED_FLAG_HOME`
 * (board net -> the block page carrying its flag, or `ROOT_SHEET`), `PRIVATE_FLAGS` (block -> the
 * private nets its own page flags) and `RULING` (the ruling the table is declared under, which the
 * tools' messages name). This file is the logic the module's table carried beside its data until the
 * H7 pedal plan's Task 4 moved it here (`flagLivesElsewhere`).
 */
import type { PageBoard } from "./board.ts"
import { exported, importTable, isRecord } from "./table-input.ts"

export const FLAG_HOMES_FILE = "pwr-flag-homes.ts"

export interface FlagHomes {
  readonly rootSheet: string
  readonly shared: Readonly<Record<string, string>>
  readonly privateFlags: Readonly<Record<string, readonly string[]>>
  readonly ruling: string
}

/** The board's flag-home table, refusing - naming the file - when it is missing or malformed. */
export async function flagHomes(board: PageBoard): Promise<FlagHomes> {
  const file = FLAG_HOMES_FILE
  const module = await importTable(board, file, "where each shared net's single PWR_FLAG lives")
  const where = (key: string): string => `${board.tablesDir}/${file}'s ${key}`
  const rootSheet = exported(module, "ROOT_SHEET", board, file)
  const ruling = exported(module, "RULING", board, file)
  if (typeof rootSheet !== "string") throw new Error(`${where("ROOT_SHEET")} is not a string`)
  if (typeof ruling !== "string") throw new Error(`${where("RULING")} is not a string`)
  const sharedValue = exported(module, "SHARED_FLAG_HOME", board, file)
  const privateValue = exported(module, "PRIVATE_FLAGS", board, file)
  if (!isRecord(sharedValue)) throw new Error(`${where("SHARED_FLAG_HOME")} is not an object`)
  if (!isRecord(privateValue)) throw new Error(`${where("PRIVATE_FLAGS")} is not an object`)
  const shared: Record<string, string> = {}
  for (const [net, home] of Object.entries(sharedValue)) {
    if (typeof home !== "string") throw new Error(`${where("SHARED_FLAG_HOME")}["${net}"] is not a page name`)
    shared[net] = home
  }
  const privateFlags: Record<string, readonly string[]> = {}
  for (const [block, nets] of Object.entries(privateValue)) {
    if (!Array.isArray(nets) || !nets.every((n: unknown) => typeof n === "string")) {
      throw new Error(`${where("PRIVATE_FLAGS")}["${block}"] is not an array of net names`)
    }
    privateFlags[block] = nets.filter((n: unknown): n is string => typeof n === "string")
  }
  return { rootSheet, shared, privateFlags, ruling }
}

/** True when the board net's declared flag is NOT on `block`'s page, so `block` must not carry one. */
export function flagLivesElsewhere(homes: FlagHomes, net: string, block: string): boolean {
  const home = homes.shared[net]
  return home !== undefined && home !== block
}
