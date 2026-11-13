# pt2399-core bill of materials

Supply 5 V on "+5V" (J1 pin 1); no controls. Resistor power ratings are bounded by the rail, not simulated.

## On the board

| Designators | Needs | Qty | Buy | Description | Manufacturer / MPN | Links | Unit price | Line price |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C6, C11 | 560pF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 2 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C8, C12 | 5600pF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 2 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C9 | .01uF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C1, C4, C5, C13, C14 | .1uF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 5 | 6<br>6 | 0.1uF (100nF), 50V, X7R, 10%, radial-leaded multilayer ceramic, 2.5mm lead spacing, size-15 body (Wb 4.0mm x T 2.6mm max), straight 0.5mm leads 30mm long | Vishay BCcomponents K104K15X7RF53L2 | [Mouser (standard)](https://www.mouser.com/en/ProductDetail/Vishay-BC-Components/K104K15X7RF53L2?qs=mWFvmKOfYW8KbAXlf9eSQA%3D%3D) (checked 2026-10-16)<br>[Digi-Key (standard)](https://www.digikey.com/en/products/detail/vishay-beyschlag-draloric-bc-components/K104K15X7RF53L2/2820506) (checked 2026-10-16) | 0.22 USD<br>0.29 USD | 1.32 USD<br>1.74 USD |
| C7 | 4.7uF, radial, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C10 | 10uF, radial, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C3 | 47uF, radial, <= 6.3 mm dia, 2.5 mm leads, min 6.3 V | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| C2 | 100uF, radial, <= 5 mm dia, 2 mm leads, min 6.3 V | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| J1 | 5-pin 2.54 mm header | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| U1 | PT2399, DIP-16, 7.62 mm rows, 2.54 mm pitch | 1 | 2 | PT2399 CMOS echo audio processor, 16-pin DIP (300 mil), through hole | Princeton Technology Corp PT2399 | [PedalPCB (specialty)](https://www.pedalpcb.com/product/a6006/) (checked 2026-11-13) | 1.50 USD | 3.00 USD |
| R5 | 2.7K, 0207 axial, 10.16 mm leads, min 0.25 W | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| R1, R7 | 10K, 0207 axial, 10.16 mm leads, min 0.25 W | 2 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| R2, R3, R6, R8 | 15K, 0207 axial, 10.16 mm leads, min 0.25 W | 4 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |
| R4 | 100K, 0207 axial, 10.16 mm leads, min 0.25 W | 1 | not chosen | not chosen | not chosen | not chosen | not chosen | not chosen |

## Extras

| Designators | Needs | Qty | Buy | Description | Manufacturer / MPN | Links | Unit price | Line price |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DIP-16 socket under U1 so the PT2399 can be swapped; the owner ruled on 2026-11-13 to fit one | - | 1 | 2<br>2 | 16-position DIP IC socket, 2.54 mm pitch, 7.62 mm (0.3 in) row spacing, tin contacts, through hole, for a PT2399 in Package_DIP:DIP-16_W7.62mm | TE Connectivity 2485264-3 | [Mouser (standard)](https://www.mouser.com/en/ProductDetail/TE-Connectivity/2485264-3?qs=IKkN%2F947nfCox2m7PgP00g%3D%3D) (checked 2026-11-13)<br>[Digi-Key (standard)](https://www.digikey.com/en/products/detail/te-connectivity-amp-connectors/2485264-3/24770051) (checked 2026-11-13) | 2.16 USD<br>2.27 USD | 4.32 USD<br>4.54 USD |

## Totals

| Supplier | Currency | Total |
| --- | --- | --- |
| Digi-Key | USD | 6.28 |
| Mouser | USD | 5.64 |
| PedalPCB | USD | 3.00 |

## Bulk buys

Bought in bulk:

- none

Not bought in bulk:

- C1, C4, C5, C13, C14 (ceramic-100nf-50v-x7r-radial-2.5mm) at Digi-Key: not 100 - dropped to keep the Digi-Key USD order within 50% over its total at covered quantities; buying 6
- C1, C4, C5, C13, C14 (ceramic-100nf-50v-x7r-radial-2.5mm) at Mouser: not 100 - dropped to keep the Mouser USD order within 50% over its total at covered quantities; buying 6
