"""Input fidelity: the trial's prompt IDs against SchGen's own prompt path.

    check(request_text, symbols) -> {equal, ours, theirs, first_diff}

"Ours" is prompt.render(). "Theirs" follows generate.py's main() for
--test_raw, line for line, with only the model removed:

  - a tokenizer whose chat_template is set from SchGen's
    training/modified_chat_template.txt (generate.py:53-57);
  - msg_list = config.prepare_context() (generate.py:93);
  - the user message is SchGen's f-string node from run_raw_test, compiled and
    evaluated by Python with `prompt` and `symbol_context` (generate.py:95-103),
    where symbol_context is describe_symbol_info() on the request's symbols in
    place of the LLM symbol selector (generate.py:86-91);
  - tokenizer.apply_chat_template(msg_list, add_generation_prompt=True)
    (generate.py:136-140).

Two named departures, neither of which changes a token:

  tokenizer source
      generate.py loads AutoTokenizer.from_pretrained("openai/gpt-oss-20b");
      this loads the merged model's copy from runtime/tokenizer/. Its
      tokenizer.json is byte-identical to openai/gpt-oss-20b's (sha256
      0614fe83...d07d3, the LFS oid Hugging Face reports for that file).
  return_tensors
      generate.py passes return_tensors="pt" and moves the result to CUDA;
      torch is not in the image, so the IDs are taken as a list. The values
      are the same either way.

The two sides share the request, the symbol list, SchGen's prepare_context and
describe_symbol_info. They differ in the chat template (the merged model's
chat_template.jinja against SchGen's modified_chat_template.txt), in how the
user message is filled (string substitution against Python's evaluation of the
f-string), and in tokenization (text then encode, against apply_chat_template's
own tokenize path).
"""

from __future__ import annotations

import json
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import TypedDict

from trial import schgen_source
from trial.prompt import PromptError, render, schgen_modules, symbol_context, tokenizer

MODIFIED_CHAT_TEMPLATE = Path("training") / "modified_chat_template.txt"


class FidelityResult(TypedDict):
    equal: bool
    ours: int
    theirs: int
    first_diff: int | None


def theirs_ids(request_text: str, symbols: list[str]) -> list[int]:
    template_path = schgen_source.project_path() / MODIFIED_CHAT_TEMPLATE
    if not template_path.is_file():
        raise PromptError(f"{template_path} does not exist; generate.py sets it as the chat template")
    tok = tokenizer()
    saved = tok.chat_template
    try:
        with template_path.open("r", encoding="utf-8") as f:
            tok.chat_template = f.read()
        msg_list = schgen_modules().prepare_context()
        msg_list.append({"role": "user", "content": schgen_source.evaluate_user_message(
            request_text, symbol_context(symbols))})
        encoded = tok.apply_chat_template(msg_list, add_generation_prompt=True)
    finally:
        tok.chat_template = saved
    ids = encoded["input_ids"] if isinstance(encoded, Mapping) else encoded
    if not (isinstance(ids, list) and all(isinstance(i, int) for i in ids)):
        raise PromptError(f"apply_chat_template returned {type(encoded)}, not a list of token IDs")
    return ids


def first_difference(ours: list[int], theirs: list[int]) -> int | None:
    for index, (a, b) in enumerate(zip(ours, theirs)):
        if a != b:
            return index
    if len(ours) != len(theirs):
        return min(len(ours), len(theirs))
    return None


def check(request_text: str, symbols: list[str]) -> FidelityResult:
    ours = render(request_text, symbols)["ids"]
    theirs = theirs_ids(request_text, symbols)
    diff = first_difference(ours, theirs)
    return FidelityResult(equal=diff is None, ours=len(ours), theirs=len(theirs), first_diff=diff)


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        raise SystemExit("usage: python -m trial.fidelity REQUEST_JSON OUT_DIR")
    request = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    result = check(request["text"], request["symbols"])
    out_dir = Path(argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {"board": request["board"], **result}
    (out_dir / "fidelity.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    if not result["equal"]:
        raise SystemExit(f"{request['board']}: prompt IDs differ from SchGen's at token {result['first_diff']}")


if __name__ == "__main__":
    main(sys.argv[1:])
