/**
 * **THE LIVE-`kicad-cli` MODEL-VS-SCHEMATIC PROOF FOR THE FIVE `transistor-preamp` BOARDS, MOVED
 * OFF THE STUB WRITER AND ONTO THE COMMITTED SCHEMATIC EACH BOARD ALREADY HAS.**
 *
 * Each of `tests/circuits/transistor-preamp-{lab,buffered,feedback,loop,staged}.test.ts` carries a
 * `"KiCad reads the generated stub as the same circuit"` test that calls
 * `./kicad-round-trip.ts`'s `kicadRoundTrip`: write a FRESH stub from the live model with
 * `lib/kicad/schematic.ts`'s `writeSchematicStub`, export THAT with the real `kicad-cli`, and
 * compare. The stub writer is being deleted, and that test cannot survive it - but these five
 * boards are not `drafted/pultec/`'s boards, with no approved page of their own: each has a real,
 * committed `.kicad_sch` under `circuits/transistor-preamp/`, declared as its own `"sch"` in
 * `boards/<board>/perfboard.json`, re-exported and reconciled against
 * `tests/fixtures/transistor-preamp-<board>.net` by `make/board.mk`'s `netlist-agrees` on every
 * `make check` run. **That mechanism never touched the stub writer** - it reads whatever bytes are
 * already committed - so the sheet these tests need is not going anywhere.
 *
 * This file is what lets `bun test`, standing alone, run `kicad-cli` on that committed sheet and
 * prove it still describes exactly the circuit the model does - the same claim
 * `"the schematic's netlist export describes the same circuit as the model"` makes against the
 * (make-freshened) fixture, except this file does not trust the fixture: it exports fresh, right
 * now, the same posture Task 5's drafted-page test holds for the five Pultec boards.
 *
 * **`./committed-schematic.ts` HOLDS THE BODY**, and its header says why the comparison is
 * `expectSameCircuit` (the VeroRoute lowering through `toImportedNetlist`) and not
 * `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel`: these boards are not off-board parts on
 * an agent-drawn sheet, they are ordinary perfboard designators with a `DESIGNATORS`/`PIN_NUMBERS`
 * map built for exactly the vocabulary `expectSameCircuit` already compares through.
 */
import { expect, test } from "bun:test"
import {
  transistorPreampLab,
  DESIGNATORS as LAB_DESIGNATORS,
  PIN_NUMBERS as LAB_PIN_NUMBERS,
} from "../../circuits/transistor-preamp/index.ts"
import {
  transistorPreampBuffered,
  DESIGNATORS as BUFFERED_DESIGNATORS,
  PIN_NUMBERS as BUFFERED_PIN_NUMBERS,
} from "../../circuits/transistor-preamp/buffered-board.ts"
import {
  transistorPreampFeedback,
  DESIGNATORS as FEEDBACK_DESIGNATORS,
  PIN_NUMBERS as FEEDBACK_PIN_NUMBERS,
} from "../../circuits/transistor-preamp/feedback-board.ts"
import {
  transistorPreampLoop,
  DESIGNATORS as LOOP_DESIGNATORS,
  PIN_NUMBERS as LOOP_PIN_NUMBERS,
} from "../../circuits/transistor-preamp/loop-board.ts"
import {
  transistorPreampStaged,
  DESIGNATORS as STAGED_DESIGNATORS,
  PIN_NUMBERS as STAGED_PIN_NUMBERS,
} from "../../circuits/transistor-preamp/staged-board.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import type { Network } from "../../lib/model/types.ts"
import { withOnePinMoved } from "./drafted-sheet.ts"
import { exportCommittedSheet, expectSameCircuit, type BoardUnderTest } from "./committed-schematic.ts"

interface Board {
  readonly stem: string
  readonly sch: string
  readonly build: () => Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
}

const BOARDS: readonly Board[] = [
  {
    stem: "lab-board",
    sch: "circuits/transistor-preamp/lab-board.kicad_sch",
    build: transistorPreampLab,
    designators: LAB_DESIGNATORS,
    pinNumbers: LAB_PIN_NUMBERS,
  },
  {
    stem: "buffered-board",
    sch: "circuits/transistor-preamp/buffered-board.kicad_sch",
    build: transistorPreampBuffered,
    designators: BUFFERED_DESIGNATORS,
    pinNumbers: BUFFERED_PIN_NUMBERS,
  },
  {
    stem: "feedback-board",
    sch: "circuits/transistor-preamp/feedback-board.kicad_sch",
    build: transistorPreampFeedback,
    designators: FEEDBACK_DESIGNATORS,
    pinNumbers: FEEDBACK_PIN_NUMBERS,
  },
  {
    stem: "loop-board",
    sch: "circuits/transistor-preamp/loop-board.kicad_sch",
    build: transistorPreampLoop,
    designators: LOOP_DESIGNATORS,
    pinNumbers: LOOP_PIN_NUMBERS,
  },
  {
    stem: "staged-board",
    sch: "circuits/transistor-preamp/staged-board.kicad_sch",
    build: transistorPreampStaged,
    designators: STAGED_DESIGNATORS,
    pinNumbers: STAGED_PIN_NUMBERS,
  },
]

for (const { stem, sch, build, designators, pinNumbers } of BOARDS) {
  const board: BoardUnderTest = { network: build(), designators, pinNumbers }

  test(`${stem}: kicad-cli's export of the committed schematic, right now, describes the same circuit as the model`, () => {
    const exported = exportCommittedSheet(sch, stem)
    expectSameCircuit(exported, board)
  }, 30_000)

  test(`${stem}: moving one pin in the fresh export is reported - the control for the agreement above`, () => {
    const exported = exportCommittedSheet(sch, stem)
    const mutated = withOnePinMoved(exported)
    // expectSameCircuit asserts with bun:test's expect, which throws on disagreement rather than
    // returning a verdict - so the control is that comparing against a perturbed export throws.
    // An equality check that cannot be made to fail is the same shape whether it agreed or never
    // looked.
    expect(() => expectSameCircuit(mutated, board)).toThrow()
  }, 30_000)
}
