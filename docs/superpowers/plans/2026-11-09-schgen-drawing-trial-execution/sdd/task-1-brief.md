### Task 1: The `schgen-runtime` image and the four emitter fixes

**Files:**
- Create: `tools/schgen-drawing-trial/runtime/Dockerfile`
- Create: `tools/schgen-drawing-trial/runtime/requirements.lock` (the full resolved set, every package `==`-pinned with hashes, generated once by `pip-compile --generate-hashes` from a short `requirements.in` naming `transformers==5.22.2`, `kicad-skip==0.2.5`, `sexpdata==1.0.0`, `pytest` and SchGen's emitter imports; the image installs only from the lock with `--require-hashes`)
- Create: `tools/schgen-drawing-trial/runtime/fixes/build_repo.py` (copied from `docs/research/2026-10-29-trial-microsoft-schgen/scripts/build_repo.py`, symbol dir a parameter)
- Create: `tools/schgen-drawing-trial/runtime/fixes/run_emitter.py` (from that trial's `run_like_init_project.py`, plus the pin-extraction patch applied before the program is executed)
- Create: `tools/schgen-drawing-trial/runtime/build.sh`, `tools/schgen-drawing-trial/runtime/emit.sh`
- Test: `tools/schgen-drawing-trial/runtime/tests/test_emitter.py`

**Interfaces:**
- Produces: image `schgen-runtime:0707520c`, its digest written by `build.sh` to `runtime/IMAGE_DIGEST` (the run records it; Task 7 refuses to start if the digest on disk differs from the image's).
- Produces: `emit.sh PROGRAM.py OUT_DIR` writes `OUT_DIR/page.kicad_sch` and `OUT_DIR/emitter.log`. Exit 0 means success. Any other exit carries the original traceback, and for a limit, a final log line `LIMIT: <name>` where `<name>` is `wall-time`, `output-bytes`, `memory` or `pids`. **Limits are enforced, not declared:**
  - **Container shape:** `docker run --rm --name schgen-emit-<random> --network none --read-only --cpus 2 --memory 4g --memory-swap 4g --pids-limit 256`, with the KiCad symbol directory and the program mounted read-only.
  - **Writable space:** the container writes only to a `--tmpfs /out:size=50m` and to `--tmpfs /tmp:size=64m`. A full tmpfs raises `ENOSPC` inside the program, which `run_emitter.py` reports as `LIMIT: output-bytes`. On success `emit.sh` copies the sheet out with `docker cp` before the container exits; `run_emitter.py` holds the container open until `emit.sh` signals it.
  - **Wall time:** `emit.sh` itself enforces 300 s. On expiry it runs `docker kill` on the named container and then `docker rm -f`, and writes `LIMIT: wall-time`. An `EXIT` trap does the same kill and remove for any other exit path.
  - **Memory:** an OOM kill, read from `docker inspect .State.OOMKilled` before removal, is reported as `LIMIT: memory`.
  - Running the model's code (`exec`, including `exec` of the program) inside `run_emitter.py` stays a single process tree under the same limits.
- Produces: `fixes_applied()` in `run_emitter.py` returning `["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]`, written into the log's first line as JSON.

- [ ] **Step 1: Write the failing tests** in `test_emitter.py`:
  - `test_imu_example_draws`: emit SchGen's own `schematic_generation/sch_examples/imu_L1.py`; assert exit 0, and that the sheet has at least one `(symbol (lib_id` instance.
  - `test_pin_fix_is_injected_not_written`: after emitting, assert the program file's bytes are unchanged (sha256 before = after).
  These run on the host (`python -m pytest`), because they drive `emit.sh` and `docker`:
  - `test_runaway_program_is_stopped`: a program that is `while True: pass`, with the wall limit overridden to 10 s for the test, exits non-zero with `LIMIT: wall-time`, and afterwards `docker ps -a --filter name=schgen-emit-` lists nothing.
  - `test_output_flood_is_stopped`: a program that writes 1 MB chunks to `/out` forever exits non-zero with `LIMIT: output-bytes`, leaves no container behind, and never writes into the host `OUT_DIR` past the copied sheet.
  - `test_memory_hog_is_stopped`: a program that grows a list of 100 MB byte strings exits non-zero with `LIMIT: memory`.
  - `test_no_network`: a program that opens a socket to `1.1.1.1:53` exits non-zero with an `OSError` traceback in the log.
  - `test_failure_keeps_fixes_line`: on every failing case above, the log's first line is still the `fixes_applied()` JSON.
- [ ] **Step 2: Run** `bash tools/schgen-drawing-trial/runtime/build.sh && python -m pytest -q tools/schgen-drawing-trial/runtime/tests/test_emitter.py`. Expect FAIL, because the emitter does not exist yet.
- [ ] **Step 3: Implement** the Dockerfile (clone SchGen at the pinned commit; `build_repo.py` at build time against the mounted KiCad 10.0.5 symbol dir, or at first run if the build cannot see it), `run_emitter.py`, `emit.sh`. The root-UUID and `get_fp` fixes are as `run_like_init_project.py` already does them; the pin fix is the `_extract_pins_all_children` replacement from `docs/research/2026-10-29-trial-microsoft-schgen/pultec_low_boost.schgen.py`, applied to `modules.utils.kicad_add_symbol` before the program is executed.
- [ ] **Step 4: Run** the Step 2 command. Expect all of them to pass.
- [ ] **Step 5: Commit** `tools/schgen-drawing-trial/runtime/`.

