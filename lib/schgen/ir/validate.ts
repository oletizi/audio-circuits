/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validate.ts` (with the `labels`
 * rendering-reason check that plan decision D3 deletes, carried as this entry's declared `cuts`
 * until Task 20), and DIVERGED from it by Task 20 of the M1 schematic-authoring plan: the rule
 * list is SPLIT, and `validateCircuit` - the function `tools/schgen/generate.ts` calls before it
 * emits a drawing - no longer runs `bomFields`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason and the upstream
 * `sourceSha`; see `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G245**.
 *
 * **WHY, AND IT IS THE OWNER'S DECISION RATHER THAN THIS REPOSITORY'S CONVENIENCE.** He asked
 * *"why does a schematic need bom-level specificity?"*, and then ruled: *"the gate you describe
 * *is* important for pcb layout intended for outsourced manufacture-but a fully specified BOM
 * isn't needed for schematics, stripboard layout, and, in many cases, tht pcbs."*
 *
 * So **the BOM requirement is a property of the CONSUMER of an artifact rather than of the
 * circuit.** It binds when a part has to be sourced and placed by somebody else. A schematic is
 * never that artifact - it is upstream of every one of those decisions; a stripboard layout built
 * by hand is not either; and a through-hole board the owner stuffs himself usually is not.
 *
 * **`bomFields` ITSELF IS UNTOUCHED, AND IT IS NOT DEAD CODE.** `ir/validate-parts.ts` is still
 * byte-checked against the pedals source and holds the rule exactly as it always did - four keys,
 * non-empty, on every part whose `refPrefix` is not `TP`, `H` or `FID`. What changed is which
 * composition runs it. **Two opposite edits to this file are both wrong:**
 *
 * - **deleting the rule, or `SOURCING_RULES`, because no production caller runs it.** Nothing in
 *   this repository emits an artifact somebody else sources yet, which is exactly why
 *   `validateSourcing` has only test callers; `docs/known-gaps.md` **G245** records that with what
 *   would settle it, and **G241** is this branch deleting a safeguard on that reasoning and
 *   restoring it a round later;
 * - **putting `bomFields` back into `DRAWING_RULES` to make validation uniform.** Uniformity is
 *   what the ruling refuses: it gates a drawing on purchasing data the drawing does not use.
 *   **G238** measured the price - 100 of `transistor-preamp`'s 101 gate-1 problems were empty
 *   purchasing fields, and nothing else was wrong with the circuit.
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

/**
 * **THE RULES A DRAWING DEPENDS ON, AND ONLY THOSE**, because this is the list `generate` runs
 * before it emits one. Eleven of the twelve ported rules; the header says why `bomFields` is not
 * among them and why putting it back is a defect rather than a tidy-up.
 */
const DRAWING_RULES: readonly Rule[] = [
  netNames, partShapes, pinsDeclared, unitsPlaced, sheetsAndBlocks, renderings,
  singlePinNets, rails, pinSemantics, sheetFiles, mechanicalPads,
];

/**
 * **THE RULES AN ARTIFACT SOMEBODY ELSE SOURCES AND PLACES DEPENDS ON.** A board going out for
 * outsourced assembly is the case the owner named: the assembler cannot buy a part the artifact
 * does not name, so an empty purchasing field there is a refusal and not a nicety.
 *
 * **Nothing in this repository emits such an artifact yet**, so the callers are tests -
 * `tests/schgen/ir/validate.test.ts`'s two V10 cases drive the rule's own behaviour, and
 * `tests/schgen/authoring-complete.test.ts` keeps the four parity circuits' sourcing counts
 * pinned.
 *
 * **THAT IS `docs/known-gaps.md` G226's PATTERN, DECLARED RATHER THAN DISCOVERED** - a mechanism
 * whose first real use is its first test, which that entry rules acceptable *"when the
 * precondition for wiring it is NAMED and the price is RECORDED"* and calls the **G201** failure
 * when it is not. **THE PRECONDITION, in one sentence: something in this repository must emit an
 * artifact that a third party sources and places** - a fabrication or assembly package, a board
 * going out for outsourced assembly, an orderable BOM. **THE PRICE: `bomFields` runs in tests and
 * in no pipeline**, so purchasing data that regressed would be caught by those two files and by no
 * artifact. **Controller ruling R67: this composition is NOT to be collapsed into its test
 * callers** - the name is what tells that future consumer what to call. **G245** carries both
 * halves.
 */
const SOURCING_RULES: readonly Rule[] = [bomFields];

/**
 * Strict: every DRAWING problem, one line each, in rule order. Empty means the circuit may be
 * drawn. No escape hatch - there is no flag, no mode and no exemption list that relaxes a rule in
 * this list, and sourcing readiness is a different question asked by `validateSourcing`.
 */
export function validateCircuit(c: Circuit, symbols: SymbolResolver): string[] {
  return DRAWING_RULES.flatMap((rule) => rule(c, symbols));
}

/**
 * Strict, the same way, for the sourcing readiness `validateCircuit` deliberately does not ask
 * about. Empty means every part names who makes it and who sells it.
 */
export function validateSourcing(c: Circuit, symbols: SymbolResolver): string[] {
  return SOURCING_RULES.flatMap((rule) => rule(c, symbols));
}
