# Head connector shield topology from high-resolution scan

Source: uploaded p2(1).pdf, left-hand HEAD PCB and MOTHER PCB junctions.

The channel-1 head assembly shows three separate head connections:
- REPRO HEAD through P401/J401 and J121/P121.
- SYNC HEAD through P402/J402 and J151/P151.
- ERASE HEAD through P403/J403 and J161/P161.

**Additional observation:** A vertical conductor on the HEAD PCB joins the shield/return symbols at J401, J402 and J403. This is a common **head-board shield/return network**, distinct from the separately drawn head winding conductors. Do not interpret the two lines of each winding as a complete head interface or assume shield current should flow through an audio signal return.

The mother PCB drawing routes the repro and sync pairs separately from erase wiring. These connector families are not amplifier-card pin numbers. The detailed winding polarity and the exact J101/J106/J108 contact endpoints still need verification.

The IN/OUT PCB has separate line input and output connections for all eight channels. Channel 1 line connectors are J131/P131 (OUTPUT) and J141/P141 (INPUT); these are separate from head-level signals.

No electrical modifications are proposed.
