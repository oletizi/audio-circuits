/**
 * Ported from digital-pedal-platform's `tools/kicad/libtable.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse, type SList } from "./sexpr.ts";
import { KICAD_CLI } from "./netlist.ts";

/**
 * Path to the user's global footprint library table.
 *
 * Overridable with KICAD_FP_LIB_TABLE so CI (Task 16, running inside a Linux
 * KiCad container) can point this at a non-macOS location without touching
 * the default.
 */
export const GLOBAL_LIB_TABLE: string =
  process.env["KICAD_FP_LIB_TABLE"] ??
  path.join(os.homedir(), "Library/Preferences/kicad/10.0/fp-lib-table");

export interface LibEntry {
  readonly name: string;
  readonly type: string;
  readonly uri: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function namedValue(list: SList, key: string): string | null {
  for (const child of list.lists) {
    if (child.head === key) return child.atoms[1]?.value ?? null;
  }
  return null;
}

/** Read the (lib ...) entries of an fp-lib-table. Absent files read as empty. */
export function readLibTable(file: string): LibEntry[] {
  if (!fs.existsSync(file)) return [];
  const root = parse(fs.readFileSync(file, "utf8"));
  const out: LibEntry[] = [];
  for (const lib of root.lists) {
    if (lib.head !== "lib") continue;
    const name = namedValue(lib, "name");
    const type = namedValue(lib, "type");
    const uri = namedValue(lib, "uri");
    if (name === null || type === null || uri === null) {
      throw new Error(`${file}: lib entry missing name, type, or uri`);
    }
    out.push({ name, type, uri });
  }
  return out;
}

/**
 * Candidate directories for KiCad's built-in path variables, probed in
 * order until one exists. This is verification, not a fallback: the
 * variable is still unresolved (and expandUri still throws) if none of
 * the candidates exist on disk.
 */
const BUILTIN_CANDIDATES: Record<string, () => string[]> = {
  KICAD10_FOOTPRINT_DIR: () => [
    path.join(path.dirname(KICAD_CLI), "..", "SharedSupport", "footprints"),
    "/usr/share/kicad/footprints",
    "/usr/local/share/kicad/footprints",
  ],
};

/**
 * KiCad path variables set by the user via kicad_common.json's
 * "environment.vars", when that object is non-null. Read fresh (not
 * cached) since expandUri may run long after process start, and the file
 * lives next to whatever fp-lib-table GLOBAL_LIB_TABLE currently names.
 * Absence of the file (or a null vars object) is tolerated, not an error:
 * it just means this source contributes nothing.
 */
function kicadCommonVars(): Record<string, string> {
  const commonPath = path.join(path.dirname(GLOBAL_LIB_TABLE), "kicad_common.json");
  if (!fs.existsSync(commonPath)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(commonPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${commonPath}: could not parse as JSON: ${message}`);
  }
  if (!isRecord(parsed)) return {};
  const environment = parsed["environment"];
  if (!isRecord(environment)) return {};
  const vars = environment["vars"];
  if (!isRecord(vars)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * Expand ${KIPRJMOD} and KiCad path variables in a library URI.
 *
 * Resolution order for a variable other than KIPRJMOD:
 *   1. process.env[VAR]
 *   2. kicad_common.json's environment.vars[VAR]
 *   3. for known KiCad built-ins, a candidate directory list probed for
 *      existence (first existing candidate wins)
 * Throws, naming the variable and (for step 3) every path tried, if none
 * of these resolves it.
 */
export function expandUri(uri: string, projectDir: string): string {
  const expanded = uri.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_match, name: string) => {
    if (name === "KIPRJMOD") return projectDir;

    const fromEnv = process.env[name];
    if (fromEnv !== undefined) return fromEnv;

    const fromCommon = kicadCommonVars()[name];
    if (fromCommon !== undefined) return fromCommon;

    const candidateFactory = BUILTIN_CANDIDATES[name];
    if (candidateFactory !== undefined) {
      const candidates = candidateFactory();
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
      }
      throw new Error(
        `cannot resolve built-in KiCad path variable \${${name}}: not in process.env, not in ` +
          `kicad_common.json's environment.vars, and none of these candidate directories exist: ` +
          candidates.join(", "),
      );
    }

    throw new Error(
      `cannot expand \${${name}} in library URI "${uri}". ` +
        `Set it in the environment, in kicad_common.json's environment.vars, or use a ` +
        `\${KIPRJMOD}-relative path.`,
    );
  });
  return path.resolve(expanded);
}

interface SearchAccumulator {
  nicknameFound: boolean;
  readonly searchedFootprintPaths: string[];
}

/**
 * Search one fp-lib-table (and, recursively, any (type "Table") entries it
 * references) for `nickname`, returning the resolved .kicad_mod path for
 * `footprintName` or null if the nickname names no such file anywhere in
 * this table tree.
 *
 * `visited` guards against a cycle among nested tables: it holds the
 * absolute path of every table file already being searched in this
 * traversal. A table that references an ancestor of itself throws instead
 * of recursing forever.
 */
function searchTable(
  tableFile: string,
  nickname: string,
  footprintName: string,
  expand: (uri: string) => string,
  visited: Set<string>,
  acc: SearchAccumulator,
): string | null {
  const absTableFile = path.resolve(tableFile);
  if (visited.has(absTableFile)) {
    throw new Error(
      `cycle detected while resolving footprint library table "${absTableFile}": it is already ` +
        `being searched (nested "Table" entries reference each other)`,
    );
  }
  visited.add(absTableFile);

  for (const entry of readLibTable(absTableFile)) {
    if (entry.type === "Table") {
      const nestedFile = expand(entry.uri);
      const found = searchTable(nestedFile, nickname, footprintName, expand, visited, acc);
      if (found !== null) return found;
      continue;
    }

    if (entry.name !== nickname) continue;

    if (entry.type !== "KiCad") {
      throw new Error(
        `library "${nickname}" in ${absTableFile} has unsupported type "${entry.type}" ` +
          `(only "KiCad" footprint directories and "Table" nested tables are supported)`,
      );
    }

    acc.nicknameFound = true;
    const libDir = expand(entry.uri);
    const file = path.join(libDir, `${footprintName}.kicad_mod`);
    if (fs.existsSync(file)) return file;
    acc.searchedFootprintPaths.push(file);
  }

  return null;
}

/** A global footprint table and the only path variables its URIs (and the project table's) may use. */
export interface GlobalTable {
  readonly file: string;
  readonly vars: Readonly<Record<string, string>>;
}

/**
 * Expand ${KIPRJMOD} and the given variables only: no environment, no kicad_common.json, no
 * built-in candidates. An undefined variable throws.
 */
function expandHermetic(uri: string, projectDir: string, vars: Readonly<Record<string, string>>): string {
  const expanded = uri.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_match, name: string) => {
    if (name === "KIPRJMOD") return projectDir;
    const value = Object.hasOwn(vars, name) ? vars[name] : undefined;
    if (value !== undefined) return value;
    const defined = ["KIPRJMOD", ...Object.keys(vars).sort()].join(", ");
    throw new Error(`cannot expand \${${name}} in library URI "${uri}": the hermetic configuration defines only ${defined}`);
  });
  return path.resolve(expanded);
}

function resolveThrough(id: string, projectDir: string, globalFile: string, expand: (uri: string) => string): string {
  return resolveInTables(id, [path.join(projectDir, "fp-lib-table"), globalFile], expand);
}

function resolveInTables(id: string, tables: readonly string[], expand: (uri: string) => string): string {
  const sep = id.indexOf(":");
  if (sep < 0) {
    throw new Error(`footprint id "${id}" is not in Library:Footprint form`);
  }
  const nickname = id.slice(0, sep);
  const name = id.slice(sep + 1);

  const acc: SearchAccumulator = { nicknameFound: false, searchedFootprintPaths: [] };

  for (const table of tables) {
    const found = searchTable(table, nickname, name, expand, new Set<string>(), acc);
    if (found !== null) return found;
  }

  if (!acc.nicknameFound) {
    throw new Error(
      `library nickname "${nickname}" (from "${id}") is not registered in ${tables.join(" or ")}, ` +
        `including any nested tables they reference`,
    );
  }
  throw new Error(
    `footprint "${name}" not found in library "${nickname}". Looked for: ` +
      acc.searchedFootprintPaths.join(", "),
  );
}

/**
 * Resolve a "Nickname:Footprint" identifier to an absolute .kicad_mod path.
 *
 * Consults the project's fp-lib-table first, then the user's global one
 * (GLOBAL_LIB_TABLE), following any nested (type "Table") entries in either.
 * Throws if the library nickname is registered nowhere, or if it is
 * registered but the named footprint does not exist in it.
 */
export function resolveFootprint(id: string, projectDir: string): string {
  return resolveThrough(id, projectDir, GLOBAL_LIB_TABLE, (uri) => expandUri(uri, projectDir));
}

/**
 * resolveFootprint against an explicit global table instead of the user's KiCad profile:
 * hermetic, since URIs expand only ${KIPRJMOD} and `global.vars`.
 */
export function resolveFootprintIn(id: string, projectDir: string, global: GlobalTable): string {
  return resolveThrough(id, projectDir, global.file, (uri) => expandHermetic(uri, projectDir, global.vars));
}

/**
 * Resolve through `global` alone (no project table), hermetically. For callers that resolve
 * project libraries themselves, such as a design checked before its project files exist.
 */
export function resolveFootprintInGlobal(id: string, global: GlobalTable): string {
  const tableDir = path.dirname(path.resolve(global.file));
  return resolveInTables(id, [global.file], (uri) => expandHermetic(uri, tableDir, global.vars));
}
