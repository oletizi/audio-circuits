/**
 * Task 17: WHAT ONE MOVE DOES TO A BOARD FILE - the transport, the argument
 * lists, and the two refusals.
 *
 * **ITS OWN FILE AT THE SEAM `./moves.test.ts`'s OWN HEADER ALREADY NAMED.**
 * That file's subject is *"the move set - what is enumerated, in what order, and
 * what one move does to a board file"*, which is two subjects; the second one is
 * here. Everything in this file injects a spawn and asserts the ARGUMENT LISTS
 * and the refusals, where everything there asserts the ENUMERATION and needs no
 * spawn answering a write verb at all. The split put `./moves.test.ts` back
 * under the 500-line ceiling, which it had passed by seven.
 *
 * THE AUTHORITY is the brief at
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/task-17-brief.md` and, behind
 * it, COST section 6.1's move set.
 *
 * WHAT THESE TESTS DO NOT PROVE: that the gestures land where the model says.
 * That claim belongs to `./seed-geometry.test.ts`, which holds the transcribed
 * rotation and stretch arithmetic against the real binary and fails rather than
 * skips when it is absent.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { DEFERRED_KINDS, applyMove } from "../../tools/stripboard/moves.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { IMPROVES_THEN_STALLS, freshRunDir, recordingSpawn } from "./climb-fixtures.ts"

afterAll(cleanUpTempScratch)

/** A spawn that records and answers every write verb, with no dump in play. */
function recorder(): { readonly spawned: string[][]; readonly spawn: SpawnVeroroute } {
  const spawned: string[][] = []
  return { spawned, spawn: recordingSpawn(spawned, IMPROVES_THEN_STALLS) }
}

/** A spawn that refuses every invocation, for the non-zero-exit refusal. */
const refusingSpawn: SpawnVeroroute = () => ({
  status: 1,
  stdout: "",
  stderr: "R1 cannot go to -1,1 - its footprint would occupy rows -1..-1\n",
})

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("each applicable kind spawns the fork's own verb, with -o and never in place", () => {
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "move", ref: "R1", to: [3, 4] }, out, spawn)
  applyMove("board.vrt", { kind: "rotate", ref: "R1", direction: "cw" }, out, spawn)
  applyMove("board.vrt", { kind: "stretch", ref: "R1", direction: "grow" }, out, spawn)
  // add-wire is COMPOUND now and has its own test in ./wire.test.ts; the three
  // one-gesture kinds are what this one is about.
  // Hand-written argument lists, in the grammar the fork's own headers state.
  expect(spawned).toEqual([
    ["--move", "board.vrt", "--ref", "R1", "--to", "3,4", "-o", out],
    ["--rotate", "board.vrt", "--ref", "R1", "--direction", "cw", "-o", out],
    ["--stretch", "board.vrt", "--ref", "R1", "--direction", "grow", "-o", out],
  ])
})

test("the batched transport writes one ops line in --move-batch's own grammar", () => {
  const spawned: string[][] = []
  const ops: string[] = []
  const spawn = recordingSpawn(spawned, IMPROVES_THEN_STALLS, ops)
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "move", ref: "R1", to: [3, 4] }, out, spawn, "batched")
  applyMove("board.vrt", { kind: "rotate", ref: "R2", direction: "cw" }, out, spawn, "batched")
  // The verb is the BARE word, with no leading dashes: the fork refuses
  // "--move" in an ops file by name, "because that spelling is the command
  // line's and quietly accepting both would make the file's grammar a matter of
  // taste" (Headless_move_batch.h).
  expect(ops).toEqual(["move R1 --to 3,4\n", "rotate R2 --direction cw\n"])
  expect(spawned.map((args) => args[0])).toEqual(["--move-batch", "--move-batch"])
  expect(fs.existsSync(`${out}.ops`)).toBe(true)
})

test("a kind --move-batch cannot carry takes its one-gesture verb even when batched", () => {
  // The ops grammar is move and rotate and "Nothing else is accepted"
  // (Headless_move_batch.h), so the transport cannot reach a stretch or an
  // add-wire. That is the verb's declared scope rather than a fallback, and the
  // gesture applied is the same one either way.
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "stretch", ref: "R1", direction: "shrink" }, out, spawn, "batched")
  expect(spawned).toEqual([
    ["--stretch", "board.vrt", "--ref", "R1", "--direction", "shrink", "-o", out],
  ])
})

test("a delete-wire refuses naming the fork, which is where the block is", () => {
  // THE CLUSTER HALF OF THIS TEST IS GONE RATHER THAN SKIPPED, because the
  // refusal it asserted is gone: Task 18 implemented the kind, so
  // DEFERRED_KINDS no longer carries it and applyMove applies it.
  // `./escapes.test.ts` is where the cluster's own behaviour is held.
  const { spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  const wire = refusalFrom(() =>
    applyMove("board.vrt", { kind: "delete-wire", name: "W1" }, out, spawn),
  )
  expect(wire).toContain("no verb in the pinned fork deletes a placed component")
  // ONE WORDING for each, read out of DEFERRED_KINDS by both applyMove and
  // applicableMoves - so the climb's omission and the refusal cannot drift.
  const reason = DEFERRED_KINDS.get("delete-wire")
  expect(reason === undefined).toBe(false)
  expect(wire).toContain(reason ?? "<absent>")
  // AND THE REFUSAL NOW CARRIES THE MEASUREMENT rather than a reading of a help
  // text: --update is the one verb that rewrites a board's component set from a
  // netlist, and it leaves wires in place.
  expect(wire).toContain("still carries TWO wires afterwards")
  // And `add-wire` is NOT in here any more: it was deferred beside this one
  // until `occupancyOf` learned about wires, and ./wire.test.ts is where its
  // behaviour is held now.
  expect(DEFERRED_KINDS.has("add-wire")).toBe(false)
})

test("a gesture the fork refuses stops the run and quotes it, rather than being skipped", () => {
  const out = path.join(freshRunDir(), "candidate.vrt")
  const refusal = refusalFrom(() =>
    applyMove("board.vrt", { kind: "move", ref: "R1", to: [-1, 1] }, out, refusingSpawn),
  )
  expect(refusal).toContain("move R1 to -1,1")
  expect(refusal).toContain("--move board.vrt --ref R1 --to -1,1 -o")
  expect(refusal).toContain("its footprint would occupy rows -1..-1")
  expect(refusal).toContain("NOT retried")
})
