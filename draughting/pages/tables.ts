/**
 * REQUIRE A BOARD'S THREE DECLARED TABLES before any page check reads them, so a board directory
 * missing one is refused at the first step, naming the file and why it is not defaulted
 * (`./table-input.ts`'s `importTable`), rather than halfway through a run.
 *
 * The tables, each in `<board-dir>/repair/tools/`:
 *  - `pwr-flag-homes.ts`: where each shared net's single PWR_FLAG lives (`./flag-homes.ts`);
 *  - `cross-page-drivers.ts`: the signal nets whose driver is on another page (`./cross-page-drivers.ts`);
 *  - `erc-allowances.ts`: the ERC errors a page's verification excuses (`./erc-allowances.ts`).
 *
 * Each is loaded as COMMITTED and its shape checked; no test override is read here and nothing is
 * held to the model here. The tools that read a table hold it to the model on every run, under any
 * override a control sets, so a control's refusal still comes from the step it is about.
 *
 * usage: bun tables.ts <board-dir>     (from the repository root)
 */
import { boardFromArgs } from "./board.ts"
import { committedDriverTable } from "./cross-page-drivers.ts"
import { committedErcAllowances } from "./erc-allowances.ts"
import { flagHomes } from "./flag-homes.ts"

const { board } = await boardFromArgs(process.argv.slice(2), "bun tables.ts <board-dir>")
const homes = await flagHomes(board)
const drivers = await committedDriverTable(board)
const allowances = await committedErcAllowances(board)
console.log(
  `tables.ts: ${board.name}'s declared tables: ${Object.keys(homes.shared).length} shared flag home(s), ` +
    `${drivers.entries.length} cross-page driver(s), ${allowances.length} ERC allowance(s)`,
)
