/**
 * Ported from digital-pedal-platform's `tools/schgen/render/fanoutRows.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Text-aware row spacing for the fan-out primitive. Pins on one side sit a pin pitch apart, too
 * close for a series part's Reference and Value or for power values beside each other. Each
 * outgoing row's room across its line is measured from what it draws (series bodies and their
 * fields, the far label or power symbol with its value), and rows that need more room than their
 * pins give are moved apart, each by a jog (a short wire across the side) beyond the pin ends.
 */
import type { NetName } from "../ir/types.ts";
import type { BlockSubgraph, BlockUnit } from "./block-types.ts";
import { GRID, gridCeil, type Side, type Um } from "./geometry.ts";
import { orientedBody, orientTwoPin } from "./layout-kit.ts";
import { blockPowerLibs, labelRefsOf, powerText, valuesAlong } from "./power-text.ts";
import { FIELDS_ABOVE, fieldsWidth, labelBox, powerRotation, powerValueBox } from "./text-boxes.ts";

/** Room a row takes across its line: toward smaller (`minus`) and larger (`plus`) cross coordinates. */
export interface RowExtent {
  readonly minus: Um;
  readonly plus: Um;
}

/** The placer's clearance around fields (fieldPlacement MARGIN). */
const MARGIN: Um = GRID / 2;

const horizontalSide = (side: Side): boolean => side === "left" || side === "right";

/** Room the far anchor of a row on `side` takes across the row, measured on its real label or power symbol. */
function anchorExtent(g: BlockSubgraph, side: Side, net: NetName): RowExtent {
  const origin = { x: 0, y: 0 };
  const rail = g.railSpecs.get(net);
  const boxes = (() => {
    if (rail === undefined) {
      const box = labelBox({ net, at: origin, side, refs: labelRefsOf(g, net) });
      // A label standing up or down prints its page references as a vertical column beside its
      // neighbour's; half a grid step either side keeps neighbouring columns from touching.
      return [horizontalSide(side) ? box : { ...box, minX: box.minX - GRID / 2, maxX: box.maxX + GRID / 2 }];
    }
    const p = { net, libId: rail.symbol, at: origin, rot: powerRotation(rail.kind, side), flag: false, valueAlong: valuesAlong(g.block.rendering) };
    const t = powerText(blockPowerLibs(g), p);
    return [t.glyph, powerValueBox(t.value, t.text)];
  })();
  const h = horizontalSide(side);
  return {
    minus: Math.max(0, ...boxes.map((b) => -(h ? b.minY : b.minX))),
    plus: Math.max(0, ...boxes.map((b) => (h ? b.maxY : b.maxX))),
  };
}

/**
 * Room a series unit takes across a row: its body, plus its fields where the placer puts them
 * for a unit lying along the row — above a horizontal unit (its first free side), right of a
 * vertical one — with the placer's clearance.
 */
function unitExtent(u: BlockUnit, side: Side, near: NetName): RowExtent {
  const h = horizontalSide(side);
  const body = orientedBody(u, orientTwoPin(u, h ? "horizontal" : "vertical", near));
  if (h) return { minus: -body.minY + FIELDS_ABOVE + MARGIN, plus: body.maxY };
  return { minus: -body.minX, plus: body.maxX + GRID + fieldsWidth(u.part) + MARGIN };
}

/** Room a whole row takes: its series units and, when labelled, its far anchor. */
export function rowExtent(g: BlockSubgraph, side: Side, units: readonly BlockUnit[], nets: readonly NetName[], anchored: boolean): RowExtent {
  const parts = units.map((u, i) => unitExtent(u, side, nets[i]!));
  const far = nets[nets.length - 1];
  if (anchored && far !== undefined) parts.push(anchorExtent(g, side, far));
  return { minus: Math.max(0, ...parts.map((p) => p.minus)), plus: Math.max(0, ...parts.map((p) => p.plus)) };
}

/**
 * Cross coordinates for rows at `at` (ascending), each at least the sum of its neighbours' facing
 * extents from the previous one and never closer than its pins; then shifted as a whole so the
 * middle row keeps its place and rows move outward both ways.
 */
export function spreadRows(at: readonly Um[], extents: readonly RowExtent[]): Um[] {
  const t: Um[] = [];
  at.forEach((q, k) => {
    const prev = t[k - 1];
    t.push(prev === undefined ? q : Math.max(q, prev + gridCeil(extents[k - 1]!.plus + extents[k]!.minus)));
  });
  const m = Math.floor((at.length - 1) / 2);
  const shift = at.length === 0 ? 0 : at[m]! - t[m]!;
  return t.map((x) => x + shift);
}

/**
 * Jog slot (0 nearest the pins) for every moved row, so no jog crosses another row: rows moving
 * toward larger coordinates jog nearer the pins the further along they are, rows moving toward
 * smaller ones the earlier they are. Unmoved rows get none.
 */
export function jogSlots(at: readonly Um[], to: readonly Um[]): Array<number | null> {
  const up = at.flatMap((q, k) => (to[k]! < q ? [k] : []));
  const down = at.flatMap((q, k) => (to[k]! > q ? [k] : []));
  return at.map((_, k) => {
    const u = up.indexOf(k);
    if (u >= 0) return u;
    const d = down.indexOf(k);
    return d >= 0 ? down.length - 1 - d : null;
  });
}
