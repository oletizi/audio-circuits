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
 */
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
      readonly kind: "add-wire"
      readonly at: readonly [number, number]
      readonly ends: readonly [readonly [number, number], readonly [number, number]]
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

/**
 * Every kind, once, in the order `enumerateMoves` emits them. The one listing:
 * `tests/stripboard/moves.test.ts` holds the enumeration against it, so an
 * eighth kind added to `Move` without an arm in `applyMove` is a compile error
 * and a kind that stops being enumerated is a test failure.
 */
export const MOVE_KINDS: readonly Move["kind"][] = [
  "move",
  "rotate",
  "stretch",
  "add-wire",
  "delete-wire",
  "cluster",
  "gather",
]

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
    "add-wire",
    "a one-gesture add-wire cannot join two strips, measured on the import-placed low-boost " +
      "board with the pinned binary. TWO facts, both from the fork: (1) the wire anchors only at " +
      "a FREE hole - `--author --op add-wire --at 1,0` is refused with \"the wire could not be " +
      'placed at that position (it is floating)" because a part\'s footprint occupies that hole, ' +
      "and this enumeration anchors at a PIN hole, which is the only kind of hole it can " +
      "identify as belonging to a net; and (2) a freshly created wire is 1x3 ALONG THE ROW - " +
      "`--at 10,10` on a free hole yields `WIRE Wire1 AT 10,10 ENDS 10,10 10,12` - so under " +
      "horizontal strips it joins one strip to itself and connects nothing. Making it useful " +
      "needs the wire turned across the strips and stretched to reach, which is three gestures " +
      "in one candidate; or a fork change letting --op add-wire name both ends. **THE COMPOUND " +
      "GESTURE IS NO LONGER WHAT BLOCKS IT, AND THAT IS WORTH SAYING NOW THAT THE CLUSTER MOVE " +
      "EXISTS**: a cluster is several gestures in one candidate and it works, so a reader could " +
      "reasonably ask why this one does not follow. The answer is the occupancy. " +
      "./moves-cluster.ts sequences PART translations and checks each one against the carried " +
      "occupancy, and a WIRE's holes are not in the occupancy at all - occupancyOf builds rects " +
      "from PART and PIN lines only - so there is no model that could say whether a turned, " +
      "stretched wire lands clear of anything. Giving it one is a change to seed-geometry.ts " +
      "with the fork's own wire arithmetic transcribed into it, not a reuse of the cluster's " +
      "sequencing. It is still ENUMERATED, so the move set in the record stays the spec's",
  ],
  [
    "delete-wire",
    "no verb in the pinned fork deletes a placed component. The shipped verbs are --adopt, " +
      "--check, --dump-board, --dump-netlist, --import, --move, --move-batch, --rotate, " +
      "--update, --set-strips and --stretch, and the test-only --author takes group, select, " +
      "move-label, add-wire, merge and autofill - none of the seventeen removes a wire. Fixing " +
      "it is a change to the fork (a --author --op delete op over Board's component removal, " +
      "with the same effect check --op add-wire makes), not a change to this module",
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
      return (
        `add-wire at ${move.at[0]},${move.at[1]} joining ${move.ends[0][0]},${move.ends[0][1]} ` +
        `to ${move.ends[1][0]},${move.ends[1][1]}`
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