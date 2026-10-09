---
title: Supplier search - Mouser and Digi-Key lookups for the parts researcher, and price refresh
date: 2026-09-30
status: Implemented for Mouser; Digi-Key waits for the operator's credentials (plan Task 2)
---

# Supplier search

## Purpose

The parts-list design (`2026-09-30-bom-design.md`) left the Mouser and
Digi-Key search for later. It is needed now: every distributor blocks
automated page fetches from this environment (Digi-Key, Tayda and Newark
answer 403; Mouser serves a bot check), so the part researcher cannot read a
price or a supplier part number, and correctly writes nothing. Both Mouser
and Digi-Key offer official, free search services for exactly this. This
design adds a small command-line tool over them that the researcher calls,
and a command that refreshes the prices already in the catalog.

## Decisions

| Decision | By | Why |
|---|---|---|
| Use the Mouser Search API and the Digi-Key Product Information API, not browser automation of their sites | Operator (option 1 of 3) | Official, stable, within the suppliers' terms; scraping breaks when bot checks change |
| The supplier data counts as evidence for what it states: supplier part number, price breaks, stock, product and datasheet links, and the parametric specs the supplier lists | Designer, accepted with this design | It is the supplier's own record of the part, read at a known time; the evidence note names the service and the date |
| Physical dimensions (body size, lead spacing) still need the datasheet unless the supplier's parameters state them | Designer, accepted with this design | Supplier parametrics often omit or round dimensions; the footprint match depends on them |
| Keys live outside the repository, one file per supplier under `~/.config/<supplier>/`, each read from exactly one place (no environment-variable alternative) | Operator (the Mouser key is already at `~/.config/mouser/mouser-credentials.txt`) | Keys never reach git; one place per key means no question of which one was used |
| A missing key refuses with the variable's name and where to get it; no supplier is silently skipped | Designer, accepted with this design | The no-fallback rule |
| A separate command refreshes the prices of catalog entries in place; it updates price breaks, stock-free fields and the checked date only, never which part was chosen | Designer, accepted with this design | Prices go stale after 45 days; refreshing is mechanical and should not need a research session |
| Tayda, specialist shops and Amazon stay manual links | Operator | They offer no such service |

## Keys (the operator registers these)

- **Mouser:** a Search API key, from the API Hub in a Mouser account, in
  `~/.config/mouser/mouser-credentials.txt`: one line, the key (in place).
- **Digi-Key:** an application on developer.digikey.com with the Product
  Information API, production environment, which gives a client ID and
  secret, in `~/.config/digikey/digikey-credentials.txt`: two labelled
  lines, `clientID: <client id>` and `clientSecret: <client secret>` (the
  operator's format). Digi-Key's API is OAuth2; the tool uses the
  client-credentials flow, so the app's required callback URL (registered as
  `https://localhost`) is never called.

Each file must hold exactly that shape (surrounding whitespace ignored);
anything else is refused naming the file and the expected shape. The tool
never prints a key. `docs/parts/sourcing-notes.md` says where the files go.

## The tool

`bun run parts <verb>` (a new CLI entry, `tools/cli/parts.ts`), run from
anywhere in the repository:

- `parts lookup <mpn> [--supplier mouser|digikey]` - the exact part at each
  supplier: supplier part number, manufacturer and part number, description,
  product URL, datasheet URL, stock, currency, every price break, and the
  supplier's listed parameters. Printed as readable text, or JSON with
  `--json`.
- `parts search <keywords...> [--supplier ...] [--limit n]` - candidate parts
  for a requirement (e.g. `parts search 10uF 35V radial 5mm`), each with the
  same fields, so the researcher can compare price and fit.
- `parts source <mpn> --supplier mouser|digikey --use <use>` - prints a
  catalog `Source` object ready to paste into an entry: supplier, URL,
  supplier part number, currency, the price breaks, today's date as
  `checked`, and the use. When the mpn matches more than one listing, it refuses, listing them,
  unless `--sku <supplier part number>` names the one to record (which must
  carry that mpn).
- `parts refresh [<catalog id>...]` - for each named entry (all when none
  named), re-reads every Mouser and Digi-Key source by its supplier part
  number and rewrites that source's price breaks and `checked` date. Prints what
  changed. Other sources and every other field are untouched. A part the
  supplier no longer lists is reported, not removed.

Supplier clients sit behind one interface (`tools/suppliers/`), so a third
supplier with a service could be added later without touching the verbs:

```ts
interface SupplierOffer {
  supplier: "Mouser" | "Digi-Key"; sku: string; manufacturer: string; mpn: string
  description: string; url: string; datasheetUrl?: string; stock: number
  currency: string; breaks: { quantity: number; unitPrice: number }[]
  parameters: Record<string, string>; fetched: string   // YYYY-MM-DD
}
interface SupplierClient {
  lookup(mpn: string): Promise<SupplierOffer[]>
  search(keywords: string, limit: number): Promise<SupplierOffer[]>
}
```

Currency is US dollars and the locale US for both.

## The researcher

`.claude/agents/part-researcher.md` changes to: use `parts search` and
`parts lookup` for candidates and prices, `parts source` to write sources,
and cite the service in evidence (`url`: the product URL; `note`: "Mouser
Search API, 2026-09-30: price breaks and stock" or the parameters it
confirmed). Datasheets are still fetched directly for dimensions. The two
lessons the first attempt recorded in the sourcing notes stay; the blocking
one gains "use the parts tool".

## Errors

- Missing key file: names the file, its expected shape and the registration
  page.
- Refused key, rate limit, or a service error: names the supplier, the HTTP
  status and the service's own message; nothing is written.
- A request that cannot be sent at all (DNS, connection, TLS): names the
  supplier, the endpoint path and the error's name only - the runtime's own
  message can carry the request URL, and with it a key. Every verb ends such
  an error as one line and exit 1, never an uncaught stack trace.
- A lookup that finds no exact part-number match says so; it never returns a
  near match as if it were the part.

## Verification

- Unit tests for each client against recorded responses (fixtures in
  `tests/`), injected HTTP: parsing price breaks (including Mouser's
  price strings with currency symbols), parameters, missing-key and error
  refusals, no near match returned from `lookup`.
- `parts source` output passes `parseCatalogEntry`'s source validation.
- `parts refresh` on a temporary catalog: breaks and date updated, other
  sources untouched, an unlisted part reported. (The `pack` mark on breaks was
  removed with the parts-list design's stocking-quantity decision.)
- One live check, run by hand once keys exist, not in `bun test`:
  `parts lookup MFR-25FBF52-100K`.
- End to end: the staged board's list completed with the researcher using
  the tool (the parts-list plan's Task 7).

## Not in this design

- Putting a list into a supplier's cart (both services have cart or
  "MyLists" features; later, if wanted).
- Choosing between suppliers automatically; the researcher records both and
  `BOM.md` shows both.
