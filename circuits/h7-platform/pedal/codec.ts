/**
 * The pedal's codec (h7 pedal pages plan, Task 8; inventory section 1.3 B7; CR-PEDAL-BLOCKS
 * `codec`): the PCM3060PWR in hardware mode, as schematic-checklist.md CODEC-01 to CODEC-12 state it,
 * with the values CR-PEDAL-PCM3060-VALUES reads from them (`PCM3060_VALUES`):
 *
 * - VCC (24) on 5V_A_CODEC, from 5V_A through PWR-15's 0 ohm (R_5VA, in `ldo_vmid`), with 100 nF +
 *   10 uF to AGND; VDD (7) on 3V3_CODEC, the codec's own regulator, with 100 nF + 10 uF to DGND
 *   (CODEC-02, schematic-checklist.md:88; analog.md:370). VCOM (21) 100 nF + 10 uF to AGND and no other
 *   connection (CODEC-03, :92). AGND1, AGND2, SGND and DGND on the one GND (CODEC-04, :93).
 * - RST (15) on CODEC_RST_N, the local reset in `codec_sup` (CODEC-05, :94; analog.md:407).
 * - MODE (28) 220 kOhm to DGND (CODEC-06, :98); MS/ADR/IFMD (27) to the codec's VDD, 3V3_CODEC
 *   (CODEC-07, :99); MC/SCL/FMT (1) 4.7 kOhm to VDD (CODEC-08, :103); MD/SDA/DEMP (2) 4.7 kOhm to
 *   DGND (CODEC-09, :104).
 * - SCKI1 (6) and SCKI2 (9) on XO_OUT; BCK1/BCK2 and LRCK1/LRCK2 tied (architecture.md:213), then each pair and DOUT
 *   through 33 ohm at the codec to the codec-side SAI nets BCK_CODEC, LRCK_CODEC and DOUT_CODEC; DIN
 *   (12) on DIN_CODEC; ZEROL and ZEROR open (CODEC-11, :106; analog.md:486; CR-PEDAL-NETS;
 *   CR-PEDAL-DIGITAL-READINGS for where the 33 ohm parts sit).
 * - VOUTL+/- and VOUTR+/- (20-17) to the output stages, VINL and VINR (25, 26) from the ADC drivers
 *   (CODEC-12, :110), as the shared nets CR-PEDAL-NETS spells.
 *
 * NOT MODELLED (CR-PEDAL-POPULATION, class 1): each would join or load nets if fitted, and the model
 * is the default fitted build. The codec page carries a note listing them with CODEC-10's sheet note
 * (`CODEC10_SHEET_NOTE`), and `population.ts` checks the model carries none of them.
 * - CODEC-06's not-fitted 0 ohm from MODE to DGND (schematic-checklist.md:98).
 * - CODEC-09's not-fitted 4.7 kOhm pull-up from pin 2 to VDD (:104).
 * - CODEC-10's two not-fitted 0 ohm links, pin 1 to EXP_I2C_SCL and pin 2 to EXP_I2C_SDA (:105).
 *
 * The 10 uF parts' MPNs are not in parts.md although CODEC-02 says so; a schematic needs none (G245;
 * CR-PEDAL-PCM3060-VALUES). Every decoupling capacitor goes to GND, the checklist's AGND or DGND.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { PCM3060 } from "../pedal-parts.ts"
import { PCM3060_VALUES } from "../pedal-rulings.ts"
import { block, capacitor, part, resistor } from "./build.ts"

const V5A_CODEC = "5V_A_CODEC"
const VDD = "3V3_CODEC"
const GND = "GND"
const MODE = "CODEC_MODE"
const FMT = "CODEC_FMT"
const DEMP = "CODEC_DEMP"
const VCOM = "CODEC_VCOM"
const BCK_PIN = "BCK_PIN"
const LRCK_PIN = "LRCK_PIN"
const DOUT_PIN = "DOUT_PIN"

const CHK = "schematic-checklist.md"
const VALUES = "CR-PEDAL-PCM3060-VALUES"
const SERIES = "analog.md:486 (33 ohm on BCK, LRCK and DOUT at the codec); CR-PEDAL-DIGITAL-READINGS (one per signal, at the codec's pins)"

export function codecBlock(): Network {
  const [hf, bulk] = [PCM3060_VALUES.decoupling.vcc[0], PCM3060_VALUES.decoupling.vcc[1]]
  return block([
    part("u_codec", "ic", {
      "1": FMT, "2": DEMP, "3": DOUT_PIN, "4": LRCK_PIN, "5": BCK_PIN, "6": "XO_OUT", "7": VDD, "8": GND,
      "9": "XO_OUT", "10": BCK_PIN, "11": LRCK_PIN, "12": "DIN_CODEC", "13": NC, "14": NC, "15": "CODEC_RST_N", "16": GND,
      "17": "VOUTR-", "18": "VOUTR+", "19": "VOUTL-", "20": "VOUTL+", "21": VCOM, "22": GND, "23": GND, "24": V5A_CODEC,
      "25": "VINL", "26": "VINR", "27": VDD, "28": MODE,
    }, PCM3060,
      `${CHK}:88 (CODEC-02: VCC from 5V_A through PWR-15's 0 ohm; VDD); analog.md:370 (VDD on 3V3_CODEC); ${CHK}:93 (CODEC-04 grounds); ` +
        `${CHK}:94 (CODEC-05 RST); ${CHK}:99 (CODEC-07 IFMD to VDD, D20); ${CHK}:106 (CODEC-11 clocks, SAI, ZERO pins open); ` +
        "architecture.md:213 (BCK1/BCK2 tied and LRCK1/LRCK2 tied); " +
        `${CHK}:110 (CODEC-12 analog pins); CR-PEDAL-NETS; CR-PEDAL-DIGITAL-READINGS; parts.md:96`),
    capacitor("c_vcc_hf", hf, V5A_CODEC, GND, CAPACITOR, `${CHK}:88 (CODEC-02, VCC 100 nF + 10 uF to AGND); ${VALUES}`),
    capacitor("c_vcc_bulk", bulk, V5A_CODEC, GND, CAPACITOR, `${CHK}:88 (CODEC-02, VCC 100 nF + 10 uF to AGND); ${VALUES}`),
    capacitor("c_vdd_hf", PCM3060_VALUES.decoupling.vdd[0], VDD, GND, CAPACITOR, `${CHK}:88 (CODEC-02, VDD 100 nF + 10 uF to DGND); ${VALUES}`),
    capacitor("c_vdd_bulk", PCM3060_VALUES.decoupling.vdd[1], VDD, GND, CAPACITOR, `${CHK}:88 (CODEC-02, VDD 100 nF + 10 uF to DGND); ${VALUES}`),
    capacitor("c_vcom_hf", PCM3060_VALUES.decoupling.vcom[0], VCOM, GND, CAPACITOR, `${CHK}:92 (CODEC-03, VCOM 100 nF + 10 uF to AGND, no other connection); ${VALUES}`),
    capacitor("c_vcom_bulk", PCM3060_VALUES.decoupling.vcom[1], VCOM, GND, CAPACITOR, `${CHK}:92 (CODEC-03, VCOM 100 nF + 10 uF to AGND, no other connection); ${VALUES}`),
    resistor("r_mode", PCM3060_VALUES.modeToGndOhm, MODE, GND, RESISTOR, `${CHK}:98 (CODEC-06, MODE 220 kOhm +/- 5 % to DGND; D2); ${VALUES}`),
    resistor("r_fmt", PCM3060_VALUES.fmtToVddOhm, FMT, VDD, RESISTOR, `${CHK}:103 (CODEC-08, MC/SCL/FMT 4.7 kOhm to VDD); ${VALUES}`),
    resistor("r_demp", PCM3060_VALUES.dempToGndOhm, DEMP, GND, RESISTOR, `${CHK}:104 (CODEC-09, MD/SDA/DEMP 4.7 kOhm to DGND); ${VALUES}`),
    resistor("r_bck", "33", BCK_PIN, "BCK_CODEC", RESISTOR, SERIES),
    resistor("r_lrck", "33", LRCK_PIN, "LRCK_CODEC", RESISTOR, SERIES),
    resistor("r_dout", "33", DOUT_PIN, "DOUT_CODEC", RESISTOR, SERIES),
  ], [
    V5A_CODEC, VDD, "CODEC_RST_N", "XO_OUT", "BCK_CODEC", "LRCK_CODEC", "DOUT_CODEC", "DIN_CODEC",
    "VINL", "VINR", "VOUTL+", "VOUTL-", "VOUTR+", "VOUTR-", GND,
  ])
}
