# SchGen Drawing Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three SchGen attempts at each of the five approved Pultec boards, every attempt a rendered page or a neutral "no schematic generated" card, shown to the owner beside the approved page, with full provenance committed.

**Architecture:** TypeScript (bun) owns everything that reads the circuit model: the request generator and the netlist comparison. One Docker image (`schgen-runtime`) owns everything that runs SchGen's Python: symbol context, prompt token IDs, the fidelity check, extraction, and the emitter, with the network off for the emitter. The host's `kicad-cli` 10.0.5 renders, exports and runs ERC. A resumable Python runner on the host strings the stages together and talks to vLLM through the Kinference gateway.

**Tech Stack:** bun + TypeScript (repo standard, `bun test`); Python 3.12 in Docker (pytest); transformers 5.22.2 tokenizer only; SchGen at `0707520c587984651cd32908acfd9b117876e93b`; kicad-skip 0.2.5, sexpdata 1.0.0; KiCad 10.0.5 `kicad-cli` on macOS; GKE + vLLM v0.32.0 + Kinference from `tools/schgen-serving/`.

**Spec:** `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md` (approved). Executors read it before starting; it is the authority on every rule below.

## Global Constraints

- Boards: `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-mid`; refuse any whose `drafted/pultec/<board>/<board>.generated-do-not-edit.kicad_sch` sha256 is absent from `docs/schematic/verdicts.md`.
- Three attempts per board; seeds 42, 43, 44 for attempts 1, 2, 3.
- Sampling sent explicitly: `temperature=1.0, top_k=50, top_p=1.0, max_tokens=13312`. Prompt sent as token IDs to `/v1/completions`, with `skip_special_tokens=false`.
- SchGen pinned at `0707520c587984651cd32908acfd9b117876e93b`; its user-message template and `get_final_python` are taken from its source, never retyped.
- Symbols: the model's intended symbol per component, plus `power:GND`; never `copperhead_power:*`, never `PWR_FLAG`.
- No request text is hand-written; the request generator opens no `.kicad_sch`.
- An attempt with a saved raw response is never regenerated.
- Model-written programs run only inside the container with `--network none`.
- Render, netlist and ERC use the host `kicad-cli` 10.0.5.
- No agent verdict vocabulary about any page (`EVALUATING-DRAWINGS.md` §2); every attempt shown, none withheld, none ranked.
- Failure cards read exactly `Attempt N: no schematic generated`.
- Repo rules: no git hooks, no `--no-verify`, no AI attribution in commits, no `sed` writes, no `#` inside multi-line quoted bash arguments, long work under `nohup`, commit and push after each task.

## Review Focus

1. **A response with no `final` channel** - SchGen's extractor silently falls back to the whole response; expect the attempt classified `no-final-channel` and the fallback's program still tried and recorded, not silently treated as a clean extraction. Test in Task 5.
2. **A response cut off at `max_tokens`** (`finish_reason: length`) - expect it recorded, extraction attempted, and the page (if any) shown like any other. Test in Task 5.
3. **A blank result.** There are two kinds. A program that places nothing is `symbol-free-sheet`. A sheet with symbols that renders or exports empty (the nil-UUID class) is `blank-render`. Either way, expect a neutral card for the owner and the sheet kept. Test in Task 5.
4. **A Spot node reclaimed mid-request** - expect the attempt to have no raw response, a relaunch to regenerate only that attempt, and all others untouched. Test in Task 5.
5. **A program that never terminates, floods its output, or exhausts memory** - expect `emit.sh` to stop it, remove the container, and classify the attempt `limit-exceeded` with the limit named. Test in Task 1.

---

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

### Task 2: The request generator, from the model only

**Files:**
- Modify: `lib/kicad/sheet-agreement.ts` (export `intendedSymbol`; no behaviour change)
- Create: `tools/schgen-drawing-trial/request.ts`
- Create: `tools/schgen-drawing-trial/boards.ts`
- Test: `tests/schgen-trial/request.test.ts`

**Interfaces:**
- Consumes: `modelForSheet(board): SheetModel` (`tests/circuits/sheet-model.ts`); `toImportedNetlist` (`lib/kicad/from-network.ts`); `intendedSymbol(component): string`; `sha256OfFile`, `draftedSheet` (`tests/circuits/drafted-sheet.ts`).
- Produces: `TRIAL_BOARDS: readonly string[]` and `approvedSheetDigest(board): string` (throws if the sheet's sha256 is not in `verdicts.md`) in `boards.ts`.
- Produces: `interface TrialRequest { board: string; text: string; symbols: string[]; netlist: { components: {designator: string; value: string; symbol: string}[]; nets: Record<string, string[]>; labels: Record<string, string> } }` and `buildRequest(board: string): TrialRequest` and `parseRequest(text: string): TrialRequest["netlist"]` in `request.ts`.
- Produces: CLI `bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR` writing `request.json` and `request.txt`.

Request text format, fixed for every board (three sections, in this order; one item per line; nothing else):
`PARTS:` lines `<designator> <value> <library:symbol>`; `NETS:` lines `<net>: <designator.pin> <designator.pin> ...` with pin names as the symbol numbers them; `LABELS:` lines `<label> -> <net>`. The ground net is named `GND`. Before writing the generator, read SchGen's published request examples (its dataset on Hugging Face or `sch_examples`) and record in the module comment how they state connectivity. If a mechanical convention of theirs can be followed, follow it and record that; if not, record the difference as a departure.

- [ ] **Step 1: Write the failing tests** in `request.test.ts`, one `for` over `TRIAL_BOARDS`:
  - `round trip`: `parseRequest(buildRequest(b).text)` deep-equals `buildRequest(b).netlist`, and every model pin appears in exactly one net.
  - `matches the model`: the netlist's net partition equals the partition from `toImportedNetlist(modelForSheet(b)...)`, with `0` renamed to `GND`.
  - `control`: moving one pin to another net in the text makes `matches the model` fail (assert the comparison reports a difference).
  - `no placement leak`: no `(at `-derived coordinate pair, no `rotation`/`mirror` token, and no UUID from the approved sheet appears in `text`.
  - `symbols`: `symbols` contains `power:GND`, contains no `copperhead_power:` entry and no `PWR_FLAG`.
  - `approval check`: `approvedSheetDigest` returns a digest found in `docs/schematic/verdicts.md`, and throws for a temp copy with one byte changed.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/request.test.ts` → expect FAIL (module missing).
- [ ] **Step 3: Implement** `boards.ts`, `request.ts`, the `intendedSymbol` export.
- [ ] **Step 4: Run** `bun test tests/schgen-trial/request.test.ts && bun run typecheck` → expect all pass.
- [ ] **Step 5: Commit.**

### Task 3: Prove the comparator before trusting it

**Files:**
- Create: `tools/schgen-drawing-trial/compare.ts`
- Test: `tests/schgen-trial/comparator-controls.test.ts`

**Interfaces:**
- Consumes: `compareSheetToModel`, `modelForSheet`, `exportDraftedSheet`, `importNetlist`.
- Produces: `compareAttempt(board: string, netlistPath: string): { attempt: SheetAgreement; approvedBaseline: SheetAgreement }` and CLI `bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON`. The baseline is the approved page's own lists, so the known drawn-elsewhere disagreements (the MP lug, the switch `Value`) are reported beside each attempt rather than mistaken for SchGen's.

- [ ] **Step 1: Write the failing tests**, on `pultec-low-boost`'s fresh export, each mutation a helper in the test file:
  - `known equal`: `compareAttempt` on the approved export → `attempt` equals `approvedBaseline`.
  - `pin moved` → `netMembership` non-empty.
  - `two nets merged` → `netMembership` non-empty.
  - `net renamed` → `netMembership` equals the baseline's (names do not count).
  - `pin number swapped between two pins of one part` → `pinIdentity` or `netMembership` non-empty.
  - `pin left unconnected` (removed from its net) → non-empty.
  - **Power symbols, two cases with fixed semantics.** A power symbol's net name, its `Value`, is connectivity; its library, glyph and `#PWR` designator are not.
    - `power symbol restyled`: every ground power symbol's library is changed (`copperhead_power:GND` to `power:GND`) and its `#PWR` designators renumbered, with the value still `GND`. Assert `attempt` **equals** `approvedBaseline`.
    - `power symbol renamed on one pin`: one ground pin's net is renamed to `AGND`, splitting the ground net. Assert `netMembership` is **non-empty**.
    - If the comparator gets either case wrong, fix it in `compare.ts`'s normalisation (not in `lib/`), with these two tests as the proof, and say so in the commit.
  - `nothing adjusted`: `compareAttempt`'s `attempt` lists equal a direct `compareSheetToModel` call on the same export. The baseline is reported beside them and never subtracted from them.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/comparator-controls.test.ts` → FAIL.
- [ ] **Step 3: Implement** `compare.ts`.
- [ ] **Step 4: Run** the same → all pass.
- [ ] **Step 5: Commit.**

### Task 4: Prompt token IDs, and the fidelity check

**Files:**
- Create: `tools/schgen-drawing-trial/runtime/trial/prompt.py`, `.../trial/schgen_source.py`, `.../trial/fidelity.py`
- Test: `tools/schgen-drawing-trial/runtime/tests/test_prompt.py`

**Interfaces:**
- Consumes: `request.json` (Task 2); the merged model's tokenizer files and `chat_template.jinja` (copied from the bucket's `schgen-merged/` into `tools/schgen-drawing-trial/runtime/tokenizer/`, sha256 recorded); SchGen's `training/modified_chat_template.txt`.
- Produces: `schgen_source.user_message_template() -> str`, which pulls the f-string from `schematic_generation/generate.py::run_raw_test` by `ast` (the module cannot be imported: it loads a model at import), and `schgen_source.get_final_python(decoded: str) -> str`, which pulls that function's source from `schematic_generation/evaluation.py` by `ast` and executes it in an isolated namespace with only `re` and `Path`.
- Produces: `prompt.render(request_text: str, symbols: list[str]) -> PromptRecord` with `PromptRecord = {ids: list[int], text: str, token_count: int, template_sha256: str, tokenizer_files_sha256: dict}`. Symbol context comes from SchGen's `describe_symbol_info` on objects carrying `lib_name` and `name`.
- Produces: `fidelity.check(request_text, symbols) -> {equal: bool, ours: int, theirs: int, first_diff: int | None}`. "Theirs" uses `config.prepare_context()`, the `ast`-extracted template, and a tokenizer with `modified_chat_template.txt` set, exactly as `generate.py` sets it. "Ours" is `prompt.render`.
- Produces: CLI `docker run ... python -m trial.prompt REQUEST_JSON OUT_DIR` writing `prompt.json`.

- [ ] **Step 1: Write the failing tests:**
  - `test_fidelity_equal`: for each of the five `request.json` fixtures, `fidelity.check(...)["equal"]` is true.
  - `test_fidelity_control`: with one character of the request changed only on "ours", `equal` is false and `first_diff` is not None.
  - `test_ends_with_generation_prefix`: the rendered text ends with `<|start|>assistant`.
  - `test_get_final_python_cases`: extraction from SchGen's source behaves as that source's regexes specify, on all of these:
    - a full harmony response (analysis channel, then final channel, fenced program, `<|return|>`)
    - final with no fence
    - a `python` fence and a bare fence
    - two final channels (the first wins)
    - no final channel (the whole response is returned)
    - repeated `<|return|>`
    - a response truncated mid-program
    Expected values are written in the test from reading `evaluation.py:46-75` at the pinned commit, not from running the function.
  - `test_ast_fails_closed`: pointing `schgen_source` at a copy of `generate.py` with `run_raw_test` renamed, and at a copy of `evaluation.py` with `get_final_python` removed, raises an error naming the missing node and file. It must not return an empty template or a stand-in function.
  - `test_template_bytes_pinned`: the extracted user-message template's sha256 equals a constant recorded in the test, so an upstream change cannot pass silently.
  - `test_symbol_context_has_no_page_data`: the rendered text contains no UUID and no `(at x y` pair from the approved sheet (the fixture supplies both, read in the test only).
  - `test_longest_prompt_recorded`: `token_count` is recorded for every board (the value Task 6 uses).
- [ ] **Step 2: Run** `docker run --rm -v ... schgen-runtime:0707520c pytest -q /trial/tests/test_prompt.py` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same → pass. Record each board's `token_count` in the commit message.
- [ ] **Step 5: Commit.**

### Task 5: The resumable attempt runner

**Files:**
- Create: `tools/schgen-drawing-trial/run_attempt.py`, `tools/schgen-drawing-trial/stages.py`
- Create: `tools/schgen-drawing-trial/render.ts` (CLI over the repository's own `renderSheet` in `tools/draught/draw-render.ts`: `kicad-cli sch export pdf` and `svg`, then `magick` to PNG. This is the same path the approved pages were rasterised with; **`kicad-cli` 10.0.5 has no `sch export png`**, checked with `kicad-cli sch export --help` 2026-11-09.)
- Test: `tests/schgen-trial/render.test.ts` (host integration on the installed KiCad 10.0.5: render an approved Pultec sheet; assert a PDF, an SVG and a PNG exist; that the PNG's non-white bounding box spans more than half the page in both axes; and that the SVG contains every designator in the sheet's netlist, so nothing was clipped)
- Create: `tools/schgen-drawing-trial/run_all.sh` (all boards and attempts in the fixed order, `nohup`-safe, idempotent)
- Test: `tools/schgen-drawing-trial/tests/test_stages.py` (host pytest; fixtures may be synthetic responses, this being test code)

**Interfaces:**
- Consumes: Tasks 1-4 CLIs; the gateway at `$TRIAL_ENDPOINT` (default `http://localhost:18000`, port-forwarded as `smoke.sh` does).
- Produces: attempt directory `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/<board>/attempt-<n>/` holding `request.txt`, `request.json`, `prompt.json`, `response.raw.txt`, `response.json` (usage, `finish_reason`, latency seconds), `program.py`, `page.kicad_sch`, `page.png`, `page.pdf`, `page.net`, `page.erc.rpt`, `compare.json`, `emitter.log`, `manifest.json`.
- Produces: `stages.classify(attempt_dir) -> Outcome`. **Outcomes name the stage observed, not the cause.** `program-raised` says the program raised while it ran; it does not say whose defect it was, since a valid program can hit an emitter defect. The traceback and the active fixes are kept, and cause is left to the diagnostics after the owner's verdict. The values:
  - `page`
  - `no-final-channel` (the program may still have been extracted by the fallback)
  - `no-program`
  - `program-raised`
  - `limit-exceeded` (carrying the `LIMIT:` name)
  - `tooling-failed`
  - `symbol-free-sheet`: the sheet is valid but has no symbol instances
  - `blank-render`: the sheet has symbol instances but the render or exported netlist is empty, which is the nil-UUID class
- `manifest.json` keys (spec, "Provenance and resumability"): `board`, `attempt`, `seed`, `model_module`, `git_revision`, `approved_sheet_sha256`, `schgen_commit`, `merged_manifest_sha256`, `tokenizer_files_sha256`, `template_sha256`, `vllm_version`, `vllm_image_digest`, `prompt_sha256`, `raw_response_sha256`, `sampling`, `prompt_tokens`, `output_tokens`, `finish_reason`, `latency_s`, `emitter_fixes`, `kicad_cli_version`, `outcome`, `failure_stage`, `downstream_reruns` (list of `{reason, at}`).

**The generation request body** is `{"model": "schgen-merged", "prompt": <ids>, "max_tokens": 13312, "temperature": 1.0, "top_k": 50, "top_p": 1.0, "seed": <seed>, "skip_special_tokens": false, "return_token_ids": true}`, with a unique `X-Request-Id` per attempt.

**Token identity, not token count.** vLLM's `return_token_ids` returns the prompt token IDs it consumed and the generated token IDs.
- The runner asserts the returned prompt IDs equal the IDs sent, element by element. A mismatch stops the run, naming the first differing index.
- It asserts that decoding the returned generated IDs with special tokens kept equals the `text` returned, so the harmony markers `get_final_python` needs were not stripped.
- Both checks need the field, and Task 7 step 3 proves it is present through the gateway on the pinned deployment.
- **If the field is absent, the run does not claim token-level fidelity.** It records `token_identity: "unverified - count only"` in every manifest and names the limitation in the README and the findings. Only after that may it continue on count equality.

**Persistence is atomic.**
- Each artifact is written to `<name>.part`, then `fsync`'d, then renamed into place.
- `response.raw.txt` and `response.json` are written first. `response.complete` is written last and holds both files' sha256.
- **An attempt counts as generated only when `response.complete` exists and its digests match the files.** A `.part` file, or a response with no valid marker, means the outcome is unknown.
- In that case the incomplete files are moved to `interrupted/<timestamp>/` (kept, never deleted) and the attempt is generated again once, with the same seed. The interruption is recorded in `downstream_reruns` with reason `generation-interrupted`.
- That one regeneration is not a resample: no response for the attempt was ever completed, so none was seen or discarded.

- [ ] **Step 1: Write the failing tests:**
  - `test_saved_response_is_not_regenerated`: with `response.raw.txt` present, `run_attempt` makes no HTTP call (inject a client that fails if called) and runs downstream.
  - `test_missing_response_is_generated_once`: with no response, exactly one call; the response is written before extraction runs.
  - `test_no_final_channel_classified`: a response with no `final` channel → outcome `no-final-channel`, `program.py` still written from SchGen's fallback, and the emitter still tried.
  - `test_length_cutoff_recorded`: `finish_reason: length` is in the manifest and does not by itself fail the attempt.
  - `test_symbol_free_sheet`: a well-formed sheet with zero symbol instances is classified `symbol-free-sheet`.
  - `test_blank_render`: a sheet with symbol instances but an empty exported netlist (the nil-UUID fixture from the 2026-10-29 trial) is classified `blank-render`.
  - `test_partial_response_is_not_complete`: a `response.raw.txt.part` with no `response.complete` makes the attempt ungenerated. The partial is moved to `interrupted/`, generation runs once, and the manifest records `generation-interrupted`.
  - `test_marker_digest_mismatch`: a `response.complete` whose digest does not match `response.raw.txt` is treated the same as no marker.
  - `test_prompt_ids_mismatch_stops`: a fake server returning prompt IDs that differ at index 7 raises an error naming index 7.
  - `test_special_tokens_stripped_stops`: a fake server whose `text` lacks markers its returned IDs decode to raises an error.
  - `test_no_token_ids_field_is_qualified`: a fake server without `return_token_ids` support produces `token_identity: "unverified - count only"` and does not raise.
  - `test_downstream_rerun_recorded`: re-running downstream appends to `downstream_reruns` and leaves `raw_response_sha256` unchanged.
- [ ] **Step 2: Run** `python -m pytest -q tools/schgen-drawing-trial/tests` → FAIL.
- [ ] **Step 3: Implement** `stages.py` (one function per stage, each a pure function of files on disk except `generate`), `run_attempt.py`, `run_all.sh`, `render.ts`. Render with `render.ts`; export the netlist with `kicad-cli sch export netlist`; run ERC with `kicad-cli sch erc`.
- [ ] **Step 4: Run** `python -m pytest -q tools/schgen-drawing-trial/tests && bun test tests/schgen-trial/render.test.ts`. Expect all to pass.
- [ ] **Step 5: Commit.**

### Task 6: Serving changes for completions

**Files:**
- Modify: `tools/schgen-serving/manifests/kinference.yaml.tmpl` (second HTTPRoute rule, `PathPrefix /v1/completions`, same backend)
- Modify: `tools/schgen-serving/manifests/vllm-schgen.yaml` (`--max-model-len` = longest Task 4 `token_count` + 13312, rounded up to a multiple of 1024; the comment states the measured inputs)
- Modify: `tools/schgen-serving/smoke.sh` (a `completions` mode: token-ID prompt via the gateway, `return_token_ids: true`, `skip_special_tokens: false`, marker in `X-Request-Id`; it compares the returned prompt IDs with those sent and checks that a harmony marker survives in `text`)

**Interfaces:**
- Produces: `smoke.sh completions` exits 0 when the gateway routes `/v1/completions`, the returned prompt IDs equal the IDs sent, and the special tokens survive. It exits 2, with the message `return_token_ids unsupported`, when the field is absent, which is the signal for Task 5's qualified mode.

- [ ] **Step 1: Make the edits.** There is no offline test for the route; it is proven live in Task 7, step 3.
- [ ] **Step 2: Run** `bash -n` on each script and `kubectl apply --dry-run=client -f` on the rendered manifests → expect no errors.
- [ ] **Step 3: Commit.**

### Task 7: The run

**Files:**
- Create: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/README.md` (what the record is, per the repository rule)

- [ ] **Step 1:** Run `bash tools/schgen-drawing-trial/run_all.sh --requests-only`. It needs no GPU, and builds one request and one prompt per board under `<execution dir>/<board>/request/` (`request.txt`, `request.json`, `prompt.json`, `fidelity.json`). Expect five, each with `equal: true`. The three attempts per board read that one shared prompt and write only under their own `attempt-<n>/`. The runner refuses to write into an `attempt-<n>/` that already holds `response.complete`, except for downstream files.
- [ ] **Step 2:** `probe-capacity.sh` across the candidate zones; set `env.sh` to the zone found; `cluster-up.sh`; `install-kinference.sh`; deploy vLLM; `apply-kinference.sh 16`, re-measuring the block size from the vLLM log first and refusing if it is not 16.
- [ ] **Step 3:** Run `smoke.sh completions` through the gateway. Act on its result:
  - **Exit 0:** proceed.
  - **Exit 2** (`return_token_ids unsupported`): proceed in the qualified mode, and record the limitation in the README.
  - **The route itself fails:** run the same smoke direct to `svc/schgen-merged:8000`. Point `TRIAL_ENDPOINT` there and record the departure in the README.
  - **Token IDs differ through the gateway but match direct:** that is a Kinference finding. Record it, and run direct.
- [ ] **Step 3a:** Confirm `runtime/IMAGE_DIGEST` equals `docker image inspect schgen-runtime:0707520c --format '{{.Id}}'`.
- [ ] **Step 4: Preflight.** Under `nohup`, run `run_attempt.py` for attempt 1 of the first board in run order. Read its manifest: latency, output tokens, outcome. Fix any tooling failure and re-run downstream on the same response. Write the measured latency into the README, and from it the expected batch duration.
- [ ] **Step 5:** Run `nohup bash tools/schgen-drawing-trial/run_all.sh > run.log 2>&1 &`. Watch for completion with a background poller, not with sleeps.
- [ ] **Step 6:** `capture-record.sh` into the execution directory; then `gpu-scale.sh 0` and `down.sh` (bucket kept). Verify with `gcloud container clusters list` (empty) and `gcloud compute instances list` (empty).
- [ ] **Step 7: Commit and push** the whole execution directory.

### Task 8: Show the owner, record his verdicts, write the findings

**Files:**
- Create: `tools/schgen-drawing-trial/present.py` (per board: one image with the approved page and attempts 1, 2, 3 left to right in that order, each captioned only `approved` / `attempt N`; a missing page is a card reading exactly `Attempt N: no schematic generated`)
- Modify: `docs/schematic/verdicts.md` (his words verbatim, bound to each SchGen sheet's sha256)
- Create: `docs/research/2026-11-09-schgen-drawing-trial.md` (observations only; nothing in §2's forbidden list)
- Test: `tools/schgen-drawing-trial/tests/test_present.py`:
  - `test_order_and_captions`
  - `test_failure_card_text_exact`
  - `test_every_attempt_has_a_panel`: for every attempt directory, of any outcome, there is exactly one panel, and a missing or unreadable PNG (a zero-byte file, or a corrupt one) becomes the neutral card rather than a dropped panel.
  - `test_no_diagnostics_in_image`: the composed image's text sources contain no outcome name, no traceback text and no `LIMIT:` string. Assert it on the caption strings `present.py` passes to the compositor.

- [ ] **Step 1: Write the failing present tests.**
- [ ] **Step 2: Run** `python -m pytest -q tools/schgen-drawing-trial/tests/test_present.py`, expecting FAIL. Then implement and run again, expecting PASS.
- [ ] **Step 3:** Send the five board images to the owner **first**, in board order, with one question per board and nothing else: *"What do you make of SchGen's three attempts at `<board>` against the approved page?"*
- [ ] **Step 4:** Record each verdict verbatim in `verdicts.md`. Only after his verdicts, or if he asks, give the per-attempt diagnostics: outcome, failure stage and traceback, `compare.json` against the baseline, ERC counts, tokens, `finish_reason`.
- [ ] **Step 5:** Write the findings doc and point the 2026-10-29 model-running doc's open question 2 at it. Commit and push.
