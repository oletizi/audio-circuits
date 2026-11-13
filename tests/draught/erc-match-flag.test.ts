/**
 * `draughting/pages/erc_match.py` reads a PWR_FLAG in a KiCad ERC item as an allowance's `PWR_FLAG`
 * partner only for the references the tools give a flag, pin 1, typed Power output: `#PWR<n>` (akcli's,
 * a one-block root's stub) and `#FLG<n>` (a board root's, after `root_flag_refs.py`). Ruling
 * CR-PEDAL-LM66100-ST-ERC; h7 pedal pages plan Task 9b, fix round 1.
 *
 * Each case runs the real matcher on a synthetic violation against the pedal's allowance shape:
 * `#PWR01` and `#FLG01` match; `#PWR01` on pin 2, a stock power symbol's Power input pin, and another
 * reference prefix do not.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"

const ROOT = resolve(import.meta.dir, "..", "..")
const PAGES = join(ROOT, "draughting", "pages")

const ALLOWANCE = {
  ruling: "test", sheet: "/expr_ref/", type: "pin_to_pin",
  pins: [{ designator: "U12", pin: "5" }, { designator: "PWR_FLAG", pin: "1" }],
  net: "GND", symbolPinType: "open_collector", source: "test",
}

function matches(partner: string): boolean {
  const violation = {
    type: "pin_to_pin",
    items: [{ description: "Symbol U12 Pin 5 [ST, Open collector, Line]" }, { description: partner }],
  }
  const code = [
    "import json, sys",
    "from erc_match import matches",
    "a, v = json.loads(sys.argv[1]), json.loads(sys.argv[2])",
    "print('yes' if matches(a, '/expr_ref/', v) else 'no')",
  ].join("\n")
  const r = Bun.spawnSync(["python3", "-c", code, JSON.stringify(ALLOWANCE), JSON.stringify(violation)],
    { cwd: PAGES, stdout: "pipe", stderr: "pipe" })
  if (r.exitCode !== 0) throw new Error(`erc_match.py failed: ${r.stderr.toString()}`)
  return r.stdout.toString().trim() === "yes"
}

test("a one-block root's #PWR flag and a board root's #FLG flag are the PWR_FLAG partner", () => {
  expect(matches("Symbol #PWR01 Pin 1 [Power output, Line]")).toBe(true)
  expect(matches("Symbol #FLG01 Pin 1 [Power output, Line]")).toBe(true)
})

test("control: another pin, a power symbol's Power input pin, or another prefix is not the partner", () => {
  expect(matches("Symbol #PWR01 Pin 2 [Power output, Line]")).toBe(false)
  expect(matches("Symbol #PWR02 Pin 1 [Power input, Line]")).toBe(false)
  expect(matches("Symbol #U01 Pin 1 [Power output, Line]")).toBe(false)
})
