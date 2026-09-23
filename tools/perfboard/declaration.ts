/**
 * A `perfboard.json` sitting beside a stripboard layout, naming the circuit
 * that layout is supposed to match and the `.vrt` that holds it.
 *
 * Both paths resolve against the declaration's own directory, so a declaration
 * is readable from anywhere in the tree and says the same thing however it was
 * reached.
 *
 * `export` is REQUIRED and is not defaulted. A module may export several
 * circuits, and guessing which one a board was built from is exactly the class
 * of silent wrong answer this workflow exists to prevent.
 */
import fs from "node:fs"
import path from "node:path"

export interface PerfboardDeclaration {
  /** Absolute path to the perfboard.json itself. */
  readonly file: string
  /** The directory holding it, which relative fields resolve against. */
  readonly dir: string
  /** Absolute path to the circuit module, resolved from `dir`. */
  readonly circuitPath: string
  /** The named export in that module which returns the Network. */
  readonly exportName: string
  /** Absolute path to the VeroRoute layout, resolved from `dir`. */
  readonly vrtPath: string
}

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".tools", "dist"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Read one required string field.
 *
 * Absent, wrong-typed and empty are three different mistakes with three
 * different fixes, so they get three different messages. Every message names
 * the field and the file: a declaration is the only place these paths are
 * written down, and a message that does not name the field leaves the operator
 * diffing three-line JSON files by eye.
 */
function readString(parsed: unknown, key: string, file: string): string {
  if (!isRecord(parsed)) throw new Error(`${file}: expected a JSON object at the top level`)
  const value = parsed[key]
  if (value === undefined) throw new Error(`${file}: missing required string field "${key}"`)
  if (typeof value !== "string") {
    throw new Error(
      `${file}: field "${key}" must be a string, got ${value === null ? "null" : typeof value}`,
    )
  }
  if (value.trim() === "") throw new Error(`${file}: field "${key}" must not be empty`)
  return value
}

/**
 * Load one perfboard.json.
 *
 * Nothing is defaulted or guessed. The named circuit and layout are NOT
 * required to exist here: this function answers "what does this declaration
 * say", and the check that consumes it is what has to open those files and
 * fail naming them.
 */
export function loadDeclaration(file: string): PerfboardDeclaration {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${abs}: could not read perfboard.json: ${detail}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${abs}: perfboard.json is not valid JSON: ${detail}`)
  }

  const dir = path.dirname(abs)
  return {
    file: abs,
    dir,
    circuitPath: path.resolve(dir, readString(parsed, "circuit", abs)),
    exportName: readString(parsed, "export", abs),
    vrtPath: path.resolve(dir, readString(parsed, "vrt", abs)),
  }
}

/**
 * The name an operator types for a declared board: its directory's basename.
 *
 * Derived, never stored, so a renamed directory renames the board and a board
 * cannot end up answering to a name nothing on disk agrees with.
 */
export function boardName(declaration: PerfboardDeclaration): string {
  return path.basename(declaration.dir)
}

/**
 * Every perfboard.json under `root`, as absolute sorted paths.
 *
 * The match is on the EXACT basename: `pt2399-core.perfboard.json` is not a
 * declaration, and picking one up would check a board nobody declared.
 */
export function discoverDeclarations(root: string): string[] {
  const found: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        // A symlinked directory is neither `entry.isDirectory()` (that reflects the
        // link itself, not its target) nor named "perfboard.json", so the loop below
        // would silently step over it: a board reachable only through the symlink
        // would be neither descended into nor reported, and the run would exit 0
        // having checked fewer boards than exist. A skipped check must never look
        // like a passing one, so this refuses rather than following - following
        // would need cycle detection this repository has no symlinked board tree to
        // justify.
        let resolvesToDirectory: boolean
        try {
          resolvesToDirectory = fs.statSync(fullPath).isDirectory()
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error)
          throw new Error(`${fullPath}: symlink could not be resolved: ${detail}`)
        }
        if (resolvesToDirectory) {
          throw new Error(
            `${fullPath}: is a symlink to a directory. discoverDeclarations does not follow ` +
              "symlinked board directories, because a perfboard.json reachable only through one " +
              "would otherwise be silently skipped. Replace the symlink with a real directory if " +
              "this board needs to live there.",
          )
        }
        if (entry.name === "perfboard.json") found.push(fullPath)
        continue
      }
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name) || entry.name.endsWith("-backups")) continue
        walk(fullPath)
      } else if (entry.name === "perfboard.json") {
        found.push(fullPath)
      }
    }
  }
  walk(path.resolve(root))
  return found.sort()
}
