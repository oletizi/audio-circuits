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

