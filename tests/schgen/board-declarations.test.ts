/**
 * **EVERY BOARD UNDER `boards/` HAS A SCHEMATIC AUTHORING DECLARATION, AND EVERY DECLARATION IS
 * WELL FORMED AND AGREES WITH ITS CIRCUIT.**
 *
 * Written for Task 25 of the M1 schematic-authoring plan, when the nine missing declarations
 * landed. It exists because of `docs/known-gaps.md` **G256**, whose criterion is
 * *"the day a fifth `SchematicAuthoring` declaration exists in `circuits/`, some committed check
 * fails, naming it"* - and whose measurement is that on the day nine of them did, **nothing
 * failed**: `PARITY_CIRCUITS`, `PARITY_CASES` and the tripwire's `CANDIDATES` are hand-written
 * literals with no filesystem sweep, and `tests/schgen/authoring-complete.test.ts` pins its list
 * against a copy of itself. That probe was driven here before this file was written: nine
 * declarations, `bun test`, **3709 pass / 0 fail**, unchanged.
 *
 * **SO THE FIRST TEST BELOW SWEEPS `boards/` AND IS NOT A LITERAL.** It is G256's mechanism (1)
 * applied to the axis this task actually moved: not *"which files under `circuits/` look like a
 * declaration"* - which makes the grep shape `SchematicAuthoring = {` load-bearing, and which
 * G256 records as that mechanism's cost - but *"which of the owner's eleven boards can be offered
 * to `generate` at all"*, read off the board directories themselves. A board added with no
 * declaration fails here, by name. **It does NOT close G256**, whose subject is a declaration
 * that exists and is wired into nothing, and this file cannot see one of those either.
 *
 * **IT ASSERTS WELL-FORMEDNESS AND AGREEMENT, NOT THAT ANY BOARD DRAWS.** Nine of the eleven
 * boards do not, and the blockers are **G259**'s row, measured board by board by
 * `tools/schgen/board-sheets.ts`. A test that required a drawing would be this task writing the
 * acceptance criterion for the artifact it produced, which `CLAUDE.md` forbids outright and
 * **G240** reserves to the owner.
 */

import { test, expect, describe } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { ALL_DECLARED_CASES, BOARD_CASES } from "../../tools/schgen/board-declarations.ts"
import { boardRefs, declarationFor } from "../../tools/schgen/board-sheets.ts"
import { caseResolver } from "../../tools/schgen/authoring-census.ts"
import { authoringProblems } from "../../lib/schgen/authoring.ts"
import {
  blockPrefixDisagreements,
  interfaceDisagreements,
  unblockedComponents,
} from "../../lib/schgen/authoring-checks.ts"
import { circuitSpecFrom, pinSidesOf } from "../../lib/schgen/from-network.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "../..")

const BOARDS = boardRefs(REPO_ROOT)

test("boards/ holds eleven board directories, so none of the sweeps below iterates nothing", () => {
  expect(BOARDS.length).toBe(11)
  expect(fs.existsSync(path.join(REPO_ROOT, "boards"))).toBe(true)
})

test("every board under boards/ has a SchematicAuthoring declaration, matched on its BUILDER", () => {
  // The match is on `perfboard.json`'s `export`, never on the circuit directory: G247's whole
  // distinction is that circuits/transistor-preamp/ holds five board builders, so a
  // directory-level match would report four boards as declared that nothing declares.
  const undeclared = BOARDS.filter((b) => declarationFor(b) === null).map((b) => `${b.name} (${b.export}() in ${b.circuit})`)
  expect(undeclared).toEqual([])
})

test("no two declared cases claim the same builder", () => {
  const entries = ALL_DECLARED_CASES.map((c) => c.entry)
  expect([...new Set(entries)].sort()).toEqual([...entries].sort())
})

test("the nine board declarations are the boards the parity set does not already cover", () => {
  // Derived from the tree and from PARITY_CASES, not from a literal of itself: a board that
  // gains a declaration, or a declaration written for no board, moves this.
  const coveredByParity = BOARDS.filter((b) => BOARD_CASES.every((c) => c.entry !== `${b.export}()`))
  expect(coveredByParity.length).toBe(2)
  expect(BOARD_CASES.length).toBe(BOARDS.length - coveredByParity.length)
})

describe.each(BOARD_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
  test("the authoring declaration is well formed on its own", () => {
    expect(authoringProblems(c.authoring, c.network)).toEqual([])
  })

  test("every component of the circuit is in exactly one declared block", () => {
    expect(unblockedComponents(c.network, c.authoring)).toEqual([])
  })

  test("the declared include() prefixes agree with the component ids", () => {
    expect(blockPrefixDisagreements(c.network, c.authoring)).toEqual([])
  })

  test("every block's declared interface is exactly the nets that cross its boundary", () => {
    expect(interfaceDisagreements(c.network, c.authoring)).toEqual([])
  })

  test("every component resolves a symbol, every pin of that symbol a side", () => {
    const symbols = caseResolver([c])
    const spec = circuitSpecFrom(c.network, c.authoring, symbols)
    const sides = pinSidesOf(c.network, c.authoring, symbols)
    expect(spec.parts.length, `${c.name} built no parts`).toBe(c.network.components.length)
    for (const part of spec.parts) {
      expect(part.libId, part.label).not.toBe("")
      const symbol = symbols.resolve(part.libId)
      const partSides = sides.get(part.label)
      expect(partSides, `${part.label} has no pin-side map`).toBeDefined()
      for (const pin of symbol.pins) {
        expect(partSides?.get(pin.number), `${part.label}.${pin.number}`).toBeDefined()
      }
    }
  })
})
