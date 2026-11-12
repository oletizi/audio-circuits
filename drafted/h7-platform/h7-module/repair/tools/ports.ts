/**
 * ONE BLOCK PAGE'S PORTS, as `drawingPages()` gives them: each port's name and the pins it reaches on
 * the page, and whether copperhead drafted it. A port reaching one pin is not in the block's intent
 * (copperhead refuses a one-endpoint net, `tools/draught/drawing-pages.ts`), so this file is where
 * the wiring step (`page.py`, `Wiring`) learns which net such a pin is on. Read from the model, never
 * written by hand; the replay regenerates it and requires it byte-identical to the committed copy.
 *
 * usage: bun ports.ts <block>   -> JSON [{name, pins, drafted}] on stdout
 */
import { drawingPages } from "../../../../../circuits/h7-platform/module-board.ts"

const [block] = process.argv.slice(2)
if (block === undefined) throw new Error("usage: bun ports.ts <block> - a block name is required")
const page = drawingPages().find((p) => p.block === block)
if (page === undefined) {
  throw new Error(`drawingPages() has no page "${block}"; its pages are ${drawingPages().map((p) => p.block).join(", ")}`)
}
const ports = page.ports.map((p) => ({ name: p.name, pins: [...p.pins], drafted: p.drafted }))
process.stdout.write(JSON.stringify(ports, null, 1) + "\n")
