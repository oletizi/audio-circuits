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

function isNetwork(value: unknown): value is Network {
  if (typeof value !== "object" || value === null) return false
  const candidate: Record<string, unknown> = value as Record<string, unknown>
  return Array.isArray(candidate["components"]) && typeof candidate["ports"] === "object"
}

export async function loadCircuit(declaration: PerfboardDeclaration): Promise<Network> {
  let module: Record<string, unknown>
  try {
    module = (await import(declaration.circuitPath)) as Record<string, unknown>
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${declaration.file}: could not import the circuit at ${declaration.circuitPath}: ${detail}`,
    )
  }

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
