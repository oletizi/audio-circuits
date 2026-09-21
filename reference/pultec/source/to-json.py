"""Convert a kicad-cli `kicadxml` netlist export into the JSON the typed
reference imports.

The point is that topology is never hand-transcribed. Run this against the
retained `.net.xml` artifacts; the only hand-authored part of the reference is
the connector-to-control mapping in `../three-band.ts`.

    python3 to-json.py three-band-eq.net.xml three-band-eq.netlist.json
"""
import json
import sys
import xml.etree.ElementTree as ET


def convert(xml_path: str) -> dict:
    root = ET.parse(xml_path).getroot()

    components = {}
    for comp in root.findall("./components/comp"):
        ref = comp.get("ref")
        if ref is None:
            raise ValueError("component with no ref")
        components[ref] = (comp.findtext("value") or "").strip()

    nets = []
    for net in root.findall("./nets/net"):
        name = net.get("name")
        if name is None:
            raise ValueError("net with no name")
        nodes = []
        for node in net.findall("node"):
            ref, pin = node.get("ref"), node.get("pin")
            if ref is None or pin is None:
                raise ValueError(f"node with no ref/pin on net {name}")
            nodes.append({"ref": ref, "pin": pin})
        nets.append({"name": name, "nodes": sorted(
            nodes, key=lambda n: (n["ref"], n["pin"]))})

    return {
        "source": xml_path,
        "components": dict(sorted(components.items())),
        "nets": sorted(nets, key=lambda n: n["name"]),
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    out = convert(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump(out, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(f"{sys.argv[2]}: {len(out['components'])} components, "
          f"{len(out['nets'])} nets")
