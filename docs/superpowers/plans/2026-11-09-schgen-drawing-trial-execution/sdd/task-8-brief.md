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
