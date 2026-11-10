Task 4 report: prompt token IDs and the fidelity check

Status: DONE_WITH_CONCERNS (fidelity is equal for all five boards; the concerns are about inputs and environment, listed at the end)

Commit: 98b9f39 "SchGen trial Task 4: prompt token IDs and the fidelity check", pushed to origin/ai-schgen.

What was implemented

- runtime/trial/schgen_source.py
  - user_message_template() pulls the f-string from generate.py::run_raw_test by ast and returns it with {prompt} and {symbol_context} markers.
  - render_user_message() fills that template the way an f-string fills a bare field: format(value, "").
  - evaluate_user_message() compiles SchGen's own JoinedStr node and evals it with only `prompt` and `symbol_context`. "Theirs" uses this, so our substitution is checked against Python's evaluation of SchGen's expression.
  - get_final_python() pulls the function source from evaluation.py by ast and execs it in a namespace holding only `re` and `Path`. Python supplies __builtins__, because the annotation `decoded: str` needs `str` at definition time.
  - Every extraction fails closed with SchGenSourceError, naming the node and the file. That covers a missing function, zero or several user-message appends, a non-bare field, a literal brace, and wrong field names.
- runtime/trial/prompt.py
  - render(request_text, symbols) -> PromptRecord {ids, text, token_count, template_sha256, tokenizer_files_sha256}, plus one added key: user_message_template_sha256.
  - Messages come from SchGen's config.prepare_context() and the ast template. Symbol context is SchGen's describe_symbol_info on SimpleNamespace(lib_name, name) objects.
  - The text is rendered with the merged model's chat_template.jinja (tokenize=False, add_generation_prompt=True), then tokenized with add_special_tokens=False.
  - It fails closed on:
    - a tokenizer file whose sha256 differs from SHA256SUMS;
    - a missing ./export/organized_lib.json;
    - a symbol describe_symbol_info did not describe;
    - a duplicate or malformed symbol;
    - text that does not end in <|start|>assistant.
  - CLI: `python -m trial.prompt REQUEST_JSON OUT_DIR` writes prompt.json (the record plus the board name).
- runtime/trial/fidelity.py
  - check() -> {equal, ours, theirs, first_diff}.
  - Theirs follows generate.py main() for --test_raw: tokenizer.chat_template = training/modified_chat_template.txt, msg_list = prepare_context(), the f-string evaluated, then apply_chat_template(msg_list, add_generation_prompt=True).
  - The two named departures are in the module docstring. Neither changes a token:
    - The tokenizer is loaded from runtime/tokenizer rather than from HF "openai/gpt-oss-20b". Its tokenizer.json is byte-identical to the HF file.
    - No return_tensors="pt", because torch is not in the image.
  - Also added, not asked for: a CLI `python -m trial.fidelity REQUEST_JSON OUT_DIR` that writes fidelity.json and exits non-zero when the IDs are not equal. Task 7's run_all needs fidelity.json.
- runtime/fixes/build_organized_lib.py and a Dockerfile step. This was not in the brief, and it was necessary.
  - SchGen's symbol_context loads ./export/organized_lib.json at import. When the file is absent it prints one line, returns {}, and describe_symbol_info then describes NO symbol. The prompt's symbol context would be a silent `{}`.
  - I confirmed this on the Task 1 image: `lib entries 0`.
  - SchGen's README has the user generate this file with kicad_scan_lib. The image now builds it with SchGen's own gather_symbols_by_lib and save_organized_lib from KiCad 10.0.5's libraries (223 libraries, 22784 symbols).
  - One named fix, organized_lib_sys: kicad_scan_lib imports `sys` only under __main__, so the module is given `sys` before the call.
- Other Dockerfile changes:
  - `COPY tokenizer /trial/tokenizer`
  - `ENV PYTHONPATH=/trial`, so both `pytest /trial/tests` and `python -m trial.prompt` resolve `trial` with WORKDIR /schgen.
  - The image was rebuilt with build.sh, and IMAGE_DIGEST was updated to sha256:97a618453d5e4543994707c3e5902f2f92b9cd6447fa3c9395a8e5874d3f60ce.
- requirements.in: jinja2==3.1.6 (SchGen's own pin). apply_chat_template needs it and the lock had none. lock.sh was re-run; the lock diff is additions only (jinja2 and markupsafe).
- tools/schgen-drawing-trial/make-prompt-fixtures.ts writes two files per board under runtime/tests/fixtures/<board>/:
  - request.json, from request.ts buildRequest. I confirmed it byte-identical to the request.ts CLI output for hi-boost and mid with cmp.
  - page_data.json: the UUIDs and `(at x y` pairs of the approved page found via draftedSheet, with that page's sha256. It refuses an empty extraction.

Tokenizer files and sha256

They were copied from gs://oletizi-docs-cli-20261028-schgen-merge/schgen-merged/. The bucket named in the dispatch (`...-schgen-merged`) returns 404; the real bucket is the one tools/schgen-serving/env.sh names. Only these three files were copied, and the bucket was not modified.

- chat_template.jinja: a4c9919cbbd4acdd51ccffe22da049264b1b73e59055fa58811a99efbd7c8146 (16738 bytes)
- tokenizer.json: 0614fe83cadab421296e664e1f48f4261fa8fef6e03e63bb75c20f38e37d07d3 (27868174 bytes)
- tokenizer_config.json: 50005a69dd9115dda03ce27e71f25673f659929a8fcb005879ca34bc8e0ec8d4 (380 bytes)

Checks on these files:
- All three match the bucket's MANIFEST.sha256. They are recorded in runtime/tokenizer/SHA256SUMS, which prompt.py checks on load.
- tokenizer.json and chat_template.jinja are byte-identical to openai/gpt-oss-20b's on Hugging Face. For tokenizer.json, the LFS oid the HF API reports equals our sha256. For chat_template.jinja, the downloaded file's sha256 matches ours.
- tokenizer_config.json differs from HF's. It is the transformers-5 slim form: same bos, eos and pad tokens, same model_max_length, no added_tokens_decoder.
- SchGen's training/modified_chat_template.txt has sha256 342ad1f1...3f16. It differs from chat_template.jinja by the {% generation %} tags, which render nothing for a system plus user plus generation-prompt conversation.

Fidelity results (fidelity.check in schgen-runtime)

| board | equal | ours | theirs | first_diff |
| --- | --- | --- | --- | --- |
| pultec-hi-boost | true | 4891 | 4891 | None |
| pultec-hi-cut | true | 4642 | 4642 | None |
| pultec-low-boost | true | 4612 | 4612 | None |
| pultec-low-cut | true | 4634 | 4634 | None |
| pultec-mid | true | 5495 | 5495 | None |

Control: with one character of the request changed on "ours" only (PARTS: -> PXRTS:), check() returns equal false with a first_diff inside both sequences.

token_count per board: hi-boost 4891, hi-cut 4642, low-boost 4612, low-cut 4634, mid 5495 (longest). These are recorded in:
- runtime/tests/fixtures/token_counts.json, with "longest": 5495, which test_longest_prompt_recorded re-renders against;
- the commit message.

For Task 6, --max-model-len = 5495 + 13312 = 18807, rounded up to a multiple of 1024 = 19456. That is arithmetic only; Task 6 owns the change.

TDD evidence

- RED: `docker run --rm -e PYTHONPATH=/trial -v .../runtime:/trial:ro schgen-runtime:0707520c pytest -q -p no:cacheprovider /trial/tests/test_prompt.py` gave `ImportError: cannot import name 'fidelity' from 'trial'`, and collection was interrupted (1 error).
  - That first run used the Task 1 image. Before PYTHONPATH was passed, it gave `No module named 'trial'`, which led to the ENV line.
  - The image at that point also lacked jinja2 and organized_lib.json, both found by probing the Task 1 image before implementing.
- Intermediate run, after implementing: 28 passed and 2 failed.
  - test_template_bytes_pinned failed because the constant was not yet pinned.
  - test_longest_prompt_recorded failed because token_counts.json did not exist yet.
  - The pinned template sha256 856e3758...4d53234a was cross-checked with a separate host-side static ast rebuild of the f-string. It is static parsing only, with no SchGen code run on the host, and it gave the same digest.
- GREEN: `docker run --rm -v .../runtime:/trial:ro schgen-runtime:0707520c pytest -v -p no:cacheprovider /trial/tests/test_prompt.py` gave 30 passed in 19.04s.
- Regression:
  - Task 1's test_emitter.py on the host venv against the rebuilt image: 30 passed.
  - `bun run typecheck`: clean.
  - No NUL or CR bytes in any changed source file, checked by counting.
- get_final_python expectations were written from reading evaluation.py:46-75 before running the function. One case relies on a subtlety: `$` without re.M matches before a trailing newline, so `...<|return|>\n` ends the segment there. The comment in the test says so.

Files changed

- tools/schgen-drawing-trial/runtime/trial/schgen_source.py (new)
- tools/schgen-drawing-trial/runtime/trial/prompt.py (new)
- tools/schgen-drawing-trial/runtime/trial/fidelity.py (new)
- tools/schgen-drawing-trial/runtime/tests/test_prompt.py (new)
- tools/schgen-drawing-trial/runtime/tests/fixtures/<5 boards>/{request.json,page_data.json}, tests/fixtures/token_counts.json (new)
- tools/schgen-drawing-trial/runtime/tokenizer/{chat_template.jinja,tokenizer.json,tokenizer_config.json,SHA256SUMS} (new)
- tools/schgen-drawing-trial/runtime/fixes/build_organized_lib.py (new)
- tools/schgen-drawing-trial/make-prompt-fixtures.ts (new)
- tools/schgen-drawing-trial/runtime/Dockerfile, requirements.in, requirements.lock, IMAGE_DIGEST (modified)

Self-review

- The fidelity check is not vacuous. The two sides differ in:
  - the chat template file;
  - how the user message is filled (substitution against eval of SchGen's node);
  - how tokenization is done (text then encode, against apply_chat_template's own tokenize path).
  The control test proves the comparison is sensitive.
- Both sides share prepare_context and describe_symbol_info, and both are SchGen's own code. That sharing is deliberate: the constraint is "taken from source, never retyped".
- No fallbacks:
  - A missing organized_lib, an undescribed symbol, a hash mismatch or a missing ast node each raises an error with a reason.
  - apply_chat_template's result is accepted as a Mapping's input_ids or a plain int list, and anything else raises. This normalises transformers-5's return shape; it is not a fallback.
- PromptRecord carries one extra key, user_message_template_sha256. template_sha256 is the sha256 of chat_template.jinja.
- File sizes are all under 200 lines.

Concerns

1. tokenizer.json (27.8 MB) is committed. The dispatch said "nothing larger than a few MB", but this file is the tokenizer itself and the build and tests need it.
   - The repository already commits PDFs of 19 and 24 MB.
   - If the controller prefers it out of git, the alternative is gitignore plus a fetch step checked against SHA256SUMS. prompt.py already refuses a mismatch.
2. The prompt carries "Current date: YYYY-MM-DD", from strftime_now in the chat template (generate.py's template too).
   - It is the container's clock in UTC. The rendered sample already read 2026-11-10 on the evening of 2026-11-09 local time.
   - The prompt IDs are therefore bound to the day they are rendered. Task 5 and Task 7 should render prompt.json once per board and send the saved IDs, and never re-render per attempt.
   - The fidelity check compares two renders made in the same call, so it is unaffected except at a midnight-UTC boundary.
3. Transformers version: SchGen pins transformers==4.55.4; the image has 5.22.2 (Task 1's choice). The fidelity check runs both sides under 5.22.2, so it cannot see a 4.x-versus-5.x rendering difference. The tokenizer and template bytes are identical to HF's, which limits the exposure.
4. The organized_lib.json in the image comes from KiCad 10.0.5's libraries, while SchGen was trained against KiCad 8. The symbol context's geometry and pins therefore come from 10.0.5, consistent with the component repository and the emitter. gather_symbols_by_lib reported 223 libraries. I did not check whether its SKIP_LIB entries were skipped as intended; that is SchGen's behaviour and does not affect the trial's symbols.
5. The dispatch's bucket name `oletizi-docs-cli-20261028-schgen-merged` does not exist. The files came from `...-schgen-merge` (env.sh's BUCKET), whose MANIFEST matches.
6. Environment: docker builds hung on the macOS keychain credential helper again. As instructed, builds ran with an empty DOCKER_CONFIG (linking only cli-plugins/buildx, contexts and buildx state) and a PATH without docker-credential-osxkeychain. None of this is committed.
7. The no-page-data test also asserts that no UUID of any kind appears in the prompt. It passes for all five boards.

Fix round 1

Commit: f262c41 "SchGen trial Task 4 fix round 1: departures recorded, narrower exec, pins", pushed to origin/ai-schgen.

What changed

- Important 1: three rows were added to the departures table in docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md. Each is marked "Recorded during implementation of Task 4, by controller ruling".
  - (a) transformers 5.22.2 against SchGen's 4.55.4. Both sides of the fidelity check run under 5.22.2, so the check cannot see a 4.x-against-5.x rendering or tokenization difference. The exposure is bounded by the tokenizer and template bytes being identical to HF's.
  - (b) Tokenizer files come from the merged model. tokenizer.json and chat_template.jinja are byte-identical to HF's. tokenizer_config.json differs:
    - the merged copy is 380 bytes, with TokenizersBackend, backend, is_local and local_files_only;
    - HF's is 4200 bytes, with PreTrainedTokenizerFast, extra_special_tokens and added_tokens_decoder;
    - the bos, eos and pad tokens, model_max_length and clean_up_tokenization_spaces agree.
  - (c) organized_lib.json is generated from KiCad 10.0.5 libraries (SchGen trained against KiCad 8) with the organized_lib_sys fix.
  - The "Emitter fixes - all four" row is now "Fixes to SchGen's code - four on the emitter side ... and one on the prompt side". It lists (e) organized_lib_sys as a prompt-side fix.
- M1: get_final_python is exec'd with `{"__builtins__": {"str": str}, "re": re, "Path": Path}`.
- M2: a new function, schgen_source.final_python_source(), returns the extracted source.
  - test_final_python_source_pinned pins its sha256 at 655dfd97b9c021a874ac97c5b7bf7aa39b3c4159b9bb8cc4d77f9ece02e39722 (evaluation.py lines 46-72).
  - The value was cross-checked by a host-side static read, two ways (ast segment and raw lines), which agree.
- M3: PromptRecord and prompt.json carry rendered_date, read from the text's single "Current date:" line. A count other than one is refused. test_record_carries_provenance checks it.
- M4: runtime/.dockerignore excludes tests/fixtures/*/page_data.json (and __pycache__).
  - After the rebuild, `find / -name page_data.json` inside the image finds 0 files.
  - Tests read the file from the read-only bind mount.
  - IMAGE_DIGEST is now sha256:cc28b5ed3dc085b61e4d7a9095b7bd236821a7463bbcfc732b86ec68415b4e86.
- M5: a described symbol with empty pin_info, or carrying an "error" key, is refused. test_symbol_context_refuses_pinless_or_error_entry has two cases, and also confirms that a well-formed entry passes.
  - Note: SchGen's {'name', 'error'} fail-soft entry is in its footprint scan (kicad_scan_lib.py:577), not the symbol scan. The guard is kept as written.
  - The review also settled concern 4 of the first report: SchGen's module redefines SKIP_LIB = set() at line 423, so nothing is skipped on either path.

Findings measured while doing M5 (recorded in the spec's organized_lib row, and asserted in test_symbol_context_covers_every_symbol; neither is corrected)

- I first refused an empty Bounding_box too. That refused every board, because Device:L gets `Bounding_box: []`.
  - The cause is SchGen's own extractor, which builds the box only from `xy` and `rectangle` nodes; the inductor is drawn with arcs.
  - This is SchGen's own behaviour, not a KiCad 10 effect, so an empty bbox is not refused.
- KiCad 10.0.5 writes an unnamed pin as `(name "")`. I verified this in Device.kicad_sym for R. SchGen's extractor maps only `"~"` to the pin number.
  - As a result, Device:R, Device:C, power:GND and Switch:SW_Rotary_1x6_MP reach the model with every pin_name empty: a position and orientation, but no identifier.
  - Meanwhile, the request names their pins by number (R1.1).
  - This is a content effect of departure (c) on every board. Fixing it would be a further change to SchGen's prompt-side code, so I have not made it. It is the controller's or owner's call.

Tests (rebuilt image cc28b5ed)

- test_prompt.py: 33 passed. Fidelity is still equal on all five boards, and the token counts are unchanged.
- test_emitter.py on the host venv: 30 passed.
- No NUL or CR bytes in the changed files.

Concerns

1. Empty pin names (above) are the main finding. The model is told R, C, GND and the 1x6_MP switch's pin positions with no pin names or numbers, while the request wires them by number. The pages may reflect this, so a decision is needed before Task 7 spends GPU time.
2. Concerns 1-3 and 5-6 of the first report still stand (fix round 1).

Fix round 2

Commit: b739a1f "SchGen trial Task 4 fix round 2: pin_name_empty prompt-side fix", pushed to origin/ai-schgen.

What changed

- A new named prompt-side fix, pin_name_empty, sits in fixes/build_organized_lib.py beside organized_lib_sys.
  - After SchGen's gather_symbols_by_lib, and before save_organized_lib, the `name` child of every `pin` node whose stored value is exactly '""' becomes '"~"'. That is KiCad 8's spelling, and SchGen's own `if pin_name == "~": pin_name = pin_number` in symbol_context then substitutes the number.
  - Nothing else in the scan output changes. `extends` entries, which hold a string, are skipped.
  - The build reported `pin_name_empty: 6428 pin names "" -> "~"`.
  - The build refuses a scan where the fix rewrites zero pins, which would mean the stored form changed.
  - A survey of the unfixed organized_lib.json found 6428 `""` names, no `"~"` names anywhere, and 535218 named pins.
- The emitter is unaffected. Its path (run_emitter, kicad_sch_interface, kicad_add_symbol, misc, init_project) does not load organized_lib.json; I checked by grep. Only symbol_context and symbol_info_generation read it.
- Spec departures table updated:
  - The fixes row now reads "two on the prompt side" and lists (f) pin_name_empty: what it does, why (under KiCad 8 these pins show numbers), and that it was made by controller ruling in Task 4 fix round 2.
  - The organized_lib.json row says the effect is fixed. The "Not corrected" wording is removed.

Does "theirs" run with the same fix? Yes. Both sides of fidelity.check call SchGen's describe_symbol_info, which reads the same /schgen/export/organized_lib.json, and the fix is baked into that file at image build. So the check confirms the prompt path under the fix; it does not test the fix itself.

TDD

- RED, on the round-1 image (45f0d8 not yet built): 2 failed, 33 passed.
  - test_unnamed_pins_carry_their_number failed: Device:C got ['', ''] and power:GND got [''].
  - test_symbol_context_covers_every_symbol failed on the new no-empty-pin-name assertion.
  - test_named_pins_keep_their_name passed already, as a guard: SW_SPDT kept ['A','B','C'] and Conn_01x05 kept Pin_1..Pin_5.
- After the rebuild: 34 passed; only test_longest_prompt_recorded failed, because the token counts moved.
- GREEN after re-recording the counts: test_prompt.py 35 passed, and test_emitter.py 30 passed on the host venv against the new image.
- Expected pin numbers were read from KiCad 10.0.5's libraries on the host:
  - R and C: 1, 2
  - GND: 1
  - SW_Rotary_1x6_MP: 1-7 and MP

Fidelity (python -m trial.fidelity per board, all equal, first_diff null)

| board | token_count |
| --- | --- |
| pultec-hi-boost | 4917 |
| pultec-hi-cut | 4668 |
| pultec-low-boost | 4638 |
| pultec-low-cut | 4660 |
| pultec-mid | 5505 (longest) |

The counts are recorded in tests/fixtures/token_counts.json and in the commit message. For Task 6, 5505 + 13312 = 18817, which still rounds up to 19456.

IMAGE_DIGEST: sha256:45f0d82183d94bb38b687ed460b2affa893a936bc9cac2c5082702b931dd51b6

Concerns

- Device:L still has `Bounding_box: []`. That comes from SchGen's own extractor, which does not count arcs, and is independent of the KiCad version. It is recorded in the spec and left as is.
- Concerns 1-3 and 5-6 of the first report still stand. These are the 27.8 MB tokenizer.json, the date binding (now carried as rendered_date), the transformers version (now in the spec), the bucket name, and the docker keychain workaround.
