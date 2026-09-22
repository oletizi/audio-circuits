# Why this project does not use tscircuit

Decided 2026-09-21. Measured, not assumed.

tscircuit emits a schematic net label when its wire router fails to find a
path. Core runs an autorouter and, on zero results for a symbol-to-chip or
symbol-to-symbol connection, calls
`_doInitialSchematicTraceRenderWithDisplayLabel()` and returns.

There is no distance threshold in the code. Distance and pin orientation
matter only because they decide whether routing succeeds: wires appear below
roughly 3 units when pins face along the connection axis, and never when the
run must dogleg across symbol bodies. The router's settings
(`MAX_ITERATIONS: 100`, `OBSTACLE_MARGIN: 0.1`, margin tiers) are hardcoded at
the call site. `_schDirectLineRoutingEnabled` would substitute a router that
cannot fail, but it is absent from `@tscircuit/props` and props parse in zod
`"strip"` mode, so it never reaches core.

The disqualifying property is not that labels appear. It is that a routing
failure is silently re-rendered as a label, producing a drawing that looks
deliberate. A tool that fails loudly is workable. One that disguises failure
as a design decision cannot be verified by looking, and offers no override.

Two claims previously recorded in this repository were wrong: that
multi-terminal junctions never render as wires (they do, with zero labels at
six members, wired pin-to-pin), and that member count drives the choice (it
does not).

Superseded: the schematic readability testing design and its plan, which
measured this renderer.
