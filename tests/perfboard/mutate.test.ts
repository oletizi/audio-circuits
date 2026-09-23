import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { assertLayoutRecoverable, replaceAtomically } from "../../tools/perfboard/mutate.ts"
import type { GitRunner } from "../../tools/perfboard/mutate.ts"

/** git stub: `tracked` decides ls-files, `dirty` decides diff --quiet. */
function stubGit(tracked: boolean, dirty: boolean): GitRunner {
  return (args) => {
    if (args[0] === "ls-files") return { status: tracked ? 0 : 1, stdout: "" }
    if (args[0] === "diff") return { status: dirty ? 1 : 0, stdout: "" }
    throw new Error(`unexpected git call: ${args.join(" ")}`)
  }
}

test("a committed, unmodified layout passes", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, false) }))
    .not.toThrow()
})

test("an untracked layout refuses, saying git has never seen it", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(false, false) }))
    .toThrow(/x\.vrt[\s\S]*not tracked[\s\S]*never seen/)
})

test("a modified layout refuses differently, naming the state it cannot reach", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, true) }))
    .toThrow(/x\.vrt[\s\S]*uncommitted changes/)
})

test("the two refusals are different messages, not one message for both mistakes", () => {
  let untracked = ""
  let modified = ""
  try { assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(false, false) }) }
  catch (e) { untracked = e instanceof Error ? e.message : String(e) }
  try { assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, true) }) }
  catch (e) { modified = e instanceof Error ? e.message : String(e) }
  expect(untracked).not.toBe(modified)
  expect(untracked.length).toBeGreaterThan(0)
  expect(modified.length).toBeGreaterThan(0)
})

test("--allow-dirty suppresses both refusals", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: true, git: stubGit(false, false) }))
    .not.toThrow()
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: true, git: stubGit(true, true) }))
    .not.toThrow()
})

test("the replace is atomic and lands the produced bytes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    const produced = path.join(dir, "board.produced.vrt")
    fs.writeFileSync(vrt, "OLD")
    fs.writeFileSync(produced, "NEW")
    replaceAtomically(vrt, produced)
    expect(fs.readFileSync(vrt, "utf8")).toBe("NEW")
    expect(fs.existsSync(produced)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a produced file that does not exist refuses, naming it and saying the layout is unchanged", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    fs.writeFileSync(vrt, "OLD")
    // "produced no output file" is unique to this branch: the rename-failure
    // branch's message never contains it, so this pins the missing-produced-file
    // message specifically rather than matching either branch.
    expect(() => replaceAtomically(vrt, "/definitely/not/here.vrt"))
      .toThrow(/here\.vrt[\s\S]*produced no output file[\s\S]*board\.vrt[\s\S]*unchanged/)
    expect(fs.readFileSync(vrt, "utf8")).toBe("OLD")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a rename failure refuses without falling back to a copy, leaving the layout untouched", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    const produced = path.join(dir, "board.produced.vrt")
    fs.writeFileSync(vrt, "ORIGINAL")
    // A directory passes the existsSync check (so this reaches renameSync,
    // unlike the missing-file test above) but can never be renamed onto an
    // existing regular file. That failure is portable and deterministic,
    // unlike a permission-based failure (chmod is unreliable under root and
    // across filesystems).
    fs.mkdirSync(produced)
    let message = ""
    try {
      replaceAtomically(vrt, produced)
      throw new Error("replaceAtomically did not throw")
    } catch (e) {
      message = e instanceof Error ? e.message : String(e)
    }
    expect(message).toContain(produced)
    expect(message).toContain(vrt)
    expect(message).toContain("unchanged")
    // The invariant that actually matters: no copy fallback happened, so the
    // layout still holds its original bytes rather than a copy of the
    // (directory) produced path.
    expect(fs.readFileSync(vrt, "utf8")).toBe("ORIGINAL")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
