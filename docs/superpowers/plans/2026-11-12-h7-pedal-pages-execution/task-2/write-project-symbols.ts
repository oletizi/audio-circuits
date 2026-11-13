/**
 * Writes the pedal's project symbols into circuits/h7-platform/h7-platform.kicad_sym (h7 pedal pages
 * plan, Task 2). Each is made by `projectSymbolText` in tests/circuits/h7-pedal-project-symbols.ts
 * from an installed stock symbol and the part's data sheet table; tests/circuits/h7-pedal-parts.test.ts
 * regenerates them and fails if the committed library differs. Run from the repository root:
 *
 *   bun docs/superpowers/plans/2026-11-12-h7-pedal-pages-execution/task-2/write-project-symbols.ts
 */
import fs from "node:fs"
import { PROJECT_SYMBOL_LIBRARY } from "../../../../../circuits/h7-platform/parts.ts"
import { PEDAL_PROJECT_SYMBOLS, libraryWithPedalSymbols } from "../../../../../tests/circuits/h7-pedal-project-symbols.ts"

const before = fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")
const after = libraryWithPedalSymbols(before)
fs.writeFileSync(PROJECT_SYMBOL_LIBRARY, after)
console.log(`${PROJECT_SYMBOL_LIBRARY}: ${PEDAL_PROJECT_SYMBOLS.length} pedal symbols; ${before.length} -> ${after.length} bytes`)
