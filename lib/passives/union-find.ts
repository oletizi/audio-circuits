/** Union-find (disjoint set) over net names, used by the control-state resolver to
 * merge nets shorted together by a switch's closed contacts.
 */
export class UnionFind {
  private readonly parent = new Map<string, string>()

  constructor(members: Iterable<string>) {
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

  /** Merges the sets containing `a` and `b`, if not already merged. */
  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) this.parent.set(rootA, rootB)
  }
}
