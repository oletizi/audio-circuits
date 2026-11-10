Re-review of 3775443 (Task 8 fix round 1). Read-only; ran tools/schgen-drawing-trial/tests/test_present.py once via .venv: 15 passed. present.py was not run on any real directory.

1. No resize, top-aligned, card sized to approved page: Fixed.
   - present.py:120-123 returns panel.image untouched; the PANEL_HEIGHT/CARD_WIDTH constants and the LANCZOS resize are gone. layout() (134-144) puts every box at top=GUTTER with the image's own size. Cards use the approved page's size (126, 141, 152). compose() pastes at those boxes (158-159).
   - Test: test_native_pixels_survive_composition (test_present.py:131-152) crops each page region from the saved PNG and compares tobytes() with the source, using mixed sizes (500x700, 900x300). Any resize or misplaced paste fails it, so it can fail. Weaker parts: the card panel is checked for size only, not its pixels, and the same-top assertion reads layout() rather than the composed image.

2. Exactly attempt-1, 2, 3: Fixed.
   - present.py:79-82 refuses any set other than [1, 2, 3]. The zero-attempt refusal at 77-78 stays ahead of it.
   - Test: test_refuses_anything_but_three_attempts (test_present.py:154-160) covers [1,2], [1,3], [1,2,3,4], [2,3,4] and matches "exactly attempt-1". It can fail. [1,2,3,4] is the case that distinguishes this from a minimum-count check.

3. Bare assert replaced by PresentRefusal: Fixed in code, no test.
   - present.py:124-125 raises PresentRefusal, and no `assert` remains in present.py (grep is empty). No test reaches it: build_panels always sets card text when image is None, so the branch is only reachable by constructing a Panel by hand. A test would only pass a hand-built Panel(…, None, None) to compose(). The test for this fix cannot fail because it does not exist. Low severity.

4. Existing presentation/ refused unless --replace: Fixed.
   - present.py:169-171 checks before build_panels and before any write. main() parses --replace (193-196) and passes it through (200).
   - Test: test_refuses_existing_presentation_unless_replace (test_present.py:163-170) runs once, expects a refusal matching "--replace" on the second run, then expects success with replace=True. It can fail.

New issues (all minor, none blocking):
- --replace does not clear presentation/, so a file left by an earlier run for a board no longer in the list survives. It overwrites only the boards it writes.
- The refusal test does not assert that the refused run left the existing files untouched. The code order guarantees it.
- A produced attempt whose page.png is missing or unreadable still becomes a "no schematic generated" card (present.py:110-111). This is existing behaviour, not part of this round.

Verdict: All addressed. The only gap is that fix 3 has no test.
