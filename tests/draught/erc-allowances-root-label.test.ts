/**
 * A ROOT LABEL allowance (`draughting/pages/erc-allowances.ts`, `RootLabelAllowance`; h7 pedal pages
 * plan, Task 11b; ruling CR-PEDAL-ROOT-MIDI-PIN4-ERC): one violation whose one item is a stub label
 * on the board root. It is held to the model as the cause it states, and `erc_match.py` matches it
 * on exactly that one item.
 *
 * The pedal's committed MIDI_PIN4 entry passes. Controls, each refused by name: on a block's sheet;
 * of type pin_not_driven; a label that is not its net; a net bound to two blocks (GND); a net that is
 * not a board port (midi_i2c's private MIDI_DRAIN, as the root names nothing private). The matcher takes
 * "Label 'MIDI_PIN4'" alone, and not MIDI_PIN5's label, a hierarchical label of the same text, or a
 * second item.
 */
import { expect, test } from "bun:test"
import path from "node:path"
import { REPO_ROOT, loadBoard } from "../../draughting/pages/board.ts"
import { checkErcAllowances, type RootLabelAllowance } from "../../draughting/pages/erc-allowances.ts"
import { flagHomes } from "../../draughting/pages/flag-homes.ts"

const pedal = await loadBoard(path.join(REPO_ROOT, "drafted", "h7-platform", "h7-pedal"))
const homes = await flagHomes(pedal)
const MIDI: RootLabelAllowance = { ruling: "test", sheet: "/", type: "label_dangling", label: "MIDI_PIN4", net: "MIDI_PIN4", source: "test" }

test("the MIDI_PIN4 root label allowance is borne out by the model", () => {
  expect(() => checkErcAllowances([MIDI], pedal, homes)).not.toThrow()
})

test("controls: each departure from the stated cause is refused by name", () => {
  const refused = (a: RootLabelAllowance, why: string): void => expect(() => checkErcAllowances([a], pedal, homes)).toThrow(why)
  refused({ ...MIDI, sheet: "/midi_i2c/" }, "a root label allowance is on the root sheet /, not /midi_i2c/")
  refused({ ...MIDI, type: "pin_not_driven" }, "names a violation of type label_dangling, not pin_not_driven")
  refused({ ...MIDI, label: "MIDI_PIN5" }, "so label MIDI_PIN5 must equal net MIDI_PIN4")
  refused({ ...MIDI, label: "GND", net: "GND" }, "net GND is bound to the ports of")
  refused({ ...MIDI, label: "midi_i2c_MIDI_DRAIN", net: "midi_i2c_MIDI_DRAIN" }, "net midi_i2c_MIDI_DRAIN is not a port of h7Pedal()")
})

function matches(items: readonly string[]): boolean {
  const violation = { type: "label_dangling", items: items.map((description) => ({ description })) }
  const code = [
    "import json, sys",
    "from erc_match import matches",
    "a, v = json.loads(sys.argv[1]), json.loads(sys.argv[2])",
    "print('yes' if matches(a, '/', v) else 'no')",
  ].join(String.fromCharCode(10))
  const r = Bun.spawnSync(["python3", "-c", code, JSON.stringify(MIDI), JSON.stringify(violation)],
    { cwd: path.join(REPO_ROOT, "draughting", "pages"), stdout: "pipe", stderr: "pipe" })
  if (r.exitCode !== 0) throw new Error(`erc_match.py failed: ${r.stderr.toString()}`)
  return r.stdout.toString().trim() === "yes"
}

test("erc_match.py matches the one stub label item, and nothing near it", () => {
  expect(matches(["Label 'MIDI_PIN4'"])).toBe(true)
  expect(matches(["Label 'MIDI_PIN5'"])).toBe(false)
  expect(matches(["Hierarchical Label 'MIDI_PIN4'"])).toBe(false)
  expect(matches(["Label 'MIDI_PIN4'", "Label 'MIDI_PIN4'"])).toBe(false)
})
