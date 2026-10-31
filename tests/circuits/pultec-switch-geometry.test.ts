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
 * **ONE OF THE "TWO MOVED ARMS" ABOVE WAS ACTUALLY DROPPED, NOT MOVED, AND HAS SINCE BEEN
 * RESTORED BELOW.** The original describe block's "the pole is on the opposite side at angle 0,
 * which is why POLE_PIN is not pin 1" asserted real geometry - `pole.angle === 0`, every throw at
 * `angle === 180` on the opposite side. What first replaced it here was only the brief's Step-1
 * test, bare pin-number containment with no angle and no side - a weaker check wrongly described
 * as a faithful move. `assertPoleOppositeEveryThrow` and the test built on it, further down, carry
 * the original's actual assertions forward (generalised over the whole table, with a swap control)
 * rather than a paraphrase of them.
 *
 * **THE OTHER TWO ARMS OF THAT DESCRIBE BLOCK MOVED TOO, ONE LEVEL LATER.** A first pass of this
 * file left them in `nc-pins.test.ts` because the disk-backed helper exposed only pin NUMBERS -
 * not a pin's name, electrical type or `(at x y angle)`. That was the same hole Task 1's dropped
 * `tests/schgen/ir/mechanical-pins.test.ts` arm had hit from the other side (a geometric
 * stroke-endpoint check with no installed-library home), so rather than leaving two orphaned arms
 * for whatever later task deletes the generator to rediscover, `tests/kicad/symbol-library-disk.ts`
 * was widened: `installedSymbolPins` now returns each pin's number, name, type, position, angle
 * and drawn leg length, and `installedSymbolStrokeEndpoints` answers how many of a symbol's OTHER
 * strokes end at a given pin's body-side connection point - the geometric fact that tells a
 * mounting lug from an electrical pin typed `passive` just like it. Both are built on
 * `lib/kicad/symbol-library.ts`'s own `symbolPins`/`symbolStrokeSegments`/`strokeEndpointsAt`,
 * widened in place rather than re-parsed: see that module's header for why the stroke geometry
 * stays scoped to endpoints only and never grows into a second copy of
 * `lib/schgen/render/lib-graphics.ts`.
 */
import { expect, test } from "bun:test"
import { POLE_PIN, THROW_PINS } from "../../circuits/pultec/physical/parts.ts"
import {
  installedSymbolPinNumbers, installedSymbolPins, installedSymbolStrokeEndpoints,
} from "../kicad/symbol-library-disk.ts"
import { symbolPins } from "../../lib/kicad/symbol-library.ts"
import { MECHANICAL_PINS } from "../../lib/kicad/sheet-agreement.ts"

/** `SW_Rotary_1x12` draws one more throw (12) than any Pultec circuit wires (11), so it is the
 * one symbol in this repository with an unused electrical pin to tell apart from a mount lug. */
const ELEVEN_THROW = "Switch:SW_Rotary_1x12"

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

/**
 * **RESTORED: the angle/side assertion the first pass of this file dropped while describing it as
 * moved.** The original `nc-pins.test.ts` arm - "the pole is on the opposite side at angle 0,
 * which is why POLE_PIN is not pin 1" - asserted real geometry (`pole.angle === 0`, every throw at
 * `angle === 180` on the opposite side from the pole). What took its place for a time was only the
 * brief's Step-1 test above, bare pin-number membership with no angle and no side - which an
 * exact-pin-set comparison cannot make up for: swap which number is recorded as the pole and which
 * is folded into the throws, and the UNION `POLE_PIN ∪ THROW_PINS ∪ {mount lug}` is unchanged, so
 * every surviving test at the time still passed. A pole/throw swap is a real wiring error in a
 * real switch, and this is the one check that catches it. Generalised over the whole `POLE_PIN`
 * table rather than pinned to `Switch:SW_Rotary_1x12` the way the original was (the original had
 * no reason to run on `Switch:SW_Rotary_1x6_MP` too; this one does, which is why "throw" is taken
 * from `THROW_PINS[libId]` and not "every pin but the pole" - the latter would wrongly also demand
 * `Switch:SW_Rotary_1x6_MP`'s `MP` mounting lug sit at angle 180 opposite the pole, which it does
 * not: `MP` is drawn on the SAME side as the pole, at angle 0).
 */
function assertPoleOppositeEveryThrow(libId: string, poleNumber: string, throwNumbers: readonly string[]): void {
  const pins = installedSymbolPins(libId)
  const pole = pins.find((p) => p.number === poleNumber)
  if (pole === undefined) throw new Error(`${libId} has no pin ${poleNumber}; the containment test above asserts it does`)
  expect(pole.angle, `${libId} pole pin ${poleNumber} is not drawn at angle 0`).toBe(0)
  for (const number of throwNumbers) {
    const throwPin = pins.find((p) => p.number === number)
    if (throwPin === undefined) throw new Error(`${libId} has no pin ${number}; THROW_PINS claims it does`)
    expect(throwPin.angle, `${libId} throw pin ${number} is not drawn at angle 180`).toBe(180)
    expect(Math.sign(throwPin.x), `${libId} throw pin ${number} is not on the opposite side from the pole`).toBe(-Math.sign(pole.x))
  }
}

test("every recorded pole is on the opposite side, at angle 0, from every one of its recorded throws", () => {
  const entries = Object.entries(POLE_PIN)
  expect(entries.length, "an empty table would make the loop below vacuous").toBeGreaterThan(0)
  for (const [libId, pole] of entries) {
    assertPoleOppositeEveryThrow(libId, pole, THROW_PINS[libId] ?? [])
  }
})

test("CONTROL: swapping which pin is recorded as the pole fails the angle-and-side check, although it would not change the exact-pin-set check above", () => {
  // Pretend SW_Rotary_1x12's first throw (pin "1", angle 180, drawn opposite the pole) is the
  // pole, and its real pole (pin "13", angle 0) is folded into the throws instead. The set of
  // pin numbers claimed is identical either way - {1..13} - which is exactly why the exact-set
  // test above cannot catch this corruption and this one must.
  const libId = "Switch:SW_Rotary_1x12"
  const realPole = POLE_PIN[libId]
  const realThrows = THROW_PINS[libId]
  if (realPole === undefined || realThrows === undefined) {
    throw new Error(`fixture needs POLE_PIN and THROW_PINS to both have an entry for ${libId}`)
  }
  const [swappedPole, ...restOfThrows] = realThrows
  if (swappedPole === undefined) throw new Error(`${libId} has no throws to swap with its pole`)
  const swappedThrows = [realPole, ...restOfThrows]
  expect(() => assertPoleOppositeEveryThrow(libId, swappedPole, swappedThrows)).toThrow()
})

/*
 * THE TWO ARMS CARRIED OVER FROM `tests/schgen/nc-pins.test.ts`'s "the selector symbols, read off
 * the INSTALLED Switch.kicad_sym" - ported assertion for assertion, not re-derived, now that the
 * widened disk-backed helper can express a pin's name/type/geometry and not only its number.
 */

test("SW_Rotary_1x12 has thirteen pins: twelve throws and a pole, every one passive and named with its own number", () => {
  const pins = installedSymbolPins(ELEVEN_THROW)
  expect(pins.map((p) => p.number).sort((a, b) => Number(a) - Number(b))).toEqual([
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
  ])
  for (const p of pins) {
    expect(p.type, `pin ${p.number} is not passive`).toBe("passive")
    expect(p.name, `pin ${p.number} is not named with its own number`).toBe(p.number)
  }
})

test("pin 12 is a THROW and nothing like a mounting lug: passive, on the throw side, at the throws' own pitch, reached by a stroke", () => {
  const pins = installedSymbolPins(ELEVEN_THROW)
  const at = (number: string): { readonly x: number; readonly y: number; readonly angle: number; readonly type: string } => {
    const pin = pins.find((p) => p.number === number)
    if (pin === undefined) throw new Error(`SW_Rotary_1x12 has no pin ${number}; the arm above asserts it does`)
    return pin
  }
  // Same side, same angle, and the SAME STEP the wired throws are drawn at - compared against the
  // 10-to-11 step rather than against a figure, so the arm does not restate the library's
  // coordinate unit. That is the whole argument against MECHANICAL_PINS: this pin is
  // indistinguishable from the eleven the circuit uses, so an entry in that table would exempt a
  // genuinely electrical pin.
  expect(at("12").x).toBe(at("11").x)
  expect(at("12").angle).toBe(at("11").angle)
  // toBeCloseTo, not toBe: lib/kicad/symbol-library.ts reads these as plain mm floats off the
  // text (unlike the generator's resolver, which this arm originally read through, and which
  // canonicalises every coordinate onto a whole-µm integer grid before subtracting). The two
  // sides differ only at ~1e-15, ordinary float noise from the library's own decimal literals,
  // twelve decimal places inside the 0.01mm the library itself is written to.
  expect(at("11").y - at("12").y).toBeCloseTo(at("10").y - at("11").y, 10)
  expect(at("12").type).toBe("passive")
  // And the symbol has NO mechanical pin at all, so there was never a table entry to reuse.
  expect(Object.hasOwn(MECHANICAL_PINS, ELEVEN_THROW)).toBe(false)
  expect(pins.filter((p) => p.name === "").map((p) => p.number)).toEqual([])
  // THE GEOMETRIC FACT THE ORIGINAL ARM COULD ONLY ARGUE AROUND, NOW MEASURED: pin 12 is reached
  // by exactly one stroke endpoint, the same as every wired throw - which is what actually
  // distinguishes an electrical pin from a mount lug typed `passive` just like it (see MP on
  // SW_Rotary_1x6_MP below).
  expect(installedSymbolStrokeEndpoints(ELEVEN_THROW, "12")).toBe(1)
  expect(installedSymbolStrokeEndpoints(ELEVEN_THROW, "11")).toBe(1)
})

/*
 * POSITIVE CONTROLS for the two arms just above.
 */

test("CONTROL: a synthetic pin typed power_in and named VCC fails both the passive and the name-equals-number claim", () => {
  // Built inline rather than pulled from the installed library, because every real pin this
  // repository reads off Switch.kicad_sym IS passive with a number-shaped name - there is no
  // installed counter-example to point at. `symbolPins` (the primitive `installedSymbolPins`
  // widens) is exercised directly, proving the two assertions above are checking something that
  // CAN be false rather than restating a tautology true of every SymbolPin.
  const block = [
    '(symbol "Counterexample"',
    '\t(symbol "Counterexample_0_1")',
    '\t(symbol "Counterexample_1_1"',
    '\t\t(pin power_in line (at 0 0 0) (length 1.27) (name "VCC") (number "1"))',
    "\t)",
    ")",
  ].join("\n")
  const [pin] = symbolPins(block)
  if (pin === undefined) throw new Error("the fixture has no pin; the test above is vacuous")
  expect(pin.type).not.toBe("passive")
  expect(pin.name).not.toBe(pin.number)
})

test("CONTROL: the mount lug MP on SW_Rotary_1x6_MP has zero stroke endpoints, unlike every electrical pin on it - so installedSymbolStrokeEndpoints distinguishes rather than always answering 1", () => {
  const sixPosition = "Switch:SW_Rotary_1x6_MP"
  expect(installedSymbolStrokeEndpoints(sixPosition, "MP")).toBe(0)
  for (const number of ["1", "2", "3", "4", "5", "6", "7"]) {
    expect(installedSymbolStrokeEndpoints(sixPosition, number), `pin ${number}`).toBe(1)
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
