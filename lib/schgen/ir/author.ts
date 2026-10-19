/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/author.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { BomFields, NetName, PartLabel, PartSpec, PinIdentity } from "./types.ts";

/** KiCad's Device:R, Device:C and similar name both pins "" (unnamed). */
export const UNNAMED: readonly [PinIdentity, PinIdentity] = ["", ""];

export interface TwoPinArgs {
  readonly label: PartLabel;
  readonly refPrefix: string;
  readonly libId: string;
  readonly value: string;
  readonly footprint: string;
  readonly bom: BomFields;
  /** Pin 1's net, then pin 2's net. */
  readonly nets: readonly [NetName, NetName];
  /** Expected canonical identity of pin 1 and pin 2 (UNNAMED for plain passives). */
  readonly identities: readonly [PinIdentity, PinIdentity];
  readonly checklist: readonly string[];
  readonly source: string;
  readonly dnp: boolean;
}

/** A two-terminal part (R, C, L, ferrite, diode) with both pins connected. */
export function twoPin(a: TwoPinArgs): PartSpec {
  if (a.nets[0] === a.nets[1]) {
    throw new Error(`${a.label}: both pins on net ${a.nets[0]}; a shorted two-terminal part is never intended`);
  }
  return {
    label: a.label,
    refPrefix: a.refPrefix,
    libId: a.libId,
    units: [1],
    value: a.value,
    footprint: a.footprint,
    bom: a.bom,
    dnp: a.dnp,
    checklist: a.checklist,
    source: a.source,
    pinTable: null,
    pins: {
      "1": { net: a.nets[0], identity: a.identities[0] },
      "2": { net: a.nets[1], identity: a.identities[1] },
    },
    mechanicalPads: [],
    ncUnlisted: null,
  };
}

/** ["SDRAM_A0", …, "SDRAM_A12"] for netRange("SDRAM_A", 0, 12). */
export function netRange(prefix: string, from: number, to: number): NetName[] {
  if (from > to) throw new Error(`netRange ${prefix}: from ${from} > to ${to}`);
  const out: NetName[] = [];
  for (let i = from; i <= to; i += 1) out.push(`${prefix}${i}`);
  return out;
}
