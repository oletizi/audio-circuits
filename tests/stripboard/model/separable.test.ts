import { expect, test } from "bun:test"
import { interleavingOn } from "../../../lib/stripboard/separable.ts"

const at = (column: number, net: string, owner: string) => ({ column, net, owner })

test("two nets in one run each are separable, because one cut parts them", () => {
  expect(interleavingOn(3, [at(0, "A", "R1.1"), at(1, "A", "R2.1"), at(4, "B", "R3.1")])).toBeNull()
})

test("a net interleaved with another is NOT separable, and the finding names both", () => {
  const found = interleavingOn(7, [at(0, "A", "R1.1"), at(2, "B", "R2.1"), at(5, "A", "R3.1")])
  expect(found).not.toBeNull()
  expect(found?.strip).toBe(7)
  expect(found?.net).toBe("A")
  expect(found?.columns).toEqual([0, 5])
  expect(found?.between).toBe("B")
})

test("one net alone on a strip is separable however many contacts it has", () => {
  expect(interleavingOn(0, [at(0, "A", "R1.1"), at(9, "A", "R2.1"), at(4, "A", "R3.1")])).toBeNull()
})

test("an empty strip is separable, and the predicate is not vacuous on it", () => {
  expect(interleavingOn(0, [])).toBeNull()
  expect(interleavingOn(0, [at(0, "A", "R1.1")])).toBeNull()
})
