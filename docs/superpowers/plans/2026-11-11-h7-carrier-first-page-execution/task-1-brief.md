### Task 1: A board kind for boards that are not perfboards (C1)

**Files:**
- Modify: `tools/perfboard/declaration.ts` (the `PerfboardDeclaration` type, `loadDeclaration`)
- Modify: every consumer of `declaration.vrtPath` that `bun run typecheck` names once the type is a union
- Modify: `boards/*/perfboard.json`, all 11 existing declarations, adding `"kind": "perfboard"`
- Modify: `make/board.mk` (the `check` target, lines 378-388)
- Modify: `make/perfboard.mk` (module comment), `TOOLING.md` (a short section on board kinds)
- Test: `tests/perfboard/declaration.test.ts`; a new `tests/perfboard/board-kind-make.test.ts` for the make routing

**Interfaces:**
- Produces: `type BoardKind = "perfboard" | "pcb"`, and `PerfboardDeclaration` as a discriminated union on `kind`. The `perfboard` variant keeps `vrtPath: string`. The `pcb` variant has no `vrtPath`. Both keep `file`, `dir`, `circuitPath`, `exportName`, optional `schPath` and `netlistPath`.
- Produces: a `pcb` board's `make check` runs `netlist-agrees` (unchanged when `sch` is declared; it prints the existing notice when it is not) and then `bun test tests/circuits/<board>.test.ts`. That test file is required for a `pcb` board whether or not `sch` is declared. A `pcb` board never runs `veroroute`, `wiring`, `scaffold-membership` or `tools/cli/perfboard.ts check`.

- [ ] **Step 1: Write the failing declaration tests** in `tests/perfboard/declaration.test.ts`:
  - `"a declaration without kind refuses, naming the field"`: expect `loadDeclaration` to throw `/field "kind"/`.
  - `"kind must be perfboard or pcb"`: `"kind": "smd"` throws `/"perfboard" or "pcb"/`.
  - `"a pcb declaration with vrt refuses"`: throws `/pcb.*vrt/`.
  - `"a pcb declaration needs no vrt"`: loads, with `kind === "pcb"` and `"vrtPath" in decl === false`.
  - `"a perfboard declaration still requires vrt"`: `kind: "perfboard"` without `vrt` throws `/field "vrt"/`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/perfboard/declaration.test.ts`. Expected: the five new tests fail.
- [ ] **Step 3: Implement `kind` in `loadDeclaration`.** It is required, there is no default, and each refusal says why (`CLAUDE.md`, "Refusals teach"). Add `"kind": "perfboard"` to all 11 `boards/*/perfboard.json`. Narrow every `vrtPath` consumer that typecheck flags on `kind === "perfboard"`, refusing loudly on a `pcb` board wherever only a perfboard makes sense.
- [ ] **Step 4: Write the make-routing test** `tests/perfboard/board-kind-make.test.ts`. It builds a temporary `boards/`-style directory holding a `pcb` declaration and a trivial passing test, runs `make check` there, and asserts:
  - the output contains no `veroroute` or `perfboard check` invocation;
  - the board's test ran.

  A second case removes the board's test file and asserts `make check` fails naming `tests/circuits/<board>.test.ts`.
- [ ] **Step 5: Route `check` on `kind` in `make/board.mk`.** The make side reads the kind through the declaration loader, for example a `bun tools/cli/perfboard.ts kind` verb, never by grepping JSON.
- [ ] **Step 6: Verify.** Run `bun test tests/perfboard/` and `bun run typecheck`: all pass. Then run `make -C boards/transistor-preamp-staged check` and confirm the perfboard path is unchanged.
- [ ] **Step 7: Record C1** in `TOOLING.md` and the `make/perfboard.mk` header comment: what a `pcb` board is, what its `check` runs, and that this is design change C1. Commit and push.

