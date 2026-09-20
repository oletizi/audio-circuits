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
 *
 * This allowlist is intentionally narrow and observation-derived, not
 * exhaustive. `eecircuit-engine` itself (eecircuit-engine.mjs:97353) pushes
 * EVERY stderr line into the error array except two strings it hardcodes as
 * exclusions: "Warning: can't find the initialization file spinit." and
 * "Using SPARSE 1.3 as Direct Linear Solver" — the second of which is
 * unprefixed, which is the known precedent that benign non-"Note:" traffic
 * exists on this channel. A future engine build (for example one reporting
 * "Using KLU as Direct Linear Solver") could emit a new benign unprefixed
 * line this filter does not yet know about, and the allowlist here is
 * expected to grow as such lines are observed.
 *
 * Deny-by-default is deliberate, not an oversight: a duplicate-instance
 * deck was observed to return dataType "complex" while getError() carries a
 * genuine parse failure on an unprefixed continuation line ("device already
 * exists, bail out"). Inverting this to an allow-only-"Error:"/"Warning:"
 * rule would let that failure class through silently. When this filter
 * misclassifies a benign line as an error, the caller sees the full
 * unfiltered getError() output alongside the filtered subset (see the throw
 * in runAcSweep below) specifically so the misclassification is immediately
 * diagnosable rather than read as a phantom circuit fault.
 */
function genuineErrors(errors: readonly string[]): readonly string[] {
  return errors.filter(line => line.trim().length > 0 && !line.trim().startsWith("Note:"))
}

/** Runs one AC analysis. Throws on engine error, real-valued output, or a missing node. */
export async function runAcSweep(request: AcRequest): Promise<readonly AcSweep[]> {
  if (request.nodes.length === 0) {
    throw new Error("AcRequest.nodes must name at least one node; an empty request cannot produce a sweep")
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
  if (result.dataType !== "complex") {
    throw new Error(`Expected complex AC data, received ${result.dataType}. Check the .ac line.`)
  }

  const frequency = result.data.find(d => d.name.toLowerCase() === "frequency")
  if (!frequency) throw new Error("Simulation output contains no frequency vector")
  if (frequency.values.length !== result.numPoints) {
    throw new Error(
      `Frequency vector length ${frequency.values.length} does not match reported numPoints ${result.numPoints}`,
    )
  }

  return request.nodes.map(node => {
    const wanted = `v(${node.toLowerCase()})`
    const vector = result.data.find(d => d.name.toLowerCase() === wanted)
    if (!vector) throw new Error(`Node not present in simulation output: ${node}`)
    if (vector.values.length === 0) {
      throw new Error(`Node ${node} resolved to a zero-length data vector`)
    }
    if (vector.values.length !== frequency.values.length) {
      throw new Error(
        `Sweep length mismatch for node ${node}: node vector has ${vector.values.length} points, frequency vector has ${frequency.values.length} points`,
      )
    }
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
