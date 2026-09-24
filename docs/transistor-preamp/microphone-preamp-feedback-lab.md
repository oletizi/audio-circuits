# From one transistor to a feedback microphone preamp

**Working package · 23 September 2026**  
**Formats:** breadboard tutorial/lab, blog draft, and YouTube video treatment  
**Premise:** Start with the single-transistor amplifier already on the breadboard. Change one feedback mechanism at a time, measure what changes, and use the Neve 1073 as an architectural reference point rather than a parts list.

## The question the project answers

Can a simple common-emitter microphone amplifier be made less dependent on a particular transistor and less distorted without losing useful gain? What does a second and third transistor buy us, and which parts of the answer resemble the feedback strategy of a 1073?

The 1073 is a complete 24 V, transformer-coupled system with selectable gain and separate amplifier blocks. This 9 V, single-ended breadboard is an educational progression, **not a 1073 clone or a finished low-noise balanced mic preamp**. In particular, simply chaining three transistors does not create a useful global-feedback amplifier; stage polarities, DC operating points, loop gain, stability, loading, and compensation must all be designed.

### Accuracy check before the first modification

The initial reported measurements were: **9 V supply**, upper/lower base resistances 80 kΩ/10 kΩ, collector resistor 1.8 kΩ, emitter resistor 1.5 kΩ, base 1.25 V, emitter 0.65 V, collector 7.0 V, supply current 3 mA, and gain greater than 25 dB. These do **not yet define one consistent operating point**:

- Emitter current calculated from the measurement is 0.65 V / 1.5 kΩ = **0.433 mA**.
- With 9 V across the collector branch, a 7 V collector gives `(9 − 7)/1.8 kΩ` = **1.11 mA** through `RC`, far above the emitter's calculated **0.433 mA**. In the stated divider-biased circuit, `RC` should carry approximately collector current; it would instead drop roughly **0.78 V** and `VC` would be near **8.22 V**. Some additional collector-connected branch, an incorrect effective resistor value, or readings taken under different conditions would be needed to explain the gap.
- An unloaded 80 kΩ/10 kΩ divider on the confirmed 9 V rail would put the base at **1.0 V**, and ordinary transistor base current pulls that downward, not up to 1.25 V. A rheostat or potentiometer may have been measured differently from its effective in-circuit connections, or a rail/ground reference may differ.
- Supply current also includes divider current and any other loads. It cannot be equated directly with transistor collector current.

**Record simultaneously** the 9 V rail at the top of `RC` and `RB1`, the actual resistance of each pot **between its two connected nodes with power off**, all three transistor node voltages relative to the same ground, voltage across `RC`, the emitter bypass arrangement, and which supply loads are present. Calculate `I_RC = (Vrail − VC)/RC` and `I_E = VE/RE`; they should be close after accounting for branches drawing current from the collector. Treat the reported voltages as an experimental starting point, not design targets, until this check is complete.

## Lab setup and measurement contract

Use a current-limited 9 V bench supply, a small-signal NPN such as a 2N3904, a scope, signal generator, DMM, resistor assortment, capacitors, and at least three transistors of the **same part number** with different measured DC gain. Verify the pinout of each device. Start with a generator, not a microphone; microphone type, transformer, phantom power, balanced input, and noise optimization are later topics. Never apply phantom power to this breadboard input.

Use a 1 kHz sine wave at a documented source amplitude and source resistance; begin around **5 mV RMS at the amplifier input**, then increase until distortion becomes measurable. Measure *at the amplifier input node* as well as the collector or buffered output. AC-couple the output to a high-impedance measurement load (e.g. 100 kΩ); retain the same output capacitor and load throughout. If using an audio interface, establish its input headroom and avoid its own clipping. A 10× scope probe is generally a lighter load than a 1× probe. Keep generator grounding consistent with the supply.

For every configuration log: supply voltage and current; `VB`, `VE`, `VC`; calculated `IE` and `IRC`; actual component values; input and output RMS; gain `20 log10(Vout/Vin)`; maximum unclipped output; and THD or THD+N **only if the measurement instrument can resolve it**. Take a baseline noise measurement with the input terminated in the chosen source resistance. Keep input level, load, bandwidth, and source resistance identical across A/B comparisons. Frequency sweeps at ~100 Hz, 1 kHz, and 10 kHz help distinguish feedback effects from coupling and bypass capacitors. Record transistor identity and ambient conditions.

### Lab sequence

| Build | Change from prior build | Feedback path | Principal question |
| --- | --- | --- | --- |
| 0. Existing stage | Reconcile and document the exact divider-biased build | Emitter resistor at DC; perhaps bypassed at audio | Where are the actual operating point, gain, and limits? |
| 1. Split emitter resistor | Keep total `RE = 1.5 kΩ`; bypass only the lower part | Local AC emitter degeneration | How much linearity costs how much gain? |
| 2A. Add collector-to-base resistor | Retain divider at first; measure DC shift | DC and AC collector feedback | What changes when output influences the base? |
| 2B. Rebuild bias around collector feedback | Remove upper divider leg; test with/without base-to-ground leg | Collector feedback plus emitter degeneration | How sensitive is bias to device β? |
| 3. Add an output buffer | Emitter follower after an AC-coupled gain stage | Local follower feedback | Can the voltage-gain stage drive a lower load predictably? |
| 4. Design one multi-transistor feedback block | Separate design/simulation gate, then breadboard | Output returned to input stage | What does global feedback buy, and what can make it unstable? |

### Build 0 — establish a trustworthy baseline

Draw the **as-built** circuit, including pot terminals, emitter bypass capacitor, input/output coupling, source and load. Do the accuracy check above before claiming a particular gain or low-distortion bias point. Repeat the measurement after swapping two other transistors of the same type without turning the adjustments. Track output level, collector voltage, clipping threshold, and noise as well as distortion. A scope trace that looks clean does not establish low THD or low noise by itself.

### Build 1 — emitter feedback you can dial in

Replace the 1.5 kΩ emitter resistance with **100 Ω + 1.4 kΩ in series**. Put the bypass capacitor across the **1.4 kΩ only**. This preserves nominal DC resistance and leaves roughly 100 Ω of external degeneration at frequencies where the bypass capacitor is effective. Compare 0 Ω (fully bypassed), 100 Ω, 220 Ω, and 1.5 kΩ (unbypassed) of AC emitter resistance; rearrange resistor values to keep the **DC sum near 1.5 kΩ**. Do not put a pot directly across the emitter-to-ground DC path where a wiper failure can remove bias stabilization.

At the measured 0.43 mA current, the transistor's small-signal internal emitter resistance is about `r_e ≈ 25 mV / IE ≈ 58 Ω` near room temperature. A first-pass gain estimate with 100 Ω unbypassed is `Av ≈ −(RC || Rload)/(100 Ω + r_e)`, about **−11** into a light load before source loading and transistor effects, **not −18** from `RC/100 Ω`. The bypass capacitor must have low reactance across the frequencies being compared; otherwise gain and distortion will change with frequency. Measure rather than promise a particular THD improvement.

**Checkpoint:** plot gain, distortion if measurable, and maximum unclipped output against unbypassed emitter resistance. Compare at the **same output amplitude** as well as the same input amplitude; those answer different questions.

### Build 2A — add collector feedback without hiding its DC effect

Return to a chosen Build 1 setting. Add a **1 MΩ resistor from collector directly to base**, with power off. Recheck all DC node voltages before applying signal. At the *previously reported* `VC = 7.0 V` and `VB = 1.25 V`, the initial resistor current would be `(7.0 − 1.25)/1 MΩ ≈ 5.8 µA`; at 470 kΩ it would be **12.2 µA**. The 80 kΩ/10 kΩ divider has a Thevenin resistance of about **8.9 kΩ**, so 470 kΩ is relatively weak in this particular base network, but its DC effect is measurable and the operating point needs to be checked. Work down through 680 kΩ and 470 kΩ if headroom remains adequate.

For an **AC-feedback-only control**, put a capacitor in series with the feedback resistor; orient a polarized capacitor for the measured collector-to-base DC difference, or use a suitable nonpolar part. This leaves the original DC divider in control after settling, but the feedback now has a frequency-dependent low-frequency cutoff. A 100 nF film capacitor and 470 kΩ resistor are a reasonable experimental pair at midband; verify the actual corner in circuit. Comparing the direct resistor and series capacitor separates bias feedback from AC feedback.

**Checkpoint:** Does the gain fall, and does distortion at the same output amplitude change? Which DC voltages change with direct feedback and remain approximately the same with AC coupling?

### Build 2B — let the collector participate in setting bias

Remove the **upper** `+V → base` divider resistor; retain a base-to-ground resistor and the direct collector-to-base resistor. This is the conceptual connection to a Big Muff gain stage, but **copying its 470 kΩ alone does not reproduce its behavior**. Preserve input AC coupling. For a first breadboard trial with the original `RC` and `RE`, try **470 kΩ collector-to-base and 150 kΩ base-to-ground**; regard these as starting values contingent on the newly measured rail, transistor, and loading, not guaranteed settings. Start with the input disconnected or terminated, supply current limited, and inspect DC voltages. Then try the collector-to-base resistor alone (no base-to-ground leg) with a resistor in roughly the **1 MΩ–1.5 MΩ** range, measuring every configuration.

For the no-base-to-ground version, a useful approximate relationship is

`IE ≈ (VCC − VBE) / [RE + RC + RFB/(β + 1)]`.

It assumes active-region operation and neglects small secondary effects. It shows an essential limitation: collector feedback does **not** automatically make this specific circuit nearly independent of β. With `RFB = 1.3 MΩ`, `RC = 1.8 kΩ`, `RE = 1.5 kΩ`, `VCC = 9 V`, and `VBE ≈ 0.6 V`, β values of 50, 100, and 200 predict approximately **0.29, 0.52, and 0.86 mA** respectively. The original divider and emitter resistor may hold DC bias **more** tightly in this particular comparison. Test the real devices, and distinguish **tolerance of any usable bias** from **a nearly identical bias point**.

**Checkpoint:** swap the same three transistors without retrimming. Plot collector voltage, gain, and unclipped output for the divider-biased and collector-biased versions. This is the central experiment; don't assume the Muff topology wins.

### Build 3 — what an output transistor contributes

AC-couple the collector of the chosen voltage-gain stage into a separately biased emitter follower. Give the follower its own emitter resistor and an output coupling capacitor; confirm its collector, base, and emitter DC voltages before loading it. Measure its nearly unity voltage gain, then compare the single-transistor output and buffered output into **100 kΩ, 10 kΩ, and 2 kΩ** loads. Retain a sensible current limit and verify that the output coupling capacitor does not explain any low-frequency change.

An emitter follower improves load drive and isolates the preceding collector from changes in the external load. It does not magically improve the first stage's input-referred noise, nor does it make the two stages one global feedback loop.

### Build 4 — a gated move toward a Neve-like *idea*

First draw a two- or three-transistor amplifier with identifiable input and output nodes and a **defined output-to-input-stage feedback return**. Establish every DC bias point and stage polarity without the global feedback connection. Then simulate or measure open-loop gain and phase over a frequency range beyond audio, choose a feedback factor that yields sufficient loop gain at the desired closed-loop gain, and add frequency compensation as required. Power up with current limiting and check for high-frequency oscillation on a scope before connecting a microphone or interface. Change one part at a time. A global feedback loop cannot be prescribed safely as one extra resistor across an unspecified chain of stages.

The 1073 reference is useful here because its original documentation depicts **separate preamplifier and output amplifier sections** on the BA283AV card, plus BA284 amplifier circuitry and system-level gain switching. Its performance also depends on input/output transformers and the wider module's loading. The goal of Build 4 is to understand the division of labor and feedback, **not to attribute every 1073 behavior to one generic three-transistor circuit**.

**Exit criterion:** publish a new, fully annotated schematic only after the first three builds provide measured targets for gain, source/load impedance, noise, output swing, and transistor-swap tolerance. Build 4 can be a follow-up article/video if it needs substantial design work.

## Blog post draft

### Working title: From a Big Muff transistor stage to a Neve-style feedback amplifier

I built a one-transistor microphone amplifier on a breadboard and found a setting that gave me more than 25 dB of gain. I adjusted its base bias and collector resistor until the waveform looked least distorted. Then I asked a different question: if I swap the transistor, will it still behave the same way?

That question led me to the Big Muff. Its gain stages commonly bias a transistor through a resistor running from collector back to base. If collector current rises, collector voltage falls; that reduces the current flowing back toward the base. The circuit pushes against the original change. It is a neat way to make a simple stage usable with ordinary transistors whose measured gain can vary considerably.

My breadboard has a different starting point: an upper and lower base-bias resistor, a collector resistor, and an emitter resistor. Before changing the circuit, I need to reconcile the numbers I measured. The supply **was 9 V**. The 0.65 V across the 1.5 kΩ emitter resistor suggests about 0.43 mA of emitter current. But 9 V at the top of a 1.8 kΩ collector resistor and 7 V at its bottom suggest about 1.11 mA through that resistor. Those readings cannot both describe the simple circuit as drawn, without another substantial current path or an incorrect effective resistor value. The reported base voltage also exceeds what the stated divider alone can supply. This is why the first lab task is drawing and measuring the circuit **as actually wired**.

The first deliberate change is at the emitter. An emitter resistor feeds a change in current back into the base-emitter voltage: more emitter current produces more emitter voltage, opposing the increase. A bypass capacitor can remove much of that feedback for audio while preserving it for DC bias. By splitting my 1.5 kΩ resistor and bypassing only the lower part, I can leave 100 Ω or 220 Ω active for audio. I expect less gain and, at a controlled comparison level, better linearity; the measurements will show how much.

Next I add a resistor from collector to base. With the existing low-resistance bias divider still in place, a 470 kΩ part is a relatively modest influence, although it also carries DC and can move the bias point. I will measure it directly and compare it with an AC-coupled feedback path. Then I'll remove the divider's upper leg and make collector feedback a central part of the bias network, like the Muff approach. The real test is swapping several transistors without readjusting anything. The winner isn't whichever schematic looks cleverer: it is the one whose **actual voltages, gain, headroom, and noise** stay within the range I need.

There is a catch I find especially interesting. A collector-to-base resistor alone is not a universal cure for transistor variation. With my relatively small 1.8 kΩ collector resistor and a large feedback resistor, a simple calculation predicts appreciable current changes across a wide range of transistor β. My original divider plus emitter resistor might be more repeatable. That is an experiment worth doing, not a conclusion to hide.

After that comes a second transistor: an emitter-follower output buffer. It should make the gain stage less sensitive to the load that follows, though the buffer won't fix the input transistor's noise. Once I can measure the gain stage and the buffer separately, I can ask what happens when feedback encloses **both** stages. That is where the analogy with a Neve preamp becomes useful. A 1073 uses several amplifier sections, gain switching, transformers, and feedback. It isn't three Big Muff stages in a row, and I won't get its behavior by copying three transistors onto a 9 V breadboard. But I can learn the design move: build more gain and drive than I need, then use a properly designed feedback network to control the complete block.

I'll publish the voltages and scope captures for each build, including results that disprove my hunches. The goal is a microphone preamp I understand well enough to change, not a mysterious circuit that happened to work with one transistor.

## YouTube video treatment

**Working title:** “One transistor, three feedback experiments: building toward a mic preamp”  
**Target length:** 12–16 minutes for Builds 0–2; a separate follow-up for buffer and global feedback if their tests require it.  
**Visual rule:** Every schematic edit appears next to a shot of the actual breadboard connection and the measured node voltages. Use the same generator level and load for the A/B overlays.

| Time | Picture / bench action | Spoken point |
| --- | --- | --- |
| 0:00–0:45 | A/B clip at matched output level; transistor swap; title | “This single transistor gives me gain. What happens when I replace it with another?” Do not imply an audible difference before the test. |
| 0:45–2:30 | As-built diagram; supply, three node readings, resistor voltage drops | Reconcile the reported 0.43 mA emitter current and collector reading. Show corrected baseline data on screen. |
| 2:30–4:30 | Animate `VB − VE`; bypass capacitor moved from all of `RE` to the lower portion | Show local emitter feedback and why DC bias stays approximately the same when the total resistor stays 1.5 kΩ. |
| 4:30–6:30 | Scope/audio analyzer split screen; gain and distortion chart | Compare at the same output level; identify what the instruments can and cannot resolve. |
| 6:30–8:30 | Add direct 1 MΩ then 470 kΩ collector-to-base resistor; DMM readings before audio | Explain collector feedback and its DC current; compare with series-capacitor AC feedback. |
| 8:30–11:30 | Remove upper divider resistor; three transistors swapped without adjustment | Ask whether collector-feedback bias actually improved tolerance on *this* build. Plot collector voltage, gain, and headroom. |
| 11:30–13:00 | Block diagram: gain stage, output buffer, whole-block feedback; original 1073 card reference | Explain what the extra transistor and eventual global loop might add, with the transformer and 24 V context. |
| End | Bench log and next-build schematic | Point to downloadable measurements; invite viewers to predict which topology tolerated β variation best. |

### Presenter script: opening and transitions

> I have a one-transistor amplifier on the breadboard. I tuned it for a clean-looking output and measured more than 25 dB of voltage gain. But I only know it works with *this* transistor. Today I'll make three changes, one at a time: leave some emitter resistance unbypassed, return some collector signal to the base, and then let that collector connection set the bias. I want to see which change improves repeatability when I swap transistors.

> First, the unglamorous part: my original measurements don't quite add up. The supply was nine volts. At 0.65 volts across 1.5 kilohms, the emitter current is about 0.43 milliamps. But two volts across the 1.8 kilohm collector resistor suggest 1.11 milliamps through it. So I need to check the pot connections, effective resistor values, and simultaneous node voltages before drawing any conclusions.

> [After emitter experiment] This resistor is feedback I can see on a meter. When current rises, emitter voltage rises, which subtracts from base-to-emitter voltage. The capacitor determines how much of that action remains at audio frequencies. Here's the gain change, and here's the distortion measurement at a *matched output level*.

> [At collector experiment] Now the output at the collector can influence the input at the base. Because this stage inverts, that is negative feedback. A direct resistor also feeds DC current into the bias network, so I measured the operating point again before sending audio through it. The capacitor version lets me isolate the audio effect, subject to its own frequency cutoff.

> [At transistor swap] The Big Muff connection was my inspiration, but this is the decisive test. These are three devices of the same type, installed one after another with no adjustments. Here are the collector voltage, gain, and available output swing. Did the collector-feedback version actually tolerate the swap better than the divider version?

> [Closing] The 1073 takes a larger architectural step: separate amplifier functions and feedback around more of the signal path, with transformers and higher supply voltage as part of the system. An output buffer is the next manageable experiment. Designing a stable feedback loop around multiple transistors comes after we know the gain, loading, and headroom we really need.

### Production assets to capture

Save an as-built schematic and a schematic for each modification; a CSV measurement log; photographs of each breadboard state; scope captures with volts/division and timebase visible; synchronized A/B audio **only after level matching**; and a single graph of collector voltage/gain/headroom for each transistor. Label any THD trace with test level, bandwidth, instrument, and load. Do not claim an audible “Neve sound” from these experiments.

## References and circuit provenance

1. [AMS Neve, “History of the 1073”](https://www.ams-neve.com/consoles/history-of-1073/) describes multiple transistor-based input gain stages, the transformer-coupled output amplifier, and transformer roles.
2. [Neve 1073/1084 User Guide, issue 5](https://medias.audiofanzine.com/files/neve-1073-1084-user-manual-issue5-478436.pdf), especially the block diagram and schematic drawing index, identifies the BA283AV mic/line/output card, BA284 mic/EQ amplifier card, and system context. It is a reproduction of manufacturer documentation.
3. [BA283AV circuit diagram](https://www.benmook.com/tech/documents/Schematics%202/Schematics%201/NeveAV283.pdf), archival reproduction of the original card drawing. Consult its marked preamplifier and output sections before making topology claims; card revision and installed population matter.

The numeric lab predictions are first-order calculations from the stated circuit values, **not** measured results or claims from these references. The earlier conversational shorthand “the Neve preamp is a three-transistor block with an emitter-follower Q3” is too imprecise for a 1073 as a whole; this package deliberately avoids assigning one universal three-device circuit to its several sections.
