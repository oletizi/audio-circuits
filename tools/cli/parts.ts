/**
 * `bun run parts <verb>` - Mouser and Digi-Key lookups for the parts researcher, and
 * catalog price refresh. Run from anywhere in the repository (`refresh`'s catalog
 * directory is resolved from the repo root, not the process's own directory).
 *
 * Clients, credentials reading, the clock and the filesystem are all injected
 * (`PartsCliOptions`), so tests never touch the network, the real key files or the real
 * catalog.
 *
 * Every verb catches its own errors and exits 1 with a one-line message; nothing leaves
 * `runCli` as an uncaught rejection. No key, secret or token reaches that message: the HTTP
 * layer (tools/suppliers/http.ts) names only the supplier and endpoint path and redacts
 * the Digi-Key credentials and token from any quoted body, and `safeMessage` below also
 * redacts any `apiKey=` query value or bearer token, should some other error carry one.
 *
 * Without `--supplier`, `lookup` and `search` query both Mouser and Digi-Key. Every client
 * a verb needs is built before any request is sent, so a missing key file refuses the verb
 * up front, naming the file, rather than after the other supplier has answered.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { formatOffer, formatReport } from "./parts-format.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { readDigikeyCredentials, readMouserCredentials } from "../suppliers/credentials.ts"
import { digikeyClient } from "../suppliers/digikey.ts"
import { mouserClient } from "../suppliers/mouser.ts"
import { offerToSource } from "../suppliers/source.ts"
import { refreshCatalog, type SupplierClients } from "../suppliers/refresh.ts"
import type { FetchLike, SupplierClient, SupplierName, SupplierOffer } from "../suppliers/types.ts"
import { isSourceUse, SOURCE_USE_LIST, type SourceUse } from "../bom/catalog.ts"
import { localDate } from "../bom/local-date.ts"

/** Every supplier this tool has a client for, in the order they are queried. */
const SUPPORTED_SUPPLIERS: readonly SupplierName[] = ["Mouser", "Digi-Key"]

const SUPPLIER_NAME_BY_FLAG: Record<string, SupplierName> = { mouser: "Mouser", digikey: "Digi-Key" }

/** An error's message, with the value of any `apiKey=` query parameter and any bearer token
 * redacted - a second guard behind the HTTP layer's own, so no error path can print a key. */
function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/(apiKey=)[^&\s"'<>]*/gi, "$1<redacted>")
    .replace(/(Bearer\s+)[^\s"'<>]+/gi, "$1<redacted>")
}

export interface PartsDeps {
  readonly repoRoot: string
  readonly home: string
  readonly readFile: (filePath: string) => string
  readonly writeFile: (filePath: string, contents: string) => void
  readonly fetch: FetchLike
  readonly today: () => string
  /** Milliseconds; drives the Digi-Key token's expiry. */
  readonly now: () => number
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
  readonly now?: () => number
}

const USAGE = [
  "parts - Mouser and Digi-Key lookups for the parts researcher, and catalog price refresh.",
  "",
  "Usage: bun run parts <verb> [args] [flags]",
  "",
  "Verbs:",
  "  lookup <mpn> [--supplier mouser|digikey] [--json]",
  "                          the exact part at Mouser and Digi-Key (or the one named),",
  "                          one offer per listing (Digi-Key: per packaging), with its",
  "                          price breaks and parameters; refuses if a needed key file",
  "                          is missing.",
  "  search <keywords...> [--supplier ...] [--limit n] [--json]",
  "                          candidate parts for a requirement (default limit 10).",
  "  source <mpn> --supplier mouser|digikey --use <use> [--sku <supplier part number>]",
  "                          print a catalog Source for the one exact match, ready to",
  "                          paste into an entry; refuses, listing the matches, unless",
  "                          exactly one exists - or --sku names the listing to use.",
  "                          <use>: " + SOURCE_USE_LIST.join(", ") + ".",
  "  refresh [<id>...]      re-read every Mouser/Digi-Key source of the named catalog",
  "                          entries (all of them, when none are named) and rewrite their",
  "                          price breaks and checked date in place.",
  "",
  "Flags:",
  "  --supplier mouser|digikey   narrow to one supplier (lookup, search, source).",
  "  --json                      print offers as JSON instead of readable text.",
  "  --limit n                   search: the maximum number of results (default 10).",
  "  --use <use>                 source: which SourceUse to record.",
  "  --sku <part number>         source: the supplier's own part number of the listing",
  "                              to record, when the mpn matches more than one.",
  "",
  "Exit codes:",
  "  0  the verb completed (refresh: even when nothing changed)",
  "  1  a bad argument, a missing key file, a supplier or network refusal, or no/too many",
  "     exact matches",
].join("\n")

function defaultDeps(opts: PartsCliOptions): PartsDeps {
  return {
    repoRoot: opts.repoRoot ?? moduleRepoRoot(),
    home: opts.home ?? os.homedir(),
    readFile: opts.readFile ?? ((filePath: string) => fs.readFileSync(filePath, "utf8")),
    writeFile: opts.writeFile ?? ((filePath: string, contents: string) => fs.writeFileSync(filePath, contents)),
    fetch: opts.fetch ?? ((url: string, init) => fetch(url, init)),
    today: opts.today ?? (() => localDate(new Date())),
    now: opts.now ?? (() => Date.now()),
  }
}

interface ParsedArgs {
  readonly positional: readonly string[]
  readonly supplier?: string
  readonly json: boolean
  readonly limit?: number
  readonly use?: string
  readonly sku?: string
}

interface AllowedFlags {
  readonly supplier?: boolean
  readonly json?: boolean
  readonly limit?: boolean
  readonly use?: boolean
  readonly sku?: boolean
}

type ValueFlag = "supplier" | "use" | "sku"

const VALUE_FLAG_HINT: Record<ValueFlag, string> = {
  supplier: '"mouser" or "digikey"',
  use: `one of ${SOURCE_USE_LIST.join(", ")}`,
  sku: "the supplier's own part number",
}

function parseArgs(args: readonly string[], allowed: AllowedFlags, error: (line: string) => void): ParsedArgs | null {
  const positional: string[] = []
  const values: Partial<Record<ValueFlag, string>> = {}
  let json = false
  let limit: number | undefined

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const flag = arg === "--supplier" ? "supplier" : arg === "--use" ? "use" : arg === "--sku" ? "sku" : undefined
    if (flag !== undefined && allowed[flag] === true) {
      const value = args[i + 1]
      if (value === undefined || value.startsWith("--")) {
        error(`--${flag} needs a value: ${VALUE_FLAG_HINT[flag]}.`)
        return null
      }
      values[flag] = value
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
    if (arg !== undefined && arg.startsWith("--")) {
      error(`unknown flag "${arg}" for this verb. Run with --help to see the flags this verb accepts.`)
      return null
    }
    if (arg !== undefined) positional.push(arg)
  }
  return { positional, supplier: values.supplier, json, limit, use: values.use, sku: values.sku }
}

/** `--supplier`'s value to the list of suppliers a verb should query: every supplier the
 * tool has, when none was given; refuses naming the flag's value when it names neither. */
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
  return [name]
}

/** Throws naming the key file when that supplier's credentials cannot be read. */
function buildSupplierClient(supplier: SupplierName, deps: PartsDeps): SupplierClient {
  if (supplier === "Mouser") {
    return mouserClient(readMouserCredentials(deps.readFile, deps.home), deps.fetch, deps.today)
  }
  return digikeyClient(readDigikeyCredentials(deps.readFile, deps.home), deps.fetch, deps.today, deps.now)
}

/** Refuses (never throws) when a supplier's credentials cannot be read, naming the reason. */
function buildClient(supplier: SupplierName, deps: PartsDeps, error: (line: string) => void): SupplierClient | null {
  try {
    return buildSupplierClient(supplier, deps)
  } catch (caught) {
    error(safeMessage(caught))
    return null
  }
}

type SupplierResults = readonly { readonly supplier: SupplierName; readonly offers: readonly SupplierOffer[] }[]

/** Builds every supplier's client first - so a missing key file refuses before any request
 * - then runs `run` against each; a supplier or network refusal is printed (the HTTP layer
 * names only supplier and endpoint path) and ends the verb with null. */
async function queryEach(
  suppliers: readonly SupplierName[],
  deps: PartsDeps,
  error: (line: string) => void,
  run: (client: SupplierClient) => Promise<readonly SupplierOffer[]>,
): Promise<SupplierResults | null> {
  const clients: SupplierClient[] = []
  for (const supplier of suppliers) {
    const client = buildClient(supplier, deps, error)
    if (client === null) return null
    clients.push(client)
  }
  const results: { supplier: SupplierName; offers: readonly SupplierOffer[] }[] = []
  for (const client of clients) {
    const supplier = client.name
    try {
      results.push({ supplier, offers: await run(client) })
    } catch (caught) {
      error(safeMessage(caught))
      return null
    }
  }
  return results
}

function printOffers(results: SupplierResults, subject: string, json: boolean, log: (line: string) => void): void {
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

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** The one offer `source` records: the listing `--sku` names (which must carry `mpn`), or
 * else the one exact mpn match. Throws naming the supplier and the choices otherwise. */
async function chooseOffer(client: SupplierClient, mpn: string, sku: string | undefined): Promise<SupplierOffer> {
  if (sku !== undefined) {
    const offer = await client.lookupSku(sku)
    if (offer === undefined) throw new Error(`${client.name}: no listing with part number "${sku}".`)
    if (!sameText(offer.mpn, mpn)) {
      throw new Error(
        `${client.name} ${offer.sku} is mpn "${offer.mpn}", not "${mpn}". Check --sku against the ` +
          `matches "bun run parts lookup ${mpn}" lists.`,
      )
    }
    return offer
  }
  const offers = await client.lookup(mpn)
  if (offers.length === 0) throw new Error(`${client.name}: no exact match for "${mpn}".`)
  if (offers.length > 1) {
    const listing = offers
      .map((offer) => `  ${offer.sku} - ${offer.description}` + (offer.packaging !== undefined ? ` [${offer.packaging}]` : ""))
      .join("\n")
    throw new Error(
      `${client.name}: "${mpn}" matched more than one listing; exactly one exact match is required, ` +
        `or name one with --sku:\n${listing}`,
    )
  }
  return offers[0]
}

async function dispatchSource(
  args: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parseArgs(args, { supplier: true, use: true, sku: true }, error)
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
  const use = parsed.use
  if (use === undefined || !isSourceUse(use)) {
    error(`"source" needs --use, one of ${SOURCE_USE_LIST.join(", ")} (got ${JSON.stringify(use)}).`)
    return 1
  }
  const suppliers = resolveSuppliers(parsed.supplier, error)
  if (suppliers === null) return 1
  const client = buildClient(suppliers[0], deps, error)
  if (client === null) return 1
  return printSource(client, mpn, parsed.sku, use, log, error)
}

async function printSource(
  client: SupplierClient,
  mpn: string,
  sku: string | undefined,
  use: SourceUse,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  try {
    const offer = await chooseOffer(client, mpn, sku)
    log(JSON.stringify(offerToSource(offer, use), null, 2))
    return 0
  } catch (caught) {
    for (const line of safeMessage(caught).split("\n")) error(line)
    return 1
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

  // A missing key file refuses the run only when a selected entry has a source from that
  // supplier (tools/suppliers/refresh.ts), so both are resolved here and neither is required.
  const clients: SupplierClients = {}
  for (const supplier of SUPPORTED_SUPPLIERS) {
    try {
      clients[supplier] = { kind: "ready", client: buildSupplierClient(supplier, deps) }
    } catch (caught) {
      clients[supplier] = { kind: "missing-credentials", message: safeMessage(caught) }
    }
  }

  const dir = path.join(deps.repoRoot, "parts")
  try {
    const result = await refreshCatalog(dir, ids, clients, deps.readFile, deps.writeFile)
    for (const report of result.reports) log(formatReport(report))
    log(result.writtenIds.length === 0 ? "no files changed." : `wrote: ${result.writtenIds.join(", ")}`)
    return 0
  } catch (caught) {
    error(safeMessage(caught))
    return 1
  }
}

async function dispatch(
  argv: readonly string[],
  deps: PartsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
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

export async function runCli(argv: readonly string[], opts: PartsCliOptions = {}): Promise<number> {
  const log = opts.log ?? ((line: string) => console.log(line))
  const error = opts.error ?? ((line: string) => console.error(line))
  try {
    return await dispatch(argv, defaultDeps(opts), log, error)
  } catch (caught) {
    // Anything a verb did not catch itself (formatting an offer, say) still ends as one
    // line and exit 1, never as an uncaught rejection whose trace could carry a URL.
    error(safeMessage(caught))
    return 1
  }
}

if (isMain(import.meta.url)) {
  process.exit(await runCli(process.argv.slice(2)))
}
