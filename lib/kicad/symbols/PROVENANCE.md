# Vendored KiCad symbols

Copied from the KiCad 10.0.5 standard symbol libraries
(`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`) by
`tools/kicad/vendor-symbols.ts`, which is the only thing that should write
this directory. Re-run it, and update the version above, to refresh them.

**WHAT VENDORING BUYS NOW IS A DRIFT CHECK, NOT INDEPENDENCE.**
`lib/kicad/schematic.ts` used to read these files directly (`vendoredSymbolText`)
and embed them, so for it the sentence above held as written: the output did
not depend on the installed KiCad, and it worked with no KiCad installed at
all. That file is deleted (Task 6, `docs/superpowers/plans/2026-10-30-remove-schgen.md`,
discharging `docs/known-gaps.md` **G248**'s non-deletion), and so is the
schematic generator's `lib/schgen/render/stock-symbols.ts`, which took over as
the one consumer (Task 9 of the same plan). **Nothing embeds these files any
more, and no program here writes a schematic at all.**

What reads them is `tests/kicad/symbol-names.test.ts`, which compares every
vendored symbol byte for byte against the installed library's own flattened
text - the comparison the deleted `stock-symbols.ts` made as a refusal, ported
so the claim did not lapse with the generator. **So the purpose of this
directory is to notice a KiCad release redrawing a symbol under the same name**,
and a machine with no KiCad fails that test rather than skipping it.
`docs/known-gaps.md` **G119** records why a nickname-keyed resolver could not
read the vendored set directly, what that cost, and the open question it left.

Each file is one symbol definition, as raw library text. `Transistor_BJT:2N3904`
is defined in its library as `(extends "Q_NPN_EBC")`. A schematic's embedded
symbols must be self-contained, so the vendored copy is FLATTENED: the parent's
body under the child's name, with the child's properties applied. The others
are verbatim. The comparison above flattens the installed side the same way, so
the `extends` symbol is checked like every other rather than exempted.

Licence: the KiCad libraries are CC-BY-SA 4.0 with an exception: using a
library symbol in a design places no licence obligation on the design. See
https://www.kicad.org/libraries/license/ .
