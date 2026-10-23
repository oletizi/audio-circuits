/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validateRule.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { Circuit } from "./types.ts";
import type { SymbolResolver } from "../render/library.ts";

export type Rule = (c: Circuit, symbols: SymbolResolver) => string[];
