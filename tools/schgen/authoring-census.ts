/**
 * WHAT TASK 9's AUTHORING DECLARATIONS COVER, AND WHAT IS STILL RESIDUE - the measurement
 * `docs/known-gaps.md` **G99** records after its rewrite, committed so it is re-run rather than
 * rebuilt from a recipe in prose.
 *
 *   bun tools/schgen/authoring-census.ts
 *
 * **WHY A TOOL AND NOT ONLY AN ENTRY.** These numbers are a measurement, not an invariant: they
 * move when a circuit gains a part, when a symbol is vendored, when a kind enters
 * `symbolForKind`'s whitelist, and when a block declaration changes. `tools/schgen/symbol-census.ts`
 * is the precedent and this imports its `PARITY_CIRCUITS` rather than restating which four
 * circuits the parity set is or which entry point each one is read through.
 *
 * **IT MEASURES THE DERIVED ARM.** Every figure comes from building the circuit, resolving its
 * symbols through the declaration and the rules, and reading the result - never from a text sweep,
 * which would count a shared constructor instead of the parts it reaches.
 *
 * `tests/schgen/authoring-complete.test.ts` holds the same declarations to G99's criterion on
 * every run, so this reports and that refuses.
 */

import { PARITY_CIRCUITS } from "./symbol-census.ts"
import { crossingNets } from "../../lib/schgen/authoring-checks.ts"
import { mpnSymbolDisagreements, nicknamesOf, schematicParts, symbolOriginCounts, preferredOrientationsOf } from "../../lib/schgen/from-network.ts"
import { createResolver } from "../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts"
import { OPAMP_BUFFER_SCHEMATIC } from "../../circuits/opamp-buffer.schematic.ts"
import { OPTICAL_COMPRESSOR_SCHEMATIC } from "../../circuits/optical-compressor/schematic/authoring.ts"
import { PT2399_CORE_SCHEMATIC } from "../../circuits/pt2399-core/schematic/authoring.ts"
import { TRANSISTOR_PREAMP_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/authoring.ts"
import type { SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"
import type { Network } from "../../lib/model/types.ts"

export interface ParityCase {
  readonly name: string
  readonly entry: string
  readonly network: Network
  readonly authoring: SchematicAuthoring
}

const AUTHORING: Readonly<Record<string, SchematicAuthoring>> = {
  "opamp-buffer": OPAMP_BUFFER_SCHEMATIC,
  "optical-compressor": OPTICAL_COMPRESSOR_SCHEMATIC,
  "pt2399-core": PT2399_CORE_SCHEMATIC,
  "transistor-preamp": TRANSISTOR_PREAMP_SCHEMATIC,
}

/** The four parity circuits beside their authoring declarations, in `PARITY_CIRCUITS` order. */
export const PARITY_CASES: readonly ParityCase[] = PARITY_CIRCUITS.map((circuit) => {
  const authoring = AUTHORING[circuit.name]
  if (authoring === undefined) {
    throw new Error(
      `the parity circuit "${circuit.name}" has no schematic authoring declaration in ` +
        "tools/schgen/authoring-census.ts. Task 9 declares one per parity circuit; a circuit " +
        "added to PARITY_CIRCUITS in tools/schgen/symbol-census.ts needs one here too, and it " +
        "is NOT skipped - a parity case that quietly drops out is a check that stopped running " +
        "without saying so.",
    )
  }
  return { name: circuit.name, entry: circuit.entry, network: circuit.build(), authoring }
})

/**
 * One resolver over exactly the library nicknames `cases` need.
 *
 * **GENERALISED FROM `parityResolver` WHEN THE NINE BOARD DECLARATIONS LANDED** (Task 25), which
 * are not parity circuits and must not be added to `PARITY_CIRCUITS`: that list is what the M1
 * plan calls the parity set and nine more entries would silently change the subject of every
 * measurement that reads it. `./board-declarations.ts` holds them, and `./board-sheets.ts`
 * resolves ONE case at a time through this - because `symbolLibraries` refuses a whole batch
 * containing one unresolvable nickname, so a single bad nickname on one board would otherwise
 * report as a refusal on all eleven.
 */
export function caseResolver(cases: readonly ParityCase[]): SymbolResolver {
  const nicknames = new Set<string>()
  for (const c of cases) for (const n of nicknamesOf(c.network, c.authoring)) nicknames.add(n)
  return createResolver(symbolLibraries([...nicknames].sort()))
}

/** One resolver over exactly the library nicknames the four parity declarations need. */
export function parityResolver(): SymbolResolver {
  return caseResolver(PARITY_CASES)
}

export interface BlockCount {
  readonly id: string
  readonly members: number
  readonly interfacePorts: number
  readonly fixed: number
  readonly negotiable: number
  /** Crossing nets `crossingNets` finds, which the interface must equal exactly. */
  readonly crossings: number
}

export interface CircuitCensus {
  readonly name: string
  readonly entry: string
  readonly components: number
  /** Components the circuit model declares a `part.symbol` for. */
  readonly symbolFromModel: number
  readonly symbolFromOverride: number
  readonly symbolFromRule: number
  /** Components carrying any override at all. */
  readonly overridden: number
  readonly pins: number
  readonly pinsSidedBySymbol: number
  readonly pinsSidedByOverride: number
  readonly orientationPreferred: number
  readonly orientationOpen: number
  /** Components whose part.mpn differs from the part name of the symbol they are drawn with. */
  readonly mpnDisagreements: readonly string[]
  readonly blocks: readonly BlockCount[]
}

export function authoringCensus(): readonly CircuitCensus[] {
  const symbols = parityResolver()
  return PARITY_CASES.map((c): CircuitCensus => {
    const parts = schematicParts(c.network, c.authoring, symbols)
    const origins = symbolOriginCounts(parts)
    const orientations = [...preferredOrientationsOf(c.network, c.authoring, symbols).values()]
    let pins = 0
    let bySymbol = 0
    let byOverride = 0
    for (const part of parts) {
      pins += part.symbol.pins.length
      byOverride += part.sidesFromOverride.size
      bySymbol += part.symbol.pins.length - part.sidesFromOverride.size
    }
    return {
      name: c.name,
      entry: c.entry,
      components: c.network.components.length,
      symbolFromModel: origins.model,
      symbolFromOverride: origins.override,
      symbolFromRule: origins.rule,
      overridden: Object.keys(c.authoring.overrides).length,
      pins,
      pinsSidedBySymbol: bySymbol,
      pinsSidedByOverride: byOverride,
      orientationPreferred: orientations.filter((r) => r !== null).length,
      orientationOpen: orientations.filter((r) => r === null).length,
      mpnDisagreements: mpnSymbolDisagreements(parts).map((d) => `${d.component}: ${d.mpn} drawn as ${d.libId}`),
      blocks: c.authoring.blocks.map((block): BlockCount => ({
        id: block.id,
        members: block.members.length,
        interfacePorts: block.interface.length,
        fixed: block.interface.filter((p) => p.position === "fixed").length,
        negotiable: block.interface.filter((p) => p.position === "negotiable").length,
        crossings: crossingNets(c.network, c.authoring, block.id).size,
      })),
    }
  })
}

export function renderCensus(census: readonly CircuitCensus[]): string {
  const lines: string[] = []
  for (const c of census) {
    lines.push(`${c.name} (${c.entry}): ${c.components} components`)
    lines.push(
      `  symbol from: model ${c.symbolFromModel}, override ${c.symbolFromOverride}, ` +
        `by-kind rule ${c.symbolFromRule}; components carrying any override: ${c.overridden}`,
    )
    lines.push(
      `  symbol pins ${c.pins}: sided by the symbol's geometry ${c.pinsSidedBySymbol}, ` +
        `by a declared override ${c.pinsSidedByOverride}`,
    )
    lines.push(
      `  orientation: preferred by the rule library ${c.orientationPreferred}, ` +
        `left open for the backend ${c.orientationOpen}`,
    )
    lines.push(`  mpn differs from the symbol's part name: ${c.mpnDisagreements.length}`)
    for (const d of c.mpnDisagreements) lines.push(`      ${d}`)
    for (const b of c.blocks) {
      lines.push(
        `  block ${b.id.padEnd(22)} members ${String(b.members).padStart(2)}  ` +
          `interface ports ${String(b.interfacePorts).padStart(2)} ` +
          `(fixed ${b.fixed}, negotiable ${b.negotiable})  crossing nets ${b.crossings}`,
      )
    }
    lines.push("")
  }
  const totals = census.reduce(
    (acc, c) => ({
      components: acc.components + c.components,
      model: acc.model + c.symbolFromModel,
      override: acc.override + c.symbolFromOverride,
      rule: acc.rule + c.symbolFromRule,
      ports: acc.ports + c.blocks.reduce((n, b) => n + b.interfacePorts, 0),
      blocks: acc.blocks + c.blocks.length,
    }),
    { components: 0, model: 0, override: 0, rule: 0, ports: 0, blocks: 0 },
  )
  lines.push(
    `TOTAL ${totals.components} components across the four: symbol from the model ${totals.model}, ` +
      `from an override ${totals.override}, from the by-kind rule ${totals.rule}`,
  )
  lines.push(`TOTAL ${totals.blocks} declared blocks carrying ${totals.ports} interface ports`)
  return lines.join("\n")
}

if (import.meta.main) {
  console.log(renderCensus(authoringCensus()))
}
