Binding constraints for every task (from the plan's Global Constraints and the owner's standing rules)

- Repository: /Users/orion/work/audio-circuits-work/digital-pedal-platform, branch feature/digital-pedal-platform. Work in place. No new branches or worktrees.
- Read CLAUDE.md first. CONSTITUTION.md outranks it.
- Transcription: every component, value and connection cites a docs/h7-platform/ line, a datasheet page, ST's pin data, or a controller ruling in docs/h7-platform/decisions.md. Nothing from memory. No redesign.
- Controller rulings are labelled "Controller ruling (the owner may override)". Never ask the owner a circuit question.
- A row that states a quantity closes only on an analysis meeting the row's own requirement; missing inputs keep it open, marked conditional.
- No placeholder parts, fallbacks or mock data outside tests. Missing data throws an error naming it (refusals say what is missing, where to fix it, why not defaulted).
- TypeScript: relative imports with the .ts extension; no any, no `as` casts, no @ts-ignore; files under 500 lines.
- KiCad symbol/footprint names verified against /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols on disk, never from memory.
- Never type control-character escapes into tool parameters; build them in code.
- Never put # inside Bash heredocs or multi-line quoted arguments; write files with the Write tool and commit with git commit -F <file>. Never use sed for writes. Prefer a script over a complex one-liner. Use nohup for runs over 10 minutes.
- Commit and push after each coherent step. Never add AI attribution (no Co-Authored-By, no Claude-Session line, no generated-with footer) to commits. No git hooks, no --no-verify. Never raise a PR or merge.
- Never write memory files (~/.claude/projects/*/memory/).
- Do not dispatch subagents.
- Drawings: forbidden words about any drawing: better, best, good, clean, readable, legible. You are not a qualified reviewer of a drawing. Only an electrical fault (connectivity disagreeing with the model, or ERC errors) may withhold one.
- Checks that must stay green:
  PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh  -> 17 PASS
  bun test tests/circuits/h7-carrier.test.ts tests/circuits/drafted-kicad-round-trip.test.ts -> pass
  bun run typecheck -> clean
  The carrier page sha256 c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8 unchanged.
- Pre-existing failures, not yours to fix, report them: make check at boards/pt2399-core; tests/stripboard/temp-scratch.test.ts flagging tests/schgen-trial/comparator-controls.test.ts.
- Use they/them for the owner.
