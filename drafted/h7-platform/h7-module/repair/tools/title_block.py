"""The h7-module's title-block data, the board data `page.py`'s op-list 02 writes.

`draughting/pages/page.py` (`Wiring.op_list`) is shared by every board's pages, so what each page's
title block carries besides its title is the board's and lives here. Each value is a literal, never
computed, so a replay writes the committed bytes. Until the H7 pedal plan's Task 4 all three were
literals inside the module's own copy of `page.py`. The power page's `power/02-wire.py` writes the
same three in its own op-list.

- DATE: the date the module's pages were drawn.
- REV: the module pages' revision.
- COMMENT1: the first comment line, saying the page is generated.
"""

DATE = "2026-11-12"
REV = "A"
COMMENT1 = "generated - do not edit"
