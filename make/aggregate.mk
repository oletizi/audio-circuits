# The targets a directory gets because it does NOT hold a perfboard.json.
#
# The repository root and every intermediate directory land here, and they
# get the same two things: `check`, which walks down and checks every
# declared board beneath $(CURDIR), and `boards`, which lists them. There is
# no list of boards anywhere - the tree is the list, so a new board costs
# exactly a perfboard.json and a one-line Makefile, and nothing shared
# changes.
#
# Both targets are thin: they shell out to the TypeScript CLI (tools/cli/
# perfboard.ts) with -C $(CURDIR), which already discovers every
# perfboard.json beneath a directory and refuses (exit 1) rather than
# passing when it finds none - a gate that goes green having checked nothing
# is indistinguishable from one whose declarations were all deleted.

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
	@bun "$(CLI)" check -C "$(CURDIR)"

boards:
	@bun "$(CLI)" boards -C "$(CURDIR)"
