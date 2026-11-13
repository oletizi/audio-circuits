/**
 * `draughting/pages/net_strokes.py` seeds each net from its pins' sheet positions. A MIRRORED part's
 * pins are reflected after the rotation, as `draughting/pages/pins.py` places them. Until the h7 pedal
 * pages plan's Task 9a the tool ignored the mirror. On the pedal's usb draft (copperhead mirrors J7, the
 * USB-C receptacle) J7's SBU2, which akcli names no net, landed on another net's wire, and the tool
 * stopped with a TypeError sorting a `None` net name.
 *
 * The control here is the committed, approved pultec-low-boost page, which carries one mirrored part:
 * RV1, a `Device:R_Potentiometer` at rotation 0 with `(mirror x)`. Its pin 1, on GND, is drawn at
 * (180.34, 57.15), where a grey GND wire ends; its pin 3, on lo_boost_in, at (180.34, 49.53), where a
 * purple wire ends. Unmirrored, the tool seeded pin 1 at 49.53 instead. Measured with the tool as it
 * was before the change (commit 766dda7's parent): it exits 1 on this sheet with
 * "net_strokes: net GND carries [... (color 130 50 170 1) ..., ... (color 70 70 70 1) ...] on the draft
 * - not choosing", the two-stroke refusal, because GND reached lo_boost_in's purple wire through the
 * misplaced pin. The tool after it exits 0, reports these fourteen nets, and gives GND the grey and
 * lo_boost_in the purple that the sheet's wires at RV1's pins carry (read off the sheet, not the
 * tool). The same comparison over every committed sheet and the pedal's drafts found no sheet where
 * both versions run and disagree.
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
  // RV1's two nets take the stroke of the wire that ends at each mirrored pin on the sheet.
  expect(parsed["GND"]).toBe("(stroke (width 0.254) (type default) (color 70 70 70 1))")
  expect(parsed["lo_boost_in"]).toBe("(stroke (width 0.254) (type default) (color 130 50 170 1))")
})
