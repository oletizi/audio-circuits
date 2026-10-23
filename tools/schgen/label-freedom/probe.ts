/**
 * **WHAT A GLOBAL LABEL'S DRAWING COORDINATES ARE FREE TO BE, DRIVEN AGAINST KiCad AND AGAINST
 * THIS GENERATOR'S OWN GRADER.**
 *
 *   bun run tools/schgen/label-freedom/probe.ts
 *
 * Research probe for Task 5 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it, and it changes no production code.** Every figure §5
 * of `docs/schematic/text-handling-research.md` publishes comes from one run of this file, and that
 * run is committed beside it as `probe-run.log`.
 *
 * **THE PREMISE IT EXISTS TO TEST.** `docs/known-gaps.md` **G262** recorded that *"a global label's
 * position is a netlist fact"*, so that only its side was free. A third-party review (2026-10-22)
 * answered that the label's NAME and its electrical CONNECTION are netlist facts while its drawing
 * coordinates are not necessarily fixed by the circuit. STEP 2 drives the four freedoms that
 * follow, against `kicad-cli`, on fixtures this probe writes; STEP 3 measures what those freedoms
 * are worth on the blocks this repository cannot draw.
 *
 * **IT TESTS NET IDENTITY SEPARATELY FROM NET NAMING** (`partition.ts`), because the first version
 * of this task's control conflated them and a control that cannot tell them apart would have passed
 * either way.
 *
 * **IT RE-DRIVES FROM A CLEAN CHECKOUT.** It needs `kicad-cli` - which `make check` already
 * requires on every run - and nothing else: no download, no Python, no font blob. The fixtures are
 * built by `fixtures.ts` and written to `fixtures/` as derived artifacts, compared by content.
 *
 * **IT DESIGNS NOTHING AND RECOMMENDS NOTHING.** Whether a clearance a sweep found is an acceptable
 * drawing is an acceptance criterion for the artifact this generator produces, and `CLAUDE.md`
 * reserves those to the owner.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { moduleRepoRoot } from "../../perfboard/repo-root.ts"
import { kicadVersion } from "../kicad-run.ts"
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { ALL_DECLARED_CASES } from "../board-declarations.ts"
import { boardRefs, declarationFor } from "../board-sheets.ts"
import { laidOutBlocks } from "../text-metrics/step4.ts"
import { ARMS, render } from "./fixtures.ts"
import { connectivityOf, fmtPartition, partitionDelta, samePartition, sameNaming, type Connectivity } from "./partition.ts"
import { anchorCandidates, labelAnchorIndices } from "./freedoms.ts"
import { labelBlocked, regradeControl, reportBlock, summaryLines } from "./step3.ts"

const log = (s: string): void => {
  console.log(s)
}

function head(title: string): void {
  log("")
  log(`== ${title}`)
}

const sha256 = (text: string): string => crypto.createHash("sha256").update(text).digest("hex")

/** The line-level difference between two rendered fixtures, as the count and the lines themselves. */
function diffLines(base: string, arm: string): readonly string[] {
  const a = base.split("\n")
  const b = arm.split("\n")
  const out: string[] = []
  for (const line of a) if (!b.includes(line)) out.push(`- ${line.trim()}`)
  for (const line of b) if (!a.includes(line)) out.push(`+ ${line.trim()}`)
  return out
}

async function main(): Promise<void> {
  const repoRoot = moduleRepoRoot()

  // **THIS LOG'S SECTION NAMES MUST COLLIDE WITH NEITHER §1's NOR §2's.**
  // `tools/schgen/text-metrics/verify-pastes.ts` counts runs by a marker line and anchors each
  // pasted block to a section of ONE log, so a shared header line would make "which section is this
  // block from" ambiguous across two logs - and a block sharing any line with another section's log
  // is the relabel dodge that checker exists to refuse. §2's probe already hit this once.
  head("WHAT THIS LABEL-FREEDOM RUN MEASURED")
  const sha = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  const dirty = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  log(`label-freedom repository commit: ${sha}${dirty === "" ? " (clean tree)" : ` (DIRTY TREE, ${dirty.split("\n").length} path(s))`}`)
  log(`kicad-cli resolved to ${KICAD_CLI}, version ${kicadVersion()}`)

  head("STEP 2 FIXTURES: THE ARMS, THEIR ONE EDIT EACH, AND THEIR PREDICTIONS")
  const fixtureDir = path.join(repoRoot, "tools/schgen/label-freedom/fixtures")
  fs.mkdirSync(fixtureDir, { recursive: true })
  const texts = new Map<string, string>()
  for (const arm of ARMS) {
    const text = render(arm.fixture, arm.items)
    texts.set(arm.name, text)
    const file = path.join(fixtureDir, `${arm.name}.kicad_sch`)
    const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
    fs.writeFileSync(file, text)
    log(`${arm.name}: ${text.split("\n").length} lines, SHA-256 ${sha256(text)}, ${before === text ? "unchanged on disk" : before === "" ? "WRITTEN (was absent)" : "REWRITTEN (content moved)"}`)
  }
  for (const arm of ARMS) {
    if (arm.name === arm.base) continue
    const base = texts.get(arm.base)
    const mine = texts.get(arm.name)
    if (base === undefined || mine === undefined) throw new Error(`arm ${arm.name} names base ${arm.base}, which was not rendered`)
    const d = diffLines(base, mine)
    log(`${arm.name} vs ${arm.base}: ${d.length} differing line(s) - ${arm.freedom}`)
    for (const line of d) log(`    ${line}`)
  }
  for (const arm of ARMS) log(`PREDICTION ${arm.name}: identity ${arm.predictedIdentity}, naming ${arm.predictedNaming}`)

  head("STEP 2 ARMS: IDENTITY AND NAMING, EXPORTED BY kicad-cli, COMPARED SEPARATELY")
  const got = new Map<string, Connectivity>()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "label-freedom-arms-"))
  try {
    for (const arm of ARMS) {
      const text = texts.get(arm.name)
      if (text === undefined) throw new Error(`arm ${arm.name} was not rendered`)
      const file = path.join(tmp, `${arm.name}.kicad_sch`)
      fs.writeFileSync(file, text)
      const c = connectivityOf(file)
      got.set(arm.name, c)
      log(`${arm.name}`)
      log(`    IDENTITY ${fmtPartition(c.partition)}`)
      log(`    NAMING   ${c.naming.join(" ")}`)
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  head("STEP 2 VERDICTS: EACH ARM AGAINST ITS BASE, AND AGAINST ITS OWN PREDICTION")
  let wrong = 0
  for (const arm of ARMS) {
    if (arm.name === arm.base) continue
    const base = got.get(arm.base)
    const mine = got.get(arm.name)
    if (base === undefined || mine === undefined) throw new Error(`arm ${arm.name} or its base was not exported`)
    const identity = samePartition(base, mine) ? "unchanged" : "changed"
    const naming = sameNaming(base, mine) ? "unchanged" : "changed"
    const ok = identity === arm.predictedIdentity && naming === arm.predictedNaming
    if (!ok) wrong += 1
    log(`${arm.name}: identity ${identity} (predicted ${arm.predictedIdentity}), naming ${naming} (predicted ${arm.predictedNaming}) - ${ok ? "AS PREDICTED" : "NOT AS PREDICTED"}`)
    const d = partitionDelta(base, mine)
    if (d.gone.length > 0 || d.arrived.length > 0) {
      log(`    groups GONE from the partition: ${d.gone.join(" ") || "(none)"}`)
      log(`    groups ARRIVED in the partition: ${d.arrived.join(" ") || "(none)"}`)
    }
  }
  log(`arms whose measured result did not match the prediction published above: ${wrong}`)

  head("STEP 2 DISCRIMINATION: THE ONE PROPERTY THAT SEPARATES IDENTITY FROM NAMING")
  const aRename = got.get("a5-rename-wired")
  const aBase = got.get("a0-base")
  const bRename = got.get("b1-rename-bridge")
  const bBase = got.get("b0-base")
  if (aRename === undefined || aBase === undefined || bRename === undefined || bBase === undefined) throw new Error("the two rename arms or their bases are missing")
  const aIdent = samePartition(aBase, aRename)
  const bIdent = samePartition(bBase, bRename)
  log(`a5-rename-wired   : a rename on a WIRE-held net - identity ${aIdent ? "UNCHANGED" : "CHANGED"}, naming ${sameNaming(aBase, aRename) ? "unchanged" : "CHANGED"}`)
  log(`b1-rename-bridge  : a rename on a LABEL-bridged net - identity ${bIdent ? "UNCHANGED" : "CHANGED"}, naming ${sameNaming(bBase, bRename) ? "unchanged" : "CHANGED"}`)
  log(
    aIdent && !bIdent
      ? "DISCRIMINATION ESTABLISHED: the same edit - renaming one global label - leaves the partition alone on one fixture and breaks it on the other, so this probe distinguishes net identity from net naming and the negative control could have answered either way."
      : "DISCRIMINATION NOT ESTABLISHED: the two rename arms did not answer differently, so nothing below separates identity from naming and every Step 2 verdict is suspect.",
  )
  const bridged = bBase.partition.filter((g) => g.includes("R1.1") && g.includes("R2.1"))
  log(`the bridged group in b0-base: ${bridged.length === 1 ? fmtPartition(bridged) : `${bridged.length} groups hold both R1.1 and R2.1, which the fixture intends to be exactly one`}`)
  log(`it is ${partitionDelta(bBase, bRename).gone.some((g) => g.includes("R1.1") && g.includes("R2.1")) ? "GONE" : "STILL PRESENT"} from b1-rename-bridge's partition`)

  head("STEP 3 POPULATION: EVERY DECLARED BLOCK THAT LAYS OUT, AND THE CONTROL ON RE-GRADING IT")
  const { laid, skipped } = await laidOutBlocks(ALL_DECLARED_CASES)
  log(`declared cases offered: ${ALL_DECLARED_CASES.length}; blocks with grid-legal geometry: ${laid.length}; skipped: ${skipped.length}`)
  // **THE PREFIX IS "NOT MEASURED HERE" AND NOT "SKIPPED" DELIBERATELY.** `laidOutBlocks` is Task
  // 1's, so its lines are word-for-word §1's log's `  SKIPPED ...` lines - and a §5 block pasting
  // them would share lines with §1's log, which `verify-pastes.ts` refuses as the relabel dodge.
  // The three logs this document quotes must be line-disjoint; §2's probe hit the same wall once.
  for (const s of skipped) log(`  NOT MEASURED HERE: ${s}`)
  const control = regradeControl(laid)
  log(
    control.length === 0
      ? `CONTROL PASSED: over ${laid.length} laid-out blocks, re-grading the unperturbed layout with checkLayout reproduces the ELK adapter's own verdict exactly - every problem it reports appears in that block's refusal text, and every block the adapter accepted grades clean.`
      : `CONTROL FAILED on ${control.length} block(s), so every sweep below is grading something other than the production refusal:`,
  )
  for (const c of control) log(`  ${c}`)
  const blocked = labelBlocked(laid)
  log(`blocks whose refusal names a global label: ${blocked.length} of ${laid.length}`)
  for (const b of blocked) log(`  BLOCKED ON A LABEL ${b.circuit}/${b.block}`)

  head("STEP 3 BOARDS: THE SAME POPULATION AT BOARD GRANULARITY, WHICH NO DOCUMENT HAD STATED")
  // **THE PLAN AND THE REGISTER SAY "THREE OF ELEVEN BOARDS" AND THAT IS G262's BLOCK COUNT WEARING
  // THE WORD "BOARDS".** A reviewer computed the board figure in fix round 1 and this re-derives it
  // here so it is driven rather than relayed. The mapping is NOT a name match: `boardRefs` reads
  // each board's own `perfboard.json` and `declarationFor` matches on the BUILDER, which is the
  // whole of G247 - `circuits/transistor-preamp/` holds five board builders and one declaration.
  // **A board that is not label-blocked is NOT thereby fine**, so the row says what else stopped it.
  const blockedNames = new Set(blocked.map((b) => `${b.circuit}/${b.block}`))
  const boards = boardRefs(repoRoot)
  let labelBlockedBoards = 0
  for (const board of boards) {
    const decl = declarationFor(board)
    if (decl === null) {
      log(`${board.name.padEnd(28)} NO DECLARATION - nothing in the drawing code has seen it`)
      continue
    }
    const mine = laid.filter((l) => l.circuit === decl.name)
    const hit = mine.filter((l) => blockedNames.has(`${l.circuit}/${l.block}`))
    const earlier = skipped.filter((s) => s.startsWith(`${decl.name}/`))
    if (hit.length > 0) labelBlockedBoards += 1
    log(
      `${board.name.padEnd(28)} declared by ${decl.entry.padEnd(26)} ${String(mine.length).padStart(2)} laid-out block(s); ` +
        `${hit.length > 0 ? `LABEL-BLOCKED via ${hit.map((l) => l.block).join(", ")}` : "no label-blocked block"}` +
        `${earlier.length === 0 ? "" : `; ALSO refused before checkLayout: ${earlier.map((s) => s.split(":")[0] ?? s).join(", ")}`}`,
    )
  }
  log(
    `boards under boards/: ${boards.length}; boards with at least one label-blocked block: ${labelBlockedBoards}; ` +
      `boards with none: ${boards.length - labelBlockedBoards}`,
  )

  head("STEP 3 CANDIDATE SET: HOW MANY PLACES A GLOBAL LABEL COULD GO, OVER EVERY DECLARED BLOCK")
  // **G259's pointer is the question here**: its four-candidate-over-sides mechanism rests on the
  // corrected premise, and *"with the anchor movable the candidate set may be wider than four."*
  // This counts the set, over every label anchor of every block that lays out - not only the
  // blocked ones - so the figure is about the repository and not about its worst cases.
  const sizes: number[] = []
  for (const l of laid) {
    for (const i of labelAnchorIndices(l.g, l.layout)) {
      const a = l.layout.anchors[i]
      if (a === undefined) continue
      const c = anchorCandidates(l.layout, a)
      sizes.push((c.sameSegment.length + c.otherSegments.length) * 4)
    }
  }
  sizes.sort((x, y) => x - y)
  const at = (q: number): number => sizes[Math.min(sizes.length - 1, Math.floor(q * sizes.length))] ?? 0
  log(`label anchors over ${laid.length} laid-out blocks: ${sizes.length}`)
  log(`(anchor points on the label's own net) x (4 sides): min ${sizes[0] ?? 0} p25 ${at(0.25)} median ${at(0.5)} p75 ${at(0.75)} max ${sizes[sizes.length - 1] ?? 0}`)
  log(`anchors whose candidate set is LARGER than the four-sides-at-a-fixed-anchor set: ${sizes.filter((s) => s > 4).length} of ${sizes.length}; equal to it: ${sizes.filter((s) => s === 4).length}; smaller: ${sizes.filter((s) => s < 4).length}`)

  head("STEP 3 FREEDOMS: PER BLOCKED BLOCK, PER LABEL, WHAT EACH FREEDOM BUYS")
  const reports = blocked.map((b) => reportBlock(b, log))

  head("STEP 3 SUMMARY: THE SCOREBOARD, PER FREEDOM, NEVER MERGED")
  for (const line of summaryLines(reports)) log(line)
}

await main()
