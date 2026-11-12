"""The KiCad page number each sheet of a root carries, read from the root's own text.

A multi-page root's sub-sheets are numbered by akcli's `add_sheet` (Task 7e review M3), and the
numbers are what the project's page list and each page's title block ("Id: N/13") show. This prints
`<sheet name> <page>` for the root ("/") and for each `(sheet ...)` node, in file order. Reported by
`verify-root.sh`, never judged: it is the measurement, so no figure is kept in prose.

usage: root_pages.py <root.kicad_sch>
"""
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()
root = re.search(r'\(path "/"\s*\(page "(\d+)"\)', text)
if root is None:
    sys.exit("root_pages.py: " + sys.argv[1] + " has no (sheet_instances (path \"/\" (page ...))); is it a root sheet?")
print("/ " + root.group(1))
for line in text.splitlines():
    name = re.search(r'\(property "Sheetname" "([^"]+)"', line)
    page = re.search(r'\(instances \(project "[^"]*" \(path "[^"]*" \(page "(\d+)"\)', line)
    if name and page:
        print(name.group(1) + " " + page.group(1))
