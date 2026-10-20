# The targets a directory gets because it holds a perfboard.json.
#
# Everything here acts on THIS directory's board. $(CURDIR) is the whole of
# the context - no BOARD=<name> variable, because two ways to say which board
# is two places for one fact to be wrong. Every recipe is thin: it shells out
# to the TypeScript CLI (tools/cli/perfboard.ts) with -C $(CURDIR), which
# already knows how to resolve, check, and rewrite exactly one declared
# board. No board logic is reimplemented here.
#
# WHAT WRITES. `check`, `cuts` and `board-info` write nothing. `bom` rewrites
# this board's BOM.md and never its bom.json or the parts/ catalog. `update`,
# `stripboard` and `adopt` rewrite the declared layout IN PLACE - the CLI itself
# refuses while the layout has uncommitted changes, unless ALLOW_DIRTY=1 is
# passed through as --allow-dirty. `edit` writes nothing itself; it hands the
# layout to the GUI, which writes only when you save. `guide` never touches
# the layout; it replaces this board's git-ignored guide/ directory. `place`
# writes only under build/stripboard/, and `adopt` is the one target by which
# anything the pipeline produced reaches this board (CRITERIA G1).
#
# THE SCHEMATIC IS THE ROOT OF THIS DEPENDENCY GRAPH. SCH and NETLIST come
# from THIS board's own declaration (perfboard.json's optional
# "sch"/"netlist" pair), read through the CLI's `board-info --field` so this
# file never reimplements the JSON parsing. Both are empty together when a
# board declares neither - the graceful path for a clone without the
# schematic's own repository - and everything below is inert in that case.
#
# THERE IS DELIBERATELY NO $(NETLIST): $(SCH) FILE RULE. That would be
# idiomatic make, and it is not sound here: git does not preserve mtimes, so
# checking out a branch carrying a STALE export can stamp it newer than a
# schematic edited long before - and only the export side of that can ever
# be falsely freshened this way, never the schematic, because the schematic
# lives in a different repository this repo's own checkouts never touch.
# Every mtime accident here would make stale look current, never the
# reverse. `netlist-agrees` below regenerates the export EVERY run instead
# (tools/perfboard/netlist-sync.ts) and decides freshness from content, not
# a clock - the export costs well under half a second, so there is no
# performance reason to trust a timestamp instead.
SCH     := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field sch)
NETLIST := $(shell bun "$(CLI)" board-info -C "$(CURDIR)" --field netlist)

# KICAD_CLI follows the VEROROUTE/QMAKE shape from veroroute.mk in spirit -
# an explicitly set KICAD_CLI (environment, or `make KICAD_CLI=...`) always
# wins outright, and the result is exported so it reaches any recipe that
# needs it - but NOT in the letter any more, and docs/known-gaps.md **G170**
# is why: a plain `KICAD_CLI ?= <macOS literal>` here, once Task 10b gave
# every TypeScript call site a per-platform resolver (lib/kicad/install.ts),
# became the one thing that still handed a Linux or Windows `make check` the
# macOS path regardless of platform - on 21 bun invocations that inherit the
# export, AND on netlist-agrees/guide below, which pass $(KICAD_CLI) as an
# explicit --kicad-cli flag that no environment change can touch. $(origin)
# distinguishes "the user set this" from "nothing set this yet": only the
# second case shells out to tools/cli/resolved-default.ts, which is the one
# place Make, unable to import TypeScript itself, calls into the resolver -
# the same bridge $(SCH)/$(NETLIST) above already use for board-info.
ifeq ($(origin KICAD_CLI),undefined)
KICAD_CLI := $(shell bun "$(REPO_ROOT)/tools/cli/resolved-default.ts" kicad-cli)
endif
export KICAD_CLI

# HTML_TO_PDF follows THE SAME SHAPE and the same G170 fix, and for the same
# reason: printing the build guide is part of this build system, not
# something an operator does by hand in a browser afterwards, so the
# converter is a resolved, overridable variable here rather than a path
# buried in TypeScript - and, as of G170, not a bare macOS literal either.
#
# It must be a Chromium-family browser binary - `guide` invokes it with
# --headless --no-pdf-header-footer --print-to-pdf and a throwaway
# --user-data-dir, and the guide page's own @page/@media print rules do the
# pagination. There is no fallback: a missing converter refuses by name
# (tools/guide/print-pdf.ts) rather than writing a packet whose PDF is
# quietly absent.
ifeq ($(origin HTML_TO_PDF),undefined)
HTML_TO_PDF := $(shell bun "$(REPO_ROOT)/tools/cli/resolved-default.ts" html-to-pdf)
endif
export HTML_TO_PDF

.PHONY: help perfboard-help check cuts import update stripboard edit guide bom board-info netlist-agrees wiring scaffold-membership place adopt print-%

# print-%: prints any Make variable's final, resolved value - `make
# print-KICAD_CLI` - the GNU Make idiom for inspecting what a variable
# actually became. It is how tests/kicad/install.test.ts proves KICAD_CLI
# and HTML_TO_PDF reach lib/kicad/install.ts's resolver when unset, and leave
# an explicit override untouched, without the test having to re-parse this
# file's own ifeq/shell logic to predict what Make would do with it
# (docs/known-gaps.md G170).
print-%:
	@echo '$($*)'

ifneq ($(strip $(SCH)),)
ifeq ($(wildcard $(SCH)),)
# The declaration names a schematic that is not there. Refuse naming it,
# exactly as a missing .vrt refuses in tools/perfboard/check.ts - never
# silently treat a broken declaration as "no schematic declared."
netlist-agrees:
	@echo "$(CURDIR)/perfboard.json declares \"sch\": $(SCH), but that file does not exist."
	@echo "  The schematic is vendored in this repository, so a missing file here means"
	@echo "  something is wrong IN THIS REPOSITORY - either the \"sch\" path in"
	@echo "  perfboard.json is wrong, or the schematic was not committed. Fix the path, or"
	@echo "  restore the file; no other repository is involved."
	@exit 1
else
# Every run regenerates the export to a temp file and reconciles it with the
# checked-in fixture through tools/perfboard/netlist-sync.ts - that module,
# not a shell pipeline here, holds the comparison logic (ignoring only the
# volatile `(date ...)` line kicad-cli stamps on every export) precisely so
# `bun test` can reach it. The fixture is rewritten ONLY when the substantive
# content differs, so an unchanged schematic still leaves `git status`
# clean; when it DOES differ, the CLI verb says so plainly, because that is
# the operator's cue that circuits/*.ts may now need updating too.
#
# THE FIXTURE IS NOT RAW KICAD-CLI OUTPUT. netlist-sync.ts also normalizes
# every machine-specific path kicad-cli stamps into the export - the design
# section's absolute `(source ...)` and, by pinning kicad-cli's own cwd to
# this repository's root, every component's `Sheetfile` - to a stable,
# repository-relative form, BEFORE the fixture is ever compared or written.
# That is why a clone at a different path never rewrites this file on its
# first run: see the module's own doc comment for the two hazards this
# closes. Regenerating the fixture by any OTHER means (a bare `kicad-cli sch
# export netlist`) reintroduces exactly the machine-specific path this
# guards against - always regenerate it through this target.
#
# The regenerated export is only half the safety: if the schematic moved and
# circuits/*.ts (the hand-authored transcription) was not updated to match,
# the circuit is now WRONG, and `check` would happily compare a stale
# circuit against the board. tests/circuits/<board>.test.ts already asserts
# that the transcription agrees with the export - "the schematic export
# describes the same circuit as the built board" and "every component's
# footprint matches the netlist of the built unit" - so this runs the sync
# first and then that file, rather than re-deriving the comparison here. A
# drifted transcription stops here, loudly, naming the mismatch bun test
# found, instead of `check` producing a confident wrong answer against a
# circuit nobody looked at again.
NETLIST_TEST := $(REPO_ROOT)/tests/circuits/$(notdir $(CURDIR)).test.ts

netlist-agrees:
	@bun "$(CLI)" netlist-sync --sch "$(SCH)" --netlist "$(NETLIST)" --kicad-cli "$(KICAD_CLI)"
	@if [ ! -f "$(NETLIST_TEST)" ]; then \
		echo "$(CURDIR) declares sch/netlist, but $(NETLIST_TEST) does not exist."; \
		echo "  Add tests there asserting the circuit still agrees with the schematic"; \
		echo "  export - that guard is what this declaration exists for."; \
		exit 1; \
	fi
	@cd "$(REPO_ROOT)" && bun test "$(NETLIST_TEST)"
endif
else
# No schematic declared: the graceful path a clone without the schematic's
# own repository needs. Nothing to regenerate, nothing to re-check here -
# `check` still checks the circuit against the .vrt exactly as it always did.
#
# BUT THIS BOARD GETS NO FRESHNESS GUARD AT ALL, and that must never be
# silent: `check` reported `ok <path>` in exactly the same words whether the
# circuit had just been verified against its schematic or never compared to
# one at all. A skipped check that looks identical to a passing one is the
# precise failure shape this whole workflow exists to prevent - see
# tools/perfboard/schematic-notice.ts (bun test reaches it; this recipe just
# calls it, same as every other verb here).
netlist-agrees:
	@bun "$(CLI)" schematic-notice -C "$(CURDIR)"
endif

.DEFAULT_GOAL := help

help: perfboard-help

perfboard-help:
	@echo "$(notdir $(CURDIR)) - a declared perfboard. No variables needed; the"
	@echo "directory you are in is the board."
	@echo ""
	@echo "Check (read-only)"
	@echo "  make check           check this layout against the circuit it was built from,"
	@echo "                       and grade the four buildability constraints the adoption"
	@echo "                       gate already applied: HC5 (no lead stretched past the"
	@echo "                       part's reach), HC9 (none compressed below its floor),"
	@echo "                       HC8 (the copper partitions the pins exactly as the"
	@echo "                       netlist does) and HC10 (no pin pattern the strips cannot"
	@echo "                       take). A footprint with no span or pattern recorded is"
	@echo "                       REFUSED by name rather than guessed at. It also checks"
	@echo "                       this board's scaffold doc against the parts the layout"
	@echo "                       holds (see scaffold-membership below)"
	@echo "  make scaffold-membership"
	@echo "                       every stand-in group in this board's SCAFFOLD claims"
	@echo "                       parts the layout actually holds, and no part is claimed"
	@echo "                       by two groups - the comparison the hatched stand-in"
	@echo "                       diagram in the build packet rests on. A board that"
	@echo "                       declares no SCAFFOLD prints a NOTICE saying so rather"
	@echo "                       than passing silently. check runs this"
	@echo "  make cuts            print the cut list and solder bridges"
	@echo "  make board-info      what this directory declares"
	@echo ""
	@echo "Work on it (these write the layout; git is the undo)"
	@echo "  make import                            create this board's first layout -"
	@echo "                                          refuses if one already exists. It"
	@echo "                                          arrives in ISOLATED-HOLE mode, so"
	@echo "                                          run \`make stripboard STRIPS=...\`"
	@echo "                                          next, matching the way the physical"
	@echo "                                          board's strips run - until then"
	@echo "                                          \`make cuts\` has no strips to cut"
	@echo "  make wiring                            regenerate the panel wiring guide"
	@echo "                                          (check does this too)"
	@echo "  make update                            apply the circuit to this layout IN"
	@echo "                                          PLACE - refuses while it has"
	@echo "                                          uncommitted changes"
	@echo "  make stripboard STRIPS=horizontal|vertical"
	@echo "                                          convert this layout to strip mode IN"
	@echo "                                          PLACE - refuses while it has"
	@echo "                                          uncommitted changes"
	@echo "  ALLOW_DIRTY=1                           accept that the write cannot be"
	@echo "                                          undone through git"
	@echo ""
	@echo "Let the pipeline lay it out (writes only build/stripboard/, never the layout)"
	@echo "  make place SEED_ARM=constructed|import|random"
	@echo "                                          run the stripboard pipeline on this"
	@echo "                                          board and print its report. SEED_ARM"
	@echo "                                          is REQUIRED: the three starting arms"
	@echo "                                          are an experiment with random as its"
	@echo "                                          control, and an arm chosen for you"
	@echo "                                          would be a comparison nobody named -"
	@echo "                                          so the run refuses without one"
	@echo "  FROZEN=<fixture> NETLIST_EXPORT=<export>"
	@echo "                                          run the FROZEN hand layout's"
	@echo "                                          benchmark instead of this board"
	@echo "  SWEEP=1                                 add the seed-set diagnostic: one run"
	@echo "                                          per reviewed seed, each with the full"
	@echo "                                          evaluation cap. No number is attached"
	@echo "                                          to the rate and it changes no verdict"
	@echo ""
	@echo "Admit one of its layouts (the ONLY pipeline target that writes this board)"
	@echo "  make adopt RUN=<run directory>"
	@echo "                                          admit the candidate that run"
	@echo "                                          produced into this board, IN PLACE."
	@echo "                                          RUN is REQUIRED: there is no default"
	@echo "                                          run, because adopting off the most"
	@echo "                                          recent directory would be adopting"
	@echo "                                          off whatever the clock last named."
	@echo "                                          It refuses ten things by name -"
	@echo "                                          among them a candidate whose hash"
	@echo "                                          disagrees with its run.json, a rules"
	@echo "                                          or span file edited since the run, a"
	@echo "                                          verdict that is not admissible, and"
	@echo "                                          an uncommitted layout - and it runs"
	@echo "                                          \`make check\` after the copy,"
	@echo "                                          reverting the copy if that fails"
	@echo "  CANDIDATE=<vrt>                         which .vrt to admit. Optional:"
	@echo "                                          run.json identifies it by sha256"
	@echo "  ALLOW_DIRTY=1                           accept that the write cannot be"
	@echo "                                          undone"
	@echo ""
	@echo "Hand it to the GUI"
	@echo "  make edit            open this layout in the forked VeroRoute"
	@echo ""
	@echo "Build it on the bench"
	@echo "  make guide           write the printable build packet into guide/: the three"
	@echo "                       layout images, a black-and-white schematic PDF (only if"
	@echo "                       this board declares \"sch\"), the guide itself as"
	@echo "                       guide.html AND as guide.pdf printed from it - the PDF is"
	@echo "                       the thing you take to the bench. Replaces guide/, never"
	@echo "                       the layout; refuses while cuts are unresolved, a part is"
	@echo "                       unplaced, or the HTML_TO_PDF converter is missing, and"
	@echo "                       leaves the previous packet intact when it does"
	@echo ""
	@echo "Buy the parts"
	@echo "  make bom             compare what the circuit needs with bom.json and the"
	@echo "                       parts/ catalog, print what is unchosen, removed,"
	@echo "                       unmet, unknown or stale-priced, and rewrite"
	@echo "                       BOM.md - never bom.json or the catalog; exits 1 until"
	@echo "                       every line is chosen and met, no chosen line is gone"
	@echo "                       from the circuit and every part id is in the catalog"
	@echo "                       (stale prices only warn)"
	@echo ""
	@echo "The toolchain"
	@echo "  make veroroute       acquire and build the pinned VeroRoute fork (a"
	@echo "                       no-op once it is already built)"
	@echo ""
	@echo "Elsewhere"
	@echo "  make -C <dir> <target>   act on another board without leaving this one"
	@echo "  cd .. && make check      check every board under that directory"
	@echo ""
	@echo "Environment - nothing here needs setting for the normal, zero-configuration"
	@echo "road above:"
	@echo "  VEROROUTE            override: point at your OWN veroroute-perfboard"
	@echo "                       checkout instead of the one this repository builds"
	@echo "  QMAKE                override: point at your OWN qmake"
	@echo "  KICAD_CLI            override: point at your OWN kicad-cli - consulted on"
	@echo "                       every run that declares \"sch\"/\"netlist\", since every"
	@echo "                       such run now re-exports the schematic to check it"
	@echo "  HTML_TO_PDF          override: point at your OWN Chromium-family browser - it"
	@echo "                       is what prints guide.pdf from guide.html on every"
	@echo "                       \`make guide\`, invoked with --headless --print-to-pdf. A"
	@echo "                       converter that is not there refuses by name; a packet"
	@echo "                       without its PDF is never written"
	@echo "  ALLOW_DIRTY=1        let update/stripboard/adopt write over uncommitted changes"

# `wiring` is a prerequisite of `check` for the same reason `netlist-agrees` is:
# a derived artifact nobody regenerates is one that goes quietly stale, and a
# stale wiring guide is worse than none - it is confidently wrong in a way the
# layout cannot contradict. It rewrites rather than failing, exactly as
# netlist-agrees does, so drift surfaces as a git diff the operator has to look
# at. A board with nothing off it reports that and writes nothing.
#
# CHECK IS NO LONGER WEAKER THAN `adopt`'s GATE (CRITERIA G4). As well as the
# binary's own --check, this now grades the four buildability constraints -
# HC5 the part's reach, HC9 the part's own floor, HC8 the netlist equivalence
# reconstructed from copper, HC10 the pin pattern the strips can take - which
# until 2026-10-13 ran only on the adoption path. So the command that runs on
# boards a person laid by hand was blind to exactly the faults that make a
# board not conduct. HC6 is deliberately NOT among them (OB4): pt2399-core is
# 17 x 36 against a declared stock of 34 x 27 and it is a board that works.
#
# NO EXTRA PREREQUISITE IS NEEDED FOR IT. The bounds come from committed data
# modules (lib/kicad/lead-span.ts, lib/kicad/pin-pattern.ts) and from
# stripboard/rules.json, every one of which REFUSES BY NAME rather than
# defaulting when the datum it needs is not recorded - so a board placing a
# footprint whose span nobody has read off a datasheet now FAILS here, naming
# the footprint. That is the gate working, not a gate to loosen: see
# docs/stripboard/lead-span.md for how to add an entry with its evidence.
#
# `scaffold-membership` IS A PREREQUISITE FOR THE REASON `wiring` IS, pointed at
# a different artifact. Three comparisons exist around a Pultec section board and
# until this one they did not close the triangle: `check` below and
# `assertLayoutMatchesCircuit` compare the LAYOUT against the CIRCUIT, and
# `groupsFor` (circuits/pultec/physical/scaffold-doc.ts) compares the stand-in
# GROUPS against the MODEL - but nothing compared the GROUPS against the LAYOUT.
# A group claiming a part the board holds no position for, or claiming one part
# twice, would surface first as a confidently-hatched stand-in diagram in a
# printed packet, where the five .vrt files are owner-approved and immutable and
# so a builder has no reason to suspect the diagram rather than the board.
#
# IT PRINTS ON EVERY RUN, pass included, and a board that declares no SCAFFOLD
# prints a NOTICE saying so - `check` reports `ok <path>` in identical words
# whether a guard ran or not, which is the failure shape this whole workflow
# exists to prevent.
check: veroroute netlist-agrees wiring scaffold-membership
	@bun "$(CLI)" check -C "$(CURDIR)"

wiring:
	@bun "$(CLI)" wiring -C "$(CURDIR)"

scaffold-membership:
	@bun "$(CLI)" scaffold-membership -C "$(CURDIR)"

cuts: veroroute netlist-agrees
	@bun "$(CLI)" cuts -C "$(CURDIR)"

board-info:
	@bun "$(CLI)" board-info -C "$(CURDIR)"

import: veroroute netlist-agrees
	@bun "$(CLI)" import -C "$(CURDIR)"

update: veroroute netlist-agrees
	@bun "$(CLI)" update -C "$(CURDIR)" $(if $(ALLOW_DIRTY),--allow-dirty)

stripboard: veroroute netlist-agrees
	@bun "$(CLI)" stripboard -C "$(CURDIR)" $(if $(STRIPS),--strips "$(STRIPS)") $(if $(ALLOW_DIRTY),--allow-dirty)

edit: veroroute
	@bun "$(CLI)" edit -C "$(CURDIR)"

# The build packet is generated, never committed: guide/ is git-ignored and
# rebuilt whole from the .vrt, the schematic and the circuit on every run.
guide: veroroute netlist-agrees
	@bun "$(CLI)" guide -C "$(CURDIR)" --kicad-cli "$(KICAD_CLI)" --html-to-pdf "$(HTML_TO_PDF)"

# The stripboard pipeline, on THIS board. It writes only under
# build/stripboard/<board>/<stamp>/ - never the layout - so it needs no
# ALLOW_DIRTY and is not guarded by the recoverability check the write verbs
# are. netlist-agrees IS a prerequisite: the run exports this board's netlist
# and checks every candidate against it, so a schematic the committed export
# disagrees with would be a run graded against a stale reference.
#
# SEED_ARM IS REQUIRED AND THIS FILE SUPPLIES NO DEFAULT. Passed through
# verbatim when set, and omitted when not - the CLI then refuses and lists the
# three arms, which is the whole point: an arm chosen by a makefile would be a
# comparison nobody named. FROZEN/NETLIST run the frozen benchmark fixture
# instead of this board, and SWEEP=1 adds the seed-set diagnostic at the cost
# of one full evaluation cap per seed.
place: veroroute netlist-agrees
	@bun "$(CLI)" place -C "$(CURDIR)" $(if $(SEED_ARM),--seed-arm "$(SEED_ARM)") $(if $(FROZEN),--frozen "$(FROZEN)") $(if $(NETLIST_EXPORT),--netlist "$(NETLIST_EXPORT)") $(if $(SWEEP),--sweep)

# THE ONE TARGET THAT WRITES UNDER boards/ FROM THE PIPELINE (CRITERIA G1), and
# it writes this board's declared layout IN PLACE, so git is the undo exactly as
# it is for update and stripboard - ALLOW_DIRTY=1 is the operator's statement
# that this run cannot be undone.
#
# RUN=<dir> IS REQUIRED AND THIS FILE SUPPLIES NO DEFAULT. Passed through
# verbatim when set and omitted when not, after which the CLI refuses and says
# why: adopting off the most recent run directory would be adopting off whatever
# the clock last named, and this is the verb whose whole job is not taking a
# candidate's provenance on trust. CANDIDATE=<vrt> is optional - run.json
# identifies the candidate by its sha256, so the gate finds the file rather than
# being told it.
#
# IT RUNS `make check` ITSELF, AFTER THE COPY (G4), and reverts the copy when
# that does not exit 0. So there is deliberately no `check` prerequisite here:
# a prerequisite would check the board BEFORE the layout under test was in
# place, which is the wrong board, and would then have to be run again anyway.
# veroroute and netlist-agrees ARE prerequisites, because the gate's own
# `make check` needs the binary built and the export fresh before it can mean
# anything.
adopt: veroroute netlist-agrees
	@bun "$(CLI)" adopt -C "$(CURDIR)" $(if $(RUN),--run "$(RUN)") $(if $(CANDIDATE),--candidate "$(CANDIDATE)") $(if $(ALLOW_DIRTY),--allow-dirty)

# The parts list. No veroroute or netlist-agrees prerequisite: it reads only the
# circuit, bom.json and the parts/ catalog, never the layout or the schematic.
# `check` compares BOM.md with a fresh rendering (for a board with a bom.json)
# without rewriting it.
bom:
	@bun "$(CLI)" bom -C "$(CURDIR)"
