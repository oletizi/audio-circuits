/**
 * Audio Circuits - Main Demo
 *
 * This demonstrates composing multiple modules into a complete board.
 * Example: Dual channel buffer using two OpampBuffer modules.
 */

import { OpampBuffer } from "./modules/index"
import { columnLayout } from "./lib/layout.ts"

export default () => {
  // Arrange two buffers in a vertical column
  const layout = columnLayout(2)

  return (
    <board width="80mm" height="50mm">
      {/* Channel A buffer */}
      <OpampBuffer name="BUF_A" pcbX={-20} pcbY={-10} {...layout[0]} />

      {/* Channel B buffer */}
      <OpampBuffer name="BUF_B" pcbX={-20} pcbY={10} {...layout[1]} />
    </board>
  )
}
