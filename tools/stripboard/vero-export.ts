/**
 * A `Candidate` handed to the fork to MATERIALIZE: the declarative board-state
 * document, and the one invocation that applies it.
 *
 * **WHY WE DO NOT WRITE THE FILE OURSELVES.** VeroRoute is an independent witness
 * to a board this repository did not write. A `.vrt` emitter here would make us
 * the author of the artifact we are asking it to witness, and its agreement with
 * us would then mean nothing. So this module emits a DESCRIPTION and the fork
 * materializes it - `.tools/veroroute-perfboard/Src/Headless_materialize.h` is
 * that verb's contract, and it is where the refusals live.
 *
 * **AND WHY IT IS NOT A SEQUENCE OF GESTURES EITHER.** The architecture this
 * replaces drove the fork one `--move` at a time: 126,435 subprocess launches per
 * run, and every gesture relative to a board that panned, clamped and renumbered
 * under it. Gesture replay would carry that coordinate drift into the new model.
 * Every hole in the document below is absolute, in the grid the document itself
 * states, and the fork applies none of it until it has read all of it.
 *
 * **WHAT THE DOCUMENT CARRIES.** The stock size, the strip axis, which hole every
 * lead of every part goes through, every off-board terminal's hole, every wire's
 * two ends, and the copper partition as one run per `COPPER` line.
 *
 * **WHAT IT DELIBERATELY DOES NOT CARRY, and this is the half worth stating.**
 *
 *   - **WHICH PART IS FITTED.** No VeroRoute component type, no value, no pin
 *     count, no net membership. All of those come from the BASE board the fork is
 *     pointed at - a board the fork itself built from a netlist - because
 *     choosing a VeroRoute component type for a KiCad footprint is the fork's job
 *     and not ours. The consequence is a constraint on the caller rather than a
 *     hidden default: the base board must carry exactly the components the
 *     candidate places, and the fork refuses the pair when it does not.
 *   - **A CORNER OR A FACING, AND THIS ONE IS A MEASUREMENT RATHER THAN A
 *     PREFERENCE.** `Placement.origin` is the hole the FOOTPRINT'S OWN (0,0)
 *     lands on and `Placement.direction` is one of four turns declared about a
 *     footprint's x and y axes - `lib/stripboard/board.ts` says outright that
 *     which of them a dump's `DIRECTION W` corresponds to "is NOT asserted
 *     here". Measured on `transistor-preamp-feedback`: the fork reports `R2` as
 *     `DIRECTION N` and this model calls the same physical part `S`. A document
 *     carrying either number would state a fact in a vocabulary whose
 *     translation nothing has established, and the first casualty would be a
 *     part turned 180 degrees in silence. **What both sides do agree on is which
 *     hole each lead goes through**, so that is what the document declares, and
 *     the fork solves the corner and the facing from it against its own
 *     footprint - refusing when no turn fits.
 *   - **A FOOTPRINT'S LENGTH.** `Placement` has no span, because a VeroRoute
 *     span is that program's own footprint column count and not a lead span. A
 *     failed solve is where that shows up: no turn of a footprint at the wrong
 *     span puts the declared leads in the declared holes, and the fork's refusal
 *     says so and names the size it has.
 *   - **CUTS.** A cut is not board state in VeroRoute - it is derived from the
 *     paint - so the document declares the paint and the fork derives the cuts
 *     from it afterwards, which is what makes that derivation worth comparing.
 *
 * **THE COPPER PARTITION IS IN THE DOCUMENT BECAUSE OF `AutoFillVero`.** The
 * fork's strip fill re-paints every blank hole on every strip, extending
 * whichever neighbouring run is shorter, and the cut list a board reports is
 * derived from exactly those boundaries - recorded at `./score.ts` and
 * `./cut-necessity.ts`, and visible in the fork's own
 * `Src/Reconcile_cuts.cpp`. A materialization that let it run would hand back
 * AutoFill's layout wearing the optimizer's name. So the runs are declared, the
 * fork paints precisely those, and it never calls the fill.
 *
 * **THE RUNS ARE EMITTED SHORT, AND THAT IS A DECISION WITH A REASON.** Each run
 * is painted only from the first contact on its strip to the last, with the
 * boundary between two runs at the gap `lib/stripboard/cuts.ts` chose - never out
 * to the ends of the strip. Painting the ends would be inventing copper identity
 * the candidate never claimed, and `Board::CalcSolder` derives a solder blob
 * wherever two ADJACENT strips carry one nodeId at one column: an end-to-end
 * paint would therefore manufacture bridges nobody asked for, and `B` is a term
 * in the objective. What a caller must not do is leave a hole unpainted BETWEEN
 * two runs of different nets - the fork reports that as a conflict and the board
 * dumps `CUT_STATE UNRESOLVED` - and the tiling below is exactly what avoids it.
 *
 * **IT IS IN `tools/` AND THAT IS THE BOUNDARY.** `lib/stripboard/` is the core,
 * may not import from `tools/` and may not spawn a subprocess;
 * `tests/stripboard/model/no-fork.test.ts` is the standing guard. This module is
 * on the other side of that line and spawns freely.
 */
import fs from "node:fs"
import path from "node:path"
import type { Candidate, Hole, Placement } from "../../lib/stripboard/board.ts"
import {
  derivedCuts,
  runsOf,
  significantContacts,
  type Cut,
  type ReferenceNets,
  type StripRun,
} from "../../lib/stripboard/cuts.ts"
import type { SpawnVeroroute } from "./seed.ts"
import { OFF_BOARD_TERMINAL } from "./vero-import.ts"

/** Every refusal in this module, in one shape: the key, then what is wrong and why. */
function refuse(key: string, detail: string): never {
  throw new Error(`${key}: ${detail}`)
}

const NOT_GUESSED =
  "It is not guessed and the statement is not dropped: a component the document does not place " +
  "is one the fork floats and never puts back, so a dropped statement is a part in mid-air"

function holeField(hole: Hole): string {
  return `${hole.strip},${hole.column}`
}

/**
 * The strip axis the document declares.
 *
 * **ALWAYS `horizontal`, and that is a property of the model rather than a
 * default.** `Candidate.grid` is `{ strips, columns }` with no axis field, and
 * `tools/stripboard/vero-import.ts` refuses a `VERTICAL_STRIPS 1` dump outright -
 * so a candidate in this model is always a board whose strips run along the rows,
 * and a `vertical` document would describe a board nothing here can build. When
 * the importer learns the transposition this becomes a field; until then writing
 * it as a constant with this comment beside it is the honest spelling.
 */
const STRIP_AXIS = "horizontal"

/** `<ref>.<pin>` as the fork's own grammar spells it, for a placement's pin. */
function pinRef(placement: Placement, pin: string): string {
  return `${placement.ref}.${pin}`
}

/**
 * A pin name the fork will accept as a pin NUMBER, or a refusal naming it.
 *
 * The fork's `PIN` and `PAD` statements carry the schematic's own 1-based pin
 * number, which is what `--dump-board` prints and therefore what the importer
 * read into `Placement.pins`. A key that is not one of those means the pin map
 * came from somewhere else - a footprint's pad name that is not numeric, say -
 * and the fork would refuse the document line by line; refusing here names the
 * placement instead of the line.
 */
function pinNumber(placement: Placement, pin: string): string {
  if (!/^[1-9][0-9]*$/.test(pin)) {
    refuse(
      "vero-export-pin-not-a-number",
      `"${placement.ref}" has a pin named "${pin}", and the fork's layout grammar carries a ` +
        "pin as the schematic's own 1-based NUMBER - which is what --dump-board prints and what " +
        `vero-import.ts read this map from.\nFix whichever built the candidate.\n${NOT_GUESSED}.`,
    )
  }
  return pin
}

/** The one pin of an off-board terminal placement, or a refusal. */
function onlyPin(placement: Placement): readonly [string, Hole] {
  const entries = [...placement.pins]
  const only = entries[0]
  if (entries.length !== 1 || only === undefined) {
    refuse(
      "vero-export-pad-pin-count",
      `the placement for "${placement.ref}" carries the footprint "${OFF_BOARD_TERMINAL}" and ` +
        `${entries.length} pins, and an off-board terminal is ONE hole with one pin - which is ` +
        "what the fork addresses it by, through the provenance its PAD line records.\nFix " +
        `whichever built the candidate.\n${NOT_GUESSED}.`,
    )
  }
  return only
}

/** The `PART`/`PAD` statement for one placement, with its `PIN` statements after it. */
function placementStatements(placement: Placement): readonly string[] {
  if (placement.footprint === OFF_BOARD_TERMINAL) {
    const [pin, hole] = onlyPin(placement)
    return [`PAD ${pinRef(placement, pinNumber(placement, pin))} AT ${holeField(hole)}`]
  }
  const pins = [...placement.pins]
    .map(([pin, hole]): readonly [number, string] => [
      Number(pinNumber(placement, pin)),
      `PIN ${placement.ref} ${pin} AT ${holeField(hole)}`,
    ])
    .sort((a, b) => a[0] - b[0])
    .map(([, line]) => line)
  // NO `AT` AND NO `DIRECTION` - see this module's comment. The leads are the
  // placement, and the fork solves the rest with its own footprint.
  return [`PART ${placement.ref}`, ...pins]
}

/**
 * Net name to the `<ref>.<pin>` the document anchors that net's runs to.
 *
 * **A RUN IS ANCHORED TO A PIN AND NEVER TO A NAME.** The fork paints a run with
 * the nodeId of the pin this field names, because a net NAME is description
 * rather than identity on a VeroRoute board - the fork's own
 * `Headless_dump.cpp` says so, and `vero-import-nets.ts` resolves the same
 * direction by membership for the same reason. A nodeId would be worse again: it
 * is an internal number that changes when a net is retired and reissued.
 *
 * The pin chosen is the lowest `<ref>.<pin>` on that net, so two runs over equal
 * candidates produce equal documents - which a search that compares materialized
 * boards needs.
 */
function anchorsByNet(candidate: Candidate, reference: ReferenceNets): ReadonlyMap<string, string> {
  const byNet = new Map<string, string[]>()
  const netOfPin = new Map<string, string>()
  for (const [net, pins] of reference) for (const pin of pins) netOfPin.set(pin, net)
  for (const placement of candidate.placements) {
    for (const [pin] of placement.pins) {
      const id = pinRef(placement, pin)
      const net = netOfPin.get(id)
      if (net === undefined) continue
      const list = byNet.get(net)
      if (list === undefined) byNet.set(net, [id])
      else list.push(id)
    }
  }
  const out = new Map<string, string>()
  for (const [net, ids] of byNet) {
    const sorted = [...ids].sort()
    const first = sorted[0]
    if (first !== undefined) out.set(net, first)
  }
  return out
}

/** The `COPPER` statement for one run, over the span the tiling gave it. */
function runStatement(
  run: StripRun,
  firstColumn: number,
  lastColumn: number,
  anchors: ReadonlyMap<string, string>,
): string {
  // PREFER A PIN INSIDE THE RUN, which is the same net by construction. It makes
  // the document readable - the anchor is beside the copper it names - and it
  // makes the fork's own check the strongest available: the pin it resolves the
  // nodeId from is one of the pins it then compares every hole in the run
  // against. Falling back to the net's lowest pin is not a guess at the net: it
  // is the same net, reached through a pin somewhere else on the board, and a run
  // whose only contacts are wire ends has no local pin to use.
  const anchor = anchors.get(run.net)
  if (anchor === undefined) {
    refuse(
      "vero-export-run-net-unanchored",
      `the run on strip ${run.strip} carries net "${run.net}", and no component pin on this ` +
        "candidate is on that net - so there is nothing on the board for the fork to read the " +
        "net's identity off.\nFix whichever built the candidate: `significantContacts` refuses " +
        "a wire or a bridge whose net no pin reaches, so a run in this state means the " +
        `reference nets and the candidate disagree.\n${NOT_GUESSED}.`,
    )
  }
  return `COPPER ${run.strip} ${firstColumn} ${lastColumn} NET ${anchor}`
}

/**
 * Every strip's runs tiled into painted spans, with the boundary at each declared
 * cut.
 *
 * The span of run `i` on a strip runs from the previous cut plus one (or from the
 * run's own first contact, for the first run) to the next cut (or to the run's
 * own last contact, for the last). That leaves no unpainted hole between two runs
 * of different nets - which the fork reports as a conflict - and paints nothing
 * beyond the outermost contacts, which is what keeps `CalcSolder` from deriving
 * bridges nobody asked for. See this module's comment.
 */
function copperStatements(
  candidate: Candidate,
  reference: ReferenceNets,
  cuts: readonly Cut[],
): readonly string[] {
  const anchors = anchorsByNet(candidate, reference)
  const runs = runsOf(significantContacts(candidate, reference))
  const byStrip = new Map<number, StripRun[]>()
  for (const run of runs) {
    const list = byStrip.get(run.strip)
    if (list === undefined) byStrip.set(run.strip, [run])
    else list.push(run)
  }
  const cutsByStrip = new Map<number, number[]>()
  for (const cut of cuts) {
    const list = cutsByStrip.get(cut.strip)
    if (list === undefined) cutsByStrip.set(cut.strip, [cut.afterColumn])
    else list.push(cut.afterColumn)
  }
  const out: string[] = []
  for (const strip of [...byStrip.keys()].sort((a, b) => a - b)) {
    // Cannot be undefined: the key came from this map's own key list.
    const onStrip = [...(byStrip.get(strip) ?? [])].sort((a, b) => a.firstColumn - b.firstColumn)
    const boundaries = [...(cutsByStrip.get(strip) ?? [])].sort((a, b) => a - b)
    if (boundaries.length !== onStrip.length - 1) {
      // NOT A DEFENSIVE CHECK: `derivedCuts` makes exactly one cut between each
      // adjacent pair of runs on a strip, so this is the invariant the tiling
      // rests on, and a cut list that came from somewhere else would otherwise
      // produce a document whose runs overlap or leave a gap.
      refuse(
        "vero-export-cuts-do-not-tile",
        `strip ${strip} carries ${onStrip.length} runs of one net each and the cut list handed ` +
          `to this exporter has ${boundaries.length} cuts on it, where tiling that strip needs ` +
          `exactly ${onStrip.length - 1}.\nFix the caller: the cuts a document's COPPER runs are ` +
          "split at must be lib/stripboard/cuts.ts's own derivation over the same candidate.\n" +
          `${NOT_GUESSED}.`,
      )
    }
    for (let index = 0; index < onStrip.length; index += 1) {
      const run = onStrip[index]
      if (run === undefined) continue
      const previous = boundaries[index - 1]
      const next = boundaries[index]
      const firstColumn = index === 0 || previous === undefined ? run.firstColumn : previous + 1
      const lastColumn =
        index === onStrip.length - 1 || next === undefined ? run.lastColumn : next
      out.push(runStatement(run, firstColumn, lastColumn, anchors))
    }
  }
  return out
}

/**
 * The declarative document for one candidate.
 *
 * The statement order is `GRID`, `STRIPS`, the placements in the candidate's own
 * order (each `PART` followed by its own `PIN` statements), the wires in the
 * candidate's own order, then the copper by strip and column. It is declared
 * rather than left to chance so that two runs over equal candidates produce equal
 * text, and so that a reader can walk the document against a `--dump-board`
 * capture in step.
 */
export function layoutDocument(candidate: Candidate, reference: ReferenceNets): string {
  const cuts = derivedCuts(candidate, reference)
  const lines: string[] = [
    `GRID ${candidate.grid.strips} ${candidate.grid.columns}`,
    `STRIPS ${STRIP_AXIS}`,
  ]
  for (const placement of candidate.placements) lines.push(...placementStatements(placement))
  for (const wire of candidate.wires) {
    lines.push(`WIRE ${holeField(wire.from)} ${holeField(wire.to)}`)
  }
  lines.push(...copperStatements(candidate, reference, cuts))
  return `${lines.join("\n")}\n`
}

export interface MaterializeInput {
  readonly candidate: Candidate
  readonly reference: ReferenceNets
  /**
   * The `.vrt` whose COMPONENT SET the fork places - a board it built from the
   * netlist this candidate's reference nets came from. See this module's comment
   * for why the document does not carry the component set itself.
   */
  readonly base: string
  /** Where the document is written. It is a real file because the fork reads one. */
  readonly layoutPath: string
  /** The `.vrt` the fork writes. */
  readonly outPath: string
}

export interface MaterializeResult {
  readonly outPath: string
  readonly layoutPath: string
  readonly document: string
  /** How many blank holes the fork actually painted, from its own summary line. */
  readonly painted: number
  /** Every `UNPAINTED_PIN` hole the fork reported - a pin it found on no net. */
  readonly unpaintedPins: readonly string[]
}

/** `MATERIALIZED ... PAINTED <n>`, or a refusal naming what the fork printed instead. */
function paintedFrom(stdout: string, outPath: string): number {
  const match = /^MATERIALIZED .*\bPAINTED (\d+)$/m.exec(stdout)
  const painted = match?.[1]
  if (painted === undefined) {
    refuse(
      "vero-export-no-summary-line",
      `the fork exited 0 and wrote ${outPath}, and its stdout carries no "MATERIALIZED ... ` +
        `PAINTED <n>" line:\n${stdout}\nThat line is --materialize's own report of what it ` +
        "applied (.tools/veroroute-perfboard/Src/Headless_materialize.h states the grammar), so " +
        "a dump without it means this board came from an older binary - veroroute.pin names the " +
        "commit and tools/perfboard/acquire.ts names the rebuild.\nIt is not defaulted to zero: " +
        "a painted count of zero is a real and different answer, and reading a missing line as " +
        "one would hide the version mismatch.",
    )
  }
  return Number(painted)
}

/**
 * Write the document and have the fork materialize it, or refuse.
 *
 * The fork's own refusal is passed through verbatim, because it is the message
 * that names which statement failed and why; nothing here re-words it. A non-zero
 * exit means no `.vrt` was written at all - the verb's contract - so this throws
 * rather than returning a path to a file that may not exist.
 */
export function materialize(input: MaterializeInput, spawn: SpawnVeroroute): MaterializeResult {
  const document = layoutDocument(input.candidate, input.reference)
  fs.mkdirSync(path.dirname(input.layoutPath), { recursive: true })
  fs.mkdirSync(path.dirname(input.outPath), { recursive: true })
  fs.writeFileSync(input.layoutPath, document)
  const run = spawn([
    "--materialize",
    input.base,
    "--layout",
    input.layoutPath,
    "-o",
    input.outPath,
  ])
  if (run.status !== 0) {
    refuse(
      "vero-export-materialize-refused",
      `veroroute --materialize ${input.base} --layout ${input.layoutPath} exited ` +
        `${run.status}, so no board was written.\n${run.stderr}${run.stdout}\nThe fork's message ` +
        "above names the statement it refused; it is passed through rather than re-worded, " +
        "because the fork is the thing that knows what it could not do.\nThe document is left " +
        `at ${input.layoutPath} so the refusal can be read against it.`,
    )
  }
  if (!fs.existsSync(input.outPath)) {
    refuse(
      "vero-export-no-board-written",
      `veroroute --materialize exited 0 and ${input.outPath} does not exist. A verb that reports ` +
        "success and writes nothing must not be read as having materialized a board.\nThe " +
        `document is left at ${input.layoutPath}.`,
    )
  }
  return {
    outPath: input.outPath,
    layoutPath: input.layoutPath,
    document,
    painted: paintedFrom(run.stdout, input.outPath),
    unpaintedPins: run.stdout
      .split("\n")
      .filter((line) => line.startsWith("UNPAINTED_PIN "))
      .map((line) => line.slice("UNPAINTED_PIN ".length).trim()),
  }
}
