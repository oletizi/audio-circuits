---
title: Re-measurement against the pinned fork, and why κ_bench = 0.06 is wrong
date: 2026-10-10
status: findings
---

# Re-measurement against the pinned fork

Every figure in `2026-10-10-stripboard-placement-cost-design.md` and
`2026-10-10-stripboard-move-verb-findings.md` was measured with the VeroRoute fork at
commit `5a282a6`. Merging `feature/transistor-preamp` moved `veroroute.pin` to `2cfaad8`,
and the local build was stale against it, so those measurements were taken with the wrong
binary. This re-measures them with the right one.

**`bun run perfboard veroroute`** rebuilt the fork to `2cfaad8`. Everything below comes from
that binary.

## What the newer fork adds

`Src/Headless_dump_pins.cpp`, absent at `5a282a6`:

```
GRID <rows> <cols>
  Board::GetRows() and Board::GetCols(): the board's size in holes. Always emitted, once.
PIN <name> <pin> AT <row>,<col>
```

Confirmed by running both binaries against the same board: the old one emits neither line,
the new one emits `GRID` once and one `PIN` per placed lead (27 of them on low-boost).

**This retires three recorded gaps.** The MOVE findings document called the absent board
dimensions "most consequential"; `GRID` supplies them. The COST document had to reconstruct
`S_occ` with an add-wire clamp probe; `PIN` plus `GRID` plus `VERTICAL_STRIPS` supply it
directly. `2026-10-10-stripboard-pipeline-design.md`'s H-8 states that per-net geometry is
unobservable; against this fork it is observable, because every placed lead reports its hole.

`tools/guide/dump.ts`, merged from the same branch, is already a typed parser for this
grammar, transcribed from the C++ and cross-checked against a real dump.

## The cost model reproduces exactly

The identity `C = N + J − S_occ` was verified at `5a282a6` against an `S_occ` that had been
inferred. Read directly now, it is unchanged:

| board | GRID | strips | N | P | cuts | S_occ | J |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pultec-hi-boost | 35×35 | horizontal | — | 44 | 40 | 3 | — |
| pultec-hi-cut | 35×35 | horizontal | — | 35 | 32 | 3 | — |
| pultec-low-cut | 35×35 | horizontal | — | 27 | 23 | 2 | — |
| pultec-mid | 35×35 | horizontal | — | 71 | 65 | 4 | — |
| pultec-low-boost | 14×32 | horizontal | 9 | 27 | 5 | 5 | 1 |

Every cut count and every `S_occ` matches the value COST derived by probe, to the unit, and
the `R = 35` / `R = 14` board sizes match too. **The probe reconstruction was correct**, so
no conclusion in COST depends on the stale binary. What changes is that the terms are now
read rather than inferred.

## κ_bench = 0.06 would reject three working boards

This is the finding that changes a gate.

The pipeline design adopts `κ = J/(P − N)` with an admissibility bound `κ ≤ κ_bench`,
defaulting to **0.06** — low-boost's measured value — and records the risk that one board is
one data point. The merge brought three more hand-laid boards into reach, and they settle it:

| board | N | P | cuts | S_occ | J | κ | `make check` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pultec-low-boost | 9 | 27 | 5 | 5 | 1 | **0.055** | FAIL |
| pt2399-core | 21 | 65 | 12 | 17 | 8 | **0.181** | PASS |
| transistor-preamp-feedback | 11 | 37 | 5 | 13 | 7 | **0.269** | PASS |
| transistor-preamp-staged | 22 | 78 | 10 | 23 | 11 | **0.196** | PASS |

**low-boost is the outlier, not the norm.** The three boards that pass `make check` sit
between 0.181 and 0.269 — three to five times the proposed bound. An admissibility gate at
`κ ≤ 0.06` would refuse layouts the owner has already built and which are in service,
including `pt2399-core`, which this repository describes as transcribed from a board that was
physically built and works.

A bar no existing artifact clears is not a bar; it is a bug that happens to be strict. The
spec's own §3.4 named this risk ("extrapolation from n = 1") and made `κ_bench` a parameter
so the extrapolation would be visible and replaceable. It is now replaceable.

**What to replace it with is deliberately not decided here.** Four boards still cannot
support a fitted threshold, and COST §5 is explicit that five could not either. What the
measurement establishes is the *direction and magnitude* of the error, not a new constant.
Setting the bound is a decision for the owner or for a reviewed rule file, not for the agent
whose output it grades.

## low-boost is also the only hand-laid board that fails

Worth stating plainly, because it bears on the benchmark. low-boost fails `make check` for a
known reason — it is stale against today's scaffolded model, holding nine parts where the
model now needs nineteen, and a terminal block where the junction is two header rows. Its
five cuts were correct for the nine-net circuit it was drawn against.

That is exactly what the B1-frozen / B1-current split in the pipeline design addresses, so
the split stands. But it means the benchmark set should not consist of the one hand-laid
board that does not currently pass. `pt2399-core`, `transistor-preamp-feedback` and
`transistor-preamp-staged` are externally authored, passing, and physically built, and they
belong in it.

## The identity's inapplicable case, found by accident

`transistor-preamp-lab` yields `C = 0`, `N = 18`, `S_occ = 17`, hence `J = −1` — impossible,
since `J = Σ(kₙ − 1) ≥ 0`.

It is not a counterexample. That board reports `CUT_STATE UNRESOLVED` with 19 `CUT_CONFLICT`
lines, so its zero cut count means "cuts could not be worked out", not "no cuts are needed".
The identity does not apply to a board whose cut state is unresolved, which is what the
pipeline design's hard constraint **H2** (`CUT_STATE COMPUTED`, never `UNRESOLVED`, never
`NOT_APPLICABLE`) already excludes.

Mildly useful consequence: a negative `J` is a sound detector for a board the identity cannot
describe, and it is cheaper to compute than reading `CUT_STATE`. Not proposed as a
replacement for H2 — stated because it is the kind of coincidence that looks like a bug
later.

## Limits

- `S_occ` here is computed as the number of distinct strips carrying at least one placed
  lead. On these boards that agrees with COST's probe-derived value exactly, but a strip can
  in principle carry a net through painted holes with no lead on it, so the two definitions
  are not identical in general. Where they could diverge is not established.
- `N` is taken as the `NODE` line count. It matches COST's independently derived net counts
  on low-boost (9), and is used consistently across the table, but no separate check was run.
- The four unfinished Pultec boards' `N` and `J` are left blank: with 19, 13, 7 and 6
  incomplete nets, their required joins are simply absent, so `J` would describe unfinished
  work rather than a layout. COST §2.3 makes the same point.
- Nothing here re-derives the floor table. COST states it against the current model already.
