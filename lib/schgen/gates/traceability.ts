/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/traceability.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { NonSchematicEntry } from "../design.ts";
import type { Circuit } from "../ir/types.ts";

const ID = /^[A-Z]+-\d{2}$/;
const ITEM = /^- \[[ x]\] \*\*([A-Z]+-\d{2})\*\*/;
const LOOSE_CHECKBOX = /^\s*[-*+]\s+\[.{0,2}\]/;

/** Item ids in file order. A checkbox-looking line that is not a strict item, and a repeated id, throw. */
export function checklistIds(markdown: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  markdown.split("\n").forEach((line, i) => {
    if (!LOOSE_CHECKBOX.test(line)) return;
    const id = ITEM.exec(line)?.[1];
    if (id === undefined) throw new Error(`SCHEMATIC-CHECKLIST.md line ${i + 1} looks like a checklist item but is malformed: ${line}`);
    if (seen.has(id)) throw new Error(`SCHEMATIC-CHECKLIST.md line ${i + 1} repeats checklist id ${id}: ${line}`);
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

export interface TraceInput {
  readonly circuit: Circuit;
  readonly allIds: readonly string[];
  readonly prefixes: readonly string[];
  readonly nonSchematic: readonly NonSchematicEntry[];
}

function references(c: Circuit): Map<string, string> {
  const where = new Map<string, string>();
  const add = (ids: readonly string[], what: string) => {
    for (const id of ids) if (!where.has(id)) where.set(id, what);
  };
  for (const p of [...c.parts.values()].sort((a, b) => a.order - b.order)) add(p.checklist, `part ${p.label}`);
  for (const b of [...c.blocks.values()].sort((a, b2) => a.order - b2.order)) add(b.checklist, `block ${b.id}`);
  for (const s of c.sheets) s.notes.forEach((n, i) => add(n.checklist, `sheet note ${s.id}#${i + 1}`));
  return where;
}

export function checkTraceability(t: TraceInput): string[] {
  const out: string[] = [];
  for (const id of t.allIds) if (!ID.test(id)) throw new Error(`checkTraceability: invalid checklist id "${id}" in allIds`);
  const exists = new Set(t.allIds);
  const refs = references(t.circuit);
  const listed = new Map<string, number>();
  for (const e of t.nonSchematic) listed.set(e.id, (listed.get(e.id) ?? 0) + 1);
  for (const id of t.allIds) {
    if (!t.prefixes.includes(id.slice(0, id.indexOf("-")))) continue;
    if (!refs.has(id) && !listed.has(id)) out.push(`${id} is referenced by no part, block or sheet note and is not listed in non-schematic.ts`);
  }
  for (const [id, what] of refs) if (!exists.has(id)) out.push(`${id} is referenced by ${what} but does not exist in SCHEMATIC-CHECKLIST.md`);
  for (const e of t.nonSchematic) {
    if (e.reason.trim() === "") out.push(`${e.id} is listed in non-schematic.ts with an empty reason`);
    if (!exists.has(e.id)) out.push(`${e.id} is listed in non-schematic.ts but does not exist in SCHEMATIC-CHECKLIST.md`);
    const also = refs.get(e.id);
    if (also !== undefined) out.push(`${e.id} is listed in non-schematic.ts but is also referenced by ${also}`);
  }
  for (const [id, n] of listed) if (n > 1) out.push(`${id} is listed in non-schematic.ts twice`);
  return out;
}
