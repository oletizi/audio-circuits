import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { boundsOf, holeName, parseBoardDump, usableDirection } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * A small dump shaped like the pinned fork's `--dump-board` output (see
 * `.tools/veroroute-perfboard/Src/Headless_dump.cpp` and
 * `Headless_dump_pins.cpp` for the grammar, and
 * `.superpowers/sdd/2026-09-29-build-guide/staged-dump.txt` for a real one):
 * one resistor, one stretched electrolytic (its two leads land four columns
 * apart although its SPAN, the body's own footprint width, is 3 - SPAN is
 * never a lead span), one floating (unplaced) resistor, one placed wire, two
 * cuts and one solder bridge.
 */
const DUMP = [
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3",
  "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
  "NODE 1 NAME VCC R1.1 C1.1",
  "NODE 2 NAME GND R1.2 C1.2 R2.1",
  "NET_NAMES 2",
  "PIN_NAME_TABLES 0",
  "ROUTING_ENABLED 0",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "CUT 2,3,1 2,4,9",
  "CUT 5,5,1 5,6,9",
  "SOLDER 2,4 3,4",
  "DIAGS_MODE OFF",
  "WIRE W1 AT 8,8 ENDS 8,8,2,2 10,8,2,2",
  "GRID 20 30",
  "PIN R1 1 AT 2,3",
  "PIN R1 2 AT 2,4",
  "PIN C1 1 AT 5,5",
  "PIN C1 2 AT 5,9",
  "",
].join("\n")

test("GRID is parsed as the board size in holes", () => {
  expect(parseBoardDump(DUMP).grid).toEqual({ rows: 20, cols: 30 })
})

test("VERTICAL_STRIPS is parsed as a boolean", () => {
  expect(parseBoardDump(DUMP).verticalStrips).toBe(false)
  const vertical = DUMP.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 1")
  expect(parseBoardDump(vertical).verticalStrips).toBe(true)
})

test("every PART line is parsed, placed and floating alike, with SPAN kept but not used for position", () => {
  const parts = parseBoardDump(DUMP).parts
  // `direction: undefined` ON A PLACED PART IS THE POINT OF THIS DUMP, not an
  // omission in it. DUMP is shaped like a capture taken BEFORE the DIRECTION
  // field existed, which is what every committed .dump fixture here is, and the
  // reader records the absence rather than refusing it - see the module comment
  // and docs/stripboard/pipeline-verification.md section 2.6.
  expect(parts).toEqual([
    {
      ref: "R1",
      type: "RESISTOR",
      value: "10K",
      placement: { row: 2, col: 3 },
      span: 1,
      direction: undefined,
    },
    {
      ref: "C1",
      type: "CAP_ELECTRO_200",
      value: "10uF",
      placement: { row: 5, col: 5 },
      span: 3,
      direction: undefined,
    },
    {
      ref: "R2",
      type: "RESISTOR",
      value: "4K7",
      placement: "floating",
      span: 1,
      direction: undefined,
    },
  ])
})

test("PIN lines are parsed by ref, and a stretched part's leads land where PIN says, not where SPAN implies", () => {
  const pins = parseBoardDump(DUMP).pins
  expect(pins["R1"]).toEqual([
    { pin: "1", row: 2, col: 3 },
    { pin: "2", row: 2, col: 4 },
  ])
  // C1's SPAN is 3 (its body footprint), but its leads are 4 columns apart -
  // the stretched-lead case the design calls out. Positions come only from PIN.
  expect(pins["C1"]).toEqual([
    { pin: "1", row: 5, col: 5 },
    { pin: "2", row: 5, col: 9 },
  ])
  // R2 is floating: it prints no PIN lines at all.
  expect(pins["R2"]).toBeUndefined()
})

test("WIRE lines are parsed by name with both ends as row/col pairs", () => {
  expect(parseBoardDump(DUMP).wires).toEqual([
    { name: "W1", ends: [{ row: 8, col: 8 }, { row: 10, col: 8 }] },
  ])
})

test("NODE lines are parsed into an id -> name map", () => {
  expect(parseBoardDump(DUMP).nodes).toEqual({ "1": "VCC", "2": "GND" })
})

test("CUT_STATE is parsed verbatim", () => {
  expect(parseBoardDump(DUMP).cutState).toBe("COMPUTED")
})

test("CUT lines are parsed as two noded hole positions each", () => {
  expect(parseBoardDump(DUMP).cuts).toEqual([
    { a: { row: 2, col: 3, nodeId: "1" }, b: { row: 2, col: 4, nodeId: "9" } },
    { a: { row: 5, col: 5, nodeId: "1" }, b: { row: 5, col: 6, nodeId: "9" } },
  ])
})

test("SOLDER lines are parsed as bridges: two hole positions, no node ids (the dump names none)", () => {
  expect(parseBoardDump(DUMP).bridges).toEqual([{ a: { row: 2, col: 4 }, b: { row: 3, col: 4 } }])
})

test("a dump lacking GRID while a part is placed refuses, naming the line and the fix", () => {
  const noGrid = DUMP.split("\n")
    .filter((line) => !line.startsWith("GRID "))
    .join("\n")
  expect(() => parseBoardDump(noGrid)).toThrow(/GRID/)
  expect(() => parseBoardDump(noGrid)).toThrow(/pinned/)
})

test("a dump lacking PIN lines while a part is placed refuses, naming the line and the fix", () => {
  const noPins = DUMP.split("\n")
    .filter((line) => !line.startsWith("PIN "))
    .join("\n")
  expect(() => parseBoardDump(noPins)).toThrow(/PIN/)
  expect(() => parseBoardDump(noPins)).toThrow(/pinned/)
})

test("a dump with every part floating needs no PIN lines (GRID, VERTICAL_STRIPS and CUT_STATE are always required)", () => {
  const allFloating = [
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
    "NODE 1 NAME GND R2.1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE NOT_APPLICABLE",
    "GRID 10 10",
    "",
  ].join("\n")
  const dump = parseBoardDump(allFloating)
  expect(dump.grid).toEqual({ rows: 10, cols: 10 })
  expect(dump.pins).toEqual({})
})

test("GRID, VERTICAL_STRIPS and CUT_STATE are always required, even on an all-floating board", () => {
  const base = [
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE NOT_APPLICABLE",
    "GRID 10 10",
    "",
  ]
  const without = (keyword: string): string =>
    base.filter((line) => !line.startsWith(`${keyword} `)).join("\n")
  expect(() => parseBoardDump(without("GRID"))).toThrow(/GRID/)
  expect(() => parseBoardDump(without("VERTICAL_STRIPS"))).toThrow(/VERTICAL_STRIPS/)
  expect(() => parseBoardDump(without("CUT_STATE"))).toThrow(/CUT_STATE/)
})

test("a FLOATING wire's `ENDS - -` refuses, naming the wire, rather than parsing as a placed wire", () => {
  // The pinned fork prints `WIRE <name> FLOATING ENDS - -` for an unplaced
  // wire (Src/Headless_dump_wires.cpp: "a FLOATING wire prints ENDS - -", and
  // the two dashes keep the field count the same for a consumer that splits on
  // spaces). parseWireEnd refuses those dashes instead of inventing a hole.
  //
  // THIS TEST WAS ADDED BY TASK 3's REVIEW, and the refusal it pins is older
  // than this file's coverage of it. HC8's copper reconstruction
  // (tools/stripboard/copper.ts) carries NO branch for a floating wire, on the
  // ground that none can reach it - so this refusal is what makes that claim
  // true, and it was load-bearing and untested. tests/stripboard/copper.test.ts
  // asserts the same fact from HC8's side.
  //
  // MUTATION RUN: deleting parseWireEnd's `if (end === "-")` clause so the
  // dashes fall through to the regex. Observed 2 fail - this test and the
  // copper.test.ts one - with:
  //   error: expect(received).toThrow(expected)
  //   Expected pattern: /is floating/
  //   Received message: "unreadable WIRE end \"-\" on WIRE W2: \"WIRE W2
  //   FLOATING ENDS - -\""
  // Still a refusal, but one that reads as a grammar fault rather than as an
  // unplaced wire, and the wording a reader would act on differently.
  // Reverted.
  const floatingWire = `${DUMP}WIRE W2 FLOATING ENDS - -\n`
  expect(() => parseBoardDump(floatingWire)).toThrow(/W2/)
  expect(() => parseBoardDump(floatingWire)).toThrow(/is floating/)
  expect(() => parseBoardDump(floatingWire)).toThrow(/no hole positions/)
})

/**
 * `BOUNDS` and `DIRECTION`, the two fields Task 7 (M1.1) added to the fork's
 * grammar and this parser now reads.
 *
 * THE RULE THEY ARE TESTED AGAINST IS NOT THIS FILE'S AND NOT THE PARSER'S:
 * `docs/stripboard/pipeline-verification.md` section 2.6 states it - both
 * fields optional, including `DIRECTION` on a PLACED part, with the refusal
 * owned by the consumer that acts on the value, the `FLOATING`-plus-direction
 * contradiction still refused, and `UNKNOWN` received rather than normalised.
 *
 * ONE REAL CAPTURE IS GRADED BESIDE THE HAND-WRITTEN TEXT, and it is the
 * frozen floated-part fixture's own `.vrt`, because hand-written dump text can
 * only ever agree with what this file believes the grammar to be. The measured
 * figures are in that test.
 */
const PLACED_WITH_DIRECTION = DUMP.replace(
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1 DIRECTION W",
)

test("BOUNDS is parsed as an inclusive rect, and its absence is not an error", () => {
  // DUMP carries no BOUNDS line - it is shaped like a pre-BOUNDS capture - and
  // that reads as `undefined` rather than refusing, because every committed
  // .dump fixture here is such a capture and two of them are frozen evidence.
  expect(parseBoardDump(DUMP).bounds).toBeUndefined()
  const withBounds = `${DUMP}BOUNDS 3,3 10,28\n`
  expect(parseBoardDump(withBounds).bounds).toEqual({
    minRow: 3,
    minCol: 3,
    maxRow: 10,
    maxCol: 28,
  })
})

test('"BOUNDS - -" is the empty board and reads as no rect, never as a one-hole board', () => {
  // GetBounds returns false for a board with nothing on it and leaves its
  // wrong-ended sentinels behind; the dump spells that case with two dashes.
  // Parsing them as a rect, or normalising the sentinels, would make the
  // emptiest possible board read as the smallest possible occupied one.
  expect(parseBoardDump(`${DUMP}BOUNDS - -\n`).bounds).toBeUndefined()
})

test("a BOUNDS line that is present and unreadable refuses, which an absent one does not", () => {
  // The discriminating pair: absence is an old capture, and a malformed line is
  // the grammar moving. Reading the second as the first would make a grammar
  // change look like a file nobody may regenerate.
  expect(() => parseBoardDump(`${DUMP}BOUNDS 3,3\n`)).toThrow(/BOUNDS/)
  expect(() => parseBoardDump(`${DUMP}BOUNDS 3,3 10\n`)).toThrow(/BOUNDS/)
  expect(() => parseBoardDump(`${DUMP}BOUNDS 10,28 3,3\n`)).toThrow(/maximum is below its minimum/)
})

test("DIRECTION is parsed on a placed part, and UNKNOWN is received rather than normalised to W", () => {
  const placed = parseBoardDump(PLACED_WITH_DIRECTION).parts.find((part) => part.ref === "R1")
  expect(placed?.direction).toBe("W")
  for (const value of ["E", "N", "S", "UNKNOWN"] as const) {
    const text = PLACED_WITH_DIRECTION.replace("DIRECTION W", `DIRECTION ${value}`)
    const part = parseBoardDump(text).parts.find((entry) => entry.ref === "R1")
    expect(part?.direction, value).toBe(value)
  }
})

test("a sixth DIRECTION token refuses by name rather than being read as W", () => {
  const sixth = PLACED_WITH_DIRECTION.replace("DIRECTION W", "DIRECTION X")
  expect(() => parseBoardDump(sixth)).toThrow(/DIRECTION value "X"/)
  expect(() => parseBoardDump(sixth)).toThrow(/not read as W/)
})

test("a FLOATING part carrying a DIRECTION refuses - the one contradiction the reader owns", () => {
  // A floating component prints no DIRECTION field, exactly as it prints no PIN
  // line, so the two fields on this line disagree about whether the part is on
  // the board. Every OTHER direction fault - absent, UNKNOWN - is handed to the
  // consumer, because there is a value to hand over; here there is not.
  const contradiction = DUMP.replace(
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1 DIRECTION N",
  )
  expect(() => parseBoardDump(contradiction)).toThrow(/R2 is FLOATING and carries DIRECTION N/)
})

test("a field after SPAN that is not DIRECTION refuses, so a new field cannot be read as none", () => {
  const stray = PLACED_WITH_DIRECTION.replace("DIRECTION W", "ROTATION 90")
  expect(() => parseBoardDump(stray)).toThrow(/DIRECTION <W\|E\|N\|S\|UNKNOWN>/)
})

test("boundsOf refuses by name, naming BOUNDS, rather than substituting the hole extent", () => {
  // THE SUBSTITUTION THIS REFUSAL EXISTS TO PREVENT: the extent of the holes the
  // dump enumerates is a LOWER bound on physical extent, because a body
  // overhangs its leads, so standing it in for BOUNDS would silently loosen
  // whatever asked - a board graded as fitting the stock that does not.
  const noBounds = parseBoardDump(DUMP)
  expect(() => boundsOf(noBounds, "HC6")).toThrow(/BOUNDS/)
  expect(() => boundsOf(noBounds, "HC6")).toThrow(/HC6/)
  expect(() => boundsOf(noBounds, "HC6")).toThrow(/NOT defaulted/)
  // And it returns the rect when there is one, so the refusal is not the only
  // behaviour the name covers.
  expect(boundsOf(parseBoardDump(`${DUMP}BOUNDS 1,2 3,4\n`), "HC6")).toEqual({
    minRow: 1,
    minCol: 2,
    maxRow: 3,
    maxCol: 4,
  })
})

test("usableDirection separates the absent field from UNKNOWN, because the fixes differ", () => {
  const absent = parseBoardDump(DUMP).parts.find((part) => part.ref === "R1")
  if (absent === undefined) throw new Error("unreachable: DUMP declares R1")
  expect(() => usableDirection(absent, "HC10")).toThrow(/carries no such field/)
  expect(() => usableDirection(absent, "HC10")).toThrow(/HC10/)

  const unknownText = PLACED_WITH_DIRECTION.replace("DIRECTION W", "DIRECTION UNKNOWN")
  const unknown = parseBoardDump(unknownText).parts.find((part) => part.ref === "R1")
  if (unknown === undefined) throw new Error("unreachable: the replacement keeps R1")
  expect(() => usableDirection(unknown, "HC10")).toThrow(/reports UNKNOWN/)
  expect(() => usableDirection(unknown, "HC10")).toThrow(/NOT read as W/)

  const known = parseBoardDump(PLACED_WITH_DIRECTION).parts.find((part) => part.ref === "R1")
  if (known === undefined) throw new Error("unreachable: the replacement keeps R1")
  expect(usableDirection(known, "HC10")).toBe("W")
})

test("the pinned binary's own dump of a committed board parses, with the figures it reports", () => {
  // HAND-WRITTEN DUMP TEXT CAN ONLY AGREE WITH WHAT THIS FILE BELIEVES THE
  // GRAMMAR IS. This one grades the parser against the binary veroroute.pin
  // names, on the frozen floated-part fixture's own .vrt - a committed input
  // that is not regenerated, re-rendered here rather than re-captured.
  //
  // THE FIGURES ARE THE BINARY'S, READ OFF ITS OUTPUT AND WRITTEN DOWN, not
  // recomputed from the dump this test just parsed: BOUNDS 3,3 10,28 (which is
  // also the figure docs/stripboard/pipeline-verification.md section 2.1
  // records for pultec-low-boost, the board this fixture was floated from),
  // seven placed parts each carrying a DIRECTION, and C19 floating with none.
  // It fails rather than skips when the binary is absent: a skipped check that
  // looks like a passing one is the failure mode this suite exists to prevent.
  const vrt = path.join(import.meta.dir, "..", "fixtures", "pultec-low-boost-c19-floated.vrt")
  const binary = verorouteBinary(process.env, moduleRepoRoot())
  const run = spawnSync(binary, ["--dump-board", vrt], { encoding: "utf8" })
  if (run.status !== 0) {
    throw new Error(`veroroute --dump-board exited ${String(run.status)}: ${run.stderr ?? ""}`)
  }
  const dump = parseBoardDump(run.stdout)

  expect(dump.bounds).toEqual({ minRow: 3, minCol: 3, maxRow: 10, maxCol: 28 })

  const floated = dump.parts.filter((part) => part.placement === "floating")
  expect(floated.map((part) => part.ref)).toEqual(["C19"])
  expect(floated[0]?.direction).toBeUndefined()

  const placed = dump.parts.filter((part) => part.placement !== "floating")
  expect(placed).toHaveLength(7)
  // Every placed part carries one of the four real directions - UNKNOWN would
  // pass a bare `!== undefined` and is excluded by name.
  for (const part of placed) {
    expect(usableDirection(part, "this test"), part.ref).toMatch(/^[WENS]$/)
  }
})

test("holeName gives lettered rows and numbered columns: 0 -> A, 25 -> Z, 26 -> AA", () => {
  expect(holeName(0, 0)).toBe("A1")
  expect(holeName(25, 0)).toBe("Z1")
  expect(holeName(26, 0)).toBe("AA1")
  expect(holeName(0, 11)).toBe("A12")
})
