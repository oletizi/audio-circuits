Verdict: Needs fixes. One Important: the spec does not record the task's departures. The code itself holds up against every focus point.

### Spec Compliance

- **Brief interfaces.** All are present:
  - `schgen_source.user_message_template` and `get_final_python`, both extracted by ast;
  - `prompt.render` returning a PromptRecord, with one extra key, `user_message_template_sha256`, which is additive;
  - `fidelity.check` returning `{equal, ours, theirs, first_diff}`;
  - the CLI `python -m trial.prompt REQUEST_JSON OUT_DIR`, plus an extra `trial.fidelity` CLI.
- **Brief tests.** All eight named tests exist. There are two extras: symbol coverage and provenance.
- **"Theirs" follows generate.py.** I checked it against `generate.py` at 0707520c.
  - The tokenizer gets `chat_template` set from `training/modified_chat_template.txt`. generate.py does this at lines 53-57, and fidelity.py at lines 72-76 of the diff.
  - `msg_list = prepare_context()`.
  - The user message is SchGen's own `JoinedStr` node, compiled and evaluated with `{"__builtins__": {}}`.
  - `apply_chat_template(msg_list, add_generation_prompt=True)` is called. `return_tensors="pt"` is dropped, and that is named.
  - The symbol selector is replaced by `describe_symbol_info`, which is a spec departure already recorded in the spec.
- **Input fidelity section, point 1.** Satisfied: "ours" and "theirs" are compared at the token-ID level, with the generation prefix included.
- **Point 3, provenance.** This is partly in the record: `template_sha256` and the per-file sha256 of the tokenizer files. The vLLM version, image digest and sampling parameters belong to later tasks.
- **Departures table.** It does **not** carry any of the following:
  - transformers 5.22.2 against SchGen's pin of 4.55.4;
  - the tokenizer loaded from the merged model's copy, whose `tokenizer_config.json` differs from HF's;
  - `export/organized_lib.json` built by the trial from KiCad 10.0.5 libraries, with the `organized_lib_sys` fix.

  The table's "Emitter fixes - all four" row is now inaccurate. These departures are recorded only in module docstrings. See Important 1.
- **Transformers 5.22.2 (asked explicitly).** The spec does **not** record it. A grep of the spec for `transformers` finds only the sampling-defaults sentence (line 106). Nothing there records the version.

### Strengths

- **The fidelity check is independent where it can be.**
  - "Ours" fills the template by substitution through `FIELD_RE` and `format(v, "")`; "theirs" evaluates SchGen's own f-string node.
  - "Ours" renders with `chat_template.jinja`; "theirs" with `modified_chat_template.txt`.
  - "Ours" encodes the rendered text; "theirs" uses `apply_chat_template`'s own tokenize path.
  - What they share is SchGen's own `prepare_context`, `describe_symbol_info` and the pinned tokenizer files. Sharing those is correct, since the constraint is "taken from source".
  - The shared tokenizer instance cannot contaminate "ours": "ours" passes `chat_template=` explicitly, and "theirs" restores `tok.chat_template` in a `finally`.
- **The control can fail.** It changes one character on the "ours" side only, through a monkeypatch of `fidelity.render`. It then asserts `equal is False`, and that `first_diff` lies strictly inside both sequences. A comparator that always reported equal would fail it.
- **The ast extraction fails closed throughout.**
  - These conditions each raise `SchGenSourceError`, naming the node and the file:
    - a missing file;
    - zero or several module-level defs;
    - zero or several `msg_list.append({"role": "user", "content": f"..."})` calls;
    - a literal brace;
    - a non-bare field;
    - a field order other than `(prompt, symbol_context)`.
  - `test_ast_fails_closed` exercises a renamed `run_raw_test`, a removed `get_final_python` and an absent file. Each asserts that the error names the node and the path.
- **The template sha256 is pinned** in `test_template_bytes_pinned` (`856e3758...`). It was cross-checked by a static rebuild.
- **The get_final_python expected values match `evaluation.py:46-75`.** I spot-checked four cases by hand against the regexes:
  - `full_harmony`: the lazy group runs to `$`, the `<|return|>` is stripped, then the fence lines go, giving `add(1)\nx = 2`.
  - `two_finals_first_wins`: the match stops at the first `<|end|>`, giving `a = 1`.
  - `repeated_return`: `$` matches before the trailing `\n` without `re.M`, and the return-run strip gives `c = 3`.
  - `truncated_mid_program`: only the leading fence is removed.

  All four agree with the source.
- **The organized_lib.json build follows SchGen's `__main__`** (`kicad_scan_lib.py:589-595`): `gather_symbols_by_lib(lib_dir)` with default fields, then `save_organized_lib(..., "./export")`.
  - The fix is the minimum needed. `sys` is imported only under the top `if __name__ == "__main__":` (lines 8-16), yet `gather_symbols_by_lib` writes to `sys.stdout`.
  - SchGen's own module redefines `SKIP_LIB = set()` at line 423, which overrides the list at line 157 in both call paths. So the implementer's open question in Concern 4 resolves as "nothing is skipped either way". That is faithful, not a difference.
- **The symbol-context silent drop is now refused.** `prompt.symbol_context` compares the described `lib:symbol` set against the requested set. A missing `organized_lib.json` is refused before SchGen's module would silently load `{}`.
- **No page data reaches the prompt.** The no-page-data test asserts:
  - no UUID of any kind is present;
  - no approved-page UUID is present;
  - no approved-page `(at x y` pair is present.

  It also guards against a vacuous fixture, both in the test and in `make-prompt-fixtures.ts`.
- **Limits are met.** Every file is under 200 lines. The commit message carries no AI attribution, which I checked with grep: 0 matches.

### Issues

#### Critical

None.

#### Important

**1. Unrecorded departures.** Location: `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md:114-120`, the departures table.

- **What.** Task 4 introduces three departures from SchGen's run that the spec's table does not carry:
  - **(a) transformers 5.22.2** against SchGen's pin of 4.55.4. "Theirs" and "ours" both run under 5.22.2, so the fidelity check cannot see a 4.x-against-5.x rendering or tokenization difference.
  - **(b) Tokenizer source.** It is the merged model's `runtime/tokenizer/`, not HF's `openai/gpt-oss-20b`. `tokenizer.json` and `chat_template.jinja` are byte-identical to HF's, but `tokenizer_config.json` is the transformers-5 slim form, which differs from HF's. The departure is named only in `fidelity.py`'s docstring, and that docstring does not mention the `tokenizer_config.json` difference.
  - **(c) organized_lib.json.** The trial generates it from KiCad 10.0.5's libraries; SchGen trained against KiCad 8. It also carries the `organized_lib_sys` fix. It is the source of every byte of the symbol context, so it changes the prompt content relative to SchGen's own setup. The table's row reads "Emitter fixes - all four", which is no longer the full list.
- **Why it matters.** The rubric classes an unrecorded departure as Important. The spec is where the owner reads what this trial does and does not reproduce. A docstring is not that place.
- **Fix.** Add rows (a), (b) and (c) to the departures table, each with why and its known effect. For (a) and (b), the effect is a token difference invisible to the fidelity check, bounded by the byte identity of `tokenizer.json` and `chat_template.jinja` to HF's; for (b), also state the `tokenizer_config.json` difference. For (c), the effect is that symbol pin geometry comes from KiCad 10.0.5, consistent with the emitter's libraries.
- **Ruling already made.** The controller ruled that (a) goes into the final fix batch. That ruling covers (a) only. (b) and (c) need the same treatment.

#### Minor

**1. get_final_python's namespace is not as narrow as the brief states.** Location: `trial/schgen_source.py:4810-4811` of the diff.

- `exec` adds the full `__builtins__`, so the namespace holds more than `re` and `Path`. The function body needs no builtin. The definition needs `str` for the annotation and `Path` for the return annotation.
- Fix: pass `{"__builtins__": {"str": str}, "re": re, "Path": Path}`, matching the narrowing `evaluate_user_message` already applies.

**2. get_final_python's source is not sha-pinned.** Location: `tests/test_prompt.py`.

- The user-message template is pinned by sha; the extractor's segment is not. An upstream edit would surface only if it changed the behaviour of one of the nine cases.
- Fix: add a sha256 constant for `ast.get_source_segment` of `get_final_python`, mirroring `test_template_bytes_pinned`.

**3. The render date is not a field.** Location: `trial/prompt.py`, the PromptRecord.

- The "Current date" is traceable only inside `text`.
- The ruling puts the render date in Task 5's manifest. A `rendered_date` field extracted from `text` would let that manifest copy it, rather than re-derive it or take the host clock, which can disagree with the container's UTC date.

**4. Approved-page data sits in the emitter image.** Location: `runtime/Dockerfile`, the line `COPY tests /trial/tests`.

- This line puts `tests/fixtures/*/page_data.json`, the approved pages' UUIDs and `(at` pairs, into the same image in which model-written programs run.
- The pairs carry no part identity, so they are not usable as a placement hint. Even so, the spec's no-leak stance reads most simply if the emitter container cannot reach the approved page's data at all.
- Fix: exclude `fixtures/*/page_data.json` from the image, for example with `.dockerignore`, and rely on the read-only bind mount the test runs already use.

**5. Symbol coverage is checked by name only.**

- `symbol_context` confirms that every requested `lib:symbol` was described. It does not confirm that the description carries pins.
- `gather_symbols_by_lib` is fail-soft: on a parse error it stores `{'name', 'error'}`. Such an entry might be "described" with no geometry.
- Fix: also refuse a described entry that has no pins.

### Assessment

**Task quality: Needs fixes.**

**Reasoning.** The fidelity check is built as asked:
- "Theirs" goes through SchGen's own `prepare_context`, the ast-extracted f-string evaluated as SchGen's node, and `modified_chat_template.txt` set as `generate.py` sets it.
- The two sides differ in template, message fill and tokenization path, so equality is not automatic.
- The control can fail.
- The extraction fails closed.
- The template is pinned.
- The extractor expectations match the source.
- The organized_lib build follows SchGen's generator, with one minimal fix.
- No silent symbol drop remains.

What is missing is the record. Three departures, including the transformers version the controller asked about, are not in the spec's departures table. The task's fidelity claim cannot be read correctly without them. Once the table carries (a), (b) and (c), this can be approved. The Minors can be parked.
