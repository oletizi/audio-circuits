/**
 * ONE AUTHORITATIVE CROSS-SHEET MECHANISM PER CLASS OF CONNECTION - SPEC §5.2's DECISION, MADE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan, which spec revision 4 names as this
 * question's owner: *"The decision is no longer unowned: its owner is the M1 plan's Task 15"*.
 *
 * **THE RULE IS THE SPEC REVIEW's, ADOPTED AND QUOTED** (spec §1.6, revision 4, finding 16):
 * ***"each CLASS of connection has one authoritative mechanism, with no ambiguous or duplicate
 * representation."*** It is NOT artificial uniformity, and the spec says so in the same breath:
 * power symbols, global labels and hierarchical ports *"have different KiCad semantics and may
 * legitimately serve different classes"*. What is refused is **a net represented two ways**, or
 * **a class of connection with no stated mechanism** - not a sheet that uses two mechanisms for two
 * different kinds of connection.
 *
 * **THE DECISION, AND IT IS THIS TASK's TO DISPUTE RATHER THAN THE SPEC's.** Two classes, two
 * mechanisms, one each:
 *
 * | class | what states it | mechanism | why that one |
 * | --- | --- | --- | --- |
 * | `declared-rail` | `Circuit.rails` - a `RailSpec` declared in the authoring file | `power-symbol` | spec §3.4's third objective criterion: *"rails must be declared ports, so a rail drawn as an ordinary net is detectable"*. A power symbol is the only KiCad construct whose name IS its net and whose glyph says "rail" to a reader |
 * | `inter-block-signal` | everything else that crosses a boundary | `global-label` | it is the one remaining mechanism the emitter has, and it carries KiCad's intersheet page references (`page-refs.ts`), which a power symbol does not |
 *
 * **THE CLASS COMES FROM A DECLARED PROPERTY OF THE MODEL AND IS DECIDED UPSTREAM.** `classOf`
 * reads `Circuit.rails` and nothing else; it never infers a class from what a drawing happens to
 * contain. That direction matters: inferring the class from the drawing would make every drawing
 * self-consistent by construction and the check would be unable to fail.
 *
 * **HIERARCHICAL PORTS ARE EMITTED BY NOTHING HERE, AND THAT IS A DECISION RATHER THAN AN
 * OMISSION.** `anchorsToSymbols` (`power-text.ts`) emits exactly two things for a block's boundary
 * anchors - a power symbol for a net in `railSpecs`, a global label for every other - and
 * `emit.ts` writes exactly those. A third class needing a third mechanism is a change to THIS
 * task's decision, with its own reasoning and its own round-trip case.
 *
 * **WHAT ESTABLISHES THAT THE COMBINATION BEHAVES IS THE ROUND TRIP, NOT THIS FILE.** Spec §1.6:
 * *"Whether the combination behaves is established by the round trip"*, which is
 * `tests/schgen/render/cross-sheet.kicad.test.ts` - the same network generated as one sheet and as
 * several, both exported through `kicad-cli`, net membership compared.
 */

import { blockOfPin } from "../ir/classify.ts"
import type { Circuit, NetName, SheetId } from "../ir/types.ts"
import type { SheetDrawing } from "./sheet-types.ts"

export type CrossSheetMechanism = "power-symbol" | "global-label"
export type ConnectionClass = "declared-rail" | "inter-block-signal"

/** Every class this generator recognises, so the coverage check below has a domain to range over. */
export const CONNECTION_CLASSES: readonly ConnectionClass[] = ["declared-rail", "inter-block-signal"]

/** Every mechanism the emitter can draw. A mechanism outside this set is a refusal, not a style. */
export const CROSS_SHEET_MECHANISMS: readonly CrossSheetMechanism[] = ["power-symbol", "global-label"]

/**
 * THE TABLE. One entry per class, and it is a `Map` rather than a total `Record` **so that a
 * missing entry is a value this code can see**: under this repository's `tsconfig` a
 * `Record<ConnectionClass, …>` lookup is typed as present, so the third refusal below could never
 * have fired and would have been a check that cannot fail - the shape `CLAUDE.md` forbids.
 */
export const MECHANISM_OF_CLASS: ReadonlyMap<ConnectionClass, CrossSheetMechanism> = new Map<ConnectionClass, CrossSheetMechanism>([
  ["declared-rail", "power-symbol"],
  ["inter-block-signal", "global-label"],
])

/**
 * The class of a net, from the model and never from a drawing.
 *
 * A net with a declared `RailSpec` is a rail; everything else that crosses a boundary is an
 * inter-block signal. The function is total over nets on purpose: *every* net has a class, and
 * whether it CROSSES is a separate question answered by `sheetsOf` below.
 */
export function classOf(net: NetName, c: Circuit): ConnectionClass {
  return c.rails.has(net) ? "declared-rail" : "inter-block-signal"
}

/**
 * The one mechanism that class is drawn with, or a refusal naming the class and where to state it.
 *
 * It throws rather than returning a default: a class drawn *"however the emitter happens to"* is
 * exactly the ambiguity spec §1.6's rule exists to prevent, and a defaulted mechanism would be a
 * silent second answer to the question this file is the answer to.
 */
export function mechanismFor(net: NetName, c: Circuit): CrossSheetMechanism {
  const cls = classOf(net, c)
  const mechanism = MECHANISM_OF_CLASS.get(cls)
  if (mechanism === undefined) {
    throw new Error(
      `net ${net} is a "${cls}" connection and lib/schgen/render/cross-sheet.ts states no ` +
        "cross-sheet mechanism for that class. Add one to MECHANISM_OF_CLASS with its reason, or " +
        "stop classifying nets as it. It is not defaulted: spec §1.6's rule is that each class " +
        "has ONE authoritative mechanism, and a class with none would be drawn by whichever " +
        "emitter arm happened to reach it.",
    )
  }
  return mechanism
}

/**
 * Every class in `classes` the table states no mechanism for, one line each.
 *
 * **IT TAKES ITS INPUTS RATHER THAN READING THE MODULE's CONSTANTS, AND THAT IS WHAT GIVES IT
 * TEETH.** `crossSheetProblems` calls it with `CONNECTION_CLASSES` and `MECHANISM_OF_CLASS`, where
 * it finds nothing today because the table is complete. A test drives it with a class list the
 * table does not cover, which is a check that could have failed; a version reading the constants
 * directly could not have been driven at all, because a `ConnectionClass` the union does not name
 * cannot be constructed without a cast.
 */
export function unmappedClasses(
  classes: readonly ConnectionClass[],
  table: ReadonlyMap<ConnectionClass, CrossSheetMechanism>,
): readonly string[] {
  return classes
    .filter((cls) => table.get(cls) === undefined)
    .map((cls) => `connection class "${cls}" has no stated cross-sheet mechanism (lib/schgen/render/cross-sheet.ts)`)
}

/**
 * Every class whose stated mechanism is one the emitter cannot draw, one line each.
 *
 * **THIS IS THE CLAUSE TASK 15 STEP 7's FIRST PERTURBATION DRIVES**: give a class a third
 * mechanism and the refusal fires by name. It is separate from `unmappedClasses` because the two
 * failures are different - a class nobody gave a mechanism, against a class given one the drawing
 * layer has no construct for - and a single clause reporting both would say the wrong thing about
 * one of them.
 *
 * **ITS TABLE PARAMETER TAKES A `string` VALUE AND NOT A `CrossSheetMechanism`, DELIBERATELY.**
 * `MECHANISM_OF_CLASS` is declared with the narrow type and is assignable here, so nothing is
 * weakened where it is called. What the wide parameter buys is that a test can drive this clause
 * with a third mechanism name - `"hierarchical-port"`, which KiCad has and this emitter does not
 * draw - **without a cast and without widening the union to admit a value the emitter cannot
 * produce.** A narrow parameter would have made this a check nothing could ever fail.
 */
export function unemittableMechanisms(
  table: ReadonlyMap<ConnectionClass, string>,
  emittable: readonly CrossSheetMechanism[],
): readonly string[] {
  return [...table]
    .filter(([, mechanism]) => !emittable.some((m) => m === mechanism))
    .map(([cls, mechanism]) =>
      `connection class "${cls}" is stated to use "${mechanism}", which this emitter does not ` +
      `draw (it draws ${emittable.join(", ")}). anchorsToSymbols in ` +
      "lib/schgen/render/power-text.ts is the only producer of a cross-sheet representation; a " +
      "third mechanism is a change to that as well as to this table.")
}

/** The sheets carrying a pin of each net, by net name. */
export function sheetsOf(c: Circuit): ReadonlyMap<NetName, ReadonlySet<SheetId>> {
  const out = new Map<NetName, Set<SheetId>>()
  for (const pin of c.pins) {
    if (pin.net === null) continue
    const id = blockOfPin(c, pin)
    const block = c.blocks.get(id)
    if (block === undefined) throw new Error(`pin ${pin.part}.${pin.pin}: its block ${id} is not in the circuit`)
    const set = out.get(pin.net) ?? new Set<SheetId>()
    set.add(block.sheet)
    out.set(pin.net, set)
  }
  return out
}

/** Which mechanisms a net is actually drawn with, across every sheet of the drawing set. */
function drawnWith(net: NetName, drawings: readonly SheetDrawing[]): ReadonlySet<CrossSheetMechanism> {
  const out = new Set<CrossSheetMechanism>()
  for (const d of drawings) {
    // A PWR_FLAG carries no net name of its own in the drawing (`PowerSymbol.flag`), so it is not
    // a representation of the connection: it is the ERC marker that the rail has a driver.
    if (d.powers.some((p) => !p.flag && p.net === net)) out.add("power-symbol")
    if (d.labels.some((l) => l.net === net)) out.add("global-label")
  }
  return out
}

/**
 * EVERY WAY A SET OF SHEET DRAWINGS BREAKS SPEC §1.6's RULE, one line each, in a fixed order.
 *
 * **FOUR CLAUSES, AND THE FOURTH IS NOT IN TASK 15's BRIEF.** The brief names three - a net drawn
 * with both mechanisms, a net crossing a boundary with neither, and a class with no stated
 * mechanism. The fourth is **a net drawn with a mechanism other than the one its class states**,
 * and without it `classOf` and `mechanismFor` would be read by nobody: a rail drawn only as a
 * global label passes all three of the brief's clauses, and spec §3.4's third criterion -
 * *"rails must be declared ports, so a rail drawn as an ordinary net is detectable"* - is exactly
 * that case. It is recorded as a deviation in `docs/known-gaps.md`.
 *
 * **IT IS A `string[]` AND NOT A THROW**, like `authoringProblems` and `staleFiles`: one call
 * reports everything wrong rather than the first thing, and `assertCrossSheet` below is the
 * refusal.
 */
export function crossSheetProblems(c: Circuit, drawings: readonly SheetDrawing[]): readonly string[] {
  const out: string[] = [
    ...unmappedClasses(CONNECTION_CLASSES, MECHANISM_OF_CLASS),
    ...unemittableMechanisms(MECHANISM_OF_CLASS, CROSS_SHEET_MECHANISMS),
  ]
  const sheets = sheetsOf(c)
  for (const net of [...c.nets.keys()].sort()) {
    const on = sheets.get(net)
    if (on === undefined) throw new Error(`net ${net} is in Circuit.nets and no pin of it reached a sheet`)
    const used = drawnWith(net, drawings)
    const cls = classOf(net, c)
    const want = MECHANISM_OF_CLASS.get(cls)
    if (used.size > 1) {
      out.push(
        `net ${net} is drawn with ${[...used].sort().join(" and ")} - two claims about one ` +
          `connection. Its class is "${cls}", whose one authoritative mechanism is ` +
          `"${want ?? "none stated"}" (spec §1.6).`,
      )
    }
    if (on.size > 1 && used.size === 0) {
      out.push(
        `net ${net} has pins on sheets ${[...on].sort().join(", ")} and is drawn with neither a ` +
          "power symbol nor a global label, so the two sheets' pieces are not connected in the " +
          "schematic at all.",
      )
    }
    for (const mechanism of [...used].sort()) {
      if (want !== undefined && mechanism !== want) {
        out.push(
          `net ${net} is a "${cls}" connection, whose one authoritative mechanism is "${want}", ` +
            `and it is drawn with "${mechanism}"`,
        )
      }
    }
  }
  return out
}

/** `crossSheetProblems`, as a refusal. */
export function assertCrossSheet(c: Circuit, drawings: readonly SheetDrawing[]): void {
  const problems = crossSheetProblems(c, drawings)
  if (problems.length === 0) return
  throw new Error(
    `the cross-sheet mechanism is ambiguous on ${problems.length} net(s) or class(es); spec §1.6 ` +
      `allows one authoritative mechanism per class of connection:\n  ${problems.join("\n  ")}`,
  )
}
