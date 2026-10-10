/**
 * What a board's wiring guide has to be told about stand-in groups, and the check that
 * it really was told it.
 *
 * WHY THIS IS DATA AND NOT A COMPUTATION IN `lib`. Which groups a board carries for a
 * given build, and which other board carries the rest, is a fact about the Pultec
 * ladder: it comes from `circuits/pultec/physical/scaffold-doc.ts`, which can see
 * `boardNetwork`, `suppliers` and the junction. Nothing in `lib/` imports from
 * `circuits/`, and this is not the place to start - a generic guide generator that
 * reached into one design would make every other board's guide depend on that design
 * staying valid, and `circuits/pultec/physical/board.ts` runs its whole stand-in
 * derivation at import time. So the design computes, and the guide renders.
 *
 * PART IDS, NOT COMPONENTS. A group's parts cross this boundary as ids, and the
 * renderer looks each one up in the board network it is describing. That is deliberate:
 * it makes the guide unable to describe a part the board does not carry (the lookup
 * refuses), and it keeps this shape to strings and arrays, which the guard below can
 * actually check.
 *
 * WHY A GUARD AT ALL. `tools/perfboard/wiring-sync.ts` reads this off a board module
 * through a dynamic import, where the type is `unknown` - the same boundary
 * `assertDesignators` and `assertSharedBy` sit on. A cast there would tell the compiler
 * to stop checking exactly where nothing is checked. The guard throws naming the field,
 * so a malformed export says which board and which field rather than producing a guide
 * with a hole in it.
 */
import { isRecord } from "../../guards.ts"
import type { FlatState } from "./flat.ts"

/** One absent section's stand-in parts, by the ids they carry on the board. */
export interface StandInGroupDoc {
  /** The ABSENT section these parts stand in for. */
  readonly section: string
  readonly partIds: readonly string[]
}

/** An absent section's group, and the one board that carries it in this build. */
export interface CarriedElsewhere {
  readonly section: string
  readonly board: string
}

/** A junction pin that carries a net to another board in this build. */
export interface JunctionWire {
  /** The pad number, as the layout counts it. */
  readonly pad: string
  readonly net: string
  /** The other present boards whose populated parts sit on this net. */
  readonly reaches: readonly string[]
}

/** A junction pin the outside world lands on: the source, the load, ground. */
export interface ExternalLanding {
  readonly pad: string
  readonly net: string
  /** The port name the circuit gives it - "input", "output", "ground". */
  readonly port: string
  /**
   * Whether THIS board's OWN parts sit on that net.
   *
   * The difference matters off a stack: a lead to a pad whose net this board has no
   * part on reaches nothing until the junctions are bussed together, so "land it
   * wherever is convenient" would be wrong in a way a builder finds by measuring.
   */
  readonly onBoard: boolean
}

/** One build: which boards are on the bench, and what that means for this one. */
export interface BuildDoc {
  /** Every board in the build, this one included. */
  readonly present: readonly string[]
  /** Absent sections whose groups go on THIS board. */
  readonly populate: readonly string[]
  /** Absent sections whose groups go on another board, with which. */
  readonly elsewhere: readonly CarriedElsewhere[]
  readonly junction: readonly JunctionWire[]
}

export interface ScaffoldDoc {
  /** The section this board IS. */
  readonly section: string
  /** The setting the stand-ins emulate. Up to 3.71 dB rides on it, so it travels with
   * the data rather than being written into the guide's prose by hand. */
  readonly flat: FlatState
  readonly groups: readonly StandInGroupDoc[]
  /** Every build this board can be part of. */
  readonly builds: readonly BuildDoc[]
  readonly external: readonly ExternalLanding[]
}

function fail(where: string, what: string, got: unknown): never {
  throw new Error(
    `${where} must be ${what}, got ${typeof got === "object" ? JSON.stringify(got) : typeof got}. ` +
      "A board's SCAFFOLD export is built by circuits/pultec/physical/scaffold-doc.ts; " +
      "it is not defaulted, because a guide missing a population instruction reads as a " +
      "board with nothing to populate.",
  )
}

function stringAt(value: unknown, where: string): string {
  if (typeof value !== "string" || value.length === 0) fail(where, "a non-empty string", value)
  return value
}

function stringsAt(value: unknown, where: string): readonly string[] {
  if (!Array.isArray(value)) fail(where, "an array of strings", value)
  return value.map((entry, index) => stringAt(entry, `${where}[${index}]`))
}

function arrayAt(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(where, "an array", value)
  return value
}

function booleanAt(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") fail(where, "a boolean", value)
  return value
}

function recordAt(value: unknown, where: string): Record<string, unknown> {
  if (!isRecord(value)) fail(where, "an object", value)
  return value
}

function flatAt(value: unknown, where: string): FlatState {
  const flat = recordAt(value, where)
  return {
    loFrequency: stringAt(flat["loFrequency"], `${where}.loFrequency`),
    hiFrequency: stringAt(flat["hiFrequency"], `${where}.hiFrequency`),
    midFrequency: stringAt(flat["midFrequency"], `${where}.midFrequency`),
    midMode: stringAt(flat["midMode"], `${where}.midMode`),
  }
}

function groupAt(value: unknown, where: string): StandInGroupDoc {
  const group = recordAt(value, where)
  const partIds = stringsAt(group["partIds"], `${where}.partIds`)
  if (partIds.length === 0) {
    fail(`${where}.partIds`, "a non-empty array - a group with no parts is not a group", partIds)
  }
  return { section: stringAt(group["section"], `${where}.section`), partIds }
}

function buildAt(value: unknown, where: string): BuildDoc {
  const build = recordAt(value, where)
  const present = stringsAt(build["present"], `${where}.present`)
  if (present.length === 0) {
    fail(`${where}.present`, "a non-empty array - a build with no boards builds nothing", present)
  }
  return {
    present,
    populate: stringsAt(build["populate"], `${where}.populate`),
    elsewhere: arrayAt(build["elsewhere"], `${where}.elsewhere`).map((entry, index) => {
      const carried = recordAt(entry, `${where}.elsewhere[${index}]`)
      return {
        section: stringAt(carried["section"], `${where}.elsewhere[${index}].section`),
        board: stringAt(carried["board"], `${where}.elsewhere[${index}].board`),
      }
    }),
    junction: arrayAt(build["junction"], `${where}.junction`).map((entry, index) => {
      const wire = recordAt(entry, `${where}.junction[${index}]`)
      return {
        pad: stringAt(wire["pad"], `${where}.junction[${index}].pad`),
        net: stringAt(wire["net"], `${where}.junction[${index}].net`),
        reaches: stringsAt(wire["reaches"], `${where}.junction[${index}].reaches`),
      }
    }),
  }
}

/**
 * Narrow a board module's `SCAFFOLD` export, or refuse naming the field that is wrong.
 *
 * `where` is what the caller can print to say WHICH board - the declaration file, for
 * `wiring-sync`. Every refusal below carries it, because a shape error with no board
 * name sends somebody reading five identical modules.
 */
export function asScaffoldDoc(value: unknown, where: string): ScaffoldDoc {
  const doc = recordAt(value, `${where}: SCAFFOLD`)
  const builds = arrayAt(doc["builds"], `${where}: SCAFFOLD.builds`)
  if (builds.length === 0) {
    fail(`${where}: SCAFFOLD.builds`, "a non-empty array of builds", builds)
  }
  return {
    section: stringAt(doc["section"], `${where}: SCAFFOLD.section`),
    flat: flatAt(doc["flat"], `${where}: SCAFFOLD.flat`),
    groups: arrayAt(doc["groups"], `${where}: SCAFFOLD.groups`)
      .map((entry, index) => groupAt(entry, `${where}: SCAFFOLD.groups[${index}]`)),
    builds: builds.map((entry, index) => buildAt(entry, `${where}: SCAFFOLD.builds[${index}]`)),
    external: arrayAt(doc["external"], `${where}: SCAFFOLD.external`).map((entry, index) => {
      const landing = recordAt(entry, `${where}: SCAFFOLD.external[${index}]`)
      return {
        pad: stringAt(landing["pad"], `${where}: SCAFFOLD.external[${index}].pad`),
        net: stringAt(landing["net"], `${where}: SCAFFOLD.external[${index}].net`),
        port: stringAt(landing["port"], `${where}: SCAFFOLD.external[${index}].port`),
        onBoard: booleanAt(landing["onBoard"], `${where}: SCAFFOLD.external[${index}].onBoard`),
      }
    }),
  }
}
