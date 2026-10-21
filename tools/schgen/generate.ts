/**
 * Ported from digital-pedal-platform's `tools/schgen/generate.ts` (with the MCU pin-map `cuts` of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 12 of the M1 schematic-authoring
 * plan: `generate` is **async** and runs the ELK pre-pass, and `layoutSheet` is handed the backend
 * the pre-pass produced. **Task 13, ruling R29, took one field back off `GenerateEnv`**: the
 * circuit's `SchematicAuthoring` was carried here for the ELK graph's two declared inputs, and both
 * now reach it through the IR, so the field is deleted rather than left unread
 * (`docs/known-gaps.md` **G186**, criterion met).
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
import { assertCrossSheet } from "../../lib/schgen/render/cross-sheet.ts";
import { layoutSheet } from "../../lib/schgen/render/sheets.ts";
import { elkBackendFrom, elkPrePass, type ElkOutcome } from "./elk/layout.ts";
import { sheetPackPrePass } from "./elk/sheet-layout.ts";
import type { BlockId } from "../../lib/schgen/ir/types.ts";
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts";
import { placedSymbolTextOverlaps } from "../../lib/schgen/render/symbol-self-text.ts";
import { generatedFiles, initHint, REFS_LOCK, VERSION_LOCK } from "./generated-files.ts";
import { canonicalNetworkText, sha256, type ManifestSources } from "../../lib/schgen/manifest.ts";
import { moduleRepoRoot } from "../perfboard/repo-root.ts";

export { staleFiles, writeGeneration } from "./generated-files.ts";

export interface GenerateEnv {
  readonly kicadVersion: string;
  readonly stockDir: string;
  /** --init: create refs.lock.json (and schgen.lock.json) when absent. */
  readonly initLock: boolean;
  /** --accept-toolchain: accept a new toolchain/library baseline. */
  readonly acceptToolchain: boolean;
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
  /**
   * Spec §2.1's five manifest inputs, as TEXT - what `MANIFEST.json` was built from.
   *
   * It is exposed so `tools/schgen/verify.ts` can compare the manifest ON DISK against the inputs
   * this run actually read (`staleManifestInputs`). The manifest this run produced is trivially
   * live for them, so comparing it against them would be a tautology; the committed one is not.
   */
  readonly manifestSources: ManifestSources;
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

/**
 * Spec §2.1's two libraries: the modules a template DRAWS with, and the rules that graded the
 * drawing.
 *
 * **THE TEMPLATE LIBRARY IS THE WHOLE OF `render/` AND NOT `render/templates/`, WHICH
 * OVER-COVERS, AND THAT IS THE CHOICE RATHER THAN AN OVERSIGHT.** Eight of the nine modules in
 * `render/templates/` import their geometry producers from the parent directory -
 * `chain-kit.ts`, `layout-kit.ts`, `fanout-kit.ts`, `geometry.ts`, `drawn-extent.ts`,
 * `power-text.ts`, `text-boxes.ts`, `lib-pins.ts` - so a digest over `templates/` alone **did not
 * move when a template's drawn geometry moved**, which is the exact failure this digest exists to
 * detect. The alternative mechanism was the transitive import closure of the template modules:
 * exact, and it needs an import walker this repository does not have. The directory tree is the
 * cheaper mechanism and its error is in the safe direction - **it will move on an edit anywhere
 * in `render/` that changes no template's geometry at all.**
 *
 * **SO: A READER WHO SEES `templateLibrarySha256` MOVE FOR AN UNRELATED REASON IS LOOKING AT THE
 * DESIGN AND NOT A BUG.** A false-positive staleness costs a regeneration; a false pass certifies
 * a drawing against a library version that did not draw it. Those are not symmetric.
 *
 * **WHAT IS STILL NOT COVERED, SAID HERE RATHER THAN DISCOVERED LATER.** `lib/schgen/rules/*.ts`
 * import `../render/geometry.ts` and `../render/library.ts`, so a geometry edit moves the TEMPLATE
 * digest and not the RULE digest even though it changes what the rules computed. Both fields sit
 * in one manifest and `staleManifestInputs` reports either, so the manifest as a whole still goes
 * stale - the mis-attribution is between two fields of one record, not a blind spot.
 */
export const TEMPLATE_LIBRARY_DIR = "lib/schgen/render";
export const RULE_LIBRARY_DIR = "lib/schgen/rules";

/**
 * THE ENTRIES `moduleTreeDigest` PASSES OVER - a NAMED list, one entry, each carrying the committed
 * declaration that already settled it.
 *
 * **A NAMED EXEMPTION LIST IS THE OPPOSITE OF A FALLBACK, AND THE DIFFERENCE IS WHICH WAY THE
 * UNKNOWN CASE GOES.** A fallback substitutes behaviour when something is missing, so an unknown
 * input PASSES. This refuses everything not named, so an unknown input REFUSES. `CLAUDE.md`:
 * *"An empty whitelist that refuses loudly beats a general rule that quietly accepts a guess."*
 * That is the prescribed shape, and it specifies both the default state - empty - and the
 * extension discipline: a deliberate edit with a test beside it, never a silent widening.
 * `tests/schgen/generate-digest.test.ts` asserts the list's length, so growing it cannot be quiet.
 *
 * **THE MATCH IS EXACT EQUALITY ON THE FILE's NAME AND IS NOT A SUFFIX RULE.** `.DS_Store.bak`,
 * `foo.DS_Store` and a DIRECTORY called `.DS_Store` all still refuse. An exemption that drifted
 * into a suffix match would be the general rule this list exists instead of.
 *
 * **CONTROLLER RULING R43, 2026-10-20**, reversing the refuse-everything posture this function
 * shipped with for one round: the project has ALREADY declared `.DS_Store` a non-artifact, at
 * `.gitignore:20`, by the same reasoning it uses at `.gitignore:54` for `*.kicad_prl` - per-user
 * state, never design data. Refusing a generation over it was two parts of this repository
 * disagreeing, and a refusal that says *delete the file your file manager made* teaches nothing
 * about the circuit. **This entry is a reading of an existing decision, not a fresh judgement.**
 *
 * **AND THE RESIDUAL COST OF R43, WHICH IS NOT TO BE SOFTENED: a file named `.DS_Store` that
 * CARRIED GEOMETRY would be neither hashed nor refused.** Nothing else is lost - drawn geometry
 * reaches a template through a `.ts` import and every `.ts` in the tree is hashed, so a
 * geometry-bearing `.json`, a `.ts.bak` or a vendored data file still refuses by name. The one
 * thing this list hides is geometry someone put in a file with that exact name on purpose, and the
 * digest is the wrong place to fight that. `docs/known-gaps.md` **G228** records it.
 */
export const DIGEST_EXEMPT: readonly { readonly name: string; readonly why: string }[] = [
  {
    name: ".DS_Store",
    why:
      "macOS Finder metadata. `.gitignore:20` already declares it a non-artifact of this " +
      "repository, under the same `OS files` heading and by the same reasoning `.gitignore:54` " +
      "applies to `*.kicad_prl`: per-user state, never design data. A single Finder visit to a " +
      "library directory creates it, and refusing every generation until it is deleted would " +
      "contradict a decision this repository has already committed (controller ruling R43).",
  },
];

const isDigestExempt = (name: string): boolean => DIGEST_EXEMPT.some((e) => e.name === name);

/**
 * A library's version, as the sha256 of every `.ts` module in its directory TREE, each beside its
 * path relative to that tree's root.
 *
 * **IT HASHES THE SOURCES AND NOT A DECLARED VERSION STRING, and the alternative was measurably
 * worse.** `TEMPLATES` is a registry of ids, so a digest over the ids would not move when a
 * template's GEOMETRY changed - a hash that cannot detect the thing it exists to detect, which is
 * `CLAUDE.md`'s *"a skipped check must never look like a passing one"* in a hash's clothing. The
 * parent's `run.json` records the engine COMMIT for the same reason.
 *
 * The path is included beside each hash, so adding a module moves the digest even if the new
 * module is empty, and the list is sorted so the digest does not depend on directory order.
 *
 * **IT WALKS SUBDIRECTORIES, AND THE FLAT VERSION OF THIS FUNCTION WAS THE SAME FAILURE IN
 * MINIATURE.** `fs.readdirSync` without recursion covers one directory level, so adding a
 * subdirectory under `templates/` or `rules/` silently NARROWED the digest with nothing failing -
 * inside the record whose whole job is to say what graded the output. A subdirectory is now
 * covered rather than dropped.
 *
 * **A FILE THIS DIGEST CANNOT HASH REFUSES BY NAME rather than being filtered out.** The `.ts`
 * filter is the one thing between *covered* and *invisible*, and a filter that quietly drops a
 * `.json` of coordinates sitting beside a template is the skipped check again. The one exception is
 * `DIGEST_EXEMPT` below, which is a NAMED list and not a general rule - see its comment for why
 * those are opposites.
 *
 * **AN EMPTY TREE REFUSES.** A digest over no files is a constant that can never move, which
 * would make the manifest certify a drawing against a library it never read.
 *
 * **`root` IS A PARAMETER AND NOT `moduleRepoRoot()` INSIDE, so the digest can be taken over a
 * COPY of the tree.** That is what lets `tests/schgen/generate-digest.test.ts` mutate a geometry
 * producer's bytes in a scratch copy and assert the digest moved, which is a real perturbation
 * rather than an assertion that a name appears in a list.
 */
export function moduleTreeDigest(root: string, dir: string): string {
  const abs = path.join(root, dir);
  const modules: string[] = [];
  const unhashed: string[] = [];
  const walk = (at: string, prefix: string): void => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        // A DIRECTORY carrying an exempt NAME is not the thing the exemption names, so it is
        // reported rather than walked past: `DIGEST_EXEMPT` is about one file macOS writes.
        if (isDigestExempt(entry.name)) unhashed.push(`${rel} (a directory, not the file the exemption names)`);
        else walk(path.join(at, entry.name), rel);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts")) modules.push(rel);
      else if (entry.isFile() && isDigestExempt(entry.name)) continue;
      else unhashed.push(rel);
    }
  };
  walk(abs, "");
  if (unhashed.length > 0) {
    throw new Error(
      `the library tree at ${dir} holds ${unhashed.length} entr${unhashed.length === 1 ? "y" : "ies"} ` +
        `this manifest digest does not hash: ${unhashed.sort().join(", ")}. They are NOT filtered ` +
        "out: spec 2.1 has the manifest record the library version that graded the drawing, and a " +
        "file the digest skips is a library input that can change with nothing failing - " +
        'CLAUDE.md\'s "a skipped check must never look like a passing one". Three ways out, in ' +
        "order of likelihood: delete it, if it is an editor or build artifact that belongs nowhere " +
        "near a library tree; or hash it deliberately by extending moduleTreeDigest in " +
        "tools/schgen/generate.ts, if it carries geometry or a rule; or, ONLY if this repository " +
        "has already declared the file a non-artifact in a committed file, add it to DIGEST_EXEMPT " +
        "above citing that declaration. Each of the three is a deliberate edit with a test beside " +
        `it. The exemption list holds ${DIGEST_EXEMPT.length} name${DIGEST_EXEMPT.length === 1 ? "" : "s"} ` +
        "and is not a suffix rule: " +
        `${DIGEST_EXEMPT.map((e) => e.name).join(", ")}.`,
    );
  }
  if (modules.length === 0) {
    throw new Error(
      `the library tree at ${dir} holds no .ts module, so its manifest digest would be a constant ` +
        "that can never move - a hash that cannot detect the change it exists to detect. It is not " +
        "defaulted to an empty digest (spec 2.1: the manifest records the template library version " +
        "and the rule library version that graded the drawing).",
    );
  }
  return modules
    .sort()
    .map((rel) => `${rel} ${sha256(fs.readFileSync(path.join(abs, rel), "utf8"))}`)
    .join("\n");
}

/**
 * Spec §2.1's five manifest inputs for one generation.
 *
 * **`canonicalNetlist` IS `null` FOR EVERY DESIGN IN THIS REPOSITORY TODAY, AND THAT IS A FACT
 * ABOUT THE DESIGNS RATHER THAN A DEFAULT.** `DesignSpec` carries no canonical-netlist field:
 * `CLAUDE.md` says authority runs in both directions, and a canonical netlist export exists only
 * for a SCHEMATIC-FIRST circuit - the Pultec - which has no design module yet. The manifest field
 * is `string | null` for exactly this case, and `staleManifestInputs` reports a design that gains
 * or loses one, so the null is not read as agreement. **It is recorded in `docs/known-gaps.md`**,
 * because a reader seeing `"canonicalNetlistSha256": null` in every manifest needs to know whether
 * that is a gap in the generator or a property of the inputs.
 *
 * **`layoutInputs` COVERS ONLY THE BLOCKS THAT REACHED THE LAYOUT BACKEND.** A block drawn by a
 * reviewed template was never handed to one, so it has no entry, and the ABSENCE means *no layout
 * backend input* rather than *no drawing*. `staleManifestInputs` reports a block appearing on one
 * side and not the other, in both directions, so a block that stops selecting ELK invalidates the
 * manifest rather than silently dropping out of it.
 */
function manifestSourcesOf(d: LoadedDesign, elk: ReadonlyMap<BlockId, ElkOutcome>): ManifestSources {
  const layoutInputs: Record<BlockId, string> = {};
  for (const [id, outcome] of elk) layoutInputs[id] = outcome.serialized;
  return {
    canonicalNetlist: null,
    sectionNetwork: canonicalNetworkText(d.spec.circuit),
    layoutInputs,
    templateLibrary: moduleTreeDigest(moduleRepoRoot(), TEMPLATE_LIBRARY_DIR),
    ruleLibrary: moduleTreeDigest(moduleRepoRoot(), RULE_LIBRARY_DIR),
  };
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
  const elk = await elkPrePass(drawn, symbols);
  const backend = elkBackendFrom(elk);
  // Every sheet's frames packed once, before the synchronous arrangement runs - decision D2's
  // shape at sheet scale. `tools/schgen/elk/sheet-layout.ts` states the shelf-versus-ELK selection
  // rule; `layoutSheet` turns a refusal into the message naming the paper to enlarge.
  const packings = await sheetPackPrePass(drawn, symbols, FLAG_LIB_ID, backend);
  const packingOf = (id: string) => {
    const p = packings.get(id);
    if (p === undefined) throw new Error(`the sheet-packing pre-pass holds no packing for sheet ${id}`);
    return p;
  };
  const drawings = drawn.sheets.map((s) => layoutSheet(drawn, s.id, symbols, FLAG_LIB_ID, backend, packingOf(s.id)));
  assertRefsMatchDrawings(drawn, drawings);
  // Spec §1.6's rule, Task 15's decision: one authoritative mechanism per CLASS of connection.
  // **IT RUNS HERE AND NOT INSIDE `layoutSheet`, WHICH IS A DEVIATION FROM THE TASK 15 BRIEF'S
  // STEP 3** (*"wire crossSheetProblems into layoutSheet's existing assertSheetSafe
  // neighbourhood"*). A cross-sheet check cannot run per sheet: deciding whether a net crossing a
  // boundary is represented at all needs every sheet's drawing, and inside `layoutSheet` the other
  // sheets do not exist yet - a per-sheet version would report every crossing net of the first
  // sheet as unrepresented. It sits beside `assertRefsMatchDrawings`, which is the other
  // whole-drawing-set check, for the same reason. `docs/known-gaps.md` records the deviation.
  assertCrossSheet(drawn, drawings);
  const manifestSources = manifestSourcesOf(d, elk);
  const files = generatedFiles({ design: d, circuit, symbols, annotation, versions, versionLockText, drawings, manifestSources });
  return { files, circuit, annotation, versions, drawings, symbols, elk, manifestSources };
}
