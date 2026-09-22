import { test, expect } from "bun:test"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { ResolvedNetwork } from "../../lib/model/control-state.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"

const rc: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "in", b: "out" } }] },
    { id: "C1", kind: "capacitor", parameters: { farads: 159.1549431e-9 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "out", b: "0" } }] },
  ],
}

const environment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  supplies: [],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("emits a deck that reproduces the analytic RC response", async () => {
  const [sweep] = await runAcSweep({ netlist: toSpiceNetlist(rc, environment), nodes: ["out"] })
  const corner = sweep.points.find(p => Math.abs(p.frequency - 1000) < 1e-6)
  if (!corner) throw new Error("No sweep point at 1 kHz")
  expect(Math.hypot(corner.real, corner.imaginary)).toBeCloseTo(0.707107, 5)
})

test("maps the declared ground port to SPICE node 0", () => {
  expect(toSpiceNetlist(rc, environment)).toContain("C1 out 0 ")
})

test("refuses a network whose ground port is not declared", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, groundPort: "chassis" }))
    .toThrow("Ground port not present in network: chassis")
})

test("refuses a source or load port that the network does not expose", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, load: { port: "sidechain", ohms: 1e12 } }))
    .toThrow("Load port not present in network: sidechain")
})

const resistiveDivider: ResolvedNetwork = {
  ports: { input: "sig", output: "sig", ground: "0" },
  components: [],
}

const resistiveDividerEnvironment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 1000 },
  load: { port: "output", ohms: 3000 },
  supplies: [],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("wires the source's internal node and series resistor to reproduce a purely resistive divider", async () => {
  const deck = toSpiceNetlist(resistiveDivider, resistiveDividerEnvironment)

  // Node wiring is asserted directly so a swap of the source and series-resistor
  // nodes fails this test even if the divider's numeric result happened to coincide:
  // the source must sit on the internal node, and the series resistor must bridge
  // the internal node to the network's source node ("sig"), not the reverse.
  expect(deck).toMatch(/^V1 n_src_internal 0 AC /m)
  expect(deck).toMatch(/^RSRC n_src_internal sig /m)

  const [sweep] = await runAcSweep({ netlist: deck, nodes: ["sig"] })
  for (const point of sweep.points) {
    const magnitude = Math.hypot(point.real, point.imaginary)
    expect(magnitude).toBeCloseTo(0.75, 9)
  }
})

test("refuses a network whose net collides with the synthetic source-series internal node", () => {
  const colliding: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "n_src_internal" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "n_src_internal", b: "out" } }] },
    ],
  }
  const collidingEnvironment: SimulationEnvironment = {
    source: { port: "input", amplitude: 1, seriesOhms: 50 },
    load: { port: "output", ohms: 1e12 },
    supplies: [],
    sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
    groundPort: "ground",
  }
  expect(() => toSpiceNetlist(colliding, collidingEnvironment))
    .toThrow("Net collides with the synthetic source-series internal node n_src_internal: n_src_internal")
})

/** The emitted-node registry. `sanitize` maps every non-alphanumeric character to "_",
 * and ngspice case-folds node names, so several distinct labelled nets can land on one
 * SPICE node. Silently shorting them is a false PASS in a validation gate: both sides of
 * an unsplit-versus-composed comparison run through the same lossy transform, so the
 * comparison would agree while both decks describe a circuit the model does not.
 */
const collisionEnvironment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  supplies: [],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("refuses two nets that differ only in punctuation and would emit as one node", () => {
  const punctuationCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "lf.mid" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "lf-mid", b: "out" } }] },
    ],
  }
  expect(() => toSpiceNetlist(punctuationCollision, collisionEnvironment))
    .toThrow("Emitted netlist node collision on lf_mid between nets: lf.mid and lf-mid")
})

test("refuses two nets that differ only in case, which ngspice folds together", () => {
  const caseCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "LF_MID" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "lf_mid", b: "out" } }] },
    ],
  }
  expect(() => toSpiceNetlist(caseCollision, collisionEnvironment))
    .toThrow("Emitted netlist node collision on lf_mid between nets: LF_MID and lf_mid")
})

test("refuses a non-ground net named 0, which SPICE reserves for the reference node", () => {
  const groundImpostor: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "gnd" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "0" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "0", b: "out" } }] },
      { id: "R3", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "out", b: "gnd" } }] },
    ],
  }
  expect(() => toSpiceNetlist(groundImpostor, collisionEnvironment))
    .toThrow("Non-ground net emits as the SPICE reference node 0: 0")
})

test("refuses two element references that emit as the same component name", () => {
  // "1" is not prefixed with "R" in the source model but becomes "R1" once the emitter
  // applies the type letter, colliding with the element already named "R1".
  const nameCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "mid" } }] },
      { id: "1", kind: "resistor", parameters: { ohms: 2000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "mid", b: "out" } }] },
    ],
  }
  expect(() => toSpiceNetlist(nameCollision, collisionEnvironment))
    .toThrow("Emitted netlist name collision on R1 between refs: R1 and 1")
})

/* Active devices: per-kind prefixes, per-kind and per-model argument order, and the
 * component/unit lowering that turns one multi-section package into one device line
 * per section. Every fixture below declares all three ports the emitter resolves up
 * front (ground, source, load) and reuses the `environment` fixture above, so a
 * failure here is a device-emission failure and not a port lookup throwing before
 * any device is reached. Net names are lowercase because `sanitize` preserves case:
 * a net named `IN` emits as `IN`, so a regex expecting `in` would never match.
 */

test("a diode emits as a SPICE primitive with anode then cathode", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "clamp", kind: "diode", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { cathode: "0", anode: "in" }, spiceModel: "1N4148" }] },
    ],
  }, environment)
  // The pins are declared cathode-first on purpose: the emitted order must come from
  // SPICE's fixed argument order for a D line, not from the fixture's key order.
  expect(deck).toMatch(/^Dclamp in 0 1N4148$/m)
})

test("a BJT emits collector, base, emitter in SPICE order, not in the kind's vocabulary order", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "stage", kind: "bjt", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { base: "b", collector: "c", emitter: "0" }, spiceModel: "2N3904" }] },
    ],
  }, environment)
  // `unitPins("bjt")` is base, collector, emitter; SPICE's Q line is collector, base,
  // emitter. Emitting the vocabulary order would swap the first two arguments and
  // still produce a deck that simulates cleanly, so the order needs a real assertion.
  expect(deck).toMatch(/^Qstage c b 0 2N3904$/m)
})

test("a unit line sees the component's package pins as well as its own", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "stage", kind: "bjt", parameters: {},
        pins: { emitter: "0" },
        units: [{ name: "MAIN", pins: { collector: "out", base: "in" }, spiceModel: "2N3904" }] },
    ],
  }, environment)
  // A mechanism test: it proves the emitted line is built from
  // { ...component.pins, ...unit.pins }, not from the unit's pins alone. It is not a
  // claim that real BJTs carry package pins.
  expect(deck).toMatch(/^Qstage out in 0 2N3904$/m)
})

test("a unit's own pin wins over a package pin of the same name", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "stage", kind: "bjt", parameters: {},
        pins: { emitter: "0", collector: "package_net" },
        units: [{ name: "MAIN", pins: { collector: "out", base: "in" }, spiceModel: "2N3904" }] },
    ],
  }, environment)
  // Merge precedence asserted by construction rather than by hope: the unit's
  // collector must reach the deck, and the package's must not appear at all.
  expect(deck).toMatch(/^Qstage out in 0 2N3904$/m)
  expect(deck).not.toContain("package_net")
})

test("a photoresistor emits as a plain resistance until a behavioural model replaces it", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "ldr", kind: "photoresistor", parameters: { ohms: 10000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "0" } }] },
    ],
  }, environment)
  expect(deck).toMatch(/^Rldr in 0 1\.000000000000e\+4$/m)
})

test("a dual package emits one line per unit, each named for its unit and sharing the supply", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "u1", kind: "opamp", parameters: {},
      pins: { "v+": "vcc", "v-": "vee" },
      units: [
        { name: "A", pins: { "in+": "ap", "in-": "an", out: "ao" }, spiceModel: "IDEAL_OPAMP" },
        { name: "B", pins: { "in+": "bp", "in-": "bn", out: "bo" }, spiceModel: "IDEAL_OPAMP" },
      ],
    }],
  }, environment)
  // Pins three things at once: the unit-distinguishing name, the argument ORDER (which
  // comes from the model entry, not from the kind), and both sections reaching the same
  // supply nets. A mis-ordered pinOrder produces a silently mis-wired amplifier that
  // still simulates cleanly.
  expect(deck).toMatch(/^Xu1_A ap an ao vcc vee IDEAL_OPAMP$/m)
  expect(deck).toMatch(/^Xu1_B bp bn bo vcc vee IDEAL_OPAMP$/m)
  // Both units reference one model, so its subcircuit must appear exactly once: a
  // duplicated .subckt is a hard ngspice error, and a missing one is an undefined
  // subcircuit reference.
  expect(deck.match(/^\.subckt\s+IDEAL_OPAMP\b/gim)).toHaveLength(1)
})

test("a package pin the model does not declare throws, rather than being dropped", () => {
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "u1", kind: "opamp", parameters: {},
      pins: { "v+": "vcc", "v-": "vee", shield: "chassis" },
      units: [{ name: "MAIN", pins: { "in+": "in", "in-": "0", out: "out" }, spiceModel: "IDEAL_OPAMP" }],
    }],
  }, environment)).toThrow(/u1.*shield/i)
})

test("a pin missing from the emitted kind's order throws, naming it", () => {
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "stage", kind: "bjt", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { collector: "out", base: "in" }, spiceModel: "2N3904" }],
    }],
  }, environment)).toThrow(/stage.*emitter/i)
})

test("a unit with no spiceModel throws rather than emitting a bare line", () => {
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "clamp", kind: "diode", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { anode: "in", cathode: "0" } }],
    }],
  }, environment)).toThrow(/clamp.*no SPICE model/i)
})

test("a multi-unit component names the offending unit as well as the component", () => {
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "u1", kind: "opamp", parameters: {},
      pins: { "v+": "vcc", "v-": "vee" },
      units: [
        { name: "A", pins: { "in+": "ap", "in-": "an", out: "ao" }, spiceModel: "IDEAL_OPAMP" },
        { name: "B", pins: { "in+": "bp", "in-": "bn" }, spiceModel: "IDEAL_OPAMP" },
      ],
    }],
  }, environment)).toThrow(/u1.*"B".*out/i)
})

test("a kind with no emission rule throws rather than silently vanishing from the deck", () => {
  // The final `else` of the kind dispatch. Without it, a kind added later stops being
  // emitted with no signal at all: a complete, well-formed, entirely wrong netlist.
  //
  // A potentiometer is the right probe for it: `resolveNetwork` normally expands one
  // into two resistors, so a pot arriving here IS the "a kind stopped being lowered and
  // nobody noticed" case, and the emitter is the last thing that can say so.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "vol", kind: "potentiometer", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { ccw: "in", wiper: "out", cw: "0" } }],
    }],
  }, environment)).toThrow(/vol.*potentiometer/i)
})

/* Connectors. A screw terminal contributes no device line; a switching jack would, and
 * `kind: "connector"` covers both. So inertness is declared by the PART and the emitter
 * refuses a connector that does not declare it - an unconditional "connectors emit
 * nothing" branch is the silent-drop bug this project has already shipped three times.
 */

test("an inert connector emits no device line at all", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "j1", kind: "connector", parameters: {},
        part: { footprint: "pinrow2", electricallyInert: true }, pins: {},
        units: [{ name: "MAIN", pins: { P1: "in", P2: "0" } }] },
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "out" } }] },
    ],
  }, environment)
  expect(deck).not.toContain("j1")
  // The rest of the deck is untouched, so "emits nothing" means nothing rather than
  // "swallowed the component after it".
  expect(deck).toMatch(/^R1 in out 1\.000000000000e\+3$/m)
})

test("an inert connector still registers its nets, so a collision through one is caught", () => {
  // Nothing is emitted for the connector, but its nets must still take part in
  // collision detection or a net that reaches the deck only through a connector could
  // silently alias another.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "j1", kind: "connector", parameters: {},
        part: { electricallyInert: true }, pins: {},
        units: [{ name: "MAIN", pins: { P1: "lf.mid", P2: "0" } }] },
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "lf-mid", b: "out" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "out" } }] },
    ],
  }, environment)).toThrow("Emitted netlist node collision on lf_mid between nets: lf.mid and lf-mid")
})

test("a connector whose part does not declare inertness throws rather than being assumed inert", () => {
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "j1", kind: "connector", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { tip: "in", sleeve: "0" } }],
    }],
  }, environment)).toThrow(/j1.*electricallyInert/i)
})

test("a connector declaring itself NOT inert throws, naming the kind it belongs in", () => {
  // A switching jack is not an inert connector. The model already expresses contacts
  // that open and close - `kind: "switch"` with a control-state position - and the
  // error says so rather than leaving the author to guess.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "j1", kind: "connector", parameters: {},
      part: { electricallyInert: false }, pins: {},
      units: [{ name: "MAIN", pins: { tip: "in", sleeve: "0" } }],
    }],
  }, environment)).toThrow(/j1.*switch/i)
})

test("an op-amp deck emitted from the model's pin order actually solves in ngspice", async () => {
  // Every other assertion in this section is textual, and a text-only test is exactly
  // how a five-argument call against a three-node subcircuit stayed invisible until
  // someone ran it ("Too many parameters for subcircuit type"). This one runs the deck.
  //
  // It is also sign-sensitive, which a magnitude test alone is not. Transposing the
  // amplifier's inputs (in the model's own .subckt argument list, say, which pinOrder
  // cannot see) turns this follower's negative feedback into positive feedback. The
  // magnitude barely moves - 1e6/(1e6+1) = 0.999999 becomes 1e6/(1e6-1) = 1.000001, and
  // both sit within 5e-6 of unity, so `toBeCloseTo(1, 5)` accepts either. The SIGN of
  // the error does carry the information: a correctly wired follower's closed-loop gain
  // is strictly BELOW unity, a transposed one's is strictly above. Asserting both
  // closeness and strict-below is what distinguishes them. Verified by permuting the
  // .subckt node list against a mocked registry: this test goes red.
  const buffer: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "u1", kind: "opamp", parameters: {},
        pins: { "v+": "vcc", "v-": "vee" },
        units: [{ name: "MAIN", pins: { "in+": "in", "in-": "out", out: "out" }, spiceModel: "IDEAL_OPAMP" }] },
      // The supply rails need a DC path to ground or the matrix is singular; the ideal
      // model is behaviourally indifferent to what they sit at.
      { id: "Rvcc", kind: "resistor", parameters: { ohms: 1 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "vcc", b: "0" } }] },
      { id: "Rvee", kind: "resistor", parameters: { ohms: 1 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "vee", b: "0" } }] },
    ],
  }
  const deck = toSpiceNetlist(buffer, environment)
  // A single-unit component's name carries no unit suffix.
  expect(deck).toMatch(/^Xu1 in out out vcc vee IDEAL_OPAMP$/m)

  const [sweep] = await runAcSweep({ netlist: deck, nodes: ["out"] })
  expect(sweep.points.length).toBeGreaterThan(0)
  for (const point of sweep.points) {
    const magnitude = Math.hypot(point.real, point.imaginary)
    // Unity-gain follower around an open-loop gain of 1e6: 1e6/(1+1e6) ≈ 0.999999.
    expect(magnitude).toBeCloseTo(1, 5)
    // Strictly below unity: negative feedback. Above unity would mean the inputs are
    // transposed somewhere between pinOrder and the subcircuit's own argument list.
    expect(magnitude).toBeLessThan(1)
  }
})

test("a subcircuit-backed kind whose model declares no pin order throws rather than guessing", () => {
  // A diode's .model line carries no pin order, so instantiating one as an op-amp
  // subcircuit has no argument order to read. Guessing one would wire the amplifier
  // at random and still emit a deck.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "u1", kind: "opamp", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "in+": "in", "in-": "0", out: "out" }, spiceModel: "1N4148" }],
    }],
  }, environment)).toThrow(/u1.*1N4148.*no pinOrder/i)
})

/* The zero-ohm short path, restated against the generalised emitter. It predates active
 * devices (a pot section is legitimately zero at a control extreme) and nothing else in
 * the suite names VSHORT, so these pin it down explicitly rather than trusting that the
 * per-kind rewrite left it intact.
 */
test("a zero-ohm resistor still emits as an exact zero-volt source, not a 0-ohm R line", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 0 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "out" } }] },
    ],
  }, environment)
  expect(deck).toMatch(/^VSHORT0 in out DC 0$/m)
})

test("a zero-ohm resistor with both ends on one net emits nothing at all", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 0 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "out", b: "out" } }] },
    ],
  }, environment)
  // A zero-volt source across one node is a shorted VSRC, which ngspice rejects.
  expect(deck).not.toContain("VSHORT")
  expect(deck).not.toContain("R1 ")
})

test("a zero-ohm photoresistor reaches the simulator and is refused there, not shorted", async () => {
  // The emitter deliberately does NOT apply the zero-ohm VSHORT idiom to a
  // photoresistor, because an LDR is never actually zero and a zero is a data defect.
  // What makes that loud rather than silent lives two modules away: ngspice does not
  // reject `Rldr ... 0`, it warns "Value of resistor rldr is too small, set to
  // 1.000000e-12" and continues, and only `genuineErrors`' deny-by-default filter in
  // lib/sim/ac.ts turns that warning into a throw. That filter is documented as
  // expected to grow; broadening it to cover this warning would silently convert a
  // zero-ohm LDR into a short. This test is what goes red if that happens.
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "ldr", kind: "photoresistor", parameters: { ohms: 0 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "out" } }] },
    ],
  }, environment)
  expect(deck).toMatch(/^Rldr in out 0\.000000000000e\+0$/m)
  await expect(runAcSweep({ netlist: deck, nodes: ["out"] })).rejects.toThrow(/rldr/i)
})

test("a diode deck carries the .model text its D line references", () => {
  // Without this, deleting the model-text loop leaves every diode and BJT assertion
  // green while every such deck silently becomes an undefined-model deck. Only the
  // .subckt half of the embedding was pinned before.
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "clamp", kind: "diode", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { anode: "in", cathode: "0" }, spiceModel: "1N4148" }] },
    ],
  }, environment)
  expect(deck).toContain(".model 1N4148")
})

test("a deck referencing two different models embeds both of them", () => {
  const deck = toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "clamp", kind: "diode", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { anode: "in", cathode: "0" }, spiceModel: "1N4148" }] },
      { id: "stage", kind: "bjt", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { collector: "out", base: "in", emitter: "0" }, spiceModel: "2N3904" }] },
    ],
  }, environment)
  expect(deck).toContain(".model 1N4148")
  expect(deck).toContain(".model 2N3904")
})

test("a primitive is as strict as a model about a pin its order does not name", () => {
  // The `shield` test above covers the model-pinOrder branch. The guard is shared, but
  // that primitives are equally strict was asserted nowhere: a package pin a `Q` line
  // has no argument for must throw, not be dropped.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{
      id: "stage", kind: "bjt", parameters: {},
      pins: { emitter: "0", substrate: "chassis" },
      units: [{ name: "MAIN", pins: { collector: "out", base: "in" }, spiceModel: "2N3904" }],
    }],
  }, environment)).toThrow(/stage.*substrate/i)
})

test("a component with no units throws rather than vanishing from the deck", () => {
  // Unreachable through resolveNetwork or validateNetwork, both of which reject it. But
  // every fixture here hand-builds a ResolvedNetwork and bypasses both, and a component
  // that emits no device line at all is the same hazard the kind dispatch's final
  // `else` guards against one line away.
  expect(() => toSpiceNetlist({
    ports: { input: "in", output: "out", ground: "0" },
    components: [{ id: "ghost", kind: "resistor", parameters: { ohms: 1000 }, pins: {}, units: [] }],
  }, environment)).toThrow(/ghost.*no units/i)
})

/* DC supply rails. An active device's supply pins have to be driven by
 * something, and a `SimulationEnvironment` is where that belongs: the circuit
 * is not wrong when its rails float, the DECK is simply missing the power
 * supply the circuit's power connector would be wired to.
 */

const railed: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0", vcc: "vcc", vee: "vee" },
  components: [
    { id: "u1", kind: "opamp", parameters: {},
      pins: { "v+": "vcc", "v-": "vee" },
      units: [{ name: "MAIN", pins: { "in+": "in", "in-": "out", out: "out" }, spiceModel: "GENERIC_OPAMP" }] },
    // Decoupling only: no DC path from either rail to ground.
    { id: "Cvcc", kind: "capacitor", parameters: { farads: 1e-7 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "vcc", b: "0" } }] },
    { id: "Cvee", kind: "capacitor", parameters: { farads: 1e-7 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "vee", b: "0" } }] },
  ],
}

const railedEnvironment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  supplies: [{ port: "vcc", volts: 15 }, { port: "vee", volts: -15 }],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("a declared supply emits a DC source named for its port, on that port's net", () => {
  const deck = toSpiceNetlist(railed, railedEnvironment)
  expect(deck).toMatch(/^VVCC vcc 0 DC 1\.500000000000e\+1$/m)
  expect(deck).toMatch(/^VVEE vee 0 DC -1\.500000000000e\+1$/m)
})

test("a supply port the network does not expose throws, naming it", () => {
  expect(() => toSpiceNetlist(railed, {
    ...railedEnvironment,
    supplies: [{ port: "v_phantom", volts: 9 }],
  })).toThrow("Supply port not present in network: v_phantom")
})

test("a supply on the ground net throws rather than emitting a source shorted across node 0", () => {
  expect(() => toSpiceNetlist(railed, {
    ...railedEnvironment,
    supplies: [{ port: "ground", volts: 9 }],
  })).toThrow(/Supply port "ground" names the ground net/)
})

test("a supply on the LOAD port throws, because it would silently make every gain zero", () => {
  // The one that matters most, and the only one of these guards whose absence produces
  // a wrong NUMBER rather than a failure: the measured node would be held by an ideal
  // DC source whose AC value is zero, so the whole sweep reads exactly 0 with no error
  // raised anywhere. The other guards here are loud on their own; this one is not.
  expect(() => toSpiceNetlist(railed, {
    ...railedEnvironment,
    supplies: [{ port: "output", volts: 15 }],
  })).toThrow(/Supply port "output" names the load net/)
})

test("a supply on the SOURCE port throws rather than putting two sources on one node", () => {
  expect(() => toSpiceNetlist(railed, {
    ...railedEnvironment,
    supplies: [{ port: "input", volts: 15 }],
  })).toThrow(/Supply port "input" names the source net/)
})

test("the same supply port declared twice throws rather than emitting a duplicate source", () => {
  // Two identical V lines is a hard ngspice error ("device already exists"),
  // and two different voltages on one rail is a contradiction. Neither is
  // something to resolve by picking one.
  expect(() => toSpiceNetlist(railed, {
    ...railedEnvironment,
    supplies: [{ port: "vcc", volts: 15 }, { port: "vcc", volts: 12 }],
  })).toThrow("Duplicate supply port: vcc")
})

test("a rail carrying only decoupling capacitance is unsolvable without a declared supply", async () => {
  // The measurement the whole `supplies` field exists for, kept as a test so
  // the field cannot be quietly deleted as unnecessary. Without supplies the
  // two rails have no DC path to the reference node and ngspice abandons the
  // analysis; the error names the offending node.
  const deck = toSpiceNetlist(railed, { ...railedEnvironment, supplies: [] })
  await expect(runAcSweep({ netlist: deck, nodes: ["out"] })).rejects.toThrow(/singular matrix/i)
})

test("the same deck solves once its rails are declared, and the follower's gain lands below unity", async () => {
  const deck = toSpiceNetlist(railed, railedEnvironment)
  const [sweep] = await runAcSweep({ netlist: deck, nodes: ["out"] })
  expect(sweep.points.length).toBeGreaterThan(0)
  for (const point of sweep.points) {
    const magnitude = Math.hypot(point.real, point.imaginary)
    // GENERIC_OPAMP's open-loop gain is 1e4, so a follower sits about 1e-4
    // below unity at low frequency; its 3 MHz gain-bandwidth product widens
    // that to about 5e-4 by the 100 kHz end of this sweep, hence 1% rather
    // than 0.1% closeness. Strictly below unity everywhere, for the same
    // sign-sensitivity reason the IDEAL_OPAMP case above documents.
    expect(magnitude).toBeCloseTo(1, 2)
    expect(magnitude).toBeLessThan(1)
  }
})
