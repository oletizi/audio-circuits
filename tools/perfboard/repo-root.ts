/**
 * This repository's own root, derived from where this module lives on disk.
 *
 * Shared by `check.ts`, `verbs.ts` and `tools/cli/perfboard.ts` so none of
 * them hardcodes a path or duplicates this computation - all three need the
 * same answer to resolve the binary `acquire.ts`'s `resolveBinary` computes
 * under `.tools/`.
 *
 * ASSUMPTION, recorded rather than engineered around: this file itself goes
 * on living two directories below the repository root
 * (`tools/perfboard/repo-root.ts`), and `import.meta.url` resolves to this
 * file's real, non-symlinked location. That holds for how this repository
 * runs itself today (`bun run tools/cli/perfboard.ts ...`); it would break
 * under a bundler that rewrites module URLs, or if this file were reached
 * only through an unresolved symlink. Neither applies here.
 */
import path from "node:path"

export function moduleRepoRoot(): string {
  const moduleDir = path.dirname(new URL(import.meta.url).pathname)
  return path.resolve(moduleDir, "..", "..")
}
