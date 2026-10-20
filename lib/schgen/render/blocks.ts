/**
 * Ported from digital-pedal-platform's `tools/schgen/render/blocks.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The block layout contract: a wired block's IR subgraph goes to its template, and the template's
 * layout is checked against the IR before anything is drawn. A template that cannot realise its
 * subgraph, or that produces a layout whose geometry disagrees with the IR, is a generation error.
 */
import { labelledNets, pinsOfUnit } from "../ir/classify.ts";
import type { BlockId, Circuit, NetName, RailSpec } from "../ir/types.ts";
import type { BlockLayout, BlockSubgraph, BlockUnit } from "./block-types.ts";
import { checkLayout } from "./layout-check.ts";
import { intersheetRefs } from "./page-refs.ts";
import type { LibSymbol, SymbolResolver } from "./library.ts";
import { TEMPLATES } from "./templates/index.ts";

export { checkLayout, layoutItems, placedNoConnects, placedPins, type PlacedPin } from "./layout-check.ts";

export function subgraphOf(c: Circuit, id: BlockId, symbols: SymbolResolver): BlockSubgraph {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  const units: BlockUnit[] = block.members.map((m) => {
    const part = c.parts.get(m.part);
    if (part === undefined) throw new Error(`block ${id}: unknown part ${m.part}`);
    return { part, unit: m.unit, symbol: symbols.resolve(part.libId), pins: pinsOfUnit(c, m.part, m.unit) };
  });
  const touched = new Set(units.flatMap((u) => u.pins.flatMap((p) => (p.net === null ? [] : [p.net]))));
  const rails = new Set([...touched].filter((n) => c.rails.has(n)));
  const groundRails = new Set([...rails].filter((n) => c.rails.get(n)?.kind === "ground"));
  const labelled = labelledNets(c);
  const external = new Set([...touched].filter((n) => labelled.has(n) && !rails.has(n)));
  const railSpecs = new Map<NetName, RailSpec>();
  const powerLibs = new Map<string, LibSymbol>();
  for (const n of rails) {
    const spec = c.rails.get(n);
    if (spec === undefined) throw new Error(`block ${id}: rail ${n} has no spec`);
    railSpecs.set(n, spec);
    powerLibs.set(spec.symbol, symbols.resolve(spec.symbol));
  }
  const pageRefs = intersheetRefs(c);
  const labelRefs = new Map<NetName, string>();
  for (const n of external) {
    const refs = pageRefs.get(n);
    if (refs === undefined) throw new Error(`block ${id}: labelled net ${n} has no intersheet references`);
    labelRefs.set(n, refs);
  }
  return { block, units, rails, groundRails, external, railSpecs, powerLibs, labelRefs };
}

export function realiseBlock(c: Circuit, id: BlockId, symbols: SymbolResolver): BlockLayout {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  const r = block.rendering;
  if (r.kind !== "wired") throw new Error(`realiseBlock: block ${id} is rendered "${r.kind}"; use the bus or labels renderer`);
  const template = TEMPLATES.get(r.template);
  if (template === undefined) throw new Error(`no template registered for ${r.template}`);
  const g = subgraphOf(c, id, symbols);
  // Template helpers throw rather than return mismatch; attribute those errors to this block and template.
  const attributed = <T>(run: () => T): T => {
    try {
      return run();
    } catch (e) {
      throw new Error(`block ${id}: template ${r.template} failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }
  };
  const result = attributed(() => template.realise(g));
  if (!result.ok) {
    throw new Error(`block ${id} has rendering="wired" but template ${r.template} cannot realise its subgraph: ${result.reason}`);
  }
  const layout = result.layout;
  const problems = attributed(() => checkLayout(g, layout));
  if (problems.length > 0) {
    throw new Error(`block ${id}: template ${r.template} produced an invalid layout:${problems.map((p) => `\n  - ${p}`).join("")}`);
  }
  return result.layout;
}
