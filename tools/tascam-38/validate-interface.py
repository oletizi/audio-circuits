#!/usr/bin/env python3
"""Validate the canonical Tascam 38 amplifier-card interface matrix."""
import csv
import pathlib
import sys
from collections import Counter

EXPECTED = {"J101": 4, "J102": 7, "J103": 6, "J104": 7,
            "J105": 7, "J106": 8, "J107": 7, "J108": 4}
STATUSES = {"VERIFIED", "CANDIDATE", "UNRESOLVED", "CONTRADICTED"}
FIELDS = ("connector", "pin", "card_side_node", "motherboard_side_node",
          "signal_class", "mode_dependency", "card_evidence",
          "motherboard_evidence", "status", "uncertainty_id", "notes")

def validate(path):
    errors = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(FIELDS):
            errors.append(f"Expected columns: {','.join(FIELDS)}")
        rows = list(reader)
    keys = []
    for n, row in enumerate(rows, start=2):
        conn = row.get("connector", "")
        try:
            pin = int(row.get("pin", ""))
        except (ValueError, TypeError):
            errors.append(f"row {n}: invalid pin")
            continue
        keys.append((conn, pin))
        if conn not in EXPECTED or not 1 <= pin <= EXPECTED[conn]:
            errors.append(f"row {n}: unexpected contact {conn}-{pin}")
        status = row.get("status", "")
        if status not in STATUSES:
            errors.append(f"row {n}: invalid status {status!r}")
        if status == "VERIFIED" and any(not row.get(k, "").strip() for k in (
                "card_side_node", "motherboard_side_node", "card_evidence",
                "motherboard_evidence", "signal_class")):
            errors.append(f"row {n}: VERIFIED requires both traced endpoints and evidence")
        if status in {"UNRESOLVED", "CONTRADICTED"} and not (
                row.get("uncertainty_id", "").strip() and row.get("notes", "").strip()):
            errors.append(f"row {n}: {status} requires uncertainty_id and notes")
    expected = {(conn, pin) for conn, count in EXPECTED.items()
                for pin in range(1, count + 1)}
    for key, count in Counter(keys).items():
        if count > 1:
            errors.append(f"duplicate contact: {key}")
    for key in sorted(expected - set(keys)):
        errors.append(f"missing contact: {key}")
    for key in sorted(set(keys) - expected):
        errors.append(f"extra contact: {key}")
    counts = Counter(row.get("status", "") for row in rows)
    print(f"Contacts: {len(rows)}/50")
    for status in sorted(STATUSES):
        print(f"{status}: {counts[status]}")
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    return not errors

if __name__ == "__main__":
    target = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else
                          "docs/tascam-38/interface-matrix.csv")
    if not target.is_file():
        sys.exit(f"Missing interface matrix: {target}")
    sys.exit(0 if validate(target) else 1)
