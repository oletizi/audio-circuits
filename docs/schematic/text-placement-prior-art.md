Prior art: text placement as a problem space
===========================================

Research pass, 2026-10-21. **This document gathers evidence. It designs
nothing, proposes nothing, and recommends no change to any module.** A written
design reviewed before implementation is a separate step.

Why it exists
-------------

The owner, on reading the third round of work on `field-placement.ts`:

> *"Have you stopped to actually think about text placement issues as a general
> problem space and research prior art on the subject. My guess is that your
> approach has been extremely naive and you've given up and made it a me problem
> instead of a you problem."*

**He was right on the first clause and the research bears out the second.**
Four prior-art documents in this directory cover GRAPH layout - crossings,
bends, angular resolution, annealing as a consumer of a cost function over part
and wire positions. **Text placement appears in none of them.** `[MEASURED-HERE]`
`grep -rni "label placement|point-feature|point feature"` over every `.md` and
`.ts` in the tree returns **4** hits, none of them about this; `grep -rni
"leader"` returns 23, of which the ones about labelling are in
`tools/guide/` and one clause of `readability-research.md`.

Meanwhile three rounds of work measured one implementation's failure rate
(**G232**, **G239**, **G257**, **G258**) and escalated it to the owner as a
scope decision. **The problem those rounds were measuring has a name, a
complexity result, a standard objective function, a thirty-year algorithm
literature, a published empirical comparison, and an open-source reference
implementation inside KiCad itself.** None of that was consulted.

How to read the evidence marks
------------------------------

Following `generation-prior-art.md`'s convention, because its reason holds: the
difference between a landing page and a thing you read is the difference between
a claim and a fact.

| Mark | Means |
| --- | --- |
| `[PAPER-FULL]` | I extracted the paper's own text and am quoting its method, formulas and numbers from it |
| `[PAPER-ABS]` | I read only an abstract, a landing page, or a search-result extract. **Method and metric details are not established** |
| `[PAYWALLED]` | Identified, not readable. Named so a later reader knows it exists |
| `[CODE]` | I downloaded the actual source file and read it. Line numbers are to the file as fetched |
| `[THIRD-PARTY]` | Someone else's survey, issue tracker or summary. Useful for leads; its verdicts are its own |
| `[MEASURED-HERE]` | I ran a command in this worktree and am reporting its output |

**Two limitations that apply to everything below.**

1. **I ran no labelling algorithm.** I did not implement PFLP, did not run
   simulated annealing against this repository's blocks, and did not build
   KiCad and watch its autoplacer work. `[CODE]` means *"I read the source"*,
   not *"I observed the behaviour"*. Every behavioural claim about KiCad in §5
   is read off its code and is re-checkable by building it.
2. **Two sources are `[PAPER-FULL]` and the rest are weaker.** Christensen,
   Marks & Shieber and Bekos, Niedermann & Nöllenburg were extracted to text
   locally with `pdftotext` and read. Everything else in §1-§4 is an abstract,
   a search extract, or a secondary restatement, and is marked.

1. The canonical formulation
----------------------------

**The problem has a name: point-feature label placement, PFLP.** The brief's
guess that Christensen, Marks & Shieber is the standard reference is
**confirmed**.

### Christensen, Marks & Shieber 1995 - read in full

**"An Empirical Study of Algorithms for Point-Feature Label Placement"**, Jon
Christensen (Harvard), Joe Marks (Mitsubishi Electric Research Laboratories),
Stuart Shieber (Harvard), *ACM Transactions on Graphics* 14(3):203-232, July
1995, DOI `10.1145/212332.212334`. `[PAPER-FULL]` - the author's own
preprint PDF, extracted locally.

Its own statement of the problem, verbatim:

> *"Point-feature label placement (PFLP) is the problem of placing text labels
> adjacent to point features on a map or diagram so as to maximize
> legibility."*

**It is a combinatorial optimisation problem and the paper says so in those
terms:** *"Like all such problems, two aspects must be defined: a search space
and an objective function."*

**The search space.** *"An element of the search space can be thought of as a
function from point features to label positions, which we will call a
labeling."* Positions come either from *"an explicitly enumerated set"* -
Figure 1 of the paper shows **eight** candidate positions for a point feature,
numbered by desirability - or from *"a continuous placement model... for example
by specifying a circle around the point feature that the label must touch
without intersecting."*

**The objective function, which the paper attributes to Yoeli (1972), has
exactly three terms:**

> - *"The amount of overlap between text labels and graphical features
>   (including other text labels);"*
> - *"A priori preferences among a canonical set of potential label positions (a
>   standard ranking is shown in Figure 1); and"*
> - *"The number of point features left unlabeled. (This criterion is pertinent
>   only when point selection is incorporated into the PFLP problem.)"*

**"Point selection" is the paper's term for being allowed to drop a label**:
*"In certain variants of the PFLP problem, we allow a labeling to omit certain
points and their labels (presumably those that are most problematic to label,
or least significant to the labeling application). When this option is included,
the PFLP problem is said to include point selection."*

### The complexity result, and exactly what is proven

**What is NP-complete is the FEASIBILITY question, and the paper is precise
about it.** It first reduces the optimisation problem to a decision problem:

> *"Is there an admissible labeling, a labeling with a score of zero, in which
> no labels overlap and no point features are obscured? The NP-completeness of
> this admissible-labeling problem has been established independently by at
> least three different teams of researchers (Kato and Imai, 1988; Marks and
> Shieber, 1991; Formann and Wagner, 1991)."*

and then: *"the admissible-labeling result implies that optimal PFLP is
NP-hard."* The instance it proves this for is *"a discrete placement model
comprising four equally favored candidate positions"* with point selection
disallowed.

**Two polynomially solvable restrictions are named**, and the first is worth
recording because it bounds how much a small candidate set buys you: *"a
placement model that allows only two potential positions for each label results
in a problem that is solved easily in polynomial time (Formann and Wagner,
1991)"*, as does *"the restricted set of problem instances in which no potential
label position overlaps more than one other potential label position."*
Everything of practical interest is NP-hard: *"any complete search algorithm
will be impractical, any practical algorithm incomplete."*

### The conflict-graph formulation

**Confirmed, but it belongs to a different line of the literature than
Christensen et al.** Christensen et al. do not use the phrase; the conflict
graph appears in the integer-programming and metaheuristic line that followed.
`[PAPER-ABS]`, from search extracts rather than from a paper I opened: the
problem is *"represented in a conflict graph where each node represents a
candidate position for a label and each edge a potential conflict (overlap)
between two candidate positions"*, and with label-number maximisation as the
objective *"this problem can be seen as the traditional maximum independent set
problem."* **I did not open a paper that states this**, so the attribution is
unestablished and only the shape of the claim is recorded.

**Zoraster's 0-1 integer-programming formulation IS in Christensen et al. in
full**, `[PAPER-FULL]`, and it is the conflict graph written as constraints:
one variable `X(i,k)` per candidate position, `sum_i X(i,k) = 1` per feature
("each point be labeled exactly once"), and `X(r,s) + X(r',s') <= 1` for each
of the `Q` pairwise overlaps between possible label positions - *"a second set
of constraints expresses the requirement that no two labels overlap"* - with
objective `sum_k sum_i W(i,k) X(i,k)` where *"`W(i,k)` is a weighting that
represents placement preferences."* Zoraster relaxes the overlap constraints
into the objective with Lagrangian multipliers.

### Imhof and Yoeli, the cartographic source of the preference ordering

`[PAPER-ABS]` for both; I did not obtain either. Christensen et al. cite Imhof
(1962; 1975) for labelling quality and note that *"Imhof's analysis is
descriptive, not prescriptive"*, and take their objective function from Yoeli
(1972).

**Imhof's five rules, `[PAPER-ABS]` from a secondary restatement and NOT read
in the original**, are relayed here because two of them are criteria this
repository has no measure for: names *"1) should be legible; 2) should be easily
associated with the features they describe; 3) should not overlap other map
contents; 4) should be placed so as to show the extent of the object; 5) should
reflect the hierarchy of objects."* The same source relays Imhof recommending
the **top-right** position as most favourable - *"Where space allows, it is best
to have the name beginning to the right of the symbol or sign"* - which is a
quote-of-a-quote and is marked as such. **Imhof, *Positioning Names on Maps*,
*The American Cartographer* 2(2):128-144, 1975, was not retrieved and its
preference ordering is therefore not established here.**

2. The standard objective is maximisation. It is not a feasibility test
----------------------------------------------------------------------

**The brief's belief is correct, and the literature is unambiguous.**

Christensen et al.'s scoring metric throughout the experiments is *"a score
... equal to the fraction of labels placed without overplots"*, averaged over
25 random instances per problem size. **The vertical axis of every results
figure is labelled** *"the fraction of labels plotted without obstruction."*
Not a boolean. Not a pass.

**And the paper enumerates exactly what a greedy algorithm does when a label
cannot be placed - three options, and refusing the drawing is not among
them:**

> *"Instead of undoing previously computed label placements, as with exhaustive
> search and its variants, any point whose label cannot be placed can be
> treated summarily: the point can be left out if point selection is allowed
> (Langran and Poiker, 1986), or it can be labeled even though a label overlap
> or feature obscuration results. (A third option, that of appealing to a human
> oracle for assistance, is noted by Yoeli (1972) as a practical alternative.)"*

**That sentence is the single most load-bearing retrieval in this document.**
Drop the label, draw it overlapping, or ask a person. **This repository's
implementation does a fourth thing - refuse to produce the drawing at all -
and I found no source that does that.**

**There is also a measured cartographic preference between the first two
options**, which bears on which escape a schematic should take, `[PAPER-FULL]`
as a footnote in Christensen et al. relaying Ebinger and Goulette (1990): *"In
many types of production-quality maps, overplots are preferred to exercising
point selection."* In cartography, drawing it on top of something beats not
drawing it.

### The empirical comparison, which the brief asked for and which I retrieved

Six algorithms, `[PAPER-FULL]`: random placement (a *"straw-man"* lower bound),
greedy depth-first, discrete gradient descent, Hirsch's continuous
overlap-vector method, Zoraster's Lagrangian relaxation, and simulated
annealing. Four candidate positions each except Hirsch's (continuous), all four
*"taken to be equally desirable"* in the main trials. Instances: `n` = 50, 100,
… 1500 features with fixed 30x7 labels on a 792x612 region (*"a typical map
scale for an 11 by 8.5 inch page size"*), 25 layouts each; then naturally
occurring data from the USGS GNIS Massachusetts file at `n` = 50 … 500.

**Result:** *"simulated annealing performs significantly better across the full
range of problems considered"*, and the ranking is preserved on the natural
data although all algorithms degrade faster there (*"the ratio of average label
size to available map area is significantly larger ... and also due to
clustering of the point features"*).

**The figure that most changes how to read this problem** is the paper's Figure
10: one 750-feature map labelled by all six algorithms, captioned with each
one's final objective value in *number of labels with overplots*. Random
placement **564**, greedy depth-first **341**, discrete gradient descent
**222**, Hirsch **222**, Zoraster **219**, simulated annealing **75**. On the
same instance, with the same candidate model: **a greedy first-fit pass leaves
4.5x as many conflicted labels as annealing**, and one cheap local-repair pass
over the greedy result removes a third of them.

**And the cost of implementing the winner, from the paper's own Table 1 lines-of-code
count:** simulated annealing was *"one of the easiest algorithms to
implement"*; the paper reports its own line counts as *"an admittedly rough
indication of implementation complexity."* **I did not retrieve Table 1's
numbers** - the figure captions carry objective values, and the LOC table did
not extract.

A second result bears directly on whether a preference ordering is worth
having: with *"the original four-position model without placement preferences"*,
*"most potential label repositionings have no effect on the value of the
objective function"* and zero-temperature annealing (plain random descent) does
nearly as well as full annealing. **Once placement preferences are included**,
*"the performance of zero-temperature annealing drops roughly to that of the
discrete gradient-descent algorithm."* A preference ordering is what makes the
search space non-flat and makes the annealing schedule earn its keep.

### Follow-on work, identified and not read

`[PAPER-ABS]` for all of these; they are leads. *"Empirical testing of
algorithms for variable-sized label placement"* (ACM `10.1145/262839.263039`) -
**variable-sized labels are this repository's case**, since a Reference is a
fixed-width reservation and a Value is not. *"A new mathematical model and a
Lagrangean decomposition for the point-feature cartographic label placement
problem"* (Elsevier, 2010). *"POPMUSIC for the point feature label placement
problem"*. Tabu search; a factor-4 approximation line; *"Beyond Maximum
Independent Set: An Extended Integer Programming Formulation for Point
Labeling"* (`10.3390/ijgi6110342`); *"Progressive Reinforcement Learning for
Point-Feature Label Placement in Map Annotation"* (`10.3390/ijgi15040162`).
*"Labeling Points with Weights"* and *"Trimming of Graphs, with Application to
Point Labeling"* (arXiv `0802.2854`) formulate the **weighted** problem, where
*"each point to be labeled comes equipped with a nonnegative weight used to
express priorities"* and the objective maximises the weight sum - which is the
formulation a `100nF` that must be drawn and a `Jumper_2_Open` that need not
would both fall under. `[PAPER-ABS]`, from a search extract.

3. The placement model: fixed positions, or sliding
---------------------------------------------------

**A distinction the literature treats as fundamental and which this
repository's implementation has on one side of without having chosen.**

A **fixed-position model** gives each feature a finite candidate set - 4 or 8
positions, the standard ones. A **slider model** lets the label slide
continuously along an edge or around the feature. `[PAPER-ABS]`, from search
extracts and the Bekos survey's terminology rather than from the primary paper:
the slider models are named **1SH, 2SH, 1SV, 2SV and 4S**, which *"define the
anchor segments of a label to be its bottom edge, its top and bottom edges, its
left edge, its left and right edges, and its entire boundary, respectively."*

**van Kreveld, Strijk & Wolff, "Point labeling with sliding labels",
*Computational Geometry: Theory and Applications*, 1999** is the reference.
`[PAPER-ABS]` - **I could not retrieve it.** Two fetch attempts failed
(`connect ECONNREFUSED` to the Würzburg mirror; the other hits were
secondary). Its headline claim, relayed from search extracts and therefore
**not established here**, is that *"continuously sliding labels allow more
points to be labeled both in theory and in practice"*, with factor-4 and
factor-5√2 approximation algorithms, and a later PTAS and factor-2
approximation for unit-height rectangles from van Kreveld et al.

**The quantity the brief would most want - how many MORE labels a slider model
places than a fixed-position model - I did not obtain.** A factor-4 ratio
between 1SH and 4S appears in a search extract; I could not confirm whether
that is an approximation factor or a labelling-count ratio, and the two are not
the same claim. **Recorded as an open question, not as a number.**

Christensen et al. note the comparison problem from the other side,
`[PAPER-FULL]`: Hirsch's continuous model *"allows a larger and therefore less-constrained
search space, [so] this probably gives Hirsch's algorithm an advantage"*, and
they suggest *"a fairer comparison could be obtained by running the discrete
algorithms with a 16- or 20-position placement model, as opposed to the
four-position model used in the experiments."* **They did not run it.**

4. Leader lines and boundary labelling
--------------------------------------

**The escape for a label with no room beside its feature is a studied problem
with its own taxonomy, its own quality criteria and a 54-reference survey.**

### Bekos, Niedermann & Nöllenburg 2019 - read in full

**"External Labeling Techniques: A Taxonomy and Survey"**, Michael A. Bekos,
Benjamin Niedermann, Martin Nöllenburg, *Computer Graphics Forum* 38(3):833-860,
2019, DOI `10.1111/cgf.13729`, arXiv `1902.01454v2`. `[PAPER-FULL]` -
extracted locally from the arXiv PDF.

Its own framing: *"External labeling is frequently used for annotating features
in graphical displays and visualizations, such as technical illustrations,
anatomical drawings, or maps, with textual information. Such a labeling connects
features within an illustration by thin leader lines with their labels, which
are placed in the empty space surrounding the image."*

**The terminology, which gives the parts of a leader their names** and is worth
transcribing because a design discussion without it reinvents them: the drawing
area `D` splits along a curve `C_R` into an **image region** `R` and a
**labeling region** `A`. A label `l` in `A` connects to its feature `f` by a
curve `λ`, the **leader**. The leader's endpoint inside `f` is the **site** (or
anchor) `σ`; its endpoint on the label's boundary is the **reference point**
`a`, and *"from the perspective of `l` we call this attachment point between
the leader `λ` and `l` the **port** `π(l)`"*. Sites, reference points and ports
are each **fixed**, **sliding** or **free**. *"Note that the site of a point
feature is always fixed, in fact the site and the feature coincide."* A leader
plus its placed label is a **callout**.

**The three distinctive features of the taxonomy**: admissible label positions
(general external / **contour labelling**, where reference points lie on a
predefined contour / **boundary labelling**, where `R` is a rectangle and
`C_A` is its boundary, subdivided 1-, 2-, 3- and 4-sided / **excentric
labelling**, a lens over a focus region); leader type; and the temporal
dimension (static vs dynamic labelings).

**The leader-type notation, which is the standard variant vocabulary.** A
leader of `k` segments is a string over `{s, r, d, o, p}`, ordered **from the
site to the reference point**:

- **s** - *"a straight-line segment with unrestricted slope"*
- **r** - *"lies on a ray that emanates from a given center point M"*
- **o** - *"orthogonal to a reference line or line segment m"*
- **p** - *"parallel to a reference line or line segment m"*
- **d** - a diagonal segment at turning angle ±α to its neighbours; *"with rare
  exceptions α = 45° is used"*

So the named variants are **s-leaders**, **r-leaders**, **o-leaders**,
**po-leaders** (two orthogonal segments), **opo-leaders** (three),
**do-leaders** and **pd-leaders** (orthodiagonal, 1-bend). *"[L]eaders
consisting only of o- and p-segments are called orthogonal leaders"*; with a
`d`-segment, **orthodiagonal**, and at ±45° **octilinear**. A bundle of leaders
sharing a reference point is a **hyperleader**.

**po-leaders are the baseline**: *"Orthogonal po-leaders are the simplest and
most commonly used polyline"* type, and *"[t]he most commonly used objective
function is to minimize total leader length."* opo-leaders are harder to read -
*"the readability of [opo-leaders is worse than] s-, po- or do-leaders, as
observed by Barth et al."* - but their middle `p`-segment lies **outside** the
image region, which *"implies that opo-leaders are particularly useful for text
annotation purposes."*

### The quality criteria, quoted in full

This is §3.2 of the survey, *"identified ... based on literature that justifies
them by interviews with experts and manual analysis of labeled drawings"*:

> - **C1** *The leaders have small length.*
> - **C2** *The number of leader crossings and label overlaps is small.*
> - **C3** *The labels mimic the shape of the image.*
> - **C4** *The labels are distributed evenly.*
> - **C5** *The directions of the leader segments comply with a set of preferred
>   directions.*
> - **C6** *The leaders have a small number of bends.*
> - **C7** *There is sufficient space between leaders.*
> - **C8** *Labels consist of single text lines if possible.*
> - **C9** *Labels that are semantically related are grouped.*

With the survey's own reading of them: *"Criteria C1 and C2 reduce visual
clutter and ambiguities and ease association between label and feature; a
crossing- and overlap-free solution is often preferred or even required."* C7
*"reduces ambiguities between leaders"*; C8 and C9 *"aim at a better legibility
and comprehensibility."*

**And the survey's own warning about ranking them, which is the same warning
`readability/measures.ts` already acts on for wires:** *"We stress that there is
not a clear, empirically confirmed ranking among these criteria, which is one of
the research challenges... We also stress that some of these criteria might be
in conflict with each other. As a result, a good labeling is usually a
compromise of different criteria. To this end, one usually scales the different
criteria by suitable weight factors to obtain a multi-criteria cost function."*

**Note C8 against this repository's case.** A unit's Reference and Value are
placed as a rigid two-line stack (§7). C8 says single text lines are preferable.
The literature's preference and this implementation's geometry point opposite
ways, and nothing in the repository has noticed.

### Mixed labelling - the formulation that matches this problem exactly

`[PAPER-FULL]`, survey §4.2.2.2. This is the structure a schematic needs and it
has a name:

> *"Bekos et al. [BKPS11] and Löffler et al. [LNS16] studied more general
> **mixed labelings**, in which each site can be labeled either with an internal
> label that is located directly to its top-right or with an external label
> through an opo-leader."*

**And the objective is maximising the number of INTERNAL labels** - i.e. place
as many labels beside their feature as possible, and leader-line the rest.
Named results: `O(n log n)` for uniform-height labels with external labels on
the right; for external labels on the **left** the problem *"is not symmetric
and it turns out to be more difficult"*, with a quasi-polynomial
`O(n^(log n + 3))` algorithm, a 2-approximation, and an ILP formulation. Löffler
et al. improved the left case to `O(n^3 (log n + δ))`.

Also directly relevant, `[PAPER-FULL]`: *"For the case that rectangular-shaped
obstacles (e.g., internal labels) are allowed within the image region R, which
must not be crossed by the leaders, Fink and Suri [FS16] presented an
`O(n^11)`-time algorithm"* for a length-minimal 1-sided solution with uniform
labels, and `O(n^27)` for the two-sided case. **Obstacle-avoiding leader
routing is solved and the exact algorithms are impractical** - which is the same
shape as everything else in this field.

### Leader rendering guidance

`[PAPER-FULL]`, relayed by the survey from Richards (2017), whose original I did
not read: leader lines *"should be straight wherever possible and they should
consist of a black line and right next to it, on one side, a thin white line to
separate the leader from the background."* Leaders for area features *"should
terminate with a terminator symbol, either a small dot if the feature is large
enough, or an arrowhead for small features."* And a caution that applies to a
schematic specifically, relayed from Wu et al.: *"in illustrations with many
straight lines of regular slopes (e.g., floorplans), curved leaders or straight
and polyline leaders with non-aligned slopes should be considered"* - because
*"[o]ne must ensure that lines in the background layer and leader lines can be
easily differentiated."* **A schematic is orthogonal wires on a 1.27 mm grid.
An orthogonal leader in that drawing looks like a wire.** That is the single
biggest obstacle to adopting leader lines here, it is stated in the literature,
and no source I found addresses it for circuit schematics.

### Empirical evaluation of leader labelling

`[PAPER-FULL]`, survey §4.4. *"[T]he most often proposed task is to associate
labels with their features and vise versa"*, by reading tasks or by selecting
labels; *"[t]ypical measures are the response times and error rates."* Only one
study used eye-tracking. **Barth et al. [BGNN18] is the one study of leader-type
readability as such**: *"straight-line leaders perform well when the user is
asked to associate labels with their sites and vise versa. However, concerning
the aesthetic preferences the users favored po-leaders and do-leaders."*
Measurable performance and stated preference disagree. `[PAPER-ABS]` for the
study itself - I did not open it.

The survey also names a technique for getting criteria from outside the
producing system, which is this repository's own invariant in a different
field: *"Niedermann et al. [NNR17] extracted drawing criteria in a
semi-automatic way from atlases of human anatomy"*, and *"interviews with domain
experts help to justify the extracted criteria."*

5. EDA-specific prior art: KiCad's own autoplacer, read in source
-----------------------------------------------------------------

**This is the closest neighbour and it is open source.** `[CODE]`:
`eeschema/autoplace_fields.cpp` from `gitlab.com/kicad/code/kicad` at `master`,
fetched 2026-10-21, **794 lines**, originally by Chris Pavlina (2015).

### What it does, from its own header comment

> *"Field autoplacer: Tries to find an optimal place for symbol fields, and
> places them there. There are two modes: "auto"-autoplace, and "manual"
> autoplace. Auto mode is for when the process is run automatically, like when
> rotating parts, and it avoids doing things that would be helpful for the final
> positioning but annoying if they happened without permission."*
>
> 1. *Compute the dimensions of the fields' bounding box* - `computeFBoxSize`
> 2. *Determine which side the fields will go on* - `chooseSideForFields`
>    1. *Sort the four sides in preference order, depending on the symbol's
>       shape and orientation* - `getPreferredSides`
>    2. *If in manual mode, sift out the sides that would cause fields to
>       overlap other items* - `getCollidingSides`
>    3. *If any remaining sides have zero pins there, choose the highest
>       zero-pin side according to preference order.*
>    4. *If all sides have pins, choose the side with the fewest pins.*
> 3. *Compute the position of the fields' bounding box* - `fieldBoxPlacement`
> 4. *In manual mode, shift the box vertically if possible to fit fields between
>    adjacent wires* - `fitFieldsBetweenWires`
> 5. *Move all fields to their final positions*

### The six facts that matter

**(a) The candidate set is FOUR, and there is no inside-the-body slot at all.**
`getPreferredSides` returns exactly `{RIGHT, TOP, LEFT, BOTTOM}` with their pin
counts. All visible fields go in **one shared bounding box** (`m_fbox_size` =
max field width by summed field height), so the candidate is a side, not a
per-field position.

**(b) The preference ordering is RIGHT, TOP, LEFT, BOTTOM, admitted as
unprincipled, and shape-dependent.** The code's own comment: *"The
preferred-sides heuristics are a bit magical. These were determined mostly by
trial and error."* Two reorderings fire: a horizontally mirrored symbol swaps
left and right, and **`if( w/h > 3.0 )`** - *"[i]f the symbol is very long"* -
swaps horizontal and vertical, so a wide flat symbol prefers top/bottom. Power
symbols get their own per-orientation ordering (*"[f]or power symbols, we
generally want the label at the top first"*).

**(c) It CANNOT FAIL. There is no refusal path, and the fallback is to place
the text overlapping.** `chooseSideForFields` initialises
`SIDE_AND_NPINS side = { VECTOR2I(1,0), UINT_MAX }` and, for each collision
class, calls `chooseSideFiltered`, which **erases** colliding sides from the
candidate list but first records the colliding side with the fewest pins into
`sel`. If every side collides, the list is empty, both subsequent loops do
nothing, and the function returns that recorded colliding side. **The fields are
then placed there, overlapping.** This is precisely Christensen et al.'s second
greedy option: *"it can be labeled even though a label overlap or feature
obscuration results."*

**(d) Collision severity is two-tiered, and horizontal wires are the soft
tier.** `enum COLLISION { COLLIDE_NONE, COLLIDE_OBJECTS, COLLIDE_H_WIRES }`.
In `getCollidingSides`, a `SCH_LINE` collider on a vertical side (`!side.x`)
whose endpoints share a `y` registers as `COLLIDE_H_WIRES`; everything else is
`COLLIDE_OBJECTS`. `chooseSideForFields` then filters `COLLIDE_OBJECTS` first
and `COLLIDE_H_WIRES` second, so **a side that only conflicts with horizontal
wires is preferred over a side that conflicts with anything else.** That is a
weighted objective in two discrete levels, built by hand.

**(e) There is a local-repair step, and it moves the text rather than giving
up.** `fitFieldsBetweenWires` applies on top/bottom sides only: if every
collider is a horizontal wire at a consistent offset modulo `WIRE_V_SPACING`
(100 mil), it recomputes the field box with fixed 100-mil row spacing and
rounds the box's `y` to that grid - **slotting the text into the gaps between
wires.** It bails out (`return false`) on any non-wire or non-horizontal
collider, and once it starts recomputing, *"[d]o not return false after this
point."*

**(f) In AUTOPLACE_AUTO mode, collisions are not considered at all.**
`DoAutoplace` passes `aAlgo == AUTOPLACE_MANUAL` as `aAvoidCollisions`, so the
mode that fires on rotation skips `getCollidingSides` entirely. **The checked
behaviour is the user-invoked one.**

Supporting detail: `getPossibleCollisions` merges the symbol box with each
candidate field box and collects every overlapping `SCH_ITEM`, expanding other
symbols into their visible fields; `getDrawableArea` means the **drawing-sheet
margin is an obstacle** (a side whose field box is not contained in the drawable
area registers `COLLIDE_OBJECTS`); padding constants are `HPADDING` 25 mil,
`VPADDING` 15 mil, `FIELD_PADDING` 15 mil, each annotated *"arbitrarily chosen
for aesthetics"*; and `fieldBoxPlacement` offsets the box past the outermost
pins' bounding box when the chosen side has pins - which is the ancestor of this
repository's `besidePinFields`.

### `CanAutoplace` and the repository's own data

`DoAutoplace` skips any field where `!field->IsVisible() || !field->CanAutoplace()`.
**`CanAutoplace()` is the `do_not_autoplace` property the brief points at.**

`[MEASURED-HERE]`, and **the brief's claim about it is wrong in two ways.**
`grep -rho "do_not_autoplace [a-z]*" --include="*.kicad_sch"` over this tree
returns **1208 occurrences, every one of them `no`** - so no committed property
anywhere opts out, which is the useful half of the claim. But:

| file | `(property ...)` lines | carry `do_not_autoplace` |
| --- | --- | --- |
| `circuits/pt2399-core/pt2399-core.kicad_sch` | 259 | 259 |
| `circuits/transistor-preamp/lab-board.kicad_sch` | 260 | 260 |
| `circuits/transistor-preamp/staged-board.kicad_sch` | 291 | 291 |
| `circuits/transistor-preamp/buffered-board.kicad_sch` | 202 | 202 |
| `circuits/transistor-preamp/feedback-board.kicad_sch` | 156 | 156 |
| `circuits/transistor-preamp/loop-board.kicad_sch` | 140 | **40** |
| `circuits/pultec/pultec-three-band-eq.kicad_sch` | - | **0** |
| `circuits/pultec/pultec-mid-band.kicad_sch` | - | **0** |

**Not "every property"** - `loop-board` carries it on under a third of its
properties - **and the Pultec schematics, which are the ones this repository
treats as authoritative, carry none.** So there is a reference data model in the
tree, on five of eight files, and the authoritative hand-drawn schematic is not
one of them.

### KiCad's own issue tracker says the four-candidate set is too small

`[THIRD-PARTY]`, read as a title and fetched summary rather than as a thread I
read end to end. **Issue #15868, open**, is literally a request to widen the
candidate set: *"[Request] Autoplace Fields placement above & below or to the
sides of the symbol when oriented horizontally in constrained spaces."* The
stated motivation is densely packed symbols - resistor arrays - where fields
overlap neighbours or wires. Related open or reported issues: #9345 (fields
placed centre-top collide with VCC pins), #14127 (*"Symbol field autoplace not
working correctly for some symbols"*), #15534, #20897 (sheet pins), #22927 (a
nightly regression in alignment and rotation).

**The upstream reference implementation has the same defect this repository is
measuring, has had it reported, and has not fixed it.** That is a fact about the
difficulty of the problem, not a licence to leave it.

### Other EDA tools

> **POINTER, ADDED 2026-10-22 - THIS SUBSECTION'S ALTIUM CLAIM WAS RE-RETRIEVED
> FROM THE PAGES THEMSELVES AND IS WRONG IN ONE PLACE.** This document is read and
> never rewritten, so the paragraph below is left exactly as it was and the
> correction lives in
> [`text-handling-research.md`](text-handling-research.md) **§4.6**, which quotes
> all three Altium pages by URL with a retrieval date.
>
> **The substance holds** - nine fixed positions, no overlap avoidance documented
> - and **two things do not.** (1) The exact sentence is *"all of which are
> classed as"*, not *"all classed as"*; the elision below is marked, so this is a
> shortening rather than a misquotation. (2) **The nine styles are the PCB
> editor's `Position Component Text` command, not a schematic designator
> feature**; on the schematic side `Autoposition` is a checkbox, and the page says
> the "automatic" in that phrase means *the text follows the component through
> rotation* - which is not a claim about clearance. §4.6 also establishes that
> Altium's schematic documentation **describes overlap as a normal state** managed
> by z-order commands, which is stronger than "no avoidance documented", and §4.7
> replaces *"I found nothing about ... OrCAD's designator auto-positioning"* with a
> retrieved manual in which the term returns zero hits over 31,433 lines.

`[THIRD-PARTY]`, vendor documentation read as search extracts and **not
verified by running anything.** Altium Designer offers *"[n]ine positional
styles ... all classed as 'automatic positions'"* for designator text, with an
`Autoposition` parameter that re-places the designator whenever the component is
rotated. **Nine positions, fixed, with no overlap avoidance documented**, and
the search found no claim that it checks collisions. I found nothing about
Eagle's or OrCAD's designator auto-positioning.

**And a negative finding, stated as a negative finding: I did not find any EDA
tool that places a reference designator or value with a leader line.** A
targeted search for the practice returned only general material about what
reference designators are. **This does not establish that nobody does it** - it
establishes that I looked and did not find it, and that a design proposing it
here would be proposing something I have no EDA precedent for. The precedent is
in cartography, technical illustration and anatomy (§4), and in this
repository's own build guides (§8).

6. Quality measures for text placement
--------------------------------------

**Ordered by how usable each is for a drawing with no reference answer.**

1. **Fraction of labels placed without overplot.** `[PAPER-FULL]`, Christensen
   et al.'s own metric, computable from geometry alone, no reference drawing
   needed, normalised to [0,1], higher better. **This is the standard measure
   and the repository has no analogue of it** - `field-placement.ts` produces a
   boolean per block.
2. **Count of labels with overplots**, the absolute form of the same thing, used
   as the objective value in the paper's Figure 10 captions.
3. **Yoeli's three-term objective**: overlap amount + position-preference
   penalty + unlabelled count. `[PAPER-FULL]` as restated by Christensen et al.;
   **the actual weighting is not given there and Yoeli (1972) was not
   retrieved.** The *shape* is established; the coefficients are not.
4. **Zoraster's `W(i,k)`** weighting per candidate position, i.e. the preference
   ordering as numbers in an objective. `[PAPER-FULL]` for the formulation;
   **the actual weights used are not in the paper's description.**
5. **The external-labelling criteria C1-C9** (§4), `[PAPER-FULL]`, each stated
   as a direction rather than a formula, with the survey explicit that no
   empirically confirmed ranking exists.
6. **Ambiguity of association**, measured behaviourally rather than
   geometrically: response time and error rate on a label-to-feature association
   task. `[PAPER-FULL]` for the survey's statement that this is the usual task;
   `[PAPER-ABS]` for every individual study. **No source I found gives a
   geometric proxy for association ambiguity**, which is the measure this
   problem most needs and is the gap that matches `generation-prior-art.md`'s
   finding for wires.
7. **Imhof's five rules** as cartographic priority criteria. `[PAPER-ABS]` and
   quoted from a secondary source; not retrieved.

**What is absent, and it is the same absence the earlier passes found for
wires.** No source I read publishes a validated geometric readability metric for
*text* placement. The two things that exist are a conflict count (which is a
feasibility measure in disguise, and the field's standard objective) and human
task performance. **SchGen's "Spatial Violation"** - *"normalized overlaps among
symbols/labels/wires"*, from `generation-prior-art.md` §4 - is the one
schematic-specific published measure that includes labels at all, and it is
overlap only.

7. What this repository actually does, verified clause by clause
---------------------------------------------------------------

The brief states a controller's reading and asks for it to be checked rather
than inherited. `[CODE]`/`[MEASURED-HERE]`, reading
`lib/schgen/render/field-placement.ts`, `text-boxes.ts`, `text-scene.ts` and
`layout-check.ts` in this worktree at `8e601b4`.

### Where the reading is right

| clause | verdict |
| --- | --- |
| *"outside slots on sides no pin leaves"* | **Correct.** `prepare` sets `freeSides = OUTSIDE_SLOTS.filter((s) => !t.tips.has(s))`, over `["right","up","left","down"]` |
| *"slots inside the body"* | **Correct.** `INSIDE_SLOTS` is five: `centre` plus the four quarter-centres |
| *"slots beside outermost pins"* | **Correct.** `besidePinFields(body, side, tips)` returns two per pinned side - beyond the extreme pin at each end |
| *"takes the first that clears"* | **Correct, and it is a pure first-fit.** `candidates(p).find((c) => blockerOf(c) === null)` |
| *"roughly eleven candidate boxes"* | **Correct for the part class that is failing, and not a constant.** For a vertical two-pin passive: 2 free sides + 5 inside + 2 pinned sides x 2 = **11**, which is also **G239**'s count. For a symbol with pins on all four sides it is **13** (0 + 5 + 8) |

### Where the reading is wrong, and the first of these is the one that matters

**(1) "if none clears it refuses the block" understates it: the placer is a
GREEDY SEQUENTIAL placer with no backtracking, and each unit's choice narrows
the next unit's options.** `tryPlaceFields` iterates `prepared` in placement
order and, after each success, pushes that unit's two text boxes onto `placed`,
which is then part of the `blockers` list for every later unit. **So a unit can
be unplaceable because of where an EARLIER unit's text went**, and nothing ever
reconsiders the earlier choice. In Christensen et al.'s taxonomy this is
*"greedy depth-first"* **with the backtracking removed and with no fallback on
failure** - the algorithm their Figure 10 scores at 341 conflicted labels of 750
against annealing's 75, minus the part that makes it terminate with an answer.
**The brief's description does not mention the sequential dependence at all**,
and it is the structural fact that most changes how this should be approached.
**G239**'s Task 22 amendment is the measurement that already half-implies it: it
had to move each unit *"to the front of the placement order so its search sees
the most permissive obstacle set the placer can give it"*, and found thirteen
units unplaceable even there - which establishes those thirteen are unconditional
and says nothing about how many more are order-dependent.

**(2) "candidate boxes adjacent to that part" - five of the eleven are not
adjacent, they are INSIDE the body.** Minor as prose, load-bearing as
geometry: the inside slots are governed by a different predicate
(`within(b, p.body)`, strict containment) and a different blocker set
(`p.interiorBoxes` instead of `own body`, plus `p.strokes` added to the
segments). They are an internal-labelling model, not a position in a
fixed-position model, and **G239** measures that all five are unusable for any
body shorter than `4 x GRID`.

**(3) "for each part" - it is per UNIT, not per part.** `scene.placements`
carries `part#unit`, and a dual op-amp's two units are placed independently with
separate field pairs.

**(4) "both texts" is not always two texts.** Task 21: a Value that is only its
symbol's part name is emitted hidden, so `texts(f)` returns the Reference alone
(`valueIsSymbolPartName`). The candidate must fit one box or two depending on
the part.

**(5) "the one 'leader line' occurrence in the whole repository is a
drafting-standards quote about line weights" is wrong.** `[MEASURED-HERE]`
there are **five**, and three of them are in `tools/guide/` describing a
**working leader-line label placer** that this repository already ships. See
§8; this is the largest single correction in this document.

**(6) "this branch built four readability measures for WIRES" - the type has
five fields.** `SchematicMeasures` is `bends`, `bendsPerEdge`, `crossings`,
`wireLength`, `occupiedArea`; the module header says *"SPEC §3.3's FOUR
MEASURES"* and also that `renderMeasures` *"emits exactly five numbers"*. **The
substance of the claim is correct and stronger than stated: not one of the five
measures anything about text**, and `occupiedArea` is a bounding box of wires
and pins.

### Two further facts neither the brief nor the register states

**(7) The Reference and Value are a RIGID PAIR at a fixed relative offset and
can never be placed independently.** `slotFields` returns
`reference` at `y - GRID` and `value` at `y + GRID` about the slot centre, at
the same `x` and justification, for every one of the eleven slots; so does
`besidePinFields`. **The thing being placed is a two-line block, not two
labels**, which means the effective label is always `4 x GRID` tall once grown
by `MARGIN` - exactly the quantity **G239**'s arithmetic turns on - and which
puts it on the wrong side of the survey's criterion **C8** (*"Labels consist of
single text lines if possible"*). KiCad does the same thing (one shared
`m_fbox_size`), so this is inherited convention rather than an oversight, but
nothing in the repository records it as a choice.

**(8) The refusal is reported as ONE obstacle pair chosen from a preferred
candidate, which is honest about itself but is not a measure.** On failure the
code re-runs `blockerOf(candidates(p)[0])` and reports that, with a comment
stating the reason: *"Every candidate is blocked, so there is no single obstacle
that caused this; what is reportable is what blocked the slot the placer wanted
first."* The register (**G232**, **G258**) already records that the first-unit
return makes each block's refusal line a floor. **In the literature's terms
there is no quantity here at all** - no count of conflicted labels, no fraction
placed, nothing that can get better or worse by degrees.

### Where this sits against the standard formulation

| | the literature | `field-placement.ts` |
| --- | --- | --- |
| placement model | fixed-position (4 or 8) or slider | fixed-position, 11-13 per unit, **including 5 internal** |
| what is placed | one label per feature | **a rigid 2-line block** per unit |
| search | annealing / gradient descent / ILP / greedy **with** fallback | greedy sequential first-fit, **no backtracking, no fallback** |
| objective | minimise overlaps + preference penalty + unlabelled count | **none - a boolean per candidate** |
| on failure | drop the label, draw it overlapping, or ask a person | **refuse to produce the drawing** |
| reported quantity | fraction of labels placed without overplot | **first blocked unit's first candidate's first blocker** |
| preference ordering | Imhof/Yoeli, cartographically justified | the candidate array's order, unjustified anywhere |

**On one axis the current approach is closer to the literature than the brief
implied, and this is recorded because being corrected is the point.** Its
candidate set is **larger** than KiCad's four and larger than the standard
four- and eight-position models, and it includes an internal-labelling option
that the standard point-feature model does not have at all. It also models far
more obstacle categories than KiCad does (§8). **The gap is not the candidate
set. It is that there is no objective function and no behaviour on failure.** A
first-fit search over eleven candidates with no cost function and no fallback is
the one combination the literature does not contain: every greedy algorithm
surveyed terminates with a labelling, and every non-greedy one has a number to
minimise.

8. What this repository already has that a solution would reuse
--------------------------------------------------------------

**(a) A scored, weighted, preference-ordered text placer with a least-cost
fallback, already written and shipping - in `tools/guide/placement.ts`, 88
lines.** `[CODE]`, this tree. This is the correction that most changes the
picture, and it was committed **2026-09-29** (`aaaf22d`), three weeks before
`field-placement.ts` landed (`af19271`, 2026-10-19).

It contains, independently and under different names, four of the five things
§7 says the schematic placer lacks:

- **candidates in preference order** - `leastCovered(candidates, boxOf,
  occupied)`, documented as *"Candidates are given in order of preference"*;
- **a cost function that is overlap AREA rather than a boolean** -
  `Occupancy.overlap(box)` returns *"[a]rea of `box` already covered (counted
  once per occupant), times this occupancy's weight"*;
- **weighted obstacle categories**, with the weighting argued in the source:
  `bodies` and `leads` weigh 1, `marks` weigh `MARK_WEIGHT = 2`, because
  *"[c]overing a mark (another tag, a cut, a pin) is what makes a printout
  ambiguous; crossing a lead or a body outline under a haloed label is only
  untidy. So when nothing is clear, marks weigh more."* **That is KiCad's
  `COLLIDE_OBJECTS` / `COLLIDE_H_WIRES` two-tier severity, arrived at
  independently in this tree**;
- **a fallback instead of a refusal** - *"The first candidate that covers
  nothing already drawn, or - when every candidate covers something, as on a
  crowded board - the one that covers least."* It throws only when **no
  candidates were offered at all**.

**(b) Leader lines with obstacle-aware routing and a halo, also already
shipping** - `tools/guide/render-edges.ts`. `[CODE]`: off-board connections are
*"labelled at the board edge nearest its pin, with a leader line to the pin's
hole and a ring round that hole so it is clear which pin the label means"*, and
*"[t]he leader runs straight along the pin's row or column when nothing else is
in the way. When another part's pin or a wire end sits between the hole and the
edge, it steps half a pitch into the gap between strips first, so it does not
pass through that other pin."*

In the survey's vocabulary (§4) that is **boundary labelling** with a **ring
terminator** at the site, an **o-leader** degrading to a **po-leader** on
obstruction, and the halo is Richards' guideline verbatim - `render-board.ts`:
coordinates are *"drawn last, with a white halo, so an edge label's leader line
breaks around them."* **The repository implements published external-labelling
practice and does not know that it does.**

**(c) `docs/known-gaps.md` G2 is already a text-placement quality finding, in
the literature's terms, without the vocabulary.** *"pad labels crowd the row
they sit in"*: `LO BOOST common` *"prints across the F7 pad's ring, while `LO
BOOST wiper`, which belongs to F7, is drawn a row lower"*, so *"[f]rom the image
alone the two labels can be read off the wrong rings"* - **that is ambiguity of
association**, Imhof's rule 2 and the survey's C1/C2/C7. And *"`LO CUT 100Hz`,
`150Hz` and `200Hz` are drawn to the LEFT of their pads while the other six are
drawn to the right, so the reading convention reverses within one drawing"* -
**that is a violated preference ordering**, Yoeli's second objective term.
**The repository has measured both standard criteria once, in prose, for a
different artifact.**

**(d) The text-box geometry** - `lib/schgen/render/text-boxes.ts`, 236 lines.
`textWidth` (one `GRID` per character, *"conservative for KiCad's stroke
font"*), `textBox`, `labelBox`/`labelExtent`, `powerValueBox`, `refsSpot`,
`frameTitleSpot`, `reservedReference`/`REF_DIGITS`, `fieldsWidth`,
`slotFields`, `besidePinFields`, `OUTSIDE_SLOTS`/`INSIDE_SLOTS`. **A candidate
generator and a label-extent model already exist and are shared by the checks
and the emitter** - the module's own invariant, *"what is checked is exactly
what is drawn."* Nothing in any formulation above requires replacing any of it.

**(e) The clearance primitives** - `lib/schgen/render/geometry.ts`:
`boxesOverlap`, `growBox`, `segmentHitsBox`, `placeBox`, `unionBox`,
`gridCeil`/`gridFloor`, `GRID`. **`boxesOverlap` is boolean; the overlap-AREA
quantity every objective function in §1 and §6 needs is not here**, and
`tools/guide/placement.ts` computes it inline. That is the one primitive a
scored formulation would need and the repository has it in the wrong place.

**(f) The obstacle model** - `unit-text.ts`'s `UnitText` (`body`, `pins`,
`decorations`, `interiorBoxes`, `strokes`, `tips`), and the fixed-obstacle
assembly in `tryPlaceFields` (wires, pin lines, pin numbers, outside names,
other bodies, power glyphs, power values, labels, DNP pin marks, fields already
placed). **This is a richer obstacle model than KiCad's**, which collects
undifferentiated `SCH_ITEM`s by bounding box.

**(g) The obstacle-category matrix** - `lib/schgen/render/obstacle-matrix.ts`
and its five `obstacle-pairs-*.ts` siblings, **14 categories, 105 cells**:
`body`, `pin-line`, `pin-number`, `pin-name`, `interior-graphic`, `wire`,
`junction`, `power-glyph`, `pwr-flag-glyph`, `label-outline`, **`field-text`**,
`frame-border`, `no-connect-marker`, `dnp-cross`. **This is the category
partition a weighted objective would assign weights over**, it is already
enumerated and reviewed, and `field-text` is already one of its rows. The matrix
is explicitly *"the LEDGER of which pairs a check decides"* and not a check -
so attaching a weight per cell changes nothing it asserts.

**(h) The masking mechanism, which any reformulation must not reproduce.**
`layout-check.ts`'s `textClearanceProblems` returns the field-placement refusal
**and early-returns**, never reaching `textProblems`, *because building a text
scene places fields.* **G258** is that finding. `text-scene.ts`'s
`UnitFieldMode: "placed" | "omitted"` is the one-direction-sound workaround and
its header states the asymmetry.

9. What I could not establish
-----------------------------

- **Nothing here was verified by running a labelling algorithm.** I implemented
  no PFLP solver, ran no annealing against this repository's blocks, and did not
  build KiCad. Every claim about KiCad's behaviour is read off `[CODE]` and is
  re-checkable by building it; every claim about an algorithm's performance is
  the authors'.
- **van Kreveld, Strijk & Wolff's sliding-labels paper was not retrieved**, so
  the quantity "how many more labels a slider model places than a fixed-position
  model" is **unknown**, and the factor-4 figure in a search extract could not
  be confirmed as a labelling ratio rather than an approximation factor.
- **Yoeli (1972) and Imhof (1975) were not retrieved.** The objective function's
  three terms are established via Christensen et al.; **its weights are not**,
  and Imhof's preference ordering here is a quote of a secondary source.
- **Christensen et al.'s Table 1 (lines of code per algorithm) did not
  extract**, so the implementation-cost comparison is an unquantified claim.
- **Every follow-on PFLP paper in §1 is `[PAPER-ABS]` or an identified title.**
  The variable-sized-label study (`10.1145/262839.263039`) is the closest to
  this repository's case and was not read.
- **The conflict-graph / maximum-independent-set attribution is from search
  extracts**, not from a paper I opened.
- **Barth et al. [BGNN18]**, the one leader-type readability user study, was not
  opened; its result here is the survey's restatement.
- **KiCad's issue tracker entries are titles and fetched summaries**, not
  threads read end to end, and I did not check whether any has a merge request.
- **Commercial EDA behaviour is unverified.** Altium's nine positional styles
  are a documentation claim read as a search extract. I ran no commercial tool.
  I found nothing on Eagle or OrCAD.
- **I did not search patents systematically.** One surfaced incidentally in
  Christensen et al.'s footnote 7: **US 5,355,314 (Feigenbaum, 1994)**, a
  force-directed label placer with attractive forces toward the labelled
  feature, labels *"grown to their full size over the course of the physical
  simulation"*, friction damping, and *"the Imhof standards for point-feature
  label preferences"* incorporated - *"currently in commercial use"* as of 1995,
  and too recent for the paper to include in its comparison. **Not read.**
- **I did not research text placement in graph drawing specifically** - edge
  labelling, vertex labelling in laid-out graphs - which is a distinct
  literature adjacent to the four passes already in this directory.
- **I did not establish whether any schematic tool anywhere uses a leader line
  for a designator or value.** §5 records that as a search that found nothing,
  not as an absence.
