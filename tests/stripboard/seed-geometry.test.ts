/**
 * The geometry model held against the REAL fork, and the random arm run all the
 * way through on a real import-placed board.
 *
 * **IT SPAWNS THE BINARY AND FAILS RATHER THAN SKIPS WHEN IT IS ABSENT**, the
 * posture `tools/perfboard/check.ts` and `./checkpoint-fixtures.ts` already
 * take: a skipped check must never look like a passing one, and every claim in
 * `tools/stripboard/seed-geometry.ts` is a claim about what this binary does.
 * The committed `.dump` fixtures cannot serve here - the model's whole subject is
 * what the fork DOES to a board when a gesture is applied, which no captured
 * dump records.
 *
 * **WHY IT EXISTS AT ALL.** The first version of the geometry derived a part's
 * footprint height from its lead extent, which is wrong by one on
 * `CAP_FILM_WIDE`, and tracked moves without tracking turns. Both were invisible
 * to every hand-written fixture in `./seed-fixtures.ts` and both stopped the
 * random arm on all five reviewed seeds against the real binary. A model of
 * another program's behaviour has to be checked against that program.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { exportNetlistFor, verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { seedCandidate, type SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import {
  occupancyOf,
  rectOf,
  turnable,
  turnedRect,
  VEROROUTE_FOOTPRINT_ROWS,
} from "../../tools/stripboard/seed-geometry.ts"

/** The injected spawn, which here really is the binary. */
const spawn: SpawnVeroroute = (args) => {
  const binary = verorouteBinary(process.env, moduleRepoRoot())
  const run = spawnSync(binary, [...args], { encoding: "utf8" })
  if (run.status === null) {
    throw new Error(`veroroute was killed by a signal running: ${args.join(" ")}`)
  }
  return {
    status: run.status,
    stdout: typeof run.stdout === "string" ? run.stdout : "",
    stderr: typeof run.stderr === "string" ? run.stderr : "",
  }
}

function dumpOf(board: string): BoardDump {
  const run = spawn(["--dump-board", board])
  if (run.status !== 0) {
    throw new Error(`--dump-board ${board} exited ${run.status}: ${run.stderr}`)
  }
  return parseBoardDump(run.stdout)
}

/** Where this file's throwaway boards go. Nothing here writes into the repository. */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-seed-geometry-"))

/**
 * The import-placed low-boost board, built once: the netlist this repository
 * exports, through `--import --strips horizontal`.
 *
 * **THIS IS WHERE EVERY ARM STARTS**, and it is not the committed board. The
 * brief's "rotatable 0, refused 60" sweep was taken on the COMMITTED boards; the
 * figures below are taken here, which is the only starting point the arms ever
 * see.
 */
const declaration = loadDeclaration(
  path.join(moduleRepoRoot(), "boards", "pultec-low-boost", "perfboard.json"),
)
const NET_PATH = path.join(WORK, "low-boost.net")
fs.writeFileSync(NET_PATH, await exportNetlistFor(declaration))
const BOARD = path.join(WORK, "imported.vrt")
{
  const run = spawn(["--import", NET_PATH, "-o", BOARD, "--strips", "horizontal"])
  if (run.status !== 0) {
    throw new Error(`--import exited ${run.status}: ${run.stderr}`)
  }
}

function importedBoard(): string {
  return BOARD
}

test("every recorded footprint row count is the one the fork itself places by", () => {
  // HOW THE FORK IS ASKED. A clockwise quarter turn transposes a footprint, so
  // the SPAN the dump prints AFTER a turn is the part's row count BEFORE it -
  // which is the figure VEROROUTE_FOOTPRINT_ROWS records, read back out of the
  // binary rather than out of this repository.
  const board = importedBoard()
  const before = dumpOf(board)
  const types = new Set(before.parts.map((part) => part.type))
  expect(types.size, "a board with one type would check one entry").toBeGreaterThan(1)

  for (const [type, rows] of VEROROUTE_FOOTPRINT_ROWS) {
    const part = before.parts.find((candidate) => candidate.type === type)
    if (part === undefined) continue
    // Into the middle of the board, where there is room for any of these parts
    // in either orientation, so what is measured is the turn and not a collision.
    const moved = path.join(WORK, `rows-${type}-moved.vrt`)
    const move = spawn(["--move", board, "--ref", part.ref, "--to", "20,10", "-o", moved])
    expect(move.status, `moving ${part.ref} to 20,10: ${move.stderr}`).toBe(0)
    const turned = path.join(WORK, `rows-${type}-turned.vrt`)
    const turn = spawn(["--rotate", moved, "--ref", part.ref, "--direction", "cw", "-o", turned])
    expect(turn.status, `turning ${part.ref} at 20,10: ${turn.stderr}`).toBe(0)

    const after = dumpOf(turned)
    const afterPart = after.parts.find((candidate) => candidate.ref === part.ref)
    expect(afterPart, `${part.ref} is gone from the turned board`).toBeDefined()
    expect(afterPart!.span, `${type}'s row count, read back off the fork`).toBe(rows)

    // AND THE PREDICTED ORIGIN, which is the other half of the same arithmetic:
    // turnedRect says where RotateComps leaves the part's AT, and the fork prints
    // where it actually left it.
    const predicted = turnedRect(rectOf(occupancyOf(dumpOf(moved)), part.ref))
    expect(afterPart!.placement, `${type}: turnedRect's predicted AT`).toEqual({
      row: predicted.row,
      col: predicted.col,
    })
  }
})

test("turnable agrees with the fork on every part, in place and after a move", () => {
  // BOTH ANSWERS OCCUR, WHICH IS WHAT MAKES AGREEMENT MEAN ANYTHING, and both
  // come from the same seventeen parts rather than from a hand-picked pair: on
  // the import-placed board sixteen of them cannot be turned where the sweep
  // left them and all seventeen can be turned after a move to an interior
  // origin. `turnable` has to call every one of those thirty-four the way the
  // fork does.
  //
  // THE ONE PART THAT TURNS IN PLACE IS `C18`, AND IT IS NOT AN EXCEPTION TO THE
  // ARITHMETIC - IT IS THE ARITHMETIC. `CAP_FILM_WIDE` is the only SQUARE
  // footprint on the board (3 rows by 3 columns), so its centring shift
  // `trunc((DY - DX) / 2)` is zero, the rotated rect lands exactly where the old
  // one was, and nothing overhangs an edge. Every other part is `1 x N`, whose
  // shift is `-floor((N - 1) / 2)` rows - negative - which from row 0 or row 1
  // lands above the board and pans. The brief's "rotatable 0" summary is right
  // about the committed boards and one short here.
  const board = importedBoard()
  const before = dumpOf(board)
  expect(before.parts.length, "a board with no parts would make every count zero").toBe(17)

  let inPlaceFork = 0
  let inPlaceModel = 0
  let movedFork = 0
  let movedModel = 0
  const turnsInPlace: string[] = []
  for (const part of before.parts) {
    const here = path.join(WORK, `inplace-${part.ref}.vrt`)
    const forkHere = spawn(["--rotate", board, "--ref", part.ref, "--direction", "cw", "-o", here])
      .status === 0
    const modelHere = turnable(occupancyOf(before), before.grid, part.ref)
    expect(modelHere, `${part.ref} in place: the fork ${forkHere ? "accepted" : "refused"}`)
      .toBe(forkHere)
    if (forkHere) { inPlaceFork += 1; turnsInPlace.push(part.ref) }
    if (modelHere) inPlaceModel += 1

    const moved = path.join(WORK, `interior-${part.ref}.vrt`)
    const move = spawn(["--move", board, "--ref", part.ref, "--to", "20,10", "-o", moved])
    expect(move.status, `moving ${part.ref} to 20,10: ${move.stderr}`).toBe(0)
    const movedDump = dumpOf(moved)
    const there = path.join(WORK, `interior-${part.ref}-t.vrt`)
    const forkThere = spawn(["--rotate", moved, "--ref", part.ref, "--direction", "cw", "-o", there])
      .status === 0
    const modelThere = turnable(occupancyOf(movedDump), movedDump.grid, part.ref)
    expect(modelThere, `${part.ref} at 20,10: the fork ${forkThere ? "accepted" : "refused"}`)
      .toBe(forkThere)
    if (forkThere) movedFork += 1
    if (modelThere) movedModel += 1
  }

  // The two counts, so neither direction of agreement is vacuous.
  expect(inPlaceFork, "parts the fork turns where the first-fit sweep left them").toBe(1)
  expect(turnsInPlace, "and it is the square footprint").toEqual(["C18"])
  expect(movedFork, "parts the fork turns after a move to an interior origin").toBe(17)
  expect(inPlaceModel, "the model's own count in place").toBe(inPlaceFork)
  expect(movedModel, "the model's own count after a move").toBe(movedFork)
})

test("the random arm produces a start on every reviewed seed, and the grid never grows", () => {
  // THE WHOLE POINT OF THE CONTROL ARM IS THAT IT RUNS. It did not: against the
  // real binary it stopped on 0 of 5 seeds, on a refused --rotate at four of
  // them and a refused --move at the fifth, because the occupancy model followed
  // moves and not turns and the footprint height was short by one on
  // CAP_FILM_WIDE. This is the standing version of that measurement.
  const board = importedBoard()
  const grid = dumpOf(board).grid
  const rules = loadRules()
  const targets = deriveTargets(physicalBoard("low-boost"), rules.stockRows, "pultec-low-boost")
  expect(rules.seeds.length, "a run over an empty seed set proves nothing").toBeGreaterThan(1)

  for (const seed of rules.seeds) {
    const runDir = path.join(WORK, `random-${seed}`)
    fs.mkdirSync(runDir, { recursive: true })
    const candidate = seedCandidate(
      { importedBoard: board, targets, runDir, rules, arm: "random", seed },
      spawn,
    )
    const after = dumpOf(candidate)
    // NOT GROWN, read off the real board rather than off a simulation: a draw
    // outside the grid pans or grows it and renumbers every hole.
    expect(after.grid, `seed ${seed} grew the board`).toEqual(grid)
    // AND PAINTED, which is what --author --op autofill is last for: HC2 refuses
    // an unresolved cut state rather than mis-scoring it.
    expect(after.cutState, `seed ${seed}`).toBe("COMPUTED")
    // AND EVERY PART STILL PLACED: a gesture that floated one exits 0 in
    // Board::PutDown and says nothing, so the floating check is the witness.
    expect(after.parts.filter((part) => part.placement === "floating"), `seed ${seed}`).toEqual([])
  }
}, 120_000)

test("the constructed arm refuses on an import-placed board, naming the missing net names", () => {
  // A MEASURED FINDING AND NOT A DESIGN CHOICE. `--import` writes every NODE
  // line as `NODE <id> NAME - <pins>`: the board carries the net TOPOLOGY and
  // none of the net NAMES. The constructed arm turns each part across the strips
  // of its two nets, and its strip assignment is keyed by the net names
  // `deriveTargets` orders - so on this board there is nothing to join the two
  // by. It refuses rather than inventing a correspondence, and the comparison
  // records the refusal per seed (see seed-compare.test.ts) so the concentration
  // in one arm is readable rather than fatal.
  const board = importedBoard()
  const rules = loadRules()
  const targets = deriveTargets(physicalBoard("low-boost"), rules.stockRows, "pultec-low-boost")
  const runDir = path.join(WORK, "constructed-0")
  fs.mkdirSync(runDir, { recursive: true })
  expect(() =>
    seedCandidate({ importedBoard: board, targets, runDir, rules, arm: "constructed", seed: 0 }, spawn),
  ).toThrow(/NAME -/)
})
