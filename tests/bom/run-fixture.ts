/**
 * Fakes for tests/bom/run.test.ts and the CLI's `bom` verb test: a one-resistor
 * circuit module, a catalog entry that fits its line, and an in-memory filesystem
 * that records every write.
 */
import { net, type Network } from "../../lib/model/types.ts"
import type { BomDeps, BomFs } from "../../tools/bom/run.ts"
import type { CatalogEntry } from "../../tools/bom/catalog.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

export const RESISTOR_FOOTPRINT = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

export function demoNetwork(): Network {
  return {
    components: [{
      id: "bias_resistor", kind: "resistor", parameters: { ohms: 100_000 },
      part: { footprint: RESISTOR_FOOTPRINT }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
    }],
    ports: { input: "IN", ground: "GND" },
  }
}

export const DEMO_CONDITIONS = {
  description: "Supply 9 V; no controls.",
  environment: {
    source: { port: "input", amplitude: 1, seriesOhms: 0 },
    load: { port: "input", ohms: 10_000 },
    supplies: [{ port: "input", volts: 9 }],
    groundPort: "ground",
  },
  controlState: { potPositions: {}, switchPositions: {} },
}

export function demoModule(): Readonly<Record<string, unknown>> {
  return {
    demo: demoNetwork,
    DESIGNATORS: { bias_resistor: "R1" },
    PIN_NUMBERS: {},
    bomConditions: () => DEMO_CONDITIONS,
  }
}

export function fittingResistor(checked: string = "2026-09-01"): CatalogEntry {
  return {
    id: "resistor-100k-metal-film-0207",
    kind: "resistor",
    description: "100k 1/4W metal film resistor, 0207 body",
    manufacturer: "Yageo",
    mpn: "MFR-25FBF52-100K",
    specs: { ohms: 100_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
    evidence: [],
    why: "test fixture",
    stock: false,
    sources: [{
      supplier: "Mouser", url: "https://mouser.com/x", currency: "USD",
      breaks: [{ quantity: 1, unitPrice: 0.1 }], checked, use: "standard",
    }],
  }
}

export function declarationIn(dir: string): PerfboardDeclaration {
  return {
    file: `${dir}/perfboard.json`, dir,
    circuitPath: `${dir}/circuit.ts`, exportName: "demo", vrtPath: `${dir}/demo.vrt`,
  }
}

export interface MemoryFs extends BomFs {
  readonly files: Map<string, string>
  readonly writes: string[]
}

export function memoryFs(initial: Readonly<Record<string, string>>): MemoryFs {
  const files = new Map(Object.entries(initial))
  const writes: string[] = []
  return {
    files,
    writes,
    exists: (file) => files.has(file),
    readText: (file) => {
      const text = files.get(file)
      if (text === undefined) throw new Error(`memoryFs: no file ${file}`)
      return text
    },
    writeText: (file, text) => {
      writes.push(file)
      files.set(file, text)
    },
  }
}

/** Deps for a board at `dir`, choosing nothing unless `lines` says otherwise. */
export function demoDeps(
  fs: MemoryFs,
  catalog: ReadonlyMap<string, CatalogEntry> = new Map(),
): BomDeps & { readonly catalogDirs: string[] } {
  const catalogDirs: string[] = []
  return {
    catalogDirs,
    fs,
    importModule: async () => demoModule(),
    dissipation: async () => new Map([["bias_resistor", 0.001]]),
    loadCatalog: (dir) => {
      catalogDirs.push(dir)
      return catalog
    },
    today: () => "2026-09-30",
    repoRoot: "/repo",
  }
}

export function bomJson(lines: Readonly<Record<string, string>> = {}): string {
  return JSON.stringify({ purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 }, lines, extras: [] })
}
