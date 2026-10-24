/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validate.ts` (with the `labels`
 * rendering-reason check that plan decision D3 deletes, carried as this entry's declared `cuts`
 * until Task 20), and DIVERGED from it by Task 20 of the M1 schematic-authoring plan: the rule
 * list is SPLIT, and `validateCircuit` - the function `tools/schgen/generate.ts` calls before it
 * emits a drawing - no longer runs `bomFields`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason and the upstream
 * `sourceSha`; see `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G245**.
 *
 * **WHY, AND IT IS THE OWNER'S DECISION RATHER THAN THIS REPOSITORY'S CONVENIENCE.** He asked
 * *"why does a schematic need bom-level specificity?"*, and then ruled: *"the gate you describe
 * *is* important for pcb layout intended for outsourced manufacture-but a fully specified BOM
 * isn't needed for schematics, stripboard layout, and, in many cases, tht pcbs."*
 *
 * So **the BOM requirement is a property of the CONSUMER of an artifact rather than of the
 * circuit.** It binds when a part has to be sourced and placed by somebody else. A schematic is
 * never that artifact - it is upstream of every one of those decisions; a stripboard layout built
 * by hand is not either; and a through-hole board the owner stuffs himself usually is not.
 *
 * **`bomFields` ITSELF IS UNTOUCHED, AND IT IS NOT DEAD CODE.** `ir/validate-parts.ts` is still
 * byte-checked against the pedals source and holds the rule exactly as it always did - four keys,
 * non-empty, on every part whose `refPrefix` is not `TP`, `H` or `FID`. What changed is which
 * composition runs it. **Two opposite edits to this file are both wrong:**
 *
 * - **deleting the rule, or `SOURCING_RULES`, because no production caller runs it.** Nothing in
 *   this repository emits an artifact somebody else sources yet, which is exactly why
 *   `validateSourcing` has only test callers; `docs/known-gaps.md` **G245** records that with what
 *   would settle it, and **G241** is this branch deleting a safeguard on that reasoning and
 *   restoring it a round later;
 * - **putting `bomFields` back into `DRAWING_RULES` to make validation uniform.** Uniformity is
 *   what the ruling refuses: it gates a drawing on purchasing data the drawing does not use.
 *   **G238** measured the price - 100 of `transistor-preamp`'s 101 gate-1 problems were empty
 *   purchasing fields, and nothing else was wrong with the circuit.
 */

import { pinsOfUnit } from "./classify.ts";
import { mechanicalPinsOf } from "./mechanical-pins.ts";
import { NET_NAME, TEMPLATE_IDS, unitKey, type Circuit, type IrBlock, type NetName } from "./types.ts";
import { bomFields, mechanicalPads, sheetFiles } from "./validate-parts.ts";
import { pinSemantics, rails, singlePinNets } from "./validate-nets.ts";
import type { Rule } from "./validate-rule.ts";
import type { SymbolResolver } from "../render/library.ts";

const LABEL = /^[A-Z][A-Z0-9_]*$/;
const PREFIX = /^[A-Z]+$/;

/**
 * **THE NET-NAME RULE, NARROWED RATHER THAN DELETED - and it was deleted for one round, which is
 * the mistake this comment exists to stop someone repeating.**
 *
 * **WHAT CAME OUT, 2026-10-23, and it is the owner's decision.** It used to read
 *
 * ```ts
 * [...c.nets.keys()].filter((n) => !NET_NAME.test(n)).map((n) => `net "${n}" is not UPPER_SNAKE (^[A-Z0-9][A-Z0-9_]*$)`)
 * ```
 *
 * against `NET_NAME = /^[A-Z0-9][A-Z0-9_]*$/`, and it gated every drawing this repository can
 * emit. His words, verbatim: *"i absolutely do not care about the letter case of net names. That's
 * a silly quibble."* The rule stated no reason, and `docs/known-gaps.md` **G150** records that
 * there was none to state - letter case carries no information a schematic needs. **It refused 20
 * labelled nets across the five Pultec boards and 17 of `pt2399-core`'s.**
 *
 * **WHAT STAYED, because the one regex refused two different things with one message and only the
 * case half was silly.** `./types.ts`'s `NET_NAME` is now *non-empty, no control character*, and
 * this rule applies it to every net of the IR with a message that says WHICH net and WHY.
 *
 * **THE WHOLE RULE WAS DELETED IN TASK 3 ROUND 0, ON THE BRIEF'S INSTRUCTION, AND THE COORDINATOR
 * CLOSED THAT RATHER THAN PARKING IT.** For one round nothing validated an IR net name at all, so
 * the control-character refusal sat in `str()` (`../render/sexpr-write.ts:31`) - **a refusal at
 * EMIT time, reported against a sheet rather than against a circuit, and strictly later than every
 * geometry check.** That is the shape this repository refuses, and the plan's own correction had
 * warned against it. His ruling: *"The owner removed the CASING demand, not all net-name
 * validation."*
 *
 * **SO DO NOT DELETE THIS RULE TO MAKE SOMETHING PASS.** `str()` still refuses the same class, so
 * removing this one does not let a bad name through - **it moves the refusal later and makes it
 * mute about which net.** `../gates/pin-table.ts`'s `mechanical()` applies the same `NET_NAME` to
 * a pin table's `mechanicalPads` net and is a **BACKSTOP on a different input**, not a substitute:
 * its message is lumped across five failure modes and names no reason.
 *
 * **THE REASON THE MESSAGE GIVES IS NOT THE ONE YOU WOULD ASSUME, and `CLAUDE.md` requires a
 * refusal to say why a thing is not defaulted.** `[RAN]`
 * `tools/schgen/label-syntax/probe-run.log`, `kicad-cli` 10.0.5, six control arms through a real
 * global label: a **tab** is accepted **verbatim** at exit 0; a **newline** fails loudly at exit 3;
 * and a **carriage return** and a **NUL** both export at **exit 0, draw a label, and come back as a
 * DIFFERENT net name** - `RAWCR`, and `RAW` truncated. **"KiCad rejects a control character" would
 * therefore be FALSE for four of the six.** The true reason is that two of them succeed and rename
 * the net, which no exit code reports, so a check asking only whether `kicad-cli` ran would pass
 * both.
 *
 * **Punctuation needs no rule at all** and that is measured, not conceded: the same run has
 * `Net-(C10-Pad1)` and `unconnected-(U1-CLK_O-Pad5)` parsing, round-tripping byte-identical and
 * rendering, with the writer escaping nothing for either.
 *
 * **`partShapes` below carries a SEPARATE UPPER_SNAKE demand on part LABELS, and his decision does
 * not reach it.** It names net names. Do not delete that one on the strength of this comment.
 *
 * **THE MESSAGE IS ONE LINE, deliberately.** `tests/schgen/verify.test.ts:156` asserts, once per
 * gate-1 problem, that the problem contains no newline.
 */
const netNames: Rule = (c) =>
  [...c.nets.keys()].filter((n) => !NET_NAME.test(n)).map((n) => `net ${JSON.stringify(n)} is not a usable net name: ${netNameProblem(n)}`);

/** The `U+XXXX` of every character of `net` that `NET_NAME` refuses, in order, for the message. */
function controlCodesIn(net: NetName): readonly string[] {
  const out: string[] = [];
  for (const ch of net) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code <= 0x1f) out.push(`U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
  }
  return out;
}

/** Why one net name is refused, in the terms the measurement establishes. See the rule's comment. */
function netNameProblem(net: NetName): string {
  if (net.length === 0) {
    return (
      "it is empty. lib/model/types.ts's net() refuses one (\"net name must not be empty\"), so " +
      "nothing upstream should have produced it, and nothing downstream can draw a label for a net " +
      "with no name. Name the net in the circuit model."
    );
  }
  return (
    `it carries a control character (${controlCodesIn(net).join(", ")}). Two of these are ACCEPTED ` +
    "by kicad-cli 10.0.5 at exit 0 and DRAW the label, and then come back from the netlist as a " +
    "DIFFERENT net name - U+000D as \"RAWCR\", U+0000 truncated to \"RAW\" - so the net is silently " +
    "renamed rather than refused, and no exit code reports it. That is why this is refused here " +
    "rather than defaulted away: the failure mode is a success. A tab is accepted verbatim by " +
    "KiCad and is refused anyway, so the whole class draws one line. Remove it from the net name " +
    "in the circuit model. Measured: tools/schgen/label-syntax/probe-run.log"
  );
}

const partShapes: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    if (!LABEL.test(p.label)) out.push(`part ${p.label}: label is not UPPER_SNAKE`);
    if (!PREFIX.test(p.refPrefix)) out.push(`part ${p.label}: refPrefix "${p.refPrefix}" must be capital letters`);
    if (p.source.trim() === "") out.push(`part ${p.label}: source is empty; name the design-note section or datasheet the part comes from`);
    const n = symbols.resolve(p.libId).unitCount;
    if (p.units.length === 0) out.push(`part ${p.label}: units is empty`);
    for (const u of p.units) {
      if (u < 1 || u > n) out.push(`part ${p.label}: unit ${u} does not exist in ${p.libId} (units 1..${n})`);
    }
  }
  return out;
};

/**
 * Every pin of a part's symbol is on a net or declared not connected - EXCEPT a pin the symbol
 * declares as a mechanical mount point, which the electrical model is not required to carry.
 *
 * **THE EXEMPTION IS ALLOW-OMITTED, NOT SKIP-IF-PRESENT**, and the distinction is the one a
 * third-party review asked about on 2026-10-24. This rule's only refusal is guarded by the pin
 * being MISSING, so skipping a mechanical pin cannot hide anything about a pin that IS
 * declared: a mount lug deliberately bonded to a net stays subject to `singlePinNets` and
 * `pinSemantics` (`./validate-nets.ts`), neither of which consults `MECHANICAL_PINS`. So an
 * intentional bond is representable AND validated; only the requirement to say something is
 * lifted. `tests/schgen/ir/mechanical-pins.test.ts` pins that down so a later refactor cannot
 * turn it into a blanket skip.
 *
 * **THE STALE-TABLE CHECK CANNOT LIVE IN THE PIN LOOP**, which is the trap the spec's first
 * sketch fell into: a stale entry names a pin the symbol does NOT have, so a loop over the
 * symbol's pins never reaches it and the guard could never fire. It iterates the ENTRIES
 * against the symbol's pin set instead, before the pin loop. A guard that cannot fail is the
 * failure mode this repository's whole workflow exists to prevent.
 *
 * `docs/superpowers/specs/2026-10-24-mechanical-pins-design.md`, `docs/known-gaps.md` **G282**
 * (why the four Pultec boards refused, and why an MPN was never the question) and **G290** (why
 * the classification is a whitelist rather than inferred from the symbol's drawing).
 */
const pinsDeclared: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const sym = symbols.resolve(p.libId);
    const mechanical = mechanicalPinsOf(p.libId);
    const numbers = new Set(sym.pins.map((lp) => lp.number));
    for (const m of mechanical) {
      if (!numbers.has(m))
        out.push(
          `part ${p.label}: MECHANICAL_PINS lists pin "${m}" for ${p.libId}, which has no such pin; ` +
            `the table is stale - re-verify it against the installed library (lib/schgen/ir/mechanical-pins.ts)`,
        );
    }
    const have = new Set(c.pins.filter((q) => q.part === p.label).map((q) => q.pin));
    for (const lp of sym.pins) {
      if (mechanical.has(lp.number)) continue;
      if (!have.has(lp.number)) out.push(`part ${p.label}: pin ${lp.number} (${lp.name}) is neither on a net nor declared not connected`);
    }
  }
  return out;
};

const unitsPlaced: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const n = symbols.resolve(p.libId).unitCount;
    for (let u = 1; u <= n; u += 1) {
      if (!p.units.includes(u)) out.push(`part ${p.label}: unit ${u} of ${p.libId} is not listed; every unit must be placed`);
    }
    for (const u of p.units) if (!c.unitBlock.has(unitKey(p.label, u))) out.push(`part ${p.label}: unit ${u} is placed by no block`);
  }
  return out;
};

const sheetsAndBlocks: Rule = (c) => {
  const out: string[] = [];
  const ids = new Set(c.sheets.map((s) => s.id));
  for (const b of c.blocks.values()) if (!ids.has(b.sheet)) out.push(`block ${b.id}: sheet ${b.sheet} does not exist`);
  for (const s of c.sheets) if (![...c.blocks.values()].some((b) => b.sheet === s.id)) out.push(`sheet ${s.id} has no blocks`);
  return out;
};

function blockNets(c: Circuit, b: IrBlock): Set<NetName> {
  const nets = new Set<NetName>();
  for (const m of b.members) for (const p of pinsOfUnit(c, m.part, m.unit)) if (p.net !== null) nets.add(p.net);
  return nets;
}

const renderings: Rule = (c) => {
  const out: string[] = [];
  for (const b of c.blocks.values()) {
    const r = b.rendering;
    if (r.kind === "wired") {
      if (!TEMPLATE_IDS.includes(r.template)) out.push(`block ${b.id}: unknown template ${r.template}`);
      const a = r.anchor;
      if (a !== null) {
        if (!b.members.some((m) => m.part === a.part && m.unit === a.unit)) out.push(`block ${b.id}: anchor ${a.part}#${a.unit} is not a member`);
        const unitPins = c.parts.has(a.part) ? new Set(pinsOfUnit(c, a.part, a.unit).map((p) => p.pin)) : new Set<string>();
        for (const [role, pin] of Object.entries(a.roles)) {
          if (!unitPins.has(pin)) out.push(`block ${b.id}: anchor role ${role} names pin ${pin}, not a pin of ${a.part}#${a.unit}`);
        }
      }
    }
    if (r.kind === "bus") {
      const nets = blockNets(c, b);
      const groupOf = new Map<NetName, string[]>();
      const names = new Set<string>();
      for (const g of r.groups) {
        const duplicate = names.has(g.name);
        if (duplicate) out.push(`block ${b.id}: bus group ${g.name} is declared twice`);
        names.add(g.name);
        for (const n of g.nets) {
          if (!nets.has(n)) out.push(`block ${b.id}: bus group ${g.name} lists ${n}, which no pin of the block is on`);
          const have = groupOf.get(n) ?? [];
          if (!have.includes(g.name)) groupOf.set(n, [...have, g.name]);
        }
      }
      for (const n of [...nets].sort()) {
        if (c.rails.has(n)) continue;
        const gs = groupOf.get(n) ?? [];
        if (gs.length === 0) out.push(`block ${b.id}: net ${n} is in no bus group`);
        if (gs.length > 1) out.push(`block ${b.id}: net ${n} is in bus groups ${gs.join(" and ")}`);
      }
    }
  }
  return out;
};

/**
 * **THE RULES A DRAWING DEPENDS ON, AND ONLY THOSE**, because this is the list `generate` runs
 * before it emits one. **Eleven rules: the twelve ported ones less `bomFields`, which the header
 * says is not among them and why putting it back is a defect rather than a tidy-up.** `netNames`
 * is still here and still FIRST, NARROWED rather than deleted - Task 3 took the owner's case
 * demand out of it and deleted the whole rule for one round, which moved a refusal to emit time;
 * its own comment says why that was reversed and why deleting it again is not a tidy-up either.
 */
const DRAWING_RULES: readonly Rule[] = [
  netNames, partShapes, pinsDeclared, unitsPlaced, sheetsAndBlocks, renderings,
  singlePinNets, rails, pinSemantics, sheetFiles, mechanicalPads,
];

/**
 * **THE RULES AN ARTIFACT SOMEBODY ELSE SOURCES AND PLACES DEPENDS ON.** A board going out for
 * outsourced assembly is the case the owner named: the assembler cannot buy a part the artifact
 * does not name, so an empty purchasing field there is a refusal and not a nicety.
 *
 * **Nothing in this repository emits such an artifact yet**, so the callers are tests -
 * `tests/schgen/ir/validate.test.ts`'s two V10 cases drive the rule's own behaviour, and
 * `tests/schgen/authoring-complete.test.ts` keeps the four parity circuits' sourcing counts
 * pinned.
 *
 * **THAT IS `docs/known-gaps.md` G226's PATTERN, DECLARED RATHER THAN DISCOVERED** - a mechanism
 * whose first real use is its first test, which that entry rules acceptable *"when the
 * precondition for wiring it is NAMED and the price is RECORDED"* and calls the **G201** failure
 * when it is not. **THE PRECONDITION, in one sentence: something in this repository must emit an
 * artifact that a third party sources and places** - a fabrication or assembly package, a board
 * going out for outsourced assembly, an orderable BOM. **THE PRICE: `bomFields` runs in tests and
 * in no pipeline**, so purchasing data that regressed would be caught by those two files and by no
 * artifact. **Controller ruling R67: this composition is NOT to be collapsed into its test
 * callers** - the name is what tells that future consumer what to call. **G245** carries both
 * halves.
 */
const SOURCING_RULES: readonly Rule[] = [bomFields];

/**
 * Strict: every DRAWING problem, one line each, in rule order. Empty means the circuit may be
 * drawn. No escape hatch - there is no flag, no mode and no exemption list that relaxes a rule in
 * this list, and sourcing readiness is a different question asked by `validateSourcing`.
 */
export function validateCircuit(c: Circuit, symbols: SymbolResolver): string[] {
  return DRAWING_RULES.flatMap((rule) => rule(c, symbols));
}

/**
 * Strict, the same way, for the sourcing readiness `validateCircuit` deliberately does not ask
 * about. Empty means every part names who makes it and who sells it.
 */
export function validateSourcing(c: Circuit, symbols: SymbolResolver): string[] {
  return SOURCING_RULES.flatMap((rule) => rule(c, symbols));
}
