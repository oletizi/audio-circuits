/**
 * Fixtures shared across the perfboard CLI test suite.
 *
 * The suite is split into perfboard.test.ts, perfboard-binary-verbs.test.ts
 * and perfboard-support.test.ts, mirroring tools/cli's own three-file seam
 * (perfboard.ts / perfboard-binary-verbs.ts / perfboard-support.ts). `tree`,
 * `boardDir` and `okCheck` are used by tests in more than one of those files,
 * so they live here once rather than being duplicated at each split point.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

/** A throwaway tree with one declared board at boards/demo. */
export function tree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-cli-"))
  fs.mkdirSync(path.join(root, "boards", "demo"), { recursive: true })
  fs.writeFileSync(
    path.join(root, "boards", "demo", "perfboard.json"),
    JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "demo.vrt" }),
  )
  return root
}

export function boardDir(root: string): string {
  return path.join(root, "boards", "demo")
}

export const okCheck = (declaration: PerfboardDeclaration) =>
  Promise.resolve({ declaration, ok: true, report: "" })
