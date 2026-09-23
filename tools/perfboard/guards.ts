/**
 * Type predicates shared by `load.ts` and `check.ts`.
 *
 * Both files need to narrow an `unknown` value (a dynamic import's namespace
 * object, or the result of calling a circuit's export) into something they can
 * index without a cast. A real predicate lets TypeScript narrow at the call
 * site; a cast only tells the compiler to stop checking, which is exactly the
 * failure mode this module's callers exist to prevent.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
