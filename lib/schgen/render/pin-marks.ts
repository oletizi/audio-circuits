/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pinMarks.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Pin-polarity marks on DNP parts. KiCad draws a DNP part's cross over its body and pins
 * (SCH_SYMBOL::PlotDNP); on a small polarised glyph such as a Zener the cross arms run along the
 * triangle and the cathode bar, so the orientation cannot be read. A DNP two-pin part whose pins
 * carry distinct identities (K/A, +/−) and whose symbol shows neither pin numbers nor names gets
 * each identity printed beside its pin tip, outside the cross. The marks are sheet text: the
 * field placer and the text checks treat them like any other text.
 */
import type { BlockUnit, Placement } from "./block-types.ts";
import { GRID, pinEnd, placeBox } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { textBox, type TextSpot } from "./text-boxes.ts";
import { unitText } from "./unit-text.ts";

export interface PinMark {
  /** What the checks call it, e.g. "pin mark K of D_Z_L#1". */
  readonly what: string;
  readonly text: string;
  readonly spot: TextSpot;
}

export function pinMarkBox(m: PinMark): Box {
  return textBox(m.spot, m.text);
}

/** The identity of each pin of the unit, by pin number, when the unit qualifies for marks; else null. */
function polarIdentities(u: BlockUnit, unit: number): Map<string, string> | null {
  if (!u.part.dnp) return null;
  const style = u.symbol.pinText;
  if (!style.numbersHidden || !style.namesHidden) return null;
  const visible = u.symbol.pins.filter((p) => (p.unit === unit || p.unit === 0) && !p.hidden);
  if (visible.length !== 2) return null;
  const ids = new Map<string, string>();
  for (const lp of visible) {
    const identity = u.pins.find((p) => p.pin === lp.number)?.identity ?? "";
    if (identity === "") return null;
    ids.set(lp.number, identity);
  }
  return new Set(ids.values()).size === 2 ? ids : null;
}

/** How far a mark sits off its pin line: clear of its own cross and of an in-line neighbour's. */
const OFFSET = 2 * GRID;

/**
 * Marks for a placed unit: beside each pin tip, two grid steps off the pin line (left of a
 * vertical pin, below a horizontal one), clear of the DNP crosses (dnpCross; textScene checks it).
 */
export function pinMarks(u: BlockUnit, pl: Placement): PinMark[] {
  const ids = polarIdentities(u, pl.unit);
  if (ids === null) return [];
  const lib = u.symbol.bodies.get(pl.unit);
  if (lib === undefined) throw new Error(`${u.symbol.libId} has no body for unit ${pl.unit}`);
  const body = placeBox(pl.at, pl.rot, lib);
  const key = `${pl.part}#${pl.unit}`;
  return [...ids].map(([number, text]) => {
    const lp = u.symbol.pins.find((p) => p.number === number);
    if (lp === undefined) throw new Error(`${u.symbol.libId} has no pin ${number}`);
    const tip = pinEnd(pl.at, pl.rot, lp);
    const vertical = tip.y < body.minY || tip.y > body.maxY;
    const spot: TextSpot = vertical
      ? { at: { x: tip.x - OFFSET, y: tip.y }, justify: "right" }
      : { at: { x: tip.x, y: tip.y + OFFSET }, justify: "center" };
    return { what: `pin mark ${text} of ${key}`, text, spot };
  });
}

/**
 * The area KiCad's DNP cross covers on a placed DNP unit (SCH_SYMBOL::PlotDNP): the body box grown
 * along each axis by its margin, where the margins start as the pins' overhang beyond the body
 * and become mx = max(0.6·mx, 0.3·my), then my = max(0.6·my, 0.3·mx). Null for a fitted part.
 */
export function dnpCross(u: BlockUnit, pl: Placement): Box | null {
  if (!u.part.dnp) return null;
  const t = unitText(u, pl);
  const tips = [...t.tips.values()].flat();
  const pins = tips.reduce<Box>(
    (b, p) => ({ minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }),
    t.body,
  );
  const ox = Math.max(t.body.minX - pins.minX, pins.maxX - t.body.maxX);
  const oy = Math.max(t.body.minY - pins.minY, pins.maxY - t.body.maxY);
  const mx = Math.round(Math.max(ox * 0.6, oy * 0.3));
  const my = Math.round(Math.max(oy * 0.6, mx * 0.3));
  return { minX: t.body.minX - mx, minY: t.body.minY - my, maxX: t.body.maxX + mx, maxY: t.body.maxY + my };
}
