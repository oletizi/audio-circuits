/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/classify.ts`, and DIVERGED from it by
 * Task 8 of the M1 schematic-authoring plan: `labelledNets`' test for an unwired block (decision
 * D3 deletes `labels` and adds `auto`).
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { unitKey, type BlockId, type Circuit, type IrPin, type NetName, type PartLabel } from "./types.ts";

function partOf(c: Circuit, label: PartLabel) {
  const p = c.parts.get(label);
  if (p === undefined) throw new Error(`unknown part ${label}`);
  return p;
}

export function pinsOfUnit(c: Circuit, part: PartLabel, unit: number): IrPin[] {
  const lowest = Math.min(...partOf(c, part).units);
  return c.pins.filter((p) => p.part === part && (p.unit === unit || (p.unit === 0 && unit === lowest)));
}

export function blockOfPin(c: Circuit, pin: IrPin): BlockId {
  const unit = pin.unit === 0 ? Math.min(...partOf(c, pin.part).units) : pin.unit;
  const b = c.unitBlock.get(unitKey(pin.part, unit));
  if (b === undefined) throw new Error(`pin ${pin.part}.${pin.pin}: unit ${unit} is in no block`);
  return b;
}

export function groundRails(c: Circuit): ReadonlySet<NetName> {
  return new Set([...c.rails.values()].filter((r) => r.kind === "ground").map((r) => r.net));
}

export function labelledNets(c: Circuit): ReadonlySet<NetName> {
  const blocksOfNet = new Map<NetName, Set<BlockId>>();
  for (const pin of c.pins) {
    if (pin.net === null) continue;
    const set = blocksOfNet.get(pin.net) ?? new Set<BlockId>();
    set.add(blockOfPin(c, pin));
    blocksOfNet.set(pin.net, set);
  }
  const out = new Set<NetName>();
  for (const [net, blocks] of blocksOfNet) {
    const unwired = [...blocks].some((b) => isUnwired(c, b));
    if (c.rails.has(net) || blocks.size > 1 || unwired || c.offSheet.has(net)) out.add(net);
  }
  return out;
}

/**
 * **Whether a block carries its internal connectivity in LABELS rather than in wires**, which is
 * what forces a label onto every net it touches.
 *
 * The ported source asked `rendering.kind !== "wired"` over the two non-wired kinds it had, `bus`
 * and `labels`, both of which do. Task 8 deletes `labels` and adds `auto` (decision D3), and
 * **`auto` does NOT**: an auto block is drawn by a template or by the ELK backend, with real wires
 * between its pins, so its internal nets are wired exactly as a declared template's are. Keeping
 * the inherited test would have labelled every net of every auto block, which is invisible in a
 * netlist assertion - the connectivity is identical either way - and visible only in the drawing.
 * So the test is now not `wired` and not `auto`, which over this `Rendering` means `bus`; it is
 * written as two exclusions rather than `=== "bus"` so that a block id with no block (which
 * `blockOfPin` should have refused upstream) stays on the labelled side, as it was before.
 */
function isUnwired(c: Circuit, b: BlockId): boolean {
  const kind = c.blocks.get(b)?.rendering.kind;
  return kind !== "wired" && kind !== "auto";
}
