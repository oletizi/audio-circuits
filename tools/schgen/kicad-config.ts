/**
 * Ported from digital-pedal-platform's `tools/schgen/kicadConfig.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * A hermetic KiCad configuration for every kicad-cli run, so gate results never depend on the
 * user's personal KiCad profile (a CI container has none; a desktop has whatever its owner set up).
 *
 * Each run gets a fresh KICAD_CONFIG_HOME whose <major.minor> settings directory holds the
 * install's own default global tables (the template sym-lib-table and fp-lib-table every new
 * KiCad profile is seeded from), and the KICAD<major>_SYMBOL_DIR / _FOOTPRINT_DIR variables
 * those tables use are set explicitly from the install.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GlobalTable } from "../../lib/kicad/libtable.ts";
import { stockSymbolDir } from "../../lib/schgen/render/library.ts";

export const GLOBAL_TABLES = ["sym-lib-table", "fp-lib-table"] as const;

/** The install's shared-data directory for a kicad-cli binary: the macOS bundle or a Unix prefix. */
export function kicadShareDir(cli: string): string {
  const bin = path.dirname(cli);
  const candidates = [path.join(bin, "..", "SharedSupport"), path.join(bin, "..", "share", "kicad")].map((c) => path.resolve(c));
  const found = candidates.find((c) => GLOBAL_TABLES.every((t) => fs.existsSync(path.join(c, "template", t))));
  if (found === undefined) {
    throw new Error(
      `KiCad's default global library tables (template/${GLOBAL_TABLES.join(", template/")}) were not found beside ${cli}; tried ${candidates.join(", ")}`,
    );
  }
  return found;
}

/** "10.0" for "10.0.5": the settings directory KiCad reads under KICAD_CONFIG_HOME. */
export function settingsVersion(kicadVersion: string): { readonly dir: string; readonly major: string } {
  const m = /^(\d+)\.(\d+)\.\d+$/.exec(kicadVersion);
  if (m?.[1] === undefined || m[2] === undefined) throw new Error(`kicad version "${kicadVersion}" is not major.minor.patch`);
  return { dir: `${m[1]}.${m[2]}`, major: m[1] };
}

export interface HermeticConfig {
  /** The KICAD_CONFIG_HOME directory (delete it when the run is done). */
  readonly home: string;
  /** home/<major.minor>, where KiCad reads and writes its settings. */
  readonly settings: string;
  /** Environment for the kicad-cli child process. */
  readonly env: NodeJS.ProcessEnv;
}

interface InstallTables {
  readonly share: string;
  readonly symVar: string;
  readonly fpVar: string;
  readonly footprints: string;
  readonly tables: readonly { readonly name: (typeof GLOBAL_TABLES)[number]; readonly text: string }[];
}

/** The install's default global tables, each checked to use the install's own path variable. */
function installTables(cli: string, kicadVersion: string): InstallTables {
  const share = kicadShareDir(cli);
  const { major } = settingsVersion(kicadVersion);
  const symVar = `KICAD${major}_SYMBOL_DIR`;
  const fpVar = `KICAD${major}_FOOTPRINT_DIR`;
  const footprints = path.join(share, "footprints");
  if (!fs.existsSync(footprints)) throw new Error(`KiCad stock footprint directory ${footprints} does not exist`);
  const tables = GLOBAL_TABLES.map((t) => ({ name: t, text: fs.readFileSync(path.join(share, "template", t), "utf8") }));
  for (const { name, text } of tables) {
    const v = name === "sym-lib-table" ? symVar : fpVar;
    if (!text.includes(`\${${v}}`)) throw new Error(`${path.join(share, "template", name)} does not use \${${v}}; KiCad ${kicadVersion} is not the install it came from`);
  }
  return { share, symVar, fpVar, footprints, tables };
}

/**
 * The install's default global footprint table and the one variable it uses, for resolving stock
 * footprints in-process (gate 6) exactly as a hermetic kicad-cli run would, never through the
 * user's KiCad profile.
 */
export function stockFootprintTable(cli: string, kicadVersion: string): GlobalTable {
  const t = installTables(cli, kicadVersion);
  return { file: path.join(t.share, "template", "fp-lib-table"), vars: { [t.fpVar]: t.footprints } };
}

/** The colour theme PDF exports name with --theme; hermeticConfig installs it. */
export const SCHGEN_THEME = "schgen";

/**
 * KiCad 10 plots a DNP symbol with a cross over its body and pins in the theme's dnp_marker colour,
 * unconditionally (SCH_SYMBOL::PlotDNP; no project or schematic setting turns it off). The built-in
 * rgba(220, 9, 13, 0.85) is near-opaque and hides small glyphs (a Zener's orientation) and pin
 * numbers. This theme keeps every other colour at KiCad's default and draws the cross light, so it
 * still marks the part as not fitted while what lies under it stays readable. The DNP attribute
 * itself, which the BOM and the board read, is untouched.
 */
export function schgenTheme(): string {
  const theme = { meta: { name: SCHGEN_THEME, version: 5 }, schematic: { dnp_marker: "rgba(220, 9, 13, 0.30)" } };
  return `${JSON.stringify(theme, null, 2)}\n`;
}

/** A fresh configuration home seeded from the install of `cli` (version `kicadVersion`), with the schgen colour theme. */
export function hermeticConfig(cli: string, kicadVersion: string): HermeticConfig {
  const { symVar, fpVar, footprints, tables } = installTables(cli, kicadVersion);
  const { dir } = settingsVersion(kicadVersion);
  const symbols = stockSymbolDir();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-kicad-config-"));
  const settings = path.join(home, dir);
  fs.mkdirSync(settings);
  for (const { name, text } of tables) fs.writeFileSync(path.join(settings, name), text);
  fs.mkdirSync(path.join(settings, "colors"));
  fs.writeFileSync(path.join(settings, "colors", `${SCHGEN_THEME}.json`), schgenTheme());
  return { home, settings, env: { ...process.env, KICAD_CONFIG_HOME: home, [symVar]: symbols, [fpVar]: footprints } };
}

/** After a run: KiCad wrote its settings into `settings`, proving it read KICAD_CONFIG_HOME there. */
export function usedConfig(c: HermeticConfig): boolean {
  const seeded = new Set<string>([...GLOBAL_TABLES, "colors"]);
  return fs.readdirSync(c.settings).some((f) => !seeded.has(f));
}
