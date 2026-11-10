"""Copy stdin to stdout unbuffered, stopping after CAP bytes.

    cap_stream.py CAP

emit.sh pipes the container's output through this into emitter.log. It is not
`head -c`, which buffers its output: run_emitter.py's ready marker then sat in
head's buffer instead of reaching the log, and emit.sh waited for a line the
container had already printed. Every chunk read here is written through at
once.
"""

import os
import sys

if len(sys.argv) != 2 or not sys.argv[1].isdigit():
    raise SystemExit("usage: cap_stream.py CAP_BYTES")

remaining = int(sys.argv[1])
while remaining > 0:
    chunk = os.read(0, min(65536, remaining))
    if not chunk:
        break
    view = memoryview(chunk)
    while view:
        written = os.write(1, view)
        view = view[written:]
    remaining -= len(chunk)
