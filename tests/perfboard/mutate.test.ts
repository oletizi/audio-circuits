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

test("a replace across filesystems refuses rather than falling back to a copy", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    fs.writeFileSync(vrt, "OLD")
    expect(() => replaceAtomically(vrt, "/definitely/not/here.vrt")).toThrow(/here\.vrt/)
    expect(fs.readFileSync(vrt, "utf8")).toBe("OLD")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
