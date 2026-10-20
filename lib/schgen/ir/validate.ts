/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validate.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { pinsOfUnit } from "./classify.ts";
import { NET_NAME, TEMPLATE_IDS, unitKey, type Circuit, type IrBlock, type NetName } from "./types.ts";
import { bomFields, mechanicalPads, sheetFiles } from "./validate-parts.ts";
import { pinSemantics, rails, singlePinNets } from "./validate-nets.ts";
import type { Rule } from "./validate-rule.ts";
import type { SymbolResolver } from "../render/library.ts";

const LABEL = /^[A-Z][A-Z0-9_]*$/;
const PREFIX = /^[A-Z]+$/;

const netNames: Rule = (c) =>
  [...c.nets.keys()].filter((n) => !NET_NAME.test(n)).map((n) => `net "${n}" is not UPPER_SNAKE (^[A-Z0-9][A-Z0-9_]*$)`);

const partShapes: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    if (!LABEL.test(p.label)) out.push(`part ${p.label}: label is not UPPER_SNAKE`);
    if (!PREFIX.test(p.refPrefix)) out.push(`part ${p.label}: refPrefix "${p.refPrefix}" must be capital letters`);
    if (p.source.trim() === "") out.push(`part ${p.label}: source is empty; name the design-note section or datasheet the part comes from`);
    const n = symbols.resolve(p.libId).unitCount;
    if (p.units.length === 0) out.push(`part ${p.label}: units is empty`);
    for (const u of p.units) {
      if (u < 1 || u > n) out.push(`part ${p.label}: unit ${u} does not exist in ${p.libId} (units 1..${n})`);
    }
  }
  return out;
};

const pinsDeclared: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const have = new Set(c.pins.filter((q) => q.part === p.label).map((q) => q.pin));
    for (const lp of symbols.resolve(p.libId).pins) {
      if (!have.has(lp.number)) out.push(`part ${p.label}: pin ${lp.number} (${lp.name}) is neither on a net nor declared not connected`);
    }
  }
  return out;
};

const unitsPlaced: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const n = symbols.resolve(p.libId).unitCount;
    for (let u = 1; u <= n; u += 1) {
      if (!p.units.includes(u)) out.push(`part ${p.label}: unit ${u} of ${p.libId} is not listed; every unit must be placed`);
    }
    for (const u of p.units) if (!c.unitBlock.has(unitKey(p.label, u))) out.push(`part ${p.label}: unit ${u} is placed by no block`);
  }
  return out;
};

const sheetsAndBlocks: Rule = (c) => {
  const out: string[] = [];
  const ids = new Set(c.sheets.map((s) => s.id));
  for (const b of c.blocks.values()) if (!ids.has(b.sheet)) out.push(`block ${b.id}: sheet ${b.sheet} does not exist`);
  for (const s of c.sheets) if (![...c.blocks.values()].some((b) => b.sheet === s.id)) out.push(`sheet ${s.id} has no blocks`);
  return out;
};

function blockNets(c: Circuit, b: IrBlock): Set<NetName> {
  const nets = new Set<NetName>();
  for (const m of b.members) for (const p of pinsOfUnit(c, m.part, m.unit)) if (p.net !== null) nets.add(p.net);
  return nets;
}

const renderings: Rule = (c) => {
  const out: string[] = [];
  for (const b of c.blocks.values()) {
    const r = b.rendering;
    if (r.kind === "labels" && r.reason.trim() === "") out.push(`block ${b.id}: labels rendering needs a reason`);
    if (r.kind === "wired") {
      if (!TEMPLATE_IDS.includes(r.template)) out.push(`block ${b.id}: unknown template ${r.template}`);
      const a = r.anchor;
      if (a !== null) {
        if (!b.members.some((m) => m.part === a.part && m.unit === a.unit)) out.push(`block ${b.id}: anchor ${a.part}#${a.unit} is not a member`);
        const unitPins = c.parts.has(a.part) ? new Set(pinsOfUnit(c, a.part, a.unit).map((p) => p.pin)) : new Set<string>();
        for (const [role, pin] of Object.entries(a.roles)) {
          if (!unitPins.has(pin)) out.push(`block ${b.id}: anchor role ${role} names pin ${pin}, not a pin of ${a.part}#${a.unit}`);
        }
      }
    }
    if (r.kind === "bus") {
      const nets = blockNets(c, b);
      const groupOf = new Map<NetName, string[]>();
      const names = new Set<string>();
      for (const g of r.groups) {
        const duplicate = names.has(g.name);
        if (duplicate) out.push(`block ${b.id}: bus group ${g.name} is declared twice`);
        names.add(g.name);
        for (const n of g.nets) {
          if (!nets.has(n)) out.push(`block ${b.id}: bus group ${g.name} lists ${n}, which no pin of the block is on`);
          const have = groupOf.get(n) ?? [];
          if (!have.includes(g.name)) groupOf.set(n, [...have, g.name]);
        }
      }
      for (const n of [...nets].sort()) {
        if (c.rails.has(n)) continue;
        const gs = groupOf.get(n) ?? [];
        if (gs.length === 0) out.push(`block ${b.id}: net ${n} is in no bus group`);
        if (gs.length > 1) out.push(`block ${b.id}: net ${n} is in bus groups ${gs.join(" and ")}`);
      }
    }
  }
  return out;
};

const RULES: readonly Rule[] = [
  netNames, partShapes, pinsDeclared, unitsPlaced, sheetsAndBlocks, renderings,
  singlePinNets, rails, pinSemantics, bomFields, sheetFiles, mechanicalPads,
];

/** Strict: every problem, one line each, in rule order. Empty means valid. No escape hatch. */
export function validateCircuit(c: Circuit, symbols: SymbolResolver): string[] {
  return RULES.flatMap((rule) => rule(c, symbols));
}
