/**
 * Standalone opamp buffer module for testing/export
 */

import { OpampBuffer } from "./OpampBuffer"

export default () => (
  <board width="40mm" height="30mm">
    <OpampBuffer name="BUF1" pcbX={0} pcbY={0} />
  </board>
)
