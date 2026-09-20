import type { PassiveNetwork } from "./topology.ts"

/** Recursively strips readonly modifiers. Primitives pass through unchanged. */
export type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T

/** A PassiveNetwork that tests may corrupt on purpose. Assignable to PassiveNetwork. */
export type MutablePassiveNetwork = Mutable<PassiveNetwork>
