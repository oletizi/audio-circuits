---
status: unreviewed
circuit: pultec-low-cut
tools: KiCad 10.0.5 + a hand-written edit script (no akcli on this pass)
prior: docs/research/2026-10-29-low-cut-full-run.md
input: docs/research/2026-10-29-low-cut-full-run/low-cut-hybrid.kicad_sch
output: docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch
---

# Collapse pass on pultec-low-cut: both duplicate on-page label pairs

**The drawing produced here is UNREVIEWED.** Nothing below is a judgement of any
page. Everything is a measurement, a statement of what is on the page, or a
statement of what changed and why. Per `EVALUATING-DRAWINGS.md` sections 1 and 2
the only qualified reviewer is the owner.

## What this pass was for

The previous pass (`2026-10-29-low-cut-full-run.md`) left two duplicate on-page
label pairs inside the Hi cut group and argued a defence for each. The owner has
since struck that whole mode of reasoning:

> *"Rather than try to come up with an exquisite line of reasoning about when
> duplicate on-page labels is good or bad, you should just assume you need to
> collapse them. I will tell you when I want you to use on-page labels."*

`EVALUATING-DRAWINGS.md` P1 now carries that as the rule and nothing more.
**So this pass applies the default and stops.** No test was applied, no defence
was weighed, and the two defences the previous pass wrote are withdrawn rather
than re-argued.

**Result: BOTH pairs collapsed. Zero duplicate on-page labels remain anywhere on
the page** — not only in Hi cut, re-measured across all six groups below.

## The two pairs, and what each became

| net | before | after |
| --- | --- | --- |
| `hcut_t2` | 2 global labels, `(133.35, 54.61)` and `(185.42, 63.50)`, 52.82 mm apart, both inside Hi cut | **1** label; one straight horizontal wire, 69.85 mm, no corners |
| `lo_boost_in` | 4 global labels, two of them inside Hi cut at `(146.05, 69.85)` and `(203.20, 76.20)`, 57.50 mm apart | **3** labels, one per group; one straight horizontal wire, 59.69 mm, no corners |

One `hcut_t2` label survives, at `(133.35, 54.61)` where it already was.
**It is not a duplicate and it is not a wire substitute** — it is the only thing
naming the net. `hcut_t2` is internal to Hi cut (`SI4.1`, `SI5.2`, `SI6.1`), so
with both labels deleted KiCad names it `Net-(SI4-Pad1)` and the net-name half of
the verification fails. A local label would give `/hcut_t2`, which is also a
different name, so the surviving label is global. This is the same job `hcut_t1`
already does for the sibling net two symbols away.

One `lo_boost_in` label survives inside Hi cut, moved to `(196.85, 73.66)` on a
3.81 mm stub teed off the new rail. The net has five pins across three groups
(`J1.3`, `SI3.1`, `SI6.2`, `SI7.2`, `SI8.2`), so it leaves the group and needs an
exit.

## SI5 was the obstacle, and SI5 moved

`SI5` sat at `(185.42, 69.85)`, body spanning y 67.31–72.39, **directly in the
corridor between SI3's right pin at `(143.51, 69.85)` and SI6's lo_boost_in pin.**
That is what made a straight run impossible and what the previous pass reported
as a reason for the labels. It is a report about where the part was sitting.

**The diagnosis, from the circuit rather than from the wire.** The netlist says

```
hcut_t2      (3) SI4.1 SI5.2 SI6.1
hi_boost_out (11) ... SI5.1
lo_boost_in  (5) J1.3 SI3.1 SI6.2 SI7.2 SI8.2
```

so `SI5` and `SI6` — the two halves of `RV_HI_CUT` — are **in series** through
`hcut_t2`: `hi_boost_out — SI5 — hcut_t2 — SI6 — lo_boost_in`. The page drew them
as two parallel verticals 17.78 mm apart with their tops strapped together, which
is the shape of a parallel pair. Redrawn as a series column at `x = 203.2`, with
the `hcut_t2` rail tapping between them, the corridor at `y = 69.85` is empty and
the run is one straight wire.

**Parts moved — two, both literals chosen by hand:**

| part | before | after | why |
| --- | --- | --- | --- |
| `SI5` | `(185.42, 69.85)` rot 180 | `(203.20, 53.34)` rot 0 | out of the `lo_boost_in` corridor; above `SI6` in series order. Rotation 0 puts pin 1 (`hi_boost_out`) at the top, pin 2 (`hcut_t2`) at the bottom on the rail |
| `SI6` | `(203.20, 69.85)` rot 0 | `(203.20, 66.04)` rot 0 | up 3.81 mm so its `lo_boost_in` pin lands on SI3's row, `y = 69.85`, making the rail straight |

`SI3` and `SI4` did not move. `hcut_t1` did not move.

**Field offsets were set explicitly, not carried.** This is the third known
second-order trap — copperhead sets field offsets per part, tuned to the
arrangement it produced. `SI5`'s Reference and Value went to `(207.01, 52.07)`
and `(207.01, 54.61)`; `SI6`'s to `(207.518, 64.77)` and `(207.518, 67.31)` —
each keeping the symbol-relative offset it already had. **Both were then looked
at in a rendered crop**, with their neighbours: `zoom-after-si5-top.png` and
`zoom-after-si6-label.png`.

## What is on the page now, in Hi cut

Six wires removed, five added. Net change +110.49 mm of wire, one wire fewer,
two global labels fewer, three junction dots more.

**Removed** (uuid-matched, whole five-line blocks):

```
(185.42, 66.04) -> (185.42, 63.50)     hcut_t2 strap, SI5 top
(185.42, 63.50) -> (203.20, 63.50)     hcut_t2 strap, SI5-SI6
(203.20, 66.04) -> (203.20, 63.50)     hcut_t2 strap, SI6 top
(185.42, 73.66) -> (185.42, 76.20)     hi_boost_out stub
(143.51, 69.85) -> (146.05, 69.85)     lo_boost_in stub at SI3
(203.20, 73.66) -> (203.20, 76.20)     lo_boost_in stub at SI6
```

**Added:**

| wire | length | corners | net | stroke |
| --- | --- | --- | --- | --- |
| `(133.35, 57.15) -> (203.20, 57.15)` | 69.85 mm | 0 | `hcut_t2` | `30 90 200` |
| `(203.20, 57.15) -> (203.20, 62.23)` | 5.08 mm | 0 | `hcut_t2` | `30 90 200` |
| `(143.51, 69.85) -> (203.20, 69.85)` | 59.69 mm | 0 | `lo_boost_in` | default |
| `(196.85, 69.85) -> (196.85, 73.66)` | 3.81 mm | 0 | `lo_boost_in` | default |
| `(203.20, 49.53) -> (203.20, 46.99)` | 2.54 mm | 0 | `hi_boost_out` | `130 50 170` |

**Junction dots added — three, each where three connections meet:**

- `(133.35, 57.15)` — SI4 pin 1, the stub up to the `hcut_t2` label, the rail
- `(203.20, 57.15)` — SI5 pin 2, the rail's right end, the tap down to SI6
- `(196.85, 69.85)` — the `lo_boost_in` rail and the stub down to its label

**Labels moved:** `hi_boost_out` from `(185.42, 76.20)` to `(203.20, 46.99)`,
above SI5 on a 2.54 mm stub; `lo_boost_in` from `(203.20, 76.20)` to
`(196.85, 73.66)`.

**No hairpin was created**, and no run was bent to avoid one: every wire added is
a single straight segment.

**The long runs, stated rather than buried.** The 69.85 mm `hcut_t2` rail is now
the third-longest wire on the page; the 59.69 mm `lo_boost_in` rail is fifth. The
138.43 mm `hi_boost_out` rail in Lo cut is still the longest and is untouched.
Both new rails cross the 40 mm void that already separated the `SI4`/`SI3` branch
at the Hi cut box's left edge from the pot at its right edge; that void is not
new and was not closed on this pass.

## What each surviving device in Hi cut is doing

| device | what work |
| --- | --- |
| `hcut_t2` global label, `(133.35, 54.61)` | the only name source for an internal net; without it the net is renamed and the netlist comparison fails |
| `hcut_t1` local label, `(133.35, 67.31)` | unchanged from the accepted page; names the SI4/SI3 junction |
| `lo_boost_in` global label, `(196.85, 73.66)` | the net leaves the group to `J1`, `SI7`, `SI8` |
| `hi_boost_out` global label, `(203.20, 46.99)` | the net leaves the group to `J1`, `SI2`, `RV1`, `C1`–`C7` |
| 69.85 mm `hcut_t2` rail | replaced the collapsed pair |
| 59.69 mm `lo_boost_in` rail | replaced the collapsed pair |
| three junction dots | three connections meet at each; none is orphaned |

No ground symbol is in Hi cut, so the repeated-ground criterion does not apply
here. The four on the page are unchanged.

## Verification, re-measured after the edit

**Netlist** — `kicad-cli sch export netlist --format kicadxml`, compared as sets
of `REF.PIN` per net *and* by net name, against the accepted page:

```
NET NAMES identical: True
NET PIN SETS identical: True
15 nets before, 15 after
```

**ERC** — `kicad-cli sch erc`, each sheet named `pultec-low-cut.kicad_sch` in its
own directory holding a `.kicad_pro` and a `sym-lib-table`, because otherwise
KiCad never reads the project's symbol library table and reports ten false
`lib_symbol_issues`:

```
BASELINE (low-cut-hybrid)   Found 0 violations
AFTER    (low-cut-collapsed) Found 0 violations
```

**True wire crossings — 0 before, 0 after.** A true crossing is a horizontal and
a vertical segment meeting at a point interior to both and not a shared endpoint.
T-meetings went 12 to 13; the one added is `(196.85, 69.85)`, which carries a
junction dot.

**Orphan junction dots — 0.** 17 junctions, every one with two or more wires
through it. This is the trap that no netlist comparison, no ERC run and no
layout lint sees, and it was re-run after the pass rather than assumed.

**Per-net stroke consistency — 0 clusters with mixed stroke.** Every added wire
carries an explicit stroke written from the sheet's own per-net colours:
`hcut_t2` `30 90 200`, `hi_boost_out` `130 50 170`, `lo_boost_in` default (the
sheet leaves that net uncoloured, and it renders green).

**Counts, before to after:** 64 wires to 63; 763.27 mm to 873.76 mm of wire;
16 global labels to 14; 8 local labels unchanged; 14 junctions to 17; 45 symbols
and 80 pins unchanged.

## Duplicate labels across the whole page, re-measured

Not only Hi cut. Every multi-label net, with the group each label falls in:

| net | labels | groups |
| --- | --- | --- |
| `hi_boost_out` | 4 | Junction, Hi boost, Hi cut, Lo cut — all different |
| `lo_boost_in` | 3 | Junction, Hi cut, Lo boost — all different |
| `in` | 3 | Junction, Hi boost, Mid — all different |
| `out` | 3 | Lo cut, Junction, Lo boost — all different |
| `hcut_t2` | 1 | Hi cut |
| `hcut_t1`, `hi_tap`, `c1_sel`–`c6_sel` | 1 each | local labels |

**No two labels of any net now fall inside one group rectangle.**

## Tool note: the edit was made by script, not by akcli

This pass did not use akcli. The six wire deletions, two label deletions, two
symbol moves and five wire additions were applied by
`scripts/collapse_pass.py`, which matches whole literal s-expression blocks and
exits non-zero if any match count is not exactly one. Every coordinate in it is a
literal; nothing loops over components computing a position.

**One defect in that script cost a rebuild and is recorded because it is
invisible in a rendered diff.** The first version bracketed each wire block by
searching forward for the first `)` after the uuid, which stops at the end of the
uuid line and leaves the block's own closing `\t)` behind. The sheet then had
three stray closing parens, parenthesis depth `-1`, and **`kicad-cli sch export
netlist` exited 0 and wrote a well-formed XML file with `<components/>` and
`<nets/>` empty.** No error, no non-zero exit — the netlist comparison is what
caught it, by reporting 15 nets before and 0 after. This is the "no reliance on
exit codes" rule in the practice design holding on a new tool: a parenthesis
counter was added to the check loop afterwards.

The two akcli traps that this pass therefore could not hit — uncoloured wires and
junction dots left behind by `delete_object` — were still checked for, because
the pass writes wires and deletes wires by other means and could leave the same
two defects. Both checks are above and neither reports a finding.

## What this pass did not do

- **The void in the middle of the Hi cut box was not closed.** Content now spans
  x 131.5 to about 217.5 inside a box spanning 129.54 to 220.98, with an empty
  band roughly x 150–195 at the rail level. Closing it means moving `SI3`/`SI4`
  right or the pot left, which is an arrangement change the brief did not ask for
  and which nobody has reviewed.
- **The `hi_boost_out` label above SI5 sits 1.27 mm below the Hi cut box's top
  edge.** Measured from the render, not assumed: the label's glyph top is at
  y 45.80, the box edge at y 44.45. Nothing overlaps, and the gap is the
  smallest on the page.
- **`#FLG01` and the four ground symbols are unchanged**, including `#PWR01`,
  which the previous pass put up for overruling and which no ruling has yet
  touched.

## Artifacts

All under `docs/research/2026-10-29-low-cut-collapse-pass/`:

| file | what it is |
| --- | --- |
| `low-cut-collapsed.kicad_sch` | the page, sha256 `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d` |
| `low-cut-collapsed.pdf` / `.png` | the rendered page |
| `zoom-before-hi-cut.png` / `zoom-after-hi-cut.png` | the whole Hi cut group, (126,42)–(224,82) mm |
| `zoom-before-si5-top.png` / `zoom-after-si5-top.png` | SI5 and the `hi_boost_out` label, (192,42)–(226,62) mm |
| `zoom-before-si6-label.png` / `zoom-after-si6-label.png` | SI6 and the `lo_boost_in` label, (176,58)–(226,82) mm |
| `zoom-before-si4-si3.png` / `zoom-after-si4-si3.png` | SI4, SI3 and the surviving `hcut_t2` label, (126,48)–(160,82) mm |
| `erc-before.rpt` / `erc-after.rpt` | 0 violations both sides |
| `scripts/collapse_pass.py` | the edit, every coordinate a literal |

The input page is unchanged at
`docs/research/2026-10-29-low-cut-full-run/low-cut-hybrid.kicad_sch`, sha256
`54900d50aad1a1ccca11ee6e827b1325e6e9aae76d37311eb42c75960804494b`.

**The page is unreviewed and is put up for the owner's judgement.** The regions
changed are the three zoom crops above, and per rule 8 of
`EVALUATING-DRAWINGS.md` they are the least-examined part of the drawing and are
flagged first.
