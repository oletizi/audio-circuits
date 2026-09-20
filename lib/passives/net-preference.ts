/** The port key a network uses for its reference node. Named here, and passed explicitly
 * by every caller of `netPreference`, so the convention is visible at the call site
 * instead of being a magic string buried inside the comparator.
 */
export const GROUND_PORT_KEY = "ground"

/** Decides which of two merged net names survives as a union-find set's canonical
 * representative. Net names are not interchangeable: SPICE reserves node 0 for ground,
 * and a network's external ports are names callers outside this module already depend
 * on, so an arbitrary "whichever was unioned in last" choice can silently rename either
 * one away. Deterministic is necessary but not sufficient.
 *
 * Preference order: the network's declared ground net first, then any net that is one of
 * the network's external ports, then the lexicographically smaller name, so the remaining
 * case is at least deterministic.
 *
 * `groundPortKey` names the port carrying the reference node and is required to resolve.
 * An absent key throws rather than quietly dropping the ground rule: silently degrading
 * to the port/lexicographic tie-break would let a network's ground net be renamed away
 * with no signal, which is the failure class this project rejects.
 */
export function netPreference(
  ports: Readonly<Record<string, string>>,
  groundPortKey: string,
): (a: string, b: string) => string {
  const groundNet = ports[groundPortKey]
  if (groundNet === undefined) throw new Error(`Missing ground port: ${groundPortKey}`)
  const portNets = new Set(Object.values(ports))
  return (a: string, b: string): string => {
    if (a === groundNet) return a
    if (b === groundNet) return b
    const aIsPort = portNets.has(a)
    const bIsPort = portNets.has(b)
    if (aIsPort !== bIsPort) return aIsPort ? a : b
    return a < b ? a : b
  }
}
