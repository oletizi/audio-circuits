Task 7e fix round 2 report

Done: I1 (root row: UNREVIEWED, verify-root.sh exit 0, root ERC 0 errors, one excluded VCAP violation), I2 (reset_boot row: UNREVIEWED, changed after approval; approved sha ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397, now 00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24), I3 (both headers now state the tallest-first packing rule and the real refusal wording), I4, M1 to M7, and the controller's headline fix for CR-MODULE-SUPERVISOR-SYMBOL.

I4: render.sh compares the SVG's title-block "Sheet:" text to the PDF's; on a mismatch it deletes all outputs and refuses naming both sheets (measured: kicad-cli 10.0.5 SVG export ignores --pages for a sub-sheet and writes the root). repair/tools/render-control.sh holds the controls (root passes; page 317 refused, no output left; kicad-cli's own SVG for that page measured to be the root); erc-control.sh runs it as control 19. REPLAY.md updated.

Minors: M1 10 of 12 (measured by root_sheets_fit.py on the 71db737 root) in decisions.md and the test header. M2 svg_stroked_text.py committed, reported by verify-root.sh, cited in decisions.md and RECORD.md. M3 root_pages.py committed and reported by verify-root.sh; RECORD.md points to it. M4 docstring fixed. M5 replay label now "root, blank to step 5". M6 test now compares to the committed 01-assemble.json after a call on another network. M7 VSSA added.

No .kicad_sch or .kicad_pro byte changed. verdicts.md and the mcu row untouched.
