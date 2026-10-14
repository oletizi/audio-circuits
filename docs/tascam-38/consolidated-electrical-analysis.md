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

**Correction:** previous investigation documents counted J106 as seven contacts and therefore 49 total. The enlarged original drawing and owner worksheet both show **eight** J106 contacts, giving **50 total**. Treat earlier 49-contact tables as superseded. Connector count is verified, but **none of the 50 detailed owner net assignments has yet been fully checked end-to-end against both sides of the drawing**. See `interface-matrix.csv` for every contact and its current status.

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
| C13 | P104-7 joined to P107-2 on motherboard; J104-7 marked X | p107-2-p104-7-motherboard-link.md vs worksheet | Trace J104-7 card-side node and P107-2 route to P171 |
| C14 | No card contact reaches the Q110/Q106/Q105 selection network or its gate diodes D112/D107/D106 | trace/pass1-j107-j104.md (select lines seen near x 6412, 6455, 6599, untraced) | Trace those lines on the card to their source |
| C15 | Italic voltage annotations ("24V", "-15V", "15V") are node DC values, not rail names; three "-15V" lines are separated by 100k resistors | trace/pass1-j101-j103.md | Identify each rail by its motherboard route to P171, not by annotation |
| C16 | A "24V" annotation leader near (7020,1950) is ambiguous between the J104-3 and J104-5 lines | trace/pass1-j107-j104.md | Re-check at higher zoom; resolve from the motherboard side |
| C17 | Crossing at (4245,3731) on the P171-7 riser: one tracer reads a junction dot, another reads it as uncertain. It decides whether P108-1 (and the y~3734 bus with P176-2/4) is on 0V | trace/pass2-p106-p108.md vs trace/pass2-p101-p103.md; re-traces split two (dot) to two (may be a dot), none read a plain crossing | Physical continuity check P108-1 to P171-7 |
| C18 | Slight thickening where the P104-5 bus crosses the P171-11 0V vertical at (4145,3033); read as no dot | trace/pass2-p107-p104.md | Independent re-trace |
| C19 | Ink blob at (4195,3472) where the +B(15V) riser crosses the 2ch P102-2 line; read as no dot by two tracers independently | trace/pass2-p102-p105.md, trace/pass2-p106-p108.md | Independent re-trace; a dot here would short +15 V to a line output, so likely a print defect |
| C20 | P121, P151, P161 head connectors have no printed pin numbers; contacts cited as upper/lower | trace/pass2-p101-p103.md, trace/pass2-p106-p108.md | Physical inspection of the HEAD PCB connectors |

**Pass 2 outcomes for earlier items:** C02 resolved (card J102-5 joins J102-2; motherboard U-link P102-5 to P105-1 only). C03 resolved (erase head is J108-2/3 via P161; J103-4 is an OUT SELECT line to P181-3). C04 resolved (J103-4 and J103-6 join on the motherboard at P181-3, not on the card). C05 resolved (J103-5 is -B on P171-10). C07 resolved (J106-8 is a sync/record head lead via P151, tied to the card common bus). C13 resolved (no wire on J104-7 or P104-7; the P107-2 join is refuted).

**Pass 3 outcome:** C14 resolved - the Q105 / Q106 / Q110 gates are driven from bias nodes fed by J103-6 (P181-3), J104-5 (P181-2) and J104-4 (P181-1) / Q109, with Q108 (from FUNCTION, J104-3) overriding SYNC and INPUT; see `circuit-analysis.md` and `analysis/block-control-muting.md`. Open circuit questions continue in `circuit-analysis.md` (A1-A11).

## 7. Schematic-only verification protocol

For every row of `interface-matrix.csv`:

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
