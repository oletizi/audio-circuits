/** Union-find (disjoint set) over net names, used by the control-state resolver to
 * merge nets shorted together by a switch's closed contacts. A caller-supplied
 * `preferred` comparator decides which of two roots survives a union, so the caller
 * controls which net name becomes the representative - not just whichever happened to
 * be unioned in second.
 */
export class UnionFind {
  private readonly parent = new Map<string, string>()

  /** `preferred(a, b)` must return whichever of the two (already-canonical) roots `a`
   * and `b` should remain the representative once their sets are merged.
   */
  constructor(
    members: Iterable<string>,
    private readonly preferred: (a: string, b: string) => string,
  ) {
    for (const member of members) this.parent.set(member, member)
  }

  /** Returns the canonical representative for `member`, path-compressing along the way. */
  find(member: string): string {
    const parent = this.parent.get(member)
    if (parent === undefined) throw new Error(`Unknown net: ${member}`)
    if (parent === member) return member
    const root = this.find(parent)
    this.parent.set(member, root)
    return root
  }

  /** Merges the sets containing `a` and `b`, if not already merged. The surviving
   * representative is whichever root `preferred` returns, not an arbitrary one.
   */
  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return
    const winner = this.preferred(rootA, rootB)
    const loser = winner === rootA ? rootB : rootA
    this.parent.set(loser, winner)
  }
}
