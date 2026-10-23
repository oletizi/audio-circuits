/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pageRefs.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Page numbers and the intersheet references KiCad prints beside each global label (project.ts
 * INTERSHEET_REFS: full list, own page included, "[2,4]"). The text is known before layout, so
 * the layout reserves its room and the emitter places it; the sheet layout checks the drawn
 * labels against it (sheets.ts).
 */
import { blockOfPin, labelledNets } from "../ir/classify.ts";
import type { Circuit, NetName, SheetId } from "../ir/types.ts";
import type { SheetDrawing } from "./sheet-types.ts";

/** The root sheet is page 1; child sheets follow in circuit order from page 2. */
export function sheetPage(c: Circuit, sheet: SheetId): number {
  const i = c.sheets.findIndex((s) => s.id === sheet);
  if (i < 0) throw new Error(`sheet ${sheet} is not a sheet of the circuit`);
  return i + 2;
}

/** KiCad's text for a label on a net labelled on `pages`. */
export function refsText(pages: Iterable<number>): string {
  return `[${[...new Set(pages)].sort((a, b) => a - b).join(",")}]`;
}

const cache = new WeakMap<Circuit, ReadonlyMap<NetName, string>>();

/**
 * For every net drawn as global labels (labelled and not a rail), the pages of the blocks that
 * carry it. Rails are drawn as power symbols, which KiCad gives no page references.
 */
export function intersheetRefs(c: Circuit): ReadonlyMap<NetName, string> {
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  const labelled = labelledNets(c);
  const pages = new Map<NetName, Set<number>>();
  for (const pin of c.pins) {
    if (pin.net === null || !labelled.has(pin.net) || c.rails.has(pin.net)) continue;
    const block = c.blocks.get(blockOfPin(c, pin));
    if (block === undefined) throw new Error(`pin ${pin.part}.${pin.pin}: its block is not in the circuit`);
    const set = pages.get(pin.net) ?? new Set<number>();
    set.add(sheetPage(c, block.sheet));
    pages.set(pin.net, set);
  }
  const out = new Map<NetName, string>([...pages].map(([net, p]) => [net, refsText(p)]));
  cache.set(c, out);
  return out;
}

/**
 * The reserved references must be what KiCad will print: for every labelled net, the pages its
 * labels are actually drawn on, and every label of the net carrying that text.
 */
export function assertRefsMatchDrawings(c: Circuit, drawings: readonly SheetDrawing[]): void {
  const drawn = new Map<NetName, Set<number>>();
  const printed = new Map<NetName, Set<string>>();
  for (const d of drawings) {
    for (const l of d.labels) {
      drawn.set(l.net, (drawn.get(l.net) ?? new Set<number>()).add(sheetPage(c, d.sheet.id)));
      printed.set(l.net, (printed.get(l.net) ?? new Set<string>()).add(l.refs));
    }
  }
  const problems: string[] = [];
  for (const [net, pages] of [...drawn].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const want = refsText(pages);
    const got = [...(printed.get(net) ?? [])];
    if (got.length !== 1 || got[0] !== want) problems.push(`net ${net}: its labels print ${got.join(" / ")} but are drawn on pages ${want}`);
  }
  if (problems.length > 0) throw new Error(`intersheet references disagree with the drawing:${problems.map((p) => `\n  - ${p}`).join("")}`);
}
