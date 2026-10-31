drafted/ - agent-drafted schematics, never hand-edited
======================================================

**EVERY `.kicad_sch` UNDER THIS DIRECTORY WAS DRAWN BY AN AGENT. NONE OF IT IS
YOURS, AND NOTHING IN HERE IS EDITED BY HAND - NOT BY A PERSON AND NOT BY AN
AGENT EITHER.** A page here is replaced wholesale by a new drafting run; it is
never touched in place. The owner, 2026-10-28, stating what this directory is
for:

> *"I never want my work thrown away. As such, you must make SURE I dont mistake
> your generated schematics for ones I can touch. Put them in a siloed directory
> that never gets confused by a human"*

and, on why it is committed rather than ignored:

> *"git is a distributed, journaled filesystem that gives us a huge amount of
> safety and history."*

So: siloed, committed, and **never under `circuits/`**, which is where
hand-authored sources live. §3 of
`../docs/superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`
is the specification this directory implements.

**IF YOU OPENED A PAGE IN HERE IN KICAD AND CHANGED IT, YOUR CHANGE WILL BE
THROWN AWAY** by the next drafting run, and worse, it will silently break the
sheet's binding to the verdict recorded beside it (see `RECORD.md`). Copy it into
`circuits/` under a new name first if you want to work on one.

Layout
------

```
drafted/<circuit>/<board>/
    <board>.generated-do-not-edit.kicad_sch   the page
    <board>.generated-do-not-edit.kicad_pro   the project context it renders in
    <board>.generated-do-not-edit.svg         the render, so git can diff it
    sym-lib-table                             empty; the symbols are embedded
    RECORD.md                                 the hashes and the verdict
```

**THE FILE NAME IS THE TITLE-BLOCK NOTICE, AND IT IS THERE DELIBERATELY RATHER
THAN BY ACCIDENT.** §3 requires *"generated - do not edit"* in every title block.
KiCad's title block prints the sheet's **file name** on its `File:` line, so a
sheet named `<board>.generated-do-not-edit.kicad_sch` prints
`File: pultec-hi-cut.generated-do-not-edit.kicad_sch` on every page it plots,
and KiCad's own window title says the same thing to anyone who opens one.

**WHY THE NOTICE IS CARRIED BY THE NAME AND NOT BY A `title_block` FIELD, which
is a real limitation of the record rather than a preference.** **Every** page
here is bound to a sha256 in `../docs/schematic/verdicts.md` - that hash is the
binding, and the sheet IS the approved artifact only while its bytes still hash
to it. Writing *"generated - do not edit"* into a `comment` field inside the
file would change those bytes and **un-approve the page**. The file name is the
one channel that puts the notice in the title block at the cost of zero bytes. A
page drafted from here on should carry the notice in its `title_block` as well,
emitted by whatever draws it, so that the two agree; for the pages already
approved the bytes are frozen and only the name is available.

**THIS PARAGRAPH SAID "EACH OF THE FOUR PAGES HERE" UNTIL `pultec-mid` MADE IT
FIVE**, which is why it now says *every*. `CLAUDE.md`: *"A FIGURE IN PROSE IS A
TRANSCRIPTION WITH A DATE ON IT."* The count is not a fact this file needs, and
`ls` answers it without going stale.

What is NOT settled here
------------------------

- **There is no status vocabulary.** `RECORD.md` records what the reviewer said,
  verbatim, and nothing more. `../docs/schematic/verdicts.md` states why: an
  agent may not author the vocabulary its own output is judged in, and the owner
  has not named a state set.
- **The render digest is evidence, not a binding.** `RECORD.md` carries
  `sha256(svg minus the one volatile title line)` because KiCad stamps a
  timestamp into every SVG export. That digest reproduced exactly on a
  re-export on one machine with KiCad 10.0.5; its stability **across machines
  and across KiCad versions is unmeasured**, so it is recorded as a measurement
  and never treated as the thing that binds. The sheet's own hash is the
  binding.
- **The register is still markdown.** §3 specifies a GNU recutils register with
  an enforced state enum. This is not that. `RECORD.md` is the interim
  substrate, for the same reason `verdicts.md` is: losing a verdict is the
  failure the rule exists to prevent.

Who reads these
---------------

`boards/<board>/perfboard.json` declares the page here as its `"sch"`, so
`make guide` prints it as the build packet's schematic page and
`make netlist-agrees` re-exports its netlist on every run and compares by
content. A board that declares none gets the printed notice
`tools/guide/schematic-notice.ts` holds for that case, which is what says on the
paper that nothing has gone missing.

**`pultec-mid` WAS THE EXAMPLE OF THAT CASE AND IS NOT ANY MORE** - it was
approved on 2026-10-29 and its page is here. Named here only because it is
pointed at as the undeclared board in several places written before that, and
because nothing withheld exercises the notice now; `tools/guide/schematic-notice.ts`'s
own tests are what keep that branch honest. Which boards declare a page is a
question `grep '"sch"' ../boards/*/perfboard.json` answers, and not one this
file should be transcribing.
