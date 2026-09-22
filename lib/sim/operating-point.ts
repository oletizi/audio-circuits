import { Simulation } from "eecircuit-engine"
import { genuineErrors } from "./ac.ts"

export interface OperatingPointRequest {
  /** Complete SPICE deck including its .op line and .end. */
  readonly netlist: string
  /** Node names to extract, without the v() wrapper. */
  readonly nodes: readonly string[]
}

/**
 * Runs one operating-point (.op) analysis and returns each requested node's
 * bias voltage. Throws on engine error, complex-valued output (i.e. not a
 * `.op` result), or a missing node.
 */
export async function runOperatingPoint(
  request: OperatingPointRequest,
): Promise<Readonly<Record<string, number>>> {
  if (request.nodes.length === 0) {
    throw new Error("Empty node request: OperatingPointRequest.nodes must name at least one node")
  }

  const simulation = new Simulation()
  await simulation.start()
  simulation.setNetList(request.netlist)
  const result = await simulation.runSim()

  const rawErrors = simulation.getError()
  const errors = genuineErrors(rawErrors)
  if (errors.length > 0) {
    throw new Error(
      `Simulation error: ${errors.join("; ")}. Full unfiltered engine output: ${JSON.stringify(rawErrors)}`,
    )
  }
  if (result.dataType !== "real") {
    throw new Error(`Unexpected simulation data type: ${result.dataType} (expected real; check the .op line)`)
  }

  const values: Record<string, number> = {}
  for (const node of request.nodes) {
    const wanted = `v(${node.toLowerCase()})`
    const vector = result.data.find(d => d.name.toLowerCase() === wanted)
    if (!vector) throw new Error(`Node not present in simulation output: ${node}`)
    if (vector.values.length !== 1) {
      throw new Error(
        `Node ${node} resolved to ${vector.values.length} values, expected exactly 1 (an operating-point ` +
          `analysis should yield one bias value per node; check that the deck runs .op, not a sweep)`,
      )
    }
    values[node] = vector.values[0]
  }

  return values
}
