/**
 * EVERY DECLARED BLOCK IS ACCOUNTED FOR ON WHETHER IT STATES WHICH WAY ITS SIGNAL FLOWS.
 *
 * Hand-written 2026-10-26. The owner, after a generated Pultec sheet put every capacitor bank
 * UPSTREAM of the switch that selects it - backwards on all four boards that drew:
 *
 * > *"Why is it possible to not properly declare the signal flow direction without a test failing
 * > loudly?"*
 *
 * and then:
 *
 * > *"build the check or this will certainly happen again. That's why we write tests and install
 * > gates"*
 *
 * **THE ANSWER WAS: FIVE LAYERS EACH SUPPLIED A SILENT DEFAULT, and none of them asked.**
 *
 * 1. `bidirectional` is a first-class `PortDirection` whose own declaration comment calls it
 *    *"the arrow that asserts nothing"* - so a considered "this net really does go both ways" and
 *    an unconsidered "nobody thought about it" are the SAME TOKEN and nothing can tell them apart.
 * 2. `authoringProblems` checks the record is WELL-FORMED - the net exists, the value is legal,
 *    a declared port has an entry - and never that it says anything.
 * 3. `negotiablePort` turns `bidirectional` AND a wholly missing entry into `["left", "right"]`,
 *    citing `docs/known-gaps.md` **G99**'s fifth invention as open and carrying on.
 * 4. `layerConstraintFor` returns `null` for two horizontal sides - the last place anything could
 *    have noticed.
 * 5. `elkInputOf`'s signal-order pass then found no seed and fell back to DECLARATION ORDER,
 *    which drew a confident backwards schematic. **G292**, **G293**.
 *
 * Each step is defensible alone. Together they are the failure this repository's cardinal rule
 * names: a check that did not run, looking exactly like one that passed. The suite was green at
 * 3873 tests over drawings whose signal ran the wrong way.
 *
 * **WHAT THIS GATE DOES, AND WHY IT IS A RATCHET RATHER THAN A REFUSAL.** **50 of 68** declared
 * blocks supply no direction seed today - only **18** state which way signal enters. It was
 * 53/15 before three Pultec section blocks declared `readsFrom`. Refusing them all would stop every board generating and
 * would be a worse artifact than the one it is protecting. Some blocks also legitimately have no
 * inbound signal - a ground-only stand-in group has nothing flowing through it. So this pins the
 * CURRENT set by name: a block that acquires a seed may be removed from the list, and **a NEW
 * block with no seed fails here**, naming itself and saying what to declare. The number can only
 * go down.
 *
 * **IT ALSO PRINTS THE COUNT ON EVERY RUN.** The thing that made this invisible was that nobody
 * had ever seen the figure. **It is not the `7 of 52` an earlier pass reported either** - that
 * counted only blocks ELK draws, and this counts every declared block, which is the population
 * the defect lives in. `15 of 68` existed nowhere until the owner asked the question; it is `18 of 68` now.
 */

import { describe, expect, it } from "bun:test";
import { ALL_DECLARED_CASES } from "../../tools/schgen/board-declarations.ts";
import { negotiablePort } from "../../lib/schgen/authoring.ts";
import { layerConstraintFor } from "../../lib/schgen/elk/options.ts";
import { circuitSpecFrom, nicknamesOf } from "../../lib/schgen/from-network.ts";
import { buildCircuit } from "../../lib/schgen/ir/build.ts";
import { subgraphOf } from "../../lib/schgen/render/blocks.ts";
import { createResolver } from "../../lib/schgen/render/library.ts";
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts";

/** `<case>/<block>`, which is how a block is named in the pinned list below. */
function seedlessBlocks(): { readonly seedless: readonly string[]; readonly total: number } {
  const seedless: string[] = [];
  let total = 0;
  for (const c of ALL_DECLARED_CASES) {
    const symbols = createResolver(symbolLibraries([...nicknamesOf(c.network, c.authoring)].sort()));
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols });
    for (const block of circuit.blocks.values()) {
      total += 1;
      const g = subgraphOf(circuit, block.id, symbols);
      const boundary = [...g.rails, ...g.external];
      // `readsFrom` seeds the layout directly (`lib/schgen/elk/graph.ts`), so it counts here. A
      // gate that measured only the OLD definition of a seed would report a figure that no longer
      // matches what drives the drawing - which is the same shape of defect it exists to catch.
      const hasSeed = block.readsFrom !== null || boundary.some((net) => {
        const port = negotiablePort(net, { portDirections: g.portDirections, rails: [...g.railSpecs.values()] });
        return layerConstraintFor(port.sides) === "FIRST_SEPARATE";
      });
      if (!hasSeed) seedless.push(`${c.name}/${block.id}`);
    }
  }
  return { seedless: seedless.sort(), total };
}

/**
 * Blocks known to supply no direction seed, pinned by name so the set can only shrink.
 *
 * **Every entry here is a block whose layout is ordered by the order somebody declared its parts
 * in.** That is not a neutral default - G292 and G293 record it drawing a capacitor bank upstream
 * of its own switch on four boards. An entry leaves this list by declaring a direction on the net
 * that actually carries signal INTO the block, not by being excused.
 */
const KNOWN_SEEDLESS: readonly string[] = [
  "opamp-buffer/ob-buffer",
  "optical-compressor/oc-audio",
  "optical-compressor/oc-power",
  "optical-compressor/oc-sidechain",
  "pt2399-core/pt-core",
  "pultec-hi-boost/pultec-hi-boost-standin-hi-cut",
  "pultec-hi-boost/pultec-hi-boost-standin-low-boost",
  "pultec-hi-boost/pultec-hi-boost-standin-low-cut",
  "pultec-hi-cut/pultec-hi-cut-standin-low-boost",
  "pultec-hi-cut/pultec-hi-cut-standin-low-cut",
  "pultec-low-boost/pultec-low-boost-standin-hi-cut",
  "pultec-low-boost/pultec-low-boost-standin-low-cut",
  "pultec-low-cut/pultec-low-cut-standin-hi-cut",
  "pultec-low-cut/pultec-low-cut-standin-low-boost",
  "pultec-mid/pultec-mid-standin-hi-cut",
  "pultec-mid/pultec-mid-standin-low-boost",
  "pultec-mid/pultec-mid-standin-low-cut",
  "transistor-preamp-buffered/tp-follower",
  "transistor-preamp-buffered/tp-leg-base-ground",
  "transistor-preamp-buffered/tp-leg-collector",
  "transistor-preamp-buffered/tp-leg-emitter-bypass",
  "transistor-preamp-buffered/tp-leg-feedback",
  "transistor-preamp-buffered/tp-stage",
  "transistor-preamp-feedback/tp-leg-base-ground",
  "transistor-preamp-feedback/tp-leg-collector",
  "transistor-preamp-feedback/tp-leg-emitter-bypass",
  "transistor-preamp-feedback/tp-leg-feedback",
  "transistor-preamp-feedback/tp-stage",
  "transistor-preamp-loop/tp-follower",
  "transistor-preamp-loop/tp-leg-base-ground",
  "transistor-preamp-loop/tp-leg-collector",
  "transistor-preamp-loop/tp-leg-emitter-bypass",
  "transistor-preamp-loop/tp-leg-feedback",
  "transistor-preamp-loop/tp-leg-loop",
  "transistor-preamp-loop/tp-stage",
  "transistor-preamp-staged/tp-follower",
  "transistor-preamp-staged/tp-leg-base-ground",
  "transistor-preamp-staged/tp-leg-character",
  "transistor-preamp-staged/tp-leg-collector",
  "transistor-preamp-staged/tp-leg-emitter-bypass",
  "transistor-preamp-staged/tp-leg-feedback",
  "transistor-preamp-staged/tp-second-stage",
  "transistor-preamp-staged/tp-stage",
  "transistor-preamp/tp-leg-collector",
  "transistor-preamp/tp-leg-emitter-bypass",
  "transistor-preamp/tp-leg-feedback",
  "transistor-preamp/tp-leg-lower-a",
  "transistor-preamp/tp-leg-lower-b",
  "transistor-preamp/tp-leg-upper",
  "transistor-preamp/tp-stage",
];

describe("every declared block is accounted for on signal direction", () => {
  const { seedless, total } = seedlessBlocks();

  it("the sweep sees blocks at all, so an empty result cannot pass as a clean one", () => {
    expect(total).toBeGreaterThan(40);
  });

  it("prints the count, because nobody had ever seen this figure", () => {
    console.log(`direction seed: ${total - seedless.length} of ${total} declared blocks state which way signal enters; ${seedless.length} do not`);
    expect(seedless.length).toBeLessThanOrEqual(total);
  });

  it("NO BLOCK ACQUIRES A SEEDLESS LAYOUT SILENTLY: the set matches the pinned list exactly", () => {
    const added = seedless.filter((b) => !KNOWN_SEEDLESS.includes(b));
    const fixed = KNOWN_SEEDLESS.filter((b) => !seedless.includes(b));
    expect(
      added,
      "these blocks declare no direction on any boundary net, so their layout is ordered by the " +
        "order their parts were declared in - which drew a capacitor bank upstream of its own " +
        "switch (docs/known-gaps.md G292, G293). Declare `in` on the net that carries signal INTO " +
        "the block, or add the block to KNOWN_SEEDLESS with a reason if it genuinely has no " +
        "inbound signal.",
    ).toEqual([]);
    expect(
      fixed,
      "these blocks now DO state a direction, so they must be removed from KNOWN_SEEDLESS - a " +
        "stale exemption is one nobody can tell from a live one",
    ).toEqual([]);
  });
});
