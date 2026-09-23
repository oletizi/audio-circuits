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
#
# THE SCHEMATIC IS THE ROOT OF THIS DEPENDENCY GRAPH, and the two variables
# below are the one genuine file rule in this whole make system - every
# other target here is phony, because the `.vrt` and the circuit are both
# hand-authored and nothing here can regenerate either of them. SCH and
# NETLIST come from THIS board's own declaration (perfboard.json's optional
# "sch"/"netlist" pair), read through the CLI's `board-info --field` so this
# file never reimplements the JSON parsing. Both are empty together when a
# board declares neither - the graceful path for a clone without the
# schematic's own repository - and everything below is inert in that case.
SCH     := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field sch)
NETLIST := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field netlist)

# KICAD_CLI follows the exact VEROROUTE/QMAKE shape from veroroute.mk: this
# repository's own contingent default, exported so it reaches any recipe
# that needs it, with an explicitly set KICAD_CLI always winning.
KICAD_CLI ?= /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
export KICAD_CLI

.PHONY: help perfboard-help check cuts update stripboard edit board-info netlist-agrees

ifneq ($(strip $(SCH)),)
ifeq ($(wildcard $(SCH)),)
# The declaration names a schematic that is not there. Refuse naming it,
# exactly as a missing .vrt refuses in tools/perfboard/check.ts - never
# silently treat a broken declaration as "no schematic declared."
netlist-agrees:
	@echo "$(CURDIR)/perfboard.json declares \"sch\": $(SCH), but that file does not exist."
	@echo "  Fix the \"sch\" path in perfboard.json, or remove the sch/netlist declaration"
	@echo "  if this board's schematic repository is not checked out on this machine."
	@exit 1
else
# The schematic is upstream of everything below it. A schematic newer than
# its export regenerates the export; an unchanged schematic does nothing -
# that is make doing its own job, for once, instead of every target here
# being phony.
$(NETLIST): $(SCH)
	@if [ ! -x "$(KICAD_CLI)" ]; then \
		echo "$(SCH) is newer than $(NETLIST), so the export needs regenerating, but no"; \
		echo "kicad-cli was found at $(KICAD_CLI)."; \
		echo "  Install KiCad, or set KICAD_CLI to point at your own kicad-cli."; \
		exit 1; \
	fi
	"$(KICAD_CLI)" sch export netlist --format kicadsexpr --output "$(NETLIST)" "$(SCH)"

# The regenerated export is only half the safety: if the schematic moved and
# circuits/*.ts (the hand-authored transcription) was not updated to match,
# the circuit is now WRONG, and `check` would happily compare a stale
# circuit against the board. tests/circuits/<board>.test.ts already asserts
# that the transcription agrees with the export - "the schematic export
# describes the same circuit as the built board" and "every component's
# footprint matches the netlist of the built unit" - so this depends on a
# fresh $(NETLIST) and then runs that file, rather than re-deriving the
# comparison here. A drifted transcription stops here, loudly, naming the
# mismatch bun test found, instead of `check` producing a confident wrong
# answer against a circuit nobody looked at again.
NETLIST_TEST := $(REPO_ROOT)/tests/circuits/$(notdir $(CURDIR)).test.ts

netlist-agrees: $(NETLIST)
	@if [ ! -f "$(NETLIST_TEST)" ]; then \
		echo "$(CURDIR) declares sch/netlist, but $(NETLIST_TEST) does not exist."; \
		echo "  Add tests there asserting the circuit still agrees with the schematic"; \
		echo "  export, or remove the sch/netlist declaration from perfboard.json."; \
		exit 1; \
	fi
	@cd "$(REPO_ROOT)" && bun test "$(NETLIST_TEST)"
endif
else
# No schematic declared: the graceful path a clone without the schematic's
# own repository needs. Nothing to regenerate, nothing to re-check here -
# `check` still checks the circuit against the .vrt exactly as it always did.
netlist-agrees:
	@:
endif

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
	@echo "  KICAD_CLI            override: point at your OWN kicad-cli - only consulted"
	@echo "                       when this board declares \"sch\"/\"netlist\" and the"
	@echo "                       schematic is newer than its export"
	@echo "  ALLOW_DIRTY=1        let update/stripboard write over uncommitted changes"

check: veroroute netlist-agrees
	@bun "$(CLI)" check -C "$(CURDIR)"

cuts: veroroute netlist-agrees
	@bun "$(CLI)" cuts -C "$(CURDIR)"

board-info:
	@bun "$(CLI)" board-info -C "$(CURDIR)"

update: veroroute netlist-agrees
	@bun "$(CLI)" update -C "$(CURDIR)" $(if $(ALLOW_DIRTY),--allow-dirty)

stripboard: veroroute netlist-agrees
	@bun "$(CLI)" stripboard -C "$(CURDIR)" $(if $(STRIPS),--strips "$(STRIPS)") $(if $(ALLOW_DIRTY),--allow-dirty)

edit: veroroute
	@bun "$(CLI)" edit -C "$(CURDIR)"
