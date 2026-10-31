/**
 * **WHAT KiCad ACCEPTS IN A GLOBAL LABEL'S NAME, AND WHETHER THIS REPOSITORY EVER DRAWS A
 * SYNTHETIC NET NAME ON A SHEET.**
 *
 *   bun run tools/schgen/label-syntax/probe.ts > tools/schgen/label-syntax/probe-run.log
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-23-net-names-and-floating-pins.md`.
 * **It changes no production code, nothing in `lib/` reads it, and no gate calls it.** The
 * committed `probe-run.log` beside this file is one run of it, produced by the command above.
 * `./fixtures.ts` holds what is measured and the sheet it goes on; this file holds the `kicad-cli`
 * drives, the census and all the reporting.
 *
 * **WHY IT EXISTS, AND IT IS THE ORDER THAT MATTERS.** `lib/schgen/ir/validate.ts`'s `netNames`
 * rule refuses two different things with one message. `hi_boost_out` fails on **letter case
 * alone**, which the owner has ruled is not a constraint (`docs/known-gaps.md` **G150**, verbatim:
 * *"i absolutely do not care about the letter case of net names. That's a silly quibble."*).
 * `Net-(C10-Pad1)` fails on case **and on parentheses and hyphens**. Deleting the rule admits the
 * second kind into the emitter, and until this probe ran **nobody had checked whether KiCad accepts
 * those characters in a global label at all** - G150's own relax mechanism flagged exactly that.
 *
 * **IT MEASURES THROUGH PDF AND THE NETLIST, NEVER THROUGH SVG**: `docs/known-gaps.md` **G265**
 * clause 1 records that `sch export svg` at 10.0.5 does not draw a global label's outline at all,
 * under-reporting the label by the whole 3333.75 um, so any measurement of a label through SVG is
 * wrong and this probe takes none.
 *
 * **IT HAS BOTH CONTROLS, WHICH IT DID NOT UNTIL ROUND 2.** `SIGNAL` is the positive control and
 * proves the probe can report a pass. `./fixtures.ts`'s `CONTROLS` are the negative ones and prove
 * it can report a FAILURE - loudly for a raw newline, and **silently for a carriage return and a
 * NUL, which KiCad accepts at exit 0 and hands back under a different name.** Round 1 of this task
 * asserted that a failing arm would halt the run, declined to commit one on that basis, and **was
 * wrong**: the netlist-export arm returns a full failure row and the run reaches its summary. The
 * review's instruction is the general rule and is recorded here because the error was mine: **a
 * measurement with a positive control and no negative control is an incomplete instrument, not a
 * design choice**, and a stated reason for leaving one out is itself a thing to drive.
 *
 * **THE SHEETS ARE BUILT AND COMMITTED, so the run re-drives from a clean checkout.** It needs
 * `kicad-cli`, which `make check` already requires on every run, and nothing else: no download, no
 * font blob, no Python. UUIDs are derived rather than generated, so the probe always writes the
 * same bytes and the sheets compare by content rather than by timestamp.
 *
 * **IT ASKS A SECOND QUESTION THAT CAN CLOSE THE FIRST ONE WITHOUT KiCad'S HELP.** A punctuated
 * net name only matters if it is ever DRAWN. Labels are emitted per **boundary anchor**, not per
 * net: `lib/schgen/render/cross-sheet.ts` records that `anchorsToSymbols` emits exactly a power
 * symbol or a global label for a block's boundary anchors, `lib/schgen/render/sheets.ts:77` is the
 * only caller that reaches a sheet drawing, and `lib/schgen/render/emit.ts:171` is **the only
 * `globalLabel` call site under `lib/`, and the only one anywhere that takes its nets from a
 * board's `SheetDrawing.labels`**. The anchor's net is therefore always in the block's `rails` or
 * its `external` - `labelRefsOf` throws for anything else - so counting `external` over every
 * declared block is the complete census and not a sample of one.
 *
 * **THAT NARROWING IS A ROUND-1 CORRECTION OF "the only call site in the repository", WHICH IS
 * FALSE.** `grep` finds **three**: this one, `tools/schgen/text-metrics/svg-probe.ts:123` and
 * `tests/schgen/render/emit-refusals.test.ts:91`. Neither of the other two can carry a board's net
 * - each passes a literal of its own (`row.net` from that probe's corpus, and `"SIG"`) and neither
 * consumes a `SheetDrawing` - so the census is unaffected and only the claim moved. **It is
 * corrected because it is the first link of the argument**: a later agent who greps, finds three
 * and takes the old sentence at its word would discard a correct zero.
 *
 * **IT DESIGNS NOTHING AND DECIDES NOTHING.** Whether the `netNames` rule comes out, and what
 * replaces the format half of `lib/schgen/gates/pin-table.ts`'s guard, are Task 3's and are
 * decided by the spec and the owner. This file reports.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { moduleRepoRoot } from "../../perfboard/repo-root.ts"
import { importNetlist, KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { quoteString } from "../../../lib/kicad/sexpr.ts"
import { exportPdf, kicadVersion, runKicadCli } from "../kicad-run.ts"
import { pdfPaths, type PdfPath } from "../text-metrics/pdf-probe.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { caseResolver } from "../authoring-census.ts"
import { ALL_DECLARED_CASES } from "../board-declarations.ts"
import { boardRefs, declarationFor } from "../board-sheets.ts"
import { ARM_ANCHOR, CANDIDATES, CONTROLS, PAPER_HEIGHT_MM, RETURN_ANCHOR, render, type Arm } from "./fixtures.ts"

const log = (s: string): void => {
  console.log(s)
}

function head(title: string): void {
  log("")
  log(`== ${title}`)
}

const sha256 = (text: string): string => crypto.createHash("sha256").update(text).digest("hex")
const hex = (text: string): string => Buffer.from(text, "utf8").toString("hex")

/** The net names matching this are KiCad exporter artifacts rather than authored names. */
const SYNTHETIC = /^(Net|unconnected)-/

/**
 * **THE CASING RULE AS IT STOOD WHEN THIS PROBE RAN, held here rather than imported.**
 *
 * This was `lib/schgen/ir/types.ts`'s `NET_NAME` - `/^[A-Z0-9][A-Z0-9_]*$/` - and the adjunct
 * census below sizes what it cost on names that really are drawn. **Task 3 of the
 * net-names-and-floating-pins plan redefined `NET_NAME`** (non-empty, no control character) on the
 * owner's decision that the case demand is *"a silly quibble"*, so importing it would silently
 * change what this probe measures and make `probe-run.log`'s committed figure of **20** report as
 * 0 on the next run - a measurement irreproducible from its own tool, which is the shape
 * `CLAUDE.md` names when it says a derived artifact is compared by content and never by a
 * timestamp. Copied here so the run that produced that log can be re-driven.
 *
 * It is a FROZEN TRANSCRIPTION of a rule that no longer exists, not a rule this repository
 * enforces. Nothing but the adjunct below may read it.
 */
const CASING_RULE_BEFORE_TASK_3 = /^[A-Z0-9][A-Z0-9_]*$/

/** The `(name <atom>)` atoms of the exported netlist's `(nets ...)` section, as RAW bytes. */
function rawNetNameAtoms(netlist: string): readonly string[] {
  const at = netlist.indexOf("(nets")
  if (at < 0) throw new Error("the exported netlist has no (nets ...) section; this probe cannot read it")
  return [...netlist.slice(at).matchAll(/\(name\s+("(?:[^"\\]|\\.)*")\)/g)].map((m) => m[1] ?? "")
}

/**
 * The one closed seven-point outline whose box holds `at` - a global label's body. It refuses on
 * none and on more than one rather than taking the first: a measurement of the wrong label reads
 * exactly like a measurement of the right one. It is not `text-metrics/pdf-probe.ts`'s
 * `labelOutlineNear`, which needs every point within one radius of the anchor - a 27-character
 * name's outline is wider than the two labels here are apart.
 */
function outlineHolding(paths: readonly PdfPath[], at: { readonly x: number; readonly y: number }): PdfPath {
  const tol = 500
  const x = at.x * 1000
  const y = at.y * 1000
  const hits = paths.filter((p) => {
    if (p.points.length !== 7) return false
    const xs = p.points.map((q) => q.x)
    const ys = p.points.map((q) => q.y)
    return Math.min(...xs) - tol <= x && x <= Math.max(...xs) + tol && Math.min(...ys) - tol <= y && y <= Math.max(...ys) + tol
  })
  if (hits.length !== 1) {
    throw new Error(`expected exactly one seven-point label outline whose box holds (${at.x}, ${at.y}) mm within ${tol} um; found ${hits.length}`)
  }
  return hits[0] as PdfPath
}

const extentOf = (p: PdfPath): { readonly along: number; readonly across: number } => {
  const xs = p.points.map((q) => q.x)
  const ys = p.points.map((q) => q.y)
  return { along: Math.max(...xs) - Math.min(...xs), across: Math.max(...ys) - Math.min(...ys) }
}

interface Verdict {
  readonly slug: string
  readonly escaped: boolean
  readonly parsed: boolean
  readonly roundTripped: boolean
  /**
   * **FALSE WHEN NO PDF FILE APPEARED - WHICH INCLUDES `exportPdf` THROWING, as it does for a sheet
   * KiCad will not load. IT DOES NOT COVER A MANGLED LABEL**: an export that succeeded but put no
   * outline at the anchor, or two, makes `outlineHolding` THROW and the run ends - deliberately
   * loud, rather than a column a reader could take for a clean result. What separates a drawn name
   * from a TRUNCATED one is `along`, through the growth test in the candidate summary.
   */
  readonly rendered: boolean
  readonly along: number
}

/**
 * Drive one arm: write nothing, export a netlist and a PDF, and report four things with the exit
 * status. **A failing arm produces a ROW, never a halt** - which is what makes the negative
 * controls possible, and which round 1 got wrong by assertion rather than by driving.
 */
function measureArm(a: Arm, sheetFile: string, tmp: string, repoRoot: string): Verdict {
  const quoted = quoteString(a.net)
  const escaped = quoted !== `"${a.net}"`
  log(`${a.slug}  net ${JSON.stringify(a.net)}`)
  log(`    writer bytes for the name: ${JSON.stringify(quoted)}`)
  log(`    writer bytes as hex      : ${hex(quoted)}`)
  log(`    quoteString escaped anything: ${escaped ? "YES - the name is not verbatim between quotes" : "NO - the name is between quotes verbatim"}`)

  const netOut = path.join(tmp, `${a.slug}.net`)
  const r = runKicadCli(["sch", "export", "netlist", "--format", "kicadsexpr", "-o", netOut, sheetFile])
  log(`    kicad-cli sch export netlist: exit ${r.status}`)
  let parsed = r.status === 0
  let roundTripped = false
  if (!parsed) {
    const why = r.stderr.trim().split("\n").filter((l) => !/^Fontconfig /.test(l)).join(" | ")
    log(`    PARSED: NO. stderr: ${why === "" ? "(nothing but benign lines)" : why}`)
  } else {
    const netlist = fs.readFileSync(netOut, "utf8")
    const raw = rawNetNameAtoms(netlist)
    log(`    kicad wrote these net-name atoms, raw: ${raw.map((x) => JSON.stringify(x)).join(" ")}`)
    const rawHit = raw.includes(quoted)
    const parsedNames = Object.keys(importNetlist(netlist).nets)
    log(`    importNetlist read these net names: ${parsedNames.map((n) => JSON.stringify(n)).join(" ")}`)
    // **WHAT THIS ESTABLISHES, AND NOT MORE.** Both routes compare against the ARM'S OWN CONSTANT
    // rather than against each other, so neither can agree with itself: `rawHit` is KiCad's atom
    // bytes against the writer's, `byteHit` is `importNetlist`'s decoded name against `a.net`. The
    // `Buffer.equals` is a UTF-8 octet comparison and for an ASCII name it is **no stronger than
    // `===`**; it is written this way so a non-ASCII or differently-normalised arm would still be
    // compared as octets. It establishes nothing about normalisation that `===` would miss.
    const byteHit = parsedNames.some((n) => Buffer.from(n, "utf8").equals(Buffer.from(a.net, "utf8")))
    log(`    raw atom identical to the writer's bytes: ${rawHit ? "YES" : "NO"}; parsed name identical to the arm's constant, octet for octet: ${byteHit ? "YES" : "NO"}`)
    if (!rawHit || !byteHit) log(`    THE NAME DID NOT SURVIVE. KiCad's atoms as hex: ${raw.map((x) => hex(x)).join(" ")}`)
    roundTripped = rawHit && byteHit
  }

  // The PDF is attempted even for an arm whose netlist export failed, so the log records BOTH
  // exits rather than leaving a reader to infer the second from the first.
  const pdf = path.join(tmp, `${a.slug}.pdf`)
  let produced = false
  try {
    exportPdf(sheetFile, pdf)
    produced = fs.existsSync(pdf)
    log(`    kicad-cli sch export pdf: ${produced ? `produced ${fs.statSync(pdf).size} bytes` : "produced NOTHING"}`)
  } catch (e) {
    // **THE REPO ROOT IS STRIPPED SO THE COMMITTED LOG IS PATH-INDEPENDENT.** `exportPdf`'s refusal
    // names the sheet by absolute path, and a committed log carrying one checkout's path cannot be
    // compared against another's - which is the whole re-drivability property this probe claims.
    const why = (e as Error).message
      .split("\n")
      .filter((l) => !/^Fontconfig /.test(l) && l.trim() !== "")
      .join(" | ")
      .split(`${repoRoot}/`)
      .join("<repo>/")
    log(`    kicad-cli sch export pdf REFUSED: ${why}`)
  }
  if (!produced) return { slug: a.slug, escaped, parsed, roundTripped, rendered: false, along: 0 }

  const paths = pdfPaths(pdf, PAPER_HEIGHT_MM)
  const outline = outlineHolding(paths, ARM_ANCHOR)
  const control = outlineHolding(paths, RETURN_ANCHOR)
  const e = extentOf(outline)
  const ce = extentOf(control)
  log(`    PDF stroked paths: ${paths.length}; seven-point outlines: ${paths.filter((p) => p.points.length === 7).length}`)
  log(`    arm label outline: ${e.along.toFixed(1)} um along x by ${e.across.toFixed(1)} um across`)
  log(`    the RETURN control outline on the same page: ${ce.along.toFixed(1)} um along x by ${ce.across.toFixed(1)} um across`)
  log(`    um of outline per character of the name (${a.net.length} characters): ${(e.along / a.net.length).toFixed(1)}`)
  return { slug: a.slug, escaped, parsed, roundTripped, rendered: true, along: e.along }
}

/** Write every arm's sheet, reporting content-comparison rather than timestamps. */
function writeSheets(dir: string, arms: readonly Arm[]): Map<string, string> {
  const files = new Map<string, string>()
  for (const a of arms) {
    const text = render(a)
    const file = path.join(dir, `${a.slug}.kicad_sch`)
    const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
    fs.writeFileSync(file, text)
    files.set(a.slug, file)
    const state = before === text ? "unchanged on disk" : before === "" ? "WRITTEN (was absent)" : "REWRITTEN (content moved)"
    log(`${a.slug}: ${text.split("\n").length} lines, SHA-256 ${sha256(text)}, ${state}`)
    log(`    net: ${JSON.stringify(a.net)} (${a.net.length} characters), hex ${hex(a.net)}`)
    log(`    ${a.why}`)
  }
  return files
}

function driveArms(arms: readonly Arm[], files: Map<string, string>, tmp: string, repoRoot: string): Verdict[] {
  const out: Verdict[] = []
  for (const a of arms) {
    const file = files.get(a.slug)
    if (file === undefined) throw new Error(`arm ${a.slug} was not written`)
    out.push(measureArm(a, file, tmp, repoRoot))
  }
  return out
}

function verdictLine(a: Arm, v: Verdict, against: string): string {
  return (
    `${a.slug.padEnd(24)} escaped ${v.escaped ? "YES" : "NO "}  parsed ${v.parsed ? "YES" : "NO "}  ` +
    `round-trip ${v.roundTripped ? "YES" : "NO "}  PDF outline ${v.rendered ? "YES" : "NO "}  ` +
    `outline ${v.along.toFixed(1)} um  - ${against}`
  )
}

function main(): void {
  const repoRoot = moduleRepoRoot()

  head("WHAT THIS LABEL-SYNTAX RUN MEASURED")
  const sha = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  const dirty = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  log(`label-syntax repository commit: ${sha}${dirty === "" ? " (clean tree)" : ` (DIRTY TREE, ${dirty.split("\n").length} path(s))`}`)
  // **IT REFUSES RATHER THAN SKIPS.** `KICAD_CLI` is computed at import time and never checked
  // there, by design, so an absent binary reaches this line as a path that does not exist. A
  // skipped measurement that looks like a passing one is the failure mode this repository's whole
  // workflow exists to prevent.
  if (!fs.existsSync(KICAD_CLI)) {
    throw new Error(
      `kicad-cli is not at ${KICAD_CLI}, so nothing below could be measured. lib/kicad/install.ts holds the ` +
        "per-platform candidate list and an explicitly set KICAD_CLI always wins. This probe refuses rather " +
        "than reporting an empty run: a skipped measurement must never look like a passing one.",
    )
  }
  log(`kicad-cli resolved to ${KICAD_CLI}, version ${kicadVersion()}`)
  log("every label measurement below is taken from the PDF export and the netlist export, NEVER from SVG: docs/known-gaps.md G265 clause 1")

  head("PREDICTIONS FOR LABEL SYNTAX, PRINTED BEFORE ANY kicad-cli CALL")
  log("PROVENANCE, because the ordering is only worth something if these were not back-filled (docs/known-gaps.md G271):")
  log("  the four CANDIDATE predictions are the task brief's own and the boundary-census prediction is the SPEC's, from part 1's third correction; both predate this file.")
  log("  a prototype of the netlist and census paths was run while writing this probe, to establish that its mechanisms work. NO PREDICTION WAS REVISED AFTER IT.")
  log("  the six CONTROL expectations are NOT predictions and are not presented as any: each was established by a scratch drive while writing round 2 and is PINNED, so this run CHECKS it.")
  log("  one prediction is refuted below and is left standing as it was written.")
  for (const c of CANDIDATES) log(`PREDICTION ${c.net}: ${c.expect}`)
  for (const c of CONTROLS) log(`EXPECTATION ${c.slug} ${JSON.stringify(c.net)}: ${c.expect}`)
  log(
    "PREDICTION boundary census: NON-ZERO. The spec says of pt2399-core that \"the synthetic name becomes a label " +
      "*only because of the fake port*, since ports are boundary nets\", so at least `unconnected-(U1-CLK_O-Pad5)` " +
      "is expected to reach a label. REFUTED BY: a census of zero, which would mean a declared port does not make a " +
      "net a label and the punctuation question is closed by the architecture rather than by kicad-cli.",
  )
  log("PREDICTION positive control: SIGNAL parses, round-trips and renders. REFUTED BY: any failure, which would make every candidate row about this probe's sheet rather than about a net name.")
  log("PREDICTION negative controls: at least one arm reports parsed NO, and at least one reports parsed YES with round-trip NO. REFUTED BY: every arm passing, which would mean this probe has never been shown able to report a failure at all.")

  head("LABEL SYNTAX SHEETS: ONE PER ARM, THE NAME ATOM WRITTEN BY THE PRODUCTION STRING WRITER")
  const sheetDir = path.join(repoRoot, "tools/schgen/label-syntax/sheets")
  fs.mkdirSync(sheetDir, { recursive: true })
  const files = writeSheets(sheetDir, [...CANDIDATES, ...CONTROLS])

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "label-syntax-"))
  let candidates: Verdict[] = []
  let controls: Verdict[] = []
  try {
    head("LABEL SYNTAX: WHAT kicad-cli DID WITH EACH CANDIDATE")
    candidates = driveArms(CANDIDATES, files, tmp, repoRoot)
    head("LABEL SYNTAX: WHAT kicad-cli DID WITH EACH CONTROL ARM")
    controls = driveArms(CONTROLS, files, tmp, repoRoot)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  head("LABEL SYNTAX CANDIDATE VERDICTS: THE FOUR ANSWERS PER CANDIDATE, AGAINST THE PREDICTION")
  for (const c of CANDIDATES) {
    const v = candidates.find((x) => x.slug === c.slug)
    if (v === undefined) throw new Error(`candidate ${c.slug} produced no verdict`)
    const all = v.parsed && v.roundTripped && v.rendered
    const against = c.expect.startsWith("UNKNOWN") ? "NO PREDICTION TO COMPARE - this row IS the measurement" : all ? "AS PREDICTED" : "NOT AS PREDICTED"
    log(verdictLine(c, v, against))
  }
  const positive = candidates.find((v) => v.slug === "control-upper-snake")
  if (positive === undefined) throw new Error("the positive control produced no verdict")
  log(
    positive.parsed && positive.roundTripped && positive.rendered
      ? "POSITIVE CONTROL PASSED: the UPPER_SNAKE name parses, round-trips and draws an outline, so a failure on another candidate row would be about that row's name."
      : "POSITIVE CONTROL FAILED: the UPPER_SNAKE name did not pass, so every candidate row is about this probe's sheet rather than about a net name, and nothing here is a fact about KiCad.",
  )
  const alongs = CANDIDATES.map((c) => ({ chars: c.net.length, along: candidates.find((x) => x.slug === c.slug)?.along ?? 0 })).sort((a, b) => a.chars - b.chars)
  log(`outline extent against character count, shortest name first: ${alongs.map((a) => `${a.chars}ch=${a.along.toFixed(0)}um`).join(" ")}`)
  log(
    alongs.every((a, i) => i === 0 || a.along > (alongs[i - 1]?.along ?? 0))
      ? "THE OUTLINE GROWS STRICTLY WITH THE NAME, so the whole string is being drawn rather than a truncation of it. This is the evidence that \"renders\" means the name and not merely a box: the PDF carries stroked glyph paths and no readable string, so the outline's extent is the only thing that can distinguish a drawn name from a mangled one."
      : "THE OUTLINE DOES NOT GROW STRICTLY WITH THE NAME, so at least one name is not drawn at its full length and \"renders\" cannot be read as \"the whole name is on the sheet\".",
  )

  head("LABEL SYNTAX CONTROL VERDICTS: WHAT EACH PINNED ARM DID, AND WHETHER THE PIN HELD")
  log("an arm here failing is the INTENDED result and is not a regression. The pin is what a regression would move.")
  for (const c of CONTROLS) {
    const v = controls.find((x) => x.slug === c.slug)
    if (v === undefined) throw new Error(`control ${c.slug} produced no verdict`)
    log(verdictLine(c, v, `pinned: ${c.expect}`))
  }
  const loud = controls.filter((v) => !v.parsed)
  const silent = controls.filter((v) => v.parsed && !v.roundTripped)
  const passing = controls.filter((v) => v.parsed && v.roundTripped && v.rendered)
  const escaping = controls.filter((v) => v.escaped)
  log(`control arms: ${controls.length}; refused by kicad-cli (LOUD failure): ${loud.length}; parsed and silently renamed (SILENT failure): ${silent.length}; fully passing: ${passing.length}; exercising the escaping path: ${escaping.length}`)
  log(
    loud.length > 0 && silent.length > 0 && passing.length > 0
      ? "NEGATIVE CONTROL ESTABLISHED: in one committed run this probe reports a PASS, a LOUD FAILURE and a SILENT RENAME, so every column above has been seen to take both values and a passing candidate row is a result rather than a property of the instrument."
      : "NEGATIVE CONTROL NOT ESTABLISHED: this run did not produce a pass, a loud failure and a silent rename together, so at least one column has never been seen to take both values and every candidate verdict above is suspect.",
  )
  log(
    silent.length > 0
      ? `THE SILENT ARMS ARE THE FINDING, NOT THE LOUD ONE: ${silent.map((v) => v.slug).join(" ")} each exported at exit 0 and handed back a DIFFERENT net name than the sheet carried. A validator that only asked whether kicad-cli succeeded would pass them.`
      : "no arm parsed and then came back renamed in this run.",
  )
  const tab = controls.find((v) => v.slug === "ctl-tab")
  log(
    tab !== undefined && tab.parsed && tab.roundTripped
      ? "THE DISCRIMINATOR HELD: a TAB is a control character that KiCad takes verbatim, so the three failures above are NOT explained by \"a control character\" - they are what a newline does to the s-expression's line structure, and what CR and NUL do to KiCad's string reader. str()'s blanket refusal of [\\u0000-\\u001f] is therefore WIDER than KiCad requires, which is the safe direction and is not a recommendation to narrow it."
      : "THE DISCRIMINATOR DID NOT HOLD: the tab arm did not parse and round-trip, so the failures above may be about the control-character class after all and this run cannot separate the two explanations.",
  )

  head("BOUNDARY CENSUS: EVERY DECLARED BLOCK OF EVERY BOARD, AND WHICH NET NAMES REACH A LABEL")
  log("a net reaches a global label exactly when it is in a block's `external` set (blocks.ts subgraphOf): labelled, touched by the block, and not a rail.")
  log("a RAIL reaches a POWER SYMBOL instead, never a label (cross-sheet.ts MECHANISM_OF_CLASS), so rails are counted separately below and are not label names.")
  const boards = boardRefs(repoRoot)
  let syntheticLabels = 0
  let syntheticNetsTotal = 0
  const failing = new Map<string, readonly string[]>()
  for (const board of boards) {
    const decl = declarationFor(board)
    if (decl === null) {
      log(`${board.name.padEnd(28)} NO DECLARATION - nothing in the drawing code has seen it, so it contributes no block here`)
      continue
    }
    const symbols = caseResolver([decl])
    const circuit = buildCircuit(circuitSpecFrom(decl.network, decl.authoring, symbols), { symbols })
    const synthetic = [...circuit.nets.keys()].filter((n) => SYNTHETIC.test(n)).sort()
    syntheticNetsTotal += synthetic.length
    const labelNets = new Set<string>()
    const railNets = new Set<string>()
    for (const block of circuit.blocks.values()) {
      const g = subgraphOf(circuit, block.id, symbols)
      for (const n of g.external) labelNets.add(n)
      for (const n of g.rails) railNets.add(n)
    }
    const syntheticLabelled = [...labelNets].filter((n) => SYNTHETIC.test(n)).sort()
    syntheticLabels += syntheticLabelled.length
    failing.set(board.name, [...labelNets].filter((n) => !CASING_RULE_BEFORE_TASK_3.test(n)).sort())
    log(
      `${board.name.padEnd(28)} declared by ${decl.entry.padEnd(28)} ${String(circuit.blocks.size).padStart(2)} block(s), ` +
        `${String(circuit.nets.size).padStart(2)} net(s), ${String(synthetic.length).padStart(2)} synthetic net name(s), ` +
        `${String(labelNets.size).padStart(2)} net(s) reaching a label, ${String(railNets.size).padStart(2)} rail(s) reaching a power symbol, ` +
        `SYNTHETIC NAMES REACHING A LABEL: ${syntheticLabelled.length}${syntheticLabelled.length === 0 ? "" : ` (${syntheticLabelled.join(" ")})`}`,
    )
    log(`    reaches a label: ${[...labelNets].sort().map((n) => JSON.stringify(n)).join(" ") || "(none)"}`)
    if (synthetic.length > 0) log(`    its synthetic net names, none of which need be labelled: ${synthetic.join(" ")}`)
  }
  log(`BOUNDARY CENSUS: over ${boards.length} boards, ${syntheticNetsTotal} synthetic net name(s) exist in the models and ${syntheticLabels} of them reach a global label.`)
  log(
    syntheticLabels === 0
      ? "THE BOUNDARY-CENSUS PREDICTION PUBLISHED ABOVE IS REFUTED: it predicted non-zero, on the spec's own mechanism that a declared port makes a net a boundary net. It does not. `buildCircuit` leaves `Circuit.offSheet` empty unconditionally (lib/schgen/ir/build.ts:152, and the field's own comment in lib/schgen/ir/types.ts says only a sheet subset ever has any), so `labelledNets` labels a net only when it is a rail, touches more than one block, or touches a `bus` block. `pt2399-core` is ONE block, so none of its 16 synthetic names is labelled, with or without the fake `clk_o_unused` port."
      : "THE BOUNDARY-CENSUS PREDICTION PUBLISHED ABOVE IS CONFIRMED: at least one synthetic name reaches a label.",
  )
  log(
    syntheticLabels === 0
      ? "THE CENSUS IS ZERO, AND WHAT ZERO MEANS: no board in this repository would draw a punctuated net name on a sheet today, " +
          "so whether KiCad accepts one is NOT a blocker for removing the casing rule - the architecture closes the question and the " +
          "kicad-cli rows above are a standing answer rather than a precondition. It is NOT a reason to relax a gate: the name still " +
          "exists in the model, reaches the netlist comparison, and would reach a label the moment a block boundary fell between two " +
          "pins of one of these nets - which is a layout decision nobody has made yet, not an invariant."
      : `THE CENSUS IS ${syntheticLabels}, so punctuated names DO reach a sheet and the kicad-cli rows above are a precondition rather than a standing answer.`,
  )

  head("BOUNDARY CENSUS ADJUNCT: THE LABELLED NETS THE PRE-TASK-3 CASING RULE REFUSED, PER BOARD")
  log("this is the other half of the same question and it is NOT the task's own: it sizes what the casing rule costs on names that really are drawn.")
  log("the rule is /^[A-Z0-9][A-Z0-9_]*$/, frozen in this file: Task 3 deleted it from lib/schgen/ir/validate.ts and redefined NET_NAME, so these figures are re-derivable and are no longer a statement about NET_NAME.")
  let failingTotal = 0
  for (const [board, bad] of failing) {
    failingTotal += bad.length
    log(`${board.padEnd(28)} ${String(bad.length).padStart(2)} labelled net(s) fail the casing rule: ${bad.map((n) => JSON.stringify(n)).join(" ") || "(none)"}`)
  }
  log(`labelled nets failing the pre-Task-3 casing rule, over every board with a declaration: ${failingTotal}`)

  head("LABEL SYNTAX SUMMARY")
  log(`candidates driven: ${candidates.length}; parsed: ${candidates.filter((v) => v.parsed).length}; round-tripped: ${candidates.filter((v) => v.roundTripped).length}; drew an outline: ${candidates.filter((v) => v.rendered).length}`)
  log(`control arms driven: ${controls.length}; loud failures: ${loud.length}; silent renames: ${silent.length}; passing: ${passing.length}`)
  log(`synthetic net names reaching a global label, over all ${boards.length} boards: ${syntheticLabels}`)
  log(`labelled nets refused by the pre-Task-3 casing rule, over all ${boards.length} boards: ${failingTotal}`)
  log(`declared cases the census could have ranged over: ${ALL_DECLARED_CASES.length}; boards it did range over: ${boards.length}`)
}

main()
