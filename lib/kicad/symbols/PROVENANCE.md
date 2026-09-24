# Vendored KiCad symbols

Copied from the KiCad 10.0.5 standard symbol libraries
(`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`) by
`tools/kicad/vendor-symbols.ts`, which is the only thing that should write
this directory. Re-run it, and update the version above, to refresh them.

Each file is one symbol definition, as raw library text. `Transistor_BJT:2N3904`
is defined in its library as `(extends "Q_NPN_EBC")`. A schematic's embedded
symbols must be self-contained, so the vendored copy is FLATTENED: the parent's
body under the child's name, with the child's properties applied. The other
six are verbatim.

Licence: the KiCad libraries are CC-BY-SA 4.0 with an exception: using a
library symbol in a design places no licence obligation on the design. See
https://www.kicad.org/libraries/license/ .
