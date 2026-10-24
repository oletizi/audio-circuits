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
 * count, and the two that cannot register appear with the reason.
 *
 * **AND EVERY GATE THAT RAN NAMES THE DERIVATION IT RAN AGAINST** - spec §2.1, added in Task 16's
 * fix round 1; see `renderGateCensus`. **THIS TOOL AND THE TESTS ARE THE ONLY PLACES THAT RUN:**
 * `bun run schgen check` calls `generate` and `staleFiles` and never `runGates`, so a user at the
 * CLI never sees a gate's derivation citation - only the `MANIFEST.json` file itself, which
 * `generate` writes and `check` compares by content. `docs/known-gaps.md` records that scope.
 *
 * | gate | on these four circuits |
 * | --- | --- |
 * | 1 up to date | registered; it is the one that refuses, and it refuses for a reason that is NOT a defect - see below |
 * | 3 netlist equals IR | registered, and reports `not run: generation was refused` after gate 1 refuses |
 * | 6 pin identity | the same |
 * | 7 checklist traceability | **NOT REGISTERED**: `DesignSpec.checklist` is null for every one of these designs and `runGates` registers gate 7 only when it is not. The gate PORTS WHOLE (`lib/schgen/gates/traceability.ts`) and its twenty ported tests pass over fixtures - but nothing in this repository has a `SCHEMATIC-CHECKLIST.md`, so **gate 7 is unexercised against a real circuit** and this census says so rather than letting its absence read as a pass. `docs/known-gaps.md` records it. |
 * | 8 OSCAR equivalence | **NOT REGISTERED**: `DesignSpec.oscar` is null for every one of these designs. Gate 8 is **not deferred** (spec revision 4; **G104**) and Task 18 wired its M1 half - `oscarGate` in `tools/schgen/verify.ts` builds a `ReferenceGraph` per declared reference and compares the generated schematic against it under a committed permitted-delta declaration. **No design here declares `oscar`, so the comparison is exercised only by `tests/schgen/gates/reference-graph.kicad.test.ts`, and never against a generated drawing** - `docs/known-gaps.md` **G238** measures why (gate 1 refused both references; since Task 20 it refuses `pt2399-core`, and `transistor-preamp` refuses later at field placement - **G245**) and **G240** records the gap. `tests/schgen/verify.test.ts` drives the refusals a declaring design gets. |
 *
 * **WHY GATE 1 REFUSES, AND WHY THAT IS THE CORRECT RESULT RATHER THAN A DEFECT.**
 * `docs/known-gaps.md` **G151** measured it: `circuitSpecFrom`'s output does not pass
 * `validateCircuit`, because passing would need an invented net rename and an invented no-connect
 * reason - and *"no backend invents an input"*. `generate` calls `validateCircuit` and throws, so
 * gate 1 carries those refusals and every later gate cascades to `NOT_RUN`. **Nothing here calls
 * `validateCircuit` differently, relaxes a rule, or supplies a value the model does not hold**,
 * which G151's criterion forbids: the refusals ARE the measurement. A circuit that stops refusing
 * is a circuit whose authoring declaration grew the missing things honestly.
 *
 * **THE THIRD THING IS NO LONGER ON THAT LIST, AND TASK 20 TOOK IT OFF FOR A STATED REASON.** This
 * header used to name *"invented BOM fields"* as the third refusal class, and it was the largest:
 * 96 of `pt2399-core`'s 115 gate-1 problems and 100 of `transistor-preamp`'s 101. The owner ruled
 * that the BOM requirement is a property of the CONSUMER of an artifact rather than of the circuit
 * (*"a fully specified BOM isn't needed for schematics, stripboard layout, and, in many cases, tht
 * pcbs"*), so `validateCircuit` no longer runs `bomFields` and `validateSourcing` does.
 * `lib/schgen/ir/validate.ts`'s header carries his words; **G245** carries the decision and this
 * census's before-and-after rows.
 *
 * **AND ONE ROW OF THIS CENSUS NO LONGER MEASURES ITS CIRCUIT. DO NOT READ IT AS ONE** - ruling
 * **R68**, parked. `transistor-preamp`'s gate-1 row reports
 * `other: <tmpdir>/refs.lock.json not found` - **the HARNESS's refusal, not the circuit's**:
 * `runGates` forces `initLock: false`, so the generation only reads and the reference lock this
 * circuit now gets far enough to need is never created. **A reader comparing this census across
 * Task 20 sees that refusal move from 101 to 1 rather than disappear, and the obvious reading of a
 * surviving refusal is that the change did not work.** It did: `transistor-preamp` has **0**
 * `validateCircuit` problems, which `tests/schgen/authoring-complete.test.ts` pins and which the
 * probe in **G245** drives. That line also carries an absolute temp path, so it is the one line of
 * this output that differs on every run. **G245**'s criterion (c) is what would settle it, with no
 * mechanism prescribed.
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
  { gate: GATES.checklist, absentWhen: "the design's `checklist` is null, so there is no checklist to trace to (gate 7 PORTS WHOLE and has never seen a real circuit: docs/known-gaps.md G171)" },
  // **THE PRINTED ROW SAYS WHAT THE FILE HEADER SAYS - item E of Task 18's review.** "the
  // design's `oscar` is null" is true and is not the whole of it: a reader of the OUTPUT learned
  // only that this design declares no reference, and had to open this file to learn that NO design
  // here does and that the comparison has therefore never run against a generated drawing. The
  // reviewer is explicit that "DID NOT RUN" cannot be read as a pass, so this is legibility rather
  // than a defect - and legibility is the whole reason this census is a tool and not a paragraph.
  {
    gate: GATES.oscar,
    absentWhen:
      "the design's `oscar` is null, so there is no reference board to compare against - and NO " +
      "design in this repository declares one, so gate 8's M1 comparison is exercised only by " +
      "tests/schgen/gates/reference-graph.kicad.test.ts and has NEVER run against a generated " +
      "schematic (docs/known-gaps.md G238 and G245 measure why: generate refuses pt2399-core at " +
      "gate 1 on 18 problems, and refuses transistor-preamp LATER, at the field-placement check " +
      "inside block tp-leg-emitter-bypass; G240 records the gap with its price)",
  },
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
 * `RULE_CLASSES` and `BOM_CLASS` pin, with its matchers transcribed rather than re-invented** -
 * that test asserts which of them refuse a DRAWING and which refuse SOURCING, and each has its own
 * register entry (`netNames` **G150**, `pinsDeclared` **G151**, `singlePinNets` **G159**,
 * `bomFields` **G149**). Writing a second, differently-worded set here would make a FIFTH class
 * look like a classification bug instead of a finding. Anything unmatched is printed in full under
 * `other: <problem>`, so a new refusal shows up rather than disappearing into a total.
 *
 * **THE `bomFields` LABEL IS KEPT AND NO GATE CAN PRODUCE IT ANY MORE** (Task 20). `validateCircuit`
 * stopped running the rule, so gate 1 cannot carry a BOM refusal and no other gate ever did. It
 * stays because this list is read as the inventory of refusal classes a reader may meet: an empty
 * `bomFields` row is the visible form of the owner's ruling, and a BOM problem arriving here from
 * somewhere new is better labelled than binned under `other`. **It is a LABEL and not a check** -
 * the thing with teeth is the unmatched arm, which prints an unknown problem in full, and
 * `tests/schgen/authoring-complete.test.ts` is where a BOM refusal reaching the drawing path fails.
 *
 * **THE `netNames` LABEL IS KEPT ON THE SAME GROUND AND FOR A STRONGER REASON** (Task 3 of the
 * net-names-and-floating-pins plan). The rule is not merely out of the drawing path - it is
 * **deleted**, on the owner's decision that *"i absolutely do not care about the letter case of net
 * names. That's a silly quibble."* So nothing can produce this row again. It stays for the same
 * reason the `bomFields` row does: a reader uses this list as the inventory of refusal classes,
 * and an **empty** `netNames` row is the visible form of that decision, where a missing row would
 * leave 20 labelled Pultec nets and 17 of `pt2399-core`'s having stopped being refused with
 * nothing here saying so. `docs/known-gaps.md` **G150**.
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

/**
 * **EVERY `ran` ROW NAMES THE DERIVATION THAT GATE RAN AGAINST, on its own line beneath the
 * row.** Spec §2.1's criterion is that *"a gate that reports a pass names the manifest it passed
 * against"*, and `GateResult.manifest` met it in the data structure and in no artifact a person
 * reads: this renderer printed the gate, the problem count, the classified labels and optionally
 * each problem, and DROPPED the field. `CLAUDE.md`: look at the output, not only the tests.
 *
 * It is a line rather than a column because the citation names two files and carries a hash, so a
 * column would wrap or be truncated - and a truncated citation is two gates that ran against
 * different derivations looking identical, which is the state §2.1 exists to make visible.
 *
 * **THE `DID NOT RUN` ROWS CARRY NO DERIVATION, and that is not an omission.** A gate `runGates`
 * never registered produced no `GateResult`, so there is no manifest it ran against; what those
 * rows owe a reader is the reason they are absent, which they already give.
 */
export function renderGateCensus(census: readonly CircuitGates[], everyProblem: boolean): string {
  const lines: string[] = []
  for (const c of census) {
    lines.push(`${c.name} (${c.entry})`)
    for (const r of c.results) {
      lines.push(`  ran         ${r.gate.padEnd(28)} ${r.problems.length} problem(s)`)
      lines.push(`              derivation  ${r.manifest}`)
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
