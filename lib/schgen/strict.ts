/**
 * Strict readers for operator-owned JSON files (rules, policy, manifests).
 *
 * An unknown key is refused, never ignored: a misspelled constraint that
 * loads clean and does nothing is the failure these files exist to prevent.
 *
 * Narrowed from `digital-pedal-platform`'s `tools/placement/strict.ts` to the
 * two functions the ported `lib/schgen/` files import as `@/placement/strict`
 * - this repository has no other operator-owned-JSON readers yet, and a
 * speculative `requireNumber`/`requireString`/etc. would be new code nothing
 * calls.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function rejectUnknown(parsed: Record<string, unknown>, keys: readonly string[], where: string): void {
  for (const key of Object.keys(parsed)) {
    if (!keys.includes(key)) {
      throw new Error(`${where}: unknown key "${key}" (allowed: ${keys.join(", ")})`)
    }
  }
}
