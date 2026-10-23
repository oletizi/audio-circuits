/**
 * Ported from digital-pedal-platform's `tools/schgen/__fixtures__/fixtureLib.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import type { BomFields } from "../../../lib/schgen/ir/types.ts";
import { createResolver, type SymbolResolver } from "../../../lib/schgen/render/library.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Resolver over the hand-written fixture libraries: nicknames "Fix" and "Pwr". */
export function fixtureResolver(): SymbolResolver {
  return createResolver(
    new Map([
      ["Fix", path.join(HERE, "symbols", "Fix.kicad_sym")],
      ["Pwr", path.join(HERE, "symbols", "Pwr.kicad_sym")],
    ]),
  );
}

/** Test-only BOM fields. Production parts always carry real values. */
export const TEST_BOM: BomFields = {
  Manufacturer: "TestMfr",
  MPN: "TEST-MPN",
  Supplier: "LCSC",
  SupplierPart: "C0",
  AbsMaxV: null,
};
