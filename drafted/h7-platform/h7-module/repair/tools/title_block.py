"""The h7-module's title-block date, the one board datum `page.py`'s op-list 02 writes.

`draughting/pages/page.py` (`Wiring.op_list`) is shared by every board's pages, so the date each
page's title block carries is the board's and lives here. It is the date the module's pages were
drawn, written as a literal, never computed, so a replay writes the committed bytes (until the H7
pedal plan's Task 4 it was a literal inside the module's own copy of `page.py`). The power page's
`power/02-wire.py` writes the same date in its own op-list.
"""

DATE = "2026-11-12"
