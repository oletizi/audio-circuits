/**
 * Ported from digital-pedal-platform's `tools/schgen/kicadRun.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KICAD_CLI } from "../../lib/kicad/netlist.ts";
import { hermeticConfig, SCHGEN_THEME, usedConfig } from "./kicad-config.ts";

export interface CliResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

function spawnCli(args: readonly string[], env: NodeJS.ProcessEnv): CliResult {
  const r = spawnSync(KICAD_CLI, [...args], { encoding: "utf8", env });
  if (r.error !== undefined) throw new Error(`could not run ${KICAD_CLI}: ${r.error.message}`);
  // A signal-killed child has a null status; map it to a failing code (not a data fallback).
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

let installedVersion: string | null = null;

/** The installed kicad-cli's version, read once, with an empty KICAD_CONFIG_HOME (version reads no libraries). */
export function kicadVersion(): string {
  if (installedVersion === null) {
    installedVersion = withTempDir("schgen-kicad-version-", (home) =>
      parseKicadVersion(spawnCli(["version"], { ...process.env, KICAD_CONFIG_HOME: home }).stdout),
    );
  }
  return installedVersion;
}

/**
 * Run kicad-cli under a hermetic configuration (kicadConfig.ts): results never depend on the
 * user's KiCad profile. Throws when KiCad did not take its settings from that configuration.
 */
export function runKicadCli(args: readonly string[]): CliResult {
  const config = hermeticConfig(KICAD_CLI, kicadVersion());
  try {
    const r = spawnCli(args, config.env);
    if (!usedConfig(config)) {
      throw new Error(`kicad-cli ${args.join(" ")} wrote no settings under KICAD_CONFIG_HOME=${config.home}; it did not use the hermetic configuration`);
    }
    return r;
  } finally {
    fs.rmSync(config.home, { recursive: true, force: true });
  }
}

export function parseKicadVersion(text: string): string {
  const m = /^(\d+\.\d+\.\d+)/.exec(text.trim());
  if (m?.[1] === undefined) throw new Error(`kicad-cli version printed "${text.trim()}"`);
  return m[1];
}

/**
 * stderr lines known to be harmless. kicad-cli on macOS prints Fontconfig
 * warnings on every run, so arbitrary stderr is never treated as failure;
 * callers match specific strings (e.g. "annotation errors") in the output of
 * stderrProblems instead.
 */
export const BENIGN_STDERR: readonly RegExp[] = [/^Fontconfig /];

export function stderrProblems(stderr: string): string[] {
  return stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !BENIGN_STDERR.some((re) => re.test(l)))
    .map((l) => `kicad-cli: ${l}`);
}

function withTempDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export interface NetlistExport {
  readonly xml: string;
  readonly stderr: string;
}

export function exportNetlist(schPath: string): NetlistExport {
  return withTempDir("schgen-net-", (dir) => {
    const out = path.join(dir, "netlist.xml");
    const r = runKicadCli(["sch", "export", "netlist", "--format", "kicadxml", "-o", out, schPath]);
    if (r.status !== 0) throw new Error(`kicad-cli netlist export failed (${r.status}) for ${schPath}:\n${r.stderr}`);
    return { xml: fs.readFileSync(out, "utf8"), stderr: r.stderr };
  });
}

export function parseErcCounts(report: string): { errors: number; warnings: number } {
  const m = /ERC messages:\s*\d+\s+Errors\s+(\d+)\s+Warnings\s+(\d+)/.exec(report);
  if (m?.[1] === undefined || m[2] === undefined) throw new Error("ERC report has no totals line");
  return { errors: Number(m[1]), warnings: Number(m[2]) };
}

export interface ErcResult {
  readonly report: string;
  readonly errors: number;
  readonly warnings: number;
}

export function runErc(schPath: string, severity: "error" | "all"): ErcResult {
  return withTempDir("schgen-erc-", (dir) => {
    const out = path.join(dir, "erc.rpt");
    const flag = severity === "error" ? "--severity-error" : "--severity-all";
    const r = runKicadCli(["sch", "erc", flag, "-o", out, schPath]);
    if (r.status !== 0) throw new Error(`kicad-cli ERC failed (${r.status}) for ${schPath}:\n${r.stderr}`);
    if (!fs.existsSync(out)) throw new Error(`kicad-cli ERC wrote no report for ${schPath}:\n${r.stderr}`);
    const report = fs.readFileSync(out, "utf8");
    return { report, ...parseErcCounts(report) };
  });
}

export function exportPdf(schPath: string, outFile: string): void {
  const r = runKicadCli(["sch", "export", "pdf", "--theme", SCHGEN_THEME, "-o", outFile, schPath]);
  if (r.status !== 0) throw new Error(`kicad-cli PDF export failed (${r.status}) for ${schPath}:\n${r.stderr}`);
}
