# Schematic-parity and DRC for the pt2399-core board (tools/pcb/drc.ts).
#
# Both targets fail closed: a refusal (exit 2) means the check could not
# establish that it ran, which is not the same as the board failing (exit 1).
# The board file is written by a later task; until it exists these refuse
# naming the missing path.

ifndef PCB_MK
PCB_MK := 1

PCB_REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))..)
PT2399_BOARD := $(PCB_REPO_ROOT)/boards/pt2399-core/pt2399-core.kicad_pcb
PT2399_SCH := $(PCB_REPO_ROOT)/circuits/pt2399-core/pt2399-core.kicad_sch

.PHONY: parity-pt2399-core drc-pt2399-core

parity-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" parity

drc-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/drc-cli.ts" "$(PT2399_BOARD)" "$(PT2399_SCH)" drc --routed

endif
