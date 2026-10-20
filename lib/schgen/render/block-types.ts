/**
 * Ported from digital-pedal-platform's `tools/schgen/render/blockTypes.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { IrBlock, IrPart, IrPin, NetName, PartLabel, RailSpec, TemplateId } from "../ir/types.ts";
import type { Point, Rotation, Side } from "./geometry.ts";
import type { LibSymbol } from "./library.ts";

export interface BlockUnit {
  readonly part: IrPart;
  readonly unit: number;
  readonly symbol: LibSymbol;
  readonly pins: readonly IrPin[];
}

export interface BlockSubgraph {
  readonly block: IrBlock;
  readonly units: readonly BlockUnit[];
  readonly rails: ReadonlySet<NetName>;
  readonly groundRails: ReadonlySet<NetName>;
  /** Labelled, non-rail nets touching this block: each piece needs a global label. */
  readonly external: ReadonlySet<NetName>;
  /** The specs of `rails`, for drawing their anchors as power symbols. */
  readonly railSpecs: ReadonlyMap<NetName, RailSpec>;
  /** The power symbols of `rails`, by lib id. */
  readonly powerLibs: ReadonlyMap<string, LibSymbol>;
  /** The intersheet references of each net in `external`, as its labels print them (pageRefs.ts). */
  readonly labelRefs: ReadonlyMap<NetName, string>;
}

export interface Placement {
  readonly part: PartLabel;
  readonly unit: number;
  readonly at: Point;
  readonly rot: Rotation;
}

export interface Wire {
  readonly a: Point;
  readonly b: Point;
  readonly net: NetName;
}

/** Where a rail's power symbol or an external net's global label attaches; `side` points away from the circuit. */
export interface Anchor {
  readonly net: NetName;
  readonly at: Point;
  readonly side: Side;
}

export interface BlockLayout {
  readonly placements: readonly Placement[];
  readonly wires: readonly Wire[];
  readonly anchors: readonly Anchor[];
}

export type RealiseResult = { readonly ok: true; readonly layout: BlockLayout } | { readonly ok: false; readonly reason: string };

/** A template only positions parts and routes the IR's own connections; it never adds one. */
export interface Template {
  readonly id: TemplateId;
  realise(g: BlockSubgraph): RealiseResult;
}

export function mismatch(reason: string): RealiseResult {
  return { ok: false, reason };
}
