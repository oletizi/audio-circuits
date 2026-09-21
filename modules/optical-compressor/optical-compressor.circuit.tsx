/**
 * Standalone optical compressor for development, rendering and export.
 *
 * The power connector and bias network are part of this fixture because
 * single-supply behaviour is part of the module's contract. This is a
 * development fixture, NOT a production board - see the design spec,
 * section 11.
 *
 * The vactrol footprint here is a placeholder for rendering. It MUST be
 * replaced with the selected device's verified footprint before any
 * fabrication output is trusted (spec 12.1 item 7).
 */

import { OpticalCompressor } from "./OpticalCompressor.tsx"

export default () => (
  <board width="110mm" height="90mm">
    <OpticalCompressor name="CMP1" vactrolFootprint="dip4" pcbX={0} pcbY={0} />
  </board>
)
