"""The FLGPROBE rewrite both PWR_FLAG probes share: `flag_probe.py` (one sheet) and
`hierarchy_flag_probe.py` (the root and every sheet it names). One copy, so a fix to how a flag's
reference is found or rewritten lands in both (H7 module plan, final review M6).

kicad-cli's netlist export leaves out every symbol whose reference starts with `#`, and every placed
PWR_FLAG here carries one, so a probe copy renames each flag FLGPROBE<k> for the export to list it.
The reference is rewritten only inside each flag's own symbol node, found through
`draughting/measure/kicad_sheet.py`'s parser by the caller, never by a line pattern.
"""

PREFIX = "FLGPROBE"


def refuse_if_probed(text, where, tool):
    """Exit when the sheet already carries a probe reference, which would then not be unique."""
    if PREFIX in text:
        raise SystemExit(f"{tool}: {where} already contains {PREFIX}; a probe reference would not be unique")


def rewrite_flags(text, flags, first, where, tool):
    """Rename each flag in `flags` (kicad_sheet symbols, in the order given) FLGPROBE<first>,
    FLGPROBE<first + 1>, ... inside its own node. Returns the new text and, per flag, the pair
    (probe reference, real reference). Exits naming the flag when one has no reference, or does not
    carry it as a quoted string inside its node."""
    edits = []
    renamed = []
    for k, s in enumerate(flags, first):
        if not s.ref:
            raise SystemExit(f"{tool}: the PWR_FLAG {where} at ({s.x}, {s.y}) has no Reference to rewrite")
        block = text[s.node.start:s.node.end]
        old = f'"{s.ref}"'
        if old not in block:
            raise SystemExit(f"{tool}: the PWR_FLAG {s.ref} {where} at ({s.x}, {s.y}) does not carry its reference as {old}")
        probe = f"{PREFIX}{k}"
        edits.append((s.node.start, s.node.end, block.replace(old, f'"{probe}"')))
        renamed.append((probe, s.ref))
    for start, end, new in sorted(edits, reverse=True):
        text = text[:start] + new + text[end:]
    return text, renamed
