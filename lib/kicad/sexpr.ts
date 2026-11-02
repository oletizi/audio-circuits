/**
 * An s-expression reader for KiCad files.
 *
 * KiCad writes atoms bare or double-quoted, with backslash escapes inside
 * quotes. Quoted atoms may contain whitespace and parentheses, so the
 * tokeniser must track quoting rather than splitting on delimiters.
 *
 * `parse` is transcribed from `digital-pedal-platform`'s
 * `tools/kicad/sexpr.ts` (see
 * `docs/decisions/` and `CLAUDE.md`'s "Transcription is evidence, not
 * memory"): it tracks each atom's source offsets, whether it was quoted, and
 * the first escape it cannot re-emit faithfully. The repository's previous
 * reader, `parseSexpr`, dropped all three - it decoded every `\x` escape to
 * `x` with no record of the loss, which is the exact gap
 * `lib/kicad/symbol-library.ts` works around by treating symbols as raw text
 * instead of re-serialising them. `parseSexpr`, `SNode`, `children`, `child`
 * and `attr` below are kept as a thin derivation of `parse` - observationally
 * identical to the old reader - so `lib/kicad/netlist.ts`,
 * `lib/kicad/footprint-extent.ts` and `lib/kicad/symbol-library.ts` keep
 * working unchanged.
 */

export interface SAtom {
  readonly value: string
  readonly start: number
  readonly end: number
  readonly quoted: boolean
  /** The first escape a re-emitter cannot reproduce faithfully, or null. */
  readonly lossyEscape: string | null
}

export interface SList {
  readonly head: string | null
  readonly start: number
  readonly end: number
  readonly atoms: SAtom[]
  readonly lists: SList[]
}

const WHITESPACE = new Set([" ", "\t", "\r", "\n"])

/**
 * Read a KiCad s-expression document.
 *
 * Structure is determined by balanced parentheses with string awareness,
 * never by indentation: KiCad reformats files freely and has changed its
 * serialization between releases, so anything pattern-matching text layout
 * eventually becomes silently wrong.
 */
export function parse(src: string): SList {
  let pos = 0

  function skipWhitespace(): void {
    while (pos < src.length && WHITESPACE.has(src[pos] ?? "")) pos += 1
  }

  /**
   * Read a quoted string atom.
   *
   * Every escape sequence unescapes to its literal second character
   * (`\"` -> `"`, `\\` -> `\`), matching `quoteString`, which only escapes
   * those two characters. KiCad's writer also emits `\n` for newlines in
   * multi-line text; that decodes to `n`, which is lossy, so the first such
   * escape is recorded in `lossyEscape` for writers to refuse.
   */
  function readQuoted(): SAtom {
    const start = pos
    pos += 1
    let value = ""
    let lossyEscape: string | null = null
    for (;;) {
      if (pos >= src.length) {
        throw new Error(`unbalanced string starting at offset ${start}`)
      }
      const ch = src[pos] ?? ""
      if (ch === "\\") {
        const next = src[pos + 1]
        if (next === undefined) {
          throw new Error(`dangling escape at offset ${pos}`)
        }
        if (lossyEscape === null && next !== '"' && next !== "\\") lossyEscape = `\\${next}`
        value += next
        pos += 2
        continue
      }
      if (ch === '"') {
        pos += 1
        return { value, start, end: pos, quoted: true, lossyEscape }
      }
      value += ch
      pos += 1
    }
  }

  function readBare(): SAtom {
    const start = pos
    while (pos < src.length && !WHITESPACE.has(src[pos] ?? "") && src[pos] !== "(" && src[pos] !== ")") {
      pos += 1
    }
    return { value: src.slice(start, pos), start, end: pos, quoted: false, lossyEscape: null }
  }

  function headOf(atoms: SAtom[], lists: SList[]): string | null {
    const a = atoms[0]
    const l = lists[0]
    if (a === undefined) return null
    if (l !== undefined && l.start < a.start) return null
    return a.value
  }

  function readList(): SList {
    const start = pos
    pos += 1
    const atoms: SAtom[] = []
    const lists: SList[] = []
    for (;;) {
      skipWhitespace()
      if (pos >= src.length) {
        throw new Error(`unbalanced list starting at offset ${start}`)
      }
      const ch = src[pos]
      if (ch === ")") {
        pos += 1
        return { head: headOf(atoms, lists), start, end: pos, atoms, lists }
      }
      if (ch === "(") {
        lists.push(readList())
        continue
      }
      atoms.push(ch === '"' ? readQuoted() : readBare())
    }
  }

  skipWhitespace()
  if (src[pos] !== "(") {
    throw new Error(`document does not start with a list at offset ${pos}`)
  }
  const root = readList()
  skipWhitespace()
  if (pos !== src.length) {
    throw new Error(`trailing content after root list at offset ${pos}: "${src.slice(pos, pos + 40)}"`)
  }
  return root
}

/** Render a value as a KiCad quoted string. */
export function quoteString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

// --- Shims for the pre-existing consumers -------------------------------
//
// `netlist.ts`, `footprint-extent.ts` and `symbol-library.ts` read KiCad
// forms through this narrower shape, which existed before `parse` did. It is
// a derivation of `parse`, not a second parser: `toSNode` discards the
// offset/quoted/lossy information `parse` tracks, reproducing exactly what
// the old hand-written reader returned - including its unconditional
// escape decode, which `lib/kicad/symbol-library.ts` depends on continuing
// to happen.

export interface SNode {
  readonly name: string
  /** Bare and quoted atoms, in order, excluding the leading name. */
  readonly atoms: readonly string[]
  readonly nodes: readonly SNode[]
}

function toSNode(list: SList): SNode {
  // `head` is non-null exactly when `atoms[0]` was used as the name (see
  // `headOf` above) - the old reader always consumed that token as the name
  // and excluded it from `atoms`. When `head` is null, no atom was consumed
  // this way (a list came first, or there were no atoms at all), so nothing
  // is dropped.
  const rest = list.head === null ? list.atoms : list.atoms.slice(1)
  return {
    name: list.head ?? "",
    atoms: rest.map((atom) => atom.value),
    nodes: list.lists.map(toSNode),
  }
}

export function parseSexpr(text: string): SNode {
  return toSNode(parse(text))
}

export function children(node: SNode, name: string): readonly SNode[] {
  return node.nodes.filter((n) => n.name === name)
}

export function child(node: SNode, name: string): SNode | undefined {
  return node.nodes.find((n) => n.name === name)
}

/** First atom of the named child form, e.g. attr(comp, "ref") for (ref "C1"). */
export function attr(node: SNode, name: string): string | undefined {
  return child(node, name)?.atoms[0]
}
