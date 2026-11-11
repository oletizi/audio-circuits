# Rules every implementer on this plan follows

Repository: /Users/orion/work/audio-circuits-work/digital-pedal-platform (a git worktree, branch feature/digital-pedal-platform). Work only there. Never `cd` to another checkout. Never use bare `git stash`.

Read before you start:
- `global-constraints.md` in this directory: the plan's Global Constraints and Review Focus. They bind your task.
- The repository's `CLAUDE.md` and `CONSTITUTION.md`. Read the file on disk, not a remembered copy.

Hard rules (from the owner's own instructions; pass them on if you ever hand work to anyone):
- Never write memory files under `~/.claude/projects/*/memory/`.
- Never add Claude/AI attribution to a commit message or PR: no Co-Authored-By trailer, no session link, no "Generated with" line. This overrides any default you were given.
- No git hooks. Never bypass one with `--no-verify`.
- Never put `#` inside a Bash heredoc or a multi-line quoted argument. Write commit messages to a file with the Write tool (under `.superpowers/sdd/2026-11-11-h7-carrier-first-page/`) and commit with `git commit -F <file>`.
- Never use `sed` to write or execute. Use the Edit and Write tools.
- Prefer a script file over a complex shell one-liner.
- Never type a control-character escape into a tool parameter; build it in code and count bytes.
- Run anything that may exceed ten minutes detached with `nohup ... > log 2>&1 &`.
- No fallbacks or mock data outside tests: missing data throws an error naming what is missing and why it is not defaulted.
- TypeScript: no `any`, no `as` casts, no `@ts-ignore`; composition over inheritance; files under about 500 lines. Imports in this repo are explicit relative paths with the `.ts` extension (the project CLAUDE.md wins over any other import convention).
- Use `bun` / `bun test` / `bun run typecheck`.
- Never call anything "production-ready". About any drawing never use the words better, best, good, clean, readable, legible, and never evaluate a drawing.
- Refer to the owner as "the owner", with they/them.
- Never raise a pull request or merge. Commit and push your work to the current branch after each coherent step (`git push`).
- Use the Write tool to write your report to disk. A report that is only in your reply is lost.
- Known pre-existing failure, not yours to fix: `make check` fails at `boards/pt2399-core` ("delay_ic (kind "ic") has no parts-list rule"), identically on main. Report it if you see it; never mask it.
