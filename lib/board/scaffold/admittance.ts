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
 *
 * IDEAL SHORTS ARE MERGED INTO ELECTRICAL NODES HERE, NOT APPROXIMATED BY A LARGE
 * CONDUCTANCE. An earlier version of this file stood an ideal short in as 1e12 S "so
 * the matrix stays invertible", and that was wrong past the point of being a tolerance
 * question: the Schur complement of a 0R arm in series with 47k is `Ys*g/(Ys+g)`, and
 * at Ys = 1e12 the term `g = 2.1e-5` falls below one ulp of Ys, so `Ys + g` rounds to
 * `Ys` and the whole result collapses to EXACTLY ZERO. hi-boost's stand-in is that
 * network. The same arithmetic made the full section read 2.207e-5 where the analytic
 * answer is 2.128e-5 - a 3.7% error in a guard whose tolerance is 1e-9 relative. No
 * finite Ys fixes it: getting 1e-9 relative accuracy out of this elimination needs
 * Ys/g below about 4.5e6, which is not a short.
 *
 * So a short is treated as what it is, a node merge, via `lib/board/scaffold/shorts.ts`
 * - and the consequence is faced rather than papered over: when ideal shorts join ALL
 * of a network's boundary nets into one electrical node, the admittance it presents is
 * infinite and this function REFUSES. low-cut's flat stand-in is exactly that (one 0R
 * wire between its two boundary nets), so Gate A2 cannot cover it and says so out loud
 * instead of comparing two large numbers that agree only in their leading digits.
 */
import { connectedGroups } from "./isolate.ts"
import { electricalNodes, nodesOf } from "./shorts.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"

export interface Complex {
  readonly re: number
  readonly im: number
}

/** A component's branch admittance at one frequency. An ideal short never reaches
 * here: `electricalNodes` has already merged its two nets, so it is a self-loop by the
 * time the matrix is stamped, and a self-loop carries no current. */
function admittanceOf(component: ResolvedComponent, hz: number): Complex {
  const omega = 2 * Math.PI * hz
  const parameters = component.parameters
  if (component.kind === "resistor" && "ohms" in parameters) {
    const ohms = parameters.ohms
    if (ohms === 0) {
      throw new Error(
        `${component.id} is an ideal short (0 ohms) and reached admittanceOf, which ` +
          `means its nets were not merged into one electrical node first. Boundary ` +
          `admittance merges shorts rather than approximating them with a large ` +
          `conductance - see this module's comment for the arithmetic that forced it.`,
      )
    }
    return { re: 1 / ohms, im: 0 }
  }
  if (component.kind === "capacitor" && "farads" in parameters) {
    // A zero-farad capacitor is an OPEN, not a short - it presents zero admittance,
    // which is a legitimate finite answer, not a degenerate one. No guard needed: the
    // arithmetic below never diverges for farads === 0.
    return { re: 0, im: omega * parameters.farads }
  }
  if (component.kind === "inductor" && "henries" in parameters) {
    const henries = parameters.henries
    if (henries === 0) {
      throw new Error(
        `${component.id} is an ideal short (0 henries) and reached admittanceOf, ` +
          `which means its nets were not merged into one electrical node first. A ` +
          `zero-valued inductor is a short exactly as a zero-ohm resistor is - ` +
          `1/(j*omega*L) diverges as L -> 0, the same divergence the ohms === 0 guard ` +
          `above exists to catch. isIdealShort in shorts.ts only recognises a 0 ohm ` +
          `resistor today because nothing a flat Pultec section resolves to is a ` +
          `zero-henry inductor; if one is ever introduced, teach isIdealShort to merge ` +
          `it rather than letting this throw stand in for that.`,
      )
    }
    // 1 / (j w L) = -j / (w L)
    return { re: 0, im: -1 / (omega * henries) }
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
 * The boundary admittance matrix, keyed `"<u>|<v>"` over boundary ELECTRICAL nodes
 * other than the reference. The reference is ground when the boundary includes it and
 * the lexicographically first boundary node otherwise, because a network with no ground
 * has no node to measure against - and the choice is shared by both sides of a
 * comparison.
 *
 * A boundary node here is the electrical node a boundary net belongs to, named by its
 * class representative (see `shorts.ts`), so two networks carrying the same short name
 * the merged node identically and their matrices are comparable key by key.
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
  const classOf = electricalNodes(attached)
  const boundaryNodes = [...new Set<string>(boundaryNets.map(classOf))].sort()
  if (boundaryNodes.length < 2) {
    throw new Error(
      `Boundary admittance is infinite for this network: its boundary nets ` +
        `${boundaryNets.join(", ")} are all one electrical node (${boundaryNodes[0]}), ` +
        `joined by ideal shorts, so there is no finite admittance between them. This ` +
        `is a refusal rather than a large number: an ideal short is merged here, not ` +
        `approximated, so the caller must cover such a network structurally (Gate A1) ` +
        `rather than numerically.`,
    )
  }
  const referenceNet = boundary.has(groundNet) ? groundNet : boundaryNets[0]!
  const reference = classOf(referenceNet)

  const allNodes = new Set<string>()
  for (const component of attached) {
    for (const net of nodesOf(component)) allNodes.add(classOf(net))
  }
  for (const node of boundaryNodes) allNodes.add(node)
  allNodes.delete(reference)

  // Boundary nodes first, so the matrix partitions without reordering.
  const boundarySet = new Set<string>(boundaryNodes)
  const ports = boundaryNodes.filter((node) => node !== reference)
  const internal = [...allNodes].filter((node) => !boundarySet.has(node)).sort()
  const order = [...ports, ...internal]
  const index = new Map(order.map((node, position) => [node, position]))

  const size = order.length
  const matrix: Complex[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ZERO),
  )
  for (const component of attached) {
    // Electrical nodes, deduplicated: an ideal short, and the rheostat wiring's
    // one-net pot arm, are both self-loops here and carry no current.
    const nets = [...new Set<string>(nodesOf(component).map(classOf))]
    if (nets.length !== 2) continue
    const y = admittanceOf(component, hz)
    const a = nets[0]
    const b = nets[1]
    if (a === undefined || b === undefined) {
      throw new Error(
        `${component.id} has ${nets.length} distinct electrical nodes after dedup, ` +
          `not the 2 this branch was just checked for. The length guard above should ` +
          `have made this unreachable.`,
      )
    }
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
