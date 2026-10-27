/**
 * **THE MANIFEST'S LIBRARY DIGESTS, lifted out of `tools/schgen/generate.ts` whole.**
 *
 * No BEHAVIOUR changed in the move: `DIGEST_EXEMPT`, `moduleTreeDigest` and the two library
 * directory constants are the same code, with the same comments, that `generate.ts` carried until
 * Task 4 of `docs/superpowers/plans/2026-10-27-gates-classify.md`. **The move is a file-size
 * obligation and not a redesign** - `generate.ts` sat at 485 lines and the task's brief says to
 * extract rather than exceed the 300-500 band `CLAUDE.md` sets.
 *
 * **TWO STRINGS WERE EDITED AND BOTH WERE POINTERS THAT THE MOVE WOULD HAVE MADE WRONG.** The
 * refusal below told a reader to extend `moduleTreeDigest` *"in tools/schgen/generate.ts"*, which
 * is no longer where it lives; and `DIGEST_EXEMPT`'s reason cited `.gitignore` BY LINE NUMBER,
 * which the same commit shifted by ten when it added the census's output directory. A line number
 * in prose is a transcription with a date on it, so both now name the entry rather than its line.
 *
 * `generate.ts` re-exports all four names, so every existing import of them is unchanged and
 * `tests/schgen/generate-digest.test.ts` still names `generate.ts` as it did. The re-export is the
 * barrel `generate.ts` already keeps for `writeGeneration` and `staleFiles`.
 */

import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../../lib/schgen/manifest.ts";

/**
 * Spec §2.1's two libraries: the modules a template DRAWS with, and the rules that graded the
 * drawing.
 *
 * **THE TEMPLATE LIBRARY IS THE WHOLE OF `render/` AND NOT `render/templates/`, WHICH
 * OVER-COVERS, AND THAT IS THE CHOICE RATHER THAN AN OVERSIGHT.** Eight of the nine modules in
 * `render/templates/` import their geometry producers from the parent directory -
 * `chain-kit.ts`, `layout-kit.ts`, `fanout-kit.ts`, `geometry.ts`, `drawn-extent.ts`,
 * `power-text.ts`, `text-boxes.ts`, `lib-pins.ts` - so a digest over `templates/` alone **did not
 * move when a template's drawn geometry moved**, which is the exact failure this digest exists to
 * detect. The alternative mechanism was the transitive import closure of the template modules:
 * exact, and it needs an import walker this repository does not have. The directory tree is the
 * cheaper mechanism and its error is in the safe direction - **it will move on an edit anywhere
 * in `render/` that changes no template's geometry at all.**
 *
 * **SO: A READER WHO SEES `templateLibrarySha256` MOVE FOR AN UNRELATED REASON IS LOOKING AT THE
 * DESIGN AND NOT A BUG.** A false-positive staleness costs a regeneration; a false pass certifies
 * a drawing against a library version that did not draw it. Those are not symmetric.
 *
 * **WHAT IS STILL NOT COVERED, SAID HERE RATHER THAN DISCOVERED LATER.** `lib/schgen/rules/*.ts`
 * import `../render/geometry.ts` and `../render/library.ts`, so a geometry edit moves the TEMPLATE
 * digest and not the RULE digest even though it changes what the rules computed. Both fields sit
 * in one manifest and `staleManifestInputs` reports either, so the manifest as a whole still goes
 * stale - the mis-attribution is between two fields of one record, not a blind spot.
 */
export const TEMPLATE_LIBRARY_DIR = "lib/schgen/render";
export const RULE_LIBRARY_DIR = "lib/schgen/rules";

/**
 * THE ENTRIES `moduleTreeDigest` PASSES OVER - a NAMED list, one entry, each carrying the committed
 * declaration that already settled it.
 *
 * **A NAMED EXEMPTION LIST IS THE OPPOSITE OF A FALLBACK, AND THE DIFFERENCE IS WHICH WAY THE
 * UNKNOWN CASE GOES.** A fallback substitutes behaviour when something is missing, so an unknown
 * input PASSES. This refuses everything not named, so an unknown input REFUSES. `CLAUDE.md`:
 * *"An empty whitelist that refuses loudly beats a general rule that quietly accepts a guess."*
 * That is the prescribed shape, and it specifies both the default state - empty - and the
 * extension discipline: a deliberate edit with a test beside it, never a silent widening.
 * `tests/schgen/generate-digest.test.ts` asserts the list's length, so growing it cannot be quiet.
 *
 * **THE MATCH IS EXACT EQUALITY ON THE FILE's NAME AND IS NOT A SUFFIX RULE.** `.DS_Store.bak`,
 * `foo.DS_Store` and a DIRECTORY called `.DS_Store` all still refuse. An exemption that drifted
 * into a suffix match would be the general rule this list exists instead of.
 *
 * **CONTROLLER RULING R43, 2026-10-20**, reversing the refuse-everything posture this function
 * shipped with for one round: the project has ALREADY declared `.DS_Store` a non-artifact, at
 * `.gitignore`'s `.DS_Store` entry, by the same reasoning it applies to `*.kicad_prl` there - per-user
 * state, never design data. Refusing a generation over it was two parts of this repository
 * disagreeing, and a refusal that says *delete the file your file manager made* teaches nothing
 * about the circuit. **This entry is a reading of an existing decision, not a fresh judgement.**
 *
 * **AND THE RESIDUAL COST OF R43, WHICH IS NOT TO BE SOFTENED: a file named `.DS_Store` that
 * CARRIED GEOMETRY would be neither hashed nor refused.** Nothing else is lost - drawn geometry
 * reaches a template through a `.ts` import and every `.ts` in the tree is hashed, so a
 * geometry-bearing `.json`, a `.ts.bak` or a vendored data file still refuses by name. The one
 * thing this list hides is geometry someone put in a file with that exact name on purpose, and the
 * digest is the wrong place to fight that. `docs/known-gaps.md` **G228** records it.
 */
export const DIGEST_EXEMPT: readonly { readonly name: string; readonly why: string }[] = [
  {
    name: ".DS_Store",
    why:
      "macOS Finder metadata. `.gitignore`'s `.DS_Store` entry already declares it a non-artifact of this " +
      "repository, under the same `OS files` heading and by the same reasoning it applies there to " +
      "`*.kicad_prl`: per-user state, never design data. A single Finder visit to a " +
      "library directory creates it, and refusing every generation until it is deleted would " +
      "contradict a decision this repository has already committed (controller ruling R43).",
  },
];

const isDigestExempt = (name: string): boolean => DIGEST_EXEMPT.some((e) => e.name === name);

/**
 * A library's version, as the sha256 of every `.ts` module in its directory TREE, each beside its
 * path relative to that tree's root.
 *
 * **IT HASHES THE SOURCES AND NOT A DECLARED VERSION STRING, and the alternative was measurably
 * worse.** `TEMPLATES` is a registry of ids, so a digest over the ids would not move when a
 * template's GEOMETRY changed - a hash that cannot detect the thing it exists to detect, which is
 * `CLAUDE.md`'s *"a skipped check must never look like a passing one"* in a hash's clothing. The
 * parent's `run.json` records the engine COMMIT for the same reason.
 *
 * The path is included beside each hash, so adding a module moves the digest even if the new
 * module is empty, and the list is sorted so the digest does not depend on directory order.
 *
 * **IT WALKS SUBDIRECTORIES, AND THE FLAT VERSION OF THIS FUNCTION WAS THE SAME FAILURE IN
 * MINIATURE.** `fs.readdirSync` without recursion covers one directory level, so adding a
 * subdirectory under `templates/` or `rules/` silently NARROWED the digest with nothing failing -
 * inside the record whose whole job is to say what graded the output. A subdirectory is now
 * covered rather than dropped.
 *
 * **A FILE THIS DIGEST CANNOT HASH REFUSES BY NAME rather than being filtered out.** The `.ts`
 * filter is the one thing between *covered* and *invisible*, and a filter that quietly drops a
 * `.json` of coordinates sitting beside a template is the skipped check again. The one exception is
 * `DIGEST_EXEMPT` below, which is a NAMED list and not a general rule - see its comment for why
 * those are opposites.
 *
 * **AN EMPTY TREE REFUSES.** A digest over no files is a constant that can never move, which
 * would make the manifest certify a drawing against a library it never read.
 *
 * **`root` IS A PARAMETER AND NOT `moduleRepoRoot()` INSIDE, so the digest can be taken over a
 * COPY of the tree.** That is what lets `tests/schgen/generate-digest.test.ts` mutate a geometry
 * producer's bytes in a scratch copy and assert the digest moved, which is a real perturbation
 * rather than an assertion that a name appears in a list.
 */
export function moduleTreeDigest(root: string, dir: string): string {
  const abs = path.join(root, dir);
  const modules: string[] = [];
  const unhashed: string[] = [];
  const walk = (at: string, prefix: string): void => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        // A DIRECTORY carrying an exempt NAME is not the thing the exemption names, so it is
        // reported rather than walked past: `DIGEST_EXEMPT` is about one file macOS writes.
        if (isDigestExempt(entry.name)) unhashed.push(`${rel} (a directory, not the file the exemption names)`);
        else walk(path.join(at, entry.name), rel);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts")) modules.push(rel);
      else if (entry.isFile() && isDigestExempt(entry.name)) continue;
      else unhashed.push(rel);
    }
  };
  walk(abs, "");
  if (unhashed.length > 0) {
    throw new Error(
      `the library tree at ${dir} holds ${unhashed.length} entr${unhashed.length === 1 ? "y" : "ies"} ` +
        `this manifest digest does not hash: ${unhashed.sort().join(", ")}. They are NOT filtered ` +
        "out: spec 2.1 has the manifest record the library version that graded the drawing, and a " +
        "file the digest skips is a library input that can change with nothing failing - " +
        'CLAUDE.md\'s "a skipped check must never look like a passing one". Three ways out, in ' +
        "order of likelihood: delete it, if it is an editor or build artifact that belongs nowhere " +
        "near a library tree; or hash it deliberately by extending moduleTreeDigest in " +
        "tools/schgen/library-digest.ts, if it carries geometry or a rule; or, ONLY if this repository " +
        "has already declared the file a non-artifact in a committed file, add it to DIGEST_EXEMPT " +
        "above citing that declaration. Each of the three is a deliberate edit with a test beside " +
        `it. The exemption list holds ${DIGEST_EXEMPT.length} name${DIGEST_EXEMPT.length === 1 ? "" : "s"} ` +
        "and is not a suffix rule: " +
        `${DIGEST_EXEMPT.map((e) => e.name).join(", ")}.`,
    );
  }
  if (modules.length === 0) {
    throw new Error(
      `the library tree at ${dir} holds no .ts module, so its manifest digest would be a constant ` +
        "that can never move - a hash that cannot detect the change it exists to detect. It is not " +
        "defaulted to an empty digest (spec 2.1: the manifest records the template library version " +
        "and the rule library version that graded the drawing).",
    );
  }
  return modules
    .sort()
    .map((rel) => `${rel} ${sha256(fs.readFileSync(path.join(abs, rel), "utf8"))}`)
    .join("\n");
}
