/**
 * A minimal s-expression reader for KiCad files.
 *
 * KiCad writes atoms bare or double-quoted, with backslash escapes inside
 * quotes. Quoted atoms may contain whitespace and parentheses, so the tokeniser
 * must track quoting rather than splitting on delimiters.
 */
export interface SNode {
  readonly name: string
  /** Bare and quoted atoms, in order, excluding the leading name. */
  readonly atoms: readonly string[]
  readonly nodes: readonly SNode[]
}

export function parseSexpr(text: string): SNode {
  let i = 0

  const skipSpace = () => {
    while (i < text.length && /\s/.test(text[i] ?? "")) i++
  }

  const readQuoted = (): string => {
    i++ // opening quote
    let out = ""
    while (i < text.length) {
      const ch = text[i] ?? ""
      if (ch === "\\") {
        out += text[i + 1] ?? ""
        i += 2
        continue
      }
      if (ch === '"') {
        i++
        return out
      }
      out += ch
      i++
    }
    throw new Error("unbalanced quote in s-expression")
  }

  const readBare = (): string => {
    let out = ""
    while (i < text.length && !/[\s()]/.test(text[i] ?? "")) {
      out += text[i]
      i++
    }
    return out
  }

  const readNode = (): SNode => {
    skipSpace()
    if (text[i] !== "(") throw new Error(`expected "(" at offset ${i}`)
    i++
    skipSpace()
    const name = text[i] === '"' ? readQuoted() : readBare()
    const atoms: string[] = []
    const nodes: SNode[] = []
    for (;;) {
      skipSpace()
      if (i >= text.length) throw new Error("unbalanced s-expression: ran out of input")
      const ch = text[i]
      if (ch === ")") {
        i++
        return { name, atoms, nodes }
      }
      if (ch === "(") {
        nodes.push(readNode())
        continue
      }
      atoms.push(ch === '"' ? readQuoted() : readBare())
    }
  }

  return readNode()
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
