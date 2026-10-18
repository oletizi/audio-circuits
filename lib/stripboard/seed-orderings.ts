/**
 * The five DERIVATION RULES that turn a netlist into a stride ordering, and
 * nothing else.
 *
 * **IT MOVED HERE FROM `tests/stripboard/model/seed-fixtures.ts` ON
 * 2026-10-17, AND THE MOVE IS THE POINT OF THE FILE.** The five rules were
 * written as test fixtures because, until this change, every ordering that
 * produced a board came out of `tools/stripboard/seed-arrangement.ts`'s
 * `assignStrips` and the five existed only to benchmark against. Then
 * `.superpowers/sdd/ordering-sweep-report.md` measured all ten feasible stride
 * orderings on the two Pultec sections that no seed of the reviewed restart
 * schedule can build, and **`part-walk s1` is the ordering `pultec-low-cut`'s
 * committed board is built from**. An ordering that produces a committed
 * artifact may not be defined in `tests/` - a reader asking "what arrangement
 * is this board?" would be sent to a fixture, and `tools/` may not import a
 * test. So the rules live here and `seed-fixtures.ts` re-exports this function;
 * **there is exactly one definition of them** and the benchmark figures every
 * committed test asserts are measured from the same five.
 *
 * **IT IS `lib/stripboard/` AND OBEYS THAT DIRECTORY'S RULES**: it imports
 * nothing from `tools/`, reads no file and spawns nothing. A rule here is a
 * pure function of a `SeedNetlist`.
 *
 * **NONE OF THE FIVE IS A HEURISTIC WITH A CLAIM BEHIND IT.** They are five
 * one-line statements of the order the nets take strips, and `seedsFrom`
 * returns one candidate per ordering with no ranking and no preference
 * (`./seed-homes.ts`). Which of them is cheapest on a given circuit is a
 * MEASUREMENT - the sweep report's tables - and not something this module
 * asserts. Three of the five refuse outright on `pultec-hi-cut` at stride 1,
 * which is the shape of evidence that keeps them from reading as advice.
 */
import type { StrideOrdering } from "./seed-homes.ts"
import { leadsOf, type SeedNetlist } from "./seed-model.ts"

/**
 * The five stride orderings of one netlist at one stride, in a fixed order.
 *
 * - `reference-order` - the nets in the order the netlist carries them;
 * - `degree-descending` / `degree-ascending` - by how many pins the net has,
 *   ties broken by name so the result does not depend on map iteration order;
 * - `part-walk` - each part's nets in turn, first appearance wins, which keeps
 *   a part's two nets near each other;
 * - `alphabetical` - by name.
 *
 * **THE TIE BREAK IS DECLARED AND IS NOT COSMETIC.** `Array.prototype.sort` is
 * stable, so without `localeCompare` the two degree rules would order equal-
 * degree nets by the netlist's own insertion order - a property of how the
 * export was written rather than of the circuit - and two runs over the same
 * board could then disagree about which arrangement `degree-descending s1` IS.
 * A board adopted from a named ordering has to be reproducible from that name.
 *
 * **THE STRIDE IS THE CALLER'S AND IS NOT CHECKED HERE.** `stridedHomes` in
 * `./seed-homes.ts` refuses a stride below 1 by name and refuses one that runs
 * the last net off the stock by name, each with its own reason; a second check
 * here would be a second place for those two refusals to be worded.
 */
export function derivedOrderings(
  netlist: SeedNetlist,
  stride: number,
): readonly StrideOrdering[] {
  const names = [...netlist.nets.keys()]
  const degree = (net: string): number => (netlist.nets.get(net) ?? []).length
  const walk: string[] = []
  for (const part of netlist.parts) {
    for (const lead of leadsOf(part)) if (!walk.includes(lead.net)) walk.push(lead.net)
  }
  return [
    { name: `reference-order s${stride}`, nets: names, stride },
    {
      name: `degree-descending s${stride}`,
      nets: [...names].sort((a, b) => degree(b) - degree(a) || a.localeCompare(b)),
      stride,
    },
    {
      name: `degree-ascending s${stride}`,
      nets: [...names].sort((a, b) => degree(a) - degree(b) || a.localeCompare(b)),
      stride,
    },
    { name: `part-walk s${stride}`, nets: walk, stride },
    { name: `alphabetical s${stride}`, nets: [...names].sort(), stride },
  ]
}

/**
 * One of the five by name, or a refusal naming every rule this module has.
 *
 * **WHY A LOOKUP EXISTS AT ALL.** A board is adopted from an ordering a person
 * NAMED - *"low-cut: part-walk-s1"* - so something has to turn that name into
 * the ordering, and the alternative is a caller picking an index out of
 * `derivedOrderings`, which would make "the fourth one" the thing a run
 * directory's provenance rests on. It refuses an unknown name rather than
 * returning `undefined` or falling back to the first: an ordering that silently
 * became a different ordering would produce a board nobody chose, graded
 * perfectly, under a name that reads as the one that was asked for.
 */
export function strideOrderingNamed(
  netlist: SeedNetlist,
  stride: number,
  name: string,
): StrideOrdering {
  const all = derivedOrderings(netlist, stride)
  const found = all.find((entry) => entry.name === name)
  if (found === undefined) {
    throw new Error(
      `stripboard-ordering-not-a-rule: "${name}" is not one of the stride orderings this ` +
        `netlist derives at a stride of ${stride}. It is NOT defaulted to the first rule and ` +
        "no near match is accepted: the ordering's name is what a run directory records as the " +
        "arrangement its board came from, so a name that quietly became a different ordering " +
        "would put a board nobody chose under that provenance. The rules at this stride are:\n" +
        `${all.map((entry) => `  ${entry.name}`).join("\n")}\n` +
        "The rules themselves are in lib/stripboard/seed-orderings.ts; the stride is the " +
        "caller's and only 1 and 2 are feasible on a 14-net Pultec section (see " +
        "lib/stripboard/seed-homes.ts's ordering-off-board).",
    )
  }
  return found
}
