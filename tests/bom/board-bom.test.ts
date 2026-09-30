import { test, expect } from "bun:test"
import { parseBoardBom } from "../../tools/bom/board-bom.ts"

const FILE = "boards/staged-board/bom.json"

const VALID_PROTOTYPE = {
  purchasing: { mode: "prototype", shrinkage: 0.1 },
  lines: {
    "resistor 100k 0207": "r_100k_0207",
  },
  extras: [{ part: "transistor_socket_to92", quantity: 6, why: "one per BJT, plus spares" }],
}

test("parseBoardBom accepts a well-formed prototype file", () => {
  const bom = parseBoardBom(VALID_PROTOTYPE, FILE)
  expect(bom.purchasing).toEqual({ mode: "prototype", shrinkage: 0.1 })
  expect(bom.lines).toEqual({ "resistor 100k 0207": "r_100k_0207" })
  expect(bom.extras).toEqual([{ part: "transistor_socket_to92", quantity: 6, why: "one per BJT, plus spares" }])
})

test("parseBoardBom accepts a well-formed run file with no lines or extras chosen yet", () => {
  const bom = parseBoardBom(
    { purchasing: { mode: "run", boards: 10, shrinkage: 0.1 }, lines: {}, extras: [] },
    FILE,
  )
  expect(bom.purchasing).toEqual({ mode: "run", boards: 10, shrinkage: 0.1 })
  expect(bom.lines).toEqual({})
  expect(bom.extras).toEqual([])
})

test("parseBoardBom throws naming the file and the fix when lines is missing", () => {
  expect(() =>
    parseBoardBom({ purchasing: { mode: "run", boards: 10, shrinkage: 0.1 }, extras: [] }, FILE),
  ).toThrow(/boards\/staged-board\/bom\.json.*missing "lines".*\{\}/s)
})

test("parseBoardBom throws naming the file and the fix when extras is missing", () => {
  expect(() =>
    parseBoardBom({ purchasing: { mode: "run", boards: 10, shrinkage: 0.1 }, lines: {} }, FILE),
  ).toThrow(/boards\/staged-board\/bom\.json.*missing "extras".*\[\]/s)
})

test("parseBoardBom throws when the json is not an object", () => {
  expect(() => parseBoardBom("nope", FILE)).toThrow(/the board bom/)
})

test("parseBoardBom throws naming purchasing when it is missing", () => {
  expect(() => parseBoardBom({}, FILE)).toThrow(/purchasing/)
})

test("parseBoardBom throws when purchasing.mode is unknown", () => {
  expect(() => parseBoardBom({ purchasing: { mode: "bulk", shrinkage: 0.1 } }, FILE)).toThrow(
    /purchasing.mode "bulk" is not "prototype" or "run"/,
  )
})

test("parseBoardBom throws when shrinkage is not greater than 0", () => {
  expect(() => parseBoardBom({ purchasing: { mode: "prototype", shrinkage: 0 } }, FILE)).toThrow(
    /purchasing.shrinkage \(0\) must be greater than 0/,
  )
  expect(() => parseBoardBom({ purchasing: { mode: "prototype", shrinkage: -0.1 } }, FILE)).toThrow(
    /purchasing.shrinkage/,
  )
})

test("parseBoardBom throws when run's boards is not a positive integer", () => {
  expect(() => parseBoardBom({ purchasing: { mode: "run", boards: 0, shrinkage: 0.1 } }, FILE)).toThrow(
    /purchasing.boards \(0\) must be a positive integer/,
  )
  expect(() => parseBoardBom({ purchasing: { mode: "run", boards: 2.5, shrinkage: 0.1 } }, FILE)).toThrow(
    /purchasing.boards/,
  )
  expect(() => parseBoardBom({ purchasing: { mode: "run", boards: -3, shrinkage: 0.1 } }, FILE)).toThrow(
    /purchasing.boards/,
  )
})

test("parseBoardBom throws when an extra's quantity is not positive", () => {
  const withExtra = (quantity: number): unknown => ({
    purchasing: { mode: "prototype", shrinkage: 0.1 },
    lines: {},
    extras: [{ part: "wire", quantity, why: "hookup wire" }],
  })
  expect(() => parseBoardBom(withExtra(0), FILE)).toThrow(/extras\[0\].quantity \(0\) must be a positive number/)
  expect(() => parseBoardBom(withExtra(-1), FILE)).toThrow(/extras\[0\].quantity/)
})

test("parseBoardBom throws naming the field when an extra is missing part or why", () => {
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1 },
        lines: {},
        extras: [{ quantity: 1, why: "x" }],
      },
      FILE,
    ),
  ).toThrow(/extras\[0\].part/)
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1 },
        lines: {},
        extras: [{ part: "wire", quantity: 1 }],
      },
      FILE,
    ),
  ).toThrow(/extras\[0\].why/)
})

test("parseBoardBom throws when lines is not an object of strings", () => {
  expect(() =>
    parseBoardBom(
      { purchasing: { mode: "prototype", shrinkage: 0.1 }, lines: "nope", extras: [] },
      FILE,
    ),
  ).toThrow(/lines is a string, not an object/)
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1 },
        lines: { "resistor 100k 0207": 42 },
        extras: [],
      },
      FILE,
    ),
  ).toThrow(/lines\["resistor 100k 0207"\]/)
})
