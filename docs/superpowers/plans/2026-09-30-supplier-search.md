# Supplier Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `bun run parts lookup|search|source|refresh` over the official Mouser and Digi-Key search services, so the part researcher can read prices and supplier part numbers, and catalog prices can be refreshed in place.

**Architecture:** `tools/suppliers/` holds a `SupplierClient` interface, a credentials reader, and one client per supplier with injected HTTP; `tools/cli/parts.ts` is the command. Offers convert to the parts catalog's `Source` shape (`tools/bom/catalog.ts`).

**Tech Stack:** TypeScript on Bun, `fetch` (injected), the existing `tools/bom/catalog.ts`.

**Spec:** `docs/superpowers/specs/2026-09-30-supplier-search-design.md` (approved). Its Decisions table binds this plan.

## Decisions (from the spec; binding)

- Official services only: Mouser Search API v1, Digi-Key Product Information API v4. No browser automation.
- Supplier data is evidence for what it states (SKU, price breaks, stock, links, listed parameters); dimensions still from the datasheet unless listed.
- Keys: `~/.config/mouser/mouser-credentials.txt` (one line: the key); `~/.config/digikey/digikey-credentials.txt` (two lines: client ID, client secret). Exactly one place each; no environment-variable alternative. Wrong shape refused naming the file and shape. Keys are never printed or logged, and never appear in errors, fixtures or commits.
- A missing key refuses with the file, its shape and the registration page; no supplier silently skipped.
- `refresh` rewrites only Mouser/Digi-Key sources' price breaks and `checked`, keeping `pack` marks on quantities that still exist; reports parts no longer listed; never changes the chosen part.
- `lookup` never returns a near match as the part: exact manufacturer-part-number match only (case-insensitive, ignoring surrounding whitespace).
- US dollars, US locale.

## Global Constraints

- Imports are explicit relative paths with the `.ts` extension.
- No fallbacks, no mock data outside tests; every unhandled case throws an error naming the thing, the observed state and the fix.
- Never bypass typing: no `any`, no `as Type` assertions, no `@ts-ignore`. Parse JSON responses with guards (`tools/perfboard/guards.ts` style).
- Files stay under 300-500 lines; split by responsibility.
- `bun test` and `bun run typecheck` pass before every commit; `bun test` never touches the network or the real key files. Commit and push after each task. No AI attribution of any kind in commit messages.
- Never put `#` inside a Bash heredoc or multi-line quoted argument; commit messages via files and `git commit -F`. Never use `sed` to write files.
- Branch `feature/transistor-preamp`. Never `git stash`, never `--no-verify`.

---

### Task 1: Credentials, the interface, and the Mouser client

**Files:** create `tools/suppliers/types.ts`, `tools/suppliers/credentials.ts`, `tools/suppliers/mouser.ts`, `tools/suppliers/http.ts` (the injected `fetch` type and a JSON-response helper that turns non-2xx into an error naming supplier, status and the service's message); tests `tests/suppliers/credentials.test.ts`, `tests/suppliers/mouser.test.ts`, fixtures `tests/fixtures/suppliers/mouser-*.json`.

**Interfaces produced:**

```ts
// tools/suppliers/types.ts
export type SupplierName = "Mouser" | "Digi-Key"
export interface SupplierOffer {
  readonly supplier: SupplierName; readonly sku: string
  readonly manufacturer: string; readonly mpn: string; readonly description: string
  readonly url: string; readonly datasheetUrl?: string; readonly stock: number
  readonly currency: string
  readonly breaks: readonly { readonly quantity: number; readonly unitPrice: number }[]   // ascending
  readonly parameters: Readonly<Record<string, string>>
  readonly fetched: string   // YYYY-MM-DD
}
export interface SupplierClient {
  readonly name: SupplierName
  lookup(mpn: string): Promise<readonly SupplierOffer[]>     // exact mpn matches only; [] when none
  lookupSku(sku: string): Promise<SupplierOffer | undefined> // by the supplier's own part number (for refresh)
  search(keywords: string, limit: number): Promise<readonly SupplierOffer[]>
}
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ status: number; text(): Promise<string> }>

// tools/suppliers/credentials.ts
export interface MouserCredentials { readonly apiKey: string }
export interface DigikeyCredentials { readonly clientId: string; readonly clientSecret: string }
export function readMouserCredentials(readFile: (path: string) => string, home: string): MouserCredentials
export function readDigikeyCredentials(readFile: (path: string) => string, home: string): DigikeyCredentials

// tools/suppliers/mouser.ts
export function mouserClient(credentials: MouserCredentials, fetch: FetchLike, today: () => string): SupplierClient
```

- [ ] **Step 1 (tests first): credentials.** Missing file refused naming the path, the shape and the registration page (Mouser: the API Hub in a Mouser account; Digi-Key: developer.digikey.com); wrong line count refused; whitespace trimmed. Tests use an injected `readFile`, never the real files. No error message contains the key text.
- [ ] **Step 2: Record real Mouser responses.** With the operator's key, make one part-number request (`MFR-25FBF52-100K`) and one keyword request (`10uF 35V radial`, 5 records) with a throwaway script in the scratchpad (not the repo). Save the response bodies as fixtures with any echoed key removed. Endpoints: `POST https://api.mouser.com/api/v1/search/partnumber?apiKey=<key>` with body `{"SearchByPartRequest":{"mouserPartNumber":"<mpn>","partSearchOptions":"Exact"}}`; `POST https://api.mouser.com/api/v1/search/keyword?apiKey=<key>` with body `{"SearchByKeywordRequest":{"keyword":"<words>","records":<n>,"startingRecord":0}}`. Read the real response and map from it; the spec's field list is the target, not a guess about Mouser's field names.
- [ ] **Step 3 (tests first): parse.** From the fixtures: SKU (`MouserPartNumber`), manufacturer, MPN, description, product URL, datasheet URL, stock (a number, from the in-stock figure; a part with no stock is 0, not absent), currency, price breaks with prices parsed from Mouser's price strings (currency symbol and thousands separators removed; a price that does not parse throws naming it), parameters from the product attributes. `lookup` filters to exact MPN matches; `lookupSku` finds by Mouser part number. The response's `Errors` array non-empty is an error naming Mouser and the message. A key is never placed in an error (the request URL carries it; errors name the endpoint path only).
- [ ] **Step 4:** `bun test && bun run typecheck`; commit and push.

### Task 2: The Digi-Key client (runs last, once the operator has Digi-Key credentials)

This task is gated on credentials. A Digi-Key application (developer.digikey.com) gives both sandbox and production credentials, and Digi-Key's sandbox returns real response structures, so the parser is built from recorded responses exactly as Mouser's is. Nothing about Digi-Key's response shape is written from the published schema alone. Until the operator registers, this task is not started, the `parts` command offers Mouser only, and `--supplier digikey` refuses with "the Digi-Key client is not built yet; register at developer.digikey.com and run the plan's Task 2". The no-silent-skip rule applies to the suppliers the tool has.

**Files:** create `tools/suppliers/digikey.ts`; tests `tests/suppliers/digikey.test.ts`, fixtures `tests/fixtures/suppliers/digikey-*.json` (recorded, with credentials and tokens removed).

**Interface produced:** `digikeyClient(credentials: DigikeyCredentials, fetch: FetchLike, today: () => string, now: () => number): SupplierClient`, where `now()` returns milliseconds and drives token expiry.

- [ ] **Step 0: Record real responses** from the sandbox (or production) with a throwaway scratchpad script: a token, one product-details response for a part with at least two packaging variations (e.g. a resistor sold as cut tape and as tape and reel), and one keyword search. Map from what they contain.
- [ ] **Step 1 (tests first):** OAuth2 client-credentials token (`POST https://api.digikey.com/v1/oauth2/token`, form body `client_id`, `client_secret`, `grant_type=client_credentials`), cached until `expires_in - 30` seconds after it was issued, by the injected `now()`. Test: first request fetches a token; a second at +5 min reuses it; a third at +10 min fetches a new one. Product details `GET https://api.digikey.com/products/v4/search/{productNumber}/productdetails`; keyword search `POST https://api.digikey.com/products/v4/search/keyword` with `{"Keywords": ..., "Limit": n, "Offset": 0}`; headers `X-DIGIKEY-Client-Id`, `Authorization: Bearer <token>`, `X-DIGIKEY-Locale-Site: US`, `X-DIGIKEY-Locale-Language: en`, `X-DIGIKEY-Locale-Currency: USD`. Each product variation (cut tape, bulk, tape and reel ...) becomes its own offer with its own Digi-Key product number and standard pricing breaks; parameters from the product's parameter list. Exact-MPN filtering as for Mouser. Test, on the multi-variation fixture: the same manufacturer MPN yields separate offers with different Digi-Key SKUs, different price breaks and their packaging kept apart; `lookupSku` of the cut-tape SKU returns the cut-tape pricing, never the reel's.
- [ ] **Step 2:** Remove the "not built yet" refusal from `parts`; update the sourcing notes and the researcher file to use Digi-Key too.
- [ ] **Step 3:** `bun test && bun run typecheck`; commit and push.

**Decisions made while doing this task (recorded in the spec's Decisions table):** the
credentials file is a YAML mapping (`clientID`, `clientSecret`) read with `Bun.YAML`
(operator); each product variation is its own offer, with a `packaging` text that also names
a Digi-Key reeling fee or a Marketplace seller; `lookup` uses keyword search filtered to
exact part-number matches, not product details, because the recorded product-details
response for 2N3904 is a 404 "Duplicate Products found" where keyword search lists every
maker; `lookupSku` uses product details. The refresh module's "not-built" client result,
which existed only for the missing Digi-Key client, is removed. After review (fix round 1,
controller rulings): `lookup` pages through every keyword page `ProductsCount` reports and
refuses past a page limit; `lookupSku` treats only the recorded "Requested Product ... Not
Found" 404 as not listed; `source` refuses Digi-Reel and Marketplace listings.

### Task 3: The `parts` command

**Files:** create `tools/suppliers/source.ts` (offer -> catalog `Source`), `tools/suppliers/refresh.ts`, `tools/cli/parts.ts`; modify `package.json` (`"parts": "bun run tools/cli/parts.ts"`); tests `tests/suppliers/source.test.ts`, `tests/suppliers/refresh.test.ts`, `tests/cli/parts.test.ts`.

- [ ] **Step 1 (tests first): `source`.** `offerToSource(offer, use)` returns a catalog `Source` (supplier, url, sku, currency, breaks without `pack`, `checked` = offer's `fetched`, use) that passes `tools/bom/catalog.ts`'s source validation (test it through `parseCatalogEntry` with a minimal valid entry).
- [ ] **Step 2 (tests first): `refresh`.** `refreshCatalog(dir, ids, clients, readFile, writeFile)`, in two phases. Phase one, with no writes: read and parse every selected entry; determine every supplier needed and refuse if any has no client or credentials; perform every lookup; build and validate (`parseCatalogEntry`) every rewritten entry in memory. Phase two, only if all of phase one succeeded: write the changed files. Critical test: given two entries, if the second's lookup throws (or its rewritten entry fails validation), `writeFile` is never called for either. For each entry's Mouser and Digi-Key sources, `lookupSku(sku)`; rewrite that source's `breaks` (keeping `pack: true` on a break whose quantity still exists) and `checked`; leave every other field and source byte-identical in meaning; write JSON with two-space indentation and a trailing newline; report per source: updated (with old -> new unit price at the smallest break), unchanged, or no longer listed (not removed). A source for a supplier whose credentials are missing refuses the whole run before writing anything. The rewritten entry passes `parseCatalogEntry`.
- [ ] **Step 3 (tests first): CLI.** Verbs `lookup <mpn> [--supplier mouser|digikey] [--json]`, `search <keywords...> [--supplier ...] [--limit n] [--json]` (default limit 10), `source <mpn> --supplier mouser|digikey --use <use>` (exactly one exact match required, else refuse listing the matches), `refresh [<id>...]` (catalog at `<repo>/parts/`). Without `--supplier`, `lookup` and `search` query every supplier the tool has (Mouser alone until Task 2 is done) and refuse if any of their key files is missing, naming it (no silent skip); `--supplier` narrows to one. Until Task 2, `--supplier digikey` gives the "not built yet" refusal. Readable text output lists, per offer: supplier, SKU, MPN, manufacturer, stock, price at each break, URL, datasheet URL. Clients, credentials reading, clock and filesystem are injected; tests use fakes.
- [ ] **Step 4:** Live check by hand (not in `bun test`): `bun run parts lookup MFR-25FBF52-100K --supplier mouser` prints the Yageo part with price breaks. Record the output summary in the report.
- [ ] **Step 5:** `bun test && bun run typecheck`; commit and push.

### Task 4: The researcher uses the tool

**Files:** modify `.claude/agents/part-researcher.md`, `docs/parts/sourcing-notes.md`, `README.md` (usage).

- [ ] **Step 1:** The agent file: search and price through `bun run parts search|lookup` and write sources with `bun run parts source`; cite the service in evidence (`url`: product URL; `note`: "Mouser Search API, <date>: ..."); datasheets still fetched directly for dimensions; never fetch distributor web pages. While Digi-Key has no key, use `--supplier mouser` and note the missing Digi-Key source in the report.
- [ ] **Step 2:** Sourcing notes: where the key files go and their shape; `bun run parts refresh` for stale prices; amend the fetch-blocking lesson to "use the parts tool"; that Digi-Key sources wait for the plan's Task 2.
- [ ] **Step 3:** README usage for `bun run parts`. Commit and push.
- [ ] **Step 4:** Resume the parts-list plan's Task 7 (`docs/superpowers/plans/2026-09-30-bom.md`): fill the staged board's list with the researcher, Mouser sources first.
