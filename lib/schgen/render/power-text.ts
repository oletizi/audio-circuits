/**
 * Ported from digital-pedal-platform's `tools/schgen/render/powerText.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Anchors drawn as power symbols or global labels, and where a power symbol's glyph and value go.
 */
import type { NetName, RailSpec, Rendering } from "../ir/types.ts";
import type { Anchor, BlockSubgraph } from "./block-types.ts";
import { placeBox } from "./geometry.ts";
import type { Box, LibSymbol } from "./library.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import { powerRotation, powerValueSpot, type PowerValueSpot } from "./text-boxes.ts";

/** Anything that resolves a lib id: the project's SymbolResolver, or a block's own power symbols. */
export interface LibLookup {
  resolve(libId: string): LibSymbol;
}

/**
 * Whether a block's power values run along their glyphs: true for the bus and labels renderers,
 * whose anchors are pin stubs one pin pitch apart (horizontal values of adjacent up/down symbols
 * would overprint each other); wired templates space their anchors for horizontal values.
 */
export function valuesAlong(rendering: Rendering): boolean {
  return rendering.kind !== "wired";
}

/** What drawing an anchor needs: rails' specs (power symbols) and labelled nets' intersheet references. */
export interface AnchorNets {
  readonly railSpecs: ReadonlyMap<NetName, RailSpec>;
  readonly labelRefs: ReadonlyMap<NetName, string>;
}

/** The intersheet references a label on `net` prints. */
export function labelRefsOf(nets: AnchorNets, net: NetName): string {
  const refs = nets.labelRefs.get(net);
  if (refs === undefined) throw new Error(`net ${net} is drawn as a global label but is not a labelled net of the block`);
  return refs;
}

/**
 * Anchors become power symbols (rails) or global labels (every other net). `along`: the anchors
 * are pin stubs (valuesAlong), whose power values run along the glyph.
 */
export function anchorsToSymbols(
  nets: AnchorNets,
  anchors: readonly Anchor[],
  along: boolean,
): { powers: PowerSymbol[]; labels: GlobalLabel[] } {
  const powers: PowerSymbol[] = [];
  const labels: GlobalLabel[] = [];
  for (const a of anchors) {
    const rail = nets.railSpecs.get(a.net);
    if (rail === undefined) labels.push({ net: a.net, at: a.at, side: a.side, refs: labelRefsOf(nets, a.net) });
    else powers.push({ net: a.net, libId: rail.symbol, at: a.at, rot: powerRotation(rail.kind, a.side), flag: false, valueAlong: along });
  }
  return { powers, labels };
}

/** The power symbols a block may draw: its rails' symbols; any other lib id is an error. */
export function blockPowerLibs(g: BlockSubgraph): LibLookup {
  return {
    resolve(libId: string) {
      const lib = g.powerLibs.get(libId);
      if (lib === undefined) throw new Error(`block ${g.block.id}: power symbol ${libId} is not one of the block's rails`);
      return lib;
    },
  };
}

export interface PowerText {
  readonly glyph: Box;
  readonly value: PowerValueSpot;
  readonly text: string;
}

export function powerText(symbols: LibLookup, p: PowerSymbol): PowerText {
  const lib = symbols.resolve(p.libId);
  const body = lib.bodies.get(1);
  if (body === undefined) throw new Error(`${p.libId}: power symbol has no unit-1 body box`);
  const glyph = placeBox(p.at, p.rot, body);
  return { glyph, value: powerValueSpot(glyph, p.at, p.valueAlong), text: p.flag ? "PWR_FLAG" : p.net };
}

