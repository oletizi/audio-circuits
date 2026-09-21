# Pultec reference

The reference this project's modules are validated against. Step 1 of
[the implementation plan](../../docs/pultec/implementation-plan.md).

The circuit is Ian Thompson-Bell's **Pultec 3 Band EQ** — an EQP-1 and an MEQ-5
combined, as his own PCB artwork titles it ("Pultec EQP1/MEQ5 Tube EQ © 2012 Ian
Thompson-Bell"). It is not a literal EQP-1A, and the plan's earlier "EQP-1A"
phrasing should be read as shorthand for this circuit.

## Source hierarchy

Three sources, in decreasing authority. Where they disagree, the higher one wins
and the disagreement is recorded in [unresolved.md](unresolved.md).

1. **Component values** — Ian Thompson-Bell, *Pultec 3 Band EQ Documentation*
   (`P3bandDoc.pdf`, © 2012, PDF dated 2017-03-02). Definitive for every
   capacitor, inductor and potentiometer value. Held at
   `multi-channel-preamp/reference/3BandPultec/P3bandDoc.pdf`.
2. **Topology** — the KiCad schematic `pultec-three-band-eq.kicad_sch` in
   `multi-channel-preamp`, at commit `c0f6f39`. Definitive for connectivity.
   This is also the board that was manufactured: it is the only design in that
   repository with a complete gerber set, drill file and fab package, exported
   2024-07-16 and committed the next day as "re-worked the mid-range - exported
   gerbers for PCB manufacture".
3. **As-built hardware** — not captured anywhere. The inductors are hand-wound.
   See unresolved item 1.

`docs/1.0/COMPONENT_VALUES.md` in that repository is **not** a source. Its
section assignments are scrambled; see unresolved item 6.

## Retained artifacts

`source/*.net.xml` are exact netlist exports, not transcriptions. No OCR and no
manual reading is involved in the topology.

| File | sha256 |
| --- | --- |
| `source/three-band-eq.net.xml` | `d38a2472ba565a58501d39f43361e90f7750db5dbde5764d2c073033c809ba0a` |
| `source/boost-high.net.xml` | `c4ec3f74fee1de8cb0d2be3ca64f86cbd959e1aef3c6cbb9edc35667cc15c998` |
| `source/cut-high.net.xml` | `1ddb6c7aa57a61c0f5bccbeb85a60bba9dcf9594753ac3ee02d09242d80fa170` |
| `source/cut-low.net.xml` | `e633bc3a5616915732a26f9249cfc0e9e1360f583ceff6a87ebb7eaa7e00925c` |

Source schematic digests at the time of export:

| File | sha256 |
| --- | --- |
| `pultec-three-band-eq.kicad_sch` | `9937e9cd9cfa67acdeba7404289889653e740d807d9cdf8eb03e6509abb0622c` |
| `pultec-mid-band.kicad_sch` | `bc85ae3ae0ab5bb6f470ae34f9c3c9a22d3efdd9a138c0d5865b25e425611691` |
| `pultec-boost-high.kicad_sch` | `1bb2836bb371dbc2d5ba23ecff08f5c0bf7a06cb9efb31decb0af23328121ac4` |
| `pultec-cut-high.kicad_sch` | `462c1ebc04b1fc49830f727d6ade2958a5a51662462687e6327386ad5b96e352` |
| `pultec-cut-low.kicad_sch` | `7fccbe902768efcce21e16a04d3c836e5d85fb61b4e9661ab98437e38f4b9708` |

Only `.kicad_prl` project-settings files were dirty in that working tree at
export time; every `.kicad_sch` was clean at `c0f6f39`.

### Reproducing the export

```sh
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli   # kicad-cli 10.0.5
R=<path to multi-channel-preamp>/src/schematics
"$KC" sch export netlist --format kicadxml \
  -o three-band-eq.net.xml "$R/pultec-three-band-eq/pultec-three-band-eq.kicad_sch"
```

The three remaining files export the same way from `pultec-boost-high`,
`pultec-cut-high` and `pultec-cut-low`.

## Corroboration status

Every capacitor position in the extracted topology was checked against the
Thompson-Bell tables. See [values.md](values.md) for the full comparison. All
four banks agree exactly, including two details that only match if both sources
are right:

- The 60 Hz low-cut position carries **two** capacitors, `4n7 + 1n`, which is
  the doc's "single components are used for all but one cut frequency". The
  netlist independently shows `C3` and `C7` sharing selector position 3.
- The `a`-suffixed references (`C2a2`, `C4a2`, `C5a2`) sit on the same selector
  positions as their partners, which is the doc's "spaces on the PCB for up to
  two capacitors per boost/cut frequency".

The hi-boost inductor taps broken out on the `pultec-boost-high` board —
600mH, 300mH, 200mH, 100mH — are the four distinct values of the doc's `Lboost`
column (0.6H, 0.3H, 0.3H, 0.2H, 0.1H, 0.1H).

This satisfies the plan's "reconcile the candidate against original filter
documentation or an independently documented tracing". The reference is
corroborated, not candidate-only. It is corroborated **as a faithful record of
Thompson-Bell's design**; it says nothing about fidelity to a factory Pultec
EQP-1A or MEQ-5.

## What is not established

Nothing here has been simulated, partitioned, or built in tscircuit, and the
as-built hardware has not been measured. See [unresolved.md](unresolved.md).
