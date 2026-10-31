/**
 * `POLE_PIN` and `THROW_PINS`, checked against the INSTALLED `Switch.kicad_sym` - the permanent
 * home for the two library-verification arms `tests/schgen/nc-pins.test.ts` used to carry under
 * "the selector symbols, read off the INSTALLED Switch.kicad_sym".
 *
 * **WHY THEY MOVED RATHER THAN STAYING THERE.** `circuits/pultec/schematic/section-board.ts`
 * declared `POLE_PIN` and `THROW_PINS` only to feed the schematic generator (`lib/schgen/`), which
 * is being removed; the two constants are facts about the rotary switch parts themselves, not
 * layout intent, so they moved to `circuits/pultec/physical/parts.ts` beside
 * `ROTARY_SYMBOLS_BY_POSITIONS`. The arms that checked them against the installed library had to
 * move with them, because `nc-pins.test.ts` and the generator infrastructure it still exercises
 * (`lib/schgen/ir/mechanical-pins.ts`'s `mechanicalPinsOf`, `lib/schgen/render/stock-symbols.ts`'s
 * `symbolLibraries`) are deleted along with the generator in a later task.
 *
 * **IT READS THE INSTALLED LIBRARY THROUGH `tests/kicad/symbol-library-disk.ts`**, which is the
 * disk-backed helper `lib/kicad/sheet-agreement.ts`'s own tests already use for this - not through
 * `lib/kicad/symbol-library.ts` directly, and not through a vendored copy. That helper REFUSES,
 * rather than skipping, when no KiCad is installed (`KICAD_SYMBOLS` names the override), so a
 * green run here never means "nothing was read."
 *
 * **WHAT DID NOT MOVE.** `nc-pins.test.ts` kept two arms from that same describe block - the pin
 * count/type/name check and the "pin 12 is a THROW and nothing like a mounting lug" angle check -
 * because both need a pin's `(at x y angle)` and `type`, which `installedSymbolPinNumbers` does
 * not expose (it answers only "which pin numbers does this symbol have"). Those two arms still
 * depend on the generator's own library resolver and are left for whatever later task removes
 * that resolver to deal with; what this file carries forward is pin EXISTENCE and pin-set
 * COMPLETENESS, which is what `POLE_PIN` and `THROW_PINS` themselves claim.
 */
import { expect, test } from "bun:test"
import { POLE_PIN, THROW_PINS } from "../../circuits/pultec/physical/parts.ts"
import { installedSymbolPinNumbers } from "../kicad/symbol-library-disk.ts"

test("every recorded pole pin is a pin of that symbol in the installed library", () => {
  const libIds = Object.keys(POLE_PIN)
  expect(libIds.length, "an empty table would make the loop below vacuous").toBeGreaterThan(0)
  for (const [libId, pole] of Object.entries(POLE_PIN)) {
    const numbers = installedSymbolPinNumbers(libId)
    expect(numbers).toContain(pole)
  }
})

test("THROW_PINS plus POLE_PIN plus the mount lug is exactly each symbol's pin set", () => {
  const entries = Object.entries(THROW_PINS)
  expect(entries.length, "an empty table would make the loop below vacuous").toBeGreaterThan(0)
  for (const [libId, throws] of entries) {
    const numbers = new Set(installedSymbolPinNumbers(libId))
    const pole = POLE_PIN[libId]
    expect(pole, `${libId} has throw pins recorded and no pole pin`).toBeDefined()
    const claimed = new Set([...throws, pole as string, ...(libId.endsWith("_MP") ? ["MP"] : [])])
    expect(claimed.size, `${libId}: a pin is accounted for twice`).toBe(throws.length + 1 + (libId.endsWith("_MP") ? 1 : 0))
    expect([...claimed].sort()).toEqual([...numbers].sort())
  }
})

/*
 * POSITIVE CONTROLS - a perturbation that makes each check above fail, so a green run here is
 * evidence the checks have teeth rather than a comparison that passes no matter what the tables
 * say.
 */

test("CONTROL: installedSymbolPinNumbers refuses a lib id neither table could ever name correctly", () => {
  // Both tests above are only as good as this lookup actually resolving something: if a typo'd
  // libId made it return an empty list instead of throwing, "every pole pin is a pin of that
  // symbol" and "the set matches exactly" would both pass vacuously on a key nothing can find.
  expect(() => installedSymbolPinNumbers("Switch:SW_Rotary_1xNOT_REAL")).toThrow(
    'is not in',
  )
})

test("CONTROL: a pin set missing one of the symbol's real throws is NOT an exact match", () => {
  // Drops the first throw of each entry and shows the equality check this file relies on would
  // have caught a stale THROW_PINS that lost a pin, rather than passing by coincidence.
  for (const [libId, throws] of Object.entries(THROW_PINS)) {
    const numbers = new Set(installedSymbolPinNumbers(libId))
    const pole = POLE_PIN[libId] as string
    const short = throws.slice(1)
    const claimedShort = new Set([...short, pole, ...(libId.endsWith("_MP") ? ["MP"] : [])])
    expect([...claimedShort].sort()).not.toEqual([...numbers].sort())
  }
})

test("CONTROL: a pole pin claim naming a pin number the symbol does not have is NOT contained", () => {
  for (const libId of Object.keys(POLE_PIN)) {
    const numbers = installedSymbolPinNumbers(libId)
    expect(numbers).not.toContain("not-a-real-pin-number")
  }
})
