/**
 * Ported from digital-pedal-platform's `tools/schgen/render/drawnText.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The circuit as the drawing prints it: block titles and sheet notes name parts by their design
 * labels (U_BUCK, C_SUP), which never appear on the drawing, so each label is replaced by the
 * part's reference designator from the reference lock (U5, C28). A word shaped like a design label
 * (a part's reference prefix, an underscore, more) that names no part and no net is refused: the
 * reader could not find it on the drawing either.
 */
import type { BlockId, Circuit, IrBlock, PartLabel, SheetSpec } from "../ir/types.ts";

const WORD = /[A-Za-z0-9_]+/g;

interface Names {
  readonly refs: ReadonlyMap<PartLabel, string>;
  readonly prefixes: ReadonlySet<string>;
  readonly nets: ReadonlySet<string>;
}

function looksLikeLabel(word: string, n: Names): boolean {
  const cut = word.indexOf("_");
  return cut > 0 && n.prefixes.has(word.slice(0, cut)) && !n.nets.has(word);
}

function rewrite(text: string, where: string, n: Names): string {
  const unknown: string[] = [];
  const out = text.replace(WORD, (word) => {
    const ref = n.refs.get(word);
    if (ref !== undefined) return ref;
    if (looksLikeLabel(word, n) && !unknown.includes(word)) unknown.push(word);
    return word;
  });
  if (unknown.length > 0) {
    throw new Error(`${where} names ${unknown.join(", ")}: no part or net has that name, so the drawing cannot show it ("${text}")`);
  }
  return out;
}

/** `c` with every part label in block titles and sheet notes replaced by its reference. */
export function withReferences(c: Circuit, refs: ReadonlyMap<PartLabel, string>): Circuit {
  for (const label of c.parts.keys()) {
    if (!refs.has(label)) throw new Error(`part ${label} has no reference; annotate before laying out the drawing`);
  }
  const n: Names = { refs, prefixes: new Set([...c.parts.values()].map((p) => p.refPrefix)), nets: new Set([...c.nets.keys(), ...c.rails.keys()]) };
  const blocks = new Map<BlockId, IrBlock>();
  for (const [id, b] of c.blocks) blocks.set(id, { ...b, title: rewrite(b.title, `block ${id} title`, n) });
  const sheets: SheetSpec[] = c.sheets.map((s) => ({
    ...s,
    notes: s.notes.map((note, i) => ({ ...note, lines: note.lines.map((l) => rewrite(l, `sheet ${s.id} note ${i + 1}`, n)) })),
  }));
  return { ...c, blocks, sheets };
}
