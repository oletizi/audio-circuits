import type { Network } from "./types.ts"

/** Recursively strips readonly modifiers. Primitives pass through unchanged. */
export type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T

/** A Network that tests may corrupt on purpose. Assignable to Network. */
export type MutableNetwork = Mutable<Network>
