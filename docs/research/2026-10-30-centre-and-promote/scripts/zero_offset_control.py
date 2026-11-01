"""The positive control for `center.py`'s zero-offset byte-identity guard.

THE GUARD IT EXERCISES. When the computed offset is zero to within the
formatter's resolution, `center.py` asserts the file it wrote is BYTE-IDENTICAL
to the file it read. That assertion is what lets the approved hi-cut page be
run through the same centring rule as the other four and shown to be unchanged
by it, rather than exempted from it by hand. An assertion that cannot fail
would make that demonstration worthless - and this one was dead on arrival once
already, because it tested `dx == 0` while an already-centred sheet gives
-7e-15.

HOW THE CONTROL WORKS. It takes an already-centred sheet and rewrites ONE BODY
coordinate with a spelling that means the same number and is a different string
- `(xy 139.7 ...)` as `(xy 139.70 ...)`. The offset is still zero, so nothing
moves; but `center.py`'s formatter normalises the spelling, so the bytes must
change and the guard must refuse. If it exits 0, the guard is decoration.

IT MUST PERTURB A BODY COORDINATE AND NOT A `lib_symbols` ONE, which is the
mistake that made the first attempt at this control useless. `lib_symbols` is
held out of the substitution and restored verbatim, so a coordinate perturbed
in there survives into the output unchanged, the bytes match, and the guard
passes - reporting a clean result for a control that tested nothing. So this
script searches AFTER the end of the `lib_symbols` block, and refuses if it
cannot find a coordinate there.

usage: zero_offset_control.py <already-centred.kicad_sch> <scratch-dir>
"""
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent


def lib_end(s):
    i = s.find("(lib_symbols")
    if i < 0:
        raise SystemExit("REFUSING: no (lib_symbols block, so body and library cannot be told apart.")
    d, j = 0, i
    while True:
        if s[j] == "(":
            d += 1
        elif s[j] == ")":
            d -= 1
            if d == 0:
                return j + 1
        j += 1


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: zero_offset_control.py <already-centred.kicad_sch> <scratch-dir>")
    src = pathlib.Path(sys.argv[1])
    work = pathlib.Path(sys.argv[2])
    work.mkdir(parents=True, exist_ok=True)
    s = src.read_text()

    after_lib = lib_end(s)
    m = re.compile(r"\(xy (-?[\d.]+) (-?[\d.]+)\)").search(s, after_lib)
    if m is None:
        raise SystemExit(
            "REFUSING: no `(xy x y)` in the sheet BODY (searched from offset %d, past the end "
            "of lib_symbols). A control that perturbs a lib_symbols coordinate tests nothing: "
            "that block is restored verbatim, so the bytes match and the guard passes."
            % after_lib)

    # Same number, different string. `139.7` -> `139.70`.
    perturbed = "(xy %s0 %s)" % (m.group(1), m.group(2))
    out = work / "zero-offset-control.kicad_sch"
    out.write_text(s[:m.start()] + perturbed + s[m.end():])
    print("control sheet  %s" % out)
    print("body coordinate at offset %d: %r -> %r" % (m.start(), m.group(0), perturbed))
    print("  same number, different bytes; the offset stays zero, so center.py's formatter")
    print("  must renormalise the spelling and the byte-identity guard must REFUSE.")
    print()

    r = subprocess.run(
        [sys.executable, str(HERE / "center.py"), str(out), str(work / "zero-offset-control-out.kicad_sch"),
         "12.0", "267.4"],
        capture_output=True, text=True)
    print("--- center.py on the perturbed sheet (exit %d) ---" % r.returncode)
    print((r.stdout + r.stderr).rstrip())
    print()
    if r.returncode == 0:
        raise SystemExit(
            "CONTROL FAILED: center.py exited 0 on a zero-offset sheet whose bytes it changed. "
            "The byte-identity guard cannot report the failure it exists to catch, so its "
            "verdict on the approved page is not evidence.")
    print("CONTROL PASSED: the guard refused, so it discriminates.")


if __name__ == "__main__":
    main()
