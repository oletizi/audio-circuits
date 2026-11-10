## Task 8 steps 1-2 review (commit de1016b)

Verified by reading the diff and the neighbouring code, and by running `tests/test_present.py` on synthetic data (9 passed; Pillow 13.0.0 in the venv). I did not run present.py on the real execution directory and did not open any real drawing.

### Spec Compliance

- Panel order: approved first, then attempts sorted by integer number, so attempt 10 cannot sort before 2. `test_order_and_captions` covers it. Met.
- Every attempt directory gives exactly one panel. `_attempt_dirs` collects every `attempt-<n>` directory and `build_panels` makes one Panel per entry. A zero-byte file, a corrupt file and an absent file all become the card. `test_every_attempt_has_a_panel` covers empty, corrupt and absent. Met.
- Rulings: shown only when `page_produced` is true and the PNG opens; otherwise the card. A `page_produced=false` attempt with a readable PNG gets the card (tested). Met.
- Card text: `f"Attempt {n}: no schematic generated"`, asserted exactly in `test_failure_card_text_exact`. Met.
- No diagnostics: the only strings drawn are the caption and the card text. `test_no_diagnostics_in_image` asserts the strings handed to the compositor are a subset of the five allowed strings plus the cards. The outcome, stage and any traceback are never passed to the drawing code. Met, within the brief's own definition (caption strings).
- Refusals: a missing manifest.json, invalid JSON, a non-boolean `page_produced`, a missing board directory, a board with no attempts, and an unreadable approved PNG all raise `PresentRefusal` with a reason. All manifests for all boards are checked before `presentation/` is created, and a test asserts the directory does not exist afterwards. In the CLI the exception is uncaught, so it exits non-zero with a traceback. Loud. Met.
- Captions are only `approved` and `attempt N`. Met.
- Approved page rendered by render.ts, which calls `renderSheet` (kicad-cli PDF, then `magick -density 200 ... -background white -alpha remove`). This is the path the attempts use, and the file's header says it is also how the approved pages were rasterised. The magick call removes alpha onto white before present.py's `convert("RGB")`, so a transparent page cannot turn black. The approved sheet is `drafted/pultec/<board>/<board>.generated-do-not-edit.kicad_sch`, and the digest gate sits in board-info/boards.ts. Faithful as far as I can establish by reading.
- Pillow is pinned: `pillow==13.0.0` in host-requirements.txt, and the installed version matches.
- Commit message: no AI attribution (grep for claude and co-authored returns 0). The untracked `.whl` file is not in the commit.

### Strengths

- The failure path is one rule (`page_produced` and readable, else card), with no per-outcome branching that could leak an outcome name.
- Build-everything-then-write ordering, with a test.
- `_open_png` catches `OSError` and `DecompressionBombError`, so corrupt and truncated files become cards, and a handle is not left open.
- The tests are synthetic only. They include refusal cases beyond what the brief required.
- Uniform scale preserving aspect ratio; no crop and no padding that cuts the page. The whole page is pasted.

### Issues

Critical: none.

Important
- present.py:112-114 (`_panel_image`). Every page is resized to a fixed 900 px height with LANCZOS, whatever its native size. At 200 dpi a landscape sheet of A3 size is roughly 2300 px high, so I estimate about 0.4x. That is an estimate from the dpi; I did not measure a real page. Nothing is cropped, but small text and thin lines are reduced, and four panels side by side make a very wide image that a viewer will shrink again. This does not break "shown whole", but the controller should decide whether the owner is to judge a reduced rendering. Options are a larger PANEL_HEIGHT, or native scale (no resize) with a single shared scale factor.
- present.py:112-114, same lines. Height normalisation also rescales each panel independently. If an attempt's sheet has a different paper size from the approved one, the two panels end up at different scales relative to their content. The reviewer would see them as the same size when they are not. Using one common scale factor across the four panels, or captioning nothing extra and keeping native pixels, avoids this.

Minor
- present.py:68-77 (`_attempt_dirs`). Only the directories present are shown. A missing `attempt-2` (1 and 3 only) gives two attempt panels, with no refusal. A missing attempt directory is a different case from a missing manifest and is not covered by the rulings, but it would silently drop an attempt from the reviewer's view. A check that the set is exactly 1, 2, 3 would make that loud. I raise it for a ruling, not as a spec violation.
- test_present.py:79-85. `test_every_attempt_has_a_panel` asserts only that the image width is at least 400. It does not check that the card was drawn, or that a good page's panel keeps its aspect ratio. No test checks that a page's full extent is preserved (width/height ratio of the panel after composition). That is the property the brief singles out, so a test for it is worth adding.
- present.py:106 (`assert panel.card_text is not None`) is a bare assert in production code. It is unreachable in practice but is stripped under `python -O`; a refusal would be more consistent with the rest of the file.
- present.py:147-153 (`present`). `mkdir(exist_ok=True)` and `save` overwrite an earlier presentation silently. That is likely intended, but it is not recorded.

### Assessment

Task quality: Approved, with two Important points for the controller to rule on (output scale, and per-panel rescaling). Neither breaks a binding ruling as stated; both concern how much of each drawing the owner can actually see.
