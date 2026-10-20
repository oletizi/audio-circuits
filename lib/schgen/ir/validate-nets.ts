/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validateNets.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { NetName } from "./types.ts";
import type { Rule } from "./validate-rule.ts";
import type { LibPin } from "../render/library.ts";

export const singlePinNets: Rule = (c) => {
  const out: string[] = [];
  for (const [net, pins] of c.nets) {
    const first = pins[0];
    if (pins.length === 1 && first !== undefined) {
      out.push(`net ${net} has only one pin (${first.part}.${first.pin}); connect it or declare the pin not connected`);
    }
  }
  return out;
};

export const rails: Rule = (c, symbols) => {
  const out: string[] = [];
  const sheetIds = new Set(c.sheets.map((s) => s.id));
  for (const r of c.rails.values()) {
    if ((c.nets.get(r.net) ?? []).length === 0) out.push(`rail ${r.net} has no pins`);
    if (!symbols.resolve(r.symbol).isPower) out.push(`rail ${r.net}: symbol ${r.symbol} is not a power symbol`);
    if (r.pwrFlag !== null && !sheetIds.has(r.pwrFlag.sheet)) out.push(`rail ${r.net}: PWR_FLAG sheet ${r.pwrFlag.sheet} does not exist`);
  }
  return out;
};

export const pinSemantics: Rule = (c, symbols) => {
  const out: string[] = [];
  const libPins = new Map<string, ReadonlyMap<string, LibPin>>();
  for (const p of c.parts.values()) {
    libPins.set(p.label, new Map(symbols.resolve(p.libId).pins.map((lp) => [lp.number, lp])));
  }
  const drivers = new Map<NetName, string[]>();
  for (const pin of c.pins) {
    const lp = libPins.get(pin.part)?.get(pin.pin);
    if (lp === undefined || pin.net === null) continue;
    if (lp.type === "power_in" && !c.rails.has(pin.net)) {
      out.push(`part ${pin.part}: pin ${pin.pin} (${lp.name}) is a power input on ${pin.net}, which is not a rail`);
    }
    if (lp.type === "no_connect") out.push(`part ${pin.part}: pin ${pin.pin} is a no_connect pin but is on net ${pin.net}`);
    if (lp.type === "output") drivers.set(pin.net, [...(drivers.get(pin.net) ?? []), `${pin.part}.${pin.pin}`]);
  }
  for (const [net, outs] of drivers) {
    if (outs.length > 1) out.push(`net ${net} has ${outs.length} driving outputs (${outs.join(", ")})`);
  }
  return out;
};
