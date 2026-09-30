/**
 * Buy-quantity suggestions: how many of a line's chosen part to buy, and at
 * what price, given the board's purchasing mode (Decisions,
 * docs/superpowers/specs/2026-09-30-bom-design.md):
 *
 * - the quantity to cover is `need x boards x (1 + shrinkage)`, rounded up,
 *   so any line gets at least one spare (`coverQuantity`);
 * - prototype (one board), `stock` part: the smallest stocking-pack price
 *   break that covers the cover quantity;
 * - prototype, any other part: the cover quantity, at the price break that
 *   applies to buying that many;
 * - run: the cover quantity, moved up to a larger price break whenever
 *   buying that break's own quantity costs less in total.
 *
 * PRICE ARITHMETIC: totals are compared as integer MICROS (millionths of the
 * source's currency unit - $0.012 becomes 12_000 micros) rather than as
 * floating-point currency amounts. A run's "cheaper total" choice is a
 * comparison between two totals that can differ by a fraction of a cent
 * (price breaks are sometimes quoted to three decimal places, e.g.
 * $0.012/unit), so it must not turn on floating-point rounding noise several
 * decimal places below any real difference. `linePrice` is converted back to
 * an ordinary number only for the returned suggestion, never compared as one.
 */
import type { CatalogEntry, PriceBreak, Source } from "./catalog.ts"
import type { Purchasing } from "./board-bom.ts"

export interface BuySuggestion {
  readonly quantity: number
  readonly unitPrice: number
  readonly linePrice: number
}

const MICROS_PER_CURRENCY_UNIT = 1_000_000

function toMicros(price: number): number {
  return Math.round(price * MICROS_PER_CURRENCY_UNIT)
}

function fromMicros(micros: number): number {
  return micros / MICROS_PER_CURRENCY_UNIT
}

/**
 * `need * boards * (1 + shrinkage)` computed as ordinary floating-point
 * numbers can land a hair above an exact integer (e.g. `10 * 1.1` as a
 * float), which would ceiling to one more unit than the true cover.
 * Subtracting a tolerance far smaller than any real fractional need before
 * ceiling removes that noise without masking a genuine fraction.
 */
const CEILING_TOLERANCE = 1e-9

function ceiling(value: number): number {
  return Math.ceil(value - CEILING_TOLERANCE)
}

/** The quantity to cover: need, across every board, with the shrinkage margin - rounded
 * up so any line gets at least one spare, however small its need. */
export function coverQuantity(need: number, purchasing: Purchasing): number {
  const boards = purchasing.mode === "run" ? purchasing.boards : 1
  return ceiling(need * boards * (1 + purchasing.shrinkage))
}

function requireBreaks(source: Source, entry: CatalogEntry): readonly PriceBreak[] {
  if (source.breaks.length === 0) {
    throw new Error(
      `catalog entry "${entry.id}": source "${source.supplier}" lists no price breaks, so a buy ` +
        "quantity cannot be suggested from it.",
    )
  }
  return source.breaks
}

/** The break that applies when buying exactly `quantity` units: the largest-quantity break
 * at or below it, or the first (minimum-order) break when `quantity` is smaller than even
 * that. */
function applicableBreak(breaks: readonly PriceBreak[], quantity: number): PriceBreak {
  const applicable = [...breaks].reverse().find((brk) => brk.quantity <= quantity)
  return applicable ?? breaks[0]
}

function lineOf(quantity: number, unitPrice: number): BuySuggestion {
  return { quantity, unitPrice, linePrice: fromMicros(quantity * toMicros(unitPrice)) }
}

/**
 * Whether some stocking-pack price break (`pack: true`) at `source` covers `quantity`
 * units - the one exception-free way to ask "would a stock-part prototype buy fail to
 * find a big-enough pack here", used by both `stockPackSuggestion` below and, outside
 * this module, the report and `BOM.md` (tools/bom/report.ts, tools/bom/render.ts) so
 * neither has to distinguish "no pack big enough" from every other reason `suggestBuy`
 * can throw by catching and inspecting an exception.
 *
 * Reuses `requireBreaks`, so a source with NO price breaks at all still throws here
 * (naming the entry and supplier) rather than reading as "does not cover" - that is a
 * malformed catalog entry, a different problem from "the packs listed are too small".
 */
export function stockPackCovers(entry: CatalogEntry, source: Source, quantity: number): boolean {
  return requireBreaks(source, entry).some((brk) => brk.pack === true && brk.quantity >= quantity)
}

/** Prototype, `stock` part: the smallest stocking-pack break (`pack: true`) that covers the
 * cover quantity. Throws, naming the entry and the supplier, when no pack break covers it. */
function stockPackSuggestion(cover: number, entry: CatalogEntry, source: Source): BuySuggestion {
  if (!stockPackCovers(entry, source, cover)) {
    throw new Error(
      `catalog entry "${entry.id}": no stocking-pack price break at supplier "${source.supplier}" ` +
        `covers the ${cover}-unit cover. Add a larger pack break, or choose a supplier that has one.`,
    )
  }
  const packs = requireBreaks(source, entry)
    .filter((brk) => brk.pack === true && brk.quantity >= cover)
    .sort((a, b) => a.quantity - b.quantity)
  const covering = packs[0]
  if (covering === undefined) {
    throw new Error(
      `catalog entry "${entry.id}": stockPackCovers said a pack at "${source.supplier}" covers the ` +
        `${cover}-unit cover, but none was found when selecting one - this is a bug in ` +
        "tools/bom/quantity.ts, not a catalog problem.",
    )
  }
  return lineOf(covering.quantity, covering.unitPrice)
}

/** Prototype, non-stock: buy exactly the cover quantity (or the minimum order, whichever is
 * larger), at the price break that applies to that quantity. No bumping up to a larger break -
 * that consideration is a `run`-mode decision (see the module comment). */
function prototypeOtherSuggestion(cover: number, entry: CatalogEntry, source: Source): BuySuggestion {
  const breaks = requireBreaks(source, entry)
  const quantity = Math.max(cover, breaks[0].quantity)
  const applicable = applicableBreak(breaks, quantity)
  return lineOf(quantity, applicable.unitPrice)
}

/** Run: the cover quantity, moved up to a larger break whenever buying THAT break's own
 * quantity costs less in total than buying the cover at its own applicable price. Every
 * break is a candidate purchase (its own quantity, or the cover if that is larger); the
 * cheapest total wins. This is also where the minimum order is enforced: the first break's
 * candidate is always at least its own quantity. */
function runSuggestion(cover: number, entry: CatalogEntry, source: Source): BuySuggestion {
  const breaks = requireBreaks(source, entry)
  const candidateFor = (brk: PriceBreak): { readonly quantity: number; readonly totalMicros: number } => {
    const quantity = Math.max(cover, brk.quantity)
    return { quantity, totalMicros: quantity * toMicros(brk.unitPrice) }
  }

  let bestBreak = breaks[0]
  let best = candidateFor(bestBreak)
  for (const brk of breaks.slice(1)) {
    const candidate = candidateFor(brk)
    if (candidate.totalMicros < best.totalMicros) {
      bestBreak = brk
      best = candidate
    }
  }
  return lineOf(best.quantity, bestBreak.unitPrice)
}

/** The buy quantity and price to suggest for one line's chosen part, from one of its
 * sources. See the module comment for the rule per purchasing mode. */
export function suggestBuy(
  need: number,
  purchasing: Purchasing,
  entry: CatalogEntry,
  source: Source,
): BuySuggestion {
  const cover = coverQuantity(need, purchasing)
  if (purchasing.mode === "prototype" && entry.stock) {
    return stockPackSuggestion(cover, entry, source)
  }
  if (purchasing.mode === "prototype") {
    return prototypeOtherSuggestion(cover, entry, source)
  }
  return runSuggestion(cover, entry, source)
}
