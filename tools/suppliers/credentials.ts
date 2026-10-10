/**
 * Reads each supplier's key from its one file under `~/.config/<supplier>/`, the only
 * place either is read from (no environment-variable alternative). `readFile` is
 * injected so tests exercise this against fixtures, never the real files - `bun test`
 * never touches `~/.config`. Mouser's file is a bare one-line key; Digi-Key's is a YAML
 * mapping (`clientID`, `clientSecret`), parsed with Bun's built-in `Bun.YAML`.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import path from "node:path"
import { isRecord } from "../perfboard/guards.ts"

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

const DIGIKEY_KEYS: readonly string[] = ["clientID", "clientSecret"]

/** The Digi-Key file is YAML: a mapping of exactly `clientID` and `clientSecret`, each a
 * non-empty string, in either order. Every refusal names the file, the shape and (where it
 * applies) the offending key - never a value, and never the YAML parser's own message,
 * which can quote the line it failed on. */
export function readDigikeyCredentials(readFile: (path: string) => string, home: string): DigikeyCredentials {
  const filePath = path.join(home, ".config", "digikey", "digikey-credentials.txt")
  const shape = "a YAML mapping of two keys, `clientID: <client id>` and `clientSecret: <client secret>`"
  const registration = "developer.digikey.com"
  const refuse = (problem: string): Error =>
    new Error(
      `${filePath}: ${problem}. Expected ${shape}. Register an application with the Product ` +
        `Information API at ${registration}, then save its client ID and secret there.`,
    )

  let text: string
  try {
    text = readFile(filePath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw refuse(`could not read the credentials file (${detail})`)
  }

  let parsed: unknown
  try {
    parsed = Bun.YAML.parse(text)
  } catch {
    throw refuse("the file is not valid YAML")
  }
  if (!isRecord(parsed)) throw refuse("the file is not a mapping")

  for (const key of Object.keys(parsed)) {
    if (!DIGIKEY_KEYS.includes(key)) throw refuse(`unexpected key "${key}"`)
  }
  const field = (key: string): string => {
    if (!(key in parsed)) throw refuse(`"${key}" is missing`)
    const value = parsed[key]
    if (typeof value !== "string" || value.trim() === "") throw refuse(`"${key}" is not a non-empty string`)
    return value.trim()
  }
  return { clientId: field("clientID"), clientSecret: field("clientSecret") }
}
