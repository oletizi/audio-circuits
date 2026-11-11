### Task 12: README: source map, provenance index, licences

**Files:** Create `docs/h7-platform/README.md`. Modify `verify.sh` (add `readme`).

- [ ] **Step 1: Add the `readme` check.** It holds the list of platform source paths from spec Goal 4:
  - every path from `git -C "$PEDALS_REPO" ls-tree -r --name-only 5b926d0 h7-platform`, collapsed to the directory for `boards/v1/`, `circuit/`, `mechanical/`, `vendor/`, `symbols/`, `footprints/`, `pintables/`, `generated/` and `interface-analysis/sources/`;
  - the two platform specs, the two research documents, the fab rules, and the three rulings ledgers.

  The check fails unless each listed path appears in `README.md`, a `## Provenance index` section exists with three `Trace:` entries, and `unresolved` appears on a line mentioning `OSCAR_AUDIO_01`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write `README.md`.**
  - What the platform is: two short paragraphs, linking `architecture.md`.
  - The document list.
  - The source map: each source path leads to its new home, or to "stayed behind" with a one-clause reason taken from the spec's non-goals.
  - The provenance index:
    - aliases (`spec` meaning the split spec, unless a citation names the 2026-09-30 spec; `PW` = `POWER.md`; `AN` = `ANALOG.md`; `CB` = `CORE-BRIEF.md`; and every other alias found in the two JSON files, which you find by reading their `source` strings);
    - id prefixes (`O-`, `RR-`, `R-`, `D-A-` … `D-D-`, `OWN-`, `D<n>`, `BU-`, `BL-`, `R-PF-`);
    - relative roots (`vendor/st-pin-data/`, `interface-analysis/`, `sources/`), each mapped to a pinned path.

    It states that these strings are historical provenance, not local paths.
  - Three traces, each resolved hop by hop to a pinned line:
    - a VREF_A rail limit in `module-interface.json`;
    - an R-57 amendment;
    - an `mcu.*.pinData` path.
  - Licences: which circuitry each file covers, and that OSCAR_AUDIO_01's licence statement is unresolved upstream.
  - **The stale-record warning**, a `## Superseded statements in the records` section. It says:
    - the byte-identical records keep superseded statements unedited;
    - which values are superseded (at least 9–12 V Seed benches and 179 Hz), each on a line beginning `*Superseded in the records:*` with a link to its effective constraint;
    - `verify.sh stale-json` lists where they occur.

    No line numbers go in prose, because the tool re-derives them.
- [ ] **Step 4: Run `verify.sh`** (all checks, including `stale-json`). Expected: every line PASS. `stale-json` also prints the stale locations, among them `module-interface.json` lines 355 and 405.
- [ ] **Step 5: Commit and push.**

