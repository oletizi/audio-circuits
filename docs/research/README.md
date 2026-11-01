# `docs/research/` - frozen execution records

Each dated entry here (`<date>-<name>.md`, often with a sibling
`<date>-<name>/` directory holding scripts, intents and crops) is the record
of one research or drawing-loop run. A run directory is not edited forward
once written - it is the audit trail of what that run actually did, which is
why a later change elsewhere in the repository does not reach back to update
it.

**A script under `<run>/scripts/` may fail with `ImportError` if run
directly - that is expected, not a defect.** Before Task 4 of
`.superpowers/sdd/2026-10-30-institutionalise-draughting`, most runs wrote
their own copy of `kicad_sheet.py` and several sibling helpers and imported
them from a shared, uncommitted convenience directory, `docs/research/lib/`.
Task 4 promoted the converged versions of those helpers to
`draughting/measure/` - the one place they are maintained now - and
`docs/research/lib/` no longer exists. The run directories were left exactly
as each run left them: as of 2026-11-01, 47 scripts across these directories
still `import kicad_sheet` or extend `sys.path` against that now-missing
path (`grep -rl "docs/research/lib" docs/research --include="*.py"` is the
check). **Run the current versions in `draughting/measure/` instead of a run
directory's own frozen copy.** `TOOLING.md`'s repair-class 6 entry and
`draughting/measure/junction_audit.py`'s own module comment record the same
fact at the one script this was first found on.
