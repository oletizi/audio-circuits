# The veroroute this build system owns, shared by every level of Makefile.
#
# VEROROUTE and QMAKE both follow the same shape, one level apart. This file
# states its OWN contingent defaults and exports them, so no operator ever
# sets an environment variable to use this tooling:
#
#   VEROROUTE ?= $(VEROROUTE_BUILT)   the binary this repo builds under .tools/
#   QMAKE     ?= <brew's qt@5>/bin/qmake   Homebrew's keg-only Qt5
#
# An explicitly set VEROROUTE still wins: the operator is pointing at their
# own veroroute-perfboard checkout, and nothing here clones, builds, or
# rebuilds over work it does not own. An explicitly set QMAKE still wins the
# same way, one level down the build.
#
# make OWNS this configuration; the TypeScript CLI (tools/cli/perfboard.ts)
# does the actual cloning, checking out and building (tools/perfboard/
# acquire.ts, which runs the fork's own build.sh) - this file never
# reimplements that, it only decides what VEROROUTE and QMAKE resolve to and
# hands them downstream through the environment.

ifndef PERFBOARD_VEROROUTE_MK
PERFBOARD_VEROROUTE_MK := 1

REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))..)
CLI       := $(REPO_ROOT)/tools/cli/perfboard.ts

VEROROUTE_BUILT := $(REPO_ROOT)/.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute

VEROROUTE ?= $(VEROROUTE_BUILT)
export VEROROUTE

QMAKE ?= $(shell brew --prefix qt@5 2>/dev/null)/bin/qmake
export QMAKE

.PHONY: veroroute

# Acquires and builds the pinned fork; a no-op once $(VEROROUTE) already
# exists there, because a Qt5 compile takes minutes and every OTHER target
# that needs the binary declares this as a prerequisite - it must be cheap on
# every run after the first.
#
# The qmake check below runs ONLY when it is about to matter: VEROROUTE is
# still the path THIS repository acquires (never an operator's own override)
# and nothing is built there yet. A machine with an already-built binary, or
# an operator pointing at their own checkout, never needs Qt5 installed at
# all just to run "make check" again.
veroroute:
	@if [ "$(VEROROUTE)" = "$(VEROROUTE_BUILT)" ] && [ ! -x "$(VEROROUTE)" ] && [ ! -f "$(QMAKE)" ]; then \
		echo "no qmake at $(QMAKE): this build needs Homebrew's qt@5."; \
		echo "  brew install qt@5"; \
		echo "or set QMAKE to point at a qmake from a non-Homebrew Qt installation."; \
		exit 1; \
	fi
	@bun "$(CLI)" veroroute

endif
