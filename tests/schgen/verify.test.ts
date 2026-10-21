/**
 * Ported from digital-pedal-platform's `tools/schgen/verify.test.ts` and DIVERGED from it by
 * Task 11 of the M1 schematic-authoring plan.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, and re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**.
 * Its `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md`.
 *
 * **WHAT DIVERGED.** The fixture spec drops `mcu: null` and `pinmap: null` (**G112**) and its one
 * block's `{ kind: "labels", reason: "t" }` rendering becomes `{ kind: "bus", groups: [] }` (D3,
 * **G140**) - the substitution nine other diverged files already carry. The
 * `oscarBoardGraph` describe is DELETED, because that function needs
 * `gates/oscar/graph.ts`'s `graphFromNetlist`, which is Task 18's; the two gate-8 halves that
 * need no graph (`symmetricSymbolsProblems`, `annotationProblems`) keep their describes verbatim.
 *
 * **THE GATE-8 CASCADE TEST IS UNCHANGED AND STILL MEANS WHAT IT MEANT.** `runGates` still
 * registers a gate 8 row for a design that declares `oscar`, so that row still reports
 * `NOT_RUN` after a gate-1 refusal. The one test added here is the other half of that: with a
 * generation that SUCCEEDS, gate 8 reports a PROBLEM rather than an empty problem list, because a
 * gate that reports nothing reads exactly like a gate that passed. **Task 18 changed which problem
 * it is**: the row used to carry `OSCAR_NOT_PORTED`, and now that the M1 comparison is wired it
 * carries `OSCAR_NO_REFERENCE`, because this fixture's `oscar.netlists` is empty and a gate with
 * nothing to compare against still does not pass. Task 18 adds two cases beside it: a declared
 * reference that is not on disk is reported LOUDLY, and a declaration whose permitted-delta file is
 * not a committed .json is refused by name.
 */
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cap, RAILS } from "./__fixtures__/circuits.ts";
import type { DesignSpec, LoadedDesign } from "../../lib/schgen/design.ts";
import { generate, writeGeneration } from "../../tools/schgen/generate.ts";
import { annotationProblems, baselineCensus, MANIFEST_UNREAD, OSCAR_NO_REFERENCE, oscarBriefNotJson, oscarReferenceMissing, runGate, runGates, symmetricSymbolsProblems } from "../../tools/schgen/verify.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "./__fixtures__/orientations.ts";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__", "symbols");
// Task 13, ruling R29: the ELK pre-pass's two declared inputs now reach it through the IR, so
// `GenerateEnv` carries no authoring declaration at all. This fixture design's one block declares
// the `decoupling-bank` template, so no block selects ELK and the pre-pass has nothing to do.
const ENV = { kicadVersion: "10.0.5", stockDir: FIX, initLock: false, acceptToolchain: false };
const NOT_RUN = ["not run: generation was refused"];

/**
 * **WHY NOT `{ kind: "bus", groups: [] }` HERE**, which is the substitution nine other diverged
 * files use for a deleted `labels` rendering: `realiseBus` refuses a block holding more than one
 * unit, and this block holds two capacitors. The `labels` renderer is the only one that drew a
 * multi-unit block, and D3 deleted it. `decoupling-bank` is what this block IS - two capacitors
 * across one rail pair - and it is the template the ported `mini` design gives its own DEC block.
 */
const DECOUPLING = { kind: "wired", template: "decoupling-bank", anchor: null } as const;

const VERIFY_PARTS = [cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND")];

function spec(overrides: Partial<DesignSpec> = {}): DesignSpec {
  return {
    project: "mini",
    outDir: ".",
    circuit: {
      parts: VERIFY_PARTS,
      blocks: [{ id: "DEC", sheet: "pwr", title: "D", members: ["C1", "C2"], checklist: [], rendering: DECOUPLING }],
      sheets: [{ id: "pwr", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] }],
      rails: RAILS.filter((r) => r.net !== "VDDA"),
      orientations: noOrientationPreferences(VERIFY_PARTS),
      portDirections: NO_PORT_DIRECTIONS,
    },
    symbolLibs: { Fix: path.join(FIX, "Fix.kicad_sym"), Pwr: path.join(FIX, "Pwr.kicad_sym") },
    footprintLibs: {},
    pinTables: null,
    checklist: { file: "CHECKLIST.md", prefixes: ["CORE"], nonSchematic: [] },
    oscar: null,
    ercExclusions: [],
    ...overrides,
  };
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A scratch directory removed after each test. */
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-"));
  dirs.push(dir);
  return dir;
}

/** A scratch directory that is its own repository root, so generation can name the design file. */
function tmpRepo(): string {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

function loaded(dir: string, s: DesignSpec): LoadedDesign {
  return { file: path.join(dir, "index.ts"), dir, outDir: dir, spec: s };
}

const OSCAR = { brief: "CORE-BRIEF.md", netlists: {}, symmetricSymbols: {}, subcircuits: [] };

/**
 * A COMMITTED permitted-delta declaration, absolute so it resolves from a temp design directory.
 *
 * It has to be committed: `parseDeclaredDeltas` refuses a declaration whose text is not git's HEAD
 * text, which is the whole provenance guarantee (`lib/schgen/gates/declared-delta.ts`). So the
 * cases below borrow the corpus `tests/schgen/gates/declared-delta.test.ts` owns rather than
 * writing one into the scratch directory, where it could never be committed.
 */
const DELTA_DECLARATION = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__", "deltas", "empty.json");

/**
 * Task 16: the citation every row carries when the generation was refused.
 *
 * It names BOTH files - there is no derivation to name, and the readability-baseline registry's
 * count is printed beside it because "zero baselines" and "baselines this row did not consult" are
 * different states. It is composed from the two exported pieces rather than written out as a
 * literal, so a change to either half cannot leave this test asserting a string nothing produces.
 */
const REFUSED_CITATION = `${MANIFEST_UNREAD}; ${baselineCensus().citation}`;

describe("runGates", () => {
  it("after a gate-1 generate refusal, reports every later gate as not run", async () => {
    const d = loaded(tmpDir(), spec());
    // No refs.lock.json in the empty tmp dir and initLock false: generate refuses in gate 1.
    const r = await runGates(d, ENV);
    // Task 16: every row names the manifest it ran against (spec 2.1). Here the generation was
    // refused, so there is no derivation to name and no row reports a pass - the citation says so
    // rather than being blank, which would read as "named nothing and passed anyway".
    expect(r).toEqual([
      { gate: "1 up to date", problems: [expect.stringMatching(/refs\.lock\.json not found; run pnpm schgen generate --init/)], manifest: REFUSED_CITATION },
      { gate: "3 netlist equals IR", problems: ["not run: generation was refused"], manifest: REFUSED_CITATION },
      { gate: "6 pin identity", problems: ["not run: generation was refused"], manifest: REFUSED_CITATION },
      { gate: "7 checklist traceability", problems: ["not run: generation was refused"], manifest: REFUSED_CITATION },
    ]);
  });

  it("cascades to gate 8 when OSCAR is configured, and omits gate 7 when no checklist is", async () => {
    const dir = tmpDir();
    const r = await runGates(loaded(dir, spec({ checklist: null, oscar: OSCAR })), ENV);
    expect(r.map((g) => g.gate)).toEqual(["1 up to date", "3 netlist equals IR", "6 pin identity", "8 OSCAR equivalence"]);
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN, NOT_RUN]);
  });

  it("reports an invalid circuit as gate 1 problems, one per line, and cascades", async () => {
    const dir = tmpDir();
    const s = spec();
    const bad = spec({ circuit: { ...s.circuit, parts: [cap("C1", "3V3", "GND"), cap("C2", "low_er", "GND")] } });
    const r = await runGates(loaded(dir, bad), ENV);
    const gate1 = r[0];
    expect(gate1?.gate).toBe("1 up to date");
    expect(gate1?.problems[0]).toBe("circuit is invalid:");
    expect(gate1?.problems.length).toBeGreaterThan(1);
    for (const p of gate1?.problems ?? []) expect(p).not.toContain("\n");
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN, NOT_RUN]);
  });

  it("refuses toolchain drift in gate 1 even when the caller passes acceptToolchain, and writes nothing", async () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const lockBefore = fs.readFileSync(path.join(dir, "schgen.lock.json"), "utf8");
    const r = await runGates(d, { ...ENV, kicadVersion: "10.1.0", acceptToolchain: true, initLock: true });
    expect(r[0]?.problems).toEqual([
      expect.stringMatching(/^toolchain drift against .*schgen\.lock\.json; nothing was written:$/),
      "- KiCad 10.1.0 does not match the locked 10.0.5: 10.0.x is pinned",
    ]);
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN]);
    expect(fs.readFileSync(path.join(dir, "schgen.lock.json"), "utf8")).toBe(lockBefore);
  });

  /**
   * ADDED BY TASK 11 and RETARGETED BY TASK 18: gate 8 must report a PROBLEM whenever it has not
   * compared anything. With a generation that succeeds, its row is reached - so neither its absence
   * nor an empty problem list can be read as OSCAR equivalence holding. Task 11's reason was that
   * the comparison was unported; Task 18's is that this fixture declares no reference, and the
   * refusal is specific to that.
   */
  it("reports gate 8 as having nothing to compare, not as passing, when the generation succeeds", async () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null, oscar: OSCAR }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const r = await runGates(d, ENV);
    const gate8 = r.find((g) => g.gate === "8 OSCAR equivalence");
    expect(gate8?.problems).toEqual([OSCAR_NO_REFERENCE]);
    expect(gate8?.problems).not.toEqual([]);
    expect(r[0]?.problems).toEqual([]);
  });

  /**
   * **TASK 18, STEP 6: A REFERENCE THE GATE CANNOT FIND REPORTS LOUDLY AND DOES NOT PASS.** This is
   * the gate whose absence a table already lost once (`docs/known-gaps.md` **G104**), and a missing
   * reference is the quietest way for it to stop checking anything: the comparison simply has no
   * second side. The refusal names the board and the path it looked for.
   */
  it("reports a declared reference that is not on disk, naming it, and does not pass", async () => {
    const dir = tmpRepo();
    const missing = path.join(dir, "no-such-board.kicad_sch");
    const oscar = { ...OSCAR, brief: DELTA_DECLARATION, netlists: { board: "no-such-board.kicad_sch" }, symmetricSymbols: { board: [] } };
    const d = loaded(dir, spec({ checklist: null, oscar }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const r = await runGates(d, ENV);
    const gate8 = r.find((g) => g.gate === "8 OSCAR equivalence");
    expect(gate8?.problems).toEqual([oscarReferenceMissing("board", missing)]);
    expect(gate8?.problems).not.toEqual([]);
  });

  /**
   * **AND THE PERMITTED-DELTA DECLARATION IS REFUSED BY NAME WHEN IT IS NOT ONE.** `oscar.brief` is
   * a `CORE-BRIEF.md` upstream and pedals' reader for it is not ported, so a design naming one is
   * told that rather than quietly compared under an empty delta - which would admit every
   * difference by default, the exact inversion of the gate's purpose.
   */
  it("refuses a CORE-BRIEF.md permitted-delta declaration by name rather than defaulting to empty", async () => {
    const dir = tmpRepo();
    // A reference that EXISTS, so the gate gets past the missing-reference arm to the declaration.
    const oscar = { ...OSCAR, brief: "CORE-BRIEF.md", netlists: { board: "power.kicad_sch" }, symmetricSymbols: { board: [] } };
    const d = loaded(dir, spec({ checklist: null, oscar }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const r = await runGates(d, ENV);
    const gate8 = r.find((g) => g.gate === "8 OSCAR equivalence");
    expect(gate8?.problems.join(" ")).toContain(oscarBriefNotJson("CORE-BRIEF.md"));
  });

  /** A declared subcircuit is M2's and is refused rather than ignored. */
  it("refuses an oscar.subcircuits declaration, naming it as M2's", async () => {
    const dir = tmpRepo();
    const sub = { id: "VCAP", board: "board", oscar: { parts: [], anchors: {}, rails: {} }, ours: { parts: [], anchors: {}, rails: {} }, deltas: [] };
    const oscar = { ...OSCAR, netlists: {}, symmetricSymbols: {}, subcircuits: [sub] };
    const d = loaded(dir, spec({ checklist: null, oscar }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const r = await runGates(d, ENV);
    const gate8 = r.find((g) => g.gate === "8 OSCAR equivalence");
    expect(gate8?.problems.join(" ")).toContain("the subcircuit comparison is M2's");
    expect(gate8?.problems.join(" ")).toContain(OSCAR_NO_REFERENCE);
  });

  /**
   * **SPEC §2.1's CRITERION, BOTH HALVES, AS CHECKS THAT CAN FAIL** (Task 16): *"a gate that
   * reports a pass names the manifest it passed against, and a manifest whose input hashes do not
   * match the files on disk fails rather than regenerating silently."*
   *
   * The control is the test above: with the manifest written and live, gate 1's problems are
   * empty. These two take it away in the two ways it can go.
   */
  it("names the manifest on every row, and the citation is the file's own hash when it is live", async () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const r = await runGates(d, ENV);
    expect(r.length).toBeGreaterThan(1);
    for (const row of r) {
      expect(row.manifest, row.gate).toMatch(/^MANIFEST\.json [0-9a-f]{12}; schematic\/readability-baselines\.json 0 baseline\(s\)$/);
    }
    expect(r[0]?.problems).toEqual([]);
  });

  /**
   * **THE GATES THAT WOULD HAVE REPORTED A PASS ARE IDENTIFIED FROM THE CONTROL RUN, NEVER NAMED
   * HERE.** This fixture's gate 6 already fails on its own (no pin table, an unresolvable
   * footprint), so an assertion over *every* row would be asserting that the manifest complaint
   * reaches a row it deliberately does not reach - and a test that named the passing gates as a
   * literal would stop meaning anything the moment the fixture changed. The control run says which
   * rows are passes; the perturbed run must take exactly those away and leave the rest alone.
   */
  async function passingGatesOf(d: LoadedDesign): Promise<readonly string[]> {
    return (await runGates(d, ENV)).filter((row) => row.problems.length === 0).map((row) => row.gate);
  }

  it("stops every would-be-passing gate when MANIFEST.json is absent", async () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const passing = await passingGatesOf(d);
    expect(passing.length, "the control run has a passing gate, or this proves nothing").toBeGreaterThan(0);

    fs.rmSync(path.join(dir, "MANIFEST.json"));
    const r = await runGates(d, ENV);
    expect(r.filter((row) => row.problems.length === 0).map((row) => row.gate), "no gate passes without a manifest").toEqual([]);
    // Gate 1 is taken away by `staleFiles` - the file it produced is not on disk - and every OTHER
    // control-passing gate is taken away by the manifest complaint, which is the half gate 1 cannot
    // give. So the complaint is asserted over the union rather than per row.
    for (const gate of passing) expect(r.find((x) => x.gate === gate)?.problems.length ?? 0, gate).toBeGreaterThan(0);
    expect(r.flatMap((row) => row.problems).join(" ")).toContain("is not in the output directory");
    for (const row of r) expect(row.manifest, row.gate).toContain("absent from");
  });

  it("stops every would-be-passing gate when a committed manifest's INPUT hash has moved, naming which", async () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null }));
    writeGeneration(d, await generate(d, { ...ENV, initLock: true }));
    const passing = await passingGatesOf(d);
    expect(passing.length, "the control run has a passing gate, or this proves nothing").toBeGreaterThan(0);

    const file = path.join(dir, "MANIFEST.json");
    const onDisk: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    if (typeof onDisk !== "object" || onDisk === null) throw new Error("the written manifest is not an object");
    // One input hash moved, and nothing else: the manifest is still well formed and still describes
    // the same output, so only staleManifestInputs can notice.
    fs.writeFileSync(file, JSON.stringify({ ...onDisk, templateLibrarySha256: "c".repeat(64) }, null, 2) + "\n");
    const r = await runGates(d, ENV);
    expect(r.filter((row) => row.problems.length === 0).map((row) => row.gate), "no gate passes against a dead manifest").toEqual([]);
    for (const gate of passing) expect(r.find((x) => x.gate === gate)?.problems.length ?? 0, gate).toBeGreaterThan(0);
    const all = r.flatMap((row) => row.problems).join(" ");
    expect(all, "it names WHICH input moved").toContain("templateLibrary: the manifest records");
    expect(all).toContain("It is NOT regenerated silently");
    for (const row of r) expect(row.manifest, row.gate).toContain("(NOT LIVE)");
  });

  it("names the readability-baseline registry and its count on every row", async () => {
    // Information and never a problem: spec 3.3's acceptance table makes zero the correct state for
    // a first generation. What it buys is that the loader RUNS and the count is printed, so a
    // reader is told zero rather than left to assume there were some.
    expect(baselineCensus().problems).toEqual([]);
    expect(baselineCensus().citation).toBe("schematic/readability-baselines.json 0 baseline(s)");
  });
});

describe("symmetricSymbolsProblems", () => {
  const cfg = (symmetricSymbols: Readonly<Record<string, readonly string[]>>) => ({
    brief: "CORE-BRIEF.md",
    netlists: { PROC: "p.kicad_sch", AUDIO: "a.kicad_sch" },
    symmetricSymbols,
    subcircuits: [],
  });

  it("accepts one list per netlist board", () => {
    expect(symmetricSymbolsProblems(cfg({ PROC: [":R_1"], AUDIO: [] }))).toEqual([]);
  });

  it("requires a list for every netlist board, [] for none", () => {
    expect(symmetricSymbolsProblems(cfg({ PROC: [] }))).toEqual(["board AUDIO is declared in oscar.netlists but has no oscar.symmetricSymbols entry (use [] for none)"]);
  });

  it("refuses a list for a board that has no netlist", () => {
    expect(symmetricSymbolsProblems(cfg({ PROC: [], AUDIO: [], SPARE: [] }))).toEqual(["oscar.symmetricSymbols names board SPARE, which is not in oscar.netlists"]);
  });
});

describe("runGate", () => {
  it("returns a gate's problems", () => {
    expect(runGate("x", () => ["a", "b"])).toEqual({ gate: "x", problems: ["a", "b"], manifest: MANIFEST_UNREAD });
  });

  it("turns a gate's thrown error into its problems, one per line", () => {
    const r = runGate("x", () => {
      throw new Error("first\n  - second\n");
    });
    expect(r).toEqual({ gate: "x", problems: ["first", "- second"], manifest: MANIFEST_UNREAD });
  });
});

describe("annotationProblems", () => {
  it("turns only annotation-error stderr lines into board problems", () => {
    const stderr = "Fontconfig warning: x\nSome unrelated warning\nError: 2 annotation errors found\n";
    expect(annotationProblems("PROC", stderr)).toEqual(["board PROC: kicad-cli reported annotation errors (kicad-cli: Error: 2 annotation errors found)"]);
    expect(annotationProblems("PROC", "Some unrelated warning\n")).toEqual([]);
  });
});
