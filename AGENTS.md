# Project rules

**Read `CLAUDE.md` before doing anything here.** It opens with what this project
is and who does what, and that frame decides most questions you will have.

The short version, so you are not working from the wrong model of the work:

This is a collection of **audio circuits under development** - hardware in
progress, not software that ships. The TypeScript holds a circuit as data so it
can be validated, simulated and checked. **The KiCad schematics and VeroRoute
layouts are yours too**: you arrange, place and route them. Do not hand that
work back - an earlier version of this file told you to, and it was wrong.

What you may never do is decide what counts as acceptable for an artifact you
are producing. Criteria come from a rule file, a spec, or a reviewing agent that
is not you. `CLAUDE.md` explains why, and what went wrong when that line was
crossed.

KiCad is a required tool, not an optional one.

## The gaps register is maintained, by everyone, always

**`docs/known-gaps.md` is a repo-wide requirement.** Anything a later reader
would need and cannot re-derive goes in it, committed in the change that found
it: a defect you are not fixing, a measurement, a result that would make someone
want to act, an owner decision or declination in his own words, an observation
you could not diagnose.

**Saying it to the owner is not recording it.** Neither is a plan ledger -
`.superpowers/` is gitignored, so an entry there is invisible to review and one
`git clean -fdx` from gone. **If you have told him something interesting and not
written it down, you have already broken this rule.**

`CLAUDE.md`'s Practices section states it in full, including what each entry
must carry and why an entry is deleted rather than marked closed when it is
settled. Read it there before you write one.

## Commit and push cadence

Commit and push early and often. Make small, coherent commits as useful work is
completed, including design and documentation updates, and push the working
branch after each commit. Do not wait for the entire feature to be finished.
Run checks appropriate to each change before committing. Clearly identify
provisional or incomplete work in its documentation and commit description.

## Do not re-ask a question the owner has already answered

**An instruction stands for the work it was given about.** If he has said to
open a pull request and merge it, do that when the work is complete - do not
ask again for the same piece of work.

**This is narrower than a standing order, and the distinction is his.** He put
it as: *"You don't have to open and merge automatically, but don't ask me again
if I've already told you to open one and merge it."* So an instruction is not a
blanket policy for every future branch, and neither is it good for one use
only. Ask when the work is genuinely a new thing he has not ruled on; do not
ask when you are re-confirming something he settled an hour ago.

**The failure this exists to stop, measured.** In one session he was asked to
confirm the same thing nine separate times - *"open a pull request and merge"*,
*"merge the pr when ready"*, *"open a pr and merge it"*, *"merge it"* - and
answered the same way every time. His attention is the scarcest thing in this
loop, and spending it on a question he has already answered is a cost with no
return. The same applies to every settled decision, not only pull requests:
**his declinations are recorded in `docs/known-gaps.md` precisely so that
nobody raises them again unprompted.**

The one qualifier he has given on merging: *"i dont want to merge the branch
until the feature is complete."* Completeness is the condition, not his
re-confirmation.

**And merging is HIS to initiate, which is narrower than it sounds and was
stated after the rule above was written.** On 2026-10-19, having been asked
about merging once too often, he ruled: *"stop worrying about merging. I'll tell
you when to do that."* So: **commit and push early and often** - that cadence is
unchanged and is required - but **do not propose a merge, do not ask whether to
merge, and do not offer it as a next step.** He raises it.

**The two rules are the same discipline pointed at one thing.** Asking again is
the fault; "shall I merge?" at the end of a report is asking again in a costume,
and it was asked at the end of four consecutive reports before he stopped it.
