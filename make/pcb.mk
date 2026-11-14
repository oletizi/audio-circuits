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

.PHONY: parity-pt2399-core drc-pt2399-core drc-unrouted-pt2399-core update-pt2399-core

# The headless Tools > Update PCB from Schematic (tools/pcb/update-from-schematic.ts):
# puts every schematic component on the board, with its fields, its schematic
# link and its nets. IN PLACE, and it refuses a board that already holds
# footprints - it does not do incremental updates, so the board it updates must
# be an empty one and placement is regenerated from the schematic every run.
# Nobody clicks that menu item in this repository.
#
# THIS TARGET WILL REFUSE AS THINGS STAND, AND THAT IS NOT A FAULT.
# $(PT2399_BOARD) HAS BEEN POPULATED - it carries 24 footprints, committed - so
# the tool refuses it at board-not-empty. Re-placing from the schematic means
# putting an empty board back first:
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

parity-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" parity

# An unrouted candidate: unconnected items are counted, not failed.
drc-unrouted-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" drc --unrouted

# A board declared fully routed: any unconnected item fails.
drc-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" drc --routed

endif
