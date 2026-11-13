Replay: dual op-amp test board
==============================

From a new or empty directory:

    bash tests/fixtures/dual-opamp-board/drafted/repair/replay.sh <new-or-empty-work-dir>

1. Writes `<work>/dual-opamp-board/perfboard.json` (`kind: pcb`, the fixture module, export
   `dualOpampBoard`) and runs `bun tools/cli/draw.ts` from that directory, as `make draw` would
   from a board directory. It prints the `NO INDEPENDENT NETLIST:` block: there is no committed
   netlist for this board to check the intent against before drafting.
2. Requires `build/draw/dual-opamp-board.intent.json` to equal `intent.json` here byte for byte.
3. Requires the drafted sheet, `build/draw/dual-opamp-board/dual-opamp-board.kicad_sch`, to have
   sha256 `b345f056f147bd2552dbd2f5acecd2177ae0d9f997e72ba36e48b0b049bdfdb4` and to equal the
   committed `../dual-opamp-board.kicad_sch`.

No akcli op-list follows: the draft already agrees with the model, so it is the committed sheet.
