/**
 * Refreshing the Mouser and Digi-Key sources of catalog entries in place: rewriting
 * price breaks and `checked`, never touching which part was chosen and never touching a source from any other supplier
 * (Tayda, Amazon ...).
 *
 * A source whose SKU is still listed but now carries no price break (a factory-order or
 * discontinued listing) is reported and left untouched, the same as one no longer listed at
 * all - it does not abort the run. Stock plays no part in any of this: refresh never reads
 * or writes it.
 *
 * Two phases, so a bad entry never leaves some files rewritten and others not. Phase one
 * (no writes): read and parse every selected entry, resolve every needed supplier client,
 * perform every lookup, and build and validate (`parseCatalogEntry`) every rewritten entry
 * in memory. Phase two, only once every one of those succeeded: write the changed files.
 *
 * `clients` tells this module, per supplier, whether it has a client ready to call, or why
 * not - "missing-credentials" (this operator's key file for that supplier could not be
 * read) refuses the whole run before any lookup, when a selected entry has a source from
 * that supplier, since a missing key is the operator's problem to fix, not a thing to skip
 * past silently. Each source is refreshed by its own `sku`: a Mouser part number, or the
 * Digi-Key product number of the one packaging variation it records.
 *
 * Only `readFile` and `writeFile` are injected: which entries exist in `dir` is read with
 * the real filesystem (`fs.readdirSync`), exactly as `tools/bom/catalog.ts`'s `loadCatalog`
 * does, since every test here works against a real temporary directory.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import fs from "node:fs"
import path from "node:path"
import { parseCatalogEntry } from "../bom/catalog.ts"
import { isRecord } from "../perfboard/guards.ts"
import type { SupplierClient, SupplierName } from "./types.ts"

export type SupplierClientResult =
  | { readonly kind: "ready"; readonly client: SupplierClient }
  | { readonly kind: "missing-credentials"; readonly message: string }
/** One entry per supplier this module knows how to refresh (Mouser, Digi-Key). A supplier
 * absent from this map, when a selected entry actually needs it, is refused - see the
 * module doc comment - rather than silently skipped. */
export type SupplierClients = Partial<Record<SupplierName, SupplierClientResult>>

export type SourceOutcome =
  | { readonly status: "updated"; readonly oldUnitPrice: number; readonly newUnitPrice: number }
  | { readonly status: "unchanged" }
  | { readonly status: "not-listed" }
  | { readonly status: "no-price" }
export interface SourceReport {
  readonly id: string
  readonly sourceIndex: number
  readonly supplier: string
  readonly sku?: string
  readonly outcome: SourceOutcome
}

export interface RefreshResult {
  readonly reports: readonly SourceReport[]
  readonly writtenIds: readonly string[]
}

const REFRESHABLE_SUPPLIERS: ReadonlySet<string> = new Set<SupplierName>(["Mouser", "Digi-Key"])

function isRefreshableSupplier(value: string): value is SupplierName {
  return REFRESHABLE_SUPPLIERS.has(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Every `.json` entry in `dir`, by id - the real filesystem, not `readFile` (see the
 * module doc comment). Mirrors `loadCatalog`'s own discovery in `tools/bom/catalog.ts`. */
function discoverIds(dir: string): readonly string[] {
  let names: readonly string[]
  try {
    names = fs.readdirSync(dir).filter((name) => name.endsWith(".json"))
  } catch (error) {
    throw new Error(`could not read catalog directory "${dir}": ${errorMessage(error)}`)
  }
  return names.map((name) => path.basename(name, ".json")).sort()
}

function readEntryRecord(file: string, readFile: (filePath: string) => string): Record<string, unknown> {
  let text: string
  try {
    text = readFile(file)
  } catch (error) {
    throw new Error(`${file}: could not read the catalog entry (${errorMessage(error)}).`)
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    throw new Error(`${file}: could not parse as JSON: ${errorMessage(error)}`)
  }
  // Validates the entry's whole shape, including every source, before this module touches
  // any of it - a malformed entry refuses here, before any lookup.
  parseCatalogEntry(json, file)
  if (!isRecord(json)) {
    throw new Error(`${file}: the entry is a ${typeof json}, not an object (parseCatalogEntry should have refused this already).`)
  }
  return json
}

interface RewrittenBreak {
  readonly quantity: number
  readonly unitPrice: number
}

/** The offer's breaks (ascending, per `SupplierClient.lookupSku`'s contract), exactly as
 * listed: quantity and unit price, nothing else. */
function rewriteBreaks(
  newBreaks: readonly { readonly quantity: number; readonly unitPrice: number }[],
): readonly RewrittenBreak[] {
  return newBreaks.map((brk) => ({ quantity: brk.quantity, unitPrice: brk.unitPrice }))
}

function smallestUnitPrice(breaks: readonly unknown[]): number | undefined {
  const first = breaks[0]
  if (!isRecord(first)) return undefined
  const value = first["unitPrice"]
  return typeof value === "number" ? value : undefined
}

/** Whether two break lists state the same quantities at the same unit prices, in order -
 * every break, not only the first, so a change at any quantity reads as a change. */
function sameBreaks(oldBreaks: readonly unknown[], newBreaks: readonly RewrittenBreak[]): boolean {
  if (oldBreaks.length !== newBreaks.length) return false
  return newBreaks.every((brk, index) => {
    const old = oldBreaks[index]
    return isRecord(old) && old["quantity"] === brk.quantity && old["unitPrice"] === brk.unitPrice
  })
}

/** "unchanged" only when every break is the same; otherwise "updated", carrying the
 * smallest-quantity break's old and new price (which may be equal, when only a larger
 * break moved). Both lists are non-empty here: `parseCatalogEntry` refuses a source with
 * no breaks, and an offer with none is reported as "no-price" before this is reached. */
function breaksOutcome(
  file: string,
  index: number,
  oldBreaks: readonly unknown[],
  newBreaks: readonly RewrittenBreak[],
): SourceOutcome {
  if (sameBreaks(oldBreaks, newBreaks)) return { status: "unchanged" }
  const oldUnitPrice = smallestUnitPrice(oldBreaks)
  const newUnitPrice = smallestUnitPrice(newBreaks)
  if (oldUnitPrice === undefined || newUnitPrice === undefined) {
    throw new Error(
      `${file}: sources[${index}] has an empty old or new break list after validation - this is a ` +
        "bug in tools/suppliers/refresh.ts, not a catalog problem.",
    )
  }
  return { status: "updated", oldUnitPrice, newUnitPrice }
}

interface PreparedEntry {
  readonly id: string
  readonly file: string
  readonly rawRecord: Record<string, unknown>
  readonly newRawRecord: Record<string, unknown>
  readonly reports: readonly SourceReport[]
  readonly changed: boolean
}

async function prepareEntry(
  id: string,
  dir: string,
  clients: SupplierClients,
  readFile: (filePath: string) => string,
): Promise<PreparedEntry> {
  const file = path.join(dir, `${id}.json`)
  const rawRecord = readEntryRecord(file, readFile)
  const sourcesValue = rawRecord["sources"]
  if (!Array.isArray(sourcesValue)) {
    throw new Error(`${file}: sources is not an array (parseCatalogEntry should have refused this already).`)
  }

  const reports: SourceReport[] = []
  const newSources: unknown[] = []
  let changed = false

  for (let index = 0; index < sourcesValue.length; index += 1) {
    const rawSource = sourcesValue[index]
    const supplierValue = isRecord(rawSource) ? rawSource["supplier"] : undefined
    if (!isRecord(rawSource) || typeof supplierValue !== "string" || !isRefreshableSupplier(supplierValue)) {
      // Not a Mouser/Digi-Key source (or malformed, which parseCatalogEntry would already
      // have refused): untouched, and not reported as a problem.
      newSources.push(rawSource)
      continue
    }
    const supplier = supplierValue
    const skuValue = rawSource["sku"]

    const clientResult = clients[supplier]
    if (clientResult === undefined) {
      throw new Error(
        `${file}: sources[${index}] is a ${supplier} source, but no client result was supplied for ` +
          `"${supplier}". Pass a SupplierClientResult ("ready" or "missing-credentials") ` +
          "for every supplier that can appear in a catalog source.",
      )
    }
    if (clientResult.kind === "missing-credentials") {
      // The operator's problem to fix, not a thing to skip past: refuse the whole run
      // before any lookup, exactly as a missing key refuses every other verb.
      throw new Error(clientResult.message)
    }
    if (typeof skuValue !== "string" || skuValue.trim() === "") {
      throw new Error(`${file}: sources[${index}] (${supplier}) has no sku to refresh by.`)
    }

    const offer = await clientResult.client.lookupSku(skuValue)
    if (offer === undefined) {
      reports.push({ id, sourceIndex: index, supplier, sku: skuValue, outcome: { status: "not-listed" } })
      newSources.push(rawSource)
      continue
    }
    if (offer.breaks.length === 0) {
      // Listed, but with no price break (a factory-order or discontinued listing): left
      // untouched, reported, and does not abort the run - stock plays no part in refresh.
      reports.push({ id, sourceIndex: index, supplier, sku: skuValue, outcome: { status: "no-price" } })
      newSources.push(rawSource)
      continue
    }

    const oldBreaksValue = rawSource["breaks"]
    const oldBreaks = Array.isArray(oldBreaksValue) ? oldBreaksValue : []
    const newBreaks = rewriteBreaks(offer.breaks)
    const newRawSource: Record<string, unknown> = { ...rawSource, breaks: newBreaks, checked: offer.fetched }

    if (JSON.stringify(newRawSource) !== JSON.stringify(rawSource)) changed = true

    const outcome = breaksOutcome(file, index, oldBreaks, newBreaks)
    reports.push({ id, sourceIndex: index, supplier, sku: skuValue, outcome })
    newSources.push(newRawSource)
  }

  const newRawRecord: Record<string, unknown> = { ...rawRecord, sources: newSources }
  // Validated whether or not anything changed: "every rewritten entry passed
  // parseCatalogEntry" is the phase-one contract, not just the changed ones.
  parseCatalogEntry(newRawRecord, file)

  return { id, file, rawRecord, newRawRecord, reports, changed }
}

export async function refreshCatalog(
  dir: string,
  ids: readonly string[],
  clients: SupplierClients,
  readFile: (filePath: string) => string,
  writeFile: (filePath: string, contents: string) => void,
): Promise<RefreshResult> {
  const selectedIds = ids.length > 0 ? [...ids] : discoverIds(dir)

  // Phase one: read, parse, look up and validate every selected entry - no write call
  // happens anywhere above this line or below it until phase two starts.
  const prepared: PreparedEntry[] = []
  for (const id of selectedIds) {
    prepared.push(await prepareEntry(id, dir, clients, readFile))
  }

  // Phase two: only the files phase one actually changed are written.
  const writtenIds: string[] = []
  for (const entry of prepared) {
    if (!entry.changed) continue
    writeFile(entry.file, `${JSON.stringify(entry.newRawRecord, null, 2)}\n`)
    writtenIds.push(entry.id)
  }

  return { reports: prepared.flatMap((entry) => entry.reports), writtenIds }
}
