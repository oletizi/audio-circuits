/**
 * `bun run parts <verb>` - Mouser and Digi-Key lookups for the parts researcher, and
 * catalog price refresh. Run from anywhere in the repository (`refresh`'s catalog
 * directory is resolved from the repo root, not the process's own directory).
 *
 * Clients, credentials reading, the clock and the filesystem are all injected
 * (`PartsCliOptions`), so tests never touch the network, the real key files or the real
 * catalog.
 *
 * Until Task 2 of docs/superpowers/plans/2026-09-30-supplier-search.md, the only supplier
 * this tool has is Mouser: `--supplier digikey` (on `lookup`/`search`/`source`) and a
 * Digi-Key source encountered by `refresh` both name that explicitly, rather than silently
 * doing nothing.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { readMouserCredentials } from "../suppliers/credentials.ts"
import { mouserClient } from "../suppliers/mouser.ts"
import { offerToSource } from "../suppliers/source.ts"
import { refreshCatalog, type SourceReport, type SupplierClients } from "../suppliers/refresh.ts"
import type { FetchLike, SupplierClient, SupplierName, SupplierOffer } from "../suppliers/types.ts"
import { isSourceUse, SOURCE_USE_LIST } from "../bom/catalog.ts"

const DIGIKEY_NOT_BUILT =
  "the Digi-Key client is not built yet; register at developer.digikey.com and run Task 2 of " +
  "docs/superpowers/plans/2026-09-30-supplier-search.md"

/** Every supplier this tool has a client for. Grows to include Digi-Key once Task 2 lands. */
const SUPPORTED_SUPPLIERS: readonly SupplierName[] = ["Mouser"]

const SUPPLIER_NAME_BY_FLAG: Record<string, SupplierName> = { mouser: "Mouser", digikey: "Digi-Key" }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface PartsDeps {
  readonly repoRoot: string
  readonly home: string
  readonly readFile: (filePath: string) => string
  readonly writeFile: (filePath: string, contents: string) => void
  readonly fetch: FetchLike
  readonly today: () => string
}

export interface PartsCliOptions {
  readonly log?: (line: string) => void
  readonly error?: (line: string) => void
  readonly repoRoot?: string
  readonly home?: string
  readonly readFile?: (filePath: string) => string
  readonly writeFile?: (filePath: string, contents: string) => void
  readonly fetch?: FetchLike
  readonly today?: () => string
}

const USAGE = [
  "parts - Mouser and Digi-Key lookups for the parts researcher, and catalog price refresh.",
  "",
  "Usage: bun run parts <verb> [args] [flags]",
  "",
  "Verbs:",
  "  lookup <mpn> [--supplier mouser|digikey] [--json]",
  "                          the exact part at each supplier this tool has (Mouser alone",
  "                          until Task 2); refuses if a needed key file is missing.",
  "  search <keywords...> [--supplier ...] [--limit n] [--json]",
  "                          candidate parts for a requirement (default limit 10).",
  "  source <mpn> --supplier mouser|digikey --use <use>",
  "                          print a catalog Source for the one exact match, ready to",
  "                          paste into an entry; refuses, listing the matches, unless",
  "                          exactly one exists. <use>: " + SOURCE_USE_LIST.join(", ") + ".",
  "  refresh [<id>...]      re-read every Mouser/Digi-Key source of the named catalog",
  "                          entries (all of them, when none are named) and rewrite their",
  "                          price breaks and checked date in place.",
  "",
  "Flags:",
  "  --supplier mouser|digikey   narrow to one supplier (lookup, search, source).",
  "  --json                      print offers as JSON instead of readable text.",
  "  --limit n                   search: the maximum number of results (default 10).",
  "  --use <use>                 source: which SourceUse to record.",
  "",
  "Exit codes:",
  "  0  the verb completed (refresh: even when nothing changed)",
  "  1  a bad argument, a missing key file, a supplier refusal, or no/too many exact matches",
].join("\n")

function defaultDeps(opts: PartsCliOptions): PartsDeps {
  return {
    repoRoot: opts.repoRoot ?? moduleRepoRoot(),
    home: opts.home ?? os.homedir(),
    readFile: opts.readFile ?? ((filePath: string) => fs.readFileSync(filePath, "utf8")),
    writeFile: opts.writeFile ?? ((filePath: string, contents: string) => fs.writeFileSync(filePath, contents)),
    fetch: opts.fetch ?? ((url: string, init) => fetch(url, init)),
    today: opts.today ?? (() => new Date().toISOString().slice(0, 10)),
  }
}

interface ParsedArgs {
  readonly positional: readonly string[]
  readonly supplier?: string
  readonly json: boolean
  readonly limit?: number
  readonly use?: string
}

interface AllowedFlags {
  readonly supplier?: boolean
  readonly json?: boolean
  readonly limit?: boolean
  readonly use?: boolean
}

function parseArgs(args: readonly string[], allowed: AllowedFlags, error: (line: string) => void): ParsedArgs | null {
  const positional: string[] = []
  let supplier: string | undefined
  let json = false
  let limit: number | undefined
  let use: string | undefined

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--supplier" && allowed.supplier === true) {
      const value = args[i + 1]
      if (value === undefined || value.startsWith("--")) {
        error('--supplier needs a value: "mouser" or "digikey".')
        return null
      }
      supplier = value
      i += 1
      continue
    }
    if (arg === "--json" && allowed.json === true) {
      json = true
      continue
    }
    if (arg === "--limit" && allowed.limit === true) {
      const value = args[i + 1]
      const parsed = value === undefined ? NaN : Number(value)
      if (value === undefined || value.startsWith("--") || !Number.isInteger(parsed) || parsed <= 0) {
        error(`--limit needs a positive integer value (got ${JSON.stringify(value)}).`)
        return null
      }
      limit = parsed
      i += 1
      continue
    }
    if (arg === "--use" && allowed.use === true) {
      const value = args[i + 1]
      if (value === undefined || value.startsWith("--")) {
        error(`--use needs a value: one of ${SOURCE_USE_LIST.join(", ")}.`)
        return null
      }
      use = value
      i += 1
      continue
    }
    if (arg !== undefined && arg.startsWith("--")) {
      error(`unknown flag "${arg}" for this verb. Run with --help to see the flags this verb accepts.`)
      return null
    }
    if (arg !== undefined) positional.push(arg)
  }
  return { positional, supplier, json, limit, use }
}

/** `--supplier`'s value to the list of suppliers a verb should query: every supplier the
 * tool has, when none was given; refuses naming the flag's value when it names neither
 * supplier, or names Digi-Key before Task 2 has built it. */
function resolveSuppliers(
  supplierFlag: string | undefined,
  error: (line: string) => void,
): readonly SupplierName[] | null {
  if (supplierFlag === undefined) return SUPPORTED_SUPPLIERS
  const name = SUPPLIER_NAME_BY_FLAG[supplierFlag]
  if (name === undefined) {
    error(`--supplier "${supplierFlag}" is not "mouser" or "digikey".`)
    return null
  }
  if (name === "Digi-Key") {
    error(DIGIKEY_NOT_BUILT)
    return null
  }
  return [name]
}

function buildMouserClient(deps: PartsDeps): SupplierClient {
  const credentials = readMouserCredentials(deps.readFile, deps.home)
  return mouserClient(credentials, deps.fetch, deps.today)
}

/** The one client this tool can build today. Refuses (never throws) when Mouser's
 * credentials cannot be read, naming the underlying reason. */
function buildClient(supplier: SupplierName, deps: PartsDeps, error: (line: string) => void): SupplierClient | null {
  if (supplier !== "Mouser") {
    error(DIGIKEY_NOT_BUILT)
    return null
  }
  try {
    return buildMouserClient(deps)
  } catch (caught) {
    error(errorMessage(caught))
    return null
  }
}

/** US-locale currency, but with enough precision to keep sub-cent unit prices (routine for
 * passives bought by the thousand, e.g. $0.018) distinct from one another - the default
 * two-decimal currency format would round several of a resistor's real price breaks down
 * to the same "$0.02" and hide the very comparison this tool exists to show. */
function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

function formatOffer(offer: SupplierOffer): string[] {
  const lines = [
    `${offer.supplier} ${offer.sku} - ${offer.mpn} (${offer.manufacturer})`,
    `  ${offer.description}`,
    `  stock: ${offer.stock !== undefined ? offer.stock : "not stated"}`,
  ]
  if (offer.breaks.length === 0) {
    lines.push("  price: not listed")
  } else if (offer.currency === undefined) {
    throw new Error(
      `${offer.supplier} ${offer.sku} has price breaks but no currency; cannot format its price.`,
    )
  } else {
    const currency = offer.currency
    for (const brk of offer.breaks) {
      lines.push(`  ${brk.quantity}+: ${formatMoney(brk.unitPrice, currency)}`)
    }
  }
  lines.push(`  url: ${offer.url}`)
  lines.push(`  datasheet: ${offer.datasheetUrl ?? "(none listed)"}`)
  return lines
}

async function queryEach(
  suppliers: readonly SupplierName[],
  deps: PartsDeps,
  error: (line: string) => void,
  run: (client: SupplierClient) => Promise<readonly SupplierOffer[]>,
): Promise<readonly { readonly supplier: SupplierName; readonly offers: readonly SupplierOffer[] }[] | null> {
  const results: { supplier: SupplierName; offers: readonly SupplierOffer[] }[] = []
  for (const supplier of suppliers) {
    const client = buildClient(supplier, deps, error)
    if (client === null) return null
    results.push({ supplier, offers: await run(client) })
  }
  return results
}

function printOffers(
  results: readonly { readonly supplier: SupplierName; readonly offers: readonly SupplierOffer[] }[],
  subject: string,
  json: boolean,
  log: (line: string) => void,
): void {
  if (json) {
    log(JSON.stringify(results.flatMap((result) => result.offers), null, 2))
    return
  }
  for (const { supplier, offers } of results) {
    if (offers.length === 0) {
      log(`${supplier}: no exact match for ${subject}.`)
      continue
    }
    for (const offer of offers) for (const line of formatOffer(offer)) log(line)
  }
}

async function dispatchLookup(
  args: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parseArgs(args, { supplier: true, json: true }, error)
  if (parsed === null) return 1
  const mpn = parsed.positional[0]
  if (mpn === undefined) {
    error('"lookup" needs an mpn: bun run parts lookup <mpn>.')
    return 1
  }
  if (parsed.positional.length > 1) {
    error(`unknown extra argument "${parsed.positional[1]}" for "lookup".`)
    return 1
  }
  const suppliers = resolveSuppliers(parsed.supplier, error)
  if (suppliers === null) return 1
  const results = await queryEach(suppliers, deps, error, (client) => client.lookup(mpn))
  if (results === null) return 1
  printOffers(results, `"${mpn}"`, parsed.json, log)
  return 0
}

async function dispatchSearch(
  args: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parseArgs(args, { supplier: true, json: true, limit: true }, error)
  if (parsed === null) return 1
  if (parsed.positional.length === 0) {
    error('"search" needs at least one keyword: bun run parts search <keywords...>.')
    return 1
  }
  const keywords = parsed.positional.join(" ")
  const limit = parsed.limit ?? 10
  const suppliers = resolveSuppliers(parsed.supplier, error)
  if (suppliers === null) return 1
  const results = await queryEach(suppliers, deps, error, (client) => client.search(keywords, limit))
  if (results === null) return 1
  printOffers(results, `"${keywords}"`, parsed.json, log)
  return 0
}

async function dispatchSource(
  args: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parseArgs(args, { supplier: true, use: true }, error)
  if (parsed === null) return 1
  const mpn = parsed.positional[0]
  if (mpn === undefined) {
    error('"source" needs an mpn: bun run parts source <mpn> --supplier mouser|digikey --use <use>.')
    return 1
  }
  if (parsed.supplier === undefined) {
    error('"source" needs --supplier mouser|digikey.')
    return 1
  }
  if (parsed.use === undefined || !isSourceUse(parsed.use)) {
    error(`"source" needs --use, one of ${SOURCE_USE_LIST.join(", ")} (got ${JSON.stringify(parsed.use)}).`)
    return 1
  }
  const suppliers = resolveSuppliers(parsed.supplier, error)
  if (suppliers === null) return 1
  const client = buildClient(suppliers[0], deps, error)
  if (client === null) return 1

  const offers = await client.lookup(mpn)
  if (offers.length === 0) {
    error(`${suppliers[0]}: no exact match for "${mpn}".`)
    return 1
  }
  if (offers.length > 1) {
    error(`${suppliers[0]}: "${mpn}" matched more than one listing; exactly one exact match is required:`)
    for (const offer of offers) error(`  ${offer.sku} - ${offer.description}`)
    return 1
  }
  try {
    log(JSON.stringify(offerToSource(offers[0], parsed.use), null, 2))
    return 0
  } catch (caught) {
    error(errorMessage(caught))
    return 1
  }
}

function formatReport(report: SourceReport): string {
  const where = `${report.id} sources[${report.sourceIndex}] ${report.supplier}` + (report.sku !== undefined ? ` (${report.sku})` : "")
  switch (report.outcome.status) {
    case "updated":
      return `${where}: updated ${formatMoney(report.outcome.oldUnitPrice, "USD")} -> ${formatMoney(report.outcome.newUnitPrice, "USD")}`
    case "unchanged":
      return `${where}: unchanged`
    case "not-listed":
      return `${where}: no longer listed`
    case "no-price":
      return `${where}: listed without a price`
    case "not-refreshed":
      return `${where}: not refreshed: ${report.outcome.reason}`
  }
}

async function dispatchRefresh(
  args: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parseArgs(args, {}, error)
  if (parsed === null) return 1
  const ids = parsed.positional

  const clients: SupplierClients = {
    "Digi-Key": { kind: "not-built", message: "Digi-Key client not built" },
  }
  try {
    clients.Mouser = { kind: "ready", client: buildMouserClient(deps) }
  } catch (caught) {
    clients.Mouser = { kind: "missing-credentials", message: errorMessage(caught) }
  }

  const dir = path.join(deps.repoRoot, "parts")
  try {
    const result = await refreshCatalog(dir, ids, clients, deps.readFile, deps.writeFile)
    for (const report of result.reports) log(formatReport(report))
    log(result.writtenIds.length === 0 ? "no files changed." : `wrote: ${result.writtenIds.join(", ")}`)
    return 0
  } catch (caught) {
    error(errorMessage(caught))
    return 1
  }
}

export async function runCli(argv: readonly string[], opts: PartsCliOptions = {}): Promise<number> {
  const log = opts.log ?? ((line: string) => console.log(line))
  const error = opts.error ?? ((line: string) => console.error(line))
  const deps = defaultDeps(opts)

  const verb = argv[0]
  if (verb === undefined || verb === "--help" || verb === "-h" || verb === "help") {
    log(USAGE)
    return 0
  }
  if (verb === "lookup") return dispatchLookup(argv.slice(1), deps, log, error)
  if (verb === "search") return dispatchSearch(argv.slice(1), deps, log, error)
  if (verb === "source") return dispatchSource(argv.slice(1), deps, log, error)
  if (verb === "refresh") return dispatchRefresh(argv.slice(1), deps, log, error)

  error(`unknown verb "${verb}". Run with --help to see the verbs.`)
  return 1
}

if (isMain(import.meta.url)) {
  process.exit(await runCli(process.argv.slice(2)))
}
