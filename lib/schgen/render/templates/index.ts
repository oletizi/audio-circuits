/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/index.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { TemplateId } from "../../ir/types.ts";
import type { Template } from "../block-types.ts";
import { connectorFanout } from "./connector-fanout.ts";
import { crystal } from "./crystal.ts";
import { divider } from "./divider.ts";
import { opampStage } from "./opamp-stage.ts";
import { passiveChain } from "./passive-chain.ts";
import { decouplingBank, railRow } from "./rail-row.ts";
import { regulator } from "./regulator.ts";

export const TEMPLATES: ReadonlyMap<TemplateId, Template> = new Map<TemplateId, Template>([
  ["rail-row", railRow],
  ["decoupling-bank", decouplingBank],
  ["divider", divider],
  ["passive-chain", passiveChain],
  ["crystal", crystal],
  ["connector-fanout", connectorFanout],
  ["regulator", regulator],
  ["opamp-stage", opampStage],
]);
