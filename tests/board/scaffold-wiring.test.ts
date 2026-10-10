/**
 * The scaffold board's "Scaffold links" wiring-guide section
 * (`lib/board/scaffold/wiring.ts`), verified against the real scaffold `Network`.
 *
 * SKIPPED, NOT DELETED. Every test below built its `Network` from `pultecScaffold()`
 * (`circuits/pultec/scaffold.ts`), which Task 4, "Delete the separate scaffold board,"
 * removed outright: the owner replaced that board's removable links with build-time
 * part population on each section board, so there is no longer any function in the
 * codebase that produces the kind of network these tests need. Reconstructing one here
 * by hand would mean re-deriving the retired isolation/link machinery inside a test
 * file - exactly the resurrection "supersede means delete" rules out. **Task 6,
 * "Population and junction instructions in the guide,"** rewrites this file wholesale
 * against the build-time-population model; until then every test here is skipped
 * rather than deleted, so the file remains for that rewrite to replace, and the skip -
 * not a silent removal of the assertions - is what keeps `bun test` from reporting
 * these as passing.
 */
import { test } from "bun:test"

test.skip("there are exactly seven links, one per isolation leg the model derives", () => {})

test.skip("the per-section link counts match the design's derivation", () => {})

test.skip(
  "every entry's link really is a fitted/removed switch, joining the stub this component's terminal carries to the entry's net",
  () => {},
)

test.skip("no two isolation points resolve to the same link", () => {})

test.skip("an isolation leg naming a component absent from the network refuses rather than guessing", () => {})

test.skip("the emulated setting in the rendered section is read from SCAFFOLD_FLAT, not transcribed", () => {})

test.skip(
  "a two-link stand-in's rows both carry that section's name, so a half-disabled stand-in reads as incomplete",
  () => {},
)

test.skip("wiringDocument's scaffold section is present only when the WiringInput declares one", () => {})
