/**
 * Today's date as the operator's own calendar says it, shared by `make bom` (staleness,
 * tools/bom/run.ts) and `bun run parts` (the `checked` date it stamps on a source,
 * tools/cli/parts.ts), so the two never disagree about what day it is. A UTC date
 * (`toISOString()`) would read as tomorrow on a US evening.
 */

/** The local calendar date of `date` as "YYYY-MM-DD". */
export function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}
