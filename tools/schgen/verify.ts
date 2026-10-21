/**
 * Ported from digital-pedal-platform's `tools/schgen/verify.ts` and DIVERGED from it by Task 11
 * of the M1 schematic-authoring plan, and **DIVERGED FURTHER BY TASK 16**: every `GateResult`
 * carries the derivation it ran against (divergence 3 below).
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, and re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**.
 * Its `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md`.
 *
 * The gate runner: gates 1, 3, 6 and 7 against the committed output directory. Gates 2 (ERC),
 * 4 (pin map) and 5 (BOM) are not this file's. A refusal never throws out of `runGates`: a
 * gate's thrown error becomes that gate's problems.
 *
 * **THE THREE DIVERGENCES, all forced and the first two narrow.** This count is the file's own
 * census of itself, and a reader reconciling it against the code must find no discrepancy: the
 * rule `tests/schgen/port-fidelity.test.ts` enforces between the manifest's lists - *a root is
 * either enumerated completely or not at all* - applies to a file's list of its own divergences
 * too. It read **two** for a whole round after Task 16 added the third, and nothing failed,
 * because R18's test only checks that `task` and `why` are non-empty
 * (`docs/known-gaps.md` records it).
 *
 * 1. **ONE NETLIST READER.** Pedals exports `kicadxml` and reads it with `connectivityFromXml`
 *    over `fast-xml-parser`. This repository reads the s-expression export with
 *    `lib/kicad/netlist.ts`'s `importNetlist`, which every other netlist consumer here already
 *    uses, so gate 3 reads it too and no XML parser enters the tree.
 *    `tools/schgen/kicad-run.ts`'s `exportNetlist` asks `kicad-cli` for `kicadxml` and is a
 *    PORTED file this task may not edit, so `exportSexprNetlist` below asks the same hermetic
 *    `runKicadCli` for `kicadsexpr` instead. It is the one new function in this file.
 *
 * 2. **GATE 8's GRAPH COMPARISON IS NOT PORTED YET, AND THIS FILE SAYS SO OUT LOUD.**
 *    `gates/oscar/compare.ts` and `gates/oscar/graph.ts` are Task 18's (the latter needs
 *    `@/kicad/components`, which this manifest does not resolve). **Gate 8 is NOT deferred** -
 *    spec revision 4 moved its empty-delta half into M1 and `docs/known-gaps.md` **G104**
 *    records why the deferral argument was withdrawn. So a design that declares `oscar` still
 *    gets a gate 8 row, and that row carries a refusal naming Task 18 rather than vanishing: a
 *    gate omitted from the census reads exactly like a gate that passed, which is the failure
 *    `CLAUDE.md` names. `annotationProblems` and `symmetricSymbolsProblems` are gate 8's two
 *    graph-free halves and are KEPT, tested, and waiting for Task 18 to wire them - deleting
 *    them would make Task 18 re-transcribe them from a source this file no longer re-derives
 *    from.
 *
 * 3. **EVERY GATE ROW NAMES THE DERIVATION IT RAN AGAINST - about a hundred lines Task 16 added,
 *    and the widest of the three.** Pedals' `GateResult` is `{ gate, problems }`. Here it carries
 *    a third field, `manifest`, and three new members build it: `manifestState` reads the
 *    `MANIFEST.json` committed in `outDir` and compares its input hashes against what this run
 *    read (`staleManifestInputs`), `baselineCensus` reads the readability-baseline registry and
 *    reports the count it holds, and `runGates` attaches the pair's problems to the rows that
 *    would otherwise read as a pass and only those. `runGate` takes the citation as a third
 *    parameter defaulting to `MANIFEST_UNREAD`. **It is not a tidy-up: spec §2.1's criterion is
 *    that a gate reporting a pass names the manifest it passed against**, and there is no way to
 *    meet that in a two-field row. The cost is that this is now the largest divergence in the
 *    file and the one a later port has to re-apply by hand.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importNetlist, KICAD_CLI } from "../../lib/kicad/netlist.ts";
import type { LoadedDesign, OscarConfig } from "../../lib/schgen/design.ts";
import { generate, staleFiles, type GenerateEnv, type Generation } from "./generate.ts";
import { compareConnectivity, expectedConnectivity } from "../../lib/schgen/gates/connectivity.ts";
import { checkPinIdentity, footprintPads } from "../../lib/schgen/gates/pin-identity.ts";
import { loadPinTables, type PinTable } from "../../lib/schgen/gates/pin-table.ts";
import { checklistIds, checkTraceability } from "../../lib/schgen/gates/traceability.ts";
import { stockFootprintTable } from "./kicad-config.ts";
import { runKicadCli, stderrProblems } from "./kicad-run.ts";
import { MANIFEST_FILE, manifestInputsOf, parseManifest, sha256, staleManifestInputs } from "../../lib/schgen/manifest.ts";
import { BASELINES_FILE, loadBaselines } from "../../lib/schgen/readability/baseline.ts";

export interface GateResult {
  readonly gate: string;
  readonly problems: readonly string[];
  /**
   * **THE DERIVATION AND THE GOVERNANCE THIS GATE RAN AGAINST - spec §2.1's criterion, which is
   * that *"a gate that reports a pass names the manifest it passed against"*.**
   *
   * It is a field on every row and never blank, because the thing §2.1 exists to prevent is four
   * checks that each pass while nobody can say they ran over one derivation. A row whose
   * `problems` are empty and whose `manifest` named nothing would be exactly that.
   *
   * **IT NAMES TWO FILES AND NOT ONE.** `MANIFEST.json` is the derivation; and the readability
   * baseline registry's COUNT is printed beside it, because *"zero baselines"* and *"some baselines
   * that this row did not consult"* are different states and a row that said nothing would leave a
   * reader to assume the second. §3.3's acceptance table makes zero the correct state for a first
   * generation, which every circuit here is - so it is information on the row rather than a problem.
   */
  readonly manifest: string;
}

export const GATES = {
  upToDate: "1 up to date",
  netlist: "3 netlist equals IR",
  pinIdentity: "6 pin identity",
  checklist: "7 checklist traceability",
  oscar: "8 OSCAR equivalence",
} as const;

export const NOT_RUN = "not run: generation was refused";

/**
 * Gate 8's refusal while its graph comparison is unported. It is a PROBLEM and not a skip: the
 * gate appears in the census with this text, so nobody reads its absence as agreement.
 */
export const OSCAR_NOT_PORTED =
  "gate 8 is not available: lib/schgen/gates/oscar/compare.ts and graph.ts are not ported yet " +
  "(Task 18 of the M1 schematic-authoring plan; graph.ts needs @/kicad/components, which " +
  "tools/schgen/port-manifest.json does not resolve). This design declares `oscar`, so the gate " +
  "is reported as unavailable rather than omitted - see docs/known-gaps.md G104.";

export interface SexprNetlist {
  /** The `.net` export's text, as `importNetlist` takes it. */
  readonly text: string;
  readonly stderr: string;
}

/**
 * `kicad-cli sch export netlist --format kicadsexpr`, under the same hermetic configuration
 * `runKicadCli` gives every other invocation.
 *
 * It exists because the ported `exportNetlist` asks for `kicadxml` (see this file's divergence 1)
 * and a ported file may not be hand-edited. The temp directory is removed in a `finally`; this
 * file is not under `tests/`, so `tests/stripboard/temp-scratch.test.ts`'s sweep does not reach
 * it, and the removal is the scope-local one that sweep prefers anyway.
 */
export function exportSexprNetlist(schPath: string): SexprNetlist {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-net-sexpr-"));
  try {
    const out = path.join(dir, "netlist.net");
    const r = runKicadCli(["sch", "export", "netlist", "--format", "kicadsexpr", "-o", out, schPath]);
    if (r.status !== 0) throw new Error(`kicad-cli netlist export failed (${r.status}) for ${schPath}:\n${r.stderr}`);
    if (!fs.existsSync(out)) throw new Error(`kicad-cli wrote no netlist for ${schPath}:\n${r.stderr}`);
    return { text: fs.readFileSync(out, "utf8"), stderr: r.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** An error's message, one problem per non-blank line. */
function messageLines(e: unknown): string[] {
  const text = e instanceof Error ? e.message : String(e);
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

/** Runs one gate; an error it throws becomes its problems instead of escaping. */
export function runGate(gate: string, check: () => readonly string[], manifest: string = MANIFEST_UNREAD): GateResult {
  try {
    return { gate, problems: check(), manifest };
  } catch (e) {
    return { gate, problems: messageLines(e), manifest };
  }
}

/** The citation a gate carries when no generation happened, so no manifest could be compared. */
export const MANIFEST_UNREAD = `${MANIFEST_FILE} not read: generation was refused, so no gate here reports a pass`;

/**
 * THE COMMITTED MANIFEST, AND WHETHER IT IS STILL LIVE - spec §2.1's second half: *"a manifest
 * whose input hashes do not match the files on disk fails rather than regenerating silently."*
 *
 * **WHAT IS COMPARED AGAINST WHAT, because the obvious version of this check is a tautology.** The
 * manifest `generate` just built is live for the inputs `generate` just read, by construction -
 * comparing those two would be `x !== x`, which is the shape `docs/known-gaps.md` **G179** and the
 * Task 13 review both name. What is compared here is the manifest **committed in `outDir`** against
 * the inputs this run read: a template edit, a rule edit, a reordered block or a changed netlist
 * export moves an input hash, the committed manifest no longer describes the derivation, and every
 * gate that would otherwise report a pass stops reporting one.
 *
 * **GATE 1 ALSO NOTICES, AND THE TWO ARE NOT THE SAME CHECK.** `staleFiles` compares
 * `MANIFEST.json` by content like every other generated file and says *this file differs*. This
 * says **which input moved**, and it attaches that to every gate rather than to gate 1 alone -
 * which is the half gate 1 cannot give, because gates 3, 6, 7 and 8 run and pass today whatever
 * gate 1 reported.
 */
interface ManifestState {
  readonly citation: string;
  readonly problems: readonly string[];
}

function manifestState(d: LoadedDesign, g: Generation): ManifestState {
  const file = path.join(d.outDir, MANIFEST_FILE);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    return {
      citation: `${MANIFEST_FILE} absent from ${d.outDir}`,
      problems: [
        `${MANIFEST_FILE} is not in the output directory (${e instanceof Error ? e.message : String(e)}), so no gate ` +
          "here can name the derivation it passed against. Spec 2.1: four link checks that each " +
          "pass prove nothing jointly unless they ran over the same derivation. It is reported " +
          "loudly rather than regenerated: run `bun run schgen generate` and commit the manifest.",
      ],
    };
  }
  const citation = `${MANIFEST_FILE} ${sha256(text).slice(0, 12)}`;
  try {
    const stale = staleManifestInputs(parseManifest(text), manifestInputsOf(g.manifestSources, g.files));
    if (stale.length === 0) return { citation, problems: [] };
    return {
      citation: `${citation} (NOT LIVE)`,
      problems: [
        `${MANIFEST_FILE} records input hashes that no longer match what this run read, so it does ` +
          "not describe this derivation and nothing here is a pass. It is NOT regenerated silently " +
          `(spec 2.1): ${stale.join("; ")}`,
      ],
    };
  } catch (e) {
    return { citation: `${citation} (unreadable)`, problems: messageLines(e) };
  }
}

/**
 * The readability-baseline registry, READ, with the count it holds reported.
 *
 * **IT IS INFORMATION AND NEVER A PROBLEM, and that is spec §3.3's acceptance table rather than
 * leniency**: *"a circuit generated for the first time reports the measures with no pass or fail.
 * A first generation has nothing to regress against, and inventing a verdict for it is inventing a
 * threshold."* The registry ships empty, so every lookup is `absent`, so there is nothing here to
 * refuse.
 *
 * **WHAT IT DOES BUY IS THAT THE LOADER RUNS IN PRODUCTION AND THAT THE COUNT IS PRINTED.** A
 * malformed registry refuses loudly on the next `verify` rather than on whatever day somebody first
 * grants a baseline; and a reader is told *zero baselines* rather than left to assume there were
 * some, which is the protection this registry has in place of the approvals loader's
 * refuse-an-empty-list clause (see `lib/schgen/readability/baseline.ts`).
 */
export function baselineCensus(): ManifestState {
  try {
    const registry = loadBaselines();
    return { citation: `${BASELINES_FILE} ${registry.baselines.length} baseline(s)`, problems: [] };
  } catch (e) {
    return {
      citation: `${BASELINES_FILE} UNREADABLE`,
      problems: [
        "the readability-baseline registry could not be read, so no gate here can say what " +
          "externally-held judgement it ran under. It is reported rather than treated as an empty " +
          "registry: an absent file is not \"no baseline is held\". " + messageLines(e).join(" "),
      ],
    };
  }
}

function netlistGate(d: LoadedDesign, g: Generation): string[] {
  const net = exportSexprNetlist(path.join(d.outDir, `${d.spec.project}.kicad_sch`));
  return compareConnectivity(expectedConnectivity(g.circuit, g.annotation.refs), importNetlist(net.text), net.stderr);
}

function pinIdentityGate(d: LoadedDesign, g: Generation, env: GenerateEnv): string[] {
  const pads = footprintPads(d.outDir, stockFootprintTable(KICAD_CLI, env.kicadVersion));
  const tables: ReadonlyMap<string, PinTable> = d.spec.pinTables === null ? new Map() : loadPinTables(path.resolve(d.dir, d.spec.pinTables));
  return checkPinIdentity(g.circuit, g.symbols, tables, pads, new Set(Object.keys(d.spec.symbolLibs)));
}

function checklistGate(d: LoadedDesign, g: Generation): string[] {
  const cfg = d.spec.checklist;
  if (cfg === null) throw new Error("internal: checklist gate run without a checklist configuration");
  const allIds = checklistIds(fs.readFileSync(path.resolve(d.dir, cfg.file), "utf8"));
  return checkTraceability({ circuit: g.circuit, allIds, prefixes: cfg.prefixes, nonSchematic: cfg.nonSchematic });
}

/**
 * Gate 8 fails on annotation errors in an OSCAR board's export: they make the reference graph
 * unsound. Every other stderr line is ignored, because OSCAR's schematics are foreign and pinned:
 * an unrelated warning there has no fix in this tree.
 */
export function annotationProblems(board: string, stderr: string): string[] {
  return stderrProblems(stderr)
    .filter((l) => /annotation error/i.test(l))
    .map((l) => `board ${board}: kicad-cli reported annotation errors (${l})`);
}

/** oscar.symmetricSymbols must give every netlist board its own list ([] for none) and name no other board. */
export function symmetricSymbolsProblems(cfg: OscarConfig): string[] {
  const problems: string[] = [];
  for (const board of Object.keys(cfg.netlists)) {
    if (!Object.hasOwn(cfg.symmetricSymbols, board)) {
      problems.push(`board ${board} is declared in oscar.netlists but has no oscar.symmetricSymbols entry (use [] for none)`);
    }
  }
  for (const board of Object.keys(cfg.symmetricSymbols)) {
    if (!Object.hasOwn(cfg.netlists, board)) problems.push(`oscar.symmetricSymbols names board ${board}, which is not in oscar.netlists`);
  }
  return problems;
}

/**
 * Gate 8 until Task 18 ports the graph comparison: the checks that need no graph, plus
 * `OSCAR_NOT_PORTED` so the row can never be read as a pass.
 */
function oscarGate(d: LoadedDesign): string[] {
  const cfg = d.spec.oscar;
  if (cfg === null) throw new Error("internal: OSCAR gate run without an oscar configuration");
  return [OSCAR_NOT_PORTED, ...symmetricSymbolsProblems(cfg)];
}

/**
 * Gates 1, 3, 6, then 7 and 8 when the design configures them. verify never initialises a
 * reference lock or accepts toolchain drift, whatever `env` says: both flags are forced off.
 * When gate 1's generation is refused, every later gate reports NOT_RUN and runs nothing.
 */
export async function runGates(d: LoadedDesign, env: GenerateEnv): Promise<GateResult[]> {
  let generation: Generation | null;
  let gate1: GateResult;
  try {
    // Task 12: `generate` is async (plan decision D2's ELK pre-pass), so this is too.
    generation = await generate(d, { ...env, initLock: false, acceptToolchain: false });
    const produced = generation;
    gate1 = runGate(GATES.upToDate, () => staleFiles(d, produced));
  } catch (e) {
    generation = null;
    gate1 = { gate: GATES.upToDate, problems: messageLines(e), manifest: MANIFEST_UNREAD };
  }
  const later: { gate: string; check: (gen: Generation) => string[] }[] = [
    { gate: GATES.netlist, check: (gen) => netlistGate(d, gen) },
    { gate: GATES.pinIdentity, check: (gen) => pinIdentityGate(d, gen, env) },
  ];
  if (d.spec.checklist !== null) later.push({ gate: GATES.checklist, check: (gen) => checklistGate(d, gen) });
  if (d.spec.oscar !== null) later.push({ gate: GATES.oscar, check: () => oscarGate(d) });
  const g = generation;
  // Spec 2.1's criterion, attached here rather than inside each gate: the manifest is one
  // derivation's record and the gates are checks over it, so one read and one comparison serve all
  // of them.
  const derivation = g === null ? { citation: MANIFEST_UNREAD, problems: [] } : manifestState(d, g);
  const baselines = baselineCensus();
  const manifest = {
    citation: `${derivation.citation}; ${baselines.citation}`,
    problems: [...derivation.problems, ...baselines.problems],
  };
  const rows: GateResult[] = [
    { ...gate1, manifest: manifest.citation },
    ...later.map(({ gate, check }) =>
      g === null ? { gate, problems: [NOT_RUN], manifest: manifest.citation } : runGate(gate, () => check(g), manifest.citation),
    ),
  ];
  // **THE MANIFEST's OWN PROBLEMS GO ON THE ROWS THAT WOULD OTHERWISE READ AS A PASS, and only
  // those.** Spec 2.1's criterion is about a gate that REPORTS A PASS; a row already carrying a
  // problem is already not one, and repeating the manifest complaint on five rows would bury the
  // thing that actually failed. A row with no problems and a dead manifest is exactly the shape
  // 2.1 exists to refuse, so that row gets it.
  if (manifest.problems.length === 0) return rows;
  return rows.map((row) => (row.problems.length === 0 ? { ...row, problems: manifest.problems } : row));
}
