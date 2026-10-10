# Adding a headless MOVE verb to the vendored VeroRoute fork: findings

Investigation only. No C++ was modified, no `.vrt` under `boards/` was written, and
nothing here is a plan of record — it is what the code says and what the binary did
when run.

**Subject.** `.tools/veroroute-perfboard`, binary at
`.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute`.

**Why.** The pipeline that places and routes stripboard from a circuit model has no
actuator. The headless verb set is `--import`, `--check`, `--update`, `--dump-board`,
`--adopt`, `--set-strips`, `--stretch`, plus the test-only `--author`,
`--verify-gui-reconcile`, `--verify-tango-import` and
`--verify-transactional-apply`. None of them moves a part.

**Line references** are to `.tools/veroroute-perfboard/Src/` unless stated otherwise.
Every number in the Measurements section is from a run recorded below; anything not
measured is marked as undetermined rather than estimated.

---

## 1. What the Board/component layer already exposes

### 1.1 There is no absolute-position move. There is a DELTA move, and it is `Board::MoveComps`

The answer to "is there already a method that moves a placed component to a given
row/column" is **no**. What exists is a relative move:

- `Board::MoveComps(const std::list<int>& compIds, int deltaRow, int deltaCol)` —
  `Board_components.cpp:1080`, declared `Board.h:875`.
- `Board::MoveUserComps(int deltaRow, int deltaCol)` — `Board_components.cpp:1019`,
  declared `Board.h:871`. A thin wrapper: it reads the user group out of
  `GroupManager` and forwards to `MoveComps`.

Both take a **delta**, never a destination. Nothing in `Board.h`, `Board*.cpp`,
`CompManager.h`, `Component.h` or `FootPrint.h` takes a target row/column for an
already-placed part. The only place a component is given an absolute position is
`Board::AddComponent` (`Board_components.cpp:77`), which is part of *creating* a
part, not moving one — see §3.

An absolute move is therefore `delta = target - current`, computed by the caller from
`Component::GetRow()`/`GetCol()` (`Component.h:404-405`). That arithmetic is trivial,
but it is **not** equivalent to a destination-setting API, for one reason that matters:
`MoveComps` wraps coordinates toroidally (§1.4), so a delta that overshoots does not
fail — it lands somewhere else.

### 1.2 What the GUI's drag gesture calls

Traced the way `Headless_stretch.h` traces the mouse-wheel gesture.

**Selection** (mouse press, `mainwindow_events.cpp:329-340`):

```
if ( compMode != COMPSMODE::OFF )
{
    const int compId = !AllowCurrentTextId() ? m_board.GetComponentId(m_gridRow, m_gridCol) : BAD_COMPID;
    if ( GetCurrentCompId() != compId ) SetCurrentCompId(compId);
    GroupManager& groupMgr = m_board.GetGroupMgr();
    if ( GetShiftKeyDown() )
        groupMgr.UpdateUserGroup( GetCurrentCompId() );
```

i.e. a grid hit test for the compId, `SetCurrentCompId`, then `ResetUserGroup` (plain
click) or `UpdateUserGroup` (shift-click). `Headless_author.cpp:104-131`
(`ClickSelectComps`) already mirrors exactly this, including the already-selected
guard, and is the thing a move verb should reuse rather than re-derive.

**The drag itself** (`mainwindow_events.cpp:814-834`):

```
else if ( !GetSmartPan() && AllowCurrentTextId() == false && AllowCurrentCompId() && compMode != COMPSMODE::OFF )
{
    if ( HaveZeroDeltaRowCol(deltaRow, deltaCol) ) return;
    ...
    const bool bAutoPanned = m_board.MoveUserComps(deltaRow, deltaCol);
```

**The keyboard nudge** (`mainwindow_events.cpp:1013-1016`) is the cleaner counterpart
for a headless verb, because it carries the guard a move verb needs:

```
case Qt::Key_Left:  if ( !m_board.GetDisableMove() ) { m_board.MoveUserComps(0,-1); UpdateHistory(...); RepaintWithRouting(); } break;
```

So the GUI's own sequence is: **hit test → `SetCurrentCompId` → `ResetUserGroup` /
`UpdateUserGroup` → `GetDisableMove()` guard → `MoveUserComps(dRow, dCol)`**, with
`UpdateHistory` and `RepaintWithRouting` being window state that `Headless_author.h`
already establishes is not persisted and may be omitted.

`MoveComps` itself then does, in order (`Board_components.cpp:1086-1143`):

1. `GetFootprintBounds(compIds)` — the selection as one rect; returns early `false` if
   the rect is invalid.
2. `rect.Move(deltaRow, deltaCol)`, then up to two `Pan()` calls if the moved rect
   would leave the grid. **This grows the board**, exactly as the growing half of
   `Board::StretchUserComp` does.
3. `WipeAutoSetPoints()`.
4. Per component: `MakeToroid(newRow, newCol)`, `TakeOff(comp)`, `SetRow`, `SetCol`.
   Note the order — the part is taken off the board **before** anything has checked
   whether the destination is free.
5. The same for the trax (track-pattern) component, if it has any size.
6. `PutDown(trax)`; then, only if the trax went down (or has zero size), `PutDown` on
   each moved component, then `PlaceFloaters()`.

### 1.3 "Placed" is a real, persisted flag, and a failed move is silent

`Component::GetIsPlaced()` / `SetIsPlaced(bool)` — `Component.h:409` and
`Component.h:320`. `--dump-board` surfaces it directly (`Headless_dump.cpp:198-202`):

```
std::string PlacementField(const Component& comp)
{
    if ( !comp.GetIsPlaced() ) return "FLOATING";
    return "AT " + std::to_string(comp.GetRow()) + "," + std::to_string(comp.GetCol());
}
```

A placement fails inside `Board::CanPutDown` (`Board_components.cpp:159`), which
`PutDown` (`Board_components.cpp:359-362`) calls first and returns `false` on.
`CanPutDown` refuses for: the part already being placed (line 161); an SOIC part on a
board with no top layer (177); a duplicate wire between the same two holes (179-186);
the footprint being larger than the board (188-189); and then, per hole, surface /
hole-use / SOIC / nodeId collision against what is already on the grid (244 onward),
plus crossing-diagonal checks when diagonals are on (231-242).

**The critical consequence:** `MoveComps` neither returns nor records whether the move
succeeded. Its `bool` return is `bPanned` — *"return true if the grid was panned"*
(`Board_components.cpp:1080`). `PutDown`'s own `bool` is discarded at line 1139. A
move whose destination is occupied therefore leaves the part **floating**, having
already been taken off its old position, and says nothing.

This is not hypothetical. It is observable today through `--stretch`, which shares the
take-off/put-back shape. On a copy of `boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`:

```
$ veroroute --dump-board low.vrt | grep '^PART C19'
PART C19 CAP_FILM .22uF AT 3,13 SPAN 1

$ veroroute --stretch low.vrt --ref C19 --direction grow -o s1.vrt ; echo "exit=$?"
exit=0

$ veroroute --dump-board s1.vrt | grep '^PART C19'
PART C19 CAP_FILM .22uF FLOATING SPAN 1
```

Exit 0, no stderr, and a board saved with the part off it. The full dump diff is one
line:

```
2c2
< PART C19 CAP_FILM .22uF AT 3,13 SPAN 1
---
> PART C19 CAP_FILM .22uF FLOATING SPAN 1
```

Two further things that diff proves, both of which matter for scoring:

- The `CUT` lines did not change (still 5). A part falling off the board changed
  nothing about the derived cut list.
- The `NODE` lines did not change either: `C19.1` and `C19.2` are still listed as net
  members. `GetBoardMembership` (`Reconcile.cpp:51-65`) iterates
  `comp.GetNodeId(p)` — what the *component* records — not the copper. So the dump's
  net-membership block does **not** reflect a lost placement. The `FLOATING` field on
  the `PART` line is the only evidence in the dump that anything went wrong.

### 1.4 Coordinates: integer grid, origin top-left, row-then-column, and toroidal

Placement is in integer grid units — `Component::GetRow()`/`GetCol()` are the
footprint's top-left (`Component.h:486-487`: `GetLastRow() = GetRow() + GetCompRows() - 1`).
Row grows downward and column rightward: `Board_components.cpp:1095-1102` reads
`rect.m_rowMin < 0` as *"we'll go too far up"* and `rect.m_rowMax + 1 - GetRows() > 0`
as *"too far down"*. `--dump-board` prints `AT <row>,<col>` in that order.

**The grid is a torus.** `MoveComps` calls `MakeToroid(newRow, newCol)` on every
component (`Board_components.cpp:1113`), defined `Grid.h:356-370`:

```
void MakeToroid(int& row, int& col) const
{
    ...
    while ( row <  0 )          { row += GetRows(); }
    while ( row >= GetRows() )  { row -= GetRows(); }
```

So an out-of-range destination silently **wraps** rather than being refused. Combined
with the `Pan()` calls at step 2 — which grow the board when the *group bounds* leave
the grid — the relationship between a requested delta and the resulting row/column is
not the identity. An optimiser that assumes "I asked for (r,c), I got (r,c)" will be
wrong at the edges, and wrong in a way that looks like a successful move.

There is also a **rotation** axis, `Component::GetDirection()` returning `'W'`, `'E'`,
`'N'` or `'S'` (`Component.h:408`), with `Board::RotateComps`
(`Board_components.cpp:1146`) as its mutator. `GetCompRows`/`GetCompCols` are
direction-aware (`Component.h:484-485`). A move verb need not touch rotation, but an
optimiser will eventually want it, and it is a second missing actuator.

---

## 2. The minimum honest implementation of a move verb

Written in the style the existing `Headless_*` files use, because this fork's
convention is that a headless verb names the GUI call it mirrors at every step.

### 2.1 Grammar

```
--move BOARD --ref NAME (--delta R,C | --to R,C) -o OUTPUT
```

`--delta` mirrors the GUI gesture directly. `--to` is the form an optimiser wants, and
is `--delta` with the subtraction done inside the verb — but it must then **verify the
landing**, because of the toroid (§1.4). Offering `--to` without that verification
would be a verb that reports success for a move to a different hole than the one
asked for.

### 2.2 Call sequence

| Step | Call | GUI counterpart |
| --- | --- | --- |
| 1 | `Headless::LoadBoard` (`Headless.h:33`) | `MainWindow::OpenVrt` |
| 2 | `board.GetCompMgr().GetComponentIdFromName(refName)`; refuse on `BAD_COMPID` | the grid hit test at `mainwindow_events.cpp:332`, which has no headless equivalent — same substitution `Headless_author.h` note 2 already documents |
| 3 | `ClickSelectComps(board, {compId})` — i.e. `SetCurrentCompId` then `GroupManager::ResetUserGroup` + `CompManager::ClearTrax` | the plain click, `mainwindow_events.cpp:331-341`. `Headless_author.cpp:104-131` is this, already written and already corrected twice; reuse it, do not re-derive it |
| 4 | **Verify the selection took**: `groupMgr.GetIsUserComp(compId)` | no counterpart; this is `OpSelect`'s own check (`Headless_author.cpp:266-277`) and it exists because `ResetUserGroup` returns `void` and silently ignores `TRAX_COMPID` (`GroupManager.h:99`) |
| 5 | **Guard**: refuse if `board.GetDisableMove()` (`Board.cpp:809`) | `mainwindow_events.cpp:1013-1016`, which tests exactly this before nudging |
| 6 | Record each affected component's `GetRow()`/`GetCol()`/`GetIsPlaced()` **before** the move | no counterpart; needed for step 8 |
| 7 | `board.MoveUserComps(deltaRow, deltaCol)` | `mainwindow_events.cpp:825` (drag) and `:1013-1016` (nudge) |
| 8 | **Verify the effect** (see §2.3) | no counterpart |
| 9 | `Headless::SaveBoard` (`Headless.h:36`) | `MainWindow::SaveVrt` |

Omitted, and only these: `UpdateHistory` and `RepaintWithRouting`/`UpdateControls`,
which are window state and are not persisted — the single omission
`Headless_author.h` note 1 permits.

### 2.3 What it must verify before writing the board, and what could silently do nothing

`Headless_author.h` states the posture plainly: *"MOST OPS VERIFY THEIR OWN EFFECT
before the board is written, because several of the underlying calls return void and do
nothing silently when they cannot act."* Each of the following is a way a move verb
could write a board that looks moved and is not:

1. **`GroupManager::ResetUserGroup` returns `void`** and returns early for
   `TRAX_COMPID` (`GroupManager.h:99`). Checked by step 4.

2. **`ResetUserGroup` selects siblings too** (`GroupManager.h:97`: *"Reset the
   user-group with the comp (and its siblings)"*). A part that is in an operator-made
   group drags its whole group. The verb must not claim it moved one part; it should
   report every component the user group held. `OpSelect` already discloses this
   (`Headless_author.cpp:262-265`) and checks membership per name, never by count.

3. **`MoveUserComps` returns early and silently** for a zero delta and for
   `GetDisableMove()` (`Board_components.cpp:1021-1022`) — the latter being the same
   condition step 5 guards, so a verb without step 5 gets a clean exit 0 and an
   unchanged board.

4. **`MoveComps`'s `bool` is `bPanned`, not success** (`Board_components.cpp:1080`),
   and **`PutDown`'s `bool` is discarded** (line 1139). This is the headline silent
   failure: the part is floating and nothing says so. **Verify
   `comp.GetIsPlaced()` is true for every component that was placed before the
   move**, and refuse — without writing `OUTPUT` — when one is not.

5. **The trax gate.** If the trax component will not go back down, `MoveComps` leaves
   *every* moved component floating (`Board_components.cpp:1132-1142`). Covered by (4)
   if (4) checks all of them, which is why it must iterate the group rather than
   checking only `--ref`.

6. **The toroid.** `MakeToroid` wraps (`Grid.h:356`). For `--to`, **verify the part's
   final `GetRow()`/`GetCol()` equals the requested target**, and refuse otherwise.
   Note the subtlety: an interposed `Pan()` (step 2 of `MoveComps`) legitimately
   shifts *every* coordinate on the board, so "the part is where I asked" is only
   meaningful if the verb either refuses when `bPanned` is true or re-expresses the
   target against the panned board. Refusing on a pan is the honest cheap option; it
   is also a real restriction and should be said in the help text, not discovered.

7. **`GetFootprintBounds` returning an invalid rect** makes `MoveComps` return `false`
   having changed nothing (`Board_components.cpp:1086-1087`). Covered by step 8
   comparing against step 6's recorded positions.

8. **`assert` is live in this build.** `MoveComps` opens with
   `assert(deltaRow != 0 || deltaCol != 0)` and `assert(!GetDisableMove())`
   (`Board_components.cpp:1082-1083`), and the generated Makefile defines
   `QT_NO_DEBUG` but **not** `NDEBUG`:

   ```
   $ grep '^DEFINES' .tools/veroroute-perfboard/build/Makefile
   DEFINES       = -DQT_NO_DEBUG -DQT_WIDGETS_LIB -DQT_GUI_LIB -DQT_NETWORK_LIB -DQT_CORE_LIB
   ```

   `Headless_author.cpp:295` already records this fact about this build. So reaching
   `MoveComps` with a zero delta or a disabled move is a **process abort**, not an
   error message. A verb calling `MoveComps` directly (rather than through
   `MoveUserComps`, which guards both) must guard both itself.

One more, outside the verb: **an unrecognized flag launches the GUI and hangs.** Run
with a flag that is not in `kHeadlessFlags[]` (`Headless.cpp:87-101`),
`Headless::Run` returns -1 and `main()` opens a window:

```
$ timeout 5 veroroute --move low.vrt --ref C19 --to 5,5 -o m.vrt ; echo exit=$?
exit=124      # timeout; no stdout, no stderr
```

`--move`, `--place`, `--position` and `--move-comp` all behave this way today, which is
the empirical confirmation that no move verb exists. It also means a half-landed verb —
registered in `Headless_help.cpp` but not in `kHeadlessFlags[]` — hangs a build
instead of failing it. `tests/usage.test.ts` enforces the flag-array/help-text
agreement in both directions (`Headless.cpp:38-57`), so a new verb has that gate
already; it has to be added to **both** places.

### 2.4 Shipped or test-only

`--stretch` is `kShipped` and documented. A move verb has the same character — a
deliberate single edit to a named part — so `kShipped` plus a `Headless_help.cpp`
entry is the consistent choice. Note the requirement `Headless.cpp:76-86` places on
*every* entry and which a move verb meets naturally: never write to a path it derived
itself; `-o` required, no in-place default.

---

## 3. What `--import` does for placement today

A **naive row-major first-fit sweep**, with the board grown downward when it runs out
of room. `Board::BuildFromParsedNetlist` (`Board_import.cpp:380`) calls
`BuildAndPlacePart` per part, which calls `AddComponent(-1, -1, comp)`
(`Board_import.cpp:43`), and the `-1, -1` sentinel selects this branch of
`Board::AddComponent` (`Board_components.cpp:111-127`):

```
	else
	{
		// Try place the component in free space on the board.  Just used for Import() method
		bool bOK(false);
		while( !bOK )
		{
			for (int iRow = 0; iRow <= GetRows() - comp.GetCompRows() && !bOK; iRow++)
			for (int iCol = 0; iCol <= GetCols() - comp.GetCompCols() && !bOK; iCol++)
			{
				comp.SetRow(iRow);
				comp.SetCol(iCol);
				comp.SetDirection('W');
				bOK = PutDown(comp);	// false ==> the component has to float
			}
			if ( !bOK ) Pan(1, 0);	// No free board space, so pan the board down
		}
		return compId;
	}
```

Read exactly: for each part in netlist order, scan rows top to bottom and columns left
to right, take the **first** hole where `PutDown` succeeds, always at direction `'W'`;
if no hole on the whole board works, `Pan(1, 0)` to add a row and sweep again.

Four properties follow, and each is a statement about the baseline an optimiser must
beat:

- **There is no placement strategy to improve.** No netlist awareness, no connectivity
  term, no cost function, no grouping of a net's members. The sweep never consults
  `parsed.m_nets` — nets are painted *afterwards*, in the loop at
  `Board_import.cpp:396-424`, by which time every part is already fixed. So this is a
  thing to **replace**, not to tune. That is a cleaner finding than the alternative
  would have been.
- **It is order-dependent.** The result is a function of netlist part order, which is
  a function of the KiCad export. Nothing records that dependency.
- **It always succeeds.** The `while(!bOK)` loop grows the board until something fits,
  so `--import` cannot report a placement failure — only an unboundedly tall board.
- **Direction is always `'W'`.** No rotation is ever tried, so the baseline does not
  explore the rotation axis at all.

The `--help` text's statement that re-import discards placement is this: `Clear()` at
`Board_import.cpp:383` wipes the board before the sweep runs.

---

## 4. Granularity and transactionality

### 4.1 Measured cost of a board read, and of a read plus write

Measured on this machine, 200 invocations per row, wall clock divided by 200. Boards
copied into the scratchpad first; nothing under `boards/` was written. Script:
`scratchpad/measure2.sh`. Inputs: `pultec-low-boost.perfboard.vrt` (19,558 bytes, 8
parts, 10 pads, 9 nets, 5 cuts) and `pultec-mid.perfboard.vrt` (51,194 bytes, 21
parts, 28 pads, 23 nets, 65 cuts).

| Invocation | ms per invocation |
| --- | --- |
| `--version` (process-launch floor, no board) | 10.78 |
| `--dump-board` low (read only) | 11.48 |
| `--dump-board` mid (read only) | 11.71 |
| `--adopt` low (read + write) | 11.44 |
| `--adopt` mid (read + write) | 11.82 |
| `--set-strips` mid (read + write) | 11.81 |

All six exited 0; `--adopt` and `--set-strips` each wrote a 51,194-byte output, and the
dumps were 40 and 147 lines. (Checked separately, because a binary that failed
instantly would produce exactly these timings.)

**The board work is not the cost; the process launch is.** Subtracting the floor, a
load of the mid board plus a full save is about **1 ms**, and a load plus the whole
`--dump-board` pass — including `DeriveFabricationInstructions`, which computes all 65
cuts — is about **0.9 ms**. The 10.78 ms floor is Qt binary startup, and it is
**91%** of every invocation.

Consequences, stated as ratios rather than projections:

- A trial move costing one process launch is roughly **12 ms**, i.e. order 10² trial
  moves per second.
- A trial move inside an already-loaded board would cost order **1 ms** of load/save,
  or far less if the board is not re-saved per trial.
- So batching N moves into one invocation removes about **10.8 ms × (N−1)** of pure
  startup. At N = 100 that is ~1.1 s of launch overhead removed per batch.

What was **not** measured, and should not be assumed: the cost of `MoveComps` itself
(`TakeOff`/`PutDown`/`PlaceFloaters`) in isolation. It is inside the ~1 ms figure for a
board of this size, but `PlaceFloaters` is a `while(true)` loop over all components
(`Board_components.cpp:798-804`) and its scaling with part count and floater count is
undetermined here. Also undetermined: the cost on a board substantially larger than
the mid board — these are the two Pultec boards named in the task, and nothing larger
was tried.

### 4.2 Is there an existing batch or script mechanism?

**No.** Every verb takes one board and performs one operation.
`Headless_author.h` is explicit: *"One op per invocation: chaining is done by running
`--author` repeatedly, which also makes the order explicit."* `--stretch` moves one
component by one increment per invocation.

`Src/Headless_transactional.cpp` is **not** a batching mechanism and offers nothing
reusable for one. Read in full: it is `--verify-transactional-apply`, a `kTestOnly`
seam that loads a board, parses a netlist, calls `DiffBoardAgainstNetlist` and
`ApplyReconciliation`, and prints three lines — `APPLIED`/`REJECTED`,
`UNCHANGED`/`CHANGED`, and `errorStr`. It never saves
(`Headless_transactional.h`: *"This drives DiffBoardAgainstNetlist/ApplyReconciliation
exactly as RunUpdate does, but never saves"*).

Two things in it *are* relevant, though neither is batching:

- **`CaptureBoardDump`** (`Headless_transactional.cpp:44-51`) swaps `std::cout`'s
  stream buffer for an `ostringstream` around `PrintBoardDump`, so a verb can obtain
  the exact `--dump-board` text of an in-memory board without a file round trip. That
  is precisely the primitive a batching move verb needs to score a candidate
  in-process, and it already exists.
- **The transactional posture it tests.** `ApplyReconciliation` is expected to leave
  the in-memory board byte-identical when it rejects, and `--update` never saves on a
  failed apply. A batch move verb inherits that standard: if move *k* of *N* fails,
  either the whole batch is refused and `OUTPUT` never written, or the verb reports
  exactly which prefix landed. Silently saving a partial batch would be the one
  outcome the fork's existing verbs are all built to avoid.

### 4.3 Would a many-moves verb be with or against this fork's grain?

**With the grain for a shipped optimiser actuator; against the grain if it were
`--author`-shaped.** The distinction is the fork's own, and it is worth quoting
because it is the stated design posture:

`Headless_author.h` sets out the rule that each op *"performs the same call sequence on
the same objects as its counterpart, and each names that counterpart in a comment"* —
*"THIS IS NOT A PARALLEL IMPLEMENTATION."* A verb that applied 1,000 moves in one
process would have no single GUI counterpart; nobody drags 1,000 parts in one gesture.

But that rule is about **not reimplementing the primitive**, not about how many times
the primitive may be invoked. A batch verb that loops the §2.2 sequence — reusing
`ClickSelectComps` and `MoveUserComps` per move, guarding and verifying each — is
still *"the same call sequence on the same objects"*, applied N times. Nothing is
reimplemented. The GUI counterpart of the batch is "the operator did this N times",
which is exactly how `Headless_author.h` describes its own chaining.

Two constraints the fork's own documents impose on such a verb:

1. **`Headless.cpp:76-86`**: it must never write to a path it derived for itself.
   One `-o`, required.
2. **`Headless_author.h`'s verification rule**: per-move verification, not one check at
   the end. A batch that verifies only the final state cannot say which move broke it,
   and §2.3 lists five ways a single move does nothing quietly.

The honest shape, then: **`--move` (one move, `kShipped`, mirrors the gesture) first,
and a batch form only once the one-move form's verification is proven.** The one-move
verb is what makes the batch verb's per-move check reviewable; building the batch first
means writing the verification and the loop at once, with nothing to check the
verification against. At ~12 ms per invocation the one-move verb is already enough to
drive an optimiser doing order 10² trials per second, which is sufficient to find out
whether the scoring loop (§5) is even well-posed before optimising the actuator.

An alternative worth naming and rejecting on evidence: keeping the process alive and
feeding it moves on stdin. That removes the 10.78 ms floor entirely, and it is a
larger change — a REPL is a new interaction model, not a verb, and the fork has no
precedent for one. The measured numbers say the batch verb captures nearly all of the
available saving without that.

---

## 5. The scoring loop's read surface

`Src/Headless_dump.cpp` documents its own grammar at lines 34-173; `PrintBoardDump`
(line 423) emits, in order: `DumpComponents`, `DumpMembership`, `DumpPinNameTable`,
`ROUTING_ENABLED`, `VERO_TRACKS`, `VERTICAL_STRIPS`, `DumpFabrication`, `DIAGS_MODE`,
`DumpWires`.

### 5.1 What is exposed

**Per component** — one line each, sorted by name (`Headless_dump.cpp:244-255`):

- `PART <name> <type> <value> <FLOATING|AT <row>,<col>> SPAN <n>` where `SPAN` is
  `GetCompCols()`, direction-aware.
- `PAD <name> <value> <FLOATING|AT <row>,<col>> <FROM <ref>.<pin>|NOPROVENANCE>`
- Skipped entirely (`IsSkippedForDump`, line 178): `MARK`, `WIRE`, `VERO_NUMBER`,
  `VERO_LETTER`, `PAD_FLYINGWIRE`. Wires get their own `WIRE` line instead.

**Per net** — `NODE <nodeId> NAME <name-or-dash> <ref>.<pin> <ref>.<pin> ...`, plus
`NET_NAMES <n>`. This is **membership only**: which schematic pins are on which net.
Derived from `comp.GetNodeId(p)` (`Reconcile.cpp:51-65`), not from copper.

**Per cut / bridge** — gated on `CUT_STATE` being `COMPUTED`
(`Headless_dump.cpp:380-414`):

- `CUT <row>,<col>,<nodeId> <row>,<col>,<nodeId>` — one line per `StripCut`, the
  nodeId on each side read straight off the board rather than from the derivation.
- `SOLDER <row>,<col> <row>,<col>` — one per solder bridge between neighbouring strips.
- `CUT_UNCONNECTED_PIN <row>,<col> <ref>.<pin>` — holes the cut derivation treats as
  transparent.
- `CUT_STATE NOT_APPLICABLE` on a perfboard; `UNRESOLVED` plus `CUT_CONFLICT` lines
  when strip connectivity is not safely known, deliberately with **no** cut list.

**Per wire** — `WIRE <name> <FLOATING|AT <row>,<col>> ENDS <end> <end>` with each
`<end>` being `<row>,<col>,<gridNodeId>,<wireNodeId>`
(`Headless_dump_wires.cpp`). Emitted only for boards that have wires; both Pultec
boards have none.

**Per hole** — **nothing.** There is no hole grid, no occupancy map, no painted-copper
listing anywhere in the dump.

Confirmed on the real boards (`low.dump`, `mid.dump`):

| | low-boost | mid |
| --- | --- | --- |
| `PART` | 8 | 21 |
| `PAD` | 10 | 28 |
| `NODE` | 9 | 23 |
| `CUT` | 5 | 65 |
| `SOLDER` | 1 | 3 |
| `WIRE` | 0 | 0 |

The 5 and 65 match the task's stated cut counts, so the dump is the authority those
numbers came from.

### 5.2 Is it sufficient to score a candidate?

**Cut count: yes.** `grep -c '^CUT '`. Exact, and each line carries both nodeIds so a
scorer can independently check the two sides differ.

**Wire-bridge count: yes, with a caveat about which "bridge" is meant.** Two distinct
things are exposed and must not be conflated:

- `SOLDER` lines — solder blobs joining neighbouring strips. Countable.
- `WIRE` lines — jumper wires placed as components, with both ends' positions and
  nodeIds. Countable, and Manhattan length per wire is computable from the two ends.

Both Pultec boards have zero wires, so a scorer's wire term is untested against real
data here.

**Per-net segment counts: no. This is the gap.** The dump exposes net *membership*,
never net *geometry*. There is no per-hole copper listing, so none of the following is
computable from `--dump-board`:

- how many strip segments a net occupies, or how many separate runs it is in;
- track length, or total copper per net;
- which holes a net paints at all.

A proxy is available and should be labelled as a proxy: the bounding box of a net's
member pins, from `NODE` membership joined to `PART`/`PAD` positions. That supports
half-perimeter wirelength, which is the standard placement objective and is what the
sibling repo's placement scoring uses (§6). It is not a segment count.

**Also missing, and needed:**

- **Board dimensions.** The dump prints no `ROWS`/`COLS` line. Verified by grepping
  every `Headless_*` file for `GetRows()`/`GetCols()` — the only hits are inside
  `Headless_stretch.cpp`'s pan arithmetic. An optimiser cannot learn the grid size
  from the dump, so it cannot tell a legal destination from an off-board one, cannot
  compute board area as a cost term, and cannot interpret the toroidal wrap of §1.4.
  **This is the single most consequential omission for a placement loop**, and it is a
  one-line append to a grammar whose stated rule is that it is append-only in shape.
- **Component direction.** `'W'`/`'E'`/`'N'`/`'S'` is not printed. `SPAN` is
  `GetCompCols()`, which is direction-aware, so a rotated part's span reads correctly —
  but `GetCompRows()` is not printed at all, so the footprint's extent in the row axis
  is unknown. A scorer cannot reconstruct the rectangle a part occupies, and therefore
  cannot detect overlap or compute occupancy from the dump.
- **A placement-failure signal that survives into the net block.** §1.3 showed a
  floating part still appears in its `NODE` lines. A scorer that reads only `NODE` and
  `CUT` scores a broken board as a good one. The `FLOATING` field on `PART`/`PAD` is
  the one place to look, and any scorer must look there **first** and reject.

**Net sufficiency.** `--dump-board` is sufficient for a scoring function over
*cuts, solder bridges, jumper-wire count and length, and pin-bounding-box wirelength* —
provided the scorer rejects any board with a `FLOATING` part. It is **not** sufficient
for per-net segment counts, track length, occupancy, overlap, or anything needing the
grid size. Closing the gap needs appended dump lines (board dimensions and per-part
direction/rows at minimum), not a different tool.

---

## 6. What to reuse from the sibling place-and-route tooling, and what not to

### 6.1 Correction to the stated location

The task names `/Users/orion/work/pedals-work/pedals` with `tools/placement/`,
`make/krt.mk` and `pcb/rules/*.json`. **That repository has none of those.** It has
`tools/perfboard/`, `tools/veroroute/`, `make/perfboard.mk` and `make/veroroute.mk`,
and no `pcb/` directory at all.

The tooling described is in two sibling repositories:
`/Users/orion/work/pedals-work/digital-pedal-platform` and
`/Users/orion/work/pedals-work/fuzz-total-integration`, each with `tools/placement/`
(31 files, 3,441 lines), `tools/krt/`, `make/krt.mk`, `krt.pin`, and rule files at
`fuzz/boards/<board>/placement-rules.json`. Examined `digital-pedal-platform`, the
more recently touched. **Nothing in any of these repositories was modified.**

Worth noting for whoever ports this: `digital-pedal-platform/tools/perfboard/check.ts`
already spawns **this fork's binary** and parses `--dump-board` `CUT` lines. The port
is less of a cold start than it looks.

### 6.2 Reuse: the architecture

**1. Rules as versioned JSON with a strict loader.** `placement-rules.json` carries
`"schema": 1`, and `tools/placement/rules.ts` loads it through `rejectUnknown`,
`requireArray`, `requireNumber` (`tools/placement/strict.ts`) — an unknown key is an
error, not ignored. This is the same posture as this project's "refuse rather than
guess" and "an empty whitelist that refuses loudly beats a general rule that quietly
accepts a guess". Reuse the **shape and the strictness**, not the rule vocabulary.
Note also that each rule entry carries a free-text `note` recording *why* the number is
what it is — directly in the spirit of "refusals teach".

**2. The generate/grade split, with repair that cannot weaken acceptance.** The engine
seeds candidates; `checkIntent` grades each against intent plus repository rules;
`repairProximity` *proposes* moves and the caller re-grades with the **same full
check** (`tools/placement/repair.ts`: *"The repair only proposes; the caller grades the
result with the full intent check, so a repair can never weaken acceptance."*). This is
the single most valuable thing to carry over: an optimiser's move generator must never
also be its acceptance test. It maps onto §2/§5 exactly — the move verb actuates, the
dump scores, and the two do not share code.

**3. Named, explicit, lexicographic ranking.** `tools/placement/routeAll.ts` exports a
`RANKING` **string constant** stating the order in prose
(*"input/output gap (largest first: oscillation risk), then vias and back-layer track
(fewest first: a whole ground plane), then total track"*). A stripboard equivalent
ranks on cuts, then solder bridges, then jumper count, then wirelength — and the reason
for each position is written down beside it. Reuse the discipline of a declared,
reviewable ranking rather than a weighted sum with tuned coefficients.

**4. Termination on two conditions, one of which is "stop and fix the cause".**
`routeAll` stops once `passes` candidates pass (default 5) **or** when
`sameFailures` results in a row share a failure signature (default 3), on the stated
grounds that a repeated failure is *"a systematic cause to fix, not a candidate to
skip"*. `failureSignature()` builds that signature from the failing check names plus
the DRC violation types. This is directly portable: the stripboard signature is the
failing check names plus, say, the `CUT_CONFLICT` positions or the set of floating
parts. It gives an optimiser a principled stop that is not an iteration cap.

**5. Candidates in a run directory, never the canonical board, with adoption
separate.** Runs land in `build/<project>/<board>/place/<stamp>/`; only an explicit
`adopt-<board>` target writes a board. This matches both the task's constraint (never
write under `boards/`) and the fork's own (`-o` required, the input board is never
edited in place).

**6. Provenance manifests keyed by content hash.** `run.json`
(`tools/placement/manifest.ts`) records `source.sha256`, `intent_sha256`,
`rules_sha256`, `policy_sha256`, `engine_commit`, the overrides used, and per-candidate
`sha256` + checks + metrics, so adoption can prove *this* board came from *that* input
under *those* rules. This is this project's "derived artifacts are compared by content,
never by timestamp" with the hashes written down. Reuse it, and hash the pinned
veroroute commit where that tooling hashes `engine_commit`.

**7. Deterministic, enumerated seeds.** `--seeds 0 1 2 3 4`, with the seed recorded per
candidate. A reproducible optimiser run needs exactly this.

**8. The spawn seam and the no-default-binary posture.**
`digital-pedal-platform/tools/perfboard/check.ts` injects `SpawnVeroroute` for tests
and **throws** when `VEROROUTE` is unset rather than guessing a path: *"A hardcoded
`$HOME/src/...` is right on exactly one machine and wrong everywhere else... a spawn
that quietly fails is the shape that reads as a clean board."* Reuse both halves.

### 6.3 Do not reuse: the geometry, and the engine

**1. All of `tools/placement/geometry.ts` and the mm-based rule semantics.**
Courtyards, `Rect`, `circleHitsRect`, `overlaps`, `inside`, `translate`,
`separation.min_mm`, `proximity.max_mm`, `anchors.tolerance_mm`,
`rot_tolerance_deg`. Stripboard is an integer row/column grid; clearance is not a
continuous distance and overlap is hole occupancy. Porting mm geometry onto a hole grid
would introduce a unit that does not exist in the `.vrt`.

**2. `repairProximity`'s search.** It sweeps candidate positions at `STEP_MM = 0.1`
with `MARGIN_MM = 0.3` over a continuous plane. The stripboard search space is
enumerable exactly — every (row, column, direction) triple — so a continuous sweep with
a margin is both wrong and unnecessary.

**3. The `KiCadRoutingTools` engine, and `make/krt.mk` as more than a pattern.** The
engine is a PCB autorouter, pinned via `krt.pin` and acquired by
`tools/krt/acquire.sh`. It knows nothing of strips, cuts or solder bridges. The
veroroute fork is this project's engine, already vendored and already pinned; it is the
thing `krt.mk` would be the wrapper for. The *Makefile pattern* —
`check-intent-<board>` / `place-<board>` / `route-<board>` / `route-all-<board>` /
`adopt-<board>` with runs under `build/` and a required `FROM` — is worth copying; the
engine-acquisition machinery is not, because the engine is already here.

**4. `tools/placement/policy.ts`, for now.** The override allow-list exists to fence an
external engine's free-form flags. The veroroute fork's verbs are a small fixed set with
no tunable flags to fence. Revisit only if a move verb grows options worth gating.

**5. `applyEdits`/`parse` from `@/kicad/sexpr`, as used by `repair.ts`.** That repair
rewrites `.kicad_pcb` **text** directly. A `.vrt` is a binary `QDataStream`
(`Headless.cpp:132-141`, and `Headless_author.h` notes *"no fixture can be typed by
hand"*). The only legitimate writer of a `.vrt` is the veroroute binary — which is the
whole reason this investigation is about adding a verb rather than editing a file.

---

## Summary of findings

1. **No absolute-position move exists.** `Board::MoveComps` /
   `Board::MoveUserComps` are delta-only, wrap toroidally, and return "did the grid
   pan", not "did the move succeed".
2. **A failed move is silent and already demonstrable**: `--stretch` exits 0 while
   leaving a part `FLOATING`, and the dump's `NODE` lines do not reflect the loss.
3. **`assert` is live in the shipped binary** (`QT_NO_DEBUG` without `NDEBUG`), so a
   zero delta or a disabled move reaching `MoveComps` aborts the process.
4. **`--import` has no placement strategy** — a row-major first-fit sweep at direction
   `'W'`, blind to nets. It is to be replaced, not tuned.
5. **Process launch is 91% of a trial move's cost** (10.78 ms of ~11.8 ms). Board I/O
   is ~1 ms.
6. **No batch mechanism exists**; `Headless_transactional.cpp` is not one, but its
   `CaptureBoardDump` is the in-process scoring primitive a batch verb would need.
7. **`--dump-board` suffices for cuts, bridges and wires; it has no per-hole data, no
   board dimensions and no per-part direction**, so segment counts, occupancy and
   overlap are not computable from it.
8. **The sibling tooling's architecture ports; its geometry does not.** It is also in
   `digital-pedal-platform`, not `pedals`.

### Named absences, and what each implies

| Absence | Implication |
| --- | --- |
| No position-move method | The actuator must be built on a delta primitive, with landing verification, not assumed |
| No success return from `MoveComps`/`MoveUserComps` | The verb owns verification entirely; the Board layer will not help |
| No board dimensions in `--dump-board` | An optimiser cannot tell a legal destination from a wrapped one; append this first |
| No per-part direction or row-extent in `--dump-board` | Occupancy and overlap cannot be scored from the dump |
| No per-hole or per-net geometry in `--dump-board` | Per-net segment counts and track length need new dump lines, not a new tool |
| No placement strategy in `--import` | There is no incumbent algorithm to improve; the baseline is first-fit |
| No batch or scripting mechanism | A batch verb is new ground, but consistent with the fork if each move is verified individually |
| No `tools/placement/` in `pedals` | The port source is `digital-pedal-platform` (or `fuzz-total-integration`) |

### Measurement provenance

Scripts in the session scratchpad: `measure.sh`, `measure2.sh` (timings),
`verify.sh` (exit codes and output sizes, run because the timings were fast enough to
be indistinguishable from an instant failure), `stretch_probe.sh` (the floating-part
finding), `absence.sh` (verb absence). Boards were copied to the scratchpad before any
verb that writes; nothing under `boards/` was modified.
