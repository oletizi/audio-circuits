# The targets a directory gets because it does NOT hold a perfboard.json.
#
# The repository root and every intermediate directory land here, and they
# get the same two things: `check`, which walks down and checks every
# declared board beneath $(CURDIR), and `boards`, which lists them. There is
# no list of boards anywhere - the tree is the list, so a new board costs
# exactly a perfboard.json and a one-line Makefile, and nothing shared
# changes.
#
# `boards` is a listing: it shells out once to the TypeScript CLI (tools/cli/
# perfboard.ts) with -C $(CURDIR), which already discovers every
# perfboard.json beneath a directory and refuses (exit 1) rather than
# passing when it finds none - a gate that goes green having checked nothing
# is indistinguishable from one whose declarations were all deleted.
#
# `check` is NOT a second call into the CLI's own `check` verb over the whole
# list. That was this file's original shape, and it was a design error: the
# schematic-freshness prerequisite (netlist-agrees, make/board.mk) lives on
# the PER-BOARD `check` target, so calling the CLI once for every board here
# walked straight past it - the aggregate invocation, the one an operator
# reaches for to check everything at once, was the one invocation with no
# freshness guard at all. Instead, `check` here asks the CLI for the
# directory of every discovered board (`boards --paths` - discovery still
# lives in the CLI, never reimplemented as a directory walk in make) and
# recurses into each one's OWN `make -C <dir> check`, the same mechanism
# make/perfboard.mk already names for acting on a board from elsewhere. That
# gives every board its own prerequisites and leaves exactly one enforcement
# path instead of two that can silently disagree.
#
# xargs, not a shell for-loop: it runs `make -C <dir> check` for EVERY board
# even after one fails (never fail-fast, so one stale board never hides the
# next), and its own exit status is non-zero the moment any of those runs
# was - so a sweep that finds failures cannot exit 0. `boards --paths`
# failing outright (most commonly: no board declared anywhere under here) is
# checked separately and refuses before xargs ever runs, so "found nothing"
# still reads as the refusal it always was, not as an empty, silently
# successful sweep.

.PHONY: help perfboard-help check boards

.DEFAULT_GOAL := help

help: perfboard-help

perfboard-help:
	@echo "$(CURDIR)"
	@echo "This directory declares no board of its own, so it aggregates the"
	@echo "perfboards beneath it. The directory you stand in is the context - no"
	@echo "variables."
	@echo ""
	@echo "  make check           check every declared board beneath here"
	@echo "  make boards          every declared board beneath here"
	@echo ""
	@echo "One board at a time"
	@echo "  cd <board directory> && make cuts|update|stripboard|edit|check"
	@echo "  make -C <board directory> <target>    the same thing from here"
	@echo ""
	@echo "The toolchain"
	@echo "  make veroroute       acquire and build the pinned VeroRoute fork (a"
	@echo "                       no-op once it is already built)"
	@echo ""
	@echo "A directory becomes a board by gaining a perfboard.json and a Makefile"
	@echo "whose only line includes make/perfboard.mk - the same line this one has."
	@echo ""
	@echo "Environment - nothing here needs setting for the normal, zero-configuration"
	@echo "road above:"
	@echo "  VEROROUTE            override: point at your OWN veroroute-perfboard"
	@echo "                       checkout instead of the one this repository builds"
	@echo "  QMAKE                override: point at your OWN qmake"

check: veroroute
	@boards="$$(bun "$(CLI)" boards -C "$(CURDIR)" --paths)" || exit $$?; \
	printf '%s\n' "$$boards" | xargs -I{} $(MAKE) -C {} check

boards:
	@bun "$(CLI)" boards -C "$(CURDIR)"
