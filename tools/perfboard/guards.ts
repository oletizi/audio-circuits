/**
 * Type predicates shared by `load.ts` and `check.ts`.
 *
 * Both files need to narrow an `unknown` value (a dynamic import's namespace
 * object, or the result of calling a circuit's export) into something they can
 * index without a cast. A real predicate lets TypeScript narrow at the call
 * site; a cast only tells the compiler to stop checking, which is exactly the
 * failure mode this module's callers exist to prevent.
 *
 * The predicate itself lives in `lib/guards.ts`, because `lib` needs the same
 * narrowing when it reads a parameter bag or a board module's exported table, and two
 * definitions of one structural check is one more than there is anything to disagree
 * about. This module stays as the name its callers already import.
 */
export { isRecord } from "../../lib/guards.ts"
