SchGen drawing trial: five approved Pultec boards, three attempts each
=====================================================================

**Observations only.** This document says what Microsoft SchGen produced when it
was asked to draw five boards this repository already has approved pages for.
It carries no verdict on any drawing - there were none to judge - and the
decision taken on the result is the owner's, recorded verbatim in
`docs/known-gaps.md` **G310**.

- Spec, with every departure from SchGen's authors stated:
  `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`
- Execution record (per-attempt prompt, raw response, extracted program, emitter
  log, manifest; serving records; presentation images):
  `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/`
- Run tooling: `tools/schgen-drawing-trial/`
- Serving: `docs/research/2026-11-09-schgen-kinference-serving.md`; the merged
  weights: `docs/research/2026-11-09-schgen-merge.md`

## What was run

- **Model:** `microsoft/SchGen` merged into `openai/gpt-oss-20b` at bf16 (merge
  verified against PEFT's own `merge_and_unload`), served by vLLM 0.32.0 at
  tensor parallel 4 on one Spot `g2-standard-48` (4x L4) in GKE `asia-east1-b`,
  routed through Kinference 0.1.0-alpha.7. Every US, Canada and Europe zone
  was out of L4 capacity when probed.
- **Boards:** `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`,
  `pultec-low-cut`, `pultec-mid` - the five whose approved pages are
  sha-matched in `docs/schematic/verdicts.md`.
- **Attempts:** three per board, seeds 42, 43, 44, at SchGen's shipped sampling
  settings (temperature 1.0, top_k 50, top_p 1.0), up to 13312 output tokens.
  All fifteen are shown; none was discarded or selected.
- **Prompt:** SchGen's own template and symbol formatting, with the exact
  symbols each approved page uses supplied in place of SchGen's GPT-5.2
  selector. The user request was generated from the board model, with no layout
  hints.
- **Emitter:** SchGen's own `kicad_sch_interface`, with the four fixes from the
  2026-10-29 trial, run sealed in a Docker container with no network.

## Checks that make the result attributable to the model

- **Input fidelity.** For every board the prompt sent was compared token for
  token against SchGen's own prompt path, and was equal.
- **Token identity.** For every attempt the server's echoed prompt token IDs
  equal the IDs sent, and the program was extracted from a decode of the
  returned token IDs, as SchGen's `generate.py` does.
- **Completeness.** Every accepted response ended with `finish_reason` `stop`.
  One response truncated by a Spot reclaim (`pultec-low-boost` attempt 1,
  `finish_reason` `abort`) was quarantined, not shown, and regenerated on a
  re-provisioned cluster; that quarantined response had produced a page, and
  the regenerated one did not. The quarantine and both serving records are in
  the execution record.

## Result

**0 of 15 attempts produced a page.** Every attempt's model-written program
raised in the emitter before a sheet was written.

| board | attempt 1 (seed 42) | attempt 2 (seed 43) | attempt 3 (seed 44) |
| --- | --- | --- | --- |
| hi-boost | `ValueError: Symbol C8 not found` | `SyntaxError: unterminated string literal` | `RuntimeError: Cannot find import line` |
| hi-cut | `SyntaxError: invalid character '‑' (U+2011)` | `ValueError: Symbol SI6 not found` | `RuntimeError: Cannot find import line` |
| low-boost | `ValueError: Pin G not found in symbol SW1` | `RuntimeError: Cannot find import line` | `SyntaxError: invalid syntax` |
| low-cut | `RuntimeError: Cannot find import line` | `RuntimeError: Cannot find import line` | `SyntaxError: invalid character '“' (U+201C)` |
| mid | `SyntaxError: invalid character '‑' (U+2011)` | `ValueError: Symbol L6 not found` | `TypeError: add_schematic_symbol() got an unexpected keyword argument 'symbol_lib_version'` |

Output length was 3315 to 9139 tokens; generation took 36 to 96 s per attempt.

## The three kinds of failure

**No program (5 of 15)** - `Cannot find import line`. SchGen takes the first
`final` channel as the program, and in these five it was prose. In three of
them (hi-boost 3, hi-cut 3, low-cut 1) a second `final` channel follows; in
two (low-boost 2, low-cut 2) the response contains no SchGen program at all.
SchGen's own `init_project.py` raises the same error on the same input, so this
is its behaviour, not the harness's.

**Not valid Python (5 of 15).** Two non-breaking hyphens (U+2011), one curly
quote (U+201C) in code, one unterminated string, one other syntax error.

**Ran, then called something absent (5 of 15).**

- `C8` (hi-boost 1) and `SI6` (hi-cut 2) are in the request; the program wires
  them without ever placing them.
- `L6` (mid 2) is **not** in the request; the program places nothing by that
  name and wires to it six times.
- `SW1` pin `G` (low-boost 1): the rotary switch symbol's pins are numbered, and
  the program used a name the symbol does not have.
- `symbol_lib_version` (mid 3) is not an argument SchGen's own
  `add_schematic_symbol` accepts.

## What this does not establish

- **Nothing about page quality**: no page was produced, so there was nothing to
  compare with the approved pages.
- **Nothing about simpler or SchGen's own example circuits.** A control run on
  those was declined by the owner as not answering his question (G310).
- **Whether glue would produce pages** - first `final` channel with code,
  typographic characters normalised, lower temperature. Declined (G310).
- **The KiCad 10.0.5 symbol context.** SchGen was trained against KiCad 8; the
  symbol descriptions come from KiCad 10.0.5's libraries, with the one measured
  difference (unnamed pins) fixed. Any other effect of that difference is not
  measured.
