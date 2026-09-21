# Schematic Readability Standards

## Why this document exists

A schematic whose connections are mostly net labels is a netlist with
pictures attached. It is logically complete and humanly useless: you cannot
trace a signal, you cannot see a feedback loop, and you cannot judge a board
layout from it.

This project **requires a human** to review every schematic and to do PCB
placement and routing. Readability is therefore a functional requirement, not
a matter of taste. Functional requirements need numbers — otherwise they
regress the moment nobody is looking, and "it looks fine to me" becomes the
only quality gate.

These metrics are computed from **rendered circuit JSON**, so they measure
what a reader will actually see, not what the source intended.

Tooling: `lib/testing/schematic-metrics.ts`. Run `bun run schematic-check`.

## The metrics

### Gratuitous labels — the headline number

**There is no zero-label policy, and there should not be one.** Labels are
genuinely the right choice in several situations. What is not acceptable is a
label that exists because nobody decided anything.

So every label is classified, and only one class is a defect:

| Class | Meaning | Verdict |
|---|---|---|
| `rail` | GND, VBIAS, VCC, VEE, 9V_RAW, 9V_PROT, VBIAS_RAW | Always fine — wiring every ground connection is spaghetti |
| `cross-boundary` | The net connects components in different schematic groups — it crosses a module boundary | Fine — **detected from the render**, not declared, so it cannot be gamed |
| `same-component` | Two pins on one component | Fine — forced by the renderer, not chosen |
| `declared` | Author stated a reason in the module's `declared` map | Fine — that is the defensible choice being made explicitly |
| **`gratuitous`** | **Close enough to wire, not a rail, not forced, not declared** | **Defect** |

A gratuitous label is the unmeasured default: two things a few units apart
that could simply have been joined by a line. `CMP_COLL` with a net span of
2.3 units is not a labelling decision, it is an absence of one.

**A long span is deliberately NOT an exemption.** An earlier version of this
standard exempted any net whose endpoints were more than 8 units apart, and
noted in its own limitations that "a sufficiently sprawling schematic can
launder gratuitous labels into justified ones". Noting that hole and shipping
it anyway was incoherent: the rule rewarded exactly the sprawl the other
metrics penalise. "These are far apart" is a *question*, not an answer. If
the distance is genuine — feedback returning across a signal chain, a control
crossing functional blocks — say so with `declared`. Otherwise the placement
is the defect, and relabelling it fixes nothing:

```
R17 ------------------------------- Q3     is not improved by
R17 -- FOO                 FOO -- Q3
```

Module boundaries *are* auto-exempt, but by **measurement** rather than
assertion: a net whose ports belong to components in different schematic
groups is genuinely an interface, and that is visible in the render.

**The escape hatch is a reason, not a budget.** If a label genuinely belongs
somewhere the classifier would call gratuitous, declare it:

```ts
computeSchematicMetrics(el, {
  declared: {
    CMP_GR: "tapped by the sidechain two bands away; wiring it would cross the audio row",
  },
})
```

That turns an unmeasured default into a recorded choice someone can argue
with in review — which is the entire point.

### Signal label ratio (informational)

```
signalLabelRatio = signalLabels / (signalLabels + drawnTraces)
```

Kept as a coarse health indicator. **Not enforced** — it cannot distinguish a
label that earns its place from one that does not, which is exactly the
failure the classifier above exists to correct.

### Label collisions

Count of overlapping label bounding boxes. Character width is derived from
the render itself rather than assumed, so it stays correct across font
changes.

Overlapping text is unreadable by definition. This is also what spec §12.1
item 5 means by "no overlapping critical labels", which until now had no
mechanical check behind it.

### Wire crossings

Proper segment intersections between different traces — shared endpoints are
junctions, not crossings. Every crossing forces the reader to decide whether
two lines connect.

### Connection distance — the root cause

Placement is what produces readable or unreadable output. A connection
between adjacent components is trivially drawn as a wire; one across the page
degenerates into a label. So the other metrics measure symptoms, and this one
measures the cause.

Each net is reduced to its **minimum spanning tree** over its port positions
— the shortest wiring that would connect its members — and the MST hop
lengths are what a reader actually has to follow.

Measured on `optical-compressor`: 82 hops, median 4.0 units, p90 13.3, max
30.8, and **19 hops (23%) longer than 8 units**. Those 19 are where labels
come from.

### Area per component

Bounding-box area divided by component count. Catches both failure modes:
sprawl (components scattered so every connection becomes a long run that
degenerates into a label) and cramming (components so tight that labels
collide).

## The standard

| Metric | Standard | Rationale |
|---|---|---|
| **Gratuitous labels** | **0** | Every label must be a rail, a long span, forced by the renderer, or declared with a reason. |
| Label collisions | **0** | Overlapping text is unreadable. Non-negotiable. |
| Signal label ratio | informational | Cannot tell a justified label from a lazy one; not enforced. |
| Wire crossings | **≤ 0.15 × components** | Some crossing is unavoidable; proportional budget. |
| Area per component | **6–30 sq units** | Bounds sprawl and cramming together. |
| Labels on any one signal net | **≤ 3** | A signal net appearing many times should have been drawn. |
| Long-hop fraction | **≤ 10%** | Connections over 8 units degrade into labels. Bounds placement directly. |
| Median hop | **≤ 5 units** | Typical connection should be short enough to read as a line. |

## Current state — the standard is NOT met

Measured at the time of writing:

| Module | Gratuitous | Collisions | Crossings | Area/comp |
|---|---|---|---|---|
| `optical-compressor` | **15** ❌ | **8** ❌ | 2 ✅ | 23.5 ✅ |
| `opamp-buffer` (pre-existing) | **6** ❌ | **1** ❌ | 0 ✅ | 32.6 ❌ |

The compressor's 67 labels classify as 28 rail, 22 cross-boundary, 2
same-component and **15 gratuitous** across 6 nets — `CMP_COLL` (span 2.3),
`CMP_BUF_OUT` (2.6), `CMP_BASE` (2.8), `CMP_OUT` (2.8), `CMP_IN` (6.5),
`CMP_GR` (7.4), `CMP_DET` (7.4), `CMP_IN_BUF` (8.2). Four of those nets were introduced while
fixing an unrelated label-overlap problem, by converting drawn wires into
net-routed connections. That is precisely the kind of silent degradation this
metric exists to catch.

Two things worth stating plainly:

1. **Neither module meets the standard.** This is not a defect introduced by
   recent work — the pre-existing `opamp-buffer` is worse. The pattern was
   project-wide and simply unmeasured.
2. **The standard is the target, not a description of the code.** It is
   written as what a reviewable schematic requires, not as whatever the code
   currently produces. Grading on the curve would defeat the point.

## Enforcement: a ratchet

Because no module meets the standard yet, the test enforces a **ratchet**
rather than the standard directly:

- Each module has a recorded ceiling in `lib/testing/schematic-standards.ts`.
- Metrics may **improve** freely. Any **regression** fails the build.
- When a module's measurements beat its ceiling, lower the ceiling in the
  same commit. The ratchet only turns one way.
- When a module reaches the standard, delete its ratchet entry and let the
  standard apply directly.

This makes the gap visible and non-increasing, which is the honest position:
we know what good looks like, we do not meet it yet, and we cannot silently
get worse.

## How to improve a schematic's numbers

Roughly in order of effect:

1. **Wire the gratuitous ones.** `bun run schematic-check` names them with
   their net spans. A span under 8 units is a wire waiting to be drawn.
2. **Place connected components adjacent.** Distance is what turns a
   connection into a label, and it is what moves a net from `gratuitous` to
   `long-span` for the wrong reason — sprawl should not launder a label into
   looking justified.
3. **Route local topology pin-to-pin** — feedback loops, dividers, RC
   networks, series chains. The drawn line is the information.
4. **Reserve `net.X` routing for rails and genuine cross-band connections.**
5. **Keep net names short.** Label width drives collisions, and the required
   module-name prefix already consumes much of the budget.
6. **Do not add test points to serve unit tests.** They become real parts and
   real clutter; assert on nets instead.

## What the experiments established

Three findings, each from an A/B measurement rather than inspection:

1. **`schTraceAutoLabelEnabled` is inert** in tscircuit 0.0.1253. Toggling it
   changed nothing, in either the named-net or pin-to-pin style. It is not
   the lever it appears to be.
2. **Pin-to-pin traces halve the labels.** The same detector chain rendered
   4 labels when routed through named nets and 2 when routed pin-to-pin.
   Critically, a **two-terminal** connection wired pin-to-pin produced **no
   label at all** — a pure wire.
3. **Multi-terminal junctions still produce one label** when wired
   pin-to-pin, with an ugly concatenated auto-name. So the trade is: one
   ugly label per junction (pin-to-pin) versus one clean label per member
   (named net). For a 3-member node that is 1 vs 3.

The consequence for this codebase is blunt: the schematic was constructed as
a collection of named nets, which turns `createGrid`'s spatial layout back
into a netlist. `lib/layout.ts` and the connectivity convention were working
against each other.

**Convention going forward:** name a net when it is a rail, a module
boundary, an off-board connection, or a genuinely meaningful interface node.
Do NOT name one merely because the topology needs a node identity —
`DET_IN`, `BASE`, `EMITTER`, `BUF_OUT` and `COLL` are all nodes that should
have been drawn.

`@tscircuit/schematic-trace-solver` is present in the dependency tree and
describes itself as a trace-routing and net-label-placement algorithm using
a minimum spanning tree. It is the layer that decides wire-versus-label, and
is the right place to look next for whether this is fully fixable from the
source side.

## Known limitations

- Two pins on the **same chip** connected to each other always render as a
  label pair — tscircuit will not route around its own symbol. An op-amp's
  unity-gain feedback is invisible no matter how it is expressed. This is a
  renderer constraint, and the metric cannot distinguish it from an avoidable
  label.
- Label bounding boxes are estimated from character count. Good enough to
  catch real collisions; not pixel-exact.
- `long-span` is granted by distance alone, so a sufficiently sprawling
  schematic can launder gratuitous labels into justified ones. The
  area-per-component bound is the counterweight, but the two should be read
  together rather than separately.
- Nothing here measures whether the *layout* is logical — that signal flows
  left to right, that power sits above ground. Those remain human judgement.
