/**
 * Schematic Layout Utilities
 *
 * Simple grid-based layout system for schematic positioning.
 * Follows conventions:
 * - Signal flow: left to right (X increases)
 * - Voltage drop: top to bottom (Y increases, VCC at top, GND/VEE at bottom)
 *
 * Note: tscircuit's schFlex layout is not fully functional for schematics,
 * so we use explicit coordinates with this helper system.
 */

/** Default grid spacing in schematic units */
export const GRID = 3

/**
 * Create a grid-based position calculator for component layout within a module
 *
 * @param originX - X origin for this module
 * @param originY - Y origin for this module
 * @param gridSize - Grid cell spacing (default: 3)
 */
export function createGrid(originX = 0, originY = 0, gridSize = GRID) {
  return {
    /**
     * Calculate schematic position from grid coordinates
     * @param col - Column (0 = center, negative = left, positive = right)
     * @param row - Row (0 = center/signal path, negative = up, positive = down)
     */
    at: (col: number, row: number) => ({
      schX: originX + col * gridSize,
      schY: originY + row * gridSize,
    }),

    /** Position on the signal path (row 0) */
    signal: (col: number) => ({
      schX: originX + col * gridSize,
      schY: originY,
    }),

    /** Position above the signal path (for VCC, etc.) */
    above: (col: number, rows = 1) => ({
      schX: originX + col * gridSize,
      schY: originY - rows * gridSize,
    }),

    /** Position below the signal path (for GND, VEE, etc.) */
    below: (col: number, rows = 1) => ({
      schX: originX + col * gridSize,
      schY: originY + rows * gridSize,
    }),
  }
}

/**
 * Board-level layout for arranging modules
 */
export interface ModuleLayout {
  schX: number
  schY: number
}

/**
 * Arrange modules in a vertical stack (column)
 *
 * @param count - Number of modules
 * @param moduleHeight - Height of each module in grid units (default: 8)
 * @param gap - Gap between modules in grid units (default: 2)
 * @returns Array of {schX, schY} positions, centered around Y=0
 */
export function columnLayout(
  count: number,
  moduleHeight = 8,
  gap = 2
): ModuleLayout[] {
  const totalHeight = count * moduleHeight + (count - 1) * gap
  const startY = -totalHeight / 2 + moduleHeight / 2

  return Array.from({ length: count }, (_, i) => ({
    schX: 0,
    schY: startY + i * (moduleHeight + gap),
  }))
}

/**
 * Arrange modules in a horizontal row
 *
 * @param count - Number of modules
 * @param moduleWidth - Width of each module in grid units (default: 12)
 * @param gap - Gap between modules in grid units (default: 2)
 * @returns Array of {schX, schY} positions, centered around X=0
 */
export function rowLayout(
  count: number,
  moduleWidth = 12,
  gap = 2
): ModuleLayout[] {
  const totalWidth = count * moduleWidth + (count - 1) * gap
  const startX = -totalWidth / 2 + moduleWidth / 2

  return Array.from({ length: count }, (_, i) => ({
    schX: startX + i * (moduleWidth + gap),
    schY: 0,
  }))
}
