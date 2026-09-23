/**
 * Tests for tools/cli/perfboard-binary-verbs.ts: the four binary-backed
 * verbs (`cuts`, `update`, `stripboard`, `edit`) and `veroroute`, all
 * dispatched from `runCli` in tools/cli/perfboard.ts.
 *
 * Split out of tests/cli/perfboard.test.ts to mirror that production seam;
 * see this repository's shared project rules for the file-size ceiling this
 * split exists to satisfy. `tree` and `boardDir` are shared fixtures that
 * also back tests/cli/perfboard.test.ts and perfboard-support.test.ts, so
 * they live in perfboard-test-helpers.ts rather than being duplicated here.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import type { Pin, BinaryResolution, AcquireOptions } from "../../tools/perfboard/acquire.ts"
import { tree, boardDir } from "./perfboard-test-helpers.ts"

// ---------------------------------------------------------------------------
// dispatch: the four binary-backed verbs reach their real implementations
// ---------------------------------------------------------------------------

test("cuts dispatches to the real implementation via injected deps, never the real binary", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["cuts"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: () => {},
      verbDeps: { runVeroroute: () => ({ status: 0, output: "CUT_STATE OK\nCUT r1c1\n" }) },
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("CUT_STATE OK")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("edit dispatches to the real implementation via injected deps, never a real GUI process", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    let launched = false
    const code = await runCli(["edit"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: () => {},
      verbDeps: {
        env: { VEROROUTE: "/fake/veroroute" },
        isExecutable: () => true,
        launchEditor: () => { launched = true },
      },
    })
    expect(code).toBe(0)
    expect(launched).toBe(true)
    expect(lines.join("\n")).toContain("Opened")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("update dispatches to the real implementation via injected deps, never a real spawn", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const lines: string[] = []
    const code = await runCli(["update"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: () => {},
      verbDeps: {
        git: () => ({ status: 0, stdout: "" }),
        exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
        runVeroroute: (args) => {
          const outIndex = args.indexOf("-o")
          fs.writeFileSync(args[outIndex + 1] as string, "UPDATED")
          return { status: 0, output: "" }
        },
      },
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("rewritten in place")
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("UPDATED")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("stripboard dispatches to the real implementation via injected deps, never a real spawn", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const lines: string[] = []
    const code = await runCli(["stripboard", "--strips", "horizontal"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: () => {},
      verbDeps: {
        git: () => ({ status: 0, stdout: "" }),
        exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
        runVeroroute: (args) => {
          const outIndex = args.indexOf("-o")
          fs.writeFileSync(args[outIndex + 1] as string, "STRIPPED")
          return { status: 0, output: "" }
        },
      },
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("converted to horizontal strips")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// F1: a failed update/stripboard exits 1, on stderr, never a silent stdout 0
// ---------------------------------------------------------------------------

test("update whose veroroute exits non-zero exits 1, writes FAIL to stderr, and leaves the layout untouched", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["update"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
      verbDeps: {
        git: () => ({ status: 0, stdout: "" }),
        exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
        runVeroroute: () => ({ status: 3, output: "reconcile failed: unmapped part R9" }),
      },
    })
    expect(code).toBe(1)
    expect(lines).toEqual([])
    const stderr = errors.join("\n")
    expect(stderr).toContain(`FAIL ${vrtPath}`)
    expect(stderr).toContain("unchanged")
    expect(stderr).toContain("unmapped part R9")
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("ORIGINAL")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("stripboard whose --set-strips exits non-zero exits 1, writes FAIL to stderr, and leaves the layout untouched", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["stripboard", "--strips", "horizontal"], {
      cwd: boardDir(root),
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
      verbDeps: {
        git: () => ({ status: 0, stdout: "" }),
        runVeroroute: () => ({ status: 1, output: "could not set strips" }),
      },
    })
    expect(code).toBe(1)
    expect(lines).toEqual([])
    const stderr = errors.join("\n")
    expect(stderr).toContain(`FAIL ${vrtPath}`)
    expect(stderr).toContain("unchanged")
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("ORIGINAL")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("stripboard whose fill step fails exits 1 and stderr says the layout was converted and is not filled", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const errors: string[] = []
    const code = await runCli(["stripboard", "--strips", "horizontal"], {
      cwd: boardDir(root),
      log: () => {},
      error: (line) => errors.push(line),
      verbDeps: {
        git: () => ({ status: 0, stdout: "" }),
        exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
        runVeroroute: (args) => {
          const outIndex = args.indexOf("-o")
          if (args[0] === "--set-strips") {
            fs.writeFileSync(args[outIndex + 1] as string, "STRIPPED")
            return { status: 0, output: "" }
          }
          return { status: 1, output: "update failed" }
        },
      },
    })
    expect(code).toBe(1)
    const stderr = errors.join("\n")
    expect(stderr).toContain(`FAIL ${vrtPath}`)
    expect(stderr).toContain("SUCCEEDED")
    expect(stderr).toContain("NOT filled")
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("STRIPPED")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// --allow-dirty reaches update and stripboard
// ---------------------------------------------------------------------------

test("update without --allow-dirty refuses a dirty layout; with it, the write proceeds", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const dirtyGit = () => ({ status: 0, stdout: "" }) // tracked
    const deps = {
      git: (args: readonly string[]) => (args[0] === "diff" ? { status: 1, stdout: "" } : dirtyGit()),
      exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
      runVeroroute: (args: readonly string[]) => {
        const outIndex = args.indexOf("-o")
        fs.writeFileSync(args[outIndex + 1] as string, "UPDATED")
        return { status: 0, output: "" }
      },
    }

    const errors: string[] = []
    const refused = await runCli(["update"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line), verbDeps: deps,
    })
    expect(refused).toBe(1)
    expect(errors.join("\n")).toContain("uncommitted changes")

    const lines: string[] = []
    const allowed = await runCli(["update", "--allow-dirty"], {
      cwd: boardDir(root), log: (line) => lines.push(line), error: () => {}, verbDeps: deps,
    })
    expect(allowed).toBe(0)
    expect(lines.join("\n")).toContain("rewritten in place")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("stripboard without --allow-dirty refuses a dirty layout; with it, the write proceeds", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const deps = {
      git: (args: readonly string[]) => (args[0] === "diff" ? { status: 1, stdout: "" } : { status: 0, stdout: "" }),
      exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
      runVeroroute: (args: readonly string[]) => {
        const outIndex = args.indexOf("-o")
        fs.writeFileSync(args[outIndex + 1] as string, "STRIPPED")
        return { status: 0, output: "" }
      },
    }

    const errors: string[] = []
    const refused = await runCli(["stripboard", "--strips", "vertical"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line), verbDeps: deps,
    })
    expect(refused).toBe(1)
    expect(errors.join("\n")).toContain("uncommitted changes")

    const lines: string[] = []
    const allowed = await runCli(["stripboard", "--strips", "vertical", "--allow-dirty"], {
      cwd: boardDir(root), log: (line) => lines.push(line), error: () => {}, verbDeps: deps,
    })
    expect(allowed).toBe(0)
    expect(lines.join("\n")).toContain("converted to vertical strips")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// stripboard's strip direction
// ---------------------------------------------------------------------------

test("stripboard without a direction exits 1 naming the choice and why there is no default", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["stripboard"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("strip direction")
    expect(errors.join("\n")).toContain("not a preference this tool can default")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("an invalid strip direction exits 1 listing the two valid values", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["stripboard", "--strips", "diagonal"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    const message = errors.join("\n")
    expect(message).toContain("horizontal")
    expect(message).toContain("vertical")
    expect(message).toContain("diagonal")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// mutating/binary-backed verbs act on exactly one declared board
// ---------------------------------------------------------------------------

for (const verb of ["cuts", "update", "stripboard", "edit"]) {
  test(`${verb} run outside a board directory exits 1, not a batch walk`, async () => {
    const root = tree()
    try {
      const errors: string[] = []
      const code = await runCli([verb], {
        cwd: root, log: () => {}, error: (line) => errors.push(line),
      })
      expect(code).toBe(1)
      expect(errors.join("\n")).toContain("declares no board")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
}

test("an unknown flag is rejected rather than silently ignored", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["update", "--bogus-flag"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("--bogus-flag")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// veroroute: acquisition is checked, never implicit, never re-run needlessly
// ---------------------------------------------------------------------------

test("veroroute reports an already-built binary and its pinned commit without acquiring", async () => {
  const lines: string[] = []
  let acquireCalled = false
  const code = await runCli(["veroroute"], {
    repoRoot: "/repo",
    env: {},
    log: (line) => lines.push(line),
    error: () => {},
    readPin: () => ({ repo: "git@github.com:x/veroroute-perfboard.git", commit: "abc123" }),
    resolveBinary: () => ({ path: "/repo/.tools/veroroute-perfboard/veroroute", mode: "acquired" }),
    binaryExists: (p: string) => p === "/repo/.tools/veroroute-perfboard/veroroute",
    acquire: () => { acquireCalled = true; return "/should/not/be/called" },
  })
  expect(code).toBe(0)
  expect(acquireCalled).toBe(false)
  const output = lines.join("\n")
  expect(output).toContain("/repo/.tools/veroroute-perfboard/veroroute")
  expect(output).toContain("abc123")
})

test("veroroute acquires when no binary exists yet at the resolved path", async () => {
  const lines: string[] = []
  const calls: Array<{ pin: Pin; opts: AcquireOptions }> = []
  const code = await runCli(["veroroute"], {
    repoRoot: "/repo",
    env: {},
    log: (line) => lines.push(line),
    error: () => {},
    readPin: () => ({ repo: "git@github.com:x/veroroute-perfboard.git", commit: "abc123" }),
    resolveBinary: () => ({ path: "/repo/.tools/veroroute-perfboard/veroroute", mode: "acquired" }),
    binaryExists: () => false,
    acquire: (pin, opts) => { calls.push({ pin, opts }); return "/repo/.tools/veroroute-perfboard/veroroute" },
  })
  expect(code).toBe(0)
  expect(calls.length).toBe(1)
  expect(lines.join("\n")).toContain("/repo/.tools/veroroute-perfboard/veroroute")
})

test("veroroute does not acquire when VEROROUTE points at the operator's own explicit checkout", async () => {
  const lines: string[] = []
  const code = await runCli(["veroroute"], {
    repoRoot: "/repo",
    env: { VEROROUTE: "/dev/veroroute-perfboard/veroroute" },
    log: (line) => lines.push(line),
    error: () => {},
    readPin: () => { throw new Error("must not be called in explicit mode") },
    resolveBinary: () => ({ path: "/dev/veroroute-perfboard/veroroute", mode: "explicit" }),
    binaryExists: () => { throw new Error("must not be called in explicit mode") },
    acquire: () => { throw new Error("must not be called in explicit mode") },
  })
  expect(code).toBe(0)
  const output = lines.join("\n")
  expect(output).toContain("/dev/veroroute-perfboard/veroroute")
  expect(output).toContain("VEROROUTE")
})

test("veroroute --force rebuilds even when a binary already exists at the resolved path", async () => {
  const calls: string[] = []
  const code = await runCli(["veroroute", "--force"], {
    repoRoot: "/repo",
    env: {},
    log: () => {},
    error: () => {},
    readPin: () => ({ repo: "git@github.com:x/veroroute-perfboard.git", commit: "abc123" }),
    resolveBinary: () => ({ path: "/repo/.tools/veroroute-perfboard/veroroute", mode: "acquired" }),
    binaryExists: () => true,
    acquire: () => { calls.push("acquire"); return "/repo/.tools/veroroute-perfboard/veroroute" },
  })
  expect(code).toBe(0)
  expect(calls).toEqual(["acquire"])
})

test("no verb other than veroroute triggers acquisition, even when the binary is missing", async () => {
  const root = tree()
  try {
    let acquireCalled = false
    const errors: string[] = []
    const code = await runCli(["cuts"], {
      cwd: boardDir(root),
      log: () => {},
      error: (line) => errors.push(line),
      acquire: () => { acquireCalled = true; return "/should/not/happen" },
      verbDeps: {
        runVeroroute: () => { throw new Error("VEROROUTE is not set, and this check has no default binary path.") },
      },
    })
    expect(code).toBe(1)
    expect(acquireCalled).toBe(false)
    expect(errors.join("\n")).toContain("VEROROUTE")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// F9: the top-level repoRoot option threads into the binary-backed verbs too
// ---------------------------------------------------------------------------

test("cuts resolves its binary against the top-level repoRoot option, not just veroroute", async () => {
  // Before F9, RunCliOptions.repoRoot silently had no effect on cuts/update/
  // stripboard/edit - each fell back to moduleRepoRoot() regardless. This
  // pins the real (un-injected) resolution path: no runVeroroute stub, no
  // repoRoot on verbDeps directly - only the top-level opts.repoRoot, and a
  // tiny test-authored stand-in executable at the path that resolution rule
  // computes (never the real veroroute binary).
  const root = tree()
  const fakeRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-f9-reporoot-"))
  try {
    const binaryPath = path.join(
      fakeRepoRoot, ".tools", "veroroute-perfboard", "veroroute.app", "Contents", "MacOS", "veroroute",
    )
    fs.mkdirSync(path.dirname(binaryPath), { recursive: true })
    fs.writeFileSync(binaryPath, "#!/bin/sh\necho 'CUT_STATE OK'\n")
    fs.chmodSync(binaryPath, 0o755)

    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["cuts"], {
      cwd: boardDir(root),
      repoRoot: fakeRepoRoot,
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
      verbDeps: { env: {} },
    })
    expect(errors).toEqual([])
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("CUT_STATE OK")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(fakeRepoRoot, { recursive: true, force: true })
  }
})
