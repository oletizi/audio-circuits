/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/versionLock.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import crypto from "node:crypto";
import fs from "node:fs";

/**
 * schgen.lock.json: the full KiCad version and the SHA-256 of every stock
 * library the design loaded. KiCad is pinned at major.minor; libraries are
 * checked byte for byte, since library drift is what changes the output.
 *
 * Lifecycle: `schgen check` never writes this file; `schgen generate` refuses
 * on any compareVersionLock problem before writing anything; only
 * `generate --accept-toolchain` (or `--init` with no lock) rewrites it.
 */
export interface VersionLock {
  readonly kicad: string;
  readonly libraries: Readonly<Record<string, string>>;
}

const LOCK = "schgen.lock.json";
const VERSION = /^\d+\.\d+\.\d+$/;

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/** nickname → SHA-256 hex of the library file's bytes. */
export function fingerprintLibraries(files: ReadonlyMap<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [nick, file] of files) {
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(file);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      throw new Error(`library ${nick}: cannot read ${file} to fingerprint it: ${why}`);
    }
    out[nick] = sha256(bytes);
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseVersionLock(json: string): VersionLock {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(`${LOCK} is not valid JSON: ${why}`);
  }
  if (!isRecord(raw)) throw new Error(`${LOCK} must be an object with "kicad" and "libraries"`);
  for (const key of Object.keys(raw)) {
    if (key !== "kicad" && key !== "libraries") throw new Error(`${LOCK}: unknown key "${key}"`);
  }
  const kicad = raw["kicad"];
  if (typeof kicad !== "string" || !VERSION.test(kicad)) {
    throw new Error(`${LOCK}: "kicad" must be a version string like 10.0.5, got ${JSON.stringify(kicad)}`);
  }
  const libsRaw = raw["libraries"];
  if (!isRecord(libsRaw)) throw new Error(`${LOCK}: "libraries" must be an object of nickname → sha256`);
  const libraries: Record<string, string> = {};
  for (const [nick, hash] of Object.entries(libsRaw)) {
    if (typeof hash !== "string") throw new Error(`${LOCK}: library ${nick} hash must be a string`);
    libraries[nick] = hash;
  }
  return { kicad, libraries };
}

function sortedLibraries(libs: Readonly<Record<string, string>>): Array<[string, string]> {
  return Object.entries(libs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export function serializeVersionLock(v: VersionLock): string {
  return `${JSON.stringify({ kicad: v.kicad, libraries: Object.fromEntries(sortedLibraries(v.libraries)) }, null, 2)}\n`;
}

function majorMinor(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

/** Every difference that must stop generation; empty when the toolchain matches the lock. */
export function compareVersionLock(locked: VersionLock, current: VersionLock): string[] {
  const problems: string[] = [];
  const pinned = majorMinor(locked.kicad);
  if (majorMinor(current.kicad) !== pinned) {
    problems.push(`KiCad ${current.kicad} does not match the locked ${locked.kicad}: ${pinned}.x is pinned`);
  }
  for (const [nick, hash] of sortedLibraries(current.libraries)) {
    const was = locked.libraries[nick];
    if (was === undefined) {
      problems.push(`library ${nick} is loaded but not in ${LOCK}`);
    } else if (was !== hash) {
      problems.push(
        `library ${nick}: sha256 ${hash} differs from the locked ${was} (stock library drift); accept it deliberately with pnpm schgen generate --accept-toolchain and review the ${LOCK} diff`,
      );
    }
  }
  for (const [nick] of sortedLibraries(locked.libraries)) {
    if (current.libraries[nick] === undefined) problems.push(`library ${nick} is locked but no longer loaded`);
  }
  return problems;
}

/** First 16 hex of SHA-256 over sorted `nick:hash` lines — for the title-block comment. */
export function libraryDigest(v: VersionLock): string {
  const lines = sortedLibraries(v.libraries).map(([nick, hash]) => `${nick}:${hash}\n`);
  return sha256(lines.join("")).slice(0, 16);
}
