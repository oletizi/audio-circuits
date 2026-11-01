/**
 * `make draw`'s render and measurement stage - split out of
 * `tools/cli/draw.ts` in Task 5 fix round 1 (M-1: that file was 557 lines,
 * over this project's 300-500 ceiling). `./draw-draft.ts` decides what to
 * draft and whether it is safe to; this module takes what copperhead wrote
 * and turns it into something a person can look at - re-papered to the sheet
 * size every approved page uses, rendered, measured, and cropped.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { defaultMagick } from "./magick-install.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

// --- re-papering to US Letter ---

/**
 * THREE OUTCOMES, NOT TWO (Task 5 fix round 2). `"fits"` and `"overflow"` are
 * both real measurements of the board; `"unmeasured"` is the check itself
 * not having run - `paper_fit.py` could not read the sheet it was given, for
 * instance a sheet with no body coordinates at all. Collapsing the third
 * into the second (`fits: false` for "overflow" and for "the tool broke"
 * alike) is exactly the shape `CLAUDE.md` names: *"a stale count misleads
 * about progress; a stale cause sends the next agent after a rule that is
 * not there"* - here it would send someone after a layout defect that does
 * not exist. `runDraw` must print `"unmeasured"` as a statement that the
 * check did not run, never as a finding about the board.
 */
export type FitStatus = "fits" | "overflow" | "unmeasured"

/**
 * Read `paper_fit.py`'s verdict out of what it printed - M-3 of the final
 * review, and the same shape fix round 2 was opened to correct, one line
 * over.
 *
 * **IT ASKS FOR BOTH TOKENS, AND "NEITHER" IS `unmeasured`.** The decision
 * used to be `report.includes("fits: yes") ? "fits" : "overflow"`, which is
 * bounded only by `paper_fit.py` continuing to print one of those two
 * strings: ANY other exit-0 output - a reworded final line, a future
 * `fits: unknown`, a flag that suppresses it - became `"overflow"`, which is
 * a FINDING ABOUT A BOARD invented out of a check that did not answer. That
 * is exactly what `FitStatus`'s own three states exist to prevent, so the
 * third state has to be reachable from the parsing as well as from a non-zero
 * exit.
 */
export function fitStatusFromReport(report: string): FitStatus {
  if (report.includes("fits: yes")) return "fits"
  if (report.includes("fits: no")) return "overflow"
  return "unmeasured"
}

export interface RepaperOutcome {
  readonly ok: boolean
  /** Whether the content, once re-papered, still sits inside US Letter's inner frame - or
   * whether that could not be determined at all. See `FitStatus`. */
  readonly fitStatus: FitStatus
  readonly stdout: string
  readonly stderr: string
}

/**
 * Rewrite a freshly-drafted sheet's `(paper "...")` token to `"USLetter"` -
 * every approved Pultec page's paper, and the owner's own reason
 * (`docs/research/2026-10-30-letter-repaper.md`, quoting him): *"I don't have
 * an A3-capable printer... US letter 8.5x11."* copperhead's own draft engine
 * cannot be asked to draft to that size directly - see `./draw-draft.ts`'s
 * `draftWithCopperhead` for the measurement that found this - so this is a
 * post-draft fix-up, not a hint passed in.
 *
 * **THIS IS THE SAME ONE-LINE REWRITE THIS PROJECT ALREADY MEASURED AND
 * USED, NOT A NEW TECHNIQUE.** `letter-repaper.md` §2 confirmed `USLetter` is
 * the literal token KiCad honours (verified by making KiCad write one and
 * render it: 792 x 612 pt = 279.4 x 215.9 mm, against a `"NotAPaperSize"`
 * negative control that `kicad-cli` refuses outright) and §5 confirmed the
 * edit changes nothing else: *"`git diff` of each sheet: 1 insertion, 1
 * deletion - the `(paper ...)` line and nothing else."* Reproduced directly
 * here: rewriting a fresh draft's `(paper "A4")` to `(paper "USLetter")` and
 * re-exporting gives exactly a 792 x 612 pt PDF.
 *
 * **REFUSES RATHER THAN GUESSING WHEN THE TOKEN IS NOT EXACTLY ONE LINE** -
 * `center.py`'s own discipline (*"refuses rather than writing a sheet it
 * cannot prove it translated rigidly"*), applied to a simpler edit: zero
 * matches means copperhead's own `(paper ...)` line shape changed and this
 * rewrite is no longer safe to assume; two or more means the same, in the
 * other direction.
 *
 * **MEASURES WHETHER THE CONTENT STILL FITS AND REPORTS IT - NEVER
 * WITHHOLDS THE PAGE OVER IT.** `pultec-hi-cut`'s own committed page needed
 * exactly this question answered once before (the same run found the
 * REPAIRED hybrid's Hi cut group box overshooting by 4.530 mm and left it on
 * A4 pending the owner's instruction - a real, board-specific finding, not a
 * rule that pages never fit). A RAW, unrepaired draft is a different
 * artifact from that repaired hybrid, so its fit is measured fresh via
 * `draughting/measure/paper_fit.py` rather than assumed either way: measured
 * here, for `pultec-hi-cut`'s own current raw draft, content extent 50.800 ..
 * 246.380 mm sits inside the frame's 267.377 mm east edge with margin to
 * spare. An overflow would be reported as a finding (`fitStatus: "overflow"`),
 * exactly like any other measurement-suite result - EVALUATING-DRAWINGS.md
 * §3 permits withholding only for a connectivity disagreement, and a paper
 * overflow is not one. A THIRD state, `fitStatus: "unmeasured"`, covers the
 * check itself failing to run (Task 5 fix round 2) - see `FitStatus` below;
 * that state is never reported as a finding about the board.
 */
export function repaperToUSLetter(schematicPath: string): RepaperOutcome {
  let text: string
  try {
    text = fs.readFileSync(schematicPath, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ok: false, fitStatus: "unmeasured", stdout: "", stderr: `could not read ${schematicPath}: ${detail}.` }
  }
  const paperLine = /\(paper "[^"]*"\)/g
  const matches = text.match(paperLine)
  if (matches === null || matches.length !== 1) {
    return {
      ok: false,
      fitStatus: "unmeasured",
      stdout: "",
      stderr:
        `${schematicPath}: expected exactly one (paper "...") token to rewrite to USLetter, found ` +
        `${matches === null ? 0 : matches.length}. Refusing rather than guessing which one copperhead meant.`,
    }
  }
  fs.writeFileSync(schematicPath, text.replace(paperLine, '(paper "USLetter")'))

  const fitScript = path.join(moduleRepoRoot(), "draughting", "measure", "paper_fit.py")
  const fit = spawnSync("python3", [fitScript, schematicPath], { encoding: "utf8" })
  const fitReport = `${fit.stdout ?? ""}${fit.stderr ?? ""}`.trim()
  const rewriteNote = `re-papered ${matches[0]} -> (paper "USLetter").`
  if (fit.status !== 0) {
    // The rewrite itself succeeded (the page is still written - `ok: true`); what failed is
    // the FIT MEASUREMENT, which is why `fitStatus` is "unmeasured" and not "overflow". The
    // stderr line says the check did not run, and says why - it must never read as a claim
    // about this board's content, because it is not one.
    return {
      ok: true,
      fitStatus: "unmeasured",
      stdout: rewriteNote,
      stderr:
        `paper_fit.py could not measure the re-papered sheet (exited ${fit.status ?? "with no status"}) - ` +
        `the fit check did not run, which says nothing about whether the content fits: ${fitReport}`,
    }
  }
  const fitStatus = fitStatusFromReport(fitReport)
  if (fitStatus === "unmeasured") {
    // M-3: exit 0 and neither token. The rewrite still happened, so the page
    // is not withheld - but there is no verdict to report, and reporting
    // "overflow" here would be a finding about the board that nothing
    // measured.
    return {
      ok: true,
      fitStatus,
      stdout: rewriteNote,
      stderr:
        "paper_fit.py exited 0 but printed neither \"fits: yes\" nor \"fits: no\", so the fit check " +
        `did not answer - which says nothing about whether the content fits: ${fitReport}`,
    }
  }
  return {
    ok: true,
    fitStatus,
    stdout: `${rewriteNote}\n${fitReport}`,
    stderr: "",
  }
}

// --- rendering, and the one crop this verb can write without a judgement call ---

export interface RenderOutcome {
  readonly ok: boolean
  readonly stdout: string
  readonly stderr: string
}

/**
 * Render the drafted sheet to PDF and SVG (`TOOLING.md` step 3: "Export SVG
 * as well as PDF" - git can diff an SVG), then cut ONE whole-page PNG crop.
 *
 * **WHY ONE CROP AND NOT `draughting/measure/crop.py`'s NAMED REGIONS.**
 * That script's `REGIONS` table is hand-surveyed per run, after a human has
 * looked at a render and picked out the groups worth a close-up - every
 * prior run replaced its own copy of that table with its own boxes
 * (`crop.py`'s own promotion note). A fresh, unrepaired draft has had no
 * such survey yet, so there is no named region this MECHANICAL verb can
 * point at without guessing one - the judgement call `crop.py`'s table
 * encodes is exactly the akcli-repair work this verb does not do (see
 * `tools/cli/draw.ts`'s module comment). The whole-page PNG is the one crop
 * that needs no judgement: "Render it, print it, read it" (`CLAUDE.md`)
 * applies to the page as a whole before any region of it has been singled
 * out.
 */
export function renderSheet(opts: { readonly schematicPath: string; readonly outDir: string; readonly board: string }): RenderOutcome {
  const kicadCli = defaultKicadCli()
  const magick = defaultMagick()
  const pdfPath = path.join(opts.outDir, `${opts.board}.pdf`)
  const svgPath = path.join(opts.outDir, `${opts.board}.svg`)
  const cropDir = path.join(opts.outDir, "crops")
  const cropPath = path.join(cropDir, `${opts.board}-whole-page.png`)

  const stdout: string[] = []
  const stderr: string[] = []

  const pdf = spawnSync(kicadCli, ["sch", "export", "pdf", "-o", pdfPath, opts.schematicPath], { encoding: "utf8" })
  stdout.push((pdf.stdout ?? "").trim())
  if (pdf.status !== 0 || !fs.existsSync(pdfPath)) {
    stderr.push(`${kicadCli} sch export pdf exited ${pdf.status ?? "with no status"}: ${(pdf.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  const svg = spawnSync(kicadCli, ["sch", "export", "svg", "-o", opts.outDir, opts.schematicPath], { encoding: "utf8" })
  stdout.push((svg.stdout ?? "").trim())
  if (svg.status !== 0 || !fs.existsSync(svgPath)) {
    stderr.push(`${kicadCli} sch export svg exited ${svg.status ?? "with no status"}: ${(svg.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  fs.mkdirSync(cropDir, { recursive: true })
  const crop = spawnSync(
    magick,
    ["-density", "200", pdfPath, "-background", "white", "-alpha", "remove", cropPath],
    { encoding: "utf8" },
  )
  if (crop.status !== 0 || !fs.existsSync(cropPath)) {
    stderr.push(`${magick} crop exited ${crop.status ?? "with no status"}: ${(crop.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  return { ok: true, stdout: stdout.filter((s) => s !== "").join("\n"), stderr: stderr.join("\n") }
}

// --- the measurement suite ---

/**
 * The measurement suite this verb runs against every fresh draft, in order.
 *
 * **IT DOES NOT RUN `selftest.py`, AND THE SPEC SAYS IT SHOULD - recorded
 * here as a deviation rather than left for the next reader to notice (final
 * review M-1).** `docs/superpowers/specs/2026-10-30-institutionalise-draughting-design.md`
 * §2: *"Every check keeps a positive control, and the suite's own selftest
 * runs first."* This list is the three scripts below and nothing else.
 *
 * **The control is not lost**, which is why it is a deviation and not a
 * defect: `tests/draught/measure-suite.test.ts` runs `selftest.py` on every
 * `bun test`, and it reports ten controls, every one moved or fired. What is
 * lost is the ordering the spec asks for - `make draw` prints three
 * measurements without first demonstrating, in that same run, that the
 * shared reader those three depend on can still tell a difference.
 *
 * **The cost of closing it is small and was measured: `selftest.py` takes
 * 0.27s** (`/usr/bin/time -p`, this machine), against the seconds this verb
 * already spends in copperhead and `kicad-cli`. So "it would slow the verb
 * down" is not the reason it is absent, and nobody should assume it is.
 *
 * It is NOT closed here because deciding that `make draw`'s output should
 * change shape is a change to what this verb produces, and the producing
 * agent does not get to settle that against its own judgement
 * (`CLAUDE.md`). The spec sentence and this list disagree; one of the two
 * should move, and the reviewer picks which.
 */
const MEASUREMENT_SCRIPTS: readonly string[] = ["crossings.py", "junction_audit.py", "label_survey.py"]

/**
 * Run every script in `MEASUREMENT_SCRIPTS` against the drafted sheet and
 * concatenate what each prints. **A script's own non-zero exit is reported
 * as a TOOLING failure, in its own labelled paragraph, never silently
 * dropped and never treated as a drawing finding** - "a skipped check must
 * never look like a passing one" (`CLAUDE.md`). Neither kind of result ever
 * changes `runDraw`'s exit code: the measurement suite's whole job here is
 * to print findings beside an already-written page, not to gate it
 * (`EVALUATING-DRAWINGS.md` §3, §6).
 */
export function runMeasurementSuite(schematicPath: string): { readonly report: string; readonly ok: boolean } {
  const measureDir = path.join(moduleRepoRoot(), "draughting", "measure")
  const sections: string[] = []
  let ok = true
  for (const script of MEASUREMENT_SCRIPTS) {
    const result = spawnSync("python3", [path.join(measureDir, script), schematicPath], { encoding: "utf8" })
    const body = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
    if (result.status !== 0) {
      ok = false
      sections.push(
        `${script}: EXITED ${result.status ?? "with no status"} - a tooling failure, not a drawing finding:\n${body}`,
      )
    } else {
      sections.push(`${script}:\n${body}`)
    }
  }
  return { report: sections.join("\n\n"), ok }
}
