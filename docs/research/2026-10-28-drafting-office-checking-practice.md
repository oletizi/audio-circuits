# The traditional drafting-office check: the checker, the check print, and what became of the markup

**Date:** 2026-10-28
**Gap closed:** `docs/research/2026-10-28-drafting-practice-survey.md` §7.1 recorded that the
survey *"reached no primary source"* for the pre-CAD drafting-office checking practice — the
dedicated checker, the coloured check print, the revision block, the disposition of the markup.
This pass reached primary sources for all four, and read them.

**Every claim below is marked VERIFIED (this writer fetched the document and read the cited
passage) or RELAYED (taken from a secondary description).** Where a source could not be reached,
the negative is stated with its boundary rather than filled in from memory. §8 is the catalogue
of what was *not* obtainable and why.

**The short answer to the question the project actually asked** — *did anyone ever formally
review a drawing as a drawing?* — **is yes, unambiguously, and it was the FIRST thing the
checker did.** See §3. It survived into federal standards as a signature line distinct from the
engineering sign-off (§2.3) and as a rejection-and-redraw gate on legibility alone (§3.5).

**And the answer to the question the project most needed** — *what became of the markup?* — is
§5: it was retained, filed with the record prints under signed-receipt custody, and **named by
exception in the rule that destroyed every other superseded print.**

**There was also a BACK-CHECK, and it is the finding with the most direct bearing on an
AI-drafts/human-checks workflow.** The draughtsman was required to verify the checker's
correction *before applying it*, because otherwise *"certain parts of the drawing are left
unchecked, the value being the checker's instead of the detailer's"* — and some checkers forced
it by **withholding the correct value** and recording only the numbered defect. An agent applies
a reviewer's fix perfectly and without resistance, which makes this hole wider here than it ever
was on paper. §5.4 and §7.5.

---

## 1. Sources reached and read

| # | Document | Identifier / host | Status |
| --- | --- | --- | --- |
| S1 | Collins, Charles D., *Drafting Room Methods, Standards and Forms: A Reference Book for Engineers and Draftsmen*, 1918 | archive.org `draftingroommeth00coll`, dup `cu31924004084467` | **VERIFIED**, full text |
| S2 | French, Thomas E., *A Manual of Engineering Drawing for Students and Draftsmen*, 1911 and 1918 eds. | archive.org `cu31924003643693` (1911), `amanualengineer01frengoog` (1918) | **VERIFIED**, full text |
| S3 | Kepler, Frank R., *Standards and Conventions for Mechanical Drawing*, Detroit Board of Education, 1921 | archive.org `standardsconvent00kepl` | **VERIFIED**, full text |
| S4 | *Drafting-Room Practice*, Machinery's Reference Series No. 2, c.1910 | archive.org `draftingroomprac00newyrich` | **VERIFIED**, full text |
| S5 | Bell Telephone Laboratories, *Standard Drafting Practices for the Preparation of Circuit Drawings*, 1939 | archive.org `standard-drafting-circuit-drawings` | **VERIFIED**, full text |
| S6 | Bell Telephone Laboratories, *Standard Drafting Practices for the Preparation of Wiring Diagrams* | archive.org `standard-drafting-wiring-diagrams` | **VERIFIED**, full text |
| S7 | **MIL-STD-100F**, *Engineering Drawing Practices*, 9 Sept 1996 | everyspec.com PDF, 11.6 MB | **VERIFIED**, clause level |
| S8 | **MIL-STD-100G**, *Standard Practice for Engineering Drawings*, 9 June 1997 | everyspec.com PDF | **VERIFIED**, clause level |
| S9 | **MIL-D-5480F**, *Data, Engineering and Technical: Reproduction*, 1 Oct 1994 | everyspec.com PDF, 14 pp. | **VERIFIED**, clause level |
| S10 | NASA GSFC, *Engineering Drawing Standards Manual*, X-673-64-1F Rev 001, Dec 1994 | archive.org `nasa-engineering-manual.pdf` | **VERIFIED**, clause level |
| S11 | **NPS-10**, *Drawing Format and Drafting Practices Guideline for Design and Construction Drawings*, US National Park Service, Denver Service Center, Release No. 2, March/May 1986 | archive.org `drawingformatdra00unse` | **VERIFIED**, clause level |
| S12 | Clute, Eugene, *Drafting Room Practice*, 1928 (architectural) | archive.org `draftingroomprac00clut` | **VERIFIED**, full text |
| S13 | ASME Y14.2 (2014/R2020), Y14.35 (2025), Y14.100 (2017) | asme.org product pages | **VERIFIED scope statements only — NOT clause level** |
| **S14** | **Bishop, Carlton T., *Structural Drafting and the Design of Details*, 1920 — Chapter XXIX, "Checking and Correcting Drawings", pp. 179–182, and the glossary** | archive.org `structuraldraft00bishgoog` | **VERIFIED**, full text |

**S14 is the best single source in this list and it was found last.** Bishop devotes a whole
chapter to checking and it answers **every** sub-question the project asked — the checker's
role and authority, when a drawing is checked at all, a twelve-point checking order whose
item 1 is appearance and crowding, the marking grammar, the colour question *with the reasoning
behind it*, the disposition of the markup, **and the back-check, which this document said was
unattested until Bishop turned up.** Where Bishop and another source conflict, both are shown;
§4.2 and §5.4 are where that matters.

**On MIL-STD-100 specifically, which the task flagged as the most gettable of the standards
set and which a prior agent could not find:** it is on everyspec after all. The prior 404 was a
wrong directory — the path is `MIL-STD-0100-0299`, not `MIL-STD-0100-0199`. Both the full
standard (100F, 1996) and the thin successor shell (100G, 1997) download without
authentication. The download form is a `download.php?spec=` link off the detail page and needs
a `Referer` header. Exact URLs are recorded in §9 so nobody re-derives this.

---

## 2. The checker as a role

### 2.1 It was a separate person, and the separation was the point

**VERIFIED — S2, French 1911 and 1918, identical text, "CHECKING" (1918 ed. pp. 176–177):**

> *"Before being sent to the shop, a working drawing must be checked for errors and omissions by
> an experienced checker, who in signing his name to it becomes responsible for any inaccuracy.
> This is the final 'proof reading' and cannot be done by the one who has made the drawing
> nearly so well as by another person. In small offices all the work is checked by the chief
> draftsman, and draftsmen sometimes check each other's work; in large drafting rooms one or
> more checkers who devote all their time to this kind of work are employed."*

Three things in one paragraph: the checker is **a full-time occupation** at scale; the check is
**modelled on proof-reading**, not on re-engineering; and **signing transfers liability** —
*"becomes responsible for any inaccuracy."*

**VERIFIED — S4, Machinery's No. 2, c.1910, "Checking" (pp. 10–11):**

> *"The checking may now be done. It is best to delay this until after the tracings are
> completed, and then it is done once for all; and it can best be done by some one other than
> the man who did the detailing."*

**VERIFIED — S10, NASA GSFC 1994, title-block item "CHECKED":**

> *"Enter design analyst's printed name. **This name shall be an independent name from all other
> names on the drawing.** It represents that the drawing has been checked against the parameters
> of this drawing manual and, where possible, to form, fit, function, and feasibility."*

So the independence requirement is not folklore that faded with CAD — it is a normative clause
in a 1994 agency manual, stated as a constraint on the *signature set* of the drawing.

### 2.2 It was a recognised temperament, selected for

**VERIFIED — S1, Collins 1918, "Men" (pp. 16–17):**

> *"It has been demonstrated in companies which train their own men that certain types could not
> be developed into satisfactory draftsmen but made excellent tracers. Others who were not
> successful as designers did very good work as estimators. Still others who passed as excellent
> designers, having ability, boldness, and originality, were very liable to make many small
> errors and their work in consequence required very careful checking. Then a careful, thorough
> type who had the qualities to make excellent checkers were largely found to fail on work
> requiring original designing ability."*

This is the most interesting sentence in the whole corpus for the project's purposes. 1918
drafting-room management had already concluded that **the disposition that produces a good
design and the disposition that catches its small errors are different dispositions, and
rarely co-resident.** The role split was not bureaucratic; it was an observation about people.

### 2.3 Checker vs. draughtsman vs. engineer: the authority gradient

**VERIFIED — S7, MIL-STD-100F, Appendix A, clause 40.3.1 *"Signatures and initials
authority"*** (OCR cleaned; the garbling is in the scan, not the quote):

> *"Typical review and approval responsibilities and corresponding signature block entries are
> as follows:*
> *a. **DRAWN BY** – The initials of the person who prepared the original drawing.*
> *b. **CHECKER** – The initials of the person who checked the original drawing for
> completeness, accuracy and preciseness.*
> *c. **ENGINEER** – The signature of the engineer responsible for the design of the item
> depicted.*
> *d. **DRAWING APPROVAL** – The signature of the authorized design activity representative
> responsible for drawing format and completeness. Date entry is optional.*
> *e. **DESIGN APPROVAL** – The signature of the authorized design activity representative
> responsible for design technical adequacy and conformance to end item requirements. Date entry
> is optional."*

**Five roles, and note (d) against (e): the standard carries a signature for the drawing AS A
DRAWING — "drawing format and completeness" — that is explicitly NOT the design sign-off.** The
artifact and the design it depicts are approved by different authorities against different
criteria. The project has been asking whether anyone ever reviewed a drawing as a drawing; here
it is as a dedicated signature line in a DoD standard.

The checker sits between: not the author (a), not the design authority (c/e), and scoped to
*"completeness, accuracy and preciseness"* — the properties of the drawing's **statement**,
rather than of the design's merit.

**VERIFIED — S1, Collins 1918, "Signatures" (pp. 28–29):**

> *"Every finished drawing or tracing is to be signed with the initials of the draftsman,
> tracer, and checker who has worked on it. Every drawing is to be signed 'Approved' by the
> chief engineer, or whoever is sponsor for that drawing."*

and **"Checking Prints" (p. 29):** *"All drawings shall be checked by checkers or squad
foremen."* — so the checking authority is the checker or the first-line supervisor, while
*approval* is the chief engineer's. Two different acts.

**VERIFIED — S10, NASA GSFC 1994, revision-block "APPROVAL":**

> *"Enter signature of GSFC person assigned to approve. **If change was by approved EO, drawing
> only needs approval of the draftsman or person incorporating the change, and the checker. If
> changes made are not covered by an EO, then approval must include the engineer.**"*

A crisp authority rule: **a change already authorised elsewhere needs only draughtsman +
checker; a change not so authorised escalates to the engineer.** The checker's authority is
sufficient for conformance, insufficient for design intent.

### 2.4 In a circuit-drawing standard specifically

The project's mandate is circuits, so it matters that this practice existed in a *circuit*
drafting standard and not only in machine drawing.

**VERIFIED — S5, Bell Telephone Laboratories, *Standard Drafting Practices for the Preparation
of Circuit Drawings*, 1939, §§1.05–1.07:**

> *"**1.05 Draftsman's Responsibility.** The draftsman shall be responsible for the form and
> arrangement of drawings in accordance with the requirements herein covered. All deviations
> from this procedure shall first be approved by the drafting supervisor."*
>
> *"**1.06** Particular care shall be taken in checking all apparatus conventions and in
> checking the apparatus details such as: spring combinations, winding arrangements,
> resistances, and capacities."*
>
> *"**1.07** After completion of a drawing, the draftsman shall send the drawing together with
> the drawing order (and supplements if any) and all attachments thereto to the drafting
> checker."*

**VERIFIED — S6, the companion wiring-diagram standard, §1.05:**

> *"The draftsman shall be responsible for the following: (a) That the size, form, and general
> arrangement of the drawing is in accordance with the requirements covered herein unless
> otherwise specified. (b) That the drawing conforms with the schematic and standard practices
> such as apparatus and cable conventions, colors of wires, manufacturing notes (when the
> operation of the circuit is not affected)."*
>
> *"**1.07** Checking all wiring diagrams carefully will often eliminate a large number of
> installer's complaints and unnecessary additional expense."*

Two points the project should take: **"form and arrangement" is a named, assigned, auditable
responsibility** in a 1939 circuit-drafting standard — arrangement is not taste there, it is
compliance with a written procedure, with an escalation path (*"deviations shall first be
approved by the drafting supervisor"*). And **the hand-off to the checker is a defined
transaction with a defined payload**: drawing + the drawing order + its supplements + all
attachments. The checker receives the *request* alongside the *artifact*, which is the only way
"does this drawing answer the question it was asked" is checkable at all.

---

## 3. THE CRUX: was drawing quality checked, or only correctness?

**Drawing quality was checked, it was checked first, and in three of the four pre-1930 sources
it is item 1 or item 2 of the checker's list.** This is the best-evidenced finding in this
document.

### 3.1 French / Follows, the twelve items — and item 1

**VERIFIED — S2, French 1918 ed., pp. 176–177.** French credits the list to an external
reference work, which matters: **the checker did not author the criteria.**

> *"To be effective, checking must be done in an absolutely systematic way, and with thorough
> concentration.*
>
> *Professor Follows in his 'Dictionary of Mechanical Drawing' has specified admirably the work
> of checking, in twelve items, which are given with his permission. Each of these should be
> followed through separately, allowing nothing to distract the attention from it. **As each
> dimension or feature is verified a checkmark should be placed above it or under it.***
>
> *1. **Put yourself in the position of those who are to read the drawing and find out if it is
> easy to read and tells a straight story. Always do this before checking any individual
> features; in other words, before you have had time to become accustomed to the contents.***
> *2. See that each piece is correctly illustrated and that all necessary views are shown, but
> none that are not necessary.*
> *3. Check all the dimensions by scaling, and, where advisable, by calculation also.*
> *4. See that dimensions for the shop are given as required by the shop, that is, that the shop
> is not left to do any adding or subtracting in order to get a needed dimension.*
> *5. Go over each piece and see that finishes are properly specified.*
> *6. See that every specification of material is correct and that all necessary ones are
> given.*
> *7. Look out for 'interferences.' This means check each detail with the parts that will be
> adjacent to it in the assembled machine and see that proper clearances have been allowed.*
> *8. When checking for clearances in connection with a mechanical movement, lay out the
> movement to scale, figure the principal angles of motion and see that proper clearances are
> maintained in all positions.*
> *9. See that all the small details, as screws, bolts, pins, keys, rivets, etc., are standard
> and that, where possible, stock sizes have been used.*
> *10. Check every feature of the record strip.*
> *11. Review the drawing in its entirety in connection with any points that have suggested
> themselves during the above checking.*
> *12. Bearing in mind the value of explanatory notes, do not fail to add such notes as your
> experience tells you will increase the efficiency of the drawing."*

**Item 1 is the whole answer to the project's question, and the reason given for its placement
is sharper than the item itself.** *"Always do this before checking any individual features; in
other words, before you have had time to become accustomed to the contents."* The readability
judgement is **perishable** — it can only be made by a reader who has not yet learned the
drawing. Once the checker has worked through the dimensions, that reader no longer exists and
the judgement is unrecoverable. So it is sequenced first, deliberately, on the grounds that
**familiarity destroys the instrument.**

Item 11 closes the loop the other way: the whole-drawing review comes *after* the detail work,
carrying forward *"any points that have suggested themselves."* And item 12 is a positive
obligation — the checker **adds** clarifying notes rather than merely rejecting.

Item 2's *"but none that are not necessary"* is a crowding/economy criterion, not a
correctness one. Item 10 is the title-block/record-strip audit.

### 3.2 Kepler 1921 — sixteen items, with line weights and lettering in them

**VERIFIED — S3, "CHECKING DRAWINGS", pp. 43–44, complete:**

> *"In checking see that:*
> *1. The most illustrative views are selected and correctly projected.*
> *2. **All conventional lines are made according to adopted standards and graded to show
> contrast.***
> *3. Center lines for all circles and large arcs are drawn.*
> *4. That necessary dimensions are given, requiring no calculations by the workman.*
> *5. Related dimensions appear on the same view, if possible.*
> *6. Minor and over-all dimensions check not only with the scale, but also by addition.*
> *7. Dimensions and notes are not repeated.*
> *8. **Arrow-heads, figures and lettering are made uniform and neat.***
> *9. All finished surfaces are marked.*
> *10. **All sections and notes which will add to the clearness of the drawing are properly
> made.***
> *11. Where accuracy demands, all dimensions are 'tied up' to center lines or finished
> surfaces.*
> *12. The assembly checks for clearance of moving parts, and also that the various parts
> function properly.*
> *13. All holes for accurate fits are made standard; and parts fitting thus are made under or
> over size as the case demands.*
> *14. The bill of material is complete as to quantity, material, contents, and reference
> numbers.*
> *15. Standard stock parts are called for in the bill of material.*
> *16. Limits are given on all decimal fractions."*

Items 2, 8 and 10 are pure draughtsmanship: **line weight contrast, lettering uniformity, and
whether the sections and notes make the drawing clearer.** Item 5 (related dimensions on the
same view) and item 7 (no repetition) are arrangement criteria. Kepler is a *schools* standard,
but its front matter records that it was circulated to *"nearly fifty leading firms of Detroit
and vicinity"* and revised to their criticism, so it is a reasonable proxy for 1921 commercial
practice (**VERIFIED**, Kepler preface).

### 3.3 Machinery's No. 2, c.1910 — and the criteria tacked on the wall

**VERIFIED — S4, pp. 10–11:**

> *"Think over beforehand every direction in which a mistake is liable to occur, and **make a
> table covering these chances of errors and tack it in plain sight on the wall over the desk.**
> For such a system as that we are considering, the following list might be appropriate:*
> *1. General design. 2. Finish. 3. Dimensions; sufficiency and arrangement. 4. Dimensions;
> compared for accuracy. 5. Compare with list of parts. 6. Compare with list of stock parts.
> 7. Pattern number. 8. Notes. 9. General title."*
>
> *"...beginning with the first part in the list of detailed parts, we would examine it first
> for points in its general design. 1. Is it well proportioned, strong enough, and in general
> harmony with the lines of the rest of the machine?..."*
>
> *"4. Compare the dimensions of the detail in hand with those of every single contiguous and
> related piece in the whole machine... **This is the important item in the list**, and if it is
> faithfully carried out, it will double-check every dimension, as each part is thus checked up
> once individually, and again in the checking of other related parts."*

Item 3, *"sufficiency and arrangement"*, is an arrangement criterion in a nine-item list.

**And note the mechanism, which is the project's own invariant stated in 1910:** the table of
error-classes is built **beforehand**, from reasoning about where mistakes occur, and **pinned
to the wall** — a durable artifact outside any one drawing, visible to everyone, authored before
the drawing it will judge exists. The same source also observes that a small office can check
as well as a large one *"if it be gone over in some orderly, systematic way"*, versus large
establishments *"where the drawings are examined and initialed by every one in sight, from the
engineer in charge down to the tracer"* — a 1910 jab at signature theatre.

### 3.4 Bishop 1920 — appearance is item (1), and item (8) is an explicit overlap rule

**VERIFIED — S14, Bishop 1920, Chapter XXIX, p. 180.** Bishop gives twelve points *"arranged
approximately in logical order"*, prefaced by an ordering principle: *"The checker should check
the most important parts of a drawing first, proceeding logically so that no part will be
checked until the parts upon which it is dependent are checked."* Of the twelve, two bear
directly on the project:

> *"**(1) General Appearance:** see that the general arrangement is satisfactory; that the
> proper views are used to show the member to the best advantage; that all views bear proper
> relations to one another; **that the proper scale is used so that the drawing is clear and not
> crowded**; and that not too many different members are combined on the same drawing thus
> making it too complicated."*
>
> *"**(8) Dimensions:** see that interdependent dimensions bear the proper relation to one
> another; that the distance between any two points is the same when obtained by adding the
> intervening dimensions on any one of two or more parallel dimension lines; and that **no
> dimension lines or other lines or points appear to coincide on the drawing unless it is proper
> that they should coincide.**"*

**Three independent pre-1930 sources now put arrangement and readability at position 1 of the
checker's list** — French/Follows, Machinery's No. 2, and Bishop. That is no longer a quotation;
it is a convention.

And **item (8) is the clause the prior survey went looking for and did not find.** Its §359
records *"no overlapping text, designators or symbols"* as *"not found as a clause; it is the
thing every checker in the bakeoff actually measures."* Bishop states it, as a checking
obligation, in 1920: **nothing may appear to coincide unless coincidence is intended.** Note the
form — it is not "do not overlap", it is *"unless it is proper that they should coincide"*,
which is the correct shape for a schematic too, where a junction dot and four wire ends are
*supposed* to coincide and a net label over a symbol pin is not. A rule that cannot express the
exception would refuse every valid drawing.

Bishop's item (10) also makes notes a checking obligation rather than a courtesy: *"see that all
notes are given which render the drawing clearer or more definite"* (**VERIFIED**) — the same
positive duty as Follows' item 12.

### 3.5 It became normative, with teeth, in the federal standards

**VERIFIED — S7, MIL-STD-100F, clause 101.2 *"Line conventions and lettering"*:**

> *"Lines and lettering shall meet the legibility and reproducibility requirements of MIL-D-5480
> and shall be in accordance with ASME Y14.2M."*

**VERIFIED — S9, MIL-D-5480F, the spec 101.2 points at:**

> *"**3.2.1 Legibility and contrast.** Legibility and contrast of reproductions shall be such
> that every line, number, letter, and character be clearly legible and readable."*
>
> *"**3.2.2 Reproductive quality.** Class 2 and 3 reproductions shall be of such clarity as to
> produce a fourth generation copy... which will meet the legibility requirements specified
> herein."*
>
> *"**3.2.2.1 d. Clarity.** Lettering and linework shall be clear, legible, and suitable for
> reproduction."*
>
> *"**4.2 Reject/accept.** Reproductions not conforming to the specific requirements shall be
> rejected and new reproductions conforming to the requirements shall be prepared prior to
> submitting the lot for Government acceptance. **If acceptable reproductions conforming to the
> legibility and reproducibility requirements specified herein cannot be obtained from the
> contractor's original drawings, the original drawings shall be retraced, redrawn, or
> replotted** as necessary, in order to produce acceptable reproductions."*

**This is the strongest precedent in the document for the proposition that a correct-but-
unreadable drawing is a defective deliverable.** Clause 4.2 is a rejection-and-redraw gate
triggered by legibility alone, with no reference to whether the design is right. The drawing
gets redrawn.

**VERIFIED — S11, NPS-10 1986, Chapter 3 *"Drafting Practices"*, pp. 1–2:**

> *"All NPS drawings are entered into a unitized microfilm system... Therefore, they must be
> capable of being reproduced as clear and legible half-size prints... The construction
> contractor or maintenance worker may never see the original drawing, only a reproduction of
> it."*
>
> *"Consistent line density and clear legible lettering are essential. The finest camera and the
> most carefully controlled processing cannot produce good results unless the original is of
> high quality. **Good prints begin on the drafting table.** Keep in mind the drawing you are
> working on is going to be reduced and read as a half-size print. **Originals or photographic
> duplicates that cannot be reproduced as clear, legible half-size prints are unacceptable.**"*
>
> *"**GENERAL.** These drafting practices are to be followed:*
> *Maintain even line weight.*
> ***Avoid line congestion.***
> ***Match line weight when making additions or changes.***
> *Keep drawings clean and uncreased.*
> *Keep erasures at a minimum, with no ghosting.*
> *Maintain dark, clear, sharp, solid uniform lines to ensure good reproduction and microfilm.*
> *Differentiate outlines and section lines by varying the width or thickness of lines, not by
> changing densities; the density of the line should be constant.*
> *Use line work techniques for distinctive symbols and crosshatching.*
> *Do not use pencil shading or toning.*
> ***Ensure open spacing of lines and lettering.***
> *Use mechanical or clear legible hand lettering. All-mechanical lettering (LeRoy) makes
> revisions simpler and reproductions clearer."*

*"Avoid line congestion"* and *"Ensure open spacing of lines and lettering"* are **crowding
rules, stated normatively, in a federal drafting guideline.** The project's survey recorded
(§359 of the prior document) that *"no overlapping text, designators or symbols"* could not be
found as a clause in any modern standard. It is a clause here — just in a 1986 agency guideline
rather than in ASME.

**And the criterion behind all of it is worth transplanting whole: the quality bar is set by a
DOWNSTREAM REPRODUCTION, not by the author's screen.** NPS-10 judges every original against
whether it survives reduction to a half-size diazo print, because *"the construction contractor
or maintenance worker may never see the original drawing."* MIL-D-5480F sets the bar at a
**fourth-generation copy** still being legible. That is a concrete, testable, author-independent
definition of "legible enough" — and it is exactly the kind of criterion `CLAUDE.md` says must
not come from the producing agent.

---

## 4. The check print and its colour code

### 4.1 The practice

**VERIFIED — S1, Collins 1918, "Checking Prints" (pp. 29–30), complete:**

> *"**Checking Prints.** — All drawings shall be checked by checkers or squad foremen. For this
> purpose **a check print shall be made when the drawing warrants it.**
>
> **Correct matter shall be marked with yellow crayon and corrections with red crayon.** After
> corrections have been made, the check prints are to be delivered to the file clerk for filing
> with the record prints.
>
> Check prints are not to be taken from the drafting room, and receipt cards must be signed when
> they are taken from the files."*

That is the canonical form the project was looking for, from a 1918 reference book written for
drafting-room managers. Four separable rules: the check print is a **separate copy**, not the
original; it is **conditional** (*"when the drawing warrants it"*); the markup is **two-colour
with a defined semantics**; and the marked print is **retained and filed** (§6).

### 4.2 The colour code VARIED — and not just in hue

The task asked for verification because the conventions varied. They varied **in kind**. The two
primary codes reached here are not two palettes for the same scheme; they encode different
things.

| Source | Code | What the colour encodes |
| --- | --- | --- |
| **S1 Collins, 1918** (**VERIFIED**) | **yellow = correct matter; red = corrections** | the checker's **verdict** on each feature |
| **S11 NPS-10, 1986** (**VERIFIED**) | **red = additions; green = deletions; blue = general notation or specific instruction** | the **kind of edit** being requested |
| **S2 French, 1918**, structural-drawing chapter (**VERIFIED**) | **a dot in red ink under the dimension = checked** | verdict, but *red* means **correct**, and it is marked on the tracing, not a print |
| **S14 Bishop, 1920**, structural (**VERIFIED**) | blue or soft black pencil on the tracing; black or yellow on a blueprint; **red forbidden outright** | nothing — the colour is chosen by the **medium**, not by meaning |

**VERIFIED — S14, Bishop 1920, p. 181, and this is the passage that explains the whole
muddle:**

> *"The temporary mark of the checker may be made on the tracing with either blue or soft black
> pencil. It is easier to maintain a sharper point on the black pencil than on the blue, and
> hence the figures and notes need not be made so large. The black marks may be removed more
> readily than the blue. Marks on blueprints may be made satisfactorily with either black or
> yellow pencils. **Red pencils should not be used on either tracing cloth or blue prints.** The
> red marks cannot be erased easily from the cloth — in fact it is impossible to remove some of
> them. **There are certain combinations of red crayon on blue prints which cause unnecessary
> eye strain on account of an optical illusion which makes it difficult for the eye to focus on
> the red lines.**"*

**Bishop forbids, with two stated reasons, the exact colour Collins mandates** — and neither
reason is semantic. They are **erasability** (can this mark be taken off tracing cloth?) and
**legibility of the mark against its ground** (red line work on a blue-ground blueprint defeats
the eye's focus — chromatic aberration, described two years before anyone here would have had
a name for it).

**That is the actual answer to "what was the colour code?", and it is better than a legend.**
The colour was selected by the *physics of the medium* — what the mark had to sit on, and
whether it had to come off again. Collins is marking a blueprint and wants the correction to
*stay*; Bishop is marking tracing cloth and needs it to *go*. Both are right about their own
medium, and **neither convention carries any information once the medium changes.** A digital
review surface has no erasability constraint and no blue ground, so **inheriting any of these
palettes would be cargo-cult.** What transfers is the method: pick the marking so that it is
unambiguously distinguishable from the artifact and legible against it, and **say which
property you optimised.**

**VERIFIED — S11, NPS-10 1986, Chapter 3, p. 3, "COLOR CODES", complete:**

> *"Additions, changes, and corrections must be marked on **check prints and as-constructed
> prints** using the following color code:*
> *red — indicates additions*
> *green — indicates deletions*
> *blue — indicates general notation or specific instruction"*

(Indexed in the guideline's own index as *"color code, for check prints, 3:3"* — **VERIFIED**,
so it is a first-class named convention in that document, not an aside.)

**VERIFIED — S2, French 1918, Chapter on structural drawing, p. 237:**

> *"Checking is usually indicated by a dot in red ink placed under the dimension."*

Note the direct collision: in Collins' machine-drawing office **red means wrong**; in French's
structural-steel chapter **red means verified**. Anyone inheriting a legend without its source
would invert the whole review. **The lesson for the project is not "adopt yellow/red" — it is
that the legend is part of the artifact and must travel with it.**

### 4.3 The marking grammar — Bishop gives one, and it has three symbols and a propagation rule

**VERIFIED — S14, Bishop 1920, p. 181, "Indicating Mistakes" and "Check Marks":**

> *"A freehand ring or loop drawn around a dimension, a note, or a whole detail usually
> signifies that **the enclosed portion is incorrect.** A line may be drawn from the ring to a
> convenient clear space on the drawing where the correct value or other note may be written by
> the checker **so that it need not be disturbed by the draftsman** when he makes that or any
> other correction. An inked ring is often drawn around a group of holes with a line leading to
> a special note, but **in order to avoid ambiguity such a ring should not include figures or
> notes.** A penciled ring may be drawn around a detail which is likely to be changed; **such a
> ring should invite suspicion or doubt, and no use should be made of figures or other data
> taken without verification from within the ring.** Accordingly it is [not] good practice to
> encircle any dimension or note unless it is **either wrong or doubtful** because of incomplete
> or revised information."*
>
> *"**Check Marks.** In checking a drawing a checker usually places a dot or a v-shaped check
> mark over each correct dimension or note. **These check marks indicate his progress and make
> him less liable to overlook parts of the drawing**; they are of special value on complicated
> drawings. Check marks may be made with a pencil and later erased, or **they may be made
> permanently in red or blue ink for future record.** If ink is used, some checkers **place the
> check marks underneath corrected figures to distinguish them from those which were originally
> correct.**"*

Four things worth lifting whole:

- **Three distinct marks, not two.** A tick = *verified correct*. An inked ring = *wrong*. A
  **pencilled** ring = *doubtful* — information is incomplete or in flux, which is neither a
  defect nor a pass. The project has a direct use for the third: a sheet drawn from a circuit
  with an open owner question is exactly "doubtful, not wrong".
- **A propagation rule attached to doubt:** *"no use should be made of figures or other data
  taken without verification from within the ring."* The doubt marker is not decorative; it
  **quarantines** the value, and anything derived from it inherits the doubt. That is a
  genuinely sophisticated idea for 1920 and it has no counterpart in any modern review tool
  found by the prior survey.
- **The mark means nothing if it is applied loosely** — *"not good practice to encircle any
  dimension or note unless it is either wrong or doubtful"* — and must not be ambiguous about
  its own scope (*"such a ring should not include figures or notes"*).
- **Tick position encodes provenance:** above = originally correct, below = correct *after*
  correction. So the finished markup distinguishes "this was right" from "this was fixed and is
  now right", which is precisely the distinction a later reader needs and which a defect list
  destroys.

### 4.4 Where the markup goes decides whether it survives — and Bishop states the trade-off

**VERIFIED — S14, Bishop 1920, p. 181:**

> *"The checker should indicate all mistakes so that the draftsman will be able to make the
> necessary changes **without disturbing the checker's notes.** These notes should be preserved
> until the checker has convinced himself that all changes have been made correctly. **The
> mistakes may be indicated either on the tracing or on a blueprint.** The former method is more
> direct and more common; it is also quicker because the checker does not have to wait for a
> print to be made, and the draftsman does not need to refer to a print before making each
> change on the tracing. **The blueprint method is used when a permanent record of the checker's
> marks is desired.**"*

**This is the missing explanation for why Collins' office mandated a check print at all.**
Marking the tracing directly is faster and needs no print — and it is **ephemeral**, because the
marks are erased as the drawing is corrected. Marking a print costs a print and a round trip and
**buys a permanent record.** Collins' office paid that cost deliberately and then filed the
result (§5.2); Bishop's offices mostly did not. The check print is therefore not "how checking
was done" — it is **the variant you choose when you want the review to outlive the correction**,
which is exactly the variant this project needs.

### 4.5 The discipline around it

- **The tick is per-feature, and it is a coverage record.** **VERIFIED — S2, French:** *"As each
  dimension or feature is verified a checkmark should be placed above it or under it."* Combined
  with Collins' *"correct matter shall be marked with yellow crayon"*, the implication is the
  one that matters most: **the markup records what WAS CHECKED, not only what was wrong.** An
  unmarked region is not "fine" — it is "not reached". The absence of a mark is itself a
  finding, and that is why the sheet had to be kept (§6).
- **One item-class at a time, serially.** **VERIFIED — S2, French:** *"Each of these should be
  followed through separately, allowing nothing to distract the attention from it."* And **S4,
  Machinery's No. 2:** *"...beginning with the first part in the list..."* The checker makes
  twelve passes over the drawing, not one pass looking for twelve things.
- **Colour, not graphite, and not on the original.** The check print exists so that the markup
  is physically distinguishable from the drawing and physically separable from it. Collins
  marks a *print*; the original tracing is never marked up.
- **The check print does not leave the room, and custody is logged.** **VERIFIED — S1:**
  *"Check prints are not to be taken from the drafting room, and receipt cards must be signed
  when they are taken from the files."*
- **An unchecked drawing had to be visibly branded as unchecked.** **VERIFIED — S1, Collins,
  "Preliminary Prints" (p. 36)** and "Signatures" (p. 29): *"For estimating purposes on rush
  work only, preliminary prints may be issued before drawings are checked or approved. In that
  event all such prints should be stamped 'preliminary'"*; *"When prints are sent out before
  being checked or approved, they should in all cases be marked 'Preliminary'... Tracings from
  which preliminary prints have been made should be returned to the squad foreman for
  completion. They must not be filed unless so directed by him."* This is `CLAUDE.md`'s *"a
  skipped check must never look like a passing one"*, implemented in a rubber stamp in 1918,
  with the escape hatch deliberately narrowed (*"for estimating purposes on rush work only"*)
  and the unfinished original held out of the file so it cannot be mistaken for done.

---

## 5. What happened to the markup — the most valuable finding

This is the question the project most needed answered, and **Collins 1918 answers it in two
sentences in two different sections, and the second one is the sharp one.**

### 5.1 It was retained, and filed with the record prints

**VERIFIED — S1, Collins 1918, "Checking Prints" (p. 29):**

> *"**After corrections have been made, the check prints are to be delivered to the file clerk
> for filing with the record prints.**"*

The check print's life does **not** end when the draughtsman has made the corrections. That is
the moment it gets filed. And it is filed **with the record prints** — which in this system are
the authoritative printing history:

**VERIFIED — S1, Collins 1918, "Record Prints" (p. 36):**

> *"A record print shall be kept of the first printing from every tracing and from each
> subsequent revision. Every such print shall be stamped 'Record Print,' followed by date and
> number: 1, 2, or 3, etc., in the order of printing. Record prints will be kept in a separate
> file, and are not to be taken from the drafting room. A receipt card should be signed when
> they are taken from the files for use in the drafting room."*

So the marked check print is placed in the office's **permanent evidentiary file**, next to the
frozen snapshot of each issued state of the drawing. It is archival material, under the same
custody regime.

### 5.2 It was explicitly exempted from the destruction sweep — and this is the clause to quote

**VERIFIED — S1, Collins 1918, "Revisions" (pp. 36–37):**

> *"**Old prints of revised drawings (except record and check prints) shall be destroyed by the
> file clerk.** In order that he may do this, a copy of all orders for revisions should be given
> him."*

**The check print is named, by exception, in the rule that destroys every other superseded
print.** The office ran an active purge of stale copies — the correct discipline, and the same
instinct as this repository's *"supersede means delete"* — and it carved out exactly two things:
the record print and **the checker's marked-up sheet.** The reviewer's markup was given a
*stronger* retention guarantee than the drawing copies it was marked against.

That is the precedent the project said it could not find anywhere modern. It is not an
accident of hoarding; it is a deliberate exception written into a destruction rule.

### 5.3 Reconciliation was a signature on the revision line, not a diff

No source reached here describes a line-by-line reconciliation of the markup against the
corrected drawing. What they describe instead is that **every revision is re-checked and the
checker re-signs for it**, so the reconciliation is carried by a liability transfer rather than
by a document comparison.

**VERIFIED — S1, Collins 1918, "Revisions" (p. 36):**

> *"Revisions to drawings will only be made with the approval of the chief engineer's office, and
> an order should be issued similar to that for new work. Each revision should be marked with a
> letter in the body of the drawing, also noted in the space provided for the purpose near the
> title. This note should consist of the mark letter, date, and brief description of the
> revision, **followed by draftsman's and checker's initials.**"*

**VERIFIED — S10, NASA GSFC 1994** (quoted in full at §2.3): an EO-covered change *"only needs
approval of the draftsman or person incorporating the change, and the checker."*

Same shape, 76 years apart: **the revision block is the reconciliation record.** Its content —
mark letter keyed into the body of the drawing, date, description, draughtsman's and checker's
initials — is a claim that *this* change was made and *this* checker accepted it. The marked
check print is the supporting evidence held in the file; the revision line is the assertion on
the face of the drawing.

### 5.4 Was there a back-check? — YES, ESTABLISHED, with a definition and a rationale

> **This section said "NOT ESTABLISHED" until S14 was found, and the correction is left visible
> rather than edited away**, because the reason the negative was wrong is instructive: the
> search had been aimed at standards and at general drawing textbooks, and the back-check lives
> in a *structural* drafting textbook's dedicated checking chapter. A bounded negative is only
> as good as the shelf it was taken from.

**VERIFIED — S14, Bishop 1920, glossary:**

> *"**Back-check.** To approve or check the corrections of a checker."*

**VERIFIED — S14, Bishop 1920, Chapter XXIX, p. 182:**

> *"**Back-checking.** — A draftsman should never change a drawing according to the checker's
> notes until he is convinced that such changes should be made. **Unless he 'back-checks' or
> verifies each correction before making it, certain parts of the drawing are left unchecked,
> the value being the checker's instead of the detailer's.** No checker is infallible, and every
> sheet that is supposed to be checked should be completely checked. A checker usually indicates
> the values which he believes to be correct; this is the simplest method for him to use. It is
> also the most convenient method for the detailer who back-checks conscientiously. **Some
> checkers wish to insure back-checking by withholding the correct values until after the
> draftsman has supplied them.** These checkers indicate mistakes for the draftsman but record
> the correct values on a blueprint or in a book for their own use in checking the corrected
> drawing. For convenience in identification they may number the mistakes consecutively."*

**The argument is the valuable part, and it is not the obvious one.** A back-check is not a
belt-and-braces re-read. Bishop identifies a specific, structural hole: the office's guarantee
is that *"every drawing should be the product of two minds"* (§6.7), and **the checker's own
corrections are the one part of the drawing that only one mind has ever seen.** If the
draughtsman transcribes the checker's suggested value, that value arrives on the drawing
unchecked — and it arrives precisely at the places already known to be error-prone. **The
correction is the least-checked region of a checked drawing.**

And the enforcement mechanism is the sharp bit: **withhold the answer.** State the defect,
number it, keep the correct value in the checker's own book, and make the draughtsman produce
the value independently — then compare. Compliance is not requested, it is made structurally
necessary. Bishop reports using the same device on students, substituting *"not the correct
values, but the reference numbers to paragraphs which will suggest the nature of the
mistakes"* (**VERIFIED**, p. 182) — a defect class rather than a fix.

This is the most directly transferable finding in the document for a workflow where an agent
drafts and a human checks. See §7.5.

### 5.5 The adjacent practice: markup as the as-built record

**VERIFIED — S11, NPS-10 1986, Chapter 3, p. 3:** the colour code applies to *"check prints
**and as-constructed prints**"* — the same marking vocabulary governs the reviewer's markup and
the field record of what was actually built, and NPS-10 has a whole procedure and a revised
cover sheet for turning as-constructed markup into an issued drawing set (**VERIFIED**, NPS-10
"REVISED COVER SHEET FOR AS-CONSTRUCTED DRAWINGS").

So in that system **marked-up prints are a recognised document class with a defined lifecycle in
both directions** — inbound (checker → draughtsman) and outbound (field → archive) — sharing one
legend.

### 5.6 The counter-current, and the project should know about it

**VERIFIED — S7, MIL-STD-100F, clauses 605.4 and 605.4.1:**

> *"**605.4 Revision history retention.** The latest revision, with the change authorization
> document identification or revision description, shall be listed on the drawing. However,
> **previous revision history may be omitted.**"*
>
> *"**605.4.1 Removal of revision history.** Removal of revision history is accomplished through
> one of the following methods: a. Remove one complete revision record entry at a time until
> enough space is available to record the current revision, starting with the oldest revision
> recorded and continuing in alphabetical order until sufficient space is available. b. Remove
> all previous revision history. c. [Remove all previous revision history except...] the
> revision level that identifies the revision authorization document(s) and date of revision.
> d. Remove all previous revision history except that associated with the revision immediately
> preceding the current revision. **NOTE: Revision entries addressing rights in data or security
> classification shall be retained.**"*

By 1996 the drawing itself is permitted to **forget** its history, because the authoritative
record has moved off the drawing and into the **change authorization document** (the EO/ECO).
The drawing is a view; the change document is the ledger. That is worth noting because it is the
opposite move from 1918, where the drafting room's own files were the ledger. Both designs
agree on the principle, though: **the review record lives somewhere durable and
access-controlled — the disagreement is only about where.**

---

## 6. The standards: what each one actually contains

### 6.1 MIL-STD-100F / 100G — VERIFIED, clause level

**Status (VERIFIED, S8 and the everyspec record):** MIL-STD-100G (9 June 1997) is **cancelled**,
superseded by ASME Y14.100, Y14.24, Y14.35M and Y14.34M. 100G §1.1:

> *"This standard, along with ASME Y14.100M, establishes the essential requirements and
> reference documents applicable to the preparation and revision of engineering drawings and
> associated lists for or by Departments and Agencies of the Department of Defense."*

and 100G §3 (**VERIFIED**): *"The preferred standard for Engineering Drawing Practices is ASME
Y14.100M."* 100G is a thin DoD-delta shell; **MIL-STD-100F (9 Sept 1996) is the last full
standalone version** and is the one to read.

**What 100F contains that bears on this question:**

- **Appendix A §40.3.1** — the five-role signature authority table. Quoted in full at §2.3.
  This is the clause-level answer on the checker's role in a US military standard.
- **Chapter 100 §101.2** — line conventions and lettering shall meet MIL-D-5480 legibility and
  reproducibility, and ASME Y14.2M. Quoted at §3.5.
- **Chapter 600 "Revision of Engineering Drawings"**, §§600–608. §601: *"The requirements for
  the revision of drawings shall be in accordance with ASME Y14.35M and the following."*
- **§602 "Drawing practices"** — **VERIFIED**, and directly relevant to the project:

  > *"When revising an existing engineering drawing, the graphic symbols, designations,
  > lettering style and size, material (lead/ink) and method of application and drawing
  > practices (such as line width) used in creating the original drawing format shall be
  > followed unless otherwise directed by the design or procuring activity. When a drawing is
  > being revised and does not reference the dimensioning and tolerancing standard or applicable
  > issue, a determination of the applicable standard or issue shall be made, and the proper
  > standard then specified on the drawing and recorded as a change in the revision history
  > block..."*

  **A graphical-consistency requirement on revisions**: an edit must match the host drawing's
  lettering, symbols and line widths. NPS-10 says the same thing in one line — *"Match line
  weight when making additions or changes."* For an agent that regenerates part of a sheet,
  this is the stated obligation: **a patch must be graphically indistinguishable in style from
  what it patches.**
- **§603** — revision symbols *"shall not be used on drawings in book-form, artwork master, of
  undimensioned drawings and **schematic or wiring diagrams** where the use of such symbols may
  conflict with other symbols as used on these kinds of drawings."* (**VERIFIED**) A
  schematic-specific carve-out: the revision triangle is banned from schematics because it
  would collide with circuit symbology.
- **§604** — *"Any change to a drawing or associated list, except as noted in 604.1 and 607,
  requires advancing the revision level."* (**VERIFIED**)
- **§§605.4, 605.4.1** — revision-history retention and removal. Quoted at §5.6.
- **§607** *"Redrawn drawings"* — *"A drawing may be redrawn to replace an original that has
  [deteriorated]..."*, §607.1 *"Redrawn with or without change."* (**VERIFIED** as headings;
  OCR too degraded to quote the body reliably.)

**BOUNDED NEGATIVE, VERIFIED BY A CHECK THAT COULD HAVE FAILED.** I grepped the extracted text
of MIL-STD-100F (386 KB) case-insensitively for `check`, `legib`, `crowd`, `redline`,
`red line`, `marked-up`, `marked up`. **`check` occurs five times in the entire standard** —
four in the CHECKER signature-block context and once as *"checksum"*. `legib` and `crowd` occur
zero times. There is **no `check print` clause, no colour code, and no markup-retention clause
in MIL-STD-100F.**

**The grep had to be shown capable of seeing the whole document before that negative means
anything** — `CLAUDE.md`'s rule that evidence must be a check that could have failed, and the
entry it cites that rested on a grep of binary files. So: `pdfinfo` reports **190 pages**, and
splitting the extracted text on form-feeds yields **190 non-empty text pages out of 190**. The
text layer covers every page of the standard; nothing was searched past. (It is OCR, with
visible character errors, so a *single* garbled occurrence of a term could in principle survive
the grep — but not a clause, a heading, or a table-of-contents entry, which is what a
standardised check-print procedure would have to be.)

The reading: the check print was **drafting-room procedure, not a standardised deliverable.**
The standard regulates only the **signature** the check produces — which is also why the
practice became invisible to anyone searching the standards rather than the office manuals, and
is most of why the earlier survey came up empty.

### 6.2 MIL-D-5480F — VERIFIED, clause level

*Data, Engineering and Technical: Reproduction*, 1 Oct 1994; supersedes MIL-D-8510B; superseded
by MIL-PRF-5480G. 14 pp. Scope: *"the minimum requirements for the production, preparation for
delivery, and shipment of reproducible and non reproducible copies of drawings, associated
lists, and related engineering and technical data."* Clauses 3.2.1, 3.2.2, 3.2.2.1(d) and **4.2**
are quoted at §3.5. **This is the legibility-rejection authority behind MIL-STD-100F §101.2 and
the best single clause in the corpus for "unreadable is defective".**

### 6.3 ASME Y14.35, Y14.100, Y14.2 — NOT OBTAINED AT CLAUSE LEVEL

**This is a plain failure and is reported as one.** All three are live, paywalled ASME
standards; no free full text was reachable. What was VERIFIED is only the scope statements from
asme.org product pages:

- **ASME Y14.35 (2025 ed.)**: *"This Standard defines the practices for revising drawings and
  associated documents and establishes methods for identification and recording revisions."*
- **ASME Y14.100 (2017 ed.)**: *"This Standard establishes the essential requirements and
  reference documents applicable to the preparation and revision of manual or computer generated
  engineering drawings and associated lists unless tailored by a specialty Standard."* The page
  notes it incorporates **Y14.42 on Digital Approval Systems** — the modern descendant of the
  signature block, and the obvious place to look next for an electronic-signature analogue of
  the checker.
- **ASME Y14.2 (2014, reaffirmed 2020)**: *"This standard establishes the line and lettering
  practices for use in the preparation of engineering drawings, including the recognition of the
  requirements for CAD... and manual preparation for their reduction and reproduction."*

**I could not determine whether ASME Y14.35 says anything at all about check prints or markup
retention.** Given that its DoD predecessor (MIL-STD-100F Chapter 600) does not, the prior
probability is low — but that is an inference, not a reading. **What would settle it:** the
criterion is a reading of Y14.35's clause list for any term of art covering a marked-up review
copy; the mechanism (a guess from someone who has not tried it) is either a library copy, or
ASME's free online "Table of Contents" preview if one exists for Y14.35, or a NASA/DoD
tailoring document that quotes Y14.35 clause numbers verbatim. **MIL-STD-100F is the usable
proxy in the meantime, and it is free.**

### 6.4 NASA GSFC X-673-64-1F Rev 001 (Dec 1994) — VERIFIED, clause level

Quoted at §2.1 and §2.3. Also **VERIFIED**: the APPROVED block requires role-tagged signatures
(*"'ENG' for engineer, 'STRESS' for stress engineer, 'QA' for quality assurance engineer,
'MATL' for materials engineer, 'ELEC' for electrical engineer"*) and *"All names... must be
legible. **The hand-written initials on the paper original are the official approval of that
document.**"*

**BOUNDED NEGATIVE:** grepped the full extracted text for `crayon`, `colored pencil`, `yellow`,
`red pencil`, `redline`, `red-line` — **zero hits.** This manual regulates the signature, not
the markup.

### 6.5 NPS-10 Release 2 (1986) — VERIFIED, clause level

The only source reached that documents **both** a check-print colour code **and** normative
drawing-quality rules **and** a markup lifecycle. Quoted at §3.5, §4.2, §5.5. Also **VERIFIED**,
Chapter 2 "APPROVAL AND REVISION BLOCKS": the revision block carries *"an identifying mark (a
triangle with a number or letter, used to key the information in the revision block to the part
of the drawing it pertains to)"*, the affected sheet numbers, a brief description, the date, and
*"the initials of the person responsible for the revision"*; and the keying method is *"circling
the affected part of each drawing, **preferably on the back side of the sheet**, and placing a
revision mark on or within the circle."*

**The revision mark is a spatial index into the drawing.** The revision block is not a changelog
beside the drawing; it is a changelog **keyed to coordinates on** the drawing by a triangle, and
the region is circled — on the back of the sheet so the circle does not pollute the drawing.
That is a markup-anchoring design worth copying directly (§7).

### 6.6 A drafting-room manual proper

**S1, Collins 1918** *is* the drafting-room manual the task hoped for — it is subtitled *"A
Reference Book for Engineers and Draftsmen"* and consists of model office rules in alphabetical
order (Checking Prints, Record Prints, Revisions, Void Drawings, Filing, Signatures,
Transmitting Prints, Preliminary Prints), i.e. **the text a 1918 office would adopt verbatim as
its standards manual.** It is the single most useful document found in this pass and it is
freely downloadable as plain text. **S12, Clute 1928** is architectural and contains only a
second-hand discussion of *"checking lists"* with no colour code (**VERIFIED** by grep: zero
hits for `crayon`, `check print`); it adds the observation that *"these lists have value in that
they make for clear thinking right from the beginning"* but nothing procedural.

### 6.7 Bishop 1920, Chapter XXIX — the fullest account, and its policy on when to check at all

Quoted throughout §§2–5 and §7. Collected here are the parts that belong to the **policy**
rather than to the mechanics, because they are the ones that argue rather than instruct.

**The role, and the authority it carries (VERIFIED, p. 179):**

> *"A checker is a person who 'checks' or approves the correct portions of a drawing and
> indicates the mistakes for correction. **After these mistakes have been verified and corrected
> by the detailer, the checker ascertains that all corrections have been made and then signs the
> drawing to show that he has assumed responsibility for every detail, every figure, and every
> note, in short for the entire drawing.** The checker is usually a man of greater experience
> than the detailer, and **no draftsman is allowed to check the work of others until he is able
> to make drawings which are comparatively free from errors.**"*

Note the ordering: the checker signs **after** verifying the corrections, not when handing the
markup over. The signature is the terminal act of the whole loop, and it is unlimited in scope —
*"the entire drawing"*, not "the parts I marked".

**Why check at all, stated as a cost argument rather than an axiom (VERIFIED, p. 179):**

> *"The importance of careful checking depends upon the ability and the skill of the draftsman;
> it is essential for the drawings made by inexperienced men. The importance increases with the
> size of a contract and the number of draftsmen engaged upon it, because of greater difficulty
> in insuring the proper agreement between the drawings of connecting members... The majority of
> companies have all their drawings checked because they are unwilling to assume the risk of
> serious mistakes which might be made if only one draftsman were responsible. Since no
> draftsman is infallible **these companies believe that every drawing should be the product of
> two minds.** Some companies find that it is economical to have all drawings made by
> experienced draftsmen whose work is comparatively free from errors without being checked;
> these companies maintain that occasional mistakes can be rectified at a smaller cost and to
> better advantage than all drawings can be checked..."*

**And the partial-check proposal, which is the sharpest thing in the chapter (VERIFIED, p. 179):**

> *"Perhaps a better method would be to have the main dimensions, the strength of the
> connections, and the spacing of all holes for field connections checked, **but not the spacing
> of the shop rivets or the sizes of component parts which will necessarily be verified in the
> shop.**"*

**Do not check what a downstream process is going to catch anyway.** Bishop allocates checking
effort by asking where an error would *escape*, not by coverage. The analogue here is exact and
it cuts work: a human reviewer should not be spending attention on anything `validateCircuit`,
the netlist export or `kicad-cli` will refuse — those are the shop. What escapes every tool this
repository has is **arrangement, crowding and whether the sheet reads**, which is what Bishop
puts at item (1) and what §7.14 argues is the whole of the human's job.

**The one piece of social advice, which is better than it sounds (VERIFIED, p. 62):**

> *"**The friction should be between the draftsman and the drawing, not between the draftsman
> and the checker.**"*

With, three paragraphs earlier, the reason it has to be said: a beginner's *"first and often the
only indication of friction... usually arises because he objects to erasing."* And the criterion
Bishop judges a draughtsman by (**VERIFIED**, pp. 62 and 180): *"A new man is judged not so much
by the mistakes he makes, as by the mistakes he makes a second time."* **A repeat defect is the
signal, not a defect** — which is the same quantity this repository's governance tracks when it
records that a demand was *"re-erected under a new justification"*, and it is the nearest thing
in the corpus to the prior survey's §6 item 2 (inducing a rule from accumulated verdicts). Even
here it is a human noticing a pattern, not a mechanism.

---

## 7. What is worth adopting for agent-drafted / human-checked schematics

Ordered by how much each one buys relative to what it costs to build. Each is tied to the clause
it comes from so the criterion is traceable to something other than this writer's taste.

### 7.1 Adopt: the markup is a retained artifact, exempted by name from cleanup

**Source: Collins 1918, "Revisions" — *"Old prints of revised drawings (except record and check
prints) shall be destroyed by the file clerk."*** (§5.2)

The project said it found no modern precedent for capturing and reusing a reviewer's markup.
The precedent is 1918 and it is stated as an **exception inside a deletion rule.** Concretely:
when this repository builds its review loop, the markup file is not a scratch artifact in a
gitignored workspace — it is committed beside the sheet it marks, and whatever sweep deletes
superseded renders names the markup as exempt. This repository already knows the failure this
prevents: `CLAUDE.md` records that `.superpowers/` is gitignored and *"an entry there is
invisible to review, absent from the history, and destroyed by `git clean -fdx`."* A markup that
lives only in a session is a markup that was never captured.

### 7.2 Adopt: the markup is a COVERAGE record, not only a defect list

**Source: French/Follows item discipline — *"As each dimension or feature is verified a
checkmark should be placed above it or under it"*; Collins — *"Correct matter shall be marked
with yellow crayon."*** (§4.1, §4.3)

This is the insight the project is most likely to miss, and it inverts the obvious design. A
modern review tool records **findings**. The check print recorded **verifications** — every
feature the checker cleared got a positive mark, so an *unmarked* feature meant *not yet
examined*. Two consequences:

1. **The markup answers "what did the reviewer actually look at?"** — which is a question no
   list of comments can answer, and which is precisely the question that matters when deciding
   whether a sheet has been reviewed or merely glanced at. This repository has been bitten by
   exactly this distinction: `CLAUDE.md` records that *"a board that draws is not a board whose
   drawing anyone has read"*, and that the one sheet anyone had read closely *"could not be read
   as a drawing at all while the census counted it a success."* A coverage-marking review is the
   mechanism that makes *"quote both or neither"* enforceable.
2. **Coverage is machine-checkable where findings are not.** If a review records per-element
   dispositions keyed to element ids, a tool can report *"37 of 112 symbols and 4 of 61 nets
   carry a disposition"* — and that figure is a measurement in a tool, which is where
   `CLAUDE.md` says measurements belong, rather than a claim in prose.

### 7.3 Adopt: anchor every mark to a region of the sheet, and keep the anchor off the drawing

**Source: NPS-10 Chapter 2 — the revision triangle keyed to a circled region, *"preferably on
the back side of the sheet"*.** (§6.5)

A markup whose items say *"the filter section is crowded"* is not reusable. A markup whose items
each carry a sheet, a region and a mark symbol can be re-applied, diffed across regenerations,
and reported against. And the *"back side of the sheet"* detail generalises cleanly to a
generated artifact: **the annotation layer is a separate layer, never an edit to the drawing.**
Collins marks a *print*, never the tracing; NPS circles on the verso. The same rule for this
repository: review annotations are a sidecar keyed to stable element identities, never a patch
to the `.kicad_sch`.

This also resolves a real difficulty the paper practice did not have. A regenerated sheet moves
its geometry, so an (x, y) anchor goes stale silently — the mtime failure mode in new clothes.
Anchor to the **model's semantic ids** (`input_bias_resistor`, the net name, the sheet's
functional block), which this repository already guarantees are stable and meaningful, and
derive coordinates at render time. A mark that cannot find its anchor must then **refuse
loudly** rather than drop — `CLAUDE.md`'s rule, and the only thing that stops a markup from
quietly emptying itself across a regeneration.

### 7.4 Adopt: bind the verdict to a revision level, and make advancing the level require a new signature

**Source: Collins 1918, "Revisions" — the revision line carries *"draftsman's and checker's
initials"*; MIL-STD-100F §604 — *"Any change to a drawing... requires advancing the revision
level"*; NASA GSFC 1994 — an EO-covered change still *"needs approval of the draftsman or person
incorporating the change, and the checker."*** (§5.3, §6.1)

The prior survey's §6 item 9 records that **nothing it found anywhere solves staleness of a
review verdict when the drawing changes under it**, and names the failure precisely —
OrangeCrab's filled checklist is *"a file in a directory with no reference to a commit, a hash,
or a rendered artifact."* The drafting office solved it, and the solution is structural rather
than clever: **a verdict is never attached to "the drawing", it is attached to a revision
level, and you cannot reach the next level without a checker's signature on it.** Staleness
becomes unrepresentable instead of detectable.

For this repository the translation is direct and needs no new machinery: a review record names
the **content hash of the rendered sheet it was made against** (the modern equivalent of the
revision letter, and strictly better than one — this repository already insists that derived
artifacts are *"compared by content, never by timestamp"*, for exactly the reason that a stale
record which looks current is the dangerous state). A record whose hash does not match the
current render is **not a finding about the current sheet** and must not be presented as one.
Whether it is void or merely unconfirmed is a design decision; what is not a decision is that
it must refuse to look current.

### 7.5 Adopt, and this is the one with the highest leverage: the back-check, by withholding the fix

**Source: Bishop 1920, p. 182 — *"Unless he 'back-checks' or verifies each correction before
making it, certain parts of the drawing are left unchecked, the value being the checker's
instead of the detailer's"*; and the enforcement — *"Some checkers wish to insure back-checking
by withholding the correct values until after the draftsman has supplied them."*** (§5.4)

**Bishop's hole is wide open in the obvious design of an agent/human review loop, and it is
wider there than it ever was on paper.** The default workflow is: agent drafts, human marks it
up with a correction, agent applies the correction. An agent applies a correction *perfectly and
without resistance*, which is exactly the failure mode — the corrected value has then been
through **one** mind, the reviewer's, and it sits at the spot already demonstrated to be
error-prone. A human draughtsman at least occasionally pushed back; an agent will not. **So the
review's weakest region is the part the reviewer touched, and the compliance of the agent is
what makes it weak.**

Bishop's remedy inverts the hand-off and needs no new machinery: **the reviewer records the
DEFECT, numbered, and withholds the FIX.** The agent must then derive the corrected value from
the circuit model, the rule file, or the spec — independently — and the reviewer compares what
came back against what they had privately written down. Two minds reach the corrected value or
the disagreement surfaces. Bishop's classroom variant is the cheaper form and probably the right
default here: record *"not the correct values, but the reference numbers to paragraphs which
will suggest the nature of the mistakes"* — i.e. **cite the rule that was violated, not the
edit to make.**

This also happens to be the shape `CLAUDE.md` already requires of a refusal: *"every `throw`
names what is missing, where to fix it, and why it is not defaulted"* — a defect class and a
reason, not a patch. The back-check is that discipline pointed the other way, at the human's
markup rather than at the tool's errors. And it gives the project something the prior survey's
§6 item 3 says has no prior art anywhere: **when the agent cannot derive the reviewer's fix from
any stated rule, that is evidence the rule is missing or wrong** — which is a carrier for *"the
rule is wrong"* falling out of the mechanism rather than needing to be invented.

### 7.6 Adopt: preserve the markup through the correction, and make damage to it loud

**Source: Bishop 1920, p. 181 and p. 182 — *"so that the draftsman will be able to make the
necessary changes without disturbing the checker's notes"*; *"These notes should be preserved
until the checker has convinced himself that all changes have been made correctly"*; and the
failure signal below.** (§4.4, §5.4)

**VERIFIED — S14, Bishop 1920, p. 182, "Corrections":**

> *"It is important that all changes be made without disturbing the checker's marks. **If any
> note of the checker is erased accidentally the draftsman should pencil a conspicuous question
> mark near the corresponding change to draw the attention of the checker to the change.** The
> checker may simply check the changes and then assume responsibility for the drawing by signing
> his initials to the sheet. **If his marks were erased he would have to recheck much or all of
> the drawing** before he could be sure that it was correct."*

Two rules, both mechanical:

1. **The correction must not consume the markup.** The markup has to still be there when the
   checker returns, or the check has to start over. Bishop's layout convention serves this
   directly — the correct value is written *"to a convenient clear space"* reached by a leader
   line, deliberately away from the thing being corrected, so that editing the drawing cannot
   overwrite the note. For a generated sheet the analogue is already in §7.3: the annotation is
   a separate layer keyed to semantic ids, and regenerating the sheet must not be able to
   destroy it.
2. **Damage to the markup must raise a flag, not pass quietly.** *"a conspicuous question
   mark"* — if the markup was lost, the artifact says so, loudly, at the place it happened.
   This is `CLAUDE.md`'s *"a skipped check must never look like a passing one"*, and the
   file-level version of it this repository has already been bitten by: a markup layer that
   silently empties on regeneration is indistinguishable from a sheet with no findings.

Bishop also settles what happens to the *draughtsman's* wrong values, and it is the opposite of
what happens to the markup (**VERIFIED**, p. 182): *"The figures should not be crossed out and
new ones should not be superimposed... If these figures were retained, the appearance of the
drawing would be marred, the drawing would be made less distinct, and the draftsman's mistakes
would be exposed to all who use the drawing."* **The drawing is cleaned; the record is kept
elsewhere.** The artifact carries the current truth and nothing else; the review history lives
in the markup and the revision line. That separation is worth holding onto — it is why a
schematic should not accumulate review scars.

### 7.7 Adopt: readability is judged FIRST, by a reader who has not yet learned the drawing

**Source: Follows item 1 — *"Always do this before checking any individual features; in other
words, before you have had time to become accustomed to the contents."*** (§3.1)

This is the subtlest and most valuable procedural point in the corpus, and it has a sharp
consequence for an agent workflow: **the agent that drafted the sheet can never make this
judgement, and neither can an agent that has read the netlist.** The instrument is naivety, and
both of them have spent it. So the first-read verdict must come from a human opening the render
cold, or from an agent given *only the rendered image* and no model — and whichever it is, it
must be collected **before** any detailed pass, because the pass destroys the instrument.

Operationally: the review surface should ask the first-read question first and record the answer
separately — *does this sheet tell a straight story on first sight?* — and that answer should
not be revisable after the detailed pass, because by then it is a different question.

### 7.8 Adopt: a separate sign-off for the drawing as a drawing

**Source: MIL-STD-100F §40.3.1(d) vs (e) — *"DRAWING APPROVAL... responsible for drawing format
and completeness"* against *"DESIGN APPROVAL... responsible for design technical adequacy"*.**
(§2.3)

Keep the two verdicts structurally separate and separately recorded. "The netlist is right" and
"the sheet is a good drawing of it" are different claims with different evidence and, in the DoD
model, different signatories. This repository's existing split is already close — the netlist
tests versus *"look at the output, not only the tests"* — but the standards make it a
**signature**, which is stronger: an artifact cannot be in a released state without both, and
the absence of one is visible rather than inferred.

### 7.9 Adopt: define "legible enough" by a downstream reproduction, not by the author

**Source: MIL-D-5480F §3.2.2 (a fourth-generation copy must still be legible); NPS-10 Chapter 3
(*"must be capable of being reproduced as clear and legible half-size prints"*,
*"Originals... that cannot be reproduced as clear, legible half-size prints are
unacceptable"*).** (§3.5)

This gives the project an author-independent legibility criterion it can actually test, which is
what `CLAUDE.md` demands of acceptance criteria. The analogue is immediate and cheap: **render
the sheet to the medium a person will really use** — a monochrome A4/Letter print at the sheet's
nominal size, or a half-size reduction — and make *that* the artifact the gate measures. Text
height, line-weight contrast and congestion all become measurable against a fixed target
instead of against a zoomable screen. And the justification NPS-10 gives is the one that binds
here too: *"the construction contractor or maintenance worker may never see the original
drawing, only a reproduction of it."* Whoever builds the Pultec from a sheet will be looking at
a print or a PDF on a bench, not at KiCad.

### 7.10 Adopt: an unchecked artifact is branded unchecked, and the unfinished original is held out of the file

**Source: Collins, "Preliminary Prints" / "Signatures" — *"all such prints should be stamped
'preliminary'"*; *"Tracings from which preliminary prints have been made should be returned to
the squad foreman for completion. They must not be filed unless so directed by him."*** (§4.5)

Already this repository's rule (*"a skipped check must never look like a passing one"*), but
Collins adds two refinements worth copying: the escape hatch is **narrowed by stated purpose**
(*"for estimating purposes on rush work only"*) rather than left to judgement, and the
unfinished original is **physically kept out of the archive** so it cannot be mistaken for
finished. A generated sheet that has not been reviewed should carry the brand *in the artifact*
— in the sheet's own title block, not only in a status file — and should not land where
reviewed sheets land.

### 7.11 Adopt: a revision must match the graphic style of what it revises

**Source: MIL-STD-100F §602; NPS-10 Chapter 3 — *"Match line weight when making additions or
changes."*** (§6.1)

Directly applicable to an agent that regenerates or patches part of a sheet. A patch that is
correct but visibly in a different hand degrades the drawing, and both standards forbid it. This
is a checkable property for a generator: the inserted region's line widths, text heights and
symbol variants must equal the host sheet's.

### 7.12 Adopt: the criteria are written down in advance, outside the drawing, and visible

**Source: Machinery's No. 2 — *"make a table covering these chances of errors and tack it in
plain sight on the wall over the desk"*; French crediting Follows' *Dictionary of Mechanical
Drawing* rather than composing a list.** (§3.1, §3.3)

This is already `CLAUDE.md`'s central invariant — *"an agent may never author the acceptance
criteria for the artifact it is producing"* — and the 1910 formulation adds two mechanisms it
does not yet name: the criteria list is **enumerated by reasoning about failure modes before any
drawing exists**, and it is **pinned where everyone can see it**, so a check is auditable
against a published list rather than against whatever the checker thought of that day. The
repository's rule files are the wall; what the practice suggests is that the *checklist for a
schematic sheet* should be one of them, numbered, so a review can report which items were run.

### 7.13 Carry across, but do not adopt the legend: the colour code is local and must travel with the artifact

**Source: Collins yellow=correct/red=wrong against NPS-10 red=addition/green=deletion/blue=note
against French red-dot=verified.** (§4.2)

Red means "wrong" in one source and "verified" in another. **Any markup format this project
defines must carry its own legend as data**, and a markup whose legend is absent must be refused
rather than guessed — which is this repository's *"refuse rather than guess"* applied to a
vocabulary rather than to a value. The underlying design choice is also live and worth making
deliberately rather than inheriting: **does a mark encode the reviewer's verdict (Collins) or
the edit requested (NPS-10)?** They are different schemas. Verdict-marking is what gives §7.2
its coverage record; edit-marking is what makes a markup mechanically applicable. A workflow
where an agent then *acts* on the markup probably wants **both axes** — a disposition
(`verified` / `defect` / `note`) and, for defects, an edit intent — which neither historical
code has, because neither had a machine downstream.

### 7.14 Do not adopt: checking as a single sequential human pass over everything

Follows' discipline — twelve separate passes, *"allowing nothing to distract the attention"* —
was the correct answer when the only checking instrument was an attentive person. Items 3, 4, 6,
7, 9 and 10 of that list (scale the dimensions, verify the material specs, confirm standard
parts, audit the record strip) are exactly the work this repository already does in
`validateCircuit`, the BOM tooling and the geometry tools, far better than a person can. **The
historical lesson is not to recreate the twelve passes; it is to notice which of them a tool now
owns, and to spend the scarce human attention on the ones no tool can have:** item 1 (first-read
readability), item 11 (the whole-sheet review carrying forward what the detail passes suggested),
and item 12 (adding the note that makes the drawing more useful). Those three are the human
review. The other nine are `make check`.

### 7.15 A caution the sources themselves raise

**Machinery's No. 2, c.1910, on offices *"where the drawings are examined and initialed by every
one in sight, from the engineer in charge down to the tracer."*** (§3.3) The author's point is
that a longer signature list is not a better check — a one-man room checking systematically beats
a crowd initialling. Worth holding onto if this project is tempted to multiply reviewing agents:
**the 1910 complaint about signature theatre is the same failure as a passing check nobody ran,
and the fix was a written list and one accountable signature, not more signatures.**

---

## 8. What could not be reached, and why

Stated plainly, with boundaries, per the task's instruction.

1. **ASME Y14.35, Y14.100 and Y14.2 clause text — NOT OBTAINED.** Live paywalled ASME
   standards. Scope statements only (§6.3). **Consequence: I cannot say whether ASME Y14.35
   addresses check prints or markup retention.** MIL-STD-100F Chapter 600 is its DoD
   predecessor and does not, which is suggestive and not dispositive.
2. ~~**"Back-check" — NO PRIMARY SOURCE.**~~ **WITHDRAWN. The back-check is established** —
   Bishop 1920 (S14) defines it in a glossary and devotes a section to it, with the reasoning
   and two enforcement mechanisms (§5.4). **The struck entry is left visible because it was
   wrong for a reason worth recording**: the search had been aimed at standards and at general
   drawing textbooks, and both of those are the wrong shelf. The back-check, the marking
   grammar and the colour reasoning all live in a **structural** drafting textbook's dedicated
   checking chapter, and it was reached only by a bulk full-text sweep (item 10) rather than by
   any targeted query. **A bounded negative is bounded by the shelf it was taken from, and
   naming that shelf is part of stating the negative** — the first version of this entry did
   not, which is what made it read as stronger than it was.
3. **Giesecke (*Technical Drawing*) and Jensen (*Engineering Drawing and Design*) checking
   chapters — NOT REACHED.** Present on archive.org but in the lending collection
   (`inlibrary`/`printdisabled`), and the search-inside backend returns **HTTP 403** for those
   items. Identifiers for anyone with library access: `technicaldrawing0000gies` (Giesecke
   1974), `engineeringdrawi00jens` (Jensen 1985), `engineeringdrawi0000jens` (Jensen 1990),
   `manualofengineer0000thom_d8t2` (French 1941). **The 1911 and 1918 French editions are open
   and were read instead** (§3.1) — and since the 1911 and 1918 texts of the CHECKING section
   are word-for-word identical, the passage is stable across editions, which makes it likely
   though unverified that later French/Giesecke editions carry it forward.
4. **DoD *Drawing Requirements Manual* (Leiblich, 1976; Ross, 1969) — NOT REACHED.** `403` from
   the search-inside backend. Identifiers `drawingrequireme00leib`, `drawingrequireme0002ccro`,
   `bwb_C0-APY-478`. This is the commentary volume on MIL-STD-100 and is the **single most
   likely place to find a standardised check-print procedure**; it is the top recommendation for
   a follow-up with library access.
5. **Google Books API — HTTP 429 on every request**, across two attempts separated by ~20
   minutes. Unusable from this host without an API key.
6. **HathiTrust full-text search — Cloudflare `403` / JS challenge**, via both WebFetch and
   curl with a browser user-agent.
7. **DuckDuckGo HTML endpoint — CAPTCHA.** WebSearch was exhausted before this pass began, per
   the task.
8. **`ia-fts.archive.org` (the documented archive.org full-text API) — DNS does not resolve from
   this sandbox** (`curl` exit with no HTTP status). `api.archivelab.org` times out. **The
   working substitute, which is the single most reusable finding of this pass, is in §9.**
9. **archive.org `advancedsearch.php` is METADATA-ONLY.** Verified by a check that could have
   failed: the exact phrase `"check print shall be made"` — which I had already read in an
   indexed, fully OCR'd item — returns `numFound: 0`. Nobody should conclude from an
   advancedsearch miss that text is absent from archive.org.
10. **The broad sweep COMPLETED, and it is the reason S14 exists — so this entry is a method
    note rather than a limitation.** 334 open archive.org drawing/drafting items were searched
    inside for `crayon` and `check print`; 21 items returned hits, 51 `crayon` hits in total.
    Most are the word in its ordinary sense (crayon as a drawing or sectioning medium), and
    **three were Collins' own duplicate scans, which served as the positive control** — the
    sweep demonstrably surfaces the passage it was looking for when the passage is there. The
    one new source it found, **Bishop 1920 (S14), turned out to be the most complete document
    in the corpus** and overturned this document's own negative on the back-check. Everything
    quoted above still comes from a document read end to end; the sweep's role was to find the
    document.

    **One caution for anyone re-running it, because it nearly produced a false negative.** The
    `fulltext/inside.php` backend **does not honour quoted phrases** — a `q=check print` query
    returns matches for `check` and for `print` separately, so Collins' *"check prints are to
    be delivered to the file clerk"* passage was **never surfaced by the `check print` query
    at all** and was found only through `crayon`. The `check print` channel scored **0 of 334**,
    and that zero means **nothing whatsoever about whether the phrase is present.** Search on a
    single distinctive word, never a phrase. (Rate: roughly one item every four seconds.)

---

## 9. Reproduction notes (so nobody re-derives the access paths)

**MIL-STD / MIL-SPEC PDFs from everyspec.com** — free, no login. The detail page is
`https://everyspec.com/<FAMILY>/<RANGE>/<DOC>_<id>/` and the PDF is a `download.php?spec=` link
off it that **requires a `Referer` header** pointing at the detail page:

```
MIL-STD-100F  https://everyspec.com/MIL-STD/MIL-STD-0100-0299/download.php?spec=MIL-STD-100F.022341.PDF
MIL-STD-100G  https://everyspec.com/MIL-STD/MIL-STD-0100-0299/download.php?spec=MIL-STD-100G.010910.PDF
MIL-D-5480F   https://everyspec.com/MIL-SPECS/MIL-SPECS-MIL-D/download.php?spec=MIL-D-5480F.025822.pdf
```

**The directory range is `MIL-STD-0100-0299`, not `MIL-STD-0100-0199`** — that is what 404'd for
the earlier attempt. The MIL-D index is paginated (`?page=2` holds MIL-D-5480). All three PDFs
have a usable text layer; `pdftotext -layout` is sufficient, with OCR noise in 100F.

**archive.org full text.** Two channels, both free and unauthenticated:

- **Whole text, open items only:** `https://archive.org/download/<id>/<id>_djvu.txt`. Works for
  anything not in `inlibrary`/`printdisabled`. This is how S1–S6, S11 and S12 were read.
- **Search inside, the working endpoint** (the documented `ia-fts` host does not resolve here):

  ```
  https://<server>/fulltext/inside.php?item_id=<id>&doc=<id>&path=<dir>&q=<query>
  ```

  where `<server>` and `<dir>` come from `https://archive.org/metadata/<id>`. Returns JSON with
  `matches[].text` wrapped in `<IA_FTS_MATCH>` tags and per-leaf bounding boxes. It returns
  **403 for lending-library items** and intermittently returns an `IncompleteRead` traceback in
  an `error` field — retry on another host from `workable_servers`. This is how the French and
  Kepler checking chapters were located before being downloaded in full.

**Items worth keeping, all open:**

```
draftingroommeth00coll      Collins, Drafting Room Methods, 1918       <- the key document
amanualengineer01frengoog   French, Manual of Engineering Drawing 1918
cu31924003643693            French, 1911 ed. (CHECKING text identical)
standardsconvent00kepl      Kepler, Standards and Conventions, 1921
draftingroomprac00newyrich  Machinery's Reference Series No. 2, c.1910
standard-drafting-circuit-drawings   Bell Labs, Circuit Drawings, 1939
standard-drafting-wiring-diagrams    Bell Labs, Wiring Diagrams
drawingformatdra00unse      NPS-10, 1986                               <- the colour code
nasa-engineering-manual.pdf NASA GSFC X-673-64-1F Rev 001, Dec 1994
structuraldraft00bishgoog   Bishop, Structural Drafting, 1920          <- the best one, ch. XXIX
```

**If you read only one of these, read `structuraldraft00bishgoog` Chapter XXIX** (pp. 179-182 of
the book; search the `_djvu.txt` for `CHECKING AND CORRECTING DRAWINGS`, which appears twice as
a running head). It is four pages and it covers the role, the policy on what gets checked, the
twelve-point order, the marking grammar, the colour reasoning, the back-check and the correction
hygiene. Collins 1918 is the complement: Bishop says how a checker works, Collins says what the
office does with the paper afterwards.

---

## 10. Open questions this pass leaves

Recorded here, under the work in hand, per `CLAUDE.md` — not in the frozen gaps register.

1. **Does ASME Y14.35 or Y14.100 name a marked-up review copy at all?** Needs a library copy.
   The DoD predecessor does not.
2. **Does the DoD *Drawing Requirements Manual* standardise the check-print procedure?** The
   most promising unread source (§8 item 4).
3. ~~**Was there a formal back-check?**~~ **ANSWERED — yes** (§5.4, §7.5). What is still open is
   narrower and more useful: **does the withhold-the-fix enforcement appear anywhere other than
   Bishop?** One source is one source, and §7.5 recommends building on it. Bishop presents it as
   something *"some checkers"* do, which is an explicit admission that it was not universal even
   in 1920.
4. **Is the verdict-marking or the edit-marking schema the right base for this project's markup
   format** — or, as §7.13 suspects, two orthogonal axes? This is a design decision, not a
   research question, and it should be made in a spec rather than inferred from whichever
   historical legend got copied.
5. **ASME Y14.42, Digital Approval Systems**, is named by Y14.100 (2017) as incorporated. It is
   the direct modern descendant of the signature block and therefore the most likely place a
   *current* standard says something about who may sign for a drawing and whether the signer may
   be the author. Not examined.
