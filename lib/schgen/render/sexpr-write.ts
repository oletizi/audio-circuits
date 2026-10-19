/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sexprWrite.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { quoteString, type SList } from "../../kicad/sexpr.ts";
import { fmtMm, type Um } from "./geometry.ts";

export interface SAtomNode {
  readonly kind: "atom";
  readonly text: string;
  readonly quoted: boolean;
}

export interface SListNode {
  readonly kind: "list";
  readonly items: readonly SNode[];
}

export type SNode = SAtomNode | SListNode;

const BARE = /^[^\s()"]+$/;

export function sym(text: string): SAtomNode {
  if (!BARE.test(text)) throw new Error(`"${text}" is not a bare symbol`);
  return { kind: "atom", text, quoted: false };
}

export function str(text: string): SAtomNode {
  if (/[\u0000-\u001f]/.test(text)) {
    throw new Error(`string ${JSON.stringify(text)} contains a control character; emit one text item per line`);
  }
  return { kind: "atom", text, quoted: true };
}

export function mm(v: Um): SAtomNode {
  return sym(fmtMm(v));
}

export function int(n: number): SAtomNode {
  if (!Number.isInteger(n)) throw new Error(`int: ${n} is not an integer`);
  return sym(String(n));
}

export function yesNo(b: boolean): SAtomNode {
  return sym(b ? "yes" : "no");
}

function isNodeArray(x: SNode | readonly SNode[]): x is readonly SNode[] {
  return Array.isArray(x);
}

export function list(head: string, ...items: ReadonlyArray<SNode | readonly SNode[]>): SListNode {
  const flat: SNode[] = [sym(head)];
  for (const item of items) {
    if (isNodeArray(item)) flat.push(...item);
    else flat.push(item);
  }
  return { kind: "list", items: flat };
}

export function headOf(n: SNode): string | null {
  if (n.kind !== "list") return null;
  const first = n.items[0];
  return first !== undefined && first.kind === "atom" && !first.quoted ? first.text : null;
}

function atomText(a: SAtomNode): string {
  return a.quoted ? quoteString(a.text) : a.text;
}

function render(n: SNode, depth: number): string {
  if (n.kind === "atom") return atomText(n);
  if (n.items.every((i) => i.kind === "atom")) {
    return `(${n.items.map((i) => (i.kind === "atom" ? atomText(i) : "")).join(" ")})`;
  }
  const pad = "\t".repeat(depth + 1);
  let out = "(";
  let leading = true;
  n.items.forEach((item, i) => {
    if (leading && item.kind === "atom") {
      out += (i === 0 ? "" : " ") + atomText(item);
      return;
    }
    leading = false;
    out += `\n${pad}${render(item, depth + 1)}`;
  });
  return `${out}\n${"\t".repeat(depth)})`;
}

/** KiCad-style layout: atoms inline until the first nested list, then one child per line. */
export function print(n: SNode): string {
  return render(n, 0);
}

/** Convert the repository parser's output, restoring the source order of atoms and lists. */
export function fromParsed(l: SList): SListNode {
  const children: Array<{ start: number; node: SNode }> = [
    ...l.atoms.map((a) => {
      if (a.lossyEscape !== null) {
        throw new Error(
          `fromParsed: string at offset ${a.start} uses escape ${a.lossyEscape}, which the S-expression parser cannot decode faithfully; refusing to re-emit it corrupted (decoded value ${JSON.stringify(a.value)})`,
        );
      }
      return { start: a.start, node: a.quoted ? str(a.value) : sym(a.value) };
    }),
    ...l.lists.map((c) => ({ start: c.start, node: fromParsed(c) })),
  ];
  children.sort((a, b) => a.start - b.start);
  return { kind: "list", items: children.map((c) => c.node) };
}
