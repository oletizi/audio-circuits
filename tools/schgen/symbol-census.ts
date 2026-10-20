/**
 * WHICH KiCad SYMBOLS THE FOUR PARITY CIRCUITS DECLARE, AND WHETHER THEY
 * RESOLVE - the measurement `docs/known-gaps.md` **G118** records, committed
 * so it is re-run rather than rebuilt.
 *
 *   bun tools/schgen/symbol-census.ts
 *
 * **WHY IT IS A TOOL AND NOT ONLY AN ENTRY.** G118's numbers are a
 * measurement, not an invariant: they change when a circuit gains a part, when
 * a symbol is vendored, and when the installed KiCad changes. The entry that
 * records them also carries an **undiagnosed** disagreement with the M1 plan's
 * own "measured starting point" (line 831), which is the one thing a successor
 * would most want to re-measure - and Task 10's census is the task that will
 * quote these figures. A recipe in prose would have to be rebuilt from
 * scratch; this is the thing that produced them.
 *
 * **IT MEASURES THE DERIVED ARM, NOT A GREP.** Each circuit is BUILT and every
 * component's `part?.symbol` is read, so a symbol that reaches a part through
 * a shared constructor (`circuits/transistor-preamp/parts.ts` does this for
 * eight of them) is counted exactly once per component that carries it. A text
 * sweep would count the constructor, not the parts.
 *
 * **WHICH ENTRY POINT, STATED RATHER THAN ASSUMED.** `transistor-preamp` has
 * five boards; this reads `transistorPreampLab()`, which is what
 * `circuits/transistor-preamp/index.ts` re-exports and what the perfboard and
 * schematic tools load. G118's disagreement with the plan's figure for that
 * circuit is most likely a difference of entry point, which is why this is
 * named here and in the rendered output.
 *
 * **A REFUSAL IS DATA HERE, AND THAT IS NOT A FALLBACK.** `symbolLibraries`
 * refuses a whole batch containing one unresolvable nickname, which is right
 * for a drawing and useless for a census: the census's whole job is to report
 * WHICH ids do not resolve. So each nickname is probed on its own and its
 * refusal message is recorded verbatim in `unresolved`. Nothing is defaulted,
 * nothing is guessed, and no id is dropped - an id whose nickname refused
 * appears in `unresolved` carrying that nickname's message.
 */

import { opampBuffer } from "../../circuits/opamp-buffer.ts"
import { opticalCompressor } from "../../circuits/optical-compressor/index.ts"
import { pt2399Core } from "../../circuits/pt2399-core/pt2399-core.ts"
import { transistorPreampLab } from "../../circuits/transistor-preamp/index.ts"
import { VENDORED_SYMBOLS } from "../../lib/kicad/symbol-library.ts"
import { createResolver } from "../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts"
import type { Network } from "../../lib/model/index.ts"

/** The four circuits the M1 plan calls the parity set, with the entry point read. */
export const PARITY_CIRCUITS: readonly { readonly name: string; readonly entry: string; readonly build: () => Network }[] = [
  { name: "opamp-buffer", entry: "opampBuffer()", build: opampBuffer },
  { name: "optical-compressor", entry: "opticalCompressor()", build: opticalCompressor },
  { name: "pt2399-core", entry: "pt2399Core()", build: pt2399Core },
  { name: "transistor-preamp", entry: "transistorPreampLab()", build: transistorPreampLab },
]

export interface CircuitCount {
  readonly name: string
  readonly entry: string
  readonly components: number
  /** Components carrying a `part.symbol`. */
  readonly declaring: number
}

export interface ResolvedSymbol {
  readonly pins: number
  readonly units: number
}

export interface SymbolCensus {
  readonly circuits: readonly CircuitCount[]
  /** lib id -> the circuit names that declare it, sorted. */
  readonly declared: ReadonlyMap<string, readonly string[]>
  readonly resolved: ReadonlyMap<string, ResolvedSymbol>
  /** lib id -> the refusal, verbatim. */
  readonly unresolved: ReadonlyMap<string, string>
  /** Declared and not in `VENDORED_SYMBOLS`: pinned by nothing, so machine-dependent. */
  readonly notVendored: readonly string[]
  /** Vendored and declared by none of the four. */
  readonly vendoredNotDeclared: readonly string[]
}

function firstLine(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  return message.split("\n")[0] ?? message
}

export function symbolCensus(): SymbolCensus {
  const circuits: CircuitCount[] = []
  const declared = new Map<string, string[]>()
  for (const { name, entry, build } of PARITY_CIRCUITS) {
    const net = build()
    let declaring = 0
    for (const component of net.components) {
      const symbol = component.part?.symbol
      if (symbol === undefined) continue
      declaring += 1
      const sites = declared.get(symbol) ?? []
      if (!sites.includes(name)) sites.push(name)
      declared.set(symbol, sites)
    }
    circuits.push({ name, entry, components: net.components.length, declaring })
  }

  const libIds = [...declared.keys()].sort()
  const nicknames = [...new Set(libIds.map((id) => id.split(":")[0] ?? ""))].sort()

  // Probed one at a time, so one unresolvable nickname does not hide the rest.
  const nicknameRefusal = new Map<string, string>()
  const usable: string[] = []
  for (const nickname of nicknames) {
    try {
      symbolLibraries([nickname])
      usable.push(nickname)
    } catch (e) {
      nicknameRefusal.set(nickname, firstLine(e))
    }
  }

  const resolver = createResolver(symbolLibraries(usable))
  const resolved = new Map<string, ResolvedSymbol>()
  const unresolved = new Map<string, string>()
  for (const libId of libIds) {
    const nickname = libId.split(":")[0] ?? ""
    const refusal = nicknameRefusal.get(nickname)
    if (refusal !== undefined) {
      unresolved.set(libId, `nickname ${nickname}: ${refusal}`)
      continue
    }
    try {
      const symbol = resolver.resolve(libId)
      resolved.set(libId, { pins: symbol.pins.length, units: symbol.unitCount })
    } catch (e) {
      unresolved.set(libId, firstLine(e))
    }
  }

  const vendored = new Set<string>(VENDORED_SYMBOLS)
  return {
    circuits,
    declared: new Map([...declared].map(([id, sites]) => [id, [...sites].sort()])),
    resolved,
    unresolved,
    notVendored: libIds.filter((id) => !vendored.has(id)),
    vendoredNotDeclared: VENDORED_SYMBOLS.filter((id) => !declared.has(id)),
  }
}

export function renderCensus(census: SymbolCensus): string {
  const lines: string[] = []
  for (const c of census.circuits) {
    lines.push(`${c.name} (${c.entry}): ${c.declaring} of ${c.components} components declare a symbol`)
  }
  lines.push("", `distinct lib ids declared across the four: ${census.declared.size}`, "", "per lib id:")
  for (const libId of [...census.declared.keys()].sort()) {
    const where = (census.declared.get(libId) ?? []).join(", ")
    const hit = census.resolved.get(libId)
    const miss = census.unresolved.get(libId)
    if (hit !== undefined) {
      lines.push(`  yes  ${libId.padEnd(42)} (${where}) pins=${hit.pins} units=${hit.units}`)
      continue
    }
    lines.push(`  NO   ${libId.padEnd(42)} (${where}) -- ${miss ?? "no result recorded"}`)
  }
  lines.push("", `resolve: ${census.resolved.size}; do not resolve: ${census.unresolved.size}`, "")
  lines.push("declared but NOT vendored (pinned by nothing, so machine-dependent):")
  for (const id of census.notVendored) lines.push(`  ${id}`)
  lines.push("vendored but not declared by the four:")
  for (const id of census.vendoredNotDeclared) lines.push(`  ${id}`)
  return lines.join("\n")
}

if (import.meta.main) {
  console.log(renderCensus(symbolCensus()))
}
