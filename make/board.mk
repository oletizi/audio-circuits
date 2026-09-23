# The targets a directory gets because it holds a perfboard.json.
#
# Everything here acts on THIS directory's board. $(CURDIR) is the whole of
# the context - no BOARD=<name> variable, because two ways to say which board
# is two places for one fact to be wrong. Every recipe is thin: it shells out
# to the TypeScript CLI (tools/cli/perfboard.ts) with -C $(CURDIR), which
# already knows how to resolve, check, and rewrite exactly one declared
# board. No board logic is reimplemented here.
#
# WHAT WRITES. `check`, `cuts` and `board-info` write nothing. `update` and
# `stripboard` rewrite the declared layout IN PLACE - the CLI itself refuses
# while the layout has uncommitted changes, unless ALLOW_DIRTY=1 is passed
# through as --allow-dirty. `edit` writes nothing itself; it hands the
# layout to the GUI, which writes only when you save.

.PHONY: help perfboard-help check cuts update stripboard edit board-info

.DEFAULT_GOAL := help

help: perfboard-help

perfboard-help:
	@echo "$(notdir $(CURDIR)) - a declared perfboard. No variables needed; the"
	@echo "directory you are in is the board."
	@echo ""
	@echo "Check (read-only)"
	@echo "  make check           check this layout against the circuit it was built from"
	@echo "  make cuts            print the cut list and solder bridges"
	@echo "  make board-info      what this directory declares"
	@echo ""
	@echo "Work on it (these rewrite the layout IN PLACE; git is the undo, and both"
	@echo "refuse while the layout has uncommitted changes)"
	@echo "  make update                            apply the circuit to this layout"
	@echo "  make stripboard STRIPS=horizontal|vertical"
	@echo "                                          convert this layout to strip mode"
	@echo "  ALLOW_DIRTY=1                           accept that the write cannot be"
	@echo "                                          undone through git"
	@echo ""
	@echo "Hand it to the GUI"
	@echo "  make edit            open this layout in the forked VeroRoute"
	@echo ""
	@echo "The toolchain"
	@echo "  make veroroute       acquire and build the pinned VeroRoute fork (a"
	@echo "                       no-op once it is already built)"
	@echo ""
	@echo "Elsewhere"
	@echo "  make -C <dir> <target>   act on another board without leaving this one"
	@echo "  cd .. && make check      check every board under that directory"
	@echo ""
	@echo "Environment - nothing here needs setting for the normal, zero-configuration"
	@echo "road above:"
	@echo "  VEROROUTE            override: point at your OWN veroroute-perfboard"
	@echo "                       checkout instead of the one this repository builds"
	@echo "  QMAKE                override: point at your OWN qmake"
	@echo "  ALLOW_DIRTY=1        let update/stripboard write over uncommitted changes"

check: veroroute
	@bun "$(CLI)" check -C "$(CURDIR)"

cuts: veroroute
	@bun "$(CLI)" cuts -C "$(CURDIR)"

board-info:
	@bun "$(CLI)" board-info -C "$(CURDIR)"

update: veroroute
	@bun "$(CLI)" update -C "$(CURDIR)" $(if $(ALLOW_DIRTY),--allow-dirty)

stripboard: veroroute
	@bun "$(CLI)" stripboard -C "$(CURDIR)" $(if $(STRIPS),--strips "$(STRIPS)") $(if $(ALLOW_DIRTY),--allow-dirty)

edit: veroroute
	@bun "$(CLI)" edit -C "$(CURDIR)"
