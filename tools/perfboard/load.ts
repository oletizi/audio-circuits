/**
 * Load the circuit a declaration names and call its export.
 *
 * Every failure mode names the declaration rather than surfacing as whatever
 * the module system said. A module that throws on import, a missing export, or
 * an export that is not a function returning a Network must all stop the run:
 * the alternative is an empty netlist, which reads as a board with no parts and
 * would reconcile as "delete everything".
 */
import type { Network } from "../../lib/model/types.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"

function isNetwork(value: unknown): value is Network {
  if (!isRecord(value)) return false
  return Array.isArray(value["components"]) && isRecord(value["ports"])
}

export async function loadCircuit(declaration: PerfboardDeclaration): Promise<Network> {
  let imported: unknown
  try {
    imported = await import(declaration.circuitPath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${declaration.file}: could not import the circuit at ${declaration.circuitPath}: ${detail}`,
    )
  }
  if (!isRecord(imported)) {
    throw new Error(
      `${declaration.file}: the module at ${declaration.circuitPath} did not import as an object`,
    )
  }
  const module = imported

  const exported = module[declaration.exportName]
  if (exported === undefined) {
    const available = Object.keys(module).sort().join(", ")
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} has no export named ` +
        `"${declaration.exportName}". It exports: ${available || "(nothing)"}.`,
    )
  }
  if (typeof exported !== "function") {
    throw new Error(
      `${declaration.file}: export "${declaration.exportName}" is a ${typeof exported}, ` +
        "not a function returning a Network.",
    )
  }

  const network: unknown = exported()
  if (!isNetwork(network)) {
    throw new Error(
      `${declaration.file}: export "${declaration.exportName}" did not return a Network.`,
    )
  }
  return network
}
