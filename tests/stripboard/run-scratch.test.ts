/**
 * The scratch registry itself, driven - because every other test in this suite
 * depends on it and none of them can fail when it stops working.
 *
 * **THAT IS THE WHOLE REASON THIS FILE EXISTS.** `cleanUpFixtures` leaving a
 * directory behind is invisible: `build/` is gitignored, so nothing in `git
 * status` mentions it, and the suite goes green while the directory count
 * climbs. It took a mutation harness and 4,606 directories for the symptom to
 * appear, and it appeared as twenty-three failures in nine unrelated files
 * blaming a working binary. A helper whose failure mode is "the suite breaks
 * next month, somewhere else" needs a test of its own.
 *
 * It is the last word on the measurement; `./run-scratch.ts` carries the rest.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { runDirectory } from "../../tools/stripboard/run-dir.ts"
import {
  cleanUpFixtures,
  freshRoot,
  registerCreated,
  registerStampPrefix,
  scratchStamp,
} from "./run-scratch.ts"

afterAll(cleanUpFixtures)

const BOARD = "run-scratch-test"

test("a registered directory is removed, and a second call is a no-op rather than a second walk", () => {
  const root = freshRoot("registry")
  expect(fs.existsSync(root)).toBe(true)
  const extra = runDirectory(BOARD, "registered-by-path")
  fs.mkdirSync(extra, { recursive: true })
  registerCreated(extra)

  cleanUpFixtures()
  expect(fs.existsSync(root), "the mkdtemp root is gone").toBe(false)
  expect(fs.existsSync(extra), "and so is the run directory registered by path").toBe(false)
  // The second call walks nothing: both registries were emptied, which is what
  // keeps a file's afterAll from re-walking a tree a previous one removed.
  cleanUpFixtures()
})

test("a stamp prefix sweeps every directory the stamp produced, suffixes included", () => {
  // THE PREFIX IS WHY THIS IS NOT REGISTERED BY PATH. `placeAcrossSeeds`
  // suffixes its caller's stamp per seed, so the caller cannot name every
  // directory in advance - and registering only the bare stamp would leave one
  // directory per seed behind, which is the leak in its original shape.
  const stamp = scratchStamp(BOARD, "sweep")
  const bare = runDirectory(BOARD, stamp)
  const perSeed = [0, 1, 4].map((seed) => runDirectory(BOARD, `${stamp}-seed-${seed}`))
  for (const dir of [bare, ...perSeed]) fs.mkdirSync(dir, { recursive: true })
  // A NEIGHBOUR THAT MUST SURVIVE, so this states that the sweep is bounded by
  // the prefix rather than emptying the board's directory.
  const neighbour = runDirectory(BOARD, "someone-elses-run")
  fs.mkdirSync(neighbour, { recursive: true })

  cleanUpFixtures()
  for (const dir of [bare, ...perSeed]) {
    expect(fs.existsSync(dir), `${path.basename(dir)} is swept`).toBe(false)
  }
  expect(fs.existsSync(neighbour), "and a directory outside the prefix is not").toBe(true)
  fs.rmSync(neighbour, { recursive: true, force: true })
})

test("a stamp prefix whose board directory was never created is not an error", () => {
  // A test that registers a stamp and then refuses before `place` writes
  // anything is an ordinary case - the frozen run does exactly that - and the
  // registration is the honest thing for it to have done.
  registerStampPrefix("run-scratch-board-that-never-existed", "never-ran")
  expect(() => cleanUpFixtures()).not.toThrow()
})
