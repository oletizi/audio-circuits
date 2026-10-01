/**
 * Reads each supplier's key from its one file under `~/.config/<supplier>/`, the only
 * place either is read from (no environment-variable alternative). `readFile` is
 * injected so tests exercise this against fixtures, never the real files - `bun test`
 * never touches `~/.config`.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import path from "node:path"

export interface MouserCredentials {
  readonly apiKey: string
}

export interface DigikeyCredentials {
  readonly clientId: string
  readonly clientSecret: string
}

function readNonBlankLines(
  readFile: (path: string) => string,
  filePath: string,
  shape: string,
  registration: string,
): readonly string[] {
  let text: string
  try {
    text = readFile(filePath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${filePath}: could not read the credentials file (${detail}). Expected ${shape}. ` +
        `Register for one at ${registration}, then save it there.`,
    )
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

export function readMouserCredentials(readFile: (path: string) => string, home: string): MouserCredentials {
  const filePath = path.join(home, ".config", "mouser", "mouser-credentials.txt")
  const shape = "one line: the Mouser Search API key"
  const registration = "the API Hub in a Mouser account"
  const lines = readNonBlankLines(readFile, filePath, shape, registration)
  if (lines.length !== 1) {
    throw new Error(
      `${filePath}: expected ${shape}, found ${lines.length} non-blank line(s). Register for a key ` +
        `at ${registration}, then save it there.`,
    )
  }
  return { apiKey: lines[0] }
}

export function readDigikeyCredentials(readFile: (path: string) => string, home: string): DigikeyCredentials {
  const filePath = path.join(home, ".config", "digikey", "digikey-credentials.txt")
  const shape = "two lines: the client ID, then the client secret"
  const registration = "developer.digikey.com"
  const lines = readNonBlankLines(readFile, filePath, shape, registration)
  if (lines.length !== 2) {
    throw new Error(
      `${filePath}: expected ${shape}, found ${lines.length} non-blank line(s). Register an ` +
        `application with the Product Information API at ${registration}, then save its client ID ` +
        "and secret there.",
    )
  }
  return { clientId: lines[0], clientSecret: lines[1] }
}
