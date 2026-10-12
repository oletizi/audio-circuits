import { spawnSync } from "node:child_process"
import path from "node:path"
import { boardGeometry } from "./tools/stripboard/copper.ts"
import { occupancyOf } from "./tools/stripboard/seed-geometry.ts"

const BINARY = path.resolve(".tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute")
const board = process.argv[2]
if (board === undefined) throw new Error("usage: scratch-why.ts <board.vrt>")
const run = spawnSync(BINARY, ["--dump-board", board], { encoding: "utf8" })
const text = run.stdout ?? ""
const dump = boardGeometry(text)
console.log("grid", dump.grid)
const occ = occupancyOf(dump)
for (const [ref, rect] of occ) {
  console.log(
    `${ref.padEnd(18)} rows ${rect.row}..${rect.row + rect.rows - 1}  cols ${rect.col}..${rect.col + rect.cols - 1}`,
  )
}
console.log("--- what the model says occupies rows 0..5, cols 0..4 ---")
for (let row = 0; row <= 5; row += 1) {
  const cells: string[] = []
  for (let col = 0; col <= 4; col += 1) {
    const owner = [...occ.entries()].find(
      ([, r]) => row >= r.row && row < r.row + r.rows && col >= r.col && col < r.col + r.cols,
    )
    cells.push((owner?.[0] ?? ".").slice(0, 6).padEnd(7))
  }
  console.log(`row ${row}: ${cells.join("")}`)
}
console.log("--- PART and PAD lines ---")
for (const line of text.split("\n")) {
  if (line.startsWith("PART ") || line.startsWith("PAD ")) console.log(line)
}
