/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/build.ts` (with the MCU pin-map `cuts` of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 13 of the M1 schematic-authoring
 * plan under ruling **R29**: `buildCircuit` carries `CircuitSpec`'s two new maps - `orientations`
 * and `portDirections` - onto the `Circuit`, and **refuses an orientation map that is not total
 * over the spec's parts**.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G182**.
 */

import { comparePinNumbers } from "./order.ts";
import {
  connectedNet, unitKey,
  type BlockId, type Circuit, type CircuitSpec, type IrBlock, type IrPart, type IrPin, type IrUnitRef,
  type NetName, type PartLabel, type PartSpec, type PinRef, type RailSpec,
} from "./types.ts";
import type { Rotation } from "../render/geometry.ts";
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

/**
 * `spec.orientations`, checked TOTAL over `spec.parts` in both directions.
 *
 * **WHY A HOLE REFUSES RATHER THAN READING AS `null`** - ruling **R29**, and it is the one thing
 * this map's two values must never be allowed to collapse. `null` is spec §1.5's rule library
 * saying *"I leave this open"*, which `drawnRotation` turns into the symbol's own library frame.
 * An ABSENT entry is a part the deriving step never asked about - and it would draw in exactly the
 * same frame, so the two states are indistinguishable in the output. A missing entry is therefore a
 * defect in whoever built the `CircuitSpec`, named here.
 *
 * An entry naming a part the spec does not have refuses too: it is the same defect seen from the
 * other side (a spec assembled from two circuits, or a label renamed in one place only), and it is
 * the half a one-directional check would have missed.
 */
function orientationsOf(spec: CircuitSpec): ReadonlyMap<PartLabel, Rotation | null> {
  const labels = new Set(spec.parts.map((p) => p.label));
  const missing = [...labels].filter((l) => !spec.orientations.has(l));
  if (missing.length > 0) {
    throw new Error(
      `CircuitSpec.orientations has no entry for part(s) ${missing.join(", ")}. The map is the ` +
        "answer spec 1.5 step 2's rule library gave per part (lib/schgen/rules/orientation.ts, " +
        "through preferredOrientationsOf in lib/schgen/from-network.ts) and it must be TOTAL over " +
        "the spec's parts. A missing entry is NOT read as null: null means the rule declined and " +
        "the part draws in its symbol's own library frame, and a part nobody asked about would " +
        "draw identically - so the absence would be invisible in the drawing. Build the map with " +
        "preferredOrientationsOf, or state null per part deliberately.",
    );
  }
  const unknown = [...spec.orientations.keys()].filter((l) => !labels.has(l));
  if (unknown.length > 0) {
    throw new Error(
      `CircuitSpec.orientations names part(s) ${unknown.join(", ")}, which this spec does not ` +
        "have (its parts: " + [...labels].join(", ") + "). An orientation for a part that is not " +
        "here means the map and the part list came from different circuits, or a label was " +
        "renamed in one of the two. It refuses rather than ignoring the extra entry, because the " +
        "entry that is silently dropped is exactly the one a reader would have relied on.",
    );
  }
  return new Map(spec.orientations);
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
    blocks.set(b.id, { id: b.id, sheet: b.sheet, title: b.title, members, checklist: b.checklist, rendering: b.rendering, readsFrom: b.readsFrom ?? null, order });
  });

  const rails = new Map<NetName, RailSpec>(spec.rails.map((r) => [r.net, r]));
  return {
    parts, pins, nets, blocks, sheets: spec.sheets, rails,
    orientations: orientationsOf(spec), portDirections: spec.portDirections,
    unitBlock, offSheet: new Set<NetName>(),
  };
}
