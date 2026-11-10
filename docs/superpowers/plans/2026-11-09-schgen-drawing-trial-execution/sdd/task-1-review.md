**Verdict: Needs fixes.** One Important issue. emit.sh writes the wall-time and memory `LIMIT:` lines without first making sure the log ends in a newline, so a program that leaves a partial line can hide which limit stopped it. Everything else matches the brief, or departs from it for a reason that holds up.

### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

- ✅ Dockerfile clones SchGen at `0707520c…` and asserts `rev-parse == pin`. It installs `--require-hashes --no-deps` from the lock and builds `component_repository.json` at build time from the `kicad_symbols` named context. It COPYs `fixes/`, `trial/` and `tests/` to `/trial/*` (as the ruling requires) and runs as a non-root uid (Dockerfile:73-103). build.sh pins `--platform linux/arm64` (build.sh:150-155), as the ruling requires.
- ✅ The lock is generated with `pip-compile --generate-hashes` by `lock.sh` inside the image's own base. It names `transformers==5.22.2`, `kicad-skip==0.2.5`, `sexpdata==1.0.0` and `pytest` (requirements.in:714-717; lock.sh:692-698).
- ✅ build_repo.py takes the symbol dir as a parameter. It refuses a missing dir and an empty result (build_repo.py:397-430).
- ✅ All four fixes match the spec's departures table rows (a)-(d) (run_emitter.py:542-593, 596-606):
  - **component_repository**: checked for, raises if absent.
  - **pin_extraction**: the trial's all-children scan, injected in memory before exec. It refuses if the target names are gone. **Checked**: SchGen calls `extract_pins_from_symbol` only through a module-global lookup at `/schgen/modules/utils/kicad_add_symbol.py:682`, and `kicad_sch_interface.py:11` imports only other names from that module. So the patch to the module attribute takes effect.
  - **root_uuid**: blank sheet written with `uuid4`.
  - **skip_get_fp**: `get_fp()` is never called.
- ✅ The program file is never written. The filename is injected into an in-memory copy (run_emitter.py:557-563, 597), and `test_pin_fix_is_injected_not_written` checks it.
- ✅ `fixes_applied()` returns exactly `["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]` and is printed as log line 1 on every path that reaches main (run_emitter.py:550, 648).
- ✅ Container shape: `--network none --read-only --cpus 2 --memory 4g --memory-swap 4g --pids-limit 256`, tmpfs `/out` 50m and `/tmp` 64m, symbols and program mounted read-only, name `schgen-emit-<random>` (emit.sh:279-286).
- ✅ Wall time is 300 s, overridable. On expiry: `docker kill`, `docker rm -f`, `LIMIT: wall-time`, exit 124 (emit.sh:321-328). OOM is read with `docker inspect .State.OOMKilled` before removal and reported as `LIMIT: memory` (emit.sh:343-348). An inspect failure is reported loudly, not treated as "no OOM" (emit.sh:349-353).
- ✅ ENOSPC anywhere in the exception chain is reported as `LIMIT: output-bytes`; the pids cgroup event as `LIMIT: pids` (run_emitter.py:609-632).
- ✅ Every test the brief lists is present (test_emitter.py:1472-1541), plus `test_fork_bomb_is_stopped` and `test_stdout_flood_is_capped`. Every hostile case asserts that no `schgen-emit-` container is left, measured right after its own run (test_emitter.py:1450).
- ✅ The ruling's host venv and pinned `host-requirements.txt` are in place, and `.venv` is gitignored.
- ✅ Commit 5a5134b has no AI attribution and is on `origin/ai-schgen`.
- Deviation 1, no `--rm`: **accepted.** The brief asks for `--rm` and also asks that `.State.OOMKilled` be read "before removal". Those two requirements conflict; dropping `--rm` and removing in the EXIT trap is the correct resolution. **Checked**: bash runs the EXIT trap on SIGTERM and SIGHUP (scratch test). SIGKILL leaks a container, as the report says.
- Deviation 2, `docker exec cat` instead of `docker cp`: **accepted.** `docker cp` reads the container's layers and cannot see a tmpfs. The sheet stays bounded by the 50m `/out`.
- Deviation 3, the 8 MiB log cap: **accepted.** It closes a real hole: the brief's "nothing reaches the host past the sheet" did not cover stdout. It should be folded into the plan text (report it to the controller).
- Deviation 4, IMAGE_DIGEST changes on every rebuild: **accepted.** It records the image ID, and Task 7's comparison is against the local image.
- ⚠️ Could not verify the GREEN run (14 passed); the suite was not re-run, as instructed.
- ⚠️ Could not verify that the lock covers every import SchGen's emitter makes. The imu example passing in-image is evidence for that one program's import path only.
- ⚠️ Could not verify that the mounted symbol directory is KiCad 10.0.5's; nothing checks it (see Minor).
- Not in scope for Task 1: the power-symbol departure (stock `power:GND`, no `PWR_FLAG`) is part of building the request and symbol context. Nothing in this diff selects or adds power symbols, so there is nothing here that could contradict it.

### Strengths

- Each limit is enforced, and each is tested to fail with a distinct last line: wall-time, output-bytes (tmpfs), output-bytes (log cap), memory, pids, and no network. Each hostile run asserts that no container is left behind.
- Failure paths in emit.sh do not pass silently. An `inspect` failure is reported as "OOM cannot be ruled out" (exit 125). A missing status, or an exit 0 with no copied sheet, is a named failure. A missing SIGUSR1 inside the container is a failure, not a success.
- The pin patch refuses if SchGen's names change (run_emitter.py:569-574). That is the refusal a silent no-op patch would otherwise lack.
- `cap_stream.py` was written because `head -c` withheld the ready marker. That cause was measured and is recorded in the file.
- The SchGen example is read out of the image with `cat` and never executed on the host (test_emitter.py:1456-1469).
- Files are small: emit.sh is 167 lines, run_emitter.py 220, the tests 203.

### Issues

**Critical:** none.

**Important**

1. **emit.sh:326 and emit.sh:346: a `LIMIT:` line can land on the end of the program's last line.**
   - **What:** `echo "LIMIT: wall-time" >> "$LOG"` and `echo "LIMIT: memory" >> "$LOG"` do not first ensure the log ends in a newline. `stop_for_output_bytes` does (`printf '\nLIMIT: output-bytes\n'`, emit.sh:299).
   - **Example:** A program that runs `print("placing", end="")` and then loops forever, or is OOM-killed mid-`print`, leaves a log whose last line is `placingLIMIT: wall-time`.
   - **Why it matters:** The brief's contract, which Task 5/7 classification and these tests rely on, is a *final log line* `LIMIT: <name>`. In this case a limit becomes indistinguishable from an ordinary failure: wall-time still has its exit code 124 to tell it apart, but memory's 137 can be any SIGKILL. That is the "limit that does not fail distinguishably" case this review was asked to check. The tests miss it because no hostile program leaves a partial line.
   - **Fix:** Write one helper that appends `\n` if the log's last byte is not a newline, then writes `LIMIT: <name>`. Use it for all three emit.sh limits and for emit.sh's own diagnostic lines. Add a hostile case `print('x', end='', flush=True)` followed by `while True: pass` (wall 10 s) and assert the last line is `LIMIT: wall-time`.

**Minor**

1. **emit.sh:319: a failed USR1 send exits non-zero but leaves the sheet in OUT_DIR.**
   - **What:** `docker kill --signal USR1 "$NAME" > /dev/null` has no `|| true`. Under `set -e`, if the container exited between the copy and the signal, emit.sh exits non-zero with `page.kicad_sch` still in OUT_DIR, and no log line says why.
   - **Fix:** Handle the failure explicitly (`rm -f "$SHEET"`, log a line, exit 1), as the `docker exec` branch does.
2. **emit.sh:309-319: the wall clock is not checked while `docker exec cat` runs.**
   - **What:** If that command blocks, the 300 s limit is not enforced while it does.
   - **Fix:** Run the copy under a bounded wait, or check the deadline before and after it.
3. **emit.sh:277-288, 295-301: the background stream subshell can outlive emit.sh.**
   - **What:** On the output-bytes path, emit.sh exits while the brace group can still be in `docker run`. That subshell can then write `$STATUS_FILE` after the trap deleted it, leaking a temp file, and it is orphaned.
   - **Fix:** Record the subshell's PID and kill and wait for it in `remove_container`. Alternatively, keep the status file in a directory the trap removes.
4. **run_emitter.py:617-624: `pids_limit_hit()` returns False silently when `/sys/fs/cgroup/pids.events` is absent.**
   - **What:** On a cgroup layout without that file, a pids exhaustion reads as a plain traceback, with no sign the check was skipped. It also attributes *any* later exception to `pids` once the limit was ever hit (the report notes this). `test_fork_bomb_is_stopped` guards this host only.
   - **Fix:** Print a line saying the pids check could not run when the file is missing.
5. **run_emitter.py:648: the first log line claims fixes that are not applied yet.**
   - **What:** `fixes_applied()` prints a constant list before `patch_pin_extraction()` and `write_blank_sheet()` have run. If the patch raises, line 1 still lists `pin_extraction`. The brief requires the line on failure, so the timing is defensible, but the name overstates.
   - **Fix:** None needed in code. Optionally, a docstring note that this lists the fixes this runner *applies*, not ones confirmed done.
6. **build.sh:136-143 and emit.sh:229: nothing checks the symbol libraries' KiCad version.**
   - **What:** Nothing verifies that `KICAD_SYMBOL_DIR` is KiCad 10.0.5's, or that the run-time mount is the same directory the build-time repository was made from. The comments assert it; nothing refuses a mismatch. The implementer reported this.
   - **Fix:** Record a hash or manifest of the symbol dir in the image at build, and have emit.sh compare the mounted dir against it.
7. **requirements.in:707: the comment points at a step that does not exist.**
   - **What:** It says "regenerate the lock with build.sh's `lock` step". There is no such step; the script is `lock.sh`. (The lock header also records `--no-index`, which `lock.sh` does not pass; worth a look when the lock is regenerated.)
   - **Fix:** Point the comment at `lock.sh`.
8. **requirements.lock:1264-1265: `sexpdata` has only an sdist hash, so it is built from source.**
   - **What:** pip's isolated build environment fetches setuptools without hash checking, so `--require-hashes` does not fully cover the install.
   - **Fix:** Note it in the lock.sh or Dockerfile comment, or pin the build backend with hashes.
9. **test_emitter.py:1482-1486: no test proves the pin fix changes behaviour.**
   - **What:** `test_pin_fix_is_injected_not_written` is the brief's test and checks only that the program's bytes are unchanged. No test places a symbol whose pins are not the first child (for example `Connector_Generic:Conn_01x05`). The patch is confirmed effective by reading the source (above), but a test would keep it so.
   - **Fix:** Add one such test.

### Assessment

**Task quality: Needs fixes.**

**Reasoning:** The image, the four fixes, the limits and the tests match the brief, and the four deviations are sound. The one Important issue is that emit.sh can append a `LIMIT:` line onto the program's unterminated last line, which breaks the final-line contract that limit classification depends on. It is a small fix, and it needs a test that would have caught it.
