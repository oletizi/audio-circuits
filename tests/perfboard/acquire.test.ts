import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  readPin, resolveBinary, resolveQmake, acquire,
} from "../../tools/perfboard/acquire.ts"
import type { Pin, CommandRunner, Env } from "../../tools/perfboard/acquire.ts"

/**
 * Every direct `acquire()` test below is unrelated to `qmake` resolution
 * itself, so it sets `QMAKE` explicitly to a full `<prefix>/bin/qmake` path -
 * this reduces `resolveQmake` to mode "explicit", returning that literal
 * unchanged, so `run` never calls (or needs a handler for) `brew`. The path
 * shape matters here even in explicit mode: `acquire` derives `QT_PREFIX` for
 * `build.sh` by walking two directories up from whatever `resolveQmake`
 * returns, so a bare command name (no directory at all) would derive a
 * nonsense prefix. `resolveQmake`'s own behavior - the brew lookup, `QMAKE`
 * override, and every refusal - is exercised directly, below.
 */
const QMAKE_EXPLICIT: Env = { QMAKE: "/opt/dev-qt/bin/qmake" }
const QMAKE_EXPLICIT_PREFIX = "/opt/dev-qt"

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acquire-"))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function writePin(dir: string, contents: string): string {
  const file = path.join(dir, "veroroute.pin")
  fs.writeFileSync(file, contents)
  return file
}

// ---------------------------------------------------------------------------
// readPin
// ---------------------------------------------------------------------------

test("readPin parses repo and commit from a well-formed pin file", () => {
  withTempDir((dir) => {
    const file = writePin(
      dir,
      "repo    git@github.com:oletizi/veroroute-perfboard.git\n" +
        "commit  b09727d8ee0eb2a062da74b530b637436296330c\n",
    )
    expect(readPin(file)).toEqual({
      repo: "git@github.com:oletizi/veroroute-perfboard.git",
      commit: "b09727d8ee0eb2a062da74b530b637436296330c",
    })
  })
})

test("a pin file missing the commit field names the file and the missing field", () => {
  withTempDir((dir) => {
    const file = writePin(dir, "repo    git@github.com:oletizi/veroroute-perfboard.git\n")
    expect(() => readPin(file)).toThrow(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*"commit"`))
  })
})

test("a pin file missing the repo field names the file and the missing field", () => {
  withTempDir((dir) => {
    const file = writePin(dir, "commit  b09727d8ee0eb2a062da74b530b637436296330c\n")
    expect(() => readPin(file)).toThrow(/missing required field "repo"/)
  })
})

test("a pin line that is not '<field> <value>' refuses naming the file and the line", () => {
  withTempDir((dir) => {
    const file = writePin(dir, "repo\ncommit  b09727d8ee0eb2a062da74b530b637436296330c\n")
    expect(() => readPin(file)).toThrow(/could not parse line/)
  })
})

test("a pin file that cannot be read names the file and the underlying error", () => {
  expect(() => readPin("/nonexistent/veroroute.pin")).toThrow(/veroroute\.pin.*could not read/)
})

// ---------------------------------------------------------------------------
// resolveBinary
// ---------------------------------------------------------------------------

test("VEROROUTE unset resolves to the acquired path under .tools/", () => {
  const resolution = resolveBinary({}, "/repo")
  expect(resolution.mode).toBe("acquired")
  expect(resolution.path).toBe(
    path.join("/repo", ".tools", "veroroute-perfboard", "veroroute.app", "Contents", "MacOS", "veroroute"),
  )
})

test("VEROROUTE set to the operator's own checkout resolves explicit, unchanged", () => {
  const resolution = resolveBinary({ VEROROUTE: "/Users/dev/src/veroroute-perfboard/veroroute" }, "/repo")
  expect(resolution.mode).toBe("explicit")
  expect(resolution.path).toBe("/Users/dev/src/veroroute-perfboard/veroroute")
})

test("VEROROUTE set but empty refuses rather than guessing unset was meant", () => {
  expect(() => resolveBinary({ VEROROUTE: "   " }, "/repo")).toThrow(/set but empty/)
})

// ---------------------------------------------------------------------------
// resolveQmake
// ---------------------------------------------------------------------------

test("QMAKE set to the operator's own qmake resolves explicit, unchanged, and never calls brew", () => {
  const run: CommandRunner = () => { throw new Error("must not be called in explicit mode") }
  const resolution = resolveQmake({ QMAKE: "/opt/dev-qt/bin/qmake" }, run, "/repo")
  expect(resolution.mode).toBe("explicit")
  expect(resolution.command).toBe("/opt/dev-qt/bin/qmake")
})

test("QMAKE set but empty refuses rather than guessing unset was meant", () => {
  const run: CommandRunner = () => { throw new Error("must not be called") }
  expect(() => resolveQmake({ QMAKE: "   " }, run, "/repo")).toThrow(/set but empty/)
})

test("QMAKE unset asks brew for qt@5's prefix and resolves to <prefix>/bin/qmake when it exists", () => {
  withTempDir((prefix) => {
    fs.mkdirSync(path.join(prefix, "bin"), { recursive: true })
    fs.writeFileSync(path.join(prefix, "bin", "qmake"), "#!/bin/sh\n")
    const calls: Array<{ command: string; args: readonly string[] }> = []
    const run: CommandRunner = (command, args) => {
      calls.push({ command, args })
      if (command === "brew") return { status: 0, output: `${prefix}\n` }
      throw new Error(`unexpected command in test: ${command}`)
    }
    const resolution = resolveQmake({}, run, "/repo")
    expect(resolution.mode).toBe("brew")
    expect(resolution.command).toBe(path.join(prefix, "bin", "qmake"))
    expect(calls).toEqual([{ command: "brew", args: ["--prefix", "qt@5"] }])
  })
})

test("QMAKE unset, brew itself absent, refuses naming Homebrew, brew install qt@5, and QMAKE", () => {
  const run: CommandRunner = () => { throw new Error("spawnSync brew ENOENT") }
  expect(() => resolveQmake({}, run, "/repo")).toThrow(/Homebrew/)
  expect(() => resolveQmake({}, run, "/repo")).toThrow(/brew install qt@5/)
  expect(() => resolveQmake({}, run, "/repo")).toThrow(/QMAKE/)
})

test("QMAKE unset, brew present but qt@5 not installed, refuses differently naming brew install qt@5", () => {
  const run: CommandRunner = () => ({ status: 1, output: "Error: No such keg" })
  expect(() => resolveQmake({}, run, "/repo")).toThrow(/brew install qt@5/)
  // Distinct from the "brew itself is absent" refusal above: this one never
  // tells the operator to go install Homebrew - brew already ran fine here,
  // it is qt@5 specifically that is missing.
  expect(() => resolveQmake({}, run, "/repo")).not.toThrow(/https:\/\/brew\.sh/)
})

test("QMAKE unset, brew resolves a prefix with no qmake underneath, refuses naming the resolved path", () => {
  withTempDir((prefix) => {
    const run: CommandRunner = () => ({ status: 0, output: `${prefix}\n` })
    expect(() => resolveQmake({}, run, "/repo")).toThrow(
      new RegExp(path.join(prefix, "bin", "qmake").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    )
  })
})

// ---------------------------------------------------------------------------
// acquire
// ---------------------------------------------------------------------------

/** Records every command run, and lets the caller decide each one's outcome. */
function recordingRunner(
  handlers: Readonly<
    Record<string, (args: readonly string[], cwd: string, env?: Env) => { status: number | null; output: string }>
  >,
  calls: string[],
): CommandRunner {
  return (command, args, cwd, env) => {
    calls.push(`${command} ${args.join(" ")}`)
    const handler = handlers[command]
    if (handler === undefined) throw new Error(`unexpected command in test: ${command}`)
    return handler(args, cwd, env)
  }
}

const PIN: Pin = {
  repo: "git@github.com:oletizi/veroroute-perfboard.git",
  commit: "b09727d8ee0eb2a062da74b530b637436296330c",
}

function cloneDirUnder(repoRoot: string): string {
  return path.join(repoRoot, ".tools", "veroroute-perfboard")
}

function binaryPathUnder(repoRoot: string): string {
  return path.join(cloneDirUnder(repoRoot), "veroroute.app", "Contents", "MacOS", "veroroute")
}

function buildScriptUnder(repoRoot: string): string {
  return path.join(cloneDirUnder(repoRoot), "build.sh")
}

/**
 * A "git clone" handler that materializes the clone dir, a stub build.sh, and
 * the binary's parent directory, as a real clone would leave the first two -
 * the binary's parent dir stands in for what a real `build.sh` mkdir's.
 */
function cloningGit(repoRoot: string): (args: readonly string[]) => { status: number | null; output: string } {
  return (args) => {
    if (args[0] === "clone") {
      fs.mkdirSync(path.dirname(binaryPathUnder(repoRoot)), { recursive: true })
      fs.writeFileSync(buildScriptUnder(repoRoot), "#!/bin/bash\n")
    }
    return { status: 0, output: "" }
  }
}

test("acquire clones, checks out the pinned commit, runs build.sh with QT_PREFIX, and returns the binary path", () => {
  withTempDir((repoRoot) => {
    const calls: string[] = []
    const binaryPath = binaryPathUnder(repoRoot)
    const buildScript = buildScriptUnder(repoRoot)
    let buildEnv: Env | undefined
    const run = recordingRunner(
      {
        git: cloningGit(repoRoot),
        [buildScript]: (_args, _cwd, env) => {
          buildEnv = env
          fs.writeFileSync(binaryPath, "#!/bin/sh\n")
          return { status: 0, output: "" }
        },
      },
      calls,
    )

    const result = acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })
    expect(result).toBe(binaryPath)
    expect(calls).toEqual([
      `git clone ${PIN.repo} ${cloneDirUnder(repoRoot)}`,
      `git checkout ${PIN.commit}`,
      `${buildScript} `,
    ])
    // QT_PREFIX is derived from the resolved qmake path (two directories up),
    // never from a second call to brew - resolveQmake was already asked once.
    expect(buildEnv).toEqual({ QT_PREFIX: QMAKE_EXPLICIT_PREFIX })
  })
})

test("QT_PREFIX passed to build.sh is derived from brew's resolved prefix when QMAKE is unset", () => {
  withTempDir((repoRoot) => {
    withTempDir((qtPrefix) => {
      fs.mkdirSync(path.join(qtPrefix, "bin"), { recursive: true })
      fs.writeFileSync(path.join(qtPrefix, "bin", "qmake"), "#!/bin/sh\n")
      const binaryPath = binaryPathUnder(repoRoot)
      const buildScript = buildScriptUnder(repoRoot)
      let buildEnv: Env | undefined
      const calls: string[] = []
      const run = recordingRunner(
        {
          git: cloningGit(repoRoot),
          brew: () => ({ status: 0, output: `${qtPrefix}\n` }),
          [buildScript]: (_args, _cwd, env) => {
            buildEnv = env
            fs.writeFileSync(binaryPath, "#!/bin/sh\n")
            return { status: 0, output: "" }
          },
        },
        calls,
      )
      const result = acquire(PIN, { repoRoot, run, env: {} })
      expect(result).toBe(binaryPath)
      expect(buildEnv).toEqual({ QT_PREFIX: qtPrefix })
    })
  })
})

test("acquire refuses to report success when the expected binary is not there afterward", () => {
  withTempDir((repoRoot) => {
    const buildScript = buildScriptUnder(repoRoot)
    const run = recordingRunner(
      {
        git: cloningGit(repoRoot),
        [buildScript]: () => ({ status: 0, output: "" }),
      },
      [],
    )
    expect(() => acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })).toThrow(/veroroute.*not there/s)
  })
})

test("a failing clone throws naming the exit status and never reaches checkout or build", () => {
  withTempDir((repoRoot) => {
    const calls: string[] = []
    const run = recordingRunner(
      {
        git: (args) => (args[0] === "clone" ? { status: 128, output: "fatal: could not resolve host" } : { status: 0, output: "" }),
      },
      calls,
    )
    expect(() => acquire(PIN, { repoRoot, run })).toThrow(/git clone.*exited 128/s)
    expect(calls).toEqual([`git clone ${PIN.repo} ${cloneDirUnder(repoRoot)}`])
  })
})

test("acquire refuses before ever looking for build.sh when QMAKE resolution itself fails", () => {
  withTempDir((repoRoot) => {
    const run: CommandRunner = (command, args) => {
      if (command === "git") return { status: 0, output: "" }
      if (command === "brew") return { status: 1, output: "Error: No such keg" }
      throw new Error(`unexpected command in test: ${command}`)
    }
    // No build.sh is ever written to the clone dir in this test - if acquire
    // reached the build.sh existence check before propagating the QMAKE
    // resolution failure, it would throw the wrong (build.sh missing) error.
    fs.mkdirSync(cloneDirUnder(repoRoot), { recursive: true })
    expect(() => acquire(PIN, { repoRoot, run })).toThrow(/brew install qt@5/)
  })
})

test("build.sh missing from the clone refuses naming it, rather than reimplementing qmake/make", () => {
  withTempDir((repoRoot) => {
    const cloneDir = cloneDirUnder(repoRoot)
    fs.mkdirSync(cloneDir, { recursive: true })
    const run: CommandRunner = () => ({ status: 0, output: "" })
    expect(() => acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })).toThrow(
      new RegExp(`${buildScriptUnder(repoRoot).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*not found`, "s"),
    )
  })
})

test("a failing build.sh names its own exit status; the build did not complete", () => {
  withTempDir((repoRoot) => {
    const buildScript = buildScriptUnder(repoRoot)
    const calls: string[] = []
    const run = recordingRunner(
      {
        git: cloningGit(repoRoot),
        [buildScript]: () => ({ status: 2, output: "make: *** [all] Error 1" }),
      },
      calls,
    )
    expect(() => acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })).toThrow(/exited 2.*did not complete/s)
  })
})

test("git clone runs in a cwd that already exists (the repository root), never the not-yet-created .tools directory", () => {
  // `.tools/` is gitignored and nothing but `acquire` itself ever creates it,
  // so on a genuinely fresh checkout it does not exist yet when `acquire`
  // starts. An injected `run` cannot by itself catch a clone spawned with a
  // missing `cwd` - that only fails inside the real, un-injected
  // `spawnSync` - so this pins the ARGUMENT SHAPE instead: the clone must
  // run from a directory guaranteed to exist already, never from the
  // directory `git clone` itself is responsible for creating.
  withTempDir((repoRoot) => {
    const binaryPath = binaryPathUnder(repoRoot)
    const buildScript = buildScriptUnder(repoRoot)
    const cwds: string[] = []
    const run: CommandRunner = (command, args, cwd) => {
      cwds.push(cwd)
      if (command === "git" && args[0] === "clone") {
        expect(fs.existsSync(cwd)).toBe(true)
        fs.mkdirSync(path.dirname(binaryPath), { recursive: true })
        fs.writeFileSync(buildScript, "#!/bin/bash\n")
      }
      if (command === buildScript) fs.writeFileSync(binaryPath, "#!/bin/sh\n")
      return { status: 0, output: "" }
    }
    acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })
    expect(cwds[0]).toBe(repoRoot)
  })
})

test("a failing checkout names the likely cause and both remedies, not just git's raw output", () => {
  withTempDir((repoRoot) => {
    const cloneDir = cloneDirUnder(repoRoot)
    fs.mkdirSync(cloneDir, { recursive: true })
    const run: CommandRunner = (command, args) => {
      if (command === "git" && args[0] === "checkout") {
        return { status: 1, output: "fatal: reference is not a tree: b09727d8ee0eb2a062da74b530b637436296330c" }
      }
      return { status: 0, output: "" }
    }
    expect(() => acquire(PIN, { repoRoot, run })).toThrow(/fetch/i)
    expect(() => acquire(PIN, { repoRoot, run })).toThrow(new RegExp(cloneDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  })
})

test("acquire skips cloning when the checkout directory already exists, but still checks out and builds", () => {
  withTempDir((repoRoot) => {
    const cloneDir = cloneDirUnder(repoRoot)
    fs.mkdirSync(cloneDir, { recursive: true })
    fs.writeFileSync(buildScriptUnder(repoRoot), "#!/bin/bash\n")
    const binaryPath = binaryPathUnder(repoRoot)
    const buildScript = buildScriptUnder(repoRoot)
    const calls: string[] = []
    const run = recordingRunner(
      {
        git: () => ({ status: 0, output: "" }),
        [buildScript]: () => {
          fs.mkdirSync(path.dirname(binaryPath), { recursive: true })
          fs.writeFileSync(binaryPath, "#!/bin/sh\n")
          return { status: 0, output: "" }
        },
      },
      calls,
    )
    const result = acquire(PIN, { repoRoot, run, env: QMAKE_EXPLICIT })
    expect(result).toBe(binaryPath)
    expect(calls.some((call) => call.startsWith("git clone"))).toBe(false)
    expect(calls).toContain(`git checkout ${PIN.commit}`)
  })
})
