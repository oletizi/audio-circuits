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
# THE SCHEMATIC IS THE ROOT OF THIS DEPENDENCY GRAPH. SCH and NETLIST come
# from THIS board's own declaration (perfboard.json's optional
# "sch"/"netlist" pair), read through the CLI's `board-info --field` so this
# file never reimplements the JSON parsing. Both are empty together when a
# board declares neither - the graceful path for a clone without the
# schematic's own repository - and everything below is inert in that case.
#
# THERE IS DELIBERATELY NO $(NETLIST): $(SCH) FILE RULE. That would be
# idiomatic make, and it is not sound here: git does not preserve mtimes, so
# checking out a branch carrying a STALE export can stamp it newer than a
# schematic edited long before - and only the export side of that can ever
# be falsely freshened this way, never the schematic, because the schematic
# lives in a different repository this repo's own checkouts never touch.
# Every mtime accident here would make stale look current, never the
# reverse. `netlist-agrees` below regenerates the export EVERY run instead
# (tools/perfboard/netlist-sync.ts) and decides freshness from content, not
# a clock - the export costs well under half a second, so there is no
# performance reason to trust a timestamp instead.
SCH     := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field sch)
NETLIST := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field netlist)

# KICAD_CLI follows the exact VEROROUTE/QMAKE shape from veroroute.mk: this
# repository's own contingent default, exported so it reaches any recipe
# that needs it, with an explicitly set KICAD_CLI always winning.
KICAD_CLI ?= /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
export KICAD_CLI

.PHONY: help perfboard-help check cuts import update stripboard edit board-info netlist-agrees

ifneq ($(strip $(SCH)),)
ifeq ($(wildcard $(SCH)),)
# The declaration names a schematic that is not there. Refuse naming it,
# exactly as a missing .vrt refuses in tools/perfboard/check.ts - never
# silently treat a broken declaration as "no schematic declared."
netlist-agrees:
	@echo "$(CURDIR)/perfboard.json declares \"sch\": $(SCH), but that file does not exist."
	@echo "  The schematic is vendored in this repository, so a missing file here means"
	@echo "  something is wrong IN THIS REPOSITORY - either the \"sch\" path in"
	@echo "  perfboard.json is wrong, or the schematic was not committed. Fix the path, or"
	@echo "  restore the file; no other repository is involved."
	@exit 1
else
# Every run regenerates the export to a temp file and reconciles it with the
# checked-in fixture through tools/perfboard/netlist-sync.ts - that module,
# not a shell pipeline here, holds the comparison logic (ignoring only the
# volatile `(date ...)` line kicad-cli stamps on every export) precisely so
# `bun test` can reach it. The fixture is rewritten ONLY when the substantive
# content differs, so an unchanged schematic still leaves `git status`
# clean; when it DOES differ, the CLI verb says so plainly, because that is
# the operator's cue that circuits/*.ts may now need updating too.
#
# THE FIXTURE IS NOT RAW KICAD-CLI OUTPUT. netlist-sync.ts also normalizes
# every machine-specific path kicad-cli stamps into the export - the design
# section's absolute `(source ...)` and, by pinning kicad-cli's own cwd to
# this repository's root, every component's `Sheetfile` - to a stable,
# repository-relative form, BEFORE the fixture is ever compared or written.
# That is why a clone at a different path never rewrites this file on its
# first run: see the module's own doc comment for the two hazards this
# closes. Regenerating the fixture by any OTHER means (a bare `kicad-cli sch
# export netlist`) reintroduces exactly the machine-specific path this
# guards against - always regenerate it through this target.
#
# The regenerated export is only half the safety: if the schematic moved and
# circuits/*.ts (the hand-authored transcription) was not updated to match,
# the circuit is now WRONG, and `check` would happily compare a stale
# circuit against the board. tests/circuits/<board>.test.ts already asserts
# that the transcription agrees with the export - "the schematic export
# describes the same circuit as the built board" and "every component's
# footprint matches the netlist of the built unit" - so this runs the sync
# first and then that file, rather than re-deriving the comparison here. A
# drifted transcription stops here, loudly, naming the mismatch bun test
# found, instead of `check` producing a confident wrong answer against a
# circuit nobody looked at again.
NETLIST_TEST := $(REPO_ROOT)/tests/circuits/$(notdir $(CURDIR)).test.ts

netlist-agrees:
	@bun "$(CLI)" netlist-sync --sch "$(SCH)" --netlist "$(NETLIST)" --kicad-cli "$(KICAD_CLI)"
	@if [ ! -f "$(NETLIST_TEST)" ]; then \
		echo "$(CURDIR) declares sch/netlist, but $(NETLIST_TEST) does not exist."; \
		echo "  Add tests there asserting the circuit still agrees with the schematic"; \
		echo "  export - that guard is what this declaration exists for."; \
		exit 1; \
	fi
	@cd "$(REPO_ROOT)" && bun test "$(NETLIST_TEST)"
endif
else
# No schematic declared: the graceful path a clone without the schematic's
# own repository needs. Nothing to regenerate, nothing to re-check here -
# `check` still checks the circuit against the .vrt exactly as it always did.
#
# BUT THIS BOARD GETS NO FRESHNESS GUARD AT ALL, and that must never be
# silent: `check` reported `ok <path>` in exactly the same words whether the
# circuit had just been verified against its schematic or never compared to
# one at all. A skipped check that looks identical to a passing one is the
# precise failure shape this whole workflow exists to prevent - see
# tools/perfboard/schematic-notice.ts (bun test reaches it; this recipe just
# calls it, same as every other verb here).
netlist-agrees:
	@bun "$(CLI)" schematic-notice -C "$(CURDIR)"
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
	@echo "  make import                            create this board's first layout"
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
	@echo "  KICAD_CLI            override: point at your OWN kicad-cli - consulted on"
	@echo "                       every run that declares \"sch\"/\"netlist\", since every"
	@echo "                       such run now re-exports the schematic to check it"
	@echo "  ALLOW_DIRTY=1        let update/stripboard write over uncommitted changes"

check: veroroute netlist-agrees
	@bun "$(CLI)" check -C "$(CURDIR)"

cuts: veroroute netlist-agrees
	@bun "$(CLI)" cuts -C "$(CURDIR)"

board-info:
	@bun "$(CLI)" board-info -C "$(CURDIR)"

import: veroroute netlist-agrees
	@bun "$(CLI)" import -C "$(CURDIR)"

update: veroroute netlist-agrees
	@bun "$(CLI)" update -C "$(CURDIR)" $(if $(ALLOW_DIRTY),--allow-dirty)

stripboard: veroroute netlist-agrees
	@bun "$(CLI)" stripboard -C "$(CURDIR)" $(if $(STRIPS),--strips "$(STRIPS)") $(if $(ALLOW_DIRTY),--allow-dirty)

edit: veroroute
	@bun "$(CLI)" edit -C "$(CURDIR)"
