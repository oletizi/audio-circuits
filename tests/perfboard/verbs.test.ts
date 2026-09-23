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
  // F6: assert a distinctive phrase from the deliberate refusal, not a token
  // ("CUT_STATE") that also appears in an incidental TypeError's message if
  // the refusal itself is ever accidentally removed - `.trim()` on
  // `undefined` throws a message that quotes the source expression
  // containing "CUT_STATE", which would let a gutted refusal pass this test.
  await withVrt((vrtPath) => {
    expect(() =>
      runCuts(declaration(vrtPath), {
        runVeroroute: () => ({ status: 0, output: "CUT r1c1\nSOLDER r2c2\n" }),
      }),
    ).toThrow(/no longer understands/)
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

test("update on a non-zero exit THROWS, leaves the layout byte-identical, and does not replace", async () => {
  // F1: a failed write must never come back as a normal return value - a
  // report string returned on a failed run could be logged and mistaken for
  // a real answer, which is this workflow's defining failure shape.
  await withVrt(async (vrtPath) => {
    const before = fs.readFileSync(vrtPath, "utf8")
    await expect(
      runUpdate(declaration(vrtPath), { allowDirty: false }, {
        git: stubGit(true, false),
        exportNetlist: netlist,
        runVeroroute: () => ({ status: 1, output: "veroroute: could not route" }),
      }),
    ).rejects.toThrow(/unchanged/)
    expect(fs.readFileSync(vrtPath, "utf8")).toBe(before)
  })
})

test("a binary that writes PARTIAL output to -o and then exits non-zero throws and leaves no leftover file", async () => {
  // The ordinary "attempted, failed partway" case, not a crash: the binary
  // did write something at the -o path before deciding to fail. That file
  // must not survive the call, or `git add -A` would sweep it into a commit.
  await withVrt(async (vrtPath) => {
    let outPath = ""
    await expect(
      runUpdate(declaration(vrtPath), { allowDirty: false }, {
        git: stubGit(true, false),
        exportNetlist: netlist,
        runVeroroute: (args) => {
          outPath = flagValue(args, "-o")
          fs.writeFileSync(outPath, "PARTIAL-GARBAGE")
          return { status: 1, output: "veroroute: routing failed partway" }
        },
      }),
    ).rejects.toThrow(/unchanged/)
    expect(fs.existsSync(outPath)).toBe(false)
    expect(fs.readdirSync(path.dirname(vrtPath))).toEqual([path.basename(vrtPath)])
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("ORIGINAL")
  })
})

test("update on success carries the binary's own output into the report (F4)", async () => {
  await withVrt(async (vrtPath) => {
    const report = await runUpdate(declaration(vrtPath), { allowDirty: false }, {
      git: stubGit(true, false),
      exportNetlist: netlist,
      runVeroroute: (args) => {
        const outPath = flagValue(args, "-o")
        fs.writeFileSync(outPath, "UPDATED")
        return { status: 0, output: "PLAN: move R4 to r3c7\n" }
      },
    })
    expect(report).toContain("PLAN: move R4 to r3c7")
  })
})

test("update cleans up the -o file left behind when the spawn itself throws", async () => {
  await withVrt(async (vrtPath) => {
    let outPath = ""
    await expect(
      runUpdate(declaration(vrtPath), { allowDirty: false }, {
        git: stubGit(true, false),
        exportNetlist: netlist,
        runVeroroute: (args) => {
          outPath = flagValue(args, "-o")
          fs.writeFileSync(outPath, "PARTIAL-BEFORE-CRASH")
          throw new Error("could not run veroroute: signal killed")
        },
      }),
    ).rejects.toThrow(/signal killed/)
    expect(fs.existsSync(outPath)).toBe(false)
    expect(fs.readdirSync(path.dirname(vrtPath))).toEqual([path.basename(vrtPath)])
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

test("stripboard throws and cleans up the -o file when --set-strips writes partial output and exits non-zero", async () => {
  await withVrt(async (vrtPath) => {
    let outPath = ""
    await expect(
      runStripboard(
        declaration(vrtPath),
        { strips: "horizontal", allowDirty: false },
        {
          git: stubGit(true, false),
          runVeroroute: (args) => {
            outPath = flagValue(args, "-o")
            fs.writeFileSync(outPath, "PARTIAL-GARBAGE")
            return { status: 1, output: "veroroute: could not set strips" }
          },
        },
      ),
    ).rejects.toThrow(/unchanged/)
    expect(fs.existsSync(outPath)).toBe(false)
    expect(fs.readdirSync(path.dirname(vrtPath))).toEqual([path.basename(vrtPath)])
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("ORIGINAL")
  })
})

// F2: a fill-step failure after a successful conversion must say plainly that
// the conversion succeeded and the layout is converted-but-not-filled, never
// "unchanged" - the layout WAS changed.
test("stripboard whose fill step exits non-zero reports the layout as converted-but-not-filled, never unchanged", async () => {
  await withVrt(async (vrtPath) => {
    let caught: Error | undefined
    try {
      await runStripboard(
        declaration(vrtPath),
        { strips: "horizontal", allowDirty: false },
        {
          git: stubGit(true, false),
          exportNetlist: netlist,
          runVeroroute: (args) => {
            const outPath = flagValue(args, "-o")
            if (args[0] === "--set-strips") {
              fs.writeFileSync(outPath, "STRIPPED")
              return { status: 0, output: "" }
            }
            return { status: 1, output: "update failed" }
          },
        },
      )
    } catch (error) {
      caught = error instanceof Error ? error : undefined
    }
    if (caught === undefined) throw new Error("test bug: runStripboard did not throw")
    // The headline must say the conversion succeeded and the layout is
    // NOT filled - not just repeat the inner update step's own "unchanged"
    // framing (which is preserved verbatim further down per F3, correctly
    // describing that ONE step in isolation).
    expect(caught.message).toContain("SUCCEEDED")
    expect(caught.message).toContain("NOT filled")
    expect(caught.message.split("\n")[0]).not.toMatch(/unchanged/)
    // The conversion write landed - the bytes on disk are the converted ones.
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("STRIPPED")
  })
})

// F3: a THROW from anywhere inside the fill step (not just a non-zero exit)
// must be caught the same way, and the original error's text preserved.
test("stripboard whose fill step throws (not just exits non-zero) still reports converted-but-not-filled, with the original error preserved", async () => {
  await withVrt(async (vrtPath) => {
    let caught: Error | undefined
    try {
      await runStripboard(
        declaration(vrtPath),
        { strips: "vertical", allowDirty: false },
        {
          git: stubGit(true, false),
          exportNetlist: () => Promise.reject(new Error("circuits/demo.ts: no footprint for R9")),
          runVeroroute: (args) => {
            const outPath = flagValue(args, "-o")
            fs.writeFileSync(outPath, "STRIPPED")
            return { status: 0, output: "" }
          },
        },
      )
    } catch (error) {
      caught = error instanceof Error ? error : undefined
    }
    if (caught === undefined) throw new Error("test bug: runStripboard did not throw")
    expect(caught.message).toContain("SUCCEEDED")
    expect(caught.message).toContain("NOT filled")
    expect(caught.message).toContain("no footprint for R9")
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("STRIPPED")
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

test("stripboard's inner update call skips the guard's git check entirely, not just tolerates it", async () => {
  // A call-count assertion pins HOW the guard talks to git, not WHAT must be
  // true. This test fails for the right reason instead: the git stub reports
  // clean on the FIRST diff check (the outer guard, which must run for
  // real) and dirty on any diff check after that. With allowDirty: true
  // correctly threaded into the inner update call, that inner guard returns
  // before ever calling git, so no second diff check happens and the run
  // succeeds. If the chaining regressed - the inner call reaching git at all
  // - the second diff check reports dirty and assertLayoutRecoverable
  // throws, which surfaces here as a direct failure, not a broken tally.
  await withVrt(async (vrtPath) => {
    let diffCalls = 0
    const git: GitRunner = (args) => {
      if (args[0] === "ls-files") return { status: 0, stdout: "" }
      if (args[0] === "diff") {
        diffCalls += 1
        return { status: diffCalls === 1 ? 0 : 1, stdout: "" }
      }
      throw new Error(`unexpected git call: ${args.join(" ")}`)
    }
    const report = await runStripboard(
      declaration(vrtPath),
      { strips: "horizontal", allowDirty: false },
      {
        git,
        exportNetlist: netlist,
        runVeroroute: (args) => {
          const outPath = flagValue(args, "-o")
          fs.writeFileSync(outPath, args[0] === "--set-strips" ? "STRIPPED" : "FILLED")
          return { status: 0, output: "ok" }
        },
      },
    )
    expect(fs.readFileSync(vrtPath, "utf8")).toBe("FILLED")
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

test("edit's real, un-injected launcher does not crash the host process when the spawn fails asynchronously", async () => {
  // Exercises the actual defaultLaunchEditor, not an injected stub: a binary
  // that passes the (stubbed) executable check but does not actually exist
  // triggers node's async 'error' event on the detached child (ENOENT) -
  // exactly the case defaultLaunchEditor's 'error' handler exists for. Without
  // that handler this throws an uncaught exception from the process' event
  // loop rather than the assertions below, since node crashes the process by
  // default on an unhandled child 'error' event.
  const fakeBinary = path.join(os.tmpdir(), `pt2399-fake-veroroute-${process.pid}-${Date.now()}`)
  const decl = declaration("/tmp/nonexistent-board.vrt")
  const report = runEdit(decl, {
    env: { VEROROUTE: fakeBinary },
    isExecutable: () => true,
  })
  expect(report).toContain(fakeBinary)
  // Give the async spawn error a tick to fire before the test ends.
  await new Promise((resolve) => setTimeout(resolve, 50))
})
