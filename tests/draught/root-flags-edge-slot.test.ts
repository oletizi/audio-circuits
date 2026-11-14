/**
 * `draughting/pages/root-flags.ts`'s second placement rule (h7 pedal pages plan, Task 11b; ruling
 * CR-PEDAL-ROOT-FLAG-EDGE-SLOT): a root-homed net none of whose stubs is the top or bottom pin of
 * its edge gets its flag on a local label of its own, at the slot one pitch above the edge's top pin.
 *
 * On h7Pedal(): 5V_A_CODEC is the second pin of each of its three sheets (ldo_vmid, codec_sup,
 * codec) and VIN_A a middle pin of each of its four (entry, ldo_vmid, in_fe, out). Before the rule
 * root-flags.ts refused 5V_A_CODEC by name. The module, whose three root flags are all at an edge's
 * end, is unchanged: its op-list is byte-identical to the committed repair/root/02-pwr-flags.json.
 *
 * Control: with a home table where every edge carrying VIN_A already has a flag at its top pin or in
 * its slot, the rule refuses rather than place a flag onto another stub's label.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { REPO_ROOT, loadBoard } from "../../draughting/pages/board.ts"
import { flagHomes } from "../../draughting/pages/flag-homes.ts"
import { rootFlagOps, rootFlagPlacements, slotObstruction } from "../../draughting/pages/root-flags.ts"
import { arrangeRoot } from "../../tools/draught/root-arrangement.ts"

const pedal = await loadBoard(path.join(REPO_ROOT, "drafted", "h7-platform", "h7-pedal"))
const pedalHomes = await flagHomes(pedal)

test("the pedal's 5V_A_CODEC and VIN_A flags stand in an edge slot on a label of their own", () => {
  const byNet = new Map(rootFlagPlacements(pedal.network, pedal.name, pedalHomes).map((p) => [p.net, p]))
  // ldo_vmid's west edge: box at (7900, 3400) mil, stubs end 200 mil west; in_fe's at (6000, 2200).
  expect(byNet.get("5V_A_CODEC")).toEqual({ net: "5V_A_CODEC", at: [7700, 3400], rotation: 0, labelRotation: 180 })
  expect(byNet.get("VIN_A")).toEqual({ net: "VIN_A", at: [5800, 2200], rotation: 0, labelRotation: 180 })
  // Rule 1 still places the other four at an edge's end, with no label of their own.
  for (const net of ["3V3_D", "GND", "VIN_MOD", "VREF_A"]) expect(byNet.get(net)?.labelRotation).toBeUndefined()
})

test("the module's root flag op-list is unchanged by the second rule", async () => {
  const module = await loadBoard(path.join(REPO_ROOT, "drafted", "h7-platform", "h7-module"))
  const ops = JSON.stringify(rootFlagOps(module.network, module.name, await flagHomes(module)), null, 1) + "\n"
  expect(ops).toBe(fs.readFileSync(path.join(module.repairDir, "root", "02-pwr-flags.json"), "utf8"))
})

test("slotObstruction: the pedal's two slots are free; a box edge, a stub wire or a sheet pin through a slot is named", () => {
  const sheets = arrangeRoot(pedal.network, pedal.name)
  expect(slotObstruction([7700, 3400], sheets)).toBeUndefined()
  expect(slotObstruction([5800, 2200], sheets)).toBeUndefined()
  const ldo = sheets.find((s) => s.block === "ldo_vmid")
  if (ldo === undefined) throw new Error("the pedal root has no ldo_vmid sheet")
  // ldo_vmid's box is at (7900, 3400): its top edge, its first stub wire's midpoint, and its first sheet pin.
  expect(slotObstruction([8000, 3400], sheets)).toBe("sheet ldo_vmid's box edge")
  expect(slotObstruction([7800, 3500], sheets)).toBe(`the stub wire of ldo_vmid's sheet pin ${ldo.left[0]?.port}`)
  expect(slotObstruction([7900, 3500], sheets)).toBe("sheet ldo_vmid's box edge")
  // in_fe's slot shifted 200 mil east lands on its box's top-left corner.
  expect(slotObstruction([6000, 2200], sheets)).toBe("sheet in_fe's box edge")
})

test("control: when every edge carrying a mid-edge net is taken, the rule refuses by name", () => {
  // VIN_A's edges are entry (its top pin is GND's, flagged by rule 1), ldo_vmid, in_fe and out.
  // 5V_A_CODEC already takes ldo_vmid's slot; FX_IN_R and FX_OUT_R, homed on the root for this
  // control only, sort before VIN_A and take in_fe's and out's, which leaves VIN_A none.
  const shared = { ...pedalHomes.shared, FX_OUT_R: "root", FX_IN_R: "root" }
  expect(() => rootFlagPlacements(pedal.network, pedal.name, { ...pedalHomes, shared })).toThrow(
    "no stub label of VIN_A is the top or bottom pin of its sheet edge, and every edge carrying VIN_A already has a flag",
  )
})
