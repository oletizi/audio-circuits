# Institutionalising the copperhead + akcli practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the drawing practice reproducible and invokable: pinned tooling that refuses on a mismatch, a `make draw` verb that owns the mechanics, and a skill that carries the judgement.

**Architecture:** Three pieces in dependency order. **Pinning first**, because the other two institutionalise a process whose tools live in a scratchpad nothing installs. **Then `make draw`**, which absorbs the per-run scripts that have been copied forward and silently mutating. **Then the skill**, which is invoked rather than remembered.

**Tech Stack:** TypeScript on Bun, `make`, Python 3 for the measurement scripts, `kicad-cli` 10.0.5, copperhead 0.12.0 (Apache-2.0), akcli-kicad 0.22.0 (MIT), ImageMagick, `qpdf`.

**Spec:** `docs/superpowers/specs/2026-10-30-institutionalise-draughting-design.md`

**Ordering note:** this plan follows `docs/superpowers/plans/2026-10-30-remove-schgen.md`. Task 9 of that plan deletes `tools/schgen/`, and Task 10 rewrites the `TOOLING.md` passages this plan extends. **Running them in the other order means doing Task 7 twice.**

## Global Constraints

- **Pinned versions, exact:** copperhead `0.12.0` at commit `476cc15965f0d1eeda70afb9e806936f6bb15c5c` (2026-10-22), upstream `github.com/copperheadhq/copperhead`; akcli-kicad `0.22.0` (protocol 2), upstream `github.com/tipoLi5890/akcli`; `kicad-cli` `10.0.5`; tsx `4.23.1` on node `v22.19.0`; bun `1.3.8`; Python `3.14.6`; ImageMagick `7.1.1-47 Q16-HDRI`.
- **copperhead is invoked with `npx tsx src/cli.ts`, not `bun`.** The bun path has never been measured.
- **Tools are resolved the way `KICAD_CLI`, `HTML_TO_PDF` and `PDF_MERGE` already are** — an overridable make variable with a per-platform candidate list behind `tools/cli/resolved-default.ts`, never a path hardcoded in TypeScript or a Makefile literal. `docs/known-gaps.md` **G170** records what a hardcoded default cost.
- **A missing or mismatched tool REFUSES by name.** A procedure that names versions it does not enforce is a transcription with a date on it.
- **Every check carries a positive control** that makes it fail.
- **Nothing in this plan withholds a drawing, scores one, or judges one.** `EVALUATING-DRAWINGS.md` §3 permits one ground for withholding — an electrical fault. The words *better, best, worse, good, bad, clean, readable, legible, clear, tidy, ugly* are forbidden about any drawing.
- **Nothing here touches `drafted/`, any approved sheet, or `docs/schematic/verdicts.md`.** Verify the five sha256s before and after.
- **Never bypass a hook.** Never `sed` for write or execute. Never `#` inside a heredoc or multi-line quoted argument — Write tool plus `git commit -F`. Never type a control-character escape into a tool parameter; build bytes with `chr()` and verify by counting.
- **No Claude/AI attribution in commits, PR text or files.** No fallbacks, no mock data outside test code.
- Commit after every task. Branch `feature/schematics-tooling`, PR #20.

---

## Task 1: The lockfile and the version check

**Files:**
- Create: `draughting/tools.lock.json`
- Create: `tools/draught/toolchain.ts`
- Test: `tests/draught/toolchain.test.ts`

**Interfaces:**
- Produces: `readLock(): Toolchain` and `checkToolchain(lock: Toolchain): ToolchainProblem[]`, where `ToolchainProblem` is `{ tool: string; wanted: string; found: string | null; how: string }` — `how` is the command that fixes it. Task 2 consumes `checkToolchain`; Task 3 consumes `readLock`.

- [ ] **Step 1: Write the lockfile**

```json
{
  "copperhead": { "version": "0.12.0", "commit": "476cc15965f0d1eeda70afb9e806936f6bb15c5c",
    "upstream": "https://github.com/copperheadhq/copperhead", "licence": "Apache-2.0",
    "probe": ["npx", "tsx", "src/cli.ts", "--version"] },
  "akcli": { "version": "0.22.0", "pypi": "akcli-kicad==0.22.0",
    "upstream": "https://github.com/tipoLi5890/akcli", "licence": "MIT",
    "probe": ["akcli", "--version"] },
  "kicad-cli": { "version": "10.0.5", "probe": ["kicad-cli", "--version"] },
  "magick": { "version": "7.1.1-47", "probe": ["magick", "--version"] },
  "qpdf": { "version": "any", "probe": ["qpdf", "--version"] }
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/draught/toolchain.test.ts
import { expect, test } from "bun:test"
import { checkToolchain, readLock } from "../../tools/draught/toolchain.ts"

test("a tool whose found version differs from the lock is reported, with the fix", () => {
  const lock = { ...readLock(), akcli: { ...readLock().akcli, version: "0.0.1" } }
  const problems = checkToolchain(lock)
  const akcli = problems.find((p) => p.tool === "akcli")
  expect(akcli).toBeDefined()
  expect(akcli?.wanted).toBe("0.0.1")
  expect(akcli?.how).toContain("akcli-kicad==0.0.1")
})

test("an absent tool is reported with found null, not as a version mismatch", () => {
  const lock = { ...readLock(), nosuchtool: { version: "1", probe: ["definitely-not-a-tool", "--version"] } }
  expect(checkToolchain(lock).find((p) => p.tool === "nosuchtool")?.found).toBeNull()
})
```

The first test **is** the positive control: it perturbs the lock and requires a report.

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test tests/draught/toolchain.test.ts`
Expected: FAIL, `Cannot find module`.

- [ ] **Step 4: Implement `toolchain.ts`**

`readLock` reads and validates the JSON, throwing naming the file and the missing field. `checkToolchain` runs each `probe`, extracts a version, and returns one problem per disagreement. `"any"` means presence only. **A probe that cannot run is `found: null`, never a thrown error** — the caller decides what to do about a missing tool.

- [ ] **Step 5: Run it and watch it pass; run `bun run typecheck`**

- [ ] **Step 6: Commit**

---

## Task 2: `make draught-doctor` — the verb that refuses

**Files:**
- Create: `tools/cli/draught.ts`
- Modify: `make/perfboard.mk` (or whichever file `make help` lists top-level verbs from — **check first**)
- Test: `tests/draught/doctor.test.ts`

**Interfaces:**
- Consumes: `checkToolchain`, `readLock` (Task 1).
- Produces: the `draught-doctor` make target, exit 0 when the toolchain matches and **non-zero naming every disagreement** otherwise.

- [ ] **Step 1: Write the failing test**

```ts
test("the report names the tool, what is wanted, what was found and how to fix it", () => {
  const text = renderToolchainReport([
    { tool: "akcli", wanted: "0.22.0", found: "0.21.0", how: "pip install 'akcli-kicad==0.22.0'" },
  ])
  expect(text).toContain("akcli")
  expect(text).toContain("0.22.0")
  expect(text).toContain("0.21.0")
  expect(text).toContain("pip install 'akcli-kicad==0.22.0'")
})

test("an empty problem list renders a line saying the toolchain matches, not an empty string", () => {
  expect(renderToolchainReport([]).trim()).not.toBe("")
})
```

The second test matters: a silent success is indistinguishable from a skipped check.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Implement `renderToolchainReport` and the CLI; run `akcli doctor` first and include its output**

- [ ] **Step 4: Wire the make target; run `make draught-doctor`**

- [ ] **Step 5: Prove the refusal — the control**

Temporarily edit the lock to want a version you do not have, run `make draught-doctor`, confirm non-zero and the name in the output, then revert.

- [ ] **Step 6: Commit**

---

## Task 3: The install script

**Files:**
- Create: `draughting/install.sh`
- Modify: `README.md` prerequisites section
- Test: `tests/draught/install-script.test.ts`

- [ ] **Step 1: Write the failing test — the script's claims match the lock**

```ts
test("the install script pins exactly the versions the lockfile names", () => {
  const script = readFileSync("draughting/install.sh", "utf8")
  const lock = readLock()
  expect(script).toContain(lock.copperhead.commit)
  expect(script).toContain(lock.akcli.pypi)
})
```

This is the guard against the script and the lock drifting apart, which is the failure mode that makes a lockfile decorative.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Write `install.sh`**

Clone copperhead, check out the pinned commit, `npm install`. Create the akcli venv and `pip install` the pinned version. Run `akcli doctor`. **Refuse by name on any failure; no fallback to a different version.** Write it with the Write tool — it contains `#` comments and must not go through a heredoc.

- [ ] **Step 4: Run the script into a scratch location and confirm `make draught-doctor` then passes**

- [ ] **Step 5: Record the accepted risk in `TOOLING.md`**

An install script depends on upstream staying available. That is the trade taken over vendoring, and it is written down.

- [ ] **Step 6: Commit**

---

## Task 4: Promote the measurement scripts to one home

**Files:**
- Create: `draughting/measure/` holding the scripts that survived scrutiny
- Move: `docs/research/lib/kicad_sheet.py` and `selftest.py`; `junction_audit.py`, `framegeom.py`, `center.py`, the crossing and label surveys, `netcmp`, `crop.py` — **from whichever run directory holds the corrected copy, which is not always the newest**
- Test: `tests/draught/measure-suite.test.ts`

- [ ] **Step 1: Identify the corrected copy of each script**

`docs/research/2026-10-30-lying-checks.md` lists what was fixed and where. **`orphan_junctions.py` is deleted and does not return.** For any script with two copies, diff them and take the one with the control.

- [ ] **Step 2: Write the failing test**

```ts
test("the measurement suite's own selftest reports every control moved or fired", () => {
  const out = execFileSync("python3", ["draughting/measure/selftest.py"], { encoding: "utf8" })
  expect(out).toContain("every one moved or fired")
  expect(out).toMatch(/\d+ controls/)
})
```

- [ ] **Step 3: Run it and watch it fail**

- [ ] **Step 4: Move the scripts, fix their imports, run the selftest**

Expected: the ten controls that pass today still pass.

- [ ] **Step 5: Leave the run directories' copies alone**

They are the execution record of runs already approved. **Do not delete them and do not rewrite their findings documents** — but add one line to each run's findings naming the promoted home, so the next reader copies from there.

- [ ] **Step 6: Commit**

---

## Task 5: `make draw BOARD=<board>`

**Files:**
- Create: `tools/cli/draw.ts`
- Modify: `make/perfboard.mk`
- Test: `tests/draught/draw.test.ts`

**Interfaces:**
- Consumes: `readLock`, `checkToolchain` (Task 1); the promoted scripts (Task 4).
- Produces: the `draw` make target.

- [ ] **Step 1: Write the failing test — the verb refuses before it draws when the toolchain is wrong**

```ts
test("draw refuses with the toolchain report when a pinned tool is missing", async () => {
  const result = await runDraw({ board: "pultec-hi-cut", lock: lockWantingAMissingTool() })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain("definitely-not-a-tool")
  expect(result.drew).toBe(false)
})
```

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Implement the verb**

Order: check the toolchain; resolve the intent (take a committed one, or refuse naming the board — **this plan does not derive an intent from a `Network`**, see the spec's open questions); verify the intent's net partition against the model; draft with copperhead; render; run the measurement suite; write the crops.

**It never withholds a page.** If a check reports something, the page is still written and the finding is printed beside it.

- [ ] **Step 4: Run `make draw BOARD=pultec-hi-cut` and compare against the committed page**

The sheet it produces should match `drafted/pultec/pultec-hi-cut/`'s byte for byte, or the difference should be explainable and explained. **Do not overwrite anything in `drafted/`** — write to `build/`.

- [ ] **Step 5: Verify the five drafted digests; run `make check` and `bun test`; commit**

---

## Task 6: The skill

**Files:**
- Create: `.claude/skills/drawing-a-schematic/SKILL.md`
- Modify: `README.md` (the governing-documents table)

- [ ] **Step 1: Write the skill**

Frontmatter `name` and `description` that make it fire when the task is drawing or revising a schematic. Body:

- the loop's steps, and that **a repair of an existing page skips the draft step**
- `make draught-doctor` first, `make draw BOARD=x` for the mechanics
- the trap index: `--apply` is not optional and its absence is silent; `akcli pins` mixes units; a field renders horizontally when `(rotation + angle) mod 180 == 0`; a global label's tag is a shape KiCad draws the wire through; a sheet holds wires, symbols and pins in **two textual forms**
- the false greens: `kicad-cli sch export netlist` exits 0 on a paren-broken sheet; Chrome exits 0 when it prints nothing; `qpdf` exits 3 on success with warnings; `akcli check --layout` has been wrong in **both** directions
- the verification table
- **the ordering rule: renders go out to the reviewer before any summary**; an agent that cannot send files lists its render paths at the top of its hand-back
- **a pointer to `EVALUATING-DRAWINGS.md` for the criteria, which the skill must not restate and must never author**

**Do not restate the criteria.** Point at them.

- [ ] **Step 2: Check it against `TOOLING.md` for contradictions**

Any disagreement is a bug in one of them. `TOOLING.md` stays the reference; the skill is the invocation.

- [ ] **Step 3: Add it to the README's governing-documents table**

- [ ] **Step 4: Commit**

---

## Task 7: Point `TOOLING.md` at the new machinery

**Files:**
- Modify: `TOOLING.md`

- [ ] **Step 1: Replace the manual toolchain table with the lockfile as the authority**

The table becomes a pointer to `draughting/tools.lock.json` and `make draught-doctor`. **The "NEITHER TOOL IS PINNED IN THIS REPOSITORY, AND THAT IS A STANDING RISK" section is struck and replaced** — show it struck rather than deleting it, because what it produced is the argument for the change.

- [ ] **Step 2: Replace the per-run script instructions with the promoted home**

- [ ] **Step 3: Add the skill and `make draw` to the loop's steps**

- [ ] **Step 4: Verify byte-counts, confirm no `drafted/` sheet changed, commit**

---

## Self-review

**Spec coverage.** §1 pinning → Tasks 1, 2, 3. §2 `make draw` and promoted scripts → Tasks 4, 5. §3 the skill → Task 6. The spec's "kept thin" decision → the skill is one file pointing at `TOOLING.md`, with no ledger, manifest or gate. The accepted upstream risk → Task 3 Step 5 writes it down. The two open questions — intent derivation and arrangement method — are **explicitly out of scope** in Task 5 Step 3 and in the skill's text.

**Type consistency.** `ToolchainProblem { tool, wanted, found, how }` is produced in Task 1 and consumed by `renderToolchainReport` in Task 2 and `runDraw` in Task 5. `readLock()` returns the same shape the lockfile declares and Task 3 asserts the script matches it.

**Known soft spots.** Task 2 Step 1 names `make/perfboard.mk` as the home for a top-level verb — **confirm where `make help` actually lists them before editing.** Task 4 Step 1 requires judgement about which copy of a duplicated script is the corrected one; the diff plus the presence of a control is the test, and the findings document records the choice.
