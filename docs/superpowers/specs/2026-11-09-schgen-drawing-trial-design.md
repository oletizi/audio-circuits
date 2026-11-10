# SchGen drawing trial: what the merged model draws for the approved Pultec boards

**Status:** draft, awaiting owner review. Nothing here is built.

## Intent

The owner wants to **see what Microsoft's SchGen model actually draws** -
the faithful, full-precision merge, not the local llama.cpp reconstruction that
left him unimpressed - and decide what to do with it afterwards:

> *"I want to see what it actually draws"*
> *"I want to compare the schgen's output to those blessed schematics"*
> *"I want to see how schgen performs. I'll decide what to do once I see what it
> can actually do"*

So the deliverable is **rendered pages put in front of him**, each beside the
approved page for the same board. It is not a score, not a ranking, and not a
recommendation. This settles nothing about adoption; it gives him what he needs
to decide.

## Goals

1. For each of the five approved Pultec boards, **three SchGen attempts**, each
   either a rendered page or a recorded reason there is no page.
2. Every page shown to the owner beside that board's approved page, carrying a
   question and nothing else (`EVALUATING-DRAWINGS.md` §4). His verdicts
   recorded verbatim.
3. Checkable observations for every attempt, delivered only after he has ruled
   or on request: netlist comparison against the board model, ERC, and
   whether the program ran.
4. Everything the run produced committed: prompts, raw responses, programs,
   sheets, renders, logs.

## Non-goals

- **No base gpt-oss arm.** Owner: *"just schgen. I don't care about base
  gpt-oss."* This also retires the precision confound recorded in the serving
  spec, which existed only for a base-versus-merged comparison.
- No repair of SchGen's pages. What it drew is what he sees.
- No Kinference feature exercise beyond serving through it.
- No decision about adopting SchGen.

## Anti-goals - what would make this a failure even if it ran

- **Any selection by the agent.** Every attempt is reported; no "best of
  three", no withholding a page because the agent thinks it is poor.
  `EVALUATING-DRAWINGS.md` §3 *permits* withholding a page whose connectivity
  disagrees with the circuit; this trial **does not use that permission**,
  because a wrong drawing is exactly what the owner asked to see. Such a page
  is shown, and the netlist mismatch is among the observations given after.
- **Any verdict vocabulary from the agent** about a page (§2).
- **Driving SchGen wrong and blaming the model.** Every place this trial
  departs from how SchGen's authors run it is named below, with why.
- **Hand-written or remembered circuit content.** Every prompt is generated
  from this repository's model.

## The boards

The five pages in `drafted/pultec/` whose sheet bytes match a verdict of
*"approved"* in `docs/schematic/verdicts.md` (checked 2026-11-09 by sha256):
`pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`,
`pultec-mid`.

`transistor-preamp-staged` has a positive verdict (*"The repaired drawing looks
great"*) but not the word approved, and `verdicts.md` forbids inferring
approval, so it is **out unless the owner adds it**.

The builder re-runs the sha256 check before the run and refuses a board whose
sheet no longer matches.

## How SchGen is run, and where this departs from its authors

Read from `github.com/microsoft/SchGen` at `0707520c`, 2026-11-09.

**Their inference path is single-shot.** `schematic_generation/generate.py`
builds messages, calls `model.generate` once (`max_new_tokens=13312`, sampling
from the checkpoint's generation config), and extracts the program with
`get_final_python`. **There is no self-correction loop at inference** - the
agentic loop in the repository is in `dataset_construction/`, which builds
training data. (An earlier session's message called it a retry loop; that was
wrong.) So three attempts are three independent samples of one prompt.

**Their prompt** is `config.py::prepare_context()` (system message: the
five-primitive API and the `imu_L1.py` worked example) plus a user message whose
text is fixed in `generate.py::run_raw_test()`: the user request, then the
symbol context, then their instructions on rotation, mirror and pin locations,
and *"Limit your thinking process less than 1000 words."* This trial uses that
template verbatim.

**Their chat template matches the served one.** `training/modified_chat_template.txt`
differs from `openai/gpt-oss-20b`'s `chat_template.jinja` at the pinned base
revision only by the `{% generation %}` training markers (diffed 2026-11-09), so
vLLM applying the checkpoint's own template is their template.

| departure | why | effect, as far as known |
| --- | --- | --- |
| **Symbol selection.** Theirs asks a second model (`gpt-5.2` on Azure) to pick symbols from the library for the request, then formats them with `describe_symbol_info`. This trial **supplies the exact symbols the approved page uses**, formatted by the same `describe_symbol_info`. | no Azure GPT-5.2 here; and the parts are known exactly from the board, so a selector could only add error | favours SchGen: it cannot pick a wrong symbol. Stated so nobody reads a page as including symbol choice |
| **Inference engine.** vLLM 0.32 serving the merged bf16 weights, not transformers `generate` on MXFP4-dequantized base plus PEFT merged at load | this is the serving stack already proven (`docs/research/2026-11-09-schgen-kinference-serving.md`); the merge is verified faithful (`docs/research/2026-11-09-schgen-merge.md`) | same weights to bf16; sampling implementation differs, so samples are not bit-reproducible against theirs |
| **Context length.** `max_model_len` raised from 16384 to fit the longest prompt plus 13312 output tokens | a Pultec board's symbol context may be long; a truncated prompt or cap below theirs would handicap the model | none on content |
| **Emitter patches.** The 2026-10-29 trial needed a rebuilt `component_repository.json` and a four-line pin-extraction fix to draw `pultec-low-boost` at all | without them their emitter cannot draw these boards (`docs/research/2026-10-29-trial-microsoft-schgen.md` §2, §3) | none on placement; reused as recorded there |

## The user request - the one piece of text not taken from SchGen

SchGen's user request is free text written by a person. Here it is **generated
mechanically from the board's model** - the same netlist the round-trip test
compares the approved page against: each part with its reference designator,
value and symbol, and each net with its pins, plus the board's ports as labels.
No layout hint is given that the approved page's placement could leak through.

The exact generator and the generated text for each board are committed and
shown to the owner with the first page, so he can see what SchGen was asked.

## Where it runs

The serving stack from the serving spec, unchanged except `max_model_len`:
GKE Standard, one Spot g2-standard-48 (4 x L4), vLLM v0.32.0 by digest behind
Kinference, model from the bucket. Requests go **through the Kinference
gateway**. Capacity is found first with `tools/schgen-serving/probe-capacity.sh`;
the cluster exists only for the run and is torn down after. Fifteen requests is
a short run.

**Model-written programs run in a locked-down container**, not on the laptop:
no network, a read-only SchGen tree and KiCad libraries, a writable output
directory, CPU and time limits. Each program runs through SchGen's own
`init_project.py` path as in the 2026-10-29 trial, then `kicad-cli` exports
PNG, PDF, netlist and ERC.

## What the owner is shown, and in what order

Per board, in a fixed order: the approved page, then attempts 1, 2, 3 by
attempt number. An attempt with no page appears as a text card saying which
stage stopped it (no program extracted / program raised / blank page) with the
error verbatim. **Renders go first**, before any summary (§4). One question per
board: what he makes of SchGen's attempts against the approved page.

Then, after he rules or on request, per attempt: program ran or not; netlist
equal to the board model or the differences; ERC counts; output tokens;
`finish_reason`.

## Recorded where

- Run tooling: `tools/schgen-drawing-trial/`.
- Execution record: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/`,
  one directory per board and attempt: prompt, raw response, extracted
  program, sheet, renders, netlist, ERC, logs.
- Verdicts: `docs/schematic/verdicts.md`, verbatim, bound to each sheet's sha256.
- Findings: `docs/research/` - observations only.

## Left to the builder

Container mechanics; the request generator's code; the `max_model_len`
value (measured from the longest prompt); how pages are laid side by side for
the owner; the order boards run in.

## Decisions

| decision | who | why |
| --- | --- | --- |
| Test SchGen on drawing, not on prose or programs alone | owner, 2026-11-09 | *"I want to see what it actually draws"* |
| Compare against the approved schematics | owner, 2026-11-09 | *"I want to compare the schgen's output to those blessed schematics"* |
| No base gpt-oss arm | owner, 2026-11-09 | *"just schgen. I don't care about base gpt-oss."* |
| Purpose: see what it can do, decide later | owner, 2026-11-09 | *"I'll decide what to do once I see what it can actually do"* |
| Three attempts per board, all shown | owner, 2026-11-09 (*"yes"*) | one sample says little about a model; more is a heavier review |
| Boards: the five sha-matched approved Pultec pages; `transistor-preamp-staged` out unless added | agent | `verdicts.md` records approval only for these; it forbids inferring approval from other words |
| Show wrong-netlist pages rather than withhold them | agent | the owner asked to see what it draws; §3 permits withholding, does not require it |
| Supply exact symbols instead of the Azure GPT-5.2 selector | agent | no access to it; the parts are known; stated as favouring SchGen |
| User request generated from the model, no layout hints | agent | transcription is evidence, not memory; no leak of the approved placement |
| Serve through the Kinference gateway on the existing stack | agent | proven in the serving phase; keeps the Kinference content thread alive at no extra cost |
