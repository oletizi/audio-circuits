/**
 * `draughting/pages/net_strokes.py` seeds each net from its pins' sheet positions. A MIRRORED part's
 * pins are reflected after the rotation, as `draughting/pages/pins.py` places them. Until the h7 pedal
 * pages plan's Task 9a the tool ignored the mirror: on the pedal's usb draft copperhead mirrors J7, the
 * USB-C receptacle, top to bottom, so J7's pins were seeded at their unmirrored places, and its SBU2
 * (an unconnected pin, which akcli names no net) landed on another net's wire there; the tool then
 * stopped with a TypeError sorting a `None` net name.
 *
 * The control is the committed, approved pultec-low-boost page, which carries one mirrored part (its
 * `Device:R_Potentiometer`, `(mirror x)`). Measured: the tool before the change exits 1 on it with
 * that TypeError; the tool after it exits 0 and reports these fourteen nets. The same comparison over
 * every committed sheet and the pedal's drafts found no sheet where both versions run and disagree.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"
import { isRecord } from "../../lib/guards.ts"

const ROOT = resolve(import.meta.dir, "..", "..")
const SHEET = join(ROOT, "drafted", "pultec", "pultec-low-boost", "pultec-low-boost.generated-do-not-edit.kicad_sch")

test("net_strokes.py places a mirrored part's pins where the sheet draws them", () => {
  const result = Bun.spawnSync(["python3", join(ROOT, "draughting", "pages", "net_strokes.py"), SHEET], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(result.stderr.toString()).toBe("")
  expect(result.exitCode).toBe(0)
  const parsed: unknown = JSON.parse(result.stdout.toString())
  if (!isRecord(parsed)) throw new Error("net_strokes.py did not print a JSON object")
  expect(Object.keys(parsed).sort()).toEqual([
    "GND", "c1_sel", "c2_sel", "c3_sel", "c4_sel", "c5_sel", "c6_sel",
    "hi_boost_out", "hi_in", "in", "lo_boost_in", "lo_t1", "lo_t2", "out",
  ])
})
