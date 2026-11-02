/**
 * `referencePinHoles` and the four `PAD` refusals version 2 of HC8's geometry
 * contract brought with it.
 *
 * EVERY BOARD HERE IS HAND-WRITTEN DUMP TEXT, for the reason Task 4's
 * equivalence tests are: that is the module's real input seam, and the four
 * faults below cannot be produced by the pinned fork at all - a fork that
 * emitted an unreadable `PAD` line would be the grammar change the refusal
 * exists to report. The one real board carrying `PAD` lines is the frozen
 * low-boost fixture, and `tests/stripboard/agreement.test.ts` drives the
 * happy path over it.
 */
import { test, expect } from "bun:test"
import { referencePinHoles } from "../../tools/stripboard/pad-provenance.ts"

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/**
 * One strip, two holes, one resistor and one pad standing in for an off-board
 * terminal. `R1.1` is an ordinary part pin; the pad at `0,1` is the netlist's
 * `SW.2`, which is the whole point - the board calls it `SW_2`.
 */
const WITH_PAD = [
  "GRID 1 2",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
  "PIN R1 1 AT 0,0",
  "PIN SW_2 1 AT 0,1",
].join("\n")

test("a pad's hole is keyed by the reference pin it came from, not by its board name", () => {
  // MUTATION RUN: with the re-keying loop made a no-op (iterated over `[]`),
  // this fails with 'Expected: "0,1" / Received: undefined' on SW.2 - the map
  // holding R1.1 alone, because the pad's own pin is excluded from the first
  // loop and nothing puts it back. Four other tests in this file fail with
  // it, since that loop also raises three of the four PAD refusals.
  // Reverted.
  const holes = referencePinHoles(WITH_PAD)
  expect(holes.get("SW.2")).toBe("0,1")
  expect(holes.get("R1.1")).toBe("0,0")
  // The board's own name for the pad is NOT also in the map: one hole under
  // two keys would let a reference pin match either spelling, and a netlist
  // naming the board's spelling would then grade as if it named the
  // schematic's.
  expect(holes.has("SW_2.1")).toBe(false)
  expect(holes.size).toBe(2)
})

test("a board with no PAD lines gets back exactly pinHoles", () => {
  // The claim in the module comment, driven rather than asserted in prose.
  const noPads = WITH_PAD.split("\n")
    .filter((line) => !line.startsWith("PAD ") && line !== "PIN SW_2 1 AT 0,1")
    .join("\n")
  const holes = referencePinHoles(noPads)
  expect([...holes]).toEqual([["R1.1", "0,0"]])
})

test("a FLOATING pad is skipped rather than refused, so the pin refuses by its netlist name", () => {
  // A floating pad prints no PIN line, so it contributes no hole. Refusing
  // here would name the pad's BOARD name; letting it through means
  // equivalence.ts refuses as `reference-pin-not-on-board: SW.2`, which is
  // the name a reader needs and is HC3's refusal besides.
  //
  // MUTATION RUN: with the `if (!pad.placed) continue` guard removed, this is
  // the only failing test in the file, and it fails by the call throwing
  // rather than by an assertion: 'error: pad-pin-count: PAD SW_2 is placed
  // and the dump prints 0 PIN lines for it, not one ("PAD SW_2 SW_Rotary
  // FLOATING FROM SW.2")'. A refusal whose own first clause - "is placed" -
  // is contradicted by the line it quotes. Reverted.
  const floated = WITH_PAD.split("\n")
    .map((line) => (line.startsWith("PAD ") ? "PAD SW_2 SW_Rotary FLOATING FROM SW.2" : line))
    .filter((line) => line !== "PIN SW_2 1 AT 0,1")
    .join("\n")
  const holes = referencePinHoles(floated)
  expect(refusalFrom(() => referencePinHoles(floated))).toBe("")
  expect(holes.size).toBe(1)
  expect(holes.has("SW.2")).toBe(false)
})

test("a placed pad reading NOPROVENANCE refuses, because nothing else in the dump says which pin it is", () => {
  // MUTATION RUN: with the refusal replaced by `continue`, this fails with
  // 'Expected to start with: "pad-without-provenance: PAD line" / Received:
  // ""' - the pad silently contributing no hole, so its reference pin would
  // then refuse downstream as `reference-pin-not-on-board` under the netlist
  // name, reading as a board with a part off it rather than as a dump that
  // lost the mapping. Reverted.
  const unsourced = WITH_PAD.replace(
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
    "PAD SW_2 SW_Rotary AT 0,1 NOPROVENANCE",
  )
  const message = refusalFrom(() => referencePinHoles(unsourced))
  expect(message).toStartWith("pad-without-provenance: PAD line")
  expect(message).toContain("names no reference pin")
  expect(message).toContain("not recoverable from anything else in the dump")
})

test("a PAD line whose fields do not read as the fork's grammar refuses rather than being guessed at", () => {
  // Two shapes, because the grammar has two places to go wrong: the
  // placement field and the provenance field. Each is asserted on the member
  // AND on the clause that distinguishes it, never on a bare regex - and the
  // first mutation below is exactly why.
  //
  // MUTATION RUN (placement), the placement test narrowed to `ref ===
  // undefined`: the bad-placement half STILL REFUSES, with the same member
  // and the WRONG clause - 'pad-unreadable: PAD line "PAD SW_2 SW_Rotary
  // SOMEWHERE 0,1 FROM SW.2" ends in neither FROM <ref>.<pin> nor
  // NOPROVENANCE', which is false of a line that ends in exactly that. So
  // `expect(...).toContain("pad-unreadable")` alone would have passed the
  // mutant; the clause assertion is what fails it. Reverted.
  //
  // MUTATION RUN (provenance), the shape check narrowed to `source ===
  // undefined`: fails with 'Expected to start with: "pad-unreadable: PAD
  // line" / Received: ""' - `SOURCE SW.2` read as a provenance and `SW.2`
  // taken as the reference pin, i.e. a mis-keyed pin reported as a verdict.
  // Reverted.
  const badPlacement = WITH_PAD.replace(
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
    "PAD SW_2 SW_Rotary SOMEWHERE 0,1 FROM SW.2",
  )
  const placementMessage = refusalFrom(() => referencePinHoles(badPlacement))
  expect(placementMessage).toStartWith("pad-unreadable: PAD line")
  expect(placementMessage).toContain("has no readable name and placement field")

  const badProvenance = WITH_PAD.replace(
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
    "PAD SW_2 SW_Rotary AT 0,1 SOURCE SW.2",
  )
  const provenanceMessage = refusalFrom(() => referencePinHoles(badProvenance))
  expect(provenanceMessage).toStartWith("pad-unreadable: PAD line")
  expect(provenanceMessage).toContain("ends in neither FROM")
})

test("a placed pad with other than one PIN line refuses, because a pad is one hole", () => {
  // Driven with two PIN lines for one pad. The zero case is reached only by a
  // dump that says a pad is placed and prints no hole for it, which the
  // FLOATING test above covers from the other side.
  //
  // MUTATION RUN: with `own.length === 1 ? own[0] : undefined` narrowed to
  // `own[0]`, this fails with 'Expected to start with: "pad-pin-count: PAD
  // SW_2 is placed and the dump prints 2 PIN lines" / Received: ""' - the
  // FIRST of the two holes silently taken as the reference pin's, which is
  // the reconstruction choosing a board rather than reading one. Reverted.
  const twoPins = WITH_PAD.replace("GRID 1 2", "GRID 1 3") + "\nPIN SW_2 2 AT 0,2"
  const message = refusalFrom(() => referencePinHoles(twoPins))
  expect(message).toStartWith("pad-pin-count: PAD SW_2 is placed and the dump prints 2 PIN lines")
  expect(message).toContain("A PAD is one hole")
})

test("two holes claiming one reference pin refuse, rather than one of them being kept", () => {
  // Two pads, both sourced from SW.2. A dump cannot be true of a board where
  // one schematic pin is in two holes, and keeping either would grade a board
  // nobody built.
  //
  // MUTATION RUN: with the `taken !== undefined` clause disabled, this fails
  // with 'Expected to start with: "pad-provenance-collision: reference pin
  // SW.2" / Received: ""', and so does the part-pin collision test below.
  // The map the mutant returned was `[["SW.2", "0,2"]]` - the LAST pad
  // silently winning, and a verdict then graded over a hole nobody chose.
  // Reverted.
  const collision = [
    "GRID 1 3",
    "VERO_TRACKS 1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE COMPUTED",
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
    "PAD SW_2_AGAIN SW_Rotary AT 0,2 FROM SW.2",
    "PIN SW_2 1 AT 0,1",
    "PIN SW_2_AGAIN 1 AT 0,2",
  ].join("\n")
  const message = refusalFrom(() => referencePinHoles(collision))
  expect(message).toStartWith("pad-provenance-collision: reference pin SW.2")
  expect(message).toContain("cannot both be it")
})

test("a pad whose source collides with a real part's own PIN id refuses too", () => {
  // The other half of the collision: the pad's FROM names R1.1, which is
  // already a part pin. Same member, and it is the reason the part pins are
  // inserted into the map BEFORE the pads rather than after.
  const collision = WITH_PAD.replace("FROM SW.2", "FROM R1.1")
  const message = refusalFrom(() => referencePinHoles(collision))
  expect(message).toStartWith("pad-provenance-collision: reference pin R1.1")
  expect(message).toContain("a real part's")
})
