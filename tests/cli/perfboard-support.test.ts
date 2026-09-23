/**
 * Tests for tools/cli/perfboard-support.ts: `-C`/`--directory`, exercised
 * against every kind of verb (`board-info`, `cuts`, `check`, `update`,
 * `stripboard`) since resolveDirectoryFlag is a cross-cutting concern of the
 * CLI's own dispatch, not any one verb's behavior.
 *
 * `bun run <script>` chdirs to the package root before running the script,
 * so process cwd is never the board the operator meant. This is the
 * regression coverage for that defect: nothing exercised `-C` before it, and
 * nothing exercised the exact shape `bun run` produces (process cwd at the
 * repo root, `-C` naming a board underneath it) either.
 *
 * Split out of tests/cli/perfboard.test.ts to mirror tools/cli's own
 * three-file seam; `tree`, `boardDir` and `okCheck` are shared fixtures that
 * also back the other two split files, so they live in
 * perfboard-test-helpers.ts rather than being duplicated here.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { tree, boardDir, okCheck } from "./perfboard-test-helpers.ts"

test("-C resolves a relative directory against opts.cwd, exactly the shape bun run produces", async () => {
  // opts.cwd stands in for process.cwd() here - the "repo root" bun run
  // leaves the process standing in - and -C is relative, exactly as the
  // documented invocation `bun run perfboard -C boards/pt2399-core ...`
  // would pass it.
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["-C", "boards/demo", "board-info"], {
      cwd: root,
      log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("demo")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C targets a board from outside it for a board-scoped verb (cuts)", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["-C", boardDir(root), "cuts"], {
      cwd: root,
      log: (line) => lines.push(line),
      error: () => {},
      verbDeps: { runVeroroute: () => ({ status: 0, output: "CUT_STATE OK\n" }) },
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("CUT_STATE OK")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C targets an aggregate from outside it for a walk-down verb (check)", async () => {
  const root = tree()
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-elsewhere-"))
  try {
    const checked: string[] = []
    const code = await runCli(["-C", root, "check"], {
      cwd: elsewhere,
      log: () => {},
      check: (declaration) => { checked.push(declaration.vrtPath); return okCheck(declaration) },
    })
    expect(code).toBe(0)
    expect(checked).toEqual([path.join(root, "boards", "demo", "demo.vrt")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(elsewhere, { recursive: true, force: true })
  }
})

test("--directory is the long form of -C", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["--directory", "boards/demo", "board-info"], {
      cwd: root, log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("demo")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C composes with update's --allow-dirty, in the documented flag order", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const lines: string[] = []
    const code = await runCli(["-C", "boards/demo", "update", "--allow-dirty"], {
      cwd: root,
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

test("-C composes with stripboard's --strips regardless of which comes first", async () => {
  const root = tree()
  try {
    const vrtPath = path.join(boardDir(root), "demo.vrt")
    fs.writeFileSync(vrtPath, "ORIGINAL")
    const deps = {
      git: () => ({ status: 0, stdout: "" }),
      exportNetlist: () => Promise.resolve("( { EESchema Netlist Version 1.1 created x }\n)\n*\n"),
      runVeroroute: (args: readonly string[]) => {
        const outIndex = args.indexOf("-o")
        fs.writeFileSync(args[outIndex + 1] as string, "STRIPPED")
        return { status: 0, output: "" }
      },
    }

    const lines: string[] = []
    const code = await runCli(["stripboard", "--strips", "horizontal", "-C", "boards/demo"], {
      cwd: root, log: (line) => lines.push(line), error: () => {}, verbDeps: deps,
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("converted to horizontal strips")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C at a nonexistent path refuses naming it, and never falls through to cwd", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["-C", path.join(root, "does-not-exist"), "board-info"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    const message = errors.join("\n")
    expect(message).toContain(path.join(root, "does-not-exist"))
    expect(message).toContain("does not exist")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C at a file, not a directory, refuses naming it", async () => {
  const root = tree()
  try {
    const filePath = path.join(root, "boards", "demo", "perfboard.json")
    const errors: string[] = []
    const code = await runCli(["-C", filePath, "board-info"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    const message = errors.join("\n")
    expect(message).toContain(filePath)
    expect(message).toContain("not a directory")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("-C with no value refuses, the way --strips does", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["board-info", "-C"], {
      cwd: boardDir(root), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("-C")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("an explicit -C wins over the injected cwd, resolved against that same injected cwd", async () => {
  // Precedence: -C always determines the effective working directory when
  // given. opts.cwd (a stand-in for process.cwd()) is only the anchor a
  // RELATIVE -C resolves against - here it is deliberately an unrelated,
  // board-less directory, so a passing result proves -C won rather than
  // opts.cwd silently being used instead.
  const root = tree()
  const unrelated = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-unrelated-"))
  try {
    const lines: string[] = []
    const code = await runCli(["-C", boardDir(root), "board-info"], {
      cwd: unrelated, log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("demo")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(unrelated, { recursive: true, force: true })
  }
})
