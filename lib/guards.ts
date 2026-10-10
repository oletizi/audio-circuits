/**
 * Type predicates for narrowing an `unknown` into something indexable.
 *
 * A REAL PREDICATE, NEVER A CAST. `as Record<string, unknown>` tells the compiler to
 * stop checking; a predicate makes the check happen and lets the caller refuse what
 * fails it. Everything in this repository that reads a value it did not construct - a
 * component's parameter bag, a dynamic import's namespace object, a board module's
 * exported table - needs this, so there is one definition of it rather than one per
 * caller. `tools/perfboard/guards.ts` re-exports it for the tools that narrow dynamic
 * imports.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
