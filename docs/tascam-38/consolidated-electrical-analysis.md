# Tascam 38 amplifier-card electrical analysis — consolidated review

**Status:** Exhaustive *inventory and hypothesis review* completed; **contact-by-contact electrical verification NOT complete**. Do not use this as an electrical netlist or as a basis for energizing replacement hardware.

**Primary drawing:** user-supplied `Tascam 38 Complete schematics (High quality scan).pdf`, page 1, **AMPLIFIER SCHEMATIC DIAGRAM**. Page 2 is **TAPE TRANSPORT SCHEMATIC DIAGRAM** and does not substitute for the amplifier sheet. Original scan is a large-format, rasterized sheet, with numerous tightly spaced bus wires and junction dots.

**Secondary evidence:** owner's `Tascam 38.xlsx` / `Junctions`, 50 proposed amplifier contact mappings, preserved in ChatGPT Library. The worksheet is prior reverse-engineering work; its contents are **not** automatically verified by the drawing.

**Design constraint:** all eight amplifier cards interchangeable (owner-confirmed); original motherboard retained unchanged for the first working card; manufacture and external enclosure deferred.

## 1. Board-level functional decomposition

The amplifier drawing contains the following board interfaces:

| Board | What crosses the motherboard boundary | Evidence |
| --- | --- | --- |
| HEAD PCB | Reproduce, sync, erase head wiring and returns/shields | Left-hand head drawing |
| REC/PLAY AMPL PCB | Head front-end, equalization, record/line signal paths, muting, selection, bias amplification | Channel 1 circuit and eight mated connector groups |
| IN/OUT PCB | Eight line input/output connectors | Upper-left drawing |
| FUNCTION PCB | Channel-specific selection/arm controls | Upper-middle switching diagram, J173–J175 |
| OUT SELECT PCB | INPUT / SYNC / REPRO output selection and relay-control circuits | Lower-left drawing, J180/J181 |
| MASTER OSC PCB | Shared high-frequency oscillator; bias/erase distribution | Lower-left drawing, oscillator and J182 |
| MOTHER PCB | Routing between all these assemblies and power/control distribution | Central horizontal buses |

The drawing's detailed channel-1 amplifier and repeated 2–8 interface depiction **do not** imply different card designs. The original card is a multi-function record/reproduce module, not just a playback preamp.

## 2. Head routing and shielding

**Reproduce head:** HEAD PCB P401/J401 to J121/P121 on the motherboard.
**Sync head:** HEAD PCB P402/J402 to J151/P151.
**Erase head:** HEAD PCB P403/J403 to J161/P161.

The repeated 2–8 groups are J122–J128/P122–P128, J152–J158/P152–P158, and J162–J168/P162–P168 respectively. The head illustration includes winding conductors and shield/return connections; a **two-wire-only model is incomplete**. The drawing does not justify conflating erase drive with the low-level sync pickup.

**Still unresolved:** the exact pin on the amplifier card receiving each head conductor, winding polarity, and shield termination. The owner's J101-4, J106-7, and J108-2/3 hypotheses are useful test points, not proven endpoint assignments.

## 3. Eight card connectors / 50-contact inventory

| Card connector | Motherboard mate | Contacts | Functional hypothesis from owner's worksheet |
| --- | --- | ---: | --- |
| J101 | P101 | 4 | Repro head and K101 relay |
| J102 | P102 | 7 | Line output, K102 power mute, meter route |
| J103 | P103 | 6 | Sync select, supply, uncertain switching |
| J104 | P104 | 7 | Play mute and INPUT/SYNC selection |
| J105 | P105 | 7 | Meter, oscillator, +15 V |
| J106 | P106 | **8** | Line input, sync pickup, ±15 V, returns |
| J107 | P107 | 7 | +24 V, ±15 V, function control |
| J108 | P108 | 4 | Erase head, oscillator, return |

**Correction:** previous investigation documents counted J106 as seven contacts and therefore 49 total. The enlarged original drawing and owner worksheet both show **eight** J106 contacts, giving **50 total**. Treat earlier 49-contact tables as superseded. Connector count is verified, but **none of the 50 detailed owner net assignments has yet been fully checked end-to-end against both sides of the drawing**. See `50-contact-audit.csv` for every contact and its provisional interpretation.

## 4. Supply and control bus (verified named connector)

P171/J171 on the motherboard/power-supply section has **eleven contacts**:

| Contact | Printed signal |
| ---: | --- |
| 1 | 6V |
| 2 | 0V |
| 3 | POWER MUTE |
| 4 | REC MODE |
| 5 | REC SIGNAL |
| 6 | PLAY MUTE |
| 7 | 0V |
| 8 | 24V |
| 9 | +B(15V) |
| 10 | -B(-15V) |
| 11 | 0V |

**Do not treat these as amplifier-card contact assignments.** The three separate 0V pins must not be assumed physically interchangeable without tracing returns and current paths. The 6V and +24V nets may power switching and other functions rather than the audio op-amps. The labels give nominal rails, not measured voltages under different modes.

## 5. Circuit functional review and dependencies

### Reproduce front end

The channel-1 amplifier section contains relay **K101**, transformer **TR101**, and **U101** in the low-level reproduce path. The owner's hypothesis is that J101-4 carries the reproduce-head signal and J101-2 participates in a 24 V K101 coil circuit. A relay coil energizing does **not** mean its contacts short the supply to ground: distinguish **coil current path**, **flyback diode D101**, and **separate signal contacts**. The precise K101 state in REPRO versus other modes is **not verified**.

**Implication:** Reproduce replacement needs head loading, low-noise gain, reproduce EQ and proper switching/muting. It is not yet safe to specify gain or impedance from the present tracing.

### Sync path

The separate **SYNC HEAD** winding connects to the motherboard via P151. Owner proposes J106-7 as sync input. Its relationship to the record/sync head and mode selection must be traced before treating it as a low-level input. Sync monitoring may have distinct gain and equalization from reproduce.

### Line input / record chain

Owner proposes **J106-1** from line INPUT J141-1. The amplifier circuit contains record-path equalization/drive and a BIAS AMPL section. A complete replacement must ultimately preserve record level, high-frequency EQ, bias injection and the head switching behavior. The shared oscillator is separate from the per-channel bias amplifier; they must not be confused.

### Line output and meter

Owner proposes **J102-2** to line OUTPUT J131-1 via K102, and **J105-7** to meter J176-1. The worksheet is internally inconsistent about whether J102-5 joins **J105-1** or **J105-2**. Until the meter/output branch is traced, do not tie these pins together.

### Mute and mode control

Owner proposes J102-3 = POWER MUTE, J104-1 = PLAY MUTE, J104-4 = INPUT select, J104-5 = SYNC select, J104-3/J107-7 = function control. The drawing confirms separate function and output-select boards, but **not yet the complete per-pin path**. Muting and selection may use both transistor/JFET networks and relays. Do not equate a 24 V *control* net with a 24 V *audio* signal.

### Oscillator / erase

Owner proposes **J105-6** connected to MASTER OSC J182-5 and **J108-4** to J182-8; J108-2/3 to ERASE HEAD J161. The J103-4 note also mentions the erase head, which may be a misidentification or a shared connection. Trace oscillator drive, bias injection and erase-head return separately; high-frequency paths must be treated as potentially hazardous to test instruments.

## 6. Explicit conflict / uncertainty register

| ID | Issue | Evidence | Required resolution |
| --- | --- | --- | --- |
| C01 | J106 7 vs 8 contacts | Original drawing shows 8; worksheet has 8 | **Resolved: 8**, correct old files |
| C02 | J102-5 → J105-2 vs J105-1 → J102-5 | Contradictory owner worksheet rows | Trace output/meter branch on both sides |
| C03 | J103-4 possibly erase head / J108-3 | Owner marked (?) | Trace to P161 and card-side circuit |
| C04 | J103-6 links to J103-4 | Worksheet | Verify actual net continuity/junction |
| C05 | J103-5 target recorded as `107` | Worksheet typo candidate | Normalize to J107 only if verified |
| C06 | J101-2 K101 relay behavior ambiguous | Owner notes two alternatives | Distinguish coil, diode and signal contacts |
| C07 | J106-8 marked GND | Owner; original drawing shows contact | Verify electrical endpoint and return type |
| C08 | J107-6 unknown, J107-7 J174-1 | Owner | Trace channel-function selection |
| C09 | J102-1/6/7, J104-7, J105-2/3/4 etc marked X | Owner | X means unknown, **not** proven NC |
| C10 | Physical channel-1 diagram vs repeated 2–8 | Drawing layout vs owner confirmation | Same card; trace motherboard bus fan-out, not different cards |
| C11 | Three 0V supply contacts | P171 labeling | Trace ground distribution rather than collapsing them |
| C12 | Head shield / winding conductor interpretation | Head drawing | Verify shielding and polarity before input topology |

## 7. Schematic-only verification protocol

For every row of `50-contact-audit.csv`:

1. Find the card-side J10x pin and trace through **every junction** to named component terminal(s), including relay coil versus contacts.
2. Find the matching P10x pin below the motherboard boundary and trace to a **labeled** destination connector or P171 bus.
3. Record a concise route such as `J101-4 → [component node] / P101-4 → [motherboard net] → P121-n`, with schematic location and confidence.
4. If a line crossing or label cannot be read, leave it **UNRESOLVED**; do not promote worksheet conjecture to VERIFIED.
5. Record the operational mode and polarity if and only if the drawing establishes them. Bench measurements are a later, separate evidence class.
6. Resolve all C01–C12 issues and audit each contact independently before approving a replacement schematic.

## 8. Completion gate and blocker

**Completed:** original source preserved; 50-contact inventory; head connector families; shared P171 supply/control pinout; full owner-hypothesis audit; functional decomposition; explicit conflicts.

**NOT completed:** an electrical endpoint mapping for each of the 50 card contacts. A source image containing all wires exists, but the dense motherboard trace crossings and junctions have not been independently followed for every pin. This is an **analysis-completeness limitation**, not a missing source or a request for user input. We should not call the netlist finished, generate a PCB, or claim the card can be safely powered.

Next concrete action is a high-resolution **contact-by-contact continuity trace** of the drawing, with separate card-side and motherboard-side evidence for all 50 rows. No web search is needed.
