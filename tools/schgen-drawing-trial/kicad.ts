/**
 * **THE HOST `kicad-cli` THE TRIAL EXPORTS AND CHECKS EVERY ATTEMPT'S SHEET WITH, REFUSED UNLESS IT
 * IS 10.0.5.**
 *
 * The spec puts render, netlist export and ERC on the host's `kicad-cli` 10.0.5 - the one that
 * rendered the approved pages and runs the round-trip test - so both sides of every comparison come
 * from one renderer. A different version would make the comparison two renderers, so it is refused
 * rather than recorded and run. An absent `kicad-cli` fails loudly; nothing here skips.
 *
 * CLI (each writes only the file it names; `version` also refuses an absent `magick`, so one call
 * checks every host tool the downstream stages need before any of them runs):
 *   bun tools/schgen-drawing-trial/kicad.ts version
 *   bun tools/schgen-drawing-trial/kicad.ts netlist SHEET OUT_NET
 *   bun tools/schgen-drawing-trial/kicad.ts erc SHEET OUT_RPT
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { defaultMagick } from "../draught/magick-install.ts"
import { defaultKicadCliExists, defaultRunExport } from "../perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

export const REQUIRED_KICAD_VERSION = "10.0.5"

/** The resolved `kicad-cli`, after checking it exists and is the required version. */
export function trialKicadCli(): string {
  const cli = defaultKicadCli()
  if (!defaultKicadCliExists(cli)) {
    throw new Error(
      `kicad-cli not found at ${cli}. Install KiCad ${REQUIRED_KICAD_VERSION} or set KICAD_CLI. The trial ` +
        "renders, exports and ERC-checks every attempt with the host kicad-cli and has no other way to; it " +
        "does not skip.",
    )
  }
  const version = kicadCliVersion(cli)
  if (version !== REQUIRED_KICAD_VERSION) {
    throw new Error(
      `${cli} reports version ${version}, and the trial requires ${REQUIRED_KICAD_VERSION}: the approved pages ` +
        "were rendered and exported with it, and comparing an attempt rendered by another version would " +
        "compare two renderers as well as two drawings.",
    )
  }
  return cli
}

export function kicadCliVersion(cli: string): string {
  const run = spawnSync(cli, ["version"], { encoding: "utf8" })
  if (run.error !== undefined || run.status !== 0) {
    throw new Error(`could not run ${cli} version: ${run.error?.message ?? (run.stderr ?? "").trim()}`)
  }
  return (run.stdout ?? "").trim()
}

/** Refuses when `magick`, which makes every attempt's PNG from kicad-cli's PDF, is absent. */
export function requireMagick(): string {
  const magick = defaultMagick()
  if (!fs.existsSync(magick)) {
    throw new Error(
      `magick not found at ${magick}. Install ImageMagick 7 or set MAGICK. Every attempt's PNG is made by ` +
        "magick from kicad-cli's PDF, as the approved pages' were; without it there is no page to show, and " +
        "the render does not skip.",
    )
  }
  return magick
}

/** `kicad-cli sch export netlist --format kicadsexpr`, run from the repository root. */
export function exportNetlist(sheet: string, out: string): void {
  defaultRunExport(trialKicadCli(), sheet, out, moduleRepoRoot())
  if (!fs.existsSync(out)) throw new Error(`kicad-cli exited 0 exporting ${sheet} but wrote no ${out}`)
}

/** `kicad-cli sch erc`, report format. Violations are content of the report, not a failure. */
export function runErc(sheet: string, out: string): void {
  const cli = trialKicadCli()
  const run = spawnSync(cli, ["sch", "erc", "--output", out, sheet], { encoding: "utf8", cwd: moduleRepoRoot() })
  if (run.error !== undefined) throw new Error(`could not run ${cli}: ${run.error.message}`)
  if (run.status !== 0 || !fs.existsSync(out)) {
    throw new Error(`${cli} sch erc exited ${String(run.status)} on ${sheet}: ${(run.stderr ?? "").trim()}`)
  }
}

function main(argv: readonly string[]): void {
  const [verb, sheet, out] = argv
  if (verb === "version" && argv.length === 1) {
    trialKicadCli()
    requireMagick()
    process.stdout.write(`${REQUIRED_KICAD_VERSION}\n`)
    return
  }
  if ((verb === "netlist" || verb === "erc") && sheet !== undefined && out !== undefined && argv.length === 3) {
    if (verb === "netlist") exportNetlist(sheet, out)
    else runErc(sheet, out)
    return
  }
  throw new Error("usage: bun tools/schgen-drawing-trial/kicad.ts version | netlist SHEET OUT_NET | erc SHEET OUT_RPT")
}

if (import.meta.main) main(process.argv.slice(2))
