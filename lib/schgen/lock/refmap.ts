/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/refmap.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { Circuit } from "../ir/types.ts";
import { unitKey } from "../ir/types.ts";
import { comparePinNumbers } from "../ir/order.ts";
import type { Annotation } from "./annotate.ts";

const cell = (s: string): string => s.replaceAll("|", "\\|");

export function renderRefmap(c: Circuit, a: Annotation): string {
  const rows: { ref: string; line: string }[] = [];
  for (const part of c.parts.values()) {
    const ref = a.refs.get(part.label);
    if (ref === undefined) throw new Error(`REFMAP: ${part.label} has no reference in the annotation`);
    const unit = Math.min(...part.units);
    const blockId = c.unitBlock.get(unitKey(part.label, unit));
    const block = blockId === undefined ? undefined : c.blocks.get(blockId);
    if (block === undefined) throw new Error(`REFMAP: ${part.label} unit ${unit} is not placed in any block`);
    rows.push({ ref, line: `| ${ref} | ${cell(part.label)} | ${cell(block.sheet)} | ${cell(block.id)} | ${cell(part.value)} | ${cell(part.bom.MPN)} |` });
  }
  rows.sort((x, y) => comparePinNumbers(x.ref, y.ref));
  const retired = Object.entries(a.lock.retired).sort(([, x], [, y]) => comparePinNumbers(x, y));
  return [
    "# Reference map",
    "",
    "This file is generated from `refs.lock.json`; do not edit it by hand. Renaming a functional label retires its old reference and assigns a new one.",
    "",
    "| Reference | Label | Sheet | Block | Value | MPN |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => r.line),
    "",
    "## Retired",
    "",
    "| Reference | Former label |",
    "| --- | --- |",
    ...retired.map(([label, ref]) => `| ${ref} | ${cell(label)} |`),
    "",
  ].join("\n");
}
