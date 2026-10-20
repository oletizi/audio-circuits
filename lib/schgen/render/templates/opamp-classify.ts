/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/opampClassify.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Reads an op-amp stage's IR subgraph into the parts the opamp-stage template draws: the feedback
 * units across the inverting input and the output, a chain toward each input, and the output
 * chain. It only reads the IR's own connections and refuses any shape the layout cannot draw.
 */
import type { NetName, PinNumber } from "../../ir/types.ts";
import type { BlockSubgraph, BlockUnit } from "../block-types.ts";
import type { ChainShunt } from "../chain-kit.ts";
import { libPinOf } from "../fanout-kit.ts";
import { pinEnd, pinSide, ROTATIONS, type Rotation } from "../geometry.ts";
import { otherNet, twoPinNets } from "../layout-kit.ts";
import { classifyChain, type ChainCore } from "./passive-chain.ts";

export interface SupplyPin {
  readonly pin: PinNumber;
  readonly net: NetName;
}

export interface StagePlan {
  readonly amp: BlockUnit;
  readonly rot: Rotation;
  readonly pins: { readonly out: PinNumber; readonly inv: PinNumber; readonly noninv: PinNumber };
  readonly o: NetName;
  readonly n: NetName;
  readonly p: NetName;
  readonly follower: boolean;
  readonly feedback: readonly BlockUnit[];
  /** Chain toward the inverting input (`n` its last node), or null when `n` has no parts of its own. */
  readonly inv: ChainCore | null;
  /** Chain toward the non-inverting input (`p` its last node), or null when `p` has no parts. */
  readonly noninv: ChainCore | null;
  /** Chain leaving the output (`o` its first node), or null when nothing but the feedback touches `o`. */
  readonly output: ChainCore | null;
  readonly supplies: readonly SupplyPin[];
}

export type Planned = { readonly ok: true; readonly plan: StagePlan } | { readonly ok: false; readonly reason: string };

const refuse = (reason: string): Planned => ({ ok: false, reason });

const labelled = (g: BlockSubgraph, net: NetName): boolean => g.rails.has(net) || g.external.has(net);

type Pair = readonly [NetName, NetName];

/** For each unit, the terminals it reaches without passing through another terminal or a rail. */
function reachOf(units: readonly BlockUnit[], pairOf: (u: BlockUnit) => Pair, terminals: readonly NetName[], g: BlockSubgraph): Map<BlockUnit, Set<NetName>> {
  const reach = new Map<BlockUnit, Set<NetName>>(units.map((u) => [u, new Set<NetName>()]));
  for (const t of terminals) {
    const seen = new Set<NetName>([t]);
    const stack = [t];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const u of units) {
        const [a, b] = pairOf(u);
        if (a !== cur && b !== cur) continue;
        const m = a === cur ? b : a;
        reach.get(u)!.add(t);
        if (terminals.includes(m)) {
          reach.get(u)!.add(m);
          continue;
        }
        if (g.rails.has(m) || seen.has(m)) continue;
        seen.add(m);
        stack.push(m);
      }
    }
  }
  return reach;
}

type Core = { readonly ok: true; readonly core: ChainCore | null } | { readonly ok: false; readonly reason: string };

/** The chain toward input `t` from the units that reach only `t`; `externalSide` sides dead-end external shunts. */
function inputCore(t: NetName, units: readonly BlockUnit[], all: readonly BlockUnit[], g: BlockSubgraph, externalSide: "up" | "down"): Core {
  if (units.length === 0) return { ok: true, core: null };
  if (g.external.has(t)) {
    return { ok: false, reason: `opamp-stage: input net ${t} leaves the block and has parts here, so its open chain end cannot label it` };
  }
  const touches = (u: BlockUnit, net: NetName): boolean => u.pins.some((pin) => pin.net === net);
  const deadEnd = (far: NetName): boolean => g.rails.has(far) || (g.external.has(far) && all.filter((u) => touches(u, far)).every((u) => touches(u, t)));
  const terminal = units.filter((u) => touches(u, t) && deadEnd(otherNet(u, t)));
  const rest = units.filter((u) => !terminal.includes(u));
  const shuntOf = (u: BlockUnit): ChainShunt => {
    const far = otherNet(u, t);
    const side = g.groundRails.has(far) ? "down" : g.rails.has(far) ? "up" : externalSide;
    return { units: [u], node: t, far, side };
  };
  if (rest.length === 0) {
    const series = terminal.filter((u) => !g.rails.has(otherNet(u, t)));
    const only = series[0];
    if (series.length === 1 && only !== undefined) {
      const shunts = terminal.filter((u) => u !== only).map(shuntOf);
      return { ok: true, core: { nodes: [otherNet(only, t), t], steps: [{ units: [only] }], shunts } };
    }
    return { ok: true, core: { nodes: [t], steps: [], shunts: terminal.map(shuntOf) } };
  }
  const r = classifyChain(rest, g, null, t);
  if (!r.ok) return { ok: false, reason: r.reason === `${t} is not an end of the chain` ? `chain toward ${t} must end at ${t}` : r.reason };
  return { ok: true, core: { ...r.spec, shunts: [...r.spec.shunts, ...terminal.map(shuntOf)] } };
}

export function planStage(g: BlockSubgraph): Planned {
  const r = g.block.rendering;
  const anchor = r.kind === "wired" ? r.anchor : null;
  const out = anchor?.roles["out"];
  const inv = anchor?.roles["inv"];
  const noninv = anchor?.roles["noninv"];
  if (anchor === null || out === undefined || inv === undefined || noninv === undefined) {
    return refuse("opamp-stage needs an anchor with roles out, inv and noninv");
  }
  const amp = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (amp === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const others = g.units.filter((u) => u !== amp);
  const pairs = new Map<BlockUnit, Pair>();
  for (const u of others) {
    const pair = twoPinNets(u);
    if (pair === null || u.part.label === amp.part.label) {
      return refuse(`opamp-stage holds one op-amp unit and two-terminal parts; ${u.part.label}#${u.unit} is neither`);
    }
    pairs.set(u, pair);
  }
  const pairOf = (u: BlockUnit): Pair => pairs.get(u)!;
  const netOf = (pin: PinNumber): NetName | null => amp.pins.find((x) => x.pin === pin)?.net ?? null;
  const o = netOf(out);
  const n = netOf(inv);
  const p = netOf(noninv);
  if (o === null || n === null || p === null) return refuse("opamp-stage pins out, inv and noninv must all be connected");
  if (p === o || p === n) return refuse(`opamp-stage: noninv shares net ${p} with ${p === o ? "out" : "inv"}`);
  const roles = new Set<PinNumber>([out, inv, noninv]);
  const supplies: SupplyPin[] = [];
  for (const pin of amp.pins) {
    if (roles.has(pin.pin) || pin.net === null) continue;
    if (!g.rails.has(pin.net)) return refuse(`opamp-stage: pin ${pin.pin} of the op-amp is on ${pin.net}, which is neither a rail nor a role`);
    supplies.push({ pin: pin.pin, net: pin.net });
  }
  const lo = libPinOf(amp, out);
  const ln = libPinOf(amp, inv);
  const lp = libPinOf(amp, noninv);
  const origin = { x: 0, y: 0 };
  const rot = ROTATIONS.find(
    (t) => pinSide(t, lp) === "left" && pinSide(t, ln) === "left" && pinSide(t, lo) === "right" && pinEnd(origin, t, lp).y < pinEnd(origin, t, ln).y,
  );
  if (rot === undefined) return refuse("opamp-stage expects the non-inverting input above the inverting input with the output on the right");

  const follower = n === o;
  const feedback = follower ? [] : others.filter((u) => pairOf(u).includes(n) && pairOf(u).includes(o));
  const rest = others.filter((u) => !feedback.includes(u));
  const terminals = [...(follower ? [] : [n]), p, o].filter((t) => !g.rails.has(t));
  const reach = reachOf(rest, pairOf, terminals, g);
  for (const u of rest) {
    const hit = terminals.filter((t) => reach.get(u)!.has(t));
    if (hit.length === 0) return refuse(`${u.part.label} reaches none of the op-amp's out, inv and noninv nets`);
    if (hit.length > 1) return refuse(`${u.part.label} joins ${hit[0]} and ${hit[1]} outside the feedback path`);
  }
  const unitsFor = (t: NetName): BlockUnit[] => rest.filter((u) => reach.get(u)!.has(t));
  const nUnits = follower ? [] : unitsFor(n);
  const invCore = inputCore(n, nUnits, others, g, "down");
  if (!invCore.ok) return refuse(invCore.reason);
  const nonCore = inputCore(p, unitsFor(p), others, g, "up");
  if (!nonCore.ok) return refuse(nonCore.reason);
  const up = invCore.core?.shunts.find((s) => s.side === "up");
  if (up !== undefined) return refuse(`inverting-input chain cannot hang ${up.units[0]!.part.label} above the line`);
  const down = nonCore.core?.shunts.find((s) => s.side === "down");
  if (down !== undefined && nUnits.length > 0) return refuse(`non-inverting chain cannot hang ${down.units[0]!.part.label} below the line`);
  if (nonCore.core === null && !labelled(g, p)) return refuse(`${p} reaches the non-inverting input from nowhere`);
  if (!follower && invCore.core === null && !labelled(g, n)) return refuse(`${n} reaches the inverting input from nowhere`);

  const oUnits = g.rails.has(o) ? [] : unitsFor(o);
  let output: ChainCore | null = null;
  if (oUnits.length > 0) {
    const oc = classifyChain(oUnits, g, o, null);
    if (!oc.ok) return refuse(oc.reason);
    output = oc.spec;
  }
  return {
    ok: true,
    plan: { amp, rot, pins: { out, inv, noninv }, o, n, p, follower, feedback, inv: invCore.core, noninv: nonCore.core, output, supplies },
  };
}
