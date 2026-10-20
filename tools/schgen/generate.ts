/**
 * Ported from digital-pedal-platform's `tools/schgen/generate.ts` (with the MCU pin-map `cuts` of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 12 of the M1 schematic-authoring
 * plan: `generate` is **async** and runs the ELK pre-pass, `GenerateEnv` carries the circuit's
 * `SchematicAuthoring`, and `layoutSheet` is handed the backend the pre-pass produced.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G186**.
 */

/**
 * The generation pipeline: build → strict validation → symbol pin-text self-check → reference lock →
 * version lock → **ELK pre-pass** → layout → emit.
 * generate only reads; writeGeneration is the only writer, so any refusal leaves every file untouched.
 *
 * **WHY THE PRE-PASS SITS WHERE IT DOES, and why `generate` is therefore async** - plan decision
 * **D2**. `elkjs` has no synchronous layout entry point (Task 12 Step 1 verified the premise), and
 * `Template.realise` is synchronous, so ELK cannot run inside the realise dispatch. It runs once,
 * here, over every block `selectRenderer` sends to it, and `elkBackendFrom` turns the result into
 * the synchronous `Backend` `layoutSheet` passes down to `realiseBlock`.
 *
 * It runs AFTER the version lock on purpose: a toolchain drift refuses before anything is laid
 * out, so a run that is going to be rejected does not spawn an ELK worker first.
 */
import fs from "node:fs";
import path from "node:path";
import type { Circuit, PartLabel } from "../../lib/schgen/ir/types.ts";
import { buildCircuit } from "../../lib/schgen/ir/build.ts";
import { validateCircuit } from "../../lib/schgen/ir/validate.ts";
import { isPlainFileName } from "../../lib/schgen/ir/validate-parts.ts";
import type { LoadedDesign } from "../../lib/schgen/design.ts";
import { annotate, EMPTY_LOCK, parseRefLock, type Annotation, type RefLock } from "../../lib/schgen/lock/annotate.ts";
import { compareVersionLock, fingerprintLibraries, parseVersionLock, serializeVersionLock, type VersionLock } from "../../lib/schgen/lock/version-lock.ts";
import { createResolver, splitLibId, type SymbolResolver } from "../../lib/schgen/render/library.ts";
import { withReferences } from "../../lib/schgen/render/drawn-text.ts";
import { assertRefsMatchDrawings } from "../../lib/schgen/render/page-refs.ts";
import { layoutSheet } from "../../lib/schgen/render/sheets.ts";
import { elkBackendFrom, elkPrePass, type ElkOutcome } from "./elk/layout.ts";
import type { SchematicAuthoring } from "../../lib/schgen/authoring.ts";
import type { BlockId } from "../../lib/schgen/ir/types.ts";
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts";
import { placedSymbolTextOverlaps } from "../../lib/schgen/render/symbol-self-text.ts";
import { generatedFiles, initHint, REFS_LOCK, VERSION_LOCK } from "./generated-files.ts";

export { staleFiles, writeGeneration } from "./generated-files.ts";

export interface GenerateEnv {
  readonly kicadVersion: string;
  readonly stockDir: string;
  /** --init: create refs.lock.json (and schgen.lock.json) when absent. */
  readonly initLock: boolean;
  /** --accept-toolchain: accept a new toolchain/library baseline. */
  readonly acceptToolchain: boolean;
  /**
   * The circuit's schematic authoring declaration, for the ELK pre-pass - **Task 12's addition**.
   *
   * **WHY IT IS HERE AND NOT ON `DesignSpec`.** `elkInputOf` needs two declared things to place a
   * block's boundary nets: `portDirections` and `rails`, both read through
   * `lib/schgen/authoring.ts`'s `negotiablePort`. `circuitSpecFrom` has already distilled the
   * authoring file into a `CircuitSpec` by the time this function holds a `Circuit`, and the IR
   * has **no slot for a port direction at all** - so it cannot be recovered from `d`. Putting it
   * on `DesignSpec` would diverge `lib/schgen/design.ts` and every design fixture as well; this
   * diverges one file. `docs/known-gaps.md` **G186** records the choice and its cost.
   *
   * **`null` IS NOT A FALLBACK.** No design module in this repository declares an authoring file
   * yet, and every design ported from `digital-pedal-platform` renders its blocks `wired` or
   * `bus`, so the pre-pass has nothing to do for them. A block that DOES select ELK with `null`
   * here refuses, naming the block and this field (`elkPrePass`, `tools/schgen/elk/layout.ts`).
   */
  readonly authoring: SchematicAuthoring | null;
}

export interface Generation {
  /** Path relative to outDir -> exact text. */
  readonly files: ReadonlyMap<string, string>;
  /** Per block the ELK pre-pass laid out or refused; empty when no block selected ELK. */
  readonly elk: ReadonlyMap<BlockId, ElkOutcome>;
  readonly circuit: Circuit;
  readonly annotation: Annotation;
  readonly versions: VersionLock;
  readonly drawings: readonly SheetDrawing[];
  readonly symbols: SymbolResolver;
}

/** Flag symbol for rails driven only by passive pins; the stock `power` library always loads for it. */
export const FLAG_LIB_ID = "power:PWR_FLAG";
const FLAG_NICK = "power";

function stockNicknames(d: LoadedDesign): string[] {
  const { circuit, symbolLibs } = d.spec;
  const ids = [...circuit.parts.map((p) => p.libId), ...circuit.rails.map((r) => r.symbol)];
  const nicks = new Set([...ids.map((id) => splitLibId(id)[0]), FLAG_NICK]);
  return [...nicks].filter((n) => !Object.hasOwn(symbolLibs, n)).sort();
}

/** Project libraries from symbolLibs (absolute, or relative to the design dir); every other nickname from stockDir. */
export function designResolver(d: LoadedDesign, stockDir: string): SymbolResolver {
  const libs = new Map<string, string>();
  for (const [nick, file] of Object.entries(d.spec.symbolLibs)) libs.set(nick, path.resolve(d.dir, file));
  for (const nick of stockNicknames(d)) {
    const file = path.join(stockDir, `${nick}.kicad_sym`);
    if (!fs.existsSync(file)) throw new Error(`stock library ${nick} not found at ${file}`);
    libs.set(nick, file);
  }
  return createResolver(libs);
}

function stockFiles(d: LoadedDesign, symbols: SymbolResolver): Map<string, string> {
  return new Map([...symbols.files].filter(([nick]) => !Object.hasOwn(d.spec.symbolLibs, nick)));
}

function readRefLock(d: LoadedDesign, env: GenerateEnv): RefLock {
  const file = path.join(d.outDir, REFS_LOCK);
  if (fs.existsSync(file)) return parseRefLock(fs.readFileSync(file, "utf8"));
  if (env.initLock) return EMPTY_LOCK;
  throw new Error(`${file} not found; ${initHint(d)}`);
}

/** The lock generation records: its parsed versions and the exact schgen.lock.json text. */
interface ResolvedVersions {
  readonly versions: VersionLock;
  readonly text: string;
}

/**
 * The version-lock lifecycle. Drift refuses before anything is produced unless accepted
 * deliberately. A lock that compares clean (a patch-only KiCad difference included) is kept
 * byte for byte, versions and title-block text too: only --accept-toolchain, or --init with no
 * lock, records the current toolchain.
 */
function resolveVersions(d: LoadedDesign, env: GenerateEnv, current: VersionLock): ResolvedVersions {
  const file = path.join(d.outDir, VERSION_LOCK);
  const fresh: ResolvedVersions = { versions: current, text: serializeVersionLock(current) };
  if (!fs.existsSync(file)) {
    if (env.initLock || env.acceptToolchain) return fresh;
    throw new Error(`${file} not found; ${initHint(d)}`);
  }
  if (env.acceptToolchain) return fresh;
  const text = fs.readFileSync(file, "utf8");
  const locked = parseVersionLock(text);
  const problems = compareVersionLock(locked, current);
  if (problems.length > 0) {
    throw new Error(`toolchain drift against ${file}; nothing was written:${problems.map((p) => `\n  - ${p}`).join("")}`);
  }
  return { versions: locked, text };
}

export async function generate(d: LoadedDesign, env: GenerateEnv): Promise<Generation> {
  if (!isPlainFileName(d.spec.project)) {
    throw new Error(`project name "${d.spec.project}" must be a plain file name (no path separator or ".."); it names files in the output directory`);
  }
  const symbols = designResolver(d, env.stockDir);

  const circuit = buildCircuit(d.spec.circuit, { symbols });
  const problems = validateCircuit(circuit, symbols);
  if (problems.length > 0) throw new Error(`circuit is invalid:${problems.map((p) => `\n  - ${p}`).join("")}`);
  const overlaps = placedSymbolTextOverlaps(circuit.parts.values(), symbols);
  if (overlaps.length > 0) {
    throw new Error(`placed symbols draw pin text over their own pin text; use a corrected copy in the project library:${overlaps.map((p) => `\n  - ${p}`).join("")}`);
  }

  const pinned = new Map<PartLabel, string>();
  const annotation = annotate(circuit, readRefLock(d, env), pinned);

  const current: VersionLock = { kicad: env.kicadVersion, libraries: fingerprintLibraries(stockFiles(d, symbols)) };
  const { versions, text: versionLockText } = resolveVersions(d, env, current);

  // The drawing prints reference designators where titles and notes name parts by design label.
  const drawn = withReferences(circuit, annotation.refs);
  // Every block selectRenderer sends to ELK, laid out once, before the synchronous dispatch runs.
  const elk = await elkPrePass(drawn, symbols, env.authoring);
  const backend = elkBackendFrom(elk);
  const drawings = drawn.sheets.map((s) => layoutSheet(drawn, s.id, symbols, FLAG_LIB_ID, backend));
  assertRefsMatchDrawings(drawn, drawings);
  const files = generatedFiles({ design: d, circuit, symbols, annotation, versions, versionLockText, drawings });
  return { files, circuit, annotation, versions, drawings, symbols, elk };
}
