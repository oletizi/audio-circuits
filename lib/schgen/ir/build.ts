/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/build.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { comparePinNumbers } from "./order.ts";
import {
  connectedNet, unitKey,
  type BlockId, type Circuit, type CircuitSpec, type IrBlock, type IrPart, type IrPin, type IrUnitRef,
  type NetName, type PartLabel, type PartSpec, type PinRef, type RailSpec,
} from "./types.ts";
import type { SymbolResolver } from "../render/library.ts";

export interface BuildContext {
  readonly symbols: SymbolResolver;
}

function irPart(p: PartSpec, order: number): IrPart {
  return {
    label: p.label, refPrefix: p.refPrefix, libId: p.libId, units: p.units, value: p.value,
    footprint: p.footprint, bom: p.bom, dnp: p.dnp, checklist: p.checklist, source: p.source,
    pinTable: p.pinTable, mechanicalPads: p.mechanicalPads,
    ncUnlistedReason: p.ncUnlisted === null ? null : p.ncUnlisted.reason, order,
  };
}

function partPins(p: PartSpec, ctx: BuildContext): IrPin[] {
  const sym = ctx.symbols.resolve(p.libId);
  const unitOf = new Map(sym.pins.map((lp) => [lp.number, lp.unit]));
  const pinList = sym.pins.map((lp) => lp.number).join(", ");
  const unitFor = (num: string): number => {
    const u = unitOf.get(num);
    if (u === undefined) throw new Error(`${p.label}: pin ${num} is not a pin of ${p.libId} (pins: ${pinList})`);
    return u;
  };
  const declared = new Map<string, IrPin>();
  for (const [num, conn] of Object.entries(p.pins)) {
    declared.set(num, { part: p.label, pin: num, unit: unitFor(num), identity: conn.identity, net: connectedNet(conn), origin: "circuit" });
  }
  if (p.ncUnlisted !== null) {
    for (const lp of sym.pins) {
      if (!declared.has(lp.number)) {
        declared.set(lp.number, { part: p.label, pin: lp.number, unit: lp.unit, identity: lp.name, net: null, origin: "nc-unlisted" });
      }
    }
  }
  return [...declared.values()].sort((x, y) => comparePinNumbers(x.pin, y.pin));
}

function uniqueBy<T>(items: readonly T[], key: (t: T) => string, what: string): void {
  const seen = new Set<string>();
  for (const i of items) {
    const k = key(i);
    if (seen.has(k)) throw new Error(`duplicate ${what} ${k}`);
    seen.add(k);
  }
}

export function buildCircuit(spec: CircuitSpec, ctx: BuildContext): Circuit {
  uniqueBy(spec.parts, (p) => p.label, "part label");
  uniqueBy(spec.blocks, (b) => b.id, "block id");
  uniqueBy(spec.sheets, (s) => s.id, "sheet id");
  uniqueBy(spec.rails, (r) => r.net, "rail");

  const parts = new Map<PartLabel, IrPart>();
  spec.parts.forEach((p, i) => parts.set(p.label, irPart(p, i)));
  const pins = spec.parts.flatMap((p) => partPins(p, ctx));

  const netPins = new Map<NetName, PinRef[]>();
  for (const pin of pins) {
    if (pin.net === null) continue;
    const list = netPins.get(pin.net) ?? [];
    list.push({ part: pin.part, pin: pin.pin });
    netPins.set(pin.net, list);
  }
  const nets = new Map([...netPins.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

  const unitBlock = new Map<string, BlockId>();
  const blocks = new Map<BlockId, IrBlock>();
  spec.blocks.forEach((b, order) => {
    const members: IrUnitRef[] = [];
    for (const m of b.members) {
      const label = typeof m === "string" ? m : m.part;
      const part = parts.get(label);
      if (part === undefined) throw new Error(`block ${b.id} names unknown part ${label}`);
      const units = typeof m === "string" ? part.units : [m.unit];
      for (const unit of units) {
        const key = unitKey(label, unit);
        const prior = unitBlock.get(key);
        if (prior !== undefined) throw new Error(`unit ${key} is placed by blocks ${prior} and ${b.id}`);
        unitBlock.set(key, b.id);
        members.push({ part: label, unit });
      }
    }
    blocks.set(b.id, { id: b.id, sheet: b.sheet, title: b.title, members, checklist: b.checklist, rendering: b.rendering, order });
  });

  const rails = new Map<NetName, RailSpec>(spec.rails.map((r) => [r.net, r]));
  return { parts, pins, nets, blocks, sheets: spec.sheets, rails, unitBlock, offSheet: new Set<NetName>() };
}
