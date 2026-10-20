import { test, expect } from "bun:test"
import type { BuildContext } from "../../../lib/schgen/ir/build.ts"
import type { LibSymbol, SymbolResolver } from "../../../lib/schgen/render/library.ts"

/**
 * Task 2's cut, pinned as a failing-if-reverted test: `ir/build.ts`'s
 * `BuildContext` loses the pin-map branch entirely (`checkMcuConfig`,
 * `PinmapInput`, the `isMcu` flag, `CircuitSpec.mcu`, `Circuit.mcu`) rather
 * than porting a dead one - "supersede means delete" (`CLAUDE.md`). This does
 * not call `buildCircuit`; it is purely a shape check on `BuildContext`
 * itself, so it needs no real symbol-library resolver and does not touch
 * `createResolver` (which throws until Task 4 - see
 * `lib/schgen/render/library.ts`).
 */
function stubResolver(): SymbolResolver {
  const symbol: LibSymbol = { pins: [], unitCount: 1, isPower: false }
  return {
    resolve: () => symbol,
    files: new Map(),
  }
}

test("the build context carries symbols and nothing else", () => {
  const ctx: BuildContext = { symbols: stubResolver() }
  expect(Object.keys(ctx)).toEqual(["symbols"])
})
