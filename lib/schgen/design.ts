/**
 * Ported from digital-pedal-platform's `tools/schgen/design.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { isRecord } from "./strict.ts";
import type { Subcircuit } from "./gates/oscar/boundary.ts";
import type { CircuitSpec } from "./ir/types.ts";
import type { ErcExclusion } from "./render/erc-exclusions.ts";

export interface NonSchematicEntry {
  readonly id: string;
  readonly reason: string;
}

export interface ChecklistConfig {
  /** Relative to the design file's directory. */
  readonly file: string;
  /** e.g. ["CORE","CODEC","PWR","AIO","CTL","USB","ALL"]. */
  readonly prefixes: readonly string[];
  readonly nonSchematic: readonly NonSchematicEntry[];
}

export interface OscarConfig {
  /** CORE-BRIEF.md, relative to the design dir (declared deltas). */
  readonly brief: string;
  /** Board key -> root .kicad_sch, relative to the design dir. */
  readonly netlists: Readonly<Record<string, string>>;
  /**
   * Board key (as in `netlists`) -> exact lib ids of that board's own non-polarised two-pin
   * passive symbols, counted as symmetric on top of SYMMETRIC_LIB_IDS when that board's netlist
   * is read (graphFromNetlist). Per board, because each id must be used in its own netlist; every
   * netlist board has an entry ([] for none). No patterns: an unlisted symbol stays ordered.
   */
  readonly symmetricSymbols: Readonly<Record<string, readonly string[]>>;
  readonly subcircuits: readonly Subcircuit[];
}

export interface DesignSpec {
  readonly project: string;
  /** Relative to the design dir. */
  readonly outDir: string;
  readonly circuit: CircuitSpec;
  /** Project symbol libs: nickname -> path, absolute or relative to the design dir. */
  readonly symbolLibs: Readonly<Record<string, string>>;
  /** Project footprint libs: nickname -> .pretty dir, absolute or relative to the design dir. */
  readonly footprintLibs: Readonly<Record<string, string>>;
  /** Directory, relative to the design dir. */
  readonly pinTables: string | null;
  readonly checklist: ChecklistConfig | null;
  readonly oscar: OscarConfig | null;
  /** ERC violations recorded as excluded in the project file, each with its reason (ALL-07). */
  readonly ercExclusions: readonly ErcExclusion[];
}

export interface LoadedDesign {
  readonly file: string;
  readonly dir: string;
  readonly spec: DesignSpec;
  /** spec.outDir resolved against dir. */
  readonly outDir: string;
}

const isStringOrNull = (v: unknown): boolean => v === null || typeof v === "string";
const isObjectOrNull = (v: unknown): boolean => v === null || isRecord(v);
const isStringRecord = (v: unknown): boolean => isRecord(v) && Object.values(v).every((x) => typeof x === "string");

/**
 * Load-time shape guard for the top level of a design module's `design` export only.
 *
 * Design modules are TypeScript declaring `export const design: DesignSpec`, so `pnpm typecheck`
 * has already checked every nested field (parts, blocks, renderings, OSCAR subcircuits). What the
 * compiler cannot see across a dynamic import() is a module exporting the wrong thing or no
 * `design` at all; that is what this catches. It does not re-validate nested contents and is not
 * meant to: nested mistakes type-checking cannot express (net names, coverage, pin semantics) are
 * validateCircuit's job in generate.
 */
export function isDesignSpec(v: unknown): v is DesignSpec {
  if (!isRecord(v)) return false;
  const c = v["circuit"];
  return (
    typeof v["project"] === "string" &&
    typeof v["outDir"] === "string" &&
    isRecord(c) &&
    Array.isArray(c["parts"]) &&
    Array.isArray(c["blocks"]) &&
    Array.isArray(c["sheets"]) &&
    Array.isArray(c["rails"]) &&
    isStringRecord(v["symbolLibs"]) &&
    isStringRecord(v["footprintLibs"]) &&
    isStringOrNull(v["pinTables"]) &&
    isObjectOrNull(v["checklist"]) &&
    isObjectOrNull(v["oscar"]) &&
    Array.isArray(v["ercExclusions"])
  );
}

export async function loadDesign(file: string): Promise<LoadedDesign> {
  const abs = path.resolve(file);
  const mod: unknown = await import(pathToFileURL(abs).href);
  const spec = isRecord(mod) ? mod["design"] : undefined;
  if (!isDesignSpec(spec)) throw new Error(`${file} must export \`design\` (a DesignSpec)`);
  const dir = path.dirname(abs);
  return { file: abs, dir, spec, outDir: path.resolve(dir, spec.outDir) };
}
