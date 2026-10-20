/**
 * Ported from digital-pedal-platform's `tools/schgen/render/ercExclusions.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * ERC exclusions recorded in the generated .kicad_pro (ALL-07). Each names exactly one violation,
 * in KiCad 10's own serialized form, confirmed against kicad-cli in A2 Task 15 Step 1:
 *
 *   <code>|<x>|<y>|<main pin uuid>|<aux pin uuid>|<marker sheet path>|<main sheet path>|<aux sheet path>
 *
 * x and y are the marker position (the main pin's connection point) in schematic internal units
 * (100 nm); a sheet path is /<root uuid>/<sheet uuid>. KiCad matches the whole string, so a wrong
 * position, uuid, order or path excludes nothing and the violation stays reported.
 */
import type { Circuit, IrPin, SheetId } from "../ir/types.ts";
import type { EmitContext } from "./emit.ts";
import { pinEnd, type Point } from "./geometry.ts";
import type { SheetDrawing } from "./sheet-types.ts";
import { uuidV5 } from "./uuid.ts";

export interface ErcExclusion {
  /** The violation's code as the ERC report prints it, e.g. "pin_to_pin". */
  readonly code: string;
  /** The violation's severity as the ERC report prints it; never guessed from the code. */
  readonly severity: "error" | "warning";
  /** "LABEL.PIN", in the order the ERC report lists them: the first is KiCad's main item. */
  readonly pins: readonly [string, string];
  readonly reason: string;
  /** Required for an error-level exclusion (ALL-07). */
  readonly ownerSignOff: string | null;
}

/** An exclusion with its serialized KiCad key, as projectFile writes it. */
export interface KeyedErcExclusion {
  readonly key: string;
  readonly exclusion: ErcExclusion;
}

/** Schematic internal units per µm (KiCad's schematic IU is 100 nm). */
const IU_PER_UM = 10;

const describeExclusion = (e: ErcExclusion): string => `ERC exclusion ${e.code} on ${e.pins.join(", ")}`;

/** Refuses an exclusion ALL-07 does not allow: no reason, or error-level with no owner sign-off. */
export function assertAllowed(e: ErcExclusion): void {
  if (e.reason.trim() === "") throw new Error(`${describeExclusion(e)} has no reason (ALL-07)`);
  if (e.severity === "error" && (e.ownerSignOff === null || e.ownerSignOff.trim() === "")) {
    throw new Error(`${describeExclusion(e)} is error-level and needs the owner's sign-off (ALL-07)`);
  }
}

interface PlacedPinEnd {
  readonly uuid: string;
  readonly at: Point;
  readonly sheet: SheetId;
}

function irPin(c: Circuit, e: ErcExclusion, ref: string): IrPin {
  const dot = ref.indexOf(".");
  if (dot <= 0 || dot === ref.length - 1) throw new Error(`ERC exclusion ${e.code}: pin "${ref}" is not LABEL.PIN`);
  const part = ref.slice(0, dot);
  const pin = ref.slice(dot + 1);
  const p = c.pins.find((x) => x.part === part && x.pin === pin);
  if (p === undefined) throw new Error(`ERC exclusion ${e.code}: pin ${ref} is not in the circuit`);
  return p;
}

function placedPinEnd(ctx: EmitContext, drawings: readonly SheetDrawing[], e: ErcExclusion, ref: string): PlacedPinEnd {
  const p = irPin(ctx.circuit, e, ref);
  const part = ctx.circuit.parts.get(p.part);
  if (part === undefined) throw new Error(`ERC exclusion ${e.code}: part ${p.part} is not in the circuit`);
  // A pin common to all units (unit 0) is wired on the lowest unit, as the block subgraphs place it.
  const unit = p.unit === 0 ? Math.min(...part.units) : p.unit;
  const found = drawings.flatMap((d) => d.symbols.filter((s) => s.part === p.part && s.unit === unit).map((s) => ({ s, sheet: d.sheet.id })));
  const placed = found[0];
  if (placed === undefined) throw new Error(`ERC exclusion ${e.code}: ${p.part} unit ${unit} is drawn on no sheet`);
  if (found.length > 1) throw new Error(`ERC exclusion ${e.code}: ${p.part} unit ${unit} is drawn ${found.length} times`);
  const lib = ctx.symbols.resolve(part.libId).pins.find((l) => l.number === p.pin && (l.unit === unit || l.unit === 0));
  if (lib === undefined) throw new Error(`ERC exclusion ${e.code}: ${part.libId} has no pin ${p.pin} on unit ${unit}`);
  return { uuid: uuidV5(`pin:${p.part}:${unit}:${p.pin}`), at: pinEnd(placed.s.at, placed.s.rot, lib), sheet: placed.sheet };
}

function sheetPath(ctx: EmitContext, sheet: SheetId): string {
  const uuid = ctx.sheetUuids.get(sheet);
  if (uuid === undefined) throw new Error(`ERC exclusion: sheet ${sheet} has no uuid in the emit context`);
  return `/${ctx.rootUuid}/${uuid}`;
}

function iu(um: number, what: string): string {
  const v = um * IU_PER_UM;
  if (!Number.isInteger(v)) throw new Error(`ERC exclusion: ${what} ${um} µm is not a whole number of KiCad internal units`);
  return `${v}`;
}

/** KiCad's serialized key for `e`, from the pins' deterministic uuids and where the drawings place them. */
export function exclusionKey(e: ErcExclusion, ctx: EmitContext, drawings: readonly SheetDrawing[]): string {
  const main = placedPinEnd(ctx, drawings, e, e.pins[0]);
  const aux = placedPinEnd(ctx, drawings, e, e.pins[1]);
  const at = `${iu(main.at.x, `${e.pins[0]} x`)}|${iu(main.at.y, `${e.pins[0]} y`)}`;
  const paths = [sheetPath(ctx, main.sheet), sheetPath(ctx, main.sheet), sheetPath(ctx, aux.sheet)];
  return [e.code, at, main.uuid, aux.uuid, ...paths].join("|");
}
