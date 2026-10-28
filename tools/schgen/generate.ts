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
import { refsMatchProblems } from "../../lib/schgen/render/page-refs.ts";
import { crossSheetProblems } from "../../lib/schgen/render/cross-sheet.ts";
import { layoutSheet, type PrePacked } from "../../lib/schgen/render/sheets.ts";
import { finding, SchgenRefusal, worstClass, type Finding } from "../../lib/schgen/findings.ts";
import { elkBackendFrom, elkPrePass, type ElkOutcome } from "./elk/layout.ts";
import { sheetPackPrePass } from "./elk/sheet-layout.ts";
import type { BlockId } from "../../lib/schgen/ir/types.ts";
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts";
import type { Backend } from "../../lib/schgen/render/block-types.ts";
import { placedSymbolTextOverlaps } from "../../lib/schgen/render/symbol-self-text.ts";
import { generatedFiles, initHint, REFS_LOCK, VERSION_LOCK } from "./generated-files.ts";
import { canonicalNetworkText, type ManifestSources } from "../../lib/schgen/manifest.ts";
import { moduleTreeDigest, RULE_LIBRARY_DIR, TEMPLATE_LIBRARY_DIR } from "./library-digest.ts";
import { moduleRepoRoot } from "../perfboard/repo-root.ts";

export { staleFiles, writeGeneration } from "./generated-files.ts";
// The manifest's library digests moved WHOLE to `library-digest.ts` when this file reached its
// size limit (Task 4 of the gates-classify plan). Re-exported so every existing import of them
// through this module keeps working - no caller had to change, and none did.
export { DIGEST_EXEMPT, moduleTreeDigest, RULE_LIBRARY_DIR, TEMPLATE_LIBRARY_DIR } from "./library-digest.ts";

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
  /**
   * **EVERY GATE COMPLAINT OF THIS WHOLE GENERATION, empty when it is ratified** - Task 3 of
   * `docs/superpowers/plans/2026-10-27-gates-classify.md`.
   *
   * It is each sheet's own `SheetDrawing.findings` plus the checks that belong to NO single sheet
   * and so have nowhere else to go: `refsMatchProblems` and `crossSheetProblems` both quantify
   * over every drawing at once, which is why they run here rather than inside `layoutSheet`.
   *
   * `findings.ts`'s `worstClass` reads the generation's class off it. Empty is `usable` and needs
   * no special case: a clean generation carries no findings, and "no findings" must read as "ship
   * it" rather than as an unclassified absence.
   */
  readonly findings: readonly Finding[];
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

/**
 * **THE GENERATION AS IT IS, FINDINGS AND ALL - the non-throwing half of the pair, and the one the
 * census calls.** Task 4 of `docs/superpowers/plans/2026-10-27-gates-classify.md`.
 *
 * The owner, on four boards that refuse and have never been looked at: *"a gate halts rendering
 * and we never look at the picture so we can't tell if the gate is insane or not"*, and *"gates
 * can still refuse to ratify an output, but they shouldn't HIDE the output"*. This function is
 * that directive at the top of the pipeline: a generation whose gates complained comes back
 * COMPLETE - every sheet, every emitted file - with `findings` carrying what they said, and
 * `findings.ts`'s `worstClass` reads its class off them.
 *
 * **IT STILL THROWS WHEN THERE IS NO COMPLETE GENERATION TO RETURN**, which is a different thing
 * from a generation the gates would not ratify: an invalid circuit and an undrawable sheet produce
 * no files at all, so there is nothing to hand back and the typed `SchgenRefusal` carrying their
 * findings is the whole of the output. The census turns that into the spec's refusal sheet.
 *
 * **WHY THE STRICT `generate` BELOW STAYS, rather than every caller moving to this one.** Until
 * Task 5 the answer was that the marks did not exist yet, so an unratified schematic written into a
 * CIRCUIT directory would look exactly like a ratified one. **The marks exist now** - every sheet
 * this function's output is emitted into carries them - **and that answer has therefore expired.**
 * The strict form is kept because whether a circuit directory should hold a marked, unratified
 * drawing is a decision about this repository's committed artifacts and not a consequence of the
 * marks landing; nothing in Task 5's brief or the spec takes it, so it is not taken here. What
 * changed is only that the question is now open rather than answered by a missing feature.
 * `tools/cli/schgen.ts` and `tools/schgen/verify.ts` keep the strict form; the census writes into
 * its own gitignored directory, beside a `STATUS.md` that names the class. The pairing is
 * `realiseBlockReported`/`realiseBlock`'s, for the same reason and at a different scale.
 */
export async function generateReported(d: LoadedDesign, env: GenerateEnv): Promise<Generation> {
  if (!isPlainFileName(d.spec.project)) {
    throw new Error(`project name "${d.spec.project}" must be a plain file name (no path separator or ".."); it names files in the output directory`);
  }
  const symbols = designResolver(d, env.stockDir);

  const circuit = buildCircuit(d.spec.circuit, { symbols });
  const problems = validateCircuit(circuit, symbols);
  if (problems.length > 0) {
    // **`circuit-invalid`, WHICH `findings.ts` CLASSES `not-drawable` AND NOT `generator-defect`** -
    // Task 3's addendum, and the distinction decides whether a run FAILS. An invalid circuit is a
    // fact about the circuit: `pultec-mid` refuses here because `SW_MID` pin 12 is on no net and is
    // not declared a mechanical mount, which is a board that is not ready rather than a bug in this
    // tool. Reported as a generator defect it would fail the census on a board that is simply
    // unfinished. There is no geometry to classify either - nothing has been laid out at this
    // point - so this is the one refusal the spec's own narrowing says gets a refusal sheet rather
    // than a drawing.
    throw new SchgenRefusal(
      problems.map((p) => finding("circuit-invalid", p, "validateCircuit")),
      `circuit is invalid:${problems.map((p) => `\n  - ${p}`).join("")}`,
    );
  }
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
  // **EVERY SHEET IS ATTEMPTED, AND A SHEET THAT REFUSES DOES NOT DISCARD THE ONES ALREADY DRAWN** -
  // Task 3 Step 4. `drawn.sheets.map(layoutSheet)` stopped at the first sheet to throw, so a
  // two-sheet design told a reader about one sheet's problems and nothing about the other's.
  const laid = layoutSheets(drawn, symbols, backend, packingOf);
  const drawings = laid.drawings;
  // Spec §1.6's rule, Task 15's decision: one authoritative mechanism per CLASS of connection.
  // **IT RUNS HERE AND NOT INSIDE `layoutSheet`, WHICH IS A DEVIATION FROM THE TASK 15 BRIEF'S
  // STEP 3** (*"wire crossSheetProblems into layoutSheet's existing assertSheetSafe
  // neighbourhood"*). A cross-sheet check cannot run per sheet: deciding whether a net crossing a
  // boundary is represented at all needs every sheet's drawing, and inside `layoutSheet` the other
  // sheets do not exist yet - a per-sheet version would report every crossing net of the first
  // sheet as unrepresented. It sits beside `refsMatchProblems`, which is the other
  // whole-drawing-set check, for the same reason. `docs/known-gaps.md` records the deviation.
  const findings: Finding[] = [
    ...laid.findings,
    ...drawings.flatMap((s) => s.findings),
    ...refsMatchProblems(drawn, drawings).map((p) => finding("reference-disagreement", p, "intersheet references")),
    ...crossSheetProblems(drawn, drawings).map((p) => finding("cross-sheet-disagreement", p, "cross-sheet mechanism")),
  ];
  // A sheet that drew nothing has no file, so there is no complete generation to emit. The refusal
  // carries every finding of every sheet that DID draw, which is the whole of what Step 4 buys at
  // this point in the plan.
  if (laid.undrawn.length > 0) {
    throw new SchgenRefusal(
      findings,
      `${laid.undrawn.length} of ${drawn.sheets.length} sheet(s) could not be drawn at all, so there ` +
        `is no complete generation to emit: ${laid.undrawn.join("; ")}`,
    );
  }
  const manifestSources = manifestSourcesOf(d, elk);
  // **THE FINDINGS GO TO THE EMITTER, which is Task 5's whole wiring.** Every sheet this writes is
  // marked when `worstClass(findings)` is anything but `usable`: a watermark across the drawing area
  // and a title-block comment naming the class. `lib/schgen/render/unratified-mark.ts` carries the
  // owner's bar for the weight - *"it doesn't need to be easy to read, it just needs to be possible
  // to read"* - and the rendered pages it was set from.
  const files = generatedFiles({ design: d, circuit, symbols, annotation, versions, versionLockText, drawings, manifestSources, findings });
  return { files, circuit, annotation, versions, drawings, symbols, elk, manifestSources, findings };
}

/**
 * **THE RATIFYING FORM: a generation the gates passed, or a typed refusal.**
 *
 * It is `generateReported` plus one rule - a non-empty `findings` refuses - and the rule is here
 * rather than inside it because of WHERE each caller writes. This one's callers write into a
 * CIRCUIT directory (`tools/cli/schgen.ts`, `tools/schgen/verify.ts`). **Its sheets would now be
 * marked if it emitted them** - Task 5 landed the watermark and the title-block field - so the
 * sentence that used to stand here, that refusing is the only honest thing this form can do, is no
 * longer true. It still refuses, deliberately and narrowly: committing a marked unratified drawing
 * into a circuit directory is a decision nobody has taken, and taking it silently inside a doc
 * comment is not how this repository changes what it commits.
 *
 * **It is not the gate that hides the drawing any more**, which is the whole of what changed:
 * `generateReported` has the same drawing in hand and hands it back, and the census writes it.
 */
export async function generate(d: LoadedDesign, env: GenerateEnv): Promise<Generation> {
  const g = await generateReported(d, env);
  if (g.findings.length > 0) {
    throw new SchgenRefusal(
      g.findings,
      `the generation is UNRATIFIED (${worstClass(g.findings)}): ${g.findings.length} finding(s) ` +
        `over ${g.drawings.length} sheet(s). The drawing EXISTS - generateReported returns it and ` +
        `tools/schgen/board-sheets.ts writes it, classified. This form refuses because its callers ` +
        `write into a circuit directory, where an unmarked unratified sheet would look ratified:` +
        `${g.findings.map((f) => `\n  - [${f.kind}] ${f.where}: ${f.what}`).join("")}`,
    );
  }
  return g;
}

/** One sheet that could not be drawn at all, and the findings behind it. */
interface LaidSheets {
  readonly drawings: readonly SheetDrawing[];
  /** Findings of the sheets that refused outright, which have no `SheetDrawing` to sit on. */
  readonly findings: readonly Finding[];
  /** `sheet <id>: <reason>` per sheet that produced no drawing. */
  readonly undrawn: readonly string[];
}

/**
 * Every sheet laid out, **each one attempted whatever the ones before it did**.
 *
 * A `SchgenRefusal` from `layoutSheet` means that sheet produced no drawing and said why in
 * classified findings: they are kept and the next sheet is tried. **An untyped `Error` is
 * rethrown unchanged**, because the spec's totality rule is that an unclassified refusal is a
 * `generator-defect` that fails the run - absorbing one here would turn a bug in this generator
 * into an ordinary undrawable sheet, which is the misclassification the whole reform exists to
 * prevent.
 */
function layoutSheets(
  drawn: Circuit,
  symbols: SymbolResolver,
  backend: Backend | null,
  packingOf: (id: string) => PrePacked | null,
): LaidSheets {
  const drawings: SheetDrawing[] = [];
  const findings: Finding[] = [];
  const undrawn: string[] = [];
  for (const s of drawn.sheets) {
    try {
      drawings.push(layoutSheet(drawn, s.id, symbols, FLAG_LIB_ID, backend, packingOf(s.id)));
    } catch (caught) {
      if (!(caught instanceof SchgenRefusal)) throw caught;
      findings.push(...caught.findings);
      undrawn.push(`sheet ${s.id}: ${caught.message}`);
    }
  }
  return { drawings, findings, undrawn };
}
