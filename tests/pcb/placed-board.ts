/**
 * THE AGENT-PRODUCED pt2399-core BOARD, AS A COMMITTED FIXTURE, for the tests
 * whose subject is what this repository's tooling produces.
 *
 * `circuits/pt2399-core/pt2399-core.kicad_pcb` is the OWNER'S file: he adopted
 * the routed candidate on 2026-11-17 to hand-edit it in KiCad. A test that reads
 * it for a byte-level or zone-level property is reading a file a person edits
 * and KiCad reformats on every save, so it will go red on an edit that broke
 * nothing. `../fixtures/pcb/pt2399-core-placed/NOTES.txt` records the eight
 * tests that did exactly that, and what each was really asking about.
 *
 * THE DIVIDING LINE, and it is worth stating because it decides which path a new
 * test should take rather than leaving it to whichever was copied last:
 *
 *   - A test of the TOOLING - "does the placer reproduce the settled geometry",
 *     "does the pour reader measure an unbroken plane correctly" - takes its
 *     subject from HERE. Its input must be fixed, or the test is about whatever
 *     the board happens to be today.
 *
 *   - A test of the DELIVERABLE - "does the board we are sending out meet the
 *     fab standard", "does it still match its schematic", "does it still satisfy
 *     the owner's 2 mm spacing" - takes the LIVE board, and must keep taking it.
 *     Those are the ones that have to fail when a hand edit breaks a rule. They
 *     are the make targets in `make/pcb.mk` plus
 *     `tests/pcb/silkscreen-widths.test.ts`.
 *
 * NOTHING HERE ASSERTS ANYTHING, and the reader opens the file on every call
 * rather than caching it at import time - the same contract
 * `./settled-board.ts` states, and for the same reason.
 * `./placed-board-fixture.test.ts` is what holds the fixture to its provenance.
 */
import fs from "node:fs"
import path from "node:path"

export const PLACED_BOARD = path.resolve(
  import.meta.dir,
  "../fixtures/pcb/pt2399-core-placed/pt2399-core.kicad_pcb",
)

export const placedBoardText = (): string => fs.readFileSync(PLACED_BOARD, "utf8")
