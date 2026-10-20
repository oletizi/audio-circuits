/**
 * Ported from digital-pedal-platform's `tools/schgen/render/glyphClearance.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Body clearance against glyphs. A placed unit's body — the bounding box of its library graphics
 * (libGraphics.graphicsBox) — must not overlap any power symbol glyph, PWR_FLAG glyph or global
 * label outline, except one attached at one of that unit's own pin ends on that pin's net (its own
 * connection, which meets the body only at the pin). The text check sees glyphs only as obstacles
 * for text, and body clearance sees only the anchor point, so without this a body could be drawn
 * over a neighbouring pin's GND symbol. Glyph clearance (glyphGlyphProblems): power and PWR_FLAG
 * glyphs of different nets never meet, and glyphs of one net never overlap. checkLayout runs both on
 * every block's own drawing; assertSheetSafe runs both over the whole sheet.
 */
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { fmtPoint } from "./connectivity.ts";
import { boxesOverlap, pinEnd, placeBox, samePoint, type Point } from "./geometry.ts";
import { graphicsBox } from "./lib-graphics.ts";
import type { Box } from "./lib-pins.ts";
import { powerText, type LibLookup } from "./power-text.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import { labelBox } from "./text-boxes.ts";

export interface GlyphScene {
  /** Resolves every power symbol's lib id. */
  readonly symbols: LibLookup;
  readonly blocks: ReadonlyArray<{ readonly g: BlockSubgraph; readonly layout: BlockLayout }>;
  readonly powers: readonly PowerSymbol[];
  readonly labels: readonly GlobalLabel[];
}

interface Glyph {
  readonly what: string;
  readonly box: Box;
  readonly net: string;
  readonly at: Point;
}

interface Body {
  readonly key: string;
  readonly box: Box;
  /** The unit's own pin ends, with their nets. */
  readonly ends: ReadonlyArray<{ readonly at: Point; readonly net: string | null }>;
}

function bodies(scene: GlyphScene): Body[] {
  return scene.blocks.flatMap(({ g, layout }) =>
    layout.placements.flatMap((pl) => {
      const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
      if (u === undefined) throw new Error(`block ${g.block.id}: placement ${pl.part}#${pl.unit} is not a unit of the block`);
      const graphics = u.symbol.graphics.get(pl.unit);
      if (graphics === undefined) throw new Error(`${u.symbol.libId} has no graphics for unit ${pl.unit}`);
      const lib = graphicsBox(graphics);
      // A unit that draws nothing but pins has no body to cover anything.
      if (lib === null) return [];
      const ends = u.pins.map((p) => {
        const lp = u.symbol.pins.find((l) => l.number === p.pin);
        if (lp === undefined) throw new Error(`${u.symbol.libId} has no pin ${p.pin} (part ${p.part})`);
        return { at: pinEnd(pl.at, pl.rot, lp), net: p.net };
      });
      return [{ key: `${pl.part}#${pl.unit}`, box: placeBox(pl.at, pl.rot, lib), ends }];
    }),
  );
}

interface PowerGlyph extends Glyph {
  readonly flag: boolean;
}

function powerGlyphs(scene: Pick<GlyphScene, "symbols" | "powers">): PowerGlyph[] {
  return scene.powers.map((p, i): PowerGlyph => ({
    what: `the glyph of ${p.flag ? "PWR_FLAG" : "power symbol"} ${p.net} ${i} at ${fmtPoint(p.at)}`,
    box: powerText(scene.symbols, p).glyph,
    net: p.net,
    at: p.at,
    flag: p.flag,
  }));
}

function glyphs(scene: GlyphScene): Glyph[] {
  const powers = powerGlyphs(scene);
  const labels = scene.labels.map((l): Glyph => ({ what: `label ${l.net} at ${fmtPoint(l.at)}`, box: labelBox(l), net: l.net, at: l.at }));
  return [...powers, ...labels];
}

const ownConnection = (b: Body, gl: Glyph): boolean => b.ends.some((e) => e.net === gl.net && samePoint(e.at, gl.at));

/** Every body that overlaps a glyph not on its own connection, one line each naming both. */
export function bodyGlyphProblems(scene: GlyphScene): string[] {
  const gs = glyphs(scene);
  return bodies(scene).flatMap((b) =>
    gs.filter((gl) => !ownConnection(b, gl) && boxesOverlap(b.box, gl.box)).map((gl) => `body of ${b.key} overlaps ${gl.what}`),
  );
}

/** Overlapping or touching, edge or corner. */
const touching = (a: Box, b: Box): boolean => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/** A PWR_FLAG on its rail's own symbol at one point: the coincidence is the connection (frames.flagsContent). */
const flagOnItsRail = (a: PowerGlyph, b: PowerGlyph): boolean => a.flag !== b.flag && a.net === b.net && samePoint(a.at, b.at);

function glyphPairProblem(a: PowerGlyph, b: PowerGlyph): string | null {
  if (a.net !== b.net) return touching(a.box, b.box) ? `${a.what} touches ${b.what}, which is on another net` : null;
  if (flagOnItsRail(a, b)) return null;
  return boxesOverlap(a.box, b.box) ? `${a.what} overlaps ${b.what}` : null;
}

/**
 * Glyph clearance, one line per offending pair naming both. Glyphs of different nets may not
 * overlap or touch: two that meet, such as GND and VSSA symbols on adjacent pins whose triangles
 * meet corner to corner, read as joined. Glyphs of one net may touch (a row of GND symbols on
 * adjacent pins, one 2.54 mm pitch apart, meets edge to edge; it is one net) but not overlap,
 * except a PWR_FLAG drawn on its rail's symbol at one point.
 */
export function glyphGlyphProblems(scene: Pick<GlyphScene, "symbols" | "powers">): string[] {
  const gs = powerGlyphs(scene);
  return gs.flatMap((a, i) =>
    gs.slice(i + 1).flatMap((b) => {
      const p = glyphPairProblem(a, b);
      return p === null ? [] : [p];
    }),
  );
}

/** Whether two power symbols' glyphs break glyph clearance (glyphGlyphProblems' rule for one pair). */
export function glyphsClash(symbols: LibLookup, a: PowerSymbol, b: PowerSymbol): boolean {
  const [ga, gb] = powerGlyphs({ symbols, powers: [a, b] });
  if (ga === undefined || gb === undefined) throw new Error("unreachable: two power symbols give two glyphs");
  return glyphPairProblem(ga, gb) !== null;
}
