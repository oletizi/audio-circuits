import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { resolveDrawIntent } from "../../tools/draught/draw-intent.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

function stagedDeclaration() {
  return loadDeclaration(path.join(moduleRepoRoot(), "boards/transistor-preamp-staged/perfboard.json"))
}

test("a circuit exporting drawingIntent drafts from it, written to the path given", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "draw-intent-"))
  const derivedIntentPath = path.join(scratch, "staged.intent.json")
  try {
    const resolved = await resolveDrawIntent({
      board: "transistor-preamp-staged", declaration: stagedDeclaration(), override: undefined, derivedIntentPath,
    })
    if ("refusal" in resolved) throw new Error(resolved.refusal)
    expect(resolved.source).toBe("derived")
    expect(resolved.path).toBe(derivedIntentPath)
    const written: unknown = JSON.parse(fs.readFileSync(derivedIntentPath, "utf8"))
    expect(written).toEqual(JSON.parse(JSON.stringify(resolved.intent)))
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

test("a board with BOTH a COMMITTED_INTENT entry and a drawingIntent export refuses", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "draw-intent-"))
  try {
    const resolved = await resolveDrawIntent({
      board: "transistor-preamp-staged",
      declaration: stagedDeclaration(),
      override: undefined,
      derivedIntentPath: path.join(scratch, "staged.intent.json"),
      committed: { "transistor-preamp-staged": "docs/research/2026-10-29-hi-cut-full-run/base.intent.json" },
    })
    expect("refusal" in resolved && resolved.refusal).toContain("both")
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})
