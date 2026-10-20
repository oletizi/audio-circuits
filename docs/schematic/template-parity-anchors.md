# Template applicability, second column: the templates under a brute-forced anchor

**GENERATED - do not hand-edit.** `bun run schgen-anchors` rewrites this file from
`tools/schgen/anchor-sweep.ts`. No date, for the reason `template-parity.md` gives, and the same
dependence on the installed KiCad applies (`docs/known-gaps.md` **G158**).

**WHICH MEASUREMENT THIS IS: TEMPLATE APPLICABILITY, a MEASUREMENT WITH NO TARGET** - the same
one `template-parity.md` takes, read a second way. Not port parity (Task 7), not ELK coverage
(Tasks 12-14), not integrated correctness (Tasks 11 and 18).

**WHY A SECOND COLUMN.** `template-parity.md` measures the templates *as these circuits are
declared*, and every block is declared `{kind:"auto"}` with no anchor, so the four anchor-driven
templates are never offered one and half that document's verdicts say only *"needs an anchor"*
(**G141**). This sweep supplies an anchor mechanically - every member unit of the block, every
injective assignment of the template's roles to that unit's pins - and reports what the template
then says. **It chooses no arrangement, writes no declaration and emits no schematic.** A
realised probe here is evidence that a template CAN draw the block, and is not a recommendation
to declare that anchor.

## The sweep

| | count |
| --- | --- |
| probes (block x anchor-driven template x member unit x role assignment) | **4664** |
| realised - the template drew the block | **2** |
| a template applied and failed (not `not-applicable`) | **4** |
| `not-applicable` | **4658** |
| **blocks drawn by at least one template under some anchor** | **2 of 12** |
| anchor-driven templates that drew something | **1 of 4** (`connector-fanout`) |

**Drew nothing under ANY anchor over ANY member: `crystal`, `regulator`, `opamp-stage`.** For these the refusal is about the block, not the declaration.

## Per block

| circuit | block | probes | drawn by | a template applied and failed |
| --- | --- | --- | --- | --- |
| opamp-buffer | `ob-buffer` | 79 | - | 0 |
| optical-compressor | `oc-power` | 40 | - | 0 |
| optical-compressor | `oc-audio` | 112 | - | 0 |
| optical-compressor | `oc-sidechain` | 151 | - | 0 |
| pt2399-core | `pt-core` | 4052 | - | 0 |
| transistor-preamp | `tp-leg-upper` | 29 | - | 0 |
| transistor-preamp | `tp-leg-feedback` | 29 | - | 0 |
| transistor-preamp | `tp-leg-lower-a` | 29 | `connector-fanout` | 0 |
| transistor-preamp | `tp-leg-lower-b` | 29 | `connector-fanout` | 0 |
| transistor-preamp | `tp-leg-collector` | 24 | - | 2 |
| transistor-preamp | `tp-leg-emitter-bypass` | 24 | - | 2 |
| transistor-preamp | `tp-stage` | 66 | - | 0 |

## The anchors that drew something, verbatim

| circuit | block | template | anchor |
| --- | --- | --- | --- |
| transistor-preamp | `tp-leg-lower-a` | `connector-fanout` | `RV3`#1 (no roles) |
| transistor-preamp | `tp-leg-lower-b` | `connector-fanout` | `RV4`#1 (no roles) |

## Where a template applied and failed

These are NOT `not-applicable`: the template recognised its idiom and the geometry or the
connectivity then disagreed. Under spec §1.3 a declared template reporting one of these is a
generation error that nothing may rescue, so these are the substantive refusals.

| circuit | block | template | anchor | kind | reason |
| --- | --- | --- | --- | --- | --- |
| transistor-preamp | `tp-leg-collector` | `regulator` | `RV5`#1 in=1 out=3 | invalid-geometry | pin 2 is on the out net COLLECTOR but on the up side; only right-side pins are tied to the out bus |
| transistor-preamp | `tp-leg-collector` | `regulator` | `RV5`#1 in=3 out=1 | invalid-geometry | pin 2 is on the in net COLLECTOR but on the down side; only left-side pins are tied to the in bus |
| transistor-preamp | `tp-leg-emitter-bypass` | `regulator` | `RV6`#1 in=1 out=3 | invalid-geometry | pin 2 is on the out net GND but on the up side; only right-side pins are tied to the out bus |
| transistor-preamp | `tp-leg-emitter-bypass` | `regulator` | `RV6`#1 in=3 out=1 | invalid-geometry | pin 2 is on the in net GND but on the down side; only left-side pins are tied to the in bus |
