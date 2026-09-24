# Perfboard targets; `make help` lists them. This line is the whole of what a
# board or aggregate directory needs.
include $(shell git rev-parse --show-toplevel)/make/perfboard.mk

# Repository-wide guards, at the root only. The reference network is not a
# board, so its freshness guard cannot hang off a perfboard.json; adding it as
# a prerequisite here gives the root's `check` one more thing to verify without
# the generic board mechanism having to know the reference exists.
include $(shell git rev-parse --show-toplevel)/make/pultec.mk

check: pultec-schematic-agrees
