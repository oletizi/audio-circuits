/**
 * Ported from digital-pedal-platform's `tools/schgen/__fixtures__/layoutChecks.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { BlockLayout, BlockSubgraph } from "../../../lib/schgen/render/block-types.ts";
import { layoutItems } from "../../../lib/schgen/render/blocks.ts";
import { danglingWireEnds } from "../../../lib/schgen/render/wire-safety.ts";

/**
 * The production dangling-wire-end check (checkLayout runs it) on a layout fragment that has not
 * been through checkLayout, such as a kit's output in a unit test.
 */
export function unattachedWireEnds(g: BlockSubgraph, layout: BlockLayout): string[] {
  return danglingWireEnds(layoutItems(g, layout));
}
