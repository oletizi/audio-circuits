/**
 * Forward declaration for the symbol-library resolver. `lib/schgen/ir/build.ts`,
 * `validate.ts`, `validate-nets.ts` and `validate-rule.ts` (Task 2) import
 * `SymbolResolver` (and `validate-nets.ts` additionally imports `LibPin`) as a
 * type from this path, matching the pedals source's `@/schgen/render/library`.
 *
 * Task 4 ports the real `render/library.ts` here - the one that reads KiCad
 * `.kicad_sym` files via `lib/schgen/render/lib-pins.ts` and `lib-graphics.ts`
 * and implements `createResolver` for real. That port replaces every
 * interface and function below wholesale; it does not extend this file -
 * supersede means delete.
 *
 * `LibSymbol` here carries only the fields `lib/schgen/ir/` actually reads:
 * `pins` (`partPins` in build.ts; `pinsDeclared`, `mechanicalPads` and
 * `pinSemantics` in the validators), `unitCount` (`partShapes`,
 * `unitsPlaced`) and `isPower` (the `rails` rule). Pedals' real `LibSymbol`
 * additionally carries `libId`, `name`, `node`, `boxes`, `bodies`,
 * `graphics` and `pinText`, none of which `ir/` reads - Task 4 restores
 * those along with the real `createResolver`. Recorded in docs/known-gaps.md.
 *
 * `createResolver` exists (rather than being omitted along with the rest of
 * the implementation) only so that `tests/schgen/__fixtures__/fixture-lib.ts`
 * - and through it, every ported `ir/` test that calls `fixtureResolver()` -
 * still typechecks: `createResolver` is a real, typed, callable export.
 * Calling it throws, naming Task 4, rather than silently returning a fake
 * resolver - a thrown, named error is this repository's rule for
 * functionality that is not implemented yet, not a workaround.
 */

import type { LibPin } from "./lib-pins.ts"

export type { LibPin }

export interface LibSymbol {
  readonly pins: readonly LibPin[]
  readonly unitCount: number
  readonly isPower: boolean
}

export interface SymbolResolver {
  resolve(libId: string): LibSymbol
  readonly files: ReadonlyMap<string, string>
}

export function createResolver(_libraries: ReadonlyMap<string, string>): SymbolResolver {
  throw new Error(
    "render/library.ts's real symbol-library resolver is not ported yet - lib/schgen/ir/ " +
      "(Task 2) only forward-declares its types (SymbolResolver, LibSymbol) and this throwing " +
      "stub. Task 4 ports digital-pedal-platform's render/library.ts here, which implements " +
      "createResolver by parsing the named .kicad_sym files via lib-pins.ts and lib-graphics.ts.",
  )
}
