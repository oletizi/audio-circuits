"""The prompt the trial sends to the merged SchGen model, as token IDs.

    python -m trial.prompt REQUEST_JSON OUT_DIR      (inside schgen-runtime)

writes OUT_DIR/prompt.json: the PromptRecord below, plus the board name.

The messages are SchGen's, built by SchGen's code: config.prepare_context()
for the system message, and run_raw_test()'s user-message f-string (taken from
generate.py by schgen_source, never retyped) filled with the request text and
the symbol context. The symbol context is SchGen's describe_symbol_info() on
objects carrying `lib_name` and `name`, one per requested symbol; the request
supplies the symbols in place of generate.py's LLM symbol selector.

The trial's own steps are the ones SchGen leaves to the serving side: render
with the merged model's chat_template.jinja (tokenize=False, generation prompt
added), then tokenize that text with no special tokens added. fidelity.py
checks the resulting IDs against generate.py's own path.

The chat template writes "Current date: YYYY-MM-DD" from strftime_now, as
generate.py's does, so a prompt is bound to the day it was rendered (the
container's UTC date): render it once and send the saved IDs. The record
carries that date as rendered_date, read out of the rendered text.

Fail-closed points: a tokenizer file whose sha256 differs from SHA256SUMS; a
symbol describe_symbol_info() did not describe (SchGen drops those silently,
and with no export/organized_lib.json it drops all of them), or described
with no pins; a rendered text that does not end in the
generation prefix or does not carry exactly one "Current date:" line.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from functools import lru_cache
from pathlib import Path
from types import SimpleNamespace
from typing import Any, TypedDict

from trial import schgen_source

TOKENIZER_DIR = Path(__file__).resolve().parent.parent / "tokenizer"
CHAT_TEMPLATE = "chat_template.jinja"
GENERATION_PREFIX = "<|start|>assistant"
ORGANIZED_LIB = Path("export") / "organized_lib.json"
RENDERED_DATE_RE = re.compile(r"^Current date: (\d{4}-\d{2}-\d{2})$", re.M)


class PromptError(RuntimeError):
    """The prompt cannot be built as SchGen would build it."""


class PromptRecord(TypedDict):
    ids: list[int]
    text: str
    token_count: int
    template_sha256: str
    tokenizer_files_sha256: dict[str, str]
    user_message_template_sha256: str
    rendered_date: str


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@lru_cache(maxsize=None)
def tokenizer_files_sha256() -> dict[str, str]:
    sums_file = TOKENIZER_DIR / "SHA256SUMS"
    if not sums_file.is_file():
        raise PromptError(f"{sums_file} is missing; the tokenizer files are accepted only by sha256")
    expected: dict[str, str] = {}
    for line in sums_file.read_text(encoding="utf-8").splitlines():
        digest, name = line.split()
        expected[name] = digest
    for name, digest in expected.items():
        actual = _sha256(TOKENIZER_DIR / name)
        if actual != digest:
            raise PromptError(
                f"{TOKENIZER_DIR / name} has sha256 {actual}, SHA256SUMS records {digest}; these "
                "are the merged model's files from the bucket's schgen-merged/ and no other copy "
                "is the one the server tokenizes with"
            )
    if CHAT_TEMPLATE not in expected or "tokenizer.json" not in expected:
        raise PromptError(f"{sums_file} must list {CHAT_TEMPLATE} and tokenizer.json")
    return expected


@lru_cache(maxsize=None)
def tokenizer() -> Any:
    tokenizer_files_sha256()
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(str(TOKENIZER_DIR), local_files_only=True)


def chat_template() -> str:
    tokenizer_files_sha256()
    return (TOKENIZER_DIR / CHAT_TEMPLATE).read_text(encoding="utf-8")


def schgen_modules() -> SimpleNamespace:
    """SchGen's config and symbol_context modules, imported as generate.py imports them."""
    project = schgen_source.project_path()
    if not ORGANIZED_LIB.is_file():
        raise PromptError(
            f"{Path.cwd() / ORGANIZED_LIB} does not exist. SchGen's symbol_context loads it from "
            "the working directory at import and, when absent, describes no symbol at all; the "
            "image builds it at /schgen/export (fixes/build_organized_lib.py), so run from /schgen"
        )
    if str(project) not in sys.path:
        sys.path.append(str(project))
    import config
    from modules import symbol_context

    return SimpleNamespace(prepare_context=config.prepare_context,
                           describe_symbol_info=symbol_context.describe_symbol_info)


def symbol_objects(symbols: list[str]) -> list[SimpleNamespace]:
    if len(set(symbols)) != len(symbols):
        raise PromptError(f"the request lists a symbol twice: {symbols}")
    objects = []
    for lib_id in symbols:
        lib_name, sep, name = lib_id.partition(":")
        if not sep or not lib_name or not name:
            raise PromptError(f"symbol '{lib_id}' is not <library>:<name>")
        objects.append(SimpleNamespace(lib_name=lib_name, name=name))
    return objects


def symbol_context(symbols: list[str]) -> dict[str, dict[str, Any]]:
    """describe_symbol_info() on the request's symbols, refused unless it describes all of them."""
    context = schgen_modules().describe_symbol_info(symbol_objects(symbols))
    for entry in context.values():
        lib_id = f"{entry.get('lib_name')}:{entry.get('symbol_name')}"
        # An empty Bounding_box is NOT refused: SchGen's extractor builds it only
        # from `xy` and `rectangle` nodes, so an arc-drawn symbol such as Device:L
        # gets [] from SchGen's own code, and that [] is what its prompt carries.
        if "error" in entry or not entry.get("pin_info"):
            raise PromptError(
                f"SchGen's describe_symbol_info gave '{lib_id}' "
                f"{'an error entry' if 'error' in entry else 'no pins'}; the model wires a "
                "symbol from its pins, so a description without them tells it nothing usable "
                "about that part. Check export/organized_lib.json for this symbol"
            )
    described = sorted(f"{c['lib_name']}:{c['symbol_name']}" for c in context.values())
    if described != sorted(symbols):
        missing = sorted(set(symbols) - set(described))
        raise PromptError(
            f"SchGen's describe_symbol_info described {described}, not the requested {sorted(symbols)} "
            f"(missing {missing}). It drops a symbol it cannot find in export/organized_lib.json "
            "without a word, so the model would be told nothing about that part"
        )
    return context


def messages(request_text: str, symbols: list[str]) -> list[dict[str, str]]:
    msg_list = schgen_modules().prepare_context()
    content = schgen_source.render_user_message(
        schgen_source.user_message_template(), request_text, symbol_context(symbols))
    msg_list.append({"role": "user", "content": content})
    return msg_list


def render(request_text: str, symbols: list[str]) -> PromptRecord:
    tok = tokenizer()
    template = chat_template()
    text = tok.apply_chat_template(messages(request_text, symbols), tokenize=False,
                                   add_generation_prompt=True, chat_template=template)
    if not isinstance(text, str) or not text.endswith(GENERATION_PREFIX):
        raise PromptError(f"the rendered prompt does not end with {GENERATION_PREFIX!r}")
    dates = RENDERED_DATE_RE.findall(text)
    if len(dates) != 1:
        raise PromptError(
            f"the rendered prompt has {len(dates)} 'Current date: YYYY-MM-DD' lines, expected 1; the "
            "chat template writes exactly one and the record carries it as rendered_date"
        )
    ids = list(tok(text, add_special_tokens=False)["input_ids"])
    user_template = schgen_source.user_message_template()
    return PromptRecord(
        ids=ids,
        text=text,
        token_count=len(ids),
        template_sha256=hashlib.sha256(template.encode("utf-8")).hexdigest(),
        tokenizer_files_sha256=dict(tokenizer_files_sha256()),
        user_message_template_sha256=hashlib.sha256(user_template.encode("utf-8")).hexdigest(),
        rendered_date=dates[0],
    )


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        raise SystemExit("usage: python -m trial.prompt REQUEST_JSON OUT_DIR")
    request = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    for key in ("board", "text", "symbols"):
        if key not in request:
            raise PromptError(f"{argv[0]} has no '{key}'; it must be request.ts's request.json")
    record = render(request["text"], request["symbols"])
    out_dir = Path(argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {"board": request["board"], **record}
    (out_dir / "prompt.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"{request['board']}: {record['token_count']} tokens -> {out_dir / 'prompt.json'}")


if __name__ == "__main__":
    main(sys.argv[1:])
