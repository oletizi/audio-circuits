# The perfboard mechanism, for every directory in this repository.
#
# A HAND-BUILT STRIPBOARD layout is a physical thing on a bench. There is no
# PCB fab flow for it and nothing downstream to regenerate; the only thing
# that can go stale is its agreement with the circuit it was built from.
# This file, and the two it includes, are how that agreement is checked and
# how the layout is worked on without opening a GUI first.
#
# NOTHING HERE NAMES A BOARD. It knows about "a directory holding a
# perfboard.json" and nothing more specific, so a new board costs exactly a
# perfboard.json and this file's one include line - never a list to update.
#
# THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. There are no variables to
# remember in the common case:
#
#     cd boards/pt2399-core && make check     checks that one board
#     make check                              checks every board under here
#
# A directory holding a perfboard.json is a BOARD: it gets the single-board
# targets (make/board.mk), and `check` checks itself. Any other directory is
# an AGGREGATE (make/aggregate.mk): it gets `boards` and a `check` that walks
# down from where it was run. One rule, two scopes, no list of boards
# anywhere.
#
# TO ACT ON A BOARD FROM OUTSIDE ITS DIRECTORY, use make's own flag:
# `make -C boards/pt2399-core check`. That is the same mechanism driven from
# elsewhere, not a second one - there is deliberately no BOARD=<name>
# variable.
#
# Every directory opts in with exactly one line:
#
#     include $(shell git rev-parse --show-toplevel)/make/perfboard.mk

PERFBOARD_MAKE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

include $(PERFBOARD_MAKE_DIR)veroroute.mk

# `draught-doctor` IS MACHINE-WIDE, NOT PER-BOARD, SO IT LIVES HERE RATHER
# THAN IN make/aggregate.mk OR make/board.mk. It names every disagreement
# between the pinned drawing toolchain (draughting/tools.lock.json) and what
# is actually installed on this machine, and exits non-zero when there is at
# least one - a report that is silent on success would be indistinguishable
# from a check that never ran. $(REPO_ROOT) is the whole of its context, the
# same as every other toolchain target here; there is deliberately no
# BOARD=<name> or other selecting variable, because this verb does not act on
# a board at all.
.PHONY: draught-doctor

draught-doctor:
	@bun "$(REPO_ROOT)/tools/cli/draught.ts"

# The declaration in THIS directory, if there is one. Its presence is the
# whole of the board-versus-aggregate decision - no lists of boards anywhere.
BOARD_DECL := $(wildcard $(CURDIR)/perfboard.json)

.DEFAULT_GOAL := help

ifeq ($(BOARD_DECL),)
include $(PERFBOARD_MAKE_DIR)aggregate.mk
else
include $(PERFBOARD_MAKE_DIR)board.mk
endif
