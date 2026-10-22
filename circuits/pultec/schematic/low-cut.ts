/**
 * Schematic authoring declaration for `../physical/low-cut.ts`'s `pultecLowCut()`.
 *
 * Four lines, and that is the finding rather than a shortcut: the five Pultec section boards are
 * each one call to `sectionBoard()`, so one assembler derives all five declarations from the
 * board's own partition sources. `./section-board.ts` carries the whole of the reasoning, the
 * designator mapping it has to declare, and why five copies of it would be five copies of one
 * derivation.
 */

import { sectionAuthoring } from "./section-board.ts"
import type { SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

export const PULTEC_LOW_CUT_SCHEMATIC: SchematicAuthoring = sectionAuthoring("low-cut")
