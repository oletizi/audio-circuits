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
 * generation that SUCCEEDS, gate 8 reports `OSCAR_NOT_PORTED` rather than an empty problem list,
 * because a gate that reports nothing reads exactly like a gate that passed.
 */
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cap, RAILS } from "./__fixtures__/circuits.ts";
import type { DesignSpec, LoadedDesign } from "../../lib/schgen/design.ts";
import { generate, writeGeneration } from "../../tools/schgen/generate.ts";
import { annotationProblems, OSCAR_NOT_PORTED, runGate, runGates, symmetricSymbolsProblems } from "../../tools/schgen/verify.ts";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__", "symbols");
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

function spec(overrides: Partial<DesignSpec> = {}): DesignSpec {
  return {
    project: "mini",
    outDir: ".",
    circuit: {
      parts: [cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND")],
      blocks: [{ id: "DEC", sheet: "pwr", title: "D", members: ["C1", "C2"], checklist: [], rendering: DECOUPLING }],
      sheets: [{ id: "pwr", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] }],
      rails: RAILS.filter((r) => r.net !== "VDDA"),
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

describe("runGates", () => {
  it("after a gate-1 generate refusal, reports every later gate as not run", () => {
    const d = loaded(tmpDir(), spec());
    // No refs.lock.json in the empty tmp dir and initLock false: generate refuses in gate 1.
    const r = runGates(d, ENV);
    expect(r).toEqual([
      { gate: "1 up to date", problems: [expect.stringMatching(/refs\.lock\.json not found; run pnpm schgen generate --init/)] },
      { gate: "3 netlist equals IR", problems: ["not run: generation was refused"] },
      { gate: "6 pin identity", problems: ["not run: generation was refused"] },
      { gate: "7 checklist traceability", problems: ["not run: generation was refused"] },
    ]);
  });

  it("cascades to gate 8 when OSCAR is configured, and omits gate 7 when no checklist is", () => {
    const dir = tmpDir();
    const r = runGates(loaded(dir, spec({ checklist: null, oscar: OSCAR })), ENV);
    expect(r.map((g) => g.gate)).toEqual(["1 up to date", "3 netlist equals IR", "6 pin identity", "8 OSCAR equivalence"]);
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN, NOT_RUN]);
  });

  it("reports an invalid circuit as gate 1 problems, one per line, and cascades", () => {
    const dir = tmpDir();
    const s = spec();
    const bad = spec({ circuit: { ...s.circuit, parts: [cap("C1", "3V3", "GND"), cap("C2", "low_er", "GND")] } });
    const r = runGates(loaded(dir, bad), ENV);
    const gate1 = r[0];
    expect(gate1?.gate).toBe("1 up to date");
    expect(gate1?.problems[0]).toBe("circuit is invalid:");
    expect(gate1?.problems.length).toBeGreaterThan(1);
    for (const p of gate1?.problems ?? []) expect(p).not.toContain("\n");
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN, NOT_RUN]);
  });

  it("refuses toolchain drift in gate 1 even when the caller passes acceptToolchain, and writes nothing", () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null }));
    writeGeneration(d, generate(d, { ...ENV, initLock: true }));
    const lockBefore = fs.readFileSync(path.join(dir, "schgen.lock.json"), "utf8");
    const r = runGates(d, { ...ENV, kicadVersion: "10.1.0", acceptToolchain: true, initLock: true });
    expect(r[0]?.problems).toEqual([
      expect.stringMatching(/^toolchain drift against .*schgen\.lock\.json; nothing was written:$/),
      "- KiCad 10.1.0 does not match the locked 10.0.5: 10.0.x is pinned",
    ]);
    expect(r.slice(1).map((g) => g.problems)).toEqual([NOT_RUN, NOT_RUN]);
    expect(fs.readFileSync(path.join(dir, "schgen.lock.json"), "utf8")).toBe(lockBefore);
  });

  /**
   * ADDED BY TASK 11, and it is the claim the divergence above exists to make: gate 8 is
   * unavailable here, and an unavailable gate must report a PROBLEM. With a generation that
   * succeeds, gate 8's row is reached and carries the refusal - so neither its absence nor an
   * empty problem list can be read as OSCAR equivalence holding.
   */
  it("reports gate 8 as unavailable, not as passing, when the generation succeeds", () => {
    const dir = tmpRepo();
    const d = loaded(dir, spec({ checklist: null, oscar: OSCAR }));
    writeGeneration(d, generate(d, { ...ENV, initLock: true }));
    const r = runGates(d, ENV);
    const gate8 = r.find((g) => g.gate === "8 OSCAR equivalence");
    expect(gate8?.problems).toEqual([OSCAR_NOT_PORTED]);
    expect(gate8?.problems).not.toEqual([]);
    expect(r[0]?.problems).toEqual([]);
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
    expect(runGate("x", () => ["a", "b"])).toEqual({ gate: "x", problems: ["a", "b"] });
  });

  it("turns a gate's thrown error into its problems, one per line", () => {
    const r = runGate("x", () => {
      throw new Error("first\n  - second\n");
    });
    expect(r).toEqual({ gate: "x", problems: ["first", "- second"] });
  });
});

describe("annotationProblems", () => {
  it("turns only annotation-error stderr lines into board problems", () => {
    const stderr = "Fontconfig warning: x\nSome unrelated warning\nError: 2 annotation errors found\n";
    expect(annotationProblems("PROC", stderr)).toEqual(["board PROC: kicad-cli reported annotation errors (kicad-cli: Error: 2 annotation errors found)"]);
    expect(annotationProblems("PROC", "Some unrelated warning\n")).toEqual([]);
  });
});
