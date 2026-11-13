import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  readPin, ensureBuilt, builtCommit, builtCommitFile, engineEnv, routerLibraryPath,
} from "../../tools/krt/acquire.ts"
import { ROUTER_BUILD_ARGS } from "../../tools/krt/acquire.ts"
import type { Pin, CommandRunner, CommandResult } from "../../tools/krt/acquire.ts"

function withTempDir(body: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "krt-acquire-"))
  try {
    body(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

interface Call {
  readonly command: string
  readonly args: readonly string[]
  readonly env: Readonly<Record<string, string | undefined>> | undefined
}

/**
 * A runner that touches nothing real. It records every call, and when the
 * build step runs it leaves the router library where a real build would, so
 * `ensureBuilt`'s final "the artifact exists" check sees a finished build.
 */
function fakeRunner(repoRoot: string, calls: Call[]): CommandRunner {
  return (command, args, cwd, env): CommandResult => {
    calls.push({ command, args, env })
    if (command === "git" && args[0] === "clone") {
      fs.mkdirSync(String(args[2]), { recursive: true })
    }
    if (args.includes("build_router.py")) {
      const lib = routerLibraryPath(repoRoot)
      fs.mkdirSync(path.dirname(lib), { recursive: true })
      fs.writeFileSync(lib, "")
    }
    void cwd
    return { status: 0, output: "" }
  }
}

function stamp(repoRoot: string, commit: string): void {
  const file = builtCommitFile(repoRoot)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${commit}\n`)
}

const PIN: Pin = {
  url: "https://example.invalid/engine.git",
  tag: "v0",
  commit: "new456",
}

test("a stamp matching the pin skips acquisition", () => {
  withTempDir((root) => {
    stamp(root, "new456")
    const calls: Call[] = []
    const result = ensureBuilt(PIN, { repoRoot: root, run: fakeRunner(root, calls), env: {} })
    expect(result.acquired).toBe(false)
    expect(calls).toEqual([])
  })
})

test("a stamp from a different commit re-acquires", () => {
  withTempDir((root) => {
    stamp(root, "old123")
    const calls: Call[] = []
    const result = ensureBuilt(PIN, { repoRoot: root, run: fakeRunner(root, calls), env: {} })
    expect(result.acquired).toBe(true)
    expect(calls.some((c) => c.command === "git" && c.args[0] === "checkout" && c.args[1] === "new456")).toBe(true)
    expect(builtCommit(root)).toBe("new456")
  })
})

test("a missing stamp re-acquires, because unstamped is unknown and not agreed", () => {
  withTempDir((root) => {
    const calls: Call[] = []
    const result = ensureBuilt(PIN, { repoRoot: root, run: fakeRunner(root, calls), env: {} })
    expect(result.acquired).toBe(true)
    expect(calls.some((c) => c.command === "git" && c.args[0] === "clone")).toBe(true)
    expect(builtCommit(root)).toBe("new456")
  })
})

test("a build that fails leaves the tree unstamped", () => {
  withTempDir((root) => {
    stamp(root, "old123")
    const failing: CommandRunner = (command, args) => {
      if (args.includes("build_router.py")) return { status: 1, output: "boom" }
      return { status: 0, output: "" }
    }
    expect(() => ensureBuilt(PIN, { repoRoot: root, run: failing, env: {} })).toThrow(/build_router/)
    // The old stamp names a commit that is no longer what is checked out, so it
    // must be gone: stale agreement is the failure the stamp exists to prevent.
    expect(builtCommit(root)).toBeUndefined()
  })
})

test("every engine command runs without PYTHONHOME and PYTHONPATH", () => {
  withTempDir((root) => {
    const calls: Call[] = []
    ensureBuilt(PIN, {
      repoRoot: root,
      run: fakeRunner(root, calls),
      env: { PYTHONHOME: "/kicad/py", PYTHONPATH: "/kicad/lib", PATH: "/bin" },
    })
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.env).toBeDefined()
      expect(call.env?.["PYTHONHOME"]).toBeUndefined()
      expect(call.env?.["PYTHONPATH"]).toBeUndefined()
      expect(call.env?.["PATH"]).toBe("/bin")
    }
  })
})

test("engineEnv removes the two variables and keeps the rest", () => {
  expect(engineEnv({ PYTHONHOME: "a", PYTHONPATH: "b", HOME: "/h" })).toEqual({ HOME: "/h" })
})

test("readPin parses url, tag and commit, and refuses a missing field by name", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "krt.pin")
    fs.writeFileSync(file, "# c\nurl  u\ntag   t\ncommit  c\n")
    expect(readPin(file)).toEqual({ url: "u", tag: "t", commit: "c" })
    fs.writeFileSync(file, "url u\ntag t\n")
    expect(() => readPin(file)).toThrow(/"commit"/)
  })
})

test("the router is built with exactly build_router.py --from-source", () => {
  withTempDir((root) => {
    const calls: Call[] = []
    ensureBuilt(PIN, { repoRoot: root, run: fakeRunner(root, calls), env: {} })
    const builds = calls.filter((c) => c.args.includes("build_router.py"))
    expect(builds.length).toBe(1)
    expect(builds[0].args).toEqual(["build_router.py", "--from-source"])
    expect(ROUTER_BUILD_ARGS).toEqual(["build_router.py", "--from-source"])
  })
})

test("a build that exits 0 without producing a library is refused even if an old library existed", () => {
  withTempDir((root) => {
    const lib = routerLibraryPath(root)
    fs.mkdirSync(path.dirname(lib), { recursive: true })
    fs.writeFileSync(lib, "old")
    stamp(root, "old123")
    const noop: CommandRunner = () => ({ status: 0, output: "" })
    expect(() => ensureBuilt(PIN, { repoRoot: root, run: noop, env: {} })).toThrow(/router library is not there/)
    expect(builtCommit(root)).toBeUndefined()
  })
})
