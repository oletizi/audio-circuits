/**
 * True when this module is the process's entry point.
 *
 * Kept separate so `runCli` never calls `process.exit` and stays testable: a
 * CLI that exits inside its own body cannot be asserted on.
 */
import path from "node:path"

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  return path.resolve(entry) === path.resolve(new URL(moduleUrl).pathname)
}
