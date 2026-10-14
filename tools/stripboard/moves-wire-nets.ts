/**
 * WHICH `add-wire` A NET'S OWN SPLIT ADMITS: where a net's pins sit along the
 * strips they occupy, and one candidate per pair of strips it is split across.
 *
 * **SPLIT FROM `./moves-wire.ts` FOR THE 500-LINE CEILING, AT THE PLANNER SEAM
 * THAT FILE ALREADY HAD**: that one answers *how one wire is shaped* - the
 * anchor arithmetic, the two gesture orders, the occupancy a plan leaves - and
 * this one answers *which wires does this board's netlist ask for*. The same
 * division as `./moves-space-measure.ts` / `./moves-space.ts` and
 * `./moves-model.ts` / `./moves.ts`. `./moves.ts` re-exports `wireMovesFor`, so
 * it stays the module every consumer imports.
 *
 * **IT IS ITS OWN FILE BECAUSE THE NET-MEMBERSHIP QUESTION GREW A PAD IN IT, AND
 * THAT WAS THE BLOCKER.** `netPinsAlongStrips` below walks `dump.pins`, so it
 * has always SEEN an off-board pad's hole, and it gated that hole out on the
 * spelling: it built its wanted set from the reference netlist, which names a
 * pad's pin the EXPORT's way (`SW_LO_BOOST.3`), and tested it against the `PIN`
 * line's own id, which names it the BOARD's way (`SW_LO_BOOST_3.1`). The lookup
 * missed for every pad on every board.
 *
 * **WHAT THAT COST, MEASURED RATHER THAN ARGUED.**
 * `docs/stripboard/pipeline-verification.md` §12 is the measurement and §12.6 is
 * this fix's own re-measurement. On the low-boost `import` arm:
 *
 *   1. `wireMovesFor` admitted **ZERO** `add-wire` candidates - on the start
 *      board, on the before board and on the after board - and the trace of
 *      19,997 scored candidates contained no `add-wire` entry at all. `W = 0`
 *      was therefore **not the objective declining a wire; nothing offered
 *      one**, and §6.9's 7,417 counted `add-wire` candidates stopped describing
 *      this pipeline the moment `WIRE_END_REACH` began governing the kind.
 *   2. All seven still-open nets were shape (b), *no wire plannable* - none was
 *      a wire rejected on cost and none was parts unplaced.
 *   3. Task 2's spacing gesture CREATED the repairable nets: it moved the
 *      selector pads onto strips 6, 7 and 8, which splits `j10_p2`, `j10_p3` and
 *      `j10_p4` across two strips - exactly the shape a wire repairs - and this
 *      function could not see that it had.
 *
 * **THE BRIDGE IS `PadLine.source` AND NOTHING ELSE.** A `PAD` line's
 * `FROM <ref>.<pin>` field is ALREADY in the export's spelling, and a placed pad
 * prints exactly one `PIN` line, so `wanted.has(pad.source)` is the whole
 * membership test. All ten of `tests/fixtures/stripboard/pultec-low-boost-imported.dump`'s
 * `source` fields were confirmed present in the frozen export.
 * `./pad-provenance.ts`'s `referencePinHoles` is deliberately NOT used: it is
 * keyed the other way round, by reference pin, and reaching for it here would
 * key this question backwards without saying so.
 *
 * **WHAT THE TRANSLATION DOES NOT BUY, STATED BECAUSE IT IS EASY TO READ THE
 * OPPOSITE.** Seeing a pad's hole is necessary and nowhere near sufficient. On
 * the committed imported board this function's answer for `j10_p2` goes from
 * `{0: [5]}` to `{0: [5, 28]}` - the pad is now IN the net, and the net is still
 * on ONE strip, so there is still no pair to bridge and still no candidate.
 * `--import` packs row 0 from column 0 to column 32, so a wire end cannot reach
 * a row-0 pin either: `WIRE_END_REACH` is one hole and every hole beside those
 * pins is another part's. **The gesture that splits a net across two strips and
 * the translation that lets a wire see the split are both required**, which is
 * why this landed after Task 2 rather than beside it.
 */
import type { BoardDump } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Move } from "./moves-model.ts"
import { nextWireName, wireBridge, wireEndLines, wireStretchBound } from "./moves-wire.ts"
import { padLines } from "./pad-provenance.ts"
import type { Occupancy } from "./seed-geometry.ts"

/**
 * Each placed pad's reference pin, keyed by the pad's BOARD ref - the one
 * translation between what a `PIN` line calls a pad and what the netlist does.
 *
 * A FLOATING PAD IS LEFT OUT because it prints no `PIN` line at all, so it
 * contributes no hole to walk and has no strip to be on. That is
 * `./movable.ts`'s own exclusion and `referencePinHoles`' - there it is recorded
 * as the honest report, since the reference pin then refuses as
 * `reference-pin-not-on-board` in `./equivalence.ts` rather than being quietly
 * absent here.
 *
 * It re-reads the `PAD` lines per call, as `./movable.ts` records doing and for
 * the reason recorded there: `padLines` is 0.02 ms against four fork spawns per
 * evaluation at roughly 11.7 ms each, and a cache would have to be invalidated
 * per candidate. `wireMovesFor` calls this once per net - fourteen times on the
 * low-boost board.
 */
function placedPadSources(dumpText: string): ReadonlyMap<string, string> {
  const sources = new Map<string, string>()
  for (const pad of padLines(dumpText)) {
    if (pad.placement === "floating") continue
    const source = pad.source
    if (source === undefined) {
      throw new Error(
        `netPinsAlongStrips: the placed PAD ${pad.ref} says NOPROVENANCE ("${pad.line}"), so the ` +
          "dump names no reference pin for the hole it occupies and nothing on this board says " +
          "which net that hole is on. It is NOT treated as a pad on no net: this function " +
          "decides which strips a net is SPLIT ACROSS, so a pad silently dropped here is a net " +
          "that looks whole, an `add-wire` that is never proposed, and a board the completion " +
          "pass reports as unrepairable for a reason it cannot name - which is the exact defect " +
          "this function was fixed for. Re-export the board from the schematic so the PAD line " +
          "carries FROM <ref>.<pin> (tools/stripboard/pad-provenance.ts reads that field and " +
          "refuses the same condition as pad-without-provenance), or hand this a board whose " +
          "pads are provenanced.",
      )
    }
    sources.set(pad.ref, source)
  }
  return sources
}

/**
 * Where a net's pins sit ALONG each strip, keyed by strip - the dump's `PIN`
 * lines read through the reference netlist, a pad's through its `FROM` field.
 *
 * A wire end may land only beside a pin of the net it joins, so an enumerator
 * needs the along-strip positions and not merely which strips are occupied.
 * `wireMovesFor` below is the only caller.
 *
 * **A PAD'S HOLE IS KEYED THE BOARD'S WAY AND ITS NET THE NETLIST'S**, so for a
 * pad ref the `FROM` field is asked and the `PIN` line's own id is not: the
 * board's name for a pad is not a name the netlist has, so testing it could only
 * ever miss. `./moves-space-measure.ts`'s `netOfHoles` makes the same
 * substitution for the same reason; the two are not shared because that one
 * tolerates a pad with no provenance (its measure is defined over nets, and such
 * a pad simply gets no gesture) while this one refuses, as `placedPadSources`
 * above explains.
 */
export function netPinsAlongStrips(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
  net: string,
): ReadonlyMap<number, readonly number[]> {
  const wanted = new Set(reference.get(net) ?? [])
  const padSource = placedPadSources(dumpText)
  const byStrip = new Map<number, number[]>()
  for (const [ref, own] of Object.entries(dump.pins)) {
    const source = padSource.get(ref)
    if (source !== undefined && own.length !== 1) {
      throw new Error(
        `netPinsAlongStrips: the placed PAD ${ref} has ${own.length} PIN lines on this board, ` +
          "and a PADS<n> component expands into n ONE-HOLE pads (the measurement is in " +
          "tools/stripboard/pad-provenance.ts), so exactly one is expected. It is NOT resolved " +
          `by taking the first: every one of those holes would be attributed to ${source}, so a ` +
          "net would appear split across strips it is not on and a wire would be planned to " +
          "bridge a split that does not exist. Fix the PAD/PIN pair in the source .vrt, or widen " +
          "PadLine to carry several holes with a measurement of what a wire end beside each of " +
          "them does beside it.",
      )
    }
    for (const pin of own) {
      if (!wanted.has(source ?? `${ref}.${pin.pin}`)) continue
      const strip = stripOf(pin, dump.verticalStrips)
      const along = dump.verticalStrips ? pin.row : pin.col
      const holes = byStrip.get(strip) ?? []
      holes.push(along)
      byStrip.set(strip, holes)
    }
  }
  return byStrip
}

/**
 * Every `add-wire` the model admits: for each net in the NETLIST's order, for
 * each PAIR of distinct strips its on-board pins occupy, one wire bridging that
 * pair at the first line of holes that takes it.
 *
 * **IT IS ENUMERATED OVER THE NET'S OWN STRIP PAIRS, which is what makes a wire
 * a repair rather than a decoration.** A wire's whole purpose in the cost
 * identity is to join two of a net's segments, so the pairs that matter are the
 * strips the net is already split across. A pair further apart than the fork
 * will stretch a wire (16 holes) is not proposed.
 *
 * **ONE CANDIDATE PER PAIR, AT THE FIRST LINE THAT FITS, ascending** - and the
 * narrowing is an equivalence rather than a budget: a strip conducts along its
 * whole length, so two wires bridging the same pair at different lines join the
 * same two strips and score the same `W`. What differs is which holes they take
 * from later gestures and what they do to the occupied extent `HC6` measures,
 * and NEITHER is modelled here - so "the first that fits" is a declared choice
 * whose cost is unmeasured, exactly as `UNIT_DELTAS` says of its own
 * neighbourhood.
 *
 * **ITS ENDS LAND BESIDE THE NET'S OWN PINS, AND THAT REPLACED "THE FIRST LINE
 * THAT FITS".** The line is chosen by `wireEndLines` - within `WIRE_END_REACH`
 * of a pin of this net on EACH of the two strips, tightest first - rather than
 * by walking every line of the board until the geometry admits one. The old
 * rule was measured: it proposed wires whose ends sat on whatever copper
 * happened to be at that line, and the fork refused **103 of 187 of them**
 * (55%) with *"its two ends are no longer on one net"* - a short, not a cost,
 * and a candidate no acceptance key ever saw. `WIRE_END_REACH` carries the
 * measurement and the rule's own limit.
 *
 * **WHAT IT STILL DOES NOT CHECK:** whether a CUT sits between the end hole and
 * the pin beside it. Cuts are `AutoFillVero`'s and exist only after the
 * candidate is painted, so the reach rule is necessary and not sufficient, and a
 * candidate the fork still refuses is still counted as unscoreable. A pair of
 * strips with no line serving both ends yields NO candidate here - which is the
 * shape `./moves-join.ts`'s elbow exists for, and this kind does not plan one:
 * a lone wire that cannot reach the net's own copper joins nothing at all.
 */
export function wireMovesFor(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly Move[] {
  const name = nextWireName(dump.wires.length)
  const bound = wireStretchBound()
  const moves: Move[] = []
  for (const [net] of reference) {
    const alongByStrip = netPinsAlongStrips(dump, dumpText, reference, net)
    const ordered = [...alongByStrip.keys()].sort((a, b) => a - b)
    for (let first = 0; first < ordered.length; first += 1) {
      for (let second = first + 1; second < ordered.length; second += 1) {
        const from = ordered[first]
        const to = ordered[second]
        if (from === undefined || to === undefined) continue
        if (!bound.stretchable || to - from + 1 > bound.maxLength) continue
        // THE LINES THE NET'S OWN PINS CAN BE REACHED AT, not every line of the
        // board: see WIRE_END_REACH for the 103-of-187 measurement that put this
        // call here.
        const lines = wireEndLines(dump, alongByStrip.get(from) ?? [], alongByStrip.get(to) ?? [])
        for (const along of lines) {
          const bridge = wireBridge(occupancy, dump, name, from, to, along)
          if (bridge === undefined) continue
          moves.push({ kind: "add-wire", net, ends: bridge.ends, plan: bridge.plan })
          break
        }
      }
    }
  }
  return moves
}
