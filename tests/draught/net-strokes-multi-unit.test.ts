/**
 * `draughting/pages/net_strokes.py` reads each net's stroke off a draft by seeding from the net's pins.
 * A multi-unit part is one reference with one sheet instance per unit, so each instance must place
 * only its own unit's pins (`kicad_sheet.instance_pins`). Until the h7 pedal pages plan's Task 7c
 * review it placed every library pin at every instance, and the last instance won: on the ldo_vmid
 * draft it missed VMID_L and VMID_R, and a hand-written stroke stood in for them (review I1).
 *
 * The control is the committed dual-op-amp fixture (`tests/fixtures/dual-opamp-board/`, TOOLING.md C6):
 * one TL072 in three units, every net drawn with wire. Measured on that fixture, the Task 7c tool
 * reported only VCC and VEE (the supply unit's nets, the last instance) and missed IN_A, IN_B, OUT_A and
 * OUT_B, which reach units A and B; the converted tool reports all six. This test fails on the former.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"
import { isRecord } from "../../lib/guards.ts"

const ROOT = resolve(import.meta.dir, "..", "..")
const FIXTURE = join(ROOT, "tests", "fixtures", "dual-opamp-board", "drafted", "dual-opamp-board.kicad_sch")

test("net_strokes.py finds every net of a multi-unit part, unit by unit", () => {
  const result = Bun.spawnSync(["python3", join(ROOT, "draughting", "pages", "net_strokes.py"), FIXTURE], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(result.stderr.toString()).toBe("")
  expect(result.exitCode).toBe(0)
  const parsed: unknown = JSON.parse(result.stdout.toString())
  if (!isRecord(parsed)) throw new Error("net_strokes.py did not print a JSON object")
  expect(Object.keys(parsed).sort()).toEqual(["IN_A", "IN_B", "OUT_A", "OUT_B", "VCC", "VEE"])
})
