/**
 * THE ONE NAMED NOTION OF "INSTALLED HERE, BUT NOT OUR SOURCE" - every
 * directory that holds a tool this repository FETCHES rather than AUTHORS,
 * read by every walker and config file that has to agree on it.
 *
 * **TASK 3 FIX ROUND 1** (`.superpowers/sdd/2026-10-30-institutionalise-draughting/`):
 * before this file, that fact was six independent lists. `tsconfig.json`'s
 * `exclude` and `bunfig.toml`'s `[test] root` each closed ONE consumer's
 * version of the gap once `draughting/install.sh` (Task 3) started actually
 * cloning `copperhead` for real; four more consumers still walked straight
 * into it, with no shared statement that `copperhead` is not this
 * repository's own source:
 * `tests/kicad/footprint-sweep.ts`'s `NOT_SOURCE`,
 * `tests/kicad/symbol-names.test.ts`'s byte-identical copy of the same set,
 * `tools/perfboard/declaration.ts`'s `SKIP_DIRECTORIES`, and the walk it
 * drives that `tests/perfboard/declaration.test.ts` exercises.
 * `tests/kicad/footprint-names.test.ts` is where the gap actually fired: it
 * read copperhead's own test fixtures (`Sensor_Humidity:SHT40`) as though
 * they were footprint names this repository had declared.
 *
 * **`.tools/` (the forked VeroRoute binary, `tools/perfboard/acquire.ts`)
 * NEVER NEEDED TO APPEAR IN `tsconfig.json` OR `bunfig.toml`, AND THAT IS A
 * COINCIDENCE OF THE LEADING DOT, NOT A RULE.** TypeScript's own `include`
 * globbing and Bun's own test-file discovery both skip a dot-prefixed
 * directory for free - measured directly: `npx tsc --noEmit
 * --listFilesOnly` lists zero files under `.tools/` although it holds two
 * TypeScript/vitest test suites of its own, and a bare `bun test` never
 * discovers them either. A raw recursive directory listing (every walker
 * below reads one) gets no such exemption - `.git`, `node_modules`, `build`
 * and `.tools` all come back as ordinary entries - which is why each
 * walker already had to name `.tools` explicitly, just as a separately
 * invented literal every time. `draughting/copperhead` has no leading dot
 * (R1 of the rulings file: the install location is fixed, not chosen
 * here), so it gets neither exemption, and needed naming everywhere
 * `.tools` already was.
 *
 * ONE MORE REASON NOT TO WRITE THE WALKERS' OWN FUNCTION NAME HERE: this
 * file is itself now part of the stripboard search's and completion
 * pass's transitive import closure (`tools/perfboard/declaration.ts`
 * imports it, and the stripboard board-adoption path imports that), which
 * `tests/stripboard/escapes-search.test.ts` and
 * `tests/stripboard/complete.test.ts` scan for determinism-breaking
 * identifiers - a plain text match, prose included. Naming the identifier
 * literally in a comment would report a finding about this file doing the
 * explaining, not about anything it runs; `tests/kicad/footprint-sweep.ts`'s
 * own header states the identical reason for the same discipline.
 *
 * **WHAT THIS FILE DOES NOT CLAIM TO BE.** It is not a general-purpose
 * "directories to skip" list for every walker - `build`, `guide`, `dist`
 * and the like are facts about what a PARTICULAR walker's own tooling
 * produces, and stay local to that walker. This file names only
 * directories that hold code FETCHED from somewhere else, because that is
 * the one fact a filesystem sweep, a typecheck and a test-discovery pass
 * all have to agree on - which is exactly why it is worth sharing instead
 * of six places quietly agreeing to remember it.
 *
 * `tests/not-source.test.ts` is the bridge to the two config files, which
 * cannot import this module themselves: it reads `tsconfig.json` and
 * `bunfig.toml` back and asserts each non-dot-exempt entry below is
 * actually excluded by both, so a config file and this list cannot drift
 * apart silently - the same reasoning `tools/cli/resolved-default.ts` and
 * `docs/known-gaps.md` **G170** apply to a resolved tool path.
 */

export interface VendoredCheckout {
  /** The bare directory name a raw recursive-listing walker checks `entry.name` against. */
  readonly basename: string
  /** Repo-root-relative path, for the config files that name a path rather than a bare name. */
  readonly repoRelativePath: string
  /**
   * Whether a leading dot already exempts this one from glob-based tools
   * (`tsc`'s `include`, `bun test`'s discovery) for free, so it does not
   * need to appear in `tsconfig.json` or `bunfig.toml` at all.
   */
  readonly dotExempt: boolean
  readonly what: string
}

export const VENDORED_CHECKOUTS: readonly VendoredCheckout[] = [
  {
    basename: ".tools",
    repoRelativePath: ".tools",
    dotExempt: true,
    what:
      "the forked VeroRoute binary, cloned and built from veroroute.pin's pinned commit " +
      "(tools/perfboard/acquire.ts)",
  },
  {
    basename: "copperhead",
    repoRelativePath: "draughting/copperhead",
    dotExempt: false,
    what:
      "the copperhead checkout draughting/install.sh fetches at the commit " +
      "draughting/tools.lock.json pins (tools/draught/copperhead-install.ts)",
  },
]

/** Bare basenames, for a raw recursive-listing walker's own skip-set. */
export const VENDORED_CHECKOUT_NAMES: readonly string[] = VENDORED_CHECKOUTS.map(
  (checkout) => checkout.basename,
)
