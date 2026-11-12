/**
 * The akcli 0.22.0 op-list envelope, as this repository writes it: protocol 2, KiCad, one target
 * file. The shape is akcli's (`draughting/venv-akcli/.../akcli/opspec.py`); an op-list missing
 * `protocol_version` or `target_format` is refused by akcli with `PROTOCOL_MISMATCH` and
 * `OP_UNSUPPORTED`, measured.
 *
 * An op is a plain record: akcli validates each op's fields itself (`akcli plan`), and every
 * op-list this repository writes is run through `plan` before `draw --apply`.
 */
import fs from "node:fs"
import path from "node:path"
import type { Network } from "../../lib/model/types.ts"

export type AkcliOp = Readonly<Record<string, unknown>>

export interface AkcliOpList {
  readonly protocol_version: 2
  readonly target_format: "kicad"
  readonly target_file: string
  readonly ops: readonly AkcliOp[]
}

export function opList(targetFile: string, ops: readonly AkcliOp[]): AkcliOpList {
  return { protocol_version: 2, target_format: "kicad", target_file: targetFile, ops }
}

/**
 * Millimetres (a sheet's own unit) to mils (akcli's), to four decimal places. Every point this
 * repository passes is on copperhead's 1.27 mm grid, a whole number of mils; the rounding only
 * removes the binary representation error of the division.
 */
export function mmToMil(mm: number): number {
  return Math.round((mm / 0.0254) * 1e4) / 1e4
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A `Network`'s three fields, checked: what a dynamically imported circuit builder returned. */
export function isNetwork(value: unknown): value is Network {
  return isRecord(value) && Array.isArray(value["components"]) && Array.isArray(value["blocks"]) && isRecord(value["ports"])
}

/** Import a circuit module by path, for the command-line entry points that take one. */
export async function importModule(file: string): Promise<Record<string, unknown>> {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) throw new Error(`circuit module ${abs} does not exist.`)
  const module: unknown = await import(abs)
  if (!isRecord(module)) throw new Error(`${abs} did not load as a module.`)
  return module
}

/** Call a module's named zero-argument export and require a `Network` back. */
export async function networkFrom(file: string, exportName: string): Promise<Network> {
  const module = await importModule(file)
  const builder = module[exportName]
  if (typeof builder !== "function") throw new Error(`${file} exports no function named "${exportName}".`)
  const network: unknown = builder()
  if (!isNetwork(network)) throw new Error(`${file}'s ${exportName}() did not return a Network.`)
  return network
}
