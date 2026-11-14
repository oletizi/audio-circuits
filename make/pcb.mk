# Schematic-parity and DRC for the pt2399-core board (tools/pcb/drc.ts).
#
# Both targets fail closed: a refusal (exit 2) means the check could not
# establish that it ran, which is not the same as the board failing (exit 1).
# The board sits beside its schematic in circuits/pt2399-core/ (same basename,
# which DRC needs). boards/pt2399-core/ is the built perfboard and is never a
# target. Until a later task writes the board these refuse naming the path.

ifndef PCB_MK
PCB_MK := 1

PCB_REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))..)
PT2399_BOARD := $(PCB_REPO_ROOT)/circuits/pt2399-core/pt2399-core.kicad_pcb
PT2399_SCH := $(PCB_REPO_ROOT)/circuits/pt2399-core/pt2399-core.kicad_sch
PT2399_INTENT := $(PCB_REPO_ROOT)/circuits/pt2399-core/floorplan-intent.json
PT2399_RULES := $(PCB_REPO_ROOT)/circuits/pt2399-core/placement-rules.json

.PHONY: parity-pt2399-core drc-pt2399-core drc-unrouted-pt2399-core update-pt2399-core
.PHONY: courtyard-rule-pt2399-core geometry-pt2399-core resolve-pt2399-core

# The headless Tools > Update PCB from Schematic (tools/pcb/update-from-schematic.ts):
# puts every schematic component on the board, with its fields, its schematic
# link and its nets. IN PLACE, and it refuses a board that already holds
# footprints - it does not do incremental updates, so the board it updates must
# be an empty one and placement is regenerated from the schematic every run.
# Nobody clicks that menu item in this repository.
#
# THIS TARGET WILL REFUSE AS THINGS STAND, AND THAT IS NOT A FAULT.
# $(PT2399_BOARD) HAS BEEN POPULATED - it carries its schematic's footprints,
# committed - so the tool refuses it at board-not-empty. Re-placing from the
# schematic means putting an empty board back first:
#
#     cp tests/fixtures/pcb/pt2399-core-empty/pt2399-core.kicad_pcb \
#        circuits/pt2399-core/pt2399-core.kicad_pcb
#
# That fixture is the board's own bytes before it was populated;
# tests/pcb/empty-board-fixture.test.ts is the authority on its provenance and
# on whether it has drifted from the committed board. A later task that needs to
# re-place reads this comment, so the sentence lives here rather than only in a
# plan: the refusal names the rule but no route back to an empty board.
update-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/update-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)"

# THE CUSTOM DESIGN RULE FILE IS A PREREQUISITE OF EVERY DRC TARGET, AND THAT
# IS THE POINT. The owner's hand-assembly spacing - "Use 2mm min spacing", with
# "remember that I have fingers... I'm not a pick and place machine" behind it -
# is enforced by two mechanisms at one number: the placer's --clearance while a
# placement is made, and a KiCad `(constraint courtyard_clearance (min 2mm))` so
# the shipped board is checkable independently of the placer that produced it.
# That second mechanism is a hand-editable .kicad_dru that nothing else here
# reads: tools/pcb/fab-standard.ts checks the .kicad_pro and says in its own
# header what it does not cover. Deleted, renamed or quietly loosened, the file
# would leave a DRC run passing with the spacing unchecked - so the check runs
# BEFORE the DRC rather than beside it, and a drift refuses instead of being
# reported after a clean-looking result.
#
# THIS GATES ONE BOARD, BY THIS PREREQUISITE AND NOTHING ELSE. A second board
# that gains a .kicad_dru gets no check until someone adds the same
# prerequisite for it; the generic mechanism is deliberately not built, since
# there is no second board. tools/pcb/fab-standard.ts's header carries the
# whole limitation, in the file a second board's author would read.
courtyard-rule-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/courtyard-rule.ts" "$(PT2399_BOARD)" "$(PT2399_RULES)"

parity-pt2399-core: courtyard-rule-pt2399-core
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" parity

# An unrouted candidate: unconnected items are counted, not failed.
drc-unrouted-pt2399-core: courtyard-rule-pt2399-core
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" drc --unrouted

# A board declared fully routed: any unconnected item fails.
drc-pt2399-core: courtyard-rule-pt2399-core
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" drc --routed

# THE GEOMETRY, WRITTEN FROM THE APPROVED CRITERIA AND NOT FROM A MEASUREMENT.
# The board is 150 x 100 mm because the owner said so - "increase the board size
# to 150mm x 100mm" - and floorplan-intent.json's `envelope.size_mm` records it,
# so the outline is WRITTEN from that key rather than shrunk to the parts. The
# four M3 holes follow from the outline's corners and
# placement-rules.json's anchors.mounting_holes. Both steps are idempotent by
# replacement: re-running after the size changes moves the edge and the holes
# together, which is the one failure mode that matters here.
#
# The origin (10, 10) is not a criterion and nothing checks it: where the
# rectangle sits on the sheet is explicitly not part of the owner's ruling, and
# floorplan-intent.json says why it declares a SIZE and not a rect. The resolver
# compares the size and ignores the origin.
#
# SEEDING AND GRADING ARE NOT TARGETS HERE. They need the pinned engine's venv
# with PYTHONHOME/PYTHONPATH stripped, which is make/krt.mk's business and a
# later task's to wire up; build/krt/invocations.json records the command
# shapes. The two that settled this board, run from .tools/krt:
#
#   .venv/bin/python py_placer/place_seed.py <in> <out> --intent <resolved> \
#       --force --clearance 2.0 --seed 1
#   .venv/bin/python py_tools/check_floorplan.py <board> --intent <resolved> \
#       --require-rules 1
#
# where <resolved> is written by resolve-pt2399-core below. place_seed exits 4
# on this board and the board is still correct: its internal grade takes
# `margin = max(clearance, board_edge_clearance)`, so --clearance 2.0 also
# becomes a 2.0 mm board-edge margin, and the four mounting-hole courtyards sit
# 0.5 mm from the edge BY THE APPROVED RULE. check_floorplan grades at the
# board's own 0.25 mm / 0.5 mm and passes. See the Task 8 report.
geometry-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/board-outline.ts" "$(PT2399_BOARD)" --write-declared \
	    "$(PT2399_INTENT)" 10 10 "7a110000-0000-4000-8000-00000000ed9e"
	@bun "$(PCB_REPO_ROOT)/tools/pcb/place-mounting-holes.ts" "$(PT2399_BOARD)" "$(PT2399_RULES)" --write

# The resolved intent is a DERIVED artifact and is not committed: the approved
# floorplan-intent.json declares fractions and no coordinates, and the rects,
# the compass edge and the mounting-hole keepouts are computed from the board's
# own outline every run.
resolve-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/resolve-intent-zones.ts" "$(PT2399_BOARD)" "$(PT2399_INTENT)" \
	    "$(PCB_REPO_ROOT)/build/pcb/pt2399-core/resolved-intent.json" "$(PT2399_RULES)"

endif
