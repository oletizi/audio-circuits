## Task 2: The checkers return findings

**Files:** modify `lib/schgen/render/layout-check.ts`, `lib/schgen/render/text-scene.ts`, `lib/schgen/render/sheet-check.ts`, and their callers.

**`checkLayout` returns `string[]` today (`layout-check.ts:191`), mixing shorts, split nets, dangling ends, NC contact, body clearance, glyph clearance and text clearance.** A class cannot be read off a sentence. Same for `textProblems` (`text-scene.ts:182`) and `assertSheetSafe` (`sheet-check.ts:83`).

**`assertSheetSafe` already splits the two groups** — `wire safety` (shorts, dangling ends) and `body clearance` — which is the owner's line already present in the code. Preserve that split as `kind`s; do not re-derive it.

- [ ] **Step 1:** change each producer to return `readonly Finding[]`. Keep the human-readable message in `Finding.what` verbatim, so no refusal text changes.
- [ ] **Step 2:** callers keep throwing, built from the findings. **Behaviour must not change in this task** — same boards refuse, same messages.
- [ ] **Step 3: prove it.** Capture `bun tools/schgen/board-sheets.ts` before and after, filtered of the non-deterministic temp-dir line, and `diff` them. **An empty diff is the deliverable.** If it is not empty you changed behaviour; fix that rather than accepting it.
- [ ] **Step 4:** typecheck; full suite at the Task 1 total; commit.

---

