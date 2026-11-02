import re
import sys

DATE = re.compile(rb"/CreationDate \(D:[0-9:]+\)")


def norm(path):
    with open(path, "rb") as fh:
        return DATE.sub(b"/CreationDate (D:REDACTED)", fh.read())


a, b = sys.argv[1], sys.argv[2]
na, nb = norm(a), norm(b)
print("len", len(na), len(nb))
print("EQUAL AFTER DATE REDACTION" if na == nb else "STILL DIFFERS")
if na != nb:
    for i, (x, y) in enumerate(zip(na, nb)):
        if x != y:
            print("first diff at", i)
            print("A:", na[max(0, i - 80):i + 80])
            print("B:", nb[max(0, i - 80):i + 80])
            break
