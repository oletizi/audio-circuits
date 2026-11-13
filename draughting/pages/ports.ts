/**
 * ONE BLOCK PAGE'S PORTS, as the board's `drawingPages()` gives them: each port's name and the pins
 * it reaches on the page, and whether copperhead drafted it. A port reaching one pin is not in the
 * block's intent (copperhead refuses a one-endpoint net, `tools/draught/drawing-pages.ts`), so this
 * file is where the wiring step (`page.py`, `Wiring`) learns which net such a pin is on. Read from
 * the model, never written by hand; a board's replay regenerates it and requires it byte-identical to
 * the committed copy.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun ports.ts <board-dir> <block>   -> JSON [{name, pins, drafted}] on stdout
 */
import { boardFromArgs } from "./board.ts"

const usage = "bun ports.ts <board-dir> <block>"
const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
const [block] = rest
if (block === undefined) throw new Error(`usage: ${usage} - a block name is required`)
const pages = board.drawingPages()
const page = pages.find((p) => p.block === block)
if (page === undefined) {
  throw new Error(`drawingPages() has no page "${block}"; its pages are ${pages.map((p) => p.block).join(", ")}`)
}
const ports = page.ports.map((p) => ({ name: p.name, pins: [...p.pins], drafted: p.drafted }))
process.stdout.write(JSON.stringify(ports, null, 1) + "\n")
