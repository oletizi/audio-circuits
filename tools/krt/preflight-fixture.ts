/**
 * The throwaway board the engine preflight drives. It is NOT pt2399-core and
 * resembles no circuit this repository designs: two two-pad test points, TP1
 * and TP2, on two nets, NET_A and NET_B, inside a 26 x 20 mm outline. Its
 * footprints are named ZZ_PREFLIGHT_* so nothing here can be mistaken for a
 * result about a real board. It lives in the tool, not in boards/, because it
 * exists only to prove the engine's operations run.
 */

const HEADER = `(kicad_pcb
\t(version 20260206)
\t(generator "pcbnew")
\t(generator_version "10.0")
\t(general (thickness 1.6) (legacy_teardrops no))
\t(paper "A4")
\t(layers
\t\t(0 "F.Cu" signal)
\t\t(2 "B.Cu" signal)
\t\t(5 "F.SilkS" user "F.Silkscreen")
\t\t(1 "F.Mask" user)
\t\t(3 "B.Mask" user)
\t\t(25 "Edge.Cuts" user)
\t\t(31 "F.CrtYd" user "F.Courtyard")
\t\t(35 "F.Fab" user)
\t)
\t(setup (pad_to_mask_clearance 0))
`

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
}

function footprint(ref: string, x: number, y: number, net1: string, net2: string, base: number): string {
  return `\t(footprint "ZZ_PREFLIGHT_TESTPOINT_PAIR"
\t\t(layer "F.Cu")
\t\t(uuid "${uuid(base)}")
\t\t(at ${x} ${y})
\t\t(property "Reference" "${ref}" (at 0 -2 0) (layer "F.SilkS") (uuid "${uuid(base + 1)}") (effects (font (size 1 1) (thickness 0.15))))
\t\t(property "Value" "preflight" (at 0 2 0) (layer "F.Fab") (uuid "${uuid(base + 2)}") (effects (font (size 1 1) (thickness 0.15))))
\t\t(attr smd)
\t\t(fp_rect (start -1.6 -1.1) (end 1.6 1.1) (stroke (width 0.05) (type solid)) (fill no) (layer "F.CrtYd") (uuid "${uuid(base + 3)}"))
\t\t(pad "1" smd roundrect (at -0.9 0) (size 1 1.2) (layers "F.Cu" "F.Mask") (roundrect_rratio 0.25) (net "${net1}") (uuid "${uuid(base + 4)}"))
\t\t(pad "2" smd roundrect (at 0.9 0) (size 1 1.2) (layers "F.Cu" "F.Mask") (roundrect_rratio 0.25) (net "${net2}") (uuid "${uuid(base + 5)}"))
\t)
`
}

function edge(x1: number, y1: number, x2: number, y2: number, n: number): string {
  return `\t(gr_line (start ${x1} ${y1}) (end ${x2} ${y2}) (stroke (width 0.1) (type default)) (layer "Edge.Cuts") (uuid "${uuid(n)}"))\n`
}

/** The fixture's `.kicad_pcb` text: TP1 and TP2 apart, NET_A and NET_B joining them. */
export function fixtureBoardText(): string {
  return (
    HEADER +
    footprint("TP1", 12, 12, "NET_A", "NET_B", 100) +
    footprint("TP2", 24, 18, "NET_A", "NET_B", 200) +
    edge(5, 5, 31, 5, 300) + edge(31, 5, 31, 25, 301) + edge(31, 25, 5, 25, 302) + edge(5, 25, 5, 5, 303) +
    ")\n"
  )
}
