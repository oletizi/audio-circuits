/**
 * `SeedArm`, Task 16's restart-seed vocabulary - carried here, ahead of Task
 * 16 itself, because `tools/stripboard/run-dir.ts`'s `CanonicalInputs` names
 * which arm produced a candidate's seed and needs the type to import rather
 * than redeclare (CONTROLLER RULING 1, 2026-10-10 stripboard-pipeline Task
 * 13: Task 16 has not run, so without this file `run-dir.ts` would import
 * from nothing and `bun run typecheck` would fail).
 *
 * EXACTLY TWO EXPORTS, AND NOTHING ELSE. `SEED_ARMS` enumerates the union so
 * a loop over "every arm" cannot silently miss one the union grows to carry -
 * the same reasoning `stripboard/rules.ts`'s `PARAMETERS` list exists for.
 * Task 16 extends this file with `parseSeedArm` and whatever seeding logic
 * the restart schedule needs; this file does not anticipate that work.
 */
export type SeedArm = "constructed" | "import" | "random"

/** Every member of `SeedArm`, in no particular order - only completeness is promised. */
export const SEED_ARMS: readonly SeedArm[] = ["constructed", "import", "random"]
