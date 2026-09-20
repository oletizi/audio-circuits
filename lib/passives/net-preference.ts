/** Decides which of two merged net names survives as a union-find set's canonical
 * representative. Net names are not interchangeable: SPICE reserves node 0 for ground,
 * and a network's external ports are names callers outside this module already depend
 * on, so an arbitrary "whichever was unioned in last" choice can silently rename either
 * one away. Deterministic is necessary but not sufficient.
 *
 * Preference order: the network's declared ground net (`ports.ground`, when present)
 * first, then any net that is one of the network's external ports, then the
 * lexicographically smaller name, so the remaining case is at least deterministic.
 */
export function netPreference(ports: Readonly<Record<string, string>>): (a: string, b: string) => string {
  const groundNet = ports.ground
  const portNets = new Set(Object.values(ports))
  return (a: string, b: string): string => {
    if (groundNet !== undefined) {
      if (a === groundNet) return a
      if (b === groundNet) return b
    }
    const aIsPort = portNets.has(a)
    const bIsPort = portNets.has(b)
    if (aIsPort !== bIsPort) return aIsPort ? a : b
    return a < b ? a : b
  }
}
