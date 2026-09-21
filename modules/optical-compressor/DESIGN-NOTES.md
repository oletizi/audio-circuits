# Optical Compressor — Design Notes

Spec: `docs/superpowers/specs/2026-09-21-optical-compressor-design.md` (rev 3)

## Modeling boundary

tscircuit models connectivity and packaging. It does **not** model optical
coupling, LDR resistance versus LED current, optical memory, attack, or
release. A clean render, a passing test suite and a successful build prove
the circuit is *wired* as intended. They prove nothing about how it
*sounds* or whether it compresses usefully.

Everything in "Pending measurement" below is unvalidated.

## Provisional values

All values are starting points from spec revision 3, not measured results.

| Ref | Value | Why |
|---|---|---|
| R_SHUNT | 22 kΩ | Sets the §6.2 vactrol selection windows |
| R_E | 1 kΩ | Control-law fix; without it the range is ~1 dB (§6.1.2) |
| R_LED | 3.3 kΩ | ~1.5 mA max, after the 1.5 V across R_E (§8.7.2) |
| C_DET | 4.7 µF | ~305 ms release, ~5% ripple at 100 Hz (§8.6.1) |
| R_PEAK_FAIL | 1 MΩ | Open-wiper fail-safe to VBIAS (§10.1) |

## Vactrol selection criteria (§6.2)

A candidate part must satisfy **both**:

- dark resistance **≥ 1 MΩ** (keeps insertion loss better than −0.2 dB)
- **R_LDR ≤ 10.2 kΩ** at or below maximum LED current (10 dB gain reduction)

Screen a datasheet against these before ordering. The footprint prop is
required precisely so an unverified pad map cannot reach fabrication.

## Population options

| Ref | Fitted | Alternatives | Notes |
|---|---|---|---|
| R_SHUNT | 22 kΩ | 10 kΩ, 47 kΩ | Changing it invalidates the §6.2 table |
| R_LED | 3.3 kΩ | 2.2 kΩ, 1.5 kΩ | Recompute for the real LED forward voltage |
| C_DET | 4.7 µF | 10 µF, 2.2 µF, 1 µF | Sweep both directions (§12.2 item 9) |
| R_REL | 100 kΩ | depopulate | Independently removable |

The precision rectifier is **not** a population option. It needs an
inverting topology, an anti-saturation clamp, and a solution to
single-supply level shifting. §8.6.2 explains why; the board carries test
pads only.

## Open items (spec §12.1 static checks)

- **Item 5 — schematic legibility.** Spec 12.1 item 5 requires signal flow to
  read left to right with no overlapping critical labels. This needs a human
  eye and cannot be closed by `bun test` or `bun run typecheck`. It has **not**
  been visually verified — run `tsci dev` against
  `optical-compressor.circuit.tsx` and look at the rendered schematic before
  treating this item as closed.
- **Item 7 — vactrol pad mapping.** `vactrolFootprint` is a required prop
  precisely so an unverified pad map cannot reach fabrication (see "Vactrol
  selection criteria" above and the fixture's header comment). The placeholder
  `"dip4"` footprint used for rendering and tests is **not** verified against
  any specific device's datasheet and must be replaced before fabrication.
- **Item 8 — manufacturer part identity.** `TL072H`, `1N5817` (D_PROT) and
  `1N4148` (D_DET) are set via `manufacturerPartNumber` and appear in circuit
  JSON. These are the real manufacturer part numbers named by the spec, not
  fabricated procurement codes — no `supplierPartNumbers` / JLCPCB mapping has
  been added for any of them, so **supplier/JLCPCB sourcing is still an open
  item** and the manufacturer numbers above must not be read as
  procurement-ready. Additionally, `Q_LED` (2N3904 per spec) does **not**
  carry a `manufacturerPartNumber`: tscircuit's `<transistor>` accepts the
  prop without a schema error but its source-render path never forwards it
  into circuit JSON, so setting it would silently have no effect. The part
  identity for Q_LED is recorded here in prose only.

## Pending measurement

Nothing below has been measured. See spec §12.2 for the full protocol.

- [ ] Vactrol dark resistance (pass: ≥ 1 MΩ)
- [ ] R_LDR versus LED current (pass: ≤ 10.2 kΩ at max)
- [ ] Insertion loss, LED off (pass: better than −0.2 dB)
- [ ] All three §6.1 thresholds (expect ~1.25 V / ~2.75 V / ~4.15 V)
- [ ] Control-law shape — progressive, not switch-like
- [ ] Release, 90% → 10% LED current (estimate: ~305 ms)
- [ ] Ripple sweep across C_DET values
- [ ] TL072H output swing at 8.7 V — the most load-bearing unverified number
- [ ] LED current across ≥ 3 transistor samples (expect single-digit % spread)
- [ ] Power-up transient during the ~2.5 s VBIAS ramp

Record the exact vactrol part and sample with every measurement. Optical
parts vary widely; one sample is evidence for a prototype, not a
component specification.
