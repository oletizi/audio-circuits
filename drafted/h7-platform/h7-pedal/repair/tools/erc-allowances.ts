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
 * Task 9c (the codec page) added two one-item allowances, ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC
 * (adopted by the controller as temporary, d3e0e95): U9's VINL (pin 25) and VINR (pin 26), typed
 * `input`, reported `pin_not_driven` under the codec page's one-block root while their driver, the
 * adc_drv block, was not yet in the model. Task 10 built adc_drv and removed both: VINL and VINR are
 * now cross-page driver entries naming adc_drv's R_O pins (`cross-page-drivers.ts`), and the one-item
 * allowance support is deleted from the shared tools (the amendment of that ruling in
 * docs/h7-platform/decisions.md records it). The table held the expr_ref entry alone until Task 11b.
 *
 * Task 11b (the pedal's root) added the second, ruling CR-PEDAL-ROOT-MIDI-PIN4-ERC, a ROOT LABEL
 * allowance (`draughting/pages/erc-allowances.ts`, `RootLabelAllowance`). MIDI_PIN4 leads to the MIDI
 * connector no source names, which is not drawn (CR-PEDAL-MIDI; `UNDRAWN_CONNECTOR_NETS`,
 * `circuits/h7-platform/pedal-board.ts`): it is a board port, and only midi_i2c's port is bound to it.
 * On the assembled root, `kicad-cli sch erc` reported exactly one error that no other entry covers,
 * `label_dangling` on `/`, "Label 'MIDI_PIN4'", the stub label of midi_i2c's MIDI_PIN4 sheet pin. Its
 * twin MIDI_PIN5 and the five SPARE nets (SOCKET_ONLY_NETS) are reported as `isolated_pin_label`, a
 * warning, and need no entry. The expr_ref entry is keyed in the root's `.kicad_pro` with the GND
 * flag's uuid on the root (`draughting/pages/kicad-pro.ts`, Task 11b).
 *
 * DATA ONLY. How narrowly an allowance matches, and the model check every entry is held to, are
 * `draughting/pages/erc-allowances.ts`; the shared tools read this table through the board's drafted
 * directory, and refuse a board without it, naming the file.
 */
import type { ErcAllowance } from "../../../../../draughting/pages/erc-allowances.ts"

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
  {
    ruling: "CR-PEDAL-ROOT-MIDI-PIN4-ERC",
    sheet: "/",
    type: "label_dangling",
    label: "MIDI_PIN4",
    net: "MIDI_PIN4",
    source:
      "circuits/h7-platform/pedal/midi-i2c.ts (RA's far end, \"MIDI pin 4\", power.md:460; a port of midi_i2c and of the board); " +
      "the connector it leads to is not drawn (CR-PEDAL-MIDI; UNDRAWN_CONNECTOR_NETS, circuits/h7-platform/pedal-board.ts); " +
      "ruling CR-PEDAL-ROOT-MIDI-PIN4-ERC in docs/h7-platform/decisions.md",
  },
]
