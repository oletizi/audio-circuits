# Transistor preamp experimentation plan

Two related projects. The first is a 9 V breadboard-to-stripboard lab that
learns the feedback moves step by step; the second is a separate 24 V
transformer-coupled prototype that reuses its measurement habits but not its
values.

## 1. The 9 V feedback lab

Brief: [From one transistor to a feedback microphone preamp](microphone-preamp-feedback-lab.md).

| Step | What it adds | Where it stands |
|---|---|---|
| Builds 0–2B | One common-emitter stage: divider bias, emitter degeneration, collector feedback | Modelled as the lab board (`circuits/transistor-preamp/lab-board.ts`); the collector-feedback version built and tuned as the feedback board (`feedback-board.ts`) |
| Build 3 | An emitter-follower output buffer after the gain stage | Modelled, stub and layout generated (`buffered-board.ts`); built and measured |
| Build 4, first step | One feedback loop around both stages | Modelled and simulated, stub and layout generated (`loop-board.ts`); **paused**, not built |
| Build 4, later | Three stages, direct coupling, emitter feedback and compensation, like the 1073 preamp section | Not started; a separately gated design |
| Gain structure (current direction) | Independently biased, AC-coupled stages with a drive control ahead of each, run at 24 V into an EDCOR WSM10K/10K | Proposal approved: [gain-structure proposal](transistor-preamp-gain-structure-proposal.md). Extends the built buffered board; Build 4's loop is paused in its favour |
| Staged board | The gain-structure proposal's next version: a second gain stage (Q3) with panel DRIVE, CHARACTER and TRANSFORMER DRIVE controls | Modelled and simulated at 24 V, stub and layout generated (`staged-board.ts`); not yet built. Design: `docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md` |

Designs: `docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md`,
`2026-09-24-transistor-preamp-buffered-design.md`,
`2026-09-25-transistor-preamp-loop-design.md`.

## 2. The 24 V transformer-coupled preamp

Proposal: [24 V transformer-coupled microphone preamp: output-stage design proposal](24v-transformer-coupled-preamp.md)
(draft for review). A deliberately colored preamp whose output transformer
contributes level-dependent coloration. It starts by characterizing the EDCOR
600:600 and 10k:10k transformers on hand (Phase A), then an output-driver
fixture (Phase B), then microphone preamp integration (Phase C).
