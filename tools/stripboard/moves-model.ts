/**
 * THE MOVE SET'S VOCABULARY: what a candidate layout can differ from the current
 * one by, which kinds can be applied today, and how one difference is named.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` §6.1, which names the five
 * single-part moves (`move`, `rotate`, `stretch`, `add-wire`, `delete-wire`),
 * and §7.4 of `docs/superpowers/specs/2026-10-10-stripboard-pipeline-design.md`,
 * which adds the net-cluster move. Where this module and those documents differ
 * the documents win and this comment is the defect - **with one named exception,
 * `gather`, below.**
 *
 * **SPLIT FROM `./moves.ts` FOR THE 500-LINE CEILING, AT THE SEAM THAT FILE
 * ALREADY HAD**: this one answers *what IS a move* and `./moves.ts` answers
 * *which moves does this board admit*. The same division as
 * `./constraints-model.ts` / `./constraints.ts`. `./moves.ts` stays the module
 * the plan names and re-exports all of this, so no consumer imports it directly
 * and the plan's declared interface is unchanged.
 *
 * **`gather` IS A SEVENTH KIND THE DOCUMENTS DO NOT NAME, AND IT IS HERE BY
 * CONTROLLER RULING (2026-10-12).** §7.4 specifies `E1` as *"every on-board part
 * with a pin on net X and ONE DELTA"* and justifies it by *"moving all three
 * together to one strip removes a whole cut"* - and those two sentences describe
 * different gestures. A common translation preserves the parts' relative
 * positions, so the clustered net's own segment count across strips cannot
 * change: **the one-delta move cannot change the quantity it exists to change**,
 * which `docs/stripboard/pipeline-verification.md` §6.1 measured and §6.4
 * confirmed on fifteen real runs (`F` unchanged on all three arms). The ruling:
 * when a plan's mechanism cannot achieve its own stated purpose, the purpose is
 * what survives. So `gather` is the gesture the justification describes - each
 * part moved by ITS OWN delta so that its pin on net X lands on one common strip
 * - and `cluster` stays, because it fires and does something real (§6.4: four
 * new-best-`F` steps), just not this.
 *
 * **`spread` IS AN EIGHTH KIND THE DOCUMENTS DO NOT NAME EITHER, AND IT IS HERE
 * ON THE OWNER'S OWN CORRECTION OF THE COST MODEL (2026-10-12).** His sentence
 * is quoted in full at the head of `./moves-spread.ts`, which is also where the
 * enumeration and the gap it leaves are stated. The one line of it: a cut exists
 * because two nets share a strip, a net cannot leave a shared strip without
 * splitting itself, and a wire is what pays for the split - so wires buy the
 * freedom to spread and spreading is what removes the cut. PIPELINE §8.1.1
 * names *"spending strips"* as the lever and records *"effect on W: none at
 * all"*, which holds for a whole net moved to one strip and not for a net moved
 * PARTLY off a shared one; the departure is recorded in
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` under *"Deviations
 * from the specs"*.
 */
import type { WireLanding, WirePlan } from "./moves-wire.ts"

/**
 * One difference between a candidate layout and the current one.
 *
 * `cluster` is PIPELINE §7.4's net-cluster move - every on-board part with a pin
 * on one net moved by one delta.
 */
export type Move =
  | { readonly kind: "move"; readonly ref: string; readonly to: readonly [number, number] }
  | { readonly kind: "rotate"; readonly ref: string; readonly direction: "cw" | "ccw" }
  | { readonly kind: "stretch"; readonly ref: string; readonly direction: "grow" | "shrink" }
  | {
      /**
       * A wire created at a free hole and then turned and stretched to bridge
       * two strips of one net - **a compound gesture, like the cluster and the
       * gather, and the kind the order question in `GESTURE_ORDERS` is really
       * for.** `./moves-wire.ts` carries the four measurements behind it and why
       * it was deferred until the occupancy knew about wires.
       */
      readonly kind: "add-wire"
      /** The net whose two segments this wire is for. */
      readonly net: string
      /**
       * The two holes the wire is PREDICTED to finish on, which is what makes it
       * a bridge: one on each of the net's two strips.
       *
       * It is a prediction and not a command - `--op add-wire` takes one hole
       * and the wire's own footprint decides the rest - so the next
       * `--dump-board` is what says where the ends really are, and `F`'s `W`
       * comes from that rather than from this field.
       */
      readonly ends: readonly [readonly [number, number], readonly [number, number]]
      /** Where the wire is created and the gestures that shape it, in order. */
      readonly plan: WirePlan
    }
  | { readonly kind: "delete-wire"; readonly name: string }
  | {
      readonly kind: "cluster"
      readonly net: string
      readonly delta: readonly [number, number]
      /**
       * The parts this cluster moves, **in the order the gestures go out.**
       *
       * **THE MOVE CARRIES THEM RATHER THAN NAMING ONLY THE NET, AND THE REASON
       * IS THAT THE ORDER CANNOT BE RECOVERED AT APPLY TIME.** Which parts a net
       * holds comes from the reference NETLIST, because `--import` writes every
       * `NODE` line `NAME -`; and the order they must move in comes from the
       * CARRIED OCCUPANCY, which is the only description of a turned part's
       * footprint there is. `applyMove` is handed a board path and a spawn and
       * neither of those - so a cluster whose refs it had to derive would be a
       * second implementation of `./moves-cluster.ts`' rule in the one module
       * that cannot see what the rule needs. `net` stays beside them as what the
       * cluster IS, for `describeMove`, the run record and the enumeration order.
       */
      readonly refs: readonly string[]
    }
  | {
      /**
       * `E1`'s GATHER: every on-board part with a pin on net X moved by ITS OWN
       * delta, so that its pin on net X lands on one common strip.
       *
       * **THIS IS THE GESTURE §7.4's JUSTIFICATION DESCRIBES**, and the module
       * comment above carries the ruling that put it here. A `cluster` moves the
       * whole pin set rigidly and therefore cannot change the net's own segment
       * count across strips; a gather is the move that can, because the deltas
       * differ per part. The two are separate kinds named for what each does.
       */
      readonly kind: "gather"
      readonly net: string
      /** The strip every one of the net's pins lands on. */
      readonly strip: number
      /**
       * The translations, **in the order the gestures go out** - the same reason
       * `cluster` carries its refs: which parts a net holds comes from the
       * reference netlist, the deltas and their order come from the carried
       * occupancy, and `applyMove` has neither.
       *
       * A part whose pin is already on `strip` is NOT in this list: its delta
       * would be zero, and the fork refuses a zero delta for its own stated
       * reason - a candidate byte-identical to its own parent.
       */
      readonly gestures: readonly {
        readonly ref: string
        readonly delta: readonly [number, number]
      }[]
    }
  | {
      /**
       * THE SPREAD: the net's pins on ONE strip relocated to a strip of their
       * own, WITH the wire that rejoins the net, in one candidate.
       *
       * **IT IS HERE ON THE OWNER'S OWN CORRECTION OF THE COST MODEL
       * (2026-10-12), quoted in full in `./moves-spread.ts`'s header**, which is
       * also where the enumeration, the five ways it declines and the gap it
       * leaves are stated. The short form of why the two halves travel together:
       * the relocation alone splits a whole net and the acceptance rule's first
       * key rejects it, the wire alone removes no cut, and with
       * `worseAcceptance` unset no intermediate worse than the incumbent is ever
       * accepted - so the pair is unreachable one step at a time.
       */
      readonly kind: "spread"
      readonly net: string
      /** The strip the net's relocated pins came OFF - the one being vacated. */
      readonly from: number
      /** The strip they land on. */
      readonly to: number
      /** The strip the wire joins `to` back to: one the net still occupies. */
      readonly joined: number
      /**
       * The relocations, in the order the gestures go out - the same reason
       * `cluster` and `gather` carry theirs: `applyMove` is handed a board path
       * and a spawn and has no geometry at all.
       *
       * Every entry carries the SAME delta, because every mover's aimed pin
       * starts on `from`.
       */
      readonly gestures: readonly {
        readonly ref: string
        readonly delta: readonly [number, number]
      }[]
      /**
       * The REJOINING WIRES, in the order their gestures go out: **one for a
       * straight join and TWO for an L**, each with where it is created, the
       * gestures that shape it, and the holes it is predicted to finish on.
       *
       * **IT IS A LIST BECAUSE A SINGLE STRAIGHT WIRE CANNOT ALWAYS REACH THE
       * NET'S OWN COPPER ON BOTH STRIPS**, which was 313 of 1,389 enumerated
       * triples (23%) and the largest gate on two of four boards:
       * `./moves-join.ts` plans the L - a wire ALONG the kept strip, then one
       * ACROSS - and carries what it costs (`2 x rho_w`) and what it does not
       * establish. The ends are a prediction and not a command, for
       * `add-wire`'s own stated reason: the next `--dump-board` says where they
       * really are.
       */
      readonly wires: readonly WireLanding[]
    }

/**
 * Every kind, once, in the order `enumerateMoves` emits them. The one listing:
 * `tests/stripboard/moves.test.ts` holds the enumeration against it, so a ninth
 * kind added to `Move` without an arm in `applyMove` is a compile error and a
 * kind that stops being enumerated is a test failure.
 */
export const MOVE_KINDS: readonly Move["kind"][] = [
  "move",
  "rotate",
  "stretch",
  "add-wire",
  "delete-wire",
  "cluster",
  "gather",
  "spread",
]

/**
 * Whether applying this move puts a NEW wire on the board.
 *
 * **IT DECIDES WHETHER A CANDIDATE NEEDS `--update` BEFORE IT IS SCORED, AND
 * THAT IS THE WHOLE REASON IT EXISTS.** A wire created by
 * `--author --op add-wire` lands on holes carrying NODE ID 0, and `--check`'s
 * completeness reads node ids - so a wire that physically joins two of a net's
 * pins leaves that net reported incomplete, `openNets` unchanged and `F` up by
 * `rho_w`, which the acceptance rule then correctly rejects.
 * `./complete-apply.ts`'s `assignNodes` carries the measurement that found it
 * and is the one invocation that fixes it; `./climb.ts` calls it for exactly the
 * kinds this function names.
 *
 * **IT IS A `switch` AND NOT A LIST, so a ninth kind must be classified rather
 * than default to "no wire".** Defaulting is the failure this would have: a new
 * wire-adding kind would be scored with its wire joining nothing, and would be
 * rejected for a reason that is not about the gesture at all. That is precisely
 * how `add-wire` spent 7,417 candidates registering nothing
 * (`docs/stripboard/pipeline-verification.md` §6.9).
 *
 * `delete-wire` answers `false` and is never asked: it is in `DEFERRED_KINDS`,
 * so `applicableMoves` keeps it out of the sweep. It is answered rather than
 * refused because the question - does this ADD a wire - has a true answer for
 * it.
 */
export function addsWire(move: Move): boolean {
  switch (move.kind) {
    case "add-wire":
    case "spread":
      return true
    case "move":
    case "rotate":
    case "stretch":
    case "delete-wire":
    case "cluster":
    case "gather":
      return false
  }
}

/**
 * The kinds `applyMove` cannot apply, each with what is missing and where it
 * gets fixed. **One wording, read by both `applicableMoves` and `applyMove`**,
 * so the climb's omission and the refusal's text cannot drift apart.
 *
 * `delete-wire` IS NOT DEFERRED TO A TASK - IT IS BLOCKED ON THE FORK. The
 * pinned fork's command table (`.tools/veroroute-perfboard/Src/Headless.cpp:
 * 92-106`) is `--adopt`, `--author`, `--check`, `--dump-board`,
 * `--dump-netlist`, `--import`, `--move`, `--move-batch`, `--rotate`,
 * `--update`, `--set-strips`, `--stretch` and three `--verify-*` test verbs,
 * and `--author`'s ops are `group`, `select`, `move-label`, `add-wire`, `merge`
 * and `autofill`. **None of them deletes a component.** COST §6.1 lists
 * `delete-wire` in the move set and §7 records that only some of the set
 * existed when it was written; this is the same gap, still open.
 */
export const DEFERRED_KINDS: ReadonlyMap<Move["kind"], string> = new Map([
  [
    "delete-wire",
    "no verb in the pinned fork deletes a placed component, and that is now MEASURED rather " +
      "than read off a help text. Read out of the source: Headless.cpp's command table is " +
      "--adopt, --author, --check, --dump-board, --dump-netlist, --import, --move, " +
      "--move-batch, --rotate, --set-strips, --stretch and --update, plus the three " +
      "--verify-* test verbs; Headless_author.cpp's ops are add-wire, autofill, group, merge, " +
      "move-label and select. None of them removes a component. And --update, the ONE verb " +
      "that rewrites a board's component set from a netlist, leaves wires alone: measured on " +
      "the import-placed low-boost board with two wires added, --update against its own " +
      "netlist exits 0 and the board still carries TWO wires afterwards. So the kind is " +
      "blocked on the fork and not on this repository - fixing it is a --author --op delete " +
      "over Board's component removal, with the same effect check --op add-wire makes. It is " +
      "still ENUMERATED, so the move set in the record stays the spec's",
  ],
])

/** A one-line description of a move, stable across runs: the key a test compares by. */
export function describeMove(move: Move): string {
  switch (move.kind) {
    case "move":
      return `move ${move.ref} to ${move.to[0]},${move.to[1]}`
    case "rotate":
      return `rotate ${move.ref} ${move.direction}`
    case "stretch":
      return `stretch ${move.ref} ${move.direction}`
    case "add-wire":
      // THE WHOLE PLAN, because the gestures and their order are decisions: two
      // add-wires bridging one pair of strips from the same anchor can differ in
      // whether the turn or the stretch goes first, and a record that said only
      // "add-wire at R,C" could not tell them apart.
      return (
        `add-wire ${move.net} joining ${move.ends[0][0]},${move.ends[0][1]} to ` +
        `${move.ends[1][0]},${move.ends[1][1]} (at ${move.plan.at[0]},${move.plan.at[1]} as ` +
        `${move.plan.name}, ${move.plan.turns} turn(s), stretch ${move.plan.stretch}, ` +
        `${move.plan.order})`
      )
    case "delete-wire":
      return `delete-wire ${move.name}`
    case "cluster":
      // The refs are in the description because they are part of the gesture
      // and their ORDER is a decision: a record that said only "cluster mid by
      // 1,0" could not tell two sequences of the same parts apart, and the
      // sequence is what makes the difference between a cluster that lands and
      // one the fork refuses (./moves-cluster.ts's clusterSequence).
      return `cluster ${move.net} by ${move.delta[0]},${move.delta[1]} (${move.refs.join(" ")})`
    case "gather":
      // Every part AND its own delta, in gesture order: a gather of one net onto
      // one strip is still several different gestures, and two gathers of the
      // same net onto the same strip could differ in which parts they move if
      // one of them was built from a different occupancy.
      return (
        `gather ${move.net} onto strip ${move.strip} (` +
        `${move.gestures.map((one) => `${one.ref} by ${one.delta[0]},${one.delta[1]}`).join("; ")})`
      )
    case "spread":
      // THE PARTS, THE TWO STRIPS AND THE WHOLE WIRE PLAN, for both reasons the
      // kinds above carry theirs: the parts and their order are a decision the
      // enumerator made from an occupancy nothing else holds, and two wires
      // joining one pair of strips from the same anchor can differ in whether
      // the turn or the stretch goes first.
      return (
        `spread ${move.net} from strip ${move.from} to strip ${move.to} joined to strip ` +
        `${move.joined} (` +
        `${move.gestures.map((one) => `${one.ref} by ${one.delta[0]},${one.delta[1]}`).join("; ")}` +
        `; ${move.wires.length === 1 ? "wire" : "L of 2 wires"} ` +
        move.wires
          .map(
            (one) =>
              `${one.ends[0][0]},${one.ends[0][1]} to ${one.ends[1][0]},${one.ends[1][1]} at ` +
              `${one.plan.at[0]},${one.plan.at[1]} as ${one.plan.name}, ${one.plan.turns} ` +
              `turn(s), stretch ${one.plan.stretch}, ${one.plan.order}`,
          )
          .join("; then ") +
        ")"
      )
  }
}

/**
 * The moves `applyMove` can actually apply, in the order given.
 *
 * **IT IS A DECLARED OMISSION AND NOT A SILENT SKIP.** The kinds it drops are
 * exactly `DEFERRED_KINDS`' keys, each of which carries its reason in the
 * record above; nothing is dropped because a gesture failed, and nothing is
 * discovered by catching a refusal.
 */
export function applicableMoves(moves: readonly Move[]): readonly Move[] {
  return moves.filter((move) => !DEFERRED_KINDS.has(move.kind))
}