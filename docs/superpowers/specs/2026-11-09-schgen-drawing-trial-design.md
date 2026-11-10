# SchGen drawing trial: what the merged model draws for the approved Pultec boards

**Status:** approved by the owner, 2026-11-09 (*"approved"*), as revised after
the issue-24 review. Next: the implementation plan.

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

**Their chat template, applied by us, not by the server.** `training/modified_chat_template.txt`
differs from `openai/gpt-oss-20b`'s `chat_template.jinja` at the pinned base
revision only by the `{% generation %}` training markers (diffed 2026-11-09).
But vLLM's chat endpoint for gpt-oss may build the prompt its own way (the
harmony renderer) rather than from that file, and it returns reasoning and
answer as parsed fields without the `<|channel|>final<|message|>` markers their
`get_final_python` looks for. So **the trial renders the prompt itself** with
their template via `tokenizer.apply_chat_template(..., add_generation_prompt=True)`,
sends the resulting text to **`/v1/completions`**, and asks for the output with
special tokens kept. The prompt bytes are then theirs, the committed raw
response is what their extractor parses, and extraction is their
`get_final_python` unchanged. *(Agent's call.)*

**Sampling matches theirs, sent explicitly.** Their `model.generate` takes the
base checkpoint's `generation_config.json` (`do_sample: true`, nothing else set)
and so transformers' defaults: temperature 1.0, top_k 50, top_p 1.0. vLLM does
not apply transformers' top_k default, so every request sends
`temperature=1.0, top_k=50, top_p=1.0, max_tokens=13312`. Reasoning effort is
whatever their template renders by default (medium); nothing overrides it.
Attempts 1, 2, 3 carry seeds 42, 43, 44 - theirs is `torch.manual_seed(42)` -
recorded, though vLLM's sampler will not reproduce transformers' draws.
*(Agent's call.)*

| departure | why | effect, as far as known |
| --- | --- | --- |
| **Symbol selection.** Theirs asks a second model (`gpt-5.2` on Azure) to pick symbols from the library for the request, then formats them with `describe_symbol_info`. This trial **supplies the exact symbols the approved page uses**, formatted by the same `describe_symbol_info`. | no Azure GPT-5.2 here; and the parts are known exactly from the board, so a selector could only add error | favours SchGen: it cannot pick a wrong symbol. Stated so nobody reads a page as including symbol choice |
| **Inference engine.** vLLM 0.32 serving the merged bf16 weights, not transformers `generate` on MXFP4-dequantized base plus PEFT merged at load | this is the serving stack already proven (`docs/research/2026-11-09-schgen-kinference-serving.md`); the merge is verified faithful (`docs/research/2026-11-09-schgen-merge.md`) | same weights to bf16; sampling implementation differs, so samples are not bit-reproducible against theirs |
| **Context length.** `max_model_len` raised from 16384 to fit the longest prompt plus 13312 output tokens | a Pultec board's symbol context may be long; a truncated prompt or cap below theirs would handicap the model | none on content |
| **Fixes to SchGen's code - four on the emitter side, all from the 2026-10-29 trial, and two on the prompt side.** Emitter: (a) rebuilt `component_repository.json`; (b) the four-line pin-extraction fix - there a monkey-patch inside the hand-written program, here **injected by the harness** before the model's program runs, never written into it; (c) replacing the nil root-sheet UUID, without which every page renders blank while export and ERC report success; (d) skipping `get_fp()`, which always raises, so `init_project.py` does not always exit non-zero. Prompt side: (e) `organized_lib_sys` - `kicad_scan_lib` imports `sys` only under `__main__` yet `gather_symbols_by_lib` writes to `sys.stdout`, so the image's build of `export/organized_lib.json` gives the module `sys` before calling it (see the `organized_lib.json` row); (f) `pin_name_empty` - before `organized_lib.json` is saved, each pin's stored name `""` (KiCad 10.0.5's spelling of an unnamed pin) is rewritten to `"~"` (KiCad 8's), so SchGen's own `"~"` handling in `describe_symbol_info` substitutes the pin number; a pin with a real name is untouched | without (a)-(d) their emitter cannot draw these boards, and without (c) all fifteen pages would come out blank (`docs/research/2026-10-29-trial-microsoft-schgen.md` §2, §3, §4); without (e) SchGen's own generator for `organized_lib.json` raises `NameError` when called rather than run as a script; without (f), under KiCad 10.0.5's libraries every unnamed pin (6428 across the libraries, including all of `Device:R`, `Device:C`, `power:GND` and `Switch:SW_Rotary_1x6_MP`) reaches the model with an empty `pin_name` and no identifier, while the request wires those pins by number (`R1.1`) - under the KiCad 8 libraries SchGen trained on, the same pins show their numbers | (a)-(d): none on placement or connectivity. (e): none on content - the scan itself is SchGen's, unchanged. (f): the symbol context carries pin numbers for unnamed pins, as SchGen's own run under KiCad 8 would; it changes only those pin names in `organized_lib.json`, which only the prompt side reads (the emitter does not load it), and both sides of the input-fidelity check read the same fixed file, so the check confirms the prompt path, not the fix. (e) recorded during implementation of Task 4, by controller ruling; (f) made by controller ruling, Task 4 fix round 2 |
| **transformers 5.22.2, where SchGen pins 4.55.4.** The trial renders and tokenizes the prompt under the image's transformers 5.22.2 (with `jinja2==3.1.6`, SchGen's own pin). Both sides of the input-fidelity check - ours and theirs - run under 5.22.2 | the image's dependency set was locked at 5.22.2 when it was built (Task 1); SchGen's 4.55.4 was not installed alongside it | the fidelity check proves ours equals SchGen's prompt path **as run under 5.22.2**; it cannot see a difference in chat-template rendering or tokenization between transformers 4.55.4 and 5.22.2. Bounded by the tokenizer and template bytes: `tokenizer.json` and `chat_template.jinja` are byte-identical to `openai/gpt-oss-20b`'s on Hugging Face, and SchGen's `modified_chat_template.txt` is read from its pinned source. Recorded during implementation of Task 4, by controller ruling |
| **Tokenizer files from the merged model, not from `openai/gpt-oss-20b`.** Theirs calls `AutoTokenizer.from_pretrained("openai/gpt-oss-20b")`; the trial loads the merged model's copy (`tools/schgen-drawing-trial/runtime/tokenizer/`, from the bucket's `schgen-merged/`, sha256 in `SHA256SUMS`) for both sides of the check | the served model tokenizes with the merged copy; the check is run against the files the server uses | `tokenizer.json` (sha256 `0614fe83...d07d3`) and `chat_template.jinja` (`a4c9919c...c8146`) are byte-identical to Hugging Face's. `tokenizer_config.json` differs: the merged copy is the transformers-5 form (380 bytes: `tokenizer_class` `TokenizersBackend`, plus `backend`, `is_local`, `local_files_only`) where Hugging Face's (4200 bytes) has `tokenizer_class` `PreTrainedTokenizerFast`, `extra_special_tokens: {}` and an `added_tokens_decoder` table; `bos_token`, `eos_token`, `pad_token`, `model_max_length` and `clean_up_tokenization_spaces` agree. Any token difference this causes is invisible to the fidelity check, since both sides use the merged copy. Recorded during implementation of Task 4, by controller ruling |
| **`organized_lib.json` generated from KiCad 10.0.5's symbol libraries.** SchGen does not ship `export/organized_lib.json`; its README has the user generate it. The image builds it with SchGen's own `gather_symbols_by_lib` and `save_organized_lib` from the host's KiCad 10.0.5 libraries (223 libraries, 22784 symbols), with fixes (e) and (f) above. SchGen was trained against KiCad 8 | `describe_symbol_info` reads every symbol's description, bounding box and pins from it, and when the file is absent SchGen's `load_organized_lib` returns `{}` and every symbol is dropped without a word - the prompt's symbol context would be `{}`. The trial refuses a context that does not describe every requested symbol with pins | every byte of the symbol context comes from KiCad 10.0.5's definitions; a symbol whose pins or geometry changed between KiCad 8 and 10.0.5 is described as 10.0.5 has it. Consistent with the emitter, which places symbols from the same 10.0.5 libraries. **One measured content effect, fixed:** KiCad 10.0.5 writes an unnamed pin as `(name "")`, and SchGen's extractor maps only `"~"` (KiCad 8's form) to the pin number, so without fix (f) `Device:R`, `Device:C`, `power:GND` and `Switch:SW_Rotary_1x6_MP` would reach the model with every `pin_name` empty. Fix (f) restores KiCad 8's spelling so they carry their numbers (made by controller ruling, Task 4 fix round 2). Separately, and not a 10.0.5 effect, SchGen's bounding-box extraction reads only `xy` and `rectangle` nodes, so the arc-drawn `Device:L` is described with `Bounding_box: []`. Recorded during implementation of Task 4, by controller ruling |
| **Power symbols.** The approved pages use `copperhead_power:GND` and `copperhead_power:PWR_FLAG`, which are not stock libraries and which `describe_symbol_info` cannot describe. SchGen is given **stock `power:GND`**, and **no `PWR_FLAG`** | `GND` is the same symbol in the stock library SchGen resolves to anyway; `PWR_FLAG` is a page convention, not part of the circuit, so supplying it would hint at the approved page | expect an ERC `power_pin_not_driven` on every attempt, reported as an expected consequence; a ground net named differently on the page than in the model (`0` against `GND`) must not count as a difference: the comparison is of which pins share a net. The builder confirms how the existing comparator in `tests/circuits/` treats net names before reusing it (not checked while writing this) |

## The user request - the one piece of text not taken from SchGen

SchGen's user request is free text written by a person. Here it is **generated
mechanically from the board's model** - the same netlist the round-trip test
compares the approved page against: each part with its reference designator,
value and symbol, and each net with its pins, plus the board's ports as labels.

**Format, fixed across all five boards** (review, issue 24, point 1): one
section listing every part (designator, value, `library:symbol`), one listing
every net as the full set of `designator.pin` it joins with pins named as the
symbol names them, one listing the ports as global labels with their nets. No
prose, no function description, no layout or orientation words, no hand-written
text of any kind. The builder first reads SchGen's published training requests
and records how they state connectivity; where their convention can be followed
mechanically it is, and where it cannot the difference is named as a departure
(a netlist-shaped request may be off their training distribution, and that is
a cost of not hand-authoring, accepted, not hidden).

**Validated before the run, by checks that can fail:**
- **Complete and unambiguous.** Parse each generated request back into a
  netlist and compare it to the board model: every part, every pin on a net
  appears exactly once, no net is split or merged. A deliberately altered
  request (one pin moved) must fail the comparison.
- **No placement leak, by construction and by test.** The generator reads only
  the circuit model; it opens no `.kicad_sch`. A test asserts that no x/y
  coordinate, rotation, mirror value or approved-page UUID from the approved
  sheet appears in the request or in the symbol context. The symbol context
  carries library pin geometry only - `describe_symbol_info` is called with
  `library:symbol` names and reads the KiCad libraries, never a page
  (`modules/symbol_context.py:337`, read 2026-11-09).

The exact generator and the generated text for each board are committed and
shown to the owner with the first page, so he can see what SchGen was asked.

**What this evaluates, stated so it is not over-read:** drawing from a known
symbol inventory and an explicit netlist. It does not evaluate SchGen's full
workflow, which also selects symbols and infers structure from a person's
request.

## Where it runs

The serving stack from the serving spec, unchanged except `max_model_len`:
GKE Standard, one Spot g2-standard-48 (4 x L4), vLLM v0.32.0 by digest behind
Kinference, model from the bucket. Requests go **through the Kinference
gateway**. Capacity is found first with `tools/schgen-serving/probe-capacity.sh`;
the cluster exists only for the run and is torn down after. Run length is not
assumed: the preflight attempt below measures one full attempt's latency and
token count, and the batch plan is made from that.

**Requests go through the gateway on `/v1/completions`.** The serving phase
routed only `/v1/chat/completions`; the HTTPRoute gains a `/v1/completions`
rule and the builder proves it with the same marker smoke before the run. If
Kinference will not route `/v1/completions`, that is a finding, recorded, and
the run goes direct to vLLM's service, named as a departure - fidelity to
SchGen's prompt outranks the gateway. *(Agent's call.)*

**Model-written programs run in a locked-down Docker container on the
laptop** - not on the laptop's own Python: no network, a read-only SchGen tree
and KiCad symbol libraries, a writable output directory, CPU and time limits.
The container's only job is SchGen's emitter, writing a `.kicad_sch`. **The
sheet is data, so rendering, netlist export and ERC run on the host** with the
same macOS `kicad-cli` 10.0.5 that rendered the approved pages and runs the
round-trip test, so both sides of every comparison come from one renderer.
*(Agent's call.)*

## Input fidelity, checked before any sample is drawn

Review, issue 24, point 2. SchGen's prompt construction is tokenizer-only -
`prepare_context()`, the `run_raw_test()` message, `apply_chat_template` - so
it is reproduced exactly on CPU without loading a model:

1. Render the prompt token IDs two ways for one board: by the trial's own
   code, and by SchGen's code path (`config.py` and `generate.py`'s message
   construction, imported, with the symbol selector replaced by the supplied
   symbol list). They must be identical, special tokens and generation prefix
   included.
2. **Send token IDs, not text,** to `/v1/completions`, so the server cannot
   re-tokenize. Confirm with vLLM's reported `prompt_tokens` that it consumed
   the same count.
3. Record tokenizer revision, template sha256, vLLM version and image digest,
   prompt token count, and every sampling parameter sent.

Output sampling is not expected to be bit-identical to theirs; input is.

## Preflight, which is attempt 1 of the first board - not an extra sample

Review, issue 24, point 3. **The preflight is not a throwaway generation.**
A sample drawn and then discarded would be a selection the owner never sees,
which is the first anti-goal. So the preflight is attempt 1 of the first board
in the run order, and it **counts**: its page is shown like every other.

- It runs the whole chain once: request, generation, extraction, isolated
  emitter, host render, netlist export, ERC, artifact capture, manifest.
- **A tooling failure never causes a resample.** The raw response is saved
  before anything downstream runs. If the emitter, renderer, comparator or
  harness fails for a reason that is not the model's program, the tooling is
  fixed and **the downstream chain re-runs on the same saved response**. The
  fix and the re-run are recorded. Generation is never repeated for an attempt
  that already has a response.
- Failures are classified by stage: no final channel or no program extracted
  (model); program raised (model, with the original traceback kept); emitter
  or harness raised outside the model's code (tooling); blank page (tooling
  until shown otherwise). Which emitter fixes were active is recorded per
  attempt.
- Nothing in the preflight tunes prompts, sampling or presentation from what
  the page looks like.

**The comparator is proven before it is trusted.** On a known-equal case (the
approved sheet against its model) it must report equal; on deliberately altered
copies it must report each difference: a pin moved to another net, two nets
merged, a net renamed (must report *equal* - names do not count), a pin
number swapped, a pin left unconnected, and a power symbol replaced. Any case
that does not behave is a comparator defect fixed before the run.

## Provenance and resumability

Review, issue 24, point 4. `manifest.json` per attempt, committed, holding:
board, model module path and git revision, approved sheet sha256, SchGen
commit, merged-model manifest sha256, tokenizer revision, template sha256, vLLM
version and digest, prompt and raw-response sha256, seed and sampling
parameters, prompt and output tokens, `finish_reason`, emitter fixes applied,
`kicad-cli` version, outcome, failure stage.

**Resumable across Spot interruption:** an attempt whose raw response is on
disk is never regenerated; downstream stages are pure functions of the saved
response and re-run freely. The run can be killed at any point and relaunched.

## What the owner is shown, and in what order

Per board, in a fixed order: the approved page, then attempts 1, 2, 3 by
attempt number. An attempt with no page appears as a neutral card -
*"Attempt 2: no schematic generated"* - and nothing more; the stage and the
exception belong to the diagnostics that follow his verdict (review, issue 24).
**Renders go first**, before any summary (§4). One question per board: what he
makes of SchGen's attempts against the approved page.

Then, after he rules or on request, per attempt: failure stage and traceback
where there is no page; program ran or not; netlist equal to the board model or
the differences; ERC counts; output tokens; `finish_reason`.

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
| Render SchGen's template ourselves and use `/v1/completions`; direct to vLLM only if the gateway will not route it | agent | the prompt bytes and the raw response must be theirs; fidelity to SchGen outranks the gateway |
| Send transformers' sampling defaults explicitly; seeds 42, 43, 44 | agent | vLLM's defaults differ from what their `generate` used |
| Stock `power:GND`, no `PWR_FLAG` | agent | `copperhead_power` is not describable; `PWR_FLAG` is a page convention that would hint at the approved page |
| All four emitter fixes from the 2026-10-29 trial, pin fix injected by the harness | agent | without them nothing draws, or every page is blank |
| Emitter in laptop Docker; render, netlist and ERC on the host's `kicad-cli` 10.0.5 | agent | isolates model-written code; one renderer for both sides of the comparison |
| Builder check run 2026-11-09; its four questions settled as the rows above | agent | none needed the owner |
| Third-party review (issue 24, "approve with revisions") adopted: request format and validation, input-fidelity check, preflight, comparator proof, manifest and resumability, neutral failure cards, measured run length | owner supplied the review, 2026-11-09 | protects attributing a disappointing result to SchGen rather than to prompt, inference or tooling |
| Preflight is attempt 1 of the first board and counts; tooling failures re-run downstream on the saved response, never resample | agent, departing from the review's framing | a discarded preflight sample would be an unseen selection |
| Fidelity check compares against SchGen's tokenizer-only prompt path on CPU, and token IDs are sent to the server | agent, narrowing the review's ask | their prompt path loads no model, so running their full Transformers generation would add a GPU job without testing anything more about the input |
| Owner's reading of the result: no attempt produced a page | owner, 2026-11-10 | *"every image says “no schematic generated”"* |
| The question the trial serves is general-purpose usefulness; a control run on SchGen's own examples is declined | owner, 2026-11-10 | *"I don't really care if schgen works on cherry-picked or toy circuits; I want to know if it's useful as a general purpose schematic generator"* |
