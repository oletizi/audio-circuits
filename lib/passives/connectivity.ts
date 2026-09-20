import type { ResolvedNetwork } from "./control-state.ts"
import { UnionFind } from "./union-find.ts"

/** Diagnostic connectivity lint, deliberately separate from `assertSameTopology`. Strict
 * topology comparison stays strict and throws on any mismatch; this pass never throws for
 * a lint condition and instead reports findings, catching transcription slips (a typo'd
 * pin name, an accidentally isolated island) that a strict structural comparison cannot
 * see because there is nothing to compare against.
 */
export type LintFinding =
  | { readonly code: "singleton-net"; readonly net: string; readonly terminal: string }
  | { readonly code: "disconnected-island"; readonly nets: readonly string[] }

export interface LintOptions {
  /** Nets that are intentionally open, such as unused switch contacts. */
  readonly declaredOpens?: readonly string[]
}

type SingletonFinding = Extract<LintFinding, { code: "singleton-net" }>
type IslandFinding = Extract<LintFinding, { code: "disconnected-island" }>

/** Singleton pass. Counts terminals per net across every element pin. A net touched by
 * exactly one terminal is a finding unless it is one of the network's external ports
 * (ports legitimately touch one terminal) or is a declared open (an intentionally unused
 * switch contact, for example). Does NOT apply a blanket "every net needs two terminals"
 * rule - that would reject both of those legitimate cases.
 */
function lintSingletons(network: ResolvedNetwork, declaredOpens: ReadonlySet<string>): SingletonFinding[] {
  const portNets = new Set(Object.values(network.ports))
  const firstTerminalByNet = new Map<string, string>()
  const terminalCountByNet = new Map<string, number>()

  for (const element of network.elements) {
    for (const pin of ["a", "b"] as const) {
      const net = element.pins[pin]
      terminalCountByNet.set(net, (terminalCountByNet.get(net) ?? 0) + 1)
      if (!firstTerminalByNet.has(net)) firstTerminalByNet.set(net, `${element.ref}.${pin}`)
    }
  }

  const findings: SingletonFinding[] = []
  for (const [net, count] of terminalCountByNet) {
    if (count !== 1) continue
    if (portNets.has(net)) continue
    if (declaredOpens.has(net)) continue
    const terminal = firstTerminalByNet.get(net)
    if (terminal === undefined) throw new Error(`Missing recorded terminal for net: ${net}`)
    findings.push({ code: "singleton-net", net, terminal })
  }

  findings.sort((a, b) => (a.net < b.net ? -1 : a.net > b.net ? 1 : 0))
  return findings
}

/** Island pass. Union-find over nets joined by shared elements (two nets are joined when
 * the same element's two pins name them), seeded so every net appearing in `ports` also
 * participates even if some port net happens to be isolated. Collects the connected
 * components and, when there is more than one, emits one `disconnected-island` finding
 * per component beyond the first - a well-formed, fully-connected network has exactly one
 * component and so stays at zero findings.
 */
function lintIslands(network: ResolvedNetwork): IslandFinding[] {
  const nets = new Set<string>()
  for (const portNet of Object.values(network.ports)) nets.add(portNet)
  for (const element of network.elements) {
    nets.add(element.pins.a)
    nets.add(element.pins.b)
  }

  // Which root survives a merge is irrelevant for grouping purposes; the comparator only
  // needs to be deterministic.
  const uf = new UnionFind(nets, (a, b) => (a < b ? a : b))
  for (const element of network.elements) {
    uf.union(element.pins.a, element.pins.b)
  }

  const componentsByRoot = new Map<string, string[]>()
  for (const net of nets) {
    const root = uf.find(net)
    const existing = componentsByRoot.get(root)
    if (existing) existing.push(net)
    else componentsByRoot.set(root, [net])
  }

  const components = Array.from(componentsByRoot.entries()).map(([root, members]) => {
    const nets = [...members].sort()
    const [first] = nets
    if (first === undefined) throw new Error(`Empty connectivity component: ${root}`)
    return { first, nets }
  })
  components.sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : 0))

  return components.slice(1).map(({ nets }) => ({ code: "disconnected-island" as const, nets }))
}

export function lintConnectivity(network: ResolvedNetwork, options: LintOptions = {}): readonly LintFinding[] {
  const declaredOpens = new Set(options.declaredOpens ?? [])
  return [...lintSingletons(network, declaredOpens), ...lintIslands(network)]
}
