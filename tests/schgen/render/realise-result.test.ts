/**
 * `RealiseResult`'s false arm says WHICH KIND of refusal it is, and the four kinds are
 * exhaustive. Task 8, Step 1; hand-written, no pedals source.
 *
 * **WHY A TYPE TEST IS WORTH RUNNING.** Spec §1.3: *"the caller cannot tell 'no template applies
 * to this subgraph' from 'a template applied and failed'"* - and the caller behaves differently on
 * the two, which is what `tests/schgen/render/selection.test.ts` holds. Before Task 8 both arrived
 * as `{ ok: false, reason: string }`, so the distinction did not exist to be got wrong.
 * **A widened type with every site still reporting an undifferentiated string would buy nothing**,
 * which is why the census (`templates/mismatch-census.test.ts`) counts the classified sites rather
 * than trusting that the type is used.
 *
 * **THE `switch` WITH NO `default` IS THE REAL CHECK HERE, AND IT IS A COMPILE-TIME ONE.**
 * `describe` below returns `string`, so if a fifth `Mismatch` kind is added and not handled, the
 * function falls through to `undefined` and `bun run typecheck` fails on this file. A `default`
 * clause would make that silent, so there is none - and deleting one `case` is enough to turn the
 * typecheck red, which is the perturbation that proves it.
 */
import { describe as suite, expect, test } from "bun:test"
import {
  backendRaised, clearanceViolation, describeMismatch, invalidGeometry, notApplicable, type Mismatch,
} from "../../../lib/schgen/render/block-types.ts"

/** The exhaustiveness check: one line per kind, no `default`, return type `string`. */
const describe = (m: Mismatch): string => {
  switch (m.kind) {
    case "not-applicable": return "no template applies"
    case "invalid-geometry": return `template ${m.template} cannot realise ${m.connection}`
    case "clearance": return `${m.constraint} between ${m.obstacles[0]} and ${m.obstacles[1]}`
    case "backend-raised": return `${m.backend} raised on ${m.inputKey}`
  }
}

/** The mismatch of a refusal; throws rather than widening the type, so a bad test fails loudly. */
function mismatchOf(r: ReturnType<typeof notApplicable>): Mismatch {
  if (r.ok) throw new Error("this constructor must produce a refusal, not a layout")
  return r.mismatch
}

suite("a mismatch says which kind it is", () => {
  test("a mismatch says which kind it is, and the four kinds are exhaustive", () => {
    expect(describe(mismatchOf(notApplicable("divider needs exactly one ground rail")))).toBe("no template applies")
    expect(describe(mismatchOf(invalidGeometry("regulator", "U_LDO.2 on VIN", "its end is at x -10.16")))).toBe(
      "template regulator cannot realise U_LDO.2 on VIN",
    )
    expect(describe(mismatchOf(clearanceViolation("B", "overlaps", ["label A at (0, 0)", "body of J_USB#1"], "no rotation")))).toBe(
      "overlaps between label A at (0, 0) and body of J_USB#1",
    )
    expect(describe(mismatchOf(backendRaised("elk", "block B", "java.lang.IllegalStateException")))).toBe("elk raised on block B")
  })

  test("each constructor carries its own fields, and every one of them refuses", () => {
    const na = notApplicable("no parts")
    expect(na.ok).toBe(false)
    expect(mismatchOf(na)).toEqual({ kind: "not-applicable", reason: "no parts" })
    expect(mismatchOf(invalidGeometry("crystal", "HSE_IN", "off line"))).toEqual({
      kind: "invalid-geometry", reason: "off line", template: "crystal", connection: "HSE_IN",
    })
    expect(mismatchOf(clearanceViolation("B", "overlaps", ["a", "b"], "why"))).toEqual({
      kind: "clearance", reason: "why", constraint: "overlaps", obstacles: ["a", "b"], block: "B",
    })
    expect(mismatchOf(backendRaised("template", "block B", "boom"))).toEqual({
      kind: "backend-raised", reason: "boom", backend: "template", inputKey: "block B",
    })
  })

  /**
   * `describeMismatch` is what `realiseBlock` puts in its thrown message, so the structured
   * fields reach a person reading a failure. The REASON comes first and verbatim: the ported
   * template tests match on the reason text as a substring, and nine of them would break if a
   * kind tag were prepended instead of appended.
   */
  test("describeMismatch leads with the reason and then names the structured fields", () => {
    expect(describeMismatch(mismatchOf(notApplicable("no net is common to every part")))).toBe(
      "no net is common to every part [not-applicable]",
    )
    expect(describeMismatch(mismatchOf(invalidGeometry("regulator", "U_LDO.4 on VIN", "pin 4 is on the up side")))).toBe(
      "pin 4 is on the up side [invalid-geometry: template regulator cannot realise U_LDO.4 on VIN]",
    )
    expect(describeMismatch(mismatchOf(clearanceViolation("B", "overlaps", ["x", "y"], "found no rotation")))).toBe(
      "found no rotation [clearance: overlaps between x and y in block B]",
    )
    expect(describeMismatch(mismatchOf(backendRaised("template", "block B/divider", "no body box")))).toBe(
      "no body box [backend-raised: template raised on block B/divider]",
    )
  })
})
