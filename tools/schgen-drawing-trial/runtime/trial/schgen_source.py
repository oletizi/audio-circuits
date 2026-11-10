"""SchGen's user-message template and its get_final_python, taken from its source.

Neither may be retyped (the trial's global constraints), and neither module can
be imported: schematic_generation/generate.py loads gpt-oss-20b onto CUDA at
import, and schematic_generation/evaluation.py imports torch, datasets and a
model. So both are read out of the pinned source with `ast`:

  user_message_template()
      The f-string run_raw_test() passes as the user message's "content",
      returned as a template with its two fields written `{prompt}` and
      `{symbol_context}`. render_user_message() fills it the way an f-string
      fills a field with no conversion and no format spec: format(value, "").
  evaluate_user_message()
      The same f-string node compiled and evaluated with exactly the two names
      it reads. This is how fidelity.py builds "theirs", so the trial's own
      template substitution (render_user_message) is checked against Python's
      evaluation of SchGen's expression rather than against itself.
  get_final_python()
      evaluation.py's function source, executed in a namespace holding only
      `re` and `Path` (Python supplies __builtins__; the function's annotation
      `decoded: str` needs `str` at definition time).

Every extraction fails closed: a missing function, a missing or changed
message, or a field other than the two expected raises SchGenSourceError
naming the node and the file. Nothing returns an empty template or a stand-in.
"""

from __future__ import annotations

import ast
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Callable

TEMPLATE_FUNCTION = "run_raw_test"
EXTRACT_FUNCTION = "get_final_python"
TEMPLATE_FIELDS = ("prompt", "symbol_context")
FIELD_RE = re.compile(r"\{(prompt|symbol_context)\}")


class SchGenSourceError(RuntimeError):
    """A node the trial takes from SchGen's source is missing or not the expected shape."""


def project_path() -> Path:
    value = os.environ.get("PROJECT_PATH")
    if not value:
        raise SchGenSourceError(
            "PROJECT_PATH is unset; it names SchGen's checkout (/schgen in schgen-runtime), "
            "the only source the template and get_final_python are taken from"
        )
    return Path(value)


def generate_py() -> Path:
    return project_path() / "schematic_generation" / "generate.py"


def evaluation_py() -> Path:
    return project_path() / "schematic_generation" / "evaluation.py"


def _module_function(source_file: Path, name: str) -> tuple[str, ast.FunctionDef]:
    if not source_file.is_file():
        raise SchGenSourceError(f"{source_file} does not exist; {name} is taken from it")
    text = source_file.read_text(encoding="utf-8")
    tree = ast.parse(text, filename=str(source_file))
    found = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name]
    if len(found) != 1:
        raise SchGenSourceError(
            f"{source_file} has {len(found)} module-level 'def {name}', expected exactly 1; the "
            "trial takes it from SchGen's pinned source and has no copy of its own"
        )
    return text, found[0]


def _content_fstring(source_file: Path) -> ast.JoinedStr:
    _, func = _module_function(source_file, TEMPLATE_FUNCTION)
    found: list[ast.JoinedStr] = []
    for node in ast.walk(func):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
            continue
        if not (node.func.attr == "append" and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "msg_list" and len(node.args) == 1
                and isinstance(node.args[0], ast.Dict)):
            continue
        fields = {
            k.value: v for k, v in zip(node.args[0].keys, node.args[0].values)
            if isinstance(k, ast.Constant) and isinstance(k.value, str)
        }
        role = fields.get("role")
        content = fields.get("content")
        if (isinstance(role, ast.Constant) and role.value == "user"
                and isinstance(content, ast.JoinedStr)):
            found.append(content)
    if len(found) != 1:
        raise SchGenSourceError(
            f"{source_file}: {TEMPLATE_FUNCTION} has {len(found)} msg_list.append({{'role': "
            "'user', 'content': f'...'}) calls, expected exactly 1; that f-string is the user "
            "message and there is no other source for it"
        )
    return found[0]


def _template_from(node: ast.JoinedStr, source_file: Path) -> str:
    parts: list[str] = []
    names: list[str] = []
    for value in node.values:
        if isinstance(value, ast.Constant) and isinstance(value.value, str):
            if "{" in value.value or "}" in value.value:
                raise SchGenSourceError(
                    f"{source_file}: {TEMPLATE_FUNCTION}'s user message now holds a literal brace, "
                    "which would make the template's {field} markers ambiguous"
                )
            parts.append(value.value)
        elif (isinstance(value, ast.FormattedValue) and isinstance(value.value, ast.Name)
              and value.conversion == -1 and value.format_spec is None):
            names.append(value.value.id)
            parts.append("{" + value.value.id + "}")
        else:
            raise SchGenSourceError(
                f"{source_file}: {TEMPLATE_FUNCTION}'s user message has a field that is not a bare "
                f"name ({ast.dump(value)}); the trial fills only bare {TEMPLATE_FIELDS} fields"
            )
    if tuple(names) != TEMPLATE_FIELDS:
        raise SchGenSourceError(
            f"{source_file}: {TEMPLATE_FUNCTION}'s user message reads fields {names}, expected "
            f"{list(TEMPLATE_FIELDS)} in that order"
        )
    return "".join(parts)


def user_message_template(source_file: Path | None = None) -> str:
    path = source_file if source_file is not None else generate_py()
    return _template_from(_content_fstring(path), path)


def render_user_message(template: str, prompt: str, symbol_context: object) -> str:
    """Fill the template the way an f-string fills `{name}`: format(value, "")."""
    values = {"prompt": format(prompt, ""), "symbol_context": format(symbol_context, "")}
    return FIELD_RE.sub(lambda m: values[m.group(1)], template)


def evaluate_user_message(prompt: str, symbol_context: object,
                          source_file: Path | None = None) -> str:
    """Evaluate SchGen's own f-string node with exactly the two names it reads."""
    path = source_file if source_file is not None else generate_py()
    node = _content_fstring(path)
    _template_from(node, path)  # the same shape checks the template gets
    code = compile(ast.Expression(body=node), filename=str(path), mode="eval")
    result = eval(code, {"__builtins__": {}}, {"prompt": prompt, "symbol_context": symbol_context})
    if not isinstance(result, str):
        raise SchGenSourceError(f"{path}: the user message evaluated to {type(result)}, not str")
    return result


@lru_cache(maxsize=None)
def _final_python_from(source_file: Path) -> Callable[[str], str]:
    text, func = _module_function(source_file, EXTRACT_FUNCTION)
    segment = ast.get_source_segment(text, func)
    if not segment:
        raise SchGenSourceError(f"{source_file}: no source segment for def {EXTRACT_FUNCTION}")
    namespace: dict[str, object] = {"re": re, "Path": Path}
    exec(compile(segment, str(source_file), "exec"), namespace)
    extracted = namespace.get(EXTRACT_FUNCTION)
    if not callable(extracted):
        raise SchGenSourceError(f"{source_file}: def {EXTRACT_FUNCTION} did not define a function")
    return extracted


def get_final_python(decoded: str, source_file: Path | None = None) -> str:
    path = source_file if source_file is not None else evaluation_py()
    result = _final_python_from(path)(decoded)
    if not isinstance(result, str):
        raise SchGenSourceError(f"{path}: {EXTRACT_FUNCTION} returned {type(result)}, not str")
    return result
