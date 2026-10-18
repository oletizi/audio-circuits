/**
 * One `NODE` line's members, read from the `--dump-board` text rather than
 * from `BoardDump`.
 *
 * `parseBoardDump` (`tools/stripboard/vero-import-nets.ts`'s module comment
 * on `parseNodes`) keeps a `NODE` line's id and name and DROPS its members -
 * deliberately, and this file follows the same precedent rather than
 * widening `BoardDump` to carry them: `tools/stripboard/vero-import-nets.ts`'s
 * `netByNode` and `tools/stripboard/pad-provenance.ts`'s pad reader both read
 * the one line they need straight from the dump text, "rather than widening
 * a type twenty callers construct". A `NODE` line's members are needed by
 * exactly one caller - the Cuts table - so they are read here, the same way,
 * for the same reason.
 *
 * A member id is `<ref>.<pin>`, **in the reference netlist's vocabulary** -
 * the same vocabulary `PadTerminal.identity` is built in
 * (`tools/guide/pads.ts`) - so a `NODE` member and a pad's identity are the
 * same string by construction, never a string a caller has to guess at.
 */
import { dumpLineFields } from "../perfboard/dump-lines.ts"

/**
 * Every `NODE` line's id, mapped to the member ids it names.
 *
 * Fields are `["NODE", id, "NAME", name, ...members]`
 * (`tools/stripboard/vero-import-nets.ts`'s `netByNode`): a line whose third
 * field is not `"NAME"` is not a readable `NODE` line and is skipped here,
 * the same way `netByNode` skips it, and `parseNodes`
 * (`tools/stripboard/vero-import-nets.ts`) is the refusal path for a `NODE`
 * line that is present and unreadable - this function only reads the member
 * ids of lines `parseNodes` already accepted.
 */
export function nodeMembers(dumpText: string): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>()
  for (const fields of dumpLineFields(dumpText, "NODE")) {
    const [, id, nameKeyword] = fields
    if (id === undefined || nameKeyword !== "NAME") continue
    out.set(id, fields.slice(4).filter((field) => field.length > 0))
  }
  return out
}
