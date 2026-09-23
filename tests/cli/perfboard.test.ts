/**
 * Tests for tools/cli/perfboard.ts: `runCli`'s own dispatch - `--help`, an
 * unknown verb, and the read-only `check`/`boards`/`board-info` verbs.
 *
 * The four binary-backed verbs (`cuts`, `update`, `stripboard`, `edit`) and
 * `veroroute` live in tools/cli/perfboard-binary-verbs.ts and are tested in
 * perfboard-binary-verbs.test.ts. The `-C`/`--directory` flag lives in
 * tools/cli/perfboard-support.ts and is tested in perfboard-support.test.ts.
 * This split mirrors that three-file production seam; `tree`, `boardDir` and
 * `okCheck` are shared fixtures used by more than one of those files, so they
 * live in perfboard-test-helpers.ts rather than being duplicated here.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { tree, boardDir, okCheck } from "./perfboard-test-helpers.ts"

test("--help exits 0 and lists every verb, with no leftover not-wired-up text", async () => {
  const lines: string[] = []
  const code = await runCli(["--help"], { log: (line) => lines.push(line) })
  expect(code).toBe(0)
  const usage = lines.join("\n")
  for (const verb of ["check", "cuts", "update", "stripboard", "edit", "board-info", "boards", "veroroute"]) {
    expect(usage).toContain(verb)
  }
  expect(usage).not.toContain("not wired up")
})

test("an unknown verb exits 1 rather than defaulting to check", async () => {
  const errors: string[] = []
  expect(await runCli(["frobnicate"], { error: (line) => errors.push(line) })).toBe(1)
  expect(errors.join("\n")).toContain("frobnicate")
})

test("check walks down from the directory it was run in", async () => {
  const root = tree()
  try {
    const checked: string[] = []
    const code = await runCli(["check"], {
      cwd: root,
      log: () => {},
      check: (declaration) => { checked.push(declaration.vrtPath); return okCheck(declaration) },
    })
    expect(code).toBe(0)
    expect(checked).toEqual([path.join(root, "boards", "demo", "demo.vrt")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a stale board fails the run but does not stop the batch", async () => {
  const root = tree()
  try {
    fs.mkdirSync(path.join(root, "boards", "second"), { recursive: true })
    fs.writeFileSync(
      path.join(root, "boards", "second", "perfboard.json"),
      JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "second.vrt" }),
    )
    let count = 0
    const code = await runCli(["check"], {
      cwd: root, log: () => {}, error: () => {},
      check: (declaration) => {
        count += 1
        return Promise.resolve({ declaration, ok: false, report: "Schematic delta\n  C17 added\n" })
      },
    })
    expect(code).toBe(1)
    expect(count).toBe(2)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a check that throws reaches the exit code, never a silent skip", async () => {
  const root = tree()
  try {
    const code = await runCli(["check"], {
      cwd: root, log: () => {}, error: () => {},
      check: () => Promise.reject(new Error("VEROROUTE is not set")),
    })
    expect(code).toBe(1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("no declarations anywhere is a failure, not a quiet success", async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-empty-"))
  try {
    expect(await runCli(["check"], { cwd: empty, log: () => {}, error: () => {} })).toBe(1)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }
})

test("boards reports a malformed declaration through the normal return path, not a rejection", async () => {
  const root = tree()
  try {
    fs.writeFileSync(path.join(root, "boards", "demo", "perfboard.json"), "{ not json")
    const errors: string[] = []
    const code = await runCli(["boards"], {
      cwd: root, log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain(path.join(root, "boards", "demo", "perfboard.json"))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("board-info reports a malformed declaration through the normal return path, not a rejection", async () => {
  const root = tree()
  try {
    fs.writeFileSync(path.join(root, "boards", "demo", "perfboard.json"), "{ not json")
    const errors: string[] = []
    const code = await runCli(["board-info"], {
      cwd: path.join(root, "boards", "demo"), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain(path.join(root, "boards", "demo", "perfboard.json"))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("standing in a board directory targets only that board, even with a board nested beneath it", async () => {
  const root = tree()
  try {
    fs.mkdirSync(path.join(root, "boards", "demo", "nested"), { recursive: true })
    fs.writeFileSync(
      path.join(root, "boards", "demo", "nested", "perfboard.json"),
      JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "nested.vrt" }),
    )
    const checked: string[] = []
    const code = await runCli(["check"], {
      cwd: path.join(root, "boards", "demo"),
      log: () => {},
      check: (declaration) => { checked.push(declaration.vrtPath); return okCheck(declaration) },
    })
    expect(code).toBe(0)
    expect(checked).toEqual([path.join(root, "boards", "demo", "demo.vrt")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("board-info prints what the directory declares", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["board-info"], {
      cwd: path.join(root, "boards", "demo"), log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("demo")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("board-info --field sch/netlist print an empty line when neither is declared", async () => {
  const root = tree()
  try {
    for (const field of ["sch", "netlist"]) {
      const lines: string[] = []
      const code = await runCli(["board-info", "--field", field], {
        cwd: path.join(root, "boards", "demo"), log: (line) => lines.push(line),
      })
      expect(code).toBe(0)
      expect(lines).toEqual([""])
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("board-info --field sch/netlist print the resolved paths when declared, and the plain report includes them", async () => {
  const root = tree()
  try {
    fs.writeFileSync(
      path.join(root, "boards", "demo", "perfboard.json"),
      JSON.stringify({
        sch: "../../board.kicad_sch",
        circuit: "c.ts",
        export: "demo",
        netlist: "../../board.net",
        vrt: "demo.vrt",
      }),
    )
    const schLines: string[] = []
    expect(await runCli(["board-info", "--field", "sch"], {
      cwd: path.join(root, "boards", "demo"), log: (line) => schLines.push(line),
    })).toBe(0)
    expect(schLines).toEqual([path.join(root, "board.kicad_sch")])

    const netlistLines: string[] = []
    expect(await runCli(["board-info", "--field", "netlist"], {
      cwd: path.join(root, "boards", "demo"), log: (line) => netlistLines.push(line),
    })).toBe(0)
    expect(netlistLines).toEqual([path.join(root, "board.net")])

    const reportLines: string[] = []
    expect(await runCli(["board-info"], {
      cwd: path.join(root, "boards", "demo"), log: (line) => reportLines.push(line),
    })).toBe(0)
    const report = reportLines.join("\n")
    expect(report).toContain(path.join(root, "board.kicad_sch"))
    expect(report).toContain(path.join(root, "board.net"))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("board-info --field with an unknown field name refuses", async () => {
  const root = tree()
  try {
    const errors: string[] = []
    const code = await runCli(["board-info", "--field", "vrt"], {
      cwd: path.join(root, "boards", "demo"), log: () => {}, error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("vrt")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
