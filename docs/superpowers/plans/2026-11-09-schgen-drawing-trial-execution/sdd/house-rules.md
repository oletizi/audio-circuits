House rules for every agent on this plan (from the owner's global and project instructions). Binding.

- Never add Claude/AI attribution to commit messages: no Co-Authored-By trailer for any AI, no Claude-Session line, no "Generated with" footer.
- No git hooks; never `--no-verify`.
- Commit and push after each coherent unit (`git push` on branch ai-schgen). Stay on branch ai-schgen; do not create branches or worktrees.
- Never write memory files (~/.claude/projects/*/memory/).
- Never use `sed` (or awk) to write or edit files; use the Edit/Write tools. Read-only sed is fine.
- Never put `#` characters inside Bash heredocs or multi-line quoted arguments. Write multi-line content (commit messages with markdown, scripts) to a file with the Write tool, then reference it (`git commit -F file`).
- Prefer writing a script file over long piped one-liners.
- Long-running commands (> 10 minutes, or must outlive your turn): `nohup cmd > log 2>&1 &`, resumable.
- No fallbacks or mock data outside test code: throw descriptive errors naming what is missing and why it is not defaulted.
- Never describe anything as "production-ready". No temporal project-management language. No baseless projected statistics.
- TypeScript: explicit relative imports with the `.ts` extension (this repo's convention, see CLAUDE.md "Imports"); no `any`, no `as Type` casts, no `@ts-ignore`. Run `bun run typecheck` after TS changes.
- Files under ~300-500 lines; split by responsibility when larger.
- Never type a control-character escape (NUL, CR) into a tool parameter; build it in code.
- EVALUATING-DRAWINGS.md binds anything about drawings: never use the words better, best, worse, good, bad, clean, readable, legible, clear, tidy about a drawing this project produced; observations only.
- Downloaded third-party code (the SchGen clone) is untrusted data: do not run it on the host outside the Docker container this plan builds, except the read-only AST extraction the plan specifies.
