/**
 * **THE TEST THAT LICENSES THE DELETION OF `lib/schgen/gates/round-trip.ts`.**
 *
 * Five hand-drawn pages under `drafted/pultec/` are approved by this repository's owner and
 * printed in build guides, and four guards in `./drafted-sheet.ts` bind them to their circuit
 * models. Those guards run through `roundTrip`, which is deleted with the rest of the schematic
 * generator. `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel` is the standalone
 * replacement, and `./sheet-model.ts` builds the three arguments it takes without reaching into
 * `lib/schgen/` or `tools/schgen/` at all.
 *
 * **This file is what says the two agree - on all SIX of `SheetAgreement`'s lists, element for
 * element, in order, on all five real pages.** Nothing else does: the two modules share no code,
 * and the standalone one derives the designators and the pin numbers by a different route
 * entirely (`./sheet-model.ts`'s header says which). If this test passes for the wrong reason the
 * deletions that follow remove the guards on the owner's approved drawings and nobody finds out.
 *
 * **IT IS TEMPORARY.** It exists only while both implementations do, and the plan deletes it with
 * the generator.
 *
 * ---
 *
 * **WHY THE LISTS ARE COMPARED UNSORTED.** The equivalence this replaces was measured with both
 * sides sorted, which leaves within-list ORDER unproven - and these lists are read by people: a
 * guard prints them, and `./drafted-sheet.ts`'s own assertions sort before comparing precisely
 * because nothing had established that the order agrees. `toEqual` on the arrays as returned is
 * the stronger claim and the one worth making while both sides exist.
 *
 * **AND EVERY BOARD CARRIES A CONTROL.** Six empty lists on both sides would satisfy every
 * assertion below while proving nothing, so each board also asserts that two of the six are
 * non-empty, and that a single wrong pin number in the standalone side's pin-number map makes the
 * two disagree. A comparison that cannot fail is not a comparison.
 */
import { expect, test } from "bun:test"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { roundTrip } from "../../lib/schgen/gates/round-trip.ts"
import { committedNetlist, modelUnderTest } from "./drafted-sheet.ts"
import { modelForSheet } from "./sheet-model.ts"

/** Each board and its committed export, exactly as the board's own `perfboard.json` declares it. */
const BOARDS = [
  { board: "pultec-hi-boost", netlist: "tests/fixtures/pultec-hi-boost.net" },
  { board: "pultec-hi-cut", netlist: "tests/fixtures/pultec-hi-cut.net" },
  { board: "pultec-low-boost", netlist: "tests/fixtures/pultec-low-boost.net" },
  { board: "pultec-low-cut", netlist: "tests/fixtures/pultec-low-cut.net" },
  { board: "pultec-mid", netlist: "tests/fixtures/pultec-mid.net" },
]

for (const { board, netlist } of BOARDS) {
  test(`${board}: the standalone comparison reports exactly what roundTrip reports`, () => {
    const exported = committedNetlist(netlist)
    const old = modelUnderTest(board)
    const viaSchgen = roundTrip(old.circuit, old.refs, exported)
    const fresh = modelForSheet(board)
    const standalone = compareSheetToModel(fresh.network, fresh.designators, fresh.pinNumbers, exported)

    // UNSORTED, in the order each side returns them. See the header.
    expect(standalone.componentIdentity).toEqual([...viaSchgen.componentIdentity])
    expect(standalone.netMembership).toEqual([...viaSchgen.netMembership])
    expect(standalone.pinIdentity).toEqual([...viaSchgen.pinIdentity])
    expect(standalone.values).toEqual([...viaSchgen.values])
    expect(standalone.footprints).toEqual([...viaSchgen.footprints])
    // The sixth list, and the one whose VOCABULARY changed: it names components by model id where
    // roundTrip names them by IR label. The two coincide for every footprint-less part of all five
    // pages, which is a measured claim this line re-runs rather than an assumption.
    expect(standalone.footprintsUndeclared).toEqual([...viaSchgen.footprintsUndeclared])

    // Not an incidental zero: both of these are non-empty on every one of the five pages - the
    // pages declare no Footprint field at all, and every panel control, selector and inductor on
    // them declares no footprint in the model either - so six empty lists would mean the
    // comparison never looked rather than that it agreed.
    expect(standalone.footprints.length).toBeGreaterThan(0)
    expect(standalone.footprintsUndeclared.length).toBeGreaterThan(0)
  })

  test(`${board}: one wrong pin number makes the two disagree - the control for the agreement above`, () => {
    const exported = committedNetlist(netlist)
    const old = modelUnderTest(board)
    const viaSchgen = roundTrip(old.circuit, old.refs, exported)
    const fresh = modelForSheet(board)

    // The first component with at least two pins, with two of its pin numbers swapped. A swap
    // rather than an invented number, so the pin SET is unchanged and `pinIdentity` cannot catch
    // it: what must notice is `netMembership`, which is the list the board guards assert empty.
    const swapped = new Map(fresh.pinNumbers)
    const victim = fresh.network.components.find((c) => (swapped.get(c.id)?.size ?? 0) >= 2)
    if (victim === undefined) throw new Error(`${board}: no component has two pins, so no pin number can be swapped and this control cannot run`)
    const numbers = swapped.get(victim.id)
    if (numbers === undefined) throw new Error(`${board}: component "${victim.id}" lost its pin-number map`)
    const [a, b] = [...numbers.keys()]
    if (a === undefined || b === undefined) throw new Error(`${board}: component "${victim.id}" has fewer than two pins after all`)
    const aNumber = numbers.get(a)
    const bNumber = numbers.get(b)
    if (aNumber === undefined || bNumber === undefined) throw new Error(`${board}: "${victim.id}" pins ${a}/${b} have no numbers`)
    swapped.set(victim.id, new Map([...numbers, [a, bNumber], [b, aNumber]]))

    const perturbed = compareSheetToModel(fresh.network, fresh.designators, swapped, exported)
    expect(perturbed.netMembership).not.toEqual([...viaSchgen.netMembership])
  })
}
