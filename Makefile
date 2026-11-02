# Perfboard targets; `make help` lists them. This line is the whole of what a
# board or aggregate directory needs.
include $(shell git rev-parse --show-toplevel)/make/perfboard.mk

# Repository-wide guards, at the root only. The reference network is not a
# board, so its freshness guard cannot hang off a perfboard.json; adding it as
# a prerequisite here gives the root's `check` one more thing to verify without
# the generic board mechanism having to know the reference exists.
include $(shell git rev-parse --show-toplevel)/make/pultec.mk
include $(shell git rev-parse --show-toplevel)/make/tascam-38.mk

# The type checker is a GATE and not a thing to remember. Nothing else in this
# repository runs it: there is no CI, `bun test` does not typecheck, and until
# this prerequisite existed `tsc` ran only when a person or an agent thought to
# run it by hand. Every type-level guard the tools rely on - a branded witness
# type, an exhaustive `switch` over a refusal union, a signature that refuses a
# parsed object where text is required - is worth exactly as much as the step
# that checks it is mandatory, and that step was optional.
#
# It is first in THIS target's prerequisite list deliberately, so it runs
# before the schematic and scaffold guards and before the board walk: a board
# disagreeing with its schematic is a slower, more confusing failure to read
# than a type error, and a type error usually explains it. It is not the first
# thing `make check` runs overall - acquiring the VeroRoute binary precedes it,
# because the board checks need the binary and `make -n check` shows that
# ordering.
#
# `bun run check` is the same gate without the boards, for the common case of
# changing tools or tests and wanting both answers quickly.
typecheck:
	bun run typecheck

.PHONY: typecheck

check: typecheck pultec-schematic-agrees pultec-scaffold-agrees tascam-38-interface-valid
