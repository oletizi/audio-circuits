Task 7e fix round 2 re-review

Findings
- I1 addressed: RECORD.md root row (now REVIEWED after 4101eb8) states verify-root.sh exit 0 and one excluded VCAP violation; I ran verify-root.sh, exit 0.
- I2 addressed: reset_boot row no longer claims a verdict for ca60cfca; after 4101eb8 it records "approved" of 00407478 with ca60cfca as history. Matches verdicts.md.
- I3 addressed: root-arrangement.ts header and assemble-root.ts header now state tallest-first packing and the real refusal text; the column rule is gone.
- I4 addressed: render.sh compares PDF and SVG "Sheet:" text, deletes all outputs on mismatch. render-control.sh ran, exit 0, controls 1-3 as stated (page 317 refused naming '/reset_boot/' vs '/').
- M1 addressed: 10 of 12 in decisions.md:1670 and the test header, citing root_sheets_fit.py.
- M2 addressed: svg_stroked_text.py committed, run by verify-root.sh (output seen), cited in decisions.md.
- M3 addressed: root_pages.py committed, run by verify-root.sh (printed 1;mcu 2;...;reset_boot 317), RECORD.md:293 points to it.
- M4 addressed: root_sheets_fit.py docstring now says copied and text-checked.
- M5 addressed: replay.sh label "root, blank to step 5".
- M6 addressed: test compares to committed 01-assemble.json after a call on another network (36 tests pass).
- M7 addressed: VSSA on mcu's east edge added to decisions.md.
- CR-MODULE-SUPERVISOR-SYMBOL headline addressed: now names h7-platform:TLV803EA30DBZR.

Checks run: verify-root.sh exit 0; render-control.sh exit 0; bun run typecheck clean; bun test root-arrangement + h7-module 36 pass 0 fail; git status clean.
sha256: all 12 sheets plus h7-module.kicad_pro match the RECORD.md sheet table; reset_boot 00407478, mcu c3d780a2, root 3590b959, pro 62905f75 match verdicts.md (87881f4 accurate: verbatim "approved", correct shas and commits, ca60cfca superseded, rulings and open rows not claimed cleared).

Control 19 is a real control: it cannot pass if render.sh exits 0 on page 317, leaves output, or fails to name both sheets, and control 3 shows kicad-cli's own SVG for that page is the root.

RECORD.md vs verdicts.md after 4101eb8: every page's status and sha agree; no row contradicts its section.

New findings
- Minor: RECORD.md:16 still reads "Every page here is UNREVIEWED until the owner records a verdict", now stale against the all-REVIEWED table.
- Minor: RECORD.md:571 has an unmatched "**" after "...f4954397)." (markdown bold broken in the reset_boot status line).
- Minor: render.sh pdf_sheet extraction (grep 'Sheet: [^ ]*') would false-refuse a sheet name containing a space; no such sheet exists today.

Verdict: approved.
