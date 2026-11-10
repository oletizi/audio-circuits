"""Extract an attempt's program with SchGen's own get_final_python, inside schgen-runtime.

    python -m trial.extract RESPONSE_RAW_TXT

Prints one JSON object on stdout: {"final_channel": bool, "program": str}.

get_final_python is SchGen's code, so this runs only in the container (with
--network none), never on the host; the host runner writes what it prints.

`final_channel` says whether SchGen's own final_block_re matched. When it did
not, get_final_python's fallback is the whole response, and that fallback is
still what `program` carries: the attempt is classified `no-final-channel`,
and the program is still handed to the emitter, because that is what SchGen's
own pipeline would run.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from trial import schgen_source


def extract(decoded: str) -> dict[str, object]:
    final_channel = schgen_source.final_channel_regex().search(decoded) is not None
    return {"final_channel": final_channel, "program": schgen_source.get_final_python(decoded)}


def main(argv: list[str]) -> None:
    if len(argv) != 1:
        raise SystemExit("usage: python -m trial.extract RESPONSE_RAW_TXT")
    raw = Path(argv[0])
    if not raw.is_file():
        raise SystemExit(f"{raw} does not exist: extraction reads the attempt's saved raw response")
    print(json.dumps(extract(raw.read_text(encoding="utf-8"))))


if __name__ == "__main__":
    main(sys.argv[1:])
