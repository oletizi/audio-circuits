# Repository-wide guards that belong to no single board.
#
# INCLUDED ONLY BY THE ROOT Makefile. Everything in make/perfboard.mk is
# deliberately board-shaped - "a directory holding a perfboard.json" and
# nothing more specific - and the reference network is not a board. It is the
# thing five boards are derived FROM, so its guard runs once, here, rather
# than five times over on boards whose circuits are not transcriptions of it.
#
# THE SCHEMATIC IS THE ROOT OF THE REFERENCE'S DEPENDENCY GRAPH, and since it
# was vendored into this repository it is the root of a graph that lives
# entirely inside it:
#
#   circuits/pultec/pultec-three-band-eq.kicad_sch
#     -> reference/pultec/source/three-band-eq.net.xml       (kicad-cli)
#     -> reference/pultec/source/three-band-eq.netlist.json  (to-json.py)
#     -> THREE_BAND_REFERENCE                                (from-netlist.ts)
#     -> the five boards under boards/pultec-*
#
# As in make/board.mk there is deliberately NO file rule with the schematic as
# a prerequisite. git does not preserve mtimes, so checking out a branch
# carrying a stale export can stamp it newer than a schematic edited long
# before, and every such accident makes stale look current rather than the
# reverse. The recipe regenerates the export EVERY run and decides from
# content.

.PHONY: pultec-schematic-agrees

pultec-schematic-agrees:
	@bun "$(REPO_ROOT)/tools/reference/sync-pultec-schematic.ts"
