/**
 * THE h7-pedal SIGNAL NETS WHOSE DRIVER IS ON ANOTHER PAGE - the pedal's own declared table, under
 * the controller ruling CR-MODULE-CROSS-PAGE-DRIVERS (`docs/h7-platform/decisions.md`), which the
 * pedal's pages carry unchanged.
 *
 * Why it exists. `verify.sh` runs ERC on a block page under a root holding that block alone
 * (`draughting/pages/one-block-root.ts`). A net whose only pin on the page is a KiCad input, and whose
 * driver is a pin on another page, then reports `pin_not_driven`, an error the page cannot remove.
 * For each net here, the one-block root places a stand-in driver on the net's stub when the block
 * under check is not the driving block.
 *
 * Declared, never derived: an entry is written here, from the model (`h7Pedal()`), with its source,
 * and only for a net ERC reports on a page being verified (the ruling). `checkCrossPageDrivers`
 * (`draughting/pages/cross-page-drivers.ts`) holds each entry to the model on every run.
 *
 * As of Task 7a (the interface and entry pages) it is EMPTY, and that is a measured claim: every pin
 * on both pages is passive, so neither carries a KiCad input pin, and `kicad-cli sch erc` under each
 * page's one-block root reports no `pin_not_driven` (`../../RECORD.md`). A later page that needs an
 * entry adds it, with its source, when it is repaired.
 *
 * DATA ONLY; the shared tools read it through the board's drafted directory, and refuse a board
 * without it, naming the file.
 */
import type { CrossPageDriver } from "../../../../../draughting/pages/cross-page-drivers.ts"

/** The ruling this table is declared under; the shared tools' messages name it. */
export const RULING = "CR-MODULE-CROSS-PAGE-DRIVERS"

export const CROSS_PAGE_DRIVERS: readonly CrossPageDriver[] = []
