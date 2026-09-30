import { test, expect } from "bun:test"
import { parseBoardBom } from "../../tools/bom/board-bom.ts"

const FILE = "boards/staged-board/bom.json"

const VALID_PROTOTYPE = {
  purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
  lines: {
    "resistor 100k 0207": "r_100k_0207",
  },
  extras: [{ part: "transistor_socket_to92", quantity: 6, why: "one per BJT, plus spares" }],
}

test("parseBoardBom accepts a well-formed prototype file", () => {
  const bom = parseBoardBom(VALID_PROTOTYPE, FILE)
  expect(bom.purchasing).toEqual({ mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 })
  expect(bom.lines).toEqual({ "resistor 100k 0207": "r_100k_0207" })
  expect(bom.extras).toEqual([{ part: "transistor_socket_to92", quantity: 6, why: "one per BJT, plus spares", spares: true }])
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

test("parseBoardBom refuses prototype mode without stockQuantity, naming the field", () => {
  expect(() => parseBoardBom({ purchasing: { mode: "prototype", shrinkage: 0.1 }, lines: {}, extras: [] }, FILE)).toThrow(
    /purchasing\.stockQuantity is missing/,
  )
})

test("parseBoardBom refuses a stockQuantity that is not a positive integer", () => {
  const withStock = (stockQuantity: unknown): unknown => ({
    purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity, maxStockUnitPrice: 1, maxStockOverage: 10 }, lines: {}, extras: [],
  })
  expect(() => parseBoardBom(withStock(0), FILE)).toThrow(/purchasing\.stockQuantity \(0\) must be a positive integer/)
  expect(() => parseBoardBom(withStock(2.5), FILE)).toThrow(/purchasing\.stockQuantity/)
  expect(() => parseBoardBom(withStock(-10), FILE)).toThrow(/purchasing\.stockQuantity/)
  expect(() => parseBoardBom(withStock("100"), FILE)).toThrow(/purchasing\.stockQuantity/)
})

test("parseBoardBom refuses stockQuantity in run mode, naming the field", () => {
  expect(() =>
    parseBoardBom({ purchasing: { mode: "run", boards: 5, shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 }, lines: {}, extras: [] }, FILE),
  ).toThrow(/purchasing\.stockQuantity is set, but purchasing\.mode is "run"/)
})

const CAPS = { stockQuantity: 100, maxStockUnitPrice: 0.15, maxStockOverage: 0.5 }

function prototypeWith(fields: Record<string, unknown>): unknown {
  return { purchasing: { mode: "prototype", shrinkage: 0.1, ...fields }, lines: {}, extras: [] }
}

test("parseBoardBom reads the prototype bulk caps", () => {
  expect(parseBoardBom(prototypeWith(CAPS), FILE).purchasing).toEqual({ mode: "prototype", shrinkage: 0.1, ...CAPS })
  expect(parseBoardBom(prototypeWith({ ...CAPS, maxStockOverage: 0 }), FILE).purchasing).toEqual({
    mode: "prototype", shrinkage: 0.1, ...CAPS, maxStockOverage: 0,
  })
})

test("parseBoardBom refuses prototype mode without maxStockUnitPrice or maxStockOverage, naming the field", () => {
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockUnitPrice: undefined }), FILE)).toThrow(
    /purchasing\.maxStockUnitPrice is missing/,
  )
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockOverage: undefined }), FILE)).toThrow(
    /purchasing\.maxStockOverage is missing/,
  )
})

test("parseBoardBom refuses a maxStockUnitPrice that is not positive, and a negative maxStockOverage", () => {
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockUnitPrice: 0 }), FILE)).toThrow(
    /purchasing\.maxStockUnitPrice \(0\) must be a positive number/,
  )
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockUnitPrice: -1 }), FILE)).toThrow(/maxStockUnitPrice/)
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockUnitPrice: "0.15" }), FILE)).toThrow(/maxStockUnitPrice/)
  expect(() => parseBoardBom(prototypeWith({ ...CAPS, maxStockOverage: -0.1 }), FILE)).toThrow(
    /purchasing\.maxStockOverage \(-0\.1\) must be a fraction of at least 0/,
  )
})

test("parseBoardBom refuses each bulk cap in run mode, naming it", () => {
  for (const field of ["maxStockUnitPrice", "maxStockOverage"]) {
    const purchasing = { mode: "run", boards: 5, shrinkage: 0.1, [field]: 0.5 }
    expect(() => parseBoardBom({ purchasing, lines: {}, extras: [] }, FILE)).toThrow(
      new RegExp(`purchasing\\.${field} is set, but purchasing\\.mode is "run"`),
    )
  }
})

test("parseBoardBom throws when an extra's quantity is not positive", () => {
  const withExtra = (quantity: number): unknown => ({
    purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
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
        purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
        lines: {},
        extras: [{ quantity: 1, why: "x" }],
      },
      FILE,
    ),
  ).toThrow(/extras\[0\].part/)
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
        lines: {},
        extras: [{ part: "wire", quantity: 1 }],
      },
      FILE,
    ),
  ).toThrow(/extras\[0\].why/)
})

test("parseBoardBom reads an extra's spares: absent is true, false is kept", () => {
  const bom = parseBoardBom(
    {
      purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
      lines: {},
      extras: [
        { part: "socket", quantity: 3, why: "sockets" },
        { part: "wire_kit", quantity: 1, why: "wire", spares: false },
      ],
    },
    FILE,
  )
  expect(bom.extras.map((extra) => extra.spares)).toEqual([true, false])
})

test("parseBoardBom throws naming the extra and the fix when spares is not a boolean", () => {
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
        lines: {},
        extras: [{ part: "wire_kit", quantity: 1, why: "wire", spares: "no" }],
      },
      FILE,
    ),
  ).toThrow(/bom\.json: extras\[0\]\.spares is a string, not a boolean.*Write false/s)
})

test("parseBoardBom throws when lines is not an object of strings", () => {
  expect(() =>
    parseBoardBom(
      { purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 }, lines: "nope", extras: [] },
      FILE,
    ),
  ).toThrow(/lines is a string, not an object/)
  expect(() =>
    parseBoardBom(
      {
        purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
        lines: { "resistor 100k 0207": 42 },
        extras: [],
      },
      FILE,
    ),
  ).toThrow(/lines\["resistor 100k 0207"\]/)
})
