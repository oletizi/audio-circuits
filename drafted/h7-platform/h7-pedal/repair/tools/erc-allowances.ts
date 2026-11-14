/**
 * THE h7-pedal ERC ALLOWANCES - the pedal's own declared table of ERC errors a block page's
 * verification excuses. An entry is admitted only for an ERC finding that is a recorded tool
 * limitation, each under its own controller ruling in `docs/h7-platform/decisions.md`, as the
 * module's one entry rests on CR-MODULE-VCAP-ERC.
 *
 * Until Task 9b it was empty, a measured claim: under each page's one-block root, `kicad-cli sch erc`
 * reported 0 errors on the block's own sheet (`../../RECORD.md`) for the interface and entry pages
 * (Task 7a), pf and modsw (Task 7b), prail and ldo_vmid (Task 7c), usb, midi_i2c and fsw_led (Task 9a)
 * and controls_a and controls_b (Task 9b).
 *
 * Task 9b (the expr_ref page) added the first entry, ruling CR-PEDAL-LM66100-ST-ERC. U12 (U_REFBLK,
 * LM66100) has its ST pin, an open-drain status output typed `open_collector` (SLVSEZ8A; ruling
 * CR-PEDAL-PIN-MATCH, clause 5), tied to GND as analog.md line 314 states ("ST and N/C to GND"). GND
 * carries the board's one PWR_FLAG (`pwr-flag-homes.ts`, on the root), and KiCad's pin matrix makes an
 * open-collector pin on a net with a power output an error: under the expr_ref page's one-block root,
 * `/expr_ref/` reported exactly one error, `pin_to_pin` between "Symbol U12 Pin 5 [ST, Open collector,
 * Line]" and "Symbol #PWR01 Pin 1 [Power output, Line]", the root's stub flag on GND. The error comes
 * from the pin typing, not from the circuit. Its partner is the flag, so the entry names it as
 * `PWR_FLAG` (`draughting/pages/erc-allowances.ts`, the PWR_FLAG partner).
 *
 * Task 9c (the codec page) added two, ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC (drafted, awaiting the
 * controller). U9's VINL (pin 25) and VINR (pin 26) are typed `input` (`h7-platform:PCM3060PW`), and
 * what drives them is in the adc_drv block, which the model does not hold yet: the nets are ports of
 * `h7Pedal()` only as a construction state (`AWAITING_NETS`, `circuits/h7-platform/pedal-board.ts`:
 * "Until Task 10 (adc_drv, out)"). A cross-page driver entry is held to the model and so cannot name
 * the driver. Under the codec page's one-block root `/codec/` reported exactly two errors,
 * `pin_not_driven` on "Symbol U9 Pin 25 [V_{IN}L, Input, Line]" and "Symbol U9 Pin 26 [V_{IN}R,
 * Input, Line]". The allowance must go when adc_drv is built:
 * `tests/draught/erc-allowances-one-item.test.ts` fails while an entry under that ruling names a net no longer in `AWAITING_NETS`. (The guard is a
 * test, not code here: this table is imported from scratch copies of the drafted directory, as
 * `erc-control.sh` makes, where a runtime import of the circuit does not resolve.)
 *
 * DATA ONLY. How narrowly an allowance matches, and the model check every entry is held to, are
 * `draughting/pages/erc-allowances.ts`; the shared tools read this table through the board's drafted
 * directory, and refuse a board without it, naming the file.
 */
import type { ErcAllowance } from "../../../../../draughting/pages/erc-allowances.ts"

/** CR-PEDAL-CODEC-VIN-AWAITING-ERC: U9's analog input `pin` on `net`, undriven until adc_drv is built. */
const CODEC_VIN = (net: string, pin: string, name: string): ErcAllowance => ({
  ruling: "CR-PEDAL-CODEC-VIN-AWAITING-ERC",
  sheet: "/codec/",
  type: "pin_not_driven",
  pins: [{ designator: "U9", pin }],
  net,
  symbolPinType: "input",
  source:
    `circuits/h7-platform/pedal/codec.ts:56 (u_codec pin ${pin}, ${name}, on ${net}; schematic-checklist.md:110, CODEC-12); ` +
    "h7-platform:PCM3060PW types it input (CR-PEDAL-SYMBOL-PCM3060); its driver is in the adc_drv block, which the model " +
    `holds from Task 10 (AWAITING_NETS); ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC in docs/h7-platform/decisions.md`,
})

export const ERC_ALLOWANCES: readonly ErcAllowance[] = [
  {
    ruling: "CR-PEDAL-LM66100-ST-ERC",
    sheet: "/expr_ref/",
    type: "pin_to_pin",
    pins: [
      { designator: "U12", pin: "5" },
      { designator: "PWR_FLAG", pin: "1" },
    ],
    net: "GND",
    symbolPinType: "open_collector",
    source:
      "circuits/h7-platform/pedal/expr-ref.ts (u_refblk pin 5, ST, on GND: analog.md:314, \"ST and N/C to GND\"); " +
      "h7-platform:LM66100DCK types ST open_collector (SLVSEZ8A; CR-PEDAL-SYMBOL-LM66100, CR-PEDAL-PIN-MATCH clause 5); " +
      "GND's one PWR_FLAG is on the root (pwr-flag-homes.ts); ruling CR-PEDAL-LM66100-ST-ERC in docs/h7-platform/decisions.md",
  },
  CODEC_VIN("VINL", "25", "VINL"),
  CODEC_VIN("VINR", "26", "VINR"),
]
