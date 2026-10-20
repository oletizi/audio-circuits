/**
 * **WHICH GATES RUN ON THIS REPOSITORY'S FOUR PARITY CIRCUITS, AND WHICH DO NOT AND WHY** - Task
 * 11's census, committed so it is re-run rather than rebuilt from a recipe in prose.
 *
 *   bun run tools/schgen/gate-census.ts
 *
 * **A GATE THAT DID NOT RUN IS NAMED, NEVER OMITTED.** That is the whole reason this is a tool
 * and not a paragraph: `CLAUDE.md`'s rule is that *"a skipped check must never look like a
 * passing one"*, and the way a gate census breaks that rule is by listing four gates and quietly
 * leaving out the fifth. So every gate `runGates` can register appears below with its problem
 * count, and the two that cannot register appear with the reason:
 *
 * | gate | on these four circuits |
 * | --- | --- |
 * | 1 up to date | registered; it is the one that refuses, and it refuses for a reason that is NOT a defect - see below |
 * | 3 netlist equals IR | registered, and reports `not run: generation was refused` after gate 1 refuses |
 * | 6 pin identity | the same |
 * | 7 checklist traceability | **NOT REGISTERED**: `DesignSpec.checklist` is null for every one of these designs and `runGates` registers gate 7 only when it is not. The gate PORTS WHOLE (`lib/schgen/gates/traceability.ts`) and its twenty ported tests pass over fixtures - but nothing in this repository has a `SCHEMATIC-CHECKLIST.md`, so **gate 7 is unexercised against a real circuit** and this census says so rather than letting its absence read as a pass. `docs/known-gaps.md` records it. |
 * | 8 OSCAR equivalence | **NOT REGISTERED**: `DesignSpec.oscar` is null for every one of these designs. Gate 8 is **not deferred** (spec revision 4; **G104**) - Task 18 ports its graph comparison - and `tools/schgen/verify.ts` reports `OSCAR_NOT_PORTED` for a design that does declare `oscar`, which `tests/schgen/verify.test.ts` drives. |
 *
 * **WHY GATE 1 REFUSES, AND WHY THAT IS THE CORRECT RESULT RATHER THAN A DEFECT.**
 * `docs/known-gaps.md` **G151** measured it: `circuitSpecFrom`'s output does not pass
 * `validateCircuit`, because passing would need an invented net rename, an invented no-connect
 * reason and invented BOM fields - and *"no backend invents an input"*. `generate` calls
 * `validateCircuit` and throws, so gate 1 carries those refusals and every later gate cascades to
 * `NOT_RUN`. **Nothing here calls `validateCircuit` differently, relaxes a rule, or supplies a
 * value the model does not hold**, which G151's criterion forbids: the refusals ARE the
 * measurement. A circuit that stops refusing is a circuit whose authoring declaration grew the
 * three missing things honestly.
 *
 * **IT MEASURES THE DERIVED ARM.** Each circuit is built, `circuitSpecFrom` turns it into a
 * `CircuitSpec` under its authoring declaration, and the result goes to the real `runGates`
 * through a real `LoadedDesign`. Nothing is read off a text sweep. The designs are assembled here
 * because this repository has no `DesignSpec` module for any of the four - `tools/schgen/parity.ts`
 * is the precedent for assembling one from the authoring declaration, and the only fields this
 * file chooses are the four `null`s above and an empty `symbolLibs`, which points every nickname
 * at the installed stock directory exactly as `tools/schgen/authoring-census.ts`'s resolver does.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import type { DesignSpec, LoadedDesign } from "../../lib/schgen/design.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { GenerateEnv } from "./generate.ts"
import { kicadVersion } from "./kicad-run.ts"
import { GATES, runGates, type GateResult } from "./verify.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/** The gates `runGates` can register, in the order it returns them, with why each may be absent. */
export const GATE_ORDER: readonly { readonly gate: string; readonly absentWhen: string }[] = [
  { gate: GATES.upToDate, absentWhen: "never: gate 1 always runs" },
  { gate: GATES.netlist, absentWhen: "never: gate 3 always registers, and reports NOT_RUN when gate 1 refused" },
  { gate: GATES.pinIdentity, absentWhen: "never: gate 6 always registers, and reports NOT_RUN when gate 1 refused" },
  { gate: GATES.checklist, absentWhen: "the design's `checklist` is null, so there is no checklist to trace to" },
  { gate: GATES.oscar, absentWhen: "the design's `oscar` is null, so there is no reference board to compare against" },
]

export interface CircuitGates {
  readonly name: string
  readonly entry: string
  readonly results: readonly GateResult[]
  /** Gates in `GATE_ORDER` that `runGates` did not register, with the reason. */
  readonly notRegistered: readonly { readonly gate: string; readonly why: string }[]
}

/**
 * One parity circuit as a `LoadedDesign`, with `outDir` pointed at `scratch`.
 *
 * `dir` is the repository root rather than the circuit's own directory, because `generatedFiles`
 * puts the design file's path relative to its repository root in the title block and nothing here
 * writes a file anyway - `runGates` forces `initLock: false`, so the generation only reads.
 */
export function parityDesign(c: ParityCase, symbols: SymbolResolver, repoRoot: string, scratch: string): LoadedDesign {
  const spec: DesignSpec = {
    project: c.name,
    outDir: scratch,
    circuit: circuitSpecFrom(c.network, c.authoring, symbols),
    // Empty: every nickname resolves in the installed stock symbol directory, which is where
    // `lib/schgen/render/stock-symbols.ts` resolves them too. Naming them as PROJECT libraries
    // instead would make gate 6 require a pin table for every part in the repository, which
    // would be a finding about this file rather than about the circuits.
    symbolLibs: {},
    footprintLibs: {},
    pinTables: null,
    checklist: null,
    oscar: null,
    ercExclusions: [],
  }
  return { file: path.join(repoRoot, `${c.name}.design.ts`), dir: repoRoot, spec, outDir: scratch }
}

export async function gateCensus(repoRoot: string): Promise<readonly CircuitGates[]> {
  const symbols = parityResolver()
  const kicad = kicadVersion()
  const stockDir = stockSymbolDir()
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-gate-census-"))
  try {
    const out: CircuitGates[] = []
    for (const c of PARITY_CASES) {
      // Task 12: `authoring` is the ELK pre-pass's input, and each parity case has its own. Gate 1
      // refuses on all four before the pre-pass runs (docs/known-gaps.md G151, G178), so this
      // changes no row today - it is passed because it is the circuit's own declaration and
      // passing `null` would be a claim that the circuit has none.
      const env: GenerateEnv = { kicadVersion: kicad, stockDir, initLock: false, acceptToolchain: false }
      const results = await runGates(parityDesign(c, symbols, repoRoot, scratch), env)
      const registered = new Set(results.map((r) => r.gate))
      out.push({
        name: c.name,
        entry: c.entry,
        results,
        notRegistered: GATE_ORDER.filter(({ gate }) => !registered.has(gate)).map(({ gate, absentWhen }) => ({ gate, why: absentWhen })),
      })
    }
    return out
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

/**
 * The refusal CLASSES a gate's problems fall into, so a count of 163 is readable as the handful
 * of distinct reasons it actually is.
 *
 * **The four refusing classes are the ones `tests/schgen/authoring-complete.test.ts`'s
 * `RULE_CLASSES` already pins, with its matchers transcribed rather than re-invented** - that
 * test asserts those four and no others refuse, and each has its own register entry (`netNames`
 * **G150**, `pinsDeclared` **G151**, `singlePinNets` **G159**, `bomFields` **G149**). Writing a
 * second, differently-worded set here would make a FIFTH class look like a classification bug
 * instead of a finding. Anything unmatched is printed in full under `other: <problem>`, so a new
 * refusal shows up rather than disappearing into a total.
 */
const PROBLEM_CLASSES: readonly { readonly label: string; readonly match: (p: string) => boolean }[] = [
  { label: "header", match: (p) => p === "circuit is invalid:" },
  { label: "netNames (G150): net is not UPPER_SNAKE", match: (p) => p.includes("is not UPPER_SNAKE") },
  { label: "pinsDeclared (G151): pin neither on a net nor declared nc", match: (p) => p.includes("is neither on a net nor declared not connected") },
  { label: "singlePinNets (G159): net has only one pin", match: (p) => p.includes("has only one pin") },
  { label: "bomFields (G149): BOM field is empty", match: (p) => p.includes("BOM field") },
  { label: "gate cascaded: generation was refused", match: (p) => p === "not run: generation was refused" },
]

/** Problem class -> count, in `PROBLEM_CLASSES` order, with anything unmatched under `other`. */
export function classify(problems: readonly string[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>()
  for (const p of problems) {
    const found = PROBLEM_CLASSES.find(({ match }) => match(p))
    const label = found?.label ?? `other: ${p}`
    out.set(label, (out.get(label) ?? 0) + 1)
  }
  return out
}

export function renderGateCensus(census: readonly CircuitGates[], everyProblem: boolean): string {
  const lines: string[] = []
  for (const c of census) {
    lines.push(`${c.name} (${c.entry})`)
    for (const r of c.results) {
      lines.push(`  ran         ${r.gate.padEnd(28)} ${r.problems.length} problem(s)`)
      for (const [label, n] of classify(r.problems)) lines.push(`                  ${String(n).padStart(4)}  ${label}`)
      if (everyProblem) for (const p of r.problems) lines.push(`                        ${p}`)
    }
    for (const { gate, why } of c.notRegistered) {
      lines.push(`  DID NOT RUN ${gate.padEnd(28)} ${why}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

if (import.meta.main) {
  // The repository root, from this file's own location: two directories up from tools/schgen/.
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..")
  console.log(renderGateCensus(await gateCensus(repoRoot), process.argv.includes("--all")))
}
