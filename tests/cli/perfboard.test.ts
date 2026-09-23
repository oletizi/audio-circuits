import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function tree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-cli-"))
  fs.mkdirSync(path.join(root, "boards", "demo"), { recursive: true })
  fs.writeFileSync(
    path.join(root, "boards", "demo", "perfboard.json"),
    JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "demo.vrt" }),
  )
  return root
}

const okCheck = (declaration: PerfboardDeclaration) =>
  Promise.resolve({ declaration, ok: true, report: "" })

test("--help exits 0 and lists every verb", async () => {
  const lines: string[] = []
  const code = await runCli(["--help"], { log: (line) => lines.push(line) })
  expect(code).toBe(0)
  const usage = lines.join("\n")
  for (const verb of ["check", "cuts", "update", "stripboard", "edit", "board-info", "boards", "veroroute"]) {
    expect(usage).toContain(verb)
  }
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
