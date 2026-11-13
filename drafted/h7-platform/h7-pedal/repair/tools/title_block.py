"""The h7-pedal's title-block data, the board data `draughting/pages/page.py`'s op-list 02 writes.

`page.py` (`Wiring.op_list`) is shared by every board's pages, so what each page's title block
carries besides its title is the board's and lives here. Each value is a literal, never computed,
so a replay writes the committed bytes.

- DATE: the date the pedal's pages were drawn (h7 pedal pages plan, Task 7a).
- REV: the pedal pages' revision.
- COMMENT1: the first comment line, saying the page is generated (the module's wording).
"""

DATE = "2026-11-13"
REV = "A"
COMMENT1 = "generated - do not edit"
