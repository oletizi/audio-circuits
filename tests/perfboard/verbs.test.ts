import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCuts, runUpdate, runStripboard, runEdit } from "../../tools/perfboard/verbs.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import type { GitRunner } from "../../tools/perfboard/mutate.ts"

function declaration(vrtPath: string): PerfboardDeclaration {
  return {
    file: "/tmp/perfboard.json", dir: "/tmp",
    circuitPath: "/tmp/circuit.ts", exportName: "circuit", vrtPath,
  }
}

async function withVrt(run: (vrtPath: string) => void | Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-verbs-"))
  const vrtPath = path.join(dir, "board.vrt")
  fs.writeFileSync(vrtPath, "ORIGINAL")
  try {
    await run(vrtPath)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** git stub: `tracked` decides ls-files, `dirty` decides diff --quiet. */
function stubGit(tracked: boolean, dirty: boolean): GitRunner {
  return (args) => {
    if (args[0] === "ls-files") return { status: tracked ? 0 : 1, stdout: "" }
    if (args[0] === "diff") return { status: dirty ? 1 : 0, stdout: "" }
    throw new Error(`unexpected git call: ${args.join(" ")}`)
  }
}

function flagValue(args: readonly string[], flag: string): string {
  const i = args.indexOf(flag)
  const value = i === -1 ? undefined : args[i + 1]
  if (value === undefined) throw new Error(`test bug: ${flag} not found in [${args.join(" ")}]`)
  return value
}

const netlist = () => Promise.resolve("( { EESchema Netlist Version 1.1 created  x }\n)\n*\n")

// ---------------------------------------------------------------------------
// cuts
// ---------------------------------------------------------------------------

test("cuts reports the CUT_STATE/CUT/CUT_CONFLICT/SOLDER/CUT_UNCONNECTED_PIN lines from a dump", async () => {
  await withVrt((vrtPath) => {
    const output = [
      "CUT_STATE OK",
      "CUT r3c4",
      "CUT_CONFLICT r5c1",
      "SOLDER r2c2",
      "CUT_UNCONNECTED_PIN r9c1",
      "some other line the binary might print",
    ].join("\n")
    const report = runCuts(declaration(vrtPath), {
      runVeroroute: () => ({ status: 0, output }),
    })
    expect(report).toContain("CUT_STATE OK")
    expect(report).toContain("CUT r3c4")
    expect(report).toContain("CUT_CONFLICT r5c1")
    expect(report).toContain("SOLDER r2c2")
    expect(report).toContain("CUT_UNCONNECTED_PIN r9c1")
    expect(report).not.toContain("some other line")
  })
})

test("a dump with no CUT_STATE line refuses rather than reporting an empty list", async () => {
  await withVrt((vrtPath) => {
    expect(() =>
      runCuts(declaration(vrtPath), {
        runVeroroute: () => ({ status: 0, output: "CUT r1c1\nSOLDER r2c2\n" }),
      }),
    ).toThrow(/CUT_STATE/)
  })
})

test("CUT_STATE NOT_APPLICABLE reports isolated-hole mode and names stripboard", async () => {
  await withVrt((vrtPath) => {
    const report = runCuts(declaration(vrtPath), {
      runVeroroute: () => ({ status: 0, output: "CUT_STATE NOT_APPLICABLE\n" }),
    })
    expect(report).toContain("NOT_APPLICABLE")
    expect(report).toContain("stripboard")
  })
})

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test("update calls the guard before spawning; the spawn never happens when the guard throws", async () => {
  await withVrt(async (vrtPath) => {
    let spawned = false
    await expect(
      runUpdate(declaration(vrtPath), { allowDirty: false }, {
        git: stubGit(false, false),
        exportNetlist: netlist,
        runVeroroute: () => {
          spawned = true
          return { status: 0, output: "" }
        },
      }),
    ).rejects.toThrow(/not tracked/)
    expect(spawned).toBe(false)
  })
})

test("update passes -o in the same directory as the layout, and replaces atomically on exit 0", async () => {
  await withVrt(async (vrtPath) => {
    let outPath = ""
    const report = await runUpdate(declaration(vrtPath), { allowDirty: false }, {
      git: stubGit(true, false),
      exportNetlist: netlist,
      runVeroroute: (args) => {
        outPath = flagValue(args, "-o")
        fs.writeFileSync(outPath, "UPDATED")
        return { status: 0, output: "ok" }
      },
    })
    expect(path.dirname(outPath)).toBe(path.dirname(vrtPath))
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("UPDATED")
    expect(fs.existsSync(outPath)).toBe(false)
    expect(report).toContain("rewritten in place")
    expect(report).toContain("git checkout")
  })
})

test("update on a non-zero exit leaves the layout byte-identical and does not replace", async () => {
  await withVrt(async (vrtPath) => {
    const before = fs.readFileSync(vrtPath, "utf8")
    const report = await runUpdate(declaration(vrtPath), { allowDirty: false }, {
      git: stubGit(true, false),
      exportNetlist: netlist,
      runVeroroute: () => ({ status: 1, output: "veroroute: could not route" }),
    })
    expect(fs.readFileSync(vrtPath, "utf8")).toBe(before)
    expect(report).toContain("unchanged")
  })
})

// ---------------------------------------------------------------------------
// stripboard
// ---------------------------------------------------------------------------

test("stripboard refuses without a strip direction", async () => {
  await withVrt(async (vrtPath) => {
    await expect(
      runStripboard(declaration(vrtPath), { strips: undefined, allowDirty: false }, {}),
    ).rejects.toThrow(/strip direction/)
  })
})

test("stripboard sets strips, replaces, then runs the update path with allowDirty: true", async () => {
  await withVrt(async (vrtPath) => {
    const gitCalls: (readonly string[])[] = []
    const git: GitRunner = (args) => {
      gitCalls.push(args)
      return stubGit(true, false)(args, "/tmp")
    }
    let sawSetStrips = false
    let sawUpdate = false
    const report = await runStripboard(
      declaration(vrtPath),
      { strips: "horizontal", allowDirty: false },
      {
        git,
        exportNetlist: netlist,
        runVeroroute: (args) => {
          const outPath = flagValue(args, "-o")
          if (args[0] === "--set-strips") {
            sawSetStrips = true
            expect(flagValue(args, "--strips")).toBe("horizontal")
            fs.writeFileSync(outPath, "STRIPPED")
          } else if (args[0] === "--update") {
            sawUpdate = true
            fs.writeFileSync(outPath, "FILLED")
          } else {
            throw new Error(`unexpected veroroute args: ${args.join(" ")}`)
          }
          return { status: 0, output: "ok" }
        },
      },
    )
    expect(sawSetStrips).toBe(true)
    expect(sawUpdate).toBe(true)
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("FILLED")
    // The outer guard call (allowDirty: false) makes exactly two git calls
    // (ls-files, diff). If the inner update call did not receive
    // allowDirty: true, its own guard would make two MORE git calls here -
    // this is the load-bearing assertion that it did.
    expect(gitCalls.length).toBe(2)
    expect(report).toContain("horizontal strips")
  })
})

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test("edit refuses when the binary is not executable, naming the veroroute verb", () => {
  const decl = declaration("/tmp/board.vrt")
  let launched = false
  expect(() =>
    runEdit(decl, {
      env: { VEROROUTE: "/fake/veroroute" },
      isExecutable: () => false,
      launchEditor: () => {
        launched = true
      },
    }),
  ).toThrow(/"veroroute" verb/)
  expect(launched).toBe(false)
})

test("edit hands the layout to the binary and returns", () => {
  const decl = declaration("/tmp/board.vrt")
  let launchedBinary: string | undefined
  let launchedVrtPath: string | undefined
  const report = runEdit(decl, {
    env: { VEROROUTE: "/fake/veroroute" },
    isExecutable: () => true,
    launchEditor: (binary, vrtPath) => {
      launchedBinary = binary
      launchedVrtPath = vrtPath
    },
  })
  expect(launchedBinary).toBe("/fake/veroroute")
  expect(launchedVrtPath).toBe("/tmp/board.vrt")
  expect(report).toContain("/tmp/board.vrt")
})
