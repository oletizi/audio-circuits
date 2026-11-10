Task 8 steps 1-2: present.py and tests.

RED: test_present.py failed at collection (ModuleNotFoundError: present). GREEN: full host suite, 69 passed.
Files: tools/schgen-drawing-trial/present.py, tests/test_present.py, host-requirements.txt (pillow==13.0.0, installed in .venv).
CLI: tools/schgen-drawing-trial/.venv/bin/python tools/schgen-drawing-trial/present.py EXEC_DIR
Approved PNGs are not committed under drafted/ (only .kicad_sch and .svg), so the CLI renders each approved sheet with render.ts (renderSheet path) into a temp dir. Not run on the real exec dir.
