### Task 1: Byte-identical data, licences, record picture, open-items skeleton, verify script

**Files:**
- Create: the four files under `circuits/h7-platform/`, `docs/h7-platform/layout-B.svg`, `docs/h7-platform/open-items.md`, `.../port-execution/verify.sh`

**Interfaces:**
- Produces: `verify.sh` with the checks `bytes`, `nocode`, `provenance`, `effective` and `stale-json`; the `open-items.md` table with the columns `Id | Item | Board / domain | Status | Evidence that closes it | Phase that must close it | Source`; the `### Conflict:` section heading `## Conflicts`.

- [ ] **Step 1: Write `verify.sh` with three checks.**
  - **`bytes`:** for each pair below, `git -C "$PEDALS_REPO" show 5b926d0:<src> | shasum -a 256` must equal `shasum -a 256 < <dst>`.
    - `h7-platform/module-interface.json` → `circuits/h7-platform/module-interface.json`
    - `h7-platform/interface-analysis/results.json` → `circuits/h7-platform/interface-analysis-results.json`
    - `h7-platform/LICENSE-OSCAR` → `circuits/h7-platform/LICENSE-OSCAR`
    - `h7-platform/LICENSE-APACHE-2.0` → `circuits/h7-platform/LICENSE-APACHE-2.0`
    - `h7-platform/interface-analysis/layouts/layout-B.svg` → `docs/h7-platform/layout-B.svg`
  - **`nocode`:**
    - Fails on any file under `docs/h7-platform` or `circuits/h7-platform` that is not `*.md`, `*.json`, `*.svg` or `LICENSE-*`. This file-type rule applies to every file there.
    - Fails on any match of `pnpm |PartSpec|BlockSpec|sheetKit|blocksOn` in those trees, **excluding the five byte-identical records**.
  - **`provenance`:** fails on any `*.md` under `docs/h7-platform/` that lacks the pinned link prefix.
  - **`effective`:**
    - Every line in a `*.md` under `docs/h7-platform/` and `docs/standards/` that matches `9[–-]12 V` or `179 Hz` must begin with `*Not in force:*`. One exception: the README's stale-record warning (Task 12), which names those values by quoting the records. A line that starts with `*Superseded in the records:*` is also accepted.
    - The JSON and the other records are not scanned.
  - **`stale-json`:** informational. It prints every line of the two JSON records that matches `9[–-]12 V` or `179 Hz`, with its line number. It FAILs only if the README lacks the stale-record warning, which Task 12 adds. Until then, it is invoked only in Task 12 onward. This keeps the list of stale statements in a tool that re-derives it, not in prose.
- [ ] **Step 2: Run `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash .../verify.sh bytes`.** Expected: `FAIL bytes` (the files are missing). Then run it with `PEDALS_REPO` unset. Expected: a refusal naming `PEDALS_REPO`. Then run `verify.sh no-such-check`. Expected: `FAIL no-such-check: unknown check`.
- [ ] **Step 3: Copy the five files.** Use `git -C "$PEDALS_REPO" show 5b926d0:<src> > <dst>`, so nothing passes through an editor. Write `open-items.md`:
  - a `Ported from:` line;
  - one paragraph stating that every figure is paper analysis of an unbuilt board and that no row is a closure;
  - the empty table;
  - an empty `## Conflicts` section.
- [ ] **Step 4: Run `verify.sh bytes nocode provenance effective`.** Expected: four PASS lines. In particular, `nocode` passes with the pinned `results.json` (and its `pnpm hotplug-sweep`) in place.
- [ ] **Step 5: Commit and push** with the message "h7-platform port: byte-identical contract, results, licences and layout-B record; verify script".

