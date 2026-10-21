/**
 * Validation for the two maps a board's circuit module exports beside its
 * circuit: `DESIGNATORS` (component id -> reference designator) and
 * `PIN_NUMBERS` (kind -> canonical pin -> footprint pin number).
 *
 * Its own module, rather than living in check.ts, so every consumer (the check,
 * the build guide, the parts list) can import it without importing the check -
 * and the check can import the parts list without a cycle. The schematic-stub
 * verb was a fourth consumer until Task 19 deleted it (`docs/known-gaps.md`
 * **G248**).
 */
import { isRecord } from "./guards.ts"

/**
 * Where a circuit's exports were read from, for error messages. A PerfboardDeclaration is one,
 * and it is the only shape left: the deleted schematic-stub verb had no declaration file, so it
 * passed its own name as `file` and the module path as `circuitPath` to keep the message from
 * printing the path twice. **That "once, not twice" was the CALLER's choice and not a property of
 * this module** - `[RAN]` the two calls side by side, the message reads
 * `schematic-stub: /abs/x.ts does not export a DESIGNATORS map` with the path once and
 * `/abs/x.ts: /abs/x.ts does not export a DESIGNATORS map` with it twice - so the test that
 * asserted it went with the verb rather than being coverage this module lost
 * (`docs/known-gaps.md` **G248**).
 */
export interface SourceOfExports {
  readonly file: string
  readonly circuitPath: string
}

/**
 * Validate `DESIGNATORS`: every value must be a string designator.
 *
 * The container check alone is not enough - `typeof {} === "object"` is true
 * of `{ delay_ic: 42 }` too - and this module's whole job is to fail loudly, so
 * a numeric or otherwise non-string designator must throw naming the id it
 * came from, not get lowered into a netlist as a wrong value.
 */
export function assertDesignators(
  value: unknown,
  declaration: SourceOfExports,
): Readonly<Record<string, string>> {
  if (!isRecord(value)) {
    throw new Error(`${declaration.file}: ${declaration.circuitPath} does not export a DESIGNATORS map`)
  }
  const designators: Record<string, string> = {}
  for (const [id, designator] of Object.entries(value)) {
    if (typeof designator !== "string") {
      throw new Error(
        `${declaration.file}: DESIGNATORS["${id}"] must be a string designator, got ${typeof designator}`,
      )
    }
    designators[id] = designator
  }
  return designators
}

/** Validate `PIN_NUMBERS`: every entry must be a map of canonical pin -> string pin number. */
export function assertPinNumbers(
  value: unknown,
  declaration: SourceOfExports,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  if (!isRecord(value)) {
    throw new Error(`${declaration.file}: ${declaration.circuitPath} does not export a PIN_NUMBERS map`)
  }
  const pinNumbers: Record<string, Record<string, string>> = {}
  for (const [kind, mapping] of Object.entries(value)) {
    if (!isRecord(mapping)) {
      throw new Error(
        `${declaration.file}: PIN_NUMBERS["${kind}"] must be an object mapping canonical pins to ` +
          `footprint pin numbers, got ${mapping === null ? "null" : typeof mapping}`,
      )
    }
    const pins: Record<string, string> = {}
    for (const [pin, number] of Object.entries(mapping)) {
      if (typeof number !== "string") {
        throw new Error(
          `${declaration.file}: PIN_NUMBERS["${kind}"]["${pin}"] must be a string pin number, got ${typeof number}`,
        )
      }
      pins[pin] = number
    }
    pinNumbers[kind] = pins
  }
  return pinNumbers
}
