# Representations of schematic placement intent

**Question.** Before inventing a representation in which an agent states
*"this part goes here, oriented this way, in this group, connected like this"*
and a human reviews that statement in a diff, what already exists? This
document surveys the authored/intermediate layer only. It is **not** about
layout algorithms (see
`docs/research/2026-10-28-schematic-layout-engines.md`) and **not** about
`.kicad_sch` as a finished-artifact format (see
`docs/research/2026-10-28-agent-kicad-surfaces.md`).

**Date of measurement: 2026-10-28.** Every repository figure in this document
is a transcription with that date on it; re-run the fetch rather than quoting
it. Per `CLAUDE.md`, every claim below is marked **VERIFIED** (this writer read
the named primary source) or **RELAYED** (secondhand, including from this
repository's own earlier surveys).

## The seven questions

Each system is scored on the same seven, which are the brief's:

1. **Unit of authorship** — what one edit touches.
2. **Position model** — ABSOLUTE coordinates / RELATIVE (anchored to another
   part or pin) / IMPLICIT (a solver decides) / PRESERVED (the output file is
   the store).
3. **Grouping** — can the author name a region or subsystem?
4. **Reason per decision** — can a *why* ride along with one placement choice,
   attached to it rather than floating in a comment block?
5. **Legible diff** — is a one-part move a one-line diff?
6. **Agent read AND rewrite** — is there a parser as well as a writer?
7. **KiCad round-trip** — does it reach `.kicad_sch`, and does it come back?

Question 4 is the one that separates this survey from the five that preceded
it, and it is the one **nothing** answers.

## The answer, on one screen

**Verdict: adopt nothing. Fourteen systems; not one has all four of a placement
statement, a grouping construct, a reason attached to a decision, and a
machine-readable round trip.** Jump to **Part III** for the table and the
reasoning. The four findings that carry it:

1. **Nothing in EDA has a reason field. Fourteen for fourteen.** The only
   surveyed artifact with one is **WireViz**, a cable-harness documenter
   (`notes:` per item, plus `authors`, `revisions`, per-revision `changelog`).
   `diodeinc/pcb` does not merely lack one — its parser contains
   `// No trailing tokens allowed.`, so a trailing `# keep near the ADC` makes
   the record malformed and can truncate the rest of the block.
2. **The field splits structurally, and neither half is usable alone.**
   Everything with a *relative* vocabulary — SchemDraw's `.at(opamp.out)`,
   circuitikz's `(FB -| OA.out)` — is **write-only**, because the semantics
   resolve by executing Python or expanding TeX, and neither can express a
   netlist at all. Everything *machine-readable* stores absolute final geometry
   (`.kicad_sch`) or no geometry (copperhead, pcbGPT). **The relative reasoning
   that produced a position is destroyed on save.**
3. **The one project that built the brief's artifact has abandoned it.**
   `diodeinc/pcb`'s `# pcb:sch` trailing-comment block is the closest existing
   thing to the description — one line per element, sorted, with a merge API
   and a test guarding the diff against a stray blank line — and its own
   agent-facing skill file now calls it *"legacy"* and documents a migration to
   a linked, reconciled `.kicad_sch`.
4. **`lib/schgen/ir/types.ts` already beats all fourteen on question 4.**
   `PartSpec.source` (provenance per part), `ncUnlisted: { reason: string }`
   (**a required reason**), `checklist[]` on parts, blocks and sheet notes, and
   `BlockSpec.readsFrom` with *"ITS ABSENCE IS NOT A SILENT DEFAULT"* and a
   test that counts the unstated cases. **No surveyed system has any of these.**

**Seven narrower things are worth taking** — SKiDL's `stub_explicit`
(effective-value *plus* a boolean for whether a human set it), copperhead's
group vocabulary bound to `SUBSYSTEMS.md` headings, pcbGPT's
*"Do not use for loops or if conditions"*, `symtx`'s composable `HVLR`
transform, tscircuit's `<schematicbox overlay={[…]} title=…>`, its
`schOrientation` polarity enum, and its `expectTypesMatch` anti-drift
assertion. **And `diodeinc/pcb`'s reconciliation doctrine — *"The generated
document is not a canonical representation"* — is the biggest idea in the
survey and is about a different question than the brief's.**

**Two measurements to take next**, both named in *"What this document does not
establish"*: run `pcb apply schematic` twice on a generated project to test the
idempotence claim the whole doctrine rests on, and feed Lcapy an
over-constrained netlist to see whether its refusal is usable in an agent loop.

---

## PART I — Systems whose primary artifact is the placement intent

### 1. Lcapy — the mature hint language, and the only one of its kind

| | |
| --- | --- |
| Repo | `https://github.com/mph-/lcapy` |
| Primary source read | `doc/schematics.rst` (62 949 bytes), `doc/netlists.rst` (50 082 bytes), 9 example `.sch` files under `doc/examples/schematics/` |
| License | LGPL-2.1 · Python · 305★ (RELAYED from the prior survey) |
| Drawing backend | circuitikz (LaTeX) |

VERIFIED from `doc/schematics.rst`. Lcapy's authored artifact is a `.sch`
netlist file in which **drawing hints follow a semicolon**:

```
R1 1 2; right=2, color=blue
```

The doc's own statement of the model, verbatim:

> *"A semi-automatic component placement is used with hints required to
> designate component orientation and explicit wires to link nodes of the same
> potential but with different coordinates."*

and the mechanism, which is the whole reason it works:

> *"The drawing direction provides a constraint. For example, the nodes of
> components with a vertical orientation have the same x coordinate, whereas
> nodes of horizontal components have the same y coordinate."*

> *"The x and y positions of nodes are computed independently using a graph
> algorithm."*

**So the position model is RELATIVE-BY-CONSTRAINT, not absolute and not
implicit.** The author supplies, per component, a direction and a minimum
length; the solver supplies the coordinates. Nothing in the file is a
millimetre.

**The authored vocabulary, VERIFIED from `doc/schematics.rst` §"Component
orientation", §"Component size" and §"Component attributes":**

| Hint | What the author is deciding |
| --- | --- |
| `right` / `left` / `up` / `down` | orientation (0 / 180 / 90 / −90°); *"Note, this rotates the component"* |
| `right=2`, `down=1.5`, `size=2` | orientation **and** minimum node spacing in one token |
| `rotate=45` | arbitrary angle, anticlockwise from +x |
| `mirror` / `flipud` | mirror in x (opamps, transistors) |
| `invert` / `fliplr` | mirror in y |
| `mirrorinputs` | swap an opamp's inputs *without* mirroring the body |
| `fixed` | *"do not stretch"* — pins this component's length against the solver |
| `free` | *"place no constraints on the node positions"*; `size` and `rotate` are then ignored |
| `offset` | *"distance to orthogonally offset component (useful for parallel components)"* |
| `scale`, `width`, `aspect` | geometry of the drawn body |
| `invisible` / `nodraw` / `ignore` | three distinct degrees of "connected but not drawn" |
| `l`, `a`, `t`, `v`, `i`, `f` | label, annotation, inner label, voltage, current, flow labels |
| `color`, `fill`, `kind`, `variable`, `pins`, `anchors` | appearance and symbol variant |

**Scope levels, which is the part worth copying.** VERIFIED from
§"Attributes": there are *three* scopes with a stated precedence —

> 1. node attributes
> 2. attributes specified as keyword arguments to the `draw()` method that are not `None`
> 3. component attributes
> 4. schematic attributes
> 5. default attributes

A bare `;` line sets **schematic**-scope attributes and *"apply to the
following netlist entries"*, so a file reads as a sequence of regions:

```
R1 1 2; right
; color=green
R2 2 3; right
R3 3 4; right
; color=red
R4 4 5; right
R5 5 6; right, color=purple
```

(VERIFIED, `doc/examples/schematics/attr1.sch`, reproduced whole.) **Node**
attributes are addressed with a dotted prefix — `.p.vdd`, `.-.implicit`,
`.+.l=24V` — so a hint can target one end of one component:

```
R 1 2; down, .-.implicit, .-.l=-24V, .-.fill=blue, .+.implicit, .+.l=24V, .+.fill=orange
```

(VERIFIED, `doc/examples/schematics/nodes1.sch`, the whole file: one line.)

**Composition and hierarchy are real.** VERIFIED from §"Includes" and
§"Namespaces":

```
.include LC1.sch as s1
.include LC1.sch as s2
W s1.2 s2.1; right=0.1
```

and a dotted namespace (`a.R1`, `b.R1`) with relative node names (`R1 .p .m`).
This maps onto this repository's `include(prefix, network, portMap)` almost
exactly.

**Grouping: present, but as an escape hatch into LaTeX, not as a first-class
construct.** VERIFIED, §"Box fitting" and `doc/examples/schematics/fit1.sch`:

```
C1 1 0 100e-12;down
R1 1 6 1500;right
R2 2 4 1e12;down
C2 3 5 5e-12;down
W 2 3;right
W 0 4;right
W 4 5;right
SW 6 2 no;right, l=
;;\node[blue,draw,dashed,inner sep=5mm,anchor=north, fit=(1) (6) (0), label=Human body model] {};
;;\node[blue,draw,dashed,inner sep=5mm, fit=(2) (3) (4) (5), label=CMOS input model]{};
;draw_nodes=connections, label_nodes=False, label_ids=False
```

The `;;` prefix injects raw TikZ. A group is therefore **a labelled box whose
membership is an explicit list of nodes or component ids** — `fit=(R2) (C2)` —
and a group's label *is* a human-readable name (`Human body model`,
`CMOS input model`, `PCB`). That is the right semantics reached by the wrong
means: there is no `group=` attribute, nothing validates membership, and the
construct's correctness depends on LaTeX. Pin references inside a `fit` need
`@` instead of `.` (`U1@tl`), a wart the doc itself flags.

**Reason per decision: NO.** There is no annotation attribute that is not
drawn. `l`, `a` and `t` all render on the sheet. A `#`-style comment in a
`.sch` is not documented. A *why* can only be smuggled into a drawn label or
a group's `label=`.

**Legible diff: YES, and it is the best in this survey.** One component is one
line; a re-orientation is a one-token edit on that line; a group's membership
is one line.

**Agent read AND rewrite: YES, and this is verified at the API level, not
assumed.** VERIFIED from `doc/netlists.rst` §"Circuit attributes" and the
`annotate` entry: `repr(cct)` prints the netlist back, and

```
>>> cct.annotate('R1', color='blue')
R1 1 2; right, color=blue
R2 2 3; right
R3 3 4; right
```

returns a *new netlist with the hint appended to the right line*. So the hint
language has a programmatic read-modify-write path, hints survive it, and
`Circuit('voltage-divider.sch')` loads from disk. There is also a GUI editor
over the same file — `mph-/lcapy-gui`, MIT, 25★, last pushed 2025-09-11
(VERIFIED via the GitHub API) — i.e. **the intent file is editable by hand, by
API and by mouse, which is three authoring surfaces onto one committed
artifact.**

**KiCad round-trip: NO, in either direction.** Output is `tex`, `schtex`,
`pgf`, `png`, `svg`, `pdf`. There is no `.kicad_sch` writer and no symbol-library
awareness.

**The documented failure mode is the right kind.** VERIFIED, §"Drawing tips":

> *"An error can occur if components have the wrong orientation since this
> makes the graph inconsistent. Unfortunately, it is not trivial to find the
> offending component so it is best to draw a schematic incrementally and to
> test it as you go."*

> *"Problems can occur using components, such as integrated circuits and
> opamps, that cannot be stretched. Usually this is due to a conflict between
> constraints."*

It refuses on over-constraint rather than guessing — `CLAUDE.md`'s preference —
but **the refusal does not name the offending component**, which by this
repository's own standard ("every `throw` names what is missing, where to fix
it") is an incomplete refusal. Worth knowing before copying the mechanism: a
direction-constraint solver's error messages are hard, and Lcapy has not
solved that after 5 736 commits.

---

### 2. Microsoft SchGen — the highest-value item, and it is weaker than its abstract

| | |
| --- | --- |
| Paper | *SchGen: PCB Schematic Generation with Semantic-Grounded Code Representations* — Qinpei Luo, Ruichun Ma, Xinyu Zhang, Lili Qiu (UCSD + Microsoft Research Asia) |
| arXiv | `2605.30345`, published **2026-05-28T17:59:50Z** (VERIFIED via the arXiv API) |
| Repo | `https://github.com/microsoft/SchGen` — MIT, Python (RELAYED: 42★ / 8 forks, from this repository's earlier pass) |
| Primary sources read | `schematic_generation/sch_examples/imu_L1.py`, `imu_L2.py`, `imu_L3.py`, `manual_example_esp32.py`, `config.py`, `modules/sch_module_def.py`, `modules/kicad_sch_interface.py` (1 583 lines) |

**The abstract's claim, VERIFIED verbatim from the arXiv API:**

> *"We introduce a semantically grounded code representation that encodes
> schematic editing primitives with relative placement and pin-name-based
> wiring, transforming a geometry-driven generation problem into a
> semantics-driven matching task amenable to LLMs."*

**The representation is Python source.** Not a data file — executable code
against a vendored KiCad editing layer. The complete primitive set, VERIFIED
from the system prompt in `config.py` (which is the normative definition, since
it is what the model is told it has):

```
add_schematic_symbol(symbol_lib=, symbol_name=, pos_x=, pos_y=, reference=, value=, rotation=, mirror=)
get_pin_location(symbol_ref=, pin_name=)          -> (x, y)
add_label(label_pos=[x,y], label_text=, label_ref=, label_type=, text_orient=)
connect_pins(sym_a, pin_a, sym_b, pin_b)
write_out_all_wires()
```

Five functions. `rotation` is *"the angle in degrees … e.g., 0, 90, 180, 270"*;
`mirror` is *"'X' or 'Y' to flip the symbol"*. Labels are first-class and
treated as symbols: *"We treat labels as a kind of symbols, identified by their
unique reference. For power symbols and labels, they only have one pin, so
`pin_a` or `pin_b` should be `"1"`."*

**What "relative placement" actually means — and it is less than it sounds.**
VERIFIED from `imu_L1.py`, the few-shot example `config.py` injects, quoted
verbatim and complete in its placement section:

```python
### Placing center symbol 1 : Transistor_FET:BSS138###

center_x_1, center_y_1 = 150.0, 110.0

add_schematic_symbol(symbol_lib="Transistor_FET", symbol_name="BSS138", pos_x=center_x_1, pos_y=center_y_1, reference="Q2", value="BSS138", rotation=270, mirror="None")

### Placing other symbols in the Schematic with respect to the center symbol 1###

add_schematic_symbol(symbol_lib="power", symbol_name="+1V8", pos_x=center_x_1 + (-72), pos_y=center_y_1 + (22), reference="#PWR1", value="+1V8", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (-72), pos_y=center_y_1 + (8), reference="R1", value="2.2K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Transistor_FET", symbol_name="BSS138", pos_x=center_x_1 + (-62), pos_y=center_y_1 + (0), reference="Q1", value="BSS138", rotation=270, mirror="None")
```

**The relativity is one hop deep and purely arithmetic.** Every part's position
is `center_x_1 + <integer millimetres>`. There is no anchoring of a part to
another *part*, no "to the right of R1", no "above Q1's gate". The only named
datum is a single declared **center symbol** per cluster, and the offsets are
hand-computed millimetres from it. Moving `R1` is still choosing two numbers;
moving the *cluster* is editing one line. That is the entire benefit, and the
paper's own ablation measures it.

**Labels, by contrast, ARE genuinely pin-anchored**, and this is the stronger
half of the representation. VERIFIED, `imu_L1.py`:

```python
# Add label AUX_DA next to Q1 pin S
x_Q1_2, y_Q1_2 = get_pin_location(symbol_ref="Q1", pin_name="S")
add_label(label_pos=[x_Q1_2+(-13), y_Q1_2+(0)], label_text="AUX_DA", label_ref="AUX_DA_0", label_type="input", text_orient="left")
# Connecting Label AUX_DA label_id:0 to Q1 pin S (Pin ID 2 -- Name S)
connect_pins("AUX_DA_0", "1", "Q1", "S")
```

`get_pin_location` is a real query against placed geometry, so a label's
position is *computed from* a pin at run time and survives the symbol moving.
**That is a true anchor**, and it is available for any coordinate, not just
labels.

**The ablation is the most useful thing in the repo, because the three levels
are three different position models of the same circuit.** VERIFIED by reading
all three files:

| File | Placement | Wiring |
| --- | --- | --- |
| `imu_L1.py` | `pos_x=center_x_1 + (-72)` — relative to one declared center | `connect_pins("R3", "1", "Q2", "G")` — by refdes + pin NAME |
| `imu_L2.py` | `pos_x=99.06` — bare absolute mm | `connect_pins(...)` — unchanged |
| `imu_L3.py` | `pos_x=99.06` — bare absolute mm | `add_new_wire([99.06, 117.29], [99.06, 99.51])` — raw coordinate pairs, ×19 |

L3's wiring section, VERIFIED verbatim in part:

```python
add_new_wire([99.06, 117.29], [99.06, 99.51])
add_new_wire([157.48, 81.73], [157.48, 79.19])
add_new_wire([135.89, 91.89], [144.78, 91.89])
```

**Read L3 and then read L1 and the argument for a semantic layer makes itself.**
The paper's headline numbers (RELAYED from this repository's earlier pass,
which read the paper): Valid Circuits 82.00 % (L1) → 78.16 % (L2) → 76.40 %
(L3) → 32.45 % (raw `.kicad_sch`); Netlist Jaccard 49.08 % → 45.97 % →
**15.46 %** → 9.11 %. **Pin-name wiring is worth ~30 points of netlist accuracy;
relative placement is worth ~3.** The ablation says plainly which half of the
representation is load-bearing, and it is not the placement half.

**And Spatial Violation barely moves: 7.73 / 7.77 / 8.14 / 7.80 across all
four.** (RELAYED, same source.) The representation that triples connectivity
accuracy does **not** improve the overlap count. For this repository that is
the single most important number in the paper: *a semantic placement
representation did not buy legibility.*

**Wiring is deferred and solved, not authored.** VERIFIED from
`modules/kicad_sch_interface.py`:

```python
def connect_pins(sym_a: str, pin_a: str, sym_b: str, pin_b: str):
    """Create a connection between *sym_a.pin_a* and *sym_b.pin_b*."""
    start_pos = get_pin_location(sym_a, pin_a)
    end_pos = get_pin_location(sym_b, pin_b)
    connect_two_points(start_pos, end_pos)
```

and `connect_two_points` defers anything non-straight:

> `## If not a straight wire, add the points to the junction connections for later processing.`

with `write_out_all_wires()` running junction insertion and Manhattan bending at
the end. **So SchGen is a hybrid: placement EXPLICIT (author's), routing
IMPLICIT (engine's).** That is exactly the division of labour this repository's
brief keeps circling, shipped and measured.

**Grouping: NO, except as a Python comment.** The `###` banner lines
(`### Placing center symbol 1 : Transistor_FET:BSS138###`) are the only
structure, and they are inert text. `modules/sch_module_def.py` *does* define a
`CircuitModuleDef` pydantic model with `name`, `description` and
`main_IC: list[CircuitLabelDef]` — a module concept with a prose
description — but VERIFIED by reading it, it is a *design-stage planning*
schema consumed by the LLM pipeline, **not** referenced by the generated
placement code. No group reaches the sheet.

**Reason per decision: NO**, other than ordinary Python comments. The generated
comments are mechanical restatements (`# Connecting R3 pin 1 (Pin ID 1 -- Name
None) to Q2 pin G (Pin ID 1 -- Name G)`) — they say *what*, never *why*. By
`CLAUDE.md`'s test ("a rule that refuses with a restatement of itself"), these
are restatement comments.

**Legible diff: PARTLY.** One part is one line, so a move is a one-line diff —
but a *hand-authored* file (`manual_example_esp32.py`, VERIFIED) is real Python
with helper functions, loops and local variables:

```python
def place_label_on_pin(sym_ref: str, pin_name: str, label: str, extra_dx: int = 0, label_type="bidirectional"):
    ...
add_power_symbol("GND", f"#PWR_{ref}", *get_pin_location(ref, "2"))
draw_manhattan_wire(get_pin_location("C8", "1"), get_pin_location("SW1", "2"), bent_down=True)
```

**Once the artifact is a program, "a one-part move" stops being well defined.**
That is the structural cost of choosing code as the representation, and it is
the cost this repository should weigh hardest: a reviewer of a program is
reviewing control flow, not placement.

**Agent read AND rewrite: WRITE-ONLY in practice.** It is Python, so it is
parseable in principle, but nothing in the repo reads a generated file back into
a placement model; the pipeline regenerates. There is no `sch -> code`
importer.

**KiCad round-trip: one-way, and it works.** The code executes against KiCad
and produces an editable `.kicad_sch`. It needs **KiCad 8.0.9 specifically**, a
CUDA PyTorch stack, an OpenRouter key and a `PROJECT_PATH` env var (RELAYED
from the earlier pass; `config.py` VERIFIED to hard-code `KiCAD_DIR =
".../KiCad/8.0/share/kicad"` on all three platforms, so the version pin is
real). **No reverse path.**

**Two things in the repo that corroborate this repository's own conclusions.**
(RELAYED from `docs/research/2026-10-28-academic-schematic-generation-check.md`
§2, re-confirmed here by reading the tree): SchGen abandoned `kiutils` for the
same KiCad-8/9 `hide`-flag defect this repository measured, and it **forked**
`kicad-skip` as `my_skip_lib/` rather than depending on it. Both are in the
file tree I listed.

---

### 3. copperhead `draft/ir.ts` — the deliberate counter-example, read in full

| | |
| --- | --- |
| Repo | `https://github.com/copperheadhq/copperhead` |
| Metadata | VERIFIED via GitHub API 2026-10-28: Apache-2.0, TypeScript, 666★, 139 forks, 275 open issues, created 2026-07-18, pushed **2026-10-28T15:57:49Z** |
| Primary sources read | `src/kicad/draft/ir.ts` (489 lines, read whole), `src/kicad/draft/draft.ts` (224 lines), `docs/src/content/docs/reference/schematic-intent.md` (10 838 bytes, read whole) |

**The thesis, VERIFIED verbatim from `ir.ts`'s module header:**

> *"The netlist-intent IR (`schematic.intent.json`): the compact declarative
> input the model authors instead of geometry (design D5/D6). No coordinates,
> ever — the engine computes every position. Re-drafting the same IR fully
> regenerates the sheet."*

**The complete type, VERIFIED verbatim from `ir.ts`:**

```ts
export interface IntentPart {
  ref: string;
  libId: string;
  value: string;
  footprint?: string;
  /** Subsystem group (from SUBSYSTEMS.md); required for every non-power part. */
  group: string;
}

export interface IntentNet {
  name: string;
  /** Endpoints as `"REF.PIN"` (pin number). */
  pins: string[];
  /** Optional class override; wins over pin-type inference (engine spec). */
  kind?: 'power' | 'ground' | 'signal';
}

export interface SchematicIntent {
  version: number;
  parts: IntentPart[];
  nets: IntentNet[];
  /** Pins deliberately unconnected; emitted as `(no_connect …)` markers. */
  noConnect?: string[];
  hints?: {
    /** Left-to-right group order override; otherwise SUBSYSTEMS.md order. */
    groupOrder?: string[];
    /** Pin the paper size instead of deriving it from content. */
    paper?: string;
    /** Title-block date. Part of the IR (not the wall clock) so identical IR
     * emits identical bytes on any day (design D4). */
    date?: string;
  };
}
```

**That is the whole authored surface. Eleven fields.** No `x`, no `y`, no
rotation, no mirror, no wire route. The reference doc states the exclusion as a
design claim, VERIFIED verbatim:

> *"Coordinates, rotations, wire routes, label positions, junctions,
> power-symbol placement, paper margins, and group box geometry are all
> computed by the engine and have no IR representation. **There is no way to
> pin a symbol to a position, and that is the point:** the drawing stays a pure
> function of the netlist intent, the vendored symbol geometry, and nothing
> else."*

And the closed loop it depends on:

> *"If a gate finding seems to demand a geometry fix, the fix is always
> expressible in this file (rename a net, regroup a part, add a `kind` or a
> no-connect, shorten a BOM value) or it is an engine bug worth reporting with
> the intent that produced it."*

**Grouping is FIRST-CLASS, MANDATORY, and validated against a prose document.
This is the most transferable idea in the survey.** VERIFIED from `ir.ts`:

```ts
const docGroups = docsDir ? await headingsOf(path.join(docsDir, 'SUBSYSTEMS.md')) : null;
for (const p of partByRef.values()) {
  const sym = symbols.get(p.ref);
  if (sym?.isPower) continue;
  if (!p.group) {
    add(`${p.ref} has no group assignment; available groups: ${docGroups?.join(', ') ?? '(SUBSYSTEMS.md absent)'}`);
  } else if (docGroups && !docGroups.some((g) => g.toLowerCase() === p.group.toLowerCase())) {
    add(`${p.ref} names group "${p.group}", which is not a SUBSYSTEMS.md heading; available: ${docGroups.join(', ')}`);
  }
}
```

`headingsOf` is a `^#{2,6}\s+(.+?)$` scan. So: **the group vocabulary is the
set of `##` headings in a human-written markdown file, membership is checked
against it case-insensitively, and the engine draws a labelled box per group.**
The group's *reason* is the prose under its heading. The IR carries only the
name.

**Reason per decision: NO field in the IR — and the reason is relocated to a
sibling markdown table keyed by refdes.** VERIFIED from `ir.ts`'s
`bomRowsOf` doc comment:

> *"One row per refdes: a cell naming several parts (`R1, R2`, `R5-C8`) is read
> verbatim and simply matches nothing, because the BOM contract is one row per
> part — **the row's single Rationale cell is where that part's purpose
> lives.**"*

So copperhead's answer to question 4 is: **a part's reason lives in
`docs/BOM.md`'s `Rationale` column; a group's reason lives under its
`SUBSYSTEMS.md` heading; the IR is pure structure and references both by
name.** The IR and the prose are cross-checked (`value` must agree with the
BOM's Value cell after unit normalisation), so the prose cannot silently drift.
**That is a genuinely good architecture and it does not require a reason field
in the intent file at all.**

**Determinism is engineered, not hoped for.** `hints.date` exists *only* so the
wall clock cannot enter the output — VERIFIED, `draft.ts`:

> *"Date comes from the IR (`hints.date`), never the wall clock: the same IR
> must emit identical bytes on every run and every day (design D4)."*

**`hints` steer and never override.** VERIFIED from the reference doc: *"Hints
steer, they never override a rule: the engine will not accept a hint that would
break the grid, the gating families, or connectivity."* `paper` is advisory —
a non-standard name is noted in the report and the paper derived from content
instead, rather than refused.

**Legible diff: it is JSON, so a four-space-indented array of objects.** A
regroup is a one-line diff. A `groupOrder` change is a one-line diff. There is
no "move", by construction. But JSON has no comments, so the diff carries no
commentary — which is consistent with reasons living in the markdown.

**Agent read AND rewrite: YES for write, and the write path is the ONLY path.**
`parseIntent` + `validateIntent` give a full reader. But VERIFIED from a comment
in `ir.ts`: *"The IR is the agent's only lever on the drawn sheet (`edit_file`
is refused on a drafted schematic)."* **There is no `.kicad_sch -> IR`
importer.** One-way, deliberately.

**KiCad round-trip: forward only, and byte-reproducible.** *"Re-running the
draft with this exact file reproduces the sheet byte for byte."*

**The validation contract is the part to steal outright.** VERIFIED from the
reference doc:

> *"The executable contract is `src/kicad/draft/ir.ts`: there is deliberately
> no separate JSON Schema file, because the validator is the schema and it
> reports violations as numbered findings rather than opaque rejections."*

> *"Every violation becomes one numbered finding …, all findings are reported
> together rather than first-failure-only, and a failed validation writes
> nothing: the previous schematic, the intent file on disk, and the vendored
> cache are all untouched. The repair loop is always the same: fix the intent
> (or the doc the finding names), draft again."*

Every refusal in `ir.ts` names the fix. Three examples, VERIFIED verbatim:

```
`${p.ref}: "${p.libId}" repeats pin(s) ${…} in more than one unit, so a net endpoint cannot be mapped to a single placed unit; the drafting engine cannot place this symbol`

`power nets ${…} both sanitize to the symbol token "${token}", which would give them one shared power symbol and merge the rails; rename one so the tokens differ`

`net name ${…} contains characters that cannot be drawn (quotes, backslashes, or control characters); rename the net`
```

**And copperhead documents, in its own source, exactly the failure mode
`CLAUDE.md` names as "a refusal whose reason cannot be stated".** VERIFIED
verbatim from `ir.ts`, on the over-long `Value` cell:

> *"That is unrecoverable without this check. The IR is the agent's only lever
> on the drawn sheet …, and the BOM cross-check below pins the IR value to this
> cell — so shortening the value in the IR fails validation, and leaving it
> fails legibility. **The run that found this burned all three stage-4 attempts
> and 2h49m discovering the loop, twice, because the legibility findings never
> named BOM.md as the thing to change** (see the deadlock issue)."*

This repository has **the same incident on its own books** as the over-long
`Value` label, one of the four demands the owner caught (`CLAUDE.md`,
"Practices"). Two independent projects reached the same deadlock from the same
cause: a gate that reports a geometry symptom when the fix is in a document.
That is the strongest cross-validation in this survey of anything.

**Be skeptical in one specific way.** RELAYED from
`docs/research/2026-10-28-ai-native-eda-platforms.md`: copperhead's own README
says its status is *"early"* and that *"its acceptance tests need a live model
and have not been observed passing end to end."* 275 open issues as of today.
**It is a design to read, not a dependency to take** — and the prior
draughtsmanship bakeoff already recommended vendoring only its
`legibility.ts`/`score.ts` and **rejecting** its drafting engine, because this
repository has a placer and `CLAUDE.md` wants agents driving it.

---

### 4. SKiDL + `schematizer` — a published, tool-neutral hint schema, and a fatal flaw

This was not in the brief. It is the only thing found that is **a documented,
versioned, pip-installable, front-end-agnostic JSON seam carrying layout hints
into a `.kicad_sch` writer**, so it belongs here.

| | |
| --- | --- |
| Producer | `devbisme/skidl` — `src/skidl/schematic_netlist.py` (271 lines, read whole) |
| Consumer | `schematizer` 0.2.0 on PyPI — downloaded and unpacked; read `schematizer/loader.py`, `schematizer/geometry.py`, `schematizer/ir.py`, and the wheel's `METADATA` whole |
| Narrative | `devbisme/skidl/docs/generating-editable-schematics-2023-07-14.html`, extracted to text and read |

**The seam is declared, VERIFIED verbatim from `schematic_netlist.py`'s module
docstring:**

> *"SKiDL's job is to describe electrical interconnection. The *graphical* work
> of turning that interconnection into a schematic (placement, routing, KiCad
> file generation) is done by a separate tool. The bridge between the two is
> the JSON document produced here…*
>
> *- Component symbol geometry is **embedded** (one definition per unique
> `lib_id`), so the downstream tool needs no access to KiCad symbol libraries
> and the result is fully reproducible.*
> *- **Orientation/layout *hints* the downstream placer consumes are carried
> alongside the electrical data**: per-component `symtx` (mirror/rotate) and
> per-net `stub`/`netio`. New hints can be added as new keys without breaking
> readers."*

**The hint set, VERIFIED verbatim from the emitted records:**

```python
    return {
        "ref": part.ref,
        "lib_id": _lib_id_of(part),
        "value": part.value_to_str(),
        "footprint": getattr(part, "footprint", "") or "",
        "hiertuple": list(part.hiertuple),
        # --- layout hints ---
        "symtx": getattr(part, "symtx", "") or "",
        "orientation_locked": bool(getattr(part, "orientation_locked", False)),
        "pins": pins,
        ...
    }
```

```python
    return {
        "name": net.name,
        "code": code,
        # --- layout hints ---
        # ``stub`` is the effective value; ``stub_explicit`` records whether the
        # user set it (vs. an automatic heuristic the downstream tool may apply).
        "stub": bool(getattr(net, "stub", False)),
        "stub_explicit": bool(getattr(net, "_stub_explicit", False)),
        "netio": (getattr(net, "netio", "") or "").lower(),
        "implicit": bool(net.is_implicit()),
        "nodes": nodes,
        "attrs": _net_attrs(net),
    }
```

Four ideas here are worth more than the tool:

1. **`symtx` is a tiny transform DSL, not a matrix.** VERIFIED from
   `schematizer/geometry.py`:

   > *"`symtx` (str): A string of H, V, L, R operations that are applied in
   > sequence left-to-right. H = horizontal flip, V = vertical flip, L = rotate
   > 90° left (CCW), R = rotate 90° right (CW)"* — e.g. `Tx.from_symtx("RH")`.

   Four letters, composable, readable in a diff. `R90`/`mirror=x` enumerations
   do not compose; this does.

2. **`orientation_locked` separates "I chose this" from "the solver chose
   this."** The author pins an orientation and the placer is forbidden to
   optimise it away. VERIFIED from the SKiDL narrative: *"I locked the
   orientation of single-pin parts. (If someone needs a one-pin part oriented a
   certain way, they can always use the `symtx` attribute.)"*

3. **`stub_explicit` is the same idea for nets, and it is the single best
   field-level idea in this survey.** The record carries *both* the effective
   value *and* whether a human set it — so a downstream heuristic can override
   a default but never an author's decision, and a reviewer can see which is
   which. That is `CLAUDE.md`'s "an agent may never author the acceptance
   criteria for the artifact it is producing", expressed as one boolean per
   field.

4. **`hiertuple`** carries hierarchy as a tuple (`("", "stage1")`), and
   `--flatness` (0.0 … 1.0) decides how much of it becomes separate sheets.
   Grouping is therefore **structural**, inherited from the source code's
   subcircuit nesting, with a single scalar deciding presentation.

**Position model: IMPLICIT, with per-part orientation override.** Force-directed
placement plus a global router. VERIFIED from the narrative: *"Grouping of node
parts into those that are connected and floating. Force-directed placement of
the parts within each group into blocks. Arranging the blocks to create the
overall placement for the node."*

**And then the disqualifying sentence, VERIFIED verbatim from the `schematizer`
0.2.0 wheel METADATA, §"Randomized layout":**

> *"Placement starts parts at random positions and the router breaks ties
> randomly, so the same netlist produces a different — equally valid — drawing
> on every run. **There is no way to pin a layout down: if you get one you want
> to keep, keep the generated files.**"*

**That is fatal for a committed, reviewed artifact**, and it is the exact
inverse of copperhead's design D4. A review of "the agent's placement decisions"
is impossible when re-running the same input produces a different sheet. It also
means the generated `.kicad_sch` cannot be a derived artifact compared by
content, which `CLAUDE.md` requires.

Worth knowing anyway: `schematizer` supports **KiCad 6–10**, its only runtime
dependency is `simp_sexp`, it vendors the KiCad power-symbol library, and it has
a `mode="labels"` that places parts *"unrotated on a plain, deterministic
grid"* with every pin stubbed to a label — *"for flows where correctness matters
more than a readable drawing"*, about 2 s for a 190-part design. **That mode is
deterministic and is a credible netlist-fidelity harness** even though its
output is not a drawing anyone would read.

**Reason per decision: NO.** **Legible diff:** the authored surface is Python
attributes (`part.symtx = "R90"`, `net.stub = True`), so yes at the source
level. **Read AND rewrite:** the JSON seam is readable and writable by anything;
the Python is not round-tripped. **KiCad round-trip:** forward only, 6–10, and
non-deterministic.

---

### 5. WireViz — IMPLICIT placement with a real per-item reason field

Not in the brief; included because it is the one mature artifact found whose
authored YAML carries a **`notes`** field per component, which is question 4
answered affirmatively by something that ships.

| | |
| --- | --- |
| Repo | `https://github.com/wireviz/WireViz` |
| Metadata | VERIFIED via GitHub API 2026-10-28: GPL-3.0, Python, **5 314★**, pushed 2026-10-25 |
| Primary sources read | `docs/syntax.md` (25 291 bytes), `examples/demo02.yml`, `examples/ex05.yml` |

Domain is wiring harnesses, not circuits, so it is an analogy and not a
candidate. But the shape is instructive. VERIFIED, `examples/ex05.yml` whole:

```yaml
templates:
  - &template_con
    type: 'Molex KK 254'
    subtype: female
    pinlabels: [GND, VCC, SCL, SDA]

connectors:
  X1:
    <<: *template_con
  X2:
    <<: *template_con

cables:
  W1:
    <<: *template_wire

connections:
  -
    - X1: [1-4]
    - W1: [1-4]
    - X2: [1-4]
```

- **Unit of authorship:** a YAML mapping key per connector/cable, plus a
  `connections` list of `[component: pins]` triples. Pin ranges (`1-4`) and
  YAML anchors (`<<: *template_con`) keep repetition out of the diff.
- **Position: fully IMPLICIT.** It emits Graphviz `.gv` and lets `dot` place
  everything.
- **Grouping: NO.**
- **Reason per decision: YES — `notes: <str>` on every connector, cable and
  additional component** (VERIFIED, `docs/syntax.md`), plus `metadata.notes`
  for the sheet, `authors`, `revisions` with a per-revision `changelog`, and a
  title-block `template`. **A WireViz file carries who decided, when, and
  why, as first-class keys.** No EDA schematic representation found in this
  survey does.
- **Legible diff: excellent.** YAML, one key per line.
- **Read and rewrite: yes** (it is YAML), though WireViz itself only reads.
- **KiCad: no.**
- **The placement escape hatch is honest about being one.** VERIFIED,
  `docs/syntax.md` §*"GraphViz tweaking (experimental)"*: an `override` map of
  raw `.gv` attributes keyed by *"the leading string of .gv entry"*, plus
  `append`, with the caveat *"This feature is experimental and might change or
  be removed in future versions"* and *"Entries with an attribute containing
  HTML are not supported."* **An intent layer over a solver, with no
  constraint vocabulary, degenerates into string-patching the solver's input
  file.** That is the failure mode to design against.

---

### 6. circuit-synth — the PRESERVED model, a fourth architecture

| | |
| --- | --- |
| Repo | `https://github.com/circuit-synth/circuit-synth` |
| Metadata | VERIFIED via GitHub API 2026-10-28: MIT, Python, 288★, pushed **2026-03-08** (seven months stale) |
| Primary sources read | repo tree (1 725 entries), `README.md`, `src/circuit_synth/component_placement/placement.py`, `tests/bidirectional/_archive_legacy_tests/09_position_preservation/README.md` |

There is **no intent layer at all**, and that is the point of including it. The
Python carries connectivity; placement is force-directed
(`component_placement/force_directed_layout.py`, VERIFIED present) with a
`PlacementNode` carrying `x`, `y`, `rotation` internally. **The placement
record is the `.kicad_sch` itself, matched by refdes across regeneration.**
VERIFIED verbatim from the position-preservation test's README:

> *"**Core Question**: When you add a second component (R2) to Python code and
> regenerate KiCad, does the first component (R1) stay at its manually
> positioned location, or does it get moved back to a default position?"*
>
> *"4. **R1 stays at manually-moved position** (not reset to default!)
> 5. R2 auto-placed in available space (doesn't overlap R1)"*

**Call this the PRESERVED model: the human (or agent) moves things in KiCad, and
the generator's contract is to not undo it.** It needs no representation, gets
a legible git diff for free (the `.kicad_sch` diff), and has no place to put a
reason, no grouping vocabulary, and no way to review a placement decision as a
decision. Its own README positions it this way: *"**Hybrid approach**: Use
Python for hierarchical structure and repeated blocks, KiCad for custom
layout"*, and lists *"Visual schematic editing and verification"* under what it
does **not** do.

Note the staleness: last push 2026-03-08, and the "position preservation" test
is under `_archive_legacy_tests/`.

---

## PART II — Drawing DSLs, KiCad's own format, and the hardware HDLs

Sections 7–12 were measured by **two parallel passes** of this same research
task, which cloned the repositories at HEAD and read the KiCad source on
GitLab. Where this writer re-verified a claim independently it says so;
everything else in these six sections is **RELAYED from those passes**, which
named their files and line numbers. §7 **SchemDraw**, §8 **circuitikz** and §9
**KiCad** came from the first; §10 **atopile**, §11 **tscircuit** and §12
**`.zen`** from the second.

### 7. SchemDraw — the richest relative vocabulary, and no way to read it back

| | |
| --- | --- |
| Repo | `https://github.com/cdelker/schemdraw` · MIT · Python |
| Primary sources (RELAYED, read by the parallel pass) | `docs/usage/placement.rst` in full; `schemdraw/elements/container.py`; `schemdraw/elements/elements.py`; `schemdraw/schemdraw.py`; `schemdraw/parsing/` |

**Unit of authorship: one chained method-call expression per element**, inside
a `with schemdraw.Drawing():` block. The docs' own model statement:

> *"Elements instantiated inside a `with` block are automatically added to the
> Drawing. The Drawing maintains a current position and direction, such that
> the default placement of the next element will start at the end of the
> previous element, going in the same direction."*

and the docs deprecate the kwargs form in favour of chaining: *"The keyword
arguments are not validated or type checked, so the chained method interface
described above is recommended."*

**Position model: all four modes at once, with IMPLICIT as the default.** This
is the widest placement vocabulary in the survey:

| Mode | Syntax |
| --- | --- |
| IMPLICIT (turtle) | nothing — position and direction inherit from the previous element |
| direction verbs | `.up() .down() .left() .right()`, `.theta(20)`; *"the element is rotated in that direction, and future elements take the same direction"* |
| RELATIVE to another part's named anchor | `elm.Resistor().right().at(opamp.out)`; `Q.base` or `Q['base']` |
| RELATIVE, self-aligning | `elm.Opamp().anchor('in1')` — *"Place the `in1` anchor at the current drawing position"* |
| ABSOLUTE | `.at((x, y))`, `.to((x, y))`, `.endpoints(a, b)` |
| relational / "close the loop" | `.tox(C.start)`, `.toy(...)` — *"extend the element horizontally or vertically to the x- or y- coordinate of the anchor given as the argument"* |
| cursor control | `.hold()`, `.drop('emitter')`, `d.move(dx,dy)`, `d.move_from(ref,dx,dy)`, `d.set_anchor(name)` |
| state stack | `Drawing.push()` / `Drawing.pop()`; `with d.hold():` saves and restores `here` and `theta` |
| orientation | `.flip()`, `.reverse()`, `.shift(-0.4)` |
| wire shapes | `elm.Wire('c', k=-1)` with shape codes `-`, `-\|`, `\|-`, `\|-\|`/`n`, `-\|-`/`c`, `-/-`/`z`, `\|/\|`/`N` |

**`.at(opamp.out)` is the single most expressive placement idiom found
anywhere in this survey.** It is how a person says *"the feedback resistor goes
off the output"* with no arithmetic. Anchors are published automatically:
*"Once an element is added to the drawing, all its anchor positions will be
added as attributes to the element object."*

**Grouping: YES, two constructs, and both are good.**

- `elm.Container` — *"Container element - a group of elements surrounded by a
  box"*, a context manager, **nestable** (`Container.container()`), with the
  box derived from its contents, and it then **publishes its own anchor ring**
  (`center, boxNW, N, E, S, W, NE, NW, SE, SW, NNE, …`) so other parts can
  anchor to the group.
- `elm.ElementDrawing` — collapses a whole `Drawing` into one `Element`,
  carrying `self.anchors = self.drawing.anchors`, so anchors declared with
  `d.set_anchor(name)` become the subcircuit's **ports**. True block reuse.

There is **no** `Section` construct; `Container` and `ElementDrawing` are the
only group-like exports.

**Reason per decision: NO.** `Element` has no metadata, name, note or comment
field. `.label()`'s full signature is purely typographic (`label, loc, ofst,
halign, valign, rotate, fontsize, font, mathfont, color, href, decoration`).
Only free-floating `#` comments.

**Legible diff: a qualified NO, and the reason generalises to every
turtle/cursor design.** One element is one expression, so the *edit* is one
line — but *"the default placement of the next element will start at the end
of the previous element"* means changing one element's length or direction
silently relocates everything downstream. **You get a one-line diff whose
rendered consequences are global and invisible in the diff.** Writing
everything with explicit `.at((x,y))` buys locality at the cost of the turtle
convenience that is the library's whole point. **That trade-off is the central
design hazard for any relative-placement representation**, this repository's
included.

**Agent read AND rewrite: WRITE-ONLY.** There is no serialisation of a
`Drawing` (a grep for `json|to_dict|from_dict|pickle|serial` across
`schemdraw/` hits only the WaveJSON *timing-diagram* importers in
`logic/timing.py` and `logic/bitfield.py`). `schemdraw/parsing/` is **not** a
schematic parser: it is `logic_parser.py` (a boolean-expression → drawing
builder over `pyparsing`) and `buchheim.py` (a tree-layout algorithm). The only
way to get geometry out is to **execute** the Python and read `Drawing.here`,
element `.anchors` and `get_segments()` at run time.

**KiCad round-trip: NO, and no path to one.** A case-insensitive grep for
`netlist|spice|kicad|ltspice|\.asc` across the whole repo returns **zero
hits** — sanity-checked against `resistor`, which hits. SchemDraw cannot emit a
connectivity list at all.

### 8. circuitikz — beautiful output, and the artifact only TeX can read

| | |
| --- | --- |
| Repo | `https://github.com/circuitikz/circuitikz` |
| Primary source (RELAYED) | `doc/circuitikzmanual.tex` — 11 973 lines / 634 KB, the CTAN manual's own source. CHANGELOG head `1.8.8 (unreleased)`; last release `1.8.7 (2026-09-12)` |

**Unit of authorship: a token inside a path expression, not a statement.** The
documented form (§3.1):

```latex
\draw (0,0) to[#1=#2, options] (2,0);
```

> *"where `#1` is the name of the component, `#2` is an (optional) label, and
> `options` are optional labels, annotations, style specifier"*

and a single `\draw` routinely carries many components. The manual's own
example:

```latex
\draw (A1.-) to[short] ++(0,1) coordinate(tmp) to[R, l_=$R$] (tmp -| A1.out) to[short] (A1.out);
```

One line: a wire, a named coordinate, a labelled resistor, an
orthogonal-intersection target, and another wire. **"One part" is not a
reviewable unit here.**

**Position model: explicit absolute, explicit relative, and named-anchor
relative. Nothing implicit — the LaTeX layer never solves.**

| Mode | Syntax |
| --- | --- |
| absolute | `(0,0) to[resistor] (2,0)` |
| relative, cursor-advancing | `++(2,0)` |
| named coordinates | `coordinate(FB)` … `(FB)` |
| component anchors | `name=P`, then `(P.wiper)`, `(OA.-)`, `(OA.out)` |
| anchor-based self-placement | `node[op amp, anchor=+](OA){…}` — *"this shifts the whole element so that the named anchor will lie at the current position of the path"* |
| orthogonal projection | `(FB -\| OA.out)`, `(in \|- GND)` — *"the point aligned vertically with `in` and horizontally with `GND`"* |
| interpolation | `($(Q1.E)!0.5!(Q2.E)$)`, `coordinate[pos=0.5](Qmid)` |
| border anchors | `(bip.0)`, `(bip.30)` …, with `\ctikzset{bipoles/border margin=1.1}` |
| orientation | `mirror`, `invert`, `rotate=-90`, `xscale=-1`, `yscale=-1` |

The `-|` projection operator is the one idiom here with no SchemDraw
equivalent and it is excellent: *"the `-|` coordinate operation is quite
mnemonic"*. The manual also warns off `+(x,y)` in favour of `++(x,y)`:
*"avoid them if you can — the behavior will depend not only on the CircuiTikZ
version, but also on the TikZ layer underneath."*

And the manual's own style advice, §2.2: *"notice that the only absolute
coordinate is the first one; that will enable us to 'copy and paste' the
circuit in several places"* — **which maximises the downstream-coupling hazard
in exchange for block reusability.**

**Grouping: YES, four mechanisms — but none of them is a labelled region.**

- `\ctikzsubcircuitdef` / `\ctikzsubcircuitactivate` (§3.3, since v1.3.5):
  *"basically a path (and just one path!) of generic TikZ instructions, with a
  series of accessible coordinates that behave more or less like anchors"*. The
  contract is stated and strict: *"you **must** define the coordinates of all
  the anchors listed before as `coordinate(#1-anchorname)`"* and *"all the
  coordinates used must be either relative, or named in the form
  `#1-something`; **absolute coordinate will not work** when instantiating the
  block."* Activation is a separate step *"needed to calculate the relative
  positions of anchors using the current set of style parameters"*. Limits:
  *"a subcircuit can be moved, replicated and placed around but it can't be
  easily personalized"*; *"There are no additional parameters definable."*
- TikZ `pic`s (§3.3.4, since v1.8.0) — the parameterised successor, *"with the
  advantage to be able to define (up to 9) parameters"*; pic-local anchors are
  auto-prefixed with the instance name (`one-in`, `one-out`, `one-corner`).
  Stated limitation: *"natively they do not have options to place them with
  internal anchors, like the `anchor=...` options of nodes"*.
- `scope` — the transform group: *"To scale and rotate a subcircuit you have to
  include it into a `scope`"*, with *"global scales that affect rotation works
  only if `transform shape` is issued"* and *"nesting `transform shape`
  normally works, but it has been really lightly tested."*
- plain `\newcommand` macros, which the manual itself recommends as the
  label-parameterising wrapper.

**All four are code-reuse and transform groupings, not semantic regions.** A
drawn box around a block is a separate `rectangle` path or `node[draw]`
carrying no membership.

**Reason per decision: NO.** `name=` is identity; `l=` and `$R_1$` render;
`\ctikzset{}` is configuration. Only `%` comments. Note the telling detail:
the manual's *prose* does exactly this reasoning — *"we want the two ANDs in
line with the flip-flop inputs, so I'll start with the flip-flop"* — **but
that prose lives in the manual, not in any circuit artifact.**

**Legible diff: frequently NO**, for two compounding reasons: one `\draw`
chains many components across many physical lines, and `++` is cumulative so
one edit shifts the remainder of the path. Named coordinates and `-|`
projections mitigate it by re-anchoring, and are the idiom to prefer if diff
locality matters.

**Agent read AND rewrite: WRITE-ONLY, more so than any other system here.**
There is no AST and no IR; placement is computed by TeX expansion inside
`pgfkeys` (*"Pretty much all CircuiTikZ relies heavily on `pgfkeys`"*,
`tex/pgfcirc.defines.tex`). **Nothing but a TeX engine can resolve
`(FB -| OA.out)`.** An agent can generate circuitikz and text-edit it; it
cannot read a placement back without reimplementing TeX.

**KiCad round-trip: NO.** Same zero-hit grep as SchemDraw. Output is
PDF/PGF.

### 9. KiCad's own format — one real intent slot, and it is not shipped yet

Primary sources (RELAYED from the parallel pass, with four claims
**re-verified independently by this writer**, marked): `eeschema/sch_file_versions.h`;
`eeschema/sch_group.h`; `eeschema/sch_io/kicad_sexpr/sch_io_kicad_sexpr.cpp`
(2 202 lines, the writer); `.../sch_io_kicad_sexpr_parser.cpp` (6 324 lines,
the reader); `common/io/kicad/kicad_io_utils.cpp`.

**First, a warning about the documentation.** The parallel pass ran a token
census against the raw HTML of `dev-docs.kicad.org/en/file-formats/sexpr-schematic/`:
`custom_property` **0 occurrences**, `text_box` **0**, `rule_area` **0**,
`sheet_instances` **0**, `rectangle` **0**; `group` appears 4 times and **all
four are the English word "grouped"**. The page opens *"This documents the
s-expression schematic file format for all versions of KiCad from 6.0"* and its
own section list promises a *"Root Sheet Instance Section"* it never delivers.
**Treat `eeschema/sch_io/kicad_sexpr/` as the only authority.** This matters to
this repository directly, which has twice shipped a footprint name written from
memory.

**(a) `(custom_property "key" "value")` — the only true intent slot in the
format, on 13 item classes.** RELAYED and then **VERIFIED independently by this
writer** against `common/io/kicad/kicad_io_utils.cpp:59-66`, quoted verbatim
from the file fetched today:

```cpp
void FormatCustomProperties( OUTPUTFORMATTER* aOut, const EDA_ITEM& aItem )
{
    if( !aItem.HasCustomProperties() )
        return;

    for( const auto& [key, value] : aItem.GetCustomProperties() )
        aOut->Print( "(custom_property %s %s)", aOut->Quotew( key ).c_str(), aOut->Quotew( value ).c_str() );
}
```

RELAYED: emitted on symbol, field/property, bitmap, **sheet**, junction,
no-connect, bus entry, **rule_area**, line, text, **text_box**, table and
**group**; and it *round-trips* — the reader has `case T_custom_property:` at
five or more sites, and `resolveGroups()` does
`group->SetCustomProperties( groupInfo.customProperties )`.

**AND HERE IS THE CORRECTION THIS WRITER FOUND, WHICH CHANGES THE
CONCLUSION.** The parallel pass reported the feature as *"post-10.0.0"* and
hedged on whether it is released. **VERIFIED by this writer**, fetching
`eeschema/sch_file_versions.h` from three branches today:

| branch | `SEXPR_SCHEMATIC_FILE_VERSION` | carries custom properties? |
| --- | --- | --- |
| `master` | `20261025` | yes — `20260830 // Custom user properties`, `20261015 // … for SCH_SHAPEs` |
| `10.0` | **`20260306`** | **no** — zero occurrences of `custom_property` in the header |
| `9.0` | `20250114` | no |

**`custom_property` is NOT in released KiCad 10. It exists only on `master`.**
And **VERIFIED by this writer**, the schematics in this repository write
`(version 20260306)` — six of them — plus two legacy `(version 20231120)`:

```
   2 (version 20231120)
   6 (version 20260306)
```

**So the one mechanism in the KiCad file format that could carry a reason is
unavailable in the KiCad this repository runs.** Any design that depends on it
depends on a nightly.

**(b) `(group "name" (uuid …) (members "uuid" …))` — real schematic groups,
KiCad 10.** RELAYED from the writer at `sch_io_kicad_sexpr.cpp:1825-1857`,
with four properties that matter:

- a group is **named**, **UUID-stable**, defines **membership by UUID**, and
  can carry `custom_property`;
- `memberIds.Sort()` before emission, so **the serialisation is diff-stable
  under reordering**;
- `(lib_id …)` links a group to a **design block** library item (version
  `20250513 // Groups can have design block lib_id`) — reusable blocks;
- groups **nest** (`SCH_GROUP::TopLevelGroup`).

But the semantics are *derived*, not authored — `sch_group.h`'s own class
comment: *"The group is transparent container - e.g., **its position is derived
from the position of its members**."* **A KiCad group is a set, not a region
you place parts into** — structurally the same as SchemDraw's `Container`.

RELAYED version provenance: `eeschema/sch_group.h` 404s on `8.0` and `9.0` and
200s on `master`; the earliest commits are `43e432f9ad` *"sch_group: add basic
class implementation + test"* (2025-04-01) and `d6e7970738` *"sch: add group
tool"* (2025-04-15), and the earliest tag containing the latter is
`10.0.0-rc1`. **VERIFIED by this writer:** `sch_group.h` returns 200 on both
`master` and `10.0` and 404 on `9.0`. So **groups ARE available to this
repository** even though `custom_property` is not.

**VERIFIED by this writer, and worth stating plainly: no schematic in this
repository contains a single `(group ` element.** `grep -c "(group " circuits/*/*.kicad_sch`
returns `0` for all eight files. The grouping mechanism KiCad 10 gives us is
entirely unused here, and `lib/schgen/` does not emit it.

**(c) `(rule_area …)` — the only true geometric REGION.** RELAYED, writer:1529,
version `20240417 // Rule areas` with `20250610 // DNP, etc. flags for rule
areas`. A closed polygon carrying `locked`, `exclude_from_sim`, `in_bom`,
`on_board`, `dnp` and `custom_property`. Unlike `group`, membership follows
from geometry. Also absent from the dev-docs.

**(d) `(sheet (at X Y) (size W H) …)` — the oldest, strongest and only
*portable* grouping mechanism.** A named subcircuit in its own file with
declared hierarchical pins (`input|output|bidirectional|tri_state|passive`) and
UUID instance paths. RELAYED: sheets also carry `custom_property`; recent bumps
include `20240602 // Sheet attributes` and `20251012 // Flat schematic
hierarchy support`. This is the part the dev-docs *do* document.

**(e) `(property [private] "Name" "Value" (at X Y angle) …)` — the portable
reason slot, with a catch.** Arbitrary user-named symbol fields have existed
since KiCad 6, so this is the fallback for `custom_property` on any released
KiCad. The catch: a `property` is **rendered text with its own absolute
`(at …)`**, so using one as a hidden note means setting `hide` — and it is
attached only to a symbol, never to a group, a region or a wire. Also note
`do_not_autoplace` and `AUTOPLACE_ALGO fieldsAutoplaced`, which *are* genuine
authoring intent ("I placed this; leave it alone"), and the writer's own
comment recording a real cross-language bug (issue #24403) from emitting a
translated field name.

**(f) `(text_box …)` / `(text …)`** — prose on the sheet, with geometry and
**no membership link to anything**. Combine with `custom_property` to attach
it, which returns us to (a)'s availability problem.

**(g) `(uuid …)` stability is the foundation the whole thing rests on.**
RELAYED version history: `20210125 // R/W uuids for pins, labels, wires, etc.`,
`20210406 // Add schematic level uuids.`, `20211123 // R/W uuids for
junctions.`, `20250425 // uuids for tables`; the parser preserves them verbatim
(`const_cast<KIID&>( group->m_Uuid ) = groupInfo.uuid`). Even symbol pins carry
them. **This is what makes `(members …)`-by-UUID a durable grouping
mechanism**, and what makes an agent's edits re-identifiable across saves.

**The seven questions for `.kicad_sch`:**

1. **Unit of authorship:** an s-expression node. A declarative record, flat per
   sheet; hierarchy is across *files* via `(sheet)`.
2. **Position model: ABSOLUTE, exclusively.** Every item prints
   `(at X Y [angle])` in internal units. There is **no** relative, anchored or
   implicit placement anywhere in the format. The one exception is
   `SCH_GROUP`, whose position is derived and therefore not stored.
3. **Grouping: YES, and the richest of the three systems in this part** —
   `(group)` (KiCad 10+), `(sheet)` (portable), `(rule_area)` (geometric), plus
   decorative `rectangle`/`text_box`.
4. **Reason per decision: YES in principle, NO in practice for this
   repository** — `(custom_property)` is master-only; the portable fallback is
   a hidden symbol `(property)`.
5. **Legible diff: NO — multi-line, but local and stable.** RELAYED: moving a
   symbol rewrites its own `(at …)` **and** the `(at X Y angle)` of every one
   of its `(property …)` fields, because `saveField` emits an *absolute*
   position rather than an offset. Mitigations: stable UUIDs, sorted
   `(members …)`, deterministic rewrite. Caution: KiCad rewrites the whole file
   on save and bumps `(version)`, so a save by a newer KiCad produces format
   churn independent of your edit — which is why this repository already
   compares derived artifacts **by content, never by timestamp**.
6. **Agent read AND rewrite: YES, fully. This is the format's decisive
   advantage** — a 6 324-line reader and a 2 202-line writer exist in KiCad
   itself, and the parser's `Expecting(...)` strings document the grammar
   token by token.
7. **Round-trip: it *is* `.kicad_sch`.**

**The structural inversion this part exposes, stated once because it is the
survey's central finding.** The two drawing DSLs put all their intelligence in
*relative* placement — anchors, projections, cursors, reusable blocks — which
is exactly the vocabulary in which a person says *"this goes here relative to
that"*. Both are **write-only**: the relative semantics resolve by executing
Python or expanding TeX, so nothing reads the intent back, and neither can
express connectivity at all. `.kicad_sch` inverts this completely: fully
machine-readable and round-tripping by definition, but it stores **only
absolute final geometry**. **The relative reasoning that produced a position is
destroyed on save.** That gap is the hole a placement-intent representation
exists to fill, and no surveyed system fills it.

### 10. atopile `.ato` — no schematic at all, and the public line is stale

Measured by a parallel pass of this task against `atopile/atopile` main at
`619eda7` (2026-03-11). RELAYED unless stated.

**The prior finding that atopile is deliberately anti-schematic is CONFIRMED,
and the boundary is sharper than "anti-schematic": it generates no schematic at
all.** Four independent checks:

- `README.md`'s "Where atopile fits in" lists the whole flow and **omits a
  schematic step**: *"Requirements … Component selection … Design capture —
  `.ato` modules and interfaces compose your system — Layout — place and route
  in KiCad — Checks … Build outputs"*.
- `src/vscode-atopile/README.md:9`: *"Write human-readable `.ato` files instead
  of point-and-click schematics."*
- The build-target registry `src/atopile/build_steps.py` has **no schematic
  target** — the full census of `@muster.register(...)` names is
  `init-build-context … load-pcb, picker, prepare-nets … update-pcb … bom, glb,
  step, 3d-model, 2d-image, mfg-data, manifest, variable-report, power-tree,
  datasheets`. Nothing schematic.
- `SchematicFile(` appears nowhere in `src/`; no code path writes a
  `.kicad_sch`. There *is* a typed `.kicad_sch` model
  (`src/faebryk/core/zig/src/sexp/kicad/schematic.zig`) and
  `fileformats.py:504` constructs `kicad.schematic.Symbol(...)` — but that is
  **KiCad v6 symbol-library migration**, not schematic generation. `ato view`
  exports a **block diagram** to `tempfile.mkdtemp(prefix="ato_visualizer_")`
  and persists nothing.

**There is no placement unit at any altitude.** The complete `simple_stmt`
alternation of `src/atopile/compiler/parser/AtoParser.g4`:

```
simple_stmt
    : import_stmt | assign_stmt | connect_stmt | directed_connect_stmt
    | retype_stmt | pin_declaration | signaldef_stmt | assert_stmt
    | declaration_stmt | string_stmt | pass_stmt | trait_stmt
    ;
compound_stmt : blockdef | for_stmt ;
```

No `layout` block, no coordinate literal, no geometry type. **Both escape
hatches are closed:** `#pragma` is lexed but `visit_PragmaStmt`
(`ast_visitor.py:753-785`) recognises **exactly one** function, `experiment(...)`,
and otherwise raises *"Pragma function not recognized"*; and a grep for
`has_pcb_position` or any `src/faebryk/library/*` file matching
`layout|position|place` returns **zero hits** — the user-facing trait
vocabulary (`src/atopile/server/stdlib.py:259-270`) is `can_bridge,
has_net_name_suggestion, is_alias_bus_parameter, is_sum_bus_parameter,
has_usage_example, implements_design_check, has_designator_prefix, is_lead,
can_attach_to_any_pad`.

**"Layout reuse" is PCB-only, confirmed, and the mechanism is instructive — it
is the PRESERVED model again.** `examples/layout_reuse/layout_reuse.ato`'s
docstring, verbatim:

```
1. Build the example with `ato build`
2. Open the top layout in KiCAD.
3. Press Ctrl-A to select all footprints.
4. Click the atopile pull group button in the top right corner in KiCAD.
5. Now you should have pre-routed/laid out footprints in the top layout.
```

with *"This will be our layout that we will do by hand and then reuse in the
top module. The layout itself is done in KiCAD."* **The intent artifact is a
hand-laid-out `.kicad_pcb` matched by module address** (`src/atopile/layout.py`:
`SubPCB`, `has_subpcb`, `SubAddress`). Nothing is expressed in `.ato`.

**And the public repository is a stale snapshot, which this repository's earlier
survey did not establish.** RELAYED from the GitHub and PyPI APIs:
`archived: false`, 4 027★, `pushed_at` 2026-10-14 — **but main's HEAD is
2026-03-11**, and the October push activity is on side branches. **Releases and
tags stop at `v0.14.1004`, 2026-02-12** (all 196 tags enumerated; no `v0.15.x`
tag exists), while **PyPI ships `atopile` 0.15.9, uploaded 2026-09-12**. The
in-repo examples pin `requires-atopile: ^0.14.0`. **The 0.15 line users
actually install is not in the open-source repository.** Do not assume a
feature is visible.

**Verdict for atopile: it contributes nothing to this question**, and that is
its own position, stated in its own README.

### 11. tscircuit — the broadest symbolic vocabulary, and a real intent file

Measured by the parallel pass against `tscircuit/props` `7378262` (v0.0.715),
`tscircuit/core` `d02e74a`, `tscircuit/cli` `b0024cc`, `tscircuit/runframe`
`25c84a6`, all 2026-10-28. **Two claims re-verified independently by this
writer**, marked.

**tscircuit has TWO placement-intent surfaces and they are architecturally
different:** props on the JSX element (authored, co-located) and
`manual-edits.json` (machine-owned, separately committed).

**(a) `manual-edits.json` — and the brief's hypothesis about it is correct.**
**VERIFIED independently by this writer** against
`tscircuit/props/lib/manual-edits/manual_edits_file.ts` and
`manual_schematic_placement.ts`, fetched today and quoted whole:

```ts
export const manual_edits_file = z.object({
  pcb_placements: z.array(manual_pcb_placement).optional(),
  manual_trace_hints: z.array(manual_trace_hint).optional(),
  schematic_placements: z.array(manual_schematic_placement).optional(),
})
```

```ts
export const manual_schematic_placement = z.object({
  selector: z.string(),
  relative_to: z
    .string()
    .optional()
    .default("group_center")
    .describe("Can be a selector or 'group_center'"),
  center: point,
})
```

**Three fields. `selector`, `relative_to`, `center`.** No rotation, no mirror,
no size, no symbol choice, no sheet, **no reason.** A real record, RELAYED from
`core/tests/examples/example12-schematic-manual-edits.test.tsx`:

```tsx
manualEdits={{
  schematic_placements: [
    { selector: "U1", center: { x: 5, y: 5 }, relative_to: "group_center" },
  ],
}}
```

and on disk, `cli/examples/basic/index.circuit.tsx:1`:

```tsx
import manualEdits from "./manual-edits.json"
```

**Who writes it matters: the browser GUI, not the human.** RELAYED from
`runframe/lib/components/RunFrameWithApi/store.ts:222-252` —
`applyEditEventsAndUpdateManualEditsJson` reads `manual-edits.json`, folds the
edit events in, and `upsertFileApi("manual-edits.json", JSON.stringify(…, null, 2))`.
The CLI dev server yields ownership explicitly,
`cli/lib/dev/DevServer.ts:303-305`: *"We've temporarily disabled upserting
manual edits from filesystem changes because it can be edited by the browser"*.
**So: drag a symbol in the browser, and the placement lands in a committed JSON
file.** That is a genuine durable placement-intent artifact, and the only
GUI-authored one in the survey besides `lcapy-gui`.

**`relative_to` is advertised-but-absent, which is the kind of claim worth
knowing before trusting a schema.** RELAYED: it is only ever *written* as
`"group_center"` (`apply-schematic-edit-events-to-manual-edits-file.ts:42`) and
only ever *read* as `if (position.relative_to === "group_center")`
(`PrimitiveComponent.ts:1009`); `_getSchematicManualPlacementForComponent`
ignores the field. **Selector-relative schematic anchoring does not work.**

**The event layer is more expressive than the state file, and the asymmetry is
a design lesson.** RELAYED,
`lib/manual-edits/manual-edit-events/edit_schematic_component_location_event.ts`:

```ts
export const edit_schematic_component_location_event =
  base_manual_edit_event.extend({
    edit_event_type: z.literal("edit_schematic_component_location"),
    schematic_component_id: z.string(),
    original_center: z.object({ x: z.number(), y: z.number() }),
    new_center: z.object({ x: z.number(), y: z.number() }),
  })
```

with a sibling `edit_schematic_group_location_event`. **The event layer can
move a schematic GROUP; the state file has no group record**, so group moves
are flattened into per-component placements on fold-in. **An append-only event
log that records `original_center` → `new_center` is a *decision* record; the
state file that replaces it is not.** If this repository ever wants a reviewable
trail of placement changes rather than a snapshot, that is the shape.

**RELAYED and worth recording as a refutation: there is no `.schematic.tsx`.**
A grep across `cli`, `runframe`, `core`, `props` and `tscircuit` for
`schematic.tsx` returns zero hits. The file is `manual-edits.json` (alias
`manual_edits.json`).

**(b) The props — and the symbolic ones are the real contribution.** RELAYED
from `props/lib/common/layout.ts`:

```ts
  schMarginTop/Right/Bottom/Left/X/Y: distance.optional(),
  schX: distance.optional(),
  schY: distance.optional(),
  schRotation: rotation.optional(),
  symbol: symbolProp.optional(),
  schStyle: schStyle.optional(),
  relative: z.boolean().optional(),       // "X/Y coordinates will be interpreted relative to the parent group"
  schRelative: z.boolean().optional(),    // "schX/schY will be interpreted relative to the parent group"
```

**An asymmetry worth noting: the schematic placement vocabulary is
deliberately poorer than the PCB one.** The PCB side has `pcbLeftEdgeX`,
`pcbRightEdgeX`, `pcbTopEdgeY`, `pcbBottomEdgeY`, `pcbOffsetX/Y`,
`pcbPositionAnchor` and
`pcbPositionMode: "relative_to_group_anchor"|"auto"|"relative_to_board_anchor"|"relative_to_component_anchor"`.
**The schematic side has none of these five.**

**But the symbolic, coordinate-free props are the best in the survey**, and
they are what this repository should look at:

| Prop | What it says, without a coordinate |
| --- | --- |
| `schOrientation` | `"vertical"\|"horizontal"\|"pos_top"\|"pos_bottom"\|"pos_left"\|"pos_right"\|"neg_top"\|…` — *"horizontal means pins go 1->2 rightward … (generally, positive on top)"*. **A polarity-aware orientation, not a rotation.** On `resistor, capacitor, inductor, diode, led, fuse, battery, crystal` |
| `schPinArrangement` | `leftPinCount/rightPinCount/topPinCount/bottomPinCount`, or per side `{ pins: (number\|string)[], direction: "top-to-bottom"\|"left-to-right"\|"bottom-to-top"\|"right-to-left" }` |
| `schPinStyle` | `z.record(...)` keyed by pin name, each with `marginLeft/Right/Top/Bottom` — per-pin nudges |
| `schSize` | `"xs"\|"sm"\|"default"\|"md"` or a distance — *"distance between pin1 and pin2"* |
| `schSectionName` | *"This component will be drawn as part of this section e.g. \"Power\""* |
| `schSheetName` | *"… as part of this sheet e.g. \"Main\""* |
| `schStyle` | group/board default: `{ defaultPassiveSize?, defaultCapacitorOrientation?: "vertical"\|"none" }` |

**`schPinArrangement` is the most expressive placement-intent primitive found
anywhere in this survey**: it says which pins go on which side in which order,
symbolically, with no geometry. This repository's `rules/pin-sides.ts` reads
sides off the symbol's own pin angles and treats `ComponentOverride.pinSides`
as *"an ASSERTION checked against that geometry, never an override of it"*
(**G155**) — a different and arguably stricter choice, but the vocabulary is
the same vocabulary.

**Grouping: the richest in the survey, and one construct is worth copying
outright.** RELAYED:

- `<group>` with `schTitle`, `schWidth/schHeight`, `schPadding*`, `border`,
  `cellBorder`, and `showAsSchematicBox` (collapse a whole group into one
  pin-arranged box);
- `schSectionName` / `<schematicsection>`; `schSheetName` /
  `<schematicsheet sheetSize="A4"|"ANSI_B">`;
- **`<schematicbox>` with `overlay: string[]`** — a list of *selectors*,
  meaning *"draw a titled, optionally dashed box around these named components,
  sized to fit"*, with `title`, `titleAlignment: ninePointAnchor`,
  `titleColor`, `titleFontSize`, `titleInside`,
  `strokeStyle: "solid"|"dashed"`, and a `.refine()` requiring either
  `width`+`height` or a non-empty `overlay`.

**`overlay` is Lcapy's `fit=(R2) (C2)` with a real schema instead of raw
LaTeX**, and it is the single most reusable idea in this part. It is also
exactly what KiCad's `(group … (members "uuid" …))` is, one abstraction level
up: membership by name rather than by UUID.

- **`<schematicsymbol>` is the answer to this repository's multi-section
  problem.** RELAYED, with its own doc comment: *"Places a named
  schematic-symbol representation of an existing physical component … This is a
  schematic-only projection, so it accepts only the identity, connection, and
  schematic placement props it needs"* — `{ name, displayName?, chipRef?,
  symbolName, connections?, schX?, schY?, schRotation?, schSectionName?,
  schSheetName? }`. **A dual op-amp's A and B sections can be placed in two
  different functional blocks on the sheet while remaining one package.**
  `CLAUDE.md`'s "Multi-section packages" section describes exactly this
  constraint — *"the whole component goes in one block and the other block
  reaches what it needs through a declared port"* — and `<schematicsymbol>` is
  the alternative resolution: keep the component whole in the model and split
  it in the *drawing*.

**Auto-layout exists, is the default, and can be escaped three ways.** RELAYED
from `core/lib/components/primitive-components/Group/Group.ts:2660-2702`:

```ts
_getSchematicLayoutMode(): "match-adapt" | "flex" | "grid" | "relative" {
  const schAutoLayoutEnabled = props.schAutoLayoutEnabled ?? false
  if (props.schLayout?.layoutMode === "none") return "relative"
  if (props.schLayout?.layoutMode === "relative") return "relative"
  ...
  const hasManualEdits = (props.manualEdits?.schematic_placements?.length ?? 0) > 0
  if (schAutoLayoutEnabled && !hasManualEdits) return "match-adapt"
  if (!anyLayoutChildHasSchCoords && !hasManualEdits) return "match-adapt"
  return "relative"
}
```

So `match-adapt` is the default and you leave it by setting `schX`/`schY` on
any child, by supplying a non-empty `manualEdits.schematic_placements`, or by
`schLayout.layoutMode: "none"` — which is an **alias for `"relative"`**, i.e.
*honour coordinates*. **There is no true "draw nothing automatic" mode.** The
full group vocabulary mirrors CSS with a `sch` prefix (`schGrid`, `schFlex`,
`schFlexDirection`, `schAlignItems`, `schJustifyContent`, `schGap`, `schPack`,
`schMatchAdapt`, …), and `schAutoLayoutEnabled`'s own doc comment calls it
transitional: *"This is eventually going to be replaced with more sophisticated
layout options/modes and will be enabled by default."*

**Reason per decision: NO.** RELAYED: a grep for `reason|note|comment` across
`lib/manual-edits/`, `lib/common/layout.ts` and `lib/components/schematic-*.ts`
returns zero hits. `manual-edits.json` is JSON and cannot carry a comment.
`schTitle` and `<schematicbox title>` are **labels for the drawing, not
rationale for a decision** — the same confusion Lcapy's `label=` invites.

**Legible diff: yes in the `.tsx` (`<resistor name="R1" schX={2} schY={0} />`
is the idiomatic one-line form); NO in `manual-edits.json`** — runframe writes
`JSON.stringify(…, null, 2)`, so `center` expands and a move touches the `x`
and `y` lines separately.

**Agent read AND rewrite: the best in the survey.** RELAYED: `@tscircuit/props`
is **zod end to end**, every schema paired with a hand-written interface and a
compile-time `expectTypesMatch<…>(true)` assertion **so the TypeScript types
and the runtime validator cannot drift** — a discipline worth copying
independently of anything else here. Public fold helpers are exported from
core: `applyEditEventsToManualEditsFile`,
`applySchematicEditEventsToManualEditsFile`.

**KiCad round-trip: both converters exist; the loop does not close on intent.**
RELAYED: `circuit-json-to-kicad` v0.0.258 (2026-10-28) has a real schematic
pipeline (`CircuitJsonToKicadSchConverter` with `InitializeSchematicStage,
AddLibrarySymbolsStage, AddSchematicSymbolsStage, AddSchematicTracesStage,
AddSchematicNetLabelsStage, AddSchematicGraphicsStage, AddSheetInstancesStage`,
plus `buildSchematicSheetPlan.ts`, `partitionCircuitJsonBySheet.ts`,
`selectSchematicPaperSize.ts`); `kicad-to-circuit-json` v0.0.147 imports.
**But neither writes back into `.tsx` props or `manual-edits.json`** — a
KiCad-side move lands in Circuit JSON, not in the authored intent. This
repository's earlier survey already recommended `circuit-json-to-kicad` and
`kicadts` as the two things to take from tscircuit without taking tscircuit;
nothing here changes that.

### 12. `diodeinc/pcb` `.zen` — the closest existing thing to what the brief describes

| | |
| --- | --- |
| Repo | `https://github.com/diodeinc/pcb` — MIT, Rust + Starlark, HEAD `35bdaf9` *"Release v0.4.94"*, **2026-10-28** |
| Primary sources | `crates/pcb-sch/src/position.rs` and `crates/pcb-kicad-sch/test-data/analysis/simple.zen` — **both re-fetched and VERIFIED by this writer**; the rest RELAYED from the parallel pass |

**This is the find of the survey. `.zen` carries schematic placement as a
sorted, trailing block of one-line magic comments in the circuit's own source
file, machine-parsed and machine-rewritten, with a published merge API.**

The format, from `docs/pages/spec.mdx:556-576` (RELAYED, verbatim):

```
# pcb:sch <id> x=<f64> y=<f64> rot=<f64> [mirror=<x|y>]
```

A complete real file — **VERIFIED by this writer**, fetched today,
`crates/pcb-kicad-sch/test-data/analysis/simple.zen` quoted whole:

```python
"""Minimal schematic-analysis regression design."""

Project(name="Simple", path="kicad", layout=False)

Resistor = Module("@stdlib/generics/Resistor.zen")

LEFT = Net("LEFT")
MID = Net("MID")
RIGHT = Net("RIGHT")

Resistor(name="R1", value="1kohms", package="0402", P1=LEFT, P2=MID)
Resistor(name="R2", value="2kohms", package="0402", P1=MID, P2=RIGHT)

# pcb:sch R1.R x=50.0000 y=50.0000 rot=0
# pcb:sch R2.R x=100.0000 y=50.0000 rot=0
```

**The code says what the circuit is; the trailing block says where it is
drawn.** That separation, inside one committed file, is precisely the shape the
brief asks about.

A richer block, RELAYED from `examples/AD7171/AD7171.zen`:

```
# pcb:sch AD7171 x=241.3000 y=203.2000 rot=0
# pcb:sch C_BULK.C x=558.8000 y=88.9000 rot=0
# pcb:sch R_AINN.R x=-114.3000 y=292.1000 rot=270
# pcb:sch R_PULLUP.R x=723.9000 y=88.9000 rot=180
# pcb:sch VDD.1 x=190.5000 y=63.5000 rot=0
# pcb:sch GND.1 x=406.4000 y=533.4000 rot=0
# pcb:sch GND.2 x=456.4000 y=533.4000 rot=0
```

Three things in that block matter:

1. **Ids are hierarchical dotted paths into module instances** — `C_BULK.C` is
   the `C` component inside instance `C_BULK` — so a parent file can place a
   child module's internals.
2. **Net symbols are placed individually.** `GND.1` and `GND.2` are two
   separate ground symbols on the sheet. **"How many grounds, and where" is a
   real schematic decision and this is the only representation in the survey
   that states it.** copperhead decides it in the engine; Lcapy decides it by
   wire topology; nothing else records it.
3. **Multi-unit parts get an `@unit` suffix** (RELAYED, from `position.rs`'s own
   test `test_parse_element_ids_with_unit_suffix`):
   `# pcb:sch J15.2309413-1@U1 x=558.8000 y=1358.9000 rot=0`. **Per-unit
   placement of a dual package is expressible** — directly relevant to the
   Pultec.

**The parser, VERIFIED by this writer against `crates/pcb-sch/src/position.rs`
fetched today**, quoted verbatim at the lines that matter:

```rust
    let remainder = trimmed.strip_prefix("# pcb:sch ")?;
    let x = parts.next()?.strip_prefix("x=")?.parse::<f64>().ok()?;
    let y = parts.next()?.strip_prefix("y=")?.parse::<f64>().ok()?;
    let rotation = parts.next()?.strip_prefix("rot=")?.parse::<f64>().ok()?;
    ...
    // No trailing tokens allowed.
    if parts.next().is_some() {
```

```rust
        "# pcb:sch {} x={:.4} y={:.4} rot={:.0}{}\n",
```

**`// No trailing tokens allowed.` is the whole answer to question 4 for this
system, and it is a refusal.** You cannot write
`# pcb:sch R1.R x=50 y=50 rot=0  # keep near the ADC` — the line becomes
malformed, is dropped with a `log::warn!("Malformed pcb:sch comment: …")`, and
because parsing runs **backward from EOF and stops at the first non-matching
line**, it can truncate the rest of the block. **A representation whose
grammar forbids a comment is a representation that forbids a reason.**

**The parse rules anyone generating these must know** (RELAYED from
`position.rs`'s own tests, whose names are quoted):

- `test_backward_parsing_stops_at_non_position` — **the block is parsed
  backward from EOF and ends at the first non-matching line.** Blank lines are
  fine; a plain `# comment` is not. **Positions must be the last thing in the
  file.**
- `test_interleaved_pcb_sch_comments` — a `# pcb:sch` line anywhere *else* is
  **inert**, and survives a rewrite as dead text while the live block is
  rebuilt below it.
- `test_natural_numeric_sorting` — the writer rewrites the whole block sorted
  by a **numeric-aware** ordering (`VCC.2, .9, .10, .11`, not lexicographic).
- `test_merge_preserves_existing_positions` — supplied positions override,
  unsupplied ones survive, and `symbol_ids_to_remove` deletes.
- `test_parse_element_ids_with_spaces_ignored` — **an id containing a space is
  malformed**, which silently truncates the block.
- `test_update_existing_positions_no_extra_blank_line` — a test that exists
  *specifically to keep the diff from gaining a blank line.* That is the right
  level of care about diffs, and it is the only test of its kind found in this
  survey.

**One part is one line carrying x, y, rot and mirror together, at fixed
precision, deterministically sorted. That is the cleanest one-line-diff
property of any system here.**

**Agent read AND rewrite: a published API at three levels.** RELAYED:

- Rust —
  `pcb_sch::position::{parse_position_comments, edit_position_comments, symbol_id_to_comment_key, Position, MirrorAxis}`,
  a pure parse/merge/delete API returning *(byte offset, replacement text)* so
  the caller **splices rather than rewriting the file**;
- Starlark — positions are exposed as first-class `Position` values on the
  module (`module.rs:243-260`, `starlark_simple_value!(Position)`), so **the
  circuit's own code can read its own placement**;
- protocol — LSP `pcb/savePositions` with
  `PcbSavePositionsParams { file_path, base_hash, symbol_positions, deleted_symbol_ids }`
  and an **optimistic-concurrency `base_hash` guard on the source file**
  (`crates/pcb-zen/src/lsp/mod.rs:1292-1345`). Drag in the viewer, the `.zen`
  file's comment block is rewritten.

And the format is regex-parseable by anything, which is arguably its best
property.

**Grouping: NO record.** `parse_position_comment` admits exactly one id plus
x/y/rot/mirror. Grouping is carried implicitly by the hierarchical ids and by
one position block per `.zen` file — and in the generated KiCad, *"Generation
may give a new module instance its own child sheet and file"* with sheet pins
(`SHEET_PIN_SPACING_MM: 5.08`, `SHEET_MIN_WIDTH_MM: 50.8`) and relationships
persisted in `.kicad_pro` under `diode.schematic_sheets`. **A module becomes a
sheet, never a titled box on the parent sheet.**

**Coordinates are not composed.** RELAYED from `convert.rs:924-966`: each
module instance keeps its own sheet coordinate space; `post_process_all_positions`
scopes keys to the instance path and remaps renamed paths via
`Remapper::from_path_map(self.schematic.moved_paths)` but **does not offset**.
So relativity exists only at file granularity.

**And `# pcb:sch` is now labelled LEGACY by the project itself, which is the
most important thing in this section.** RELAYED verbatim from
`skills/zener-language/SKILL.md:105-112`, the repo's own agent-facing
instruction:

> *"Inspect the root declaration and its flags: `Board(..., schematic = True)`
> uses `layout_path`; `Project(...)` uses `path` with schematics enabled by
> default. **These KiCad files are persistent state.** … Without a linked
> schematic, preserve **legacy** `# pcb:sch <ID> ...` placement comments, add
> new code above the block … For a requested legacy migration, first run
> `pcb-sch export-kicad <root.zen> --output <fresh-directory>`."*

**So the one project that built the artifact the brief describes has moved off
it, to "placement lives in a managed `.kicad_sch` that the tool reconciles
against the netlist."** That is a strong negative signal about the
comment-block design, delivered by its own authors. (RELAYED caveat:
`agent-schema` and `pcb-sch export-kicad` are *named in the skill but absent
from the open-source tree* — no `[[bin]]` in `crates/pcb-sch/Cargo.toml`, no
`export_kicad` subcommand. The reconciler itself **is** present: `pcbc/src/apply.rs`
implements `pcb apply [schematic|layout] FILE`.)

**And the doctrine it moved TO is the most transferable idea in this entire
survey.** RELAYED verbatim from `crates/pcb-kicad-sch/DESIGN.md`,
"Compatibility invariant":

> *"`pcb apply` accepts any KiCad schematic hierarchy whose connectivity is
> equivalent to the evaluated Zener netlist. It does not require a particular
> sheet structure, label strategy, wire layout, item order, or placement
> policy. The only required reconciliation metadata is the Zener component path
> and symbol-slot identity stored on each managed symbol. Deterministic UUIDs
> on generated labels, wires, sheets, and other items do not grant continued
> ownership of those items."*
>
> *"Analysis interprets the schematic as KiCad does. … Otherwise, it preserves
> equivalent schematics and makes the smallest repair needed to restore
> equivalence."*
>
> *"Generation may give a new module instance its own child sheet and file.
> Later applications preserve user reorganizations rather than restoring that
> layout."*

and in code, `compose.rs:50-53`:

```rust
    // The generated document is not a canonical representation. Any existing
    // KiCad organization is valid when its connectivity matches the netlist;
    // managed symbol identities are the only reconciliation metadata we may
    // rely on. See ../DESIGN.md.
```

**Read that against `CLAUDE.md`'s invariant — "an agent may never author the
acceptance criteria for the artifact it is producing."** The pipeline is four
named stages: **Inspect** (`analysis::inspect_schematic` reduces both the
document and the netlist to one connectivity graph), **Decide**
(`plan_connectivity_repair` → `ConnectivityRepairIntent`; a bad connection is
cut by *"a minimum node cut over the physical adjacency graph"*), **Realize**,
and **Verify** — which *"accepts a realization only if every selected issue is
gone and no new issue appeared"*, and *"verifies through reconciliation, which
also proves its edits reversible"*. Edits are a typed reversible algebra
(`DocumentEdit { SetProjectName, SetRootPages, InsertPage, RemovePage,
ReplacePage }`, *"One exact, reversible change to the typed schematic
document"*). Autoplacement touches **only new symbols**, on a 1.27 mm grid
(`CONNECTION_GRID_MM: f64 = 1.27`, `GridPacker`,
`PACKING_MARGIN_CELLS: i32 = 5`, `PACKING_CLEARANCE_CELLS: i32 = 4`) — the same
grid unit as copperhead's `U = 1.27`. The crate *"performs no filesystem
operations; callers supply and persist schematic sources."*

**Idempotence is the documented acceptance test**, from the skill: *"Run
`pcb apply schematic --no-open <root.zen>` twice; the second must report
`schematic unchanged`."*

**Note the one thing that does not connect: the `.kicad_sch` path does not read
`# pcb:sch`.** RELAYED: `symbol_positions` is consumed only by `convert.rs`
(the Zener viewer's netlist IR) and tests; `pcb-kicad-sch` never sees it.
**The two mechanisms are parallel, not layered** — which is exactly why one is
called legacy and a migration command is documented.

---

## PART II½ — Three more found while searching, all new since the last pass

An arXiv title search for `"schematic generation"` (VERIFIED via the arXiv API,
2026-10-28, 11 results) returned **three papers this repository's earlier
surveys do not name**. None is a placement-intent representation, but two of
them matter.

### 13. pcbGPT — a second independent arrival at copperhead's architecture

`arXiv:2606.01188v1`, 2026-05-31, *"pcbGPT: Automatic PCB Schematic Synthesis
from Natural Language Requirements"*. Code at `github.com/tk-king/pcbGPT`
(VERIFIED via the GitHub API: **1 star**, pushed 2026-10-01 — essentially
unknown). Abstract, VERIFIED verbatim in part: *"pcbGPT represents circuits in
a Python DSL and combines tool-augmented synthesis with component-library
search, datasheet-grounded design knowledge, execution-based checking,
structural and semantic validation…"* and, honestly, *"is not yet reliable
enough to replace expert review."*

**Two things in its source are directly useful, and both are VERIFIED by
reading `backend/agent/Prompts/schematic_policy.py` (16 367 bytes).**

**(a) Grouping as a `with` block with an id and a human label**, under a
heading the file calls *"Functional block metadata"*, quoted verbatim:

```
- Before writing circuit code, identify the functional blocks in the design, such as power input, voltage regulation, MCU, sensor, interface, oscillator, timing network, protection, filter, or indicator.
- Use `with circuit.functional_block("block_id", "Block Label"):` to group component creation by function.
- Use stable snake_case block ids, for example `usb_c_input`, `voltage_regulator`, `mcu`, `sensor`, `led_indicator`, or `timing_network`.
- Create every component inside exactly one functional block context. Support parts such as decoupling capacitors, pull-ups, feedback resistors, timing capacitors, and protection parts belong in the block they support.
```

*"Exactly one functional block"* and *"support parts … belong in the block they
support"* is **copperhead's mandatory `group` field, reached independently**,
down to the rule about where a decoupling capacitor goes.

**(b) The DSL rules forbid control flow, and this is the answer to the problem
SchGen has.** VERIFIED verbatim:

```
# Circuit DSL rules
- Do not use for loops or if conditions in the schematic code. The `with circuit.functional_block(...)` context is allowed and expected for grouping.
```

**That one line is the most practically useful sentence found in this survey.**
A code-shaped representation is diff-legible *only* if it is a flat sequence of
declarations, and pcbGPT states the constraint explicitly rather than hoping.
SchGen's hand-authored example (`manual_example_esp32.py`) violates it freely
and is correspondingly unreviewable.

VERIFIED from `backend/agent/Core/schematic_toolkit.py` and
`write_circuit_code.py`: the DSL carries **no coordinates at all** — components,
nets, footprints and functional blocks only — and a separate
`generate_kicad_project` writes the KiCad project. **So pcbGPT is
architecturally copperhead with a Python surface instead of a JSON one.** Two
projects, no shared lineage, same conclusion: grouping and connectivity are
authored; geometry is not.

### 14. PCBSchemaGen — correctness, not placement; but the harness shape is relevant

`arXiv:2602.00510v2`, 2026-01-31. Code at `github.com/HZou9/PCBSchemaGen_v2`
(VERIFIED via the GitHub API: 19★, pushed 2026-06-17, `NOASSERTION` licence).
Abstract, VERIFIED verbatim in part:

> *"Most LLM code-synthesis benchmarks rely on unit tests as the reward oracle,
> but PCB schematic design has none: correctness is defined by structured
> physical constraints over real IC packages and pin-level assignments,
> per-task golden references are unavailable, and SPICE simulation does not
> validate schematic-level correctness."*

Its answer is *"a deterministic 5-layer continuous-reward verifier with
pin-level error localization"* with *"zero verifier code changes"* across two
benchmarks. **Nothing about placement.** It is included because its framing —
a deterministic verifier the generator never authored, with per-pin
localisation — is this repository's own invariant, and because it is the
strongest statement found anywhere that *schematic-level* correctness has no
simulation oracle.

### 15. MultModLM — the finding that should make anyone nervous about a VLM gate

`arXiv:2606.27666v1`, 2026-06-26, a benchmark of 99 RTL modules. Its key
negative result, VERIFIED verbatim from the abstract:

> *"we find that LLM-based evaluators exhibit near-zero agreement with human
> raters, revealing, as a key finding, that **LLM-as-a-judge paradigms are
> unreliable in structurally precise domains.**"*

Domain is RTL, not analogue, so this is an adjacent result and not a
measurement on this repository's boards. But it is pointed straight at
`CLAUDE.md`'s *"a gate halts rendering and we never look at the picture so we
can't tell if the gate is insane or not"* problem (**G303**): **a VLM looking
at the rendered sheet is the obvious way out of that, and this is published
evidence that it does not work.** SchGen's own `sch_verifier.py` is exactly
such a VLM prompt (RELAYED from this repository's earlier pass). Worth a real
measurement here before anyone builds one.

---

## PART III — Comparison and verdict

### The comparison table

Columns are the brief's seven questions. **A** = absolute, **R** = relative /
anchored, **I** = implicit (solver), **P** = preserved (the output file is the
store), **C** = constrained (author gives direction + minimum length, solver
gives coordinates).

| System | Unit of authorship | Position | Group | Reason per decision | 1-part move = 1-line diff | Agent read + rewrite | KiCad round-trip |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Lcapy** `.sch` | one line per component | **C** + per-component `fixed`/`free` | labelled box via raw TikZ `fit=` | **no** (all labels render) | **yes, best in survey** | **yes** — load, `annotate()`, `repr()` | no (tex/pdf/svg) |
| **SchGen** Python | one `add_schematic_symbol(...)` call | **A**, offset from one declared centre; labels truly pin-anchored via `get_pin_location` | no (only `###` comments) | no (comments restate *what*) | yes if generated, **no** if hand-authored | write-only | forward only, KiCad 8.0.9 |
| **copperhead** `intent.json` | one `parts[]`/`nets[]` object | **none — "no coordinates, ever"** | **yes, mandatory, validated against `SUBSYSTEMS.md` headings** | **relocated** — `BOM.md` `Rationale` column per part; heading prose per group | yes (JSON line) | read **and** write; no `sch→IR` import | forward only, byte-reproducible |
| **SKiDL** + `schematizer` | Python attribute (`part.symtx`, `net.stub`) | **I** + per-part `symtx` override, `orientation_locked` | `hiertuple` + `--flatness` | no — but **`stub_explicit` records WHO decided** | yes at source level | JSON seam readable; Python not round-tripped | forward only, KiCad 6–10, **non-deterministic** |
| **WireViz** YAML | one YAML key per item | **I** (Graphviz) | no | **yes — `notes:` on every item**, plus `authors`/`revisions`/`changelog` | yes | yes (plain YAML) | no |
| **circuit-synth** | Python `Component(...)` | **P** — force-directed once, then preserved by refdes | sheets from subcircuits | no | n/a (the `.kicad_sch` is the diff) | via the `.kicad_sch` | yes, bidirectional sync; **stale since 2026-03** |
| **SchemDraw** | one chained expression | **I** default; `.at(opamp.out)`, `.anchor()`, `.tox()`, **A** all available | **yes** — `Container` (nests, publishes anchor ring), `ElementDrawing` (ports) | no | 1 line edited, **global effect** | write-only (must execute) | **no, and no path** |
| **circuitikz** | a token inside a `\draw` path | **A** + `++()` + `(P.wiper)` + `anchor=` + `(a -\| b)` | `\ctikzsubcircuitdef`, `pic`, `scope`, macros — **code reuse, not regions** | no | **often not even one line** | write-only (must run TeX) | **no, and no path** |
| **`.kicad_sch`** | one s-expression node | **A, exclusively** | **yes** — `(group)` K10, `(sheet)` portable, `(rule_area)` geometric | `(custom_property)` — **master-only, NOT in KiCad 10** | no — several adjacent lines | **yes, fully** (reader + writer in-tree) | it *is* `.kicad_sch` |
| **atopile `.ato`** | a `module` statement | **not expressible** — grammar has no geometry; `#pragma` and traits both closed | n/a (no schematic) | n/a | n/a | grammar + AST yes, content absent | **no schematic is generated at all** |
| **tscircuit** props | a prop on a JSX element | **A** + group-relative (`schRelative`) + **I** (`match-adapt` default); **plus the best symbolic set in the survey** (`schOrientation`, `schPinArrangement`, `schSize`) | **richest in survey** — `<schematicbox overlay={[selectors]} title=… strokeStyle="dashed">`, `showAsSchematicBox`, sections, sheets | **no** (`schTitle`/`title` are drawing labels) | yes, one line, idiomatic | **best** — zod + `expectTypesMatch` so types can't drift | export + import converters; **intent loop open** |
| **tscircuit** `manual-edits.json` | one `{selector, relative_to, center}` record | **A** only; `relative_to` is **advertised-but-absent** | no group record (the *event* layer has one) | **no** (JSON, no comments) | **no — 2 lines** (`JSON.stringify(…,null,2)`) | yes, plain JSON + fold helpers | no |
| **`diodeinc/pcb` `.zen`** `# pcb:sch` | **one comment line per element**, x+y+rot+mirror together | **A** only, per-file coordinate space, not composed | **no record** — hierarchy only; a module becomes a sheet | **no — the grammar refuses it**: `// No trailing tokens allowed.` | **yes, the cleanest in the survey**, with a test guarding the blank line | **yes** — Rust merge API, Starlark values, LSP with `base_hash` guard | **yes — reconciled, idempotent, reversible**; but `pcb-kicad-sch` never reads `# pcb:sch` |
| **pcbGPT** Python DSL | one statement, **loops/ifs forbidden** | **none** | **yes** — `with circuit.functional_block("id","Label"):`, exactly one per part | no | yes, by the no-control-flow rule | write-only | forward only |
| **`lib/schgen/` (this repo, for scale)** | one `PartSpec`/`BlockSpec`/`SheetSpec` | none authored; template → rule library → ELK, in that order | **yes** — `BlockSpec.members`, from `include()` prefixes | **yes, in three places** — `PartSpec.source`, `ncUnlisted.reason` (**required**), `checklist[]` | yes (TypeScript object) | read and write | forward; round-trip gate in `gates/round-trip.ts` |

### Where every candidate fails, in one sentence each

- **Lcapy** — the best hint language in existence, and **no KiCad, no reason
  field, grouping only via raw LaTeX, and LGPL Python in a Bun repository.**
- **SchGen** — its measured win is **pin-name wiring, not relative
  placement** (Jaccard +33 pts vs +3 pts), its spatial-violation score barely
  moved, and hand-authored files become programs.
- **copperhead** — the architecture to read, and it **deliberately refuses the
  thing the brief asks for**: there is no placement intent, by design.
- **SKiDL/`schematizer`** — the only published tool-neutral hint schema, and
  **"there is no way to pin a layout down"** disqualifies it for a reviewed
  artifact.
- **WireViz** — the only one with real reason fields, and it is the wrong
  domain with no grouping and no EDA output.
- **circuit-synth** — the PRESERVED model needs no representation and
  therefore offers none; stale since 2026-03.
- **SchemDraw** — the best relative vocabulary, **write-only, and it cannot
  express connectivity at all.**
- **circuitikz** — the best output, **readable only by TeX**, and "one part" is
  not a unit.
- **`.kicad_sch`** — fully machine-readable, and **stores only the answer, never
  the reasoning**; its one intent slot is unreleased.
- **atopile** — generates no schematic at all, says so in its own README, and
  **its public repository is a stale 0.14 snapshot** while users install 0.15.
- **tscircuit props** — the best symbolic vocabulary and the best grouping
  construct in the survey, in **JSX inside a React-adjacent toolchain**, with
  a schematic placement vocabulary its authors deliberately kept poorer than
  the PCB one.
- **tscircuit `manual-edits.json`** — a real committed intent file, and its
  `relative_to` field **does not work**, it has no group record, no rotation,
  and a two-line diff per move.
- **`.zen` `# pcb:sch`** — the closest thing to the brief's description, no
  grouping record, no anchoring, **a grammar that refuses comments**, and
  **labelled legacy by its own authors**.
- **pcbGPT** — 1 star, and its DSL carries no placement; its value is two
  rules, not its code.

### The verdict

**There is no existing representation worth adopting, and the negative is
well-evidenced rather than a failure to look.** Fourteen systems, seven of them
read at source level, and **not one of them has all four of: a placement
statement, a grouping construct, a reason attached to a decision, and a
machine-readable round trip.** The field divides cleanly and the division is
structural, not accidental:

- **Everything that lets an author place things relatively is write-only.**
  SchemDraw and circuitikz have the vocabulary a person actually thinks in —
  `.at(opamp.out)`, `(FB -| OA.out)` — and resolve it by executing Python or
  expanding TeX. Nothing can read the intent back, and neither can express a
  netlist at all.
- **Everything that is machine-readable stores absolute final geometry or no
  geometry.** `.kicad_sch` keeps the answer and destroys the reasoning.
  copperhead and pcbGPT keep the reasoning and refuse the answer.
- **Nothing in EDA has a reason field. Fourteen systems, zero.** The only
  surveyed artifact with one is **WireViz**, a cable-harness tool — `notes:`
  per item, plus `authors`, `revisions` and a per-revision `changelog`. That a
  harness documenter solved this and no schematic tool did is the sharpest
  finding here. And `.zen` does not merely lack the field, it **refuses one**:
  `// No trailing tokens allowed.` means a trailing `# keep near the ADC`
  makes the record malformed and can silently truncate the rest of the block.
  **This is an unoccupied design space, not a solved problem to copy.**
- **The one project that built the brief's artifact has moved off it.**
  `diodeinc/pcb`'s `# pcb:sch` block is the closest existing thing to "an
  agent states placements, committed and reviewable" — one line per element,
  x/y/rot/mirror together, deterministically sorted, with a merge API and a
  test guarding against a stray blank line in the diff. And its own
  agent-facing skill file now says *"preserve **legacy** `# pcb:sch <ID> …`
  placement comments"* and documents a migration to a linked `.kicad_sch`.
  **That is the strongest available evidence on the design, and it is
  negative, delivered by the people who shipped it.**
- **And the one mechanism that could carry a reason in KiCad is not available
  to us.** `(custom_property "key" "value")` round-trips on `master` and is
  absent from the `10.0` branch; this repository's own sheets write
  `(version 20260306)`, which is the 10.0 version. A design resting on it rests
  on a nightly.

**Two systems converged independently on the same answer, and that convergence
is the strongest signal in the survey.** copperhead (TypeScript, JSON IR,
Apache-2.0, 666★) and pcbGPT (Python DSL, academic, 1★) share no lineage and
arrived at the same four decisions: **mandatory one-group-per-part with a human
label; connectivity by `REF.PIN`; no coordinates in the authored artifact; and
the geometry computed by something the author did not write.** copperhead goes
further and states the consequence as a rule — *"There is no way to pin a
symbol to a position, and that is the point."*

**But adopting that wholesale is not open to us, and `CLAUDE.md` is explicit
about why.** *"Agents do the placing and routing, of schematics and of board
layouts both … Taking the operator out of schematic and PCB creation is the
goal, not a risk to be managed."* An IR with no placement surface relocates the
decision into an engine; it does not remove the need for the decision to be
*recorded and reviewed*. copperhead's own source documents the cost of that
choice: the deadlock where *"the legibility findings never named BOM.md as the
thing to change"* burned **2h49m and all three attempts, twice** — the same
failure this repository already has on its books as the over-long `Value`
label. **A representation that cannot express a geometry fix converts every
geometry complaint into a hunt for which document to edit.**

**And `diodeinc/pcb` is the third answer, which neither of the first two
offers: the placement record lives in the `.kicad_sch`, and the generator is
forbidden from treating its own output as canonical.** This is the PRESERVED
model (circuit-synth, atopile's layout reuse) with the discipline the other two
lack, and the doctrine is worth re-reading beside `CLAUDE.md`'s invariant:

> *"`pcb apply` accepts any KiCad schematic hierarchy whose connectivity is
> equivalent to the evaluated Zener netlist. It does not require a particular
> sheet structure, label strategy, wire layout, item order, or placement
> policy. … Deterministic UUIDs on generated labels, wires, sheets, and other
> items **do not grant continued ownership of those items.**"*

> *"The generated document is not a canonical representation."*

**The netlist is authoritative for connectivity; the human's arrangement is
authoritative for arrangement; and equivalence is judged by a connectivity
reducer the generator did not write, with idempotence (`"the second must report
schematic unchanged"`) and reversibility as the acceptance tests.** That is
`CLAUDE.md`'s *"an agent may never author the acceptance criteria for the
artifact it is producing"* implemented as four named stages — Inspect, Decide,
Realize, Verify — where Verify *"accepts a realization only if every selected
issue is gone and no new issue appeared"*.

**This repository has the forward half of that (`gates/round-trip.ts`,
`gates/graph-match.ts`, `gates/connectivity.ts`) and not the reverse half.** It
regenerates; it does not reconcile. Whether it should is a separate question
from the brief's, and a bigger one.

**What this repository already has is, measured against the survey, ahead of
all eleven.** VERIFIED by reading `lib/schgen/ir/types.ts` (395 lines),
`lib/schgen/authoring.ts` and `lib/schgen/rules/orientation.ts`:

- `PartSpec.source` — *"Provenance: the design note section or datasheet the
  part and its values come from"*. **No surveyed system has per-part
  provenance.**
- `PartSpec.ncUnlisted: { reason: string } | null` — **a required reason on a
  deliberate omission.** Nothing else in the survey requires a reason anywhere.
- `checklist: readonly string[]` on parts, blocks **and** sheet notes.
- `BlockSpec.readsFrom`, whose own doc comment is the distinction nothing else
  in the survey draws: *"IT IS A STATEMENT ABOUT THE PICTURE AND NOT ABOUT THE
  CIRCUIT"*, with *"OPTIONAL, AND ITS ABSENCE IS NOT A SILENT DEFAULT"* and a
  test that counts the unstated cases and refuses a new one.
- `Rendering = { kind: "wired"; template; anchor: TemplateAnchor | null }` —
  **a reviewed template plus a named anchor with pin roles.** That is
  SchemDraw's `.at(opamp.out)` and circuitikz's `anchor=+`, in a form a
  machine can read back.
- A three-step authority order in `rules/orientation.ts`, spec §1.5: a reviewed
  template's orientation wins; else a circuit-independent rule library; else
  ELK, *"subject to fixed port geometry"*. And **`null` means step 3, not
  rotation 0** — *"A rule library that returned a rotation for everything would
  silently take the backend's half of §1.5 away."*

**That last point is the real answer to the brief.** The brief asks for a
representation in which an agent states a placement. This repository has
already decided that orientation intent lives in **a reviewed template**, not
in a per-part field — which satisfies `CLAUDE.md`'s *"an agent may never author
the acceptance criteria for the artifact it is producing"* in a way no
per-part `rotation` field can, and which no surveyed system does at all.
**Nothing in this survey improves on it. Seven narrower things would:**

1. **`stub_explicit`'s pattern, which is the single best field-level idea
   found.** SKiDL carries both the *effective* value and a boolean for whether
   a human set it, *"vs. an automatic heuristic the downstream tool may
   apply"*. This repository's `readsFrom`-plus-counted-test achieves the same
   end for one field; the SKiDL pattern generalises it to every field a rule
   might also supply. **Consider it wherever a rule and an author can both
   answer the same question.**
2. **copperhead's group vocabulary bound to a prose document.** `group` must
   match a `##` heading in `docs/SUBSYSTEMS.md`, case-insensitively, and the
   refusal lists the available headings. This repository derives blocks from
   `include()` prefixes (decision **D1**, correctly — *"recovering it by
   string-prefix matching would put the cut back in the generator's hands"*),
   so the *membership* question is already better answered here. What is not
   answered is **where a block's reason lives**: copperhead puts it under the
   heading, and `BlockSpec.title` is currently a string with nothing behind it.
3. **pcbGPT's no-control-flow rule, if a code-shaped artifact is ever
   considered.** *"Do not use for loops or if conditions in the schematic
   code."* It is the only stated defence against the SchGen failure where the
   authored artifact becomes a program and stops being reviewable.
4. **`symtx`'s composable four-letter transform** (`H`, `V`, `L`, `R`, applied
   left to right) rather than a `rotation: 0|90|180|270` plus `mirror: x|y|none`
   enumeration, **if** a transform is ever authored here. Enumerations do not
   compose; `"RH"` does, and it reads in a diff.
5. **tscircuit's `<schematicbox overlay={["U1","R1","C1"]} title="Input filter"
   strokeStyle="dashed">`** — a titled, optionally dashed region whose
   membership is *a list of names* and whose size is derived. It is Lcapy's
   `fit=(R2) (C2)` with a schema instead of raw LaTeX, and KiCad's
   `(group … (members "uuid" …))` one abstraction level up. **This repository
   emits no `(group ` element on any of its eight sheets** (VERIFIED above),
   and KiCad 10 supports them — so the drawn-region half of this is reachable
   today even though `(custom_property)` is not.
6. **tscircuit's `schOrientation`, which is a polarity-aware orientation rather
   than a rotation** — `"pos_top"`, `"neg_left"`, with the stated semantics
   *"horizontal means pins go 1->2 rightward … (generally, positive on top)"*.
   `rules/orientation.ts` already computes exactly this for a part with one end
   on a declared rail (*"a part whose GROUND end is pin 1 wants 180 and one
   whose ground end is pin 2 wants 0, and this computes which rather than
   tabulating it"*). **`schOrientation` is the name for what that rule
   returns**, and naming it would let a template state it without stating a
   number.
7. **tscircuit's `expectTypesMatch<Interface, z.infer<typeof schema>>(true)`
   discipline**, which is unrelated to placement and worth stealing anyway: a
   compile-time assertion that the hand-written interface and the runtime
   validator cannot drift. `lib/schgen/ir/types.ts` is interfaces and
   `ir/validate.ts` is the validator; nothing currently holds them together.

**And two things to stop looking for.**

- **A reason field in a KiCad schematic.** `(custom_property)` is the right
  mechanism and it is not in KiCad 10. The portable fallback — a hidden symbol
  `(property)` — attaches only to symbols, carries absolute geometry of its
  own, and cannot annotate a group, a region or a wire. **The reason belongs in
  the authored IR, which is committed anyway, and not in the derived sheet.**
  This is also what `CLAUDE.md` already requires: the record goes *"next to the
  thing it is about, in the form that can fail"*.
- **A relative-placement language that an agent can read back.** Eleven systems
  looked at; the ones with the vocabulary cannot be parsed, and the ones that
  can be parsed have no vocabulary. If this repository wants one, **it will be
  writing it**, and the two ingredients to take are SchemDraw's named-anchor
  model (`TemplateAnchor.roles` is already most of it) and circuitikz's `-|`
  projection operator, which is the one placement idiom in the survey with no
  equivalent anywhere else and which expresses *"align this with that"* in four
  characters.

### What this document does not establish

1. **Nothing here was run** except `pip download schematizer` (unpacked and
   read, not executed). Lcapy was not installed; no `.sch` was rendered;
   copperhead's engine was not invoked; SchGen was not executed (it needs KiCad
   8.0.9 and CUDA). **Every behavioural claim is from documentation or source,
   not from observed output** — which by this repository's own *"look at the
   output, not only the tests"* standard is the main weakness of this pass.
2. **Lcapy's solver was not tested for the failure it documents.** The claim
   that it *"refuses rather than guessing"* on over-constraint is the doc's,
   not a measurement. Whether its error is usable in an agent loop is unknown
   and is the thing most worth measuring next.
3. **copperhead's `engine.ts` (6 616 lines) was not read**, only `ir.ts`,
   `draft.ts` and the reference doc. How `hints.groupOrder` becomes a shelf
   layout is unverified.
4. **SchGen's `kicad_sch_interface.py` was read only around `connect_pins`,
   `connect_two_points` and `write_out_all_wires`** (about 60 of 1 583 lines).
   The claim that routing is fully deferred rests on those.
5. **Sections 7, 8 and 9 are RELAYED** from a parallel pass of this task,
   except the four KiCad claims this writer re-verified (the
   `FormatCustomProperties` body, the three branches' file versions, the
   `sch_group.h` branch availability, and this repository's own sheet
   versions). The SchemDraw and circuitikz claims were not independently
   re-checked.
6. **The KiCad `10.0` branch is not the same as the released 10.0.0 tag.** The
   file-version comparison used branch heads. The conclusion (`custom_property`
   is unavailable here) is corroborated independently by this repository's own
   sheets writing `20260306`, but the tag was not checked.
7. **§§10–12 (atopile, tscircuit, `.zen`) are RELAYED** from a second parallel
   pass, **except two claims this writer re-fetched and verified**:
   tscircuit's `manual_edits_file.ts` and `manual_schematic_placement.ts`
   (quoted whole), and `.zen`'s `crates/pcb-sch/src/position.rs` plus
   `crates/pcb-kicad-sch/test-data/analysis/simple.zen` (quoted whole). The
   remaining claims in those three sections — including every line number, the
   atopile grammar census, the tscircuit resolution-order code, and the whole
   of the reconciliation doctrine — were not independently re-checked.
8. **`.zen`'s `pcb apply schematic` was never run**, so the idempotence and
   reversibility claims are the project's documentation, not a measurement.
   Given that the whole doctrine rests on them, **running it twice on a
   generated project is the single highest-value follow-up in this
   document.**
9. **The atopile staleness finding rests on branch-head dates and tag/PyPI
   enumeration, not on reading the 0.15 source** (which is not public). The
   conclusion is "do not assume a feature is visible", not "0.15 has no
   schematic support".
10. **No claim is made about what the pcbGPT, PCBSchemaGen or MultModLM papers
    measure beyond their abstracts**, which are all that was read. pcbGPT's
    `schematic_policy.py` and `schematic_toolkit.py` *were* read.
11. **The arXiv title search used one query string** (`all:"schematic
    generation"`, 11 results) plus a failed `"schematic layout"` query. It is
    not an exhaustive literature sweep, and a paper that calls the problem
    something else was not found.

### Reproducing the measurements

```
curl -s https://api.github.com/repos/microsoft/SchGen/git/trees/main?recursive=1
curl -s https://raw.githubusercontent.com/microsoft/SchGen/main/schematic_generation/sch_examples/imu_L1.py
curl -s https://raw.githubusercontent.com/microsoft/SchGen/main/config.py
curl -s https://export.arxiv.org/api/query?id_list=2605.30345

curl -s https://raw.githubusercontent.com/mph-/lcapy/master/doc/schematics.rst
curl -s https://raw.githubusercontent.com/mph-/lcapy/master/doc/examples/schematics/fit1.sch

curl -s https://raw.githubusercontent.com/copperheadhq/copperhead/main/src/kicad/draft/ir.ts
curl -s https://raw.githubusercontent.com/copperheadhq/copperhead/main/docs/src/content/docs/reference/schematic-intent.md

curl -s https://raw.githubusercontent.com/devbisme/skidl/HEAD/src/skidl/schematic_netlist.py
pip download schematizer --no-deps -d ./schz   # then read x/schematizer-0.2.0.dist-info/METADATA

curl -s https://raw.githubusercontent.com/wireviz/WireViz/HEAD/docs/syntax.md

curl -s https://gitlab.com/kicad/code/kicad/-/raw/master/common/io/kicad/kicad_io_utils.cpp
curl -s https://gitlab.com/kicad/code/kicad/-/raw/master/eeschema/sch_file_versions.h
curl -s https://gitlab.com/kicad/code/kicad/-/raw/10.0/eeschema/sch_file_versions.h

curl -s https://raw.githubusercontent.com/tk-king/pcbGPT/HEAD/backend/agent/Prompts/schematic_policy.py

curl -s https://raw.githubusercontent.com/tscircuit/props/main/lib/manual-edits/manual_edits_file.ts
curl -s https://raw.githubusercontent.com/tscircuit/props/main/lib/manual-edits/manual_schematic_placement.ts

curl -s https://raw.githubusercontent.com/diodeinc/pcb/main/crates/pcb-sch/src/position.rs
curl -s https://raw.githubusercontent.com/diodeinc/pcb/main/crates/pcb-kicad-sch/test-data/analysis/simple.zen
```

And in this repository:

```
grep -c "(group " circuits/*/*.kicad_sch
grep -h -m1 -o "(version [0-9]*)" circuits/*/*.kicad_sch | sort | uniq -c
```
