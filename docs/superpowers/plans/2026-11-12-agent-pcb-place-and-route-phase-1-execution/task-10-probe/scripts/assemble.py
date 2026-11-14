"""Copy the probe's evidence out of the gitignored run directory into the
committed execution record.

    python3 -I assemble.py <repo> <run-dir> <dest>

Boards are committed only for the candidates whose board checks passed - those
are the ones an approval could ever be bound to.  Logs, results, resolved intents
and the grade output are committed for EVERY candidate, including the ones that
failed, because a failure nobody can re-read has to be re-run.
"""
import json
import pathlib
import shutil
import sys

repo, run_dir, dest = (pathlib.Path(p).resolve() for p in sys.argv[1:4])
dest.mkdir(parents=True, exist_ok=True)

scripts = dest / "scripts"
scripts.mkdir(exist_ok=True)
for name in ("run-probe.py", "stage.sh", "seed-candidate.sh", "render.sh",
             "dead-copper-control.py", "mutate.py", "assemble.py"):
    shutil.copy(repo / "build/pcb/task-10" / name, scripts / name)

shutil.copy(run_dir / "results.jsonl", dest / "results.jsonl")
pass1 = repo / "build/pcb/task-10/results-pass1-ungated.jsonl"
if pass1.exists():
    shutil.copy(pass1, dest / "results-pass1-ungated.jsonl")

kept_boards = []
for result in sorted(run_dir.glob("cand-*/result.json")):
    cand = result.parent
    name = cand.name[len("cand-"):]
    out = dest / "candidates" / name
    out.mkdir(parents=True, exist_ok=True)
    shutil.copy(result, out / "result.json")
    if (cand / "logs").exists():
        if (out / "logs").exists():
            shutil.rmtree(out / "logs")
        shutil.copytree(cand / "logs", out / "logs")
    for extra in ("checks-pour.json", "checks-survey.json"):
        if (cand / extra).exists():
            shutil.copy(cand / extra, out / extra)
    for intent in (cand / "gen" / "resolved-intent.json", cand / "grade" / "resolved-intent.json"):
        if intent.exists():
            shutil.copy(intent, out / ("resolved-intent-%s.json" % intent.parent.name))
    if (cand / "final" / "refill-drc.rpt").exists():
        shutil.copy(cand / "final" / "refill-drc.rpt", out / "refill-drc.rpt")
    record = json.loads(result.read_text())
    if record.get("board_passed") and (cand / "final" / "pt2399-core.kicad_pcb").exists():
        board_dir = dest / "boards" / name
        board_dir.mkdir(parents=True, exist_ok=True)
        for suffix in (".kicad_pcb", ".kicad_pro", ".kicad_dru"):
            shutil.copy(cand / "final" / ("pt2399-core" + suffix), board_dir / ("pt2399-core" + suffix))
        kept_boards.append((name, record.get("final_board_sha256")))

for name in ("adopted", "b-seed-4"):
    src = repo / "build/pcb/task-10" / ("render-" + name)
    if src.exists():
        out = dest / "render" / name
        if out.exists():
            shutil.rmtree(out)
        shutil.copytree(src, out)

control = run_dir / "control-dead-copper"
if control.exists():
    out = dest / "control-dead-copper"
    out.mkdir(parents=True, exist_ok=True)
    for name in ("control-drc.rpt", "control-drc.log"):
        if (control / name).exists():
            shutil.copy(control / name, out / name)

print("boards committed:")
for name, sha in kept_boards:
    print("  %-12s %s" % (name, sha))
print("candidates with a record: %d" % len(list((dest / "candidates").iterdir())))
