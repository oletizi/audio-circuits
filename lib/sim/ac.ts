import { Simulation } from "eecircuit-engine"

export interface AcPoint {
  readonly frequency: number
  readonly real: number
  readonly imaginary: number
}

export interface AcSweep {
  readonly node: string
  readonly points: readonly AcPoint[]
}

export interface AcRequest {
  /** Complete SPICE deck including its .ac line and .end. */
  readonly netlist: string
  /** Node names to extract, without the v() wrapper. */
  readonly nodes: readonly string[]
}

/**
 * ngspice's getError() returns informational "Note:" lines (e.g. the benign
 * "Note: v1: has no value, DC 0 assumed" emitted for AC-only sources) and
 * blank strings even after a fully successful run. Measured directly:
 * getError() on a healthy AC sweep of an AC-only source returned
 * ["Note: v1: has no value, DC 0 assumed"]. Only entries that carry real
 * content and are not simulator notes indicate an actual problem.
 */
function genuineErrors(errors: readonly string[]): readonly string[] {
  return errors.filter(line => line.trim().length > 0 && !line.trim().startsWith("Note:"))
}

/** Runs one AC analysis. Throws on engine error, real-valued output, or a missing node. */
export async function runAcSweep(request: AcRequest): Promise<readonly AcSweep[]> {
  const simulation = new Simulation()
  await simulation.start()
  simulation.setNetList(request.netlist)
  const result = await simulation.runSim()

  const errors = genuineErrors(simulation.getError())
  if (errors.length > 0) throw new Error(`Simulation error: ${errors.join("; ")}`)
  if (result.dataType !== "complex") {
    throw new Error(`Expected complex AC data, received ${result.dataType}. Check the .ac line.`)
  }

  const frequency = result.data.find(d => d.name.toLowerCase() === "frequency")
  if (!frequency) throw new Error("Simulation output contains no frequency vector")

  return request.nodes.map(node => {
    const wanted = `v(${node.toLowerCase()})`
    const vector = result.data.find(d => d.name.toLowerCase() === wanted)
    if (!vector) throw new Error(`Node not present in simulation output: ${node}`)
    return {
      node,
      points: vector.values.map((value, index) => ({
        frequency: frequency.values[index].real,
        real: value.real,
        imaginary: value.img,
      })),
    }
  })
}
