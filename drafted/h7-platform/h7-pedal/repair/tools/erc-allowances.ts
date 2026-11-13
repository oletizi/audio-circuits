/**
 * THE h7-pedal ERC ALLOWANCES - the pedal's own declared table of ERC errors a block page's
 * verification excuses. An entry is admitted only for an ERC finding that is a recorded tool
 * limitation, each under its own controller ruling in `docs/h7-platform/decisions.md`, as the
 * module's one entry rests on CR-MODULE-VCAP-ERC.
 *
 * It is EMPTY, and that is a measured claim: under each page's one-block root, `kicad-cli sch erc`
 * reports 0 errors on the block's own sheet (`../../RECORD.md`) for every page drawn so far, the
 * interface and entry pages (Task 7a), pf and modsw (Task 7b) and prail and ldo_vmid (Task 7c), so
 * nothing needs excusing.
 *
 * DATA ONLY. How narrowly an allowance matches, and the model check every entry is held to, are
 * `draughting/pages/erc-allowances.ts`; the shared tools read this table through the board's drafted
 * directory, and refuse a board without it, naming the file.
 */
import type { ErcAllowance } from "../../../../../draughting/pages/erc-allowances.ts"

export const ERC_ALLOWANCES: readonly ErcAllowance[] = []
