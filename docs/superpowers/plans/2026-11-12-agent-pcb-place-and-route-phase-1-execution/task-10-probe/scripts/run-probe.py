"""Task 10's probe driver: place a candidate, pour, route, refill, check.

    python3 -I run-probe.py <repo> <run-dir> <candidate> [<candidate> ...]

A candidate name is either `adopted` - the committed board, placed by Task 8 -
or `<arm>-seed-<n>`, generated from the pre-placement board b926f69 by the route
`make/pcb.mk` documents.  The two arms exist because the approved criteria
disagree with each other about one flag, and a measurement is worth more than a
ruling an agent writes:

  arm `a`  place_seed with NO --clearance.  This is what
           `circuits/pt2399-core/placement-policy.json` permits: it lists
           --clearance under `place`.forbidden.
  arm `b`  place_seed --clearance 2.0.  This is what
           `circuits/pt2399-core/placement-rules.json`
           `separation.part_to_part.enforced_by` names as the placer-side
           mechanism for the owner's "Use 2mm min spacing", and what
           `make/pcb.mk` documents and Task 8 used.

Both files are approved, so neither arm is this script's choice to make and
neither is suppressed.  `b-seed-1` reproduces the adopted placement exactly
(verified: every reference, position, rotation and layer identical), which is
the control on the generator.

EVERY ROUTING AND POUR FLAG IS THE ONE `placement-policy.json` LISTS, and
nothing else.  No --clearance on route (so each net routes at its own net class),
no --no-fix-drc-settings, no --keep-thermal, no --json-out, no --fab-tier.  The
first two would suppress the project writeback the policy's post-conditions
exist to catch; the engine's own tally is read from the log and from
`check_connected.py` instead, which the engine's documentation calls the
authoritative check.

RESUMABLE AND APPEND-ONLY.  A candidate whose `result.json` exists is skipped;
`results.jsonl` is only ever appended to.  Relaunching continues.

STOPS ON REPEATED IDENTICAL FAILURES, AND IT IS THE BOARD FAILURES IT COUNTS.
A candidate's failures are recorded in two lists, because they are two different
kinds of thing and conflating them would have made this batch useless:

  `board_failures`   something is wrong with the artifact - the placement did not
                     grade, the router left a net open, DRC or parity failed, a
                     part moved, copper went below the fab floor, the pour
                     refused measurement.  THE STOP RULE COUNTS THESE.
  `policy_findings`  a post-condition of `placement-policy.json` that the run
                     itself failed, independently of the board.  Measured
                     2026-11-14: `route_planes.py` demotes
                     `severity[courtyards_overlap]` from error to warning in the
                     project it writes beside its own output, and `route.py`
                     writes `net_class[Default].track_width: 0.3 -> 0.2998`
                     there.  Both fail `tools/pcb/fab-standard.ts`.  This happens
                     identically on EVERY candidate, so counting it in the stop
                     rule would end the batch after three candidates and measure
                     nothing about routing.

`passed` stays the conjunction of both - a run with a failed post-condition is
not a clean run, and this script does not get to say otherwise.  `board_passed`
is the narrower claim, reported separately and never in place of the other.
"""
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

KICAD_CLI = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
PRE_PLACEMENT_COMMIT = "b926f69"
OUTLINE_UUID = "7a110000-0000-4000-8000-00000000ed9e"
IDENTICAL_FAILURE_LIMIT = 3
SIBLINGS = (".kicad_pro", ".kicad_dru", ".kicad_sch")


def env():
    """The engine's environment: PYTHONHOME/PYTHONPATH absent, per build/krt/invocations.json."""
    out = dict(os.environ)
    out.pop("PYTHONHOME", None)
    out.pop("PYTHONPATH", None)
    return out


class Step:
    """One command, its log, and what it exited with."""

    def __init__(self, name, argv, cwd, log_path, returncode, text):
        self.name = name
        self.argv = argv
        self.cwd = cwd
        self.log_path = log_path
        self.returncode = returncode
        self.text = text

    def as_json(self):
        return {
            "name": self.name,
            "argv": self.argv,
            "cwd": self.cwd,
            "log": self.log_path,
            "exit": self.returncode,
        }


class Probe:
    def __init__(self, repo, run_dir):
        self.repo = pathlib.Path(repo).resolve()
        self.run_dir = pathlib.Path(run_dir).resolve()
        self.circuit = self.repo / "circuits" / "pt2399-core"
        self.engine = self.repo / ".tools" / "krt"
        self.python = self.engine / ".venv" / "bin" / "python"
        for path in (self.python, self.circuit, pathlib.Path(KICAD_CLI)):
            if not path.exists():
                raise SystemExit("missing prerequisite: %s" % path)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.results = self.run_dir / "results.jsonl"

    # ---- plumbing -------------------------------------------------------

    def run(self, name, argv, cwd, log_dir):
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / (name + ".log")
        done = subprocess.run(
            [str(a) for a in argv], cwd=str(cwd), env=env(),
            capture_output=True, text=True,
        )
        text = done.stdout + done.stderr
        log_path.write_text("$ %s\n(cwd %s)\n\n%s\nEXIT=%d\n" % (
            " ".join(str(a) for a in argv), cwd, text, done.returncode))
        rel = str(log_path.relative_to(self.run_dir))
        return Step(name, [str(a) for a in argv], str(cwd), rel, done.returncode, text)

    def stage(self, board, dest):
        """A board with every sibling KiCad needs, and the CANONICAL project.

        The canonical `.kicad_pro` and `.kicad_dru` are restored here rather
        than carried from the engine's output, and that is disclosed rather
        than quiet: the engine rewrites a project beside every output it
        writes, and it demoted `courtyards_overlap` from error to warning on
        this board (measured).  Grading the copper against the project the
        standard declares is the meaningful measurement; the engine's own
        project is checked SEPARATELY, as the policy's post-condition, and its
        failure is reported rather than papered over by this copy.
        """
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy(board, dest / "pt2399-core.kicad_pcb")
        for suffix in SIBLINGS:
            shutil.copy(self.circuit / ("pt2399-core" + suffix), dest / ("pt2399-core" + suffix))
        shutil.copy(self.circuit / "fp-lib-table", dest / "fp-lib-table")
        pretty = dest / "pt2399-core.pretty"
        if pretty.exists():
            shutil.rmtree(pretty)
        shutil.copytree(self.circuit / "pt2399-core.pretty", pretty)
        prl = dest / "pt2399-core.kicad_prl"
        if prl.exists():
            prl.unlink()
        return dest / "pt2399-core.kicad_pcb"

    # ---- placement ------------------------------------------------------

    def seed(self, arm, seed, cand_dir, log_dir, steps):
        gen = cand_dir / "gen"
        gen.mkdir(parents=True, exist_ok=True)
        board = gen / "pt2399-core.kicad_pcb"
        show = subprocess.run(
            ["git", "show", "%s:circuits/pt2399-core/pt2399-core.kicad_pcb" % PRE_PLACEMENT_COMMIT],
            cwd=str(self.repo), capture_output=True, text=True, check=True,
        )
        board.write_text(show.stdout)
        for suffix in SIBLINGS:
            shutil.copy(self.circuit / ("pt2399-core" + suffix), gen / ("pt2399-core" + suffix))

        steps.append(self.run("outline", [
            "bun", self.repo / "tools/pcb/board-outline.ts", board, "--write-declared",
            self.circuit / "floorplan-intent.json", "10", "10", OUTLINE_UUID,
        ], self.repo, log_dir))
        steps.append(self.run("mounting-holes", [
            "bun", self.repo / "tools/pcb/place-mounting-holes.ts", board,
            self.circuit / "placement-rules.json", "--write",
        ], self.repo, log_dir))
        resolved = gen / "resolved-intent.json"
        steps.append(self.run("resolve-intent", [
            "bun", self.repo / "tools/pcb/resolved-intent.ts", board,
            self.circuit / "floorplan-intent.json", resolved,
            self.circuit / "placement-rules.json",
        ], self.repo, log_dir))
        for step in steps[-3:]:
            if step.returncode != 0:
                return None, "%s exited %d" % (step.name, step.returncode)

        seeded = gen / "seeded.kicad_pcb"
        argv = [self.python, "py_placer/place_seed.py", board, seeded,
                "--intent", resolved, "--force", "--seed", str(seed)]
        if arm == "b":
            argv += ["--clearance", "2.0"]
        steps.append(self.run("place-seed", argv, self.engine, log_dir))
        if not seeded.exists():
            return None, "place_seed wrote no board (exit %d)" % steps[-1].returncode
        return seeded, None

    # ---- the chain ------------------------------------------------------

    def chain(self, candidate):
        cand_dir = self.run_dir / ("cand-" + candidate)
        log_dir = cand_dir / "logs"
        steps = []
        record = {
            "candidate": candidate,
            "started": datetime.datetime.now().isoformat(timespec="seconds"),
            "checks": {},
            "board_failures": [],
            "policy_findings": [],
        }

        if candidate == "adopted":
            placement = self.circuit / "pt2399-core.kicad_pcb"
            record["placement_source"] = "circuits/pt2399-core/pt2399-core.kicad_pcb (Task 8)"
            record["place_seed_exit"] = None
        else:
            arm, _, seed = candidate.partition("-seed-")
            if arm not in ("a", "b") or not seed.isdigit():
                raise SystemExit("candidate %r is neither 'adopted' nor '<a|b>-seed-<n>'" % candidate)
            placement, why = self.seed(arm, int(seed), cand_dir, log_dir, steps)
            record["placement_source"] = "place_seed arm %s seed %s from %s" % (arm, seed, PRE_PLACEMENT_COMMIT)
            record["place_seed_exit"] = steps[-1].returncode if steps else None
            if placement is None:
                record["board_failures"].append("placement: " + why)
                return self.finish(record, steps, cand_dir)

        # The documented grading path: it re-resolves and verifies the board binding.
        steps.append(self.run("grade", [
            "bun", self.repo / "tools/pcb/grade-cli.ts", placement,
            self.circuit / "floorplan-intent.json", self.circuit / "placement-rules.json",
            cand_dir / "grade",
        ], self.repo, log_dir))
        record["checks"]["grade_exit"] = steps[-1].returncode
        # A CANDIDATE WHOSE PLACEMENT DOES NOT SATISFY THE OWNER'S INTENT IS NOT A
        # CANDIDATE.  `placement-policy.json` calls the pipeline "a portfolio of
        # seeds whose failures are discarded", and this is where one is discarded.
        #
        # THIS GATE WAS MISSING ON THE FIRST PASS OF THIS DRIVER, which recorded
        # `grade_exit` and then ignored it: four arm-`b` candidates whose seeds put
        # C2 15 to 18 mm from U1 against the intent's 10 mm `decaps.max_distance_mm`
        # were reported as board passes because everything downstream of the
        # placement was clean.  A check whose result is recorded and not acted on
        # reads exactly like a check that passed, which is the failure mode this
        # repository's workflow exists to refuse - and it took a human reading the
        # column to notice.  The run is re-done rather than annotated.
        if steps[-1].returncode != 0:
            record["board_failures"].append(
                "the placement does not satisfy the approved intent: grade-cli exited %d (see the grade log for "
                "which rule)" % steps[-1].returncode)
            return self.finish(record, steps, cand_dir)

        route_in = self.stage(placement, cand_dir / "stage")
        steps_dir = cand_dir / "steps"
        steps_dir.mkdir(parents=True, exist_ok=True)

        poured = steps_dir / "poured.kicad_pcb"
        steps.append(self.run("pour", [
            self.python, "py_router/route_planes.py", route_in, poured,
            "--nets", "GND", "--plane-layers", "B.Cu",
        ], self.engine, log_dir))
        if steps[-1].returncode != 0 or not poured.exists():
            record["board_failures"].append("pour: route_planes.py exited %d" % steps[-1].returncode)
            return self.finish(record, steps, cand_dir)

        routed = steps_dir / "routed.kicad_pcb"
        steps.append(self.run("route", [
            self.python, "py_router/route.py", poured, "--output", routed,
            "--fab-overrides", self.circuit / "route-fab-floor.txt", "--nets", "*",
        ], self.engine, log_dir))
        route_log = steps[-1]
        record["checks"]["route_exit"] = route_log.returncode
        record["checks"]["fab_floor_relaxed_in_log"] = "FAB FLOOR RELAXED" in route_log.text
        record["checks"]["route_summary"] = last_json(route_log.text, "JSON_SUMMARY_MIN:") \
            or last_json(route_log.text, "JSON_SUMMARY:")
        if route_log.returncode != 0 or not routed.exists():
            record["board_failures"].append("route: route.py exited %d" % route_log.returncode)
            return self.finish(record, steps, cand_dir)

        # The policy's post-condition on the ARTIFACT, not the log: the project
        # each engine step leaves beside its own output must still equal the standard.
        for label, project in (("pour", steps_dir / "poured.kicad_pro"), ("route", steps_dir / "routed.kicad_pro")):
            steps.append(self.run("post-fab-standard-" + label, [
                "bun", self.repo / "tools/pcb/fab-standard.ts", project,
            ], self.repo, log_dir))
            key = "engine_project_equals_standard_after_" + label
            record["checks"][key] = steps[-1].returncode == 0
            if steps[-1].returncode != 0:
                record["policy_findings"].append(
                    "policy post-condition: the .kicad_pro %s left beside its output no longer equals the "
                    "fabrication standard (see that step's log for which values)" % label)

        final_dir = cand_dir / "final"
        final = self.stage(routed, final_dir)
        steps.append(self.run("refill", [
            KICAD_CLI, "pcb", "drc", "--refill-zones", "--save-board",
            "--output", final_dir / "refill-drc.rpt", final,
        ], self.repo, log_dir))
        if steps[-1].returncode != 0:
            record["board_failures"].append("refill: kicad-cli exited %d" % steps[-1].returncode)
            return self.finish(record, steps, cand_dir)

        self.checks(final, final_dir, placement, cand_dir, log_dir, steps, record)
        return self.finish(record, steps, cand_dir)

    def checks(self, final, final_dir, placement, cand_dir, log_dir, steps, record):
        sch = final_dir / "pt2399-core.kicad_sch"

        steps.append(self.run("courtyard-rule", [
            "bun", self.repo / "tools/pcb/courtyard-rule.ts", final,
            self.circuit / "placement-rules.json",
        ], self.repo, log_dir))
        record["checks"]["courtyard_rule_matches"] = steps[-1].returncode == 0
        if steps[-1].returncode != 0:
            record["board_failures"].append("the .kicad_dru beside the final board does not carry the approved 2 mm rule")

        steps.append(self.run("parity", [
            "bun", self.repo / "tools/pcb/drc-cli.ts", final, sch, "parity",
        ], self.repo, log_dir))
        record["checks"]["parity_exit"] = steps[-1].returncode
        if steps[-1].returncode != 0:
            record["board_failures"].append("schematic parity: drc-cli exited %d" % steps[-1].returncode)

        steps.append(self.run("drc-routed", [
            "bun", self.repo / "tools/pcb/drc-cli.ts", final, sch, "drc", "--routed",
        ], self.repo, log_dir))
        record["checks"]["drc_routed_exit"] = steps[-1].returncode
        record["checks"]["drc_counts"] = first_json(steps[-1].text)
        if steps[-1].returncode != 0:
            record["board_failures"].append("KiCad DRC under the routed policy: drc-cli exited %d" % steps[-1].returncode)

        steps.append(self.run("drc-unrouted", [
            "bun", self.repo / "tools/pcb/drc-cli.ts", final, sch, "drc", "--unrouted",
        ], self.repo, log_dir))
        record["checks"]["drc_unrouted_exit"] = steps[-1].returncode

        steps.append(self.run("engine-check-connected", [
            self.python, "py_router/check_connected.py", final,
        ], self.engine, log_dir))
        record["checks"]["engine_connected_exit"] = steps[-1].returncode
        if steps[-1].returncode != 0:
            record["board_failures"].append("the engine's connectivity check exited %d" % steps[-1].returncode)

        steps.append(self.run("engine-check-drc", [
            self.python, "py_router/check_drc.py", final,
        ], self.engine, log_dir))
        record["checks"]["engine_drc_exit"] = steps[-1].returncode
        if steps[-1].returncode != 0:
            record["board_failures"].append("the engine's DRC exited %d" % steps[-1].returncode)

        # Dead copper, read off the report KiCad wrote for the refill.  The
        # check is `isolated_copper`; the negative control that proves it fires
        # on this board's configuration is `dead-copper-control.py`.
        report = (final_dir / "refill-drc.rpt").read_text()
        record["checks"]["isolated_copper_in_refill_report"] = "[isolated_copper]" in report

        survey_json = cand_dir / "checks-survey.json"
        steps.append(self.run("routed-survey", [
            "bun", self.repo / "tools/pcb/routed-survey.ts", final,
            "--floor", self.circuit / "route-fab-floor.txt", "--against", placement, "--json",
        ], self.repo, log_dir))
        survey = first_json(steps[-1].text) or {}
        survey_json.write_text(json.dumps(survey, indent=2))
        record["checks"]["narrowest_track_mm"] = survey.get("narrowest_track_mm")
        record["checks"]["vias"] = (survey.get("vias") or {}).get("count")
        record["checks"]["below_floor"] = survey.get("below_floor")
        record["checks"]["moved_parts"] = survey.get("moved_parts")
        if survey.get("below_floor"):
            record["board_failures"].append("copper below the declared fabrication floor: %s" % survey["below_floor"])
        if survey.get("moved_parts"):
            record["board_failures"].append("the route run moved a part: %s" % survey["moved_parts"])

        pour_json = cand_dir / "checks-pour.json"
        steps.append(self.run("pour-measure", [
            "bun", self.repo / "tools/pcb/pour-cli.ts", final, "--json",
        ], self.repo, log_dir))
        if steps[-1].returncode == 0:
            pour = first_json(steps[-1].text) or {}
            pour_json.write_text(json.dumps(pour, indent=2))
            record["pour"] = pour_headline(pour)
        else:
            record["board_failures"].append("the pour measurement refused the final board")

        record["final_board_sha256"] = hashlib.sha256(final.read_bytes()).hexdigest()
        record["final_board"] = str(final.relative_to(self.run_dir))

    def finish(self, record, steps, cand_dir):
        record["steps"] = [s.as_json() for s in steps]
        record["failures"] = record["board_failures"] + record["policy_findings"]
        record["board_passed"] = not record["board_failures"]
        record["passed"] = not record["failures"]
        record["finished"] = datetime.datetime.now().isoformat(timespec="seconds")
        cand_dir.mkdir(parents=True, exist_ok=True)
        (cand_dir / "result.json").write_text(json.dumps(record, indent=2))
        with self.results.open("a") as handle:
            handle.write(json.dumps(record, sort_keys=True) + "\n")
        return record


def last_json(text, marker):
    found = None
    for line in text.splitlines():
        if line.strip().startswith(marker):
            try:
                found = json.loads(line.split(marker, 1)[1].strip())
            except ValueError:
                found = None
    return found


def first_json(text):
    """The first JSON value in a tool's output, object or array."""
    for start in range(len(text)):
        if text[start] not in "{[":
            continue
        decoder = json.JSONDecoder()
        try:
            value, _ = decoder.raw_decode(text[start:])
        except ValueError:
            continue
        return value
    return None


def pour_headline(pour):
    """The pour figures, WITH the continuity profile and the band.

    `least_uncovered` is never carried alone, here or anywhere downstream: it is
    the loop of least uncovered length in a band of 13 loops, so a break that
    dead-ends inside the band depresses only the outer loops and the headline can
    read whole while a real break exists further out.  Measured on the real
    board; see `tools/pcb/pour-types.ts` on `LoopContinuity`.
    """
    continuity = pour.get("continuity_around_ic") or {}
    return {
        "regions_by_layer": pour.get("regions_by_layer"),
        "narrowest_neck_mm": pour.get("narrowest_neck_mm"),
        "narrowest_bridge_mm": pour.get("narrowest_bridge_mm"),
        "continuity_around_ic": continuity,
        "spokes_by_ground_pad": pour.get("spokes_by_ground_pad"),
        "bypass_return": pour.get("bypass_return"),
    }


def signature(record):
    """The BOARD failure signature the stop rule counts; see the module docstring."""
    return " | ".join(record["board_failures"]) if record["board_failures"] else ""


def main(argv):
    if len(argv) < 3:
        raise SystemExit(__doc__)
    probe = Probe(argv[0], argv[1])
    streak_signature = None
    streak = 0
    for candidate in argv[2:]:
        result_path = probe.run_dir / ("cand-" + candidate) / "result.json"
        if result_path.exists():
            print("SKIP %s (already has a result)" % candidate, flush=True)
            continue
        print("RUN  %s" % candidate, flush=True)
        record = probe.chain(candidate)
        print("     board %s%s" % ("PASS" if record["board_passed"] else "FAIL",
                                   "" if record["board_passed"] else ": " + signature(record)), flush=True)
        for finding in record["policy_findings"]:
            print("     policy finding: %s" % finding, flush=True)
        if record["board_passed"]:
            streak_signature, streak = None, 0
            continue
        sig = signature(record)
        streak = streak + 1 if sig == streak_signature else 1
        streak_signature = sig
        if streak >= IDENTICAL_FAILURE_LIMIT:
            print("STOP after %d identical failures: %s" % (streak, sig), flush=True)
            print("A batch hides a systematic failure. Fix the cause, not the candidate.", flush=True)
            return 1
    print("DONE", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
