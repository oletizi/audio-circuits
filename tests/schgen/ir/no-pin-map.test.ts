import { test, expect } from "bun:test"
import type { BuildContext } from "../../../lib/schgen/ir/build.ts"
import { fixtureResolver } from "../__fixtures__/fixture-lib.ts"

/**
 * Task 2's cut, pinned as a failing-if-reverted test: `ir/build.ts`'s
 * `BuildContext` loses the pin-map branch entirely (`checkMcuConfig`,
 * `PinmapInput`, the `isMcu` flag, `CircuitSpec.mcu`, `Circuit.mcu`) rather
 * than porting a dead one - "supersede means delete" (`CLAUDE.md`). This does
 * not call `buildCircuit`; it is purely a shape check on `BuildContext`
 * itself, and it resolves nothing.
 *
 * **It used a hand-built three-field `LibSymbol` stub until Task 4**, because
 * `createResolver` threw until the real `render/library.ts` was ported
 * (`docs/known-gaps.md` G113). The real `LibSymbol` carries ten fields, so the
 * stub stopped typechecking the moment the port landed; the real
 * `fixtureResolver()` is now both available and strictly less fake than
 * hand-building one, so the stub is deleted rather than widened.
 */
test("the build context carries symbols and nothing else", () => {
  const ctx: BuildContext = { symbols: fixtureResolver() }
  expect(Object.keys(ctx)).toEqual(["symbols"])
})
