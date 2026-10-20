/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/passiveChain.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * passive-chain: two-terminal parts in series along one line (parallel parts beside their step),
 * with shunts to ground below and to supply rails above. Supply rails may be chain ends, never
 * middle nodes; ground rails are never chain nodes. The classifier only reads the IR's own
 * connections, and refuses any shape the chain primitive cannot draw.
 */
import type { NetName } from "../../ir/types.ts";
import { mismatch, type BlockSubgraph, type BlockUnit, type RealiseResult, type Template } from "../block-types.ts";
import { chain, type ChainShunt, type ChainSpec, type ChainStep } from "../chain-kit.ts";
import { twoPinNets } from "../layout-kit.ts";

export type ChainCore = Omit<ChainSpec, "parallelSide" | "midAnchorSide" | "first" | "last">;
export type Classified = { readonly ok: true; readonly spec: ChainCore } | { readonly ok: false; readonly reason: string };

type Pair = readonly [NetName, NetName];

interface Built {
  nodes: NetName[];
  steps: BlockUnit[][];
}

const refuse = (reason: string): Classified => ({ ok: false, reason });

/** The core's steps (unordered net pairs, member order) as a simple path, or why they are not one. */
function corePath(core: readonly BlockUnit[], pairOf: (u: BlockUnit) => Pair): Built | string {
  const groups = new Map<string, { pair: Pair; units: BlockUnit[] }>();
  const order: NetName[] = [];
  const adj = new Map<NetName, string[]>();
  for (const u of core) {
    const pair = pairOf(u);
    const key = [...pair].sort().join("|");
    const group = groups.get(key);
    if (group !== undefined) {
      group.units.push(u);
      continue;
    }
    groups.set(key, { pair, units: [u] });
    for (const n of pair) {
      if (!adj.has(n)) {
        order.push(n);
        adj.set(n, []);
      }
      adj.get(n)!.push(key);
    }
  }
  for (const n of order) {
    const k = adj.get(n)!.length;
    if (k > 2) return `series parts do not form a simple path: node ${n} has ${k} series neighbours`;
  }
  const seen = new Set<NetName>();
  let components = 0;
  for (const start of order) {
    if (seen.has(start)) continue;
    components += 1;
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const n = stack.pop()!;
      for (const key of adj.get(n)!) {
        for (const m of groups.get(key)!.pair) {
          if (!seen.has(m)) {
            seen.add(m);
            stack.push(m);
          }
        }
      }
    }
  }
  if (components > 1) return `series parts form ${components} separate chains`;
  if (groups.size === order.length) return `series parts form a loop through ${order[0]}`;
  const start = order.find((n) => adj.get(n)!.length === 1);
  if (start === undefined) throw new Error("unreachable: an acyclic connected path has an end");
  const built: Built = { nodes: [start], steps: [] };
  const used = new Set<string>();
  let cur = start;
  for (;;) {
    const key = adj.get(cur)!.find((k) => !used.has(k));
    if (key === undefined) break;
    used.add(key);
    const group = groups.get(key)!;
    const next = group.pair[0] === cur ? group.pair[1] : group.pair[0];
    built.nodes.push(next);
    built.steps.push(group.units);
    cur = next;
  }
  return built;
}

function orient(built: Built, units: readonly BlockUnit[], pairOf: (u: BlockUnit) => Pair, firstHint: NetName | null, lastHint: NetName | null): boolean | string {
  const head = built.nodes[0]!;
  const tail = built.nodes[built.nodes.length - 1]!;
  if (firstHint !== null && lastHint !== null) {
    if (head === firstHint && tail === lastHint) return false;
    if (tail === firstHint && head === lastHint) return true;
    return `chain cannot run from ${firstHint} to ${lastHint}`;
  }
  const hint = firstHint ?? lastHint;
  if (hint !== null) {
    if (hint !== head && hint !== tail) return `${hint} is not an end of the chain`;
    return firstHint !== null ? head !== firstHint : tail !== lastHint;
  }
  for (const u of units) {
    const end = pairOf(u).find((n) => n === head || n === tail);
    if (end !== undefined) return end !== head;
  }
  throw new Error("unreachable: every chain end is touched by a unit");
}

function emit(built: Built, shunts: ChainShunt[], reverse: boolean): Classified {
  const nodes = reverse ? [...built.nodes].reverse() : built.nodes;
  const raw = reverse ? [...built.steps].reverse() : built.steps;
  const steps: ChainStep[] = raw.map((units) => ({ units }));
  return { ok: true, spec: { nodes, steps, shunts } };
}

export function classifyChain(units: readonly BlockUnit[], g: BlockSubgraph, firstHint: NetName | null, lastHint: NetName | null): Classified {
  if (units.length === 0) return refuse("passive-chain block has no parts");
  const pairs = new Map<BlockUnit, Pair>();
  for (const u of units) {
    const p = twoPinNets(u);
    if (p === null) {
      const open = u.pins.length === 2 ? u.pins.find((pin) => pin.net === null) : undefined;
      const what = open !== undefined ? `pin ${open.pin} is not connected` : `has ${u.pins.length} pins`;
      return refuse(`passive-chain needs two-terminal parts with both pins connected; ${u.part.label}#${u.unit} ${what}`);
    }
    pairs.set(u, p);
  }
  const pairOf = (u: BlockUnit): Pair => pairs.get(u)!;
  const isRail = (n: NetName) => g.rails.has(n);
  const isSupply = (n: NetName) => g.rails.has(n) && !g.groundRails.has(n);
  const nonRail = new Set(units.flatMap((u) => pairOf(u).filter((n) => !isRail(n))));
  for (const u of units) {
    const [a, b] = pairOf(u);
    if (isRail(a) && isRail(b) && !(nonRail.size === 0 && isSupply(a) && isSupply(b))) {
      return refuse(`${u.part.label} has both pins on rails (${a}, ${b})`);
    }
  }
  if (nonRail.size === 0) {
    const key = (u: BlockUnit) => [...pairOf(u)].sort().join("|");
    const first = units[0]!;
    if (units.some((u) => key(u) !== key(first))) return refuse("passive-chain needs at least one non-rail node");
    const built: Built = { nodes: [...pairOf(first)], steps: [[...units]] };
    const dir = orient(built, units, pairOf, firstHint, lastHint);
    return typeof dir === "string" ? refuse(dir) : emit(built, [], dir);
  }
  const core = units.filter((u) => pairOf(u).every((n) => !isRail(n)));
  let built: Built;
  if (core.length > 0) {
    const path = corePath(core, pairOf);
    if (typeof path === "string") return refuse(path);
    built = path;
  } else {
    if (nonRail.size > 1) return refuse(`series parts form ${nonRail.size} separate chains`);
    built = { nodes: [...nonRail], steps: [] };
  }
  const shunts: ChainShunt[] = [];
  const railSteps = new Map<string, BlockUnit[]>();
  for (const u of units) {
    if (core.includes(u)) continue;
    const [a, b] = pairOf(u);
    const rail = isRail(a) ? a : b;
    const node = rail === a ? b : a;
    if (!built.nodes.includes(node)) return refuse(`${u.part.label} hangs from ${node}, which is not on the chain`);
    if (g.groundRails.has(rail)) {
      shunts.push({ units: [u], node, far: rail, side: "down" });
      continue;
    }
    const existing = railSteps.get(`${node}|${rail}`);
    if (existing !== undefined) {
      existing.push(u);
      continue;
    }
    const last = built.nodes.length - 1;
    // The tail is tried before the head on purpose: at a lone node (head === tail) the first rail
    // step is appended, the second prepended, so member order decides which rail sits on which side.
    if (built.nodes[last] === node) {
      const step = [u];
      built.nodes.push(rail);
      built.steps.push(step);
      railSteps.set(`${node}|${rail}`, step);
    } else if (built.nodes[0] === node) {
      const step = [u];
      built.nodes.unshift(rail);
      built.steps.unshift(step);
      railSteps.set(`${node}|${rail}`, step);
    } else {
      shunts.push({ units: [u], node, far: rail, side: "up" });
    }
  }
  const dir = orient(built, units, pairOf, firstHint, lastHint);
  return typeof dir === "string" ? refuse(dir) : emit(built, shunts, dir);
}

export const passiveChain: Template = {
  id: "passive-chain",
  realise(g: BlockSubgraph): RealiseResult {
    const r = classifyChain(g.units, g, null, null);
    if (!r.ok) return mismatch(r.reason);
    return { ok: true, layout: chain({ ...r.spec, parallelSide: "up", midAnchorSide: "up", first: "anchor", last: "anchor" }, g) };
  },
};
