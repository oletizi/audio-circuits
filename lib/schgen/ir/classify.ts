/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/classify.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { unitKey, type BlockId, type Circuit, type IrPin, type NetName, type PartLabel } from "./types.ts";

function partOf(c: Circuit, label: PartLabel) {
  const p = c.parts.get(label);
  if (p === undefined) throw new Error(`unknown part ${label}`);
  return p;
}

export function pinsOfUnit(c: Circuit, part: PartLabel, unit: number): IrPin[] {
  const lowest = Math.min(...partOf(c, part).units);
  return c.pins.filter((p) => p.part === part && (p.unit === unit || (p.unit === 0 && unit === lowest)));
}

export function blockOfPin(c: Circuit, pin: IrPin): BlockId {
  const unit = pin.unit === 0 ? Math.min(...partOf(c, pin.part).units) : pin.unit;
  const b = c.unitBlock.get(unitKey(pin.part, unit));
  if (b === undefined) throw new Error(`pin ${pin.part}.${pin.pin}: unit ${unit} is in no block`);
  return b;
}

export function groundRails(c: Circuit): ReadonlySet<NetName> {
  return new Set([...c.rails.values()].filter((r) => r.kind === "ground").map((r) => r.net));
}

export function labelledNets(c: Circuit): ReadonlySet<NetName> {
  const blocksOfNet = new Map<NetName, Set<BlockId>>();
  for (const pin of c.pins) {
    if (pin.net === null) continue;
    const set = blocksOfNet.get(pin.net) ?? new Set<BlockId>();
    set.add(blockOfPin(c, pin));
    blocksOfNet.set(pin.net, set);
  }
  const out = new Set<NetName>();
  for (const [net, blocks] of blocksOfNet) {
    const unwired = [...blocks].some((b) => c.blocks.get(b)?.rendering.kind !== "wired");
    if (c.rails.has(net) || blocks.size > 1 || unwired || c.offSheet.has(net)) out.add(net);
  }
  return out;
}
