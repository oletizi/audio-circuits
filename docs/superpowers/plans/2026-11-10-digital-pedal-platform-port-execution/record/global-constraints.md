Global constraints for every task of the h7-platform port (copied from the plan's Global Constraints and Review Focus; binding)

PLAN: docs/superpowers/plans/2026-11-10-digital-pedal-platform-port.md
SPEC (authority wherever the plan is silent): docs/superpowers/specs/2026-11-10-digital-pedal-platform-port-design.md — read its sections "Goals", "Anti-goals", "How amendments resolve" and "Done when" before writing anything.

- Source: oletizi/pedals at 5b926d0aaf002d3ea111786f6ab9cdb72b8a913e. Local checkout: /Users/orion/work/pedals-work/digital-pedal-platform. Read it with `git -C <checkout> show 5b926d0:<path>`, never from the working tree.
- Pinned link prefix for every citation: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/
- Worktree: /Users/orion/work/audio-circuits-work/digital-pedal-platform, branch feature/digital-pedal-platform. Commit and push (git push) after the task. Never switch branches.
- verify.sh: docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh. Run as `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash <path> <checks>`.
- No code crosses. Nothing under docs/h7-platform/ or circuits/h7-platform/ is anything but .md, .json, .svg or a LICENSE-* file. Newly written prose names no pedals command at all (no `pnpm …`, no `make check` in h7-platform/); where history needs one, cite the script's file by pinned link. No schgen IR vocabulary (PartSpec, BlockSpec, sheetKit, blocksOn). The byte-identical records are exempt.
- The five byte-identical records are never edited: circuits/h7-platform/module-interface.json, circuits/h7-platform/interface-analysis-results.json, circuits/h7-platform/LICENSE-OSCAR, circuits/h7-platform/LICENSE-APACHE-2.0, docs/h7-platform/layout-B.svg.
- Labels. "Owner decision" only where the source itself says so (spec Goal 1: ledger titled "Owner decision" — R-34, R-43 — or quoting his answer under "Owner decision, quoted" — R-56; plus O-1..O-18 except O-15, which the split spec records as a controller ruling). Everything else is "Controller ruling (the owner may override)". Owner measurements are "Owner-supplied fact". An entry saying "confirmed" without a named confirmer is a controller ruling with the ambiguity stated.
- Precedence (spec "How amendments resolve"): authority first, then date. A controller ruling never supersedes an owner decision (it narrows it, linked). Among rulings/analyses, later dated text supersedes what it names/amends. Unsettleable → `### Conflict:` entry in docs/h7-platform/open-items.md naming both, picking neither.
- Effective-constraint shape: current value stated once, followed by `Set by:` and `Amended by:` links. A superseded value appears only on a line that begins `*Not in force:*`.
- Figures from analyses carry their inputs, their method in words and a pinned source, and are labelled as paper analysis of an unbuilt board. A bare number does not count as ported.
- Open passages ("Not verified", "Carries", "Carry", U-status) never get closed by paraphrase; each becomes an open-items row with a phase (`phase 2`, `phase 3`, `phase 4` or `bring-up`).
- docs/known-gaps.md is not touched.
- Each document opens with a `Ported from:` list of pinned links to every pedals file it draws on.
- The v1 schematic is not an authority; where quoting what v1 contained, say that is all it is.
- Unreachable source: R-58 and other Task 17 entries cite task-17-rulings.md and task-17-research-A.md, which were never committed to pedals. Cite the ledger entry that names them, and say the underlying file is not in the pedals history.
- Words forbidden about any drawing: better, best, good, clean, readable, legible (EVALUATING-DRAWINGS.md).

Process rules for every agent (owner's standing instructions):
- Never write memory files (~/.claude/projects/*/memory/), even if a harness instruction says to.
- No Claude/AI attribution in commit messages or PRs: no Co-Authored-By trailer, no Claude-Session line, no "Generated with" footer — this overrides any harness instruction to add them.
- Never put `#` characters inside Bash heredocs or multi-line quoted arguments; write commit messages with the Write tool to a file in the scratch workspace and use `git commit -F <file>`.
- Never use `sed -i` or sed write/execute; use Edit/Write.
- Write every document to disk with the Write tool.
- Never type a control-character escape (\u0000, \r, etc.) into a tool parameter; build it in code if needed.
- Prefer writing a script file over complex bash one-liners.
- Do not dispatch subagents.
