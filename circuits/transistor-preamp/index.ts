/** The lab board's one loadable module: tools (the perfboard workflow, the
 * schematic stub verb) name this file, and it re-exports everything they read. */
export { transistorPreampLab, DESIGNATORS, PIN_NUMBERS, LEGS } from "./lab-board.ts"
export type { Leg, LegName } from "./lab-board.ts"
export {
  SETTINGS, REMOVED, controlStateFor, legPosition, schematicNotes,
} from "./lab-settings.ts"
export type { LabSetting } from "./lab-settings.ts"
