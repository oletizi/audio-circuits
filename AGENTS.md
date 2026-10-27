# Project rules

**Read `CONSTITUTION.md` first, then `CLAUDE.md`.** The constitution holds the
few principles this project does not revisit case by case - what may be
automated and what may not, when an algorithm is the wrong tool, what a fallback
owes you, and that a claim about a drawing ships with the drawing. It binds every
change here and is amended only by the procedure it states. `CLAUDE.md` holds the
practices, which are revised freely as the work teaches.

**Read `CLAUDE.md` before doing anything else here.** It opens with what this project
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

## The gaps register is FROZEN - do not add to it

**`docs/known-gaps.md` holds 31 entries and takes no new ones**, with a single
exception named below. It held 273 over 30,549 lines until 2026-10-27, and it
was cut on the owner's instruction: *"cut hard, but don't add to it. It's a
nucleation site for misinformation."*

**The one exception is an OWNER DECISION or DECLINATION, in his own words.**
That still goes there, because a decision of his that is lost gets re-asked, and
re-asking costs him attention and stalls the work behind it.

**Everything else is still recorded - somewhere it can fail.** A measurement goes
in a tool or a test that re-runs it, never in prose. A defect you are not fixing
goes in a comment beside the code or in the refusal message itself. An
observation you could not diagnose goes in the spec for the work in hand.

**Saying it to the owner is not recording it.** Neither is a plan ledger -
`.superpowers/` is gitignored, so an entry there is invisible to review and one
`git clean -fdx` from gone. **If you have told him something interesting and not
written it down, you have already broken this rule** - that half is unchanged,
and only the destination moved.

**A `G<n>` reference anywhere in this repository may resolve to nothing.** 822
citations in TypeScript and 1,781 in other markdown were left pointing at
deleted entries on purpose: a dead reference is inert, a stale one is not.

`CLAUDE.md`'s Practices section states all of this in full, including the old
rule shown struck and what obeying it produced. Read it there first.

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

## Do the next thing in the same turn you name it

**Announcing an action and then ending the turn is a handoff, not a commitment.**
It makes the owner the scheduler for work that was already yours, and he has to
spend a message - usually *"progress?"* - to get it started.

He counted it before it was noticed: *"is there a reason you halt after
announcing your next action? you've done it many many times."* In the session
that produced this rule he sent *"progress?"* eight times, and in most of those
the next action had been named in the previous message and not begun.

**The test is whether the named action needs an answer from him.**

- It does not - writing a register entry the governing documents already require,
  running a check, committing finished work: **do it in the same turn and report
  it as done.** "Writing those now" at the end of a message is the fault.
- It does - a decision only he can make, an irreversible step, something outside
  the working tree: **ask for the decision and stop.** That is not a halt, it is
  the gate.

**This is the same failure as the two rules above, in a third costume.** "Shall I
merge?" hands him a settled question; "doing that next" hands him a settled task.
Both convert his attention into a scheduler for work that did not need one.
