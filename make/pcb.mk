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
.PHONY: courtyard-rule-pt2399-core geometry-pt2399-core resolve-pt2399-core grade-pt2399-core

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
# GRADING IS A TARGET: `grade-pt2399-core` below, and it is the one to use.
# SEEDING is not, and needs the pinned engine's venv by hand.
#
# THIS COMMENT SAID "SEEDING AND GRADING ARE NOT TARGETS HERE ... a later task's
# to wire up" WHILE grade-pt2399-core WAS ALREADY DEFINED BELOW IT, added in
# the same change that wrote the sentence. The stale half is not the problem;
# where it sent the reader is. It handed them a raw `check_floorplan.py --intent
# <resolved>` line, which BYPASSES the board binding - so after the outline
# changed, someone following this file's own documentation would grade the new
# board against whatever resolved intent was sitting in
# build/pcb/pt2399-core/, which is exactly where both resolve-pt2399-core and
# grade-cli.ts write one. The old zone rect and the old keepout circles would
# then grade the new board and could report a pass. The guard that makes that
# unreachable was already here and this comment denied it existed.
#
# (This sentence carried a line count - "fifty lines below" - which was
# already wrong by about forty when it was written, as was the review that
# first said "forty". A line number in prose rots exactly as the
# <pre-placement commit> placeholder below did, so it names the target
# instead of where the target sits.)
#
# THE STEP ORDER, which the rest of this block left to be inferred:
#
#   1. geometry-pt2399-core        the outline, then the four holes
#   2. resolve-pt2399-core         the rects, the edge and the keepouts, from
#                                  that outline, stamped with the board's sha256
#   3. place_seed.py               the placement, against that resolved intent
#   4. grade-pt2399-core           re-resolves and grades (do NOT skip to the
#                                  raw grader: see above)
#
# Step 3 is the only one without a target, run from .tools/krt with
# PYTHONHOME/PYTHONPATH unset (build/krt/invocations.json records the shapes):
#
#   .venv/bin/python py_placer/place_seed.py <in> <out> --intent <resolved> \
#       --force --clearance 2.0 --seed 1
#
# AND ITS INPUT MUST BE A BOARD WITH NO PLACEMENT LOCKS, which the committed
# board is not. The seeder STAMPS `(locked yes)` on the intent's must_lock refs,
# so the committed board carries a lock on J1 (plus the four holes, which the
# geometry step writes locked on purpose) - and `seed_from_intent` treats a
# file-locked ref as ALREADY PLACED, so re-seeding from the committed board
# leaves J1 wherever it is instead of seating it on its edge and the whole
# packing comes out different. Measured: from the committed board, hpwl 525.433
# and a decap_distance failure; from the pre-placement board, the committed hpwl
# 532.594 and a clean grade. The pinned engine does not converge on its own
# output, and that is its property rather than something this repository can fix.
#
# THE STARTING BOARD IS b926f69's, and that sha is pinned here rather than left
# as `<pre-placement commit>`:
#
#   git show b926f69:circuits/pt2399-core/pt2399-core.kicad_pcb > $(PT2399_BOARD)
#
# It is the last commit before the placement was settled, it carries 0 locks
# against the committed board's 5 (measured), and both this task's reviewers
# regenerated the delivered board from it byte-identically modulo uuids. The
# placeholder was the whole defect: b926f69 appeared NOWHERE in the repository -
# its only copy was in gitignored .superpowers/, which this project's own rule
# says is "destroyed by `git clean -fdx`" - so the documented route named a
# commit nobody could find.
#
# `make update-pt2399-core` on the empty fixture ALSO produces a board with no
# locks, and it is NOT offered as equivalent, because nothing here establishes
# that it reproduces the board the adopted seed was computed from.
# tests/pcb/empty-board-fixture.test.ts is the authority on that fixture's
# provenance and says nothing about re-running the update. Use it if you want a
# fresh board; use the sha if you want THIS one.
#
# geometry-pt2399-core above is NOT affected by any of this: it rewrites only the
# outline and the holes, is byte-idempotent against the committed board, and
# tests/pcb/mounting-hole-placement.test.ts pins that.
#
# AND place_seed EXITS 4 on this board while the board is still correct: its
# internal grade takes
# `margin = max(clearance, board_edge_clearance)`, so --clearance 2.0 also
# becomes a 2.0 mm board-edge margin, and the four mounting-hole courtyards sit
# 0.5 mm from the edge BY THE APPROVED RULE. check_floorplan grades at the
# board's own 0.25 mm / 0.5 mm and passes. See the Task 8 report.
geometry-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/board-outline.ts" "$(PT2399_BOARD)" --write-declared \
	    "$(PT2399_INTENT)" 10 10 "7a110000-0000-4000-8000-00000000ed9e"
	@bun "$(PCB_REPO_ROOT)/tools/pcb/place-mounting-holes.ts" "$(PT2399_BOARD)" "$(PT2399_RULES)" --write

# GRADE THE BOARD. This is the documented grading path, and it RESOLVES FIRST
# rather than trusting whatever resolved intent is on disk.
#
# The engine's grader takes the board and the resolved intent as two separate
# arguments and never re-derives the outline to check that they belong together,
# so a resolved file from before an outline change grades the OLD zone rect and
# the OLD keepout circles against the NEW board - and can report a pass. The
# engine is pinned and not ours to change, so the binding is on this side: every
# resolved file carries a sha256 of the board it came from, and this target
# re-resolves and verifies before grading. tools/pcb/grade-cli.ts states what
# remains unguarded (a hand-run of check_floorplan.py against a file nobody
# re-resolved) rather than implying it cannot happen.
grade-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/grade-cli.ts" "$(PT2399_BOARD)" "$(PT2399_INTENT)" \
	    "$(PT2399_RULES)" "$(PCB_REPO_ROOT)/build/pcb/pt2399-core"

# The resolved intent is a DERIVED artifact and is not committed: the approved
# floorplan-intent.json declares fractions and no coordinates, and the rects,
# the compass edge and the mounting-hole keepouts are computed from the board's
# own outline every run. `grade-pt2399-core` above is the path that uses it;
# this target is for looking at it.
resolve-pt2399-core:
	@bun "$(PCB_REPO_ROOT)/tools/pcb/resolved-intent.ts" "$(PT2399_BOARD)" "$(PT2399_INTENT)" \
	    "$(PCB_REPO_ROOT)/build/pcb/pt2399-core/resolved-intent.json" "$(PT2399_RULES)"

endif
