/**
 * **THE FIXTURE SCHEMATICS TASK 5's ARMS ARE DRIVEN ON, BUILT HERE SO THE ONE-DIFFERENCE PROPERTY
 * IS MACHINE-CHECKABLE.**
 *
 * Research apparatus for Task 5 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **It changes no production code
 * and nothing in `lib/` reads it.**
 *
 * **WHY FIXTURES AND NOT THIS REPOSITORY'S OWN BOARDS.** Step 2 has to rotate, slide, move and
 * reroute a global label, which means editing a `.kicad_sch`. Everything under `circuits/` is an
 * authored source and the plan's Global Constraints forbid touching it. A two-symbol fixture that
 * isolates one relation is also better evidence than a mutation of a real board, because a reader
 * can see what it tests.
 *
 * **EVERY ARM IS ITS BASE PLUS ONE EDIT, AND THAT IS ASSERTED RATHER THAN CLAIMED.** An arm is a
 * function from the base's item list to a new item list; the probe prints the line-level difference
 * between the two rendered files and `tests/schgen/label-freedom/fixtures.test.ts` pins it. An arm
 * that quietly changed two things would be two measurements wearing one name.
 *
 * **THE SYMBOL IS THE FIXTURE'S OWN, EMBEDDED, so no external library is needed and no committed
 * schematic is read.** `Fixture:R2`'s geometry is transcribed from the `Device:R` entry embedded in
 * `circuits/transistor-preamp/loop-board.kicad_sch` - a 2.54 mm body box with passive pins at
 * +/-3.81 mm - and nothing else was carried across. Pin 1 is the symbol's `+3.81` pin, which lands
 * at `at.y - 3.81` on the sheet (symbol Y is up, sheet Y is down); that mapping is confirmed by the
 * netlists the probe exports, not assumed.
 */

/** One line of a sheet's body. `kind` lets an arm find the item it means without matching text. */
export interface Item {
  readonly kind: "symbol" | "wire" | "junction" | "label"
  /** A name unique within one fixture, so an arm names what it edits. */
  readonly id: string
  readonly text: string
}

const E = "(effects (font (size 1.27 1.27)))"

/** The fixture's own 2-pin symbol, embedded in every sheet so no library is resolved. */
const FIXTURE_SYMBOL = `\t\t(symbol "Fixture:R2"
\t\t\t(pin_numbers (hide yes))
\t\t\t(pin_names (offset 0))
\t\t\t(exclude_from_sim no)
\t\t\t(in_bom yes)
\t\t\t(on_board yes)
\t\t\t(property "Reference" "R" (at 2.032 0 90) ${E})
\t\t\t(property "Value" "R2" (at 0 0 90) ${E})
\t\t\t(property "Footprint" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(property "Datasheet" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(symbol "R2_0_1"
\t\t\t\t(rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
\t\t\t)
\t\t\t(symbol "R2_1_1"
\t\t\t\t(pin passive line (at 0 3.81 270) (length 1.27) (name "" ${E}) (number "1" ${E}))
\t\t\t\t(pin passive line (at 0 -3.81 90) (length 1.27) (name "" ${E}) (number "2" ${E}))
\t\t\t)
\t\t)`

/**
 * UUIDs are derived from the item's id, not generated.
 *
 * **A random UUID would make every rendered fixture differ from the committed one on every run**,
 * so the derived-artifact comparison in `fixtures.test.ts` could only ever be by timestamp - which
 * `CLAUDE.md` forbids. This is a 32-hex-digit hash of the fixture name and the item id, formatted
 * as a v4 UUID, so the same item in the same fixture always carries the same uuid and a diff
 * between two arms shows only what the arm changed.
 */
function derivedUuid(fixture: string, id: string): string {
  // FNV-1a over the key, four times with different seeds: enough to key a fixture's handful of items.
  const key = `${fixture}/${id}`
  const words = [0x811c9dc5, 0x01000193, 0xdeadbeef, 0x5bd1e995].map((seed) => {
    let h = seed >>> 0
    for (let i = 0; i < key.length; i += 1) {
      h = (h ^ key.charCodeAt(i)) >>> 0
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, "0")
  })
  const hex = words.join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export type Pt = readonly [number, number]

interface Builder {
  readonly symbol: (id: string, ref: string, p: Pt) => Item
  readonly wire: (id: string, a: Pt, b: Pt) => Item
  readonly junction: (id: string, p: Pt) => Item
  readonly label: (id: string, net: string, p: Pt, angle: number, justify: string) => Item
}

function builderFor(fixture: string): Builder {
  const u = (id: string): string => derivedUuid(fixture, id)
  return {
    symbol: (id, ref, p) =>
      ({
        kind: "symbol",
        id,
        text: `\t(symbol (lib_id "Fixture:R2") (at ${p[0]} ${p[1]} 0) (unit 1) (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no) (uuid "${u(id)}")
\t\t(property "Reference" "${ref}" (at ${p[0] + 5.08} ${p[1] - 1.27} 0) ${E})
\t\t(property "Value" "1k" (at ${p[0] + 5.08} ${p[1] + 1.27} 0) ${E})
\t\t(pin "1" (uuid "${u(`${id}:pin1`)}"))
\t\t(pin "2" (uuid "${u(`${id}:pin2`)}"))
\t\t(instances (project "${fixture}" (path "/${derivedUuid(fixture, "sheet")}" (reference "${ref}") (unit 1))))
\t)`,
      }) satisfies Item,
    wire: (id, a, b) =>
      ({
        kind: "wire",
        id,
        text: `\t(wire (pts (xy ${a[0]} ${a[1]}) (xy ${b[0]} ${b[1]})) (stroke (width 0) (type default)) (uuid "${u(id)}"))`,
      }) satisfies Item,
    junction: (id, p) => ({ kind: "junction", id, text: `\t(junction (at ${p[0]} ${p[1]}) (diameter 0) (color 0 0 0 0) (uuid "${u(id)}"))` }) satisfies Item,
    label: (id, net, p, angle, justify) =>
      ({
        kind: "label",
        id,
        text: `\t(global_label "${net}" (shape bidirectional) (at ${p[0]} ${p[1]} ${angle}) (effects (font (size 1.27 1.27)) (justify ${justify})) (uuid "${u(id)}"))`,
      }) satisfies Item,
  }
}

export function render(fixture: string, items: readonly Item[]): string {
  return `(kicad_sch
\t(version 20260306)
\t(generator "task-5-label-freedom-probe")
\t(generator_version "10.0")
\t(uuid "${derivedUuid(fixture, "sheet")}")
\t(paper "A4")
\t(lib_symbols
${FIXTURE_SYMBOL}
\t)
${items.map((i) => i.text).join("\n")}
\t(sheet_instances (path "/" (page "1")))
\t(embedded_fonts no)
)
`
}

/**
 * **FIXTURE A: one net held together by WIRES, carrying a global label on a free tail.**
 *
 * Three symbols in a row. `SIGNAL` joins R1.1, R2.1 and R3.1 along a horizontal run at y=38.1 with
 * a tail to the left that the label sits on; `RETURN` joins the three pin-2s the same way below.
 * The net's identity does not depend on the label's name - the wires already connect the three pins
 * - which is what makes arm `a5-rename` able to separate naming from identity.
 */
export function fixtureA(): readonly Item[] {
  const b = builderFor("a-wired-net")
  const xs = [50.8, 76.2, 101.6] as const
  const refs = ["R1", "R2", "R3"] as const
  return [
    ...xs.map((x, i) => b.symbol(`sym-${refs[i]}`, refs[i] ?? "", [x, 50.8])),
    ...xs.map((x, i) => b.wire(`sig-stub-${i}`, [x, 46.99], [x, 38.1])),
    b.wire("sig-run-0", [50.8, 38.1], [76.2, 38.1]),
    b.wire("sig-run-1", [76.2, 38.1], [101.6, 38.1]),
    b.wire("sig-tail", [38.1, 38.1], [50.8, 38.1]),
    b.junction("sig-j0", [50.8, 38.1]),
    b.junction("sig-j1", [76.2, 38.1]),
    b.label("sig-label", "SIGNAL", [38.1, 38.1], 180, "right"),
    ...xs.map((x, i) => b.wire(`ret-stub-${i}`, [x, 54.61], [x, 63.5])),
    b.wire("ret-run-0", [50.8, 63.5], [76.2, 63.5]),
    b.wire("ret-run-1", [76.2, 63.5], [101.6, 63.5]),
    b.wire("ret-tail", [38.1, 63.5], [50.8, 63.5]),
    b.junction("ret-j0", [50.8, 63.5]),
    b.junction("ret-j1", [76.2, 63.5]),
    b.label("ret-label", "RETURN", [38.1, 63.5], 180, "right"),
  ]
}

/**
 * **FIXTURE B: two wire runs that touch nothing, joined ONLY by two global labels with the same
 * name.** This is the negative control's base, and the whole point of it is that `BRIDGE`'s name is
 * the only thing making R1.1 and R2.1 one net. R1.2 and R2.2 get distinct names so nothing else can
 * merge.
 */
export function fixtureB(): readonly Item[] {
  const b = builderFor("b-label-bridge")
  return [
    b.symbol("sym-R1", "R1", [50.8, 50.8]),
    b.symbol("sym-R2", "R2", [101.6, 50.8]),
    b.wire("a-stub", [50.8, 46.99], [50.8, 38.1]),
    b.wire("a-tail", [38.1, 38.1], [50.8, 38.1]),
    b.label("a-label", "BRIDGE", [38.1, 38.1], 180, "right"),
    b.wire("b-stub", [101.6, 46.99], [101.6, 38.1]),
    b.wire("b-tail", [101.6, 38.1], [114.3, 38.1]),
    b.label("b-label", "BRIDGE", [114.3, 38.1], 0, "left"),
    b.wire("a-ret", [50.8, 54.61], [50.8, 63.5]),
    b.label("a-ret-label", "RET_A", [50.8, 63.5], 270, "right"),
    b.wire("b-ret", [101.6, 54.61], [101.6, 63.5]),
    b.label("b-ret-label", "RET_B", [101.6, 63.5], 270, "right"),
  ]
}

/** Replace the one item with this id, or throw: an arm that edits nothing is an arm that measured nothing. */
function edit(items: readonly Item[], id: string, to: (i: Item) => Item): readonly Item[] {
  const hits = items.filter((i) => i.id === id)
  if (hits.length !== 1) throw new Error(`fixture arm names item "${id}", which matches ${hits.length} item(s); an arm must edit exactly one`)
  return items.map((i) => (i.id === id ? to(i) : i))
}

/** Replace the one item with this id by `to`, in place, or throw. `to` may hold more than one item. */
function expand(items: readonly Item[], id: string, to: readonly Item[]): readonly Item[] {
  const at = items.findIndex((i) => i.id === id)
  if (at < 0 || items.filter((i) => i.id === id).length !== 1) {
    throw new Error(`fixture arm expands item "${id}", which matches ${items.filter((i) => i.id === id).length} item(s); an arm must expand exactly one`)
  }
  return [...items.slice(0, at), ...to, ...items.slice(at + 1)]
}

export interface Arm {
  readonly name: string
  readonly fixture: string
  readonly base: string
  /** What is varied, in the brief's own words. */
  readonly freedom: string
  readonly items: readonly Item[]
  /** What the brief predicts, written down before the run. */
  readonly predictedIdentity: "unchanged" | "changed"
  readonly predictedNaming: "unchanged" | "changed"
}

const A_BASE = fixtureA()
const B_BASE = fixtureB()
const aBuilder = builderFor("a-wired-net")
const bBuilder = builderFor("b-label-bridge")

/**
 * The arms, each named by the brief's own word for the freedom it drives.
 *
 * **THE PREDICTIONS ARE PART OF THE ARM** and are printed before the netlists are exported, because
 * a figure asserted after a run is unfalsifiable (the plan's own standard, and Task 4 caught an
 * arithmetic error by publishing a prediction first).
 */
export const ARMS: readonly Arm[] = [
  {
    name: "a0-base",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "none - the base every A arm is one edit from",
    items: A_BASE,
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "a1-rotate",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "freedom 1: the label's orientation, rotated in place from angle 180 to angle 0",
    items: edit(A_BASE, "sig-label", () => aBuilder.label("sig-label", "SIGNAL", [38.1, 38.1], 0, "left")),
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "a2-slide",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "freedom 2: the anchor slid along the SAME wire segment, from its end (38.1) to its interior (44.45)",
    items: edit(A_BASE, "sig-label", () => aBuilder.label("sig-label", "SIGNAL", [44.45, 38.1], 180, "right")),
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "a3-move-segment",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "freedom 4: the anchor moved to a DIFFERENT segment of the same net - the interior of R3's vertical stub",
    items: edit(A_BASE, "sig-label", () => aBuilder.label("sig-label", "SIGNAL", [101.6, 43.18], 180, "right")),
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "a4-reroute",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "freedom 3: the wire under the label rerouted from one straight segment into a three-segment dogleg; the anchor does not move",
    items: expand(A_BASE, "sig-tail", [
      aBuilder.wire("sig-tail", [38.1, 38.1], [38.1, 30.48]),
      aBuilder.wire("sig-tail-b", [38.1, 30.48], [50.8, 30.48]),
      aBuilder.wire("sig-tail-c", [50.8, 30.48], [50.8, 38.1]),
    ]),
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "a5-rename-wired",
    fixture: "a-wired-net",
    base: "a0-base",
    freedom: "the discriminator's first half: the label RENAMED on a net the wires already hold together",
    items: edit(A_BASE, "sig-label", () => aBuilder.label("sig-label", "SIGNAL_RENAMED", [38.1, 38.1], 180, "right")),
    predictedIdentity: "unchanged",
    predictedNaming: "changed",
  },
  {
    name: "b0-base",
    fixture: "b-label-bridge",
    base: "b0-base",
    freedom: "none - the base the negative control is one edit from",
    items: B_BASE,
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
  {
    name: "b1-rename-bridge",
    fixture: "b-label-bridge",
    base: "b0-base",
    freedom: "THE NEGATIVE CONTROL: one of the two matching labels renamed, on two wire runs that touch nothing else",
    items: edit(B_BASE, "b-label", () => bBuilder.label("b-label", "BRIDGE_B", [114.3, 38.1], 0, "left")),
    predictedIdentity: "changed",
    predictedNaming: "changed",
  },
  {
    name: "b2-rotate",
    fixture: "b-label-bridge",
    base: "b0-base",
    freedom: "freedom 1 on the bridged net: one of the two matching labels rotated in place, its name untouched",
    items: edit(B_BASE, "b-label", () => bBuilder.label("b-label", "BRIDGE", [114.3, 38.1], 90, "left")),
    predictedIdentity: "unchanged",
    predictedNaming: "unchanged",
  },
]
