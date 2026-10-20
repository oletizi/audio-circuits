/**
 * Ported from digital-pedal-platform's `tools/schgen/verify.ts` and DIVERGED from it by Task 11
 * of the M1 schematic-authoring plan.
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
 * **THE TWO DIVERGENCES, both forced and both narrow.**
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

export interface GateResult {
  readonly gate: string;
  readonly problems: readonly string[];
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
export function runGate(gate: string, check: () => readonly string[]): GateResult {
  try {
    return { gate, problems: check() };
  } catch (e) {
    return { gate, problems: messageLines(e) };
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
export function runGates(d: LoadedDesign, env: GenerateEnv): GateResult[] {
  let generation: Generation | null;
  let gate1: GateResult;
  try {
    generation = generate(d, { ...env, initLock: false, acceptToolchain: false });
    const produced = generation;
    gate1 = runGate(GATES.upToDate, () => staleFiles(d, produced));
  } catch (e) {
    generation = null;
    gate1 = { gate: GATES.upToDate, problems: messageLines(e) };
  }
  const later: { gate: string; check: (gen: Generation) => string[] }[] = [
    { gate: GATES.netlist, check: (gen) => netlistGate(d, gen) },
    { gate: GATES.pinIdentity, check: (gen) => pinIdentityGate(d, gen, env) },
  ];
  if (d.spec.checklist !== null) later.push({ gate: GATES.checklist, check: (gen) => checklistGate(d, gen) });
  if (d.spec.oscar !== null) later.push({ gate: GATES.oscar, check: () => oscarGate(d) });
  const g = generation;
  return [gate1, ...later.map(({ gate, check }) => (g === null ? { gate, problems: [NOT_RUN] } : runGate(gate, () => check(g))))];
}
