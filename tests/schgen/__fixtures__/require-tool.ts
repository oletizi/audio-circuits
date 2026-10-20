/**
 * Ported from digital-pedal-platform's `tools/schgen/__fixtures__/requireTool.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The skip decision for a test that needs a KiCad install (kicad-cli or the stock libraries).
 *
 * Locally a missing install skips the test. Under CI (`CI` set) it throws instead: a test that
 * skips when its tool is missing cannot be told apart from one that passed, so in CI the job that
 * provides the tool is the proof that the test ran. Use as `describe.skipIf(skipWithout(...))`.
 */
export function skipWithout(available: boolean, what: string): boolean {
  if (available) return false;
  const ci = process.env["CI"];
  if (ci !== undefined && ci !== "" && ci !== "false") {
    throw new Error(`missing ${what}, and CI is set: this test must run in CI, never skip`);
  }
  return true;
}
