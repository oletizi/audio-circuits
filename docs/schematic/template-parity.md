# Template applicability: do the ported templates draw this repository's blocks?

**GENERATED - do not hand-edit.** `bun run schgen-parity` rewrites this file from
`tools/schgen/parity.ts`, and `tests/schgen/parity.test.ts` compares the committed copy against a
fresh run **by content**, never by timestamp. There is deliberately no date in this file: a
timestamp would make every run a diff and make stale look current.

## WHICH OF M1's FOUR MEASUREMENTS THIS IS

**Every number below is TEMPLATE APPLICABILITY: a MEASUREMENT WITH NO TARGET.** Spec §5.1,
revision 4, finding 20 separates four things that had been read as one, and names the failure of
confusing them:

| measurement | where it is taken | what it is |
| --- | --- | --- |
| port parity | Task 7, against the SOURCE project's own nine template fixtures | a **regression** requirement: it holds or the port is broken |
| **template applicability** | **this file**, against this repository's declared blocks | **a MEASUREMENT WITH NO TARGET** |
| ELK coverage | Tasks 12-14, over the blocks recorded here as `elk` | a test of the **new capability** |
| integrated correctness | Tasks 11 and 18 | the **artifact**, and the only verdict of the four |

§5.1: the templates *"were sized by a 103-block digital mainboard. Nothing is known about their
pass rate on circuits that are mostly passive chains, dividers and op-amp stages. The measurement:
run them and count."*

**So a low count here is a RESULT, not a problem.** A block no template draws is a finding about a
template. Nothing in the circuits, the declarations or the templates may be tuned to raise it, and
this census never becomes a threshold - Task 17 re-runs it as a second reading of the same
measurement.

## Two readings, and they answer different questions

- **Outcome** is what `selectRenderer` would actually do with the block under spec §1.3. For a
  `wired` block that consults only the declared template.
- **Verdicts** is an applicability probe: every registered template's own verdict on the block's
  subgraph, which is §5.1's question. `Selection`'s `{kind:"elk"}` carries no mismatch, so the
  reason each template declined is otherwise lost - recording it is `docs/known-gaps.md`
  **G141**'s third suggested mechanism. The census refuses if the two readings disagree.

## Per block

| circuit | block | parts | units | crossing nets | declared | outcome |
| --- | --- | --- | --- | --- | --- | --- |
| opamp-buffer | `ob-buffer` | 9 | 11 | 5 | auto | **elk** - every template not-applicable |
| optical-compressor | `oc-power` | 8 | 8 | 4 | auto | **elk** - every template not-applicable |
| optical-compressor | `oc-audio` | 12 | 14 | 7 | auto | **elk** - every template not-applicable |
| optical-compressor | `oc-sidechain` | 17 | 19 | 6 | auto | **elk** - every template not-applicable |
| pt2399-core | `pt-core` | 24 | 24 | 6 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-upper` | 3 | 3 | 2 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-feedback` | 3 | 3 | 2 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-lower-a` | 3 | 3 | 2 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-lower-b` | 3 | 3 | 2 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-collector` | 2 | 2 | 2 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-leg-emitter-bypass` | 2 | 2 | 4 | auto | **elk** - every template not-applicable |
| transistor-preamp | `tp-stage` | 16 | 16 | 9 | auto | **elk** - every template not-applicable |

**12 declared blocks: 0 drawn by a template, 12 to the ELK backend, 0 refused.**

## The two predicates that do the refusing, measured per block

Counted with the templates' own predicates rather than restatements of them: `twoPinNets`
from `render/layout-kit.ts`, which `rail-row`, `divider` and `passive-chain` each refuse a
block on, and `refPrefix !== "C"`, which is `decoupling-bank`'s. **This is description, not
prescription** - it says what the blocks hold, not what they should hold.

| circuit | block | units | units not two-terminal with both pins connected | parts that are not capacitors |
| --- | --- | --- | --- | --- |
| opamp-buffer | `ob-buffer` | 11 | 3 | 7 |
| optical-compressor | `oc-power` | 8 | 0 | 4 |
| optical-compressor | `oc-audio` | 14 | 3 | 11 |
| optical-compressor | `oc-sidechain` | 19 | 4 | 16 |
| pt2399-core | `pt-core` | 24 | 2 | 10 |
| transistor-preamp | `tp-leg-upper` | 3 | 1 | 3 |
| transistor-preamp | `tp-leg-feedback` | 3 | 1 | 3 |
| transistor-preamp | `tp-leg-lower-a` | 3 | 1 | 3 |
| transistor-preamp | `tp-leg-lower-b` | 3 | 1 | 3 |
| transistor-preamp | `tp-leg-collector` | 2 | 1 | 2 |
| transistor-preamp | `tp-leg-emitter-bypass` | 2 | 1 | 2 |
| transistor-preamp | `tp-stage` | 16 | 8 | 12 |

**11 of 12 blocks hold at least one unit that is not two-terminal with both pins connected**, which is where the three subgraph-only templates stop. The one that does not - `oc-power` - gets past that predicate and is declined on TOPOLOGY instead; the verdict rows below say how.

## Per template

Over all 12 blocks, each template's own verdict:

| template | realised | not-applicable | refused |
| --- | --- | --- | --- |
| `rail-row` | 0 | 12 | 0 |
| `decoupling-bank` | 0 | 12 | 0 |
| `divider` | 0 | 12 | 0 |
| `passive-chain` | 0 | 12 | 0 |
| `crystal` | 0 | 12 | 0 |
| `connector-fanout` | 0 | 12 | 0 |
| `regulator` | 0 | 12 | 0 |
| `opamp-stage` | 0 | 12 | 0 |

**Unexercised - drew no block of this repository's circuits: `rail-row`, `decoupling-bank`, `divider`, `passive-chain`, `crystal`, `connector-fanout`, `regulator`, `opamp-stage`** (8 of 8).

## Every verdict, with its reason verbatim

The sentence each template gave, unedited. This is the diagnosis the counts above cannot carry.

### opamp-buffer / `ob-buffer` - 9 parts, 11 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; R1 is R |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### optical-compressor / `oc-power` - 8 parts, 8 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | no net is common to every part |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; J1 is J |
| `divider` | not-applicable | parts to GND start from different nodes (+9V_RAW, +9V_PROTECTED, VBIAS_RAW) |
| `passive-chain` | not-applicable | C1 has both pins on rails (+9V_PROTECTED, GND) |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### optical-compressor / `oc-audio` - 12 parts, 14 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; J2 is J |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; U1#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### optical-compressor / `oc-sidechain` - 17 parts, 19 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; J5#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; J5 is J |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; J5#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; J5#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### pt2399-core / `pt-core` - 24 parts, 24 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; U1#1 has 16 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; R1 is R |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; U1#1 has 16 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; U1#1 has 16 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-upper` - 3 parts, 3 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV1#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; JP1 is JP |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV1#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV1#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-feedback` - 3 parts, 3 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV2#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; JP2 is JP |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV2#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV2#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-lower-a` - 3 parts, 3 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV3#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; JP3 is JP |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV3#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV3#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-lower-b` - 3 parts, 3 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV4#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; JP4 is JP |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV4#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV4#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-collector` - 2 parts, 2 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV5#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; R5 is R |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV5#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV5#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-leg-emitter-bypass` - 2 parts, 2 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; RV6#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; JP5 is JP |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; RV6#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; RV6#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |

### transistor-preamp / `tp-stage` - 16 parts, 16 units, **elk** - every template not-applicable

| template | verdict | reason |
| --- | --- | --- |
| `rail-row` | not-applicable | rail-row needs two-terminal parts with both pins connected; Q1#1 has 3 pins |
| `decoupling-bank` | not-applicable | decoupling-bank holds only capacitors; R6 is R |
| `divider` | not-applicable | divider needs two-terminal parts with both pins connected; Q1#1 has 3 pins |
| `passive-chain` | not-applicable | passive-chain needs two-terminal parts with both pins connected; Q1#1 has 3 pins |
| `crystal` | not-applicable | crystal needs an anchor with roles a and b |
| `connector-fanout` | not-applicable | connector-fanout needs an anchor |
| `regulator` | not-applicable | regulator needs an anchor with roles in and out |
| `opamp-stage` | not-applicable | opamp-stage needs an anchor with roles out, inv and noninv |
