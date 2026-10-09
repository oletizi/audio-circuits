/**
 * Boundary admittance of a network, as seen at its externally shared nodes.
 *
 * A GUARD, NOT A FITTING CRITERION. Gate A1 already proves a stand-in is a subset of
 * the section's own flat-state components, identical in kind, parameters and pin nets.
 * So this must agree to arithmetic noise, and it exists to catch the reduction
 * invariants being implemented wrongly in a way that still yields a plausible network -
 * not to grade an approximation. If a tolerance here ever becomes load-bearing,
 * something upstream is wrong.
 *
 * Computed directly rather than through SPICE: the complex nodal admittance matrix,
 * with internal nodes eliminated by Schur complement. That is the textbook boundary
 * reduction, it is deterministic, and it keeps the comparison free of the matrix
 * ordering noise two different netlists would introduce.
 *
 * NOTE ON DROPPED SUBNETWORKS. A connected piece holding no boundary node has a
 * singular internal block and contributes nothing, so it is filtered out before the
 * matrix is built. A piece that merely dead-ends INSIDE the network is kept and is not
 * singular: a dead-end node's Schur contribution works out to zero on its own, which is
 * precisely why the reduction is entitled to drop those components.
 */
import { connectedGroups } from "./isolate.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"

export interface Complex {
  readonly re: number
  readonly im: number
}

/** Conductance standing in for an ideal short. Finite so the matrix stays invertible,
 * and applied identically to both sides of any comparison, so a shared value cancels. */
const SHORT_SIEMENS = 1e12

function nodesOf(component: ResolvedComponent): readonly string[] {
  const nodes = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) {
    for (const net of Object.values(unit.pins)) nodes.add(net)
  }
  return [...nodes]
}

/** A component's branch admittance at one frequency. */
function admittanceOf(component: ResolvedComponent, hz: number): Complex {
  const omega = 2 * Math.PI * hz
  const parameters = component.parameters
  if (component.kind === "resistor" && "ohms" in parameters) {
    const ohms = parameters.ohms
    return { re: ohms === 0 ? SHORT_SIEMENS : 1 / ohms, im: 0 }
  }
  if (component.kind === "capacitor" && "farads" in parameters) {
    return { re: 0, im: omega * parameters.farads }
  }
  if (component.kind === "inductor" && "henries" in parameters) {
    // 1 / (j w L) = -j / (w L)
    return { re: 0, im: -1 / (omega * parameters.henries) }
  }
  throw new Error(
    `No branch admittance for ${component.id} (kind ${component.kind}). Boundary ` +
      `admittance is defined for the two-terminal passives a flat Pultec section ` +
      `reduces to; extend admittanceOf deliberately, with a test, rather than ` +
      `defaulting an unknown kind to zero.`,
  )
}

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}
function sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im }
}
function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}
function div(a: Complex, b: Complex): Complex {
  const denominator = b.re * b.re + b.im * b.im
  if (denominator === 0) throw new Error("Division by a zero admittance")
  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator,
  }
}
const ZERO: Complex = { re: 0, im: 0 }

/** Only the components in a connected piece that reaches the boundary. */
function attachedToBoundary(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
): readonly ResolvedComponent[] {
  const attached: ResolvedComponent[] = []
  for (const group of connectedGroups(components)) {
    const touchesBoundary = group.some((component) =>
      nodesOf(component).some((net) => boundary.has(net)),
    )
    if (touchesBoundary) attached.push(...group)
  }
  return attached
}

/**
 * The boundary admittance matrix, keyed `"<u>|<v>"` over boundary nodes other than the
 * reference. The reference is ground when the boundary includes it and the first
 * boundary net otherwise, because a network with no ground has no node to measure
 * against - and the choice is shared by both sides of a comparison.
 */
export function boundaryAdmittance(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
  hz: number,
  groundNet = "0",
): ReadonlyMap<string, Complex> {
  const attached = attachedToBoundary(components, boundary)
  const boundaryNets = [...boundary].sort()
  if (boundaryNets.length < 2) {
    throw new Error(
      `Boundary admittance needs at least two boundary nets, got ` +
        `${boundaryNets.length}. A one-terminal network presents nothing.`,
    )
  }
  const reference = boundary.has(groundNet) ? groundNet : boundaryNets[0]!

  const allNets = new Set<string>()
  for (const component of attached) for (const net of nodesOf(component)) allNets.add(net)
  for (const net of boundaryNets) allNets.add(net)
  allNets.delete(reference)

  // Boundary nodes first, so the matrix partitions without reordering.
  const ports = boundaryNets.filter((net) => net !== reference)
  const internal = [...allNets].filter((net) => !boundary.has(net)).sort()
  const order = [...ports, ...internal]
  const index = new Map(order.map((net, position) => [net, position]))

  const size = order.length
  const matrix: Complex[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ZERO),
  )
  for (const component of attached) {
    const nets = nodesOf(component)
    if (nets.length !== 2) continue // a self-loop carries no current
    const y = admittanceOf(component, hz)
    const [a, b] = nets as [string, string]
    const i = index.get(a)
    const j = index.get(b)
    if (i !== undefined) matrix[i]![i] = add(matrix[i]![i]!, y)
    if (j !== undefined) matrix[j]![j] = add(matrix[j]![j]!, y)
    if (i !== undefined && j !== undefined) {
      matrix[i]![j] = sub(matrix[i]![j]!, y)
      matrix[j]![i] = sub(matrix[j]![i]!, y)
    }
  }

  // Eliminate internal nodes by Schur complement, last first.
  for (let pivot = size - 1; pivot >= ports.length; pivot -= 1) {
    const pivotValue = matrix[pivot]![pivot]!
    if (pivotValue.re === 0 && pivotValue.im === 0) {
      throw new Error(
        `Internal node ${order[pivot]} has zero self-admittance at ${hz} Hz, so it ` +
          `cannot be eliminated. It is attached to the boundary but conducts nothing, ` +
          `which should not happen after attachedToBoundary.`,
      )
    }
    for (let row = 0; row < pivot; row += 1) {
      const factor = div(matrix[row]![pivot]!, pivotValue)
      if (factor.re === 0 && factor.im === 0) continue
      for (let column = 0; column < pivot; column += 1) {
        matrix[row]![column] = sub(matrix[row]![column]!, mul(factor, matrix[pivot]![column]!))
      }
    }
  }

  const reduced = new Map<string, Complex>()
  for (let row = 0; row < ports.length; row += 1) {
    for (let column = 0; column < ports.length; column += 1) {
      reduced.set(`${ports[row]}|${ports[column]}`, matrix[row]![column]!)
    }
  }
  return reduced
}
