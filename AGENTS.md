# Project rules

**Read `CLAUDE.md` before doing anything here.** It opens with what this project
is and who does what, and that frame decides most questions you will have.

The short version, so you are not working from the wrong model of the work:

This is a collection of **audio circuits under development** - hardware in
progress, not software that ships. It exists as a **bridge between AI agents and
human designers**. The TypeScript is yours: it holds a circuit as data so it can
be validated, simulated and checked. The KiCad schematics and VeroRoute layouts
are the human designer's, because agents cannot draw a legible schematic or lay
out a buildable board. Do not try to do their half. Verify, report, and hand
over.

KiCad is a required tool, not an optional one.

## Commit and push cadence

Commit and push early and often. Make small, coherent commits as useful work is
completed, including design and documentation updates, and push the working
branch after each commit. Do not wait for the entire feature to be finished.
Run checks appropriate to each change before committing. Clearly identify
provisional or incomplete work in its documentation and commit description.
