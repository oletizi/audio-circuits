/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/order.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

const CHUNK = /(\d+|\D+)/g;

/**
 * Natural order for pin numbers ("2" < "10", "A9" < "A10"). Deterministic and
 * locale-free. Two strings compare equal only when identical, so "01" and "1"
 * stay distinct (the longer digit run sorts after when the values tie).
 */
export function comparePinNumbers(a: string, b: string): number {
  if (a === b) return 0;
  const ca = a.match(CHUNK) ?? [];
  const cb = b.match(CHUNK) ?? [];
  const n = Math.min(ca.length, cb.length);
  for (let i = 0; i < n; i += 1) {
    const x = ca[i]!;
    const y = cb[i]!;
    const xd = /^\d/.test(x);
    const yd = /^\d/.test(y);
    if (xd && yd) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d;
      if (x.length !== y.length) return x.length - y.length;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  if (ca.length !== cb.length) return ca.length - cb.length;
  return a < b ? -1 : 1;
}
