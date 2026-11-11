## Global Constraints

- Read `CLAUDE.md`, `EVALUATING-DRAWINGS.md`, `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` before Task 7. The drawing practice is used as it stands, except for C1 and C2 below.
- **Forbidden words about any drawing:** better, best, good, clean, readable, legible. No agent evaluates a drawing. Every drawing goes to the owner, and only an electrical fault may withhold one.
- **Transcription:** every component, value and connection cites a `docs/h7-platform/` line, a datasheet page, or a controller ruling recorded in `docs/h7-platform/decisions.md`. Nothing comes from memory.
- **Controller rulings** are labelled "Controller ruling (the owner may override)". They never read as owner decisions.
- **No placeholder parts, fallbacks or mock data** outside tests. Missing data throws an error that names it.
- **Imports:** relative paths with the `.ts` extension (project `CLAUDE.md`, "Imports").
- **KiCad symbol and footprint names** are verified against `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols` and the footprint libraries on disk, never written from memory.
- **Control characters** are never typed as escapes into tool parameters. Build them in code, and count bytes to check.
- **No `#`** inside Bash heredocs or multi-line quoted arguments. Write files with the Write tool and commit with `git commit -F <file>`. Never use `sed` for writes. Prefer a script over a complex one-liner.
- **Commits:** commit and push after each step that leaves the tree coherent. Never add AI attribution to a commit or PR. No git hooks.
- **No memory files.** Never write `~/.claude/projects/*/memory/`. Pass this constraint, and every constraint above, to any sub-agent.
- **Port checks stay green, as amended by Task 3:** `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` prints 17 `PASS` lines after every task from Task 3 on that edits `docs/h7-platform/` or `circuits/h7-platform/`. Before Task 3 lands, no task adds a file under `circuits/h7-platform/`.
- **Pre-existing failure:** `make check` already fails at `boards/pt2399-core` ("delay_ic (kind "ic") has no parts-list rule"), identically on `main`. It is not this plan's to fix. Report it, never mask it.

## Review Focus

1. **A perfboard declaration that omits `kind`.** It must refuse, naming the field. Defaulting to perfboard would be exactly the silent default `CLAUDE.md` forbids. Test owned by Task 1.
2. **A `pcb` board that declares `vrt`.** It must refuse: a layout field on a board with no layout is a contradiction, not an extra. Test owned by Task 1.
3. **`make draw` on a perfboard board with no `netlist`.** It must still refuse exactly as it does today. C2 relaxes this for `pcb` only. Test owned by Task 2.
4. **An interface pin swapped between J_MOD_A and J_MOD_B,** for example contract pin 21 wired to J_MOD_A pad 1. It must fail the interface check. That is the mirrored-footprint failure `architecture.md` §4.2 warns about. Test owned by Task 4.
5. **A reserved pin on the carrier that also reaches a second part.** It must fail the interface check, even though a single breakout terminal passes. Test owned by Task 4.
6. **The 3V3_D dummy load fitted while firmware enables USB.** The carrier's aggregate draw must stay within 25 mA in that state too, and a load added to the rail without a stated current must refuse rather than be left out of the sum. Test owned by Task 5.

---
