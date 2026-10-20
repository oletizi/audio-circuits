# Vendored KiCad symbols

Copied from the KiCad 10.0.5 standard symbol libraries
(`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`) by
`tools/kicad/vendor-symbols.ts`, which is the only thing that should write
this directory. Re-run it, and update the version above, to refresh them.

**WHAT VENDORING BUYS NOW DEPENDS ON WHICH CONSUMER READS IT, AND THERE ARE
TWO.** `lib/kicad/schematic.ts` reads these files directly
(`vendoredSymbolText`) and embeds them, so for it the sentence above holds as
written: the output does not depend on the installed KiCad, and it works with
no KiCad installed at all. `lib/schgen/render/stock-symbols.ts` (since Task 4
of the M1 schematic plan) does **not** read them into a drawing - it resolves a
library nickname to the INSTALLED KiCad's `.kicad_sym` and uses the files here
to **check** it, refusing when a vendored symbol and the installed library
disagree. For that consumer vendoring buys a refusal rather than independence,
and KiCad is a hard dependency. `docs/known-gaps.md` **G119** records why
(`createResolver`'s map is keyed by nickname, so the vendored set has no
library file to be), what it costs, and the open question it leaves.

Each file is one symbol definition, as raw library text. `Transistor_BJT:2N3904`
is defined in its library as `(extends "Q_NPN_EBC")`. A schematic's embedded
symbols must be self-contained, so the vendored copy is FLATTENED: the parent's
body under the child's name, with the child's properties applied. The other
seven are verbatim.

Licence: the KiCad libraries are CC-BY-SA 4.0 with an exception: using a
library symbol in a design places no licence obligation on the design. See
https://www.kicad.org/libraries/license/ .
