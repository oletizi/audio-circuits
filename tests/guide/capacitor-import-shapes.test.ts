import { test, expect } from "bun:test"
import { FILM_CAPACITOR_IMPORT_STRINGS, FOOTPRINT_IMPORT_STRINGS } from "../../lib/kicad/import-string.ts"
import { parseBoardDump, type Part } from "../../tools/guide/dump.ts"
import { renderLayout, type RenderOptions } from "../../tools/guide/render.ts"
import { bodyFor, type PlacedPin } from "../../tools/guide/part-shapes.ts"

/**
 * Task 1: the renderer recognises what the importer emits.
 *
 * `tools/guide/part-shapes.ts` drew `CAP_FILM` and `CAP_FILM_WIDE` (the bare
 * names `--dump-board` prints), but `lib/kicad/import-string.ts` maps the
 * Pultec rect capacitors to `CAP_FILM2` and `CAP_FILM_WIDE2` (its
 * span-suffixed import string - see `FILM_CAPACITOR_IMPORT_STRINGS`), so a
 * board built from that string hit "no drawing for VeroRoute part type
 * CAP_FILM2" before this file's shape match widened to cover both spellings.
 *
 * `lib/kicad/import-string.ts` is never changed to make this pass: the import
 * string is part of the physical model, and the renderer is a reader of it.
 */

/** A placed, two-lead part's pins, far enough apart to look like a real lead span. */
const TWO_PINS: readonly PlacedPin[] = [
  { pin: { pin: "1", row: 3, col: 9 }, at: { x: 90, y: 30 } },
  { pin: { pin: "2", row: 3, col: 7 }, at: { x: 70, y: 30 } },
]

function filmCapacitorPart(type: string): Part {
  return { ref: "C_TEST", type, value: "1nF", placement: { row: 3, col: 7 }, span: 3, direction: undefined }
}

test("every capacitor type the importer emits has a shape", () => {
  // Derived from the importer's own tables, not typed out here: a renderer
  // that only knew today's two spellings by name would still pass a test
  // that spelled them out, the same way it passed before this file existed.
  const emitted = [...FOOTPRINT_IMPORT_STRINGS.values(), ...FILM_CAPACITOR_IMPORT_STRINGS.values()].filter((type) =>
    type.startsWith("CAP_"),
  )
  // Asserted FIRST: a predicate that can never fire because this list is
  // empty would make the loop below pass vacuously over nothing.
  expect(emitted.length, "the premise: the importer emits capacitor types").toBeGreaterThan(0)
  for (const type of new Set(emitted)) {
    expect(() => bodyFor(filmCapacitorPart(type), TWO_PINS), `type ${type} draws`).not.toThrow()
  }
})

const PULTEC_DUMP = [
  "PART C18 CAP_FILM_WIDE2 .33uF AT 3,8 SPAN 3",
  "PART C19 CAP_FILM2 .22uF AT 3,13 SPAN 1",
  "PART board_terminals BLOCK_200MIL3 Conn_01x03 AT 4,5 SPAN 3",
  "NODE 1 NAME a C18.1 C19.1",
  "NODE 2 NAME b C18.2 C19.2 board_terminals.1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "GRID 10 16",
  "PIN C18 1 AT 5,9",
  "PIN C18 2 AT 3,9",
  "PIN C19 1 AT 5,13",
  "PIN C19 2 AT 3,13",
  "PIN board_terminals 1 AT 4,5",
  "PIN board_terminals 2 AT 4,6",
  "PIN board_terminals 3 AT 4,7",
].join("\n")

test("rendering a board does not change what it exports", () => {
  const dump = parseBoardDump(PULTEC_DUMP)
  const labels = new Map(dump.parts.map((part) => [part.ref, part.ref]))
  const options: RenderOptions = {
    view: "component",
    title: "capacitor import shapes",
    edgeLabels: [],
    pads: [],
    padLabels: new Map(),
    wireLinks: new Set(),
    clusters: undefined,
  }
  const before = structuredClone(dump)

  renderLayout(dump, labels, options)

  // Rendering is a read of the model, not a write: its exported identity,
  // pin mapping and electrical connectivity (nodes) are byte-for-byte what
  // they were before anything was drawn.
  expect(dump).toEqual(before)
})
