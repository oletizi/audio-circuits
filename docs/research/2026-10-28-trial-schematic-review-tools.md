# Hands-on trial: schematic review and diff tooling

**Date:** 2026-10-28
**Question:** when an agent redraws a schematic, how does a human reviewer see what
changed between two drawings of the same circuit, and where does their verdict get
recorded?

This is a RAN trial, not a literature review. Every claim below is a command that
executed on this machine against the test case described next, or an exact error
from one that did not. Where a tool was read rather than run, it says so.

**Host:** macOS 24.6.0, arm64. KiCad 10.0.5 at
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`.
**Scratchpad root (everything installed here, nothing in the repo):**
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/review-trial/`

---

## The test case, and why it is the hard one

Two drawings of the **same circuit**, differing only in arrangement.

| | Drawing |
| --- | --- |
| **A** | algorithm-generated, from `bun tools/schgen/board-sheets.ts` → `build/schgen-boards/pultec-low-boost/` |
| **B** | hand-laid-out, from the scratchpad `lay/` project |

**Verified identical, by measurement, not assertion:**

```
A nets: 15   B nets: 15
A comps: 19  B comps: 19
NETLIST IDENTICAL: True
COMPONENTS IDENTICAL: True
A violations: 2 ['pin_not_connected', 'power_pin_not_driven']
B violations: 2 ['pin_not_connected', 'power_pin_not_driven']
```

Netlist comparison is canonicalised (nets sorted, nodes sorted) from
`kicad-cli sch export netlist --format kicadxml`; ERC from `kicad-cli sch erc`.
The scripts are `verify.py` and `baseline.sh` in the scratchpad root.

**Why this case is the right test.** Every part is in a different place and every
wire is routed differently, while connectivity is bit-for-bit the same. It is
exactly the diff a drafting review produces, and it is the case that breaks
structural differs — there is no "unchanged" region to anchor on.

**A plain `git diff` is useless here, and that is the baseline to beat:**

```
low-boost.kicad_sch | 5349 +++++++++++++++++++-------------------------
2354 insertions, 2995 deletions on one file
```

Both drawings rendered as baselines:
`images/baseline-A-2.png`, `images/baseline-B-2.png`. A is crammed into the
top-left with dashed group boxes; B is a classic left-to-right signal-flow
layout. They are plainly different drawings of plainly the same circuit.

---

## Summary table

| Tool | Installed | Ran on KiCad 10 | Usable visual diff | Reviewer comment stored | Headless |
| --- | --- | --- | --- | --- | --- |
| **KiDiff** (INTI-CMNB) | yes, with two workarounds | **yes** | **yes** — red/green superimposed PDF | **no** | **yes** |
| **kiri** (leoheck) | yes, with five workarounds | **yes** | **yes** — cyan/red overlay web UI | **no** | yes (`--no-server`) |
| **kischvidimer** (dnschneid) | yes, clean | **yes** | **weak** — target only + 379-line coordinate list | **no** (external link only) | **yes** |
| **plotkicadsch** (jnavila) | partial build | **no** | — | — | — |
| **KiCAD-Prism** | yes, with four workarounds | **yes** | **yes** — composite AND side-by-side, semantic by net | **YES — anchored to the revision pair, persisted, exportable** | partly (REST API) |

**The headline finding for this project: only Prism stores a reviewer verdict.**
The other four are viewers — they render a difference and forget it. Prism was
brought up, the test case imported, the comparison run, and a verdict written and
read back, anchored to `base=A, compare=B`. The evidence is in section 5.

---

## 1. KiDiff (INTI-CMNB) — GPL-2.0 — RAN, best result of the lightweight tools

Last commit 2026-09-21. `kicad-diff.py` version 2.6.0.

### What it took to install

Three measured failures before it ran, each with its exact error.

**(a)** Installed into a normal Python 3.14 venv, it fails at import:

```
ModuleNotFoundError: No module named 'pcbnew'
```

`kicad-diff.py` imports `pcbnew` at module top level **even for a schematic-only
diff**. `pcbnew` ships only inside KiCad.app. Fix: build the venv on KiCad's
bundled interpreter with system site-packages:

```
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3.9 \
  -m venv --system-site-packages venv-kd39
```

**(b)** `ERROR:kicad-diff.py:No eeschema_do command, install KiAuto` — KiAuto is
installed as a dependency but the check is `which()`, so the venv `bin` must be on
`PATH`.

**(c)** `FileNotFoundError: [Errno 2] No such file or directory: 'kicad-cli'` —
KiAuto's modern path shells out to `kicad-cli`. Put
`/Applications/KiCad/KiCad.app/Contents/MacOS` on `PATH`.

**Good news in (c): KiAuto no longer drives the GUI for this.** It uses
`kicad-cli`, so KiDiff is genuinely headless on macOS. The README's talk of
xdotool/X11 is stale for the schematic path.

### The command that worked

```
PATH="$PWD/venv-kd39/bin:/Applications/KiCad/KiCad.app/Contents/MacOS:$PATH" \
  ./venv-kd39/bin/python ./venv-kd39/bin/kicad-diff.py \
  --output_dir images/kidiff --output_name kidiff-A-vs-B.pdf --all_pages \
  verify/A/pultec-low-boost.kicad_sch verify/B/pultec-low-boost.kicad_sch
```

Exit clean. Only warning: `No xdg-open command` (it wanted to open a viewer).

### What the reviewer sees

**`images/kidiff/kidiff-page-2.png`** — a single-page colour-coded **overlay**:

- **red** = content present only in A
- **green** = content present only in B
- **black** = unchanged

Page 1 (`kidiff-page-1.png`) is the root sheet and renders entirely **black** —
which is the control that proves the colour scheme works: that sheet really is
unchanged.

On page 2 there is **no black at all.** Both drawings are superimposed, one wholly
red and one wholly green. That is the truthful answer for an all-moved diff.

**Would it help a reviewer judge which drawing is better?** Partly, and more than
anything else here. You can read A and B simultaneously on one page and compare
their shapes: A's six-capacitor stack jammed against the rotary switch in red,
B's spread-out ladder feeding left-to-right in green. But where the two overlap
the glyphs collide and both become hard to read, and the tool offers no way to
show one at a time. It answers "are these different" loudly and "which is better"
only by letting you squint at both at once.

### Comments / verdict

**None.** A grep of `kicad-diff.py` for comment/annotation/approve/verdict/review
returns one hit, and it is `--enable-comment-stripping` passed to `scour`. The
tool emits a PDF and stops. Whatever the reviewer concludes lives outside it.

### Practicalities

Headless: **yes**, and this is its strength — it is a one-shot CLI that emits a
PDF, which is exactly the shape an agent loop needs. 42 packages in the venv.
GPL-2.0 — note this is the most restrictive licence in the trial.

---

## 2. kiri (leoheck) — MIT, 715 stars — RAN, best interactive result

Last commit 2026-06-22. Describes itself in its own `--help` as "a proof of
concept script".

### What it took to install

kiri is a bash program that assumes a GNU userland. Five sequential failures:

```
ERROR: gsed could not be found
ERROR: gfind could not be found
```

Fixed by `brew install gnu-sed coreutils findutils grep gawk cliclick`. Also
`dos2unix: command not found` (non-fatal, printed during the run).

After that `kiri --version` reports:

```
kiri 21ff94c 2026/06/22 01h41
kicad 10.0.5
plotgitsch is not installed
kidiff 59c9f1b 2026/06/22 01h40
```

**`plotgitsch is not installed` is the important line, and kiri ran anyway.**
plotgitsch could not be built (section 3). kiri only routes through plotgitsch
when **both** revisions are legacy KiCad 5 `.sch` files — `bin/kiri` line ~1931:

> `# When both commits are .sch then use plotgitsch`
> `# Skip plotgitsch when both commits are .kicad_sch`

For `.kicad_sch` it uses its own plotting path, which on this host produced real
SVGs (≈400 KB each) via KiCad 10. So **kiri's headline dependency is dead weight
for modern KiCad, and losing it cost nothing.**

**A trap that was read, not hit:** `bin/kiri` line ~1733 selects
`plot_kicad_sch_macos` on Darwin. That script (read in full) drives the **Eeschema
GUI** with `cliclick` keystroke injection — `open -a Eeschema`, then
`cliclick kd:fn,ctrl kp:f2`, navigating the File ▸ Plot menu by keypress — and
edits `~/Library/Preferences/kicad/6.0/eeschema.json`, a **hardcoded KiCad 6.0
path that does not exist for KiCad 10**. It also needs Accessibility permission.
That path did not execute in this run, but it is one branch away and would be
fatal to an unattended agent loop.

### The command that worked

```
cd repo
kiri -g HEAD~1..HEAD --no-server --remove --output-dir <out> pultec-low-boost.kicad_pro
```

Exit 0. It built a self-contained static web UI plus per-revision SVGs. Note
`--no-server` exists, so the generation step is headless; only *viewing* wants a
browser.

### What the reviewer sees

Served over a local HTTP server and screenshotted:

- **`images/kiri-ui/shot-01-landing.png`** — "Kicad Revision Inspector": commit
  list down the left with full subject lines, page list on the right, legend
  **Newest / Oldest / Unchanged**, zoom controls, schematic/PCB view toggle.
- **`images/kiri-ui/shot-02-overlay-diff.png`** — the low-boost page: **cyan** for
  one revision, **red** for the other, **grey dashes** for unchanged (only the
  sheet frame qualifies).
- **`images/kiri-ui/shot-03-overlay-zoomed.png`** — zoomed in, and this is the
  most legible artifact produced by any tool in the trial. At this zoom you can
  read both drawings: the cyan "Junction bus" and "Stand-in group" boxes of A
  against the red SI3/SI4/SI6 strip and J2 header of B, with labels and values
  readable in both colours.

Raw per-revision renders are also usable on their own:
`images/kiri-sheetA.png`, `images/kiri-sheetB.png`.

**Would it help a reviewer judge which drawing is better?** This is the closest of
the lot. The dark background with two saturated colours separates the layers
better than KiDiff's red/green on white, the zoom is interactive, and the commit
subject lines are right there. It still shows "everything changed", but it shows
it in a form a person can actually sit with.

### A caveat this trial surfaced by accident

kiri's legend labelled `da98bb2` (rev A, the **parent**) as **Newest** and
`3ad90ee` (rev B, `HEAD`) as **Oldest** — inverted. The cause is in the test
fixture, not obviously in kiri: both commits were created by a script in the same
second and carry the **identical committer timestamp**
(`2026-10-28 13:52:04 -0700` for both), so a date-based ordering is ambiguous.

**This matters for the intended use.** An agent loop that commits a revision, then
redraws and commits again, will routinely produce same-second commits. Any review
tool that orders revisions by date rather than by parentage will mislabel which
drawing is the new one — and the reviewer's verdict would be recorded against the
wrong revision. Worth testing deliberately before adopting kiri.

### Comments / verdict

**None.** `grep -ci comment` over kiri's `assets/kiri.js` returns **0**. The web UI
is a viewer: commits, pages, zoom, colour toggle. There is no field to type in,
no persistence layer, nothing posted anywhere.

### Practicalities

Headless generation: yes. MIT. Dependency weight is the real cost: a GNU userland
on macOS, Python with wxPython in its requirements, plus two vendored submodules
(KiCad-Diff, plotkicadsch) — one of which does not build. Maintained, but the
author calls it a proof of concept and the last commit is four months old.

---

## 3. plotkicadsch / plotgitsch (jnavila) — RAN, and it CANNOT read KiCad 10

Last commit 2026-07-26. This is the engine kiri was built on, so its state matters
beyond itself.

### Install

No usable prebuilt binary: the newest GitHub release is **v0.9.0 from
2021-11-14**, and its assets are Linux `.exe` builds. Source build required.

`brew install opam`, `opam switch create plotk 5.2.0`, then **three build
failures**, each exact:

**(a)** via `opam install .`:

```
File "kicadsch/src/dune", line 10, characters 4-15:
10 |     sexp_decode
Error: Library "sexp_decode" not found.
```

The most recent upstream commit is literally *"Vendor the sexp_decode library into
this repository"*, but the vendored directory is not an opam package, so opam's
package-restricted build (`dune build -p kicadsch`) cannot see it. Building the
whole tree with plain `dune build` gets past it.

**(b)**

```
Error: Library "ppx_inline_test" not found.
```

A test-only dependency missing from the `--deps-only` set. `opam install
ppx_inline_test` fixes it.

**(c)** the one that matters:

```
File "plotkicadsch/src/plotgitsch.ml", line 58, characters 12-23:
58 |   let env = Arg.env_var ~doc:"..." "PLOTGITSCH_VIEWER" in
Error: Unbound value "Arg.env_var"
```

`Arg.env_var` was removed in **cmdliner 1.1**. `plotkicadsch.opam` declares
`"cmdliner"` with **no version constraint**, so opam installed 2.1.1 and the
source no longer compiles against it. **Upstream HEAD does not build against the
current opam universe.** Pinning `cmdliner=1.0.4` resolves that error but opam
then *removes* `git-unix`, giving:

```
Error: Library "git-unix" not found.
-> required by _build/default/plotkicadsch/src/plotgitsch.exe
```

The two constraints are mutually exclusive: the source needs cmdliner < 1.1,
`git-unix` needs ≥ 1.1. **`plotgitsch` — the git-aware differ, the part kiri
wants — was never built.**

### The decisive measurement

`plotkicadsch.exe` (the single-file plotter) *did* build, so it could be pointed
at the test case directly:

```
plotkicadsch.exe -f verify/A/low-boost.kicad_sch -o images/plotkicadsch
Fatal error: exception Failure("21:17: Decode failed for yes\n")
```

Identical failure on B. The output SVG is **0 bytes**.

Line 21 column 17 of the schematic is:

```
(in_pos_files yes)
```

a KiCad 9/10 symbol field its s-expression decoder does not know. **plotkicadsch
cannot parse a KiCad 10 schematic at all.** Not a layout limitation, not a
rendering limitation — it cannot get past the file header's symbol library.

**Conclusion: plotkicadsch is not a candidate.** Its last release predates KiCad
6, HEAD does not build, and the part that does build cannot read our files. Its
value to this trial was negative-space: it explains why kiri bypasses it.

---

## 4. kischvidimer (dnschneid / Rivos) — Apache-2.0 — RAN, cleanest install, weakest diff

Last commit **2026-10-26** — by far the most actively maintained. README states
**"Supports KiCad 7 through KiCad 10."**

### Install

The only clean one in the trial:

```
pip install ./tools/kischvidimer fonttools
```

Built and installed first try. **5 packages total** in the venv — the lightest
dependency footprint by a wide margin. Pure Python, no KiCad bindings, no GNU
userland, no OCaml, no Docker.

### What ran

**Semantic text diff:**

```
kischvidimer diff verify/A/low-boost.kicad_sch verify/B/low-boost.kicad_sch
```

Exit 1 (diff-style: non-zero means differences found). **379 lines**, categorised:

```
123  mod symbol
 70  add wire
 14  add global_label
 13  add junction
 10  mod text
  2  add symbol
  …  plus ~140 'rm wire from (x, y)' lines
```

Every line is a coordinate: `add wire from (67.31, 48.26)`,
`add symbol at (231.14, 73.66)`. **Correct, and for an all-moved diff, pure
noise.** Nothing in it tells a reviewer anything about the drawing.

**SVG diff:** `kischvidimer diff --svg` produced `images/kischvidimer/diff.svg`
(204 KB). Rendered statically to `images/kischvidimer/diff-svg.png`. The SVG
contains **416 `<animate>` elements**, so a static renderer such as
`rsvg-convert` captures one frame only — the PNG shows **version A alone**, not a
comparison. It also renders normally-hidden fields (footprint names,
`${INTERSHEET_REFS}` placeholders) as vertical magenta text, making it
substantially noisier than KiCad's own render.

**Git-revision viewer**, the headline feature:

```
kischvidimer schgen HEAD~1..HEAD pultec-low-boost.kicad_pro -o diff-view.html
```

Produced a **436 KB self-contained HTML** (`images/kischvidimer/diff-view.html`).
This genuinely works and is a nice artifact — one file, no server, emailable.

### What the reviewer sees

- **`shot-01-landing.png`** — root sheet. Page list left, "Schematic Changelist"
  panel right with **RE-ANIMATE SELECTED CHANGES** and **HIGHLIGHT ALL CHANGES**,
  a filter box, and per-change checkboxes. Title bar names both SHAs.
- **`shot-02-changelist.png`** — the circuit page. The canvas shows **version B
  only**. The sidebar is the 379-entry coordinate list, scrolling forever.
- **`shot-03-highlight-all.png`** — the decisive image. Clicking **HIGHLIGHT ALL
  CHANGES** turns **essentially the entire drawing yellow**. Every symbol, every
  wire, every label. Literally true and completely uninformative.
- **`shot-04-anim-t0.2s.png`** / **`shot-05-anim-t2.0s.png`** — the SVG clock was
  driven manually (`svg.pauseAnimations(); svg.setCurrentTime(t)`) to sample the
  animation at 0.2 s and 2.0 s. **The two frames are identical.** In its resting
  state the diff view shows only the target revision; the base/target animation
  fires only on an explicit **RE-ANIMATE** click and is not a persistent A/B
  toggle.

**Would it help a reviewer judge which drawing is better? No.** It never puts the
two drawings in front of you together. You get B, plus an assertion that all of it
changed. For a *small* edit — one part moved, one value changed — this tool would
likely be excellent, because the changelist would have three entries and the
highlight would point straight at them. For the redraw case it degenerates.

### Comments / verdict — the closest any lightweight tool gets, and it still stores nothing

The README advertises a **"Feedback URL — provide a button to click for schematic
review feedback"**. Traced through the source:

- `diffui.py:664` reads a KiCad project text variable named `feedback_url`
- `diffui.js:194`: `document.getElementById("feedbackbutton").addEventListener("click", () => { Util.openurl(DB.ui.fbUrl); })`

**It is a hyperlink.** It opens an external URL — a bug tracker, a form — in a new
tab. It captures nothing, anchors nothing to the revision, and the viewer has no
idea what the reviewer did next. It is "go file a ticket somewhere else",
configured per-project.

### Practicalities

Headless: **yes, fully** — `diff`, `diff --svg` and `schgen` are all plain CLI,
and there are documented GitLab CI and GitHub Actions integrations. Apache-2.0.
Lightest dependencies in the trial. Actively maintained.

**It is the best-engineered tool here and the worst fit for this particular
diff.** If the review loop ever moves to incremental edits rather than wholesale
redraws, it should be re-tested — it would probably win.

---

## 5. KiCAD-Prism — Apache-2.0, 303 stars — the only one that claims what we need

Last commit 2026-10-27 (one day before this trial). Latest release
**v5.2.0-alpha**, 2026-10-27.

### Why it is the interesting one

Its README is the only document in this trial that describes the mechanism this
project is actually looking for:

> "Comment on any sheet, part or area. Comments are rich text with pasted snips
> and attachments, **anchored to the revision they were written on**, and can be
> published to GitHub or GitLab issues."

and, on comparison:

> "Compare any two revisions. Design Comparison lists what changed in the
> schematic, PCB, BOM, stackup and fabrication outputs, highlights it on the
> sheet, and **keeps the review discussion next to it**."

It also has an explicit sign-off concept ("records DRC/ERC evidence and designer
and QA sign-off"). That is a reviewer verdict recorded against a revision, which
is precisely the missing piece.

### What it costs

It is not a tool, it is a **platform**: five services — `frontend` (React +
Nginx), `backend` (FastAPI), `prism-worker`, `catalog-worker`, `postgres` — plus
an optional Caddy proxy. State lives in PostgreSQL and `data/projects`.

The README states plainly: **"The supported public deployment target is Linux
AMD64. Native ARM64 release images are not currently published."** On this arm64
host every service must run under emulation (`platform: linux/amd64` is pinned in
the compose file for all six).

It imports projects from **SSH or HTTPS Git remotes**, which is a further obstacle
for a local throwaway repository.

### It was brought up, and it works

The release bundle was configured for the documented single-user evaluation mode
(`AUTH_ENABLED=false`, `DEV_GUEST_ROLE=admin`,
`PUBLIC_BASE_URL=http://127.0.0.1:8080`, generated session secret and PostgreSQL
password). All five services came up **healthy on arm64 under emulation**:

```
kicad-prism-postgres         Up (healthy)
kicad-prism-backend          Up (healthy)
kicad-prism-worker           Up (healthy)
kicad-prism-catalog-worker   Up (healthy)
kicad-prism-frontend         Up (healthy)   127.0.0.1:8080->80/tcp

{"status":"ready","release":"5.2.0-alpha","checks":{"database":"ok","projects":"ok"}}
```

Image weight: backend **1.03 GB compressed / 4.39 GB on disk**, frontend 139 MB,
postgres 424 MB.

### Four blockers, each with its exact error

**(a) Docker could not pull anything.**

```
docker: error getting credentials - err: signal: terminated, out: ``
```

`~/.docker/config.json` sets `"credsStore": "osxkeychain"`, and
`docker-credential-osxkeychain` blocks on macOS Keychain access in a
non-interactive session until it is killed. Setting `DOCKER_CONFIG` to a clean
directory was **not** sufficient — the helper is still invoked. The fix was
shadowing the helper on `PATH` with a stub returning empty credentials.

**(b)** Overriding `DOCKER_CONFIG` then breaks the compose plugin lookup —
`docker: unknown command: docker compose` — until `~/.docker/cli-plugins` is
symlinked into the override directory.

**(c) Plaintext HTTP import is refused**, and the refusal is a model one:

> *"Plaintext http:// is disabled. Use https:// or ssh://, or enable
> IMPORT_ALLOW_INSECURE_HTTP for an internal Git server without TLS."*

(`images/prism/shot-02-refusal-plaintext-http.png`.) It names what is missing,
where to fix it, and why it is not defaulted — the standard this repository holds
its own refusals to.

**(d) Prism clones shallowly, so a dumb-HTTP remote is not enough.**

```
fatal: dumb http transport does not support shallow capabilities
```

`git update-server-info` + a static file server gets as far as `git ls-remote`
and a full clone, then fails. A **smart**-HTTP server is required. Python 3.13+
removed `CGIHTTPRequestHandler`, so `smart-git-server.py` in the scratchpad does
the CGI plumbing to `git http-backend` by hand (~90 lines). After that the
container cloned cleanly and the import succeeded.

### What Prism found

`POST /api/v1/projects/{id}/design-compare` with `base=A, head=B`, polled to
completion (roughly two minutes under emulation):

```json
"readiness": {"stage": "complete",
              "domains": {"schematic":"ready","bom":"ready","pcb":"ready",
                          "stackup":"ready","fabrication":"ready"}},
"counts": {"schematic": {"added": 103, "removed": 148, "changed": 77},
           "pcb":       {"added": 0,   "removed": 0,   "changed": 0},
           "bom":       {"added": 0,   "removed": 0,   "changed": 0}}
```

**This is the single most useful number any tool in the trial produced.** The
schematic has 328 changes and the **BOM has zero**. That is precisely the
sentence a drafting review needs — *the circuit did not change, the drawing
did* — and no other tool here distinguishes the two. `shot-12-bom-zero-changes.png`
shows it in the UI: Added (0), Removed (0), Modified (0), 0 rows.

### What the reviewer sees

`images/prism/shot-10-comparison-composite.png` is the review surface:

- header **Base `da98bb289c` → Compare `3ad90eeb8f`**, with a
  *"Compare revision is branch tip"* badge
- domain tabs **Schematic (5) · PCB · BOM · Stackup · Fabrication**
- left rail **"Schematic compare (5)"** listing changes **by net name**:
  `Added 0` (`#PWR1004`, `#PWR1005`), then `Modified hi_boost_out`,
  `Modified in`, `Modified lo_boost_in`, `Modified out`.
  **Five readable items instead of kischvidimer's 379 coordinates.** The
  granularity is the net, which is a thing a reviewer can reason about.
- three view modes: **Composite · Side by side · Old / New**
- right rail: the review discussion, with a rich-text composer
  (*"Add review context… Paste a snip to attach it"*) and
  **"Download discussion (Markdown + snips)"**

`shot-11-comparison-side-by-side.png` shows the synchronised two-pane view, BASE
(A, pink) beside COMPARE (B, green), with the review thread alongside. **This is
the only tool in the trial that offers a true side-by-side**, and for an
all-moved diff side-by-side beats overlay.

**Would it help a reviewer judge which drawing is better? Yes — and it is the
only one of the five that would.** Side-by-side at matched scale, net-level
change list, BOM proven unchanged, and a box to type the verdict into.

### Comments and verdict — demonstrated, not read

A verdict was **posted and read back** through the API:

```
POST /api/v1/projects/{id}/comparison-comments
  {"baseCommit": A, "compareCommit": B, "domain": "SCH",
   "anchorKind": "comparison", "commentClass": "observation",
   "severity": "info", "selectedSide": "compare", "content": "REVIEW VERDICT: …"}
-> 200
```

The stored object is exactly the shape this project needs:

```json
"id": "c_a9654ad8", "status": "OPEN", "revision": 1, "context": "SCH",
"commentClass": "observation", "severity": "info",
"anchor": {
  "state": "pinned",
  "baseCommit":    "da98bb289c59cc11812ffc74177b5ac5f6da833f",
  "compareCommit": "3ad90eeb8fec89578ce3ef3e26375564e8073968",
  "selectedSide":  "compare",
  "designKey":     "2c47762c77432121839e2ba7943a864f418577a6d52aa4de283177d7aa5f1c94",
  "sourceRevisionKey": "522f5b699549c11419312e7f0628b114"
}
```

**The verdict is anchored to the revision PAIR, not just a commit** — and to a
`designKey` content hash, so it survives a rewrite that does not change the
design. It carries a `status` lifecycle (`OPEN`), an edit `revision` counter, and
a `severity`/`class`. It is persisted in PostgreSQL and rendered in the UI
(visible in shots 10 and 11).

`GET …/comparison-comments/report` returns a **zip containing `discussion.md`**
(saved at `images/prism/discussion.md`):

```
# trial: review discussion da98bb289c → 3ad90eeb8f
# SCH review comment `c_a9654ad8`
- **Status:** OPEN
- **Severity:** info · **Class:** observation
- **Author:** Guest User · 2026-10-28T21:46:14Z
    REVIEW VERDICT: drawing B (hand-laid-out) is preferred over drawing A …
```

**That is a commit-pinned, human-readable review record that can be committed
beside the design.**

The surrounding API is substantial — replies, reactions, edit history, pinning,
`reattach` (re-anchoring a comment when the design moves under it), and `push` to
GitHub/GitLab issues with a `tracker` link and retry. Comment classes are
constrained to `general, observation, question, task`; contexts to `PCB` or
`SCH`. Each refusal names its allowed values.

### Practicalities

Headless: **partly.** Import, compare, comment and report are all plain REST and
were driven entirely from Python here — so an agent *can* run the loop. But the
reviewing itself is the web UI, which is the point. Apache-2.0. The cost is a
five-service stack, ~5 GB of images, PostgreSQL, and no ARM64 builds. v5.2.0-**alpha**.

**One cosmetic defect observed:** the History view renders both commits as
*"-1 days ago"* (`shot-08-history.png`) — a timezone/sign bug, harmless but
visible.

---

## What this trial concludes

**1. For seeing two drawings of one circuit side by side, two tools work today,
and they work the same way:** a two-colour superimposition. **KiDiff**
(`images/kidiff/kidiff-page-2.png`, red/green, PDF, one shot, headless) and
**kiri** (`images/kiri-ui/shot-03-overlay-zoomed.png`, cyan/red, interactive,
zoomable, dark background). kiri's is more legible; KiDiff's is easier to put in
an agent loop. Neither is *good* for judging which arrangement is better — they
prove difference, they do not support judgement.

**2. The structural-diff approach loses on this case, decisively.** kischvidimer
is the best-built tool in the trial and its honest answer to "what changed" is a
379-line coordinate list and a page highlighted entirely yellow. That is not a
defect in kischvidimer; it is what a structural differ must say when everything
moved. **Any tool chosen for the redraw case must do image comparison, not
structural comparison** — or must be given a stable identity per component to
diff against, which none of these have.

**3. On the question that actually matters — recording the verdict — the
lightweight tools are all empty.** KiDiff writes a PDF. kiri writes a static web
page with zero occurrences of "comment" in its JavaScript. kischvidimer's
advertised "feedback" button is one `window.open()` call to an external URL.
**A reviewer's verdict has nowhere to go in any of them.** They solve the half of
the problem this project had already solved by rendering a PDF.

**4. Prism solves the other half, and it was demonstrated doing so**, not merely
read about. A verdict written through its API came back anchored to
`baseCommit`/`compareCommit`/`designKey`, with a status lifecycle, and exported
as a commit-pinned `discussion.md`. It is also the only tool that reported the
BOM separately and so could say *the circuit is unchanged, only the drawing moved*,
and the only one with a true side-by-side. The cost is a five-service stack,
~5 GB of emulated amd64 images, PostgreSQL, and an alpha release. Whether that
trade is worth it is a decision, not a measurement — but the mechanism exists,
works, is Apache-2.0, and its data model is now written down above.

**5. The cheap option deserves naming, because it nearly matches the tools.**
Two `kicad-cli sch export pdf` runs plus three `magick` calls produce
`images/baseline-superimposed.png` — drawing A tinted red, drawing B tinted blue,
multiplied together — and it is about as readable as kiri's and KiDiff's output
with none of the install cost. `images/baseline-side-by-side.png` is the same
two renders appended. **Before adopting any of these tools for the overlay alone,
note that the overlay is four commands.** What the tools add beyond that is
semantic grouping (Prism's net list), navigation, and — in exactly one case —
somewhere to put the verdict.

**6. A warning for the agent loop, found by accident.** Two commits created in the
same second carry identical committer timestamps, and kiri's revision ordering
mislabelled which was newer. An agent that redraws and recommits quickly will hit
this routinely. Order revisions by parentage, not by date, and verify any adopted
tool does the same — otherwise a verdict gets recorded against the wrong drawing.
Prism was unaffected: it takes `base` and `compare` explicitly.

---

## Every image produced

All paths relative to
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/review-trial/`

**Baselines (KiCad's own render of each drawing)**
- `images/baseline-A-2.png` — drawing A, algorithm-generated
- `images/baseline-B-2.png` — drawing B, hand-laid-out
- `images/baseline-A.pdf`, `images/baseline-B.pdf`
- `images/baseline-side-by-side.png` — **the four-command side-by-side**
- `images/baseline-superimposed.png` — **the four-command red/blue overlay**

**KiDiff**
- `images/kidiff/kidiff-A-vs-B.pdf` — the diff PDF as produced
- `images/kidiff/kidiff-page-1.png` — root sheet, all black (unchanged control)
- `images/kidiff/kidiff-page-2.png` — **the red/green overlay**

**kiri**
- `images/kiri-ui/shot-01-landing.png` — Revision Inspector landing
- `images/kiri-ui/shot-02-overlay-diff.png` — cyan/red overlay, whole sheet
- `images/kiri-ui/shot-03-overlay-zoomed.png` — **zoomed, most legible artifact**
- `images/kiri-sheetA.png`, `images/kiri-sheetB.png` — per-revision SVG renders
- `images/kiri/` — full generated web UI (`index.html` + per-commit SVGs)

**kischvidimer**
- `images/kischvidimer/diff-view.html` — self-contained interactive diff viewer
- `images/kischvidimer/diff.svg`, `images/kischvidimer/diff-svg.png`
- `images/kischvidimer/shot-01-landing.png` — changelist panel
- `images/kischvidimer/shot-02-changelist.png` — 379-entry coordinate list
- `images/kischvidimer/shot-03-highlight-all.png` — **whole page yellow**
- `images/kischvidimer/shot-04-anim-t0.2s.png`, `shot-05-anim-t2.0s.png` —
  identical frames, proving the resting view is target-only

**plotkicadsch**
- `images/plotkicadsch/low-boost.svg` — **0 bytes**, the parse failure

**KiCAD-Prism**
- `images/prism/shot-01-landing.png` — workspace, guest mode
- `images/prism/shot-02-refusal-plaintext-http.png` — the model refusal
- `images/prism/shot-03-refusal-git-error.png` — the shallow-clone failure
- `images/prism/shot-04-project-detected.png` — project detected, tagged SCH
- `images/prism/shot-05-imported.png`, `shot-06-project-details.png`,
  `shot-07-workspace.png`
- `images/prism/shot-08-history.png` — revisions with Base/Compare pickers
- `images/prism/shot-09-base-compare-selected.png` — "Base: revA → Compare: revB"
- `images/prism/shot-10-comparison-composite.png` — **the review surface:
  net-level change list, composite overlay, verdict thread**
- `images/prism/shot-11-comparison-side-by-side.png` — **the only true
  side-by-side in the trial**
- `images/prism/shot-12-bom-zero-changes.png` — **BOM: Added 0, Removed 0,
  Modified 0**
- `images/prism/compare-result.json` — the comparison counts as returned
- `images/prism/discussion.md` — **the exported, commit-pinned review record**

**Verification and scripts**
- `verify/A.netlist.xml`, `verify/B.netlist.xml`, `verify/A.erc.json`,
  `verify/B.erc.json`
- `verify.py`, `baseline.sh`, `setup.sh` — build the test case and prove parity
- `build-plotk*.sh`, `run-kiri*.sh`, `prism-setup.sh`, `prism-up.sh` — the builds
- `smart-git-server.py` — the smart-HTTP git server Prism's shallow clone needs
- `prism-api.py`, `prism-compare.py`, `prism-comment.py` — the API drive scripts
- `*.log` beside each — the raw build and run output quoted above
